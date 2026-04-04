// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Sweep-panel tooltip builders. Pure — no store access.
import { ICON } from "@/constants/icons";
import { THRESHOLDS } from "@/constants/physics";

import {
  getDisruptionWarningState,
  getSelectivityCssClass,
} from "./sharedTooltip";

export function tipWindow(params: {
  loStr: string;
  hiStr: string;
  center: string;
  unit: string;
}): string {
  const { loStr, hiStr, center, unit } = params;
  return `<strong>Selectivity Window</strong>
Range where DR_target ≥ 85% AND DR_healthy &lt; 50% simultaneously.

  Lo: ${loStr} ${unit}  ·  Hi: ${hiStr} ${unit}
  Center: <span class="tip-val">${center} ${unit}</span>

Operating within this window maximises selectivity.
Use the <span class="tip-val">⭐ Set to Window Center</span> button in the snap bar to apply ${center} ${unit} to the active parameter.`;
}

export function tipNoWindow(isField: boolean): string {
  return `<strong>No Selectivity Window</strong>
No ${isField ? "field intensity" : "frequency"} range found where:
  DR_target ≥ 85%  AND  DR_healthy &lt; 50%

Try increasing the sweep maximum, adjusting pulse width,
or switching from CW to pulsed mode for better selectivity.`;
}

export function tipThThreshold(isField: boolean): string {
  return `<strong>Operating Threshold</strong>
Key ${isField ? "field" : "frequency"} value where target DR crosses a biophysical milestone:
  50%, reversible electroporation onset
  85%, lysis countdown arms (irreversible pore accumulation)
  100%, lysis threshold reached`;
}

export function tipThTI(): string {
  const { TI_STRONG: s, TI_MARGINAL: m } = THRESHOLDS;
  return `<strong>TI: Selectivity Index</strong>
TI = DR_T / DR_H, selectivity ratio at this operating point.
<span class="tip-ok">≥ ${s}×</span>, strong selectivity window
<span class="tip-val">${m} - ${s}×</span>, marginal window
<span class="tip-warn">&lt; ${m}×</span>, poor selectivity`;
}

export function tipThTemp(): string {
  return `<strong>T<sub>target</sub>, Target Steady-State Temperature</strong>
T_ss = 37 + SAR_eff / (λ × cp)
Coloured: amber ≥ ${THRESHOLDS.TEMP_WARN}°C · red ≥ ${THRESHOLDS.TEMP_DENATURING}°C (denaturation onset)`;
}

export function tipKpLabel(label: string): string {
  return `<strong>Operating Point</strong>\n${label}`;
}

export function tipKpDrT(drT: number, lysisTime?: string): string {
  const state = getDisruptionWarningState(drT);
  const status =
    state === "crossed"
      ? `<span class="tip-warn">${ICON.LIGHTNING} Lysis threshold crossed</span>`
      : state === "armed"
        ? `<span class="tip-warn">${ICON.WARNING} Lysis armed (&gt;85%)${lysisTime ? " · " + lysisTime : ""}</span>`
        : "Sub-lysis operating point.";
  return `<strong>Target DR = ${drT.toFixed(3)}</strong>
Disruption ratio at this operating point.
${status}`;
}

export function tipKpDrH(drH: number): string {
  const status =
    drH >= THRESHOLDS.HEALTHY_APPROACHING
      ? `<span class="tip-warn">${ICON.WARNING} Healthy cells in Rev-EP zone (≥50%)</span>`
      : `<span class="tip-ok">✓ Healthy cells below Rev-EP threshold</span>`;
  return `<strong>Healthy DR = ${drH.toFixed(3)}</strong>
${status}`;
}

export function tipKpTI(ti: number): string {
  const { TI_STRONG: s, TI_MARGINAL: m } = THRESHOLDS;
  const cls = getSelectivityCssClass(ti);
  const label =
    ti >= s
      ? "✓ Strong selectivity"
      : ti >= m
        ? "Marginal selectivity"
        : `${ICON.WARNING} Poor selectivity`;
  return `<strong>TI = ${ti.toFixed(3)}×</strong>
<span class="${cls}">${label}</span>
TI = DR_T / DR_H at this threshold crossing.`;
}

export function tipKpTemp(tT: number): string {
  const warn =
    tT >= THRESHOLDS.TEMP_DENATURING
      ? `\n<span class="tip-warn">${ICON.WARNING} Denaturation zone (≥60°C)</span>`
      : tT >= THRESHOLDS.TEMP_WARN
        ? `\n<span class="tip-warn">${ICON.WARNING} Hyperthermic (≥42°C)</span>`
        : `\n<span class="tip-ok">✓ Safe thermal zone</span>`;
  return `<strong>T_ss (target) = ${tT.toFixed(1)}°C</strong>
Steady-state temperature via Pennes bioheat.${warn}`;
}
