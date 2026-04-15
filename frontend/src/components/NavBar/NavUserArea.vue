<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="user-panel" @click="toggleMenu">

    <!-- ── Trigger: caret + avatar + token status dot ───────────────────────── -->
    <div class="user-panel__trigger" :class="{ 'user-panel__trigger--signing-out': isSigningOut }">
      <span class="user-panel__caret">{{ ICON.EXPAND }}</span>
      <div class="user-panel__avatar-wrap">
        <span v-if="isSigningOut" class="user-panel__sign-out-spinner"></span>
        <template v-else>
          <img
            v-if="userImageUrl"
            :src="userImageUrl"
            :alt="userName"
            class="user-panel__avatar"
          />
          <span v-else class="user-panel__initials">{{ userInitials }}</span>
          <span
            v-if="tokenStore.isLoaded"
            class="user-panel__status-dot"
            :class="{
              'user-panel__status-dot--low':      tokenStore.isLowBalance,
              'user-panel__status-dot--exhausted': tokenStore.isExhausted,
            }"
          ></span>
        </template>
      </div>
    </div>

    <!-- ── Rich dropdown panel ────────────────────────────────────────────── -->
    <div v-if="menuOpen" class="user-panel__panel" @click.stop>

      <!-- Identity -->
      <div class="user-panel__identity">
        <div class="user-panel__id-avatar-wrap">
          <img
            v-if="userImageUrl"
            :src="userImageUrl"
            :alt="userName"
            class="user-panel__id-avatar"
          />
          <span v-else class="user-panel__id-initials">{{ userInitials }}</span>
        </div>
        <div class="user-panel__id-text">
          <span class="user-panel__id-name">{{ userName }}</span>
          <span v-if="orgName" class="user-panel__id-org">{{ orgName }}</span>
        </div>
      </div>

      <!-- Token credits section -->
      <div v-if="tokenStore.isLoaded" class="user-panel__credits">
        <div class="user-panel__credits-header">
          <span class="user-panel__credits-label">
            <svg class="user-panel__credits-icon" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8 1L2 8h5l-1 5 6-7H7L8 1z" fill="currentColor"/>
            </svg>
            {{ $t('tokens.creditsLabel') }}
          </span>
          <span class="user-panel__credits-plan">{{ planLabel }}</span>
        </div>

        <div class="user-panel__credits-bar">
          <div
            class="user-panel__credits-fill"
            :class="barClass"
            :style="{ width: Math.max(2, tokenStore.balancePct) + '%' }"
          ></div>
        </div>

        <div v-if="tokenStore.isLowBalance || tokenStore.isExhausted" class="user-panel__credits-warn">
          {{ tokenStore.isExhausted ? $t('tokens.balanceExhausted') : $t('tokens.balanceLow') }}
        </div>

        <div class="user-panel__credits-meta">
          {{ $t('tokens.resetsLabel') }} {{ tokenStore.resetDateLabel }}
        </div>

        <button class="user-panel__upgrade-cta" @click="navigateToPricing">
          {{ $t('tokens.upgradeBtn') }} {{ ICON.ARROW_SHORT }}
        </button>
      </div>

      <div class="user-panel__divider"></div>

      <!-- Navigation -->
      <button class="user-panel__item user-panel__item--nav" @click="navigate(ROUTE.EXPERIMENTS)">
        <span class="user-panel__item-icon">{{ ICON.FOLDER }}</span>
        {{ $t('nav.experiments') }}
      </button>
      <button class="user-panel__item user-panel__item--nav" @click="navigate(ROUTE.REPORTS)">
        <span class="user-panel__item-icon">{{ ICON.LINES }}</span>
        {{ $t('nav.reports') }}
      </button>

      <div class="user-panel__divider"></div>

      <!-- Appearance toggle (inline) -->
      <div class="user-panel__appearance">
        <span class="user-panel__appearance-label">{{ $t('nav.appearance') }}</span>
        <div class="user-panel__theme-pills">
          <button
            class="user-panel__theme-pill"
            :class="{ 'user-panel__theme-pill--active': !isOled }"
            @click.stop="setTheme('dark')"
          >{{ $t('nav.themeDark') }}</button>
          <button
            class="user-panel__theme-pill"
            :class="{ 'user-panel__theme-pill--active': isOled }"
            @click.stop="setTheme('oled')"
          >{{ $t('nav.themeOled') }}</button>
        </div>
      </div>

      <div class="user-panel__divider"></div>

      <!-- Account + sign out -->
      <button class="user-panel__item" @click="openProfile">
        <span class="user-panel__item-icon">{{ ICON.USER }}</span>
        {{ $t('nav.manageAccount') }}
      </button>
      <button class="user-panel__item user-panel__item--danger" @click="doSignOut">
        <span class="user-panel__item-icon">{{ ICON.LOGOUT }}</span>
        {{ $t('nav.signOut') }}
      </button>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useUser, useOrganization, useClerk } from '@clerk/vue'
