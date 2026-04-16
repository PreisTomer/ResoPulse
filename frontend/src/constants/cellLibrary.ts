// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// Biologically realistic cell/pathogen presets. All Schwan parameters from bioelectromagnetics literature.
import { GROUP_COLORS as _GROUP_COLORS } from '@/theme/colors'

import type { CellConfig } from '@/types/cell'
export type CellGroup = 'reference' | 'cancer' | 'bacteria' | 'virus'

export interface CellPreset extends CellConfig {
  presetId: string
  group: CellGroup
  shortLabel: string
  notes: string
  techNotes?: string  // extended tooltip notes (optional; omit for presets with short notes)
}

// GROUP_COLORS defined in theme/colors.ts - re-exported here for back-compat
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

  {
    presetId: 'mcf10a',
    group: 'reference',
    id: 'mcf10a',
    type: 'healthy',
    label: 'MCF-10A Normal Breast',
    shortLabel: 'MCF-10A',
    notes: 'Normal breast epithelial · R = 10 µm · Anand 2019 reference · fc ≈ 429 kHz',
    techNotes: 'Non-transformed normal breast epithelial cell line (ATCC CRL-10317). Used as the healthy reference in differential EP selectivity studies alongside MCF-7.\nσ_i = 0.30 S/m: Anand et al. (2019) RSC Advances Table 1. Lower than cancer lines due to normal ion channel expression.\nCm = 10.12 mF/m² (= 1.01 µF/cm²): computed from ε_r = 8.0, d = 7 nm via Cm = ε_r·ε₀/d. Within the Pethig (2010) normal epithelium range (8-12 mF/m²).\nCharacteristic fc ≈ 429 kHz in saline · τ ≈ 371 ns.\nVth = 1.0 V: EP onset calibrated from Polevaya et al. (1999); higher than MCF-7 (1.0 vs 0.72 V) due to more ordered, cholesterol-rich membrane.\nRef: Anand et al. (2019) RSC Advances DOI: 10.1039/C9RA07428G; Polevaya et al. (1999) BBA 1419:257; Gascoyne & Vykoukal (2002) Electrophoresis 23:1973.',
    radius: 10.0,
    membraneThickness: 7,
    dielectricConstant: 8.0,
    conductivity: 0.30,
    thresholdVoltage: 1.0,
    naturalFrequency: 430,
    density: 1050,
    specificHeatCapacity: 3600,
    amplitude: 0.8,
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
  // ── Anand 2019 (RSC Advances) exact measured parameters ────────────────────
  // Used exclusively by the MCF-7 breast cancer validation workflow.
  // σ_i = 0.23 S/m and R = 8.15 µm are from Anand Table 1, different from the
  // general-purpose MCF-7 preset above (Polevaya 1999 electrorotation values).
  // DO NOT use this preset for general experiments — it is calibrated to one
  // specific study's cuvette conditions (EP buffer σ_e = 0.14 S/m, 10 kHz pulsed IRE).
  {
    presetId: 'mcf7-anand2019',
    group: 'cancer',
    id: 'mcf7-anand2019',
    type: 'target',
    label: 'MCF-7 (Anand 2019)',
    shortLabel: 'MCF-7 A19',
    notes: 'ER+ breast cancer · Anand 2019 Table 1 · R = 8.15 µm · σ_i = 0.23 S/m · E_lys = 589 V/cm',
    techNotes: 'Exact Anand et al. (2019) RSC Advances Table 1 values for MCF-7.\nσ_i = 0.23 S/m: lower than healthy MCF-10A (0.30 S/m) — this conductivity difference is the primary selectivity driver.\nR = 8.15 µm: Gascoyne & Vykoukal (2002) Electrophoresis 23:1973.\nVth = 0.72 V: Polevaya et al. (1999) calibration.\nSchwan E_lys = 0.72 / (1.5 × 8.15e-6 × 100) = 589 V/cm.\nCompared to MCF-10A (σ_i = 0.30, R = 10 µm, Vth = 1.0 V, E_lys = 667 V/cm):\nSelectivity window = 667 - 589 = +78 V/cm. TI = 667/589 = 1.13.\nRef: Anand et al. (2019) DOI: 10.1039/C9RA07428G.',
    radius: 8.15,
    membraneThickness: 7,
    naturalFrequency: 440,
    thresholdVoltage: 0.72,
    dielectricConstant: 8.0,
    conductivity: 0.23,
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
    notes: 'Promyelocytic leukemia · R = 9 µm · suspension · good spherical approx · fc ≈ 930 kHz',
    techNotes: 'Single-shell Schwan model for HL-60 (acute promyelocytic leukemia, AML-M2 classification).\nR = 9 µm: suspension cells are near-spherical; mean diameter 17-20 µm at log-growth phase (ATCC data sheet; Vettese-Dadey et al.); radius corrected from prior underestimate of 7 µm.\nσ_i = 0.60 S/m: hematopoietic cancer cells have elevated σ_i vs normal lymphocytes (~0.40 S/m); literature range for leukemia suspension lines 0.45-0.70 S/m.\nCm = 9.5 mF/m² = 0.95 µF/cm² (close to standard mammalian value; HL-60 has moderate membrane lipid alteration; ε_r = 7.5 at d = 7 nm).\nCharacteristic fc ≈ 930 kHz in saline · τ ≈ 171 ns.\nVth = 0.85 V: less reduced than solid-tumour presets — HL-60 retains more ordered membrane structure despite malignancy.\n⚠ TI INVERSION WARNING: HL-60 (R = 9 µm) paired with any healthy reference cell larger than ~10.2 µm (e.g. fibroblast R = 12 µm, astrocyte/hepatocyte R = 10 µm) gives TI_DC = (R_T × Vth_H)/(R_H × Vth_T) < 1 — meaning the healthy cell has a lower lysis field. In that regime, quasi-DC fields are counter-selective. Selectivity only recovers above ~440 kHz (crossover frequency), reaching a plateau TI ≈ 1.26-1.29 at high f via τ differences. For co-culture assays with larger stromal cells (fibroblasts, epithelial) this is a genuine protocol constraint.\n⚠ HL-60 differentiates along granulocyte or monocyte lineage upon DMSO/retinoic acid treatment; undifferentiated suspension parameters used here. Differentiated phenotype would show altered σ_i and Cm.\nRef: Gascoyne & Vykoukal (2002) Electrophoresis 23:1973; Markx & Davey (1999) Yeast 16:1183.',
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
    techNotes: 'Single-shell Schwan model for LNCaP (androgen-sensitive prostate carcinoma, PSA-secreting, PTEN-null).\nσ_i = 0.55 S/m: LNCaP is a slow-growing, non-invasive line with relatively moderate ion channel overexpression; σ_i is only slightly above normal prostate epithelium (~0.40-0.45 S/m). Androgen receptor signalling partially maintains cholesterol homeostasis.\nCm = 10.4 mF/m² = 1.04 µF/cm² (mildly elevated; androgen-driven lipid regulation moderates membrane remodelling; effective ε_r = 8.2 at d = 7 nm; exact: ε_r·ε₀/d = 10.37 mF/m²).\nCharacteristic fc ≈ 790 kHz in saline · τ ≈ 201 ns.\nVth = 0.78 V: highest of the cancer presets — reflects more ordered membrane due to partial cholesterol maintenance under androgen signalling.\nN/C ratio (R_nuc = 5.0 / R_cell = 9.0 µm) reflects moderate nuclear enlargement.\n⚠ SELECTIVITY NOTE: LNCaP has the highest Vth of all cancer presets (0.78 V). When paired with a small healthy reference cell (e.g. lymphocyte R = 6 µm, σ_i = 0.40 S/m), τ_H < τ_T despite R_H < R_T, so the high-frequency Vm selectivity limit is R_T·τ_H/(R_H·τ_T) = 0.80 (below 1). The Vth asymmetry (1.0/0.78 = 1.28) rescues net DR selectivity to ~1.03 at high f, but TI falls monotonically from 1.92 (quasi-DC) toward 1.03 with increasing frequency. No frequency above fc,T = 792 kHz improves selectivity for this pair; operate as low as possible.\n⚠ LNCaP forms loose aggregates in suspension culture; spherical single-cell approximation is used. At androgen withdrawal, membrane properties are expected to shift toward a CRPC phenotype with lower Vth and higher σ_i.\nRef: Gascoyne & Vykoukal (2002) Electrophoresis 23:1973; Titus et al. (2010) Cancer Res. 70:8 (androgen-cholesterol link).',
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

  // ── Non-enveloped icosahedral virus (rigid protein capsid) ─────────────────
  // CCMV (Cowpea Chlorotic Mottle Virus) is the primary experimental benchmark for
  // acoustic capsid resonance. Tsen et al. (2007) measured f_res = 7.7 GHz and Q ≈ 10-15
  // for CCMV using impulsive stimulated Raman scattering (ISRS) pulsed laser excitation.
  // The same paper demonstrated selective capsid disruption with no mammalian cell damage.
  // CCMV is a T=3 icosahedral plant virus with a well-characterised 28-nm diameter (R=14 nm).
  {
    presetId: 'ccmv',
    group: 'virus',
    id: 'ccmv',
    type: 'target',
    label: 'CCMV (Plant Virus Capsid)',
    shortLabel: 'CCMV',
    notes: 'Non-enveloped icosahedral · R = 14 nm · f_res = 7.7 GHz · Q ≈ 12 (Tsen 2007)',
    techNotes: 'CCMV (Cowpea Chlorotic Mottle Virus) — T=3 icosahedral protein capsid, diameter 28 nm, R = 14 nm.\nRigid protein shell ~2.5 nm thick (X-ray crystallography, Speir et al. 1995).\nσ_i = 0.02 S/m (viral interior: RNA genome + viral proteins; low ionic conductivity).\nf_res = 7.7 GHz: measured by Tsen et al. (2007) using ISRS coherent vibrational spectroscopy.\nQ = 12 (nominal): derived from Lorentzian peak linewidth in Tsen 2007 Fig. 3. Range: Q = 8-20.\nE_thr = 500 V/cm: acoustic field equivalent required for irreversible capsid disruption.\nResoPulse acoustic resonance model at f = 7.7 GHz, E = 500 V/cm → DR > 1 (disrupting).\nMammalian cells at 7.7 GHz: Schwan Vm → 0 (fc ≈ 100-800 kHz, far below 7.7 GHz) → DR ≈ 0.\nThis is the experimental basis for the CCMV validation workflow.\nRef: Tsen et al. (2007) Biophys J 93:1340. Dykeman & Sankey (2010) J Phys: Cond Matter 22:423202.',
    radius: 0.014,          // µm = 14 nm — outer radius from X-ray crystallography
    membraneThickness: 2.5, // nm — protein capsid shell (Speir et al. 1995 crystallography)
    naturalFrequency: 200,
    thresholdVoltage: 0.05, // V — EP model threshold; not used in resonance mode (R too small)
    dielectricConstant: 4.0,  // ε_r ≈ 4 for protein (intermediate between protein 2-5 range)
    conductivity: 0.02,       // S/m — low; RNA+protein interior, minimal free ions
    resonantFreqGHz: 7.7,     // GHz — measured, Tsen et al. (2007)
    capsidQ: 12,              // nominal Q from linewidth; rigid icosahedral protein capsid
    resonantThresholdVcm: 500,// V/cm — acoustic disruption threshold (Tsen 2007)
    resonantFreqUncertaintyPct: 15,
    capsidQMin: 8,
    capsidQMax: 20,
    experimentalBasis: 'laser-validated',  // f_res and Q measured by ISRS laser spectroscopy (Tsen 2007)
    density: 1350,
    specificHeatCapacity: 4100,
    amplitude: 0.4,
  },

  // ── Enveloped viruses (lipid bilayer shell approximation) ───────────────────
  {
    presetId: 'influenza',
    group: 'virus',
    id: 'influenza',
    type: 'target',
    label: 'Influenza A (H3N2)',
    shortLabel: 'Flu A',
    notes: 'Enveloped RNA virus · diameter 80-120 nm · R ≈ 60 nm · f_res = 8.2 GHz · Q = 1.95 (Thakur 2015)',
    techNotes: 'Single-shell spherical approximation for virion.\nε_r elevated as effective parameter (σ_i-limited regime).\nCharacteristic fc ≈ 0.75 kHz in saline (τ ≈ 213 µs — σ_i-limited, ωτ >> 1 at all practical lab frequencies).\n⚠ ENVELOPED VIRUS — lipid bilayer envelope (fluid, not the rigid protein shell validated in Tsen 2007/Dykeman 2010). Resonance behaviour of the spike glycoprotein layer differs from an icosahedral capsid.\nf_res = 8.2-8.35 GHz (H3N2): measured by Thakur et al. (2015) Sci. Reports 5:18030 using microwave absorption spectroscopy. Peak power absorption 21%, 93% neutralization at 8 GHz at 7.5×10^14 particles/m³.\nQ = 1.95: derived from Lorentzian linewidth in Thakur 2015. Lower than rigid capsids due to lipid bilayer viscoelastic damping. H1N1 resonance at 7 GHz with slightly different Q.\nE_thr ≈ 800 V/cm: model estimate — the published microwave field threshold (≈ 249 V/m ≈ 2.5 V/cm free-space) corresponds to far-field microwave irradiation, not a cuvette field. The cuvette coupling efficiency is lower, so the effective threshold is higher by an instrument-dependent factor.\nRef: Thakur et al. (2015) Sci. Reports 5:18030; Tsen et al. (2007, 2010) [for capsid physics baseline].',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 20.0,
    conductivity: 0.005,
    resonantFreqGHz: 8.2,
    capsidQ: 2.0,
    resonantThresholdVcm: 800,
    resonantFreqUncertaintyPct: 10,
    capsidQMin: 1.5, capsidQMax: 3.0,
    experimentalBasis: 'mw-validated',
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
    notes: 'Enveloped RNA virus · diameter 60-140 nm · R ≈ 60 nm · f_res = 4.0 GHz · Q = 4.6 · 2nd mode 7.5 GHz (Sci. Rep. 2022)',
    techNotes: 'Single-shell spherical approximation for virion. Spike glycoprotein envelope modelled as effective shell.\nCharacteristic fc ≈ 0.60 kHz in saline (τ ≈ 266 µs — σ_i-limited, ωτ >> 1 at all practical lab frequencies).\n⚠ ENVELOPED VIRUS — lipid bilayer + spike protein envelope. The Tsen/Dykeman capsid resonance model was validated on non-enveloped icosahedral capsids; the resonance coupling for a lipid envelope is less well-characterised. These values are from microwave spectroscopy, not pulsed-laser ISRS.\nf_res = 4.0 GHz (1st dipolar mode): measured by microwave resonance spectroscopy, Sci. Reports 2022 (PMC9307221). Normalised insertion loss >32%. Power absorption at resonance = 32%.\nf_res2 = 7.5 GHz (2nd dipolar mode): same paper. Bandwidth 1.5-2 GHz.\nQ = 4.2-5.0 (nominal 4.6): limited by ±10% particle size distribution and viscous damping (Sci. Rep. 2022).\nresonantMode2Amplitude = 0.5: 2nd mode contributes approximately half the disruption efficiency of the fundamental (elastic shell theory, dipole mode amplitude ratio).\nE_thr ≈ 1000 V/cm: model estimate from published threshold field 86.9 V/m (82.3 W/m² free-space) scaled for cuvette coupling. Direct comparison not possible without knowing the cavity Q of the experimental setup.\nRef: Sci. Reports 2022 PMC9307221 (microwave resonance); Thakur et al. 2015 (influenza baseline); Tsen et al. 2007 (capsid physics).',
    radius: 0.060,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 25.0,
    conductivity: 0.005,
    resonantFreqGHz: 4.0,
    capsidQ: 4.6,
    resonantThresholdVcm: 1000,
    resonantFreqUncertaintyPct: 15,
    capsidQMin: 4.2, capsidQMax: 5.0,
    resonantFreqGHz2: 7.5,
    capsidQ2: 4.6,
    resonantMode2Amplitude: 0.5,
    experimentalBasis: 'mw-validated',
    density: 1200,
    specificHeatCapacity: 4000,
    amplitude: 0.4,
  },
  // ── Lentivirus (enveloped retrovirus, ~90 nm) ──────────────────────────────
  // Vibrational modes measured by ultrafast pump-probe spectroscopy (PNAS 2025).
  // HIV-1 is the canonical lentivirus; parameters are for a generic lentiviral pseudovirus
  // of this size class (used in gene delivery and vaccine vector research).
  {
    presetId: 'lentivirus',
    group: 'virus',
    id: 'lentivirus',
    type: 'target',
    label: 'Lentivirus (HIV-1 class)',
    shortLabel: 'Lentivirus',
    notes: 'Enveloped retrovirus · diameter ≈ 90 nm · f_res = 20 GHz (high-freq mode) · PNAS 2025',
    techNotes: 'Single-shell spherical approximation for a lentiviral pseudovirus (HIV-1 size class, ~90 nm diameter, R = 45 nm).\nLipid bilayer envelope with embedded envelope glycoproteins (gp120/gp41 for HIV-1; VSV-G for pseudoviruses).\nCharacteristic fc ≈ 0.85 kHz in saline (σ_i-limited, ωτ >> 1).\n⚠ ENVELOPED RETROVIRUS — cone-shaped capsid inside lipid envelope. Resonance involves both the inner capsid and envelope dynamics.\nf_res = 19-21 GHz (high-frequency morphology-sensitive mode): measured by ultrafast pump-probe (impulsive stimulated Raman) spectroscopy on lentiviral pseudoviruses, PNAS 2025 (DOI: 10.1073/pnas.2420428122). The 19-21 GHz range reflects particle-to-particle variation in size and core geometry.\nLow-frequency envelope protein interaction modes at 2-10 GHz also detected in the same study; not modelled separately here.\nQ = 4.0 (estimated): no direct linewidth measurement in the PNAS study; estimated from similarity to CoV-2 class (Q = 4.6) adjusted for lentiviral cone-capsid geometry (slightly more damped). capsidQMin/Max span the physically plausible range for enveloped retroviruses.\nE_thr ≈ 1500 V/cm: model estimate — higher than CoV-2 due to the inner capsid being further from the membrane. No published cuvette disruption threshold available.\nRef: Nanoscopic acoustic vibrational dynamics of a single virus captured by ultrafast spectroscopy, PNAS 2025 doi:10.1073/pnas.2420428122.',
    radius: 0.045,
    membraneThickness: 10,
    naturalFrequency: 200,
    thresholdVoltage: 0.25,
    dielectricConstant: 22.0,
    conductivity: 0.005,
    resonantFreqGHz: 20.0,
    capsidQ: 4.0,
    resonantThresholdVcm: 1500,
    resonantFreqUncertaintyPct: 10,
    capsidQMin: 2.5, capsidQMax: 6.0,
    experimentalBasis: 'ultrafast-spectroscopy',
    density: 1250,
    specificHeatCapacity: 4000,
    amplitude: 0.4,
  },
]

export function getPreset(id: string): CellPreset | undefined {
  return CELL_PRESETS.find((p) => p.presetId === id)
}

export function getPresetsByGroup(group: CellGroup): CellPreset[] {
  return CELL_PRESETS.filter((p) => p.group === group)
}
