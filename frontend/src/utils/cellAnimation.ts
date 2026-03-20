// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Pure D3 animation helpers for CellCard.
 *
 * Each setup function accepts a DOM element and a `getFrame()` callback.
 * `getFrame()` is called every D3 timer tick and reads Vue reactive state.
 *
 * Cell anatomy varies by category AND preset:
 *  - mammalian  : nucleus + nucleolus + mitochondria (w/ cristae) + cortex ring + field rays + pores
 *  - ecoli      : rod/capsule blob + double-membrane ellipse walls + nucleoid + ribosomes + flagellum + field rays + pores
 *  - mrsa       : spherical blob + thick peptidoglycan rings + division septum + nucleoid + ribosomes + field rays + pores
 *  - influenza  : spherical blob + 12 club-shaped HA/NA spikes + inner RNP ring + RNA core + field rays + pores
 *  - sarscov2   : spherical blob + 16 prominent club spikes + lipid envelope ring + nucleocapsid ring + RNA core + field rays + pores
 *
 * Field rays replace the old polarization pole dots: they represent the applied
 * electric field from the experiment electrodes. Color encodes frequency (cyan →
 * violet, log-scaled 10 kHz-30 GHz). Opacity encodes field intensity (log V/cm).
 */
import * as d3 from 'd3'
import type { BlobPoint, BlobFrame, OscFrame } from '@/types/cell'
import {
  CANVAS_W, CANVAS_H, BASE_R, BLOB_POINTS,
  LYSIS_DURATION_MS,
  OSC_W, OSC_H,
} from '@/constants/cellCard'
import { CELL_STATE, CELL_CATEGORY, CELL_TYPE } from '@/constants/strings'

// ── Type aliases ──────────────────────────────────────────────────────────────
type D3Sel<E extends Element> = d3.Selection<E, unknown, null, undefined>
type PhaseEntry = { baseAngle: number; phaseOffset: number; speed: number }

// ── Shape helper ──────────────────────────────────────────────────────────────

/**
 * Polar radius of a vertical ellipse at angle θ (D3 lineRadial convention:
 * θ=0 → top/up, θ=π/2 → right).
 * a = semi-axis along θ=0 (vertical/tall), b = semi-axis along θ=π/2 (horizontal/narrow).
 */
function capsuleR(theta: number, a: number, b: number): number {
  const s = Math.sin(theta), c = Math.cos(theta)
  return (a * b) / Math.sqrt(a * a * s * s + b * b * c * c)
}

// ── Shared D3 generators (stateless - declared once at module scope) ──────────
const nucLineGen  = d3.lineRadial<BlobPoint>().angle((d) => d.angle).radius((d) => d.r).curve(d3.curveBasisClosed)
const flagLineGen = d3.line<[number, number]>().x((d) => d[0]).y((d) => d[1]).curve(d3.curveCatmullRom.alpha(0.5))

// ── Anatomy interfaces ────────────────────────────────────────────────────────

interface MitoEl {
  g:     D3Sel<SVGGElement>
  outer: D3Sel<SVGEllipseElement>
  inner: D3Sel<SVGEllipseElement>
  c1:    D3Sel<SVGLineElement>
  c2:    D3Sel<SVGLineElement>
  m:     { x: number; y: number; rx: number; ry: number; angle: number }
}

interface MammalianAnatomy {
  /** Stored from setup - needed during per-tick updates */
  type:        string
  accentColor: string
  mitoEls:     MitoEl[]
  nucG:        D3Sel<SVGGElement>
  nucBlob:     D3Sel<SVGPathElement>
  nucOuterEnv: D3Sel<SVGPathElement>
  nucleolus:   D3Sel<SVGCircleElement>
  nucleolus2:  D3Sel<SVGCircleElement> | null
  cortexRing:  D3Sel<SVGCircleElement>
  nucPhases:   PhaseEntry[]
}

interface SpikeEl {
  stalk: D3Sel<SVGLineElement>
  head:  D3Sel<SVGCircleElement>
}

interface BacteriaAnatomy {
  isRod:               boolean
  /** Semi-major rod axis (equals BASE_R for E. coli) - used to place flagellum */
  ROD_A:               number
  nucG:                D3Sel<SVGGElement>
  nucleoidBlob:        D3Sel<SVGPathElement>
  ribosomeDots:        Array<D3Sel<SVGCircleElement>>
  nucleoidPhases:      PhaseEntry[]
  bacteriaWallElOuter: D3Sel<SVGEllipseElement> | null  // E. coli only
  bacteriaWallElInner: D3Sel<SVGEllipseElement> | null  // E. coli only
  flagEl:              D3Sel<SVGPathElement>    | null  // E. coli only
  bacteriaWallC1:      D3Sel<SVGCircleElement>  | null  // MRSA only
  bacteriaWallC2:      D3Sel<SVGCircleElement>  | null  // MRSA only
  septum:              D3Sel<SVGLineElement>    | null  // MRSA only
}

interface VirusAnatomy {
  isCov2:          boolean
  N_SPIKES:        number
  STALK_LEN:       number
  HEAD_R:          number
  virusInnerRings: Array<D3Sel<SVGCircleElement>>
  virusCore:       D3Sel<SVGCircleElement>
  virusSpikes:     SpikeEl[]
}

// ── Anatomy setup functions ───────────────────────────────────────────────────

