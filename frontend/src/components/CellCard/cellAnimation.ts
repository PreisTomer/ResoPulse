// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Pure D3 animation helpers for CellCard. Each setup function takes a DOM element
// and a getFrame() callback that reads Vue reactive state on each tick.
// Anatomy: mammalian=nucleus+mito+cortex+rays+pores; ecoli=rod+dbl-mem+nucleoid+ribosome+flagellum+rays;
// mrsa=sphere+peptidoglycan+septum+nucleoid+rays; influenza=12 spikes+RNP+RNA+rays;
// sarscov2=16 spikes+lipid envelope+nucleocapsid+RNA+rays.
// Field rays: color=frequency (cyan→violet, log 10kHz–30GHz); opacity=field intensity.
import * as d3 from 'd3'
import type { BlobPoint, BlobFrame, OscFrame, CellState } from '@/types/cell'
import {
  CANVAS_W, CANVAS_H, BASE_R, BLOB_POINTS,
  LYSIS_DURATION_MS,
  OSC_W, OSC_H,
} from '@/constants/cellCard'
import { CELL_STATE, CELL_CATEGORY, CELL_TYPE, PRESET_ID, MORPHOLOGY_TAG } from '@/constants/strings'
import { C } from '@/theme/colors'

// ── Type aliases ──────────────────────────────────────────────────────────────
type D3Sel<E extends Element> = d3.Selection<E, unknown, null, undefined>
type PhaseEntry = { baseAngle: number; phaseOffset: number; speed: number }

// Visual profile derived from CellConfig. Known presets use curated values; custom presets
// fall back to physics-driven derivation (thresholdVoltage=malignancy, conductivity=mito fragmentation).
export interface CellVisualProfile {
  presetId:          string | undefined
  morphologyTag?:    string    // bacteria shape override: 'rod' | 'coccus' | 'coccobacillus'
  thresholdVoltage:  number    // V — lower=more malignant=larger nucleus+more protrusions
  conductivity:      number    // S/m — higher=stronger Warburg=more fragmented mitochondria
  resonantFreqGHz?:  number    // GHz — lower=larger/more complex virus=more spikes (custom fallback)
  capsidQ?:          number    // higher Q=longer/narrower spikes (custom virus fallback)
}

// Malignancy score [0–1]: lower Vth=more aggressive. Hepatocyte Vth≈1.1V; aggressive cancer≈0.5V.
function computeMalignancyScore(thresholdVoltage: number): number {
  return Math.max(0, Math.min(1, (1.15 - thresholdVoltage) / 0.65))
}

// ── Module-level animation constants ─────────────────────────────────────────

const CANVAS_BG       = '#080e1a'   // dark canvas fill (used for pore holes and BG mask)
const COLOR_LYSIS     = C.danger    // lysis / IRE disruption colour
const COLOR_AMBER     = C.amber     // rev-EP / amber warning colour
const COLOR_PORE_AMBER = '#d97706'  // pore amber (darker, inside membrane)
const COLOR_HEAT      = '#fb923c'   // thermal heat tint (orange)

const ROD_RATIO       = 0.45    // rod semi-axis: ROD_B = BASE_R × ROD_RATIO
const PORE_INSET      = 0.82    // pore centre as fraction of membrane radius
const ION_SPEEDS:   [number, number, number] = [0.00032, 0.00044, 0.00037]
const ION_PHASES_N: [number, number, number] = [0, 0.34, 0.67]
const ION_PHASES_S: [number, number, number] = [0.50, 0.83, 0.17]

// Per-preset nucleus blob radius (px); missing key falls back to NUC_R_HEALTHY
const NUC_R_MAP: Record<string, number> = {
  hl60:          36,
  panc1:         28,
  adenocarcinoma:27,
  gbm:           25,
}
const NUC_R_HEALTHY = 20

// Per-preset nuclear membrane wave amplitude (controls pleomorphism)
const NUC_WAVE_AMP_MAP: Record<string, number> = {
  hl60:          1.8,
  adenocarcinoma:6.0,
  gbm:           5.5,
  panc1:         4.2,
}
const NUC_WAVE_AMP_HEALTHY = 2.5

const CHAN_COUNT       = 8           // membrane ion-channel marker dots per cell
const ION_OFFSETS      = [-4, 0, 4] // ion streaming particle x-offsets (3 per pole)
const RAY_OVERLAP_RATIO = 0.55      // ray overlap into cell interior; gradient hides abrupt tip

// ── Shape helper ──────────────────────────────────────────────────────────────

// Polar radius of a vertical ellipse; D3 lineRadial: θ=0→top, θ=π/2→right
function capsuleR(theta: number, a: number, b: number): number {
  const s = Math.sin(theta), c = Math.cos(theta)
  return (a * b) / Math.sqrt(a * a * s * s + b * b * c * c)
}

// Per-preset radial offset [px] per control point: +ve=pseudopod, −ve=indentation
function computeCancerBaseOffset(i: number, N: number, profile: CellVisualProfile): number {
  const angleDeg = (i / N) * 360
  const seed = (i * 2971 + 1777) % 2000
  const nearestSpikeAngle = (spikes: number[]): number => {
    let minDist = 360
    for (const s of spikes) {
      const d = Math.abs(((angleDeg - s) % 360 + 360) % 360)
      const dist = d > 180 ? 360 - d : d
      if (dist < minDist) minDist = dist
    }
    return minDist
  }
  // ── Known presets: exact biologically-curated morphologies ────────────────
  if (profile.presetId === PRESET_ID.GBM) {
    // 5 stellate invasion protrusions at 72° spacing (GBM stellate morphology)
    const d = nearestSpikeAngle([0, 72, 144, 216, 288])
    return d < 20 ? 12 + (seed % 500) / 150 : (seed % 1000) / 500 - 2.5
  }
  if (profile.presetId === PRESET_ID.PANC1) {
    // 4 desmoplastic arms, slightly off 90° for natural asymmetry
    const d = nearestSpikeAngle([20, 110, 200, 290])
    return d < 22 ? 10 + (seed % 400) / 150 : (seed % 1000) / 500 - 1.5
  }
  if (profile.presetId === PRESET_ID.ADENOCARCINOMA) {
    // 3 large invasive pseudopods at ~120° spacing
    const d = nearestSpikeAngle([15, 135, 255])
    return d < 25 ? 10 + (seed % 600) / 150 : seed / 200 - 3
  }
  if (profile.presetId === PRESET_ID.HL60) {
    // Near-spherical blast cell: minimal bumps
    return (seed % 1200) / 200 - 2.0
  }
  // ── Custom preset: derive shape from thresholdVoltage (malignancy proxy) ──
  // Lower Vth = more malignant = more pronounced membrane extensions.
  const score = computeMalignancyScore(profile.thresholdVoltage)
  if (score > 0.70) {
    // Highly invasive: 3 pseudopods at ~120° spacing (adenocarcinoma-like)
    const d = nearestSpikeAngle([15, 135, 255])
    return d < 25 ? 9 + (seed % 500) / 150 : seed / 200 - 3
  }
  if (score > 0.40) {
    // Moderately invasive: 4 arms at ~90° spacing (PANC1-like)
    const d = nearestSpikeAngle([20, 110, 200, 290])
    return d < 22 ? 7 + (seed % 400) / 150 : (seed % 1000) / 500 - 1.5
  }
  // Low malignancy (Vth near healthy): near-spherical with mild random bumps
  return (seed % 1200) / 200 - 1.8
}

