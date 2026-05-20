// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Clone screening store — Module 2a/2b. Per-campaign candidate clones with early screening data.

import { defineStore } from 'pinia'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { STORAGE_KEY } from '@/constants/storageKeys'

import { rankClones } from '@/utils/clone/cloneScoring'

import { GENETIC_STABILITY, type CloneScreeningData, type CloneScore } from '@/types/clone'

interface State {
  byCampaign: Record<string, CloneScreeningData[]>
}

function loadState(): State {
  return loadFromStorage<State>(STORAGE_KEY.CLONES, { byCampaign: {} }, raw => JSON.parse(raw) as State)
}

// Seed clones illustrate the screening workflow: a clear winner, a high-titer-but-unstable trap,
// and a steady-but-modest option.
function seedClones(): CloneScreeningData[] {
  return [
    { id: crypto.randomUUID(), label: 'Clone A1', titerDay3GL: 0.4, titerDay7GL: 1.6, titerDay14GL: 4.8, peakVcdE6: 18, viabilityPct: 92, geneticStability: GENETIC_STABILITY.STABLE,   aggregatePct: 2.5 },
    { id: crypto.randomUUID(), label: 'Clone B7', titerDay3GL: 0.6, titerDay7GL: 2.4, titerDay14GL: 6.2, peakVcdE6: 16, viabilityPct: 78, geneticStability: GENETIC_STABILITY.UNSTABLE, aggregatePct: 7.5 },
    { id: crypto.randomUUID(), label: 'Clone C3', titerDay3GL: 0.3, titerDay7GL: 1.1, titerDay14GL: 3.1, peakVcdE6: 14, viabilityPct: 95, geneticStability: GENETIC_STABILITY.STABLE,   aggregatePct: 1.8 },
    { id: crypto.randomUUID(), label: 'Clone D9', titerDay3GL: 0.5, titerDay7GL: 1.8, titerDay14GL: 4.2, peakVcdE6: 20, viabilityPct: 88, geneticStability: GENETIC_STABILITY.MODERATE, aggregatePct: 4.0 },
  ]
}

export const useCloneScreeningStore = defineStore('cloneScreening', {
  state: (): State => loadState(),

  getters: {
    clonesFor(state) {
      return (campaignId: string): CloneScreeningData[] => state.byCampaign[campaignId] ?? []
    },
  },

  actions: {
    persist() {
      saveToStorage(STORAGE_KEY.CLONES, JSON.stringify(this.$state))
    },

    ensure(campaignId: string): CloneScreeningData[] {
      if (!this.byCampaign[campaignId]) this.byCampaign[campaignId] = []
      return this.byCampaign[campaignId]!
    },

    seed(campaignId: string) {
      this.byCampaign[campaignId] = seedClones()
      this.persist()
    },

    addClone(campaignId: string) {
      const list = this.ensure(campaignId)
      const n = list.length + 1
      list.push({
        id: crypto.randomUUID(),
        label: `Clone ${n}`,
        titerDay3GL: 0.3, titerDay7GL: 1.0, titerDay14GL: 2.5,
        peakVcdE6: 15, viabilityPct: 85,
        geneticStability: GENETIC_STABILITY.MODERATE, aggregatePct: 3.0,
      })
      this.persist()
    },

    updateClone(campaignId: string, cloneId: string, patch: Partial<CloneScreeningData>) {
      const clone = this.ensure(campaignId).find(c => c.id === cloneId)
      if (!clone) return
      Object.assign(clone, patch)
      this.persist()
    },

    removeClone(campaignId: string, cloneId: string) {
      this.byCampaign[campaignId] = this.ensure(campaignId).filter(c => c.id !== cloneId)
      this.persist()
    },

    rankedFor(campaignId: string): CloneScore[] {
      return rankClones(this.clonesFor(campaignId))
    },
  },
})
