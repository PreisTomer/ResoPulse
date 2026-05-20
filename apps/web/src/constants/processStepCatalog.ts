// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Downstream process step catalog — drives YieldPredictionEngine in Module 3.

import { MOLECULE_TYPE, type MoleculeType } from './moleculeTypes'

export const STEP_CATEGORY = {
  CLARIFICATION:       'clarification',
  CAPTURE:             'capture',
  VIRAL_INACTIVATION:  'viral-inactivation',
  POLISH:              'polish',
  UF_DF:               'uf-df',
  FORMULATION:         'formulation',
} as const

export type StepCategory = typeof STEP_CATEGORY[keyof typeof STEP_CATEGORY]

export interface StepParameter {
  key:          string
  label:        string
  unit:         string
  min:          number
  max:          number
  defaultValue: number
  description:  string
  affectsYield: boolean
}

export interface ProcessStepEntry {
  id:                       string
  name:                     string
  shortLabel:               string
  category:                 StepCategory
  description:              string
  yieldRangePct:            [number, number]
  yieldRangeConfidence:     number
  parameters:               StepParameter[]
  compatibleMolecules:      MoleculeType[]
  hcpLogReduction:          [number, number]
  dnaLogReduction:          [number, number]
  commonChallenges:         string[]
  references:               string[]
}

