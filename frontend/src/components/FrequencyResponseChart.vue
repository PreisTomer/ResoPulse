<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '../stores/cellStore'
import { computeSchwan, computeFc, MEDIA } from '../mockData'
import { CELL_PRESETS, GROUP_COLORS } from '../constants/cellLibrary'
import type { CellGroup } from '../constants/cellLibrary'
import { broadcastFieldParams } from '../services/socket'

// 200 logarithmically spaced Hz from 10 kHz to 500 MHz
const F_MIN_HZ = 10_000
const F_MAX_HZ = 500_000_000
const F_CURSOR_MAX_KHZ = 700  // matches slider max
const N_POINTS = 200

const MARGIN = { top: 18, right: 68, bottom: 38, left: 54 }

function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

const F_POINTS_HZ = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      _svg: null as d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
      _xScale: null as d3.ScaleLogarithmic<number, number> | null,
      _yScale: null as d3.ScaleLinear<number, number> | null,
      _chartW: 0,
      _chartH: 0,
      _resizeObserver: null as ResizeObserver | null,
      _tooltipData: null as { x: number; healthyVm: number; targetVm: number; freqHz: number } | null,
    }
  },

  computed: {
    groups(): CellGroup[] {
      return ['reference', 'cancer', 'bacteria', 'virus']
    },
  },

  watch: {
    'store.healthy': { handler() { this.updateChart() }, deep: true },
    'store.target':  { handler() { this.updateChart() }, deep: true },
    'store.fieldIntensity':  { handler() { this.updateChart() } },
    'store.medium':          { handler() { this.updateChart() } },
    'store.currentBroadcastFrequency': { handler() { this.updateCursor() } },
  },

  mounted() {
    this._resizeObserver = new ResizeObserver(() => {
      this.initChart()
      this.updateChart()
    })
    const el = this.$refs.chartEl as HTMLElement
    if (el) this._resizeObserver.observe(el)
  },

  beforeUnmount() {
    this._resizeObserver?.disconnect()
  },

  methods: {
    formatHz(hz: number): string {
      if (hz >= 1e6) return `${hz / 1e6}M`
      return `${hz / 1e3}k`
    },

    // ── Compute Vm curve for one cell ────────────────────────────────────
    computeCurve(cell: typeof this.store.healthy, sigma_e: number): { hz: number; vm: number }[] {
      return F_POINTS_HZ.map((hz) => ({
        hz,
        vm: computeSchwan(cell, hz / 1000, this.store.fieldIntensity, sigma_e) * 1000, // mV
      }))
    },

    // ── Full chart init (called on mount + resize) ───────────────────────
    initChart() {
      const container = this.$refs.chartEl as HTMLElement
      if (!container) return

      const totalW = container.clientWidth || 640
      const totalH = 260

      this._chartW = totalW - MARGIN.left - MARGIN.right
      this._chartH = totalH - MARGIN.top - MARGIN.bottom

      d3.select(container).selectAll('*').remove()

      const svgEl = d3.select(container)
        .append('svg')
        .attr('width', totalW)
        .attr('height', totalH)

      this._svg = svgEl

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'chart-g')

      // Scales
      this._xScale = d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW])
      this._yScale = d3.scaleLinear().domain([0, 100]).range([this._chartH, 0])

      // Grid lines (horizontal)
      g.append('g').attr('class', 'grid-h')

      // Axes
      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')

      // Axis labels
      g.append('text')
        .attr('class', 'axis-label-x')
        .attr('text-anchor', 'middle')
        .attr('x', this._chartW / 2)
        .attr('y', this._chartH + 32)
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '0.6rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('FREQUENCY (Hz)')

      g.append('text')
        .attr('class', 'axis-label-y')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`)
        .attr('x', -this._chartH / 2)
        .attr('y', -40)
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '0.6rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('Vm (mV)')

      // Curve groups (library first so they're below)
      g.append('g').attr('class', 'curves-library')
      g.append('g').attr('class', 'curves-active')

      // Threshold lines
      g.append('g').attr('class', 'thresholds')

      // fc markers
      g.append('g').attr('class', 'fc-markers')

      // Cursor
      g.append('line')
        .attr('class', 'cursor-line')
        .attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', 'rgba(255,255,255,0.85)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .style('cursor', 'ew-resize')

      g.append('rect')
        .attr('class', 'cursor-bg')
        .attr('y', -2).attr('height', 14).attr('rx', 2)
        .attr('fill', 'rgba(255,255,255,0.12)')

      g.append('text')
        .attr('class', 'cursor-label')
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.75)')
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')

      // Hover overlay (captures mouse events)
      g.append('rect')
        .attr('class', 'hover-overlay')
        .attr('width', this._chartW).attr('height', this._chartH)
        .attr('fill', 'transparent')
        .on('mousemove', (event: MouseEvent) => this.onHover(event))
        .on('mouseleave', () => { this._tooltipData = null })

      // Draggable handle on cursor area
      const dragBehavior = d3.drag<SVGLineElement, unknown>()
        .on('drag', (event) => {
          if (!this._xScale) return
          const xClamped = Math.max(0, Math.min(this._chartW, event.x))
          const hz = this._xScale.invert(xClamped)
          const khz = Math.max(10, Math.min(F_CURSOR_MAX_KHZ, hz / 1000))
          this.store.setBroadcastFreqKHz(Math.round(khz))
          broadcastFieldParams(Math.round(khz), this.store.fieldIntensity, this.store.medium)
        })

      g.select<SVGLineElement>('.cursor-line').call(dragBehavior)
    },

    // ── Full chart update (curves + axes + thresholds) ───────────────────
    updateChart() {
      if (!this._svg || !this._xScale || !this._yScale) return

      const sigma_e = MEDIA[this.store.medium].conductivity
      const g = this._svg.select<SVGGElement>('.chart-g')

      // Compute active-cell curves
      const healthyCurve = this.computeCurve(this.store.healthy, sigma_e)
      const targetCurve  = this.computeCurve(this.store.target,  sigma_e)

      // Auto-scale y
      const allVm = [...healthyCurve.map((d) => d.vm), ...targetCurve.map((d) => d.vm)]
      const maxVm = Math.ceil(Math.max(...allVm, 50) / 50) * 50
      this._yScale!.domain([0, maxVm])

      // Update axes
      const xAxis = d3.axisBottom<number>(this._xScale!)
        .tickValues([1e4, 1e5, 1e6, 1e7, 1e8, 5e8])
        .tickFormat((d) => this.formatHz(+d))
        .tickSize(4)

      const yAxis = d3.axisLeft<number>(this._yScale!)
        .ticks(5)
        .tickSize(4)

      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text-muted)').attr('font-size', '0.58rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      g.select<SVGGElement>('.y-axis')
        .call(yAxis)
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text-muted)').attr('font-size', '0.58rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      // Grid
      g.select<SVGGElement>('.grid-h')
        .call(
          d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(-this._chartW).tickFormat(() => ''),
        )
        .call((a) => a.select('.domain').remove())
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)'))

      // Line generator
      const lineGen = d3.line<{ hz: number; vm: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(d.vm))
        .curve(d3.curveBasis)

      // Library preset curves (faint background)
      const libGroup = g.select<SVGGElement>('.curves-library')
      libGroup.selectAll<SVGPathElement, typeof CELL_PRESETS[0]>('path.lib-curve')
        .data(CELL_PRESETS, (d) => d.presetId)
        .join('path')
        .attr('class', 'lib-curve')
        .attr('fill', 'none')
        .attr('stroke', (d) => GROUP_COLORS[d.group])
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.18)
        .attr('d', (d) => lineGen(this.computeCurve(d, sigma_e)) || '')

      // Active curves
      const activeGroup = g.select<SVGGElement>('.curves-active')
      activeGroup.selectAll('path').remove()

      activeGroup.append('path')
        .datum(healthyCurve)
        .attr('fill', 'none')
        .attr('stroke', '#00d4ff')
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 1)
        .attr('filter', 'drop-shadow(0 0 4px #00d4ff88)')
        .attr('d', lineGen)

      activeGroup.append('path')
        .datum(targetCurve)
        .attr('fill', 'none')
        .attr('stroke', '#ff4d6d')
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 1)
        .attr('filter', 'drop-shadow(0 0 4px #ff4d6d88)')
        .attr('d', lineGen)

      // Threshold lines
      const thrGroup = g.select<SVGGElement>('.thresholds')
      thrGroup.selectAll('*').remove()
      const thrData = [
        { label: 'thr H', vm: this.store.healthy.thresholdVoltage * 1000, color: '#00d4ff' },
        { label: 'thr T', vm: this.store.target.thresholdVoltage * 1000,  color: '#ff4d6d' },
      ]
      thrData.forEach(({ label, vm, color }) => {
        if (vm > maxVm) return
        const y = this._yScale!(vm)
        thrGroup.append('line')
          .attr('x1', 0).attr('x2', this._chartW)
          .attr('y1', y).attr('y2', y)
          .attr('stroke', color).attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.5)
        thrGroup.append('text')
          .attr('x', this._chartW + 4).attr('y', y + 4)
          .attr('fill', color).attr('font-size', '0.52rem')
          .attr('font-family', 'var(--font-mono)')
          .text(label)
      })

      // fc markers
      const fcGroup = g.select<SVGGElement>('.fc-markers')
      fcGroup.selectAll('*').remove()
      const fcData = [
        { fc: computeFc(this.store.healthy, sigma_e), color: '#00d4ff', label: 'fc(H)' },
        { fc: computeFc(this.store.target,  sigma_e), color: '#ff4d6d', label: 'fc(T)' },
      ]
      fcData.forEach(({ fc, color, label }) => {
        const hz = fc * 1000
        if (hz < F_MIN_HZ || hz > F_MAX_HZ) return
        const x = this._xScale!(hz)
        fcGroup.append('text')
          .attr('x', x).attr('y', this._chartH + 14)
          .attr('text-anchor', 'middle')
          .attr('fill', color).attr('font-size', '0.5rem')
          .attr('font-family', 'var(--font-mono)')
          .text('▲')
        fcGroup.append('text')
          .attr('x', x).attr('y', this._chartH + 24)
          .attr('text-anchor', 'middle')
          .attr('fill', color).attr('font-size', '0.48rem')
          .attr('font-family', 'var(--font-mono)')
          .text(label)
      })

      this.updateCursor()
    },

    // ── Cursor-only update (cheap) ───────────────────────────────────────
    updateCursor() {
      if (!this._svg || !this._xScale) return
      const g = this._svg.select<SVGGElement>('.chart-g')
      const hz = this.store.currentBroadcastFrequency * 1000
      const x = this._xScale(Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, hz)))

      g.select('.cursor-line').attr('x1', x).attr('x2', x)

      const label = `${this.store.currentBroadcastFrequency} kHz`
      const textEl = g.select<SVGTextElement>('.cursor-label')
      textEl.attr('x', x).text(label)

      const textWidth = (textEl.node()?.getComputedTextLength?.() ?? label.length * 5.5) + 8
      g.select('.cursor-bg')
        .attr('x', x - textWidth / 2)
        .attr('width', textWidth)
    },

    // ── Hover tooltip ────────────────────────────────────────────────────
    onHover(event: MouseEvent) {
      if (!this._xScale || !this._yScale) return
      const [mx] = d3.pointer(event)
      const hz = this._xScale.invert(mx)
      const khz = hz / 1000
      const sigma_e = MEDIA[this.store.medium].conductivity
      const hVm = computeSchwan(this.store.healthy, khz, this.store.fieldIntensity, sigma_e) * 1000
      const tVm = computeSchwan(this.store.target,  khz, this.store.fieldIntensity, sigma_e) * 1000
      this._tooltipData = { x: mx, freqHz: hz, healthyVm: hVm, targetVm: tVm }
    },
  },
})
</script>

<template>
  <div class="chart-wrap">
    <!-- Header: title + legend -->
    <div class="chart-header">
      <span class="chart-title">Transmembrane Potential Response</span>
      <div class="legend">
        <span v-for="g in groups" :key="g" class="legend-item">
          <span class="legend-dot" :style="{ background: `var(--group-${g})` }"></span>
          {{ { reference: 'Reference', cancer: 'Cancer', bacteria: 'Bacteria', virus: 'Virus' }[g] }}
        </span>
        <span class="legend-item"><span class="legend-line legend-line--h"></span> Active H</span>
        <span class="legend-item"><span class="legend-line legend-line--t"></span> Active T</span>
      </div>
    </div>

    <!-- D3 SVG container -->
    <div ref="chartEl" class="chart-el"></div>

    <!-- Hover tooltip -->
    <Transition name="tip">
      <div
        v-if="_tooltipData"
        class="hover-tip"
        :style="{ left: (_tooltipData.x + 54) + 'px' }"
      >
        <div class="tip-freq">{{ formatHz(_tooltipData.freqHz) }}Hz</div>
        <div class="tip-row tip-row--h">H {{ _tooltipData.healthyVm.toFixed(2) }} mV</div>
        <div class="tip-row tip-row--t">T {{ _tooltipData.targetVm.toFixed(2) }} mV</div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Expose group colors as CSS vars for the legend dots */
.chart-wrap {
  --group-reference: #00d4ff;
  --group-cancer:    #ff4d6d;
  --group-bacteria:  #fbbf24;
  --group-virus:     #a78bfa;

  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: visible;
  position: relative;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem 0.2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.chart-title {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  opacity: 0.75;
  white-space: nowrap;
}

.legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.56rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: 0.7;
  white-space: nowrap;
}
.legend-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  opacity: 0.5;
  flex-shrink: 0;
}
.legend-line {
  width: 14px; height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}
.legend-line--h { background: #00d4ff; box-shadow: 0 0 4px #00d4ff88; }
.legend-line--t { background: #ff4d6d; box-shadow: 0 0 4px #ff4d6d88; }

/* ── Chart container ─────────────────────────────────────────────────── */
.chart-el {
  width: 100%;
  height: 260px;
  position: relative;
}
.chart-el svg { display: block; }

/* ── Hover tooltip ───────────────────────────────────────────────────── */
.hover-tip {
  position: absolute;
  top: 32px;
  transform: translateX(-50%);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.35rem 0.55rem;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}
.tip-freq {
  font-size: 0.58rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  margin-bottom: 0.15rem;
}
.tip-row {
  font-size: 0.6rem;
  font-family: var(--font-mono);
}
.tip-row--h { color: #00d4ff; }
.tip-row--t { color: #ff4d6d; }

.tip-enter-active, .tip-leave-active { transition: opacity 0.1s; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
</style>
