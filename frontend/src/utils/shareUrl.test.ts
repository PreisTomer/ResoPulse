// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { buildShareUrl, parseShareParam } from './shareUrl'
import { useCellStore }       from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'

// ── parseShareParam — pure function, no store dependency ─────────────────────

describe('parseShareParam', () => {
  it('returns null when the param is absent', () => {
    expect(parseShareParam('')).toBeNull()
    expect(parseShareParam('?foo=bar')).toBeNull()
  })

  it('returns null for corrupt base64', () => {
    expect(parseShareParam('?s=!!!not-base64!!!')).toBeNull()
  })

  it('returns null for valid base64 that decodes to non-JSON', () => {
    const garbage = btoa(encodeURIComponent('this is not json'))
    expect(parseShareParam(`?s=${garbage}`)).toBeNull()
  })

  it('decodes a correctly encoded StatePacket', () => {
    const packet = {
      freqKHz: 1000, fieldVcm: 200, medium: 'saline',
      dutyCycle: 0.5, pulseWidthNs: 100, waveform: 'cw',
      orientationDeg: 0, lysisNPulses: 1, chartMode: 'schwan',
      doubleShellEnabled: false, perfusionRate: 0, cellPackingFraction: 0.1,
      targetPresetId: 'hela', healthyPresetId: 'normal', sessionName: 'Lab 1',
    }
    const encoded = btoa(encodeURIComponent(JSON.stringify(packet)))
    const result  = parseShareParam(`?s=${encoded}`)
    expect(result).toMatchObject(packet)
  })

  it('handles session names with special characters (emoji, accents)', () => {
    const packet = {
      freqKHz: 500, fieldVcm: 100, medium: 'pbs',
      dutyCycle: 1, pulseWidthNs: 100, waveform: 'cw',
      orientationDeg: 0, lysisNPulses: 1, chartMode: 'schwan',
      doubleShellEnabled: false, perfusionRate: 0, cellPackingFraction: 0,
      targetPresetId: 't1', healthyPresetId: 'h1',
      sessionName: 'Expérience 🧫 #1',
    }
    const encoded = btoa(encodeURIComponent(JSON.stringify(packet)))
    const result  = parseShareParam(`?s=${encoded}`)
    expect(result?.sessionName).toBe('Expérience 🧫 #1')
  })
})

// ── buildShareUrl + roundtrip ─────────────────────────────────────────────────

describe('buildShareUrl', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns a URL string containing the ?s= param', () => {
    const url = buildShareUrl()
    expect(url).toContain('?s=')
    expect(url).toContain('http')
  })

  it('encodes then decodes back to the same state (roundtrip)', () => {
    const cell = useCellStore()
    const exp  = useExperimentStore()

    cell.setBroadcastFreqKHz(1_500)
    cell.setFieldIntensity(300)
    exp.setSessionName('My Session')

    const url      = buildShareUrl()
    const search   = '?' + url.split('?')[1]!
    const decoded  = parseShareParam(search)

    expect(decoded?.freqKHz).toBe(cell.currentBroadcastFrequency)
    expect(decoded?.fieldVcm).toBe(cell.fieldIntensity)
    expect(decoded?.sessionName).toBe('My Session')
  })

  it('roundtrip survives special characters in session name', () => {
    const exp = useExperimentStore()
    exp.setSessionName('Lab 🧬 / étude')

    const url    = buildShareUrl()
    const search = '?' + url.split('?')[1]!
    const result = parseShareParam(search)

    expect(result?.sessionName).toBe('Lab 🧬 / étude')
  })
})
