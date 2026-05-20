// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Target molecule types — the biologic the user is producing. Selected at campaign creation;
// drives cell line recommendations, genetic strategy defaults, and downstream process templates.

export const MOLECULE_TYPE = {
  MAB:                  'mab',
  BISPECIFIC:           'bispecific',
  FUSION_PROTEIN:       'fusion-protein',
  RECOMBINANT_PROTEIN:  'recombinant-protein',
  ENZYME:               'enzyme',
  VIRAL_VECTOR:         'viral-vector',
  PLASMID_DNA:          'plasmid-dna',
  VACCINE_ANTIGEN:      'vaccine-antigen',
  OTHER:                'other',
} as const

export type MoleculeType = typeof MOLECULE_TYPE[keyof typeof MOLECULE_TYPE]

// Broader categories used for grouping in UI and for downstream process defaults.
export const MOLECULE_CATEGORY = {
  ANTIBODY:        'antibody',         // mAb, bispecific, fusion — Protein A capture path
  PROTEIN:         'protein',          // recombinant proteins, enzymes — IMAC or IEX capture
  VIRAL_VECTOR:    'viral-vector',     // AAV, lentivirus — different downstream entirely
  NUCLEIC_ACID:    'nucleic-acid',     // plasmid DNA — chromatography + tangential flow
  ANTIGEN:         'antigen',          // vaccine antigens — varies by platform
  OTHER:           'other',
} as const

export type MoleculeCategory = typeof MOLECULE_CATEGORY[keyof typeof MOLECULE_CATEGORY]

// Where the product accumulates after expression — drives clarification step and yield model.
export const SECRETION_TYPE = {
  SECRETED:        'secreted',         // exported from cell into media (most mAbs)
  INTRACELLULAR:   'intracellular',    // accumulates inside cell (most E. coli proteins, inclusion bodies)
  CELL_ASSOCIATED: 'cell-associated',  // viral vectors, some membrane proteins
} as const

export type SecretionType = typeof SECRETION_TYPE[keyof typeof SECRETION_TYPE]

// Typical complexity of process development for this molecule class.
export const PROCESS_COMPLEXITY = {
  LOW:    'low',     // well-established platform, predictable yield ranges
  MEDIUM: 'medium',  // moderate variability between molecules
  HIGH:   'high',    // each molecule is bespoke, large yield variability
} as const

export type ProcessComplexity = typeof PROCESS_COMPLEXITY[keyof typeof PROCESS_COMPLEXITY]

export interface MoleculeTypeMeta {
  id: MoleculeType
  category: MoleculeCategory
  label: string
  shortLabel: string
  description: string
  typicalSizeKDa: [number, number]              // typical molecular weight range, kDa
  secretion: SecretionType
  complexity: ProcessComplexity
  commonHostCells: string[]                     // cellLineCatalog ids most often used
  typicalEndToEndYieldPct: [number, number]     // industry benchmark, % overall recovery
  commonChallenges: string[]
  exampleProducts: string[]
  references: string[]
}

