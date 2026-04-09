<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="auth-page">

    <!-- ── Background: grid + animated field lines ── -->
    <div class="auth-page__bg" aria-hidden="true">
      <div class="auth-page__bg-grid"></div>
      <canvas ref="particleCanvas" class="auth-page__bg-canvas"></canvas>
    </div>

    <!-- ── Centered layout ── -->
    <div class="auth-page__layout">

      <!-- LEFT PANEL: branding + science copy -->
      <aside class="auth-page__brand">

        <!-- Animated rings -->
        <div class="auth-page__rings" aria-hidden="true">
          <svg class="auth-page__rings-svg" viewBox="0 0 600 600" fill="none">
            <circle class="auth-page__ring auth-page__ring--1" cx="300" cy="300" r="90"  stroke-width="1.2" fill="none"/>
            <circle class="auth-page__ring auth-page__ring--2" cx="300" cy="300" r="150" stroke-width="1"   fill="none"/>
            <circle class="auth-page__ring auth-page__ring--3" cx="300" cy="300" r="215" stroke-width="0.9" fill="none"/>
            <circle class="auth-page__ring auth-page__ring--4" cx="300" cy="300" r="282" stroke-width="0.7" fill="none"/>
            <!-- Cross-hair grid lines at pole angles -->
            <line class="auth-page__field-line" x1="300" y1="40"  x2="300" y2="80"  stroke-width="0.8"/>
            <line class="auth-page__field-line" x1="300" y1="520" x2="300" y2="560" stroke-width="0.8"/>
            <line class="auth-page__field-line" x1="40"  y1="300" x2="80"  y2="300" stroke-width="0.8"/>
            <line class="auth-page__field-line" x1="520" y1="300" x2="560" y2="300" stroke-width="0.8"/>
            <!-- Origin dot -->
            <circle class="auth-page__origin-dot" cx="300" cy="300" r="5" fill="none" stroke-width="1.5"/>
            <!-- Inner cell representation -->
            <circle class="auth-page__cell-outer" cx="300" cy="300" r="52" stroke-width="1.5" fill="none"/>
            <circle class="auth-page__cell-inner" cx="300" cy="300" r="28" stroke-width="1"   fill="none"/>
            <circle class="auth-page__cell-nucleus" cx="300" cy="300" r="10" stroke-width="0.8" fill="none"/>
          </svg>
        </div>

        <!-- Brand identity -->
        <div class="auth-page__brand-identity">
          <RouterLink to="/" class="auth-page__logo-link">
            <img src="/logo.png" alt="ResoPulse" class="auth-page__logo-img" />
            <div class="auth-page__logo-text">
              <span class="auth-page__logo-name">Reso<span class="auth-page__logo-pulse">Pulse</span></span>
              <span class="auth-page__logo-tag">Virtual Cell Lab</span>
            </div>
          </RouterLink>
          <h1 class="auth-page__brand-headline">
            Precision biophysics,<br>
            <span class="auth-page__brand-highlight">in silico.</span>
          </h1>
          <p class="auth-page__brand-sub">
            Model electroporation and acoustic resonance on individual cells.
            Design your protocol before touching the bench.
          </p>
        </div>

        <!-- Feature pills -->
        <ul class="auth-page__features" aria-label="Platform features">
          <li v-for="feat in features" :key="feat.label" class="auth-page__feature">
            <span class="auth-page__feature-icon">{{ feat.icon }}</span>
            <span class="auth-page__feature-label">{{ feat.label }}</span>
          </li>
        </ul>

        <!-- Science footnote -->
        <p class="auth-page__footnote">
          Kotnik &amp; Miklavcic 2000 · Weaver &amp; Chizmadzhev 1996 · Pennes 1948
        </p>

      </aside>

      <!-- RIGHT PANEL: Clerk sign-in card -->
      <div class="auth-page__card-wrap">

        <div class="auth-page__card">
          <!-- Custom header above Clerk form -->
          <div class="auth-page__card-header">
            <span class="auth-page__card-eyebrow">Lab Access</span>
            <h2 class="auth-page__card-title">Sign in to your lab</h2>
            <p class="auth-page__card-desc">Continue your protocol design session</p>
          </div>

          <!-- Clerk SignIn component — fully themed to match ResoPulse UI -->
          <SignIn
            :routing="'path'"
            :path="ROUTE.SIGN_IN"
            :sign-up-url="ROUTE.SIGN_UP"
            :fallback-redirect-url="afterSignInUrl"
            :appearance="clerkAppearance"
          />
        </div>

        <!-- Footer links -->
        <div class="auth-page__card-footer">
          <span class="auth-page__card-footer-text">New to ResoPulse?</span>
          <RouterLink :to="ROUTE.SIGN_UP" class="auth-page__card-footer-link">Create an account</RouterLink>
        </div>

      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { SignIn } from '@clerk/vue'
import { dark } from '@clerk/themes'

import { ROUTE } from '@/constants/routes'

