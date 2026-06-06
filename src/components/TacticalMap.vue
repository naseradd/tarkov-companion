<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import { type MapData, type ProviderId } from '@/lib/maps';

export interface SpawnPt { x: number; z: number; label: string; }
export interface ExtractPt { x: number; z: number; name: string; color: string; valid: boolean; }
export interface TransitPt { x: number; z: number; label: string; }
export interface QuestPt { x: number; z: number; label: string; }
export interface LayerState { spawns: boolean; extracts: boolean; transits: boolean; quests: boolean; }

const props = defineProps<{
  data: MapData | null;
  spawns: SpawnPt[];
  extracts: ExtractPt[];
  transits: TransitPt[];
  quests: QuestPt[];
  selectedSpawn: number;
  selectedExtract: string | null;
  layers: LayerState;
  provider: ProviderId;
}>();

const emit = defineEmits<{
  (e: 'pick-spawn', index: number): void;
  (e: 'pick-extract', name: string): void;
}>();

/* ---- Projection tarkov.dev : CRS custom (transform + rotation) ---- */
function applyRotation(latLng: L.LatLng, rotation: number): L.LatLng {
  if (!latLng.lng && !latLng.lat) return L.latLng(0, 0);
  if (!rotation) return latLng;
  const a = (rotation * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const x = latLng.lng, y = latLng.lat;
  return L.latLng(x * sin + y * cos, x * cos - y * sin);
}
function makeCRS(d: MapData): L.CRS {
  const scaleX = d.transform[0];
  const scaleY = d.transform[2] * -1;
  return L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(scaleX, d.transform[1], scaleY, d.transform[3]),
    projection: L.extend({}, L.Projection.LonLat, {
      project: (latLng: L.LatLng) => L.Projection.LonLat.project(applyRotation(latLng, d.rotation)),
      unproject: (point: L.Point) => applyRotation(L.Projection.LonLat.unproject(point), d.rotation * -1),
    }),
  }) as unknown as L.CRS;
}
const gbounds = (b: MapData['bounds']) => L.latLngBounds([b[0][1], b[0][0]], [b[1][1], b[1][0]]);
const pos = (p: { x: number; z: number }): [number, number] => [p.z, p.x];

const el = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let baseLayer: L.Layer | null = null;
let spawnLayer: L.LayerGroup, extractLayer: L.LayerGroup, transitLayer: L.LayerGroup, questLayer: L.LayerGroup, routeLayer: L.LayerGroup;
let spawnMarkers: L.CircleMarker[] = [];
let extractMarkers = new Map<string, L.Marker | L.CircleMarker>();
let currentKey = '';

function extractIcon(ex: ExtractPt, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: `exm${selected ? ' sel' : ''}`,
    html: `<span class="exm-dot" style="background:${ex.color}"></span><span class="exm-lbl">${ex.name}</span>`,
    iconSize: undefined as any,
    iconAnchor: [7, 9],
  });
}

function setBase() {
  if (!map || !props.data) return;
  if (baseLayer) { map.removeLayer(baseLayer); baseLayer = null; }
  const d = props.data;
  const b = gbounds(d.bounds);
  const maxZoom = Math.max(7, d.maxZoom);
  const tile = () => L.tileLayer(d.tilePath!, { tileSize: d.tileSize, bounds: b, maxNativeZoom: d.maxZoom, maxZoom, minZoom: -2 });
  if (props.provider === 'tiles' && d.tilePath) baseLayer = tile();
  else if (d.svgPath) baseLayer = L.imageOverlay(d.svgPath, b, { opacity: 1 });
  else if (d.tilePath) baseLayer = tile();
  if (baseLayer) { baseLayer.addTo(map); (baseLayer as any).bringToBack?.(); }
}

