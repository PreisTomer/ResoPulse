// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Sample CSV mirroring the parseMeasuredCsv-accepted headers, downloaded by ReportsView so first-time users see the schema before exporting from their plate reader.

import { UNIT } from '@/constants/units'

export const SAMPLE_MEASURED_CSV_FILENAME = 'resopulse-measured-outcomes-sample.csv'

export function buildSampleMeasuredCsv(): string {
  const lines = [
    `# ResoPulse measured-outcomes sample`,
    `# Required: # (or "id"/"entry") to match each row to one log entry`,
    `# All other columns optional; populate the ones your assay produced`,
    `# Multiple header variants are accepted (see parseMeasuredCsv)`,
    [
      '#',
      `T-Lysis measured (%)`,
      `H-Lysis measured (%)`,
      `Viability measured (%)`,
      `Permeabilized measured (%)`,
      `Transfection measured (%)`,
      `Viability assay`,
      `Assay timepoint (h)`,
      `Temp measured (${UNIT.DEG_C})`,
      `Actual field measured (${UNIT.V_PER_CM})`,
      `Lysis delay measured (ms)`,
      `qPCR transcript`,
      `qPCR fold-change`,
      `Measured at`,
      `Measured notes`,
    ].join(','),
    [
      '1',
      '62.3',  '14.8',  '78.5',  '70.1',  '38.4',
      'flowPi',  '6',
      '37.2',  '1180',
      '180',
      'GFP',  '1.45',
      '2026-04-25T10:30:00Z',
      'replicate A — kept on ice between pulses',
    ].join(','),
    [
      '2',
      '71.0',  '12.5',  '73.0',  '76.4',  '42.1',
      'flowPi',  '6',
      '37.5',  '1240',
      '160',
      'GFP',  '1.62',
      '2026-04-25T10:45:00Z',
      'replicate B',
    ].join(','),
  ]
  return `${lines.join('\n')}\n`
}

export function downloadSampleMeasuredCsv(): void {
  const blob = new Blob([buildSampleMeasuredCsv()], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = SAMPLE_MEASURED_CSV_FILENAME
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
