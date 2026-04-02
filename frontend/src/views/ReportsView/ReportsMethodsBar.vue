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
            @click.stop="$emit(EMIT.DOWNLOAD)"
          >{{ $t('reports.actionBarDownload') }}</button>
          <button
            class="reports-methods-bar__dismiss"
            :title="$t('reports.actionBarDismiss')"
            @click.stop="$emit(EMIT.DISMISS)"
          >{{ ICON.CLOSE }}</button>
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
import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  name: 'ReportsMethodsBar',

  props: {
    entry: {
      type: Object as PropType<LogEntry | null>,
      default: null,
    },
  },

  emits: [EMIT.DOWNLOAD, EMIT.DISMISS],

  data() {
    return { ICON, EMIT, formatFreqKHz, formatFieldVcm }
  },
})
</script>

<style lang="scss" scoped>
.reports-methods-bar {
  &__row-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.5rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-purple) 12%, transparent);
    background: color-mix(in srgb, var(--color-purple) 4%, transparent);
  }

  &__row-hint-icon {
    font-size: var(--fs-lg);
    color: var(--color-purple);
    opacity: 0.6; // intentional below-tier value
    flex-shrink: 0;
  }

  &__row-hint-text {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: 0.75; // intentional between-tier value
    letter-spacing: 0.02em;
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-purple) 10%, transparent) 0%, color-mix(in srgb, var(--color-purple) 5%, transparent) 100%);
    border-bottom: 1px solid color-mix(in srgb, var(--color-purple) 25%, transparent);
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
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--color-purple-light);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-right: 0.25rem;
  }

  &__chip {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: color-mix(in srgb, white 65%, transparent);
    background: var(--color-purple-dim);
    border: 1px solid color-mix(in srgb, var(--color-purple) 22%, transparent);
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
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    font-style: italic;
  }

  &__btn {
    padding: 0.45rem 1.1rem;
    font-size: var(--fs-md);
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-purple-light);
    background: color-mix(in srgb, var(--color-purple) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-purple) 55%, transparent);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all var(--tr-fast);
    white-space: nowrap;

    &:hover {
      background: color-mix(in srgb, var(--color-purple) 32%, transparent);
      border-color: var(--color-purple);
      box-shadow: 0 0 14px color-mix(in srgb, var(--color-purple) 25%, transparent);
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
    transition: all var(--tr-fast);
    padding: 0;

    &:hover {
      color: var(--color-text-heading);
      border-color: var(--color-border);
      background: color-mix(in srgb, white 6%, transparent);
    }
  }
}

// ── Methods bar transition ──────────────────────────────────────────────────
.methods-bar-enter-active { transition: opacity var(--tr-normal), transform var(--tr-normal); }
.methods-bar-leave-active { transition: opacity var(--tr-fast); }
.methods-bar-enter-from   { opacity: 0; transform: translateY(-6px); }
.methods-bar-leave-to     { opacity: 0; }
</style>
