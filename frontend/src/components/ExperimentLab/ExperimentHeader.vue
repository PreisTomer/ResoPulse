<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment__header">

    <!-- Far left: session name + notes toggle -->
    <div class="experiment__header-left">
      <input
        v-model="store.sessionName"
        class="experiment__session-name"
        spellcheck="false"
        :title="$t('exp.renameSession')"
      />
      <button
        class="experiment__notes-toggle"
        :class="{ 'experiment__notes-toggle--active': notesOpen }"
        type="button"
        :title="$t('exp.notesToggleTip')"
        @click.stop="$emit('notes-toggle')"
      >{{ $t('exp.notesToggle') }}</button>
    </div>

    <!-- Center: cell selectors -->
    <div class="experiment__cell-badges">

      <!-- Healthy baseline badge + picker -->
      <div class="experiment__cell-slot">
        <button
          class="experiment__cell-badge experiment__cell-badge--healthy"
          @click="toggleHealthyPicker"
          v-tip="tipHealthyBadge"
        >
          <div class="experiment__cell-badge-row" :class="{ 'experiment__cell-badge-row--open': healthyPickerOpen }">
            <span class="experiment__cell-badge-type">{{ $t('exp.badgeHealthy') }}</span>
            <span class="experiment__cell-badge-selected experiment__cell-badge-selected--healthy">{{ healthyLabelShort }}</span>
            <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': healthyPickerOpen }">{{ ICON.EXPAND }}</span>
          </div>
        </button>
        <div v-if="healthyPickerOpen" class="experiment__cell-picker">
          <div class="experiment__cell-picker-title">{{ $t('exp.pickerHealthyTitle') }}</div>
          <div class="experiment__cell-picker-grid">
            <button
              v-for="p in healthyReferencePresets"
              :key="p.presetId"
              class="experiment__preset-btn experiment__preset-btn--healthy"
              :class="{ 'experiment__preset-btn--active': store.healthy.id === p.presetId }"
              @click="loadHealthyPreset(p)"
            >
              <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
              <span class="experiment__preset-btn-sub">{{ p.notes }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Target cell badge + picker -->
      <div class="experiment__cell-slot">
        <button
          class="experiment__cell-badge experiment__cell-badge--target"
          @click="toggleTargetPicker"
          v-tip="tipTargetBadge"
        >
          <div class="experiment__cell-badge-row" :class="{ 'experiment__cell-badge-row--open': targetPickerOpen }">
            <span class="experiment__cell-badge-type">{{ $t('exp.badgeTarget') }}</span>
            <span class="experiment__cell-badge-selected experiment__cell-badge-selected--target">{{ store.target.label }}</span>
            <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': targetPickerOpen }">{{ ICON.EXPAND }}</span>
          </div>
        </button>
        <div v-if="targetPickerOpen" class="experiment__cell-picker">
          <div class="experiment__cell-picker-hdr">
            <div class="experiment__cell-picker-title">{{ $t('exp.pickerTargetTitle') }}</div>
            <div class="experiment__cell-picker-tabs">
              <button
                v-for="cat in targetPickerCategories"
                :key="cat"
                class="experiment__cell-picker-tab"
                :class="{ 'experiment__cell-picker-tab--active': targetPickerCategory === cat }"
                :style="targetPickerCategory === cat ? { borderColor: GROUP_COLORS[cat], color: GROUP_COLORS[cat] } : {}"
                @click.stop="targetPickerCategory = cat"
              >{{ GROUP_LABELS[cat] }}</button>
              <!-- Custom presets tab -->
              <button
                class="experiment__cell-picker-tab experiment__cell-picker-tab--custom"
                :class="{ 'experiment__cell-picker-tab--active': targetPickerCategory === 'custom' }"
                @click.stop="targetPickerCategory = 'custom'"
              >{{ $t('userPresets.tabLabel') }}</button>
            </div>
          </div>
          <!-- Built-in presets grid -->
          <div v-if="targetPickerCategory !== 'custom'" class="experiment__cell-picker-grid">
            <button
              v-for="p in targetPresetsForCategory"
              :key="p.presetId"
              class="experiment__preset-btn"
              :class="{ 'experiment__preset-btn--active': store.target.id === p.presetId }"
              :style="store.target.id === p.presetId ? { borderColor: GROUP_COLORS[targetPickerCategory as CellGroup], color: GROUP_COLORS[targetPickerCategory as CellGroup] } : {}"
              @click="loadTargetPreset(p)"
            >
              <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
              <span class="experiment__preset-btn-sub">{{ p.notes }}</span>
            </button>
          </div>
          <!-- Custom presets grid -->
          <div v-else class="experiment__cell-picker-grid experiment__cell-picker-grid--custom">
            <p v-if="!presetsStore.hasPresets" class="experiment__custom-empty">
              {{ $t('userPresets.emptyMsg') }}<br />
              <span class="experiment__custom-hint">{{ $t('userPresets.emptyHint') }}</span>
            </p>
            <button
              v-for="p in presetsStore.presets"
              :key="p.id"
              class="experiment__preset-btn experiment__preset-btn--custom"
              :class="{ 'experiment__preset-btn--active': store.target.id === p.id }"
              @click="loadUserPreset(p)"
            >
              <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
              <span class="experiment__preset-btn-sub">{{ p.notes || p.label }}</span>
              <button class="experiment__preset-btn-del" @click.stop="presetsStore.remove(p.id)" :title="$t('exp.deletePreset')">{{ ICON.CLOSE }}</button>
            </button>
            <button class="experiment__preset-btn-new" @click.stop="showCreateModal = true">
              {{ $t('userPresets.createBtn') }}
            </button>
          </div>
        </div>
      </div>

    </div><!-- /experiment__cell-badges -->

    <!-- Far right: mode toggle + connection status -->
    <div class="experiment__header-right">
      <RouterLink
        v-if="showZDriftBadge"
        to="/instrument"
        class="experiment__z-drift-badge"
        v-tip="$t('exp.zDriftTip')"
      >
        <span class="experiment__z-drift-icon">{{ ICON.FLASK }}</span>
        {{ $t('exp.zDriftLabel') }} {{ impStore.impedanceDriftPct.toFixed(1) }}%
      </RouterLink>
      <span
        class="experiment__chip"
        :class="socketConnected ? 'experiment__chip--connected' : 'experiment__chip--local'"
        v-tip="socketConnected ? $t('exp.connectedTip') : $t('exp.localTip')"
      >
        <span class="experiment__chip-dot" :class="socketConnected ? '' : 'experiment__chip-dot--warn'"></span>
        {{ socketConnected ? $t('exp.connected').toUpperCase() : $t('exp.local').toUpperCase() }}
      </span>
    </div>

  </div>

  <!-- Create Cell Profile modal -->
  <CreateCellModal
    :visible="showCreateModal"
    @close="showCreateModal = false"
    @saved="onUserPresetSaved"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'
import { broadcastStateSync } from '@/services/socket'
import { socketConnected } from '@/services/socket'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '@/constants/cellLibrary'
import type { CellPreset, CellGroup } from '@/constants/cellLibrary'
import { CELL_GROUP } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatFreqKHz } from '@/utils/format'
import { tipCellBadgeHealthy, tipCellBadgeTarget } from '@/tooltips/experimentTooltips'
import CreateCellModal from '@/components/CreateCellModal/index.vue'

