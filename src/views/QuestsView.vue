<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, type Task } from '@/lib/tarkov';
import { taskInfo, negativeRep, factionMatch, reachableSet, type PlayerState, type TraderGate } from '@/lib/progression';
import Spinner from '@/components/ui/Spinner.vue';
import Card from '@/components/ui/Card.vue';
import Chip from '@/components/ui/Chip.vue';
import Stat from '@/components/ui/Stat.vue';
import Badge from '@/components/ui/Badge.vue';
import Combobox from '@/components/ui/Combobox.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import IconBox from '@/components/ui/IconBox.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Reveal from '@/components/ui/Reveal.vue';

const game = useGameStore();
const route = useRoute();
const { data: tasks, loading, error } = useResource<Task[]>('tasks', fetchTasks);

const search = ref((route.query.q as string) || '');
const trader = ref<string | null>(null);
const mapFilter = ref<string>('');
const stateFilter = ref<'available' | 'all' | 'done'>('available');
const kappaOnly = ref(false);
const lkOnly = ref(false);
const expanded = ref<Set<string>>(new Set());

watch(() => route.query.q, (q) => { if (q) search.value = q as string; });

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, prestige: game.prestige, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));

const reachable = computed(() => reachableSet(tasks.value ?? [], player.value));
const factionTasks = computed(() => (tasks.value ?? []).filter((t) => factionMatch(t.factionName, game.faction)));

const traders = computed(() => {
  const m = new Map<string, string | null>();
  for (const t of factionTasks.value) if (t.trader) m.set(t.trader.name, t.trader.imageLink);
  return [...m.entries()].map(([name, img]) => ({ name, img })).sort((a, b) => a.name.localeCompare(b.name));
});
const mapOpts = computed(() => {
  const s = new Set<string>();
  for (const t of factionTasks.value) if (t.map) s.add(t.map.name);
  return [{ value: '', label: 'Toutes les cartes' }, ...[...s].sort().map((m) => ({ value: m, label: m }))];
});

interface Row { task: Task; state: 'done' | 'available' | 'locked'; lockReasons: string[]; missing: { id: string; name: string }[]; activePrereqs: { id: string; name: string }[]; traderGates: TraderGate[]; altBranch: { id: string; name: string }[]; neg: { trader: string; standing: number }[] }

const cmpLabel = (cmp: string) => (cmp.startsWith('<') ? '≤' : '');

const rows = computed<Row[]>(() => {
  const q = search.value.trim().toLowerCase();
  const reach = reachable.value;
  return factionTasks.value
    .map((task) => {
      const info = taskInfo(task, player.value, reach);
      return { task, state: info.state, lockReasons: info.lockReasons, missing: info.missingPrereqs, activePrereqs: info.activePrereqs, traderGates: info.traderGates, altBranch: info.altBranch, neg: negativeRep(task) };
    })
    .filter((r) => {
      if (trader.value && r.task.trader?.name !== trader.value) return false;
      if (mapFilter.value && r.task.map?.name !== mapFilter.value) return false;
      if (kappaOnly.value && !r.task.kappaRequired) return false;
      if (lkOnly.value && !r.task.lightkeeperRequired) return false;
      if (stateFilter.value !== 'all' && r.state !== stateFilter.value) return false;
      if (q && !r.task.name.toLowerCase().includes(q)) return false;
      return true;
    });
});

const counts = computed(() => {
  const reach = reachable.value;
  const all = factionTasks.value.map((t) => taskInfo(t, player.value, reach).state);
  return { available: all.filter((s) => s === 'available').length, done: all.filter((s) => s === 'done').length, total: all.length };
});

function toggleExpand(id: string) {
  expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id);
  expanded.value = new Set(expanded.value);
}
function reqItems(t: Task) {
  const out: { icon: string | null; name: string; count: number; fir: boolean }[] = [];
  for (const o of t.objectives) if (o.items?.length) for (const it of o.items) out.push({ icon: it.iconLink, name: it.shortName || it.name, count: o.count ?? 1, fir: !!o.foundInRaid });
  return out;
}
const hasFir = (t: Task) => t.objectives.some((o) => o.foundInRaid && o.items?.length);
function reqKeys(t: Task) {
  const out: { icon: string | null; name: string }[] = [];
  for (const o of t.objectives) for (const grp of o.requiredKeys ?? []) for (const k of grp) out.push({ icon: k.iconLink, name: k.shortName || k.name });
  return out;
}