function setupMammalianAnatomy(
  cellG: D3Sel<SVGGElement>,
  type: string,
  accentColor: string,
): MammalianAnatomy {
  const NUC_PTS = type === CELL_TYPE.TARGET ? 14 : 10  // cancer: more control pts → jagged NE
  const NUCL_R  = type === CELL_TYPE.TARGET ? 8.0 : 6.5 // cancer: large prominent nucleolus

  // Cell cortex ring (actin cortex, just inside plasma membrane - gives depth)
  const cortexRing = cellG.append('circle').attr('r', BASE_R * 0.90)
    .attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 0.7).attr('stroke-opacity', 0.09)

  // Mitochondria: cancer has 5 small fragmented mito (Warburg effect); healthy has 2 elongated
  const mitoData = type === CELL_TYPE.TARGET
    ? [  // 5 fragmented mitochondria, smaller, more numerous, scattered
        { x: -20, y: -14, rx: 7,  ry: 2.8, angle: 20  },
        { x:  19, y:  16, rx: 6,  ry: 2.5, angle: -25 },
        { x:  -5, y:  22, rx: 5,  ry: 2.2, angle: 55  },
        { x:  13, y:  -9, rx: 6,  ry: 2.2, angle: -40 },
        { x: -14, y:   9, rx: 5,  ry: 2.0, angle: 80  },
      ]
    : [  // 2 healthy elongated mitochondria with prominent cristae
        { x: -18, y: -15, rx: 10, ry: 4, angle: 15  },
        { x:  20, y:  16, rx:  9, ry: 4, angle: -20 },
      ]

  const mitoG = cellG.append('g')
  const mitoEls: MitoEl[] = mitoData.map((m) => {
    const g     = mitoG.append('g')
    const outer = g.append('ellipse').attr('rx', m.rx).attr('ry', m.ry)
      .attr('fill', accentColor).attr('fill-opacity', 0.04)
      .attr('stroke', accentColor).attr('stroke-width', 1.1)
    const inner = g.append('ellipse').attr('rx', m.rx - 2.5).attr('ry', m.ry - 1.2)
      .attr('fill', accentColor).attr('fill-opacity', 0.03)
      .attr('stroke', accentColor).attr('stroke-width', 0.5).attr('stroke-opacity', 0.18)
    // Cristae: short lines perpendicular to the long axis (suggesting inner membrane folds)
    const cHalf = Math.max(1, m.ry - 0.8)
    const c1 = g.append('line')
      .attr('x1', -2.5).attr('y1', -cHalf).attr('x2', -2.5).attr('y2', cHalf)
      .attr('stroke', accentColor).attr('stroke-width', 0.5).attr('stroke-opacity', 0.16)
    const c2 = g.append('line')
      .attr('x1',  2.5).attr('y1', -cHalf).attr('x2',  2.5).attr('y2', cHalf)
      .attr('stroke', accentColor).attr('stroke-width', 0.5).attr('stroke-opacity', 0.16)
    return { g, outer, inner, c1, c2, m }
  })

  // Nucleus (organic blob with nuclear envelope - elongates along field axis)
  const nucG = cellG.append('g')
  // Outer nuclear envelope (double-membrane dashed ring - drawn first, behind nucBlob)
  // Brightens and changes color when nuclear disruption ratio is elevated.
  const nucOuterEnv = nucG.append('path')
    .attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 0.9).attr('stroke-dasharray', '3,2').attr('stroke-opacity', 0.15)
  const nucBlob = nucG.append('path')
    .attr('fill', accentColor).attr('fill-opacity', 0.12)
    .attr('stroke', accentColor).attr('stroke-width', 1.2).attr('stroke-opacity', 0.42)
  const nucleolus = nucG.append('circle').attr('r', NUCL_R)
    .attr('fill', accentColor).attr('fill-opacity', 0.28)
  // Inner nucleolus suggestion
  nucG.append('circle').attr('r', NUCL_R * 0.45)
    .attr('fill', accentColor).attr('fill-opacity', 0.45)
  // Second nucleolus - cancer cells characteristically have multiple prominent nucleoli
  let nucleolus2: D3Sel<SVGCircleElement> | null = null
  if (type === CELL_TYPE.TARGET) {
    nucleolus2 = nucG.append('circle').attr('r', NUCL_R * 0.78)
      .attr('fill', accentColor).attr('fill-opacity', 0.20)
    nucG.append('circle').attr('r', NUCL_R * 0.30)
      .attr('fill', accentColor).attr('fill-opacity', 0.38)
  }
  nucG.attr('transform', 'translate(0,4)')

  const nucPhases: PhaseEntry[] = d3.range(NUC_PTS).map((i: number) => ({
    baseAngle:   (i / NUC_PTS) * Math.PI * 2,
    phaseOffset: ((i * 3571) % 6283) / 1000,
    speed:       0.22 + ((i * 601) % 1000) / 4500,
  }))

  return { type, accentColor, mitoEls, nucG, nucBlob, nucOuterEnv, nucleolus, nucleolus2, cortexRing, nucPhases }
}

function setupBacteriaAnatomy(
  cellG: D3Sel<SVGGElement>,
  accentColor: string,
  isRod: boolean,
  ROD_A: number,
  ROD_B: number,
): BacteriaAnatomy {
  const NUCL_PTS = 8

  let bacteriaWallElOuter: D3Sel<SVGEllipseElement> | null = null
  let bacteriaWallElInner: D3Sel<SVGEllipseElement> | null = null
  let bacteriaWallC1: D3Sel<SVGCircleElement> | null = null
  let bacteriaWallC2: D3Sel<SVGCircleElement> | null = null
  let septum: D3Sel<SVGLineElement> | null = null
  let flagEl: D3Sel<SVGPathElement> | null = null
  let nucG: D3Sel<SVGGElement>

  if (isRod) {
    // ── E. coli: gram-negative rod ────────────────────────────────────────
    // Outer membrane (outer lipid bilayer) - solid ellipse
    bacteriaWallElOuter = cellG.append('ellipse')
      .attr('rx', ROD_B + 8).attr('ry', ROD_A + 8)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.22)
    // Periplasm / thin peptidoglycan ring - dashed ellipse, sits between membranes
    bacteriaWallElInner = cellG.append('ellipse')
      .attr('rx', ROD_B + 4).attr('ry', ROD_A + 4)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.16)
      .attr('stroke-dasharray', '3,3')
    // Flagellum (peritrichous - animated wiggly path from south pole, exits just outside outer membrane)
    flagEl = cellG.append('path')
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 0.9).attr('stroke-opacity', 0.30)
      .attr('stroke-linecap', 'round')
    nucG = cellG.append('g').attr('transform', 'translate(0, 0)')
  } else {
    // ── MRSA: gram-positive coccus ────────────────────────────────────────
    // Thick peptidoglycan layer (outer ring - wider, denser)
    bacteriaWallC1 = cellG.append('circle').attr('r', BASE_R + 9)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 3.5).attr('stroke-opacity', 0.16)
      .attr('stroke-dasharray', '4,2')
    // Second ring (middle of thick wall)
    bacteriaWallC2 = cellG.append('circle').attr('r', BASE_R + 4)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.2).attr('stroke-opacity', 0.13)
    // Division septum (binary fission plane - faint line across equator)
    septum = cellG.append('line')
      .attr('x1', -BASE_R * 0.68).attr('y1', 0)
      .attr('x2',  BASE_R * 0.68).attr('y2', 0)
      .attr('stroke', accentColor).attr('stroke-width', 0.8).attr('stroke-opacity', 0.18)
      .attr('stroke-dasharray', '3,3')
    nucG = cellG.append('g').attr('transform', 'translate(-4, 3)')
  }

  // Nucleoid (diffuse chromosomal region - no nuclear envelope)
  const nucleoidBlob = nucG.append('path')
    .attr('fill', accentColor).attr('fill-opacity', 0.11)
    .attr('stroke', 'none')

  const nucleoidPhases: PhaseEntry[] = d3.range(NUCL_PTS).map((i: number) => ({
    baseAngle:   (i / NUCL_PTS) * Math.PI * 2,
    phaseOffset: ((i * 2311) % 6283) / 1000,
    speed:       0.15 + ((i * 401) % 1000) / 6000,
  }))

  // Ribosomes: scattered tiny dots (no mitochondria in prokaryotes)
  const riboPts = isRod
    ? [ // Distributed along rod axis
        { x: -8, y: -20 }, { x:  6, y: -15 }, { x: -5, y: -8 }, { x:  7, y:  2 },
        { x: -7, y:  10 }, { x:  5, y:  20 }, { x: -3, y:  28 }, { x:  9, y: -30 },
      ]
    : [ // Scattered in sphere
        { x: -22, y: -8 }, { x: -12, y: 18 }, { x: 10, y: -20 }, { x: 20, y: 5 },
        { x:  -5, y: 22 }, { x: 18,  y:-10 }, { x:-18, y:  12 }, { x:  5, y:-15 },
      ]
  const ribosomeDots = riboPts.map(({ x, y }) =>
    cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', 1.8)
      .attr('fill', accentColor).attr('fill-opacity', 0.30)
  )

  return {
    isRod, ROD_A, nucG, nucleoidBlob, ribosomeDots, nucleoidPhases,
    bacteriaWallElOuter, bacteriaWallElInner, flagEl,
    bacteriaWallC1, bacteriaWallC2, septum,
  }
}

