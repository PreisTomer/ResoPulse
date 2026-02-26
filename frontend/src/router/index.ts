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
      component: () => import('../views/DataSetsView.vue'),
    },
    {
      path: '/reports',
      component: () => import('../views/ReportsView.vue'),
    },
    {
      path: '/protocol',
      component: () => import('../views/ProtocolView.vue'),
    },
  ],
})
