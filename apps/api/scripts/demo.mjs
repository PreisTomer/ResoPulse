/**
 * ResoPulse demo launcher.
 * Starts the backend dev server and opens an ngrok tunnel,
 * then prints the shareable URL to give to demo participants.
 *
 * Prerequisites:
 *   1. Free ngrok account at https://ngrok.com
 *   2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
 *   3. Set environment variable before running:
 *        Windows CMD:   set NGROK_AUTHTOKEN=your_token_here
 *        PowerShell:    $env:NGROK_AUTHTOKEN="your_token_here"
 *   4. Set your Vercel URL (one-time):
 *        Windows CMD:   set VERCEL_URL=https://your-app.vercel.app
 *        PowerShell:    $env:VERCEL_URL="https://your-app.vercel.app"
 *
 * Usage:
 *   cd backend
 *   npm run demo
 */

import ngrok from '@ngrok/ngrok'
import { spawn } from 'child_process'
import { setTimeout as sleep } from 'timers/promises'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '..')
const PORT       = 3001
const VERCEL_URL = (process.env.VERCEL_URL ?? '').replace(/\/$/, '')

// ── Validate authtoken ────────────────────────────────────────────────────────
if (!process.env.NGROK_AUTHTOKEN) {
  console.error('\n[demo] ERROR: NGROK_AUTHTOKEN is not set.')
  console.error('  Steps:')
  console.error('    1. Sign up free at https://ngrok.com')
  console.error('    2. Get your token: https://dashboard.ngrok.com/get-started/your-authtoken')
  console.error('    3. Windows CMD:   set NGROK_AUTHTOKEN=your_token_here')
  console.error('       PowerShell:    $env:NGROK_AUTHTOKEN="your_token_here"\n')
  process.exit(1)
}

// ── Start backend dev server ──────────────────────────────────────────────────
console.log('[demo] Starting ResoPulse backend on port', PORT, '...')

const server = spawn('npm', ['run', 'dev'], {
  cwd:   backendDir,
  stdio: 'inherit',
  shell: true,
})

server.on('error', (err) => {
  console.error('[demo] Failed to start backend:', err.message)
  process.exit(1)
})

// Wait for the server to be ready before opening the tunnel
await sleep(2500)

// ── Open ngrok tunnel ─────────────────────────────────────────────────────────
console.log('[demo] Opening ngrok tunnel...')

let listener
try {
  listener = await ngrok.forward({ addr: PORT, authtoken_from_env: true })
} catch (err) {
  console.error('[demo] ngrok failed:', err.message)
  server.kill()
  process.exit(1)
}

const tunnelUrl = listener.url()
const separator = '='.repeat(64)

console.log('\n' + separator)

if (VERCEL_URL) {
  const shareUrl = `${VERCEL_URL}?backend=${tunnelUrl}`
  console.log('  SHARE THIS URL WITH YOUR DEMO PARTICIPANT:')
  console.log(`\n  ${shareUrl}`)
} else {
  console.log('  NGROK TUNNEL URL:')
  console.log(`\n  ${tunnelUrl}`)
  console.log('\n  Set VERCEL_URL env var to get the full shareable link:')
  console.log('    CMD:        set VERCEL_URL=https://your-app.vercel.app')
  console.log('    PowerShell: $env:VERCEL_URL="https://your-app.vercel.app"')
  console.log('\n  Manual share URL:')
  console.log(`  https://YOUR-APP.vercel.app?backend=${tunnelUrl}`)
}

console.log('\n' + separator)
console.log('\nPress Ctrl+C to stop the demo session.\n')

// ── Cleanup on exit ───────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[demo] Shutting down...')
  try { await ngrok.disconnect() } catch (_) {}
  server.kill()
  process.exit(0)
})
