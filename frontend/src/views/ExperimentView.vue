<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment" @click.self="($refs.header as any)?.closeAllPickers()">

    <!-- ── Combined header bar ───────────────────────────────────── -->
    <ExperimentHeader
      ref="header"
      :notes-open="notesOpen"
      @notes-toggle="notesOpen = !notesOpen"
    />

    <!-- ── Session metadata panel (expands below header) ─────────── -->
    <ExperimentNotes :open="notesOpen" />

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
      <SnapBar v-if="sweepWindow" :sweep-window="sweepWindow" />

      <PopulationPanel @open-change="populationPanelOpen = $event" />

      <!-- Row 7: Log (full width) -->
      <ExperimentLog />

    </div>
  </div>

  <!-- Sticky live cell view - appears when cells scroll out of viewport -->
  <StickyCellView
    v-if="showStickySimView"
    :cells="cells"
    @scroll-to-cells="scrollToCells"
  />

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { connectSocket, broadcastStateSync } from '@/services/socket'
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
import ExperimentHeader from '@/components/ExperimentLab/ExperimentHeader.vue'
import ExperimentNotes from '@/components/ExperimentLab/ExperimentNotes.vue'
import SnapBar from '@/components/ExperimentLab/SnapBar.vue'
import StickyCellView from '@/components/ExperimentLab/StickyCellView.vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import { computeSAR } from '@/utils/physics'
import { CATEGORY_DEFAULTS, INITIAL_RESONANT_FIELD_FRACTION, DEFAULT_LYSIS_N_PULSES } from '@/constants/experimentDefaults'
import { CELL_CATEGORY, CELL_TYPE, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'

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
    ExperimentHeader,
    ExperimentNotes,
    SnapBar,
    StickyCellView,
  },

  setup() {
    return {
      store: useCellStore(),
      expStore: useExperimentStore(),
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
      sweepWindow: null as { lo: number; hi: number; param: 'field' | 'freq' } | null,
      sweepPanelOpen: false,
      populationPanelOpen: false,
      _sweepNullTimer:  null as ReturnType<typeof setTimeout> | null,
      notesOpen: false,
      doseTimer: null as ReturnType<typeof setInterval> | null,
      doseLastMs: 0,
      showStickySimView: false,
      cellsObserver: null as IntersectionObserver | null,
    }
  },

  watch: {
    /** When the active target cell changes, reset all sliders to category-appropriate
     *  defaults and auto-switch chart mode. Mirrors a "new experiment" context. */
    currentTargetId(newId: string, oldId: string) {
      if (newId !== oldId) {
        this.applyTargetDefaults()
      }
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

    chartModeLabel(): string {
      return this.store.chartMode === CHART_MODE.SCHWAN
        ? this.$t('exp.chartModeSchwan')
        : this.$t('exp.chartModeResonance')
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
          description: this.store.healthy.description ?? this.$t('cells.healthy.description'),
          cellData: this.store.healthy,
        },
        {
          id: 'target',
          type: 'target' as const,
          label: cellLabel('target'),
          sublabel: cellSublabel('target'),
          sublabelTip: cellSublabelTip('target'),
          description: this.store.target.description ?? this.$t('cells.target.description'),
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

  /* ── Chart section (collapsible) ─────────────────────────────── */
  &__chart-section {
    @include surface-card(var(--radius));
    overflow: hidden;
  }
}

// ── Sticky cells sentinel ──────────────────────────────────────────────────────
.experiment__cells-anchor {
  // Zero-height sentinel - stays in normal flow so IntersectionObserver can track
  // when the cell cards area exits the viewport.
  height: 0;
  grid-column: 1 / -1;
  pointer-events: none;
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

// Large phone
@media (max-width: 768px) {
  .experiment__main { padding: 0.65rem; gap: 0.7rem; }
}

// Phone - single-column cells, full cards
@media (max-width: 540px) {
  .experiment__cells {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  .experiment__cells > * { min-height: 260px; }
}
</style>
