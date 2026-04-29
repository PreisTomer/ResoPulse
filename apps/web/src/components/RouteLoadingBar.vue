<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div
    class="route-loading-bar"
    :class="{ 'route-loading-bar--active': isActive }"
    aria-hidden="true"
  >
    <div class="route-loading-bar__track">
      <div class="route-loading-bar__pulse"></div>
      <div class="route-loading-bar__pulse route-loading-bar__pulse--echo"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { routeLoading } from '@/utils/routeLoading'

export default defineComponent({
  name: 'RouteLoadingBar',

  setup() {
    return { routeLoading }
  },

  computed: {
    isActive(): boolean {
      return this.routeLoading
    },
  },
})
</script>

<style lang="scss" scoped>
.route-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 2000;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--tr-normal);

  &--active { opacity: 1; }

  &__track {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  // Sweeping wavefront (cyan→purple, matches frequency-ray gradient); paused when hidden to spare GPU.
  &__pulse {
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--color-primary) 35%, transparent) 30%,
      var(--color-primary) 55%,
      color-mix(in srgb, var(--color-purple) 80%, transparent) 80%,
      transparent 100%
    );
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 60%, transparent));
    animation: route-loading-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    animation-play-state: paused;

    &--echo {
      opacity: 0.45;
      animation-delay: 0.55s;
    }
  }

  &--active &__pulse {
    animation-play-state: running;
  }

  @media (prefers-reduced-motion: reduce) {
    &__pulse {
      animation: none;
      left: 0;
      width: 100%;
      opacity: 0.7;

      &--echo { display: none; }
    }
  }
}

@keyframes route-loading-sweep {
  0%   { left: -40%; }
  100% { left: 100%; }
}
</style>
