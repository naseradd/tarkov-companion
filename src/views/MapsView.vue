<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchMaps, type TarkovMap } from '@/lib/tarkov';
import { mapDef } from '@/lib/maps';
import TacticalMap from '@/components/TacticalMap.vue';
import RoutePanel, { type ExtractFull, type SpawnPt } from '@/components/RoutePanel.vue';
import Spinner from '@/components/Spinner.vue';

const game = useGameStore();
const { data: maps, loading, error } = useResource<TarkovMap[]>('maps', fetchMaps);

const selected = ref<string | null>(null);

// dédoublonnage par normalizedName + map sélectionnée par défaut
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

watch(mapList, (list) => {
  if (!selected.value && list.length) selected.value = list.find((m) => m.normalizedName === 'customs')?.normalizedName ?? list[0].normalizedName;
});

const current = computed(() => mapList.value.find((m) => m.normalizedName === selected.value) ?? null);
const def = computed(() => (current.value ? mapDef(current.value.normalizedName) : null));

const FACTION_COLOR = (f: string | null) => (f === 'PMC' ? '#e9a13a' : f === 'Scav' ? '#5aa9e6' : '#84c24a');

const spawns = computed<SpawnPt[]>(() => {
  const m = current.value;
  if (!m) return [];
  const want = game.faction;
  let list = m.spawns.filter((s) => {
    const cats = s.categories ?? [];
    return want === 'PMC' ? cats.includes('Player') : cats.includes('Scav');
  });
  if (!list.length) list = m.spawns.filter((s) => (s.categories ?? []).includes('Player'));
  if (!list.length) list = m.spawns;
  return list
    .filter((s) => s.position)
    .map((s, i) => ({ x: s.position.x, z: s.position.z, label: s.zoneName || `Zone ${i + 1}` }));
});

const extracts = computed<ExtractFull[]>(() => {
  const m = current.value;
  if (!m) return [];
  const want = game.faction;
  return m.extracts
    .filter((e) => e.position)
    .map((e) => {
      const fac = e.faction;
      const valid = fac === 'Shared' || fac === want || fac == null;
      return {
        x: e.position.x, z: e.position.z, name: e.name || 'Extraction', color: FACTION_COLOR(fac), valid,
        faction: fac, needsSwitch: (e.switches?.length ?? 0) > 0,
        transferItem: e.transferItem?.item?.name ?? null,
      };
    });
});

const selectedSpawn = ref(0);
const selectedExtract = ref<string | null>(null);

watch([selected, () => game.faction], () => { selectedSpawn.value = 0; selectedExtract.value = null; });

const hasImage = computed(() => !!def.value);
</script>

<template>
  <section>
    <span class="kick">Module 01 — Cartes & Extraction</span>
    <h1 class="title">Cartes & itinéraires</h1>
    <p class="lead">
      Choisis ta carte, ton point de spawn et ta destination : l'app calcule le cap, la distance et les
      contraintes (interrupteur, objet requis). Spawns et extractions filtrés selon ta faction.
    </p>

    <Spinner v-if="loading" label="CHARGEMENT DES CARTES…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <template v-else>
      <div class="chips" style="margin-bottom: 14px">
        <button
          v-for="m in mapList"
          :key="m.normalizedName"
          class="chip"
          :class="{ on: selected === m.normalizedName }"
          @click="selected = m.normalizedName"
        >
          {{ m.name }}
        </button>
      </div>

      <div v-if="current" class="grid">
        <div class="mapcol">
          <TacticalMap
            :def="def"
            :spawns="spawns"
            :extracts="extracts"
            :transits="current.transits.filter((t) => t.position).map((t) => ({ x: t.position.x, z: t.position.z, label: t.description || '' }))"
            :selected-spawn="selectedSpawn"
            :selected-extract="selectedExtract"
            @pick-spawn="selectedSpawn = $event"
            @pick-extract="selectedExtract = $event"
          />
          <div class="legend">
            <span><i style="background: #5e6b3a"></i>Spawn</span>
            <span><i style="background: #c8e021"></i>Ton spawn</span>
            <span><i style="background: #e9a13a"></i>Extr. PMC</span>
            <span><i style="background: #5aa9e6"></i>Extr. Scav / Transit</span>
            <span><i style="background: #84c24a"></i>Extr. partagée</span>
          </div>
          <p v-if="!hasImage" class="note">
            Pas d'image vectorielle dispo pour cette carte — vue schématique (positions relatives exactes).
            Carte détaillée : <a :href="'https://tarkov.dev/map/' + current.normalizedName" target="_blank">tarkov.dev/map/{{ current.normalizedName }}</a>.
          </p>
          <p v-else class="note">
            Positions issues de l'API (approx. terrain, pas un GPS). Orientation native du SVG.
            Si un marqueur semble décalé, voir <code>flipX/flipY</code> dans <code>src/lib/maps.ts</code>.
            Carte complète (loot, clés, 3D) : <a :href="'https://tarkov.dev/map/' + current.normalizedName" target="_blank">tarkov.dev</a>.
          </p>
        </div>

        <aside class="panel side">
          <div class="meta">
            <span class="stat"><b>{{ spawns.length }}</b> spawns</span>
            <span class="stat"><b>{{ extracts.filter((e) => e.valid).length }}</b> extr. valides</span>
            <span class="stat" v-if="current.raidDuration"><b>{{ current.raidDuration }}</b> min raid</span>
          </div>
          <RoutePanel
            :spawns="spawns"
            :extracts="extracts"
            :selected-spawn="selectedSpawn"
            :selected-extract="selectedExtract"
            @pick-spawn="selectedSpawn = $event"
            @pick-extract="selectedExtract = $event"
          />
          <a v-if="current.wiki" :href="current.wiki" target="_blank" class="wiki">↗ Wiki de la carte</a>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
.mapcol { display: flex; flex-direction: column; }
.mapcol > .map, .mapcol :deep(.map) { height: 60vh; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
.legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.note { font-family: var(--mono); font-size: 10.5px; color: var(--dim); line-height: 1.6; margin: 10px 0 0; }
.note code { color: var(--muted); }
.side { position: sticky; top: 8px; }
.meta { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 14px; }
.wiki { display: inline-block; margin-top: 14px; font-family: var(--mono); font-size: 11px; }
.err { color: var(--red); font-family: var(--mono); font-size: 12px; }
@media (max-width: 980px) { .grid { grid-template-columns: 1fr; } .side { position: static; } }
</style>
