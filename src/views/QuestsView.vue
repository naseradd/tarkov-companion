<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, type Task } from '@/lib/tarkov';
import Spinner from '@/components/Spinner.vue';

const game = useGameStore();
const { data: tasks, loading, error } = useResource<Task[]>('tasks', fetchTasks);

const search = ref('');
const trader = ref<string | null>(null);
const mapFilter = ref<string | null>(null);
const kappaOnly = ref(false);
const hideDone = ref(false);
const expanded = ref<Set<string>>(new Set());

function toggleExpand(id: string) {
  expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id);
  expanded.value = new Set(expanded.value);
}

const factionTasks = computed(() =>
  (tasks.value ?? []).filter((t) => !t.factionName || t.factionName === 'Any' || t.factionName === game.faction),
);

const traders = computed(() => {
  const map = new Map<string, string | null>();
  for (const t of factionTasks.value) if (t.trader) map.set(t.trader.name, t.trader.imageLink);
  return [...map.entries()].map(([name, img]) => ({ name, img })).sort((a, b) => a.name.localeCompare(b.name));
});

const mapNames = computed(() => {
  const s = new Set<string>();
  for (const t of factionTasks.value) if (t.map) s.add(t.map.name);
  return [...s].sort();
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return factionTasks.value.filter((t) => {
    if (trader.value && t.trader?.name !== trader.value) return false;
    if (mapFilter.value && t.map?.name !== mapFilter.value) return false;
    if (kappaOnly.value && !t.kappaRequired) return false;
    if (hideDone.value && game.isDone(t.id)) return false;
    if (q && !t.name.toLowerCase().includes(q)) return false;
    return true;
  });
});

const doneInView = computed(() => filtered.value.filter((t) => game.isDone(t.id)).length);

function reqItems(t: Task) {
  const out: { icon: string | null; name: string; count: number; fir: boolean }[] = [];
  for (const o of t.objectives) {
    if (o.items?.length) for (const it of o.items) out.push({ icon: it.iconLink, name: it.shortName || it.name, count: o.count ?? 1, fir: !!o.foundInRaid });
  }
  return out;
}
function reqKeys(t: Task) {
  const out: { icon: string | null; name: string }[] = [];
  for (const o of t.objectives) if (o.requiredKeys?.length) for (const grp of o.requiredKeys) for (const k of grp) out.push({ icon: k.iconLink, name: k.shortName || k.name });
  return out;
}
</script>

