// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/experiment',
      component: () => import('../views/ExperimentView.vue'),
    },
    {
      path: '/datasets',
      component: () => import('../views/DataSetsView/index.vue'),
    },
    {
      path: '/reports',
      component: () => import('../views/ReportsView/index.vue'),
    },
    {
      path: '/protocol',
      component: () => import('../views/ProtocolView/index.vue'),
    },
    {
      path: '/instrument',
      component: () => import('../views/InstrumentView.vue'),
    },
    {
      path: '/terms',
      component: () => import('../views/TermsView.vue'),
    },
  ],
})
