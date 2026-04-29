<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="bundle">
    <header class="bundle__header">
      <span class="bundle__icon" aria-hidden="true">{{ ICON.SECTION }}</span>
      <div class="bundle__header-text">
        <h3 class="bundle__title">{{ $t('reports.manuscriptTitle') }}</h3>
        <p class="bundle__subtitle">{{ $t('reports.manuscriptSubtitle') }}</p>
      </div>
    </header>

    <fieldset class="bundle__scope" :disabled="busy">
      <legend class="bundle__scope-legend">{{ $t('reports.manuscriptScopeLabel') }}</legend>
      <label class="bundle__scope-option" :class="{ 'bundle__scope-option--active': scope === 'session' }">
        <input
          type="radio"
          name="manuscript-scope"
          value="session"
          v-model="scope"
        />
        <span class="bundle__scope-option-text">
          <span class="bundle__scope-option-title">{{ $t('reports.manuscriptScopeSession') }}</span>
          <span class="bundle__scope-option-sub">{{ $t('reports.manuscriptScopeSessionSub', { name: sessionName }) }}</span>
        </span>
      </label>
      <label class="bundle__scope-option" :class="{ 'bundle__scope-option--active': scope === 'all' }">
        <input
          type="radio"
          name="manuscript-scope"
          value="all"
          v-model="scope"
        />
        <span class="bundle__scope-option-text">
          <span class="bundle__scope-option-title">{{ $t('reports.manuscriptScopeAll') }}</span>
          <span class="bundle__scope-option-sub">{{ $t('reports.manuscriptScopeAllSub') }}</span>
        </span>
      </label>
    </fieldset>

    <div class="bundle__formats" role="group" :aria-label="$t('reports.manuscriptFormatsLabel')">
      <button
        class="bundle__format bundle__format--md"
        :disabled="busy || !hasAnyEntry"
        v-tip="$t('reports.manuscriptMdTip')"
        @click="handleDownload('md')"
      >
        <span v-if="busyKey === 'md'" class="bundle__format-spinner" aria-hidden="true"></span>
        <span v-else class="bundle__format-icon" aria-hidden="true">{{ ICON.ARROW_D }}</span>
        <span class="bundle__format-text">
          <span class="bundle__format-title">{{ $t('reports.manuscriptMdLabel') }}</span>
          <span class="bundle__format-sub">{{ $t('reports.manuscriptMdSub') }}</span>
        </span>
      </button>

      <button
        class="bundle__format bundle__format--json"
        :disabled="busy || !hasAnyEntry"
        v-tip="$t('reports.manuscriptJsonTip')"
        @click="handleDownload('json')"
      >
        <span v-if="busyKey === 'json'" class="bundle__format-spinner" aria-hidden="true"></span>
        <span v-else class="bundle__format-icon" aria-hidden="true">{{ ICON.ARROW_D }}</span>
        <span class="bundle__format-text">
          <span class="bundle__format-title">{{ $t('reports.manuscriptJsonLabel') }}</span>
          <span class="bundle__format-sub">{{ $t('reports.manuscriptJsonSub') }}</span>
        </span>
      </button>

      <button
        class="bundle__format bundle__format--csv"
        :disabled="busy || !hasMeasuredEntry"
        v-tip="hasMeasuredEntry ? $t('reports.manuscriptCsvTip') : $t('reports.manuscriptCsvDisabledTip')"
        @click="handleDownload('csv')"
      >
        <span v-if="busyKey === 'csv'" class="bundle__format-spinner" aria-hidden="true"></span>
        <span v-else class="bundle__format-icon" aria-hidden="true">{{ ICON.ARROW_D }}</span>
        <span class="bundle__format-text">
          <span class="bundle__format-title">{{ $t('reports.manuscriptCsvLabel') }}</span>
          <span class="bundle__format-sub">{{ $t('reports.manuscriptCsvSub') }}</span>
        </span>
      </button>
    </div>

    <p class="bundle__entry-link">{{ $t('reports.manuscriptPerEntryNote') }}</p>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useExperimentStore } from '@/stores/experimentStore'

