// Définitions de cartes : image SVG réelle (hébergée par tarkov.dev) + bornes en
// coordonnées de jeu pour projeter spawns/extractions dessus.
//
// Les `bounds` ([[x0,z0],[x1,z1]]) et `rotation` proviennent du jeu de données
// communautaire (TarkovTracker/tarkovdata), le même que tarkov.dev utilise.
// On mappe linéairement (x,z) -> pixels dans ce repère : comme le SVG est tracé
// dans le MÊME repère, les marqueurs s'alignent par construction.
//
// Si une carte apparaît miroir (est/ouest ou nord/sud inversés), il suffit de
// passer flipX/flipY à true sur sa définition — un seul caractère à changer.

export const SVG_BASE = 'https://assets.tarkov.dev/maps/svg/';
export const MAP_VHEIGHT = 1000; // hauteur virtuelle du canvas Leaflet (CRS.Simple)

export interface MapDef {
  file: string;
  rotation: number; // orientation native du SVG (référence ; non appliquée à l'alignement)
  bounds: [[number, number], [number, number]]; // [[x0,z0],[x1,z1]] coins en coords jeu
  flipX?: boolean;
  flipY?: boolean;
}

const DEFS: Record<string, MapDef> = {
  factory:             { file: 'Factory.svg',         rotation: 90,  bounds: [[-67, 69], [76.6, -65.5]] },
  customs:             { file: 'Customs.svg',         rotation: 180, bounds: [[698, -307], [-371, 237]] },
  woods:               { file: 'Woods.svg',           rotation: 180, bounds: [[650, -945], [-695, 470]] },
  shoreline:           { file: 'Shoreline.svg',       rotation: 180, bounds: [[506, -405], [-1060, 618]] },
  interchange:         { file: 'Interchange.svg',     rotation: 180, bounds: [[530, -439], [-364, 452]] },
  'the-lab':           { file: 'Labs.svg',            rotation: 270, bounds: [[-91, -477], [-287, -193]] },
  reserve:             { file: 'Reserve.svg',         rotation: 180, bounds: [[289, -338], [-303, 336]] },
  lighthouse:          { file: 'Lighthouse.svg',      rotation: 180, bounds: [[515, -1000], [-545, 725]] },
  'streets-of-tarkov': { file: 'StreetsOfTarkov.svg', rotation: 180, bounds: [[323, -317], [-280, 549]] },
  'ground-zero':       { file: 'GroundZero.svg',      rotation: 180, bounds: [[249, -124], [-99, 364]] },
};

// Variantes qui réutilisent la même carte physique
const ALIAS: Record<string, string> = {
  'night-factory': 'factory',
  'ground-zero-21': 'ground-zero',
  'ground-zero-tutorial': 'ground-zero',
};

export function mapDef(normalizedName: string): MapDef | null {
  const key = ALIAS[normalizedName] ?? normalizedName;
  return DEFS[key] ?? null;
}

export function svgUrl(def: MapDef): string {
  return SVG_BASE + def.file;
}

export function mapDims(def: MapDef): { width: number; height: number } {
  const [[x0, z0], [x1, z1]] = def.bounds;
  const w = Math.abs(x1 - x0);
  const h = Math.abs(z1 - z0);
  const height = MAP_VHEIGHT;
  const width = h === 0 ? height : height * (w / h);
  return { width, height };
}

// (x,z) jeu -> [lat,lng] Leaflet (CRS.Simple), image posée sur [[0,0],[height,width]]
export function project(
  x: number,
  z: number,
  def: MapDef,
  dims: { width: number; height: number },
): [number, number] {
  const [[x0, z0], [x1, z1]] = def.bounds;
  let u = (x - x0) / (x1 - x0); // 0..1 sur la largeur
  let v = (z - z0) / (z1 - z0); // 0..1 sur la hauteur (haut -> bas)
  if (def.flipX) u = 1 - u;
  if (def.flipY) v = 1 - v;
  const px = u * dims.width;
  const py = v * dims.height;
  return [dims.height - py, px]; // y inversé (CRS.Simple a l'axe Y vers le haut)
}
