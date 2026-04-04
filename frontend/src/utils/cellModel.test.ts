// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from "vitest";

import { H_FIRE_THRESHOLD_MULTIPLIER } from "@/constants/physics";

import {
  effectiveElectroporationThreshold,
  effectiveResonanceThreshold,
  getHfireThresholdMultiplier,
  hasResonanceConfig,
  isActiveResonanceTarget,
  isConfiguredResonanceTarget,
  isResonanceCapableCategory,
} from "./cellModel";

describe("cellModel helpers", () => {
  const resonanceCell = { resonantFreqGHz: 0.7, resonantThresholdVcm: 800 };
  const incompleteCell = {
    resonantFreqGHz: 0.7,
    resonantThresholdVcm: undefined,
  };

  it("detects resonance-capable categories", () => {
    expect(isResonanceCapableCategory("virus")).toBe(true);
    expect(isResonanceCapableCategory("bacteria")).toBe(true);
    expect(isResonanceCapableCategory("mammalian")).toBe(false);
  });

  it("detects complete resonance configuration", () => {
    expect(hasResonanceConfig(resonanceCell)).toBe(true);
    expect(hasResonanceConfig(incompleteCell)).toBe(false);
  });

  it("marks only configured bacteria and virus cells as resonance targets", () => {
    expect(isConfiguredResonanceTarget(resonanceCell, "virus")).toBe(true);
    expect(isConfiguredResonanceTarget(resonanceCell, "bacteria")).toBe(true);
    expect(isConfiguredResonanceTarget(resonanceCell, "mammalian")).toBe(false);
    expect(isConfiguredResonanceTarget(incompleteCell, "virus")).toBe(false);
  });

  it("requires resonance mode for active resonance targeting", () => {
    expect(isActiveResonanceTarget(resonanceCell, "virus", true)).toBe(true);
    expect(isActiveResonanceTarget(resonanceCell, "virus", false)).toBe(false);
  });

  it("applies the H-FIRE threshold multiplier only in H-FIRE mode", () => {
    expect(getHfireThresholdMultiplier("cw")).toBe(1);
    expect(getHfireThresholdMultiplier("pulsed")).toBe(1);
    expect(getHfireThresholdMultiplier("hfire")).toBe(
      H_FIRE_THRESHOLD_MULTIPLIER,
    );
  });

  it("uses waveform-aware electroporation thresholds", () => {
    expect(effectiveElectroporationThreshold(1, 37, "cw")).toBeCloseTo(1, 6);
    expect(effectiveElectroporationThreshold(1, 37, "hfire")).toBeCloseTo(
      H_FIRE_THRESHOLD_MULTIPLIER,
      6,
    );
  });

  it("keeps resonance thresholds independent of H-FIRE", () => {
    expect(effectiveResonanceThreshold(800, 37)).toBeCloseTo(800, 6);
  });
});
