// Logique de progression : éligibilité des quêtes (DAG), prochain blocage,
// liste d'items à hoard agrégée, phase de wipe.

import type { Task, TraderFull, HideoutStation } from '@/lib/tarkov';
import type { Faction } from '@/lib/tarkov';

export interface PlayerState {
  level: number;
  faction: Faction;
  completed: Set<string>;
  traderLL: (normalizedName: string) => number;
  hideoutLevel: (normalizedName: string) => number;
}

/* ----------------------------- Quêtes ----------------------------- */

export function factionMatch(taskFaction: string | null, player: Faction): boolean {
  if (!taskFaction || taskFaction === 'Any') return true;
  if (player === 'PMC') return taskFaction === 'USEC' || taskFaction === 'BEAR';
  return false; // Scav : seulement les tâches Any/null
}

const CMP: Record<string, (a: number, b: number) => boolean> = {
  '>=': (a, b) => a >= b,
  '>': (a, b) => a > b,
  '=': (a, b) => a === b,
  '==': (a, b) => a === b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
};
const compareNum = (a: number, method: string, b: number) => (CMP[method] ?? CMP['>='])(a, b);

/** Gate marchand évalué pour le joueur. Seul `level` est vérifiable (LL trackée) ;
 *  réputation/commerce sont informatifs (non trackés numériquement) → supposés remplis. */
export interface TraderGate {
  trader: string;
  normalizedName: string;
  type: string; // 'level' | 'reputation' | 'commerce'
  cmp: string;
  value: number;
  met: boolean;
  verifiable: boolean;
}

function evalTraderGates(task: Task, p: PlayerState): TraderGate[] {
  const out: TraderGate[] = [];
  for (const tr of task.traderRequirements ?? []) {
    if (!tr.trader) continue;
    if (tr.requirementType === 'level') {
      const cur = p.traderLL(tr.trader.normalizedName);
      out.push({ trader: tr.trader.name, normalizedName: tr.trader.normalizedName, type: 'level', cmp: tr.compareMethod, value: tr.value, met: compareNum(cur, tr.compareMethod, tr.value), verifiable: true });
    } else {
      out.push({ trader: tr.trader.name, normalizedName: tr.trader.normalizedName, type: tr.requirementType, cmp: tr.compareMethod, value: tr.value, met: true, verifiable: false });
    }
  }
  return out;
}

export type TaskState = 'done' | 'available' | 'locked';

export interface TaskInfo {
  state: TaskState;
  lockReasons: string[];
  missingPrereqs: { id: string; name: string }[];
  traderGates: TraderGate[];
  /** Quêtes qui doivent avoir échoué (branche alternative) — informatif, non bloquant. */
  altBranch: { id: string; name: string }[];
}

export function taskInfo(task: Task, p: PlayerState): TaskInfo {
  if (p.completed.has(task.id)) return { state: 'done', lockReasons: [], missingPrereqs: [], traderGates: [], altBranch: [] };
  const reasons: string[] = [];
  const missing: { id: string; name: string }[] = [];
  const altBranch: { id: string; name: string }[] = [];

  if (!factionMatch(task.factionName, p.faction)) reasons.push(`Faction ${task.factionName}`);
  if (task.minPlayerLevel && p.level < task.minPlayerLevel) reasons.push(`Niveau ${task.minPlayerLevel} requis`);

  for (const r of task.taskRequirements ?? []) {
    if (!r.task) continue;
    const st = r.status ?? ['complete'];
    // status 'failed' sans 'complete' = branche alternative (l'autre quête doit être ratée) : non bloquant
    if (st.includes('failed') && !st.includes('complete')) { altBranch.push({ id: r.task.id, name: r.task.name }); continue; }
    // 'complete' et 'active' : on exige la complétion du prérequis (seul l'état complété est tracké)
    if (!p.completed.has(r.task.id)) missing.push({ id: r.task.id, name: r.task.name });
  }
  if (missing.length) reasons.push(`${missing.length} prérequis`);

  const traderGates = evalTraderGates(task, p);
  for (const g of traderGates) if (g.verifiable && !g.met) reasons.push(`${g.trader} LL${g.value}`);

  return { state: reasons.length ? 'locked' : 'available', lockReasons: reasons, missingPrereqs: missing, traderGates, altBranch };
}

export const isAvailable = (task: Task, p: PlayerState): boolean => taskInfo(task, p).state === 'available';

/** Quête a un effet de réputation négatif sur un marchand. */
export function negativeRep(task: Task): { trader: string; standing: number }[] {
  return (task.finishRewards?.traderStanding ?? [])
    .filter((s) => s.standing < 0 && s.trader)
    .map((s) => ({ trader: s.trader!.name, standing: s.standing }));
}

