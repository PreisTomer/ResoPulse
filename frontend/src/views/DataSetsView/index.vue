<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="datasets">
    <div class="datasets__inner">

      <PageHeader :eyebrow="$t('datasets.eyebrow')" :title="$t('datasets.title')">
        <p class="datasets__subtitle">
          <span v-html="$t('datasets.subtitle')"></span>
          <br><span v-html="$t('datasets.subtitleNote')"></span>
        </p>
      </PageHeader>

      <div class="datasets__legend-row">
        <div
          v-for="g in groups"
          :key="g"
          class="datasets__legend-item"
          :style="{ '--g-color': groupColors[g] }"
          v-tip="$t(`datasets.tip.legend${capitalise(g)}`)"
        >
          <span class="datasets__legend-dot"></span>
          {{ groupLabels[g] }}
        </div>
      </div>

      <DatasetsCellTable :presets="presets" />
      <DatasetsMediaTable :media-rows="mediaRows" />
      <DatasetsWindowCard />
      <DatasetsNucShellTable :nuclear-presets="nuclearPresets" />
      <DatasetsAcousticRes />
      <DatasetsFieldGeo />
      <DatasetsThresholds />

      <div class="datasets__open-lab">
        <RouterLink to="/experiment" class="datasets__btn-lab">
          {{ $t('datasets.cta.btnLab') }}
        </RouterLink>
        <span class="datasets__open-lab-note">{{ $t('datasets.cta.note') }}</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, type CellGroup } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import { CELL_GROUP, NULL_DISPLAY } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { membraneCm, computeFc, computeTau, computeNuclearTau, computeDepCrossoverKHz, computeDepSecondCrossoverKHz } from '@/utils/physics'
import PageHeader from '@/components/PageHeader.vue'
import DatasetsCellTable from './DatasetsCellTable.vue'
import DatasetsMediaTable from './DatasetsMediaTable.vue'
import DatasetsWindowCard from './DatasetsWindowCard.vue'
import DatasetsNucShellTable from './DatasetsNucShellTable.vue'
import DatasetsAcousticRes from './DatasetsAcousticRes.vue'
import DatasetsFieldGeo from './DatasetsFieldGeo.vue'
import DatasetsThresholds from './DatasetsThresholds.vue'
import type { AugmentedPreset } from './types'

const SIGMA_SALINE = MEDIA.saline.conductivity
const EPS_R_SALINE = MEDIA.saline.permittivity

const ALL_GROUPS: CellGroup[] = [
  CELL_GROUP.REFERENCE,
  CELL_GROUP.CANCER,
  CELL_GROUP.BACTERIA,
  CELL_GROUP.VIRUS,
] as CellGroup[]

