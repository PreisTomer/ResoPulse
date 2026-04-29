# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
XGBoost training pipeline for the AI protocol optimizer.

Reads consented outcomes from the SQLite database written by the Node.js backend,
trains three XGBoost regressors (target DR, healthy DR, rating), and saves the
trained model bundle to DATA_DIR/ai_model/.

Training rows flagged with a measured bench outcome are upweighted 5x so real
data dominates simulator-only rows during fit. When `measured_field_vcm` is
present it replaces the simulated field_vcm column so the trainer learns from
the true applied field rather than the target slider value.

The pipeline computes holdout RMSE/MAE per outcome on an 80/20 split and stages
the new bundle under `staging/` — only promoting to the active model path if
the mean holdout MAE beats the previous best. Every fit returns a
TrainingReport so the Node API can persist metrics + broadcast the new version.

All physics is pre-computed by the frontend — this module is ML-only.
"""

import logging
import os
import sqlite3
import urllib.request
import json
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, asdict

import joblib
import numpy as np

from .constants import (
    DATA_DIR_ENV_VAR,
    DEFAULT_DATA_DIRNAME,
    FEATURE_COLS,
    HEALTHY_DR_COL,
    MIN_TRAINING_SAMPLES,
    MODEL_BUNDLE_FILENAME,
    MODEL_DIRNAME,
    NODE_API_URL_ENV_VAR,
    OUTCOMES_DB_FILENAME,
    RATING_COL,
    TARGET_DR_COL,
    TRAINING_DATA_SECRET_ENV_VAR,
    TRAINING_SECRET_HEADER,
)

logger = logging.getLogger(__name__)

DATA_DIR   = Path(os.environ.get(DATA_DIR_ENV_VAR, Path.cwd() / DEFAULT_DATA_DIRNAME))
DB_PATH    = DATA_DIR / OUTCOMES_DB_FILENAME
MODEL_DIR  = DATA_DIR / MODEL_DIRNAME
MODEL_PATH = MODEL_DIR / MODEL_BUNDLE_FILENAME
STAGING_PATH = MODEL_DIR / "staging_bundle.joblib"

NODE_API_URL    = os.environ.get(NODE_API_URL_ENV_VAR, "").rstrip("/")
TRAINING_SECRET = os.environ.get(TRAINING_DATA_SECRET_ENV_VAR, "")

MEASURED_SAMPLE_WEIGHT = 5.0
HOLDOUT_FRACTION       = 0.20

# Promotion gate margins. A new bundle replaces the active one only when its
# holdout MAE is meaningfully better than the active bundle's, AND the holdout
# itself is large enough to call the comparison reliable. Without these gates
# noise-level MAE deltas churn the live model on every retrain.
PROMOTION_MIN_REL_IMPROVEMENT = 0.01
PROMOTION_MIN_HOLDOUT_SAMPLES = 5
HOLDOUT_SEED           = 17


@dataclass
class PerOutcomeMetrics:
    rmse: float
    mae:  float


@dataclass
class TrainingReport:
    """Structured retrain result — persisted by Node and broadcast to clients."""
    modelVersion:        str
    samplesUsed:         int
    holdoutSamples:      int
    targetDr:            PerOutcomeMetrics
    healthyDr:           PerOutcomeMetrics
    rating:              PerOutcomeMetrics
    holdoutMaeOverall:   float
    previousBestMae:     float | None
    promoted:            bool
    modelReady:          bool

    def to_dict(self) -> dict:
        return {
            "modelVersion":      self.modelVersion,
            "samplesUsed":       self.samplesUsed,
            "holdoutSamples":    self.holdoutSamples,
            "targetDr":          asdict(self.targetDr),
            "healthyDr":         asdict(self.healthyDr),
            "rating":            asdict(self.rating),
            "holdoutMaeOverall": self.holdoutMaeOverall,
            "previousBestMae":   self.previousBestMae,
            "promoted":          self.promoted,
            "modelReady":        self.modelReady,
        }


@dataclass
class ModelBundle:
    """Wrapper holding the three trained regressors and their metadata."""
    target_dr_model:     object
    healthy_dr_model:    object
    rating_model:        object
    feature_cols:        list[str]
    n_samples:           int
    feature_importance:  dict[str, float]
    model_version:       str    = ""
    holdout_mae_overall: float  = float("inf")


def _fetch_rows_from_api() -> list[dict] | None:
    """
    Pull outcome rows from the Node.js backend via GET /ai/training-data.
    Returns the raw dict records so the caller can pick up measured fields.
    """
    url = f"{NODE_API_URL}/ai/training-data"
    try:
        req = urllib.request.Request(url)
        if TRAINING_SECRET:
            req.add_header(TRAINING_SECRET_HEADER, TRAINING_SECRET)
        with urllib.request.urlopen(req, timeout=15) as resp:
            records: list[dict] = json.loads(resp.read())
    except Exception as exc:
        logger.warning("[Train] Could not fetch training data from API: %s", exc)
        return None
    return records


def _fetch_rows_from_db() -> list[dict] | None:
    if not DB_PATH.exists():
        logger.warning("[Train] Database not found at %s", DB_PATH)
        return None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cols = FEATURE_COLS + [TARGET_DR_COL, HEALTHY_DR_COL, RATING_COL, "measured_field_vcm", "measured_target_lysis_pct"]
        select_cols = ", ".join(cols)
        # Columns may not exist on old schemas — fall back to FEATURE_COLS only.
        try:
            rows = conn.execute(f"SELECT {select_cols} FROM outcomes").fetchall()
        except sqlite3.OperationalError:
            rows = conn.execute(f"SELECT {', '.join(FEATURE_COLS + [TARGET_DR_COL, HEALTHY_DR_COL, RATING_COL])} FROM outcomes").fetchall()
        conn.close()
    except sqlite3.Error as exc:
        logger.error("[Train] Failed to read outcomes: %s", exc)
        return None
    return [dict(r) for r in rows]


def _build_training_matrix(records: list[dict]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray] | None:
    """
    Shape the raw records into numpy arrays. Returns
      (X, y_target_dr, y_healthy_dr, y_rating, sample_weights)
    or None when not enough valid rows remain.

    When a row has a measured_field_vcm we overwrite the field_vcm feature with
    the measured value so the trainer sees the true applied field rather than
    the simulator target. Rows with any measured-* column get weight 5x.
    """
    field_idx = FEATURE_COLS.index("field_vcm")

    rows: list[list[float]] = []
    weights: list[float]    = []
    for rec in records:
        try:
            feat = [float(rec[col]) for col in FEATURE_COLS]
            ydr  = float(rec[TARGET_DR_COL])
            yhd  = float(rec[HEALTHY_DR_COL])
            yra  = float(rec[RATING_COL])
        except (KeyError, TypeError, ValueError):
            continue

        measured_field = rec.get("measured_field_vcm")
        if isinstance(measured_field, (int, float)) and np.isfinite(measured_field) and measured_field > 0:
            feat[field_idx] = float(measured_field)

        has_measured = any(
            isinstance(rec.get(k), (int, float)) and np.isfinite(rec.get(k))
            for k in ("measured_target_lysis_pct", "measured_healthy_lysis_pct", "measured_viability_pct", "measured_field_vcm")
        )
        weights.append(MEASURED_SAMPLE_WEIGHT if has_measured else 1.0)
        rows.append(feat + [ydr, yhd, yra])

    if len(rows) < MIN_TRAINING_SAMPLES:
        return None

    data = np.array(rows, dtype=np.float64)
    n    = len(FEATURE_COLS)
    X    = data[:, :n]
    ydr  = data[:, n]
    yhd  = data[:, n + 1]
    yra  = data[:, n + 2]
    w    = np.array(weights, dtype=np.float64)

    tau_idx = FEATURE_COLS.index("target_tau_ns")
    valid   = (X[:, tau_idx] > 0) & np.all(np.isfinite(X), axis=1)
    X, ydr, yhd, yra, w = X[valid], ydr[valid], yhd[valid], yra[valid], w[valid]

    if len(X) < MIN_TRAINING_SAMPLES:
        return None
    return X, ydr, yhd, yra, w


def _load_training_data() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray] | None:
    if NODE_API_URL:
        logger.info("[Train] Fetching training data from Node.js API at %s", NODE_API_URL)
        records = _fetch_rows_from_api()
    else:
        records = _fetch_rows_from_db()
    if records is None:
        return None
    return _build_training_matrix(records)


def _holdout_split(n: int) -> tuple[np.ndarray, np.ndarray]:
    """Deterministic 80/20 shuffle. Returns (train_idx, holdout_idx)."""
    rng = np.random.default_rng(HOLDOUT_SEED)
    perm = rng.permutation(n)
    holdout_size = max(1, int(round(n * HOLDOUT_FRACTION)))
    return perm[holdout_size:], perm[:holdout_size]


def _rmse_mae(y_true: np.ndarray, y_pred: np.ndarray) -> PerOutcomeMetrics:
    diff = y_true - y_pred
    return PerOutcomeMetrics(
        rmse=float(np.sqrt(np.mean(diff * diff))),
        mae =float(np.mean(np.abs(diff))),
    )


def _load_previous_best_mae() -> float | None:
    """Read the currently-active bundle's holdout MAE, if any."""
    if not MODEL_PATH.exists():
        return None
    try:
        prev = joblib.load(MODEL_PATH)
        mae  = getattr(prev, "holdout_mae_overall", None)
        if mae is None or not np.isfinite(mae):
            return None
        return float(mae)
    except Exception:
        return None


