<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="auth-page">
    <ContactModal v-if="isContactOpen" @close="isContactOpen = false" />

    <!-- ── Background: grid + animated field lines ── -->
    <div class="auth-page__bg" aria-hidden="true">
      <div class="auth-page__bg-grid"></div>
      <canvas ref="particleCanvas" class="auth-page__bg-canvas"></canvas>
    </div>

    <!-- ── Three-column layout ── -->
    <div class="auth-page__layout">

      <!-- LEFT: headline + features + footnote -->
      <aside class="auth-page__brand">

        <div class="auth-page__brand-identity">
          <h1 class="auth-page__brand-headline">
            Precision biophysics,<br>
            <span class="auth-page__brand-highlight">in silico.</span>
          </h1>
          <p class="auth-page__brand-sub">
            Model electroporation and acoustic resonance on individual cells.
            Design your protocol before touching the bench.
          </p>
        </div>

        <ul class="auth-page__features" aria-label="Platform features">
          <li v-for="(feat, i) in features" :key="feat.label" class="auth-page__feature" v-tip="$t(feat.tipKey)">
            <span class="auth-page__feature-icon">{{ feat.icon }}</span>
            <span class="auth-page__feature-label">{{ feat.label }}</span>
            <span class="auth-page__feature-metric">
              {{ displayMetrics[i] }}<span v-if="feat.unit" class="auth-page__feature-unit"> {{ feat.unit }}</span>
            </span>
          </li>
        </ul>

        <p class="auth-page__footnote">
          Kotnik &amp; Miklavcic 2000 · Weaver &amp; Chizmadzhev 1996 · Pennes 1948
        </p>

      </aside>

      <!-- CENTER: brand identity with rings emanating from it -->
      <div class="auth-page__center" aria-hidden="true">
        <RouterLink to="/" class="auth-page__logo-link" aria-hidden="false">
          <!-- Icon + rings anchored together -->
          <div class="auth-page__logo-icon-wrap">
            <div class="auth-page__rings">
              <svg class="auth-page__rings-svg" viewBox="0 0 600 600" fill="none">
                <circle class="auth-page__ring auth-page__ring--1" cx="300" cy="300" r="90"  stroke-width="1.2" fill="none"/>
                <circle class="auth-page__ring auth-page__ring--2" cx="300" cy="300" r="150" stroke-width="1"   fill="none"/>
                <circle class="auth-page__ring auth-page__ring--3" cx="300" cy="300" r="215" stroke-width="0.9" fill="none"/>
                <circle class="auth-page__ring auth-page__ring--4" cx="300" cy="300" r="282" stroke-width="0.7" fill="none"/>
                <line class="auth-page__field-line" x1="300" y1="40"  x2="300" y2="80"  stroke-width="0.8"/>
                <line class="auth-page__field-line" x1="300" y1="520" x2="300" y2="560" stroke-width="0.8"/>
                <line class="auth-page__field-line" x1="40"  y1="300" x2="80"  y2="300" stroke-width="0.8"/>
                <line class="auth-page__field-line" x1="520" y1="300" x2="560" y2="300" stroke-width="0.8"/>
                <circle class="auth-page__origin-dot" cx="300" cy="300" r="5" fill="none" stroke-width="1.5"/>
                <circle class="auth-page__cell-outer" cx="300" cy="300" r="52" stroke-width="1.5" fill="none"/>
                <circle class="auth-page__cell-inner" cx="300" cy="300" r="28" stroke-width="1"   fill="none"/>
                <circle class="auth-page__cell-nucleus" cx="300" cy="300" r="10" stroke-width="0.8" fill="none"/>
              </svg>
            </div>
            <div class="auth-page__logo-img">
              <img src="/logo.png" alt="ResoPulse" />
            </div>
          </div>
          <div class="auth-page__logo-text">
            <span class="auth-page__logo-name">Reso<span class="auth-page__logo-pulse">Pulse</span></span>
            <span class="auth-page__logo-tag">{{ $t('nav.researchPlatform') }}</span>
          </div>
        </RouterLink>
      </div>

      <!-- RIGHT: Clerk sign-in card -->
      <div class="auth-page__card-wrap">

        <div class="auth-page__card">
          <div class="auth-page__card-header">
            <span class="auth-page__card-eyebrow">{{ $t('signIn.eyebrow') }}</span>
            <h2 class="auth-page__card-title">{{ $t('signIn.cardTitle') }}</h2>
            <p class="auth-page__card-desc">{{ $t('signIn.cardDesc') }}</p>
          </div>

          <SignIn
            :routing="'path'"
            :path="ROUTE.SIGN_IN"
            :sign-up-url="ROUTE.SIGN_UP"
            :fallback-redirect-url="afterSignInUrl"
            :appearance="clerkAppearance"
          />
        </div>

        <div class="auth-page__card-footer">
          <span class="auth-page__card-footer-text">{{ $t('signIn.newTo') }}</span>
          <RouterLink :to="ROUTE.SIGN_UP" class="auth-page__card-footer-link">{{ $t('signIn.createAccount') }}</RouterLink>
        </div>

        <button class="auth-page__contact-btn" @click="isContactOpen = true">{{ $t('nav.contact') }}</button>

      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, markRaw } from 'vue'
