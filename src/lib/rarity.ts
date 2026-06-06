// Teintes de rareté inventaire EFT (items.backgroundColor) → fond d'icône.
// Identité Tarkov : on reconnaît la valeur d'un objet à la couleur de sa case.

const RARITY: Record<string, string> = {
  violet: '#392b50',
  blue: '#1e3550',
  yellow: '#4a4520',
  orange: '#4d3018',
  green: '#23381f',
  red: '#4a2420',
  grey: '#2a2e22',
  black: '#15170f',
  default: '#1f231a',
};

export function rarityBg(name: string | null | undefined): string {
  return RARITY[name ?? 'default'] ?? RARITY.default;
}

/** Dégradé doux pour une case d'icône (haut éclairci). */
export function raritySurface(name: string | null | undefined): string {
  const base = rarityBg(name);
  return `linear-gradient(180deg, ${base} 0%, ${base}cc 100%)`;
}
