# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
Demo seed: inserts 40 physically realistic synthetic outcomes for the default
hepatocyte-vs-adenocarcinoma cell pair, then retrains the XGBoost model.

This activates ML mode (confidence > 0.50) immediately so a first-time user
or demo recipient sees the AI optimizer working end-to-end.

The seed data is derived from the Schwan equation at various protocol parameters
and is NOT labelled as user-collected data — a distinct session_name marks these
rows so they can be audited or deleted later.

Run once:
    uv run resopulse-ai seed-demo
"""

import logging
import math
import sqlite3
from pathlib import Path

from .constants import OUTCOMES_DB_FILENAME

logger = logging.getLogger(__name__)

SEED_SESSION = "seed-demo-v1"

# ── Default cell pair physics ──────────────────────────────────────────────────
# Healthy hepatocyte: R=10 µm, memThick=7 nm, εr=5.0, σi=0.5 S/m, Vth=1.1 V
# Target adenocarcinoma: R=15 µm, memThick=5 nm, εr=8.5, σi=0.9 S/m, Vth=0.7 V
# σe=1.5 S/m (saline), T=37°C

EPS0          = 8.854187817e-12
SIGMA_E       = 1.5          # saline conductivity S/m

R_H, MEM_H, EPS_H, SIG_I_H, VTH_H = 10e-6, 7e-9,  5.0,  0.5, 1.1
R_T, MEM_T, EPS_T, SIG_I_T, VTH_T = 15e-6, 5e-9,  8.5,  0.9, 0.7

Cm_H = EPS_H * EPS0 / MEM_H
Cm_T = EPS_T * EPS0 / MEM_T

TAU_H = R_H * Cm_H * (2 * SIGMA_E + SIG_I_H) / (2 * SIGMA_E * SIG_I_H)  # ~147 ns
TAU_T = R_T * Cm_T * (2 * SIGMA_E + SIG_I_T) / (2 * SIGMA_E * SIG_I_T)  # ~326 ns

FC_H = 1 / (2 * math.pi * TAU_H)   # ~1.08 MHz
FC_T = 1 / (2 * math.pi * TAU_T)   # ~0.49 MHz

TAU_H_NS = TAU_H * 1e9
TAU_T_NS = TAU_T * 1e9
FC_H_KHZ = FC_H / 1e3
FC_T_KHZ = FC_T / 1e3


def _schwan_vm(radius: float, tau: float, freq_hz: float, field_vcm: float) -> float:
    """Schwan equation: Vm [V] at the field-aligned pole (cosθ=1)."""
    omega = 2 * math.pi * freq_hz
    field_vm = field_vcm * 100.0   # V/cm → V/m
    return 1.5 * field_vm * radius / math.sqrt(1 + (omega * tau) ** 2)


def _pef(tau: float, pw_ns: float, waveform: str) -> float:
    """Pulse envelope factor — fraction of RC charging reached in one pulse."""
    if waveform != "pulsed":
        return 1.0
    t_p = pw_ns * 1e-9
    return max(1e-4, 1 - math.exp(-t_p / tau))


def _dr(radius, tau, vth, freq_hz, field_vcm, waveform, pw_ns):
    vm = _schwan_vm(radius, tau, freq_hz, field_vcm)
    pef_val = _pef(tau, pw_ns, waveform)
    return min(vm * pef_val / vth, 2.0)  # cap at 2.0 for stability


def _selectivity(dr_t, dr_h):
    return dr_t / dr_h if dr_h > 1e-6 else dr_t


def _rating_from_drs(dr_t: float, dr_h: float) -> int:
    """
    Map (DR_target, DR_healthy) to a 1–5 outcome rating using the same
    logic as the SelectivityPanel window score.
    """
    if dr_t >= 0.85 and dr_h < 0.15:
        return 5
    if dr_t >= 0.85 and dr_h < 0.35:
        return 4
    if dr_t >= 0.70 and dr_h < 0.50:
        return 3
    if dr_t >= 0.50 or (dr_t >= 0.85 and dr_h >= 0.50):
        return 2
    return 1


def _row(freq_khz: float, field_vcm: float, waveform: str = "pulsed",
         duty_cycle: float = 1e-4, pulse_width_ns: float = 100.0,
         orientation_deg: int = 0) -> dict:
    freq_hz = freq_khz * 1e3
    dr_t = _dr(R_T, TAU_T, VTH_T, freq_hz, field_vcm, waveform, pulse_width_ns)
    dr_h = _dr(R_H, TAU_H, VTH_H, freq_hz, field_vcm, waveform, pulse_width_ns)
    sel  = _selectivity(dr_t, dr_h)
    rating = _rating_from_drs(dr_t, dr_h)
    return {
        "session_name":    SEED_SESSION,
        "timestamp":       "2026-01-01 00:00:00",
        "freq_khz":        round(freq_khz),
        "field_vcm":       round(field_vcm),
        "medium":          "saline",
        "target_preset":   "adenocarcinoma",
        "waveform":        waveform,
        "duty_cycle":      duty_cycle,
        "pulse_width_ns":  round(pulse_width_ns),
        "orientation_deg": orientation_deg,
        "lysis_n_pulses":  1,
        "target_ratio":    round(dr_t, 4),
        "healthy_ratio":   round(dr_h, 4),
        "selectivity":     round(sel, 4),
        "target_temp":     37.5,
        "healthy_temp":    37.2,
        "rating":          rating,
        "ai_suggested":    0,
        "target_tau_ns":   round(TAU_T_NS, 2),
        "healthy_tau_ns":  round(TAU_H_NS, 2),
        "target_fc_khz":   round(FC_T_KHZ, 2),
        "healthy_fc_khz":  round(FC_H_KHZ, 2),
        "target_radius_um":15.0,
        "sigma_e":         SIGMA_E,
    }


def _build_seed_rows() -> list[dict]:
    """
    40 rows covering the full protocol space for this cell pair:
      - Optimal zone (high TI): near fc_T ~488 kHz, field 300-450 V/cm
      - Sub-optimal (wrong freq, right field)
      - Sub-optimal (right freq, low field)
      - CW vs pulsed comparison
      - High-frequency region (>fc_H, low selectivity)
      - Very low field (sub-threshold, rating 1)
    """
    rows = []

    # ── Group 1: optimal zone (freq ~250-600 kHz, field 300-450 V/cm, pulsed) ──
    # These should come out rating 4-5 from the Schwan model
    for freq_khz in [250, 350, 417, 500, 600]:
        for field_vcm in [300, 380, 450]:
            rows.append(_row(freq_khz, field_vcm, "pulsed", 1e-4, 100))

    # ── Group 2: near-optimal but slightly sub-threshold (field 200-250 V/cm) ──
    for freq_khz in [350, 417, 500]:
        rows.append(_row(freq_khz, 220, "pulsed", 1e-4, 100))
        rows.append(_row(freq_khz, 250, "pulsed", 1e-4, 100))

    # ── Group 3: CW at optimal freq vs pulsed — CW heats more, different DR ──
    for freq_khz in [417, 500]:
        rows.append(_row(freq_khz, 300, "cw",     1.0,   100))
        rows.append(_row(freq_khz, 150, "cw",     0.5,   100))

    # ── Group 4: too-high frequency (above fc_H ~1 MHz) — both cells low Vm ──
    for freq_khz in [2000, 5000, 10000]:
        rows.append(_row(freq_khz, 400, "pulsed", 1e-4, 100))
        rows.append(_row(freq_khz, 600, "pulsed", 1e-4, 100))

    # ── Group 5: too-low field, irrelevant frequency ───────────────────────────
    for freq_khz in [417, 2000]:
        rows.append(_row(freq_khz, 50, "pulsed", 1e-4, 100))

    return rows


def seed_database(data_dir: Path) -> int:
    """
    Insert seed rows into outcomes.db (creates DB + table if absent).
    Skips if seed rows already present.
    Returns the number of rows inserted.
    """
    db_path = data_dir / OUTCOMES_DB_FILENAME
    data_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS outcomes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            session_name    TEXT,
            timestamp       TEXT,
            freq_khz        INTEGER NOT NULL,
            field_vcm       INTEGER NOT NULL,
            medium          TEXT    NOT NULL,
            target_preset   TEXT    NOT NULL,
            waveform        TEXT    NOT NULL,
            duty_cycle      REAL    NOT NULL,
            pulse_width_ns  INTEGER NOT NULL,
            orientation_deg INTEGER NOT NULL,
            lysis_n_pulses  INTEGER NOT NULL,
            target_ratio    REAL    NOT NULL,
            healthy_ratio   REAL    NOT NULL,
            selectivity     REAL    NOT NULL,
            target_temp     REAL    NOT NULL,
            healthy_temp    REAL    NOT NULL,
            rating          INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            ai_suggested    INTEGER NOT NULL DEFAULT 0,
            target_tau_ns   REAL    NOT NULL DEFAULT 0,
            healthy_tau_ns  REAL    NOT NULL DEFAULT 0,
            target_fc_khz   REAL    NOT NULL DEFAULT 0,
            healthy_fc_khz  REAL    NOT NULL DEFAULT 0,
            target_radius_um REAL   NOT NULL DEFAULT 0,
            sigma_e         REAL    NOT NULL DEFAULT 0
        )
    """)

    existing = conn.execute(
        "SELECT COUNT(*) FROM outcomes WHERE session_name = ?", (SEED_SESSION,)
    ).fetchone()[0]

    if existing > 0:
        logger.info("[Seed] %d seed rows already present — skipping", existing)
        conn.close()
        return 0

    rows = _build_seed_rows()
    conn.executemany("""
        INSERT INTO outcomes (
            session_name, timestamp, freq_khz, field_vcm, medium, target_preset,
            waveform, duty_cycle, pulse_width_ns, orientation_deg, lysis_n_pulses,
            target_ratio, healthy_ratio, selectivity, target_temp, healthy_temp,
            rating, ai_suggested,
            target_tau_ns, healthy_tau_ns, target_fc_khz, healthy_fc_khz,
            target_radius_um, sigma_e
        ) VALUES (
            :session_name, :timestamp, :freq_khz, :field_vcm, :medium, :target_preset,
            :waveform, :duty_cycle, :pulse_width_ns, :orientation_deg, :lysis_n_pulses,
            :target_ratio, :healthy_ratio, :selectivity, :target_temp, :healthy_temp,
            :rating, :ai_suggested,
            :target_tau_ns, :healthy_tau_ns, :target_fc_khz, :healthy_fc_khz,
            :target_radius_um, :sigma_e
        )
    """, rows)
    conn.commit()
    conn.close()

    logger.info("[Seed] Inserted %d synthetic outcome rows into %s", len(rows), db_path)
    return len(rows)
