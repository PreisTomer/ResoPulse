// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Production campaign store — central state for the bioproduction platform's top-level work unit.

import { defineStore } from 'pinia'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { STORAGE_KEY } from '@/constants/storageKeys'
import { MOLECULE_TYPE, MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'

import {
  CAMPAIGN_STATUS, MODULE_ID, MODULE_STATUS,
  type Campaign, type CampaignNote, type CampaignProgressStep, type CampaignStatus, type ModuleId,
} from '@/types/campaign'

interface State {
  campaigns:        Campaign[]
  activeCampaignId: string | null
}

function emptyModuleState() {
  return { status: MODULE_STATUS.NOT_STARTED }
}

function newCampaign(input: { name: string; moleculeType: MoleculeType }): Campaign {
  const now = Date.now()
  return {
    id:                 crypto.randomUUID(),
    name:               input.name,
    moleculeType:       input.moleculeType,
    status:             CAMPAIGN_STATUS.DRAFT,
    modules: {
      [MODULE_ID.CELL_ENGINEERING]: emptyModuleState(),
      [MODULE_ID.CLONE_UPSTREAM]:   emptyModuleState(),
      [MODULE_ID.DOWNSTREAM]:       emptyModuleState(),
    },
    notes:              [],
    selectedCellLineId: null,
    startingTiterGperL: null,
    createdAt:          now,
    modifiedAt:         now,
  }
}

function loadCampaigns(): Campaign[] {
  return loadFromStorage<Campaign[]>(STORAGE_KEY.CAMPAIGNS, [], raw => JSON.parse(raw) as Campaign[])
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY.ACTIVE_CAMPAIGN_ID)
  } catch {
    return null
  }
}

function persistActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY.ACTIVE_CAMPAIGN_ID, id)
    else    localStorage.removeItem(STORAGE_KEY.ACTIVE_CAMPAIGN_ID)
  } catch {
    // localStorage unavailable; in-memory state still works for the session
  }
}

