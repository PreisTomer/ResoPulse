// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Anand 2019 (RSC Adv., 10.1039/C9RA07428G) MCF-7 vs MCF-10A; 620 V/cm, 10 kHz pulsed IRE, θ=0°, TI=1.13.

import { useCellStore } from '@/stores/cellStore'
import { useUiStore } from '@/stores/uiStore'

import { CELL_PRESETS } from '@/constants/cellLibrary'

import type { ScriptFactory } from '@/types/replay'

import { animateTo } from './replayUtils'

const MCF10A_PRESET     = CELL_PRESETS.find(p => p.presetId === 'mcf10a')!
const MCF7_ANAND_PRESET = CELL_PRESETS.find(p => p.presetId === 'mcf7-anand2019')!

// Anand 2019 published parameter values
const MCF10A_R   = 10.0
const MCF10A_SIG = 0.30
const MCF10A_VTH = 1.0
const MCF7_R     = 8.15
const MCF7_SIG   = 0.23
const MCF7_VTH   = 0.72

// Anand 2019 protocol conditions
const VALIDATION_FIELD_VCM = 620   // V/cm — midpoint of 589–667 V/cm selectivity window
const VALIDATION_FREQ_KHZ  = 10    // kHz  — 10 kHz pulsed IRE (Anand 2019)
const VALIDATION_ORIENT    = 0     // deg  — θ=0° pole-on: E_lys = Vth/(1.5R)

// PARAM_HOLD_MS > PARAM_ANIM_MS to absorb 40-tick setTimeout drift and allow user reading time.
const PARAM_ANIM_MS  = 1000  // time for each cell param value to sweep to its target
const PARAM_HOLD_MS  = 2400  // hold = anim + 1400 ms reading time (safe margin for drift)
const FIELD_ANIM_MS  = 2000  // field sweep — long enough to see MCF-7 cross threshold
const FIELD_HOLD_MS  = 2800  // total step time for field step

