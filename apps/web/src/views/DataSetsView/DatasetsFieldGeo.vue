<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="datasets__card datasets__card--flat">
    <div class="datasets__card-hdr">
      <h2 class="datasets__card-title">{{ $t('datasets.fieldGeo.sectionTitle') }}</h2>
    </div>
    <div class="datasets__geo-body">
      <p class="datasets__geo-text" v-html="$t('datasets.fieldGeo.geoParagraph')"></p>
      <div class="datasets__geo-assumptions">
        <div v-for="n in 5" :key="n" class="datasets__geo-item">
          <span class="datasets__geo-icon">◈</span>
          <span v-html="$t(`datasets.fieldGeo.assumption${n}`)"></span>
        </div>
      </div>
      <div class="datasets__geo-sep">
        <span class="datasets__geo-sep-label">{{ $t('datasets.fieldGeo.correctionsLabel') }}</span>
      </div>
      <div class="datasets__geo-corrections">
        <div v-for="n in [6, 7, 8]" :key="n" class="datasets__geo-item datasets__geo-item--formula">
          <span class="datasets__geo-icon">◈</span>
          <span v-html="$t(`datasets.fieldGeo.assumption${n}`)"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DatasetsFieldGeo',
})
</script>

<style lang="scss" scoped>

@use './datasets' as ds;

@include ds.datasets-card();

.datasets {
  &__geo-body {
    padding: 1.5rem;
  }

  &__geo-text {
    font-size: var(--fs-lg);
    color: var(--color-text);
    line-height: 1.8;
    margin: 0 0 1.25rem;

    strong { color: var(--color-text-heading); }
  }

  &__geo-assumptions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem 0.75rem;
  }

  &__geo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: calc(var(--radius) / 2);
    padding: 0.45rem 0.65rem;

    &--formula {
      background: var(--color-primary-surface);
      border: none;
      border-left: 2px solid var(--color-primary-border);
      border-radius: 0 calc(var(--radius) / 2) calc(var(--radius) / 2) 0;
      padding: 0.55rem 0.85rem;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
    }
  }

  &__geo-sep {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0.9rem 0 0.4rem;

    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }
  }

  &__geo-sep-label {
    @include mono-upper(var(--fs-xs), 0.1em);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__geo-corrections {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__geo-icon {
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 0.15rem;
  }
}
</style>
