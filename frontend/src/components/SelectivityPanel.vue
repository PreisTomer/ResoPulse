<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '../constants/cellLibrary'
import type { CellGroup } from '../constants/cellLibrary'
import { DISRUPTION_WARN_THRESHOLD } from '../constants/cellCard'

const TARGET_GROUPS: CellGroup[] = ['cancer', 'bacteria', 'virus']
const HEALTHY_GROUP: CellGroup = 'reference'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, GROUP_LABELS }
  },

  computed: {
    selectivity(): number    { return this.store.selectivityRatio },
    targetRatio(): number    { return this.store.targetDisruptionRatio },
    healthyRatio(): number   { return this.store.healthyDisruptionRatio },
    targetRatioPct(): number { return Math.min(100, this.targetRatio * 100) },
    healthyRatioPct(): number { return Math.min(100, this.healthyRatio * 100) },

    selectivityColor(): string {
      if (this.selectivity >= 1.5) return '#39ff14'
      if (this.selectivity >= 1.0) return '#fbbf24'
      return '#ff4d6d'
    },

    modeBadge(): { label: string; color: string } {
      const t = this.targetRatio
      const h = this.healthyRatio
      if (h >= DISRUPTION_WARN_THRESHOLD) return { label: 'Ablative',           color: '#ff4d6d' }
      if (t >= DISRUPTION_WARN_THRESHOLD) return { label: 'Therapeutic Window', color: '#39ff14' }
      if (t >= 0.5)                       return { label: 'Approaching Window', color: '#fbbf24' }
      return                                     { label: 'Sub-threshold',      color: '#00d4ff' }
    },

    optimalNote(): string {
      const targetR  = this.store.target.radius
      const healthyR = this.store.healthy.radius
      if (targetR > healthyR * 5) return 'Quasi-DC optimal · larger target benefits from low frequency'
      if (targetR < healthyR)     return 'MHz range optimal · smaller target has higher fc'
      return 'Quasi-DC preferred · size ratio drives selectivity'
    },

    targetGroups(): CellGroup[] { return TARGET_GROUPS },
    healthyPresets() {
      return CELL_PRESETS.filter((p) => p.group === HEALTHY_GROUP)
    },
    presetsByGroup(): Record<CellGroup, typeof CELL_PRESETS> {
      const out: Partial<Record<CellGroup, typeof CELL_PRESETS>> = {}
      for (const g of TARGET_GROUPS) {
        out[g] = CELL_PRESETS.filter((p) => p.group === g)
      }
      return out as Record<CellGroup, typeof CELL_PRESETS>
    },
    activeTargetId(): string { return this.store.target.id },
    activeHealthyId(): string { return this.store.healthy.id },

    // ── Tooltip content ───────────────────────────────────────────────────
    tipSelectivity(): string {
      const sel = this.selectivity
      const quality = sel >= 1.5
        ? '<span class="tip-ok">Strong therapeutic window</span>'
        : sel >= 1.0
          ? '<span class="tip-warn">Marginal window — adjust field or preset</span>'
          : '<span class="tip-warn">Non-selective — healthy cells equally at risk</span>'
      return `<strong>Selectivity Ratio = T-Vm / H-Vm</strong>
Current: <span class="tip-val">×${sel.toFixed(3)}</span>

${quality}
≥ 1.5 → strong window (green)
1.0–1.5 → marginal (amber)
< 1.0 → non-selective (red)

Physically driven by size ratio R_T/R_H
via the Schwan equation  (Vm ∝ cell radius)`
    },

    tipTargetBar(): string {
      const tVm  = (this.store.targetVm * 1000).toFixed(2)
      const tThr = (this.store.target.thresholdVoltage * 1000).toFixed(0)
      const pct  = this.targetRatioPct.toFixed(0)
      const warn = this.targetRatio >= DISRUPTION_WARN_THRESHOLD
        ? '\n<span class="tip-warn">⚡ >85% — lysis countdown active (2.5 s)</span>' : ''
      return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${tVm} mV</span>
Lysis threshold = ${tThr} mV
Ratio = Vm / threshold${warn}
>85% held for 2.5 s → irreversible lysis`
    },

    tipHealthyBar(): string {
      const hVm  = (this.store.healthyVm * 1000).toFixed(2)
      const hThr = (this.store.healthy.thresholdVoltage * 1000).toFixed(0)
      const pct  = this.healthyRatioPct.toFixed(0)
      const status = this.healthyRatio < 0.5
        ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
        : '\n<span class="tip-warn">⚠ Approaching threshold — reduce field</span>'
      return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${hVm} mV</span>
Lysis threshold = ${hThr} mV
Keep below 50% for therapeutic window${status}`
    },

    tipModeBadge(): string {
      return `<strong>Therapeutic Mode</strong>
Derived from target + healthy disruption ratios:

<span class="tip-ok">Therapeutic Window</span>  T >85%, H <85%
  Target cells at lysis threshold, healthy spared

<span class="tip-val">Approaching Window</span>  T 50–85%
  Increase field to reach therapeutic window

Sub-threshold  T <50%
  Field too low to affect target cells

<span class="tip-warn">Ablative</span>  H >85%
  Non-selective — both cell types disrupted`
    },

    tipOptimal(): string {
      return `<strong>Optimal Frequency Note</strong>
Based on cell radii and characteristic frequencies.

Quasi-DC regime (f ≪ fc):
  Vm = 1.5 × E × R  (linear, size-selective)
MHz range (between fc values):
  Frequency can tune relative Vm between cells
GHz regime (f ≫ fc):
  Membrane becomes transparent to field`
    },
  },

  methods: {
    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('target', preset)
    },
    loadHealthy(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('healthy', preset)
    },
    presetTip(p: typeof CELL_PRESETS[0]): string {
      return `<strong>${p.label}</strong>
${p.notes}

R = <span class="tip-val">${p.radius} µm</span>  ·  membrane = ${p.membraneThickness} nm
ε_r = ${p.dielectricConstant}  ·  σ_i = ${p.conductivity} S/m
Vm threshold = <span class="tip-val">${p.thresholdVoltage} V</span>`
    },
  },
})
</script>

