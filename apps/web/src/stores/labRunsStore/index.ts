// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Lab runs store — actual outcomes logged against campaigns; feeds prediction accuracy tracking.

import { defineStore } from 'pinia'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { STORAGE_KEY } from '@/constants/storageKeys'

import { LAB_RUN_STATUS, emptyOutcomes, type LabRun, type LabRunOutcomes, type LabRunStatus } from '@/types/labRun'

interface State {
  runs: LabRun[]
}

function loadState(): State {
  return loadFromStorage<State>(STORAGE_KEY.LAB_RUNS, { runs: [] }, raw => JSON.parse(raw) as State)
}

export const useLabRunsStore = defineStore('labRuns', {
  state: (): State => loadState(),

  getters: {
    sortedRuns(state): LabRun[] {
      return [...state.runs].sort((a, b) => b.modifiedAt - a.modifiedAt)
    },
    runsForCampaign(state) {
      return (campaignId: string): LabRun[] => state.runs.filter(r => r.campaignId === campaignId)
    },
    runById(state) {
      return (id: string): LabRun | undefined => state.runs.find(r => r.id === id)
    },
  },

  actions: {
    persist() {
      saveToStorage(STORAGE_KEY.LAB_RUNS, JSON.stringify(this.$state))
    },

    createRun(campaignId: string, name: string): LabRun {
      const now = Date.now()
      const run: LabRun = {
        id:         crypto.randomUUID(),
        campaignId,
        name,
        status:     LAB_RUN_STATUS.PLANNED,
        outcomes:   emptyOutcomes(),
        createdAt:  now,
        modifiedAt: now,
      }
      this.runs.push(run)
      this.persist()
      return run
    },

    updateOutcomes(id: string, outcomes: Partial<LabRunOutcomes>) {
      const run = this.runs.find(r => r.id === id)
      if (!run) return
      run.outcomes = { ...run.outcomes, ...outcomes }
      run.modifiedAt = Date.now()
      this.persist()
    },

    setStatus(id: string, status: LabRunStatus) {
      const run = this.runs.find(r => r.id === id)
      if (!run) return
      run.status = status
      run.modifiedAt = Date.now()
      this.persist()
    },

    rename(id: string, name: string) {
      const run = this.runs.find(r => r.id === id)
      if (!run) return
      run.name = name
      run.modifiedAt = Date.now()
      this.persist()
    },

    deleteRun(id: string) {
      this.runs = this.runs.filter(r => r.id !== id)
      this.persist()
    },
  },
})
