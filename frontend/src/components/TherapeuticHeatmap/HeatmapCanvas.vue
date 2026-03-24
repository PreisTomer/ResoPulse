<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap__canvas-wrap" ref="wrap" v-tip="$t('heatmap.tipCanvas')">
    <canvas
      ref="canvas"
      class="hmap__canvas"
      @click="onCanvasClick"
      @mousemove="onCanvasMove"
      @mouseleave="onCanvasLeave"
    ></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { WAVEFORM, CELL_CATEGORY } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import {
  HMAP_FREQ_STEPS, HMAP_FIELD_STEPS, HMAP_CANVAS_W, HMAP_CANVAS_H, HMAP_MARGIN,
  HMAP_LYSIS_DR, HMAP_APPROACH_DR, HMAP_WARN_DR, HMAP_THERM_WARN_C, HMAP_THERM_CRIT_C,
  HMAP_ZONE, HMAP_ZONE_COLOR, HMAP_ZONE_CSS, HMAP_ZONE_KEY, type HmapZone,
} from '@/constants/heatmap'
import {
  computeSchwan, computeTau, computeSAR, computeResonantDisruption,
} from '@/utils/physics'
import {
  BODY_TEMP_C, NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF, WF_CW, WF_PULSED, MIN_PULSE_ENVELOPE,
} from '@/constants/physics'
import { formatFreqKHz } from '@/utils/format'
import { C } from '@/theme/colors'
import type { HoverInfo, OutcomeItem } from '@/types/heatmap'

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },

  emits: ['hover-info-change', 'op-zone-change'],

  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      ctx:            null as CanvasRenderingContext2D | null,
      grid:           [] as number[],
      redrawTimer:    null as ReturnType<typeof setTimeout> | null,
      resizeObserver: null as ResizeObserver | null,
      displayW:       HMAP_CANVAS_W,
      displayH:       HMAP_CANVAS_H,
    }
  },

  computed: {
    xMin(): number { return 10 },

    xMax(): number {
      const cat = this.store.targetCellCategory
      if (this.store.isResonanceMode) {
        const t = this.store.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) return Math.max(t.resonantFreqGHz * 1e6 * 2.5, 1_000_000)
      }
      if (cat === CELL_CATEGORY.VIRUS)    return 50_000_000
      if (cat === CELL_CATEGORY.BACTERIA) return  1_000_000
      return 10_000
    },

    yMax(): number {
      const s      = this.store
      const sigma  = s.effectiveSigmaE
      const pulsed = s.waveform === WAVEFORM.PULSED
      const pw_ns  = s.pulseWidthNs

      const hTau = computeTau(s.healthy, sigma)
      const pefH = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const healthyLysis = s.healthy.thresholdVoltage / (1.5 * s.healthy.radius * 1e-4 * pefH)

      let targetLysis: number
      if (s.isResonanceMode) {
        const tr = s.target as { resonantThresholdVcm?: number }
        targetLysis = tr.resonantThresholdVcm ?? (s.target.thresholdVoltage / (1.5 * s.target.radius * 1e-4))
      } else {
        const tTau = computeTau(s.target, sigma)
        const pefT = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / tTau)) : 1.0
        targetLysis = s.target.thresholdVoltage / (1.5 * s.target.radius * 1e-4 * pefT)
      }
      return Math.max(healthyLysis, targetLysis) * 2.0
    },

    plotW(): number { return this.displayW - HMAP_MARGIN.LEFT - HMAP_MARGIN.RIGHT },
    plotH(): number { return this.displayH - HMAP_MARGIN.TOP  - HMAP_MARGIN.BOTTOM },

    /** Triggers full grid recompute when any physics input changes. */
    physicsKey(): string {
      const s = this.store
      const t = s.target as { resonantFreqGHz?: number }
      return [
        s.healthy.id, s.healthy.radius, s.healthy.membraneThickness,
        s.healthy.dielectricConstant, s.healthy.conductivity, s.healthy.thresholdVoltage,
        s.target.id, s.target.radius, s.target.membraneThickness,
        s.target.dielectricConstant, s.target.conductivity, s.target.thresholdVoltage,
        t.resonantFreqGHz,
        s.medium, s.waveform, s.dutyCycle, s.pulseWidthNs, s.chartMode,
        s.cellPackingFraction, s.perfusionRate,
        s.resetCounter,
      ].join('|')
    },
  },

  watch: {
    open(v: boolean) {
      if (!v) return
      // nextTick ensures Vue has flushed display:none removal;
      // rAF ensures the browser has computed layout before we read clientWidth
      this.$nextTick(() => requestAnimationFrame(() => {
        const wrap = this.$refs.wrap as HTMLElement
        if (!wrap) return
        const w = wrap.clientWidth
        if (w > 0) this._setupCanvas(w)
        this._recompute()
      }))
    },
    physicsKey()                        { this._scheduleRecompute() },
    'store.currentBroadcastFrequency'() { this._renderCanvas() },
    'store.fieldIntensity'()            { this._renderCanvas() },
    'store.targetCellCategory'(cat: string) {
      if (cat !== CELL_CATEGORY.MAMMALIAN || this.resizeObserver) return
      this.$nextTick(() => this._initObserver())
    },
  },

  mounted() {
    this._initObserver()
  },

  beforeUnmount() {
    if (this.redrawTimer) clearTimeout(this.redrawTimer)
    if (this.resizeObserver) this.resizeObserver.disconnect()
  },

  methods: {
    // ── Lifecycle helpers ──────────────────────────────────────────────────────

    _initObserver() {
      const wrap = this.$refs.wrap as HTMLElement | null
      if (!wrap || this.resizeObserver) return
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const w = Math.round(entry.contentRect.width)
        if (w <= 0) return
        this._setupCanvas(w)
        this._renderCanvas()
      })
      this.resizeObserver.observe(wrap)
      const initialW = wrap.clientWidth > 0 ? wrap.clientWidth : HMAP_CANVAS_W
      this._setupCanvas(initialW)
      this._recompute()
    },

    _setupCanvas(w: number) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      if (!canvas) return
      const aspect  = HMAP_CANVAS_H / HMAP_CANVAS_W
      const dpr     = window.devicePixelRatio || 1
      this.displayW = w
      this.displayH = Math.round(w * aspect)
      canvas.width  = w * dpr
      canvas.height = this.displayH * dpr
      this.ctx      = canvas.getContext('2d')!
      this.ctx.scale(dpr, dpr)
    },

    _scheduleRecompute() {
      if (this.redrawTimer) clearTimeout(this.redrawTimer)
      this.redrawTimer = setTimeout(() => this._recompute(), 250)
    },

    _recompute() {
      this._computeGrid()
      this._renderCanvas()
    },

    // ── Physics ────────────────────────────────────────────────────────────────

    _freqAt(fi: number): number {
      const t = fi / (HMAP_FREQ_STEPS - 1)
      return this.xMin * Math.pow(this.xMax / this.xMin, t)
    },

    _fieldAt(vi: number): number {
      return (vi / (HMAP_FIELD_STEPS - 1)) * this.yMax
    },

    _zoneAt(freqKHz: number, fieldVcm: number): HmapZone {
      const s = this.store
      const sigma_e = s.effectiveSigmaE
      const wf      = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc      = s.dutyCycle
      const pw_ns   = s.pulseWidthNs
      const pulsed  = s.waveform === WAVEFORM.PULSED

      const hTau = computeTau(s.healthy, sigma_e)
      const hPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hVm  = computeSchwan(s.healthy, freqKHz, fieldVcm, sigma_e, 1.0)
      const hDR  = (hVm * hPEF) / s.healthy.thresholdVoltage
      const hCp  = s.healthy.specificHeatCapacity
      const hSAR = computeSAR(s.healthy, fieldVcm, sigma_e, wf)
      const hLambdaPerf = s.perfusionRate * PENNES_BLOOD_COEFF / hCp
      const hTss = BODY_TEMP_C + hSAR * dc / ((NEWTON_COOLING_LAMBDA + hLambdaPerf) * hCp)

      let tDR = 0
      if (s.isResonanceMode) {
        const tr = s.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
        if (tr.resonantFreqGHz && tr.capsidQ && tr.resonantThresholdVcm) {
          tDR = computeResonantDisruption(tr.resonantFreqGHz, tr.capsidQ, tr.resonantThresholdVcm, freqKHz * 1000, fieldVcm)
        }
      } else {
        const tTau = computeTau(s.target, sigma_e)
        const tPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / tTau)) : 1.0
        const tVm  = computeSchwan(s.target, freqKHz, fieldVcm, sigma_e, 1.0)
        tDR = (tVm * tPEF) / s.target.thresholdVoltage
      }

      if (hTss >= HMAP_THERM_CRIT_C) return HMAP_ZONE.THERMAL
      if (hDR  >= HMAP_LYSIS_DR)     return HMAP_ZONE.ABLATIVE
      if (tDR  >= HMAP_LYSIS_DR) {
        if (hDR >= HMAP_WARN_DR || hTss >= HMAP_THERM_WARN_C) return HMAP_ZONE.MARGINAL
        return HMAP_ZONE.THERAPEUTIC
      }
      if (tDR >= HMAP_APPROACH_DR) return HMAP_ZONE.APPROACHING
      return HMAP_ZONE.SUB
    },

    _computeGrid() {
      const s       = this.store
      const sigma_e = s.effectiveSigmaE
      const wf      = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc      = s.dutyCycle
      const pw_ns   = s.pulseWidthNs
      const pulsed  = s.waveform === WAVEFORM.PULSED
      const isRes   = s.isResonanceMode

      const hTau        = computeTau(s.healthy, sigma_e)
      const hPEF        = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hCp         = s.healthy.specificHeatCapacity
      const hLambdaPerf = s.perfusionRate * PENNES_BLOOD_COEFF / hCp

      const tTau = isRes ? 0 : computeTau(s.target, sigma_e)
      const tPEF = (pulsed && !isRes) ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / tTau)) : 1.0

      const tr     = s.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      const hasRes = isRes && !!tr.resonantFreqGHz && !!tr.capsidQ && !!tr.resonantThresholdVcm

      const result = new Array<number>(HMAP_FREQ_STEPS * HMAP_FIELD_STEPS)

      for (let fi = 0; fi < HMAP_FREQ_STEPS; fi++) {
        const freqKHz = this._freqAt(fi)
        const freqHz  = freqKHz * 1000

        for (let vi = 0; vi < HMAP_FIELD_STEPS; vi++) {
          const fieldVcm = this._fieldAt(vi)

          const hVm  = computeSchwan(s.healthy, freqKHz, fieldVcm, sigma_e, 1.0)
          const hDR  = (hVm * hPEF) / s.healthy.thresholdVoltage
          const hSAR = computeSAR(s.healthy, fieldVcm, sigma_e, wf)
          const hTss = BODY_TEMP_C + hSAR * dc / ((NEWTON_COOLING_LAMBDA + hLambdaPerf) * hCp)

          let tDR = 0
          if (hasRes) {
            tDR = computeResonantDisruption(tr.resonantFreqGHz!, tr.capsidQ!, tr.resonantThresholdVcm!, freqHz, fieldVcm)
          } else {
            const tVm = computeSchwan(s.target, freqKHz, fieldVcm, sigma_e, 1.0)
            tDR = (tVm * tPEF) / s.target.thresholdVoltage
          }

          if (hTss >= HMAP_THERM_CRIT_C) { result[fi * HMAP_FIELD_STEPS + vi] = HMAP_ZONE.THERMAL;    continue }
          if (hDR  >= HMAP_LYSIS_DR)     { result[fi * HMAP_FIELD_STEPS + vi] = HMAP_ZONE.ABLATIVE;   continue }
          if (tDR  >= HMAP_LYSIS_DR) {
            result[fi * HMAP_FIELD_STEPS + vi] = (hDR >= HMAP_WARN_DR || hTss >= HMAP_THERM_WARN_C)
              ? HMAP_ZONE.MARGINAL : HMAP_ZONE.THERAPEUTIC
            continue
          }
          result[fi * HMAP_FIELD_STEPS + vi] = tDR >= HMAP_APPROACH_DR ? HMAP_ZONE.APPROACHING : HMAP_ZONE.SUB
        }
      }

      this.grid = result
    },

    // ── Canvas rendering ───────────────────────────────────────────────────────

    _renderCanvas() {
      const ctx = this.ctx
      if (!ctx || this.grid.length === 0) return

      const W  = this.displayW
      const H  = this.displayH
      const ml = HMAP_MARGIN.LEFT, mt = HMAP_MARGIN.TOP
      const pw = this.plotW, ph = this.plotH
      const nF = HMAP_FREQ_STEPS, nV = HMAP_FIELD_STEPS
      const cw = pw / nF + 0.6   // tiny overlap prevents canvas gaps
      const ch = ph / nV + 0.6

      ctx.clearRect(0, 0, W, H)

      // Background plot area
      ctx.fillStyle = C.bg
      ctx.fillRect(ml, mt, pw, ph)

      // Grid cells
      for (let fi = 0; fi < nF; fi++) {
        const x = ml + fi * (pw / nF)
        for (let vi = 0; vi < nV; vi++) {
          const zone = this.grid[fi * nV + vi] as HmapZone
          ctx.fillStyle = HMAP_ZONE_COLOR[zone]
          const y = mt + (nV - 1 - vi) * (ph / nV)  // invert: high field = top
          ctx.fillRect(x, y, cw, ch)
        }
      }

      // ── Overlay lines ──────────────────────────────────────────────────────

      const s = this.store

      // Optimal frequency — yellow dashed
      const optKhz = s.optimalFreqResult.khz
      if (optKhz >= this.xMin && optKhz <= this.xMax) {
        const ox = this._freqToX(optKhz)
        ctx.save()
        ctx.strokeStyle = C.amber
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath(); ctx.moveTo(ox, mt); ctx.lineTo(ox, mt + ph); ctx.stroke()
        ctx.restore()
        ctx.save()
        ctx.fillStyle = C.amber
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('opt', ox, mt + 9)
        ctx.restore()
      }

      // f_res — white dashed (resonance mode)
      if (s.isResonanceMode) {
        const tr = s.target as { resonantFreqGHz?: number }
        if (tr.resonantFreqGHz) {
          const resKhz = tr.resonantFreqGHz * 1e6
          if (resKhz >= this.xMin && resKhz <= this.xMax) {
            const rx = this._freqToX(resKhz)
            ctx.save()
            ctx.strokeStyle = C.w70
            ctx.lineWidth = 1.5
            ctx.setLineDash([4, 3])
            ctx.beginPath(); ctx.moveTo(rx, mt); ctx.lineTo(rx, mt + ph); ctx.stroke()
            ctx.restore()
            ctx.save()
            ctx.fillStyle = C.w70
            ctx.font = '9px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('f_res', rx, mt + 9)
            ctx.restore()
          }
        }
      }

      // fc(T) and fc(H) — cyan dotted (Schwan mode)
      if (!s.isResonanceMode) {
        for (const [label, fcKhz] of [['fc(T)', s.targetFc], ['fc(H)', s.healthyFc]] as [string, number][]) {
          if (fcKhz < this.xMin || fcKhz > this.xMax) continue
          const fx = this._freqToX(fcKhz)
          ctx.save()
          ctx.strokeStyle = C.primaryStroke55
          ctx.lineWidth = 1
          ctx.setLineDash([2, 3])
          ctx.beginPath(); ctx.moveTo(fx, mt); ctx.lineTo(fx, mt + ph); ctx.stroke()
          ctx.restore()
          ctx.save()
          ctx.fillStyle = C.primaryFill60
          ctx.font = '8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(label, fx, mt + ph + 14)
          ctx.restore()
        }
      }

      // ── Operating point ────────────────────────────────────────────────────

      const opX = this._freqToX(s.currentBroadcastFrequency)
      const opY = this._fieldToY(s.fieldIntensity)

      // Projection lines (dashed white)
      ctx.save()
      ctx.strokeStyle = C.w22
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(opX, mt); ctx.lineTo(opX, mt + ph)
      ctx.moveTo(ml, opY); ctx.lineTo(ml + pw, opY)
      ctx.stroke()
      ctx.restore()

      // Crosshair + dot
      ctx.save()
      ctx.strokeStyle = C.white
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(opX - 8, opY); ctx.lineTo(opX + 8, opY)
      ctx.moveTo(opX, opY - 8); ctx.lineTo(opX, opY + 8)
      ctx.stroke()
      ctx.fillStyle = C.white
      ctx.beginPath()
      ctx.arc(opX, opY, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Axes ───────────────────────────────────────────────────────────────

      this._drawAxes(ctx, ml, mt, pw, ph)

      // Emit current zone color so parent can pass it to HeatmapStats
      const opZone = this._zoneAt(s.currentBroadcastFrequency, s.fieldIntensity)
      this.$emit('op-zone-change', HMAP_ZONE_CSS[opZone])
    },

    _drawAxes(ctx: CanvasRenderingContext2D, ml: number, mt: number, pw: number, ph: number) {
      ctx.save()
      ctx.strokeStyle = C.w45
      ctx.fillStyle   = C.w65
      ctx.lineWidth   = 1
      ctx.font        = '9px monospace'

      // Border lines
      ctx.beginPath()
      ctx.moveTo(ml, mt + ph); ctx.lineTo(ml + pw, mt + ph)
      ctx.moveTo(ml, mt);      ctx.lineTo(ml, mt + ph)
      ctx.stroke()

      // X-axis ticks (log decades)
      const decades = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'top'
      for (const d of decades) {
        if (d < this.xMin * 0.9 || d > this.xMax * 1.1) continue
        const x = this._freqToX(d)
        ctx.beginPath(); ctx.moveTo(x, mt + ph); ctx.lineTo(x, mt + ph + 4); ctx.stroke()
        ctx.fillText(this._fmtFreq(d), x, mt + ph + 6)
      }

      // X-axis title
      ctx.fillStyle    = C.w40
      ctx.font         = '9px monospace'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('RF Frequency (log)', ml + pw / 2, this.displayH)

      // Y-axis ticks
      ctx.fillStyle    = C.w65
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      for (const tick of this._yTicks()) {
        const y = this._fieldToY(tick)
        ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml - 4, y); ctx.stroke()
        ctx.fillText(this._fmtField(tick), ml - 6, y)
      }

      // Y-axis title (rotated)
      ctx.save()
      ctx.translate(10, mt + ph / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle    = C.w40
      ctx.font         = '9px monospace'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Field Intensity [V/cm]', 0, 0)
      ctx.restore()

      ctx.restore()
    },

    _yTicks(): number[] {
      const raw  = this.yMax / 5
      const mag  = Math.pow(10, Math.floor(Math.log10(raw)))
      const step = Math.ceil(raw / mag) * mag
      const ticks: number[] = []
      for (let v = 0; v <= this.yMax * 1.01; v += step) ticks.push(v)
      return ticks
    },

    // ── Coordinate helpers ─────────────────────────────────────────────────────

    _freqToX(freqKHz: number): number {
      const t = Math.log(freqKHz / this.xMin) / Math.log(this.xMax / this.xMin)
      return HMAP_MARGIN.LEFT + Math.max(0, Math.min(1, t)) * this.plotW
    },

    _fieldToY(fieldVcm: number): number {
      const t = Math.max(0, Math.min(1, fieldVcm / this.yMax))
      return HMAP_MARGIN.TOP + (1 - t) * this.plotH
    },

    _xToFreq(x: number): number {
      const t = (x - HMAP_MARGIN.LEFT) / this.plotW
      return this.xMin * Math.pow(this.xMax / this.xMin, Math.max(0, Math.min(1, t)))
    },

    _yToField(y: number): number {
      const t = 1 - (y - HMAP_MARGIN.TOP) / this.plotH
      return Math.max(0, Math.min(this.yMax, t * this.yMax))
    },

    // ── Axis label formatters ──────────────────────────────────────────────────

    _fmtFreq(khz: number): string {
      if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(0)}G`
      if (khz >= 1_000)     return `${(khz / 1_000).toFixed(0)}M`
      return `${khz.toFixed(0)}k`
    },

    _fmtField(v: number): string {
      if (v === 0)    return '0'
      if (v >= 10_000) return `${(v / 1000).toFixed(0)}k`
      if (v >= 1_000)  return `${(v / 1000).toFixed(1)}k`
      return `${v.toFixed(0)}`
    },

    // ── Interaction ────────────────────────────────────────────────────────────

    onCanvasClick(e: MouseEvent) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      const rect   = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      if (cx < HMAP_MARGIN.LEFT || cx > this.displayW - HMAP_MARGIN.RIGHT) return
      if (cy < HMAP_MARGIN.TOP  || cy > this.displayH - HMAP_MARGIN.BOTTOM) return
      this.store.setBroadcastFreqKHz(Math.round(this._xToFreq(cx)))
      this.store.setFieldIntensity(Math.round(this._yToField(cy)))
      broadcastStateSync()
    },

    onCanvasMove(e: MouseEvent) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      const rect   = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      if (cx < HMAP_MARGIN.LEFT || cx > this.displayW - HMAP_MARGIN.RIGHT ||
          cy < HMAP_MARGIN.TOP  || cy > this.displayH - HMAP_MARGIN.BOTTOM) {
        this.$emit('hover-info-change', null)
        this._resetCanvasTip()
        return
      }

      const freqKHz  = this._xToFreq(cx)
      const fieldVcm = this._yToField(cy)
      const zone     = this._zoneAt(freqKHz, fieldVcm)

      // Hover physics
      const s = this.store, sigma_e = s.effectiveSigmaE
      const wf     = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc     = s.dutyCycle, pw_ns = s.pulseWidthNs, pulsed = s.waveform === WAVEFORM.PULSED
      const hTau   = computeTau(s.healthy, sigma_e)
      const hPEF   = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hVm    = computeSchwan(s.healthy, freqKHz, fieldVcm, sigma_e, 1.0)
      const hDR    = (hVm * hPEF) / s.healthy.thresholdVoltage
      const hCp    = s.healthy.specificHeatCapacity
      const hSAR   = computeSAR(s.healthy, fieldVcm, sigma_e, wf)
      const hLPerf = s.perfusionRate * PENNES_BLOOD_COEFF / hCp
      const hTss   = BODY_TEMP_C + hSAR * dc / ((NEWTON_COOLING_LAMBDA + hLPerf) * hCp)

      let tDR = 0
      if (s.isResonanceMode) {
        const tr = s.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
        if (tr.resonantFreqGHz && tr.capsidQ && tr.resonantThresholdVcm) {
          tDR = computeResonantDisruption(tr.resonantFreqGHz, tr.capsidQ, tr.resonantThresholdVcm, freqKHz * 1000, fieldVcm)
        }
      } else {
        const tTau = computeTau(s.target, sigma_e)
        const tPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / tTau)) : 1.0
        const tVm  = computeSchwan(s.target, freqKHz, fieldVcm, sigma_e, 1.0)
        tDR = (tVm * tPEF) / s.target.thresholdVoltage
      }

      const pLysis = (!s.isResonanceMode || s.targetCellCategory === CELL_CATEGORY.MAMMALIAN)
        ? `${(Math.max(0, 1 - 1 / Math.max(0.001, tDR)) * 100).toFixed(0)}%`
        : '\u2014'

      // Outcome badges
      const outcomes: OutcomeItem[] = []
      if (tDR >= HMAP_LYSIS_DR && hDR < HMAP_LYSIS_DR && hTss < HMAP_THERM_CRIT_C) {
        outcomes.push({ text: '\u2713 Target lysis', level: 'ok' })
        if (hDR >= HMAP_WARN_DR || hTss >= HMAP_THERM_WARN_C) {
          outcomes.push({ text: '\u26a0 Healthy stressed', level: 'warn' })
        } else {
          outcomes.push({ text: '\u2713 Healthy safe', level: 'ok' })
        }
      } else if (hDR >= HMAP_LYSIS_DR) {
        outcomes.push({ text: '\u26d4 Healthy lysis', level: 'danger' })
        if (tDR >= HMAP_LYSIS_DR) outcomes.push({ text: '\u26d4 Target lysis', level: 'danger' })
      } else if (hTss >= HMAP_THERM_CRIT_C) {
        outcomes.push({ text: `\u26d4 Thermal damage (\u2265${HMAP_THERM_CRIT_C} ${UNIT.DEG_C})`, level: 'danger' })
      } else if (tDR >= HMAP_APPROACH_DR) {
        outcomes.push({ text: '\u2192 Approaching window', level: 'info' })
        outcomes.push({ text: `T-DR ${(tDR * 100).toFixed(0)}%, lysis at ${(HMAP_LYSIS_DR * 100).toFixed(0)}%`, level: 'info' })
      } else {
        outcomes.push({ text: 'Sub-threshold', level: 'info' })
      }
      if (hTss >= HMAP_THERM_WARN_C && hTss < HMAP_THERM_CRIT_C) {
        outcomes.push({ text: `\u26a0 H-Temp ${hTss.toFixed(1)} ${UNIT.DEG_C}, elevated`, level: 'warn' })
      }

      const freqLabel  = formatFreqKHz(freqKHz, 2)
      const fieldLabel = fieldVcm >= 1000 ? `${(fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}` : `${fieldVcm.toFixed(0)} ${UNIT.V_PER_CM}`
      const zoneLabel  = this.$t(`heatmap.zone${HMAP_ZONE_KEY[zone]}`) as string

      const info: HoverInfo = {
        freqLabel, fieldLabel, zoneLabel,
        zoneColor: HMAP_ZONE_CSS[zone],
        tDr:       `${(Math.min(tDR, 9.99) * 100).toFixed(1)}%`,
        hDr:       `${(Math.min(hDR, 9.99) * 100).toFixed(1)}%`,
        temp:      `${hTss.toFixed(1)} ${UNIT.DEG_C}`,
        pLysis,
        outcomes,
      }
      this.$emit('hover-info-change', info)

      // Update the v-tip content dynamically while hovering
      const zoneClass = zone === HMAP_ZONE.THERAPEUTIC ? 'tip-ok'
        : zone === HMAP_ZONE.MARGINAL    ? 'tip-val'
        : (zone === HMAP_ZONE.ABLATIVE || zone === HMAP_ZONE.THERMAL) ? 'tip-warn' : ''
      const outcomeLines = outcomes.map(o => o.text).join('\n')
      const dynamicTip = `<strong>${freqLabel} \u00b7 ${fieldLabel}</strong>\n`
        + `<span class='${zoneClass}'>${zoneLabel}</span>\n`
        + `T ${(Math.min(tDR, 9.99) * 100).toFixed(1)}% \u00b7 H ${(Math.min(hDR, 9.99) * 100).toFixed(1)}% \u00b7 ${hTss.toFixed(1)} ${UNIT.DEG_C}\n`
        + outcomeLines
      const wrapEl = this.$refs.wrap as HTMLElement & { _tipContent?: string }
      wrapEl._tipContent = dynamicTip
      const brTip = document.getElementById('br-tip')
      if (brTip && brTip.classList.contains('br-tip--on')) brTip.innerHTML = dynamicTip
    },

    onCanvasLeave() {
      this.$emit('hover-info-change', null)
      this._resetCanvasTip()
    },

    _resetCanvasTip() {
      const wrapEl = this.$refs.wrap as HTMLElement & { _tipContent?: string }
      if (wrapEl && wrapEl._tipContent !== undefined) {
        wrapEl._tipContent = this.$t('heatmap.tipCanvas') as string
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.hmap__canvas-wrap {
  position: relative;
  width: calc(100% + 1.5rem);
  margin: 0 -0.75rem;
  cursor: crosshair;
  line-height: 0;
}

.hmap__canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
