# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
FastAPI service for the ResoPulse AI protocol optimizer.

Endpoints:
    GET  /health          — service status, model readiness, sample count
    POST /ai/optimize     — return optimized protocol recommendation
    POST /ai/calibrate    — physics-inversion calibration fit (Schwan or Resonance)
    POST /ai/retrain      — retrain XGBoost model from SQLite outcomes

Node.js calls this service via HTTP (AI_SERVICE_URL env var, default localhost:8000).
The service is stateless between requests; the model bundle is loaded once at startup.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .ai_models import (
    CalibrationRequest,
    CalibrationResponse,
    OptimizeRequest,
    OptimizeResponse,
)
from .calibration import CalibrationSample, fit_calibration
from .constants import (
    AI_SERVICE_DESCRIPTION,
    AI_SERVICE_NAME,
    AI_SERVICE_TITLE,
    AI_SERVICE_VERSION,
    DEMO_SEED_ENV_VAR,
    DEMO_SEED_TRUTHY_VALUES,
)
from .optimizer import run_optimizer
from .physics import CellParams, ProtocolConditions
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
        "status":            "ok",
        "service":           AI_SERVICE_NAME,
        "modelReady":        bundle is not None,
        "trainingSamples":   bundle.n_samples if bundle else 0,
        "isPhysicsBaseline": bundle is None,
        "modelVersion":      getattr(bundle, "model_version", None) if bundle else None,
        "holdoutMaeOverall": getattr(bundle, "holdout_mae_overall", None) if bundle else None,
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


@app.post("/ai/calibrate", response_model=CalibrationResponse)
async def calibrate(request: CalibrationRequest) -> CalibrationResponse:
    """
    Two-parameter physics-inversion fit per (org, cellPresetId, mode).

    Schwan path:    fits (σ_i_mult, V_th_mult) by inverting the Schwan + RC
                    pulse envelope + temperature/electrosensitization-corrected
                    threshold over the supplied bench rows.
    Resonance path: fits (Q_mult, V_thr_mult) by inverting the Lorentzian
                    capsid response. The resonant frequency itself is not
                    fittable (it is a structural property of the capsid).

    Below CALIBRATION_MIN_SAMPLES the response carries collecting=True and
    multipliers=1.0 so the UI can show progress. Stateless — persistence
    happens in the Node API after the response is received.
    """
    try:
        cell = CellParams(
            radius_um               = request.cellParams.radiusUm,
            membrane_thickness_nm   = request.cellParams.memThicknessNm,
            dielectric_constant     = request.cellParams.dielectricConst,
            sigma_i_baseline        = request.cellParams.sigmaIBaseline,
            vth_baseline            = request.cellParams.vthBaseline,
            resonant_freq_ghz       = request.cellParams.resonantFreqGhz,
            capsid_q                = request.cellParams.capsidQBaseline,
            resonant_threshold_vcm  = request.cellParams.resonantThresholdVcmBaseline,
            resonant_freq_ghz_2     = request.cellParams.resonantFreqGhz2,
            capsid_q_2              = request.cellParams.capsidQ2,
            resonant_mode2_amp      = request.cellParams.resonantMode2Amp,
        )
        samples = [
            CalibrationSample(
                measured_ratio = s.measuredRatio,
                protocol = ProtocolConditions(
                    freq_khz        = s.protocol.freqKhz,
                    field_vcm       = s.protocol.fieldVcm,
                    sigma_e         = s.protocol.sigmaE,
                    temp_c          = s.protocol.tempC,
                    n_pulses        = s.protocol.nPulses,
                    pulse_width_ns  = s.protocol.pulseWidthNs,
                    duty_cycle      = s.protocol.dutyCycle,
                    waveform        = s.protocol.waveform,
                    orientation_deg = s.protocol.orientationDeg,
                ),
            )
            for s in request.samples
        ]
        fit = fit_calibration(request.mode, request.category, cell, samples)
        return CalibrationResponse(
            mode             = fit.mode,
            param1Mult       = fit.param1_mult,
            param2Mult       = fit.param2_mult,
            cov11            = fit.cov_11,
            cov12            = fit.cov_12,
            cov22            = fit.cov_22,
            residualStd      = fit.residual_std,
            nSamples         = fit.n_samples,
            collecting       = fit.collecting,
            clampedParam1    = fit.clamped_param1,
            clampedParam2    = fit.clamped_param2,
            param1Unidentifiable = fit.param1_unidentifiable,
            param2Unidentifiable = fit.param2_unidentifiable,
            outliersRemoved  = fit.outliers_removed,
            rmseBefore       = fit.rmse_before,
            rmseAfter        = fit.rmse_after,
        )
    except Exception as exc:
        logger.error("[AI Service] Calibration failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Calibration fit failed — check service logs")


@app.post("/ai/retrain")
async def retrain() -> dict:
    """
    Retrain the XGBoost model from the current outcomes store.
    Stages the new bundle, compares holdout MAE against the previous best, and
    only reloads the in-memory model when promotion succeeds. Returns the full
    training report so the Node API can persist metrics and broadcast the
    new model version to live clients.
    """
    try:
        report = retrain_model()
        if report is None:
            return {
                "status":       "ok",
                "samplesUsed":  0,
                "modelReady":   get_model_bundle() is not None,
                "promoted":     False,
                "modelVersion": None,
            }
        if report.promoted:
            set_model_bundle(load_model())
            logger.info("[AI Service] Active model updated to %s", report.modelVersion)
        return {"status": "ok", **report.to_dict()}
    except Exception as exc:
        logger.error("[AI Service] Retraining failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Retraining failed — check service logs")
