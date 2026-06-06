<script setup lang="ts">
import { computed } from 'vue';
import { bearing, distance } from '@/lib/format';

export interface ExtractFull {
  x: number; z: number; name: string; color: string; valid: boolean;
  faction: string | null; needsSwitch: boolean; transferItem: string | null;
}
export interface SpawnPt { x: number; z: number; label: string; }

const props = defineProps<{
  spawns: SpawnPt[];
  extracts: ExtractFull[];
  selectedSpawn: number;
  selectedExtract: string | null;
}>();

const emit = defineEmits<{
  (e: 'pick-spawn', index: number): void;
  (e: 'pick-extract', name: string): void;
}>();

const spawn = computed(() => props.spawns[props.selectedSpawn] ?? null);

const ranked = computed(() => {
  const sp = spawn.value;
  if (!sp) return [];
  return props.extracts
    .filter((e) => e.valid)
    .map((e) => {
      const b = bearing(sp.x, sp.z, e.x, e.z);
      return { ...e, dist: distance(sp.x, sp.z, e.x, e.z), bearing: b.label, arrow: b.arrow };
    })
    .sort((a, b) => a.dist - b.dist);
});

// destination courante = sélection explicite, sinon la plus proche
const dest = computed(() => {
  if (props.selectedExtract) return ranked.value.find((e) => e.name === props.selectedExtract) ?? null;
  return ranked.value[0] ?? null;
});

function onSpawnSelect(e: Event) {
  emit('pick-spawn', Number((e.target as HTMLSelectElement).value));
}
function onExtractSelect(e: Event) {
  emit('pick-extract', (e.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="route">
    <!-- Étape 1 -->
    <div class="step">
      <span class="step-no">1</span>
      <div style="flex: 1">
        <label class="step-lbl">Où spawnes-tu ?</label>
        <select class="field full" :value="selectedSpawn" @change="onSpawnSelect">
          <option v-for="(s, i) in spawns" :key="i" :value="i">{{ s.label || 'Zone ' + (i + 1) }}</option>
        </select>
      </div>
    </div>

    <!-- Étape 2 -->
    <div class="step">
      <span class="step-no">2</span>
      <div style="flex: 1">
        <label class="step-lbl">Où veux-tu extraire ?</label>
        <select class="field full" :value="selectedExtract ?? ''" @change="onExtractSelect">
          <option value="">Auto — la plus proche</option>
          <option v-for="e in ranked" :key="e.name" :value="e.name">{{ e.name }} · ~{{ e.dist }} m</option>
        </select>
      </div>
    </div>

    <!-- Itinéraire -->
    <div v-if="dest" class="itin">
      <div class="itin-top">
        <span class="kick">Itinéraire</span>
        <span class="badge b-fir">CAP {{ dest.arrow }} {{ dest.bearing }}</span>
      </div>
      <div class="itin-dest">{{ dest.name }}</div>
      <div class="itin-meta">
        <span>Distance ~<b>{{ dest.dist }}</b> m</span>
        <span>Depuis <b>{{ spawn?.label || 'ton spawn' }}</b></span>
      </div>
      <div class="itin-flags">
        <span v-if="dest.faction && dest.faction !== 'Shared'" class="badge b-info">{{ dest.faction }}</span>
        <span v-if="dest.needsSwitch" class="badge b-kappa">interrupteur requis</span>
        <span v-if="dest.transferItem" class="badge b-quest">objet requis : {{ dest.transferItem }}</span>
        <span v-if="!dest.needsSwitch && !dest.transferItem" class="badge b-fir">extraction libre</span>
      </div>
    </div>
    <div v-else class="empty">Aucune extraction {{ }} valide géolocalisée pour cette config.</div>

    <!-- Alternatives -->
    <div v-if="ranked.length > 1" class="alts">
      <span class="kick">Alternatives (proximité)</span>
      <button
        v-for="(e, i) in ranked.slice(0, 6)"
        :key="e.name"
        class="alt"
        :class="{ on: dest && e.name === dest.name }"
        @click="emit('pick-extract', e.name)"
      >
        <span class="alt-rank">#{{ i + 1 }}</span>
        <span class="alt-name">{{ e.name }}</span>
        <span class="alt-meta">{{ e.arrow }} {{ e.dist }} m</span>
        <span v-if="e.needsSwitch" class="alt-dot" title="interrupteur" style="background: var(--amber)"></span>
        <span v-if="e.transferItem" class="alt-dot" title="objet requis" style="background: var(--red)"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.route { display: flex; flex-direction: column; gap: 12px; }
.step { display: flex; gap: 10px; align-items: flex-start; }
.step-no { width: 22px; height: 22px; flex: 0 0 auto; border: 1px solid var(--acid-dim); color: var(--acid); border-radius: 50%; display: grid; place-items: center; font-family: var(--mono); font-size: 11px; margin-top: 18px; }
.step-lbl { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
.full { width: 100%; }
.itin { background: #11140d; border: 1px solid var(--acid-dim); border-radius: 2px; padding: 12px; }
.itin-top { display: flex; justify-content: space-between; align-items: center; }
.itin-dest { font-family: var(--cond); font-weight: 700; font-size: 19px; text-transform: uppercase; margin: 6px 0 4px; }
.itin-meta { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--mono); font-size: 11.5px; color: var(--muted); }
.itin-meta b { color: var(--acid); }
.itin-flags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 9px; }
.empty { color: var(--muted); font-size: 12px; }
.alts { display: flex; flex-direction: column; gap: 5px; }
.alt { display: flex; align-items: center; gap: 9px; background: #11140d; border: 1px solid var(--line); border-radius: 2px; padding: 7px 10px; cursor: pointer; text-align: left; transition: 0.12s var(--tap); }
.alt:hover { border-color: var(--line2); transform: translateX(2px); }
.alt.on { border-color: var(--acid); background: rgba(200, 224, 33, 0.06); }
.alt-rank { font-family: var(--mono); font-size: 10px; color: var(--dim); }
.alt-name { flex: 1; font-family: var(--cond); font-weight: 600; font-size: 13.5px; text-transform: uppercase; color: var(--txt); }
.alt-meta { font-family: var(--mono); font-size: 10.5px; color: var(--amber); }
.alt-dot { width: 7px; height: 7px; border-radius: 50%; }
</style>
