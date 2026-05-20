<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="dna-coil"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Plasmid DNA supercoiled structure visualization"
  >
    <defs>
      <linearGradient id="dna-strand-a" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-primary) 80%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 40%, transparent)" />
      </linearGradient>
      <linearGradient id="dna-strand-b" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-ok) 80%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-ok) 40%, transparent)" />
      </linearGradient>
    </defs>

    <!-- Supercoiled plasmid loops -->
    <g class="dna-coil__loops" fill="none" stroke-width="3" stroke-linecap="round">
      <path d="M 100 30 C 160 50, 170 110, 130 140 C 90 170, 30 150, 30 100 C 30 50, 70 30, 100 30 Z"
        stroke="url(#dna-strand-a)"
      />
      <path d="M 100 40 C 150 60, 160 110, 125 135 C 90 160, 40 145, 40 100 C 40 60, 70 40, 100 40 Z"
        stroke="url(#dna-strand-b)"
        stroke-dasharray="3 2"
      />
    </g>

    <!-- Internal twist crossover loops (supercoiled) -->
    <g class="dna-coil__crosses" stroke="color-mix(in srgb, var(--color-amber) 70%, transparent)" stroke-width="2" fill="none">
      <path d="M 80 80 Q 100 70, 120 80" />
      <path d="M 70 110 Q 100 100, 130 110" />
      <path d="M 80 140 Q 100 130, 120 140" />
    </g>

    <!-- Base-pair indicators (small ticks across the double-helix) -->
    <g class="dna-coil__rungs" stroke="color-mix(in srgb, var(--color-text) 25%, transparent)" stroke-width="0.8">
      <line v-for="i in 12" :key="i"
        :x1="rungX1(i)" :y1="rungY1(i)"
        :x2="rungX2(i)" :y2="rungY2(i)"
      />
    </g>

    <text x="100" y="105" text-anchor="middle" class="dna-coil__label">dsDNA</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DnaCoilSvg',
  methods: {
    rungX1(i: number): number {
      const t = (i / 13) * Math.PI * 2
      return 100 + Math.cos(t) * 60
    },
    rungY1(i: number): number {
      const t = (i / 13) * Math.PI * 2
      return 100 + Math.sin(t) * 55
    },
    rungX2(i: number): number {
      const t = (i / 13) * Math.PI * 2
      return 100 + Math.cos(t) * 50
    },
    rungY2(i: number): number {
      const t = (i / 13) * Math.PI * 2
      return 100 + Math.sin(t) * 45
    },
  },
})
</script>

<style lang="scss" scoped>
.dna-coil {
  display: block;
  width: 100%;
  height: 100%;

  &__label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    fill: var(--color-text);
    opacity: var(--op-partial);
  }
}
</style>
