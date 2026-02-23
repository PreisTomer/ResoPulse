import http from 'http'
import express from 'express'
import cors from 'cors'
import { setupSocketServer } from './socket'

const app = express()
const PORT = process.env.PORT ?? 3001

// In production set FRONTEND_URL to your Vercel domain.
// If unset, all origins are allowed (fine for a public demo).
const ALLOWED_ORIGINS: string[] | true = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : true

app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json({ limit: '500mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bioresonance-api' })
})

// Wrap Express in an http.Server so socket.io can attach
const httpServer = http.createServer(app)
setupSocketServer(httpServer)

httpServer.listen(PORT, () => {
  console.log(`BioResonance API + Socket running on http://localhost:${PORT}`)
})
