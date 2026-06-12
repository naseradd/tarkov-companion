import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/raid', name: 'raid', component: () => import('@/views/RaidView.vue') },
  { path: '/trame', name: 'storyline', component: () => import('@/views/StorylineView.vue') },
  { path: '/cartes', name: 'maps', component: () => import('@/views/MapsView.vue') },
  { path: '/quetes', name: 'quests', component: () => import('@/views/QuestsView.vue') },
  { path: '/marchands', name: 'traders', component: () => import('@/views/TradersView.vue') },
  { path: '/marchands/:name', name: 'trader', component: () => import('@/views/TraderDetailView.vue') },
  { path: '/loot', name: 'loot', component: () => import('@/views/LootView.vue') },
  { path: '/gear', name: 'gear', component: () => import('@/views/GearView.vue') },
  { path: '/hideout', name: 'hideout', component: () => import('@/views/HideoutView.vue') },
  { path: '/config', name: 'config', component: () => import('@/views/ConfigView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
