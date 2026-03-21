<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <svg class="home__cell-svg" viewBox="0 0 190 242" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="home-cell-clip">
        <circle cx="95" cy="122" r="68"/>
      </clipPath>
      <linearGradient id="home-vm-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(0,212,255)">
          <animate attributeName="stop-opacity" values="0.12;0.26;0.12" dur="3s" repeatCount="indefinite"/>
        </stop>
        <stop offset="48%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
        <stop offset="52%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
        <stop offset="100%" stop-color="rgb(255,77,109)">
          <animate attributeName="stop-opacity" values="0.08;0.20;0.08" dur="3s" repeatCount="indefinite"/>
        </stop>
      </linearGradient>
    </defs>
    <g clip-path="url(#home-cell-clip)">
      <g class="home__efield-arrow home__efield-arrow--1">
        <line x1="0" y1="94" x2="180" y2="94" stroke="rgba(0,212,255,0.65)" stroke-width="1"/>
        <polygon points="184,94 175,90 175,98" fill="rgba(0,212,255,0.65)"/>
      </g>
      <g class="home__efield-arrow home__efield-arrow--2">
        <line x1="0" y1="122" x2="180" y2="122" stroke="rgba(0,212,255,0.85)" stroke-width="1"/>
        <polygon points="184,122 175,118 175,126" fill="rgba(0,212,255,0.85)"/>
      </g>
      <g class="home__efield-arrow home__efield-arrow--3">
        <line x1="0" y1="150" x2="180" y2="150" stroke="rgba(0,212,255,0.65)" stroke-width="1"/>
        <polygon points="184,150 175,146 175,154" fill="rgba(0,212,255,0.65)"/>
      </g>
      <circle cx="95" cy="122" r="68" fill="url(#home-vm-grad)"/>
      <!-- Positive charge particles drifting upward -->
      <circle cx="83" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle cx="95" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
      </circle>
      <circle cx="107" cy="132" r="2.4" fill="rgb(0,212,255)" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
      </circle>
      <!-- Negative charge particles drifting downward -->
      <circle cx="83" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
      </circle>
      <circle cx="95" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
      </circle>
      <circle cx="107" cy="112" r="2.4" fill="rgb(255,77,109)" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
      </circle>
    </g>
    <!-- Membrane and nucleus rings -->
    <circle class="home__cell-membrane" cx="95" cy="122" r="70"
      stroke="rgba(0,212,255,0.55)" stroke-width="3" fill="rgba(0,212,255,0.06)"/>
    <circle cx="95" cy="122" r="66.5"
      stroke="rgba(0,212,255,0.18)" stroke-width="1" fill="rgba(0,212,255,0.04)"/>
    <circle cx="95" cy="122" r="25"
      stroke="rgba(167,139,250,0.75)" stroke-width="1.5" fill="rgba(167,139,250,0.14)"/>
    <circle cx="95" cy="122" r="22" fill="rgba(167,139,250,0.08)"/>
    <!-- Voltage caps at poles -->
    <path class="home__vm-cap home__vm-cap--pos"
      d="M 61,66 A 70,70 0 0 1 129,66"
      stroke="rgba(0,212,255,0.9)" stroke-width="2.5" fill="rgba(0,212,255,0.22)"/>
    <path class="home__vm-cap home__vm-cap--neg"
      d="M 61,178 A 70,70 0 0 0 129,178"
      stroke="rgba(255,77,109,0.85)" stroke-width="2.5" fill="rgba(255,77,109,0.16)"/>
    <!-- Labels -->
    <text x="95" y="26" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(0,212,255,0.9)">+Vm</text>
    <text x="95" y="232" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(255,77,109,0.9)">-Vm</text>
    <text x="163" y="96" font-family="monospace" font-size="10" fill="rgba(0,212,255,0.75)">E⃗</text>
    <text x="95" y="127" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(167,139,250,0.7)">nucleus</text>
    <text x="95" y="200" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(0,212,255,0.45)">membrane</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CellIllustrationSvg',
})
</script>

<style lang="scss" scoped>
.home__cell-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  mix-blend-mode: screen;
}

.home__efield-arrow {
  animation: home-efield-drift 3s ease-in-out infinite;
  &--1 { animation-delay: 0s; }
  &--2 { animation-delay: 0.6s; }
  &--3 { animation-delay: 1.2s; }
}

.home__cell-membrane {
  animation: home-cell-breathe 4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.home__vm-cap {
  &--pos { animation: home-vm-pulse 2s ease-in-out infinite; }
  &--neg { animation: home-vm-pulse 2s ease-in-out infinite 1s; }
}

@keyframes home-efield-drift {
  0%   { transform: translateX(-8px); opacity: 0.45; }
  50%  { transform: translateX(8px);  opacity: 1; }
  100% { transform: translateX(-8px); opacity: 0.45; }
}

@keyframes home-cell-breathe {
  0%, 100% { r: 70; }
  50%       { r: 72; }
}

@keyframes home-vm-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
</style>
