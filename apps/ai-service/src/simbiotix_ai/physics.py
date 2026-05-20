# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
Forward physics for closed-loop calibration.

Mirrors the TypeScript forward path in `apps/web/src/utils/physics/index.ts`
exactly so a calibration fit done server-side reproduces the simulator's
predictions row-for-row. Two paths:

  Schwan / IRE   — DR(σ_i, V_th, ...) = Vm·pef / (Vth_eff·hfireMult)
  Resonance      — DR(Q, V_thr) = (E/V_thr)·L(f, f_res, Q) [+ optional mode 2]

Keep this file dependency-light (numpy only): the calibration LM solver
calls these at every step.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, exp, pi, radians, sqrt
from typing import Literal

import numpy as np

# ── Physical constants (mirror constants/physics.ts) ─────────────────────────
EPSILON_0                       = 8.854187817e-12
SCHWAN_SPHERE_FACTOR            = 1.5
H_FIRE_THRESHOLD_MULTIPLIER     = 1.75
ELECTROSENSITIZATION_EXPONENT   = 0.20
ELECTROSENSITIZATION_CLAMP_MIN  = 0.35
TEMP_EP_COEFF                   = 0.003
TEMP_EP_CLAMP_MIN               = 0.70
BODY_TEMP_C                     = 37.0
MIN_PULSE_ENVELOPE              = 1e-4
MIN_COS_THETA                   = 0.01

# ── Unit conversions ─────────────────────────────────────────────────────────
UM_TO_M  = 1e-6
NM_TO_M  = 1e-9
KHZ_TO_HZ = 1e3
VCM_TO_VM = 100.0
NS_TO_S   = 1e-9


@dataclass(frozen=True)
class CellParams:
    """Subset of CellConfig needed to evaluate forward DR."""
    radius_um:               float    # R  [µm]
    membrane_thickness_nm:   float    # d  [nm]
    dielectric_constant:     float    # ε_r [unitless]
    sigma_i_baseline:        float    # σ_i baseline [S/m]
    vth_baseline:            float    # V_th baseline [V] (Schwan path)
    # Resonance-path params (None for Schwan-only cells)
    resonant_freq_ghz:       float | None = None
    capsid_q:                float | None = None
    resonant_threshold_vcm:  float | None = None
    resonant_freq_ghz_2:     float | None = None
    capsid_q_2:              float | None = None
    resonant_mode2_amp:      float | None = None


@dataclass(frozen=True)
class ProtocolConditions:
    """Per-row protocol + environment for one outcome."""
    freq_khz:        float
    field_vcm:       float
    sigma_e:         float
    temp_c:          float
    n_pulses:        int
    pulse_width_ns:  float
    duty_cycle:      float
    waveform:        Literal['cw', 'pulsed', 'hfire']
    orientation_deg: float


def _membrane_cm(p: CellParams) -> float:
    return (p.dielectric_constant * EPSILON_0) / (p.membrane_thickness_nm * NM_TO_M)


def compute_tau(p: CellParams, sigma_i: float, sigma_e: float) -> float:
    """τ = R·Cm·(2σ_e + σ_i) / (2σ_e·σ_i)  [s]"""
    R = p.radius_um * UM_TO_M
    Cm = _membrane_cm(p)
    return R * Cm * (2 * sigma_e + sigma_i) / (2 * sigma_e * sigma_i)


def compute_schwan_vm(p: CellParams, sigma_i: float, c: ProtocolConditions) -> float:
    """Vm(f) = 1.5·E·R·cosθ / √(1 + (ω·τ)²)  [V]"""
    omega = 2.0 * pi * c.freq_khz * KHZ_TO_HZ
    tau   = compute_tau(p, sigma_i, c.sigma_e)
    cosT  = abs(cos(radians(c.orientation_deg)))
    return (SCHWAN_SPHERE_FACTOR * c.field_vcm * VCM_TO_VM * p.radius_um * UM_TO_M * cosT) \
        / sqrt(1.0 + (omega * tau) ** 2)


def pulse_envelope_clamped(tau_s: float, pulse_width_ns: float, is_pulsed: bool) -> float:
    """Membrane-charging fraction during a single pulse; floored to avoid 1/0."""
    if not is_pulsed:
        return 1.0
    pef = 1.0 - exp(-(pulse_width_ns * NS_TO_S) / tau_s)
    return max(MIN_PULSE_ENVELOPE, pef)


def temp_corrected_vth(nominal_vth: float, temp_c: float, n_pulses: int) -> float:
    """V_th_eff = V_th · clamp(1 − 0.003·(T−37), 0.70, ∞) · max(N^(−α), CLAMP_MIN)"""
    temp_factor = max(TEMP_EP_CLAMP_MIN, 1.0 - TEMP_EP_COEFF * max(0.0, temp_c - BODY_TEMP_C))
    if n_pulses > 1:
        n_factor = max(ELECTROSENSITIZATION_CLAMP_MIN, n_pulses ** (-ELECTROSENSITIZATION_EXPONENT))
    else:
        n_factor = 1.0
    return nominal_vth * temp_factor * n_factor


