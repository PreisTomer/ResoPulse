<template>
  <div class="hmap" v-if="store.targetCellCategory === CELL_CATEGORY.MAMMALIAN">
    <AccordionPanel
      :icon="ICON.WAVE"
      :title="$t('heatmap.title')"
      :subtitle="$t('heatmap.subtitle')"
      :initial-open="false"
      :border-on-toggle="true"
    >
    <div class="hmap__body">

      <!-- Canvas wrapper — v-tip content updates dynamically on move -->
      <div class="hmap__canvas-wrap" ref="wrap" v-tip="$t('heatmap.tipCanvas')">
        <canvas
          ref="canvas"
          class="hmap__canvas"
          @click="onCanvasClick"
          @mousemove="onCanvasMove"
          @mouseleave="onCanvasLeave"
        ></canvas>
      </div>

      <!-- Hover readout bar — updates as cursor moves over canvas -->
      <div class="hmap__readout" :class="{ 'hmap__readout--active': !!hoverInfo }">
        <template v-if="hoverInfo">
          <span class="hmap__readout-coord">{{ hoverInfo.freqLabel }}</span>
          <span class="hmap__readout-sep">·</span>
          <span class="hmap__readout-coord">{{ hoverInfo.fieldLabel }}</span>
          <span class="hmap__readout-zone" :style="{ color: hoverInfo.zoneColor }">{{ hoverInfo.zoneLabel }}</span>
          <span class="hmap__readout-dr">T&thinsp;<strong>{{ hoverInfo.tDr }}</strong></span>
          <span class="hmap__readout-dr">H&thinsp;<strong>{{ hoverInfo.hDr }}</strong></span>
          <span class="hmap__readout-temp">{{ hoverInfo.temp }}</span>
          <span
            v-for="o in hoverInfo.outcomes" :key="o.text"
            class="hmap__readout-outcome" :class="`hmap__readout-outcome--${o.level}`"
          >{{ o.text }}</span>
          <span class="hmap__readout-hint">{{ $t('heatmap.clickToSet') }}</span>
        </template>
        <template v-else>
          <span class="hmap__readout-idle">{{ $t('heatmap.hoverToInspect') }}</span>
        </template>
      </div>

      <!-- Legend strip — hover for full zone guide -->
      <div class="hmap__legend" v-tip="$t('heatmap.tipCanvas')">
        <div v-for="(color, zone) in ZONE_COLORS" :key="zone" class="hmap__legend-item">
          <span class="hmap__legend-dot" :style="{ background: color }"></span>
          <span class="hmap__legend-label">{{ $t(`heatmap.zone${ZONE_KEY[zone]}`) }}</span>
        </div>
      </div>

      <!-- Stats row — live values at current operating point -->
      <div class="hmap__stats" v-tip="$t('heatmap.tipStats')">
        <span class="hmap__stats-label">{{ $t('heatmap.statsLabel') }}</span>
        <span class="hmap__stat">
          <span class="hmap__stat-k">{{ $t('heatmap.statTDr') }}</span>
          <span class="hmap__stat-v" :style="{ color: opZoneColor }">{{ tDrPct }}%</span>
        </span>
        <span class="hmap__stat">
          <span class="hmap__stat-k">{{ $t('heatmap.statHDr') }}</span>
          <span class="hmap__stat-v" :class="healthyDrClass">{{ hDrPct }}%</span>
        </span>
        <span class="hmap__stat">
          <span class="hmap__stat-k">{{ $t('heatmap.statTemp') }}</span>
          <span class="hmap__stat-v" :class="tempClass">{{ healthyTssStr }}</span>
        </span>
        <span class="hmap__stat" v-tip="$t('heatmap.tipPLysis')">
          <span class="hmap__stat-k">{{ $t('heatmap.statPLysis') }}</span>
          <span class="hmap__stat-v">{{ pLysisStr }}</span>
        </span>
        <span class="hmap__stat">
          <span class="hmap__stat-k">{{ $t('heatmap.statSel') }}</span>
          <span class="hmap__stat-v" :style="{ color: opZoneColor }">×{{ selStr }}</span>
        </span>
        <span class="hmap__stat" v-tip="$t('heatmap.tipRegime')">
          <span class="hmap__stat-badge hmap__stat-badge--regime" :class="`hmap__stat-badge--${store.freqRegime}`">
            {{ $t(`slider.regime.${store.freqRegime}`) }}
          </span>
        </span>
        <span class="hmap__stat" v-if="showSkinDepth" v-tip="$t('heatmap.tipSkinDepth')">
          <span class="hmap__stat-k">δ</span>
          <span class="hmap__stat-v" :class="skinDepthClass">{{ skinDepthStr }}</span>
        </span>
        <button class="hmap__snap-btn" @click="snapToOptimal" v-tip="$t('heatmap.tipOptLine')">
          {{ $t('heatmap.snapBtn') }}
        </button>
        <span class="hmap__info-btn" v-tip="$t('heatmap.tipCanvas')">ℹ</span>
      </div>

    </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { CHART_MODE, WAVEFORM, CELL_CATEGORY, FREQ_REGIME } from '@/constants/strings'
