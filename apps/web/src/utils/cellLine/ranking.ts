// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Cell line ranking — Module 1a core prediction logic.
// Given a target molecule type, score every cell line in CELL_LINE_CATALOG and rank by composite fit.

import { CELL_LINE_CATALOG, type CellLineEntry, type ProductivityProfile } from '@/constants/cellLineCatalog'
import type { MoleculeType } from '@/constants/moleculeTypes'

export const RANKING_WEIGHTS = {
  PRODUCTIVITY: 0.50,
  REGULATORY:   0.30,
  CONFIDENCE:   0.20,
} as const

export interface CellLineRankReason {
  kind:     'productivity-high' | 'productivity-mid' | 'productivity-low'
          | 'regulatory-strong' | 'regulatory-moderate' | 'regulatory-limited'
          | 'platform-established' | 'platform-emerging'
          | 'speed-fast' | 'speed-slow'
          | 'glycosylation-required' | 'glycosylation-not-required'
  // Data shown in the reason chip, all numeric/structured so the UI handles i18n.
  titerLow?:        number
  titerHigh?:       number
  titerUnits?:      string
  approvedCount?:   number
}

export interface CellLineRankResult {
  cellLine:         CellLineEntry
  fitScore:         number                   // 0-1; primary ranking signal
  productivityScore:number                   // 0-1; relative within candidates for this molecule
  regulatoryScore:  number                   // 0-1; cell.regulatoryAcceptance
  confidenceScore:  number                   // 0-1; confidence in the productivity profile
  productivity:     ProductivityProfile | null
  reasons:          CellLineRankReason[]     // ordered: most-positive first; max 3
}

/**
 * Rank all cell lines for a given target molecule type.
 * Returns compatible cell lines only, sorted by fit score (descending).
 */
export function rankCellLines(molecule: MoleculeType, catalog: CellLineEntry[] = CELL_LINE_CATALOG): CellLineRankResult[] {
  const compatible = catalog.filter(c => c.compatibleMoleculeTypes.includes(molecule))
  if (compatible.length === 0) return []

  const profiles = compatible.map(c => c.productivityProfiles[molecule] ?? null)
  const titerMidpoints = profiles.map(p => p ? (p.titerRange[0] + p.titerRange[1]) / 2 : 0)
  const maxTiter = Math.max(...titerMidpoints, 1)

  const results: CellLineRankResult[] = compatible.map((cellLine, i) => {
    const productivity     = profiles[i] ?? null
    const midpoint         = titerMidpoints[i] ?? 0
    const productivityScore = productivity ? midpoint / maxTiter : 0
    const regulatoryScore  = cellLine.regulatoryAcceptance
    const confidenceScore  = productivity?.confidence ?? 0

    const fitScore =
      RANKING_WEIGHTS.PRODUCTIVITY * productivityScore +
      RANKING_WEIGHTS.REGULATORY   * regulatoryScore +
      RANKING_WEIGHTS.CONFIDENCE   * confidenceScore

    return {
      cellLine,
      fitScore,
      productivityScore,
      regulatoryScore,
      confidenceScore,
      productivity,
      reasons: buildReasons(cellLine, productivity, productivityScore, regulatoryScore),
    }
  })

  return results.sort((a, b) => b.fitScore - a.fitScore)
}

function buildReasons(
  cellLine:         CellLineEntry,
  productivity:     ProductivityProfile | null,
  productivityScore:number,
  regulatoryScore:  number,
): CellLineRankReason[] {
  const out: CellLineRankReason[] = []

  if (productivity) {
    const kind: CellLineRankReason['kind'] =
      productivityScore >= 0.66 ? 'productivity-high' :
      productivityScore >= 0.33 ? 'productivity-mid'  :
                                  'productivity-low'
    out.push({
      kind,
      titerLow:   productivity.titerRange[0],
      titerHigh:  productivity.titerRange[1],
      titerUnits: productivity.units,
    })
  }

  if (regulatoryScore >= 0.85) {
    out.push({ kind: 'regulatory-strong',   approvedCount: cellLine.numApprovedProducts })
  } else if (regulatoryScore >= 0.70) {
    out.push({ kind: 'regulatory-moderate', approvedCount: cellLine.numApprovedProducts })
  } else if (cellLine.numApprovedProducts < 5) {
    out.push({ kind: 'regulatory-limited',  approvedCount: cellLine.numApprovedProducts })
  }

  if (cellLine.numApprovedProducts >= 20) {
    out.push({ kind: 'platform-established' })
  } else if (cellLine.numApprovedProducts <= 3) {
    out.push({ kind: 'platform-emerging' })
  }

  const doublingMid = (cellLine.doublingTimeHrs[0] + cellLine.doublingTimeHrs[1]) / 2
  if (doublingMid < 4) {
    out.push({ kind: 'speed-fast' })
  } else if (doublingMid > 22) {
    out.push({ kind: 'speed-slow' })
  }

  // Keep top 3 most-relevant reasons.
  return out.slice(0, 3)
}

/**
 * Get a single rank entry for a specific cell line (or null if incompatible).
 * Used by the StrategyPanel and DevelopabilityScore which need the score for the user's currently-selected cell.
 */
export function getRankForCellLine(molecule: MoleculeType, cellLineId: string): CellLineRankResult | null {
  const ranked = rankCellLines(molecule)
  return ranked.find(r => r.cellLine.id === cellLineId) ?? null
}
