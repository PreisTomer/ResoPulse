<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <template v-if="cellData">
    <div
      class="cell-card__params-toggle"
      v-tip="toggleTip"
      @click="paramsExpanded = !paramsExpanded"
    >
      <span class="cell-card__params-toggle-arrow">{{ paramsExpanded ? ICON.EXPAND : ICON.COLLAPSE }}</span>
      {{ $t('cells.paramsToggleLabel') }}
    </div>
    <Transition name="params">
      <div v-if="paramsExpanded" class="cell-card__params-panel">
        <div v-for="p in editableParams" :key="p.key" class="cell-card__param-row">
          <label class="cell-card__param-label" v-tip="$t(p.tipKey)">{{ $t(p.labelKey) }}</label>
          <div class="cell-card__param-control">
            <button
              class="cell-card__param-step"
              @mousedown.prevent="startStep(p, -1)"
              @mouseup="stopStep"
              @mouseleave="stopStep"
            >−</button>
            <input
              type="number"
              class="cell-card__param-input"
              :value="p.displayValue"
              :step="p.step"
              :min="p.min"
              :max="p.max"
              @input="onInputChange(p, $event)"
            />
            <button
              class="cell-card__param-step cell-card__param-step--plus"
              @mousedown.prevent="startStep(p, 1)"
              @mouseup="stopStep"
              @mouseleave="stopStep"
            >+</button>
          </div>
          <span class="cell-card__param-unit">{{ p.unit }}</span>
        </div>
        <div
          class="cell-card__params-derived-hdr"
          v-tip="derivedTip"
        >
          <span class="cell-card__params-derived-label">{{ derivedLabel }}</span>
        </div>
        <div v-for="p in derivedParams" :key="p.label" class="cell-card__param-row cell-card__param-row--derived">
          <label class="cell-card__param-label">{{ p.label }}</label>
          <span class="cell-card__param-derived-value">{{ p.value }}</span>
          <span class="cell-card__param-unit">{{ p.unit }}</span>
        </div>
        <div v-if="canResetToPreset" class="cell-card__params-reset-row">
          <button
            class="cell-card__params-btn"
            v-tip="$t('cells.resetBtnTip')"
            @click="$emit(EMIT.RESET_TO_PRESET)"
          >{{ $t('cells.resetBtn') }}</button>
        </div>
      </div>
    </Transition>
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'

import type { CellRecord } from '@/types/cell'

type EditableRow = {
  key: string
  labelKey: string
  tipKey: string
  unit: string
  step: number
  min: number
  max: number
  displayValue: number
}

const STEP_HOLD_DELAY_MS = 380  // delay before hold-to-repeat activates
const STEP_REPEAT_MS = 80        // interval between repeated steps while held

