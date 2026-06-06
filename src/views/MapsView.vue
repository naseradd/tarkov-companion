<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchMaps, fetchTasks, type TarkovMap, type Task } from '@/lib/tarkov';
import { getMapData, providers, type ProviderId } from '@/lib/maps';
import { distance } from '@/lib/format';
import { isAvailable, type PlayerState } from '@/lib/progression';
import TacticalMap, { type LayerState } from '@/components/TacticalMap.vue';
import RoutePanel, { type ExtractFull, type SpawnPt } from '@/components/RoutePanel.vue';
import MapLegend from '@/components/MapLegend.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Card from '@/components/ui/Card.vue';
import Chip from '@/components/ui/Chip.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Stat from '@/components/ui/Stat.vue';
import Badge from '@/components/ui/Badge.vue';
import IconBox from '@/components/ui/IconBox.vue';

const game = useGameStore();
const route = useRoute();
const { data: maps, loading, error } = useResource<TarkovMap[]>('maps', fetchMaps);
const { data: tasks } = useResource<Task[]>('tasks', fetchTasks);

const selected = ref<string | null>(null);
const layers = ref<LayerState>({ spawns: true, extracts: true, quests: true, transits: false });
const provider = ref<ProviderId>((localStorage.getItem('eft.mapProvider') as ProviderId) || 'svg');
watch(provider, (v) => localStorage.setItem('eft.mapProvider', v));

