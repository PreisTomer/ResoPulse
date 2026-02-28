<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { connectSocket, socketConnected } from '../services/socket'
import CellCard from '../components/CellCard.vue'
import FrequencySlider from '../components/FrequencySlider.vue'
import FrequencyResponseChart from '../components/FrequencyResponseChart.vue'
import ResonanceChart from '../components/ResonanceChart.vue'
import SelectivityPanel from '../components/SelectivityPanel.vue'
import ExperimentLog from '../components/ExperimentLog.vue'
import { useExperimentStore } from '../stores/experimentStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '../constants/cellLibrary'
import type { CellPreset, CellGroup } from '../constants/cellLibrary'
import { CATEGORY_DEFAULTS } from '../constants/experimentDefaults'

export default defineComponent({
  components: {
    CellCard,
    FrequencySlider,
    FrequencyResponseChart,
    ResonanceChart,
    SelectivityPanel,
    ExperimentLog,
  },

  setup() {
    return {
      store: useCellStore(),
      expStore: useExperimentStore(),
      socketConnected,
      GROUP_COLORS,
      GROUP_LABELS,
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
      targetPickerCategory: 'cancer' as CellGroup,
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
      if (cat === 'mammalian' && this.store.chartMode === 'resonance') {
        this.store.setChartMode('schwan')
      }
    },
  },

  computed: {
    currentTargetId(): string {
      return this.store.target.id
    },

    mediumLabel(): string {
      const key = `slider.mediums.${this.store.medium}`
      const translated = this.$t(key)
      return translated !== key ? translated : this.store.medium
    },

    healthyReferencePresets(): CellPreset[] {
      return CELL_PRESETS.filter((p) => p.group === 'reference')
    },

    targetPresetsForCategory(): CellPreset[] {
      return CELL_PRESETS.filter((p) => p.group === this.targetPickerCategory)
    },

    targetPickerCategories(): CellGroup[] {
      return ['cancer', 'bacteria', 'virus', 'reference']
    },

    healthyFcSetup(): string {
      const fc = this.store.healthyFc
      if (fc >= 1000) return `${(fc / 1000).toFixed(1)} MHz`
      return `${fc.toFixed(0)} kHz`
    },

    targetFcSetup(): string {
      const fc = this.store.targetFc
      if (fc >= 1000) return `${(fc / 1000).toFixed(1)} MHz`
      return `${fc.toFixed(0)} kHz`
    },

    cells() {
      // Resolve label + sublabel from the live store cell (changes when preset loads)
      const cellLabel = (type: 'healthy' | 'target') => {
        return type === 'healthy' ? this.store.healthy.label : this.store.target.label
      }
      const cellSublabel = (type: 'healthy' | 'target') => {
        const cell = type === 'healthy' ? this.store.healthy : this.store.target
        const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
        return preset ? preset.notes : this.$t(`cells.${type}.sublabel`)
      }
      const cellSublabelTip = (type: 'healthy' | 'target') => {
        const cell = type === 'healthy' ? this.store.healthy : this.store.target
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
          buttonText: this.$t('cells.healthy.button'),
          cellData: this.store.healthy,
        },
        {
          id: 'target',
          type: 'target' as const,
          label: cellLabel('target'),
          sublabel: cellSublabel('target'),
          sublabelTip: cellSublabelTip('target'),
          description: this.$t('cells.target.description'),
          buttonText: this.$t('cells.target.button'),
          cellData: this.store.target,
        },
      ]
    },
  },
  methods: {
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
      const freqKHz = (cat === 'virus' || cat === 'bacteria') && t.resonantFreqGHz
        ? t.resonantFreqGHz * 1e6   // GHz → kHz (1 GHz = 1,000,000 kHz)
        : d.freqKHz
      // Start at 50% of disruption threshold for intuitive first contact
      const fieldVcm = (cat === 'virus' || cat === 'bacteria') && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * 0.5
        : d.fieldVcm
      this.store.setFieldIntensity(fieldVcm)
      this.store.setBroadcastFreqKHz(freqKHz)
      this.store.setWaveform(d.waveform)
      this.store.setDutyCycle(d.dutyCycle)
      this.store.setPulseWidthNs(d.pulseWidthNs)
      this.store.setMedium(d.medium)
      // Always start from a thermally neutral state — clears any lysis/destruction
      this.store.resetTemps()
      this.store.setChartMode((cat === 'virus' || cat === 'bacteria') ? 'resonance' : 'schwan')
    },
  },
})
</script>

