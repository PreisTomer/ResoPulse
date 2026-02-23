<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '../stores/cellStore'
import { resonanceProfiles } from '../mockData'
import type { CellRecord } from '../mockData'

type CellState = 'stable' | 'vibrating' | 'nourishing' | 'shattering' | 'destroyed'

interface BlobPoint {
  angle: number
  r: number
}

export default defineComponent({
  props: {
    type: {
      type: String as PropType<'healthy' | 'target'>,
      required: true,
    },
    label: { type: String, required: true },
    sublabel: { type: String, required: true },
    description: { type: String, required: true },
    buttonText: { type: String, required: true },
    cellData: {
      type: Object as PropType<CellRecord | null>,
      default: null,
    },
  },

  emits: {
    click: (_type: 'healthy' | 'target') => true,
  },

  setup() {
    const store = useCellStore()
    return { store }
  },

  data() {
    return {
      liveAmplitude: this.cellData?.amplitude ?? 0.8,
      cellState: 'stable' as CellState,
      shatterPending: false,
    }
  },

  computed: {
    accentColor(): string {
      return this.type === 'healthy' ? '#00d4ff' : '#ff4d6d'
    },
    rungColor(): string {
      return this.type === 'healthy' ? '#39ff14' : '#ff8c00'
    },
    stabilityPercent(): string {
      return this.cellData ? (this.cellData.stability * 100).toFixed(0) + '%' : '—'
    },
    freqLabel(): string {
      return this.cellData ? this.cellData.baseFrequency + ' Hz' : '—'
    },
    resonanceImpact(): number {
      return this.type === 'healthy'
        ? this.store.healthyResonanceImpact
        : this.store.targetResonanceImpact
    },
    resonanceProfile() {
      return resonanceProfiles[this.type]
    },
    canReset(): boolean {
      return this.resonanceImpact <= 0.85
    },
    // Live color interpolation driven by resonance impact
    cellColor(): string {
      const impact = this.resonanceImpact
      return this.type === 'target'
        ? d3.interpolateRgb('#4d79ff', '#ff4d6d')(impact) // blue → red
        : d3.interpolateRgb('#00d4ff', '#39ff14')(impact) // cyan → green
    },
  },

  watch: {
    'cellData.amplitude'(newVal: number) {
      this.liveAmplitude = newVal
    },

    'store.resetCounter'() {
      if (this.cellState === 'destroyed' || this.cellState === 'shattering') {
        // Also cancel any pending shatter delay
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearTimeout((this as any)._shatterDelayTimeout)
        this.shatterPending = false
        this.cellState = 'stable'
        this.liveAmplitude = this.cellData?.amplitude ?? 0.8
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearInterval((this as any)._particleInterval)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(this as any)._helixTimer?.stop()
        this.$nextTick(() => {
          this.drawCell()
          this.drawOscilloscope()
        })
      }
    },

    resonanceImpact(impact: number) {
      if (this.cellState === 'destroyed' || this.cellState === 'shattering') return

      if (this.type === 'target') {
        if (impact > 0.85) {
          // Keep vibrating; arm a 2.5s delay before shattering
          this.cellState = 'vibrating'
          if (!this.shatterPending) {
            this.shatterPending = true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any)._shatterDelayTimeout = setTimeout(() => {
              this.shatterPending = false
              // Only shatter if still at destructive resonance
              if (this.resonanceImpact > 0.85) this.triggerShatter()
            }, 2500)
          }
        } else {
          // Slider moved away — cancel any pending shatter
          if (this.shatterPending) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clearTimeout((this as any)._shatterDelayTimeout)
            this.shatterPending = false
          }
          this.cellState = impact > 0.08 ? 'vibrating' : 'stable'
        }
      } else {
        this.cellState = impact > 0.45 ? 'nourishing' : 'stable'
      }
    },
  },

  mounted() {
    if (this.cellData) {
      this.drawCell()
      this.drawOscilloscope()
    }
  },

  beforeUnmount() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any)._helixTimer?.stop()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any)._oscTimer?.stop()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearInterval((this as any)._particleInterval)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearTimeout((this as any)._shatterTimeout)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearTimeout((this as any)._shatterDelayTimeout)
  },

  methods: {
    // ─── State machine ──────────────────────────────────────────────────
    triggerShatter() {
      this.cellState = 'shattering'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any)._shatterStartElapsed = -1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any)._particleInterval = setInterval(() => {
        this.spawnFragment()
      }, 80)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any)._shatterTimeout = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearInterval((this as any)._particleInterval)
        this.cellState = 'destroyed'
      }, 2800)
    },

    spawnFragment() {
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      const svg = d3.select(el).select<SVGSVGElement>('svg')
      if (svg.empty()) return

      const W = 280
      const H = 210
      const angle = Math.random() * Math.PI * 2
      const startR = 50 + Math.random() * 20  // near membrane (BASE_R = 65)
      const endR = 90 + Math.random() * 70
      const len = 6 + Math.random() * 14

      svg
        .append('line')
        .attr('x1', W / 2 + Math.cos(angle) * startR)
        .attr('y1', H / 2 + Math.sin(angle) * startR)
        .attr('x2', W / 2 + Math.cos(angle) * (startR + len))
        .attr('y2', H / 2 + Math.sin(angle) * (startR + len))
        .attr('stroke', '#ff4d6d')
        .attr('stroke-width', 0.5 + Math.random() * 2)
        .attr('stroke-opacity', 1)
        .transition()
        .duration(600 + Math.random() * 900)
        .ease(d3.easeQuadOut)
        .attr('x1', W / 2 + Math.cos(angle) * endR)
        .attr('y1', H / 2 + Math.sin(angle) * endR)
        .attr('x2', W / 2 + Math.cos(angle) * (endR + len))
        .attr('y2', H / 2 + Math.sin(angle) * (endR + len))
        .attr('stroke-opacity', 0)
        .remove()
    },

    resetToStable() {
      this.store.resetCell(this.type)
    },

    // ─── 3D Elastic Blob Cell Animation ────────────────────────────────
    drawCell() {
      const cellData = this.cellData
      if (!cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return

      // Smaller canvas — cards were too tall
      const W = 280
      const H = 210
      const cx = W / 2 // 140
      const cy = H / 2 // 105
      const BASE_R = 65

      d3.select(el).selectAll('*').remove()

      // Responsive SVG — only viewBox, CSS width: 100% controls display size
      const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)

      // ── Defs ──────────────────────────────────────────────────────────
      const defs = svg.append('defs')

      // Glow filter (blob stroke)
      const glowFilterId = `glowFilter-${this.type}`
      const glowFilter = defs
        .append('filter')
        .attr('id', glowFilterId)
        .attr('x', '-60%')
        .attr('y', '-60%')
        .attr('width', '220%')
        .attr('height', '220%')
      const glowBlur = glowFilter
        .append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur')
      const glowMerge = glowFilter.append('feMerge')
      glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
      glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      // Radial gradient — subtle inner glow, NO dark edge (that was creating the black oval)
      // gradient center at top-left of blob (userSpaceOnUse = blobG local coords)
      const cellGradId = `cellGrad-${this.type}`
      const cellGrad = defs
        .append('radialGradient')
        .attr('id', cellGradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('cx', -BASE_R * 0.28)
        .attr('cy', -BASE_R * 0.35)
        .attr('r', BASE_R * 1.6)
        .attr('fx', -BASE_R * 0.32)
        .attr('fy', -BASE_R * 0.40)

      // Subtle two-stop gradient: light inner highlight → very faint cell tint at edge
      cellGrad.append('stop').attr('offset', '0%').attr('stop-color', 'white').attr('stop-opacity', 0.14)
      const gradStop1 = cellGrad
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', this.accentColor)
        .attr('stop-opacity', 0.08)

      // ── Layer 0: Aura rings ──────────────────────────────────────────
      const auraG = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)
      const auraRings = [
        auraG.append('circle').attr('r', BASE_R + 14).attr('fill', 'none').attr('stroke', this.accentColor).attr('stroke-width', 1.2),
        auraG.append('circle').attr('r', BASE_R + 26).attr('fill', 'none').attr('stroke', this.accentColor).attr('stroke-width', 0.8),
        auraG.append('circle').attr('r', BASE_R + 40).attr('fill', 'none').attr('stroke', this.accentColor).attr('stroke-width', 0.5),
      ]

      // ── Layer 1: Nucleus helix — drawn BEFORE blob fill so it shows through ──
      // No blur filter — keeps the helix crisp inside the transparent membrane
      const nucleusG = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)

      const NW = 60  // nucleus width (proportional to smaller blob)
      const NH = 28  // nucleus amplitude envelope
      const NP = 20  // sample points per strand
      const NRUNGS = 8

      const nLineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveBasis)

      const nRungsBack  = nucleusG.append('g')
      const nStrandBack = nucleusG.append('path').attr('fill', 'none').attr('stroke', this.accentColor).attr('stroke-width', 1.5).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.28)
      const nStrandFront= nucleusG.append('path').attr('fill', 'none').attr('stroke', this.accentColor).attr('stroke-width', 1.5).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.9)
      const nRungsFront = nucleusG.append('g')

      // ── Layer 2: Blob fill — subtle gradient, helix shows through ────
      const blobG = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)
      const blobFill = blobG.append('path').attr('fill', `url(#${cellGradId})`)

      // ── Layer 3: Blob stroke — glowing membrane ───────────────────────
      const blobStroke = blobG
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', this.accentColor)
        .attr('stroke-width', 2.5)
        .attr('filter', `url(#${glowFilterId})`)

      // ── Blob control points — deterministic phases ───────────────────
      const N = 16
      const blobPhases = d3.range(N).map((i: number) => ({
        baseAngle: (i / N) * Math.PI * 2,
        phaseOffset: ((i * 7919) % 6283) / 1000,
        speed: 0.6 + ((i * 1013) % 1000) / 2500,
      }))

      const blobLine = d3
        .lineRadial<BlobPoint>()
        .angle((d) => d.angle)
        .radius((d) => d.r)
        .curve(d3.curveBasisClosed)

      // ── Animation timer ──────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any)._helixTimer = d3.timer((elapsed: number) => {
        const impact = this.resonanceImpact
        const state = this.cellState
        const color = this.cellColor

        // ── Destroyed ──────────────────────────────────────────────────
        if (state === 'destroyed') {
          blobStroke.attr('stroke-opacity', 0)
          blobFill.attr('fill-opacity', 0)
          auraRings.forEach((r) => r.attr('stroke-opacity', 0))
          nStrandFront
            .attr('d', `M${-NW / 2},0 L${NW / 2},0`)
            .attr('stroke', '#ff4d6d')
            .attr('stroke-opacity', 0.35)
            .attr('stroke-width', 1)
          nStrandBack.attr('stroke-opacity', 0)
          nRungsFront.selectAll('*').remove()
          nRungsBack.selectAll('*').remove()
          glowBlur.attr('stdDeviation', '1')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this as any)._helixTimer?.stop()
          return
        }

        // ── Shattering ─────────────────────────────────────────────────
        if (state === 'shattering') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((this as any)._shatterStartElapsed < 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any)._shatterStartElapsed = elapsed
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const shatterAge = elapsed - (this as any)._shatterStartElapsed
          const progress = Math.min(1, Math.max(0, shatterAge / 2800))
          const chaos = 12 + progress * 45
          const expandR = BASE_R + progress * 32

          const blobPts: BlobPoint[] = blobPhases.map((p) => ({
            angle: p.baseAngle,
            r: expandR + (Math.random() - 0.5) * chaos * 2,
          }))
          const blobPath = blobLine(blobPts) || ''

          blobStroke
            .attr('d', blobPath)
            .attr('stroke', '#ff4d6d')
            .attr('stroke-opacity', Math.max(0, 1 - progress * 0.9))
            .attr('stroke-width', 2.5 + progress * 3)
          blobFill
            .attr('d', blobPath)
            .attr('fill', '#ff4d6d')
            .attr('fill-opacity', Math.max(0, 0.1 - progress * 0.1))
          auraRings.forEach((ring, i) =>
            ring.attr('stroke-opacity', Math.max(0, 0.3 - progress * 0.35 - i * 0.05)),
          )
          const nPts1 = d3.range(NP).map((k: number) => ({
            x: -NW / 2 + (k / (NP - 1)) * NW,
            y:
              (NH / 2 - 4) *
                Math.sin((k / NP) * Math.PI * 3 + elapsed * 0.025) *
                (1 - progress * 0.9) +
              (Math.random() - 0.5) * 18 * progress,
          }))
          nStrandFront
            .attr('d', nLineGen(nPts1) || '')
            .attr('stroke', '#ff4d6d')
            .attr('stroke-opacity', Math.max(0, 1 - progress * 0.9))
          nStrandBack.attr('stroke-opacity', 0)
          nRungsFront.selectAll('*').remove()
          nRungsBack.selectAll('*').remove()
          glowBlur.attr('stdDeviation', (3 + progress * 12).toFixed(1))
          return
        }

        // ── Normal: stable / vibrating / nourishing ────────────────────
        const isNourishing = state === 'nourishing'
        const isVibrating = state === 'vibrating'

        // More organic stable jitter (6 instead of 3) — less circle-like
        const jitter = isVibrating ? 4 + impact * 18 : isNourishing ? 5 : 6
        const radiusMod = isNourishing ? 1 + impact * 0.12 : 1
        const speedMult = isVibrating
          ? 1 + impact * 5
          : isNourishing
          ? 0.4 + impact * 0.4
          : 0.8

        const blobPts: BlobPoint[] = blobPhases.map((p) => {
          const wave =
            Math.sin(elapsed * 0.001 * p.speed * speedMult + p.phaseOffset) * jitter
          // Slightly higher base noise for organic irregularity
          const noise = (Math.random() - 0.5) * (isVibrating ? jitter * 0.5 : 2.5)
          return { angle: p.baseAngle, r: BASE_R * radiusMod + wave + noise }
        })
        const blobPath = blobLine(blobPts) || ''

        blobStroke
          .attr('d', blobPath)
          .attr('stroke', color)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', isNourishing ? 3 : 2.5)
        blobFill.attr('d', blobPath).attr('fill', `url(#${cellGradId})`)

        // Update gradient edge stop color to follow live cellColor
        gradStop1.attr('stop-color', color)

        // Aura rings
        const auraPulseSpeed = isVibrating
          ? 0.003 + impact * 0.006
          : isNourishing
          ? 0.0015 + impact * 0.003
          : 0.0012
        auraRings.forEach((ring, i) => {
          const pulse = (Math.sin(elapsed * auraPulseSpeed - i * 0.9) + 1) / 2
          const baseOpacity = isVibrating
            ? 0.08 + impact * 0.35
            : isNourishing
            ? 0.08 + impact * 0.22
            : 0.04 + impact * 0.04
          ring
            .attr('stroke', color)
            .attr('stroke-opacity', baseOpacity * (0.4 + pulse * 0.6))
            .attr('r', BASE_R + 14 + i * 13 + (isNourishing ? impact * 8 : isVibrating ? impact * 4 : 0))
        })

        // ── Pseudo-3D nucleus helix ─────────────────────────────────────
        const nucleusPhase = elapsed * 0.001 * (isVibrating ? 1 + impact * 4 : 0.6)
        const nAmp = NH / 2 - 3
        const nNoise = isVibrating ? impact * 3 : 0

        const nAllPts = d3.range(NP).map((k: number) => {
          const t = k / (NP - 1)
          const theta = t * Math.PI * 4 + nucleusPhase
          return {
            x: -NW / 2 + t * NW,
            y1: nAmp * Math.sin(theta) + (Math.random() - 0.5) * nNoise,
            y2: nAmp * Math.sin(theta + Math.PI) + (Math.random() - 0.5) * nNoise,
            z: Math.cos(theta),
          }
        })

        const pts1 = nAllPts.map((p) => ({ x: p.x, y: p.y1 }))
        const pts2 = nAllPts.map((p) => ({ x: p.x, y: p.y2 }))
        nStrandFront.attr('d', nLineGen(pts1) || '').attr('stroke', color).attr('stroke-opacity', 0.9)
        nStrandBack.attr('d', nLineGen(pts2) || '').attr('stroke', color).attr('stroke-opacity', 0.28)

        nRungsFront.selectAll('*').remove()
        nRungsBack.selectAll('*').remove()
        d3.range(NRUNGS).forEach((j: number) => {
          const k = Math.min(NP - 1, Math.max(0, Math.round(((j + 0.5) / NRUNGS) * (NP - 1))))
          const pt = nAllPts[k]!
          const isFront = pt.z > 0
          const targetGroup = isFront ? nRungsFront : nRungsBack
          targetGroup
            .append('line')
            .attr('x1', pt.x).attr('x2', pt.x)
            .attr('y1', pt.y1).attr('y2', pt.y2)
            .attr('stroke', this.rungColor)
            .attr('stroke-width', isFront ? 2 : 1)
            .attr('stroke-opacity', isFront ? 0.85 : 0.22)
        })

        // Glow
        const glowStd = isNourishing
          ? (3 + impact * 10).toFixed(1)
          : isVibrating
          ? (3 + impact * 7).toFixed(1)
          : '3'
        glowBlur.attr('stdDeviation', glowStd)

      })
    },

    // ─── Oscilloscope Strip ────────────────────────────────────────────
    drawOscilloscope() {
      const cellData = this.cellData
      if (!cellData) return
      const el = this.$refs.oscCanvas as HTMLElement
      if (!el) return

      const W = 280
      const H = 44

      d3.select(el).selectAll('*').remove()

      // Responsive SVG — only viewBox
      const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)

      const path = svg
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', this.accentColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.85)

      const scrollSpeed = cellData.baseFrequency * 0.00008
      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any)._oscTimer = d3.timer((elapsed: number) => {
        const state = this.cellState
        const impact = this.resonanceImpact

        if (state === 'destroyed') {
          path
            .attr('d', `M0,${H / 2} L${W},${H / 2}`)
            .attr('stroke', '#ff4d6d')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.4)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this as any)._oscTimer?.stop()
          return
        }

        const isVibrating = state === 'vibrating'
        const isNourishing = state === 'nourishing'
        const isShattering = state === 'shattering'

        const baseAmp = this.liveAmplitude * (H / 2 - 5)
        const amp = isNourishing ? baseAmp * (1 + impact * 0.4) : baseAmp
        const speedMult = isVibrating ? 1 + impact * 5 : isShattering ? 8 : 1

        const pts = d3.range(120).map((i: number) => ({
          x: (i / 119) * W,
          y:
            H / 2 +
            amp * Math.sin((i / 120) * Math.PI * 8 + elapsed * scrollSpeed * speedMult) +
            (isShattering ? (Math.random() - 0.5) * H * 0.55 : 0),
        }))

        path
          .attr('d', lineGen(pts) || '')
          .attr('stroke', isShattering ? '#ff4d6d' : this.cellColor)
      })
    },

    handleClick() {
      this.$emit('click', this.type)
    },
  },
})
</script>

