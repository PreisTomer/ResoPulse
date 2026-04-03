// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Pure export-formatting utilities for experiment log entries.
// No store or Vue imports - all inputs arrive as plain parameters.

import { MEDIA } from '@/constants/media'
import { UNIT } from '@/constants/units'
import { CELL_LABEL, CHART_MODE } from '@/constants/strings'
import { TWO_PI, THRESHOLDS, NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF, EPSILON_R_CYTOPLASM, SIGMA_MEMBRANE_SI, TEMP_EP_COEFF, EPSILON_0 } from '@/constants/physics'

import type { MediumKey } from '@/types/media'
import type { CellParamSnapshot, LogEntry } from '@/types/experiment'
export const sep = (ch = '─', n = 54): string => ch.repeat(n)  // horizontal rule

export const fld = (label: string, value: string, width = 26): string =>  // left-padded key=value line
  `  ${label.padEnd(width)}= ${value}`

export function downloadText(txt: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([txt], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Section builders ───────────────────────────────────────────────────────

export function buildHealthySection(h: CellParamSnapshot, isDbl: boolean, mediumName: string): string[] {
  const cm      = (h.dielectricConstant * EPSILON_0 / (h.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const tau     = h.fc > 0 ? (1e6 / (TWO_PI * h.fc)).toFixed(0) : ', '
  const sigmaMem = h.membraneConductivity ?? SIGMA_MEMBRANE_SI
  const lines: string[] = [
    `Reference (Healthy): ${h.label}`,
    fld('Radius R',                `${h.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',    `${h.membraneThickness} ${UNIT.NM}`),
    fld('Membrane permittivity εr', `${h.dielectricConstant}`),
    fld('Membrane conductivity σm', `${sigmaMem.toExponential(1)} ${UNIT.S_PER_M}  [lipid bilayer leakage, Gascoyne 2002]`),
    fld('Cytoplasm conductivity σi', `${h.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm',  `${cm} ${UNIT.MF_PER_M2}  [εr·ε0/d]`),
    fld('Cell density ρ',           `${h.density} kg/m³`),
    fld('Specific heat cp',         `${h.specificHeatCapacity} J/(kg·K)`),
    fld('Lysis threshold Vm,thr',   `${h.thresholdVoltage} ${UNIT.V}  [base, at 37°C]`),
    fld('Time constant τ',          `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
    fld('Corner frequency fc',      `${h.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
  ]
  if (isDbl && h.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${h.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${h.nuclearMembraneThickness ?? 'n/a'} ${UNIT.NM}`),
      fld('Nuclear mem. εr',        `${h.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${h.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
  return lines
}

export function buildTargetSection(t: CellParamSnapshot, isRes: boolean, isDbl: boolean, mediumName: string): string[] {
  const cm       = (t.dielectricConstant * EPSILON_0 / (t.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const sigmaMem = t.membraneConductivity ?? SIGMA_MEMBRANE_SI
  const lines: string[] = [
    `Target Cell: ${t.label}  [category: ${t.category}]`,
    fld('Radius R',                 `${t.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',     `${t.membraneThickness} ${UNIT.NM}`),
    fld('Membrane permittivity εr', `${t.dielectricConstant}`),
    fld('Membrane conductivity σm', `${sigmaMem.toExponential(1)} ${UNIT.S_PER_M}  [lipid bilayer leakage, Gascoyne 2002]`),
    fld('Cytoplasm conductivity σi', `${t.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm',  `${cm} ${UNIT.MF_PER_M2}  [εr·ε0/d]`),
    fld('Cell density ρ',           `${t.density} kg/m³`),
    fld('Specific heat cp',         `${t.specificHeatCapacity} J/(kg·K)`),
  ]
  if (isRes && t.resonantFreqGHz) {
    const fResGHz  = t.resonantFreqGHz.toFixed(3)
    const fResMHz  = (t.resonantFreqGHz * 1000).toFixed(0)
    const qNominal = t.capsidQ?.toFixed(0) ?? ', '
    const qMin     = t.capsidQMin?.toFixed(0) ?? qNominal
    const qMax     = t.capsidQMax?.toFixed(0) ?? qNominal
    lines.push(
      fld('Resonant frequency f_res', `${fResGHz} ${UNIT.GHZ}  (${fResMHz} ${UNIT.MHZ})`),
      fld('Quality factor Q',         `${qNominal}  [range: ${qMin} - ${qMax}]`),
      fld('Resonant threshold E_thr', `${t.resonantThresholdVcm?.toFixed(0) ?? ', '} ${UNIT.V_PER_CM}`),
      fld('f_res uncertainty',        `±${t.resonantFreqUncertaintyPct?.toFixed(0) ?? ', '}%`),
      fld('Experimental basis',       t.experimentalBasis ?? 'unknown'),
    )
  } else {
    const tau = t.fc > 0 ? (1e6 / (TWO_PI * t.fc)).toFixed(0) : ', '
    lines.push(
      fld('Lysis threshold Vm,thr', `${t.thresholdVoltage} ${UNIT.V}  [base, at 37°C]`),
      fld('Time constant τ',        `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
      fld('Corner frequency fc',    `${t.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
    )
  }
  if (isDbl && t.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${t.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${t.nuclearMembraneThickness ?? 'n/a'} ${UNIT.NM}`),
      fld('Nuclear mem. εr',        `${t.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${t.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
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
      'Viscoelastic peptidoglycan wall → low Q (Q = 3-4) vs. stiff protein capsids.',
    )
  }
  return lines
}

export function buildModelSection(isRes: boolean, isPulsed: boolean, isDbl: boolean, isHFire = false): string[] {
  const lines: string[] = []
  if (isRes) {
    lines.push(
      'Acoustic / mechanical resonance, Lorentzian model (Tsen et al. 2007):',
      '  DR(f) = 1 / √(1 + Q² · (f/f_res − f_res/f)²)',
      '  f_res : fundamental resonant frequency of the capsid shell',
      '  Q     : quality factor (sharpness of resonance)',
      '  Inactivation occurs when DR(f) · E ≥ E_thr',
      '',
      'Healthy cell transmembrane voltage, Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
    )
  } else {
    lines.push(
      'Transmembrane voltage: Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
      '  Cm = εr · ε0 / d',
    )
  }
  lines.push(
    '',
    'Specific absorption rate (SAR) and thermal model (Pennes 1948; Newton cooling):',
    '  SAR = σi · α² · E² · wf / ρ        [W/kg]',
    '  α = 3σe / (2σe + σi)               [internal field coupling, Schwan 1957]',
    '  wf: 0.5 for CW (E²_rms = E²_peak/2); 1.0 for pulsed/H-FIRE',
    '  SAR_eff = SAR × dc',
    '  T_ss = 37 + SAR_eff / ((λ_Newton + λ_perf) × cp)',
    `  λ_Newton = ${NEWTON_COOLING_LAMBDA} s⁻¹ (surface/diffusion cooling, Newton approximation)`,
    `  λ_perf   = ω_b × ${PENNES_BLOOD_COEFF} / cp    [Pennes blood perfusion; ω_b = 0 for in-vitro]`,
    '  cp: cell-specific heat capacity [J/(kg·K)] — see CELL MODELS section',
    '  ρ: cell-specific density [kg/m³] — see CELL MODELS section',
    '  NOTE: model assumes uniform field, negligible conduction, in-vitro (ω_b = 0)',
  )
  if ((isPulsed || isHFire) && !isRes) {
    lines.push(
      '',
      'Pulse charging: pulse envelope factor (Weaver & Chizmadzhev 1996):',
      '  PEF = 1 − exp(−t_p / τ)   [fraction of steady-state Vm reached]',
      '  Effective Vm = Vm(f) · PEF',
      '  At t_p < τ: membrane substantially undercharged (PEF < 0.63)',
      '  At t_p ≥ 3τ: membrane reaches ≥95% plateau (full charging)',
    )
  }
  if (isHFire) {
    lines.push(
      '',
      'H-FIRE waveform: bipolar burst delivery (Arena et al. 2011; Sano et al. 2015):',
      '  Carrier frequency > 1 kHz → below neuromuscular activation threshold.',
      '  Polarity reversals partially discharge membrane capacitance between half-cycles.',
      '  Effective lysis threshold = Vm,threshold × 1.75',
      '  NOTE: 1.75 is a simulation parameter (empirical range 1.5-2×, midpoint used,',
      '  Arena 2011). It is not a measured physical constant — treat DR values in',
      '  H-FIRE mode as approximate. Validate experimentally for each cell type.',
      '  Disruption Ratio = Vm × PEF / (Vm,threshold × 1.75).',
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
  if (!isRes) {
    lines.push(
      '',
      'Dielectrophoresis (DEP), Clausius-Mossotti factor (Gascoyne & Vykoukal 2002):',
      '  F_DEP ∝ ∇|E|² · Re[K(ω)]',
      '  K(ω) = (ε*_eff − ε*_m) / (ε*_eff + 2ε*_m)',
      '  ε*(ω) = ε_r·ε₀ − j·σ/ω   (complex permittivity)',
      '  Single-shell effective permittivity:',
      '    γ = ((R−d)/R)³',
      '    ε*_eff = ε*_mem · [γ(ε*_c + 2ε*_mem) + 2(ε*_c − ε*_mem)]',
      '                     / [γ(ε*_c + 2ε*_mem) − (ε*_c − ε*_mem)]',
      '  Fixed DEP model constants (per Gascoyne 2002; Pethig 2010):',
      `    ε_r,cyto = ${EPSILON_R_CYTOPLASM}          (cytoplasm; macromolecular crowding, Pethig 2010)`,
      `    σ_mem    = ${SIGMA_MEMBRANE_SI.toExponential(1)} S/m  (intact lipid bilayer leakage; cell-specific override where available)`,
      '  Medium parameters used (see EXPOSURE PROTOCOL):',
      '    ε_r,medium = as reported; σ_e = as reported',
      '  Re[K] > 0 → positive DEP (attracted to field maxima)',
      '  Re[K] < 0 → negative DEP (repelled from field maxima)',
      '  Waveform force scale: CW ×0.5 ; pulsed H-FIRE ×duty-cycle',
      '  NOTE: DEP model invalid at GHz acoustic resonance frequencies.',
      '  NOTE: crossover frequency f_cross reported only when found within 1 kHz-100 MHz range.',
    )
  }
  return lines
}

export function buildRefs(isRes: boolean, isDbl: boolean, cat: string, isHFire = false): string[] {
  const refs: string[] = []
  let i = 1
  refs.push(
    `[${i++}] Schwan, H.P. (1957). Electrical properties of tissue and cell suspensions.`,
    '    Adv. Biol. Med. Phys. 5, 147-209.',
    '    [Sphere factor 1.5, internal field coupling α, single-shell model origin]',
    `[${i++}] Kotnik, T. & Miklavcic, D. (2000). Analytical description of transmembrane voltage`,
    '    induced by electric fields on spheroidal cells. Biophys. J. 79(2), 670-679.',
    `[${i++}] Weaver, J.C. & Chizmadzhev, Y.A. (1996). Theory of electroporation: a review.`,
    '    Bioelectrochem. Bioenerg. 41(2), 135-160.',
    `[${i++}] Pennes, H.H. (1948). Analysis of tissue and arterial blood temperatures in the`,
    '    resting human forearm. J. Appl. Physiol. 1(2), 93-122.',
    '    [Bioheat equation; thermal model basis]',
  )
  if (isDbl) refs.push(
    `[${i++}] Kotnik, T. & Miklavcic, D. (2006). Theoretical evaluation of voltage inducement`,
    '    on internal membranes of biological cells exposed to electric fields.',
    '    Biophys. J. 90(2), 480-491.',
  )
  if (!isRes) {
    refs.push(
      `[${i++}] Gascoyne, P.R.C. & Vykoukal, J. (2002). Particle separation by dielectrophoresis.`,
      '    Electrophoresis 23(13), 1973-1983.',
      `[${i++}] Pethig, R. (2010). Dielectrophoresis: Status of the theory, technology and applications.`,
      '    Biomicrofluidics 4(2), 022811.',
      '    [ε_r,cyto = 60, cytoplasm effective permittivity with macromolecular crowding]',
    )
  }
  if (isRes) {
    refs.push(
      `[${i++}] Tsen, S.W.D. et al. (2007). Non-thermal effects in the inactivation of viruses.`,
      '    J. Phys. D: Appl. Phys. 40(15), 4571-4577.',
      `[${i++}] Dykeman, E.C. & Sankey, O.F. (2008). Low-frequency mechanical modes of viral capsids.`,
      '    Phys. Rev. Lett. 100(2), 028101.',
    )
    if (cat === 'virus') refs.push(
      `[${i++}] Sankey, O.F. et al. (2009). Simulations of the mechanical modes of viral capsids.`,
      '    Proc. Natl. Acad. Sci. USA 106(30), 12347-12352.',
    )
  }
  if (isHFire) {
    refs.push(
      `[${i++}] Arena, C.B. et al. (2011). High-frequency irreversible electroporation (H-FIRE)`,
      '    for non-thermal ablation without muscle contraction.',
      '    Biomed. Eng. Online 10:102. doi:10.1186/1475-925X-10-102',
      `[${i++}] Sano, M.B. et al. (2015). Bursts of bipolar microsecond pulses inhibit tumor growth.`,
      '    Sci. Rep. 5:14999. doi:10.1038/srep14999',
    )
  }
  return refs
}

// ── Per-entry computation helpers (pure - no store/Vue imports) ───────────

// SAR = σ_i·α²·E²·wf/ρ, α = 3σ_e/(2σ_e+σ_i)  (Schwan 1957)
// wf: 0.5 for CW (E²_rms = E²_peak/2), 1.0 for pulsed/H-FIRE
function computeSAR(sigmaI: number, sigmaE: number, fieldVcm: number, wf: number, density: number): number {
  const alpha = (3 * sigmaE) / (2 * sigmaE + sigmaI)
  const E_vm  = fieldVcm * 100    // V/cm → V/m
  return sigmaI * alpha * alpha * E_vm * E_vm * wf / density
}

// PEF = 1−exp(−t_p/τ), τ = 1/(2π·fc)
function computePEF(pulseWidthNs: number, fcKHz: number): number {
  const tauS = 1 / (TWO_PI * fcKHz * 1000)   // τ [s]
  const tpS  = pulseWidthNs / 1e9             // t_p [s]
  return 1 - Math.exp(-tpS / tauS)
}

function classifyDR(ratio: number): string {
  if (ratio >= THRESHOLDS.DISRUPTION_WARN)     return 'LYSIS-ARMED, irreversible EP zone (sustained → lysis)'
  if (ratio >= THRESHOLDS.HEALTHY_APPROACHING) return 'Reversible EP, membrane transiently permeabilised, recoverable'
  if (ratio >= THRESHOLDS.NOURISHING)          return 'Approaching, sub-EP membrane stress, ion-channel perturbation'
  if (ratio >= THRESHOLDS.VIBRATING_MIN)       return 'Nourishing, sub-threshold biomodulation window'
  return 'Sub-threshold, minimal membrane effect'
}

function classifySelectivity(sel: number): string {
  if (sel >= THRESHOLDS.SEL_STRONG)   return 'Strong selectivity window'
  if (sel >= THRESHOLDS.SEL_MARGINAL) return 'Marginal selectivity window'
  return 'Non-selective'
}

// Lysis delay [ms] — matches lysisDelayMs getter in cellStore
function computeLysisDelayMs(entry: LogEntry): number {
  if ((entry.waveform === 'pulsed' || entry.waveform === 'hfire') && entry.pulseWidthNs && entry.dutyCycle) {
    const tpS = entry.pulseWidthNs / 1e9
    const raw = (entry.lysisNPulses ?? 1) * (tpS / entry.dutyCycle) * 1000
    return Math.min(Math.max(raw, 200), 30_000)
  }
  return 2500   // CW default
}

// ── Full document assemblers ───────────────────────────────────────────────

export function buildEntryMethodsText(entry: LogEntry, sessionName: string, sampleDescription = ''): { text: string; filename: string } {
  const entrySession = entry.sessionName ?? sessionName
  const filename = `${entrySession.replace(/\s+/g, '_')}_entry${entry.id}_methods.txt`

  if (!entry.healthySnap || !entry.targetSnap) {
    // Legacy entry - no snapshot
    const medName = entry.medium in MEDIA ? MEDIA[entry.medium as MediumKey].name : entry.medium
    const text = [
      'MATERIALS AND METHODS: ResoPulse',
      sep('═'),
      `Session  : ${entrySession}`,
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
      'Generated by ResoPulse: virtual biophysics engine',
      'Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.',
    ].join('\n')
    return { text, filename: `entry_${entry.id}_methods.txt` }
  }

  const h         = entry.healthySnap
  const t         = entry.targetSnap
  const isRes           = entry.chartMode === CHART_MODE.RESONANCE
  const isPulsed        = entry.waveform === 'pulsed'
  const isHFire         = entry.waveform === 'hfire'
  const isPulsedOrHFire = isPulsed || isHFire
  const isDbl           = entry.doubleShellEnabled ?? false
  const cat       = t.category
  const medKey    = entry.medium as MediumKey
  const medName   = medKey in MEDIA ? MEDIA[medKey].name : entry.medium
  const sigE      = entry.sigmaE ?? 0
  const cosTheta  = Math.cos((entry.orientationDeg ?? 0) * Math.PI / 180)
  const modelLabel = isRes ? 'Lorentzian resonance model' : 'Schwan model'

  const freqDisplay = entry.freqKHz >= 1e6
    ? `${(entry.freqKHz / 1e6).toFixed(3)} ${UNIT.GHZ}`
    : entry.freqKHz >= 1000
      ? `${(entry.freqKHz / 1000).toFixed(3)} ${UNIT.MHZ}`
      : `${entry.freqKHz} ${UNIT.KHZ}`
  const fieldDisplay = entry.fieldVcm >= 10000
    ? `${(entry.fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${entry.fieldVcm} ${UNIT.V_PER_CM}`

  const medEntry   = medKey in MEDIA ? MEDIA[medKey] : null
  const baseS      = entry.mediumBaseS   ?? medEntry?.conductivity
  const tempCoeff  = entry.mediumTempCoeff  ?? medEntry?.tempCoeff
  const medEpsR    = entry.mediumPermittivity ?? medEntry?.permittivity
  const perfRate   = entry.perfusionRate  ?? 0
  const phi        = entry.cellPackingFraction ?? 0

  const formatDutyCycle = (dc: number): string => {
    const pct = dc * 100
    return pct >= 0.1 ? `${pct.toFixed(pct < 1 ? 2 : 1)}%` : `${dc.toExponential(2)} (fraction)`
  }

  const sigmaCorr = baseS !== undefined && tempCoeff !== undefined
    ? `σe,0 = ${baseS.toFixed(3)} ${UNIT.S_PER_M}  |  tempCoeff = ${tempCoeff.toFixed(3)} /°C  |  σe(T) = σe,0 × (1 + tempCoeff × (T − 37))`
    : 'see medium reference'

  const protocolLines: string[] = [
    fld('Medium',               medName),
    fld('Conductivity σe (eff)', `${sigE.toFixed(4)} ${UNIT.S_PER_M}  [T-corrected]`),
    fld('σe correction',         sigmaCorr),
    fld('Medium permittivity εr', `${medEpsR ?? 'n/a'}  [used in DEP Clausius-Mossotti]`),
    ...(phi > 0 ? [fld('Cell packing fraction φ', `${phi.toFixed(3)}  [Maxwell-Garnett σe correction applied]`)] : []),
    fld('RF Frequency',          freqDisplay),
    fld('Electric Field E',      fieldDisplay),
    fld('Waveform',              `${(entry.waveform ?? 'cw').toUpperCase()}${isHFire ? '  [H-FIRE bipolar burst, Vth × 1.75 — model parameter, see PHYSICAL MODEL]' : ''}`),
    ...(isPulsedOrHFire ? [
      fld('Duty cycle dc',       formatDutyCycle(entry.dutyCycle ?? 0)),
      fld('Pulse width t_p',     `${entry.pulseWidthNs ?? ', '} ${UNIT.NS}`),
      fld('N-pulses (lysis)',    `${entry.lysisNPulses ?? ', '}`),
    ] : []),
    fld('Cell orientation θ',    `${entry.orientationDeg ?? 0}°  (cos θ = ${cosTheta.toFixed(3)})`),
    ...(perfRate > 0 ? [fld('Perfusion rate ω_b', `${perfRate.toFixed(2)} mL/(g·min)  [Pennes perfusion term active]`)] : [
      fld('Perfusion rate ω_b',  `0  [in-vitro, no perfusion cooling]`),
    ]),
  ]

  // ── Per-cell biophysical results ───────────────────────────────────────────

  const sigmaE_val  = entry.sigmaE ?? 0
  const isPulsedSch = isPulsedOrHFire && !isRes   // PEF only applies in Schwan/IRE mode

  const formatDC = (dc: number): string => `(×dc = ${dc >= 0.001 ? (dc * 100).toFixed(1) + '%' : dc.toExponential(2)})`

  // Healthy cell block
  const wf       = (entry.waveform === 'pulsed' || entry.waveform === 'hfire') ? 1.0 : 0.5
  const hSAR     = computeSAR(h.conductivity, sigmaE_val, entry.fieldVcm, wf, h.density)
  const hSARAvg  = hSAR * (entry.dutyCycle ?? 1)
  const hPEF     = isPulsedSch && entry.pulseWidthNs && h.fc > 0
    ? computePEF(entry.pulseWidthNs, h.fc)
    : null
  const hDRState = classifyDR(entry.healthyRatio)
  const hVthEff  = h.thresholdVoltage * Math.max(0.70, 1 - TEMP_EP_COEFF * Math.max(0, entry.healthyTemp - 37))

  const healthyLines: string[] = [
    `Reference (Healthy): ${h.label}`,
    fld('Vm (Schwan)',            `${entry.healthyVm} ${UNIT.MV}`),
    fld('Lysis Vth (effective)',  `${(hVthEff * 1000).toFixed(1)} ${UNIT.MV}  [base ${(h.thresholdVoltage * 1000).toFixed(0)} mV corrected at ${entry.healthyTemp}°C  ×max(0.70, 1−0.003×(T−37))]`),
    fld('Disruption ratio DR',   `${(entry.healthyRatio * 100).toFixed(2)}%  [single-cell nominal radius]  ${hDRState}`),
    ...(hPEF !== null ? [fld('Pulse env. factor PEF', `${hPEF.toFixed(4)}  [1−exp(−t_p/τ)  t_p=${entry.pulseWidthNs}ns  τ=${(1e9 / (TWO_PI * h.fc * 1000)).toFixed(0)}ns]`)] : []),
    fld('SAR (instantaneous)',   `${hSAR.toFixed(3)} ${UNIT.W_PER_KG}  [σi·α²·E²·wf/ρ  ρ=${h.density} kg/m³]`),
    fld('SAR (time-averaged)',   `${hSARAvg.toFixed(4)} ${UNIT.W_PER_KG}  ${formatDC(entry.dutyCycle ?? 1)}`),
    fld('Steady-state T_ss',    `${entry.healthyTemp} ${UNIT.DEG_C}  [37 + SAR_eff/((λ_N+λ_p)×cp)  cp=${h.specificHeatCapacity} J/(kg·K)]`),
    ...(isDbl && entry.healthyNuclearVm !== undefined ? [fld('Nuclear Vm',   `${entry.healthyNuclearVm} ${UNIT.MV}`)] : []),
    ...(!isRes && entry.depHealthyK !== undefined ? (() => {
      const xover = entry.depHealthyCrossoverKHz
      return [fld('Re[K] (DEP)',  `${entry.depHealthyK.toFixed(4)}  [${entry.depHealthyK > 0 ? 'pDEP: attracted to field maxima' : 'nDEP: repelled from field maxima'}]  f_cross = ${xover ? xover.toFixed(1) + ' ' + UNIT.KHZ : 'none in range'}`)]
    })() : []),
  ]

  // Target cell block
  const tSAR    = computeSAR(t.conductivity, sigmaE_val, entry.fieldVcm, wf, t.density)
  const tSARAvg = tSAR * (entry.dutyCycle ?? 1)
  const tPEF    = isPulsedSch && entry.pulseWidthNs && t.fc > 0
    ? computePEF(entry.pulseWidthNs, t.fc)
    : null
  const tDRState = classifyDR(entry.targetRatio)
  const tVthEff  = t.thresholdVoltage * Math.max(0.70, 1 - TEMP_EP_COEFF * Math.max(0, entry.targetTemp - 37))

  const targetLines: string[] = [
    `Target Cell: ${t.label}  [category: ${t.category}]`,
    ...(isRes
      ? [fld('Vm (Schwan)', `< 0.01 ${UNIT.MV}  [Vm → 0 at f_res; ωτ >> 1; disruption governed by Lorentzian DR below]`)]
      : [fld('Vm (Schwan)', `${entry.targetVm} ${UNIT.MV}`)]),
    fld('Lysis Vth (effective)',  `${(tVthEff * 1000).toFixed(1)} ${UNIT.MV}  [base ${(t.thresholdVoltage * 1000).toFixed(0)} mV corrected at ${entry.targetTemp}°C  ×max(0.70, 1−0.003×(T−37))]`),
    fld('Disruption ratio DR',   `${(entry.targetRatio * 100).toFixed(2)}%  [single-cell nominal radius]  ${tDRState}`),
    ...(tPEF !== null ? [fld('Pulse env. factor PEF', `${tPEF.toFixed(4)}  [1−exp(−t_p/τ)  t_p=${entry.pulseWidthNs}ns  τ=${(1e9 / (TWO_PI * t.fc * 1000)).toFixed(0)}ns]`)] : []),
    fld('SAR (instantaneous)',   `${tSAR.toFixed(3)} ${UNIT.W_PER_KG}  [σi·α²·E²·wf/ρ  ρ=${t.density} kg/m³]`),
    fld('SAR (time-averaged)',   `${tSARAvg.toFixed(4)} ${UNIT.W_PER_KG}  ${formatDC(entry.dutyCycle ?? 1)}`),
    fld('Steady-state T_ss',    `${entry.targetTemp} ${UNIT.DEG_C}  [37 + SAR_eff/((λ_N+λ_p)×cp)  cp=${t.specificHeatCapacity} J/(kg·K)]`),
    ...(isDbl && entry.targetNuclearVm !== undefined ? [fld('Nuclear Vm',   `${entry.targetNuclearVm} ${UNIT.MV}`)] : []),
    ...(!isRes && entry.depTargetK !== undefined ? (() => {
      const xover = entry.depTargetCrossoverKHz
      return [fld('Re[K] (DEP)',  `${entry.depTargetK.toFixed(4)}  [${entry.depTargetK > 0 ? 'pDEP: attracted to field maxima' : 'nDEP: repelled from field maxima'}]  f_cross = ${xover ? xover.toFixed(1) + ' ' + UNIT.KHZ : 'none in range'}`)]
    })() : []),
  ]

  // ── Protocol assessment block ──────────────────────────────────────────────
  const inWindow      = entry.targetRatio >= THRESHOLDS.DISRUPTION_WARN && entry.healthyRatio < THRESHOLDS.HEALTHY_APPROACHING
  const selClass      = classifySelectivity(entry.selectivity)
  const vmSelRatio    = entry.healthyVm > 0 ? entry.targetVm / entry.healthyVm : 0
  const lysisDelayMs  = computeLysisDelayMs(entry)

  const assessmentLines: string[] = [
    fld('Selectivity ratio (SR)', `${entry.selectivity.toFixed(3)}×  ${selClass}`),
    fld('Vm selectivity',         `${vmSelRatio.toFixed(3)}×  (Vm_T / Vm_H, orientation-independent)`),
    fld('Protocol window',        inWindow
      ? `YES: target DR ${(entry.targetRatio * 100).toFixed(1)}% >= 85%  |  healthy DR ${(entry.healthyRatio * 100).toFixed(1)}% < 50%`
      : `NO: target DR ${(entry.targetRatio * 100).toFixed(1)}%  |  healthy DR ${(entry.healthyRatio * 100).toFixed(1)}%`),
    ...(entry.event === 'lysis'
      ? [fld('Lysis delay (modelled)', `${lysisDelayMs.toFixed(0)} ms  [max(200ms, min(30s, N×t_p/dc))${isPulsedOrHFire ? `  N=${entry.lysisNPulses ?? 1} × ${entry.pulseWidthNs}ns / ${(entry.dutyCycle ?? 1).toExponential(2)}` : '  CW default 2500ms'}]`)]
      : []),
    fld('Event',                  entry.event),
    '',
    'POPULATION NOTE: DR values above represent the single-cell (modal/nominal radius)',
    'calculation. Population-level lysis fraction (log-normal radius distribution,',
    'CV ≈ 25% mammalian / 22% bacteria / 8% virus) is not included in this entry.',
  ]


  const resolvedSample = sampleDescription || entry.sampleDescription || ''

  const text = [
    'MATERIALS AND METHODS: ResoPulse Electroporation Simulation',
    sep('═'),
    `Session  : ${entrySession}`,
    `Entry    : #${entry.id}  logged at ${entry.timestamp}`,
    `Generated: ${new Date().toISOString()}`,
    `Model    : ${isRes ? 'Acoustic/Mechanical Resonance (Lorentzian)' : 'Transmembrane Voltage (Schwan/IRE)'}`,
    `Target   : ${cat.toUpperCase()}, ${t.label}`,
    ...(resolvedSample ? [`Sample   : ${resolvedSample}`] : []),
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
    ...healthyLines,
    '',
    ...targetLines,
    '',
    'PROTOCOL ASSESSMENT',
    sep(),
    ...assessmentLines,
    '',
    'PHYSICAL MODEL',
    sep(),
    ...buildModelSection(isRes, isPulsed, isDbl, isHFire),
    '',
    'REFERENCES',
    sep(),
    ...buildRefs(isRes, isDbl, cat, isHFire),
    '',
    sep('═'),
    'ResoPulse: virtual in-vitro biophysics engine',
    'Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.',
  ].join('\n')

  return { text, filename }
}

export interface CellExportMeta {
  healthyLabel: string
  healthyRadius: number
  healthyFc: number
  targetLabel: string
  targetRadius: number
  targetFc: number
  medium: string
  effectiveSigmaE: number
  currentBroadcastFrequency: number
  fieldIntensity: number
  waveform: string
  dutyCycle: number
  pulseWidthNs: number
}

export function buildCsvText(
  entries: LogEntry[],
  sessionName: string,
  sampleDescription: string,
  sessionNotes: string,
  cell: CellExportMeta,
): { text: string; filename: string } {
  const H = CELL_LABEL.HEALTHY
  const T = CELL_LABEL.TARGET

  const distinctSessions = [...new Set(entries.map((e) => e.sessionName ?? sessionName))]
  const meta = [
    `# Sessions: ${distinctSessions.join(' | ')}`,
    `# Exported: ${new Date().toISOString()}`,
    ...(sampleDescription ? [`# Sample: ${sampleDescription}`] : []),
    ...(sessionNotes      ? [`# Notes: ${sessionNotes}`]       : []),
    `# Healthy: ${cell.healthyLabel} · R=${cell.healthyRadius} ${UNIT.UM} · fc=${cell.healthyFc.toFixed(0)} ${UNIT.KHZ}`,
    `# Target:  ${cell.targetLabel} · R=${cell.targetRadius} ${UNIT.UM} · fc=${cell.targetFc.toFixed(0)} ${UNIT.KHZ}`,
    `# Medium: ${cell.medium} · σ_e=${cell.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
    `# Field: ${cell.currentBroadcastFrequency} ${UNIT.KHZ} · ${cell.fieldIntensity} ${UNIT.V_PER_CM} · ${cell.waveform} · dc=${cell.dutyCycle.toExponential(2)} · pw=${cell.pulseWidthNs} ${UNIT.NS}`,
    `# Model: Schwan equation (Kotnik & Miklavcic 2000), ResoPulse`,
    `# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.`,
  ].join('\n')

  const headers = [
    '#', 'Time', 'Session',
    `Freq (${UNIT.KHZ})`, `Field (${UNIT.V_PER_CM})`, 'Medium', 'Target',
    `${T}-Vm (${UNIT.MV})`, `${H}-Vm (${UNIT.MV})`, 'Selectivity',
    `${T}-Ratio (%)`, `${H}-Ratio (%)`,
    `${T}-Temp (${UNIT.DEG_C})`, `${H}-Temp (${UNIT.DEG_C})`,
    `Orientation (${UNIT.DEG})`,
    `${H}-Re[K]`, `${T}-Re[K]`,
    `${H}-f_cross (${UNIT.KHZ})`, `${T}-f_cross (${UNIT.KHZ})`,
    `${H}-BMS`,
    'Event',
  ]
  const rows = entries.map((e) => [
    e.id, e.timestamp, e.sessionName ?? sessionName, e.freqKHz, e.fieldVcm, e.medium, e.targetPreset,
    e.targetVm, e.healthyVm, e.selectivity,
    (e.targetRatio  * 100).toFixed(1),
    (e.healthyRatio * 100).toFixed(1),
    e.targetTemp, e.healthyTemp,
    e.orientationDeg ?? 0,
    e.depHealthyK ?? '', e.depTargetK ?? '',
    e.depHealthyCrossoverKHz ?? '', e.depTargetCrossoverKHz ?? '',
    e.healthyBiomodScore ?? '',
    e.event,
  ])

  const text = meta + '\n' + [headers, ...rows].map((row) => row.join(',')).join('\n')
  const filename = `${sessionName.replace(/\s+/g, '_')}_${Date.now()}.csv`
  return { text, filename }
}
