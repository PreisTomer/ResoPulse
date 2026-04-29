<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg class="home__bode-svg" viewBox="0 0 210 188" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line class="home__bode-axis-line" x1="28" y1="12" x2="28" y2="152" stroke-width="1"/>
    <line class="home__bode-axis-line" x1="28" y1="152" x2="196" y2="152" stroke-width="1"/>
    <text class="home__bode-axis-label" x="10" y="82" text-anchor="middle" font-family="monospace" font-size="7"
      transform="rotate(-90,10,82)">Vm</text>
    <text class="home__bode-axis-label" x="112" y="165" text-anchor="middle" font-family="monospace" font-size="7"
      >f (log)</text>
    <!-- fc marker -->
    <line class="home__bode-fc-line" x1="108" y1="12" x2="108" y2="152"
      stroke-width="1" stroke-dasharray="3 3"/>
    <text class="home__bode-fc-label" x="111" y="11" font-family="monospace" font-size="7.5">fc</text>
    <!-- Healthy cell curve (dashed red) -->
    <path class="home__bode-healthy-curve" d="M 28,36 C 80,36 100,40 122,92 S 168,148 194,150"
      stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/>
    <!-- Target cell curve (cyan) with glow -->
    <path class="home__bode-target-glow" d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
      stroke-width="9" stroke-linecap="round"/>
    <path class="home__bode-target-line" d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
      stroke-width="2" stroke-linecap="round"/>
    <!-- Animated cursor tracking the target curve -->
    <circle class="home__bode-cursor-halo" r="10">
      <animateMotion dur="5s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
    </circle>
    <circle class="home__bode-cursor-dot" r="4">
      <animateMotion dur="5s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
    </circle>
    <!-- Legend -->
    <line class="home__bode-legend-target-line" x1="28" y1="175" x2="46" y2="175" stroke-width="1.5"/>
    <text class="home__bode-legend-target-text" x="50" y="178" font-family="monospace" font-size="7">Target</text>
    <line class="home__bode-healthy-legend-line" x1="104" y1="175" x2="122" y2="175"
      stroke-width="1.5" stroke-dasharray="3 2"/>
    <text class="home__bode-healthy-legend-text" x="126" y="178" font-family="monospace" font-size="7">Healthy</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BodePlotSvg',
})
</script>

<style lang="scss" scoped>
.home__bode-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  mix-blend-mode: screen;
}

.home__bode-fc-line        { stroke: color-mix(in srgb, var(--color-primary) 45%, transparent); }
.home__bode-fc-label       { fill: color-mix(in srgb, var(--color-primary) 80%, transparent); }
.home__bode-target-glow    { stroke: color-mix(in srgb, var(--color-primary) 20%, transparent); }
.home__bode-target-line    { stroke: color-mix(in srgb, var(--color-primary) 88%, transparent); }
.home__bode-cursor-halo    { fill: color-mix(in srgb, var(--color-primary) 18%, transparent); }
.home__bode-cursor-dot     { fill: var(--color-primary); }
.home__bode-legend-target-line { stroke: color-mix(in srgb, var(--color-primary) 85%, transparent); }
.home__bode-legend-target-text { fill: color-mix(in srgb, var(--color-primary) 85%, transparent); }
.home__bode-healthy-curve      { stroke: color-mix(in srgb, var(--color-danger) 60%, transparent); }
.home__bode-healthy-legend-line { stroke: color-mix(in srgb, var(--color-danger) 65%, transparent); }
.home__bode-healthy-legend-text { fill: color-mix(in srgb, var(--color-danger) 65%, transparent); }
.home__bode-axis-line  { stroke: color-mix(in srgb, white 28%, transparent); }
.home__bode-axis-label { fill: color-mix(in srgb, white 48%, transparent); }
</style>
