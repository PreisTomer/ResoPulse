<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="antibody-y"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Monoclonal antibody Y-shape with heavy chains, light chains, Fab arms, and Fc region"
  >
    <defs>
      <linearGradient id="ab-heavy" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-primary) 70%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 35%, transparent)" />
      </linearGradient>
      <linearGradient id="ab-light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-ok) 70%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-ok) 35%, transparent)" />
      </linearGradient>
    </defs>

    <!-- Fab arms (heavy chain portion of Fab) -->
    <path d="M 100 100 L 55 40 L 55 25 L 75 25 L 100 75 Z" fill="url(#ab-heavy)" stroke="color-mix(in srgb, var(--color-primary) 85%, transparent)" stroke-width="1.2" />
    <path d="M 100 100 L 145 40 L 145 25 L 125 25 L 100 75 Z" fill="url(#ab-heavy)" stroke="color-mix(in srgb, var(--color-primary) 85%, transparent)" stroke-width="1.2" />

    <!-- Light chains (outer arms of Fab) -->
    <path d="M 56 40 L 38 18 L 50 14 L 70 36 Z" fill="url(#ab-light)" stroke="color-mix(in srgb, var(--color-ok) 85%, transparent)" stroke-width="1" />
    <path d="M 144 40 L 162 18 L 150 14 L 130 36 Z" fill="url(#ab-light)" stroke="color-mix(in srgb, var(--color-ok) 85%, transparent)" stroke-width="1" />

    <!-- Hinge region -->
    <line x1="100" y1="100" x2="100" y2="130" stroke="color-mix(in srgb, var(--color-amber) 70%, transparent)" stroke-width="3.5" stroke-linecap="round" />

    <!-- Fc region (stem) -->
    <path d="M 85 130 L 115 130 L 115 175 L 85 175 Z" fill="url(#ab-heavy)" stroke="color-mix(in srgb, var(--color-primary) 85%, transparent)" stroke-width="1.2" />

    <!-- Inter-chain disulfide bond indicators -->
    <line x1="92" y1="138" x2="108" y2="138" stroke="color-mix(in srgb, var(--color-amber) 80%, transparent)" stroke-width="1" stroke-dasharray="1.5 1.5" />
    <line x1="92" y1="158" x2="108" y2="158" stroke="color-mix(in srgb, var(--color-amber) 80%, transparent)" stroke-width="1" stroke-dasharray="1.5 1.5" />

    <!-- Labels -->
    <text x="35" y="10" class="antibody-y__label">Fab</text>
    <text x="155" y="10" class="antibody-y__label">Fab</text>
    <text x="100" y="190" text-anchor="middle" class="antibody-y__label">Fc</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({ name: 'AntibodyYShapeSvg' })
</script>

<style lang="scss" scoped>
.antibody-y {
  display: block;
  width: 100%;
  height: 100%;

  &__label {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--color-text);
    opacity: var(--op-muted);
  }
}
</style>
