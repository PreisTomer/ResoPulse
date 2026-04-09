<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="auth-page">

    <div class="auth-page__bg" aria-hidden="true">
      <div class="auth-page__bg-grid"></div>
      <canvas ref="particleCanvas" class="auth-page__bg-particles"></canvas>
      <canvas ref="waveCanvas" class="auth-page__bg-canvas"></canvas>
    </div>

    <div class="auth-page__layout">

      <!-- LEFT PANEL -->
      <aside class="auth-page__brand">
        <div class="auth-page__brand-identity">
          <RouterLink to="/" class="auth-page__logo-link">
            <div class="auth-page__logo-img">
              <img src="/logo.png" alt="ResoPulse" />
            </div>
            <div class="auth-page__logo-text">
              <span class="auth-page__logo-name">Reso<span class="auth-page__logo-pulse">Pulse</span></span>
              <span class="auth-page__logo-tag">{{ $t('nav.researchPlatform') }}</span>
            </div>
          </RouterLink>
          <h1 class="auth-page__brand-headline">
            Start modelling<br>
            <span class="auth-page__brand-highlight">your first protocol.</span>
          </h1>
          <p class="auth-page__brand-sub">
            Free access to the full biophysics simulator.
            Invite your lab team and collaborate on protocol design.
          </p>
        </div>

        <ul class="auth-page__steps" aria-label="Getting started steps">
          <li v-for="(step, i) in onboardingSteps" :key="step" class="auth-page__step">
            <span class="auth-page__step-num">{{ i + 1 }}</span>
            <span class="auth-page__step-label">{{ step }}</span>
          </li>
        </ul>

        <p class="auth-page__footnote">
          Kotnik &amp; Miklavcic 2000 · Weaver &amp; Chizmadzhev 1996 · Pennes 1948
        </p>
      </aside>

      <!-- RIGHT PANEL -->
      <div class="auth-page__card-wrap">
        <div class="auth-page__card">
          <div class="auth-page__card-header">
            <span class="auth-page__card-eyebrow">New Account</span>
            <h2 class="auth-page__card-title">Create your lab account</h2>
            <p class="auth-page__card-desc">Set up in under a minute</p>
          </div>

          <SignUp
            :routing="'path'"
            :path="ROUTE.SIGN_UP"
            :sign-in-url="ROUTE.SIGN_IN"
            :fallback-redirect-url="ROUTE.ONBOARDING"
            :appearance="clerkAppearance"
          />
        </div>

        <div class="auth-page__card-footer">
          <span class="auth-page__card-footer-text">Already have an account?</span>
          <RouterLink :to="ROUTE.SIGN_IN" class="auth-page__card-footer-link">Sign in</RouterLink>
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, markRaw } from 'vue'
import { SignUp } from '@clerk/vue'
import { dark } from '@clerk/themes'

import { ROUTE } from '@/constants/routes'

const PARTICLE_COUNT   = 55
const PARTICLE_SPEED   = 0.18
const PARTICLE_RADIUS  = 1.4
const PARTICLE_OPACITY = 0.22
const CONNECTION_DIST  = 110

interface Particle { x: number; y: number; vx: number; vy: number }

// Sine wave config — cyan/primary dominant for the sign-up page
// isPrimary: true → --color-primary (cyan), false → --color-primary-deep (deep cyan)
interface WaveState {
  freq:      number
  amp:       number
  yRatio:    number
  speed:     number
  opacity:   number
  isPrimary: boolean
  phase:     number
}

const WAVE_INIT: Omit<WaveState, 'phase'>[] = [
  { freq: 0.006, amp: 55, yRatio: 0.12, speed: 0.008, opacity: 0.13, isPrimary: true  },
  { freq: 0.011, amp: 32, yRatio: 0.30, speed: 0.013, opacity: 0.10, isPrimary: false },
  { freq: 0.008, amp: 45, yRatio: 0.50, speed: 0.007, opacity: 0.12, isPrimary: true  },
  { freq: 0.014, amp: 24, yRatio: 0.70, speed: 0.016, opacity: 0.09, isPrimary: false },
  { freq: 0.007, amp: 50, yRatio: 0.88, speed: 0.011, opacity: 0.08, isPrimary: true  },
]

