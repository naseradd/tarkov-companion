<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, type Task } from '@/lib/tarkov';
import { storyArc, taskInfo, reachableSet, recommendedOrder, type PlayerState } from '@/lib/progression';
import { spineChapters, sideChapters, ENDINGS } from '@/lib/storyline';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import ProgressRing from '@/components/ui/ProgressRing.vue';
import IconBox from '@/components/ui/IconBox.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Reveal from '@/components/ui/Reveal.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const game = useGameStore();
const tasks = useResource<Task[]>('tasks', fetchTasks);

const spine = spineChapters();
const sides = sideChapters();
const endings = ENDINGS;
const endingTone = (t: string) => (t === 'best' ? 'good' : t === 'good' ? 'blue' : t === 'mixed' ? 'amber' : 'danger');

const arc = ref<'kappa' | 'lightkeeper'>('kappa');
const arcOpts = [
  { value: 'kappa', label: 'Collector / Kappa' },
  { value: 'lightkeeper', label: 'Lightkeeper' },
];

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, prestige: game.prestige, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));
const reachable = computed(() => reachableSet(tasks.data.value ?? [], player.value));

const data = computed(() => storyArc(tasks.data.value ?? [], player.value, arc.value));
const ringColor = computed(() => (arc.value === 'kappa' ? 'var(--amber)' : 'var(--blue)'));

const finalQuest = computed(() => {
  const list = tasks.data.value ?? [];
  if (arc.value === 'kappa') return list.find((t) => t.normalizedName === 'collector') ?? null;
  const lk = list.filter((t) => t.lightkeeperRequired);
  return lk.slice().sort((a, b) => (b.taskRequirements?.length ?? 0) - (a.taskRequirements?.length ?? 0))[0] ?? null;
});
const finalRemaining = computed(() => {
  if (!finalQuest.value) return 0;
  return (finalQuest.value.taskRequirements ?? []).filter((r) => r.task && !game.completed.has(r.task.id)).length;
});

// Checklist des remises Collector (Kappa) : chaque objectif = 1 item FiR à conserver.
const collectorItems = computed(() => {
  if (arc.value !== 'kappa' || !finalQuest.value) return [];
  return finalQuest.value.objectives
    .filter((o) => o.items?.length)
    .map((o) => ({ objId: o.id, item: o.items![0], count: o.count ?? 1 }));
});
const collectorDone = computed(() => collectorItems.value.filter((c) => game.objDone(c.objId)).length);
const showCollector = ref(false);

// Ordre recommandé : toutes les quêtes restantes de l'arc, triées dépendance + niveau.
const order = computed(() => recommendedOrder(tasks.data.value ?? [], player.value, arc.value));
const showOrder = ref(false);

const arcBlurb = computed(() =>
  arc.value === 'kappa'
    ? 'Capstone de complétion : remettre des dizaines d’objets FiR au Collector (Fence) pour le conteneur Kappa. Pas la fin narrative, mais l’objectif long du wipe.'
    : 'Arc d’accès : gagner la confiance du Lightkeeper et l’accès à l’île de Lighthouse. Sensible à ta karma Scav.',
);
</script>

