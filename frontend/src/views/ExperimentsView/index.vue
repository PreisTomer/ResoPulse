<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="experiments">
    <div class="experiments__inner">

      <!-- Page header -->
      <PageHeader :eyebrow="$t('experiments.eyebrow')" :title="$t('experiments.pageTitle')">
        <div class="experiments__header-row">
          <p class="experiments__subtitle">{{ $t('experiments.pageSubtitle') }}</p>
          <button
            class="experiments__save-btn"
            type="button"
            @click="openSaveModal"
          >{{ ICON.SAVE }}&nbsp;{{ $t('experiments.newBtn') }}</button>
        </div>
      </PageHeader>

      <!-- Toolbar: search + sort -->
      <div class="experiments__toolbar">
        <div class="experiments__search-wrap">
          <span class="experiments__search-icon">{{ ICON.SEARCH }}</span>
          <input
            class="experiments__search"
            type="search"
            :placeholder="$t('experiments.searchPlaceholder')"
            v-model="searchQuery"
            @input="onSearchInput"
            spellcheck="false"
          />
        </div>
        <select class="experiments__sort" v-model="sortBy" @change="onSortChange">
          <option value="updatedAt">{{ $t('experiments.sortUpdated') }}</option>
          <option value="createdAt">{{ $t('experiments.sortCreated') }}</option>
          <option value="title">{{ $t('experiments.sortTitle') }}</option>
        </select>
      </div>

      <!-- Flash feedback -->
      <transition name="exp-flash">
        <div v-if="flashMessage" class="experiments__flash">{{ flashMessage }}</div>
      </transition>

      <!-- Error banner -->
      <div v-if="storeError" class="experiments__error">{{ storeError }}</div>

      <!-- Initial loading dots -->
      <div v-if="isInitialLoading" class="experiments__loading">
        <span class="experiments__loading-dot"></span>
        <span class="experiments__loading-dot"></span>
        <span class="experiments__loading-dot"></span>
      </div>

      <!-- Grouped cards -->
      <template v-for="group in groupedExperiments" :key="group.key">
        <div class="experiments__group-label">{{ group.label }}</div>
        <div class="experiments__grid">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="exp-card"
            :class="{ 'exp-card--active': isActiveExperiment(item.id) }"
          >
            <!-- Header: title + badges -->
            <div class="exp-card__header">
              <span class="exp-card__title">{{ item.title }}</span>
              <div class="exp-card__badges">
                <span class="exp-card__version">{{ $t('experiments.versionLabel', { n: item.version }) }}</span>
                <span
                  v-if="item.shareMode"
                  class="exp-card__share-badge"
                  :class="`exp-card__share-badge--${item.shareMode}`"
                >{{ item.shareMode === 'view' ? $t('experiments.viewShareLabel') : $t('experiments.editShareLabel') }}</span>
                <span v-else class="exp-card__share-badge exp-card__share-badge--private">{{ $t('experiments.privateLabel') }}</span>
              </div>
            </div>

            <!-- Description -->
            <p v-if="item.description" class="exp-card__desc">{{ item.description }}</p>

            <!-- Dates -->
            <div class="exp-card__meta">
              <span>{{ $t('experiments.updatedLabel') }}: {{ formatDate(item.updatedAt) }}</span>
              <span>{{ $t('experiments.createdLabel') }}: {{ formatDate(item.createdAt) }}</span>
            </div>

            <!-- Action buttons -->
            <div class="exp-card__actions">
              <button
                class="exp-card__action-btn exp-card__action-btn--primary"
                type="button"
                :disabled="loadingId === item.id"
                @click="handleLoad(item.id)"
              >{{ $t('experiments.loadBtn') }}</button>
              <button
                class="exp-card__action-btn"
                type="button"
                @click="handleFork(item.id, item.title)"
              >{{ $t('experiments.forkBtn') }}</button>
              <button
                class="exp-card__action-btn"
                type="button"
                @click="toggleSharePanel(item.id)"
              >{{ ICON.LINK }}&nbsp;{{ $t('experiments.shareBtn') }}</button>
              <button
                class="exp-card__action-btn exp-card__action-btn--danger"
                type="button"
                @click="toggleDeleteConfirm(item.id)"
              >{{ $t('experiments.deleteBtn') }}</button>
            </div>

            <!-- Share panel -->
            <div v-if="shareOpenId === item.id" class="exp-card__share-panel">
              <div class="exp-card__share-row">
                <button
                  class="exp-card__share-mode-btn"
                  :class="{ 'exp-card__share-mode-btn--active': item.shareMode === 'view' }"
                  type="button"
                  :disabled="sharingInProgress"
                  @click="handleEnableSharing(item.id, 'view')"
                >{{ $t('experiments.viewShareLabel') }}</button>
                <button
                  class="exp-card__share-mode-btn"
                  :class="{ 'exp-card__share-mode-btn--active': item.shareMode === 'edit' }"
                  type="button"
                  :disabled="sharingInProgress"
                  @click="handleEnableSharing(item.id, 'edit')"
                >{{ $t('experiments.editShareLabel') }}</button>
              </div>
              <div class="exp-card__share-actions">
                <button
                  v-if="item.shareMode"
                  class="exp-card__share-copy-btn"
                  type="button"
                  @click="handleCopyLink(item.id)"
                >{{ ICON.LINK }}&nbsp;{{ $t('experiments.copyLinkBtn') }}</button>
                <button
                  v-if="item.shareMode"
                  class="exp-card__share-revoke-btn"
                  type="button"
                  :disabled="sharingInProgress"
                  @click="handleDisableSharing(item.id)"
                >{{ $t('experiments.sharingDisabled') }}</button>
              </div>
            </div>

            <!-- Delete confirmation -->
            <div v-if="deleteConfirmId === item.id" class="exp-card__delete-confirm">
              <span class="exp-card__delete-confirm-text">{{ $t('experiments.deleteConfirm') }}</span>
              <div class="exp-card__delete-confirm-actions">
                <button
                  class="exp-card__delete-confirm-btn exp-card__delete-confirm-btn--danger"
                  type="button"
                  @click="handleDelete(item.id)"
                >{{ $t('experiments.deleteBtn') }}</button>
                <button
                  class="exp-card__delete-confirm-btn"
                  type="button"
                  @click="deleteConfirmId = null"
                >{{ $t('experiments.saveModalCancel') }}</button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="isEmptyState" class="experiments__empty">
        <span class="experiments__empty-icon">{{ ICON.FOLDER }}</span>
        <p class="experiments__empty-text">
          {{ searchQuery ? $t('experiments.noResultsSearch') : $t('experiments.noResults') }}
        </p>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="experiments__load-more">
        <button
          class="experiments__load-more-btn"
          type="button"
          :disabled="isLoading"
          @click="loadMore"
        >{{ $t('experiments.loadMore') }}</button>
      </div>

    </div>

    <!-- Save modal -->
    <div v-if="saveModalOpen" class="experiments__backdrop" @click.self="closeSaveModal">
      <div class="experiments__modal">
        <h2 class="experiments__modal-title">{{ $t('experiments.saveModalTitle') }}</h2>

        <label class="experiments__modal-label">{{ $t('experiments.saveModalTitleField') }}</label>
        <input
          class="experiments__modal-input"
          type="text"
          v-model="saveTitleField"
          :placeholder="$t('experiments.saveModalTitlePlaceholder')"
          spellcheck="false"
          @keydown.enter="handleSave"
        />

        <label class="experiments__modal-label">{{ $t('experiments.saveModalDescField') }}</label>
        <textarea
          class="experiments__modal-textarea"
          v-model="saveDescField"
          :placeholder="$t('experiments.saveModalDescPlaceholder')"
          rows="2"
          spellcheck="false"
        ></textarea>

        <p class="experiments__modal-cost">{{ $t('experiments.saveModalCostNote', { n: SAVE_TOKEN_COST }) }}</p>

        <p v-if="saveError" class="experiments__modal-error">{{ saveError }}</p>

        <div class="experiments__modal-actions">
          <button
            class="experiments__modal-btn experiments__modal-btn--primary"
            type="button"
            :disabled="isSaveDisabled"
            @click="handleSave"
          >{{ isSaving ? $t('experiments.saveModalSaving') : $t('experiments.saveModalSaveBtn') }}</button>
          <button
            class="experiments__modal-btn"
            type="button"
            :disabled="isSaving"
            @click="closeSaveModal"
          >{{ $t('experiments.saveModalCancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useSavedExperimentsStore } from '@/stores/savedExperimentsStore'
import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useTokenStore } from '@/stores/tokenStore'

import PageHeader from '@/components/PageHeader.vue'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import type { SavedExperimentItem, ExperimentSnapshot } from '@/types/savedExperiment'

// ── Module-level constants ────────────────────────────────────────────────────
// Mirrors backend COST_MAP.SAVE_EXPERIMENT — update both if the cost changes.
const SAVE_TOKEN_COST = 2
const DEBOUNCE_MS     = 300
const FLASH_MS        = 2500

// ── Local types ───────────────────────────────────────────────────────────────

interface ExperimentGroup {
  key:   string
  label: string
  items: SavedExperimentItem[]
}

type DateBucket = 'today' | 'week' | 'month' | 'earlier'
type SortField  = 'updatedAt' | 'createdAt' | 'title'

export default defineComponent({
  name: 'ExperimentsView',

  components: { PageHeader },

  data() {
    return {
      searchQuery: '',
      sortBy:      'updatedAt' as SortField,
      sortDir:     'desc' as 'asc' | 'desc',
      searchTimer: null as ReturnType<typeof setTimeout> | null,

      // Save modal
      saveModalOpen:  false,
      saveTitleField: '',
      saveDescField:  '',
      isSaving:       false,
      saveError:      '',

      // Per-card interactive state
      shareOpenId:       null as string | null,
      deleteConfirmId:   null as string | null,
      sharingInProgress: false,
      loadingId:         null as string | null,

      // Flash feedback strip
      flashMessage: '',
      flashTimer:   null as ReturnType<typeof setTimeout> | null,
    }
  },

  computed: {
    ...mapStores(useSavedExperimentsStore, useCellStore, useExperimentStore, useTokenStore),

    ICON():            typeof ICON  { return ICON },
    ROUTE():           typeof ROUTE { return ROUTE },
    SAVE_TOKEN_COST(): number       { return SAVE_TOKEN_COST },

    experiments(): SavedExperimentItem[] {
      return this.savedExperimentsStore.experiments
    },

    hasMore(): boolean {
      return this.savedExperimentsStore.hasMore
    },

    isLoading(): boolean {
      return this.savedExperimentsStore.isLoading
    },

    storeError(): string | null {
      return this.savedExperimentsStore.error
    },

    isInitialLoading(): boolean {
      return this.isLoading && this.experiments.length === 0
    },

    isEmptyState(): boolean {
      return !this.isLoading && this.experiments.length === 0
    },

    isSaveDisabled(): boolean {
      return !this.saveTitleField.trim() || this.isSaving
    },

    groupedExperiments(): ExperimentGroup[] {
      const bucketOrder: DateBucket[] = ['today', 'week', 'month', 'earlier']
      const bucketLabels: Record<DateBucket, string> = {
        today:   this.$t('experiments.filterToday'),
        week:    this.$t('experiments.filterThisWeek'),
        month:   this.$t('experiments.filterThisMonth'),
        earlier: this.$t('experiments.filterEarlier'),
      }
      const grouped: Record<DateBucket, SavedExperimentItem[]> = {
        today: [], week: [], month: [], earlier: [],
      }
      for (const item of this.experiments) {
        grouped[this.dateBucket(item.updatedAt)].push(item)
      }
      return bucketOrder
        .filter((b) => grouped[b].length > 0)
        .map((b)  => ({ key: b, label: bucketLabels[b], items: grouped[b] }))
    },
  },

  async mounted() {
    await this.savedExperimentsStore.fetchList(this.searchQuery, this.sortBy, this.sortDir)
  },

  beforeUnmount() {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    if (this.flashTimer)  clearTimeout(this.flashTimer)
  },

  methods: {
    // ── List management ───────────────────────────────────────────────────────

    async loadMore(): Promise<void> {
      await this.savedExperimentsStore.fetchNextPage(this.searchQuery, this.sortBy, this.sortDir)
    },

    onSearchInput(): void {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.savedExperimentsStore.fetchList(this.searchQuery, this.sortBy, this.sortDir)
      }, DEBOUNCE_MS)
    },

    onSortChange(): void {
      this.savedExperimentsStore.fetchList(this.searchQuery, this.sortBy, this.sortDir)
    },

    // ── Save modal ────────────────────────────────────────────────────────────

    openSaveModal(): void {
      this.saveTitleField = this.experimentStore.sampleDescription || this.experimentStore.sessionName || ''
      this.saveDescField  = ''
      this.saveError      = ''
      this.saveModalOpen  = true
    },

    closeSaveModal(): void {
      if (this.isSaving) return
      this.saveModalOpen = false
    },

    async handleSave(): Promise<void> {
      if (this.isSaveDisabled) return

      const canProceed = await this.tokenStore.consumeOperation('SAVE_EXPERIMENT')
      if (!canProceed) {
        this.saveError = this.$t('experiments.errorInsufficientTokens')
        return
      }

      this.isSaving  = true
      this.saveError = ''
      try {
        const snapshot = this.buildSnapshot()
        const result   = await this.savedExperimentsStore.createExperiment(
          this.saveTitleField.trim(),
          this.saveDescField.trim() || null,
          snapshot,
        )
        if (result) {
          this.saveModalOpen = false
          this.showFlash(this.$t('experiments.successSaved'))
        } else {
          this.saveError = this.$t('experiments.errorGeneric')
        }
      } finally {
        this.isSaving = false
      }
    },

    // ── Load into lab ─────────────────────────────────────────────────────────

    async handleLoad(id: string): Promise<void> {
      this.loadingId = id
      try {
        const detail = await this.savedExperimentsStore.getDetail(id)
        if (!detail) {
          this.showFlash(this.$t('experiments.errorLoad'))
          return
        }
        // Restore cell and experiment state from snapshot
        this.cellStore.$patch((state) => { Object.assign(state, detail.snapshot.cellState) })
        this.experimentStore.$patch((state) => { Object.assign(state, detail.snapshot.experimentState) })
        this.savedExperimentsStore.setActiveId(id)
        this.$router.push(ROUTE.EXPERIMENT)
      } finally {
        this.loadingId = null
      }
    },

    // ── Duplicate ─────────────────────────────────────────────────────────────

    async handleFork(id: string, title: string): Promise<void> {
      const newTitle = `${this.$t('experiments.forkTitlePrefix')} ${title}`.slice(0, 120)
      const result   = await this.savedExperimentsStore.forkExperiment(id, newTitle)
      if (result) {
        this.showFlash(this.$t('experiments.successSaved'))
      }
    },

    // ── Delete ────────────────────────────────────────────────────────────────

    toggleDeleteConfirm(id: string): void {
      this.deleteConfirmId = this.deleteConfirmId === id ? null : id
      this.shareOpenId     = null
    },

    async handleDelete(id: string): Promise<void> {
      const ok = await this.savedExperimentsStore.deleteExperiment(id)
      if (ok) {
        this.deleteConfirmId = null
        this.showFlash(this.$t('experiments.successDeleted'))
      } else {
        this.showFlash(this.$t('experiments.errorDelete'))
      }
    },

    // ── Share ─────────────────────────────────────────────────────────────────

    toggleSharePanel(id: string): void {
      this.shareOpenId     = this.shareOpenId === id ? null : id
      this.deleteConfirmId = null
    },

    async handleEnableSharing(id: string, shareMode: 'view' | 'edit'): Promise<void> {
      this.sharingInProgress = true
      await this.savedExperimentsStore.enableSharing(id, shareMode)
      this.sharingInProgress = false
    },

    async handleDisableSharing(id: string): Promise<void> {
      this.sharingInProgress = true
      await this.savedExperimentsStore.disableSharing(id)
      this.sharingInProgress = false
    },

    async handleCopyLink(id: string): Promise<void> {
      // Fetch the full detail to get the shareToken (not included in list items)
      const detail = await this.savedExperimentsStore.getDetail(id)
      if (!detail?.shareToken) return
      const url = `${window.location.origin}${ROUTE.EXPERIMENT}?exp=${detail.shareToken}`
      await navigator.clipboard.writeText(url)
      this.showFlash(this.$t('experiments.successCopied'))
    },

    // ── Helpers ───────────────────────────────────────────────────────────────

    buildSnapshot(): ExperimentSnapshot {
      return {
        schemaVersion:   1,
        capturedAt:      new Date().toISOString(),
        cellState:       JSON.parse(JSON.stringify(this.cellStore.$state)) as Record<string, unknown>,
        experimentState: JSON.parse(JSON.stringify(this.experimentStore.$state)) as Record<string, unknown>,
      }
    },

    isActiveExperiment(id: string): boolean {
      return id === this.savedExperimentsStore.activeId
    },

    showFlash(msg: string): void {
      this.flashMessage = msg
      if (this.flashTimer) clearTimeout(this.flashTimer)
      this.flashTimer = setTimeout(() => { this.flashMessage = '' }, FLASH_MS)
    },

    formatDate(isoStr: string): string {
      const d   = new Date(isoStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
      if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    },

    dateBucket(isoStr: string): DateBucket {
      const now     = new Date()
      const d       = new Date(isoStr)
      const diffDay = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      if (d.toDateString() === now.toDateString()) return 'today'
      if (diffDay < 7) return 'week'
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'month'
      return 'earlier'
    },
  },
})
</script>

<style lang="scss" scoped>

.experiments {
  flex: 1;
  min-height: 0;
  padding: 0 0 3rem;

  &__inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem;
    @include flex-col(1rem);
  }

  &__header-row {
    @include flex-between(0);
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }

  &__subtitle {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    opacity: var(--op-muted);
    margin: 0;
  }

  &__save-btn {
    @include flex-row(0.4rem);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.06em;
    padding: 0.35rem 0.85rem;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 22%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    }
  }

  // ── Toolbar ─────────────────────────────────────────────────────────────────
  &__toolbar {
    @include flex-row(0.6rem);
    flex-wrap: wrap;
  }

  &__search-wrap {
    @include flex-row(0.4rem);
    flex: 1;
    min-width: 200px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0 0.65rem;
    transition: border-color var(--tr-fast);

    &:focus-within { border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); }
  }

  &__search-icon {
    font-size: var(--fs-sm);
    opacity: var(--op-muted);
    pointer-events: none;
  }

  &__search {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: var(--fs-sm);
    padding: 0.38rem 0;
    outline: none;

    &::placeholder { opacity: var(--op-muted); }
    &::-webkit-search-cancel-button { opacity: var(--op-muted); cursor: pointer; }
  }

  &__sort {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    padding: 0.38rem 0.65rem;
    cursor: pointer;
    -moz-appearance: none;
    appearance: none;
    transition: border-color var(--tr-fast);

    &:focus { outline: none; border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); }
  }

  // ── Feedback ─────────────────────────────────────────────────────────────────
  &__flash {
    padding: 0.4rem 0.75rem;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.04em;
  }

  &__error {
    padding: 0.4rem 0.75rem;
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger) 28%, transparent);
    border-radius: var(--radius);
    color: var(--color-danger);
    font-size: var(--fs-sm);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  &__loading {
    @include flex-row(0.4rem);
    justify-content: center;
    padding: 3.5rem 0;
  }

  &__loading-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: pulse-dot 1.2s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }

  // ── Groups ───────────────────────────────────────────────────────────────────
  &__group-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: var(--op-muted);
    margin-bottom: -0.25rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;

    @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 560px) { grid-template-columns: 1fr; }
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  &__empty {
    @include flex-col(0.75rem);
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    text-align: center;

    &-icon { font-size: 2rem; opacity: var(--op-ghost); }
    &-text {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      opacity: var(--op-muted);
      margin: 0;
    }
  }

  // ── Load more ─────────────────────────────────────────────────────────────────
  &__load-more {
    @include flex-row(0);
    justify-content: center;
    padding: 0.25rem 0 0.5rem;
  }

  &__load-more-btn {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.05em;
    padding: 0.35rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 7%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: default; }
  }

  // ── Save modal ────────────────────────────────────────────────────────────────
  &__backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-bg) 72%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  &__modal {
    @include surface-card(var(--radius-lg), 1.5rem);
    width: min(520px, 90vw);
    @include flex-col(0.6rem);
  }

  &__modal-title {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0 0 0.35rem;
  }

  &__modal-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: var(--op-muted);
    margin: 0.2rem 0 0;
  }

  &__modal-input,
  &__modal-textarea {
    background: color-mix(in srgb, var(--color-bg) 55%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: var(--fs-sm);
    padding: 0.45rem 0.65rem;
    outline: none;
    resize: none;
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
    &::placeholder { opacity: var(--op-muted); }
  }

  &__modal-textarea { resize: vertical; min-height: 52px; }

  &__modal-cost {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    opacity: var(--op-muted);
    margin: 0;
    letter-spacing: 0.04em;
  }

  &__modal-error {
    font-size: var(--fs-sm);
    color: var(--color-danger);
    margin: 0;
  }

  &__modal-actions {
    @include flex-row(0.5rem);
    justify-content: flex-end;
    margin-top: 0.15rem;
  }

  &__modal-btn {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.05em;
    padding: 0.4rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-text) 6%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: default; }

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 16%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 42%, transparent);
      color: var(--color-primary);

      &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 26%, transparent); }
    }
  }
}

