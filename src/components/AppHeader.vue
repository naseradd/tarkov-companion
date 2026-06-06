<script setup lang="ts">
import { useGameStore } from '@/stores/game';
const game = useGameStore();
</script>

<template>
  <header class="hdr">
    <div class="brand">
      <span class="mark">EFT</span>
      <span class="sub">Field&nbsp;Terminal</span>
    </div>
    <div class="spacer"></div>

    <div class="seg">
      <span class="lbl">Mode</span>
      <button :class="{ on: game.mode === 'regular' }" @click="game.setMode('regular')">PvP</button>
      <button :class="{ on: game.mode === 'pve' }" @click="game.setMode('pve')">PvE</button>
    </div>

    <div class="seg">
      <span class="lbl">Faction</span>
      <button :class="{ on: game.faction === 'PMC' }" @click="game.setFaction('PMC')">PMC</button>
      <button :class="{ on: game.faction === 'Scav' }" @click="game.setFaction('Scav')">Scav</button>
    </div>

    <div class="status">
      <span class="dot"></span>
      <span>tarkov.dev · LIVE</span>
    </div>
  </header>
</template>

<style scoped>
.hdr { display: flex; align-items: center; gap: 16px; padding: 10px 18px; border-bottom: 1px solid var(--line); background: linear-gradient(180deg, #12150d, #0e110a); flex: 0 0 auto; }
.brand { display: flex; align-items: baseline; gap: 10px; }
.mark { font-family: var(--stencil); font-size: 20px; letter-spacing: 1px; color: var(--amber); text-shadow: 0 0 18px rgba(233, 161, 58, 0.25); }
.sub { font-family: var(--mono); font-size: 10px; letter-spacing: 3px; color: var(--dim); text-transform: uppercase; }
.spacer { flex: 1; }
.seg { display: inline-flex; border: 1px solid var(--line2); border-radius: 2px; overflow: hidden; background: #0e110a; }
.seg .lbl { font-family: var(--mono); font-size: 9px; color: var(--dim); align-self: center; padding: 0 8px 0 10px; letter-spacing: 1px; }
.seg button { font-family: var(--mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); background: transparent; border: 0; padding: 6px 12px; cursor: pointer; transition: 0.12s; }
.seg button.on { background: var(--acid); color: #13160f; font-weight: 700; }
.seg button:not(.on):hover { color: var(--txt); }
.status { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: 1px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@media (max-width: 720px) { .sub, .status span { display: none; } }
</style>