// Mitochondria geometry: cancer=Warburg fragmented, healthy=elongated cristae
function buildMitoData(
  isTarget: boolean,
  profile: CellVisualProfile,
): Array<{ x: number; y: number; rx: number; ry: number; angle: number }> {
  if (!isTarget) {
    return [  // 2 healthy elongated mitochondria with prominent cristae
      { x: -18, y: -15, rx: 10, ry: 4,   angle:  15 },
      { x:  20, y:  16, rx:  9, ry: 4,   angle: -20 },
    ]
  }
  switch (profile.presetId) {
    case PRESET_ID.ADENOCARCINOMA:
      return [  // 6 highly fragmented (severe Warburg — maximal glycolytic reprogramming)
        { x: -20, y: -14, rx: 6.0, ry: 2.5, angle:  20 },
        { x:  19, y:  16, rx: 5.5, ry: 2.2, angle: -25 },
        { x:  -5, y:  22, rx: 5.0, ry: 2.0, angle:  55 },
        { x:  13, y:  -9, rx: 5.5, ry: 2.2, angle: -40 },
        { x: -14, y:   9, rx: 4.5, ry: 1.9, angle:  80 },
        { x:  -8, y: -23, rx: 4.0, ry: 1.8, angle:  10 },
      ]
    case PRESET_ID.GBM:
      return [  // 2 small disorganized (necrotic core reduces mito density)
        { x: -15, y: -18, rx: 5, ry: 2.0, angle: -30 },
        { x:  16, y:  14, rx: 4, ry: 1.8, angle:  45 },
      ]
    case PRESET_ID.MCF7:
      return [  // 4 fragmented (ER+ moderate Warburg effect)
        { x: -19, y: -12, rx: 7.0, ry: 2.8, angle:  18 },
        { x:  18, y:  15, rx: 6.0, ry: 2.5, angle: -22 },
        { x:  -4, y:  20, rx: 5.0, ry: 2.2, angle:  60 },
        { x:  12, y:  -8, rx: 5.5, ry: 2.0, angle: -35 },
      ]
    case PRESET_ID.HL60:
      return [  // 1 tiny (leukemia blast — nucleus fills most of cell)
        { x: 20, y: 16, rx: 4, ry: 1.6, angle: -15 },
      ]
    case PRESET_ID.PANC1:
      return [  // 2 fragmented, squeezed to periphery by massive nucleus
        { x: -18, y: -10, rx: 5.5, ry: 2.1, angle:  25 },
        { x:  17, y:  12, rx: 5.0, ry: 1.9, angle: -30 },
      ]
    case PRESET_ID.A549:
      return [  // 3 fragmented (type II pneumocyte-like surfactant producer)
        { x: -20, y: -13, rx: 7, ry: 2.7, angle:  15 },
        { x:  18, y:  14, rx: 6, ry: 2.4, angle: -20 },
        { x:  -6, y:  20, rx: 5, ry: 2.1, angle:  50 },
      ]
    case PRESET_ID.LNCAP:
      return [  // 3 elongated (androgen-responsive, better-organised than typical cancer)
        { x: -18, y: -15, rx: 9, ry: 3.5, angle:  12 },
        { x:  20, y:  15, rx: 8, ry: 3.5, angle: -18 },
        { x:  -3, y:  18, rx: 7, ry: 3.0, angle:  55 },
      ]
    default: {
      // Custom preset: derive mito count and size from cytoplasmic conductivity.
      // Higher σ_i = stronger Warburg glycolytic reprogramming = more fragmented, more numerous mito.
      // σ_i range for mammalian targets: ~0.3 S/m (low metabolism) to ~1.2 S/m (highly active).
      const sigma = profile.conductivity
      const count = Math.min(6, Math.max(2, Math.round(sigma * 6.5)))
      const rxBase = Math.max(4.0, 7.5 - sigma * 1.5)  // smaller mito at higher conductivity (fragmentation)
      const ryBase = Math.max(1.6, 2.8 - sigma * 0.5)
      const positions = [
        { x: -20, y: -14, angle:  20 },
        { x:  19, y:  16, angle: -25 },
        { x:  -5, y:  22, angle:  55 },
        { x:  13, y:  -9, angle: -40 },
        { x: -14, y:   9, angle:  80 },
        { x:   8, y: -22, angle:  10 },
      ]
      return positions.slice(0, count).map(({ x, y, angle }) => ({ x, y, angle, rx: rxBase, ry: ryBase }))
    }
  }
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

// Preset-specific intracellular organelle that drifts slowly (Brownian motion)
interface OrganelleEl {
  el:       D3Sel<SVGCircleElement>
  baseX:    number
  baseY:    number
  driftAmp: number
  opacity:  number
}

interface MammalianAnatomy {
  type:         string  // stored from setup — needed during per-tick updates
  accentColor:  string
  profile:      CellVisualProfile
  mitoEls:      MitoEl[]
  nucG:         D3Sel<SVGGElement>
  nucBlob:      D3Sel<SVGPathElement>
  nucOuterEnv:  D3Sel<SVGPathElement>
  nucleolus:    D3Sel<SVGCircleElement>
  nucleolus2:   D3Sel<SVGCircleElement> | null
  nucleolus3:   D3Sel<SVGCircleElement> | null  // third nucleolus; adenocarcinoma only
  cortexRing:   D3Sel<SVGCircleElement>
  nucPhases:    PhaseEntry[]
  organelleEls: OrganelleEl[]  // lipid droplets, vesicles, chromatin dots
}

interface SpikeEl {
  stalk: D3Sel<SVGLineElement>
  head:  D3Sel<SVGCircleElement>
}

interface BacteriaAnatomy {
  isRod:               boolean
  ROD_A:               number  // semi-major rod axis (=BASE_R for E. coli); used to place flagella
  nucG:                D3Sel<SVGGElement>
  nucleoidBlob:        D3Sel<SVGPathElement>
  ribosomeDots:        Array<D3Sel<SVGCircleElement>>
  nucleoidPhases:      PhaseEntry[]
  bacteriaWallElOuter: D3Sel<SVGEllipseElement> | null  // E. coli only
  bacteriaWallElInner: D3Sel<SVGEllipseElement> | null  // E. coli only
  flagEls:             Array<D3Sel<SVGPathElement>> | null  // 3 peritrichous flagellar filaments (E. coli)
  hookEls:             Array<D3Sel<SVGPathElement>> | null  // 3 flagellar hook joints (E. coli)
  bacteriaWallC1:      D3Sel<SVGCircleElement>  | null  // MRSA only
  bacteriaWallC2:      D3Sel<SVGCircleElement>  | null  // MRSA only
  septum:              D3Sel<SVGLineElement>    | null  // MRSA only
  teichoicEls:         Array<D3Sel<SVGLineElement>> | null  // 20 wall teichoic acid protrusions (MRSA)
}

interface VirusAnatomy {
  isCov2:          boolean
  isInfluenza:     boolean
  N_SPIKES:        number
  STALK_LEN:       number
  HEAD_R:          number
  NA_HEAD_R:       number     // wider mushroom-cap for NA spikes (influenza only)
  naIndices:       Set<number>  // indices of NA spikes, every ~6th (influenza only)
  virusInnerRings: Array<D3Sel<SVGCircleElement>>
  virusCore:       D3Sel<SVGCircleElement>
  virusSpikes:     SpikeEl[]
}

// ── Anatomy setup functions ───────────────────────────────────────────────────

function setupMammalianAnatomy(
  cellG: D3Sel<SVGGElement>,
  type: string,
  accentColor: string,
  profile: CellVisualProfile,
): MammalianAnatomy {
  const isTarget = type === CELL_TYPE.TARGET
  const malignancyScore = isTarget ? computeMalignancyScore(profile.thresholdVoltage) : 0

  // Nuclear blob point count: more points = more irregular membrane (pleomorphism)
  const NUC_PTS = !isTarget                                    ? 10
    : profile.presetId === PRESET_ID.ADENOCARCINOMA            ? 16
    : profile.presetId === PRESET_ID.HL60                      ? 14
    : (malignancyScore > 0.60)                                 ? 15  // custom high-grade
    : 12

  // Nucleolus circle radius (px) — higher N/C ratio in aggressive cancers
  const NUCL_R = !isTarget                                     ? 6.5
    : profile.presetId === PRESET_ID.ADENOCARCINOMA            ? 9.0
    : profile.presetId === PRESET_ID.GBM                       ? 8.5
    : profile.presetId === PRESET_ID.PANC1                     ? 8.0
    : profile.presetId === PRESET_ID.HL60                      ? 4.5
    : 6.0 + malignancyScore * 3.0  // custom: 6.0px (low) → 9.0px (high malignancy)

  const cortexRing = cellG.append('circle').attr('r', BASE_R * 0.90)
    .attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 0.7).attr('stroke-opacity', 0.09)

  const mitoData = buildMitoData(isTarget, profile)
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

  const nucG = cellG.append('g')
  // Outer nuclear envelope (double-membrane ring; brightens with nuclear DR)
  const nucOuterEnv = nucG.append('path')
    .attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 0.9).attr('stroke-dasharray', '3,2').attr('stroke-opacity', 0.15)
  const nucBlob = nucG.append('path')
    .attr('fill', accentColor).attr('fill-opacity', 0.12)
    .attr('stroke', accentColor).attr('stroke-width', 1.2).attr('stroke-opacity', 0.42)
  const nucleolus = nucG.append('circle').attr('r', NUCL_R)
    .attr('fill', accentColor).attr('fill-opacity', 0.28)
  nucG.append('circle').attr('r', NUCL_R * 0.45)
    .attr('fill', accentColor).attr('fill-opacity', 0.45)
  let nucleolus2: D3Sel<SVGCircleElement> | null = null
  let nucleolus3: D3Sel<SVGCircleElement> | null = null
  if (isTarget) {
    nucleolus2 = nucG.append('circle').attr('r', NUCL_R * 0.78)
      .attr('fill', accentColor).attr('fill-opacity', 0.20)
    nucG.append('circle').attr('r', NUCL_R * 0.30)
      .attr('fill', accentColor).attr('fill-opacity', 0.38)
    // Third nucleolus: hallmark of high-grade malignancy.
    // Known preset: adenocarcinoma. Custom: malignancyScore > 0.75 (very low Vth).
    const isHighGrade = profile.presetId === PRESET_ID.ADENOCARCINOMA
      || (!Object.values(PRESET_ID).includes(profile.presetId as never) && malignancyScore > 0.75)
    if (isHighGrade) {
      nucleolus3 = nucG.append('circle').attr('r', NUCL_R * 0.62)
        .attr('fill', accentColor).attr('fill-opacity', 0.18)
    }
  }
  nucG.attr('transform', 'translate(0,4)')

  const nucPhases: PhaseEntry[] = d3.range(NUC_PTS).map((i: number) => ({
    baseAngle:   (i / NUC_PTS) * Math.PI * 2,
    phaseOffset: ((i * 3571) % 6283) / 1000,
    speed:       0.22 + ((i * 601) % 1000) / 4500,
  }))

  // ── Organelles: known presets get curated anatomy; custom gets conductivity-driven vesicles ──
  const organelleEls: OrganelleEl[] = []

  if (isTarget) {
    if (profile.presetId === PRESET_ID.MCF7) {
      // Lipid droplets: ER+ breast cancer metabolism (MCF7)
      const droplets = [{ x: -14, y: 15, r: 4.5 }, { x: 16, y: -9, r: 4.0 }, { x: 5, y: 19, r: 3.5 }]
      droplets.forEach(({ x, y, r }) => {
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', r)
          .attr('fill', accentColor).attr('fill-opacity', 0.22)
          .attr('stroke', accentColor).attr('stroke-width', 0.7).attr('stroke-opacity', 0.40)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 2.5, opacity: 0.22 })
      })

    } else if (profile.presetId === PRESET_ID.HL60) {
      // Condensed chromatin granules (HL60 leukemia blast)
      const chromatinPts = [
        { x: -10, y: -8 }, { x: 8, y: -13 }, { x: -4, y: 10 }, { x: 12, y: 6 }, { x: 1, y: -16 },
      ]
      chromatinPts.forEach(({ x, y }) => {
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', 2.5)
          .attr('fill', accentColor).attr('fill-opacity', 0.35)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 0.8, opacity: 0.35 })
      })

    } else if (profile.presetId === PRESET_ID.LNCAP) {
      // Secretory vesicles at apical pole: PSA/androgen-driven secretion
      const vesicles = [
        { x: -8,  y: -22, r: 3.5 }, { x:  2, y: -26, r: 3.0 }, { x: 10, y: -20, r: 3.5 },
        { x: -14, y: -17, r: 2.5 }, { x:  6, y: -14, r: 2.5 },
      ]
      vesicles.forEach(({ x, y, r }) => {
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', r)
          .attr('fill', accentColor).attr('fill-opacity', 0.25)
          .attr('stroke', accentColor).attr('stroke-width', 0.6).attr('stroke-opacity', 0.38)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 2.0, opacity: 0.25 })
      })

    } else if (profile.presetId === PRESET_ID.A549) {
      // Lamellar bodies: pulmonary surfactant vesicles (type II pneumocyte, A549)
      const lamPts = [{ x: -16, y: 13 }, { x: 14, y: -15 }]
      lamPts.forEach(({ x, y }) => {
        for (let r = 7; r >= 3; r -= 2) {
          cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', r)
            .attr('fill', 'none').attr('stroke', accentColor)
            .attr('stroke-width', 0.8).attr('stroke-opacity', 0.28)
        }
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', 2)
          .attr('fill', accentColor).attr('fill-opacity', 0.22)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 1.5, opacity: 0.22 })
      })

    } else if (profile.presetId === PRESET_ID.PANC1) {
      // Dense heterochromatin blocks (PANC-1)
      const hcPts = [{ x: -9, y: -9 }, { x: 9, y: 6 }, { x: -3, y: 13 }, { x: 6, y: -12 }]
      hcPts.forEach(({ x, y }) => {
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.2)
          .attr('fill', accentColor).attr('fill-opacity', 0.32)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 0.5, opacity: 0.32 })
      })

    } else if (!Object.values(PRESET_ID).includes(profile.presetId as never) && profile.conductivity > 0.7) {
      // Custom high-conductivity cancer: generic secretory vesicles (elevated metabolic activity)
      const vesicles = [{ x: -12, y: 16, r: 3.5 }, { x: 14, y: -12, r: 3.0 }, { x: -4, y: -20, r: 3.0 }]
      vesicles.forEach(({ x, y, r }) => {
        const el = cellG.append('circle').attr('cx', x).attr('cy', y).attr('r', r)
          .attr('fill', accentColor).attr('fill-opacity', 0.20)
          .attr('stroke', accentColor).attr('stroke-width', 0.6).attr('stroke-opacity', 0.32)
        organelleEls.push({ el, baseX: x, baseY: y, driftAmp: 2.0, opacity: 0.20 })
      })
    }
  }

  return {
    type, accentColor, profile,
    mitoEls, nucG, nucBlob, nucOuterEnv,
    nucleolus, nucleolus2, nucleolus3,
    cortexRing, nucPhases, organelleEls,
  }
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
  let flagEls: Array<D3Sel<SVGPathElement>> | null = null
  let hookEls: Array<D3Sel<SVGPathElement>> | null = null
  let teichoicEls: Array<D3Sel<SVGLineElement>> | null = null
  let nucG: D3Sel<SVGGElement>

  if (isRod) {
    // ── E. coli: gram-negative rod (outer membrane + periplasm + flagellum) ──
    bacteriaWallElOuter = cellG.append('ellipse')
      .attr('rx', ROD_B + 8).attr('ry', ROD_A + 8)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.22)
    // Periplasm / thin peptidoglycan (dashed, between membranes)
    bacteriaWallElInner = cellG.append('ellipse')
      .attr('rx', ROD_B + 4).attr('ry', ROD_A + 4)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.16)
      .attr('stroke-dasharray', '3,3')
    // 3 peritrichous flagella: hooks drawn first (lower z), filaments on top
    hookEls = d3.range(3).map(() =>
      cellG.append('path')
        .attr('fill', 'none').attr('stroke', accentColor)
        .attr('stroke-width', 1.1).attr('stroke-linecap', 'round')
    )
    flagEls = d3.range(3).map(() =>
      cellG.append('path')
        .attr('fill', 'none').attr('stroke', accentColor)
        .attr('stroke-width', 0.9).attr('stroke-linecap', 'round')
    )
    nucG = cellG.append('g').attr('transform', 'translate(0, 0)')
  } else {
    // ── MRSA: gram-positive coccus (thick peptidoglycan + division septum) ──
    bacteriaWallC1 = cellG.append('circle').attr('r', BASE_R + 9)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 3.5).attr('stroke-opacity', 0.16)
      .attr('stroke-dasharray', '4,2')
    bacteriaWallC2 = cellG.append('circle').attr('r', BASE_R + 4)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.2).attr('stroke-opacity', 0.13)
    // Division septum (binary fission plane)
    septum = cellG.append('line')
      .attr('x1', -BASE_R * 0.68).attr('y1', 0)
      .attr('x2',  BASE_R * 0.68).attr('y2', 0)
      .attr('stroke', accentColor).attr('stroke-width', 0.8).attr('stroke-opacity', 0.18)
      .attr('stroke-dasharray', '3,3')
    // 20 wall teichoic acids: short radial protrusions from outer peptidoglycan ring
    teichoicEls = d3.range(20).map((i) => {
      const a  = (i / 20) * Math.PI * 2
      const r1 = BASE_R + 9
      const r2 = r1 + 4
      return cellG.append('line')
        .attr('x1', r1 * Math.cos(a)).attr('y1', r1 * Math.sin(a))
        .attr('x2', r2 * Math.cos(a)).attr('y2', r2 * Math.sin(a))
        .attr('stroke', accentColor).attr('stroke-width', 0.7).attr('stroke-opacity', 0.18)
    })
    nucG = cellG.append('g').attr('transform', 'translate(-4, 3)')
  }

  // Nucleoid (diffuse chromosomal region — no nuclear envelope)
  const nucleoidBlob = nucG.append('path')
    .attr('fill', accentColor).attr('fill-opacity', 0.11)
    .attr('stroke', 'none')

  const nucleoidPhases: PhaseEntry[] = d3.range(NUCL_PTS).map((i: number) => ({
    baseAngle:   (i / NUCL_PTS) * Math.PI * 2,
    phaseOffset: ((i * 2311) % 6283) / 1000,
    speed:       0.15 + ((i * 401) % 1000) / 6000,
  }))

  // Ribosomes (no mitochondria in prokaryotes)
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
    bacteriaWallElOuter, bacteriaWallElInner, flagEls, hookEls,
    bacteriaWallC1, bacteriaWallC2, septum, teichoicEls,
  }
}