<template>
  <div :class="['cell-card', `cell-card--${type}`, `cell-card--${cellState}`]">
    <!-- Header -->
    <div class="card-header">
      <span class="card-icon">◎</span>
      <div>
        <div class="card-label">{{ label }}</div>
        <div class="card-sublabel">{{ sublabel }}</div>
      </div>
      <div v-if="cellData" class="card-meta">
        <span class="meta-item">{{ freqLabel }}</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">{{ stabilityPercent }}</span>
        <span class="meta-sep">·</span>
        <span class="meta-state">{{ cellState }}</span>
      </div>
    </div>

    <!-- Cell Visualization -->
    <div v-if="cellData" class="card-visual">
      <!-- 3D elastic blob + aura + nucleus -->
      <div ref="cellCanvas" class="cell-canvas"></div>

      <!-- Oscilloscope strip -->
      <div class="osc-divider">
        <span class="osc-label">OSC · {{ freqLabel }}</span>
        <span v-if="resonanceImpact > 0.05" class="osc-impact">
          ⚡ {{ (resonanceImpact * 100).toFixed(0) }}% resonance
        </span>
      </div>
      <div ref="oscCanvas" class="osc-canvas"></div>
    </div>

    <!-- Destroyed overlay -->
    <div v-if="cellState === 'destroyed'" class="destroyed-overlay">
      <span class="destroyed-text">— SIGNAL DISRUPTED —</span>
      <button class="btn-reset" :disabled="!canReset" @click="resetToStable">Reset Cell</button>
      <span v-if="!canReset" class="reset-locked">Move slider away to reset</span>
    </div>

    <!-- Description -->
    <div class="card-body">
      <p>{{ description }}</p>
    </div>

    <!-- Action -->
    <div class="card-footer">
      <button class="btn-card" @click="handleClick">{{ buttonText }}</button>
    </div>
  </div>
