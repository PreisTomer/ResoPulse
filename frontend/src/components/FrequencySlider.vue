<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { broadcastFieldParams } from '../services/socket'
import { MEDIA } from '../mockData'
import type { MediumKey } from '../mockData'

export default defineComponent({
  setup() {
    const store = useCellStore()
    return { store, MEDIA }
  },

  computed: {
    currentFreq(): number {
      return this.store.currentBroadcastFrequency
    },

    currentField(): number {
      return this.store.fieldIntensity
    },

    currentMedium(): MediumKey {
      return this.store.medium
    },

    targetDisruption(): number {
      return this.store.targetDisruptionRatio
    },

    healthyDisruption(): number {
      return this.store.healthyDisruptionRatio
    },

    freqDisplay(): string {
      return this.currentFreq >= 1000
        ? `${(this.currentFreq / 1000).toFixed(2)} MHz`
        : `${this.currentFreq} kHz`
    },

    targetFcDisplay(): string {
      const fc = this.store.targetFc
      return fc >= 1000 ? `${(fc / 1000).toFixed(2)} MHz` : `${fc.toFixed(0)} kHz`
    },

    healthyFcDisplay(): string {
      const fc = this.store.healthyFc
      return fc >= 1000 ? `${(fc / 1000).toFixed(2)} MHz` : `${fc.toFixed(0)} kHz`
    },

    mediaKeys(): MediumKey[] {
      return Object.keys(this.MEDIA) as MediumKey[]
    },

    targetDisruptPercent(): string {
      return (this.targetDisruption * 100).toFixed(0)
    },

    healthyDisruptPercent(): string {
      return (this.healthyDisruption * 100).toFixed(0)
    },

    dutyCycleLogVal(): number {
      return Math.log10(this.store.dutyCycle)
    },

    dutyCycleDisplay(): string {
      const pct = this.store.dutyCycle * 100
      if (pct < 0.001) return (pct * 1000).toFixed(1) + ' µ%'
      if (pct < 0.1)   return pct.toFixed(4) + '%'
      return pct.toFixed(2) + '%'
    },

    currentWaveform(): 'cw' | 'pulsed' {
      return this.store.waveform
    },

    tipWaveform(): string {
      return `<strong>Waveform Type</strong>
<span class="tip-val">CW (sinusoidal)</span>  — continuous wave, SAR = σ·E²_rms/ρ = σ·E²/(2ρ)
  waveformFactor = 0.5 (RMS halving applied)

<span class="tip-val">Pulsed (DC)</span>  — square-wave bursts, SAR = σ·E²/ρ
  waveformFactor = 1.0 (full peak E² used)
  Duty cycle row controls on-fraction

CW is typical for TTFields (100–500 kHz sinusoidal).
Pulsed is typical for IRE/electroporation protocols.`
    },

    tipDutyCycle(): string {
      const effT = (this.store.targetSAR  * this.store.dutyCycle).toFixed(2)
      const effH = (this.store.healthySAR * this.store.dutyCycle).toFixed(2)
      return `<strong>Pulse Duty Cycle  (t_on / period)</strong>
Current: <span class="tip-val">${this.dutyCycleDisplay}</span>

Fraction of time the field is active.
Scales effective SAR → thermal load:
  SAR_eff = SAR_peak × duty_cycle

<span class="tip-val">T: ${effT} W/kg</span>  ·  <span class="tip-val">H: ${effH} W/kg</span>

Drives Newton cooling temperature model.
Typical pulsed electroporation: 0.001%–1%
High duty cycle → rapid heating; use caution`
    },

    // ── Tooltip content ───────────────────────────────────────────────────
    tipMedium(): string {
      const key = this.currentMedium
      const m = this.MEDIA[key]
      return `<strong>Propagation Medium</strong>
Sets external conductivity <span class="tip-val">σ_e = ${m.conductivity} S/m</span>
Used in Schwan time constant:
  τ = R·Cm·(2σ_e+σ_i) / (2σ_e·σ_i)
Higher σ_e → lower τ → higher fc → broader quasi-DC regime`
    },

    tipMediumKeys(): Record<string, string> {
      const descs: Record<string, string> = {
        saline: 'Matches physiological interstitial fluid',
        blood:  'Whole blood — moderate coupling',
        tissue: 'Soft tissue (low-perfusion) — note: DMEM has σ_e ≈ 1.4–1.6 S/m, not 0.4 S/m',
        water:  'Distilled water — near-zero coupling',
      }
      const out: Record<string, string> = {}
      for (const key of Object.keys(this.MEDIA)) {
        const m = this.MEDIA[key as keyof typeof this.MEDIA]
        out[key] = `<strong>${m.name}</strong>
σ_e = <span class="tip-val">${m.conductivity} S/m</span>
${descs[key] ?? ''}`
      }
      return out
    },

    tipFreq(): string {
      return `<strong>RF Broadcast Frequency</strong>
Current: <span class="tip-val">${this.freqDisplay}</span>
Schwan denominator: √(1 + (2πf·τ)²)

<span class="tip-val">fc(T) = ${this.targetFcDisplay}</span> — target roll-off frequency
<span class="tip-val">fc(H) = ${this.healthyFcDisplay}</span> — healthy roll-off frequency

Below fc → quasi-DC regime, Vm at maximum
Above fc → Vm rolls off toward zero`
    },

    tipFcSub(): string {
      return `<strong>Characteristic Frequency  fc = 1 / (2πτ)</strong>
At f = fc,  Vm = 0.707 × Vm_DC  (−3 dB point)
τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  [Kotnik & Miklavcic 2000]

Depends on cell size and membrane properties:
  Cancer cells: ~0.5–1.4 MHz  (adenocarcinoma ~0.49 MHz, hepatocyte ~1.08 MHz)
  Bacteria:     ~8–26 MHz  (E. coli ~8 MHz, MRSA ~26 MHz)
  Virions:      fc is low (~0.4 MHz) due to very low σ_i — Schwan model limited for virions`
    },

    tipField(): string {
      return `<strong>Applied Electric Field Intensity</strong>
Current: <span class="tip-val">${this.currentField} V/cm</span>
Vm scales linearly:  Vm = 1.5 × E × R / √(1+(ωτ)²)

Therapeutic window (saline, quasi-DC):
  Cancer lysis ≥ ~311 V/cm
  Healthy lysis ≥ ~733 V/cm
Default 150 V/cm is sub-threshold for all presets`
    },

    tipTargetBadge(): string {
      const tVm   = (this.store.targetVm * 1000).toFixed(2)
      const tThr  = (this.store.target.thresholdVoltage * 1000).toFixed(0)
      const pct   = this.targetDisruptPercent
      const warn  = this.targetDisruption > 0.85
        ? '\n<span class="tip-warn">⚡ >85% — lysis countdown active (2.5 s)</span>' : ''
      return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${tVm} mV</span>  ·  Threshold = ${tThr} mV${warn}
>85% held for 2.5 s → irreversible membrane lysis`
    },

    tipHealthyBadge(): string {
      const hVm  = (this.store.healthyVm * 1000).toFixed(2)
      const hThr = (this.store.healthy.thresholdVoltage * 1000).toFixed(0)
      const pct  = this.healthyDisruptPercent
      const ok   = this.healthyDisruption < 0.5
        ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
        : this.healthyDisruption > 0.85
          ? '\n<span class="tip-warn">⚠ Approaching ablative — reduce field</span>'
          : '\n<span class="tip-warn">⚠ Approaching limit — monitor closely</span>'
      return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${hVm} mV</span>  ·  Threshold = ${hThr} mV${ok}
Keep below 50% for a safe therapeutic window`
    },
  },

  methods: {
    onMediumChange(key: MediumKey) {
      this.store.setMedium(key)
      broadcastFieldParams(this.currentFreq, this.currentField, key)
    },

    onFreqInput(e: Event) {
      const freq = Number((e.target as HTMLInputElement).value)
      this.store.setBroadcastFreqKHz(freq)
      broadcastFieldParams(freq, this.currentField, this.currentMedium)
    },

    onFieldInput(e: Event) {
      const vcm = Number((e.target as HTMLInputElement).value)
      this.store.setFieldIntensity(vcm)
      broadcastFieldParams(this.currentFreq, vcm, this.currentMedium)
    },

    onDutyCycleInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setDutyCycle(Math.pow(10, logVal))
    },

    onWaveformChange(mode: 'cw' | 'pulsed') {
      this.store.setWaveform(mode)
    },
  },
})
</script>

