<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div id="hl-setup-bar" class="experiment__header">

    <!-- Far left: session name + copy link -->
    <div class="experiment__header-left">
      <label class="experiment__session-name-wrap" v-tip="$t('exp.renameSession')">
        <input
          v-model="experimentStore.sessionName"
          class="experiment__session-name"
          spellcheck="false"
          :style="{ width: sessionNameWidth }"
        />
        <span class="experiment__session-name-edit" aria-hidden="true">{{ ICON.EDIT }}</span>
      </label>
      <button
        id="hl-share-btn"
        class="experiment__share-btn"
        :class="{ 'experiment__share-btn--copied': shareCopied }"
        v-tip="$t('exp.copyLinkTip')"
        @click="copyShareUrl"
      >
        <span>{{ ICON.LINK }}</span>
        {{ shareCopied ? $t('exp.copyLinkDone') : $t('exp.copyLink') }}
      </button>
      <button
        class="experiment__share-btn experiment__share-btn--opentrons"
        v-tip="$t('exp.opentronsExportTip')"
        @click="opentronsModalOpen = true"
      >
        <span>{{ ICON.FLASK }}</span>
        {{ $t('exp.opentronsExportBtn') }}
      </button>
    </div>

    <OpentronsExportModal
      :is-open="opentronsModalOpen"
      @close="opentronsModalOpen = false"
    />

    <!-- Far right: connection status -->
    <div class="experiment__header-right">
      <RouterLink
        v-if="showZDriftBadge"
        :to="ROUTE.INSTRUMENT"
        class="experiment__z-drift-badge"
        v-tip="$t('exp.zDriftTip')"
      >
        <span class="experiment__z-drift-icon">{{ ICON.FLASK }}</span>
        {{ $t('exp.zDriftLabel') }} {{ impedanceStore.impedanceDriftPct.toFixed(1) }}%
      </RouterLink>
      <span
        class="experiment__chip"
        :class="socketConnected ? 'experiment__chip--connected' : 'experiment__chip--local'"
        v-tip="socketConnected ? $t('exp.connectedTip') : $t('exp.localTip')"
      >
        <span class="experiment__chip-dot" :class="socketConnected ? '' : 'experiment__chip-dot--warn'"></span>
        {{ socketConnected ? $t('exp.connected').toUpperCase() : $t('exp.local').toUpperCase() }}
      </span>
      <span
        class="experiment__chip"
        :class="systemStatusChipClass"
        v-tip="systemStatusTip"
      >
        <span class="experiment__chip-dot" :class="systemStatusDotClass"></span>
        {{ systemStatusLabel }}
      </span>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useImpedanceStore } from '@/stores/impedanceStore'

import { socketConnected } from '@/services/socket'

import { buildShareUrl } from '@/utils/shareUrl'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import OpentronsExportModal from './OpentronsExportModal.vue'

export default defineComponent({
  name: 'ExperimentHeader',

  components: { OpentronsExportModal },

  data() {
    return {
      socketConnected,
      shareCopied: false,
      shareCopiedTimer: null as ReturnType<typeof setTimeout> | null,
      opentronsModalOpen: false,
    }
  },

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },
    ...mapStores(useCellStore, useExperimentStore, useImpedanceStore),

    sessionNameWidth(): string {
      // ch units are accurate for monospace fonts; +2 gives room for the caret
      // and accumulated letter-spacing at the end of the text
      const len = (this.experimentStore.sessionName || 'Session').length
      return `${Math.max(len + 2, 8)}ch`
    },

    showZDriftBadge(): boolean {
      return Math.abs(this.impedanceStore.impedanceDriftPct) > 5
    },

    systemReady(): boolean     { return this.cellStore.systemReady },
    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },

    systemStatusChipClass(): string {
      if (this.isResonanceMode) return 'experiment__chip--acoustic'
      return this.systemReady ? 'experiment__chip--ready' : 'experiment__chip--warning'
    },

    systemStatusDotClass(): string {
      if (this.isResonanceMode) return 'experiment__chip-dot--acoustic'
      return this.systemReady ? '' : 'experiment__chip-dot--warn'
    },

    systemStatusLabel(): string {
      if (this.isResonanceMode) return this.$t('nav.modeAcoustic').toUpperCase()
      return (this.systemReady ? this.$t('nav.systemReady') : this.$t('nav.systemWarning')).toUpperCase()
    },

    systemStatusTip(): string {
      if (this.isResonanceMode) return this.$t('nav.tipModeAcoustic')
      return this.systemReady ? this.$t('nav.tipSystemReady') : this.$t('nav.tipSystemWarning')
    },
  },

  methods: {
    async copyShareUrl(): Promise<void> {
      const url = buildShareUrl()
      await navigator.clipboard.writeText(url)
      this.shareCopied = true
      if (this.shareCopiedTimer !== null) clearTimeout(this.shareCopiedTimer)
      this.shareCopiedTimer = setTimeout(() => { this.shareCopied = false }, 2000)
    },
  },
})
</script>

