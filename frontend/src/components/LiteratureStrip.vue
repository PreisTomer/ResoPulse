<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="lit-strip" :aria-label="$t('litStrip.ariaLabel')">
    <span class="lit-strip__prefix">{{ $t('litStrip.prefix') }}</span>
    <nav class="lit-strip__chips">
      <RouterLink
        v-for="chip in chips"
        :key="chip.refId"
        :to="`${ROUTE.PROTOCOL}#${chip.refId}`"
        class="lit-strip__chip"
      >{{ $t(chip.labelKey) }}</RouterLink>
    </nav>
    <RouterLink :to="`${ROUTE.PROTOCOL}#refs`" class="lit-strip__view-all">
      {{ $t('litStrip.viewAll') }} <span class="lit-strip__arrow" aria-hidden="true">{{ ICON.ARROW_R }}</span>
    </RouterLink>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

const CHIPS = [
  { refId: 'ref-1',  labelKey: 'litStrip.schwan'  },
  { refId: 'ref-3',  labelKey: 'litStrip.weaver'  },
  { refId: 'ref-9',  labelKey: 'litStrip.kotnik'  },
  { refId: 'ref-16', labelKey: 'litStrip.pennes'  },
  { refId: 'ref-12', labelKey: 'litStrip.dykeman' },
]

export default defineComponent({
  name: 'LiteratureStrip',

  data() {
    return { chips: CHIPS }
  },

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },
  },
})
</script>

<style lang="scss" scoped>
.lit-strip {
  @include flex-row(0);
  align-items: center;
  gap: 0;
  height: 30px;
  padding: 0 1.75rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 60px;
  z-index: 99;
  overflow: hidden;

  &__prefix {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text);
    flex-shrink: 0;
    margin-right: 0.85rem;
  }

  &__chips {
    @include flex-row(0.1rem);
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  &__chip {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-text);
    text-decoration: none;
    padding: 0.15rem 0.55rem;
    border-radius: 3px;
    white-space: nowrap;
    transition: color var(--tr-fast), background var(--tr-fast);

    &::before {
      content: '[';
      color: var(--color-text-muted);
      margin-right: 1px;
    }

    &::after {
      content: ']';
      color: var(--color-text-muted);
      margin-left: 1px;
    }

    &:hover {
      color: var(--color-primary);
      background: var(--color-primary-surface);
    }
  }

  &__view-all {
    @include mono-upper(var(--fs-xxs), 0.06em);
    @include flex-row(0.3rem);
    flex-shrink: 0;
    margin-left: auto;
    padding-left: 1rem;
    color: var(--color-primary);
    text-decoration: none;
    opacity: var(--op-strong);
    transition: opacity var(--tr-fast);
    white-space: nowrap;

    &:hover { opacity: 1; }
  }

  &__arrow {
    font-size: 0.8em;
  }

  @media (max-width: 768px) {
    display: none;
  }
}
</style>
