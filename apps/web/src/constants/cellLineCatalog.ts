// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Cell line catalog — the core data file driving cell line prediction (Module 1a).
// Every field exists to serve the ranking algorithm in utils/cellLine/ranking.ts.

import { MOLECULE_TYPE, type MoleculeType } from './moleculeTypes'

export const HOST_SPECIES = {
  MAMMALIAN: 'mammalian',
  INSECT:    'insect',
  BACTERIAL: 'bacterial',
  YEAST:     'yeast',
} as const

export type HostSpecies = typeof HOST_SPECIES[keyof typeof HOST_SPECIES]

export const EXPRESSION_MODE = {
  TRANSIENT: 'transient',
  STABLE:    'stable',
  BOTH:      'both',
} as const

export type ExpressionMode = typeof EXPRESSION_MODE[keyof typeof EXPRESSION_MODE]

export const GLYCOSYLATION_TYPE = {
  NONE:                'none',                  // bacterial — no glycosylation
  SIMPLE:              'simple',                // yeast — high-mannose, immunogenic for human therapeutics
  MAMMALIAN_LIKE:      'mammalian-like',        // CHO, HEK — N-linked complex glycans, suitable for human therapeutics
  INSECT_PAUCIMANNOSE: 'insect-paucimannose',   // Sf9 — paucimannose, sometimes acceptable
} as const

export type GlycosylationType = typeof GLYCOSYLATION_TYPE[keyof typeof GLYCOSYLATION_TYPE]

export interface ProductivityProfile {
  titerRange: [number, number]   // [low, high] of the typical range
  units:      string             // 'g/L', 'vg/mL', 'IU/mL', etc.
  confidence: number             // 0-1; how well-established this profile is in literature
}

export interface CellLineEntry {
  id:                       string
  name:                     string                                  // full official name
  shortLabel:               string                                  // UI-display short form
  hostSpecies:              HostSpecies
  description:              string                                  // one sentence for UI cards
  doublingTimeHrs:          [number, number]                        // [low, high] typical range
  expressionMode:           ExpressionMode
  glycosylation:            GlycosylationType
  regulatoryAcceptance:     number                                  // 0-1; based on number of approved products
  numApprovedProducts:      number                                  // concrete count of FDA/EMA-approved products
  compatibleMoleculeTypes:  MoleculeType[]                          // molecules this line expresses well
  productivityProfiles:     Partial<Record<MoleculeType, ProductivityProfile>>  // expected titer per molecule type
  commonChallenges:         string[]                                // process development risks
  vendorSources:            string[]                                // where to actually buy the cells
  references:               string[]
}