function setupVirusAnatomy(
  cellG: D3Sel<SVGGElement>,
  accentColor: string,
  profile: CellVisualProfile,
): VirusAnatomy {
  const isCov2 = profile.presetId === PRESET_ID.SARSCOV2
  const isInfluenza = profile.presetId === PRESET_ID.INFLUENZA

  // Known presets use exact curated values; custom viruses derive from resonantFreqGHz.
  // Lower resonant frequency = larger/heavier capsid = more complex surface (more spikes).
  let N_SPIKES: number, STALK_LEN: number, HEAD_R: number
  if (isCov2) {
    N_SPIKES = 16; STALK_LEN = 13; HEAD_R = 3.8
  } else if (isInfluenza) {
    N_SPIKES = 12; STALK_LEN = 9;  HEAD_R = 2.5
  } else {
    // Custom virus: derive from resonantFreqGHz (lower f_res = larger virus = more spikes)
    const fGHz = profile.resonantFreqGHz ?? 0.75
    N_SPIKES  = fGHz < 0.65 ? 16 : fGHz < 0.85 ? 14 : 12
    STALK_LEN = fGHz < 0.65 ? 13 : fGHz < 0.85 ? 11 : 9
    HEAD_R    = fGHz < 0.65 ? 3.8 : fGHz < 0.85 ? 3.2 : 2.5
  }

  // Neuraminidase (NA) spikes: wider mushroom-cap vs HA club shape. Influenza only (~1:5 NA:HA ratio).
  const NA_HEAD_R = isInfluenza ? 3.8 : 0
  const naIndices = new Set<number>()
  if (isInfluenza) {
    for (let i = 0; i < N_SPIKES; i += 6) naIndices.add(i)
  }

  // Inner ring radii scale with virus complexity
  const innerR1 = isCov2 ? 22 : (N_SPIKES >= 16 ? 22 : 18)
  const innerR2 = isCov2 ? 14 : (N_SPIKES >= 16 ? 14 : 10)
  const virusInnerRings = [
    cellG.append('circle').attr('r', innerR1)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 1.0).attr('stroke-opacity', 0.25),
    cellG.append('circle').attr('r', innerR2)
      .attr('fill', 'none').attr('stroke', accentColor)
      .attr('stroke-width', 0.7).attr('stroke-opacity', 0.18),
  ]

  const virusCore = cellG.append('circle').attr('r', isCov2 ? 7 : 5)
    .attr('fill', accentColor).attr('fill-opacity', 0.15)
    .attr('stroke', accentColor).attr('stroke-width', 0.8).attr('stroke-opacity', 0.40)

  // Club-shaped spike proteins: stalk + bulbous head on lipid envelope surface
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

  return { isCov2, isInfluenza, N_SPIKES, STALK_LEN, HEAD_R, NA_HEAD_R, naIndices, virusInnerRings, virusCore, virusSpikes }
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
  isRevEp:                boolean
  nuclearDisruptionRatio: number | undefined
}

