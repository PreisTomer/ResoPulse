<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment__cell-slot">

    <!-- Badge button -->
    <button
      class="experiment__cell-badge experiment__cell-badge--healthy"
      @click="toggle"
      v-tip="tipBadge"
    >
      <div class="experiment__cell-badge-row" :class="{ 'experiment__cell-badge-row--open': isOpen }">
        <span class="experiment__cell-badge-type">{{ $t('exp.badgeHealthy') }}</span>
        <span class="experiment__cell-badge-selected experiment__cell-badge-selected--healthy">{{ labelShort }}</span>
        <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': isOpen }">{{ ICON.EXPAND }}</span>
      </div>
    </button>

    <!-- Picker dropdown -->
    <div v-if="isOpen" class="experiment__cell-picker">
      <div class="experiment__cell-picker-hdr">
        <div class="experiment__cell-picker-title">{{ $t('exp.pickerHealthyTitle') }}</div>
      </div>

      <div class="experiment__cell-picker-grid">
        <!-- Built-in reference presets -->
        <button
          v-for="p in healthyPresets"
          :key="p.presetId"
          class="experiment__preset-btn experiment__preset-btn--healthy"
          :class="{ 'experiment__preset-btn--active': cellStore.healthy.id === p.presetId }"
          @click="selectPreset(p)"
        >
          <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
          <span class="experiment__preset-btn-sub">{{ p.notes }}</span>
        </button>

        <!-- User reference presets -->
        <div
          v-for="p in userPresetsStore.healthyPresets"
          :key="p.id"
          class="experiment__preset-btn experiment__preset-btn--custom"
          :class="{ 'experiment__preset-btn--active': cellStore.healthy.id === p.id }"
          role="button"
          tabindex="0"
          @click="selectUserPreset(p)"
          @keydown.enter="selectUserPreset(p)"
        >
          <div class="experiment__preset-btn-row">
            <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
            <span
              class="experiment__preset-confidence"
              :class="`experiment__preset-confidence--${p.parameterConfidence}`"
              :title="$t(`userPresets.confidenceTip${capitalizeFirst(p.parameterConfidence)}`)"
            >{{ confidenceBadge(p.parameterConfidence) }}</span>
          </div>
          <span class="experiment__preset-btn-sub">{{ p.notes || p.label }}</span>
          <div class="experiment__preset-btn-actions">
            <button class="experiment__preset-btn-edit" @click.stop="openEditModal(p)" :title="$t('userPresets.editBtn')">{{ ICON.EDIT }}</button>
            <button class="experiment__preset-btn-del" @click.stop="deletePreset(p.id)" :title="$t('exp.deletePreset')">{{ ICON.CLOSE }}</button>
          </div>
        </div>

        <!-- Add new reference cell button -->
        <button class="experiment__preset-btn-new" @click.stop="openCreateModal">
          {{ $t('userPresets.createHealthyBtn') }}
        </button>
      </div>
    </div>

  </div>

  <CreateCellModal
    :visible="showModal"
    :edit-preset="editingPreset"
    :default-role="'healthy'"
    @close="closeModal"
    @saved="closeModal"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'

import CreateCellModal from '@/components/CreateCellModal/index.vue'

import { formatFreqKHz } from '@/utils/format'
import { tipCellBadgeHealthy } from '@/tooltips/experimentTooltips'

import { CELL_PRESETS } from '@/constants/cellLibrary'
import type { CellPreset } from '@/constants/cellLibrary'
import { CELL_GROUP } from '@/constants/strings'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'HealthyCellPicker',

  components: { CreateCellModal },

  emits: ['select', 'selectUser', 'opened'],

  data() {
    return {
      isOpen:        false,
      showModal:     false,
      editingPreset: null as UserCellPreset | null,
    }
  },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore, useUserPresetsStore),

    healthyPresets(): CellPreset[] {
      return CELL_PRESETS.filter((p) => p.group === CELL_GROUP.REFERENCE)
    },

    labelShort(): string {
      return this.cellStore.healthy.label.replace(/^Healthy\s+/i, '')
    },

    tipBadge(): string {
      const cell = this.cellStore.healthy
      return tipCellBadgeHealthy({
        label: cell.label,
        radius: cell.radius,
        membraneThickness: cell.membraneThickness,
        fcDisplay: formatFreqKHz(this.cellStore.healthyFc, 1),
      })
    },
  },

  methods: {
    toggle() {
      this.isOpen = !this.isOpen
      if (this.isOpen) this.$emit('opened')
    },

    close() {
      this.isOpen = false
    },

    capitalizeFirst(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },

    confidenceBadge(confidence: string): string {
      const map: Record<string, string> = {
        literature: this.$t('userPresets.confidenceBadgeLit'),
        measured:   this.$t('userPresets.confidenceBadgeMeas'),
        estimated:  this.$t('userPresets.confidenceBadgeEst'),
      }
      return map[confidence] ?? confidence.toUpperCase().slice(0, 4)
    },

    selectPreset(preset: CellPreset) {
      this.isOpen = false
      this.$emit('select', preset)
    },

    selectUserPreset(preset: UserCellPreset) {
      this.isOpen = false
      this.$emit('selectUser', preset)
    },

    openCreateModal() {
      this.editingPreset = null
      this.showModal     = true
    },

    openEditModal(preset: UserCellPreset) {
      this.editingPreset = preset
      this.showModal     = true
    },

    closeModal() {
      this.showModal     = false
      this.editingPreset = null
    },

    async deletePreset(id: string) {
      if (!window.confirm(this.$t('userPresets.deleteConfirm'))) return
      await this.userPresetsStore.remove(id)
    },
  },
})
</script>

