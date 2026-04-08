// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import * as d3 from 'd3'

import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { F_MIN_HZ, F_MAX_HZ } from './chartCompute'

export interface FcMarkerEntry {
  fc: number
  color: string
  label: string
  tauNs: number
}

// Flip text anchors outward when two markers are closer than this to avoid overlap
const MIN_GAP_PX = 52

export function drawFcMarkers(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  chartH: number,
  entries: FcMarkerEntry[],
): void {
  group.selectAll('*').remove()

  const visibleFc = entries
    .map(({ fc, color, label, tauNs }) => {
      const hz = fc * 1000
      if (hz < F_MIN_HZ || hz > F_MAX_HZ) return null
      const fcDisplay = fc >= 1000 ? `${(fc / 1000).toFixed(1)}M` : `${fc.toFixed(0)}k`
      const tauDisplay = tauNs >= 1000
        ? `τ=${(tauNs / 1000).toFixed(0)}${UNIT.US}`
        : `τ=${tauNs.toFixed(0)}${UNIT.NS}`
      return { x: xScale(hz), color, label, fcDisplay, tauDisplay }
    })
    .filter(Boolean) as { x: number; color: string; label: string; fcDisplay: string; tauDisplay: string }[]

  const anchors: ('middle' | 'end' | 'start')[] = visibleFc.map(() => 'middle' as const)
  if (visibleFc.length === 2) {
    const v0 = visibleFc[0]!
    const v1 = visibleFc[1]!
    if (Math.abs(v0.x - v1.x) < MIN_GAP_PX) {
      const [li, ri] = v0.x <= v1.x ? [0, 1] : [1, 0]
      anchors[li] = 'end'
      anchors[ri] = 'start'
    }
  }

  visibleFc.forEach(({ x, color, label, fcDisplay, tauDisplay }, i) => {
    const anchor: 'middle' | 'end' | 'start' = anchors[i] ?? 'middle'
    group.append('text')
      .attr('x', x).attr('y', chartH + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', color).attr('font-size', '0.62rem')
      .attr('font-family', 'var(--font-mono)')
      .text(ICON.TRIANGLE_UP)
    group.append('text')
      .attr('x', x).attr('y', chartH + 34)
      .attr('text-anchor', anchor)
      .attr('fill', color).attr('font-size', '0.6rem')
      .attr('font-family', 'var(--font-mono)')
      .attr('letter-spacing', '0.03em')
      .text(`${label} ${fcDisplay}`)
    group.append('text')
      .attr('x', x).attr('y', chartH + 46)
      .attr('text-anchor', anchor)
      .attr('fill', color).attr('font-size', '0.55rem')
      .attr('font-family', 'var(--font-mono)')
      .attr('opacity', 0.65)
      .text(tauDisplay)
  })
}

export function drawResonanceFcMarker(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLogarithmic<number, number>,
  chartH: number,
  fMin: number,
  fMax: number,
  f0_hz: number,
  uncertaintyPct: number | null | undefined,
  fResLabel: string,
  dangerColor: string,
  amberColor: string,
): void {
  group.selectAll('*').remove()

  const xRes = xScale(f0_hz)
  group.append('line')
    .attr('x1', xRes).attr('x2', xRes).attr('y1', 0).attr('y2', chartH)
    .attr('stroke', dangerColor).attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.4)
  group.append('text').attr('x', xRes).attr('y', chartH + 20)
    .attr('text-anchor', 'middle').attr('fill', dangerColor)
    .attr('font-size', '0.62rem').attr('font-family', 'var(--font-mono)').text(ICON.TRIANGLE_UP)
  group.append('text').attr('x', xRes).attr('y', chartH + 34)
    .attr('text-anchor', 'middle').attr('fill', dangerColor)
    .attr('font-size', '0.6rem').attr('font-family', 'var(--font-mono)').text(fResLabel)

  if (uncertaintyPct) {
    for (const f of [f0_hz * (1 - uncertaintyPct / 100), f0_hz * (1 + uncertaintyPct / 100)]) {
      if (f >= fMin && f <= fMax) {
        group.append('line')
          .attr('x1', xScale(f)).attr('x2', xScale(f))
          .attr('y1', 0).attr('y2', chartH)
          .attr('stroke', amberColor).attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '2,4').attr('stroke-opacity', 0.35)
      }
    }
  }
}
