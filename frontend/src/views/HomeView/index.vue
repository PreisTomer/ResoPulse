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
          <p class="home__tagline">{{ $t('home.taglineMain') }}</p>
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
          <p class="home__cta-refs">{{ $t('home.ctaRefs') }}</p>
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
            v-for="card in featureCards"
            :key="card.to"
            :to="card.to"
            class="home__feature-card"
            :class="{ 'home__feature-card--primary': card.primary }"
          >
            <div class="home__fc-header">
              <span class="home__fc-icon">{{ card.icon }}</span>
              <span class="home__fc-title">{{ $t(`home.${card.titleKey}`) }}</span>
            </div>
            <span class="home__fc-desc">{{ $t(`home.${card.descKey}`) }}</span>
          </RouterLink>

          <div class="home__feature-card home__feature-card--stats">
            <div class="home__stats-grid">
              <div v-for="s in homeStats" :key="s" class="home__stat">
                <span class="home__stat-val">{{ $t(`home.${s}Val`) }}</span>
                <span class="home__stat-label">{{ $t(`home.${s}Label`) }}</span>
              </div>
            </div>
          </div>

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

export default defineComponent({
  name: 'HomeView',

  components: {
    HeroRingsSvg,
    CellIllustrationSvg,
    BodePlotSvg,
    OscilloscopeSvg,
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
  },

  data() {
    return {
      ICON,

      workflowSteps: ['wf1', 'wf2', 'wf3'],

      featureCards: [
        { to: '/experiment', icon: ICON.FLASK,   titleKey: 'card1Title', descKey: 'card1Desc', primary: true },
        { to: '/instrument', icon: ICON.PLUG,    titleKey: 'card2Title', descKey: 'card2Desc', primary: false },
        { to: '/reports',    icon: ICON.CELL,    titleKey: 'card3Title', descKey: 'card3Desc', primary: false },
        { to: '/datasets',   icon: ICON.GRID,    titleKey: 'card4Title', descKey: 'card4Desc', primary: false },
        { to: '/protocol',   icon: ICON.SECTION, titleKey: 'card5Title', descKey: 'card5Desc', primary: false },
      ],

      homeStats: ['stat1', 'stat2', 'stat3', 'stat4'],

      scopeTags: [
        { mod: 'cancer',   key: 'tagCancer' },
        { mod: 'bacteria', key: 'tagBacteria' },
        { mod: 'virus',    key: 'tagVirus' },
        { mod: 'ref',      key: 'tagRef' },
      ],
    }
  },
})
</script>

<style lang="scss" scoped>
@use './home';

</style>
