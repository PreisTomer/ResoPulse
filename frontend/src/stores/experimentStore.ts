import { defineStore } from 'pinia'
import type { LogEventType } from '@/constants/strings'
import { CELL_LABEL } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { MEDIA } from '@/constants/media'
import type { MediumKey } from '@/types/media'
import { useCellStore } from '@/stores/cellStore'

// ── Parameter snapshot captured at log time ────────────────────────────────
export interface CellParamSnapshot {
  label: string
  category: string           // 'mammalian' | 'bacteria' | 'virus'
  radius: number             // µm
  membraneThickness: number  // nm
  dielectricConstant: number
  conductivity: number       // S/m
  thresholdVoltage: number   // V
  fc: number                 // kHz — corner frequency at log-time medium
  // Resonance fields (virus / bacteria in resonance mode)
  resonantFreqGHz?: number
  capsidQ?: number
  capsidQMin?: number
  capsidQMax?: number
  resonantThresholdVcm?: number
  resonantFreqUncertaintyPct?: number
  experimentalBasis?: string
  // Nuclear envelope (double-shell model)
  nuclearRadius?: number
  nuclearMembraneThickness?: number
  nuclearMembraneEps?: number
  nucleoplasmConductivity?: number
}

export interface LogEntry {
  id: number
  timestamp: string       // HH:mm:ss
  freqKHz: number
  fieldVcm: number
  medium: string
  targetPreset: string    // e.g. 'adenocarcinoma'
  healthyVm: number       // mV
  targetVm: number        // mV
  selectivity: number     // ratio
  healthyRatio: number    // fraction (0-n)
  targetRatio: number
  healthyTemp: number     // °C
  targetTemp: number
  event: LogEventType
  // ── Full parameter snapshot (captured at log time) ──────────────────────
  chartMode?: 'schwan' | 'resonance'
  waveform?: string
  dutyCycle?: number
  pulseWidthNs?: number
  lysisNPulses?: number
  orientationDeg?: number
  doubleShellEnabled?: boolean
  sigmaE?: number                // effective σe at log time [S/m]
  healthyNuclearVm?: number      // mV
  targetNuclearVm?: number       // mV
  healthySnap?: CellParamSnapshot
  targetSnap?: CellParamSnapshot
}

interface ExperimentState {
  entries: LogEntry[]
  nextId: number
  sessionName: string
  // ── Dosimetry ───────────────────────────────────────────────────────────
  cumulativeDoseJkg: number   // J/kg — cumulative specific energy absorbed this session
  sessionStartMs: number      // Unix ms — when the current session started
}

// Extended snapshot pulled from cellStore — avoids circular import
interface CellSnapshot {
  currentBroadcastFrequency: number
  fieldIntensity: number
  medium: string
  chartMode: 'schwan' | 'resonance'
  waveform: string
  dutyCycle: number
  pulseWidthNs: number
  lysisNPulses: number
  orientationDeg: number
  doubleShellEnabled: boolean
  effectiveSigmaE: number
  healthyFc: number
  targetFc: number
  targetCellCategory: 'mammalian' | 'bacteria' | 'virus'
  healthyVm: number
  targetVm: number
  selectivityRatio: number
  healthyDisruptionRatio: number
  targetDisruptionRatio: number
  healthyTemp: number
  targetTemp: number
  healthyNuclearVm: number
  targetNuclearVm: number
  healthy: {
    label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
  }
  target: {
    id: string; label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
    resonantFreqGHz?: number; capsidQ?: number; capsidQMin?: number
    capsidQMax?: number; resonantThresholdVcm?: number
    resonantFreqUncertaintyPct?: number; experimentalBasis?: string
  }
}

function nowHMS(): string {
  const d    = new Date()
  const date = d.toISOString().slice(0, 10)
  const time = d.toLocaleTimeString('en-GB', { hour12: false })
  return `${date} ${time}`
}

/** Round a number to `decimals` significant decimal places, stripping trailing zeros. */
function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals))
}

const LS_KEY = 'br-experiment'

