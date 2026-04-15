// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Saved experiment sessions store.
// Manages the list of cloud-persisted experiments for the current org.
// All mutations call the backend REST API and require an active Clerk session.

import { defineStore } from 'pinia'

import type {
  SavedExperimentItem,
  SavedExperimentDetail,
  ExperimentListResponse,
  ExperimentSnapshot,
  ShareInfo,
} from '@/types/savedExperiment'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string ?? 'http://localhost:3001').replace(/\/$/, '')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await window.Clerk?.session?.getToken()
  if (!token) throw new Error('Not authenticated.')
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

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
    /** The experiment record that is currently loaded in the lab (if any). */
    activeExperiment(): SavedExperimentItem | null {
      return this.experiments.find(e => e.id === this.activeId) ?? null
    },

    hasMore(): boolean {
      return this.experiments.length < this.total
    },
  },

  actions: {
    // ── List ─────────────────────────────────────────────────────────────────

    /**
     * Fetches the first page of experiments for the current org.
     * Replaces the current list.
     */
    async fetchList(search = '', sortBy = 'updatedAt', sortDir: 'asc' | 'desc' = 'desc'): Promise<void> {
      this.isLoading = true
      this.error     = null
      try {
        const params = new URLSearchParams({
          page:    '1',
          limit:   String(this.limit),
          search,
          sortBy,
          sortDir,
        })
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

    /**
     * Loads the next page and appends to the list.
     */
    async fetchNextPage(search = '', sortBy = 'updatedAt', sortDir: 'asc' | 'desc' = 'desc'): Promise<void> {
      if (!this.hasMore || this.isLoading) return
      this.isLoading = true
      this.error     = null
      try {
        const nextPage = this.page + 1
        const params   = new URLSearchParams({
          page:    String(nextPage),
          limit:   String(this.limit),
          search,
          sortBy,
          sortDir,
        })
        const result = await apiFetch<ExperimentListResponse>(`/experiments?${params}`)
        this.experiments.push(...result.experiments)
        this.total = result.total
        this.page  = nextPage
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.isLoading = false
      }
    },

    // ── Get / load ────────────────────────────────────────────────────────────

    /**
     * Fetches the full detail (including snapshot) for one experiment.
     */
    async getDetail(id: string): Promise<SavedExperimentDetail | null> {
      try {
        return await apiFetch<SavedExperimentDetail>(`/experiments/${id}`)
      } catch (err) {
        console.error('[SavedExperimentsStore] getDetail failed:', err)
        return null
      }
    },

    /**
     * Fetches a publicly shared experiment by its share token (no auth required).
     */
    async getByShareToken(shareToken: string): Promise<SavedExperimentDetail | null> {
      try {
        const res = await fetch(`${BACKEND_URL}/experiments/share/${shareToken}`)
        if (!res.ok) return null
        return await res.json() as SavedExperimentDetail
      } catch {
        return null
      }
    },

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Saves a new experiment to the cloud. Returns the created record.
     * Costs SAVE_EXPERIMENT tokens — the backend returns 402 if balance is insufficient.
     */
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

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * Updates the title, description, and/or snapshot of an experiment in place.
     */
    async updateExperiment(
      id:       string,
      updates:  { title?: string; description?: string | null; snapshot?: ExperimentSnapshot },
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

    // ── Version ───────────────────────────────────────────────────────────────

    /**
     * Saves the current snapshot as a new version of an existing experiment.
     */
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

    // ── Fork / duplicate ──────────────────────────────────────────────────────

    /**
     * Creates an independent fork (copy) of an experiment.
     */
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

    // ── Sharing ───────────────────────────────────────────────────────────────

    /**
     * Enables (or rotates) sharing for an experiment.
     * Returns the share token string, or null on failure.
     */
    async enableSharing(id: string, shareMode: 'view' | 'edit'): Promise<ShareInfo | null> {
      this.error = null
      try {
        const result = await apiFetch<ShareInfo>(`/experiments/${id}/share`, {
          method: 'POST',
          body:   JSON.stringify({ shareMode }),
        })
        const idx = this.experiments.findIndex(e => e.id === id)
        const item = idx !== -1 ? this.experiments[idx] : undefined
        if (item) item.shareMode = result.shareMode
        return result
      } catch (err) {
        this.error = (err as Error).message
        return null
      }
    },

    /**
     * Revokes the share link for an experiment.
     */
    async disableSharing(id: string): Promise<boolean> {
      this.error = null
      try {
        await apiFetch<{ ok: boolean }>(`/experiments/${id}/share`, { method: 'DELETE' })
        const idx = this.experiments.findIndex(e => e.id === id)
        const item = idx !== -1 ? this.experiments[idx] : undefined
        if (item) item.shareMode = null
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      }
    },

    // ── Delete ────────────────────────────────────────────────────────────────

    /**
     * Soft-deletes an experiment and removes it from the local list.
     */
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

    // ── Active experiment ─────────────────────────────────────────────────────

    setActiveId(id: string | null): void {
      this.activeId = id
    },

    clearError(): void {
      this.error = null
    },

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
