<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <SideTabPanel
    top="160px"
    side="left"
    :panel-width="320"
    :tab-height="96"
    :scale="1"
    :z-index="149"
    :default-collapsed="true"
    :intro-animation="true"
    tab-align="flex-start"
    :expand-tip="$t('ai.tabExpandTip')"
    :collapse-tip="$t('ai.tabCollapseTip')"
  >
    <!-- ── Tab icon: neural-network SVG + "AI" label ─────────────── -->
    <template #tab-icon="{ collapsed }">
      <svg
        class="ai-tab__icon"
        :class="{ 'ai-tab__icon--active': !collapsed }"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Input layer -->
        <circle cx="3"  cy="5"  r="1.5" fill="currentColor" />
        <circle cx="3"  cy="10" r="1.5" fill="currentColor" />
        <circle cx="3"  cy="15" r="1.5" fill="currentColor" />
        <!-- Hidden layer -->
        <circle cx="10" cy="7"  r="1.8" fill="currentColor" opacity="0.85" />
        <circle cx="10" cy="13" r="1.8" fill="currentColor" opacity="0.85" />
        <!-- Output node -->
        <circle cx="17" cy="10" r="2.2" fill="currentColor" />
        <!-- Connections: input → hidden -->
        <line x1="4.5" y1="5"  x2="8.2" y2="7"  stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="4.5" y1="10" x2="8.2" y2="7"  stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="4.5" y1="15" x2="8.2" y2="7"  stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="4.5" y1="5"  x2="8.2" y2="13" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="4.5" y1="10" x2="8.2" y2="13" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="4.5" y1="15" x2="8.2" y2="13" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <!-- Connections: hidden → output -->
        <line x1="11.8" y1="7"  x2="14.8" y2="10" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <line x1="11.8" y1="13" x2="14.8" y2="10" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
      </svg>
      <span class="ai-tab__label">AI</span>
    </template>

    <!-- ── Panel content ─────────────────────────────────────────── -->
    <template #panel>
      <div class="ai-tab__panel">

        <!-- Panel header -->
        <div class="ai-tab__header">
          <span class="ai-tab__title">{{ $t('ai.panelTitle') }}</span>
          <span class="ai-tab__subtitle">{{ panelSubtitle }}</span>
        </div>

        <!-- Consent gate -->
        <div v-if="!expStore.aiConsentGiven" class="ai-tab__consent">
          <div class="ai-tab__consent-title">{{ $t('ai.consentGateTitle') }}</div>
          <p class="ai-tab__consent-body">{{ $t('ai.consentGateBody') }}</p>
          <label class="ai-tab__consent-toggle">
            <input
              type="checkbox"
              :checked="expStore.aiConsentGiven"
              @change="expStore.setAiConsent(($event.target as HTMLInputElement).checked)"
            />
            <span>{{ $t('ai.consentToggleLabel') }}</span>
          </label>
        </div>

        <!-- Main panel — consent granted -->
        <template v-else>

          <!-- Model status bar -->
          <div class="ai-tab__status-bar">
            <div class="ai-tab__status-left">
              <span
                class="ai-tab__status-badge"
                :class="statusBadgeClass"
                v-tip="$t('ai.tipTrainingSamples')"
              >{{ statusBadgeLabel }}</span>
              <span
                class="ai-tab__samples"
                v-tip="$t('ai.tipTrainingSamples')"
              >{{ trainingSamplesDisplay }}</span>
            </div>
            <button
              class="ai-tab__retrain-btn"
              :class="{ 'ai-tab__retrain-btn--running': isRetraining }"
              :disabled="isRetraining || modelTrainingSamples < 1"
              v-tip="$t('ai.tipRetrainBtn')"
              @click="triggerRetrain"
            >
              {{ isRetraining ? $t('ai.retrainBtnRunning') : $t('ai.retrainBtn') }}
            </button>
          </div>

          <!-- Retrain feedback -->
          <div v-if="retrainMessage" class="ai-tab__retrain-msg" :class="retrainMsgClass">
            {{ retrainMessage }}
          </div>

          <!-- Offline note -->
          <div v-if="showOfflineNote" class="ai-tab__error-note">
            {{ ICON.WARNING }} {{ $t('ai.errorNote') }}
          </div>

          <!-- Low-confidence warning -->
          <div v-if="showLowConfidenceWarning" class="ai-tab__warn-note">
            {{ ICON.WARNING }} {{ $t('ai.lowConfidenceWarning', { conf: confidencePct }) }}
          </div>

          <!-- Optimize button -->
          <div class="ai-tab__actions">
            <button
              class="ai-tab__optimize-btn"
              :class="{ 'ai-tab__optimize-btn--loading': aiStore.isLoading }"
              :disabled="aiStore.isLoading"
              v-tip="$t('ai.tipOptimizeBtn')"
              @click="runOptimize"
            >
              <svg class="ai-tab__btn-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="3"  cy="5"  r="1.3" fill="currentColor" />
                <circle cx="3"  cy="10" r="1.3" fill="currentColor" />
                <circle cx="3"  cy="15" r="1.3" fill="currentColor" />
                <circle cx="10" cy="7"  r="1.5" fill="currentColor" opacity="0.85" />
                <circle cx="10" cy="13" r="1.5" fill="currentColor" opacity="0.85" />
                <circle cx="17" cy="10" r="1.8" fill="currentColor" />
                <line x1="4.3" y1="5"  x2="8.5" y2="7"  stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="4.3" y1="10" x2="8.5" y2="7"  stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="4.3" y1="15" x2="8.5" y2="7"  stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="4.3" y1="5"  x2="8.5" y2="13" stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="4.3" y1="10" x2="8.5" y2="13" stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="4.3" y1="15" x2="8.5" y2="13" stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="11.5" y1="7"  x2="15.2" y2="10" stroke="currentColor" stroke-width="0.55" opacity="0.5" />
                <line x1="11.5" y1="13" x2="15.2" y2="10" stroke="currentColor" stroke-width="0.55" opacity="0.5" />
              </svg>
              <span>{{ aiStore.isLoading ? $t('ai.panelSubtitleLoading') : $t('ai.optimizeBtn') }}</span>
            </button>
            <button
              v-if="aiStore.hasResult"
              class="ai-tab__clear-btn"
              @click="aiStore.clearResult()"
            >{{ $t('ai.clearBtn') }}</button>
          </div>

          <!-- Result card -->
          <div v-if="aiStore.hasResult && aiStore.result" class="ai-tab__result">

            <!-- Source + confidence badges -->
            <div class="ai-tab__badge-row">
              <span
                class="ai-tab__source-badge"
                :class="aiStore.isPhysicsBaseline ? 'ai-tab__source-badge--physics' : 'ai-tab__source-badge--ml'"
                v-tip="aiStore.isPhysicsBaseline ? $t('ai.tipPhysicsBaseline') : $t('ai.tipConfidence')"
              >
                {{ aiStore.isPhysicsBaseline ? $t('ai.physicsBaselineBadge') : $t('ai.mlBadge') }}
              </span>
              <span
                class="ai-tab__confidence"
                :class="confidenceClass"
                v-tip="$t('ai.tipConfidence')"
              >
                {{ $t('ai.confidenceLabel', { conf: confidencePct }) }}
              </span>
              <span v-if="aiStore.suggestionApplied" class="ai-tab__applied-badge">
                {{ ICON.CHECK }} {{ $t('ai.appliedBadge') }}
              </span>
            </div>

            <!-- Suggested params -->
            <div v-if="aiStore.result.suggestion" class="ai-tab__suggestion">
              <div class="ai-tab__section-label">{{ $t('ai.suggestedParamsLabel') }}</div>
              <div class="ai-tab__params-grid">
                <span class="ai-tab__param-key">{{ $t('slider.freq') }}</span>
                <span class="ai-tab__param-val">{{ formatFreqKHz(aiStore.result.suggestion.freqKHz) }}</span>
                <span class="ai-tab__param-key">{{ $t('slider.field') }}</span>
                <span class="ai-tab__param-val">{{ aiStore.result.suggestion.fieldVcm }} V/cm</span>
                <span class="ai-tab__param-key">{{ $t('slider.dutyCycle') }}</span>
                <span class="ai-tab__param-val">{{ formatDutyCycle(aiStore.result.suggestion.dutyCycle) }}</span>
                <span class="ai-tab__param-key">{{ $t('slider.pulseWidth') }}</span>
                <span class="ai-tab__param-val">{{ aiStore.result.suggestion.pulseWidthNs }} ns</span>
                <span class="ai-tab__param-key">{{ $t('slider.waveform') }}</span>
                <span class="ai-tab__param-val ai-tab__param-val--upper">{{ aiStore.result.suggestion.waveform }}</span>
              </div>
            </div>

            <!-- Predicted outcomes -->
            <div class="ai-tab__prediction">
              <div class="ai-tab__section-label">{{ $t('ai.predictedOutcomeLabel') }}</div>
              <div class="ai-tab__outcome-row">
                <span class="ai-tab__outcome-item">
                  <span class="ai-tab__outcome-key">{{ $t('ai.predictedTargetDr') }}</span>
                  <span class="ai-tab__outcome-val ai-tab__outcome-val--target">
                    {{ (aiStore.result.predictedTargetDr * 100).toFixed(0) }}%
                  </span>
                </span>
                <span class="ai-tab__outcome-item">
                  <span class="ai-tab__outcome-key">{{ $t('ai.predictedHealthyDr') }}</span>
                  <span class="ai-tab__outcome-val ai-tab__outcome-val--healthy">
                    {{ (aiStore.result.predictedHealthyDr * 100).toFixed(0) }}%
                  </span>
                </span>
                <span class="ai-tab__outcome-item">
                  <span class="ai-tab__outcome-key">{{ $t('ai.predictedTi') }}</span>
                  <span class="ai-tab__outcome-val" :class="tiClass">
                    x{{ aiStore.result.predictedTi.toFixed(2) }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Apply button -->
            <div class="ai-tab__apply-row">
              <button
                class="ai-tab__apply-btn"
                :class="{ 'ai-tab__apply-btn--applied': aiStore.suggestionApplied }"
                :disabled="aiStore.suggestionApplied"
                v-tip="$t('ai.tipApplyBtn')"
                @click="applyAndBroadcast"
              >
                {{ aiStore.suggestionApplied ? ($t('ai.appliedBadge') + ' ' + ICON.CHECK) : $t('ai.applyBtn') }}
              </button>
            </div>

            <!-- Explanation -->
            <div v-if="aiStore.result.explanation" class="ai-tab__explanation">
              <span class="ai-tab__explanation-label">{{ $t('ai.explanationLabel') }}:</span>
              <span class="ai-tab__explanation-text">{{ aiStore.result.explanation }}</span>
            </div>

            <!-- Feature importance (collapsible) -->
            <div v-if="hasFeatureImportance" class="ai-tab__importance">
              <button class="ai-tab__importance-toggle" @click="aiStore.toggleImportance()">
                {{ aiStore.importanceExpanded ? $t('ai.whyBtnCollapse') : $t('ai.whyBtn') }}
                <span
                  class="ai-tab__importance-chevron"
                  :class="{ 'ai-tab__importance-chevron--open': aiStore.importanceExpanded }"
                >{{ ICON.CHEVRON }}</span>
              </button>
              <div v-if="aiStore.importanceExpanded" class="ai-tab__importance-body">
                <div class="ai-tab__importance-title">{{ $t('ai.featureImportanceTitle') }}</div>
                <div
                  v-for="[key, val] in sortedImportance"
                  :key="key"
                  class="ai-tab__importance-row"
                >
                  <span class="ai-tab__importance-key">{{ formatFeatureKey(key) }}</span>
                  <div class="ai-tab__importance-bar-wrap">
                    <div class="ai-tab__importance-bar" :style="{ width: (val * 100).toFixed(1) + '%' }" />
                  </div>
                  <span class="ai-tab__importance-pct">{{ (val * 100).toFixed(1) }}%</span>
                </div>
              </div>
            </div>

          </div><!-- /result -->

          <!-- No-data note -->
          <div v-if="aiStore.isPhysicsBaseline && !aiStore.isLoading && !aiStore.hasResult" class="ai-tab__no-data">
            {{ $t('ai.noDataNote') }}
          </div>

        </template><!-- /consent granted -->
      </div><!-- /panel -->
    </template>
  </SideTabPanel>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import SideTabPanel from '@/components/ExperimentLab/SideTabPanel.vue'
import { useAiStore } from '@/stores/aiStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { requestAiOptimization, broadcastStateSync } from '@/services/socket'
import { formatFreqKHz } from '@/utils/format'
import { ICON } from '@/constants/icons'
import { THRESHOLDS } from '@/constants/physics'

export default defineComponent({
  name: 'AiOptimizerTab',

  components: { SideTabPanel },

  setup() {
    return {
      aiStore:  useAiStore(),
      expStore: useExperimentStore(),
      ICON,
    }
  },

  data() {
    return {
      showOfflineNote:      false,
      modelTrainingSamples: 0,
      isRetraining:         false,
      retrainMessage:       '' as string,
      retrainMsgClass:      '' as string,
      _healthPollTimer:     null as ReturnType<typeof setInterval> | null,
    }
  },

  mounted() {
    this.fetchAiHealth()
    this._healthPollTimer = setInterval(this.fetchAiHealth, 30_000)
  },

  beforeUnmount() {
    if (this._healthPollTimer) clearInterval(this._healthPollTimer)
  },

  computed: {
    panelSubtitle(): string {
      if (this.aiStore.isLoading) return this.$t('ai.panelSubtitleLoading')
      if (this.aiStore.hasResult) return this.$t('ai.panelSubtitleResult', { conf: this.confidencePct })
      return this.$t('ai.panelSubtitleReady')
    },

    confidencePct(): string {
      return (this.aiStore.confidence * 100).toFixed(0) + '%'
    },

    confidenceClass(): string {
      const c = this.aiStore.confidence
      if (c >= 0.7) return 'ai-tab__confidence--high'
      if (c >= 0.5) return 'ai-tab__confidence--medium'
      return 'ai-tab__confidence--low'
    },

    tiClass(): string {
      const ti = this.aiStore.result?.predictedTi ?? 0
      if (ti >= THRESHOLDS.SEL_STRONG)   return 'ai-tab__outcome-val--ti-strong'
      if (ti >= THRESHOLDS.SEL_MARGINAL) return 'ai-tab__outcome-val--ti-marginal'
      return 'ai-tab__outcome-val--ti-weak'
    },

    hasFeatureImportance(): boolean {
      const fi = this.aiStore.result?.featureImportance
      return !!fi && Object.keys(fi).length > 0
    },

    sortedImportance(): [string, number][] {
      const fi = this.aiStore.result?.featureImportance
      if (!fi) return []
      return Object.entries(fi).sort(([, a], [, b]) => b - a).slice(0, 8)
    },

    statusBadgeLabel(): string {
      if (this.modelTrainingSamples === 0)  return this.$t('ai.serviceOfflineBadge')
      if (this.modelTrainingSamples >= 20)  return this.$t('ai.modelReadyBadge')
      return this.$t('ai.modelNotReadyBadge')
    },

    statusBadgeClass(): string {
      if (this.modelTrainingSamples === 0)  return 'ai-tab__status-badge--offline'
      if (this.modelTrainingSamples >= 20)  return 'ai-tab__status-badge--ready'
      return 'ai-tab__status-badge--pending'
    },

    trainingSamplesDisplay(): string {
      if (this.modelTrainingSamples < 20) {
        return this.$t('ai.trainingSamplesNeeded', { n: this.modelTrainingSamples })
      }
      return this.$t('ai.trainingSamplesCount', { n: this.modelTrainingSamples })
    },

    showLowConfidenceWarning(): boolean {
      return this.aiStore.hasResult && this.aiStore.confidence < 0.55
    },
  },

  methods: {
    runOptimize() {
      this.showOfflineNote = false
      const requestId = this.aiStore.startRequest()
      requestAiOptimization(requestId, (result) => {
        this.aiStore.receiveResult(result)
      })
      setTimeout(() => {
        if (this.aiStore.isLoading && this.aiStore.pendingRequestId === requestId) {
          this.aiStore.cancelRequest()
          this.showOfflineNote = true
        }
      }, 9000)
    },

    applyAndBroadcast() {
      this.aiStore.applySuggestion()
      broadcastStateSync()
    },

    formatFreqKHz,

    formatDutyCycle(dc: number): string {
      if (dc >= 0.01) return (dc * 100).toFixed(1) + '%'
      return dc.toExponential(1)
    },

    async fetchAiHealth() {
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
        const res  = await fetch(`${backendUrl}/ai/health`, { signal: AbortSignal.timeout(5_000) })
        const data = await res.json() as { trainingSamples?: number }
        this.modelTrainingSamples = data.trainingSamples ?? 0
      } catch {
        // service offline — keep existing count
      }
    },

    async triggerRetrain() {
      this.isRetraining   = true
      this.retrainMessage = ''
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
        const res  = await fetch(`${backendUrl}/ai/retrain`, {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
        })
        const data = await res.json() as { samplesUsed?: number; status?: string }
        if (data.samplesUsed && data.samplesUsed > 0) {
          this.retrainMessage       = this.$t('ai.retrainSuccess', { n: data.samplesUsed })
          this.retrainMsgClass      = 'ai-tab__retrain-msg--ok'
          this.modelTrainingSamples = data.samplesUsed
        } else {
          this.retrainMessage  = this.$t('ai.retrainNoData')
          this.retrainMsgClass = 'ai-tab__retrain-msg--warn'
        }
      } catch {
        this.retrainMessage  = this.$t('ai.errorNote')
        this.retrainMsgClass = 'ai-tab__retrain-msg--error'
      } finally {
        this.isRetraining = false
        setTimeout(() => { this.retrainMessage = '' }, 5_000)
      }
    },

    formatFeatureKey(key: string): string {
      const labels: Record<string, string> = {
        freq_khz:         'Frequency',
        field_vcm:        'Field intensity',
        duty_cycle:       'Duty cycle',
        pulse_width_ns:   'Pulse width',
        target_tau_ns:    'Target tau',
        healthy_tau_ns:   'Healthy tau',
        target_fc_khz:    'Target fc',
        healthy_fc_khz:   'Healthy fc',
        target_radius_um: 'Target radius',
        sigma_e:          'Sigma e (medium)',
        orientation_deg:  'Orientation angle',
      }
      return labels[key] ?? key
    },
  },
})
</script>

