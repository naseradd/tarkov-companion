// Client GraphQL + requêtes typées pour l'API communautaire tarkov.dev (the-hideout).
// https://api.tarkov.dev/graphql — PvP only : gameMode:regular hardcodé partout.

export const API_ENDPOINT = 'https://api.tarkov.dev/graphql';

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

/* =============================== Types =============================== */

export interface Position { x: number; y?: number; z: number; }

/* ---- Cartes ---- */
export interface MapSpawn { zoneName: string | null; sides: string[] | null; categories: string[] | null; position: Position; }
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
  id: string; name: string; normalizedName: string; wiki: string | null;
  raidDuration: number | null; players: string | null;
  spawns: MapSpawn[]; extracts: MapExtract[]; transits: MapTransit[];
}

/* ---- Quêtes ---- */
export interface Trader { id?: string; name: string; normalizedName: string; imageLink: string | null; }
export interface ObjItem { id: string; name: string; shortName: string; iconLink: string | null; wikiLink?: string | null; }
export interface TaskZone { id: string; map: { normalizedName: string } | null; position: Position | null; }
export interface TaskObjective {
  id: string;
  type: string;
  description: string;
  optional: boolean;
  maps: { name: string; normalizedName: string }[] | null;
  zones?: TaskZone[] | null;
  items?: ObjItem[] | null;
  count?: number | null;
  foundInRaid?: boolean | null;
  requiredKeys?: ObjItem[][] | null;
  questItem?: { name: string } | null;
  markerItem?: ObjItem | null;
  exitName?: string | null;
  exitStatus?: string[] | null;
  targetNames?: string[] | null;
  possibleLocations?: { map: { normalizedName: string } | null; positions: Position[] }[] | null;
}
export interface TaskReq { task: { id: string; name: string } | null; status: string[] | null; }
export interface TraderStanding { trader: { name: string } | null; standing: number; }
export interface Task {
  id: string;
  name: string;
  normalizedName: string;
  experience: number | null;
  minPlayerLevel: number | null;
  kappaRequired: boolean | null;
  lightkeeperRequired: boolean | null;
  factionName: string | null;
  wikiLink: string | null;
  taskImageLink: string | null;
  availableDelaySecondsMin: number | null;
  trader: Trader | null;
  map: { name: string; normalizedName: string } | null;
  taskRequirements: TaskReq[] | null;
  finishRewards: { traderStanding: TraderStanding[] | null } | null;
  objectives: TaskObjective[];
}

/* ---- Marchands / progression ---- */
export interface TraderLevel {
  level: number;
  requiredPlayerLevel: number | null;
  requiredReputation: number | null;
  requiredCommerce: number | null;
}
export interface TraderFull {
  id: string; name: string; normalizedName: string; imageLink: string | null;
  levels: TraderLevel[];
}
export interface PlayerLevel { level: number; exp: number; }
export interface FleaMarket { minPlayerLevel: number; sellOfferFeeRate: number; sellRequirementFeeRate: number; }

/* ---- Prix ---- */
export interface VendorRef { name: string; normalizedName: string; minTraderLevel?: number | null; trader?: { name: string; normalizedName: string } | null; }
export interface ItemPrice { priceRUB: number; price: number; currency: string; vendor: VendorRef; }

/* ---- Munitions ---- */
export interface Ammo {
  item: { id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null; avg24hPrice: number | null; buyFor: ItemPrice[] | null };
  caliber: string | null;
  ammoType: string | null;
  damage: number;
  penetrationPower: number;
  armorDamage: number;
  fragmentationChance: number;
  projectileCount: number;
  initialSpeed: number | null;
}

/* ---- Armures / plaques ---- */
export interface ArmorPlate { id: string; name: string; shortName: string; class: number | null; durability: number | null; }
export interface ArmorSlot { nameId: string | null; name: string | null; zones: string[] | null; allowedPlates: ArmorPlate[] | null; locked: boolean; class?: number | null; durability?: number | null; }
export interface ArmorProps {
  class: number | null;
  durability: number | null;
  repairCost: number | null;
  speedPenalty: number | null;
  turnPenalty: number | null;
  ergoPenalty: number | null;
  bluntThroughput: number | null;
  armorType: string | null;
  zones: string[] | null;
  material: { name: string; destructibility: number | null } | null;
  armorSlots: ArmorSlot[] | null;
}
export interface ArmorItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  backgroundColor: string | null; avg24hPrice: number | null; basePrice: number | null;
  types: string[] | null;
  buyFor: ItemPrice[] | null;
  properties: ArmorProps | null;
}

