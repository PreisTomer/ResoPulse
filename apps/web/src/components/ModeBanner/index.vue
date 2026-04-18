<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="mode-banner">
    <div
      v-if="visible"
      class="mode-banner"
      :class="isResonanceMode ? 'mode-banner--acoustic' : 'mode-banner--schwan'"
    >
      <span class="mode-banner__dot"></span>
      <span class="mode-banner__text">{{ bannerText }}</span>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

const BANNER_DURATION_MS = 9000

export default defineComponent({
  name: 'ModeBanner',

  data() {
    return {
      visible:         false,
      _dismissTimer:   null as ReturnType<typeof setTimeout> | null,
    }
  },

  computed: {
    ...mapStores(useCellStore),

    isResonanceMode(): boolean {
      return this.cellStore.isResonanceMode
    },

    bannerText(): string {
      return this.isResonanceMode
        ? this.$t('nav.bannerAcoustic')
        : this.$t('nav.bannerSchwan')
    },
  },

  watch: {
    isResonanceMode() {
      this.showBanner()
    },
  },

  methods: {
    showBanner() {
      if (this._dismissTimer !== null) {
        clearTimeout(this._dismissTimer)
        this._dismissTimer = null
      }
      this.visible = true
      this._dismissTimer = setTimeout(() => {
        this.visible = false
        this._dismissTimer = null
      }, BANNER_DURATION_MS)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.mode-banner {
  position: sticky;
  top: 60px;
  z-index: 99;
  width: 100%;
  padding: 0.6rem 2rem;
  @include flex-row(0.7rem);
  justify-content: center;
  @include mono-upper(var(--fs-sm));
  letter-spacing: 0.12em;
  font-weight: 700;
  border-top: 1px solid;
  border-bottom: 2px solid;
  pointer-events: none;

  &--acoustic {
    background: color-mix(in srgb, var(--color-amber) 22%, var(--color-bg));
    border-color: color-mix(in srgb, var(--color-amber) 60%, transparent);
    color: var(--color-amber);
    text-shadow: 0 0 12px color-mix(in srgb, var(--color-amber) 55%, transparent);
  }

  &--schwan {
    background: color-mix(in srgb, var(--color-primary) 22%, var(--color-bg));
    border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    color: var(--color-primary);
    text-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: mode-banner-pulse 1.1s ease-in-out infinite;

    .mode-banner--acoustic & { background: var(--color-amber); box-shadow: 0 0 6px var(--color-amber); }
    .mode-banner--schwan  & { background: var(--color-primary); box-shadow: 0 0 6px var(--color-primary); }
  }
}

@keyframes mode-banner-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}

.mode-banner-enter-active,
.mode-banner-leave-active {
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.mode-banner-enter-from,
.mode-banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
