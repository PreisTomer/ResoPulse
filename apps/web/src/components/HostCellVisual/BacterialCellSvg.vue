<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="bacterial-cell"
    :class="{ 'bacterial-cell--active': active }"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <linearGradient :id="`bact-fill-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-amber) 15%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-amber) 35%, transparent)" />
      </linearGradient>
    </defs>

    <!-- Rod-shaped bacterium (E. coli morphology) -->
    <g transform="translate(100 100) rotate(-12)">
      <rect x="-72" y="-22" width="144" height="44" rx="22" ry="22"
        :fill="`url(#bact-fill-${uid})`"
        stroke="color-mix(in srgb, var(--color-amber) 70%, transparent)"
        stroke-width="1.8"
      />

      <!-- Cell wall (outer line — bacteria have a distinctive cell wall over the membrane) -->
      <rect x="-75" y="-25" width="150" height="50" rx="25" ry="25"
        fill="none"
        stroke="color-mix(in srgb, var(--color-amber) 30%, transparent)"
        stroke-width="0.8"
        stroke-dasharray="3 2"
      />

      <!-- Nucleoid region — no nuclear membrane, just clumped DNA -->
      <ellipse cx="0" cy="0" rx="22" ry="10"
        fill="color-mix(in srgb, var(--color-primary) 30%, transparent)"
        stroke="color-mix(in srgb, var(--color-primary) 60%, transparent)"
        stroke-width="0.8"
        stroke-dasharray="1 1.5"
      />

      <!-- Inclusion bodies (target protein accumulating intracellularly — classic E. coli production) -->
      <circle cx="-45" cy="-5" r="6"
        fill="color-mix(in srgb, var(--color-ok) 45%, transparent)"
        stroke="color-mix(in srgb, var(--color-ok) 80%, transparent)"
        stroke-width="0.8"
      />
      <circle cx="-32" cy="8" r="4"
        fill="color-mix(in srgb, var(--color-ok) 45%, transparent)"
        stroke="color-mix(in srgb, var(--color-ok) 80%, transparent)"
        stroke-width="0.8"
      />
      <circle cx="42" cy="-2" r="7"
        fill="color-mix(in srgb, var(--color-ok) 45%, transparent)"
        stroke="color-mix(in srgb, var(--color-ok) 80%, transparent)"
        stroke-width="0.8"
      />
      <circle cx="55" cy="10" r="5"
        fill="color-mix(in srgb, var(--color-ok) 45%, transparent)"
        stroke="color-mix(in srgb, var(--color-ok) 80%, transparent)"
        stroke-width="0.8"
      />

      <!-- Ribosomes scattered in cytoplasm (production indicator) -->
      <g v-if="active">
        <circle v-for="(p, i) in ribosomePoints" :key="`r${i}`" :cx="p.x" :cy="p.y" r="1.3"
          fill="color-mix(in srgb, var(--color-primary) 80%, transparent)"
        >
          <animate
            attributeName="opacity"
            values="0.4; 1; 0.4"
            dur="2s"
            repeatCount="indefinite"
            :begin="`${i * 0.15}s`"
          />
        </circle>
      </g>
    </g>

    <!-- Flagella for visual distinction -->
    <path d="M 175 110 q 15 -2, 20 4 q 5 6, 10 0 q 5 -8, 15 2"
      fill="none"
      stroke="color-mix(in srgb, var(--color-amber) 50%, transparent)"
      stroke-width="1"
      stroke-linecap="round"
    />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

let uidCounter = 0

const RIBOSOMES = [
  { x: -55, y: 12 }, { x: -38, y: -10 }, { x: -10, y: -12 }, { x: 12, y: 8 },
  { x: 25,  y: -12 },{ x: 60,  y: 4 },
]

export default defineComponent({
  name: 'BacterialCellSvg',
  props: {
    active:    { type: Boolean, default: false },
    ariaLabel: { type: String,  default: 'E. coli rod-shaped bacterium with nucleoid, inclusion bodies, and ribosomes' },
  },
  data() {
    return {
      uid: `b${++uidCounter}`,
      ribosomePoints: RIBOSOMES,
    }
  },
})
</script>

<style lang="scss" scoped>
.bacterial-cell {
  display: block;
  width: 100%;
  height: 100%;

  @media (prefers-reduced-motion: reduce) {
    circle[r="1.3"] {
      animation: none;
      opacity: 0.7;
    }
  }
}
</style>