<template>
  <section>
    <span class="kick">Module 02 — Progression</span>
    <h1 class="title">Quêtes & objectifs</h1>
    <p class="lead">Toutes les quêtes des marchands, filtrables. Coche-les au fur et à mesure — ta progression est sauvegardée localement.</p>

    <Spinner v-if="loading" label="CHARGEMENT DES QUÊTES…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <template v-else>
      <div class="toolbar">
        <input v-model="search" class="field" placeholder="Rechercher une quête…" style="min-width: 220px" />
        <select v-model="mapFilter" class="field">
          <option :value="null">Toutes les cartes</option>
          <option v-for="m in mapNames" :key="m" :value="m">{{ m }}</option>
        </select>
        <label class="toggle"><input type="checkbox" v-model="kappaOnly" /> Kappa uniquement</label>
        <label class="toggle"><input type="checkbox" v-model="hideDone" /> Masquer complétées</label>
        <span class="stat" style="margin-left: auto"><b>{{ doneInView }}</b>/{{ filtered.length }} faites</span>
      </div>

      <div class="chips" style="margin-bottom: 14px">
        <button class="chip" :class="{ on: !trader }" @click="trader = null">Tous</button>
        <button v-for="t in traders" :key="t.name" class="chip" :class="{ on: trader === t.name }" @click="trader = t.name">
          <img v-if="t.img" :src="t.img" :alt="t.name" />{{ t.name }}
        </button>
      </div>

      <div class="list">
        <article v-for="t in filtered" :key="t.id" class="q" :class="{ done: game.isDone(t.id) }">
          <header @click="toggleExpand(t.id)">
            <input
              type="checkbox"
              :checked="game.isDone(t.id)"
              @click.stop="game.toggleDone(t.id)"
              class="chk"
            />
            <img v-if="t.trader?.imageLink" :src="t.trader.imageLink" class="portrait" :alt="t.trader?.name" />
            <div class="q-main">
              <div class="q-name">{{ t.name }}</div>
              <div class="q-sub">
                <span>{{ t.trader?.name }}</span>
                <span v-if="t.map">· {{ t.map.name }}</span>
                <span v-if="t.minPlayerLevel">· niv. {{ t.minPlayerLevel }}</span>
                <span v-if="t.experience">· {{ t.experience.toLocaleString('fr-FR') }} XP</span>
              </div>
            </div>
            <div class="q-badges">
              <span v-if="t.kappaRequired" class="badge b-kappa">Kappa</span>
              <span v-if="t.lightkeeperRequired" class="badge b-lk">Lightkeeper</span>
            </div>
            <span class="caret">{{ expanded.has(t.id) ? '–' : '+' }}</span>
          </header>

          <div v-if="expanded.has(t.id)" class="q-body">
            <div v-if="t.taskRequirements?.some((r) => r.task)" class="prereq">
              <span class="kick">Prérequis</span>
              <span>{{ t.taskRequirements!.filter((r) => r.task).map((r) => r.task!.name).join(' · ') }}</span>
            </div>

            <span class="kick">Objectifs</span>
            <ul class="obj">
              <li v-for="o in t.objectives" :key="o.id" :class="{ opt: o.optional }">
                {{ o.description }}<span v-if="o.optional" class="opttag">optionnel</span>
                <span v-if="o.maps?.length" class="onmap">[{{ o.maps.map((m) => m.name).join(', ') }}]</span>
              </li>
            </ul>

            <template v-if="reqItems(t).length">
              <span class="kick">Items requis</span>
              <div class="items">
                <div v-for="(it, i) in reqItems(t)" :key="i" class="it">
                  <img v-if="it.icon" :src="it.icon" class="icon sm" :alt="it.name" />
                  <div><b>{{ it.count }}×</b> {{ it.name }} <span v-if="it.fir" class="badge b-fir">FiR</span></div>
                </div>
              </div>
            </template>

            <template v-if="reqKeys(t).length">
              <span class="kick">Clés utiles</span>
              <div class="items">
                <div v-for="(k, i) in reqKeys(t)" :key="i" class="it">
                  <img v-if="k.icon" :src="k.icon" class="icon sm" :alt="k.name" /><div>{{ k.name }}</div>
                </div>
              </div>
            </template>

            <a v-if="t.wikiLink" :href="t.wikiLink" target="_blank" class="wiki">↗ Guide wiki détaillé</a>
          </div>
        </article>
      </div>
      <p v-if="!filtered.length" class="muted" style="margin-top: 16px">Aucune quête pour ces filtres.</p>
    </template>
  </section>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 8px; }
.q { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(180deg, var(--panel), #11140d); transition: 0.15s var(--tap); }
.q:hover { border-color: var(--line2); }
.q.done { opacity: 0.55; }
.q header { display: flex; align-items: center; gap: 12px; padding: 11px 14px; cursor: pointer; }
.chk { width: 17px; height: 17px; accent-color: var(--acid); flex: 0 0 auto; cursor: pointer; }
.portrait { width: 34px; height: 34px; border-radius: 2px; object-fit: cover; border: 1px solid var(--line2); background: #000; flex: 0 0 auto; }
.q-main { flex: 1; min-width: 0; }
.q-name { font-family: var(--cond); font-weight: 600; font-size: 16px; letter-spacing: 0.3px; }
.q.done .q-name { text-decoration: line-through; }
.q-sub { font-family: var(--mono); font-size: 10.5px; color: var(--muted); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
.q-badges { display: flex; gap: 5px; flex: 0 0 auto; }
.caret { font-family: var(--mono); color: var(--dim); width: 14px; text-align: center; }
.q-body { padding: 4px 16px 16px 52px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
.q-body .kick { margin-top: 10px; }
.prereq { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--amber); }
.obj { margin: 2px 0 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; }
.obj li { font-size: 13px; line-height: 1.45; }
.obj li.opt { color: var(--muted); }
.opttag { font-family: var(--mono); font-size: 9px; color: var(--dim); border: 1px solid var(--line2); padding: 1px 4px; border-radius: 2px; margin-left: 6px; text-transform: uppercase; }
.onmap { color: var(--cyan); font-family: var(--mono); font-size: 10.5px; margin-left: 6px; }
.items { display: flex; flex-wrap: wrap; gap: 8px; }
.it { display: flex; align-items: center; gap: 8px; background: #11140d; border: 1px solid var(--line); border-radius: 2px; padding: 5px 9px 5px 5px; font-size: 12.5px; }
.wiki { font-family: var(--mono); font-size: 11px; margin-top: 10px; }
.err { color: var(--red); font-family: var(--mono); }
</style>
