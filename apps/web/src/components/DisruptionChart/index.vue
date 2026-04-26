<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="dr-chart">
    <div class="dr-chart__header">
      <span class="dr-chart__title" v-tip="$t('drChart.tipTitle')">{{ $t('drChart.title') }}</span>
      <div class="dr-chart__header-right">
        <span
          class="dr-chart__therm-chip"
          :class="`dr-chart__therm-chip--${thermalZone}`"
          v-tip="$t('drChart.thermChipTip')"
        >
          <span class="dr-chart__therm-label">{{ $t('drChart.thermChipLabel') }}</span>
          <span class="dr-chart__therm-val">{{ peakTempDisplay }}</span>
          <span class="dr-chart__therm-zone">{{ thermalZoneLabel }}</span>
        </span>
        <button
          class="dr-chart__zoom-btn"
          :class="{ 'dr-chart__zoom-btn--active': zoomMode }"
          v-tip="$t('drChart.zoomTip')"
          @click="toggleZoom"
        >{{ zoomMode ? $t('drChart.zoomFull') : $t('drChart.zoomIn') }}</button>
        <DrChartLegend />
      </div>
    </div>
    <div v-if="showDisclaimer" class="dr-chart__disclaimer">
      <span class="dr-chart__disclaimer-icon">{{ warningIcon }}</span>
      <span class="dr-chart__disclaimer-text">{{ isDisclaimerBacteriaVirus ? $t('drChart.disclaimerBacteriaVirus') : $t('drChart.disclaimerLowField') }}</span>
    </div>
    <div ref="chartEl" class="dr-chart__svg-wrap">
      <DrChartTooltip :info="hoverInfo" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'
import { mapStores } from 'pinia'

import * as d3 from 'd3'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { C } from '@/theme/colors'

import { CELL_CATEGORY } from '@/constants/strings'
import { THRESHOLDS, THERMAL_MA_PEAK_C, THERM_NOURISH_ENTER_C } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

import DrChartLegend from './DrChartLegend.vue'
import DrChartTooltip from './DrChartTooltip.vue'
import type { HoverInfo } from './DrChartTooltip.vue'
import {
  F_MIN_HZ, F_MAX_HZ, Y_MIN_MAX, Y_ZOOM_MIN, DR_HEADROOM, DR_DISCLAIMER_PCT,
  MARGIN, X_TICK_VALUES, DR_REV_EP, DR_LYSIS,
  type CurvePoint, formatHz, computeCurves, effectiveVth,
} from './drChartCompute'

