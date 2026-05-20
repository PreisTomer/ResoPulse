<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="capsid"
    viewBox="0 0 200 200"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Viral capsid icosahedral particle visualization"
  >
    <defs>
      <radialGradient id="capsid-fill" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-danger) 30%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-danger) 55%, transparent)" />
      </radialGradient>
    </defs>

    <!-- Icosahedral outer shape (approximated as a 20-sided polygon visible at this scale as a hexagonal projection) -->
    <polygon
      points="100,30 158,55 178,100 158,145 100,170 42,145 22,100 42,55"
      fill="url(#capsid-fill)"
      stroke="color-mix(in srgb, var(--color-danger) 80%, transparent)"
      stroke-width="1.5"
      stroke-linejoin="round"
    />

    <!-- Capsid protein subunit triangles (the characteristic geometric face pattern) -->
    <g class="capsid__faces" stroke="color-mix(in srgb, var(--color-danger) 70%, transparent)" stroke-width="0.8" fill="none">
      <polygon points="100,30 158,55 100,100" />
      <polygon points="100,30 42,55 100,100" />
      <polygon points="158,55 178,100 100,100" />
      <polygon points="42,55 22,100 100,100" />
      <polygon points="178,100 158,145 100,100" />
      <polygon points="22,100 42,145 100,100" />
      <polygon points="158,145 100,170 100,100" />
      <polygon points="42,145 100,170 100,100" />
    </g>

    <!-- Internal cargo (genome) hint -->
    <circle cx="100" cy="100" r="18"
      fill="color-mix(in srgb, var(--color-primary) 35%, transparent)"
      stroke="color-mix(in srgb, var(--color-primary) 70%, transparent)"
      stroke-width="0.8"
      stroke-dasharray="2 2"
    />

    <text x="100" y="103" text-anchor="middle" class="capsid__inner-label">cargo</text>

    <!-- Vertex highlights -->
    <g class="capsid__vertices" fill="color-mix(in srgb, var(--color-danger) 90%, transparent)">
      <circle cx="100" cy="30"  r="2.5" />
      <circle cx="158" cy="55"  r="2.5" />
      <circle cx="178" cy="100" r="2.5" />
      <circle cx="158" cy="145" r="2.5" />
      <circle cx="100" cy="170" r="2.5" />
      <circle cx="42"  cy="145" r="2.5" />
      <circle cx="22"  cy="100" r="2.5" />
      <circle cx="42"  cy="55"  r="2.5" />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({ name: 'CapsidParticleSvg' })
</script>

<style lang="scss" scoped>
.capsid {
  display: block;
  width: 100%;
  height: 100%;

  &__inner-label {
    font-family: var(--font-mono);
    font-size: 8px;
    fill: var(--color-primary);
    opacity: var(--op-strong);
  }
}
</style>
