<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment" @click.self="($refs.header as ExperimentHeaderInstance)?.closeAllPickers()">

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
        <div id="hl-cell-cards" class="experiment__cells">
          <CellCard
            v-for="cell in cells"
            :key="cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :sublabel-tip="cell.sublabelTip"
            :description="cell.description"
            :cell-data="cell.cellData"
            @full-reset="applyTargetDefaults"
          />
        </div>
        <div id="hl-freq-slider" class="experiment__field">
          <FrequencySlider />
        </div>
      </div>

      <!-- Row 2: Chart (full width, collapsible) -->
      <div id="hl-freq-chart" class="experiment__chart-section">
        <AccordionPanel
          :icon="ICON.WAVE"
          :title="$t('exp.chartSectionTitle')"
          :subtitle="chartModeLabel"
          :initial-open="true"
          :border-on-toggle="true"
        >
          <FrequencyResponseChart v-if="!cellStore.isResonanceMode" />
          <ResonanceChart v-else />
        </AccordionPanel>
      </div>

      <!-- Row 2b: Disruption ratio chart (full width, collapsible) -->
      <div id="hl-disruption-chart" class="experiment__chart-section">
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
      <SelectivityPanel id="hl-selectivity-panel" />

      <!-- Row 4: Therapeutic Heatmap (full width, collapsible) -->
      <TherapeuticHeatmap />

      <!-- Row 5 & 6: Research analysis tools - sweep + population (collapsible, full width) -->
      <SweepPanel id="hl-sweep-panel" @window-change="onSweepWindowChange" @open-change="sweepPanelOpen = $event" />

      <!-- Therapeutic window snap bar - appears below sweep results, where the user already is -->
      <SnapBar v-if="sweepWindow" :sweep-window="sweepWindow" />

      <PopulationPanel id="hl-population-panel" @open-change="populationPanelOpen = $event" />

      <!-- Row 7: Log (full width) -->
      <ExperimentLog id="hl-experiment-log" />

    </div>
  </div>

  <!-- Sticky live cell view - appears when cells scroll out of viewport -->
  <StickyCellView
    v-if="showStickySimView"
    :cells="cells"
    @scroll-to-cells="scrollToCells"
    @full-reset="applyTargetDefaults"
  />

  <!-- AI Protocol Optimizer side tab - always visible, starts collapsed -->
  <AiOptimizerTab />

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useUiStore } from '@/stores/uiStore'

import { connectSocket, broadcastStateSync } from '@/services/socket'

import AccordionPanel from '@/components/AccordionPanel.vue'
import CellCard from '@/components/CellCard/index.vue'
import FrequencySlider from '@/components/FrequencySlider/index.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart/index.vue'
import ResonanceChart from '@/components/ResonanceChart.vue'
import DisruptionChart from '@/components/DisruptionChart/index.vue'
import SelectivityPanel from '@/components/SelectivityPanel/index.vue'
import TherapeuticHeatmap from '@/components/TherapeuticHeatmap/index.vue'
import SweepPanel from '@/components/SweepPanel/index.vue'
import PopulationPanel from '@/components/PopulationPanel/index.vue'
import ExperimentLog from '@/components/ExperimentLab/ExperimentLog.vue'
import ExperimentHeader from '@/components/ExperimentLab/ExperimentHeader.vue'
import ExperimentNotes from '@/components/ExperimentLab/ExperimentNotes.vue'
import SnapBar from '@/components/ExperimentLab/SnapBar.vue'
import StickyCellView, { type CellCardRow } from '@/components/ExperimentLab/StickyCellView.vue'
import AiOptimizerTab from '@/components/ExperimentLab/AiOptimizerTab.vue'

import { computeSAR } from '@/utils/physics'
import { scrollAndHighlight } from '@/utils/highlight'

import { CELL_PRESETS } from '@/constants/cellLibrary'
import { CATEGORY_DEFAULTS, INITIAL_RESONANT_FIELD_FRACTION, DEFAULT_LYSIS_N_PULSES, DEFAULT_ORIENTATION_DEG } from '@/constants/experimentDefaults'
import { WF_CW, WF_PULSED } from '@/constants/physics'
import { CELL_CATEGORY, CELL_TYPE, CHART_MODE, WAVEFORM } from '@/constants/strings'
import { ICON } from '@/constants/icons'

