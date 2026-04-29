// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import * as d3 from 'd3'

import { F_MIN_HZ, F_MAX_HZ } from './chartCompute'

export interface CrossoverMarker {
  fKhz: number | null | undefined
  color: string
  tag: string
}

export function drawDepCrossovers(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  chartH: number,
  markers: CrossoverMarker[],
): void {
  group.selectAll('*').remove()

  markers.forEach(({ fKhz, color, tag }) => {
    if (!fKhz || fKhz <= 0) return
    const fHz = fKhz * 1000
    if (fHz < F_MIN_HZ || fHz > F_MAX_HZ) return
    const cx = xScale(fHz)
    group.append('line')
      .attr('x1', cx).attr('x2', cx)
      .attr('y1', 0).attr('y2', chartH)
      .attr('stroke', color)
      .attr('stroke-width', 0.75)
      .attr('stroke-dasharray', '1,4')
      .attr('stroke-opacity', 0.45)
    group.append('text')
      .attr('x', cx + 3).attr('y', 10)
      .attr('fill', color)
      .attr('font-size', '0.48rem')
      .attr('font-family', 'var(--font-mono)')
      .attr('opacity', 0.65)
      .text(tag)
  })
}
