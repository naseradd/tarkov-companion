<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, fetchTraders, fetchHideout, type Task, type TraderFull, type HideoutStation } from '@/lib/tarkov';
import { nextBottlenecks, kappaProgress, lightkeeperProgress, hoardList, wipePhase, type PlayerState } from '@/lib/progression';
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
const hideout = useResource<HideoutStation[]>('hideout', fetchHideout);

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));
const ready = computed(() => !tasks.loading.value && !traders.loading.value);

const kappa = computed(() => kappaProgress(tasks.data.value ?? [], game.completed));
const lk = computed(() => lightkeeperProgress(tasks.data.value ?? [], game.completed));
const phase = computed(() => wipePhase(game.level, kappa.value.pct));
const bottlenecks = computed(() => nextBottlenecks(tasks.data.value ?? [], traders.data.value ?? [], player.value));
const top = computed(() => bottlenecks.value[0] ?? null);
const rest = computed(() => bottlenecks.value.slice(1));
const hoard = computed(() => hoardList(tasks.data.value ?? [], hideout.data.value ?? [], player.value).slice(0, 12));

const phaseLower = computed(() => phase.value.label.toLowerCase());
const phaseVariant = computed(() => (phase.value.phase === 'early' ? 'good' : phase.value.phase === 'mid' ? 'amber' : 'lk'));
const nextLink = computed(() => (top.value?.type === 'quest' ? '/quetes' : top.value?.type === 'flea' ? '/config' : top.value?.type === 'trader' ? '/config' : '/quetes'));

// position du joueur sur le rail de wipe (0-100)
const wipePct = computed(() => {
  const lvl = game.level;
  if (lvl < 15) return Math.round((lvl / 15) * 33);
  if (lvl < 40) return Math.round(33 + Math.min(1, (lvl - 15) / 25) * 34);
  return Math.round(67 + Math.min(100, kappa.value.pct) / 100 * 33);
});

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

      <RouterLink v-if="top" :to="nextLink" class="next-step">
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
      <!-- Bottlenecks restants -->
      <template v-if="rest.length">
        <Reveal tag="h2" class="section-title">Autres blocages</Reveal>
        <div class="bottlenecks">
          <Reveal v-for="(b, i) in rest" :key="i" :index="i">
            <Card class="bn" tone="surface">
              <div class="bn-top">
                <span class="bn-ic">{{ b.type === 'flea' ? '◳' : b.type === 'trader' ? '⇡' : b.type === 'quest' ? '✓' : '★' }}</span>
                <span class="bn-title">{{ b.title }}</span>
              </div>
              <div class="bn-detail">{{ b.detail }}</div>
              <div v-if="b.progressPct != null" class="bar"><span :style="{ width: Math.min(100, b.progressPct) + '%' }" /></div>
            </Card>
          </Reveal>
        </div>
      </template>

      <!-- Rings + hoard en bento -->
      <div class="bento">
        <Reveal class="cell rings-cell">
          <Card class="rings">
            <span class="kicker">Objectifs de fin de wipe</span>
            <div class="ringrow">
              <div class="ringbox">
                <ProgressRing :value="kappa.pct" :size="108">
                  <div class="ring-pct num">{{ kappa.pct }}%</div>
                  <div class="ring-sub">Kappa</div>
                </ProgressRing>
                <div class="ring-cap num">{{ kappa.done }} / {{ kappa.total }}</div>
              </div>
              <div class="ringbox">
                <ProgressRing :value="lk.pct" :size="108" color="var(--blue)">
                  <div class="ring-pct num">{{ lk.pct }}%</div>
                  <div class="ring-sub">Lightkeeper</div>
                </ProgressRing>
                <div class="ring-cap num">{{ lk.done }} / {{ lk.total }}</div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal class="cell hoard-cell" :index="1">
          <Card class="hoard-card">
            <div class="hoard-head">
              <span class="kicker">À garder — quêtes + hideout</span>
              <RouterLink to="/loot" class="seeall">Tout voir →</RouterLink>
            </div>
            <div class="hoard">
              <div v-for="h in hoard" :key="h.id" class="hoarditem" :style="{ '--reveal-delay': '0ms' }">
                <IconBox :src="h.icon" :size="38" />
                <div class="h-main">
                  <div class="h-name"><b class="num">{{ h.count }}×</b> {{ h.name }}</div>
                  <div class="h-src">{{ h.sources.slice(0, 2).join(' · ') }}<span v-if="h.sources.length > 2"> +{{ h.sources.length - 2 }}</span></div>
                </div>
                <div class="h-flags">
                  <Badge v-if="h.fir" variant="fir">FiR</Badge>
                  <Badge v-if="h.neededForN > 1" variant="info">×{{ h.neededForN }}</Badge>
                </div>
              </div>
              <p v-if="!hoard.length" class="muted">Rien à garder — règle ton niveau et tes quêtes dans Config.</p>
            </div>
          </Card>
        </Reveal>
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
.hero {
  position: relative;
  padding: 8px 0 26px;
  margin-bottom: 8px;
}
.hero-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(30px, 4.4vw, 50px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 8px 0 10px;
  color: var(--ink);
  max-width: 16ch;
}
.hero-title .lvl {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 26px var(--accent-glow);
}
.hero-lead { color: var(--ink-2); font-size: 15.5px; max-width: 60ch; margin: 0 0 22px; }

