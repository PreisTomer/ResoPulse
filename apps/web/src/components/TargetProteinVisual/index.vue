<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="target-protein-visual" :style="sizeStyle">
    <AntibodyYShapeSvg v-if="isAntibody" />
    <CapsidParticleSvg v-else-if="isViralVector" />
    <DnaCoilSvg        v-else-if="isPlasmid" />
    <ProteinRibbonSvg  v-else />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { MOLECULE_TYPE, type MoleculeType } from '@/constants/moleculeTypes'

import AntibodyYShapeSvg from './AntibodyYShapeSvg.vue'
import CapsidParticleSvg from './CapsidParticleSvg.vue'
import ProteinRibbonSvg  from './ProteinRibbonSvg.vue'
import DnaCoilSvg        from './DnaCoilSvg.vue'

const ANTIBODY_TYPES: MoleculeType[] = [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN]

export default defineComponent({
  name: 'TargetProteinVisual',
  components: { AntibodyYShapeSvg, CapsidParticleSvg, ProteinRibbonSvg, DnaCoilSvg },
  props: {
    moleculeType: { type: String as PropType<MoleculeType>, required: true },
    size:         { type: [Number, String], default: 120 },
  },
  computed: {
    sizeStyle(): Record<string, string> {
      const d = typeof this.size === 'number' ? `${this.size}px` : this.size
      return { width: d, height: d }
    },

    isAntibody():    boolean { return ANTIBODY_TYPES.includes(this.moleculeType) },
    isViralVector(): boolean { return this.moleculeType === MOLECULE_TYPE.VIRAL_VECTOR },
    isPlasmid():     boolean { return this.moleculeType === MOLECULE_TYPE.PLASMID_DNA },
  },
})
</script>

<style lang="scss" scoped>
.target-protein-visual {
  display: inline-block;
  flex-shrink: 0;
}
</style>
