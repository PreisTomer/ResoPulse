<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <svg class="home__bode-svg" viewBox="0 0 210 188" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="28" y1="12" x2="28" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
    <line x1="28" y1="152" x2="196" y2="152" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
    <text x="10" y="82" text-anchor="middle" font-family="monospace" font-size="7"
      fill="rgba(255,255,255,0.48)" transform="rotate(-90,10,82)">Vm</text>
    <text x="112" y="165" text-anchor="middle" font-family="monospace" font-size="7"
      fill="rgba(255,255,255,0.48)">f (log)</text>
    <!-- fc marker -->
    <line x1="108" y1="12" x2="108" y2="152"
      stroke="rgba(0,212,255,0.45)" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="111" y="11" font-family="monospace" font-size="7.5" fill="rgba(0,212,255,0.8)">fc</text>
    <!-- Healthy cell curve (dashed red) -->
    <path d="M 28,36 C 80,36 100,40 122,92 S 168,148 194,150"
      stroke="rgba(255,77,109,0.6)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round"/>
    <!-- Target cell curve (cyan) with glow -->
    <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
      stroke="rgba(0,212,255,0.2)" stroke-width="9" stroke-linecap="round"/>
    <path d="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"
      stroke="rgba(0,212,255,0.88)" stroke-width="2" stroke-linecap="round"/>
    <!-- Animated cursor tracking the target curve -->
    <circle r="10" fill="rgba(0,212,255,0.18)">
      <animateMotion dur="5s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
    </circle>
    <circle r="4" fill="rgba(0,212,255,1)">
      <animateMotion dur="5s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keyPoints="0;1;0"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        path="M 28,18 C 72,18 90,22 108,82 S 158,148 194,150"/>
    </circle>
    <!-- Legend -->
    <line x1="28" y1="175" x2="46" y2="175" stroke="rgba(0,212,255,0.85)" stroke-width="1.5"/>
    <text x="50" y="178" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.85)">Target</text>
    <line x1="104" y1="175" x2="122" y2="175"
      stroke="rgba(255,77,109,0.65)" stroke-width="1.5" stroke-dasharray="3 2"/>
    <text x="126" y="178" font-family="monospace" font-size="7" fill="rgba(255,77,109,0.65)">Healthy</text>
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
</style>
