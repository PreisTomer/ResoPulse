<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment" @click.self="healthyPickerOpen = false; targetPickerOpen = false">

    <!-- ── Combined header bar ───────────────────────────────────── -->
    <div class="experiment__header">

      <!-- Far left: session name + notes toggle -->
      <div class="experiment__header-left">
        <input
          v-model="expStore.sessionName"
          class="experiment__session-name"
          spellcheck="false"
          :title="$t('exp.renameSession')"
        />
        <button
          class="experiment__notes-toggle"
          :class="{ 'experiment__notes-toggle--active': notesOpen }"
          type="button"
          :title="$t('exp.notesToggleTip')"
          @click.stop="notesOpen = !notesOpen"
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

    <!-- ── Session metadata panel (expands below header) ─────────── -->
    <div v-show="notesOpen" class="experiment__notes-panel" @click.stop>
      <div class="experiment__notes-field">
        <label class="experiment__notes-label">{{ $t('exp.notesLabelSample') }}</label>
        <input
          class="experiment__notes-input"
          type="text"
          :placeholder="$t('exp.notesSamplePlaceholder')"
          :value="expStore.sampleDescription"
          @input="expStore.setSampleDescription(($event.target as HTMLInputElement).value)"
          spellcheck="false"
        />
      </div>
      <div class="experiment__notes-field experiment__notes-field--grow">
        <label class="experiment__notes-label">{{ $t('exp.notesLabelNotes') }}</label>
        <textarea
          class="experiment__notes-textarea"
          :placeholder="$t('exp.notesNotesPlaceholder')"
          :value="expStore.sessionNotes"
          @input="expStore.setSessionNotes(($event.target as HTMLTextAreaElement).value)"
          rows="2"
          spellcheck="false"
        ></textarea>
      </div>
      <p class="experiment__notes-hint">{{ $t('exp.notesHint') }}</p>
    </div>

    <!-- ── Main content ──────────────────────────────────────────── -->
    <div class="experiment__main">

      <!-- Row 1: Cell cards side-by-side + field controls -->
      <div class="experiment__top">
        <!-- Sentinel: observed by IntersectionObserver to detect when cells scroll out of view -->
        <div ref="cellsAnchor" class="experiment__cells-anchor"></div>
        <div class="experiment__cells">
          <CellCard
            v-for="cell in cells"
            :key="cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :sublabel-tip="cell.sublabelTip"
            :description="cell.description"
            :cell-data="cell.cellData"
          />
        </div>
        <div class="experiment__field">
          <FrequencySlider />
        </div>
      </div>

      <!-- Row 2: Chart (full width, collapsible) -->
      <div class="experiment__chart-section">
        <AccordionPanel
          :icon="ICON.WAVE"
          :title="$t('exp.chartSectionTitle')"
          :subtitle="chartModeLabel"
          :initial-open="true"
          :border-on-toggle="true"
        >
          <FrequencyResponseChart v-if="store.chartMode === CHART_MODE.SCHWAN" />
          <ResonanceChart v-else />
        </AccordionPanel>
      </div>

      <!-- Row 2b: Disruption ratio chart (full width, collapsible) -->
      <div class="experiment__chart-section">
        <AccordionPanel
          :icon="ICON.LYSIS_BOLT"
          :title="$t('drChart.sectionTitle')"
          :subtitle="$t('drChart.sectionTip')"
          :initial-open="false"
          :border-on-toggle="true"
        >
          <DisruptionChart />
        </AccordionPanel>
      </div>

      <!-- Row 3: Selectivity (full width) -->
      <SelectivityPanel />

      <!-- Row 4: Therapeutic Heatmap (full width, collapsible) -->
      <TherapeuticHeatmap />

      <!-- Row 5 & 6: Research analysis tools - sweep + population (collapsible, full width) -->
      <SweepPanel @window-change="onSweepWindowChange" @open-change="sweepPanelOpen = $event" />

      <!-- Therapeutic window snap bar - appears below sweep results, where the user already is -->
      <div v-if="sweepWindow" class="experiment__snap-bar" v-tip="tipSnapBar">
        <span class="experiment__snap-bar-label">{{ $t('exp.snapBarLabel') }}</span>
        <span class="experiment__snap-bar-range">
          {{ sweepWindow.lo.toFixed(0) }} - {{ sweepWindow.hi.toFixed(0) }}
          {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}
        </span>
        <span class="experiment__snap-bar-affects">{{ sweepWindow.param === 'field' ? $t('exp.snapBarSubField') : $t('exp.snapBarSubFreq') }} {{ Math.round((sweepWindow.lo + sweepWindow.hi) / 2) }} {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}</span>
        <span v-if="snapConfirming" class="experiment__snap-bar-lysis-warn">{{ $t('exp.snapBarLysisWarn', { cellLabel: snapLysisCellLabel }) }}</span>
        <div class="experiment__snap-confirm-row">
          <template v-if="!snapConfirming && !snapConfirmed">
            <button class="experiment__snap-bar-btn" @click="snapToWindow">
              {{ $t('exp.snapBarBtn') }}
            </button>
          </template>
          <template v-else-if="snapConfirming">
            <button class="experiment__snap-bar-btn experiment__snap-bar-btn--confirm" @click="snapToWindow">
              {{ $t('exp.snapBarBtnConfirm') }}
            </button>
            <button class="experiment__snap-bar-btn experiment__snap-bar-btn--cancel" @click="cancelSnap">
              {{ $t('exp.snapBarBtnCancel') }}
            </button>
          </template>
          <template v-else>
            <button class="experiment__snap-bar-btn experiment__snap-bar-btn--confirmed" disabled>
              {{ $t('exp.snapBarBtnApplied') }}
            </button>
          </template>
        </div>
      </div>

      <PopulationPanel @open-change="populationPanelOpen = $event" />

      <!-- Row 7: Log (full width) -->
      <ExperimentLog />

    </div>
  </div>

  <!-- Sticky live cell view - appears when cells scroll out of viewport -->
  <Transition name="sticky-cells">
    <div
      v-if="showStickySimView"
      class="experiment__sticky-cells"
      :class="{ 'experiment__sticky-cells--collapsed': stickyCellsCollapsed }"
    >
      <!-- Drawer tab - always visible, slides panel in/out -->
      <button
        class="experiment__sticky-cells-tab"
        type="button"
        v-tip="stickyCellsCollapsed ? $t('exp.stickyExpand') : $t('exp.stickyCollapse')"
        @click.stop="stickyCellsCollapsed = !stickyCellsCollapsed"
      >
        <span class="experiment__sticky-cells-tab-dot">⬤</span>
      </button>
      <!-- Panel body — click anywhere to scroll back to the live cell cards -->
      <div class="experiment__sticky-cells-body experiment__sticky-cells-body--clickable" @click.stop="scrollToCells" :title="$t('exp.stickyScrollTip')">
        <div class="experiment__sticky-cells-label">⬤ LIVE</div>
        <div class="experiment__sticky-cells-grid">
          <CellCard
            v-for="cell in cells"
            :key="'sticky-' + cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :sublabel-tip="cell.sublabelTip"
            :description="cell.description"
            :cell-data="cell.cellData"
            :compact="true"
          />
        </div>
      </div>
    </div>
  </Transition>

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
import { connectSocket, socketConnected, broadcastStateSync } from '@/services/socket'
import AccordionPanel from '@/components/AccordionPanel.vue'
import CellCard from '@/components/CellCard/index.vue'
import FrequencySlider from '@/components/FrequencySlider/index.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart/index.vue'
import ResonanceChart from '@/components/ResonanceChart/index.vue'
import DisruptionChart from '@/components/DisruptionChart/index.vue'
import SelectivityPanel from '@/components/SelectivityPanel/index.vue'
import TherapeuticHeatmap from '@/components/TherapeuticHeatmap/index.vue'
import SweepPanel from '@/components/SweepPanel/index.vue'
import PopulationPanel from '@/components/PopulationPanel/index.vue'
import ExperimentLog from '@/components/ExperimentLog.vue'
import CreateCellModal from '@/components/CreateCellModal/index.vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '@/constants/cellLibrary'
import type { CellPreset, CellGroup } from '@/constants/cellLibrary'
import { computeSAR } from '@/utils/physics'
import { formatLysisTime } from '@/tooltips/sliderTooltips'
import { tipSnapBar as tipSnapBarFn, tipCellBadgeHealthy, tipCellBadgeTarget } from '@/tooltips/experimentTooltips'
import { CATEGORY_DEFAULTS, INITIAL_RESONANT_FIELD_FRACTION, SNAP_CONFIRM_MS, DEFAULT_LYSIS_N_PULSES } from '@/constants/experimentDefaults'
import { CELL_CATEGORY, CELL_TYPE, CELL_GROUP, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatFreqKHz } from '@/utils/format'

