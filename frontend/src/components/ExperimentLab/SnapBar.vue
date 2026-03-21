<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiment__snap-bar" v-tip="tipSnapBar">
    <span class="experiment__snap-bar-label">{{ $t('exp.snapBarLabel') }}</span>
    <span class="experiment__snap-bar-range">
      {{ sweepWindow.lo.toFixed(0) }} - {{ sweepWindow.hi.toFixed(0) }}
      {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}
    </span>
    <span class="experiment__snap-bar-affects">{{ sweepWindow.param === 'field' ? $t('exp.snapBarSubField') : $t('exp.snapBarSubFreq') }} {{ Math.round((sweepWindow.lo + sweepWindow.hi) / 2) }} {{ sweepWindow.param === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}</span>
    <span v-if="snapConfirming" class="experiment__snap-bar-lysis-warn">{{ $t('exp.snapBarLysisWarn', { cellLabel: snapLysisCellLabel }) }}</span>
    <div class="experiment__snap-confirm-row">
      <template v-if="!snapConfirming && !snapConfirmed">
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
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { tipSnapBar as tipSnapBarFn } from '@/tooltips/experimentTooltips'
import { formatLysisTime } from '@/tooltips/sliderTooltips'
import { SNAP_CONFIRM_MS } from '@/constants/experimentDefaults'

type SweepWindow = { lo: number; hi: number; param: 'field' | 'freq' }

export default defineComponent({
  name: 'SnapBar',

  setup() {
    return { store: useCellStore() }
  },

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
    'store.target.id'() { this.snapConfirmed = false },
    'store.resetCounter'() { this.snapConfirmed = false },
  },

  computed: {
    tipSnapBar(): string {
      return tipSnapBarFn(this.sweepWindow)
    },

    snapLysisCellLabel(): string {
      return `${this.store.target.label} (~${formatLysisTime(this.store.lysisDelayMs)})`
    },
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
        this.store.setFieldIntensity(center)
      } else {
        this.store.setBroadcastFreqKHz(center)
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
/* ── Therapeutic window snap bar ─────────────────────────────── */
.experiment__snap-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1.1rem;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%);
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: var(--radius);
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
}

.experiment__snap-bar-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(34, 197, 94, 0.9);
  white-space: nowrap;
}

.experiment__snap-bar-range {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-heading);
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 3px;
  padding: 0.1rem 0.45rem;
  white-space: nowrap;
}

.experiment__snap-bar-affects {
  font-size: 0.66rem;
  color: var(--color-text-muted);
  flex: 1;
  white-space: nowrap;
}

.experiment__snap-bar-lysis-warn {
  font-size: 0.63rem;
  font-family: var(--font-mono);
  color: var(--color-danger);
  opacity: 0.8;
  white-space: nowrap;
}

.experiment__snap-confirm-row {
  margin-left: auto;
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-shrink: 0;
}

.experiment__snap-bar-btn {
  padding: 0.22rem 0.75rem;
  background: rgba(34, 197, 94, 0.14);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 4px;
  color: rgba(34, 197, 94, 0.95);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;

  &:hover {
    background: rgba(34, 197, 94, 0.24);
    border-color: rgba(34, 197, 94, 0.65);
  }

  &--confirm {
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.55);
    color: var(--color-danger);
    animation: snap-confirm-pulse 0.7s ease-in-out infinite alternate;

    &:hover {
      background: rgba(239, 68, 68, 0.24);
      border-color: rgba(239, 68, 68, 0.8);
    }
  }

  &--confirmed {
    opacity: 0.45;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--color-text-muted);

    &:hover {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.15);
    }
  }

  &--cancel {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.18);
    color: var(--color-text-muted);

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.32);
      color: var(--color-text);
    }
  }
}

@keyframes snap-confirm-pulse {
  from { opacity: 0.75; }
  to   { opacity: 1.0; }
}
</style>
