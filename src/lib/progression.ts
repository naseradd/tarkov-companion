// Logique de progression : éligibilité des quêtes (DAG), prochain blocage,
// liste d'items à hoard agrégée, phase de wipe.

import type { Task, TraderFull, HideoutStation } from '@/lib/tarkov';
import type { Faction } from '@/lib/tarkov';

export interface PlayerState {
  level: number;
  faction: Faction;
  prestige: number;
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
  /** Prérequis de statut 'active' encore inatteignables : il faut d'abord pouvoir les lancer. */
  activePrereqs: { id: string; name: string }[];
  traderGates: TraderGate[];
  /** Quêtes qui doivent avoir échoué (branche alternative) — informatif, non bloquant. */
  altBranch: { id: string; name: string }[];
}

// tarkov.dev : un prérequis peut exiger plusieurs états (n'importe lequel suffit).
const reqIsActiveOnly = (st: string[]) => st.includes('active') && !st.includes('complete');
const reqIsFailedOnly = (st: string[]) => st.includes('failed') && !st.includes('complete') && !st.includes('active');

/** Gates « durs » HORS prérequis 'active' : faction, niveau, LL marchand, prérequis 'complete'.
 *  Base de l'atteignabilité : une quête faisable ou faite satisfait un prérequis de statut 'active'. */
function hardGatesMet(task: Task, p: PlayerState): boolean {
  if (!factionMatch(task.factionName, p.faction)) return false;
  if (task.minPlayerLevel && p.level < task.minPlayerLevel) return false;
  if (task.requiredPrestige && task.requiredPrestige.prestigeLevel > p.prestige) return false;
  for (const tr of task.traderRequirements ?? []) {
    if (tr.trader && tr.requirementType === 'level' && !compareNum(p.traderLL(tr.trader.normalizedName), tr.compareMethod, tr.value)) return false;
  }
  for (const r of task.taskRequirements ?? []) {
    if (!r.task) continue;
    const st = r.status ?? ['complete'];
    if (reqIsActiveOnly(st) || reqIsFailedOnly(st)) continue; // ignorés pour l'atteignabilité
    if (!p.completed.has(r.task.id)) return false; // prérequis 'complete'
  }
  return true;
}

/** Quêtes « atteignables » = déjà faites OU lançables maintenant (sans tenir compte des prérequis 'active').
 *  Un prérequis 'active' (ex. Kind of Sabotage ← Supply Plans) est satisfait si la quête citée est ici :
 *  en jeu, la suite se débloque dès que le prérequis est lancé, pas seulement terminé. */
export function reachableSet(tasks: Task[], p: PlayerState): Set<string> {
  const out = new Set<string>();
  for (const t of tasks) if (p.completed.has(t.id) || hardGatesMet(t, p)) out.add(t.id);
  return out;
}

export function taskInfo(task: Task, p: PlayerState, reachable?: Set<string>): TaskInfo {
  if (p.completed.has(task.id)) return { state: 'done', lockReasons: [], missingPrereqs: [], activePrereqs: [], traderGates: [], altBranch: [] };
  const reasons: string[] = [];
  const missing: { id: string; name: string }[] = [];
  const activePrereqs: { id: string; name: string }[] = [];
  const altBranch: { id: string; name: string }[] = [];

  if (!factionMatch(task.factionName, p.faction)) reasons.push(`Faction ${task.factionName}`);
  if (task.minPlayerLevel && p.level < task.minPlayerLevel) reasons.push(`Niveau ${task.minPlayerLevel} requis`);
  if (task.requiredPrestige && task.requiredPrestige.prestigeLevel > p.prestige) reasons.push(`Prestige ${task.requiredPrestige.prestigeLevel}`);

  for (const r of task.taskRequirements ?? []) {
    if (!r.task) continue;
    const st = r.status ?? ['complete'];
    if (reqIsFailedOnly(st)) { altBranch.push({ id: r.task.id, name: r.task.name }); continue; }
    if (reqIsActiveOnly(st)) {
      // Débloqué dès que le prérequis est lancé : satisfait s'il est atteignable (faisable ou fait).
      const ok = reachable ? reachable.has(r.task.id) : p.completed.has(r.task.id);
      if (!ok) activePrereqs.push({ id: r.task.id, name: r.task.name });
      continue;
    }
    // 'complete' (ou complete+failed) : complétion requise
    if (!p.completed.has(r.task.id)) missing.push({ id: r.task.id, name: r.task.name });
  }
  if (missing.length) reasons.push(`${missing.length} prérequis`);
  if (activePrereqs.length) reasons.push(`${activePrereqs.length} à lancer d'abord`);

  const traderGates = evalTraderGates(task, p);
  for (const g of traderGates) if (g.verifiable && !g.met) reasons.push(`${g.trader} LL${g.value}`);

  return { state: reasons.length ? 'locked' : 'available', lockReasons: reasons, missingPrereqs: missing, activePrereqs, traderGates, altBranch };
}

