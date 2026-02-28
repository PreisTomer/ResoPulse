<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '../constants/cellLibrary'
import type { CellGroup } from '../constants/cellLibrary'
import { DISRUPTION_WARN_THRESHOLD } from '../constants/cellCard'
import { MEDIA } from '../mockData'
import { computeSchwan, computeTau, computePulseStepResponse, computeResonantDisruption } from '../utils/physics'
import { broadcastFieldParams } from '../services/socket'
import { SELECTIVITY_COLORS } from '../theme/colors'

const TARGET_GROUPS: CellGroup[] = ['cancer', 'bacteria', 'virus']
const HEALTHY_GROUP: CellGroup = 'reference'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, SELECTIVITY_COLORS }
  },

  computed: {
    selectivity(): number    { return this.store.selectivityRatio },
    targetRatio(): number    { return this.store.targetDisruptionRatio },
    healthyRatio(): number   { return this.store.healthyDisruptionRatio },
    targetRatioPct(): number { return Math.min(100, this.targetRatio * 100) },
    healthyRatioPct(): number { return Math.min(100, this.healthyRatio * 100) },

    /** CSS class name for selectivity-dependent color (sel-ratio, cmp-bar, cmp-sel) */
    selectivityClass(): string {
      if (this.selectivity >= 1.5) return 'sel--strong'
      if (this.selectivity >= 1.0) return 'sel--marginal'
      return 'sel--weak'
    },

    modeBadge(): { label: string } {
      const t = this.targetRatio
      const h = this.healthyRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)            return { label: this.$t('selectivity.modeAblative')    }
      if (t >= DISRUPTION_WARN_THRESHOLD && h < 0.5) return { label: this.$t('selectivity.modeTherapeutic') }
      if (t >= DISRUPTION_WARN_THRESHOLD)            return { label: this.$t('selectivity.modeMarginal')    }
      if (t >= 0.5)                                  return { label: this.$t('selectivity.modeApproaching') }
      return                                                { label: this.$t('selectivity.modeSubThreshold') }
    },

    /** CSS class for mode badge border + color */
    modeBadgeClass(): string {
      const t = this.targetRatio, h = this.healthyRatio
      if (h >= DISRUPTION_WARN_THRESHOLD)            return 'badge--ablative'
      if (t >= DISRUPTION_WARN_THRESHOLD && h < 0.5) return 'badge--therapeutic'
      if (t >= DISRUPTION_WARN_THRESHOLD)            return 'badge--marginal'
      if (t >= 0.5)                                  return 'badge--approaching'
      return                                                'badge--subthreshold'
    },

    targetGroups(): CellGroup[] { return TARGET_GROUPS },
    healthyPresets() {
      return CELL_PRESETS.filter((p) => p.group === HEALTHY_GROUP)
    },
    presetsByGroup(): Record<CellGroup, typeof CELL_PRESETS> {
      const out: Partial<Record<CellGroup, typeof CELL_PRESETS>> = {}
      for (const g of TARGET_GROUPS) {
        out[g] = CELL_PRESETS.filter((p) => p.group === g)
      }
      return out as Record<CellGroup, typeof CELL_PRESETS>
    },
    activeTargetId(): string { return this.store.target.id },
    activeHealthyId(): string { return this.store.healthy.id },

    targetVmMv(): string  { return (this.store.targetVm  * 1000).toFixed(2) },
    healthyVmMv(): string { return (this.store.healthyVm * 1000).toFixed(2) },
    targetSarVal(): string  { return this.store.targetSAR.toFixed(3)  },
    healthySarVal(): string { return this.store.healthySAR.toFixed(3) },

    /** True when the active target uses the acoustic resonance model (bacteria/virus with resonance params). */
    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === 'virus' || cat === 'bacteria') && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    /** Formatted E_threshold for resonance target display. */
    targetResonanceEthr(): string {
      const t = this.store.target as { resonantThresholdVcm?: number }
      if (!t.resonantThresholdVcm) return '—'
      const v = t.resonantThresholdVcm
      return v >= 1000 ? `${(v / 1000).toFixed(1)} kV/cm` : `${v.toFixed(0)} V/cm`
    },

    /** Mode-aware tooltip for the Vm / SAR readout grid. */
    tipVmSar(): string {
      if (this.isResonanceTarget) {
        return '<strong>Disruption &amp; Thermal (Resonance Mode)</strong>\nT-Disr: target capsid/cell-wall disruption % = (E / E_thr) × L(f, f_res, Q)\nH-Safe: healthy Schwan Vm → 0 at GHz — no coupling, unperturbed\nSAR (W/kg) — Ohmic heating, valid in all modes\n  SAR = σ_i·α²·E²·wf / ρ — use duty cycle to limit thermal load'
      }
      return '<strong>Transmembrane potential and SAR</strong>\nVm — peak voltage across cell membrane (Schwan eq.)\n  Vm = 1.5·E·R / √(1+(2πf·τ)²)\n  τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)\nSAR — specific absorption rate (W/kg) in cell interior\n  SAR = σ_i·α²·E²·wf / ρ  α = 3σ_e/(2σ_e+σ_i) (internal field factor)\n  wf=0.5(CW) or 1.0(pulsed)\n  Proportional to thermal load deposited in the cell'
    },

    /** Category-aware label for the comparison section. */
    presetCompTitleDynamic(): string {
      const cat = this.store.targetCellCategory
      if (cat === 'bacteria') return 'Alternative Bacteria'
      if (cat === 'virus')    return 'Alternative Viruses'
      return 'Alternative Cancer Targets'
    },

    presetComparison() {
      const sigma_e = MEDIA[this.store.medium].conductivity
      const freq    = this.store.currentBroadcastFrequency
      const field   = this.store.fieldIntensity
      const pulsed  = this.store.waveform === 'pulsed'
      const pulseNs = this.store.pulseWidthNs

      // Only compare presets in the same category as the active target
      const cat = this.store.targetCellCategory
      const relevantGroup = cat === 'mammalian' ? 'cancer' : cat  // 'bacteria' | 'virus'

      // Healthy cell — Schwan Vm × pulse step factor → disruption ratio
      const hVm_dc  = computeSchwan(this.store.healthy, freq, field, sigma_e)
      const hTau    = computeTau(this.store.healthy, sigma_e)
      const hFactor = pulsed ? computePulseStepResponse(hTau, pulseNs) : 1.0
      const hVm     = hVm_dc * hFactor
      const hDr     = hVm / this.store.healthy.thresholdVoltage  // healthy disruption ratio

      return CELL_PRESETS
        .filter((p) => p.group === relevantGroup)
        .map((p) => {
          const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
          const hasRes = (p.group === 'bacteria' || p.group === 'virus') && !!pr.resonantFreqGHz && !!pr.resonantThresholdVcm
          let sel: number, tVmMv: string

          if (hasRes) {
            // Acoustic resonance model: disruption ratio for bacteria/virus
            const ratio = computeResonantDisruption(
              pr.resonantFreqGHz!,
              pr.capsidQ ?? 20,
              pr.resonantThresholdVcm!,
              freq * 1e3,   // kHz → Hz
              field,
            )
            sel = hDr > 1e-9 ? Math.min(99.9, ratio / hDr) : (ratio > 0 ? 99.9 : 0)
            tVmMv = `D:${(ratio * 100).toFixed(0)}%`
          } else {
            // Schwan model: Vm-based disruption ratio
            const tVm_dc  = computeSchwan(p, freq, field, sigma_e)
            const tTau    = computeTau(p, sigma_e)
            const tFactor = pulsed ? computePulseStepResponse(tTau, pulseNs) : 1.0
            const tVm     = tVm_dc * tFactor
            const tDr     = tVm / p.thresholdVoltage
            sel = hDr > 1e-9 ? Math.min(99.9, tDr / hDr) : 0
            tVmMv = (tVm * 1000).toFixed(1)
          }
          return { preset: p, sel, tVmMv, isActive: this.store.target.id === p.id, hasRes }
        })
        .sort((a, b) => b.sel - a.sel)
    },

    // ── Tooltip content ───────────────────────────────────────────────────
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
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)`
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

    tipTargetBar(): string {
      const pct  = this.targetRatioPct.toFixed(0)
      const warn = this.targetRatio >= DISRUPTION_WARN_THRESHOLD
        ? '\n<span class="tip-warn">⚡ >85% — disruption countdown active (2.5 s)</span>' : ''
      if (this.isResonanceTarget) {
        const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
        return `<strong>Target resonant disruption: <span class="tip-val">${pct}%</span></strong>
