<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="mammalian-cell"
    :class="{ 'mammalian-cell--active': active }"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <radialGradient :id="`mam-membrane-${uid}`" cx="50%" cy="50%" r="50%">
        <stop offset="80%" stop-color="color-mix(in srgb, var(--color-primary) 8%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 30%, transparent)" />
      </radialGradient>
      <radialGradient :id="`mam-nucleus-${uid}`" cx="40%" cy="40%" r="60%">
        <stop offset="0%"  stop-color="color-mix(in srgb, var(--color-primary) 45%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 25%, transparent)" />
      </radialGradient>
    </defs>

    <!-- Plasma membrane -->
    <circle cx="100" cy="100" r="78"
      :fill="`url(#mam-membrane-${uid})`"
      stroke="color-mix(in srgb, var(--color-primary) 65%, transparent)"
      stroke-width="1.5"
    />

    <!-- Endoplasmic reticulum — winding lines near the nucleus -->
    <g class="mammalian-cell__er" stroke="color-mix(in srgb, var(--color-amber) 55%, transparent)" stroke-width="1" fill="none">
      <path d="M 80 75 C 95 70, 115 80, 130 70 S 150 85, 145 100" />
      <path d="M 75 95 C 90 100, 110 95, 125 105 S 145 110, 150 105" />
      <path d="M 85 120 C 100 115, 120 125, 135 120" />
    </g>

    <!-- Golgi apparatus — stacked curved cisternae -->
    <g class="mammalian-cell__golgi" stroke="color-mix(in srgb, var(--color-amber) 70%, transparent)" stroke-width="1.5" fill="none">
      <path d="M 55 130 Q 70 122, 85 130" />
      <path d="M 55 135 Q 70 127, 85 135" />
      <path d="M 55 140 Q 70 132, 85 140" />
    </g>

    <!-- Mitochondria — small ellipses with cristae -->
    <g class="mammalian-cell__mito">
      <ellipse cx="55" cy="80" rx="9" ry="4.5" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.8" transform="rotate(-25 55 80)" />
      <ellipse cx="145" cy="135" rx="9" ry="4.5" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.8" transform="rotate(30 145 135)" />
    </g>

    <!-- Ribosomes — small dots (production indicator) -->
    <g class="mammalian-cell__ribosomes">
      <circle v-for="(p, i) in ribosomePoints" :key="`r${i}`" :cx="p.x" :cy="p.y" r="1.4"
        fill="color-mix(in srgb, var(--color-primary) 70%, transparent)"
      >
        <animate
          v-if="active"
          attributeName="opacity"
          values="0.5; 1; 0.5"
          dur="2.2s"
          repeatCount="indefinite"
          :begin="`${i * 0.18}s`"
        />
      </circle>
    </g>

    <!-- Nucleus -->
    <circle cx="100" cy="95" r="32"
      :fill="`url(#mam-nucleus-${uid})`"
      stroke="color-mix(in srgb, var(--color-primary) 75%, transparent)"
      stroke-width="1.2"
    />
    <circle cx="105" cy="90" r="6"
      fill="color-mix(in srgb, var(--color-primary) 65%, transparent)"
    />

    <!-- Secretion: small product molecules exiting (only when active) -->
    <g v-if="active" class="mammalian-cell__secretion">
      <circle r="2" fill="var(--color-ok)">
        <animateMotion path="M 175 100 q 18 -8, 28 -2" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0; 1; 0" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="2" fill="var(--color-ok)">
        <animateMotion path="M 170 130 q 18 6, 30 2" dur="3.4s" repeatCount="indefinite" begin="1.2s" />
        <animate attributeName="opacity" values="0; 1; 0" dur="3.4s" repeatCount="indefinite" begin="1.2s" />
      </circle>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

let uidCounter = 0

interface RibosomePoint { x: number; y: number }

const RIBOSOMES: RibosomePoint[] = [
  { x: 50,  y: 110 }, { x: 60, y: 125 }, { x: 70, y: 155 },
  { x: 130, y: 60  }, { x: 145, y: 70 }, { x: 155, y: 95 },
  { x: 90,  y: 160 }, { x: 115, y: 150 },
]

export default defineComponent({
  name: 'MammalianCellSvg',
  props: {
    active:    { type: Boolean, default: false },
    ariaLabel: { type: String,  default: 'Mammalian production cell with nucleus, ER, Golgi, ribosomes, and mitochondria' },
  },
  data() {
    return {
      uid: `m${++uidCounter}`,
      ribosomePoints: RIBOSOMES,
    }
  },
})
</script>

<style lang="scss" scoped>
.mammalian-cell {
  display: block;
  width: 100%;
  height: 100%;

  &__ribosomes circle {
    transition: opacity var(--tr-slow);
  }

  @media (prefers-reduced-motion: reduce) {
    .mammalian-cell__ribosomes circle,
    .mammalian-cell__secretion circle {
      animation: none;
      opacity: 0.7;
    }
  }
}
</style>