export default defineComponent({
  name: 'ExperimentHeader',

  components: { CreateCellModal },

  props: {
    notesOpen: { type: Boolean, default: false },
  },

  emits: ['notes-toggle', 'load-healthy-preset', 'load-target-preset'],

  setup() {
    return {
      store: useCellStore(),
      impStore: useImpedanceStore(),
      presetsStore: useUserPresetsStore(),
      socketConnected,
      GROUP_COLORS,
      GROUP_LABELS,
      ICON,
    }
  },

  data() {
    return {
      healthyPickerOpen: false,
      targetPickerOpen: false,
      targetPickerCategory: CELL_GROUP.CANCER as CellGroup | 'custom',
      showCreateModal: false,
    }
  },

  computed: {
    showZDriftBadge(): boolean {
      return Math.abs(this.impStore.impedanceDriftPct) > 5
    },

    tipHealthyBadge(): string {
      const cell = this.store.healthy
      return tipCellBadgeHealthy({
        label: cell.label,
        radius: cell.radius,
        membraneThickness: cell.membraneThickness,
        fcDisplay: this.healthyFcSetup,
      })
    },

    tipTargetBadge(): string {
      const cell = this.store.target
      return tipCellBadgeTarget({
        label: cell.label,
        radius: cell.radius,
        membraneThickness: cell.membraneThickness,
        fcDisplay: this.targetFcSetup,
      })
    },

    healthyReferencePresets(): CellPreset[] {
      return CELL_PRESETS.filter((p) => p.group === CELL_GROUP.REFERENCE)
    },

    targetPresetsForCategory(): CellPreset[] {
      if (this.targetPickerCategory === 'custom') return []
      return CELL_PRESETS.filter((p) => p.group === this.targetPickerCategory)
    },

    targetPickerCategories(): CellGroup[] {
      return [CELL_GROUP.CANCER, CELL_GROUP.BACTERIA, CELL_GROUP.VIRUS] as CellGroup[]
    },

    healthyLabelShort(): string {
      return this.store.healthy.label.replace(/^Healthy\s+/i, '')
    },

    healthyFcSetup(): string { return formatFreqKHz(this.store.healthyFc, 1) },
    targetFcSetup(): string  { return formatFreqKHz(this.store.targetFc, 1) },
  },

  methods: {
    toggleHealthyPicker() {
      this.healthyPickerOpen = !this.healthyPickerOpen
      if (this.healthyPickerOpen) this.targetPickerOpen = false
    },

    toggleTargetPicker() {
      this.targetPickerOpen = !this.targetPickerOpen
      if (this.targetPickerOpen) this.healthyPickerOpen = false
    },

    loadHealthyPreset(preset: CellPreset) {
      this.store.loadPreset('healthy', preset)
      this.healthyPickerOpen = false
      broadcastStateSync()
      this.$emit('load-healthy-preset', preset)
    },

    loadTargetPreset(preset: CellPreset) {
      this.store.loadPreset('target', preset)
      this.targetPickerOpen = false
      // applyTargetDefaults fires via watcher on currentTargetId in ExperimentView
      this.$emit('load-target-preset', preset)
    },

    loadUserPreset(preset: UserCellPreset) {
      const config = this.presetsStore.toCellConfig(preset, 'target')
      this.store.loadPreset('target', config)
      this.targetPickerOpen = false
    },

    onUserPresetSaved() {
      this.showCreateModal = false
      // Switch to custom tab so user sees the newly created preset
      this.targetPickerCategory = 'custom'
      this.targetPickerOpen = true
    },

    /** Called by ExperimentView via $refs when clicking outside the header. */
    closeAllPickers() {
      this.healthyPickerOpen = false
      this.targetPickerOpen = false
    },
  },
})
</script>

