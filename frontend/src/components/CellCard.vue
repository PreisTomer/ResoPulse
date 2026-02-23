<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '../stores/cellStore'
import { useExperimentStore } from '../stores/experimentStore'
import type { CellRecord } from '../mockData'
import type { CellState } from '../types/cell'
import {
  CELL_COLORS,
  EDITABLE_PARAMS,
  DISRUPTION_WARN_THRESHOLD,
  NOURISHING_THRESHOLD,
  VIBRATING_MIN_THRESHOLD,
  TEMP_WARN_CELSIUS,
  LYSIS_DELAY_MS,
  LYSIS_DURATION_MS,
  FRAGMENT_INTERVAL_MS,
} from '../constants/cellCard'
import { setupBlobAnimation, setupOscilloscope, spawnFragment } from '../utils/cellAnimation'

export default defineComponent({
  props: {
    type: {
      type: String as PropType<'healthy' | 'target'>,
      required: true,
    },
    label:       { type: String, required: true },
    sublabel:    { type: String, required: true },
    description: { type: String, required: true },
    buttonText:  { type: String, required: true },
    cellData: {
      type: Object as PropType<CellRecord | null>,
      default: null,
    },
  },

  emits: {
    click: (_type: 'healthy' | 'target') => true,
  },

  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      liveAmplitude:  this.cellData?.amplitude ?? 0.8,
      cellState:      'stable' as CellState,
      shatterPending: false,
      paramsExpanded: false,
      // Animation timer handles — typed here so TypeScript can see them on `this`
      _helixTimer:        null as d3.Timer | null,
      _oscTimer:          null as d3.Timer | null,
      _particleInterval:  null as number | null,
      _shatterTimeout:    null as number | null,
      _shatterDelayTimeout: null as number | null,
    }
  },

  computed: {
    accentColor(): string { return CELL_COLORS[this.type].accent },
    rungColor():   string { return CELL_COLORS[this.type].rung   },

    // ── Scientific readouts ────────────────────────────────────────────────
    vm(): number {
      return (this.type === 'healthy' ? this.store.healthyVm : this.store.targetVm) * 1000 // V → mV
    },
    temperature(): number {
      return this.type === 'healthy' ? this.store.healthyTemp : this.store.targetTemp
    },
    vmDisplay():   string  { return this.vm.toFixed(3) + ' mV' },
    tempDisplay(): string  { return this.temperature.toFixed(1) + ' °C' },
    tempWarning(): boolean { return this.temperature > TEMP_WARN_CELSIUS },

    disruptionRatio(): number {
      return this.type === 'healthy'
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },
    canReset(): boolean { return this.disruptionRatio <= DISRUPTION_WARN_THRESHOLD },

    // Live color interpolation driven by disruption ratio
    cellColor(): string {
      const { interpFrom, interpTo } = CELL_COLORS[this.type]
      return d3.interpolateRgb(interpFrom, interpTo)(Math.min(1, this.disruptionRatio))
    },

    // Editable biophysical params mapped from the EDITABLE_PARAMS constant
    editableParams() {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      return EDITABLE_PARAMS.map((p) => ({
        ...p,
        displayValue: (cell as unknown as Record<string, number>)[p.key] ?? 0,
      }))
    },
  },

  watch: {
    'cellData.amplitude'(newVal: number) {
      this.liveAmplitude = newVal
    },

    'store.resetCounter'() {
      if (this.cellState !== 'lysed' && this.cellState !== 'lysing') return
      clearTimeout(this._shatterDelayTimeout ?? undefined)
      this.shatterPending = false
      this.cellState = 'stable'
      this.liveAmplitude = this.cellData?.amplitude ?? 0.8
      clearInterval(this._particleInterval ?? undefined)
      this._helixTimer?.stop()
      this.$nextTick(() => {
        this.drawCell()
        this.drawOscilloscope()
      })
    },

    disruptionRatio(impact: number) {
      if (this.cellState === 'lysed' || this.cellState === 'lysing') return

      if (this.type === 'target') {
        if (impact > DISRUPTION_WARN_THRESHOLD) {
          this.cellState = 'vibrating'
          if (!this.shatterPending) {
            this.shatterPending = true
            this._shatterDelayTimeout = setTimeout(() => {
              this.shatterPending = false
              if (this.disruptionRatio > DISRUPTION_WARN_THRESHOLD) this.triggerLysis()
            }, LYSIS_DELAY_MS) as unknown as number
          }
        } else {
          if (this.shatterPending) {
            clearTimeout(this._shatterDelayTimeout ?? undefined)
            this.shatterPending = false
          }
          this.cellState = impact > VIBRATING_MIN_THRESHOLD ? 'vibrating' : 'stable'
        }
      } else {
        this.cellState = impact > NOURISHING_THRESHOLD ? 'nourishing' : 'stable'
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
    this._helixTimer?.stop()
    this._oscTimer?.stop()
    clearInterval(this._particleInterval ?? undefined)
    clearTimeout(this._shatterTimeout ?? undefined)
    clearTimeout(this._shatterDelayTimeout ?? undefined)
  },

  methods: {
    // ── Animation setup ────────────────────────────────────────────────────
    drawCell() {
      if (!this.cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      this._helixTimer = setupBlobAnimation(
        el, this.type, this.accentColor, this.rungColor,
        () => ({ impact: this.disruptionRatio, state: this.cellState, color: this.cellColor }),
      )
    },

    drawOscilloscope() {
      if (!this.cellData) return
      const el = this.$refs.oscCanvas as HTMLElement
      if (!el) return
      this._oscTimer = setupOscilloscope(
        el, this.accentColor, this.cellData.naturalFrequency,
        () => ({ state: this.cellState, impact: this.disruptionRatio, liveAmplitude: this.liveAmplitude, cellColor: this.cellColor }),
      )
    },

    // ── State machine ──────────────────────────────────────────────────────
    triggerLysis() {
      this.cellState = 'lysing'
      useExperimentStore().logReading(useCellStore(), 'lysis')
      const el = this.$refs.cellCanvas as HTMLElement

      this._particleInterval = setInterval(() => {
        if (el) spawnFragment(el)
      }, FRAGMENT_INTERVAL_MS) as unknown as number

      this._shatterTimeout = setTimeout(() => {
        clearInterval(this._particleInterval ?? undefined)
        this.cellState = 'lysed'
      }, LYSIS_DURATION_MS) as unknown as number
    },

    onParamChange(key: string, e: Event) {
      const value = Number((e.target as HTMLInputElement).value)
      this.store.updateCellParam(this.type, key, value)
    },

    resetToStable() {
      this.store.resetCell(this.type)
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
        <span class="meta-item">{{ vmDisplay }}</span>
        <span class="meta-sep">·</span>
        <span class="meta-item" :class="{ 'meta-temp-warn': tempWarning }">{{ tempDisplay }}</span>
        <span class="meta-sep">·</span>
        <span class="meta-state">{{ cellState }}</span>
      </div>
    </div>

    <!-- Collapsible cell parameters panel -->
    <div v-if="cellData" class="params-toggle" @click="paramsExpanded = !paramsExpanded">
      <span class="params-toggle-arrow">{{ paramsExpanded ? '▾' : '▸' }}</span>
      Cell Parameters
    </div>
    <Transition name="params">
      <div v-if="cellData && paramsExpanded" class="params-panel">
        <div v-for="p in editableParams" :key="p.key" class="param-row">
          <label class="param-label">{{ p.label }}</label>
          <input
            type="number" class="param-input"
            :value="p.displayValue" :step="p.step" :min="p.min"
            @change="onParamChange(p.key, $event)"
          />
          <span class="param-unit">{{ p.unit }}</span>
        </div>
      </div>
    </Transition>

    <!-- Cell Visualization -->
    <div v-if="cellData" class="card-visual">
      <div ref="cellCanvas" class="cell-canvas"></div>

      <div class="osc-divider">
        <span class="osc-label">OSC · {{ vmDisplay }}</span>
        <span v-if="disruptionRatio > 0.05" class="osc-impact">
          ⚡ {{ (disruptionRatio * 100).toFixed(0) }}% disruption
        </span>
      </div>
      <div ref="oscCanvas" class="osc-canvas"></div>

      <!-- Lysis overlay — absolute, covers card-visual without shifting card height -->
      <div v-if="cellState === 'lysed'" class="destroyed-overlay">
        <span class="destroyed-text">— MEMBRANE LYSED —</span>
        <button class="btn-reset" :disabled="!canReset" @click="resetToStable">Reset Cell</button>
        <span v-if="!canReset" class="reset-locked">Reduce field intensity to reset</span>
      </div>
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
.cell-card--lysing {
  box-shadow: 0 0 36px rgba(255, 77, 109, 0.4);
  border-color: var(--color-danger) !important;
  animation: card-shake 0.08s linear infinite;
}
.cell-card--lysed {
  opacity: 0.65;
  border-color: #444 !important;
  box-shadow: none;
}

@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.3deg); }
  75% { transform: translateX(2px) rotate(0.3deg); }
}

/* ── Header ──────────────────────────────────────────────────────────── */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.card-icon { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
.cell-card--healthy .card-icon { color: var(--color-accent); }
.cell-card--target  .card-icon { color: var(--color-danger); }

.card-label    { font-weight: 600; font-size: 1rem; color: var(--color-text-heading); }
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
.meta-sep   { opacity: 0.4; }
.meta-state { text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }
.meta-temp-warn { color: #ffb800; }

/* ── Params toggle ───────────────────────────────────────────────────── */
.params-toggle {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.62rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text-muted); cursor: pointer;
  user-select: none; opacity: 0.65; transition: opacity 0.15s;
  margin-bottom: -0.5rem;
}
.params-toggle:hover { opacity: 1; }
.params-toggle-arrow { font-size: 0.7rem; }

/* ── Params panel ────────────────────────────────────────────────────── */
.params-panel {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.65rem 0.85rem;
  display: flex; flex-direction: column; gap: 0.45rem;
}
.param-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center; gap: 0.5rem;
}
.param-label {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em;
}
.param-input {
  width: 5rem;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 3px; color: var(--color-text-heading);
  font-family: var(--font-mono); font-size: 0.7rem;
  padding: 0.15rem 0.35rem; text-align: right;
  -moz-appearance: textfield; appearance: textfield;
}
.param-input::-webkit-inner-spin-button,
.param-input::-webkit-outer-spin-button { opacity: 0.3; }
.param-input:focus { outline: none; border-color: var(--color-primary); }

.param-unit {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.6;
  width: 2.5rem; text-align: left;
}

/* Params panel transition */
.params-enter-active, .params-leave-active { transition: opacity 0.2s, transform 0.2s; }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

/* ── Visualization ────────────────────────────────────────────────────── */
.card-visual {
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden; position: relative;
}
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

/* ── Lysis overlay ───────────────────────────────────────────────────── */
.destroyed-overlay {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.75rem;
  background-color: rgba(6, 2, 14, 0.90); backdrop-filter: blur(3px);
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
.btn-reset:disabled { opacity: 0.35; cursor: not-allowed; border-color: #555; color: #555; }

.reset-locked {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); letter-spacing: 0.06em;
  text-transform: uppercase; opacity: 0.6;
}

/* ── Body & Footer ───────────────────────────────────────────────────── */
.card-body   { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.65; flex: 1; }
.card-footer { padding-top: 0.5rem; border-top: 1px solid var(--color-border); }
.btn-card {
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-text); padding: 0.45rem 1rem;
  border-radius: var(--radius); font-size: 0.8rem; transition: all 0.15s; cursor: pointer;
}
.cell-card--healthy .btn-card:hover { border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-dim); }
.cell-card--target  .btn-card:hover { border-color: var(--color-danger); color: var(--color-danger); background-color: var(--color-danger-dim); }
</style>