export default defineComponent({
  props: {
    cellData: { type: Object as PropType<CellRecord | null>, default: null },
    editableParams: {
      type: Array as PropType<EditableRow[]>,
      required: true,
    },
    derivedParams: {
      type: Array as PropType<Array<{ label: string; value: string; unit: string }>>,
      required: true,
    },
    canResetToPreset: { type: Boolean, required: true },
    toggleTip:    { type: String, required: true },
    derivedLabel: { type: String, required: true },
    derivedTip:   { type: String, required: true },
  },

  emits: {
    [EMIT.PARAM_CHANGE]:    (_key: string, _value: number) => true,
    [EMIT.RESET_TO_PRESET]: () => true,
  },

  data() {
    return {
      paramsExpanded: false,
      _stepTimeout:  null as ReturnType<typeof setTimeout>  | null,
      _stepInterval: null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },
  },

  beforeUnmount() {
    this.stopStep()
  },

  methods: {
    startStep(p: EditableRow, dir: 1 | -1) {
      this.applyStep(p, dir)
      this._stepTimeout = setTimeout(() => {
        this._stepInterval = setInterval(() => this.applyStep(p, dir), STEP_REPEAT_MS)
      }, STEP_HOLD_DELAY_MS)
    },

    stopStep() {
      clearTimeout(this._stepTimeout   ?? undefined)
      clearInterval(this._stepInterval ?? undefined)
      this._stepTimeout  = null
      this._stepInterval = null
    },

    // Round to step precision to prevent floating-point drift (e.g. 0.1+0.1+0.1 ≠ 0.3)
    applyStep(p: EditableRow, dir: 1 | -1) {
      const raw      = p.displayValue + p.step * dir
      const decimals = (p.step.toString().split('.')[1] ?? '').length
      const value    = parseFloat(Math.min(p.max, Math.max(p.min, raw)).toFixed(decimals))
      this.$emit(EMIT.PARAM_CHANGE, p.key, value)
    },

    onInputChange(p: EditableRow, e: Event) {
      const raw = (e.target as HTMLInputElement).value
      if (raw === '' || raw === '-' || raw.endsWith('.')) return
      const value = Number(raw)
      if (isNaN(value)) return
      const decimals = (p.step.toString().split('.')[1] ?? '').length
      const clamped  = parseFloat(Math.min(p.max, Math.max(p.min, value)).toFixed(decimals))
      this.$emit(EMIT.PARAM_CHANGE, p.key, clamped)
    },
  },
})
</script>

<style lang="scss" scoped>


/* ── Vue Transition (name="params") ──────────────────────────────────── */
.params-enter-active, .params-leave-active { transition: opacity var(--tr-normal), transform var(--tr-normal); }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

.cell-card {
  &__params-toggle {
    @include flex-row(0.45rem);
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.3rem 0.65rem;
    transition: border-color var(--tr-fast), background-color var(--tr-fast), color var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, white 20%, transparent);
      background: color-mix(in srgb, white 6%, transparent);
      color: var(--color-text-heading);
    }
  }

  &__params-toggle-arrow { font-size: var(--fs-xs); opacity: 0.75; } // intentional between-tier value

  &__params-panel {
    background-color: color-mix(in srgb, black 30%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    @include flex-col(0.5rem);
  }

  &__param-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;

    &--derived { opacity: var(--op-partial); pointer-events: none; }
  }

  &__param-label {
    @include mono-upper(0.6rem);
    color: var(--color-text-muted);
    cursor: default;
  }

  /* ── Stepper control: [−] [input] [+] ─────────────────────────────── */
  &__param-control {
    display: flex;
    align-items: stretch;
    width: 7.8rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color var(--tr-fast);

    &:focus-within { border-color: var(--color-primary); }
  }

  &__param-step {
    flex: 0 0 1.5rem;
    background: color-mix(in srgb, white 4%, transparent);
    border: none;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-xl);
    line-height: 1;
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s;
    border-right: 1px solid var(--color-border);

    &--plus {
      border-right: none;
      border-left: 1px solid var(--color-border);
    }

    &:hover {
      background: color-mix(in srgb, white 10%, transparent);
      color: var(--color-text-heading);
    }

    &:active {
      background: var(--color-primary);
      color: var(--color-btn-dark);
    }
  }

  &__param-input {
    flex: 1 1 4.2rem;
    min-width: 0;
    background: var(--color-surface);
    border: none;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    padding: 0.24rem 0.4rem;
    text-align: left;
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { display: none; }

    &:focus { outline: none; }
  }

  &__param-unit {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6; // intentional below-tier value
    width: 2.5rem;
    text-align: left;
  }

  &__params-derived-hdr {
    @include flex-row(0.5rem);
    padding-top: 0.3rem;
    margin-top: 0.1rem;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__params-derived-label {
    @include mono-upper(0.52rem, 0.12em);
    color: var(--color-text-muted);
    opacity: 0.65; // intentional between-tier value
  }

  &__param-derived-value {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text);
    text-align: right;
    width: 5rem;
  }

  &__params-reset-row {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.2rem;
    border-top: 1px solid var(--color-border);
    margin-top: 0.1rem;
  }

  &__params-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }
}
</style>
