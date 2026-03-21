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
            <!-- Concentric rings: same visual language as the logo rings, amplified -->
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="148" stroke="rgba(0,212,255,1)"    stroke-width="1.2" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="240" stroke="rgba(0,212,255,0.85)" stroke-width="1"   fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="338" stroke="rgba(0,212,255,0.65)" stroke-width="0.9" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="440" stroke="rgba(0,212,255,0.45)" stroke-width="0.8" fill="none"/>
            <circle class="home__hero-bg-ring" cx="450" cy="450" r="542" stroke="rgba(0,212,255,0.25)" stroke-width="0.7" fill="none"/>
            <!-- E-field lines — ambient electromagnetic field crossing the hero -->
            <line x1="0" y1="380" x2="900" y2="380" stroke="rgba(0,212,255,0.5)" stroke-width="0.8"/>
            <line x1="0" y1="450" x2="900" y2="450" stroke="rgba(0,212,255,0.7)" stroke-width="0.8"/>
            <line x1="0" y1="520" x2="900" y2="520" stroke="rgba(0,212,255,0.5)" stroke-width="0.8"/>
          </svg>
        </div>

        <div class="home__hero-brand">
          <div class="home__title-lockup">
            <div class="home__logo-inline" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>
            <h1 class="home__title">
              Reso<span class="home__title-accent">Pulse</span>
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
@use '../styles/mixins' as *;

