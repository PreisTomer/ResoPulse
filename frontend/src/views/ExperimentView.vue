<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { connectSocket } from '../services/socket'
import CellCard from '../components/CellCard.vue'
import FrequencySlider from '../components/FrequencySlider.vue'
import FrequencyResponseChart from '../components/FrequencyResponseChart.vue'
import SelectivityPanel from '../components/SelectivityPanel.vue'
import ExperimentLog from '../components/ExperimentLog.vue'
import { useExperimentStore } from '../stores/experimentStore'

export default defineComponent({
  components: {
    CellCard,
    FrequencySlider,
    FrequencyResponseChart,
    SelectivityPanel,
    ExperimentLog,
  },

  setup() {
    const store = useCellStore()
    const expStore = useExperimentStore()
    connectSocket()
    store.startSession()
    return { store, expStore }
  },

  computed: {
    mediumLabel(): string {
      const labels: Record<string, string> = {
        saline: 'Saline',
        blood:  'Blood',
        tissue: 'Tissue',
        water:  'Water',
      }
      return labels[this.store.medium] ?? this.store.medium
    },

    connectionStatus(): { label: string; color: string } {
      // socket service sets a flag we can read; fall back to "Local" when not connected
      return { label: 'Local Mode', color: '#fbbf24' }
    },

    cells() {
      return [
        {
          id: 'healthy',
          type: 'healthy' as const,
          label: this.$t('cells.healthy.label'),
          sublabel: this.$t('cells.healthy.sublabel'),
          description: this.$t('cells.healthy.description'),
          buttonText: this.$t('cells.healthy.button'),
          cellData: this.store.healthy,
        },
        {
          id: 'target',
          type: 'target' as const,
          label: this.$t('cells.target.label'),
          sublabel: this.$t('cells.target.sublabel'),
          description: this.$t('cells.target.description'),
          buttonText: this.$t('cells.target.button'),
          cellData: this.store.target,
        },
      ]
    },
  },
})
</script>

<template>
  <div class="experiment-page">

    <!-- ── Session status bar ───────────────────────────────────── -->
    <div class="session-bar">
      <div class="session-bar-left">
        <span class="sb-brand">◎ BioResonance</span>
        <span class="sb-sep">·</span>
        <input
          v-model="expStore.sessionName"
          class="sb-session-name"
          spellcheck="false"
          :title="'Click to rename session'"
        />
      </div>
      <div class="session-bar-right">
        <span class="sb-chip sb-chip--medium">
          <span class="sb-dot"></span>
          {{ mediumLabel.toUpperCase() }}
        </span>
        <span class="sb-chip sb-chip--freq">
          {{ store.currentBroadcastFrequency }} kHz
        </span>
        <span class="sb-chip sb-chip--field">
          {{ store.fieldIntensity }} V/cm
        </span>
        <span class="sb-chip sb-chip--local">
          <span class="sb-dot sb-dot--warn"></span>
          LOCAL
        </span>
      </div>
    </div>

    <!-- ── Main grid ────────────────────────────────────────────── -->
    <div class="exp-grid">

      <!-- Left column: chart + cell cards + field controls -->
      <div class="exp-left">

        <!-- Frequency Response Chart -->
        <FrequencyResponseChart />

        <!-- Field / medium control panel -->
        <FrequencySlider />

        <!-- Cell visualisation cards -->
        <div class="cell-cards">
          <CellCard
            v-for="cell in cells"
            :key="cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :description="cell.description"
            :button-text="cell.buttonText"
            :cell-data="cell.cellData"
          />
        </div>
      </div>

      <!-- Right column: selectivity + experiment log -->
      <div class="exp-right">
        <SelectivityPanel />
        <ExperimentLog />
      </div>

    </div>
  </div>
</template>

<style scoped>
.experiment-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 0 2rem;
}

/* ── Session bar ─────────────────────────────────────────────── */
.session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.session-bar-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sb-brand {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-primary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.sb-sep {
  color: var(--color-border);
  font-size: 0.75rem;
}

.sb-session-name {
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  color: var(--color-text-heading);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  outline: none;
  min-width: 100px;
  max-width: 200px;
  padding: 0.05rem 0.1rem;
  transition: border-color 0.15s;
}
.sb-session-name:focus {
  border-bottom-color: var(--color-primary);
}

.session-bar-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.sb-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  padding: 0.18rem 0.55rem;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.sb-chip--medium { border-color: rgba(0, 212, 255, 0.3); color: #00d4ff; }
.sb-chip--freq   { border-color: rgba(57, 255, 20, 0.25); color: #39ff14; }
.sb-chip--field  { border-color: rgba(251, 191, 36, 0.3); color: #fbbf24; }
.sb-chip--local  { border-color: rgba(251, 191, 36, 0.3); color: #fbbf24; }

.sb-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #00d4ff;
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}
.sb-dot--warn { background: #fbbf24; animation: none; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Main grid ───────────────────────────────────────────────── */
.exp-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 1.25rem;
  padding: 1.5rem 2rem;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  align-items: start;
}

.exp-left {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.exp-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.cell-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .exp-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .exp-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

@media (max-width: 680px) {
  .session-bar { padding: 0.55rem 1rem; }

  .exp-grid { padding: 0.75rem; gap: 0.85rem; }

  .cell-cards { grid-template-columns: 1fr; }

  .exp-right { grid-template-columns: 1fr; }
}
</style>
