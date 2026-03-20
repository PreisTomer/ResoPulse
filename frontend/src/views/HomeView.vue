<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home">
    <div class="home__bg-grid" aria-hidden="true"></div>

    <!-- Rotating electric field topology (conic gradient sectors) -->
    <div class="home__bg-field" aria-hidden="true"></div>

    <!-- Expanding RF pulse rings from centre -->
    <div class="home__bg-rings" aria-hidden="true">
      <div class="home__bg-ring"></div>
      <div class="home__bg-ring"></div>
      <div class="home__bg-ring"></div>
      <div class="home__bg-ring"></div>
    </div>

    <div class="home__inner">

      <!-- Logo rings -->
      <div class="home__logo-wrap" aria-hidden="true">
        <div class="home__ring home__ring--1"></div>
        <div class="home__ring home__ring--2"></div>
        <div class="home__ring home__ring--3"></div>
        <div class="home__ring home__ring--4"></div>
        <div class="home__logo-circle">
          <img src="/logo.png" alt="ResoPulse" />
        </div>
      </div>

      <!-- Eyebrow -->
      <div class="home__eyebrow">
        <span class="home__eyebrow-dot"></span>
        {{ $t('home.eyebrow') }}
      </div>

      <!-- Title -->
      <h1 class="home__title">
        Reso<span class="home__title-accent">Pulse</span>
      </h1>

      <!-- Subtitle -->
      <div class="home__subtitle">{{ $t('home.subtitle') }}</div>

      <!-- Tagline -->
      <p class="home__tagline">{{ $t('home.taglineMain') }}</p>

      <!-- Capability pills - two explicit rows of 4; no flex-wrap required -->
      <div class="home__caps">
        <div class="home__caps-row">
          <span v-for="pill in capPills.slice(0, 4)" :key="pill.key" class="home__cap">
            {{ pill.icon }} {{ $t(`home.${pill.key}`) }}
          </span>
        </div>
        <div class="home__caps-row">
          <span v-for="pill in capPills.slice(4)" :key="pill.key" class="home__cap">
            {{ pill.icon }} {{ $t(`home.${pill.key}`) }}
          </span>
        </div>
      </div>

      <!-- CTA -->
      <div class="home__actions">
        <RouterLink to="/experiment" class="home__btn home__btn--primary">
          {{ $t('home.btnPrimary') }} <span class="home__btn-arrow">{{ ICON.ARROW_R }}</span>
        </RouterLink>
        <RouterLink to="/protocol" class="home__btn home__btn--ghost">
          {{ $t('home.btnGhost') }} <span class="home__btn-arrow">{{ ICON.ARROW_R }}</span>
        </RouterLink>
      </div>

      <!-- Physics illustration strip: cell cross-section + Schwan Bode chart (hidden on small screens) -->
      <div class="home__science-strip" aria-hidden="true">

        <!-- Left: animated Schwan cell cross-section -->
        <div class="home__sci-panel">
          <p class="home__sci-label">{{ $t('home.sciCellLabel') }}</p>
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
            <!-- E-field lines + ions clipped to cell interior -->
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
              <!-- Voltage gradient fill -->
              <circle cx="95" cy="122" r="68" fill="url(#home-vm-grad)"/>
              <!-- Positive ions drifting upward — 3 staggered -->
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
              <!-- Negative ions drifting downward — 3 staggered -->
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
            <!-- Outer membrane -->
            <circle class="home__cell-membrane" cx="95" cy="122" r="70"
              stroke="rgba(0,212,255,0.55)" stroke-width="3" fill="rgba(0,212,255,0.06)"/>
            <!-- Lipid bilayer inner edge -->
            <circle cx="95" cy="122" r="66.5"
              stroke="rgba(0,212,255,0.18)" stroke-width="1" fill="rgba(0,212,255,0.04)"/>
            <!-- Nucleus envelope -->
            <circle cx="95" cy="122" r="25"
              stroke="rgba(167,139,250,0.75)" stroke-width="1.5" fill="rgba(167,139,250,0.14)"/>
            <circle cx="95" cy="122" r="22" fill="rgba(167,139,250,0.08)"/>
            <!-- +Vm cap -->
            <path class="home__vm-cap home__vm-cap--pos"
              d="M 61,66 A 70,70 0 0 1 129,66"
              stroke="rgba(0,212,255,0.9)" stroke-width="2.5" fill="rgba(0,212,255,0.22)"/>
            <!-- -Vm cap -->
            <path class="home__vm-cap home__vm-cap--neg"
              d="M 61,178 A 70,70 0 0 0 129,178"
              stroke="rgba(255,77,109,0.85)" stroke-width="2.5" fill="rgba(255,77,109,0.16)"/>
            <!-- Labels -->
            <text x="95" y="26" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(0,212,255,0.9)">+Vm</text>
            <text x="95" y="232" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(255,77,109,0.9)">-Vm</text>
            <text x="163" y="96" font-family="monospace" font-size="10" fill="rgba(0,212,255,0.75)">E⃗</text>
            <text x="95" y="127" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(167,139,250,0.7)">nucleus</text>
            <text x="95" y="200" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.45)">membrane</text>
          </svg>
          <p class="home__sci-sublabel">{{ $t('home.sciCellSub') }}</p>
        </div>

        <!-- Divider -->
        <div class="home__sci-divider" aria-hidden="true"></div>

        <!-- Right: Schwan Vm(f) frequency response with animated operating point -->
        <div class="home__sci-panel">
          <p class="home__sci-label">{{ $t('home.sciChartLabel') }}</p>
          <svg class="home__bode-svg" viewBox="0 0 210 188" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Axes -->
            <line x1="28" y1="12" x2="28" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
            <line x1="28" y1="152" x2="196" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
            <!-- Axis labels -->
            <text x="10" y="82" text-anchor="middle" font-family="monospace" font-size="7"
              fill="rgba(255,255,255,0.48)" transform="rotate(-90,10,82)">Vm</text>
            <text x="112" y="165" text-anchor="middle" font-family="monospace" font-size="7"
              fill="rgba(255,255,255,0.48)">f (log)</text>
            <!-- fc marker -->
            <line x1="108" y1="12" x2="108" y2="152"
              stroke="rgba(0,212,255,0.45)" stroke-width="1" stroke-dasharray="3 3"/>
            <text x="111" y="11" font-family="monospace" font-size="7.5" fill="rgba(0,212,255,0.8)">fc</text>
            <!-- Healthy cell curve (red dashed) -->
            <path d="M 28,36 C 80,36 100,40 122,92 S 168,148 194,150"
              stroke="rgba(255,77,109,0.6)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/>
            <!-- Target cell curve: glow + line -->
            <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
              stroke="rgba(0,212,255,0.2)" stroke-width="9" stroke-linecap="round"/>
            <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
              stroke="rgba(0,212,255,0.88)" stroke-width="2" stroke-linecap="round"/>
            <!-- Animated operating point: halo + dot sweeping back and forth -->
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
            <!-- Legend -->
            <line x1="28" y1="175" x2="46" y2="175" stroke="rgba(0,212,255,0.85)" stroke-width="1.5"/>
            <text x="50" y="178" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.85)">Target</text>
            <line x1="104" y1="175" x2="122" y2="175"
              stroke="rgba(255,77,109,0.65)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <text x="126" y="178" font-family="monospace" font-size="7" fill="rgba(255,77,109,0.65)">Healthy</text>
          </svg>
          <p class="home__sci-sublabel">{{ $t('home.sciChartSub') }}</p>
        </div>

      </div>

      <!-- 3-step workflow -->
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

      <!-- Feature cards (3 cols) -->
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

        <!-- Stats card -->
        <div class="home__feature-card home__feature-card--stats">
          <div class="home__stats-grid">
            <div v-for="s in homeStats" :key="s" class="home__stat">
              <span class="home__stat-val">{{ $t(`home.${s}Val`) }}</span>
              <span class="home__stat-label">{{ $t(`home.${s}Label`) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Research scope tags -->
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'HomeView',

  data() {
    return {
      ICON,

      capPills: [
        { icon: ICON.WAVE,        key: 'capVm' },
        { icon: ICON.SELECTIVITY, key: 'capSelectivity' },
        { icon: ICON.LYSIS_BOLT,  key: 'capPulse' },
        { icon: ICON.RELOAD,      key: 'capSweep' },
        { icon: ICON.GRID,        key: 'capPop' },
        { icon: ICON.FLASK,       key: 'capImp' },
        { icon: ICON.NOURISH,     key: 'capBio' },
        { icon: ICON.LYSIS_BOLT,  key: 'capDr' },
        { icon: ICON.DEP,         key: 'capDep' },
      ],

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

  /* Rotating electric-field topology — conic gradient sectors, very slow spin.
     Represents the phasor rotation of the applied RF field.
     Hidden on phones: decorative only, no layout impact. */
  &__bg-field {
    position: absolute;
    // Oversized so the corners stay filled during rotation
    inset: -30%;
    width: 160%;
    height: 160%;
    background: conic-gradient(
      from 0deg at 50% 80%,
      transparent           0deg,
      rgba(0, 212, 255, 0.045)  40deg,
      transparent          90deg,
      rgba(167, 139, 250, 0.03) 130deg,
      transparent          180deg,
      rgba(0, 212, 255, 0.045)  220deg,
      transparent          270deg,
      rgba(167, 139, 250, 0.03) 310deg,
      transparent          360deg
    );
    mask-image: radial-gradient(ellipse 80% 60% at 50% 100%, black 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    display: none;

    @media (min-width: 768px) {
      display: block;
      animation: bg-field-rotate 60s linear infinite;
    }
  }

  @keyframes bg-field-rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* Expanding RF pulse rings — origin at bottom-centre so they expand upward
     into negative space below the content, never across the hero text.
     Four rings staggered by 2.5 s each, cycling every 10 s.
     Hidden on phones. */
  &__bg-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  &__bg-ring {
    position: absolute;
    border-radius: 50%;
    width: 220px;
    height: 220px;
    // Centre the ring origin at bottom-centre of the home section.
    // bottom: -110px puts the ring's geometric centre on the bottom edge.
    bottom: -110px;
    left: calc(50% - 110px);
    border: 1px solid rgba(0, 212, 255, 0.18);
    display: none;

    @media (min-width: 768px) {
      display: block;
      animation: bg-ring-expand 10s ease-out infinite;
    }

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 2.5s; }
    &:nth-child(3) { animation-delay: 5s; }
    &:nth-child(4) { animation-delay: 7.5s; }
  }

  @keyframes bg-ring-expand {
    // Rings scale from 0.3 (66px radius) up to 5 (550px radius).
    // At 550px from the bottom edge they cover most of the page height
    // but are nearly invisible (opacity → 0) long before that.
    0%   { transform: scale(0.3); opacity: 0.55; border-color: rgba(0, 212, 255, 0.2); }
    40%  { opacity: 0.2;          border-color: rgba(167, 139, 250, 0.1); }
    100% { transform: scale(5);   opacity: 0;    border-color: rgba(167, 139, 250, 0); }
  }

  &__inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.8rem;
    padding: 3rem 2rem;
    max-width: 900px;
    width: 100%;
  }

  /* ── Logo ────────────────────────────────────────────────────── */
  &__logo-wrap {
    position: relative;
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--color-primary);
    animation: ring-expand 5s ease-out infinite;

    &--1 { width: 90px;  height: 90px;  animation-delay: 0s;    opacity: 0.8; }
    &--2 { width: 130px; height: 130px; animation-delay: 1.25s; opacity: 0.5; }
    &--3 { width: 160px; height: 160px; animation-delay: 2.5s;  opacity: 0.3; }
    &--4 { width: 185px; height: 185px; animation-delay: 3.75s; opacity: 0.15; }
  }

  &__logo-circle {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 36px rgba(0, 212, 255, 0.5), 0 0 72px rgba(0, 212, 255, 0.2);
    border: 1.5px solid var(--color-primary);
    background-color: var(--color-bg);

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
    @include mono-upper(0.68rem, 0.15em);
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

  /* ── Capability pills - two explicit rows of 4 ───────────────── */
  &__caps {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  &__caps-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: nowrap;

    @media (max-width: 520px) {
      flex-wrap: wrap;
    }
  }

  &__cap {
    @include mono-upper(0.65rem, 0.06em);
    padding: 0.22rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    color: var(--color-text-muted);
    background-color: var(--color-surface);
    white-space: nowrap;
  }

  /* ── CTA buttons ─────────────────────────────────────────────── */
  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    width: 100%;
    max-width: 520px;
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
      align-items: center;
      justify-content: center;
      gap: 2rem;
      width: 100%;
    }
  }

  &__sci-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  &__sci-label {
    font-family: monospace;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(0, 212, 255, 0.72);
    margin: 0;
  }

  &__sci-sublabel {
    font-family: monospace;
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.38);
    margin: 0;
  }

  &__sci-divider {
    width: 1px;
    height: 140px;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(0, 212, 255, 0.25) 30%,
      rgba(0, 212, 255, 0.25) 70%,
      transparent
    );
    flex-shrink: 0;
  }

  &__cell-svg {
    width: 130px;
    height: 165px;
  }

  &__bode-svg {
    width: 160px;
    height: 116px;
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
    gap: 0.75rem;
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
    &__inner {
      gap: 1.4rem;
      padding: 2rem 1.5rem;
    }

    &__logo-wrap {
      width: 140px;
      height: 140px;
    }

    &__ring {
      &--1 { width: 68px;  height: 68px; }
      &--2 { width: 98px;  height: 98px; }
      &--3 { width: 122px; height: 122px; }
      &--4 { width: 140px; height: 140px; }
    }

    &__logo-circle {
      width: 68px;
      height: 68px;
    }

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
    &__inner {
      gap: 1.2rem;
      padding: 1.5rem 1rem;
    }

    &__logo-wrap {
      width: 120px;
      height: 120px;
    }

    &__ring {
      &--1 { width: 58px;  height: 58px; }
      &--2 { width: 84px;  height: 84px; }
      &--3 { width: 104px; height: 104px; }
      &--4 { width: 122px; height: 122px; }
    }

    &__logo-circle {
      width: 58px;
      height: 58px;
    }

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

    // Flatten two rows into one horizontal scroll strip
    &__caps {
      flex-direction: row;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: visible;
      padding-bottom: 0.25rem;
      // hide scrollbar visually while keeping it functional
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    &__caps-row {
      display: contents; // unwrap, pills become direct children of __caps
    }

    &__cap {
      font-size: 0.62rem;
      padding: 0.22rem 0.5rem;
      flex-shrink: 0;
    }
  }
}

/* ── Animations ──────────────────────────────────────────────────────── */
@keyframes ring-expand {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 0; }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@keyframes pulse-glow {
  0%, 100% { text-shadow: 0 0 22px rgba(0, 212, 255, 0.2); }
  50%       { text-shadow: 0 0 50px rgba(0, 212, 255, 0.65); }
}
</style>
