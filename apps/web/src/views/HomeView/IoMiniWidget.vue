<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="iomw">
    <div class="iomw__head">
      <span class="iomw__label">{{ $t('home.ioMiniLabel') }}</span>
      <span class="iomw__sub">{{ $t('home.ioMiniSub') }}</span>
    </div>

    <div class="iomw__controls">
      <div class="iomw__row">
        <span class="iomw__row-label">{{ $t('home.ioMiniFieldLabel') }}</span>
        <input
          type="range"
          class="iomw__slider"
          :min="E_MIN"
          :max="E_MAX"
          :step="E_STEP"
          v-model.number="E_vcm"
        />
        <span class="iomw__row-val">{{ E_vcm }} {{ UNIT.V_PER_CM }}</span>
      </div>

      <div class="iomw__row">
        <span class="iomw__row-label">{{ $t('home.ioMiniFreqLabel') }}</span>
        <input
          type="range"
          class="iomw__slider"
          :min="F_POS_MIN"
          :max="F_POS_MAX"
          :step="F_POS_STEP"
          v-model.number="fPos"
        />
        <span class="iomw__row-val">{{ fDisplay }}</span>
      </div>
    </div>

    <div class="iomw__out" :class="{ 'iomw__out--win': inWindow }">
      <span class="iomw__out-item">
        <span class="iomw__out-k">V_m,T</span>
        <span class="iomw__out-v iomw__out-v--target">{{ vmTDisplay }}</span>
      </span>
      <span class="iomw__out-item">
        <span class="iomw__out-k">V_m,H</span>
        <span class="iomw__out-v iomw__out-v--healthy">{{ vmHDisplay }}</span>
      </span>
      <span class="iomw__out-item">
        <span class="iomw__out-k">DR_T</span>
        <span class="iomw__out-v iomw__out-v--target">{{ drTDisplay }}</span>
      </span>
      <span class="iomw__out-item">
        <span class="iomw__out-k">DR_H</span>
        <span class="iomw__out-v iomw__out-v--healthy">{{ drHDisplay }}</span>
      </span>
      <span class="iomw__out-item iomw__out-item--ti">
        <span class="iomw__out-k">TI</span>
        <span class="iomw__out-v iomw__out-v--ti">{{ tiDisplay }}</span>
      </span>
      <span v-if="inWindow" class="iomw__win-badge">{{ $t('home.ioMiniWindowBadge') }}</span>
    </div>

    <p class="iomw__disclosure">{{ $t('home.ioMiniDisclosure') }}</p>

    <div class="iomw__foot">
      <p class="iomw__caption">{{ $t('home.ioMiniCaption') }}</p>
      <RouterLink :to="ROUTE.EXPERIMENT" class="iomw__cta">{{ $t('home.ioMiniCtaLab') }} {{ ICON.ARROW_R }}</RouterLink>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { SCHWAN_SPHERE_FACTOR, TWO_PI, V_CM_TO_V_M, KHZ_TO_HZ } from '@/constants/physics'
import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

// Demo cells differ in R, Cm, σ_i, V_thr (representative ranges, not a specific line — citations below widget).
const UM_TO_M = 1e-6
const SIGMA_E_S_M = 1.5      // saline external conductivity, typical EP buffer

interface DemoCell {
  radius_um: number
  Cm_F_m2:   number   // membrane capacitance
  sigma_i:   number   // cytoplasm conductivity
  V_thr:     number   // lysis threshold voltage
}

// Target cancer-like: ↑R, ↑Cm, ↑σ_i, ↓V_thr (Pethig 2010; Anand 2019; Polevaya 1999).
const TARGET: DemoCell = {
  radius_um: 10,
  Cm_F_m2:   0.015,
  sigma_i:   0.7,
  V_thr:     0.9,
}

// Healthy PBMC-like: ↓R, baseline Cm/σ_i, ↑V_thr (Gascoyne 1992; Pauly & Schwan 1966; Polevaya 1999).
const HEALTHY: DemoCell = {
  radius_um: 4,
  Cm_F_m2:   0.009,
  sigma_i:   0.3,
  V_thr:     1.1,
}

// ── Slider bounds ──
const E_MIN    = 100
const E_MAX    = 2000
const E_STEP   = 10
// Default E starts BELOW the selectivity window so the scientist has to discover it by
// dragging up. Landing the window as a reward, not a default, avoids the "rigged demo" read.
const E_DEFAULT = 400

// Frequency slider maps position [F_POS_MIN..F_POS_MAX] to f in kHz via log interpolation
// so the full rolloff is visible in linear slider travel.
const F_POS_MIN  = 0
const F_POS_MAX  = 1000
const F_POS_STEP = 1
const F_MIN_KHZ  = 10
const F_MAX_KHZ  = 5000
// Default f = 100 kHz: well below both cells' fc, Schwan in quasi-DC regime.
// pos = log(100/10) / log(5000/10) · 1000 ≈ 371
const F_DEFAULT_POS = 371

// Window thresholds (visual cue when the scientist finds a selective spot)
const WINDOW_DR_T_MIN = 0.80
const WINDOW_DR_H_MAX = 0.40

// Display scale thresholds for Vm formatting
const VM_MV_THRESHOLD = 1.0  // V → mV when |Vm| < 1 V

