<script setup lang="ts">
import { computed } from 'vue';
import { raritySurface } from '@/lib/rarity';

const props = withDefaults(
  defineProps<{ src?: string | null; bg?: string | null; size?: number; alt?: string }>(),
  { size: 38 },
);
const style = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
  background: raritySurface(props.bg),
}));
</script>

<template>
  <div class="iconbox" :style="style">
    <img v-if="src" :src="src" :alt="alt || ''" loading="lazy" />
    <span v-else class="ph">?</span>
  </div>
</template>

<style scoped>
.iconbox {
  flex: 0 0 auto;
  border-radius: var(--r-xs);
  border: 1px solid var(--hairline);
  box-shadow: inset 0 1px 0 var(--highlight);
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 3px;
}
.iconbox img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ph { color: var(--ink-4); font-family: var(--font-mono); font-size: 14px; }
</style>
