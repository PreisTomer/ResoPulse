<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <transition name="tip-fade">
    <div v-if="activeTip" class="ccm-tip-overlay" @click="$emit(EMIT.CLOSE)">
      <div class="ccm-tip-box" @click.stop>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="activeTipHtml" />
        <button class="ccm-tip-box__close" @click="$emit(EMIT.CLOSE)">{{ ICON.CLOSE }}</button>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'

type TipKey =
  | 'radius' | 'memThick' | 'epsR' | 'sigmaI' | 'sigmaMem' | 'vmThr' | 'density' | 'cp'
  | 'derivedFc' | 'cellType'
  | 'conductivityMeasurementTempC' | 'conductivityMeasurementSigmaE' | 'sigmaUncertaintyPct' | 'sigmaSource' | 'sigmaCitation'
  | 'resFreq' | 'capsidQ' | 'resThr' | 'resFreqUnc' | 'capsidQMin' | 'capsidQMax'
  | 'resFreq2' | 'capsidQ2' | 'resMode2Amp'
  | 'nuclearRadius' | 'nuclearMemThick' | 'nuclearEps' | 'nucleoplasmSigma' | 'nuclearVmThr'

const TIP_I18N_MAP: Record<TipKey, string> = {
  radius:              'userPresets.tipRadius',
  memThick:            'userPresets.tipMemThick',
  epsR:                'userPresets.tipEpsR',
  sigmaI:              'userPresets.tipSigmaI',
  sigmaMem:            'userPresets.tipSigmaMem',
  vmThr:               'userPresets.tipVmThr',
  density:             'userPresets.tipDensity',
  cp:                  'userPresets.tipCp',
  derivedFc:           'userPresets.tipDerivedFc',
  cellType:            'userPresets.tipCellType',
  conductivityMeasurementTempC:  'userPresets.tipSigmaMeasurementTemp',
  conductivityMeasurementSigmaE: 'userPresets.tipSigmaMeasurementSigmaE',
  sigmaUncertaintyPct:           'userPresets.tipSigmaUncertaintyPct',
  sigmaSource:                  'userPresets.tipSigmaSource',
  sigmaCitation:                'userPresets.tipSigmaCitation',
  resFreq:             'userPresets.tipResFreq',
  capsidQ:             'userPresets.tipCapsidQ',
  resThr:              'userPresets.tipResThr',
  resFreqUnc:          'userPresets.tipResFreqUnc',
  capsidQMin:          'userPresets.tipCapsidQMin',
  capsidQMax:          'userPresets.tipCapsidQMax',
  resFreq2:            'userPresets.tipResFreq2',
  capsidQ2:            'userPresets.tipCapsidQ2',
  resMode2Amp:         'userPresets.tipResMode2Amp',
  nuclearRadius:       'userPresets.tipNuclearRadius',
  nuclearMemThick:     'userPresets.tipNuclearMemThick',
  nuclearEps:          'userPresets.tipNuclearEps',
  nucleoplasmSigma:    'userPresets.tipNucleoplasmSigma',
  nuclearVmThr:        'userPresets.tipNuclearVmThr',
}

export default defineComponent({
  name: 'CcmTipPanel',

  props: {
    activeTip: { type: String as () => TipKey | null, default: null },
  },

  emits: [EMIT.CLOSE],

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },

    activeTipHtml(): string {
      if (!this.activeTip) return ''
      const key = TIP_I18N_MAP[this.activeTip]
      return this.$t(key)
    },
  },
})
</script>

<style lang="scss" scoped>
.tip-fade-enter-active,
.tip-fade-leave-active { transition: opacity var(--tr-fast); }
.tip-fade-enter-from,
.tip-fade-leave-to     { opacity: 0; }

.ccm-tip-overlay {
  position:        fixed;
  inset:           0;
  z-index:         9100;
  background:      color-mix(in srgb, black 50%, transparent);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.ccm-tip-box {
  background:    var(--color-surface);
  border:        1px solid var(--color-border);
  border-radius: var(--radius);
  padding:       1rem 1.25rem;
  max-width:     520px;
  font-size:     var(--fs-md);
  color:         var(--color-text);
  line-height:   1.55;
  white-space:   pre-wrap;
  position:      relative;

  strong { color: var(--color-primary); }

  &__close {
    position:   absolute;
    top:        0.5rem;
    right:      0.6rem;
    background: transparent;
    border:     none;
    color:      var(--color-text-muted);
    cursor:     pointer;
    font-size:  0.85rem;
    padding:    0;

    &:hover { color: var(--color-text); }
  }
}
</style>
