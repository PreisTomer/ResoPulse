<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment__cell-slot">

    <!-- Badge button -->
    <button
      id="hl-target-badge"
      class="experiment__cell-badge experiment__cell-badge--target"
      @click="toggle"
      v-tip="tipBadge"
    >
      <div class="experiment__cell-badge-row" :class="{ 'experiment__cell-badge-row--open': isOpen }">
        <span class="experiment__cell-badge-type">{{ $t('exp.badgeTarget') }}</span>
        <span class="experiment__cell-badge-selected experiment__cell-badge-selected--target">{{ cellStore.target.label }}</span>
        <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': isOpen }">{{ ICON.EXPAND }}</span>
      </div>
    </button>

    <!-- Picker dropdown -->
    <div v-if="isOpen" class="experiment__cell-picker">
      <div class="experiment__cell-picker-hdr">
        <div class="experiment__cell-picker-title">{{ $t('exp.pickerTargetTitle') }}</div>
        <div class="experiment__cell-picker-tabs">
          <button
            v-for="cat in targetCategories"
            :key="cat"
            class="experiment__cell-picker-tab"
            :class="{ 'experiment__cell-picker-tab--active': activeCategory === cat }"
            :style="activeCategory === cat ? { borderColor: GROUP_COLORS[cat], color: GROUP_COLORS[cat] } : {}"
            @click.stop="activeCategory = cat"
          >{{ GROUP_LABELS[cat] }}</button>
          <button
            class="experiment__cell-picker-tab experiment__cell-picker-tab--custom"
            :class="{ 'experiment__cell-picker-tab--active': activeCategory === 'custom' }"
            @click.stop="activeCategory = 'custom'"
          >{{ $t('userPresets.tabLabel') }}</button>
        </div>
      </div>

      <!-- Built-in presets -->
      <div v-if="activeCategory !== 'custom'" class="experiment__cell-picker-grid">
        <button
          v-for="p in presetsForCategory"
          :key="p.presetId"
          class="experiment__preset-btn"
          :class="{ 'experiment__preset-btn--active': cellStore.target.id === p.presetId }"
          :style="cellStore.target.id === p.presetId ? { borderColor: GROUP_COLORS[activeCategory as CellGroup], color: GROUP_COLORS[activeCategory as CellGroup] } : {}"
          @click="selectPreset(p)"
        >
          <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
          <span class="experiment__preset-btn-sub">{{ p.notes }}</span>
        </button>
      </div>

      <!-- Custom presets -->
      <div v-else class="experiment__cell-picker-grid">
        <p v-if="!userPresetsStore.hasPresets" class="experiment__custom-empty">
          {{ $t('userPresets.emptyMsg') }}<br />
          <span class="experiment__custom-hint">{{ $t('userPresets.emptyHint') }}</span>
        </p>
        <div
          v-for="p in userPresetsStore.presets"
          :key="p.id"
          class="experiment__preset-btn experiment__preset-btn--custom"
          :class="{ 'experiment__preset-btn--active': cellStore.target.id === p.id }"
          role="button"
          tabindex="0"
          @click="selectUserPreset(p)"
          @keydown.enter="selectUserPreset(p)"
        >
          <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
          <span class="experiment__preset-btn-sub">{{ p.notes || p.label }}</span>
          <button class="experiment__preset-btn-del" @click.stop="userPresetsStore.remove(p.id)" :title="$t('exp.deletePreset')">{{ ICON.CLOSE }}</button>
        </div>
        <button class="experiment__preset-btn-new" @click.stop="openCreateModal">
          {{ $t('userPresets.createBtn') }}
        </button>
      </div>
    </div>

  </div>

  <!-- Create Cell Profile modal — lives here so onSaved can switch to custom tab -->
  <CreateCellModal
    :visible="showCreateModal"
    @close="showCreateModal = false"
    @saved="onUserPresetSaved"
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
import { tipCellBadgeTarget } from '@/tooltips/experimentTooltips'

