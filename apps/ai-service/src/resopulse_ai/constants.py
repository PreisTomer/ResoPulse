# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Shared constants for the AI optimizer package."""

FEATURE_COLS = [
    "freq_khz",
    "field_vcm",
    "duty_cycle",
    "pulse_width_ns",
    "target_tau_ns",
    "healthy_tau_ns",
    "target_fc_khz",
    "healthy_fc_khz",
    "target_radius_um",
    "sigma_e",
    "orientation_deg",
]

TARGET_DR_COL = "target_ratio"
HEALTHY_DR_COL = "healthy_ratio"
RATING_COL = "rating"

MIN_TRAINING_SAMPLES = 20

CONFIDENCE_BASE = 0.50
CONFIDENCE_ML_MAX = 0.90

# ── Calibration: shared invariants ──────────────────────────────────────────
# n=5 mirrors THRESHOLDS.SIGMA_CALIB_MIN_SAMPLES on the frontend.
CALIBRATION_MIN_SAMPLES         = 5
CALIBRATION_OUTLIER_SIGMA       = 3.0      # MAD threshold for residual clipping
CALIBRATION_PREDICTION_FLOOR    = 1e-4     # avoids 1/0 when forward DR ≈ 0

# Condition number above which (JᵀJ) is treated as ill-conditioned. The
# value 1e8 is a practical safety floor for double-precision LM fits — beyond
# this the inverted covariance is dominated by floating-point noise. When
# triggered we drop to a 1-D fit and pin the worse-conditioned parameter.
CALIBRATION_UNIDENTIFIABLE_COND = 1.0e8

# ── Calibration: physiological multiplier bounds ────────────────────────────
# Multiplier scale: a value of 1.0 means "no correction from the literature
# baseline". Bounds are wider than typical (~30%) to accept measured drift
# from buffer ionic strength, freezer-thaw cycles, or pathological samples,
# while still ruling out unphysical fits dominated by outliers.
#
# Sources (web-checked 2026-04-26):
#   σ_i mammalian:  0.35–1.0 S/m (CHO, RBC, hepatocyte literature)
#   σ_i bacteria:   0.1–0.6 S/m  (gram-positive vs gram-negative spread)
#   σ_i virus:      0.05–0.5 S/m (rigid-shell scattering measurements)
#   V_th  EP:       0.3–2.0 V    (cell-line variability; cancer typically lower)
#   Q_capsid:       1–50         (peptidoglycan ~3, rigid icosahedral up to ~30)
#   V_thr_res:      ~10–500 V/cm (literature spread for capsid acoustic disruption)

CALIBRATION_BOUNDS = {
    'schwan': {
        'mammalian': {
            'param1': (0.5, 2.0),   # σ_i multiplier  →  e.g. 0.5×0.5 = 0.25 S/m to 0.5×2.0 = 1.0 S/m
            'param2': (0.4, 2.5),   # V_th multiplier
        },
        'bacteria': {
            'param1': (0.3, 3.0),   # bacteria σ_i has wider literature spread
            'param2': (0.4, 3.0),
        },
        'virus': {
            'param1': (0.2, 4.0),   # virus σ_i is least-characterised
            'param2': (0.3, 4.0),
        },
    },
    'resonance': {
        # Resonance uses the same per-category buckets even though only
        # bacteria/virus exercise this path; mammalian is included with the
        # same bounds as bacteria as a defensive fallback.
        'mammalian': {
            'param1': (0.3, 3.0),   # Q multiplier
            'param2': (0.3, 3.0),   # V_thr_res multiplier
        },
        'bacteria': {
            'param1': (0.3, 3.0),
            'param2': (0.3, 3.0),
        },
        'virus': {
            'param1': (0.3, 3.5),   # rigid capsid Q better-characterised than σ_i
            'param2': (0.3, 3.5),
        },
    },
}

# ── Legacy aliases (deprecated; kept for one release of backward compat) ────
CALIBRATION_MULT_MIN = CALIBRATION_BOUNDS['schwan']['mammalian']['param1'][0]
CALIBRATION_MULT_MAX = CALIBRATION_BOUNDS['schwan']['mammalian']['param1'][1]

DATA_DIR_ENV_VAR = "DATA_DIR"
NODE_API_URL_ENV_VAR = "NODE_API_URL"
TRAINING_DATA_SECRET_ENV_VAR = "TRAINING_DATA_SECRET"
DEMO_SEED_ENV_VAR = "DEMO_SEED"

DEFAULT_DATA_DIRNAME = "data"
OUTCOMES_DB_FILENAME = "outcomes.db"
MODEL_DIRNAME = "ai_model"
MODEL_BUNDLE_FILENAME = "model_bundle.joblib"

TRAINING_SECRET_HEADER = "x-training-secret"
DEMO_SEED_TRUTHY_VALUES = ("1", "true", "yes")

AI_SERVICE_TITLE = "ResoPulse AI Optimizer"
AI_SERVICE_DESCRIPTION = "ML-only protocol optimization service. Physics is pre-computed by the frontend."
AI_SERVICE_VERSION = "0.1.0"
AI_SERVICE_NAME = "resopulse-ai"