.next-step {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(100deg, var(--accent-soft), transparent 70%), var(--raised);
  border: 1px solid var(--accent-dim);
  border-radius: var(--r-lg);
  padding: 14px 18px;
  color: var(--ink);
  box-shadow: var(--shadow-sm);
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

/* ---------- bottlenecks ---------- */
.bottlenecks { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 26px; }
.bn-top { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.bn-ic { font-size: 15px; color: var(--ink-3); }
.bn-title { font-family: var(--font-display); font-weight: 600; font-size: 15px; }
.bn-detail { font-size: 13px; color: var(--ink-2); }
.bar { height: 6px; background: var(--canvas); border-radius: var(--r-pill); margin-top: 10px; overflow: hidden; }
.bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-dim), var(--accent)); border-radius: var(--r-pill); transition: width 0.7s var(--ease-out-expo); }

/* ---------- bento ---------- */
.bento { display: grid; grid-template-columns: minmax(280px, 0.9fr) 1.5fr; gap: 14px; align-items: stretch; }
.rings { height: 100%; display: flex; flex-direction: column; }
.ringrow { display: flex; gap: 36px; margin-top: 16px; flex-wrap: wrap; flex: 1; align-items: center; justify-content: center; }
.ringbox { text-align: center; }
.ring-pct { font-family: var(--font-display); font-weight: 700; font-size: 21px; }
.ring-sub { font-size: 10.5px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.5px; }
.ring-cap { font-size: 12px; color: var(--ink-2); margin-top: 8px; }

.hoard-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.seeall { font-size: 13px; }
.hoard { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.hoarditem { display: flex; align-items: center; gap: 11px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 10px; transition: transform var(--t1) var(--ease-out-quart), border-color var(--t1) var(--ease); }
.hoarditem:hover { border-color: var(--hairline-2); transform: translateY(-2px); }
.h-main { flex: 1; min-width: 0; }
.h-name { font-size: 13.5px; }
.h-src { font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-flags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }

.reset-row { margin-top: 28px; }
.reset { background: transparent; border: 1px solid var(--hairline-2); color: var(--ink-3); border-radius: var(--r-sm); padding: 8px 14px; cursor: pointer; font-size: 13px; }
.reset:hover { border-color: var(--red); color: var(--red); }
.muted { color: var(--ink-3); font-size: 13.5px; }

.btn { border-radius: var(--r-sm); padding: 9px 16px; cursor: pointer; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--hairline-2); color: var(--ink-2); }
.btn.ghost:hover { color: var(--ink); border-color: var(--ink-3); }
.btn.danger { background: var(--red); color: #fff; }
.btn.danger:hover { filter: brightness(1.1); }

@media (max-width: 900px) { .bento { grid-template-columns: 1fr; } }
</style>
