<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, type Task } from '@/lib/tarkov';
import { rankMaps, buildBrief, anywhereQuests } from '@/lib/raid';
import type { PlayerState } from '@/lib/progression';
import { compact } from '@/lib/format';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import IconBox from '@/components/ui/IconBox.vue';
import Stat from '@/components/ui/Stat.vue';
import Spinner from '@/components/ui/Spinner.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Reveal from '@/components/ui/Reveal.vue';

const game = useGameStore();
const { data: tasks, loading } = useResource<Task[]>('tasks', fetchTasks);

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, prestige: game.prestige, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));

const ranking = computed(() => rankMaps(tasks.value ?? [], player.value, game.objectivesDone, game.pinned));

const selected = ref<string | null>(null);
watch(ranking, (r) => {
  // garde la sélection si la carte reste pertinente, sinon prend la meilleure
  if (!r.length) { selected.value = null; return; }
  if (!selected.value || !r.some((s) => s.norm === selected.value)) selected.value = r[0].norm;
}, { immediate: true });

const brief = computed(() =>
  selected.value ? buildBrief(tasks.value ?? [], player.value, game.objectivesDone, game.pinned, selected.value) : null,
);
const selectedName = computed(() => ranking.value.find((s) => s.norm === selected.value)?.name ?? '');

const anywhere = computed(() => anywhereQuests(tasks.value ?? [], player.value, game.objectivesDone));
const showAnywhere = ref(false);

/** Tous les objectifs non optionnels d'une quête sont cochés → proposer de la clore. */
function questComplete(q: { task: Task }): boolean {
  const req = q.task.objectives.filter((o) => !o.optional);
  return req.length > 0 && req.every((o) => game.objDone(o.id));
}

const whereLabel = { here: 'ici', elsewhere: 'ailleurs', anywhere: 'partout' } as const;
</script>

