<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';

const game = useGameStore();
defineEmits<{ (e: 'open-palette'): void }>();

const factionOpts = [
  { value: 'PMC', label: 'PMC' },
  { value: 'Scav', label: 'Scav' },
];
</script>

<template>
  <header class="hdr">
    <RouterLink to="/" class="brand">
      <span class="mark">◈</span>
      <span class="word">
        <span class="w1">EFT</span>
        <span class="w2">Field Terminal</span>
      </span>
    </RouterLink>

    <button class="cmdk" aria-label="Recherche rapide" @click="$emit('open-palette')">
      <span class="cmdk-ic">⌕</span>
      <span class="cmdk-lbl">Rechercher</span>
      <kbd>⌘K</kbd>
    </button>

    <div class="spacer" />

    <div class="ctrl">
      <span class="ctrl-lbl">Niveau</span>
      <div class="lvl">
        <button class="step" aria-label="-" @click="game.setLevel(game.level - 1)">–</button>
        <input
          class="lvl-in num"
          type="number"
          min="1"
          max="79"
          :value="game.level"
          @change="game.setLevel(Number(($event.target as HTMLInputElement).value))"
        />
        <button class="step" aria-label="+" @click="game.setLevel(game.level + 1)">+</button>
      </div>
    </div>

    <SegmentedControl
      :model-value="game.faction"
      :options="factionOpts"
      size="sm"
      @update:model-value="game.setFaction($event as any)"
    />

    <div class="status" title="Données live tarkov.dev">
      <span class="dot" />
      <span class="status-txt">live</span>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--hairline);
  background: linear-gradient(180deg, var(--surface), var(--canvas));
  flex: 0 0 auto;
  position: relative;
  z-index: 5;
}
.brand { display: flex; align-items: center; gap: 11px; color: var(--ink); }
.mark { font-size: 22px; color: var(--accent); filter: drop-shadow(0 0 10px var(--accent-glow)); }
.word { display: flex; flex-direction: column; line-height: 1; }
.w1 { font-family: var(--stencil); font-size: 17px; letter-spacing: 1px; color: var(--ink); }
.w2 { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--ink-3); margin-top: 3px; }

.cmdk {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  padding: 7px 8px 7px 13px;
  color: var(--ink-3);
  cursor: pointer;
  transition: all var(--t1) var(--ease);
  margin-left: 8px;
}
.cmdk:hover { border-color: var(--hairline-2); color: var(--ink-2); }
.cmdk-ic { font-size: 14px; }
.cmdk-lbl { font-size: 13px; }
.cmdk kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--surface-2);
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-xs);
  padding: 2px 6px;
  color: var(--ink-2);
}
.spacer { flex: 1; }

.ctrl { display: flex; align-items: center; gap: 9px; }
.ctrl-lbl { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-3); }
.lvl { display: inline-flex; align-items: center; background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--r-pill); padding: 2px; }
.step {
  width: 24px; height: 24px;
  border: none; background: transparent; color: var(--ink-2);
  cursor: pointer; border-radius: var(--r-pill); font-size: 15px; line-height: 1;
  transition: all var(--t1) var(--ease);
}
.step:hover { background: var(--surface-2); color: var(--accent); }
.lvl-in {
  width: 38px; text-align: center; background: transparent; border: none;
  color: var(--ink); font-size: 14px; font-weight: 600; -moz-appearance: textfield;
}
.lvl-in::-webkit-inner-spin-button, .lvl-in::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.lvl-in:focus { outline: none; }

.status { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-3); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--positive); box-shadow: 0 0 8px var(--positive); }

@media (max-width: 860px) {
  .cmdk-lbl, .w2, .ctrl-lbl, .status-txt { display: none; }
}
@media (max-width: 720px) {
  .hdr { gap: 10px; padding: 10px 14px; flex-wrap: wrap; }
}
</style>
