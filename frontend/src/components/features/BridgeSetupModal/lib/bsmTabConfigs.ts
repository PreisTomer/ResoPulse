// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { CMD } from './bsmCommands'

export type BsmTabKey = 'quick' | 'btx' | 'visa' | 'serial'

interface BsmStepConfig {
  number: number
  labelKey: string
  noteKey: string
  commands?: string[]
  highlight?: boolean
}

interface BsmWarnConfig {
  titleKey: string
  bodyKey: string
}

export interface BsmPaneConfig {
  key: BsmTabKey
  steps: BsmStepConfig[]
  warn?: BsmWarnConfig
}

export const BSM_TAB_PANES: Record<BsmTabKey, BsmPaneConfig> = {
  quick: {
    key: 'quick',
    steps: [
      { number: 1, labelKey: 's1Label', noteKey: 's1Note', commands: [CMD.CHECK_PYTHON] },
      { number: 2, labelKey: 's2Label', noteKey: 's2Note', commands: [CMD.INSTALL_CORE] },
      { number: 3, labelKey: 's3Label', noteKey: 's3Note', commands: [CMD.SMOKE_TEST] },
      { number: 4, labelKey: 's4Label', noteKey: 's4Note', commands: [CMD.START_BACKEND] },
      { number: 5, labelKey: 's5Label', noteKey: 's5Note', commands: [CMD.RUN_DEMO] },
      { number: 6, labelKey: 's6Label', noteKey: 's6Note', highlight: true },
    ],
  },
  btx: {
    key: 'btx',
    steps: [
      { number: 1, labelKey: 's1Label', noteKey: 's1Note', commands: [CMD.PROBE] },
      { number: 2, labelKey: 's2Label', noteKey: 's2Note', commands: [CMD.INSTALL_SERIAL] },
      { number: 3, labelKey: 's3Label', noteKey: 's3Note', commands: [CMD.RUN_BTX] },
    ],
    warn: { titleKey: 'warnTitle', bodyKey: 'warn' },
  },
  visa: {
    key: 'visa',
    steps: [
      { number: 1, labelKey: 's1Label', noteKey: 's1Note' },
      { number: 2, labelKey: 's2Label', noteKey: 's2Note', commands: [CMD.INSTALL_VISA, CMD.PROBE] },
      { number: 3, labelKey: 's3Label', noteKey: 's3Note', commands: [CMD.RUN_VISA] },
    ],
  },
  serial: {
    key: 'serial',
    steps: [
      { number: 1, labelKey: 's1Label', noteKey: 's1Note' },
      { number: 2, labelKey: 's2Label', noteKey: 's2Note', commands: [CMD.PROBE] },
      { number: 3, labelKey: 's3Label', noteKey: 's3Note', commands: [CMD.INSTALL_SERIAL] },
      { number: 4, labelKey: 's4Label', noteKey: 's4Note', commands: [CMD.RUN_SERIAL] },
    ],
  },
}