export default defineComponent({
  name: 'SignUpView',
  components: { SignUp },

  setup() {
    const waveCanvas     = ref<HTMLCanvasElement | null>(null)
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    return { waveCanvas, particleCanvas }
  },

  data() {
    return {
      animFrameId:         null as ReturnType<typeof requestAnimationFrame> | null,
      particleAnimFrameId: null as ReturnType<typeof requestAnimationFrame> | null,
      particles:           [] as Particle[],
      waves: markRaw(WAVE_INIT.map(w => ({ ...w, phase: Math.random() * Math.PI * 2 }))),
      onboardingSteps: [
        'Create your account with email or Google',
        'Set up your first Lab Workspace',
        'Invite team members with role-based access',
        'Start designing electroporation protocols',
      ],
    }
  },

  computed: {
    ROUTE() { return ROUTE },

    clerkAppearance() {
      return {
        baseTheme: dark,
        variables: {
          colorBackground:      '#0d1826',
          colorInputBackground: '#0a1520',
          colorInputText:       '#c8d8e8',
          colorText:            '#c8d8e8',
          colorTextSecondary:   '#5a7a9a',
          colorTextOnPrimaryBackground: '#060e1a',
          colorPrimary:         '#00d4ff',
          colorSuccess:         '#4ade80',
          colorDanger:          '#ff4d6d',
          colorNeutral:         '#1e3a5f',
          borderRadius:         '8px',
          fontFamily:           "'Inter', system-ui, sans-serif",
          fontFamilyButtons:    "'JetBrains Mono', 'Fira Code', monospace",
          fontSize:             '0.875rem',
        },
        elements: {
          rootBox:                 { width: '100%', maxWidth: '100%', minWidth: '0' },
          cardBox:                 { width: '100%', maxWidth: '100%' },
          card:                    { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem', width: '100%' },
          headerTitle:             { display: 'none' },
          headerSubtitle:          { display: 'none' },
          header:                  { display: 'none' },
          socialButtonsBlockButton: { border: '1px solid #1e3a5f', background: '#0a1520', color: '#c8d8e8', borderRadius: '8px' },
          dividerLine:             { background: '#1e3a5f' },
          dividerText:             { color: '#3a5a7a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
          formFieldLabel:          { color: '#5a7a9a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" },
          formFieldInput:          { background: '#0a1520', border: '1px solid #1e3a5f', color: '#c8d8e8', borderRadius: '8px' },
          formButtonPrimary:       { background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '600', borderRadius: '8px', boxShadow: 'none' },
          buttonArrowIcon:         { display: 'none' },
          footerActionLink:        { color: '#00d4ff' },
          footerAction:            { display: 'none' },
        },
      }
    },
  },

  mounted() {
    this.initParticles()
    this.startParticleLoop()
    this.startWaveLoop()
  },

  beforeUnmount() {
    if (this.animFrameId         !== null) cancelAnimationFrame(this.animFrameId)
    if (this.particleAnimFrameId !== null) cancelAnimationFrame(this.particleAnimFrameId)
  },

  methods: {
    initParticles(): void {
      const canvas = this.particleCanvas
      if (!canvas) return
      const w = canvas.width  = canvas.offsetWidth
      const h = canvas.height = canvas.offsetHeight
      this.particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x:  Math.random() * w,
        y:  Math.random() * h,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
      }))
    },

    startParticleLoop(): void {
      const canvas = this.particleCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
          this.initParticles()
        }
        ctx.clearRect(0, 0, w, h)
        for (const p of this.particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        }
        for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j++) {
            const a = this.particles[i]
            const b = this.particles[j]
            if (!a || !b) continue
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < CONNECTION_DIST) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - dist / CONNECTION_DIST) * 0.10})`
              ctx.lineWidth   = 0.6
              ctx.stroke()
            }
          }
        }
        for (const p of this.particles) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 212, 255, ${PARTICLE_OPACITY})`
          ctx.fill()
        }
        this.particleAnimFrameId = requestAnimationFrame(tick)
      }

      this.particleAnimFrameId = requestAnimationFrame(tick)
    },

    startWaveLoop(): void {
      const canvas = this.waveCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
        }
        ctx.clearRect(0, 0, w, h)
        this.drawWaves(ctx, w, h)
        this.animFrameId = requestAnimationFrame(tick)
      }

      this.animFrameId = requestAnimationFrame(tick)
    },

    drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number): void {
      for (const wave of this.waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = wave.yRatio * h + Math.sin(x * wave.freq + wave.phase) * wave.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        // Both wave variants use primary cyan — varying opacity gives depth
        const rgb = wave.isPrimary ? '0, 212, 255' : '0, 180, 220'
        ctx.strokeStyle = `rgba(${rgb}, ${wave.opacity})`
        ctx.lineWidth   = 1.5
        ctx.stroke()
        wave.phase += wave.speed
      }
    },
  },
})
</script>

