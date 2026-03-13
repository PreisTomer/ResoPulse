<template>
  <div class="experiment" @click.self="healthyPickerOpen = false; targetPickerOpen = false">

    <!-- ── Combined header bar ───────────────────────────────────── -->
    <div class="experiment__header">

      <!-- Far left: session name -->
      <div class="experiment__header-left">
        <input
          v-model="expStore.sessionName"
          class="experiment__session-name"
          spellcheck="false"
          :title="$t('exp.renameSession')"
        />
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

    <!-- ── Main content ──────────────────────────────────────────── -->
    <div class="experiment__main">

      <!-- Row 1: Cell cards side-by-side + field controls -->
      <div class="experiment__top">
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

      <!-- Therapeutic window snap bar — shown whenever a sweep has found an optimal window -->
      <div v-if="sweepWindow" class="experiment__snap-bar" v-tip="tipSnapBar">
        <span class="experiment__snap-bar-label">{{ $t('exp.snapBarLabel') }}</span>
        <span class="experiment__snap-bar-range">
          {{ sweepWindow.lo.toFixed(0) }}–{{ sweepWindow.hi.toFixed(0) }}
          {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}
        </span>
        <span class="experiment__snap-bar-affects">{{ sweepWindow.param === 'field' ? $t('exp.snapBarSubField') : $t('exp.snapBarSubFreq') }} {{ Math.round((sweepWindow.lo + sweepWindow.hi) / 2) }} {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}</span>
        <span class="experiment__snap-bar-lysis-warn">{{ $t('exp.snapBarLysisWarn', { cellLabel: snapLysisCellLabel }) }}</span>
        <button
          class="experiment__snap-bar-btn"
          :class="{ 'experiment__snap-bar-btn--confirm': snapConfirming }"
          @click="snapToWindow"
        >{{ snapConfirming ? $t('exp.snapBarBtnConfirm', { cellLabel: snapLysisCellLabel }) : $t('exp.snapBarBtn') }}</button>
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

      <!-- Row 3: Selectivity (full width) -->
      <SelectivityPanel />

      <!-- Row 4: Therapeutic Heatmap (full width, collapsible) -->
      <TherapeuticHeatmap />

      <!-- Row 5 & 6: Research analysis tools — sweep + population (collapsible, full width) -->
      <SweepPanel @window-change="onSweepWindowChange" @open-change="sweepPanelOpen = $event" />

      <PopulationPanel @open-change="populationPanelOpen = $event" />

      <!-- Row 7: Log (full width) -->
      <ExperimentLog />

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
import { connectSocket, socketConnected, broadcastStateSync } from '@/services/socket'
import AccordionPanel from '@/components/AccordionPanel.vue'
import CellCard from '@/components/CellCard/index.vue'
import FrequencySlider from '@/components/FrequencySlider/index.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart/index.vue'
import ResonanceChart from '@/components/ResonanceChart/index.vue'
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
import { CATEGORY_DEFAULTS, INITIAL_RESONANT_FIELD_FRACTION, SNAP_CONFIRM_MS } from '@/constants/experimentDefaults'
import { CELL_CATEGORY, CELL_TYPE, CELL_GROUP, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatFreqKHz } from '@/utils/format'
import { UNIT } from '@/constants/units'

