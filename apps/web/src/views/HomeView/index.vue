<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="home">
    <div class="home__bg-grid" aria-hidden="true"></div>
    <canvas ref="particleCanvas" class="home__bg-particles" aria-hidden="true"></canvas>
    <canvas ref="hexCanvas" class="home__bg-hex" aria-hidden="true"></canvas>

    <!-- ── Fixed validation tab — visible on wide screens only ── -->
    <RouterLink :to="{ path: ROUTE.PROTOCOL, hash: '#validation' }" class="home__validate-tab" :aria-label="$t('home.validateTabLine1')">
      <span class="home__validate-tab-top">
        <span class="home__validate-tab-check">{{ ICON.CHECK }}</span>
        <span class="home__validate-tab-title">{{ $t('home.validateTabLine1') }}</span>
      </span>
      <span class="home__validate-tab-sub">{{ $t('home.validateTabLine2') }}</span>
    </RouterLink>


    <!-- Pulse rings — moved outside home__inner so they can span full viewport width -->
    <HeroRingsSvg />

    <div class="home__inner">

      <!-- ── Zone 1: Hero — full viewport, staggered CSS entrance ── -->
      <div class="home__zone home__zone--hero">

        <div class="home__hero-brand">
          <div class="home__title-lockup">
            <h1 class="home__title">
              <span>Reso</span>
              <span class="home__logo-inline" aria-hidden="true"><img src="/logo.png" alt="" /></span>
              <span class="home__title-accent">Pulse</span>
            </h1>
          </div>
          <div class="home__subtitle">{{ $t('home.subtitle') }}</div>
        </div>

        <div class="home__hero-pitch">
          <div class="home__eyebrow">
            <template v-for="(item, i) in eyebrowItems" :key="item">
              <span class="home__eyebrow-item">{{ item }}</span>
              <span v-if="i < eyebrowItems.length - 1" class="home__eyebrow-sep" aria-hidden="true">•</span>
            </template>
          </div>
          <div class="home__eyebrow home__eyebrow--physics">
            <template v-for="(item, i) in eyebrowPhysics" :key="item">
              <span class="home__eyebrow-item home__eyebrow-item--physics">{{ item }}</span>
              <span v-if="i < eyebrowPhysics.length - 1" class="home__eyebrow-sep" aria-hidden="true">•</span>
            </template>
          </div>
          <div class="home__tagline-group">
            <p class="home__tagline">{{ $t('home.tagline1a') }}<strong class="home__tagline-highlight">{{ $t('home.tagline1Highlight') }}</strong>{{ $t('home.tagline1b') }}</p>
            <p class="home__tagline home__tagline--secondary">{{ $t('home.tagline2') }}</p>
          </div>
        </div>

        <div class="home__hero-cta">
          <div class="home__actions">

            <!-- Tier 1: Signed-in shortcut -->
            <RouterLink v-if="isSignedIn" :to="ROUTE.EXPERIMENT" class="home__btn home__btn--primary">
              {{ $t('home.btnPrimary') }}
              <span class="home__btn-arrow" aria-hidden="true">
                <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </span>
            </RouterLink>

            <!-- Tier 1: Guest dominant CTA (full-width) -->
            <RouterLink v-if="!isSignedIn" :to="ROUTE.EXPERIMENT" class="home__btn home__btn--try">
              {{ $t('home.btnTryGuest') }}
              <span class="home__btn-arrow" aria-hidden="true">
                <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </span>
            </RouterLink>

            <!-- Tier 2: Account CTAs (half-width each) -->
            <div v-if="!isSignedIn" class="home__actions-row">
              <RouterLink :to="ROUTE.SIGN_UP" class="home__btn home__btn--primary">
                {{ $t('home.btnStartFree') }}
                <span class="home__btn-arrow" aria-hidden="true">
                  <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  </svg>
                </span>
              </RouterLink>
              <RouterLink :to="ROUTE.SIGN_IN" class="home__btn home__btn--signin">
                {{ $t('nav.signIn') }}
                <span class="home__btn-arrow" aria-hidden="true">
                  <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  </svg>
                </span>
              </RouterLink>
            </div>

            <!-- Tier 3: Passive navigation links -->
            <div class="home__text-links">
              <RouterLink :to="ROUTE.PRICING" class="home__text-link home__text-link--pricing">
                {{ $t('home.btnViewPricing') }}
              </RouterLink>
              <span class="home__text-link-sep" aria-hidden="true">·</span>
              <RouterLink :to="ROUTE.PROTOCOL" class="home__text-link">
                {{ $t('home.btnGhost') }}
              </RouterLink>
            </div>

          </div>
          <p class="home__cta-refs">{{ $t('home.ctaRefs1') }}<br>{{ $t('home.ctaRefs2') }}</p>
        </div>

      </div>

      <!-- ── Zone 1.5: Closed-Loop Digital Twin ─────────────────────────── -->
      <div class="home__zone home__zone--loop home__zone--anim">
        <ClosedLoopDiagram />
      </div>

      <!-- ── Zone 2: Science — scroll-reveal physics illustrations ── -->
      <div class="home__zone home__zone--science home__zone--anim">

        <!-- Physics illustration strip (hidden on small screens) -->
        <div class="home__science-strip">

          <RouterLink :to="isSignedIn ? ROUTE.EXPERIMENT : ROUTE.SIGN_UP" class="home__sci-panel" v-tip="$t('home.tipSciCell')">
            <div class="home__sci-meta">
              <span class="home__sci-meta-id">{{ $t('home.sciCellMetaId') }}</span>
              <span class="home__sci-meta-status">{{ $t('home.sciCellMetaStatus') }}</span>
            </div>
            <p class="home__sci-label">{{ $t('home.sciCellLabel') }}</p>
            <div class="home__sci-svg-box">
              <CellIllustrationSvg />
            </div>
            <p class="home__sci-sublabel">{{ $t('home.sciCellSub') }}</p>
            <span class="home__sci-cta">{{ $t('home.sciCta') }}</span>
          </RouterLink>

          <div class="home__sci-divider" aria-hidden="true"></div>

          <RouterLink :to="isSignedIn ? ROUTE.EXPERIMENT : ROUTE.SIGN_UP" class="home__sci-panel" v-tip="$t('home.tipSciChart')">
            <div class="home__sci-meta">
              <span class="home__sci-meta-id">{{ $t('home.sciChartMetaId') }}</span>
              <span class="home__sci-meta-status">{{ $t('home.sciChartMetaStatus') }}</span>
            </div>
            <p class="home__sci-label">{{ $t('home.sciChartLabel') }}</p>
            <div class="home__sci-svg-box">
              <BodePlotSvg />
            </div>
            <p class="home__sci-sublabel">{{ $t('home.sciChartSub') }}</p>
            <span class="home__sci-cta">{{ $t('home.sciCta') }}</span>
          </RouterLink>

        </div>

      </div>

      <!-- ── Zone 3: Features — scroll-reveal workflow and cards ── -->
      <div class="home__zone home__zone--features home__zone--anim">

        <!-- Oscilloscope background: two waveforms scroll edge to edge, medium+ screens -->
        <OscilloscopeSvg />

        <div class="home__workflow">
          <template v-for="(step, i) in workflowSteps" :key="step">
            <div class="home__wf-step">
              <span class="home__wf-num">{{ $t(`home.${step}Num`) }}</span>
              <span class="home__wf-label">{{ $t(`home.${step}Label`) }}</span>
              <span class="home__wf-desc">{{ $t(`home.${step}Desc`) }}</span>
            </div>
            <span v-if="i < workflowSteps.length - 1" class="home__wf-arrow" aria-hidden="true">{{ ICON.ARROW_R }}</span>
          </template>
        </div>

        <div class="home__feature-cards">

          <RouterLink
            v-for="(card, i) in resolvedFeatureCards"
            :key="card.titleKey"
            :to="card.to"
            class="home__feature-card"
            :class="{ 'home__feature-card--primary': card.primary }"
            :style="{ '--card-i': i }"
          >
            <div class="home__fc-header">
              <span class="home__fc-icon-wrap">
                <span class="home__fc-icon">{{ card.icon }}</span>
              </span>
              <div class="home__fc-header-right">
                <span class="home__fc-title">{{ $t(`home.${card.titleKey}`) }}</span>
                <span class="home__fc-tag">{{ $t(`home.${card.tagKey}`) }}</span>
              </div>
              <span v-if="card.plan === 'free'" class="home__fc-plan-badge home__fc-plan-badge--free">{{ $t('home.planFree') }}</span>
              <span v-else-if="card.plan === 'pro'" class="home__fc-plan-badge home__fc-plan-badge--pro">{{ $t('home.planPro') }}</span>
            </div>
            <span class="home__fc-desc">{{ $t(`home.${card.descKey}`) }}</span>
          </RouterLink>

          <!-- Selectivity preview — animated sweep shows the platform's core value visually -->
          <RouterLink
            :to="isSignedIn ? ROUTE.EXPERIMENT : ROUTE.SIGN_UP"
            class="home__feature-card home__feature-card--sel"
            :class="{
              'home__feature-card--sel-win': selInWindow,
              'home__feature-card--sel-hot': selIsHot && !selInWindow,
            }"
            :style="{ '--card-i': featureCards.length }"
          >
            <div class="home__fc-header">
              <span class="home__fc-icon-wrap">
                <span class="home__fc-icon">{{ ICON.SELECTIVITY }}</span>
              </span>
              <span class="home__fc-title">{{ $t('home.selTitle') }}</span>
            </div>

            <!-- E-field sweep slider with window zone indicator -->
            <div class="home__sel-slider">
              <span class="home__sel-slider-label">{{ $t('home.selSliderLabel') }}</span>
              <div class="home__sel-slider-track">
                <div class="home__sel-window-zone"></div>
                <div
                  class="home__sel-slider-thumb"
                  :class="{
                    'home__sel-slider-thumb--win': selInWindow,
                    'home__sel-slider-thumb--hot': selIsHot && !selInWindow,
                  }"
                  :style="{ left: selSliderPct + '%' }"
                ></div>
              </div>
              <span
                class="home__sel-slider-val"
                :class="{ 'home__sel-slider-val--win': selInWindow, 'home__sel-slider-val--hot': selIsHot && !selInWindow }"
              >{{ selStateLabel }}</span>
            </div>

            <div class="home__sel-bars">
              <div class="home__sel-bar">
                <span class="home__sel-bar-label">{{ $t('home.selTargetLabel') }}</span>
                <div class="home__sel-bar-track">
                  <div class="home__sel-bar-fill home__sel-bar-fill--target" :style="{ width: selTargetPct + '%' }"></div>
                </div>
                <span class="home__sel-bar-pct home__sel-bar-pct--target">{{ selTargetPct }}%</span>
              </div>
              <div class="home__sel-bar">
                <span class="home__sel-bar-label">{{ $t('home.selHealthyLabel') }}</span>
                <div class="home__sel-bar-track">
                  <div class="home__sel-bar-fill home__sel-bar-fill--healthy" :style="{ width: selHealthyPct + '%' }"></div>
                </div>
                <span class="home__sel-bar-pct home__sel-bar-pct--healthy">{{ selHealthyPct }}%</span>
              </div>
            </div>
            <div class="home__sel-footer">
              <span class="home__sel-ti">{{ selTiDisplay }}</span>
              <span class="home__sel-cta">{{ $t('home.selCta') }} {{ ICON.ARROW_R }}</span>
            </div>
          </RouterLink>

        </div>

      </div>

      <!-- ── Zone 4: Validate — inline on mobile only; desktop uses the fixed side tab ── -->
      <div class="home__zone home__zone--validate home__zone--validate--mobile home__zone--anim">
        <div class="home__validate-gate">
          <span class="home__validate-gate-icon">{{ ICON.CHECK }}</span>
          <h3 class="home__validate-gate-title">{{ $t('home.validateTabLine2') }}</h3>
          <p class="home__validate-gate-sub">{{ $t('home.validateGateSub') }}</p>
          <RouterLink :to="{ path: ROUTE.PROTOCOL, hash: '#validation' }" class="home__btn home__btn--primary home__validate-gate-btn">
            {{ $t('home.validateTabLine1') }} {{ ICON.ARROW_R }}
          </RouterLink>
        </div>
      </div>

      <!-- ── Zone 5: Bottom — static, no animation ── -->
      <div class="home__zone home__zone--bottom">

        <div class="home__scope-tags">
          <div
            v-for="tag in scopeTags"
            :key="tag.mod"
            class="home__scope-tag"
            :class="`home__scope-tag--${tag.mod}`"
          >
            <span class="home__scope-tag-name">{{ $t(`home.${tag.key}`) }}</span>
            <span class="home__scope-tag-sub">{{ $t(`home.${tag.subKey}`) }}</span>
          </div>
        </div>

        <p class="home__disclaimer">{{ $t('home.disclaimer') }}</p>

      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'
