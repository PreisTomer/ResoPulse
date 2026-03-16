<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sonif-toggle" v-tip="tipText">
    <button
      class="sonif-toggle__btn"
      :class="{ 'sonif-toggle__btn--active': enabled }"
      @click="toggle"
      type="button"
      :aria-pressed="enabled"
      aria-label="Toggle auditory display"
    >
      <span class="sonif-toggle__icon">{{ enabled ? '♪' : '♩' }}</span>
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
import { sonification } from '@/services/sonification'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'

export default defineComponent({
  name: 'SonificationToggle',
  data() {
    return {
      enabled: false,
      pitchHz: 0,
      _tickHandle: null as ReturnType<typeof setInterval> | null,
    }
  },
  computed: {
    pitchDisplay(): string {
      return `${this.pitchHz.toFixed(0)} Hz`
    },
    barPct(): number {
      // Map 220–1760 Hz range to 0–100%
      return Math.min(100, Math.max(0, ((this.pitchHz - 220) / 1540) * 100))
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
        const impStore  = useImpedanceStore()
        const cellStore = useCellStore()
        const drift = impStore.impedanceDriftPct
        const dr    = cellStore.targetDisruptionRatio
        // Derive cell state from DR (mirrors CellCard logic without importing it)
        const state = dr >= 1.0 ? 'lysis'
                    : dr >= 0.85 ? 'vibrating'
                    : dr >= 0.5  ? 'rev-ep'
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
    font-size: 0.75rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-text); }

    &--active {
      border-color: var(--color-primary);
      background: rgba(0, 212, 255, 0.08);
      color: var(--color-primary);
    }
  }

  &__icon { font-size: 1rem; }
  &__label { font-weight: 500; }

  &__pitch {
    font-family: var(--font-mono);
    font-size: 0.68rem;
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
    font-size: 0.65rem;
    color: var(--color-text-muted);
    line-height: 1.4;
    padding: 0.3rem 0.4rem;
    border-left: 2px solid rgba(0, 212, 255, 0.3);
    background: rgba(0, 212, 255, 0.04);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
}
</style>