function setupVirusAnatomy(
  cellG: D3Sel<SVGGElement>,
  accentColor: string,
  presetId: string | undefined,
): VirusAnatomy {
  const isCov2    = presetId === 'sarscov2'
  const N_SPIKES  = isCov2 ? 16 : 12
  const STALK_LEN = isCov2 ? 13 : 9    // stalk length beyond blob surface
  const HEAD_R    = isCov2 ? 3.8 : 2.5  // club head radius

  // Inner rings: matrix protein layer + nucleocapsid / RNP ring
  const innerR1 = isCov2 ? 22 : 18  // outer inner ring (matrix protein layer)
  const innerR2 = isCov2 ? 14 : 10  // inner inner ring (nucleocapsid)
  const virusInnerRings = [
    cellG.append('circle').attr('r', innerR1)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.25),
    cellG.append('circle').attr('r', innerR2)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 0.7).attr('stroke-opacity', 0.18),
  ]

  // RNA core (genetic material - small filled centre)
  const virusCore = cellG.append('circle').attr('r', isCov2 ? 7 : 5)
    .attr('fill', accentColor).attr('fill-opacity', 0.15)
    .attr('stroke', accentColor).attr('stroke-width', 0.8).attr('stroke-opacity', 0.40)

  // Club-shaped spike proteins (stalk + bulbous head)
  // These sit on the outer surface of the lipid envelope (the blob)
  const virusSpikes: SpikeEl[] = d3.range(N_SPIKES).map((i: number) => {
    const a = (i / N_SPIKES) * Math.PI * 2
    const stalk = cellG.append('line')
      .attr('x1', BASE_R * Math.cos(a)).attr('y1', BASE_R * Math.sin(a))
      .attr('x2', (BASE_R + STALK_LEN) * Math.cos(a)).attr('y2', (BASE_R + STALK_LEN) * Math.sin(a))
      .attr('stroke', accentColor).attr('stroke-width', isCov2 ? 1.6 : 1.2)
      .attr('stroke-linecap', 'round').attr('stroke-opacity', 0.75)
    const head = cellG.append('circle')
      .attr('cx', (BASE_R + STALK_LEN + HEAD_R * 0.5) * Math.cos(a))
      .attr('cy', (BASE_R + STALK_LEN + HEAD_R * 0.5) * Math.sin(a))
      .attr('r', HEAD_R)
      .attr('fill', accentColor).attr('fill-opacity', isCov2 ? 0.30 : 0.22)
      .attr('stroke', accentColor).attr('stroke-width', 0.7).attr('stroke-opacity', 0.65)
    return { stalk, head }
  })

  return { isCov2, N_SPIKES, STALK_LEN, HEAD_R, virusInnerRings, virusCore, virusSpikes }
}

// ── Anatomy update functions ──────────────────────────────────────────────────

interface MammalianUpdateParams {
  elapsed:                number
  color:                  string
  thermalColor:           string
  impact:                 number
  tNorm:                  number
  isNourishing:           boolean
  isVibrating:            boolean
  nuclearDisruptionRatio: number | undefined
}

function updateMammalianAnatomy(anat: MammalianAnatomy, p: MammalianUpdateParams): void {
  const { elapsed, color, thermalColor, impact, tNorm, isNourishing, isVibrating, nuclearDisruptionRatio } = p
  const { type, accentColor } = anat

  // ── Cell cortex ring ───────────────────────────────────────────────────
  anat.cortexRing.attr('stroke', color).attr('stroke-opacity', 0.09 + impact * 0.04)

  // ── Mitochondria (slow Brownian drift; cristae glow with heat) ─────────
  const mitoIntensity = 0.30 + Math.min(0.50, tNorm * 2.0)
  anat.mitoEls.forEach(({ g, outer, inner, c1, c2, m }, i) => {
    const dx  = Math.sin(elapsed * 0.00022 + i * 1.4) * 4
    const dy  = Math.cos(elapsed * 0.00025 + i * 2.1) * 3
    const rot = m.angle + Math.sin(elapsed * 0.00012 + i * 1.7) * 12
    g.attr('transform', `translate(${m.x + dx},${m.y + dy}) rotate(${rot})`).attr('opacity', 0.80)
    outer.attr('stroke', thermalColor).attr('stroke-opacity', mitoIntensity).attr('fill', thermalColor)
    inner.attr('fill', thermalColor).attr('fill-opacity', Math.min(0.14, tNorm * 0.18 + 0.03))
      .attr('stroke', thermalColor)
    const cristaeOp = Math.min(0.30, mitoIntensity * 0.45)
    c1.attr('stroke', thermalColor).attr('stroke-opacity', cristaeOp)
    c2.attr('stroke', thermalColor).attr('stroke-opacity', cristaeOp)
  })

  // ── Nucleus (organic blob, elongates along applied field axis) ─────────
  const NUC_R    = type === CELL_TYPE.TARGET ? 26 : 20  // cancer: enlarged nucleus (high N/C ratio)
  const NUC_DX   = type === CELL_TYPE.TARGET ? -2 : 0   // cancer: slight nuclear displacement
  const NUC_DY   = type === CELL_TYPE.TARGET ?  6 : 4   // cancer: more off-centre
  const nucScaleY  = 1 + impact * 0.28
  const nucScaleX  = 1 - impact * 0.10
  const nucNoise   = isVibrating ? impact * 1.8 : 0
  const nucWaveAmp = type === CELL_TYPE.TARGET ? 4.5 : 2.5  // cancer: pleomorphic, irregular nucleus
  const nucPts: BlobPoint[] = anat.nucPhases.map((ph) => {
    const wave  = Math.sin(elapsed * 0.0006 * ph.speed + ph.phaseOffset) * nucWaveAmp
    const noise = (Math.random() - 0.5) * nucNoise
    return { angle: ph.baseAngle, r: NUC_R + wave + noise }
  })
  // Outer nuclear envelope - drawn 3.5px outside the blob boundary
  const nucEnvPts: BlobPoint[] = nucPts.map((pt) => ({ angle: pt.angle, r: pt.r + 3.5 }))
  anat.nucG.attr('transform',
    `translate(${NUC_DX},${NUC_DY}) scale(${nucScaleX.toFixed(3)},${nucScaleY.toFixed(3)})`)
  anat.nucBlob.attr('d', nucLineGen(nucPts) || '')
    .attr('fill', color).attr('fill-opacity', 0.12)
    .attr('stroke', color).attr('stroke-opacity', isNourishing ? 0.60 : 0.42)
  // Nuclear outer envelope: color interpolates based on nuclear disruption ratio
  // accentColor → amber (#fbbf24) at >50%, amber → red (#ff4d6d) at >85%
  const nucDr = nuclearDisruptionRatio ?? 0
  const nucEnvColor = nucDr < 0.5
    ? accentColor
    : nucDr < 0.85
      ? d3.interpolateRgb(accentColor, '#fbbf24')((nucDr - 0.5) / 0.35)
      : d3.interpolateRgb('#fbbf24', '#ff4d6d')((nucDr - 0.85) / 0.15)
  const nucEnvOpacity = 0.12 + Math.min(0.50, nucDr * 0.55)
  anat.nucOuterEnv.attr('d', nucLineGen(nucEnvPts) || '')
    .attr('stroke', nucEnvColor).attr('stroke-opacity', nucEnvOpacity)

  // Nucleolus: slow drift inside nucleus
  const nlDx = Math.sin(elapsed * 0.0004) * 3.5
  const nlDy = Math.cos(elapsed * 0.0003) * 2.5
  anat.nucleolus.attr('cx', -3 + nlDx).attr('cy', -2 + nlDy)
    .attr('fill', color).attr('fill-opacity', 0.28)
  // Second nucleolus drifts independently (cancer cells only)
  if (anat.nucleolus2) {
    const nl2Dx = Math.sin(elapsed * 0.00035 + 2.1) * 4.5
    const nl2Dy = Math.cos(elapsed * 0.00045 + 1.4) * 3.5
    anat.nucleolus2.attr('cx', 6 + nl2Dx).attr('cy', 4 + nl2Dy)
      .attr('fill', color).attr('fill-opacity', 0.20)
  }
}

interface BacteriaUpdateParams {
  elapsed:     number
  color:       string
  impact:      number
  isVibrating: boolean
}

