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
