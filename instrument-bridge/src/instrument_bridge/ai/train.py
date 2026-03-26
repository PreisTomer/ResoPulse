# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
XGBoost training pipeline for the AI protocol optimizer.

Reads consented outcomes from the SQLite database written by the Node.js backend,
trains three XGBoost regressors (target DR, healthy DR, rating), and saves the
trained model bundle to DATA_DIR/ai_model/.

All physics is pre-computed by the frontend — this module is ML-only.

Usage (manual trigger):
    python -m instrument_bridge.ai.train

Or via the FastAPI endpoint:
    POST /ai/retrain
"""

import logging
import os
import sqlite3
import urllib.request
import json
from pathlib import Path
from dataclasses import dataclass

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# ── Feature columns pulled from the outcomes table ──────────────────────────
# These were all pre-computed by the frontend; the model never calls Schwan.
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

TARGET_DR_COL    = "target_ratio"
HEALTHY_DR_COL   = "healthy_ratio"
RATING_COL       = "rating"

# ── Paths ───────────────────────────────────────────────────────────────────
DATA_DIR      = Path(os.environ.get("DATA_DIR", Path.cwd() / "data"))
DB_PATH       = DATA_DIR / "outcomes.db"
MODEL_DIR     = DATA_DIR / "ai_model"
MODEL_PATH    = MODEL_DIR / "model_bundle.joblib"
MIN_SAMPLES   = 20   # require at least this many rows before training

# When set, training data is fetched from the Node.js backend via HTTP instead of
# local SQLite.  Set NODE_API_URL=https://your-backend.onrender.com on the Python
# service so both Render services don't need to share a filesystem.
NODE_API_URL    = os.environ.get("NODE_API_URL", "").rstrip("/")
TRAINING_SECRET = os.environ.get("TRAINING_DATA_SECRET", "")


@dataclass
class ModelBundle:
    """Wrapper holding the three trained regressors and their metadata."""
    target_dr_model:  object   # predicts target_ratio
    healthy_dr_model: object   # predicts healthy_ratio
    rating_model:     object   # predicts user outcome rating
    feature_cols:     list[str]
    n_samples:        int
    feature_importance: dict[str, float]   # from rating_model


def _fetch_rows_from_api() -> list[tuple] | None:
    """
    Pull outcome rows from the Node.js backend via GET /ai/training-data.
    Returns a list of tuples (feature_cols + target_dr + healthy_dr + rating),
    or None on failure.
    """
    url = f"{NODE_API_URL}/ai/training-data"
    try:
        req = urllib.request.Request(url)
        if TRAINING_SECRET:
            req.add_header("x-training-secret", TRAINING_SECRET)
        with urllib.request.urlopen(req, timeout=15) as resp:
            records: list[dict] = json.loads(resp.read())
    except Exception as exc:
        logger.warning("[Train] Could not fetch training data from API: %s", exc)
        return None

    all_cols = FEATURE_COLS + [TARGET_DR_COL, HEALTHY_DR_COL, RATING_COL]
    rows = []
    for rec in records:
        try:
            row = tuple(float(rec[col]) for col in all_cols)
            rows.append(row)
        except (KeyError, TypeError, ValueError):
            continue
    return rows


def _load_training_data() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray] | None:
    """
    Load and validate training data.
    When NODE_API_URL is set, fetches from the Node.js backend via HTTP so both
    Render services can run on separate instances without a shared filesystem.
    Falls back to local SQLite otherwise.
    Returns (X, y_target_dr, y_healthy_dr, y_rating) or None if insufficient data.
    """
    if NODE_API_URL:
        logger.info("[Train] Fetching training data from Node.js API at %s", NODE_API_URL)
        rows = _fetch_rows_from_api()
        if rows is None:
            return None
    else:
        if not DB_PATH.exists():
            logger.warning("[Train] Database not found at %s", DB_PATH)
            return None
        try:
            conn = sqlite3.connect(DB_PATH)
            cols = ", ".join(FEATURE_COLS + [TARGET_DR_COL, HEALTHY_DR_COL, RATING_COL])
            rows = conn.execute(f"SELECT {cols} FROM outcomes").fetchall()
            conn.close()
        except sqlite3.Error as exc:
            logger.error("[Train] Failed to read outcomes: %s", exc)
            return None

    if len(rows) < MIN_SAMPLES:
        logger.info("[Train] Only %d samples (need %d) — skipping training", len(rows), MIN_SAMPLES)
        return None

    data = np.array(rows, dtype=np.float64)
    n_features = len(FEATURE_COLS)
    X           = data[:, :n_features]
    y_target_dr = data[:, n_features]
    y_healthy_dr= data[:, n_features + 1]
    y_rating    = data[:, n_features + 2]

    # Drop rows with NaN or zero tau (legacy rows before biophysical features were added)
    tau_col = FEATURE_COLS.index("target_tau_ns")
    valid   = (X[:, tau_col] > 0) & np.all(np.isfinite(X), axis=1)
    X, y_target_dr, y_healthy_dr, y_rating = (
        X[valid], y_target_dr[valid], y_healthy_dr[valid], y_rating[valid],
    )

    if len(X) < MIN_SAMPLES:
        logger.info("[Train] After filtering, only %d valid samples — skipping", len(X))
        return None

    return X, y_target_dr, y_healthy_dr, y_rating


def retrain_model() -> int:
    """
    Train XGBoost regressors on consented outcomes and save to MODEL_PATH.

    Returns the number of training samples used, or 0 if training was skipped.
    """
    try:
        import xgboost as xgb
    except ImportError:
        logger.error("[Train] xgboost not installed — run: uv sync --extra ai")
        return 0

    result = _load_training_data()
    if result is None:
        return 0

    X, y_target_dr, y_healthy_dr, y_rating = result
    n = len(X)
    logger.info("[Train] Training on %d samples with %d features", n, len(FEATURE_COLS))

    xgb_params = {
        "n_estimators": 200,
        "max_depth":    4,
        "learning_rate":0.05,
        "subsample":    0.8,
        "random_state": 42,
        "n_jobs":       -1,
    }

    target_dr_model  = xgb.XGBRegressor(**xgb_params).fit(X, y_target_dr)
    healthy_dr_model = xgb.XGBRegressor(**xgb_params).fit(X, y_healthy_dr)
    rating_model     = xgb.XGBRegressor(**xgb_params).fit(X, y_rating)

    # Feature importance from rating model (most interpretable for the user)
    raw_importance   = rating_model.feature_importances_
    total            = raw_importance.sum() or 1.0
    feature_importance = {
        col: float(raw_importance[i] / total)
        for i, col in enumerate(FEATURE_COLS)
    }

    bundle = ModelBundle(
        target_dr_model  = target_dr_model,
        healthy_dr_model = healthy_dr_model,
        rating_model     = rating_model,
        feature_cols     = FEATURE_COLS,
        n_samples        = n,
        feature_importance = feature_importance,
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    logger.info("[Train] Model saved to %s (%d samples)", MODEL_PATH, n)
    return n


def load_model() -> ModelBundle | None:
    """Load the saved model bundle from disk, or return None if not available."""
    if not MODEL_PATH.exists():
        return None
    try:
        bundle = joblib.load(MODEL_PATH)
        logger.info("[Train] Loaded model bundle (%d training samples)", bundle.n_samples)
        return bundle
    except Exception as exc:
        logger.warning("[Train] Failed to load model: %s", exc)
        return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    n = retrain_model()
    if n:
        print(f"Training complete — {n} samples used.")
    else:
        print("Training skipped (insufficient data or DB unavailable).")
