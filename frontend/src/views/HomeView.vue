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
          <img src="/logo.png" alt="BioResonance" />
        </div>
      </div>

      <!-- Eyebrow -->
      <div class="home__eyebrow">
        <span class="home__eyebrow-dot"></span>
        Bioelectric Field Research · Electroporation · Acoustic Disruption
      </div>

      <!-- Title -->
      <h1 class="home__title">
        Bio<span class="home__title-accent">Resonance</span>
      </h1>

      <!-- Tagline -->
      <p class="home__tagline">
        A computational workbench for pulsed electric field research. Model how
        field protocols selectively disrupt cancer cells, bacteria, and viruses —
        quantify the therapeutic safety margin and spare healthy tissue.
      </p>

      <!-- Capability pills -->
      <div class="home__caps">
        <span class="home__cap">∿ Transmembrane Voltage</span>
        <span class="home__cap">⊙ Selectivity &amp; Therapeutic Index</span>
        <span class="home__cap">↯ Nanosecond Pulse Selectivity</span>
        <span class="home__cap">⟳ Field &amp; Frequency Sweep</span>
        <span class="home__cap">⊞ Population Distribution Model</span>
        <span class="home__cap">⚗ Live Impedance Feedback</span>
      </div>

      <!-- CTA -->
      <div class="home__actions">
        <RouterLink to="/experiment" class="home__btn home__btn--primary">
          Open Experiment Lab <span class="home__btn-arrow">⟶</span>
        </RouterLink>
        <RouterLink to="/protocol" class="home__btn home__btn--ghost">
          Read the Science <span class="home__btn-arrow">⟶</span>
        </RouterLink>
      </div>

      <!-- 3-step workflow -->
      <div class="home__workflow">
        <div class="home__wf-step">
          <span class="home__wf-num">01</span>
          <span class="home__wf-label">Select Cells</span>
          <span class="home__wf-desc">Pick any of 10 presets — cancer lines, bacteria, viruses, or healthy reference — and pair a target against a healthy baseline.</span>
        </div>
        <span class="home__wf-arrow" aria-hidden="true">⟶</span>
        <div class="home__wf-step">
          <span class="home__wf-num">02</span>
          <span class="home__wf-label">Design Protocol</span>
          <span class="home__wf-desc">Set frequency, field intensity, waveform, duty cycle, and pulse width. Watch transmembrane voltage, disruption ratio, and temperature update live.</span>
        </div>
        <span class="home__wf-arrow" aria-hidden="true">⟶</span>
        <div class="home__wf-step">
          <span class="home__wf-num">03</span>
          <span class="home__wf-label">Optimise &amp; Export</span>
          <span class="home__wf-desc">Sweep parameters to find the therapeutic window, monitor impedance drift, and export a full Methods section for your publication.</span>
        </div>
      </div>

      <!-- Feature cards (3 cols) -->
      <div class="home__feature-cards">

        <RouterLink to="/experiment" class="home__feature-card home__feature-card--primary">
          <div class="home__fc-header">
            <span class="home__fc-icon">⚗</span>
            <span class="home__fc-title">Experiment Lab</span>
          </div>
          <span class="home__fc-desc">Live Schwan Vm, disruption ratios, SAR temperature, frequency response chart, field &amp; frequency sweep, and cell population distribution — all in one workspace.</span>
        </RouterLink>

        <RouterLink to="/instrument" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">⏻</span>
            <span class="home__fc-title">Instrument Panel</span>
          </div>
          <span class="home__fc-desc">Tracks cuvette impedance as cells lyse, computes corrected generator voltage, and sonifies live physics data via the Web Audio API.</span>
        </RouterLink>

        <RouterLink to="/reports" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">◎</span>
            <span class="home__fc-title">Session Reports</span>
          </div>
          <span class="home__fc-desc">Log every reading and lysis event. Export structured CSV data and publication-ready Materials &amp; Methods text per logged entry.</span>
        </RouterLink>

        <RouterLink to="/datasets" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">⊞</span>
            <span class="home__fc-title">Cell Library</span>
          </div>
          <span class="home__fc-desc">10 biologically-grounded presets: reference hepatocytes, 4 cancer lines, E. coli, MRSA, Influenza A, and SARS-CoV-2 — with computed Cm, τ, and fc.</span>
        </RouterLink>

        <RouterLink to="/protocol" class="home__feature-card">
          <div class="home__fc-header">
            <span class="home__fc-icon">§</span>
            <span class="home__fc-title">Physics &amp; Protocol</span>
          </div>
          <span class="home__fc-desc">Full derivations for Schwan Vm, SAR, Lorentzian resonance, nsEP pulse selectivity, impedance feedback, and sonification — plus a 12-step experimental guide.</span>
        </RouterLink>

        <!-- Stats card -->
        <div class="home__feature-card home__feature-card--stats">
          <div class="home__stats-grid">
            <div class="home__stat">
              <span class="home__stat-val">10</span>
              <span class="home__stat-label">Cell Presets</span>
            </div>
            <div class="home__stat">
              <span class="home__stat-val">12</span>
              <span class="home__stat-label">Protocol Steps</span>
            </div>
            <div class="home__stat">
              <span class="home__stat-val">1 GHz</span>
              <span class="home__stat-label">Max Frequency</span>
            </div>
            <div class="home__stat">
              <span class="home__stat-val">22</span>
              <span class="home__stat-label">References</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Research scope tags -->
      <div class="home__scope-tags">
        <span class="home__scope-tag home__scope-tag--cancer">Cancer</span>
        <span class="home__scope-tag home__scope-tag--bacteria">Bacteria</span>
        <span class="home__scope-tag home__scope-tag--virus">Viruses</span>
        <span class="home__scope-tag home__scope-tag--ref">Cell Membranes</span>
      </div>

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

  /* ── Capability pills ────────────────────────────────────────── */
  &__caps {
    display: grid;
    grid-template-columns: repeat(3, auto);
    justify-content: center;
    gap: 0.55rem;
  }

  &__cap {
    @include mono-upper(0.67rem, 0.07em);
    padding: 0.25rem 0.65rem;
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
    padding: 0.75rem 1.5rem;
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
    margin-left: 0.4rem;
    transition: transform 0.18s ease;
  }

  /* ── 3-step workflow ─────────────────────────────────────────── */
  &__workflow {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0.6rem;
    width: 100%;
    max-width: 820px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
    padding: 1.2rem 1.4rem;
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
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

    &--primary {
      grid-column: 1;
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
    opacity: 0.45;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
  }
}

/* ── Animations ──────────────────────────────────────────────────────── */
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
