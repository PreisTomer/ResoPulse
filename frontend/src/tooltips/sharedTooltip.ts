// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { formatFreqKHz } from '@/utils/format'

import { THRESHOLDS } from '@/constants/physics'

export type ThermalWarningLevel = 'vaporizing' | 'denaturing' | 'hyperthermic'
export type DisruptionWarningState = 'crossed' | 'armed' | 'none'

export function formatTooltipFrequency(khz: number, decimals = 2): string {
  return formatFreqKHz(khz, decimals)
}

export function resolveThermalWarningLevel(flags: {
  tempVaporizing?: boolean
  tempDenaturing?: boolean
  tempWarning?: boolean
}): ThermalWarningLevel | null {
  if (flags.tempVaporizing) return 'vaporizing'
  if (flags.tempDenaturing) return 'denaturing'
  if (flags.tempWarning) return 'hyperthermic'
  return null
}

export function buildThermalWarningLine(
  level: ThermalWarningLevel | null,
  messages: Record<ThermalWarningLevel, string>,
): string {
  return level ? `\n<span class="tip-warn">${messages[level]}</span>` : ''
}

export function getSelectivityCssClass(ti: number): string {
  if (ti >= THRESHOLDS.TI_STRONG) return 'tip-ok'
  if (ti >= THRESHOLDS.TI_MARGINAL) return 'tip-val'
  return 'tip-warn'
}

export function getDisruptionWarningState(ratio: number): DisruptionWarningState {
  if (ratio >= 1.0) return 'crossed'
  if (ratio >= THRESHOLDS.DISRUPTION_WARN) return 'armed'
  return 'none'
}

export function formatVmThresholdLine(vmText: string, thresholdText: string, suffix = ''): string {
  return `Vm = <span class="tip-val">${vmText}</span>  ·  Threshold = ${thresholdText}${suffix}`
}