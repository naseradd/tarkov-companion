// Helpers de formatage et géométrie.

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** Cap boussole d'un point A vers un point B en coords de jeu (z = nord). */
export function bearing(ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const angle = (Math.atan2(dx, dz) * 180) / Math.PI; // 0 = nord, 90 = est
  const idx = ((Math.round(angle / 45) % 8) + 8) % 8;
  return { label: COMPASS[idx], arrow: ARROWS[idx], angle: (angle + 360) % 360 };
}

/** Distance euclidienne au sol (x,z), ~ mètres. */
export function distance(ax: number, az: number, bx: number, bz: number) {
  return Math.round(Math.hypot(bx - ax, bz - az));
}

export function rub(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR') + ' ₽';
}

export function num(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR');
}

/** Roubles compacts : 1 240 000 -> "1.24M", 24 500 -> "24.5k", 300 000 -> "300k". */
export function compact(n: number | null | undefined): string {
  if (n == null) return '—';
  const a = Math.abs(n);
  // +Number(toFixed()) retire les zéros de décimale sans casser les entiers ronds
  if (a >= 1_000_000) return +(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 2) + 'M';
  if (a >= 1_000) return +(n / 1_000).toFixed(a >= 10_000 ? 0 : 1) + 'k';
  return String(Math.round(n));
}

export function pct(frac: number | null | undefined): string {
  if (frac == null) return '—';
  return Math.round(frac * 100) + '%';
}

/** "Caliber556x45" / "Caliber_762x39" -> "5.56x45". */
export function cleanCaliber(c: string | null | undefined): string {
  if (!c) return '—';
  return c.replace(/^Caliber/i, '').replace(/_/g, ' ').trim() || '—';
}

export function buildTime(seconds: number | null | undefined): string {
  if (!seconds) return 'instantané';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Durée courte pour les crafts : "3h05", "45m". */
export function shortDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h) return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  return `${m}m`;
}

/** Temps relatif depuis un timestamp ms : "il y a 4 min" / "5 min restantes". */
export function fromNow(ts: number, now: number): string {
  const diff = Math.round((now - ts) / 1000);
  const m = Math.floor(diff / 60);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)} h`;
}

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