<style lang="scss" scoped>

.experiment {

  &__cell-slot {
    position: relative;

    @media (max-width: 540px) { flex: 1; min-width: 0; }
  }

  // ── Badge button ──────────────────────────────────────────────────────────
  &__cell-badge {
    display: inline-flex;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;

    @media (max-width: 540px) { display: flex; width: 100%; }

    &:hover .experiment__cell-badge-row {
      border-color: color-mix(in srgb, white 18%, transparent);
      background: color-mix(in srgb, white 4.5%, transparent);
    }

    &--healthy .experiment__cell-badge-row--open {
      border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    }

    &-type {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    &-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.42rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      background: color-mix(in srgb, white 2.5%, transparent);
      min-width: 160px;
      max-width: 240px;
      transition: border-color var(--tr-fast), background var(--tr-fast);

      @media (max-width: 540px) { width: 100%; min-width: 0; max-width: none; }
    }

    &-selected {
      font-family: var(--font-mono);
      font-size: var(--fs-md);
      font-weight: 600;
      letter-spacing: 0.01em;
      line-height: 1.2;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &--healthy { color: var(--color-primary); }
    }

    &-caret {
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      transition: transform var(--tr-normal);
      opacity: var(--op-partial);
      flex-shrink: 0;

      &--open { transform: rotate(180deg); }
    }
  }

  // ── Picker dropdown ───────────────────────────────────────────────────────
  &__cell-picker {
    @include surface-card(6px, 0.75rem);
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 200;
    min-width: 280px;
    max-width: 380px;
    box-shadow: 0 12px 32px color-mix(in srgb, black 50%, transparent);

    @media (max-width: 768px) {
      position: fixed;
      top: 60px;
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
    }

    &-hdr { margin-bottom: 0.6rem; }

    &-title {
      @include mono-upper(var(--fs-xs), 0.1em);
      color: var(--color-text-muted);
      margin-bottom: 0.6rem;
    }

    &-grid { @include flex-col(0.35rem); }
  }

  // ── Preset buttons ────────────────────────────────────────────────────────
  &__preset-btn {
    @include flex-col(0.15rem);
    padding: 0.45rem 0.65rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    transition: border-color var(--tr-fast), background var(--tr-fast);
    width: 100%;

    &:hover {
      background: color-mix(in srgb, white 3%, transparent);
      border-color: color-mix(in srgb, white 20%, transparent);
    }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      border-color: var(--color-primary);
    }

    &--healthy.experiment__preset-btn--active { border-color: var(--color-primary); }

    &--custom {
      position: relative;
      padding-right: 3.5rem;
    }

    &-row {
      @include flex-row(0.4rem);
      align-items: center;
    }

    &-name {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-text-heading);
      letter-spacing: 0.02em;
    }

    &-sub {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    &-actions {
      position:   absolute;
      top:        50%;
      right:      0.4rem;
      transform:  translateY(-50%);
      display:    flex;
      gap:        0.15rem;
      align-items: center;
    }

    &-edit,
    &-del {
      background:  transparent;
      border:      none;
      color:       var(--color-text-muted);
      font-size:   var(--fs-xxs);
      cursor:      pointer;
      padding:     0.15rem 0.2rem;
      line-height: 1;
      opacity:     0.5;
      transition:  opacity var(--tr-fast), color var(--tr-fast);
    }

    &-edit:hover { opacity: 1; color: var(--color-primary); }
    &-del:hover  { opacity: 1; color: var(--color-danger); }

    &-new {
      width:          100%;
      padding:        0.45rem 0.65rem;
      background:     color-mix(in srgb, var(--color-primary) 6%, transparent);
      border:         1px dashed color-mix(in srgb, var(--color-primary) 35%, transparent);
      border-radius:  4px;
      color:          color-mix(in srgb, var(--color-primary) 85%, transparent);
      font-family:    var(--font-mono);
      font-size:      var(--fs-xs);
      font-weight:    600;
      letter-spacing: 0.04em;
      cursor:         pointer;
      text-align:     left;
      transition:     background var(--tr-fast), border-color var(--tr-fast);
      margin-top:     0.1rem;

      &:hover {
        background:   color-mix(in srgb, var(--color-primary) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
      }
    }
  }

  // ── Confidence badge ──────────────────────────────────────────────────────
  &__preset-confidence {
    @include badge-pill(0.08rem 0.28rem, 3px);
    font-size: 0.58rem;
    flex-shrink: 0;

    &--literature { @include color-variant(primary, 40%, 6%); }
    &--measured   { @include color-variant(accent,  40%, 6%); }
    &--estimated  { @include color-variant(amber,   40%, 6%); }
  }
}
</style>
