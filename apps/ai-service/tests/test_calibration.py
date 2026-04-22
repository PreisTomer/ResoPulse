# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Unit tests for the sigma-multiplier calibration fit.

These tests exercise the fit's four invariants:
  1. Convergence  — fit recovers a ground-truth multiplier under clean data.
  2. Uncertainty  — residual std reports the real noise level.
  3. Robustness   — a single outlier does not derail the fit.
  4. Clamping     — fits outside the biological plausibility band are flagged.

Deterministic fixtures (seeded RNG or explicit arrays) keep runs reproducible.
"""

from __future__ import annotations

import numpy as np
import pytest

from resopulse_ai.calibration import CalibrationRow, fit_sigma_multiplier
from resopulse_ai.constants import (
    CALIBRATION_MIN_SAMPLES,
    CALIBRATION_MULT_MAX,
    CALIBRATION_MULT_MIN,
)


def _rows(predicted: list[float], measured: list[float]) -> list[CalibrationRow]:
    assert len(predicted) == len(measured)
    return [CalibrationRow(p, m) for p, m in zip(predicted, measured)]


# ── Collecting gate ──────────────────────────────────────────────────────────

class TestCollectingGate:
    def test_fewer_than_min_samples_returns_collecting_placeholder(self) -> None:
        rows = _rows([0.5] * (CALIBRATION_MIN_SAMPLES - 1), [0.55] * (CALIBRATION_MIN_SAMPLES - 1))
        result = fit_sigma_multiplier(rows)
        assert result.collecting is True
        assert result.sigma_multiplier == 1.0
        assert result.uncertainty_std == 0.0
        assert result.n_samples == CALIBRATION_MIN_SAMPLES - 1

    def test_empty_input_collects(self) -> None:
        result = fit_sigma_multiplier([])
        assert result.collecting is True
        assert result.sigma_multiplier == 1.0
        assert result.n_samples == 0

    def test_outlier_rejection_dropping_below_min_reports_collecting(self) -> None:
        # 5 clean + 1 extreme outlier = 6 rows in; rejecting 1 keeps 5, still at the gate.
        # Push the outlier far enough that 3-sigma is certain to drop it.
        predicted = [0.5] * 6
        measured  = [0.55, 0.55, 0.55, 0.55, 0.55, 5.0]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.outliers_removed >= 1
        assert result.n_samples == 6 - result.outliers_removed
        if result.n_samples < CALIBRATION_MIN_SAMPLES:
            assert result.collecting is True


# ── Convergence ──────────────────────────────────────────────────────────────

class TestConvergence:
    @pytest.mark.parametrize("true_multiplier", [0.7, 0.9, 1.0, 1.17, 1.5, 2.2])
    def test_recovers_ground_truth_multiplier_from_clean_data(self, true_multiplier: float) -> None:
        # measured = m * predicted + tiny noise
        rng = np.random.default_rng(seed=42)
        predicted = np.linspace(0.1, 0.9, 12)
        noise = rng.normal(0.0, 1e-4, size=predicted.shape)
        measured = true_multiplier * predicted + noise
        result = fit_sigma_multiplier(_rows(predicted.tolist(), measured.tolist()))
        assert result.collecting is False
        assert result.clamped is False
        assert result.sigma_multiplier == pytest.approx(true_multiplier, abs=1e-3)

    def test_fit_centers_residuals_around_zero(self) -> None:
        # If the fit is correct, mean(measured - m*predicted) should be ~0.
        predicted = np.array([0.2, 0.3, 0.4, 0.5, 0.6, 0.7], dtype=np.float64)
        measured  = 1.2 * predicted
        result = fit_sigma_multiplier(_rows(predicted.tolist(), measured.tolist()))
        residuals = measured - result.sigma_multiplier * predicted
        assert abs(float(np.mean(residuals))) < 1e-6


# ── Uncertainty reporting ────────────────────────────────────────────────────

class TestUncertainty:
    def test_clean_data_reports_near_zero_uncertainty(self) -> None:
        predicted = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
        measured  = [1.1 * p for p in predicted]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.uncertainty_std < 1e-6

    def test_noisy_data_reports_proportional_uncertainty(self) -> None:
        rng = np.random.default_rng(seed=7)
        predicted = np.linspace(0.2, 0.8, 30)
        noise_std = 0.05
        noise = rng.normal(0.0, noise_std, size=predicted.shape)
        measured = 1.0 * predicted + noise
        result = fit_sigma_multiplier(_rows(predicted.tolist(), measured.tolist()))
        # Allow a reasonable tolerance band around the injected noise level.
        assert result.uncertainty_std == pytest.approx(noise_std, rel=0.40)

    def test_uncertainty_scales_with_noise(self) -> None:
        rng_lo = np.random.default_rng(seed=1)
        rng_hi = np.random.default_rng(seed=2)
        predicted = np.linspace(0.2, 0.8, 40)
        low_noise  = 1.0 * predicted + rng_lo.normal(0.0, 0.01, size=predicted.shape)
        high_noise = 1.0 * predicted + rng_hi.normal(0.0, 0.10, size=predicted.shape)
        low_fit  = fit_sigma_multiplier(_rows(predicted.tolist(), low_noise.tolist()))
        high_fit = fit_sigma_multiplier(_rows(predicted.tolist(), high_noise.tolist()))
        assert high_fit.uncertainty_std > low_fit.uncertainty_std


# ── Outlier robustness ───────────────────────────────────────────────────────

class TestOutlierRobustness:
    def test_single_outlier_does_not_derail_fit(self) -> None:
        # 9 clean 1.15x rows + 1 wild outlier at 5x — fit should stay near 1.15.
        predicted_clean = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8]
        measured_clean  = [1.15 * p for p in predicted_clean]
        predicted = predicted_clean + [0.5]
        measured  = measured_clean  + [2.5]  # 5x overshoot
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.outliers_removed >= 1
        assert result.sigma_multiplier == pytest.approx(1.15, abs=0.05)

    def test_uniform_bias_not_rejected_as_outliers(self) -> None:
        # Every residual shifted +X — the signal, not noise. Residual-mean-based
        # rejection must keep all rows.
        predicted = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
        measured  = [1.2 * p for p in predicted]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.outliers_removed == 0
        assert result.n_samples == 6


# ── Clamping ─────────────────────────────────────────────────────────────────

class TestClamping:
    def test_upper_clamp_flagged_when_fit_exceeds_max(self) -> None:
        # Measured is 9x predicted — true fit wants 9.0, but bounds clip to CALIBRATION_MULT_MAX.
        predicted = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]
        measured  = [9.0 * p for p in predicted]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.clamped is True
        assert result.sigma_multiplier == pytest.approx(CALIBRATION_MULT_MAX, abs=1e-6)

    def test_lower_clamp_flagged_when_fit_below_min(self) -> None:
        predicted = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
        measured  = [0.05 * p for p in predicted]  # true fit wants 0.05, bounds clip to CALIBRATION_MULT_MIN
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.clamped is True
        assert result.sigma_multiplier == pytest.approx(CALIBRATION_MULT_MIN, abs=1e-6)

    def test_fit_inside_bounds_not_clamped(self) -> None:
        predicted = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
        measured  = [1.4 * p for p in predicted]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.clamped is False
        assert CALIBRATION_MULT_MIN < result.sigma_multiplier < CALIBRATION_MULT_MAX


# ── Zero-prediction floor ────────────────────────────────────────────────────

class TestPredictionFloor:
    def test_zero_predictions_do_not_crash_fit(self) -> None:
        # CALIBRATION_PREDICTION_FLOOR guards against numerical blow-up when predicted ~ 0.
        predicted = [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.6, 0.7]
        measured  = [0.1, 0.1, 0.1, 0.1, 0.1, 0.55, 0.66, 0.77]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        # The non-zero rows should still drive a plausible fit.
        assert result.collecting is False
        assert np.isfinite(result.sigma_multiplier)


# ── RMSE delta reporting ─────────────────────────────────────────────────────

class TestRmseDelta:
    def test_biased_data_rmse_drops_after_fit(self) -> None:
        # Uniform bias at 1.4x — fit should collapse the residual spread.
        predicted = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
        measured  = [1.4 * p for p in predicted]
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.rmse_before > 0.0
        assert result.rmse_after < result.rmse_before
        assert result.rmse_after == pytest.approx(0.0, abs=1e-9)

    def test_unbiased_data_rmse_before_near_zero(self) -> None:
        # measured == predicted: baseline (m=1) already fits; both RMSEs ≈ 0.
        predicted = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
        measured  = list(predicted)
        result = fit_sigma_multiplier(_rows(predicted, measured))
        assert result.rmse_before == pytest.approx(0.0, abs=1e-9)
        assert result.rmse_after  == pytest.approx(0.0, abs=1e-9)

    def test_collecting_branch_reports_zero_rmse(self) -> None:
        rows = _rows([0.5] * (CALIBRATION_MIN_SAMPLES - 1), [0.6] * (CALIBRATION_MIN_SAMPLES - 1))
        result = fit_sigma_multiplier(rows)
        assert result.collecting is True
        assert result.rmse_before == 0.0
        assert result.rmse_after  == 0.0
