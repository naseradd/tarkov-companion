<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import { type MapDef, svgUrl, mapDims, project } from '@/lib/maps';

export interface SpawnPt { x: number; z: number; label: string; }
export interface ExtractPt { x: number; z: number; name: string; color: string; valid: boolean; }
export interface TransitPt { x: number; z: number; label: string; }
export interface QuestPt { x: number; z: number; label: string; }
export interface LayerState { spawns: boolean; extracts: boolean; transits: boolean; quests: boolean; }

const props = defineProps<{
  def: MapDef | null;
  spawns: SpawnPt[];
  extracts: ExtractPt[];
  transits: TransitPt[];
  quests: QuestPt[];
  selectedSpawn: number;
  selectedExtract: string | null;
  layers: LayerState;
}>();

const emit = defineEmits<{
  (e: 'pick-spawn', index: number): void;
  (e: 'pick-extract', name: string): void;
}>();

const el = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let spawnLayer: L.LayerGroup, extractLayer: L.LayerGroup, transitLayer: L.LayerGroup, questLayer: L.LayerGroup, routeLayer: L.LayerGroup;
let spawnMarkers: L.CircleMarker[] = [];
let extractMarkers = new Map<string, L.CircleMarker>();
let activeDef: MapDef = { file: '', rotation: 0, bounds: [[0, 0], [1, 1]] };
let activeDims = { width: 1000, height: 1000 };

function syntheticDef(): MapDef {
  const pts = [...props.spawns, ...props.extracts, ...props.transits, ...props.quests];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  if (!isFinite(minX)) { minX = 0; maxX = 1; minZ = 0; maxZ = 1; }
  const padX = (maxX - minX) * 0.08 || 10;
  const padZ = (maxZ - minZ) * 0.08 || 10;
  return { file: '', rotation: 0, bounds: [[minX - padX, minZ - padZ], [maxX + padX, maxZ + padZ]] };
}

function rebuild() {
  if (!map) return;
  [spawnLayer, extractLayer, transitLayer, questLayer, routeLayer].forEach((l) => l.clearLayers());
  spawnMarkers = [];
  extractMarkers = new Map();

  const real = !!props.def;
  activeDef = props.def ?? syntheticDef();
  activeDims = mapDims(activeDef);
  const { width, height } = activeDims;
  const imgBounds = L.latLngBounds([0, 0], [height, width]);

  map.eachLayer((layer) => { if (layer instanceof L.ImageOverlay || layer instanceof L.Rectangle) map!.removeLayer(layer); });
  if (real) L.imageOverlay(svgUrl(activeDef), imgBounds, { opacity: 0.97 }).addTo(map);
  else L.rectangle(imgBounds, { color: '#2a2f1e', weight: 1, fillColor: '#0b0d08', fillOpacity: 0.6 }).addTo(map);
  map.setMaxBounds(imgBounds.pad(0.4));
  map.fitBounds(imgBounds, { padding: [14, 14] });

  for (const t of props.transits) {
    const [lat, lng] = project(t.x, t.z, activeDef, activeDims);
    L.circleMarker([lat, lng], { radius: 4, color: '#0b0d08', weight: 1.5, fillColor: '#6bb3ec', fillOpacity: 0.85 })
      .bindTooltip('Transit : ' + (t.label || ''), { direction: 'top' }).addTo(transitLayer);
  }
  for (const q of props.quests) {
    const [lat, lng] = project(q.x, q.z, activeDef, activeDims);
    L.circleMarker([lat, lng], { radius: 5, color: '#0b0d08', weight: 1.5, fillColor: '#e9a13a', fillOpacity: 0.95, className: 'qmark' })
      .bindTooltip('◈ ' + q.label, { direction: 'top' }).addTo(questLayer);
  }
  for (const ex of props.extracts) {
    const [lat, lng] = project(ex.x, ex.z, activeDef, activeDims);
    const m = L.circleMarker([lat, lng], { radius: 6, color: '#0b0d08', weight: 1.5, fillColor: ex.color, fillOpacity: ex.valid ? 1 : 0.3 })
      .bindTooltip(ex.name || 'Extraction', { direction: 'top' });
    m.on('click', () => emit('pick-extract', ex.name));
    m.addTo(extractLayer);
    extractMarkers.set(ex.name, m);
  }
  props.spawns.forEach((sp, i) => {
    const [lat, lng] = project(sp.x, sp.z, activeDef, activeDims);
    const m = L.circleMarker([lat, lng], { radius: 5, color: '#0b0d08', weight: 1, fillColor: '#5e6b3a', fillOpacity: 0.9 })
      .bindTooltip(sp.label || `Spawn ${i + 1}`, { direction: 'top' });
    m.on('click', () => emit('pick-spawn', i));
    m.addTo(spawnLayer);
    spawnMarkers.push(m);
  });

  applyLayers();
  updateSelection();
}

function applyLayers() {
  if (!map) return;
  const set = (layer: L.LayerGroup, on: boolean) => { if (on) layer.addTo(map!); else map!.removeLayer(layer); };
  set(spawnLayer, props.layers.spawns);
  set(extractLayer, props.layers.extracts);
  set(transitLayer, props.layers.transits);
  set(questLayer, props.layers.quests);
  routeLayer.addTo(map);
}

function updateSelection() {
  if (!map) return;
  routeLayer.clearLayers();
  spawnMarkers.forEach((m, i) => {
    const on = i === props.selectedSpawn;
    m.setStyle({ fillColor: on ? '#b8d43b' : '#5e6b3a', radius: on ? 7 : 5, color: on ? '#fff' : '#0b0d08', weight: on ? 1.5 : 1 });
    if (on) m.bringToFront();
  });
  extractMarkers.forEach((m, name) => { const on = name === props.selectedExtract; m.setRadius(on ? 9 : 6); if (on) m.bringToFront(); });

  const sp = props.spawns[props.selectedSpawn];
  const ex = props.extracts.find((e) => e.name === props.selectedExtract);
  if (sp && ex && props.layers.extracts) {
    const a = project(sp.x, sp.z, activeDef, activeDims);
    const b = project(ex.x, ex.z, activeDef, activeDims);
    L.polyline([a, b], { color: '#b8d43b', weight: 2.5, dashArray: '7 6', className: 'route-line' }).addTo(routeLayer);
    L.circleMarker(b, { radius: 11, color: ex.color, weight: 1.5, fill: false }).addTo(routeLayer);
  }
}

onMounted(() => {
  if (!el.value) return;
  map = L.map(el.value, { crs: L.CRS.Simple, minZoom: -6, maxZoom: 4, zoomSnap: 0.25, attributionControl: true, zoomControl: true });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('© <a href="https://tarkov.dev" target="_blank">tarkov.dev</a>');
  spawnLayer = L.layerGroup();
  extractLayer = L.layerGroup();
  transitLayer = L.layerGroup();
  questLayer = L.layerGroup();
  routeLayer = L.layerGroup();
  rebuild();
});
onBeforeUnmount(() => { map?.remove(); map = null; });

watch(() => [props.def, props.spawns, props.extracts, props.transits, props.quests], rebuild, { deep: false });
watch(() => [props.selectedSpawn, props.selectedExtract], updateSelection);
watch(() => props.layers, () => { applyLayers(); updateSelection(); }, { deep: true });
</script>

<template>
  <div ref="el" class="map" />
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
  min-height: 440px;
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
:deep(.qmark) { filter: drop-shadow(0 0 4px rgba(233, 161, 58, 0.5)); }
</style>
