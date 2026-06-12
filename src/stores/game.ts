import { defineStore } from 'pinia';
import type { Faction } from '@/lib/tarkov';

export type Density = 'condensed' | 'regular' | 'relaxed';

const LS = {
  faction: 'eft.faction',
  level: 'eft.level',
  traders: 'eft.traderLevels',
  hideout: 'eft.hideoutBuilt',
  done: 'eft.completedTasks',
  objDone: 'eft.objectivesDone',
  density: 'eft.density',
  prestige: 'eft.prestige',
  pinned: 'eft.pinnedTasks',
};

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function loadRecord(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
export const FLEA_LEVEL = 15;

export const useGameStore = defineStore('game', {
  state: () => ({
    faction: (localStorage.getItem(LS.faction) as Faction) || ('PMC' as Faction),
    level: Number(localStorage.getItem(LS.level)) || 1,
    traderLevels: loadRecord(LS.traders), // normalizedName -> LL (défaut 1)
    hideoutBuilt: loadRecord(LS.hideout), // normalizedName -> niveau construit (0 = non)
    completed: loadSet(LS.done), // task IDs
    objectivesDone: loadSet(LS.objDone), // objective IDs
    density: (localStorage.getItem(LS.density) as Density) || ('regular' as Density),
    prestige: Number(localStorage.getItem(LS.prestige)) || 0, // niveau de prestige (0 = aucun)
    pinned: loadSet(LS.pinned), // quêtes épinglées (focus du joueur)
  }),

  getters: {
    isDone: (s) => (id: string) => s.completed.has(id),
    objDone: (s) => (id: string) => s.objectivesDone.has(id),
    completedCount: (s) => s.completed.size,
    traderLL: (s) => (normalizedName: string) => s.traderLevels[normalizedName] ?? 1,
    hideoutLevel: (s) => (normalizedName: string) => s.hideoutBuilt[normalizedName] ?? 0,
    fleaUnlocked: (s) => s.level >= FLEA_LEVEL,
    isPinned: (s) => (id: string) => s.pinned.has(id),
  },

  actions: {
    setFaction(f: Faction) {
      this.faction = f;
      localStorage.setItem(LS.faction, f);
    },
    setLevel(n: number) {
      this.level = Math.max(1, Math.min(79, Math.round(n) || 1));
      localStorage.setItem(LS.level, String(this.level));
    },
    setTraderLevel(normalizedName: string, ll: number) {
      this.traderLevels = { ...this.traderLevels, [normalizedName]: ll };
      localStorage.setItem(LS.traders, JSON.stringify(this.traderLevels));
    },
    setHideoutLevel(normalizedName: string, level: number) {
      this.hideoutBuilt = { ...this.hideoutBuilt, [normalizedName]: Math.max(0, level) };
      localStorage.setItem(LS.hideout, JSON.stringify(this.hideoutBuilt));
    },
    toggleDone(id: string) {
      if (this.completed.has(id)) this.completed.delete(id);
      else this.completed.add(id);
      this.completed = new Set(this.completed);
      localStorage.setItem(LS.done, JSON.stringify([...this.completed]));
    },
    toggleObjective(id: string) {
      if (this.objectivesDone.has(id)) this.objectivesDone.delete(id);
      else this.objectivesDone.add(id);
      this.objectivesDone = new Set(this.objectivesDone);
      localStorage.setItem(LS.objDone, JSON.stringify([...this.objectivesDone]));
    },
    togglePin(id: string) {
      if (this.pinned.has(id)) this.pinned.delete(id);
      else this.pinned.add(id);
      this.pinned = new Set(this.pinned);
      localStorage.setItem(LS.pinned, JSON.stringify([...this.pinned]));
    },
    setDensity(d: Density) {
      this.density = d;
      localStorage.setItem(LS.density, d);
    },
    setPrestige(n: number) {
      this.prestige = Math.max(0, Math.min(5, Math.round(n) || 0));
      localStorage.setItem(LS.prestige, String(this.prestige));
    },
    /** New wipe / prestige : reset progression (garde la faction + density). */
    resetProgress() {
      this.level = 1;
      this.traderLevels = {};
      this.hideoutBuilt = {};
      this.completed = new Set();
      this.objectivesDone = new Set();
      this.pinned = new Set();
      localStorage.removeItem(LS.done);
      localStorage.removeItem(LS.objDone);
      localStorage.removeItem(LS.traders);
      localStorage.removeItem(LS.hideout);
      localStorage.removeItem(LS.pinned);
      localStorage.setItem(LS.level, '1');
    },
  },
});
