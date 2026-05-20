// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Expression vector catalog — drives Genetic Strategy Advisor (Module 1b).

import { MOLECULE_TYPE, type MoleculeType } from './moleculeTypes'

export const PROMOTER = {
  CMV:     'cmv',          // strong mammalian, transient gold standard
  EF1A:    'ef1a',         // strong mammalian, stable expression
  CAG:     'cag',          // strong hybrid mammalian, broad tissue activity
  SV40:    'sv40',         // moderate mammalian, smaller vector
  T7:      't7',            // bacterial, IPTG-inducible (BL21(DE3))
  ARABAD:  'arabad',       // bacterial, arabinose-tightly-controlled
  POLH:    'polh',         // baculovirus polyhedrin, very high in Sf9
  AOX1:    'aox1',         // Pichia methanol-induced, very high
} as const

export type Promoter = typeof PROMOTER[keyof typeof PROMOTER]

export const SELECTION_MARKER = {
  NEOMYCIN:    'neomycin',     // G418 resistance, mammalian
  HYGROMYCIN:  'hygromycin',   // hygromycin B resistance, mammalian
  PUROMYCIN:   'puromycin',    // puromycin resistance, mammalian (fast)
  BLASTICIDIN: 'blasticidin',  // blasticidin S resistance, mammalian
  DHFR:        'dhfr',         // DHFR amplification, mammalian (CHO-DG44)
  GS:          'gs',           // glutamine synthetase amplification, mammalian
  AMPICILLIN:  'ampicillin',   // bacterial cloning marker
  KANAMYCIN:   'kanamycin',    // bacterial expression marker (safer for therapeutics)
  ZEOCIN:      'zeocin',       // Pichia and mammalian
  NONE:        'none',
} as const

export type SelectionMarker = typeof SELECTION_MARKER[keyof typeof SELECTION_MARKER]

export interface VectorEntry {
  id:                    string
  name:                  string
  shortLabel:            string
  vendor:                string
  description:           string
  promoter:              Promoter
  selectionMarker:       SelectionMarker
  secretionSignal:       string | null               // null = intracellular expression
  compatibleHostCells:   string[]                    // cellLineCatalog ids
  compatibleMolecules:   MoleculeType[]
  supportsTransient:     boolean
  supportsStable:        boolean
  sizeKb:                number
  references:            string[]
}