import { ICON } from '@/constants/icons'

import type { ManuscriptScope, ManuscriptScopeType } from '@/utils/manuscriptExport'

type FormatKey = 'md' | 'json' | 'csv'

export default defineComponent({
  name: 'ManuscriptBundle',

  data() {
    return {
      scope: 'session' as ManuscriptScopeType,
      busyKey: null as FormatKey | null,
    }
  },

  computed: {
    ICON() { return ICON },
    ...mapStores(useExperimentStore),

    sessionName(): string {
      return this.experimentStore.sessionName
    },

    hasAnyEntry(): boolean {
      const entries = this.experimentStore.entries
      if (this.scope === 'all') return entries.length > 0
      return entries.some(e => (e.sessionName ?? this.sessionName) === this.sessionName)
    },

    hasMeasuredEntry(): boolean {
      const entries = this.experimentStore.entries.filter(e =>
        this.scope === 'all' ? true : (e.sessionName ?? this.sessionName) === this.sessionName,
      )
      return entries.some(e => e.measured !== undefined)
    },

    busy(): boolean { return this.busyKey !== null },
  },

  methods: {
    async handleDownload(fmt: FormatKey) {
      if (this.busy) return
      this.busyKey = fmt
      try {
        const scope: ManuscriptScope = { type: this.scope, sessionName: this.sessionName }
        if (fmt === 'md')   await this.experimentStore.exportManuscriptMarkdown(scope)
        if (fmt === 'json') await this.experimentStore.exportManuscriptJson(scope)
        if (fmt === 'csv')  await this.experimentStore.exportManuscriptResidualsCsv(scope)
      } finally {
        this.busyKey = null
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.bundle {
  @include flex-col(0.85rem);
  width: 100%;
  padding: 1rem 1.1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 14%, transparent);
  margin-top: 0.4rem;

  &__header {
    @include flex-row(0.75rem);
    align-items: flex-start;
  }

  &__icon {
    font-size: var(--fs-lg);
    color: var(--color-primary);
    margin-top: 0.1rem;
  }

  &__header-text { @include flex-col(0.2rem); }

  &__title {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__scope {
    @include flex-col(0.4rem);
    border: none;
    padding: 0;
    margin: 0;
  }

  &__scope-legend {
    @include section-title();
    margin-bottom: 0.2rem;
  }

  &__scope-option {
    @include flex-row(0.6rem);
    align-items: flex-start;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 35%, transparent); }
    &--active { @include tinted-surface(primary, 35%, 6%); }

    input[type="radio"] {
      margin-top: 0.2rem;
      flex-shrink: 0;
      accent-color: var(--color-primary);
    }
  }

  &__scope-option-text { @include flex-col(0.1rem); flex: 1; min-width: 0; }

  &__scope-option-title {
    font-size: var(--fs-md);
    color: var(--color-text);
  }

  &__scope-option-sub {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.4;
    word-break: break-word;
  }

  &__formats {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;

    @media (min-width: 720px) { grid-template-columns: repeat(3, 1fr); }
  }

  &__format {
    @include flex-row(0.6rem);
    align-items: flex-start;
    padding: 0.65rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 38%, transparent);
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    color: var(--color-text);
    border-radius: var(--radius);
    cursor: pointer;
    text-align: left;
    transition: border-color var(--tr-fast), background var(--tr-fast), transform var(--tr-fast);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 65%, transparent);
    }

    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }

    &-icon {
      font-size: var(--fs-lg);
      color: var(--color-primary);
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    &-spinner {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
      border-top-color: var(--color-primary);
      animation: bundle-spin 0.6s linear infinite;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    &-text { @include flex-col(0.15rem); flex: 1; min-width: 0; }

    &-title {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-primary);
    }

    &-sub {
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      opacity: var(--op-dim);
      line-height: 1.4;
    }
  }

  &__note,
  &__entry-link {
    margin: 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.4;
  }
}

@keyframes bundle-spin { to { transform: rotate(360deg); } }
</style>
