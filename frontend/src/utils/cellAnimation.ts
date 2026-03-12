/**
 * Pure D3 animation helpers for CellCard.
 *
 * Each setup function accepts a DOM element and a `getFrame()` callback.
 * `getFrame()` is called every D3 timer tick and reads Vue reactive state,
 * keeping animation logic completely decoupled from the component.
 */
import * as d3 from 'd3'
import type { BlobPoint, BlobFrame, OscFrame } from '../types/cell'
import {
  CANVAS_W, CANVAS_H, BASE_R, BLOB_POINTS,
  NUCLEUS_W, NUCLEUS_H, NUCLEUS_PTS, NUCLEUS_RUNGS,
  LYSIS_DURATION_MS,
  OSC_W, OSC_H,
} from '../constants/cellCard'

// ── Blob cell animation ───────────────────────────────────────────────────────

/**
 * Initialises the 3-D elastic blob + nucleus SVG animation.
 * Returns the D3 timer (implements `{ stop() }`).
 *
 * @param el          Container element (cellCanvas ref)
 * @param type        'healthy' | 'target'  — used for unique SVG filter/gradient IDs
 * @param accentColor Fixed accent color for this cell type
 * @param rungColor   Fixed rung color for the nucleus helix
 * @param getFrame    Called each tick; reads current reactive state from Vue
 */
