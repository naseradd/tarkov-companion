<script setup lang="ts">
import { computed } from 'vue';
import { bearing, distance } from '@/lib/format';
import Combobox from '@/components/ui/Combobox.vue';
import Badge from '@/components/ui/Badge.vue';

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
  (e: 'pick-extract', name: string | null): void;
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

const dest = computed(() => {
  if (props.selectedExtract) return ranked.value.find((e) => e.name === props.selectedExtract) ?? null;
  return ranked.value[0] ?? null;
});

const spawnOpts = computed(() => props.spawns.map((s, i) => ({ value: i, label: s.label || `Zone ${i + 1}` })));
const destOpts = computed(() => [
  { value: '', label: 'Auto — la plus proche' },
  ...ranked.value.map((e) => ({ value: e.name, label: e.name, hint: '~' + e.dist + ' m' })),
]);
</script>

<template>
  <div class="route">
    <div class="step">
      <span class="step-no num">1</span>
      <div class="step-field">
        <label class="step-lbl">Où spawnes-tu ?</label>
        <Combobox :model-value="selectedSpawn" :options="spawnOpts" @update:model-value="emit('pick-spawn', Number($event))" />
      </div>
    </div>

    <div class="step">
      <span class="step-no num">2</span>
      <div class="step-field">
        <label class="step-lbl">Où veux-tu extraire ?</label>
        <Combobox
          :model-value="selectedExtract ?? ''"
          :options="destOpts"
          @update:model-value="emit('pick-extract', ($event as string) || null)"
        />
      </div>
    </div>

    <div v-if="dest" class="itin">
      <div class="itin-top">
        <span class="kicker">Itinéraire</span>
        <Badge variant="accent">{{ dest.arrow }} {{ dest.bearing }}</Badge>
      </div>
      <div class="itin-dest">{{ dest.name }}</div>
      <div class="itin-meta">
        <span>Distance ~<b class="num">{{ dest.dist }}</b> m</span>
        <span>Depuis <b>{{ spawn?.label || 'ton spawn' }}</b></span>
      </div>
      <div class="itin-flags">
        <Badge v-if="dest.faction && dest.faction !== 'Shared'" variant="info">{{ dest.faction }}</Badge>
        <Badge v-if="dest.needsSwitch" variant="amber">interrupteur requis</Badge>
        <Badge v-if="dest.transferItem" variant="danger">objet : {{ dest.transferItem }}</Badge>
        <Badge v-if="!dest.needsSwitch && !dest.transferItem" variant="good">extraction libre</Badge>
      </div>
    </div>
    <div v-else class="empty">Aucune extraction valide géolocalisée pour cette config.</div>

    <div v-if="ranked.length > 1" class="alts">
      <span class="kicker">Alternatives par proximité</span>
      <button
        v-for="(e, i) in ranked.slice(0, 6)"
        :key="e.name"
        class="alt"
        :class="{ on: dest && e.name === dest.name }"
        @click="emit('pick-extract', e.name)"
      >
        <span class="alt-rank num">#{{ i + 1 }}</span>
        <span class="alt-name">{{ e.name }}</span>
        <span class="alt-meta num">{{ e.arrow }} {{ e.dist }} m</span>
        <span v-if="e.needsSwitch" class="alt-dot" title="interrupteur" style="background: var(--amber)" />
        <span v-if="e.transferItem" class="alt-dot" title="objet requis" style="background: var(--red)" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.route { display: flex; flex-direction: column; gap: 14px; }
.step { display: flex; gap: 11px; align-items: flex-start; }
.step-no {
  width: 24px; height: 24px; flex: 0 0 auto; margin-top: 22px;
  border: 1px solid var(--accent-dim); color: var(--accent); border-radius: 50%;
  display: grid; place-items: center; font-size: 12px; background: var(--accent-soft);
}
.step-field { flex: 1; min-width: 0; }
.step-lbl { display: block; font-size: 12.5px; color: var(--ink-2); margin-bottom: 6px; }

.itin { background: var(--canvas); border: 1px solid var(--accent-dim); border-radius: var(--r-md); padding: 14px; box-shadow: inset 0 0 0 1px var(--accent-soft); }
.itin-top { display: flex; justify-content: space-between; align-items: center; }
.itin-dest { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 8px 0 5px; }
.itin-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--ink-2); }
.itin-meta b { color: var(--accent); }
.itin-flags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 11px; }
.empty { color: var(--ink-3); font-size: 13px; padding: 8px 0; }

.alts { display: flex; flex-direction: column; gap: 6px; }
.alt {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm);
  padding: 8px 12px; cursor: pointer; text-align: left; transition: all var(--t1) var(--ease);
}
.alt:hover { border-color: var(--hairline-2); transform: translateX(2px); }
.alt.on { border-color: var(--accent-dim); background: var(--accent-soft); }
.alt-rank { font-size: 10.5px; color: var(--ink-3); }
.alt-name { flex: 1; font-weight: 500; font-size: 14px; color: var(--ink); }
.alt-meta { font-size: 11.5px; color: var(--amber); }
.alt-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
</style>
