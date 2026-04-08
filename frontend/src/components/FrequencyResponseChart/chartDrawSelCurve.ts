// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import * as d3 from 'd3'

import { C } from '@/theme/colors'

export function drawSelCurve(
  selGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  rightAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  yRightScale: d3.ScaleLinear<number, number>,
  chartW: number,
  chartH: number,
  selData: { hz: number; ratio: number }[],
): void {
  const maxRatio = Math.max(...selData.map((d) => d.ratio), 2.0)
  const rightDomainMax = Math.ceil(maxRatio * 10) / 10
  yRightScale.domain([0, rightDomainMax])

  const yRightAxis = d3.axisRight<number>(yRightScale)
    .ticks(4)
    .tickSize(3)
    .tickFormat((d) => `×${(+d).toFixed(1)}`)

  rightAxisGroup
    .call(yRightAxis)
    .call((a) => a.select('.domain').attr('stroke', C.amber + '55'))
    .call((a) => a.selectAll('text').attr('fill', C.amber).attr('font-size', '0.7rem').attr('font-family', 'var(--font-mono)'))
    .call((a) => a.selectAll('line').attr('stroke', C.amber + '55'))

  const selLineGen = d3.line<{ hz: number; ratio: number }>()
    .x((d) => xScale(d.hz))
    .y((d) => yRightScale(d.ratio))
    .curve(d3.curveBasis)

  selGroup.selectAll('*').remove()

  const y1 = yRightScale(1)
  if (y1 >= 0 && y1 <= chartH) {
    selGroup.append('line')
      .attr('x1', 0).attr('x2', chartW)
      .attr('y1', y1).attr('y2', y1)
      .attr('stroke', C.w12)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4')
  }

  selGroup.append('path')
    .datum(selData)
    .attr('fill', 'none')
    .attr('stroke', C.amber)
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.75)
    .attr('stroke-dasharray', '6,3')
    .attr('d', selLineGen)
}