export const isAvailable = (task: Task, p: PlayerState, reachable?: Set<string>): boolean =>
  taskInfo(task, p, reachable).state === 'available';

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
  const reachable = reachableSet(tasks, p);
  const flag = (t: Task) => (kind === 'kappa' ? t.kappaRequired : t.lightkeeperRequired);
  const arc = tasks.filter(flag);
  const done = arc.filter((t) => p.completed.has(t.id)).length;
  const frontier = arc
    .filter((t) => isAvailable(t, p, reachable))
    .sort((a, b) => (a.minPlayerLevel ?? 0) - (b.minPlayerLevel ?? 0));
  return {
    done,
    total: arc.length,
    pct: arc.length ? Math.round((done / arc.length) * 100) : 0,
    frontier,
    locked: Math.max(0, arc.length - done - frontier.length),
  };
}

/* ----------------- Ordre recommandé d'un arc -------------------- */
// Quêtes non faites d'un arc (kappa/LK), triées par profondeur de dépendance puis niveau :
// un « chemin » lisible plutôt qu'une liste plate. profondeur = plus longue chaîne de
// prérequis (statut complete) à l'intérieur de l'arc.

export interface OrderedQuest { task: Task; depth: number; state: TaskState; }

export function recommendedOrder(tasks: Task[], p: PlayerState, kind: 'kappa' | 'lightkeeper'): OrderedQuest[] {
  const flag = (t: Task) => (kind === 'kappa' ? t.kappaRequired : t.lightkeeperRequired);
  const arc = tasks.filter(flag);
  const arcIds = new Set(arc.map((t) => t.id));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const cache = new Map<string, number>();
  const depth = (t: Task, seen: Set<string>): number => {
    const hit = cache.get(t.id);
    if (hit != null) return hit;
    if (seen.has(t.id)) return 0; // garde-fou cycle
    seen.add(t.id);
    let d = 0;
    for (const r of t.taskRequirements ?? []) {
      const pre = r.task ? byId.get(r.task.id) : undefined;
      if (pre && arcIds.has(pre.id)) d = Math.max(d, 1 + depth(pre, seen));
    }
    seen.delete(t.id);
    cache.set(t.id, d);
    return d;
  };
  const reachable = reachableSet(tasks, p);
  return arc
    .filter((t) => !p.completed.has(t.id))
    .map((t) => ({ task: t, depth: depth(t, new Set()), state: taskInfo(t, p, reachable).state }))
    .sort((a, b) =>
      (a.task.minPlayerLevel ?? 0) - (b.task.minPlayerLevel ?? 0) ||
      a.depth - b.depth ||
      a.task.name.localeCompare(b.task.name),
    );
}

/* ------------------- Réputation par marchand --------------------- */
// Quêtes qui octroient de la standing positive à un marchand (pour les pages trader).

export interface RepQuest { task: Task; standing: number; state: TaskState; }

export function traderStandingQuests(tasks: Task[], traderName: string, p: PlayerState): RepQuest[] {
  const reachable = reachableSet(tasks, p);
  const out: RepQuest[] = [];
  for (const t of tasks) {
    const st = (t.finishRewards?.traderStanding ?? []).find((s) => s.trader?.name === traderName);
    if (!st || st.standing <= 0) continue;
    out.push({ task: t, standing: st.standing, state: taskInfo(t, p, reachable).state });
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
  const reachable = reachableSet(tasks, p);
  const map = new Map<string, ActiveItem>();
  const CURRENCY = /^(roubles|euros|dollars|rub|eur|usd|₽|\$|€)$/i;
  for (const t of tasks) {
    if (!isAvailable(t, p, reachable)) continue;
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

  const reachable = reachableSet(tasks, p);
  const avail = tasks.filter((t) => isAvailable(t, p, reachable));
  out.push({
    type: avail.length ? 'quest' : 'clear',
    title: avail.length ? `${avail.length} quêtes faisables maintenant` : 'Aucune quête bloquée par le niveau',
    detail: avail.length ? 'Planifie ton prochain raid pour les avancer' : 'Monte ton niveau / tes marchands',
    to: avail.length ? '/raid' : '/quetes',
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
