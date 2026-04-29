// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import * as d3 from 'd3'

import { computeSchwan } from '@/utils/physics'

import { C } from '@/theme/colors'
import { ICON } from '@/constants/icons'

import type { CellConfig } from '@/types/cell'

import { F_MIN_HZ, F_MAX_HZ, computeOptimalFreqHz } from './chartCompute'

export function drawOptimalMarker(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  chartW: number,
  chartH: number,
  healthy: CellConfig,
  target: CellConfig,
  fieldIntensity: number,
  sigma_e: number,
  optLabel: (optHz: number, selRatio: number) => string,
): void {
  group.selectAll('*').remove()

  const optHz = computeOptimalFreqHz(healthy, target, fieldIntensity, sigma_e)
  if (optHz < F_MIN_HZ || optHz > F_MAX_HZ) return

  const ox     = xScale(optHz)
  const optKhz = optHz / 1000
  const hVmOpt = computeSchwan(healthy, optKhz, fieldIntensity, sigma_e)
  const tVmOpt = computeSchwan(target,  optKhz, fieldIntensity, sigma_e)
  const selRatio = hVmOpt > 0 ? tVmOpt / hVmOpt : 0

  group.append('line')
    .attr('x1', ox).attr('x2', ox)
    .attr('y1', 0).attr('y2', chartH)
    .attr('stroke', C.amber).attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,4').attr('stroke-opacity', 0.45)

  const anchor = ox < 60 ? 'start' : ox > chartW - 60 ? 'end' : 'middle'
  const textX  = ox < 60 ? Math.max(4, ox) : ox > chartW - 60 ? Math.min(chartW - 4, ox) : ox
  group.append('text')
    .attr('x', textX).attr('y', -5)
    .attr('text-anchor', anchor)
    .attr('fill', C.amber).attr('font-size', '0.7rem')
    .attr('font-family', 'var(--font-mono)')
    .attr('letter-spacing', '0.04em')
    .text(`${ICON.STAR} ${optLabel(optHz, selRatio)}`)
}
