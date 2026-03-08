<template>
  <div class="sweep-panel">

    <!-- Accordion toggle -->
    <button class="sweep-panel__toggle" @click="open = !open">
      <span class="sweep-panel__toggle-left">
        <span class="sweep-panel__toggle-icon">⟳</span>
        <span class="sweep-panel__toggle-title">Field Sweep Analysis</span>
        <span class="sweep-panel__toggle-sub">{{ sweepSubtitle }}</span>
      </span>
      <span class="sweep-panel__chevron" :class="{ 'sweep-panel__chevron--open': open }">›</span>
    </button>

    <div v-show="open" class="sweep-panel__body">

      <!-- Controls row -->
      <div class="sweep-panel__controls">
        <div class="sweep-panel__ctrl-group">
          <span class="sweep-panel__ctrl-label">Sweep</span>
          <div class="sweep-panel__pills">
            <button
              class="sweep-panel__pill"
              :class="{ 'sweep-panel__pill--active': sweepParam === 'field' }"
              @click="sweepParam = 'field'; sweepMax = 1000"
            >E-field (V/cm)</button>
            <button
              class="sweep-panel__pill"
              :class="{ 'sweep-panel__pill--active': sweepParam === 'freq' }"
              @click="sweepParam = 'freq'; sweepMax = 5000"
            >Frequency (kHz)</button>
          </div>
        </div>
        <div class="sweep-panel__ctrl-group">
          <span class="sweep-panel__ctrl-label">Max</span>
          <input
            class="sweep-panel__input"
            type="number"
            v-model.number="sweepMax"
            :step="sweepParam === 'field' ? 100 : 1000"
            :min="sweepParam === 'field' ? 100 : 100"
          />
          <span class="sweep-panel__ctrl-unit">{{ sweepParam === 'field' ? 'V/cm' : 'kHz' }}</span>
        </div>
        <button class="sweep-panel__export-btn" @click="exportCSV">↓ Export CSV</button>
      </div>

      <!-- D3 chart -->
      <div ref="chartWrap" class="sweep-panel__chart-wrap">
        <svg ref="svgEl" class="sweep-panel__svg"></svg>
      </div>

      <!-- Therapeutic window info -->
      <div v-if="windowRange" class="sweep-panel__window-row">
        <span class="sweep-panel__window-label">Therapeutic window:</span>
        <span class="sweep-panel__window-val">
          {{ windowRange.lo.toFixed(0) }}–{{ windowRange.hi.toFixed(0) }}
          {{ sweepParam === 'field' ? 'V/cm' : 'kHz' }}
        </span>
        <span class="sweep-panel__window-sub">DR<sub>target</sub> &gt; 85% · DR<sub>healthy</sub> &lt; 50%</span>
        <button class="sweep-panel__snap-btn" @click="snapToWindow">⭐ Snap to center</button>
      </div>
      <div v-else class="sweep-panel__window-row sweep-panel__window-row--none">
        No therapeutic window found in this range — increase max or adjust pulse/frequency settings.
      </div>

      <!-- Key operating points table -->
      <table class="sweep-panel__table">
        <thead>
          <tr>
            <th>Threshold</th>
            <th>DR<sub>T</sub></th>
            <th>DR<sub>H</sub></th>
            <th>TI</th>
            <th>T<sub>target</sub></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="kp in keyPoints" :key="kp.label">
            <td class="sweep-panel__td-label">{{ kp.label }}</td>
            <td :class="kp.drT >= 1 ? 'sweep-panel__td--danger' : kp.drT >= 0.85 ? 'sweep-panel__td--warn' : ''">{{ kp.drT.toFixed(2) }}</td>
            <td :class="kp.drH >= 0.50 ? 'sweep-panel__td--warn' : ''">{{ kp.drH.toFixed(2) }}</td>
            <td :class="kp.ti >= 2 ? 'sweep-panel__td--ok' : kp.ti >= 1.2 ? 'sweep-panel__td--warn' : 'sweep-panel__td--danger'">{{ kp.ti.toFixed(2) }}×</td>
            <td :class="kp.tT >= 60 ? 'sweep-panel__td--danger' : kp.tT >= 42 ? 'sweep-panel__td--warn' : ''">{{ kp.tT.toFixed(1) }}°C</td>
          </tr>
        </tbody>
      </table>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import {
  computeSchwan, computeSAR, computeTau, computePulseStepResponse,
  computeResonantDisruption,
} from '@/utils/physics'
import { WAVEFORM, CHART_MODE, CELL_CATEGORY } from '@/constants/strings'
import type { CellConfig } from '@/types/cell'
import { broadcastFieldParams } from '@/services/socket'
import { formatFreqKHz } from '@/utils/format'

