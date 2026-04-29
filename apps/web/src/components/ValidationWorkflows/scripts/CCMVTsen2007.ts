// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Tsen 2007 (Biophys. J. 93:1340) CCMV f_res=7.7 GHz; at this f hepatocyte Vm≈0 so TI display caps at 99.9.

import { useCellStore } from '@/stores/cellStore'
import { useUiStore } from '@/stores/uiStore'

import { CELL_PRESETS } from '@/constants/cellLibrary'

import type { ScriptFactory } from '@/types/replay'

import { animateTo } from './replayUtils'

const HEPATOCYTE_PRESET = CELL_PRESETS.find(p => p.presetId === 'hepatocyte')!
const CCMV_PRESET       = CELL_PRESETS.find(p => p.presetId === 'ccmv')!

// CCMV capsid resonant frequency (Tsen 2007 ISRS laser measurement)
const CCMV_RESONANT_FREQ_GHZ = 7.7   // GHz
const CCMV_RESONANT_FREQ_KHZ = 7_700_000   // kHz = 7.7 GHz
const CCMV_CAPSID_Q          = 12    // nominal Q from linewidth (rigid icosahedral capsid)
const CCMV_FIELD_VCM         = 500   // V/cm — Tsen 2007 disruption threshold

// Animation durations — same convention as MCF7Breast.ts
const PARAM_ANIM_MS  = 1000  // sweep duration for each param
const PARAM_HOLD_MS  = 2400  // step hold = anim + reading time
const FREQ_ANIM_MS   = 2000  // frequency sweep — user should see chart respond
const FREQ_HOLD_MS   = 2800
const FIELD_ANIM_MS  = 2000
const FIELD_HOLD_MS  = 2800

export const createCCMVTsen2007Script: ScriptFactory = () => {
  const cellStore = useCellStore()
  const uiStore   = useUiStore()

  return {
    id:                 'ccmv-tsen2007',
    titleKey:           'validate.ccmv.title',
    authorsKey:         'validate.ccmv.authors',
    categoryKey:        'validate.ccmv.category',
    publishedResultKey: 'validate.ccmv.publishedResult',
    publishedMetricKey: 'validate.ccmv.publishedMetric',
    resultHighlightId:   'hl-ti-ratio',
    resultAgreementKey:  'validate.ccmv.resultAgreement',

    appResultGetter: () => {
      const tDR = cellStore.targetDisruptionRatio
      const hDR = cellStore.healthyDisruptionRatio
      const ti  = cellStore.therapeuticIndex
      const tiStr = ti >= 99 ? '>99' : ti.toFixed(1)
      const hDrStr = hDR < 0.001 ? '~0' : hDR.toFixed(4)
      return `CCMV DR ${tDR.toFixed(2)} (disrupting) | Hepatocyte DR ${hDrStr} (Vm collapsed at 7.7 GHz) | TI ${tiStr}`
    },

    steps: [
      // ── Step 0: Reset to safe baseline before loading cells ───────────────────
      {
        highlightId: 'hl-field-row',
        labelKey:    'validate.ccmv.step0',
        delayMs:     1200,
        action:      () => {
          cellStore.setFieldIntensity(1)
          cellStore.resetTemps()
        },
      },

      // ── Healthy reference: hepatocyte mammalian cell (R = 10 µm, fc ≈ 350 kHz) ─
      {
        highlightId: 'hl-healthy-card',
        labelKey:    'validate.ccmv.step1',
        delayMs:     1400,
        action:      () => {
          uiStore.expandCellParamsPanel('healthy')
          cellStore.loadPreset('healthy', {
            ...HEPATOCYTE_PRESET,
            radius: 5.0,
          })
        },
      },
      {
        highlightId: 'hl-healthy-radius',
        labelKey:    'validate.ccmv.step1r',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.healthy.radius,
          (v) => cellStore.updateCellParam('healthy', 'radius', v),
          HEPATOCYTE_PRESET.radius,
          PARAM_ANIM_MS,
        ),
      },

      // ── Target cell: load CCMV preset with placeholder params to animate from ─
      {
        highlightId: 'hl-target-card',
        labelKey:    'validate.ccmv.step2',
        delayMs:     1400,
        action:      () => {
          uiStore.expandCellParamsPanel('target')
          // Load CCMV with near-zero starting values — each key param animates in
          cellStore.loadPreset('target', {
            ...CCMV_PRESET,
            resonantFreqGHz: 0.5,
            capsidQ:         1,
          })
          // Keep pulsed (dc=1e-6, Tsen 2007 ~100 fs ISRS): CW at 7.7 GHz would vaporise hepatocyte via water Debye loss.
        },
      },

      // ── Animate f_res from 0.5 → 7.7 GHz (ISRS laser measurement, Tsen 2007) ─
      {
        highlightId: 'hl-target-resonantFreqGHz',
        labelKey:    'validate.ccmv.step2f',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => (cellStore.target as { resonantFreqGHz?: number }).resonantFreqGHz ?? 0.5,
          (v) => cellStore.updateCellParam('target', 'resonantFreqGHz', v),
          CCMV_RESONANT_FREQ_GHZ,
          PARAM_ANIM_MS,
        ),
      },

      // ── Animate Q from 1 → 12 (rigid icosahedral capsid, Tsen 2007) ─────────
      {
        highlightId: 'hl-target-capsidQ',
        labelKey:    'validate.ccmv.step2q',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => (cellStore.target as { capsidQ?: number }).capsidQ ?? 1,
          (v) => cellStore.updateCellParam('target', 'capsidQ', v),
          CCMV_CAPSID_Q,
          PARAM_ANIM_MS,
        ),
      },

      // ── Switch to resonance chart mode ────────────────────────────────────────
      {
        highlightId: 'hl-freq-chart',
        labelKey:    'validate.ccmv.step3',
        delayMs:     1000,
        action:      () => cellStore.setChartMode('resonance'),
      },

      // ── Animate frequency from default → 7.7 GHz ─────────────────────────────
      {
        highlightId: 'hl-freq-row',
        labelKey:    'validate.ccmv.step4',
        delayMs:     FREQ_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.currentBroadcastFrequency,
          (v) => cellStore.setBroadcastFreqKHz(v),
          CCMV_RESONANT_FREQ_KHZ,
          FREQ_ANIM_MS,
        ),
      },

      // ── Animate field from 1 → 500 V/cm (Tsen 2007 threshold) ────────────────
      {
        highlightId: 'hl-field-row',
        labelKey:    'validate.ccmv.step5',
        delayMs:     FIELD_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.fieldIntensity,
          (v) => cellStore.setFieldIntensity(v),
          CCMV_FIELD_VCM,
          FIELD_ANIM_MS,
        ),
      },

      // ── Result: CCMV disrupting (DR > 1), hepatocyte unaffected (DR ≈ 0) ─────
      {
        highlightId: 'hl-ti-ratio',
        labelKey:    'validate.ccmv.step6',
        delayMs:     1400,
        action:      () => {},
      },
    ],
  }
}