/* --------------------------- Kappa / LK --------------------------- */

export interface Progress { done: number; total: number; pct: number; }

export function kappaProgress(tasks: Task[], completed: Set<string>): Progress {
  const k = tasks.filter((t) => t.kappaRequired);
  const done = k.filter((t) => completed.has(t.id)).length;
  return { done, total: k.length, pct: k.length ? Math.round((done / k.length) * 100) : 0 };
}
export function lightkeeperProgress(tasks: Task[], completed: Set<string>): Progress {
  const k = tasks.filter((t) => t.lightkeeperRequired);
  const done = k.filter((t) => completed.has(t.id)).length;
  return { done, total: k.length, pct: k.length ? Math.round((done / k.length) * 100) : 0 };
}

/* ----------------------- Trame principale ------------------------ */
// La « trame principale » d'EFT = le chemin Collector/Kappa et l'arc Lightkeeper.
// 100 % data-driven (flags kappaRequired / lightkeeperRequired de tarkov.dev).

export interface StoryArc {
  done: number;
  total: number;
  pct: number;
  frontier: Task[]; // quêtes de la trame faisables maintenant (le « front »)
  locked: number;   // quêtes de la trame encore verrouillées
}

export function storyArc(tasks: Task[], p: PlayerState, kind: 'kappa' | 'lightkeeper'): StoryArc {
  const flag = (t: Task) => (kind === 'kappa' ? t.kappaRequired : t.lightkeeperRequired);
  const arc = tasks.filter(flag);
  const done = arc.filter((t) => p.completed.has(t.id)).length;
  const frontier = arc
    .filter((t) => isAvailable(t, p))
    .sort((a, b) => (a.minPlayerLevel ?? 0) - (b.minPlayerLevel ?? 0));
  return {
    done,
    total: arc.length,
    pct: arc.length ? Math.round((done / arc.length) * 100) : 0,
    frontier,
    locked: Math.max(0, arc.length - done - frontier.length),
  };
}

/* ------------------- Réputation par marchand --------------------- */
// Quêtes qui octroient de la standing positive à un marchand (pour les pages trader).

export interface RepQuest { task: Task; standing: number; state: TaskState; }

export function traderStandingQuests(tasks: Task[], traderName: string, p: PlayerState): RepQuest[] {
  const out: RepQuest[] = [];
  for (const t of tasks) {
    const st = (t.finishRewards?.traderStanding ?? []).find((s) => s.trader?.name === traderName);
    if (!st || st.standing <= 0) continue;
    out.push({ task: t, standing: st.standing, state: taskInfo(t, p).state });
  }
  const rank: Record<TaskState, number> = { available: 0, locked: 1, done: 2 };
  return out.sort((a, b) => rank[a.state] - rank[b.state] || b.standing - a.standing);
}

/* --------------- Items à garder pour quêtes actives -------------- */
// Items requis par les quêtes FAISABLES MAINTENANT (le front), avec quêtes + cartes.

export interface ActiveItem {
  id: string;
  name: string;
  icon: string | null;
  count: number;
  fir: boolean;
  quests: string[];
  maps: string[];
}

