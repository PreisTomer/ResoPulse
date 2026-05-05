<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="experiment__snap-bar" v-tip="tipSnapBar">
    <span class="experiment__snap-bar-label">{{ $t('exp.snapBarLabel') }}</span>
    <span class="experiment__snap-bar-range">
      {{ sweepWindow.lo.toFixed(0) }} - {{ sweepWindow.hi.toFixed(0) }}
      {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}
    </span>
    <span class="experiment__snap-bar-affects">{{ sweepWindow.param === 'field' ? $t('exp.snapBarSubField') : $t('exp.snapBarSubFreq') }} {{ Math.round((sweepWindow.lo + sweepWindow.hi) / 2) }} {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}</span>
    <span
      class="experiment__snap-bar-lysis-warn"
      :class="{ 'experiment__snap-bar-lysis-warn--active': snapConfirming }"
    >{{ $t('exp.snapBarLysisWarn', { cellLabel: snapLysisCellLabel }) }}</span>
    <div class="experiment__snap-confirm-row">
      <template v-if="isSnapIdle">
        <button class="experiment__snap-bar-btn" @click="snapToWindow">
          {{ $t('exp.snapBarBtn') }}
        </button>
      </template>
      <template v-else-if="snapConfirming">
        <button class="experiment__snap-bar-btn experiment__snap-bar-btn--confirm" @click="snapToWindow">
          {{ $t('exp.snapBarBtnConfirm') }}
        </button>
        <button class="experiment__snap-bar-btn experiment__snap-bar-btn--cancel" @click="cancelSnap">
          {{ $t('exp.snapBarBtnCancel') }}
        </button>
      </template>
      <template v-else>
        <button class="experiment__snap-bar-btn experiment__snap-bar-btn--confirmed" disabled>
          {{ $t('exp.snapBarBtnApplied') }}
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { tipSnapBar as tipSnapBarFn } from '@/tooltips/experimentTooltips'
import { formatLysisTime } from '@/tooltips/sliderTooltips'

import { SNAP_CONFIRM_MS } from '@/constants/experimentDefaults'
type SweepWindow = { lo: number; hi: number; param: 'field' | 'freq' }

export default defineComponent({
  name: 'SnapBar',

  props: {
    sweepWindow: { type: Object as PropType<SweepWindow>, required: true },
  },

  data() {
    return {
      snapConfirming: false,
      snapConfirmed: false,
      snapResetTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },

  watch: {
    'cellStore.target.id'() { this.snapConfirmed = false },
    'cellStore.resetCounter'() { this.snapConfirmed = false },
  },

  computed: {
    ...mapStores(useCellStore),

    tipSnapBar(): string {
      return tipSnapBarFn(this.sweepWindow)
    },

    snapLysisCellLabel(): string {
      return `${this.cellStore.target.label} (~${formatLysisTime(this.cellStore.lysisDelayMs)})`
    },

    isSnapIdle(): boolean { return !this.snapConfirming && !this.snapConfirmed },
  },

  methods: {
    snapToWindow() {
      if (!this.snapConfirming) {
        this.snapConfirming = true
        this.snapResetTimer = setTimeout(() => {
          this.snapConfirming = false
        }, SNAP_CONFIRM_MS)
        return
      }
      clearTimeout(this.snapResetTimer ?? undefined)
      this.snapConfirming = false
      const center = Math.round((this.sweepWindow.lo + this.sweepWindow.hi) / 2)
      if (this.sweepWindow.param === 'field') {
        this.cellStore.setFieldIntensity(center)
      } else {
        this.cellStore.setBroadcastFreqKHz(center)
      }
      broadcastStateSync()
      this.snapConfirmed = true
    },

    cancelSnap() {
      clearTimeout(this.snapResetTimer ?? undefined)
      this.snapConfirming = false
    },
  },

  beforeUnmount() {
    clearTimeout(this.snapResetTimer ?? undefined)
  },
})
</script>

<style lang="scss" scoped>
.experiment {
  &__snap-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem 0.75rem;
    flex-wrap: wrap;
    padding: 0.55rem 1.1rem;
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-ok) 8%, transparent) 0%, color-mix(in srgb, var(--color-ok) 4%, transparent) 100%);
    border: 1px solid color-mix(in srgb, var(--color-ok) 28%, transparent);
    border-radius: var(--radius);

    &-label {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      font-weight: 600;
      letter-spacing: 0.06em;
      color: color-mix(in srgb, var(--color-ok) 90%, transparent);
      white-space: nowrap;
    }

    &-range {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--color-text-heading);
      background: color-mix(in srgb, var(--color-ok) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-ok) 25%, transparent);
      border-radius: 3px;
      padding: 0.1rem 0.45rem;
      white-space: nowrap;
    }

    &-affects {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      flex: 1;
      white-space: nowrap;
    }

    &-lysis-warn {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-danger);
      opacity: var(--op-muted);
      white-space: nowrap;
      transition: opacity var(--tr-fast);

      &--active { opacity: 1; }
    }

    &-btn {
      padding: 0.22rem 0.75rem;
      background: color-mix(in srgb, var(--color-ok) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-ok) 40%, transparent);
      border-radius: 4px;
      color: color-mix(in srgb, var(--color-ok) 95%, transparent);
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);
      white-space: nowrap;

      &:hover {
        background: color-mix(in srgb, var(--color-ok) 24%, transparent);
        border-color: color-mix(in srgb, var(--color-ok) 65%, transparent);
      }

      &--confirm {
        background: color-mix(in srgb, var(--color-danger) 14%, transparent);
        border-color: color-mix(in srgb, var(--color-danger) 55%, transparent);
        color: var(--color-danger);
        animation: snap-confirm-pulse 0.7s ease-in-out infinite alternate;

        &:hover {
          background: color-mix(in srgb, var(--color-danger) 24%, transparent);
          border-color: color-mix(in srgb, var(--color-danger) 80%, transparent);
        }
      }

      &--confirmed {
        opacity: 0.45; // intentional: confirmed state is visually retired
        cursor: not-allowed;
        border-color: color-mix(in srgb, white 15%, transparent);
        color: var(--color-text-muted);

        &:hover {
          background: transparent;
          border-color: color-mix(in srgb, white 15%, transparent);
        }
      }

      &--cancel {
        background: transparent;
        border-color: color-mix(in srgb, white 18%, transparent);
        color: var(--color-text-muted);

        &:hover {
          background: color-mix(in srgb, white 6%, transparent);
          border-color: color-mix(in srgb, white 32%, transparent);
          color: var(--color-text);
        }
      }
    }
  }

  &__snap-confirm-row {
    margin-left: auto;
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-shrink: 0;
  }
}

@keyframes snap-confirm-pulse {
  from { opacity: 0.75; }
  to   { opacity: 1.0; }
}
</style>