import {
  HMAP_FREQ_STEPS, HMAP_FIELD_STEPS, HMAP_CANVAS_W, HMAP_CANVAS_H, HMAP_MARGIN,
  HMAP_LYSIS_DR, HMAP_APPROACH_DR, HMAP_WARN_DR, HMAP_THERM_WARN_C, HMAP_THERM_CRIT_C,
  HMAP_ZONE, HMAP_ZONE_COLOR, HMAP_ZONE_KEY, HMAP_ZONE_CSS, type HmapZone,
} from '@/constants/heatmap'
import {
  computeSchwan, computeTau, computeSAR, computeResonantDisruption,
} from '@/utils/physics'
import {
  BODY_TEMP_C, NEWTON_COOLING_LAMBDA, WF_CW, WF_PULSED, MIN_PULSE_ENVELOPE,
} from '@/constants/physics'
import { formatFreqKHz } from '@/utils/format'
import AccordionPanel from '@/components/AccordionPanel.vue'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OutcomeItem { text: string; level: 'ok' | 'warn' | 'danger' | 'info' }

interface HoverInfo {
  freqLabel: string; fieldLabel: string
  zoneLabel: string; zoneColor: string
  tDr: string; hDr: string; temp: string; pLysis: string
  outcomes: OutcomeItem[]
}

// ── Constants exported for template ───────────────────────────────────────────

const ZONE_COLORS = HMAP_ZONE_COLOR as Record<number, string>
const ZONE_KEY    = HMAP_ZONE_KEY    as Record<number, string>

