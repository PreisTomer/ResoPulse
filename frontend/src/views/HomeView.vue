<template>
  <div class="home">
    <!-- Animated background grid -->
    <div class="home__bg-grid" aria-hidden="true"></div>

    <div class="home__inner">
      <!-- Logo + rings -->
      <div class="home__logo-wrap" aria-hidden="true">
        <div class="home__ring home__ring--1"></div>
        <div class="home__ring home__ring--2"></div>
        <div class="home__ring home__ring--3"></div>
        <div class="home__ring home__ring--4"></div>
        <div class="home__logo-circle">
          <img src="/logo.png" alt="BioResonance" />
        </div>
      </div>

      <!-- Eyebrow -->
      <div class="home__eyebrow">
        <span class="home__eyebrow-dot"></span>
        Membrane Biophysics · Electric Fields · Acoustic Resonance
      </div>

      <!-- Title -->
      <h1 class="home__title">
        Bio<span class="home__title-accent">Resonance</span>
      </h1>
      <p class="home__tagline">
        A computational platform for studying how pulsed electric fields interact with
        biological membranes. Model cancer cell selective disruption, acoustic resonance
        targeting of viral capsids and bacterial cell walls, and SAR thermal response —
        built on the Schwan dielectric model and Lorentzian acoustic resonance theory.
      </p>

      <!-- Capability pills -->
      <div class="home__caps">
        <span class="home__cap">◈ Schwan Dielectric Model</span>
        <span class="home__cap">◎ Lorentzian Acoustic Resonance</span>
        <span class="home__cap">⊕ SAR Thermal Model</span>
        <span class="home__cap">⇌ Socket.IO Instrument Sync</span>
        <span class="home__cap">⊞ 10-Preset Cell Library</span>
        <span class="home__cap">↯ nsEP Pulse Selectivity</span>
      </div>

      <!-- CTA -->
      <div class="home__actions">
        <RouterLink to="/experiment" class="home__btn home__btn--primary">
          Run Simulation <span class="home__btn-arrow">⟶</span>
        </RouterLink>
        <RouterLink to="/protocol" class="home__btn home__btn--ghost">Read the Science <span class="home__btn-arrow">⟶</span></RouterLink>
      </div>

      <!-- Feature cards -->
      <div class="home__feature-cards">
        <RouterLink to="/experiment" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">⚗</span>
            <span class="home__fc-title">Experiment Lab</span>
          </div>
          <span class="home__fc-desc">Configure frequency, field intensity, waveform, and propagation medium. Observe live Schwan transmembrane potential, disruption ratios, and SAR thermal response for any target–reference cell pair.</span>
        </RouterLink>
        <RouterLink to="/datasets" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">⊞</span>
            <span class="home__fc-title">Cell Library</span>
          </div>
          <span class="home__fc-desc">Ten biologically-realistic presets: reference epithelials, four cancer lines (Adeno, GBM, MCF-7, HL-60), gram-negative and gram-positive bacteria, and two enveloped RNA viruses.</span>
        </RouterLink>
        <RouterLink to="/protocol" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">§</span>
            <span class="home__fc-title">Physics &amp; Protocol</span>
          </div>
          <span class="home__fc-desc">Full derivation of the Schwan equation, SAR thermal model, Lorentzian acoustic resonance, and nsEP pulse-width selectivity — with a 9-step experimental protocol.</span>
        </RouterLink>
        <RouterLink to="/reports" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">◎</span>
            <span class="home__fc-title">Session Reports</span>
          </div>
          <span class="home__fc-desc">Log experiment readings, track selectivity ratios across frequency sweeps, and export structured CSV data with all Schwan parameters for downstream statistical analysis.</span>
        </RouterLink>
      </div>

      <!-- Research scope tags -->
      <div class="home__scope-tags">
        <span class="home__scope-tag home__scope-tag--cancer">Cancer</span>
        <span class="home__scope-tag home__scope-tag--bacteria">Bacteria</span>
        <span class="home__scope-tag home__scope-tag--virus">Viruses</span>
        <span class="home__scope-tag home__scope-tag--ref">Cell Membranes</span>
      </div>

      <!-- Disclaimer -->
      <p class="home__disclaimer">
        for research visualisation only · not a medical device
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({})
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
  overflow-x: hidden; // vertical must NOT be hidden — content overflows on small phones

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
    max-width: 780px;
  }

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

  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.75rem, 0.14em);
    color: var(--color-primary);

    &-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background-color: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary);
      animation: blink 2s ease-in-out infinite;
    }
  }

  &__title {
    font-size: clamp(3rem, 7vw, 5.5rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--color-text-heading);
    margin: 0;

    &-accent {
      color: #0a2e58;
      -webkit-text-stroke: 1.5px var(--color-primary);
      paint-order: stroke fill;
      animation: res-glow 9s ease-in-out infinite;
    }
  }

  &__tagline {
    font-size: 1rem;
    color: var(--color-text-muted);
    line-height: 1.75;
    max-width: 600px;
    margin: 0;
  }

  &__caps {
    display: grid;
    grid-template-columns: repeat(3, auto);
    justify-content: center;
    gap: 0.55rem;
  }

  &__cap {
    @include mono-upper(0.67rem, 0.07em);
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    color: var(--color-text-muted);
    background-color: var(--color-surface);
    white-space: nowrap;
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    width: 100%;
    max-width: 640px;
  }

  &__btn {
    padding: 0.75rem 1.75rem;
    border-radius: var(--radius);
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.18s;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;

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

    &:hover &-arrow { transform: translateX(4px); }
  }

  &__btn-arrow {
    display: inline-block;
    margin-left: 0.3rem;
    transition: transform 0.18s ease;
  }

  &__feature-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    width: 100%;
    max-width: 640px;
  }

  &__feature-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-align: left;
    transition: border-color 0.18s, box-shadow 0.18s;

    &:hover {
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 0 16px rgba(0, 212, 255, 0.08);
      text-decoration: none;
    }
  }

  &__fc {
    &-header { display: flex; align-items: center; gap: 0.45rem; }
    &-icon   { font-size: 1rem; opacity: 0.75; flex-shrink: 0; }
    &-title  { font-size: 0.82rem; font-weight: 600; color: var(--color-text-heading); }
    &-desc   { font-size: 0.72rem; color: var(--color-text-muted); line-height: 1.6; }
  }

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
    opacity: 0.45;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
  }
}

@keyframes ring-expand {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 0; }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@keyframes res-glow {
  0%, 100% { text-shadow: 0 0 22px rgba(0, 212, 255, 0.2); }
  50%       { text-shadow: 0 0 44px rgba(0, 212, 255, 0.52); }
}

// Media queries → _responsive.scss
</style>