type ExperimentHeaderInstance = InstanceType<typeof ExperimentHeader>

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
    AiOptimizerTab,
  },

  created() {
    connectSocket()
    this.cellStore.startSession()
    this.doseLastMs = Date.now()
    this.doseTimer = setInterval(() => {
      const now     = Date.now()
      const dtMs    = now - this.doseLastMs
      this.doseLastMs = now
      const sar = computeSAR(
        this.cellStore.target,
        this.cellStore.fieldIntensity,
        this.cellStore.effectiveSigmaE,
        this.cellStore.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED,
      )
      this.experimentStore.addDoseSample(sar, this.cellStore.dutyCycle, dtMs)
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
    currentTargetId(newId: string, oldId: string) {
      if (newId !== oldId) {
        this.applyTargetDefaults()
      }
    },

    currentHealthyId(newId: string, oldId: string) {
      if (newId !== oldId) {
        this.applyTargetDefaults()
      }
    },
    // Resonance mode has no physical meaning for mammalian cells; revert if category changes via param editing.
    'cellStore.targetCellCategory'(cat: string) {
      if (cat === CELL_CATEGORY.MAMMALIAN && this.cellStore.isResonanceMode) {
        this.cellStore.setChartMode(CHART_MODE.SCHWAN)
      }
    },
  },

  computed: {
    ICON() { return ICON },
    CHART_MODE() { return CHART_MODE },
    ...mapStores(useCellStore, useExperimentStore, useUiStore),

    currentTargetId(): string {
      return this.cellStore.target.id
    },

    currentHealthyId(): string {
      return this.cellStore.healthy.id
    },

    chartModeLabel(): string {
      return !this.cellStore.isResonanceMode
        ? this.$t('exp.chartModeSchwan')
        : this.$t('exp.chartModeResonance')
    },

    cells(): CellCardRow[] {
      // Resolve label + sublabel from the live store cell (changes when preset loads)
      const cellLabel = (type: 'healthy' | 'target') => {
        return type === CELL_TYPE.HEALTHY ? this.cellStore.healthy.label : this.cellStore.target.label
      }
      const cellSublabel = (type: 'healthy' | 'target') => {
        const cell = type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
        const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
        return preset ? preset.notes : this.$t(`cells.${type}.sublabel`)
      }
      const cellSublabelTip = (type: 'healthy' | 'target') => {
        const cell = type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
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
          description: this.cellStore.healthy.description ?? this.$t('cells.healthy.description'),
          cellData: this.cellStore.healthy,
        },
        {
          id: 'target',
          type: 'target' as const,
          label: cellLabel('target'),
          sublabel: cellSublabel('target'),
          sublabelTip: cellSublabelTip('target'),
          description: this.cellStore.target.description ?? this.$t('cells.target.description'),
          cellData: this.cellStore.target,
        },
      ]
    },
  },

  methods: {
    scrollToCells() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

    // Sets category-appropriate starting params at mount; does NOT broadcast (peers not ready yet).
    // Sanitizes time-domain params to prevent cross-session physics bugs.
    sanitizeCategoryParams() {
      const cat = this.cellStore.targetCellCategory
      const d   = CATEGORY_DEFAULTS[cat]
      const t   = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }

      const isResonant = cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA
      const freqKHz  = isResonant && t.resonantFreqGHz
        ? t.resonantFreqGHz * 1e6
        : d.freqKHz
      const fieldVcm = isResonant && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * INITIAL_RESONANT_FIELD_FRACTION
        : d.fieldVcm

      this.cellStore.setFieldIntensity(fieldVcm)
      this.cellStore.setBroadcastFreqKHz(freqKHz)
      this.cellStore.setWaveform(d.waveform)
      this.cellStore.setDutyCycle(d.dutyCycle)
      this.cellStore.setPulseWidthNs(d.pulseWidthNs)
      this.cellStore.setMedium(d.medium)
      this.cellStore.setOrientationDeg(DEFAULT_ORIENTATION_DEG)
      this.cellStore.setLysisNPulses(DEFAULT_LYSIS_N_PULSES)
      this.cellStore.resetTemps()
      // Resonance mode is not valid for mammalian cells; revert if persisted incorrectly.
      if (cat === CELL_CATEGORY.MAMMALIAN && this.cellStore.isResonanceMode) {
        this.cellStore.setChartMode(CHART_MODE.SCHWAN)
      }
    },

    applyTargetDefaults() {
      const cat = this.cellStore.targetCellCategory
      const d   = CATEGORY_DEFAULTS[cat]
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const isResonant = cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA
      const freqKHz = isResonant && t.resonantFreqGHz ? t.resonantFreqGHz * 1e6 : d.freqKHz
      const fieldVcm = isResonant && t.resonantThresholdVcm
        ? t.resonantThresholdVcm * INITIAL_RESONANT_FIELD_FRACTION
        : d.fieldVcm
      this.cellStore.setFieldIntensity(fieldVcm)
      this.cellStore.setBroadcastFreqKHz(freqKHz)
      this.cellStore.setWaveform(d.waveform)
      this.cellStore.setDutyCycle(d.dutyCycle)
      this.cellStore.setPulseWidthNs(d.pulseWidthNs)
      this.cellStore.setMedium(d.medium)
      this.cellStore.setOrientationDeg(DEFAULT_ORIENTATION_DEG)
      this.cellStore.setLysisNPulses(DEFAULT_LYSIS_N_PULSES)
      this.cellStore.resetTemps()
      this.cellStore.setChartMode((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) ? CHART_MODE.RESONANCE : CHART_MODE.SCHWAN)
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
        { threshold: 0, rootMargin: '200px 0px 0px 0px' },
      )
      this.cellsObserver.observe(sentinel)
    }

    // Apply any pending lab-link highlight navigated from the Protocol view.
    // Delay lets child components finish rendering before the scroll fires.
    const targetId = this.uiStore.pendingHighlight
    if (targetId) {
      this.uiStore.clearPendingHighlight()
      scrollAndHighlight(targetId, 300)
    }
  },

  beforeUnmount() {
    if (this.doseTimer !== null) clearInterval(this.doseTimer)
    this.cellsObserver?.disconnect()
  },
})
</script>

<style lang="scss" scoped>


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
