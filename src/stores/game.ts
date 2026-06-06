import { defineStore } from 'pinia';
import type { GameMode, Faction } from '@/lib/tarkov';

const LS_MODE = 'eft.mode';
const LS_FACTION = 'eft.faction';
const LS_DONE = 'eft.completedTasks';

function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_DONE);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export const useGameStore = defineStore('game', {
  state: () => ({
    mode: (localStorage.getItem(LS_MODE) as GameMode) || ('regular' as GameMode),
    faction: (localStorage.getItem(LS_FACTION) as Faction) || ('PMC' as Faction),
    completed: loadDone(),
  }),
  getters: {
    isDone: (state) => (id: string) => state.completed.has(id),
    completedCount: (state) => state.completed.size,
  },
  actions: {
    setMode(m: GameMode) {
      this.mode = m;
      localStorage.setItem(LS_MODE, m);
    },
    setFaction(f: Faction) {
      this.faction = f;
      localStorage.setItem(LS_FACTION, f);
    },
    toggleDone(id: string) {
      if (this.completed.has(id)) this.completed.delete(id);
      else this.completed.add(id);
      // réassigner pour la réactivité fine + persister
      this.completed = new Set(this.completed);
      localStorage.setItem(LS_DONE, JSON.stringify([...this.completed]));
    },
    resetProgress() {
      this.completed = new Set();
      localStorage.removeItem(LS_DONE);
    },
  },
});
