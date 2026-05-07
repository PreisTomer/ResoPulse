<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
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

      <DatasetsCellTable
        :presets="allPresets"
        @add="openCreateModal"
        @edit="openEditModal"
        @delete="deletePreset"
        @export-json="exportJson"
        @export-csv="exportCsv"
        @import-json="importJsonFile"
      />
      <DatasetsMediaTable :media-rows="mediaRows" />
      <DatasetsWindowCard :data="windowCardData" />
      <DatasetsNucShellTable :nuclear-presets="nuclearPresets" />
      <DatasetsAcousticRes />
      <DatasetsFieldGeo />
      <DatasetsThresholds />

      <div class="datasets__open-lab">
        <RouterLink :to="ROUTE.EXPERIMENT" class="datasets__btn-lab">
          {{ $t('datasets.cta.btnLab') }}
        </RouterLink>
        <span class="datasets__open-lab-note">{{ $t('datasets.cta.note') }}</span>
      </div>

    </div>
  </div>

  <CreateCellModal
    :visible="showModal"
    :edit-preset="editingPreset"
    @close="closeModal"
    @saved="closeModal"
  />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { mapStores } from 'pinia'

import PageHeader from '@/components/PageHeader/index.vue'
import CreateCellModal from '@/components/CreateCellModal/index.vue'

import { membraneCm, computeFc, computeTau, computeNuclearTau, computeDepCrossoverKHz, computeDepSecondCrossoverKHz } from '@/utils/physics'
import { downloadUserPresetsJson, downloadUserPresetsCsv } from '@/utils/userPresetExport'
import { parseUserPresetsJson } from '@/utils/userPresetImport'

import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'

import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, type CellGroup } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import { CELL_GROUP, NULL_DISPLAY } from '@/constants/strings'
import { ROUTE } from '@/constants/routes'
import { UNIT } from '@/constants/units'
import { SCHWAN_SPHERE_FACTOR } from '@/constants/physics'

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
  CELL_GROUP.STEM,
  CELL_GROUP.BACTERIA,
  CELL_GROUP.VIRUS,
] as CellGroup[]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFc(fc: number): string {
  return fc >= 1000
    ? `${(fc / 1000).toFixed(2)} ${UNIT.MHZ}`
    : `${fc.toFixed(1)} ${UNIT.KHZ}`
}

function formatDep(kHz: number): string {
  return kHz > 0
    ? (kHz >= 1000 ? `${(kHz / 1000).toFixed(2)} ${UNIT.MHZ}` : `${kHz.toFixed(1)} ${UNIT.KHZ}`)
    : NULL_DISPLAY
}

function cellTypeToGroup(p: UserCellPreset): CellGroup {
  if (p.role === 'healthy') return CELL_GROUP.REFERENCE as CellGroup
  if (p.cellType === 'bacteria') return CELL_GROUP.BACTERIA as CellGroup
  if (p.cellType === 'virus') return CELL_GROUP.VIRUS as CellGroup
  return CELL_GROUP.CANCER as CellGroup
}

function augmentBuiltin(p: typeof CELL_PRESETS[0]): AugmentedPreset {
  const pr = p as AugmentedPreset & typeof p
  const cm  = membraneCm(p) * 1e3
  const fc  = computeFc(p, SIGMA_SALINE)
  const hasNuclear = !!pr.nuclearRadius
  let nucFpeakDisplay = NULL_DISPLAY
  if (hasNuclear) {
    const tau_out = computeTau(p, SIGMA_SALINE)
    const tau_ne  = computeNuclearTau(p, SIGMA_SALINE)
    if (tau_out > 0 && tau_ne > 0) {
      const fpeak_MHz = 1 / (2 * Math.PI * Math.sqrt(tau_out * tau_ne)) / 1e6
      nucFpeakDisplay = `${fpeak_MHz.toFixed(2)} ${UNIT.MHZ}`
    }
  }
  return {
    ...pr,
    cmDisplay:      cm.toFixed(2),
    fcDisplay:      formatFc(fc),
    fcrossDisplay:  formatDep(computeDepCrossoverKHz(p, SIGMA_SALINE, EPS_R_SALINE)),
    fcross2Display: formatDep(computeDepSecondCrossoverKHz(p, SIGMA_SALINE, EPS_R_SALINE)),
    resFreqDisplay: pr.resonantFreqGHz ? `${pr.resonantFreqGHz} ${UNIT.GHZ}` : NULL_DISPLAY,
    resQDisplay:    pr.capsidQ ? `${pr.capsidQ}` : NULL_DISPLAY,
    resEthrDisplay: pr.resonantThresholdVcm ? `${pr.resonantThresholdVcm}` : NULL_DISPLAY,
    hasResonance:   !!pr.resonantFreqGHz,
    hasNuclear,
    nucRDisplay:    pr.nuclearRadius ? `${pr.nuclearRadius}` : NULL_DISPLAY,
    nucFpeakDisplay,
    color:          GROUP_COLORS[p.group],
    groupLabel:     GROUP_LABELS[p.group],
    isCustom:       false,
  }
}

