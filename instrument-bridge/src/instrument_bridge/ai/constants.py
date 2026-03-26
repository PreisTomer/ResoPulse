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