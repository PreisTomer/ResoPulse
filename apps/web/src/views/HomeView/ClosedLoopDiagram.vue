<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="loop">

    <header class="loop__header">
      <span class="loop__eyebrow">{{ $t('home.loopEyebrow') }}</span>
      <h2 class="loop__title">{{ $t('home.loopTitle') }}</h2>
      <p class="loop__subtitle">{{ $t('home.loopSubtitle') }}</p>
    </header>

    <div class="loop__cycle" role="img" :aria-label="$t('home.loopTitle')">
      <svg class="loop__svg" viewBox="0 0 640 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="loopStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stop-color="var(--color-primary)" stop-opacity="0.95" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.55" />
          </linearGradient>
          <filter id="loopGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle cx="320" cy="320" r="200" class="loop__ring" />
        <circle cx="320" cy="320" r="200" class="loop__ring loop__ring--pulse" />

        <g v-for="arc in arcs" :key="arc.id" class="loop__arc-group">
          <path :d="arc.d" class="loop__arc" :style="{ '--arc-i': arc.i }" />
          <polygon :points="arc.head" class="loop__arrow" />
        </g>

        <circle class="loop__orbit" cx="320" cy="320" r="200" pathLength="1" />
      </svg>

      <div
        v-for="(step, i) in steps"
        :key="step.key"
        class="loop__node"
        :class="[`loop__node--${step.key}`, { 'loop__node--active': activeIdx === i }]"
        :style="nodeStyle(i)"
      >
        <span class="loop__node-badge">
          <span class="loop__node-num">0{{ i + 1 }}</span>
          <span class="loop__node-icon" aria-hidden="true">{{ step.icon }}</span>
        </span>
        <div class="loop__node-body">
          <span class="loop__node-label">{{ $t(`home.loopStep${i + 1}Label`) }}</span>
          <span class="loop__node-tag">{{ $t(`home.loopStep${i + 1}Tag`) }}</span>
          <p class="loop__node-desc">{{ $t(`home.loopStep${i + 1}Desc`) }}</p>
        </div>
      </div>
    </div>

    <div class="loop__benefits">
      <h3 class="loop__benefits-title">{{ $t('home.loopBenefitsTitle') }}</h3>
      <div class="loop__benefits-grid">
        <div v-for="b in benefits" :key="b.key" class="loop__benefit">
          <span class="loop__benefit-icon" aria-hidden="true">{{ b.icon }}</span>
          <span class="loop__benefit-title">{{ $t(`home.${b.key}Title`) }}</span>
          <span class="loop__benefit-desc">{{ $t(`home.${b.key}Desc`) }}</span>
          <span class="loop__benefit-meta">{{ $t(`home.${b.key}Meta`) }}</span>
        </div>
      </div>
    </div>

    <RouterLink :to="ROUTE.PROTOCOL" class="loop__physics-strip" v-tip="$t('home.loopCtaRefs')">
      <span class="loop__physics-strip-intro">{{ $t('home.loopPhysicsStripIntro') }}</span>
      <span class="loop__physics-strip-body">{{ $t('home.loopPhysicsStripBody') }}</span>
      <span class="loop__physics-strip-cta">{{ $t('home.loopPhysicsStripCta') }} {{ ICON.ARROW_SHORT }}</span>
    </RouterLink>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

interface Step { key: string; icon: string }
interface Arc  { id: string; i: number; d: string; head: string }

const R      = 200
const CX     = 320
const CY     = 320
const CYCLE_MS = 6400

function polar(angleRad: number, radius: number) {
  return { x: CX + Math.cos(angleRad) * radius, y: CY + Math.sin(angleRad) * radius }
}

function buildArc(startAngle: number, endAngle: number): { d: string; head: string } {
  const s = polar(startAngle, R)
  const e = polar(endAngle,   R)
  const d = `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${R} ${R} 0 0 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`

  const tipAngle    = endAngle - 0.04
  const tangent     = endAngle + Math.PI / 2
  const tip         = polar(tipAngle, R)
  const headSize    = 10
  const headBaseL   = { x: tip.x + Math.cos(tangent + 0.35) * headSize, y: tip.y + Math.sin(tangent + 0.35) * headSize }
  const headBaseR   = { x: tip.x + Math.cos(tangent - 0.35) * headSize, y: tip.y + Math.sin(tangent - 0.35) * headSize }
  const head = `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${headBaseL.x.toFixed(1)},${headBaseL.y.toFixed(1)} ${headBaseR.x.toFixed(1)},${headBaseR.y.toFixed(1)}`

  return { d, head }
}

export default defineComponent({
  name: 'ClosedLoopDiagram',

  data() {
    const steps: Step[] = [
      { key: 'predict',   icon: ICON.WAVE        },
      { key: 'measure',   icon: ICON.FLASK       },
      { key: 'calibrate', icon: ICON.RELOAD      },
      { key: 'suggest',   icon: ICON.SELECTIVITY },
    ]
    const benefits = [
      { key: 'loopBenefit1', icon: ICON.CHECK     },
      { key: 'loopBenefit2', icon: ICON.RETICLE   },
      { key: 'loopBenefit3', icon: ICON.INFO      },
    ]
    return {
      steps,
      benefits,
      activeIdx: 0,
      cycleTimer: null as ReturnType<typeof setInterval> | null,
    }
  },

  mounted() {
    this.cycleTimer = setInterval(() => {
      this.activeIdx = (this.activeIdx + 1) % this.steps.length
    }, CYCLE_MS / this.steps.length)
  },

  beforeUnmount() {
    if (this.cycleTimer !== null) clearInterval(this.cycleTimer)
  },

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },

    arcs(): Arc[] {
      const n    = this.steps.length
      const gap  = 0.18
      return this.steps.map((step, i) => {
        const start = -Math.PI / 2 + (i / n) * Math.PI * 2 + gap
        const end   = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2 - gap
        const arc   = buildArc(start, end)
        return { id: step.key, i, d: arc.d, head: arc.head }
      })
    },
  },

  methods: {
    nodeStyle(i: number): Record<string, string> {
      const angle = -Math.PI / 2 + (i / this.steps.length) * Math.PI * 2
      const x = 50 + (Math.cos(angle) * R) / 6.4
      const y = 50 + (Math.sin(angle) * R) / 6.4
      return { left: `${x}%`, top: `${y}%` }
    },
  },
})
</script>