function loadState(): ExperimentState {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as ExperimentState
      return {
        ...parsed,
        cumulativeDoseJkg: parsed.cumulativeDoseJkg ?? 0,
        sessionStartMs:    parsed.sessionStartMs    ?? Date.now(),
      }
    }
  } catch { /* ignore corrupt data */ }
  return { entries: [], nextId: 1, sessionName: 'Session 001', cumulativeDoseJkg: 0, sessionStartMs: Date.now() }
}

// ── Methods export helpers ─────────────────────────────────────────────────
const sep = (ch = '─', n = 54) => ch.repeat(n)
const fld = (label: string, value: string, width = 26) =>
  `  ${label.padEnd(width)}= ${value}`

function buildHealthySection(h: CellParamSnapshot, isDbl: boolean, mediumName: string): string[] {
  const eps0 = 8.854e-12
  const cm   = (h.dielectricConstant * eps0 / (h.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const tau  = h.fc > 0 ? (1e6 / (2 * Math.PI * h.fc)).toFixed(0) : '—'
  const lines: string[] = [
    `Reference (Healthy): ${h.label}`,
    fld('Radius R',               `${h.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',   `${h.membraneThickness} nm`),
    fld('Permittivity εr',        `${h.dielectricConstant}`),
    fld('Conductivity σi',        `${h.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm', `${cm} mF/m²  [εr·ε0/d]`),
    fld('Lysis threshold Vm,thr', `${h.thresholdVoltage} ${UNIT.V}`),
    fld('Time constant τ',        `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
    fld('Corner frequency fc',    `${h.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
  ]
  if (isDbl && h.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${h.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${h.nuclearMembraneThickness ?? 'n/a'} nm`),
      fld('Nuclear mem. εr',        `${h.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${h.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
  return lines
}

function buildTargetSection(t: CellParamSnapshot, isRes: boolean, isDbl: boolean, mediumName: string): string[] {
  const eps0 = 8.854e-12
  const cm   = (t.dielectricConstant * eps0 / (t.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const lines: string[] = [
    `Target Cell: ${t.label}  [category: ${t.category}]`,
    fld('Radius R',               `${t.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',   `${t.membraneThickness} nm`),
    fld('Permittivity εr',        `${t.dielectricConstant}`),
    fld('Conductivity σi',        `${t.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm', `${cm} mF/m²  [εr·ε0/d]`),
  ]
  if (isRes && t.resonantFreqGHz) {
    const fResGHz   = t.resonantFreqGHz.toFixed(3)
    const fResMHz   = (t.resonantFreqGHz * 1000).toFixed(0)
    const qNominal  = t.capsidQ?.toFixed(0) ?? '—'
    const qMin      = t.capsidQMin?.toFixed(0) ?? qNominal
    const qMax      = t.capsidQMax?.toFixed(0) ?? qNominal
    lines.push(
      fld('Resonant frequency f_res', `${fResGHz} GHz  (${fResMHz} MHz)`),
      fld('Quality factor Q',         `${qNominal}  [range: ${qMin}–${qMax}]`),
      fld('Resonant threshold E_thr', `${t.resonantThresholdVcm?.toFixed(0) ?? '—'} ${UNIT.V_PER_CM}`),
      fld('f_res uncertainty',        `±${t.resonantFreqUncertaintyPct?.toFixed(0) ?? '—'}%`),
      fld('Experimental basis',       t.experimentalBasis ?? 'unknown'),
    )
  } else {
    const tau = t.fc > 0 ? (1e6 / (2 * Math.PI * t.fc)).toFixed(0) : '—'
    lines.push(
      fld('Lysis threshold Vm,thr', `${t.thresholdVoltage} ${UNIT.V}`),
      fld('Time constant τ',        `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
      fld('Corner frequency fc',    `${t.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
    )
  }
  if (isDbl && t.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${t.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${t.nuclearMembraneThickness ?? 'n/a'} nm`),
      fld('Nuclear mem. εr',        `${t.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${t.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
  // Category caveats
  if (t.category === 'virus') {
    lines.push(
      '',
      'NOTE (virus): Lorentzian shell model treats viral capsid/envelope as a thin spherical',
      'shell. For enveloped viruses (influenza, SARS-CoV-2), the lipid bilayer is mechanically',
      'distinct from protein capsids. Resonant frequency estimates are highly speculative and',
      'not validated by direct RF inactivation experiments at these frequencies.',
    )
  } else if (t.category === 'bacteria') {
    lines.push(
      '',
      'NOTE (bacteria): Spherical shell approximation applied to a rod-shaped or coccoid',
      'organism. For rod-shaped bacteria, R is the effective radius of equivalent-volume sphere.',
      'Viscoelastic peptidoglycan wall → low Q (Q = 3–4) vs. stiff protein capsids.',
    )
  }
  return lines
}

function buildModelSection(isRes: boolean, isPulsed: boolean, isDbl: boolean): string[] {
  const lines: string[] = []
  if (isRes) {
    lines.push(
      'Acoustic / mechanical resonance — Lorentzian model (Tsen et al. 2007):',
      '  DR(f) = 1 / √(1 + Q² · (f/f_res − f_res/f)²)',
      '  f_res : fundamental resonant frequency of the capsid shell',
      '  Q     : quality factor (sharpness of resonance)',
      '  Inactivation occurs when DR(f) · E ≥ E_thr',
      '',
      'Healthy cell transmembrane voltage — Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
    )
  } else {
    lines.push(
      'Transmembrane voltage — Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
      '  Cm = εr · ε0 / d',
    )
  }
  lines.push(
    '',
    'Specific absorption rate (SAR) and thermal model:',
    '  SAR = σi · α² · E² · wf / ρ',
    '  α = 3σe / (2σe + σi)   [internal field correction — Kotnik 2000]',
    '  T_ss = 37 + SAR · dc / (λ · cp)',
    '  λ = 0.02 s⁻¹ (Newton cooling constant)',
  )
  if (isPulsed && !isRes) {
    lines.push(
      '',
      'Pulse charging — pulse envelope factor (Weaver & Chizmadzhev 1996):',
      '  PEF = 1 − exp(−t_p / τ)   [fraction of steady-state Vm reached]',
      '  Effective Vm = Vm(f) · PEF',
      '  At t_p < τ: membrane substantially undercharged (PEF < 0.63)',
      '  At t_p ≥ 3τ: membrane reaches ≥95% plateau (full charging)',
    )
  }
  if (isDbl) {
    lines.push(
      '',
      'Double-shell (nuclear envelope) model (Kotnik & Miklavcic 2006):',
      '  Extends single-shell Schwan model to include nuclear membrane.',
      '  Nuclear Vm exhibits bandpass response; peak near f_n = 1/(2πτ_n)',
      '  τ_n = R_n · Cm_n · (2σcyto + σnucleus) / (2σcyto · σnucleus)',
    )
  }
  return lines
}

function buildRefs(isRes: boolean, isDbl: boolean, cat: string): string[] {
  const refs: string[] = []
  let i = 1
  refs.push(
    `[${i++}] Kotnik, T. & Miklavcic, D. (2000). Analytical description of transmembrane voltage`,
    '    induced by electric fields on spheroidal cells. Biophys. J. 79(2), 670–679.',
    `[${i++}] Weaver, J.C. & Chizmadzhev, Y.A. (1996). Theory of electroporation: a review.`,
    '    Bioelectrochem. Bioenerg. 41(2), 135–160.',
  )
  if (isDbl) refs.push(
    `[${i++}] Kotnik, T. & Miklavcic, D. (2006). Theoretical evaluation of voltage inducement`,
    '    on internal membranes of biological cells exposed to electric fields.',
    '    Biophys. J. 90(2), 480–491.',
  )
  if (isRes) {
    refs.push(
      `[${i++}] Tsen, S.W.D. et al. (2007). Non-thermal effects in the inactivation of viruses.`,
      '    J. Phys. D: Appl. Phys. 40(15), 4571–4577.',
      `[${i++}] Dykeman, E.C. & Sankey, O.F. (2008). Low-frequency mechanical modes of viral capsids.`,
      '    Phys. Rev. Lett. 100(2), 028101.',
    )
    if (cat === 'virus') refs.push(
      `[${i++}] Sankey, O.F. et al. (2009). Simulations of the mechanical modes of viral capsids.`,
      '    Proc. Natl. Acad. Sci. USA 106(30), 12347–12352.',
    )
  }
  return refs
}

function downloadText(txt: string, filename: string) {
  const blob = new Blob([txt], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const useExperimentStore = defineStore('experiment', {
  state: (): ExperimentState => loadState(),

  actions: {
    logReading(snap: CellSnapshot, event: LogEntry['event']) {
      const h = snap.healthy
      const t = snap.target
      this.entries.push({
        id:           this.nextId++,
        timestamp:    nowHMS(),
        freqKHz:      snap.currentBroadcastFrequency,
        fieldVcm:     snap.fieldIntensity,
        medium:       snap.medium,
        targetPreset: t.id,
        healthyVm:    round(snap.healthyVm * 1000,        3),
        targetVm:     round(snap.targetVm  * 1000,        3),
        selectivity:  round(snap.selectivityRatio,        3),
        healthyRatio: round(snap.healthyDisruptionRatio,  4),
        targetRatio:  round(snap.targetDisruptionRatio,   4),
        healthyTemp:  round(snap.healthyTemp,             1),
        targetTemp:   round(snap.targetTemp,              1),
        event,
        // ── Full snapshot ─────────────────────────────────────────────────
        chartMode:         snap.chartMode,
        waveform:          snap.waveform,
        dutyCycle:         snap.dutyCycle,
        pulseWidthNs:      snap.pulseWidthNs,
        lysisNPulses:      snap.lysisNPulses,
        orientationDeg:    snap.orientationDeg,
        doubleShellEnabled: snap.doubleShellEnabled,
        sigmaE:            round(snap.effectiveSigmaE, 4),
        healthyNuclearVm:  round(snap.healthyNuclearVm * 1000, 3),
        targetNuclearVm:   round(snap.targetNuclearVm  * 1000, 3),
        healthySnap: {
          label: h.label, category: 'mammalian',
          radius: h.radius, membraneThickness: h.membraneThickness,
          dielectricConstant: h.dielectricConstant, conductivity: h.conductivity,
          thresholdVoltage: h.thresholdVoltage, fc: snap.healthyFc,
          nuclearRadius: h.nuclearRadius, nuclearMembraneThickness: h.nuclearMembraneThickness,
          nuclearMembraneEps: h.nuclearMembraneEps, nucleoplasmConductivity: h.nucleoplasmConductivity,
        },
        targetSnap: {
          label: t.label, category: snap.targetCellCategory,
          radius: t.radius, membraneThickness: t.membraneThickness,
          dielectricConstant: t.dielectricConstant, conductivity: t.conductivity,
          thresholdVoltage: t.thresholdVoltage, fc: snap.targetFc,
          nuclearRadius: t.nuclearRadius, nuclearMembraneThickness: t.nuclearMembraneThickness,
          nuclearMembraneEps: t.nuclearMembraneEps, nucleoplasmConductivity: t.nucleoplasmConductivity,
          resonantFreqGHz: t.resonantFreqGHz, capsidQ: t.capsidQ,
          capsidQMin: t.capsidQMin, capsidQMax: t.capsidQMax,
          resonantThresholdVcm: t.resonantThresholdVcm,
          resonantFreqUncertaintyPct: t.resonantFreqUncertaintyPct,
          experimentalBasis: t.experimentalBasis,
        },
      })
    },

    /** Receive a log entry broadcast from another client — append without re-broadcasting. */
    receiveEntry(entry: LogEntry) {
      if (this.entries.some(e => e.id === entry.id)) return
      this.entries.push(entry)
      this.nextId = Math.max(this.nextId, entry.id + 1)
    },

    setSessionName(name: string) {
      this.sessionName = name
    },

    clearLog() {
      this.entries = []
      this.nextId = 1
      this.cumulativeDoseJkg = 0
      this.sessionStartMs    = Date.now()
    },

    /**
     * Accumulate dosimetry: SAR_target × dt_s × dutyCycle.
     * Called on a periodic timer in ExperimentView.
     * @param sarWkg   — instantaneous SAR [W/kg] for the target cell
     * @param dutyCycle — duty cycle (0–1)
     * @param dtMs      — elapsed time since last sample [ms]
     */
    addDoseSample(sarWkg: number, dutyCycle: number, dtMs: number) {
      const dtS = dtMs * 1e-3
      this.cumulativeDoseJkg += sarWkg * dutyCycle * dtS
    },

    /** Generate a publication-ready methods .txt file for a single log entry. */
    exportEntryMethods(entry: LogEntry) {
      if (!entry.healthySnap || !entry.targetSnap) {
        // Legacy entry — no snapshot; generate minimal file from available data
        const medName = entry.medium in MEDIA ? MEDIA[entry.medium as MediumKey].name : entry.medium
        const lines = [
          'MATERIALS AND METHODS — BioResonance',
          sep('═'),
          `Session  : ${this.sessionName}`,
          `Entry #${entry.id}  logged at ${entry.timestamp}`,
          `Generated: ${new Date().toISOString()}`,
          '',
          'NOTE: This entry was logged before full parameter snapshots were introduced.',
          'Only the values recorded at log time are available.',
          '',
          sep(),
          fld('Target preset',    entry.targetPreset),
          fld('Medium',           medName),
          fld('RF Frequency',     `${entry.freqKHz} ${UNIT.KHZ}`),
          fld('Electric Field E', `${entry.fieldVcm} ${UNIT.V_PER_CM}`),
          fld('Healthy Vm',       `${entry.healthyVm} ${UNIT.MV}`),
          fld('Target Vm',        `${entry.targetVm} ${UNIT.MV}`),
          fld('Selectivity',      `${entry.selectivity}×`),
          fld('Target DR',        `${(entry.targetRatio * 100).toFixed(1)}%`),
          fld('Healthy DR',       `${(entry.healthyRatio * 100).toFixed(1)}%`),
          fld('Target T_ss',      `${entry.targetTemp} ${UNIT.DEG_C}`),
          fld('Event',            entry.event),
          '',
          sep('═'),
          'Generated by BioResonance — biophysical field modelling platform',
        ]
        downloadText(lines.join('\n'), `entry_${entry.id}_methods.txt`)
        return
      }

      const h      = entry.healthySnap
      const t      = entry.targetSnap
      const isRes  = entry.chartMode === 'resonance'
      const isPulsed = entry.waveform === 'pulsed'
      const isDbl  = entry.doubleShellEnabled ?? false
      const cat    = t.category
      const medKey = entry.medium as MediumKey
      const medName = medKey in MEDIA ? MEDIA[medKey].name : entry.medium
      const sigE   = entry.sigmaE ?? 0
      const cosTheta = Math.cos((entry.orientationDeg ?? 0) * Math.PI / 180)
      const modelLabel = isRes ? 'Lorentzian resonance model' : 'Schwan model'

      const freqDisplay = entry.freqKHz >= 1e6
        ? `${(entry.freqKHz / 1e6).toFixed(3)} GHz`
        : entry.freqKHz >= 1000
          ? `${(entry.freqKHz / 1000).toFixed(3)} MHz`
          : `${entry.freqKHz} ${UNIT.KHZ}`
      const fieldDisplay = entry.fieldVcm >= 10000
        ? `${(entry.fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}`
        : `${entry.fieldVcm} ${UNIT.V_PER_CM}`

      const protocolLines: string[] = [
        fld('Medium',              medName),
        fld('Conductivity σe',     `${sigE.toFixed(3)} ${UNIT.S_PER_M}  [T-corrected at 37°C]`),
        fld('RF Frequency',        freqDisplay),
        fld('Electric Field E',    fieldDisplay),
        fld('Waveform',            `${(entry.waveform ?? 'cw').toUpperCase()}`),
        ...(isPulsed ? [
          fld('Duty cycle dc',     `${((entry.dutyCycle ?? 0) * 100).toExponential(2)}%`),
          fld('Pulse width t_p',   `${entry.pulseWidthNs ?? '—'} ${UNIT.NS}`),
          fld('N-pulses (lysis)',  `${entry.lysisNPulses ?? '—'}`),
        ] : []),
        fld('Cell orientation θ',  `${entry.orientationDeg ?? 0}°  (cos θ = ${cosTheta.toFixed(3)})`),
      ]

      const computedLines: string[] = [
        fld('Healthy Vm',           `${entry.healthyVm} ${UNIT.MV}`),
        fld('Target Vm / DR',       `${entry.targetVm} ${UNIT.MV}  |  ${(entry.targetRatio * 100).toFixed(1)}%  [${modelLabel}]`),
        fld('Healthy DR',           `${(entry.healthyRatio * 100).toFixed(1)}%`),
        fld('Selectivity (TI)',     `${entry.selectivity}×`),
        fld('Healthy T_ss',         `${entry.healthyTemp} ${UNIT.DEG_C}`),
        fld('Target T_ss',          `${entry.targetTemp} ${UNIT.DEG_C}`),
        fld('Event',                entry.event),
      ]
      if (isDbl && entry.healthyNuclearVm !== undefined) {
        computedLines.push(
          fld('Healthy nuclear Vm',  `${entry.healthyNuclearVm} ${UNIT.MV}`),
          fld('Target nuclear Vm',   `${entry.targetNuclearVm ?? '—'} ${UNIT.MV}`),
        )
      }

      const lines = [
        'MATERIALS AND METHODS — BioResonance Electroporation Simulation',
        sep('═'),
        `Session  : ${this.sessionName}`,
        `Entry    : #${entry.id}  logged at ${entry.timestamp}`,
        `Generated: ${new Date().toISOString()}`,
        `Model    : ${isRes ? 'Acoustic/Mechanical Resonance (Lorentzian)' : 'Transmembrane Voltage (Schwan/IRE)'}`,
        `Target   : ${cat.toUpperCase()} — ${t.label}`,
        '',
        'CELL MODELS',
        sep(),
        ...buildHealthySection(h, isDbl, medName),
        '',
        ...buildTargetSection(t, isRes, isDbl, medName),
        '',
        'EXPOSURE PROTOCOL',
        sep(),
        ...protocolLines,
        '',
        `RESULTS AT LOGGED PARAMETERS  [${modelLabel}]`,
        sep(),
        ...computedLines,
        '',
        'PHYSICAL MODEL',
        sep(),
        ...buildModelSection(isRes, isPulsed, isDbl),
        '',
        'REFERENCES',
        sep(),
        ...buildRefs(isRes, isDbl, cat),
        '',
        sep('═'),
        'Generated by BioResonance — biophysical field modelling platform',
      ]

      downloadText(
        lines.join('\n'),
        `${this.sessionName.replace(/\s+/g, '_')}_entry${entry.id}_methods.txt`,
      )
    },

    exportCSV() {
      const cell = useCellStore()
      const H = CELL_LABEL.HEALTHY
      const T = CELL_LABEL.TARGET

      const meta = [
        `# Session: ${this.sessionName}`,
        `# Exported: ${new Date().toISOString()}`,
        `# Healthy: ${cell.healthy.label} · R=${cell.healthy.radius} ${UNIT.UM} · fc=${cell.healthyFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Target:  ${cell.target.label} · R=${cell.target.radius} ${UNIT.UM} · fc=${cell.targetFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Medium: ${cell.medium} · σ_e=${cell.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
        `# Field: ${cell.currentBroadcastFrequency} ${UNIT.KHZ} · ${cell.fieldIntensity} ${UNIT.V_PER_CM} · ${cell.waveform} · dc=${cell.dutyCycle.toExponential(2)} · pw=${cell.pulseWidthNs} ${UNIT.NS}`,
        `# Model: Schwan equation (Kotnik & Miklavcic 2000) — BioResonance`,
      ].join('\n')

      const headers = [
        '#', 'Time', 'Session',
        `Freq (${UNIT.KHZ})`, `Field (${UNIT.V_PER_CM})`, 'Medium', 'Target',
        `${H}-Vm (${UNIT.MV})`, `${T}-Vm (${UNIT.MV})`, 'Selectivity',
        `${H}-Ratio`, `${T}-Ratio`,
        `${H}-Temp (${UNIT.DEG_C})`, `${T}-Temp (${UNIT.DEG_C})`, 'Event',
      ]
      const rows = this.entries.map((e) => [
        e.id, e.timestamp, this.sessionName, e.freqKHz, e.fieldVcm, e.medium, e.targetPreset,
        e.healthyVm, e.targetVm, e.selectivity,
        (e.healthyRatio * 100).toFixed(1) + UNIT.PERCENT,
        (e.targetRatio  * 100).toFixed(1) + UNIT.PERCENT,
        e.healthyTemp, e.targetTemp, e.event,
      ])

      const csv = meta + '\n' + [headers, ...rows].map((row) => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.sessionName.replace(/\s+/g, '_')}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  },
})