export const CELL_LINE_CATALOG: CellLineEntry[] = [
  {
    id:                       'cho-k1',
    name:                     'CHO-K1',
    shortLabel:               'CHO-K1',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'Industry-standard Chinese hamster ovary line; the most widely used host for therapeutic protein and antibody production.',
    doublingTimeHrs:          [18, 24],
    expressionMode:           EXPRESSION_MODE.BOTH,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.95,
    numApprovedProducts:      80,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    productivityProfiles: {
      [MOLECULE_TYPE.MAB]:                 { titerRange: [3, 10],   units: 'g/L', confidence: 0.95 },
      [MOLECULE_TYPE.BISPECIFIC]:          { titerRange: [0.5, 3],  units: 'g/L', confidence: 0.75 },
      [MOLECULE_TYPE.FUSION_PROTEIN]:      { titerRange: [1, 5],    units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.5, 4],  units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.ENZYME]:              { titerRange: [0.3, 3],  units: 'g/L', confidence: 0.80 },
      [MOLECULE_TYPE.VACCINE_ANTIGEN]:     { titerRange: [0.5, 2],  units: 'g/L', confidence: 0.70 },
    },
    commonChallenges:         ['Long cell line development timeline (6–9 months)', 'Glycoform variability requires media tuning', 'Adventitious agent screening for IND'],
    vendorSources:            ['ATCC (CCL-61)', 'Thermo Fisher (Gibco)', 'Sartorius'],
    references:               ['Walsh 2018, Nat Biotechnol 36:1136', 'Kunert & Reinhart 2016, Appl Microbiol Biotechnol 100:3451'],
  },
  {
    id:                       'cho-s',
    name:                     'CHO-S',
    shortLabel:               'CHO-S',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'Suspension-adapted CHO line optimized for high-density bioreactor culture; widely used for stable mAb expression.',
    doublingTimeHrs:          [16, 22],
    expressionMode:           EXPRESSION_MODE.BOTH,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.90,
    numApprovedProducts:      30,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    productivityProfiles: {
      [MOLECULE_TYPE.MAB]:                 { titerRange: [4, 12],  units: 'g/L', confidence: 0.90 },
      [MOLECULE_TYPE.BISPECIFIC]:          { titerRange: [0.5, 4], units: 'g/L', confidence: 0.75 },
      [MOLECULE_TYPE.FUSION_PROTEIN]:      { titerRange: [1, 5],   units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.5, 5], units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.ENZYME]:              { titerRange: [0.3, 3], units: 'g/L', confidence: 0.80 },
    },
    commonChallenges:         ['Suspension adaptation can affect productivity', 'High-density culture requires controlled feeding strategy'],
    vendorSources:            ['Thermo Fisher (Gibco)', 'Sartorius'],
    references:               ['Reinhart et al. 2015, Appl Microbiol Biotechnol 99:4645'],
  },
  {
    id:                       'cho-dg44',
    name:                     'CHO-DG44',
    shortLabel:               'CHO-DG44',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'DHFR-deficient CHO line enabling MTX-amplified stable expression; used historically for many approved biologics.',
    doublingTimeHrs:          [18, 26],
    expressionMode:           EXPRESSION_MODE.STABLE,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.92,
    numApprovedProducts:      40,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.MAB, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    productivityProfiles: {
      [MOLECULE_TYPE.MAB]:                 { titerRange: [2, 8],   units: 'g/L', confidence: 0.92 },
      [MOLECULE_TYPE.FUSION_PROTEIN]:      { titerRange: [0.8, 4], units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.5, 3], units: 'g/L', confidence: 0.80 },
      [MOLECULE_TYPE.ENZYME]:              { titerRange: [0.3, 2], units: 'g/L', confidence: 0.75 },
    },
    commonChallenges:         ['DHFR/MTX amplification adds development time', 'Less suitable for transient expression than CHO-K1'],
    vendorSources:            ['Thermo Fisher (Gibco)'],
    references:               ['Urlaub & Chasin 1980, PNAS 77:4216'],
  },
  {
    id:                       'hek293t',
    name:                     'HEK293T',
    shortLabel:               'HEK293T',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'SV40 large-T-antigen-expressing HEK293 variant; the standard host for transient transfection-based viral vector production.',
    doublingTimeHrs:          [20, 26],
    expressionMode:           EXPRESSION_MODE.TRANSIENT,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.85,
    numApprovedProducts:      6,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.VIRAL_VECTOR, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    productivityProfiles: {
      [MOLECULE_TYPE.VIRAL_VECTOR]:        { titerRange: [1e13, 1e14], units: 'vg/L', confidence: 0.85 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.05, 0.5],  units: 'g/L',  confidence: 0.75 },
    },
    commonChallenges:         ['Empty capsid contamination in AAV production', 'Lower scalability than CHO for protein production', 'Adventitious agent risk requires careful sourcing'],
    vendorSources:            ['ATCC (CRL-3216)', 'Thermo Fisher', 'Takara'],
    references:               ['DuBridge et al. 1987, Mol Cell Biol 7:379', 'Wright 2009, Hum Gene Ther 20:698'],
  },
  {
    id:                       'hek293f',
    name:                     'HEK293F',
    shortLabel:               'HEK293F',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'Suspension-adapted HEK293 line; widely used for transient protein and vaccine antigen production at small-to-mid scale.',
    doublingTimeHrs:          [20, 28],
    expressionMode:           EXPRESSION_MODE.TRANSIENT,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.70,
    numApprovedProducts:      3,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.VACCINE_ANTIGEN, MOLECULE_TYPE.VIRAL_VECTOR],
    productivityProfiles: {
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.1, 1],     units: 'g/L', confidence: 0.80 },
      [MOLECULE_TYPE.VACCINE_ANTIGEN]:     { titerRange: [0.1, 0.8],   units: 'g/L', confidence: 0.75 },
      [MOLECULE_TYPE.VIRAL_VECTOR]:        { titerRange: [5e12, 5e13], units: 'vg/L', confidence: 0.70 },
    },
    commonChallenges:         ['Lower titers than CHO for stable production', 'Transient runs scale linearly with cost — expensive at scale'],
    vendorSources:            ['Thermo Fisher (Gibco)'],
    references:               ['Stettler et al. 2007, Biotechnol Prog 23:1340'],
  },
  {
    id:                       'expi293f',
    name:                     'Expi293F',
    shortLabel:               'Expi293F',
    hostSpecies:              HOST_SPECIES.MAMMALIAN,
    description:              'High-expression HEK293 variant optimized for transient protein production; the workhorse for research and small-scale GMP material.',
    doublingTimeHrs:          [18, 24],
    expressionMode:           EXPRESSION_MODE.TRANSIENT,
    glycosylation:            GLYCOSYLATION_TYPE.MAMMALIAN_LIKE,
    regulatoryAcceptance:     0.60,
    numApprovedProducts:      1,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.VACCINE_ANTIGEN],
    productivityProfiles: {
      [MOLECULE_TYPE.MAB]:                 { titerRange: [0.5, 2],   units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.BISPECIFIC]:          { titerRange: [0.1, 1],   units: 'g/L', confidence: 0.75 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.1, 1.5], units: 'g/L', confidence: 0.80 },
      [MOLECULE_TYPE.VACCINE_ANTIGEN]:     { titerRange: [0.1, 1],   units: 'g/L', confidence: 0.70 },
    },
    commonChallenges:         ['Transient only — not suitable for stable production at commercial scale', 'Cost per gram higher than CHO at scale', 'Limited regulatory precedent'],
    vendorSources:            ['Thermo Fisher (Gibco)'],
    references:               ['Stettler et al. 2007, Biotechnol Prog 23:1340'],
  },
  {
    id:                       'sf9',
    name:                     'Sf9',
    shortLabel:               'Sf9',
    hostSpecies:              HOST_SPECIES.INSECT,
    description:              'Spodoptera frugiperda insect cell line used with baculovirus expression system; specialized for VLP, viral vector, and complex protein production.',
    doublingTimeHrs:          [24, 30],
    expressionMode:           EXPRESSION_MODE.TRANSIENT,
    glycosylation:            GLYCOSYLATION_TYPE.INSECT_PAUCIMANNOSE,
    regulatoryAcceptance:     0.75,
    numApprovedProducts:      5,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.VIRAL_VECTOR, MOLECULE_TYPE.VACCINE_ANTIGEN, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    productivityProfiles: {
      [MOLECULE_TYPE.VIRAL_VECTOR]:        { titerRange: [1e13, 1e15], units: 'vg/L', confidence: 0.80 },
      [MOLECULE_TYPE.VACCINE_ANTIGEN]:     { titerRange: [0.05, 0.5],  units: 'g/L',  confidence: 0.75 },
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [0.05, 0.3],  units: 'g/L',  confidence: 0.70 },
    },
    commonChallenges:         ['Insect glycosylation (paucimannose) not suitable for most human therapeutic proteins', 'Baculovirus contamination requires removal in downstream', 'Lower cell density than mammalian'],
    vendorSources:            ['ATCC (CRL-1711)', 'Thermo Fisher', 'Expression Systems'],
    references:               ['Vaughn et al. 1977, In Vitro 13:213', 'Felberbaum 2015, Biotechnol J 10:702'],
  },
  {
    id:                       'bl21-de3',
    name:                     'E. coli BL21(DE3)',
    shortLabel:               'BL21(DE3)',
    hostSpecies:              HOST_SPECIES.BACTERIAL,
    description:              'T7-based inducible expression strain; the standard host for non-glycosylated proteins, enzymes, and plasmid DNA production.',
    doublingTimeHrs:          [0.3, 0.5],
    expressionMode:           EXPRESSION_MODE.STABLE,
    glycosylation:            GLYCOSYLATION_TYPE.NONE,
    regulatoryAcceptance:     0.80,
    numApprovedProducts:      15,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.PLASMID_DNA],
    productivityProfiles: {
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [1, 10], units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.ENZYME]:              { titerRange: [1, 8],  units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.PLASMID_DNA]:         { titerRange: [0.1, 1], units: 'g/L', confidence: 0.85 },
    },
    commonChallenges:         ['Inclusion body formation requires refolding for many proteins', 'No glycosylation — not suitable for glycoproteins', 'Endotoxin clearance required in downstream'],
    vendorSources:            ['Thermo Fisher (Invitrogen)', 'Sigma-Aldrich', 'New England Biolabs'],
    references:               ['Studier & Moffatt 1986, J Mol Biol 189:113', 'Rosano & Ceccarelli 2014, Front Microbiol 5:172'],
  },
  {
    id:                       'pichia-gs115',
    name:                     'Pichia pastoris GS115',
    shortLabel:               'Pichia GS115',
    hostSpecies:              HOST_SPECIES.YEAST,
    description:              'Methylotrophic yeast strain with AOX1 promoter; produces high-titer secreted proteins with simple post-translational modification.',
    doublingTimeHrs:          [2, 4],
    expressionMode:           EXPRESSION_MODE.STABLE,
    glycosylation:            GLYCOSYLATION_TYPE.SIMPLE,
    regulatoryAcceptance:     0.70,
    numApprovedProducts:      5,
    compatibleMoleculeTypes:  [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    productivityProfiles: {
      [MOLECULE_TYPE.RECOMBINANT_PROTEIN]: { titerRange: [1, 15], units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.ENZYME]:              { titerRange: [1, 12], units: 'g/L', confidence: 0.85 },
      [MOLECULE_TYPE.VACCINE_ANTIGEN]:     { titerRange: [0.5, 5], units: 'g/L', confidence: 0.75 },
    },
    commonChallenges:         ['High-mannose glycans can be immunogenic in human therapeutics', 'Methanol feed requires explosion-proof bioreactor', 'Slower process development than bacterial systems'],
    vendorSources:            ['Thermo Fisher (Invitrogen)', 'ATCC'],
    references:               ['Cregg et al. 2000, Mol Biotechnol 16:23', 'Ahmad et al. 2014, Appl Microbiol Biotechnol 98:5301'],
  },
]

// Lookup helpers used by the ranking algorithm and cell line picker UI.

export function getCellLineById(id: string): CellLineEntry | undefined {
  return CELL_LINE_CATALOG.find(c => c.id === id)
}

export function getCellLinesByHostSpecies(species: HostSpecies): CellLineEntry[] {
  return CELL_LINE_CATALOG.filter(c => c.hostSpecies === species)
}

export function getCellLinesCompatibleWith(molecule: MoleculeType): CellLineEntry[] {
  return CELL_LINE_CATALOG.filter(c => c.compatibleMoleculeTypes.includes(molecule))
}

export function getProductivityFor(cellLine: CellLineEntry, molecule: MoleculeType): ProductivityProfile | undefined {
  return cellLine.productivityProfiles[molecule]
}