function updateMammalianAnatomy(anat: MammalianAnatomy, p: MammalianUpdateParams): void {
  const { elapsed, color, thermalColor, impact, tNorm, isNourishing, isVibrating, isRevEp, nuclearDisruptionRatio } = p
  const { type, accentColor } = anat

  // ── Cell cortex ring ───────────────────────────────────────────────────
  anat.cortexRing.attr('stroke', color).attr('stroke-opacity', 0.09 + impact * 0.04)

  // ── Mitochondria: Brownian drift + DRP1-mediated fission under EP stress ──
  const mitoIntensity = 0.30 + Math.min(0.50, tNorm * 2.0)
  const mitoStress = isRevEp ? (impact - 0.50) / 0.35 : isVibrating ? 1.0 : 0
  const mitoFragFactor  = Math.max(0.42, 1 - mitoStress * 0.52)   // shrink ellipses
  const mitoSpreadExtra = mitoStress * 7                           // spread further apart
  anat.mitoEls.forEach(({ g, outer, inner, c1, c2, m }, i) => {
    const dx  = Math.sin(elapsed * 0.00022 + i * 1.4) * (4 + mitoSpreadExtra)
    const dy  = Math.cos(elapsed * 0.00025 + i * 2.1) * (3 + mitoSpreadExtra * 0.5)
    const rot = m.angle + Math.sin(elapsed * 0.00012 + i * 1.7) * 12
    g.attr('transform', `translate(${m.x + dx},${m.y + dy}) rotate(${rot})`).attr('opacity', 0.80)
    outer.attr('rx', m.rx * mitoFragFactor).attr('ry', m.ry * mitoFragFactor)
      .attr('stroke', thermalColor).attr('stroke-opacity', mitoIntensity).attr('fill', thermalColor)
    inner.attr('rx', Math.max(0.5, (m.rx * mitoFragFactor - 2.2) * 0.6))
      .attr('ry', Math.max(0.5, (m.ry * mitoFragFactor - 1.4) * 0.6))
      .attr('fill', thermalColor).attr('fill-opacity', Math.min(0.14, tNorm * 0.18 + 0.03))
      .attr('stroke', thermalColor)
    const cristaeOp = Math.min(0.30, mitoIntensity * 0.45)
    c1.attr('stroke', thermalColor).attr('stroke-opacity', cristaeOp)
    c2.attr('stroke', thermalColor).attr('stroke-opacity', cristaeOp)
  })

  // ── Nucleus: size and pleomorphism — known presets use curated values; custom uses physics ─
  const pid = anat.profile.presetId
  const malignancyScore = type === CELL_TYPE.TARGET
    ? computeMalignancyScore(anat.profile.thresholdVoltage) : 0
  // NUC_R: nucleus blob radius in canvas-px (not the same as cell radius µm)
  const NUC_R = pid !== undefined && NUC_R_MAP[pid] !== undefined
    ? NUC_R_MAP[pid]!
    : type === CELL_TYPE.TARGET
      ? Math.round(22 + malignancyScore * 8)  // 22px (low malignancy) → 30px (highly aggressive)
      : NUC_R_HEALTHY
  const isHl60 = pid === PRESET_ID.HL60
  const NUC_DX = isHl60 ? 0 : type === CELL_TYPE.TARGET ? -2 : 0
  const NUC_DY = isHl60 ? 0 : type === CELL_TYPE.TARGET ?  6 : 4
  // Nuclear breathing (nourishing): PIEZO1-Ca2+ chromatin decondensation oscillation (~0.3 Hz)
  const nucBreath = isNourishing ? Math.sin(elapsed * 0.0018) * 0.045 : 0
  const nucScaleY  = 1 + impact * 0.28 + nucBreath
  const nucScaleX  = 1 - impact * 0.10
  const nucNoise   = isVibrating ? impact * 1.8 : 0
  // nucWaveAmp: controls nuclear membrane pleomorphism (higher = more irregular = more malignant)
  const nucWaveAmp = pid !== undefined && NUC_WAVE_AMP_MAP[pid] !== undefined
    ? NUC_WAVE_AMP_MAP[pid]!
    : type === CELL_TYPE.TARGET
      ? 2.0 + malignancyScore * 4.5  // 2.0 (near-spherical) → 6.5 (highly pleomorphic)
      : NUC_WAVE_AMP_HEALTHY
  const nucPts: BlobPoint[] = anat.nucPhases.map((ph) => {
    const wave  = Math.sin(elapsed * 0.0006 * ph.speed + ph.phaseOffset) * nucWaveAmp
    const noise = (Math.random() - 0.5) * nucNoise
    return { angle: ph.baseAngle, r: NUC_R + wave + noise }
  })
  // Outer nuclear envelope - drawn 3.5px outside the blob boundary
  const nucEnvPts: BlobPoint[] = nucPts.map((pt) => ({ angle: pt.angle, r: pt.r + 3.5 }))
  // Nuclear migration: DEP force on nucleus pulls it toward north pole at DR > 85%
  const nucMigration = isVibrating ? -(impact - 0.85) / 0.15 * 12 : 0
  anat.nucG.attr('transform',
    `translate(${NUC_DX},${(NUC_DY + nucMigration).toFixed(1)}) scale(${nucScaleX.toFixed(3)},${nucScaleY.toFixed(3)})`)
  const nucFillOpacity = pid === PRESET_ID.PANC1 ? 0.20 : 0.12
  anat.nucBlob.attr('d', nucLineGen(nucPts) || '')
    .attr('fill', color).attr('fill-opacity', nucFillOpacity)
    .attr('stroke', color).attr('stroke-opacity', isNourishing ? 0.60 : 0.42)
  // Nuclear envelope: accentColor → amber at DR>50%, amber → red at DR>85%
  const nucDr = nuclearDisruptionRatio ?? 0
  const nucEnvColor = nucDr < 0.5
    ? accentColor
    : nucDr < 0.85
      ? d3.interpolateRgb(accentColor, COLOR_AMBER)((nucDr - 0.5) / 0.35)
      : d3.interpolateRgb(COLOR_AMBER, COLOR_LYSIS)((nucDr - 0.85) / 0.15)
  const nucEnvOpacity = 0.12 + Math.min(0.50, nucDr * 0.55)
  anat.nucOuterEnv.attr('d', nucLineGen(nucEnvPts) || '')
    .attr('stroke', nucEnvColor).attr('stroke-opacity', nucEnvOpacity)

  // Nucleoli: slow independent drift
  const nlDx = Math.sin(elapsed * 0.0004) * 3.5
  const nlDy = Math.cos(elapsed * 0.0003) * 2.5
  anat.nucleolus.attr('cx', -3 + nlDx).attr('cy', -2 + nlDy)
    .attr('fill', color).attr('fill-opacity', 0.28)
  if (anat.nucleolus2) {
    const nl2Dx = Math.sin(elapsed * 0.00035 + 2.1) * 4.5
    const nl2Dy = Math.cos(elapsed * 0.00045 + 1.4) * 3.5
    anat.nucleolus2.attr('cx', 6 + nl2Dx).attr('cy', 4 + nl2Dy)
      .attr('fill', color).attr('fill-opacity', 0.20)
  }
  if (anat.nucleolus3) {
    const nl3Dx = Math.sin(elapsed * 0.00028 + 3.8) * 3.0
    const nl3Dy = Math.cos(elapsed * 0.00031 + 2.5) * 2.5
    anat.nucleolus3.attr('cx', -5 + nl3Dx).attr('cy', 7 + nl3Dy)
      .attr('fill', color).attr('fill-opacity', 0.18)
  }
  anat.organelleEls.forEach(({ el, baseX, baseY, driftAmp, opacity }, i) => {
    const dx = Math.sin(elapsed * 0.00017 + i * 2.3) * driftAmp
    const dy = Math.cos(elapsed * 0.00019 + i * 1.7) * driftAmp
    el.attr('cx', baseX + dx).attr('cy', baseY + dy)
      .attr('fill', color).attr('fill-opacity', opacity)
  })
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
    anat.bacteriaWallElOuter!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.85)
    anat.bacteriaWallElInner!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.60)

    // 3 peritrichous flagella: hook joints + helical filaments bundled during swimming,
    // splayed during tumbling (CW switch triggers run→tumble).
    // Biology: E. coli flagella bundle CCW → propulsion; CW switch → individual splay.
    const FLAG_AMP    = 5.5    // helix amplitude (px)
    const FLAG_LEN    = 30     // filament length (px)
    const FLAG_CYCLES = 3.2    // helical turns visible along filament
    const FLAG_SPEED  = 0.0032 // rotation speed (rad/ms)
    const HOOK_LEN    = 8      // hook segment length (px)
    const ATTACH_Y    = ROD_A + 8  // outer membrane south pole

    // Bundled swimming vs tumbling: controls lateral spread of attachment points
    const bundled = !isVibrating
    for (let fi = 0; fi < 3; fi++) {
      const attachX = (fi - 1) * (bundled ? 4 : 10)
      const phase   = (fi / 3) * Math.PI * 2 + elapsed * FLAG_SPEED

      // ── Hook: L-shaped curve from basal body (cell surface) to filament axis ──
      const hookMidX = attachX + (fi - 1) * 2.5
      const hookPts: Array<[number, number]> = [
        [attachX,          ATTACH_Y],
        [hookMidX,         ATTACH_Y + 4],
        [hookMidX * 0.65,  ATTACH_Y + HOOK_LEN],
      ]
      anat.hookEls![fi]!
        .attr('d', flagLineGen(hookPts) ?? '')
        .attr('stroke', color)
        .attr('stroke-opacity', Math.max(0, 0.40 - impact * 0.30))

      // ── Filament: helical projection; converges into bundle during swimming ──
      const startX = hookMidX * 0.65
      const filPts: Array<[number, number]> = []
      for (let i = 0; i <= 18; i++) {
        const t  = i / 18
        const fY = ATTACH_Y + HOOK_LEN + t * FLAG_LEN
        // Bundled: x drifts toward 0 (posterior bundle); tumbling: each splay independently
        const driftX = bundled
          ? startX * (1 - t * 0.80)
          : startX + t * (fi - 1) * 14
        const fX = driftX + Math.sin(t * Math.PI * 2 * FLAG_CYCLES + phase) * FLAG_AMP
        filPts.push([fX, fY])
      }
      anat.flagEls![fi]!
        .attr('d', flagLineGen(filPts) ?? '')
        .attr('stroke', color)
        .attr('stroke-opacity', Math.max(0, 0.28 - impact * 0.20))
    }
  } else {
    anat.bacteriaWallC1!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.90)
    anat.bacteriaWallC2!.attr('stroke', color).attr('stroke-opacity', wallOpacity * 0.55)
    const septumOp = 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 0.0006))
    anat.septum!.attr('stroke', color).attr('stroke-opacity', Math.max(0, septumOp - impact * 0.12))
    // MRSA teichoic acids: breathe gently; fade under EP disruption
    anat.teichoicEls!.forEach((line, i) => {
      const breathe = Math.sin(elapsed * 0.0008 + i * 0.9) * 0.04
      line.attr('stroke', color)
        .attr('stroke-opacity', Math.max(0, 0.18 + breathe - impact * 0.12))
    })
  }

  // ── Nucleoid: elongated in rod; MRSA elongates in phase with septum (chromosomal segregation) ─
  const nucA = isRod ? 18 : 12  // semi-major (vertical for rod)
  const nucB = isRod ? 10 : 12  // semi-minor (horizontal)
  const nucNoise = isVibrating ? impact * 1.2 : 0
  const septumPhase = !isRod ? (Math.sin(elapsed * 0.0006) + 1) / 2 : 0  // same period as septum
  const divElongation = !isRod ? 1 + septumPhase * 0.55 : 1  // nucleoid stretches toward +55% at septum peak
  const nucPts: BlobPoint[] = anat.nucleoidPhases.map((ph) => {
    const elongR = isRod ? capsuleR(ph.baseAngle, nucA, nucB)
      : capsuleR(ph.baseAngle, nucA * divElongation, nucB)
    const wave  = Math.sin(elapsed * 0.0004 * ph.speed + ph.phaseOffset) * 2
    const noise = (Math.random() - 0.5) * nucNoise
    return { angle: ph.baseAngle, r: elongR + wave + noise }
  })
  anat.nucleoidBlob.attr('d', nucLineGen(nucPts) || '')
    .attr('fill', color).attr('fill-opacity', 0.11)

  anat.ribosomeDots.forEach((dot) => dot.attr('fill', color).attr('fill-opacity', 0.32))
}

interface VirusUpdateParams {
  elapsed: number
  color:   string
  impact:  number
  state:   CellState
}

