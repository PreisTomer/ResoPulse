# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
Pydantic models for the AI optimizer API.

Field names use camelCase to match the TypeScript types in
packages/shared-types/src/ai.ts — FastAPI serialises/deserialises them directly
without conversion so Node.js can call the service with no mapping layer.
"""

from pydantic import BaseModel, Field, ConfigDict


class CellBiophysics(BaseModel):
    """Key biophysical parameters for one cell. Mirrors CellBiophysics in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    id:               str
    label:            str
    radiusUm:         float = Field(gt=0)
    memThicknessNm:   float = Field(gt=0)
    dielectricConst:  float = Field(gt=0)
    conductivitySi:   float = Field(gt=0)
    thresholdV:       float = Field(gt=0)
    resonantFreqGhz:  float | None = None
    capsidQ:          float | None = None


class AiPhysicsFeatures(BaseModel):
    """Pre-computed physics features from the frontend. Mirrors AiPhysicsFeatures in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    targetTauNs:          float = Field(gt=0)
    healthyTauNs:         float = Field(gt=0)
    targetFcKhz:          float = Field(gt=0)
    healthyFcKhz:         float = Field(gt=0)
    sigmaE:               float = Field(gt=0)
    optimalFreqKhz:       float = Field(gt=0)
    selectivityAtOptimal: float


class AiParamSuggestion(BaseModel):
    """Recommended protocol parameters."""
    model_config = ConfigDict(populate_by_name=True)

    freqKHz:      float
    fieldVcm:     float
    dutyCycle:    float
    pulseWidthNs: float
    waveform:     str


class AiPhysicsBaseline(BaseModel):
    """Physics baseline computed by frontend. Used as cold-start recommendation."""
    model_config = ConfigDict(populate_by_name=True)

    suggestion:         AiParamSuggestion
    predictedTargetDr:  float
    predictedHealthyDr: float
    predictedTi:        float


class SessionState(BaseModel):
    """Current session state. Mirrors StatePacket in shared-types/socket.ts."""
    model_config = ConfigDict(populate_by_name=True)

    freqKHz:             float
    fieldVcm:            float
    medium:              str
    dutyCycle:           float
    pulseWidthNs:        float
    waveform:            str
    orientationDeg:      float
    lysisNPulses:        int
    chartMode:           str
    doubleShellEnabled:  bool
    perfusionRate:       float
    cellPackingFraction: float
    targetPresetId:      str
    healthyPresetId:     str
    sessionName:         str


class OptimizeRequest(BaseModel):
    """Full AI optimize request. Mirrors AiOptimizeRequest in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    requestId:       str
    sessionState:    SessionState
    healthyCell:     CellBiophysics
    targetCell:      CellBiophysics
    features:        AiPhysicsFeatures
    physicsBaseline: AiPhysicsBaseline


class OptimizeResponse(BaseModel):
    """AI optimize response. Mirrors AiOptimizeResult in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    requestId:          str
    suggestion:         AiParamSuggestion | None
    predictedTargetDr:  float
    predictedHealthyDr: float
    predictedTi:        float
    confidenceScore:    float
    explanation:        str
    featureImportance:  dict[str, float]
    isPhysicsBaseline:  bool


# ── Calibration models ──────────────────────────────────────────────────────
# Scalar sigma_i multiplier fit per (org, cellPresetId). The Node API collects
# measured outcome rows for one (org, cellPresetId), derives (predicted, measured)
# ratios, and POSTs them here — the fit is purely numeric and stateless.

class CalibrationSampleInput(BaseModel):
    """One (predicted, measured) pair. Both are fractional ratios in [0, 1]."""
    model_config = ConfigDict(populate_by_name=True)

    predictedRatio: float = Field(ge=0, le=1)
    measuredRatio:  float = Field(ge=0, le=1)


class CalibrationRequest(BaseModel):
    """Request payload for /ai/calibrate. Mirrors AiCalibrationRequest in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    orgId:        str
    cellPresetId: str
    samples:      list[CalibrationSampleInput]


class CalibrationResponse(BaseModel):
    """Response from /ai/calibrate. Mirrors AiCalibrationResult in shared-types/ai.ts."""
    model_config = ConfigDict(populate_by_name=True)

    sigmaMultiplier: float
    uncertaintyStd:  float
    nSamples:        int
    collecting:      bool
    clamped:         bool
    outliersRemoved: int
    rmseBefore:      float
    rmseAfter:       float
