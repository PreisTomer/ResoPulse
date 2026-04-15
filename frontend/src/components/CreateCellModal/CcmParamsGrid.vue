<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-params-grid">

    <!-- Radius -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldRadius') }}
        <span class="ccm-params-grid__unit">{{ UNIT.UM }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'radius')">?</button>
      </label>
      <input
        :value="form.radius"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['radius']?.isWarn }"
        type="number"
        step="0.001"
        min="0.001"
        max="100"
        @input="onNumericInput('radius', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['radius']?.isWarn }">
        {{ fieldHints['radius']?.hint }}
      </span>
    </div>

    <!-- Membrane thickness -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldMemThick') }}
        <span class="ccm-params-grid__unit">{{ UNIT.NM }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'memThick')">?</button>
      </label>
      <input
        :value="form.membraneThickness"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['membraneThickness']?.isWarn }"
        type="number"
        step="0.1"
        min="1"
        max="200"
        @input="onNumericInput('membraneThickness', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['membraneThickness']?.isWarn }">
        {{ fieldHints['membraneThickness']?.hint }}
      </span>
    </div>

    <!-- Dielectric constant -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldEpsR') }}
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'epsR')">?</button>
      </label>
      <input
        :value="form.dielectricConstant"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['dielectricConstant']?.isWarn }"
        type="number"
        step="0.5"
        min="1"
        max="80"
        @input="onNumericInput('dielectricConstant', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['dielectricConstant']?.isWarn }">
        {{ fieldHints['dielectricConstant']?.hint }}
      </span>
    </div>

    <!-- Intracellular conductivity -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldSigmaI') }}
        <span class="ccm-params-grid__unit">{{ UNIT.S_PER_M }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'sigmaI')">?</button>
      </label>
      <input
        :value="form.conductivity"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['conductivity']?.isWarn }"
        type="number"
        step="0.01"
        min="0.001"
        max="10"
        @input="onNumericInput('conductivity', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['conductivity']?.isWarn }">
        {{ fieldHints['conductivity']?.hint }}
      </span>
    </div>

    <!-- Lysis threshold -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldVmThr') }}
        <span class="ccm-params-grid__unit">{{ UNIT.V }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'vmThr')">?</button>
      </label>
      <input
        :value="form.thresholdVoltage"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['thresholdVoltage']?.isWarn }"
        type="number"
        step="0.05"
        min="0.05"
        max="10"
        @input="onNumericInput('thresholdVoltage', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['thresholdVoltage']?.isWarn }">
        {{ fieldHints['thresholdVoltage']?.hint }}
      </span>
    </div>

    <!-- Density -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldDensity') }}
        <span class="ccm-params-grid__unit">{{ UNIT.KG_PER_M3 }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'density')">?</button>
      </label>
      <input
        :value="form.density"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['density']?.isWarn }"
        type="number"
        step="10"
        min="500"
        max="2000"
        @input="onNumericInput('density', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['density']?.isWarn }">
        {{ fieldHints['density']?.hint }}
      </span>
    </div>

    <!-- Specific heat capacity -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldCp') }}
        <span class="ccm-params-grid__unit">{{ UNIT.J_PER_KG_K }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'cp')">?</button>
      </label>
      <input
        :value="form.specificHeatCapacity"
        class="ccm-params-grid__input"
        :class="{ 'ccm-params-grid__input--warn': fieldHints['specificHeatCapacity']?.isWarn }"
        type="number"
        step="50"
        min="500"
        max="5000"
        @input="onNumericInput('specificHeatCapacity', $event)"
      />
      <span class="ccm-params-grid__range" :class="{ 'ccm-params-grid__range--warn': fieldHints['specificHeatCapacity']?.isWarn }">
        {{ fieldHints['specificHeatCapacity']?.hint }}
      </span>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

type CellFormType = 'mammalian' | 'bacteria' | 'virus'

