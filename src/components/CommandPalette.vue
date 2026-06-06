<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { fetchTasks, fetchMaps, fetchLoot, type Task, type TarkovMap, type LootItem } from '@/lib/tarkov';
import IconBox from '@/components/ui/IconBox.vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
const router = useRouter();

const loaded = ref(false);
const loading = ref(false);
const tasks = ref<Task[]>([]);
const maps = ref<TarkovMap[]>([]);
const loot = ref<LootItem[]>([]);

const query = ref('');
const active = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);

interface Entry { type: 'quest' | 'map' | 'item'; label: string; sub: string; icon?: string | null; bg?: string | null; go: () => void }

async function ensureData() {
  if (loaded.value || loading.value) return;
  loading.value = true;
  try {
    const [t, m, l] = await Promise.all([fetchTasks(), fetchMaps(), fetchLoot()]);
    tasks.value = t;
    const seen = new Set<string>();
    maps.value = m.filter((x) => (seen.has(x.normalizedName) ? false : seen.add(x.normalizedName)));
    loot.value = l;
    loaded.value = true;
  } catch {
    /* silencieux : la palette reste utilisable une fois les données chargées ailleurs */
  } finally {
    loading.value = false;
  }
}

const results = computed<Entry[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  const out: Entry[] = [];
  for (const t of tasks.value) {
    if (t.name.toLowerCase().includes(q)) out.push({ type: 'quest', label: t.name, sub: t.trader?.name ?? 'Quête', icon: t.trader?.imageLink, go: () => nav('/quetes', { q: t.name }) });
    if (out.length > 60) break;
  }
  for (const m of maps.value) {
    if (m.name.toLowerCase().includes(q)) out.push({ type: 'map', label: m.name, sub: 'Carte', go: () => nav('/cartes', { map: m.normalizedName }) });
  }
  for (const it of loot.value) {
    if ((it.name + it.shortName).toLowerCase().includes(q)) out.push({ type: 'item', label: it.name, sub: it.shortName, icon: it.iconLink, bg: it.backgroundColor, go: () => nav('/loot', { q: it.name }) });
    if (out.length > 120) break;
  }
  return out.slice(0, 50);
});

function nav(path: string, q: Record<string, string>) {
  router.push({ path, query: q });
  close();
}
function close() { emit('update:modelValue', false); }
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') return close();
  if (e.key === 'ArrowDown') { e.preventDefault(); active.value = Math.min(results.value.length - 1, active.value + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(0, active.value - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); results.value[active.value]?.go(); }
}
watch(query, () => { active.value = 0; });
watch(
  () => props.modelValue,
  async (open) => {
    if (open) { query.value = ''; active.value = 0; ensureData(); await nextTick(); inputEl.value?.focus(); }
  },
);

const typeLabel = { quest: 'Quête', map: 'Carte', item: 'Item' };
</script>

<template>
  <Teleport to="body">
    <Transition name="cmd">
      <div v-if="modelValue" class="backdrop" @click.self="close" @keydown="onKey">
        <div class="palette" role="dialog" aria-modal="true">
          <div class="search">
            <span class="s-ic">⌕</span>
            <input ref="inputEl" v-model="query" placeholder="Quête, carte, objet…" aria-label="Recherche" />
            <kbd>esc</kbd>
          </div>
          <div class="body">
            <p v-if="loading" class="hint">Chargement de l'index…</p>
            <p v-else-if="!query" class="hint">Tape pour chercher une quête, une carte ou un objet.</p>
            <p v-else-if="!results.length" class="hint">Aucun résultat pour « {{ query }} ».</p>
            <button
              v-for="(r, i) in results"
              :key="r.type + r.label + i"
              class="row"
              :class="{ active: i === active }"
              @click="r.go()"
              @mousemove="active = i"
            >
              <IconBox v-if="r.type === 'item'" :src="r.icon" :bg="r.bg" :size="30" />
              <img v-else-if="r.icon" :src="r.icon" class="av" alt="" />
              <span v-else class="glyph">{{ r.type === 'map' ? '◎' : '✓' }}</span>
              <span class="r-main">
                <span class="r-lbl">{{ r.label }}</span>
                <span class="r-sub">{{ r.sub }}</span>
              </span>
              <span class="r-type">{{ typeLabel[r.type] }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(8, 9, 6, 0.6); backdrop-filter: blur(4px);
  display: flex; justify-content: center; align-items: flex-start;
  padding: 12vh 24px 24px;
}
.palette {
  width: 100%; max-width: 580px;
  background: linear-gradient(180deg, var(--raised), var(--surface));
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.search { display: flex; align-items: center; gap: 11px; padding: 15px 18px; border-bottom: 1px solid var(--hairline); }
.s-ic { color: var(--ink-3); font-size: 17px; }
.search input { flex: 1; background: transparent; border: none; color: var(--ink); font-size: 16px; }
.search input:focus { outline: none; }
.search input::placeholder { color: var(--ink-3); }
.search kbd { font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); border: 1px solid var(--hairline-2); border-radius: var(--r-xs); padding: 2px 6px; }
.body { max-height: 56vh; overflow-y: auto; padding: 8px; }
.hint { color: var(--ink-3); font-size: 13.5px; text-align: center; padding: 28px 16px; margin: 0; }
.row {
  width: 100%; display: flex; align-items: center; gap: 12px;
  background: transparent; border: none; border-radius: var(--r-sm);
  padding: 9px 11px; cursor: pointer; text-align: left; transition: background var(--t1) var(--ease);
}
.row.active { background: var(--surface-2); }
.av { width: 30px; height: 30px; border-radius: var(--r-xs); object-fit: cover; background: #000; flex: 0 0 auto; }
.glyph { width: 30px; height: 30px; display: grid; place-items: center; color: var(--accent); flex: 0 0 auto; }
.r-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.r-lbl { color: var(--ink); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-sub { color: var(--ink-3); font-size: 12px; }
.r-type { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--ink-3); border: 1px solid var(--hairline); border-radius: var(--r-xs); padding: 2px 7px; }

.cmd-enter-active { transition: opacity var(--t2) var(--ease); }
.cmd-enter-active .palette { transition: transform var(--t2) var(--ease-out); }
.cmd-leave-active { transition: opacity 0.12s var(--ease); }
.cmd-enter-from { opacity: 0; }
.cmd-enter-from .palette { transform: translateY(-12px) scale(0.98); }
.cmd-leave-to { opacity: 0; }
</style>