export const PROCESS_STEP_CATALOG: ProcessStepEntry[] = [
  {
    id:                       'depth-filtration',
    name:                     'Depth Filtration',
    shortLabel:               'Depth Filter',
    category:                 STEP_CATEGORY.CLARIFICATION,
    description:              'Multi-layer depth filters remove cell debris, cells, and large particulates from harvested culture fluid. Standard first step for secreted products.',
    yieldRangePct:            [88, 96],
    yieldRangeConfidence:     0.90,
    parameters: [
      { key: 'loadVolL_per_m2',    label: 'Load volume per filter area', unit: 'L/m²', min: 50,  max: 300, defaultValue: 150, description: 'Higher loading risks breakthrough; lower wastes filter area.',        affectsYield: true },
      { key: 'pressureBarMax',     label: 'Max differential pressure',   unit: 'bar',  min: 0.5, max: 3,   defaultValue: 1.5, description: 'Pressure limit before filter blinding; affects throughput not yield.', affectsYield: false },
      { key: 'preFilterRating_um', label: 'Pre-filter rating',           unit: 'µm',   min: 0.2, max: 10,  defaultValue: 1,   description: 'Coarser pre-filter protects sterile filter downstream.',              affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    hcpLogReduction:          [0.3, 0.7],
    dnaLogReduction:          [0.5, 1.5],
    commonChallenges:         ['Filter capacity variability between lots', 'High cell debris loads cause early breakthrough'],
    references:               ['Singh & Lin 2017, J Chromatogr A 1485:1', 'BioPharm Intl 2019 review of clarification'],
  },
  {
    id:                       'centrifugation',
    name:                     'Centrifugation',
    shortLabel:               'Centrifuge',
    category:                 STEP_CATEGORY.CLARIFICATION,
    description:              'Disc-stack centrifuge removes cells and large debris by density. Common for high-cell-density harvests where depth filtration alone is insufficient.',
    yieldRangePct:            [92, 98],
    yieldRangeConfidence:     0.85,
    parameters: [
      { key: 'feedRateLperHr', label: 'Feed rate',  unit: 'L/h',  min: 50,   max: 500,   defaultValue: 200,   description: 'Higher feed rate reduces separation efficiency.',                       affectsYield: true },
      { key: 'rpm',            label: 'Bowl speed', unit: 'rpm',  min: 5000, max: 15000, defaultValue: 10000, description: 'Higher g-force improves separation but increases shear damage risk.',   affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    hcpLogReduction:          [0.2, 0.5],
    dnaLogReduction:          [0.3, 1.0],
    commonChallenges:         ['Shear damage to sensitive products', 'Solids accumulation requires periodic discharge'],
    references:               ['Roush & Lu 2008, Biotechnol Prog 24:488'],
  },
  {
    id:                       'protein-a-capture',
    name:                     'Protein A Affinity Capture',
    shortLabel:               'Protein A',
    category:                 STEP_CATEGORY.CAPTURE,
    description:              'Protein A resin binds the Fc region of IgG antibodies with high specificity. The industry-standard capture step for mAbs and Fc fusions.',
    yieldRangePct:            [92, 98],
    yieldRangeConfidence:     0.95,
    parameters: [
      { key: 'loadGperL_resin', label: 'Load density',     unit: 'g/L resin',  min: 15,  max: 60,  defaultValue: 35,  description: 'Higher loading increases throughput but risks breakthrough above resin capacity.', affectsYield: true },
      { key: 'flowRateCmPerHr', label: 'Linear flow rate', unit: 'cm/h',       min: 150, max: 600, defaultValue: 300, description: 'Higher flow rates reduce binding residence time; resin-dependent.',                affectsYield: true },
      { key: 'washVolCV',       label: 'Wash volume',      unit: 'column vol', min: 3,   max: 15,  defaultValue: 7,   description: 'More wash reduces HCP carryover but extends cycle time.',                          affectsYield: false },
      { key: 'elutionPh',       label: 'Elution pH',       unit: 'pH',         min: 2.7, max: 4.0, defaultValue: 3.5, description: 'Lower pH improves elution efficiency but risks aggregate formation.',              affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN],
    hcpLogReduction:          [2.5, 3.5],
    dnaLogReduction:          [2.0, 3.0],
    commonChallenges:         ['Resin cost dominates downstream economics', 'Low-pH elution drives aggregate formation', 'Resin ligand leaching requires monitoring'],
    references:               ['Hober et al. 2007, J Chromatogr B 848:40', 'Shukla & Thömmes 2010, Trends Biotechnol 28:253'],
  },
  {
    id:                       'imac-capture',
    name:                     'IMAC (Ni-NTA) Capture',
    shortLabel:               'IMAC',
    category:                 STEP_CATEGORY.CAPTURE,
    description:              'Immobilized metal affinity chromatography binds proteins via engineered His-tags. Standard capture step for tagged recombinant proteins from bacterial or mammalian systems.',
    yieldRangePct:            [80, 92],
    yieldRangeConfidence:     0.85,
    parameters: [
      { key: 'loadGperL_resin', label: 'Load density',           unit: 'g/L resin', min: 5,   max: 40,  defaultValue: 15,  description: 'Resin capacity for His-tagged proteins is generally lower than Protein A.', affectsYield: true },
      { key: 'imidazoleWashMM', label: 'Imidazole wash conc.',   unit: 'mM',        min: 10,  max: 50,  defaultValue: 20,  description: 'Higher imidazole reduces non-specific binding but lowers yield.',          affectsYield: true },
      { key: 'imidazoleElutMM', label: 'Imidazole elution conc.',unit: 'mM',        min: 100, max: 500, defaultValue: 250, description: 'Sufficient imidazole to fully elute bound protein.',                       affectsYield: false },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    hcpLogReduction:          [1.5, 2.5],
    dnaLogReduction:          [1.5, 2.5],
    commonChallenges:         ['Nickel leaching requires removal in polish', 'Lower selectivity than Protein A', 'Tag removal step often required for therapeutic use'],
    references:               ['Bornhorst & Falke 2000, Methods Enzymol 326:245'],
  },
  {
    id:                       'cex-capture',
    name:                     'Cation Exchange Capture',
    shortLabel:               'CEX Capture',
    category:                 STEP_CATEGORY.CAPTURE,
    description:              'Cation exchange chromatography in bind-elute mode captures basic proteins. Alternative to affinity for non-tagged proteins.',
    yieldRangePct:            [82, 92],
    yieldRangeConfidence:     0.80,
    parameters: [
      { key: 'loadGperL_resin', label: 'Load density',  unit: 'g/L resin', min: 20,  max: 80,  defaultValue: 40,  description: 'Higher capacity than affinity resins; check breakthrough curve.', affectsYield: true },
      { key: 'loadPh',          label: 'Load pH',       unit: 'pH',        min: 4.5, max: 6.5, defaultValue: 5.5, description: 'Below pI of target for cation binding.',                          affectsYield: true },
      { key: 'elutionNaClMm',   label: 'Elution NaCl',  unit: 'mM',        min: 100, max: 500, defaultValue: 250, description: 'Higher salt elutes product; gradient improves purity.',          affectsYield: false },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    hcpLogReduction:          [1.5, 2.5],
    dnaLogReduction:          [2.0, 3.0],
    commonChallenges:         ['pI of target must be sufficiently basic', 'Cell harvest conductivity may require dilution before load'],
    references:               ['Liu et al. 2010, MAbs 2:480'],
  },
  {
    id:                       'low-ph-viral-inactivation',
    name:                     'Low-pH Viral Inactivation',
    shortLabel:               'Low-pH VI',
    category:                 STEP_CATEGORY.VIRAL_INACTIVATION,
    description:              'Holding the Protein A eluate at pH 3.5 inactivates enveloped viruses. Mandatory step for mAbs intended for human use.',
    yieldRangePct:            [95, 99],
    yieldRangeConfidence:     0.95,
    parameters: [
      { key: 'targetPh',     label: 'Target pH',        unit: 'pH',  min: 3.0, max: 4.0, defaultValue: 3.5, description: 'Lower pH improves inactivation but drives aggregate formation.',       affectsYield: true },
      { key: 'holdTimeMin',  label: 'Hold time',        unit: 'min', min: 30,  max: 120, defaultValue: 60,  description: 'Longer hold improves viral inactivation; affects aggregate yield loss.', affectsYield: true },
      { key: 'temperatureC', label: 'Hold temperature', unit: '°C',  min: 15,  max: 25,  defaultValue: 20,  description: 'Lower temperature reduces aggregate formation.',                          affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    hcpLogReduction:          [0, 0],
    dnaLogReduction:          [0, 0],
    commonChallenges:         ['Aggregate formation is the primary yield risk', 'Some pH-sensitive products cannot tolerate this step', 'Not applicable to non-enveloped virus inactivation'],
    references:               ['ICH Q5A(R2) 2024', 'Mattila et al. 2016, Biotechnol Prog 32:1218'],
  },
  {
    id:                       'aex-polish-flowthrough',
    name:                     'Anion Exchange Polish (Flow-Through)',
    shortLabel:               'AEX Polish',
    category:                 STEP_CATEGORY.POLISH,
    description:              'Anion exchange in flow-through mode removes acidic impurities (HCPs, DNA, viruses) while target passes through. Standard polishing step for mAbs.',
    yieldRangePct:            [90, 97],
    yieldRangeConfidence:     0.90,
    parameters: [
      { key: 'loadGperL_resin',     label: 'Load density',       unit: 'g/L resin', min: 50,  max: 300, defaultValue: 150, description: 'High loading possible in flow-through; check HCP breakthrough.', affectsYield: true },
      { key: 'loadPh',              label: 'Load pH',            unit: 'pH',        min: 6.5, max: 8.5, defaultValue: 7.5, description: 'Above pI of target to ensure target does not bind.',              affectsYield: true },
      { key: 'loadConductivityMsCm',label: 'Load conductivity',  unit: 'mS/cm',     min: 2,   max: 15,  defaultValue: 5,   description: 'Lower conductivity improves impurity binding.',                    affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    hcpLogReduction:          [1.5, 2.5],
    dnaLogReduction:          [3.0, 5.0],
    commonChallenges:         ['Conductivity must be controlled tightly', 'Target binding (yield loss) if pH approaches pI'],
    references:               ['Liu et al. 2010, MAbs 2:480'],
  },
  {
    id:                       'cex-polish',
    name:                     'Cation Exchange Polish',
    shortLabel:               'CEX Polish',
    category:                 STEP_CATEGORY.POLISH,
    description:              'Cation exchange in bind-elute mode removes aggregates, charge variants, and remaining HCPs. Common second polishing step.',
    yieldRangePct:            [85, 93],
    yieldRangeConfidence:     0.85,
    parameters: [
      { key: 'loadGperL_resin',   label: 'Load density',           unit: 'g/L resin',  min: 30, max: 80, defaultValue: 50, description: 'Lower load than capture mode for better resolution.',                  affectsYield: true },
      { key: 'elutionGradientCV', label: 'Elution gradient length',unit: 'column vol', min: 5,  max: 30, defaultValue: 15, description: 'Longer gradient improves variant separation but extends cycle time.', affectsYield: false },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    hcpLogReduction:          [1.0, 2.0],
    dnaLogReduction:          [1.0, 2.0],
    commonChallenges:         ['Aggregate co-elution requires careful pooling decisions', 'Lower yield than flow-through modes'],
    references:               ['Liu et al. 2010, MAbs 2:480'],
  },
  {
    id:                       'hic-polish',
    name:                     'Hydrophobic Interaction Polish',
    shortLabel:               'HIC Polish',
    category:                 STEP_CATEGORY.POLISH,
    description:              'HIC separates by surface hydrophobicity at high salt; effective for aggregate removal. Used when CEX is insufficient.',
    yieldRangePct:            [78, 90],
    yieldRangeConfidence:     0.80,
    parameters: [
      { key: 'loadAmmoniumSulfateM', label: 'Load salt conc.',  unit: 'M',          min: 0.5, max: 2.5, defaultValue: 1.2, description: 'Higher salt drives binding; affects target solubility.', affectsYield: true },
      { key: 'elutionGradientCV',    label: 'Elution gradient', unit: 'column vol', min: 5,   max: 30,  defaultValue: 20,  description: 'Decreasing salt gradient elutes.',                       affectsYield: false },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    hcpLogReduction:          [0.8, 1.8],
    dnaLogReduction:          [0.5, 1.5],
    commonChallenges:         ['Lower yields than IEX', 'High salt loads may require pre-dilution', 'Sensitive proteins may aggregate at high salt'],
    references:               ['Queiroz et al. 2001, J Biotechnol 87:143'],
  },
  {
    id:                       'uf-concentration',
    name:                     'Ultrafiltration Concentration',
    shortLabel:               'UF',
    category:                 STEP_CATEGORY.UF_DF,
    description:              'Tangential flow ultrafiltration concentrates the target product while small molecules and water pass through the membrane.',
    yieldRangePct:            [92, 98],
    yieldRangeConfidence:     0.92,
    parameters: [
      { key: 'concentrationFactor', label: 'Concentration factor', unit: 'x',      min: 2,  max: 20,  defaultValue: 10, description: 'Higher factor risks gel layer formation and yield loss.',         affectsYield: true },
      { key: 'fluxLMH',             label: 'Permeate flux',        unit: 'L/m²/h', min: 10, max: 100, defaultValue: 40, description: 'Operating flux below critical flux to avoid fouling.',            affectsYield: true },
      { key: 'membraneMWCO_kDa',    label: 'Membrane MWCO',         unit: 'kDa',   min: 10, max: 100, defaultValue: 30, description: 'Below target molecular weight for retention; 1/3 rule of thumb.', affectsYield: false },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    hcpLogReduction:          [0.1, 0.5],
    dnaLogReduction:          [0.5, 1.5],
    commonChallenges:         ['Gel layer at high concentration limits achievable concentration', 'Membrane fouling reduces flux over batch'],
    references:               ['van Reis & Zydney 2007, J Membr Sci 297:16'],
  },
  {
    id:                       'df-buffer-exchange',
    name:                     'Diafiltration Buffer Exchange',
    shortLabel:               'DF',
    category:                 STEP_CATEGORY.UF_DF,
    description:              'Tangential flow diafiltration exchanges the process buffer for the final formulation buffer at constant volume.',
    yieldRangePct:            [94, 99],
    yieldRangeConfidence:     0.93,
    parameters: [
      { key: 'diavolumes',     label: 'Diavolumes',         unit: 'DV',      min: 5, max: 15, defaultValue: 7, description: 'More diavolumes give cleaner exchange; 7 DV = 99.9% exchange.', affectsYield: true },
      { key: 'crossflowLMmin', label: 'Crossflow velocity', unit: 'L/m/min', min: 1, max: 6,  defaultValue: 3, description: 'Higher crossflow improves mass transfer; risks shear damage.',  affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    hcpLogReduction:          [0, 0.2],
    dnaLogReduction:          [0.2, 0.8],
    commonChallenges:         ['Donnan effect can shift pH at low ionic strength', 'Shear-sensitive products require crossflow tuning'],
    references:               ['Lipnizki 2010, Filtration 10:286'],
  },
  {
    id:                       'sterile-filtration-fill',
    name:                     'Sterile Filtration & Fill',
    shortLabel:               'Sterile Fill',
    category:                 STEP_CATEGORY.FORMULATION,
    description:              'Final 0.22 µm sterile filtration into drug product containers (vials, syringes). Last step before product release.',
    yieldRangePct:            [95, 99],
    yieldRangeConfidence:     0.92,
    parameters: [
      { key: 'filterRating_um', label: 'Filter rating',       unit: 'µm',   min: 0.1, max: 0.22, defaultValue: 0.22, description: 'Standard sterile rating; 0.1 µm for mycoplasma removal.', affectsYield: false },
      { key: 'preFiltration',   label: 'Pre-filter included', unit: 'bool', min: 0,   max: 1,    defaultValue: 1,    description: 'Pre-filter protects final sterile filter from clogging.', affectsYield: true },
    ],
    compatibleMolecules:      [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN, MOLECULE_TYPE.VIRAL_VECTOR],
    hcpLogReduction:          [0, 0.1],
    dnaLogReduction:          [0, 0.1],
    commonChallenges:         ['Filter binding for some proteins causes losses', 'Filter sizing affects time and yield'],
    references:               ['Aldington & Bonnerjea 2007, J Chromatogr B 848:64'],
  },
]

// Lookup helpers for downstream UI and YieldPredictionEngine.

export function getStepById(id: string): ProcessStepEntry | undefined {
  return PROCESS_STEP_CATALOG.find(s => s.id === id)
}

export function getStepsByCategory(category: StepCategory): ProcessStepEntry[] {
  return PROCESS_STEP_CATALOG.filter(s => s.category === category)
}

export function getStepsCompatibleWith(molecule: MoleculeType): ProcessStepEntry[] {
  return PROCESS_STEP_CATALOG.filter(s => s.compatibleMolecules.includes(molecule))
}

// Default ordered process trains per molecule type — used by Method Templates and onboarding.

export const DEFAULT_PROCESS_TRAIN: Partial<Record<MoleculeType, string[]>> = {
  [MOLECULE_TYPE.MAB]:                  ['depth-filtration', 'protein-a-capture', 'low-ph-viral-inactivation', 'aex-polish-flowthrough', 'cex-polish', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
  [MOLECULE_TYPE.BISPECIFIC]:           ['depth-filtration', 'protein-a-capture', 'low-ph-viral-inactivation', 'cex-polish', 'hic-polish', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
  [MOLECULE_TYPE.FUSION_PROTEIN]:       ['depth-filtration', 'protein-a-capture', 'low-ph-viral-inactivation', 'aex-polish-flowthrough', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
  [MOLECULE_TYPE.RECOMBINANT_PROTEIN]:  ['depth-filtration', 'imac-capture', 'aex-polish-flowthrough', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
  [MOLECULE_TYPE.ENZYME]:               ['centrifugation', 'imac-capture', 'cex-polish', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
}