function updateVirusAnatomy(anat: VirusAnatomy, p: VirusUpdateParams): void {
  const { elapsed, color, impact, state } = p
  const { isCov2, N_SPIKES, STALK_LEN, HEAD_R } = anat
  // Spike dipole alignment (approaching state): HA/S-protein dipoles align to E-field.
  // Pole spikes gain opacity; equatorial spikes dim.
  const isApproaching = state === CELL_STATE.APPROACHING
  const dipoleStrength = (isApproaching && impact > 0.05) ? (impact - 0.05) / 0.45 : 0

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

  // ── Club-shaped spike proteins (sway; retract as capsid disrupts) ────────
  anat.virusSpikes.forEach(({ stalk, head }, i) => {
    const baseAngle = (i / N_SPIKES) * Math.PI * 2
    const sway      = Math.sin(elapsed * 0.0009 + i * 1.3) * 0.07
    const angle     = baseAngle + sway
    const lenFactor = Math.max(0, 1 - impact * 0.70)  // spikes retract as capsid fails
    const curLen    = STALK_LEN * lenFactor
    const poleAlign     = Math.cos(baseAngle) ** 2  // 1 at poles, 0 at equator
    const dipoleOpBoost = dipoleStrength * (poleAlign * 0.30 - (1 - poleAlign) * 0.20)
    const spikeOp   = Math.max(0, 0.75 - impact * 0.65 + dipoleOpBoost)
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

// Initialise cell SVG animation; returns D3 timer. getFrame() reads reactive Vue state each tick.
export function setupBlobAnimation(
  el: HTMLElement,
  type: 'healthy' | 'target',
  accentColor: string,
  cellCategory: 'mammalian' | 'bacteria' | 'virus',
  profile: CellVisualProfile,
  getFrame: () => BlobFrame,
): d3.Timer {
  const W = CANVAS_W, H = CANVAS_H, cx = W / 2, cy = H / 2

  // Rod shape: known E. coli preset OR explicit rod morphologyTag.
  // Coccobacillus (short rod): same isRod path but with a higher ROD_B (lower aspect ratio).
  const isCoccobacillus = profile.morphologyTag === MORPHOLOGY_TAG.COCCOBACILLUS
  const isRod = profile.presetId === PRESET_ID.ECOLI
    || profile.morphologyTag === MORPHOLOGY_TAG.ROD
    || isCoccobacillus
  const ROD_A = BASE_R
  const ROD_B = isCoccobacillus
    ? Math.round(BASE_R * 0.65)   // short rod: aspect ratio ~1.5 (e.g. H. pylori)
    : Math.round(BASE_R * ROD_RATIO)  // standard rod: aspect ratio ~2.2 (e.g. E. coli)

  const shapeBaseR = (theta: number): number =>
    isRod ? capsuleR(theta, ROD_A, ROD_B) : BASE_R
  const northPoleR = BASE_R
  const southPoleR = BASE_R

  d3.select(el).selectAll('*').remove()
  const svg  = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
  const defs = svg.append('defs')

  // ── SVG filters ───────────────────────────────────────────────────────────
  const glowId = `glowFilter-${type}`
  const gf     = defs.append('filter').attr('id', glowId)
    .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
  const glowBlur = gf.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
  const gm = gf.append('feMerge')
  gm.append('feMergeNode').attr('in', 'coloredBlur')
  gm.append('feMergeNode').attr('in', 'SourceGraphic')

  // Wide soft-blur filter for the nourishing membrane halo — separate from the sharp glow filter
  const nourishGlowId = `nourishGlow-${type}`
  const ngf = defs.append('filter').attr('id', nourishGlowId)
    .attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%')
  ngf.append('feGaussianBlur').attr('stdDeviation', '13').attr('result', 'coloredBlur')
  const ngm = ngf.append('feMerge')
  ngm.append('feMergeNode').attr('in', 'coloredBlur')
  ngm.append('feMergeNode').attr('in', 'SourceGraphic')

  // Very large blur for the background bloom — a radial aura behind the whole cell
  const nourishBloomId = `nourishBloom-${type}`
  defs.append('filter').attr('id', nourishBloomId)
    .attr('x', '-120%').attr('y', '-120%').attr('width', '340%').attr('height', '340%')
    .append('feGaussianBlur').attr('stdDeviation', '20')

  const rayGlowId = `rayGlow-${type}`
  const rf = defs.append('filter').attr('id', rayGlowId)
    .attr('x', '-600%').attr('y', '0%').attr('width', '1300%').attr('height', '100%')
  rf.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '4 0').attr('result', 'blur')
  const rfm = rf.append('feMerge')
  rfm.append('feMergeNode').attr('in', 'blur')
  rfm.append('feMergeNode').attr('in', 'SourceGraphic')

  // ── Radial gradient (cytoplasm fill - thermal-tinted each tick) ───────────
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
  // Peak brightness at 88% of gradient length (just before cell surface), then fades to 0.
  // The zero-opacity tail extends into the cell interior — hidden by blobFill — so the
  // ray tip never appears as an abrupt edge even when the blob membrane oscillates inward.
  const rayNBrightStop = rayNGrad.append('stop').attr('offset', '88%')
    .attr('stop-color', accentColor).attr('stop-opacity', 1.0)
  rayNGrad.append('stop').attr('offset', '100%')
    .attr('stop-color', accentColor).attr('stop-opacity', 0)

  // ── South field ray gradient (electrode at canvas bottom → south pole) ─────
  // Symmetric counterpart to north; together they represent the AC dipole field.
  const raySGradId = `rayS-${type}`
  const raySGrad   = defs.append('linearGradient').attr('id', raySGradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', cy).attr('x2', 0).attr('y2', southPoleR)
  raySGrad.append('stop').attr('offset', '0%').attr('stop-color', accentColor).attr('stop-opacity', 0)
  const raySBrightStop = raySGrad.append('stop').attr('offset', '88%')
    .attr('stop-color', accentColor).attr('stop-opacity', 1.0)
  raySGrad.append('stop').attr('offset', '100%')
    .attr('stop-color', accentColor).attr('stop-opacity', 0)

  // ── Cell groups (all coordinates relative to cell centre) ─────────────────
  const cellG = svg.append('g').attr('transform', `translate(${cx},${cy})`)

  // ── Ray mask: clips rays to only appear outside cell + membrane glow zone ──
  // Black circle (radius BASE_R + 20) hides rays inside the cell area.
  // The +20 buffer covers membrane oscillation (±10 px) and the glow blur (stdDev 3 → ~9 px).
  // maskUnits/maskContentUnits both use cellG's local space (cell centre = 0,0).
  const RAY_MASK_R = BASE_R + 20
  const rayMaskId = `rayMask-${type}`
  const rayMaskEl = defs.append('mask').attr('id', rayMaskId)
    .attr('maskUnits', 'userSpaceOnUse')
    .attr('x', -cx).attr('y', -cy).attr('width', W).attr('height', H)
  rayMaskEl.append('rect')
    .attr('x', -cx).attr('y', -cy).attr('width', W).attr('height', H).attr('fill', 'white')
  rayMaskEl.append('circle').attr('r', RAY_MASK_R).attr('fill', 'black')

  // ── Electric field rays (masked so they never show through cell outline) ───
  // Color = frequency (cyan→violet log-scaled); opacity = field intensity.
  const RAY_OVERLAP = Math.round(BASE_R * RAY_OVERLAP_RATIO)
  const rayTopH = cy - northPoleR + RAY_OVERLAP
  const raysG = cellG.append('g').attr('mask', `url(#${rayMaskId})`)
  // Central beam + two fainter flanking rays; all share the same gradient.
  const rayNC = raysG.append('rect').attr('x', -3).attr('y', -cy).attr('width', 6).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`).attr('filter', `url(#${rayGlowId})`)
  const rayNL = raysG.append('rect').attr('x', -14).attr('y', -cy).attr('width', 3).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`)
  const rayNR = raysG.append('rect').attr('x', 11).attr('y', -cy).attr('width', 3).attr('height', rayTopH)
    .attr('fill', `url(#${rayNGradId})`)

  // ── South electrode beam ──────────────────────────────────────────────────
  const raySTopH = cy - southPoleR + RAY_OVERLAP
  const raySC = raysG.append('rect').attr('x', -3).attr('y', southPoleR - RAY_OVERLAP).attr('width', 6).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`).attr('filter', `url(#${rayGlowId})`)
  const raySL = raysG.append('rect').attr('x', -14).attr('y', southPoleR - RAY_OVERLAP).attr('width', 3).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`)
  const raySR = raysG.append('rect').attr('x', 11).attr('y', southPoleR - RAY_OVERLAP).attr('width', 3).attr('height', raySTopH)
    .attr('fill', `url(#${raySGradId})`)

  // ── Nourishing background bloom (behind cell body, in cellG) ─────────────
  // A large softly blurred filled circle that creates a radial glow emanating
  // from behind the cell into the dark canvas. Hidden in all non-nourishing states.
  const nourishBloom = cellG.append('circle').attr('r', BASE_R * 1.55)
    .attr('fill', accentColor).attr('fill-opacity', 0)
    .attr('filter', `url(#${nourishBloomId})`).attr('pointer-events', 'none')

  // ── Acoustic standing-wave rings (bacteria/virus resonance mode only) ─────
  // 5 phase-staggered concentric rings that oscillate in radius, representing
  // the radial displacement field of a spherically oscillating particle.
  const standingWaveRings = d3.range(5).map((i) =>
    cellG.append('circle').attr('r', BASE_R + 10 + i * 9).attr('fill', 'none')
      .attr('stroke', accentColor).attr('stroke-width', Math.max(0.4, 1.0 - i * 0.11)).attr('stroke-opacity', 0)
  )

  // bodyG rotates with the cell (bacteria DEP alignment); field rays stay in cellG
  const bodyG = cellG.append('g')

  // ── Cell body: opaque BG mask first so rays render behind it, then gradient overlay ─
  const blobBg   = bodyG.append('path').attr('fill', CANVAS_BG)
  const blobFill = bodyG.append('path').attr('fill', `url(#${gradId})`)

  // ── Calcium wave rings (PIEZO1/TRP Ca²⁺ transients, nourishing state) ──────
  // Ca²⁺ enters through transiently-opened channels at the membrane and diffuses
  // INWARD toward the nucleus. Each wave is a circle centered at the cell origin
  // that contracts from BASE_R (membrane) down to ~15% of BASE_R (perinuclear region).
  // This correctly models inward Ca²⁺ diffusion — not outward aura rings.
  const calciumWaves = d3.range(5).map((i) => ({
    el: bodyG.append('circle').attr('r', 0).attr('fill', 'none')
      .attr('stroke', accentColor).attr('stroke-width', 1.4).attr('stroke-opacity', 0)
      .attr('pointer-events', 'none'),
    startElapsed: -(2200 * (i + 1)),
  }))
  let calciumWaveIdx     = 0
  let lastCalciumElapsed = -2000

  // ── Category-specific anatomy setup ───────────────────────────────────────
  const mammalianAnatomy = cellCategory === CELL_CATEGORY.MAMMALIAN
    ? setupMammalianAnatomy(bodyG, type, accentColor, profile) : null
  const bacteriaAnatomy  = cellCategory === CELL_CATEGORY.BACTERIA
    ? setupBacteriaAnatomy(bodyG, accentColor, isRod, ROD_A, ROD_B) : null
  const virusAnatomy     = cellCategory === CELL_CATEGORY.VIRUS
    ? setupVirusAnatomy(bodyG, accentColor, profile) : null

  // ── Membrane stroke (on top of all interior elements) ─────────────────────
  const blobStroke = bodyG.append('path').attr('fill', 'none').attr('stroke', accentColor)
    .attr('stroke-width', 2.5).attr('filter', `url(#${glowId})`)

  // ── Nourishing membrane halo (wide blurred path matching cell border) ──────
  // Only visible during nourishing/biomodulation state. Sits above the crisp membrane
  // line, bleeding outward as a diffuse living glow. Conveys that the membrane is
  // energised — not disrupted. Grows with biomodScore (impact).
  const nourishGlow = bodyG.append('path').attr('fill', 'none')
    .attr('stroke', accentColor).attr('stroke-width', 15)
    .attr('stroke-opacity', 0).attr('pointer-events', 'none')
    .attr('filter', `url(#${nourishGlowId})`)

  // ── Membrane blebs (mammalian only; circular protrusions at elevated DR) ──
  // Only the two field-axis poles (north = cathodic, south = anodic) develop significant blebs.
  // Physics: Maxwell stress is proportional to Vm² ∝ cos²θ — maximum at θ=0/π, zero at equator.
  // Each pole bleb has an independent pulse phase and speed (stochastic osmotic pressure).
  const blebData: Array<{ el: D3Sel<SVGCircleElement>; idx: number; phaseShift: number; pulseSpeed: number }> = []
  if (cellCategory === CELL_CATEGORY.MAMMALIAN) {
    const N_BLOB = BLOB_POINTS
    // North pole (angle=0, cathodic, higher Vm) and south pole (angle=π, anodic)
    const blebIndices = [0, Math.floor(N_BLOB / 2)]
    const blebPhases  = [0.3, 2.1]   // independent phases
    const blebSpeeds  = [0.0013, 0.0010]  // independent rates
    blebIndices.forEach((idx, i) => {
      const el = bodyG.append('circle').attr('r', 0)
        .attr('fill', accentColor).attr('fill-opacity', 0.08)
        .attr('stroke', accentColor).attr('stroke-width', 1.2).attr('stroke-opacity', 0)
        .attr('pointer-events', 'none')
      blebData.push({ el, idx, phaseShift: blebPhases[i]!, pulseSpeed: blebSpeeds[i]! })
    })
  }

  // ── Electroporation pores (BG-coloured holes) ─────────────────────────────
  // Inset PORE_INSET fraction from membrane; max radius = PORE_MAX_R.
  // Side pores disabled for rod shape (off-membrane positions).
  const PORE_MAX_R = Math.floor(BASE_R * 0.18)
  const SIN60 = Math.sin(Math.PI / 3), COS60 = Math.cos(Math.PI / 3)
  const northPore = bodyG.append('circle').attr('cy', -northPoleR * PORE_INSET).attr('r', 0).attr('fill', CANVAS_BG)
  const southPore = bodyG.append('circle').attr('cy',  southPoleR * PORE_INSET).attr('r', 0).attr('fill', CANVAS_BG)
  const pore3 = bodyG.append('circle').attr('cx',  BASE_R * SIN60 * PORE_INSET).attr('cy', -BASE_R * COS60 * PORE_INSET).attr('r', 0).attr('fill', CANVAS_BG)
  const pore4 = bodyG.append('circle').attr('cx', -BASE_R * SIN60 * PORE_INSET).attr('cy',  BASE_R * COS60 * PORE_INSET).attr('r', 0).attr('fill', CANVAS_BG)

  // ── Ion streaming particles (Rev-EP: Na+/Ca2+ influx through transient pores) ──
  // 3 per pole; bell-curve opacity from pore to nucleus centre.
  const ionNorth = ION_OFFSETS.map((xOff) =>
    bodyG.append('circle').attr('cx', xOff).attr('r', 1.6)
      .attr('fill', accentColor).attr('fill-opacity', 0).attr('pointer-events', 'none')
  )
  const ionSouth = ION_OFFSETS.map((xOff) =>
    bodyG.append('circle').attr('cx', xOff).attr('r', 1.6)
      .attr('fill', accentColor).attr('fill-opacity', 0).attr('pointer-events', 'none')
  )

  // ── Membrane ion channel markers (PIEZO1 / K+/Na+) ───────────────────────
  // CHAN_COUNT dots at equal angles just inside the membrane; brightness = activation.
  const channelDots = d3.range(CHAN_COUNT).map((i) => {
    const a = (i / CHAN_COUNT) * Math.PI * 2
    const r = BASE_R - 5
    return bodyG.append('circle')
      .attr('cx', r * Math.sin(a)).attr('cy', -r * Math.cos(a))
      .attr('r', 2.2).attr('fill', accentColor).attr('fill-opacity', 0.06)
      .attr('pointer-events', 'none')
  })

  // ── Pseudo-3D depth cues ─────────────────────────────────────────────────
  // Equatorial ring: foreshortened perspective ellipse; deforms with DEP force.
  const equatorialRing = bodyG.append('ellipse')
    .attr('rx', BASE_R * 0.88).attr('ry', BASE_R * 0.13)
    .attr('fill', 'none')
    .attr('stroke', accentColor).attr('stroke-width', 0.5).attr('stroke-opacity', 0.07)
    .attr('pointer-events', 'none')

  // Specular highlight: simulates diffuse upper-left light source.
  const specularDot = bodyG.append('ellipse')
    .attr('rx', BASE_R * 0.19).attr('ry', BASE_R * 0.12)
    .attr('cx', -BASE_R * 0.22).attr('cy', -BASE_R * 0.30)
    .attr('fill', 'white').attr('fill-opacity', 0.09)
    .attr('pointer-events', 'none')

  // ── Transmembrane Vm pole glow (Schwan poles; scales with disruption ratio) ─
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

  // ── DEP visual effects state ──────────────────────────────────────────────
  // 1. Blob deformation: pDEP = N-S elongation (prolate); nDEP = E-W elongation (oblate).
  //    depDeform(θ) = K·BASE_R·0.24·cos(2θ) ∝ Re[K]·P₂(cosθ) — elongates along field axis for K>0.
  //    Ref: Engelhardt & Sackmann (1988) Biophys J 54; Dimova et al. (2007) Soft Matter.
  // 2. Bacteria alignment: pDEP → 0° (field-parallel); nDEP → 90°
  // 3. Translational drift: pDEP → toward electrode (−Y); nDEP → away (+Y); max ±8 px
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

  // Pre-baked cancer membrane irregularity (pseudopods/stellate arms) per preset.
  const cancerBaseOffsets: number[] = []
  if (cellCategory === CELL_CATEGORY.MAMMALIAN && type === CELL_TYPE.TARGET) {
    for (let i = 0; i < N; i++) {
      cancerBaseOffsets.push(computeCancerBaseOffset(i, N, profile))
    }
  }

  // ── D3 timer loop ──────────────────────────────────────────────────────────
  const timer = d3.timer((elapsed: number) => {
    const { impact, state, color, temperature, fieldVcm, freqKHz, nuclearDisruptionRatio, depCmReal, waveform, isAcousticMode = false } = getFrame()

    // ── Field ray color (cyan→violet, log 10 kHz–30 GHz) + intensity ─────────
    const freqNorm = Math.max(0, Math.min(1,
      (Math.log10(Math.max(10, freqKHz)) - 1) / (Math.log10(30e6) - 1)
    ))
    const rayColor = d3.interpolateRgbBasis([C.primary, C.rayInterp1, C.rayInterp2, C.purple])(freqNorm)
    // fieldVcm log-scale 10-10,000 V/cm → opacity 0.05-0.72
    const fieldNorm = Math.max(0, Math.min(1, (Math.log10(Math.max(1, fieldVcm)) - 1) / 3))
    const rayOpacity = state === CELL_STATE.LYSED ? 0 : Math.max(0.04, 0.06 + fieldNorm * 0.66)

    // AC modulation: pulsed = fast ~10 Hz flash (discrete pulses); CW = slow 0.5 Hz sine.
    // Both are representational — actual RF is not animated at true frequency.
    const acPulse = (waveform === 'pulsed' || waveform === 'hfire')
      ? Math.max(0, Math.sin(elapsed * 0.10))   // fast repeating burst envelope (~10 Hz)
      : (Math.sin(elapsed * 0.006) + 1) / 2     // slow sine for CW (~0.5 Hz)
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

    // ── DEP deformation (computed before blobPts so depDeformScale is available) ─
    const depAbsK = Math.abs(depCmReal)
    const depActive = depAbsK >= 0.02 && fieldVcm >= 5
      && state !== CELL_STATE.LYSED && state !== CELL_STATE.LYSING
    depDeformScale = depActive ? depCmReal * BASE_R * 0.24 : 0

    // ── DEP bacteria alignment: pDEP = 0° (field-parallel), nDEP = 90° ────────
    const targetAlignAngle = (cellCategory === CELL_CATEGORY.BACTERIA && depActive)
      ? (depCmReal > 0 ? 0 : 90)
      : 0
    depAlignAngle += (targetAlignAngle - depAlignAngle) * 0.025
    // ── Pseudo-3D Y-axis rotation (mammalian only): scaleX = cos θ illusion ───
    // Period ≈ 14 s; amplitude ±0.14 gives a 72–100% width oscillation that reads
    // as a slow tumble on the microscopy stage without distorting bacteria DEP alignment.
    const spinScaleX = cellCategory === CELL_CATEGORY.MAMMALIAN
      ? 0.86 + 0.14 * Math.cos(elapsed * 0.00045)
      : 1.0
    bodyG.attr('transform', `rotate(${depAlignAngle.toFixed(2)}) scale(${spinScaleX.toFixed(3)},1)`)

    // ── Dynamic beam height: tracks pole extent (E. coli shrinks when rotated nDEP) ─
    const effectivePoleR = isRod
      ? capsuleR(depAlignAngle * Math.PI / 180, ROD_A, ROD_B)
      : BASE_R
    const dynTopH = cy - effectivePoleR
    rayNGrad.attr('y2', -effectivePoleR)
    rayNC.attr('y', -cy).attr('height', dynTopH + RAY_OVERLAP)
    rayNL.attr('y', -cy).attr('height', dynTopH + RAY_OVERLAP)
    rayNR.attr('y', -cy).attr('height', dynTopH + RAY_OVERLAP)
    raySGrad.attr('y2', effectivePoleR)
    raySC.attr('y', effectivePoleR - RAY_OVERLAP).attr('height', dynTopH + RAY_OVERLAP)
    raySL.attr('y', effectivePoleR - RAY_OVERLAP).attr('height', dynTopH + RAY_OVERLAP)
    raySR.attr('y', effectivePoleR - RAY_OVERLAP).attr('height', dynTopH + RAY_OVERLAP)

    // ── DEP translational drift (pDEP → electrode, nDEP → away) ─────────────
    const targetDrift = depActive ? (depCmReal > 0 ? -8 : 8) : 0
    depDriftY += (targetDrift - depDriftY) * 0.018
    cellG.attr('transform', `translate(${cx},${(cy + depDriftY).toFixed(2)})`)

    // ── Equatorial ring: rx tracks E-W extent (pDEP = narrower equator = prolate; nDEP = wider = oblate) ─
    const eqRx = Math.max(4, BASE_R * 0.88 - depDeformScale * 0.55)
    equatorialRing
      .attr('rx', eqRx)
      .attr('stroke', color)
      .attr('stroke-opacity', depActive ? 0.13 + depAbsK * 0.09 : 0.07)

    // Specular highlight: brightens slightly with field intensity
    specularDot.attr('fill-opacity', 0.07 + fieldNorm * 0.06)

    // ── Lysed ──────────────────────────────────────────────────────────────
    if (state === CELL_STATE.LYSED) {
      blobStroke.attr('stroke-opacity', 0)
      blobBg.attr('fill-opacity', 0)
      blobFill.attr('fill-opacity', 0)
      nourishBloom.attr('fill-opacity', 0)
      nourishGlow.attr('stroke-opacity', 0)
      if (mammalianAnatomy) {
        mammalianAnatomy.nucBlob.attr('fill-opacity', 0).attr('stroke-opacity', 0)
        mammalianAnatomy.nucOuterEnv.attr('stroke-opacity', 0)
        mammalianAnatomy.nucleolus.attr('fill-opacity', 0)
        mammalianAnatomy.nucleolus2?.attr('fill-opacity', 0)
        mammalianAnatomy.nucleolus3?.attr('fill-opacity', 0)
        mammalianAnatomy.cortexRing.attr('stroke-opacity', 0)
        mammalianAnatomy.mitoEls.forEach(({ g }) => g.attr('opacity', 0))
        mammalianAnatomy.organelleEls.forEach(({ el }) => el.attr('opacity', 0))
      }
      if (bacteriaAnatomy) {
        bacteriaAnatomy.bacteriaWallElOuter?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallElInner?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallC1?.attr('stroke-opacity', 0)
        bacteriaAnatomy.bacteriaWallC2?.attr('stroke-opacity', 0)
        bacteriaAnatomy.septum?.attr('stroke-opacity', 0)
        bacteriaAnatomy.flagEls?.forEach((f) => f.attr('stroke-opacity', 0))
        bacteriaAnatomy.hookEls?.forEach((h) => h.attr('stroke-opacity', 0))
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
      blebData.forEach(({ el: bEl }) => bEl.attr('r', 0).attr('stroke-opacity', 0))
      standingWaveRings.forEach((r) => r.attr('stroke-opacity', 0))
      calciumWaves.forEach(({ el: cEl }) => cEl.attr('stroke-opacity', 0))
      // Remove any in-flight fragment lines to prevent static artefacts in lysed state
      d3.select(el).select('svg').selectAll('line').interrupt().remove()
      timer.stop()
      return
    }

    // ── Lysing: progressive shatter ────────────────────────────────────────
    if (state === CELL_STATE.LYSING) {
      if (shatterStartElapsed < 0) shatterStartElapsed = elapsed
      const progress = Math.min(1, Math.max(0, (elapsed - shatterStartElapsed) / LYSIS_DURATION_MS))
      const chaos    = 12 + progress * 45
      const expandR  = BASE_R + progress * 32
      const blobPts: BlobPoint[] = blobPhases.map((ph) => ({
        angle: ph.baseAngle, r: expandR + (Math.random() - 0.5) * chaos * 2,
      }))
      const bp = blobLine(blobPts) || ''
      blobStroke.attr('d', bp).attr('stroke', COLOR_LYSIS)
        .attr('stroke-opacity', Math.max(0, 1 - progress * 0.9)).attr('stroke-width', 2.5 + progress * 3)
      blobBg.attr('d', bp).attr('fill-opacity', Math.max(0, 1 - progress * 1.2))
      blobFill.attr('d', bp).attr('fill', COLOR_LYSIS).attr('fill-opacity', Math.max(0, 0.1 - progress * 0.1))
      nourishBloom.attr('fill-opacity', 0)
      nourishGlow.attr('stroke-opacity', 0)
      if (mammalianAnatomy) {
        mammalianAnatomy.nucBlob.attr('stroke', COLOR_LYSIS)
          .attr('stroke-opacity', Math.max(0, 0.42 - progress * 0.42))
          .attr('fill-opacity', Math.max(0, 0.12 - progress * 0.12))
        mammalianAnatomy.nucOuterEnv.attr('stroke', COLOR_LYSIS)
          .attr('stroke-opacity', Math.max(0, 0.25 - progress * 0.25))
        mammalianAnatomy.nucleolus.attr('fill-opacity', Math.max(0, 0.28 - progress * 0.28))
        mammalianAnatomy.nucleolus2?.attr('fill-opacity', Math.max(0, 0.20 - progress * 0.20))
        mammalianAnatomy.nucleolus3?.attr('fill-opacity', Math.max(0, 0.18 - progress * 0.18))
        mammalianAnatomy.cortexRing.attr('stroke-opacity', Math.max(0, 0.09 - progress * 0.09))
        mammalianAnatomy.mitoEls.forEach(({ g }, i) => g.attr('opacity', Math.max(0, 1 - progress * 1.3 - i * 0.12)))
        mammalianAnatomy.organelleEls.forEach(({ el }, i) => el.attr('opacity', Math.max(0, 1 - progress * 1.3 - i * 0.05)))
      }
      if (bacteriaAnatomy) {
        bacteriaAnatomy.nucleoidBlob.attr('fill-opacity', Math.max(0, 0.11 - progress * 0.11))
        bacteriaAnatomy.ribosomeDots.forEach((d, i) => d.attr('opacity', Math.max(0, 1 - progress * 1.5 - i * 0.05)))
        bacteriaAnatomy.bacteriaWallElOuter?.attr('stroke-opacity', Math.max(0, 0.22 - progress * 0.22))
        bacteriaAnatomy.bacteriaWallElInner?.attr('stroke-opacity', Math.max(0, 0.16 - progress * 0.16))
        bacteriaAnatomy.bacteriaWallC1?.attr('stroke-opacity', Math.max(0, 0.16 - progress * 0.16))
        bacteriaAnatomy.bacteriaWallC2?.attr('stroke-opacity', Math.max(0, 0.13 - progress * 0.13))
        bacteriaAnatomy.septum?.attr('stroke-opacity', Math.max(0, 0.18 - progress * 0.18))
        bacteriaAnatomy.flagEls?.forEach((f) => f.attr('stroke-opacity', Math.max(0, 0.28 - progress * 0.28)))
        bacteriaAnatomy.hookEls?.forEach((h) => h.attr('stroke-opacity', Math.max(0, 0.40 - progress * 0.40)))
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
      blebData.forEach(({ el: bEl }) => bEl.attr('r', 0).attr('stroke-opacity', 0))
      standingWaveRings.forEach((r) => r.attr('stroke-opacity', 0))
      calciumWaves.forEach(({ el: cEl }) => cEl.attr('stroke-opacity', 0))
      return
    }

    // ── Normal states ──────────────────────────────────────────────────────
    const isVibrating  = state === CELL_STATE.VIBRATING
    const isNourishing = state === CELL_STATE.NOURISHING
    const isRevEp      = state === CELL_STATE.REV_EP
    // Shared pore-cycle signal — used by membrane flicker AND pore colour/radius below
    const revEpCycle   = isRevEp ? (Math.sin(elapsed * 0.0022) + 1) / 2 : 0

    // Rigid-shell pathogens deform less per unit impact
    const rigidityFactor = cellCategory === CELL_CATEGORY.VIRUS ? 0.40 : cellCategory === CELL_CATEGORY.BACTERIA ? 0.60 : 1.0
    const jitter    = (isVibrating ? 4 + impact * 18 : isNourishing ? 5 : 6) * rigidityFactor
    // Osmotic swelling at Rev-EP: transient pores allow ion influx → osmotic water influx → cell swells.
    // Proportional to pore extent above 50% DR (Weaver & Chizmadzhev 1996).
    const radiusMod = isNourishing ? 1 + impact * 0.12
      : isRevEp      ? 1 + (impact - 0.50) * 0.14
      : 1
    const speedMult = isVibrating ? 1 + impact * 5 : isNourishing ? 0.4 + impact * 0.4 : 0.8

    const blobPts: BlobPoint[] = blobPhases.map((ph, idx) => {
      const baseR  = shapeBaseR(ph.baseAngle) + (cancerBaseOffsets[idx] ?? 0)
      const wave   = Math.sin(elapsed * 0.001 * ph.speed * speedMult + ph.phaseOffset) * jitter
      const noise  = (Math.random() - 0.5) * (isVibrating ? jitter * 0.5 : 2.5) * rigidityFactor
      // cos(2θ) ∝ P₂(cosθ): positive at poles, negative at equator → prolate for K>0 (pDEP)
      const depR   = depDeformScale !== 0 ? depDeformScale * Math.cos(2 * ph.baseAngle) : 0
      return { angle: ph.baseAngle, r: baseR * radiusMod + wave + noise + depR }
    })
    const blobPath = blobLine(blobPts) || ''

    // ── Thermal tint ────────────────────────────────────────────────────────
    const tNorm       = Math.max(0, Math.min(1, (temperature - 37) / 63))
    const thermalColor = tNorm < 0.08
      ? accentColor
      : d3.interpolateRgb(accentColor, COLOR_HEAT)(Math.min(1, (tNorm - 0.08) / 0.45))

    blobBg.attr('d', blobPath).attr('fill-opacity', 1)
    blobFill.attr('d', blobPath).attr('fill', `url(#${gradId})`)
    gradStop1.attr('stop-color', thermalColor)
    // Rev-EP membrane flicker: stroke pulses toward amber in sync with the pore cycle,
    // representing transient permeabilisation of the lipid bilayer.
    const membraneStrokeColor = isRevEp
      ? d3.interpolateRgb(color, COLOR_AMBER)(revEpCycle * 0.55)
      : color
    const membraneStrokeWidth = isRevEp ? 2.5 + revEpCycle * 0.7 : (isNourishing ? 3 : 2.5)
    blobStroke.attr('d', blobPath).attr('stroke', membraneStrokeColor)
      .attr('stroke-opacity', 1).attr('stroke-width', membraneStrokeWidth)


    // ── Acoustic standing-wave rings (bacteria/virus resonance mode) ─────────
    // 5 rings oscillate in radius at staggered phases, representing the radial
    // displacement field of a spherically resonating capsid/cell wall.
    standingWaveRings.forEach((ring, i) => {
      if (!isAcousticMode) { ring.attr('stroke-opacity', 0); return }
      const baseR = BASE_R + 10 + i * 9
      const amp   = 2.5 + impact * 7               // oscillation grows with capsid disruption
      const speed = 0.0038 + impact * 0.0022
      const phase = i * ((Math.PI * 2) / standingWaveRings.length)
      const r     = Math.max(2, baseR + amp * Math.sin(elapsed * speed - phase))
      const opMax = 0.30 - i * 0.04
      ring.attr('r', r).attr('stroke', rayColor)
        .attr('stroke-opacity', opMax * (0.35 + impact * 0.65))
    })

    // ── Category-specific interior update ─────────────────────────────────
    if (mammalianAnatomy) {
      updateMammalianAnatomy(mammalianAnatomy, {
        elapsed, color, thermalColor, impact, tNorm, isNourishing, isVibrating, isRevEp, nuclearDisruptionRatio,
      })
    }
    if (bacteriaAnatomy) {
      updateBacteriaAnatomy(bacteriaAnatomy, { elapsed, color, impact, isVibrating })
    }
    if (virusAnatomy) {
      updateVirusAnatomy(virusAnatomy, { elapsed, color, impact, state })
    }

    // ── Nourishing background bloom + membrane halo ───────────────────────────
    // Two layered effects: a large radial bloom behind the cell (background aura)
    // and a wide blurred membrane halo tracing the cell border.
    // Both breathe at slightly different rates so the glow feels alive, not mechanical.
    if (isNourishing) {
      const breatheFast = (Math.sin(elapsed * 0.0013) + 1) / 2  // ~4.8 s cycle — membrane halo
      const breatheSlow = (Math.sin(elapsed * 0.0007) + 1) / 2  // ~9.0 s cycle — background bloom
      // Background bloom: soft radial aura behind the cell body
      const bloomOp = (0.22 + impact * 0.42) * (0.38 + breatheSlow * 0.62)
      nourishBloom.attr('fill', color).attr('fill-opacity', bloomOp)
      // Membrane halo: intense pulsing glow tracing the cell border
      const glowOp  = (0.28 + impact * 0.52) * (0.50 + breatheFast * 0.50)
      nourishGlow.attr('d', blobPath).attr('stroke', color).attr('stroke-opacity', glowOp)
    } else {
      nourishBloom.attr('fill-opacity', 0)
      nourishGlow.attr('stroke-opacity', 0)
    }

    // ── Calcium wave propagation (PIEZO1/TRP Ca²⁺ transients, nourishing state) ──
    // Waves contract inward from the membrane (BASE_R) toward the perinuclear region,
    // modelling Ca²⁺ diffusion after membrane entry — not outward expansion.
    if (isNourishing) {
      if (elapsed - lastCalciumElapsed > 1800) {
        lastCalciumElapsed = elapsed
        const wave = calciumWaves[calciumWaveIdx % calciumWaves.length]
        if (wave) wave.startElapsed = elapsed
        calciumWaveIdx++
      }
      calciumWaves.forEach((wave) => {
        const age = elapsed - wave.startElapsed
        if (age < 0 || age > 2200) { wave.el.attr('stroke-opacity', 0); return }
        const progress = age / 2200
        // Contracts from membrane inward to ~15% of cell radius (perinuclear)
        const waveR   = BASE_R * (1.0 - progress * 0.85)
        const opacity = Math.sin(progress * Math.PI) * 0.45
        wave.el.attr('cx', 0).attr('cy', 0)
          .attr('r', waveR).attr('stroke', color).attr('stroke-opacity', opacity)
      })
    } else {
      calciumWaves.forEach(({ el: cEl }) => cEl.attr('stroke-opacity', 0))
    }

    // ── Vm pole glow: accentColor → amber → red as DR grows; modulated by AC pulse ─
    const poleGlowIntensity = Math.max(0, (impact - 0.05) * 0.42)
    const poleGlowColor = impact < 0.5
      ? color
      : impact < 0.85
        ? d3.interpolateRgb(color, COLOR_AMBER)((impact - 0.5) / 0.35)
        : COLOR_LYSIS
    northPoleGlow.attr('fill', poleGlowColor).attr('fill-opacity', poleGlowIntensity * modOpacity)
    southPoleGlow.attr('fill', poleGlowColor).attr('fill-opacity', poleGlowIntensity * modOpacity)

    // ── Pores: Rev-EP (50–85% DR) = amber cycling; IRE (>85%) = opaque holes ──
    const revEpPoreR    = isRevEp ? 1.0 + revEpCycle * 2.4 : 0
    const primaryPore   = Math.min(PORE_MAX_R, Math.max(0, (impact - 0.70) / 0.30) * 4.5)
    const secondaryPore = isRod ? 0 : Math.min(PORE_MAX_R * 0.6, Math.max(0, (impact - 0.88) / 0.15) * 3.5)
    const finalPoleR    = Math.max(revEpPoreR, primaryPore)
    const poreIsHole    = primaryPore > 0.5
    northPore.attr('r', finalPoleR).attr('fill', poreIsHole ? CANVAS_BG : COLOR_PORE_AMBER)
      .attr('fill-opacity', poreIsHole ? 1 : 0.28 + revEpCycle * 0.32)
    southPore.attr('r', finalPoleR).attr('fill', poreIsHole ? CANVAS_BG : COLOR_PORE_AMBER)
      .attr('fill-opacity', poreIsHole ? 1 : 0.28 + revEpCycle * 0.32)
    pore3.attr('r', secondaryPore).attr('fill', CANVAS_BG).attr('fill-opacity', 1)
    pore4.attr('r', secondaryPore).attr('fill', CANVAS_BG).attr('fill-opacity', 1)

    // ── Ion streaming (Rev-EP only) ───────────────────────────────────────────
    const nPorePos = -northPoleR * PORE_INSET
    const sPorePos =  southPoleR * PORE_INSET
    ionNorth.forEach((ion, i) => {
      if (!isRevEp) { ion.attr('fill-opacity', 0); return }
      const speed = ION_SPEEDS[i] ?? 0.00037, phase = ION_PHASES_N[i] ?? 0
      const t = ((elapsed * speed + phase) % 1)
      ion.attr('cy', nPorePos * (1 - t)).attr('fill-opacity', Math.sin(t * Math.PI) * 0.70)
    })
    ionSouth.forEach((ion, i) => {
      if (!isRevEp) { ion.attr('fill-opacity', 0); return }
      const speed = ION_SPEEDS[i] ?? 0.00037, phase = ION_PHASES_S[i] ?? 0.50
      const t = ((elapsed * speed + phase) % 1)
      ion.attr('cy', sPorePos * (1 - t)).attr('fill-opacity', Math.sin(t * Math.PI) * 0.70)
    })

    // ── Membrane blebs: two field-axis polar protrusions (mammalian only) ────────
    // Physics: Maxwell stress ∝ Vm² ∝ cos²θ peaks at the anodic and cathodic poles.
    // Blebs grow from DR ~28% onward; each pulse independently (stochastic osmotic pressure).
    // Amber at Rev-EP (transient, reseals); danger-red at vibrating (irreversible herniation).
    blebData.forEach(({ el: bEl, idx, phaseShift, pulseSpeed }) => {
      const blebActive = state === CELL_STATE.APPROACHING || isRevEp || isVibrating
      if (!blebActive) { bEl.attr('r', 0).attr('stroke-opacity', 0); return }
      const blebBaseR = Math.max(0, (impact - 0.28) * BASE_R * 0.32)
      if (blebBaseR < 0.5) { bEl.attr('r', 0).attr('stroke-opacity', 0); return }
      const pt = blobPts[idx]
      if (!pt) return
      const pulse     = 0.68 + Math.sin(elapsed * pulseSpeed + phaseShift) * 0.32
      const r         = blebBaseR * pulse
      const blebColor = isVibrating ? COLOR_LYSIS : COLOR_AMBER
      bEl.attr('cx', pt.r * Math.sin(pt.angle))
        .attr('cy', -pt.r * Math.cos(pt.angle))
        .attr('r', r)
        .attr('fill', blebColor).attr('fill-opacity', isVibrating ? 0.07 : 0.05)
        .attr('stroke', blebColor).attr('stroke-width', 1.4)
        .attr('stroke-opacity', isVibrating ? 0.75 : 0.62)
    })

    // ── Membrane channel gating (PIEZO1/TRP/K+Na+; stochastic, state-dependent) ─
    const chanBaseOp = isVibrating ? 0.44
      : isRevEp      ? 0.36
      : isNourishing ? 0.20
      : state === CELL_STATE.APPROACHING ? 0.26
      : 0.06
    channelDots.forEach((dot, i) => {
      const gate = (Math.sin(elapsed * 0.0022 + i * 1.571) + 1) / 2
      dot.attr('fill-opacity', chanBaseOp * (0.40 + gate * 0.60))
    })

    glowBlur.attr('stdDeviation',
      isNourishing ? (3 + impact * 10).toFixed(1)
      : isVibrating  ? (3 + impact * 7).toFixed(1)
      : '3')
  })

  return timer
}

// ── Oscilloscope strip ────────────────────────────────────────────────────────

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
      path.attr('d', `M0,${H / 2} L${W},${H / 2}`).attr('stroke', COLOR_LYSIS).attr('stroke-width', 1).attr('stroke-opacity', 0.4)
      timer.stop()
      return
    }

    const isVibrating  = state === CELL_STATE.VIBRATING
    const isNourishing = state === CELL_STATE.NOURISHING
    const isLysing     = state === CELL_STATE.LYSING

    const baseAmp  = liveAmplitude * (H / 2 - 5)
    const amp      = isNourishing ? baseAmp * (1 + impact * 0.4) : baseAmp
    const speedMult = isVibrating ? 1 + impact * 5 : isLysing ? 8 : 1

    // Waveform clipping at Rev-EP and above: above electroporation threshold the membrane
    // conductance spikes, clamping Vm — the linear Schwan model no longer applies and the
    // waveform saturates. Clip level decreases from 1.0 (no clip, 50% DR) to 0.15 (heavy clip, 85% DR).
    const clipLevel   = impact > 0.50 ? Math.max(0.15, 1.0 - (impact - 0.50) * 2.0) : 1.0
    const isEpClipped = clipLevel < 0.95
    const pts = d3.range(120).map((i: number) => {
      const sinVal  = Math.sin((i / 120) * Math.PI * 8 + elapsed * scrollSpeed * speedMult)
      const clipped = Math.max(-clipLevel, Math.min(clipLevel, sinVal))
      // EP noise: on flat-top segments membrane conductance spikes produce high-freq jitter.
      // Models the stochastic pore opening/closing above the EP threshold.
      const epNoise = (isEpClipped && Math.abs(sinVal) > clipLevel)
        ? (Math.random() - 0.5) * (1 - clipLevel) * 0.90
        : 0
      return {
        x: (i / 119) * W,
        y: H / 2
          + amp * (clipped + epNoise)
          + (isLysing ? (Math.random() - 0.5) * H * 0.55 : 0),
      }
    })

    // Thicker stroke when EP clipping is active — signals membrane permeabilisation
    path.attr('d', lineGen(pts) || '').attr('stroke', isLysing ? COLOR_LYSIS : cellColor)
      .attr('stroke-width', isEpClipped ? 1.9 : 1.5)
  })

  return timer
}

// ── Fragment spawner ──────────────────────────────────────────────────────────

// Append one lysis fragment and animate it outward. Call every ~80 ms during lysing state.
// Variants: arc shard 35%, debris dot 23%, line shard 42%.
export function spawnFragment(el: HTMLElement): void {
  const svg = d3.select(el).select<SVGSVGElement>('svg')
  if (svg.empty()) return

  const W   = CANVAS_W, H = CANVAS_H
  const cx  = W / 2,    cy = H / 2
  const angle    = Math.random() * Math.PI * 2
  const startR   = 50 + Math.random() * 20
  const endR     = 90 + Math.random() * 70
  const duration = 650 + Math.random() * 900
  const roll     = Math.random()

  if (roll < 0.35) {
    // ── Arc shard: curved membrane fragment flying radially outward ──────────
    const arcR    = (startR + endR) * 0.5
    const arcSpan = 0.38 + Math.random() * 0.85
    const x1 = (cx + Math.cos(angle)           * arcR).toFixed(1)
    const y1 = (cy + Math.sin(angle)           * arcR).toFixed(1)
    const x2 = (cx + Math.cos(angle + arcSpan) * arcR).toFixed(1)
    const y2 = (cy + Math.sin(angle + arcSpan) * arcR).toFixed(1)
    svg.append('path')
      .attr('d', `M${x1},${y1} A${arcR.toFixed(1)},${arcR.toFixed(1)} 0 0,1 ${x2},${y2}`)
      .attr('fill', 'none').attr('stroke', COLOR_LYSIS)
      .attr('stroke-width', 0.6 + Math.random() * 1.6)
      .attr('stroke-linecap', 'round').attr('stroke-opacity', 0.85)
      .transition().duration(duration).ease(d3.easeQuadOut)
      .attr('stroke-opacity', 0)
      .remove()
  } else if (roll < 0.58) {
    // ── Debris dot: cytoplasmic content ejected from ruptured membrane ───────
    const driftR = startR + Math.random() * 45
    svg.append('circle')
      .attr('cx', cx + Math.cos(angle) * driftR)
      .attr('cy', cy + Math.sin(angle) * driftR)
      .attr('r', 1.2 + Math.random() * 2.8)
      .attr('fill', COLOR_LYSIS).attr('fill-opacity', 0.72)
      .transition().duration(duration).ease(d3.easeQuadOut)
      .attr('fill-opacity', 0)
      .remove()
  } else {
    // ── Line shard: radial tear fragment drifting outward (original behaviour) ─
    const len = 6 + Math.random() * 14
    svg.append('line')
      .attr('x1', cx + Math.cos(angle) * startR)
      .attr('y1', cy + Math.sin(angle) * startR)
      .attr('x2', cx + Math.cos(angle) * (startR + len))
      .attr('y2', cy + Math.sin(angle) * (startR + len))
      .attr('stroke', COLOR_LYSIS)
      .attr('stroke-width', 0.5 + Math.random() * 2)
      .attr('stroke-opacity', 1)
      .transition().duration(duration).ease(d3.easeQuadOut)
      .attr('x1', cx + Math.cos(angle) * endR)
      .attr('y1', cy + Math.sin(angle) * endR)
      .attr('x2', cx + Math.cos(angle) * (endR + len))
      .attr('y2', cy + Math.sin(angle) * (endR + len))
      .attr('stroke-opacity', 0)
      .remove()
  }
}