export default defineComponent({
  components: {
    AccordionPanel,
    CellCard,
    FrequencySlider,
    FrequencyResponseChart,
    ResonanceChart,
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
      UNIT,
    }
  },

  created() {
    connectSocket()
    this.store.startSession()
    this._doseLastMs = Date.now()
    this._doseTimer = setInterval(() => {
      const now     = Date.now()
      const dtMs    = now - this._doseLastMs
      this._doseLastMs = now
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
      _snapResetTimer: null as number | null,
      showCreateModal: false,
      // Dosimetry timer
      _doseTimer: null as ReturnType<typeof setInterval> | null,
      _doseLastMs: 0,
    }
  },

  watch: {
    /** When the active target cell changes, reset all sliders to category-appropriate
     *  defaults and auto-switch chart mode. Mirrors a "new experiment" context. */
    currentTargetId(newId: string, oldId: string) {
      if (newId !== oldId) this.applyTargetDefaults()
    },
    /** If the target category becomes mammalian (e.g. via radius edit) while resonance mode
     *  is active, immediately revert to Schwan mode. Resonance has no physical meaning for
     *  mammalian cells — the button is disabled but state drift can still occur via param editing. */
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
      const isField = this.sweepWindow.param === 'field'
      const unit    = isField ? UNIT.V_PER_CM : UNIT.KHZ
      const param   = isField ? 'field intensity' : 'RF frequency'
      const center  = Math.round((this.sweepWindow.lo + this.sweepWindow.hi) / 2)
      return `<strong>⭐ Therapeutic Window</strong>
The sweep analysis has found a parameter range where:
  DR_target ≥ 85% — target membrane is at lysis threshold
  DR_healthy &lt; 50% — healthy cells remain below Rev-EP onset

Window: <span class="tip-val">${this.sweepWindow.lo.toFixed(0)}–${this.sweepWindow.hi.toFixed(0)} ${unit}</span>
Center: <span class="tip-val">${center} ${unit}</span>

Clicking this button sets the active ${param} to the
window center, which maximises the selectivity margin —
the distance from both disruption boundaries simultaneously.
This is the operating point with the highest safety buffer
between target lysis and healthy cell injury.`
    },

    tipHealthyBadge(): string {
      const cell = this.store.healthy
      return `<strong>Healthy Reference Cell</strong>
${cell.label}
Radius: ${cell.radius} µm · Membrane: ${cell.membraneThickness} nm
Characteristic frequency fc ≈ ${this.healthyFcSetup}
At quasi-DC this cell's Vm is at its Schwan maximum.`
    },

    tipTargetBadge(): string {
      const cell = this.store.target
      return `<strong>Target Cell</strong>
${cell.label}
Radius: ${cell.radius} µm · Membrane: ${cell.membraneThickness} nm
Characteristic frequency fc ≈ ${this.targetFcSetup}
Larger radius raises Vm and lowers the lysis field threshold.`
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
    onSweepWindowChange(w: { lo: number; hi: number; param: 'field' | 'freq' } | null) {
      this.sweepWindow = w
    },

    snapToWindow() {
      if (!this.sweepWindow) return
      // First click: arm the confirmation state; auto-disarm after 3 s
      if (!this.snapConfirming) {
        this.snapConfirming = true
        this._snapResetTimer = setTimeout(() => {
          this.snapConfirming = false
        }, SNAP_CONFIRM_MS) as unknown as number
        return
      }
      // Second click within 3 s: execute the snap
      clearTimeout(this._snapResetTimer ?? undefined)
      this.snapConfirming = false
      const center = Math.round((this.sweepWindow.lo + this.sweepWindow.hi) / 2)
      if (this.sweepWindow.param === 'field') {
        this.store.setFieldIntensity(center)
      } else {
        this.store.setBroadcastFreqKHz(center)
      }
      broadcastStateSync()
    },

    loadHealthyPreset(preset: CellPreset) {
      this.store.loadPreset('healthy', preset)
      this.healthyPickerOpen = false
      broadcastStateSync()
    },

    loadTargetPreset(preset: CellPreset) {
      this.store.loadPreset('target', preset)
      this.targetPickerOpen = false
      // applyTargetDefaults fires via watcher on currentTargetId — it will call broadcastStateSync
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

    /** Reset field controls and chart mode to scientifically appropriate defaults
     *  for the newly-selected target cell category. */
    applyTargetDefaults() {
      const cat = this.store.targetCellCategory
      const d   = CATEGORY_DEFAULTS[cat]
      // For virus/bacteria: auto-tune frequency to preset's resonant frequency if available
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      // Virus/bacteria: use the preset's resonant frequency if available.
      // Mammalian: use category default (417 kHz) — do not auto-snap.
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
      this.store.setLysisNPulses(10)
      // Always start from a thermally neutral state — clears any lysis/destruction
      this.store.resetTemps()
      this.store.setChartMode((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) ? CHART_MODE.RESONANCE : CHART_MODE.SCHWAN)
      broadcastStateSync()
    },
  },

  beforeUnmount() {
    clearTimeout(this._snapResetTimer ?? undefined)
    if (this._doseTimer !== null) clearInterval(this._doseTimer)
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;  /* justify-content: space-between prevents flex-row() use here */
    padding: 0.5rem 1.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  &__header-left {
    @include flex-row(0.6rem);
    flex-shrink: 0;
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
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 200;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem;
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

  &__snap-bar-btn {
    margin-left: auto;
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
  }

  @keyframes snap-confirm-pulse {
    from { opacity: 0.75; }
    to   { opacity: 1.0; }
  }

  /* ── Chart section (collapsible) ─────────────────────────────── */
  &__chart-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
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

// Tablet — collapse top row into single column
@media (max-width: 900px) {
  .experiment__main { padding: 0.85rem; gap: 0.85rem; }
  .experiment__top  { grid-template-columns: 1fr; }
  .experiment__cells { grid-template-columns: 1fr 1fr; }
}

// Large phone — picker overlay
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

// Phone — single-column cells, full cards
@media (max-width: 540px) {
  .experiment__header        { flex-wrap: wrap; gap: 0.5rem; padding: 0.5rem; }
  .experiment__cell-badges   { flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
  .experiment__cell-badge-row { min-width: 140px; }
  .experiment__cells {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  .experiment__cells > * { min-height: 260px; }
}
</style>
