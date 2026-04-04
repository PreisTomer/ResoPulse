<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div v-if="windowRange" class="sweep-window" v-tip="tipWindow">
    <span class="sweep-window__label">{{ $t("sweep.windowLabel") }}</span>
    <span class="sweep-window__val">
      {{ windowRange.lo.toFixed(0) }} - {{ windowRange.hi.toFixed(0) }}
      {{
        sweepParam === "field" ? $t("sweep.fieldUnit") : $t("sweep.freqUnit")
      }}
    </span>
    <span class="sweep-window__sub" v-html="$t('sweep.windowSub')"></span>
  </div>

  <div v-else class="sweep-window sweep-window--none" v-tip="tipNoWindow">
    <template v-if="recommendedMax !== null">
      <span>{{
        $t("sweep.windowNoneRange", {
          max: recommendedMax,
          unit:
            sweepParam === "field"
              ? $t("sweep.fieldUnit")
              : $t("sweep.freqUnit"),
        })
      }}</span>
      <button
        class="sweep-window__expand"
        @click="$emit(EMIT.EXPAND, recommendedMax)"
      >
        {{ $t("sweep.windowExpandBtn") }}
      </button>
    </template>
    <template v-else-if="bestTIPoint && bestTIPoint.ti < 1.0">
      <span class="sweep-window__counter-sel">{{
        $t("sweep.windowNoneCounterSelective", {
          ti: bestTIPoint.ti.toFixed(2),
        })
      }}</span>
    </template>
    <template v-else>
      <span>{{
        $t("sweep.windowNoneImpossible", {
          ti: bestTIPoint ? bestTIPoint.ti.toFixed(2) : "—",
        })
      }}</span>
    </template>
    <span v-if="bestTIPoint" class="sweep-window__best-ti">
      {{
        $t("sweep.windowBestTI", {
          ti: bestTIPoint.ti.toFixed(2),
          x: bestTIPoint.x.toFixed(0),
          drT: (bestTIPoint.drT * 100).toFixed(0),
          unit:
            sweepParam === "field"
              ? $t("sweep.fieldUnit")
              : $t("sweep.freqUnit"),
        })
      }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import { EMIT } from "@/constants/emitEvents";
import { buildNoSweepWindowTooltip, buildSweepWindowTooltip } from "../lib";

interface SweepPoint {
  x: number;
  drH: number;
  drT: number;
  ti: number;
  tH: number;
  tT: number;
}

export default defineComponent({
  props: {
    windowRange: {
      type: Object as PropType<{ lo: number; hi: number } | null>,
      default: null,
    },
    sweepParam: { type: String as () => "field" | "freq", required: true },
    recommendedMax: { type: Number as PropType<number | null>, default: null },
    bestTIPoint: { type: Object as PropType<SweepPoint | null>, default: null },
  },
  emits: [EMIT.EXPAND],

  computed: {
    EMIT() {
      return EMIT;
    },

    tipWindow(): string {
      return buildSweepWindowTooltip(this.windowRange, this.sweepParam);
    },
    tipNoWindow(): string {
      return buildNoSweepWindowTooltip(this.sweepParam);
    },
  },
});
</script>

<style lang="scss" scoped>
.sweep-window {
  @include flex-row(0.6rem);
  align-items: center;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-ok) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-ok) 25%, transparent);
  border-radius: var(--radius);
  font-size: var(--fs-md);
  gap: 0.4rem 0.7rem;

  &--none {
    background: color-mix(in srgb, white 3%, transparent);
    border-color: var(--color-border);
    color: var(--color-text-muted);
    font-style: italic;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__val {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    color: var(--color-lime);
    font-weight: 600;
  }

  &__counter-sel {
    color: var(--color-danger);
    font-style: normal;
    font-size: var(--fs-sm);
  }

  &__sub {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__expand {
    padding: 0.18rem 0.6rem;
    background: var(--color-primary-surface);
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-style: normal;
    cursor: pointer;
    transition:
      background var(--tr-fast),
      border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 20%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    }
  }

  &__best-ti {
    font-size: var(--fs-xs);
    font-style: normal;
    color: var(--color-text-muted);
    opacity: var(--op-partial);
  }
}
</style>