export const useProductionCampaignStore = defineStore('productionCampaign', {
  state: (): State => ({
    campaigns:        loadCampaigns(),
    activeCampaignId: loadActiveId(),
  }),

  getters: {
    activeCampaign(state): Campaign | null {
      if (!state.activeCampaignId) return null
      return state.campaigns.find(c => c.id === state.activeCampaignId) ?? null
    },

    sortedCampaigns(state): Campaign[] {
      return [...state.campaigns]
        .filter(c => c.status !== CAMPAIGN_STATUS.ARCHIVED)
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
    },

    archivedCampaigns(state): Campaign[] {
      return [...state.campaigns]
        .filter(c => c.status === CAMPAIGN_STATUS.ARCHIVED)
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
    },

    moduleProgress(): CampaignProgressStep[] {
      const c = this.activeCampaign
      if (!c) return []
      const order: ModuleId[] = [MODULE_ID.CELL_ENGINEERING, MODULE_ID.CLONE_UPSTREAM, MODULE_ID.DOWNSTREAM]
      return order.map((m, i) => ({
        module:  String(i + 1),
        done:    c.modules[m].status === MODULE_STATUS.COMPLETE,
        current: c.modules[m].status === MODULE_STATUS.IN_PROGRESS,
      }))
    },

    activeMoleculeShortLabel(): string {
      const c = this.activeCampaign
      if (!c) return ''
      return MOLECULE_TYPE_META[c.moleculeType].shortLabel
    },

    activeMoleculeCategory(): string {
      const c = this.activeCampaign
      if (!c) return 'other'
      return MOLECULE_TYPE_META[c.moleculeType].category
    },
  },

  actions: {
    persist() {
      saveToStorage(STORAGE_KEY.CAMPAIGNS, JSON.stringify(this.campaigns))
    },

    createCampaign(input: { name: string; moleculeType: MoleculeType; setActive?: boolean }): Campaign {
      const c = newCampaign({ name: input.name, moleculeType: input.moleculeType })
      this.campaigns.push(c)
      this.persist()
      if (input.setActive !== false) this.setActive(c.id)
      return c
    },

    setActive(id: string | null) {
      this.activeCampaignId = id
      persistActiveId(id)
    },

    updateName(id: string, name: string) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      c.name = name
      c.modifiedAt = Date.now()
      this.persist()
    },

    setCellLine(id: string, cellLineId: string | null) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      c.selectedCellLineId = cellLineId
      c.modifiedAt = Date.now()
      this.persist()
    },

    setStartingTiter(id: string, titerGperL: number | null) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      c.startingTiterGperL = titerGperL
      c.modifiedAt = Date.now()
      this.persist()
    },

    markModuleStarted(id: string, moduleId: ModuleId) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const m = c.modules[moduleId]
      if (m.status === MODULE_STATUS.NOT_STARTED) {
        m.status = MODULE_STATUS.IN_PROGRESS
        m.startedAt = Date.now()
      }
      if (c.status === CAMPAIGN_STATUS.DRAFT) c.status = CAMPAIGN_STATUS.IN_PROGRESS
      c.modifiedAt = Date.now()
      this.persist()
    },

    markModuleComplete(id: string, moduleId: ModuleId, prediction?: { yieldPct?: number; titerGperL?: number }) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const m = c.modules[moduleId]
      m.status = MODULE_STATUS.COMPLETE
      m.completedAt = Date.now()
      if (prediction?.yieldPct !== undefined)    m.predictedYieldPct    = prediction.yieldPct
      if (prediction?.titerGperL !== undefined)  m.predictedTiterGperL  = prediction.titerGperL
      // Campaign COMPLETE is set explicitly via finishCampaign, never implied by module work.
      if (c.status === CAMPAIGN_STATUS.DRAFT) c.status = CAMPAIGN_STATUS.IN_PROGRESS
      c.modifiedAt = Date.now()
      this.persist()
    },

    recordModuleActuals(id: string, moduleId: ModuleId, actuals: { titerGperL?: number; yieldPct?: number; viabilityPct?: number }) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const m = c.modules[moduleId]
      if (actuals.titerGperL !== undefined)   m.measuredTiterGperL   = actuals.titerGperL
      if (actuals.yieldPct !== undefined)      m.measuredYieldPct     = actuals.yieldPct
      if (actuals.viabilityPct !== undefined)  m.measuredViabilityPct = actuals.viabilityPct
      m.measuredAt = Date.now()
      c.modifiedAt = Date.now()
      this.persist()
    },

    setModulePrediction(id: string, moduleId: ModuleId, prediction: { titerGperL?: number; yieldPct?: number }) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const m = c.modules[moduleId]
      if (prediction.titerGperL !== undefined) m.predictedTiterGperL = prediction.titerGperL
      if (prediction.yieldPct !== undefined)   m.predictedYieldPct   = prediction.yieldPct
    },

    finishCampaign(id: string) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      c.status = CAMPAIGN_STATUS.COMPLETE
      c.finishedAt = Date.now()
      c.modifiedAt = Date.now()
      this.persist()
    },

    addNote(id: string, body: string, author?: string) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const note: CampaignNote = {
        id:        crypto.randomUUID(),
        timestamp: Date.now(),
        body,
        author,
      }
      c.notes.push(note)
      c.modifiedAt = Date.now()
      this.persist()
    },

    setStatus(id: string, status: CampaignStatus) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      c.status = status
      c.modifiedAt = Date.now()
      this.persist()
    },

    archive(id: string) {
      this.setStatus(id, CAMPAIGN_STATUS.ARCHIVED)
      if (this.activeCampaignId === id) this.setActive(null)
    },

    unarchive(id: string) {
      const c = this.campaigns.find(x => x.id === id)
      if (!c) return
      const anyComplete = Object.values(c.modules).every(m => m.status === MODULE_STATUS.COMPLETE)
      const anyStarted  = Object.values(c.modules).some(m => m.status !== MODULE_STATUS.NOT_STARTED)
      c.status = anyComplete ? CAMPAIGN_STATUS.COMPLETE
              : anyStarted  ? CAMPAIGN_STATUS.IN_PROGRESS
              :               CAMPAIGN_STATUS.DRAFT
      c.modifiedAt = Date.now()
      this.persist()
    },

    deleteCampaign(id: string) {
      this.campaigns = this.campaigns.filter(c => c.id !== id)
      if (this.activeCampaignId === id) this.setActive(null)
      this.persist()
    },
  },
})

// Re-export to make sure dependents can import seed data alongside the store.
export { MOLECULE_TYPE }
