// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import * as d3 from 'd3'

import { C } from '@/theme/colors'

export function drawDepOverlay(
  depGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  depAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  axisLabelDep: d3.Selection<SVGTextElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  yDepScale: d3.ScaleLinear<number, number>,
  chartH: number,
  depHCurve: { hz: number; k: number }[],
  depTCurve: { hz: number; k: number }[],
): void {
  depGroup.selectAll('*').remove()
  axisLabelDep.attr('opacity', 1)

  const depLineGen = d3.line<{ hz: number; k: number }>()
    .x((d) => xScale(d.hz))
    .y((d) => yDepScale(d.k))
    .curve(d3.curveBasis)

  const yK0 = yDepScale(0)
  const chartW = xScale.range()[1] ?? 0
  if (yK0 >= 0 && yK0 <= chartH) {
    depGroup.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', yK0).attr('y2', yK0)
      .attr('stroke', C.w10)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4')
  }

  depGroup.append('path')
    .datum(depHCurve)
    .attr('fill', 'none')
    .attr('stroke', C.primary)
    .attr('stroke-width', 1.2)
    .attr('stroke-opacity', 0.50)
    .attr('stroke-dasharray', '2,4')
    .attr('d', depLineGen)

  depGroup.append('path')
    .datum(depTCurve)
    .attr('fill', 'none')
    .attr('stroke', C.danger)
    .attr('stroke-width', 1.2)
    .attr('stroke-opacity', 0.50)
    .attr('stroke-dasharray', '2,4')
    .attr('d', depLineGen)

  yDepScale.domain([-0.5, 0.5])
  const yDepAxis = d3.axisRight<number>(yDepScale)
    .tickValues([-0.5, 0, 0.5])
    .tickSize(3)
    .tickFormat((d) => {
      const v = +d
      if (Math.abs(v) < 1e-6) return 'K=0'
      return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
    })

  depAxisGroup
    .call(yDepAxis)
    .call((a) => a.select('.domain').attr('stroke', C.w12))
    .call((a) => a.selectAll('text').attr('fill', C.w38).attr('font-size', '0.50rem').attr('font-family', 'var(--font-mono)'))
    .call((a) => a.selectAll('line').attr('stroke', C.w15))
}

export function clearDepOverlay(
  depGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  depAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  depCrossoverGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  axisLabelDep: d3.Selection<SVGTextElement, unknown, null, undefined>,
): void {
  depGroup.selectAll('*').remove()
  depAxisGroup.selectAll('*').remove()
  depCrossoverGroup.selectAll('*').remove()
  axisLabelDep.attr('opacity', 0)
}
