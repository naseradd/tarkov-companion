<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchHideout, fetchTasks, fetchTraders, type HideoutStation, type Task, type TraderFull } from '@/lib/tarkov';
import { isAvailable, reachableSet, type PlayerState } from '@/lib/progression';
import { btcRoi, GPU_TIERS } from '@/lib/btc';
import { buildTime, num, compact } from '@/lib/format';
import Card from '@/components/ui/Card.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Badge from '@/components/ui/Badge.vue';
import Stat from '@/components/ui/Stat.vue';
import IconBox from '@/components/ui/IconBox.vue';
import Reveal from '@/components/ui/Reveal.vue';

const game = useGameStore();
const { data: stations, loading, error } = useResource<HideoutStation[]>('hideout', fetchHideout);
const { data: tasks } = useResource<Task[]>('tasks', fetchTasks);
const { data: traders } = useResource<TraderFull[]>('traders', fetchTraders);
const expanded = ref<Set<string>>(new Set());
function toggle(id: string) { expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id); expanded.value = new Set(expanded.value); }

const ordered = computed(() => {
  const list = [...(stations.value ?? [])];
  return list.sort((a, b) => {
    const pa = /stash/i.test(a.normalizedName) ? 0 : 1;
    const pb = /stash/i.test(b.normalizedName) ? 0 : 1;
    return pa - pb || a.name.localeCompare(b.name);
  });
});

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, prestige: game.prestige, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));
// items requis par quêtes FAISABLES maintenant (flag "aussi quête" actionnable)
const reachable = computed(() => reachableSet(tasks.value ?? [], player.value));
const questItemIds = computed(() => {
  const s = new Set<string>();
  for (const t of tasks.value ?? []) {
    if (!isAvailable(t, player.value, reachable.value)) continue;
    for (const o of t.objectives) if (o.items) for (const it of o.items) s.add(it.id);
  }
  return s;
});

// shopping list : prochain niveau non construit de chaque station
const shoppingList = computed(() => {
  const m = new Map<string, { id: string; name: string; icon: string | null; count: number; price: number; quest: boolean; from: string[] }>();
  for (const s of stations.value ?? []) {
    const built = game.hideoutLevel(s.normalizedName);
    const next = s.levels.find((l) => l.level === built + 1);
    if (!next) continue;
    for (const r of next.itemRequirements) {
      const e = m.get(r.item.id);
      const label = `${s.name} N${next.level}`;
      if (e) { e.count += r.count; if (!e.from.includes(label)) e.from.push(label); }
      else m.set(r.item.id, { id: r.item.id, name: r.item.shortName || r.item.name, icon: r.item.iconLink, count: r.count, price: r.item.avg24hPrice ?? 0, quest: questItemIds.value.has(r.item.id), from: [label] });
    }
  }
  return [...m.values()].sort((a, b) => b.price * b.count - a.price * a.count);
});
const shoppingTotal = computed(() => shoppingList.value.reduce((acc, e) => acc + e.price * e.count, 0));

// Ordre de construction : prochain niveau non construit de chaque station, classé
// par constructibilité (prérequis station + LL marchand satisfaits) puis valeur.
interface BuildStep { station: string; norm: string; icon: string | null; level: number; buildable: boolean; blockers: string[]; cost: number; }
const buildOrder = computed<BuildStep[]>(() => {
  const sts = stations.value ?? [];
  const nameToNorm = new Map(sts.map((s) => [s.name, s.normalizedName]));
  const traderNorm = new Map((traders.value ?? []).map((t) => [t.name, t.normalizedName]));
  const steps: BuildStep[] = [];
  for (const s of sts) {
    const cur = game.hideoutLevel(s.normalizedName);
    const next = s.levels.find((l) => l.level === cur + 1);
    if (!next) continue;
    const blockers: string[] = [];
    for (const sr of next.stationLevelRequirements ?? []) {
      const norm = nameToNorm.get(sr.station.name);
      if (!norm || game.hideoutLevel(norm) < sr.level) blockers.push(`${sr.station.name} N${sr.level}`);
    }
    for (const tr of next.traderRequirements ?? []) {
      const norm = traderNorm.get(tr.trader.name);
      if (!norm || game.traderLL(norm) < tr.level) blockers.push(`${tr.trader.name} LL${tr.level}`);
    }
    const cost = next.itemRequirements.reduce((a, r) => a + (r.item.avg24hPrice ?? 0) * r.count, 0);
    steps.push({ station: s.name, norm: s.normalizedName, icon: s.imageLink, level: next.level, buildable: blockers.length === 0, blockers, cost });
  }
  return steps.sort((a, b) => Number(b.buildable) - Number(a.buildable) || a.blockers.length - b.blockers.length || b.cost - a.cost);
});

