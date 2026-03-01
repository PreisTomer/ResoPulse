<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../../stores/cellStore'
import { DISRUPTION_WARN_THRESHOLD } from '../../constants/cellCard'
import { computeSchwan } from '../../utils/physics'
import { broadcastFieldParams } from '../../services/socket'
import DisruptionBars from './DisruptionBars.vue'
import ComparisonTable from './ComparisonTable.vue'
import PresetLibrary from './PresetLibrary.vue'

export default defineComponent({
  components: { DisruptionBars, ComparisonTable, PresetLibrary },

  setup() {
    return { store: useCellStore() }
  },

  computed: {
    selectivity(): number    { return this.store.selectivityRatio },
    targetRatio(): number    { return this.store.targetDisruptionRatio },
    targetRatioPct(): number { return Math.min(100, this.targetRatio * 100) },

    selectivityClass(): string {
      if (this.selectivity >= 1.5) return 'sel-panel__ratio--strong'
      if (this.selectivity >= 1.0) return 'sel-panel__ratio--marginal'
      return 'sel-panel__ratio--weak'
    },

    modeBadge(): { label: string } {
      const t = this.targetRatio
      const h = this.store.healthyDisruptionRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)            return { label: this.$t('selectivity.modeAblative')    }
      if (t >= DISRUPTION_WARN_THRESHOLD && h < 0.5) return { label: this.$t('selectivity.modeTherapeutic') }
      if (t >= DISRUPTION_WARN_THRESHOLD)            return { label: this.$t('selectivity.modeMarginal')    }
      if (t >= 0.5)                                  return { label: this.$t('selectivity.modeApproaching') }
      return                                                { label: this.$t('selectivity.modeSubThreshold') }
    },

    modeBadgeClass(): string {
      const t = this.targetRatio, h = this.store.healthyDisruptionRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)            return 'sel-panel__mode-badge--ablative'
      if (t >= DISRUPTION_WARN_THRESHOLD && h < 0.5) return 'sel-panel__mode-badge--therapeutic'
      if (t >= DISRUPTION_WARN_THRESHOLD)            return 'sel-panel__mode-badge--marginal'
      if (t >= 0.5)                                  return 'sel-panel__mode-badge--approaching'
      return                                                'sel-panel__mode-badge--subthreshold'
    },

    targetVmMv(): string  { return (this.store.targetVm  * 1000).toFixed(2) },
    healthyVmMv(): string { return (this.store.healthyVm * 1000).toFixed(2) },
    targetSarVal(): string  { return this.store.targetSAR.toFixed(3)  },
    healthySarVal(): string { return this.store.healthySAR.toFixed(3) },

    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === 'virus' || cat === 'bacteria') && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    targetResonanceEthr(): string {
      const t = this.store.target as { resonantThresholdVcm?: number }
      if (!t.resonantThresholdVcm) return '—'
      const v = t.resonantThresholdVcm
      return v >= 1000 ? `${(v / 1000).toFixed(1)} kV/cm` : `${v.toFixed(0)} V/cm`
    },

    tipVmSar(): string {
      if (this.isResonanceTarget) {
        return '<strong>Disruption &amp; Thermal (Resonance Mode)</strong>\nT-Disr: target capsid/cell-wall disruption % = (E / E_thr) × L(f, f_res, Q)\nH-Safe: healthy Schwan Vm → 0 at GHz — no coupling, unperturbed\nSAR (W/kg) — Ohmic heating, valid in all modes\n  SAR = σ_i·α²·E²·wf / ρ — use duty cycle to limit thermal load'
      }
      return '<strong>Transmembrane potential and SAR</strong>\nVm — peak voltage across cell membrane (Schwan eq.)\n  Vm = 1.5·E·R / √(1+(2πf·τ)²)\n  τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)\nSAR — specific absorption rate (W/kg) in cell interior\n  SAR = σ_i·α²·E²·wf / ρ  α = 3σ_e/(2σ_e+σ_i) (internal field factor)\n  wf=0.5(CW) or 1.0(pulsed)\n  Proportional to thermal load deposited in the cell'
    },

    therapeuticIndex(): number { return this.store.therapeuticIndex },

    vmSelectivityRatio(): number {
      const hVm = this.store.healthyVm
      if (hVm < 1e-12) return this.store.targetVm > 0 ? 99.9 : 0
      return Math.min(99.9, this.store.targetVm / hVm)
    },

    targetLysisField(): string {
      const vcm = this.store.targetLysisField
      return vcm >= 1000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm.toFixed(0)} V/cm`
    },
    healthyLysisField(): string {
      const vcm = this.store.healthyLysisField
      return vcm >= 1000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm.toFixed(0)} V/cm`
    },

    targetModelWarning(): string | null {
      const cat = this.store.targetCellCategory
      const ti  = this.therapeuticIndex
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const ghzCaveat = ' · f_res from fs-laser experiments (Tsen et al. [10]); RF delivery at GHz is skin-depth limited (~1–2 mm in saline)'
      if (this.store.chartMode === 'resonance' && cat === 'mammalian') {
        return '⚠ Resonance mode has no physical meaning for mammalian cells — they have no rigid protein capsid or peptidoglycan cell wall. Switch back to IRE/Vm mode.'
      }
      if (cat === 'virus') {
        if (t.resonantFreqGHz) {
          return `⚠ IRE model inapplicable for virions (R < 0.1 µm) · Acoustic capsid disruption at ${t.resonantFreqGHz} GHz${ghzCaveat}`
        }
        const tLysis = this.store.targetLysisField
        return `⚠ IRE not applicable to virions — E_lysis ≈ ${(tLysis / 1000).toFixed(0)} kV/cm · Use Resonance mode`
      }
      if (cat === 'bacteria') {
        const tLysis = this.store.targetLysisField
        if (tLysis > 3000) {
          const res = t.resonantFreqGHz ? ` · Resonance mode (${t.resonantFreqGHz} GHz) available${ghzCaveat}` : ''
          return `⚠ E_lysis ≈ ${(tLysis / 1000).toFixed(1)} kV/cm — standard IRE impractical · Consider nsEP (pulse width slider)${res}`
        }
      }
      if (ti > 0 && ti < 0.85) {
        return `⚠ TI = ${ti.toFixed(2)}× — selectivity reversed at DC (τ_T < τ_H) · Short pulses may improve selectivity`
      }
      return null
    },

    showResonanceSwitchBtn(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number }
      return !!(cat === 'virus' || cat === 'bacteria') &&
        !!t.resonantFreqGHz &&
        this.store.chartMode === 'schwan'
    },

    optimalFreqResult(): { khz: number; sel: number } {
      if (this.isResonanceTarget) {
        const t = this.store.target as { resonantFreqGHz?: number }
        const khz = (t.resonantFreqGHz ?? 0) * 1e6
        return { khz, sel: 99.9 }
      }
      const sigma_e = this.store.effectiveSigmaE
      const field   = this.store.fieldIntensity
      const hThr    = this.store.healthy.thresholdVoltage
      const tThr    = this.store.target.thresholdVoltage
      let maxSel = -Infinity, optKhz = 10
      const logMin = Math.log10(10)
      const logMax  = Math.log10(500_000)
      for (let i = 0; i < 300; i++) {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hVm = computeSchwan(this.store.healthy, khz, field, sigma_e)
        const tVm = computeSchwan(this.store.target,  khz, field, sigma_e)
        const hDr = hVm / hThr
        const tDr = tVm / tThr
        const sel  = hDr > 0 ? tDr / hDr : 0
        if (sel > maxSel) { maxSel = sel; optKhz = khz }
      }
      return { khz: optKhz, sel: Math.max(0, maxSel) }
    },

    optimalNote(): string {
      const { khz, sel } = this.optimalFreqResult
      const label = khz >= 1_000_000
        ? `${(khz / 1_000_000).toFixed(2)} GHz`
        : khz >= 1000 ? `${(khz / 1000).toFixed(2)} MHz` : `${khz.toFixed(0)} kHz`
      if (this.isResonanceTarget) {
        return `⭐ f_res: ${label} · ×${sel >= 99 ? '∞' : sel.toFixed(2)} (resonance peak)`
      }
      if (khz > 10000) {
        return `⭐ Optimal: ${label} · ×${sel.toFixed(2)} ↑ beyond slider range`
      }
      return `⭐ Optimal: ${label} · ×${sel.toFixed(2)}`
    },

    tipSelectivity(): string {
      const sel = this.selectivity
      const quality = sel >= 1.5
        ? '<span class="tip-ok">Strong therapeutic window</span>'
        : sel >= 1.0
          ? '<span class="tip-warn">Marginal window — adjust field or preset</span>'
          : '<span class="tip-warn">Non-selective — healthy cells equally at risk</span>'
      const selStr = sel >= 99 ? '∞' : sel.toFixed(3)

      if (this.isResonanceTarget) {
        return `<strong>TI (Therapeutic Index) = Target / Healthy disruption ratio</strong>
Current: <span class="tip-val">×${selStr}</span>

${quality}
≥ 1.5 → strong window (green)  ·  < 1.0 → non-selective (red)

<strong>Resonance mode selectivity:</strong>
Mammalian cells lack rigid-shell resonance — Schwan Vm → 0 at GHz (ωτ ≫ 1).
At f_res(target), healthy disruption ≈ 0 → TI → ∞

<span class="tip-ok">Frequency-selective — healthy tissue unperturbed at GHz fields</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">⚠ Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope has no rigid-shell resonance (Q≈1). f_res/Q/E_thr values are theoretical extrapolations — not experimentally validated.</span>`
      }

      const vmSel = this.vmSelectivityRatio
      const vmStr = vmSel >= 99 ? '∞' : vmSel.toFixed(2)
      return `<strong>TI (Therapeutic Index) = (Vm_T/Vth_T) / (Vm_H/Vth_H)</strong>
Current: <span class="tip-val">×${selStr}</span>

${quality}
≥ 1.5 → strong window (green)
1.0–1.5 → marginal (amber)
< 1.0 → non-selective (red)

TI > 1 → target proportionally closer to lysis threshold than healthy cell.
For adeno/hepatocyte at DC: TI = (15µm×1.1V)/(10µm×0.70V) = <span class="tip-val">2.36×</span>

<strong>Raw Vm selectivity</strong> = Vm_T / Vm_H = R_T/R_H at quasi-DC
Current: <span class="tip-val">×${vmStr}</span>  (cancer/normal DC limit: 1.5×)
TI incorporates lysis thresholds — more clinically relevant than Vm ratio alone.`
    },

    tipModeBadge(): string {
      return `<strong>Therapeutic Mode</strong>
Derived from target + healthy disruption ratios:

<span class="tip-ok">Therapeutic Window</span>  T >85%, H <50%
  Target at lysis threshold · healthy cells safely below 50%

<span class="tip-val">Marginal Window</span>  T >85%, H 50–84%
  Target at threshold but healthy cells are also stressed.
  Reduce field or change frequency/medium for better selectivity.

<span class="tip-val">Approaching Window</span>  T 50–85%
  Increase field to reach therapeutic window

Sub-threshold  T <50%
  Field too low to affect target cells

<span class="tip-warn">Ablative</span>  H >85%
  Non-selective — both cell types at lysis threshold`
    },

    tipOptimal(): string {
      if (this.isResonanceTarget) {
        const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number; capsidQ?: number }
        const fRes = t.resonantFreqGHz ?? 0
        const label = fRes >= 1 ? `${fRes.toFixed(1)} GHz` : `${(fRes * 1000).toFixed(0)} MHz`
        return `<strong>Resonant Frequency — f_res = ${label}</strong>
Acoustic/mechanical resonance: disruption ratio peaks at 1.0 at f_res.
Lorentzian lineshape L(f) = 1 / √(1 + (Q·(f/f₀ − f₀/f))²)

E_threshold = ${t.resonantThresholdVcm} V/cm  ·  Q = ${t.capsidQ ?? 20}
Healthy cells (R ≈ 10 µm) have no GHz resonance → selectivity → ∞

<span class="tip-ok">Click to snap cursor to f_res</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">⚠ Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope — no rigid-shell resonance. Extrapolated values only.</span>`
      }
      const { khz, sel } = this.optimalFreqResult
      const label    = khz >= 1000 ? `${(khz / 1000).toFixed(2)} MHz` : `${khz.toFixed(0)} kHz`
      const cls      = sel >= 1.5 ? 'tip-ok' : sel >= 1.0 ? 'tip-val' : 'tip-warn'
      const beyondRange = khz > 10000
      const snapNote = beyondRange
        ? `<span class="tip-warn">⚠ Optimal is beyond 10 MHz slider cap.\n  Snap sets 10 MHz (best reachable frequency).\n  Bacteria/virus targeting requires >10 MHz RF equipment.</span>`
        : `<span class="tip-ok">Click to snap cursor to this frequency</span>`
      return `<strong>Optimal Broadcast Frequency (Schwan mode)</strong>
Scanned 300 log-spaced points from 10 kHz → 500 MHz.
Maximises target / healthy disruption ratio at current field and medium.

Peak: <span class="${cls}">${label} · ×${sel.toFixed(3)}</span>
${snapNote}

Physics:
  f ≪ fc_T and fc_H : sel = R_T/R_H  (quasi-DC; maximum for cancer/normal pairs)
  When τ_T > τ_H (cancer larger): sel decreases above fc(T) — target rolls off first
  f ≫ fc_H : sel → (R_T·τ_H)/(R_H·τ_T)  — for adeno/hepatocyte ≈ 0.68× (sub-unity)
Note: virion fc ~0.6–0.75 MHz per Schwan model (σ_i-limited; model approximate for virions)`
    },
  },

  methods: {
    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const maxKhz = this.isResonanceTarget ? 50_000_000 : 10_000
      const snapped = Math.round(Math.max(10, Math.min(maxKhz, khz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastFieldParams(snapped, this.store.fieldIntensity, this.store.medium)
    },
  },
})
</script>

