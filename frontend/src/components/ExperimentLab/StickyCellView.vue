<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="sticky-cells">
    <SideTabPanel
      top="68px"
      :scale="0.72"
      :panel-width="312"
      :tab-height="88"
      :default-collapsed="false"
      tab-align="center"
      :expand-tip="$t('exp.stickyExpand')"
      :collapse-tip="$t('exp.stickyCollapse')"
    >
      <template #tab-icon>
        <span class="experiment__sticky-tab-dot">⬤</span>
      </template>

      <template #panel>
        <div
          class="experiment__sticky-cells-body"
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
              @full-reset="$emit('full-reset', $event)"
            />
          </div>
        </div>
      </template>
    </SideTabPanel>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import SideTabPanel from '@/components/ExperimentLab/SideTabPanel.vue'
import CellCard from '@/components/CellCard/index.vue'

export default defineComponent({
  name: 'StickyCellView',

  components: { SideTabPanel, CellCard },

  emits: ['scroll-to-cells', 'full-reset'],

  props: {
    cells: { type: Array as PropType<any[]>, required: true },
  },

  methods: {
    scrollToCells() {
      this.$emit('scroll-to-cells')
    },
  },
})
</script>

<style lang="scss" scoped>
// ── Sticky tab indicator ────────────────────────────────────────────────────
.experiment__sticky-tab-dot {
  color: var(--color-primary);
  font-size: var(--fs-sm);
  animation: sticky-pulse 2s ease-in-out infinite;
}

// ── Panel body interior ─────────────────────────────────────────────────────
.experiment__sticky-cells-body {
  padding: 0.75rem 0.75rem 0.5rem;
  cursor: pointer;
  transition: border-color var(--tr-fast);

  &:hover {
    // border handled by SideTabPanel
  }

  &-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.14em;
    color: var(--color-primary);
    opacity: var(--op-partial);
    margin-bottom: 0.5rem;
    padding-left: 0.1rem;
  }

  &-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}

// ── Fade entrance/exit ──────────────────────────────────────────────────────
.sticky-cells-enter-active { transition: opacity 0.28s ease; }
.sticky-cells-leave-active { transition: opacity var(--tr-normal); }
.sticky-cells-enter-from   { opacity: 0; }
.sticky-cells-leave-to     { opacity: 0; }
</style>
