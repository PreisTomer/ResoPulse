# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
Scalar sigma_i multiplier fit per (org, cellPresetId).

Takes a small batch of measured outcome rows where each row supplies a
simulator-predicted disruption ratio and a bench-measured lysis fraction, and
returns the scalar multiplier m such that sigma_i_corrected = sigma_i_base * m
minimizes the residual between measured and predicted in the least-squares
sense, plus the residual std used as the uncertainty band on downstream
visualisations.

This is a lightweight first-order layer on top of the XGBoost model; it does
not invert the full Schwan physics. The first-order approximation is that a
small sigma_i perturbation induces a roughly proportional DR perturbation
across the small protocol windows typical of a calibration session. Fit
quality (uncertainty band + n samples) is surfaced honestly on the UI so
the user can judge whether to trust the correction.
"""

from dataclasses import dataclass

import numpy as np
from scipy.optimize import least_squares

from .constants import (
    CALIBRATION_MIN_SAMPLES,
    CALIBRATION_MULT_MAX,
    CALIBRATION_MULT_MIN,
    CALIBRATION_OUTLIER_SIGMA,
    CALIBRATION_PREDICTION_FLOOR,
)


@dataclass(frozen=True)
class CalibrationRow:
    """One predicted/measured pair contributing to the fit.

    Both ratios are on the same scale (0–1 fractional disruption). The caller
    is responsible for converting measuredLysisPct/100 before building rows.
    """
    predicted_ratio: float
    measured_ratio:  float


@dataclass(frozen=True)
class CalibrationResult:
    """Fit output. `collecting` is True when n < CALIBRATION_MIN_SAMPLES;
    the caller should treat the returned multiplier as a placeholder (1.0)
    and surface a 'collecting data' state to the user."""
    sigma_multiplier:  float
    uncertainty_std:   float
    n_samples:         int
    collecting:        bool      # True when n < min-samples
    clamped:           bool      # True when fit hit [min, max] bounds
    outliers_removed:  int       # rows dropped by 3-sigma clipping pre-fit
    # Pre- and post-calibration RMSE on the DR-ratio scale. `rmse_before` is the
    # residual spread when no correction is applied (multiplier = 1); `rmse_after`
    # is the residual spread after the fitted multiplier. The UI renders them as
    # "Error A% → B%" so the scientist sees the concrete improvement.
    rmse_before:       float
    rmse_after:        float


def _fit_multiplier(predicted: np.ndarray, measured: np.ndarray) -> float:
    """One scalar least-squares fit minimizing || measured - m * predicted ||²
    with m clipped to [CALIBRATION_MULT_MIN, CALIBRATION_MULT_MAX]."""
    def residuals(params: np.ndarray) -> np.ndarray:
        return measured - params[0] * predicted
    result = least_squares(
        residuals,
        x0=np.array([1.0]),
        bounds=(CALIBRATION_MULT_MIN, CALIBRATION_MULT_MAX),
        method="trf",
    )
    return float(result.x[0])


def _reject_outliers(predicted: np.ndarray, measured: np.ndarray) -> tuple[np.ndarray, np.ndarray, int]:
    """Drop rows whose post-fit residual exceeds CALIBRATION_OUTLIER_SIGMA * MAD.

    Two critical choices: (1) rejection is measured against the *fitted* residuals
    (measured - m_hat * predicted), not raw (measured - predicted) — a uniform bias
    like the one calibration captures would otherwise be rejected as signal;
    (2) the spread estimator is median absolute deviation (×1.4826 for Gaussian
    equivalence), not std, so a single extreme point cannot inflate the band past
    itself and evade rejection. Returns (kept_predicted, kept_measured, n_dropped).
    """
    if len(predicted) < 3:
        return predicted, measured, 0
    m_hat = _fit_multiplier(predicted, measured)
    residuals = measured - m_hat * predicted
    # MAD is robust to individual outliers; 1.4826 normalises it to a std-equivalent
    # spread under a Gaussian tail. Compare deviation from the *residual median*,
    # not from zero, because a clamped fit leaves residuals systematically off-centre.
    med = float(np.median(residuals))
    deviations = np.abs(residuals - med)
    mad = float(np.median(deviations))
    robust_threshold = CALIBRATION_OUTLIER_SIGMA * 1.4826 * mad
    # Scale-relative floor: when >50% of residuals coincide MAD collapses to 0, so the
    # robust threshold alone cannot flag an isolated extreme point. A tiny fraction of
    # the measured-value range serves as the lower bound — large enough to ignore
    # float-precision noise in a perfect fit, small enough to catch a real outlier.
    scale = float(np.max(np.abs(measured)))
    scale_floor = max(1e-9, scale * 1e-6)
    threshold = max(robust_threshold, scale_floor)
    mask = deviations <= threshold
    dropped = int((~mask).sum())
    return predicted[mask], measured[mask], dropped


def fit_sigma_multiplier(rows: list[CalibrationRow]) -> CalibrationResult:
    """Fit a scalar multiplier m minimizing || measured - m * predicted ||².

    Below CALIBRATION_MIN_SAMPLES the fit is skipped and multiplier=1.0 is
    returned with `collecting=True` so the UI can show the progress gate
    ("collecting data, n/5"). The returned uncertainty_std is the residual
    std after the fit — directly usable as the sigma_i band half-width.

    The fit is clamped to [CALIBRATION_MULT_MIN, CALIBRATION_MULT_MAX] and
    `clamped=True` signals that biological plausibility bounds were hit,
    which the UI surfaces as a warning.
    """
    n_in = len(rows)
    if n_in < CALIBRATION_MIN_SAMPLES:
        return CalibrationResult(
            sigma_multiplier=1.0,
            uncertainty_std=0.0,
            n_samples=n_in,
            collecting=True,
            clamped=False,
            outliers_removed=0,
            rmse_before=0.0,
            rmse_after=0.0,
        )

    predicted = np.array([max(r.predicted_ratio, CALIBRATION_PREDICTION_FLOOR) for r in rows], dtype=np.float64)
    measured  = np.array([r.measured_ratio for r in rows], dtype=np.float64)

    predicted, measured, outliers_removed = _reject_outliers(predicted, measured)

    # Re-check sample count after outlier removal — dropping below the gate
    # means the remaining data is too thin to calibrate on.
    n_kept = len(predicted)
    if n_kept < CALIBRATION_MIN_SAMPLES:
        return CalibrationResult(
            sigma_multiplier=1.0,
            uncertainty_std=0.0,
            n_samples=n_kept,
            collecting=True,
            clamped=False,
            outliers_removed=outliers_removed,
            rmse_before=0.0,
            rmse_after=0.0,
        )

    m_fit = _fit_multiplier(predicted, measured)
    clamped = (
        abs(m_fit - CALIBRATION_MULT_MIN) < 1e-6
        or abs(m_fit - CALIBRATION_MULT_MAX) < 1e-6
    )

    fitted_residuals = measured - m_fit * predicted
    # Sample std (ddof=1) with a floor on n to avoid div-by-zero.
    uncertainty = float(np.std(fitted_residuals, ddof=1)) if n_kept > 1 else 0.0
    # RMSE on the DR-ratio scale — baseline uses no correction (m=1), fitted uses m_fit.
    # The UI renders them as "Error A% → B%" so the improvement is concrete to the scientist.
    raw_residuals = measured - predicted
    rmse_before   = float(np.sqrt(np.mean(raw_residuals ** 2)))
    rmse_after    = float(np.sqrt(np.mean(fitted_residuals ** 2)))

    return CalibrationResult(
        sigma_multiplier=m_fit,
        uncertainty_std=uncertainty,
        n_samples=n_kept,
        collecting=False,
        clamped=clamped,
        outliers_removed=outliers_removed,
        rmse_before=rmse_before,
        rmse_after=rmse_after,
    )
