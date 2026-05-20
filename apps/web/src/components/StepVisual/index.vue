<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="step-visual"
    viewBox="0 0 120 130"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Chromatography column (capture + polish) -->
    <g v-if="isColumn">
      <rect x="40" y="14" width="40" height="100" rx="6" fill="color-mix(in srgb, var(--color-text) 6%, transparent)" stroke="color-mix(in srgb, var(--color-text) 30%, transparent)" stroke-width="1.5" />
      <!-- Resin bed -->
      <rect x="42" y="40" width="36" height="64" fill="color-mix(in srgb, var(--color-text) 14%, transparent)" />
      <!-- Bound target protein (gold band migrating down) -->
      <rect x="42" y="52" width="36" height="14" fill="color-mix(in srgb, var(--color-ok) 55%, transparent)">
        <animate attributeName="y" values="44; 70; 44" dur="3.5s" repeatCount="indefinite" />
      </rect>
      <!-- Flow-through impurities (gray dots exiting bottom) -->
      <circle r="2" fill="color-mix(in srgb, var(--color-text) 40%, transparent)">
        <animateMotion path="M 60 104 L 60 130" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1; 1; 0" dur="2s" repeatCount="indefinite" />
      </circle>
      <!-- Inlet / outlet -->
      <line x1="60" y1="6" x2="60" y2="14" stroke="color-mix(in srgb, var(--color-primary) 60%, transparent)" stroke-width="2" />
      <line x1="60" y1="114" x2="60" y2="126" stroke="color-mix(in srgb, var(--color-text) 40%, transparent)" stroke-width="2" />
    </g>

    <!-- Depth filtration / clarification -->
    <g v-else-if="isClarification">
      <rect x="20" y="20" width="80" height="14" rx="3" fill="color-mix(in srgb, var(--color-primary) 25%, transparent)" stroke="color-mix(in srgb, var(--color-primary) 50%, transparent)" stroke-width="1" />
      <rect x="20" y="40" width="80" height="14" rx="3" fill="color-mix(in srgb, var(--color-primary) 18%, transparent)" stroke="color-mix(in srgb, var(--color-primary) 40%, transparent)" stroke-width="1" />
      <rect x="20" y="60" width="80" height="14" rx="3" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="color-mix(in srgb, var(--color-primary) 30%, transparent)" stroke-width="1" />
      <!-- Debris captured in upper layers -->
      <circle cx="40" cy="27" r="2.5" fill="color-mix(in srgb, var(--color-danger) 50%, transparent)" />
      <circle cx="70" cy="27" r="2" fill="color-mix(in srgb, var(--color-danger) 50%, transparent)" />
      <circle cx="55" cy="47" r="1.8" fill="color-mix(in srgb, var(--color-danger) 40%, transparent)" />
      <!-- Clarified product exiting -->
      <circle r="2" fill="color-mix(in srgb, var(--color-ok) 60%, transparent)">
        <animateMotion path="M 60 74 L 60 110" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- Ultrafiltration / diafiltration -->
    <g v-else-if="isUfDf">
      <rect x="30" y="40" width="60" height="40" rx="6" fill="color-mix(in srgb, var(--color-text) 6%, transparent)" stroke="color-mix(in srgb, var(--color-text) 30%, transparent)" stroke-width="1.5" />
      <!-- Membrane -->
      <line x1="60" y1="40" x2="60" y2="80" stroke="color-mix(in srgb, var(--color-primary) 60%, transparent)" stroke-width="2" stroke-dasharray="2 2" />
      <!-- Retained product (left, gold, large) -->
      <circle cx="44" cy="55" r="4" fill="color-mix(in srgb, var(--color-ok) 55%, transparent)" />
      <circle cx="48" cy="68" r="4" fill="color-mix(in srgb, var(--color-ok) 55%, transparent)" />
      <!-- Permeate (right, small molecules through membrane) -->
      <circle r="1.5" fill="color-mix(in srgb, var(--color-text) 40%, transparent)">
        <animateMotion path="M 56 60 L 86 60" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- Viral inactivation -->
    <g v-else-if="isViralInactivation">
      <circle cx="60" cy="60" r="36" fill="color-mix(in srgb, var(--color-danger) 8%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 35%, transparent)" stroke-width="1.5" />
      <!-- Inactivated virions (crossed-out) -->
      <g v-for="(v, i) in virions" :key="i">
        <polygon :points="virionPoints(v.x, v.y)" fill="color-mix(in srgb, var(--color-danger) 30%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 60%, transparent)" stroke-width="0.6" />
        <line :x1="v.x - 5" :y1="v.y - 5" :x2="v.x + 5" :y2="v.y + 5" stroke="var(--color-danger)" stroke-width="1" />
      </g>
    </g>

    <!-- Formulation -->
    <g v-else-if="isFormulation">
      <path d="M 48 24 L 72 24 L 72 36 L 78 48 L 78 110 Q 78 116 72 116 L 48 116 Q 42 116 42 110 L 42 48 L 48 36 Z"
        fill="color-mix(in srgb, var(--color-primary) 8%, transparent)"
        stroke="color-mix(in srgb, var(--color-text) 35%, transparent)" stroke-width="1.5" />
      <!-- Formulated drug substance -->
      <path d="M 43 70 L 77 70 L 77 110 Q 77 115 72 115 L 48 115 Q 43 115 43 110 Z"
        fill="color-mix(in srgb, var(--color-ok) 35%, transparent)" />
    </g>

    <!-- Generic fallback -->
    <g v-else>
      <rect x="35" y="40" width="50" height="50" rx="8" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="color-mix(in srgb, var(--color-primary) 40%, transparent)" stroke-width="1.5" />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { STEP_CATEGORY, type StepCategory } from '@/constants/processStepCatalog'

export default defineComponent({
  name: 'StepVisual',
  props: {
    category:  { type: String as PropType<StepCategory>, required: true },
    ariaLabel: { type: String, default: 'Process step visualization' },
  },
  computed: {
    isColumn():            boolean { return this.category === STEP_CATEGORY.CAPTURE || this.category === STEP_CATEGORY.POLISH },
    isClarification():     boolean { return this.category === STEP_CATEGORY.CLARIFICATION },
    isUfDf():              boolean { return this.category === STEP_CATEGORY.UF_DF },
    isViralInactivation(): boolean { return this.category === STEP_CATEGORY.VIRAL_INACTIVATION },
    isFormulation():       boolean { return this.category === STEP_CATEGORY.FORMULATION },
    virions(): { x: number; y: number }[] {
      return [{ x: 48, y: 50 }, { x: 72, y: 52 }, { x: 58, y: 72 }]
    },
  },
  methods: {
    virionPoints(cx: number, cy: number): string {
      const r = 5
      return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`
    },
  },
})
</script>

<style lang="scss" scoped>
.step-visual {
  display: block;
  width: 100%;
  height: 100%;

  @media (prefers-reduced-motion: reduce) {
    rect[fill*="success"], circle { animation: none; }
  }
}
</style>