const stateOpts = [
  { value: 'available', label: 'Disponibles' },
  { value: 'all', label: 'Toutes' },
  { value: 'done', label: 'Faites' },
];
</script>

<template>
  <section class="view">
    <span class="kicker">Progression</span>
    <h1 class="page-title">Quêtes & objectifs</h1>
    <p class="lead">
      « Available Now » : seulement les quêtes dont tu remplis les prérequis et le niveau, pour ta faction.
      Coche par objectif — la progression est sauvegardée localement.
    </p>

    <Spinner v-if="loading" block label="Chargement des quêtes…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <template v-else>
      <div class="toolbar">
        <input v-model="search" class="search-field" placeholder="Rechercher une quête…" />
        <div class="map-cb"><Combobox v-model="mapFilter" :options="mapOpts" size="sm" /></div>
        <SegmentedControl v-model="stateFilter" :options="stateOpts" size="sm" />
        <Chip :active="kappaOnly" @click="kappaOnly = !kappaOnly">Kappa</Chip>
        <Chip :active="lkOnly" @click="lkOnly = !lkOnly">Lightkeeper</Chip>
        <div class="spacer" />
        <Stat tone="accent" :value="counts.available">faisables</Stat>
        <Stat :value="`${counts.done}/${counts.total}`">faites</Stat>
      </div>

      <div class="traderchips">
        <Chip :active="!trader" @click="trader = null">Tous</Chip>
        <Chip v-for="t in traders" :key="t.name" :active="trader === t.name" @click="trader = t.name">
          <template #icon><img v-if="t.img" :src="t.img" :alt="t.name" /></template>{{ t.name }}
        </Chip>
      </div>

      <Reveal tag="div" class="list">
        <Card
          v-for="r in rows"
          :key="r.task.id"
          tone="raised"
          :pad="false"
          class="q"
          :class="{ done: r.state === 'done', locked: r.state === 'locked' }"
        >
          <header class="q-head" @click="toggleExpand(r.task.id)">
            <button
              class="chk"
              :class="{ on: game.isDone(r.task.id) }"
              :aria-label="game.isDone(r.task.id) ? 'Marquer non faite' : 'Marquer faite'"
              @click.stop="game.toggleDone(r.task.id)"
            >{{ game.isDone(r.task.id) ? '✓' : '' }}</button>
            <img v-if="r.task.trader?.imageLink" :src="r.task.trader.imageLink" class="portrait" :alt="r.task.trader?.name" />
            <div class="q-main">
              <div class="q-name">{{ r.task.name }}</div>
              <div class="q-sub">
                <span>{{ r.task.trader?.name }}</span>
                <span v-if="r.task.map">· {{ r.task.map.name }}</span>
                <span v-if="r.task.minPlayerLevel">· niv. {{ r.task.minPlayerLevel }}</span>
                <span v-if="r.task.experience" class="num">· {{ r.task.experience.toLocaleString('fr-FR') }} XP</span>
              </div>
            </div>
            <div class="q-badges">
              <Badge v-if="r.state === 'available'" variant="good">dispo</Badge>
              <Badge v-else-if="r.state === 'locked'" variant="info">verrouillée</Badge>
              <Badge v-if="r.task.kappaRequired" variant="kappa">Kappa</Badge>
              <Badge v-if="r.task.lightkeeperRequired" variant="lk">LK</Badge>
              <Badge v-if="r.task.requiredPrestige" variant="purple">Prestige {{ r.task.requiredPrestige.prestigeLevel }}</Badge>
              <Badge v-for="n in r.neg" :key="n.trader" variant="danger">{{ n.standing }} {{ n.trader }}</Badge>
            </div>
            <span class="caret">{{ expanded.has(r.task.id) ? '−' : '+' }}</span>
          </header>

          <div v-if="expanded.has(r.task.id)" class="q-body">
            <div v-if="r.state === 'locked' && r.lockReasons.length" class="lockbox">
              <span class="kicker">Verrouillée</span>
              <div class="lockreasons">
                <Badge v-for="lr in r.lockReasons" :key="lr" variant="info">{{ lr }}</Badge>
              </div>
              <div v-if="r.missing.length" class="prereq">Après : {{ r.missing.map((m) => m.name).join(' · ') }}</div>
              <div v-if="r.activePrereqs.length" class="prereq active">À lancer d'abord : {{ r.activePrereqs.map((m) => m.name).join(' · ') }}</div>
            </div>

            <div v-if="r.traderGates.length" class="gatebox">
              <span class="kicker">Loyauté marchand requise</span>
              <div class="lockreasons">
                <Badge
                  v-for="(g, gi) in r.traderGates"
                  :key="gi"
                  :variant="g.type === 'level' ? (g.met ? 'good' : 'amber') : 'blue'"
                >
                  {{ g.trader }}
                  <template v-if="g.type === 'level'">LL{{ g.value }}</template>
                  <template v-else-if="g.type === 'reputation'">rép {{ cmpLabel(g.cmp) }}{{ g.value }}</template>
                  <template v-else>{{ g.type }} {{ g.value }}</template>
                </Badge>
              </div>
              <p class="gatehint">La loyauté (LL) se règle dans <RouterLink to="/marchands">Marchands</RouterLink>, indépendamment du niveau PMC.</p>
            </div>

            <div v-if="r.altBranch.length" class="altbox">
              ⎇ <b>Branche alternative</b> : requiert {{ r.altBranch.map((a) => a.name).join(' · ') }} <b>échouée(s)</b>. Choix mutuellement exclusif.
            </div>

            <div v-if="hasFir(r.task)" class="firwarn">
              ⚠ Objets en <b>Found in Raid</b> — porte-les dans ton rig, <b>jamais</b> dans le conteneur sécurisé (ça détruit le FiR).
            </div>

            <span class="kicker">Objectifs</span>
            <ul class="obj">
              <li v-for="o in r.task.objectives" :key="o.id" :class="{ opt: o.optional, checked: game.objDone(o.id) }">
                <button class="objchk" :class="{ on: game.objDone(o.id) }" @click="game.toggleObjective(o.id)">{{ game.objDone(o.id) ? '✓' : '' }}</button>
                <span class="objtext">
                  {{ o.description }}
                  <span v-if="o.optional" class="opttag">optionnel</span>
                  <span v-if="o.maps?.length" class="onmap">[{{ o.maps.map((m) => m.name).join(', ') }}]</span>
                </span>
              </li>
            </ul>

            <template v-if="reqItems(r.task).length">
              <span class="kicker">Items requis</span>
              <div class="items">
                <div v-for="(it, i) in reqItems(r.task)" :key="i" class="it">
                  <IconBox :src="it.icon" :size="30" />
                  <div><b class="num">{{ it.count }}×</b> {{ it.name }} <Badge v-if="it.fir" variant="fir">FiR</Badge></div>
                </div>
              </div>
            </template>

            <template v-if="reqKeys(r.task).length">
              <span class="kicker">Clés utiles</span>
              <div class="items">
                <div v-for="(k, i) in reqKeys(r.task)" :key="i" class="it">
                  <IconBox :src="k.icon" :size="30" /><div>{{ k.name }}</div>
                </div>
              </div>
            </template>

            <a v-if="r.task.wikiLink" :href="r.task.wikiLink" target="_blank" class="wiki">↗ Guide wiki détaillé</a>
          </div>
        </Card>
      </Reveal>
      <EmptyState v-if="!rows.length" icon="✓" title="Aucune quête pour ces filtres">
        Change l'état ou les filtres — ou monte de niveau pour débloquer la suite.
      </EmptyState>
    </template>
  </section>
