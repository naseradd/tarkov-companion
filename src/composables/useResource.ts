import { ref, watch, type Ref } from 'vue';
import { useGameStore } from '@/stores/game';
import type { GameMode } from '@/lib/tarkov';

// Cache module-level partagé : une entrée par (ressource + gameMode).
const cache = new Map<string, unknown>();

export function useResource<T>(key: string, fetcher: (mode: GameMode) => Promise<T>) {
  const game = useGameStore();
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    const ck = `${key}:${game.mode}`;
    if (cache.has(ck)) {
      data.value = cache.get(ck) as T;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const result = await fetcher(game.mode);
      cache.set(ck, result);
      data.value = result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  watch(() => game.mode, load);
  load();

  return { data, loading, error, reload: load };
}