export default defineComponent({
  components: {
    AccordionPanel,
    CellCard,
    FrequencySlider,
    FrequencyResponseChart,
    ResonanceChart,
    DisruptionChart,
    SelectivityPanel,
    TherapeuticHeatmap,
    SweepPanel,
    PopulationPanel,
    ExperimentLog,
    CreateCellModal,
  },

  setup() {
    return {
      store: useCellStore(),
      expStore: useExperimentStore(),
      impStore: useImpedanceStore(),
      presetsStore: useUserPresetsStore(),
      socketConnected,
      GROUP_COLORS,
      GROUP_LABELS,
      CHART_MODE,
      ICON,
    }
  },

  created() {
    connectSocket()
    this.store.startSession()
    this.doseLastMs = Date.now()
    this.doseTimer = setInterval(() => {
      const now     = Date.now()
      const dtMs    = now - this.doseLastMs
      this.doseLastMs = now
      const sar = computeSAR(
        this.store.target,
        this.store.fieldIntensity,
        this.store.effectiveSigmaE,
        this.store.waveform === 'cw' ? 0.5 : 1.0,
      )
      this.expStore.addDoseSample(sar, this.store.dutyCycle, dtMs)
    }, 1000)
  },

  data() {
    return {
      healthyPickerOpen: false,
      targetPickerOpen: false,
      targetPickerCategory: CELL_GROUP.CANCER as CellGroup | 'custom',
      sweepWindow: null as { lo: number; hi: number; param: 'field' | 'freq' } | null,
      sweepPanelOpen: false,
      populationPanelOpen: false,
      snapConfirming: false,
      snapConfirmed: false,
      snapResetTimer:   null as ReturnType<typeof setTimeout> | null,
      _sweepNullTimer:  null as ReturnType<typeof setTimeout> | null,
      showCreateModal: false,
      notesOpen: false,
      doseTimer: null as ReturnType<typeof setInterval> | null,
      doseLastMs: 0,
      showStickySimView: false,
      stickyCellsCollapsed: false,
      cellsObserver: null as IntersectionObserver | null,
    }
  },

  watch: {
    /** Re-expand the drawer each time the sticky panel comes back into view. */
    showStickySimView(val: boolean) {
      if (val) this.stickyCellsCollapsed = false
    },
    /** When the active target cell changes, reset all sliders to category-appropriate
     *  defaults and auto-switch chart mode. Mirrors a "new experiment" context. */
    currentTargetId(newId: string, oldId: string) {
      if (newId !== oldId) {
        this.applyTargetDefaults()
        this.snapConfirmed = false
      }
    },
    'store.resetCounter'() {
      this.snapConfirmed = false
    },
    /** If the target category becomes mammalian (e.g. via radius edit) while resonance mode
     *  is active, immediately revert to Schwan mode. Resonance has no physical meaning for
     *  mammalian cells - the button is disabled but state drift can still occur via param editing. */
    'store.targetCellCategory'(cat: string) {
      if (cat === CELL_CATEGORY.MAMMALIAN && this.store.chartMode === CHART_MODE.RESONANCE) {
        this.store.setChartMode(CHART_MODE.SCHWAN)
      }
    },
  },

  computed: {
    currentTargetId(): string {
      return this.store.target.id
    },

    showZDriftBadge(): boolean {
      return Math.abs(this.impStore.impedanceDriftPct) > 5
    },

    tipSnapBar(): string {
      if (!this.sweepWindow) return ''
      return tipSnapBarFn(this.sweepWindow)
    },

    tipHealthyBadge(): string {
      const cell = this.store.healthy
      return tipCellBadgeHealthy({ label: cell.label, radius: cell.radius, membraneThickness: cell.membraneThickness, fcDisplay: this.healthyFcSetup })
    },

    tipTargetBadge(): string {
      const cell = this.store.target
      return tipCellBadgeTarget({ label: cell.label, radius: cell.radius, membraneThickness: cell.membraneThickness, fcDisplay: this.targetFcSetup })
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

    chartModeLabel(): string {
      return this.store.chartMode === CHART_MODE.SCHWAN
        ? this.$t('exp.chartModeSchwan')
        : this.$t('exp.chartModeResonance')
    },

    /** Dynamic label used in the snap-bar lysis warning and confirm button.
     *  Includes the live target cell name and estimated lysis countdown. */
    snapLysisCellLabel(): string {
      return `${this.store.target.label} (~${formatLysisTime(this.store.lysisDelayMs)})`
    },

    cells() {
      // Resolve label + sublabel from the live store cell (changes when preset loads)
      const cellLabel = (type: 'healthy' | 'target') => {
        return type === CELL_TYPE.HEALTHY ? this.store.healthy.label : this.store.target.label
      }
      const cellSublabel = (type: 'healthy' | 'target') => {
        const cell = type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
        const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
        return preset ? preset.notes : this.$t(`cells.${type}.sublabel`)
      }
      const cellSublabelTip = (type: 'healthy' | 'target') => {
        const cell = type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
        const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
        return preset?.techNotes ?? ''
      }
      return [
        {
          id: 'healthy',
          type: 'healthy' as const,
          label: cellLabel('healthy'),
          sublabel: cellSublabel('healthy'),
          sublabelTip: cellSublabelTip('healthy'),
          description: this.$t('cells.healthy.description'),
          cellData: this.store.healthy,
        },
        {
          id: 'target',
          type: 'target' as const,
          label: cellLabel('target'),
          sublabel: cellSublabel('target'),
          sublabelTip: cellSublabelTip('target'),
          description: this.$t('cells.target.description'),
          cellData: this.store.target,
        },
      ]
    },
  },
  methods: {
    scrollToCells() {
      const anchor = this.$refs.cellsAnchor as HTMLElement | undefined
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    onSweepWindowChange(w: { lo: number; hi: number; param: 'field' | 'freq' } | null) {
      if (w !== null) {
        // Non-null window: apply immediately and cancel any pending null-out.
        // This prevents the snap bar from flashing away during a mid-sweep recalculation.
        if (this._sweepNullTimer) {
          clearTimeout(this._sweepNullTimer)
          this._sweepNullTimer = null
        }
        this.sweepWindow = w
      } else {
        // Null window: hold 450 ms before hiding the snap bar.
        // If the sweep produces a window again within that window (e.g. after snap settles),
        // the null is discarded and the bar stays visible without any flash.
        if (this._sweepNullTimer) clearTimeout(this._sweepNullTimer)
        this._sweepNullTimer = setTimeout(() => {
          this._sweepNullTimer = null
          this.sweepWindow = null
        }, 450)
      }
    },

    snapToWindow() {
      if (!this.sweepWindow) return
      // First click: arm the confirmation state; auto-disarm after 3 s
      if (!this.snapConfirming) {
        this.snapConfirming = true
        this.snapResetTimer = setTimeout(() => {
          this.snapConfirming = false
        }, SNAP_CONFIRM_MS)
        return
      }
      // Second click within 3 s: execute the snap
      clearTimeout(this.snapResetTimer ?? undefined)
      this.snapConfirming = false
      const center = Math.round((this.sweepWindow.lo + this.sweepWindow.hi) / 2)
      if (this.sweepWindow.param === 'field') {
        this.store.setFieldIntensity(center)
      } else {
        this.store.setBroadcastFreqKHz(center)
      }
      broadcastStateSync()
      // Lock the snap button until the cell is reset - prevents re-snapping mid-lysis.
      this.snapConfirmed = true
    },

    cancelSnap() {
      clearTimeout(this.snapResetTimer ?? undefined)
      this.snapConfirming = false
    },

    loadHealthyPreset(preset: CellPreset) {
      this.store.loadPreset('healthy', preset)
      this.healthyPickerOpen = false
      broadcastStateSync()
    },

    loadTargetPreset(preset: CellPreset) {
      this.store.loadPreset('target', preset)
      this.targetPickerOpen = false
      // applyTargetDefaults fires via watcher on currentTargetId - it will call broadcastStateSync
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

    toggleHealthyPicker() {
      this.healthyPickerOpen = !this.healthyPickerOpen
      if (this.healthyPickerOpen) this.targetPickerOpen = false
    },

    toggleTargetPicker() {
      this.targetPickerOpen = !this.targetPickerOpen
      if (this.targetPickerOpen) this.healthyPickerOpen = false
    },

    /** Apply category-appropriate defaults on every page load.
     *  Called only from mounted() — does NOT broadcast (no peers connected yet).
     *
     *  Field/frequency are not persisted, so they always start from the store initial
     *  value (100 V/cm / 417 kHz). This method sets the correct starting point for
     *  whatever category the persisted target preset belongs to, and also sanitizes
     *  all time-domain parameters so stale cross-session values cannot cause
     *  physics bugs (e.g. bacteria pulse width making mammalian lysis instant). */
    sanitizeCategoryParams() {
      const cat = this.store.targetCellCategory
      const d   = CATEGORY_DEFAULTS[cat]
      const t   = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }

      // Field and frequency: use preset resonant values for virus/bacteria if available,
      // otherwise fall back to category defaults. Mirrors applyTargetDefaults() logic
      // but without a broadcast (peers are not ready yet at mount time).
      const isResonant = cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA
      const freqKHz  = isResonant && t.resonantFreqGHz
        ? t.resonantFreqGHz * 1e6
        : d.freqKHz
      const fieldVcm = isResonant && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * INITIAL_RESONANT_FIELD_FRACTION
        : d.fieldVcm

      this.store.setFieldIntensity(fieldVcm)
      this.store.setBroadcastFreqKHz(freqKHz)
      this.store.setWaveform(d.waveform)
      this.store.setDutyCycle(d.dutyCycle)
      this.store.setPulseWidthNs(d.pulseWidthNs)
      this.store.setMedium(d.medium)
      this.store.setOrientationDeg(0)
      this.store.setLysisNPulses(DEFAULT_LYSIS_N_PULSES)
      this.store.resetTemps()
      // Resonance mode is not valid for mammalian cells; revert if persisted incorrectly.
      if (cat === CELL_CATEGORY.MAMMALIAN && this.store.chartMode === CHART_MODE.RESONANCE) {
        this.store.setChartMode(CHART_MODE.SCHWAN)
      }
    },

    /** Reset field controls and chart mode to scientifically appropriate defaults
     *  for the newly-selected target cell category. */
    applyTargetDefaults() {
      const cat = this.store.targetCellCategory
      const d   = CATEGORY_DEFAULTS[cat]
      // For virus/bacteria: auto-tune frequency to preset's resonant frequency if available
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      // Virus/bacteria: use the preset's resonant frequency if available.
      // Mammalian: use category default (417 kHz) - do not auto-snap.
      const freqKHz = (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantFreqGHz
        ? t.resonantFreqGHz * 1e6   // GHz → kHz (1 GHz = 1,000,000 kHz)
        : d.freqKHz
      // Start at 50% of disruption threshold for intuitive first contact (virus/bacteria),
      // or category default field for mammalian (150 V/cm).
      const fieldVcm = (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * INITIAL_RESONANT_FIELD_FRACTION
        : d.fieldVcm
      this.store.setFieldIntensity(fieldVcm)
      this.store.setBroadcastFreqKHz(freqKHz)
      this.store.setWaveform(d.waveform)
      this.store.setDutyCycle(d.dutyCycle)
      this.store.setPulseWidthNs(d.pulseWidthNs)
      this.store.setMedium(d.medium)
      // Reset advanced orientation + lysis-count to category-neutral defaults
      this.store.setOrientationDeg(0)
      this.store.setLysisNPulses(DEFAULT_LYSIS_N_PULSES)
      // Always start from a thermally neutral state - clears any lysis/destruction
      this.store.resetTemps()
      this.store.setChartMode((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) ? CHART_MODE.RESONANCE : CHART_MODE.SCHWAN)
      broadcastStateSync()
    },
  },

  mounted() {
    // Sanitize time-domain params for the current category without resetting
    // the user's persisted field intensity and frequency (applyTargetDefaults would do too much).
    this.sanitizeCategoryParams()

    const sentinel = this.$refs.cellsAnchor as HTMLElement
    if (sentinel) {
      this.cellsObserver = new IntersectionObserver(
        (entries) => { if (entries[0]) this.showStickySimView = !entries[0].isIntersecting },
        { threshold: 0 },
      )
      this.cellsObserver.observe(sentinel)
    }
  },

  beforeUnmount() {
    clearTimeout(this.snapResetTimer ?? undefined)
    if (this.doseTimer !== null) clearInterval(this.doseTimer)
    this.cellsObserver?.disconnect()
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

.experiment {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 0 2rem;

  /* ── Combined header bar ─────────────────────────────────────── */
  &__header {
    @include flex-between(1.5rem);
    padding: 0.5rem 1.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  &__header-left {
    @include flex-row(0.6rem);
    flex-shrink: 0;
    align-items: center;
  }

  &__notes-toggle {
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

  &__notes-panel {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 0.65rem 1.75rem;
    background: var(--color-surface-2, #0a1628);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__notes-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 220px;

    &--grow { flex: 1; }
  }

  &__notes-label {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  &__notes-input,
  &__notes-textarea {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: 0.72rem;
    padding: 0.3rem 0.6rem;
    outline: none;
    transition: border-color 0.15s;
    resize: none;

    &::placeholder { color: var(--color-text-muted); opacity: 0.55; }
    &:focus { border-color: var(--color-primary); }
  }

  &__notes-textarea { line-height: 1.5; }

  &__notes-hint {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.55;
    align-self: flex-end;
    white-space: nowrap;
    margin-top: auto;
  }

  &__header-right {
    @include flex-row(0.85rem);
    flex-shrink: 0;
  }

  &__session-name {
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

  &__chip {
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

  &__chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-primary);
    flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;

    &--warn { background: var(--color-amber); animation: none; }
  }

  &__z-drift-badge {
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

  &__z-drift-icon {
    font-size: 0.7rem;
  }

  &__cell-badges {
    @include flex-row(1rem);
  }

  /* ── Cell badge wrappers ─────────────────────────────────────── */
  &__cell-slot {
    position: relative;
  }

  &__cell-badge {
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

  &__cell-badge-type {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__cell-badge-row {
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

    &--open {
      // overridden per badge variant below
    }
  }

  &__cell-badge--healthy &__cell-badge-row--open {
    border-color: rgba(0, 212, 255, 0.5);
    background: rgba(0, 212, 255, 0.04);
  }

  &__cell-badge--target &__cell-badge-row--open {
    border-color: rgba(255, 77, 109, 0.5);
    background: rgba(255, 77, 109, 0.04);
  }

  &__cell-badge-selected {
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

  &__cell-badge-caret {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    transition: transform 0.2s;
    opacity: 0.80;
    flex-shrink: 0;

    &--open { transform: rotate(180deg); }
  }

  /* ── Preset pickers ──────────────────────────────────────────── */
  &__cell-picker {
    @include surface-card(6px, 0.75rem);
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 200;
    min-width: 280px;
    max-width: 380px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }

  &__cell-picker-title {
    @include mono-upper(0.58rem, 0.1em);
    color: var(--color-text-muted);
    margin-bottom: 0.6rem;
  }

  &__cell-picker-hdr {
    margin-bottom: 0.6rem;
  }

  &__cell-picker-tabs {
    @include flex-row(0.3rem);
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }

  &__cell-picker-tab {
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

  &__cell-picker-grid {
    @include flex-col(0.35rem);
  }

  &__preset-btn {
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

  &__preset-btn-name {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-heading);
    letter-spacing: 0.02em;
  }

  &__preset-btn-sub {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  /* ── Main content ────────────────────────────────────────────── */
  &__main {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem 2rem;
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
  }

  /* Row 1: cards side-by-side + slider on the right */
  &__top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
    gap: 1.25rem;
    align-items: stretch;
  }

  &__cells {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.25rem;
    min-width: 0;
  }

  &__field {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Therapeutic window snap bar (between SweepPanel & PopulationPanel) ── */
  &__snap-bar {
    @include flex-row(0.75rem);
    align-items: center;
    padding: 0.55rem 1.1rem;
    background: linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%);
    border: 1px solid rgba(34, 197, 94, 0.28);
    border-radius: var(--radius);
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
  }

  &__snap-bar-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: rgba(34, 197, 94, 0.9);
    white-space: nowrap;
  }

  &__snap-bar-range {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-heading);
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 3px;
    padding: 0.1rem 0.45rem;
    white-space: nowrap;
  }

  &__snap-bar-affects {
    font-size: 0.66rem;
    color: var(--color-text-muted);
    flex: 1;
    white-space: nowrap;
  }

  &__snap-bar-lysis-warn {
    font-size: 0.63rem;
    font-family: var(--font-mono);
    color: var(--color-danger);
    opacity: 0.8;
    white-space: nowrap;
  }

  &__snap-confirm-row {
    margin-left: auto;
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-shrink: 0;
  }

  &__snap-bar-btn {
    padding: 0.22rem 0.75rem;
    background: rgba(34, 197, 94, 0.14);
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 4px;
    color: rgba(34, 197, 94, 0.95);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;

    &:hover {
      background: rgba(34, 197, 94, 0.24);
      border-color: rgba(34, 197, 94, 0.65);
    }

    &--confirm {
      background: rgba(239, 68, 68, 0.14);
      border-color: rgba(239, 68, 68, 0.55);
      color: var(--color-danger);
      animation: snap-confirm-pulse 0.7s ease-in-out infinite alternate;

      &:hover {
        background: rgba(239, 68, 68, 0.24);
        border-color: rgba(239, 68, 68, 0.8);
      }
    }

    &--confirmed {
      opacity: 0.45;
      cursor: not-allowed;
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--color-text-muted);

      &:hover {
        background: transparent;
        border-color: rgba(255, 255, 255, 0.15);
      }
    }

    &--cancel {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.18);
      color: var(--color-text-muted);

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.32);
        color: var(--color-text);
      }
    }
  }

  @keyframes snap-confirm-pulse {
    from { opacity: 0.75; }
    to   { opacity: 1.0; }
  }

  /* ── Chart section (collapsible) ─────────────────────────────── */
  &__chart-section {
    @include surface-card(var(--radius));
    overflow: hidden;
  }

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

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

// ── Mobile / Responsive ───────────────────────────────────────────────────────
@media (max-width: 1200px) {
  .experiment__main { padding: 1rem 1.5rem; }
  .experiment__top {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
    gap: 1rem;
  }
}

// Tablet - collapse top row into single column
@media (max-width: 900px) {
  .experiment__main { padding: 0.85rem; gap: 0.85rem; }
  .experiment__top  { grid-template-columns: 1fr; }
  .experiment__cells { grid-template-columns: 1fr 1fr; }
}

// Large phone - picker overlay
@media (max-width: 768px) {
  .experiment__main   { padding: 0.65rem; gap: 0.7rem; }
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

// Phone - single-column cells, full cards
@media (max-width: 540px) {
  // Header becomes 2-row: [session name | chip] then [badges full-width]
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
    // override the mixin's row - stretch children edge-to-edge
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

  .experiment__cells {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  .experiment__cells > * { min-height: 260px; }
}

// ── Sticky live cell view ──────────────────────────────────────────────────────
.experiment__cells-anchor {
  // Zero-height sentinel - stays in normal flow so IntersectionObserver can track
  // when the cell cards area exits the viewport.
  height: 0;
  grid-column: 1 / -1;
  pointer-events: none;
}

.experiment__sticky-cells {
  position: fixed;
  top: 68px;   // below NavBar (≈60 px) + small gap
  right: 1rem;
  z-index: 150;
  // Scale the panel to ~72 % visual size anchored at top-right
  transform: scale(0.72);
  transform-origin: top right;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none; // tab overrides this below
  // Flex row: [tab][body]
  display: flex;
  flex-direction: row;
  align-items: center; // vertically center the book tab against the body

  // Collapsed: slide body off-screen to the right; tab stays at viewport edge.
  // translateX(312px) at scale(0.72) = 225 px visual shift - exactly the body width.
  &--collapsed {
    transform: scale(0.72) translateX(312px);
  }

  // ── Drawer tab - book-tab style, centred on the left edge ─────────────────
  &-tab {
    pointer-events: auto;
    flex-shrink: 0;
    align-self: center;          // float at vertical midpoint of the body
    width: 32px;
    height: 88px;                // fixed height, roughly 20 % of two-card panel
    background: rgba(8, 10, 18, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-right: none;
    border-radius: 8px 0 0 8px;  // rounded only on the protruding (left) side
    box-shadow: -3px 0 14px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, box-shadow 0.15s;

    &:hover {
      background: rgba(22, 28, 52, 0.99);
      box-shadow: -4px 0 18px rgba(100, 160, 255, 0.18);
    }

    &-dot {
      color: var(--color-primary);
      font-size: 0.75rem;
      animation: sticky-pulse 2s ease-in-out infinite;
    }
  }

  // ── Panel body ────────────────────────────────────────────────────────────
  &-body {
    pointer-events: none; // non-interactive by default
    width: 312px;
    background: rgba(8, 10, 18, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-left: none;
    border-radius: 0 10px 10px 0;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.80), 0 0 0 1px rgba(255, 255, 255, 0.05);
    padding: 0.75rem 0.75rem 0.5rem;
    backdrop-filter: blur(12px);
    transition: border-color 0.15s, box-shadow 0.15s;

    &--clickable {
      pointer-events: auto;
      cursor: pointer;

      &:hover {
        border-color: rgba(100, 160, 255, 0.30);
        box-shadow: 0 8px 48px rgba(0, 0, 0, 0.80), 0 0 0 1px rgba(100, 160, 255, 0.12);
      }
    }
  }

  &-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    color: var(--color-primary);
    opacity: 0.80;
    margin-bottom: 0.5rem;
    padding-left: 0.1rem;
  }

  &-grid {
    display: flex;
    flex-direction: column; // healthy on top, target below
    gap: 0.5rem;
  }
}

@keyframes sticky-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1.0; }
}

// Fade + slide-down entrance/exit
// Leave uses opacity only - transform is intentionally excluded so the panel
// fades out from whatever collapsed/expanded state it is currently in, rather
// than snapping back to expanded before disappearing.
.sticky-cells-enter-active { transition: opacity 0.28s ease, transform 0.28s ease; }
.sticky-cells-leave-active { transition: opacity 0.2s ease; }
.sticky-cells-enter-from   { opacity: 0; transform: scale(0.72) translateY(-14px); transform-origin: top right; }
.sticky-cells-leave-to     { opacity: 0; }

// ── Mobile: slide up from the bottom, single-row cells ────────────────────────
@media (max-width: 768px) {
  // Hide the sticky cell panel on phone-sized screens — the cards are already
  // visible at the top of the page and the panel adds no value at this size.
  .experiment__sticky-cells { display: none; }
}
</style>
