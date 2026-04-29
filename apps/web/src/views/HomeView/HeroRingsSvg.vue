<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="home__hero-bg" aria-hidden="true">
    <svg class="home__hero-bg-svg" viewBox="0 0 900 900" overflow="visible" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Origin dot: blinks first, rings shoot outward from it -->
      <circle class="home__hero-bg-dot" cx="450" cy="450" r="6"/>
      <!-- Concentric rings: same visual language as the logo rings, amplified -->
      <circle class="home__hero-bg-ring home__hero-bg-ring--1" cx="450" cy="450" r="148" stroke-width="1.2" fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--2" cx="450" cy="450" r="240" stroke-width="1"   fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--3" cx="450" cy="450" r="338" stroke-width="0.9" fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--4" cx="450" cy="450" r="440" stroke-width="0.8" fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--5" cx="450" cy="450" r="542" stroke-width="0.7" fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--6" cx="450" cy="450" r="648" stroke-width="0.6" fill="none"/>
      <circle class="home__hero-bg-ring home__hero-bg-ring--7" cx="450" cy="450" r="756" stroke-width="0.5" fill="none"/>
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
  // Positioned relative to .home (outer container, full page width) — moved outside
  // home__inner so the rings can span the full viewport rather than the 900px content box.
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
  // Fade rings out toward the bottom of the viewport; left/right edges remain visible
  mask-image: linear-gradient(to bottom, black 65%, transparent 100%);

  @media (max-width: 520px) { display: none; }

  &-svg {
    // 88vw fills viewport; capped at 1600px; overflow="visible" lets rings render outside 900×900 viewBox.
    width: min(88vw, 1600px);
    min-width: 760px;
    height: auto;
    mix-blend-mode: screen;
    animation: hero-bg-reveal 2s ease-out forwards;

    @media (max-width: 768px) {
      width: max(680px, 88vw);
      min-width: unset;
    }
  }

  &-dot {
    fill: var(--color-primary);
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
    &--1 { stroke: var(--color-primary);                                              animation-delay: 0.18s, 0.85s; }
    &--2 { stroke: color-mix(in srgb, var(--color-primary) 85%, transparent);        animation-delay: 0.23s, 1.55s; }
    &--3 { stroke: color-mix(in srgb, var(--color-primary) 65%, transparent);        animation-delay: 0.28s, 2.25s; }
    &--4 { stroke: color-mix(in srgb, var(--color-primary) 45%, transparent);        animation-delay: 0.33s, 2.95s; }
    &--5 { stroke: color-mix(in srgb, var(--color-primary) 25%, transparent);        animation-delay: 0.38s, 3.65s; }
    &--6 { stroke: color-mix(in srgb, var(--color-primary) 14%, transparent);        animation-delay: 0.43s, 4.35s; }
    &--7 { stroke: color-mix(in srgb, var(--color-primary)  7%, transparent);        animation-delay: 0.48s, 5.05s; }
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
