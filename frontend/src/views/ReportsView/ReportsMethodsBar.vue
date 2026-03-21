<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports-methods-bar">
    <!-- Row-select hint — visible when no entry is selected -->
    <Transition name="methods-bar">
      <div v-if="!entry" class="reports-methods-bar__row-hint" aria-live="polite">
        <span class="reports-methods-bar__row-hint-icon">{{ ICON.RETICLE }}</span>
        <span class="reports-methods-bar__row-hint-text">{{ $t('reports.rowSelectHint') }}</span>
      </div>
    </Transition>

    <!-- Methods action bar — slides in when a row is selected -->
    <Transition name="methods-bar">
      <div v-if="entry" class="reports-methods-bar__bar">
        <div class="reports-methods-bar__info">
          <span class="reports-methods-bar__label">{{ ICON.RETICLE }} {{ $t('reports.actionBarEntry', { id: entry.id }) }}</span>
          <span class="reports-methods-bar__chip">{{ entry.targetPreset }}</span>
          <span class="reports-methods-bar__chip">{{ formatFreqKHz(entry.freqKHz, 1) }}</span>
          <span class="reports-methods-bar__chip">{{ formatFieldVcm(entry.fieldVcm) }}</span>
          <span class="reports-methods-bar__chip">{{ entry.waveform }}</span>
        </div>
        <div class="reports-methods-bar__actions">
          <span v-if="!entry.healthySnap" class="reports-methods-bar__legacy">
            {{ $t('reports.actionBarLegacy') }}
          </span>
          <button
            v-else
            class="reports-methods-bar__btn"
            @click.stop="$emit('download')"
          >{{ $t('reports.actionBarDownload') }}</button>
          <button
            class="reports-methods-bar__dismiss"
            :title="$t('reports.actionBarDismiss')"
            @click.stop="$emit('dismiss')"
          >×</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { LogEntry } from '@/stores/experimentStore'
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ReportsMethodsBar',

  props: {
    entry: {
      type: Object as PropType<LogEntry | null>,
      default: null,
    },
  },

  emits: ['download', 'dismiss'],

  setup() {
    return { ICON, formatFreqKHz, formatFieldVcm }
  },
})
</script>

<style lang="scss" scoped>
$violet: #a78bfa;
$violet-dim: rgba(167, 139, 250, 0.10);
$violet-border: rgba(167, 139, 250, 0.22);

.reports-methods-bar {
  &__row-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.5rem;
    border-bottom: 1px solid rgba(167, 139, 250, 0.12);
    background: rgba(167, 139, 250, 0.04);
  }

  &__row-hint-icon {
    font-size: 0.85rem;
    color: $violet;
    opacity: 0.6;
    flex-shrink: 0;
  }

  &__row-hint-text {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
    opacity: 0.75;
    letter-spacing: 0.02em;
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(90deg, rgba(167, 139, 250, 0.10) 0%, rgba(167, 139, 250, 0.05) 100%);
    border-bottom: 1px solid rgba(167, 139, 250, 0.25);
    flex-wrap: wrap;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: #c4b5fd;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-right: 0.25rem;
  }

  &__chip {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.65);
    background: $violet-dim;
    border: 1px solid $violet-border;
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  &__legacy {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--color-text-muted);
    opacity: 0.7;
    font-style: italic;
  }

  &__btn {
    padding: 0.45rem 1.1rem;
    font-size: 0.78rem;
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #e9d5ff;
    background: rgba(167, 139, 250, 0.18);
    border: 1px solid rgba(167, 139, 250, 0.55);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover {
      background: rgba(167, 139, 250, 0.32);
      border-color: $violet;
      box-shadow: 0 0 14px rgba(167, 139, 250, 0.25);
    }
  }

  &__dismiss {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    line-height: 1;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;

    &:hover {
      color: var(--color-text-heading);
      border-color: var(--color-border);
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

// ── Methods bar transition ──────────────────────────────────────────────────
.methods-bar-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.methods-bar-leave-active { transition: opacity 0.15s ease; }
.methods-bar-enter-from   { opacity: 0; transform: translateY(-6px); }
.methods-bar-leave-to     { opacity: 0; }
</style>