</template>

<style scoped>
.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s, box-shadow 0.3s;
}

.cell-card--healthy { border-left: 3px solid var(--color-accent); }
.cell-card--healthy:hover { border-color: var(--color-accent); }
.cell-card--target  { border-left: 3px solid var(--color-danger); }
.cell-card--target:hover  { border-color: var(--color-danger); }

/* State-driven glow */
.cell-card--nourishing { box-shadow: 0 0 28px rgba(0, 212, 255, 0.18); }
.cell-card--vibrating  { box-shadow: 0 0 24px rgba(255, 77, 109, 0.14); }
.cell-card--shattering {
  box-shadow: 0 0 36px rgba(255, 77, 109, 0.4);
  border-color: var(--color-danger) !important;
  animation: card-shake 0.08s linear infinite;
}
.cell-card--destroyed {
  opacity: 0.65;
  border-color: #444 !important;
  box-shadow: none;
}

@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.3deg); }
  75% { transform: translateX(2px) rotate(0.3deg); }
}

/* ── Header ──────────────────────────────── */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.card-icon { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
.cell-card--healthy .card-icon { color: var(--color-accent); }
.cell-card--target  .card-icon { color: var(--color-danger); }

.card-label { font-weight: 600; font-size: 1rem; color: var(--color-text-heading); }
.card-sublabel {
  font-size: 0.75rem; color: var(--color-text-muted);
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;
}
.card-meta {
  margin-left: auto;
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.68rem; font-family: var(--font-mono);
  color: var(--color-text-muted); white-space: nowrap;
}
.meta-sep { opacity: 0.4; }
.meta-state { text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }

/* ── Visualization ────────────────────────── */
.card-visual {
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

/* Responsive SVG canvas — viewBox + CSS controls aspect ratio */
.cell-canvas { display: block; width: 100%; line-height: 0; }
.cell-canvas svg { display: block; width: 100%; height: auto; }

.osc-divider {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.2rem 0.6rem;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.osc-label {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); text-transform: uppercase;
  letter-spacing: 0.1em; opacity: 0.7;
}
.osc-impact {
  font-size: 0.62rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.cell-card--healthy .osc-impact { color: var(--color-accent); }
.cell-card--target  .osc-impact { color: var(--color-danger); }

.osc-canvas { display: block; width: 100%; line-height: 0; }
.osc-canvas svg { display: block; width: 100%; height: auto; }

/* ── Destroyed overlay ────────────────────── */
.destroyed-overlay {
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(255, 77, 109, 0.06);
  border: 1px solid rgba(255, 77, 109, 0.25);
  border-radius: var(--radius);
}
.destroyed-text {
  font-family: var(--font-mono); font-size: 0.75rem;
  color: var(--color-danger); letter-spacing: 0.15em; text-transform: uppercase;
  animation: flicker 1.5s ease-in-out infinite;
}
@keyframes flicker {
  0%, 100% { opacity: 1; }
  45% { opacity: 0.6; }
  50% { opacity: 0.2; }
  55% { opacity: 0.8; }
}
.btn-reset {
  background: transparent; border: 1px solid var(--color-danger);
  color: var(--color-danger); padding: 0.35rem 1rem;
  border-radius: var(--radius); font-size: 0.75rem;
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;
  cursor: pointer; transition: all 0.15s;
}
.btn-reset:hover:not(:disabled) { background-color: rgba(255, 77, 109, 0.12); }
.btn-reset:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #555;
  color: #555;
}

.reset-locked {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.6;
}

/* ── Body & Footer ────────────────────────── */
.card-body { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.65; flex: 1; }
.card-footer { padding-top: 0.5rem; border-top: 1px solid var(--color-border); }
.btn-card {
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-text); padding: 0.45rem 1rem;
  border-radius: var(--radius); font-size: 0.8rem; transition: all 0.15s; cursor: pointer;
}
.cell-card--healthy .btn-card:hover { border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-dim); }
.cell-card--target  .btn-card:hover { border-color: var(--color-danger); color: var(--color-danger); background-color: var(--color-danger-dim); }
</style>
