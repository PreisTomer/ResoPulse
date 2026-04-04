// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import * as d3 from 'd3'

interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

interface ChartBox {
  totalW: number
  totalH: number
  chartW: number
  chartH: number
}

export const CHART_F_MIN_HZ = 10_000
export const CHART_F_MAX_HZ = 500_000_000
export const CHART_N_POINTS = 200

interface ChartThemeColors {
  primary: string
  danger: string
  border: string
  amber: string
}

export function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

export function buildLogFrequencyPoints(n = CHART_N_POINTS): number[] {
  return logspace(CHART_F_MIN_HZ, CHART_F_MAX_HZ, n)
}

export function measureChartBox(
  container: HTMLElement,
  margin: ChartMargin,
  fallbackWidth: number,
  totalH: number,
): ChartBox {
  const totalW = container.clientWidth || fallbackWidth

  return {
    totalW,
    totalH,
    chartW: totalW - margin.left - margin.right,
    chartH: totalH - margin.top - margin.bottom,
  }
}

export function clearChartContainer(container: HTMLElement, selector = '*'): void {
  d3.select(container).selectAll(selector).remove()
}

export function createSvgRoot(
  container: HTMLElement,
  totalW: number,
  totalH: number,
): d3.Selection<SVGSVGElement, unknown, null, undefined> {
  return d3.select(container)
    .append('svg')
    .attr('width', totalW)
    .attr('height', totalH)
}

export function observeChartResize(
  container: HTMLElement | null | undefined,
  onResize: () => void,
): ResizeObserver | null {
  if (!container) return null
  const observer = new ResizeObserver(onResize)
  observer.observe(container)
  return observer
}

export function getChartThemeColors(): ChartThemeColors {
  const style = getComputedStyle(document.documentElement)
  return {
    primary: style.getPropertyValue('--color-primary').trim(),
    danger: style.getPropertyValue('--color-danger').trim(),
    border: style.getPropertyValue('--color-border').trim(),
    amber: style.getPropertyValue('--color-amber').trim(),
  }
}