/* ── Layout ──────────────────────────────────────────────────────────── */
.home {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
  position: relative;
  overflow-x: hidden;
  cursor: crosshair;

  &__bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    pointer-events: none;
  }


  &__inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0;
    max-width: 900px;
    width: 100%;
  }

  /* ── Zones ───────────────────────────────────────────────────── */
  &__zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    &--hero {
      position: relative;
      overflow: hidden;
      min-height: calc(100vh - 60px);
      justify-content: center;
      gap: 3.2rem;
      padding: 4rem 2rem 0;
    }

    &--science {
      display: none;
      gap: 1.5rem;
      padding: 0 2rem 1rem;
      @media (min-width: 768px) { display: flex; }
    }

    &--features {
      gap: 1.4rem;
      padding: 4rem 2rem 0;
    }

    &--bottom {
      gap: 0.75rem;
      padding: 1.5rem 2rem 3rem;
    }

    &--anim {
      opacity: 0;
      transform: translateY(40px) scale(0.97);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }

    &--visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ── Hero background cell illustration ──────────────────────── */
  &__hero-bg {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);

    @media (max-width: 520px) { display: none; }
  }

  &__hero-bg-svg {
    width: 760px;
    height: auto;
    opacity: 0.26;
    mix-blend-mode: screen;
  }

  &__hero-bg-ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: bg-ring-pulse 3.5s ease-in-out infinite;

    &:nth-of-type(1) { animation-delay: 0s; }
    &:nth-of-type(2) { animation-delay: 0.7s; }
    &:nth-of-type(3) { animation-delay: 1.4s; }
    &:nth-of-type(4) { animation-delay: 2.1s; }
    &:nth-of-type(5) { animation-delay: 2.8s; }
  }

  /* ── Hero sub-groups (staggered CSS entrance) ────────────────── */
  &__hero-brand,
  &__hero-pitch,
  &__hero-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: hero-enter 0.7s ease both;
    position: relative;
    z-index: 1;
  }

  &__hero-brand { gap: 0.75rem; animation-delay: 0.1s; }
  &__hero-pitch { gap: 1.4rem; margin-top: -1rem; animation-delay: 0.3s; }
  &__hero-cta   { width: 100%; animation-delay: 0.5s; }

  /* ── Logo inline lockup ──────────────────────────────────────── */
  &__title-lockup {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  &__logo-inline {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    align-self: center;
    transform: translateY(3px);
    border: 1.5px solid var(--color-primary);
    background-color: var(--color-bg);
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.5), 0 0 52px rgba(0, 212, 255, 0.2);

    img {
      width: 100%; height: 100%;
      object-fit: cover; transform: scale(1.7); display: block;
    }
  }

  /* ── Typography ──────────────────────────────────────────────── */
  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.75rem, 0.14em);
    color: var(--color-primary);
    flex-wrap: wrap;
    justify-content: center;

    &-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background-color: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary);
      animation: blink 2s ease-in-out infinite;
      flex-shrink: 0;
    }
  }

  &__title {
    font-size: clamp(2.8rem, 7vw, 5.5rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--color-text-heading);
    margin: 0;
    animation: title-glow 3s ease-in-out infinite 1.25s;

    &-accent {
      color: #0a2e58;
      -webkit-text-stroke: 1.5px var(--color-primary);
      paint-order: stroke fill;
      animation: pulse-glow 2.5s ease-in-out infinite;
    }
  }

  /* ── Subtitle ────────────────────────────────────────────────── */
  &__subtitle {
    @include flex-row(0.55rem);
    @include mono-upper(0.82rem, 0.14em);
    text-transform: none;
    justify-content: center;
    color: var(--color-text-muted);

    &::before,
    &::after {
      content: '';
      width: 36px;
      height: 1px;
      background: var(--color-border);
      flex-shrink: 0;
    }
  }

  /* ── Tagline ─────────────────────────────────────────────────── */
  &__tagline {
    font-size: 1rem;
    font-weight: 400;
    color: var(--color-text);
    line-height: 1.65;
    text-align: center;
    max-width: 620px;
    margin: 0;
  }

  /* ── CTA buttons ─────────────────────────────────────────────── */
  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    width: 100%;
    max-width: 520px;
  }

  &__cta-refs {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: 0.55;
    text-align: center;
    margin: 0;
    margin-top: 1.4rem;
  }

  &__btn {
    @include flex-row(0.35rem);
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.18s;
    cursor: pointer;
    border: none;

    &--primary {
      background-color: var(--color-primary);
      color: #060e1a;
      box-shadow: 0 0 24px rgba(0, 212, 255, 0.35);

      &:hover {
        filter: brightness(1.12);
        box-shadow: 0 0 36px rgba(0, 212, 255, 0.55);
        text-decoration: none;
      }
    }

    &--ghost {
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);

      &:hover { border-color: var(--color-primary); color: var(--color-primary); text-decoration: none; }
    }
  }

  &__btn-arrow {
    display: inline-block;
    transition: transform 0.18s ease;
  }

  &__btn:hover &__btn-arrow { transform: translateX(4px); }

  /* ── Science illustration strip ──────────────────────────────── */
  &__science-strip {
    display: none; // hidden on small screens — decorative only
    @media (min-width: 768px) {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 1.75rem;
      width: 100%;
    }
  }

  &__sci-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 230px;
    text-decoration: none;
    padding: 0.6rem 0.75rem 0.7rem;
    border-top:    1px solid rgba(0, 212, 255, 0.45);
    border-bottom: 1px solid rgba(0, 212, 255, 0.18);
    transition: transform 0.3s ease, filter 0.3s ease, border-color 0.3s ease;
    cursor: pointer !important;

    @media (min-width: 768px) {
      &:hover {
        transform: scale(1.03);
        border-top-color: rgba(0, 212, 255, 0.8);
        filter: drop-shadow(0 0 28px rgba(0, 212, 255, 0.4));
      }

      &:hover .home__sci-cta {
        opacity: 1;
      }
    }
  }

  &__sci-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    &-id,
    &-status {
      font-family: monospace;
      font-size: 0.5rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(0, 212, 255, 0.45);
    }

    &-status::before {
      content: '● ';
      font-size: 0.42rem;
      animation: blink 2.5s ease-in-out infinite;
    }
  }

  &__sci-svg-box {
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__sci-cta {
    font-family: monospace;
    font-size: 0.57rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: rgba(0, 212, 255, 0.8);
    opacity: 0.35;
    transition: opacity 0.3s ease;
    margin-top: 0.1rem;
  }

  &__sci-label {
    font-family: monospace;
    font-size: 0.67rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(0, 212, 255, 0.85);
    margin: 0;
  }

  &__sci-sublabel {
    font-family: monospace;
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.42);
    margin: 0;
  }

  &__sci-divider {
    width: 1px;
    align-self: stretch;
    margin: 1rem 0;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(0, 212, 255, 0.22) 20%,
      rgba(0, 212, 255, 0.22) 80%,
      transparent
    );
    flex-shrink: 0;
  }

  &__cell-svg,
  &__bode-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    mix-blend-mode: screen;
  }

  /* E-field drift */
  @keyframes home-efield-drift {
    0%   { transform: translateX(-8px); opacity: 0.45; }
    50%  { transform: translateX(8px);  opacity: 1; }
    100% { transform: translateX(-8px); opacity: 0.45; }
  }

  &__efield-arrow {
    animation: home-efield-drift 3s ease-in-out infinite;
    &--1 { animation-delay: 0s; }
    &--2 { animation-delay: 0.6s; }
    &--3 { animation-delay: 1.2s; }
  }

  /* Membrane breathe */
  @keyframes home-cell-breathe {
    0%, 100% { r: 70; }
    50%       { r: 72; }
  }

  &__cell-membrane {
    animation: home-cell-breathe 4s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  /* Vm cap pulse */
  @keyframes home-vm-pulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }

  &__vm-cap {
    &--pos { animation: home-vm-pulse 2s ease-in-out infinite; }
    &--neg { animation: home-vm-pulse 2s ease-in-out infinite 1s; }
  }

  /* ── 3-step workflow ─────────────────────────────────────────── */
  &__workflow {
    @include surface-card(var(--radius), 1.2rem 1.4rem);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0.6rem;
    width: 100%;
    max-width: 820px;
  }

  &__wf-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    text-align: center;
    min-width: 0;
  }

  &__wf-num {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-primary);
    opacity: 0.7;
  }

  &__wf-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
  }

  &__wf-desc {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    line-height: 1.55;
    max-width: 200px;
  }

  &__wf-arrow {
    font-size: 1.1rem;
    color: var(--color-primary);
    opacity: 0.35;
    flex-shrink: 0;
    margin-top: 1.5rem;
  }

  /* ── Feature cards ───────────────────────────────────────────── */
  &__feature-cards {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
    width: 100%;
    max-width: 820px;
  }

  &__feature-card {
    @include surface-card(var(--radius), 1rem 1.1rem);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-align: left;
    transition: border-color 0.18s, box-shadow 0.18s;
    cursor: pointer;

    &:hover {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 0 18px rgba(0, 212, 255, 0.08);
      text-decoration: none;
    }

    &--stats {
      cursor: default;
      border-style: dashed;
      border-color: rgba(0, 212, 255, 0.18);
      background: rgba(0, 212, 255, 0.03);

      &:hover {
        border-color: rgba(0, 212, 255, 0.28);
        box-shadow: none;
      }
    }
  }

  &__fc {
    &-header { display: flex; align-items: center; gap: 0.45rem; }
    &-icon   { font-size: 1rem; opacity: 0.7; flex-shrink: 0; }
    &-title  { font-size: 0.82rem; font-weight: 600; color: var(--color-text-heading); }
    &-desc   { font-size: 0.7rem; color: var(--color-text-muted); line-height: 1.6; }
  }

  /* ── Stats card ──────────────────────────────────────────────── */
  &__stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    height: 100%;
    align-content: center;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;

    &-val {
      font-family: var(--font-mono);
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--color-primary);
      letter-spacing: -0.03em;
      line-height: 1;
    }

    &-label {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }
  }

  /* ── Scope tags ──────────────────────────────────────────────── */
  &__scope-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__scope-tag {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.15rem 0.55rem;
    border-radius: 3px;
    border: 1px solid transparent;

    &--cancer   { color: var(--color-danger);  border-color: rgba(255,77,109,0.35);  background: rgba(255,77,109,0.07); }
    &--bacteria { color: var(--color-amber);   border-color: rgba(251,191,36,0.35);  background: rgba(251,191,36,0.07); }
    &--virus    { color: var(--color-purple);  border-color: rgba(167,139,250,0.35); background: rgba(167,139,250,0.07); }
    &--ref      { color: var(--color-primary); border-color: rgba(0,212,255,0.35);   background: rgba(0,212,255,0.07); }
  }

  &__disclaimer {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.65;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
  }

  /* ── Responsive - tablet (≤ 768px) ──────────────────────────── */
  @media (max-width: 768px) {
    &__zone--hero {
      gap: 2.4rem;
      padding: 3rem 1.5rem;
    }

    &__zone--features { padding: 3rem 1.5rem; }
    &__zone--bottom   { padding: 1rem 1.5rem 2.5rem; }

    &__logo-inline {
      width: 56px;
      height: 56px;
    }

    &__title-lockup { gap: 0.75rem; }

    &__tagline {
      font-size: 0.9rem;
    }

    &__actions {
      max-width: 100%;
    }

    &__workflow {
      padding: 1rem;
    }

    &__wf-desc {
      max-width: 160px;
    }

    /* Single-column card grid on tablet; stats card full-width stat bar */
    &__feature-cards {
      grid-template-columns: 1fr;
    }

    &__feature-card--stats {
      .home__stats-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
      }
    }
  }

  /* ── Responsive - phone (≤ 520px) ───────────────────────────── */
  @media (max-width: 520px) {
    &__zone--hero {
      gap: 2rem;
      padding: 2rem 1rem;
    }

    &__zone--features { padding: 2.5rem 1rem; }
    &__zone--bottom   { padding: 0.75rem 1rem 2rem; }

    &__logo-inline {
      width: 44px;
      height: 44px;
    }

    &__title-lockup { gap: 0.6rem; }

    &__eyebrow {
      font-size: 0.65rem;
    }

    &__tagline {
      font-size: 0.85rem;
    }

    &__actions {
      grid-template-columns: 1fr;
      max-width: 100%;
    }

    &__btn {
      padding: 0.7rem 1.2rem;
      font-size: 0.9rem;
    }

    /* workflow: vertical stack */
    &__workflow {
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      gap: 0.8rem;
    }

    &__wf-step {
      width: 100%;
      max-width: 320px;
    }

    &__wf-desc {
      max-width: 100%;
    }

    &__wf-arrow {
      transform: rotate(90deg);
      margin-top: 0;
      opacity: 0.25;
    }

    /* Single-column card grid on phone */
    &__feature-cards {
      grid-template-columns: 1fr;
      gap: 0.55rem;
    }

    &__feature-card {
      padding: 0.75rem 0.8rem;
      gap: 0.3rem;
    }

    &__fc {
      &-icon  { font-size: 0.9rem; }
      &-title { font-size: 0.75rem; }
      &-desc  { font-size: 0.65rem; line-height: 1.5; }
    }

    /* stats card: horizontal 4-col stat bar */
    &__feature-card--stats {
      .home__stats-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 0.4rem;
      }
    }

    &__stat {
      &-val   { font-size: 1.1rem; }
      &-label { font-size: 0.56rem; }
    }

  }
}

/* ── Animations ──────────────────────────────────────────────────────── */
@keyframes hero-enter {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes title-glow {
  0%, 100% { text-shadow: 0 0 30px rgba(0, 212, 255, 0.08); }
  50%       { text-shadow: 0 0 60px rgba(0, 212, 255, 0.28), 0 0 20px rgba(0, 212, 255, 0.12); }
}

@keyframes bg-ring-pulse {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 1; }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@keyframes pulse-glow {
  0%, 100% { text-shadow: 0 0 22px rgba(0, 212, 255, 0.2); }
  50%       { text-shadow: 0 0 50px rgba(0, 212, 255, 0.65); }
}
</style>