// Particle system constants
const PARTICLE_COUNT   = 55
const PARTICLE_SPEED   = 0.18
const PARTICLE_RADIUS  = 1.4
const PARTICLE_OPACITY = 0.22
const CONNECTION_DIST  = 110

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

export default defineComponent({
  name: 'SignInView',
  components: { SignIn },

  setup() {
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    return { particleCanvas }
  },

  data() {
    return {
      animFrameId: null as ReturnType<typeof requestAnimationFrame> | null,
      particles:   [] as Particle[],

      features: [
        { icon: '⚡', label: 'Schwan EP model — membrane voltage across all frequencies' },
        { icon: '🔬', label: 'Acoustic resonance for bacteria and viruses' },
        { icon: '🤖', label: 'XGBoost AI protocol optimizer' },
        { icon: '📊', label: 'Selectivity ratio, SAR thermal model, DEP crossover' },
        { icon: '🏢', label: 'Multi-lab workspaces with role-based access' },
      ],
    }
  },

  computed: {
    ROUTE() { return ROUTE },

    afterSignInUrl(): string {
      const redirect = this.$route.query.redirect as string | undefined
      return redirect ?? ROUTE.EXPERIMENT
    },

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
          colorShimmer:         'rgba(0,212,255,0.04)',
          borderRadius:         '8px',
          fontFamily:           "'Inter', system-ui, sans-serif",
          fontFamilyButtons:    "'JetBrains Mono', 'Fira Code', monospace",
          fontSize:             '0.875rem',
          spacingUnit:          '0.9rem',
        },
        elements: {
          rootBox:                 { width: '100%' },
          card:                    { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem' },
          headerTitle:             { display: 'none' },
          headerSubtitle:          { display: 'none' },
          header:                  { display: 'none' },
          socialButtonsBlockButton: {
            border:      '1px solid #1e3a5f',
            background:  '#0a1520',
            color:       '#c8d8e8',
            borderRadius: '8px',
            transition:  'border-color 0.15s, background 0.15s',
          },
          socialButtonsBlockButtonText: { fontWeight: '500' },
          dividerLine:             { background: '#1e3a5f' },
          dividerText:             { color: '#3a5a7a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
          formFieldLabel:          { color: '#5a7a9a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" },
          formFieldInput:          { background: '#0a1520', border: '1px solid #1e3a5f', color: '#c8d8e8', borderRadius: '8px' },
          formButtonPrimary:       { background: '#00d4ff', color: '#060e1a', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '700', borderRadius: '8px' },
          footerActionLink:        { color: '#00d4ff' },
          footerAction:            { display: 'none' },
          identityPreviewText:     { color: '#c8d8e8' },
          identityPreviewEditButton: { color: '#00d4ff' },
          alternativeMethodsBlockButton: { border: '1px solid #1e3a5f', background: '#0a1520', color: '#c8d8e8', borderRadius: '8px' },
          otpCodeFieldInput:       { background: '#0a1520', border: '1px solid #1e3a5f', color: '#00d4ff', borderRadius: '8px' },
        },
      }
    },
  },

  mounted() {
    this.initParticles()
    this.startParticleLoop()
  },

  beforeUnmount() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
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
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12
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
  align-items: stretch;

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

  /* ── Layout ──────────────────────────────────────────────────────── */
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

  /* ── Left: Brand panel ───────────────────────────────────────────── */
  &__brand {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;

    @media (max-width: 900px) {
      gap: 1.5rem;
    }
  }

  /* ── Animated rings ──────────────────────────────────────────────── */
  &__rings {
    position: absolute;
    inset: -80px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
    opacity: var(--op-ghost);

    @media (max-width: 900px) {
      display: none;
    }

    &-svg {
      width: 100%;
      height: auto;
      max-width: 520px;
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
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    object-fit: cover;
    transform: scale(1.7);
    box-shadow: var(--glow-sm);
  }

  &__logo-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

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
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    text-shadow: var(--glow-sm);
  }

  &__brand-sub {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.65;
    max-width: 40ch;
  }

  /* ── Feature list ────────────────────────────────────────────────── */
  &__features {
    position: relative;
    z-index: 1;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;

    @media (max-width: 900px) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }
  }

  &__feature {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-surface) 60%, transparent);
    backdrop-filter: blur(4px);
    animation: auth-fade-up 0.5s ease-out both;

    @for $i from 1 through 5 {
      &:nth-child(#{$i}) { animation-delay: #{0.15 + $i * 0.07}s; }
    }

    &-icon {
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-top: 1px;
    }

    &-label {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      line-height: 1.45;
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

    @media (max-width: 900px) { display: none; }
  }

  /* ── Right: Auth card ────────────────────────────────────────────── */
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

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes auth-ring-pulse {
  0%, 100% { opacity: 0.12; }
  50%       { opacity: 0.55; }
}
@keyframes auth-field-blink {
  0%, 100% { opacity: 0.1; }
  50%       { opacity: 0.4; }
}
@keyframes auth-origin-pulse {
  0%, 100% { opacity: 0.3; r: 5; }
  50%       { opacity: 0.9; r: 7; }
}
@keyframes auth-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes auth-card-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
</style>