Disruption ratio = (E / E_threshold) × L(f, f_res, Q)
E_threshold = ${t.resonantThresholdVcm} V/cm  ·  f_res = ${t.resonantFreqGHz} GHz${warn}
≥100% → capsid/cell-wall disruption threshold exceeded`
      }
      const tVm  = (this.store.targetVm * 1000).toFixed(2)
      const tThr = (this.store.target.thresholdVoltage * 1000).toFixed(0)
      return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${tVm} mV</span>
Lysis threshold = ${tThr} mV
Ratio = Vm / threshold${warn}
>85% held for 2.5 s → irreversible lysis`
    },

    tipHealthyBar(): string {
      const pct    = this.healthyRatioPct.toFixed(0)
      if (this.isResonanceTarget) {
        return `<strong>Healthy cell: <span class="tip-val">${pct}% disruption (≈0)</span></strong>
Mammalian cells lack rigid-shell resonance — Schwan Vm → 0 at GHz (ωτ ≫ 1).
No membrane coupling at pathogen-targeting frequencies.
<span class="tip-ok">✓ Frequency-selective — healthy tissue unperturbed</span>
Ref: Tsen et al. (2007)`
      }
      const hVm  = (this.store.healthyVm * 1000).toFixed(2)
      const hThr = (this.store.healthy.thresholdVoltage * 1000).toFixed(0)
      const status = this.healthyRatio < 0.5
        ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
        : '\n<span class="tip-warn">⚠ Approaching threshold — reduce field</span>'
      return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${hVm} mV</span>
Lysis threshold = ${hThr} mV
Keep below 50% for therapeutic window${status}`
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

    // ── Optimal frequency ─────────────────────────────────────────────────
    optimalFreqResult(): { khz: number; sel: number } {
      // For resonance targets: optimal frequency IS the preset's resonant frequency
      if (this.isResonanceTarget) {
        const t = this.store.target as { resonantFreqGHz?: number }
        const khz = (t.resonantFreqGHz ?? 0) * 1e6  // GHz → kHz
        return { khz, sel: 99.9 }  // healthy ≈ 0 at GHz → selectivity → ∞
      }
      // Schwan mode: scan 300 log-spaced points 10 kHz → 500 MHz
      const sigma_e = MEDIA[this.store.medium].conductivity
      const field   = this.store.fieldIntensity
      const hThr    = this.store.healthy.thresholdVoltage
      const tThr    = this.store.target.thresholdVoltage
      let maxSel = -Infinity, optKhz = 10
      const logMin = Math.log10(10)
      const logMax  = Math.log10(500_000)  // kHz — 500 MHz
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

    therapeuticIndex(): number { return this.store.therapeuticIndex },

    /** Raw Vm selectivity = Vm_T / Vm_H (not threshold-normalised, unlike TI). */
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

    /**
     * Model-validity or selectivity warning for the current target.
     * Null → no warning displayed.
     */
    targetModelWarning(): string | null {
      const cat = this.store.targetCellCategory
      const ti  = this.therapeuticIndex
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const ghzCaveat = ' · f_res from fs-laser experiments (Tsen et al. [10]); RF delivery at GHz is skin-depth limited (~1–2 mm in saline)'
      // Defensive: if resonance mode is somehow active for a mammalian target, warn and redirect
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

    /** True when the warning should include an inline "Switch to Resonance Mode" button. */
    showResonanceSwitchBtn(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number }
      return !!(cat === 'virus' || cat === 'bacteria') &&
        !!t.resonantFreqGHz &&
        this.store.chartMode === 'schwan'
    },

    targetLysisProbability(): number {
      // Sigmoid centered at 1.0 (lysis threshold), softness 0.05 (sharp at threshold)
      return Math.round(100 / (1 + Math.exp(-(this.targetRatio - 1.0) / 0.05)))
    },

    healthyLysisProbability(): number {
      return Math.round(100 / (1 + Math.exp(-(this.healthyRatio - 1.0) / 0.05)))
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
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)`
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
    /** Returns a CSS class name based on selectivity value (for cmp-bar + cmp-sel). */
    selClass(sel: number): string {
      return sel >= 1.5 ? 'sel--strong' : sel >= 1.0 ? 'sel--marginal' : 'sel--weak'
    },

    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('target', preset)
    },
    loadHealthy(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('healthy', preset)
    },
    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      // Resonance targets: snap to f_res (may be GHz — resonance slider supports full range)
      // Schwan targets: cap at 10 MHz (Schwan slider max)
      const maxKhz = this.isResonanceTarget ? 50_000_000 : 10_000
      const snapped = Math.round(Math.max(10, Math.min(maxKhz, khz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastFieldParams(snapped, this.store.fieldIntensity, this.store.medium)
    },

    presetTip(p: typeof CELL_PRESETS[0]): string {
      const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      const res = pr.resonantFreqGHz
        ? `\nf_res = <span class="tip-val">${pr.resonantFreqGHz} GHz</span>  ·  Q = ${pr.capsidQ ?? 20}  ·  E_thr = ${pr.resonantThresholdVcm} V/cm`
        : ''
      return `<strong>${p.label}</strong>
${p.notes}

R = <span class="tip-val">${p.radius} µm</span>  ·  membrane = ${p.membraneThickness} nm
ε_r = ${p.dielectricConstant}  ·  σ_i = ${p.conductivity} S/m
Vm threshold = <span class="tip-val">${p.thresholdVoltage} V</span>${res}`
    },

    cmpTip(row: { preset: typeof CELL_PRESETS[0]; sel: number; tVmMv: string; hasRes: boolean }): string {
      const selStr = row.sel >= 99 ? '∞' : row.sel.toFixed(3)
      if (row.hasRes) {
        return `<strong>${row.preset.label}</strong>
${row.preset.notes}
Disruption = <span class='tip-val'>${row.tVmMv}</span>  ·  Selectivity = <span class='tip-val'>×${selStr}</span>
Click the preset pill below to switch to this cell`
      }
      return `<strong>${row.preset.label}</strong>
${row.preset.notes}
Vm = <span class='tip-val'>${row.tVmMv} mV</span>  ·  Selectivity = <span class='tip-val'>×${selStr}</span>
Click the preset pill below to switch to this cell`
    },
  },
})
</script>