<template>
  <section class="view">
    <span class="kicker">Planificateur</span>
    <h1 class="page-title">Ton prochain raid</h1>
    <p class="lead">
      Les cartes classées par ce que tu peux y accomplir maintenant. Choisis, prépare ton rig,
      coche en raid : tout se recalcule (quêtes closes, suites débloquées, briefs à jour).
    </p>

    <Spinner v-if="loading" block label="Croisement de tes quêtes et des cartes…" />

    <template v-else>
      <!-- CLASSEMENT DES CARTES -->
      <div v-if="ranking.length" class="maps-rank">
        <button
          v-for="(s, i) in ranking"
          :key="s.norm"
          class="mr"
          :class="{ on: selected === s.norm, top: i === 0 }"
          @click="selected = s.norm"
        >
          <span class="mr-name">{{ s.name }}</span>
          <span class="mr-q"><b class="num">{{ s.quests }}</b> quêtes</span>
          <span class="mr-meta">
            <span class="num">{{ compact(s.xp) }} XP</span>
            <span v-if="s.keys" class="num">· {{ s.keys }} 🔑</span>
          </span>
          <span class="mr-flags">
            <Badge v-if="s.pinned" variant="amber">★ {{ s.pinned }}</Badge>
            <Badge v-if="s.kappa" variant="kappa">K {{ s.kappa }}</Badge>
          </span>
        </button>
      </div>
      <EmptyState v-else icon="◎" title="Aucune quête localisée faisable">
        Monte ton niveau ou règle ta progression dans Config — le planificateur s'appuie sur tes quêtes disponibles.
      </EmptyState>

      <!-- BRIEF -->
      <template v-if="brief && brief.quests.length">
        <div class="brief-head">
          <h2 class="section-title">Brief — {{ selectedName }}</h2>
          <div class="brief-stats">
            <Stat tone="accent" :value="brief.quests.length">quêtes</Stat>
            <Stat :value="compact(brief.xp)">XP</Stat>
            <RouterLink :to="`/cartes?map=${selected}`" class="tomap">Carte tactique →</RouterLink>
          </div>
        </div>

        <!-- LOADOUT : ce qui doit partir dans le rig -->
        <div v-if="brief.keys.length || brief.bring.length || brief.find.length || brief.targets.length" class="loadout">
          <Reveal v-if="brief.keys.length || brief.bring.length"><Card tone="surface" class="lo">
            <span class="kicker">À apporter — dans le rig au départ</span>
            <div class="lo-items">
              <div v-for="k in brief.keys" :key="k.item.id" class="lo-it">
                <IconBox :src="k.item.iconLink" :size="34" />
                <div class="lo-main">
                  <div class="lo-name">🔑 {{ k.item.shortName || k.item.name }}<span v-if="k.altCount" class="lo-alt"> (+{{ k.altCount }} alt.)</span></div>
                  <div class="lo-q">{{ k.quests.slice(0, 2).join(' · ') }}</div>
                </div>
              </div>
              <div v-for="b in brief.bring" :key="b.item.id" class="lo-it">
                <IconBox :src="b.item.iconLink" :size="34" />
                <div class="lo-main">
                  <div class="lo-name"><b class="num">{{ b.count }}×</b> {{ b.item.shortName || b.item.name }}</div>
                  <div class="lo-q">à placer · {{ b.quests.slice(0, 2).join(' · ') }}</div>
                </div>
              </div>
            </div>
            <p class="lo-warn">⚠ Jamais dans le conteneur sécurisé pendant l'objectif — les marqueurs/items posés doivent être accessibles.</p>
          </Card></Reveal>

          <Reveal v-if="brief.find.length" :index="1"><Card tone="surface" class="lo">
            <span class="kicker">À trouver sur place</span>
            <div class="lo-items">
              <div v-for="f in brief.find" :key="f.item.id" class="lo-it">
                <IconBox :src="f.item.iconLink" :size="34" />
                <div class="lo-main">
                  <div class="lo-name"><b class="num">{{ f.count }}×</b> {{ f.item.shortName || f.item.name }} <Badge v-if="f.fir" variant="fir">FiR</Badge></div>
                  <div class="lo-q">{{ f.quests.slice(0, 2).join(' · ') }}</div>
                </div>
              </div>
            </div>
            <p v-if="brief.find.some((f) => f.fir)" class="lo-warn">⚠ FiR : garde-les dans le rig, le conteneur sécurisé détruit le statut à l'extraction.</p>
          </Card></Reveal>

          <Reveal v-if="brief.targets.length" :index="2"><Card tone="surface" class="lo">
            <span class="kicker">Cibles</span>
            <ul class="targets">
              <li v-for="(tg, i) in brief.targets" :key="i">
                <span class="tg-desc">{{ tg.desc }}</span>
                <span class="tg-quest">{{ tg.quest }}</span>
              </li>
            </ul>
          </Card></Reveal>
        </div>

        <!-- QUÊTES DU RAID -->
        <Reveal tag="h3" class="section-title sm">Objectifs du raid</Reveal>
        <div class="bq-list">
          <Card v-for="q in brief.quests" :key="q.task.id" tone="raised" :pad="false" class="bq" :class="{ focus: q.pinned }">
            <header class="bq-head">
              <img v-if="q.task.trader?.imageLink" :src="q.task.trader.imageLink" class="bq-av" :alt="q.task.trader?.name" />
              <div class="bq-main">
                <div class="bq-name">{{ q.task.name }}</div>
                <div class="bq-sub">{{ q.task.trader?.name }}<span v-if="q.task.experience" class="num"> · {{ q.task.experience.toLocaleString('fr-FR') }} XP</span></div>
              </div>
              <Badge v-if="q.task.kappaRequired" variant="kappa">Kappa</Badge>
              <Badge v-if="q.task.lightkeeperRequired" variant="lk">LK</Badge>
              <button
                class="pin"
                :class="{ on: game.isPinned(q.task.id) }"
                :title="game.isPinned(q.task.id) ? 'Désépingler' : 'Épingler (focus)'"
                @click="game.togglePin(q.task.id)"
              >{{ game.isPinned(q.task.id) ? '★' : '☆' }}</button>
            </header>
            <ul class="bq-objs">
              <li v-for="{ o, where } in q.objectives" :key="o.id" :class="[where, { checked: game.objDone(o.id), opt: o.optional }]">
                <button class="objchk" :class="{ on: game.objDone(o.id) }" @click="game.toggleObjective(o.id)">{{ game.objDone(o.id) ? '✓' : '' }}</button>
                <span class="obj-text">{{ o.description }}</span>
                <span class="obj-where" :class="where">{{ whereLabel[where] }}</span>
              </li>
            </ul>
            <button v-if="questComplete(q) && !game.isDone(q.task.id)" class="bq-done" @click="game.toggleDone(q.task.id)">
              Tous les objectifs cochés — marquer la quête faite ✓
            </button>
          </Card>
        </div>
      </template>

      <!-- FAISABLES PARTOUT -->
      <Reveal v-if="anywhere.length"><Card tone="surface" class="anyw">
        <button class="anyw-head" @click="showAnywhere = !showAnywhere">
          <span class="kicker">Avancent depuis n'importe quel raid</span>
          <span class="anyw-n num">{{ anywhere.length }}</span>
          <span class="anyw-caret">{{ showAnywhere ? '−' : '+' }}</span>
        </button>
        <p class="anyw-hint">Remises d'items, achats, crafts : pas de carte imposée. Profite de chaque raid pour les nourrir.</p>
        <div v-if="showAnywhere" class="anyw-list">
          <RouterLink v-for="t in anywhere" :key="t.id" :to="`/quetes?q=${encodeURIComponent(t.name)}`" class="anyw-q">
            <img v-if="t.trader?.imageLink" :src="t.trader.imageLink" class="anyw-av" :alt="t.trader?.name" />
            <span class="anyw-name">{{ t.name }}</span>
            <Badge v-if="t.kappaRequired" variant="kappa">K</Badge>
          </RouterLink>
        </div>
      </Card></Reveal>
    </template>
  </section>