export default defineComponent({
  name: 'DataSetsView',

  components: {
    PageHeader,
    DatasetsCellTable,
    DatasetsMediaTable,
    DatasetsWindowCard,
    DatasetsNucShellTable,
    DatasetsAcousticRes,
    DatasetsFieldGeo,
    DatasetsThresholds,
  },

  setup() {
    const presets = computed((): AugmentedPreset[] =>
      CELL_PRESETS.map((p) => {
        const pr = p as AugmentedPreset
        const cm = membraneCm(p) * 1e3
        const fc = computeFc(p, SIGMA_SALINE)
        const fcDisplay =
          fc >= 1000
            ? `${(fc / 1000).toFixed(2)} ${UNIT.MHZ}`
            : `${fc.toFixed(1)} ${UNIT.KHZ}`

        const resFreqDisplay = pr.resonantFreqGHz
          ? `${pr.resonantFreqGHz} ${UNIT.GHZ}`
          : NULL_DISPLAY
        const resQDisplay = pr.capsidQ ? `${pr.capsidQ}` : NULL_DISPLAY
        const resEthrDisplay = pr.resonantThresholdVcm
          ? `${pr.resonantThresholdVcm}`
          : NULL_DISPLAY

        const fcross = computeDepCrossoverKHz(p, SIGMA_SALINE, EPS_R_SALINE)
        const fcrossDisplay = fcross > 0
          ? (fcross >= 1000
              ? `${(fcross / 1000).toFixed(2)} ${UNIT.MHZ}`
              : `${fcross.toFixed(1)} ${UNIT.KHZ}`)
          : NULL_DISPLAY

        const fcross2 = computeDepSecondCrossoverKHz(p, SIGMA_SALINE, EPS_R_SALINE)
        const fcross2Display = fcross2 > 0
          ? (fcross2 >= 1000
              ? `${(fcross2 / 1000).toFixed(2)} ${UNIT.MHZ}`
              : `${fcross2.toFixed(1)} ${UNIT.KHZ}`)
          : NULL_DISPLAY

        const hasNuclear = !!pr.nuclearRadius
        const nucRDisplay = pr.nuclearRadius ? `${pr.nuclearRadius}` : NULL_DISPLAY

        let nucFpeakDisplay = NULL_DISPLAY
        if (hasNuclear) {
          const tau_out = computeTau(p, SIGMA_SALINE)
          const tau_ne  = computeNuclearTau(p, SIGMA_SALINE)
          if (tau_out > 0 && tau_ne > 0) {
            const fpeak_Hz  = 1 / (2 * Math.PI * Math.sqrt(tau_out * tau_ne))
            const fpeak_MHz = fpeak_Hz / 1e6
            nucFpeakDisplay = `${fpeak_MHz.toFixed(2)} ${UNIT.MHZ}`
          }
        }

        return {
          ...pr,
          cmDisplay: cm.toFixed(2),
          fcDisplay,
          fcrossDisplay,
          fcross2Display,
          resFreqDisplay,
          resQDisplay,
          resEthrDisplay,
          hasResonance: !!pr.resonantFreqGHz,
          hasNuclear,
          nucRDisplay,
          nucFpeakDisplay,
          color: GROUP_COLORS[p.group],
          groupLabel: GROUP_LABELS[p.group],
        }
      })
    )

    const nuclearPresets = computed(() => presets.value.filter(p => p.hasNuclear))

    const mediaRows = [
      { id: 'saline', sigma: MEDIA.saline.conductivity.toFixed(3), epsilonR: MEDIA.saline.permittivity, alphaT: (MEDIA.saline.tempCoeff * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'blood',  sigma: MEDIA.blood.conductivity.toFixed(3),  epsilonR: MEDIA.blood.permittivity,  alphaT: (MEDIA.blood.tempCoeff  * 100).toFixed(1), keyClass: '' },
      { id: 'tissue', sigma: MEDIA.tissue.conductivity.toFixed(3), epsilonR: MEDIA.tissue.permittivity, alphaT: (MEDIA.tissue.tempCoeff * 100).toFixed(1), keyClass: '' },
      { id: 'water',  sigma: MEDIA.water.conductivity.toFixed(3),  epsilonR: MEDIA.water.permittivity,  alphaT: (MEDIA.water.tempCoeff  * 100).toFixed(1), keyClass: 'datasets__warn-val' },
      { id: 'dmem',   sigma: MEDIA.dmem.conductivity.toFixed(3),   epsilonR: MEDIA.dmem.permittivity,   alphaT: (MEDIA.dmem.tempCoeff   * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'pbs',    sigma: MEDIA.pbs.conductivity.toFixed(3),    epsilonR: MEDIA.pbs.permittivity,    alphaT: (MEDIA.pbs.tempCoeff    * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'rpmi',   sigma: MEDIA.rpmi.conductivity.toFixed(3),   epsilonR: MEDIA.rpmi.permittivity,   alphaT: (MEDIA.rpmi.tempCoeff   * 100).toFixed(1), keyClass: '' },
      { id: 'mhb',    sigma: MEDIA.mhb.conductivity.toFixed(3),    epsilonR: MEDIA.mhb.permittivity,    alphaT: (MEDIA.mhb.tempCoeff    * 100).toFixed(1), keyClass: '' },
    ]

    return {
      presets,
      nuclearPresets,
      mediaRows,
    }
  },

  computed: {
    groups(): CellGroup[] {
      return ALL_GROUPS
    },
    groupColors(): typeof GROUP_COLORS {
      return GROUP_COLORS
    },
    groupLabels(): typeof GROUP_LABELS {
      return GROUP_LABELS
    },
  },

  methods: {
    capitalise(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
    },
  },
})
</script>

<style lang="scss" scoped>


.datasets {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
    @include flex-col(1.75rem);
  }

  &__subtitle {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
    line-height: 1.6;
  }

  &__legend-row {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  &__legend-item {
    @include flex-row(0.45rem);
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--g-color);
    box-shadow: 0 0 6px var(--g-color);
  }

  &__open-lab {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__btn-lab {
    display: inline-flex;
    align-items: center;
    padding: 0.65rem 1.5rem;
    background-color: var(--color-primary);
    color: var(--color-btn-dark);
    font-weight: 600;
    font-size: var(--fs-xl);
    border-radius: var(--radius);
    text-decoration: none;
    box-shadow: var(--glow-md);
    transition: all 0.18s;

    &:hover {
      filter: brightness(1.1);
      box-shadow: var(--glow-lg);
    }
  }

  &__open-lab-note {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }
}
</style>
