<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="replay-overlay">
    <div v-if="isVisible" class="replay-overlay">

      <!-- ── Progress pill (shown during animation) ──────────────────── -->
      <div v-if="replayStore.isReplaying" class="replay-overlay__pill replay-overlay__pill--active">
        <span class="replay-overlay__pill-dot"></span>
        <span class="replay-overlay__pill-label">
          {{ $t('validate.progressTitle') }}
          <span class="replay-overlay__pill-step">
            {{ replayStore.currentStepIndex + 1 }}/{{ replayStore.totalSteps }}
          </span>
        </span>
        <span class="replay-overlay__pill-desc">{{ stepLabel }}</span>
        <button class="replay-overlay__skip" @click="onSkip">
          {{ $t('validate.progressSkip') }}
        </button>
      </div>

      <!-- ── Result banner (shown after completion) ───────────────────── -->
      <div v-if="replayStore.isComplete" class="replay-overlay__result">
        <div class="replay-overlay__result-header">
          <span class="replay-overlay__result-icon">{{ ICON.CHECK }}</span>
          <span class="replay-overlay__result-title">{{ $t('validate.resultTitle') }}</span>
        </div>

        <div class="replay-overlay__result-rows">
          <div class="replay-overlay__result-row">
            <span class="replay-overlay__row-label">{{ $t('validate.resultPublished') }}</span>
            <span class="replay-overlay__row-value replay-overlay__row-value--published">
              {{ publishedMetric }}
            </span>
          </div>
          <div class="replay-overlay__result-row">
            <span class="replay-overlay__row-label">{{ $t('validate.resultApp') }}</span>
            <span class="replay-overlay__row-value replay-overlay__row-value--app">
              {{ replayStore.appResultString }}
            </span>
          </div>
        </div>

        <p class="replay-overlay__agreement">{{ agreementText }}</p>

        <div class="replay-overlay__result-actions">
          <div class="replay-overlay__result-actions-row">
            <button class="replay-overlay__action-btn replay-overlay__action-btn--ghost" @click="onTryAnother">
              {{ $t('validate.resultCtaAnother') }}
            </button>
            <button class="replay-overlay__action-btn replay-overlay__action-btn--examine" @click="onExamineParams">
              {{ $t('validate.resultCtaExamine') }}
            </button>
          </div>
          <RouterLink :to="ROUTE.EXPERIMENT" class="replay-overlay__action-btn replay-overlay__action-btn--primary replay-overlay__action-btn--full" @click="onExperiment">
            {{ $t('validate.resultCtaExperiment') }}
            <span class="replay-overlay__btn-arrow">{{ ICON.ARROW_R }}</span>
          </RouterLink>
        </div>
      </div>

    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { mapStores } from 'pinia'

import { useReplayStore } from '@/stores/replayStore'
import { useCellStore } from '@/stores/cellStore'
import { useUiStore } from '@/stores/uiStore'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import { cellConfigs } from '@/constants/defaultCells'

import { scrollAndHighlight } from '@/utils/highlight'

