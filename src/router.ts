import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/cartes', name: 'maps', component: () => import('@/views/MapsView.vue') },
  { path: '/quetes', name: 'quests', component: () => import('@/views/QuestsView.vue') },
  { path: '/loot', name: 'loot', component: () => import('@/views/LootView.vue') },
  { path: '/gear', name: 'gear', component: () => import('@/views/GearView.vue') },
  { path: '/hideout', name: 'hideout', component: () => import('@/views/HideoutView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
