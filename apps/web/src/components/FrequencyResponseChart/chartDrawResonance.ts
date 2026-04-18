// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import * as d3 from 'd3'

import { computeResonantLineshape } from '@/utils/physics'

import { C } from '@/theme/colors'
import { UNIT } from '@/constants/units'

import type { CellConfig } from '@/types/cell'

import { DEFAULT_CAPSID_Q } from '@/constants/physics'

import { logspace } from './chartCompute'
import { drawResonanceThreshold } from './chartDrawThresholds'
import { drawResonanceFcMarker } from './chartDrawFcMarkers'

export interface ResonanceDrawParams {
  g: d3.Selection<SVGGElement, unknown, null, undefined>
  xScale: d3.ScaleLogarithmic<number, number>
  yScale: d3.ScaleLinear<number, number>
  chartW: number
  chartH: number
  target: CellConfig
  fieldIntensity: number
  drOneLabel: string
  t18n: (key: string) => string
}

export function drawResonanceChart(params: ResonanceDrawParams): void {
  const { g, xScale, yScale, chartW, chartH, target: t, fieldIntensity: E, drOneLabel } = params

  if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return

  const f0_hz = t.resonantFreqGHz * 1e9
  const Q     = t.capsidQ ?? DEFAULT_CAPSID_Q
  const Qmin  = t.capsidQMin ?? Q
  const Qmax  = t.capsidQMax ?? Q
  const Ethr  = t.resonantThresholdVcm

  const fMin = f0_hz * 0.01
  const fMax = f0_hz * 100
  const freqPoints = logspace(fMin, fMax, 200)
  xScale.domain([fMin, fMax])

  const lorCurve = freqPoints.map((hz) => ({ hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Q,    hz) * (E / Ethr) }))
  const lorQmin  = freqPoints.map((hz) => ({ hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Qmin, hz) * (E / Ethr) }))
  const lorQmax  = freqPoints.map((hz) => ({ hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Qmax, hz) * (E / Ethr) }))

  const maxDr = Math.max(...lorQmin.map((d) => d.dr), 1.2)
  yScale.domain([0, Math.ceil(maxDr * 10) / 10])

  const logMin = Math.floor(Math.log10(fMin))
  const logMax = Math.ceil(Math.log10(fMax))
  const tickVals: number[] = []
  for (let exp = logMin; exp <= logMax; exp++) {
    const p = Math.pow(10, exp)
    if (p >= fMin && p <= fMax) tickVals.push(p)
  }
  if (!tickVals.some((v) => Math.abs(v - f0_hz) / f0_hz < 0.05)) tickVals.push(f0_hz)
  tickVals.sort((a, b) => a - b)

  const formatResHz = (hz: number): string => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(hz >= 10e9 ? 0 : 1)}G`
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(hz >= 100e6 ? 0 : 1)}M`
    return `${(hz / 1e3).toFixed(0)}k`
  }

  g.select<SVGGElement>('.x-axis')
    .call(d3.axisBottom<number>(xScale).tickValues(tickVals).tickFormat(formatResHz).tickSize(4))
    .call((a) => a.select('.domain').attr('stroke', C.w15))
    .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
    .call((a) => a.selectAll('line').attr('stroke', C.w20))

  g.select<SVGGElement>('.y-axis')
    .call(d3.axisLeft<number>(yScale).ticks(5).tickSize(4))
    .call((a) => a.select('.domain').attr('stroke', C.w15))
    .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
    .call((a) => a.selectAll('line').attr('stroke', C.w20))

  g.select<SVGGElement>('.grid-h')
    .call(d3.axisLeft<number>(yScale).ticks(5).tickSize(-chartW).tickFormat(() => ''))
    .call((a) => a.select('.domain').remove())
    .call((a) => a.selectAll('line').attr('stroke', C.w06))

  g.select<SVGGElement>('.sel-curve').selectAll('*').remove()
  g.select<SVGGElement>('.y-right-axis').selectAll('*').remove()
  g.select<SVGGElement>('.curves-library').selectAll('*').remove()
  g.select<SVGGElement>('.curves-nuclear').selectAll('*').remove()
  g.select<SVGGElement>('.dep-curves').selectAll('*').remove()
  g.select<SVGGElement>('.dep-crossover').selectAll('*').remove()
  g.select<SVGGElement>('.y-dep-axis').selectAll('*').remove()
  g.select('.axis-label-dep').attr('opacity', 0)

  const drLineGen = d3.line<{ hz: number; dr: number }>()
    .x((d) => xScale(d.hz))
    .y((d) => yScale(d.dr))
    .curve(d3.curveBasis)

  const activeGroup = g.select<SVGGElement>('.curves-active')
  activeGroup.selectAll('*').remove()

  if (Qmin !== Qmax) {
    const areaGen = d3.area<{ hz: number; drLow: number; drHigh: number }>()
      .x((d) => xScale(d.hz))
      .y0((d) => yScale(d.drLow))
      .y1((d) => yScale(d.drHigh))
      .curve(d3.curveBasis)

    const bandData = freqPoints.map((hz, i) => ({
      hz,
      drLow:  lorQmax[i]!.dr,  // higher Q → narrower → smaller off-resonance
      drHigh: lorQmin[i]!.dr,  // lower Q  → broader  → larger off-resonance
    }))

    activeGroup.append('path')
      .datum(bandData)
      .attr('fill', C.danger)
      .attr('fill-opacity', 0.08)
      .attr('d', areaGen)

    activeGroup.append('path')
      .datum(lorQmax)
      .attr('fill', 'none').attr('stroke', C.danger)
      .attr('stroke-width', 1).attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '3,4').attr('d', drLineGen)

    activeGroup.append('path')
      .datum(lorQmin)
      .attr('fill', 'none').attr('stroke', C.danger)
      .attr('stroke-width', 1).attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '3,4').attr('d', drLineGen)
  }

  activeGroup.append('path')
    .datum(lorCurve)
    .attr('fill', 'none')
    .attr('stroke', C.danger).attr('stroke-width', 2.5).attr('stroke-opacity', 1)
    .attr('filter', `drop-shadow(0 0 4px ${C.danger}88)`)
    .attr('d', drLineGen)

  drawResonanceThreshold(
    g.select<SVGGElement>('.thresholds'),
    yScale, chartW, chartH, drOneLabel,
  )

  const fResLabel = t.resonantFreqGHz >= 1
    ? `f_res ${t.resonantFreqGHz.toFixed(1)} ${UNIT.GHZ}`
    : `f_res ${(t.resonantFreqGHz * 1000).toFixed(0)} ${UNIT.MHZ}`

  drawResonanceFcMarker(
    g.select<SVGGElement>('.fc-markers'),
    xScale, chartH,
    fMin, fMax,
    f0_hz,
    t.resonantFreqUncertaintyPct,
    fResLabel,
    C.danger, C.amber,
  )

  g.select<SVGGElement>('.opt-marker').selectAll('*').remove()
}
