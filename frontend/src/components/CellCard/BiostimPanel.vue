<template>
  <div class="cell-card__biostim" v-tip="tooltip">
    <div class="cell-card__biostim-header">
      <span class="cell-card__biostim-title">⊕ Biomodulation</span>
      <span class="cell-card__biostim-score" :class="scoreClass">
        {{ (biomodScore * 100).toFixed(0) }}%
      </span>
    </div>
    <div class="cell-card__biostim-bars">
      <div class="cell-card__biostim-row">
        <span class="cell-card__biostim-label">Sub-thr SI</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--si"
            :style="{ width: (stimIndex * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (stimIndex * 100).toFixed(0) }}%</span>
      </div>
      <div class="cell-card__biostim-row">
        <span class="cell-card__biostim-label">Freq coupl.</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--mte"
            :style="{ width: (mechTransdEff * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (mechTransdEff * 100).toFixed(0) }}%</span>
      </div>
      <div class="cell-card__biostim-row">
        <span class="cell-card__biostim-label">Mild heat</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--ma"
            :style="{ width: (mildThermal * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (mildThermal * 100).toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    stimIndex:       { type: Number, required: true },
    mechTransdEff:   { type: Number, required: true },
    mildThermal:     { type: Number, required: true },
    biomodScore:     { type: Number, required: true },
    disruptionRatio: { type: Number, required: true },
    freqKHz:         { type: Number, required: true },
    fcKHz:           { type: Number, required: true },
    steadyStateTemp: { type: Number, required: true },
  },

  computed: {
    scoreClass(): string {
      if (this.biomodScore < 0.25) return 'cell-card__biostim-score--low'
      if (this.biomodScore < 0.55) return 'cell-card__biostim-score--medium'
      return 'cell-card__biostim-score--high cell-card__biostim-score--active'
    },

    freqLabel(): string {
      return this.freqKHz >= 1000
        ? `${(this.freqKHz / 1000).toFixed(1)} MHz`
        : `${this.freqKHz.toFixed(0)} kHz`
    },

    fcLabel(): string {
      return this.fcKHz >= 1000
        ? `${(this.fcKHz / 1000).toFixed(1)} MHz`
        : `${this.fcKHz.toFixed(0)} kHz`
    },

    /** Recommended max frequency for ≥70% coupling efficiency: f < fc/√2 */
    optCouplingFreqLabel(): string {
      const optKHz = this.fcKHz / Math.SQRT2
      return optKHz >= 1000
        ? `<${(optKHz / 1000).toFixed(1)} MHz`
        : `<${optKHz.toFixed(0)} kHz`
    },

    tooltip(): string {
      const si  = (this.stimIndex * 100).toFixed(0)
      const mte = (this.mechTransdEff * 100).toFixed(0)
      const ma  = (this.mildThermal * 100).toFixed(0)
      const bms = (this.biomodScore * 100).toFixed(0)
      const dr  = (this.disruptionRatio * 100).toFixed(0)
      const T   = this.steadyStateTemp.toFixed(1)
      const optDrLow = '5'
      const optDrHigh = '40'

      return `<strong>Biomodulation Panel — Healthy Cell</strong>
<span class="tip-note">Sub-threshold EM fields can stimulate healthy cells via three\\nindependent mechanisms modelled below. All computations use the\\nsame Schwan physics as the disruption model — field and frequency\\ncontrols affect BOTH cells simultaneously.</span>

<strong>① Sub-threshold Stimulation Index: <span class="tip-val">${si}%</span></strong>
DR = ${dr}% of lysis threshold (optimal: ${optDrLow}–${optDrHigh}%)
Mechanism: sub-threshold Vm oscillations activate PIEZO1 and
voltage-gated Ca²⁺ channels → Ca²⁺ influx, growth factor release,
cytoskeletal remodelling — without membrane perforation.
Model: SI = 4·r·(1−r)   r = DR / 0.45   (quadratic bell, peak at 22%)
<span class="tip-note">Raise field intensity to push DR into 20–40% range for peak SI.\\nAbove 45% DR the healthy membrane enters the stress regime.</span>

<strong>② Frequency Coupling (MTE): <span class="tip-val">${mte}%</span></strong>
f = ${this.freqLabel} · fc = ${this.fcLabel}
Mechanism: at f ≪ fc the applied field fully couples across the membrane
(quasi-DC regime). Above fc the membrane acts as a capacitive shield
— ωτ ≫ 1 → Vm → 0 → less stimulation per V/cm.
Model: MTE = 1 / √(1 + (f/fc)²)  — identical to Schwan roll-off
Optimal: ${this.optCouplingFreqLabel} for ≥70% coupling efficiency
<span class="tip-note">Reduce carrier frequency toward 10–50 kHz to maximise coupling.\\nTarget cell disruption also scales with Vm, so lower frequency\\nbenefits selectivity only if R_T/R_H > 1 (cancer vs normal).</span>

<strong>③ Mild Thermal Activation (MA): <span class="tip-val">${ma}%</span></strong>
T_ss = ${T}°C  (steady-state via Newton cooling + SAR model)
Mechanism: SAR-driven mild warming upregulates HSP70 cytoprotection
(38–41°C), increases enzyme kinetics by Q₁₀ ≈ 1.07 per °C, and
enhances membrane fluidity for improved nutrient transport.
Model: piecewise bell — 0 at 37°C, peak at 41°C, zero above 42°C
<span class="tip-note">Tune duty cycle to reach T_ss 38–41°C for metabolic benefit.\\nAbove 42°C SAR becomes damaging — Safe Mode prevents this.</span>

<strong>Biomodulation Score: <span class="tip-val">${bms}%</span></strong>
= 55%·SI + 25%·MTE + 20%·MA
<span class="tip-ok">Research indicator — not a validated clinical index.\\nRefs: Pilla (2006) JRSE 8:72 · Lepock (2003) Int J Hyperthermia 19:252\\nLee et al. (2018) Sci Rep 8:8184 · Ikai et al. (2008) J Orthop Sci 13:550</span>`
    },
  },
})
</script>
