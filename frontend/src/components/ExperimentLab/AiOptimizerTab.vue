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
        <div v-if="!experimentStore.aiConsentGiven" class="ai-tab__consent">
          <div class="ai-tab__consent-title">{{ $t('ai.consentGateTitle') }}</div>
          <p class="ai-tab__consent-body">{{ $t('ai.consentGateBody') }}</p>
          <label class="ai-tab__consent-toggle">
            <input
              type="checkbox"
              :checked="experimentStore.aiConsentGiven"
              @change="experimentStore.setAiConsent(($event.target as HTMLInputElement).checked)"
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
            {{ ICON.WARNING }} {{ $t('ai.lowConfidenceWarning', { conf: (aiStore.confidence * 100).toFixed(0) + '%' }) }}
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
          <AiResultCard v-if="isAiResultReady" @apply="applyAndBroadcast" />

          <!-- No-data note -->
          <div v-if="isPhysicsBaselineIdle" class="ai-tab__no-data">
            {{ $t('ai.noDataNote') }}
          </div>

        </template><!-- /consent granted -->
      </div><!-- /panel -->
    </template>
  </SideTabPanel>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useAiStore } from '@/stores/aiStore'
import { useExperimentStore } from '@/stores/experimentStore'

import { requestAiOptimization, broadcastStateSync } from '@/services/socket'

import SideTabPanel from '@/components/ExperimentLab/SideTabPanel.vue'
import AiResultCard from '@/components/ExperimentLab/AiResultCard.vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'AiOptimizerTab',

  components: { SideTabPanel, AiResultCard },

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
    ICON() { return ICON },
    ...mapStores(useAiStore, useExperimentStore),

    panelSubtitle(): string {
      if (this.aiStore.isLoading) return this.$t('ai.panelSubtitleLoading')
      if (this.aiStore.hasResult) return this.$t('ai.panelSubtitleResult', { conf: (this.aiStore.confidence * 100).toFixed(0) + '%' })
      return this.$t('ai.panelSubtitleReady')
    },

    isAiResultReady(): boolean       { return this.aiStore.hasResult && !!this.aiStore.result },
    isPhysicsBaselineIdle(): boolean { return this.aiStore.isPhysicsBaseline && !this.aiStore.isLoading && !this.aiStore.hasResult },

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
