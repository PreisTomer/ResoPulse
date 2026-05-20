<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="yeast-cell"
    :class="{ 'yeast-cell--active': active }"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <radialGradient :id="`yeast-fill-${uid}`" cx="50%" cy="50%" r="50%">
        <stop offset="80%"  stop-color="color-mix(in srgb, var(--color-amber) 12%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-amber) 30%, transparent)" />
      </radialGradient>
      <radialGradient :id="`yeast-vacuole-${uid}`" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-primary) 20%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 40%, transparent)" />
      </radialGradient>
    </defs>

    <!-- Mother cell (ovoid) with thick cell wall -->
    <ellipse cx="90" cy="105" rx="62" ry="56"
      :fill="`url(#yeast-fill-${uid})`"
      stroke="color-mix(in srgb, var(--color-amber) 30%, transparent)"
      stroke-width="3"
    />
    <ellipse cx="90" cy="105" rx="60" ry="54"
      fill="none"
      stroke="color-mix(in srgb, var(--color-amber) 75%, transparent)"
      stroke-width="1"
    />

    <!-- Daughter bud (signature of yeast — actively budding off) -->
    <ellipse cx="158" cy="68" rx="28" ry="26"
      :fill="`url(#yeast-fill-${uid})`"
      stroke="color-mix(in srgb, var(--color-amber) 30%, transparent)"
      stroke-width="2.5"
    />
    <ellipse cx="158" cy="68" rx="26.5" ry="24.5"
      fill="none"
      stroke="color-mix(in srgb, var(--color-amber) 75%, transparent)"
      stroke-width="1"
    />

    <!-- Vacuole (large prominent organelle in yeast) -->
    <circle cx="80" cy="100" r="22"
      :fill="`url(#yeast-vacuole-${uid})`"
      stroke="color-mix(in srgb, var(--color-primary) 50%, transparent)"
      stroke-width="0.8"
    />

    <!-- Nucleus (compact, near vacuole) -->
    <circle cx="115" cy="125" r="12"
      fill="color-mix(in srgb, var(--color-ok) 35%, transparent)"
      stroke="color-mix(in srgb, var(--color-ok) 70%, transparent)"
      stroke-width="1"
    />
    <circle cx="118" cy="123" r="3"
      fill="color-mix(in srgb, var(--color-ok) 65%, transparent)"
    />

    <!-- Mitochondria (yeast has many, scattered) -->
    <g class="yeast-cell__mito">
      <ellipse cx="55" cy="130" rx="6" ry="3" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.7" transform="rotate(-20 55 130)" />
      <ellipse cx="100" cy="150" rx="6" ry="3" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.7" transform="rotate(15 100 150)" />
      <ellipse cx="135" cy="105" rx="6" ry="3" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.7" transform="rotate(40 135 105)" />
    </g>

    <!-- Secretion vesicles being secreted (active state — Pichia is well-known for secretion) -->
    <g v-if="active" class="yeast-cell__secretion">
      <circle r="2.2" fill="var(--color-ok)">
        <animateMotion path="M 155 105 q 12 8, 22 4" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0; 1; 0" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="2.2" fill="var(--color-ok)">
        <animateMotion path="M 145 130 q 18 6, 30 0" dur="3.4s" repeatCount="indefinite" begin="1.5s" />
        <animate attributeName="opacity" values="0; 1; 0" dur="3.4s" repeatCount="indefinite" begin="1.5s" />
      </circle>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

let uidCounter = 0

export default defineComponent({
  name: 'YeastCellSvg',
  props: {
    active:    { type: Boolean, default: false },
    ariaLabel: { type: String,  default: 'Pichia pastoris yeast cell with budding daughter cell, vacuole, nucleus, and mitochondria' },
  },
  data() {
    return { uid: `y${++uidCounter}` }
  },
})
</script>

<style lang="scss" scoped>
.yeast-cell {
  display: block;
  width: 100%;
  height: 100%;

  @media (prefers-reduced-motion: reduce) {
    .yeast-cell__secretion circle {
      animation: none;
      opacity: 0.7;
    }
  }
}
</style>
