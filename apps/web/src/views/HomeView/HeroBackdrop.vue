<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div ref="root" class="hero-backdrop" aria-hidden="true">
    <div class="hero-backdrop__bloom"></div>
    <canvas ref="canvas" class="hero-backdrop__canvas"></canvas>
    <div class="hero-backdrop__vignette"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'

interface Particle { x: number; y: number; vx: number; vy: number; r: number }
interface Bubble   { x: number; y: number; vy: number; r: number }
interface Ring     { x: number; y: number; age: number }

interface AnimState {
  ctx:        CanvasRenderingContext2D | null
  particles:  Particle[]
  bubbles:    Bubble[]
  rings:      Ring[]
  w:          number
  h:          number
  dpr:        number
  lastTs:     number
  ringTimer:  number
  rgb:        string
  rafId:      number
  running:    boolean
}

const LINK_DIST   = 130    // px: connect particles within this distance
const RING_PERIOD = 2.6    // s between cell-division rings
const RING_LIFE   = 2.2    // s a division ring lives
const PARTICLE_DENSITY = 22000   // one particle per this many px²

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
  name: 'HeroBackdrop',
  data() {
    return {
      state: markRaw<AnimState>({
        ctx: null, particles: [], bubbles: [], rings: [],
        w: 0, h: 0, dpr: 1, lastTs: 0, ringTimer: 0, rgb: '0,212,255', rafId: 0, running: false,
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

    if (this.prefersReducedMotion) {
      this.drawStatic()
    } else {
      this.start()
    }
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
      this.initParticles()
      this.initBubbles()
      if (this.prefersReducedMotion) this.drawStatic()
    },

    initParticles() {
      const s = this.state
      const target = Math.max(14, Math.min(60, Math.round((s.w * s.h) / PARTICLE_DENSITY)))
      const list: Particle[] = []
      for (let i = 0; i < target; i++) {
        list.push({
          x: rand(0, s.w),
          y: rand(s.h * 0.08, s.h * 0.92),
          vx: rand(10, 34),                 // varied speeds → near-parallel dots drift past each other
          vy: rand(-4, 4),
          r: rand(1.3, 2.8),
        })
      }
      s.particles = list
    },

    initBubbles() {
      const s = this.state
      const count = Math.max(3, Math.round(s.w / 280))
      const list: Bubble[] = []
      for (let i = 0; i < count; i++) {
        list.push({ x: rand(0, s.w), y: rand(0, s.h), vy: rand(10, 26), r: rand(3, 7) })
      }
      s.bubbles = list
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

    update(dt: number) {
      const s = this.state
      for (const p of s.particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x > s.w + 20) { p.x = -20; p.y = rand(s.h * 0.08, s.h * 0.92); p.vx = rand(10, 34) }
        if (p.y < s.h * 0.05 || p.y > s.h * 0.95) p.vy *= -1
      }
      for (const b of s.bubbles) {
        b.y -= b.vy * dt
        if (b.y < -b.r) { b.y = s.h + b.r; b.x = rand(0, s.w) }
      }
      // Cell-division rings (Module 2 cloning nod): emit from a random particle periodically.
      s.ringTimer += dt
      if (s.ringTimer >= RING_PERIOD && s.particles.length) {
        s.ringTimer = 0
        const p = s.particles[Math.floor(Math.random() * s.particles.length)]!
        s.rings.push({ x: p.x, y: p.y, age: 0 })
      }
      for (const ring of s.rings) ring.age += dt
      s.rings = s.rings.filter(r => r.age < RING_LIFE)
    },

    draw() {
      const s = this.state
      const ctx = s.ctx
      if (!ctx) return
      ctx.clearRect(0, 0, s.w, s.h)

      // Proximity links: fade in as dots approach, out as they separate.
      ctx.lineWidth = 1
      for (let i = 0; i < s.particles.length; i++) {
        const a = s.particles[i]!
        for (let j = i + 1; j < s.particles.length; j++) {
          const b = s.particles[j]!
          const dx = a.x - b.x, dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.45
            ctx.strokeStyle = `rgba(${s.rgb},${alpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Division rings.
      for (const ring of s.rings) {
        const t = ring.age / RING_LIFE
        const radius = 4 + t * 26
        ctx.strokeStyle = `rgba(${s.rgb},${(0.4 * (1 - t)).toFixed(3)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Bubbles (rising rings).
      ctx.lineWidth = 1
      for (const b of s.bubbles) {
        ctx.strokeStyle = `rgba(${s.rgb},0.22)`
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Particles with a soft glow.
      ctx.shadowBlur = 6
      ctx.shadowColor = `rgba(${s.rgb},0.6)`
      ctx.fillStyle = `rgba(${s.rgb},0.85)`
      for (const p of s.particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    },

    drawStatic() {
      // One frame with links but no motion, for reduced-motion users.
      this.draw()
    },
  },
})
</script>

<style lang="scss" scoped>
.hero-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background: var(--color-bg);

  &__bloom {
    position: absolute;
    width: 70%;
    height: 80%;
    top: -10%;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 50%;
    filter: blur(90px);
    background: radial-gradient(circle, color-mix(in srgb, var(--color-primary) 11%, transparent) 0%, transparent 68%);
    opacity: 0.5;
    will-change: transform, opacity;
    animation: hbBreathe 26s ease-in-out infinite;
  }

  &__canvas {
    position: absolute;
    inset: 0;
    display: block;
  }

  &__vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 75% 75% at 50% 42%, transparent 45%, color-mix(in srgb, black 60%, transparent) 100%);
  }
}

@keyframes hbBreathe {
  0%, 100% { transform: translateX(-50%) scale(1);    opacity: 0.4; }
  50%      { transform: translateX(-50%) scale(1.12); opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-backdrop__bloom { animation: none; }
}
</style>
