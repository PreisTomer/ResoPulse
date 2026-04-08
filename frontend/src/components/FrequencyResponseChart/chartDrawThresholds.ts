// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import * as d3 from 'd3'

import { C } from '@/theme/colors'

export interface ThresholdEntry {
  label: string
  vm: number
  color: string
}

export function drawThresholds(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  yScale: d3.ScaleLinear<number, number>,
  chartW: number,
  maxVm: number,
  entries: ThresholdEntry[],
  revEpLabel: string,
): void {
  group.selectAll('*').remove()

  entries.forEach(({ label, vm, color }) => {
    if (vm <= maxVm) {
      const y = yScale(vm)
      group.append('line')
        .attr('x1', 0).attr('x2', chartW)
        .attr('y1', y).attr('y2', y)
        .attr('stroke', color).attr('stroke-width', 0.75)
        .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.5)
      group.append('text')
        .attr('x', chartW + 4).attr('y', y + 4)
        .attr('fill', color).attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .text(label)
    }

    const vmRev = vm * 0.5
    if (vmRev <= maxVm) {
      const yRev = yScale(vmRev)
      group.append('line')
        .attr('x1', 0).attr('x2', chartW)
        .attr('y1', yRev).attr('y2', yRev)
        .attr('stroke', color).attr('stroke-width', 0.6)
        .attr('stroke-dasharray', '3,4').attr('stroke-opacity', 0.28)
      group.append('text')
        .attr('x', chartW + 4).attr('y', yRev + 4)
        .attr('fill', color).attr('font-size', '0.48rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('opacity', 0.6)
        .text(revEpLabel)
    }
  })
}

export function drawResonanceThreshold(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  yScale: d3.ScaleLinear<number, number>,
  chartW: number,
  chartH: number,
  drOneLabel: string,
): void {
  group.selectAll('*').remove()

  const y1 = yScale(1)
  if (y1 < 0 || y1 > chartH) return

  group.append('line')
    .attr('x1', 0).attr('x2', chartW)
    .attr('y1', y1).attr('y2', y1)
    .attr('stroke', C.danger).attr('stroke-width', 0.75)
    .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.5)
  group.append('text')
    .attr('x', chartW + 4).attr('y', y1 + 4)
    .attr('fill', C.danger).attr('font-size', '0.52rem')
    .attr('font-family', 'var(--font-mono)').text(drOneLabel)
}
