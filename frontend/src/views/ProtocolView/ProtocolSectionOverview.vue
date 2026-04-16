<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="overview" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.overview.title')"></h2>
    <p class="protocol__body-text" v-html="$t('protocol.overview.p1')"></p>
    <p class="protocol__body-text" v-html="$t('protocol.overview.p2')"></p>

    <div class="protocol__cap-grid">
      <div class="protocol__cap-grid-title">{{ $t('protocol.overview.capGridTitle') }}</div>
      <div class="protocol__cap-grid-rows">
        <div v-for="(row, i) in capGrid" :key="row.area" class="protocol__cap-row">
          <span class="protocol__cap-area">{{ row.area }}</span>
          <button class="protocol__cap-feature" @click="navigateToFeature(i)">{{ row.feature }}</button>
        </div>
      </div>
    </div>

    <div class="protocol__info-box">
      <span class="protocol__info-icon">{{ ICON.INFO }}</span>
      <span v-html="$t('protocol.overview.disclaimer')"></span>
    </div>
    <div class="protocol__warn-box" v-html="$t('protocol.overview.honesty')"></div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useUiStore } from '@/stores/uiStore'

import { scrollAndHighlight } from '@/utils/highlight'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

const CAP_GRID_LINKS: { target: string; route: string }[] = [
  { target: 'hl-freq-chart',        route: ROUTE.EXPERIMENT  }, // Schwan Vm
  { target: 'hl-selectivity-panel', route: ROUTE.EXPERIMENT  }, // EP thresholds
  { target: 'hl-sweep-panel',       route: ROUTE.EXPERIMENT  }, // Selectivity window sweep
  { target: 'hl-freq-slider',       route: ROUTE.EXPERIMENT  }, // Thermal dose
  { target: 'hl-freq-chart',        route: ROUTE.EXPERIMENT  }, // Acoustic resonance
  { target: 'hl-instrument-panel',  route: ROUTE.INSTRUMENT  }, // Hardware impedance
  { target: 'hl-population-panel',  route: ROUTE.EXPERIMENT  }, // Population lysis
  { target: 'hl-reports-export',    route: ROUTE.REPORTS     }, // Protocol export
]

export default defineComponent({
  name: 'ProtocolSectionOverview',

  computed: {
    ICON() { return ICON },

    capGrid(): { area: string; feature: string }[] {
      return (this.$tm as Function)('protocol.overview.capGrid') as { area: string; feature: string }[]
    },
  },

  methods: {
    navigateToFeature(index: number): void {
      const link = CAP_GRID_LINKS[index]
      if (!link) return
      if (this.$route.path === link.route) {
        scrollAndHighlight(link.target)
      } else {
        if (link.target) useUiStore().setPendingHighlight(link.target)
        this.$router.push(link.route)
      }
    },
  },
})
</script>

<style lang="scss" scoped>

@use './protocol' as proto;

@include proto.protocol-section();
@include proto.protocol-utils();

.protocol__cap-feature {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--color-primary);
  opacity: var(--op-strong);
  transition: opacity var(--tr-fast), text-decoration-color var(--tr-fast);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
  text-underline-offset: 3px;

  &:hover {
    opacity: 1;
    text-decoration-color: var(--color-primary);
  }
}
</style>