<template>
  <div class="sel-panel">
    <div class="sel-panel__title">{{ $t('selectivity.title') }}</div>

    <!-- ── Selectivity ratio + TI ────────────────────────────── -->
    <div class="sel-panel__ratio-wrap" v-tip="tipSelectivity">
      <span class="sel-panel__ratio" :class="selectivityClass">
        ×{{ selectivity.toFixed(2) }}
      </span>
      <div class="sel-panel__ratio-labels">
        <span class="sel-panel__ratio-label">{{ $t('selectivity.ratioLabel') }}</span>
        <span class="sel-panel__ti-label">Vm ×<span>{{ vmSelectivityRatio >= 99 ? '∞' : vmSelectivityRatio.toFixed(2) }}</span></span>
      </div>
    </div>

    <!-- ── Disruption progress bars ──────────────────────────── -->
    <div class="sel-panel__sep"></div>
    <DisruptionBars />

    <!-- ── Vm / Disruption & SAR ─────────────────────────────── -->
    <div class="sel-panel__sep"></div>
    <div class="sel-panel__vm-sar-grid" v-tip="tipVmSar">
      <template v-if="isResonanceTarget">
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--t">{{ $t('selectivity.tDisr') }}</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--t">{{ targetRatioPct.toFixed(1) }}%</span>
          <span class="sel-panel__vs-sar">{{ targetSarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis"
            v-tip="'<strong>' + $t('selectivity.tipEthr') + '</strong>\n' + $t('selectivity.tipEthrBody')"
          >E<sub>thr</sub> {{ targetResonanceEthr }}</span>
        </div>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--h">{{ $t('selectivity.hSafe') }}</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--res">≈0%</span>
          <span class="sel-panel__vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis sel-panel__vs-elysis--safe"
            v-tip="'<strong>' + $t('selectivity.tipNoGhzRes') + '</strong>\n' + $t('selectivity.tipNoGhzResBody')"
          >{{ $t('selectivity.noGhzRes') }}</span>
        </div>
      </template>
      <template v-else>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--t">{{ $t('selectivity.targetBar') }}-Vm</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--t">{{ targetVmMv }} mV</span>
          <span class="sel-panel__vs-sar">{{ targetSarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis" v-tip="'<strong>Target lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nE_lysis = Vm_thr · √(1+(ωτ)²) / (1.5·R)'">E<sub>lys</sub> {{ targetLysisField }}</span>
        </div>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--h">{{ $t('selectivity.healthyBar') }}-Vm</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--h">{{ healthyVmMv }} mV</span>
          <span class="sel-panel__vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis" v-tip="'<strong>Healthy lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nKeep operating field below this value for selective therapy.'">E<sub>lys</sub> {{ healthyLysisField }}</span>
        </div>
      </template>
    </div>

    <!-- ── Mode badge ─────────────────────────────────────────── -->
    <div class="sel-panel__mode-row">
      <span
        class="sel-panel__mode-badge"
        :class="modeBadgeClass"
        v-tip="tipModeBadge"
      >
        {{ modeBadge.label }}
      </span>
      <span
        class="sel-panel__optimal-note sel-panel__optimal-note--snap"
        :class="{ 'sel-panel__optimal-note--beyond': optimalFreqResult.khz > 10000 }"
        @click="snapToOptimal"
        v-tip="tipOptimal"
      >{{ optimalNote }}</span>
    </div>

    <!-- ── Model / selectivity warning ──────────────────────── -->
    <div v-if="targetModelWarning" class="sel-panel__model-warning">
      {{ targetModelWarning }}
      <button
        v-if="showResonanceSwitchBtn"
        class="sel-panel__model-warning-btn"
        @click="store.setChartMode('resonance')"
      >→ Switch to Resonance Mode</button>
    </div>

    <!-- ── Preset selectivity comparison ─────────────────────── -->
    <div class="sel-panel__sep"></div>
    <ComparisonTable />

  </div>
</template>

<style lang="scss">
@keyframes bar-flash {
  from { opacity: 1; }
  to   { opacity: 0.5; }
}

.sel-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  /* ── Section separator ─────────────────────────────────────── */
  &__sep {
    height: 1px;
    background: var(--color-border);
    opacity: 0.5;
    margin: 0.1rem 0;
    flex-shrink: 0;
  }

  /* ── Title ─────────────────────────────────────────────────── */
  &__title {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text);
  }

  /* ── Selectivity ratio ─────────────────────────────────────── */
  &__ratio-wrap {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  &__ratio {
    font-size: 2rem;
    font-weight: 800;
    font-family: var(--font-mono);
    letter-spacing: -0.04em;
    line-height: 1;
    transition: color 0.4s;
    flex-shrink: 0;

    &--strong  { color: var(--color-lime); }
    &--marginal { color: var(--color-amber); }
    &--weak    { color: var(--color-danger); }
  }

  &__ratio-labels {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__ratio-label {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__ti-label {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Disruption bars ───────────────────────────────────────── */
  &__bars { display: flex; flex-direction: column; gap: 0.35rem; }

  &__bar-row { display: flex; align-items: center; gap: 0.5rem; }

  &__bar-label {
    font-size: 0.66rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    width: 1rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;

    &--t    { background: var(--color-danger); }
    &--h    { background: var(--color-primary); }
    &--warn { animation: bar-flash 0.6s ease-in-out infinite alternate; }
  }

  &__bar-val {
    font-size: 0.66rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    width: 2.2rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__bar-plysis {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    width: 2.6rem;
    text-align: right;
    flex-shrink: 0;
    transition: color 0.3s, opacity 0.3s;

    &--high {
      color: var(--color-danger);
      opacity: 1;
      font-weight: 600;
    }
  }

  /* ── Nuclear envelope bars (double-shell) ──────────────────── */
  &__nuc-section {
    margin-top: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: rgba(167, 139, 250, 0.05);
    border-left: 2px solid rgba(167, 139, 250, 0.3);
    border-radius: 0 4px 4px 0;
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  &__nuc-bar-row { display: flex; align-items: center; gap: 0.5rem; }

  &__nuc-bar-label {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: #a78bfa;
    width: 3rem;
    flex-shrink: 0;
  }

  &__nuc-bar-track {
    flex: 1;
    height: 3px;
    background: rgba(167, 139, 250, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }

  &__nuc-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;

    &--t    { background: #a78bfa; }
    &--h    { background: rgba(0, 212, 255, 0.7); }
    &--warn { background: #ff4d6d !important; animation: bar-flash 0.6s ease-in-out infinite alternate; }
  }

  &__nuc-bar-val {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: #a78bfa;
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__nuc-sel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.15rem;
    border-top: 1px solid rgba(167, 139, 250, 0.12);
    margin-top: 0.05rem;
  }

  &__nuc-sel-label { font-size: 0.58rem; color: rgba(167, 139, 250, 0.7); }

  &__nuc-sel-val {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    font-weight: 600;
    color: #a78bfa;
  }

  &__nuc-sel--good { color: #4ade80; }
  &__nuc-sel--ok   { color: #fbbf24; }
  &__nuc-sel--low  { color: #ff4d6d; }

  /* ── Vm / SAR readout ──────────────────────────────────────── */
  &__vm-sar-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.45rem 0.65rem;
    cursor: default;
  }

  &__vm-sar-cell { display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap; }

  &__vs-type {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    font-weight: 700;
    opacity: 0.85;
    flex-shrink: 0;

    &--t { color: var(--color-danger); }
    &--h { color: var(--color-primary); }
  }

  &__vs-vm {
    font-size: 0.9rem;
    font-family: var(--font-mono);
    font-weight: 700;
    line-height: 1;

    &--t   { color: var(--color-danger); }
    &--h   { color: var(--color-primary); }
    &--res { color: var(--color-lime); }
  }

  &__vs-sar {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.85;
    white-space: nowrap;
  }

  &__vs-elysis {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    white-space: nowrap;
    cursor: default;

    &--safe { color: var(--color-lime); }
  }

  /* ── Mode badge ────────────────────────────────────────────── */
  &__mode-row { display: flex; flex-direction: column; gap: 0.35rem; }

  &__mode-badge {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.2rem 0.55rem;
    border-radius: 3px;
    border: 1px solid transparent;
    align-self: flex-start;
    transition: color 0.3s, border-color 0.3s;

    &--therapeutic { color: var(--color-lime);    border-color: rgba(57, 255, 20, 0.33); }
    &--ablative    { color: var(--color-danger);  border-color: rgba(255, 77, 109, 0.33); }
    &--marginal    { color: var(--color-amber);   border-color: rgba(251, 191, 36, 0.33); }
    &--approaching { color: var(--color-amber);   border-color: rgba(251, 191, 36, 0.33); }
    &--subthreshold { color: var(--color-primary); border-color: rgba(0, 212, 255, 0.33); }
  }

  /* ── Optimal note ──────────────────────────────────────────── */
  &__optimal-note {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.85;
    line-height: 1.5;

    &--snap {
      cursor: pointer;
      color: var(--color-amber);
      opacity: 1;
      transition: opacity 0.15s, color 0.2s;

      &:hover { opacity: 0.75; }
    }

    &--beyond {
      color: var(--color-text-muted);
      opacity: 0.7;

      &:hover { opacity: 0.55; }
    }
  }

  /* ── Model warning ─────────────────────────────────────────── */
  &__model-warning {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-amber);
    background: rgba(251, 191, 36, 0.07);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: var(--radius);
    padding: 0.3rem 0.55rem;
    line-height: 1.55;
  }

  &__model-warning-btn {
    display: block;
    margin-top: 0.4rem;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.4);
    border-radius: 3px;
    color: var(--color-amber);
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: rgba(251, 191, 36, 0.22);
      border-color: rgba(251, 191, 36, 0.65);
    }
  }

  /* ── Comparison table ──────────────────────────────────────── */
  &__comparison-table { display: flex; flex-direction: column; gap: 0.18rem; }

  &__cmp-row {
    display: grid;
    grid-template-columns: 3.2rem 1fr 2.8rem;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0.2rem;
    border-radius: 3px;
    transition: background 0.1s;

    &--active { background: rgba(255, 255, 255, 0.05); }
  }

  &__cmp-name {
    font-size: 0.56rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--gc, var(--color-text));
  }

  &__cmp-bar-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  &__cmp-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;

    &.sel-panel__cmp--strong  { background: var(--color-lime); }
    &.sel-panel__cmp--marginal { background: var(--color-amber); }
    &.sel-panel__cmp--weak    { background: var(--color-danger); }
  }

  &__cmp-sel {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    font-weight: 600;
    text-align: right;

    &.sel-panel__cmp--strong  { color: var(--color-lime); }
    &.sel-panel__cmp--marginal { color: var(--color-amber); }
    &.sel-panel__cmp--weak    { color: var(--color-danger); }
  }

  /* ── Library sections ──────────────────────────────────────── */
  &__library { display: flex; flex-direction: column; gap: 0.4rem; }

  &__lib-title {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-heading);
    opacity: 0.9;
    margin-bottom: 0.1rem;
  }

  &__lib-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }

  &__lib-group-label {
    font-size: 0.55rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.9;
    color: var(--pill-c, var(--color-text-muted));
  }

  &__lib-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }

  &__preset-pill {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    padding: 0.18rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    white-space: nowrap;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }

    &--active {
      background-color: rgba(255, 255, 255, 0.05);
      border-color: var(--pill-c, var(--color-primary));
      color: var(--pill-c, var(--color-primary));
    }
  }
}
</style>
