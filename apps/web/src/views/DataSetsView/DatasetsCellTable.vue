<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="datasets__card">
    <div class="datasets__card-hdr">
      <h2 class="datasets__card-title">{{ $t('datasets.cellLib.sectionTitle') }}</h2>
      <span class="datasets__card-tag">{{ $t('datasets.cellLib.sectionTag', { n: presets.length }) }}</span>
      <div class="datasets__header-actions">
        <button
          v-if="hasCustomPresets"
          class="datasets__export-btn"
          :title="$t('datasets.cellLib.exportJsonTip')"
          @click="$emit('exportJson')"
        >{{ $t('datasets.cellLib.exportJsonBtn') }}</button>
        <button
          v-if="hasCustomPresets"
          class="datasets__export-btn"
          :title="$t('datasets.cellLib.exportCsvTip')"
          @click="$emit('exportCsv')"
        >{{ $t('datasets.cellLib.exportCsvBtn') }}</button>
        <button
          class="datasets__export-btn"
          :title="$t('datasets.cellLib.importJsonTip')"
          @click="triggerImport"
        >{{ $t('datasets.cellLib.importJsonBtn') }}</button>
        <input
          ref="importInput"
          type="file"
          accept="application/json,.json"
          class="datasets__hidden-input"
          @change="onImportFileSelected"
        />
        <button class="datasets__add-cell-btn" @click="$emit('add')">
          {{ $t('datasets.cellLib.addCellBtn') }}
        </button>
      </div>
    </div>
    <div class="datasets__table-wrap">
      <table class="datasets__table">
        <thead>
          <tr>
            <th>{{ $t('datasets.cellLib.colGroup') }}</th>
            <th>{{ $t('datasets.cellLib.colCell') }}</th>
            <th>{{ $t('datasets.cellLib.colR') }}</th>
            <th>{{ $t('datasets.cellLib.colD') }}</th>
            <th v-tip="$t('datasets.tip.colEr')" v-html="$t('datasets.cellLib.colEr')"></th>
            <th v-tip="$t('datasets.tip.colSigI')" v-html="$t('datasets.cellLib.colSigI')"></th>
            <th v-tip="$t('datasets.tip.colCm')" v-html="$t('datasets.cellLib.colCm')"></th>
            <th v-tip="$t('datasets.tip.colFc')" v-html="$t('datasets.cellLib.colFc')"></th>
            <th v-tip="$t('datasets.tip.colFcross')" v-html="$t('datasets.cellLib.colFcross')"></th>
            <th v-tip="$t('datasets.tip.colFcross2')" v-html="$t('datasets.cellLib.colFcross2')"></th>
            <th v-tip="$t('datasets.tip.colVmThr')" v-html="$t('datasets.cellLib.colVmThr')"></th>
            <th v-tip="$t('datasets.tip.colRnuc')" v-html="$t('datasets.cellLib.colRnuc')"></th>
            <th v-tip="$t('datasets.tip.colRho')">{{ $t('datasets.cellLib.colRho') }}</th>
            <th v-tip="$t('datasets.tip.colFres')" v-html="$t('datasets.cellLib.colFres')"></th>
            <th v-tip="$t('datasets.tip.colQ')">{{ $t('datasets.cellLib.colQ') }}</th>
            <th v-tip="$t('datasets.tip.colEthr')" v-html="$t('datasets.cellLib.colEthr')"></th>
            <th>{{ $t('datasets.cellLib.colNotes') }}</th>
            <th class="datasets__actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in presets" :key="p.presetId">
            <td>
              <span
                class="datasets__group-badge"
                :style="{
                  color: p.color,
                  borderColor: p.color + '55',
                  background: p.color + '11',
                }"
              >{{ p.groupLabel }}</span>
            </td>
            <td class="datasets__cell-name">{{ p.label }}</td>
            <td class="datasets__mono">{{ p.radius }}</td>
            <td class="datasets__mono">{{ p.membraneThickness }}</td>
            <td class="datasets__mono">{{ p.dielectricConstant.toFixed(1) }}</td>
            <td class="datasets__mono">{{ p.conductivity }}</td>
            <td class="datasets__mono datasets__primary-val">{{ p.cmDisplay }}</td>
            <td class="datasets__mono datasets__primary-val">{{ p.fcDisplay }}</td>
            <td class="datasets__mono" :class="p.fcrossDisplay !== nullDisplay ? 'datasets__dep-val' : 'datasets__muted'">{{ p.fcrossDisplay }}</td>
            <td class="datasets__mono" :class="p.fcross2Display !== nullDisplay ? 'datasets__dep-val' : 'datasets__muted'">{{ p.fcross2Display }}</td>
            <td
              class="datasets__mono"
              :class="p.group === cellGroupReference ? 'datasets__ref-val' : 'datasets__cancer-val'"
            >{{ p.thresholdVoltage.toFixed(2) }}</td>
            <td class="datasets__mono" :class="p.hasNuclear ? 'datasets__nuc-val' : 'datasets__muted'">{{ p.nucRDisplay }}</td>
            <td class="datasets__mono datasets__muted">{{ p.density }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? 'datasets__primary-val' : 'datasets__muted'">{{ p.resFreqDisplay }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? '' : 'datasets__muted'">{{ p.resQDisplay }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? 'datasets__warn-val' : 'datasets__muted'">{{ p.resEthrDisplay }}</td>
            <td class="datasets__notes-cell" v-tip="p.techNotes ?? p.notes">
              <span
                v-if="hasConfidenceBadge(p)"
                class="datasets__confidence-badge"
                :class="`datasets__confidence-badge--${p.parameterConfidence}`"
                :title="$t(`userPresets.confidenceTip${capitalize(p.parameterConfidence!)}`)"
              >{{ confidenceBadgeLabel(p.parameterConfidence!) }}</span>
              {{ p.notes }}
            </td>
            <td class="datasets__actions-cell">
              <template v-if="hasEditableCustomPreset(p)">
                <button class="datasets__action-btn datasets__action-btn--edit" :title="$t('userPresets.editBtn')" @click="$emit('edit', p.customPreset)">{{ ICON.EDIT }}</button>
                <button class="datasets__action-btn datasets__action-btn--del" :title="$t('userPresets.deleteConfirm')" @click="$emit('delete', p.customPreset)">{{ ICON.CLOSE }}</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="datasets__formula-strip">
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel1') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq1') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel2') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq2') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel3') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq3') }}</div>
      </div>
      <div class="datasets__formula-block datasets__formula-block--wide">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel4') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq4') }}</div>
        <div class="datasets__formula-note">{{ $t('datasets.cellLib.fNote4') }}</div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { CELL_GROUP, NULL_DISPLAY } from '@/constants/strings'
