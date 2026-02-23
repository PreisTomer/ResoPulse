import http from 'http'
import express from 'express'
import cors from 'cors'
import { setupSocketServer } from './socket'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
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
