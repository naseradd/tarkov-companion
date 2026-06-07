<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, fetchTraders, type Task, type TraderFull } from '@/lib/tarkov';
import { nextBottlenecks, storyArc, wipePhase, activeQuestItems, type PlayerState } from '@/lib/progression';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import ProgressRing from '@/components/ui/ProgressRing.vue';
import IconBox from '@/components/ui/IconBox.vue';
import Modal from '@/components/ui/Modal.vue';
import Reveal from '@/components/ui/Reveal.vue';
import Spinner from '@/components/ui/Spinner.vue';

const game = useGameStore();
const tasks = useResource<Task[]>('tasks', fetchTasks);
const traders = useResource<TraderFull[]>('traders', fetchTraders);

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));
const ready = computed(() => !tasks.loading.value && !traders.loading.value);

const kappa = computed(() => storyArc(tasks.data.value ?? [], player.value, 'kappa'));
const lk = computed(() => storyArc(tasks.data.value ?? [], player.value, 'lightkeeper'));
const phase = computed(() => wipePhase(game.level, kappa.value.pct));
const bottlenecks = computed(() => nextBottlenecks(tasks.data.value ?? [], traders.data.value ?? [], player.value));
const top = computed(() => bottlenecks.value[0] ?? null);
const rest = computed(() => bottlenecks.value.slice(1));

// Items à garder pour les quêtes FAISABLES MAINTENANT (avec leurs objectifs + cartes).
const activeItems = computed(() => activeQuestItems(tasks.data.value ?? [], player.value).slice(0, 12));
const firstQuestLink = (q: string) => `/quetes?q=${encodeURIComponent(q)}`;

const phaseLower = computed(() => phase.value.label.toLowerCase());

// position du joueur sur le rail de wipe (0-100)
const wipePct = computed(() => {
  const lvl = game.level;
  if (lvl < 15) return Math.round((lvl / 15) * 33);
  if (lvl < 40) return Math.round(33 + Math.min(1, (lvl - 15) / 25) * 34);
  return Math.round(67 + (Math.min(100, kappa.value.pct) / 100) * 33);
});

// Essentiels à ne jamais jeter en début de wipe — chaque ligne dit pourquoi + où aller.
const essentials = [
  { ic: '🔩', t: 'Pièces de bricolage', d: 'Boulons, vis, fils, câbles électriques : exigés par les premiers niveaux du hideout.', to: '/hideout' },
  { ic: '🩹', t: 'Soins (Salewa, IFAK, AI-2)', d: 'Survie en raid + quêtes Therapist. Garde-en toujours en réserve FiR.', to: '/quetes' },
  { ic: '🔑', t: 'Toutes les clés', d: 'Forte valeur de revente et ouvrent des salles de loot ciblées. Ne jamais jeter.', to: '/loot' },
  { ic: '💻', t: 'Cartes graphiques (GPU)', d: 'Ferme Bitcoin + niveaux hideout. À garder dès que tu en trouves.', to: '/hideout' },
  { ic: '🔋', t: 'Électronique & piles', d: 'Condensateurs, aimants, piles : barters Therapist/Mechanic et hideout.', to: '/marchands/therapist' },
  { ic: '⛽', t: 'Carburant & outils', d: 'Bidons d’essence pour le générateur, outils pour l’atelier hideout.', to: '/hideout' },
];

const confirmReset = ref(false);
function doReset() { game.resetProgress(); confirmReset.value = false; }
</script>

