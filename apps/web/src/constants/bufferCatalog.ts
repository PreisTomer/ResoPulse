// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Buffer catalog — referenced by StepDetailPanel and Reference Library buffer section.

import { STEP_CATEGORY, type StepCategory } from './processStepCatalog'

export interface BufferComponent {
  name:           string
  concentrationMM: number
}

export interface BufferEntry {
  id:                  string
  name:                string
  shortLabel:          string
  components:          BufferComponent[]
  pHRange:             [number, number]
  conductivityMsCm:    [number, number]
  typicalUses:         StepCategory[]
  recommendedSteps:    string[]                 // processStepCatalog ids
  description:         string
  references:          string[]
}

export const BUFFER_CATALOG: BufferEntry[] = [
  {
    id:               'pbs-1x',
    name:             'PBS (1x Phosphate-Buffered Saline)',
    shortLabel:       'PBS 1x',
    components: [
      { name: 'Sodium phosphate dibasic',  concentrationMM: 10 },
      { name: 'Potassium phosphate monobasic', concentrationMM: 1.8 },
      { name: 'Sodium chloride',           concentrationMM: 137 },
      { name: 'Potassium chloride',        concentrationMM: 2.7 },
    ],
    pHRange:          [7.2, 7.4],
    conductivityMsCm: [14, 16],
    typicalUses:      [STEP_CATEGORY.UF_DF, STEP_CATEGORY.FORMULATION],
    recommendedSteps: ['df-buffer-exchange', 'sterile-filtration-fill'],
    description:      'General-purpose isotonic buffer for protein storage and final formulation; widely used for mAb and recombinant protein products.',
    references:       ['Cold Spring Harbor Protocols 2006'],
  },
  {
    id:               'tris-hcl-50mm-ph75',
    name:             '50 mM Tris-HCl pH 7.5',
    shortLabel:       'Tris pH 7.5',
    components: [
      { name: 'Tris base',         concentrationMM: 50 },
      { name: 'Hydrochloric acid', concentrationMM: 0 },
    ],
    pHRange:          [7.0, 8.5],
    conductivityMsCm: [2, 5],
    typicalUses:      [STEP_CATEGORY.POLISH, STEP_CATEGORY.CAPTURE],
    recommendedSteps: ['aex-polish-flowthrough'],
    description:      'Low-conductivity Tris buffer for anion exchange loading; standard polish step buffer for mAb processes.',
    references:       ['Liu et al. 2010, MAbs 2:480'],
  },
  {
    id:               'hepes-25mm-ph73',
    name:             '25 mM HEPES pH 7.3',
    shortLabel:       'HEPES pH 7.3',
    components: [
      { name: 'HEPES (free acid)', concentrationMM: 25 },
      { name: 'Sodium hydroxide',  concentrationMM: 0 },
    ],
    pHRange:          [6.8, 8.2],
    conductivityMsCm: [1, 3],
    typicalUses:      [STEP_CATEGORY.POLISH, STEP_CATEGORY.UF_DF],
    recommendedSteps: ['aex-polish-flowthrough', 'df-buffer-exchange'],
    description:      'Zwitterionic buffer with minimal metal ion interference; gentle on sensitive proteins.',
    references:       ['Good et al. 1966, Biochemistry 5:467'],
  },
  {
    id:               'acetate-50mm-ph55',
    name:             '50 mM Sodium Acetate pH 5.5',
    shortLabel:       'Acetate pH 5.5',
    components: [
      { name: 'Sodium acetate',  concentrationMM: 50 },
      { name: 'Acetic acid',     concentrationMM: 0 },
    ],
    pHRange:          [4.0, 5.5],
    conductivityMsCm: [3, 6],
    typicalUses:      [STEP_CATEGORY.CAPTURE, STEP_CATEGORY.POLISH],
    recommendedSteps: ['cex-capture', 'cex-polish'],
    description:      'Low-pH buffer for cation exchange loading; loads target below pI for binding.',
    references:       ['Liu et al. 2010, MAbs 2:480'],
  },
  {
    id:               'citrate-100mm-ph35',
    name:             '100 mM Sodium Citrate pH 3.5',
    shortLabel:       'Citrate pH 3.5',
    components: [
      { name: 'Sodium citrate',  concentrationMM: 100 },
      { name: 'Citric acid',     concentrationMM: 0 },
    ],
    pHRange:          [3.0, 6.0],
    conductivityMsCm: [4, 8],
    typicalUses:      [STEP_CATEGORY.VIRAL_INACTIVATION, STEP_CATEGORY.CAPTURE],
    recommendedSteps: ['low-ph-viral-inactivation'],
    description:      'Low-pH buffer used for viral inactivation hold after Protein A elution; broad buffering at acidic pH.',
    references:       ['ICH Q5A(R2) 2024'],
  },
  {
    id:               'glycine-100mm-ph30',
    name:             '100 mM Glycine pH 3.0',
    shortLabel:       'Glycine pH 3.0',
    components: [
      { name: 'Glycine',         concentrationMM: 100 },
      { name: 'Hydrochloric acid', concentrationMM: 0 },
    ],
    pHRange:          [2.5, 3.5],
    conductivityMsCm: [4, 8],
    typicalUses:      [STEP_CATEGORY.CAPTURE],
    recommendedSteps: ['protein-a-capture'],
    description:      'Classical Protein A elution buffer; elutes bound IgG at low pH.',
    references:       ['Hober et al. 2007, J Chromatogr B 848:40'],
  },
  {
    id:               'histidine-20mm-ph60',
    name:             '20 mM Histidine pH 6.0',
    shortLabel:       'Histidine pH 6.0',
    components: [
      { name: 'L-Histidine',     concentrationMM: 20 },
      { name: 'Hydrochloric acid', concentrationMM: 0 },
    ],
    pHRange:          [5.5, 6.5],
    conductivityMsCm: [1, 3],
    typicalUses:      [STEP_CATEGORY.UF_DF, STEP_CATEGORY.FORMULATION],
    recommendedSteps: ['df-buffer-exchange', 'sterile-filtration-fill'],
    description:      'Common mAb formulation buffer; stable at pH near typical IgG isoelectric range, reduces aggregation.',
    references:       ['Wang 2015, Int J Pharm 490:64'],
  },
  {
    id:               'mes-25mm-ph60',
    name:             '25 mM MES pH 6.0',
    shortLabel:       'MES pH 6.0',
    components: [
      { name: 'MES (free acid)', concentrationMM: 25 },
      { name: 'Sodium hydroxide', concentrationMM: 0 },
    ],
    pHRange:          [5.5, 6.5],
    conductivityMsCm: [1, 3],
    typicalUses:      [STEP_CATEGORY.CAPTURE, STEP_CATEGORY.POLISH],
    recommendedSteps: ['cex-capture', 'cex-polish'],
    description:      'Low-conductivity buffer for cation exchange loading and elution; popular for mAb CEX polish.',
    references:       ['Good et al. 1966, Biochemistry 5:467'],
  },
  {
    id:               'bistris-25mm-ph65',
    name:             '25 mM Bis-Tris pH 6.5',
    shortLabel:       'Bis-Tris pH 6.5',
    components: [
      { name: 'Bis-Tris',        concentrationMM: 25 },
      { name: 'Hydrochloric acid', concentrationMM: 0 },
    ],
    pHRange:          [5.8, 7.2],
    conductivityMsCm: [1, 3],
    typicalUses:      [STEP_CATEGORY.POLISH, STEP_CATEGORY.UF_DF],
    recommendedSteps: ['aex-polish-flowthrough', 'cex-polish'],
    description:      'Intermediate-pH buffer bridging the Tris and MES ranges; useful when target pI sits between common buffer ranges.',
    references:       ['Good et al. 1966, Biochemistry 5:467'],
  },
  {
    id:               'ammonium-sulfate-12m',
    name:             '1.2 M Ammonium Sulfate (HIC Load Buffer)',
    shortLabel:       '(NH₄)₂SO₄ 1.2M',
    components: [
      { name: 'Ammonium sulfate', concentrationMM: 1200 },
      { name: 'Sodium phosphate', concentrationMM: 20 },
    ],
    pHRange:          [6.5, 7.5],
    conductivityMsCm: [150, 200],
    typicalUses:      [STEP_CATEGORY.POLISH],
    recommendedSteps: ['hic-polish'],
    description:      'High-salt load buffer for hydrophobic interaction chromatography; drives target binding to hydrophobic resin surface.',
    references:       ['Queiroz et al. 2001, J Biotechnol 87:143'],
  },
]

// Lookup helpers for StepDetailPanel buffer recommendations and Buffer Library.

export function getBufferById(id: string): BufferEntry | undefined {
  return BUFFER_CATALOG.find(b => b.id === id)
}

export function getBuffersForStep(stepId: string): BufferEntry[] {
  return BUFFER_CATALOG.filter(b => b.recommendedSteps.includes(stepId))
}

export function getBuffersByCategory(category: StepCategory): BufferEntry[] {
  return BUFFER_CATALOG.filter(b => b.typicalUses.includes(category))
}
