<script setup lang="ts">
import type { LayerState } from '@/components/TacticalMap.vue';

const props = defineProps<{ layers: LayerState; counts: { spawns: number; extracts: number; quests: number; transits: number } }>();
const emit = defineEmits<{ (e: 'update:layers', v: LayerState): void }>();

function toggle(k: keyof LayerState) {
  emit('update:layers', { ...props.layers, [k]: !props.layers[k] });
}

const items: { key: keyof LayerState; label: string; dot: string }[] = [
  { key: 'spawns', label: 'Spawns', dot: '#5e6b3a' },
  { key: 'extracts', label: 'Extractions', dot: 'var(--accent)' },
  { key: 'quests', label: 'Quêtes', dot: 'var(--amber)' },
  { key: 'transits', label: 'Transits', dot: 'var(--blue)' },
];
const extractKey = [
  { c: 'var(--positive)', l: 'Libre' },
  { c: 'var(--amber)', l: 'Conditionnelle' },
  { c: 'var(--blue)', l: 'Payante / Scav' },
  { c: 'var(--purple)', l: 'Partagée' },
  { c: 'var(--red)', l: 'Clé / mines' },
];
</script>

<template>
  <div class="legend">
    <div class="toggles">
      <button
        v-for="it in items"
        :key="it.key"
        class="lg-toggle"
        :class="{ off: !layers[it.key] }"
        @click="toggle(it.key)"
      >
        <span class="dot" :style="{ background: it.dot }" />
        {{ it.label }}
        <span class="cnt num">{{ counts[it.key] }}</span>
      </button>
    </div>
    <div class="key">
      <span class="key-lbl">Extractions :</span>
      <span v-for="k in extractKey" :key="k.l" class="key-item">
        <i :style="{ background: k.c }" />{{ k.l }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.legend { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.toggles { display: flex; flex-wrap: wrap; gap: 7px; }
.lg-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-pill);
  padding: 6px 12px; cursor: pointer; color: var(--ink); font-size: 13px;
  transition: all var(--t1) var(--ease);
}
.lg-toggle:hover { border-color: var(--hairline-2); }
.lg-toggle.off { opacity: 0.4; }
.lg-toggle .dot { width: 9px; height: 9px; border-radius: 50%; }
.lg-toggle .cnt { font-size: 11px; color: var(--ink-3); }
.key { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; font-size: 11.5px; color: var(--ink-3); }
.key-lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
.key-item { display: inline-flex; align-items: center; gap: 5px; }
.key-item i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
</style>