import { SignIn } from '@clerk/vue'
import { dark } from '@clerk/themes'

import { ROUTE } from '@/constants/routes'

import { ICON } from '@/constants/icons'

import ContactModal from '@/components/ContactModal.vue'

const PARTICLE_COUNT   = 55
const PARTICLE_SPEED   = 0.18
const PARTICLE_RADIUS  = 1.4
const PARTICLE_OPACITY = 0.45
const CONNECTION_DIST  = 130

interface Particle { x: number; y: number; vx: number; vy: number }

const FEATURES = [
  { icon: ICON.WAVE,        label: 'Schwan EP model',      metric: '1.5',  suffix: ' V',   unit: 'Vm peak',  tipKey: 'signIn.tipSchwan'     },
  { icon: ICON.FLASK,       label: 'Acoustic resonance',   metric: '2.4',  suffix: ' MHz', unit: 'fc',       tipKey: 'signIn.tipResonance'  },
  { icon: ICON.AI,          label: 'AI optimizer',         metric: 'XGB',  suffix: '',     unit: 'XGBoost',  tipKey: 'signIn.tipAI'         },
  { icon: ICON.SELECTIVITY, label: 'Selectivity & DEP',    metric: '3.2',  suffix: '×',    unit: 'TI ratio', tipKey: 'signIn.tipSelectivity' },
  { icon: ICON.PLUG,        label: 'Multi-lab workspaces', metric: 'LIVE', suffix: '',     unit: '',         tipKey: 'signIn.tipWorkspaces' },
]

