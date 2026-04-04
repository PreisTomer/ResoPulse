// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { formatFreqKHz } from '@/utils/format'
import { formatLysisTime } from '@/tooltips/sliderTooltips'

type CellBadgeTooltipParams = {
  label: string
  radius: number
  membraneThickness: number
  fcDisplay: string
}

type CellBadgeTooltipBuilder = (opts: CellBadgeTooltipParams) => string

type ExperimentCell = {
  label: string
  radius: number
  membraneThickness: number
}

export function buildExperimentCellBadgeTooltip(
  builder: CellBadgeTooltipBuilder,
  cell: ExperimentCell,
  fcKHz: number,
): string {
  return builder({
    label: cell.label,
    radius: cell.radius,
    membraneThickness: cell.membraneThickness,
    fcDisplay: formatFreqKHz(fcKHz, 1),
  })
}

export function formatSnapLysisCellLabel(label: string, lysisDelayMs: number): string {
  return `${label} (~${formatLysisTime(lysisDelayMs)})`
}