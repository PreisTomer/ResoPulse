<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="pipeline-flow"
    viewBox="0 0 800 200"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    role="img"
  >
    <defs>
      <linearGradient id="pipeline-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="var(--color-primary)" stop-opacity="0.45" />
        <stop offset="50%"  stop-color="var(--color-primary)" stop-opacity="0.85" />
        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.45" />
      </linearGradient>
      <radialGradient id="pipeline-molecule" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="var(--color-primary)" stop-opacity="1" />
        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Pipeline rails -->
    <line x1="235" y1="100" x2="290" y2="100" stroke="url(#pipeline-stroke)" stroke-width="1.5" stroke-dasharray="4 6" />
    <line x1="510" y1="100" x2="565" y2="100" stroke="url(#pipeline-stroke)" stroke-width="1.5" stroke-dasharray="4 6" />

    <!-- Module 1: Cell Engineering -->
    <g class="pipeline-flow__box" transform="translate(15, 40)">
      <rect width="220" height="120" rx="14" ry="14"
        fill="color-mix(in srgb, var(--color-bg-elevated) 95%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 35%, transparent)"
        stroke-width="1.5"
      />
      <circle cx="40" cy="60" r="18"
        fill="color-mix(in srgb, var(--color-primary) 15%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 70%, transparent)"
        stroke-width="1"
      />
      <circle cx="40" cy="60" r="5" fill="var(--color-primary)" />
      <text x="76" y="50" fill="var(--color-text)" font-family="var(--font-mono, monospace)" font-size="12" font-weight="600" letter-spacing="0.05em">MODULE 1</text>
      <text x="76" y="74" fill="var(--color-text)" opacity="0.75" font-size="15">Cell Engineering</text>
      <text x="76" y="96" fill="var(--color-text)" opacity="0.45" font-size="11" font-family="var(--font-mono, monospace)">Host + strategy</text>
    </g>

    <!-- Module 2: Clone & Upstream -->
    <g class="pipeline-flow__box" transform="translate(290, 40)">
      <rect width="220" height="120" rx="14" ry="14"
        fill="color-mix(in srgb, var(--color-bg-elevated) 95%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 35%, transparent)"
        stroke-width="1.5"
      />
      <circle cx="40" cy="60" r="18"
        fill="color-mix(in srgb, var(--color-primary) 15%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 70%, transparent)"
        stroke-width="1"
      />
      <circle cx="40" cy="54" r="4" fill="var(--color-primary)" />
      <circle cx="35" cy="65" r="3.2" fill="var(--color-primary)" />
      <circle cx="46" cy="66" r="3.2" fill="var(--color-primary)" />
      <text x="76" y="50" fill="var(--color-text)" font-family="var(--font-mono, monospace)" font-size="12" font-weight="600" letter-spacing="0.05em">MODULE 2</text>
      <text x="76" y="74" fill="var(--color-text)" opacity="0.75" font-size="15">Clone &amp; Upstream</text>
      <text x="76" y="96" fill="var(--color-text)" opacity="0.45" font-size="11" font-family="var(--font-mono, monospace)">Clone + bioreactor</text>
    </g>

    <!-- Module 3: Downstream -->
    <g class="pipeline-flow__box" transform="translate(565, 40)">
      <rect width="220" height="120" rx="14" ry="14"
        fill="color-mix(in srgb, var(--color-bg-elevated) 95%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 35%, transparent)"
        stroke-width="1.5"
      />
      <circle cx="40" cy="60" r="18"
        fill="color-mix(in srgb, var(--color-primary) 15%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 70%, transparent)"
        stroke-width="1"
      />
      <path d="M 32 56 L 48 56 L 45 63 L 35 63 Z M 35 65 L 45 65 L 43 70 L 37 70 Z M 38 72 L 42 72 L 41 75 L 39 75 Z" fill="var(--color-primary)" />
      <text x="76" y="50" fill="var(--color-text)" font-family="var(--font-mono, monospace)" font-size="12" font-weight="600" letter-spacing="0.05em">MODULE 3</text>
      <text x="76" y="74" fill="var(--color-text)" opacity="0.75" font-size="15">Downstream</text>
      <text x="76" y="96" fill="var(--color-text)" opacity="0.45" font-size="11" font-family="var(--font-mono, monospace)">Yield prediction</text>
    </g>

    <!-- Flowing molecule indicators -->
    <circle r="4" fill="url(#pipeline-molecule)">
      <animateMotion path="M 235 100 L 290 100" dur="3s" repeatCount="indefinite" begin="0s" />
      <animate attributeName="opacity" values="0; 1; 1; 0" dur="3s" repeatCount="indefinite" begin="0s" />
    </circle>
    <circle r="4" fill="url(#pipeline-molecule)">
      <animateMotion path="M 510 100 L 565 100" dur="3s" repeatCount="indefinite" begin="1.5s" />
      <animate attributeName="opacity" values="0; 1; 1; 0" dur="3s" repeatCount="indefinite" begin="1.5s" />
    </circle>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PipelineFlowSvg',
})
</script>

<style lang="scss" scoped>
.pipeline-flow {
  display: block;
  width: 100%;
  max-width: 820px;
  height: auto;
  opacity: 0.92;

  &__box {
    transition: opacity var(--tr-slow);

    &--dimmed {
      opacity: 0.55;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    circle[r="3"] { animation: none; opacity: 0.4; }
  }
}
</style>