function updateBacteriaAnatomy(anat: BacteriaAnatomy, p: BacteriaUpdateParams): void {
  const { elapsed, color, impact, isVibrating } = p
  const { isRod, ROD_A } = anat

  const wallOpacity = Math.max(0.05, 0.28 - impact * 0.22)

  if (isRod) {
    // ── E. coli: gram-negative rod walls ─────────────────────────────────
    anat.bacteriaWallElOuter!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.85)
    anat.bacteriaWallElInner!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.60)

    // ── Flagellum: animated wiggly path from south pole ───────────────────
    const flagPts: Array<[number, number]> = []
    for (let i = 0; i <= 14; i++) {
      const t  = i / 14
      const fY = ROD_A + 9 + t * 28  // start just outside outer membrane south pole (ry = ROD_A + 8)
      const fX = Math.sin(t * Math.PI * 2.5 + elapsed * 0.003) * 5
      flagPts.push([fX, fY])
    }
    anat.flagEl!.attr('d', flagLineGen(flagPts) ?? '')
      .attr('stroke', color).attr('stroke-opacity', Math.max(0, 0.28 - impact * 0.20))
  } else {
    // ── MRSA: gram-positive coccus walls ─────────────────────────────────
    anat.bacteriaWallC1!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.90)
    anat.bacteriaWallC2!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.55)
    // Septum pulses faintly (division plane activity)
    const septumOp = 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 0.0006))
    anat.septum!.attr('stroke', color).attr('stroke-opacity', Math.max(0, septumOp - impact * 0.12))
  }

  // ── Nucleoid (diffuse chromosomal region) ─────────────────────────────
  // E. coli nucleoid is elongated along the rod axis; MRSA is roughly circular
  const nucA = isRod ? 18 : 12  // semi-major (vertical for rod)
  const nucB = isRod ? 10 : 12  // semi-minor (horizontal)
  const nucNoise = isVibrating ? impact * 1.2 : 0
  const nucPts: BlobPoint[] = anat.nucleoidPhases.map((ph) => {
    const nucBaseR = isRod ? capsuleR(ph.baseAngle, nucA, nucB) : nucA
    const wave  = Math.sin(elapsed * 0.0004 * ph.speed + ph.phaseOffset) * 2
    const noise = (Math.random() - 0.5) * nucNoise
    return { angle: ph.baseAngle, r: nucBaseR + wave + noise }
  })
  anat.nucleoidBlob.attr('d', nucLineGen(nucPts) || '')
    .attr('fill', color).attr('fill-opacity', 0.11)

  // ── Ribosomes ─────────────────────────────────────────────────────────
  anat.ribosomeDots.forEach((dot) => dot.attr('fill', color).attr('fill-opacity', 0.32))
}

interface VirusUpdateParams {
  elapsed: number
  color:   string
  impact:  number
}

function updateVirusAnatomy(anat: VirusAnatomy, p: VirusUpdateParams): void {
  const { elapsed, color, impact } = p
  const { isCov2, N_SPIKES, STALK_LEN, HEAD_R } = anat

  // ── Inner rings (matrix protein layer + nucleocapsid) ─────────────────
  const ringPulse = (Math.sin(elapsed * 0.0008) + 1) / 2
  anat.virusInnerRings.forEach((ring, i) => {
    ring.attr('stroke', color)
      .attr('stroke-opacity', 0.15 + ringPulse * 0.10 - impact * 0.08 - i * 0.04)
  })

  // ── RNA core (inner glow grows under resonance) ────────────────────────
  anat.virusCore.attr('fill', color).attr('stroke', color)
    .attr('fill-opacity', 0.15 + impact * 0.12)
    .attr('stroke-opacity', 0.40)

  // ── Club-shaped spike proteins ─────────────────────────────────────────
  // Spikes sway slightly; break and retract as capsid disrupts
  anat.virusSpikes.forEach(({ stalk, head }, i) => {
    const baseAngle = (i / N_SPIKES) * Math.PI * 2
    const sway      = Math.sin(elapsed * 0.0009 + i * 1.3) * 0.07
    const angle     = baseAngle + sway
    const lenFactor = Math.max(0, 1 - impact * 0.70)  // spikes retract as capsid fails
    const curLen    = STALK_LEN * lenFactor
    const spikeOp   = Math.max(0, 0.75 - impact * 0.65)
    const x1 = BASE_R * Math.cos(angle), y1 = BASE_R * Math.sin(angle)
    const x2 = (BASE_R + curLen) * Math.cos(angle)
    const y2 = (BASE_R + curLen) * Math.sin(angle)
    stalk.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      .attr('stroke', color).attr('stroke-opacity', spikeOp)
    head.attr('cx', (BASE_R + curLen + HEAD_R * 0.4) * Math.cos(angle))
      .attr('cy', (BASE_R + curLen + HEAD_R * 0.4) * Math.sin(angle))
      .attr('r', HEAD_R * lenFactor)
      .attr('fill', color).attr('stroke', color)
      .attr('fill-opacity', (isCov2 ? 0.30 : 0.22) * lenFactor)
      .attr('opacity', spikeOp)
  })
}

// ── Blob cell animation ───────────────────────────────────────────────────────

/**
 * Initialises the cell SVG animation.
 * Returns the D3 timer (implements `{ stop() }`).
 *
 * @param el           Container element (cellCanvas ref)
 * @param type         'healthy' | 'target' - used for unique SVG filter/gradient IDs
 * @param accentColor  Fixed accent color for this cell type
 * @param cellCategory Biological category - determines internal anatomy drawn
 * @param presetId     Specific preset ID (e.g. 'ecoli', 'mrsa', 'sarscov2') - refines shape
 * @param getFrame     Called each tick; reads current reactive state from Vue
 */
