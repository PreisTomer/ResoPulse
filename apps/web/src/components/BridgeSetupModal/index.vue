<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <teleport to="body">
    <transition name="bsm-fade">
      <div v-if="visible" class="bsm-backdrop" @mousedown.self="$emit(EMIT.CLOSE)" role="dialog" aria-modal="true">
        <div class="bsm">

          <!-- Header -->
          <div class="bsm__header">
            <div class="bsm__header-text">
              <div class="bsm__title">{{ $t('instrument.bridgeModal.title') }}</div>
              <div class="bsm__subtitle">{{ $t('instrument.bridgeModal.subtitle') }}</div>
            </div>
            <button class="bsm__close" @click="$emit(EMIT.CLOSE)" type="button" :title="$t('instrument.bridgeModal.close')">
              {{ ICON.CLOSE }}
            </button>
          </div>

          <!-- Tab bar -->
          <div class="bsm__tabs" role="tablist">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="bsm__tab-btn"
              :class="{ 'bsm__tab-btn--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
            >
              <span class="bsm__tab-icon">{{ tab.icon }}</span>
              {{ $t(`instrument.bridgeModal.tabs.${tab.key}`) }}
            </button>
          </div>

          <!-- Tab body -->
          <div class="bsm__body">
            <BsmTabQuick  v-if="activeTab === 'quick'"  :copiedKey="copiedKey" @copy="copyCommand" />
            <BsmTabBtx    v-if="activeTab === 'btx'"    :copiedKey="copiedKey" @copy="copyCommand" />
            <BsmTabVisa   v-if="activeTab === 'visa'"   :copiedKey="copiedKey" @copy="copyCommand" />
            <BsmTabSerial v-if="activeTab === 'serial'" :copiedKey="copiedKey" @copy="copyCommand" />
          </div>

          <!-- Footer -->
          <div class="bsm__footer">
            {{ ICON.INFO }} {{ $t('instrument.bridgeModal.footer') }}
          </div>

        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'

import BsmTabQuick  from './BsmTabQuick.vue'
import BsmTabBtx    from './BsmTabBtx.vue'
import BsmTabVisa   from './BsmTabVisa.vue'
import BsmTabSerial from './BsmTabSerial.vue'
type TabKey = 'quick' | 'btx' | 'visa' | 'serial'

interface Tab {
  key:  TabKey
  icon: string
}

const TABS: Tab[] = [
  { key: 'quick',  icon: ICON.LIGHTNING },
  { key: 'btx',    icon: ICON.PLUG },
  { key: 'visa',   icon: ICON.PLUG },
  { key: 'serial', icon: ICON.PLUG },
]

export default defineComponent({
  name: 'BridgeSetupModal',

  components: { BsmTabQuick, BsmTabBtx, BsmTabVisa, BsmTabSerial },

  props: {
    visible: { type: Boolean, default: false },
  },

  emits: [EMIT.CLOSE],

  data() {
    return {
      activeTab: 'quick' as TabKey,
      copiedKey: null as string | null,
      copyTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },

  computed: {
    ICON: () => ICON,
    EMIT: () => EMIT,
    TABS: () => TABS,
  },

  watch: {
    visible(isNowVisible: boolean) {
      if (isNowVisible) {
        this.activeTab = 'quick'
        this.copiedKey = null
      }
    },
  },

  methods: {
    copyCommand(text: string): void {
      navigator.clipboard.writeText(text).then(() => {
        if (this.copyTimer) clearTimeout(this.copyTimer)
        this.copiedKey = text
        this.copyTimer = setTimeout(() => {
          this.copiedKey = null
        }, 1500)
      })
    },
  },
})
</script>

<style lang="scss" scoped>
.bsm-fade-enter-active,
.bsm-fade-leave-active { transition: opacity var(--tr-slow); }
.bsm-fade-enter-from,
.bsm-fade-leave-to     { opacity: 0; }

.bsm-backdrop {
  position:        fixed;
  inset:           0;
  z-index:         9000;
  background:      color-mix(in srgb, black 72%, transparent);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.bsm {
  background:     var(--color-surface);
  border:         1px solid var(--color-border);
  border-radius:  var(--radius-lg);
  width:          min(740px, 100%);
  max-height:     88vh;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;

  // ── Header ────────────────────────────────────────────────────────────────

  &__header {
    @include flex-between();
    padding:       1.1rem 1.4rem 1rem;
    border-bottom: 1px solid var(--color-border);
    gap:           0.75rem;
    flex-shrink:   0;
  }

  &__header-text {
    @include flex-col(0.2rem);
    min-width: 0;
  }

  &__title {
    font-size:   var(--fs-xl);
    font-weight: 600;
    color:       var(--color-text);
  }

  &__subtitle {
    font-size:   var(--fs-sm);
    color:       var(--color-text-muted);
    line-height: 1.4;
  }

  &__close {
    background:    transparent;
    border:        none;
    color:         var(--color-text-muted);
    font-size:     1rem;
    cursor:        pointer;
    padding:       0.25rem 0.4rem;
    border-radius: var(--radius);
    flex-shrink:   0;
    transition:    color var(--tr-fast), background var(--tr-fast);

    &:hover { color: var(--color-text); background: var(--color-surface-2); }
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  &__tabs {
    @include flex-row(0);
    border-bottom: 1px solid var(--color-border);
    padding:       0 1.4rem;
    flex-shrink:   0;
    overflow-x:    auto;
  }

  &__tab-btn {
    @include flex-row(0.3rem);
    background:    transparent;
    border:        none;
    border-bottom: 2px solid transparent;
    color:         var(--color-text-muted);
    font-size:     var(--fs-sm);
    padding:       0.55rem 0.85rem;
    cursor:        pointer;
    white-space:   nowrap;
    transition:    color var(--tr-fast), border-color var(--tr-fast);
    margin-bottom: -1px;

    &:hover { color: var(--color-text); }

    &--active {
      color:        var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  &__tab-icon {
    font-size: var(--fs-xs);
    opacity:   var(--op-dim);
  }

  // ── Scrollable body ───────────────────────────────────────────────────────

  &__body {
    overflow-y: auto;
    flex:       1;
    padding:    1.25rem 1.4rem;
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  &__footer {
    @include flex-row(0.4rem);
    border-top:  1px solid var(--color-border);
    padding:     0.7rem 1.4rem;
    font-size:   var(--fs-xs);
    color:       var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  // ── Responsive ────────────────────────────────────────────────────────────

  @media (max-width: 768px) {
    &__header { padding: 0.9rem 1rem 0.8rem; }
    &__tabs   { padding: 0 1rem; }
    &__body   { padding: 1rem; }
    &__footer { padding: 0.6rem 1rem; }
  }
}
</style>