<template>
  <section class="view">
    <span class="kicker">Trame principale</span>
    <h1 class="page-title">Fil narratif &amp; endgame</h1>
    <p class="lead">
      Deux choses distinctes : le <b>fil narratif 1.0</b> (l’histoire et ses fins) et l’<b>endgame trackable</b>
      (Kappa, Lightkeeper) que l’app suit réellement via tarkov.dev.
    </p>

    <!-- ============ FIL NARRATIF (référence, non trackable) ============ -->
    <Reveal tag="div" class="narr-note">
      Contenu narratif d’EFT 1.0 : ces chapitres et fins ne sont <b>pas</b> dans les données de quêtes PvP
      (les PNJ Kerman / Voevoda / Survivor n’ont aucune tâche en regular). Référence, donc, pas une checklist.
    </Reveal>

    <Reveal tag="h2" class="section-title">L’histoire en 3 actes</Reveal>
    <div class="spine">
      <template v-for="(c, i) in spine" :key="c.name">
        <div class="act">
          <div class="act-no num">{{ c.order }}</div>
          <div class="act-body">
            <div class="act-name">{{ c.name }}</div>
            <div class="act-d">{{ c.fr }}</div>
          </div>
        </div>
        <div v-if="i < spine.length - 1" class="act-arrow">→</div>
      </template>
    </div>
    <p class="side-chaps">
      Autres chapitres narratifs : {{ sides.map((c) => c.name).join(' · ') }}.
    </p>

    <Reveal tag="h2" class="section-title mt">Les 4 fins <span class="st-sub">choix dans « The Ticket »</span></Reveal>
    <div class="endings">
      <Card v-for="e in endings" :key="e.name" tone="surface" class="ending" :class="e.tone">
        <div class="ending-head">
          <span class="ending-name">{{ e.fr }}</span>
          <Badge :variant="endingTone(e.tone)">{{ e.name }}</Badge>
        </div>
        <p class="ending-d">{{ e.desc }}</p>
      </Card>
    </div>

    <!-- ============ ENDGAME TRACKABLE ============ -->
    <Reveal tag="h2" class="section-title mt big">Endgame trackable <span class="st-sub">suivi via tes quêtes</span></Reveal>
    <div class="arc-switch"><SegmentedControl v-model="arc" :options="arcOpts" /></div>
    <p class="arc-blurb">{{ arcBlurb }}</p>

    <Spinner v-if="tasks.loading.value" block label="Calcul du chemin critique…" />

    <template v-else>
      <Reveal><Card class="summit" tone="surface">
        <ProgressRing :value="data.pct" :size="124" :color="ringColor">
          <div class="summit-pct num">{{ data.pct }}%</div>
          <div class="summit-sub">{{ arc === 'kappa' ? 'Kappa' : 'Lightkeeper' }}</div>
        </ProgressRing>
        <div class="summit-body">
          <div class="summit-counts">
            <span class="sc"><b class="num">{{ data.done }}</b><span>faites</span></span>
            <span class="sc"><b class="num accent">{{ data.frontier.length }}</b><span>au front</span></span>
            <span class="sc"><b class="num">{{ data.locked }}</b><span>verrouillées</span></span>
            <span class="sc"><b class="num">{{ data.total }}</b><span>au total</span></span>
          </div>
          <div class="summit-bar"><span :style="{ width: data.pct + '%', background: ringColor }" /></div>
          <p class="summit-hint">Le « front » = les quêtes de cet arc faisables dès maintenant.</p>
        </div>
      </Card></Reveal>

      <Reveal :index="1" v-if="finalQuest"><Card class="finale" tone="raised" glow>
        <div class="finale-mark">◈</div>
        <div class="finale-body">
          <span class="kicker">Ligne d’arrivée</span>
          <h3 class="finale-name">{{ finalQuest.name }}</h3>
          <p class="finale-d">
            {{ finalQuest.trader?.name }} ·
            <template v-if="game.completed.has(finalQuest.id)">déjà complétée ✓</template>
            <template v-else><b class="num">{{ finalRemaining }}</b> prérequis restants sur {{ finalQuest.taskRequirements?.length ?? 0 }}</template>
          </p>
        </div>
        <RouterLink :to="`/quetes?q=${encodeURIComponent(finalQuest.name)}`" class="finale-go">Voir →</RouterLink>
      </Card></Reveal>

      <!-- Checklist Collector (les items FiR à mettre de côté pour le Kappa) -->
      <Reveal v-if="collectorItems.length"><Card class="coll" tone="surface">
        <button class="coll-head" @click="showCollector = !showCollector">
          <span class="kicker">Checklist Collector — items FiR à garder</span>
          <span class="coll-prog num">{{ collectorDone }} / {{ collectorItems.length }}</span>
          <span class="coll-caret">{{ showCollector ? '−' : '+' }}</span>
        </button>
        <div class="coll-bar"><span :style="{ width: (collectorDone / collectorItems.length * 100) + '%' }" /></div>
        <p class="coll-warn">⚠ Ne jamais déposer ces objets dans le conteneur sécurisé : ça détruit le statut FiR.</p>
        <div v-if="showCollector" class="coll-grid">
          <button
            v-for="c in collectorItems"
            :key="c.objId"
            class="coll-item"
            :class="{ on: game.objDone(c.objId) }"
            @click="game.toggleObjective(c.objId)"
          >
            <span class="coll-check">{{ game.objDone(c.objId) ? '✓' : '' }}</span>
            <IconBox :src="c.item.iconLink" :bg="c.item.backgroundColor" :size="34" />
            <span class="coll-name">{{ c.item.shortName || c.item.name }}</span>
          </button>
        </div>
      </Card></Reveal>

      <Reveal :index="2" tag="h3" class="section-title sm">Ton front actuel</Reveal>
      <div v-if="data.frontier.length" class="front">
        <RouterLink
          v-for="t in data.frontier"
          :key="t.id"
          :to="`/quetes?q=${encodeURIComponent(t.name)}`"
          class="fq"
        >
          <img v-if="t.trader?.imageLink" :src="t.trader.imageLink" class="fq-av" :alt="t.trader?.name" />
          <div class="fq-main">
            <div class="fq-name">{{ t.name }}</div>
            <div class="fq-sub">
              <span>{{ t.trader?.name }}</span>
              <span v-if="t.map">· {{ t.map.name }}</span>
              <span v-if="t.minPlayerLevel" class="num">· niv {{ t.minPlayerLevel }}</span>
            </div>
          </div>
          <div class="fq-badges">
            <Badge v-if="t.kappaRequired" variant="kappa">Kappa</Badge>
            <Badge v-if="t.lightkeeperRequired" variant="lk">LK</Badge>
          </div>
        </RouterLink>
      </div>
      <EmptyState v-else icon="✓" title="Aucune quête de cet arc au front">
        Monte ton niveau et ta loyauté marchands pour débloquer la suite.
      </EmptyState>

      <!-- Ordre recommandé : le chemin complet de l'arc, trié dépendance + niveau -->
      <Reveal v-if="order.length"><Card class="order" tone="surface">
        <button class="order-head" @click="showOrder = !showOrder">
          <span class="kicker">Ordre recommandé — chemin complet ({{ order.length }} restantes)</span>
          <span class="order-caret">{{ showOrder ? '−' : '+' }}</span>
        </button>
        <p class="order-hint">Trié par niveau requis puis par profondeur de dépendance. Les <b>dispo</b> sont faisables maintenant.</p>
        <ol v-if="showOrder" class="order-list">
          <RouterLink
            v-for="(o, i) in order"
            :key="o.task.id"
            :to="`/quetes?q=${encodeURIComponent(o.task.name)}`"
            class="ol-row"
            :class="o.state"
          >
            <span class="ol-n num">{{ i + 1 }}</span>
            <span class="ol-name">{{ o.task.name }}</span>
            <span class="ol-meta">
              <span class="ol-trader">{{ o.task.trader?.name }}</span>
              <span v-if="o.task.minPlayerLevel" class="num">niv {{ o.task.minPlayerLevel }}</span>
            </span>
            <Badge :variant="o.state === 'available' ? 'good' : 'info'">{{ o.state === 'available' ? 'dispo' : 'verrou.' }}</Badge>
          </RouterLink>
        </ol>
      </Card></Reveal>
    </template>
  </section>
