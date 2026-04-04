<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sweep-panel">
    <AccordionPanel
      :icon="ICON.RELOAD"
      :title="$t('sweep.title')"
      :subtitle="sweepSubtitle"
      @open-change="onAccordionChange"
    >
      <div class="sweep-panel__body">
        <SweepControls
          :sweep-param="sweepParam"
          :sweep-max="sweepMax"
          :default-freq-max="defaultFreqMax"
          @param-change="onParamChange"
          @max-change="sweepMax = $event"
          @export="exportCSV"
        />

        <SweepChart
          :sweep-data="sweepData"
          :sweep-param="sweepParam"
          :sweep-max="sweepMax"
          :open="open"
        />

        <SweepWindowInfo
          :window-range="windowRange"
          :sweep-param="sweepParam"
          :recommended-max="recommendedMax"
          :best-t-i-point="bestTIPoint"
          @expand="sweepMax = $event"
        />

        <SweepKeyPoints :key-points="keyPoints" :sweep-param="sweepParam" />
      </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapStores } from "pinia";

import { useCellStore } from "@/stores/cellStore";

import { AccordionPanel } from "@/components/ui";

import { isActiveResonanceTarget } from "@/utils/cellModel";
import { formatFreqKHz } from "@/utils/format";
import { downloadText } from "@/utils/experimentExport";

import { WAVEFORM, CELL_CATEGORY } from "@/constants/strings";
import { THRESHOLDS } from "@/constants/physics";
import { ICON } from "@/constants/icons";
import { UNIT } from "@/constants/units";
import { EMIT } from "@/constants/emitEvents";

import type { CellConfig } from "@/types/cell";

import {
  SweepChart,
  SweepControls,
  SweepKeyPoints,
  SweepWindowInfo,
} from "./components";
import {
  buildSweepPoint,
  isSweepPointInSelectiveWindow,
  type SweepPoint,
} from "./lib";

const N_POINTS = 400; // 400 pts over sweep range → detects windows as narrow as ~0.25% of range

interface KeyPoint {
  label: string;
  x: number;
  drH: number;
  drT: number;
  ti: number;
  tH: number;
  tT: number;
}

