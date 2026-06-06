<script setup lang="ts">
withDefaults(
  defineProps<{ variant?: 'info' | 'accent' | 'amber' | 'kappa' | 'lk' | 'fir' | 'quest' | 'danger' | 'good' | 'blue' | 'purple' }>(),
  { variant: 'info' },
);
</script>

<template>
  <span class="badge" :class="variant"><slot /></span>
</template>

<style scoped>
.badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.4px;
  padding: 3px 8px;
  border-radius: var(--r-xs);
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  line-height: 1.3;
}
.info { color: var(--ink-2); border-color: var(--hairline-2); background: var(--surface-2); }
.accent { color: var(--accent); border-color: var(--accent-dim); background: var(--accent-soft); }
.amber, .kappa { color: var(--amber); border-color: #5c4517; background: var(--amber-soft); }
.lk, .blue { color: var(--blue); border-color: #294a63; background: rgba(107, 179, 236, 0.1); }
.fir, .good { color: var(--positive); border-color: #33491f; background: rgba(143, 206, 84, 0.1); }
.quest, .danger { color: var(--red); border-color: #5a2a20; background: var(--red-soft); }
.purple { color: var(--purple); border-color: #443060; background: rgba(167, 139, 255, 0.1); }
</style>
