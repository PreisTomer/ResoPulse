<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home__feat-osc" aria-hidden="true">
    <!-- preserveAspectRatio="none" stretches SVG to fill container width exactly,
         so waves always reach both screen edges and clip naturally on resize -->
    <svg class="home__feat-osc-svg" viewBox="0 0 1200 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <!-- double-width group; scrolls via osc-scroll for a seamless loop -->
      <g class="home__feat-osc-track">
        <!-- Applied field: sine wave, cyan -->
        <path class="home__feat-osc-path--field" :d="OSC_PATH.FIELD"/>
        <!-- Transmembrane voltage Vm: cosine lag, purple -->
        <path class="home__feat-osc-path--vm" :d="OSC_PATH.VM"/>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { OSC_PATH } from '@/constants/svgPaths'

export default defineComponent({
  name: 'OscilloscopeSvg',

  data() {
    return {
      OSC_PATH,
    }
  },
})
</script>

<style lang="scss" scoped>
.home__feat-osc {
  display: none;
  position: absolute;
  top: 0;
  bottom: 0;
  // Break out of the zone's constrained width to span the full viewport
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  // Vertical mask: waves ghost in from the top and dissolve before the section ends
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 76%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 76%, transparent 100%);
  @media (min-width: 900px) { display: block; }

  // Scanline texture: horizontal raster lines at 4px pitch — "monitor" aesthetic
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent   0px,
      transparent   3px,
      rgba(0, 0, 0, 0.07) 3px,
      rgba(0, 0, 0, 0.07) 4px
    );
    pointer-events: none;
    z-index: 1;
  }
}

.home__feat-osc-svg {
  width: 100%;
  height: 100%;
  display: block;
  // Ghost opacity — 10% keeps the waves readable but firmly in the background
  opacity: 0.10;
  transform-origin: center center;
}

.home__feat-osc-track {
  // double-width group; translateX(-50%) = -1200 units = seamless loop
  transform-box: fill-box;
  animation: osc-scroll 8s linear infinite;
}

.home__feat-osc-path {
  &--field {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 1.2;
    stroke-linecap: round;
  }

  &--vm {
    fill: none;
    stroke: var(--color-purple);
    stroke-width: 1.2;
    stroke-linecap: round;
  }
}

@keyframes osc-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* Scroll-driven wave reveal (progressive enhancement — Chrome 115+) */
/* Falls back gracefully: unsupporting browsers see the static 10% opacity. */
@supports (animation-timeline: view()) {
  .home__feat-osc-svg {
    animation: osc-scroll-reveal linear both;
    animation-timeline: view(block);
    animation-range: entry 0% cover 50%;
  }
}

@keyframes osc-scroll-reveal {
  from { opacity: 0.03; transform: scaleY(0.35); }
  to   { opacity: 0.10; transform: scaleY(1); }
}
</style>