/** Nettoie les zoneName en UUID/hash → libellé lisible. */
function cleanSpawn(zoneName: string | null, i: number): string {
  const z = (zoneName ?? '').trim();
  if (!z || /^[{(]?[0-9a-f]{8}-/i.test(z) || /^[0-9a-f]{16,}$/i.test(z) || /^[0-9a-f-]{20,}$/i.test(z)) return `Spawn ${i + 1}`;
  const pretty = z.replace(/^Zone[_ ]?/i, '').replace(/[_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return pretty || `Spawn ${i + 1}`;
}

const mapList = computed(() => {
  const seen = new Set<string>();
  const out: TarkovMap[] = [];
  for (const m of maps.value ?? []) {
    if (seen.has(m.normalizedName)) continue;
    seen.add(m.normalizedName);
    out.push(m);
  }
  return out;
});

watch(
  [mapList, () => route.query.map],
  ([list, q]) => {
    if (q && list.some((m) => m.normalizedName === q)) { selected.value = q as string; return; }
    if (!selected.value && list.length) selected.value = list.find((m) => m.normalizedName === 'customs')?.normalizedName ?? list[0].normalizedName;
  },
  { immediate: true },
);

const current = computed(() => mapList.value.find((m) => m.normalizedName === selected.value) ?? null);
const data = computed(() => (current.value ? getMapData(current.value.normalizedName) : null));
const hasData = computed(() => !!data.value);
const availProviders = computed(() => (data.value ? providers(data.value) : []));
const providerOpts = computed(() => availProviders.value.map((p) => ({ value: p.id, label: p.label })));
watch(availProviders, (ps) => { if (ps.length && !ps.some((p) => p.id === provider.value)) provider.value = ps[0].id; }, { immediate: true });

const player = computed<PlayerState>(() => ({
  level: game.level,
  faction: game.faction,
  completed: game.completed,
  traderLL: game.traderLL,
  hideoutLevel: game.hideoutLevel,
}));

const spawns = computed<SpawnPt[]>(() => {
  const m = current.value;
  if (!m) return [];
  const want = game.faction;
  const cats = (s: { categories: string[] | null }) => (s.categories ?? []).map((c) => c.toLowerCase());
  let list = m.spawns.filter((s) => {
    const c = cats(s);
    return want === 'PMC' ? c.includes('player') : c.includes('scav') || c.includes('bot');
  });
  if (!list.length) list = m.spawns.filter((s) => cats(s).includes('player'));
  if (!list.length) list = m.spawns;
  return list.filter((s) => s.position).map((s, i) => ({ x: s.position.x, z: s.position.z, label: cleanSpawn(s.zoneName, i) }));
});

function normFaction(f: string | null): string | null {
  if (!f) return null;
  const l = f.toLowerCase();
  return l === 'pmc' ? 'PMC' : l === 'scav' ? 'Scav' : l === 'shared' ? 'Shared' : f;
}
function extractColor(e: { faction: string | null; needsSwitch: boolean; transferItem: string | null }): string {
  if (e.transferItem) return /rouble|rub|₽/i.test(e.transferItem) ? 'var(--blue)' : 'var(--red)';
  if (e.needsSwitch) return 'var(--amber)';
  if (e.faction === 'Shared') return 'var(--purple)';
  return 'var(--positive)';
}

const extracts = computed<ExtractFull[]>(() => {
  const m = current.value;
  if (!m) return [];
  const want = game.faction;
  return m.extracts.filter((e) => e.position).map((e) => {
    const fac = normFaction(e.faction);
    const valid = fac === 'Shared' || fac === want || fac == null;
    const needsSwitch = (e.switches?.length ?? 0) > 0;
    const transferItem = e.transferItem?.item?.name ?? null;
    return { x: e.position.x, z: e.position.z, name: e.name || 'Extraction', valid, faction: fac, needsSwitch, transferItem, color: extractColor({ faction: fac, needsSwitch, transferItem }) };
  });
});

// Marqueurs de quêtes éligibles incomplètes sur cette carte
const questMarkers = computed(() => {
  const m = current.value;
  if (!m || !tasks.value) return [];
  const out: { x: number; z: number; label: string }[] = [];
  for (const t of tasks.value) {
    if (!isAvailable(t, player.value)) continue;
    for (const o of t.objectives) {
      for (const z of o.zones ?? []) if (z.map?.normalizedName === m.normalizedName && z.position) out.push({ x: z.position.x, z: z.position.z, label: t.name });
      for (const pl of o.possibleLocations ?? []) if (pl.map?.normalizedName === m.normalizedName) for (const p of pl.positions) out.push({ x: p.x, z: p.z, label: t.name });
    }
  }
  return out;
});

// Bring list : clés requises par les quêtes éligibles sur cette carte
const bringKeys = computed(() => {
  const m = current.value;
  if (!m || !tasks.value) return [];
  const byId = new Map<string, { icon: string | null; name: string; quests: Set<string> }>();
  for (const t of tasks.value) {
    if (!isAvailable(t, player.value)) continue;
    const onMap = t.map?.normalizedName === m.normalizedName || t.objectives.some((o) => (o.maps ?? []).some((mm) => mm.normalizedName === m.normalizedName));
    if (!onMap) continue;
    for (const o of t.objectives) for (const grp of o.requiredKeys ?? []) for (const k of grp) {
      const e = byId.get(k.id) ?? { icon: k.iconLink, name: k.shortName || k.name, quests: new Set<string>() };
      e.quests.add(t.name);
      byId.set(k.id, e);
    }
  }
  return [...byId.values()];
});

const selectedSpawn = ref(0);
const selectedExtract = ref<string | null>(null);
watch([selected, () => game.faction], () => { selectedSpawn.value = 0; selectedExtract.value = null; });

// Destination effective tracée sur la carte : sélection explicite, sinon la plus proche
const effectiveExtract = computed(() => {
  if (selectedExtract.value) return selectedExtract.value;
  const sp = spawns.value[selectedSpawn.value];
  if (!sp) return null;
  let best: string | null = null, bd = Infinity;
  for (const e of extracts.value) {
    if (!e.valid) continue;
    const d = distance(sp.x, sp.z, e.x, e.z);
    if (d < bd) { bd = d; best = e.name; }
  }
  return best;
});

const validExtractCount = computed(() => extracts.value.filter((e) => e.valid).length);
const counts = computed(() => ({ spawns: spawns.value.length, extracts: extracts.value.length, quests: questMarkers.value.length, transits: current.value?.transits.filter((t) => t.position).length ?? 0 }));
</script>

<template>
  <section class="view">
    <span class="kicker">Cartes & extraction</span>
    <h1 class="page-title">Sors vivant, par le bon côté</h1>
    <p class="lead">
      Choisis ta carte, ton spawn et ta destination : cap, distance et contraintes (interrupteur, péage, clé).
      Extractions et objectifs de quête filtrés selon ta faction et ta progression.
    </p>

    <Spinner v-if="loading" block label="Chargement des cartes…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <template v-else>
      <div class="mapchips">
        <Chip v-for="m in mapList" :key="m.normalizedName" :active="selected === m.normalizedName" @click="selected = m.normalizedName">
          {{ m.name }}
        </Chip>
      </div>

      <div v-if="current" class="grid">
        <div class="mapcol">
          <div v-if="providerOpts.length > 1" class="map-toolbar">
            <span class="tb-lbl">Plan</span>
            <SegmentedControl v-model="provider" :options="providerOpts" size="sm" />
          </div>
          <TacticalMap
            v-if="hasData"
            :data="data"
            :spawns="spawns"
            :extracts="extracts"
            :transits="current.transits.filter((t) => t.position).map((t) => ({ x: t.position.x, z: t.position.z, label: t.description || '' }))"
            :quests="questMarkers"
            :selected-spawn="selectedSpawn"
            :selected-extract="effectiveExtract"
            :layers="layers"
            :provider="provider"
            @pick-spawn="selectedSpawn = $event"
            @pick-extract="selectedExtract = $event"
          />
          <p v-else class="note">
            Pas de plan interactif pour cette carte.
            Voir : <a :href="'https://tarkov.dev/map/' + current.normalizedName" target="_blank">tarkov.dev/map/{{ current.normalizedName }}</a>.
          </p>
          <MapLegend v-if="hasData" :layers="layers" :counts="counts" @update:layers="layers = $event" />
        </div>

        <aside class="side">
          <div class="meta">
            <Stat tone="accent" :value="spawns.length">spawns</Stat>
            <Stat tone="accent" :value="validExtractCount">extr. valides</Stat>
            <Stat v-if="current.raidDuration" tone="accent" :value="current.raidDuration">min raid</Stat>
          </div>

          <Card>
            <RoutePanel
              :spawns="spawns"
              :extracts="extracts"
              :selected-spawn="selectedSpawn"
              :selected-extract="selectedExtract"
              @pick-spawn="selectedSpawn = $event"
              @pick-extract="selectedExtract = $event"
            />
          </Card>

          <Card v-if="bringKeys.length">
            <span class="kicker">À emporter — clés</span>
            <div class="keys">
              <div v-for="k in bringKeys" :key="k.name" class="keyrow">
                <IconBox :src="k.icon" :size="30" />
                <div class="keytext">
                  <div class="keyname">{{ k.name }}</div>
                  <div class="keyq">{{ [...k.quests].slice(0, 2).join(' · ') }}<span v-if="k.quests.size > 2"> +{{ k.quests.size - 2 }}</span></div>
                </div>
              </div>
            </div>
          </Card>

          <a v-if="current.wiki" :href="current.wiki" target="_blank" class="wiki">↗ Wiki de la carte</a>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.mapchips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
.mapcol { display: flex; flex-direction: column; }
.map-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.tb-lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-3); }
.mapcol :deep(.map) { height: 62vh; }
.side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 8px; }
.meta { display: flex; gap: 8px; flex-wrap: wrap; }
.note { font-size: 12px; color: var(--ink-3); line-height: 1.6; margin: 12px 0 0; }
.keys { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.keyrow { display: flex; align-items: center; gap: 10px; }
.keytext { min-width: 0; }
.keyname { font-size: 13.5px; color: var(--ink); }
.keyq { font-size: 11.5px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wiki { font-size: 13px; }
.err { color: var(--red); font-family: var(--font-mono); font-size: 13px; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } .side { position: static; } }
</style>
