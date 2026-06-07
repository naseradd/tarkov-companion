<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore, FLEA_LEVEL } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchLoot, fetchTasks, fetchHideout, fetchCrafts, fetchBarters, type LootItem, type Task, type HideoutStation, type Craft, type BarterTrade } from '@/lib/tarkov';
import { lootVerdict, craftProfit, barterValue, type ReservedBy } from '@/lib/economy';
import { isAvailable, reachableSet, type PlayerState } from '@/lib/progression';
import { num, compact, shortDuration } from '@/lib/format';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import Spinner from '@/components/ui/Spinner.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Chip from '@/components/ui/Chip.vue';
import Stat from '@/components/ui/Stat.vue';
import Badge from '@/components/ui/Badge.vue';
import IconBox from '@/components/ui/IconBox.vue';

const game = useGameStore();
const route = useRoute();
const tab = ref<'loot' | 'crafts' | 'barters'>('loot');
const search = ref((route.query.q as string) || '');
const onlyReserved = ref(false);
watch(() => route.query.q, (q) => { if (q) { search.value = q as string; tab.value = 'loot'; } });

const loot = useResource<LootItem[]>('loot', fetchLoot);
const tasks = useResource<Task[]>('tasks', fetchTasks);
const hideout = useResource<HideoutStation[]>('hideout', fetchHideout);
const crafts = useResource<Craft[]>('crafts', fetchCrafts);
const barters = useResource<BarterTrade[]>('barters', fetchBarters);

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, prestige: game.prestige, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));

/* Réservations actionnables : quêtes FAISABLES maintenant + PROCHAIN niveau hideout.
   (la rétention long-terme de toutes les quêtes du wipe vit sur le Dashboard) */
const reachable = computed(() => reachableSet(tasks.data.value ?? [], player.value));

// Items remis au Collector (Kappa) : à ne jamais vendre par erreur, même si la quête
// est encore verrouillée (elle a 70 prérequis, donc jamais "available" en milieu de wipe).
const collectorItemIds = computed(() => {
  const s = new Set<string>();
  const coll = (tasks.data.value ?? []).find((t) => t.normalizedName === 'collector');
  if (coll) for (const o of coll.objectives) if (o.items) for (const it of o.items) s.add(it.id);
  return s;
});

const questNeed = computed(() => {
  const m = new Map<string, { name: string; count: number }>();
  for (const t of tasks.data.value ?? []) {
    if (!isAvailable(t, player.value, reachable.value)) continue;
    for (const o of t.objectives) if (o.items) for (const it of o.items) if (!m.has(it.id)) m.set(it.id, { name: t.name, count: o.count ?? 1 });
  }
  return m;
});
const hideoutNeed = computed(() => {
  const m = new Map<string, string>();
  for (const s of hideout.data.value ?? []) {
    const next = s.levels.find((l) => l.level === game.hideoutLevel(s.normalizedName) + 1);
    if (!next) continue;
    for (const r of next.itemRequirements) if (!m.has(r.item.id)) m.set(r.item.id, `${s.name} N${next.level}`);
  }
  return m;
});

const lootRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (loot.data.value ?? [])
    .map((it) => {
      const reserved: ReservedBy = {};
      const qn = questNeed.value.get(it.id);
      const hn = hideoutNeed.value.get(it.id);
      if (qn) { reserved.quest = qn.name; reserved.questCount = qn.count; }
      if (hn) reserved.hideout = hn;
      const v = lootVerdict(it, { playerLevel: game.level, fleaMinDefault: FLEA_LEVEL, reserved: qn || hn ? reserved : null });
      return {
        id: it.id, icon: it.iconLink, bg: it.backgroundColor, wiki: it.wikiLink,
        name: it.shortName || it.name, size: `${it.width}×${it.height}`, slots: v.slots,
        traderName: v.traderBest?.name ?? '—', traderPrice: v.traderBest?.price ?? 0,
        flea: v.fleaNet, perSlot: v.perSlot, channel: v.channel, reason: v.reason,
        delta: v.delta48, reserved: !!(qn || hn), collector: collectorItemIds.value.has(it.id),
      };
    })
    .filter((r) => {
      if (onlyReserved.value && !r.reserved && !r.collector) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return r.perSlot > 0 || r.reserved || r.collector;
    });
});