export function setupBlobAnimation(
  el: HTMLElement,
  type: 'healthy' | 'target',
  accentColor: string,
  rungColor: string,
  getFrame: () => BlobFrame,
): d3.Timer {
  const W = CANVAS_W, H = CANVAS_H, cx = W / 2, cy = H / 2
  const NW = NUCLEUS_W, NH = NUCLEUS_H, NP = NUCLEUS_PTS, NRUNGS = NUCLEUS_RUNGS

  d3.select(el).selectAll('*').remove()
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
  const defs = svg.append('defs')

  // ── Glow filter ──────────────────────────────────────────────────────────
  const glowFilterId = `glowFilter-${type}`
  const glowFilter = defs.append('filter')
    .attr('id', glowFilterId).attr('x', '-60%').attr('y', '-60%')
    .attr('width', '220%').attr('height', '220%')
  const glowBlur = glowFilter.append('feGaussianBlur')
    .attr('stdDeviation', '3').attr('result', 'coloredBlur')
  const glowMerge = glowFilter.append('feMerge')
  glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
  glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  // ── Radial gradient ──────────────────────────────────────────────────────
  const cellGradId = `cellGrad-${type}`
  const cellGrad = defs.append('radialGradient')
    .attr('id', cellGradId).attr('gradientUnits', 'userSpaceOnUse')
    .attr('cx', -BASE_R * 0.28).attr('cy', -BASE_R * 0.35)
    .attr('r', BASE_R * 1.6).attr('fx', -BASE_R * 0.32).attr('fy', -BASE_R * 0.40)
  cellGrad.append('stop').attr('offset', '0%').attr('stop-color', 'white').attr('stop-opacity', 0.14)
  const gradStop1 = cellGrad.append('stop')
    .attr('offset', '100%').attr('stop-color', accentColor).attr('stop-opacity', 0.08)

  // ── Aura rings ───────────────────────────────────────────────────────────
  const auraG = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)
  const auraRings = [
    auraG.append('circle').attr('r', BASE_R + 14).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.2),
    auraG.append('circle').attr('r', BASE_R + 26).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 0.8),
    auraG.append('circle').attr('r', BASE_R + 40).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 0.5),
  ]

  // ── Nucleus (double-helix) ───────────────────────────────────────────────
  const nucleusG = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)
  const nRungsBack   = nucleusG.append('g')
  const nStrandBack  = nucleusG.append('path').attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.5).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.28)
  const nStrandFront = nucleusG.append('path').attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.5).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.9)
  const nRungsFront  = nucleusG.append('g')

  // ── Blob membrane ────────────────────────────────────────────────────────
  const blobG      = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)
  const blobFill   = blobG.append('path').attr('fill', `url(#${cellGradId})`)
  const blobStroke = blobG.append('path').attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 2.5).attr('filter', `url(#${glowFilterId})`)

  // ── Blob perimeter control points (stable random phases) ─────────────────
  const N = BLOB_POINTS
  const blobPhases = d3.range(N).map((i: number) => ({
    baseAngle:   (i / N) * Math.PI * 2,
    phaseOffset: ((i * 7919) % 6283) / 1000,
    speed:       0.6 + ((i * 1013) % 1000) / 2500,
  }))

  const blobLine = d3.lineRadial<BlobPoint>().angle((d) => d.angle).radius((d) => d.r).curve(d3.curveBasisClosed)
  const nLineGen  = d3.line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y).curve(d3.curveBasis)

  // Closure variable — tracks when lysis animation started (replaces component data field)
  let shatterStartElapsed = -1

  // ── D3 timer loop ────────────────────────────────────────────────────────
  const timer = d3.timer((elapsed: number) => {
    const { impact, state, color } = getFrame()

    // ── Lysed ──────────────────────────────────────────────────────────────
    if (state === 'lysed') {
      blobStroke.attr('stroke-opacity', 0)
      blobFill.attr('fill-opacity', 0)
      auraRings.forEach((r) => r.attr('stroke-opacity', 0))
      nStrandFront.attr('d', `M${-NW / 2},0 L${NW / 2},0`).attr('stroke', '#ff4d6d').attr('stroke-opacity', 0.35).attr('stroke-width', 1)
      nStrandBack.attr('stroke-opacity', 0)
      nRungsFront.selectAll('*').remove()
      nRungsBack.selectAll('*').remove()
      glowBlur.attr('stdDeviation', '1')
      timer.stop()
      return
    }

    // ── Lysing (progressive shatter) ───────────────────────────────────────
    if (state === 'lysing') {
      if (shatterStartElapsed < 0) shatterStartElapsed = elapsed
      const progress = Math.min(1, Math.max(0, (elapsed - shatterStartElapsed) / LYSIS_DURATION_MS))
      const chaos = 12 + progress * 45
      const expandR = BASE_R + progress * 32

      const blobPts: BlobPoint[] = blobPhases.map((p) => ({
        angle: p.baseAngle,
        r: expandR + (Math.random() - 0.5) * chaos * 2,
      }))
      const blobPath = blobLine(blobPts) || ''

      blobStroke.attr('d', blobPath).attr('stroke', '#ff4d6d').attr('stroke-opacity', Math.max(0, 1 - progress * 0.9)).attr('stroke-width', 2.5 + progress * 3)
      blobFill.attr('d', blobPath).attr('fill', '#ff4d6d').attr('fill-opacity', Math.max(0, 0.1 - progress * 0.1))
      auraRings.forEach((ring, i) => ring.attr('stroke-opacity', Math.max(0, 0.3 - progress * 0.35 - i * 0.05)))

      const nPts1 = d3.range(NP).map((k: number) => ({
        x: -NW / 2 + (k / (NP - 1)) * NW,
        y: (NH / 2 - 4) * Math.sin((k / NP) * Math.PI * 3 + elapsed * 0.025) * (1 - progress * 0.9) + (Math.random() - 0.5) * 18 * progress,
      }))
      nStrandFront.attr('d', nLineGen(nPts1) || '').attr('stroke', '#ff4d6d').attr('stroke-opacity', Math.max(0, 1 - progress * 0.9))
      nStrandBack.attr('stroke-opacity', 0)
      nRungsFront.selectAll('*').remove()
      nRungsBack.selectAll('*').remove()
      glowBlur.attr('stdDeviation', (3 + progress * 12).toFixed(1))
      return
    }

    // ── Normal: stable / vibrating / nourishing ─────────────────────────────
    const isVibrating  = state === 'vibrating'
    const isNourishing = state === 'nourishing'

    const jitter    = isVibrating ? 4 + impact * 18 : isNourishing ? 5 : 6
    const radiusMod = isNourishing ? 1 + impact * 0.12 : 1
    const speedMult = isVibrating ? 1 + impact * 5 : isNourishing ? 0.4 + impact * 0.4 : 0.8

    const blobPts: BlobPoint[] = blobPhases.map((p) => {
      const wave  = Math.sin(elapsed * 0.001 * p.speed * speedMult + p.phaseOffset) * jitter
      const noise = (Math.random() - 0.5) * (isVibrating ? jitter * 0.5 : 2.5)
      return { angle: p.baseAngle, r: BASE_R * radiusMod + wave + noise }
    })
    const blobPath = blobLine(blobPts) || ''

    blobStroke.attr('d', blobPath).attr('stroke', color).attr('stroke-opacity', 1).attr('stroke-width', isNourishing ? 3 : 2.5)
    blobFill.attr('d', blobPath).attr('fill', `url(#${cellGradId})`)
    gradStop1.attr('stop-color', color)

    const auraPulseSpeed = isVibrating ? 0.003 + impact * 0.006 : isNourishing ? 0.0015 + impact * 0.003 : 0.0012
    auraRings.forEach((ring, i) => {
      const pulse       = (Math.sin(elapsed * auraPulseSpeed - i * 0.9) + 1) / 2
      const baseOpacity = isVibrating ? 0.08 + impact * 0.35 : isNourishing ? 0.08 + impact * 0.22 : 0.04 + impact * 0.04
      ring
        .attr('stroke', color)
        .attr('stroke-opacity', baseOpacity * (0.4 + pulse * 0.6))
        .attr('r', BASE_R + 14 + i * 13 + (isNourishing ? impact * 8 : isVibrating ? impact * 4 : 0))
    })

    const nucleusPhase = elapsed * 0.001 * (isVibrating ? 1 + impact * 4 : 0.6)
    const nAmp         = NH / 2 - 3
    const nNoise       = isVibrating ? impact * 3 : 0

    const nAllPts = d3.range(NP).map((k: number) => {
      const t     = k / (NP - 1)
      const theta = t * Math.PI * 4 + nucleusPhase
      return {
        x:  -NW / 2 + t * NW,
        y1: nAmp * Math.sin(theta)           + (Math.random() - 0.5) * nNoise,
        y2: nAmp * Math.sin(theta + Math.PI) + (Math.random() - 0.5) * nNoise,
        z:  Math.cos(theta),
      }
    })

    nStrandFront.attr('d', nLineGen(nAllPts.map((p) => ({ x: p.x, y: p.y1 }))) || '').attr('stroke', color).attr('stroke-opacity', 0.9)
    nStrandBack .attr('d', nLineGen(nAllPts.map((p) => ({ x: p.x, y: p.y2 }))) || '').attr('stroke', color).attr('stroke-opacity', 0.28)

    nRungsFront.selectAll('*').remove()
    nRungsBack .selectAll('*').remove()
    d3.range(NRUNGS).forEach((j: number) => {
      const k  = Math.min(NP - 1, Math.max(0, Math.round(((j + 0.5) / NRUNGS) * (NP - 1))))
      const pt = nAllPts[k]!
      const targetGroup = pt.z > 0 ? nRungsFront : nRungsBack
      targetGroup.append('line')
        .attr('x1', pt.x).attr('x2', pt.x).attr('y1', pt.y1).attr('y2', pt.y2)
        .attr('stroke', rungColor)
        .attr('stroke-width',   pt.z > 0 ? 2 : 1)
        .attr('stroke-opacity', pt.z > 0 ? 0.85 : 0.22)
    })

    glowBlur.attr('stdDeviation',
      isNourishing ? (3 + impact * 10).toFixed(1) :
      isVibrating  ? (3 + impact * 7).toFixed(1)  : '3')
  })

  return timer
}