<style lang="scss" scoped>
// ── Tab icon + label ────────────────────────────────────────────────────────
.ai-tab {
  &__icon {
    width: 18px;
    height: 18px;
    color: var(--color-primary);
    opacity: var(--op-dim);
    transition: opacity var(--tr-fast), color var(--tr-fast);
    flex-shrink: 0;

    &--active {
      opacity: 1;
    }
  }

  &__label {
    @include mono-upper(0.6rem);
    color: var(--color-primary);
    opacity: var(--op-muted);
    letter-spacing: 0.12em;
    line-height: 1;
  }

  // ── Panel shell ────────────────────────────────────────────────
  &__panel {
    @include flex-col(0.85rem);
    padding: 0.85rem 0.9rem 1rem;
  }

  // ── Header ─────────────────────────────────────────────────────
  &__header {
    @include flex-col(0.2rem);
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    @include mono-upper(var(--fs-xs));
    color: var(--color-primary);
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  &__subtitle {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  // ── Consent gate ───────────────────────────────────────────────
  &__consent {
    @include info-panel(
      color-mix(in srgb, var(--color-primary) 6%, transparent),
      color-mix(in srgb, var(--color-primary) 25%, transparent)
    );
    @include flex-col(0.6rem);
    padding: 0.75rem;
    border-radius: var(--radius);
  }

  &__consent-title {
    @include mono-upper(var(--fs-xs));
    color: var(--color-primary);
    font-weight: 700;
  }

  &__consent-body {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  &__consent-toggle {
    @include flex-row(0.5rem);
    font-size: var(--fs-md);
    color: var(--color-text);
    cursor: pointer;

    input[type="checkbox"] { cursor: pointer; }
  }

  // ── Status bar ─────────────────────────────────────────────────
  &__status-bar {
    @include flex-between();
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  &__status-left {
    @include flex-row(0.45rem);
    flex-wrap: wrap;
  }

  &__status-badge {
    @include badge-pill(0.12rem 0.45rem, 3px);
    font-size: var(--fs-xxs);

    &--ready   { color: var(--color-lime);    border-color: color-mix(in srgb, var(--color-lime)    30%, transparent); background: color-mix(in srgb, var(--color-lime)    8%, transparent); }
    &--pending { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber)   30%, transparent); background: color-mix(in srgb, var(--color-amber)   8%, transparent); }
    &--offline { color: var(--color-text-muted); border-color: var(--color-border); background: transparent; }
  }

  &__samples {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__retrain-btn {
    padding: 0.28rem 0.6rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
    &--running { animation: ai-pulse 1.4s ease-in-out infinite; }
  }

  // ── Feedback messages ──────────────────────────────────────────
  &__retrain-msg {
    font-size: var(--fs-xs);
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid;

    &--ok    { color: var(--color-lime);    border-color: color-mix(in srgb, var(--color-lime)    30%, transparent); background: color-mix(in srgb, var(--color-lime)    7%, transparent); }
    &--warn  { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber)   30%, transparent); background: color-mix(in srgb, var(--color-amber)   7%, transparent); }
    &--error { color: var(--color-danger);  border-color: color-mix(in srgb, var(--color-danger)  30%, transparent); background: color-mix(in srgb, var(--color-danger)  7%, transparent); }
  }

  &__error-note {
    font-size: var(--fs-sm);
    color: var(--color-amber);
    padding: 0.4rem 0.6rem;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 28%, transparent);
    border-radius: var(--radius);
  }

  &__warn-note {
    font-size: var(--fs-sm);
    color: var(--color-amber);
    opacity: var(--op-dim);
    padding: 0.35rem 0.6rem;
    background: color-mix(in srgb, var(--color-amber) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 20%, transparent);
    border-radius: var(--radius);
  }

  // ── Actions row ────────────────────────────────────────────────
  &__actions { @include flex-row(0.6rem); flex-wrap: wrap; }

  &__optimize-btn {
    @include flex-row(0.45rem);
    padding: 0.42rem 0.9rem;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    cursor: pointer;
    flex: 1;
    justify-content: center;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 20%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }
    &--loading { animation: ai-pulse 1.4s ease-in-out infinite; }
  }

  &__btn-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &__clear-btn {
    padding: 0.35rem 0.7rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-danger); color: var(--color-danger); }
  }

  // ── Result card ────────────────────────────────────────────────
  &__result {
    @include flex-col(0.75rem);
    padding: 0.7rem;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__badge-row { @include flex-row(0.45rem); flex-wrap: wrap; }

  &__source-badge {
    @include badge-pill(0.15rem 0.5rem, 3px);
    font-size: var(--fs-xxs);

    &--physics {
      color: var(--color-amber);
      border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);
      background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    }
    &--ml {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
      background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    }
  }

  &__confidence {
    @include mono-upper(var(--fs-xxs));

    &--high   { color: var(--color-lime); }
    &--medium { color: var(--color-amber); }
    &--low    { color: var(--color-danger); opacity: var(--op-dim); }
  }

  &__applied-badge {
    @include badge-pill(0.12rem 0.4rem, 3px);
    font-size: var(--fs-xxs);
    color: var(--color-lime);
    border-color: color-mix(in srgb, var(--color-lime) 30%, transparent);
    background: color-mix(in srgb, var(--color-lime) 8%, transparent);
  }

  // ── Section label ──────────────────────────────────────────────
  &__section-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    margin-bottom: 0.3rem;
  }

  // ── Params grid ────────────────────────────────────────────────
  &__params-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 0.5rem;
  }

  &__param-key {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    font-family: var(--font-mono);
    align-self: center;
  }

  &__param-val {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-primary);
    font-weight: 600;
    align-self: center;

    &--upper { text-transform: uppercase; }
  }

  // ── Outcomes ───────────────────────────────────────────────────
  &__outcome-row {
    @include flex-row(0.5rem);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__outcome-item {
    @include flex-col(0.15rem);
    flex: 1;
    min-width: 60px;
  }

  &__outcome-key {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__outcome-val {
    font-size: var(--fs-md);
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-text);

    &--target     { color: var(--color-danger); }
    &--healthy    { color: var(--color-lime); }
    &--ti-strong  { color: var(--color-lime); }
    &--ti-marginal{ color: var(--color-amber); }
    &--ti-weak    { color: var(--color-text-muted); }
  }

  // ── Apply button ───────────────────────────────────────────────
  &__apply-row { display: flex; }

  &__apply-btn {
    flex: 1;
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--color-lime) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-lime) 40%, transparent);
    border-radius: var(--radius);
    color: var(--color-lime);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-lime) 22%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }

    &--applied {
      background: color-mix(in srgb, var(--color-lime) 8%, transparent);
      color: var(--color-lime);
      opacity: var(--op-partial);
    }
  }

  // ── Explanation ────────────────────────────────────────────────
  &__explanation {
    font-size: var(--fs-xs);
    line-height: 1.5;
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__explanation-label {
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: var(--fs-xxs);
    letter-spacing: 0.06em;
    margin-right: 0.3rem;
  }

  // ── Feature importance ─────────────────────────────────────────
  &__importance { @include flex-col(0); }

  &__importance-toggle {
    @include flex-row(0.35rem);
    background: transparent;
    border: none;
    color: var(--color-primary);
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    padding: 0.3rem 0;
    opacity: var(--op-partial);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }
  }

  &__importance-chevron {
    font-size: var(--fs-xxs);
    transition: transform var(--tr-fast);
    display: inline-block;

    &--open { transform: rotate(90deg); }
  }

  &__importance-body { @include flex-col(0.4rem); padding-top: 0.5rem; }

  &__importance-title {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__importance-row {
    @include flex-row(0.4rem);
  }

  &__importance-key {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 90px;
    flex-shrink: 0;
  }

  &__importance-bar-wrap {
    flex: 1;
    height: 4px;
    background: color-mix(in srgb, white 8%, transparent);
    border-radius: 2px;
    align-self: center;
    overflow: hidden;
  }

  &__importance-bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  &__importance-pct {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 32px;
    text-align: right;
  }

  // ── No-data note ───────────────────────────────────────────────
  &__no-data {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    line-height: 1.5;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2%, transparent);
  }
}

@keyframes ai-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
</style>
