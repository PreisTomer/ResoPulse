// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
// @vitest-environment jsdom

// cellStore integration: resonance/Schwan path isolation, waveforms×media, packing+medium, temp→DR, TI limits, population lysis.

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER, BODY_TEMP_C, LYSIS_FIELD_SENTINEL } from '@/constants/physics'
import { CELL_CATEGORY, WAVEFORM, CHART_MODE } from '@/constants/strings'
import { CELL_PRESETS } from '@/constants/cellLibrary'

import { useCellStore } from '@/stores/cellStore'

function freshStore() {
  setActivePinia(createPinia())
  return useCellStore()
}

// ── Resonance mode path isolation ─────────────────────────────────────────────

describe('resonance mode path isolation', () => {
  it('healthy cell always uses Schwan DR in resonance mode (no resonance params on healthy)', () => {
    const store = freshStore()
    // Load E. coli as target (has resonance params), keep healthy as hepatocyte (mammalian)
    const ecoli = CELL_PRESETS.find(p => p.presetId === 'ecoli')!
    store.loadPreset('target', ecoli)
    store.setChartMode(CHART_MODE.RESONANCE)

    // Healthy cell (hepatocyte) has no resonantFreqGHz → uses Schwan model
    // At typical EP field, healthy DR is very small (mammalian cell at GHz is rolled off)
    store.setFieldIntensity(500)
    store.setBroadcastFreqKHz(500_000)  // 500 MHz — well above mammalian fc
    const drH = store.healthyDisruptionRatio
    expect(drH).toBeGreaterThanOrEqual(0)
    expect(isFinite(drH)).toBe(true)
  })

  it('resonance-mode bacteria target reports zero nuclear DR (no nucleus → numerically gated)', () => {
    // Nuclear influence is numerically gated (zero for bacteria/viruses without nuclearRadius), not flag-gated on mode switch.
    const store = freshStore()
    const ecoli = CELL_PRESETS.find(p => p.presetId === 'ecoli')!
    store.loadPreset('target', ecoli)
    store.setChartMode(CHART_MODE.RESONANCE)

    expect(store.target.nuclearRadius).toBeFalsy()
    expect(store.targetNuclearVm).toBe(0)
    expect(store.targetNuclearDisruptionRatio).toBe(0)
  })

  it('H-FIRE multiplier does NOT apply to acoustic resonance DR', () => {
    const store = freshStore()
    const ecoli = CELL_PRESETS.find(p => p.presetId === 'ecoli')!
    store.loadPreset('target', ecoli)
    store.setChartMode(CHART_MODE.RESONANCE)
    store.setBroadcastFreqKHz(500_000)  // near E. coli resonance
    store.setFieldIntensity(2000)

    store.setWaveform(WAVEFORM.CW)
    const drCW = store.targetDisruptionRatio

    store.setWaveform(WAVEFORM.H_FIRE)
    const drHfire = store.targetDisruptionRatio

    // Acoustic resonance is mechanical — H-FIRE multiplier does NOT apply. DR should be equal.
    expect(drHfire).toBeCloseTo(drCW, 6)
  })

  it('target cell category BACTERIA uses resonance slider range', () => {
    const store = freshStore()
    const mrsa = CELL_PRESETS.find(p => p.presetId === 'mrsa')!
    store.loadPreset('target', mrsa)
    store.setChartMode(CHART_MODE.RESONANCE)

    expect(store.targetCellCategory).toBe(CELL_CATEGORY.BACTERIA)
    expect(store.sliderRanges.freqMax).toBeGreaterThan(store.sliderRanges.freqMin)
  })

  it('target cell category VIRUS uses resonance slider range with high freqMax', () => {
    const store = freshStore()
    const flu = CELL_PRESETS.find(p => p.presetId === 'influenza')!
    store.loadPreset('target', flu)
    store.setChartMode(CHART_MODE.RESONANCE)

    expect(store.targetCellCategory).toBe(CELL_CATEGORY.VIRUS)
    // Virus resonance freqMax should be very high (GHz range)
    expect(store.sliderRanges.freqMax).toBeGreaterThanOrEqual(1_000_000)  // ≥ 1 GHz
  })
})

// ── All 3 waveforms × key properties ──────────────────────────────────────────