</template>

<style scoped>
/* classement des cartes */
.maps-rank { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 9px; margin-bottom: 26px; }
.mr {
  display: flex; flex-direction: column; gap: 4px; text-align: left; cursor: pointer;
  background: linear-gradient(180deg, var(--raised), var(--surface));
  border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 12px 14px;
  box-shadow: inset 0 1px 0 var(--highlight);
  transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart), background var(--t1) var(--ease);
}
.mr:hover { border-color: var(--hairline-2); transform: translateY(-2px); }
.mr.on { border-color: var(--accent); background: linear-gradient(180deg, var(--accent-soft), transparent 80%), var(--raised); box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-accent); }
.mr-name { font-family: var(--font-display); font-weight: 600; font-size: 15.5px; color: var(--ink); }
.mr-q { font-size: 12.5px; color: var(--ink-2); }
.mr-q b { color: var(--accent); font-size: 15px; }
.mr-meta { font-size: 11px; color: var(--ink-3); display: flex; gap: 4px; }
.mr-flags { display: flex; gap: 5px; margin-top: 2px; min-height: 18px; }

/* brief */
.brief-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.section-title { font-family: var(--font-display); font-weight: 600; font-size: 18px; margin: 0; }
.section-title.sm { font-size: 15px; margin: 22px 0 10px; }
.brief-stats { display: flex; gap: 8px; align-items: center; }
.tomap { font-size: 13px; color: var(--accent); font-weight: 600; margin-left: 6px; }
.tomap:hover { text-decoration: underline; }

