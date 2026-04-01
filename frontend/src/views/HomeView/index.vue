<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home">
    <div class="home__bg-grid" aria-hidden="true"></div>


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
            <span class="home__eyebrow-dot"></span>
            {{ $t('home.eyebrow') }}
          </div>
          <div class="home__tagline-group">
            <p class="home__tagline">{{ $t('home.tagline1a') }}<strong class="home__tagline-highlight">{{ $t('home.tagline1Highlight') }}</strong>{{ $t('home.tagline1b') }}</p>
            <p class="home__tagline home__tagline--secondary">{{ $t('home.tagline2') }}</p>
          </div>
        </div>

        <div class="home__hero-cta">
          <div class="home__actions">
            <RouterLink to="/experiment" class="home__btn home__btn--primary">
              {{ $t('home.btnPrimary') }} <span class="home__btn-arrow">{{ ICON.ARROW_R }}</span>
            </RouterLink>
            <RouterLink to="/protocol" class="home__btn home__btn--ghost">
              {{ $t('home.btnGhost') }} <span class="home__btn-arrow">{{ ICON.ARROW_R }}</span>
            </RouterLink>
          </div>
          <p class="home__cta-refs">{{ $t('home.ctaRefs1') }}<br>{{ $t('home.ctaRefs2') }}</p>
        </div>

      </div>

      <!-- ── Zone 2: Science — scroll-reveal physics illustrations ── -->
      <div class="home__zone home__zone--science home__zone--anim">

        <!-- Physics illustration strip (hidden on small screens) -->
        <div class="home__science-strip">

          <RouterLink to="/experiment" class="home__sci-panel" v-tip="$t('home.tipSciCell')">
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

          <RouterLink to="/experiment" class="home__sci-panel" v-tip="$t('home.tipSciChart')">
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
            v-for="(card, i) in featureCards"
            :key="card.to"
            :to="card.to"
            class="home__feature-card"
            :class="{ 'home__feature-card--primary': card.primary }"
            :style="{ '--card-i': i }"
          >
            <div class="home__fc-header">
              <span class="home__fc-icon-wrap">
                <span class="home__fc-icon">{{ card.icon }}</span>
              </span>
              <span class="home__fc-title">{{ $t(`home.${card.titleKey}`) }}</span>
              <span class="home__fc-tag">{{ $t(`home.${card.tagKey}`) }}</span>
            </div>
            <span class="home__fc-desc">{{ $t(`home.${card.descKey}`) }}</span>
          </RouterLink>

          <!-- Selectivity preview — animated sweep shows the platform's core value visually -->
          <RouterLink
            to="/experiment"
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

      <!-- ── Zone 4: Bottom — static, no animation ── -->
      <div class="home__zone home__zone--bottom">

        <div class="home__scope-tags">
          <span
            v-for="tag in scopeTags"
            :key="tag.mod"
            class="home__scope-tag"
            :class="`home__scope-tag--${tag.mod}`"
          >{{ $t(`home.${tag.key}`) }}</span>
        </div>

        <p class="home__disclaimer">{{ $t('home.disclaimer') }}</p>

      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ICON } from '@/constants/icons'
import HeroRingsSvg from './HeroRingsSvg.vue'
import CellIllustrationSvg from './CellIllustrationSvg.vue'
import BodePlotSvg from './BodePlotSvg.vue'
import OscilloscopeSvg from './OscilloscopeSvg.vue'

const SEL_CYCLE_MS = 9000

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
        { to: '/experiment', icon: ICON.FLASK,   titleKey: 'card1Title', descKey: 'card1Desc', tagKey: 'card1Tag', primary: true },
        { to: '/instrument', icon: ICON.PLUG,    titleKey: 'card2Title', descKey: 'card2Desc', tagKey: 'card2Tag', primary: false },
        { to: '/reports',    icon: ICON.CELL,    titleKey: 'card3Title', descKey: 'card3Desc', tagKey: 'card3Tag', primary: false },
        { to: '/datasets',   icon: ICON.GRID,    titleKey: 'card4Title', descKey: 'card4Desc', tagKey: 'card4Tag', primary: false },
        { to: '/protocol',   icon: ICON.SECTION, titleKey: 'card5Title', descKey: 'card5Desc', tagKey: 'card5Tag', primary: false },
      ],

      scopeTags: [
        { mod: 'cancer',   key: 'tagCancer' },
        { mod: 'bacteria', key: 'tagBacteria' },
        { mod: 'virus',    key: 'tagVirus' },
        { mod: 'ref',      key: 'tagRef' },
      ],

      selProgress: 0,
      selAnimId: null as ReturnType<typeof requestAnimationFrame> | null,
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
  },

  beforeUnmount() {
    if (this.selAnimId !== null) {
      cancelAnimationFrame(this.selAnimId)
    }
  },

  computed: {
    ICON() { return ICON },

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
