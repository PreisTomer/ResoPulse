<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div ref="chartWrap" class="sweep-chart" v-tip="$t('sweep.tipChart')">
    <svg ref="svgEl" class="sweep-chart__svg"></svg>
    <div v-if="tooltip.visible" class="sweep-chart__tip" :style="tipStyle">
      <div class="sweep-chart__tip-x">{{ tooltip.xLabel }}</div>
      <div class="sweep-chart__tip-row sweep-chart__tip-row--target">
        <span>{{ $t('sweep.hoverTarget') }}</span><span>{{ tooltip.drT }}%</span>
      </div>
      <div class="sweep-chart__tip-row sweep-chart__tip-row--healthy">
        <span>{{ $t('sweep.hoverHealthy') }}</span><span>{{ tooltip.drH }}%</span>
      </div>
      <div class="sweep-chart__tip-row sweep-chart__tip-row--ti">
        <span>{{ $t('sweep.hoverTI') }}</span><span>{{ tooltip.ti }}×</span>
      </div>
      <div v-if="tooltip.inWindow" class="sweep-chart__tip-window">{{ $t('sweep.hoverInWindow') }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { mapStores } from 'pinia'

import * as d3 from 'd3'

import { useCellStore } from '@/stores/cellStore'

import { C } from '@/theme/colors'

import { THRESHOLDS } from '@/constants/physics'
import { UNIT } from '@/constants/units'

interface SweepPoint {
  x: number; drH: number; drT: number; ti: number; tH: number; tT: number
}

interface HoverTooltip {
  visible:   boolean
  xLabel:    string
  drH:       number
  drT:       number
  ti:        number
  inWindow:  boolean
  mouseLeft: number
  mouseTop:  number
}

const MARGIN        = { top: 18, right: 76, bottom: 38, left: 54 }
const MIN_LABEL_GAP = 13
const LEGEND_STEP   = 86

export default defineComponent({
  props: {
    sweepData:  { type: Array as PropType<SweepPoint[]>, required: true },
    sweepParam: { type: String as () => 'field' | 'freq', required: true },
    sweepMax:   { type: Number, required: true },
    open:       { type: Boolean, required: true },
  },

  data() {
    return {
      _resizeObs: null as ResizeObserver | null,
      // Stored after each _drawChart so hover methods can reconstruct scales.
      _iW:    0,
      _iH:    0,
      _drMax: 0,
      _tiMax: 0,
      tooltip: {
        visible:   false,
        xLabel:    '',
        drH:       0,
        drT:       0,
        ti:        0,
        inWindow:  false,
        mouseLeft: 0,
        mouseTop:  0,
      } as HoverTooltip,
    }
  },

  computed: {
    ...mapStores(useCellStore),

    tipStyle(): Record<string, string> {
      const wrap = this.$refs.chartWrap as HTMLElement | null
      if (!wrap) return {}
      const { mouseLeft, mouseTop } = this.tooltip
      const flipLeft = mouseLeft > wrap.clientWidth * 0.55
      return {
        left:  flipLeft ? '' : `${mouseLeft + 14}px`,
        right: flipLeft ? `${wrap.clientWidth - mouseLeft + 14}px` : '',
        top:   `${Math.max(4, mouseTop - 20)}px`,
      }
    },
  },

  watch: {
    open(v: boolean) {
      if (v) this.$nextTick(() => requestAnimationFrame(() => { this._initChart(); this._drawChart() }))
    },
    sweepData()  { if (this.open) this._drawChart() },
    sweepParam() { if (this.open) this._drawChart() },
    sweepMax()   { if (this.open) this._drawChart() },
    'cellStore.fieldIntensity'()            { if (this.open) this._drawChart() },
    'cellStore.currentBroadcastFrequency'() { if (this.open) this._drawChart() },
  },

  beforeUnmount() {
    this._resizeObs?.disconnect()
  },

  methods: {
    _initChart() {
      const wrap = this.$refs.chartWrap as HTMLElement
      if (!wrap || this._resizeObs) return
      const obs = new ResizeObserver(() => { if (this.open) this._drawChart() })
      obs.observe(wrap)
      this._resizeObs = obs
    },

    _drawChart() {
      const wrap  = this.$refs.chartWrap as HTMLElement
      const svgEl = this.$refs.svgEl    as SVGSVGElement
      if (!wrap || !svgEl) return

      const W = wrap.clientWidth
      if (W < 10) return
      const H  = 224
      const iW = W - MARGIN.left - MARGIN.right
      const iH = H - MARGIN.top  - MARGIN.bottom
      const pts = this.sweepData

      const svg = d3.select(svgEl).attr('width', W).attr('height', H)
      svg.selectAll('*').remove()
      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      const xScale = d3.scaleLinear().domain([0, this.sweepMax]).range([0, iW])
      const drMax  = Math.max(1.5, (d3.max(pts, p => Math.max(p.drH, p.drT)) ?? 1.5)) * 1.05
      const yScale = d3.scaleLinear().domain([0, drMax]).range([iH, 0]).clamp(true)
      const tiMax  = Math.max(5, (d3.max(pts, p => p.ti) ?? 5) * 1.05)
      const yTI    = d3.scaleLinear().domain([0, tiMax]).range([iH, 0]).clamp(true)

      // Store scale bounds so hover methods can reconstruct scales without storing D3 objects.
      this._iW    = iW
      this._iH    = iH
      this._drMax = drMax
      this._tiMax = tiMax

      const style       = getComputedStyle(document.documentElement)
      const CSS_PRIMARY = style.getPropertyValue('--color-primary').trim()
      const CSS_DANGER  = style.getPropertyValue('--color-danger').trim()
      const CSS_AMBER   = style.getPropertyValue('--color-amber').trim()
      const CSS_BORDER  = style.getPropertyValue('--color-border').trim()

      // ── Therapeutic window fill ───────────────────────────────────────────
      const windowPts = pts.filter(p =>
        p.drT >= THRESHOLDS.DISRUPTION_WARN && p.drH < THRESHOLDS.HEALTHY_APPROACHING
      )
      if (windowPts.length >= 2) {
        const x0 = xScale(windowPts[0]!.x)
        const x1 = xScale(windowPts[windowPts.length - 1]!.x)
        g.append('rect')
          .attr('x', x0).attr('y', 0)
          .attr('width', x1 - x0).attr('height', iH)
          .attr('fill', C.okFill10)
          .attr('stroke', C.okStroke35)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
      }

      // ── Threshold lines with label collision avoidance ───────────────────
      const threshLines = [
        { dr: THRESHOLDS.HEALTHY_APPROACHING, label: this.$t('chart.revEp'),    color: CSS_AMBER,  dash: '4,3' },
        { dr: THRESHOLDS.DISRUPTION_WARN,     label: this.$t('chart.thresh85'), color: CSS_DANGER, dash: '4,3' },
        { dr: THRESHOLDS.LYSIS_PROB_CENTER,   label: this.$t('chart.lysis'),    color: CSS_DANGER, dash: '2,2' },
      ]
      const threshLabels = threshLines
        .filter(({ dr }) => dr <= drMax)
        .map(({ dr, label, color, dash }) => ({ origY: yScale(dr), labelY: yScale(dr), label, color, dash }))
        .sort((a, b) => a.origY - b.origY)

      for (let i = threshLabels.length - 1; i > 0; i--) {
        const cur = threshLabels[i]!, prev = threshLabels[i - 1]!
        if (cur.labelY - prev.labelY < MIN_LABEL_GAP) prev.labelY = cur.labelY - MIN_LABEL_GAP
      }
      for (const { origY, labelY, label, color, dash } of threshLabels) {
        g.append('line')
          .attr('x1', 0).attr('y1', origY).attr('x2', iW).attr('y2', origY)
          .attr('stroke', color).attr('stroke-width', 0.8)
          .attr('stroke-dasharray', dash).attr('opacity', 0.55) // D3 attr — CSS vars not available; ≈ --op-muted
        g.append('text')
          .attr('x', iW - 4).attr('y', labelY + 3.5)
          .attr('font-size', 9).attr('text-anchor', 'end')
          .attr('fill', color).attr('opacity', 0.85) // intentional: threshold label slightly faded
          .text(label)
      }

      // ── Current param cursor ──────────────────────────────────────────────
      const curX = this.sweepParam === 'field'
        ? this.cellStore.fieldIntensity
        : this.cellStore.currentBroadcastFrequency
      if (curX <= this.sweepMax) {
        g.append('line')
          .attr('x1', xScale(curX)).attr('y1', 0)
          .attr('x2', xScale(curX)).attr('y2', iH)
          .attr('stroke', C.w40).attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
        g.append('text')
          .attr('x', xScale(curX) + 3).attr('y', 10)
          .attr('font-size', 8.5).attr('fill', C.w50)
          .text(this.$t('sweep.cursorCurrent'))
      }

      // ── Data lines ───────────────────────────────────────────────────────
      const lineGen = (yAcc: (p: SweepPoint) => number) =>
        d3.line<SweepPoint>().x(p => xScale(p.x)).y(p => yAcc(p)).curve(d3.curveBasis)

      g.append('path').datum(pts).attr('d', lineGen(p => yTI(p.ti)))
        .attr('fill', 'none').attr('stroke', CSS_AMBER)
        .attr('stroke-width', 1.2).attr('stroke-dasharray', '5,3').attr('opacity', 0.65) // intentional: TI overlay
      g.append('path').datum(pts).attr('d', lineGen(p => yScale(p.drH)))
        .attr('fill', 'none').attr('stroke', CSS_PRIMARY).attr('stroke-width', 1.8)
      g.append('path').datum(pts).attr('d', lineGen(p => yScale(p.drT)))
        .attr('fill', 'none').attr('stroke', CSS_DANGER).attr('stroke-width', 2)

      // ── Axes ──────────────────────────────────────────────────────────────
      g.append('g').attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(xScale).ticks(6).tickSize(3))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', C.w55).attr('font-size', 10))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickSize(3).tickFormat(d => `${(+d * 100).toFixed(0)}%`))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', C.w55).attr('font-size', 10))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      g.append('g').attr('transform', `translate(${iW},0)`)
        .call(d3.axisRight(yTI).ticks(4).tickSize(3).tickFormat(d => `${+d}×`))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', CSS_AMBER).attr('font-size', 9).attr('opacity', 0.7)) // intentional: TI axis muted
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // ── Axis labels ───────────────────────────────────────────────────────
      g.append('text').attr('x', iW / 2).attr('y', iH + 30)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.w40)
        .text(this.sweepParam === 'field'
          ? `${this.$t('sweep.axisFieldIntensity')} (${UNIT.V_PER_CM})`
          : `${this.$t('sweep.axisFrequency')} (${UNIT.KHZ})`)

      g.append('text').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -40)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', C.w40)
        .text(this.$t('sweep.axisDisruptionRatio'))

      // ── Legend — right-anchored ───────────────────────────────────────────
      const legend = [
        { color: CSS_DANGER,  label: this.$t('sweep.legendTargetDr'),  dash: '' },
        { color: CSS_PRIMARY, label: this.$t('sweep.legendHealthyDr'), dash: '' },
        { color: CSS_AMBER,   label: this.$t('sweep.legendTI'),        dash: '5,3' },
      ]
      legend.forEach(({ color, label, dash }, i) => {
        const lx = iW - (legend.length - 1 - i) * LEGEND_STEP
        const lg = g.append('g').attr('transform', `translate(${lx},${iH + 30})`)
        lg.append('line').attr('x1', 0).attr('x2', 16).attr('y1', -9).attr('y2', -9)
          .attr('stroke', color).attr('stroke-width', 2).attr('stroke-dasharray', dash || 'none')
        lg.append('text').attr('x', 20).attr('y', -5)
          .attr('font-size', 9).attr('fill', C.w50).text(label)
      })

      // ── Hover layer — group first, overlay rect on top ────────────────────
      // The group is populated by _onHoverMove; overlay captures mouse events.
      g.append('g').attr('class', 'sweep-hover')

      g.append('rect')
        .attr('width', iW).attr('height', iH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => this._onHoverMove(event, pts))
        .on('mouseleave', () => this._onHoverLeave())
    },

    _onHoverMove(event: MouseEvent, pts: SweepPoint[]): void {
      if (!pts.length) return

      const [px] = d3.pointer(event)
      const xVal = Math.max(0, Math.min(
        d3.scaleLinear().domain([0, this.sweepMax]).range([0, this._iW]).invert(px),
        this.sweepMax,
      ))

      // Find nearest data point by x value
      const bisect = d3.bisector((p: SweepPoint) => p.x).center
      const idx    = Math.max(0, Math.min(bisect(pts, xVal), pts.length - 1))
      const pt     = pts[idx]!

      // Reconstruct scales from stored domain bounds
      const xScale = d3.scaleLinear().domain([0, this.sweepMax]).range([0, this._iW])
      const yScale = d3.scaleLinear().domain([0, this._drMax]).range([this._iH, 0]).clamp(true)
      const yTI    = d3.scaleLinear().domain([0, this._tiMax]).range([this._iH, 0]).clamp(true)

      const style      = getComputedStyle(document.documentElement)
      const cssPrimary = style.getPropertyValue('--color-primary').trim()
      const cssDanger  = style.getPropertyValue('--color-danger').trim()
      const cssAmber   = style.getPropertyValue('--color-amber').trim()

      // Update hover indicator in the pre-created group
      const svgEl  = this.$refs.svgEl as SVGSVGElement
      const hoverG = d3.select(svgEl).select<SVGGElement>('.sweep-hover')
      hoverG.selectAll('*').remove()

      hoverG.append('line')
        .attr('x1', xScale(pt.x)).attr('y1', 0)
        .attr('x2', xScale(pt.x)).attr('y2', this._iH)
        .attr('stroke', C.w50).attr('stroke-width', 0.8).attr('opacity', 0.35) // intentional: subtle guide

      hoverG.append('circle')
        .attr('cx', xScale(pt.x)).attr('cy', yScale(pt.drH)).attr('r', 3)
        .attr('fill', 'none').attr('stroke', cssPrimary).attr('stroke-width', 1.5)
      hoverG.append('circle')
        .attr('cx', xScale(pt.x)).attr('cy', yScale(pt.drT)).attr('r', 3)
        .attr('fill', 'none').attr('stroke', cssDanger).attr('stroke-width', 1.5)
      hoverG.append('circle')
        .attr('cx', xScale(pt.x)).attr('cy', yTI(pt.ti)).attr('r', 2.5)
        .attr('fill', 'none').attr('stroke', cssAmber).attr('stroke-width', 1.2)

      const wrapRect = (this.$refs.chartWrap as HTMLElement).getBoundingClientRect()
      const unit     = this.sweepParam === 'field' ? UNIT.V_PER_CM : UNIT.KHZ

      this.tooltip = {
        visible:   true,
        xLabel:    `${pt.x.toFixed(0)} ${unit}`,
        drH:       Math.round(pt.drH * 100),
        drT:       Math.round(pt.drT * 100),
        ti:        parseFloat(pt.ti.toFixed(1)),
        inWindow:  pt.drT >= THRESHOLDS.DISRUPTION_WARN && pt.drH < THRESHOLDS.HEALTHY_APPROACHING,
        mouseLeft: event.clientX - wrapRect.left,
        mouseTop:  event.clientY - wrapRect.top,
      }
    },

    _onHoverLeave(): void {
      const svgEl = this.$refs.svgEl as SVGSVGElement | null
      if (svgEl) d3.select(svgEl).select('.sweep-hover').selectAll('*').remove()
      this.tooltip.visible = false
    },
  },
})
</script>

<style lang="scss" scoped>
.sweep-chart {
  position: relative;
  width: 100%;
  min-height: 224px;
  cursor: help;

  &__svg {
    display: block;
    width: 100%;
  }

  &__tip {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.35rem 0.5rem;
    @include flex-col(0.2rem);
    min-width: 120px;

    &-x {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 0.1rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.2rem;
    }

    &-row {
      @include flex-between();
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      gap: 0.6rem;

      &--target  { color: var(--color-danger); }
      &--healthy { color: var(--color-primary); }
      &--ti      { color: var(--color-amber); }
    }

    &-window {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      color: var(--color-ok);
      letter-spacing: 0.04em;
      margin-top: 0.1rem;
      border-top: 1px solid var(--color-border);
      padding-top: 0.2rem;
    }
  }
}
</style>
