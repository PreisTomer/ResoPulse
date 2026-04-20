<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment" @click.self="($refs.header as ExperimentHeaderInstance)?.closeAllPickers()">

    <!-- ── Combined header bar ───────────────────────────────────── -->
    <ExperimentHeader ref="header" />

    <!-- ── Main content ──────────────────────────────────────────── -->
    <div class="experiment__main">

      <!-- Persistent outcome strip: TI · DR_T · DR_H · T_ss · Biomod -->
      <OutcomeStrip />

      <!-- Sentinel: observed by IntersectionObserver — must be in normal flow, not inside display:none -->
      <div ref="cellsAnchor" class="experiment__cells-anchor"></div>

      <!-- ── Workspace: cell pair + protocol controls ────────────────── -->
      <div class="experiment__workspace">

        <!-- Cell comparison pair — both always visible side-by-side -->
        <div id="hl-cell-cards" class="experiment__cell-pair">
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

        <!-- Protocol controls -->
        <div id="hl-freq-slider" class="experiment__ws-right">
          <FrequencySlider />
        </div>

      </div>

      <!-- Disruption ratio chart — primary bench-scientist outcome, open by default -->
      <div id="hl-disruption-chart" class="experiment__chart-section experiment__chart-section--primary">
        <AccordionPanel
          :icon="ICON.LYSIS_BOLT"
          :title="$t('drChart.sectionTitle')"
          :subtitle="drChartSubtitle"
          :initial-open="true"
          :border-on-toggle="true"
        >
          <DisruptionChart />
        </AccordionPanel>
      </div>

      <!-- Selectivity panel — ratio, window score, comparison -->
      <SelectivityPanel id="hl-selectivity-panel" />

      <!-- Vm / Resonance chart — mechanism, not outcome -->
      <div id="hl-freq-chart" class="experiment__chart-section">
        <AccordionPanel
          :icon="ICON.WAVE"
          :title="$t('exp.chartSectionTitle')"
          :subtitle="chartModeSubtitle"
          :initial-open="true"
          :border-on-toggle="true"
        >
          <template #badge>
            <span class="experiment__regime-badge" :class="`experiment__regime-badge--${regimeClass}`" v-tip="$t('exp.regimeBadgeTip')">
              {{ regimeBadgeLabel }}
            </span>
          </template>
          <FrequencyResponseChart v-if="!cellStore.isResonanceMode" />
          <ResonanceChart v-else />
        </AccordionPanel>
      </div>

      <!-- Therapeutic Heatmap (full width, collapsible) -->
      <TherapeuticHeatmap />

      <!-- Sweep panel + snap bar -->
      <SweepPanel id="hl-sweep-panel" @window-change="onSweepWindowChange" @open-change="sweepPanelOpen = $event" />
      <SnapBar v-if="sweepWindow" :sweep-window="sweepWindow" />

      <PopulationPanel id="hl-population-panel" @open-change="populationPanelOpen = $event" />

      <!-- Notes bar — session metadata attached to log artefact -->
      <div class="experiment__notes-bar">
        <button
          class="experiment__notes-btn"
          :class="{ 'experiment__notes-btn--active': notesOpen }"
          type="button"
          :title="$t('exp.notesToggleTip')"
          @click="notesOpen = !notesOpen"
        >{{ $t('exp.notesToggle') }}</button>
        <input
          v-show="notesOpen"
          class="experiment__notes-input"
          type="text"
          :placeholder="$t('exp.notesSamplePlaceholder')"
          :value="experimentStore.sampleDescription"
          @input="experimentStore.setSampleDescription(($event.target as HTMLInputElement).value)"
          spellcheck="false"
        />
        <textarea
          v-show="notesOpen"
          class="experiment__notes-textarea"
          :placeholder="$t('exp.notesNotesPlaceholder')"
          :value="experimentStore.sessionNotes"
          @input="experimentStore.setSessionNotes(($event.target as HTMLTextAreaElement).value)"
          rows="1"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Experiment log -->
      <ExperimentLog id="hl-experiment-log" />

    </div>
  </div>

  <!-- Sticky live cell view - suppressed when protocol guide is open (right side conflict) -->
  <StickyCellView
    v-if="showStickySimView && !guideOpen"
    :cells="cells"
    @scroll-to-cells="scrollToCells"
    @full-reset="applyTargetDefaults"
  />

  <!-- AI Protocol Optimizer side tab - always visible, starts collapsed -->
  <AiOptimizerTab />

  <!-- Validation replay overlay - shown during and after a workflow animation -->
  <ReplayOverlay />

