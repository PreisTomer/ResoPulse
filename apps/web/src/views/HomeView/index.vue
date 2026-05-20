<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="home">

    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    <section class="home__hero">
      <HeroBackdrop />
      <div class="home__hero-inner">
        <span class="home__hero-eyebrow">{{ $t('home.heroEyebrow') }}</span>
        <h1 class="home__hero-title">
          <span>Sim</span><span class="home__hero-title-accent">Biotix</span>
        </h1>
        <p class="home__hero-tagline">{{ $t('home.tagline1') }}</p>
        <p class="home__hero-subtitle">{{ $t('home.tagline2') }}</p>

        <div class="home__hero-cta-row">
          <RouterLink v-if="isSignedIn" :to="ROUTE.CAMPAIGNS" class="home__btn home__btn--primary">
            {{ $t('home.ctaPrimaryAuthenticated') }} {{ ICON.ARROW_SHORT }}
          </RouterLink>
          <template v-else>
            <RouterLink :to="ROUTE.SIGN_UP" class="home__btn home__btn--primary">
              {{ $t('home.ctaPrimaryGuest') }} {{ ICON.ARROW_SHORT }}
            </RouterLink>
            <RouterLink :to="ROUTE.LIBRARY" class="home__btn home__btn--ghost">
              {{ $t('home.ctaTertiary') }}
            </RouterLink>
          </template>
        </div>

        <p class="home__hero-footnote">{{ $t('home.heroFootnote') }}</p>
      </div>

      <div class="home__hero-pipeline">
        <PipelineFlowSvg />
      </div>
    </section>

    <!-- ── Lower zone: modules + pain points share one process-flow backdrop ── -->
    <div class="home__lower">
      <FlowBackdrop />

      <!-- ── Modules ─────────────────────────────────────────────────────── -->
      <section class="home__modules">
        <header class="home__modules-header">
        <span class="home__section-eyebrow">{{ $t('home.modulesEyebrow') }}</span>
        <h2 class="home__section-title">{{ $t('home.modulesTitle') }}</h2>
        <p class="home__section-subtitle">{{ $t('home.modulesSubtitle') }}</p>
      </header>

      <div class="home__modules-grid">
        <ModuleCard
          number="1"
          :phase-label="$t('home.module1Phase')"
          :title="$t('home.module1Title')"
          :description="$t('home.module1Description')"
          :output-metric="$t('home.module1Output')"
          :cta-label="$t('home.module1Cta')"
          :to="ROUTE.CELL_ENGINEERING"
        />
        <ModuleCard
          number="2"
          :phase-label="$t('home.module2Phase')"
          :title="$t('home.module2Title')"
          :description="$t('home.module2Description')"
          :output-metric="$t('home.module2Output')"
          :cta-label="$t('home.module2Cta')"
          :to="ROUTE.CLONE_UPSTREAM"
        />
        <ModuleCard
          number="3"
          :phase-label="$t('home.module3Phase')"
          :title="$t('home.module3Title')"
          :description="$t('home.module3Description')"
          :output-metric="$t('home.module3Output')"
          :cta-label="$t('home.module3Cta')"
          :to="ROUTE.DOWNSTREAM"
        />
        </div>
      </section>

      <!-- ── Closed loop: calibration feedback story ──────────────────────── -->
      <ClosedLoopGraphic />

      <!-- ── Pain points ───────────────────────────────────────────────── -->
      <PainPointStrip />
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useUser } from '@clerk/vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

import PipelineFlowSvg from './PipelineFlowSvg.vue'
import ModuleCard from './ModuleCard.vue'
import PainPointStrip from './PainPointStrip.vue'
import HeroBackdrop from './HeroBackdrop.vue'
import FlowBackdrop from './FlowBackdrop.vue'
import ClosedLoopGraphic from './ClosedLoopGraphic.vue'

export default defineComponent({
  name: 'HomeView',
  components: { PipelineFlowSvg, ModuleCard, PainPointStrip, HeroBackdrop, FlowBackdrop, ClosedLoopGraphic },
  setup() {
    const { isSignedIn } = useUser()
    return { isSignedIn }
  },
  computed: {
    ROUTE() { return ROUTE },
    ICON()  { return ICON },
  },
})
</script>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}

.home__hero {
  position: relative;
  padding: 4rem 1.5rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  overflow: hidden;
  background: var(--color-bg);

  @media (max-width: 768px) {
    padding: 2.5rem 1rem 3rem;
    gap: 2rem;
  }
}

.home__hero-inner {
  @include flex-col(1rem);
  align-items: center;
  text-align: center;
  max-width: 48rem;
  position: relative;
  z-index: 2;
}

.home__hero-eyebrow {
  @include badge-pill(0.3rem 0.7rem, 999px);
  @include color-variant(purple, $border-pct: 35%, $bg-pct: 10%);
  font-size: var(--fs-xs);
  letter-spacing: 0.12em;
}

.home__hero-title {
  margin: 0.5rem 0 0;
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  color: var(--color-text-heading);
  letter-spacing: 0.02em;
  line-height: 1;
}

.home__hero-title-accent {
  color: var(--color-primary);
}

.home__hero-tagline {
  margin: 0.75rem 0 0;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.25;
  max-width: 38rem;
}

.home__hero-subtitle {
  margin: 0;
  font-size: var(--fs-lg);
  opacity: var(--op-partial);
  line-height: 1.6;
  max-width: 38rem;
}

.home__hero-cta-row {
  @include flex-row(1rem);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.75rem;
}

.home__btn {
  @include mono-upper(var(--fs-sm));
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  border-radius: var(--radius);
  text-decoration: none;
  cursor: pointer;
  transition: background var(--tr-fast), transform var(--tr-fast), border-color var(--tr-fast);
  border: 1px solid transparent;

  &--primary {
    background: var(--color-primary);
    color: var(--color-bg);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 90%, white);
      transform: translateY(-1px);
    }
  }

  &--ghost {
    background: transparent;
    border-color: var(--color-purple-border);
    color: var(--color-purple);

    &:hover {
      border-color: var(--color-purple);
      background: var(--color-purple-surface);
      color: var(--color-purple-light);
      transform: translateY(-1px);
    }
  }
}

.home__hero-footnote {
  margin: 1.5rem 0 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xxs);
  opacity: var(--op-muted);
  letter-spacing: 0.05em;
}

.home__hero-pipeline {
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.home__lower {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, var(--color-bg) 0%, color-mix(in srgb, var(--color-surface) 60%, var(--color-bg)) 100%);
}

.home__modules {
  position: relative;
  z-index: 1;
  padding: 5rem 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 768px) {
    padding: 3rem 1rem 1.5rem;
  }
}

.home__modules-header {
  @include flex-col(0.5rem);
  align-items: center;
  text-align: center;
  max-width: 38rem;
  margin: 0 auto 3rem;
}

.home__section-eyebrow {
  @include mono-upper(var(--fs-xs), 0.12em);
  color: var(--color-primary);
  opacity: var(--op-partial);
}

.home__section-title {
  margin: 0.25rem 0 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  color: var(--color-text-heading);
}

.home__section-subtitle {
  margin: 0;
  font-size: var(--fs-lg);
  opacity: var(--op-partial);
  line-height: 1.6;
}

.home__modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 2rem;
}
</style>
