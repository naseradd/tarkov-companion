// Planificateur de raid : joint le graphe de quêtes à la boucle réelle du joueur.
// « Où aller ? » = classement des cartes par objectifs actionnables maintenant.
// « Quoi faire là-bas ? » = brief par carte (objectifs, clés, items à apporter / trouver, cibles).
// Tout dérive des quêtes FAISABLES (isAvailable + reachable) et des objectifs non cochés.

import type { Task, TaskObjective, ObjItem } from '@/lib/tarkov';
import { isAvailable, reachableSet, type PlayerState } from '@/lib/progression';

export interface MapScore {
  norm: string;
  name: string;
  quests: number;
  objectives: number;
  xp: number;
  kappa: number;
  pinned: number;
  keys: number;
}

export interface BriefQuest {
  task: Task;
  /** Objectifs non cochés de la quête, avec marquage « ici / ailleurs / partout ». */
  objectives: { o: TaskObjective; where: 'here' | 'elsewhere' | 'anywhere' }[];
  pinned: boolean;
}

export interface BriefItem { item: ObjItem; count: number; fir: boolean; quests: string[] }
export interface BriefKey { item: ObjItem; quests: string[]; altCount: number }
export interface BriefTarget { desc: string; count: number | null; quest: string }

export interface RaidBrief {
  quests: BriefQuest[];
  keys: BriefKey[];
  bring: BriefItem[];   // marqueurs / items à planter — DOIVENT être dans le rig au départ
  find: BriefItem[];    // items à looter ici (souvent FiR)
  targets: BriefTarget[];
  xp: number;
}

const objOnMap = (o: TaskObjective, norm: string) => !!o.maps?.length && o.maps.some((m) => m.normalizedName === norm);
const objAnywhere = (o: TaskObjective) => !o.maps?.length;

/** Objectifs restants (non cochés, non optionnels) d'une quête. */
const remaining = (t: Task, objDone: Set<string>) => t.objectives.filter((o) => !objDone.has(o.id) && !o.optional);

/** Cartes où une quête a au moins un objectif restant localisé. */
function taskMaps(t: Task, objDone: Set<string>): Map<string, string> {
  const m = new Map<string, string>(); // norm -> name
  for (const o of remaining(t, objDone)) for (const mm of o.maps ?? []) m.set(mm.normalizedName, mm.name);
  // Quête localisée par tarkov.dev mais objectifs sans coordonnées : on respecte task.map.
  if (!m.size && t.map) m.set(t.map.normalizedName, t.map.name);
  return m;
}

export function rankMaps(tasks: Task[], p: PlayerState, objDone: Set<string>, pinned: Set<string>): MapScore[] {
  const reachable = reachableSet(tasks, p);
  const scores = new Map<string, MapScore>();
  for (const t of tasks) {
    if (!isAvailable(t, p, reachable)) continue;
    const maps = taskMaps(t, objDone);
    for (const [norm, name] of maps) {
      const s = scores.get(norm) ?? { norm, name, quests: 0, objectives: 0, xp: 0, kappa: 0, pinned: 0, keys: 0 };
      s.quests += 1;
      s.xp += t.experience ?? 0;
      if (t.kappaRequired) s.kappa += 1;
      if (pinned.has(t.id)) s.pinned += 1;
      for (const o of remaining(t, objDone)) {
        if (!objOnMap(o, norm)) continue;
        s.objectives += 1;
        if (o.requiredKeys?.length) s.keys += o.requiredKeys.length;
      }
      scores.set(norm, s);
    }
  }
  // Épinglées d'abord (le focus du joueur prime), puis volume de quêtes, puis XP.
  return [...scores.values()].sort((a, b) => b.pinned - a.pinned || b.quests - a.quests || b.xp - a.xp);
}

export function buildBrief(tasks: Task[], p: PlayerState, objDone: Set<string>, pinned: Set<string>, mapNorm: string): RaidBrief {
  const reachable = reachableSet(tasks, p);
  const quests: BriefQuest[] = [];
  const keys = new Map<string, BriefKey>();
  const bring = new Map<string, BriefItem>();
  const find = new Map<string, BriefItem>();
  const targets: BriefTarget[] = [];
  let xp = 0;

  const addItem = (m: Map<string, BriefItem>, it: ObjItem, count: number, fir: boolean, quest: string) => {
    const e = m.get(it.id);
    if (e) { e.count += count; if (fir) e.fir = true; if (!e.quests.includes(quest)) e.quests.push(quest); }
    else m.set(it.id, { item: it, count, fir, quests: [quest] });
  };

  for (const t of tasks) {
    if (!isAvailable(t, p, reachable)) continue;
    if (!taskMaps(t, objDone).has(mapNorm)) continue;
    const objs = t.objectives
      .filter((o) => !objDone.has(o.id))
      .map((o) => ({
        o,
        where: (objOnMap(o, mapNorm) ? 'here' : objAnywhere(o) ? 'anywhere' : 'elsewhere') as 'here' | 'elsewhere' | 'anywhere',
      }));
    quests.push({ task: t, objectives: objs, pinned: pinned.has(t.id) });
    xp += t.experience ?? 0;

    for (const { o, where } of objs) {
      if (where !== 'here' || o.optional) continue;
      for (const grp of o.requiredKeys ?? []) {
        const k = grp[0];
        if (!k) continue;
        const e = keys.get(k.id);
        if (e) { if (!e.quests.includes(t.name)) e.quests.push(t.name); }
        else keys.set(k.id, { item: k, quests: [t.name], altCount: grp.length - 1 });
      }
      if (o.type === 'mark' && o.markerItem) addItem(bring, o.markerItem, 1, false, t.name);
      else if (o.type === 'plantItem' && o.items?.length) addItem(bring, o.items[0], o.count ?? 1, false, t.name);
      else if (o.items?.length && (o.type === 'findItem' || o.type === 'giveItem')) addItem(find, o.items[0], o.count ?? 1, !!o.foundInRaid, t.name);
      else if (o.type === 'shoot') targets.push({ desc: o.description, count: o.count ?? null, quest: t.name });
    }
  }

  // Focus du joueur en tête, puis poids Kappa, puis XP.
  quests.sort((a, b) =>
    Number(b.pinned) - Number(a.pinned) ||
    Number(!!b.task.kappaRequired) - Number(!!a.task.kappaRequired) ||
    (b.task.experience ?? 0) - (a.task.experience ?? 0),
  );

  return { quests, keys: [...keys.values()], bring: [...bring.values()], find: [...find.values()], targets, xp };
}

/** Quêtes faisables sans aucun objectif localisé : avancent depuis n'importe quel raid. */
export function anywhereQuests(tasks: Task[], p: PlayerState, objDone: Set<string>): Task[] {
  const reachable = reachableSet(tasks, p);
  return tasks.filter((t) => isAvailable(t, p, reachable) && taskMaps(t, objDone).size === 0);
}