export function activeQuestItems(tasks: Task[], p: PlayerState): ActiveItem[] {
  const map = new Map<string, ActiveItem>();
  const CURRENCY = /^(roubles|euros|dollars|rub|eur|usd|₽|\$|€)$/i;
  for (const t of tasks) {
    if (!isAvailable(t, p)) continue;
    for (const o of t.objectives) {
      if (!o.items?.length) continue;
      const mapsForObj = (o.maps ?? []).map((m) => m.name);
      for (const it of o.items) {
        if (CURRENCY.test(it.name)) continue;
        const e = map.get(it.id);
        if (e) {
          e.count += o.count ?? 1;
          if (o.foundInRaid) e.fir = true;
          if (!e.quests.includes(t.name)) e.quests.push(t.name);
          for (const m of mapsForObj) if (!e.maps.includes(m)) e.maps.push(m);
        } else {
          map.set(it.id, {
            id: it.id, name: it.shortName || it.name, icon: it.iconLink,
            count: o.count ?? 1, fir: !!o.foundInRaid, quests: [t.name], maps: [...mapsForObj],
          });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.quests.length - a.quests.length || b.count - a.count);
}

/* --------------------------- Bottleneck --------------------------- */

export const FLEA_LEVEL = 15;

export interface Bottleneck {
  type: 'flea' | 'trader' | 'quest' | 'clear';
  title: string;
  detail: string;
  progressPct?: number;
  to?: string;
}

export function nextBottlenecks(tasks: Task[], traders: TraderFull[], p: PlayerState): Bottleneck[] {
  const out: Bottleneck[] = [];

  if (p.level < FLEA_LEVEL) {
    out.push({
      type: 'flea',
      title: 'Débloquer le Flea Market',
      detail: `Niveau ${p.level} / ${FLEA_LEVEL}, ${FLEA_LEVEL - p.level} niveau(x) restant(s)`,
      progressPct: Math.round((p.level / FLEA_LEVEL) * 100),
      to: '/config',
    });
  }

  for (const t of traders) {
    const cur = p.traderLL(t.normalizedName);
    const next = t.levels.find((l) => l.level === cur + 1);
    if (!next) continue;
    const needLvl = next.requiredPlayerLevel ?? 0;
    // On signale le palier marchand quand le niveau PMC est le frein.
    // La loyauté demande aussi réputation + commerce dépensé (voir la fiche marchand).
    if (needLvl > p.level) {
      out.push({
        type: 'trader',
        title: `${t.name} LL${next.level}`,
        detail: `Niveau PMC ${p.level} / ${needLvl} (+ rép & commerce)`,
        progressPct: Math.round((p.level / needLvl) * 100),
        to: `/marchands/${t.normalizedName}`,
      });
    }
  }

  const avail = tasks.filter((t) => isAvailable(t, p));
  out.push({
    type: avail.length ? 'quest' : 'clear',
    title: avail.length ? `${avail.length} quêtes faisables maintenant` : 'Aucune quête bloquée par le niveau',
    detail: avail.length ? 'Ouvre le module Quêtes pour les voir' : 'Monte ton niveau / tes marchands',
    to: '/quetes',
  });

  return out
    .sort((a, b) => (b.progressPct ?? 200) - (a.progressPct ?? 200))
    .slice(0, 4);
}

/* --------------------------- Hoard list --------------------------- */

export interface HoardEntry {
  id: string;
  name: string;
  icon: string | null;
  count: number;
  fir: boolean;
  sources: string[];
  neededForN: number;
}

export function hoardList(tasks: Task[], stations: HideoutStation[], p: PlayerState): HoardEntry[] {
  const map = new Map<string, HoardEntry>();

  const CURRENCY = /^(roubles|euros|dollars|rub|eur|usd|₽|\$|€)$/i;
  const add = (id: string, name: string, icon: string | null, count: number, fir: boolean, source: string) => {
    if (CURRENCY.test(name)) return; // la monnaie n'est pas un item à hoard
    const e = map.get(id);
    if (e) {
      e.count += count;
      if (fir) e.fir = true;
      if (!e.sources.includes(source)) e.sources.push(source);
      e.neededForN = e.sources.length;
    } else {
      map.set(id, { id, name, icon, count, fir, sources: [source], neededForN: 1 });
    }
  };

  // quêtes incomplètes et disponibles
  for (const t of tasks) {
    if (p.completed.has(t.id) || !factionMatch(t.factionName, p.faction)) continue;
    for (const o of t.objectives) {
      if (!o.items?.length) continue;
      for (const it of o.items) add(it.id, it.shortName || it.name, it.iconLink, o.count ?? 1, !!o.foundInRaid, t.name);
    }
  }

  // niveaux hideout non construits
  for (const s of stations) {
    const built = p.hideoutLevel(s.normalizedName);
    for (const lv of s.levels) {
      if (lv.level <= built) continue;
      for (const r of lv.itemRequirements) add(r.item.id, r.item.shortName || r.item.name, r.item.iconLink, r.count, false, `${s.name} N${lv.level}`);
    }
  }

  return [...map.values()].sort((a, b) => b.neededForN - a.neededForN || b.count - a.count);
}

/* --------------------------- Phase wipe --------------------------- */

export function wipePhase(level: number, kappaPct: number): { phase: 'early' | 'mid' | 'late'; label: string; advice: string } {
  if (level < FLEA_LEVEL) return { phase: 'early', label: 'Début de wipe', advice: 'Survivre + quêtes starter, atteindre le niveau 15 pour le flea.' };
  if (level < 40 && kappaPct < 60) return { phase: 'mid', label: 'Milieu de wipe', advice: 'Loyauté marchands, build hideout, accès aux munitions meta.' };
  return { phase: 'late', label: 'Fin de wipe', advice: 'Grind Collector/Kappa (turn-ins FiR), Lightkeeper, prestige.' };
}
