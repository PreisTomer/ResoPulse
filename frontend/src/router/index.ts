// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { createRouter, createWebHistory } from 'vue-router'

import { ROUTE } from '@/constants/routes'

export default createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: ROUTE.HOME,       component: () => import('../views/HomeView/index.vue') },
    { path: ROUTE.EXPERIMENT, component: () => import('../views/ExperimentView.vue') },
    { path: ROUTE.DATASETS,   component: () => import('../views/DataSetsView/index.vue') },
    { path: ROUTE.REPORTS,    component: () => import('../views/ReportsView/index.vue') },
    { path: ROUTE.PROTOCOL,   component: () => import('../views/ProtocolView/index.vue') },
    { path: ROUTE.INSTRUMENT, component: () => import('../views/InstrumentView.vue') },
    { path: ROUTE.TERMS,      component: () => import('../views/TermsView.vue') },
  ],
})