<style lang="scss" scoped>


@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

// ── BEM block: experiment — all child elements nest here ──────────────────────
.experiment {

  // ── Header bar ───────────────────────────────────────────────────────────────
  &__header {
    @include flex-between(1.5rem);
    padding: 0.5rem 1.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;

    @media (max-width: 768px) { padding: 0.5rem 0.65rem; }

    @media (max-width: 540px) {
      flex-wrap: wrap;
      gap: 0.4rem 0;
      padding: 0.45rem 0.6rem;
      align-items: center;
    }

    &-left {
      @include flex-row(0.6rem);
      flex-shrink: 0;
      align-items: center;

      @media (max-width: 540px) { flex: 1; order: 1; }
    }

    &-right {
      @include flex-row(0.85rem);
      flex-shrink: 0;

      @media (max-width: 540px) { flex-shrink: 0; order: 2; }
    }
  }

  // ── Session controls ──────────────────────────────────────────────────────────
  &__session-name {
    background: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.06em;
    outline: none;
    min-width: 100px;
    max-width: 200px;
    padding: 0.05rem 0.1rem;
    transition: border-color var(--tr-fast);

    &:focus { border-bottom-color: var(--color-primary); }
  }

  &__notes-toggle {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    letter-spacing: 0.06em;
    padding: 0.14rem 0.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
    white-space: nowrap;

    &:hover {
      color: var(--color-text);
      border-color: var(--color-text-muted);
    }

    &--active {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    }
  }

  // ── Connection status chip ────────────────────────────────────────────────────
  &__chip {
    @include flex-row(0.3rem);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.1em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    white-space: nowrap;

    &--local     { border-color: color-mix(in srgb, var(--color-amber) 30%, transparent); color: var(--color-amber); }
    &--connected { border-color: color-mix(in srgb, var(--color-lime) 35%, transparent);  color: var(--color-lime); }

    &-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-primary);
      flex-shrink: 0;
      animation: pulse-dot 2s ease-in-out infinite;

      &--warn { background: var(--color-amber); animation: none; }
    }
  }

  // ── Z-drift badge ─────────────────────────────────────────────────────────────
  &__z-drift-badge {
    @include inline-flex-center();
    gap: 0.25rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.08em;
    padding: 0.18rem 0.5rem;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-amber) 45%, transparent);
    color: var(--color-amber);
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    text-decoration: none;
    white-space: nowrap;
    animation: pulse-dot 2s ease-in-out infinite;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-amber) 16%, transparent); }
  }

  &__z-drift-icon { font-size: var(--fs-xs); }

  // ── Cell selector area ────────────────────────────────────────────────────────
  &__cell-badges {
    @include flex-row(1rem);

    @media (max-width: 540px) {
      order: 3;
      width: 100%;
      gap: 0.4rem;
      display: flex !important;
      flex-wrap: nowrap;
      justify-content: stretch;
    }
  }

  &__cell-slot {
    position: relative;

    @media (max-width: 540px) { flex: 1; min-width: 0; }
  }

  // ── Cell badge button ─────────────────────────────────────────────────────────
  &__cell-badge {
    display: inline-flex;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;

    @media (max-width: 540px) { display: flex; width: 100%; }

    &:hover .experiment__cell-badge-row {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.045);
    }

    &--healthy .experiment__cell-badge-row--open {
      border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
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
      background: rgba(255, 255, 255, 0.025);
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
      &--target  { color: var(--color-danger); }
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

  // ── Preset picker dropdown ────────────────────────────────────────────────────
  &__cell-picker {
    @include surface-card(6px, 0.75rem);
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 200;
    min-width: 280px;
    max-width: 380px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);

    @media (max-width: 768px) {
      position: fixed;
      top: 60px;
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
    }

    &-title {
      @include mono-upper(0.7rem, 0.1em);
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
        border-color: rgba(255, 255, 255, 0.2);
      }

      &--active { background: rgba(255, 255, 255, 0.04); }

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

  // ── Preset buttons ────────────────────────────────────────────────────────────
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
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.2);
    }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      border-color: var(--color-primary);
    }

    &--healthy.experiment__preset-btn--active { border-color: var(--color-primary); }

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

  // ── Custom preset empty state ─────────────────────────────────────────────────
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
