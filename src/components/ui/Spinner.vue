<script setup lang="ts">
defineProps<{ label?: string; block?: boolean }>();
</script>

<template>
  <div class="loader" :class="{ block }">
    <span class="ring" />
    <span v-if="label" class="lbl">{{ label }}</span>
  </div>
</template>

<style scoped>
.loader { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-2); font-size: 13px; }
.loader.block { width: 100%; justify-content: center; padding: 56px 0; flex-direction: column; gap: 14px; }
.ring {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid var(--hairline-2);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
.lbl { letter-spacing: 0.3px; }
</style>
