// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { CELL_STATE, CELL_TYPE } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/cellCard'

import type { CellState } from '@/types/cell'

export interface CellStateParams {
  type: string
  impact: number
  temperature: number
  biostimScore: number
  shatterPending: boolean
}

export interface CellStateResult {
  nextState: CellState
  shouldArmLysis: boolean
  isThermalVaporisation: boolean
}

export function computeNextCellState(params: CellStateParams): CellStateResult {
  const { type, impact, temperature, biostimScore, shatterPending } = params

  if (temperature >= THRESHOLDS.TEMP_VAPORIZING) {
    return { nextState: CELL_STATE.LYSING as CellState, shouldArmLysis: false, isThermalVaporisation: true }
  }

  const thermalFloor: CellState =
    temperature >= THRESHOLDS.TEMP_DENATURING ? CELL_STATE.CRITICAL as CellState
    : temperature >= THRESHOLDS.TEMP_WARN     ? CELL_STATE.APPROACHING as CellState
    : CELL_STATE.STABLE as CellState

  if (type === CELL_TYPE.TARGET) {
    if (impact > THRESHOLDS.DISRUPTION_WARN) {
      return {
        nextState: CELL_STATE.VIBRATING as CellState,
        shouldArmLysis: !shatterPending,
        isThermalVaporisation: false,
      }
    }

    const elState: CellState =
      impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.REV_EP as CellState
      : impact > THRESHOLDS.VIBRATING_MIN      ? CELL_STATE.APPROACHING as CellState
      : CELL_STATE.STABLE as CellState

    const ORDER: CellState[] = [
      CELL_STATE.STABLE as CellState,
      CELL_STATE.APPROACHING as CellState,
      CELL_STATE.REV_EP as CellState,
      CELL_STATE.CRITICAL as CellState,
    ]
    const nextState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
    return { nextState, shouldArmLysis: false, isThermalVaporisation: false }
  }

  const elState: CellState =
    impact >= THRESHOLDS.HEALTHY_CRITICAL      ? CELL_STATE.CRITICAL as CellState
    : impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.APPROACHING as CellState
    : impact > THRESHOLDS.VIBRATING_MIN && biostimScore >= THRESHOLDS.BMS_NOURISHING ? CELL_STATE.NOURISHING as CellState
    : CELL_STATE.STABLE as CellState

  const ORDER: CellState[] = [
    CELL_STATE.STABLE as CellState,
    CELL_STATE.NOURISHING as CellState,
    CELL_STATE.APPROACHING as CellState,
    CELL_STATE.CRITICAL as CellState,
  ]
  const nextState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
  return { nextState, shouldArmLysis: false, isThermalVaporisation: false }
}