const craftRows = computed(() =>
  (crafts.data.value ?? [])
    .map((c) => craftProfit(c))
    .filter((c) => c.perHour !== 0)
    .map((c) => ({ ...c, locked: game.hideoutLevel(c.stationNorm) < c.level })),
);
const barterRows = computed(() => (barters.data.value ?? []).map(barterValue).filter((b) => b.value > 0));

const channelMeta: Record<string, { variant: any; label: string }> = {
  keep: { variant: 'amber', label: 'GARDER' },
  flea: { variant: 'accent', label: 'FLEA' },
  trader: { variant: 'info', label: 'MARCHAND' },
  fence: { variant: 'blue', label: 'FENCE' },
};

const lootCols: Column[] = [
  { key: 'name', label: 'Objet', sortable: false },
  { key: 'size', label: 'Taille', sortValue: (r) => r.slots },
  { key: 'traderPrice', label: 'Marchand', align: 'right' },
  { key: 'flea', label: 'Flea net', align: 'right' },
  { key: 'perSlot', label: '₽ / slot', align: 'right' },
  { key: 'delta', label: '48h', align: 'right', sortValue: (r) => r.delta ?? 0 },
  { key: 'channel', label: 'Verdict', align: 'center', sortValue: (r) => (r.channel === 'keep' ? 3 : r.channel === 'flea' ? 2 : 1) },
];
const craftCols: Column[] = [
  { key: 'reward', label: 'Craft', sortable: false },
  { key: 'station', label: 'Station', sortable: false },
  { key: 'durationSec', label: 'Durée', align: 'right' },
  { key: 'inputCost', label: 'Coût', align: 'right' },
  { key: 'profit', label: 'Profit', align: 'right' },
  { key: 'perHour', label: '₽ / h', align: 'right' },
];
const barterCols: Column[] = [
  { key: 'reward', label: 'Reçu', sortable: false },
  { key: 'trader', label: 'Marchand', sortable: false },
  { key: 'cost', label: 'Coût items', align: 'right' },
  { key: 'value', label: 'Valeur', align: 'right' },
  { key: 'savings', label: 'Économie', align: 'right' },
];

const tabOpts = [
  { value: 'loot', label: 'Garder / Vendre' },
  { value: 'crafts', label: 'Crafts ₽/h' },
  { value: 'barters', label: 'Barters' },
];
</script>