/* ---- Armes ---- */
export interface GunProps {
  caliber: string | null;
  ergonomics: number | null;
  recoilVertical: number | null;
  recoilHorizontal: number | null;
  fireRate: number | null;
  effectiveDistance: number | null;
  defaultAmmo: { name: string; shortName: string } | null;
}
export interface GunItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  backgroundColor: string | null; avg24hPrice: number | null;
  properties: GunProps | null;
}

/* ---- Loot / économie ---- */
export interface LootItem {
  id: string; name: string; shortName: string; iconLink: string | null; wikiLink: string | null;
  backgroundColor: string | null;
  width: number; height: number;
  basePrice: number | null; avg24hPrice: number | null; low24hPrice: number | null; lastLowPrice: number | null;
  changeLast48hPercent: number | null;
  fleaMarketFee: number | null;
  minLevelForFlea: number | null;
  sellFor: ItemPrice[] | null;
  buyFor: ItemPrice[] | null;
  usedInTasks: { id: string; name: string }[] | null;
  craftsFor: { id: string }[] | null;
  bartersFor: { id: string }[] | null;
}

/* ---- Crafts / barters ---- */
export interface ReqItem { item: ObjItem & { avg24hPrice?: number | null }; count: number; }
export interface Craft {
  id: string;
  station: { id: string; name: string; normalizedName: string } | null;
  level: number;
  duration: number | null;
  taskUnlock: { id: string; name: string } | null;
  requiredItems: ReqItem[];
  rewardItems: ReqItem[];
}
export interface BarterTrade {
  id: string;
  trader: { name: string; normalizedName: string } | null;
  level: number;
  taskUnlock: { id: string; name: string } | null;
  requiredItems: ReqItem[];
  rewardItems: ReqItem[];
}

/* ---- Hideout ---- */
export interface HideoutItemReq { item: ObjItem & { avg24hPrice?: number | null }; count: number; }
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

/* =============================== Fragments =============================== */

const F_PRICE = `priceRUB price currency vendor{ name normalizedName ... on TraderOffer{ minTraderLevel trader{ name normalizedName } } }`;
const F_REQ_ITEMS = `requiredItems{ item{ id name shortName iconLink avg24hPrice } count } rewardItems{ item{ id name shortName iconLink avg24hPrice } count }`;

/* =============================== Queries =============================== */

const Q_MAPS = `{ maps(gameMode: regular){ id name normalizedName wiki raidDuration players
  spawns{ zoneName sides categories position{ x z } }
  extracts{ name faction switches{ id name } transferItem{ item{ name shortName } count } position{ x z } }
  transits{ description position{ x z } } } }`;

const Q_TASKS = `{ tasks(gameMode: regular){ id name normalizedName experience minPlayerLevel kappaRequired lightkeeperRequired factionName wikiLink taskImageLink availableDelaySecondsMin
  trader{ id name normalizedName imageLink } map{ name normalizedName }
  taskRequirements{ task{ id name } status }
  finishRewards{ traderStanding{ trader{ name } standing } }
  objectives{ id type description optional maps{ name normalizedName }
    ... on TaskObjectiveBasic{ zones{ id map{ normalizedName } position{ x z } } }
    ... on TaskObjectiveItem{ items{ id name shortName iconLink wikiLink } count foundInRaid requiredKeys{ id name shortName iconLink wikiLink } zones{ id map{ normalizedName } position{ x z } } }
    ... on TaskObjectiveQuestItem{ questItem{ name } count possibleLocations{ map{ normalizedName } positions{ x z } } zones{ id map{ normalizedName } position{ x z } } requiredKeys{ id name shortName iconLink wikiLink } }
    ... on TaskObjectiveMark{ markerItem{ id name shortName iconLink wikiLink } zones{ id map{ normalizedName } position{ x z } } requiredKeys{ id name shortName iconLink wikiLink } }
    ... on TaskObjectiveExtract{ exitName exitStatus requiredKeys{ id name shortName iconLink wikiLink } }
    ... on TaskObjectiveShoot{ targetNames count zones{ id map{ normalizedName } position{ x z } } requiredKeys{ id name shortName iconLink wikiLink } } } } }`;

const Q_TRADERS = `{ traders(gameMode: regular){ id name normalizedName imageLink
  levels{ level requiredPlayerLevel requiredReputation requiredCommerce } } }`;

const Q_PLAYER_LEVELS = `{ playerLevels{ level exp } }`;

const Q_FLEA = `{ fleaMarket(gameMode: regular){ minPlayerLevel sellOfferFeeRate sellRequirementFeeRate } }`;

