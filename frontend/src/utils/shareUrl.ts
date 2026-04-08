// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { useCellStore } from '@/stores/cellStore'
import type { StatePacket } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'

import { ROUTE } from '@/constants/routes'

const SHARE_PARAM = 's'

/**
 * Serialises the current experiment state into a single base64 URL param.
 * Mirrors the field set used by broadcastStateSync() so handleStatePacket() can
 * decode it on the receiving end without any additional logic.
 * @returns Full absolute URL for the experiment with the encoded state param.
 */
export function buildShareUrl(): string {
  const store    = useCellStore()
  const expStore = useExperimentStore()
  const packet: StatePacket = {
    freqKHz:             store.currentBroadcastFrequency,
    fieldVcm:            store.fieldIntensity,
    medium:              store.medium,
    dutyCycle:           store.dutyCycle,
    pulseWidthNs:        store.pulseWidthNs,
    waveform:            store.waveform,
    orientationDeg:      store.orientationDeg,
    lysisNPulses:        store.lysisNPulses,
    chartMode:           store.chartMode,
    doubleShellEnabled:  store.doubleShellEnabled,
    perfusionRate:       store.perfusionRate,
    cellPackingFraction: store.cellPackingFraction,
    targetPresetId:      store.target.id,
    healthyPresetId:     store.healthy.id,
    sessionName:         expStore.sessionName,
  }
  // encodeURIComponent converts non-ASCII (emoji, accented chars) to percent-encoded
  // ASCII before btoa, preventing the btoa "not latin1" exception on unusual session names.
  const encoded = btoa(encodeURIComponent(JSON.stringify(packet)))
  const url     = new URL(ROUTE.EXPERIMENT, window.location.origin)
  url.searchParams.set(SHARE_PARAM, encoded)
  return url.toString()
}

/**
 * Reads the ?s= param from a URL search string, decodes it, and returns the
 * StatePacket. Returns null if the param is absent or the payload is malformed.
 */
export function parseShareParam(search: string): StatePacket | null {
  const param = new URLSearchParams(search).get(SHARE_PARAM)
  if (!param) return null
  try {
    return JSON.parse(decodeURIComponent(atob(param))) as StatePacket
  } catch {
    return null
  }
}
