<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTasks, fetchTraders, fetchHideout, type Task, type TraderFull, type HideoutStation } from '@/lib/tarkov';
import { nextBottlenecks, kappaProgress, lightkeeperProgress, hoardList, wipePhase, type PlayerState } from '@/lib/progression';
import { fromNow } from '@/lib/format';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import ProgressRing from '@/components/ui/ProgressRing.vue';
import IconBox from '@/components/ui/IconBox.vue';
import Modal from '@/components/ui/Modal.vue';
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
const hoard = computed(() => hoardList(tasks.data.value ?? [], hideout.data.value ?? [], player.value).slice(0, 12));

const phaseVariant = computed(() => (phase.value.phase === 'early' ? 'good' : phase.value.phase === 'mid' ? 'amber' : 'lk'));

/* Scav cooldown */
const now = ref(Date.now());
let timer: number | undefined;
onMounted(() => { timer = window.setInterval(() => (now.value = Date.now()), 20000); });
onBeforeUnmount(() => clearInterval(timer));

function baseCooldownMin(karma: number): number {
  if (karma >= 6) return 5;
  if (karma >= 3) return 10;
  if (karma >= 0) return 20;
  return 60;
}
const scavCooldown = computed(() => {
  const k = game.scav.karma;
  const intelCut = game.scav.intelLevel >= 3 ? 0.8 : game.scav.intelLevel >= 1 ? 0.85 : 1;
  return Math.round(baseCooldownMin(k) * intelCut);
});
const scavStatus = computed(() => {
  if (!game.scav.lastTs) return { ready: true, text: 'Prêt — aucun run enregistré' };
  const elapsed = (now.value - game.scav.lastTs) / 60000;
  const remaining = scavCooldown.value - elapsed;
  if (remaining <= 0) return { ready: true, text: `Prêt (parti ${fromNow(game.scav.lastTs, now.value)})` };
  return { ready: false, text: `Prêt dans ~${Math.ceil(remaining)} min` };
});

const confirmReset = ref(false);
function doReset() { game.resetProgress(); confirmReset.value = false; }
</script>

<template>
  <section class="view">
    <div class="hero">
      <div>
        <span class="kicker">Wipe dashboard</span>
        <h1 class="page-title">Salut. Voici ta prochaine étape.</h1>
        <p class="lead" style="margin-bottom: 0">Ton état perso (niveau, marchands, hideout) personnalise tout : quêtes faisables, gating flea, listes d'achat.</p>
      </div>
      <Card class="lvlcard" glow>
        <div class="lvl-big num">{{ game.level }}</div>
        <div class="lvl-lbl">niveau PMC · {{ game.faction }}</div>
        <Badge :variant="phaseVariant as any" style="margin-top: 8px">{{ phase.label }}</Badge>
      </Card>
    </div>

    <p class="advice">{{ phase.advice }}</p>

    <Spinner v-if="!ready" block label="Calcul de ta progression…" />

    <template v-else>
      <!-- Bottlenecks -->
      <h2 class="section-title">Tes prochains blocages</h2>
      <div class="bottlenecks">
        <Card v-for="(b, i) in bottlenecks" :key="i" class="bn">
          <div class="bn-top">
            <span class="bn-ic">{{ b.type === 'flea' ? '🔓' : b.type === 'trader' ? '⇧' : b.type === 'quest' ? '✓' : '★' }}</span>
            <span class="bn-title">{{ b.title }}</span>
          </div>
          <div class="bn-detail">{{ b.detail }}</div>
          <div v-if="b.progressPct != null" class="bar"><span :style="{ width: Math.min(100, b.progressPct) + '%' }" /></div>
        </Card>
      </div>

      <div class="cols">
        <!-- Progress rings -->
        <Card class="rings">
          <span class="kicker">Objectifs de fin de wipe</span>
          <div class="ringrow">
            <div class="ringbox">
              <ProgressRing :value="kappa.pct" :size="104">
                <div class="ring-pct num">{{ kappa.pct }}%</div>
                <div class="ring-sub">Kappa</div>
              </ProgressRing>
              <div class="ring-cap num">{{ kappa.done }} / {{ kappa.total }}</div>
            </div>
            <div class="ringbox">
              <ProgressRing :value="lk.pct" :size="104" color="var(--blue)">
                <div class="ring-pct num">{{ lk.pct }}%</div>
                <div class="ring-sub">Lightkeeper</div>
              </ProgressRing>
              <div class="ring-cap num">{{ lk.done }} / {{ lk.total }}</div>
            </div>
          </div>
        </Card>

        <!-- Scav -->
        <Card class="scav">
          <span class="kicker">Scav & karma</span>
          <div class="scav-status" :class="{ ok: scavStatus.ready }">{{ scavStatus.text }}</div>
          <button class="scav-btn" @click="game.stampScavRun()">Je pars en Scav maintenant</button>
          <div class="scav-inputs">
            <label>Karma <input v-model.number="game.scav.karma" type="number" step="0.1" class="sip num" @change="game.setScav({ karma: game.scav.karma })" /></label>
            <label>Intel N <input v-model.number="game.scav.intelLevel" type="number" min="0" max="3" class="sip num" @change="game.setScav({ intelLevel: game.scav.intelLevel })" /></label>
            <span class="cd num">cooldown ~{{ scavCooldown }} min</span>
          </div>
          <p class="scav-tip">Ne tire jamais sur les Scavs (−karma). Extraction voiture/co-op = +0.25. Karma 6.0 → cooldown ~5 min + spawns keycard.</p>
        </Card>
      </div>

      <!-- Hoard list -->
      <div class="hoard-head">
        <h2 class="section-title" style="margin: 0">À garder (quêtes + hideout)</h2>
        <RouterLink to="/loot" class="seeall">Tout voir →</RouterLink>
      </div>
      <div class="hoard">
        <div v-for="h in hoard" :key="h.id" class="hoarditem">
          <IconBox :src="h.icon" :size="40" />
          <div class="h-main">
            <div class="h-name"><b class="num">{{ h.count }}×</b> {{ h.name }}</div>
            <div class="h-src">{{ h.sources.slice(0, 2).join(' · ') }}<span v-if="h.sources.length > 2"> +{{ h.sources.length - 2 }}</span></div>
          </div>
          <div class="h-flags">
            <Badge v-if="h.fir" variant="fir">FiR</Badge>
            <Badge v-if="h.neededForN > 1" variant="info">×{{ h.neededForN }}</Badge>
          </div>
        </div>
      </div>
      <p v-if="!hoard.length" class="muted">Rien à garder pour l'instant — coche ton niveau et tes quêtes pour personnaliser.</p>

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
.hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.lvlcard { text-align: center; padding: 16px 24px; flex: 0 0 auto; min-width: 150px; }
.lvl-big { font-family: var(--font-display); font-weight: 800; font-size: 48px; line-height: 1; color: var(--accent); }
.lvl-lbl { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
.advice { color: var(--ink-2); font-size: 14.5px; margin: 4px 0 24px; max-width: 760px; }

.bottlenecks { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
.bn-top { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.bn-ic { font-size: 16px; }
.bn-title { font-family: var(--font-display); font-weight: 600; font-size: 15px; }
.bn-detail { font-size: 13px; color: var(--ink-2); }
.bar { height: 6px; background: var(--canvas); border-radius: var(--r-pill); margin-top: 10px; overflow: hidden; }
.bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-dim), var(--accent)); border-radius: var(--r-pill); transition: width var(--t3) var(--ease); }

