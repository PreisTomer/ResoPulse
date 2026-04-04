<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <teleport to="body">
    <transition name="modal-shell-fade">
      <div v-if="visible" class="modal-shell__backdrop" :style="fadeStyle" @mousedown.self="onBackdropMouseDown">
        <div
          class="modal-shell__panel"
          :class="panelClass"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
        >
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'ModalShell',

  props: {
    visible: { type: Boolean, default: false },
    closeOnBackdrop: { type: Boolean, default: true },
    fadeDuration: { type: String, default: '0.18s' },
    panelWidth: { type: String, default: 'min(640px, 100%)' },
    panelMaxHeight: { type: String, default: '90vh' },
    panelOverflowY: { type: String as PropType<'auto' | 'hidden' | 'visible'>, default: 'auto' },
    panelClass: { type: [String, Array, Object] as PropType<string | string[] | Record<string, boolean>>, default: '' },
    panelRadius: { type: String, default: '10px' },
  },

  emits: ['close'],

  computed: {
    fadeStyle(): Record<string, string> {
      return { '--modal-shell-fade-duration': this.fadeDuration }
    },

    panelStyle(): Record<string, string> {
      return {
        width: this.panelWidth,
        maxHeight: this.panelMaxHeight,
        overflowY: this.panelOverflowY,
        borderRadius: this.panelRadius,
      }
    },
  },

  methods: {
    onBackdropMouseDown(): void {
      if (this.closeOnBackdrop) this.$emit('close')
    },
  },
})
</script>

<style lang="scss" scoped>
.modal-shell-fade-enter-active,
.modal-shell-fade-leave-active {
  transition: opacity var(--modal-shell-fade-duration, 0.18s) ease;
}

.modal-shell-fade-enter-from,
.modal-shell-fade-leave-to {
  opacity: 0;
}

.modal-shell__backdrop {
  position:        fixed;
  inset:           0;
  z-index:         9000;
  background:      color-mix(in srgb, black 72%, transparent);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.modal-shell__panel {
  background:     var(--color-surface);
  border:         1px solid var(--color-border);
  display:        flex;
  flex-direction: column;
}
</style>