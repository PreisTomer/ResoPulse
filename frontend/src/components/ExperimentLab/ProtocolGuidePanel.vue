<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <SideTabPanel
    ref="sidePanel"
    top="160px"
    side="right"
    :panel-width="300"
    :tab-height="88"
    :z-index="148"
    :default-collapsed="true"
    tab-align="flex-start"
    :expand-tip="$t('guide.tabExpandTip')"
    :collapse-tip="$t('guide.tabCollapseTip')"
    @toggle="onToggle"
  >
    <template #tab-icon="{ collapsed }">
      <span class="guide-panel__tab-icon" :class="{ 'guide-panel__tab-icon--active': !collapsed }">
        {{ ICON.CHECKLIST }}
      </span>
      <span class="guide-panel__tab-label">{{ $t('guide.tabLabel') }}</span>
    </template>

    <template #panel>
      <div class="guide-panel">
        <div class="guide-panel__header">
          <span class="guide-panel__title">{{ $t('guide.title') }}</span>
          <span class="guide-panel__progress">{{ checkedCount }}/{{ STEP_KEYS.length }}</span>
          <button class="guide-panel__close-btn" @click="onClose" :title="$t('guide.close')">{{ ICON.CLOSE }}</button>
        </div>

        <div class="guide-panel__progress-bar">
          <div class="guide-panel__progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>

        <div class="guide-panel__steps">
          <div
            v-for="(key, i) in STEP_KEYS"
            :key="key"
            class="guide-panel__step"
            :class="{
              'guide-panel__step--checked': uiStore.protocolGuideChecked[i],
              'guide-panel__step--expanded': expandedStep === i,
            }"
          >
            <div class="guide-panel__step-row" @click="toggleStep(i)">
              <button
                class="guide-panel__check"
                :class="{ 'guide-panel__check--done': uiStore.protocolGuideChecked[i] }"
                @click.stop="uiStore.toggleProtocolGuideStep(i)"
                :title="uiStore.protocolGuideChecked[i] ? $t('guide.uncheck') : $t('guide.check')"
              >
                {{ uiStore.protocolGuideChecked[i] ? ICON.CHECK : '' }}
              </button>
              <span class="guide-panel__step-num">{{ i + 1 }}</span>
              <span class="guide-panel__step-title">{{ $t(`protocol.protocol.steps.${key}.title`) }}</span>
              <span class="guide-panel__step-caret">{{ expandedStep === i ? ICON.CARET_UP : ICON.CARET_DOWN }}</span>
            </div>
            <div v-if="expandedStep === i" class="guide-panel__step-desc" v-html="stepDesc(key)" @click="onDescClick"></div>
          </div>
        </div>

        <div class="guide-panel__footer">
          <button class="guide-panel__reset-btn" @click="resetChecks">{{ $t('guide.resetChecks') }}</button>
        </div>
      </div>
    </template>
  </SideTabPanel>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useUiStore } from '@/stores/uiStore'

import { scrollAndHighlight } from '@/utils/highlight'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import SideTabPanel from './SideTabPanel.vue'

const STEP_KEYS = ['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10','s11','s12'] as const

export default defineComponent({
  name: 'ProtocolGuidePanel',

  components: { SideTabPanel },

  data() {
    return {
      expandedStep: null as number | null,
    }
  },

  computed: {
    ...mapStores(useUiStore),
    ICON()      { return ICON },
    STEP_KEYS() { return STEP_KEYS },

    checkedCount(): number {
      return this.uiStore.protocolGuideChecked.filter(Boolean).length
    },

    progressPct(): number {
      return (this.checkedCount / STEP_KEYS.length) * 100
    },
  },

  methods: {
    toggleStep(i: number) {
      this.expandedStep = this.expandedStep === i ? null : i
    },

    stepDesc(key: string): string {
      // Keep proto-lab-link spans as-is — onDescClick handles navigation + highlight
      return this.$t(`protocol.protocol.steps.${key}.desc`)
    },

    onDescClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest<HTMLElement>('.proto-lab-link')
      if (!link) return
      e.preventDefault()
      const targetId = link.dataset.target ?? ''
      const route    = link.dataset.route  ?? ROUTE.EXPERIMENT
      if (this.$route.path === route) {
        if (targetId) scrollAndHighlight(targetId)
      } else {
        if (targetId) this.uiStore.setPendingHighlight(targetId)
        this.$router.push(route)
      }
    },

    onToggle(isExpanded: boolean) {
      this.uiStore.protocolGuideOpen = isExpanded
    },

    onClose() {
      // Collapse the SideTabPanel via its internal toggle method
      const panel = this.$refs.sidePanel as InstanceType<typeof SideTabPanel>
      if (panel && !panel.isCollapsed) panel.toggle()
    },

    resetChecks() {
      this.uiStore.protocolGuideChecked = Array(12).fill(false)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.guide-panel {
  @include flex-col(0);
  height: 100%;
  overflow: hidden;

  &__header {
    @include flex-row(0.5rem);
    padding: 0.75rem 0.85rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-primary);
    flex: 1;
  }

  &__progress {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    flex-shrink: 0;
  }

  &__close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    cursor: pointer;
    font-size: var(--fs-sm);
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }
  }

  &__progress-bar {
    height: 2px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    flex-shrink: 0;
  }

  &__progress-fill {
    height: 100%;
    background: var(--color-primary);
    transition: width var(--tr-slow);
  }

  &__steps {
    flex: 1;
    overflow-y: auto;
    padding: 0.4rem 0;
  }

  &__step {
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
    transition: background var(--tr-fast);

    &--checked > &-row {
      opacity: var(--op-muted);
    }

    &--expanded {
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    }
  }

  &__step-row {
    @include flex-row(0.4rem);
    padding: 0.55rem 0.7rem;
    cursor: pointer;
    user-select: none;

    &:hover { background: color-mix(in srgb, var(--color-primary) 6%, transparent); }
  }

  &__check {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    @include inline-flex-center;
    font-size: 0.6rem;
    color: var(--color-primary);
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &--done {
      background: color-mix(in srgb, var(--color-primary) 20%, transparent);
      border-color: var(--color-primary);
    }
  }

  &__step-num {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    flex-shrink: 0;
    min-width: 1rem;
  }

  &__step-title {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text);
    flex: 1;
    line-height: 1.3;
  }

  &__step-caret {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    flex-shrink: 0;
  }

  &__step-desc {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.55;
    padding: 0 0.7rem 0.65rem 2.5rem;
    opacity: var(--op-dim);

    :deep(.proto-lab-link) {
      color: var(--color-primary);
      text-decoration: underline;
      text-decoration-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      text-underline-offset: 2px;
      cursor: pointer;
      font-weight: 600;
      transition: color var(--tr-fast), text-decoration-color var(--tr-fast);

      &:hover {
        color: var(--color-accent);
        text-decoration-color: var(--color-accent);
      }
    }
  }

  &__footer {
    padding: 0.6rem 0.85rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__reset-btn {
    @include mono-upper(var(--fs-xxs));
    background: none;
    border: 1px solid color-mix(in srgb, var(--color-text-muted) 25%, transparent);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    padding: 0.3rem 0.65rem;
    cursor: pointer;
    transition: opacity var(--tr-fast);
    width: 100%;

    &:hover { opacity: 1; }
  }
}

.guide-panel__tab-icon {
  font-size: 1.2rem;
  transition: color var(--tr-fast);
  color: var(--color-text-muted);

  &--active { color: var(--color-primary); }
}

.guide-panel__tab-label {
  font-size: var(--fs-xxs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  margin-top: 0.4rem;
}
</style>