const CLERK_APPEARANCE = {
  baseTheme: dark,
  variables: {
    colorBackground:      '#0d1826',
    colorInputBackground: '#0a1520',
    colorInputText:       '#c8d8e8',
    colorText:            '#c8d8e8',
    colorTextSecondary:   '#8ab8cc',
    colorTextOnPrimaryBackground: '#060e1a',
    colorPrimary:         '#00d4ff',
    colorSuccess:         '#4ade80',
    colorDanger:          '#ff4d6d',
    colorNeutral:         '#1e3a5f',
    colorShimmer:         'rgba(0,212,255,0.04)',
    borderRadius:         '8px',
    fontFamily:           "'Inter', system-ui, sans-serif",
    fontFamilyButtons:    "'Inter', system-ui, sans-serif",
    fontSize:             '0.875rem',
    spacingUnit:          '0.9rem',
  },
  elements: {
    rootBox:                 { width: '100%', maxWidth: '100%', minWidth: '0' },
    cardBox:                 { width: '100%', maxWidth: '100%', padding: '0.5rem' },
    card:                    { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem', width: '100%' },
    main:                    { padding: '0 2px' },
    'signIn-start':          { padding: '0 0.25rem' },
    headerTitle:             { display: 'none' },
    headerSubtitle:          { display: 'none' },
    header:                  { display: 'none' },
    socialButtonsBlockButton: {
      border:      '1px solid #1e3a5f',
      background:  '#0a1520',
      color:       '#c8d8e8',
      borderRadius: '8px',
      padding:     '0.65rem 1rem',
      transition:  'border-color 0.15s, background 0.15s',
    },
    socialButtonsBlockButtonText: { fontWeight: '500' },
    dividerLine:             { background: '#1e3a5f' },
    dividerText:             { color: '#3a5a7a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
    formFieldLabel:          { color: '#7a9ab8', fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'capitalize', paddingLeft: '2px' },
    formFieldInput:          { background: '#0a1520', border: '1px solid #1e3a5f', color: '#c8d8e8', borderRadius: '8px', caretColor: '#00d4ff' },
    formFieldInputPlaceholder: { color: '#6a9ab8' },
    formButtonPrimary:       { background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: '600', borderRadius: '8px', boxShadow: 'none' },
    buttonArrowIcon:         { display: 'none' },
    footerActionLink:        { color: '#00d4ff' },
    footerAction:            { display: 'none' },
    identityPreviewText:     { color: '#c8d8e8' },
    identityPreviewEditButton: { color: '#00d4ff' },
    alternativeMethodsBlockButton: { border: '1px solid #1e3a5f', background: '#0a1520', color: '#c8d8e8', borderRadius: '8px' },
    otpCodeFieldInput:       { background: '#0a1520', border: '1px solid #1e3a5f', color: '#00d4ff', borderRadius: '8px' },
  },
}

export default defineComponent({
  name: 'SignInView',
  components: { SignIn, ContactModal },

  setup() {
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    return { particleCanvas }
  },

  data() {
    return {
      animFrameId:    null as ReturnType<typeof requestAnimationFrame> | null,
      particles:      [] as Particle[],
      displayMetrics: [] as string[],
      features:       markRaw(FEATURES),
      isContactOpen:  false,
    }
  },

  computed: {
    ROUTE() { return ROUTE },
    clerkAppearance() { return CLERK_APPEARANCE },

    afterSignInUrl(): string {
      const redirect = this.$route.query.redirect as string | undefined
      return redirect ?? ROUTE.HOME
    },
  },

  mounted() {
    this.displayMetrics = this.features.map(() => '0')
    this.initParticles()
    this.startParticleLoop()
    this.animateCounters()
  },

  beforeUnmount() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
  },

  methods: {

    animateCounters(): void {
      this.features.forEach((feat, i) => {
        const target = parseFloat(feat.metric)
        if (isNaN(target)) {
          // Non-numeric (e.g. 'LIVE') — flash in after entry delay
          const delay = (0.3 + (i + 1) * 0.15 + 0.3) * 1000
          setTimeout(() => { this.displayMetrics[i] = feat.metric }, delay)
          return
        }
        const delay    = (0.3 + (i + 1) * 0.15 + 0.25) * 1000
        const duration = 1400
        const decimals = feat.metric.includes('.') ? 1 : 0
        setTimeout(() => {
          const start = performance.now()
          const tick = (now: number) => {
            const t       = Math.min((now - start) / duration, 1)
            const eased   = 1 - Math.pow(1 - t, 3)
            this.displayMetrics[i] = (eased * target).toFixed(decimals) + feat.suffix
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }, delay)
      })
    },

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
        this.animFrameId = requestAnimationFrame(tick)
      }

      this.animFrameId = requestAnimationFrame(tick)
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
      // Draw connection lines between nearby particles
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a    = this.particles[i]
          const b    = this.particles[j]
          if (!a || !b) continue
          const dx   = a.x - b.x
          const dy   = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.22
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
            ctx.lineWidth   = 0.6
            ctx.stroke()
          }
        }
      }

      // Draw particle dots
      for (const p of this.particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 212, 255, ${PARTICLE_OPACITY})`
        ctx.fill()
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.auth-page {
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
        linear-gradient(color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%);
    }

    &-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.6;
    }
  }

  /* ── Layout — three columns ─────────────────────────────────────── */
  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 0;

    @media (max-width: 1000px) {
      flex-direction: column;
      gap: 2.5rem;
      padding: 2rem 1.25rem;
      align-items: stretch;
    }
  }

  /* ── Left: headline + features ──────────────────────────────────── */
  &__brand {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;
    z-index: 1;
    padding-right: 2rem;

    @media (max-width: 1000px) {
      flex: 1;
      gap: 1.5rem;
      padding-right: 0;
    }
  }

  /* ── Center: brand identity + rings ─────────────────────────────── */
  &__center {
    flex-shrink: 0;
    width: 340px;
    display: flex;
    align-items: center;
    justify-content: center;

    @media (max-width: 1000px) {
      display: none;
    }
  }

  /* ── Logo link ───────────────────────────────────────────────────── */
  &__logo-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
  }

  /* ── Icon wrap — rings are anchored to this ──────────────────────── */
  &__logo-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
  }

  /* ── Rings — absolute, centered on the icon ──────────────────────── */
  &__rings {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 560px;
    height: 560px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.6;

    &-svg {
      width: 100%;
      height: 100%;
    }
  }

  &__ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: auth-ring-pulse 4s ease-in-out infinite;

    &--1 { stroke: var(--color-primary);                                         animation-delay: 0s; }
    &--2 { stroke: color-mix(in srgb, var(--color-primary) 75%, transparent);   animation-delay: 0.7s; }
    &--3 { stroke: color-mix(in srgb, var(--color-primary) 50%, transparent);   animation-delay: 1.4s; }
    &--4 { stroke: color-mix(in srgb, var(--color-primary) 28%, transparent);   animation-delay: 2.1s; }
  }

  &__field-line {
    stroke: color-mix(in srgb, var(--color-primary) 40%, transparent);
    animation: auth-field-blink 3.2s ease-in-out infinite;
  }

  &__origin-dot {
    stroke: var(--color-primary);
    animation: auth-origin-pulse 2s ease-in-out infinite;
  }

  &__cell-outer  { stroke: color-mix(in srgb, var(--color-primary) 60%, transparent); animation: auth-ring-pulse 3.5s ease-in-out infinite; }
  &__cell-inner  { stroke: color-mix(in srgb, var(--color-primary) 40%, transparent); animation: auth-ring-pulse 3.5s ease-in-out infinite 0.5s; }
  &__cell-nucleus { stroke: color-mix(in srgb, var(--color-accent) 55%, transparent); animation: auth-ring-pulse 3s ease-in-out infinite 0.25s; }

  /* ── Brand identity ──────────────────────────────────────────────── */
  &__brand-identity {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__logo-img {
    position: relative;
    z-index: 1;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid var(--color-primary-border);
    background: var(--color-bg);
    box-shadow: var(--glow-sm);

    img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.7); display: block; }
  }

  &__logo-text {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  &__logo-name {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.18em;
    line-height: 1;
    text-align: center;
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
    text-align: center;
    white-space: nowrap;
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
    text-shadow: var(--glow-sm);
  }

  &__brand-sub {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.65;
    max-width: 40ch;
  }

  /* ── Feature strips ─────────────────────────────────────────────── */
  &__features {
    position: relative;
    z-index: 1;
    list-style: none;
    @include flex-col(0.4rem);
    max-width: 380px;

    @media (max-width: 900px) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
      max-width: 100%;
    }
    @media (max-width: 500px) { grid-template-columns: 1fr; }
  }

  &__feature {
    position: relative;
    @include flex-row(0.5rem);
    padding: 0.45rem 0.7rem 0.45rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-surface) 55%, transparent);
    backdrop-filter: blur(4px);
    overflow: hidden;
    animation: feat-enter 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
    transition: border-color var(--tr-fast), background var(--tr-fast), box-shadow var(--tr-fast);

    @for $i from 1 through 5 {
      &:nth-child(#{$i}) {
        animation-delay: #{0.3 + $i * 0.15}s;
        &::before { animation-delay: #{0.3 + $i * 0.15 + 0.1}s; }
        &::after  { animation-delay: #{0.3 + $i * 0.15 + 0.2}s; }
      }
    }

    &::before {
      content: '';
      position: absolute;
      left: 0; bottom: 0;
      width: 2px; height: 0;
      background: var(--color-primary);
      animation: feat-bar 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    &::after {
      content: '';
      position: absolute;
      top: 0; left: -70%;
      width: 55%; height: 100%;
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent);
      animation: feat-scan-loop 7s ease-out infinite backwards;
      pointer-events: none;
    }

    cursor: help;

    &-icon {
      font-size: var(--fs-sm);
      color: var(--color-primary);
      opacity: var(--op-muted);
      flex-shrink: 0;
    }

    &-label {
      font-size: var(--fs-sm);
      color: var(--color-text);
      opacity: var(--op-strong);
      flex: 1;
      line-height: 1;
    }

    &-metric {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
      gap: 0.1rem;
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--color-primary);
      opacity: var(--op-dim);
      letter-spacing: 0.04em;
      white-space: nowrap;
      transition: opacity var(--tr-fast);
    }

    &-unit {
      font-size: 0.5rem;
      color: var(--color-text-muted);
      opacity: var(--op-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1;
    }
  }

  /* ── Science footnote ────────────────────────────────────────────── */
  &__footnote {
    position: relative;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    margin-top: auto;

    @media (max-width: 900px) { display: none; }
  }

  &__contact-btn {
    display: block;
    align-self: center;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--color-primary);
    background: var(--color-primary-surface);
    border: 1px solid var(--color-primary-border);
    border-radius: var(--radius);
    padding: 0.45rem 1.25rem;
    cursor: pointer;
    transition: background var(--tr-fast), box-shadow var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: var(--color-primary-dim);
      border-color: var(--color-primary);
      box-shadow: var(--glow-sm);
    }
  }

  /* ── Right: Auth card ────────────────────────────────────────────── */
  &__card-wrap {
    flex-shrink: 0;
    width: 422px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
    z-index: 1;
    padding-left: 2rem;
    animation: auth-card-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s;

    @media (max-width: 1000px) {
      padding-left: 0;
    }

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
    border: 1px solid var(--color-primary-border);
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 24px 48px color-mix(in srgb, #000 55%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-primary) 6%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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
        font-size: var(--fs-lg);
        color: var(--color-text-muted);
        opacity: var(--op-muted);
      }

      &-link {
        font-size: var(--fs-lg);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
        transition: opacity var(--tr-fast);

        &:hover { opacity: var(--op-partial); text-decoration: none; }
      }
    }
  }
}

/* ── Clerk placeholder override — Clerk injects its own ::placeholder color ── */
:deep(.cl-formFieldInput::placeholder) { color: #6a9ab8; opacity: 1; }

</style>