function augmentUserPreset(p: UserCellPreset): AugmentedPreset {
  const group = cellTypeToGroup(p)
  // Minimal cell-like object for physics computations
  const cellLike = {
    id: p.id, type: 'target' as const, label: p.label,
    naturalFrequency: 0, amplitude: 0.5,
    radius: p.radius, membraneThickness: p.membraneThickness,
    dielectricConstant: p.dielectricConstant, conductivity: p.conductivity,
    thresholdVoltage: p.thresholdVoltage, density: p.density,
    specificHeatCapacity: p.specificHeatCapacity,
  }
  const fc  = computeFc(cellLike, SIGMA_SALINE)
  const cm  = membraneCm(cellLike) * 1e3
  const hasResonance = p.resonantFreqGHz != null
  return {
    presetId:         p.id,
    label:            p.label,
    shortLabel:       p.shortLabel,
    notes:            p.notes,
    group,
    groupLabel:       GROUP_LABELS[group],
    color:            GROUP_COLORS[group],
    radius:           p.radius,
    membraneThickness:    p.membraneThickness,
    dielectricConstant:   p.dielectricConstant,
    conductivity:         p.conductivity,
    thresholdVoltage:     p.thresholdVoltage,
    density:              p.density,
    specificHeatCapacity: p.specificHeatCapacity,
    ...(p.resonantFreqGHz      != null && { resonantFreqGHz:      p.resonantFreqGHz }),
    ...(p.capsidQ              != null && { capsidQ:              p.capsidQ }),
    ...(p.resonantThresholdVcm != null && { resonantThresholdVcm: p.resonantThresholdVcm }),
    cmDisplay:      cm.toFixed(2),
    fcDisplay:      formatFc(fc),
    fcrossDisplay:  formatDep(computeDepCrossoverKHz(cellLike, SIGMA_SALINE, EPS_R_SALINE)),
    fcross2Display: formatDep(computeDepSecondCrossoverKHz(cellLike, SIGMA_SALINE, EPS_R_SALINE)),
    resFreqDisplay: hasResonance ? `${p.resonantFreqGHz} ${UNIT.GHZ}` : NULL_DISPLAY,
    resQDisplay:    p.capsidQ ? `${p.capsidQ}` : NULL_DISPLAY,
    resEthrDisplay: p.resonantThresholdVcm ? `${p.resonantThresholdVcm}` : NULL_DISPLAY,
    hasResonance,
    hasNuclear:     false,
    nucRDisplay:    NULL_DISPLAY,
    nucFpeakDisplay: NULL_DISPLAY,
    isCustom:             true,
    customPreset:         p,
    parameterConfidence:  p.parameterConfidence ?? 'literature',
  }
}

