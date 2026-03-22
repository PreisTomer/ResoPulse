<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="instrument">
    <div class="instrument__inner">

      <!-- Page header -->
      <div class="instrument__header">
        <PageHeader :eyebrow="$t('instrument.eyebrow')" :title="$t('instrument.title')">
          <p class="instrument__subtitle">{{ $t('instrument.subtitle') }}</p>
        </PageHeader>
      </div>

      <!-- Physics callout: why impedance matters -->
      <div class="instrument__callout">
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">{{ $t('instrument.view.calloutIonTitle') }}</div>
          <div class="instrument__callout-formula" v-html="$t('instrument.view.calloutIonFormula')"></div>
          <div class="instrument__callout-note" v-html="$t('instrument.view.calloutIonNote')"></div>
        </div>
        <div class="instrument__callout-sep" aria-hidden="true">{{ ICON.ARROW_SHORT }}</div>
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">{{ $t('instrument.view.calloutZTitle') }}</div>
          <div class="instrument__callout-formula">{{ $t('instrument.view.calloutZFormula') }}</div>
          <div class="instrument__callout-note">{{ $t('instrument.view.calloutZNote') }}</div>
        </div>
        <div class="instrument__callout-sep" aria-hidden="true">{{ ICON.ARROW_SHORT }}</div>
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">{{ $t('instrument.view.calloutCorrTitle') }}</div>
          <div class="instrument__callout-formula" v-html="$t('instrument.view.calloutCorrFormula')"></div>
          <div class="instrument__callout-note">{{ $t('instrument.view.calloutCorrNote') }}</div>
        </div>
      </div>

      <!-- Live experiment context strip -->
      <div class="instrument__context-strip">
        <div class="instrument__context-item" v-tip="$t('instrument.view.tipContextTarget')">
          <span class="instrument__context-label">{{ $t('instrument.view.contextTarget') }}</span>
          <span class="instrument__context-value">{{ cellStore.target.label }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">{{ $t('instrument.view.contextMedium') }}</span>
          <span class="instrument__context-value">{{ $t(`slider.mediums.${cellStore.medium}`) }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">{{ $t('instrument.view.contextSigmaBase') }}</span>
          <span class="instrument__context-value">{{ cellStore.effectiveSigmaE.toFixed(3) }} {{ UNIT.S_PER_M }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">{{ $t('instrument.view.contextField') }}</span>
          <span class="instrument__context-value">{{ cellStore.fieldIntensity }} {{ UNIT.V_PER_CM }}</span>
        </div>
        <div class="instrument__context-item" v-tip="$t('instrument.view.tipContextDR')">
          <span class="instrument__context-label">{{ $t('instrument.view.contextDR') }}</span>
          <span
            class="instrument__context-value"
            :class="{
              'instrument__context-value--warn':   targetDR > 0.5,
              'instrument__context-value--danger': targetDR > 0.85,
            }"
          >{{ (targetDR * 100).toFixed(0) }}%</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">{{ $t('instrument.view.contextZNominal') }}</span>
          <span class="instrument__context-value">{{ impStore.nominalImpedanceOhm.toFixed(1) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="instrument__context-item" v-tip="$t('instrument.view.tipContextCorrection')">
          <span class="instrument__context-label">{{ $t('instrument.view.contextCorrection') }}</span>
          <span
            class="instrument__context-value"
            :class="{ 'instrument__context-value--warn': impStore.voltageCorrectionFactor > 1.05 }"
          >{{ ICON.TIMES }}{{ impStore.voltageCorrectionFactor.toFixed(3) }}</span>
        </div>
        <div class="instrument__context-item" v-tip="$t('instrument.view.tipContextJoule')">
          <span class="instrument__context-label">{{ $t('instrument.view.contextJoule') }}</span>
          <span
            class="instrument__context-value"
            :class="{ 'instrument__context-value--warn': impStore.mediumTempRiseRatePerSec > 1 }"
          >{{ jouleDisplay }}</span>
        </div>
      </div>

      <!-- Main instrument panel -->
      <InstrumentPanel id="hl-instrument-panel" />

      <!-- PoC caveat -->
      <div class="instrument__poc-note">
        <span class="instrument__poc-icon">{{ ICON.INFO }}</span>
        <div>
          <strong>{{ $t('instrument.view.pocTitle') }}</strong><br>
          <span v-html="$t('instrument.view.pocBody')"></span>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useUiStore } from '@/stores/uiStore'
import InstrumentPanel from '@/components/InstrumentPanel/index.vue'
import PageHeader from '@/components/PageHeader.vue'
import { scrollAndHighlight } from '@/utils/highlight'
import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'InstrumentView',
  components: { InstrumentPanel, PageHeader },
  setup() {
    return {
      cellStore: useCellStore(),
      impStore:  useImpedanceStore(),
      uiStore:   useUiStore(),
      UNIT,
      ICON,
    }
  },

  mounted() {
    const targetId = this.uiStore.pendingHighlight
    if (targetId) {
      this.uiStore.clearPendingHighlight()
      scrollAndHighlight(targetId, 300)
    }
  },

  computed: {
    targetDR(): number {
      return this.cellStore.targetDisruptionRatio
    },
    /** Medium Joule heating display: show mW or W depending on magnitude. */
    jouleDisplay(): string {
      const mW = this.impStore.mediumJouleHeatingMilliWatts
      if (mW >= 1000) return `${(mW / 1000).toFixed(2)} ${this.UNIT.W}`
      if (mW >= 1)    return `${mW.toFixed(1)} ${this.UNIT.MW}`
      return `${mW.toFixed(3)} ${this.UNIT.MW}`
    },
  },
})
</script>

<style lang="scss" scoped>


.instrument {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 2rem 0 4rem;

  &__inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  // ── Page header (PageHeader owns eyebrow/dot/title) ─────────────────────────

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__subtitle {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.65;
    margin: 0;
  }

  // ── Physics callout ──────────────────────────────────────────────────────────

  &__callout {
    @include surface-card(var(--radius), 1.25rem 1.5rem);
    display: grid;
    grid-template-columns: auto auto auto auto auto;
    justify-content: space-between;
    align-items: start;
    gap: 0;
    border-left: 3px solid var(--color-primary);

    &-col {
      @include flex-col(0.3rem);
      padding: 0 0.75rem;
    }

    &-label {
      @include mono-upper(0.6rem, 0.1em);
      color: var(--color-primary);
      font-weight: 600;
    }

    &-formula {
      font-family: var(--font-mono);
      font-size: var(--fs-md);
      color: var(--color-text);
      line-height: 1.6;
      word-break: break-word;
    }

    &-note {
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    &-sep {
      font-size: 1.25rem;
      color: var(--color-primary);
      opacity: var(--op-ghost);
      flex-shrink: 0;
      padding: 0 0.25rem;
      align-self: center;
    }
  }

  // ── Context strip ─────────────────────────────────────────────────────────────

  &__context-strip {
    @include surface-card(var(--radius));
    display: flex;
    gap: 0;
    overflow: hidden;
    flex-wrap: wrap;
  }

  &__context-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.65rem 1rem;
    border-right: 1px solid var(--color-border);
    flex: 1;
    min-width: 100px;

    &:last-child { border-right: none; }
  }

  &__context-label {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  &__context-value {
    font-family: var(--font-mono);
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);

    &--warn   { color: var(--color-amber-warm); }
    &--danger { color: var(--color-danger); }
  }

  // ── PoC note ──────────────────────────────────────────────────────────────────

  &__poc-note {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-radius: var(--radius);
    padding: 1rem 1.2rem;
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    line-height: 1.6;

    strong { color: var(--color-text); }
    em     { color: var(--color-primary); font-style: normal; }
    code   {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      color: var(--color-primary);
    }
  }

  &__poc-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  &__poc-link {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

@media (max-width: 768px) {
  .instrument {
    padding: 1rem 0 3rem;

    &__inner { padding: 0 1rem; gap: 1.5rem; }
    &__title { font-size: 1.5rem; }
    &__callout {
      grid-template-columns: 1fr;
      &-col { padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border); &:last-child { border-bottom: none; } }
      &-sep { display: none; }
    }
  }
}
</style>