import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '@/constants/cellLibrary'
import type { CellPreset, CellGroup } from '@/constants/cellLibrary'
import { CELL_GROUP } from '@/constants/strings'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'TargetCellPicker',

  components: { CreateCellModal },

  emits: ['select', 'selectUser', 'opened'],

  data() {
    return {
      isOpen: false,
      activeCategory: CELL_GROUP.CANCER as CellGroup | 'custom',
      showCreateModal: false,
      GROUP_COLORS,
      GROUP_LABELS,
    }
  },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore, useUserPresetsStore),

    targetCategories(): CellGroup[] {
      return [CELL_GROUP.CANCER, CELL_GROUP.BACTERIA, CELL_GROUP.VIRUS] as CellGroup[]
    },

    presetsForCategory(): CellPreset[] {
      if (this.activeCategory === 'custom') return []
      return CELL_PRESETS.filter((p) => p.group === this.activeCategory)
    },

    tipBadge(): string {
      const cell = this.cellStore.target
      return tipCellBadgeTarget({
        label: cell.label,
        radius: cell.radius,
        membraneThickness: cell.membraneThickness,
        fcDisplay: formatFreqKHz(this.cellStore.targetFc, 1),
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

    selectPreset(preset: CellPreset) {
      this.isOpen = false
      this.$emit('select', preset)
    },

    selectUserPreset(preset: UserCellPreset) {
      this.isOpen = false
      this.$emit('selectUser', preset)
    },

    openCreateModal() {
      this.showCreateModal = true
    },

    onUserPresetSaved() {
      this.showCreateModal = false
      this.activeCategory = 'custom'
      this.isOpen = true
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

    &--target .experiment__cell-badge-row--open {
      border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
      background: color-mix(in srgb, var(--color-danger) 4%, transparent);
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

      &--target { color: var(--color-danger); }
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

    &-title {
      @include mono-upper(var(--fs-xs), 0.1em);
      color: var(--color-text-muted);
      margin-bottom: 0.6rem;
    }

    &-hdr { margin-bottom: 0.6rem; }

    &-tabs {
      @include flex-row(0.3rem);
      flex-wrap: wrap;
      margin-top: 0.4rem;
    }

    &-tab {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      padding: 0.15rem 0.5rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: border-color var(--tr-fast), color var(--tr-fast);

      &:hover {
        color: var(--color-text);
        border-color: color-mix(in srgb, white 20%, transparent);
      }

      &--active { background: color-mix(in srgb, white 4%, transparent); }

      &--custom {
        border-color: color-mix(in srgb, var(--color-vibrating) 40%, transparent);
        color:        color-mix(in srgb, var(--color-vibrating) 80%, transparent);

        &.experiment__cell-picker-tab--active {
          border-color: color-mix(in srgb, var(--color-vibrating) 70%, transparent);
          color:        var(--color-vibrating);
          background:   color-mix(in srgb, var(--color-vibrating) 8%, transparent);
        }
      }
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

    &--custom {
      position: relative;
      padding-right: 1.6rem;
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

    &-del {
      position:    absolute;
      top:         50%;
      right:       0.4rem;
      transform:   translateY(-50%);
      background:  transparent;
      border:      none;
      color:       var(--color-text-muted);
      font-size:   var(--fs-xxs);
      cursor:      pointer;
      padding:     0.1rem;
      line-height: 1;
      opacity:     0.5;
      transition:  opacity var(--tr-fast), color var(--tr-fast);

      &:hover { opacity: 1; color: var(--color-danger); }
    }

    &-new {
      width:          100%;
      padding:        0.45rem 0.65rem;
      background:     color-mix(in srgb, var(--color-vibrating) 6%, transparent);
      border:         1px dashed color-mix(in srgb, var(--color-vibrating) 35%, transparent);
      border-radius:  4px;
      color:          color-mix(in srgb, var(--color-vibrating) 85%, transparent);
      font-family:    var(--font-mono);
      font-size:      var(--fs-xs);
      font-weight:    600;
      letter-spacing: 0.04em;
      cursor:         pointer;
      text-align:     left;
      transition:     background var(--tr-fast), border-color var(--tr-fast);
      margin-top:     0.1rem;

      &:hover {
        background:   color-mix(in srgb, var(--color-vibrating) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-vibrating) 60%, transparent);
      }
    }
  }

  // ── Custom preset empty state ─────────────────────────────────────────────
  &__custom-empty {
    font-size:   var(--fs-sm);
    color:       var(--color-text-muted);
    padding:     0.5rem 0.25rem;
    margin:      0;
    line-height: 1.5;
  }

  &__custom-hint {
    font-size: var(--fs-xxs);
    opacity:   var(--op-partial);
  }
}
</style>
