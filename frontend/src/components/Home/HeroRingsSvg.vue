<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="home__hero-bg" aria-hidden="true">
    <svg class="home__hero-bg-svg" viewBox="0 0 900 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Origin dot: blinks first, rings shoot outward from it -->
      <circle class="home__hero-bg-dot" cx="450" cy="450" r="6" fill="rgba(0,212,255,1)"/>
      <!-- Concentric rings: same visual language as the logo rings, amplified -->
      <circle class="home__hero-bg-ring" cx="450" cy="450" r="148" stroke="rgba(0,212,255,1)"    stroke-width="1.2" fill="none"/>
      <circle class="home__hero-bg-ring" cx="450" cy="450" r="240" stroke="rgba(0,212,255,0.85)" stroke-width="1"   fill="none"/>
      <circle class="home__hero-bg-ring" cx="450" cy="450" r="338" stroke="rgba(0,212,255,0.65)" stroke-width="0.9" fill="none"/>
      <circle class="home__hero-bg-ring" cx="450" cy="450" r="440" stroke="rgba(0,212,255,0.45)" stroke-width="0.8" fill="none"/>
      <circle class="home__hero-bg-ring" cx="450" cy="450" r="542" stroke="rgba(0,212,255,0.25)" stroke-width="0.7" fill="none"/>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HeroRingsSvg',
})
</script>

<style lang="scss" scoped>
.home__hero-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);

  @media (max-width: 520px) { display: none; }

  &-svg {
    width: 760px;
    height: auto;
    mix-blend-mode: screen;
    animation: hero-bg-reveal 2s ease-out forwards;
  }

  &-dot {
    transform-box: fill-box;
    transform-origin: center;
    animation: bg-dot-flash 0.45s ease-out forwards;
  }

  &-ring {
    transform-box: fill-box;
    transform-origin: center;
    // expand first, then hand off to the looping pulse
    animation:
      bg-ring-expand 0.55s cubic-bezier(0.16, 1, 0.3, 1) both,
      bg-ring-pulse  3.5s ease-in-out infinite;

    // [expand-delay, pulse-delay] — rings shoot from center outward, staggered 50ms
    &:nth-of-type(2) { animation-delay: 0.18s, 0.85s; }
    &:nth-of-type(3) { animation-delay: 0.23s, 1.55s; }
    &:nth-of-type(4) { animation-delay: 0.28s, 2.25s; }
    &:nth-of-type(5) { animation-delay: 0.33s, 2.95s; }
    &:nth-of-type(6) { animation-delay: 0.38s, 3.65s; }
  }
}

@keyframes hero-bg-reveal {
  0%, 40% { opacity: 0.85; }
  100%     { opacity: 0.26; }
}

@keyframes bg-dot-flash {
  0%   { opacity: 0; transform: scale(0); }
  25%  { opacity: 1; transform: scale(3); }
  65%  { opacity: 0.9; transform: scale(1.5); }
  100% { opacity: 0; transform: scale(0); }
}

@keyframes bg-ring-expand {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

@keyframes bg-ring-pulse {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 1; }
}
</style>