export default defineComponent({
  name: 'TherapeuticHeatmap',
  components: { AccordionPanel },

  setup() {
    return { store: useCellStore(), ICON, UNIT, CHART_MODE, CELL_CATEGORY, ZONE_COLORS, ZONE_KEY }
  },

  data() {
    return {
      ctx:             null as CanvasRenderingContext2D | null,
      grid:            [] as number[],
      hoverInfo:       null as HoverInfo | null,
      redrawTimer:     null as ReturnType<typeof setTimeout> | null,
      resizeObserver:  null as ResizeObserver | null,
      displayW:        HMAP_CANVAS_W,
      displayH:        HMAP_CANVAS_H,
    }
  },

  computed: {
    // ── Axis ranges ────────────────────────────────────────────────────────────

    xMin(): number { return 10 },   // 10 kHz

    xMax(): number {
      const cat = this.store.targetCellCategory
      if (this.store.chartMode === CHART_MODE.RESONANCE) {
        const t = this.store.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) return Math.max(t.resonantFreqGHz * 1e6 * 2.5, 1_000_000)
      }
      if (cat === CELL_CATEGORY.VIRUS)    return 50_000_000   // 50 GHz
      if (cat === CELL_CATEGORY.BACTERIA) return  1_000_000   // 1 GHz
      return 10_000                                            // 10 MHz
    },

    yMax(): number {
      const h = this.store.healthy
      const t = this.store.target
      const healthyLysisDC = h.thresholdVoltage / (1.5 * h.radius * 1e-4)   // V/cm
      let targetLysis = t.thresholdVoltage / (1.5 * t.radius * 1e-4)
      if (this.store.chartMode === CHART_MODE.RESONANCE) {
        const tr = t as { resonantThresholdVcm?: number }
        if (tr.resonantThresholdVcm) targetLysis = tr.resonantThresholdVcm
      }
      return Math.max(healthyLysisDC, targetLysis) * 2.0
    },

    plotW(): number { return this.displayW - HMAP_MARGIN.LEFT - HMAP_MARGIN.RIGHT },
    plotH(): number { return this.displayH - HMAP_MARGIN.TOP  - HMAP_MARGIN.BOTTOM },

    // ── Operating-point stats (from live store getters) ────────────────────────

    tDrPct():       string  { return (Math.min(this.store.targetDisruptionRatio,  9.99) * 100).toFixed(1) },
    hDrPct():       string  { return (Math.min(this.store.healthyDisruptionRatio, 9.99) * 100).toFixed(1) },
    healthyTssStr():string  {
      const T = (this.store as unknown as Record<string, number>)['healthySteadyStateTemp'] as number | undefined
      return T !== undefined ? `${T.toFixed(1)} ${UNIT.DEG_C}` : '—'
    },
    pLysisStr():    string  {
      if (this.store.chartMode === CHART_MODE.RESONANCE) {
        const cat = this.store.targetCellCategory
        if (cat !== CELL_CATEGORY.MAMMALIAN) return '—'
      }
      return `${(this.store.targetLysisProbabilityRandom * 100).toFixed(0)}%`
    },
    selStr():       string  {
      const sel = this.store.selectivityRatio
      return sel >= 99 ? '∞' : sel.toFixed(2)
    },

    opZone(): HmapZone {
      // Recompute zone at current operating point
      return this._zoneAt(this.store.currentBroadcastFrequency, this.store.fieldIntensity)
    },
    opZoneColor(): string { return HMAP_ZONE_CSS[this.opZone] },

    healthyDrClass(): string {
      const dr = this.store.healthyDisruptionRatio
      if (dr >= HMAP_LYSIS_DR) return 'hmap__stat-v--danger'
      if (dr >= HMAP_WARN_DR)  return 'hmap__stat-v--warn'
      return ''
    },

    tempClass(): string {
      const T = (this.store as unknown as Record<string, number>)['healthySteadyStateTemp'] as number | undefined
      if (!T) return ''
      if (T >= HMAP_THERM_CRIT_C) return 'hmap__stat-v--danger'
      if (T >= HMAP_THERM_WARN_C) return 'hmap__stat-v--warn'
      return ''
    },

    showSkinDepth(): boolean {
      return this.store.freqRegime === FREQ_REGIME.NEARFIELD_RF || this.store.freqRegime === FREQ_REGIME.MICROWAVE
    },

    skinDepthStr(): string {
      const d = this.store.skinDepthMm
      if (!isFinite(d)) return '∞'
      return d >= 10 ? `${d.toFixed(0)} ${UNIT.MM}` : `${d.toFixed(1)} ${UNIT.MM}`
    },

    skinDepthClass(): string {
      const d = this.store.skinDepthMm
      if (d >= 20) return 'hmap__stat-v--ok'
      if (d >= 5)  return 'hmap__stat-v--warn'
      return 'hmap__stat-v--danger'
    },

    /** Key string used to trigger full grid recompute when physics inputs change. */
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
      ].join('|')
    },
  },

  watch: {
    /** Full grid recompute when physics inputs change. */
    physicsKey() { this._scheduleRecompute() },
    /** Redraw only for operating-point movement. */
    'store.currentBroadcastFrequency'() { this._renderCanvas() },
    'store.fieldIntensity'()            { this._renderCanvas() },
  },

  mounted() {
    const wrap   = this.$refs.wrap   as HTMLElement
    const canvas = this.$refs.canvas as HTMLCanvasElement

    const setupCanvas = (w: number) => {
      const aspect = HMAP_CANVAS_H / HMAP_CANVAS_W
      const dpr    = window.devicePixelRatio || 1
      this.displayW = w
      this.displayH = Math.round(w * aspect)
      canvas.width  = w * dpr
      canvas.height = this.displayH * dpr
      this.ctx = canvas.getContext('2d')!
      this.ctx.scale(dpr, dpr)
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.max(200, Math.round(entry.contentRect.width))
      setupCanvas(w)
      this._renderCanvas()
    })
    this.resizeObserver.observe(wrap)

    // Initial setup from current width (if already laid out)
    const initialW = wrap.clientWidth > 0 ? wrap.clientWidth : HMAP_CANVAS_W
    setupCanvas(initialW)
    this._recompute()
  },

  beforeUnmount() {
    if (this.redrawTimer) clearTimeout(this.redrawTimer)
    if (this.resizeObserver) this.resizeObserver.disconnect()
  },

  methods: {
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
      const sigma_e = s.sigma_e
      const wf      = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc      = s.dutyCycle
      const pw_ns   = s.pulseWidthNs
      const pulsed  = s.waveform === WAVEFORM.PULSED

      const hTau = computeTau(s.healthy, sigma_e)
      const hPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hVm  = computeSchwan(s.healthy, freqKHz, fieldVcm, sigma_e, 1.0)
      const hDR  = (hVm * hPEF) / s.healthy.thresholdVoltage
      const hSAR = computeSAR(s.healthy, fieldVcm, sigma_e, wf)
      const hTss = BODY_TEMP_C + hSAR * dc / (NEWTON_COOLING_LAMBDA * s.healthy.specificHeatCapacity)

      let tDR = 0
      if (s.chartMode === CHART_MODE.RESONANCE) {
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

      if (hTss >= HMAP_THERM_CRIT_C)  return HMAP_ZONE.THERMAL
      if (hDR  >= HMAP_LYSIS_DR)      return HMAP_ZONE.ABLATIVE
      if (tDR  >= HMAP_LYSIS_DR) {
        if (hDR >= HMAP_WARN_DR || hTss >= HMAP_THERM_WARN_C) return HMAP_ZONE.MARGINAL
        return HMAP_ZONE.THERAPEUTIC
      }
      if (tDR >= HMAP_APPROACH_DR) return HMAP_ZONE.APPROACHING
      return HMAP_ZONE.SUB
    },

    _computeGrid() {
      const s      = this.store
      const sigma_e = s.sigma_e
      const wf     = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc     = s.dutyCycle
      const pw_ns  = s.pulseWidthNs
      const pulsed = s.waveform === WAVEFORM.PULSED
      const isRes  = s.chartMode === CHART_MODE.RESONANCE

      const hTau = computeTau(s.healthy, sigma_e)
      const hPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hCp  = s.healthy.specificHeatCapacity

      const tTau = isRes ? 0 : computeTau(s.target, sigma_e)
      const tPEF = (pulsed && !isRes) ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / tTau)) : 1.0

      const tr = s.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
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
          const hTss = BODY_TEMP_C + hSAR * dc / (NEWTON_COOLING_LAMBDA * hCp)

          let tDR = 0
          if (hasRes) {
            tDR = computeResonantDisruption(tr.resonantFreqGHz!, tr.capsidQ!, tr.resonantThresholdVcm!, freqHz, fieldVcm)
          } else {
            const tVm = computeSchwan(s.target, freqKHz, fieldVcm, sigma_e, 1.0)
            tDR = (tVm * tPEF) / s.target.thresholdVoltage
          }

          if (hTss >= HMAP_THERM_CRIT_C)  { result[fi * HMAP_FIELD_STEPS + vi] = HMAP_ZONE.THERMAL;    continue }
          if (hDR  >= HMAP_LYSIS_DR)      { result[fi * HMAP_FIELD_STEPS + vi] = HMAP_ZONE.ABLATIVE;   continue }
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
      const cw = pw / nF + 0.6   // tiny overlap to prevent canvas gaps
      const ch = ph / nV + 0.6

      ctx.clearRect(0, 0, W, H)

      // Background plot area
      ctx.fillStyle = '#0a0a1a'
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

      // ── Overlay lines ────────────────────────────────────────────────────────

      const s = this.store

      // Optimal frequency — yellow dashed
      const optKhz = s.optimalFreqResult.khz
      if (optKhz >= this.xMin && optKhz <= this.xMax) {
        const ox = this._freqToX(optKhz)
        ctx.save()
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath(); ctx.moveTo(ox, mt); ctx.lineTo(ox, mt + ph); ctx.stroke()
        ctx.restore()
        // Label
        ctx.save()
        ctx.fillStyle = '#fbbf24'
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('opt', ox, mt + 9)
        ctx.restore()
      }

      // f_res — white dashed (resonance mode)
      if (s.chartMode === CHART_MODE.RESONANCE) {
        const tr = s.target as { resonantFreqGHz?: number }
        if (tr.resonantFreqGHz) {
          const resKhz = tr.resonantFreqGHz * 1e6
          if (resKhz >= this.xMin && resKhz <= this.xMax) {
            const rx = this._freqToX(resKhz)
            ctx.save()
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'
            ctx.lineWidth = 1.5
            ctx.setLineDash([4, 3])
            ctx.beginPath(); ctx.moveTo(rx, mt); ctx.lineTo(rx, mt + ph); ctx.stroke()
            ctx.restore()
            ctx.save()
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.font = '9px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('f_res', rx, mt + 9)
            ctx.restore()
          }
        }
      }

      // fc(T) and fc(H) — cyan dotted (Schwan mode)
      if (s.chartMode !== CHART_MODE.RESONANCE) {
        for (const [label, fcKhz] of [['fc(T)', s.targetFc], ['fc(H)', s.healthyFc]] as [string, number][]) {
          if (fcKhz < this.xMin || fcKhz > this.xMax) continue
          const fx = this._freqToX(fcKhz)
          ctx.save()
          ctx.strokeStyle = 'rgba(0,212,255,0.55)'
          ctx.lineWidth = 1
          ctx.setLineDash([2, 3])
          ctx.beginPath(); ctx.moveTo(fx, mt); ctx.lineTo(fx, mt + ph); ctx.stroke()
          ctx.restore()
          ctx.save()
          ctx.fillStyle = 'rgba(0,212,255,0.6)'
          ctx.font = '8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(label, fx, mt + ph + 14)
          ctx.restore()
        }
      }

      // ── Operating point ──────────────────────────────────────────────────────

      const opX = this._freqToX(s.currentBroadcastFrequency)
      const opY = this._fieldToY(s.fieldIntensity)

      // Projection lines (dashed white)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(opX, mt); ctx.lineTo(opX, mt + ph)
      ctx.moveTo(ml, opY); ctx.lineTo(ml + pw, opY)
      ctx.stroke()
      ctx.restore()

      // Crosshair + dot
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(opX - 8, opY); ctx.lineTo(opX + 8, opY)
      ctx.moveTo(opX, opY - 8); ctx.lineTo(opX, opY + 8)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(opX, opY, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Axes ─────────────────────────────────────────────────────────────────

      this._drawAxes(ctx, ml, mt, pw, ph)
    },

    _drawAxes(ctx: CanvasRenderingContext2D, ml: number, mt: number, pw: number, ph: number) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.fillStyle   = 'rgba(255,255,255,0.65)'
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
      ctx.fillStyle    = 'rgba(255,255,255,0.4)'
      ctx.font         = '9px monospace'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('RF Frequency (log)', ml + pw / 2, this.displayH)

      // Y-axis ticks
      ctx.fillStyle    = 'rgba(255,255,255,0.65)'
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
      ctx.fillStyle    = 'rgba(255,255,255,0.4)'
      ctx.font         = '9px monospace'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Field Intensity [V/cm]', 0, 0)
      ctx.restore()

      ctx.restore()
    },

    _yTicks(): number[] {
      const raw = this.yMax / 5
      const mag = Math.pow(10, Math.floor(Math.log10(raw)))
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

    // ── Axis label formatters (canvas-only helpers) ────────────────────────────

    _fmtFreq(khz: number): string {
      if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(0)}G`
      if (khz >= 1_000)     return `${(khz / 1_000).toFixed(0)}M`
      return `${khz.toFixed(0)}k`
    },

    _fmtField(v: number): string {
      if (v === 0) return '0'
      if (v >= 10_000) return `${(v / 1000).toFixed(0)}k`
      if (v >= 1_000)  return `${(v / 1000).toFixed(1)}k`
      return `${v.toFixed(0)}`
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    _scheduleRecompute() {
      if (this.redrawTimer) clearTimeout(this.redrawTimer)
      this.redrawTimer = setTimeout(() => this._recompute(), 250)
    },

    _recompute() {
      this._computeGrid()
      this._renderCanvas()
    },

    // ── Interaction ────────────────────────────────────────────────────────────

    onCanvasClick(e: MouseEvent) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      const rect   = canvas.getBoundingClientRect()
      // Canvas CSS size === displayW/H, so mouse coords are already in drawing space
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      if (cx < HMAP_MARGIN.LEFT || cx > this.displayW - HMAP_MARGIN.RIGHT) return
      if (cy < HMAP_MARGIN.TOP  || cy > this.displayH - HMAP_MARGIN.BOTTOM) return
      const freq  = this._xToFreq(cx)
      const field = this._yToField(cy)
      this.store.setBroadcastFreqKHz(Math.round(freq))
      this.store.setFieldIntensity(Math.round(field))
      broadcastStateSync()
    },

    onCanvasMove(e: MouseEvent) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      const rect   = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      if (cx < HMAP_MARGIN.LEFT || cx > this.displayW - HMAP_MARGIN.RIGHT ||
          cy < HMAP_MARGIN.TOP  || cy > this.displayH - HMAP_MARGIN.BOTTOM) {
        this.hoverInfo = null
        this._resetCanvasTip()
        return
      }

      const freqKHz  = this._xToFreq(cx)
      const fieldVcm = this._yToField(cy)
      const zone     = this._zoneAt(freqKHz, fieldVcm)

      // Compute hover physics
      const s = this.store, sigma_e = s.sigma_e
      const wf = s.waveform === WAVEFORM.PULSED ? WF_PULSED : WF_CW
      const dc = s.dutyCycle, pw_ns = s.pulseWidthNs, pulsed = s.waveform === WAVEFORM.PULSED
      const hTau = computeTau(s.healthy, sigma_e)
      const hPEF = pulsed ? Math.max(MIN_PULSE_ENVELOPE, 1 - Math.exp(-pw_ns * 1e-9 / hTau)) : 1.0
      const hVm  = computeSchwan(s.healthy, freqKHz, fieldVcm, sigma_e, 1.0)
      const hDR  = (hVm * hPEF) / s.healthy.thresholdVoltage
      const hSAR = computeSAR(s.healthy, fieldVcm, sigma_e, wf)
      const hTss = BODY_TEMP_C + hSAR * dc / (NEWTON_COOLING_LAMBDA * s.healthy.specificHeatCapacity)

      let tDR = 0
      if (s.chartMode === CHART_MODE.RESONANCE) {
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

      const pLysis = (s.chartMode !== CHART_MODE.RESONANCE || s.targetCellCategory === CELL_CATEGORY.MAMMALIAN)
        ? `${(Math.max(0, 1 - 1 / Math.max(0.001, tDR)) * 100).toFixed(0)}%`
        : '—'

      // ── Outcome badges ────────────────────────────────────────────────────────
      const outcomes: OutcomeItem[] = []
      if (tDR >= HMAP_LYSIS_DR && hDR < HMAP_LYSIS_DR && hTss < HMAP_THERM_CRIT_C) {
        outcomes.push({ text: '✓ Target lysis', level: 'ok' })
        if (hDR >= HMAP_WARN_DR || hTss >= HMAP_THERM_WARN_C) {
          outcomes.push({ text: '⚠ Healthy stressed', level: 'warn' })
        } else {
          outcomes.push({ text: '✓ Healthy safe', level: 'ok' })
        }
      } else if (hDR >= HMAP_LYSIS_DR) {
        outcomes.push({ text: '⛔ Healthy ablation', level: 'danger' })
        if (tDR >= HMAP_LYSIS_DR) outcomes.push({ text: '⛔ Target lysis', level: 'danger' })
      } else if (hTss >= HMAP_THERM_CRIT_C) {
        outcomes.push({ text: `⛔ Thermal damage (≥${HMAP_THERM_CRIT_C} ${UNIT.DEG_C})`, level: 'danger' })
      } else if (tDR >= HMAP_APPROACH_DR) {
        outcomes.push({ text: '→ Approaching window', level: 'info' })
        outcomes.push({ text: `T-DR ${(tDR * 100).toFixed(0)}% — lysis at ${(HMAP_LYSIS_DR * 100).toFixed(0)}%`, level: 'info' })
      } else {
        outcomes.push({ text: '— Sub-threshold', level: 'info' })
      }
      if (hTss >= HMAP_THERM_WARN_C && hTss < HMAP_THERM_CRIT_C) {
        outcomes.push({ text: `⚠ H-Temp ${hTss.toFixed(1)} ${UNIT.DEG_C} — hyperthermia`, level: 'warn' })
      }

      const freqLabel  = formatFreqKHz(freqKHz, 2)
      const fieldLabel = fieldVcm >= 1000 ? `${(fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}` : `${fieldVcm.toFixed(0)} ${UNIT.V_PER_CM}`
      const zoneLabel  = this.$t(`heatmap.zone${HMAP_ZONE_KEY[zone]}`)

      this.hoverInfo = {
        freqLabel, fieldLabel, zoneLabel,
        zoneColor:  HMAP_ZONE_CSS[zone],
        tDr:        `${(Math.min(tDR, 9.99) * 100).toFixed(1)}%`,
        hDr:        `${(Math.min(hDR, 9.99) * 100).toFixed(1)}%`,
        temp:       `${hTss.toFixed(1)} ${UNIT.DEG_C}`,
        pLysis,
        outcomes,
      }

      // Update v-tip content dynamically so it reflects the hovered zone
      const zoneClass = zone === HMAP_ZONE.THERAPEUTIC ? 'tip-ok'
        : zone === HMAP_ZONE.MARGINAL    ? 'tip-val'
        : (zone === HMAP_ZONE.ABLATIVE || zone === HMAP_ZONE.THERMAL) ? 'tip-warn' : ''
      const outcomeLines = outcomes.map(o => o.text).join('\n')
      const dynamicTip = `<strong>${freqLabel} · ${fieldLabel}</strong>\n`
        + `<span class='${zoneClass}'>${zoneLabel}</span>\n`
        + `T ${(Math.min(tDR, 9.99) * 100).toFixed(1)}% · H ${(Math.min(hDR, 9.99) * 100).toFixed(1)}% · ${hTss.toFixed(1)} ${UNIT.DEG_C}\n`
        + outcomeLines
      const wrapEl = this.$refs.wrap as HTMLElement & { _tipContent?: string }
      wrapEl._tipContent = dynamicTip
      const brTip = document.getElementById('br-tip')
      if (brTip && brTip.classList.contains('br-tip--on')) brTip.innerHTML = dynamicTip
    },

    onCanvasLeave() {
      this.hoverInfo = null
      this._resetCanvasTip()
    },

    _resetCanvasTip() {
      const wrapEl = this.$refs.wrap as HTMLElement & { _tipContent?: string }
      if (wrapEl && wrapEl._tipContent !== undefined) {
        wrapEl._tipContent = this.$t('heatmap.tipCanvas')
      }
    },

    snapToOptimal() {
      const { khz } = this.store.optimalFreqResult
      this.store.setBroadcastFreqKHz(Math.round(Math.max(this.xMin, Math.min(this.xMax, khz))))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.hmap {
  @include surface-card(var(--radius));
  overflow:      hidden;

  &__body {
    display:       flex;
    flex-direction: column;
    gap:           0.75rem;
    padding:       0 0 0.75rem;
  }

  &__canvas-wrap {
    position: relative;
    width:    100%;
    cursor:   crosshair;
    // Height is set dynamically by ResizeObserver via canvas intrinsic size
    line-height: 0;
  }

  &__canvas {
    display: block;
    width:   100%;
    height:  auto;
  }

  /* ── Hover readout bar ─────────────────────────────────────── */
  &__readout {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.2rem 0.75rem;
    padding: 0.28rem 0.65rem;
    min-height: 1.75rem;
    background: rgba(0,0,0,0.18);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    transition: border-color 0.2s;

    &--active { border-color: rgba(255,255,255,0.18); }

    &-coord   { font-weight: 700; color: var(--color-text); }
    &-sep     { color: rgba(255,255,255,0.2); }
    &-zone    { font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    &-dr      { color: var(--color-text-muted); strong { color: var(--color-text); } }
    &-temp    { color: var(--color-text-muted); }
    &-hint    { margin-left: auto; color: rgba(255,255,255,0.18); font-size: 0.5rem; }
    &-idle    { color: rgba(255,255,255,0.2); font-style: italic; }

    &-outcome {
      font-weight: 600;
      &--ok     { color: #4ade80; }
      &--warn   { color: #fbbf24; }
      &--danger { color: #f87171; }
      &--info   { color: var(--color-text-muted); }
    }
  }

  /* ── Legend ────────────────────────────────────────────────── */
  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    padding: 0 0.1rem;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  &__legend-label {
    font-size: 0.64rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* ── Stats row ─────────────────────────────────────────────── */
  &__stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.2rem;
    padding: 0.35rem 0.65rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: default;
  }

  &__stats-label {
    font-size: 0.63rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    flex-shrink: 0;
  }

  &__stat {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }

  &__stat-k {
    font-size: 0.63rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  &__stat-v {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-text);
    transition: color 0.3s;

    &--warn   { color: var(--color-amber); }
    &--danger { color: var(--color-danger); }
    &--ok     { color: var(--color-lime); }
  }

  &__stat-badge {
    font-size: 0.56rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
    border: 1px solid;

    &--regime {
      &--electrolytic { color: var(--color-primary); border-color: rgba(0,212,255,0.35); background: rgba(0,212,255,0.07); }
      &--nearfield_rf { color: var(--color-amber);   border-color: rgba(251,191,36,0.35); background: rgba(251,191,36,0.07); }
      &--microwave    { color: var(--color-danger);  border-color: rgba(255,77,109,0.35); background: rgba(255,77,109,0.07); }
    }
  }

  &__info-btn {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    opacity: 0.55;
    cursor: default;
    flex-shrink: 0;
    transition: opacity 0.15s;

    &:hover { opacity: 1; }
  }

  &__snap-btn {
    margin-left: auto;
    background: rgba(251, 191, 36, 0.10);
    border: 1px solid rgba(251, 191, 36, 0.35);
    border-radius: 3px;
    color: var(--color-amber);
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    padding: 0.18rem 0.55rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;

    &:hover {
      background: rgba(251, 191, 36, 0.20);
      border-color: rgba(251, 191, 36, 0.65);
    }
  }
}
</style>
