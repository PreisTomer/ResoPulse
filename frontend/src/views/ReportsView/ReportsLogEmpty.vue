<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports-log-empty">
    <div class="reports-log-empty__icon">{{ $t('reports.emptyIcon') }}</div>
    <div class="reports-log-empty__text">{{ $t('reports.emptyText') }}</div>
    <p class="reports-log-empty__sub">
      {{ $t('reports.emptySub') }}
    </p>
    <RouterLink to="/experiment" class="reports-log-empty__btn">
      {{ $t('reports.emptyBtn') }}
    </RouterLink>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ReportsLogEmpty',
})
</script>

<style lang="scss" scoped>
.reports-log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 0.75rem;
  text-align: center;

  &__icon {
    font-size: 2.5rem;
    color: var(--color-border);
  }

  &__text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__sub {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    opacity: 0.65;
    max-width: 380px;
    line-height: 1.6;
    margin: 0;
  }

  &__btn {
    margin-top: 0.5rem;
    display: inline-flex;
    padding: 0.55rem 1.25rem;
    background: var(--color-primary-dim);
    color: var(--color-primary);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: var(--radius);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.15s;

    &:hover {
      background: rgba(0, 212, 255, 0.15);
      border-color: var(--color-primary);
    }
  }
}
</style>
