<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="guest-panel" @click="toggleMenu">

    <!-- ── Trigger: caret + "G" avatar ─────────────────────────────────────── -->
    <div class="guest-panel__trigger">
      <span class="guest-panel__caret">{{ ICON.EXPAND }}</span>
      <div class="guest-panel__avatar-wrap">
        <span class="guest-panel__avatar">G</span>
      </div>
    </div>

    <!-- ── Dropdown ───────────────────────────────────────────────────────── -->
    <div v-if="menuOpen" class="guest-panel__panel" @click.stop>

      <!-- Identity row -->
      <div class="guest-panel__identity">
        <div class="guest-panel__id-avatar-wrap">
          <span class="guest-panel__id-avatar">G</span>
        </div>
        <div class="guest-panel__id-text">
          <span class="guest-panel__id-name">{{ $t('nav.guestName') }}</span>
          <span class="guest-panel__id-label">{{ $t('nav.guestLabel') }}</span>
        </div>
      </div>

      <!-- Note -->
      <p class="guest-panel__note">{{ $t('nav.guestDropdownNote') }}</p>

      <div class="guest-panel__divider"></div>

      <!-- CTAs -->
      <RouterLink :to="ROUTE.SIGN_UP" class="guest-panel__signup-btn" @click="closeMenu">
        {{ $t('nav.guestSignUpCta') }}
      </RouterLink>
      <RouterLink :to="ROUTE.SIGN_IN" class="guest-panel__signin-btn" @click="closeMenu">
        {{ $t('nav.guestSignInCta') }}
      </RouterLink>

      <div class="guest-panel__divider"></div>

      <!-- Appearance toggle -->
      <div class="guest-panel__appearance">
        <span class="guest-panel__appearance-label">{{ $t('nav.appearance') }}</span>
        <div class="guest-panel__theme-pills">
          <button
            class="guest-panel__theme-pill"
            :class="{ 'guest-panel__theme-pill--active': !isOled }"
            @click.stop="setTheme('dark')"
          >{{ $t('nav.themeDark') }}</button>
          <button
            class="guest-panel__theme-pill"
            :class="{ 'guest-panel__theme-pill--active': isOled }"
            @click.stop="setTheme('oled')"
          >{{ $t('nav.themeOled') }}</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useTokenStore } from '@/stores/tokenStore'
import { useThemeStore } from '@/stores/themeStore'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'NavGuestArea',

  data() {
    return { menuOpen: false }
  },

  watch: {
    // Open the dropdown automatically when a guest tries a premium operation.
    'tokenStore.pendingGuestSignUp'(val: boolean): void {
      if (!val) return
      this.tokenStore.pendingGuestSignUp = false
      this.menuOpen = true
    },
  },

  computed: {
    ...mapStores(useTokenStore),

    ICON()  { return ICON  },
    ROUTE() { return ROUTE },

    themeStore() { return useThemeStore() },

    isOled(): boolean { return this.themeStore.theme === 'oled' },
  },

  mounted() {
    document.addEventListener('click', this.handleOutsideClick)
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
  },

  methods: {
    toggleMenu(): void {
      this.menuOpen = !this.menuOpen
    },

    closeMenu(): void {
      this.menuOpen = false
    },

    handleOutsideClick(e: MouseEvent): void {
      if (this.$el && !this.$el.contains(e.target as Node)) this.menuOpen = false
    },

    setTheme(theme: 'dark' | 'oled'): void {
      this.themeStore.theme = theme
    },
  },
})
</script>

<style lang="scss" scoped>
.guest-panel {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;

  /* ── Trigger ────────────────────────────────────────────────────── */
  &__trigger {
    @include flex-row(0.35rem);
    align-items: center;
    padding: 0.18rem 0.45rem 0.18rem 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-surface);
    }
  }

  &__caret {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__avatar-wrap {
    position: relative;
  }

  &__avatar {
    @include inline-flex-center();
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 20%, transparent);
    border: 1.5px solid var(--color-primary-border);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  /* ── Dropdown panel ─────────────────────────────────────────────── */
  &__panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 260px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--color-bg) 60%, transparent);
    padding: 0.5rem 0;
    z-index: 500;
  }

  /* ── Identity ───────────────────────────────────────────────────── */
  &__identity {
    @include flex-row(0.6rem);
    padding: 0.6rem 0.85rem 0.5rem;
  }

  &__id-avatar-wrap {
    flex-shrink: 0;
  }

  &__id-avatar {
    @include inline-flex-center();
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 20%, transparent);
    border: 1.5px solid var(--color-primary-border);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    font-weight: 700;
  }

  &__id-text {
    @include flex-col(2px);
    min-width: 0;
  }

  &__id-name {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__id-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-primary);
    opacity: var(--op-dim);
  }

  /* ── Note ───────────────────────────────────────────────────────── */
  &__note {
    padding: 0 0.85rem 0.65rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  /* ── Divider ────────────────────────────────────────────────────── */
  &__divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
  }

  /* ── Sign-up CTA button ─────────────────────────────────────────── */
  &__signup-btn {
    display: block;
    margin: 0.5rem 0.85rem 0.3rem;
    padding: 0.45rem 1rem;
    background: var(--color-primary);
    color: var(--color-bg);
    border-radius: 5px;
    text-align: center;
    text-decoration: none;
    font-size: var(--fs-sm);
    font-weight: 600;
    transition: background var(--tr-fast), box-shadow var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 85%, white);
      box-shadow: var(--glow-sm);
      text-decoration: none;
    }
  }

  /* ── Menu items ─────────────────────────────────────────────────── */
  &__item {
    @include flex-row(0.5rem);
    width: 100%;
    padding: 0.5rem 0.85rem;
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: color var(--tr-fast), background var(--tr-fast);
    text-align: left;

    &:hover { color: var(--color-text); background: var(--color-surface-2); text-decoration: none; }
  }

  &__item-icon {
    width: 1.1rem;
    text-align: center;
    flex-shrink: 0;
    opacity: var(--op-dim);
  }

  &__signin-btn {
    display: block;
    margin: 0 0.85rem 0.5rem;
    padding: 0.4rem 1rem;
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    text-align: center;
    text-decoration: none;
    font-size: var(--fs-sm);
    transition: border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-surface);
      text-decoration: none;
    }
  }

  /* ── Appearance toggle ──────────────────────────────────────────── */
  &__appearance {
    @include flex-between();
    padding: 0.45rem 0.85rem;
  }

  &__appearance-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__theme-pills {
    @include flex-row(0.2rem);
  }

  &__theme-pill {
    @include mono-upper(0.6rem, 0.05em);
    padding: 0.18rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-surface);
    }
  }
}
</style>