// ── Literature ranges by cell type and field ──────────────────────────────────
// Sources: Kotnik & Miklavcic (2000, 2006); Gascoyne & Vykoukal (2002);
//          Weaver & Chizmadzhev (1996); Gabriel et al. (1996); Schwan (1957).
// These are [min, max] soft bounds — values outside trigger a non-blocking amber
// warning to prompt the user to verify their source before saving.
const LIT_RANGES: Record<CellFormType, Partial<Record<string, [number, number]>>> = {
  mammalian: {
    radius:               [5,     20   ],
    membraneThickness:    [5,     10   ],
    dielectricConstant:   [5,     15   ],
    conductivity:         [0.4,   1.5  ],
    thresholdVoltage:     [0.5,   1.5  ],
    density:              [1000,  1100 ],
    specificHeatCapacity: [3000,  4000 ],
  },
  bacteria: {
    radius:               [0.5,   2.0  ],
    membraneThickness:    [5,     10   ],
    dielectricConstant:   [8,     18   ],
    conductivity:         [0.2,   0.5  ],
    thresholdVoltage:     [0.8,   2.0  ],
    density:              [1050,  1150 ],
    specificHeatCapacity: [3000,  4000 ],
  },
  virus: {
    radius:               [0.02,  0.15 ],
    membraneThickness:    [3,     8    ],
    dielectricConstant:   [10,    30   ],
    conductivity:         [0.05,  0.4  ],
    thresholdVoltage:     [0.2,   0.8  ],
    density:              [1100,  1400 ],
    specificHeatCapacity: [2000,  3500 ],
  },
}

// Display units for each field key (used in range hint string)
const FIELD_UNITS: Partial<Record<string, string>> = {
  radius:               UNIT.UM,
  membraneThickness:    UNIT.NM,
  dielectricConstant:   '',
  conductivity:         UNIT.S_PER_M,
  thresholdVoltage:     UNIT.V,
  density:              UNIT.KG_PER_M3,
  specificHeatCapacity: UNIT.J_PER_KG_K,
}

function formatRangeNumber(n: number): string {
  if (n < 1)   return n.toString()
  if (n % 1 === 0) return n.toString()
  return n.toFixed(1)
}

export default defineComponent({
  name: 'CcmParamsGrid',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    UNIT() { return UNIT },
    EMIT() { return EMIT },

    // Pre-compute all field hint data in one pass per render, keyed by field name.
    // Using a computed avoids calling two separate methods 7 times each in the template.
    fieldHints(): Record<string, { isWarn: boolean; hint: string }> {
      const ct     = this.form.cellType as CellFormType
      const ranges = LIT_RANGES[ct] ?? {}
      const result: Record<string, { isWarn: boolean; hint: string }> = {}

      for (const key of Object.keys(ranges)) {
        const range  = ranges[key]!
        const val    = Number(this.form[key])
        const isWarn = isFinite(val) && (val < range[0] || val > range[1])
        const unit     = FIELD_UNITS[key] ?? ''
        const rangeStr = `${formatRangeNumber(range[0])}-${formatRangeNumber(range[1])}${unit ? ' ' + unit : ''}`
        result[key] = {
          isWarn,
          hint: isWarn
            ? this.$t('userPresets.litRangeWarn', { range: rangeStr })
            : this.$t('userPresets.litRange',     { range: rangeStr }),
        }
      }
      return result
    },
  },

  methods: {
    onNumericInput(key: string, event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>

.ccm-params-grid {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   0.75rem 1rem;

  &__field {
    @include flex-col(0.25rem);
  }

  &__label {
    @include flex-row(0.35rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__unit {
    font-weight:    400;
    font-size:      var(--fs-xs);
    opacity:        0.75;
    text-transform: none;
  }

  &__input {
    background:    var(--color-bg);
    border:        1px solid var(--color-border);
    border-radius: 5px;
    color:         var(--color-text);
    font-size:     0.88rem;
    padding:       0.38rem 0.6rem;
    width:         100%;
    box-sizing:    border-box;
    outline:       none;
    transition:    border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }

    &--warn { border-color: color-mix(in srgb, var(--color-amber) 60%, transparent); }

    -moz-appearance: textfield;
    appearance:      textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      appearance:         none;
    }
  }

  &__range {
    font-family: var(--font-mono);
    font-size:   var(--fs-xs);
    color:       var(--color-text-muted);
    opacity:     var(--op-muted);
    transition:  color var(--tr-fast), opacity var(--tr-fast);

    &--warn {
      color:   var(--color-amber);
      opacity: 1;
    }
  }

  &__tip-btn {
    @include inline-flex-center();
    width:         14px;
    height:        14px;
    border-radius: 50%;
    border:        1px solid color-mix(in srgb, var(--color-text-muted) 45%, transparent);
    background:    transparent;
    color:         color-mix(in srgb, var(--color-text-muted) 75%, transparent);
    font-size:     0.6rem;
    font-weight:   700;
    cursor:        pointer;
    padding:       0;
    line-height:   1;
    flex-shrink:   0;

    &:hover {
      border-color: var(--color-primary);
      color:        var(--color-primary);
    }
  }
}
</style>
