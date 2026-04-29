# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
Pydantic models for the AI optimizer API.

Field names use camelCase to match the TypeScript types in
packages/shared-types/src/ai.ts — FastAPI serialises/deserialises them directly
without conversion so Node.js can call the service with no mapping layer.
"""

from typing import Literal

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
    resonantThresholdVcm: float | None = None
    resonantFreqGhz2: float | None = None
    capsidQ2:         float | None = None
    resonantMode2Amp: float | None = None


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


# ── Calibration models (physics-inversion API) ──────────────────────────────
# The new contract sends one CellParams block + per-row protocol context; the
# AI service inverts the actual Schwan or Resonance physics to recover
# (σ_i_mult, V_th_mult) for Schwan, or (Q_mult, V_thr_mult) for Resonance.

class CalibrationCellParams(BaseModel):
    """Cell baseline biophysics needed to evaluate forward DR.

    `mode` selects which path is being calibrated; resonance fields are
    required when mode='resonance'.
    """
    model_config = ConfigDict(populate_by_name=True)

    radiusUm:                float = Field(gt=0)
    memThicknessNm:          float = Field(gt=0)
    dielectricConst:         float = Field(gt=0)
    sigmaIBaseline:          float = Field(gt=0)
    vthBaseline:             float = Field(gt=0)
    resonantFreqGhz:         float | None = None
    capsidQBaseline:         float | None = None
    resonantThresholdVcmBaseline: float | None = None
    resonantFreqGhz2:        float | None = None
    capsidQ2:                float | None = None
    resonantMode2Amp:        float | None = None


class CalibrationProtocol(BaseModel):
    """Per-row protocol + environment for one bench measurement.

    Mirrors ProtocolConditions in physics.py; fields are camelCase to keep
    the wire format consistent with the rest of the AI surface.
    """
    model_config = ConfigDict(populate_by_name=True)

    freqKhz:        float = Field(gt=0)
    fieldVcm:       float = Field(gt=0)
    sigmaE:         float = Field(gt=0)
    tempC:          float
    nPulses:        int = Field(ge=1)
    pulseWidthNs:   float = Field(gt=0)
    dutyCycle:      float = Field(ge=0, le=1)
    waveform:       Literal['cw', 'pulsed', 'hfire']
    orientationDeg: float


class CalibrationSampleInput(BaseModel):
    """One bench measurement (for the new physics-inversion fit)."""
    model_config = ConfigDict(populate_by_name=True)

    measuredRatio: float = Field(ge=0, le=1)
    protocol:      CalibrationProtocol


class CalibrationRequest(BaseModel):
    """Request payload for /ai/calibrate. The new physics-inversion shape.

    `cellParams` and `category` and `mode` together identify the physics
    path being calibrated. `samples` carry the bench measurements.
    """
    model_config = ConfigDict(populate_by_name=True)

    orgId:        str
    cellPresetId: str
    mode:         Literal['schwan', 'resonance']
    category:     Literal['mammalian', 'bacteria', 'virus']
    cellParams:   CalibrationCellParams
    samples:      list[CalibrationSampleInput]


class CalibrationResponse(BaseModel):
    """Response from /ai/calibrate. Mirrors AiCalibrationResult in shared-types/ai.ts.

    Field semantics:
      mode               - which physics path was calibrated
      param1Mult         - Schwan: σ_i multiplier; Resonance: Q multiplier
      param2Mult         - Schwan: V_th multiplier; Resonance: V_thr multiplier
      cov11/cov12/cov22  - parameter covariance on the multiplier scale
      residualStd        - σ of fitted residuals on DR scale
      param1/2Unidentifiable - True when JᵀJ was ill-conditioned and that
                               parameter was pinned at 1.0 for an honest fit
    """
    model_config = ConfigDict(populate_by_name=True)

    mode:             Literal['schwan', 'resonance']
    param1Mult:       float
    param2Mult:       float
    cov11:            float
    cov12:            float
    cov22:            float
    residualStd:      float
    nSamples:         int
    collecting:       bool
    clampedParam1:    bool
    clampedParam2:    bool
    param1Unidentifiable: bool
    param2Unidentifiable: bool
    outliersRemoved:  int
    rmseBefore:       float
    rmseAfter:        float
