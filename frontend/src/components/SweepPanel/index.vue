<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sweep-panel">

    <AccordionPanel
      :icon="ICON.RELOAD"
      :title="$t('sweep.title')"
      :subtitle="sweepSubtitle"
      @open-change="onAccordionChange"
    >
    <div class="sweep-panel__body">

      <SweepControls
        :sweep-param="sweepParam"
        :sweep-max="sweepMax"
        :default-freq-max="defaultFreqMax"
        @param-change="onParamChange"
        @max-change="sweepMax = $event"
        @export="exportCSV"
      />

      <SweepChart
        :sweep-data="sweepData"
        :sweep-param="sweepParam"
        :sweep-max="sweepMax"
        :open="open"
      />

      <SweepWindowInfo
        :window-range="windowRange"
        :sweep-param="sweepParam"
        :recommended-max="recommendedMax"
        :best-t-i-point="bestTIPoint"
        @expand="sweepMax = $event"
      />

      <SweepKeyPoints
        :key-points="keyPoints"
        :sweep-param="sweepParam"
      />

    </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import AccordionPanel from '@/components/AccordionPanel.vue'

import {
  computeSchwan, computeSAR, computeTau, computePulseStepResponse,
  computeResonantDisruption, tempCorrectedVth,
} from '@/utils/physics'
import { formatFreqKHz } from '@/utils/format'

import { WAVEFORM, CELL_CATEGORY } from '@/constants/strings'
import {
  THRESHOLDS, DEFAULT_CAPSID_Q, NEAR_ZERO_DR,
  NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF, WF_CW, WF_PULSED, BODY_TEMP_C,
  H_FIRE_THRESHOLD_MULTIPLIER,
} from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'
import { SWEEP_TI_CAP } from '@/constants/experimentDefaults'

import type { CellConfig } from '@/types/cell'

import SweepControls  from './SweepControls.vue'
import SweepChart     from './SweepChart.vue'
import SweepWindowInfo from './SweepWindowInfo.vue'
import SweepKeyPoints from './SweepKeyPoints.vue'

const N_POINTS = 400  // 400 pts over sweep range → detects windows as narrow as ~0.25% of range

interface SweepPoint {
  x: number    // sweep param value (V/cm or kHz)
  drH: number  // healthy disruption ratio
  drT: number  // target disruption ratio
  ti: number   // therapeutic index
  tH: number   // healthy steady-state temp [°C]
  tT: number   // target steady-state temp [°C]
}

interface KeyPoint {
  label: string
  x: number; drH: number; drT: number; ti: number; tH: number; tT: number
}

function computeTemp(cell: CellConfig, E: number, sigma_e: number, wf: number, dc: number, perfRate: number): number {
  const sar         = computeSAR(cell, E, sigma_e, wf)
  const sarEff      = sar * dc
  const lambdaPerf  = perfRate * PENNES_BLOOD_COEFF / cell.specificHeatCapacity
  return Math.min(
    BODY_TEMP_C + sarEff / ((NEWTON_COOLING_LAMBDA + lambdaPerf) * cell.specificHeatCapacity),
    THRESHOLDS.TEMP_CAP,
  )
}

