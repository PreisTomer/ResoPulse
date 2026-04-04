// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { CELL_CATEGORY, WAVEFORM } from '@/constants/strings'

import type { CellConfig } from '@/types/cell'

import { tempCorrectedVth } from './physics'

type ResonanceCell = Pick<CellConfig, 'resonantFreqGHz' | 'resonantThresholdVcm'>
type CellCategoryValue = 'mammalian' | 'bacteria' | 'virus'
type WaveformValue = 'cw' | 'pulsed' | 'hfire'

export function isResonanceCapableCategory(category: CellCategoryValue): boolean {
  return category === CELL_CATEGORY.BACTERIA || category === CELL_CATEGORY.VIRUS
}

export function hasResonanceConfig(cell: ResonanceCell): cell is ResonanceCell & {
  resonantFreqGHz: number
  resonantThresholdVcm: number
} {
  return cell.resonantFreqGHz != null && cell.resonantThresholdVcm != null
}

export function isConfiguredResonanceTarget(
  cell: ResonanceCell,
  category: CellCategoryValue,
): boolean {
  return isResonanceCapableCategory(category) && hasResonanceConfig(cell)
}

export function isActiveResonanceTarget(
  cell: ResonanceCell,
  category: CellCategoryValue,
  isResonanceMode: boolean,
): boolean {
  return isResonanceMode && isConfiguredResonanceTarget(cell, category)
}

export function getHfireThresholdMultiplier(waveform: WaveformValue): number {
  return waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
}

export function effectiveElectroporationThreshold(
  nominalVth: number,
  tempC: number,
  waveform: WaveformValue,
): number {
  return tempCorrectedVth(nominalVth, tempC) * getHfireThresholdMultiplier(waveform)
}

export function effectiveResonanceThreshold(
  resonantThresholdVcm: number,
  tempC: number,
): number {
  return tempCorrectedVth(resonantThresholdVcm, tempC)
}