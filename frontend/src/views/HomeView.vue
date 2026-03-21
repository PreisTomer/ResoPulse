<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home">
    <div class="home__bg-grid" aria-hidden="true"></div>


    <div class="home__inner">

      <!-- ── Zone 1: Hero — full viewport, staggered CSS entrance ── -->
      <div class="home__zone home__zone--hero">

        <!-- Pulse rings — logo motif echoed at page scale + ambient E-field lines -->
        <div class="home__hero-bg" aria-hidden="true">
          <svg class="home__hero-bg-svg" viewBox="0 0 900 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Origin dot: blinks first, rings shoot outward from it -->
            <circle class="home__hero-bg-dot" cx="450" cy="450" r="6" fill="rgba(0,212,255,1)"/>
            <!-- Concentric rings: same visual language as the logo rings, amplified -->
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="148" stroke="rgba(0,212,255,1)"    stroke-width="1.2" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="240" stroke="rgba(0,212,255,0.85)" stroke-width="1"   fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="338" stroke="rgba(0,212,255,0.65)" stroke-width="0.9" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="440" stroke="rgba(0,212,255,0.45)" stroke-width="0.8" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="542" stroke="rgba(0,212,255,0.25)" stroke-width="0.7" fill="none"/>
          </svg>
        </div>

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
            <svg class="home__cell-svg" viewBox="0 0 190 242" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="home-cell-clip">
                  <circle cx="95" cy="122" r="68"/>
                </clipPath>
                <linearGradient id="home-vm-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgb(0,212,255)">
                    <animate attributeName="stop-opacity" values="0.12;0.26;0.12" dur="3s" repeatCount="indefinite"/>
                  </stop>
                  <stop offset="48%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
                  <stop offset="52%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
                  <stop offset="100%" stop-color="rgb(255,77,109)">
                    <animate attributeName="stop-opacity" values="0.08;0.20;0.08" dur="3s" repeatCount="indefinite"/>
                  </stop>
                </linearGradient>
              </defs>
              <g clip-path="url(#home-cell-clip)">
                <g class="home__efield-arrow home__efield-arrow--1">
                  <line x1="0" y1="94" x2="180" y2="94" stroke="rgba(0,212,255,0.65)" stroke-width="1"/>
                  <polygon points="184,94 175,90 175,98" fill="rgba(0,212,255,0.65)"/>
                </g>
                <g class="home__efield-arrow home__efield-arrow--2">
                  <line x1="0" y1="122" x2="180" y2="122" stroke="rgba(0,212,255,0.85)" stroke-width="1"/>
                  <polygon points="184,122 175,118 175,126" fill="rgba(0,212,255,0.85)"/>
                </g>
                <g class="home__efield-arrow home__efield-arrow--3">
                  <line x1="0" y1="150" x2="180" y2="150" stroke="rgba(0,212,255,0.65)" stroke-width="1"/>
                  <polygon points="184,150 175,146 175,154" fill="rgba(0,212,255,0.65)"/>
                </g>
                <circle cx="95" cy="122" r="68" fill="url(#home-vm-grad)"/>
                <circle cx="83" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
                  <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0s"/>
                </circle>
                <circle cx="95" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
                  <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
                </circle>
                <circle cx="107" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
                  <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
                </circle>
                <circle cx="83" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
                  <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
                </circle>
                <circle cx="95" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
                  <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
                </circle>
                <circle cx="107" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
                  <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
                </circle>
              </g>
              <circle class="home__cell-membrane" cx="95" cy="122" r="70"
                stroke="rgba(0,212,255,0.55)" stroke-width="3" fill="rgba(0,212,255,0.06)"/>
              <circle cx="95" cy="122" r="66.5"
                stroke="rgba(0,212,255,0.18)" stroke-width="1" fill="rgba(0,212,255,0.04)"/>
              <circle cx="95" cy="122" r="25"
                stroke="rgba(167,139,250,0.75)" stroke-width="1.5" fill="rgba(167,139,250,0.14)"/>
              <circle cx="95" cy="122" r="22" fill="rgba(167,139,250,0.08)"/>
              <path class="home__vm-cap home__vm-cap--pos"
                d="M 61,66 A 70,70 0 0 1 129,66"
                stroke="rgba(0,212,255,0.9)" stroke-width="2.5" fill="rgba(0,212,255,0.22)"/>
              <path class="home__vm-cap home__vm-cap--neg"
                d="M 61,178 A 70,70 0 0 0 129,178"
                stroke="rgba(255,77,109,0.85)" stroke-width="2.5" fill="rgba(255,77,109,0.16)"/>
              <text x="95" y="26" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(0,212,255,0.9)">+Vm</text>
              <text x="95" y="232" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(255,77,109,0.9)">-Vm</text>
              <text x="163" y="96" font-family="monospace" font-size="10" fill="rgba(0,212,255,0.75)">E⃗</text>
              <text x="95" y="127" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(167,139,250,0.7)">nucleus</text>
              <text x="95" y="200" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.45)">membrane</text>
            </svg>
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
            <svg class="home__bode-svg" viewBox="0 0 210 188" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="28" y1="12" x2="28" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
              <line x1="28" y1="152" x2="196" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
              <text x="10" y="82" text-anchor="middle" font-family="monospace" font-size="7"
                fill="rgba(255,255,255,0.48)" transform="rotate(-90,10,82)">Vm</text>
              <text x="112" y="165" text-anchor="middle" font-family="monospace" font-size="7"
                fill="rgba(255,255,255,0.48)">f (log)</text>
              <line x1="108" y1="12" x2="108" y2="152"
                stroke="rgba(0,212,255,0.45)" stroke-width="1" stroke-dasharray="3 3"/>
              <text x="111" y="11" font-family="monospace" font-size="7.5" fill="rgba(0,212,255,0.8)">fc</text>
              <path d="M 28,36 C 80,36 100,40 122,92 S 168,148 194,150"
                stroke="rgba(255,77,109,0.6)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/>
              <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
                stroke="rgba(0,212,255,0.2)" stroke-width="9" stroke-linecap="round"/>
              <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
                stroke="rgba(0,212,255,0.88)" stroke-width="2" stroke-linecap="round"/>
              <circle r="10" fill="rgba(0,212,255,0.18)">
                <animateMotion dur="5s" repeatCount="indefinite"
                  calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
                  keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
              </circle>
              <circle r="4" fill="rgba(0,212,255,1)">
                <animateMotion dur="5s" repeatCount="indefinite"
                  calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
                  keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
              </circle>
              <line x1="28" y1="175" x2="46" y2="175" stroke="rgba(0,212,255,0.85)" stroke-width="1.5"/>
              <text x="50" y="178" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.85)">Target</text>
              <line x1="104" y1="175" x2="122" y2="175"
                stroke="rgba(255,77,109,0.65)" stroke-width="1.5" stroke-dasharray="3 2"/>
              <text x="126" y="178" font-family="monospace" font-size="7" fill="rgba(255,77,109,0.65)">Healthy</text>
            </svg>
            </div>
            <p class="home__sci-sublabel">{{ $t('home.sciChartSub') }}</p>
            <span class="home__sci-cta">{{ $t('home.sciCta') }}</span>
          </RouterLink>

        </div>

      </div>

      <!-- ── Zone 3: Features — scroll-reveal workflow and cards ── -->
      <div class="home__zone home__zone--features home__zone--anim">

        <!-- Oscilloscope background: two waveforms scroll edge to edge, medium+ screens -->
        <div class="home__feat-osc" aria-hidden="true">
          <!-- preserveAspectRatio="none" stretches SVG to fill container width exactly,
               so waves always reach both screen edges and clip naturally on resize -->
          <svg class="home__feat-osc-svg" viewBox="0 0 1200 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <!-- double-width group; scrolls via osc-scroll for a seamless loop -->
            <g class="home__feat-osc-track">
              <!-- Applied field: sine wave, cyan -->
              <path class="home__feat-osc-path--field" :d="OSC_PATH.FIELD"/>
              <!-- Transmembrane voltage Vm: cosine lag, purple -->
              <path class="home__feat-osc-path--vm" :d="OSC_PATH.VM"/>
            </g>
          </svg>
        </div>

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
import { OSC_PATH } from '@/constants/svgPaths'

export default defineComponent({
  name: 'HomeView',

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
      OSC_PATH,

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
@use '../styles/home';

</style>
