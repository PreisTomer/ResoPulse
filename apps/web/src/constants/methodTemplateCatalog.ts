// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Method template catalog — pre-configured campaign starting points for common workflows.

import { MOLECULE_TYPE, type MoleculeType } from './moleculeTypes'
import { DEFAULT_PROCESS_TRAIN } from './processStepCatalog'

export const TEMPLATE_COMPLEXITY = {
  STANDARD:  'standard',
  MODERATE:  'moderate',
  ADVANCED:  'advanced',
} as const

export type TemplateComplexity = typeof TEMPLATE_COMPLEXITY[keyof typeof TEMPLATE_COMPLEXITY]

export interface MethodTemplate {
  id:                   string
  name:                 string
  description:          string
  moleculeType:         MoleculeType
  cellLineId:           string
  downstreamSteps:      string[]
  expectedYieldPct:     [number, number]
  complexity:           TemplateComplexity
  references:           string[]
}

export const METHOD_TEMPLATE_CATALOG: MethodTemplate[] = [
  {
    id:               'mab-cho-platform',
    name:             'Monoclonal Antibody in CHO',
    description:      'The industry-standard platform: stable CHO-K1 expression, Protein A capture, polish, and standard viral safety. The default starting point for most IgG programs.',
    moleculeType:     MOLECULE_TYPE.MAB,
    cellLineId:       'cho-k1',
    downstreamSteps:  DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB] ?? [],
    expectedYieldPct: [40, 55],
    complexity:       TEMPLATE_COMPLEXITY.STANDARD,
    references:       ['Shukla & Thömmes 2010, Trends Biotechnol 28:253'],
  },
  {
    id:               'aav-hek293-transient',
    name:             'AAV Viral Vector in HEK293T',
    description:      'Transient triple-transfection in HEK293T for AAV gene therapy vectors. Distinct downstream: no low-pH viral inactivation, focus on empty/full capsid considerations.',
    moleculeType:     MOLECULE_TYPE.VIRAL_VECTOR,
    cellLineId:       'hek293t',
    downstreamSteps:  ['depth-filtration', 'cex-capture', 'aex-polish-flowthrough', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
    expectedYieldPct: [10, 30],
    complexity:       TEMPLATE_COMPLEXITY.ADVANCED,
    references:       ['Wright 2009, Hum Gene Ther 20:698'],
  },
  {
    id:               'recombinant-ecoli',
    name:             'Recombinant Protein in E. coli',
    description:      'High-titer intracellular expression in BL21(DE3) with IMAC capture. Fast, economical platform for non-glycosylated proteins and enzymes.',
    moleculeType:     MOLECULE_TYPE.RECOMBINANT_PROTEIN,
    cellLineId:       'bl21-de3',
    downstreamSteps:  DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.RECOMBINANT_PROTEIN] ?? [],
    expectedYieldPct: [25, 50],
    complexity:       TEMPLATE_COMPLEXITY.STANDARD,
    references:       ['Rosano & Ceccarelli 2014, Front Microbiol 5:172'],
  },
  {
    id:               'bispecific-cho',
    name:             'Bispecific Antibody in CHO',
    description:      'Higher-complexity CHO platform with extra polishing to resolve chain-mispairing species. Lower titers than standard IgG, more polish steps.',
    moleculeType:     MOLECULE_TYPE.BISPECIFIC,
    cellLineId:       'cho-k1',
    downstreamSteps:  DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.BISPECIFIC] ?? [],
    expectedYieldPct: [15, 35],
    complexity:       TEMPLATE_COMPLEXITY.ADVANCED,
    references:       ['Brinkmann & Kontermann 2017, MAbs 9:182'],
  },
  {
    id:               'vaccine-antigen-sf9',
    name:             'Vaccine Antigen in Sf9 (VLP)',
    description:      'Baculovirus expression in Sf9 insect cells for virus-like particle antigens. Used for several approved vaccines.',
    moleculeType:     MOLECULE_TYPE.VACCINE_ANTIGEN,
    cellLineId:       'sf9',
    downstreamSteps:  ['depth-filtration', 'imac-capture', 'aex-polish-flowthrough', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
    expectedYieldPct: [15, 40],
    complexity:       TEMPLATE_COMPLEXITY.MODERATE,
    references:       ['Felberbaum 2015, Biotechnol J 10:702'],
  },
  {
    id:               'enzyme-pichia',
    name:             'Therapeutic Enzyme in Pichia',
    description:      'High-titer secreted expression in Pichia pastoris with AOX1 promoter. Strong for enzymes that tolerate yeast glycosylation.',
    moleculeType:     MOLECULE_TYPE.ENZYME,
    cellLineId:       'pichia-gs115',
    downstreamSteps:  DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.ENZYME] ?? ['centrifugation', 'imac-capture', 'cex-polish', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'],
    expectedYieldPct: [25, 50],
    complexity:       TEMPLATE_COMPLEXITY.MODERATE,
    references:       ['Cregg et al. 2000, Mol Biotechnol 16:23'],
  },
]

export function getTemplateById(id: string): MethodTemplate | undefined {
  return METHOD_TEMPLATE_CATALOG.find(t => t.id === id)
}
