// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from "vitest";

import {
  buildThermalWarningLine,
  formatTooltipFrequency,
  formatVmThresholdLine,
  getDisruptionWarningState,
  getSelectivityCssClass,
  resolveThermalWarningLevel,
} from "./sharedTooltip";

describe("sharedTooltip helpers", () => {
  it("formats tooltip frequencies via shared display rules", () => {
    expect(formatTooltipFrequency(850)).toBe("850 kHz");
    expect(formatTooltipFrequency(1250)).toBe("1.25 MHz");
  });

  it("resolves thermal warning levels in severity order", () => {
    expect(resolveThermalWarningLevel({ tempWarning: true })).toBe(
      "hyperthermic",
    );
    expect(
      resolveThermalWarningLevel({ tempDenaturing: true, tempWarning: true }),
    ).toBe("denaturing");
    expect(
      resolveThermalWarningLevel({
        tempVaporizing: true,
        tempDenaturing: true,
      }),
    ).toBe("vaporizing");
    expect(resolveThermalWarningLevel({})).toBe(null);
  });

  it("builds thermal warning lines from shared severity state", () => {
    expect(
      buildThermalWarningLine("hyperthermic", {
        hyperthermic: "warn hot",
        denaturing: "warn denature",
        vaporizing: "warn vapor",
      }),
    ).toContain("warn hot");
  });

  it("maps selectivity and disruption states consistently", () => {
    expect(getSelectivityCssClass(3)).toBe("tip-ok");
    expect(getSelectivityCssClass(1.5)).toBe("tip-val");
    expect(getSelectivityCssClass(0.5)).toBe("tip-warn");
    expect(getDisruptionWarningState(1.2)).toBe("crossed");
    expect(getDisruptionWarningState(0.9)).toBe("armed");
    expect(getDisruptionWarningState(0.2)).toBe("none");
  });

  it("formats Vm and threshold summary lines", () => {
    expect(formatVmThresholdLine("120 mV", "850 mV")).toBe(
      'Vm = <span class="tip-val">120 mV</span>  ·  Threshold = 850 mV',
    );
  });
});