<template>
  <section class="view">
    <!-- HERO -->
    <header class="hero">
      <span class="kicker">Wipe dashboard</span>
      <h1 class="hero-title">Niveau <span class="lvl">{{ game.level }}</span>, {{ phaseLower }}.</h1>
      <p class="hero-lead">{{ phase.advice }}</p>

      <RouterLink v-if="top" :to="top.to || '/quetes'" class="next-step">
        <span class="ns-mark" />
        <span class="ns-body">
          <span class="ns-k">Prochaine étape</span>
          <span class="ns-t">{{ top.title }}</span>
          <span class="ns-d">{{ top.detail }}</span>
        </span>
        <span class="ns-arrow">→</span>
      </RouterLink>

      <div class="rail" role="img" :aria-label="`Progression de wipe ${wipePct}%`">
        <div class="rail-track">
          <span class="rail-fill" :style="{ width: wipePct + '%' }" />
          <span class="rail-dot" :style="{ left: wipePct + '%' }"><b>{{ game.level }}</b></span>
        </div>
        <div class="rail-labels">
          <span :class="{ on: phase.phase === 'early' }">Début</span>
          <span :class="{ on: phase.phase === 'mid' }">Milieu</span>
          <span :class="{ on: phase.phase === 'late' }">Fin · Kappa {{ kappa.pct }}%</span>
        </div>
      </div>
    </header>

    <Spinner v-if="!ready" block label="Calcul de ta progression…" />

    <template v-else>
      <!-- Blocages -->
      <template v-if="rest.length">
        <Reveal tag="h2" class="section-title">Ce qui te freine</Reveal>
        <div class="bottlenecks">
          <Reveal v-for="(b, i) in rest" :key="i" :index="i">
            <component :is="b.to ? 'RouterLink' : 'div'" :to="b.to" class="bn-link">
              <Card class="bn" tone="surface" :interactive="!!b.to">
                <div class="bn-top">
                  <span class="bn-ic">{{ b.type === 'flea' ? '◳' : b.type === 'trader' ? '⇡' : b.type === 'quest' ? '✓' : '★' }}</span>
                  <span class="bn-title">{{ b.title }}</span>
                </div>
                <div class="bn-detail">{{ b.detail }}</div>
                <div v-if="b.progressPct != null" class="bar"><span :style="{ width: Math.min(100, b.progressPct) + '%' }" /></div>
              </Card>
            </component>
          </Reveal>
        </div>
      </template>

      <!-- Trame principale (compacte) -->
      <Reveal><RouterLink to="/trame" class="story-strip">
        <div class="ss-rings">
          <ProgressRing :value="kappa.pct" :size="64" :stroke="6" color="var(--amber)">
            <span class="ss-pct num">{{ kappa.pct }}%</span>
          </ProgressRing>
          <ProgressRing :value="lk.pct" :size="64" :stroke="6" color="var(--blue)">
            <span class="ss-pct num">{{ lk.pct }}%</span>
          </ProgressRing>
        </div>
        <div class="ss-body">
          <span class="kicker">Trame principale</span>
          <div class="ss-title">Collector / Kappa &amp; Lightkeeper</div>
          <div class="ss-d">
            <b class="num">{{ kappa.frontier.length + lk.frontier.length }}</b> quêtes de trame au front ·
            <b class="num">{{ kappa.done }}</b>/{{ kappa.total }} Kappa
          </div>
        </div>
        <span class="ss-arrow">→</span>
      </RouterLink></Reveal>

      <!-- À garder pour les quêtes actives -->
      <Reveal tag="h2" class="section-title mt">À garder maintenant <span class="st-sub">pour tes quêtes faisables</span></Reveal>
      <div v-if="activeItems.length" class="active-items">
        <RouterLink
          v-for="it in activeItems"
          :key="it.id"
          :to="firstQuestLink(it.quests[0])"
          class="ai"
        >
          <IconBox :src="it.icon" :size="42" />
          <div class="ai-main">
            <div class="ai-name"><b class="num">{{ it.count }}×</b> {{ it.name }}</div>
            <div class="ai-for">pour {{ it.quests.slice(0, 2).join(', ') }}<span v-if="it.quests.length > 2"> +{{ it.quests.length - 2 }}</span></div>
            <div v-if="it.maps.length" class="ai-maps">{{ it.maps.slice(0, 3).join(' · ') }}</div>
          </div>
          <div class="ai-flags">
            <Badge v-if="it.fir" variant="fir">FiR</Badge>
            <Badge v-if="it.quests.length > 1" variant="info">×{{ it.quests.length }}</Badge>
          </div>
        </RouterLink>
      </div>
      <Card v-else tone="surface" class="empty-active">
        Aucun item requis par tes quêtes faisables. Règle ton niveau et tes marchands dans
        <RouterLink to="/config">Config</RouterLink>, ou ouvre <RouterLink to="/quetes">Quêtes</RouterLink>.
      </Card>

      <!-- Essentiels début de wipe -->
      <Reveal tag="h2" class="section-title mt">Essentiels à garder <span class="st-sub">début de wipe</span></Reveal>
      <div class="essentials">
        <RouterLink v-for="(e, i) in essentials" :key="i" :to="e.to" class="ess">
          <span class="ess-ic">{{ e.ic }}</span>
          <div class="ess-body">
            <div class="ess-t">{{ e.t }}</div>
            <div class="ess-d">{{ e.d }}</div>
          </div>
        </RouterLink>
      </div>

      <div class="reset-row">
        <button class="reset" @click="confirmReset = true">↺ Nouveau wipe / prestige</button>
      </div>
    </template>

    <Modal v-model="confirmReset" title="Nouveau wipe ?">
      Réinitialise niveau, marchands, hideout, quêtes et objectifs. La faction est conservée. Action irréversible.
      <template #footer>
        <button class="btn ghost" @click="confirmReset = false">Annuler</button>
        <button class="btn danger" @click="doReset">Tout réinitialiser</button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