// ── Oscilloscope strip ────────────────────────────────────────────────────────

/**
 * Initialises the oscilloscope waveform SVG animation.
 * Returns the D3 timer.
 *
 * @param el               Container element (oscCanvas ref)
 * @param accentColor      Static accent color for idle state
 * @param naturalFrequency Cell's naturalFrequency (Hz) — drives scroll speed
 * @param getFrame         Called each tick; reads current reactive state
 */
export function setupOscilloscope(
  el: HTMLElement,
  accentColor: string,
  naturalFrequency: number,
  getFrame: () => OscFrame,
): d3.Timer {
  const W = OSC_W, H = OSC_H

  d3.select(el).selectAll('*').remove()
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)

  const path = svg.append('path').attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.5).attr('stroke-opacity', 0.85)

  const scrollSpeed = naturalFrequency * 0.00008
  const lineGen     = d3.line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y)

  const timer = d3.timer((elapsed: number) => {
    const { state, impact, liveAmplitude, cellColor } = getFrame()

    if (state === 'lysed') {
      path.attr('d', `M0,${H / 2} L${W},${H / 2}`).attr('stroke', '#ff4d6d').attr('stroke-width', 1).attr('stroke-opacity', 0.4)
      timer.stop()
      return
    }

    const isVibrating  = state === 'vibrating'
    const isNourishing = state === 'nourishing'
    const isLysing     = state === 'lysing'

    const baseAmp  = liveAmplitude * (H / 2 - 5)
    const amp      = isNourishing ? baseAmp * (1 + impact * 0.4) : baseAmp
    const speedMult = isVibrating ? 1 + impact * 5 : isLysing ? 8 : 1

    const pts = d3.range(120).map((i: number) => ({
      x: (i / 119) * W,
      y: H / 2
        + amp * Math.sin((i / 120) * Math.PI * 8 + elapsed * scrollSpeed * speedMult)
        + (isLysing ? (Math.random() - 0.5) * H * 0.55 : 0),
    }))

    path.attr('d', lineGen(pts) || '').attr('stroke', isLysing ? '#ff4d6d' : cellColor)
  })

  return timer
}