<template>
  <div class="field-panel">
    <div class="panel-title">Field Control</div>
    <!-- Row 1: Medium selector -->
    <div class="panel-row panel-row--medium">
      <span class="row-label" v-tip="tipMedium">Medium</span>
      <div class="medium-pills">
        <label
          v-for="key in mediaKeys"
          :key="key"
          class="pill"
          :class="{ 'pill--active': currentMedium === key }"
          v-tip="tipMediumKeys[key]"
        >
          <input
            type="radio"
            :value="key"
            :checked="currentMedium === key"
            name="medium"
            @change="onMediumChange(key)"
          />
          {{ MEDIA[key].name.split(' ')[0] }}
        </label>
      </div>
      <span
        class="row-meta"
        v-tip="`<strong>External conductivity σ_e = ${MEDIA[currentMedium].conductivity} S/m</strong>\nUsed in Schwan time constant:\nτ = R·Cm·(2·<span class=\'tip-val\'>σ_e</span>+σ_i)/(2·<span class=\'tip-val\'>σ_e</span>·σ_i)\nChange medium to shift the coupling strength`"
      >σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
    </div>

    <!-- Row 2: RF Frequency -->
    <div class="panel-row">
      <span class="row-label" v-tip="tipFreq">RF Frequency</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          :min="10"
          :max="10000"
          step="1"
          :value="currentFreq"
          @input="onFreqInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipFreq">{{ freqDisplay }}</span>
        <span class="readout-sub" v-tip="tipFcSub">fc(T) {{ targetFcDisplay }} · fc(H) {{ healthyFcDisplay }}</span>
      </div>
    </div>

    <!-- Row 3: Field Intensity + disruption indicators -->
    <div class="panel-row">
      <span class="row-label" v-tip="tipField">Field Intensity</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          :min="10"
          :max="1000"
          step="1"
          :value="currentField"
          @input="onFieldInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipField">{{ currentField }}<span class="readout-unit"> V/cm</span></span>
        <div class="disruption-badges">
          <span
            class="badge badge--target"
            :class="{ 'badge--warn': targetDisruption > 0.85 }"
            v-tip="tipTargetBadge"
          >T {{ targetDisruptPercent }}%</span>
          <span
            class="badge badge--healthy"
            :class="{ 'badge--warn': healthyDisruption > 0.85 }"
            v-tip="tipHealthyBadge"
          >H {{ healthyDisruptPercent }}%</span>
        </div>
      </div>
    </div>
    <!-- Row 4: Waveform selector -->
    <div class="panel-row panel-row--medium" v-tip="tipWaveform">
      <span class="row-label">Waveform</span>
      <div class="medium-pills">
        <label
          class="pill"
          :class="{ 'pill--active': currentWaveform === 'pulsed' }"
        >
          <input type="radio" value="pulsed" :checked="currentWaveform === 'pulsed'" name="waveform" @change="onWaveformChange('pulsed')" />
          Pulsed
        </label>
        <label
          class="pill"
          :class="{ 'pill--active': currentWaveform === 'cw' }"
        >
          <input type="radio" value="cw" :checked="currentWaveform === 'cw'" name="waveform" @change="onWaveformChange('cw')" />
          CW
        </label>
      </div>
      <span class="row-meta">wf×{{ currentWaveform === 'cw' ? '0.5' : '1.0' }}</span>
    </div>

    <!-- Row 5: Duty Cycle (pulsed only) -->
    <div class="panel-row" v-if="currentWaveform === 'pulsed'">
      <span class="row-label" v-tip="tipDutyCycle">Duty Cycle</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          min="-6"
          max="-1"
          step="0.05"
          :value="dutyCycleLogVal"
          @input="onDutyCycleInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipDutyCycle">{{ dutyCycleDisplay }}</span>
        <span class="readout-sub" v-tip="tipDutyCycle">
          SAR_T {{ (store.targetSAR * store.dutyCycle).toFixed(1) }} · SAR_H {{ (store.healthySAR * store.dutyCycle).toFixed(1) }} W/kg
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Panel container ─────────────────────────────────────────────────── */
.field-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1.25rem;
}

