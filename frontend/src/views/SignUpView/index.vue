<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="signup-page">

    <div class="signup-page__bg" aria-hidden="true">
      <div class="signup-page__bg-grid"></div>
      <canvas ref="hexCanvas"      class="signup-page__bg-hex"></canvas>
      <canvas ref="particleCanvas" class="signup-page__bg-particles"></canvas>
    </div>

    <div class="signup-page__layout">

      <!-- LEFT PANEL -->
      <aside class="signup-page__brand">
        <div class="signup-page__brand-identity">
          <RouterLink to="/" class="signup-page__logo-link">
            <div class="signup-page__logo-img">
              <img src="/logo.png" alt="ResoPulse" />
            </div>
            <div class="signup-page__logo-text">
              <span class="signup-page__logo-name">Reso<span class="signup-page__logo-pulse">Pulse</span></span>
              <span class="signup-page__logo-tag">{{ $t('nav.researchPlatform') }}</span>
            </div>
          </RouterLink>
          <h1 class="signup-page__brand-headline">
            Start modelling<br>
            <span class="signup-page__brand-highlight">your first protocol.</span>
          </h1>
          <p class="signup-page__brand-sub">
            Free access to the full biophysics simulator.
            Invite your lab team and collaborate on protocol design.
          </p>
        </div>

        <ul class="signup-page__steps" aria-label="Getting started steps">
          <li v-for="(step, i) in onboardingSteps" :key="step" class="signup-page__step">
            <span class="signup-page__step-num">{{ i + 1 }}</span>
            <span class="signup-page__step-label">{{ step }}</span>
          </li>
        </ul>

        <p class="signup-page__footnote">
          Kotnik &amp; Miklavcic 2000 · Weaver &amp; Chizmadzhev 1996 · Pennes 1948
        </p>
      </aside>

      <!-- RIGHT PANEL -->
      <div class="signup-page__card-wrap">
        <div class="signup-page__card">
          <div class="signup-page__card-header">
            <span class="signup-page__card-eyebrow">{{ $t('signUp.eyebrow') }}</span>
            <h2 class="signup-page__card-title">{{ $t('signUp.cardTitle') }}</h2>
            <p class="signup-page__card-desc">{{ $t('signUp.cardDesc') }}</p>
          </div>

          <SignUp
            :routing="'path'"
            :path="ROUTE.SIGN_UP"
            :sign-in-url="ROUTE.SIGN_IN"
            :fallback-redirect-url="ROUTE.ONBOARDING"
            :appearance="clerkAppearance"
          />
        </div>

        <div class="signup-page__card-footer">
          <span class="signup-page__card-footer-text">{{ $t('signUp.alreadyHave') }}</span>
          <RouterLink :to="ROUTE.SIGN_IN" class="signup-page__card-footer-link">{{ $t('signUp.signInLink') }}</RouterLink>
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

// ── Particle config ────────────────────────────────────────────────────────
const PARTICLE_COUNT   = 40
const PARTICLE_SPEED   = 0.16
const PARTICLE_RADIUS  = 1.3
const PARTICLE_OPACITY = 0.30
const CONNECTION_DIST  = 110

// ── Hex grid config ────────────────────────────────────────────────────────
const HEX_CIRCUMRADIUS = 22
const HEX_INNER_RATIO  = 0.72
const HEX_OPEN_SPEED   = 0.022
const HEX_FADE_SPEED   = 0.008
const HEX_IDLE_MIN     = 200
const HEX_IDLE_MAX     = 1200
const HEX_GLOW_DUR_MIN = 60
const HEX_GLOW_DUR_MAX = 120

interface Particle { x: number; y: number; vx: number; vy: number }

interface HexCell {
  x:     number
  y:     number
  glow:  number
  state: 'idle' | 'opening' | 'fading'
  timer: number
}

