<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    class="side-tab-panel"
    :class="{ 'side-tab-panel--left': side === 'left' }"
    :style="containerStyle"
  >
    <!-- Left side: [body][tab]; right side: [tab][body] -->
    <template v-if="side === 'left'">
      <div class="side-tab-panel__body" :style="panelBodyStyle">
        <slot name="panel" />
      </div>
      <button
        class="side-tab-panel__tab side-tab-panel__tab--left"
        :class="{ 'side-tab-panel__tab--intro': introActive }"
        :style="{ height: tabHeight + 'px', alignSelf: tabAlign }"
        type="button"
        v-tip="isCollapsed ? expandTip : collapseTip"
        @click.stop="toggle"
      >
        <slot name="tab-icon" :collapsed="isCollapsed" />
      </button>
    </template>

    <template v-else>
      <button
        class="side-tab-panel__tab"
        :class="{ 'side-tab-panel__tab--intro': introActive }"
        :style="{ height: tabHeight + 'px', alignSelf: tabAlign }"
        type="button"
        v-tip="isCollapsed ? expandTip : collapseTip"
        @click.stop="toggle"
      >
        <slot name="tab-icon" :collapsed="isCollapsed" />
      </button>
      <div class="side-tab-panel__body" :style="panelBodyStyle">
        <slot name="panel" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SideTabPanel',

  props: {
    top:              { type: String,  required: true },
    side:             { type: String,  default: 'right' },
    panelWidth:       { type: Number,  default: 320 },
    tabHeight:        { type: Number,  default: 88 },
    scale:            { type: Number,  default: 1 },
    zIndex:           { type: Number,  default: 150 },
    defaultCollapsed: { type: Boolean, default: true },
    forceOpen:        { type: Boolean, default: false },
    introAnimation:   { type: Boolean, default: false },
    tabAlign:         { type: String,  default: 'flex-start' },
    expandTip:        { type: String,  default: '' },
    collapseTip:      { type: String,  default: '' },
  },

  data() {
    return {
      isCollapsed:     this.defaultCollapsed as boolean,
      introActive:     false,
      transitionReady: false,
      _introTimer:     null as ReturnType<typeof setTimeout> | null,
    }
  },

  emits: ['toggle'],

  watch: {
    forceOpen(val: boolean) {
      this.isCollapsed = !val
      this.$emit('toggle', val)
    },
  },

  mounted() {
    // Defer enabling the CSS transition by one tick so the initial transform
    // (applied via inline :style) is never animated — only collapse/expand
    // interactions after first paint should trigger the transition.
    if (this.forceOpen) this.isCollapsed = false
    this.$nextTick(() => { this.transitionReady = true })
    if (this.introAnimation) {
      setTimeout(() => {
        this.introActive = true
        this._introTimer = setTimeout(() => { this.introActive = false }, 3200)
      }, 700)
    }
  },

  beforeUnmount() {
    if (this._introTimer) clearTimeout(this._introTimer)
  },

  computed: {
    containerStyle(): Record<string, string> {
      const isLeft = this.side === 'left'
      const openTransform  = `scale(${this.scale})`
      const closeTransform = isLeft
        ? `scale(${this.scale}) translateX(-${this.panelWidth}px)`
        : `scale(${this.scale}) translateX(${this.panelWidth}px)`
      const style: Record<string, string> = {
        top:       this.top,
        zIndex:    String(this.zIndex),
        transform: this.isCollapsed ? closeTransform : openTransform,
      }
      // Suppress the CSS `transition: transform` until after first paint so the
      // browser never animates from the default `none` to the initial scale value.
      if (!this.transitionReady) style.transition = 'none'
      if (isLeft) {
        style.left  = '0'
        style.right = 'auto'
      } else {
        style.right = '0'
        style.left  = 'auto'
      }
      return style
    },

    panelBodyStyle(): Record<string, string> {
      const topPx = parseInt(this.top) || 80
      return {
        width:     this.panelWidth + 'px',
        maxHeight: `calc(100vh - ${topPx}px - 3rem)`,
      }
    },
  },

  methods: {
    toggle() {
      this.isCollapsed = !this.isCollapsed
      this.$emit('toggle', !this.isCollapsed)
    },
  },
})
</script>

<style lang="scss" scoped>
// ── Base container ──────────────────────────────────────────────────────────
.side-tab-panel {
  position: fixed;
  right: 0;
  transform-origin: top right;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  &--left {
    transform-origin: top left;
  }

  // ── Tab button (right-side default: rounded left edge) ─────────
  &__tab {
    pointer-events: auto;
    flex-shrink: 0;
    width: 32px;
    background: color-mix(in srgb, var(--color-bg) 97%, transparent);
    border: 1px solid color-mix(in srgb, white 14%, transparent);
    border-right: none;
    border-radius: 8px 0 0 8px;
    box-shadow: -3px 0 14px color-mix(in srgb, black 55%, transparent);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    transition: background var(--tr-fast), box-shadow var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-surface) 99%, transparent);
      box-shadow: -4px 0 18px color-mix(in srgb, var(--color-primary) 18%, transparent);
    }

    &--left {
      border-right: 1px solid color-mix(in srgb, white 14%, transparent);
      border-left: none;
      border-radius: 0 8px 8px 0;
      box-shadow: 3px 0 14px color-mix(in srgb, black 55%, transparent);

      &:hover {
        box-shadow: 4px 0 18px color-mix(in srgb, var(--color-primary) 18%, transparent);
      }
    }

    &--intro {
      animation: side-tab-intro-glow 1.05s ease-in-out 3;
    }
  }

  // ── Panel body (right-side default: rounded right edge) ────────
  &__body {
    pointer-events: auto;
    background: color-mix(in srgb, var(--color-bg) 97%, transparent);
    border: 1px solid color-mix(in srgb, white 12%, transparent);
    border-left: none;
    border-radius: 0 10px 10px 0;
    box-shadow:
      0 8px 48px color-mix(in srgb, black 80%, transparent),
      0 0 0 1px color-mix(in srgb, white 5%, transparent);
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;

    .side-tab-panel--left & {
      border-left: 1px solid color-mix(in srgb, white 12%, transparent);
      border-right: none;
      border-radius: 10px 0 0 10px;
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
}

// ── Intro glow — adapts shadow direction per side ───────────────────────────
@keyframes side-tab-intro-glow {
  0%, 100% {
    border-color: color-mix(in srgb, white 14%, transparent);
  }
  50% {
    box-shadow: 0 0 28px color-mix(in srgb, var(--color-primary) 65%, transparent);
    border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  }
}
</style>