describe('waveform × DR consistency', () => {
  it('CW: effective duty cycle = 1.0, DR uses full Vm', () => {
    const store = freshStore()
    store.setLysisNPulses(1)  // pin N=1 so electrosensitization factor = 1 (test is about waveform, not N)
    store.setWaveform(WAVEFORM.CW)
    expect(store.effectiveDutyCycle).toBe(1.0)
    // PEF = 1 for CW, N=1 → DR = Vm / Vth (no pulse envelope or electrosensitization correction)
    const expectedDR = store.healthyVm / store.healthy.thresholdVoltage
    expect(store.healthyDisruptionRatio).toBeCloseTo(expectedDR, 6)
  })

  it('Pulsed very short pulse: DR << CW, approaches 0 at t_p → 0', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const drCW = storeCW.targetDisruptionRatio

    const storeShort = freshStore()
    storeShort.setWaveform(WAVEFORM.PULSED)
    storeShort.setPulseWidthNs(1)  // 1 ns << τ (~500 ns)
    expect(storeShort.targetDisruptionRatio).toBeLessThan(drCW * 0.1)
  })

  it('H-FIRE: DR is exactly CW/H_FIRE_THRESHOLD_MULTIPLIER (long pulse, no PEF effect)', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const drCW = storeCW.targetDisruptionRatio

    const storeHfire = freshStore()
    storeHfire.setWaveform(WAVEFORM.H_FIRE)
    storeHfire.setLysisNPulses(1)  // pin N=1 so electrosensitization factor = 1 (test is about waveform, not N)
    storeHfire.setPulseWidthNs(100_000)  // long pulse → PEF ≈ 1
    const drHfire = storeHfire.targetDisruptionRatio

    expect(drCW / drHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 1)
  })

  it('Pulsed long pulse: DR converges to CW DR (PEF → 1)', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const drCW = storeCW.targetDisruptionRatio

    const storePulsed = freshStore()
    storePulsed.setWaveform(WAVEFORM.PULSED)
    storePulsed.setLysisNPulses(1)  // pin N=1 so electrosensitization factor = 1 (test is about PEF, not N)
    storePulsed.setPulseWidthNs(100_000)  // 100 µs >> τ ≈ 500 ns
    expect(storePulsed.targetDisruptionRatio).toBeCloseTo(drCW, 1)
  })

  it('SAR is 2× higher for pulsed than CW at same peak field (wf: 1.0 vs 0.5)', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const sarCW = storeCW.healthySAR

    const storePulsed = freshStore()
    storePulsed.setWaveform(WAVEFORM.PULSED)
    const sarPulsed = storePulsed.healthySAR

    expect(sarPulsed).toBeCloseTo(sarCW * 2, 5)
  })
})

// ── Medium switching × DR and τ ───────────────────────────────────────────────