<template>
  <div class="sel-panel">
    <div class="panel-title">{{ $t('selectivity.title') }}</div>

    <!-- ── Selectivity ratio + TI ────────────────────────────── -->
    <div class="sel-ratio-wrap" v-tip="tipSelectivity">
      <span class="sel-ratio" :class="selectivityClass">
        ×{{ selectivity.toFixed(2) }}
      </span>
      <div class="sel-ratio-labels">
        <span class="sel-ratio-label">{{ $t('selectivity.ratioLabel') }}</span>
        <span class="sel-ti-label">Vm ×<span>{{ vmSelectivityRatio >= 99 ? '∞' : vmSelectivityRatio.toFixed(2) }}</span></span>
      </div>
    </div>

    <!-- ── Disruption progress bars ──────────────────────────── -->
    <div class="panel-sep"></div>
    <div class="disruption-bars">
      <div class="bar-row" v-tip="tipTargetBar">
        <span class="bar-lbl">T</span>
        <div class="bar-track">
          <div
            class="bar-fill bar-fill--t"
            :style="{ width: targetRatioPct + '%' }"
            :class="{ 'bar-fill--warn': targetRatio >= 0.85 }"
          ></div>
        </div>
        <span class="bar-val">{{ targetRatioPct.toFixed(0) }}%</span>
        <span
          class="bar-plysis"
          :class="{ 'bar-plysis--high': targetLysisProbability >= 50 }"
          v-tip="'<strong>P(electroporation)</strong>\nSigmoid probability centered at 100% disruption threshold.\nP = 1 / (1 + e^−((ratio−1.0)/0.05))\n≥50% → lysis likely if held for 2.5 s'"
        >P{{ targetLysisProbability }}%</span>
      </div>
      <div class="bar-row" v-tip="tipHealthyBar">
        <span class="bar-lbl">H</span>
        <div class="bar-track">
          <div
            class="bar-fill bar-fill--h"
            :style="{ width: healthyRatioPct + '%' }"
            :class="{ 'bar-fill--warn': healthyRatio >= 0.85 }"
          ></div>
        </div>
        <span class="bar-val">{{ healthyRatioPct.toFixed(0) }}%</span>
        <span
          class="bar-plysis"
          :class="{ 'bar-plysis--high': healthyLysisProbability >= 50 }"
          v-tip="'<strong>P(electroporation) — Healthy</strong>\nSigmoid probability centered at 100% disruption threshold.\nKeep this value near 0% for selective therapy'"
        >P{{ healthyLysisProbability }}%</span>
      </div>
    </div>

    <!-- ── Nuclear envelope disruption bars (double-shell model) ─ -->
    <template v-if="store.doubleShellEnabled && store.targetCellCategory === 'mammalian'">
      <div class="nuc-bar-section"
        v-tip="'<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>\nVm_nuc / V_threshold_nuc for each cell.\nBandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne)) — typically 0.87–2.1 MHz.\nCancer nuclei have thinner/leakier NE and lower thresholds → higher disruption ratio.\nKotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)'"
      >
        <div class="nuc-bar-row">
          <span class="nuc-bar-lbl">&#x26AC; NE-T</span>
          <div class="nuc-bar-track">
            <div class="nuc-bar-fill nuc-bar-fill--t"
              :style="{ width: Math.min(100, store.targetNuclearDisruptionRatio * 100) + '%' }"
              :class="{ 'nuc-bar-fill--warn': store.targetNuclearDisruptionRatio >= 0.85 }"
            ></div>
          </div>
          <span class="nuc-bar-val">{{ (store.targetNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
        </div>
        <div class="nuc-bar-row">
          <span class="nuc-bar-lbl">&#x26AC; NE-H</span>
          <div class="nuc-bar-track">
            <div class="nuc-bar-fill nuc-bar-fill--h"
              :style="{ width: Math.min(100, store.healthyNuclearDisruptionRatio * 100) + '%' }"
              :class="{ 'nuc-bar-fill--warn': store.healthyNuclearDisruptionRatio >= 0.85 }"
            ></div>
          </div>
          <span class="nuc-bar-val">{{ (store.healthyNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
        </div>
        <div class="nuc-sel-row">
          <span class="nuc-sel-label">NE Selectivity</span>
          <span class="nuc-sel-val" :class="store.nuclearSelectivityRatio >= 1.5 ? 'nuc-sel--good' : store.nuclearSelectivityRatio >= 1.0 ? 'nuc-sel--ok' : 'nuc-sel--low'">
            ×{{ store.nuclearSelectivityRatio >= 99 ? '∞' : store.nuclearSelectivityRatio.toFixed(2) }}
          </span>
        </div>
      </div>
    </template>

    <!-- ── Vm / Disruption & SAR ─────────────────────────────── -->
    <div class="panel-sep"></div>
    <div class="vm-sar-grid" v-tip="tipVmSar">
      <!-- Resonance mode: show disruption % and resonance threshold -->
      <template v-if="isResonanceTarget">
        <div class="vm-sar-cell">
          <span class="vs-type vs-type--t">{{ $t('selectivity.tDisr') }}</span>
          <span class="vs-vm vs-vm--t">{{ targetRatioPct.toFixed(1) }}%</span>
          <span class="vs-sar">{{ targetSarVal }} W/kg</span>
          <span class="vs-elysis"
            v-tip="'<strong>' + $t('selectivity.tipEthr') + '</strong>\n' + $t('selectivity.tipEthrBody')"
          >E<sub>thr</sub> {{ targetResonanceEthr }}</span>
        </div>
        <div class="vm-sar-cell">
          <span class="vs-type vs-type--h">{{ $t('selectivity.hSafe') }}</span>
          <span class="vs-vm vs-vm--res">≈0%</span>
          <span class="vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="vs-elysis vs-elysis--safe"
            v-tip="'<strong>' + $t('selectivity.tipNoGhzRes') + '</strong>\n' + $t('selectivity.tipNoGhzResBody')"
          >{{ $t('selectivity.noGhzRes') }}</span>
        </div>
      </template>
      <!-- Schwan mode: show Vm and lysis field -->
      <template v-else>
        <div class="vm-sar-cell">
          <span class="vs-type vs-type--t">{{ $t('selectivity.targetBar') }}-Vm</span>
          <span class="vs-vm vs-vm--t">{{ targetVmMv }} mV</span>
          <span class="vs-sar">{{ targetSarVal }} W/kg</span>
          <span class="vs-elysis" v-tip="'<strong>Target lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nE_lysis = Vm_thr · √(1+(ωτ)²) / (1.5·R)'">E<sub>lys</sub> {{ targetLysisField }}</span>
        </div>
        <div class="vm-sar-cell">
          <span class="vs-type vs-type--h">{{ $t('selectivity.healthyBar') }}-Vm</span>
          <span class="vs-vm vs-vm--h">{{ healthyVmMv }} mV</span>
          <span class="vs-sar">{{ healthySarVal }} W/kg</span>
          <span class="vs-elysis" v-tip="'<strong>Healthy lysis field</strong>\nMinimum E required to reach lysis threshold at current frequency.\nKeep operating field below this value for selective therapy.'">E<sub>lys</sub> {{ healthyLysisField }}</span>
        </div>
      </template>
    </div>

    <!-- ── Mode badge ─────────────────────────────────────────── -->
    <div class="mode-row">
      <span
        class="mode-badge"
        :class="modeBadgeClass"
        v-tip="tipModeBadge"
      >
        {{ modeBadge.label }}
      </span>
      <span
        class="optimal-note optimal-note--snap"
        :class="{ 'optimal-note--beyond': optimalFreqResult.khz > 10000 }"
        @click="snapToOptimal"
        v-tip="tipOptimal"
      >{{ optimalNote }}</span>
    </div>

    <!-- ── Model / selectivity warning ──────────────────────── -->
    <div v-if="targetModelWarning" class="model-warning">
      {{ targetModelWarning }}
      <button
        v-if="showResonanceSwitchBtn"
        class="model-warning-btn"
        @click="store.setChartMode('resonance')"
      >→ Switch to Resonance Mode</button>
    </div>

    <!-- ── Preset selectivity comparison ─────────────────────── -->
    <div class="panel-sep"></div>
    <div class="library-section">
      <div
        class="lib-title"
        v-tip="'<strong>' + presetCompTitleDynamic + '</strong>\n' + $t('selectivity.presetCompTip')"
      >{{ presetCompTitleDynamic }}</div>
      <div class="comparison-table">
        <div
          v-for="row in presetComparison"
          :key="row.preset.presetId"
          class="cmp-row"
          :class="{ 'cmp-row--active': row.isActive }"
          v-tip="cmpTip(row)"
        >
          <span class="cmp-name" :style="{ '--gc': GROUP_COLORS[row.preset.group] }">{{ row.preset.shortLabel }}</span>
          <div class="cmp-bar-track">
            <div
              class="cmp-bar"
              :class="selClass(row.sel)"
              :style="{ width: Math.min(100, row.sel * 40) + '%' }"
            ></div>
          </div>
          <span class="cmp-sel" :class="selClass(row.sel)">×{{ row.sel.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Target cell library ────────────────────────────────── -->
    <div class="panel-sep"></div>
    <div class="library-section">
      <div
        class="lib-title"
        v-tip="'<strong>' + $t('selectivity.targetLibTitle') + '</strong>\n' + $t('selectivity.targetLibTip')"
      >{{ $t('selectivity.targetLibTitle') }}</div>
      <!-- --pill-c sets the group accent color for the active pill via CSS -->
      <div v-for="grp in targetGroups" :key="grp" class="lib-group" :style="{ '--pill-c': GROUP_COLORS[grp] }">
        <span class="lib-group-label">{{ GROUP_LABELS[grp] }}</span>
        <div class="lib-pills">
          <button
            v-for="p in presetsByGroup[grp]"
            :key="p.presetId"
            class="preset-pill"
            :class="{ 'preset-pill--active': activeTargetId === p.id }"
            v-tip="presetTip(p)"
            @click="loadTarget(p)"
          >{{ p.shortLabel }}</button>
        </div>
      </div>
    </div>

    <!-- ── Healthy baseline ───────────────────────────────────── -->
    <div class="panel-sep"></div>
    <div class="library-section">
      <div
        class="lib-title"
        v-tip="'<strong>' + $t('selectivity.healthyLibTitle') + '</strong>\n' + $t('selectivity.healthyLibTip')"
      >{{ $t('selectivity.healthyLibTitle') }}</div>
      <div class="lib-pills" :style="{ '--pill-c': GROUP_COLORS.reference }">
        <button
          v-for="p in healthyPresets"
          :key="p.presetId"
          class="preset-pill"
          :class="{ 'preset-pill--active': activeHealthyId === p.id }"
          v-tip="presetTip(p)"
          @click="loadHealthy(p)"
        >{{ p.shortLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sel-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Section separator ────────────────────────────────────── */
.panel-sep {
  height: 1px;
  background: var(--color-border);
  opacity: 0.5;
  margin: 0.1rem 0;
  flex-shrink: 0;
}

/* ── Panel title ─────────────────────────────────────────────── */
.panel-title {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text);
}

/* ── Selectivity ratio ───────────────────────────────────────── */
.sel-ratio-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
.sel-ratio {
  font-size: 2rem;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: -0.04em;
  line-height: 1;
  transition: color 0.4s;
  flex-shrink: 0;
}
.sel-ratio-labels {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.sel-ratio-label {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sel-ti-label {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Disruption bars ─────────────────────────────────────────── */
.disruption-bars { display: flex; flex-direction: column; gap: 0.35rem; }
.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-lbl {
  font-size: 0.66rem; font-family: var(--font-mono);
  color: var(--color-text); width: 1rem; text-align: right; flex-shrink: 0;
}
.bar-track {
  flex: 1; height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px; overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.bar-fill--t { background: var(--color-danger); }
.bar-fill--h { background: var(--color-primary); }
.bar-fill--warn { animation: bar-flash 0.6s ease-in-out infinite alternate; }
@keyframes bar-flash { from { opacity: 1; } to { opacity: 0.5; } }
.bar-val {
  font-size: 0.66rem; font-family: var(--font-mono);
  color: var(--color-text); width: 2.2rem; text-align: right; flex-shrink: 0;
}

/* ── Mode badge ──────────────────────────────────────────────── */
.mode-row { display: flex; flex-direction: column; gap: 0.35rem; }
.mode-badge {
  font-size: 0.68rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  padding: 0.2rem 0.55rem;
  border-radius: 3px;
  border: 1px solid transparent;
  align-self: flex-start;
  transition: color 0.3s, border-color 0.3s;
}
.optimal-note {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.85;
  line-height: 1.5;
}
.optimal-note--snap {
  cursor: pointer;
  color: var(--color-amber);
  opacity: 1;
  transition: opacity 0.15s, color 0.2s;
}
.optimal-note--snap:hover { opacity: 0.75; }
.optimal-note--beyond {
  color: var(--color-text-muted);
  opacity: 0.7;
}
.optimal-note--beyond:hover { opacity: 0.55; }

/* ── Nuclear envelope disruption bars (double-shell) ─────── */
.nuc-bar-section {
  margin-top: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(167, 139, 250, 0.05);
  border-left: 2px solid rgba(167, 139, 250, 0.3);
  border-radius: 0 4px 4px 0;
  display: flex; flex-direction: column; gap: 0.28rem;
}
.nuc-bar-row { display: flex; align-items: center; gap: 0.5rem; }
.nuc-bar-lbl {
  font-size: 0.58rem; font-family: var(--font-mono);
  color: #a78bfa; width: 3rem; flex-shrink: 0;
}
.nuc-bar-track {
  flex: 1; height: 3px;
  background: rgba(167, 139, 250, 0.12);
  border-radius: 2px; overflow: hidden;
}
.nuc-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
.nuc-bar-fill--t { background: #a78bfa; }
.nuc-bar-fill--h { background: rgba(0, 212, 255, 0.7); }
.nuc-bar-fill--warn { background: #ff4d6d !important; animation: bar-flash 0.6s ease-in-out infinite alternate; }
.nuc-bar-val {
  font-size: 0.58rem; font-family: var(--font-mono);
  color: #a78bfa; width: 2rem; text-align: right; flex-shrink: 0;
}
.nuc-sel-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 0.15rem; border-top: 1px solid rgba(167, 139, 250, 0.12);
  margin-top: 0.05rem;
}
.nuc-sel-label { font-size: 0.58rem; color: rgba(167, 139, 250, 0.7); }
.nuc-sel-val   { font-size: 0.68rem; font-family: var(--font-mono); font-weight: 600; color: #a78bfa; }
.nuc-sel--good { color: #4ade80; }
.nuc-sel--ok   { color: #fbbf24; }
.nuc-sel--low  { color: #ff4d6d; }

/* ── P(lysis) probability ─────────────────────────────────── */
.bar-plysis {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.7;
  width: 2.6rem; text-align: right; flex-shrink: 0;
  transition: color 0.3s, opacity 0.3s;
}
.bar-plysis--high {
  color: var(--color-danger);
  opacity: 1;
  font-weight: 600;
}

/* ── Library sections ────────────────────────────────────────── */
.library-section { display: flex; flex-direction: column; gap: 0.4rem; }
.lib-title {
  font-size: 0.6rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text-heading);
  opacity: 0.9;
  margin-bottom: 0.1rem;
}
.lib-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }
.lib-group-label {
  font-size: 0.55rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  opacity: 0.9;
}
.lib-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.preset-pill {
  font-size: 0.58rem; font-family: var(--font-mono);
  padding: 0.18rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
  white-space: nowrap;
}
.preset-pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
.preset-pill--active { background-color: rgba(255,255,255,0.05); }

/* ── Vm / SAR readout ────────────────────────────────────────── */
.vm-sar-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
  background: rgba(0,0,0,0.2); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 0.45rem 0.65rem;
  cursor: default;
}
.vm-sar-cell { display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap; }
.vs-type {
  font-size: 0.65rem; font-family: var(--font-mono);
  font-weight: 700; opacity: 0.85; flex-shrink: 0;
}
.vs-type--t { color: var(--color-danger); }
.vs-type--h { color: var(--color-primary); }
.vs-vm {
  font-size: 0.9rem; font-family: var(--font-mono);
  font-weight: 700; line-height: 1;
}
.vs-sar {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.85; white-space: nowrap;
}
.vs-elysis {
  font-size: 0.58rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.7; white-space: nowrap;
  cursor: default;
}

/* ── Model / selectivity warning ────────────────────────────── */
.model-warning {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-amber);
  background: rgba(251, 191, 36, 0.07);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: var(--radius);
  padding: 0.3rem 0.55rem;
  line-height: 1.55;
}

.model-warning-btn {
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
}
.model-warning-btn:hover {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(251, 191, 36, 0.65);
}

/* ── Preset comparison table ─────────────────────────────────── */
.comparison-table { display: flex; flex-direction: column; gap: 0.18rem; }
.cmp-row {
  display: grid; grid-template-columns: 3.2rem 1fr 2.8rem;
  align-items: center; gap: 0.4rem; padding: 0.1rem 0.2rem;
  border-radius: 3px; transition: background 0.1s;
}
.cmp-row--active { background: rgba(255,255,255,0.05); }
.cmp-name {
  font-size: 0.56rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.04em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cmp-bar-track {
  height: 4px; background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden;
}
.cmp-bar { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
.cmp-sel {
  font-size: 0.6rem; font-family: var(--font-mono);
  font-weight: 600; text-align: right;
}

/* ── Selectivity state classes ───────────────────────────────── */
.sel--strong  { color: var(--color-lime); }
.sel--marginal { color: var(--color-amber); }
.sel--weak    { color: var(--color-danger); }

/* cmp-bar background (same three states) */
.cmp-bar.sel--strong  { background: var(--color-lime); }
.cmp-bar.sel--marginal { background: var(--color-amber); }
.cmp-bar.sel--weak    { background: var(--color-danger); }

/* ── Mode badge state classes ─────────────────────────────────── */
.badge--therapeutic { color: var(--color-lime);    border-color: rgba(57, 255, 20, 0.33); }
.badge--ablative    { color: var(--color-danger);  border-color: rgba(255, 77, 109, 0.33); }
.badge--marginal    { color: var(--color-amber);   border-color: rgba(251, 191, 36, 0.33); }
.badge--approaching { color: var(--color-amber);   border-color: rgba(251, 191, 36, 0.33); }
.badge--subthreshold{ color: var(--color-primary); border-color: rgba(0, 212, 255, 0.33); }

/* ── Vm display state classes ─────────────────────────────────── */
.vs-vm--t   { color: var(--color-danger); }
.vs-vm--h   { color: var(--color-primary); }
.vs-vm--res { color: var(--color-lime); }     /* resonance mode healthy ≈0% */
.vs-elysis--safe { color: var(--color-lime); }

/* ── Group-colored elements via CSS custom property --gc / --pill-c ── */
.cmp-name       { color: var(--gc, var(--color-text)); }
.lib-group-label { color: var(--pill-c, var(--color-text-muted)); }
.preset-pill--active {
  border-color: var(--pill-c, var(--color-primary));
  color: var(--pill-c, var(--color-primary));
}
</style>