export function setupBlobAnimation(
  el: HTMLElement,
  type: 'healthy' | 'target',
  accentColor: string,
  cellCategory: 'mammalian' | 'bacteria' | 'virus',
  presetId: string | undefined,
  getFrame: () => BlobFrame,
): d3.Timer {
  const W = CANVAS_W, H = CANVAS_H, cx = W / 2, cy = H / 2
  const BG = '#080e1a'

  // ── Rod shape (E. coli bacillus) ──────────────────────────────────────────
  // rodA = semi-axis along θ=0 (vertical, tall direction) = BASE_R
  // rodB = semi-axis along θ=π/2 (horizontal, narrow direction) ≈ 45% of BASE_R
  const isRod = presetId === 'ecoli'
  const ROD_A = BASE_R
  const ROD_B = Math.round(BASE_R * 0.45)   // ≈25px, visibly rod-shaped

  // Per-angle base radius: ellipse for E. coli, circle for everything else
  const shapeBaseR = (theta: number): number =>
    isRod ? capsuleR(theta, ROD_A, ROD_B) : BASE_R

  // Pole positions (ends of cell along long axis)
  const northPoleR = BASE_R   // same for rod and sphere (rodA = BASE_R)
  const southPoleR = BASE_R

  d3.select(el).selectAll('*').remove()
  const svg  = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
  const defs = svg.append('defs')

  // ── Glow filter (membrane stroke) ─────────────────────────────────────────
  const glowId = `glowFilter-${type}`
  const gf     = defs.append('filter').attr('id', glowId)
    .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
  const glowBlur = gf.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
  const gm = gf.append('feMerge')
  gm.append('feMergeNode').attr('in', 'coloredBlur')
  gm.append('feMergeNode').attr('in', 'SourceGraphic')

  // ── Field ray glow filter (horizontal-only blur for beam look) ────────────
  const rayGlowId = `rayGlow-${type}`
  const rf = defs.append('filter').attr('id', rayGlowId)
    .attr('x', '-600%').attr('y', '0%').attr('width', '1300%').attr('height', '100%')
  rf.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '4 0').attr('result', 'blur')
  const rfm = rf.append('feMerge')
  rfm.append('feMergeNode').attr('in', 'blur')
  rfm.append('feMergeNode').attr('in', 'SourceGraphic')

  // ── Radial gradient (cytoplasm fill - thermal-tinted in timer loop) ───────
  const gradId   = `cellGrad-${type}`
  const cellGrad = defs.append('radialGradient').attr('id', gradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('cx', -BASE_R * 0.28).attr('cy', -BASE_R * 0.35)
    .attr('r',  BASE_R * 1.6)
    .attr('fx', -BASE_R * 0.32).attr('fy', -BASE_R * 0.40)
  cellGrad.append('stop').attr('offset', '0%')
    .attr('stop-color', 'white').attr('stop-opacity', 0.18)
  const gradStop1 = cellGrad.append('stop').attr('offset', '100%')
    .attr('stop-color', accentColor).attr('stop-opacity', 0.10)

  // ── Field ray gradients (north: fades in toward cell; south: fades out away) ─
  const rayNGradId = `rayN-${type}`
  const rayNGrad   = defs.append('linearGradient').attr('id', rayNGradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', -cy).attr('x2', 0).attr('y2', -northPoleR)
  rayNGrad.append('stop').attr('offset', '0%').attr('stop-color', accentColor).attr('stop-opacity', 0)
  // Gradient bright stop uses fixed opacity=1 so we can control overall brightness
  // via the rect element's own opacity attribute (more reliable than stop-opacity).
  const rayNBrightStop = rayNGrad.append('stop').attr('offset', '100%')
    .attr('stop-color', accentColor).attr('stop-opacity', 1.0)

  // ── South field ray gradient (electrode at canvas bottom → south pole) ─────
  // Symmetric counterpart to north; together they represent the AC dipole field.
  const raySGradId = `rayS-${type}`
  const raySGrad   = defs.append('linearGradient').attr('id', raySGradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', cy).attr('x2', 0).attr('y2', southPoleR)
  raySGrad.append('stop').attr('offset', '0%').attr('stop-color', accentColor).attr('stop-opacity', 0)
  const raySBrightStop = raySGrad.append('stop').attr('offset', '100%')
    .attr('stop-color', accentColor).attr('stop-opacity', 1.0)

  // ── Main cell group (everything relative to cell centre) ──────────────────
  const cellG = svg.append('g').attr('transform', `translate(${cx},${cy})`)

  // ── Electric field ray from above (painted first → behind everything) ──────
  // Represents the applied electric field directed onto the cell from the electrode.
  // Color encodes frequency (cyan→violet, log-scaled). Opacity encodes field intensity.
  const rayTopH = cy - northPoleR
  // Central beam + two fainter flanking rays; all share the same gradient.
  const rayNC = cellG.append('rect').attr('x', -3).attr('y', -cy).attr('width', 6).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`).attr('filter', `url(#${rayGlowId})`)
  const rayNL = cellG.append('rect').attr('x', -14).attr('y', -cy).attr('width', 3).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`)
  const rayNR = cellG.append('rect').attr('x', 11).attr('y', -cy).attr('width', 3).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`)

  // ── South electrode beam (symmetric, painted after north to maintain z-order) ─
  const raySTopH = cy - southPoleR
  const raySC = cellG.append('rect').attr('x', -3).attr('y', southPoleR).attr('width', 6).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`).attr('filter', `url(#${rayGlowId})`)
  const raySL = cellG.append('rect').attr('x', -14).attr('y', southPoleR).attr('width', 3).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`)
  const raySR = cellG.append('rect').attr('x', 11).attr('y', southPoleR).attr('width', 3).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`)

  // ── Aura rings ────────────────────────────────────────────────────────────
  const auraRings = [
    cellG.append('circle').attr('r', BASE_R + 14).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.2),
    cellG.append('circle').attr('r', BASE_R + 26).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 0.8),
    cellG.append('circle').attr('r', BASE_R + 40).attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 0.5),
  ]

  // ── Cell body group (rotatable - bacteria align to field axis under DEP) ──
  // Field rays and aura rings stay in cellG (they represent the external field,
  // not the cell body, so they must not rotate with the cell).
  const bodyG = cellG.append('g')

  // ── Cell body fill ────────────────────────────────────────────────────────
  const blobFill = bodyG.append('path').attr('fill', `url(#${gradId})`)

  // ── Category-specific anatomy setup ───────────────────────────────────────
  const mammalianAnatomy = cellCategory === CELL_CATEGORY.MAMMALIAN
    ? setupMammalianAnatomy(bodyG, type, accentColor) : null
  const bacteriaAnatomy  = cellCategory === CELL_CATEGORY.BACTERIA
    ? setupBacteriaAnatomy(bodyG, accentColor, isRod, ROD_A, ROD_B) : null
  const virusAnatomy     = cellCategory === CELL_CATEGORY.VIRUS
    ? setupVirusAnatomy(bodyG, accentColor, presetId) : null

  // ── Membrane stroke (on top of all interior elements) ─────────────────────
  const blobStroke = bodyG.append('path').attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 2.5).attr('filter', `url(#${glowId})`)

  // ── Electroporation / capsid pores ────────────────────────────────────────
  // Drawn in BG colour - appear as holes in the membrane at high disruption.
  // Centres are inset 18 % from the membrane surface so the circles stay
  // completely inside the blob at all allowed radii (max r ≤ BASE_R * 0.18).
  // Side pores (pore3/4) disabled for rod shape since those positions are off-membrane.
  const PORE_INSET  = 0.82   // fraction of membrane radius to the pore centre
  const PORE_MAX_R  = Math.floor(BASE_R * 0.18)  // ≈ 9 px — hard ceiling keeps pores inside cell
  const SIN60 = Math.sin(Math.PI / 3), COS60 = Math.cos(Math.PI / 3)
  const northPore = bodyG.append('circle').attr('cy', -northPoleR * PORE_INSET).attr('r', 0).attr('fill', BG)
  const southPore = bodyG.append('circle').attr('cy',  southPoleR * PORE_INSET).attr('r', 0).attr('fill', BG)
  const pore3 = bodyG.append('circle').attr('cx',  BASE_R * SIN60 * PORE_INSET).attr('cy', -BASE_R * COS60 * PORE_INSET).attr('r', 0).attr('fill', BG)
  const pore4 = bodyG.append('circle').attr('cx', -BASE_R * SIN60 * PORE_INSET).attr('cy',  BASE_R * COS60 * PORE_INSET).attr('r', 0).attr('fill', BG)

  // ── Pseudo-3D depth cues ───────────────────────────────────────────────────
  // Equatorial ring: thin horizontal ellipse at the cell's equatorial plane,
  // foreshortened in perspective (ry ≪ rx). Deforms with DEP force to show
  // whether the cell is prolate (pDEP, E-W) or oblate (nDEP, N-S).
  const equatorialRing = bodyG.append('ellipse')
    .attr('rx', BASE_R * 0.88).attr('ry', BASE_R * 0.13)
    .attr('fill', 'none')
    .attr('stroke', accentColor).attr('stroke-width', 0.5).attr('stroke-opacity', 0.07)
    .attr('pointer-events', 'none')

  // Specular highlight: small soft ellipse on upper-left quadrant.
  // Simulates a diffuse light source from upper-left - turns the flat blob into a legible sphere.
  const specularDot = bodyG.append('ellipse')
    .attr('rx', BASE_R * 0.19).attr('ry', BASE_R * 0.12)
    .attr('cx', -BASE_R * 0.22).attr('cy', -BASE_R * 0.30)
    .attr('fill', 'white').attr('fill-opacity', 0.09)
    .attr('pointer-events', 'none')

  // ── Transmembrane Vm pole glow ─────────────────────────────────────────────
  // Schwan equation: Vm(f) = 1.5·E·R·cosθ / √(1+(ωτ)²), maximum at field-aligned poles.
  // Elliptical glow at N and S poles grows with disruption ratio (proxy for Vm magnitude).
  // Rotates with bodyG so it always marks the correct poles relative to the cell body.
  const northPoleGlow = bodyG.append('ellipse')
    .attr('cx', 0).attr('cy', -northPoleR * 0.80)
    .attr('rx', BASE_R * 0.26).attr('ry', BASE_R * 0.13)
    .attr('fill', accentColor).attr('fill-opacity', 0)
    .attr('pointer-events', 'none')
  const southPoleGlow = bodyG.append('ellipse')
    .attr('cx', 0).attr('cy', southPoleR * 0.80)
    .attr('rx', BASE_R * 0.26).attr('ry', BASE_R * 0.13)
    .attr('fill', accentColor).attr('fill-opacity', 0)
    .attr('pointer-events', 'none')

  // ── DEP visual effects state ───────────────────────────────────────────────
  // Three visual cues for DEP - no arrows, no symbols:
  //
  // 1. Blob deformation (blobPts map below):
  //    pDEP (K > 0): cell elongates E-W (toward field-maxima electrodes).
  //    nDEP (K < 0): cell elongates N-S (squeezed out of high-field zone).
  //    Formula: depDeform(θ) = K · BASE_R · 0.24 · (−cos 2θ)
  //    Hidden at |K| < 0.02, field < 5 V/cm, or lysed/lysing.
  //
  // 2. Bacteria alignment rotation (bacteria only):
  //    pDEP → long axis parallel to field (vertical, 0°)
  //    nDEP → long axis perpendicular to field (horizontal, 90°)
  //    Smooth exponential interpolation toward target angle.
  //
  // 3. Translational drift (all cells):
  //    pDEP → cell drifts toward field source (upward, −Y)
  //    nDEP → cell drifts away from field source (downward, +Y)
  //    Smooth exponential interpolation; max ±8px.
  let depDeformScale = 0   // updated every timer tick before blobPts
  let depAlignAngle  = 0   // bacteria rotation toward/from field axis (degrees)
  let depDriftY      = 0   // whole-cell translational drift (px, toward/from field source)

  // ── Blob perimeter control points ─────────────────────────────────────────
  const N = BLOB_POINTS
  const blobPhases = d3.range(N).map((i: number) => ({
    baseAngle:   (i / N) * Math.PI * 2,
    phaseOffset: ((i * 7919) % 6283) / 1000,
    speed:       0.6 + ((i * 1013) % 1000) / 2500,
  }))
  const blobLine = d3.lineRadial<BlobPoint>().angle((d) => d.angle).radius((d) => d.r).curve(d3.curveBasisClosed)

  let shatterStartElapsed = -1

  // Pre-baked membrane irregularity for cancer (mammalian target) cells.
  // Biologically: loss of contact inhibition → invasive pseudopods → irregular membrane outline.
  // Range: -3 to +7 px asymmetric bumps on top of BASE_R.
  const cancerBaseOffsets: number[] = []
  if (cellCategory === CELL_CATEGORY.MAMMALIAN && type === CELL_TYPE.TARGET) {
    for (let i = 0; i < N; i++) {
      cancerBaseOffsets.push(((i * 2971 + 1777) % 2000) / 200 - 3)
    }
  }

  // ── D3 timer loop ──────────────────────────────────────────────────────────
  const timer = d3.timer((elapsed: number) => {
    const { impact, state, color, temperature, fieldVcm, freqKHz, nuclearDisruptionRatio, depCmReal } = getFrame()

    // ── Field ray color + intensity (constant per tick, shared by all states) ─
    // freqKHz log-scale 10 kHz → 30 GHz: cyan (#00d4ff) → violet (#a78bfa)
    const freqNorm = Math.max(0, Math.min(1,
      (Math.log10(Math.max(10, freqKHz)) - 1) / (Math.log10(30e6) - 1)
    ))
    const rayColor = d3.interpolateRgbBasis(['#00d4ff', '#4a9eff', '#7c6cff', '#a78bfa'])(freqNorm)
    // fieldVcm log-scale 10-10,000 V/cm → opacity 0.05-0.72
    const fieldNorm = Math.max(0, Math.min(1, (Math.log10(Math.max(1, fieldVcm)) - 1) / 3))
    const rayOpacity = state === CELL_STATE.LYSED ? 0 : Math.max(0.04, 0.06 + fieldNorm * 0.66)

    // AC modulation: slow visual pulse (~0.5 Hz) to represent field oscillation.
    // Actual RF frequencies (kHz-GHz) are imperceptible; this is a representational cue.
    const acPulse   = (Math.sin(elapsed * 0.006) + 1) / 2
    const modOpacity = rayOpacity * (0.50 + acPulse * 0.50)

    // Color via gradient stop-color; intensity via rect opacity (more reliably reactive)
    rayNBrightStop.attr('stop-color', rayColor)
    rayNC.attr('opacity', modOpacity)
    rayNL.attr('opacity', modOpacity * 0.38)
    rayNR.attr('opacity', modOpacity * 0.38)
    // South electrode beam: same AC phase (both electrodes switch simultaneously in AC field)
    raySBrightStop.attr('stop-color', rayColor)
    raySC.attr('opacity', modOpacity)
    raySL.attr('opacity', modOpacity * 0.38)
    raySR.attr('opacity', modOpacity * 0.38)

    // ── DEP blob deformation + concentration halos ───────────────────────────
    // Computed here so depDeformScale is available in the blobPts map() below.
    const depAbsK = Math.abs(depCmReal)
    const depActive = depAbsK >= 0.02 && fieldVcm >= 5
      && state !== CELL_STATE.LYSED && state !== CELL_STATE.LYSING
    depDeformScale = depActive ? depCmReal * BASE_R * 0.24 : 0

    // ── DEP: bacteria alignment rotation ─────────────────────────────────────
    // Bacteria orient along field axis due to DEP torque.
    // pDEP (K>0): long axis parallel to field = 0° (vertical, field is N-S in canvas)
    // nDEP (K<0): long axis perpendicular to field = 90° rotation
    const targetAlignAngle = (cellCategory === CELL_CATEGORY.BACTERIA && depActive)
      ? (depCmReal > 0 ? 0 : 90)
      : 0
    depAlignAngle += (targetAlignAngle - depAlignAngle) * 0.025
    bodyG.attr('transform', `rotate(${depAlignAngle.toFixed(2)})`)

    // ── Dynamic beam height: tracks actual cell pole extent along field axis ──
    // When E. coli rotates (nDEP → 90°), its vertical half-size shrinks from
    // ROD_A (55 px) to ROD_B (25 px). The beam must lengthen to still reach the cell.
    // capsuleR(angle, ROD_A, ROD_B) gives the ellipse radius at that world angle.
    const effectivePoleR = isRod
      ? capsuleR(depAlignAngle * Math.PI / 180, ROD_A, ROD_B)
      : BASE_R
    const dynTopH = cy - effectivePoleR
    rayNGrad.attr('y2', -effectivePoleR)
    rayNC.attr('y', -cy).attr('height', dynTopH)
    rayNL.attr('y', -cy).attr('height', dynTopH)
    rayNR.attr('y', -cy).attr('height', dynTopH)
    raySGrad.attr('y2', effectivePoleR)
    raySC.attr('y', effectivePoleR).attr('height', dynTopH)
    raySL.attr('y', effectivePoleR).attr('height', dynTopH)
    raySR.attr('y', effectivePoleR).attr('height', dynTopH)

    // ── DEP: translational drift toward/away from field source ───────────────
    // pDEP: cell migrates toward high-field region (electrode = top of canvas)
    // nDEP: cell migrates away from electrode, toward field minimum
    const targetDrift = depActive ? (depCmReal > 0 ? -8 : 8) : 0
    depDriftY += (targetDrift - depDriftY) * 0.018
    cellG.attr('transform', `translate(${cx},${(cy + depDriftY).toFixed(2)})`)

    // ── Pseudo-3D: equatorial ring deformation ────────────────────────────────
    // Equatorial ring rx tracks the E-W extent of the cell (same axis as depDeformScale).
    // pDEP: ring widens (prolate, E-W elongation); nDEP: ring narrows (oblate, N-S elongation).
    const eqRx = Math.max(4, BASE_R * 0.88 + depDeformScale * 0.55)
    equatorialRing
      .attr('rx', eqRx)
      .attr('stroke', color)
      .attr('stroke-opacity', depActive ? 0.13 + depAbsK * 0.09 : 0.07)

    // Specular highlight - static 3D depth cue; brightens slightly with field intensity
    specularDot.attr('fill-opacity', 0.07 + fieldNorm * 0.06)

    // ── Lysed ──────────────────────────────────────────────────────────────
    if (state === CELL_STATE.LYSED) {
      blobStroke.attr('stroke-opacity', 0)
      blobFill.attr('fill-opacity', 0)
      auraRings.forEach((r) => r.attr('stroke-opacity', 0))
      if (mammalianAnatomy) {
        mammalianAnatomy.nucBlob.attr('fill-opacity', 0).attr('stroke-opacity', 0)
        mammalianAnatomy.nucOuterEnv.attr('stroke-opacity', 0)
        mammalianAnatomy.nucleolus.attr('fill-opacity', 0)
        mammalianAnatomy.nucleolus2?.attr('fill-opacity', 0)
        mammalianAnatomy.cortexRing.attr('stroke-opacity', 0)
        mammalianAnatomy.mitoEls.forEach(({ g }) => g.attr('opacity', 0))
      }
      if (bacteriaAnatomy) {
        bacteriaAnatomy.bacteriaWallElOuter?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallElInner?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallC1?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallC2?.attr('stroke-opacity', 0)
        bacteriaAnatomy.septum?.attr('stroke-opacity', 0)
        bacteriaAnatomy.flagEl?.attr('stroke-opacity', 0)
        bacteriaAnatomy.nucleoidBlob.attr('fill-opacity', 0)
        bacteriaAnatomy.ribosomeDots.forEach((d) => d.attr('opacity', 0))
      }
      if (virusAnatomy) {
        virusAnatomy.virusInnerRings.forEach((r) => r.attr('opacity', 0))
        virusAnatomy.virusCore.attr('opacity', 0)
        virusAnatomy.virusSpikes.forEach(({ stalk, head }) => {
          stalk.attr('stroke-opacity', 0); head.attr('opacity', 0)
        })
      }
      rayNC.attr('opacity', 0); rayNL.attr('opacity', 0); rayNR.attr('opacity', 0)
      raySC.attr('opacity', 0); raySL.attr('opacity', 0); raySR.attr('opacity', 0)
      northPoleGlow.attr('fill-opacity', 0); southPoleGlow.attr('fill-opacity', 0)
      equatorialRing.attr('stroke-opacity', 0)
      specularDot.attr('fill-opacity', 0)
      northPore.attr('r', 0); southPore.attr('r', 0)
      pore3.attr('r', 0);     pore4.attr('r', 0)
      glowBlur.attr('stdDeviation', '1')
      // Interrupt and remove any fragment <line> elements that are still mid-transition.
      // Without this, lines spawned in the final ~1500 ms of LYSING remain in the SVG
      // and appear as static artefacts once the overlay covers the canvas.
      d3.select(el).select('svg').selectAll('line').interrupt().remove()
      timer.stop()
      return
    }

    // ── Lysing (progressive shatter) ───────────────────────────────────────
    if (state === CELL_STATE.LYSING) {
      if (shatterStartElapsed < 0) shatterStartElapsed = elapsed
      const progress = Math.min(1, Math.max(0, (elapsed - shatterStartElapsed) / LYSIS_DURATION_MS))
      const chaos    = 12 + progress * 45
      const expandR  = BASE_R + progress * 32
      const blobPts: BlobPoint[] = blobPhases.map((ph) => ({
        angle: ph.baseAngle, r: expandR + (Math.random() - 0.5) * chaos * 2,
      }))
      const bp = blobLine(blobPts) || ''
      blobStroke.attr('d', bp).attr('stroke', '#ff4d6d')
        .attr('stroke-opacity', Math.max(0, 1 - progress * 0.9)).attr('stroke-width', 2.5 + progress * 3)
      blobFill.attr('d', bp).attr('fill', '#ff4d6d').attr('fill-opacity', Math.max(0, 0.1 - progress * 0.1))
      auraRings.forEach((ring, i) =>
        ring.attr('stroke-opacity', Math.max(0, 0.3 - progress * 0.35 - i * 0.05)))
      if (mammalianAnatomy) {
        mammalianAnatomy.nucBlob.attr('stroke', '#ff4d6d')
          .attr('stroke-opacity', Math.max(0, 0.42 - progress * 0.42))
          .attr('fill-opacity', Math.max(0, 0.12 - progress * 0.12))
        mammalianAnatomy.nucOuterEnv.attr('stroke', '#ff4d6d')
          .attr('stroke-opacity', Math.max(0, 0.25 - progress * 0.25))
        mammalianAnatomy.nucleolus.attr('fill-opacity', Math.max(0, 0.28 - progress * 0.28))
        mammalianAnatomy.nucleolus2?.attr('fill-opacity', Math.max(0, 0.20 - progress * 0.20))
        mammalianAnatomy.cortexRing.attr('stroke-opacity', Math.max(0, 0.09 - progress * 0.09))
        mammalianAnatomy.mitoEls.forEach(({ g }, i) => g.attr('opacity', Math.max(0, 1 - progress * 1.3 - i * 0.12)))
      }
      if (bacteriaAnatomy) {
        bacteriaAnatomy.nucleoidBlob.attr('fill-opacity', Math.max(0, 0.11 - progress * 0.11))
        bacteriaAnatomy.ribosomeDots.forEach((d, i) => d.attr('opacity', Math.max(0, 1 - progress * 1.5 - i * 0.05)))
        bacteriaAnatomy.bacteriaWallElOuter?.attr('stroke-opacity', Math.max(0, 0.22 - progress * 0.22))
        bacteriaAnatomy.bacteriaWallElInner?.attr('stroke-opacity', Math.max(0, 0.16 - progress * 0.16))
        bacteriaAnatomy.bacteriaWallC1?.attr('stroke-opacity', Math.max(0, 0.16 - progress * 0.16))
        bacteriaAnatomy.bacteriaWallC2?.attr('stroke-opacity', Math.max(0, 0.13 - progress * 0.13))
        bacteriaAnatomy.septum?.attr('stroke-opacity', Math.max(0, 0.18 - progress * 0.18))
        bacteriaAnatomy.flagEl?.attr('stroke-opacity', Math.max(0, 0.30 - progress * 0.30))
      }
      if (virusAnatomy) {
        virusAnatomy.virusInnerRings.forEach((r) => r.attr('opacity', Math.max(0, 1 - progress * 1.2)))
        virusAnatomy.virusCore.attr('opacity', Math.max(0, 1 - progress * 1.4))
        virusAnatomy.virusSpikes.forEach(({ stalk, head }, i) => {
          const op = Math.max(0, 0.75 - progress * 0.9 - i * 0.04)
          stalk.attr('stroke-opacity', op); head.attr('opacity', op)
        })
      }
      northPore.attr('r', Math.min(PORE_MAX_R, 3 + progress * 6)); southPore.attr('r', Math.min(PORE_MAX_R, 3 + progress * 6))
      pore3.attr('r', isRod ? 0 : Math.min(PORE_MAX_R * 0.6, 2 + progress * 3))
      pore4.attr('r', isRod ? 0 : Math.min(PORE_MAX_R * 0.6, 2 + progress * 3))
      equatorialRing.attr('stroke-opacity', Math.max(0, 0.07 - progress * 0.07))
      specularDot.attr('fill-opacity', Math.max(0, 0.09 - progress * 0.09))
      northPoleGlow.attr('fill-opacity', 0); southPoleGlow.attr('fill-opacity', 0)
      glowBlur.attr('stdDeviation', (3 + progress * 12).toFixed(1))
      return
    }

    // ── Normal: stable / nourishing / approaching / vibrating ──────────────
    const isVibrating  = state === CELL_STATE.VIBRATING
    const isNourishing = state === CELL_STATE.NOURISHING

    // Rigid-shell pathogens deform less per unit impact
    const rigidityFactor = cellCategory === CELL_CATEGORY.VIRUS ? 0.40 : cellCategory === CELL_CATEGORY.BACTERIA ? 0.60 : 1.0
    const jitter    = (isVibrating ? 4 + impact * 18 : isNourishing ? 5 : 6) * rigidityFactor
    const radiusMod = isNourishing ? 1 + impact * 0.12 : 1
    const speedMult = isVibrating ? 1 + impact * 5 : isNourishing ? 0.4 + impact * 0.4 : 0.8

    const blobPts: BlobPoint[] = blobPhases.map((ph, idx) => {
      const baseR  = shapeBaseR(ph.baseAngle) + (cancerBaseOffsets[idx] ?? 0)
      const wave   = Math.sin(elapsed * 0.001 * ph.speed * speedMult + ph.phaseOffset) * jitter
      const noise  = (Math.random() - 0.5) * (isVibrating ? jitter * 0.5 : 2.5) * rigidityFactor
      const depR   = depDeformScale !== 0 ? depDeformScale * (-Math.cos(2 * ph.baseAngle)) : 0
      return { angle: ph.baseAngle, r: baseR * radiusMod + wave + noise + depR }
    })
    const blobPath = blobLine(blobPts) || ''

    // ── Thermal tint ────────────────────────────────────────────────────────
    const tNorm       = Math.max(0, Math.min(1, (temperature - 37) / 63))
    const thermalColor = tNorm < 0.08
      ? accentColor
      : d3.interpolateRgb(accentColor, '#fb923c')(Math.min(1, (tNorm - 0.08) / 0.45))

    blobFill.attr('d', blobPath).attr('fill', `url(#${gradId})`)
    gradStop1.attr('stop-color', thermalColor)
    blobStroke.attr('d', blobPath).attr('stroke', color)
      .attr('stroke-opacity', 1).attr('stroke-width', isNourishing ? 3 : 2.5)

    // ── Aura rings ──────────────────────────────────────────────────────────
    const auraPulseSpeed = isVibrating ? 0.003 + impact * 0.006
      : isNourishing ? 0.0018 + impact * 0.004 : 0.0012
    auraRings.forEach((ring, i) => {
      const pulse       = (Math.sin(elapsed * auraPulseSpeed - i * 0.9) + 1) / 2
      const baseOpacity = isVibrating ? 0.08 + impact * 0.35
        : isNourishing ? 0.14 + impact * 0.28 : 0.04 + impact * 0.04
      ring.attr('stroke', color)
        .attr('stroke-opacity', baseOpacity * (0.45 + pulse * 0.55))
        .attr('r', BASE_R + 14 + i * 13 + (isNourishing ? 4 + impact * 14 : isVibrating ? impact * 4 : 0))
    })

    // ── Category-specific interior update ─────────────────────────────────
    if (mammalianAnatomy) {
      updateMammalianAnatomy(mammalianAnatomy, {
        elapsed, color, thermalColor, impact, tNorm, isNourishing, isVibrating, nuclearDisruptionRatio,
      })
    }
    if (bacteriaAnatomy) {
      updateBacteriaAnatomy(bacteriaAnatomy, { elapsed, color, impact, isVibrating })
    }
    if (virusAnatomy) {
      updateVirusAnatomy(virusAnatomy, { elapsed, color, impact })
    }

    // ── Transmembrane Vm pole glow ─────────────────────────────────────────
    // Grows from DR≈5% (Vm begins to build) to full brightness at DR≈100%.
    // Color interpolates accentColor → amber → red tracking the disruption state.
    // Modulated by the AC pulse to visually link it to the applied field.
    const poleGlowIntensity = Math.max(0, (impact - 0.05) * 0.42)
    const poleGlowColor = impact < 0.5
      ? color
      : impact < 0.85
        ? d3.interpolateRgb(color, '#fbbf24')((impact - 0.5) / 0.35)
        : '#ff4d6d'
    northPoleGlow.attr('fill', poleGlowColor).attr('fill-opacity', poleGlowIntensity * modOpacity)
    southPoleGlow.attr('fill', poleGlowColor).attr('fill-opacity', poleGlowIntensity * modOpacity)

    // ── Electroporation / capsid pores ─────────────────────────────────────
    // Rev-EP (50-85% DR): small amber cycling pores — reversible permeabilisation.
    // IRE (>85% DR): opaque BG-colour holes — irreversible membrane breach.
    const isRevEp       = state === CELL_STATE.REV_EP
    const revEpCycle    = isRevEp ? (Math.sin(elapsed * 0.0022) + 1) / 2 : 0
    const revEpPoreR    = isRevEp ? 1.0 + revEpCycle * 2.4 : 0
    const primaryPore   = Math.min(PORE_MAX_R, Math.max(0, (impact - 0.70) / 0.30) * 4.5)
    const secondaryPore = isRod ? 0 : Math.min(PORE_MAX_R * 0.6, Math.max(0, (impact - 0.88) / 0.15) * 3.5)
    const finalPoleR    = Math.max(revEpPoreR, primaryPore)
    const poreIsHole    = primaryPore > 0.5
    northPore.attr('r', finalPoleR).attr('fill', poreIsHole ? BG : '#d97706')
      .attr('fill-opacity', poreIsHole ? 1 : 0.28 + revEpCycle * 0.32)
    southPore.attr('r', finalPoleR).attr('fill', poreIsHole ? BG : '#d97706')
      .attr('fill-opacity', poreIsHole ? 1 : 0.28 + revEpCycle * 0.32)
    pore3.attr('r', secondaryPore).attr('fill', BG).attr('fill-opacity', 1)
    pore4.attr('r', secondaryPore).attr('fill', BG).attr('fill-opacity', 1)

    glowBlur.attr('stdDeviation',
      isNourishing ? (3 + impact * 10).toFixed(1)
      : isVibrating  ? (3 + impact * 7).toFixed(1)
      : '3')
  })

  return timer
}

// ── Oscilloscope strip ────────────────────────────────────────────────────────

/**
 * Initialises the oscilloscope waveform SVG animation.
 * Returns the D3 timer.
 */
export function setupOscilloscope(
  el: HTMLElement,
  accentColor: string,
  getFrame: () => OscFrame,
): d3.Timer {
  const W = OSC_W, H = OSC_H

  d3.select(el).selectAll('*').remove()
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)

  const path = svg.append('path').attr('fill', 'none').attr('stroke', accentColor).attr('stroke-width', 1.5).attr('stroke-opacity', 0.85)

  const lineGen = d3.line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y)

  const timer = d3.timer((elapsed: number) => {
    const { state, impact, liveAmplitude, cellColor, naturalFrequency } = getFrame()
    const scrollSpeed = naturalFrequency * 0.00008

    if (state === CELL_STATE.LYSED) {
      path.attr('d', `M0,${H / 2} L${W},${H / 2}`).attr('stroke', '#ff4d6d').attr('stroke-width', 1).attr('stroke-opacity', 0.4)
      timer.stop()
      return
    }

    const isVibrating  = state === CELL_STATE.VIBRATING
    const isNourishing = state === CELL_STATE.NOURISHING
    const isLysing     = state === CELL_STATE.LYSING

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
