// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Postgres persistence layer for AI training data via Prisma.
// Outcomes are stored in the `outcomes` table on Neon — survives redeploys.

import { prisma } from './prisma'
import type { OutcomeEntry, MeasuredOutcomeEntry } from './types/socket'

export async function insertOutcome(entry: OutcomeEntry, orgId: string | null): Promise<void> {
  try {
    await prisma.outcome.create({
      data: {
        orgId,
        sessionName:    entry.sessionName,
        timestamp:      entry.timestamp,
        freqKhz:        entry.freqKHz,
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
        aiSuggested:    entry.aiSuggestionApplied,
        targetTauNs:    entry.targetTauNs,
        healthyTauNs:   entry.healthyTauNs,
        targetFcKhz:    entry.targetFcKhz,
        healthyFcKhz:   entry.healthyFcKhz,
        targetRadiusUm: entry.targetRadiusUm,
        sigmaE:         entry.sigmaE,
      },
    })
  } catch (err) {
    console.error('[DB] Failed to insert outcome:', err)
  }
}

export interface TrainingRow {
  freq_khz:        number
  field_vcm:       number
  duty_cycle:      number
  pulse_width_ns:  number
  target_tau_ns:   number
  healthy_tau_ns:  number
  target_fc_khz:   number
  healthy_fc_khz:  number
  target_radius_um: number
  sigma_e:         number
  orientation_deg: number
  target_ratio:    number
  healthy_ratio:   number
  rating:          number
  // Optional bench measurements (Stage C.2). Present for outcomes the scientist
  // has logged measured results against. Consumed by the Python trainer to
  // weight real data above simulator predictions.
  measured_target_lysis_pct?:   number
  measured_healthy_lysis_pct?:  number
  measured_viability_pct?:      number
  measured_field_vcm?:          number
}

export async function fetchTrainingRows(): Promise<TrainingRow[]> {
  try {
    const rows = await prisma.outcome.findMany({
      where:  { targetTauNs: { gt: 0 } },
      select: {
        freqKhz:                 true,
        fieldVcm:                true,
        dutyCycle:               true,
        pulseWidthNs:            true,
        targetTauNs:             true,
        healthyTauNs:            true,
        targetFcKhz:             true,
        healthyFcKhz:            true,
        targetRadiusUm:          true,
        sigmaE:                  true,
        orientationDeg:          true,
        targetRatio:             true,
        healthyRatio:            true,
        rating:                  true,
        measuredTargetLysisPct:  true,
        measuredHealthyLysisPct: true,
        measuredViabilityPct:    true,
        measuredFieldVcm:        true,
      },
    })
    // Map camelCase Prisma fields to snake_case expected by the AI microservice.
    return rows.map(r => ({
      freq_khz:                   r.freqKhz,
      field_vcm:                  r.fieldVcm,
      duty_cycle:                 r.dutyCycle,
      pulse_width_ns:             r.pulseWidthNs,
      target_tau_ns:              r.targetTauNs,
      healthy_tau_ns:             r.healthyTauNs,
      target_fc_khz:              r.targetFcKhz,
      healthy_fc_khz:             r.healthyFcKhz,
      target_radius_um:           r.targetRadiusUm,
      sigma_e:                    r.sigmaE,
      orientation_deg:            r.orientationDeg,
      target_ratio:               r.targetRatio,
      healthy_ratio:              r.healthyRatio,
      rating:                     r.rating,
      measured_target_lysis_pct:  r.measuredTargetLysisPct  ?? undefined,
      measured_healthy_lysis_pct: r.measuredHealthyLysisPct ?? undefined,
      measured_viability_pct:     r.measuredViabilityPct    ?? undefined,
      measured_field_vcm:         r.measuredFieldVcm        ?? undefined,
    }))
  } catch (err) {
    console.error('[DB] Failed to fetch training rows:', err)
    return []
  }
}

export async function countOutcomes(): Promise<number> {
  try {
    return await prisma.outcome.count()
  } catch {
    return -1
  }
}

// Attaches measured-outcome fields to the most-recent matching outcome row.
// Matched on (sessionName, timestamp) — these together uniquely identify a
// given reading within a session. Returns the number of rows updated.
export async function attachMeasuredOutcome(entry: MeasuredOutcomeEntry): Promise<number> {
  const { sessionName, timestamp, measured } = entry
  try {
    const result = await prisma.outcome.updateMany({
      where: { sessionName, timestamp },
      data:  {
        measuredAt:               measured.measuredAt,
        measuredTargetLysisPct:   measured.targetLysisPct,
        measuredHealthyLysisPct:  measured.healthyLysisPct,
        measuredViabilityPct:     measured.viabilityPct,
        measuredPermeabilizedPct: measured.permeabilizedPct,
        measuredTransfectionPct:  measured.transfectionPct,
        measuredViabilityAssay:   measured.viabilityAssay,
        measuredAssayTimepointH:  measured.assayTimepointH,
        measuredTempC:            measured.tempC,
        measuredFieldVcm:         measured.actualFieldVcm,
        measuredLysisDelayMs:     measured.observedLysisDelayMs,
        measuredQpcrFoldChange:   measured.qpcrFoldChange,
        measuredQpcrTarget:       measured.qpcrTarget,
        measuredNotes:            measured.notes,
      },
    })
    return result.count
  } catch (err) {
    console.error('[DB] Failed to attach measured outcome:', err)
    return 0
  }
}
