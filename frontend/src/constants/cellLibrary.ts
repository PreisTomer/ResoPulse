// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Biologically realistic cell/pathogen presets.
 * All Schwan model parameters are approximate values from bioelectromagnetics literature.
 * Bacterial and viral values use a spherical single-shell approximation.
 */
import type { CellConfig } from '@/types/cell'

export type CellGroup = 'reference' | 'cancer' | 'bacteria' | 'virus'

export interface CellPreset extends CellConfig {
  presetId: string
  group: CellGroup
  shortLabel: string
  notes: string
  /** Extended technical notes shown in tooltip (optional - omit for presets with short notes) */
  techNotes?: string
}

// GROUP_COLORS defined in theme/colors.ts - re-exported here for back-compat
import { GROUP_COLORS as _GROUP_COLORS } from '@/theme/colors'
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
    notes: 'Erythrocyte · R = 4 µm (equatorial) · no nucleus · biconcave disk',
    techNotes: 'SHAPE APPROXIMATION: The RBC is a biconcave disk (equatorial radius ~4 µm, thickness ~2 µm), not a sphere.\nR = 4 µm used here is the equatorial radius; the volume-equivalent sphere radius is ~2.8 µm.\nThe Schwan single-shell model assumes a sphere. Using R = 4 µm overestimates Vm at the cell pole by ~43% relative to the equivalent-sphere calculation. fc and τ are correspondingly underestimated.\nThis approximation is adequate for qualitative comparison (RBC as reference vs. cancer targets) but not for quantitative lysis-field calibration.\nFor accurate RBC EP modelling, use a prolate/oblate spheroid Schwan model (Kotnik & Miklavcic 2000, spheroidal extension).\nσ_i = 0.3 S/m (haemoglobin-dominated cytoplasm, well-characterised; Pauly & Schwan 1966). Anucleate.\nRef: Lim et al. (2008) J. Biomechanics 41:2313 (RBC shape/dimensions); Pauly & Schwan (1966) Biophys. J. 6:621.',
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
  // All cancer presets use the single-shell Schwan model.
  // MEMBRANE THICKNESS: all mammalian cell membranes are physically 7 nm — the lipid bilayer
  // thickness does not change significantly with malignancy. The elevated membrane capacitance
  // Cm in cancer cells arises from altered lipid composition (cholesterol depletion, increased
  // phosphatidylserine), which raises effective ε_r, NOT from membrane thinning.
  // Each preset's ε_r is scaled to preserve the physically correct Cm derived from literature.
  // Ref: Pethig (2010) Biomicrofluidics 4:022811; Gascoyne & Vykoukal (2002) Electrophoresis 23:1973.
  {
    presetId: 'adenocarcinoma',
    group: 'cancer',
    id: 'adenocarcinoma',
    type: 'target',
    label: 'Adenocarcinoma',
    shortLabel: 'Adeno CA',
    notes: 'Generic epithelial CA · R = 15 µm · Cm = 1.52 µF/cm² · fc ≈ 400 kHz',
    techNotes: 'Single-shell Schwan model for a generic solid-tumour epithelial cancer cell.\nσ_i = 0.70 S/m: elevated vs normal epithelium (~0.50 S/m); reflects overexpressed ion channels common in epithelial malignancies.\nCm = 15.2 mF/m² = 1.52 µF/cm² (elevated; cholesterol depletion and increased phosphatidylserine raise effective ε_r to 12.0 at d = 7 nm).\nCharacteristic fc ≈ 400 kHz in saline · τ ≈ 400 ns.\nVth = 0.70 V: ~35% lower than normal hepatocyte reference; cholesterol-depleted, fluid membrane lowers pore-nucleation energy barrier.\nHigh N/C ratio (nuclear radius 8.0 / cell radius 15.0 µm) is typical of poorly differentiated epithelial CA.\n⚠ This preset represents a generic adenocarcinoma — not calibrated to a specific cell line. Use MCF-7, A549, or PANC-1 for line-specific protocols.\nRef: Pethig (2010) Biomicrofluidics 4:022811; Weaver & Chizmadzhev (1996) Bioelectrochemistry 41:135.',
    radius: 15,
    membraneThickness: 7,
    naturalFrequency: 380,
    thresholdVoltage: 0.70,
    dielectricConstant: 12.0,   // scaled from 8.5 at d=5 nm to preserve Cm = 15.2 mF/m² at d=7 nm
    conductivity: 0.70,
    density: 1080,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // High N/C ratio; thinner, leakier NE → bandpass f_peak shifts lower, lower nuclear threshold
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
    notes: 'GBM (WHO grade IV) · R = 12 µm · highest σ_i · fc ≈ 500 kHz',
    techNotes: 'Single-shell Schwan model for GBM (WHO grade IV glioma, IDH-wildtype).\nσ_i = 0.85 S/m: highest of all cancer presets — GBM overexpresses voltage-gated Nav1.5, TRPM7, and BK channels, substantially elevating cytoplasm conductivity vs normal astrocytes (~0.45 S/m).\nCm = 17.7 mF/m² = 1.77 µF/cm² (highest of cancer presets; severely disrupted lipid raft structure raises effective ε_r to 14.0 at d = 7 nm).\nCharacteristic fc ≈ 500 kHz in saline · τ ≈ 320 ns.\nVth = 0.65 V: ~35% lower than astrocyte reference; highly fluid, cholesterol-poor membrane.\nLarge nucleus and irregular nuclear envelope (R_nuc = 7.0 µm) reflects chromosomal instability hallmarks of GBM.\n⚠ GBM cells in culture form near-spherical aggregates; actual in-vitro morphology is heterogeneous. Single-shell approximation overestimates Vm for cells with prominent cytoplasmic projections.\nRef: Liu et al. (2019) Glia 67:1074 (ion channel overexpression); Bhatt et al. (2021) Biophys. J. 120:2647.',
    radius: 12,
    membraneThickness: 7,
    naturalFrequency: 450,
    thresholdVoltage: 0.65,
    dielectricConstant: 14.0,   // scaled from 9.0 at d=4.5 nm to preserve Cm = 17.7 mF/m² at d=7 nm
    conductivity: 0.85,
    density: 1060,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Large aggressive nucleus, irregular NE → lower f_peak, lower nuclear threshold
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
    notes: 'ER+ breast cancer · R = 11 µm · Polevaya-measured dielectrics · fc ≈ 600 kHz',
    techNotes: 'Single-shell Schwan model for MCF-7 (ER+ invasive ductal carcinoma cell line).\nσ_i = 0.60 S/m: measured by electrorotation on MCF-7 suspensions (Polevaya et al. 1999 reported 0.50-0.65 S/m range).\nCm = 12.0 mF/m² = 1.20 µF/cm² (Polevaya et al. measured ~1.0 µF/cm²; slight elevation from cholesterol depletion; ε_r = 9.5 at d = 7 nm).\nCharacteristic fc ≈ 600 kHz in saline · τ ≈ 264 ns.\nVth = 0.72 V: consistent with MCF-7 EP onset observed at ~550-650 V/cm in pulsed protocols.\nN/C ratio (R_nuc = 6.0 / R_cell = 11.0 µm) reflects moderate nuclear enlargement of ER+ ductal carcinoma.\n⚠ MCF-7 is adherent in culture; spherical approximation underestimates Vm anisotropy for elongated cell geometries during attachment.\nRef: Polevaya et al. (1999) Biochim. Biophys. Acta 1419:257; Gascoyne & Vykoukal (2002) Electrophoresis 23:1973.',
    radius: 11,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 0.72,
    dielectricConstant: 9.5,    // scaled from 7.5 at d=5.5 nm to preserve Cm = 12.0 mF/m² at d=7 nm
    conductivity: 0.60,
    density: 1070,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
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
    notes: 'Promyelocytic leukemia · R = 9 µm · suspension · good spherical approx · fc ≈ 930 kHz',
    techNotes: 'Single-shell Schwan model for HL-60 (acute promyelocytic leukemia, AML-M2 classification).\nR = 9 µm: suspension cells are near-spherical; mean diameter 17-20 µm at log-growth phase (ATCC data sheet; Vettese-Dadey et al.); radius corrected from prior underestimate of 7 µm.\nσ_i = 0.60 S/m: hematopoietic cancer cells have elevated σ_i vs normal lymphocytes (~0.40 S/m); literature range for leukemia suspension lines 0.45-0.70 S/m.\nCm = 9.5 mF/m² = 0.95 µF/cm² (close to standard mammalian value; HL-60 has moderate membrane lipid alteration; ε_r = 7.5 at d = 7 nm).\nCharacteristic fc ≈ 930 kHz in saline · τ ≈ 171 ns.\nVth = 0.85 V: less reduced than solid-tumour presets — HL-60 retains more ordered membrane structure despite malignancy.\n⚠ HL-60 differentiates along granulocyte or monocyte lineage upon DMSO/retinoic acid treatment; undifferentiated suspension parameters used here. Differentiated phenotype would show altered σ_i and Cm.\nRef: Gascoyne & Vykoukal (2002) Electrophoresis 23:1973; Markx & Davey (1999) Yeast 16:1183.',
    radius: 9,
    membraneThickness: 7,
    naturalFrequency: 430,
    thresholdVoltage: 0.85,
    dielectricConstant: 7.5,    // scaled from 6.5 at d=6 nm to preserve Cm = 9.5 mF/m² at d=7 nm
    conductivity: 0.60,
    density: 1080,
    specificHeatCapacity: 3300,
    amplitude: 0.5,
    // Nuclear radius updated to match corrected cell radius (N/C ratio maintained)
    nuclearRadius: 5.0, nuclearMembraneThickness: 14, nuclearMembraneEps: 11,
    nucleoplasmConductivity: 1.0, nuclearThresholdVoltage: 0.45,
  },

  {
    presetId: 'panc1',
    group: 'cancer',
    id: 'panc1',
    type: 'target',
    label: 'PANC-1',
    shortLabel: 'PANC-1',
    notes: 'PDAC · R = 13 µm · extreme N/C ratio · Cm = 1.45 µF/cm² · fc ≈ 480 kHz',
    techNotes: 'Single-shell Schwan model for PANC-1 (pancreatic ductal adenocarcinoma cell line).\nσ_i = 0.70 S/m: elevated cytoplasm conductivity consistent with PDAC metabolic reprogramming and altered KCNK5/BKCa channel expression in pancreatic CA lines.\nCm = 14.5 mF/m² = 1.45 µF/cm² (highly fluid membrane in PDAC; reduced cholesterol and altered sphingomyelin content raise effective ε_r to 11.5 at d = 7 nm).\nCharacteristic fc ≈ 480 kHz in saline · τ ≈ 332 ns.\nVth = 0.65 V: PDAC cells show high membrane fluidity and reduced membrane tension, lowering EP threshold significantly vs normal pancreatic ductal cells.\nExtreme N/C ratio (R_nuc = 7.5 / R_cell = 13.0 µm) is a pathological hallmark of PDAC per WHO 2010 classification.\n⚠ PANC-1 is adherent in culture; spherical approximation used for in-vitro suspension protocol modelling. PDAC cells display irregular morphology and strong cell-cell contacts in primary culture.\nRef: Bosman et al. (2010) WHO Classification of Tumours of the Digestive System; Pethig (2010) Biomicrofluidics 4:022811.',
    radius: 13,
    membraneThickness: 7,
    naturalFrequency: 390,
    thresholdVoltage: 0.65,
    dielectricConstant: 11.5,   // scaled from 8.2 at d=5 nm to preserve Cm = 14.5 mF/m² at d=7 nm
    conductivity: 0.70,
    density: 1080,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Extreme N/C ratio hallmark of PDAC; thinner, leakier NE → lower nuclear threshold
    nuclearRadius: 7.5, nuclearMembraneThickness: 11, nuclearMembraneEps: 12,
    nucleoplasmConductivity: 1.1, nuclearThresholdVoltage: 0.35,
  },
  {
    presetId: 'a549',
    group: 'cancer',
    id: 'a549',
    type: 'target',
    label: 'A549 Lung',
    shortLabel: 'A549',
    notes: 'NSCLC adenocarcinoma · R = 11 µm · Cm = 1.27 µF/cm² · fc ≈ 570 kHz',
    techNotes: 'Single-shell Schwan model for A549 (non-small cell lung cancer, KRAS-mutant adenocarcinoma, Type II pneumocyte-derived).\nσ_i = 0.60 S/m: consistent with epithelial adenocarcinoma literature range (0.50-0.70 S/m); A549 has moderate ion channel overexpression (KCNK5, ClC-3 chloride channels).\nCm = 12.7 mF/m² = 1.27 µF/cm² (KRAS-driven membrane remodelling alters lipid composition; effective ε_r = 10.0 at d = 7 nm).\nCharacteristic fc ≈ 570 kHz in saline · τ ≈ 278 ns.\nVth = 0.70 V: lower than normal lung epithelium; consistent with membrane fluidity changes in NSCLC.\nN/C ratio (R_nuc = 6.0 / R_cell = 11.0 µm) reflects moderate nuclear enlargement common in lung adenocarcinoma.\n⚠ A549 is adherent in culture; the spherical approximation is used for suspension EP protocol modelling. The alveolar pneumocyte origin makes A549 a widely used model for lung CA EP studies.\nRef: Pethig (2010) Biomicrofluidics 4:022811; Gascoyne & Vykoukal (2002) Electrophoresis 23:1973.',
    radius: 11,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 0.70,
    dielectricConstant: 10.0,   // scaled from 7.8 at d=5.5 nm to preserve Cm = 12.7 mF/m² at d=7 nm
    conductivity: 0.60,
    density: 1070,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Elevated N/C ratio typical of lung adenocarcinoma
    nuclearRadius: 6.0, nuclearMembraneThickness: 12, nuclearMembraneEps: 11,
    nucleoplasmConductivity: 1.0, nuclearThresholdVoltage: 0.40,
  },
  {
    presetId: 'lncap',
    group: 'cancer',
    id: 'lncap',
    type: 'target',
    label: 'LNCaP Prostate',
    shortLabel: 'LNCaP',
    notes: 'Androgen-sensitive prostate CA · R = 9 µm · moderate σ_i · fc ≈ 790 kHz',
    techNotes: 'Single-shell Schwan model for LNCaP (androgen-sensitive prostate carcinoma, PSA-secreting, PTEN-null).\nσ_i = 0.55 S/m: LNCaP is a slow-growing, non-invasive line with relatively moderate ion channel overexpression; σ_i is only slightly above normal prostate epithelium (~0.40-0.45 S/m). Androgen receptor signalling partially maintains cholesterol homeostasis.\nCm = 10.4 mF/m² = 1.04 µF/cm² (mildly elevated; androgen-driven lipid regulation moderates membrane remodelling; effective ε_r = 8.2 at d = 7 nm; exact: ε_r·ε₀/d = 10.37 mF/m²).\nCharacteristic fc ≈ 790 kHz in saline · τ ≈ 201 ns.\nVth = 0.78 V: highest of the cancer presets — reflects more ordered membrane due to partial cholesterol maintenance under androgen signalling.\nN/C ratio (R_nuc = 5.0 / R_cell = 9.0 µm) reflects moderate nuclear enlargement.\n⚠ LNCaP forms loose aggregates in suspension culture; spherical single-cell approximation is used. At androgen withdrawal, membrane properties are expected to shift toward a CRPC phenotype with lower Vth and higher σ_i.\nRef: Gascoyne & Vykoukal (2002) Electrophoresis 23:1973; Titus et al. (2010) Cancer Res. 70:8 (androgen-cholesterol link).',
    radius: 9,
    membraneThickness: 7,
    naturalFrequency: 430,
    thresholdVoltage: 0.78,
    dielectricConstant: 8.2,    // scaled from 7.0 at d=6 nm to match Cm; actual Cm = 10.37 mF/m² at ε_r=8.2, d=7 nm
    conductivity: 0.55,
    density: 1070,
    specificHeatCapacity: 3200,
    amplitude: 0.5,
    // Moderate N/C ratio elevation
    nuclearRadius: 5.0, nuclearMembraneThickness: 13, nuclearMembraneEps: 11,
    nucleoplasmConductivity: 0.9, nuclearThresholdVoltage: 0.44,
  },

  // ── Additional reference cells ───────────────────────────────────────────────
  {
    presetId: 'astrocyte',
    group: 'reference',
    id: 'astrocyte',
    type: 'healthy',
    label: 'Astrocyte',
    shortLabel: 'Astrocyte',
    notes: 'Brain glial cell · soma R = 10 µm · CNS reference',
    radius: 10,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 1.0,
    dielectricConstant: 5.5,
    conductivity: 0.45,
    density: 1050,
    specificHeatCapacity: 3500,
    amplitude: 0.8,
    nuclearRadius: 5.0, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 0.8, nuclearThresholdVoltage: 0.50,
  },
  {
    presetId: 'fibroblast',
    group: 'reference',
    id: 'fibroblast',
    type: 'healthy',
    label: 'Fibroblast',
    shortLabel: 'Fibroblast',
    notes: 'Connective tissue stromal cell · R = 12 µm (soma) · spherical approx',
    radius: 12,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 1.05,
    dielectricConstant: 5.5,
    conductivity: 0.40,
    density: 1050,
    specificHeatCapacity: 3500,
    amplitude: 0.8,
    nuclearRadius: 5.5, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 0.75, nuclearThresholdVoltage: 0.52,
  },
  {
    presetId: 'lymphocyte',
    group: 'reference',
    id: 'lymphocyte',
    type: 'healthy',
    label: 'Blood Lymphocyte',
    shortLabel: 'Lymphocyte',
    notes: 'Resting peripheral blood lymphocyte · R = 6 µm · suspension',
    radius: 6,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 1.0,
    dielectricConstant: 5.0,
    conductivity: 0.40,
    density: 1070,
    specificHeatCapacity: 3600,
    amplitude: 0.8,
    nuclearRadius: 4.0, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 0.85, nuclearThresholdVoltage: 0.48,
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
    techNotes: 'Rod geometry modelled as sphere (R = 1 µm).\nσ_i = 0.3 S/m (gram-negative cytoplasm, literature range 0.25-0.5 S/m).\nfc ≈ 11 MHz in saline · τ ≈ 14 ns.\nExpect 1.5-2× Vm underestimate vs rod model (Kotnik 2000).\nAcoustic resonance: f_res ≈ 0.5 GHz (v_wall ≈ 1000 m/s) · Q ≈ 4 · E_thr ≈ 2000 V/cm\n⚠ PEPTIDOGLYCAN NOTE: Dykeman & Sankey (2010) validated Q on icosahedral protein capsids.\nPeptidoglycan is a viscoelastic cross-linked polymer mesh, mechanical Q is substantially lower\nthan rigid protein shells. Q = 4 is a conservative estimate; actual Q may be 2-5.\nRef: Tsen et al. (2007); Dykeman & Sankey (2010)',
    radius: 1,
    membraneThickness: 8,
    naturalFrequency: 300,
    thresholdVoltage: 1.5,
    dielectricConstant: 3.5,
    conductivity: 0.3,
    membraneConductivity: 1e-5,  // gram-negative outer membrane, porins raise σ_mem ~100× vs mammalian (Markx & Davey 1999)
    resonantFreqGHz: 0.50,
    capsidQ: 4,
    resonantThresholdVcm: 2000,
    resonantFreqUncertaintyPct: 25,
    capsidQMin: 2, capsidQMax: 8,
    experimentalBasis: 'rf-extrapolated',
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
    techNotes: 'Gram-positive coccus modelled as sphere (R = 0.5 µm).\nσ_i = 0.3 S/m (gram-positive range; thick wall raises effective resistance).\nfc ≈ 49 MHz in saline · τ ≈ 3.2 ns.\nAcoustic resonance: f_res ≈ 1.5 GHz (v_wall ≈ 1500 m/s, thick peptidoglycan) · Q ≈ 3 · E_thr ≈ 3000 V/cm\n⚠ PEPTIDOGLYCAN NOTE: Dykeman & Sankey (2010) validated Q on icosahedral protein capsids.\nMRSA thick peptidoglycan (20 nm cross-linked mesh) is viscoelastic and highly damped.\nQ = 3 is a conservative estimate; resonance peak is broad (overdamped limit Q~2).\nRef: Tsen et al. (2007); Dykeman & Sankey (2010)',
    radius: 0.5,
    membraneThickness: 20,
    naturalFrequency: 250,
    thresholdVoltage: 2.0,
    dielectricConstant: 4.0,
    conductivity: 0.3,
    membraneConductivity: 1e-6,  // gram-positive, thick peptidoglycan wall (20 nm) moderately raises effective σ_mem (Arnold & Zimmermann 1988)
    resonantFreqGHz: 1.50,
    capsidQ: 3,
    resonantThresholdVcm: 3000,
    resonantFreqUncertaintyPct: 30,
    capsidQMin: 2, capsidQMax: 6,
    experimentalBasis: 'rf-extrapolated',
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
    notes: 'Enveloped RNA virus · diameter 80-120 nm · R ≈ 60 nm',
    techNotes: 'Single-shell spherical approximation for virion.\nε_r elevated as effective parameter (σ_i-limited regime).\nCharacteristic fc ≈ 0.75 MHz in saline.\n⚠ ENVELOPED VIRUS, lipid bilayer envelope (fluid, not rigid protein shell).\nTsen et al. / Dykeman & Sankey acoustic resonance model was validated on NON-ENVELOPED\nicosahedral protein-capsid viruses (M13, TMV, CCMV). A fluid lipid bilayer has no\ndefined mechanical resonance Q; resonance parameters here are theoretical extrapolations\nnot supported by published experimental data for enveloped viruses.\nAcoustic resonance (speculative): f_res ≈ 12 GHz (v_eff ≈ 1440 m/s, R = 60 nm) · Q ≈ 3 (lipid bilayer, highly damped) · E_thr ≈ 800 V/cm\nRef: Tsen et al. (2007, 2010) [non-enveloped capsids]; Dykeman & Sankey (2010) [non-enveloped capsids]',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 20.0,
    conductivity: 0.005,
    resonantFreqGHz: 12.0,
    capsidQ: 3,
    resonantThresholdVcm: 800,
    resonantFreqUncertaintyPct: 40,
    capsidQMin: 1, capsidQMax: 8,
    experimentalBasis: 'speculative',
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
    notes: 'Enveloped RNA virus · diameter 60-140 nm · R ≈ 60 nm',
    techNotes: 'Single-shell spherical approximation for virion.\nε_r elevated as effective parameter (spike-protein envelope contribution).\nCharacteristic fc ≈ 0.60 MHz in saline.\n⚠ ENVELOPED VIRUS, lipid bilayer envelope (fluid, not rigid protein shell).\nTsen et al. / Dykeman & Sankey acoustic resonance model was validated on NON-ENVELOPED\nicosahedral protein-capsid viruses (M13, TMV, CCMV). A fluid lipid bilayer has no\ndefined mechanical resonance Q; resonance parameters here are theoretical extrapolations\nnot supported by published experimental data for enveloped viruses.\nAcoustic resonance (speculative): f_res ≈ 10 GHz (v_eff ≈ 1200 m/s, R = 60 nm, larger spike envelope) · Q ≈ 3 (lipid bilayer, highly damped) · E_thr ≈ 1000 V/cm\nRef: Tsen et al. (2007, 2010) [non-enveloped capsids]; Dykeman & Sankey (2010) [non-enveloped capsids]',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 25.0,
    conductivity: 0.005,
    resonantFreqGHz: 10.0,
    capsidQ: 3,
    resonantThresholdVcm: 1000,
    resonantFreqUncertaintyPct: 40,
    capsidQMin: 1, capsidQMax: 8,
    experimentalBasis: 'speculative',
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
