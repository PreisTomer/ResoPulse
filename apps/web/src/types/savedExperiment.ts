// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Types for saved experiment sessions (cloud persistence layer).

// ── Snapshot ──────────────────────────────────────────────────────────────────
// The shape stored in the ExperimentSession.snapshot JSONB column.
// The backend is agnostic to this structure — the frontend owns serialization.

export interface ExperimentSnapshot {
  schemaVersion: 1
  capturedAt:    string  // ISO timestamp
  // Opaque cell store state serialised by the frontend
  cellState:     Record<string, unknown>
  // Opaque experiment store state (log entries, notes, etc.)
  experimentState: Record<string, unknown>
}

// ── List item (no snapshot) ───────────────────────────────────────────────────

export interface SavedExperimentItem {
  id:          string
  title:       string
  description: string | null
  version:     number
  createdBy:   string
  parentId:    string | null
  shareMode:   'view' | 'edit' | null
  createdAt:   string
  updatedAt:   string
}

// ── Full detail (includes snapshot) ──────────────────────────────────────────

export interface SavedExperimentDetail extends SavedExperimentItem {
  snapshot:   ExperimentSnapshot
  orgId:      string
  shareToken: string | null
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface ExperimentListResponse {
  experiments: SavedExperimentItem[]
  total:       number
  page:        number
  limit:       number
}

export interface ShareInfo {
  shareToken: string
  shareMode:  'view' | 'edit'
}
