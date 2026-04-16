// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { BACKEND_URL, apiFetch } from '@/services/apiClient'

import type {
  SavedExperimentItem,
  SavedExperimentDetail,
  ExperimentListResponse,
  ExperimentSnapshot,
  ShareInfo,
} from '@/types/savedExperiment'

// ── State ──────────────────────────────────────────────────────────────────────

interface SavedExperimentsState {
  experiments:  SavedExperimentItem[]
  total:        number
  page:         number
  limit:        number
  isLoading:    boolean
  error:        string | null
  activeId:     string | null  // ID of the experiment currently loaded in the lab
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSavedExperimentsStore = defineStore('savedExperiments', {
  state: (): SavedExperimentsState => ({
    experiments: [],
    total:       0,
    page:        1,
    limit:       20,
    isLoading:   false,
    error:       null,
    activeId:    null,
  }),

  getters: {
    // The experiment record currently loaded in the lab (if any).
    activeExperiment(): SavedExperimentItem | null {
      return this.experiments.find(e => e.id === this.activeId) ?? null
    },

    hasMore(): boolean {
      return this.experiments.length < this.total
    },
  },

  actions: {
    async fetchList(search = '', sortBy = 'updatedAt', sortDir: 'asc' | 'desc' = 'desc'): Promise<void> {
      this.isLoading = true
      this.error     = null
      try {
        const params = new URLSearchParams({ page: '1', limit: String(this.limit), search, sortBy, sortDir })
        const result = await apiFetch<ExperimentListResponse>(`/experiments?${params}`)
        this.experiments = result.experiments
        this.total       = result.total
        this.page        = 1
      } catch (err) {
        this.error = (err as Error).message
        console.error('[SavedExperimentsStore] fetchList failed:', err)
      } finally {
        this.isLoading = false
      }
    },

    async fetchNextPage(search = '', sortBy = 'updatedAt', sortDir: 'asc' | 'desc' = 'desc'): Promise<void> {
      if (!this.hasMore || this.isLoading) return
      this.isLoading = true
      this.error     = null
      try {
        const nextPage = this.page + 1
        const params   = new URLSearchParams({ page: String(nextPage), limit: String(this.limit), search, sortBy, sortDir })
        const result   = await apiFetch<ExperimentListResponse>(`/experiments?${params}`)
        this.experiments.push(...result.experiments)
        this.total = result.total
        this.page  = nextPage
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.isLoading = false
      }
    },

    async getDetail(id: string): Promise<SavedExperimentDetail | null> {
      try {
        return await apiFetch<SavedExperimentDetail>(`/experiments/${id}`)
      } catch (err) {
        console.error('[SavedExperimentsStore] getDetail failed:', err)
        return null
      }
    },

    // Share-token fetch is unauthenticated — uses raw fetch, not apiFetch.
    async getByShareToken(shareToken: string): Promise<SavedExperimentDetail | null> {
      try {
        const res = await fetch(`${BACKEND_URL}/experiments/share/${shareToken}`)
        if (!res.ok) return null
        return await res.json() as SavedExperimentDetail
      } catch {
        return null
      }
    },

    // Costs SAVE_EXPERIMENT tokens — backend returns 402 if balance is insufficient.
    async createExperiment(
      title:       string,
      description: string | null,
      snapshot:    ExperimentSnapshot,
    ): Promise<SavedExperimentItem | null> {
      this.error = null
      try {
        const result = await apiFetch<{ experiment: SavedExperimentItem }>('/experiments', {
          method: 'POST',
          body:   JSON.stringify({ title, description, snapshot }),
        })
        this.experiments.unshift(result.experiment)
        this.total += 1
        return result.experiment
      } catch (err) {
        this.error = (err as Error).message
        console.error('[SavedExperimentsStore] createExperiment failed:', err)
        return null
      }
    },

    async updateExperiment(
      id:      string,
      updates: { title?: string; description?: string | null; snapshot?: ExperimentSnapshot },
    ): Promise<boolean> {
      this.error = null
      try {
        const updated = await apiFetch<SavedExperimentItem>(`/experiments/${id}`, {
          method: 'PUT',
          body:   JSON.stringify(updates),
        })
        const idx = this.experiments.findIndex(e => e.id === id)
        if (idx !== -1) this.experiments[idx] = updated
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      }
    },

    async saveNewVersion(
      parentId: string,
      title:    string,
      snapshot: ExperimentSnapshot,
    ): Promise<SavedExperimentItem | null> {
      this.error = null
      try {
        const result = await apiFetch<{ experiment: SavedExperimentItem }>(`/experiments/${parentId}/versions`, {
          method: 'POST',
          body:   JSON.stringify({ title, snapshot }),
        })
        this.experiments.unshift(result.experiment)
        this.total += 1
        return result.experiment
      } catch (err) {
        this.error = (err as Error).message
        return null
      }
    },

    async forkExperiment(sourceId: string, newTitle: string): Promise<SavedExperimentItem | null> {
      this.error = null
      try {
        const forked = await apiFetch<SavedExperimentItem>(`/experiments/${sourceId}/fork`, {
          method: 'POST',
          body:   JSON.stringify({ title: newTitle }),
        })
        this.experiments.unshift(forked)
        this.total += 1
        return forked
      } catch (err) {
        this.error = (err as Error).message
        return null
      }
    },

    // enableSharing rotates the token on repeat calls.
    async enableSharing(id: string, shareMode: 'view' | 'edit'): Promise<ShareInfo | null> {
      this.error = null
      try {
        const result = await apiFetch<ShareInfo>(`/experiments/${id}/share`, {
          method: 'POST',
          body:   JSON.stringify({ shareMode }),
        })
        const item = this.experiments.find(e => e.id === id)
        if (item) item.shareMode = result.shareMode
        return result
      } catch (err) {
        this.error = (err as Error).message
        return null
      }
    },

    async disableSharing(id: string): Promise<boolean> {
      this.error = null
      try {
        await apiFetch<{ ok: boolean }>(`/experiments/${id}/share`, { method: 'DELETE' })
        const item = this.experiments.find(e => e.id === id)
        if (item) item.shareMode = null
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      }
    },

    // Soft-delete: backend flags the record; it is not permanently removed from the DB.
    async deleteExperiment(id: string): Promise<boolean> {
      this.error = null
      try {
        await apiFetch<{ ok: boolean }>(`/experiments/${id}`, { method: 'DELETE' })
        this.experiments = this.experiments.filter(e => e.id !== id)
        this.total       = Math.max(0, this.total - 1)
        if (this.activeId === id) this.activeId = null
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      }
    },

    setActiveId(id: string | null): void { this.activeId = id },
    clearError():                   void { this.error    = null },

    reset(): void {
      this.experiments = []
      this.total       = 0
      this.page        = 1
      this.isLoading   = false
      this.error       = null
      this.activeId    = null
    },
  },
})
