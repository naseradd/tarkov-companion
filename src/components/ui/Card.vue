<script setup lang="ts">
withDefaults(
  defineProps<{ tone?: 'surface' | 'raised' | 'inset'; pad?: boolean; interactive?: boolean; glow?: boolean }>(),
  { tone: 'raised', pad: true },
);
</script>

<template>
  <div class="card" :class="[tone, { pad, interactive, glow }]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  position: relative;
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-sm);
  transition: transform var(--t1) var(--ease), box-shadow var(--t1) var(--ease), border-color var(--t1) var(--ease);
}
.surface { background: var(--surface); }
.raised { background: linear-gradient(180deg, var(--raised), var(--surface)); }
.inset { background: var(--canvas); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.45); border-color: var(--hairline); }
.pad { padding: 18px; }
.glow { box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-md), var(--shadow-accent); border-color: var(--accent-dim); }
.interactive { cursor: pointer; }
.interactive:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-md); border-color: var(--hairline-2); }
</style>