import { mapStores } from 'pinia'

import { useTokenStore } from '@/stores/tokenStore'
import { useThemeStore } from '@/stores/themeStore'

import { disconnectSocket } from '@/services/socket'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { PLAN_LABEL } from '@/types/token'
import type { TokenPlan } from '@/types/token'

export default defineComponent({
  name: 'NavUserArea',

  emits: ['openUpgrade'],

  setup() {
    const { user }         = useUser()
    const { organization } = useOrganization()
    const clerk            = useClerk()
    return { user, organization, clerk }
  },

  data() {
    return { menuOpen: false, isSigningOut: false }
  },

  watch: {
    'tokenStore.pendingUpgrade'(val: boolean): void {
      if (!val) return
      this.tokenStore.pendingUpgrade = false
      this.$router.push(ROUTE.PRICING)
    },
  },

  computed: {
    ...mapStores(useTokenStore),

    ICON()  { return ICON  },
    ROUTE() { return ROUTE },

    themeStore() { return useThemeStore() },

    isOled(): boolean { return this.themeStore.theme === 'oled' },

    orgName(): string | null {
      return (this.organization as { name?: string } | null)?.name ?? null
    },

    userImageUrl(): string | null {
      return (this.user as { imageUrl?: string } | null)?.imageUrl ?? null
    },

    userName(): string {
      const u = this.user as { firstName?: string; lastName?: string; fullName?: string } | null
      return (u?.fullName ?? `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim()) || 'User'
    },

    userInitials(): string {
      const u = this.user as { firstName?: string; lastName?: string } | null
      const first = u?.firstName?.[0] ?? ''
      const last  = u?.lastName?.[0]  ?? ''
      return (first + last).toUpperCase() || '?'
    },

    planLabel(): string {
      return PLAN_LABEL[this.tokenStore.plan as TokenPlan] ?? this.tokenStore.plan.toUpperCase()
    },

    barClass(): string {
      if (this.tokenStore.isExhausted)    return 'user-panel__credits-fill--exhausted'
      if (this.tokenStore.isLowBalance)   return 'user-panel__credits-fill--low'
      if (this.tokenStore.balancePct < 50) return 'user-panel__credits-fill--mid'
      return ''
    },
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

    navigate(route: string): void {
      this.closeMenu()
      this.$router.push(route)
    },

    openProfile(): void {
      this.closeMenu()
      this.$router.push(ROUTE.ACCOUNT)
    },

    openUpgrade(): void {
      this.closeMenu()
      this.$emit('openUpgrade')
    },

    navigateToPricing(): void {
      this.closeMenu()
      this.$router.push(ROUTE.PRICING)
    },

    setTheme(theme: 'dark' | 'oled'): void {
      this.themeStore.theme = theme
    },

    doSignOut(): void {
      this.isSigningOut = true
      this.closeMenu()
      this.tokenStore.stopPolling()
      disconnectSocket()
      ;(this.clerk as { signOut?(opts?: { redirectUrl?: string }): Promise<void> })
        ?.signOut?.({ redirectUrl: ROUTE.SIGN_IN })
        ?.catch(() => { this.isSigningOut = false })
    },
  },
})
</script>

<style lang="scss" scoped>
.user-panel {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;

  /* ── Trigger button ─────────────────────────────────────────────── */
  &__trigger {
    @include flex-row(0.35rem);
    align-items: center;
    padding: 0.18rem 0.45rem 0.18rem 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: var(--color-primary-border); background: var(--color-primary-surface); }
  }

  &__avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  &__avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid var(--color-border);
    display: block;
  }

  &__initials {
    @include inline-flex-center();
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1.5px solid var(--color-primary-border);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  &__status-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid var(--color-bg);
    background: var(--color-primary);

    &--low      { background: var(--color-amber); }
    &--exhausted {
      background: var(--color-amber);
      animation: token-pulse 1.8s ease-in-out infinite;
    }
  }

  &__trigger {
    &--signing-out {
      pointer-events: none;
      opacity: var(--op-dim);
    }
  }

  &__sign-out-spinner {
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    animation: onboard-spin 0.7s linear infinite;
  }

  &__caret {
    font-size: 1rem;
    color: var(--color-text-muted);
    line-height: 1;
    transition: color var(--tr-fast);

    .user-panel:hover & { color: var(--color-primary); }
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
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    z-index: 200;
    padding: 0.5rem;
    @include flex-col(0);
    overflow: hidden;
  }

  /* ── Identity section ───────────────────────────────────────────── */
  &__identity {
    @include flex-row(0.7rem);
    padding: 0.5rem 0.6rem 0.6rem;
  }

  &__id-avatar-wrap { flex-shrink: 0; }

  &__id-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid var(--color-border);
    display: block;
  }

  &__id-initials {
    @include inline-flex-center();
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--color-primary-border);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  &__id-text {
    @include flex-col(2px);
    justify-content: center;
    min-width: 0;
  }

  &__id-name {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__id-org {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Credits section ────────────────────────────────────────────── */
  &__credits {
    @include flex-col(0.4rem);
    margin: 0 0.1rem;
    padding: 0.65rem 0.75rem;
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-2));
    border: 1px solid color-mix(in srgb, var(--color-primary) 15%, var(--color-border));
    border-radius: var(--radius);

    &-header {
      @include flex-between();
    }

    &-label {
      @include flex-row(0.3rem);
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--color-text-muted);
    }

    &-icon {
      width: 12px;
      height: 12px;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    &-plan {
      @include mono-upper(0.6rem, 0.08em);
      padding: 0.1rem 0.4rem;
      border: 1px solid var(--color-primary-border);
      border-radius: 3px;
      color: var(--color-primary);
      background: var(--color-primary-surface);
    }

    &-bar {
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.15rem;
    }

    &-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--color-primary);
      transition: width 0.4s ease, background var(--tr-normal);

      &--mid      { background: color-mix(in srgb, var(--color-amber) 50%, var(--color-primary)); }
      &--low      { background: var(--color-amber); }
      &--exhausted { background: var(--color-amber); }
    }

    &-warn {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-amber);
    }

    &-meta {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      opacity: var(--op-muted);
    }
  }

  &__upgrade-cta {
    align-self: flex-start;
    @include mono-upper(var(--fs-xxs), 0.05em);
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--color-primary-border);
    border-radius: 3px;
    background: var(--color-primary-surface);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast), box-shadow var(--tr-fast);
    margin-top: 0.15rem;

    &:hover { background: var(--color-primary-dim); box-shadow: var(--glow-sm); }
  }

  /* ── Divider ────────────────────────────────────────────────────── */
  &__divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.3rem 0;
  }

  /* ── Menu items ─────────────────────────────────────────────────── */
  &__item {
    @include flex-row(0.5rem);
    width: 100%;
    padding: 0.48rem 0.7rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    letter-spacing: 0.02em;
    color: var(--color-text);
    opacity: var(--op-strong);
    cursor: pointer;
    text-align: left;
    transition: background var(--tr-fast), opacity var(--tr-fast);

    &:hover { background: var(--color-surface-2); opacity: 1; }

    &--nav {
      border: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-text) 4%, transparent);
      opacity: 1;
      margin-bottom: 0.2rem;

      &:hover {
        border-color: var(--color-primary-border);
        background: var(--color-primary-surface);
        color: var(--color-primary);

        .user-panel__item-icon { opacity: 1; }
      }
    }

    &--danger {
      color: var(--color-amber);
      opacity: var(--op-dim);
      &:hover { background: color-mix(in srgb, var(--color-amber) 10%, transparent); opacity: 1; }
    }
  }

  &__item-icon {
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    flex-shrink: 0;
    width: 1.1rem;
    text-align: center;
  }

  /* ── Appearance row ─────────────────────────────────────────────── */
  &__appearance {
    @include flex-between();
    padding: 0.3rem 0.7rem;
  }

  &__appearance-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-muted);
  }

  &__theme-pills {
    @include flex-row(0.2rem);
  }

  &__theme-pill {
    @include mono-upper(0.6rem, 0.05em);
    padding: 0.18rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--tr-fast);

    &--active {
      border-color: var(--color-primary-border);
      color: var(--color-primary);
      background: var(--color-primary-dim);
    }

    &:hover:not(&--active) { border-color: var(--color-text-muted); color: var(--color-text); }
  }
}
</style>
