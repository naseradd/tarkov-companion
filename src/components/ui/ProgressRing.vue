<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ value: number; size?: number; stroke?: number; color?: string }>(),
  { size: 96, stroke: 8, color: 'var(--accent)' },
);

const r = computed(() => (props.size - props.stroke) / 2);
const circ = computed(() => 2 * Math.PI * r.value);
const offset = computed(() => circ.value * (1 - Math.max(0, Math.min(100, props.value)) / 100));
</script>

<template>
  <div class="ring" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="var(--hairline)" :stroke-width="stroke" />
      <circle
        class="bar"
        :cx="size / 2"
        :cy="size / 2"
        :r="r"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circ"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div class="center"><slot /></div>
  </div>
</template>

<style scoped>
.ring { position: relative; display: inline-grid; place-items: center; }
.ring svg { position: absolute; inset: 0; }
.bar { transition: stroke-dashoffset var(--t3) var(--ease); filter: drop-shadow(0 0 4px var(--accent-glow)); }
.center { position: relative; display: grid; place-items: center; text-align: center; line-height: 1.1; }
</style>
