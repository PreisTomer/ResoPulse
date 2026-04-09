<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="nav-user-area" @click="toggleMenu">
    <span v-if="orgName" class="nav-user-area__workspace">{{ orgName }}</span>
    <div class="nav-user-area__btn">
      <img
        v-if="userImageUrl"
        :src="userImageUrl"
        :alt="userName"
        class="nav-user-area__avatar"
      />
      <span v-else class="nav-user-area__initials">{{ userInitials }}</span>
    </div>
    <div v-if="menuOpen" class="nav-user-area__menu" @click.stop>
      <button class="nav-user-area__menu-item" @click="openProfile">
        <span class="nav-user-area__menu-icon">{{ ICON.USER }}</span>
        {{ $t('nav.manageAccount') }}
      </button>
      <button class="nav-user-area__menu-item" @click="goToWorkspace">
        <span class="nav-user-area__menu-icon">{{ ICON.ORG }}</span>
        {{ $t('nav.switchWorkspace') }}
      </button>
      <div class="nav-user-area__menu-divider"></div>
      <button class="nav-user-area__menu-item nav-user-area__menu-item--danger" @click="doSignOut">
        <span class="nav-user-area__menu-icon">{{ ICON.LOGOUT }}</span>
        {{ $t('nav.signOut') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useUser, useOrganization, useClerk } from '@clerk/vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'NavUserArea',

  setup() {
    const { user }          = useUser()
    const { organization }  = useOrganization()
    const clerk             = useClerk()
    return { user, organization, clerk }
  },

  data() {
    return { menuOpen: false }
  },

  computed: {
    ICON() { return ICON },

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
  },

  mounted() {
    document.addEventListener('click', this.handleOutsideClick)
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
  },

  methods: {
    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },

    closeMenu() {
      this.menuOpen = false
    },

    handleOutsideClick(e: MouseEvent) {
      if (this.$el && !this.$el.contains(e.target as Node)) {
        this.menuOpen = false
      }
    },

    openProfile() {
      this.closeMenu()
      this.$router.push(ROUTE.ACCOUNT)
    },

    goToWorkspace() {
      this.closeMenu()
      this.$router.push(ROUTE.ACCOUNT)
    },

    doSignOut() {
      this.closeMenu()
      ;(this.clerk as { signOut?(opts?: { redirectUrl?: string }): Promise<void> })
        ?.signOut?.({ redirectUrl: ROUTE.SIGN_IN })
    },
  },
})
</script>

<style lang="scss" scoped>
.nav-user-area {
  @include flex-row(0);
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: visible;
  transition: border-color var(--tr-fast);
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;

  &:hover { border-color: var(--color-primary-border); }

  &__workspace {
    @include mono-upper(var(--fs-xs), 0.06em);
    color: var(--color-text);
    opacity: var(--op-strong);
    padding: 0 0.65rem;
    border-right: 1px solid var(--color-border);
    white-space: nowrap;
    max-width: 24ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__btn {
    display: flex;
    align-items: center;
    padding: 0.18rem 0.4rem;
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
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid var(--color-primary-border);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  &__menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 185px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    z-index: 200;
    padding: 0.3rem;
    @include flex-col(0);
    overflow: hidden;

    &-item {
      @include flex-row(0.5rem);
      width: 100%;
      padding: 0.5rem 0.7rem;
      background: transparent;
      border: none;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      letter-spacing: 0.03em;
      color: var(--color-text);
      opacity: var(--op-strong);
      cursor: pointer;
      text-align: left;
      transition: background var(--tr-fast), opacity var(--tr-fast);

      &:hover { background: var(--color-surface-2); opacity: 1; }

      &--danger {
        color: color-mix(in srgb, var(--color-danger, var(--color-amber)) 80%, transparent);
        &:hover { background: color-mix(in srgb, var(--color-amber) 10%, transparent); color: var(--color-amber); }
      }
    }

    &-icon {
      font-size: var(--fs-md);
      opacity: var(--op-partial);
      flex-shrink: 0;
    }

    &-divider {
      height: 1px;
      background: var(--color-border);
      margin: 0.25rem 0.3rem;
    }
  }
}
</style>
