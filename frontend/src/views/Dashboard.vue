<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { connectSocket } from '../services/socket'
import CellCard from '../components/CellCard.vue'
import FeatureCard from '../components/FeatureCard.vue'
import FrequencySlider from '../components/FrequencySlider.vue'

export default defineComponent({
  components: {
    CellCard,
    FeatureCard,
    FrequencySlider,
  },

  setup() {
    const store = useCellStore()
    connectSocket() // attempt backend connection; falls back to local mode automatically
    store.startSession() // start 100ms temperature timer
    return { store }
  },

  computed: {
    cells() {
      return [
        {
          id: 'healthy',
          type: 'healthy' as 'healthy' | 'target',
          label: this.$t('cells.healthy.label'),
          sublabel: this.$t('cells.healthy.sublabel'),
          description: this.$t('cells.healthy.description'),
          buttonText: this.$t('cells.healthy.button'),
          cellData: this.store.healthy,
        },
        {
          id: 'target',
          type: 'target' as 'healthy' | 'target',
          label: this.$t('cells.target.label'),
          sublabel: this.$t('cells.target.sublabel'),
          description: this.$t('cells.target.description'),
          buttonText: this.$t('cells.target.button'),
          cellData: this.store.target,
        },
      ]
    },

    features() {
      return [
        {
          id: 'visualization',
          icon: '◈',
          title: this.$t('features.visualization.title'),
          description: this.$t('features.visualization.description'),
          url: undefined,
        },
        {
          id: 'comparative',
          icon: '⇌',
          title: this.$t('features.comparative.title'),
          description: this.$t('features.comparative.description'),
          url: undefined,
        },
        {
          id: 'targeting',
          icon: '◎',
          title: this.$t('features.targeting.title'),
          description: this.$t('features.targeting.description'),
          url: undefined,
        },
        {
          id: 'profiles',
          icon: '⊞',
          title: this.$t('features.profiles.title'),
          description: this.$t('features.profiles.description'),
          url: undefined,
        },
      ]
    },
  },

  methods: {
    onCellClick(_type: 'healthy' | 'target') {
      // TODO: open detail panel for cell
    },

    onFeatureClick(id: string) {
      // Comparative Analysis → boost healthy cell resonance
      if (id === 'comparative') this.store.applyResonance('healthy')
      // Resonance Targeting → disrupt target cell
      if (id === 'targeting') this.store.applyDisruption('target')
    },
  },
})
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">
          <span class="eyebrow-dot"></span>
          {{ $t('hero.eyebrow') }}
        </div>
        <h1 class="hero-title">
          {{ $t('hero.title') }}
          <span class="hero-title-accent">{{ $t('hero.titleAccent') }}</span>
        </h1>
        <p class="hero-description">
          {{ $t('hero.description') }}
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary">{{ $t('hero.loadDataSet') }}</button>
          <button class="btn btn-ghost">{{ $t('hero.viewSampleAnalysis') }}</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="wave-ring ring-1"></div>
        <div class="wave-ring ring-2"></div>
        <div class="wave-ring ring-3"></div>
        <div class="wave-center-logo">
          <img src="/logo.jpg" alt="BioResonance" />
        </div>
      </div>
    </section>

    <!-- Cell Type Cards -->
    <section class="cell-section">
      <div class="section-inner">
        <h2 class="section-title">{{ $t('cells.sectionTitle') }}</h2>
        <p class="section-sub">{{ $t('cells.sectionSub') }}</p>
        <div class="cell-workspace">
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
              @click="onCellClick"
            />
          </div>
          <FrequencySlider />
        </div>
      </div>
    </section>

    <!-- Feature Overview -->
    <section class="features-section">
      <div class="section-inner">
        <div class="features-grid">
          <FeatureCard
            v-for="feature in features"
            :key="feature.id"
            :icon="feature.icon"
            :title="feature.title"
            :description="feature.description"
            :url="feature.url"
            @click="onFeatureClick(feature.id)"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Hero ─────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 3rem;
  max-width: 1440px;
  margin: 0 auto;
  padding: 5rem 2rem 4rem;
  width: 100%;
}

.hero-inner {
  max-width: 600px;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: var(--font-mono);
  margin-bottom: 1.25rem;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.hero-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.hero-title-accent {
  color: var(--color-primary);
  font-size: 0.65em;
  font-weight: 400;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.hero-description {
  color: var(--color-text-muted);
  font-size: 1rem;
  line-height: 1.75;
  margin-bottom: 2rem;
  max-width: 540px;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.65rem 1.4rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #080e1a;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── Hero Visual ──────────────────────── */
.hero-visual {
  position: relative;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wave-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--color-primary);
  animation: expand 4s ease-out infinite;
}

.ring-1 { width: 80px; height: 80px; animation-delay: 0s; opacity: 0.6; }
.ring-2 { width: 160px; height: 160px; animation-delay: 1.3s; opacity: 0.35; }
.ring-3 { width: 240px; height: 240px; animation-delay: 2.6s; opacity: 0.15; }

@keyframes expand {
  0% { transform: scale(0.85); opacity: 0.6; }
  100% { transform: scale(1.1); opacity: 0; }
}

.wave-center-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 24px rgba(0, 212, 255, 0.45);
  flex-shrink: 0;
}

.wave-center-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.7);
  display: block;
}

/* ── Cell Cards ───────────────────────── */
.cell-section {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: 4rem 2rem;
}

.section-inner {
  max-width: 1440px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.section-sub {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.cell-workspace {
  display: flex;
  flex-direction: column;
}

.cell-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.75rem;
}

/* ── Features ─────────────────────────── */
.features-section {
  padding: 4rem 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

/* ── Responsive ───────────────────────── */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding-top: 3rem;
  }

  .hero-visual {
    display: none;
  }

  .cell-section {
    padding: 2.5rem 1rem;
  }

  .cell-workspace {
    flex-direction: row;
    align-items: stretch;
    gap: 0;
  }

  .cell-cards {
    flex: 1;
    min-width: 0;
    grid-template-columns: 1fr;
  }
}
</style>