import { ICON } from '@/constants/icons'

import type { AugmentedPreset } from './types'

export default defineComponent({
  name: 'DatasetsCellTable',

  props: {
    presets: {
      type: Array as PropType<AugmentedPreset[]>,
      default: () => [],
    },
  },

  emits: ['add', 'edit', 'delete', 'exportJson', 'exportCsv', 'importJson'],

  computed: {
    ICON() { return ICON },
    nullDisplay(): string { return NULL_DISPLAY },
    cellGroupReference(): string { return CELL_GROUP.REFERENCE },
    hasCustomPresets(): boolean { return this.presets.some(p => p.isCustom) },
  },

  methods: {
    triggerImport(): void {
      (this.$refs.importInput as HTMLInputElement | undefined)?.click()
    },

    onImportFileSelected(event: Event): void {
      const input = event.target as HTMLInputElement
      const file  = input.files?.[0]
      input.value = ''
      if (file) this.$emit('importJson', file)
    },

    capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },

    confidenceBadgeLabel(confidence: string): string {
      const map: Record<string, string> = {
        literature: this.$t('userPresets.confidenceBadgeLit'),
        measured:   this.$t('userPresets.confidenceBadgeMeas'),
        estimated:  this.$t('userPresets.confidenceBadgeEst'),
      }
      return map[confidence] ?? confidence.toUpperCase().slice(0, 4)
    },

    hasConfidenceBadge(preset: AugmentedPreset): boolean {
      return !!preset.isCustom && !!preset.parameterConfidence
    },

    hasEditableCustomPreset(preset: AugmentedPreset): boolean {
      return !!preset.isCustom && !!preset.customPreset
    },
  },
})
</script>

<style lang="scss" scoped>

@use './datasets' as ds;

@include ds.datasets-card();
@include ds.datasets-table();
@include ds.datasets-formula-strip();
@include ds.datasets-utils();

.datasets {
  &__header-actions {
    @include flex-row(0.4rem);
    margin-left: auto;
    flex-shrink: 0;
  }

  &__add-cell-btn {
    padding:        0.35rem 0.85rem;
    background:     color-mix(in srgb, var(--color-primary) 10%, transparent);
    border:         1px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius:  5px;
    color:          color-mix(in srgb, var(--color-primary) 90%, transparent);
    font-family:    var(--font-mono);
    font-size:      var(--fs-xs);
    font-weight:    600;
    letter-spacing: 0.04em;
    cursor:         pointer;
    flex-shrink:    0;
    transition:     background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background:   color-mix(in srgb, var(--color-primary) 18%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 70%, transparent);
    }
  }

  &__hidden-input {
    display: none;
  }

  &__export-btn {
    padding:        0.35rem 0.7rem;
    background:     transparent;
    border:         1px solid color-mix(in srgb, var(--color-text-muted) 35%, transparent);
    border-radius:  5px;
    color:          var(--color-text-muted);
    font-family:    var(--font-mono);
    font-size:      var(--fs-xs);
    font-weight:    600;
    letter-spacing: 0.04em;
    cursor:         pointer;
    flex-shrink:    0;
    transition:     color var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      color:        var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
    }
  }

  &__actions-col {
    width: 60px;
    min-width: 60px;
  }

  &__actions-cell {
    white-space: nowrap;
    padding: 0 0.35rem;
  }

  &__action-btn {
    background:  transparent;
    border:      none;
    font-size:   var(--fs-xxs);
    cursor:      pointer;
    padding:     0.15rem 0.2rem;
    line-height: 1;
    opacity:     var(--op-muted);
    transition:  opacity var(--tr-fast), color var(--tr-fast);

    &--edit {
      color: var(--color-text-muted);
      &:hover { opacity: 1; color: var(--color-primary); }
    }

    &--del {
      color: var(--color-text-muted);
      &:hover { opacity: 1; color: var(--color-danger); }
    }
  }

  &__confidence-badge {
    @include badge-pill(0.1rem 0.3rem, 3px);
    display:        inline-block;
    margin-right:   0.3rem;
    vertical-align: middle;
    font-size:      0.6rem;

    &--literature {
      @include color-variant(primary, 40%, 6%);
    }

    &--measured {
      @include color-variant(accent, 40%, 6%);
    }

    &--estimated {
      @include color-variant(amber, 40%, 6%);
    }
  }
}
</style>
