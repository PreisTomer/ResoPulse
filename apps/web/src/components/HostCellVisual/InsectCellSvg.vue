<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="insect-cell"
    :class="{ 'insect-cell--active': active }"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <radialGradient :id="`ins-membrane-${uid}`" cx="50%" cy="50%" r="50%">
        <stop offset="80%"  stop-color="color-mix(in srgb, var(--color-ok) 8%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-ok) 30%, transparent)" />
      </radialGradient>
      <radialGradient :id="`ins-nucleus-${uid}`" cx="40%" cy="40%" r="60%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-ok) 45%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-ok) 25%, transparent)" />
      </radialGradient>
    </defs>

    <!-- Plasma membrane (slightly larger and more oval than mammalian) -->
    <ellipse cx="100" cy="100" rx="82" ry="76"
      :fill="`url(#ins-membrane-${uid})`"
      stroke="color-mix(in srgb, var(--color-ok) 65%, transparent)"
      stroke-width="1.5"
    />

    <!-- Nucleus (larger relative to cell — distinctive of Sf9 baculovirus production) -->
    <circle cx="105" cy="95" r="38"
      :fill="`url(#ins-nucleus-${uid})`"
      stroke="color-mix(in srgb, var(--color-ok) 75%, transparent)"
      stroke-width="1.2"
    />

    <!-- Baculovirus occlusion bodies (polyhedra) inside nucleus — signature of baculovirus expression -->
    <g class="insect-cell__polyhedra">
      <polygon points="95,85 102,80 110,82 113,90 108,98 98,97" fill="color-mix(in srgb, var(--color-ok) 60%, transparent)" stroke="color-mix(in srgb, var(--color-ok) 90%, transparent)" stroke-width="0.8" />
      <polygon points="115,100 122,98 128,105 125,113 117,112" fill="color-mix(in srgb, var(--color-ok) 60%, transparent)" stroke="color-mix(in srgb, var(--color-ok) 90%, transparent)" stroke-width="0.8" />
      <polygon points="92,108 100,108 102,115 95,118" fill="color-mix(in srgb, var(--color-ok) 60%, transparent)" stroke="color-mix(in srgb, var(--color-ok) 90%, transparent)" stroke-width="0.8" />
    </g>

    <!-- Mitochondria in cytoplasm -->
    <g class="insect-cell__mito">
      <ellipse cx="50" cy="120" rx="9" ry="4" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.8" transform="rotate(20 50 120)" />
      <ellipse cx="155" cy="140" rx="9" ry="4" fill="color-mix(in srgb, var(--color-danger) 18%, transparent)" stroke="color-mix(in srgb, var(--color-danger) 50%, transparent)" stroke-width="0.8" transform="rotate(-15 155 140)" />
    </g>

    <!-- Baculovirus particles being assembled (active state) -->
    <g v-if="active" class="insect-cell__virions">
      <polygon points="60,55 64,53 68,56 66,60 62,60" fill="color-mix(in srgb, var(--color-amber) 70%, transparent)" stroke="color-mix(in srgb, var(--color-amber) 90%, transparent)" stroke-width="0.6">
        <animate attributeName="opacity" values="0.3; 1; 0.3" dur="2.8s" repeatCount="indefinite" />
      </polygon>
      <polygon points="140,155 144,153 148,156 146,160 142,160" fill="color-mix(in srgb, var(--color-amber) 70%, transparent)" stroke="color-mix(in srgb, var(--color-amber) 90%, transparent)" stroke-width="0.6">
        <animate attributeName="opacity" values="0.3; 1; 0.3" dur="2.8s" repeatCount="indefinite" begin="1.4s" />
      </polygon>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

let uidCounter = 0

export default defineComponent({
  name: 'InsectCellSvg',
  props: {
    active:    { type: Boolean, default: false },
    ariaLabel: { type: String,  default: 'Sf9 insect cell with prominent nucleus and baculovirus occlusion bodies' },
  },
  data() {
    return { uid: `i${++uidCounter}` }
  },
})
</script>

<style lang="scss" scoped>
.insect-cell {
  display: block;
  width: 100%;
  height: 100%;

  @media (prefers-reduced-motion: reduce) {
    .insect-cell__virions polygon {
      animation: none;
      opacity: 0.7;
    }
  }
}
</style>