<template>
  <div class="experiment-page" @click.self="healthyPickerOpen = false; targetPickerOpen = false">

    <!-- ── Combined header bar ───────────────────────────────────── -->
    <div class="exp-header">

      <!-- Far left: brand + session name -->
      <div class="exp-header-left">
        <span class="sb-brand">◎ BioResonance</span>
        <span class="sb-sep">·</span>
        <input
          v-model="expStore.sessionName"
          class="sb-session-name"
          spellcheck="false"
          :title="$t('exp.renameSession')"
        />
      </div>

      <!-- Center: cell selectors -->
      <div class="setup-badges-group">

        <!-- Healthy baseline badge + picker -->
        <div class="setup-cell">
          <button
            class="setup-badge setup-badge--healthy"
            @click="toggleHealthyPicker"
            v-tip="'Healthy baseline · R ' + store.healthy.radius + ' µm · fc ≈ ' + healthyFcSetup"
          >
            <div class="setup-badge-label">HEALTHY BASELINE</div>
            <div class="setup-badge-select-row" :class="{ 'setup-badge-select-row--open': healthyPickerOpen }">
              <span class="setup-badge-selected setup-badge-selected--healthy">{{ store.healthy.label }}</span>
              <span class="setup-badge-caret-icon" :class="{ 'setup-badge-caret-icon--open': healthyPickerOpen }">▼</span>
            </div>
          </button>
          <div v-if="healthyPickerOpen" class="setup-picker">
            <div class="setup-picker-title">Select Healthy Baseline</div>
            <div class="setup-picker-grid">
              <button
                v-for="p in healthyReferencePresets"
                :key="p.presetId"
                class="preset-btn preset-btn--healthy"
                :class="{ 'preset-btn--active': store.healthy.id === p.presetId }"
                @click="loadHealthyPreset(p)"
              >
                <span class="preset-btn-name">{{ p.shortLabel }}</span>
                <span class="preset-btn-sub">{{ p.notes }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Target cell badge + picker -->
        <div class="setup-cell">
          <button
            class="setup-badge setup-badge--target"
            @click="toggleTargetPicker"
            v-tip="'Target cell · R ' + store.target.radius + ' µm · fc ≈ ' + targetFcSetup"
          >
            <div class="setup-badge-label">TARGET CELL</div>
            <div class="setup-badge-select-row" :class="{ 'setup-badge-select-row--open': targetPickerOpen }">
              <span class="setup-badge-selected setup-badge-selected--target">{{ store.target.label }}</span>
              <span class="setup-badge-caret-icon" :class="{ 'setup-badge-caret-icon--open': targetPickerOpen }">▼</span>
            </div>
          </button>
          <div v-if="targetPickerOpen" class="setup-picker">
            <div class="setup-picker-header">
              <div class="setup-picker-title">Select Target Cell</div>
              <div class="setup-picker-tabs">
                <button
                  v-for="cat in targetPickerCategories"
                  :key="cat"
                  class="setup-picker-tab"
                  :class="{ 'setup-picker-tab--active': targetPickerCategory === cat }"
                  :style="targetPickerCategory === cat ? { borderColor: GROUP_COLORS[cat], color: GROUP_COLORS[cat] } : {}"
                  @click.stop="targetPickerCategory = cat"
                >{{ GROUP_LABELS[cat] }}</button>
              </div>
            </div>
            <div class="setup-picker-grid">
              <button
                v-for="p in targetPresetsForCategory"
                :key="p.presetId"
                class="preset-btn"
                :class="{ 'preset-btn--active': store.target.id === p.presetId }"
                :style="store.target.id === p.presetId ? { borderColor: GROUP_COLORS[targetPickerCategory], color: GROUP_COLORS[targetPickerCategory] } : {}"
                @click="loadTargetPreset(p)"
              >
                <span class="preset-btn-name">{{ p.shortLabel }}</span>
                <span class="preset-btn-sub">{{ p.notes }}</span>
              </button>
            </div>
          </div>
        </div>

      </div><!-- /setup-badges-group -->

      <!-- Far right: mode toggle + connection status -->
      <div class="exp-header-right">
        <div class="sb-mode-toggle" v-tip="$t('exp.chartModeTip')">
          <button
            class="sb-mode-btn"
            :class="{ 'sb-mode-btn--active': store.chartMode === 'schwan' }"
            @click="store.setChartMode('schwan')"
          >{{ $t('slider.ireMode') }}</button>
          <button
            class="sb-mode-btn"
            :class="{ 'sb-mode-btn--active': store.chartMode === 'resonance' }"
            :disabled="store.targetCellCategory === 'mammalian'"
            :title="store.targetCellCategory === 'mammalian' ? 'Resonance mode applies only to bacteria and virus targets.' : ''"
            @click="store.setChartMode('resonance')"
          >{{ $t('slider.resonanceMode') }}</button>
        </div>
        <span
          class="sb-chip"
          :class="socketConnected ? 'sb-chip--connected' : 'sb-chip--local'"
          v-tip="socketConnected ? $t('exp.connectedTip') : $t('exp.localTip')"
        >
          <span class="sb-dot" :class="socketConnected ? '' : 'sb-dot--warn'"></span>
          {{ socketConnected ? $t('exp.connected').toUpperCase() : $t('exp.local').toUpperCase() }}
        </span>
      </div>

    </div>

    <!-- ── Main content ──────────────────────────────────────────── -->
    <div class="exp-main">

      <!-- Row 1: Cell cards side-by-side + field controls -->
      <div class="exp-top">
        <div class="exp-cells">
          <CellCard
            v-for="cell in cells"
            :key="cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :sublabel-tip="cell.sublabelTip"
            :description="cell.description"
            :button-text="cell.buttonText"
            :cell-data="cell.cellData"
          />
        </div>
        <div class="exp-field">
          <FrequencySlider />
        </div>
      </div>

      <!-- Row 2: Chart (full width) -->
      <FrequencyResponseChart v-if="store.chartMode === 'schwan'" />
      <ResonanceChart v-else />

      <!-- Row 3: Selectivity (full width) -->
      <SelectivityPanel />

      <!-- Row 4: Log (full width) -->
      <ExperimentLog />

    </div>
  </div>
</template>

<style scoped>
.experiment-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 0 2rem;
}

