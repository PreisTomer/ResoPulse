<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="closed-loop">
    <header class="closed-loop__header">
      <span class="closed-loop__eyebrow">{{ $t('home.loopEyebrow') }}</span>
      <h2 class="closed-loop__title">{{ $t('home.loopTitle') }}</h2>
      <p class="closed-loop__subtitle">{{ $t('home.loopSubtitle') }}</p>
    </header>

    <svg
      class="closed-loop__svg"
      viewBox="0 0 900 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="loop-rail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="var(--color-primary)" stop-opacity="0.35" />
          <stop offset="50%"  stop-color="var(--color-primary)" stop-opacity="0.85" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.35" />
        </linearGradient>
        <radialGradient id="loop-particle" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="var(--color-primary)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
        </radialGradient>
        <marker id="loop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="color-mix(in srgb, var(--color-primary) 70%, transparent)" />
        </marker>
      </defs>

      <!-- Calibration return arc: measured outcomes feed back to the engine -->
      <path class="closed-loop__arc"
        d="M 770 150 C 640 36, 260 36, 130 150"
        fill="none"
        stroke="color-mix(in srgb, var(--color-primary) 40%, transparent)"
        stroke-width="1.5"
        stroke-dasharray="5 6"
        marker-end="url(#loop-arrow)"
      />
      <text x="450" y="42" text-anchor="middle"
        fill="var(--color-primary)" opacity="0.7"
        font-family="var(--font-mono, monospace)" font-size="11" letter-spacing="0.04em">
        {{ $t('home.loopReturnLabel') }}
      </text>

      <!-- Forward rails: lab run feeds the engine, engine emits a prediction -->
      <line x1="215" y1="202" x2="363" y2="202" stroke="url(#loop-rail)" stroke-width="1.5" stroke-dasharray="4 6" marker-end="url(#loop-arrow)" />
      <line x1="535" y1="202" x2="683" y2="202" stroke="url(#loop-rail)" stroke-width="1.5" stroke-dasharray="4 6" marker-end="url(#loop-arrow)" />

      <!-- Node: Lab run -->
      <g transform="translate(45, 150)">
        <rect width="170" height="104" rx="12" ry="12"
          fill="color-mix(in srgb, var(--color-surface) 92%, transparent)"
          stroke="color-mix(in srgb, var(--color-primary) 35%, transparent)" stroke-width="1.5" />
        <rect x="73" y="20" width="24" height="28" rx="4"
          fill="color-mix(in srgb, var(--color-primary) 12%, transparent)"
          stroke="color-mix(in srgb, var(--color-primary) 65%, transparent)" stroke-width="1" />
        <circle cx="80" cy="40" r="2" fill="var(--color-primary)" />
        <circle cx="88" cy="34" r="2.5" fill="var(--color-primary)" />
        <circle cx="84" cy="44" r="1.6" fill="var(--color-primary)" />
        <text x="85" y="74" text-anchor="middle" fill="var(--color-text)" font-size="13" font-weight="600">{{ $t('home.loopNodeLabRun') }}</text>
        <text x="85" y="91" text-anchor="middle" fill="var(--color-text)" opacity="0.5" font-size="9" font-family="var(--font-mono, monospace)">{{ $t('home.loopNodeLabRunSub') }}</text>
      </g>

      <!-- Node: SimBiotix engine -->
      <g transform="translate(365, 150)">
        <rect width="170" height="104" rx="12" ry="12"
          fill="color-mix(in srgb, var(--color-surface) 92%, transparent)"
          stroke="color-mix(in srgb, var(--color-primary) 45%, transparent)" stroke-width="1.5" />
        <circle cx="85" cy="34" r="14" fill="none" stroke="color-mix(in srgb, var(--color-primary) 55%, transparent)" stroke-width="1" />
        <circle cx="85" cy="34" r="7"  fill="none" stroke="color-mix(in srgb, var(--color-primary) 75%, transparent)" stroke-width="1" />
        <circle cx="85" cy="34" r="3"  fill="var(--color-primary)" />
        <text x="85" y="74" text-anchor="middle" fill="var(--color-text)" font-size="13" font-weight="600">{{ $t('home.loopNodeEngine') }}</text>
        <text x="85" y="91" text-anchor="middle" fill="var(--color-text)" opacity="0.5" font-size="9" font-family="var(--font-mono, monospace)">{{ $t('home.loopNodeEngineSub') }}</text>
      </g>

      <!-- Node: Prediction -->
      <g transform="translate(685, 150)">
        <rect width="170" height="104" rx="12" ry="12"
          fill="color-mix(in srgb, var(--color-surface) 92%, transparent)"
          stroke="color-mix(in srgb, var(--color-primary) 35%, transparent)" stroke-width="1.5" />
        <polyline points="68,46 78,38 88,42 98,26"
          fill="none" stroke="var(--color-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="98" cy="26" r="2.5" fill="var(--color-primary)" />
        <text x="85" y="74" text-anchor="middle" fill="var(--color-text)" font-size="13" font-weight="600">{{ $t('home.loopNodePrediction') }}</text>
        <text x="85" y="91" text-anchor="middle" fill="var(--color-text)" opacity="0.5" font-size="9" font-family="var(--font-mono, monospace)">{{ $t('home.loopNodePredictionSub') }}</text>
      </g>

      <!-- Flowing data: forward along the rails -->
      <circle r="3" fill="url(#loop-particle)">
        <animateMotion path="M 215 202 L 363 202" dur="2.6s" repeatCount="indefinite" begin="0s" />
        <animate attributeName="opacity" values="0; 1; 1; 0" dur="2.6s" repeatCount="indefinite" begin="0s" />
      </circle>
      <circle r="3" fill="url(#loop-particle)">
        <animateMotion path="M 535 202 L 683 202" dur="2.6s" repeatCount="indefinite" begin="0.9s" />
        <animate attributeName="opacity" values="0; 1; 1; 0" dur="2.6s" repeatCount="indefinite" begin="0.9s" />
      </circle>
      <!-- Flowing data: calibration feedback along the return arc -->
      <circle r="3" fill="url(#loop-particle)">
        <animateMotion path="M 770 150 C 640 36, 260 36, 130 150" dur="3.4s" repeatCount="indefinite" begin="1.6s" />
        <animate attributeName="opacity" values="0; 1; 1; 0" dur="3.4s" repeatCount="indefinite" begin="1.6s" />
      </circle>
    </svg>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ClosedLoopGraphic',
})
</script>

<style lang="scss" scoped>
.closed-loop {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  width: 100%;

  &__header {
    @include flex-col(0.5rem);
    align-items: center;
    text-align: center;
    max-width: 38rem;
    margin: 0 auto 2.5rem;
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xs), 0.12em);
    color: var(--color-primary);
    opacity: var(--op-partial);
  }

  &__title {
    margin: 0.25rem 0 0;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    opacity: var(--op-partial);
    line-height: 1.6;
  }

  &__svg {
    display: block;
    width: 100%;
    max-width: 820px;
    height: auto;
    margin: 0 auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .closed-loop__svg circle[r="3"] { animation: none; opacity: 0.4; }
  }
}
</style>
