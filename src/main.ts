import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import { router } from '@/router';
import '@/style.css';

// Demande au navigateur de ne pas évincer le localStorage (ITP Safari, pression
// mémoire, nettoyage auto). Best-effort : Chrome accorde selon l'engagement,
// Firefox peut demander, Safari ignore. Aucun impact si refusé.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => {
      if (!already) navigator.storage.persist().catch(() => {});
    })
    .catch(() => {});
}

createApp(App).use(createPinia()).use(router).mount('#app');
