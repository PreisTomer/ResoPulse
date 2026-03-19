// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { NULL_DISPLAY } from '@/constants/strings'
import { depKDisplayFull } from '@/utils/experimentUtils'

/** Minimal signature shared by vue-i18n's `$t` and the `t` composable. */
type TFn = (key: string, params?: Record<string, unknown>) => string

/**
 * Tooltip for the Session column cell.
 * @param t - Translation function ($t or useI18n().t)
 * @param e - Entry fields used in the tooltip
 */
export function tipCellSession(t: TFn, e: { sessionName?: string; id: number }): string {
  return t('log.tipCellSession', { name: e.sessionName ?? NULL_DISPLAY, id: e.id })
}

/**
 * Tooltip for the Frequency column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellFreq(t: TFn, e: { freqKHz: number }): string {
  return t('log.tipCellFreq', { freq: e.freqKHz })
}

/**
 * Tooltip for the Field column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellField(t: TFn, e: { fieldVcm: number }): string {
  return t('log.tipCellField', { field: e.fieldVcm })
}

/**
 * Tooltip for the Target Vm column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellTargetVm(
  t: TFn,
  e: { targetVm: number; targetPreset: string; targetRatio: number },
): string {
  return t('log.tipCellTargetVm', {
    vm:     e.targetVm.toFixed(3),
    preset: e.targetPreset,
    ratio:  (e.targetRatio * 100).toFixed(1),
  })
}

/**
 * Tooltip for the Healthy Vm column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellHealthyVm(
  t: TFn,
  e: { healthyVm: number; healthyRatio: number },
): string {
  return t('log.tipCellHealthyVm', {
    vm:    e.healthyVm.toFixed(3),
    ratio: (e.healthyRatio * 100).toFixed(1),
  })
}

/**
 * Tooltip for the Selectivity column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellSel(
  t: TFn,
  e: { selectivity: number; targetTemp: number; healthyTemp: number },
): string {
  return t('log.tipCellSel', {
    sel:         e.selectivity.toFixed(3),
    targetTemp:  e.targetTemp.toFixed(1),
    healthyTemp: e.healthyTemp.toFixed(1),
  })
}

/**
 * Tooltip for the DEP Healthy K column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellDepH(t: TFn, e: { depHealthyK?: number }): string {
  return t('log.tipCellDepH', { k: depKDisplayFull(e.depHealthyK) })
}

/**
 * Tooltip for the DEP Target K column cell.
 * @param t - Translation function
 * @param e - Entry fields used in the tooltip
 */
export function tipCellDepT(t: TFn, e: { depTargetK?: number }): string {
  return t('log.tipCellDepT', { k: depKDisplayFull(e.depTargetK) })
}
