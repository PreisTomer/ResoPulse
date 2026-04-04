// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import {
  tipCellDepH,
  tipCellDepT,
  tipCellField,
  tipCellFreq,
  tipCellHealthyVm,
  tipCellSel,
  tipCellSession,
  tipCellTargetVm,
} from '@/tooltips/logTooltips'

import { LOG_EVENT } from '@/constants/strings'
import { UNIT } from '@/constants/units'

type TFn = (key: string, params?: Record<string, unknown>) => string

export function formatDoseBadge(dose: number): string {
  if (dose >= 1000) return `${(dose / 1000).toFixed(2)} ${UNIT.KJ_PER_KG}`
  if (dose >= 1) return `${dose.toFixed(1)} ${UNIT.J_PER_KG}`
  return `${(dose * 1000).toFixed(0)} ${UNIT.MJ_PER_KG}`
}

export function formatOptionalRatioPct(ratio?: number): string {
  return ratio != null ? `${(ratio * 100).toFixed(1)}%` : '—'
}

function ratioPctParam(ratio?: number): string {
  return ((ratio ?? 0) * 100).toFixed(1)
}

export function createExperimentLogTooltips(t: TFn) {
  return {
    session: (entry: { sessionName?: string; id: number }) => tipCellSession(t, entry),
    freq: (entry: { freqKHz: number }) => tipCellFreq(t, entry),
    field: (entry: { fieldVcm: number }) => tipCellField(t, entry),
    targetVm: (entry: { targetVm: number; targetPreset: string; targetRatio: number }) => tipCellTargetVm(t, entry),
    healthyVm: (entry: { healthyVm: number; healthyRatio: number }) => tipCellHealthyVm(t, entry),
    selectivity: (entry: { selectivity: number; targetTemp: number; healthyTemp: number }) => tipCellSel(t, entry),
    depHealthy: (entry: { depHealthyK?: number }) => tipCellDepH(t, entry),
    depTarget: (entry: { depTargetK?: number }) => tipCellDepT(t, entry),
    targetRatio: (entry: { targetRatio?: number }) => t('log.tipCellTRatio', { ratio: ratioPctParam(entry.targetRatio) }),
    healthyRatio: (entry: { healthyRatio?: number }) => t('log.tipCellHRatio', { ratio: ratioPctParam(entry.healthyRatio) }),
    event: (entry: { event: string }) => entry.event === LOG_EVENT.LYSIS ? t('log.tipCellLysis') : t('log.tipCellManual'),
  }
}