// Schwan Vm for the demo pair: Vm = 1.5·E·R·cosθ / √(1+(ωτ)²), cosθ = 1.
// Inlined rather than going through CellConfig since the demo uses fixed synthetic cells.
function demoVm(cell: DemoCell, E_vcm: number, f_khz: number): number {
  const R_m   = cell.radius_um * UM_TO_M
  const tau   = R_m * cell.Cm_F_m2 * (2 * SIGMA_E_S_M + cell.sigma_i) / (2 * SIGMA_E_S_M * cell.sigma_i)
  const omega = TWO_PI * f_khz * KHZ_TO_HZ
  return (SCHWAN_SPHERE_FACTOR * E_vcm * V_CM_TO_V_M * R_m) / Math.sqrt(1 + (omega * tau) ** 2)
}

export default defineComponent({
  name: 'IoMiniWidget',

  data() {
    return {
      E_vcm:      E_DEFAULT,
      fPos:       F_DEFAULT_POS,
      E_MIN, E_MAX, E_STEP,
      F_POS_MIN, F_POS_MAX, F_POS_STEP,
    }
  },

  computed: {
    UNIT()  { return UNIT },
    ICON()  { return ICON },
    ROUTE() { return ROUTE },

    fKhz(): number {
      // Log-space mapping so the full decade range is reachable with smooth slider travel
      const t = (this.fPos - F_POS_MIN) / (F_POS_MAX - F_POS_MIN)
      return F_MIN_KHZ * Math.pow(F_MAX_KHZ / F_MIN_KHZ, t)
    },

    fDisplay(): string {
      const khz = this.fKhz
      if (khz >= 1000) return `${(khz / 1000).toFixed(2)} MHz`
      if (khz >= 100)  return `${Math.round(khz)} kHz`
      return `${khz.toFixed(1)} kHz`
    },

    vmT(): number { return demoVm(TARGET,  this.E_vcm, this.fKhz) },
    vmH(): number { return demoVm(HEALTHY, this.E_vcm, this.fKhz) },

    drT(): number { return this.vmT / TARGET.V_thr },
    drH(): number { return this.vmH / HEALTHY.V_thr },

    ti(): number {
      if (this.drH < 0.01) return this.drT > 0 ? Infinity : 0
      return this.drT / this.drH
    },

    vmTDisplay(): string { return formatVm(this.vmT) },
    vmHDisplay(): string { return formatVm(this.vmH) },
    drTDisplay(): string { return this.drT.toFixed(2) },
    drHDisplay(): string { return this.drH.toFixed(2) },

    tiDisplay(): string {
      if (!isFinite(this.ti)) return '> 30'
      if (this.ti < 0.1)      return '—'
      return `${this.ti.toFixed(1)}x`
    },

    inWindow(): boolean {
      return this.drT >= WINDOW_DR_T_MIN && this.drH <= WINDOW_DR_H_MAX
    },
  },
})

// Vm display: mV below 1 V, V otherwise — one row stays compact across the full slider sweep.
function formatVm(vm: number): string {
  if (vm < VM_MV_THRESHOLD) return `${(vm * 1000).toFixed(0)} mV`
  return `${vm.toFixed(2)} V`
}
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.iomw {
  @include flex-col(0.85rem);
  margin-top: 1.5rem;
  padding: 1rem 1.1rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--color-primary) 4%, transparent);

  &__head {
    @include flex-col(0.2rem);
    align-items: flex-start;
  }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-primary);
    font-weight: 700;
  }

  &__sub {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    line-height: 1.4;
  }

  &__controls {
    @include flex-col(0.55rem);
    padding: 0.4rem 0 0.25rem;
  }

  &__row {
    @include flex-row(0.85rem);
    align-items: center;
  }

  &__row-label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-muted);
    opacity: var(--op-partial);
    min-width: 4.5rem;
    flex-shrink: 0;
  }

  &__slider {
    @include slider-track();
    @include slider-thumb(
      var(--color-primary),
      color-mix(in srgb, var(--color-primary) 55%, transparent)
    );
    flex: 1 1 auto;
    min-width: 0;
    height: 4px;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    border-radius: 3px;
    cursor: pointer;
  }

  &__row-val {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);
    min-width: 5.5rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__out {
    @include flex-row(1rem);
    flex-wrap: wrap;
    align-items: baseline;
    padding: 0.6rem 0.75rem;
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    border-radius: var(--radius);
    transition: border-color var(--tr-normal), background var(--tr-normal);

    &--win {
      border-color: color-mix(in srgb, var(--color-ok) 55%, transparent);
      background: color-mix(in srgb, var(--color-ok) 7%, transparent);
    }
  }

  &__out-item {
    @include flex-row(0.35rem);
    align-items: baseline;

    &--ti {
      margin-left: auto;
    }
  }

  &__out-k {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__out-v {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);

    &--target  { color: var(--color-danger); }
    &--healthy { color: var(--color-primary); }

    &--ti {
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--color-text);
    }
  }

  &__win-badge {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-ok);
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--color-ok) 55%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-ok) 10%, transparent);
    animation: iomw-win-pulse 1.4s ease-in-out infinite;
  }

  &__disclosure {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    margin: 0;
    line-height: 1.5;
    padding: 0.5rem 0.75rem;
    border-left: 2px solid color-mix(in srgb, var(--color-border) 80%, transparent);
    background: color-mix(in srgb, var(--color-text) 2%, transparent);
    border-radius: 0 3px 3px 0;
  }

  &__foot {
    @include flex-row(1rem);
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    padding-top: 0.25rem;
  }

  &__caption {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    margin: 0;
    font-style: italic;
    line-height: 1.45;
    flex: 1 1 18rem;
    min-width: 0;
  }

  &__cta {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
    border-radius: var(--radius);
    transition: background var(--tr-fast), border-color var(--tr-fast);
    flex-shrink: 0;

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      border-color: var(--color-primary);
    }
  }
}

@keyframes iomw-win-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.65; }
}
</style>
