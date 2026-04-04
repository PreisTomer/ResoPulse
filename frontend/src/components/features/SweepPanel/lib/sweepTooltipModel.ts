// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { tipKpDrH, tipKpDrT, tipKpLabel, tipKpTI, tipKpTemp, tipNoWindow, tipThTemp, tipThThreshold, tipThTI, tipWindow } from '@/tooltips/sweepTooltips'

import { UNIT } from '@/constants/units'

type SweepParam = 'field' | 'freq'

type KeyPointTooltipEntry = {
  label: string
  drH: number
  drT: number
  ti: number
  tT: number
}

type SweepWindowRange = {
  lo: number
  hi: number
}

export function createSweepKeyPointTooltips(sweepParam: SweepParam) {
  return {
    thresholdHeader: tipThThreshold(sweepParam === 'field'),
    tiHeader: tipThTI(),
    tempHeader: tipThTemp(),
    label: (entry: KeyPointTooltipEntry) => tipKpLabel(entry.label),
    drTarget: (entry: KeyPointTooltipEntry) => tipKpDrT(entry.drT),
    drHealthy: (entry: KeyPointTooltipEntry) => tipKpDrH(entry.drH),
    ti: (entry: KeyPointTooltipEntry) => tipKpTI(entry.ti),
    temp: (entry: KeyPointTooltipEntry) => tipKpTemp(entry.tT),
  }
}

export function buildSweepWindowTooltip(windowRange: SweepWindowRange | null, sweepParam: SweepParam): string {
  if (!windowRange) return ''

  return tipWindow({
    loStr: windowRange.lo.toFixed(0),
    hiStr: windowRange.hi.toFixed(0),
    center: ((windowRange.lo + windowRange.hi) / 2).toFixed(0),
    unit: sweepParam === 'field' ? UNIT.V_PER_CM : UNIT.KHZ,
  })
}

export function buildNoSweepWindowTooltip(sweepParam: SweepParam): string {
  return tipNoWindow(sweepParam === 'field')
}