</template>

<style scoped>
.narr-note { background: rgba(167, 139, 255, 0.08); border: 1px solid #443060; border-radius: var(--r-md); padding: 12px 15px; font-size: 12.5px; color: var(--ink-2); margin-bottom: 22px; line-height: 1.5; }
.narr-note b { color: var(--purple); }

.section-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 0 0 12px; }
.section-title.mt { margin-top: 30px; }
.section-title.sm { font-size: 15px; margin-top: 22px; }
.section-title.big { font-size: 19px; padding-top: 14px; border-top: 1px solid var(--hairline); }
.st-sub { font-family: var(--font-mono); font-size: 11px; font-weight: 400; color: var(--ink-3); letter-spacing: 0.5px; }

/* spine */
.spine { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }
.act { flex: 1 1 220px; display: flex; gap: 12px; background: linear-gradient(180deg, var(--raised), var(--surface)); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 13px 15px; box-shadow: inset 0 1px 0 var(--highlight); }
.act-no { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--purple); flex: 0 0 auto; line-height: 1.1; }
.act-name { font-family: var(--font-display); font-weight: 600; font-size: 15.5px; }
.act-d { font-size: 12px; color: var(--ink-2); line-height: 1.45; margin-top: 3px; }
.act-arrow { display: flex; align-items: center; color: var(--ink-4); font-size: 18px; }
.side-chaps { font-size: 12px; color: var(--ink-3); margin: 12px 0 0; }

