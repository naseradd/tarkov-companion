<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <div class="loading">
    <div class="scanner"></div>
    <span>{{ label || 'CHARGEMENT…' }}</span>
  </div>
</template>

<style scoped>
.loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 0; gap: 14px; color: var(--muted); font-family: var(--mono); font-size: 12px; letter-spacing: 1px; }
.scanner { width: 200px; height: 3px; background: #1c2114; overflow: hidden; position: relative; }
.scanner::after { content: ''; position: absolute; inset: 0 60% 0 0; background: linear-gradient(90deg, transparent, var(--acid)); animation: scan 1.1s ease-in-out infinite; }
@keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(280%); } }
</style>
