<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, type Task } from '@/lib/tarkov';
import { storyArc, taskInfo, type PlayerState } from '@/lib/progression';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import ProgressRing from '@/components/ui/ProgressRing.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Reveal from '@/components/ui/Reveal.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const game = useGameStore();
const tasks = useResource<Task[]>('tasks', fetchTasks);

const arc = ref<'kappa' | 'lightkeeper'>('kappa');
const arcOpts = [
  { value: 'kappa', label: 'Collector / Kappa' },
  { value: 'lightkeeper', label: 'Lightkeeper' },
];

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));

const data = computed(() => storyArc(tasks.data.value ?? [], player.value, arc.value));
const ringColor = computed(() => (arc.value === 'kappa' ? 'var(--amber)' : 'var(--blue)'));

// La ligne d'arrivée : Collector (Kappa) ou la chaîne d'accès Lightkeeper.
const finalQuest = computed(() => {
  const list = tasks.data.value ?? [];
  if (arc.value === 'kappa') return list.find((t) => t.normalizedName === 'collector') ?? null;
  // Lightkeeper : on prend la quête LK avec le plus de prérequis (le verrou final de l'arc).
  const lk = list.filter((t) => t.lightkeeperRequired);
  return lk.slice().sort((a, b) => (b.taskRequirements?.length ?? 0) - (a.taskRequirements?.length ?? 0))[0] ?? null;
});
const finalInfo = computed(() => (finalQuest.value ? taskInfo(finalQuest.value, player.value) : null));
const finalRemaining = computed(() => {
  if (!finalQuest.value) return 0;
  return (finalQuest.value.taskRequirements ?? []).filter((r) => r.task && !game.completed.has(r.task.id)).length;
});

const blurb = computed(() =>
  arc.value === 'kappa'
    ? 'La grande trame : la chaîne de quêtes qui mène au conteneur Kappa via le marchand secret Collector. C’est l’objectif long de tout le wipe.'
    : 'L’arc Lightkeeper : débloquer l’accès à l’île de Lighthouse et gagner sa confiance. Sensible à ta karma Scav et à tes choix de quêtes.',
);
</script>

<template>
  <section class="view">
    <span class="kicker">Trame principale</span>
    <h1 class="page-title">Le chemin critique</h1>
    <p class="lead">{{ blurb }}</p>

    <div class="arc-switch"><SegmentedControl v-model="arc" :options="arcOpts" /></div>

    <Spinner v-if="tasks.loading.value" block label="Calcul du chemin critique…" />

    <template v-else>
      <!-- SOMMET : progression de l'arc -->
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
          <p class="summit-hint">Le « front » = les quêtes de la trame que tu peux lancer dès maintenant.</p>
        </div>
      </Card></Reveal>

      <!-- LIGNE D'ARRIVÉE -->
      <Reveal :index="1" v-if="finalQuest"><Card class="finale" tone="raised" glow>
        <div class="finale-mark">◈</div>
        <div class="finale-body">
          <span class="kicker">Ligne d’arrivée</span>
          <h2 class="finale-name">{{ finalQuest.name }}</h2>
          <p class="finale-d">
            {{ finalQuest.trader?.name }} ·
            <template v-if="game.completed.has(finalQuest.id)">déjà complétée ✓</template>
            <template v-else><b class="num">{{ finalRemaining }}</b> prérequis restants sur {{ finalQuest.taskRequirements?.length ?? 0 }}</template>
          </p>
        </div>
        <RouterLink :to="`/quetes?q=${encodeURIComponent(finalQuest.name)}`" class="finale-go">Voir →</RouterLink>
      </Card></Reveal>

      <!-- LE FRONT -->
      <Reveal :index="2" tag="h2" class="section-title">Ton front actuel</Reveal>
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
      <EmptyState v-else icon="✓" title="Aucune quête de trame au front">
        Monte ton niveau et ta loyauté marchands pour débloquer la suite du chemin critique.
      </EmptyState>
    </template>
  </section>
</template>

<style scoped>
.arc-switch { margin-bottom: 20px; }

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

.finale { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; }
.finale-mark { font-size: 26px; color: var(--accent); text-shadow: 0 0 18px var(--accent-glow); flex: 0 0 auto; }
.finale-body { flex: 1; min-width: 0; }
.finale-name { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 4px 0 4px; }
.finale-d { font-size: 13px; color: var(--ink-2); margin: 0; }
.finale-d b { color: var(--amber); }
.finale-go { flex: 0 0 auto; font-size: 14px; color: var(--accent); font-weight: 600; }
.finale-go:hover { text-decoration: underline; }

.section-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 0 0 12px; }
.front { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 9px; }
.fq { display: flex; align-items: center; gap: 12px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 10px 13px; transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart); }
.fq:hover { border-color: var(--accent-dim); transform: translateY(-2px); }
.fq-av { width: 36px; height: 36px; border-radius: var(--r-xs); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; flex: 0 0 auto; }
.fq-main { flex: 1; min-width: 0; }
.fq-name { font-size: 14px; color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fq-sub { font-size: 11.5px; color: var(--ink-3); display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
.fq-badges { display: flex; gap: 4px; flex: 0 0 auto; }
</style>