<template>
  <div class="sel-panel">
    <div class="panel-title">Selectivity Analysis</div>

    <!-- ── Selectivity ratio ──────────────────────────────────── -->
    <div class="sel-ratio-wrap" v-tip="tipSelectivity">
      <span class="sel-ratio" :style="{ color: selectivityColor }">
        ×{{ selectivity.toFixed(2) }}
      </span>
      <span class="sel-ratio-label">Target / Healthy Vm ratio</span>
    </div>

    <!-- ── Disruption progress bars ──────────────────────────── -->
    <div class="disruption-bars">
      <div class="bar-row" v-tip="tipTargetBar">
        <span class="bar-lbl">T</span>
        <div class="bar-track">
          <div
            class="bar-fill bar-fill--t"
            :style="{ width: targetRatioPct + '%' }"
            :class="{ 'bar-fill--warn': targetRatio >= 0.85 }"
          ></div>
        </div>
        <span class="bar-val">{{ targetRatioPct.toFixed(0) }}%</span>
      </div>
      <div class="bar-row" v-tip="tipHealthyBar">
        <span class="bar-lbl">H</span>
        <div class="bar-track">
          <div
            class="bar-fill bar-fill--h"
            :style="{ width: healthyRatioPct + '%' }"
            :class="{ 'bar-fill--warn': healthyRatio >= 0.85 }"
          ></div>
        </div>
        <span class="bar-val">{{ healthyRatioPct.toFixed(0) }}%</span>
      </div>
    </div>

    <!-- ── Mode badge ─────────────────────────────────────────── -->
    <div class="mode-row">
      <span
        class="mode-badge"
        :style="{ color: modeBadge.color, borderColor: modeBadge.color + '55' }"
        v-tip="tipModeBadge"
      >
        {{ modeBadge.label }}
      </span>
      <span class="optimal-note" v-tip="tipOptimal">{{ optimalNote }}</span>
    </div>

    <!-- ── Target cell library ────────────────────────────────── -->
    <div class="library-section">
      <div
        class="lib-title"
        v-tip="'<strong>Target Cell Library</strong>\nSelect a pathogen or cancer cell type to use\nas the target in selectivity calculations.\nEach preset has biologically realistic parameters\nfrom bioelectromagnetics literature.'"
      >Target Cell Library</div>
      <div v-for="grp in targetGroups" :key="grp" class="lib-group">
        <span class="lib-group-label" :style="{ color: GROUP_COLORS[grp] }">
          {{ GROUP_LABELS[grp] }}
        </span>
        <div class="lib-pills">
          <button
            v-for="p in presetsByGroup[grp]"
            :key="p.presetId"
            class="preset-pill"
            :class="{ 'preset-pill--active': activeTargetId === p.id }"
            :style="activeTargetId === p.id ? { borderColor: GROUP_COLORS[grp], color: GROUP_COLORS[grp] } : {}"
            v-tip="presetTip(p)"
            @click="loadTarget(p)"
          >{{ p.shortLabel }}</button>
        </div>
      </div>
    </div>

    <!-- ── Healthy baseline ───────────────────────────────────── -->
    <div class="library-section">
      <div
        class="lib-title"
        v-tip="'<strong>Healthy Baseline</strong>\nReference cell used to compute the selectivity ratio.\nSwitch between cell types to model different tissue contexts.'"
      >Healthy Baseline</div>
      <div class="lib-pills">
        <button
          v-for="p in healthyPresets"
          :key="p.presetId"
          class="preset-pill"
          :class="{ 'preset-pill--active': activeHealthyId === p.id }"
          :style="activeHealthyId === p.id ? { borderColor: GROUP_COLORS.reference, color: GROUP_COLORS.reference } : {}"
          v-tip="presetTip(p)"
          @click="loadHealthy(p)"
        >{{ p.shortLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sel-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* ── Panel title ─────────────────────────────────────────────── */
.panel-title {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text);
}

/* ── Selectivity ratio ───────────────────────────────────────── */
.sel-ratio-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
.sel-ratio {
  font-size: 2rem;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: -0.04em;
  line-height: 1;
  transition: color 0.4s;
}
.sel-ratio-label {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Disruption bars ─────────────────────────────────────────── */
.disruption-bars { display: flex; flex-direction: column; gap: 0.35rem; }
.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-lbl {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text); width: 1rem; text-align: right; flex-shrink: 0;
}
.bar-track {
  flex: 1; height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px; overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.bar-fill--t { background: #ff4d6d; }
.bar-fill--h { background: #00d4ff; }
.bar-fill--warn { animation: bar-flash 0.6s ease-in-out infinite alternate; }
@keyframes bar-flash { from { opacity: 1; } to { opacity: 0.5; } }
.bar-val {
  font-size: 0.58rem; font-family: var(--font-mono);
  color: var(--color-text); width: 2.2rem; text-align: right; flex-shrink: 0;
}

/* ── Mode badge ──────────────────────────────────────────────── */
.mode-row { display: flex; flex-direction: column; gap: 0.35rem; }
.mode-badge {
  font-size: 0.62rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  padding: 0.2rem 0.55rem;
  border-radius: 3px;
  border: 1px solid transparent;
  align-self: flex-start;
  transition: color 0.3s, border-color 0.3s;
}
.optimal-note {
  font-size: 0.56rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.85;
  line-height: 1.5;
}

/* ── Library sections ────────────────────────────────────────── */
.library-section { display: flex; flex-direction: column; gap: 0.35rem; }
.lib-title {
  font-size: 0.58rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text);
}
.lib-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }
.lib-group-label {
  font-size: 0.55rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  opacity: 0.9;
}
.lib-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.preset-pill {
  font-size: 0.58rem; font-family: var(--font-mono);
  padding: 0.18rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
  white-space: nowrap;
}
.preset-pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
.preset-pill--active { background-color: rgba(255,255,255,0.05); }
</style>