export default defineComponent({
  name: 'DataSetsView',

  components: {
    PageHeader,
    CreateCellModal,
    DatasetsCellTable,
    DatasetsMediaTable,
    DatasetsWindowCard,
    DatasetsNucShellTable,
    DatasetsAcousticRes,
    DatasetsFieldGeo,
    DatasetsThresholds,
  },

  data() {
    return {
      showModal:     false,
      editingPreset: null as UserCellPreset | null,
    }
  },

  setup() {
    const builtinPresets = computed((): AugmentedPreset[] => CELL_PRESETS.map(augmentBuiltin))

    const mediaRows = [
      { id: 'saline',    sigma: MEDIA.saline.conductivity.toFixed(3),    epsilonR: MEDIA.saline.permittivity,    alphaT: (MEDIA.saline.tempCoeff    * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'blood',     sigma: MEDIA.blood.conductivity.toFixed(3),     epsilonR: MEDIA.blood.permittivity,     alphaT: (MEDIA.blood.tempCoeff     * 100).toFixed(1), keyClass: '' },
      { id: 'tissue',    sigma: MEDIA.tissue.conductivity.toFixed(3),    epsilonR: MEDIA.tissue.permittivity,    alphaT: (MEDIA.tissue.tempCoeff    * 100).toFixed(1), keyClass: '' },
      { id: 'water',     sigma: MEDIA.water.conductivity.toFixed(3),     epsilonR: MEDIA.water.permittivity,     alphaT: (MEDIA.water.tempCoeff     * 100).toFixed(1), keyClass: 'datasets__warn-val' },
      { id: 'dmem',      sigma: MEDIA.dmem.conductivity.toFixed(3),      epsilonR: MEDIA.dmem.permittivity,      alphaT: (MEDIA.dmem.tempCoeff      * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'pbs',       sigma: MEDIA.pbs.conductivity.toFixed(3),       epsilonR: MEDIA.pbs.permittivity,       alphaT: (MEDIA.pbs.tempCoeff       * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'rpmi',      sigma: MEDIA.rpmi.conductivity.toFixed(3),      epsilonR: MEDIA.rpmi.permittivity,      alphaT: (MEDIA.rpmi.tempCoeff      * 100).toFixed(1), keyClass: '' },
      { id: 'mhb',       sigma: MEDIA.mhb.conductivity.toFixed(3),       epsilonR: MEDIA.mhb.permittivity,       alphaT: (MEDIA.mhb.tempCoeff       * 100).toFixed(1), keyClass: '' },
      { id: 'epbuffer',  sigma: MEDIA.epbuffer.conductivity.toFixed(3),  epsilonR: MEDIA.epbuffer.permittivity,  alphaT: (MEDIA.epbuffer.tempCoeff  * 100).toFixed(1), keyClass: 'datasets__dep-val' },
      { id: 'sfm',       sigma: MEDIA.sfm.conductivity.toFixed(3),       epsilonR: MEDIA.sfm.permittivity,       alphaT: (MEDIA.sfm.tempCoeff       * 100).toFixed(1), keyClass: '' },
      { id: 'cdavian',   sigma: MEDIA.cdavian.conductivity.toFixed(3),   epsilonR: MEDIA.cdavian.permittivity,   alphaT: (MEDIA.cdavian.tempCoeff   * 100).toFixed(1), keyClass: '' },
      { id: 'hds',       sigma: MEDIA.hds.conductivity.toFixed(3),       epsilonR: MEDIA.hds.permittivity,       alphaT: (MEDIA.hds.tempCoeff       * 100).toFixed(1), keyClass: '' },
    ]

    return { builtinPresets, mediaRows }
  },

  computed: {
    ROUTE() { return ROUTE },
    ...mapStores(useUserPresetsStore),

    groups(): CellGroup[]          { return ALL_GROUPS },
    groupColors(): typeof GROUP_COLORS { return GROUP_COLORS },
    groupLabels(): typeof GROUP_LABELS { return GROUP_LABELS },

    customPresets(): AugmentedPreset[] {
      return this.userPresetsStore.presets.map(augmentUserPreset)
    },

    // Unified library: built-ins first, then custom rows appended per group
    allPresets(): AugmentedPreset[] {
      return [...this.builtinPresets, ...this.customPresets]
    },

    nuclearPresets(): AugmentedPreset[] {
      return this.builtinPresets.filter(p => p.hasNuclear)
    },

    windowCardData(): {
      cancerR: string; cancerFc: string; cancerVmThr: string; cancerCm: string; cancerLysis: string
      healthyR: string; healthyFc: string; healthyVmThr: string; healthyCm: string; healthyLysis: string
      ratioVmSel: string; ratioTI: string; windowRangeVal: string
    } {
      const cancer  = CELL_PRESETS.find(p => p.id === 'adenocarcinoma')!
      const healthy = CELL_PRESETS.find(p => p.id === 'hepatocyte')!
      const lysisVcm = (c: typeof cancer) =>
        Math.round(c.thresholdVoltage / (SCHWAN_SPHERE_FACTOR * c.radius * 1e-6) / 100)
      const fcFmt = (c: typeof cancer) => {
        const fc = computeFc(c, SIGMA_SALINE)
        return fc >= 1000 ? `~${(fc / 1000).toFixed(2)} ${UNIT.MHZ}` : `~${fc.toFixed(0)} ${UNIT.KHZ}`
      }
      const cmFmt = (c: typeof cancer) => `~${(membraneCm(c) * 1e3).toFixed(1)} ${UNIT.MF_PER_M2}`
      const cancerLysis  = lysisVcm(cancer)
      const healthyLysis = lysisVcm(healthy)
      return {
        cancerR:        `${cancer.radius} ${UNIT.UM}`,
        cancerFc:       fcFmt(cancer),
        cancerVmThr:    `${cancer.thresholdVoltage.toFixed(2)} ${UNIT.V}`,
        cancerCm:       cmFmt(cancer),
        cancerLysis:    `~${cancerLysis} ${UNIT.V_PER_CM}`,
        healthyR:       `${healthy.radius} ${UNIT.UM}`,
        healthyFc:      fcFmt(healthy),
        healthyVmThr:   `${healthy.thresholdVoltage.toFixed(2)} ${UNIT.V}`,
        healthyCm:      cmFmt(healthy),
        healthyLysis:   `~${healthyLysis} ${UNIT.V_PER_CM}`,
        ratioVmSel:     `~${(cancer.radius / healthy.radius).toFixed(1)}×`,
        ratioTI:        `~${((cancer.radius * healthy.thresholdVoltage) / (healthy.radius * cancer.thresholdVoltage)).toFixed(2)}×`,
        windowRangeVal: `${Math.min(cancerLysis, healthyLysis)}-${Math.max(cancerLysis, healthyLysis)} ${UNIT.V_PER_CM}`,
      }
    },
  },

  methods: {
    capitalise(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    openCreateModal() {
      this.editingPreset = null
      this.showModal     = true
    },

    openEditModal(preset: UserCellPreset) {
      this.editingPreset = preset
      this.showModal     = true
    },

    closeModal() {
      this.showModal     = false
      this.editingPreset = null
    },

    async deletePreset(preset: UserCellPreset) {
      if (!window.confirm(this.$t('userPresets.deleteConfirm'))) return
      await this.userPresetsStore.remove(preset.id)
    },

    exportJson() {
      downloadUserPresetsJson(this.userPresetsStore.presets)
    },

    exportCsv() {
      downloadUserPresetsCsv(this.userPresetsStore.presets)
    },

    async importJsonFile(file: File): Promise<void> {
      let text: string
      try {
        text = await file.text()
      } catch {
        window.alert(this.$t('datasets.cellLib.importFail'))
        return
      }
      const report = parseUserPresetsJson(text)
      if (!report.ok && report.accepted.length === 0) {
        const reason = report.error ?? report.rejected[0]?.reason ?? this.$t('datasets.cellLib.importFail')
        window.alert(this.$t('datasets.cellLib.importNone', { reason }))
        return
      }

      for (const input of report.accepted) {
        await this.userPresetsStore.add(input)
      }

      const accepted = report.accepted.length
      const rejected = report.rejected.length
      if (rejected > 0) {
        const reason = report.rejected[0]?.reason ?? ''
        window.alert(this.$t('datasets.cellLib.importSuccessPartial', { accepted, rejected, reason }))
      } else {
        window.alert(this.$t('datasets.cellLib.importSuccess', { accepted }))
      }
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
    transition: filter var(--tr-normal), box-shadow var(--tr-normal);

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
