<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg class="home__cell-svg" viewBox="0 0 190 242" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="home-cell-clip">
        <circle cx="95" cy="122" r="68"/>
      </clipPath>
      <linearGradient id="home-vm-grad" x1="0" y1="0" x2="0" y2="1">
        <stop class="home__vm-grad-stop-top" offset="0%">
          <animate attributeName="stop-opacity" values="0.12;0.26;0.12" dur="3s" repeatCount="indefinite"/>
        </stop>
        <stop offset="48%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
        <stop offset="52%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
        <stop offset="100%" style="stop-color: var(--color-danger)">
          <animate attributeName="stop-opacity" values="0.08;0.20;0.08" dur="3s" repeatCount="indefinite"/>
        </stop>
      </linearGradient>
    </defs>
    <g clip-path="url(#home-cell-clip)">
      <g class="home__efield-arrow home__efield-arrow--1">
        <line class="home__efield-line home__efield-line--dim" x1="0" y1="94" x2="180" y2="94" stroke-width="1"/>
        <polygon class="home__efield-arrow-head home__efield-arrow-head--dim" points="184,94 175,90 175,98"/>
      </g>
      <g class="home__efield-arrow home__efield-arrow--2">
        <line class="home__efield-line home__efield-line--bright" x1="0" y1="122" x2="180" y2="122" stroke-width="1"/>
        <polygon class="home__efield-arrow-head home__efield-arrow-head--bright" points="184,122 175,118 175,126"/>
      </g>
      <g class="home__efield-arrow home__efield-arrow--3">
        <line class="home__efield-line home__efield-line--dim" x1="0" y1="150" x2="180" y2="150" stroke-width="1"/>
        <polygon class="home__efield-arrow-head home__efield-arrow-head--dim" points="184,150 175,146 175,154"/>
      </g>
      <circle cx="95" cy="122" r="68" fill="url(#home-vm-grad)"/>
      <!-- Positive charge particles drifting upward -->
      <circle class="home__pos-charge" cx="83" cy="132" r="2.4" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle class="home__pos-charge" cx="95" cy="132" r="2.4" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.93s"/>
      </circle>
      <circle class="home__pos-charge" cx="107" cy="132" r="2.4" opacity="0">
        <animate attributeName="cy" values="132;64" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.86s"/>
      </circle>
      <!-- Negative charge particles drifting downward -->
      <circle class="home__neg-charge" cx="83" cy="112" r="2.4" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="0.47s"/>
      </circle>
      <circle class="home__neg-charge" cx="95" cy="112" r="2.4" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
      </circle>
      <circle class="home__neg-charge" cx="107" cy="112" r="2.4" opacity="0">
        <animate attributeName="cy" values="112;180" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.12;0.78;1" dur="2.8s" repeatCount="indefinite" begin="2.33s"/>
      </circle>
    </g>
    <!-- Membrane and nucleus rings -->
    <circle class="home__cell-membrane" cx="95" cy="122" r="70" stroke-width="3"/>
    <circle class="home__cell-membrane-inner" cx="95" cy="122" r="66.5" stroke-width="1"/>
    <circle class="home__nucleus-ring" cx="95" cy="122" r="25" stroke-width="1.5"/>
    <circle class="home__nucleus-inner" cx="95" cy="122" r="22"/>
    <!-- Voltage caps at poles -->
    <path class="home__vm-cap home__vm-cap--pos"
      d="M 61,66 A 70,70 0 0 1 129,66"
      stroke-width="2.5"/>
    <path class="home__vm-cap home__vm-cap--neg"
      d="M 61,178 A 70,70 0 0 0 129,178"
      stroke-width="2.5"/>
    <!-- Labels -->
    <text class="home__pos-vm-label" x="95" y="26" text-anchor="middle" font-family="monospace" font-size="9">+Vm</text>
    <text class="home__neg-vm-label" x="95" y="232" text-anchor="middle" font-family="monospace" font-size="9">-Vm</text>
    <text class="home__efield-label" x="163" y="96" font-family="monospace" font-size="10">E⃗</text>
    <text class="home__nucleus-label" x="95" y="127" text-anchor="middle" font-family="monospace" font-size="7">nucleus</text>
    <text class="home__membrane-label" x="95" y="200" text-anchor="middle" font-family="monospace" font-size="7">membrane</text>
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

.home__efield-line {
  &--dim    { stroke: color-mix(in srgb, var(--color-primary) 65%, transparent); }
  &--bright { stroke: color-mix(in srgb, var(--color-primary) 85%, transparent); }
}

.home__efield-arrow-head {
  &--dim    { fill: color-mix(in srgb, var(--color-primary) 65%, transparent); }
  &--bright { fill: color-mix(in srgb, var(--color-primary) 85%, transparent); }
}

.home__vm-grad-stop-top { stop-color: var(--color-primary); }

.home__cell-membrane {
  stroke: color-mix(in srgb, var(--color-primary) 55%, transparent);
  fill: color-mix(in srgb, var(--color-primary) 6%, transparent);
  animation: home-cell-breathe 4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.home__cell-membrane-inner {
  stroke: color-mix(in srgb, var(--color-primary) 18%, transparent);
  fill: color-mix(in srgb, var(--color-primary) 4%, transparent);
}

.home__nucleus-ring {
  stroke: color-mix(in srgb, var(--color-purple) 75%, transparent);
  fill: color-mix(in srgb, var(--color-purple) 14%, transparent);
}

.home__nucleus-inner {
  fill: color-mix(in srgb, var(--color-purple) 8%, transparent);
}

.home__nucleus-label {
  fill: color-mix(in srgb, var(--color-purple) 70%, transparent);
}

.home__vm-cap {
  &--pos {
    stroke: color-mix(in srgb, var(--color-primary) 90%, transparent);
    fill: color-mix(in srgb, var(--color-primary) 22%, transparent);
    animation: home-vm-pulse 2s ease-in-out infinite;
  }
  &--neg {
    animation: home-vm-pulse 2s ease-in-out infinite 1s;
    stroke: color-mix(in srgb, var(--color-danger) 85%, transparent);
    fill: color-mix(in srgb, var(--color-danger) 16%, transparent);
  }
}

.home__pos-charge     { fill: var(--color-primary); }
.home__neg-charge     { fill: var(--color-danger); }
.home__pos-vm-label   { fill: color-mix(in srgb, var(--color-primary) 90%, transparent); }
.home__neg-vm-label   { fill: color-mix(in srgb, var(--color-danger) 90%, transparent); }
.home__efield-label   { fill: color-mix(in srgb, var(--color-primary) 75%, transparent); }
.home__membrane-label { fill: color-mix(in srgb, var(--color-primary) 45%, transparent); }

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
