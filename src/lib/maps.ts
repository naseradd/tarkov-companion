// Données de cartes (provenant du config statique tarkov.dev / the-hideout).
//
// On reprend le modèle de projection tarkov.dev : un CRS Leaflet custom construit
// à partir de `transform` (échelle/offset jeu→pixel) + `coordinateRotation`. Les
// marqueurs sont placés en coordonnées de jeu directes (lat = z, lng = x) et le
// CRS s'occupe de la projection. Conséquence : le SVG "Abstrait" ET les tuiles
// raster "Satellite" partagent exactement les mêmes bounds → tout s'aligne par
// construction, peu importe la source de fond choisie.

export interface MapData {
  normalizedName: string;
  bounds: [[number, number], [number, number]]; // [[x0,z0],[x1,z1]] coins en coords jeu
  transform: [number, number, number, number]; // [scaleX, offsetX, scaleZ, offsetZ]
  rotation: number; // coordinateRotation (deg)
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  svgPath: string | null; // fond vectoriel ("Abstrait")
  tilePath: string | null; // tuiles raster ("Satellite")
}

export type ProviderId = 'svg' | 'tiles';
export interface Provider { id: ProviderId; label: string; }

const SVG = 'https://assets.tarkov.dev/maps/svg/';
const A = 'https://assets.tarkov.dev/maps/';

const MAPS: Record<string, MapData> = {
  customs: { normalizedName: 'customs', bounds: [[698, -307], [-372, 237]], transform: [0.239, 168.65, 0.239, 136.35], rotation: 180, tileSize: 256, minZoom: 2, maxZoom: 6, svgPath: SVG + 'Customs.svg', tilePath: A + 'customs_0.16/main/{z}/{x}/{y}.png' },
  factory: { normalizedName: 'factory', bounds: [[77, -64.5], [-65.5, 67.4]], transform: [1.629, 119.9, 1.629, 139.3], rotation: 90, tileSize: 256, minZoom: 1, maxZoom: 6, svgPath: SVG + 'Factory.svg', tilePath: A + 'factory/main/{z}/{x}/{y}.png' },
  woods: { normalizedName: 'woods', bounds: [[646, -914], [-761, 442]], transform: [0.1855, 112.95, 0.1855, 167.85], rotation: 180, tileSize: 256, minZoom: 2, maxZoom: 6, svgPath: SVG + 'Woods.svg', tilePath: A + 'woods/main_0.16/{z}/{x}/{y}.png' },
  shoreline: { normalizedName: 'shoreline', bounds: [[504, -415], [-1056, 618]], transform: [0.16, 83.2, 0.16, 111.1], rotation: 180, tileSize: 256, minZoom: 2, maxZoom: 6, svgPath: SVG + 'Shoreline.svg', tilePath: A + 'shoreline/main_summer/{z}/{x}/{y}.png' },
  interchange: { normalizedName: 'interchange', bounds: [[598, -442], [-433, 426]], transform: [0.265, 150.6, 0.265, 134.6], rotation: 180, tileSize: 256, minZoom: 1, maxZoom: 6, svgPath: SVG + 'Interchange.svg', tilePath: A + 'interchange/main/{z}/{x}/{y}.png' },
  'the-lab': { normalizedName: 'the-lab', bounds: [[-80, -477], [-287, -193]], transform: [0.575, 281.2, 0.575, 193.7], rotation: 270, tileSize: 175, minZoom: 2, maxZoom: 6, svgPath: null, tilePath: A + 'labs_v4/1st/{z}/{x}/{y}.png' },
  reserve: { normalizedName: 'reserve', bounds: [[289, -293], [-303, 244]], transform: [0.395, 122.0, 0.395, 137.65], rotation: 180, tileSize: 256, minZoom: 2, maxZoom: 6, svgPath: SVG + 'Reserve.svg', tilePath: A + 'reserve/main/{z}/{x}/{y}.png' },
  lighthouse: { normalizedName: 'lighthouse', bounds: [[515, -998], [-545, 725]], transform: [0.2, 0, 0.2, 0], rotation: 180, tileSize: 256, minZoom: 1, maxZoom: 6, svgPath: SVG + 'Lighthouse.svg', tilePath: null },
  'streets-of-tarkov': { normalizedName: 'streets-of-tarkov', bounds: [[323, -295], [-280, 532]], transform: [0.38, 0, 0.38, 0], rotation: 180, tileSize: 256, minZoom: 1, maxZoom: 5, svgPath: SVG + 'StreetsOfTarkov.svg', tilePath: null },
  'ground-zero': { normalizedName: 'ground-zero', bounds: [[249, -124], [-99, 364]], transform: [0.524, 167.3, 0.524, 65.1], rotation: 180, tileSize: 256, minZoom: 1, maxZoom: 6, svgPath: SVG + 'GroundZero.svg', tilePath: A + 'groundzero/main_summer/{z}/{x}/{y}.png' },
  terminal: { normalizedName: 'terminal', bounds: [[463, -580], [-433, 475]], transform: [0.2, 0, 0.2, 0], rotation: 180, tileSize: 256, minZoom: 2, maxZoom: 6, svgPath: SVG + 'Terminal.svg', tilePath: null },
  'the-labyrinth': { normalizedName: 'the-labyrinth', bounds: [[-52, -37], [53, 76]], transform: [2.115, 85.5, 2.115, 128.0], rotation: 270, tileSize: 256, minZoom: 1, maxZoom: 6, svgPath: null, tilePath: A + 'labyrinth/main/{z}/{x}/{y}.png' },
};

const ALIAS: Record<string, string> = {
  'night-factory': 'factory',
  'ground-zero-21': 'ground-zero',
  'ground-zero-tutorial': 'ground-zero',
  streets: 'streets-of-tarkov',
};

export function getMapData(normalizedName: string): MapData | null {
  const key = ALIAS[normalizedName] ?? normalizedName;
  return MAPS[key] ?? null;
}

/** Sources de fond disponibles pour une carte (selon ce que tarkov.dev héberge). */
export function providers(d: MapData): Provider[] {
  const out: Provider[] = [];
  if (d.svgPath) out.push({ id: 'svg', label: 'Abstrait' });
  if (d.tilePath) out.push({ id: 'tiles', label: 'Satellite' });
  return out;
}