<style lang="scss" scoped>

// ── BEM block: experiment — header-level elements only ────────────────────────
.experiment {

  // ── Header bar — blends with workspace rather than banding it off ───────────
  &__header {
    @include flex-between(1rem);
    align-items: center;
    padding: 0.55rem 1.75rem 0.5rem;
    border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 14%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface) 55%, transparent) 0%,
      transparent 100%
    );
    flex-shrink: 0;

    @media (max-width: 768px) { padding: 0.5rem 0.65rem 0.45rem; }

    @media (max-width: 540px) {
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0.45rem 0.6rem 0.4rem;
    }

    &-left {
      @include flex-row(0.6rem);
      align-items: center;

      @media (max-width: 540px) { flex: 1; order: 1; }
    }

    &-right {
      @include flex-row(0.85rem);
      justify-self: end;

      @media (max-width: 540px) { flex-shrink: 0; order: 2; }
    }
  }

  // ── Session name input — persistent dotted underline + pencil affordance ─
  &__session-name-wrap {
    @include flex-row(0.3rem);
    align-items: center;
    padding: 0.12rem 0.45rem 0.12rem 0.1rem;
    border-radius: 4px;
    cursor: text;
    border: 1px solid transparent;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
      background: color-mix(in srgb, var(--color-primary)  4%, transparent);

      .experiment__session-name-edit { opacity: var(--op-strong); }
    }
  }

  &__session-name {
    background: transparent;
    border: none;
    border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 28%, transparent);
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.06em;
    outline: none;
    padding: 0.05rem 0.1rem;
    transition: border-color var(--tr-fast);

    &:focus { border-bottom: 1px solid var(--color-primary); }
  }

  &__session-name-edit {
    font-size: var(--fs-xs);
    color: var(--color-primary);
    opacity: var(--op-ghost);
    transition: opacity var(--tr-fast);
    pointer-events: none;
  }

  // ── Connection status chip ────────────────────────────────────────────────────
  &__chip {
    @include flex-row(0.3rem);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.1em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    white-space: nowrap;

    &--local    { border-color: color-mix(in srgb, var(--color-amber) 30%, transparent); color: var(--color-amber); }
    &--connected { border-color: color-mix(in srgb, var(--color-lime) 35%, transparent); color: var(--color-lime); }
    &--ready    { border-color: color-mix(in srgb, var(--color-accent) 30%, transparent); color: var(--color-accent); }
    &--warning  { border-color: color-mix(in srgb, var(--color-amber) 30%, transparent); color: var(--color-amber); }
    &--acoustic { border-color: color-mix(in srgb, var(--color-amber) 30%, transparent); color: var(--color-amber); }

    &-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-primary);
      flex-shrink: 0;
      animation: pulse-dot 2s ease-in-out infinite;

      &--warn    { background: var(--color-amber); animation: none; }
      &--acoustic { background: var(--color-amber); animation: pulse-dot 1.8s ease-in-out infinite; }
    }
  }

  // ── Z-drift badge ─────────────────────────────────────────────────────────────
  &__z-drift-badge {
    @include inline-flex-center();
    gap: 0.25rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.08em;
    padding: 0.18rem 0.5rem;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-amber) 45%, transparent);
    color: var(--color-amber);
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    text-decoration: none;
    white-space: nowrap;
    animation: pulse-dot 2s ease-in-out infinite;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-amber) 16%, transparent); }
  }

  &__z-drift-icon { font-size: var(--fs-xs); }

  // ── Share / copy-link button ──────────────────────────────────────────────────
  &__share-btn {
    @include flex-row(0.3rem);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.08em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    color: var(--color-primary);
    background: transparent;
    cursor: pointer;
    white-space: nowrap;
    opacity: var(--op-partial);
    transition: opacity var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast), color var(--tr-fast);

    &:hover {
      opacity: 1;
      @include tinted-surface(primary, 60%, 6%);
    }

    &--copied {
      opacity: 1;
      @include color-variant(lime, 50%, 6%);
    }

    @media (max-width: 540px) { display: none; }
  }
}
</style>
