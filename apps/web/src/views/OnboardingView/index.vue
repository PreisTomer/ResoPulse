<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="onboarding">

    <div class="onboarding__bg" aria-hidden="true">
      <div class="onboarding__bg-grid"></div>
      <canvas ref="waveCanvas"    class="onboarding__bg-canvas"></canvas>
      <canvas ref="particleCanvas" class="onboarding__bg-particles"></canvas>
    </div>

    <div class="onboarding__layout">

      <!-- Brand mark -->
      <RouterLink to="/" class="onboarding__brand">
        <div class="onboarding__brand-img">
          <img src="/logo.png" alt="ResoPulse" />
        </div>
        <div class="onboarding__brand-text">
          <span class="onboarding__brand-name">Reso<span class="onboarding__brand-pulse">Pulse</span></span>
          <span class="onboarding__brand-tag">{{ $t('nav.researchPlatform') }}</span>
        </div>
      </RouterLink>

      <!-- Progress indicator -->
      <div class="onboarding__progress">
        <div class="onboarding__progress-step" :class="{ 'onboarding__progress-step--done': step >= 1, 'onboarding__progress-step--active': step === 1 }">
          <span class="onboarding__progress-num">{{ ICON.CHECK }}</span>
          <span class="onboarding__progress-label">{{ $t('onboarding.stepAccount') }}</span>
        </div>
        <div class="onboarding__progress-connector" :class="{ 'onboarding__progress-connector--done': step >= 2 }"></div>
        <div class="onboarding__progress-step" :class="{ 'onboarding__progress-step--done': step >= 3, 'onboarding__progress-step--active': step === 2 }">
          <span class="onboarding__progress-num">2</span>
          <span class="onboarding__progress-label">{{ $t('onboarding.stepLabSetup') }}</span>
        </div>
        <div class="onboarding__progress-connector" :class="{ 'onboarding__progress-connector--done': step >= 3 }"></div>
        <div class="onboarding__progress-step" :class="{ 'onboarding__progress-step--done': step >= 4, 'onboarding__progress-step--active': step === 3 }">
          <span class="onboarding__progress-num">3</span>
          <span class="onboarding__progress-label">{{ $t('onboarding.stepProtocol') }}</span>
        </div>
        <div class="onboarding__progress-connector" :class="{ 'onboarding__progress-connector--done': step >= 4 }"></div>
        <div class="onboarding__progress-step" :class="{ 'onboarding__progress-step--active': step === 4 }">
          <span class="onboarding__progress-num">4</span>
          <span class="onboarding__progress-label">{{ $t('onboarding.stepSystemReady') }}</span>
        </div>
      </div>

      <!-- Step 2: Create organisation -->
      <div v-if="isCreatingOrg" class="onboarding__card">

        <!-- Full-width EP pulse trace animation — Schwan Vm(f) frequency response sweep -->
        <div class="onboarding__pulse-header" aria-hidden="true">
          <svg viewBox="0 0 460 120" preserveAspectRatio="none" class="onboarding__pulse-svg">
            <!-- Grid lines — horizontal; x-axis at y=85 (lower third) -->
            <line x1="0" y1="85" x2="460" y2="85" class="onboarding__pulse-grid--major" stroke-width="1"/>
            <line x1="0" y1="55" x2="460" y2="55" class="onboarding__pulse-grid--minor" stroke-width="0.5"/>
            <line x1="0" y1="25" x2="460" y2="25" class="onboarding__pulse-grid--minor" stroke-width="0.5"/>
            <!-- Grid lines — vertical (frequency axis divisions) -->
            <line x1="115" y1="0" x2="115" y2="120" class="onboarding__pulse-grid--minor" stroke-width="0.5"/>
            <line x1="230" y1="0" x2="230" y2="120" class="onboarding__pulse-grid--minor" stroke-width="0.5"/>
            <line x1="345" y1="0" x2="345" y2="120" class="onboarding__pulse-grid--minor" stroke-width="0.5"/>
            <!--
              Schwan Vm(f) — morphs between two parameter regimes over 8s:
              Shape 1: high σ_e (saline) — narrow peak near fc ≈ 100 kHz range
              Shape 2: low σ_e (EP buffer) — broader peak shifted right as τ changes
              Both shapes: M + 7×C, identical path structure required for SMIL interpolation
            -->
            <path class="onboarding__pulse-trace onboarding__pulse-trace--vm"
              d="M 0,85 C 20,85 40,85 60,85 C 80,85 86,83 92,79 C 104,66 114,40 134,28 C 154,20 166,22 180,30 C 198,40 210,52 226,62 C 246,70 270,77 300,82 C 334,84 390,85 460,85">
              <animate
                attributeName="d"
                values="M 0,85 C 20,85 40,85 60,85 C 80,85 86,83 92,79 C 104,66 114,40 134,28 C 154,20 166,22 180,30 C 198,40 210,52 226,62 C 246,70 270,77 300,82 C 334,84 390,85 460,85;
                        M 0,85 C 20,85 46,85 82,85 C 114,85 128,83 142,78 C 158,66 178,44 198,34 C 218,27 236,29 252,38 C 268,50 280,62 300,72 C 322,78 358,83 408,85 C 436,85 452,85 460,85;
                        M 0,85 C 20,85 40,85 60,85 C 80,85 86,83 92,79 C 104,66 114,40 134,28 C 154,20 166,22 180,30 C 198,40 210,52 226,62 C 246,70 270,77 300,82 C 334,84 390,85 460,85"
                dur="8s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
            </path>
            <!--
              TI (selectivity ratio H/T) — peaks near target-cell fc; shifts with Vm(f):
              Shape 1: peak at lower f (alongside Vm peak)
              Shape 2: peak shifted right in step with the σ_e change
            -->
            <path class="onboarding__pulse-trace onboarding__pulse-trace--sel"
              d="M 0,85 C 20,85 52,85 72,85 C 92,85 98,84 104,82 C 116,76 128,56 148,46 C 168,40 178,42 194,50 C 210,60 220,68 240,74 C 260,79 280,82 308,84 C 340,85 390,85 460,85">
              <animate
                attributeName="d"
                values="M 0,85 C 20,85 52,85 72,85 C 92,85 98,84 104,82 C 116,76 128,56 148,46 C 168,40 178,42 194,50 C 210,60 220,68 240,74 C 260,79 280,82 308,84 C 340,85 390,85 460,85;
                        M 0,85 C 20,85 56,85 90,85 C 122,85 136,84 150,80 C 166,73 186,54 206,44 C 226,38 244,40 260,48 C 276,58 288,68 308,76 C 330,81 366,84 414,85 C 440,85 454,85 460,85;
                        M 0,85 C 20,85 52,85 72,85 C 92,85 98,84 104,82 C 116,76 128,56 148,46 C 168,40 178,42 194,50 C 210,60 220,68 240,74 C 260,79 280,82 308,84 C 340,85 390,85 460,85"
                dur="8s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
            </path>
            <!-- Frequency cursor — tracks the Vm(f) peak as it shifts with parameter changes -->
            <line class="onboarding__pulse-marker" x1="0" y1="0" x2="0" y2="120">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="134,0; 198,0; 134,0"
                dur="8s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
            </line>
            <!-- Axis labels -->
            <text class="onboarding__pulse-label" x="8" y="18">Vm(f)</text>
            <text class="onboarding__pulse-label onboarding__pulse-label--sel" x="8" y="30">TI</text>
          </svg>
        </div>

        <div class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">{{ $t('onboarding.step2Label') }}</span>
          <h1 class="onboarding__card-title">{{ $t('onboarding.cardTitle') }}</h1>
          <p class="onboarding__card-desc">{{ $t('onboarding.cardDesc') }}</p>
        </div>

        <form class="onboarding__form" @submit.prevent="submitCreateOrg">
          <div class="onboarding__field">
            <label class="onboarding__field-label" for="org-name">{{ $t('onboarding.fieldNameLabel') }}</label>
            <input
              id="org-name"
              v-model="orgName"
              type="text"
              class="onboarding__field-input"
              :class="{ 'onboarding__field-input--error': nameError }"
              placeholder="e.g. Smith Lab, Bioelectrics Group"
              maxlength="64"
              autocomplete="organization"
              @input="nameError = ''"
            />
            <span v-if="nameError" class="onboarding__field-error">{{ nameError }}</span>
          </div>

          <div class="onboarding__field">
            <label class="onboarding__field-label" for="org-slug">{{ $t('onboarding.fieldSlugLabel') }} <span class="onboarding__field-optional">{{ $t('onboarding.fieldOptional') }}</span></label>
            <div class="onboarding__slug-row">
              <span class="onboarding__slug-prefix">resopulse-virtual-lab.com/</span>
              <input
                id="org-slug"
                v-model="orgSlug"
                type="text"
                class="onboarding__field-input onboarding__field-input--slug"
                :class="{ 'onboarding__field-input--error': slugError }"
                placeholder="smith-lab"
                maxlength="48"
                pattern="[a-z0-9\-]+"
                @input="onSlugInput"
              />
            </div>
            <span v-if="slugError" class="onboarding__field-error">{{ slugError }}</span>
          </div>

          <!-- Role callout — integrated into the form flow -->
          <div class="onboarding__role-callout">
            <div class="onboarding__role-callout-left">
              <span class="onboarding__role-badge">{{ ICON.USER }} {{ $t('onboarding.roleOwner') }}</span>
            </div>
            <p class="onboarding__role-callout-desc">{{ $t('onboarding.roleDesc') }}</p>
          </div>

          <button
            type="submit"
            class="onboarding__btn onboarding__btn--primary"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="onboarding__btn-spinner" aria-hidden="true"></span>
            {{ isSubmitting ? $t('onboarding.btnCreating') : $t('onboarding.btnCreate') }}
          </button>

          <p v-if="submitError" class="onboarding__submit-error">{{ submitError }}</p>
        </form>

      </div>

      <!-- Step 3: Read the protocol prompt -->
      <div v-else-if="step === 3" class="onboarding__card onboarding__card--protocol">
        <div class="onboarding__protocol-icon" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none" class="onboarding__success-svg">
            <circle class="onboarding__success-ring--1" cx="100" cy="100" r="40"  stroke-width="1.5" fill="none"/>
            <circle class="onboarding__success-ring--2" cx="100" cy="100" r="65"  stroke-width="1"   fill="none"/>
            <circle class="onboarding__success-ring--3" cx="100" cy="100" r="90"  stroke-width="0.8" fill="none"/>
            <text x="100" y="107" text-anchor="middle" class="onboarding__success-icon">{{ ICON.SECTION }}</text>
          </svg>
        </div>
        <div class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">{{ $t('onboarding.step3Label') }}</span>
          <h1 class="onboarding__card-title">{{ $t('onboarding.protocolTitle') }}</h1>
          <p class="onboarding__card-desc">{{ $t('onboarding.protocolDesc') }}</p>
        </div>
        <div class="onboarding__protocol-features">
          <div v-for="feat in protocolFeatures" :key="feat.key" class="onboarding__protocol-feat">
            <span class="onboarding__protocol-feat-icon">{{ feat.icon }}</span>
            <span class="onboarding__protocol-feat-label">{{ $t(feat.key) }}</span>
          </div>
        </div>
        <div class="onboarding__protocol-actions">
          <RouterLink :to="ROUTE.PROTOCOL" class="onboarding__btn onboarding__btn--primary" @click="finishToProtocol">
            {{ $t('onboarding.btnReadProtocol') }}
          </RouterLink>
          <button class="onboarding__btn onboarding__btn--ghost" @click="finishToLab">
            {{ $t('onboarding.btnSkipToLab') }}
          </button>
        </div>
      </div>

      <!-- Step 4: Done — brief success screen before redirect -->
      <div v-else class="onboarding__card onboarding__card--success">
        <div class="onboarding__success-rings" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none" class="onboarding__success-svg">
            <circle class="onboarding__success-ring--1" cx="100" cy="100" r="40"  stroke-width="1.5" fill="none"/>
            <circle class="onboarding__success-ring--2" cx="100" cy="100" r="65"  stroke-width="1"   fill="none"/>
            <circle class="onboarding__success-ring--3" cx="100" cy="100" r="90"  stroke-width="0.8" fill="none"/>
            <text x="100" y="107" text-anchor="middle" class="onboarding__success-icon">{{ ICON.CHECK }}</text>
          </svg>
        </div>
        <h1 class="onboarding__card-title onboarding__card-title--success">{{ $t('onboarding.successTitle') }}</h1>
        <p class="onboarding__card-desc">{{ $t('onboarding.successRedirect') }}</p>
        <div class="onboarding__redirect-bar">
          <div class="onboarding__redirect-bar-fill"></div>
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, markRaw } from 'vue'
import { useClerk } from '@clerk/vue'

