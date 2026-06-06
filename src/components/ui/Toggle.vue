<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string }>();
defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <label class="toggle">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      class="track"
      :class="{ on: modelValue }"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="thumb" />
    </button>
    <span v-if="label || $slots.default" class="lbl"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.toggle { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.track {
  width: 38px;
  height: 22px;
  border-radius: var(--r-pill);
  background: var(--canvas);
  border: 1px solid var(--hairline-2);
  padding: 2px;
  cursor: pointer;
  transition: background var(--t1) var(--ease), border-color var(--t1) var(--ease);
  flex: 0 0 auto;
}
.track.on { background: var(--accent); border-color: var(--accent); }
.thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ink-2);
  transition: transform var(--t2) var(--ease), background var(--t1) var(--ease);
}
.track.on .thumb { transform: translateX(16px); background: var(--ink-on-accent); }
.lbl { font-size: 13.5px; color: var(--ink-2); }
</style>
