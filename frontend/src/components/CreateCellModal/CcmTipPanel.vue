<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <transition name="tip-fade">
    <div v-if="activeTip" class="ccm-tip-overlay" @click="$emit('close')">
      <div class="ccm-tip-box" @click.stop>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="activeTipHtml" />
        <button class="ccm-tip-box__close" @click="$emit('close')">&#x2715;</button>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

type TipKey = 'radius' | 'memThick' | 'epsR' | 'sigmaI' | 'vmThr' | 'density' | 'cp' | 'derivedFc' | 'cellType' | 'resFreq' | 'capsidQ' | 'resThr'

const TIP_I18N_MAP: Record<TipKey, string> = {
  radius:    'userPresets.tipRadius',
  memThick:  'userPresets.tipMemThick',
  epsR:      'userPresets.tipEpsR',
  sigmaI:    'userPresets.tipSigmaI',
  vmThr:     'userPresets.tipVmThr',
  density:   'userPresets.tipDensity',
  cp:        'userPresets.tipCp',
  derivedFc: 'userPresets.tipDerivedFc',
  cellType:  'userPresets.tipCellType',
  resFreq:   'userPresets.tipResFreq',
  capsidQ:   'userPresets.tipCapsidQ',
  resThr:    'userPresets.tipResThr',
}

export default defineComponent({
  name: 'CcmTipPanel',

  props: {
    activeTip: { type: String as () => TipKey | null, default: null },
  },

  emits: ['close'],

  computed: {
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
  background:      rgba(0,0,0,0.5);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.ccm-tip-box {
  background:    var(--color-surface);
  border:        1px solid var(--color-border, rgba(255,255,255,0.1));
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
