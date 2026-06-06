// Modèle d'efficacité munition × classe d'armure.
//
// Heuristique transparente fondée sur la règle communautaire "pen ≈ classe×10" :
// le ratio penPower / (classe×10) donne une note 0-4 explicable d'un clic.
// (Le jeu a une vraie formule probabiliste par durabilité ; on vise une note
//  de décision rapide « ça passe / ça passe pas », pas une simu balistique.)

export const ARMOR_CLASSES = [1, 2, 3, 4, 5, 6] as const;
export type PenRating = 0 | 1 | 2 | 3 | 4;

export interface PenCell {
  armorClass: number;
  rating: PenRating;
  ratio: number; // penPower / seuil
  threshold: number;
}

export function penThreshold(armorClass: number): number {
  return armorClass * 10;
}

export function penRating(penPower: number, armorClass: number): PenCell {
  const threshold = penThreshold(armorClass);
  const ratio = penPower / threshold;
  let rating: PenRating;
  if (ratio >= 1.25) rating = 4;
  else if (ratio >= 1.0) rating = 3;
  else if (ratio >= 0.8) rating = 2;
  else if (ratio >= 0.55) rating = 1;
  else rating = 0;
  return { armorClass, rating, ratio, threshold };
}

export function penMatrix(penPower: number): PenCell[] {
  return ARMOR_CLASSES.map((c) => penRating(penPower, c));
}

const RATING_COLOR: Record<PenRating, string> = {
  4: 'var(--positive)',
  3: 'var(--accent)',
  2: 'var(--amber)',
  1: '#d98a3a',
  0: 'var(--red)',
};
const RATING_LABEL: Record<PenRating, string> = {
  4: 'Fiable',
  3: 'Bonne',
  2: 'Situationnelle',
  1: 'Faible',
  0: 'Ne passe pas',
};

export const ratingColor = (r: PenRating) => RATING_COLOR[r];
export const ratingLabel = (r: PenRating) => RATING_LABEL[r];

/** Note tier globale d'une munition (meilleure classe pénétrée de façon fiable). */
export function ammoTier(penPower: number): { maxClass: number; label: string } {
  let maxClass = 0;
  for (const c of ARMOR_CLASSES) if (penRating(penPower, c).rating >= 3) maxClass = c;
  return { maxClass, label: maxClass ? `Classe ${maxClass}` : 'Faible pen' };
}

/** Avertissements non-évidents sur une munition. */
export function ammoWarnings(a: { penetrationPower: number; damage: number; fragmentationChance: number; projectileCount: number }): string[] {
  const w: string[] = [];
  if (a.penetrationPower >= 45 && a.damage < 55 && a.projectileCount <= 1) w.push('AP : faible dégât chair, à réserver aux cibles blindées');
  if (a.fragmentationChance < 0.05 && a.penetrationPower < 20) w.push('Aucune fragmentation et pen faible');
  if (a.projectileCount > 1) w.push(`Multi-projectiles (${a.projectileCount}) : dégât réparti, peu de pen`);
  return w;
}
