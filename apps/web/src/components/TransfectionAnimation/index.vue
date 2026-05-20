<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="transfection-anim"
    :class="[`transfection-anim--${stateClass}`]"
    viewBox="0 0 320 220"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <radialGradient id="ta-membrane" cx="50%" cy="50%" r="50%">
        <stop offset="80%"  stop-color="color-mix(in srgb, var(--color-primary) 10%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 35%, transparent)" />
      </radialGradient>
      <radialGradient id="ta-nucleus" cx="40%" cy="40%" r="60%">
        <stop offset="0%"  stop-color="color-mix(in srgb, var(--color-primary) 45%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 25%, transparent)" />
      </radialGradient>
      <linearGradient id="ta-field" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="color-mix(in srgb, var(--color-primary) 40%, transparent)" />
        <stop offset="50%"  stop-color="color-mix(in srgb, var(--color-primary) 70%, transparent)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--color-primary) 40%, transparent)" />
      </linearGradient>
    </defs>

    <!-- Electrode plates (left / right) -->
    <g class="transfection-anim__electrodes">
      <rect x="0" y="60" width="8" height="100" fill="color-mix(in srgb, var(--color-text) 35%, transparent)" rx="2" />
      <rect x="312" y="60" width="8" height="100" fill="color-mix(in srgb, var(--color-text) 35%, transparent)" rx="2" />
      <text x="14" y="115" class="transfection-anim__electrode-label">+</text>
      <text x="298" y="115" class="transfection-anim__electrode-label" text-anchor="end">−</text>
    </g>

    <!-- Field lines (only when voltage applied) -->
    <g v-if="fieldActive" class="transfection-anim__field-lines">
      <line v-for="i in 5" :key="`f${i}`"
        :x1="10" :y1="70 + i * 16"
        :x2="310" :y2="70 + i * 16"
        stroke="url(#ta-field)"
        stroke-width="0.8"
        stroke-dasharray="2 4"
        opacity="0.5"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.6s" repeatCount="indefinite" />
      </line>
    </g>

    <!-- DNA strands floating in buffer (outside cell) -->
    <g class="transfection-anim__dna-pool">
      <g v-for="(d, i) in dnaParticles" :key="`d${i}`" :transform="`translate(${d.x} ${d.y}) rotate(${d.rot})`">
        <path d="M -8 0 q 4 -3 8 0 t 8 0" fill="none"
          stroke="color-mix(in srgb, var(--color-ok) 65%, transparent)"
          stroke-width="1.5"
        />
        <path d="M -8 3 q 4 -3 8 0 t 8 0" fill="none"
          stroke="color-mix(in srgb, var(--color-ok) 35%, transparent)"
          stroke-width="1.2"
        />
      </g>
    </g>

    <!-- Cell body (centered) -->
    <g class="transfection-anim__cell" transform="translate(160 110)">
      <!-- Membrane -->
      <circle r="58"
        fill="url(#ta-membrane)"
        :stroke="cellStrokeColor"
        stroke-width="2"
      />

      <!-- Electroporation pores at field-aligned poles (when above threshold) -->
      <g v-if="poresOpen" class="transfection-anim__pores">
        <g v-for="(p, i) in poreSet" :key="`p${i}`" :transform="`rotate(${p.angle})`">
          <ellipse cx="58" cy="0" rx="3" ry="6"
            fill="color-mix(in srgb, var(--color-amber) 60%, transparent)"
            stroke="color-mix(in srgb, var(--color-amber) 90%, transparent)"
            stroke-width="0.8"
          >
            <animate attributeName="ry" values="4; 7; 4" dur="1.4s" repeatCount="indefinite" :begin="`${i * 0.18}s`" />
          </ellipse>
        </g>
      </g>

      <!-- Nucleus -->
      <circle r="24" cx="3" cy="-3"
        fill="url(#ta-nucleus)"
        :stroke="nucleusStroke"
        stroke-width="1.2"
      />

      <!-- DNA cargo inside cell (count grows with transfection efficiency) -->
      <g v-if="poresOpen">
        <g v-for="n in cargoInsideCount" :key="`c${n}`" :transform="`translate(${cargoX(n)} ${cargoY(n)})`">
          <path d="M -5 0 q 2.5 -2 5 0 t 5 0" fill="none"
            stroke="color-mix(in srgb, var(--color-ok) 85%, transparent)"
            stroke-width="1.5"
          >
            <animate attributeName="opacity" values="0; 1; 0.85" dur="1.6s" :begin="`${n * 0.3}s`" repeatCount="1" fill="freeze" />
          </path>
        </g>
      </g>

      <!-- Lysis overlay (when DR too high) -->
      <circle v-if="cellDying" r="58"
        fill="color-mix(in srgb, var(--color-danger) 18%, transparent)"
        stroke="color-mix(in srgb, var(--color-danger) 70%, transparent)"
        stroke-width="2"
        stroke-dasharray="3 3"
      >
        <animate attributeName="r" values="58; 64; 58" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7; 1; 0.7" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- DNA streamers flowing through pores into the cell -->
    <g v-if="streamsActive" class="transfection-anim__streams">
      <circle r="2" fill="color-mix(in srgb, var(--color-ok) 80%, transparent)">
        <animateMotion path="M 30 110 L 102 110" dur="2.5s" repeatCount="indefinite" begin="0s" />
        <animate attributeName="opacity" values="0; 1; 0" dur="2.5s" repeatCount="indefinite" begin="0s" />
      </circle>
      <circle r="2" fill="color-mix(in srgb, var(--color-ok) 80%, transparent)">
        <animateMotion path="M 290 110 L 218 110" dur="2.5s" repeatCount="indefinite" begin="1.25s" />
        <animate attributeName="opacity" values="0; 1; 0" dur="2.5s" repeatCount="indefinite" begin="1.25s" />
      </circle>
      <circle r="2" fill="color-mix(in srgb, var(--color-ok) 80%, transparent)">
        <animateMotion path="M 30 105 L 102 110" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
        <animate attributeName="opacity" values="0; 1; 0" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
      </circle>
    </g>

    <!-- Status label -->
    <text x="160" y="208" text-anchor="middle" class="transfection-anim__status">{{ statusLabel }}</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface DnaParticle { x: number; y: number; rot: number }

