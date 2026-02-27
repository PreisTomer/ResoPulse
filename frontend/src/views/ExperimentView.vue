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
import { CELL_PRESETS } from '../constants/cellLibrary'
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
    const store = useCellStore()
    const expStore = useExperimentStore()
    connectSocket()
    store.startSession()
    return { store, expStore, socketConnected }
  },

  watch: {
    /** When the active target cell changes, reset all sliders to category-appropriate
     *  defaults and auto-switch chart mode. Mirrors a "new experiment" context. */
    currentTargetId(newId: string, oldId: string) {
      if (newId !== oldId) this.applyTargetDefaults()
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
  <div class="experiment-page">

    <!-- ── Session status bar ───────────────────────────────────── -->
    <div class="session-bar">
      <div class="session-bar-inner">
        <div class="session-bar-left">
          <span class="sb-brand">◎ BioResonance</span>
          <span class="sb-sep">·</span>
          <input
            v-model="expStore.sessionName"
            class="sb-session-name"
            spellcheck="false"
            :title="$t('exp.renameSession')"
          />
        </div>
        <div class="session-bar-right">
          <!-- Chart mode toggle -->
          <div class="sb-mode-toggle" v-tip="$t('exp.chartModeTip')">
            <button
              class="sb-mode-btn"
              :class="{ 'sb-mode-btn--active': store.chartMode === 'schwan' }"
              @click="store.setChartMode('schwan')"
            >{{ $t('slider.ireMode') }}</button>
            <button
              class="sb-mode-btn"
              :class="{ 'sb-mode-btn--active': store.chartMode === 'resonance' }"
              @click="store.setChartMode('resonance')"
            >{{ $t('slider.resonanceMode') }}</button>
          </div>
          <span class="sb-chip sb-chip--medium">
            <span class="sb-dot"></span>
            {{ mediumLabel.toUpperCase() }}
          </span>
          <span class="sb-chip sb-chip--freq">
            {{ store.currentBroadcastFrequency }} {{ $t('slider.kHz') }}
          </span>
          <span class="sb-chip sb-chip--field">
            {{ store.fieldIntensity }} {{ $t('slider.vPerCm') }}
          </span>
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
    </div>

    <!-- ── Main grid ────────────────────────────────────────────── -->
    <div class="exp-grid">

      <!-- Left column: cell cards + sliders + chart -->
      <div class="exp-left">

        <!-- Cell visualisation cards -->
        <div class="cell-cards">
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

        <!-- Field / medium control panel -->
        <FrequencySlider />

        <!-- Chart: IRE/Schwan transmembrane potential or Acoustic Resonance disruption -->
        <FrequencyResponseChart v-if="store.chartMode === 'schwan'" />
        <ResonanceChart v-else />

      </div>

      <!-- Right column: selectivity + experiment log -->
      <div class="exp-right">
        <SelectivityPanel />
        <ExperimentLog />
      </div>

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

/* ── Session bar ─────────────────────────────────────────────── */
.session-bar {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.session-bar-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0.55rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.session-bar-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sb-brand {
  font-family: var(--font-mono);
  font-size: 0.7rem;
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

.session-bar-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
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

.sb-chip--medium    { border-color: rgba(0, 212, 255, 0.3);   color: var(--color-primary); }
.sb-chip--freq      { border-color: rgba(57, 255, 20, 0.25);  color: var(--color-lime); }
.sb-chip--field     { border-color: rgba(251, 191, 36, 0.3);  color: var(--color-amber); }
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

/* ── Main grid ───────────────────────────────────────────────── */
.exp-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 1.25rem;
  padding: 1.5rem 2rem;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  align-items: start;
}

.exp-left {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.exp-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.cell-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  overflow: hidden;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .exp-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .exp-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

@media (max-width: 680px) {
  .session-bar-inner { padding: 0.55rem 1rem; }

  .exp-grid { padding: 0.75rem; gap: 0.85rem; }

  .cell-cards { grid-template-columns: 1fr; }

  .exp-right { grid-template-columns: 1fr; }
}

/* ── Chart mode toggle ───────────────────────────────────────── */
.sb-mode-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-right: 0.2rem;
}

.sb-mode-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.55rem;
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
  border-color: rgba(0, 212, 255, 0.3);
}

.sb-mode-btn + .sb-mode-btn {
  border-left: 1px solid var(--color-border);
}
</style>
