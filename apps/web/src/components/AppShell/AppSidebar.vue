<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <aside class="app-sidebar" :class="{ 'app-sidebar--collapsed': collapsed, 'app-sidebar--mobile-open': mobileOpen }">
    <button
      class="app-sidebar__collapse-btn"
      :aria-label="collapsed ? $t('nav.appNav.expand') : $t('nav.appNav.collapse')"
      @click="$emit('toggleCollapsed')"
    >
      <span>{{ collapsed ? ICON.CHEVRON : '«' }}</span>
    </button>

    <nav class="app-sidebar__nav">
      <div v-for="group in NAV_GROUPS" :key="group.id" class="app-sidebar__group">
        <span class="app-sidebar__group-label">{{ $t(group.labelKey) }}</span>
        <ul class="app-sidebar__list">
          <li v-for="link in group.links" :key="link.to" class="app-sidebar__item">
            <RouterLink
              :to="link.to"
              class="app-sidebar__link"
              active-class="app-sidebar__link--active"
              @click="$emit('linkClick')"
            >
              <span class="app-sidebar__icon" :aria-hidden="true">{{ link.icon }}</span>
              <span class="app-sidebar__label">{{ $t(link.labelKey) }}</span>
              <span v-if="link.badge" class="app-sidebar__badge">{{ link.badge }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

interface NavLink {
  to:       string
  labelKey: string
  icon:     string
  badge?:   string
}

interface NavGroup {
  id:       string
  labelKey: string
  links:    NavLink[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id:       'workspaces',
    labelKey: 'nav.appNav.workspaces',
    links: [
      { to: ROUTE.CAMPAIGNS,        labelKey: 'nav.appNav.campaigns',       icon: ICON.FOLDER },
      { to: ROUTE.CELL_ENGINEERING, labelKey: 'nav.appNav.cellEngineering', icon: ICON.CELL,    badge: '1' },
      { to: ROUTE.CLONE_UPSTREAM,   labelKey: 'nav.appNav.cloneUpstream',   icon: ICON.NUCLEUS, badge: '2' },
      { to: ROUTE.DOWNSTREAM,       labelKey: 'nav.appNav.downstream',      icon: ICON.ARROW_D, badge: '3' },
      { to: ROUTE.LAB_RUNS,         labelKey: 'nav.appNav.labRuns',         icon: ICON.FLASK },
    ],
  },
  {
    id:       'knowledge',
    labelKey: 'nav.appNav.knowledge',
    links: [
      { to: ROUTE.LIBRARY, labelKey: 'nav.appNav.library', icon: ICON.SECTION },
      { to: ROUTE.METHODS, labelKey: 'nav.appNav.methods', icon: ICON.CHECKLIST },
      { to: ROUTE.REPORTS, labelKey: 'nav.appNav.reports', icon: ICON.MAIL },
    ],
  },
  {
    id:       'setup',
    labelKey: 'nav.appNav.setup',
    links: [
      { to: ROUTE.INSTRUMENT_HUB, labelKey: 'nav.appNav.instrumentHub', icon: ICON.PLUG },
    ],
  },
]

export default defineComponent({
  name: 'AppSidebar',
  props: {
    collapsed:  { type: Boolean, default: false },
    mobileOpen: { type: Boolean, default: false },
  },
  emits: ['toggleCollapsed', 'linkClick'],
  data() {
    return {
      NAV_GROUPS,
    }
  },
  computed: {
    ICON() { return ICON },
  },
})
</script>

<style lang="scss" scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  height: 100%;
  background: color-mix(in srgb, var(--color-bg-elevated) 95%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  padding: 1.25rem 0;
  transition: width var(--tr-slow);
  position: relative;
  flex-shrink: 0;

  &--collapsed {
    width: 64px;
  }

  &__collapse-btn {
    position: absolute;
    top: 0.75rem;
    right: -12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    color: var(--color-text);
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-sm);
    transition: background var(--tr-fast), border-color var(--tr-fast);
    z-index: 2;

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 12%, var(--color-bg-elevated));
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }

    @media (min-width: 769px) {
      display: flex;
    }
  }

  &__nav {
    @include flex-col(1.5rem);
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    padding: 0.5rem 0;
  }

  &__group {
    @include flex-col(0.25rem);
  }

  &__group-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    padding: 0 1.25rem 0.5rem;
    transition: opacity var(--tr-slow);

    .app-sidebar--collapsed & {
      opacity: 0;
      pointer-events: none;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.125rem);
  }

  &__link {
    @include flex-row(0.75rem);
    padding: 0.55rem 1.25rem;
    color: var(--color-text);
    text-decoration: none;
    opacity: var(--op-strong);
    font-size: var(--fs-md);
    transition: background var(--tr-fast), opacity var(--tr-fast), color var(--tr-fast);
    border-left: 2px solid transparent;
    white-space: nowrap;

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
      opacity: 1;
    }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border-left-color: var(--color-primary);
      color: var(--color-primary);
      opacity: 1;
    }
  }

  &__icon {
    font-size: 1.1rem;
    width: 1.5rem;
    text-align: center;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity var(--tr-slow);

    .app-sidebar--collapsed & {
      opacity: 0;
      pointer-events: none;
    }
  }

  &__badge {
    @include mono-upper(var(--fs-xxs));
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    transition: opacity var(--tr-slow);

    .app-sidebar--collapsed & {
      opacity: 0;
      pointer-events: none;
    }
  }

  @media (max-width: 768px) {
    position: fixed;
    top: 56px;
    left: 0;
    transform: translateX(-100%);
    width: 280px;
    z-index: 100;
    transition: transform var(--tr-slow);

    &--mobile-open {
      transform: translateX(0);
    }
  }
}
</style>
