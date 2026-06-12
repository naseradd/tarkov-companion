// Sauvegarde & synchronisation de la progression — sans backend (GitHub Pages only).
// 1) Export / import JSON : backup manuel universel.
// 2) Sync opt-in vers un Gist GitHub PRIVÉ : PAT scope « gist » uniquement, stocké en
//    local. Multi-appareils via last-write-wins (timestamp savedAt). Les autres
//    utilisateurs restent en localStorage pur (zéro compte) — c'est strictement opt-in.

const STATE_KEYS = [
  'eft.faction',
  'eft.level',
  'eft.traderLevels',
  'eft.hideoutBuilt',
  'eft.completedTasks',
  'eft.objectivesDone',
  'eft.density',
  'eft.prestige',
  'eft.pinnedTasks',
];

const SYNC = { token: 'eft.sync.token', gist: 'eft.sync.gistId', savedAt: 'eft.sync.savedAt' };
const GIST_FILE = 'eft-field-terminal-save.json';
const API = 'https://api.github.com';

export interface SavePayload {
  app: 'eft-field-terminal';
  version: 1;
  savedAt: string; // ISO
  data: Record<string, string>;
}

/* ----------------------------- Snapshot ----------------------------- */

export function snapshot(): SavePayload {
  const data: Record<string, string> = {};
  for (const k of STATE_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  }
  return { app: 'eft-field-terminal', version: 1, savedAt: new Date().toISOString(), data };
}

function isPayload(x: unknown): x is SavePayload {
  const p = x as SavePayload;
  return !!p && p.app === 'eft-field-terminal' && p.version === 1 && typeof p.data === 'object' && p.data !== null;
}

/** Écrit la sauvegarde dans localStorage. L'appelant recharge la page pour réhydrater le store. */
export function applySnapshot(p: SavePayload): void {
  for (const k of STATE_KEYS) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(p.data)) if (STATE_KEYS.includes(k)) localStorage.setItem(k, v);
  localStorage.setItem(SYNC.savedAt, p.savedAt);
}

/* -------------------------- Export / import ------------------------- */

export function exportToFile(): void {
  const p = snapshot();
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eft-save-${p.savedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importFromFile(file: File): Promise<void> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!isPayload(parsed)) throw new Error('Fichier invalide : pas une sauvegarde EFT Field Terminal.');
  applySnapshot(parsed);
}

/* ----------------------------- Gist sync ---------------------------- */

export interface SyncState { token: string | null; gistId: string | null; savedAt: string | null }

export const getSync = (): SyncState => ({
  token: localStorage.getItem(SYNC.token),
  gistId: localStorage.getItem(SYNC.gist),
  savedAt: localStorage.getItem(SYNC.savedAt),
});

export function disconnectSync(): void {
  localStorage.removeItem(SYNC.token);
  localStorage.removeItem(SYNC.gist);
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
});

/** Crée le gist privé si besoin, sinon le met à jour. Retourne l'id. */
export async function pushToGist(token: string): Promise<string> {
  const p = snapshot();
  const body = JSON.stringify({
    description: 'EFT Field Terminal — sauvegarde de progression (sync auto)',
    public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(p, null, 2) } },
  });
  const gistId = localStorage.getItem(SYNC.gist);
  const res = gistId
    ? await fetch(`${API}/gists/${gistId}`, { method: 'PATCH', headers: headers(token), body })
    : await fetch(`${API}/gists`, { method: 'POST', headers: headers(token), body });
  if (!res.ok) {
    // gist supprimé côté GitHub → on en recrée un au prochain essai
    if (res.status === 404 && gistId) localStorage.removeItem(SYNC.gist);
    throw new Error(`GitHub ${res.status} — token invalide, scope « gist » manquant, ou gist supprimé.`);
  }
  const json = await res.json();
  localStorage.setItem(SYNC.token, token);
  localStorage.setItem(SYNC.gist, json.id);
  localStorage.setItem(SYNC.savedAt, p.savedAt);
  return json.id as string;
}

export async function pullFromGist(token: string, gistId: string): Promise<SavePayload | null> {
  const res = await fetch(`${API}/gists/${gistId}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub ${res.status} — gist introuvable ou token invalide.`);
  const json = await res.json();
  const content = json.files?.[GIST_FILE]?.content;
  if (!content) return null;
  const parsed: unknown = JSON.parse(content);
  return isPayload(parsed) ? parsed : null;
}

/** Au démarrage : si la sauvegarde distante est plus récente, on l'applique (une fois par session). */
export async function maybeAutoPull(): Promise<boolean> {
  const { token, gistId, savedAt } = getSync();
  if (!token || !gistId || sessionStorage.getItem('eft.pulled')) return false;
  sessionStorage.setItem('eft.pulled', '1');
  try {
    const remote = await pullFromGist(token, gistId);
    if (!remote) return false;
    if (savedAt && remote.savedAt <= savedAt) return false; // local à jour ou plus récent
    applySnapshot(remote);
    return true;
  } catch {
    return false; // hors-ligne / token expiré : on reste sur le local, jamais bloquant
  }
}

/** Push automatique débouncé après chaque modification du store. Silencieux (best effort). */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleAutoPush(): void {
  const { token, gistId } = getSync();
  if (!token || !gistId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushToGist(token).catch(() => {}); // offline → le prochain changement retentera
  }, 3000);
}
