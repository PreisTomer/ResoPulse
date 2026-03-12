<template>
  <template v-if="cellData">
    <div
      class="cell-card__params-toggle"
      v-tip="$t('cells.paramsToggleTip')"
      @click="paramsExpanded = !paramsExpanded"
    >
      <span class="cell-card__params-toggle-arrow">{{ paramsExpanded ? ICON.EXPAND : ICON.COLLAPSE }}</span>
      {{ $t('cells.paramsToggleLabel') }}
    </div>
    <Transition name="params">
      <div v-if="paramsExpanded" class="cell-card__params-panel">
        <div v-for="p in editableParams" :key="p.key" class="cell-card__param-row">
          <label class="cell-card__param-label">{{ p.label }}</label>
          <input
            type="number" class="cell-card__param-input"
            :value="p.displayValue" :step="p.step" :min="p.min"
            @change="$emit('param-change', p.key, $event)"
          />
          <span class="cell-card__param-unit">{{ p.unit }}</span>
        </div>
        <div
          class="cell-card__params-derived-hdr"
          v-tip="$t('cells.derivedTip')"
        >
          <span class="cell-card__params-derived-label">{{ $t('cells.derivedLabel') }}</span>
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
            @click="$emit('reset-to-preset')"
          >{{ $t('cells.resetBtn') }}</button>
        </div>
      </div>
    </Transition>
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { CellRecord } from '@/types/cell'
import { ICON } from '@/constants/icons'

export default defineComponent({
  setup() { return { ICON } },
  props: {
    cellData: { type: Object as PropType<CellRecord | null>, default: null },
    editableParams: {
      type: Array as PropType<Array<{ key: string; label: string; unit: string; step: number; min: number; displayValue: number }>>,
      required: true,
    },
    derivedParams: {
      type: Array as PropType<Array<{ label: string; value: string; unit: string }>>,
      required: true,
    },
    canResetToPreset: { type: Boolean, required: true },
  },

  emits: {
    'param-change':    (_key: string, _event: Event) => true,
    'reset-to-preset': () => true,
  },

  data() {
    return { paramsExpanded: false }
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

/* ── Vue Transition (name="params") ──────────────────────────────────── */
.params-enter-active, .params-leave-active { transition: opacity 0.2s, transform 0.2s; }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

.cell-card {
  &__params-toggle {
    @include flex-row(0.45rem);
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.3rem 0.65rem;
    transition: border-color 0.15s, background-color 0.15s, color 0.15s;

    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
      color: var(--color-text-heading);
    }
  }

  &__params-toggle-arrow { font-size: 0.7rem; opacity: 0.75; }

  &__params-panel {
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    @include flex-col(0.45rem);
  }

  &__param-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;

    &--derived { opacity: 0.8; pointer-events: none; }
  }

  &__param-label {
    @include mono-upper(0.6rem);
    color: var(--color-text-muted);
  }

  &__param-input {
    width: 5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { opacity: 0.3; }

    &:focus { outline: none; border-color: var(--color-primary); }
  }

  &__param-unit {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6;
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
    opacity: 0.65;
  }

  &__param-derived-value {
    font-size: 0.7rem;
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
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }
}
</style>
