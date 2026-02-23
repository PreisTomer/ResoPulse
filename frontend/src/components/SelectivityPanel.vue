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
  },

  methods: {
    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('target', preset)
    },
    loadHealthy(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('healthy', preset)
    },
  },
})
</script>

<template>
  <div class="sel-panel">
    <div class="panel-title">Selectivity Analysis</div>

    <!-- ── Selectivity ratio ──────────────────────────────────── -->
    <div class="sel-ratio-wrap">
      <span class="sel-ratio" :style="{ color: selectivityColor }">
        ×{{ selectivity.toFixed(2) }}
      </span>
      <span class="sel-ratio-label">Target / Healthy Vm ratio</span>
    </div>

    <!-- ── Disruption progress bars ──────────────────────────── -->
    <div class="disruption-bars">
      <div class="bar-row">
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
      <div class="bar-row">
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
      <span class="mode-badge" :style="{ color: modeBadge.color, borderColor: modeBadge.color + '55' }">
        {{ modeBadge.label }}
      </span>
      <span class="optimal-note">{{ optimalNote }}</span>
    </div>

    <!-- ── Target cell library ────────────────────────────────── -->
    <div class="library-section">
      <div class="lib-title">Target Cell Library</div>
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
            :title="p.notes"
            @click="loadTarget(p)"
          >{{ p.shortLabel }}</button>
        </div>
      </div>
    </div>

    <!-- ── Healthy baseline ───────────────────────────────────── -->
    <div class="library-section">
      <div class="lib-title">Healthy Baseline</div>
      <div class="lib-pills">
        <button
          v-for="p in healthyPresets"
          :key="p.presetId"
          class="preset-pill"
          :class="{ 'preset-pill--active': activeHealthyId === p.id }"
          :style="activeHealthyId === p.id ? { borderColor: GROUP_COLORS.reference, color: GROUP_COLORS.reference } : {}"
          :title="p.notes"
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
  color: var(--color-text-muted);
  opacity: 0.65;
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
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Disruption bars ─────────────────────────────────────────── */
.disruption-bars { display: flex; flex-direction: column; gap: 0.35rem; }
.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-lbl {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text-muted); width: 1rem; text-align: right; flex-shrink: 0;
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
  color: var(--color-text-muted); width: 2.2rem; text-align: right; flex-shrink: 0;
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
  color: var(--color-text-muted); opacity: 0.55;
  line-height: 1.5;
}

/* ── Library sections ────────────────────────────────────────── */
.library-section { display: flex; flex-direction: column; gap: 0.35rem; }
.lib-title {
  font-size: 0.58rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text-muted); opacity: 0.55;
}
.lib-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }
.lib-group-label {
  font-size: 0.55rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  opacity: 0.7;
}
.lib-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.preset-pill {
  font-size: 0.58rem; font-family: var(--font-mono);
  padding: 0.18rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
  white-space: nowrap;
}
.preset-pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
.preset-pill--active { background-color: rgba(255,255,255,0.05); }
</style>