</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useUiStore } from '@/stores/uiStore'
import { useReplayStore } from '@/stores/replayStore'
import { useAuthStore } from '@/stores/authStore'

import { connectSocket, broadcastStateSync } from '@/services/socket'

import AccordionPanel from '@/components/AccordionPanel/index.vue'
import CellCard from '@/components/CellCard/index.vue'
import FrequencySlider from '@/components/FrequencySlider/index.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart/index.vue'
import ResonanceChart from '@/components/ResonanceChart/index.vue'
import DisruptionChart from '@/components/DisruptionChart/index.vue'
import SelectivityPanel from '@/components/SelectivityPanel/index.vue'
import TherapeuticHeatmap from '@/components/TherapeuticHeatmap/index.vue'
import SweepPanel from '@/components/SweepPanel/index.vue'
import PopulationPanel from '@/components/PopulationPanel/index.vue'
import ExperimentLog from '@/components/ExperimentLab/ExperimentLog.vue'
import ExperimentHeader from '@/components/ExperimentLab/ExperimentHeader.vue'
import SnapBar from '@/components/ExperimentLab/SnapBar.vue'
import StickyCellView, { type CellCardRow } from '@/components/ExperimentLab/StickyCellView.vue'
import AiOptimizerTab from '@/components/ExperimentLab/AiOptimizerTab.vue'
import OutcomeStrip from '@/components/ExperimentLab/OutcomeStrip.vue'
import ReplayOverlay from '@/components/ValidationWorkflows/ReplayOverlay.vue'

import { computeSAR } from '@/utils/physics'
import { scrollAndHighlight } from '@/utils/highlight'
import { parseShareParam } from '@/utils/shareUrl'

import { CELL_PRESETS } from '@/constants/cellLibrary'


