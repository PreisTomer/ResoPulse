<template>
  <div class="instrument">
    <div class="instrument__inner">

      <!-- Page header -->
      <div class="instrument__header">
        <div class="instrument__eyebrow">
          <span class="instrument__eyebrow-dot"></span>
          {{ $t('instrument.eyebrow') }}
        </div>
        <h1 class="instrument__title">{{ $t('instrument.title') }}</h1>
        <p class="instrument__subtitle">{{ $t('instrument.subtitle') }}</p>
      </div>

      <!-- Physics callout: why impedance matters -->
      <div class="instrument__callout">
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">Ion Release Model</div>
          <div class="instrument__callout-formula">
            σ_e(t) = σ_e₀ + φ · f<sub>lysed</sub> · (σ_i − σ_e₀) · 0.8
          </div>
          <div class="instrument__callout-note">
            φ = cell volume fraction · f<sub>lysed</sub> from disruption ratio DR
          </div>
        </div>
        <div class="instrument__callout-sep" aria-hidden="true">→</div>
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">Cuvette Impedance</div>
          <div class="instrument__callout-formula">Z = d / (σ_e · A)</div>
          <div class="instrument__callout-note">DC limit · valid for f ≪ 340 MHz in saline</div>
        </div>
        <div class="instrument__callout-sep" aria-hidden="true">→</div>
        <div class="instrument__callout-col">
          <div class="instrument__callout-label">Corrected Generator Output</div>
          <div class="instrument__callout-formula">
            E<sub>gen</sub> = E<sub>target</sub> × (1 + R_s / Z)
          </div>
          <div class="instrument__callout-note">Voltage divider compensation</div>
        </div>
      </div>

      <!-- Live experiment context strip -->
      <div class="instrument__context-strip">
        <div class="instrument__context-item">
          <span class="instrument__context-label">Target Cell</span>
          <span class="instrument__context-value">{{ cellStore.target.label }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">Medium</span>
          <span class="instrument__context-value">{{ $t(`slider.mediums.${cellStore.medium}`) }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">σ_e (base)</span>
          <span class="instrument__context-value">{{ cellStore.effectiveSigmaE.toFixed(3) }} {{ UNIT.S_PER_M }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">Target E</span>
          <span class="instrument__context-value">{{ cellStore.fieldIntensity }} {{ UNIT.V_PER_CM }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">DR (target)</span>
          <span
            class="instrument__context-value"
            :class="{
              'instrument__context-value--warn':   targetDR > 0.5,
              'instrument__context-value--danger': targetDR > 0.85,
            }"
          >{{ (targetDR * 100).toFixed(0) }}%</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">Z nominal</span>
          <span class="instrument__context-value">{{ impStore.nominalImpedanceOhm.toFixed(1) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="instrument__context-item">
          <span class="instrument__context-label">Correction</span>
          <span
            class="instrument__context-value"
            :class="{ 'instrument__context-value--warn': impStore.voltageCorrectionFactor > 1.05 }"
          >×{{ impStore.voltageCorrectionFactor.toFixed(3) }}</span>
        </div>
      </div>

      <!-- Main instrument panel -->
      <InstrumentPanel />

      <!-- PoC caveat -->
      <div class="instrument__poc-note">
        <span class="instrument__poc-icon">{{ ICON.INFO }}</span>
        <div>
          <strong>Proof of Concept — Simulated Mode</strong>
          In simulated mode, impedance drift is computed from the ion-release physics model
          (cell volume fraction × lysed fraction × σ contrast). Switch to
          <em>Live Hardware</em> in the Hardware Input panel to replace this with real measurements
          from a lab impedance analyser or LCR meter connected via the
          <code>impedanceReading</code> socket event.
          See the <a href="/protocol" class="instrument__poc-link">Protocol</a> page for the full hardware integration specification.
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import InstrumentPanel from '@/components/InstrumentPanel/index.vue'
import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'InstrumentView',
  components: { InstrumentPanel },
  setup() {
    return {
      cellStore: useCellStore(),
      impStore:  useImpedanceStore(),
      UNIT,
      ICON,
    }
  },
  computed: {
    targetDR(): number {
      return this.cellStore.targetDisruptionRatio
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

  // ── Page header ──────────────────────────────────────────────────────────────

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__eyebrow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary);
    }
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
    line-height: 1.15;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.65;
    max-width: 72ch;
    margin: 0;
  }

  // ── Physics callout ──────────────────────────────────────────────────────────

  &__callout {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius);
    padding: 1.1rem 1.4rem;
    flex-wrap: wrap;
    row-gap: 0.75rem;

    &-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
      min-width: 160px;
    }

    &-label {
      font-size: 0.65rem;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    &-formula {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--color-text);
    }

    &-note {
      font-size: 0.65rem;
      color: var(--color-text-muted);
    }

    &-sep {
      font-size: 1.5rem;
      color: var(--color-primary);
      opacity: 0.4;
      flex-shrink: 0;
      align-self: center;
    }
  }

  // ── Context strip ─────────────────────────────────────────────────────────────

  &__context-strip {
    display: flex;
    gap: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
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
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  &__context-value {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);

    &--warn   { color: var(--color-amber-warm); }
    &--danger { color: var(--color-danger, #ff4444); }
  }

  // ── PoC note ──────────────────────────────────────────────────────────────────

  &__poc-note {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: var(--radius);
    padding: 1rem 1.2rem;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.6;

    strong { color: var(--color-text); }
    em     { color: var(--color-primary); font-style: normal; }
    code   {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      background: rgba(0, 212, 255, 0.1);
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
    &__callout { flex-direction: column; &-sep { transform: rotate(90deg); } }
  }
}
</style>
