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
    :intro-animation="false"
    :force-open="uiStore.aiPanelOpen"
    :hide-tab="true"
    tab-align="flex-start"
    :expand-tip="$t('ai.tabExpandTip')"
    :collapse-tip="$t('ai.tabCollapseTip')"
    @toggle="onPanelToggle"
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
          <div class="ai-tab__header-text">
            <span class="ai-tab__title">{{ $t('ai.panelTitle') }}</span>
            <span class="ai-tab__subtitle">{{ panelSubtitle }}</span>
          </div>
          <button
            type="button"
            class="ai-tab__close"
            v-tip="$t('ai.panelCloseTip')"
            :aria-label="$t('ai.panelCloseTip')"
            @click="closePanel"
          >{{ ICON.CLOSE }}</button>
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

          <!-- Active-learning next-experiment suggestion -->
          <div class="ai-tab__explore-row">
            <button
              class="ai-tab__explore-btn"
              v-tip="$t('ai.exploreBtnTip')"
              @click="suggestExploreNext"
            >{{ $t('ai.exploreBtn') }}</button>
          </div>
          <div v-if="hasExploreSuggestions" class="ai-tab__explore-list">
            <div
              v-for="(s, i) in exploreSuggestions"
              :key="`explore-${i}`"
              class="ai-tab__explore-card"
            >
              <div class="ai-tab__explore-card-head">
                <span class="ai-tab__explore-title">{{ exploreCardTitle(i) }}</span>
                <span class="ai-tab__explore-strategy">{{ exploreStrategyLabelFor(s) }}</span>
              </div>
              <div class="ai-tab__explore-row-grid">
                <span class="ai-tab__explore-k">{{ $t('ai.exploreFreqLabel') }}</span>
                <span class="ai-tab__explore-v">{{ s.freqKHz }} kHz</span>
                <span class="ai-tab__explore-k">{{ $t('ai.exploreFieldLabel') }}</span>
                <span class="ai-tab__explore-v">{{ s.fieldVcm }} V/cm</span>
                <span class="ai-tab__explore-k">{{ $t('ai.exploreDutyLabel') }}</span>
                <span class="ai-tab__explore-v">{{ (s.dutyCycle * 100).toFixed(2) }} %</span>
              </div>
              <p class="ai-tab__explore-rationale">{{ s.rationale }}</p>
              <div class="ai-tab__explore-actions">
                <button class="ai-tab__explore-apply" @click="applyExploreSuggestion(s)">{{ $t('ai.exploreApplyBtn') }}</button>
                <button class="ai-tab__explore-dismiss" @click="dismissExploreSuggestion(i)">{{ $t('ai.exploreDismissBtn') }}</button>
              </div>
            </div>
          </div>

          <!-- Per-cell σ_i calibration status -->
          <div v-if="sigmaCalibVisible" class="ai-tab__sigma-calib" v-tip="$t('ai.sigmaCalibTip')">
            <div class="ai-tab__sigma-calib-title">{{ $t('ai.sigmaCalibTitle') }}</div>
            <div class="ai-tab__sigma-calib-row" :class="sigmaCalibRowClass(healthyCalibStatus)">
              <span class="ai-tab__sigma-calib-label">{{ $t('ai.sigmaCalibRowHealthy') }}</span>
              <span class="ai-tab__sigma-calib-value">{{ sigmaCalibLine(healthyCalibStatus) }}</span>
            </div>
            <div class="ai-tab__sigma-calib-row" :class="sigmaCalibRowClass(targetCalibStatus)">
              <span class="ai-tab__sigma-calib-label">{{ $t('ai.sigmaCalibRowTarget') }}</span>
              <span class="ai-tab__sigma-calib-value">{{ sigmaCalibLine(targetCalibStatus) }}</span>
            </div>
            <button
              v-if="canPreviewCalibration"
              class="ai-tab__sigma-calib-cta"
              @click="openCalibrationPreview"
            >{{ $t('ai.sigmaCalibPreviewCta') }}</button>
            <div v-else-if="isResonanceCalibPath" class="ai-tab__sigma-calib-note">
              {{ $t('ai.sigmaCalibResonanceNote') }}
            </div>
          </div>

          <ApplyCalibrationModal
            :is-open="calibPreviewOpen"
            :healthy-multiplier="healthyCalibStatus.sigmaMultiplier"
            :target-multiplier="targetCalibStatus.sigmaMultiplier"
            @close="closeCalibrationPreview"
          />

          <!-- Model calibration: measured vs predicted residuals across this lab's sessions -->
          <CalibrationBadge
            variant="full"
            @click-log="goToReports"
            @click-details="toggleCalibDetails"
          />

          <!-- Residual details (collapsible) -->
          <div v-if="calibDetailsOpen" class="ai-tab__calib-details">
            <div class="ai-tab__calib-details-title">{{ $t('ai.calibDetailsTitle') }}</div>
            <div v-if="recentResiduals.length === 0" class="ai-tab__calib-details-empty">
              {{ $t('ai.calibEmpty') }}
            </div>
            <table v-else class="ai-tab__calib-table">
              <thead>
                <tr>
                  <th>{{ $t('ai.calibColEntry') }}</th>
                  <th>{{ $t('ai.calibColTarget') }}</th>
                  <th>{{ $t('ai.calibColHealthy') }}</th>
                  <th>{{ $t('ai.calibColField') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in recentResiduals" :key="r.entryId">
                  <td>#{{ r.entryId }}</td>
                  <td :class="residualCellClass(r.targetResidualPct)">{{ formatPp(r.targetResidualPct) }}</td>
                  <td :class="residualCellClass(r.healthyResidualPct)">{{ formatPp(r.healthyResidualPct) }}</td>
                  <td>{{ formatVcm(r.fieldResidualVcm) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Offline note -->
          <div v-if="showOfflineNote" class="ai-tab__error-note">
            {{ ICON.WARNING }} {{ $t('ai.errorNote') }}
          </div>

          <!-- Guest note: shown when a guest tries to run the optimizer -->
          <div v-if="showGuestNote" class="ai-tab__guest-note">
            {{ $t('ai.guestNote') }}
            <RouterLink :to="ROUTE.SIGN_UP" class="ai-tab__guest-signup">{{ $t('nav.guestSignUpCta') }} →</RouterLink>
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

  <AiRetrainSuccessModal
    :is-open="retrainModalOpen"
    :samples-used="modelTrainingSamples"
    :model-version="aiStore.lastModelVersion"
    :promoted="aiStore.lastPromoted"
    :holdout-mae="aiStore.lastHoldoutMae"
    :previous-best-mae="aiStore.lastPreviousBestMae"
    :target-dr="aiStore.lastTargetDr"
    :healthy-dr="aiStore.lastHealthyDr"
    :rating="aiStore.lastRating"
    @close="closeRetrainModal"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useAiStore } from '@/stores/aiStore'
import { useAuthStore } from '@/stores/authStore'
import { useCellStore } from '@/stores/cellStore'
import { useCellCalibrationStore } from '@/stores/cellCalibrationStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useTokenStore } from '@/stores/tokenStore'
import { useUiStore } from '@/stores/uiStore'

import { requestAiOptimization, broadcastStateSync } from '@/services/socket'

import { suggestNextProtocols, type SuggestedProtocol } from '@/utils/activeLearning'

import SideTabPanel from '@/components/ExperimentLab/SideTabPanel.vue'
import AiResultCard from '@/components/ExperimentLab/AiResultCard.vue'
import AiRetrainSuccessModal from '@/components/ExperimentLab/AiRetrainSuccessModal.vue'
import ApplyCalibrationModal from '@/components/ExperimentLab/ApplyCalibrationModal.vue'
import CalibrationBadge from '@/components/CalibrationBadge/index.vue'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'
import { THRESHOLDS } from '@/constants/physics'
import { STORAGE_KEY } from '@/constants/storageKeys'

import type { CalibrationStatus } from '@/stores/cellCalibrationStore'

export default defineComponent({
  name: 'AiOptimizerTab',

  components: { SideTabPanel, AiResultCard, AiRetrainSuccessModal, ApplyCalibrationModal, CalibrationBadge },

  data() {
    return {
      showOfflineNote:      false,
      showGuestNote:        false,
      isRetraining:         false,
      retrainMessage:       '' as string,
      retrainMsgClass:      '' as string,
      calibDetailsOpen:     false,
      calibPreviewOpen:     false,
      exploreSuggestions:   [] as SuggestedProtocol[],
      retrainModalOpen:     false,
      _healthPollTimer:     null as ReturnType<typeof setInterval> | null,
      _optimizeTimeoutTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },

  mounted() {
    this.fetchAiHealth()
    this._healthPollTimer = setInterval(this.fetchAiHealth, 30_000)
  },

  beforeUnmount() {
    if (this._healthPollTimer)      clearInterval(this._healthPollTimer)
    if (this._optimizeTimeoutTimer) clearTimeout(this._optimizeTimeoutTimer)
  },

  watch: {
    'aiStore.retrainJustCompleted'(isComplete: boolean) {
      if (!isComplete)                                                return
      if (localStorage.getItem(STORAGE_KEY.SEEN_RETRAIN_MODAL) !== null) return
      this.retrainModalOpen = true
    },
  },

  computed: {
    ICON()  { return ICON  },
    ROUTE() { return ROUTE },
    SIGMA_MIN() { return THRESHOLDS.SIGMA_CALIB_MULT_MIN.toFixed(1) },
    SIGMA_MAX() { return THRESHOLDS.SIGMA_CALIB_MULT_MAX.toFixed(1) },
    SIGMA_MIN_SAMPLES() { return THRESHOLDS.SIGMA_CALIB_MIN_SAMPLES },
    ...mapStores(useAiStore, useAuthStore, useCellStore, useCellCalibrationStore, useExperimentStore, useTokenStore, useUiStore),

    healthyCalibStatus(): CalibrationStatus {
      return this.cellCalibrationStore.statusFor(this.cellStore.healthy.id)
    },
    targetCalibStatus(): CalibrationStatus {
      return this.cellCalibrationStore.statusFor(this.cellStore.target.id)
    },
    sigmaCalibVisible(): boolean {
      return this.authStore.isSignedIn && this.authStore.hasOrg
    },

    isResonanceCalibPath(): boolean {
      return this.cellStore.isResonanceTarget
    },

    hasActionableMultiplier(): boolean {
      const h = this.healthyCalibStatus
      const t = this.targetCalibStatus
      const meaningful = (s: { state: string; sigmaMultiplier: number }) =>
        (s.state === 'calibrated' || s.state === 'clamped') && Math.abs(s.sigmaMultiplier - 1.0) > 1e-3
      return meaningful(h) || meaningful(t)
    },

    canPreviewCalibration(): boolean {
      return this.hasActionableMultiplier && !this.isResonanceCalibPath
    },

    panelSubtitle(): string {
      if (this.aiStore.isLoading) return this.$t('ai.panelSubtitleLoading')
      if (this.aiStore.hasResult) return this.$t('ai.panelSubtitleResult', { conf: (this.aiStore.confidence * 100).toFixed(0) + '%' })
      return this.$t('ai.panelSubtitleReady')
    },

    isAiResultReady(): boolean       { return this.aiStore.hasResult && !!this.aiStore.result },
    isPhysicsBaselineIdle(): boolean { return this.aiStore.isPhysicsBaseline && !this.aiStore.isLoading && !this.aiStore.hasResult },

    modelTrainingSamples(): number { return this.aiStore.modelTrainingSamples },

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

    recentResiduals() {
      return this.experimentStore.measuredResiduals.slice(0, 5)
    },

    hasExploreSuggestions(): boolean {
      return this.exploreSuggestions.length > 0
    },
  },

  methods: {
    onPanelToggle(open: boolean) {
      this.uiStore.setAiPanelOpen(open)
    },

    closePanel() {
      this.uiStore.setAiPanelOpen(false)
    },

    async runOptimize() {
      const canProceed = await this.tokenStore.consumeOperation('AI_OPTIMIZE', { allowGuest: true })
      if (!canProceed) return
      this.showGuestNote = false

      this.showOfflineNote = false
      const requestId = this.aiStore.startRequest()
      if (this._optimizeTimeoutTimer) clearTimeout(this._optimizeTimeoutTimer)
      requestAiOptimization(requestId, (result) => {
        if (this._optimizeTimeoutTimer) {
          clearTimeout(this._optimizeTimeoutTimer)
          this._optimizeTimeoutTimer = null
        }
        this.aiStore.receiveResult(result)
      })
      this._optimizeTimeoutTimer = setTimeout(() => {
        this._optimizeTimeoutTimer = null
        if (this.aiStore.isLoading && this.aiStore.pendingRequestId === requestId) {
          this.aiStore.cancelRequest()
          this.showOfflineNote = true
        }
      }, 9000)
    },

    applyAndBroadcast() {
      this.tokenStore.consumeOperationLenient('AI_RETRAIN')
      this.aiStore.applySuggestion()
      broadcastStateSync()
    },

    async fetchAiHealth() {
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
        const res  = await fetch(`${backendUrl}/ai/health`, { signal: AbortSignal.timeout(5_000) })
        const data = await res.json() as { trainingSamples?: number; modelReady?: boolean }
        this.aiStore.setHealthSnapshot({
          trainingSamples: data.trainingSamples ?? 0,
          modelReady:      data.modelReady      ?? false,
        })
      } catch {
        // service offline — keep existing count
      }
    },

    async triggerRetrain() {
      this.isRetraining   = true
      this.retrainMessage = ''
      this.tokenStore.consumeOperationLenient('AI_RETRAIN')
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
        const res  = await fetch(`${backendUrl}/ai/retrain`, {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
        })
        const data = await res.json() as { samplesUsed?: number; status?: string; modelReady?: boolean }
        if (data.samplesUsed && data.samplesUsed > 0) {
          this.retrainMessage  = this.$t('ai.retrainSuccess', { n: data.samplesUsed })
          this.retrainMsgClass = 'ai-tab__retrain-msg--ok'
          this.aiStore.setHealthSnapshot({
            trainingSamples: data.samplesUsed,
            modelReady:      data.modelReady ?? this.aiStore.modelReady,
          })
        } else {
          this.retrainMessage  = this.$t('ai.retrainNoData')
          this.retrainMsgClass = 'ai-tab__retrain-msg--warn'
        }
        // Refit σ_i for the active cells in parallel with the global retrain — server-side
        // compute is org-scoped, so skip silently for guests and no-org users.
        if (this.sigmaCalibVisible) {
          await Promise.all([
            this.cellCalibrationStore.compute(this.cellStore.healthy.id),
            this.cellCalibrationStore.compute(this.cellStore.target.id),
          ])
        }
      } catch {
        this.retrainMessage  = this.$t('ai.errorNote')
        this.retrainMsgClass = 'ai-tab__retrain-msg--error'
      } finally {
        this.isRetraining = false
        setTimeout(() => { this.retrainMessage = '' }, 5_000)
      }
    },

    sigmaCalibLine(status: CalibrationStatus): string {
      switch (status.state) {
        case 'collecting': return this.$t('ai.sigmaCalibCollecting', {
          n:    status.nSamples,
          need: THRESHOLDS.SIGMA_CALIB_MIN_SAMPLES,
        })
        case 'clamped': return this.$t('ai.sigmaCalibClamped', {
          m:   status.sigmaMultiplier.toFixed(2),
          min: this.SIGMA_MIN,
          max: this.SIGMA_MAX,
        }) + this.errorDeltaSuffix(status)
        case 'calibrated': return this.$t('ai.sigmaCalibCalibrated', {
          m:   status.sigmaMultiplier.toFixed(2),
          std: status.uncertaintyStd.toFixed(2),
          n:   status.nSamples,
        }) + this.errorDeltaSuffix(status)
        default: return this.$t('ai.sigmaCalibUnknown')
      }
    },

    errorDeltaSuffix(status: CalibrationStatus): string {
      if (status.rmseBefore <= 0 || status.rmseAfter <= 0) return ''
      return this.$t('ai.sigmaCalibErrorDelta', {
        before: (status.rmseBefore * 100).toFixed(1),
        after:  (status.rmseAfter  * 100).toFixed(1),
      })
    },

    sigmaCalibRowClass(status: CalibrationStatus): string {
      return `ai-tab__sigma-calib-row--${status.state}`
    },

    async suggestExploreNext(): Promise<void> {
      const canProceed = await this.tokenStore.consumeOperation('AI_SUGGEST', { allowGuest: true })
      if (!canProceed) return
      this.showGuestNote = false
      this.exploreSuggestions = suggestNextProtocols(this.experimentStore.entries, this.cellStore.sliderRanges)
    },

    applyExploreSuggestion(s: SuggestedProtocol): void {
      this.cellStore.setBroadcastFreqKHz(s.freqKHz)
      this.cellStore.setFieldIntensity(s.fieldVcm)
      this.cellStore.setDutyCycle(s.dutyCycle)
      broadcastStateSync()
      this.exploreSuggestions = []
    },

    dismissExploreSuggestion(index: number): void {
      this.exploreSuggestions = this.exploreSuggestions.filter((_, i) => i !== index)
    },

    exploreCardTitle(index: number): string {
      return this.$t('ai.exploreCardTitleN', { n: index + 1 })
    },

    exploreStrategyLabelFor(s: SuggestedProtocol): string {
      return s.strategy === 'cold-start'
        ? this.$t('ai.exploreStrategyColdStart')
        : this.$t('ai.exploreStrategyExplore')
    },

    toggleCalibDetails()       { this.calibDetailsOpen = !this.calibDetailsOpen },
    openCalibrationPreview()   { this.calibPreviewOpen = true                    },
    closeCalibrationPreview()  { this.calibPreviewOpen = false                   },
    goToReports()              { this.$router.push(ROUTE.REPORTS)                },

    closeRetrainModal(): void {
      localStorage.setItem(STORAGE_KEY.SEEN_RETRAIN_MODAL, '1')
      this.aiStore.acknowledgeRetrain()
      this.retrainModalOpen = false
    },

    formatPp(v: number | null): string {
      if (v === null) return '—'
      const sign = v >= 0 ? '+' : ''
      return `${sign}${v.toFixed(1)} pp`
    },
    formatVcm(v: number | null): string {
      if (v === null) return '—'
      const sign = v >= 0 ? '+' : ''
      return `${sign}${v.toFixed(0)} V/cm`
    },
    residualCellClass(v: number | null): string {
      if (v === null)          return ''
      const abs = Math.abs(v)
      if (abs > 15) return 'ai-tab__calib-cell--drift'
      if (abs <  5) return 'ai-tab__calib-cell--strong'
      return 'ai-tab__calib-cell--moderate'
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
    @include flex-between(0.6rem);
    align-items: flex-start;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__header-text {
    @include flex-col(0.2rem);
    flex: 1 1 auto;
    min-width: 0;
  }

  &__close {
    @include inline-flex-center();
    width: 1.6rem;
    height: 1.6rem;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--fs-md);
    line-height: 1;
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
    flex-shrink: 0;

    &:hover {
      color: var(--color-danger);
      border-color: color-mix(in srgb, var(--color-danger) 45%, transparent);
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    }
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

    &--ready   { @include color-variant(lime, 30%, 8%); }
    &--pending { @include color-variant(amber, 30%, 8%); }
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

  // ── Active-learning explore button + suggestion card ──────────
  &__explore-row {
    @include flex-row(0.4rem);
    flex-wrap: wrap;
  }

  &__explore-btn {
    @include mono-upper(var(--fs-xxs), 0.06em);
    flex: 1;
    padding: 0.35rem 0.6rem;
    background: transparent;
    border: 1px dashed color-mix(in srgb, var(--color-accent) 45%, transparent);
    border-radius: var(--radius);
    color: color-mix(in srgb, var(--color-accent) 90%, transparent);
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
  }

  &__explore-list {
    @include flex-col(0.5rem);
  }

  &__explore-card {
    @include flex-col(0.5rem);
    padding: 0.6rem 0.7rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  &__explore-card-head {
    @include flex-between();
    gap: 0.5rem;
  }

  &__explore-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-accent);
  }

  &__explore-strategy {
    @include badge-pill(0.08rem 0.4rem, 3px);
    font-size: var(--fs-xxs);
    @include color-variant(accent, 30%, 8%);
  }

  &__explore-row-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2rem 0.6rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
  }

  &__explore-k {
    color: var(--color-text-muted);
  }

  &__explore-v {
    color: var(--color-text);
  }

  &__explore-rationale {
    margin: 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    line-height: 1.45;
  }

  &__explore-actions {
    @include flex-row(0.4rem);
  }

  &__explore-apply {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.3rem 0.6rem;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
    border-radius: 3px;
    color: var(--color-accent);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-accent) 28%, transparent); }
  }

  &__explore-dismiss {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.3rem 0.6rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-muted);
    cursor: pointer;

    &:hover { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); }
  }

  // ── Per-cell sigma_i calibration status ────────────────────────
  &__sigma-calib {
    @include flex-col(0.3rem);
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2%, transparent);
  }

  &__sigma-calib-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-muted);
  }

  &__sigma-calib-row {
    @include flex-between();
    gap: 0.5rem;
    font-size: var(--fs-xs);
    font-family: var(--font-mono);

    &--unknown    { color: var(--color-text-muted); opacity: var(--op-dim); }
    &--collecting { color: var(--color-amber); }
    &--clamped    { color: var(--color-danger); }
    &--calibrated { color: var(--color-lime); }
  }

  &__sigma-calib-label {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__sigma-calib-value {
    text-align: right;
    min-width: 0;
  }

  &__sigma-calib-cta {
    @include mono-upper(var(--fs-xxs), 0.06em);
    align-self: flex-end;
    margin-top: 0.25rem;
    padding: 0.2rem 0.45rem;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    border-radius: 3px;
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
  }

  &__sigma-calib-note {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    line-height: 1.4;
    margin-top: 0.25rem;
  }

  // ── Feedback messages ──────────────────────────────────────────
  &__retrain-msg {
    font-size: var(--fs-xs);
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid;

    &--ok    { @include color-variant(lime); }
    &--warn  { @include color-variant(amber); }
    &--error { @include color-variant(danger); }
  }

  &__error-note {
    font-size: var(--fs-sm);
    color: var(--color-amber);
    padding: 0.4rem 0.6rem;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 28%, transparent);
    border-radius: var(--radius);
  }

  &__guest-note {
    @include flex-col(0.4rem);
    font-size: var(--fs-sm);
    color: var(--color-primary);
    padding: 0.5rem 0.65rem;
    background: color-mix(in srgb, var(--color-primary) 7%, transparent);
    border: 1px solid var(--color-primary-border);
    border-radius: var(--radius);
  }

  &__guest-signup {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-primary);
    text-decoration: none;

    &:hover { text-decoration: underline; }
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

  // ── Calibration details ────────────────────────────────────────
  &__calib-details {
    @include flex-col(0.4rem);
    padding: 0.55rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2%, transparent);
  }

  &__calib-details-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-muted);
  }

  &__calib-details-empty {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__calib-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);

    th {
      @include mono-upper(var(--fs-xxs), 0.06em);
      color: var(--color-text-muted);
      padding: 0.25rem 0.35rem;
      text-align: right;
      border-bottom: 1px solid var(--color-border);

      &:first-child { text-align: left; }
    }

    td {
      padding: 0.25rem 0.35rem;
      text-align: right;
      color: var(--color-text);

      &:first-child { text-align: left; color: var(--color-text-muted); }
    }
  }

  &__calib-cell {
    &--strong   { color: var(--color-lime); }
    &--moderate { color: var(--color-text); }
    &--drift    { color: var(--color-amber); }
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
