// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import http from 'http'
import express from 'express'
import cors from 'cors'
import { setupSocketServer } from './socket'
import { countOutcomes, fetchTrainingRows } from './db'

const AI_SERVICE_URL      = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const AI_PROXY_TIMEOUT_MS = 10_000

const app  = express()
const PORT = process.env.PORT ?? 3001

// In production set FRONTEND_URL to your Vercel domain; unset allows all origins.
const ALLOWED_ORIGINS: string[] | true = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : true

app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  const outcomeCount = countOutcomes()
  res.json({
    status:       'ok',
    service:      'resopulse-api',
    dbOutcomes:   outcomeCount,    // -1 = DB unavailable (ephemeral FS)
    dbPersistent: outcomeCount >= 0,
  })
})

// Returns rated outcomes as JSON for the Python AI service to pull when retraining.
// Set TRAINING_DATA_SECRET on both services to restrict access; omit for local dev.
app.get('/ai/training-data', (req, res) => {
  const secret = process.env.TRAINING_DATA_SECRET
  if (secret && req.headers['x-training-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json(fetchTrainingRows())
})

// Proxies to the Python AI service avoid CORS issues for frontend polling.
app.get('/ai/health', async (_req, res) => {
  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS),
    })
    const body = await upstream.json() as Record<string, unknown>
    res.json({ ...body, aiServiceReachable: true })
  } catch {
    res.json({ status: 'unavailable', aiServiceReachable: false, modelReady: false, trainingSamples: 0 })
  }
})

app.post('/ai/retrain', async (_req, res) => {
  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/ai/retrain`, {
      method: 'POST',
      signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS),
    })
    res.json(await upstream.json())
  } catch {
    res.status(503).json({ status: 'error', detail: 'AI service unreachable' })
  }
})

const httpServer = http.createServer(app)
setupSocketServer(httpServer)

httpServer.listen(PORT, () => {
  console.log(`ResoPulse API + Socket running on http://localhost:${PORT}`)
})
