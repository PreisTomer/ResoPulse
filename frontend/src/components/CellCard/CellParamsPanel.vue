<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { CellRecord } from '../../types/cell'

export default defineComponent({
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

<template>
  <template v-if="cellData">
    <div
      class="cell-card__params-toggle"
      v-tip="'<strong>Cell Parameters</strong>\nEdit biophysical properties that drive the\nSchwan equation calculation in real time.\nChanges immediately update Vm, selectivity,\nand the frequency response chart.'"
      @click="paramsExpanded = !paramsExpanded"
    >
      <span class="cell-card__params-toggle-arrow">{{ paramsExpanded ? '▾' : '▸' }}</span>
      Cell Parameters
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
          v-tip="'<strong>Derived biophysical parameters</strong>\nComputed in real time from the editable values above.\n\n<span class=\'tip-val\'>Cm</span> = ε_r × ε₀ / d\n  Membrane specific capacitance [mF/m²]\n\n<span class=\'tip-val\'>τ</span> = R·Cm·(2σ_e+σ_i) / (2σ_e·σ_i)\n  Schwan time constant (Kotnik & Miklavcic 2000)\n  Sets the frequency roll-off\n\n<span class=\'tip-val\'>fc</span> = 1/(2πτ)\n  Characteristic frequency — Vm drops −3 dB here\n  Below fc: quasi-DC regime, Vm at maximum'"
        >
          <span class="cell-card__params-derived-label">Derived constants</span>
        </div>
        <div v-for="p in derivedParams" :key="p.label" class="cell-card__param-row cell-card__param-row--derived">
          <label class="cell-card__param-label">{{ p.label }}</label>
          <span class="cell-card__param-derived-value">{{ p.value }}</span>
          <span class="cell-card__param-unit">{{ p.unit }}</span>
        </div>
        <div v-if="canResetToPreset" class="cell-card__params-reset-row">
          <button
            class="cell-card__params-btn"
            v-tip="'<strong>Reset to Preset Defaults</strong>\nRestores all parameters to the original\nvalues for this preset.\nUseful after editing to explore changes.'"
            @click="$emit('reset-to-preset')"
          >↺ Reset to defaults</button>
        </div>
      </div>
    </Transition>
  </template>
</template>