def compute_schwan_dr(p: CellParams, sigma_i: float, vth: float, c: ProtocolConditions) -> float:
    """Forward DR on the Schwan/IRE path. Scalar.

    DR = Vm · pef / (V_th_eff · hfire_mult). N_pulses collapses to 1 for CW.
    """
    is_pulsed   = c.waveform in ('pulsed', 'hfire')
    n_eff       = 1 if c.waveform == 'cw' else c.n_pulses
    hfire_mult  = H_FIRE_THRESHOLD_MULTIPLIER if c.waveform == 'hfire' else 1.0

    vm   = compute_schwan_vm(p, sigma_i, c)
    tau  = compute_tau(p, sigma_i, c.sigma_e)
    pef  = pulse_envelope_clamped(tau, c.pulse_width_ns, is_pulsed)
    vthE = temp_corrected_vth(vth, c.temp_c, n_eff)
    if vthE <= 0 or hfire_mult <= 0:
        return 0.0
    return (vm * pef) / (vthE * hfire_mult)


# ── Resonance path (acoustic / Lorentzian) ──────────────────────────────────

def _lorentzian(f0_ghz: float, q: float, freq_hz: float) -> float:
    """L(f) = 1/√(1 + (Q·(f/f₀ − f₀/f))²); peaks at f=f₀."""
    if f0_ghz <= 0 or q <= 0 or freq_hz <= 0:
        return 0.0
    f_ghz = freq_hz / 1e9
    x = f_ghz / f0_ghz - f0_ghz / f_ghz
    return 1.0 / sqrt(1.0 + (q * x) ** 2)


def compute_resonant_dr(p: CellParams, q: float, vthr: float, c: ProtocolConditions) -> float:
    """Forward DR on the acoustic-resonance path.

    Mirrors `computeResonantDisruption` in physics.ts. H-FIRE multiplier and
    electrosensitization do NOT apply — resonance is mechanical.
    """
    if vthr <= 0 or p.resonant_freq_ghz is None:
        return 0.0
    freq_hz = c.freq_khz * KHZ_TO_HZ
    dr1 = (c.field_vcm / vthr) * _lorentzian(p.resonant_freq_ghz, q, freq_hz)
    if not p.resonant_freq_ghz_2:
        return dr1
    alpha2 = p.resonant_mode2_amp if p.resonant_mode2_amp is not None else 0.5
    q2     = p.capsid_q_2 if p.capsid_q_2 is not None else q
    dr2    = alpha2 * (c.field_vcm / vthr) * _lorentzian(p.resonant_freq_ghz_2, q2, freq_hz)
    return dr1 + dr2


# ── Vector wrappers (numpy) for the LM fitter ───────────────────────────────

def schwan_dr_vector(p: CellParams, sigma_i: float, vth: float,
                     conds: list[ProtocolConditions]) -> np.ndarray:
    return np.array([compute_schwan_dr(p, sigma_i, vth, c) for c in conds], dtype=np.float64)


def resonant_dr_vector(p: CellParams, q: float, vthr: float,
                       conds: list[ProtocolConditions]) -> np.ndarray:
    return np.array([compute_resonant_dr(p, q, vthr, c) for c in conds], dtype=np.float64)


# ── Numerical Jacobian (central differences) ────────────────────────────────

def schwan_jacobian(p: CellParams, sigma_i: float, vth: float,
                    conds: list[ProtocolConditions], eps_rel: float = 1e-3) -> np.ndarray:
    """N×2 matrix [∂DR/∂σ_i, ∂DR/∂V_th] evaluated row-by-row.

    Used (a) to score row identifiability before solving, and (b) to compute
    the parameter covariance via (JᵀJ)⁻¹·σ²res after the fit.
    """
    h_s = max(sigma_i * eps_rel, 1e-9)
    h_v = max(vth * eps_rel, 1e-9)
    dr_sp = schwan_dr_vector(p, sigma_i + h_s, vth, conds)
    dr_sm = schwan_dr_vector(p, sigma_i - h_s, vth, conds)
    dr_vp = schwan_dr_vector(p, sigma_i, vth + h_v, conds)
    dr_vm = schwan_dr_vector(p, sigma_i, vth - h_v, conds)
    j_s = (dr_sp - dr_sm) / (2 * h_s)
    j_v = (dr_vp - dr_vm) / (2 * h_v)
    return np.column_stack([j_s, j_v])


def resonant_jacobian(p: CellParams, q: float, vthr: float,
                      conds: list[ProtocolConditions], eps_rel: float = 1e-3) -> np.ndarray:
    """N×2 matrix [∂DR/∂Q, ∂DR/∂V_thr]. Same role as Schwan version on the
    acoustic path."""
    h_q = max(q * eps_rel, 1e-9)
    h_v = max(vthr * eps_rel, 1e-9)
    dr_qp = resonant_dr_vector(p, q + h_q, vthr, conds)
    dr_qm = resonant_dr_vector(p, q - h_q, vthr, conds)
    dr_vp = resonant_dr_vector(p, q, vthr + h_v, conds)
    dr_vm = resonant_dr_vector(p, q, vthr - h_v, conds)
    j_q = (dr_qp - dr_qm) / (2 * h_q)
    j_v = (dr_vp - dr_vm) / (2 * h_v)
    return np.column_stack([j_q, j_v])
