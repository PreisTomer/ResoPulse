# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
FastAPI service for the ResoPulse AI protocol optimizer.

Endpoints:
    GET  /health          — service status, model readiness, sample count
    POST /ai/optimize     — return optimized protocol recommendation
    POST /ai/retrain      — retrain XGBoost model from SQLite outcomes

Node.js calls this service via HTTP (AI_SERVICE_URL env var, default localhost:8000).
The service is stateless between requests; the model bundle is loaded once at startup.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .ai_models import OptimizeRequest, OptimizeResponse
from .constants import (
    AI_SERVICE_DESCRIPTION,
    AI_SERVICE_NAME,
    AI_SERVICE_TITLE,
    AI_SERVICE_VERSION,
    DEMO_SEED_ENV_VAR,
    DEMO_SEED_TRUTHY_VALUES,
)
from .optimizer import run_optimizer
from .service_state import get_model_bundle, set_model_bundle
from .train import load_model, retrain_model, ModelBundle

logger = logging.getLogger(__name__)


# ── Application lifecycle ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    set_model_bundle(load_model())
    bundle = get_model_bundle()
    if bundle is not None:
        logger.info("[AI Service] Model loaded — %d training samples", bundle.n_samples)
    else:
        logger.info("[AI Service] No trained model found — attempting auto-seed + train")
        try:
            from .seed import seed_database
            from .train import DATA_DIR, retrain_model
            # Only auto-seed when DEMO_SEED env var is set (opt-in so production
            # deployments don't silently inject synthetic data)
            if os.environ.get(DEMO_SEED_ENV_VAR, "").lower() in DEMO_SEED_TRUTHY_VALUES:
                n = seed_database(DATA_DIR)
                if n:
                    logger.info("[AI Service] Seeded %d demo rows", n)
                n_trained = retrain_model()
                if n_trained:
                    set_model_bundle(load_model())
                    logger.info("[AI Service] Auto-trained on %d samples", n_trained)
                else:
                    logger.info("[AI Service] Auto-seed done but training skipped — physics baseline active")
            else:
                logger.info("[AI Service] Physics baseline active (set DEMO_SEED=1 to auto-seed)")
        except Exception as exc:
            logger.warning("[AI Service] Auto-seed failed: %s — physics baseline active", exc)
    yield
    logger.info("[AI Service] Shutting down")


app = FastAPI(
    title=AI_SERVICE_TITLE,
    description=AI_SERVICE_DESCRIPTION,
    version=AI_SERVICE_VERSION,
    lifespan=lifespan,
)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    bundle = get_model_bundle()
    return {
        "status": "ok",
        "service": AI_SERVICE_NAME,
        "modelReady": bundle is not None,
        "trainingSamples": bundle.n_samples if bundle else 0,
        "isPhysicsBaseline": bundle is None,
    }


@app.post("/ai/optimize", response_model=OptimizeResponse)
async def optimize(request: OptimizeRequest) -> OptimizeResponse:
    """
    Return an optimized protocol recommendation.

    The physics baseline is always computed by the frontend before this call.
    This endpoint adds ML-predicted outcome quality and confidence scoring.
    Falls back to the physics baseline gracefully on any error.
    """
    try:
        return run_optimizer(request, get_model_bundle())
    except Exception as exc:
        logger.error("[AI Service] Unhandled error in /ai/optimize: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Optimizer failed — check service logs")


@app.post("/ai/retrain")
async def retrain() -> dict:
    """
    Retrain the XGBoost model from the current SQLite outcomes database.
    Replaces the in-memory model bundle on success.
    """
    try:
        n = retrain_model()
        if n > 0:
            set_model_bundle(load_model())
            logger.info("[AI Service] Model retrained on %d samples", n)
        return {"status": "ok", "samplesUsed": n, "modelReady": get_model_bundle() is not None}
    except Exception as exc:
        logger.error("[AI Service] Retraining failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Retraining failed — check service logs")