<template>
  <section class="view">
    <span class="kicker">Loot & économie</span>
    <h1 class="page-title">Garder, vendre, ou crafter</h1>
    <p class="lead">
      Verdict par objet net de taxe flea, avec réserve automatique de ce qui sert à tes quêtes et à ton hideout.
      Profit des crafts à l'heure et meilleures économies par barter.
    </p>

    <div class="bar">
      <SegmentedControl v-model="tab" :options="tabOpts" />
      <input v-if="tab === 'loot'" v-model="search" class="search-field" placeholder="Rechercher un objet…" />
      <Chip v-if="tab === 'loot'" :active="onlyReserved" @click="onlyReserved = !onlyReserved">À garder seulement</Chip>
      <div class="spacer" />
      <Stat v-if="tab === 'loot'" :value="lootRows.length">objets</Stat>
    </div>

    <!-- LOOT -->
    <div v-if="tab === 'loot'">
      <Spinner v-if="loot.loading.value" block label="Chargement du loot…" />
      <p v-else-if="loot.error.value" class="err">Erreur : {{ loot.error.value }}</p>
      <DataTable v-else :columns="lootCols" :rows="lootRows" initial-key="perSlot" :initial-dir="-1">
        <template #cell-name="{ row }">
          <div class="namecell">
            <IconBox :src="row.icon" :bg="row.bg" :size="32" />
            <a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.name }}</a><span v-else>{{ row.name }}</span>
            <Badge v-if="row.collector" variant="kappa" title="Remis au Collector (Kappa) — garder en FiR">Collector</Badge>
          </div>
        </template>
        <template #cell-traderPrice="{ row }">
          <span v-if="row.traderPrice"><span class="vsub">{{ row.traderName }}</span> {{ num(row.traderPrice) }}</span><span v-else class="dim">—</span>
        </template>
        <template #cell-flea="{ row }">{{ row.flea ? num(row.flea) : '🔒' }}</template>
        <template #cell-perSlot="{ row }"><b class="acc">{{ num(row.perSlot) }}</b></template>
        <template #cell-delta="{ row }">
          <span v-if="row.delta != null" :class="row.delta >= 0 ? 'up' : 'down'">{{ row.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(row.delta).toFixed(1) }}%</span>
          <span v-else class="dim">—</span>
        </template>
        <template #cell-channel="{ row }">
          <Badge :variant="channelMeta[row.channel].variant" :title="row.reason">{{ channelMeta[row.channel].label }}</Badge>
        </template>
      </DataTable>
    </div>

    <!-- CRAFTS -->
    <div v-else-if="tab === 'crafts'">
      <Spinner v-if="crafts.loading.value" block label="Chargement des crafts…" />
      <p v-else-if="crafts.error.value" class="err">Erreur : {{ crafts.error.value }}</p>
      <DataTable v-else :columns="craftCols" :rows="craftRows" initial-key="perHour" :initial-dir="-1">
        <template #cell-reward="{ row }">
          <div class="namecell"><span :class="{ lock: row.locked }">{{ row.reward }}</span><Badge v-if="row.taskLocked" variant="info" :title="row.taskLocked">quête</Badge></div>
        </template>
        <template #cell-station="{ row }"><span class="vsub">{{ row.station }} N{{ row.level }}</span> <Badge v-if="row.locked" variant="danger">non construit</Badge></template>
        <template #cell-durationSec="{ row }">{{ shortDuration(row.durationSec) }}</template>
        <template #cell-inputCost="{ row }">{{ compact(row.inputCost) }}</template>
        <template #cell-profit="{ row }"><b :class="row.profit >= 0 ? 'up' : 'down'">{{ compact(row.profit) }}</b></template>
        <template #cell-perHour="{ row }"><b class="acc">{{ compact(row.perHour) }}</b></template>
      </DataTable>
    </div>

    <!-- BARTERS -->
    <div v-else>
      <Spinner v-if="barters.loading.value" block label="Chargement des barters…" />
      <p v-else-if="barters.error.value" class="err">Erreur : {{ barters.error.value }}</p>
      <DataTable :columns="barterCols" :rows="barterRows" initial-key="savings" :initial-dir="-1">
        <template #cell-reward="{ row }"><span>{{ row.reward }}</span></template>
        <template #cell-trader="{ row }"><span class="vsub">{{ row.trader }} LL{{ row.level }}</span><Badge v-if="row.taskLocked" variant="info">quête</Badge></template>
        <template #cell-cost="{ row }">{{ compact(row.cost) }}</template>
        <template #cell-value="{ row }">{{ compact(row.value) }}</template>
        <template #cell-savings="{ row }"><b :class="row.savings >= 0 ? 'up' : 'down'">{{ compact(row.savings) }}</b></template>
      </DataTable>
    </div>
  </section>
</template>

<style scoped>
.bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
.search-field { min-width: 200px; background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm); color: var(--ink); padding: 8px 13px; font-size: 14px; }
.search-field:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-soft); }
.spacer { flex: 1; }
.namecell { display: flex; align-items: center; gap: 10px; }
.namecell a, .namecell span { font-size: 13.5px; }
.vsub { color: var(--ink-3); font-size: 11px; }
.acc { color: var(--accent); }
.up { color: var(--positive); }
.down { color: var(--red); }
.dim { color: var(--ink-3); }
.lock { color: var(--ink-3); }
.err { color: var(--red); font-family: var(--font-mono); }
</style>