.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
.ringrow { display: flex; gap: 28px; justify-content: center; margin-top: 14px; }
.ringbox { text-align: center; }
.ring-pct { font-family: var(--font-display); font-weight: 700; font-size: 20px; }
.ring-sub { font-size: 10.5px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.5px; }
.ring-cap { font-size: 12px; color: var(--ink-2); margin-top: 8px; }

.scav-status { font-size: 16px; font-weight: 600; margin: 12px 0 10px; color: var(--amber); }
.scav-status.ok { color: var(--positive); }
.scav-btn { width: 100%; background: var(--accent-soft); border: 1px solid var(--accent-dim); color: var(--accent); border-radius: var(--r-sm); padding: 9px; cursor: pointer; font-size: 13.5px; font-weight: 600; transition: all var(--t1) var(--ease); }
.scav-btn:hover { background: var(--accent); color: var(--ink-on-accent); }
.scav-inputs { display: flex; align-items: center; gap: 12px; margin: 12px 0 8px; }
.scav-inputs label { font-size: 11px; color: var(--ink-3); display: flex; flex-direction: column; gap: 3px; }
.sip { width: 64px; background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm); color: var(--ink); padding: 5px 8px; font-size: 13px; }
.cd { margin-left: auto; font-size: 11.5px; color: var(--ink-3); align-self: flex-end; }
.scav-tip { font-size: 12px; color: var(--ink-3); line-height: 1.5; margin: 6px 0 0; }

.hoard-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.seeall { font-size: 13px; }
.hoard { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.hoarditem { display: flex; align-items: center; gap: 11px; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 10px; transition: all var(--t1) var(--ease); }
.hoarditem:hover { border-color: var(--hairline-2); transform: translateY(-1px); }
.h-main { flex: 1; min-width: 0; }
.h-name { font-size: 13.5px; }
.h-src { font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-flags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }

.reset-row { margin-top: 28px; }
.reset { background: transparent; border: 1px solid var(--hairline-2); color: var(--ink-3); border-radius: var(--r-sm); padding: 8px 14px; cursor: pointer; font-size: 13px; transition: all var(--t1) var(--ease); }
.reset:hover { border-color: var(--red); color: var(--red); }
.muted { color: var(--ink-3); font-size: 13.5px; }

.btn { border-radius: var(--r-sm); padding: 9px 16px; cursor: pointer; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--hairline-2); color: var(--ink-2); }
.btn.ghost:hover { color: var(--ink); border-color: var(--ink-3); }
.btn.danger { background: var(--red); color: #fff; }
.btn.danger:hover { filter: brightness(1.1); }

@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } .hero { flex-direction: column; } }
</style>