/* ── Panel title ─────────────────────────────────────────────────────── */
.panel-title {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text);
  margin-bottom: 0.1rem;
}

/* ── Row layout ──────────────────────────────────────────────────────── */
.panel-row {
  display: grid;
  grid-template-columns: 7.5rem 1fr auto;
  align-items: center;
  gap: 0.85rem;
  min-height: 2.75rem;
}

.panel-row--medium {
  grid-template-columns: 7.5rem 1fr auto;
}

/* ── Row label ───────────────────────────────────────────────────────── */
.row-label {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Medium pills ────────────────────────────────────────────────────── */
.medium-pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.pill {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: capitalize;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
  user-select: none;
  white-space: nowrap;
}

.pill input {
  display: none;
}

.pill--active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-primary-dim);
}

/* ── Slider track ────────────────────────────────────────────────────── */
.slider-track-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ctrl-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: var(--color-border);
  outline: none;
}

.ctrl-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--color-text-heading);
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.ctrl-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 9px rgba(255, 255, 255, 0.45);
}

.ctrl-slider::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--color-text-heading);
  border: 2px solid var(--color-surface);
  cursor: pointer;
}

/* ── Right-side readout ──────────────────────────────────────────────── */
.row-readout {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  min-width: 8rem;
}

.row-meta {
  font-size: 0.58rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
  opacity: 0.65;
}

.readout-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

.readout-unit {
  font-size: 0.6rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.readout-sub {
  font-size: 0.64rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
  opacity: 0.82;
}

/* ── Disruption badges ───────────────────────────────────────────────── */
.disruption-badges {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.badge {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  border: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.badge--target  { color: var(--color-danger);  border-color: rgba(255,77,109,0.3); }
.badge--healthy { color: var(--color-accent); border-color: rgba(0,212,255,0.3); }

.badge--warn.badge--target  { background-color: rgba(255,77,109,0.12); border-color: var(--color-danger); }
.badge--warn.badge--healthy { background-color: rgba(0,212,255,0.12); border-color: var(--color-accent); }

/* ── Mobile ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .field-panel {
    margin-top: 1rem;
    padding: 0.7rem 0.85rem;
  }

  .panel-row {
    grid-template-columns: 5.5rem 1fr auto;
    gap: 0.5rem;
  }

  .row-readout {
    min-width: 6rem;
  }

  .readout-value {
    font-size: 0.85rem;
  }

  .readout-sub {
    display: none;
  }

  .row-meta {
    display: none;
  }
}
</style>
