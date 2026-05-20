// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Genetic strategy rules — given a cell line and molecule, recommend vector, promoter, codon optimization, secretion signal.

import { getCellLineById, EXPRESSION_MODE, GLYCOSYLATION_TYPE, type CellLineEntry, type ExpressionMode } from '@/constants/cellLineCatalog'
import { getVectorsForCellAndMolecule, type VectorEntry } from '@/constants/vectorCatalog'
import { MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'

export interface GeneticStrategyRecommendation {
  expressionMode:     ExpressionMode
  expressionRationale: string
  recommendedVectors: VectorEntry[]
  primaryVector:      VectorEntry | null
  primaryVectorRationale: string
  codonOptimization:  { recommended: boolean; rationale: string }
  secretionSignal:    { value: string; rationale: string }
  warnings:           string[]
}

const EMPTY_RESULT: GeneticStrategyRecommendation = {
  expressionMode:        EXPRESSION_MODE.BOTH,
  expressionRationale:   '',
  recommendedVectors:    [],
  primaryVector:         null,
  primaryVectorRationale:'',
  codonOptimization:     { recommended: false, rationale: '' },
  secretionSignal:       { value: 'native', rationale: '' },
  warnings:              ['No cell line selected.'],
}

export function recommendStrategy(cellLineId: string | null, molecule: MoleculeType): GeneticStrategyRecommendation {
  if (!cellLineId) return EMPTY_RESULT
  const cellLine = getCellLineById(cellLineId)
  if (!cellLine) return { ...EMPTY_RESULT, warnings: [`Cell line "${cellLineId}" not found in catalog.`] }

  const moleculeMeta = MOLECULE_TYPE_META[molecule]
  const compatibleVectors = getVectorsForCellAndMolecule(cellLineId, molecule)

  const expressionMode = pickExpressionMode(cellLine, molecule)
  const expressionFiltered = compatibleVectors.filter(v =>
    expressionMode === EXPRESSION_MODE.TRANSIENT ? v.supportsTransient :
    expressionMode === EXPRESSION_MODE.STABLE    ? v.supportsStable :
                                                    (v.supportsTransient || v.supportsStable),
  )
  const primaryVector = expressionFiltered[0] ?? compatibleVectors[0] ?? null

  return {
    expressionMode,
    expressionRationale:    expressionRationaleFor(cellLine, molecule, expressionMode),
    recommendedVectors:     expressionFiltered.length > 0 ? expressionFiltered : compatibleVectors,
    primaryVector,
    primaryVectorRationale: vectorRationaleFor(primaryVector, cellLine),
    codonOptimization:      codonRecommendationFor(cellLine, moleculeMeta.label),
    secretionSignal:        secretionRecommendationFor(cellLine),
    warnings:               warningsFor(cellLine, molecule, compatibleVectors.length),
  }
}

function pickExpressionMode(cellLine: CellLineEntry, _molecule: MoleculeType): ExpressionMode {
  if (cellLine.expressionMode === EXPRESSION_MODE.TRANSIENT) return EXPRESSION_MODE.TRANSIENT
  if (cellLine.expressionMode === EXPRESSION_MODE.STABLE)    return EXPRESSION_MODE.STABLE
  return EXPRESSION_MODE.STABLE
}

function expressionRationaleFor(cellLine: CellLineEntry, molecule: MoleculeType, mode: ExpressionMode): string {
  const moleculeLabel = MOLECULE_TYPE_META[molecule].label
  if (mode === EXPRESSION_MODE.TRANSIENT) {
    return `${cellLine.shortLabel} is most productive in transient mode. Fast turnaround (days), no clone selection required.`
  }
  if (mode === EXPRESSION_MODE.STABLE) {
    return `${cellLine.shortLabel} supports stable expression with sustained titer and consistency suitable for scaled ${moleculeLabel} production.`
  }
  return `${cellLine.shortLabel} supports both modes. Stable is the safer default for production at scale.`
}

function vectorRationaleFor(vector: VectorEntry | null, cellLine: CellLineEntry): string {
  if (!vector) return `No vector in the catalog matches ${cellLine.shortLabel} plus this molecule. Manual vector design recommended.`
  return `${vector.shortLabel} (${vector.promoter}, ${vector.selectionMarker}) is the most commonly used vector for ${cellLine.shortLabel} in this expression context.`
}

function codonRecommendationFor(cellLine: CellLineEntry, moleculeLabel: string): { recommended: boolean; rationale: string } {
  switch (cellLine.hostSpecies) {
    case 'mammalian':
      return {
        recommended: false,
        rationale:   `${cellLine.shortLabel} natural codon usage is close to most human therapeutic sequences. Codon optimization is optional and rarely yields >2x improvement.`,
      }
    case 'bacterial':
      return {
        recommended: true,
        rationale:   `Codon optimization for E. coli typically gives 3-10x expression increase for mammalian-origin coding sequences in ${moleculeLabel} production.`,
      }
    case 'yeast':
      return {
        recommended: true,
        rationale:   `Codon optimization for Pichia is strongly recommended for human-origin sequences.`,
      }
    case 'insect':
      return {
        recommended: true,
        rationale:   `Insect codon optimization can improve baculovirus expression yields by 2-5x.`,
      }
    default:
      return { recommended: false, rationale: '' }
  }
}

function secretionRecommendationFor(cellLine: CellLineEntry): { value: string; rationale: string } {
  switch (cellLine.hostSpecies) {
    case 'mammalian':
      return {
        value:     'native signal peptide',
        rationale: `Mammalian cells handle native secretion signals from human proteins efficiently. No engineered signal required for most antibody and recombinant protein workflows.`,
      }
    case 'bacterial':
      return {
        value:     'pelB or OmpA',
        rationale: `Periplasmic secretion in E. coli requires an engineered signal peptide (pelB, OmpA, or LamB). Avoids inclusion body formation for many proteins.`,
      }
    case 'yeast':
      return {
        value:     'alpha-mating factor',
        rationale: `The S. cerevisiae alpha-mating factor signal is the most reliable secretion signal in Pichia pastoris.`,
      }
    case 'insect':
      return {
        value:     'native or honeybee melittin',
        rationale: `Native secretion signals work for most secreted proteins in Sf9; honeybee melittin is a strong alternative.`,
      }
    default:
      return { value: 'native', rationale: '' }
  }
}

function warningsFor(cellLine: CellLineEntry, molecule: MoleculeType, vectorCount: number): string[] {
  const warnings: string[] = []
  const moleculeLabel = MOLECULE_TYPE_META[molecule].label

  if (vectorCount === 0) {
    warnings.push(`No vector in the catalog combines ${cellLine.shortLabel} with ${moleculeLabel}. Add a custom vector or change cell line.`)
  }

  if (cellLine.glycosylation === GLYCOSYLATION_TYPE.SIMPLE && (molecule === 'mab' || molecule === 'bispecific')) {
    warnings.push(`Yeast glycosylation (high-mannose) may be immunogenic for therapeutic antibodies. Consider switching to a mammalian host.`)
  }

  if (cellLine.glycosylation === GLYCOSYLATION_TYPE.NONE && (molecule === 'mab' || molecule === 'fusion-protein' || molecule === 'vaccine-antigen')) {
    warnings.push(`${cellLine.shortLabel} does not glycosylate proteins. ${moleculeLabel} usually requires glycosylation; consider a mammalian or insect host.`)
  }

  return warnings
}