describe('medium switching × DR', () => {
  it('DR at 1 MHz is higher in saline than EP buffer (saline fc much higher → less rolloff)', () => {
    const storeSaline = freshStore()
    storeSaline.setMedium('saline')
    storeSaline.setBroadcastFreqKHz(1_000)
    const drSaline = storeSaline.targetDisruptionRatio

    const storeEP = freshStore()
    storeEP.setMedium('epbuffer')
    storeEP.setBroadcastFreqKHz(1_000)
    const drEP = storeEP.targetDisruptionRatio

    expect(drSaline).toBeGreaterThan(drEP)
  })

  it('quasi-DC DR is medium-independent (Vm_DC does not depend on σ_e)', () => {
    const storeSaline = freshStore()
    storeSaline.setMedium('saline')
    storeSaline.setBroadcastFreqKHz(0.001)
    const drSaline = storeSaline.targetDisruptionRatio

    const storeEP = freshStore()
    storeEP.setMedium('epbuffer')
    storeEP.setBroadcastFreqKHz(0.001)
    const drEP = storeEP.targetDisruptionRatio

    expect(drSaline).toBeCloseTo(drEP, 2)
  })

  it('corner frequency fc is higher in saline than EP buffer', () => {
    const storeSaline = freshStore()
    storeSaline.setMedium('saline')
    const fcSaline = storeSaline.targetFc

    const storeEP = freshStore()
    storeEP.setMedium('epbuffer')
    const fcEP = storeEP.targetFc

    expect(fcSaline).toBeGreaterThan(fcEP)
  })

  it('all 12 built-in media produce positive finite DR', () => {
    const media = ['saline', 'blood', 'tissue', 'water', 'dmem', 'pbs', 'rpmi', 'mhb', 'epbuffer', 'sfm', 'cdavian', 'hds']
    for (const medium of media) {
      const store = freshStore()
      store.setMedium(medium as Parameters<typeof store.setMedium>[0])
      const dr = store.targetDisruptionRatio
      expect(isFinite(dr)).toBe(true)
      expect(dr).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── Cell packing fraction ──────────────────────────────────────────────────────

describe('cell packing fraction effect', () => {
  it('effectiveSigmaE decreases as packing fraction increases', () => {
    const storeA = freshStore()
    storeA.setCellPackingFraction(0)
    const sigmaA = storeA.effectiveSigmaE

    const storeB = freshStore()
    storeB.setCellPackingFraction(0.3)
    const sigmaB = storeB.effectiveSigmaE

    expect(sigmaB).toBeLessThan(sigmaA)
  })

  it('at φ=0, effectiveSigmaE equals the raw medium conductivity', () => {
    const store = freshStore()
    store.setCellPackingFraction(0)
    // At 37°C (default), temperature correction = 0 → σ_eff = σ_medium
    expect(store.effectiveSigmaE).toBeCloseTo(store.sigma_e, 6)
  })

  it('packing reduces DR at 1 MHz (lower σ_eff → longer τ → more rolloff at fixed freq)', () => {
    const storeDilute = freshStore()
    storeDilute.setCellPackingFraction(0)
    storeDilute.setBroadcastFreqKHz(1_000)
    const drDilute = storeDilute.targetDisruptionRatio

    const storeDense = freshStore()
    storeDense.setCellPackingFraction(0.3)
    storeDense.setBroadcastFreqKHz(1_000)
    const drDense = storeDense.targetDisruptionRatio

    // Higher packing → lower σ_eff → lower fc → more rolloff at 1 MHz → lower DR
    expect(drDense).toBeLessThan(drDilute)
  })
})

// ── Temperature correction flowing into DR ────────────────────────────────────

describe('temperature correction in DR', () => {
  it('DR increases as cell temperature rises (lower Vth_eff → higher DR)', () => {
    const storeA = freshStore()
    const drAt37 = storeA.targetDisruptionRatio

    // Manually raise targetTemp
    storeA.$patch({ targetTemp: 50 })
    const drAt50 = storeA.targetDisruptionRatio

    expect(drAt50).toBeGreaterThan(drAt37)
  })

  it('lysis field decreases as temperature rises (easier to lyse hot cells)', () => {
    const store = freshStore()
    store.setWaveform(WAVEFORM.CW)
    const elfAt37 = store.targetLysisField

    store.$patch({ targetTemp: 55 })
    const elfAt55 = store.targetLysisField

    expect(elfAt55).toBeLessThan(elfAt37)
  })

  it('temperature correction is absent at T = 37°C (baseline)', () => {
    const store = freshStore()
    store.setLysisNPulses(1)  // pin N=1 so electrosensitization factor = 1 (test isolates temp correction)
    store.$patch({ targetTemp: BODY_TEMP_C })
    const drBaseline = store.targetDisruptionRatio

    // At T=37°C with N=1: temp factor = 1.0, N factor = 1.0 → DR = Vm * PEF / Vth exactly
    const vmT = store.targetVm
    const vthNominal = store.target.thresholdVoltage
    const expectedDR = (vmT * store.pulseEnvelopeFactorTarget) / vthNominal
    expect(drBaseline).toBeCloseTo(expectedDR, 6)
  })
})

// ── Quasi-DC TI and high-frequency TI limit ────────────────────────────────────

describe('tiQuasiDc and tiHighFreqLimit', () => {
  it('tiQuasiDc equals (R_T × Vth_H) / (R_H × Vth_T) when both temps are 37°C', () => {
    const store = freshStore()
    const expected = (store.target.radius * store.healthy.thresholdVoltage) /
                     (store.healthy.radius * store.target.thresholdVoltage)
    expect(store.tiQuasiDc).toBeCloseTo(expected, 5)
  })

  it('tiHighFreqLimit is less than tiQuasiDc when target is larger (rolls off faster)', () => {
    const store = freshStore()
    // Default: target (adenocarcinoma, R=15) > healthy (hepatocyte, R=10)
    // Larger target → τ_T > τ_H → rolls off faster → TI_HF < TI_DC
    if (store.target.radius > store.healthy.radius) {
      expect(store.tiHighFreqLimit).toBeLessThan(store.tiQuasiDc)
    }
  })

  it('selectivity at quasi-DC (very low freq) approximates tiQuasiDc', () => {
    const store = freshStore()
    store.setBroadcastFreqKHz(0.001)  // 1 Hz — quasi-DC
    const tiAtDC     = store.therapeuticIndex
    const tiQuasiDc  = store.tiQuasiDc
    // At quasi-DC, TI ≈ tiQuasiDc (small error from PEF which is ≈1 at long pulses)
    expect(tiAtDC).toBeCloseTo(tiQuasiDc, 1)
  })
})

// ── Population lysis fraction consistency ────────────────────────────────────

describe('population lysis fraction vs DR', () => {
  it('targetPopulationLysisFraction is 0 when DR << 1', () => {
    const store = freshStore()
    store.setFieldIntensity(1)          // very low field → tiny DR
    store.setBroadcastFreqKHz(1_000_000) // high freq → further reduction
    expect(store.targetPopulationLysisFraction).toBeCloseTo(0, 3)
  })

  it('population lysis increases monotonically as field increases', () => {
    const fields  = [50, 200, 500, 1000, 2000]
    let prevFrac  = -1
    for (const field of fields) {
      const store = freshStore()
      store.setFieldIntensity(field)
      store.setWaveform(WAVEFORM.CW)
      const frac = store.targetPopulationLysisFraction
      expect(frac).toBeGreaterThanOrEqual(prevFrac)
      prevFrac = frac
    }
  })

  it('healthyPopulationLysisFraction < targetPopulationLysisFraction at moderate field (TI > 1)', () => {
    const store = freshStore()
    store.setFieldIntensity(300)
    store.setBroadcastFreqKHz(500)
    // If TI > 1, more target cells lyse than healthy
    if (store.therapeuticIndex > 1) {
      expect(store.targetPopulationLysisFraction).toBeGreaterThanOrEqual(
        store.healthyPopulationLysisFraction,
      )
    }
  })

  it('population lysis fraction uses mammalian CV (0.25) for healthy cell', () => {
    const store = freshStore()
    // healthyPopulationSizeCV is always POP_CV_MAMMALIAN
    expect(store.healthyPopulationSizeCV).toBeCloseTo(0.25, 9)
  })

  it('target cell category determines population CV', () => {
    const storeM = freshStore()  // mammalian target by default
    expect(storeM.targetCellCategory).toBe(CELL_CATEGORY.MAMMALIAN)
    expect(storeM.targetPopulationSizeCV).toBeCloseTo(0.25, 9)

    const storeB = freshStore()
    const ecoli = CELL_PRESETS.find(p => p.presetId === 'ecoli')!
    storeB.loadPreset('target', ecoli)
    expect(storeB.targetCellCategory).toBe(CELL_CATEGORY.BACTERIA)
    expect(storeB.targetPopulationSizeCV).toBeCloseTo(0.12, 9)

    const storeV = freshStore()
    const flu = CELL_PRESETS.find(p => p.presetId === 'influenza')!
    storeV.loadPreset('target', flu)
    expect(storeV.targetCellCategory).toBe(CELL_CATEGORY.VIRUS)
    expect(storeV.targetPopulationSizeCV).toBeCloseTo(0.08, 9)
  })
})

// ── lysis field at θ = 90° ────────────────────────────────────────────────────

describe('lysis field sentinel at near-perpendicular orientation', () => {
  it('targetLysisField returns LYSIS_FIELD_SENTINEL when orientation = 90°', () => {
    const store = freshStore()
    store.setOrientationDeg(90)
    expect(store.targetLysisField).toBe(LYSIS_FIELD_SENTINEL)
  })

  it('targetLysisField is finite at orientation = 0° (perfectly aligned)', () => {
    const store = freshStore()
    store.setOrientationDeg(0)
    const elf = store.targetLysisField
    expect(isFinite(elf)).toBe(true)
    expect(elf).toBeGreaterThan(0)
  })

  it('lysis field increases as orientation angle increases (less effective field component)', () => {
    const storeA = freshStore()
    storeA.setOrientationDeg(10)
    const elfA = storeA.targetLysisField

    const storeB = freshStore()
    storeB.setOrientationDeg(45)
    const elfB = storeB.targetLysisField

    expect(elfB).toBeGreaterThan(elfA)
  })
})

// ── Cell preset loading consistency ───────────────────────────────────────────

describe('cell preset loading', () => {
  it('all presets load without throwing and produce finite DRs', () => {
    for (const preset of CELL_PRESETS) {
      const store = freshStore()
      const cellType = preset.type === 'healthy' ? 'healthy' : 'target'
      store.loadPreset(cellType, preset)

      if (cellType === 'target') {
        const dr = store.targetDisruptionRatio
        expect(isFinite(dr)).toBe(true)
        expect(dr).toBeGreaterThanOrEqual(0)
      } else {
        const dr = store.healthyDisruptionRatio
        expect(isFinite(dr)).toBe(true)
        expect(dr).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('resetting a cell restores default temperature', () => {
    const store = freshStore()
    store.$patch({ targetTemp: 55 })
    store.resetCell('target')
    expect(store.targetTemp).toBe(BODY_TEMP_C)
  })
})