const LAMBDA   = 0.02  // Newton cooling [1/s]
const N_POINTS = 100   // sweep resolution

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

type ResizeObserverInstance = InstanceType<typeof ResizeObserver>

function computeTemp(cell: CellConfig, E: number, sigma_e: number, wf: number, dc: number, perfRate: number): number {
  const sar = computeSAR(cell, E, sigma_e, wf)
  const sarEff = sar * dc
  const lambda_perf = perfRate * 63.9 / cell.specificHeatCapacity
  return Math.min(37 + sarEff / ((LAMBDA + lambda_perf) * cell.specificHeatCapacity), 150)
}

const MARGIN = { top: 18, right: 76, bottom: 38, left: 54 }

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      open: false,
      sweepParam: 'field' as 'field' | 'freq',
      sweepMax: 1000,
      _resizeObs: null as ResizeObserverInstance | null,
    }
  },

  computed: {
    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      if (cat !== CELL_CATEGORY.BACTERIA && cat !== CELL_CATEGORY.VIRUS) return false
      const t = this.store.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return !!(t.resonantFreqGHz && t.resonantThresholdVcm) && this.store.chartMode === CHART_MODE.RESONANCE
    },

    sweepData(): SweepPoint[] {
      const { store } = this
      const sigma_e  = store.effectiveSigmaE
      const cosTheta = store.cosThetaFactor
      const waveform = store.waveform
      const dc       = store.dutyCycle
      const pwNs     = store.pulseWidthNs
      const freqKHz  = store.currentBroadcastFrequency
      const E        = store.fieldIntensity
      const healthy  = store.healthy
      const target   = store.target
      const perfRate = store.perfusionRate
      const wf       = waveform === WAVEFORM.CW ? 0.5 : 1.0

      // Pulse envelope factors — tau is independent of E and f (only cell params + sigma_e)
      const tauH = computeTau(healthy, sigma_e)
      const tauT = computeTau(target,  sigma_e)
      const pefH = waveform === WAVEFORM.PULSED ? computePulseStepResponse(tauH, pwNs) : 1.0
      const pefT = waveform === WAVEFORM.PULSED && !this.isResonanceTarget
        ? computePulseStepResponse(tauT, pwNs)
        : 1.0

      const t = target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }

      const points: SweepPoint[] = []
      for (let i = 0; i <= N_POINTS; i++) {
        const x = (i / N_POINTS) * this.sweepMax

        let drH: number
        let drT: number
        let tH: number
        let tT: number

        if (this.sweepParam === 'field') {
          // Sweep E; frequency fixed
          const vmH = computeSchwan(healthy, freqKHz, x, sigma_e, cosTheta)
          drH = (vmH * pefH) / healthy.thresholdVoltage

          if (this.isResonanceTarget) {
            drT = computeResonantDisruption(t.resonantFreqGHz!, t.capsidQ ?? 20, t.resonantThresholdVcm!, freqKHz * 1e3, x)
          } else {
            const vmT = computeSchwan(target, freqKHz, x, sigma_e, cosTheta)
            drT = (vmT * pefT) / target.thresholdVoltage
          }

          tH = computeTemp(healthy, x, sigma_e, wf, dc, perfRate)
          tT = computeTemp(target,  x, sigma_e, wf, dc, perfRate)

        } else {
          // Sweep frequency; E fixed
          const vmH = computeSchwan(healthy, x, E, sigma_e, cosTheta)
          drH = (vmH * pefH) / healthy.thresholdVoltage

          if (this.isResonanceTarget) {
            drT = computeResonantDisruption(t.resonantFreqGHz!, t.capsidQ ?? 20, t.resonantThresholdVcm!, x * 1e3, E)
          } else {
            const vmT = computeSchwan(target, x, E, sigma_e, cosTheta)
            drT = (vmT * pefT) / target.thresholdVoltage
          }

          // Temperature doesn't vary with freq (SAR is freq-independent)
          tH = computeTemp(healthy, E, sigma_e, wf, dc, perfRate)
          tT = computeTemp(target,  E, sigma_e, wf, dc, perfRate)
        }

        const ti = drH < 1e-9 ? (drT > 0 ? 5 : 0) : Math.min(5, drT / drH)
        points.push({ x, drH, drT, ti, tH, tT })
      }
      return points
    },

    sweepSubtitle(): string {
      if (this.sweepParam === 'field') {
        return `E: 0–${this.sweepMax} V/cm @ ${formatFreqKHz(this.store.currentBroadcastFrequency, 1)}`
      }
      return `f: 0–${formatFreqKHz(this.sweepMax, 1)} @ ${this.store.fieldIntensity} V/cm`
    },

    windowRange(): { lo: number; hi: number } | null {
      const pts = this.sweepData
      let lo = -1, hi = -1
      for (const p of pts) {
        if (p.drT >= 0.85 && p.drH < 0.50) {
          if (lo < 0) lo = p.x
          hi = p.x
        }
      }
      return lo >= 0 ? { lo, hi } : null
    },

    keyPoints(): KeyPoint[] {
      const pts = this.sweepData
      const thresholds = [
        { label: 'Target Rev-EP (50%)', drTMin: 0.50 },
        { label: 'Target lysis armed (85%)', drTMin: 0.85 },
        { label: 'Target lysis (100%)', drTMin: 1.00 },
      ]
      return thresholds.flatMap(({ label, drTMin }) => {
        const pt = pts.find(p => p.drT >= drTMin)
        if (!pt) return []
        const unit = this.sweepParam === 'field' ? 'V/cm' : 'kHz'
        return [{ ...pt, label: `${label} @ ${pt.x.toFixed(0)} ${unit}` }]
      })
    },
  },

  watch: {
    open(v: boolean) {
      if (v) this.$nextTick(() => { this._initChart(); this._drawChart() })
    },
    sweepData() {
      if (this.open) this._drawChart()
    },
  },

  beforeUnmount() {
    (this._resizeObs as ResizeObserverInstance | null)?.disconnect()
  },

  methods: {
    _initChart() {
      const wrap = this.$refs.chartWrap as HTMLElement
      if (!wrap || (this._resizeObs as ResizeObserverInstance | null)) return
      const obs = new ResizeObserver(() => { if (this.open) this._drawChart() })
      obs.observe(wrap)
      this._resizeObs = obs as unknown as ResizeObserverInstance
    },

    _drawChart() {
      const wrap = this.$refs.chartWrap as HTMLElement
      const svgEl = this.$refs.svgEl as SVGSVGElement
      if (!wrap || !svgEl) return

      const W = wrap.clientWidth
      const H = 224
      const iW = W - MARGIN.left - MARGIN.right
      const iH = H - MARGIN.top - MARGIN.bottom
      const pts = this.sweepData

      const svg = d3.select(svgEl)
        .attr('width', W)
        .attr('height', H)
      svg.selectAll('*').remove()

      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      // Scales
      const xScale = d3.scaleLinear().domain([0, this.sweepMax]).range([0, iW])
      const drMax  = Math.max(1.5, d3.max(pts, p => Math.max(p.drH, p.drT)) ?? 1.5) * 1.05
      const yScale = d3.scaleLinear().domain([0, drMax]).range([iH, 0]).clamp(true)
      const yTI    = d3.scaleLinear().domain([0, 5]).range([iH, 0]).clamp(true)

      const CSS_PRIMARY  = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#00d4ff'
      const CSS_DANGER   = getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim()  || '#ef4444'
      const CSS_AMBER    = getComputedStyle(document.documentElement).getPropertyValue('--color-amber').trim()   || '#fbbf24'
      const CSS_BORDER   = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()  || 'rgba(255,255,255,0.1)'

      // Therapeutic window fill (drT > 0.85 AND drH < 0.50)
      const windowPts = pts.filter(p => p.drT >= 0.85 && p.drH < 0.50)
      if (windowPts.length >= 2 && windowPts[0] && windowPts[windowPts.length - 1]) {
        const x0 = xScale(windowPts[0]!.x)
        const x1 = xScale(windowPts[windowPts.length - 1]!.x)
        g.append('rect')
          .attr('x', x0).attr('y', 0)
          .attr('width', x1 - x0).attr('height', iH)
          .attr('fill', 'rgba(34,197,94,0.10)')
          .attr('stroke', 'rgba(34,197,94,0.35)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
      }

      // Threshold lines
      const threshLines = [
        { dr: 0.50, label: 'Rev-EP', color: CSS_AMBER,  dash: '4,3' },
        { dr: 0.85, label: '85%',    color: CSS_DANGER,  dash: '4,3' },
        { dr: 1.00, label: 'Lysis',  color: CSS_DANGER,  dash: '2,2' },
      ]
      for (const { dr, label, color, dash } of threshLines) {
        if (dr > drMax) continue
        const y = yScale(dr)
        g.append('line')
          .attr('x1', 0).attr('y1', y).attr('x2', iW).attr('y2', y)
          .attr('stroke', color).attr('stroke-width', 0.8)
          .attr('stroke-dasharray', dash).attr('opacity', 0.55)
        g.append('text')
          .attr('x', iW + 3).attr('y', y + 4)
          .attr('font-size', 9).attr('fill', color).attr('opacity', 0.75)
          .text(label)
      }

      // Current param cursor
      const curX = this.sweepParam === 'field'
        ? this.store.fieldIntensity
        : this.store.currentBroadcastFrequency
      if (curX <= this.sweepMax) {
        g.append('line')
          .attr('x1', xScale(curX)).attr('y1', 0)
          .attr('x2', xScale(curX)).attr('y2', iH)
          .attr('stroke', 'rgba(255,255,255,0.4)')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
        g.append('text')
          .attr('x', xScale(curX) + 3).attr('y', 10)
          .attr('font-size', 8.5).attr('fill', 'rgba(255,255,255,0.5)')
          .text('current')
      }

      // Line generators
      const lineGen = (yAcc: (p: SweepPoint) => number) =>
        d3.line<SweepPoint>().x(p => xScale(p.x)).y(p => yAcc(p)).curve(d3.curveBasis)

      // TI line (right axis, scaled to fit)
      g.append('path')
        .datum(pts)
        .attr('d', lineGen(p => yTI(p.ti)))
        .attr('fill', 'none')
        .attr('stroke', CSS_AMBER)
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '5,3')
        .attr('opacity', 0.65)

      // Healthy DR line
      g.append('path')
        .datum(pts)
        .attr('d', lineGen(p => yScale(p.drH)))
        .attr('fill', 'none')
        .attr('stroke', CSS_PRIMARY)
        .attr('stroke-width', 1.8)

      // Target DR line
      g.append('path')
        .datum(pts)
        .attr('d', lineGen(p => yScale(p.drT)))
        .attr('fill', 'none')
        .attr('stroke', CSS_DANGER)
        .attr('stroke-width', 2)

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(xScale).ticks(6).tickSize(3))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', 'rgba(255,255,255,0.55)').attr('font-size', 10))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // Y-axis (left — DR)
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickSize(3).tickFormat(d => `${(+d * 100).toFixed(0)}%`))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', 'rgba(255,255,255,0.55)').attr('font-size', 10))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // Y-axis (right — TI)
      g.append('g')
        .attr('transform', `translate(${iW},0)`)
        .call(d3.axisRight(yTI).ticks(5).tickSize(3).tickFormat(d => `${d}×`))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', CSS_AMBER).attr('font-size', 9).attr('opacity', 0.7))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // Axis labels
      g.append('text')
        .attr('x', iW / 2).attr('y', iH + 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', 'rgba(255,255,255,0.4)')
        .text(this.sweepParam === 'field' ? 'Field Intensity (V/cm)' : 'Frequency (kHz)')

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -iH / 2).attr('y', -40)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', 'rgba(255,255,255,0.4)')
        .text('Disruption Ratio')

      // Legend
      const legend = [
        { color: CSS_DANGER,  label: 'Target DR',  dash: '' },
        { color: CSS_PRIMARY, label: 'Healthy DR', dash: '' },
        { color: CSS_AMBER,   label: 'TI (right)', dash: '5,3' },
      ]
      legend.forEach(({ color, label, dash }, i) => {
        const lx = i * 90
        const lg = g.append('g').attr('transform', `translate(${lx},${iH + 30})`)
        lg.append('line')
          .attr('x1', 0).attr('x2', 16).attr('y1', -9).attr('y2', -9)
          .attr('stroke', color).attr('stroke-width', 2)
          .attr('stroke-dasharray', dash || 'none')
        lg.append('text')
          .attr('x', 20).attr('y', -5)
          .attr('font-size', 9).attr('fill', 'rgba(255,255,255,0.5)')
          .text(label)
      })
    },

    snapToWindow() {
      if (!this.windowRange) return
      const center = (this.windowRange.lo + this.windowRange.hi) / 2
      if (this.sweepParam === 'field') {
        this.store.setFieldIntensity(Math.round(center))
        broadcastFieldParams(this.store.currentBroadcastFrequency, Math.round(center), this.store.medium)
      } else {
        this.store.setBroadcastFreqKHz(Math.round(center))
        broadcastFieldParams(Math.round(center), this.store.fieldIntensity, this.store.medium)
      }
    },

    exportCSV() {
      const header = this.sweepParam === 'field'
        ? 'E_field_Vcm,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,therapeutic_window\n'
        : 'freq_kHz,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,therapeutic_window\n'
      const rows = this.sweepData.map(p => {
        const inWindow = p.drT >= 0.85 && p.drH < 0.50 ? 1 : 0
        return `${p.x.toFixed(2)},${p.drH.toFixed(4)},${p.drT.toFixed(4)},${p.ti.toFixed(4)},${p.tH.toFixed(2)},${p.tT.toFixed(2)},${inWindow}`
      })
      const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
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
@use '../../styles/mixins' as *;

.sweep-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;

  &__toggle {
    @include flex-row(0);
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s;

    &:hover { background: rgba(255,255,255,0.04); }
  }

  &__toggle-left {
    @include flex-row(0.6rem);
    align-items: center;
  }

  &__toggle-icon {
    font-size: 0.95rem;
    color: var(--color-primary);
  }

  &__toggle-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
  }

  &__toggle-sub {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__chevron {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    transition: transform 0.2s;
    &--open { transform: rotate(90deg); }
  }

  &__body {
    @include flex-col(0.75rem);
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-border);
  }

  &__controls {
    @include flex-row(1rem);
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
  }

  &__ctrl-group {
    @include flex-row(0.5rem);
    align-items: center;
  }

  &__ctrl-label {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__ctrl-unit {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__pills {
    @include flex-row(0.3rem);
  }

  &__pill {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    padding: 0.25rem 0.6rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-dim);
    }

    &:hover:not(&--active) { border-color: rgba(255,255,255,0.2); color: var(--color-text); }
  }

  &__input {
    width: 80px;
    padding: 0.22rem 0.45rem;
    font-size: 0.76rem;
    font-family: var(--font-mono);
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    text-align: right;
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__export-btn {
    margin-left: auto;
    font-size: 0.72rem;
    font-family: var(--font-mono);
    padding: 0.28rem 0.7rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }

  &__chart-wrap {
    width: 100%;
    min-height: 224px;
  }

  &__svg {
    display: block;
    width: 100%;
  }

  &__window-row {
    @include flex-row(0.6rem);
    align-items: center;
    flex-wrap: wrap;
    padding: 0.5rem 0.75rem;
    background: rgba(34,197,94,0.06);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: var(--radius);
    font-size: 0.78rem;
    gap: 0.4rem 0.7rem;

    &--none {
      background: rgba(255,255,255,0.03);
      border-color: var(--color-border);
      color: var(--color-text-muted);
      font-style: italic;
    }
  }

  &__window-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__window-val {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: rgb(34,197,94);
    font-weight: 600;
  }

  &__window-sub {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__snap-btn {
    margin-left: auto;
    font-size: 0.72rem;
    font-family: var(--font-mono);
    padding: 0.22rem 0.6rem;
    border-radius: 3px;
    border: 1px solid rgba(34,197,94,0.35);
    background: rgba(34,197,94,0.08);
    color: rgb(34,197,94);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.6); }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;

    th {
      text-align: left;
      padding: 0.35rem 0.6rem;
      font-size: 0.65rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    td {
      padding: 0.38rem 0.6rem;
      color: var(--color-text);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-family: var(--font-mono);
    }

    tr:last-child td { border-bottom: none; }
  }

  &__td-label { color: var(--color-text-muted); font-family: inherit; font-size: 0.75rem; }
  &__td--ok      { color: rgb(34,197,94); }
  &__td--warn    { color: var(--color-amber); }
  &__td--danger  { color: var(--color-danger); }
}
</style>