export const MOLECULE_TYPE_META: Record<MoleculeType, MoleculeTypeMeta> = {
  [MOLECULE_TYPE.MAB]: {
    id:                       MOLECULE_TYPE.MAB,
    category:                 MOLECULE_CATEGORY.ANTIBODY,
    label:                    'Monoclonal Antibody',
    shortLabel:               'mAb',
    description:              'IgG-class antibody produced as a single clonal population. The most common biologic on the market.',
    typicalSizeKDa:           [145, 155],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.LOW,
    commonHostCells:          ['cho-k1', 'cho-s', 'cho-dg44', 'expi293f'],
    typicalEndToEndYieldPct:  [35, 55],
    commonChallenges:         ['Aggregate formation during low-pH viral inactivation', 'Charge variant heterogeneity', 'Glycoform consistency batch-to-batch'],
    exampleProducts:          ['Adalimumab (Humira)', 'Trastuzumab (Herceptin)', 'Pembrolizumab (Keytruda)'],
    references:               ['Walsh 2018, Nat Biotechnol 36:1136', 'Kunert & Reinhart 2016, Appl Microbiol Biotechnol 100:3451'],
  },
  [MOLECULE_TYPE.BISPECIFIC]: {
    id:                       MOLECULE_TYPE.BISPECIFIC,
    category:                 MOLECULE_CATEGORY.ANTIBODY,
    label:                    'Bispecific Antibody',
    shortLabel:               'Bispecific',
    description:              'Engineered antibody binding two different antigens simultaneously. Higher complexity than standard mAbs.',
    typicalSizeKDa:           [100, 200],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.HIGH,
    commonHostCells:          ['cho-k1', 'cho-s', 'expi293f'],
    typicalEndToEndYieldPct:  [15, 35],
    commonChallenges:         ['Chain mispairing producing inactive species', 'Lower titers than standard IgG', 'Aggregate-prone in capture step'],
    exampleProducts:          ['Blinatumomab (Blincyto)', 'Emicizumab (Hemlibra)', 'Mosunetuzumab (Lunsumio)'],
    references:               ['Brinkmann & Kontermann 2017, MAbs 9:182', 'Labrijn et al. 2019, Nat Rev Drug Discov 18:585'],
  },
  [MOLECULE_TYPE.FUSION_PROTEIN]: {
    id:                       MOLECULE_TYPE.FUSION_PROTEIN,
    category:                 MOLECULE_CATEGORY.ANTIBODY,
    label:                    'Fc Fusion Protein',
    shortLabel:               'Fc Fusion',
    description:              'Therapeutic protein domain fused to an antibody Fc region for extended half-life. Captured on Protein A like mAbs.',
    typicalSizeKDa:           [80, 200],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.MEDIUM,
    commonHostCells:          ['cho-k1', 'cho-s', 'cho-dg44'],
    typicalEndToEndYieldPct:  [25, 45],
    commonChallenges:         ['Misfolding of fusion partner domain', 'Lower expression than standard IgG', 'Variable Protein A binding'],
    exampleProducts:          ['Etanercept (Enbrel)', 'Aflibercept (Eylea)', 'Abatacept (Orencia)'],
    references:               ['Czajkowsky et al. 2012, EMBO Mol Med 4:1015'],
  },
  [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: {
    id:                       MOLECULE_TYPE.RECOMBINANT_PROTEIN,
    category:                 MOLECULE_CATEGORY.PROTEIN,
    label:                    'Recombinant Protein',
    shortLabel:               'Recombinant',
    description:              'Non-antibody therapeutic protein (hormones, cytokines, growth factors). Production system depends on glycosylation needs.',
    typicalSizeKDa:           [10, 100],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.MEDIUM,
    commonHostCells:          ['cho-k1', 'hek293f', 'expi293f', 'pichia-gs115', 'bl21-de3'],
    typicalEndToEndYieldPct:  [20, 50],
    commonChallenges:         ['Glycosylation differences between host systems', 'Folding fidelity for complex proteins', 'Endotoxin clearance for bacterial systems'],
    exampleProducts:          ['Insulin', 'Erythropoietin', 'Human growth hormone'],
    references:               ['Walsh 2018, Nat Biotechnol 36:1136', 'Owczarek et al. 2019, BioMed Res Int 2019:4216060'],
  },
  [MOLECULE_TYPE.ENZYME]: {
    id:                       MOLECULE_TYPE.ENZYME,
    category:                 MOLECULE_CATEGORY.PROTEIN,
    label:                    'Therapeutic Enzyme',
    shortLabel:               'Enzyme',
    description:              'Recombinant enzyme for therapy (e.g. enzyme replacement) or industrial use. Often requires specific glycosylation.',
    typicalSizeKDa:           [30, 250],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.MEDIUM,
    commonHostCells:          ['cho-k1', 'cho-s', 'pichia-gs115', 'bl21-de3'],
    typicalEndToEndYieldPct:  [25, 50],
    commonChallenges:         ['Maintaining catalytic activity through purification', 'Specific glycosylation for lysosomal targeting (mannose-6-phosphate)', 'Stability in formulation'],
    exampleProducts:          ['Imiglucerase (Cerezyme)', 'Alglucosidase alfa (Myozyme)'],
    references:               ['Concolino et al. 2018, Ital J Pediatr 44:120'],
  },
  [MOLECULE_TYPE.VIRAL_VECTOR]: {
    id:                       MOLECULE_TYPE.VIRAL_VECTOR,
    category:                 MOLECULE_CATEGORY.VIRAL_VECTOR,
    label:                    'Viral Vector',
    shortLabel:               'Viral Vector',
    description:              'Recombinant virus (AAV, lentivirus, adenovirus) used as gene therapy delivery vehicle. Distinct downstream from proteins.',
    typicalSizeKDa:           [3500, 4500],
    secretion:                SECRETION_TYPE.CELL_ASSOCIATED,
    complexity:               PROCESS_COMPLEXITY.HIGH,
    commonHostCells:          ['hek293t', 'hek293f', 'sf9'],
    typicalEndToEndYieldPct:  [10, 30],
    commonChallenges:         ['Empty vs full capsid separation', 'High-dose viral inactivation not applicable', 'Low overall recoveries vs proteins', 'Aggregation at process concentrations'],
    exampleProducts:          ['Onasemnogene abeparvovec (Zolgensma)', 'Voretigene neparvovec (Luxturna)'],
    references:               ['Wright 2009, Hum Gene Ther 20:698', 'Rumachik et al. 2020, Mol Ther Methods Clin Dev 18:98'],
  },
  [MOLECULE_TYPE.PLASMID_DNA]: {
    id:                       MOLECULE_TYPE.PLASMID_DNA,
    category:                 MOLECULE_CATEGORY.NUCLEIC_ACID,
    label:                    'Plasmid DNA',
    shortLabel:               'Plasmid DNA',
    description:              'Therapeutic or transfection-grade plasmid DNA. Produced in bacterial systems with distinct downstream from proteins.',
    typicalSizeKDa:           [3000, 8000],
    secretion:                SECRETION_TYPE.INTRACELLULAR,
    complexity:               PROCESS_COMPLEXITY.MEDIUM,
    commonHostCells:          ['bl21-de3'],
    typicalEndToEndYieldPct:  [30, 50],
    commonChallenges:         ['Supercoiled vs relaxed/linear form ratio', 'Endotoxin clearance', 'Genomic DNA contamination removal'],
    exampleProducts:          ['mRNA vaccine starting material', 'AAV / lentivirus production intermediate'],
    references:               ['Schmeer et al. 2017, Methods Mol Biol 1654:9'],
  },
  [MOLECULE_TYPE.VACCINE_ANTIGEN]: {
    id:                       MOLECULE_TYPE.VACCINE_ANTIGEN,
    category:                 MOLECULE_CATEGORY.ANTIGEN,
    label:                    'Vaccine Antigen',
    shortLabel:               'Antigen',
    description:              'Recombinant protein antigen for vaccines (subunit, VLP, or recombinant viral protein). Process varies widely by antigen design.',
    typicalSizeKDa:           [20, 400],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.HIGH,
    commonHostCells:          ['cho-k1', 'hek293f', 'sf9', 'pichia-gs115'],
    typicalEndToEndYieldPct:  [15, 40],
    commonChallenges:         ['Conformational integrity of antigenic epitopes', 'Adjuvant compatibility in formulation', 'VLP assembly efficiency where applicable'],
    exampleProducts:          ['HPV vaccine (Gardasil)', 'Hepatitis B vaccine', 'Recombinant zoster vaccine (Shingrix)'],
    references:               ['Plotkin et al. 2017, Vaccines 7th ed.', 'Mohsen et al. 2017, Semin Immunol 34:123'],
  },
  [MOLECULE_TYPE.OTHER]: {
    id:                       MOLECULE_TYPE.OTHER,
    category:                 MOLECULE_CATEGORY.OTHER,
    label:                    'Other Biologic',
    shortLabel:               'Other',
    description:              'Custom or non-standard biologic. Cell line and process recommendations require manual specification.',
    typicalSizeKDa:           [10, 500],
    secretion:                SECRETION_TYPE.SECRETED,
    complexity:               PROCESS_COMPLEXITY.HIGH,
    commonHostCells:          [],
    typicalEndToEndYieldPct:  [10, 50],
    commonChallenges:         ['Generic platform may not apply', 'Process development is bespoke'],
    exampleProducts:          [],
    references:               [],
  },
}

// Helpers used by molecule pickers, cell line ranking, and downstream defaults.

export function getMoleculeMeta(type: MoleculeType): MoleculeTypeMeta {
  return MOLECULE_TYPE_META[type]
}

export function getMoleculeTypesByCategory(category: MoleculeCategory): MoleculeTypeMeta[] {
  return Object.values(MOLECULE_TYPE_META).filter(m => m.category === category)
}

export const ALL_MOLECULE_TYPES: MoleculeTypeMeta[] = Object.values(MOLECULE_TYPE_META)
