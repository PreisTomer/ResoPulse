// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { setupSocketServer, SOCKET_EVENTS } from './socket'
import { countOutcomes, fetchTrainingRows } from './db'
import { clerk, requireAuth } from './middleware/clerkAuth'
import { persistTrainerMetrics, type RetrainUpstreamResponse } from './services/trainerMetricsService'
import webhookRouter         from './routes/webhooks'
import experimentsRouter     from './routes/experiments'
import tokensRouter          from './routes/tokens'
import cellPresetsRouter     from './routes/cellPresets'
import cellCalibrationRouter from './routes/cellCalibration'

const AI_SERVICE_URL      = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const AI_PROXY_TIMEOUT_MS = 10_000

const app        = express()
const PORT       = process.env.PORT ?? 3001
const httpServer = http.createServer(app)
const io         = setupSocketServer(httpServer)

// In production set FRONTEND_URL to your production domain; unset allows all origins.
// Both www and non-www variants are always included to avoid redirect-vs-CORS mismatches.
function buildAllowedOrigins(): string[] | true {
  const base = process.env.FRONTEND_URL
  if (!base) return true
  const stripped = base.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return [
    `https://www.${stripped}`,
    `https://${stripped}`,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]
}
const ALLOWED_ORIGINS = buildAllowedOrigins()

app.use(cors({ origin: ALLOWED_ORIGINS }))

// ── Webhook route must receive raw body for svix signature verification ──────
// Must be registered BEFORE express.json() so the buffer is not consumed first.
app.use('/webhooks/clerk', express.raw({ type: 'application/json' }), webhookRouter)

app.use(express.json({ limit: '16kb' }))

// ── Public routes (registered before Clerk middleware — no auth required) ──────
app.get('/health', async (_req, res) => {
  const outcomeCount = await countOutcomes()
  res.json({
    status:       'ok',
    service:      'resopulse-api',
    dbOutcomes:   outcomeCount,
    dbPersistent: outcomeCount >= 0,
  })
})

app.get('/ai/health', async (_req, res) => {
  try {
    const r    = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS) })
    const body = await r.json() as Record<string, unknown>
    res.json({ ...body, aiServiceReachable: true })
  } catch (err) {
    console.warn('[AI] health probe failed:', err)
    res.json({ status: 'unavailable', aiServiceReachable: false, modelReady: false, trainingSamples: 0 })
  }
})

// ── Clerk session middleware — populates req.auth on all routes below ─────────
app.use(clerk)

// ── AI training data (protected: requires auth + optional secret) ─────────────
app.get('/ai/training-data', requireAuth, async (req, res) => {
  const secret = process.env.TRAINING_DATA_SECRET
  if (secret && req.headers['x-training-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json(await fetchTrainingRows())
})

// ── Experiments and token routes (require auth via requireOrg inside routers) ──
app.use('/experiments',      experimentsRouter)
app.use('/tokens',           tokensRouter)
app.use('/cell-presets',     cellPresetsRouter)
app.use('/cell-calibration', cellCalibrationRouter)

// Retrain is intentionally public: the global XGBoost model is retrained from
// aggregated outcomes with no per-caller data leakage, and the roadmap treats
// AI_RETRAIN as lenient for guests and early users. Client-side disables the
// button while in flight; upstream handles duplicate-call debouncing.
app.post('/ai/retrain', async (_req, res) => {
  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/ai/retrain`, {
      method: 'POST',
      signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS),
    })
    const body = await upstream.json() as RetrainUpstreamResponse
    if (body.status === 'ok' && (body.samplesUsed ?? 0) > 0) {
      await persistTrainerMetrics(body)
      io.emit(SOCKET_EVENTS.TRAINING_COMPLETE, {
        samplesUsed:       body.samplesUsed       ?? 0,
        modelReady:        body.modelReady        ?? false,
        at:                new Date().toISOString(),
        modelVersion:      body.modelVersion      ?? null,
        promoted:          body.promoted          ?? false,
        holdoutMaeOverall: body.holdoutMaeOverall ?? null,
        previousBestMae:   body.previousBestMae   ?? null,
        targetDr:          body.targetDr          ?? null,
        healthyDr:         body.healthyDr         ?? null,
        rating:            body.rating            ?? null,
      })
    }
    res.json(body)
  } catch {
    res.status(503).json({ status: 'error', detail: 'AI service unreachable' })
  }
})

httpServer.listen(PORT, () => {
  console.log(`ResoPulse API + Socket running on http://localhost:${PORT}`)
})
