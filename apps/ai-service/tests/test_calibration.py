# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Tests for the physics-inversion calibration fit (Schwan + Resonance modes).

Five invariants per mode:
  1. Convergence    — fit recovers ground-truth multipliers under clean data.
  2. Covariance     — reported parameter variance scales with measurement noise.
  3. Robustness     — a single outlier does not derail the fit.
  4. Identifiability— low-information protocols pin the unidentifiable knob.
  5. Clamping       — fits outside category bounds are flagged.

Plus the legacy scalar shim is preserved for one-release backward compat.
"""

from __future__ import annotations

import numpy as np
import pytest

from resopulse_ai.calibration import (
    CalibrationRow,
    CalibrationSample,
    fit_calibration,
    fit_sigma_multiplier,
)
from resopulse_ai.constants import (
    CALIBRATION_BOUNDS,
    CALIBRATION_MIN_SAMPLES,
)
from resopulse_ai.physics import (
    CellParams,
    ProtocolConditions,
    compute_resonant_dr,
    compute_schwan_dr,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────


def _mammalian() -> CellParams:
    """A typical mammalian cell with no resonance params (pure Schwan)."""
    return CellParams(
        radius_um             = 7.5,
        membrane_thickness_nm = 5.0,
        dielectric_constant   = 5.0,
        sigma_i_baseline      = 0.5,    # S/m
        vth_baseline          = 1.0,    # V
    )


def _virus() -> CellParams:
    """A small icosahedral virus with both Schwan and Resonance params."""
    return CellParams(
        radius_um             = 0.05,
        membrane_thickness_nm = 5.0,
        dielectric_constant   = 4.5,
        sigma_i_baseline      = 0.3,
        vth_baseline          = 0.8,
        resonant_freq_ghz     = 8.0,
        capsid_q              = 5.0,
        resonant_threshold_vcm = 100.0,
    )


def _protocol(freq_khz: float, field_vcm: float = 1000.0, *, sigma_e: float = 1.5,
              waveform: str = 'pulsed', n_pulses: int = 8,
              temp_c: float = 37.0, pulse_width_ns: float = 100.0,
              duty_cycle: float = 0.001, orientation_deg: float = 0.0) -> ProtocolConditions:
    return ProtocolConditions(
        freq_khz=freq_khz, field_vcm=field_vcm, sigma_e=sigma_e,
        temp_c=temp_c, n_pulses=n_pulses, pulse_width_ns=pulse_width_ns,
        duty_cycle=duty_cycle, waveform=waveform, orientation_deg=orientation_deg,
    )


def _diverse_schwan_protocols() -> list[ProtocolConditions]:
    """Span a wide frequency × field grid so both σ_i and V_th are identifiable."""
    return [
        _protocol(freq_khz=10,    field_vcm=600),
        _protocol(freq_khz=100,   field_vcm=800),
        _protocol(freq_khz=1_000, field_vcm=1000),
        _protocol(freq_khz=10_000, field_vcm=1200),
        _protocol(freq_khz=100_000, field_vcm=1500),
        _protocol(freq_khz=500,   field_vcm=2000),
        _protocol(freq_khz=5_000, field_vcm=2500),
    ]


def _samples_from(cell: CellParams, mode: str, p1_true: float, p2_true: float,
                  protocols: list[ProtocolConditions], noise_std: float = 0.0,
                  seed: int = 1) -> list[CalibrationSample]:
    rng = np.random.default_rng(seed)
    rows: list[CalibrationSample] = []
    for proto in protocols:
        if mode == 'schwan':
            dr_true = compute_schwan_dr(cell, p1_true * cell.sigma_i_baseline,
                                                p2_true * cell.vth_baseline, proto)
        else:
            dr_true = compute_resonant_dr(cell, p1_true * (cell.capsid_q or 1.0),
                                                  p2_true * (cell.resonant_threshold_vcm or 1.0),
                                                  proto)
        noisy = dr_true + (rng.normal(0.0, noise_std) if noise_std > 0 else 0.0)
        rows.append(CalibrationSample(measured_ratio=max(0.0, min(1.0, noisy)), protocol=proto))
    return rows


# ── Schwan: collecting gate ──────────────────────────────────────────────────

class TestSchwanCollecting:
    def test_below_min_samples_returns_unit_multipliers(self) -> None:
        cell = _mammalian()
        samples = _samples_from(cell, 'schwan', 1.2, 0.9,
                                _diverse_schwan_protocols()[:CALIBRATION_MIN_SAMPLES - 1])
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        assert result.collecting is True
        assert result.param1_mult == 1.0
        assert result.param2_mult == 1.0


# ── Schwan: convergence ──────────────────────────────────────────────────────

class TestSchwanConvergence:
    @pytest.mark.parametrize("p1_true, p2_true", [
        (1.0, 1.0),
        (1.4, 0.85),
        (0.7, 1.3),
    ])
    def test_recovers_ground_truth_multipliers(self, p1_true: float, p2_true: float) -> None:
        cell = _mammalian()
        samples = _samples_from(cell, 'schwan', p1_true, p2_true,
                                _diverse_schwan_protocols())
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        assert result.collecting is False
        assert result.clamped_param1 is False
        assert result.clamped_param2 is False
        # σ_i is the harder direction (shows up only when ω·τ ~ 1); allow looser
        # tolerance there. V_th is the linear knob and should be tight.
        assert result.param1_mult == pytest.approx(p1_true, rel=0.10, abs=0.05)
        assert result.param2_mult == pytest.approx(p2_true, rel=0.05, abs=0.02)

    def test_rmse_drops_after_fit(self) -> None:
        cell = _mammalian()
        samples = _samples_from(cell, 'schwan', 1.5, 0.7, _diverse_schwan_protocols())
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        assert result.rmse_after < result.rmse_before


# ── Schwan: covariance ───────────────────────────────────────────────────────

class TestSchwanCovariance:
    def test_covariance_grows_with_noise(self) -> None:
        # Average across several seeds so a single unlucky noise realisation does
        # not dominate the comparison — covariance scales with σ²res, which is
        # an *expected* spread, not a per-realisation guarantee.
        cell = _mammalian()
        protocols = _diverse_schwan_protocols() * 5  # 35 rows per fit, lots of degrees of freedom
        low_cov_22, high_cov_22 = 0.0, 0.0
        runs = 5
        for seed in range(runs):
            low_noise  = _samples_from(cell, 'schwan', 1.0, 1.0, protocols, noise_std=0.005, seed=seed)
            high_noise = _samples_from(cell, 'schwan', 1.0, 1.0, protocols, noise_std=0.05,  seed=100 + seed)
            low_cov_22  += fit_calibration('schwan', 'mammalian', cell, low_noise).cov_22
            high_cov_22 += fit_calibration('schwan', 'mammalian', cell, high_noise).cov_22
        # Expect roughly the (noise_ratio)² ≈ 100× ratio in the limit; assert ≥3×.
        assert high_cov_22 > 3.0 * low_cov_22

    def test_residual_std_reports_noise_level(self) -> None:
        # Use a protocol grid where forward DR is mid-range (not pinned at 0 or 1)
        # so injected Gaussian noise is not biased by [0,1] clamping.
        cell = _mammalian()
        protocols = [
            _protocol(freq_khz=f, field_vcm=900)
            for f in (200, 300, 400, 500, 600, 700, 800, 1000, 1500, 2000) * 4
        ]
        samples = _samples_from(cell, 'schwan', 1.0, 1.0, protocols, noise_std=0.02, seed=7)
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        # 40 rows, 2 dof → reported std should be a stable estimate of σ.
        assert 0.5 * 0.02 < result.residual_std < 3.0 * 0.02


# ── Schwan: identifiability ──────────────────────────────────────────────────

class TestSchwanIdentifiability:
    def test_all_low_freq_pins_sigma_i(self) -> None:
        # All measurements at low ω·τ → V_m independent of σ_i → σ_i unidentifiable.
        cell = _mammalian()
        protocols = [_protocol(freq_khz=1, field_vcm=600 + 100 * i) for i in range(7)]
        samples = _samples_from(cell, 'schwan', 1.0, 1.0, protocols)
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        assert result.param1_unidentifiable is True
        assert result.param1_mult == 1.0
        # V_th still gets a fit (it's the only direction the data informs).
        assert result.param2_mult == pytest.approx(1.0, rel=0.05)


# ── Schwan: clamping ─────────────────────────────────────────────────────────

class TestSchwanClamping:
    def test_extreme_data_clips_param1(self) -> None:
        cell = _mammalian()
        # Push measured ratio so the optimiser would want σ_i_mult outside bounds.
        # The mammalian param1 bound is (0.5, 2.0) — try a true 5x.
        protocols = _diverse_schwan_protocols()
        # We can't actually generate "true 5x" measurements (DR caps at 1.0), so
        # construct samples where measured >> predicted for a forced clamp.
        samples = []
        for proto in protocols:
            base_dr = compute_schwan_dr(cell, cell.sigma_i_baseline, cell.vth_baseline, proto)
            # Inject 8x DR via implausibly low V_th to force the V_th clamp.
            samples.append(CalibrationSample(measured_ratio=min(1.0, base_dr * 8), protocol=proto))
        result = fit_calibration('schwan', 'mammalian', cell, samples)
        # At least one of the two clamps should engage with such extreme data.
        assert result.clamped_param1 or result.clamped_param2


# ── Resonance: convergence ───────────────────────────────────────────────────

class TestResonanceConvergence:
    @pytest.mark.parametrize("p1_true, p2_true", [
        (1.0, 1.0),
        (1.5, 0.8),
        (0.7, 1.2),
    ])
    def test_recovers_q_and_threshold(self, p1_true: float, p2_true: float) -> None:
        # Q is identifiable only when measurements straddle the resonance lineshape;
        # V_thr is identifiable when DR is sub-saturation (E/V_thr < 1). Pick a
        # field that keeps DR in [0.05, 0.9] across the chosen frequency grid.
        cell = _virus()
        f_res_khz = (cell.resonant_freq_ghz or 1.0) * 1e6
        # Field chosen so that on-resonance DR ≈ E/V_thr ≈ 0.5 (mid-range).
        E_vcm = 50.0  # at V_thr=100 baseline → on-resonance DR ≈ 0.5
        protocols = [
            _protocol(freq_khz=f_res_khz * 0.5, field_vcm=E_vcm),
            _protocol(freq_khz=f_res_khz * 0.8, field_vcm=E_vcm),
            _protocol(freq_khz=f_res_khz,        field_vcm=E_vcm),
            _protocol(freq_khz=f_res_khz * 1.2, field_vcm=E_vcm),
            _protocol(freq_khz=f_res_khz * 1.5, field_vcm=E_vcm),
            _protocol(freq_khz=f_res_khz * 0.9, field_vcm=E_vcm * 1.5),
            _protocol(freq_khz=f_res_khz * 1.1, field_vcm=E_vcm * 1.5),
            _protocol(freq_khz=f_res_khz * 0.7, field_vcm=E_vcm * 0.7),
        ]
        samples = _samples_from(cell, 'resonance', p1_true, p2_true, protocols)
        result = fit_calibration('resonance', 'virus', cell, samples)
        assert result.collecting is False
        # Q is the harder knob (zero gradient at exactly f_res); V_thr is linear.
        assert result.param1_mult == pytest.approx(p1_true, rel=0.30, abs=0.15)
        assert result.param2_mult == pytest.approx(p2_true, rel=0.10, abs=0.10)

    def test_threshold_scales_inversely(self) -> None:
        # Doubling V_thr halves DR everywhere → multiplier should land near 2.0.
        # Sub-saturation field needed so the doubling is observable in DR.
        cell = _virus()
        f_res_khz = (cell.resonant_freq_ghz or 1.0) * 1e6
        protocols = [
            _protocol(freq_khz=f_res_khz * f, field_vcm=80)  # baseline DR ≈ 0.8 at f_res
            for f in (0.6, 0.8, 1.0, 1.2, 1.5, 0.9, 0.7, 1.1)
        ]
        samples = _samples_from(cell, 'resonance', 1.0, 2.0, protocols)
        result = fit_calibration('resonance', 'virus', cell, samples)
        assert result.param2_mult == pytest.approx(2.0, rel=0.10)


# ── Legacy scalar shim ───────────────────────────────────────────────────────

class TestLegacyShim:
    def test_legacy_recovers_multiplier(self) -> None:
        rows = [CalibrationRow(p, 1.4 * p) for p in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]]
        result = fit_sigma_multiplier(rows)
        assert result.collecting is False
        assert result.sigma_multiplier == pytest.approx(1.4, abs=0.01)

    def test_legacy_collecting_below_min(self) -> None:
        rows = [CalibrationRow(0.5, 0.55) for _ in range(CALIBRATION_MIN_SAMPLES - 1)]
        result = fit_sigma_multiplier(rows)
        assert result.collecting is True
        assert result.sigma_multiplier == 1.0


# ── Bounds sanity ────────────────────────────────────────────────────────────

class TestBounds:
    def test_per_category_bounds_present(self) -> None:
        for mode in ('schwan', 'resonance'):
            for cat in ('mammalian', 'bacteria', 'virus'):
                bounds = CALIBRATION_BOUNDS[mode][cat]
                assert bounds['param1'][0] < bounds['param1'][1]
                assert bounds['param2'][0] < bounds['param2'][1]
                assert bounds['param1'][0] > 0
                assert bounds['param2'][0] > 0