// ── Fragment spawner ──────────────────────────────────────────────────────────

/**
 * Appends a single lysis fragment line to the cell's SVG and fades it out.
 * Call repeatedly (e.g. every 80 ms) during the lysing state.
 */
export function spawnFragment(el: HTMLElement): void {
  const svg = d3.select(el).select<SVGSVGElement>('svg')
  if (svg.empty()) return

  const W = CANVAS_W, H = CANVAS_H
  const angle  = Math.random() * Math.PI * 2
  const startR = 50 + Math.random() * 20
  const endR   = 90 + Math.random() * 70
  const len    = 6  + Math.random() * 14

  svg.append('line')
    .attr('x1', W / 2 + Math.cos(angle) * startR)
    .attr('y1', H / 2 + Math.sin(angle) * startR)
    .attr('x2', W / 2 + Math.cos(angle) * (startR + len))
    .attr('y2', H / 2 + Math.sin(angle) * (startR + len))
    .attr('stroke', '#ff4d6d')
    .attr('stroke-width', 0.5 + Math.random() * 2)
    .attr('stroke-opacity', 1)
    .transition().duration(600 + Math.random() * 900).ease(d3.easeQuadOut)
    .attr('x1', W / 2 + Math.cos(angle) * endR)
    .attr('y1', H / 2 + Math.sin(angle) * endR)
    .attr('x2', W / 2 + Math.cos(angle) * (endR + len))
    .attr('y2', H / 2 + Math.sin(angle) * (endR + len))
    .attr('stroke-opacity', 0)
    .remove()
}
