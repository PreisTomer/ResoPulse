<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sonif-toggle" v-tip="tipText">
    <button
      class="sonif-toggle__btn"
      :class="{ 'sonif-toggle__btn--active': enabled }"
      @click="toggle"
      type="button"
      :aria-pressed="enabled"
      :aria-label="$t('instrument.sonif.ariaLabel')"
    >
      <span class="sonif-toggle__icon">{{ enabled ? ICON.NOTE_ON : ICON.NOTE_OFF }}</span>
      <span class="sonif-toggle__label">{{ enabled ? $t('instrument.sonif.on') : $t('instrument.sonif.off') }}</span>
      <span v-if="enabled" class="sonif-toggle__pitch">{{ pitchDisplay }}</span>
    </button>
    <div v-if="enabled" class="sonif-toggle__bar-wrap" aria-hidden="true">
      <div class="sonif-toggle__bar" :style="{ width: barPct + '%' }"></div>
    </div>
    <div class="sonif-toggle__disclaimer">{{ $t('instrument.sonif.note') }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'

import { sonification } from '@/services/sonification'

import { THRESHOLDS, SONIF_PITCH_MIN_HZ, SONIF_PITCH_RANGE_HZ } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

export default defineComponent({
  name: 'SonificationToggle',
  data() {
    return {
      enabled: false,
      pitchHz: 0,
      ICON, UNIT,
      _tickHandle: null as ReturnType<typeof setInterval> | null,
    }
  },
  computed: {
    ...mapStores(useImpedanceStore, useCellStore),
    pitchDisplay(): string {
      return `${this.pitchHz.toFixed(0)} ${UNIT.HZ}`
    },
    barPct(): number {
      return Math.min(100, Math.max(0, ((this.pitchHz - SONIF_PITCH_MIN_HZ) / SONIF_PITCH_RANGE_HZ) * 100))
    },
    tipText(): string {
      return this.$t('instrument.sonif.tip')
    },
  },
  methods: {
    toggle() {
      sonification.toggle()
      this.enabled = sonification.enabled
      if (this.enabled) {
        this._startTick()
      } else {
        this._stopTick()
        this.pitchHz = 0
      }
    },
    _startTick() {
      this._stopTick()
      this._tickHandle = setInterval(() => {
        const drift = this.impedanceStore.impedanceDriftPct
        const dr    = this.cellStore.targetDisruptionRatio
        // Derive cell state from DR (mirrors CellCard logic without importing it)
        const state = dr >= 1.0                          ? 'lysis'
                    : dr >= THRESHOLDS.DISRUPTION_WARN   ? 'vibrating'
                    : dr >= THRESHOLDS.HEALTHY_APPROACHING ? 'rev-ep'
                    : 'stable'
        sonification.update(drift, dr, state)
        this.pitchHz = sonification.currentPitchHz
      }, 100)  // 10 Hz update rate
    },
    _stopTick() {
      if (this._tickHandle !== null) {
        clearInterval(this._tickHandle)
        this._tickHandle = null
      }
    },
  },
  beforeUnmount() {
    this._stopTick()
    if (this.enabled) sonification.disable()
  },
})
</script>

<style lang="scss" scoped>
.sonif-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &__btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    font-size: var(--fs-sm);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast), background-color var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-text); }

    &--active {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, transparent);
      color: var(--color-primary);
    }
  }

  &__icon { font-size: var(--fs-2xl); }
  &__label { font-weight: 500; }

  &__pitch {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    margin-left: auto;
  }

  &__bar-wrap {
    height: 3px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.1s linear;
  }

  &__disclaimer {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    line-height: 1.4;
    padding: 0.3rem 0.4rem;
    border-left: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
}
</style>
