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
              </div>
            </div>
            <div class="experiment__cell-picker-grid">
              <button
                v-for="p in targetPresetsForCategory"
                :key="p.presetId"
                class="experiment__preset-btn"
                :class="{ 'experiment__preset-btn--active': store.target.id === p.presetId }"
                :style="store.target.id === p.presetId ? { borderColor: GROUP_COLORS[targetPickerCategory], color: GROUP_COLORS[targetPickerCategory] } : {}"
                @click="loadTargetPreset(p)"
              >
                <span class="experiment__preset-btn-name">{{ p.shortLabel }}</span>
                <span class="experiment__preset-btn-sub">{{ p.notes }}</span>
              </button>
            </div>
          </div>
        </div>

      </div><!-- /experiment__cell-badges -->

      <!-- Far right: mode toggle + connection status -->
      <div class="experiment__header-right">
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

      <!-- Row 2: Chart (full width, collapsible) -->
      <div class="experiment__chart-section">
        <button class="experiment__chart-toggle" @click="chartOpen = !chartOpen">
          <span class="experiment__chart-toggle-left">
            <span class="experiment__chart-toggle-icon">{{ ICON.WAVE }}</span>
            <span class="experiment__chart-toggle-title">{{ $t('exp.chartSectionTitle') }}</span>
            <span class="experiment__chart-toggle-sub">{{ chartModeLabel }}</span>
          </span>
          <span class="experiment__chart-chevron" :class="{ 'experiment__chart-chevron--open': chartOpen }">{{ ICON.CHEVRON }}</span>
        </button>
        <div v-show="chartOpen">
          <FrequencyResponseChart v-if="store.chartMode === CHART_MODE.SCHWAN" />
          <ResonanceChart v-else />
        </div>
      </div>

      <!-- Row 3: Selectivity (full width) -->
      <SelectivityPanel />

      <!-- Row 4 & 5: Research analysis tools — sweep + population (collapsible, full width) -->
      <SweepPanel @window-change="onSweepWindowChange" @open-change="sweepPanelOpen = $event" />

      <!-- Global therapeutic window snap bar — visible only when at least one analysis panel is
           open (so the user can see the effect), and a therapeutic window has been found. -->
      <div v-if="sweepWindow && (sweepPanelOpen || populationPanelOpen)" class="experiment__snap-bar" v-tip="tipSnapBar">
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

      <PopulationPanel @open-change="populationPanelOpen = $event" />

      <!-- Row 6: Log (full width) -->
      <ExperimentLog />

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { connectSocket, socketConnected, broadcastFieldParams } from '@/services/socket'
import CellCard from '@/components/CellCard/index.vue'
import FrequencySlider from '@/components/FrequencySlider/index.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart/index.vue'
import ResonanceChart from '@/components/ResonanceChart/index.vue'
import SelectivityPanel from '@/components/SelectivityPanel/index.vue'
import SweepPanel from '@/components/SweepPanel/index.vue'
import PopulationPanel from '@/components/PopulationPanel/index.vue'
import ExperimentLog from '@/components/ExperimentLog.vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '@/constants/cellLibrary'
import type { CellPreset, CellGroup } from '@/constants/cellLibrary'
import { formatLysisTime } from '@/utils/sliderTooltips'
import { CATEGORY_DEFAULTS } from '@/constants/experimentDefaults'
import { CELL_CATEGORY, CELL_TYPE, CELL_GROUP, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatFreqKHz } from '@/utils/format'

export default defineComponent({
  components: {
    CellCard,
    FrequencySlider,
    FrequencyResponseChart,
    ResonanceChart,
    SelectivityPanel,
    SweepPanel,
    PopulationPanel,
    ExperimentLog,
  },

  setup() {
    return {
      store: useCellStore(),
      expStore: useExperimentStore(),
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
  },

  data() {
    return {
      healthyPickerOpen: false,
      targetPickerOpen: false,
      chartOpen: true,
      targetPickerCategory: CELL_GROUP.CANCER as CellGroup,
      sweepWindow: null as { lo: number; hi: number; param: 'field' | 'freq' } | null,
      sweepPanelOpen: false,
      populationPanelOpen: false,
      snapConfirming: false,
      _snapResetTimer: null as number | null,
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

    tipSnapBar(): string {
      if (!this.sweepWindow) return ''
      const isField = this.sweepWindow.param === 'field'
      const unit    = isField ? 'V/cm' : 'kHz'
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
        }, 3000) as unknown as number
        return
      }
      // Second click within 3 s: execute the snap
      clearTimeout(this._snapResetTimer ?? undefined)
      this.snapConfirming = false
      const center = Math.round((this.sweepWindow.lo + this.sweepWindow.hi) / 2)
      if (this.sweepWindow.param === 'field') {
        this.store.setFieldIntensity(center)
        broadcastFieldParams(this.store.currentBroadcastFrequency, center, this.store.medium)
      } else {
        this.store.setBroadcastFreqKHz(center)
        broadcastFieldParams(center, this.store.fieldIntensity, this.store.medium)
      }
    },

    loadHealthyPreset(preset: CellPreset) {
      this.store.loadPreset('healthy', preset)
      this.healthyPickerOpen = false
    },

    loadTargetPreset(preset: CellPreset) {
      this.store.loadPreset('target', preset)
      this.targetPickerOpen = false
      // applyTargetDefaults fires via watcher on currentTargetId
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
      const freqKHz = (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantFreqGHz
        ? t.resonantFreqGHz * 1e6   // GHz → kHz (1 GHz = 1,000,000 kHz)
        : d.freqKHz
      // Start at 50% of disruption threshold for intuitive first contact
      const fieldVcm = (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * 0.5
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
      // Sync backend — ensures socket subscribers see the new field parameters immediately
      broadcastFieldParams(freqKHz, fieldVcm, d.medium)
    },
  },

  beforeUnmount() {
    clearTimeout(this._snapResetTimer ?? undefined)
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
    font-size: 0.58rem;
    color: var(--color-text-muted);
    transition: transform 0.2s;
    opacity: 0.65;
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

  &__chart-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    padding: 0.6rem 1rem;
    cursor: pointer;
    gap: 0.5rem;

    &:hover .experiment__chart-toggle-title { color: var(--color-primary); }
  }

  &__chart-toggle-left {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  &__chart-toggle-icon {
    font-size: 0.9rem;
    color: var(--color-primary);
    opacity: 0.7;
    flex-shrink: 0;
  }

  &__chart-toggle-title {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text);
    flex-shrink: 0;
    transition: color 0.15s;
  }

  &__chart-toggle-sub {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.65;
  }

  &__chart-chevron {
    font-size: 1rem;
    color: var(--color-text-muted);
    opacity: 0.5;
    flex-shrink: 0;
    transition: transform 0.2s;

    &--open { transform: rotate(90deg); }
  }
}

/* Compound modifier: healthy preset btn that is also active */
.experiment__preset-btn--healthy.experiment__preset-btn--active {
  border-color: var(--color-primary);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

// Media queries → _responsive.scss
</style>