const CLERK_APPEARANCE = {
  baseTheme: dark,
  variables: {
    colorBackground:              '#0d0e1f',
    colorInputBackground:         '#0a0b1a',
    colorInputText:               '#d4cef8',
    colorText:                    '#d4cef8',
    colorTextSecondary:           '#7a72b0',
    colorTextOnPrimaryBackground: '#0d0e1f',
    colorPrimary:                 '#a78bfa',
    colorSuccess:                 '#4ade80',
    colorDanger:                  '#ff4d6d',
    colorNeutral:                 '#2a1f5f',
    colorShimmer:                 'rgba(167,139,250,0.04)',
    borderRadius:                 '8px',
    fontFamily:                   "'Inter', system-ui, sans-serif",
    fontFamilyButtons:            "'Inter', system-ui, sans-serif",
    fontSize:                     '0.875rem',
    spacingUnit:                  '0.9rem',
  },
  elements: {
    rootBox:                      { width: '100%', maxWidth: '100%', minWidth: '0' },
    cardBox:                      { width: '100%', maxWidth: '100%', padding: '0.5rem' },
    card:                         { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem', width: '100%' },
    main:                         { padding: '0 2px' },
    'signUp-start':               { padding: '0 0.25rem' },
    headerTitle:                  { display: 'none' },
    headerSubtitle:               { display: 'none' },
    header:                       { display: 'none' },
    socialButtonsBlockButton:     { border: '1px solid #2a1f5f', background: '#0a0b1a', color: '#d4cef8', borderRadius: '8px', padding: '0.65rem 1rem', transition: 'border-color 0.15s, background 0.15s' },
    socialButtonsBlockButtonText: { fontWeight: '500' },
    dividerLine:                  { background: '#2a1f5f' },
    dividerText:                  { color: '#4a3a7a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
    formFieldLabel:               { color: '#7a72b0', fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'capitalize', paddingLeft: '2px' },
    formFieldInput:               { background: '#0a0b1a', border: '1px solid #2a1f5f', color: '#d4cef8', borderRadius: '8px', caretColor: '#a78bfa' },
    formFieldInputPlaceholder:    { color: '#7a6aaa' },
    formButtonPrimary:            { background: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: '600', borderRadius: '8px', boxShadow: 'none' },
    buttonArrowIcon:              { display: 'none' },
    footerActionLink:             { color: '#a78bfa' },
    footerAction:                 { display: 'none' },
    identityPreviewText:          { color: '#d4cef8' },
    identityPreviewEditButton:    { color: '#a78bfa' },
    alternativeMethodsBlockButton: { border: '1px solid #2a1f5f', background: '#0a0b1a', color: '#d4cef8', borderRadius: '8px' },
    otpCodeFieldInput:            { background: '#0a0b1a', border: '1px solid #2a1f5f', color: '#a78bfa', borderRadius: '8px' },
  },
}

export default defineComponent({
  name: 'SignUpView',
  components: { SignUp },

  setup() {
    const hexCanvas      = ref<HTMLCanvasElement | null>(null)
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    return { hexCanvas, particleCanvas }
  },

  data() {
    return {
      hexFrameId:      null as ReturnType<typeof requestAnimationFrame> | null,
      particleFrameId: null as ReturnType<typeof requestAnimationFrame> | null,
      hexCells:        [] as HexCell[],
      particles:       [] as Particle[],
    }
  },

  computed: {
    ROUTE()           { return ROUTE },
    clerkAppearance() { return CLERK_APPEARANCE },
    onboardingSteps(): string[] {
      return [
        this.$t('signUp.step1'),
        this.$t('signUp.step2'),
        this.$t('signUp.step3'),
        this.$t('signUp.step4'),
      ]
    },
  },

  mounted() {
    this.buildHexGrid()
    this.startHexLoop()
    this.initParticles()
    this.startParticleLoop()
  },

  beforeUnmount() {
    if (this.hexFrameId      !== null) cancelAnimationFrame(this.hexFrameId)
    if (this.particleFrameId !== null) cancelAnimationFrame(this.particleFrameId)
  },

  methods: {

    // ── Hex grid ─────────────────────────────────────────────────────

    buildHexGrid(): void {
      const canvas = this.hexCanvas
      if (!canvas) return
      const w = canvas.width  = canvas.offsetWidth
      const h = canvas.height = canvas.offsetHeight
      const r    = HEX_CIRCUMRADIUS
      const hexH = r * Math.sqrt(3)
      const cols = Math.ceil(w / (r * 1.5)) + 2
      const rows = Math.ceil(h / hexH) + 2

      this.hexCells = markRaw(
        Array.from({ length: cols * rows }, (_, idx) => {
          const col = Math.floor(idx / rows)
          const row = idx % rows
          return {
            x:     col * r * 1.5 - r,
            y:     row * hexH + (col % 2 === 1 ? hexH / 2 : 0) - hexH / 2,
            glow:  0,
            state: 'idle' as const,
            timer: Math.random() * HEX_IDLE_MAX,
          }
        })
      )
    },

    startHexLoop(): void {
      const canvas = this.hexCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
          this.buildHexGrid()
        }
        ctx.clearRect(0, 0, w, h)
        this.drawHexFrame(ctx)
        this.hexFrameId = requestAnimationFrame(tick)
      }

      this.hexFrameId = requestAnimationFrame(tick)
    },

    drawHexFrame(ctx: CanvasRenderingContext2D): void {
      for (const cell of this.hexCells) {
        this.tickCell(cell)
        this.drawCell(ctx, cell)
      }
    },

    /** Advance a single cell's state machine by one frame. */
    tickCell(cell: HexCell): void {
      cell.timer--

      if (cell.state === 'idle' && cell.timer <= 0) {
        cell.state = 'opening'
        cell.glow  = 0
        cell.timer = HEX_GLOW_DUR_MIN + Math.random() * (HEX_GLOW_DUR_MAX - HEX_GLOW_DUR_MIN)
        return
      }
      if (cell.state === 'opening') {
        cell.glow = Math.min(cell.glow + HEX_OPEN_SPEED, 1)
        if (cell.timer <= 0) cell.state = 'fading'
        return
      }
      if (cell.state === 'fading') {
        cell.glow = Math.max(cell.glow - HEX_FADE_SPEED, 0)
        if (cell.glow <= 0) {
          cell.state = 'idle'
          cell.timer = HEX_IDLE_MIN + Math.random() * (HEX_IDLE_MAX - HEX_IDLE_MIN)
        }
      }
    },

    /** Draw one hexagonal cell — border always visible, glow only when active. */
    drawCell(ctx: CanvasRenderingContext2D, cell: HexCell): void {
      const r = HEX_CIRCUMRADIUS
      const g = cell.glow

      // Always-on border — very subtle so grid reads as texture not pattern
      this.traceHex(ctx, cell.x, cell.y, r - 1)
      ctx.strokeStyle = `rgba(167,139,250,${0.030 + g * 0.10})`
      ctx.lineWidth   = 0.7
      ctx.stroke()

      if (g <= 0) return

      // Inner fill
      this.traceHex(ctx, cell.x, cell.y, r * HEX_INNER_RATIO)
      ctx.fillStyle = `rgba(167,139,250,${g * 0.06})`
      ctx.fill()

      // Pore dot — the central electroporation event
      ctx.beginPath()
      ctx.arc(cell.x, cell.y, 2.2 * g, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(210,190,255,${g * 0.70})`
      ctx.fill()

      // Pore glow ring expanding outward
      ctx.beginPath()
      ctx.arc(cell.x, cell.y, r * 0.32 + g * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(167,139,250,${g * 0.18})`
      ctx.lineWidth   = 0.8
      ctx.stroke()
    },

    /**
     * Traces a regular hexagon centred at (cx, cy) with circumradius r.
     * Flat-top orientation (first vertex at -30 degrees).
     */
    traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a  = (Math.PI / 3) * i - Math.PI / 6
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
    },

    // ── Particles ────────────────────────────────────────────────────

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
        this.updateParticles(w, h)
        this.drawParticles(ctx)
        this.particleFrameId = requestAnimationFrame(tick)
      }

      this.particleFrameId = requestAnimationFrame(tick)
    },

    updateParticles(w: number, h: number): void {
      for (const p of this.particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
    },

    drawParticles(ctx: CanvasRenderingContext2D): void {
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i]
          const b = this.particles[j]
          if (!a || !b) continue
          const dx   = a.x - b.x
          const dy   = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(167,139,250,${(1 - dist / CONNECTION_DIST) * 0.12})`
            ctx.lineWidth   = 0.6
            ctx.stroke()
          }
        }
      }
      for (const p of this.particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${PARTICLE_OPACITY})`
        ctx.fill()
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.signup-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;

  /* ── Background ──────────────────────────────────────────────────── */
  &__bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;

    &-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, var(--color-purple) 3%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-purple) 3%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%);
    }

    &-hex {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.65;
      // Vignette so grid fades toward edges, keeping center legible
      mask-image: radial-gradient(ellipse 75% 70% at 50% 50%, black 20%, transparent 100%);
    }

    &-particles {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.7;
    }
  }

  /* ── Layout ──────────────────────────────────────────────────────── */
  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 3rem 2rem 5rem;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 9rem;

    @media (max-width: 900px) {
      flex-direction: column;
      gap: 2.5rem;
      padding: 2rem 1.25rem 4rem;
      align-items: stretch;
    }
  }

  /* ── Left brand panel ────────────────────────────────────────────── */
  &__brand {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;
    padding: 2rem 2.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-purple) 10%, transparent);
    background: color-mix(in srgb, var(--color-surface) 50%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    @media (max-width: 900px) { gap: 1.5rem; padding: 1.5rem; }
  }

  &__brand-identity {
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
    border: 1.5px solid color-mix(in srgb, var(--color-purple) 40%, transparent);
    background: var(--color-bg);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-purple) 20%, transparent);

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
    color: color-mix(in srgb, var(--color-purple) 80%, var(--color-primary-deep));
    -webkit-text-stroke: 0.8px var(--color-purple);
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
    color: var(--color-purple);
    text-shadow: 0 0 12px color-mix(in srgb, var(--color-purple) 40%, transparent);
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
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-left: 0;

    // Vertical connector line threading through all step circles
    &::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 26px;
      bottom: 26px;
      width: 1px;
      background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--color-purple) 35%, transparent),
        color-mix(in srgb, var(--color-purple) 10%, transparent)
      );
      z-index: 0;
    }
  }

  &__step {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 0.55rem 0;
    animation: signup-fade-up 0.5s ease-out both;

    @for $i from 1 through 4 {
      &:nth-child(#{$i}) { animation-delay: #{0.1 + $i * 0.09}s; }
    }

    &-num {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      font-weight: 700;
      color: var(--color-purple);
      background: color-mix(in srgb, var(--color-purple) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
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

  /* ── Footnote ────────────────────────────────────────────────────── */
  &__footnote {
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
    position: relative;
    display: flex;
    flex-direction: column;
    animation: signup-card-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s;

    @media (max-width: 900px) {
      width: 100%;
      max-width: 420px;
      align-self: center;
    }
  }

  &__card {
    flex: 1;
    padding: 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 24px 48px color-mix(in srgb, #000 55%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-purple) 6%, transparent),
      inset 0 1px 0 color-mix(in srgb, var(--color-purple) 8%, transparent);
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
      color: var(--color-purple);
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
      position: absolute;
      bottom: -2.75rem;
      left: 0;
      right: 0;
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
        color: var(--color-purple);
        text-decoration: none;
        font-weight: 600;
        transition: opacity var(--tr-fast);
        &:hover { opacity: var(--op-partial); }
      }
    }
  }
}

/* ── Clerk placeholder override — Clerk injects its own ::placeholder color ── */
:deep(.cl-formFieldInput::placeholder) { color: #7a6aaa; opacity: 1; }


</style>
