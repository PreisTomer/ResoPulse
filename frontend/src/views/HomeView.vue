<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({})
</script>

<template>
  <div class="home">
    <!-- Animated background grid -->
    <div class="bg-grid" aria-hidden="true"></div>

    <div class="home-inner">
      <!-- Logo + rings -->
      <div class="logo-ring-wrap" aria-hidden="true">
        <div class="ring ring--1"></div>
        <div class="ring ring--2"></div>
        <div class="ring ring--3"></div>
        <div class="ring ring--4"></div>
        <div class="logo-circle">
          <img src="/logo.jpg" alt="BioResonance" />
        </div>
      </div>

      <!-- Eyebrow -->
      <div class="eyebrow">
        <span class="eyebrow-dot"></span>
        Bioelectric Field Research Platform
      </div>

      <!-- Title -->
      <h1 class="title">
        Bio<span class="title-accent">Resonance</span>
      </h1>
      <p class="tagline">
        Precision visualisation of transmembrane potential, selective disruption,
        and thermal response across cancer cells, bacteria, and viral particles.
      </p>

      <!-- Capability pills -->
      <div class="caps">
        <span class="cap">◈ Schwan Equation Model</span>
        <span class="cap">◎ Size-Selective Disruption</span>
        <span class="cap">⊞ Multi-Pathogen Library</span>
        <span class="cap">⇌ Real-Time Instrument Sync</span>
      </div>

      <!-- CTA -->
      <div class="actions">
        <RouterLink to="/experiment" class="btn btn-primary">
          Open Experiment Lab →
        </RouterLink>
        <RouterLink to="/protocol" class="btn btn-ghost">View Protocol Documentation</RouterLink>
      </div>

      <!-- Research scope tags -->
      <div class="scope-tags">
        <span class="scope-tag scope-tag--cancer">Cancer</span>
        <span class="scope-tag scope-tag--bacteria">Bacteria</span>
        <span class="scope-tag scope-tag--virus">Viruses</span>
        <span class="scope-tag scope-tag--ref">Cell Membranes</span>
      </div>

      <!-- Disclaimer -->
      <p class="disclaimer">
        Schwan equation biophysics model · for research visualisation only ·
        not a medical device
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────── */
.home {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
  position: relative;
  overflow: hidden;
}

/* ── Animated grid background ────────────────────────────────────────── */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  pointer-events: none;
}

/* ── Center content ──────────────────────────────────────────────────── */
.home-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  padding: 3rem 2rem;
  max-width: 720px;
}

/* ── Logo + ring animation ───────────────────────────────────────────── */
.logo-ring-wrap {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--color-primary);
  animation: ring-expand 5s ease-out infinite;
}
.ring--1 { width: 90px;  height: 90px;  animation-delay: 0s;    opacity: 0.8; }
.ring--2 { width: 130px; height: 130px; animation-delay: 1.25s; opacity: 0.5; }
.ring--3 { width: 160px; height: 160px; animation-delay: 2.5s;  opacity: 0.3; }
.ring--4 { width: 185px; height: 185px; animation-delay: 3.75s; opacity: 0.15; }

@keyframes ring-expand {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 0; }
}

.logo-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 36px rgba(0, 212, 255, 0.5), 0 0 72px rgba(0, 212, 255, 0.2);
  border: 1.5px solid var(--color-primary);
}
.logo-circle img {
  width: 100%; height: 100%;
  object-fit: cover; transform: scale(1.7); display: block;
}

/* ── Eyebrow ─────────────────────────────────────────────────────────── */
.eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-family: var(--font-mono);
}
.eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
  animation: blink 2s ease-in-out infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ── Title ───────────────────────────────────────────────────────────── */
.title {
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--color-text-heading);
  margin: 0;
}
.title-accent {
  color: var(--color-primary);
  text-shadow: 0 0 40px rgba(0, 212, 255, 0.4);
}

/* ── Tagline ─────────────────────────────────────────────────────────── */
.tagline {
  font-size: 1rem;
  color: var(--color-text-muted);
  line-height: 1.75;
  max-width: 560px;
  margin: 0;
}

/* ── Capability pills ────────────────────────────────────────────────── */
.caps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
}
.cap {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  color: var(--color-text-muted);
  background-color: var(--color-surface);
  white-space: nowrap;
}

/* ── CTA buttons ─────────────────────────────────────────────────────── */
.actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  padding: 0.75rem 1.75rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.18s;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
}
.btn-primary {
  background-color: var(--color-primary);
  color: #060e1a;
  box-shadow: 0 0 24px rgba(0, 212, 255, 0.35);
}
.btn-primary:hover {
  filter: brightness(1.12);
  box-shadow: 0 0 36px rgba(0, 212, 255, 0.55);
  text-decoration: none;
}
.btn-ghost {
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.btn-ghost:hover { border-color: var(--color-primary); color: var(--color-primary); text-decoration: none; }

/* ── Scope tags ──────────────────────────────────────────────────────── */
.scope-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
.scope-tag {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.15rem 0.55rem;
  border-radius: 3px;
  border: 1px solid transparent;
}
.scope-tag--cancer   { color: #ff4d6d; border-color: rgba(255,77,109,0.35); background: rgba(255,77,109,0.07); }
.scope-tag--bacteria { color: #fbbf24; border-color: rgba(251,191,36,0.35); background: rgba(251,191,36,0.07); }
.scope-tag--virus    { color: #a78bfa; border-color: rgba(167,139,250,0.35); background: rgba(167,139,250,0.07); }
.scope-tag--ref      { color: #00d4ff; border-color: rgba(0,212,255,0.35); background: rgba(0,212,255,0.07); }

/* ── Disclaimer ──────────────────────────────────────────────────────── */
.disclaimer {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: 0.45;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .logo-ring-wrap { width: 140px; height: 140px; }
  .logo-circle    { width: 70px; height: 70px; }
  .ring--3, .ring--4 { display: none; }
  .actions { flex-direction: column; align-items: stretch; }
  .btn { justify-content: center; }
}
</style>
