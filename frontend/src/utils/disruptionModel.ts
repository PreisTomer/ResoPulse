// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import {
  computePulseStepResponse,
  computeResonantDisruption,
  computeSchwan,
  computeTau,
} from "@/utils/physics";
import {
  effectiveElectroporationThreshold,
  effectiveResonanceThreshold,
} from "@/utils/cellModel";

import { DEFAULT_CAPSID_Q } from "@/constants/physics";
import { WAVEFORM } from "@/constants/strings";

import type { CellConfig } from "@/types/cell";

type WaveformValue = "cw" | "pulsed" | "hfire";

type ResonanceTarget = {
  resonantFreqGHz: number;
  capsidQ?: number;
  resonantThresholdVcm: number;
};

export function computeConfiguredDisruptionRatio(opts: {
  cell: CellConfig;
  sigmaE: number;
  cosTheta: number;
  waveform: WaveformValue;
  pulseWidthNs: number;
  freqKHz: number;
  fieldVcm: number;
  cellTempC: number;
  resonanceTarget?: ResonanceTarget;
}): number {
  const {
    cell,
    sigmaE,
    cosTheta,
    waveform,
    pulseWidthNs,
    freqKHz,
    fieldVcm,
    cellTempC,
    resonanceTarget,
  } = opts;

  if (resonanceTarget) {
    const thresholdEff = effectiveResonanceThreshold(
      resonanceTarget.resonantThresholdVcm,
      cellTempC,
    );
    return computeResonantDisruption(
      resonanceTarget.resonantFreqGHz,
      resonanceTarget.capsidQ ?? DEFAULT_CAPSID_Q,
      thresholdEff,
      freqKHz * 1e3,
      fieldVcm,
    );
  }

  const isPulsed = waveform === WAVEFORM.PULSED || waveform === WAVEFORM.H_FIRE;
  const tau = computeTau(cell, sigmaE);
  const pulseEnvelopeFactor = isPulsed
    ? computePulseStepResponse(tau, pulseWidthNs)
    : 1.0;
  const vm = computeSchwan(cell, freqKHz, fieldVcm, sigmaE, cosTheta);
  const thresholdEff = effectiveElectroporationThreshold(
    cell.thresholdVoltage,
    cellTempC,
    waveform,
  );
  return (vm * pulseEnvelopeFactor) / thresholdEff;
}