<style lang="scss" scoped>
/* ── Reuse the same auth-page layout styles as SignInView ── */
.auth-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: stretch;

  &__bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;

    &-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%);
    }

    &-particles {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.6;
    }

    &-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.7;
      mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
    }
  }

  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    align-items: center;
    gap: 4rem;

    @media (max-width: 900px) {
      flex-direction: column;
      gap: 2.5rem;
      padding: 2rem 1.25rem;
      align-items: stretch;
    }
  }

  &__brand {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;

    @media (max-width: 900px) { gap: 1.5rem; }
  }

  &__brand-identity {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__logo-link {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    text-decoration: none;
    width: fit-content;
  }

  &__logo-img {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    box-shadow: var(--glow-sm);

    img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.7); display: block; }
  }

  &__logo-text  { display: flex; flex-direction: column; gap: 2px; }

  &__logo-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.03em;
    line-height: 1;
  }

  &__logo-pulse {
    color: var(--color-primary-deep);
    -webkit-text-stroke: 0.8px var(--color-primary);
    paint-order: stroke fill;
  }

  &__logo-tag {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.02em;
    text-transform: capitalize;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__brand-headline {
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-heading);
    letter-spacing: -0.02em;
  }

  &__brand-highlight {
    color: var(--color-primary);
    text-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &__brand-sub {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.65;
    max-width: 40ch;
  }

  /* ── Onboarding steps ────────────────────────────────────────────── */
  &__steps {
    position: relative;
    z-index: 1;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    animation: auth-fade-up 0.5s ease-out both;

    @for $i from 1 through 4 {
      &:nth-child(#{$i}) { animation-delay: #{0.1 + $i * 0.09}s; }
    }

    &-num {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      font-weight: 700;
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    &-label {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      line-height: 1.5;
    }
  }

  &__footnote {
    position: relative;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    @media (max-width: 900px) { display: none; }
  }

  /* ── Card ────────────────────────────────────────────────────────── */
  &__card-wrap {
    flex-shrink: 0;
    width: 420px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: auth-card-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s;

    @media (max-width: 900px) {
      width: 100%;
      max-width: 420px;
      align-self: center;
    }
  }

  &__card {
    padding: 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 24px 48px color-mix(in srgb, #000 55%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow: hidden;
    min-width: 0;

    &-header {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    &-eyebrow {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-primary);
      opacity: var(--op-dim);
    }

    &-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: -0.01em;
    }

    &-desc {
      font-size: var(--fs-md);
      color: var(--color-text-muted);
    }

    &-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &-text {
        font-size: var(--fs-sm);
        color: var(--color-text-muted);
        opacity: var(--op-muted);
      }

      &-link {
        font-size: var(--fs-sm);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
        transition: opacity var(--tr-fast);
        &:hover { opacity: var(--op-partial); text-decoration: none; }
      }
    }
  }
}

@keyframes auth-ring-pulse {
  0%, 100% { opacity: 0.12; }
  50%       { opacity: 0.55; }
}
@keyframes auth-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes auth-card-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
</style>
