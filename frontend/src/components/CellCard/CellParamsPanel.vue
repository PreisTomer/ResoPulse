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
