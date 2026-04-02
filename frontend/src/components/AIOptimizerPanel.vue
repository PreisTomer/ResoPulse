<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ai-panel">
    <AccordionPanel
      :icon="ICON.AI"
      :title="$t('ai.panelTitle')"
      :subtitle="panelSubtitle"
      :initial-open="false"
      :border-on-toggle="true"
    >
      <div class="ai-panel__body">

        <!-- ── Consent gate ──────────────────────────────────────────── -->
        <div v-if="!experimentStore.aiConsentGiven" class="ai-panel__consent">
          <div class="ai-panel__consent-header">{{ $t('ai.consentGateTitle') }}</div>
          <p class="ai-panel__consent-body">{{ $t('ai.consentGateBody') }}</p>
          <label class="ai-panel__consent-toggle">
            <input
              type="checkbox"
              :checked="experimentStore.aiConsentGiven"
              @change="experimentStore.setAiConsent(($event.target as HTMLInputElement).checked)"
            />
            <span>{{ $t('ai.consentToggleLabel') }}</span>
          </label>
        </div>

        <!-- ── Main panel (consent granted) ─────────────────────────── -->
        <template v-else>

          <!-- ── Optimize button ──────────────────────────────────── -->
          <div class="ai-panel__actions">
            <button
              class="ai-panel__optimize-btn"
              :class="{ 'ai-panel__optimize-btn--loading': aiStore.isLoading }"
              :disabled="aiStore.isLoading"
              v-tip="$t('ai.tipOptimizeBtn')"
              @click="runOptimize"
            >
              <span class="ai-panel__btn-icon">{{ ICON.AI }}</span>
              <span>{{ aiStore.isLoading ? $t('ai.panelSubtitleLoading') : $t('ai.optimizeBtn') }}</span>
            </button>

            <button
              v-if="aiStore.hasResult"
              class="ai-panel__clear-btn"
              @click="aiStore.clearResult()"
            >{{ $t('ai.clearBtn') }}</button>
          </div>

          <!-- ── Model status bar ─────────────────────────────────── -->
          <div class="ai-panel__status-bar">
            <div class="ai-panel__status-left">
              <span
                class="ai-panel__status-badge"
                :class="statusBadgeClass"
                v-tip="$t('ai.tipTrainingSamples')"
              >{{ statusBadgeLabel }}</span>
              <span
                class="ai-panel__samples"
                v-tip="$t('ai.tipTrainingSamples')"
              >{{ trainingSamplesDisplay }}</span>
            </div>
            <button
              class="ai-panel__retrain-btn"
              :class="{ 'ai-panel__retrain-btn--running': isRetraining }"
              :disabled="isRetraining || modelTrainingSamples < 1"
              v-tip="$t('ai.tipRetrainBtn')"
              @click="triggerRetrain"
            >
              {{ isRetraining ? $t('ai.retrainBtnRunning') : ($t('ai.retrainBtn') + ' ' + ICON.RELOAD) }}
            </button>
          </div>

          <!-- ── Retrain status message ─────────────────────────────── -->
          <div v-if="retrainMessage" class="ai-panel__retrain-msg" :class="retrainMsgClass">
            {{ retrainMessage }}
          </div>

          <!-- ── No-connection note ────────────────────────────────── -->
          <div v-if="showOfflineNote" class="ai-panel__error-note">
            {{ ICON.WARNING }} {{ $t('ai.errorNote') }}
          </div>

          <!-- ── Low confidence warning ────────────────────────────── -->
          <div v-if="showLowConfidenceWarning" class="ai-panel__warn-note">
            {{ ICON.WARNING }} {{ $t('ai.lowConfidenceWarning', { conf: confidencePct }) }}
          </div>

          <!-- ── Result card ───────────────────────────────────────── -->
          <div v-if="isAiResultReady" class="ai-panel__result">

            <!-- Source badge row -->
            <div class="ai-panel__badge-row">
              <span
                class="ai-panel__source-badge"
                :class="aiStore.isPhysicsBaseline ? 'ai-panel__source-badge--physics' : 'ai-panel__source-badge--ml'"
                v-tip="aiStore.isPhysicsBaseline ? $t('ai.tipPhysicsBaseline') : $t('ai.tipConfidence')"
              >
                {{ aiStore.isPhysicsBaseline ? $t('ai.physicsBaselineBadge') : $t('ai.mlBadge') }}
              </span>

              <span
                class="ai-panel__confidence"
                :class="confidenceClass"
                v-tip="$t('ai.tipConfidence')"
              >
                {{ $t('ai.confidenceLabel', { conf: confidencePct }) }}
              </span>

              <span v-if="aiStore.suggestionApplied" class="ai-panel__applied-badge">
                {{ ICON.CHECK }} {{ $t('ai.appliedBadge') }}
              </span>
            </div>

            <!-- Suggested params -->
            <div v-if="aiResult.suggestion" class="ai-panel__suggestion">
              <div class="ai-panel__suggestion-label">{{ $t('ai.suggestedParamsLabel') }}</div>
              <div class="ai-panel__params-grid">
                <span class="ai-panel__param-key">{{ $t('slider.freq') }}</span>
                <span class="ai-panel__param-val">{{ formatFreqKHz(aiResult.suggestion.freqKHz) }}</span>
                <span class="ai-panel__param-key">{{ $t('slider.field') }}</span>
                <span class="ai-panel__param-val">{{ aiResult.suggestion.fieldVcm }} {{ UNIT.V_PER_CM }}</span>
                <span class="ai-panel__param-key">{{ $t('slider.dutyCycle') }}</span>
                <span class="ai-panel__param-val">{{ formatDutyCycle(aiResult.suggestion.dutyCycle) }}</span>
                <span class="ai-panel__param-key">{{ $t('slider.pulseWidth') }}</span>
                <span class="ai-panel__param-val">{{ aiResult.suggestion.pulseWidthNs }} {{ UNIT.NS }}</span>
                <span class="ai-panel__param-key">{{ $t('slider.waveform') }}</span>
                <span class="ai-panel__param-val ai-panel__param-val--upper">{{ aiResult.suggestion.waveform }}</span>
              </div>
            </div>

            <!-- Predicted outcome -->
            <div class="ai-panel__prediction">
              <div class="ai-panel__suggestion-label">{{ $t('ai.predictedOutcomeLabel') }}</div>
              <div class="ai-panel__outcome-row">
                <span class="ai-panel__outcome-item">
                  <span class="ai-panel__outcome-key">{{ $t('ai.predictedTargetDr') }}</span>
                  <span class="ai-panel__outcome-val ai-panel__outcome-val--target">
                    {{ (aiResult.predictedTargetDr * 100).toFixed(0) }}%
                  </span>
                </span>
                <span class="ai-panel__outcome-item">
                  <span class="ai-panel__outcome-key">{{ $t('ai.predictedHealthyDr') }}</span>
                  <span class="ai-panel__outcome-val ai-panel__outcome-val--healthy">
                    {{ (aiResult.predictedHealthyDr * 100).toFixed(0) }}%
                  </span>
                </span>
                <span class="ai-panel__outcome-item">
                  <span class="ai-panel__outcome-key">{{ $t('ai.predictedTi') }}</span>
                  <span class="ai-panel__outcome-val" :class="tiClass">
                    ×{{ aiResult.predictedTi.toFixed(2) }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Apply button -->
            <div class="ai-panel__apply-row">
              <button
                class="ai-panel__apply-btn"
                :class="{ 'ai-panel__apply-btn--applied': aiStore.suggestionApplied }"
                :disabled="aiStore.suggestionApplied"
                v-tip="$t('ai.tipApplyBtn')"
                @click="applyAndBroadcast"
              >
                {{ aiStore.suggestionApplied ? ($t('ai.appliedBadge') + ' ' + ICON.CHECK) : $t('ai.applyBtn') }}
              </button>
            </div>

            <!-- Explanation -->
            <div v-if="aiResult.explanation" class="ai-panel__explanation">
              <span class="ai-panel__explanation-label">{{ $t('ai.explanationLabel') }}:</span>
              <span class="ai-panel__explanation-text">{{ aiResult.explanation }}</span>
            </div>

            <!-- Feature importance (collapsible) -->
            <div v-if="hasFeatureImportance" class="ai-panel__importance">
              <button class="ai-panel__importance-toggle" @click="aiStore.toggleImportance()">
                {{ aiStore.importanceExpanded ? $t('ai.whyBtnCollapse') : $t('ai.whyBtn') }}
                <span class="ai-panel__importance-chevron" :class="{ 'ai-panel__importance-chevron--open': aiStore.importanceExpanded }">
                  {{ ICON.CHEVRON }}
                </span>
              </button>
              <div v-if="aiStore.importanceExpanded" class="ai-panel__importance-body">
                <div class="ai-panel__importance-title">{{ $t('ai.featureImportanceTitle') }}</div>
                <div
                  v-for="[key, val] in sortedImportance"
                  :key="key"
                  class="ai-panel__importance-row"
                >
                  <span class="ai-panel__importance-key">{{ formatFeatureKey(key) }}</span>
                  <div class="ai-panel__importance-bar-wrap">
                    <div
                      class="ai-panel__importance-bar"
                      :style="{ width: (val * 100).toFixed(1) + '%' }"
                    ></div>
                  </div>
                  <span class="ai-panel__importance-pct">{{ (val * 100).toFixed(1) }}%</span>
                </div>
              </div>
            </div>

          </div><!-- /result -->

          <!-- ── No-data note (shown before first request or in physics mode) ── -->
          <div v-if="isPhysicsBaselineIdle" class="ai-panel__no-data">
            {{ $t('ai.noDataNote') }}
          </div>

        </template><!-- /consent granted -->
      </div><!-- /body -->
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import AccordionPanel from '@/components/AccordionPanel.vue'
import { useAiStore } from '@/stores/aiStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { requestAiOptimization, broadcastStateSync } from '@/services/socket'
import { formatFreqKHz } from '@/utils/format'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { THRESHOLDS } from '@/constants/physics'

export default defineComponent({
  components: { AccordionPanel },

  data() {
    return {
      showOfflineNote: false,
      modelTrainingSamples: 0,
      isRetraining: false,
      retrainMessage: '' as string,
      retrainMsgClass: '' as string,
      _healthPollTimer: null as ReturnType<typeof setInterval> | null,
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
    ICON() { return ICON },
    UNIT() { return UNIT },
    ...mapStores(useAiStore, useExperimentStore),

    panelSubtitle(): string {
      if (this.aiStore.isLoading)  return this.$t('ai.panelSubtitleLoading')
      if (this.aiStore.hasResult)  return this.$t('ai.panelSubtitleResult', { conf: this.confidencePct })
      return this.$t('ai.panelSubtitleReady')
    },

    confidencePct(): string {
      return (this.aiStore.confidence * 100).toFixed(0) + '%'
    },

    confidenceClass(): string {
      const c = this.aiStore.confidence
      if (c >= 0.7) return 'ai-panel__confidence--high'
      if (c >= 0.5) return 'ai-panel__confidence--medium'
      return 'ai-panel__confidence--low'
    },

    tiClass(): string {
      const ti = this.aiStore.result?.predictedTi ?? 0
      if (ti >= THRESHOLDS.SEL_STRONG)   return 'ai-panel__outcome-val--ti-strong'
      if (ti >= THRESHOLDS.SEL_MARGINAL) return 'ai-panel__outcome-val--ti-marginal'
      return 'ai-panel__outcome-val--ti-weak'
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

    isAiResultReady(): boolean       { return this.aiStore.hasResult && !!this.aiStore.result },
    isPhysicsBaselineIdle(): boolean { return this.aiStore.isPhysicsBaseline && !this.aiStore.isLoading && !this.aiStore.hasResult },
    aiResult()                       { return this.aiStore.result! },

    statusBadgeLabel(): string {
      if (this.modelTrainingSamples === 0) return this.$t('ai.serviceOfflineBadge')
      if (this.modelTrainingSamples >= 20)  return this.$t('ai.modelReadyBadge')
      return this.$t('ai.modelNotReadyBadge')
    },

    statusBadgeClass(): string {
      if (this.modelTrainingSamples === 0) return 'ai-panel__status-badge--offline'
      if (this.modelTrainingSamples >= 20)  return 'ai-panel__status-badge--ready'
      return 'ai-panel__status-badge--pending'
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
      // If socket is not connected, requestAiOptimization is a no-op — surface note after delay
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
        // service offline — keep existing count, no error state needed
      }
    },

    async triggerRetrain() {
      this.isRetraining    = true
      this.retrainMessage  = ''
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
        const res  = await fetch(`${backendUrl}/ai/retrain`, {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
        })
        const data = await res.json() as { samplesUsed?: number; status?: string }
        if (data.samplesUsed && data.samplesUsed > 0) {
          this.retrainMessage  = this.$t('ai.retrainSuccess', { n: data.samplesUsed })
          this.retrainMsgClass = 'ai-panel__retrain-msg--ok'
          this.modelTrainingSamples = data.samplesUsed
        } else {
          this.retrainMessage  = this.$t('ai.retrainNoData')
          this.retrainMsgClass = 'ai-panel__retrain-msg--warn'
        }
      } catch {
        this.retrainMessage  = this.$t('ai.errorNote')
        this.retrainMsgClass = 'ai-panel__retrain-msg--error'
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
        target_tau_ns:    'Target τ',
        healthy_tau_ns:   'Healthy τ',
        target_fc_khz:    'Target fc',
        healthy_fc_khz:   'Healthy fc',
        target_radius_um: 'Target radius',
        sigma_e:          'σ_e (medium)',
        orientation_deg:  'Orientation θ',
      }
      return labels[key] ?? key
    },
  },
})
</script>

<style lang="scss" scoped>
.ai-panel {
  @include surface-card(var(--radius));
  padding: 0 1.1rem;
  @include flex-col(0);

  /* ── Body ──────────────────────────────────────────────────── */
  &__body {
    @include flex-col(0.9rem);
    padding-bottom: 0.9rem;
  }

  /* ── Consent gate ──────────────────────────────────────────── */
  &__consent {
    @include info-panel(
      color-mix(in srgb, var(--color-primary) 6%, transparent),
      color-mix(in srgb, var(--color-primary) 25%, transparent)
    );
    @include flex-col(0.6rem);
    padding: 0.75rem;
    border-radius: var(--radius);
  }

  &__consent-header {
    @include mono-upper(var(--fs-xs));
    color: var(--color-primary);
    font-weight: 700;
  }

  &__consent-body {
    font-size: var(--fs-md);
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

  /* ── Actions row ───────────────────────────────────────────── */
  &__actions { @include flex-row(0.6rem); }

  /* ── Optimize button ───────────────────────────────────────── */
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
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    &:disabled {
      opacity: var(--op-muted);
      cursor: not-allowed;
    }

    &--loading {
      animation: ai-pulse 1.4s ease-in-out infinite;
    }
  }

  &__btn-icon {
    font-size: 0.9em;
    line-height: 1;
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

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }

  /* ── Error note ────────────────────────────────────────────── */
  &__error-note {
    font-size: var(--fs-sm);
    color: var(--color-amber);
    padding: 0.4rem 0.6rem;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 28%, transparent);
    border-radius: var(--radius);
  }

  /* ── Result card ───────────────────────────────────────────── */
  &__result {
    @include flex-col(0.75rem);
    padding: 0.7rem;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  /* ── Badge row ─────────────────────────────────────────────── */
  &__badge-row { @include flex-row(0.5rem); flex-wrap: wrap; }

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
    @include mono-upper(var(--fs-xxs));
    color: var(--color-lime);
    margin-left: auto;
  }

  /* ── Suggestion params grid ────────────────────────────────── */
  &__suggestion { @include flex-col(0.4rem); }

  &__suggestion-label { @include section-title(); }

  &__params-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.18rem 0.75rem;
  }

  &__param-key {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__param-val {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-text);

    &--upper { text-transform: uppercase; }
  }

  /* ── Predicted outcome row ─────────────────────────────────── */
  &__prediction { @include flex-col(0.4rem); }

  &__outcome-row { @include flex-row(1rem); flex-wrap: wrap; }

  &__outcome-item { @include flex-col(0.1rem); }

  &__outcome-key { @include mono-upper(var(--fs-xxs)); color: var(--color-text-muted); opacity: var(--op-dim); }

  &__outcome-val {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    font-weight: 700;

    &--target  { color: var(--color-danger); }
    &--healthy { color: var(--color-primary); }
    &--ti-strong   { color: var(--color-lime); }
    &--ti-marginal { color: var(--color-amber); }
    &--ti-weak     { color: var(--color-danger); }
  }

  /* ── Apply button ──────────────────────────────────────────── */
  &__apply-row { @include flex-row(0); }

  &__apply-btn {
    padding: 0.42rem 1.1rem;
    background: color-mix(in srgb, var(--color-lime) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-lime) 40%, transparent);
    border-radius: var(--radius);
    color: var(--color-lime);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-lime) 22%, transparent);
    }

    &:disabled {
      opacity: var(--op-partial);
      cursor: not-allowed;
    }

    &--applied {
      color: var(--color-lime);
      opacity: var(--op-dim);
    }
  }

  /* ── Explanation ───────────────────────────────────────────── */
  &__explanation {
    @include flex-row(0.4rem);
    flex-wrap: wrap;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    font-style: italic;
  }

  &__explanation-label {
    @include mono-upper(var(--fs-xxs));
    font-style: normal;
    opacity: 1;
  }

  /* ── Feature importance ────────────────────────────────────── */
  &__importance { @include flex-col(0.35rem); }

  &__importance-toggle {
    @include flex-row(0.35rem);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    padding: 0;
    opacity: var(--op-muted);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }
  }

  &__importance-chevron {
    display: inline-block;
    transition: transform var(--tr-fast);
    &--open { transform: rotate(90deg); }
  }

  &__importance-body {
    @include flex-col(0.3rem);
    padding: 0.5rem 0.6rem;
    background: color-mix(in srgb, white 2%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__importance-title { @include section-title(); margin-bottom: 0.2rem; }

  &__importance-row { @include flex-row(0.5rem); align-items: center; }

  &__importance-key {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 7rem;
    flex-shrink: 0;
  }

  &__importance-bar-wrap {
    flex: 1;
    height: 4px;
    background: color-mix(in srgb, var(--color-border) 60%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }

  &__importance-bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width var(--tr-slow);
    max-width: 100%;
  }

  &__importance-pct {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 2.8rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── No-data note ──────────────────────────────────────────── */
  &__no-data {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    font-style: italic;
    line-height: 1.5;
  }

  /* ── Model status bar ──────────────────────────────────────── */
  &__status-bar {
    @include flex-between(0.6rem);
    align-items: center;
    padding: 0.3rem 0.5rem;
    background: color-mix(in srgb, white 2%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__status-left { @include flex-row(0.5rem); align-items: center; }

  &__status-badge {
    @include badge-pill(0.1rem 0.4rem, 3px);
    font-size: var(--fs-xxs);

    &--ready   { color: var(--color-lime);   border-color: color-mix(in srgb, var(--color-lime) 35%, transparent);    background: color-mix(in srgb, var(--color-lime) 8%, transparent); }
    &--pending { color: var(--color-amber);  border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);   background: color-mix(in srgb, var(--color-amber) 8%, transparent); }
    &--offline { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);  background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
  }

  &__samples {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    cursor: help;
  }

  /* ── Retrain button ────────────────────────────────────────── */
  &__retrain-btn {
    padding: 0.25rem 0.65rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);
    flex-shrink: 0;

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }

    &--running { animation: ai-pulse 1.2s ease-in-out infinite; }
  }

  /* ── Retrain feedback message ──────────────────────────────── */
  &__retrain-msg {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    padding: 0.3rem 0.55rem;
    border-radius: var(--radius);

    &--ok    { color: var(--color-lime);   background: color-mix(in srgb, var(--color-lime) 8%, transparent);   border: 1px solid color-mix(in srgb, var(--color-lime) 25%, transparent); }
    &--warn  { color: var(--color-amber);  background: color-mix(in srgb, var(--color-amber) 8%, transparent);  border: 1px solid color-mix(in srgb, var(--color-amber) 25%, transparent); }
    &--error { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); }
  }

  /* ── Low-confidence warning ────────────────────────────────── */
  &__warn-note {
    font-size: var(--fs-xs);
    color: var(--color-amber);
    padding: 0.35rem 0.6rem;
    background: color-mix(in srgb, var(--color-amber) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 25%, transparent);
    border-radius: var(--radius);
    line-height: 1.4;
  }
}

@keyframes ai-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
</style>
