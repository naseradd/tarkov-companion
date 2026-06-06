import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/cartes' },
  { path: '/cartes', component: () => import('@/views/MapsView.vue') },
  { path: '/quetes', component: () => import('@/views/QuestsView.vue') },
  { path: '/items', component: () => import('@/views/ItemsView.vue') },
  { path: '/hideout', component: () => import('@/views/HideoutView.vue') },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