/* endings */
.endings { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
.ending-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
.ending-name { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.ending.best .ending-name { color: var(--accent); }
.ending.good .ending-name { color: var(--blue); }
.ending.mixed .ending-name { color: var(--amber); }
.ending.bad .ending-name { color: var(--red); }
.ending-d { font-size: 12.5px; color: var(--ink-2); line-height: 1.5; margin: 0; }

/* arc */
.arc-switch { margin: 6px 0 10px; }
.arc-blurb { font-size: 13px; color: var(--ink-2); margin: 0 0 16px; max-width: 70ch; }

.summit { display: flex; align-items: center; gap: 26px; margin-bottom: 14px; flex-wrap: wrap; }
.summit-pct { font-family: var(--font-display); font-weight: 700; font-size: 24px; }
.summit-sub { font-size: 10.5px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.5px; }
.summit-body { flex: 1; min-width: 240px; }
.summit-counts { display: flex; gap: 22px; flex-wrap: wrap; margin-bottom: 14px; }
.sc { display: flex; flex-direction: column; }
.sc b { font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; }
.sc b.accent { color: var(--accent); }
.sc span { font-size: 11px; color: var(--ink-3); margin-top: 3px; }
.summit-bar { height: 6px; background: var(--canvas); border-radius: var(--r-pill); overflow: hidden; }
.summit-bar span { display: block; height: 100%; border-radius: var(--r-pill); transition: width 0.8s var(--ease-out-expo); }
.summit-hint { font-size: 12px; color: var(--ink-3); margin: 12px 0 0; }

.finale { display: flex; align-items: center; gap: 16px; margin-bottom: 22px; }
.finale-mark { font-size: 26px; color: var(--accent); text-shadow: 0 0 18px var(--accent-glow); flex: 0 0 auto; }
.finale-body { flex: 1; min-width: 0; }
.finale-name { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 4px 0 4px; }
.finale-d { font-size: 13px; color: var(--ink-2); margin: 0; }
.finale-d b { color: var(--amber); }
.finale-go { flex: 0 0 auto; font-size: 14px; color: var(--accent); font-weight: 600; }
.finale-go:hover { text-decoration: underline; }

/* collector checklist */
.coll { margin-bottom: 22px; }
.coll-head { width: 100%; display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; padding: 0; text-align: left; }
.coll-head .kicker { flex: 1; }
.coll-prog { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--amber); }
.coll-caret { font-family: var(--font-mono); color: var(--ink-3); font-size: 16px; width: 16px; text-align: center; }
.coll-bar { height: 5px; background: var(--canvas); border-radius: var(--r-pill); overflow: hidden; margin: 10px 0 8px; }
.coll-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-dim), var(--amber)); border-radius: var(--r-pill); transition: width 0.6s var(--ease-out-expo); }
.coll-warn { font-size: 11.5px; color: var(--amber); margin: 0 0 12px; }
.coll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 7px; }
.coll-item { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 7px 9px; cursor: pointer; text-align: left; transition: border-color var(--t1) var(--ease), opacity var(--t1) var(--ease); }
.coll-item:hover { border-color: var(--hairline-2); }
.coll-item.on { opacity: 0.5; }
.coll-check { width: 18px; height: 18px; flex: 0 0 auto; border-radius: 5px; border: 1.5px solid var(--hairline-2); background: var(--canvas); color: var(--ink-on-accent); display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.coll-item.on .coll-check { background: var(--accent); border-color: var(--accent); }
.coll-name { font-size: 12.5px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.coll-item.on .coll-name { text-decoration: line-through; color: var(--ink-3); }

.front { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 9px; }
.fq { display: flex; align-items: center; gap: 12px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 10px 13px; transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart); }
.fq:hover { border-color: var(--accent-dim); transform: translateY(-2px); }
.fq-av { width: 36px; height: 36px; border-radius: var(--r-xs); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; flex: 0 0 auto; }
.fq-main { flex: 1; min-width: 0; }
.fq-name { font-size: 14px; color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fq-sub { font-size: 11.5px; color: var(--ink-3); display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
.fq-badges { display: flex; gap: 4px; flex: 0 0 auto; }

/* ordre recommandé */
.order { margin-top: 18px; }
.order-head { width: 100%; display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; padding: 0; text-align: left; }
.order-head .kicker { flex: 1; }
.order-caret { font-family: var(--font-mono); color: var(--ink-3); font-size: 16px; width: 16px; text-align: center; }
.order-hint { font-size: 12px; color: var(--ink-3); margin: 8px 0 0; }
.order-hint b { color: var(--positive); }
.order-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ol-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: var(--r-sm); transition: background var(--t1) var(--ease); }
.ol-row:hover { background: var(--surface-2); }
.ol-row.locked { opacity: 0.6; }
.ol-n { font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); width: 26px; text-align: right; flex: 0 0 auto; }
.ol-name { flex: 1; min-width: 0; font-size: 13.5px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ol-meta { display: flex; gap: 8px; align-items: center; flex: 0 0 auto; font-size: 11px; color: var(--ink-3); }
.ol-trader { color: var(--ink-3); }
@media (max-width: 640px) { .ol-meta { display: none; } }
</style>
