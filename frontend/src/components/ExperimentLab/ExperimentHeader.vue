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
            <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': healthyPickerOpen }">▼</span>
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
            <span class="experiment__cell-badge-caret" :class="{ 'experiment__cell-badge-caret--open': targetPickerOpen }">▼</span>
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
              <button class="experiment__preset-btn-del" @click.stop="presetsStore.remove(p.id)" title="Delete">✕</button>
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
        <span class="experiment__z-drift-icon">⚗</span>
        Z {{ impStore.impedanceDriftPct.toFixed(1) }}%
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
@use '../../styles/mixins' as *;

/* ── Combined header bar ─────────────────────────────────────── */
.experiment__header {
  @include flex-between(1.5rem);
  padding: 0.5rem 1.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.experiment__header-left {
  @include flex-row(0.6rem);
  flex-shrink: 0;
  align-items: center;
}

.experiment__header-right {
  @include flex-row(0.85rem);
  flex-shrink: 0;
}

.experiment__notes-toggle {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  padding: 0.14rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  white-space: nowrap;

  &:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  &--active {
    color: var(--color-primary);
    border-color: rgba(0, 212, 255, 0.4);
    background: rgba(0, 212, 255, 0.06);
  }
}

.experiment__session-name {
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  color: var(--color-text-heading);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  outline: none;
  min-width: 100px;
  max-width: 200px;
  padding: 0.05rem 0.1rem;
  transition: border-color 0.15s;

  &:focus {
    border-bottom-color: var(--color-primary);
  }
}

.experiment__chip {
  @include flex-row(0.3rem);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  padding: 0.18rem 0.55rem;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  white-space: nowrap;

  &--local     { border-color: rgba(251, 191, 36, 0.3);  color: var(--color-amber); }
  &--connected { border-color: rgba(57, 255, 20, 0.35);  color: var(--color-lime); }
}

.experiment__chip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;

  &--warn { background: var(--color-amber); animation: none; }
}

.experiment__z-drift-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  padding: 0.18rem 0.5rem;
  border-radius: 3px;
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: var(--color-amber);
  background: rgba(251, 191, 36, 0.08);
  text-decoration: none;
  white-space: nowrap;
  animation: pulse-dot 2s ease-in-out infinite;
  transition: background 0.15s;

  &:hover {
    background: rgba(251, 191, 36, 0.16);
  }
}

.experiment__z-drift-icon {
  font-size: 0.7rem;
}

.experiment__cell-badges {
  @include flex-row(1rem);
}

/* ── Cell badge wrappers ─────────────────────────────────────── */
.experiment__cell-slot {
  position: relative;
}

.experiment__cell-badge {
  display: inline-flex;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  &:hover .experiment__cell-badge-row {
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.045);
  }
}

.experiment__cell-badge-type {
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.experiment__cell-badge-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.42rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.025);
  min-width: 160px;
  max-width: 240px;
  transition: border-color 0.15s, background 0.15s;
}

.experiment__cell-badge--healthy .experiment__cell-badge-row--open {
  border-color: rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.04);
}

.experiment__cell-badge--target .experiment__cell-badge-row--open {
  border-color: rgba(255, 77, 109, 0.5);
  background: rgba(255, 77, 109, 0.04);
}

