import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '500mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bioresonance-api' })
})

app.listen(PORT, () => {
  console.log(`BioResonance API running on http://localhost:${PORT}`)
})