/* ---------- HERO ---------- */
.hero { position: relative; padding: 8px 0 26px; margin-bottom: 8px; }
.hero-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: clamp(30px, 4.4vw, 50px); line-height: 1.04; letter-spacing: -0.02em;
  margin: 8px 0 10px; color: var(--ink); max-width: 16ch;
}
.hero-title .lvl { color: var(--accent); font-variant-numeric: tabular-nums; text-shadow: 0 0 26px var(--accent-glow); }
.hero-lead { color: var(--ink-2); font-size: 15.5px; max-width: 60ch; margin: 0 0 22px; }

.next-step {
  display: inline-flex; align-items: center; gap: 16px;
  background: linear-gradient(100deg, var(--accent-soft), transparent 70%), var(--raised);
  border: 1px solid var(--accent-dim); border-radius: var(--r-lg); padding: 14px 18px;
  color: var(--ink); box-shadow: var(--shadow-sm);
  transition: transform var(--t1) var(--ease-out-quart), box-shadow var(--t2) var(--ease-out-quart);
  max-width: 560px;
}
.next-step:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--shadow-accent); }
.next-step:active { transform: scale(0.99); }
.ns-mark { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); flex: 0 0 auto; animation: ns-pulse 2.4s var(--ease) infinite; }
@keyframes ns-pulse { 0%, 100% { box-shadow: 0 0 0 4px var(--accent-soft); } 50% { box-shadow: 0 0 0 7px transparent; } }
.ns-body { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.ns-k { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent-dim); }
.ns-t { font-family: var(--font-display); font-weight: 600; font-size: 17px; }
.ns-d { font-size: 12.5px; color: var(--ink-3); }
.ns-arrow { font-size: 20px; color: var(--accent); transition: transform var(--t2) var(--ease-out-quart); }
.next-step:hover .ns-arrow { transform: translateX(4px); }

.rail { margin-top: 26px; max-width: 640px; }
.rail-track { position: relative; height: 4px; background: var(--hairline); border-radius: var(--r-pill); }
.rail-fill { position: absolute; inset: 0 auto 0 0; height: 100%; background: linear-gradient(90deg, var(--accent-dim), var(--accent)); border-radius: var(--r-pill); transition: width 0.8s var(--ease-out-expo); }
.rail-dot { position: absolute; top: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: var(--ink-on-accent); box-shadow: var(--shadow-sm), 0 0 16px var(--accent-glow); transition: left 0.8s var(--ease-out-expo); }
.rail-dot b { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
.rail-labels { display: flex; justify-content: space-between; margin-top: 12px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-4); }
.rail-labels .on { color: var(--accent); }

