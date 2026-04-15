<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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


    <div class="home__inner">

      <!-- ── Zone 1: Hero — full viewport, staggered CSS entrance ── -->
      <div class="home__zone home__zone--hero">

        <!-- Pulse rings — logo motif echoed at page scale + ambient E-field lines -->
        <HeroRingsSvg />

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
          <div class="home__tagline-group">
            <p class="home__tagline">{{ $t('home.tagline1a') }}<strong class="home__tagline-highlight">{{ $t('home.tagline1Highlight') }}</strong>{{ $t('home.tagline1b') }}</p>
            <p class="home__tagline home__tagline--secondary">{{ $t('home.tagline2') }}</p>
          </div>
        </div>

        <div class="home__hero-cta">
          <div class="home__actions">
            <RouterLink v-if="isSignedIn" :to="ROUTE.EXPERIMENT" class="home__btn home__btn--primary">
              {{ $t('home.btnPrimary') }}
              <span class="home__btn-arrow" aria-hidden="true">
                <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </span>
            </RouterLink>
            <template v-if="!isSignedIn">
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
            </template>
            <RouterLink :to="ROUTE.PRICING" class="home__btn home__btn--pricing">
              {{ $t('home.btnViewPricing') }}
              <span class="home__btn-arrow" aria-hidden="true">
                <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </span>
            </RouterLink>
            <RouterLink :to="ROUTE.PROTOCOL" class="home__btn home__btn--ghost">
              {{ $t('home.btnGhost') }}
              <span class="home__btn-arrow" aria-hidden="true">
                <svg class="home__arrow-svg" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line class="home__arrow-shaft" x1="0" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polyline class="home__arrow-head" points="11,1 18,6 11,11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </span>
            </RouterLink>
          </div>
          <p class="home__cta-refs">{{ $t('home.ctaRefs1') }}<br>{{ $t('home.ctaRefs2') }}</p>
        </div>

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

const SEL_CYCLE_MS      = 9000
const PARTICLE_COUNT    = 45
const PARTICLE_SPEED    = 0.16
const PARTICLE_RADIUS   = 1.3
const PARTICLE_OPACITY  = 0.38
const CONNECTION_DIST   = 120

const HEX_RADIUS        = 26
const HEX_OPEN_SPEED    = 0.010
const HEX_FADE_SPEED    = 0.003
const HEX_IDLE_MAX      = 3200
const HEX_BORDER_ALPHA  = 0.012

interface Particle { x: number; y: number; vx: number; vy: number }
interface HexCell  { cx: number; cy: number; phase: 'idle' | 'opening' | 'fading'; progress: number; idleTick: number; idleTarget: number }

export default defineComponent({
  name: 'HomeView',

  components: {
    HeroRingsSvg,
    CellIllustrationSvg,
    BodePlotSvg,
    OscilloscopeSvg,
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
      this.particles = markRaw(Array.from({ length: PARTICLE_COUNT }, () => ({
        x:  Math.random() * w,
        y:  Math.random() * h,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
      })))
    },

    startParticleLoop(): void {
      const canvas = this.$refs.particleCanvas as HTMLCanvasElement | null
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
        this.drawParticles(ctx, w, h)
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

    drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
      // Fade edges so particles don't compete with hero text
      const fadeX = w * 0.12
      const fadeY = h * 0.12
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a    = this.particles[i]
          const b    = this.particles[j]
          if (!a || !b) continue
          const dx   = a.x - b.x
          const dy   = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const edgeFade = Math.min(
              a.x / fadeX, (w - a.x) / fadeX,
              a.y / fadeY, (h - a.y) / fadeY,
              1,
            )
            const alpha = (1 - dist / CONNECTION_DIST) * 0.18 * edgeFade
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
            ctx.lineWidth   = 0.6
            ctx.stroke()
          }
        }
      }
      for (const p of this.particles) {
        const edgeFade = Math.min(p.x / (w * 0.08), (w - p.x) / (w * 0.08), 1)
        ctx.beginPath()
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 212, 255, ${PARTICLE_OPACITY * edgeFade})`
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
