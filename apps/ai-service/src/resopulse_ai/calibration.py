# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
Two-parameter physics-inversion calibration per (org, cellPresetId, mode).

Two modes share one solver shape but plug in different forward physics + bounds:

  Schwan / IRE   — fit (σ_i_mult, V_th_mult)  using compute_schwan_dr
  Resonance      — fit (Q_mult,    V_thr_mult) using compute_resonant_dr

The fit minimises Σ(measured_DR − forward_DR(params))² with bounds drawn from
literature (per cell category for the Schwan path), reports the post-fit
parameter covariance from (JᵀJ)⁻¹·σ²res, and falls back to a one-parameter
fit when the second knob is unidentifiable from the supplied protocol
diversity (e.g. all measurements at the same frequency).

Output flows back to the frontend via cellCalibrationStore; the covariance
drives Jacobian-propagated uncertainty bands on TI / Vm / population.
"""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy.optimize import least_squares

from .constants import (
    CALIBRATION_BOUNDS,
    CALIBRATION_MIN_SAMPLES,
    CALIBRATION_OUTLIER_SIGMA,
    CALIBRATION_PREDICTION_FLOOR,
    CALIBRATION_UNIDENTIFIABLE_COND,
)
from .physics import (
    CellParams,
    ProtocolConditions,
    compute_resonant_dr,
    compute_schwan_dr,
    resonant_dr_vector,
    resonant_jacobian,
    schwan_dr_vector,
    schwan_jacobian,
)


# ── Public types ─────────────────────────────────────────────────────────────

CalibrationMode = Literal['schwan', 'resonance']
CellCategory    = Literal['mammalian', 'bacteria', 'virus']


@dataclass(frozen=True)
class CalibrationSample:
    """One bench measurement contributing to the fit.

    `protocol` is the per-row environment (frequency, field, σ_e, T, N, ...);
    `measured_ratio` is the bench-measured lysis fraction in [0, 1].
    """
    measured_ratio:   float
    protocol:         ProtocolConditions


@dataclass(frozen=True)
class CalibrationResult:
    """Two-parameter fit result.

    `param1_mult` and `param2_mult` are dimensionless scalars applied to the
    cell preset's baseline values:
        Schwan:    σ_i_corrected = σ_i_baseline · param1_mult
                   V_th_corrected = V_th_baseline · param2_mult
        Resonance: Q_corrected    = Q_baseline   · param1_mult
                   V_thr_corrected = V_thr_baseline · param2_mult

    Covariance is on the multiplier scale: cov_11 = Var(param1_mult), etc.
    Use these with the analogous numerical Jacobian on the frontend to
    propagate uncertainty into any downstream quantity.
    """
    mode:             CalibrationMode
    param1_mult:      float                    # σ_i (Schwan) or Q (Resonance)
    param2_mult:      float                    # V_th (Schwan) or V_thr (Resonance)
    cov_11:           float                    # Var(param1_mult)
    cov_12:           float                    # Cov(param1_mult, param2_mult)
    cov_22:           float                    # Var(param2_mult)
    residual_std:     float                    # σ of residuals on DR scale
    n_samples:        int                      # rows used (post-outlier-rejection)
    collecting:       bool                     # True when n < CALIBRATION_MIN_SAMPLES
    clamped_param1:   bool                     # param1_mult hit a bound
    clamped_param2:   bool                     # param2_mult hit a bound
    param1_unidentifiable: bool                # JᵀJ ill-conditioned ⇒ param1 pinned to 1.0
    param2_unidentifiable: bool                # JᵀJ ill-conditioned ⇒ param2 pinned to 1.0
    outliers_removed: int
    rmse_before:      float                    # baseline (no correction) DR-scale RMSE
    rmse_after:       float                    # post-fit DR-scale RMSE


# ── Outlier rejection (shared) ───────────────────────────────────────────────

def _reject_outliers(predicted: np.ndarray, measured: np.ndarray) -> np.ndarray:
    """Boolean keep-mask using MAD-based residual clipping with a scale floor.

    Mirrors the original implementation's reasoning: residuals are taken
    against a quick provisional fit (here, a single scalar multiplier on the
    predicted vector, since that's robust and cheap) so that a uniform
    measurement bias is not mistakenly rejected as outlier signal.
    """
    if len(predicted) < 3:
        return np.ones(len(predicted), dtype=bool)
    # Provisional scalar fit just to centre residuals.
    denom = float(np.dot(predicted, predicted))
    m_hat = float(np.dot(measured, predicted) / denom) if denom > 0 else 1.0
    residuals = measured - m_hat * predicted
    med = float(np.median(residuals))
    deviations = np.abs(residuals - med)
    mad = float(np.median(deviations))
    robust_threshold = CALIBRATION_OUTLIER_SIGMA * 1.4826 * mad
    scale = float(np.max(np.abs(measured))) if measured.size else 1.0
    scale_floor = max(1e-9, scale * 1e-6)
    threshold = max(robust_threshold, scale_floor)
    return deviations <= threshold


# ── Helpers ──────────────────────────────────────────────────────────────────

def _bounds_for(mode: CalibrationMode, category: CellCategory) -> tuple[tuple[float, float],
                                                                         tuple[float, float]]:
    """Return ((min1, max1), (min2, max2)) on the multiplier scale.

    Scaled to the *baseline* so a multiplier of 1.0 leaves the cell unchanged.
    Schwan: σ_i and V_th. Resonance: Q and V_thr.
    """
    cat_bounds = CALIBRATION_BOUNDS[mode][category]
    return cat_bounds['param1'], cat_bounds['param2']


def _ensure_clamped(value: float, lo: float, hi: float) -> tuple[float, bool]:
    if value <= lo + 1e-9:
        return lo, True
    if value >= hi - 1e-9:
        return hi, True
    return value, False


def _safe_covariance(jac: np.ndarray, residuals: np.ndarray) -> tuple[float, float, float, float]:
    """Return (cov_11, cov_12, cov_22, condition_number) from (JᵀJ)⁻¹·σ²res.

    Falls back to inflated diagonal-only covariance when JᵀJ is singular —
    callers use the condition number to detect that case.
    """
    n = len(residuals)
    if n <= 2 or jac.shape[0] < 2:
        return 0.0, 0.0, 0.0, np.inf
    sigma2 = float(np.sum(residuals * residuals)) / max(1, n - jac.shape[1])
    jtj = jac.T @ jac
    try:
        cond = float(np.linalg.cond(jtj))
    except np.linalg.LinAlgError:
        cond = np.inf
    try:
        cov = np.linalg.inv(jtj) * sigma2
        return float(cov[0, 0]), float(cov[0, 1]), float(cov[1, 1]), cond
    except np.linalg.LinAlgError:
        # Singular — return diagonal only (no info about the off-diagonal).
        diag = np.diag(jtj)
        if diag[0] > 0 and diag[1] > 0:
            return sigma2 / diag[0], 0.0, sigma2 / diag[1], cond
        return 0.0, 0.0, 0.0, np.inf


# ── Forward dispatch ─────────────────────────────────────────────────────────

def _forward_vector(mode: CalibrationMode, p: CellParams, p1_mult: float, p2_mult: float,
                    p1_base: float, p2_base: float,
                    conds: list[ProtocolConditions]) -> np.ndarray:
    """Forward DR vector under multiplier overrides."""
    p1 = p1_mult * p1_base
    p2 = p2_mult * p2_base
    if mode == 'schwan':
        return schwan_dr_vector(p, p1, p2, conds)
    return resonant_dr_vector(p, p1, p2, conds)


def _jacobian_at(mode: CalibrationMode, p: CellParams, p1_mult: float, p2_mult: float,
                 p1_base: float, p2_base: float,
                 conds: list[ProtocolConditions]) -> np.ndarray:
    """Jacobian on the multiplier scale (chain rule: ∂DR/∂mult = ∂DR/∂param · base)."""
    p1 = p1_mult * p1_base
    p2 = p2_mult * p2_base
    if mode == 'schwan':
        j_param = schwan_jacobian(p, p1, p2, conds)
    else:
        j_param = resonant_jacobian(p, p1, p2, conds)
    j_param[:, 0] *= p1_base
    j_param[:, 1] *= p2_base
    return j_param


# ── Public entry point ───────────────────────────────────────────────────────

def fit_calibration(
    mode:     CalibrationMode,
    category: CellCategory,
    cell:     CellParams,
    samples:  list[CalibrationSample],
) -> CalibrationResult:
    """Two-parameter physics inversion for one (org, cellPresetId, mode).

    Strategy:
      1. Reject outliers by MAD on a provisional scalar multiplier fit.
      2. LM solve for (mult1, mult2) jointly with category-bound box constraints.
      3. Compute covariance from (JᵀJ)⁻¹·σ²res; check condition number.
      4. If ill-conditioned (cond > CALIBRATION_UNIDENTIFIABLE_COND), pin
         the worse-conditioned parameter at 1.0 and refit the other alone —
         honest report of what the data can support.
      5. Surface clamp + identifiability flags so the UI can warn the user.
    """
    n_in = len(samples)
    p1_base = cell.sigma_i_baseline if mode == 'schwan' else cell.capsid_q
    p2_base = cell.vth_baseline    if mode == 'schwan' else cell.resonant_threshold_vcm

    if mode == 'resonance' and (p1_base is None or p2_base is None or cell.resonant_freq_ghz is None):
        return _empty_result(mode, n_in, collecting=True)

    if n_in < CALIBRATION_MIN_SAMPLES:
        return _empty_result(mode, n_in, collecting=True)

    # Build predicted/measured arrays under the baseline (mult=1.0) — used for
    # (a) outlier rejection and (b) the rmse_before baseline.
    conds_all  = [s.protocol for s in samples]
    measured_all = np.array([s.measured_ratio for s in samples], dtype=np.float64)
    predicted_all = _forward_vector(mode, cell, 1.0, 1.0, p1_base, p2_base, conds_all)
    predicted_floored = np.maximum(predicted_all, CALIBRATION_PREDICTION_FLOOR)

    keep_mask = _reject_outliers(predicted_floored, measured_all)
    n_dropped = int((~keep_mask).sum())

    conds    = [c for c, k in zip(conds_all, keep_mask) if k]
    measured = measured_all[keep_mask]
    n_kept   = len(conds)

    if n_kept < CALIBRATION_MIN_SAMPLES:
        return _empty_result(mode, n_kept, collecting=True, outliers_removed=n_dropped)

    (lo1, hi1), (lo2, hi2) = _bounds_for(mode, category)

    def residuals_fn(params: np.ndarray) -> np.ndarray:
        return measured - _forward_vector(mode, cell, params[0], params[1], p1_base, p2_base, conds)

    res = least_squares(
        residuals_fn,
        x0=np.array([1.0, 1.0]),
        bounds=([lo1, lo2], [hi1, hi2]),
        method='trf',
    )
    p1_fit, p2_fit = float(res.x[0]), float(res.x[1])
    fitted_residuals = measured - _forward_vector(mode, cell, p1_fit, p2_fit, p1_base, p2_base, conds)

    # Covariance via (JᵀJ)⁻¹·σ²res on the multiplier scale.
    jac = _jacobian_at(mode, cell, p1_fit, p2_fit, p1_base, p2_base, conds)
    cov_11, cov_12, cov_22, cond = _safe_covariance(jac, fitted_residuals)

    # Identifiability triage. Pin the parameter whose marginal Jacobian column
    # has the smallest L2 norm and refit the other in 1-D.
    p1_unident = False
    p2_unident = False
    if cond > CALIBRATION_UNIDENTIFIABLE_COND or not np.isfinite(cond):
        col_norms = np.linalg.norm(jac, axis=0)
        # Smaller column norm = parameter the data barely informs.
        if col_norms[0] < col_norms[1]:
            # Pin param1 at 1.0; refit param2.
            p1_unident = True
            def r1(params: np.ndarray) -> np.ndarray:
                return measured - _forward_vector(mode, cell, 1.0, params[0], p1_base, p2_base, conds)
            res2 = least_squares(r1, x0=np.array([1.0]), bounds=([lo2], [hi2]), method='trf')
            p1_fit, p2_fit = 1.0, float(res2.x[0])
        else:
            # Pin param2 at 1.0; refit param1.
            p2_unident = True
            def r2(params: np.ndarray) -> np.ndarray:
                return measured - _forward_vector(mode, cell, params[0], 1.0, p1_base, p2_base, conds)
            res1 = least_squares(r2, x0=np.array([1.0]), bounds=([lo1], [hi1]), method='trf')
            p1_fit, p2_fit = float(res1.x[0]), 1.0
        fitted_residuals = measured - _forward_vector(mode, cell, p1_fit, p2_fit, p1_base, p2_base, conds)
        jac = _jacobian_at(mode, cell, p1_fit, p2_fit, p1_base, p2_base, conds)
        cov_11, cov_12, cov_22, _ = _safe_covariance(jac, fitted_residuals)
        # Zero out covariance entries for the pinned parameter (no inferential
        # information about a quantity we did not fit).
        if p1_unident:
            cov_11 = 0.0
            cov_12 = 0.0
        if p2_unident:
            cov_22 = 0.0
            cov_12 = 0.0

    p1_clamped_after, p1_was_clamped = _ensure_clamped(p1_fit, lo1, hi1)
    p2_clamped_after, p2_was_clamped = _ensure_clamped(p2_fit, lo2, hi2)
    p1_fit, p2_fit = p1_clamped_after, p2_clamped_after

    residual_std = float(np.std(fitted_residuals, ddof=1)) if n_kept > 1 else 0.0
    rmse_before  = float(np.sqrt(np.mean((measured - predicted_floored[keep_mask]) ** 2)))
    rmse_after   = float(np.sqrt(np.mean(fitted_residuals * fitted_residuals)))

    return CalibrationResult(
        mode             = mode,
        param1_mult      = p1_fit,
        param2_mult      = p2_fit,
        cov_11           = cov_11,
        cov_12           = cov_12,
        cov_22           = cov_22,
        residual_std     = residual_std,
        n_samples        = n_kept,
        collecting       = False,
        clamped_param1   = p1_was_clamped,
        clamped_param2   = p2_was_clamped,
        param1_unidentifiable = p1_unident,
        param2_unidentifiable = p2_unident,
        outliers_removed = n_dropped,
        rmse_before      = rmse_before,
        rmse_after       = rmse_after,
    )


def _empty_result(mode: CalibrationMode, n: int, *, collecting: bool, outliers_removed: int = 0) -> CalibrationResult:
    return CalibrationResult(
        mode             = mode,
        param1_mult      = 1.0,
        param2_mult      = 1.0,
        cov_11           = 0.0,
        cov_12           = 0.0,
        cov_22           = 0.0,
        residual_std     = 0.0,
        n_samples        = n,
        collecting       = collecting,
        clamped_param1   = False,
        clamped_param2   = False,
        param1_unidentifiable = False,
        param2_unidentifiable = False,
        outliers_removed = outliers_removed,
        rmse_before      = 0.0,
        rmse_after       = 0.0,
    )


# ── Backwards-compat shim for /ai/calibrate legacy callers ──────────────────
# Older Node deployments that still POST the (predictedRatio, measuredRatio)
# pairs go through this scalar path — preserved so a partial rollout doesn't
# break. The new physics-inversion entry point is fit_calibration().

@dataclass(frozen=True)
class CalibrationRow:
    predicted_ratio: float
    measured_ratio:  float


@dataclass(frozen=True)
class LegacyResult:
    sigma_multiplier: float
    uncertainty_std:  float
    n_samples:        int
    collecting:       bool
    clamped:          bool
    outliers_removed: int
    rmse_before:      float
    rmse_after:       float


def fit_sigma_multiplier(rows: list[CalibrationRow]) -> LegacyResult:
    """Legacy scalar-multiplier fit. Kept as an explicit shim so the upgrade
    path is deliberate; new clients should call fit_calibration() with full
    protocol context to invert the actual physics."""
    n_in = len(rows)
    if n_in < CALIBRATION_MIN_SAMPLES:
        return LegacyResult(1.0, 0.0, n_in, True, False, 0, 0.0, 0.0)
    predicted = np.array([max(r.predicted_ratio, CALIBRATION_PREDICTION_FLOOR) for r in rows], dtype=np.float64)
    measured  = np.array([r.measured_ratio for r in rows], dtype=np.float64)
    keep = _reject_outliers(predicted, measured)
    n_dropped = int((~keep).sum())
    predicted, measured = predicted[keep], measured[keep]
    n_kept = len(predicted)
    if n_kept < CALIBRATION_MIN_SAMPLES:
        return LegacyResult(1.0, 0.0, n_kept, True, False, n_dropped, 0.0, 0.0)
    # Pull legacy bounds from the new schema (Schwan / mammalian as the safe default).
    (lo, hi), _ = _bounds_for('schwan', 'mammalian')

    def residuals(params: np.ndarray) -> np.ndarray:
        return measured - params[0] * predicted

    res = least_squares(residuals, x0=np.array([1.0]), bounds=(lo, hi), method='trf')
    m = float(res.x[0])
    clamped = abs(m - lo) < 1e-6 or abs(m - hi) < 1e-6
    fitted = measured - m * predicted
    sigma  = float(np.std(fitted, ddof=1)) if n_kept > 1 else 0.0
    raw    = measured - predicted
    rmse_before = float(np.sqrt(np.mean(raw * raw)))
    rmse_after  = float(np.sqrt(np.mean(fitted * fitted)))
    return LegacyResult(m, sigma, n_kept, False, clamped, n_dropped, rmse_before, rmse_after)
