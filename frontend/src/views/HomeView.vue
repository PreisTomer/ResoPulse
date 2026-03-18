<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home">
    <div class="home__bg-grid" aria-hidden="true"></div>

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