import { ROUTE } from '@/constants/routes'
import { useAuthStore } from '@/stores/authStore'

import { ICON } from '@/constants/icons'

const REDIRECT_DELAY_MS = 2200

// ── Wave config ────────────────────────────────────────────────────────────
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
  { freq: 0.007, amp: 45, yRatio: 0.18, speed: 0.007, opacity: 0.22, isPrimary: true  },
  { freq: 0.012, amp: 30, yRatio: 0.40, speed: 0.011, opacity: 0.16, isPrimary: false },
  { freq: 0.009, amp: 38, yRatio: 0.65, speed: 0.008, opacity: 0.20, isPrimary: true  },
  { freq: 0.015, amp: 22, yRatio: 0.85, speed: 0.014, opacity: 0.14, isPrimary: false },
]

// Purple: rgb(167, 139, 250) matches --color-purple: #a78bfa

// ── Particle config ────────────────────────────────────────────────────────
const PARTICLE_COUNT   = 50
const PARTICLE_SPEED   = 0.18
const PARTICLE_RADIUS  = 1.4
const PARTICLE_OPACITY = 0.45
const CONNECTION_DIST  = 120

interface Particle {
  x: number; y: number; vx: number; vy: number
}

export default defineComponent({
  name: 'OnboardingView',

  setup() {
    const clerk          = useClerk()
    const authStore      = useAuthStore()
    const waveCanvas     = ref<HTMLCanvasElement | null>(null)
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    return { clerk, authStore, waveCanvas, particleCanvas }
  },

  data() {
    return {
      step:             2 as 1 | 2 | 3 | 4,
      waveFrameId:      null as ReturnType<typeof requestAnimationFrame> | null,
      particleFrameId:  null as ReturnType<typeof requestAnimationFrame> | null,
      waves:            markRaw(WAVE_INIT.map(w => ({ ...w, phase: Math.random() * Math.PI * 2 }))),
      particles:        [] as Particle[],
      orgName:          '',
      orgSlug:          '',
      nameError:        '',
      slugError:        '',
      submitError:      '',
      isSubmitting:     false,
      isCreatingOrg:    true,
    }
  },

  computed: {
    ICON()  { return ICON  },
    ROUTE() { return ROUTE },

    protocolFeatures() {
      return [
        { icon: ICON.CHECK, key: 'onboarding.protocolFeat1' },
        { icon: ICON.CHECK, key: 'onboarding.protocolFeat2' },
        { icon: ICON.CHECK, key: 'onboarding.protocolFeat3' },
        { icon: ICON.CHECK, key: 'onboarding.protocolFeat4' },
      ]
    },
  },

  methods: {
    onSlugInput(): void {
      this.slugError = ''
      this.orgSlug = this.orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    },

    validateForm(): boolean {
      let valid = true
      if (!this.orgName.trim()) {
        this.nameError = this.$t('onboarding.errorNameRequired')
        valid = false
      }
      if (this.orgSlug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(this.orgSlug)) {
        this.slugError = this.$t('onboarding.errorSlugFormat')
        valid = false
      }
      return valid
    },

    async submitCreateOrg(): Promise<void> {
      if (!this.validateForm()) return
      this.isSubmitting = true
      this.submitError  = ''
      try {
        if (!this.clerk) throw new Error(this.$t('onboarding.errorNoClerk'))
        const org = await this.clerk.createOrganization({
          name: this.orgName.trim(),
          slug: this.orgSlug || undefined,
        })
        await this.clerk.setActive?.({ organization: org.id })
        this.isCreatingOrg = false
        this.step          = 3
      } catch (err) {
        const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message
        this.submitError = msg ?? this.$t('onboarding.errorGeneric')
      } finally {
        this.isSubmitting = false
      }
    },

    finishToProtocol(): void {
      this.authStore.completeOnboarding()
      // Navigation is handled by the RouterLink — no push needed here.
    },

    finishToLab(): void {
      this.authStore.completeOnboarding()
      this.step = 4
      setTimeout(() => { this.$router.push(ROUTE.EXPERIMENT) }, REDIRECT_DELAY_MS)
    },

    // ── Wave loop ────────────────────────────────────────────────────
    startWaveLoop(): void {
      const canvas = this.waveCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
        ctx.clearRect(0, 0, w, h)
        this.drawWaves(ctx, w, h)
        this.waveFrameId = requestAnimationFrame(tick)
      }
      this.waveFrameId = requestAnimationFrame(tick)
    },

    drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number): void {
      for (const wave of this.waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = wave.yRatio * h + Math.sin(x * wave.freq + wave.phase) * wave.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        const rgb = wave.isPrimary ? '0, 212, 255' : '167, 139, 250'
        ctx.strokeStyle = `rgba(${rgb}, ${wave.opacity})`
        ctx.lineWidth   = 1.5
        ctx.stroke()
        wave.phase += wave.speed
      }
    },

    // ── Particle loop ────────────────────────────────────────────────
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
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; this.initParticles() }
        ctx.clearRect(0, 0, w, h)
        for (const p of this.particles) {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        }
        for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j++) {
            const a = this.particles[i]; const b = this.particles[j]
            if (!a || !b) continue
            const dx = a.x - b.x; const dy = a.y - b.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < CONNECTION_DIST) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - dist / CONNECTION_DIST) * 0.22})`
              ctx.lineWidth = 0.6; ctx.stroke()
            }
          }
        }
        for (const p of this.particles) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 212, 255, ${PARTICLE_OPACITY})`
          ctx.fill()
        }
        this.particleFrameId = requestAnimationFrame(tick)
      }
      this.particleFrameId = requestAnimationFrame(tick)
    },
  },

  mounted() {
    this.startWaveLoop()
    this.initParticles()
    this.startParticleLoop()
  },

  beforeUnmount() {
    if (this.waveFrameId    !== null) cancelAnimationFrame(this.waveFrameId)
    if (this.particleFrameId !== null) cancelAnimationFrame(this.particleFrameId)
  },
})
</script>

