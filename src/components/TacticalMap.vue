<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import { type MapDef, svgUrl, mapDims, project } from '@/lib/maps';

export interface SpawnPt { x: number; z: number; label: string; }
export interface ExtractPt { x: number; z: number; name: string; color: string; valid: boolean; }
export interface TransitPt { x: number; z: number; label: string; }

const props = defineProps<{
  def: MapDef | null;
  spawns: SpawnPt[];
  extracts: ExtractPt[];
  transits: TransitPt[];
  selectedSpawn: number;
  selectedExtract: string | null;
}>();

const emit = defineEmits<{
  (e: 'pick-spawn', index: number): void;
  (e: 'pick-extract', name: string): void;
}>();

const el = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let routeLayer: L.LayerGroup | null = null;
let spawnMarkers: L.CircleMarker[] = [];
let extractMarkers = new Map<string, L.CircleMarker>();
let activeDef: MapDef = { file: '', rotation: 0, bounds: [[0, 0], [1, 1]] };
let activeDims = { width: 1000, height: 1000 };

/** Construit une définition synthétique quand on n'a pas de carte image (bornes = nuage de points). */
function syntheticDef(): MapDef {
  const pts = [...props.spawns, ...props.extracts, ...props.transits];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  if (!isFinite(minX)) { minX = 0; maxX = 1; minZ = 0; maxZ = 1; }
  const padX = (maxX - minX) * 0.08 || 10;
  const padZ = (maxZ - minZ) * 0.08 || 10;
  return { file: '', rotation: 0, bounds: [[minX - padX, minZ - padZ], [maxX + padX, maxZ + padZ]] };
}

function rebuild() {
  if (!map) return;
  markerLayer?.clearLayers();
  routeLayer?.clearLayers();
  spawnMarkers = [];
  extractMarkers = new Map();

  const real = !!props.def;
  activeDef = props.def ?? syntheticDef();
  activeDims = mapDims(activeDef);
  const { width, height } = activeDims;
  const imgBounds = L.latLngBounds([0, 0], [height, width]);

  // fond de carte
  map.eachLayer((layer) => { if (layer instanceof L.ImageOverlay || layer instanceof L.Rectangle) map!.removeLayer(layer); });
  if (real) {
    L.imageOverlay(svgUrl(activeDef), imgBounds, { opacity: 0.96 }).addTo(map);
  } else {
    L.rectangle(imgBounds, { color: '#272d1d', weight: 1, fillColor: '#0c0e07', fillOpacity: 0.6 }).addTo(map);
  }
  map.setMaxBounds(imgBounds.pad(0.4));
  map.fitBounds(imgBounds, { padding: [12, 12] });

  // transits
  for (const t of props.transits) {
    const [lat, lng] = project(t.x, t.z, activeDef, activeDims);
    L.circleMarker([lat, lng], { radius: 4, color: '#5aa9e6', weight: 1.5, fillColor: '#0c0e07', fillOpacity: 0.8 })
      .bindTooltip('Transit : ' + (t.label || ''), { direction: 'top' })
      .addTo(markerLayer!);
  }

  // extractions
  for (const ex of props.extracts) {
    const [lat, lng] = project(ex.x, ex.z, activeDef, activeDims);
    const m = L.circleMarker([lat, lng], {
      radius: 6, color: '#0c0e07', weight: 1.5, fillColor: ex.color, fillOpacity: ex.valid ? 1 : 0.3,
    }).bindTooltip(ex.name || 'Extraction', { direction: 'top' });
    m.on('click', () => emit('pick-extract', ex.name));
    m.addTo(markerLayer!);
    extractMarkers.set(ex.name, m);
  }

  // spawns
  props.spawns.forEach((sp, i) => {
    const [lat, lng] = project(sp.x, sp.z, activeDef, activeDims);
    const m = L.circleMarker([lat, lng], {
      radius: 5, color: '#0c0e07', weight: 1, fillColor: '#5e6b3a', fillOpacity: 0.9,
    }).bindTooltip(sp.label || `Spawn ${i + 1}`, { direction: 'top' });
    m.on('click', () => emit('pick-spawn', i));
    m.addTo(markerLayer!);
    spawnMarkers.push(m);
  });

  updateSelection();
}

function updateSelection() {
  if (!map) return;
  routeLayer?.clearLayers();

  spawnMarkers.forEach((m, i) => {
    const on = i === props.selectedSpawn;
    m.setStyle({ fillColor: on ? '#c8e021' : '#5e6b3a', radius: on ? 7 : 5, color: on ? '#ffffff' : '#0c0e07', weight: on ? 1.5 : 1 });
    if (on) m.bringToFront();
  });

  extractMarkers.forEach((m, name) => {
    const on = name === props.selectedExtract;
    m.setRadius(on ? 9 : 6);
    if (on) m.bringToFront();
  });

  const sp = props.spawns[props.selectedSpawn];
  const ex = props.extracts.find((e) => e.name === props.selectedExtract);
  if (sp && ex) {
    const a = project(sp.x, sp.z, activeDef, activeDims);
    const b = project(ex.x, ex.z, activeDef, activeDims);
    L.polyline([a, b], { color: '#c8e021', weight: 2.5, dashArray: '7 6', className: 'route-line' }).addTo(routeLayer!);
    L.circleMarker(b, { radius: 11, color: ex.color, weight: 1.5, fill: false }).addTo(routeLayer!);
  }
}

onMounted(() => {
  if (!el.value) return;
  map = L.map(el.value, {
    crs: L.CRS.Simple,
    minZoom: -6,
    maxZoom: 4,
    zoomSnap: 0.25,
    attributionControl: true,
    zoomControl: true,
  });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Carte © <a href="https://tarkov.dev" target="_blank">tarkov.dev</a>');
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  rebuild();
});

onBeforeUnmount(() => { map?.remove(); map = null; });

watch(() => [props.def, props.spawns, props.extracts, props.transits], rebuild, { deep: false });
watch(() => [props.selectedSpawn, props.selectedExtract], updateSelection);
</script>

<template>
  <div ref="el" class="map"></div>
</template>

<style scoped>
.map { width: 100%; height: 100%; min-height: 420px; border: 1px solid var(--line2); border-radius: var(--radius); }
</style>

<style>
/* animation de la route (path Leaflet, donc style global) */
.route-line { filter: drop-shadow(0 0 5px rgba(200, 224, 33, 0.6)); animation: routemarch 1s linear infinite; }
@keyframes routemarch { to { stroke-dashoffset: -26; } }
</style>
