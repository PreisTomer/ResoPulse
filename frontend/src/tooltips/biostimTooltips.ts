// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Biomodulation panel tooltip - extracted from BiostimPanel.vue computed property.
 * Follows the same pattern as sliderTooltips.ts: pure function, no store access.
 */

export function tipBiomod(params: {
  si: string
  mte: string
  ma: string
  bms: string
  dr: string
  T: string
  freqLabel: string
  fcLabel: string
  optCouplingFreqLabel: string
}): string {
  const { si, mte, ma, bms, dr, T, freqLabel, fcLabel, optCouplingFreqLabel } = params
  const optDrLow = '5', optDrHigh = '40'

  return `<strong>Biomodulation Panel: Healthy Cell</strong>
<span class="tip-note">Sub-threshold EM fields can stimulate healthy cells via three\\nindependent mechanisms modelled below. All computations use the\\nsame Schwan physics as the disruption model, field and frequency\\ncontrols affect BOTH cells simultaneously.</span>

<strong>① Sub-threshold Stimulation Index: <span class="tip-val">${si}%</span></strong>
DR = ${dr}% of lysis threshold (optimal: ${optDrLow} - ${optDrHigh}%)
Mechanism: sub-threshold Vm oscillations activate PIEZO1 and
voltage-gated Ca²⁺ channels → Ca²⁺ influx, growth factor release,
cytoskeletal remodelling, without membrane perforation.
Model: SI = 4·r·(1−r)   r = DR / 0.45   (quadratic bell, peak at 22%)
<span class="tip-note">Raise field intensity to push DR into 20-40% range for peak SI.\\nAbove 45% DR the healthy membrane enters the stress regime.</span>

<strong>② Frequency Coupling (MTE): <span class="tip-val">${mte}%</span></strong>
f = ${freqLabel} · fc = ${fcLabel}
Mechanism: at f ≪ fc the applied field fully couples across the membrane
(quasi-DC regime). Above fc the membrane acts as a capacitive shield
-  ωτ ≫ 1 → Vm → 0 → less stimulation per V/cm.
Model: MTE = 1 / √(1 + (f/fc)²) , identical to Schwan roll-off
Optimal: ${optCouplingFreqLabel} for ≥70% coupling efficiency
<span class="tip-note">Reduce carrier frequency toward 10-50 kHz to maximise coupling.\\nTarget cell disruption also scales with Vm, so lower frequency\\nbenefits selectivity only if R_T/R_H > 1 (cancer vs normal).</span>

<strong>③ Mild Thermal Activation (MA): <span class="tip-val">${ma}%</span></strong>
T_ss = ${T}°C  (steady-state via Newton cooling + SAR model)
Mechanism: SAR-driven mild warming upregulates HSP70 cytoprotection
(38-41°C), increases enzyme kinetics by Q₁₀ ≈ 1.07 per °C, and
enhances membrane fluidity for improved nutrient transport.
Model: piecewise bell, 0 at 37°C, peak at 41°C, zero above 42°C
<span class="tip-note">Tune duty cycle to reach T_ss 38-41°C for metabolic benefit.\\nAbove 42°C SAR becomes damaging, Safe Mode prevents this.</span>

<strong>Biomodulation Score: <span class="tip-val">${bms}%</span></strong>
= 55%·SI + 25%·MTE + 20%·MA
<span class="tip-ok">Research indicator: not a validated clinical index.\\nRefs: Pilla (2006) JRSE 8:72 · Lepock (2003) Int J Hyperthermia 19:252\\nLee et al. (2018) Sci Rep 8:8184 · Ikai et al. (2008) J Orthop Sci 13:550</span>`
}
