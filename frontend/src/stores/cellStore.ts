import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs } from '../mockData'
import { MEDIA } from '../constants/media'
import type { CellConfig } from '../types/cell'
import type { MediumKey } from '../types/media'
import { computeSchwan, computeSAR, computeFc, computeTau, computeResonantDisruption, computeNuclearVm, computePulseStepResponse, computeSkinDepthMm } from '../utils/physics'
import { CELL_CATEGORY, CHART_MODE, WAVEFORM } from '../constants/strings'

const LAMBDA = 0.02     // Newton cooling rate constant [1/s]
const TEMP_SIMULATION_CAP = 150  // °C — hard ceiling; cells are destroyed long before this

/**
 * Medium-specific ionic conductivity temperature coefficient [1/°C].
 * σ_e(T) = σ_e0 × (1 + α × (T − 37))
 * Sources: Coulter & Koenig 1953; Stogryn 1971; IEC 60601 series.
 *   saline:  2.0 %/°C  — 0.9% NaCl, near-linear across 20–60°C
 *   blood:   1.7 %/°C  — plasma-dominated, slightly lower due to protein buffering
 *   tissue:  1.5 %/°C  — heterogeneous soft tissue, averaged over protein/lipid content
 *   water:   2.8 %/°C  — pure water dissociation equilibrium; highly temp-sensitive
 */
const SIGMA_TEMP_COEFF: Record<string, number> = {
  saline:  0.020,
  blood:   0.017,
  tissue:  0.015,
  water:   0.028,
}

export interface FieldPacket {
  timestamp: number
  activeFrequencyKHz: number
  activeFieldIntensityVcm: number
  activeMedium: string
}

// Legacy alias — services/socket.ts imports this type
export type ResonancePacket = FieldPacket

interface CellStoreState {
  healthy: CellConfig
  target: CellConfig
  medium: MediumKey
  fieldIntensity: number          // V/cm
  currentBroadcastFrequency: number // kHz
  healthyTemp: number             // °C
  targetTemp: number              // °C
  dutyCycle: number               // dimensionless — pulsed field on-fraction (default 0.01%)
  waveform: 'cw' | 'pulsed'      // CW sinusoidal (waveformFactor 0.5) or pulsed bipolar square-wave bursts at carrier freq — H-FIRE/IRE regime (waveformFactor 1.0, E²_rms = E²_peak)
  pulseWidthNs: number            // pulse width in nanoseconds (pulsed mode only; default 1000 ns = 1 µs)
  safeMode: boolean               // when true, duty cycle is clamped so T_ss ≤ 42°C
  orientationDeg: number          // field-cell axis angle θ [0–90°]; default 0° (field-aligned = max Vm)
  lysisNPulses: number            // number of above-threshold pulses before lysis; default 10
  chartMode: 'schwan' | 'resonance'  // active chart/simulation mode (moved from ExperimentView local state)
  doubleShellEnabled: boolean     // opt-in two-shell nuclear envelope model (Kotnik & Miklavcic 2006)
  _tempTimer: number | null
  resetCounter: number
}

