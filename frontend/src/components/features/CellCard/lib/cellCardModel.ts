// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import {
  tipAcousticVm as tipAcousticVmFn,
  tipState as tipStateFn,
  tipTemp as tipTempFn,
  tipVm as tipVmFn,
} from '@/tooltips/cellCardTooltips'

import { THRESHOLDS } from '@/constants/cellCard'
import { CELL_CATEGORY, CELL_TYPE } from '@/constants/strings'
import { UNIT } from '@/constants/units'

import type { CellConfig } from '@/types/cell'

import { effectiveElectroporationThreshold } from '@/utils/cellModel'

type CellSide = 'healthy' | 'target'
type WaveformValue = 'cw' | 'pulsed' | 'hfire'
type CellCategoryValue = 'healthy' | 'cancer' | 'bacteria' | 'virus' | 'reference'
type AcousticCellConfig = CellConfig & { resonantFreqGHz?: number; capsidQ?: number; experimentalBasis?: string }

function valueByCellType<T>(type: CellSide, healthyValue: T, targetValue: T): T {
  return type === CELL_TYPE.HEALTHY ? healthyValue : targetValue
}

export function cellByType(type: CellSide, healthyCell: CellConfig, targetCell: CellConfig): CellConfig {
  return valueByCellType(type, healthyCell, targetCell)
}

export function pulseEnvelopeFactorByCellType(
  type: CellSide,
  healthyFactor: number,
  targetFactor: number,
): number {
  return valueByCellType(type, healthyFactor, targetFactor)
}

export function effectiveThresholdByCellType(
  type: CellSide,
  healthyCell: CellConfig,
  targetCell: CellConfig,
  healthyTemp: number,
  targetTemp: number,
  waveform: WaveformValue,
): number {
  const cell = cellByType(type, healthyCell, targetCell)
  const temp = valueByCellType(type, healthyTemp, targetTemp)
  return effectiveElectroporationThreshold(cell.thresholdVoltage, temp, waveform)
}

export function isAcousticTargetCell(
  type: CellSide,
  targetCellCategory: CellCategoryValue,
  targetCell: AcousticCellConfig,
): boolean {
  if (type !== CELL_TYPE.TARGET) return false
  if (targetCellCategory !== CELL_CATEGORY.BACTERIA && targetCellCategory !== CELL_CATEGORY.VIRUS) return false
  return !!targetCell.resonantFreqGHz
}

export function buildVmDisplay(isAcousticTarget: boolean, disruptionRatio: number, vmMv: number): string {
  if (isAcousticTarget) return `DR ${(disruptionRatio * 100).toFixed(0)}${UNIT.PERCENT}`
  return `${vmMv.toFixed(1)} ${UNIT.MV}`
}

export function buildTempDisplay(temperature: number): string {
  return `${temperature.toFixed(1)} ${UNIT.DEG_C}`
}

export function getTempFlags(temperature: number) {
  return {
    tempWarning: temperature > THRESHOLDS.TEMP_WARN,
    tempDenaturing: temperature >= THRESHOLDS.TEMP_DENATURING,
    tempVaporizing: temperature >= THRESHOLDS.TEMP_VAPORIZING,
  }
}

export function buildVmTooltip(opts: {
  isAcousticTarget: boolean
  targetCell: AcousticCellConfig
  disruptionRatio: number
  freqKHz: number
  fieldVcm: number
  vmDisplay: string
  thresholdVoltage: number
  waveform: WaveformValue
}): string {
  if (opts.isAcousticTarget) {
    return tipAcousticVmFn({
      disruptionRatio: opts.disruptionRatio,
      resonantFreqGHz: opts.targetCell.resonantFreqGHz ?? 0,
      capsidQ: opts.targetCell.capsidQ ?? 1,
      freqKHz: opts.freqKHz,
      fieldVcm: opts.fieldVcm,
      experimentalBasis: opts.targetCell.experimentalBasis,
    })
  }

  return tipVmFn({
    vmDisplay: opts.vmDisplay,
    disruptionRatio: opts.disruptionRatio,
    thresholdVoltage: opts.thresholdVoltage,
    waveform: opts.waveform,
  })
}

export function buildTempTooltip(tempDisplay: string, flags: ReturnType<typeof getTempFlags>): string {
  return tipTempFn({
    tempDisplay,
    tempVaporizing: flags.tempVaporizing,
    tempDenaturing: flags.tempDenaturing,
    tempWarning: flags.tempWarning,
  })
}

export function buildStateTooltip(cellState: string, thermalLysis: boolean, cellType: string, lysisDelayMs: number): string {
  return tipStateFn({
    cellState,
    thermalLysis,
    cellType,
    lysisDelayMs,
  })
}