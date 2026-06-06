import { ref, type Ref } from 'vue';

// Cache module-level partagé : une entrée par ressource (PvP only, plus de gameMode).
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function useResource<T>(key: string, fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(force = false) {
    if (!force && cache.has(key)) {
      data.value = cache.get(key) as T;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      // déduplique les requêtes concurrentes pour la même ressource
      let p = inflight.get(key) as Promise<T> | undefined;
      if (!p || force) {
        p = fetcher();
        inflight.set(key, p);
      }
      const result = await p;
      cache.set(key, result);
      data.value = result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      inflight.delete(key);
      loading.value = false;
    }
  }

  load();

  return { data, loading, error, reload: () => load(true) };
}
