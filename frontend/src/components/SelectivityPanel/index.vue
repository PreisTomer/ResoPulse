<template>
  <div class="sel-panel">

    <!-- ── Accordion toggle ─────────────────────────────────── -->
    <button class="sel-panel__toggle" @click="open = !open">
      <span class="sel-panel__toggle-left">
        <span class="sel-panel__toggle-icon">⊕</span>
        <span class="sel-panel__toggle-title">{{ $t('selectivity.title') }}</span>
        <span class="sel-panel__toggle-sub">{{ toggleSubtitle }}</span>
      </span>
      <span class="sel-panel__chevron" :class="{ 'sel-panel__chevron--open': open }">›</span>
    </button>

    <div v-show="open">

    <!-- ── Selectivity ratio + TI ────────────────────────────── -->
    <div class="sel-panel__ratio-wrap" v-tip="tipSelectivity">
      <span class="sel-panel__ratio" :class="selectivityClass">
        ×{{ selectivity.toFixed(2) }}
      </span>
      <div class="sel-panel__ratio-labels">
        <span class="sel-panel__ratio-label">{{ $t('selectivity.ratioLabel') }}</span>
        <span class="sel-panel__ti-label">Vm ×<span>{{ vmSelectivityRatio >= 99 ? ICON.INFINITY : vmSelectivityRatio.toFixed(2) }}</span></span>
      </div>
    </div>
    <!-- ── σ_i uncertainty band on TI (Schwan mode only) ─────── -->
    <div
      v-if="showTiUncertainty"
      class="sel-panel__ti-range"
      v-tip="tipTiRange"
    >
      <span class="sel-panel__ti-range-label">σ_i range:</span>
      <span class="sel-panel__ti-range-val">
        [×{{ tiRange.low.toFixed(2) }} – ×{{ tiRange.high >= 99 ? ICON.INFINITY : tiRange.high.toFixed(2) }}]
      </span>
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
          <span class="sel-panel__vs-elysis" v-tip="tipEthr">E<sub>thr</sub> {{ targetResonanceEthr }}</span>
        </div>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--h">{{ $t('selectivity.hSafe') }}</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--res">≈0%</span>
          <span class="sel-panel__vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis sel-panel__vs-elysis--safe" v-tip="tipNoGhzRes">{{ $t('selectivity.noGhzRes') }}</span>
        </div>
      </template>
      <template v-else>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--t">{{ $t('selectivity.targetBar') }}-Vm</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--t">{{ targetVmMv }} mV</span>
          <span class="sel-panel__vs-sar">{{ targetSarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis" v-tip="tipTargetLysisField">E<sub>lys</sub> {{ targetLysisField }}</span>
        </div>
        <div class="sel-panel__vm-sar-cell">
          <span class="sel-panel__vs-type sel-panel__vs-type--h">{{ $t('selectivity.healthyBar') }}-Vm</span>
          <span class="sel-panel__vs-vm sel-panel__vs-vm--h">{{ healthyVmMv }} mV</span>
          <span class="sel-panel__vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="sel-panel__vs-elysis" v-tip="tipHealthyLysisField">E<sub>lys</sub> {{ healthyLysisField }}</span>
        </div>
      </template>
    </div>

    <!-- ── Resonance physics info (resonance mode only) ─────────── -->
    <div v-if="isResonanceTarget && store.chartMode === CHART_MODE.RESONANCE" class="sel-panel__resonance-info">
      <div class="sel-panel__res-title">RESONANCE PARAMETERS</div>
      <div class="sel-panel__res-row" v-tip="tipSkinDepth">
        <span class="sel-panel__res-label">δ skin depth</span>
        <span class="sel-panel__res-val" :class="skinDepthClass">{{ skinDepthLabel }}</span>
        <span class="sel-panel__res-note">at {{ freqDisplayLabel }}</span>
      </div>
      <div class="sel-panel__res-row" v-tip="tipFresRange">
        <span class="sel-panel__res-label">f_res range</span>
        <span class="sel-panel__res-val">{{ resonantFreqRange }}</span>
      </div>
      <div v-if="resonantQRange" class="sel-panel__res-row" v-tip="tipQFactor">
        <span class="sel-panel__res-label">Q range</span>
        <span class="sel-panel__res-val">{{ resonantQRange }}</span>
      </div>
      <div class="sel-panel__res-row" v-tip="tipBasis">
        <span class="sel-panel__res-label">Basis</span>
        <span class="sel-panel__res-badge" :class="experimentalBasisClass">{{ experimentalBasisLabel }}</span>
      </div>
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
        @click="store.setChartMode(CHART_MODE.RESONANCE)"
      >→ Switch to Resonance Mode</button>
    </div>

    <!-- ── Preset selectivity comparison ─────────────────────── -->
    <div class="sel-panel__sep"></div>
    <ComparisonTable />

    </div><!-- /v-show="open" -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { THRESHOLDS, DISRUPTION_WARN_THRESHOLD } from '@/constants/cellCard'
import { CELL_CATEGORY, CHART_MODE, EXPERIMENTAL_BASIS } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
import { broadcastFieldParams } from '@/services/socket'
import DisruptionBars from './DisruptionBars.vue'
import ComparisonTable from './ComparisonTable.vue'
import PresetLibrary from './PresetLibrary.vue'

export default defineComponent({
  components: { DisruptionBars, ComparisonTable, PresetLibrary },

  setup() {
    return { store: useCellStore(), CHART_MODE, ICON }
  },

  data() {
    return { open: true }
  },

  computed: {
    toggleSubtitle(): string {
      const sel = this.store.selectivityRatio
      const selStr = sel >= 99 ? ICON.INFINITY : `×${sel.toFixed(2)}`
      return `TI ${selStr} · ${this.modeBadge.label}`
    },
    selectivity(): number    { return this.store.selectivityRatio },
    targetRatio(): number    { return this.store.targetDisruptionRatio },
    targetRatioPct(): number { return Math.min(100, this.targetRatio * 100) },

    selectivityClass(): string {
      if (this.selectivity >= THRESHOLDS.SEL_STRONG)   return 'sel-panel__ratio--strong'
      if (this.selectivity >= THRESHOLDS.SEL_MARGINAL) return 'sel-panel__ratio--marginal'
      return 'sel-panel__ratio--weak'
    },

    modeBadge(): { label: string } {
      const t = this.targetRatio
      const h = this.store.healthyDisruptionRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)                                          return { label: this.$t('selectivity.modeAblative')    }
      if (t >= DISRUPTION_WARN_THRESHOLD && h < THRESHOLDS.HEALTHY_APPROACHING)   return { label: this.$t('selectivity.modeTherapeutic') }
      if (t >= DISRUPTION_WARN_THRESHOLD)                                          return { label: this.$t('selectivity.modeMarginal')    }
      if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                     return { label: this.$t('selectivity.modeApproaching') }
      return                                                                               { label: this.$t('selectivity.modeSubThreshold') }
    },

    modeBadgeClass(): string {
      const t = this.targetRatio, h = this.store.healthyDisruptionRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)                                        return 'sel-panel__mode-badge--ablative'
      if (t >= DISRUPTION_WARN_THRESHOLD && h < THRESHOLDS.HEALTHY_APPROACHING) return 'sel-panel__mode-badge--therapeutic'
      if (t >= DISRUPTION_WARN_THRESHOLD)                                        return 'sel-panel__mode-badge--marginal'
      if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                   return 'sel-panel__mode-badge--approaching'
      return                                                                             'sel-panel__mode-badge--subthreshold'
    },

    targetVmMv(): string  { return (this.store.targetVm  * 1000).toFixed(1) },
    healthyVmMv(): string { return (this.store.healthyVm * 1000).toFixed(1) },
    targetSarVal(): string  { return this.store.targetSAR.toFixed(1)  },
    healthySarVal(): string { return this.store.healthySAR.toFixed(1) },

    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    targetResonanceEthr(): string {
      const t = this.store.target as { resonantThresholdVcm?: number }
      if (!t.resonantThresholdVcm) return '—'
      return formatFieldVcm(t.resonantThresholdVcm)
    },

    tipVmSar(): string {
      if (this.isResonanceTarget) {
        return '<strong>Disruption &amp; Thermal (Resonance Mode)</strong>\nT-Disr: target capsid/cell-wall disruption % = (E / E_thr) × L(f, f_res, Q)\nH-Safe: healthy Schwan Vm → 0 at GHz — no coupling, unperturbed\nSAR (W/kg) — Ohmic heating, valid in all modes\n  SAR = σ_i·α²·E²·wf / ρ — use duty cycle to limit thermal load'
      }
      return '<strong>Transmembrane potential and SAR</strong>\nVm — peak voltage across cell membrane (Schwan eq.)\n  Vm = 1.5·E·R / √(1+(2πf·τ)²)\n  τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)\nSAR — specific absorption rate (W/kg) in cell interior\n  SAR = σ_i·α²·E²·wf / ρ  α = 3σ_e/(2σ_e+σ_i) (internal field factor)\n  wf=0.5(CW) or 1.0(pulsed)\n  Proportional to thermal load deposited in the cell'
    },

    therapeuticIndex(): number { return this.store.therapeuticIndex },

    tiRange(): { low: number; high: number } { return this.store.tiUncertaintyRange },

    showTiUncertainty(): boolean {
      // Only meaningful in Schwan mode (resonance mode uses Q-range in the resonance info section)
      return this.store.chartMode !== 'resonance' && Math.abs(this.tiRange.high - this.tiRange.low) > 0.01
    },

    tipTiRange(): string {
      const { low, high } = this.tiRange
      const uncH = this.store.healthy.radius < 2.0 ? '35%' : '20%'
      const uncT = this.store.target.radius < 0.1 ? '45%' : this.store.target.radius < 2.0 ? '35%' : '20%'
      return `<strong>TI Uncertainty from σ_i Variability</strong>
TI_low  = ×${low.toFixed(2)} (worst case: target σ_i at −${uncT}, healthy at +${uncH})
TI_high = ×${high >= 99 ? '∞' : high.toFixed(2)} (best case: target σ_i at +${uncT}, healthy at −${uncH})

σ_i (cytoplasm conductivity) is a literature range, not a single measured value.
Variability: healthy (±${uncH}) · target (±${uncT})
These bounds propagate through τ → fc → Vm → DR → TI.

<span class="tip-note">A wide uncertainty band means the TI claim depends strongly on
the exact σ_i value used. Validate with measured cell impedance (patch clamp / DEP).</span>`
    },

    vmSelectivityRatio(): number {
      const hVm = this.store.healthyVm
      if (hVm < 1e-12) return this.store.targetVm > 0 ? 99.9 : 0
      return Math.min(99.9, this.store.targetVm / hVm)
    },

    targetLysisField(): string { return formatFieldVcm(this.store.targetLysisField) },
    healthyLysisField(): string { return formatFieldVcm(this.store.healthyLysisField) },

    targetModelWarning(): string | null {
      const cat = this.store.targetCellCategory
      const ti  = this.therapeuticIndex
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const ghzCaveat = ' · f_res from fs-laser experiments (Tsen et al. [10]); RF delivery at GHz is skin-depth limited (~4–13 mm in saline at 1–12 GHz)'
      if (this.store.chartMode === CHART_MODE.RESONANCE && cat === CELL_CATEGORY.MAMMALIAN) {
        return `${ICON.WARNING} Resonance mode has no physical meaning for mammalian cells — they have no rigid protein capsid or peptidoglycan cell wall. Switch back to IRE/Vm mode.`
      }
      if (cat === CELL_CATEGORY.VIRUS) {
        if (t.resonantFreqGHz) {
          return `${ICON.WARNING} IRE model inapplicable for virions (R < 0.1 µm) · Acoustic capsid disruption at ${t.resonantFreqGHz} GHz${ghzCaveat}`
        }
        const tLysis = this.store.targetLysisField
        return `${ICON.WARNING} IRE not applicable to virions — E_lysis ≈ ${(tLysis / 1000).toFixed(0)} kV/cm · Use Resonance mode`
      }
      if (cat === CELL_CATEGORY.BACTERIA) {
        const tLysis = this.store.targetLysisField
        if (tLysis > 3000) {
          const res = t.resonantFreqGHz ? ` · Resonance mode (${t.resonantFreqGHz} GHz) available${ghzCaveat}` : ''
          return `${ICON.WARNING} E_lysis ≈ ${(tLysis / 1000).toFixed(1)} kV/cm — standard IRE impractical · Consider nsEP (pulse width slider)${res}`
        }
      }
      if (ti > 0 && ti < 0.85) {
        return `${ICON.WARNING} TI = ${ti.toFixed(2)}× — selectivity reversed at DC (τ_T < τ_H) · Short pulses may improve selectivity`
      }
      return null
    },

    showResonanceSwitchBtn(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number }
      return !!(cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        !!t.resonantFreqGHz &&
        this.store.chartMode === CHART_MODE.SCHWAN
    },

    optimalFreqResult(): { khz: number; sel: number } {
      return this.store.optimalFreqResult
    },

    optimalNote(): string {
      const { khz, sel } = this.optimalFreqResult
      const label = formatFreqKHz(khz)
      if (this.isResonanceTarget) {
        return `${ICON.STAR} f_res: ${label} · ×${sel >= 99 ? ICON.INFINITY : sel.toFixed(2)} (resonance peak)`
      }
      if (khz > 10000) {
        return `${ICON.STAR} Optimal: ${label} · ×${sel.toFixed(2)} ${ICON.BEYOND}`
      }
      return `${ICON.STAR} Optimal: ${label} · ×${sel.toFixed(2)}`
    },

    skinDepthMm(): number { return this.store.skinDepthMm },

    skinDepthLabel(): string {
      const d = this.skinDepthMm
      if (!isFinite(d)) return ICON.INFINITY
      return d >= 10 ? `${d.toFixed(0)} mm` : `${d.toFixed(1)} mm`
    },

    skinDepthClass(): string {
      const d = this.skinDepthMm
      if (d >= 20) return 'sel-panel__res-depth--deep'    // ≥20 mm — tissue-penetrating
      if (d >= 5)  return 'sel-panel__res-depth--medium'  // 5–20 mm — cm-depth accessible
      return 'sel-panel__res-depth--shallow'              // <5 mm — near-surface / intracavitary
    },

    freqDisplayLabel(): string {
      return formatFreqKHz(this.store.currentBroadcastFrequency)
    },

    resonantFreqRange(): string {
      const t = this.store.target
      const f0 = t.resonantFreqGHz
      const pct = t.resonantFreqUncertaintyPct
      if (!f0) return '—'
      const label = (ghz: number) => formatFreqKHz(ghz * 1e6)
      if (!pct) return label(f0)
      const lo = f0 * (1 - pct / 100)
      const hi = f0 * (1 + pct / 100)
      return `${label(lo)} – ${label(hi)}`
    },

    resonantQRange(): string {
      const t = this.store.target
      if (t.capsidQMin !== undefined && t.capsidQMax !== undefined) {
        return `${t.capsidQMin} – ${t.capsidQMax}  (nominal Q = ${t.capsidQ ?? '?'})`
      }
      if (t.capsidQ !== undefined) return `${t.capsidQ}`
      return ''
    },

    experimentalBasisLabel(): string {
      switch (this.store.target.experimentalBasis) {
        case EXPERIMENTAL_BASIS.LASER_VALIDATED: return 'LASER-VALIDATED'
        case EXPERIMENTAL_BASIS.RF_EXTRAPOLATED: return 'RF-EXTRAPOLATED'
        case EXPERIMENTAL_BASIS.SPECULATIVE:     return 'SPECULATIVE'
        default: return 'UNCLASSIFIED'
      }
    },

    experimentalBasisClass(): string {
      switch (this.store.target.experimentalBasis) {
        case EXPERIMENTAL_BASIS.LASER_VALIDATED: return 'sel-panel__res-badge--validated'
        case EXPERIMENTAL_BASIS.RF_EXTRAPOLATED: return 'sel-panel__res-badge--extrapolated'
        default:                                  return 'sel-panel__res-badge--speculative'
      }
    },

    tipEthr(): string {
      return `<strong>${this.$t('selectivity.tipEthr')}</strong>\n${this.$t('selectivity.tipEthrBody')}`
    },

    tipNoGhzRes(): string {
      return `<strong>${this.$t('selectivity.tipNoGhzRes')}</strong>\n${this.$t('selectivity.tipNoGhzResBody')}`
    },

    tipTargetLysisField(): string {
      return `<strong>Target lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nE_lysis = Vm_thr · √(1+(ωτ)²) / (1.5·R)`
    },

    tipHealthyLysisField(): string {
      return `<strong>Healthy lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nKeep operating field below this value for selective therapy.`
    },

    tipSkinDepth(): string {
      return `<strong>EM Skin Depth</strong>\nδ = √(1/(π·f·μ₀·σ_e))\nDepth at which field amplitude decays to 1/e (~37%) in saline (σ_e = 1.5 S/m).\n  100 MHz → 41 mm  ·  1 GHz → 13 mm  ·  5 GHz → 5.8 mm  ·  12 GHz → 3.8 mm\n≥20 mm: tissue-penetrating · 5–20 mm: cm-depth accessible · <5 mm: near-surface / intracavitary.\nIn vivo GHz resonance delivery requires near-field or intracavitary applicators.\nRef: Gabriel et al. (1996) Phys. Med. Biol. 41:2271`
    },

    tipFresRange(): string {
      return `<strong>f_res Uncertainty Range</strong>\nf_res = v_sound / (2R) — uncertainty driven by v_sound literature range.\nBacteria peptidoglycan: v_wall ≈ 800–1200 m/s → ±25–30%.\nEnveloped viruses: v_eff poorly defined → ±40%.\nTune frequency experimentally within this range.`
    },

    tipQFactor(): string {
      return `<strong>Q-Factor Uncertainty</strong>\nMechanical quality factor Q sets the resonance linewidth.\nLower Q → broader resonance → easier frequency matching but weaker peak amplitude.\nDykeman & Sankey (2010) validated Q on rigid icosahedral protein capsids only.\nBacterial peptidoglycan and viral lipid envelopes have substantially lower Q.`
    },

    tipBasis(): string {
      return `<strong>Experimental Basis</strong>\nLASER-VALIDATED: capsid disruption confirmed by pulsed laser acoustic excitation (Tsen 2007–2012).\nRF-EXTRAPOLATED: acoustic mechanism plausible for rigid walls; GHz RF delivery is not yet experimentally validated — laser experiments only.\nSPECULATIVE: enveloped viruses / peptidoglycan — no experimental validation of resonance disruption by any method.\nRef: Tsen et al. (2007) Biophys. J.; Dykeman &amp; Sankey (2010) Phys. Rev. Lett.`
    },

    tipSelectivity(): string {
      const sel = this.selectivity
      const { SEL_STRONG: ss, SEL_MARGINAL: sm } = THRESHOLDS
      const quality = sel >= ss
        ? '<span class="tip-ok">Strong therapeutic window</span>'
        : sel >= sm
          ? '<span class="tip-warn">Marginal window — adjust field or preset</span>'
          : '<span class="tip-warn">Non-selective — healthy cells equally at risk</span>'
      const selStr = sel >= 99 ? ICON.INFINITY : sel.toFixed(2)

      if (this.isResonanceTarget) {
        return `<strong>TI (Therapeutic Index) = Target / Healthy disruption ratio</strong>
Current: <span class="tip-val">×${selStr}</span>

${quality}
≥ ${ss} → strong window (green)  ·  < ${sm} → non-selective (red)

<strong>Resonance mode selectivity:</strong>
Mammalian cells lack rigid-shell resonance — Schwan Vm → 0 at GHz (ωτ ≫ 1).
At f_res(target), healthy disruption ≈ 0 → TI → ∞

<span class="tip-ok">Frequency-selective — healthy tissue unperturbed at GHz fields</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">${ICON.WARNING} Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope has no rigid-shell resonance (Q≈1). f_res/Q/E_thr values are theoretical extrapolations — not experimentally validated.</span>`
      }

      const vmSel = this.vmSelectivityRatio
      const vmStr = vmSel >= 99 ? ICON.INFINITY : vmSel.toFixed(2)
      return `<strong>TI (Therapeutic Index) = (Vm_T/Vth_T) / (Vm_H/Vth_H)</strong>
Current: <span class="tip-val">×${selStr}</span>

${quality}
≥ ${ss} → strong window (green)
${sm}–${ss} → marginal (amber)
< ${sm} → non-selective (red)

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
        const label = formatFreqKHz(fRes * 1e6)
        return `<strong>Resonant Frequency — f_res = ${label}</strong>
Acoustic/mechanical resonance: disruption ratio peaks at 1.0 at f_res.
Lorentzian lineshape L(f) = 1 / √(1 + (Q·(f/f₀ − f₀/f))²)

E_threshold = ${t.resonantThresholdVcm} V/cm  ·  Q = ${t.capsidQ ?? 20}
Healthy cells (R ≈ 10 µm) have no GHz resonance → selectivity → ${ICON.INFINITY}

<span class="tip-ok">Click to snap cursor to f_res</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">${ICON.WARNING} Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope — no rigid-shell resonance. Extrapolated values only.</span>`
      }
      const { khz, sel } = this.optimalFreqResult
      const label    = formatFreqKHz(khz)
      const cls      = sel >= 1.5 ? 'tip-ok' : sel >= 1.0 ? 'tip-val' : 'tip-warn'
      const beyondRange = khz > 10000
      const snapNote = beyondRange
        ? `<span class="tip-warn">${ICON.WARNING} Optimal is beyond 10 MHz slider cap.\n  Snap sets 10 MHz (best reachable frequency).\n  Bacteria/virus targeting requires >10 MHz RF equipment.</span>`
        : `<span class="tip-ok">Click to snap cursor to this frequency</span>`
      return `<strong>Optimal Broadcast Frequency (Schwan mode)</strong>
Scanned 300 log-spaced points from 10 kHz → 500 MHz.
Maximises target / healthy disruption ratio at current field and medium.

Peak: <span class="${cls}">${label} · ×${sel.toFixed(2)}</span>
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

  /* ── Accordion toggle ──────────────────────────────────────── */
  &__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    padding: 0.5rem 0 0.5rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    gap: 0.5rem;

    &:hover .sel-panel__toggle-title { color: var(--color-primary); }
  }

  &__toggle-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  &__toggle-icon {
    font-size: 0.75rem;
    color: var(--color-primary);
    flex-shrink: 0;
    opacity: 0.7;
  }

  &__toggle-title {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text);
    flex-shrink: 0;
    transition: color 0.15s;
  }

  &__toggle-sub {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__chevron {
    font-size: 1rem;
    color: var(--color-text-muted);
    opacity: 0.5;
    flex-shrink: 0;
    transition: transform 0.2s;
    transform: rotate(0deg);

    &--open { transform: rotate(90deg); }
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

  &__ti-range {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: -0.3rem;
  }

  &__ti-range-label {
    font-size: 0.56rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  &__ti-range-val {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
    cursor: help;
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

  /* ── Resonance physics info ────────────────────────────────── */
  &__resonance-info {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    padding: 0.4rem 0.6rem;
    background: rgba(0, 212, 255, 0.04);
    border: 1px solid rgba(0, 212, 255, 0.15);
    border-radius: var(--radius);
  }

  &__res-title {
    font-size: 0.53rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    opacity: 0.7;
    margin-bottom: 0.05rem;
  }

  &__res-row {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
    cursor: default;
  }

  &__res-label {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 5.5rem;
    flex-shrink: 0;
  }

  &__res-val {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-text);

    &--deep    { color: var(--color-lime); }
    &--medium  { color: var(--color-amber); }
    &--shallow { color: var(--color-danger); }
  }

  &__res-note {
    font-size: 0.55rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.65;
  }

  &__res-badge {
    font-size: 0.55rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
    border: 1px solid;

    &--validated    { color: var(--color-lime);   border-color: rgba(57, 255, 20, 0.3);   background: rgba(57, 255, 20, 0.06); }
    &--extrapolated { color: var(--color-amber);  border-color: rgba(251, 191, 36, 0.3);  background: rgba(251, 191, 36, 0.06); }
    &--speculative  { color: var(--color-danger); border-color: rgba(255, 77, 109, 0.3);  background: rgba(255, 77, 109, 0.06); }
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