import { CATEGORY_DEFAULTS, INITIAL_RESONANT_FIELD_FRACTION, DEFAULT_LYSIS_N_PULSES, DEFAULT_ORIENTATION_DEG } from '@/constants/experimentDefaults'
import { WF_CW, WF_PULSED, THRESHOLDS } from '@/constants/physics'
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
    SnapBar,
    StickyCellView,
    AiOptimizerTab,
    OutcomeStrip,
    ReplayOverlay,
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
    ...mapStores(useCellStore, useExperimentStore, useUiStore, useReplayStore),

    guideOpen(): boolean {
      return this.uiStore.protocolGuideOpen
    },


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

    regimeBadgeLabel(): string {
      if (this.cellStore.isResonanceMode) {
        return this.$t('exp.regimeResonance')
      }
      const w = this.cellStore.waveform
      if (w === WAVEFORM.CW)     return this.$t('exp.regimeSchwanCw')
      if (w === WAVEFORM.H_FIRE) return this.$t('exp.regimeSchwanHfire')
      return this.$t('exp.regimeSchwanPulsed')
    },

    regimeClass(): string {
      if (this.cellStore.isResonanceMode) return 'resonance'
      if (this.cellStore.waveform === WAVEFORM.CW)     return 'cw'
      if (this.cellStore.waveform === WAVEFORM.H_FIRE) return 'hfire'
      return 'pulsed'
    },

    chartModeSubtitle(): string {
      const f = this.cellStore.currentBroadcastFrequency
      const E = this.cellStore.fieldIntensity
      const fStr = f >= 1000 ? `${(f / 1000).toFixed(1)} MHz` : `${f.toFixed(0)} kHz`
      return `${fStr} · ${E} V/cm`
    },

    drChartSubtitle(): string {
      const t = this.cellStore.targetDisruptionRatio
      const h = this.cellStore.healthyDisruptionRatio
      const verdict = (t >= THRESHOLDS.DISRUPTION_WARN && h < THRESHOLDS.HEALTHY_APPROACHING)
        ? this.$t('drChart.subWindowOpen')
        : this.$t('drChart.subWindowClosed')
      return `T ${(t * 100).toFixed(0)}% · H ${(h * 100).toFixed(0)}% · ${verdict}`
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
      // Resonance mode must be active for virus/bacteria with acoustic params; restore if lost across navigation.
      const hasResonantParams = !!(t.resonantFreqGHz)
      if ((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && hasResonantParams && !this.cellStore.isResonanceMode) {
        this.cellStore.setChartMode(CHART_MODE.RESONANCE)
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
      // Only switch to resonance when the target cell has acoustic resonance parameters.
      // Bacteria without resonantFreqGHz (e.g. EP threshold studies) use the Schwan path.
      const hasResonantParams = !!(t.resonantFreqGHz)
      const targetMode = (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && hasResonantParams
        ? CHART_MODE.RESONANCE
        : CHART_MODE.SCHWAN
      this.cellStore.setChartMode(targetMode)
      broadcastStateSync()
    },
  },

  mounted() {
    // Restore experiment state from a shared URL (?s=<base64 StatePacket>).
    // Must run before sanitizeCategoryParams so the decoded cell pair is in place first.
    const sharedPacket = parseShareParam(window.location.search)
    if (sharedPacket) {
      this.cellStore.handleStatePacket(sharedPacket)
      this.$router.replace({ path: this.$route.path, hash: this.$route.hash })
    }

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

    // Start a validation replay if one was queued from the home-page ValidateSection.
    // Delay 600 ms so all child components are mounted and DOM ids are resolvable.
    if (this.replayStore.hasPendingScript) {
      setTimeout(() => { this.replayStore.startReplay() }, 600)
    }

    // On first visit, open the protocol guide so new users know it exists.
    const authStore = useAuthStore()
    if (!authStore.hasSeenGuide) {
      authStore.markGuideSeen()
      setTimeout(() => { this.uiStore.protocolGuideOpen = true }, 800)
    }
  },

  beforeUnmount() {
    if (this.doseTimer !== null) clearInterval(this.doseTimer)
    if (this._sweepNullTimer !== null) clearTimeout(this._sweepNullTimer)
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

  // ── Main content ─────────────────────────────────────────────────────────────
  &__main {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.52rem 1.25rem 1.5rem;
    max-width: 1800px;
    width: 100%;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
  }

  // ── Regime badge (primary chart header) ──────────────────────────────────────
  &__regime-badge {
    @include badge-pill();
    cursor: help;
    flex-shrink: 0;

    &--pulsed    { @include color-variant(primary); }
    &--cw        { @include color-variant(amber); }
    &--hfire     { @include color-variant(amber, 45%, 12%); }
    &--resonance { @include color-variant(purple); }
  }

  // ── Notes bar ────────────────────────────────────────────────────────────────
  &__notes-bar {
    @include flex-row(0.5rem);
    align-items: center;
    height: 1.8rem;
    overflow: hidden;

    @media (max-width: 768px) { flex-wrap: wrap; height: auto; overflow: visible; }
  }

  &__notes-btn {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    letter-spacing: 0.06em;
    padding: 0.20rem 0.60rem;
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-text) 28%, transparent);
    border-radius: var(--radius);
    color: var(--color-text);
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
    white-space: nowrap;

    &:hover {
      background: color-mix(in srgb, var(--color-text) 12%, transparent);
      border-color: color-mix(in srgb, var(--color-text) 50%, transparent);
    }

    &--active {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
  }

  &__notes-input,
  &__notes-textarea {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: var(--fs-sm);
    padding: 0.25rem 0.6rem;
    outline: none;
    resize: none;
    transition: border-color var(--tr-fast);

    &::placeholder { color: var(--color-text-muted); opacity: var(--op-muted); }
    &:focus { border-color: var(--color-primary); }
  }

  &__notes-input    { flex: 0 0 200px; }
  &__notes-textarea { flex: 1; line-height: 1.4; }

  // ── Workspace: cell pair + protocol controls ─────────────────────────────────
  &__workspace {
    display: grid;
    grid-template-columns: 1fr minmax(390px, 470px);
    gap: 0.9rem;
    align-items: start;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr minmax(340px, 400px);
      gap: 0.75rem;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  // Both cell cards side by side — always visible for direct comparison
  &__cell-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
    min-width: 0;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Right: protocol controls ──────────────────────────────────────────────────
  &__ws-right {
    min-width: 0;
    display: flex;
    flex-direction: column;

    @media (max-width: 860px) {
      grid-column: 1;
    }
  }

  // ── Chart sections ────────────────────────────────────────────────────────────
  &__chart-section {
    @include surface-card(var(--radius));
    overflow: hidden;

    &--primary {
      // Primary chart takes full center height with a slightly stronger border
      border-color: color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
    }
  }
}

// ── Sticky cells sentinel ─────────────────────────────────────────────────────
.experiment__cells-anchor {
  height: 0;
  pointer-events: none;
}

// ── Responsive: 2-col layout shows horizontal QuickPresetStrip above workspace ─
// The left sidebar is hidden at ≤1100px; show the horizontal strip above instead.
// The horizontal strip is rendered as the first child of ws-center via a
// fallback strip shown below the workspace on narrow screens (handled in parent).

// ── Mobile notes bar ─────────────────────────────────────────────────────────
@media (max-width: 768px) {
  .experiment__main { padding: 0.45rem 0.55rem 1rem; gap: 0.55rem; }
}


</style>