def _should_promote(new_mae: float, previous_best: float | None, holdout_n: int) -> bool:
    """
    Promote the new bundle only when (a) there is no previous bundle to beat,
    or (b) the holdout is large enough to trust AND the new MAE beats the
    previous best by at least PROMOTION_MIN_REL_IMPROVEMENT.
    """
    if not np.isfinite(new_mae):
        return False
    if previous_best is None:
        return True
    if holdout_n < PROMOTION_MIN_HOLDOUT_SAMPLES:
        return False
    required = previous_best * (1.0 - PROMOTION_MIN_REL_IMPROVEMENT)
    return new_mae < required


def retrain_model() -> TrainingReport | None:
    """
    Train XGBoost regressors on consented outcomes. Always fits on the training
    split, reports metrics on the holdout split, and only promotes the new
    bundle to MODEL_PATH when its mean holdout MAE beats the previous best.
    Returns None when training was skipped entirely (insufficient data).
    """
    try:
        import xgboost as xgb
    except ImportError:
        logger.error("[Train] xgboost not installed — run: uv sync (in apps/ai-service)")
        return None

    result = _load_training_data()
    if result is None:
        return None

    X, y_target_dr, y_healthy_dr, y_rating, weights = result
    n = len(X)
    logger.info("[Train] Training on %d samples with %d features", n, len(FEATURE_COLS))

    train_idx, holdout_idx = _holdout_split(n)
    X_tr,  X_ho  = X[train_idx],  X[holdout_idx]
    w_tr         = weights[train_idx]
    ydr_tr, ydr_ho = y_target_dr[train_idx],  y_target_dr[holdout_idx]
    yhd_tr, yhd_ho = y_healthy_dr[train_idx], y_healthy_dr[holdout_idx]
    yra_tr, yra_ho = y_rating[train_idx],     y_rating[holdout_idx]

    xgb_params = {
        "n_estimators":   200,
        "max_depth":      4,
        "learning_rate":  0.05,
        "subsample":      0.8,
        "random_state":   42,
        "n_jobs":         -1,
    }

    target_dr_model  = xgb.XGBRegressor(**xgb_params).fit(X_tr, ydr_tr, sample_weight=w_tr)
    healthy_dr_model = xgb.XGBRegressor(**xgb_params).fit(X_tr, yhd_tr, sample_weight=w_tr)
    rating_model     = xgb.XGBRegressor(**xgb_params).fit(X_tr, yra_tr, sample_weight=w_tr)

    m_target  = _rmse_mae(ydr_ho, target_dr_model.predict(X_ho))
    m_healthy = _rmse_mae(yhd_ho, healthy_dr_model.predict(X_ho))
    m_rating  = _rmse_mae(yra_ho, rating_model.predict(X_ho))
    mae_overall = (m_target.mae + m_healthy.mae + m_rating.mae) / 3.0

    raw_importance = rating_model.feature_importances_
    total          = raw_importance.sum() or 1.0
    feature_importance = {
        col: float(raw_importance[i] / total)
        for i, col in enumerate(FEATURE_COLS)
    }

    model_version = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    bundle = ModelBundle(
        target_dr_model     = target_dr_model,
        healthy_dr_model    = healthy_dr_model,
        rating_model        = rating_model,
        feature_cols        = FEATURE_COLS,
        n_samples           = n,
        feature_importance  = feature_importance,
        model_version       = model_version,
        holdout_mae_overall = mae_overall,
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, STAGING_PATH)

    previous_best = _load_previous_best_mae()
    holdout_n     = len(holdout_idx)
    promoted      = _should_promote(mae_overall, previous_best, holdout_n)
    if promoted:
        joblib.dump(bundle, MODEL_PATH)
        logger.info("[Train] Promoted model %s (holdoutMae=%.4f, prev=%s, holdoutN=%d)",
                    model_version, mae_overall, previous_best, holdout_n)
    else:
        logger.info("[Train] Retained previous model — new holdoutMae=%.4f vs prev=%s (holdoutN=%d, min=%d, minRelImprovement=%.2f%%)",
                    mae_overall, previous_best, holdout_n,
                    PROMOTION_MIN_HOLDOUT_SAMPLES, PROMOTION_MIN_REL_IMPROVEMENT * 100)

    return TrainingReport(
        modelVersion      = model_version,
        samplesUsed       = n,
        holdoutSamples    = len(holdout_idx),
        targetDr          = m_target,
        healthyDr         = m_healthy,
        rating            = m_rating,
        holdoutMaeOverall = mae_overall,
        previousBestMae   = previous_best,
        promoted          = promoted,
        modelReady        = True,
    )


def load_model() -> ModelBundle | None:
    """Load the saved model bundle from disk, or return None if not available."""
    if not MODEL_PATH.exists():
        return None
    try:
        bundle = joblib.load(MODEL_PATH)
        logger.info("[Train] Loaded model bundle (%d training samples, version=%s)",
                    bundle.n_samples, getattr(bundle, "model_version", "<legacy>"))
        return bundle
    except Exception as exc:
        logger.warning("[Train] Failed to load model: %s", exc)
        return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    report = retrain_model()
    if report:
        print(f"Training complete — {report.samplesUsed} samples, holdoutMae={report.holdoutMaeOverall:.4f}, promoted={report.promoted}")
    else:
        print("Training skipped (insufficient data or DB unavailable).")
