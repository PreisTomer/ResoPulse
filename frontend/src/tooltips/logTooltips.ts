// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { depKDisplayFull } from '@/utils/experimentUtils'

import { NULL_DISPLAY } from '@/constants/strings'

type TFn = (key: string, params?: Record<string, unknown>) => string

export function tipCellSession(t: TFn, e: { sessionName?: string; id: number }): string {
  return t('log.tipCellSession', { name: e.sessionName ?? NULL_DISPLAY, id: e.id })
}

export function tipCellFreq(t: TFn, e: { freqKHz: number }): string {
  return t('log.tipCellFreq', { freq: e.freqKHz })
}

export function tipCellField(t: TFn, e: { fieldVcm: number }): string {
  return t('log.tipCellField', { field: e.fieldVcm })
}

export function tipCellTargetVm(t: TFn, e: { targetVm: number; targetPreset: string; targetRatio: number }): string {
  return t('log.tipCellTargetVm', {
    vm:     e.targetVm.toFixed(3),
    preset: e.targetPreset,
    ratio:  (e.targetRatio * 100).toFixed(1),
  })
}

export function tipCellHealthyVm(t: TFn, e: { healthyVm: number; healthyRatio: number }): string {
  return t('log.tipCellHealthyVm', {
    vm:    e.healthyVm.toFixed(3),
    ratio: (e.healthyRatio * 100).toFixed(1),
  })
}

export function tipCellSel(t: TFn, e: { selectivity: number; targetTemp: number; healthyTemp: number }): string {
  return t('log.tipCellSel', {
    sel:         e.selectivity.toFixed(3),
    targetTemp:  e.targetTemp.toFixed(1),
    healthyTemp: e.healthyTemp.toFixed(1),
  })
}

export function tipCellDepH(t: TFn, e: { depHealthyK?: number }): string {
  return t('log.tipCellDepH', { k: depKDisplayFull(e.depHealthyK) })
}

export function tipCellDepT(t: TFn, e: { depTargetK?: number }): string {
  return t('log.tipCellDepT', { k: depKDisplayFull(e.depTargetK) })
}