export default defineComponent({
  components: { DrChartLegend, DrChartTooltip },

  data() {
    return {
      _svg:                    null as d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
      _xScale:                 null as d3.ScaleLogarithmic<number, number> | null,
      _yScale:                 null as d3.ScaleLinear<number, number> | null,
      _chartW:                 0,
      _chartH:                 0,
      _cursorX:                0,
      _resizeObserver:         null as ResizeObserver | null,
      _curveData:              [] as CurvePoint[],
      hoverInfo:               null as HoverInfo | null,
      zoomMode:                false,
      showDisclaimer:          false,
      isDisclaimerBacteriaVirus: false,
    }
  },

  computed: {
    ...mapStores(useCellStore),
    ICON() { return ICON },

    warningIcon(): string { return ICON.WARNING },

    peakSteadyStateTemp(): number {
      return Math.max(this.cellStore.healthySteadyStateTemp, this.cellStore.targetSteadyStateTemp)
    },

    peakTempDisplay(): string {
      return `${this.peakSteadyStateTemp.toFixed(1)}${UNIT.DEG_C}`
    },

    thermalZone(): 'cool' | 'nourish' | 'warm' | 'hot' {
      const t = this.peakSteadyStateTemp
      if (t >= THRESHOLDS.TEMP_WARN) return 'hot'
      if (t >= THERMAL_MA_PEAK_C)    return 'warm'
      if (t >= THERM_NOURISH_ENTER_C) return 'nourish'
      return 'cool'
    },

    thermalZoneLabel(): string {
      const key: Record<typeof this.thermalZone, string> = {
        cool:    this.$t('drChart.thermZoneCool'),
        nourish: this.$t('drChart.thermZoneNourish'),
        warm:    this.$t('drChart.thermZoneWarm'),
        hot:     this.$t('drChart.thermZoneHot'),
      }
      return key[this.thermalZone]
    },

    physicsKey(): string {
      const s = this.cellStore
      const t = s.target as { resonantFreqGHz?: number }
      return [
        s.healthy.id, s.healthy.radius, s.healthy.membraneThickness,
        s.healthy.dielectricConstant, s.healthy.conductivity, s.healthy.thresholdVoltage,
        s.target.id, s.target.radius, s.target.membraneThickness,
        s.target.dielectricConstant, s.target.conductivity, s.target.thresholdVoltage,
        t.resonantFreqGHz ?? 0,
        s.fieldIntensity, s.medium, s.waveform, s.dutyCycle, s.pulseWidthNs,
        s.chartMode, s.orientationDeg, s.healthyTemp, s.targetTemp, s.effectivePulseCount, s.resetCounter,
      ].join('|')
    },
  },

  watch: {
    physicsKey()                          { this.updateChart() },
    'cellStore.currentBroadcastFrequency'() { this.updateCursor() },
  },

  mounted() {
    this._resizeObserver = markRaw(new ResizeObserver(() => {
      this.initChart()
      this.updateChart()
    }))
    const el = this.$refs.chartEl as HTMLElement
    if (el) this._resizeObserver.observe(el)
  },

  beforeUnmount() {
    this._resizeObserver?.disconnect()
  },

  methods: {
    toggleZoom() {
      this.zoomMode = !this.zoomMode
      this.updateChart()
    },

    initChart() {
      const container = this.$refs.chartEl as HTMLElement
      if (!container) return

      const totalW = container.clientWidth || 600
      const totalH = 220

      this._chartW = totalW - MARGIN.left - MARGIN.right
      this._chartH = totalH - MARGIN.top  - MARGIN.bottom

      d3.select(container).selectAll('svg').remove()

      const svgEl = d3.select(container)
        .append('svg')
        .attr('width',  totalW)
        .attr('height', totalH)
        .style('overflow', 'hidden')

      this._svg    = markRaw(svgEl)
      this._xScale = markRaw(d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW]))
      this._yScale = markRaw(d3.scaleLinear().domain([0, Y_MIN_MAX]).range([this._chartH, 0]))

      const clipId = `dr-clip-${this._chartW}`
      svgEl.append('defs').append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW)
        .attr('height', this._chartH)

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'dr-g')

      const gc = g.append('g')
        .attr('class', 'dr-gc')
        .attr('clip-path', `url(#${clipId})`)

      gc.append('g').attr('class', 'grid-h')
      gc.append('g').attr('class', 'window-fill')
      gc.append('line').attr('class', 'thresh-rev-ep')
      gc.append('line').attr('class', 'thresh-lysis')
      gc.append('path').attr('class', 'curve-healthy')
      gc.append('path').attr('class', 'curve-target')
      gc.append('line').attr('class', 'cursor-line')

      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')

      g.append('text')
        .attr('class', 'axis-label-x')
        .attr('text-anchor', 'middle')
        .attr('x', this._chartW / 2)
        .attr('y', this._chartH + 38)
        .text('Frequency')
      g.append('text')
        .attr('class', 'axis-label-y')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(-38,${this._chartH / 2}) rotate(-90)`)
        .text('DR (%)')

      // Off-screen lysis threshold label — shown in zoom mode when 85% line exits chart top
      g.append('text')
        .attr('class', 'offscreen-lysis-label')
        .attr('x', this._chartW)
        .attr('y', -4)
        .attr('text-anchor', 'end')
        .attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.06em')
        .attr('fill', C.danger)
        .attr('opacity', 0)

      g.append('text')
        .attr('class', 'cursor-drag-hint')
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', C.w55)
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.08em')
        .attr('pointer-events', 'none')
        .text(this.$t('chart.dragHint'))

      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          if (!this._xScale) return
          const xClamped = Math.max(0, Math.min(this._chartW, event.x))
          const hz = this._xScale.invert(xClamped)
          const khz = Math.max(10, Math.min(F_MAX_HZ / 1000, hz / 1000))
          this.cellStore.setBroadcastFreqKHz(Math.round(khz))
          broadcastStateSync()
        })

      g.append('rect')
        .attr('class', 'hover-overlay')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW)
        .attr('height', this._chartH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => this.onHover(event))
        .on('mouseleave', () => { this.hoverInfo = null })
        .call(dragBehavior)
    },

    updateChart() {
      const g = this._svg?.select<SVGGElement>('.dr-g')
      if (!g || !this._xScale || !this._yScale) return

      const gc = g.select<SVGGElement>('.dr-gc')
      const xS = this._xScale
      const yS = this._yScale
      const W  = this._chartW

      // ── Compute curves ────────────────────────────────────────────────────
      const isAcousticTarget = this.cellStore.targetCellCategory === CELL_CATEGORY.BACTERIA
        || this.cellStore.targetCellCategory === CELL_CATEGORY.VIRUS

      const hfireMult = this.cellStore.hFireMultiplier
      // Resonance targets store their threshold in V/cm (resonantThresholdVcm); Schwan targets in V.
      const tRes = this.cellStore.target as { resonantThresholdVcm?: number }
      // Mirror cellStore.targetDisruptionRatio gate: resonantThresholdVcm is V/cm and mis-used as V in Schwan would blow up DR.
      const isAcousticRes = isAcousticTarget && !!tRes.resonantThresholdVcm && this.cellStore.isResonanceMode
      const tNominalVth = isAcousticRes
        ? tRes.resonantThresholdVcm!
        : this.cellStore.target.thresholdVoltage
      // H-FIRE bipolar charge cancellation is an EP membrane-charging mechanism only.
      // Acoustic resonance disruption is mechanical — hfireMult must NOT apply to the resonant threshold.
      const tHfireMult = isAcousticRes ? 1.0 : hfireMult
      const data = computeCurves(
        this.cellStore.effectiveHealthy, this.cellStore.effectiveTarget,
        this.cellStore.fieldIntensity, this.cellStore.effectiveSigmaE, this.cellStore.cosThetaFactor,
        this.cellStore.pulseEnvelopeFactorHealthy, this.cellStore.pulseEnvelopeFactorTarget,
        this.cellStore.isResonanceMode,
        isAcousticTarget,
        effectiveVth(this.cellStore.healthy.thresholdVoltage, this.cellStore.healthyTemp, hfireMult, this.cellStore.effectivePulseCount),
        effectiveVth(tNominalVth, this.cellStore.targetTemp, tHfireMult, isAcousticRes ? 1 : this.cellStore.effectivePulseCount),
      )
      this._curveData = data
      const peakDR = data.reduce((m, d) => Math.max(m, d.hDR, d.tDR), 0)

      // ── Disclaimer: show in full-scale mode when chart is informationally flat ──
      this.showDisclaimer   = !this.zoomMode && !this.cellStore.isResonanceMode && peakDR < DR_DISCLAIMER_PCT
      this.isDisclaimerBacteriaVirus = isAcousticTarget

      // ── Dynamic Y domain ──────────────────────────────────────────────────
      const yMax = this.zoomMode
        ? Math.max(Y_ZOOM_MIN, peakDR * DR_HEADROOM)
        : Math.max(Y_MIN_MAX, peakDR * DR_HEADROOM)
      yS.domain([0, yMax])

      // Off-screen lysis label: visible in zoom mode when 85% line is above yMax
      const lysisOffscreen = this.zoomMode && DR_LYSIS > yMax
      g.select<SVGTextElement>('.offscreen-lysis-label')
        .attr('opacity', lysisOffscreen ? 0.85 : 0)
        .text(lysisOffscreen ? this.$t('drChart.offscreenLysis') : '')

      // ── Axes ──────────────────────────────────────────────────────────────
      const xAxis = d3.axisBottom(xS)
        .tickValues(X_TICK_VALUES)
        .tickFormat((d) => formatHz(+d))
      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .selectAll<SVGTextElement, unknown>('text')
        .style('fill', C.textMuted)
        .style('font-size', '0.62rem')
        .attr('transform', 'rotate(-35)')
        .attr('text-anchor', 'end')
        .attr('dy', '0.5em')
        .attr('dx', '-0.3em')

      const yAxis = d3.axisLeft(yS)
        .ticks(5)
        .tickFormat((d) => `${d}%`)
      g.select<SVGGElement>('.y-axis')
        .call(yAxis)
        .selectAll('text')
        .style('fill', C.textMuted)
        .style('font-size', '0.7rem')

      g.selectAll('.domain, .tick line').style('stroke', C.border)

      // ── Horizontal grid ───────────────────────────────────────────────────
      gc.select<SVGGElement>('.grid-h')
        .call(
          d3.axisLeft(yS)
            .ticks(5)
            .tickSize(-W)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .style('stroke', 'color-mix(in srgb, var(--color-border) 40%, transparent)')
        .style('stroke-dasharray', '3,3')
      gc.select('.grid-h .domain').remove()

      // ── Therapeutic window fill ───────────────────────────────────────────
      const areaFn = d3.area<CurvePoint>()
        .x((d) => xS(d.hz))
        .y0(yS(DR_LYSIS))
        .y1((d) => yS(d.tDR))
        .curve(d3.curveLinear)

      const windowGroup = gc.select<SVGGElement>('.window-fill')
      windowGroup.selectAll('*').remove()

      const segments: CurvePoint[][] = []
      let seg: CurvePoint[] = []
      for (const pt of data) {
        if (pt.tDR >= DR_LYSIS && pt.hDR < DR_REV_EP) {
          seg.push(pt)
        } else if (seg.length > 0) {
          segments.push(seg)
          seg = []
        }
      }
      if (seg.length > 0) segments.push(seg)

      for (const s of segments) {
        if (s.length < 2) continue
        windowGroup.append('path')
          .datum(s)
          .attr('d', areaFn)
          .style('fill', 'color-mix(in srgb, var(--color-lime) 12%, transparent)')
          .attr('stroke', 'none')
      }

      // ── Threshold lines ───────────────────────────────────────────────────
      gc.select<SVGLineElement>('.thresh-rev-ep')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_REV_EP)).attr('y2', yS(DR_REV_EP))
        .style('stroke', C.amber)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      gc.select<SVGLineElement>('.thresh-lysis')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_LYSIS)).attr('y2', yS(DR_LYSIS))
        .style('stroke', C.danger)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      // ── Curves ────────────────────────────────────────────────────────────
      const lineFnH = d3.line<CurvePoint>()
        .x((d) => xS(d.hz))
        .y((d) => yS(d.hDR))
        .curve(d3.curveLinear)

      const lineFnT = d3.line<CurvePoint>()
        .x((d) => xS(d.hz))
        .y((d) => yS(d.tDR))
        .curve(d3.curveLinear)

      gc.select<SVGPathElement>('.curve-healthy')
        .datum(data)
        .attr('d', lineFnH)
        .attr('fill', 'none')
        .attr('stroke', C.primary)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      gc.select<SVGPathElement>('.curve-target')
        .datum(data)
        .attr('d', lineFnT)
        .attr('fill', 'none')
        .attr('stroke', C.danger)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      this.updateCursor()
    },

    updateCursor() {
      const gc = this._svg?.select<SVGGElement>('.dr-gc')
      const g  = this._svg?.select<SVGGElement>('.dr-g')
      if (!gc || !g || !this._xScale) return

      const freqHz = this.cellStore.currentBroadcastFrequency * 1000
      const cx     = this._xScale(Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, freqHz)))

      this._cursorX = cx

      gc.select<SVGLineElement>('.cursor-line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', 0).attr('y2', this._chartH)
        .style('stroke', C.w30)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3,3')

      g.select<SVGTextElement>('.cursor-drag-hint')
        .attr('x', cx)
    },

    onHover(event: MouseEvent) {
      if (!this._xScale || !this._yScale || !this._curveData.length) return

      const container = this.$refs.chartEl as HTMLElement
      const rect = container.getBoundingClientRect()
      const mouseX = event.clientX - rect.left - MARGIN.left

      const overlay = this._svg?.select<SVGRectElement>('.hover-overlay')

      if (Math.abs(mouseX - this._cursorX) < 20) {
        overlay?.style('cursor', 'ew-resize')
        this.hoverInfo = null
        return
      }
      overlay?.style('cursor', 'crosshair')

      const mouseHz = this._xScale.invert(mouseX)
      const bisect  = d3.bisector<CurvePoint, number>((d) => d.hz).left
      const idx     = Math.max(0, Math.min(
        this._curveData.length - 1,
        bisect(this._curveData, mouseHz),
      ))
      const pt = this._curveData[idx]
      if (!pt) return

      const tooltipX = event.clientX - rect.left + 10
      const tooltipY = event.clientY - rect.top  - 10

      this.hoverInfo = {
        x:    tooltipX,
        y:    tooltipY,
        freq: formatHz(pt.hz),
        tDR:  pt.tDR.toFixed(1),
        hDR:  pt.hDR.toFixed(1),
      }
    },
  },
})
</script>

<style lang="scss" scoped>

.dr-chart {
  @include surface-card(8px, 0.75rem 0.75rem 0.5rem);

  &__header {
    @include flex-between();
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  &__header-right {
    @include flex-row(0.5rem);
  }

  &__title {
    @include mono-upper(0.68rem, 0.08em);
    color: var(--color-text-muted);
    cursor: default;
  }

  &__zoom-btn {
    @include mono-upper(var(--fs-xxs), 0.07em);
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);

    &:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &--active {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
  }

  &__svg-wrap {
    position: relative;
    width: 100%;

    :deep(text) {
      fill: var(--color-text-muted);
    }

    :deep(.axis-label-x),
    :deep(.axis-label-y) {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      fill: var(--color-text-muted);
    }
  }

  &__disclaimer {
    @include flex-row(0.4rem);
    align-items: flex-start;
    margin: 0 0 0.4rem 0;
    @include tinted-surface(amber, 30%, 7%);
    border-width: 1px;
    border-style: solid;
    border-radius: var(--radius);
    padding: 0.4rem 0.6rem;
  }

  &__disclaimer-icon {
    font-size: var(--fs-sm);
    color: var(--color-amber);
    flex-shrink: 0;
    line-height: 1.4;
  }

  &__disclaimer-text {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__therm-chip {
    @include flex-row(0.3rem);
    align-items: center;
    padding: 0.18rem 0.5rem;
    border-radius: 3px;
    border: 1px solid;
    font-family: var(--font-mono);
    cursor: help;
    flex-shrink: 0;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);

    &--cool    { @include color-variant(text-muted, 25%, 4%); }
    &--nourish { @include color-variant(lime,       35%, 10%); }
    &--warm    { @include color-variant(amber,      40%, 10%); }
    &--hot     { @include color-variant(danger,     50%, 12%); animation: therm-pulse 1.8s ease-in-out infinite; }
  }

  &__therm-label {
    @include mono-upper(0.55rem, 0.08em);
    opacity: var(--op-dim);
  }

  &__therm-val {
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  &__therm-zone {
    @include mono-upper(0.55rem, 0.08em);
    opacity: var(--op-partial);
  }
}

@keyframes therm-pulse {
  0%, 100% { filter: brightness(1); }
  50%      { filter: brightness(1.25); }
}
</style>