export default defineComponent({
  components: {
    AccordionPanel,
    SweepControls,
    SweepChart,
    SweepWindowInfo,
    SweepKeyPoints,
  },
  emits: [EMIT.WINDOW_CHANGE, EMIT.OPEN_CHANGE],

  data() {
    return {
      open: false,
      sweepParam: "field" as "field" | "freq",
      sweepMax: 1000,
    };
  },

  computed: {
    ICON() {
      return ICON;
    },
    ...mapStores(useCellStore),

    isResonanceTarget(): boolean {
      return isActiveResonanceTarget(
        this.cellStore.target,
        this.cellStore.targetCellCategory,
        this.cellStore.isResonanceMode,
      );
    },

    // Category sweep max: mammalian=5MHz, bacteria=200MHz, virus=500MHz (GHz inaccessible)
    defaultFreqMax(): number {
      const cat = this.cellStore.targetCellCategory;
      if (cat === CELL_CATEGORY.BACTERIA) return 200_000; // 200 MHz in kHz
      if (cat === CELL_CATEGORY.VIRUS) return 500_000; // 500 MHz in kHz
      return 5_000; // 5 MHz for mammalian
    },

    sweepSubtitle(): string {
      if (this.sweepParam === "field") {
        return `E: 0 - ${this.sweepMax} ${UNIT.V_PER_CM} @ ${formatFreqKHz(this.cellStore.currentBroadcastFrequency, 1)}`;
      }
      return `f: 0 - ${formatFreqKHz(this.sweepMax, 1)} @ ${this.cellStore.fieldIntensity} ${UNIT.V_PER_CM}`;
    },

    sweepData(): SweepPoint[] {
      const cellStore = this.cellStore;
      const sigma_e = cellStore.effectiveSigmaE;
      const cosTheta = cellStore.cosThetaFactor;
      const waveform = cellStore.waveform;
      const dc = cellStore.dutyCycle;
      const pwNs = cellStore.pulseWidthNs;
      const freqKHz = cellStore.currentBroadcastFrequency;
      const E = cellStore.fieldIntensity;
      const healthy = cellStore.healthy;
      const target = cellStore.target;
      const perfRate = cellStore.perfusionRate;

      const t = target as CellConfig & {
        resonantFreqGHz?: number;
        capsidQ?: number;
        resonantThresholdVcm?: number;
      };
      const targetResonance = this.isResonanceTarget
        ? {
            resonantFreqGHz: t.resonantFreqGHz!,
            capsidQ: t.capsidQ,
            resonantThresholdVcm: t.resonantThresholdVcm!,
          }
        : undefined;

      const points: SweepPoint[] = [];
      for (let i = 0; i <= N_POINTS; i++) {
        const x = (i / N_POINTS) * this.sweepMax;
        points.push(
          buildSweepPoint({
            sweepParam: this.sweepParam,
            sweepValue: x,
            fixedFieldVcm: E,
            fixedFreqKHz: freqKHz,
            healthy,
            target,
            sigmaE: sigma_e,
            cosTheta,
            waveform,
            dutyCycle: dc,
            pulseWidthNs: pwNs,
            perfusionRate: perfRate,
            resonanceTarget: targetResonance,
          }),
        );
      }
      return points;
    },

    windowRange(): { lo: number; hi: number } | null {
      let lo = -1,
        hi = -1;
      for (const p of this.sweepData) {
        if (isSweepPointInSelectiveWindow(p)) {
          if (lo < 0) lo = p.x;
          hi = p.x;
        }
      }
      return lo >= 0 ? { lo, hi } : null;
    },

    bestTIPoint(): SweepPoint | null {
      const pts = this.sweepData.filter((p) => p.x > 0);
      if (!pts.length) return null;
      return pts.reduce((a, b) => (b.ti > a.ti ? b : a));
    },

    hasTheoreticalWindow(): boolean {
      const minTI = THRESHOLDS.DISRUPTION_WARN / THRESHOLDS.HEALTHY_APPROACHING;
      return this.sweepData.some((p) => p.ti > minTI);
    },

    recommendedMax(): number | null {
      if (this.windowRange || !this.hasTheoreticalWindow) return null;
      const maxDrT = Math.max(0, ...this.sweepData.map((p) => p.drT));
      if (maxDrT < 1e-6) return null;
      const needed = (THRESHOLDS.DISRUPTION_WARN / maxDrT) * this.sweepMax;
      return Math.ceil((needed * 1.2) / 100) * 100; // 20% buffer, round to nearest 100
    },

    keyPoints(): KeyPoint[] {
      const pts = this.sweepData;
      const thresholds = [
        {
          label: this.$t("sweep.keyRevEp"),
          drTMin: THRESHOLDS.HEALTHY_APPROACHING,
        },
        {
          label: this.$t("sweep.keyLysisArmed"),
          drTMin: THRESHOLDS.DISRUPTION_WARN,
        },
        {
          label: this.$t("sweep.keyLysis"),
          drTMin: THRESHOLDS.LYSIS_PROB_CENTER,
        },
      ];
      return thresholds.flatMap(({ label, drTMin }) => {
        const pt = pts.find((p) => p.drT >= drTMin);
        if (!pt) return [];
        const unit =
          this.sweepParam === "field"
            ? this.$t("sweep.fieldUnit")
            : this.$t("sweep.freqUnit");
        return [{ ...pt, label: `${label} @ ${pt.x.toFixed(0)} ${unit}` }];
      });
    },
  },

  watch: {
    open(v: boolean) {
      this.$emit(EMIT.OPEN_CHANGE, v);
    },
    windowRange(val: { lo: number; hi: number } | null) {
      this.$emit(
        EMIT.WINDOW_CHANGE,
        val ? { ...val, param: this.sweepParam } : null,
      );
    },
    sweepParam() {
      this.$emit(
        EMIT.WINDOW_CHANGE,
        this.windowRange
          ? { ...this.windowRange, param: this.sweepParam }
          : null,
      );
    },
  },

  methods: {
    onAccordionChange(v: boolean) {
      this.open = v;
    },

    onParamChange({ param, max }: { param: "field" | "freq"; max: number }) {
      this.sweepParam = param;
      this.sweepMax = max;
    },

    exportCSV() {
      const { cellStore } = this;
      const meta = [
        `# ResoPulse: ${this.sweepParam === "field" ? "Field" : "Frequency"} Sweep Export`,
        `# Exported: ${new Date().toISOString()}`,
        `# Healthy: ${cellStore.healthy.label} · R=${cellStore.healthy.radius} ${UNIT.UM} · fc=${cellStore.healthyFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Target:  ${cellStore.target.label} · R=${cellStore.target.radius} ${UNIT.UM} · fc=${cellStore.targetFc.toFixed(0)} ${UNIT.KHZ}`,
        `# Medium: ${cellStore.medium} · σ_e=${cellStore.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
        `# Fixed: ${this.sweepParam === "field" ? `freq=${cellStore.currentBroadcastFrequency} ${UNIT.KHZ}` : `field=${cellStore.fieldIntensity} ${UNIT.V_PER_CM}`} · ${cellStore.waveform} · dc=${cellStore.dutyCycle.toExponential(2)} · pw=${cellStore.pulseWidthNs} ${UNIT.NS}`,
        `# Model: Schwan equation (Kotnik & Miklavcic 2000), ResoPulse`,
      ].join("\n");
      const header =
        this.sweepParam === "field"
          ? "E_field_Vcm,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,selective_window"
          : "freq_kHz,DR_healthy,DR_target,TI,T_healthy_C,T_target_C,selective_window";
      const rows = this.sweepData.map((p) => {
        const inWindow = isSweepPointInSelectiveWindow(p) ? 1 : 0;
        return `${p.x.toFixed(2)},${p.drH.toFixed(4)},${p.drT.toFixed(4)},${p.ti.toFixed(4)},${p.tH.toFixed(2)},${p.tT.toFixed(2)},${inWindow}`;
      });
      downloadText(
        meta + "\n" + header + "\n" + rows.join("\n"),
        `sweep_${this.sweepParam}_${Date.now()}.csv`,
        "text/csv",
      );
    },
  },
});
</script>

<style lang="scss" scoped>
.sweep-panel {
  @include surface-card(var(--radius-lg));
  overflow: hidden;

  &__body {
    @include flex-col(0.75rem);
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-border);
  }
}
</style>