import { mapStores } from 'pinia'

import { useAuthStore } from '@/stores/authStore'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import HeroRingsSvg from './HeroRingsSvg.vue'
import CellIllustrationSvg from './CellIllustrationSvg.vue'
import BodePlotSvg from './BodePlotSvg.vue'
import OscilloscopeSvg from './OscilloscopeSvg.vue'
import ClosedLoopDiagram from './ClosedLoopDiagram.vue'

const SEL_CYCLE_MS      = 9000
const PARTICLE_COUNT    = 65
const PARTICLE_SPEED    = 0.16
const PARTICLE_RADIUS   = 1.3
const PARTICLE_OPACITY  = 0.38
const CONNECTION_DIST   = 138

// 20% NODE particles (larger + halo) are target cells; the rest represent background cells/ions.
const NODE_FRACTION       = 0.20
const NODE_RADIUS         = 2.4

// Mouse repulsion: hovering applies a virtual E-field pulse that disperses nearby particles.
const MOUSE_REPEL_DIST    = 175
const MOUSE_REPEL_FORCE   = 0.30
const MAX_PARTICLE_SPEED  = PARTICLE_SPEED * 4.5

// Energized connection: particles within ENERGIZE_DIST model high local field → high Vm.
const ENERGIZE_DIST       = 46