export const useCellStore = defineStore('cell', {
  state: (): CellStoreState => ({
    healthy: cloneDeep(cellConfigs[0]) as CellConfig,
    target: cloneDeep(cellConfigs[1]) as CellConfig,
    medium: 'saline',
    fieldIntensity: 150,           // V/cm — sub-threshold by default
    currentBroadcastFrequency: 417, // kHz — matches simulationData default
    healthyTemp: 37,
    targetTemp: 37,
    dutyCycle: 1e-4,               // 0.01% — typical pulsed electroporation default
    waveform: 'pulsed' as const,
    pulseWidthNs: 1000,            // 1 µs — sub-µs range reveals nsEP selectivity for bacteria
    safeMode: false,               // expert mode by default (scientists need full range)
    orientationDeg: 0,             // 0° = field-aligned = maximum transmembrane coupling
    lysisNPulses: 10,              // 10 above-threshold pulses ≈ typical IRE clinical protocol
    chartMode: 'schwan' as const,  // default: Schwan/IRE transmembrane potential model
    doubleShellEnabled: false,     // double-shell model off by default
    _tempTimer: null,
    resetCounter: 0,
  }),

  getters: {
    /** Base (reference-temperature) extracellular conductivity [S/m]. Used for display only. */
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    /**
     * |cos(θ)| — field-cell coupling factor [0–1].
     * θ = orientationDeg: angle between the applied field vector and the cell axis.
     * θ = 0° (field-aligned) → factor = 1 → maximum Vm.
     * θ = 90° (perpendicular) → factor = 0 → Vm → 0.
     * Note: cos(θ) cancels in the Vm selectivity ratio (Vm_T/Vm_H) for any θ,
     * since both cells share the same field orientation. Selectivity is θ-independent.
     */
    cosThetaFactor(state): number {
      return Math.abs(Math.cos(state.orientationDeg * Math.PI / 180))
    },

    /**
     * Pulse-envelope charging factor for the healthy cell [0–1].
     * For pulsed waveforms with pulse width t_p and membrane time constant τ:
     *   factor = 1 − exp(−t_p / τ)
     * Represents the fraction of the Schwan steady-state Vm that the membrane
     * actually reaches per pulse. At t_p ≫ τ → factor ≈ 1 (full charge, no correction).
     * At t_p ≪ τ (nsEP regime) → factor ≪ 1 → membrane barely charges per pulse →
     * effective Vm is lower → more field needed for lysis (higher effective threshold).
     * CW mode always returns 1.0 (continuous field, steady-state Vm applies).
     * Ref: Weaver & Chizmadzhev (1996); Stacey et al. (2003); Schoenbach et al. (2001).
     */
    pulseEnvelopeFactorHealthy(): number {
      const state = this as unknown as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED) return 1.0
      const tau_s = computeTau(state.healthy, this.effectiveSigmaE)
      return computePulseStepResponse(tau_s, state.pulseWidthNs)
    },

    /**
     * Pulse-envelope charging factor for the target cell [0–1].
     * See pulseEnvelopeFactorHealthy for the physical model.
     * Returns 1.0 unconditionally in resonance mode (acoustic/mechanical disruption
     * does not involve membrane capacitive charging via Schwan τ — the coupling
     * mechanism is electromagnetic→acoustic, not the RC charging of the membrane).
     * In Schwan/IRE mode, applies the same (1−exp(−t_p/τ)) correction as the healthy cell.
     */
    pulseEnvelopeFactorTarget(): number {
      const state = this as unknown as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED) return 1.0
      if (state.chartMode === CHART_MODE.RESONANCE) return 1.0
      const tau_s = computeTau(state.target, this.effectiveSigmaE)
      return computePulseStepResponse(tau_s, state.pulseWidthNs)
    },

    /**
     * Temperature-corrected extracellular conductivity [S/m].
     * σ_e(T) = σ_e0 × (1 + α × (T_mean − 37))
     * where α is medium-specific (saline 2.0%/°C, blood 1.7%/°C, tissue 1.5%/°C,
     * water 2.8%/°C). At hyperthermic limit (42°C), σ_e increases 7–14% depending
     * on medium, shifting τ and fc — a physically correct closed feedback loop.
     * T_mean = mean of healthy and target cell temperatures (bulk medium approximation).
     */
    effectiveSigmaE(state): number {
      const sigma_e0 = MEDIA[state.medium].conductivity
      const alpha    = SIGMA_TEMP_COEFF[state.medium] ?? 0.020
      const T_mean   = (state.healthyTemp + state.targetTemp) / 2
      return sigma_e0 * (1 + alpha * (T_mean - 37))
    },

    /**
     * Physically grounded lysis countdown duration [ms].
     * In CW mode: 2500 ms (time-based, no pulse count concept).
     * In pulsed mode: N_pulses × pulse_period where period = pulseWidthNs / dutyCycle.
     * Clamped to [200 ms, 30 000 ms] for visual validity.
     * Replaces the former hardcoded LYSIS_DELAY_MS = 2500 constant.
     */
    lysisDelayMs(state): number {
      if (state.waveform === WAVEFORM.CW || state.dutyCycle >= 1) return 2500
      const pulsePeriodMs = (state.pulseWidthNs * 1e-6) / state.dutyCycle
      return Math.max(200, Math.min(30_000, state.lysisNPulses * pulsePeriodMs))
    },

    /**
     * Peak induced transmembrane potential for the healthy cell [V].
     * Uses the Schwan single-shell AC model at the current broadcast frequency.
     *
     * Pulsed mode in this app models bipolar square-wave bursts at the carrier frequency
     * (the H-FIRE/IRE convention — Arena et al. 2011; Dong et al. 2021).
     * Schwan at the fundamental frequency is the standard first-order approximation:
     *   waveformFactor = 1.0  (E²_rms = E²_peak for a bipolar square wave; no RMS halving)
     *   SAR_eff = SAR_peak × dc  (duty cycle scales time-averaged heating)
     *
     * Note: the displayed Vm uses E_peak directly. The true square-wave fundamental is
     * E_1 = 4E_peak/π ≈ 1.27 × E_peak, so Vm is underestimated by ~21% in pulsed mode.
     * This factor cancels exactly in the Vm_T/Vm_H selectivity ratio and in the TI.
     * Duty cycle affects heating (via SAR × dc) and lysis timing (via lysisDelayMs), not Vm.
     */
    healthyVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /**
     * Peak induced transmembrane potential for the target cell [V].
     * See healthyVm for model notes. In resonance mode the targetDisruptionRatio getter
     * overrides the Schwan Vm with the acoustic/mechanical disruption formula.
     */
    targetVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /**
     * Healthy cell disruption ratio: (Vm × pulseEnvelopeFactor) / Vm_threshold.
     *
     * In pulsed mode with t_p ≪ τ, the membrane only charges to a fraction of the
     * Schwan steady-state Vm per pulse. The effective Vm for pore nucleation is
     * Vm_schwan × (1 − exp(−t_p/τ)), so an equivalently higher field is required to
     * cross the threshold. This captures the pulse-width dependence of the
     * electroporation threshold (Weaver & Chizmadzhev 1996, stochastic pore model).
     */
    healthyDisruptionRatio(): number {
      return (this.healthyVm * this.pulseEnvelopeFactorHealthy) / this.healthy.thresholdVoltage
    },

    /**
     * Target cell disruption ratio.
     * Resonance mode (virus/bacteria): uses acoustic Lorentzian formula — pulse envelope
     *   does not apply (different coupling mechanism; factor held at 1.0 by getter).
     * Schwan/IRE mode: (Vm × pulseEnvelopeFactor) / Vm_threshold, identical to healthy cell.
     */
    targetDisruptionRatio(): number {
      const cat = this.targetCellCategory
      const t = this.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      if ((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantFreqGHz && t.resonantThresholdVcm) {
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? 20,
          t.resonantThresholdVcm,
          this.currentBroadcastFrequency * 1e3,  // kHz → Hz
          this.fieldIntensity,
        )
      }
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / this.target.thresholdVoltage
    },

    healthySAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? 0.5 : 1.0
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? 0.5 : 1.0
      return computeSAR(state.target, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc((this as unknown as CellStoreState).healthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc((this as unknown as CellStoreState).target, this.effectiveSigmaE)
    },

    systemReady(state): boolean {
      return state.healthyTemp < 42 && state.targetTemp < 42
    },

    /**
     * Mode-aware selectivity alias → delegates to therapeuticIndex.
     * Kept for backward compatibility with experimentStore and chart components.
     */
    selectivityRatio(): number {
      return this.therapeuticIndex
    },

    /**
     * Classifies the current target cell by size:
     *   virus    — radius < 0.1 µm  (virions: 20–150 nm; Schwan model inapplicable)
     *   bacteria — radius < 2.0 µm  (E. coli ~1 µm, MRSA ~0.5 µm; nsEP regime)
     *   mammalian — radius ≥ 2.0 µm (cancer + reference cells)
     */
    targetCellCategory(state): 'mammalian' | 'bacteria' | 'virus' {
      if (state.target.radius < 0.1) return CELL_CATEGORY.VIRUS
      if (state.target.radius < 2.0) return CELL_CATEGORY.BACTERIA
      return CELL_CATEGORY.MAMMALIAN
    },

    /**
     * Therapeutic Index TI = targetDisruptionRatio / healthyDisruptionRatio.
     * Mode-aware: in Schwan mode = (Vt/Vt,thr) / (Vh/Vh,thr).
     * In resonance mode: target uses acoustic disruption formula, healthy ≈ 0 at GHz → TI caps at 99.9.
     * TI > 1 means target cells are proportionally closer to disruption threshold than healthy cells.
     */
    therapeuticIndex(): number {
      const hDr = this.healthyDisruptionRatio
      if (hDr < 1e-9) return this.targetDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetDisruptionRatio / hDr)
    },

    /**
     * True if at least one of the active cells has nuclear envelope parameters.
     * Used to conditionally show the double-shell model toggle in the UI.
     * Only mammalian nucleated cells have nuclearRadius defined.
     */
    hasNuclearParams(state): boolean {
      return !!state.healthy.nuclearRadius || !!state.target.nuclearRadius
    },

    /**
     * Nuclear transmembrane potential for the healthy cell [V].
     * Uses the Kotnik & Miklavcic (2006) two-shell bandpass formula — a zero at DC and
     * at high frequency, with a bandpass peak at f_peak = 1/(2π√(τ_out·τ_ne)).
     * Returns 0 if the healthy cell has no nuclear envelope parameters (anucleate / prokaryotes).
     */
    healthyNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /** Nuclear transmembrane potential for the target cell [V]. Returns 0 if no nuclear params. */
    targetNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /** Nuclear disruption ratio for healthy cell: Vm_nuc / nuclear threshold voltage. */
    healthyNuclearDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const vth = state.healthy.nuclearThresholdVoltage ?? 0.5
      return this.healthyNuclearVm / vth
    },

    /** Nuclear disruption ratio for target cell: Vm_nuc / nuclear threshold voltage. */
    targetNuclearDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const vth = state.target.nuclearThresholdVoltage ?? 0.5
      return this.targetNuclearVm / vth
    },

    /**
     * Nuclear selectivity ratio: target nuclear disruption / healthy nuclear disruption.
     * Caps at 99.9 when healthy nuclear disruption is negligible.
     */
    nuclearSelectivityRatio(): number {
      const hDr = this.healthyNuclearDisruptionRatio
      if (hDr < 1e-9) return this.targetNuclearDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetNuclearDisruptionRatio / hDr)
    },

    /**
     * Minimum field intensity [V/cm] at current frequency and pulse width to reach lysis
     * threshold for the target cell (Schwan/IRE mode only).
     *   Vm_eff = 1.5·E·R·cosθ / √(1+(ωτ)²) × pulseEnvelopeFactor = Vm_thr
     *   → E_lysis = Vm_thr·√(1+(ωτ)²) / (1.5·R·cosθ·pulseEnvelopeFactor)
     * In pulsed mode with short pulses, E_lysis is higher (membrane charges fractionally
     * per pulse → more field needed). Near-perpendicular (cosθ < 0.01): 1e6 V/cm.
     */
    targetLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.target, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.target.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      const baseLysisField = (state.target.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
      // Divide by pulse envelope factor: shorter pulses require proportionally more field
      const pef = Math.max(1e-4, this.pulseEnvelopeFactorTarget)
      return baseLysisField / pef
    },

    /**
     * Same as targetLysisField but for the healthy reference cell.
     * Pulse-envelope corrected: E_lysis,H = base / pulseEnvelopeFactorHealthy.
     */
    healthyLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.healthy, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.healthy.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      const baseLysisField = (state.healthy.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
      const pef = Math.max(1e-4, this.pulseEnvelopeFactorHealthy)
      return baseLysisField / pef
    },

    /**
     * Effective duty cycle for thermal calculations.
     * CW mode is by definition always-on (dc = 1.0) — the user's stored dutyCycle
     * value is only used in pulsed mode.  By NOT overwriting dutyCycle when switching
     * to CW, the user's pulsed setting is preserved when they switch back.
     */
    effectiveDutyCycle(state): number {
      return state.waveform === WAVEFORM.CW ? 1.0 : state.dutyCycle
    },

    /**
     * Projected steady-state temperature for healthy cell [°C]:
     *   T_ss = 37 + SAR_eff / (λ × cp)
     *   SAR_eff = SAR_peak × effectiveDutyCycle
     * Capped at TEMP_SIMULATION_CAP for display.
     */
    healthySteadyStateTemp(): number {
      const sar_eff = this.healthySAR * this.effectiveDutyCycle
      const cp = this.healthy.specificHeatCapacity
      return Math.min(37 + sar_eff / (LAMBDA * cp), TEMP_SIMULATION_CAP)
    },

    /** Projected steady-state temperature for target cell [°C], capped at TEMP_SIMULATION_CAP. */
    targetSteadyStateTemp(): number {
      const sar_eff = this.targetSAR * this.effectiveDutyCycle
      const cp = this.target.specificHeatCapacity
      return Math.min(37 + sar_eff / (LAMBDA * cp), TEMP_SIMULATION_CAP)
    },

    /**
     * Electromagnetic skin (penetration) depth [mm] at the current broadcast frequency.
     * δ = √(1/(π·f·μ₀·σ_e)) — depth at which the GHz field amplitude decays to 1/e (~37%).
     * Key values in saline (σ_e ≈ 1.5 S/m): 1 GHz→7 mm · 5 GHz→3 mm · 12 GHz→2 mm.
     * In vivo GHz resonance delivery requires near-field or intracavitary applicators.
     */
    skinDepthMm(): number {
      const state = this as unknown as CellStoreState
      return computeSkinDepthMm(state.currentBroadcastFrequency, this.effectiveSigmaE)
    },

    /**
     * Maximum duty cycle that keeps both cells' T_ss ≤ 42°C (hyperthermic limit).
     * dc_max = (5 × λ × cp_min) / SAR_peak_max
     * Used by Safe Mode to clamp the duty cycle slider. Only meaningful in pulsed mode.
     */
    maxSafeDutyCycle(): number {
      const maxSAR = Math.max(this.healthySAR, this.targetSAR)
      if (maxSAR <= 0) return 1
      const minCp = Math.min(this.healthy.specificHeatCapacity, this.target.specificHeatCapacity)
      return Math.min(1, (5 * LAMBDA * minCp) / maxSAR)
    },

    // ── Healthy-cell biomodulation metrics ────────────────────────────────────
    // These model the constructive/stimulatory effects of sub-threshold EM fields
    // on healthy mammalian cells — distinct from the electroporation/disruption model
    // applied to target (cancer / pathogen) cells.

    /**
     * Sub-threshold stimulation index (SI) for the healthy cell [0–1].
     *
     * When the applied field produces a Vm that is 5–45% of the electroporation
     * threshold, sub-threshold membrane oscillations activate mechanosensitive and
     * voltage-gated Ca²⁺ channels (PIEZO1, L-type VGCC) without breaching the
     * membrane. Peak Ca²⁺ influx and downstream growth-factor signalling occur
     * at ~20–40% of the lysis threshold.
     *
     * Model: SI = 4·r·(1−r), quadratic bell peaking at r = 0.5 → DR ≈ 22.5%
     *   where r = clamp(healthyDisruptionRatio / 0.45, 0, 1)
     * SI → 0 when DR < 5% (too weak) or DR > 45% (membrane stress begins).
     *
     * Refs: Pilla AA (2006) JRSE 8:72; Lee DH et al. (2018) Sci Rep 8:8184;
     *       Bhatt DL et al. (1990) Bioelectromagnetics 11:3–15.
     */
    healthyStimIndex(): number {
      const r = Math.min(1, this.healthyDisruptionRatio / 0.45)
      return Math.max(0, 4 * r * (1 - r))
    },

    /**
     * Mechanotransduction coupling efficiency (MTE) for the healthy cell [0–1].
     *
     * Quantifies how effectively the applied RF frequency couples to the plasma
     * membrane for sub-threshold mechanostimulation (distinct from ablative IRE).
     * Uses the Schwan frequency roll-off factor: MTE = 1/√(1 + (f/fc)²).
     *
     *   f ≪ fc : MTE ≈ 1.0 — full quasi-DC coupling; optimal for PEMF and low-RF
     *            mechanostimulation (LITUS equivalent at MHz in soft tissue).
     *   f = fc : MTE = 0.707 — half-power point; membrane partially shields cytoplasm.
     *   f ≫ fc : MTE → 0   — field bypasses membrane (ωτ ≫ 1); no Vm coupling.
     *
     * For RF biomodulation (Schwan model), f < fc/3 maximises coupling efficiency.
     * LITUS (1 MHz therapeutic ultrasound) operates via acoustic pressure / stable
     * cavitation — a distinct mechanism not modelled here.
     *
     * Refs: Ikai Y et al. (2008) J Orthop Sci 13:550; Shirane R et al. (2001)
     *       Ultrasound Med Biol 27:563.
     */
    healthyMechTransductionEff(): number {
      const f  = (this as unknown as CellStoreState).currentBroadcastFrequency  // kHz
      const fc = this.healthyFc                                                  // kHz
      return 1 / Math.sqrt(1 + (f / fc) ** 2)
    },

    /**
     * Mild thermal activation score (MA) for the healthy cell [0–1].
     *
     * Mild, SAR-driven hyperthermia in the 37–42°C window upregulates healthy
     * cell metabolism via:
     *   - Q₁₀ ≈ 1.07 enzyme kinetics: +7%/°C in the 37–41°C range (van't Hoff rule)
     *   - HSP70 cytoprotective expression: peak induction at 38–41°C (Morimoto 1998)
     *   - Increased membrane fluidity → enhanced receptor mobility and nutrient transport
     *
     * Model: piecewise bell centred on 40°C:
     *   T ≤ 37°C : 0    — homeostatic baseline; no SAR-driven thermal benefit
     *   37–41°C  : (T − 37) / 4  — linear ramp (+25% per °C over baseline)
     *   41–42°C  : 42 − T        — rapid fall as heat-stress onset approaches
     *   > 42°C   : 0    — hyperthermic damage (IAHT limit); NOT beneficial
     *
     * Note: the thermal simulation (Newton cooling) reaches T_ss at steady state.
     * MA is computed from healthySteadyStateTemp, NOT the live tracked healthyTemp.
     *
     * Refs: Lepock JR (2003) Int J Hyperthermia 19:252; Morimoto RI (1998) Genes Dev 12:3788.
     */
    healthyMildThermalActivation(): number {
      const T = this.healthySteadyStateTemp
      if (T <= 37) return 0
      if (T <= 41) return (T - 37) / 4
      if (T <= 42) return 42 - T
      return 0
    },

    /**
     * Optimal RF frequency and selectivity for the current cell pair and field conditions.
     * 300-point log-space scan over 10 kHz – 500 MHz (Schwan/IRE mode).
     * For resonance-targeted pathogens (virus/bacteria with resonantFreqGHz), returns
     * the resonant frequency directly at TI = 99.9.
     * Shared by FrequencySlider (⭐ snap button) and SelectivityPanel (optimal note).
     */
    optimalFreqResult(): { khz: number; sel: number } {
      const state  = this as unknown as CellStoreState
      const target = state.target as CellConfig & { resonantFreqGHz?: number }
      const cat    = this.targetCellCategory
      if ((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && target.resonantFreqGHz && state.chartMode === CHART_MODE.SCHWAN) {
        return { khz: target.resonantFreqGHz * 1e6, sel: 99.9 }
      }
      const sigma_e = this.effectiveSigmaE
      const field   = state.fieldIntensity
      const hThr    = state.healthy.thresholdVoltage
      const tThr    = state.target.thresholdVoltage
      let maxSel = -Infinity, optKhz = 10
      const logMin = Math.log10(10), logMax = Math.log10(500_000)
      for (let i = 0; i < 300; i++) {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hVm = computeSchwan(state.healthy, khz, field, sigma_e)
        const tVm = computeSchwan(state.target,  khz, field, sigma_e)
        const hDr = hVm / hThr, tDr = tVm / tThr
        const sel  = hDr > 0 ? tDr / hDr : 0
        if (sel > maxSel) { maxSel = sel; optKhz = khz }
      }
      return { khz: optKhz, sel: Math.max(0, maxSel) }
    },

    /**
     * Composite Biomodulation Score (BMS) for the healthy cell [0–1].
     *
     * Weighted combination of three independent stimulatory mechanisms:
     *   BMS = 0.55 × SI + 0.25 × MTE + 0.20 × MA
     *
     * Weighting rationale:
     *   SI  (55%) — dominant: direct Vm-driven Ca²⁺ signalling is the primary
     *               documented mechanism for EM biomodulation (Pilla 2006)
     *   MTE (25%) — modulates how efficiently the carrier frequency delivers Vm
     *               to the membrane (Schwan coupling; falls above fc)
     *   MA  (20%) — thermal bonus; mild SAR can augment metabolic activity when
     *               T_ss is carefully controlled in the 38–41°C window
     *
     * BMS > 0.30 is considered a meaningful stimulatory regime in this model.
     * This is an approximate research indicator, not a validated clinical index.
     */
    healthyBiomodScore(): number {
      return (
        0.55 * this.healthyStimIndex +
        0.25 * this.healthyMechTransductionEff +
        0.20 * this.healthyMildThermalActivation
      )
    },
  },

  actions: {
    setMedium(key: MediumKey) {
      this.medium = key
    },

    setFieldIntensity(vcm: number) {
      this.fieldIntensity = vcm
    },

    setBroadcastFreqKHz(khz: number) {
      this.currentBroadcastFrequency = khz
    },

    handleResonancePacket(packet: FieldPacket) {
      this.currentBroadcastFrequency = packet.activeFrequencyKHz
      this.fieldIntensity = packet.activeFieldIntensityVcm
      if (packet.activeMedium in MEDIA) {
        this.medium = packet.activeMedium as MediumKey
      }
    },

    updateCellParam(cellType: 'healthy' | 'target', key: string, value: number) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this[cellType] as any)[key] = value
    },

    startSession() {
      if (this._tempTimer !== null) return
      this._tempTimer = setInterval(() => {
        // Effective duty cycle: CW is always-on (1.0); pulsed uses slider value
        const dc = this.effectiveDutyCycle
        // Healthy cell temperature update (Newton cooling, 100 ms tick)
        const hSAR = this.healthySAR
        const dTh = (hSAR * dc / this.healthy.specificHeatCapacity - LAMBDA * (this.healthyTemp - 37)) * 0.1
        this.healthyTemp = Math.max(37, Math.min(TEMP_SIMULATION_CAP, this.healthyTemp + dTh))

        // Target cell temperature update
        const tSAR = this.targetSAR
        const dTt = (tSAR * dc / this.target.specificHeatCapacity - LAMBDA * (this.targetTemp - 37)) * 0.1
        this.targetTemp = Math.max(37, Math.min(TEMP_SIMULATION_CAP, this.targetTemp + dTt))
      }, 100) as unknown as number
    },

    setDutyCycle(dc: number) {
      this.dutyCycle = Math.max(1e-6, Math.min(1, dc))
    },

    setPulseWidthNs(ns: number) {
      this.pulseWidthNs = Math.max(1, Math.min(100_000, ns))
    },

    setWaveform(mode: 'cw' | 'pulsed') {
      this.waveform = mode
      // Do NOT overwrite dutyCycle — CW always uses effectiveDutyCycle=1.0 in the thermal
      // model regardless, and preserving the pulsed dutyCycle lets the user switch back
      // to pulsed mode without losing their setting.
    },

    /**
     * Toggle Safe Mode — clamps duty cycle so projected T_ss ≤ 42°C.
     * Expert mode (off) allows full parameter range with warnings shown.
     */
    setSafeMode(on: boolean) {
      this.safeMode = on
      if (on && this.dutyCycle > this.maxSafeDutyCycle) {
        this.dutyCycle = Math.max(1e-6, this.maxSafeDutyCycle)
      }
    },

    stopSession() {
      if (this._tempTimer !== null) {
        clearInterval(this._tempTimer)
        this._tempTimer = null
      }
    },

    resetCell(cellType: 'healthy' | 'target') {
      const defaultCfg = cellType === 'healthy' ? cellConfigs[0] : cellConfigs[1]
      this[cellType] = cloneDeep(defaultCfg) as CellConfig
      if (cellType === 'healthy') this.healthyTemp = 37
      else this.targetTemp = 37
      this.resetCounter++
    },

    loadPreset(cellType: 'healthy' | 'target', preset: CellConfig) {
      this[cellType] = cloneDeep(preset) as CellConfig
      // Reset both temperatures — loading a preset starts a fresh experiment context.
      this.healthyTemp = 37
      this.targetTemp = 37
      // Signal CellCard components to reset visual state (lysis animation, state machine).
      this.resetCounter++
    },

    /** Reset both cell temperatures to physiological baseline (37°C). */
    resetTemps() {
      this.healthyTemp = 37
      this.targetTemp = 37
    },

    /** Set field-cell orientation angle θ [0°–90°]. 0° = field-aligned = maximum Vm coupling. */
    setOrientationDeg(deg: number) {
      this.orientationDeg = Math.max(0, Math.min(90, deg))
    },

    /** Set number of above-threshold pulses required to trigger lysis [1–1000]. */
    setLysisNPulses(n: number) {
      this.lysisNPulses = Math.max(1, Math.min(1000, Math.round(n)))
    },

    /**
     * Set the active chart/simulation mode.
     * 'schwan' — Schwan/IRE transmembrane potential model (mammalian cells).
     * 'resonance' — Acoustic resonance model (virus/bacteria capsid/cell-wall).
     * Auto-disables double-shell model when switching to resonance (nuclear model is Schwan-only).
     */
    setChartMode(mode: 'schwan' | 'resonance') {
      this.chartMode = mode
      if (mode === CHART_MODE.RESONANCE) this.doubleShellEnabled = false
    },

    /** Toggle the double-shell nuclear envelope model on/off. Only meaningful in Schwan mode. */
    toggleDoubleShell() {
      this.doubleShellEnabled = !this.doubleShellEnabled
    },

  },
})