export default defineComponent({
  components: { AccordionPanel, SweepControls, SweepChart, SweepWindowInfo, SweepKeyPoints },
  emits: [EMIT.WINDOW_CHANGE, EMIT.OPEN_CHANGE],

  data() {
    return {
      open: false,
      sweepParam: 'field' as 'field' | 'freq',
      sweepMax: 1000,
    }
  },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore),

    isResonanceTarget(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.BACTERIA || cat === CELL_CATEGORY.VIRUS) &&
        !!t.resonantFreqGHz && !!t.resonantThresholdVcm &&
        this.cellStore.isResonanceMode
    },

    // Category sweep max: mammalian=5MHz, bacteria=200MHz, virus=500MHz (GHz inaccessible)
    defaultFreqMax(): number {
      const cat = this.cellStore.targetCellCategory
      if (cat === CELL_CATEGORY.BACTERIA) return 200_000   // 200 MHz in kHz
      if (cat === CELL_CATEGORY.VIRUS)    return 500_000   // 500 MHz in kHz
      return 5_000                                         // 5 MHz for mammalian
    },

    sweepSubtitle(): string {
      if (this.sweepParam === 'field') {
        return `E: 0 - ${this.sweepMax} ${UNIT.V_PER_CM} @ ${formatFreqKHz(this.cellStore.currentBroadcastFrequency, 1)}`
      }
      return `f: 0 - ${formatFreqKHz(this.sweepMax, 1)} @ ${this.cellStore.fieldIntensity} ${UNIT.V_PER_CM}`
    },

    sweepData(): SweepPoint[] {
      const cellStore  = this.cellStore
      const sigma_e    = cellStore.effectiveSigmaE
      const cosTheta   = cellStore.cosThetaFactor
      const waveform   = cellStore.waveform
      const dc         = cellStore.dutyCycle
      const pwNs       = cellStore.pulseWidthNs
      const freqKHz    = cellStore.currentBroadcastFrequency
      const E          = cellStore.fieldIntensity
      const healthy    = cellStore.healthy
      const target     = cellStore.target
      const perfRate   = cellStore.perfusionRate
      const wf         = waveform === WAVEFORM.CW ? WF_CW : WF_PULSED

      const tauH = computeTau(healthy, sigma_e)
      const tauT = computeTau(target,  sigma_e)
      const isPulsed   = waveform === WAVEFORM.PULSED || waveform === WAVEFORM.H_FIRE
      const hfireMult  = waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const pefH = isPulsed ? computePulseStepResponse(tauH, pwNs) : 1.0
      const pefT = isPulsed && !this.isResonanceTarget
        ? computePulseStepResponse(tauT, pwNs)
        : 1.0

      const t = target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }

      const points: SweepPoint[] = []
      for (let i = 0; i <= N_POINTS; i++) {
        const x = (i / N_POINTS) * this.sweepMax
        let drH: number, drT: number, tH: number, tT: number

        if (this.sweepParam === 'field') {
          // Compute per-point temperatures first so threshold correction uses the local steady-state temp
          tH = computeTemp(healthy, x, sigma_e, wf, dc, perfRate)
          tT = computeTemp(target,  x, sigma_e, wf, dc, perfRate)
          const vmH    = computeSchwan(healthy, freqKHz, x, sigma_e, cosTheta)
          const hVthEff = tempCorrectedVth(healthy.thresholdVoltage, tH) * hfireMult
          drH = (vmH * pefH) / hVthEff
          if (this.isResonanceTarget) {
            // hfireMult does NOT apply to acoustic resonance — mechanical disruption, not EP membrane charging.
            const resVthEff = tempCorrectedVth(t.resonantThresholdVcm!, tT)
            drT = computeResonantDisruption(t.resonantFreqGHz!, t.capsidQ ?? DEFAULT_CAPSID_Q, resVthEff, freqKHz * 1e3, x)
          } else {
            const tVthEff = tempCorrectedVth(target.thresholdVoltage, tT) * hfireMult
            drT = (computeSchwan(target, freqKHz, x, sigma_e, cosTheta) * pefT) / tVthEff
          }
        } else {
          // Compute per-point temperatures first so threshold correction uses the local steady-state temp
          tH = computeTemp(healthy, E, sigma_e, wf, dc, perfRate)
          tT = computeTemp(target,  E, sigma_e, wf, dc, perfRate)
          const vmH    = computeSchwan(healthy, x, E, sigma_e, cosTheta)
          const hVthEff = tempCorrectedVth(healthy.thresholdVoltage, tH) * hfireMult
          drH = (vmH * pefH) / hVthEff
          if (this.isResonanceTarget) {
            // hfireMult does NOT apply to acoustic resonance — mechanical disruption, not EP membrane charging.
            const resVthEff = tempCorrectedVth(t.resonantThresholdVcm!, tT)
            drT = computeResonantDisruption(t.resonantFreqGHz!, t.capsidQ ?? DEFAULT_CAPSID_Q, resVthEff, x * 1e3, E)
          } else {
            const tVthEff = tempCorrectedVth(target.thresholdVoltage, tT) * hfireMult
            drT = (computeSchwan(target, x, E, sigma_e, cosTheta) * pefT) / tVthEff
          }
        }

        const ti = drH < NEAR_ZERO_DR ? (drT > 0 ? SWEEP_TI_CAP : 0) : Math.min(SWEEP_TI_CAP, drT / drH)
        points.push({ x, drH, drT, ti, tH, tT })
      }
      return points
    },

    windowRange(): { lo: number; hi: number } | null {
      let lo = -1, hi = -1
      for (const p of this.sweepData) {
        // Require target above lysis threshold, healthy sub-threshold, AND neither cell thermally denaturing.
        // Both temperatures must be checked: healthy (mammalian) heats more than bacteria at the same field,
        // so checking only the target temperature would allow dangerously hot healthy cells.
        if (
          p.drT >= THRESHOLDS.DISRUPTION_WARN &&
          p.drH < THRESHOLDS.HEALTHY_APPROACHING &&
          p.tT  < THRESHOLDS.TEMP_DENATURING &&
          p.tH  < THRESHOLDS.TEMP_DENATURING
        ) {
          if (lo < 0) lo = p.x
          hi = p.x
        }
      }
      return lo >= 0 ? { lo, hi } : null
    },

    bestTIPoint(): SweepPoint | null {
      const pts = this.sweepData.filter(p => p.x > 0)
      if (!pts.length) return null
      return pts.reduce((a, b) => b.ti > a.ti ? b : a)
    },

    hasTheoreticalWindow(): boolean {
      const minTI = THRESHOLDS.DISRUPTION_WARN / THRESHOLDS.HEALTHY_APPROACHING
      return this.sweepData.some(p => p.ti > minTI)
    },

    recommendedMax(): number | null {
      if (this.windowRange || !this.hasTheoreticalWindow) return null
      const maxDrT = Math.max(0, ...this.sweepData.map(p => p.drT))
      if (maxDrT < 1e-6) return null
      const needed = (THRESHOLDS.DISRUPTION_WARN / maxDrT) * this.sweepMax
      return Math.ceil(needed * 1.2 / 100) * 100  // 20% buffer, round to nearest 100
    },

    keyPoints(): KeyPoint[] {
      const pts = this.sweepData
      const thresholds = [
        { label: this.$t('sweep.keyRevEp'),      drTMin: THRESHOLDS.HEALTHY_APPROACHING },
        { label: this.$t('sweep.keyLysisArmed'), drTMin: THRESHOLDS.DISRUPTION_WARN     },
        { label: this.$t('sweep.keyLysis'),      drTMin: THRESHOLDS.LYSIS_PROB_CENTER   },
      ]
      return thresholds.flatMap(({ label, drTMin }) => {
        const pt = pts.find(p => p.drT >= drTMin)
        if (!pt) return []
        const unit = this.sweepParam === 'field' ? this.$t('sweep.fieldUnit') : this.$t('sweep.freqUnit')
        return [{ ...pt, label: `${label} @ ${pt.x.toFixed(0)} ${unit}` }]
      })
    },
  },

  watch: {
    open(v: boolean) { this.$emit(EMIT.OPEN_CHANGE, v) },
    windowRange(val: { lo: number; hi: number } | null) {
      this.$emit(EMIT.WINDOW_CHANGE, val ? { ...val, param: this.sweepParam } : null)
    },
    sweepParam() {
      this.$emit(EMIT.WINDOW_CHANGE, this.windowRange ? { ...this.windowRange, param: this.sweepParam } : null)
    },
  },

  methods: {
    onAccordionChange(v: boolean) { this.open = v },

    onParamChange({ param, max }: { param: 'field' | 'freq'; max: number }) {
      this.sweepParam = param
      this.sweepMax   = max
    },

    exportCSV() {
      const { cellStore } = this
      const meta = [
        `# ResoPulse: ${this.sweepParam === 'field' ? 'Field' : 'Frequency'} Sweep Export`,
        `# Exported: ${new Date().toISOString()}`,
        `# Healthy: ${cellStore.healthy.label} · R=${cellStore.healthy.radius} ${UNIT.UM} · fc=${cellStore.healthyFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Target:  ${cellStore.target.label} · R=${cellStore.target.radius} ${UNIT.UM} · fc=${cellStore.targetFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Medium: ${cellStore.medium} · σ_e=${cellStore.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
        `# Fixed: ${this.sweepParam === 'field' ? `freq=${cellStore.currentBroadcastFrequency} ${UNIT.KHZ}` : `field=${cellStore.fieldIntensity} ${UNIT.V_PER_CM}`} · ${cellStore.waveform} · dc=${cellStore.dutyCycle.toExponential(2)}`,
        `# Model: Schwan equation (Kotnik & Miklavcic 2000), ResoPulse`,
      ].join('\n')
      const header = this.sweepParam === 'field'
        ? 'E_field_Vcm,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,selective_window'
        : 'freq_kHz,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,selective_window'
      const rows = this.sweepData.map(p => {
        const inWindow = (
          p.drT >= THRESHOLDS.DISRUPTION_WARN &&
          p.drH  < THRESHOLDS.HEALTHY_APPROACHING &&
          p.tT   < THRESHOLDS.TEMP_DENATURING &&
          p.tH   < THRESHOLDS.TEMP_DENATURING
        ) ? 1 : 0
        return `${p.x.toFixed(2)},${p.drH.toFixed(4)},${p.drT.toFixed(4)},${p.ti.toFixed(4)},${p.tH.toFixed(2)},${p.tT.toFixed(2)},${inWindow}`
      })
      const blob = new Blob([meta + '\n' + header + '\n' + rows.join('\n')], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sweep_${this.sweepParam}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    },
  },
})
</script>

<style lang="scss" scoped>


.sweep-panel {
  @include surface-card(var(--radius-lg));
  overflow: hidden;

  &__body {
    @include flex-col(0.75rem);
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-border);
  }
}
</style>
