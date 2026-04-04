// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { HMAP_ZONE } from '@/constants/heatmap'

import { buildHeatmapHoverPresentation } from '../lib/heatmapHoverModel'

describe('heatmapHoverModel helpers', () => {
  it('builds consistent hover readout and tooltip content', () => {
    const outcome = { text: 'OK target selective', level: 'ok' as const }

    const result = buildHeatmapHoverPresentation({
      freqKHz: 1250,
      fieldVcm: 1400,
      zone: HMAP_ZONE.THERAPEUTIC,
      zoneLabel: 'Therapeutic',
      tDr: 1.234,
      hDr: 0.045,
      tempC: 41.2,
      pLysis: '73%',
      outcomes: [outcome],
    })

    expect(result.info).toEqual({
      freqLabel: '1.25 MHz',
      fieldLabel: '1.4 kV/cm',
      zoneLabel: 'Therapeutic',
      zoneColor: 'var(--color-lime)',
      tDr: '123.4%',
      hDr: '4.5%',
      temp: '41.2 °C',
      pLysis: '73%',
      outcomes: [outcome],
    })

    expect(result.tooltipHtml).toContain('1.25 MHz')
    expect(result.tooltipHtml).toContain('1.4 kV/cm')
    expect(result.tooltipHtml).toContain('Therapeutic')
    expect(result.tooltipHtml).toContain('123.4%')
    expect(result.tooltipHtml).toContain('41.2 °C')
    expect(result.tooltipHtml).toContain('tip-ok')
    expect(result.tooltipHtml).toContain('OK target selective')
  })

  it('caps displayed disruption percentages in hover output', () => {
    const result = buildHeatmapHoverPresentation({
      freqKHz: 50,
      fieldVcm: 500,
      zone: HMAP_ZONE.ABLATIVE,
      zoneLabel: 'Ablative',
      tDr: 99,
      hDr: 5,
      tempC: 90,
      pLysis: '100%',
      outcomes: [],
    })

    expect(result.info.tDr).toBe('999.0%')
    expect(result.info.hDr).toBe('500.0%')
    expect(result.tooltipHtml).toContain('tip-warn')
  })
})