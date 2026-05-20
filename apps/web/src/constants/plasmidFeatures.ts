// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Shared plasmid feature definitions (ring colour, arc share, i18n label key).
// Single source of truth for the PlasmidMap arcs and the Vector library legend.

export type PlasmidFeatureKey = 'promoter' | 'gene' | 'selection' | 'terminator' | 'origin'

export interface PlasmidFeature {
  key:      PlasmidFeatureKey
  labelKey: string
  color:    string
  fraction: number   // share of the ring (0–1)
}

export const PLASMID_FEATURES: PlasmidFeature[] = [
  { key: 'promoter',   labelKey: 'library.vector.promoter',        color: 'var(--color-primary)',                                            fraction: 0.18 },
  { key: 'gene',       labelKey: 'library.vector.geneOfInterest',  color: 'var(--color-ok)',                                                 fraction: 0.42 },
  { key: 'selection',  labelKey: 'library.vector.selectionMarker', color: 'var(--color-amber)',                                              fraction: 0.18 },
  { key: 'terminator', labelKey: 'library.vector.terminator',      color: 'color-mix(in srgb, var(--color-primary) 60%, var(--color-text))', fraction: 0.10 },
  { key: 'origin',     labelKey: 'library.vector.origin',          color: 'color-mix(in srgb, var(--color-text) 50%, var(--color-bg))',      fraction: 0.12 },
]
