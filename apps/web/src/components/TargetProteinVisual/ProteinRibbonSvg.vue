<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="protein-ribbon"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Generic recombinant protein ribbon visualization with alpha helices and beta sheets"
  >
    <defs>
      <linearGradient id="rib-helix" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-primary) 75%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 35%, transparent)" />
      </linearGradient>
      <linearGradient id="rib-sheet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-ok) 65%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-ok) 25%, transparent)" />
      </linearGradient>
    </defs>

    <!-- Coil / random loops connecting structures -->
    <path
      d="M 30 100 C 45 70, 60 85, 70 75 L 90 60 C 110 65, 130 80, 145 70 L 160 90 C 175 100, 165 120, 150 130 L 130 140 C 115 145, 100 135, 85 140 L 65 145 C 50 145, 35 130, 30 110 Z"
      fill="none"
      stroke="color-mix(in srgb, var(--color-text) 35%, transparent)"
      stroke-width="2"
      stroke-linejoin="round"
    />

    <!-- Alpha helices (cylinders represented as elongated rounded rects) -->
    <g class="protein-ribbon__helices">
      <rect x="55" y="60" width="38" height="14" rx="7" ry="7" fill="url(#rib-helix)" stroke="color-mix(in srgb, var(--color-primary) 90%, transparent)" stroke-width="1" transform="rotate(-15 74 67)" />
      <rect x="100" y="115" width="44" height="14" rx="7" ry="7" fill="url(#rib-helix)" stroke="color-mix(in srgb, var(--color-primary) 90%, transparent)" stroke-width="1" transform="rotate(20 122 122)" />
    </g>

    <!-- Beta sheets (arrows) -->
    <g class="protein-ribbon__sheets">
      <polygon points="110,55 140,55 145,60 140,65 110,65" fill="url(#rib-sheet)" stroke="color-mix(in srgb, var(--color-ok) 85%, transparent)" stroke-width="1" transform="rotate(-5 125 60)" />
      <polygon points="40,125 70,125 75,130 70,135 40,135" fill="url(#rib-sheet)" stroke="color-mix(in srgb, var(--color-ok) 85%, transparent)" stroke-width="1" transform="rotate(15 55 130)" />
    </g>

    <!-- N-terminus and C-terminus labels -->
    <circle cx="30" cy="100" r="3" fill="color-mix(in srgb, var(--color-primary) 90%, transparent)" />
    <text x="20" y="100" class="protein-ribbon__terminus">N</text>
    <circle cx="30" cy="110" r="3" fill="color-mix(in srgb, var(--color-danger) 70%, transparent)" />
    <text x="20" y="120" class="protein-ribbon__terminus">C</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({ name: 'ProteinRibbonSvg' })
</script>

<style lang="scss" scoped>
.protein-ribbon {
  display: block;
  width: 100%;
  height: 100%;

  &__terminus {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 700;
    fill: var(--color-text);
    opacity: var(--op-partial);
  }
}
</style>