<style lang="scss" scoped>
.loop {
  @include flex-col(1.5rem);
  align-items: center;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  position: relative;

  &__header {
    @include flex-col(0.55rem);
    align-items: center;
    text-align: center;
    max-width: 720px;
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xs), 0.14em);
    color: var(--color-primary);
    padding: 0.25rem 0.8rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }

  &__title {
    margin: 0;
    font-size: clamp(1.6rem, 3.2vw, 2.3rem);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.2;
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.55;
    max-width: 620px;
  }

  &__cycle {
    position: relative;
    width: 100%;
    max-width: 640px;
    aspect-ratio: 1 / 1;
    display: none;
    @media (min-width: 900px) { display: block; }
  }

  &__svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  &__ring {
    fill: none;
    stroke: color-mix(in srgb, var(--color-primary) 12%, transparent);
    stroke-width: 1;
    stroke-dasharray: 3 5;

    &--pulse {
      stroke: var(--color-primary);
      stroke-width: 1.5;
      opacity: 0.08; // intentional: near-invisible ambient pulse stroke
      stroke-dasharray: none;
      animation: loop-pulse 3s ease-out infinite;
    }
  }

  &__arc {
    fill: none;
    stroke: url(#loopStroke);
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.85; // intentional: arc slightly dimmer than full, between --op-strong and --op-partial
    filter: url(#loopGlow);
  }

  &__arrow {
    fill: var(--color-primary);
    opacity: var(--op-strong);
  }

  &__orbit {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 0.05 0.95;
    stroke-dashoffset: 0;
    animation: loop-orbit 7s linear infinite;
    filter: url(#loopGlow);
    opacity: var(--op-partial);
  }

  &__node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 220px;
    @include flex-col(0.4rem);
    padding: 0.85rem 0.95rem;
    background: color-mix(in srgb, var(--color-bg) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(6px);
    transition: border-color var(--tr-normal), transform var(--tr-normal), box-shadow var(--tr-normal);

    &--active {
      border-color: var(--color-primary);
      transform: translate(-50%, -50%) scale(1.04);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent),
                  0 12px 32px color-mix(in srgb, var(--color-primary) 25%, transparent);
    }
  }

  &__node-badge {
    @include flex-row(0.5rem);
    align-items: center;
  }

  &__node-num {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-primary);
    opacity: var(--op-muted);
  }

  &__node-icon {
    font-size: var(--fs-lg);
    color: var(--color-primary);
  }

  &__node-body {
    @include flex-col(0.2rem);
  }

  &__node-label {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__node-tag {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__node-desc {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  // ── Narrow-viewport fallback: stack nodes vertically ─────────────────────────
  @media (max-width: 899px) {
    .loop__node {
      position: static;
      transform: none;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;

      &--active { transform: none; }
    }
  }

  &__benefits {
    @include flex-col(0.9rem);
    align-items: center;
    width: 100%;
    max-width: 960px;
    margin-top: 1rem;
  }

  &__benefits-title {
    @include mono-upper(var(--fs-xs), 0.14em);
    margin: 0;
    color: var(--color-primary);
  }

  &__benefits-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    width: 100%;

    @media (min-width: 700px) { grid-template-columns: repeat(3, 1fr); }
  }

  &__benefit {
    @include flex-col(0.35rem);
    padding: 0.9rem 1rem;
    background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
    border-radius: var(--radius);
  }

  &__benefit-icon {
    font-size: var(--fs-lg);
    color: var(--color-primary);
  }

  &__benefit-title {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
  }

  &__benefit-desc {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__benefit-meta {
    @include mono-upper(var(--fs-xxs), 0.1em);
    margin-top: 0.25rem;
    color: var(--color-primary);
    opacity: var(--op-strong);
  }

  /* ── Physics grounding strip ────────────────────────────────────────────── */
  &__physics-strip {
    @include flex-row(0.75rem);
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    width: 100%;
    max-width: 960px;
    margin-top: 0.2rem;
    padding: 0.7rem 1rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-primary) 3%, transparent);
    text-decoration: none;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    }
  }

  &__physics-strip-intro {
    @include mono-upper(var(--fs-xxs), 0.14em);
    color: var(--color-primary);
  }

  &__physics-strip-body {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
    text-align: center;
    flex: 1 1 auto;
  }

  &__physics-strip-cta {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-primary);
    flex-shrink: 0;
  }
}

@keyframes loop-pulse {
  0%   { opacity: 0.08; transform: scale(1); transform-origin: 320px 320px; }
  50%  { opacity: 0.22; transform: scale(1.02); transform-origin: 320px 320px; }
  100% { opacity: 0.08; transform: scale(1); transform-origin: 320px 320px; }
}

@keyframes loop-orbit {
  to { stroke-dashoffset: -1; }
}
</style>
