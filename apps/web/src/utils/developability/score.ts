// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Developability score — composite (0-1) across four axes for the selected cell line + molecule.
// Labelled "simulator construct" per honesty.md.

import { getCellLineById, EXPRESSION_MODE, type CellLineEntry } from '@/constants/cellLineCatalog'
import type { MoleculeType } from '@/constants/moleculeTypes'

import { getRankForCellLine } from '@/utils/cellLine/ranking'

export const DEVELOPABILITY_AXES = ['productivity', 'stability', 'scalability', 'regulatory'] as const
export type DevelopabilityAxis = typeof DEVELOPABILITY_AXES[number]

export interface DevelopabilityScoreResult {
  composite:  number                                   // 0-1, equal-weighted across axes
  axes:       Record<DevelopabilityAxis, number>       // each 0-1
  rationale:  Record<DevelopabilityAxis, string>
  available:  boolean                                  // false when no cell line selected
}

const EMPTY: DevelopabilityScoreResult = {
  composite:  0,
  axes:       { productivity: 0, stability: 0, scalability: 0, regulatory: 0 },
  rationale:  { productivity: '', stability: '', scalability: '', regulatory: '' },
  available:  false,
}

export function computeDevelopabilityScore(cellLineId: string | null, molecule: MoleculeType): DevelopabilityScoreResult {
  if (!cellLineId) return EMPTY
  const cellLine = getCellLineById(cellLineId)
  if (!cellLine) return EMPTY
  const rank = getRankForCellLine(molecule, cellLineId)

  const axes: Record<DevelopabilityAxis, number> = {
    productivity: rank?.productivityScore ?? 0,
    stability:    stabilityScore(cellLine),
    scalability:  scalabilityScore(cellLine),
    regulatory:   cellLine.regulatoryAcceptance,
  }

  const composite = (axes.productivity + axes.stability + axes.scalability + axes.regulatory) / 4

  const rationale: Record<DevelopabilityAxis, string> = {
    productivity: productivityRationale(rank, cellLine),
    stability:    stabilityRationale(cellLine),
    scalability:  scalabilityRationale(cellLine),
    regulatory:   regulatoryRationale(cellLine),
  }

  return { composite, axes, rationale, available: true }
}

function stabilityScore(cellLine: CellLineEntry): number {
  // Stable-supporting cell lines score higher than transient-only;
  // bacterial systems are intrinsically stable but score less than mammalian for therapeutic proteins.
  if (cellLine.expressionMode === EXPRESSION_MODE.STABLE) return 0.90
  if (cellLine.expressionMode === EXPRESSION_MODE.BOTH)   return 0.80
  return 0.55  // transient only
}

function scalabilityScore(cellLine: CellLineEntry): number {
  // Bacterial scales fast; mammalian is moderate; insect/yeast are slower for industrial bioreactor scale.
  switch (cellLine.hostSpecies) {
    case 'bacterial':  return 0.95
    case 'mammalian':  return 0.85
    case 'yeast':      return 0.75
    case 'insect':     return 0.65
    default:           return 0.5
  }
}

function productivityRationale(rank: ReturnType<typeof getRankForCellLine>, cellLine: CellLineEntry): string {
  if (!rank?.productivity) return `No productivity profile for ${cellLine.shortLabel} on this molecule type.`
  const [low, high] = rank.productivity.titerRange
  return `Predicted titer ${low} to ${high} ${rank.productivity.units}; productivity score normalized against compatible cell lines.`
}

function stabilityRationale(cellLine: CellLineEntry): string {
  if (cellLine.expressionMode === EXPRESSION_MODE.STABLE) return `${cellLine.shortLabel} supports stable expression suitable for sustained production.`
  if (cellLine.expressionMode === EXPRESSION_MODE.BOTH)   return `${cellLine.shortLabel} supports both transient and stable expression; stable is preferred for scale.`
  return `${cellLine.shortLabel} is transient-only; clonal stability is not applicable.`
}

function scalabilityRationale(cellLine: CellLineEntry): string {
  const doubling = (cellLine.doublingTimeHrs[0] + cellLine.doublingTimeHrs[1]) / 2
  return `${cellLine.hostSpecies} host with median doubling time ${doubling.toFixed(1)} h; scalability score reflects industry experience at production scale.`
}

function regulatoryRationale(cellLine: CellLineEntry): string {
  return `${cellLine.numApprovedProducts} approved products produced in ${cellLine.shortLabel} to date.`
}
