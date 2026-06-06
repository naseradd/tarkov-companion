// Client GraphQL minimal + requêtes typées pour l'API communautaire tarkov.dev.
// API open source (the-hideout) : https://api.tarkov.dev/graphql

export const API_ENDPOINT = 'https://api.tarkov.dev/graphql';

export type GameMode = 'regular' | 'pve';
export type Faction = 'PMC' | 'Scav';

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

/* ----------------------------- Types ----------------------------- */

export interface Position { x: number; y?: number; z: number; }

export interface MapSpawn {
  zoneName: string | null;
  sides: string[] | null;
  categories: string[] | null;
  position: Position;
}
export interface MapSwitch { id: string; name: string | null; }
export interface MapExtract {
  name: string | null;
  faction: string | null;
  switches: MapSwitch[] | null;
  transferItem: { item: { name: string; shortName: string } | null; count: number } | null;
  position: Position;
}
export interface MapTransit { description: string | null; position: Position; }
export interface TarkovMap {
  id: string;
  name: string;
  normalizedName: string;
  wiki: string | null;
  raidDuration: number | null;
  players: string | null;
  spawns: MapSpawn[];
  extracts: MapExtract[];
  transits: MapTransit[];
}

export interface Trader { name: string; normalizedName: string; imageLink: string | null; }
export interface ObjItem { id: string; name: string; shortName: string; iconLink: string | null; }
export interface TaskObjective {
  id: string;
  type: string;
  description: string;
  optional: boolean;
  maps: { name: string }[] | null;
  items?: ObjItem[] | null;
  count?: number | null;
  foundInRaid?: boolean | null;
  requiredKeys?: ObjItem[][] | null;
  questItem?: { name: string } | null;
  markerItem?: ObjItem | null;
  exitName?: string | null;
  targetNames?: string[] | null;
}
export interface Task {
  id: string;
  name: string;
  experience: number | null;
  minPlayerLevel: number | null;
  kappaRequired: boolean | null;
  lightkeeperRequired: boolean | null;
  factionName: string | null;
  wikiLink: string | null;
  trader: Trader | null;
  map: { name: string; normalizedName: string } | null;
  taskRequirements: { task: { name: string } | null }[] | null;
  objectives: TaskObjective[];
}

export interface Ammo {
  item: { id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null; avg24hPrice: number | null };
  caliber: string | null;
  damage: number;
  penetrationPower: number;
  armorDamage: number;
  fragmentationChance: number;
  projectileCount: number;
}

export interface ArmorProps {
  class: number | null;
  durability: number | null;
  material: { name: string } | null;
  zones: string[] | null;
  speedPenalty: number | null;
  ergoPenalty: number | null;
  bluntThroughput: number | null;
}
export interface ArmorItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  avg24hPrice: number | null; basePrice: number | null;
  properties: ArmorProps | null;
}

export interface GunProps {
  caliber: string | null;
  ergonomics: number | null;
  recoilVertical: number | null;
  recoilHorizontal: number | null;
  fireRate: number | null;
  effectiveDistance: number | null;
}
export interface GunItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  avg24hPrice: number | null; properties: GunProps | null;
}

export interface LootItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  width: number; height: number; basePrice: number | null; avg24hPrice: number | null; low24hPrice: number | null;
  sellFor: { vendor: { name: string; normalizedName: string }; priceRUB: number }[] | null;
  usedInTasks: { id: string }[] | null;
}

export interface HideoutItemReq { item: ObjItem; count: number; }
export interface HideoutLevel {
  level: number;
  constructionTime: number | null;
  itemRequirements: HideoutItemReq[];
  stationLevelRequirements: { station: { name: string }; level: number }[] | null;
  traderRequirements: { trader: { name: string }; level: number }[] | null;
}
export interface HideoutStation {
  id: string; name: string; normalizedName: string; imageLink: string | null;
  levels: HideoutLevel[];
}

/* ----------------------------- Queries ----------------------------- */

const Q_MAPS = `query($g:GameMode){maps(gameMode:$g){id name normalizedName wiki raidDuration players
  spawns{zoneName sides categories position{x z}}
  extracts{name faction switches{id name} transferItem{item{name shortName} count} position{x z}}
  transits{description position{x z}}}}`;

const Q_TASKS = `query($g:GameMode){tasks(gameMode:$g){id name experience minPlayerLevel kappaRequired lightkeeperRequired factionName wikiLink
  trader{name normalizedName imageLink} map{name normalizedName} taskRequirements{task{name}}
  objectives{id type description optional maps{name}
    ... on TaskObjectiveItem{items{id name shortName iconLink} count foundInRaid requiredKeys{name shortName id iconLink}}
    ... on TaskObjectiveQuestItem{questItem{name} count}
    ... on TaskObjectiveMark{markerItem{id name shortName iconLink}}
    ... on TaskObjectiveExtract{exitName}
    ... on TaskObjectiveShoot{targetNames count}}}}`;

const Q_AMMO = `query($g:GameMode){ammo(gameMode:$g){item{id name shortName iconLink wikiLink avg24hPrice}
  caliber damage penetrationPower armorDamage fragmentationChance projectileCount}}`;

const Q_ARMOR = `query($g:GameMode){items(types:[armor,rig],gameMode:$g){id name shortName iconLink wikiLink avg24hPrice basePrice
  properties{... on ItemPropertiesArmor{class durability material{name} zones speedPenalty ergoPenalty bluntThroughput}}}}`;

const Q_GUNS = `query($g:GameMode){items(types:gun,gameMode:$g){id name shortName iconLink wikiLink avg24hPrice
  properties{... on ItemPropertiesWeapon{caliber ergonomics recoilVertical recoilHorizontal fireRate effectiveDistance}}}}`;

const Q_LOOT = `query($g:GameMode){items(types:barter,gameMode:$g){id name shortName iconLink wikiLink width height basePrice avg24hPrice low24hPrice
  sellFor{vendor{name normalizedName} priceRUB} usedInTasks{id}}}`;

const Q_HIDEOUT = `query($g:GameMode){hideoutStations(gameMode:$g){id name normalizedName imageLink
  levels{level constructionTime itemRequirements{item{id name shortName iconLink} count}
  stationLevelRequirements{station{name} level} traderRequirements{trader{name} level}}}}`;

/* ----------------------------- Loaders ----------------------------- */

export const fetchMaps = (g: GameMode) => gql<{ maps: TarkovMap[] }>(Q_MAPS, { g }).then((d) => d.maps);
export const fetchTasks = (g: GameMode) => gql<{ tasks: Task[] }>(Q_TASKS, { g }).then((d) => d.tasks);
export const fetchAmmo = (g: GameMode) => gql<{ ammo: Ammo[] }>(Q_AMMO, { g }).then((d) => d.ammo);
export const fetchArmor = (g: GameMode) => gql<{ items: ArmorItem[] }>(Q_ARMOR, { g }).then((d) => d.items);
export const fetchGuns = (g: GameMode) => gql<{ items: GunItem[] }>(Q_GUNS, { g }).then((d) => d.items);
export const fetchLoot = (g: GameMode) => gql<{ items: LootItem[] }>(Q_LOOT, { g }).then((d) => d.items);
export const fetchHideout = (g: GameMode) => gql<{ hideoutStations: HideoutStation[] }>(Q_HIDEOUT, { g }).then((d) => d.hideoutStations);
