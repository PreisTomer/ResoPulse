<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div ref="root" class="flow-backdrop" aria-hidden="true">
    <canvas ref="canvas" class="flow-backdrop__canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'

interface Dot { x: number; y: number; r: number; age: number; life: number }

interface FieldState {
  ctx:        CanvasRenderingContext2D | null
  dots:       Dot[]
  w:          number
  h:          number
  dpr:        number
  lastTs:     number
  time:       number
  spawnTimer: number
  rgb:        string
  rafId:      number
  running:    boolean
}

const CONTOUR_BANDS = 9        // stacked iso-lines spanning the full height
const DRIFT_SPEED   = 0.18     // rad/s the field undulates
const CONTOUR_ALPHA = 0.05     // very faint, text-friendly
const DOT_SPAWN_GAP = 0.45     // s between popped dots
const DOT_LIFE      = 2.6      // s a dot lives (fade in + out)
const DOT_PEAK      = 0.5      // peak dot alpha
const MAX_DOTS      = 20

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '').trim()
  if (m.length === 6) {
    return `${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)}`
  }
  return '0,212,255'
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export default defineComponent({
  name: 'FlowBackdrop',
  data() {
    return {
      state: markRaw<FieldState>({
        ctx: null, dots: [], w: 0, h: 0, dpr: 1, lastTs: 0, time: 0,
        spawnTimer: 0, rgb: '0,212,255', rafId: 0, running: false,
      }),
      observer: null as ResizeObserver | null,
    }
  },
  mounted() {
    const canvas = this.$refs.canvas as HTMLCanvasElement | undefined
    const root = this.$refs.root as HTMLElement | undefined
    if (!canvas || !root) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    this.state.ctx = ctx

    const primary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
    this.state.rgb = hexToRgb(primary)

    this.resize()
    this.observer = markRaw(new ResizeObserver(() => this.resize()))
    this.observer.observe(root)
    document.addEventListener('visibilitychange', this.onVisibility)

    if (this.prefersReducedMotion) this.drawStatic()
    else this.start()
  },
  beforeUnmount() {
    this.stop()
    this.observer?.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
  },
  computed: {
    prefersReducedMotion(): boolean {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
  },
  methods: {
    resize() {
      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined
      const root = this.$refs.root as HTMLElement | undefined
      const s = this.state
      if (!canvas || !root || !s.ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = root.clientWidth
      const h = root.clientHeight
      s.dpr = dpr; s.w = w; s.h = h
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (this.prefersReducedMotion) this.drawStatic()
    },

    start() {
      if (this.state.running) return
      this.state.running = true
      this.state.lastTs = 0
      this.state.rafId = requestAnimationFrame(this.tick)
    },
    stop() {
      this.state.running = false
      if (this.state.rafId) cancelAnimationFrame(this.state.rafId)
      this.state.rafId = 0
    },
    onVisibility() {
      if (this.prefersReducedMotion) return
      if (document.hidden) this.stop()
      else this.start()
    },

    tick(ts: number) {
      const s = this.state
      if (!s.running) return
      const dt = s.lastTs ? Math.min((ts - s.lastTs) / 1000, 0.05) : 0
      s.lastTs = ts
      this.update(dt)
      this.draw()
      s.rafId = requestAnimationFrame(this.tick)
    },

    contourY(band: number, x: number): number {
      const s = this.state
      const baseY = (s.h / (CONTOUR_BANDS + 1)) * (band + 1)
      const amp = 14 + band * 1.5
      const phase = band * 0.7 + s.time * DRIFT_SPEED
      return baseY + Math.sin(x / 130 + phase) * amp + Math.sin(x / 47 + phase * 1.3) * (amp * 0.3)
    },

    update(dt: number) {
      const s = this.state
      s.time += dt
      s.spawnTimer += dt
      if (s.spawnTimer >= DOT_SPAWN_GAP && s.dots.length < MAX_DOTS) {
        s.spawnTimer = 0
        const band = Math.floor(Math.random() * CONTOUR_BANDS)
        const x = rand(0, s.w)
        s.dots.push({ x, y: this.contourY(band, x), r: rand(0.8, 1.8), age: 0, life: DOT_LIFE })
      }
      for (const d of s.dots) d.age += dt
      s.dots = s.dots.filter(d => d.age < d.life)
    },

    draw() {
      const s = this.state
      const ctx = s.ctx
      if (!ctx) return
      ctx.clearRect(0, 0, s.w, s.h)

      // Undulating concentration contours.
      ctx.lineWidth = 1.2
      ctx.strokeStyle = `rgba(${s.rgb},${CONTOUR_ALPHA})`
      for (let b = 0; b < CONTOUR_BANDS; b++) {
        ctx.beginPath()
        for (let x = 0; x <= s.w; x += 16) {
          const y = this.contourY(b, x)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Tiny dots that pop in and out along the lines.
      for (const d of s.dots) {
        const alpha = Math.sin((d.age / d.life) * Math.PI) * DOT_PEAK
        ctx.fillStyle = `rgba(${s.rgb},${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    },

    drawStatic() {
      // One frame with a few mid-life dots, for reduced-motion users.
      const s = this.state
      s.time = 0
      s.dots = []
      for (let i = 0; i < 10; i++) {
        const band = Math.floor(Math.random() * CONTOUR_BANDS)
        const x = rand(0, s.w)
        s.dots.push({ x, y: this.contourY(band, x), r: rand(0.8, 1.8), age: DOT_LIFE / 2, life: DOT_LIFE })
      }
      this.draw()
    },
  },
})
</script>

<style lang="scss" scoped>
.flow-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;

  &__canvas {
    position: absolute;
    inset: 0;
    display: block;
    opacity: 0.85;
  }
}
</style>