// ── Experiment card ─────────────────────────────────────────────────────────
.exp-card {
  @include surface-card(var(--radius), 0.9rem);
  @include flex-col(0.45rem);
  transition: border-color var(--tr-fast);

  &:hover { border-color: color-mix(in srgb, var(--color-primary) 35%, transparent); }

  &--active { border-color: color-mix(in srgb, var(--color-primary) 55%, transparent); }

  &__header {
    @include flex-between(0.5rem);
    flex-wrap: wrap;
    align-items: flex-start;
  }

  &__title {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text-heading);
    flex: 1;
    line-height: 1.3;
    word-break: break-word;
  }

  &__badges {
    @include flex-row(0.3rem);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  &__version {
    font-family: var(--font-mono);
    font-size: 0.6rem; // deliberate micro-size below scale for version chips
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    opacity: var(--op-dim);
  }

  &__share-badge {
    font-family: var(--font-mono);
    font-size: 0.6rem; // deliberate micro-size — same as version chip
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    border: 1px solid;

    &--view    { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 38%, transparent); }
    &--edit    { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber)   38%, transparent); }
    &--private { color: var(--color-text);    border-color: var(--color-border); opacity: var(--op-muted); }
  }

  &__desc {
    font-size: var(--fs-sm);
    opacity: var(--op-dim);
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
  }

  &__meta {
    @include flex-row(0.65rem);
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    opacity: var(--op-muted);
    letter-spacing: 0.03em;
  }

  &__actions {
    @include flex-row(0.3rem);
    flex-wrap: wrap;
    margin-top: 0.1rem;
  }

  &__action-btn {
    font-family: var(--font-mono);
    font-size: 0.65rem; // deliberate micro-size — action row is dense
    letter-spacing: 0.04em;
    padding: 0.22rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-text) 7%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: default; }

    &--primary {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
      &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
    }

    &--danger {
      color: var(--color-danger);
      border-color: color-mix(in srgb, var(--color-danger) 32%, transparent);
      &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 9%, transparent); }
    }
  }

  // ── Share panel ─────────────────────────────────────────────────────────────
  &__share-panel {
    border-top: 1px solid var(--color-border);
    padding-top: 0.55rem;
    margin-top: 0.05rem;
    @include flex-col(0.4rem);
  }

  &__share-row { @include flex-row(0.3rem); }

  &__share-mode-btn {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: all var(--tr-fast);

    &--active {
      background: color-mix(in srgb, var(--color-primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 42%, transparent);
      color: var(--color-primary);
    }

    &:disabled { opacity: var(--op-muted); cursor: default; }
  }

  &__share-actions { @include flex-row(0.3rem); }

  &__share-copy-btn,
  &__share-revoke-btn {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: all var(--tr-fast);
  }

  &__share-copy-btn {
    color: var(--color-primary);
    border-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
    &:hover { background: color-mix(in srgb, var(--color-primary) 9%, transparent); }
  }

  &__share-revoke-btn {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 28%, transparent);
    &:hover { background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: default; }
  }

  // ── Delete confirmation ──────────────────────────────────────────────────────
  &__delete-confirm {
    border-top: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
    padding-top: 0.55rem;
    margin-top: 0.05rem;
    @include flex-col(0.35rem);

    &-text {
      font-size: var(--fs-sm);
      opacity: var(--op-dim);
    }

    &-actions { @include flex-row(0.3rem); }

    &-btn {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      letter-spacing: 0.04em;
      padding: 0.22rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: transparent;
      color: var(--color-text);
      cursor: pointer;
      transition: all var(--tr-fast);

      &:hover:not(&--danger) { background: color-mix(in srgb, var(--color-text) 6%, transparent); }

      &--danger {
        color: var(--color-danger);
        border-color: color-mix(in srgb, var(--color-danger) 38%, transparent);
        &:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); }
      }
    }
  }
}

// ── Flash transition ──────────────────────────────────────────────────────────
.exp-flash-enter-active,
.exp-flash-leave-active { transition: opacity var(--tr-slow), transform var(--tr-slow); }
.exp-flash-enter-from,
.exp-flash-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
