<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="sticky-cells">
    <div
      class="experiment__sticky-cells"
      :class="{ 'experiment__sticky-cells--collapsed': stickyCellsCollapsed }"
    >
      <!-- Drawer tab - always visible, slides panel in/out -->
      <button
        class="experiment__sticky-cells-tab"
        type="button"
        v-tip="stickyCellsCollapsed ? $t('exp.stickyExpand') : $t('exp.stickyCollapse')"
        @click.stop="stickyCellsCollapsed = !stickyCellsCollapsed"
      >
        <span class="experiment__sticky-cells-tab-dot">⬤</span>
      </button>
      <!-- Panel body — click anywhere to scroll back to the live cell cards -->
      <div
        class="experiment__sticky-cells-body experiment__sticky-cells-body--clickable"
        @click.stop="scrollToCells"
        :title="$t('exp.stickyScrollTip')"
      >
        <div class="experiment__sticky-cells-label">⬤ LIVE</div>
        <div class="experiment__sticky-cells-grid">
          <CellCard
            v-for="cell in cells"
            :key="'sticky-' + cell.id"
            :type="cell.type"
            :label="cell.label"
            :sublabel="cell.sublabel"
            :sublabel-tip="cell.sublabelTip"
            :description="cell.description"
            :cell-data="cell.cellData"
            :compact="true"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import CellCard from '@/components/CellCard/index.vue'

export default defineComponent({
  name: 'StickyCellView',

  components: { CellCard },

  emits: ['scroll-to-cells'],

  props: {
    cells: { type: Array as PropType<any[]>, required: true },
  },

  data() {
    return {
      stickyCellsCollapsed: false,
    }
  },

  methods: {
    scrollToCells() {
      this.$emit('scroll-to-cells')
    },
  },
})
</script>

<style lang="scss" scoped>
// ── Sticky live cell view ──────────────────────────────────────────────────────
.experiment__sticky-cells {
  position: fixed;
  top: 68px;
  right: 1rem;
  z-index: 150;
  transform: scale(0.72);
  transform-origin: top right;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  display: flex;
  flex-direction: row;
  align-items: center;

  &--collapsed {
    transform: scale(0.72) translateX(312px);
  }

  &-tab {
    pointer-events: auto;
    flex-shrink: 0;
    align-self: center;
    width: 32px;
    height: 88px;
    background: rgba(8, 10, 18, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-right: none;
    border-radius: 8px 0 0 8px;
    box-shadow: -3px 0 14px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, box-shadow 0.15s;

    &:hover {
      background: rgba(22, 28, 52, 0.99);
      box-shadow: -4px 0 18px rgba(100, 160, 255, 0.18);
    }

    &-dot {
      color: var(--color-primary);
      font-size: var(--fs-sm);
      animation: sticky-pulse 2s ease-in-out infinite;
    }
  }

  &-body {
    pointer-events: none;
    width: 312px;
    background: rgba(8, 10, 18, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-left: none;
    border-radius: 0 10px 10px 0;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.80), 0 0 0 1px rgba(255, 255, 255, 0.05);
    padding: 0.75rem 0.75rem 0.5rem;
    backdrop-filter: blur(12px);
    transition: border-color 0.15s, box-shadow 0.15s;

    &--clickable {
      pointer-events: auto;
      cursor: pointer;

      &:hover {
        border-color: rgba(100, 160, 255, 0.30);
        box-shadow: 0 8px 48px rgba(0, 0, 0, 0.80), 0 0 0 1px rgba(100, 160, 255, 0.12);
      }
    }
  }

  &-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.14em;
    color: var(--color-primary);
    opacity: 0.80;
    margin-bottom: 0.5rem;
    padding-left: 0.1rem;
  }

  &-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}

@keyframes sticky-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1.0; }
}

// Fade + slide-down entrance/exit
.sticky-cells-enter-active { transition: opacity 0.28s ease, transform 0.28s ease; }
.sticky-cells-leave-active { transition: opacity 0.2s ease; }
.sticky-cells-enter-from   { opacity: 0; transform: scale(0.72) translateY(-14px); transform-origin: top right; }
.sticky-cells-leave-to     { opacity: 0; }

// Mobile: hide sticky panel on small screens
@media (max-width: 768px) {
  .experiment__sticky-cells { display: none; }
}
</style>