function renderMarkers() {
  if (!map) return;
  [spawnLayer, extractLayer, transitLayer, questLayer].forEach((l) => l.clearLayers());
  spawnMarkers = [];
  extractMarkers = new Map();

  for (const t of props.transits) {
    L.circleMarker(pos(t), { radius: 4, color: '#0b0d08', weight: 1.5, fillColor: '#6bb3ec', fillOpacity: 0.85 })
      .bindTooltip('Transit : ' + (t.label || ''), { direction: 'top' }).addTo(transitLayer);
  }
  for (const q of props.quests) {
    L.circleMarker(pos(q), { radius: 5, color: '#0b0d08', weight: 1.5, fillColor: '#e9a13a', fillOpacity: 0.95, className: 'qmark' })
      .bindTooltip('◈ ' + q.label, { direction: 'top' }).addTo(questLayer);
  }
  for (const ex of props.extracts) {
    if (ex.valid) {
      const m = L.marker(pos(ex), { icon: extractIcon(ex, ex.name === props.selectedExtract), riseOnHover: true, zIndexOffset: 500 });
      m.on('click', () => emit('pick-extract', ex.name));
      m.addTo(extractLayer);
      extractMarkers.set(ex.name, m);
    } else {
      const m = L.circleMarker(pos(ex), { radius: 4, color: '#0b0d08', weight: 1, fillColor: ex.color, fillOpacity: 0.28 })
        .bindTooltip(ex.name + ' (autre faction)', { direction: 'top' });
      m.addTo(extractLayer);
      extractMarkers.set(ex.name, m);
    }
  }
  props.spawns.forEach((sp, i) => {
    const m = L.circleMarker(pos(sp), { radius: 6, color: '#0b0d08', weight: 1.5, fillColor: '#7d8a4e', fillOpacity: 0.9 })
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
    m.setStyle({ fillColor: on ? '#b8d43b' : '#7d8a4e', radius: on ? 9 : 6, color: on ? '#fff' : '#0b0d08', weight: on ? 2 : 1.5 });
    if (on) m.bringToFront();
  });
  extractMarkers.forEach((m, name) => {
    if (m instanceof L.Marker) {
      const ex = props.extracts.find((e) => e.name === name);
      if (ex) m.setIcon(extractIcon(ex, name === props.selectedExtract));
    }
  });
  const sp = props.spawns[props.selectedSpawn];
  const ex = props.extracts.find((e) => e.name === props.selectedExtract);
  if (sp && ex && props.layers.extracts) {
    L.polyline([pos(sp), pos(ex)], { color: '#b8d43b', weight: 3, dashArray: '8 7', className: 'route-line' }).addTo(routeLayer);
  }
}

function build() {
  const d = props.data;
  if (!d || !el.value) return;
  if (map && currentKey !== d.normalizedName) { map.remove(); map = null; }
  if (!map) {
    map = L.map(el.value, { crs: makeCRS(d), minZoom: -2, maxZoom: Math.max(7, d.maxZoom), zoomSnap: 0.25, attributionControl: true, zoomControl: true });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('© <a href="https://tarkov.dev" target="_blank">tarkov.dev</a>');
    spawnLayer = L.layerGroup();
    extractLayer = L.layerGroup();
    transitLayer = L.layerGroup();
    questLayer = L.layerGroup();
    routeLayer = L.layerGroup();
    currentKey = d.normalizedName;
  }
  setBase();
  renderMarkers();
  map.setMaxBounds(gbounds(d.bounds).pad(0.5));
  map.fitBounds(gbounds(d.bounds), { padding: [16, 16] });
}

onMounted(build);
onBeforeUnmount(() => { map?.remove(); map = null; });

watch(() => props.data, build);
watch(() => props.provider, setBase);
watch(() => [props.spawns, props.extracts, props.transits, props.quests], renderMarkers, { deep: false });
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

<style>
/* Marqueurs d'extraction (divIcon — DOM global, hors scoped) */
.exm { display: flex; align-items: center; gap: 6px; white-space: nowrap; cursor: pointer; width: auto !important; height: auto !important; }
.exm-dot { width: 13px; height: 13px; border-radius: 50%; border: 2px solid #0b0d08; box-shadow: 0 0 0 1px rgba(255,255,255,.25), 0 1px 4px rgba(0,0,0,.5); flex: 0 0 auto; transition: transform .14s; }
.exm-lbl {
  font-family: 'Barlow', system-ui, sans-serif;
  font-size: 12px; font-weight: 600; color: #ecf0e2;
  background: rgba(14,15,12,.82); border: 1px solid rgba(58,67,41,.9);
  padding: 2px 8px; border-radius: 999px; backdrop-filter: blur(2px);
  box-shadow: 0 2px 8px rgba(0,0,0,.4); transition: all .14s;
}
.exm:hover .exm-dot { transform: scale(1.2); }
.exm:hover .exm-lbl { color: #fff; }
.exm.sel .exm-dot { transform: scale(1.35); box-shadow: 0 0 0 2px var(--accent), 0 0 10px var(--accent-glow); }
.exm.sel .exm-lbl { background: var(--accent); color: var(--ink-on-accent); border-color: var(--accent); font-weight: 700; }
.route-line { filter: drop-shadow(0 0 5px var(--accent-glow)); animation: route-march 1s linear infinite; }
</style>