export const createMCF7BreastScript: ScriptFactory = () => {
  const cellStore = useCellStore()
  const uiStore   = useUiStore()

  return {
    id:                 'mcf7-breast-anand2019',
    titleKey:           'validate.mcf7.title',
    authorsKey:         'validate.mcf7.authors',
    categoryKey:        'validate.mcf7.category',
    publishedResultKey: 'validate.mcf7.publishedResult',
    publishedMetricKey: 'validate.mcf7.publishedMetric',
    resultHighlightId:   'hl-selectivity-panel',
    resultAgreementKey:  'validate.mcf7.resultAgreement',

    appResultGetter: () => {
      const tLysis = cellStore.targetLysisField
      const hLysis = cellStore.healthyLysisField
      const ti     = cellStore.therapeuticIndex
      const sel    = hLysis - tLysis
      const tiStr  = ti >= 99 ? '>99' : ti.toFixed(2)
      return `E_lys MCF-7 ${tLysis.toFixed(0)} V/cm | MCF-10A ${hLysis.toFixed(0)} V/cm | window ${sel > 0 ? '+' : ''}${sel.toFixed(0)} V/cm | TI ${tiStr}`
    },

    steps: [
      // ── Step 0: Reset to safe baseline ───────────────────────────────────────
      {
        highlightId: 'hl-field-row',
        labelKey:    'validate.mcf7.step0',
        delayMs:     1200,
        action:      () => {
          // Force Schwan/EP mode before loading any cells — ensures a clean EP lab
          // state even if the previous scenario was a resonance-mode virus workflow.
          cellStore.setChartMode('schwan')
          cellStore.setFieldIntensity(1)
          cellStore.setOrientationDeg(0)
          cellStore.resetTemps()
        },
      },

      // Step 1: load MCF-10A at placeholder values so each param animates to its Anand 2019 target.
      {
        highlightId: 'hl-healthy-card',
        labelKey:    'validate.mcf7.step1',
        delayMs:     1400,
        action:      () => {
          uiStore.expandCellParamsPanel('healthy')
          // Load with placeholder starting values so each param has somewhere to animate from
          cellStore.loadPreset('healthy', {
            ...MCF10A_PRESET,
            radius:           5.0,
            conductivity:     0.10,
            thresholdVoltage: 0.50,
          })
        },
      },
      {
        highlightId: 'hl-healthy-radius',
        labelKey:    'validate.mcf7.step1r',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.healthy.radius,
          (v) => cellStore.updateCellParam('healthy', 'radius', v),
          MCF10A_R,
          PARAM_ANIM_MS,
        ),
      },
      {
        highlightId: 'hl-healthy-conductivity',
        labelKey:    'validate.mcf7.step1s',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.healthy.conductivity,
          (v) => cellStore.updateCellParam('healthy', 'conductivity', v),
          MCF10A_SIG,
          PARAM_ANIM_MS,
        ),
      },
      {
        highlightId: 'hl-healthy-thresholdVoltage',
        labelKey:    'validate.mcf7.step1v',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.healthy.thresholdVoltage,
          (v) => cellStore.updateCellParam('healthy', 'thresholdVoltage', v),
          MCF10A_VTH,
          PARAM_ANIM_MS,
        ),
      },

      // Step 2: load MCF-7 at MCF-10A values so params diverge on-screen. setTimeout(0) restores θ=0° after applyTargetDefaults sets 60°.
      {
        highlightId: 'hl-target-card',
        labelKey:    'validate.mcf7.step2',
        delayMs:     1400,
        action:      () => {
          uiStore.expandCellParamsPanel('target')
          // Start at MCF-10A values so the user sees the cancer cell differ from reference
          cellStore.loadPreset('target', {
            ...MCF7_ANAND_PRESET,
            radius:           MCF10A_R,
            conductivity:     MCF10A_SIG,
            thresholdVoltage: MCF10A_VTH,
          })
          setTimeout(() => cellStore.setOrientationDeg(VALIDATION_ORIENT), 0)
        },
      },
      {
        highlightId: 'hl-target-radius',
        labelKey:    'validate.mcf7.step2r',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.target.radius,
          (v) => cellStore.updateCellParam('target', 'radius', v),
          MCF7_R,
          PARAM_ANIM_MS,
        ),
      },
      {
        highlightId: 'hl-target-conductivity',
        labelKey:    'validate.mcf7.step2s',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.target.conductivity,
          (v) => cellStore.updateCellParam('target', 'conductivity', v),
          MCF7_SIG,
          PARAM_ANIM_MS,
        ),
      },
      {
        highlightId: 'hl-target-thresholdVoltage',
        labelKey:    'validate.mcf7.step2v',
        delayMs:     PARAM_HOLD_MS,
        action:      () => animateTo(
          () => cellStore.target.thresholdVoltage,
          (v) => cellStore.updateCellParam('target', 'thresholdVoltage', v),
          MCF7_VTH,
          PARAM_ANIM_MS,
        ),
      },

      // ── Step 3: Set medium to EP buffer (σ_e = 0.14 S/m) ────────────────────
      {
        highlightId: 'hl-medium-row',
        labelKey:    'validate.mcf7.step3',
        delayMs:     1200,
        action:      () => {
          uiStore.openProtocolSection()
          cellStore.setMedium('epbuffer')
        },
      },
      // Step 4: pin N=1 so electrosensitization (N^-0.20) doesn't drop E_lys ~37% below Anand's 589/667 V/cm.
      {
        highlightId: 'hl-waveform-row',
        labelKey:    'validate.mcf7.step4',
        delayMs:     1400,
        action:      () => {
          cellStore.setWaveform('pulsed')
          cellStore.setLysisNPulses(1)
        },
      },
      // ── Step 5: Sweep frequency down to 10 kHz ───────────────────────────────
      {
        highlightId: 'hl-freq-row',
        labelKey:    'validate.mcf7.step5',
        delayMs:     2400,
        action:      () => animateTo(
          () => cellStore.currentBroadcastFrequency,
          (v) => cellStore.setBroadcastFreqKHz(v),
          VALIDATION_FREQ_KHZ,
          1800,
        ),
      },
      // Step 6: reset field to 1, then sweep to 620 V/cm so the sweep always starts from the bottom.
      {
        highlightId: 'hl-field-row',
        labelKey:    'validate.mcf7.step6',
        delayMs:     FIELD_HOLD_MS,
        action:      () => {
          cellStore.setFieldIntensity(1)
          setTimeout(() => animateTo(
            () => cellStore.fieldIntensity,
            (v) => cellStore.setFieldIntensity(v),
            VALIDATION_FIELD_VCM,
            FIELD_ANIM_MS,
          ), 100)
        },
      },
      // ── Step 7: Show selectivity panel — TI confirms window ──────────────────
      {
        highlightId: 'hl-ti-ratio',
        labelKey:    'validate.mcf7.step7',
        delayMs:     1400,
        action:      () => cellStore.setChartMode('schwan'),
      },
    ],
  }
}
