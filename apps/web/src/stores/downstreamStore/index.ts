// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Downstream store — Module 3 process train state, keyed per campaign.

import { defineStore } from 'pinia'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { STORAGE_KEY } from '@/constants/storageKeys'
import { getStepById } from '@/constants/processStepCatalog'

import { predictDownstream } from '@/utils/downstream/yieldPrediction'

import type { ProcessStepInstance, DownstreamPrediction } from '@/types/downstream'

interface CampaignDownstream {
  steps:           ProcessStepInstance[]
  startingTiterGL: number
  volumeL:         number
}

interface State {
  // Keyed by campaign id so each campaign keeps its own downstream train.
  byCampaign: Record<string, CampaignDownstream>
}

function emptyTrain(): CampaignDownstream {
  return { steps: [], startingTiterGL: 5, volumeL: 10 }
}

function loadState(): State {
  return loadFromStorage<State>(STORAGE_KEY.DOWNSTREAM, { byCampaign: {} }, raw => JSON.parse(raw) as State)
}

export const useDownstreamStore = defineStore('downstream', {
  state: (): State => loadState(),

  getters: {
    trainFor(state) {
      return (campaignId: string): CampaignDownstream => state.byCampaign[campaignId] ?? emptyTrain()
    },
  },

  actions: {
    persist() {
      saveToStorage(STORAGE_KEY.DOWNSTREAM, JSON.stringify(this.$state))
    },

    ensure(campaignId: string): CampaignDownstream {
      if (!this.byCampaign[campaignId]) {
        this.byCampaign[campaignId] = emptyTrain()
      }
      return this.byCampaign[campaignId]!
    },

    setStartingTiter(campaignId: string, titerGL: number) {
      this.ensure(campaignId).startingTiterGL = titerGL
      this.persist()
    },

    setVolume(campaignId: string, volumeL: number) {
      this.ensure(campaignId).volumeL = volumeL
      this.persist()
    },

    addStep(campaignId: string, stepType: string) {
      const entry = getStepById(stepType)
      if (!entry) return
      const paramValues: Record<string, number> = {}
      for (const p of entry.parameters) paramValues[p.key] = p.defaultValue
      this.ensure(campaignId).steps.push({
        id: crypto.randomUUID(),
        stepType,
        paramValues,
      })
      this.persist()
    },

    removeStep(campaignId: string, instanceId: string) {
      const train = this.ensure(campaignId)
      train.steps = train.steps.filter(s => s.id !== instanceId)
      this.persist()
    },

    moveStep(campaignId: string, fromIndex: number, toIndex: number) {
      const train = this.ensure(campaignId)
      if (fromIndex < 0 || fromIndex >= train.steps.length) return
      if (toIndex < 0 || toIndex >= train.steps.length) return
      const [moved] = train.steps.splice(fromIndex, 1)
      if (moved) train.steps.splice(toIndex, 0, moved)
      this.persist()
    },

    duplicateStep(campaignId: string, instanceId: string) {
      const train = this.ensure(campaignId)
      const idx = train.steps.findIndex(s => s.id === instanceId)
      if (idx < 0) return
      const source = train.steps[idx]!
      train.steps.splice(idx + 1, 0, {
        id: crypto.randomUUID(),
        stepType: source.stepType,
        paramValues: { ...source.paramValues },
      })
      this.persist()
    },

    setParam(campaignId: string, instanceId: string, key: string, value: number) {
      const train = this.ensure(campaignId)
      const step = train.steps.find(s => s.id === instanceId)
      if (!step) return
      step.paramValues[key] = value
      this.persist()
    },

    loadDefaultTrain(campaignId: string, stepTypes: string[]) {
      const train = this.ensure(campaignId)
      train.steps = stepTypes.map(stepType => {
        const entry = getStepById(stepType)
        const paramValues: Record<string, number> = {}
        if (entry) for (const p of entry.parameters) paramValues[p.key] = p.defaultValue
        return { id: crypto.randomUUID(), stepType, paramValues }
      })
      this.persist()
    },

    prediction(campaignId: string): DownstreamPrediction {
      const train = this.trainFor(campaignId)
      const startingMassG = train.startingTiterGL * train.volumeL
      return predictDownstream(train.steps, startingMassG)
    },
  },
})
