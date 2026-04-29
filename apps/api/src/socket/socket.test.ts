// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServer } from 'http'
import { io as ioc } from 'socket.io-client'
import type { Socket as ClientSocket } from 'socket.io-client'

import { sessionRoom, setupSocketServer } from './index'

// ── Unit tests: sessionRoom isolation logic ───────────────────────────────────

describe('sessionRoom', () => {
  it('scopes org members to their org', () => {
    const room = sessionRoom('exp-1', 'org_abc', 'user_x')
    expect(room).toBe('org:org_abc:session:exp-1')
  })

  it('scopes solo users to their userId', () => {
    const room = sessionRoom('exp-1', null, 'user_x')
    expect(room).toBe('user:user_x:session:exp-1')
  })

  it('two users in the same org get the same room', () => {
    const alice = sessionRoom('lab', 'org_team1', 'user_alice')
    const bob   = sessionRoom('lab', 'org_team1', 'user_bob')
    expect(alice).toBe(bob)
  })

  it('two users in different orgs get different rooms even with the same session name', () => {
    const orgA = sessionRoom('lab', 'org_a', 'user_1')
    const orgB = sessionRoom('lab', 'org_b', 'user_2')
    expect(orgA).not.toBe(orgB)
  })

  it('an org user and a solo user never share a room', () => {
    const orgMember = sessionRoom('lab', 'org_a', 'user_1')
    const soloUser  = sessionRoom('lab', null,    'user_1')
    expect(orgMember).not.toBe(soloUser)
  })

  it('two solo users with different IDs never share a room', () => {
    const alice = sessionRoom('lab', null, 'user_alice')
    const bob   = sessionRoom('lab', null, 'user_bob')
    expect(alice).not.toBe(bob)
  })

  it('strips unsafe characters from the session name', () => {
    const room = sessionRoom('my session! #1', 'org_x', 'user_y')
    // "my session! #1" → space→_ exclamation→_ space→_ hash→_ so four replacements before "1"
    expect(room).toMatch(/^org:org_x:session:my_session___1$/)
  })

  it('uses "default" when session name is empty', () => {
    const room = sessionRoom('', 'org_x', 'user_y')
    expect(room).toBe('org:org_x:session:default')
  })

  it('truncates excessively long session names', () => {
    const longName = 'a'.repeat(200)
    const room = sessionRoom(longName, 'org_x', 'user_y')
    // Room key should not exceed prefix + 80 char name limit
    expect(room.split(':session:')[1]!.length).toBeLessThanOrEqual(80)
  })
})

// ── Integration tests: full socket server with test-mode auth stub ────────────

// A minimal valid StatePacket — only fields the server validates.
const VALID_STATE = {
  freqKHz:             1_000,
  fieldVcm:            100,
  medium:              'saline',
  dutyCycle:           0.5,
  pulseWidthNs:        100,
  waveform:            'cw',
  orientationDeg:      0,
  lysisNPulses:        1,
  chartMode:           'schwan',
  doubleShellEnabled:  false,
  perfusionRate:       0,
  cellPackingFraction: 0.1,
  targetPresetId:      't1',
  healthyPresetId:     'h1',
  sessionName:         'lab-session',
}

type TestIdentity = { userId: string; orgId?: string }

function authToken(id: TestIdentity): string {
  return JSON.stringify(id)
}

function connectClient(port: number, id: TestIdentity): ClientSocket {
  return ioc(`http://localhost:${port}`, {
    transports: ['websocket'],
    auth:       { token: authToken(id) },
  })
}

function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs)
    socket.once(event, (data: T) => { clearTimeout(timer); resolve(data) })
  })
}

function connected(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('connect_error', reject)
  })
}