const DNA_POOL: DnaParticle[] = [
  { x: 35,  y: 75,  rot: 20 },
  { x: 38,  y: 165, rot: -30 },
  { x: 280, y: 70,  rot: 60 },
  { x: 285, y: 170, rot: -15 },
  { x: 45,  y: 130, rot: 45 },
  { x: 275, y: 130, rot: -45 },
]

const PORE_ANGLES = [0, 30, -30, 180, 150, 210]

export default defineComponent({
  name: 'TransfectionAnimation',
  props: {
    fieldStrength:     { type: Number, default: 0 },
    efficiency:        { type: Number, default: 0 },
    viability:         { type: Number, default: 1 },
    ariaLabel:         { type: String,  default: 'Transfection animation showing DNA flowing through electroporation pores into a cell' },
  },
  computed: {
    fieldActive(): boolean {
      return this.fieldStrength > 0.05
    },
    poresOpen(): boolean {
      return this.fieldStrength >= 0.5 && this.viability >= 0.2
    },
    cellDying(): boolean {
      return this.viability < 0.5
    },
    streamsActive(): boolean {
      return this.poresOpen && !this.cellDying
    },
    stateClass(): string {
      if (this.cellDying) return 'lysing'
      if (this.poresOpen) return 'transfecting'
      if (this.fieldActive) return 'charging'
      return 'idle'
    },
    cellStrokeColor(): string {
      if (this.cellDying)  return 'color-mix(in srgb, var(--color-danger) 80%, transparent)'
      if (this.poresOpen)  return 'color-mix(in srgb, var(--color-amber) 75%, transparent)'
      return 'color-mix(in srgb, var(--color-primary) 65%, transparent)'
    },
    nucleusStroke(): string {
      return this.poresOpen
        ? 'color-mix(in srgb, var(--color-ok) 70%, transparent)'
        : 'color-mix(in srgb, var(--color-primary) 75%, transparent)'
    },
    poreSet(): { angle: number }[] {
      const numPores = Math.min(6, Math.max(2, Math.round(this.fieldStrength * 6)))
      return PORE_ANGLES.slice(0, numPores).map(angle => ({ angle }))
    },
    cargoInsideCount(): number {
      const max = 8
      return Math.round(this.efficiency * max)
    },
    dnaParticles(): DnaParticle[] {
      return DNA_POOL
    },
    statusLabel(): string {
      if (this.cellDying)  return 'lysis'
      if (this.poresOpen)  return 'transfecting'
      if (this.fieldActive) return 'charging membrane'
      return 'idle'
    },
  },
  methods: {
    cargoX(n: number): number {
      const angle = (n * 137.5) * (Math.PI / 180)
      const r = 14 + (n % 3) * 8
      return Math.cos(angle) * r
    },
    cargoY(n: number): number {
      const angle = (n * 137.5) * (Math.PI / 180)
      const r = 14 + (n % 3) * 8
      return Math.sin(angle) * r
    },
  },
})
</script>

<style lang="scss" scoped>
.transfection-anim {
  display: block;
  width: 100%;
  height: auto;
  max-width: 480px;

  &__electrode-label {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    fill: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  &__status {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    fill: var(--color-text);
    opacity: var(--op-muted);

    .transfection-anim--lysing      & { fill: var(--color-danger); opacity: var(--op-strong); }
    .transfection-anim--transfecting & { fill: var(--color-ok); opacity: var(--op-strong); }
    .transfection-anim--charging    & { fill: var(--color-amber); opacity: var(--op-strong); }
  }

  @media (prefers-reduced-motion: reduce) {
    .transfection-anim__field-lines line,
    .transfection-anim__pores ellipse,
    .transfection-anim__streams circle {
      animation: none;
      opacity: 0.6;
    }
  }
}
</style>
