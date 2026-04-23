// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { prisma } from '../../prisma'

export interface TrainerOutcomeBlock {
  rmse: number
  mae:  number
}

export interface RetrainUpstreamResponse {
  status?:            string
  samplesUsed?:       number
  modelReady?:        boolean
  modelVersion?:      string  | null
  promoted?:          boolean
  holdoutSamples?:    number
  holdoutMaeOverall?: number  | null
  previousBestMae?:   number  | null
  targetDr?:          TrainerOutcomeBlock | null
  healthyDr?:         TrainerOutcomeBlock | null
  rating?:            TrainerOutcomeBlock | null
}

export async function persistTrainerMetrics(body: RetrainUpstreamResponse): Promise<void> {
  const version = body.modelVersion
  if (!version || !body.targetDr || !body.healthyDr || !body.rating) return
  try {
    await prisma.trainerMetrics.create({
      data: {
        modelVersion:      version,
        nSamples:          body.samplesUsed       ?? 0,
        holdoutSamples:    body.holdoutSamples    ?? 0,
        rmseTargetDr:      body.targetDr.rmse,
        maeTargetDr:       body.targetDr.mae,
        rmseHealthyDr:     body.healthyDr.rmse,
        maeHealthyDr:      body.healthyDr.mae,
        rmseRating:        body.rating.rmse,
        maeRating:         body.rating.mae,
        holdoutMaeOverall: body.holdoutMaeOverall ?? 0,
        previousBestMae:   body.previousBestMae   ?? null,
        promoted:          body.promoted          ?? false,
      },
    })
  } catch (err) {
    console.error('[TrainerMetrics] Failed to persist:', err)
  }
}

export async function listRecentTrainerMetrics(limit = 20): Promise<Array<{
  modelVersion:      string
  trainedAt:         Date
  nSamples:          number
  holdoutMaeOverall: number
  maeTargetDr:       number
  maeHealthyDr:      number
  maeRating:         number
  promoted:          boolean
}>> {
  return prisma.trainerMetrics.findMany({
    orderBy: { trainedAt: 'desc' },
    take:    limit,
    select:  {
      modelVersion:      true,
      trainedAt:         true,
      nSamples:          true,
      holdoutMaeOverall: true,
      maeTargetDr:       true,
      maeHealthyDr:      true,
      maeRating:         true,
      promoted:          true,
    },
  })
}