.experiment__cell-badge-selected {
  font-family: var(--font-mono);
  font-size: 0.82rem;
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

.experiment__cell-badge-caret {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  transition: transform 0.2s;
  opacity: 0.80;
  flex-shrink: 0;

  &--open { transform: rotate(180deg); }
}

/* ── Preset pickers ──────────────────────────────────────────── */
.experiment__cell-picker {
  @include surface-card(6px, 0.75rem);
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 200;
  min-width: 280px;
  max-width: 380px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.experiment__cell-picker-title {
  @include mono-upper(0.58rem, 0.1em);
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

.experiment__cell-picker-hdr {
  margin-bottom: 0.6rem;
}

.experiment__cell-picker-tabs {
  @include flex-row(0.3rem);
  flex-wrap: wrap;
  margin-top: 0.4rem;
}

.experiment__cell-picker-tab {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  padding: 0.15rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;

  &:hover {
    color: var(--color-text);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &--active {
    background: rgba(255, 255, 255, 0.04);
  }
}

.experiment__cell-picker-grid {
  @include flex-col(0.35rem);
}

.experiment__preset-btn {
  @include flex-col(0.15rem);
  padding: 0.45rem 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &--active {
    background: rgba(0, 212, 255, 0.05);
    border-color: var(--color-primary);
  }
}

.experiment__preset-btn-name {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-heading);
  letter-spacing: 0.02em;
}

.experiment__preset-btn-sub {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Compound modifier: healthy preset btn that is also active */
.experiment__preset-btn--healthy.experiment__preset-btn--active {
  border-color: var(--color-primary);
}

/* Custom preset tab distinct styling */
.experiment__cell-picker-tab--custom {
  border-color: rgba(255, 140, 0, 0.4);
  color:        rgba(255, 140, 0, 0.8);

  &.experiment__cell-picker-tab--active {
    border-color: rgba(255, 140, 0, 0.7);
    color:        #ff8c00;
    background:   rgba(255, 140, 0, 0.08);
  }
}

/* Custom preset buttons */
.experiment__preset-btn--custom {
  position: relative;
  padding-right: 1.6rem;

  .experiment__preset-btn-del {
    position:    absolute;
    top:         50%;
    right:       0.4rem;
    transform:   translateY(-50%);
    background:  transparent;
    border:      none;
    color:       var(--color-text-muted);
    font-size:   0.65rem;
    cursor:      pointer;
    padding:     0.1rem;
    line-height: 1;
    opacity:     0.5;
    transition:  opacity 0.15s, color 0.15s;

    &:hover {
      opacity: 1;
      color:   var(--color-danger);
    }
  }
}

/* Empty state for custom presets */
.experiment__custom-empty {
  font-size:   0.72rem;
  color:       var(--color-text-muted);
  padding:     0.5rem 0.25rem;
  margin:      0;
  line-height: 1.5;
}

.experiment__custom-hint {
  font-size: 0.65rem;
  opacity:   0.80;
}

/* "+ New Cell Profile" button in custom preset grid */
.experiment__preset-btn-new {
  width:         100%;
  padding:       0.45rem 0.65rem;
  background:    rgba(255, 140, 0, 0.06);
  border:        1px dashed rgba(255, 140, 0, 0.35);
  border-radius: 4px;
  color:         rgba(255, 140, 0, 0.85);
  font-family:   var(--font-mono);
  font-size:     0.68rem;
  font-weight:   600;
  letter-spacing: 0.04em;
  cursor:        pointer;
  text-align:    left;
  transition:    background 0.15s, border-color 0.15s;
  margin-top:    0.1rem;

  &:hover {
    background:    rgba(255, 140, 0, 0.12);
    border-color:  rgba(255, 140, 0, 0.6);
  }
}

/* Custom grid with explicit grid for empty state */
.experiment__cell-picker-grid--custom {
  display:        flex;
  flex-direction: column;
  gap:            0.35rem;
}

// ── Mobile / Responsive ───────────────────────────────────────────────────────

// Large phone - picker overlay
@media (max-width: 768px) {
  .experiment__header { padding: 0.5rem 0.65rem; }
  .experiment__cell-picker {
    position: fixed;
    top: 60px;
    left: 0.5rem;
    right: 0.5rem;
    max-width: none;
    z-index: 200;
  }
}

// Phone - header becomes 2-row
@media (max-width: 540px) {
  .experiment__header {
    flex-wrap: wrap;
    gap: 0.4rem 0;
    padding: 0.45rem 0.6rem;
    align-items: center;
  }

  .experiment__header-left  { flex: 1; order: 1; }
  .experiment__header-right { flex-shrink: 0; order: 2; }

  .experiment__cell-badges {
    order: 3;
    width: 100%;
    gap: 0.4rem;
    display: flex !important;
    flex-wrap: nowrap;
    justify-content: stretch;
  }

  .experiment__cell-slot {
    flex: 1;
    min-width: 0;
  }

  .experiment__cell-badge {
    display: flex;
    width: 100%;
  }

  .experiment__cell-badge-row {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}
</style>
