// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Sonification: maps impedance drift to pitch, DR to gain, rev-ep to tremolo (Web Audio API).
// Sounds are NOT experimental RF signals — they are an abstract auditory display (Kramer 1999).

import { CELL_STATE } from '@/constants/strings'

// ── Pitch mapping constants ────────────────────────────────────────────────────

// Pitch tracks disruption ratio: DR=0 → A3 (220 Hz), DR=1 → A5 (880 Hz), DR>1 → A6 (1760 Hz).
// Two octaves over the [0,1] DR range gives musically clear, non-fatiguing feedback.
// Impedance drift adds a ±semitone vibrato on top so hardware users still get drift cues.
const BASE_FREQ_HZ     = 220    // A3, baseline tone at DR = 0
const MID_FREQ_HZ      = 880    // A5, tone at DR = 1.0 (lysis threshold)
const MAX_FREQ_HZ      = 1760   // A6, tone at DR > 1 (full lysis)
const DRIFT_VIBRATO_HZ = 40     // max pitch shift (Hz) from impedance drift — subtle vibrato
const DRIFT_SCALE_PCT  = 30     // drift % that maps to full DRIFT_VIBRATO_HZ shift
const LYSIS_FREQ_HZ    = 880    // A5, lysis event burst tone
const WARN_FREQ_HZ     = 110    // A2, healthy cell threshold warning
const LYSIS_BURST_S    = 0.4    // seconds, lysis burst duration
const TREMOLO_RATE_HZ  = 6      // Hz, rev-ep AM tremolo rate
const RAMP_TIME_S      = 0.05   // seconds, pitch/gain ramp for click-prevention

// ── Service class ──────────────────────────────────────────────────────────────

class SonificationService {
  private ctx:         AudioContext | null = null
  private osc:         OscillatorNode | null = null
  private gainNode:    GainNode | null = null
  private tremoloOsc:  OscillatorNode | null = null
  private tremoloGain: GainNode | null = null
  private _enabled:    boolean = false

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  get enabled(): boolean { return this._enabled }

  enable(): void {
    if (this._enabled) return
    this._enabled = true
    this._initContext()
  }

  disable(): void {
    if (!this._enabled) return
    this._enabled = false
    this._teardown()
  }

  toggle(): void {
    this._enabled ? this.disable() : this.enable()
  }

  // ── Context init ─────────────────────────────────────────────────────────────

  private _initContext(): void {
    if (this.ctx) return
    this.ctx = new AudioContext()

    // Main oscillator → gain → destination
    this.gainNode = this.ctx.createGain()
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime)
    this.gainNode.connect(this.ctx.destination)

    this.osc = this.ctx.createOscillator()
    this.osc.type = 'sine'
    this.osc.frequency.setValueAtTime(BASE_FREQ_HZ, this.ctx.currentTime)

    // Tremolo: secondary LFO modulates gain for rev-ep state
    this.tremoloOsc  = this.ctx.createOscillator()
    this.tremoloGain = this.ctx.createGain()
    this.tremoloOsc.frequency.setValueAtTime(TREMOLO_RATE_HZ, this.ctx.currentTime)
    this.tremoloOsc.type = 'sine'
    this.tremoloGain.gain.setValueAtTime(0, this.ctx.currentTime)   // off by default
    this.tremoloOsc.connect(this.tremoloGain)
    this.tremoloGain.connect(this.gainNode.gain)

    this.osc.connect(this.gainNode)
    this.osc.start()
    this.tremoloOsc.start()
  }

  private _teardown(): void {
    try {
      this.osc?.stop(); this.osc?.disconnect()
      this.tremoloOsc?.stop(); this.tremoloOsc?.disconnect()
      this.gainNode?.disconnect()
      this.tremoloGain?.disconnect()
      this.ctx?.close()
    } catch (_) { /* ignore errors on already-stopped nodes */ }
    this.osc = this.gainNode = this.tremoloOsc = this.tremoloGain = this.ctx = null
  }

  // ── Live update ───────────────────────────────────────────────────────────────

  update(impedanceDriftPct: number, disruptionRatio: number, cellState: string): void {
    if (!this._enabled || !this.ctx || !this.osc || !this.gainNode) return

    const now = this.ctx.currentTime
    const absDrift = Math.abs(impedanceDriftPct)

    // ── Pitch: primary driver is DR, drift adds a subtle vibrato ────────────
    // DR in [0, 1]: interpolate A3→A5 (one octave per doubling gives perceptual linearity)
    // DR > 1: interpolate A5→A6 (capped, already in lysis)
    const dr = Math.max(0, disruptionRatio)
    const drBase = dr <= 1
      ? BASE_FREQ_HZ + (MID_FREQ_HZ - BASE_FREQ_HZ) * dr
      : MID_FREQ_HZ  + (MAX_FREQ_HZ - MID_FREQ_HZ)  * Math.min(1, dr - 1)
    const driftFrac  = Math.min(1, absDrift / DRIFT_SCALE_PCT)
    const targetFreq = drBase + driftFrac * DRIFT_VIBRATO_HZ
    this.osc.frequency.linearRampToValueAtTime(targetFreq, now + RAMP_TIME_S)

    // ── Gain: audible from first detectable DR, full volume at lysis ─────────
    // Starts at 0.05 so there is always a faint tone when DR > 0 (not silent until threshold)
    const drGain = dr > 0 ? Math.min(0.4, 0.05 + dr * 0.38) : 0

    // ── Tremolo: active only in rev-ep state ─────────────────────────────────
    if (this.tremoloGain) {
      const tremoloAmt = cellState === CELL_STATE.REV_EP ? 0.08 : 0
      this.tremoloGain.gain.linearRampToValueAtTime(tremoloAmt, now + RAMP_TIME_S)
    }

    this.gainNode.gain.linearRampToValueAtTime(drGain, now + RAMP_TIME_S)
  }

  triggerLysisBurst(): void {
    if (!this._enabled || !this.ctx) return
    const burstCtx = this.ctx
    const now = burstCtx.currentTime

    const osc  = burstCtx.createOscillator()
    const gain = burstCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(LYSIS_FREQ_HZ, now)
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + LYSIS_BURST_S)
    osc.connect(gain)
    gain.connect(burstCtx.destination)
    osc.start(now)
    osc.stop(now + LYSIS_BURST_S)
  }

  triggerHealthyWarningPulse(): void {
    if (!this._enabled || !this.ctx) return
    const burstCtx = this.ctx
    const now = burstCtx.currentTime

    const osc  = burstCtx.createOscillator()
    const gain = burstCtx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(WARN_FREQ_HZ, now)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(burstCtx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  }

  // Pitch mapped from current state, for UI display [Hz]
  get currentPitchHz(): number {
    if (!this._enabled || !this.osc) return 0
    return this.osc.frequency.value
  }
}

export const sonification = new SonificationService()