export const VECTOR_CATALOG: VectorEntry[] = [
  {
    id:                  'pcdna3-1',
    name:                'pcDNA3.1',
    shortLabel:          'pcDNA3.1',
    vendor:              'Thermo Fisher (Invitrogen)',
    description:         'General-purpose mammalian expression vector with CMV promoter; supports both transient and stable expression in most mammalian lines.',
    promoter:            PROMOTER.CMV,
    selectionMarker:     SELECTION_MARKER.NEOMYCIN,
    secretionSignal:     null,
    compatibleHostCells: ['cho-k1', 'cho-s', 'hek293t', 'hek293f', 'expi293f'],
    compatibleMolecules: [MOLECULE_TYPE.MAB, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.VACCINE_ANTIGEN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   true,
    supportsStable:      true,
    sizeKb:              5.4,
    references:          ['Thermo Fisher pcDNA3.1 product literature'],
  },
  {
    id:                  'pcep4',
    name:                'pCEP4',
    shortLabel:          'pCEP4',
    vendor:              'Thermo Fisher (Invitrogen)',
    description:         'Episomal mammalian vector with EBV oriP; high copy number in HEK293 cells for high transient expression yields.',
    promoter:            PROMOTER.CMV,
    selectionMarker:     SELECTION_MARKER.HYGROMYCIN,
    secretionSignal:     null,
    compatibleHostCells: ['hek293t', 'hek293f', 'expi293f'],
    compatibleMolecules: [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.VACCINE_ANTIGEN],
    supportsTransient:   true,
    supportsStable:      false,
    sizeKb:              10.4,
    references:          ['Thermo Fisher pCEP4 product literature'],
  },
  {
    id:                  'pef1-puro',
    name:                'pEF1α-IRES-Puro',
    shortLabel:          'pEF1α-Puro',
    vendor:              'Generic (Addgene variants available)',
    description:         'EF1α promoter for sustained stable expression with puromycin selection; preferred for stable CHO line generation.',
    promoter:            PROMOTER.EF1A,
    selectionMarker:     SELECTION_MARKER.PUROMYCIN,
    secretionSignal:     null,
    compatibleHostCells: ['cho-k1', 'cho-s', 'hek293t', 'hek293f'],
    compatibleMolecules: [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              7.0,
    references:          ['Mizushima & Nagata 1990, Nucleic Acids Res 18:5322'],
  },
  {
    id:                  'pcdna-dhfr',
    name:                'pcDNA-DHFR (variant)',
    shortLabel:          'pcDNA-DHFR',
    vendor:              'Generic (custom builds)',
    description:         'DHFR-containing variant for MTX gene amplification in CHO-DG44; the classical high-titer mAb stable expression workflow.',
    promoter:            PROMOTER.CMV,
    selectionMarker:     SELECTION_MARKER.DHFR,
    secretionSignal:     null,
    compatibleHostCells: ['cho-dg44'],
    compatibleMolecules: [MOLECULE_TYPE.MAB, MOLECULE_TYPE.FUSION_PROTEIN, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              8.2,
    references:          ['Urlaub & Chasin 1980, PNAS 77:4216'],
  },
  {
    id:                  'gs-pee14',
    name:                'pEE14 / GS System',
    shortLabel:          'GS Vector',
    vendor:              'Lonza',
    description:         'Glutamine synthetase selection system widely used for mAb stable lines in CHO and NS0; MSX selection.',
    promoter:            PROMOTER.CMV,
    selectionMarker:     SELECTION_MARKER.GS,
    secretionSignal:     null,
    compatibleHostCells: ['cho-k1', 'cho-s'],
    compatibleMolecules: [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              9.0,
    references:          ['Cockett et al. 1990, Biotechnology 8:662', 'Fan et al. 2012, Biotechnol Bioeng 109:1007'],
  },
  {
    id:                  'pet28',
    name:                'pET-28a(+)',
    shortLabel:          'pET-28a',
    vendor:              'Novagen / Sigma',
    description:         'Bacterial T7 expression vector with N-terminal His-tag for IMAC purification; standard for recombinant protein production in BL21(DE3).',
    promoter:            PROMOTER.T7,
    selectionMarker:     SELECTION_MARKER.KANAMYCIN,
    secretionSignal:     null,
    compatibleHostCells: ['bl21-de3'],
    compatibleMolecules: [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              5.4,
    references:          ['Studier & Moffatt 1986, J Mol Biol 189:113'],
  },
  {
    id:                  'pet22b',
    name:                'pET-22b(+)',
    shortLabel:          'pET-22b',
    vendor:              'Novagen / Sigma',
    description:         'Bacterial T7 vector with pelB secretion signal for periplasmic expression; reduces inclusion body formation for some proteins.',
    promoter:            PROMOTER.T7,
    selectionMarker:     SELECTION_MARKER.AMPICILLIN,
    secretionSignal:     'pelB',
    compatibleHostCells: ['bl21-de3'],
    compatibleMolecules: [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              5.5,
    references:          ['Novy & Morris 2001, inNovations 13:8'],
  },
  {
    id:                  'pbad',
    name:                'pBAD/His',
    shortLabel:          'pBAD',
    vendor:              'Thermo Fisher (Invitrogen)',
    description:         'Arabinose-induced bacterial expression with tight regulation; useful for toxic or growth-inhibitory proteins.',
    promoter:            PROMOTER.ARABAD,
    selectionMarker:     SELECTION_MARKER.AMPICILLIN,
    secretionSignal:     null,
    compatibleHostCells: ['bl21-de3'],
    compatibleMolecules: [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              4.1,
    references:          ['Guzman et al. 1995, J Bacteriol 177:4121'],
  },
  {
    id:                  'pfastbac',
    name:                'pFastBac-1',
    shortLabel:          'pFastBac',
    vendor:              'Thermo Fisher (Invitrogen)',
    description:         'Bac-to-Bac donor plasmid for baculovirus expression in Sf9; standard for VLP, viral vector, and complex protein production.',
    promoter:            PROMOTER.POLH,
    selectionMarker:     SELECTION_MARKER.AMPICILLIN,
    secretionSignal:     null,
    compatibleHostCells: ['sf9'],
    compatibleMolecules: [MOLECULE_TYPE.VIRAL_VECTOR, MOLECULE_TYPE.VACCINE_ANTIGEN, MOLECULE_TYPE.RECOMBINANT_PROTEIN],
    supportsTransient:   true,
    supportsStable:      false,
    sizeKb:              4.8,
    references:          ['Luckow et al. 1993, J Virol 67:4566'],
  },
  {
    id:                  'ppicz-alpha',
    name:                'pPICZα',
    shortLabel:          'pPICZα',
    vendor:              'Thermo Fisher (Invitrogen)',
    description:         'Pichia secreted expression vector with AOX1 promoter and α-mating factor signal; methanol-induced for high-titer secretion.',
    promoter:            PROMOTER.AOX1,
    selectionMarker:     SELECTION_MARKER.ZEOCIN,
    secretionSignal:     'α-mating factor',
    compatibleHostCells: ['pichia-gs115'],
    compatibleMolecules: [MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME, MOLECULE_TYPE.VACCINE_ANTIGEN],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              3.6,
    references:          ['Cregg et al. 2000, Mol Biotechnol 16:23'],
  },
  {
    id:                  'pcdh-lentiviral',
    name:                'pCDH-CMV-MCS-EF1α-Puro',
    shortLabel:          'pCDH',
    vendor:              'System Biosciences',
    description:         'Lentiviral transfer vector for stable integration into mammalian genomes; common for engineered cell line generation.',
    promoter:            PROMOTER.CMV,
    selectionMarker:     SELECTION_MARKER.PUROMYCIN,
    secretionSignal:     null,
    compatibleHostCells: ['cho-k1', 'cho-s', 'hek293t', 'hek293f', 'expi293f'],
    compatibleMolecules: [MOLECULE_TYPE.MAB, MOLECULE_TYPE.RECOMBINANT_PROTEIN, MOLECULE_TYPE.ENZYME],
    supportsTransient:   false,
    supportsStable:      true,
    sizeKb:              8.4,
    references:          ['Naldini et al. 1996, Science 272:263'],
  },
]

// Lookup helpers for Genetic Strategy Advisor and Vector Library views.

export function getVectorById(id: string): VectorEntry | undefined {
  return VECTOR_CATALOG.find(v => v.id === id)
}

export function getVectorsForHostCell(cellLineId: string): VectorEntry[] {
  return VECTOR_CATALOG.filter(v => v.compatibleHostCells.includes(cellLineId))
}

export function getVectorsForMolecule(molecule: MoleculeType): VectorEntry[] {
  return VECTOR_CATALOG.filter(v => v.compatibleMolecules.includes(molecule))
}

export function getVectorsForCellAndMolecule(cellLineId: string, molecule: MoleculeType): VectorEntry[] {
  return VECTOR_CATALOG.filter(v =>
    v.compatibleHostCells.includes(cellLineId) && v.compatibleMolecules.includes(molecule),
  )
}
