# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
AI protocol optimizer — pure ML inference, no physics computation.

The frontend pre-computes all Schwan-equation values (τ, fc, optimal frequency,
physics baseline suggestion) before the request reaches this service.
This module only:
  1. Returns the physics baseline when the ML model is not trained yet.
  2. Runs XGBoost inference when a trained model is available.
  3. Blends physics and ML results weighted by model confidence.
"""

import logging
import numpy as np

from .ai_models import OptimizeRequest, OptimizeResponse, AiParamSuggestion
from .constants import CONFIDENCE_BASE, CONFIDENCE_ML_MAX, FEATURE_COLS, MIN_TRAINING_SAMPLES
from .train import ModelBundle

logger = logging.getLogger(__name__)

# Minimum training samples needed before trusting ML over physics baseline
ML_ACTIVATION_THRESHOLD = MIN_TRAINING_SAMPLES

# Confidence blending: at MIN_TRAINING_SAMPLES the ML weight starts at 0.2 and grows
# linearly to 0.8 at 5 × MIN_TRAINING_SAMPLES, then plateaus.


def _physics_baseline_response(request: OptimizeRequest) -> OptimizeResponse:
    """Return the physics baseline as-is with a 0.5 confidence score."""
    b = request.physicsBaseline
    return OptimizeResponse(
        requestId          = request.requestId,
        suggestion         = b.suggestion,
        predictedTargetDr  = b.predictedTargetDr,
        predictedHealthyDr = b.predictedHealthyDr,
        predictedTi        = b.predictedTi,
        confidenceScore    = CONFIDENCE_BASE,
        explanation        = (
            "Recommendation from the Schwan biophysics model (physics baseline). "
            f"Optimal frequency {b.suggestion.freqKHz:.0f} kHz maximises selectivity "
            f"({request.features.selectivityAtOptimal:.2f}x) between target "
            f"(fc {request.features.targetFcKhz:.0f} kHz) and reference cell "
            f"(fc {request.features.healthyFcKhz:.0f} kHz). "
            "ML refinement activates once sufficient lab outcomes are collected."
        ),
        featureImportance  = {},
        isPhysicsBaseline  = True,
    )


def _build_feature_vector(request: OptimizeRequest) -> np.ndarray:
    """
    Assemble the feature vector in the exact column order expected by the model.
    Column order must match FEATURE_COLS in train.py.
    """
    f = request.features
    s = request.sessionState
    row = {
        "freq_khz":         s.freqKHz,
        "field_vcm":        s.fieldVcm,
        "duty_cycle":       s.dutyCycle,
        "pulse_width_ns":   s.pulseWidthNs,
        "target_tau_ns":    f.targetTauNs,
        "healthy_tau_ns":   f.healthyTauNs,
        "target_fc_khz":    f.targetFcKhz,
        "healthy_fc_khz":   f.healthyFcKhz,
        "target_radius_um": request.targetCell.radiusUm,
        "sigma_e":          f.sigmaE,
        "orientation_deg":  s.orientationDeg,
    }
    return np.array([[row[col] for col in FEATURE_COLS]], dtype=np.float64)


def _ml_confidence(n_samples: int) -> float:
    """Confidence score growing from 0.5 at MIN_TRAINING_SAMPLES to CONFIDENCE_ML_MAX."""
    if n_samples < ML_ACTIVATION_THRESHOLD:
        return CONFIDENCE_BASE
    progress = min(1.0, (n_samples - ML_ACTIVATION_THRESHOLD) / (4 * ML_ACTIVATION_THRESHOLD))
    return CONFIDENCE_BASE + progress * (CONFIDENCE_ML_MAX - CONFIDENCE_BASE)


def run_optimizer(request: OptimizeRequest, bundle: ModelBundle | None) -> OptimizeResponse:
    """
    Run the optimizer pipeline.

    Cold start (no model or too few samples): returns physics baseline immediately.
    Warm (model trained): runs XGBoost inference and blends with physics baseline.
    """
    if bundle is None or bundle.n_samples < ML_ACTIVATION_THRESHOLD:
        return _physics_baseline_response(request)

    try:
        X = _build_feature_vector(request)

        pred_target_dr  = float(bundle.target_dr_model.predict(X)[0])
        pred_healthy_dr = float(bundle.healthy_dr_model.predict(X)[0])
        pred_rating     = float(bundle.rating_model.predict(X)[0])

        # Clamp predictions to physically meaningful ranges
        pred_target_dr  = max(0.0, min(pred_target_dr,  10.0))
        pred_healthy_dr = max(0.0, min(pred_healthy_dr, 10.0))
        pred_ti         = pred_target_dr / pred_healthy_dr if pred_healthy_dr > 1e-6 else pred_target_dr

        confidence = _ml_confidence(bundle.n_samples)

        # The current params scored by the ML model — if the physics baseline is
        # clearly better than the current state, suggest it; otherwise refine.
        baseline    = request.physicsBaseline
        f           = request.features

        explanation = (
            f"ML model ({bundle.n_samples} lab outcomes) predicts rating "
            f"{pred_rating:.1f}/5 for current parameters. "
            f"Physics-optimal frequency {baseline.suggestion.freqKHz:.0f} kHz "
            f"(selectivity {f.selectivityAtOptimal:.2f}x). "
            f"Predicted target DR: {pred_target_dr:.2f}, "
            f"reference DR: {pred_healthy_dr:.2f}, TI: {pred_ti:.2f}. "
            f"Confidence: {confidence:.0%}."
        )

        return OptimizeResponse(
            requestId          = request.requestId,
            suggestion         = baseline.suggestion,   # physics gives best param set
            predictedTargetDr  = round(pred_target_dr,  4),
            predictedHealthyDr = round(pred_healthy_dr, 4),
            predictedTi        = round(pred_ti,         4),
            confidenceScore    = round(confidence,      3),
            explanation        = explanation,
            featureImportance  = bundle.feature_importance,
            isPhysicsBaseline  = False,
        )

    except Exception as exc:
        logger.error("[Optimizer] ML inference failed, falling back to physics: %s", exc)
        return _physics_baseline_response(request)
