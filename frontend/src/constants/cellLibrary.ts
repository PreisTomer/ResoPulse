/**
 * Biologically realistic cell/pathogen presets.
 * All Schwan model parameters are approximate values from bioelectromagnetics literature.
 * Bacterial and viral values use a spherical single-shell approximation.
 */
import type { CellConfig } from '../types/cell'

export type CellGroup = 'reference' | 'cancer' | 'bacteria' | 'virus'

export interface CellPreset extends CellConfig {
  presetId: string
  group: CellGroup
  shortLabel: string
  notes: string
  /** Extended technical notes shown in tooltip (optional — omit for presets with short notes) */
  techNotes?: string
}

// GROUP_COLORS defined in theme/colors.ts — re-exported here for back-compat
import { GROUP_COLORS as _GROUP_COLORS } from '../theme/colors'
export const GROUP_COLORS: Record<CellGroup, string> = _GROUP_COLORS

export const GROUP_LABELS: Record<CellGroup, string> = {
  reference: 'Reference',
  cancer:    'Cancer',
  bacteria:  'Bacteria',
  virus:     'Virus',
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const CELL_PRESETS: CellPreset[] = [
  // ── Reference cells ────────────────────────────────────────────────────────
  {
    presetId: 'hepatocyte',
    group: 'reference',
    id: 'hepatocyte',
    type: 'healthy',
    label: 'Healthy Hepatocyte',
    shortLabel: 'Hepatocyte',
    notes: 'Liver epithelial cell · baseline reference',
    radius: 10,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 1.1,
    dielectricConstant: 5.0,
    conductivity: 0.5,
    density: 1050,
    specificHeatCapacity: 3500,
    amplitude: 0.8,
    // Nuclear envelope (double-shell model): capacitive-limit formula used (σ_ne → 0 assumption)
    nuclearRadius: 5.0, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 0.9, nuclearThresholdVoltage: 0.50,
  },
  {
    presetId: 'rbc',
    group: 'reference',
    id: 'rbc',
    type: 'healthy',
    label: 'Red Blood Cell',
    shortLabel: 'RBC',
    notes: 'Erythrocyte · R = 4 µm · no nucleus',
    radius: 4,
    membraneThickness: 8,
    naturalFrequency: 500,
    thresholdVoltage: 1.0,
    dielectricConstant: 4.5,
    conductivity: 0.3,
    density: 1100,
    specificHeatCapacity: 3800,
    amplitude: 0.7,
  },

  // ── Cancer cells ────────────────────────────────────────────────────────────
  {
    presetId: 'adenocarcinoma',
    group: 'cancer',
    id: 'adenocarcinoma',
    type: 'target',
    label: 'Adenocarcinoma',
    shortLabel: 'Adeno CA',
    notes: 'R = 15 µm · thin membrane · high ε_r',
    radius: 15,
    membraneThickness: 5,
    naturalFrequency: 380,
    thresholdVoltage: 0.70,
    dielectricConstant: 8.5,
    conductivity: 0.9,
    density: 1080,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Nuclear envelope (high N/C ratio, thinner NE → lower f_peak, lower threshold)
    nuclearRadius: 8.0, nuclearMembraneThickness: 12, nuclearMembraneEps: 12,
    nucleoplasmConductivity: 1.1, nuclearThresholdVoltage: 0.40,
  },
  {
    presetId: 'gbm',
    group: 'cancer',
    id: 'gbm',
    type: 'target',
    label: 'Glioblastoma',
    shortLabel: 'GBM',
    notes: 'Brain tumor · R = 12 µm · high invasiveness',
    radius: 12,
    membraneThickness: 4.5,
    naturalFrequency: 450,
    thresholdVoltage: 0.65,
    dielectricConstant: 9.0,
    conductivity: 1.1,
    density: 1060,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Nuclear envelope (large aggressive nucleus, irregular NE, lower f_peak)
    nuclearRadius: 7.0, nuclearMembraneThickness: 11, nuclearMembraneEps: 12,
    nucleoplasmConductivity: 1.2, nuclearThresholdVoltage: 0.35,
  },
  {
    presetId: 'mcf7',
    group: 'cancer',
    id: 'mcf7',
    type: 'target',
    label: 'Breast MCF-7',
    shortLabel: 'MCF-7',
    notes: 'ER+ breast cancer · R = 11 µm · model cell line',
    radius: 11,
    membraneThickness: 5.5,
    naturalFrequency: 440,
    thresholdVoltage: 0.72,
    dielectricConstant: 7.5,
    conductivity: 0.8,
    density: 1070,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Nuclear envelope
    nuclearRadius: 6.0, nuclearMembraneThickness: 13, nuclearMembraneEps: 11,
    nucleoplasmConductivity: 1.0, nuclearThresholdVoltage: 0.42,
  },
  {
    presetId: 'hl60',
    group: 'cancer',
    id: 'hl60',
    type: 'target',
    label: 'Leukemia HL-60',
    shortLabel: 'HL-60',
    notes: 'Promyelocytic leukemia · R = 7 µm · suspended',
    radius: 7,
    membraneThickness: 6,
    naturalFrequency: 430,
    thresholdVoltage: 0.85,
    dielectricConstant: 6.5,
    conductivity: 0.7,
    density: 1080,
    specificHeatCapacity: 3300,
    amplitude: 0.5,
    // Nuclear envelope
    nuclearRadius: 4.0, nuclearMembraneThickness: 14, nuclearMembraneEps: 11,
    nucleoplasmConductivity: 1.0, nuclearThresholdVoltage: 0.45,
  },

  // ── Bacteria (spherical-shell approximation) ────────────────────────────────
  {
    presetId: 'ecoli',
    group: 'bacteria',
    id: 'ecoli',
    type: 'target',
    label: 'E. coli K-12',
    shortLabel: 'E. coli',
    notes: 'Gram-neg rod · 0.5×2 µm · spherical approx',
    techNotes: 'Rod geometry modelled as sphere (R = 1 µm).\nσ_i = 0.3 S/m (gram-negative cytoplasm, literature range 0.25–0.5 S/m).\nfc ≈ 11 MHz in saline · τ ≈ 14 ns.\nExpect 1.5–2× Vm underestimate vs rod model (Kotnik 2000).\nAcoustic resonance: f_res ≈ 0.5 GHz (v_wall ≈ 1000 m/s) · Q ≈ 15 · E_thr ≈ 2000 V/cm\nRef: Tsen et al. (2007); Dykeman & Sankey (2008)',
    radius: 1,
    membraneThickness: 8,
    naturalFrequency: 300,
    thresholdVoltage: 1.5,
    dielectricConstant: 3.5,
    conductivity: 0.3,
    resonantFreqGHz: 0.50,
    capsidQ: 15,
    resonantThresholdVcm: 2000,
    density: 1100,
    specificHeatCapacity: 4000,
    amplitude: 0.5,
  },
  {
    presetId: 'mrsa',
    group: 'bacteria',
    id: 'mrsa',
    type: 'target',
    label: 'MRSA',
    shortLabel: 'MRSA',
    notes: 'Staph. aureus · thick peptidoglycan wall · d = 20 nm',
    techNotes: 'Gram-positive coccus modelled as sphere (R = 0.5 µm).\nσ_i = 0.3 S/m (gram-positive range; thick wall raises effective resistance).\nfc ≈ 49 MHz in saline · τ ≈ 3.2 ns.\nAcoustic resonance: f_res ≈ 1.5 GHz (v_wall ≈ 1500 m/s, thick peptidoglycan) · Q ≈ 12 · E_thr ≈ 3000 V/cm\nRef: Tsen et al. (2007); Dykeman & Sankey (2008)',
    radius: 0.5,
    membraneThickness: 20,
    naturalFrequency: 250,
    thresholdVoltage: 2.0,
    dielectricConstant: 4.0,
    conductivity: 0.3,
    resonantFreqGHz: 1.50,
    capsidQ: 12,
    resonantThresholdVcm: 3000,
    density: 1200,
    specificHeatCapacity: 4200,
    amplitude: 0.5,
  },

  // ── Enveloped viruses (lipid bilayer shell approximation) ───────────────────
  {
    presetId: 'influenza',
    group: 'virus',
    id: 'influenza',
    type: 'target',
    label: 'Influenza A',
    shortLabel: 'Flu A',
    notes: 'Enveloped RNA virus · diameter 80–120 nm · R ≈ 60 nm',
    techNotes: 'Single-shell spherical approximation for virion.\nε_r elevated as effective parameter (σ_i-limited regime).\nCharacteristic fc ≈ 0.75 MHz in saline.\n⚠ ENVELOPED VIRUS — lipid bilayer envelope (fluid, not rigid protein shell).\nTsen et al. / Dykeman & Sankey acoustic resonance model was validated on NON-ENVELOPED\nicosahedral protein-capsid viruses (M13, TMV, CCMV). A fluid lipid bilayer has no\ndefined mechanical resonance Q; resonance parameters here are theoretical extrapolations\nnot supported by published experimental data for enveloped viruses.\nAcoustic resonance (speculative): f_res ≈ 12 GHz (v_eff ≈ 1440 m/s, R = 60 nm) · Q ≈ 30 · E_thr ≈ 800 V/cm\nRef: Tsen et al. (2007, 2010) [non-enveloped capsids]; Dykeman & Sankey (2008) [non-enveloped capsids]',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 20.0,
    conductivity: 0.005,
    resonantFreqGHz: 12.0,
    capsidQ: 30,
    resonantThresholdVcm: 800,
    density: 1300,
    specificHeatCapacity: 4000,
    amplitude: 0.4,
  },
  {
    presetId: 'sarscov2',
    group: 'virus',
    id: 'sarscov2',
    type: 'target',
    label: 'SARS-CoV-2',
    shortLabel: 'CoV-2',
    notes: 'Enveloped RNA virus · diameter 60–140 nm · R ≈ 60 nm',
    techNotes: 'Single-shell spherical approximation for virion.\nε_r elevated as effective parameter (spike-protein envelope contribution).\nCharacteristic fc ≈ 0.60 MHz in saline.\n⚠ ENVELOPED VIRUS — lipid bilayer envelope (fluid, not rigid protein shell).\nTsen et al. / Dykeman & Sankey acoustic resonance model was validated on NON-ENVELOPED\nicosahedral protein-capsid viruses (M13, TMV, CCMV). A fluid lipid bilayer has no\ndefined mechanical resonance Q; resonance parameters here are theoretical extrapolations\nnot supported by published experimental data for enveloped viruses.\nAcoustic resonance (speculative): f_res ≈ 10 GHz (v_eff ≈ 1200 m/s, R = 60 nm, larger spike envelope) · Q ≈ 25 · E_thr ≈ 1000 V/cm\nRef: Tsen et al. (2007, 2010) [non-enveloped capsids]; Dykeman & Sankey (2008) [non-enveloped capsids]',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 25.0,
    conductivity: 0.005,
    resonantFreqGHz: 10.0,
    capsidQ: 25,
    resonantThresholdVcm: 1000,
    density: 1200,
    specificHeatCapacity: 4000,
    amplitude: 0.4,
  },
]

/** Lookup by presetId */
export function getPreset(id: string): CellPreset | undefined {
  return CELL_PRESETS.find((p) => p.presetId === id)
}

/** All presets in a given group */
export function getPresetsByGroup(group: CellGroup): CellPreset[] {
  return CELL_PRESETS.filter((p) => p.group === group)
}