// Pre-squared thresholds avoid Math.sqrt in the hot O(n²) pair loop.
const CONNECTION_DIST_SQ  = CONNECTION_DIST * CONNECTION_DIST
const MOUSE_REPEL_DIST_SQ = MOUSE_REPEL_DIST * MOUSE_REPEL_DIST
const ENERGIZE_DIST_SQ    = ENERGIZE_DIST * ENERGIZE_DIST

// EP pulse wave: a brightness ring propagates outward from the hero centre every ~6s,
// metaphor for a delivered electroporation pulse.
const WAVE_PERIOD_MS      = 6200
const WAVE_TRAVEL_MS      = 2500
const WAVE_WIDTH_PX       = 68

const HEX_RADIUS        = 26
const HEX_OPEN_SPEED    = 0.010
const HEX_FADE_SPEED    = 0.003
const HEX_IDLE_MAX      = 3200
const HEX_BORDER_ALPHA  = 0.012

interface Particle {
  x: number; y: number; vx: number; vy: number
  isNode: boolean       // true = target/mammalian cell (larger, brighter)
  pulsePhase: number    // individual membrane oscillation phase [0, 2π]
  pulseSpeed: number    // oscillation angular speed — each cell has its own rhythm
  naturalSpeed: number  // base drift speed — used for post-repulsion damping
}
interface HexCell  { cx: number; cy: number; phase: 'idle' | 'opening' | 'fading'; progress: number; idleTick: number; idleTarget: number }

