/**
 * Biologically realistic cell/pathogen presets.
 * All Schwan model parameters are approximate values from bioelectromagnetics literature.
 * Bacterial and viral values use a spherical single-shell approximation.
 */
import type { CellConfig } from '../mockData'

export type CellGroup = 'reference' | 'cancer' | 'bacteria' | 'virus'

export interface CellPreset extends CellConfig {
  presetId: string
  group: CellGroup
  shortLabel: string
  notes: string
}

export const GROUP_COLORS: Record<CellGroup, string> = {
  reference: '#00d4ff',
  cancer:    '#ff4d6d',
  bacteria:  '#fbbf24',
  virus:     '#a78bfa',
}

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
  },

  // ── Bacteria (spherical-shell approximation) ────────────────────────────────
  {
    presetId: 'ecoli',
    group: 'bacteria',
    id: 'ecoli',
    type: 'target',
    label: 'E. coli K-12',
    shortLabel: 'E. coli',
    notes: 'Gram-neg rod (0.5×2 µm) · spherical approx · fc in MHz range · expect 1.5–2× Vm underestimate vs rod model',
    radius: 1,
    membraneThickness: 8,
    naturalFrequency: 300,
    thresholdVoltage: 1.5,
    dielectricConstant: 3.5,
    conductivity: 0.2,
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
    radius: 0.5,
    membraneThickness: 20,
    naturalFrequency: 250,
    thresholdVoltage: 2.0,
    dielectricConstant: 4.0,
    conductivity: 0.15,
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
    notes: 'Enveloped RNA virus · diameter 80–120 nm → R ≈ 60 nm · ε_r elevated (effective parameter for σ_i-limited fc ~0.75 MHz) · single-shell model approximate for virions',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 20.0,
    conductivity: 0.005,
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
    notes: 'Enveloped RNA virus · diameter 60–140 nm → R ≈ 60 nm · ε_r elevated (effective parameter for spike-protein envelope; fc ~0.60 MHz) · single-shell model approximate for virions',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 25.0,
    conductivity: 0.005,
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
