// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// SQLite persistence layer for AI training data.
// DATA_DIR env var (Render Disk mount) or ./data/ fallback. Outcomes are ephemeral on Render free tier.

import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'
import type { OutcomeEntry } from './types/socket'

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data')

let db: Database.Database | null = null
let insertStmt: Database.Statement | null = null

function openDatabase(): Database.Database {
  mkdirSync(DATA_DIR, { recursive: true })
  const instance = new Database(join(DATA_DIR, 'outcomes.db'))
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  return instance
}

function initSchema(instance: Database.Database): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS outcomes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      session_name    TEXT,
      timestamp       TEXT,
      freq_khz        INTEGER NOT NULL,
      field_vcm       INTEGER NOT NULL,
      medium          TEXT    NOT NULL,
      target_preset   TEXT    NOT NULL,
      waveform        TEXT    NOT NULL,
      duty_cycle      REAL    NOT NULL,
      pulse_width_ns  INTEGER NOT NULL,
      orientation_deg INTEGER NOT NULL,
      lysis_n_pulses  INTEGER NOT NULL,
      target_ratio    REAL    NOT NULL,
      healthy_ratio   REAL    NOT NULL,
      selectivity     REAL    NOT NULL,
      target_temp     REAL    NOT NULL,
      healthy_temp    REAL    NOT NULL,
      rating          INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      ai_suggested    INTEGER NOT NULL DEFAULT 0,
      target_tau_ns    REAL   NOT NULL DEFAULT 0,
      healthy_tau_ns   REAL   NOT NULL DEFAULT 0,
      target_fc_khz    REAL   NOT NULL DEFAULT 0,
      healthy_fc_khz   REAL   NOT NULL DEFAULT 0,
      target_radius_um REAL   NOT NULL DEFAULT 0,
      sigma_e          REAL   NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_outcomes_preset    ON outcomes(target_preset);
    CREATE INDEX IF NOT EXISTS idx_outcomes_rating    ON outcomes(rating);
    CREATE INDEX IF NOT EXISTS idx_outcomes_target_tau ON outcomes(target_tau_ns);
  `)
}

function getDb(): Database.Database | null {
  if (db) return db
  try {
    db = openDatabase()
    initSchema(db)
    console.info(`[DB] SQLite ready at ${DATA_DIR}/outcomes.db`)
    return db
  } catch (err) {
    console.warn('[DB] Could not open SQLite database, outcome persistence disabled:', err)
    return null
  }
}

function getInsertStatement(instance: Database.Database): Database.Statement {
  if (insertStmt) return insertStmt
  insertStmt = instance.prepare(`
    INSERT INTO outcomes (
      session_name, timestamp, freq_khz, field_vcm, medium, target_preset,
      waveform, duty_cycle, pulse_width_ns, orientation_deg, lysis_n_pulses,
      target_ratio, healthy_ratio, selectivity, target_temp, healthy_temp,
      rating, ai_suggested,
      target_tau_ns, healthy_tau_ns, target_fc_khz, healthy_fc_khz,
      target_radius_um, sigma_e
    ) VALUES (
      @sessionName, @timestamp, @freqKHz, @fieldVcm, @medium, @targetPreset,
      @waveform, @dutyCycle, @pulseWidthNs, @orientationDeg, @lysisNPulses,
      @targetRatio, @healthyRatio, @selectivity, @targetTemp, @healthyTemp,
      @rating, @aiSuggested,
      @targetTauNs, @healthyTauNs, @targetFcKhz, @healthyFcKhz,
      @targetRadiusUm, @sigmaE
    )
  `)
  return insertStmt
}

export function insertOutcome(entry: OutcomeEntry): void {
  const instance = getDb()
  if (!instance) return
  try {
    getInsertStatement(instance).run({
      sessionName:    entry.sessionName,
      timestamp:      entry.timestamp,
      freqKHz:        entry.freqKHz,
      fieldVcm:       entry.fieldVcm,
      medium:         entry.medium,
      targetPreset:   entry.targetPreset,
      waveform:       entry.waveform,
      dutyCycle:      entry.dutyCycle,
      pulseWidthNs:   entry.pulseWidthNs,
      orientationDeg: entry.orientationDeg,
      lysisNPulses:   entry.lysisNPulses,
      targetRatio:    entry.targetRatio,
      healthyRatio:   entry.healthyRatio,
      selectivity:    entry.selectivity,
      targetTemp:     entry.targetTemp,
      healthyTemp:    entry.healthyTemp,
      rating:         entry.rating,
      aiSuggested:    entry.aiSuggestionApplied ? 1 : 0,
      targetTauNs:    entry.targetTauNs,
      healthyTauNs:   entry.healthyTauNs,
      targetFcKhz:    entry.targetFcKhz,
      healthyFcKhz:   entry.healthyFcKhz,
      targetRadiusUm: entry.targetRadiusUm,
      sigmaE:         entry.sigmaE,
    })
  } catch (err) {
    console.error('[DB] Failed to insert outcome:', err)
  }
}

export function fetchTrainingRows(): Record<string, unknown>[] {
  const instance = getDb()
  if (!instance) return []
  try {
    return instance.prepare(`
      SELECT
        freq_khz, field_vcm, duty_cycle, pulse_width_ns,
        target_tau_ns, healthy_tau_ns, target_fc_khz, healthy_fc_khz,
        target_radius_um, sigma_e, orientation_deg,
        target_ratio, healthy_ratio, rating
      FROM outcomes
      WHERE target_tau_ns > 0
    `).all() as Record<string, unknown>[]
  } catch {
    return []
  }
}

export function countOutcomes(): number {
  const instance = getDb()
  if (!instance) return -1
  try {
    const row = instance.prepare('SELECT COUNT(*) AS n FROM outcomes').get() as { n: number }
    return row.n
  } catch {
    return -1
  }
}
