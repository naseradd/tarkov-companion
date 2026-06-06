<script setup lang="ts">
defineProps<{ active?: boolean }>();
</script>

<template>
  <button type="button" class="chip" :class="{ on: active }">
    <slot name="icon" />
    <span class="lbl"><slot /></span>
  </button>
</template>

<style scoped>
.chip {
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  padding: 7px 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all var(--t1) var(--ease);
  white-space: nowrap;
}
.chip:hover { border-color: var(--hairline-2); color: var(--ink); transform: translateY(-1px); }
.chip.on {
  background: var(--accent);
  color: var(--ink-on-accent);
  border-color: var(--accent);
  font-weight: 600;
  box-shadow: var(--shadow-accent);
}
.chip :deep(img) { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; background: #000; }
.lbl { display: inline-flex; }
</style>