<style lang="scss" scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

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
      mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
    }

    &-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.9; // intentional: near-opaque canvas layer
      mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
    }

    &-particles {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  }

  /* ── Layout ──────────────────────────────────────────────────────── */
  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 520px;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
  }

  /* ── Brand mark ──────────────────────────────────────────────────── */
  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    text-decoration: none;
    animation: onboard-fade-in 0.4s ease-out both;
  }

  &__brand-img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    box-shadow: var(--glow-sm);

    img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.7); display: block; }
  }

  &__brand-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__brand-name {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.03em;
    line-height: 1;
  }

  &__brand-pulse {
    color: var(--color-primary-deep);
    -webkit-text-stroke: 0.8px var(--color-primary);
    paint-order: stroke fill;
  }

  &__brand-tag {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.02em;
    text-transform: capitalize;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  /* ── Progress indicator ──────────────────────────────────────────── */
  &__progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: onboard-fade-in 0.4s ease-out both 0.05s;
  }

  &__progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    &--active &-num {
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &--active &-label { color: var(--color-primary); opacity: 1; }

    &--done &-num {
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &--done &-label { color: var(--color-text-muted); opacity: var(--op-dim); }
  }

  &__progress-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--tr-normal), border-color var(--tr-normal), color var(--tr-normal);
  }

  &__progress-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    transition: color var(--tr-normal), opacity var(--tr-normal);
  }

  &__progress-connector {
    width: 48px;
    max-width: 48px;
    flex-shrink: 0;
    height: 1px;
    background: var(--color-border);
    margin-bottom: 20px;
    transition: background var(--tr-slow);

    &--done { background: color-mix(in srgb, var(--color-primary) 40%, transparent); }
  }

  /* ── Card ────────────────────────────────────────────────────────── */
  &__card {
    width: 100%;
    padding: 2.25rem 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-primary-border);
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 24px 48px color-mix(in srgb, #000 55%, transparent);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: onboard-card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.05s;

    &--success {
      align-items: center;
      text-align: center;
      border-color: var(--color-ok-border);
    }

    &-header {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
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
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: -0.015em;

      &--success { color: var(--color-ok); }
    }

    &-desc {
      font-size: var(--fs-md);
      color: var(--color-text-muted);
      line-height: 1.6;
    }
  }

  /* ── Form ────────────────────────────────────────────────────────── */
  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    &-label {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    &-optional {
      text-transform: none;
      letter-spacing: 0;
      opacity: var(--op-ghost);
      font-size: 0.65rem;
    }

    &-input {
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0.65rem 0.85rem;
      font-family: var(--font-sans);
      font-size: var(--fs-lg);
      color: var(--color-text);
      transition: border-color var(--tr-fast), box-shadow var(--tr-fast);
      width: 100%;
      outline: none;

      &::placeholder { color: var(--color-text-muted); opacity: var(--op-muted); }
      &:focus { border-color: var(--color-primary-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 8%, transparent); }
      &--error { border-color: var(--color-danger-border); }
      &--slug { flex: 1; border-left: none; border-radius: 0 var(--radius) var(--radius) 0; padding-left: 0.55rem; }
    }

    &-error {
      font-size: var(--fs-xs);
      color: var(--color-danger-light);
    }
  }

  &__slug-row {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;

    &:focus-within { border-color: var(--color-primary-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 8%, transparent); }
  }

  &__slug-prefix {
    padding: 0.65rem 0.75rem;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    display: flex;
    align-items: center;
  }

  /* ── Role callout ────────────────────────────────────────────────── */
  &__role-callout {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);

    &-left { flex-shrink: 0; padding-top: 1px; }

    &-desc {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      line-height: 1.55;
    }
  }

  &__role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid var(--color-primary-border);
    color: var(--color-primary);
    white-space: nowrap;
  }

  /* ── Submit button ───────────────────────────────────────────────── */
  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: var(--fs-md);
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity var(--tr-fast), box-shadow var(--tr-fast);
    margin-top: 0.25rem;

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 88%, transparent);
      color: var(--color-btn-dark);
      border: 1px solid var(--color-primary);
      &:hover:not(:disabled) {
        background: var(--color-primary);
        box-shadow: var(--glow-md);
      }
      &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
    }

    &-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, var(--color-btn-dark) 30%, transparent);
      border-top-color: var(--color-btn-dark);
      border-radius: 50%;
      animation: onboard-spin 0.7s linear infinite;
    }
  }

  &__submit-error {
    font-size: var(--fs-sm);
    color: var(--color-danger-light);
    text-align: center;
  }

  /* ── Pulse header ────────────────────────────────────────────────── */
  &__pulse-header {
    position: relative;
    width: calc(100% + 4rem);
    margin: -2.25rem -2rem -0.5rem;
    height: 120px;
    overflow: hidden;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: color-mix(in srgb, var(--color-primary) 3%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__pulse-svg {
    width: 100%;
    height: 100%;
  }

  &__pulse-grid {
    &--major { stroke: color-mix(in srgb, var(--color-primary) 9%, transparent); }
    &--minor { stroke: color-mix(in srgb, var(--color-primary) 4%, transparent); }
  }

  &__pulse-trace {
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: onboard-trace-draw 2s cubic-bezier(0.16, 1, 0.3, 1) both;

    &--vm  {
      stroke: var(--color-primary);
      filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-primary) 60%, transparent));
    }

    &--sel {
      stroke: var(--color-purple);
      opacity: 0.6; // intentional: dashed overlay less prominent than main trace
      stroke-dasharray: 4 3;
      animation-delay: 0.3s;
    }
  }

  &__pulse-marker {
    stroke: color-mix(in srgb, var(--color-primary) 60%, transparent);
    stroke-width: 1.2;
    stroke-dasharray: 3 3;
    animation: onboard-marker-blink 2.5s ease-in-out infinite 2s;
  }

  &__pulse-label {
    font-family: var(--font-mono);
    font-size: 8px;
    fill: color-mix(in srgb, var(--color-primary) 70%, transparent);
    letter-spacing: 0.04em;

    &--sel { fill: var(--color-purple); opacity: 0.7; }
  }

  /* ── Success state ───────────────────────────────────────────────── */
  &__success-rings {
    width: 120px;
    height: 120px;
  }

  &__success-svg { width: 100%; height: auto; }

  &__success-ring {
    transform-box: fill-box;
    transform-origin: center;

    &--1 { stroke: var(--color-ok);                                        animation: success-ring 2s ease-in-out infinite; }
    &--2 { stroke: color-mix(in srgb, var(--color-ok) 60%, transparent);   animation: success-ring 2s ease-in-out infinite 0.35s; }
    &--3 { stroke: color-mix(in srgb, var(--color-ok) 35%, transparent);   animation: success-ring 2s ease-in-out infinite 0.7s; }
  }

  &__success-icon {
    font-size: 28px;
    fill: var(--color-ok);
    font-family: var(--font-sans);
  }

  // ── Protocol step ───────────────────────────────────────────────────────
  &__card--protocol {
    gap: 1.5rem;
  }

  &__protocol-icon {
    display: flex;
    justify-content: center;
  }

  &__protocol-features {
    @include flex-col(0.5rem);
    padding: 0.75rem 1rem;
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-primary) 15%, var(--color-border));
    border-radius: var(--radius);
  }

  &__protocol-feat {
    @include flex-row(0.6rem);
    font-size: var(--fs-md);
    color: var(--color-text);
    opacity: var(--op-dim);

    &-icon {
      color: var(--color-primary);
      font-size: var(--fs-sm);
      flex-shrink: 0;
      opacity: 1;
    }
  }

  &__protocol-actions {
    @include flex-col(0.6rem);
  }

  &__redirect-bar {
    width: 100%;
    height: 3px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.5rem;

    &-fill {
      height: 100%;
      background: var(--color-ok);
      border-radius: 2px;
      animation: redirect-fill 2.2s linear forwards;
    }
  }
}

</style>