describe('socket server — org-scoped room isolation', () => {
  let port: number
  let cleanup: () => void

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    const httpServer = createServer()
    setupSocketServer(httpServer)
    await new Promise<void>(resolve => httpServer.listen(0, resolve))
    const addr = httpServer.address()
    port = typeof addr === 'object' && addr ? addr.port : 0
    cleanup = () => httpServer.close()
  })

  afterAll(() => cleanup())

  afterEach(async () => {
    // Small pause to let socket teardown settle between tests.
    await new Promise(r => setTimeout(r, 50))
  })

  it('two clients in the same org share state updates', async () => {
    const alice = connectClient(port, { userId: 'user_alice', orgId: 'org_team' })
    const bob   = connectClient(port, { userId: 'user_bob',   orgId: 'org_team' })

    await Promise.all([connected(alice), connected(bob)])

    // Both join the same session via stateSync
    const syncPayload = { ...VALID_STATE, sessionName: 'shared-lab' }
    alice.emit('stateSync', syncPayload)
    bob.emit('stateSync', syncPayload)

    // Alice changes state — Bob must receive the update
    const updateReceived = waitForEvent<typeof VALID_STATE>(bob, 'stateUpdate')
    alice.emit('stateSync', { ...syncPayload, freqKHz: 5_000 })

    const update = await updateReceived
    expect(update.freqKHz).toBe(5_000)

    alice.disconnect()
    bob.disconnect()
  })

  it('two clients in different orgs do not receive each other state updates', async () => {
    const userA = connectClient(port, { userId: 'user_1', orgId: 'org_alpha' })
    const userB = connectClient(port, { userId: 'user_2', orgId: 'org_beta'  })

    await Promise.all([connected(userA), connected(userB)])

    // Both join sessions with the same name but different orgs
    const syncPayload = { ...VALID_STATE, sessionName: 'same-name' }
    userA.emit('stateSync', syncPayload)
    userB.emit('stateSync', syncPayload)

    // userA changes state — userB must NOT receive it
    let leaked = false
    userB.on('stateUpdate', () => { leaked = true })
    userA.emit('stateSync', { ...syncPayload, freqKHz: 9_000 })

    await new Promise(r => setTimeout(r, 300))
    expect(leaked).toBe(false)

    userA.disconnect()
    userB.disconnect()
  })

  it('two solo users (no org) do not receive each other state updates', async () => {
    const alice = connectClient(port, { userId: 'solo_alice' })
    const bob   = connectClient(port, { userId: 'solo_bob'   })

    await Promise.all([connected(alice), connected(bob)])

    const syncPayload = { ...VALID_STATE, sessionName: 'my-lab' }
    alice.emit('stateSync', syncPayload)
    bob.emit('stateSync', syncPayload)

    let leaked = false
    bob.on('stateUpdate', () => { leaked = true })
    alice.emit('stateSync', { ...syncPayload, freqKHz: 7_000 })

    await new Promise(r => setTimeout(r, 300))
    expect(leaked).toBe(false)

    alice.disconnect()
    bob.disconnect()
  })

  it('a solo user and an org member with the same userId do not share state', async () => {
    const orgMember = connectClient(port, { userId: 'user_shared_id', orgId: 'org_x' })
    const soloUser  = connectClient(port, { userId: 'user_shared_id'                 })

    await Promise.all([connected(orgMember), connected(soloUser)])

    const syncPayload = { ...VALID_STATE, sessionName: 'isolation-test' }
    orgMember.emit('stateSync', syncPayload)
    soloUser.emit('stateSync', syncPayload)

    let leaked = false
    soloUser.on('stateUpdate', () => { leaked = true })
    orgMember.emit('stateSync', { ...syncPayload, freqKHz: 3_000 })

    await new Promise(r => setTimeout(r, 300))
    expect(leaked).toBe(false)

    orgMember.disconnect()
    soloUser.disconnect()
  })

  it('rejects connections with no auth token', async () => {
    const noAuth = ioc(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth:       {},
    })
    await expect(connected(noAuth)).rejects.toThrow()
    noAuth.disconnect()
  })

  it('rejects connections with a malformed auth token', async () => {
    const badAuth = ioc(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth:       { token: 'not-valid-json' },
    })
    await expect(connected(badAuth)).rejects.toThrow()
    badAuth.disconnect()
  })
})