const Q_AMMO = `{ ammo(gameMode: regular){ item{ id name shortName iconLink wikiLink avg24hPrice buyFor{ ${F_PRICE} } }
  caliber ammoType damage penetrationPower armorDamage fragmentationChance projectileCount initialSpeed } }`;

const Q_ARMOR = `{ items(types:[armor,rig], gameMode: regular){ id name shortName iconLink wikiLink backgroundColor avg24hPrice basePrice types
  buyFor{ ${F_PRICE} }
  properties{ ... on ItemPropertiesArmor{ class durability repairCost speedPenalty turnPenalty ergoPenalty bluntThroughput armorType zones material{ name destructibility }
    armorSlots{ ... on ItemArmorSlotOpen{ nameId name zones allowedPlates{ id name shortName properties{ ... on ItemPropertiesArmor{ class durability } } } }
                ... on ItemArmorSlotLocked{ nameId name zones class durability } } } } } }`;

const Q_GUNS = `{ items(types:gun, gameMode: regular){ id name shortName iconLink wikiLink backgroundColor avg24hPrice
  properties{ ... on ItemPropertiesWeapon{ caliber ergonomics recoilVertical recoilHorizontal fireRate effectiveDistance defaultAmmo{ name shortName } } } } }`;

const Q_LOOT = `{ items(types:[barter,provisions,meds,container,keys,backpack], gameMode: regular){ id name shortName iconLink wikiLink backgroundColor width height
  basePrice avg24hPrice low24hPrice lastLowPrice changeLast48hPercent fleaMarketFee minLevelForFlea
  sellFor{ priceRUB vendor{ name normalizedName } } buyFor{ ${F_PRICE} }
  usedInTasks{ id name } craftsFor{ id } bartersFor{ id } } }`;

const Q_CRAFTS = `{ crafts(gameMode: regular){ id level duration station{ id name normalizedName } taskUnlock{ id name } ${F_REQ_ITEMS} } }`;

const Q_BARTERS = `{ barters(gameMode: regular){ id level trader{ name normalizedName } taskUnlock{ id name } ${F_REQ_ITEMS} } }`;

const Q_HIDEOUT = `{ hideoutStations(gameMode: regular){ id name normalizedName imageLink
  levels{ level constructionTime itemRequirements{ item{ id name shortName iconLink avg24hPrice } count }
  stationLevelRequirements{ station{ name } level } traderRequirements{ trader{ name } level } } } }`;

/* =============================== Loaders =============================== */

const norm = (raw: ArmorItem): ArmorItem => ({
  ...raw,
  properties: raw.properties
    ? {
        ...raw.properties,
        armorSlots: (raw.properties.armorSlots ?? []).map((s: any) => ({
          nameId: s.nameId ?? null,
          name: s.name ?? null,
          zones: s.zones ?? null,
          allowedPlates: (s.allowedPlates ?? []).map((p: any) => ({
            id: p.id, name: p.name, shortName: p.shortName,
            class: p.properties?.class ?? null, durability: p.properties?.durability ?? null,
          })),
          locked: !s.allowedPlates,
          class: s.class ?? null,
          durability: s.durability ?? null,
        })),
      }
    : null,
});

export const fetchMaps = () => gql<{ maps: TarkovMap[] }>(Q_MAPS).then((d) => d.maps);
export const fetchTasks = () => gql<{ tasks: Task[] }>(Q_TASKS).then((d) => d.tasks);
export const fetchTraders = () => gql<{ traders: TraderFull[] }>(Q_TRADERS).then((d) => d.traders);
export const fetchPlayerLevels = () => gql<{ playerLevels: PlayerLevel[] }>(Q_PLAYER_LEVELS).then((d) => d.playerLevels);
export const fetchFlea = () => gql<{ fleaMarket: FleaMarket }>(Q_FLEA).then((d) => d.fleaMarket);
export const fetchAmmo = () => gql<{ ammo: Ammo[] }>(Q_AMMO).then((d) => d.ammo);
export const fetchArmor = () => gql<{ items: ArmorItem[] }>(Q_ARMOR).then((d) => d.items.map(norm));
export const fetchGuns = () => gql<{ items: GunItem[] }>(Q_GUNS).then((d) => d.items);
export const fetchLoot = () => gql<{ items: LootItem[] }>(Q_LOOT).then((d) => d.items);
export const fetchCrafts = () => gql<{ crafts: Craft[] }>(Q_CRAFTS).then((d) => d.crafts);
export const fetchBarters = () => gql<{ barters: BarterTrade[] }>(Q_BARTERS).then((d) => d.barters);
export const fetchHideout = () => gql<{ hideoutStations: HideoutStation[] }>(Q_HIDEOUT).then((d) => d.hideoutStations);