.loadout { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.lo-items { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.lo-it { display: flex; align-items: center; gap: 10px; }
.lo-main { flex: 1; min-width: 0; }
.lo-name { font-size: 13.5px; color: var(--ink); }
.lo-alt { color: var(--ink-3); font-size: 11.5px; }
.lo-q { font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lo-warn { font-size: 11px; color: var(--amber); margin: 12px 0 0; }
.targets { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.targets li { display: flex; flex-direction: column; gap: 1px; font-size: 13px; }
.tg-desc { color: var(--ink); line-height: 1.4; }
.tg-quest { font-size: 11px; color: var(--ink-3); }

/* quest cards */
.bq-list { display: flex; flex-direction: column; gap: 10px; }
.bq.focus { border-color: var(--amber); }
.bq-head { display: flex; align-items: center; gap: 12px; padding: 12px 15px; }
.bq-av { width: 36px; height: 36px; border-radius: var(--r-xs); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; flex: 0 0 auto; }
.bq-main { flex: 1; min-width: 0; }
.bq-name { font-family: var(--font-display); font-weight: 600; font-size: 16px; }
.bq-sub { font-size: 12px; color: var(--ink-3); }
.pin { background: none; border: none; cursor: pointer; font-size: 18px; color: var(--ink-4); padding: 4px; line-height: 1; transition: color var(--t1) var(--ease), transform var(--t1) var(--ease-spring); }
.pin:hover { color: var(--amber); transform: scale(1.15); }
.pin.on { color: var(--amber); }
.bq-objs { list-style: none; margin: 0; padding: 4px 15px 14px 15px; border-top: 1px solid var(--hairline); display: flex; flex-direction: column; gap: 7px; }
.bq-objs li { display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; line-height: 1.45; padding-top: 7px; }
.bq-objs li.elsewhere .obj-text, .bq-objs li.opt .obj-text { color: var(--ink-3); }
.bq-objs li.checked .obj-text { color: var(--ink-3); text-decoration: line-through; }
.objchk {
  width: 18px; height: 18px; flex: 0 0 auto; margin-top: 1px; border-radius: 5px;
  border: 1.5px solid var(--hairline-2); background: var(--canvas); color: var(--ink-on-accent);
  cursor: pointer; display: grid; place-items: center; font-size: 11px; font-weight: 700; transition: all var(--t1) var(--ease);
}
.objchk.on { background: var(--accent); border-color: var(--accent); }
.obj-text { flex: 1; }
.obj-where { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; padding: 2px 7px; border-radius: var(--r-pill); flex: 0 0 auto; margin-top: 2px; }
.obj-where.here { color: var(--cyan); border: 1px solid rgba(79, 211, 196, 0.3); }
.obj-where.elsewhere { color: var(--ink-4); border: 1px solid var(--hairline); }
.obj-where.anywhere { color: var(--ink-3); border: 1px solid var(--hairline-2); }
.bq-done {
  display: block; width: calc(100% - 30px); margin: 0 15px 14px; padding: 10px;
  background: var(--accent-soft); border: 1px solid var(--accent-dim); border-radius: var(--r-sm);
  color: var(--accent); font-weight: 600; font-size: 13.5px; cursor: pointer;
  transition: all var(--t1) var(--ease);
}
.bq-done:hover { background: var(--accent); color: var(--ink-on-accent); }

/* anywhere */
.anyw { margin-top: 22px; }
.anyw-head { width: 100%; display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; padding: 0; text-align: left; }
.anyw-head .kicker { flex: 1; }
.anyw-n { font-size: 12px; color: var(--ink-2); background: var(--surface-2); border-radius: var(--r-pill); padding: 2px 10px; }
.anyw-caret { font-family: var(--font-mono); color: var(--ink-3); font-size: 16px; width: 16px; text-align: center; }
.anyw-hint { font-size: 12px; color: var(--ink-3); margin: 8px 0 0; }
.anyw-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 7px; margin-top: 12px; }
.anyw-q { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 7px 10px; transition: border-color var(--t1) var(--ease); }
.anyw-q:hover { border-color: var(--accent-dim); }
.anyw-av { width: 26px; height: 26px; border-radius: var(--r-xs); object-fit: cover; background: #000; flex: 0 0 auto; }
.anyw-name { flex: 1; min-width: 0; font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