export default defineComponent({
  name: 'ReplayOverlay',

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },
    ...mapStores(useReplayStore, useCellStore, useUiStore),

    isVisible(): boolean {
      return this.replayStore.isReplaying || this.replayStore.isComplete
    },

    stepLabel(): string {
      const key = this.replayStore.currentLabelKey
      return key ? this.$t(key) : ''
    },

    publishedMetric(): string {
      const script = this.replayStore.activeScript
      return script ? this.$t(script.publishedMetricKey) : ''
    },

    agreementText(): string {
      const script = this.replayStore.activeScript
      if (script?.resultAgreementKey) return this.$t(script.resultAgreementKey)
      return this.$t('validate.resultAgreement')
    },
  },

  beforeUnmount() {
    // User navigated away (nav bar click) while replay was running or showing result.
    // Dismiss clears the step timer and releases forced panel expansions in CellParamsPanel.
    if (this.replayStore.isReplaying || this.replayStore.isComplete) {
      this.replayStore.dismiss()
    }
  },

  methods: {
    onSkip() {
      this.replayStore.skipToResult()
    },

    onExperiment() {
      // Reset to default cells so the user starts fresh, not from validation state.
      this.cellStore.loadPreset('healthy', cellConfigs[0])
      this.cellStore.loadPreset('target',  cellConfigs[1])
      this.replayStore.dismiss()
    },

    onExamineParams() {
      this.replayStore.dismiss()
      scrollAndHighlight('hl-cell-cards', 200)
    },

    onTryAnother() {
      this.replayStore.dismiss()
      this.uiStore.requestValidateDrawer()
      this.$router.push('/')
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.replay-overlay {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  pointer-events: none;

  > * { pointer-events: auto; }

  // ── Progress pill ──────────────────────────────────────────────────────────
  &__pill {
    @include surface-card(var(--radius-lg), 0.5rem 1rem);
    @include flex-row(0.75rem);
    max-width: 520px;
    box-shadow: 0 4px 24px color-mix(in srgb, var(--color-bg) 60%, transparent);

    &--active {
      animation: replay-pill-glow 2s ease-in-out infinite;
    }
  }

  &__pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: replay-pulse 1s ease-in-out infinite;
    flex-shrink: 0;
  }

  &__pill-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    white-space: nowrap;
  }

  &__pill-step {
    opacity: var(--op-muted);
    margin-left: 0.25rem;
  }

  &__pill-desc {
    font-size: var(--fs-xs);
    color: var(--color-text);
    opacity: var(--op-dim);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__skip {
    @include mono-upper(var(--fs-xxs));
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-text) 20%, transparent);
    border-radius: var(--radius);
    color: var(--color-text);
    opacity: var(--op-muted);
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      opacity: 1;
      border-color: color-mix(in srgb, var(--color-text) 50%, transparent);
    }
  }

  // ── Result banner ──────────────────────────────────────────────────────────
  &__result {
    @include surface-card(var(--radius-lg), 1.25rem 1.5rem);
    width: min(90vw, 540px);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 8px 40px color-mix(in srgb, var(--color-primary) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  &__result-header {
    @include flex-row(0.6rem);
  }

  &__result-icon {
    font-size: var(--fs-xl);
    color: var(--color-primary);
  }

  &__result-title {
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--color-text);
  }

  &__result-rows {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__result-row {
    @include info-panel(
      color-mix(in srgb, var(--color-primary) 5%, transparent),
      color-mix(in srgb, var(--color-primary) 12%, transparent)
    );
    @include flex-row(0.75rem);
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
  }

  &__row-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-dim);
    white-space: nowrap;
  }

  &__row-value {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);

    &--published {
      color: var(--color-amber);
    }

    &--app {
      color: var(--color-primary);
    }
  }

  &__agreement {
    font-size: var(--fs-md);
    color: var(--color-text);
    opacity: var(--op-muted);
    margin: 0;
    line-height: 1.5;
  }

  &__result-actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__result-actions-row {
    @include flex-row(0.75rem);
    justify-content: center;

    .replay-overlay__action-btn {
      flex: 1;
      justify-content: center;
    }
  }

  &__action-btn {
    @include flex-row(0.4rem);
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    border: 1px solid;
    font-size: var(--fs-md);
    text-decoration: none;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &--full {
      width: 100%;
      justify-content: center;
    }

    &--ghost {
      background: color-mix(in srgb, var(--color-text) 6%, transparent);
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-text) 30%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--color-text) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-text) 50%, transparent);
      }
    }

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 25%, transparent);
        border-color: var(--color-primary);
      }
    }

    &--examine {
      background: color-mix(in srgb, var(--color-text) 6%, transparent);
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-text) 30%, transparent);
      cursor: pointer;

      &:hover {
        background: color-mix(in srgb, var(--color-text) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-text) 50%, transparent);
      }
    }
  }

  &__btn-arrow {
    opacity: var(--op-muted);
  }
}

// ── Keyframes (local — not shared) ─────────────────────────────────────────
@keyframes replay-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

@keyframes replay-pill-glow {
  0%, 100% { border-color: color-mix(in srgb, var(--color-primary) 30%, transparent); box-shadow: 0 4px 24px color-mix(in srgb, var(--color-bg) 60%, transparent); }
  50%       { border-color: color-mix(in srgb, var(--color-primary) 70%, transparent); box-shadow: 0 4px 32px color-mix(in srgb, var(--color-primary) 20%, transparent); }
}

// ── Transition ────────────────────────────────────────────────────────────
.replay-overlay-enter-active,
.replay-overlay-leave-active {
  transition: opacity var(--tr-slow), transform var(--tr-slow);
}

.replay-overlay-enter-from,
.replay-overlay-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