</template>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.search-field {
  min-width: 220px; flex: 0 1 auto;
  background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm);
  color: var(--ink); padding: 9px 13px; font-size: 14px;
}
.search-field:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-soft); }
.map-cb { width: 200px; }
.spacer { flex: 1; }
.traderchips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.list { display: flex; flex-direction: column; gap: 9px; }

.q { transition: opacity var(--t2) var(--ease), border-color var(--t1) var(--ease); }
.q.done { opacity: 0.5; }
.q.locked { opacity: 0.82; }
.q-head { display: flex; align-items: center; gap: 13px; padding: 13px 16px; cursor: pointer; }
.chk {
  width: 22px; height: 22px; flex: 0 0 auto; border-radius: var(--r-xs);
  border: 1.5px solid var(--hairline-2); background: var(--canvas); color: var(--ink-on-accent);
  cursor: pointer; display: grid; place-items: center; font-size: 13px; font-weight: 700; transition: all var(--t1) var(--ease);
}
.chk:hover { border-color: var(--accent-dim); }
.chk.on { background: var(--accent); border-color: var(--accent); }
.portrait { width: 36px; height: 36px; border-radius: var(--r-xs); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; flex: 0 0 auto; }
.q-main { flex: 1; min-width: 0; }
.q-name { font-family: var(--font-display); font-weight: 600; font-size: 16.5px; }
.q.done .q-name { text-decoration: line-through; }
.q-sub { font-size: 12.5px; color: var(--ink-3); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
.q-badges { display: flex; gap: 5px; flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; max-width: 280px; }
.caret { font-family: var(--font-mono); color: var(--ink-3); width: 16px; text-align: center; font-size: 16px; }

.q-body { padding: 4px 16px 18px 51px; border-top: 1px solid var(--hairline); display: flex; flex-direction: column; gap: 8px; }
.q-body .kicker { margin-top: 8px; }
.lockbox, .gatebox { background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 10px 12px; margin-top: 10px; }
.lockreasons { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
.prereq { font-size: 12.5px; color: var(--amber); }
.prereq.active { color: var(--cyan); }
.gatehint { font-size: 11.5px; color: var(--ink-3); margin: 4px 0 0; }
.gatehint a { color: var(--ink-2); }
.gatehint a:hover { color: var(--accent); }
.altbox { background: rgba(167, 139, 255, 0.08); border: 1px solid #443060; border-radius: var(--r-sm); padding: 9px 12px; font-size: 12.5px; color: var(--ink-2); margin-top: 10px; }
.altbox b { color: var(--purple); font-weight: 600; }
.firwarn { background: var(--amber-soft); border: 1px solid #5c4517; border-radius: var(--r-sm); padding: 9px 12px; font-size: 12.5px; color: var(--ink); margin-top: 10px; }
.obj { margin: 2px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.obj li { display: flex; gap: 9px; align-items: flex-start; font-size: 14px; line-height: 1.45; }
.obj li.opt .objtext { color: var(--ink-3); }
.obj li.checked .objtext { color: var(--ink-3); text-decoration: line-through; }
.objchk {
  width: 18px; height: 18px; flex: 0 0 auto; margin-top: 1px; border-radius: 5px;
  border: 1.5px solid var(--hairline-2); background: var(--canvas); color: var(--ink-on-accent);
  cursor: pointer; display: grid; place-items: center; font-size: 11px; font-weight: 700; transition: all var(--t1) var(--ease);
}
.objchk.on { background: var(--accent); border-color: var(--accent); }
.objtext { flex: 1; }
.opttag { font-family: var(--font-mono); font-size: 9px; color: var(--ink-3); border: 1px solid var(--hairline-2); padding: 1px 5px; border-radius: var(--r-xs); margin-left: 6px; text-transform: uppercase; }
.onmap { color: var(--cyan); font-size: 12px; margin-left: 6px; }
.items { display: flex; flex-wrap: wrap; gap: 8px; }
.it { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 6px 10px 6px 6px; font-size: 13px; }
.wiki { font-size: 13px; margin-top: 8px; }
.err { color: var(--red); font-family: var(--font-mono); }
@media (max-width: 720px) { .q-badges { max-width: 140px; } .q-body { padding-left: 16px; } }
</style>
