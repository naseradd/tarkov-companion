<script setup lang="ts">
withDefaults(defineProps<{ w?: string; h?: string; radius?: string }>(), { w: '100%', h: '16px' });
</script>

<template>
  <span class="sk" :style="{ width: w, height: h, borderRadius: radius || 'var(--r-xs)' }" />
</template>

<style scoped>
.sk {
  display: block;
  position: relative;
  overflow: hidden;
  background: var(--surface-2);
}
.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(236, 240, 226, 0.06), transparent);
  animation: shimmer 1.4s var(--ease) infinite;
}
</style>
