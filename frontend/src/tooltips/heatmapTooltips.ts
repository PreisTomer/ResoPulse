// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Heatmap panel tooltip builders. Pure — no store access.
import { THRESHOLDS, BODY_TEMP_C } from '@/constants/physics'

export function tipCanvas(): string {
  return `<strong>Selectivity Window Planner</strong>
X = RF Frequency (log) · Y = Field Intensity

<span class='tip-ok'>■ Green</span> Selective target lysis, healthy safe
<span class='tip-val'>■ Amber</span> Marginal, healthy stressed
<span class='tip-warn'>■ Red</span> Ablative, non-selective (avoid)
<span class='tip-warn'>■ Orange</span> Thermal ≥ ${THRESHOLDS.TEMP_WARN}°C
■ Cyan Approaching window · ■ Dark Sub-threshold

Lines: yellow dashed = optimal freq · cyan dotted = fc corners
<em>Click to set operating point.</em>`
}

export function tipStats(): string {
  return `<strong>Operating Point Statistics</strong>
All values are computed at the current frequency and field using the Schwan single-shell model (or resonance Lorentzian in resonance mode).

T-DR: disruption ratio of target cell  = Vm_T × PEF / Vm_thr_T
H-DR: disruption ratio of healthy cell = Vm_H × PEF / Vm_thr_H
H-Temp: healthy cell steady-state temperature = ${BODY_TEMP_C} + SAR·dc / (λ·cp)
P(lysis): fraction of randomly-oriented target cells that exceed lysis threshold
  P = max(0, 1 − 1/DR) , from 3D isotropic cosθ distribution
Selectivity: TI = DR_T / DR_H (capped at ${THRESHOLDS.TI_DISPLAY_CAP})

All values update live as you drag the sliders.`
}

export function tipOptLine(): string {
  return `<strong>Optimal Selectivity Frequency</strong>
Vertical yellow dashed line shows the frequency that maximises TI = DR_T/DR_H.
For mammalian cells: found by a 300-point log scan (10 kHz-500 MHz).
For bacteria/virus in resonance mode: f_res of the capsid/cell-wall.

Click ⭐ Snap to optimal to navigate to this frequency.`
}

export function tipPLysis(): string {
  return `<strong>P(lysis), Random Orientation Fraction</strong>
In a real experiment, cells are randomly oriented in 3D.
The Schwan Vm has a cosθ factor: Vm(θ) = Vm_max · |cosθ|.

For a 3D isotropic distribution:
  P = max(0, 1 − 1/DR)

At DR=1.0: only the perfectly-aligned pole lyses → P = 0%
At DR=2.0: 50% of cells lyse
At DR=5.0: 80% of cells lyse

<em>Resonance mode</em>: acoustic pressure is omnidirectional, cosθ does not apply.`
}

export function tipRegime(): string {
  return `<strong>Frequency Regime at Operating Point</strong>
Determines the hardware required for field delivery.
  Electrolytic (&lt;300 MHz): direct-contact cuvette + pulse generator
  Near-field RF (300 MHz-1 GHz): 50 Ω coaxial probe + RF amplifier
  Microwave (&gt;1 GHz): rectangular waveguide or resonant cavity`
}

export function tipHoverDynamic(params: {
  freqLabel:    string
  fieldLabel:   string
  zoneLabel:    string
  zoneClass:    string
  tDrPct:       string
  hDrPct:       string
  tempStr:      string
  outcomeLines: string
}): string {
  const { freqLabel, fieldLabel, zoneLabel, zoneClass, tDrPct, hDrPct, tempStr, outcomeLines } = params
  return `<strong>${freqLabel} \u00b7 ${fieldLabel}</strong>\n`
    + `<span class='${zoneClass}'>${zoneLabel}</span>\n`
    + `T ${tDrPct} \u00b7 H ${hDrPct} \u00b7 ${tempStr}\n`
    + outcomeLines
}

export function tipSkinDepth(): string {
  return `<strong>EM Penetration Depth at Operating Point</strong>
Exact lossy-dielectric formula: δ = 1/α,  α = ω√(με/2)×√(√(1+(σ/ωε)²)−1)
(Gabriel et al. 1996; good-conductor approx. only valid below ~300 MHz in saline)
Saline: 100 MHz→48 mm · 1 GHz→32 mm · ε_r decreases above 1 GHz (Cole-Cole)
Sets the usable sample depth:
  ≥20 mm: full cuvette penetration
  5-20 mm: cm-depth; outer layer accessible
  &lt;5 mm: near-surface only; waveguide or cavity coupling required`
}