// BTC ROI
const gpuPrice = ref(190000);
const btcPrice = ref(175000);
const fuelPerDay = ref(15000);
const roiRows = computed(() => GPU_TIERS.map((g) => btcRoi({ gpus: g, gpuPrice: gpuPrice.value, bitcoinPrice: btcPrice.value, fuelPerDay: fuelPerDay.value })));

const guides = [
  { h: 'Priorités début de wipe', p: 'Stash N2 → Espace sanitaire → Poste médical & Coin nutrition (santé maison) → Établi (munitions) → Centre de renseignement (réduit le temps des quêtes, débloque des trocs). La ferme Bitcoin attend : c\'est un puits à roubles au départ.' },
  { h: 'Le Stash d\'abord', p: 'L\'inventaire est ton vrai goulot. Monter le Stash tôt évite de jeter du butin. Finance-le en vendant aux marchands le loot à faible ₽/slot et en gardant le reste pour le flea.' },
  { h: 'Crafts = revenu passif', p: 'Une fois les stations montées, lance un craft long (propane, munitions, militech, moonshine) avant de fermer le jeu. Le module Loot classe les crafts par ₽/h.' },
];
</script>

<template>
  <section class="view">
    <span class="kicker">Hideout & économie</span>
    <h1 class="page-title">Construis ton moteur à roubles</h1>
    <p class="lead">Par où commencer, la liste d'achat de ton prochain build, le ROI de la ferme Bitcoin, et les prérequis exacts (données live).</p>

    <div class="guides">
      <Reveal v-for="(g, i) in guides" :key="g.h" :index="i">
        <Card style="height: 100%">
          <h3 class="g-h">{{ g.h }}</h3>
          <p class="g-p">{{ g.p }}</p>
        </Card>
      </Reveal>
    </div>

    <Reveal class="two">
      <Card>
        <div class="card-head">
          <span class="kicker">Liste d'achat — prochain build de chaque station</span>
          <Stat tone="accent" :value="compact(shoppingTotal)">₽ total</Stat>
        </div>
        <Spinner v-if="loading" label="Chargement…" />
        <div v-else class="shop">
          <div v-for="e in shoppingList.slice(0, 14)" :key="e.id" class="shoprow">
            <IconBox :src="e.icon" :size="30" />
            <div class="shopmain">
              <div class="shopname"><b class="num">{{ e.count }}×</b> {{ e.name }} <Badge v-if="e.quest" variant="kappa">aussi quête</Badge></div>
              <div class="shopfrom">{{ e.from.join(' · ') }}</div>
            </div>
            <span class="shopprice num">{{ compact(e.price * e.count) }} ₽</span>
          </div>
          <p v-if="!shoppingList.length" class="muted">Tout est construit, ou aucune station à monter.</p>
        </div>
      </Card>

      <Card>
        <span class="kicker">ROI ferme à Bitcoins</span>
        <div class="roi-inputs">
          <label>Prix GPU <input v-model.number="gpuPrice" type="number" class="ipt num" /></label>
          <label>Prix Bitcoin <input v-model.number="btcPrice" type="number" class="ipt num" /></label>
          <label>Carburant/j <input v-model.number="fuelPerDay" type="number" class="ipt num" /></label>
        </div>
        <table class="roi">
          <thead><tr><th>GPU</th><th class="r">BTC/j</th><th class="r">Net/j</th><th class="r">Rentable en</th></tr></thead>
          <tbody>
            <tr v-for="r in roiRows" :key="r.gpus">
              <td class="num">{{ r.gpus }}</td>
              <td class="r num">{{ r.btcPerDay.toFixed(2) }}</td>
              <td class="r num" :class="r.netPerDay >= 0 ? 'up' : 'down'">{{ compact(Math.round(r.netPerDay)) }}</td>
              <td class="r num">{{ isFinite(r.breakEvenDays) ? Math.ceil(r.breakEvenDays) + ' j' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </Reveal>

    <h2 class="section-title" style="margin-top: 28px">Ordre de construction</h2>
    <p class="sub-lead">Prochain palier de chaque station, classé par ce que tu peux bâtir maintenant. Les bloqués affichent leurs prérequis.</p>
    <Spinner v-if="loading" label="Chargement…" />
    <Reveal v-else tag="div" class="bo-grid">
      <div v-for="b in buildOrder" :key="b.norm" class="bo" :class="{ ready: b.buildable }">
        <img v-if="b.icon" :src="b.icon" class="bo-img" :alt="b.station" />
        <div class="bo-main">
          <div class="bo-name">{{ b.station }} <span class="num bo-lv">→ N{{ b.level }}</span></div>
          <div v-if="b.buildable" class="bo-status ok">Constructible maintenant · {{ compact(b.cost) }} ₽</div>
          <div v-else class="bo-status">Bloqué : {{ b.blockers.join(' · ') }}</div>
        </div>
        <button
          v-if="b.buildable"
          class="bo-build"
          @click="game.setHideoutLevel(b.norm, b.level)"
          title="Marquer ce palier comme construit"
        >＋</button>
      </div>
      <p v-if="!buildOrder.length" class="muted">Tout est construit. ✓</p>
    </Reveal>

    <h2 class="section-title" style="margin-top: 28px">Stations & prérequis</h2>
    <Spinner v-if="loading" block label="Chargement du hideout…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <Reveal v-else tag="div" class="stations">
      <Card
        v-for="s in ordered"
        :key="s.id"
        :pad="false"
        class="st"
        :class="{ prio: /stash/i.test(s.normalizedName) }"
      >
        <header class="st-head">
          <img v-if="s.imageLink" :src="s.imageLink" class="st-img" :alt="s.name" />
          <div class="st-main" @click="toggle(s.id)">
            <div class="st-name">{{ s.name }}<Badge v-if="/stash/i.test(s.normalizedName)" variant="kappa" style="margin-left: 8px">priorité</Badge></div>
            <div class="st-sub num">Niveau {{ game.hideoutLevel(s.normalizedName) }} / {{ s.levels.length }}</div>
          </div>
          <div class="lvl-ctl">
            <button class="step" @click="game.setHideoutLevel(s.normalizedName, game.hideoutLevel(s.normalizedName) - 1)" :disabled="game.hideoutLevel(s.normalizedName) <= 0">–</button>
            <span class="lvl-n num">{{ game.hideoutLevel(s.normalizedName) }}</span>
            <button class="step" @click="game.setHideoutLevel(s.normalizedName, Math.min(s.levels.length, game.hideoutLevel(s.normalizedName) + 1))" :disabled="game.hideoutLevel(s.normalizedName) >= s.levels.length">+</button>
          </div>
          <button class="caret" @click="toggle(s.id)">{{ expanded.has(s.id) ? '−' : '+' }}</button>
        </header>

        <div v-if="expanded.has(s.id)" class="levels">
          <div v-for="lv in s.levels" :key="lv.level" class="lv" :class="{ built: lv.level <= game.hideoutLevel(s.normalizedName) }">
            <div class="lv-head">
              <span class="lv-no">Niv. {{ lv.level }}</span>
              <Badge v-if="lv.level <= game.hideoutLevel(s.normalizedName)" variant="good">construit</Badge>
              <span class="lv-time num">{{ buildTime(lv.constructionTime) }}</span>
            </div>
            <div v-if="lv.itemRequirements.length" class="items">
              <div v-for="(it, i) in lv.itemRequirements" :key="i" class="it">
                <IconBox :src="it.item.iconLink" :size="28" />
                <div><b class="num">{{ it.count }}×</b> {{ it.item.shortName || it.item.name }}</div>
              </div>
            </div>
            <div class="lv-req">
              <Badge v-for="(sr, i) in lv.stationLevelRequirements ?? []" :key="'s' + i" variant="info">{{ sr.station.name }} N{{ sr.level }}</Badge>
              <Badge v-for="(tr, i) in lv.traderRequirements ?? []" :key="'t' + i" variant="lk">{{ tr.trader.name }} LL{{ tr.level }}</Badge>
            </div>
          </div>
        </div>
      </Card>
    </Reveal>
  </section>
</template>

<style scoped>
.guides { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.g-h { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--accent); margin: 0 0 6px; }
.g-p { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); margin: 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.shop { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.shoprow { display: flex; align-items: center; gap: 10px; }
.shopmain { flex: 1; min-width: 0; }
.shopname { font-size: 13.5px; }
.shopfrom { font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shopprice { color: var(--amber); font-size: 12.5px; white-space: nowrap; }

.roi-inputs { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
.roi-inputs label { font-size: 11px; color: var(--ink-3); display: flex; flex-direction: column; gap: 4px; }
.ipt { width: 92px; background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm); color: var(--ink); padding: 6px 9px; font-size: 13px; }
.ipt:focus { outline: none; border-color: var(--accent-dim); }
.roi { width: 100%; border-collapse: collapse; font-size: 13px; }
.roi th { text-align: left; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--ink-3); padding: 6px 8px; border-bottom: 1px solid var(--hairline); }
.roi td { padding: 7px 8px; border-bottom: 1px solid var(--hairline); }
.roi .r { text-align: right; }
.up { color: var(--positive); }
.down { color: var(--red); }

.stations { display: flex; flex-direction: column; gap: 9px; }
.st.prio { border-color: var(--accent-dim); }
.st-head { display: flex; align-items: center; gap: 12px; padding: 12px 15px; }
.st-img { width: 40px; height: 40px; object-fit: contain; background: var(--slot-base); border: 1px solid var(--hairline-2); border-radius: var(--r-xs); padding: 3px; flex: 0 0 auto; }
.st-main { flex: 1; min-width: 0; cursor: pointer; }
.st-name { font-family: var(--font-display); font-weight: 600; font-size: 16px; }
.st-sub { font-size: 12px; color: var(--ink-3); }
.lvl-ctl { display: inline-flex; align-items: center; background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--r-pill); padding: 2px; }
.step { width: 24px; height: 24px; border: none; background: transparent; color: var(--ink-2); cursor: pointer; border-radius: var(--r-pill); font-size: 15px; transition: all var(--t1) var(--ease); }
.step:hover:not(:disabled) { background: var(--surface-2); color: var(--accent); }
.step:disabled { opacity: 0.3; cursor: default; }
.lvl-n { width: 24px; text-align: center; font-weight: 600; }
.caret { background: transparent; border: none; color: var(--ink-3); cursor: pointer; font-size: 16px; padding: 4px 6px; }
.levels { border-top: 1px solid var(--hairline); padding: 10px 15px 15px; display: flex; flex-direction: column; gap: 12px; }
.lv { border-left: 2px solid var(--hairline-2); padding-left: 13px; }
.lv.built { border-left-color: var(--positive); opacity: 0.7; }
.lv-head { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
.lv-no { font-family: var(--font-display); font-weight: 700; color: var(--accent); }
.lv-time { font-size: 11px; color: var(--ink-3); margin-left: auto; }
.items { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 7px; }
.it { display: flex; align-items: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 5px 9px 5px 5px; font-size: 12.5px; }
.lv-req { display: flex; flex-wrap: wrap; gap: 5px; }
.muted { color: var(--ink-3); font-size: 13px; }
.err { color: var(--red); font-family: var(--font-mono); }

.sub-lead { font-size: 13px; color: var(--ink-3); margin: -4px 0 14px; max-width: 70ch; }
.bo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 9px; }
.bo { display: flex; align-items: center; gap: 11px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 9px 12px; transition: border-color var(--t1) var(--ease); }
.bo.ready { border-color: var(--accent-dim); background: linear-gradient(100deg, var(--accent-soft), transparent 70%), var(--surface-2); }
.bo-img { width: 34px; height: 34px; border-radius: var(--r-xs); object-fit: contain; background: var(--slot-base); border: 1px solid var(--hairline-2); flex: 0 0 auto; }
.bo-main { flex: 1; min-width: 0; }
.bo-name { font-size: 13.5px; color: var(--ink); font-weight: 500; }
.bo-lv { color: var(--ink-3); font-weight: 400; }
.bo-status { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bo-status.ok { color: var(--accent); }
.bo-build { flex: 0 0 auto; width: 28px; height: 28px; border-radius: var(--r-sm); border: 1px solid var(--accent-dim); background: var(--accent-soft); color: var(--accent); cursor: pointer; font-size: 16px; line-height: 1; transition: all var(--t1) var(--ease); }
.bo-build:hover { background: var(--accent); color: var(--ink-on-accent); }

@media (max-width: 860px) { .two { grid-template-columns: 1fr; } }
</style>
