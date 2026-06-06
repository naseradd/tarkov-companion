<script setup lang="ts">
interface Opt { value: string; label: string }
defineProps<{ modelValue: string; options: Opt[]; size?: 'sm' | 'md' }>();
defineEmits<{ (e: 'update:modelValue', v: string): void }>();
</script>

<template>
  <div class="seg" :class="size || 'md'" role="tablist">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === o.value"
      class="seg-btn"
      :class="{ on: modelValue === o.value }"
      @click="$emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  padding: 3px;
  gap: 2px;
}
.seg-btn {
  font-family: var(--font-sans);
  font-weight: 500;
  color: var(--ink-2);
  background: transparent;
  border: none;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition: all var(--t1) var(--ease);
  white-space: nowrap;
}
.md .seg-btn { font-size: 13.5px; padding: 6px 16px; }
.sm .seg-btn { font-size: 12.5px; padding: 4px 12px; }
.seg-btn:hover { color: var(--ink); }
.seg-btn.on { background: var(--accent); color: var(--ink-on-accent); font-weight: 600; box-shadow: var(--shadow-accent); }
</style>