/* ---------- sections ---------- */
.section-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 0 0 12px; }
.section-title.mt { margin-top: 28px; }
.st-sub { font-family: var(--font-mono); font-size: 11px; font-weight: 400; color: var(--ink-3); letter-spacing: 0.5px; }

/* ---------- bottlenecks ---------- */
.bottlenecks { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 26px; }
.bn-link { display: block; }
.bn-top { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.bn-ic { font-size: 15px; color: var(--ink-3); }
.bn-title { font-family: var(--font-display); font-weight: 600; font-size: 15px; }
.bn-detail { font-size: 13px; color: var(--ink-2); }
.bar { height: 6px; background: var(--canvas); border-radius: var(--r-pill); margin-top: 10px; overflow: hidden; }
.bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-dim), var(--accent)); border-radius: var(--r-pill); transition: width 0.7s var(--ease-out-expo); }

/* ---------- story strip ---------- */
.story-strip {
  display: flex; align-items: center; gap: 20px;
  background: linear-gradient(100deg, var(--amber-soft), transparent 60%), var(--raised);
  border: 1px solid var(--hairline-2); border-radius: var(--r-lg); padding: 16px 20px;
  box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-sm);
  transition: transform var(--t1) var(--ease-out-quart), box-shadow var(--t1) var(--ease), border-color var(--t1) var(--ease);
}
.story-strip:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-md); border-color: var(--amber); }
.ss-rings { display: flex; gap: 10px; flex: 0 0 auto; }
.ss-pct { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
.ss-body { flex: 1; min-width: 0; }
.ss-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 2px 0 3px; }
.ss-d { font-size: 12.5px; color: var(--ink-2); }
.ss-d b { color: var(--ink); }
.ss-arrow { font-size: 20px; color: var(--amber); flex: 0 0 auto; transition: transform var(--t2) var(--ease-out-quart); }
.story-strip:hover .ss-arrow { transform: translateX(4px); }

/* ---------- active items ---------- */
.active-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
.ai { display: flex; align-items: center; gap: 11px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 10px; transition: transform var(--t1) var(--ease-out-quart), border-color var(--t1) var(--ease); }
.ai:hover { border-color: var(--accent-dim); transform: translateY(-2px); }
.ai-main { flex: 1; min-width: 0; }
.ai-name { font-size: 13.5px; color: var(--ink); }
.ai-for { font-size: 11.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.ai-maps { font-size: 10.5px; color: var(--cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.ai-flags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex: 0 0 auto; }
.empty-active { font-size: 13.5px; color: var(--ink-2); }
.empty-active a { color: var(--accent); }

/* ---------- essentials ---------- */
.essentials { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.ess { display: flex; gap: 12px; align-items: flex-start; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 12px 14px; transition: transform var(--t1) var(--ease-out-quart), border-color var(--t1) var(--ease); }
.ess:hover { border-color: var(--hairline-2); transform: translateY(-2px); }
.ess-ic { font-size: 20px; flex: 0 0 auto; line-height: 1.2; }
.ess-t { font-family: var(--font-display); font-weight: 600; font-size: 14.5px; color: var(--ink); }
.ess-d { font-size: 12px; color: var(--ink-2); line-height: 1.45; margin-top: 3px; }

.reset-row { margin-top: 30px; }
.reset { background: transparent; border: 1px solid var(--hairline-2); color: var(--ink-3); border-radius: var(--r-sm); padding: 8px 14px; cursor: pointer; font-size: 13px; }
.reset:hover { border-color: var(--red); color: var(--red); }

.btn { border-radius: var(--r-sm); padding: 9px 16px; cursor: pointer; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--hairline-2); color: var(--ink-2); }
.btn.ghost:hover { color: var(--ink); border-color: var(--ink-3); }
.btn.danger { background: var(--red); color: #fff; }
.btn.danger:hover { filter: brightness(1.1); }
</style>
