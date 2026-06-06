<script setup lang="ts">
withDefaults(defineProps<{ label?: string; value?: string | number; tone?: 'default' | 'accent' | 'amber' | 'danger' }>(), {
  tone: 'default',
});
</script>

<template>
  <span class="stat">
    <b class="num" :class="tone"><slot name="value">{{ value }}</slot></b>
    <span class="lbl"><slot>{{ label }}</slot></span>
  </span>
</template>

<style scoped>
.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  padding: 5px 12px;
  white-space: nowrap;
}
.num { font-size: 14px; font-weight: 600; color: var(--ink); }
.num.accent { color: var(--accent); }
.num.amber { color: var(--amber); }
.num.danger { color: var(--red); }
.lbl { font-size: 12px; }
</style>