/* ── Combined header bar ─────────────────────────────────────── */
.exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.5rem 1.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.exp-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.exp-header-right {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-shrink: 0;
}

.sb-brand {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-primary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.sb-sep {
  color: var(--color-border);
  font-size: 0.75rem;
}

.sb-session-name {
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
}
.sb-session-name:focus {
  border-bottom-color: var(--color-primary);
}


.sb-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  padding: 0.18rem 0.55rem;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.sb-chip--local     { border-color: rgba(251, 191, 36, 0.3);  color: var(--color-amber); }
.sb-chip--connected { border-color: rgba(57, 255, 20, 0.35);  color: var(--color-lime); }

.sb-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}
.sb-dot--warn { background: var(--color-amber); animation: none; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.setup-badges-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* ── Cell badge wrappers ─────────────────────────────────────── */
.setup-cell {
  position: relative;
}

.setup-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 0.22rem;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.setup-badge:hover .setup-badge-select-row {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.045);
}

.setup-badge-label {
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.setup-badge-select-row {
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

.setup-badge--healthy .setup-badge-select-row--open {
  border-color: rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.04);
}

.setup-badge--target .setup-badge-select-row--open {
  border-color: rgba(255, 77, 109, 0.5);
  background: rgba(255, 77, 109, 0.04);
}

.setup-badge-selected {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup-badge-selected--healthy { color: var(--color-primary); }
.setup-badge-selected--target  { color: var(--color-danger); }

.setup-badge-caret-icon {
  font-size: 0.58rem;
  color: var(--color-text-muted);
  transition: transform 0.2s;
  opacity: 0.65;
  flex-shrink: 0;
}

.setup-badge-caret-icon--open {
  transform: rotate(180deg);
}


.sb-mode-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.sb-mode-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.sb-mode-btn:hover {
  color: var(--color-text);
  background: rgba(255,255,255,0.05);
}

.sb-mode-btn--active {
  background: rgba(0, 212, 255, 0.12);
  color: var(--color-primary);
}

.sb-mode-btn + .sb-mode-btn {
  border-left: 1px solid var(--color-border);
}

.sb-mode-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
  pointer-events: auto;
}

/* ── Preset pickers ──────────────────────────────────────────── */
.setup-picker {
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

.setup-picker-title {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

.setup-picker-header {
  margin-bottom: 0.6rem;
}

.setup-picker-tabs {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}

.setup-picker-tab {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  padding: 0.15rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.setup-picker-tab:hover {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.2);
}

.setup-picker-tab--active {
  background: rgba(255, 255, 255, 0.04);
}

.setup-picker-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.45rem 0.65rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
}

.preset-btn:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.2);
}

.preset-btn--active {
  background: rgba(0, 212, 255, 0.05);
  border-color: var(--color-primary);
}

.preset-btn--healthy.preset-btn--active {
  border-color: var(--color-primary);
}

.preset-btn-name {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-heading);
  letter-spacing: 0.02em;
}

.preset-btn-sub {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

/* ── Main content ────────────────────────────────────────────── */
.exp-main {
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
.exp-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
  gap: 1.25rem;
  align-items: start;
}

.exp-cells {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  min-width: 0;
}

.exp-field {
  min-width: 0;
}


/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1200px) {
  .exp-main { padding: 1rem 1.5rem; }
  .exp-top {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
    gap: 1rem;
  }
}

@media (max-width: 900px) {
  .exp-main { padding: 1rem; }
  .exp-top { grid-template-columns: 1fr; }
}

@media (max-width: 680px) {
  .exp-header { flex-wrap: wrap; gap: 0.6rem; padding: 0.5rem 1rem; }
  .exp-main { padding: 0.75rem; gap: 0.85rem; }
  .setup-badges-group { flex-wrap: wrap; gap: 0.6rem; }
  .setup-picker { left: 0; right: auto; max-width: none; }
  .setup-badge-select-row { min-width: 140px; max-width: none; }
  .exp-cells { grid-template-columns: 1fr; }
}
</style>
