<script setup lang="ts">
defineProps<{ icon?: string; title?: string }>();
</script>

<template>
  <div class="empty">
    <span v-if="icon" class="ic">{{ icon }}</span>
    <p class="t">{{ title }}</p>
    <p v-if="$slots.default" class="d"><slot /></p>
  </div>
</template>

<style scoped>
.empty { text-align: center; padding: 48px 24px; color: var(--ink-3); }
.ic { font-size: 30px; opacity: 0.55; display: block; margin-bottom: 10px; }
.t { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--ink-2); margin: 0 0 4px; }
.d { font-size: 13.5px; margin: 0; max-width: 380px; margin-inline: auto; }
</style>