export default defineComponent({
  name: 'HomeView',

  components: {
    HeroRingsSvg,
    CellIllustrationSvg,
    BodePlotSvg,
    OscilloscopeSvg,
    ClosedLoopDiagram,
  },

  data() {
    return {
      workflowSteps: ['wf1', 'wf2', 'wf3'],

      featureCards: [
        // Row 1 — core science workflow
        { to: ROUTE.SIGN_UP,  icon: ICON.FLASK,   titleKey: 'card1Title', descKey: 'card1Desc', tagKey: 'card1Tag', primary: true,  plan: 'free' },
        { to: ROUTE.SIGN_UP,  icon: ICON.GRID,    titleKey: 'card4Title', descKey: 'card4Desc', tagKey: 'card4Tag', primary: false, plan: 'free' },
        { to: ROUTE.PROTOCOL, icon: ICON.SECTION, titleKey: 'card5Title', descKey: 'card5Desc', tagKey: 'card5Tag', primary: false, plan: null   },
        // Row 2 — tooling & output
        { to: ROUTE.SIGN_UP,  icon: ICON.PLUG,    titleKey: 'card2Title', descKey: 'card2Desc', tagKey: 'card2Tag', primary: false, plan: 'pro'  },
        { to: ROUTE.SIGN_UP,  icon: ICON.CELL,    titleKey: 'card3Title', descKey: 'card3Desc', tagKey: 'card3Tag', primary: false, plan: 'free' },
      ],

      scopeTags: [
        { mod: 'cancer',   key: 'tagCancer',   subKey: 'tagCancerSub' },
        { mod: 'bacteria', key: 'tagBacteria', subKey: 'tagBacteriaSub' },
        { mod: 'virus',    key: 'tagVirus',    subKey: 'tagVirusSub' },
        { mod: 'ref',      key: 'tagRef',      subKey: 'tagRefSub' },
      ],

      selProgress:     0,
      selAnimId:       null as ReturnType<typeof requestAnimationFrame> | null,
      particleFrameId: null as ReturnType<typeof requestAnimationFrame> | null,
      hexFrameId:      null as ReturnType<typeof requestAnimationFrame> | null,
      particles:       [] as Particle[],
      hexCells:        markRaw([] as HexCell[]),
      mousePos:        null as { x: number; y: number } | null,
    }
  },

  mounted() {
    const zones = this.$el.querySelectorAll('.home__zone--anim')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home__zone--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    zones.forEach((zone: Element) => observer.observe(zone))
    this.startSelAnimation()
    this.initParticles()
    this.startParticleLoop()
    this.buildHexGrid()
    this.startHexLoop()

    // Mouse tracking on home root (canvas is pointer-events:none); rect.left/top maps viewport → canvas space.
    const homeEl = this.$el as HTMLElement
    homeEl.addEventListener('mousemove', (e: MouseEvent) => {
      const canvas = this.$refs.particleCanvas as HTMLCanvasElement | null
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      this.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    })
    homeEl.addEventListener('mouseleave', () => { this.mousePos = null })
  },

  beforeUnmount() {
    if (this.selAnimId       !== null) cancelAnimationFrame(this.selAnimId)
    if (this.particleFrameId !== null) cancelAnimationFrame(this.particleFrameId)
    if (this.hexFrameId      !== null) cancelAnimationFrame(this.hexFrameId)
  },

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },
    ...mapStores(useAuthStore),

    isSignedIn(): boolean {
      return this.authStore.isSignedIn
    },

    resolvedFeatureCards(): { to: string; icon: string; titleKey: string; descKey: string; tagKey: string; primary: boolean; plan: string | null }[] {
      if (!this.isSignedIn) return this.featureCards
      // Map sign-up destinations to real routes for signed-in users
      const destMap: Record<string, string> = {
        [ROUTE.SIGN_UP]: ROUTE.EXPERIMENT,
      }
      return this.featureCards.map((card) => ({
        ...card,
        to: destMap[card.to] ?? card.to,
      }))
    },

    eyebrowItems(): string[] {
      return (this.$tm as Function)('home.eyebrowItems') as string[]
    },

    eyebrowPhysics(): string[] {
      return (this.$tm as Function)('home.eyebrowPhysics') as string[]
    },

    selSliderPct(): number {
      return Math.round(this.selProgress * 100)
    },

    // Sigmoid curve: target lysis threshold centred at t=0.38 (sharper rise first)
    selTargetPct(): number {
      return Math.round((1 / (1 + Math.exp(-(this.selProgress - 0.38) * 14))) * 100)
    },

    // Sigmoid curve: healthy lysis threshold centred at t=0.65 (higher field required)
    selHealthyPct(): number {
      return Math.round((1 / (1 + Math.exp(-(this.selProgress - 0.65) * 14))) * 100)
    },

    // Window: target lysing, healthy still intact
    selInWindow(): boolean {
      return (this as { selTargetPct: number }).selTargetPct > 60
        && (this as { selHealthyPct: number }).selHealthyPct < 40
    },

    // Hot: both populations being lysed — non-selective, over-threshold
    selIsHot(): boolean {
      return (this as { selHealthyPct: number }).selHealthyPct >= 40
        && (this as { selTargetPct: number }).selTargetPct > 60
    },

    selStateLabel(): string {
      if ((this as { selInWindow: boolean }).selInWindow) return this.$t('home.selStateWindow')
      if ((this as { selIsHot: boolean }).selIsHot)       return this.$t('home.selStateOver')
      return this.$t('home.selStateSweep')
    },

    selTiDisplay(): string {
      const target  = (this as { selTargetPct: number }).selTargetPct
      const healthy = (this as { selHealthyPct: number }).selHealthyPct
      if (target < 5)  return this.$t('home.selTiNone')
      if (healthy < 2) return this.$t('home.selTiHigh')
      return `${this.$t('home.selTiPrefix')} ${(target / healthy).toFixed(1)}x`
    },
  },

  methods: {
    initParticles(): void {
      const canvas = this.$refs.particleCanvas as HTMLCanvasElement | null
      if (!canvas) return
      const w = canvas.width  = canvas.offsetWidth
      const h = canvas.height = canvas.offsetHeight
      this.particles = markRaw(Array.from({ length: PARTICLE_COUNT }, () => {
        const vx = (Math.random() - 0.5) * PARTICLE_SPEED * 2
        const vy = (Math.random() - 0.5) * PARTICLE_SPEED * 2
        return {
          x:            Math.random() * w,
          y:            Math.random() * h,
          vx,
          vy,
          isNode:       Math.random() < NODE_FRACTION,
          pulsePhase:   Math.random() * Math.PI * 2,
          pulseSpeed:   0.006 + Math.random() * 0.018,
          naturalSpeed: Math.sqrt(vx * vx + vy * vy),
        }
      }))
    },

    startParticleLoop(): void {
      const canvas = this.$refs.particleCanvas as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = (ts: number) => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
          this.initParticles()
        }
        ctx.clearRect(0, 0, w, h)
        this.updateParticles(w, h)
        this.drawParticles(ctx, w, h, ts)
        this.particleFrameId = requestAnimationFrame(tick)
      }

      this.particleFrameId = requestAnimationFrame(tick)
    },

    updateParticles(w: number, h: number): void {
      const mouse = this.mousePos
      for (const p of this.particles) {

        // ── E-field pulse: mouse repels nearby particles (cells dispersed by field) ──
        if (mouse) {
          const mdx    = p.x - mouse.x
          const mdy    = p.y - mouse.y
          const mDistSq = mdx * mdx + mdy * mdy
          if (mDistSq < MOUSE_REPEL_DIST_SQ && mDistSq > 0.01) {
            const mDist = Math.sqrt(mDistSq)
            const force = MOUSE_REPEL_FORCE * (1 - mDist / MOUSE_REPEL_DIST) / mDist
            p.vx += mdx * force
            p.vy += mdy * force
          }
        }

        // ── Velocity: damp excess speed (cells settling after a pulse), hard-clamp runaway ──
        const speedSq  = p.vx * p.vx + p.vy * p.vy
        const natSq    = p.naturalSpeed * p.naturalSpeed
        if (speedSq > natSq * 1.08) {
          p.vx *= 0.994
          p.vy *= 0.994
        }
        const maxSq = MAX_PARTICLE_SPEED * MAX_PARTICLE_SPEED
        if (speedSq > maxSq) {
          const s = MAX_PARTICLE_SPEED / Math.sqrt(speedSq)
          p.vx *= s
          p.vy *= s
        }

        p.x += p.vx
        p.y += p.vy

        // Bounce with clamp to prevent sticking at edge
        if (p.x < 0)  { p.vx =  Math.abs(p.vx); p.x = 0 }
        if (p.x > w)  { p.vx = -Math.abs(p.vx); p.x = w }
        if (p.y < 0)  { p.vy =  Math.abs(p.vy); p.y = 0 }
        if (p.y > h)  { p.vy = -Math.abs(p.vy); p.y = h }

        // ── Advance individual membrane oscillation phase ────────────────────────
        p.pulsePhase += p.pulseSpeed
      }
    },

    drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, ts: number): void {
      const fadeW = w * 0.10
      const fadeH = h * 0.10

      // ── EP wave pulse: brightening ring propagating from hero centre every WAVE_PERIOD_MS ──
      // Metaphor: a delivered electroporation pulse radiating through the cell suspension.
      const waveCx      = w / 2
      const waveCy      = h * 0.28  // approximate hero-zone centroid within full-page canvas
      const maxWaveDist = Math.sqrt(waveCx * waveCx + (h - waveCy) * (h - waveCy)) * 1.3
      const wavePct     = (ts % WAVE_PERIOD_MS) / WAVE_PERIOD_MS
      const travelFrac  = WAVE_TRAVEL_MS / WAVE_PERIOD_MS
      // waveRadius = -1 during the quiet phase between pulses
      const waveRadius  = wavePct < travelFrac ? (wavePct / travelFrac) * maxWaveDist : -1

      // ── Connection lines (drawn first so dots render on top) ────────────────────
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a  = this.particles[i]!
          const b  = this.particles[j]!
          const dx = a.x - b.x
          const dy = a.y - b.y
          // Skip O(n²) sqrt for pairs clearly out of range
          const distSq = dx * dx + dy * dy
          if (distSq >= CONNECTION_DIST_SQ) continue
          const dist = Math.sqrt(distSq)

          // Fade lines near all four canvas edges
          const edgeFade = Math.min(
            a.x / fadeW, (w - a.x) / fadeW,
            a.y / fadeH, (h - a.y) / fadeH,
            b.x / fadeW, (w - b.x) / fadeW,
            b.y / fadeH, (h - b.y) / fadeH,
            1,
          )
          if (edgeFade <= 0) continue

          // Energized: very close pair = high local field = high transmembrane voltage
          const energized = distSq < ENERGIZE_DIST_SQ
          const baseAlpha = (1 - dist / CONNECTION_DIST) * (energized ? 0.42 : 0.17)

          // EP wave boost: connection briefly brightens as the wavefront passes through
          const midX    = (a.x + b.x) * 0.5
          const midY    = (a.y + b.y) * 0.5
          const midDist = Math.sqrt((midX - waveCx) * (midX - waveCx) + (midY - waveCy) * (midY - waveCy))
          const waveBoost = waveRadius > 0
            ? Math.max(0, 1 - Math.abs(midDist - waveRadius) / WAVE_WIDTH_PX) * 0.24
            : 0

          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(0,212,255,${(baseAlpha + waveBoost) * edgeFade})`
          ctx.lineWidth   = energized ? 1.1 : 0.6
          ctx.stroke()
        }
      }

      // ── Dots ────────────────────────────────────────────────────────────────────
      for (const p of this.particles) {
        const edgeFade = Math.min(
          p.x / (w * 0.08), (w - p.x) / (w * 0.08),
          p.y / (h * 0.08), (h - p.y) / (h * 0.08),
          1,
        )
        if (edgeFade <= 0) continue

        // Individual membrane oscillation (each cell has its own bioelectric rhythm)
        const pulse     = 0.62 + 0.38 * Math.sin(p.pulsePhase)  // range [0.62, 1.0]

        // EP wave brightens dots it passes through
        const dotDist   = Math.sqrt((p.x - waveCx) * (p.x - waveCx) + (p.y - waveCy) * (p.y - waveCy))
        const waveBoost = waveRadius > 0
          ? Math.max(0, 1 - Math.abs(dotDist - waveRadius) / WAVE_WIDTH_PX) * 0.55
          : 0

        const radius  = p.isNode ? NODE_RADIUS : PARTICLE_RADIUS
        const baseOp  = p.isNode ? PARTICLE_OPACITY * 1.6 : PARTICLE_OPACITY
        const opacity = Math.min(1, (baseOp * pulse + waveBoost) * edgeFade)

        // Node halo: larger target cell has a faint outer ring (Schwan sphere model visual)
        if (p.isNode) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 2.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0,212,255,${opacity * 0.16})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${opacity})`
        ctx.fill()
      }
    },

    buildHexGrid(): void {
      const canvas = this.$refs['hexCanvas'] as HTMLCanvasElement | null
      if (!canvas) return
      const w  = canvas.width  = canvas.offsetWidth
      const h  = canvas.height = canvas.offsetHeight
      const r  = HEX_RADIUS
      const dx = r * 1.732
      const dy = r * 1.5
      const cells: HexCell[] = []
      for (let row = -1; row < Math.ceil(h / dy) + 2; row++) {
        const cols = Math.ceil(w / dx) + 2
        for (let col = -1; col < cols; col++) {
          const cx = col * dx + (row % 2 === 0 ? 0 : dx / 2)
          const cy = row * dy
          cells.push({ cx, cy, phase: 'idle', progress: 0, idleTick: 0, idleTarget: Math.floor(Math.random() * HEX_IDLE_MAX) })
        }
      }
      this.hexCells = markRaw(cells)
    },

    startHexLoop(): void {
      const canvas = this.$refs['hexCanvas'] as HTMLCanvasElement | null
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
        this.tickHexCell(cell)
        if (cell.phase !== 'idle' || cell.progress > 0) this.drawHexCell(ctx, cell)
      }
    },

    tickHexCell(cell: HexCell): void {
      if (cell.phase === 'idle') {
        cell.idleTick++
        if (cell.idleTick >= cell.idleTarget) {
          cell.phase      = 'opening'
          cell.idleTick   = 0
          cell.idleTarget = Math.floor(Math.random() * HEX_IDLE_MAX) + HEX_IDLE_MAX / 2
        }
      } else if (cell.phase === 'opening') {
        cell.progress += HEX_OPEN_SPEED
        if (cell.progress >= 1) { cell.progress = 1; cell.phase = 'fading' }
      } else {
        cell.progress -= HEX_FADE_SPEED
        if (cell.progress <= 0) { cell.progress = 0; cell.phase = 'idle' }
      }
    },

    drawHexCell(ctx: CanvasRenderingContext2D, cell: HexCell): void {
      const alpha = cell.progress * HEX_BORDER_ALPHA
      ctx.beginPath()
      this.traceHex(ctx, cell.cx, cell.cy, HEX_RADIUS)
      ctx.strokeStyle = `rgba(180, 100, 255, ${alpha})`
      ctx.lineWidth   = 1
      ctx.stroke()
    },

    traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
    },

    startSelAnimation(): void {
      let startTs = 0
      const tick = (ts: number) => {
        if (startTs === 0) startTs = ts
        const cycleT = ((ts - startTs) / SEL_CYCLE_MS) % 1
        // Piecewise: ramp up → slow dwell through window → quick return
        if (cycleT < 0.30) {
          this.selProgress = (cycleT / 0.30) * 0.42
        } else if (cycleT < 0.72) {
          // Slow sweep from window entry (0.42) to just past healthy threshold (0.65)
          this.selProgress = 0.42 + ((cycleT - 0.30) / 0.42) * 0.23
        } else {
          // Quick return to baseline
          this.selProgress = 0.65 * (1 - (cycleT - 0.72) / 0.28)
        }
        this.selAnimId = requestAnimationFrame(tick)
      }
      this.selAnimId = requestAnimationFrame(tick)
    },
  },
})
</script>

<style lang="scss" scoped>
@use './home';

</style>
