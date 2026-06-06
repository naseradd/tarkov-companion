// Décisions économiques : verdict keep/sell/flea, ₽/slot net de taxe, profit craft/h, barters.

import type { LootItem, Craft, BarterTrade } from '@/lib/tarkov';

export type SellChannel = 'keep' | 'flea' | 'trader' | 'fence';

export interface Verdict {
  channel: SellChannel;
  reason: string;
  bestValue: number; // ₽ net retiré
  perSlot: number;
  slots: number;
  traderBest: { name: string; price: number } | null;
  fleaNet: number; // prix flea net de taxe (0 si flea verrouillé)
  delta48: number | null;
}

export interface ReservedBy {
  quest?: string; // nom de la quête (ex "Gunsmith - Part 4")
  questCount?: number;
  hideout?: string; // nom de la station
}

const FLEA = 'flea-market';

/** Meilleure offre cash marchand (hors flea). */
function bestTrader(item: LootItem): { name: string; price: number } | null {
  const offers = (item.sellFor ?? []).filter((s) => s.vendor.normalizedName !== FLEA);
  if (!offers.length) return null;
  const top = offers.reduce((a, b) => (b.priceRUB > a.priceRUB ? b : a));
  return { name: top.vendor.name, price: top.priceRUB };
}

export function lootVerdict(
  item: LootItem,
  opts: { playerLevel: number; fleaMinDefault: number; reserved?: ReservedBy | null },
): Verdict {
  const slots = Math.max(1, (item.width || 1) * (item.height || 1));
  const traderBest = bestTrader(item);
  const fleaPrice = item.avg24hPrice ?? item.lastLowPrice ?? 0;
  const fee = item.fleaMarketFee ?? 0;
  // le flea market est verrouillé globalement avant le niveau 15 (plancher),
  // en plus de la restriction par-item minLevelForFlea
  const minFlea = Math.max(opts.fleaMinDefault, item.minLevelForFlea ?? opts.fleaMinDefault);
  const canFlea = opts.playerLevel >= minFlea && fleaPrice > 0;
  const fleaNet = canFlea ? Math.max(0, fleaPrice - fee) : 0;
  const traderPrice = traderBest?.price ?? 0;

  let channel: SellChannel;
  let reason: string;

  if (opts.reserved?.quest || opts.reserved?.hideout) {
    channel = 'keep';
    const parts: string[] = [];
    if (opts.reserved.quest) parts.push(`${opts.reserved.questCount ?? 1}× pour ${opts.reserved.quest}`);
    if (opts.reserved.hideout) parts.push(`hideout : ${opts.reserved.hideout}`);
    reason = 'Requis — ' + parts.join(' · ');
  } else if (canFlea && fleaNet > traderPrice * 1.1) {
    channel = 'flea';
    reason = `Flea net ${Math.round(((fleaNet - traderPrice) / Math.max(1, traderPrice)) * 100)}% > marchand`;
  } else if (traderBest) {
    channel = traderBest.name.toLowerCase() === 'fence' ? 'fence' : 'trader';
    reason = `Vendre à ${traderBest.name}`;
  } else {
    channel = 'trader';
    reason = 'Aucune offre';
  }

  const bestValue = channel === 'keep' ? Math.max(fleaNet, traderPrice) : channel === 'flea' ? fleaNet : traderPrice;

  return {
    channel,
    reason,
    bestValue,
    perSlot: Math.round(bestValue / slots),
    slots,
    traderBest,
    fleaNet,
    delta48: item.changeLast48hPercent ?? null,
  };
}

/* ----------------------------- Crafts ----------------------------- */

export interface CraftProfit {
  id: string;
  station: string;
  stationNorm: string;
  level: number;
  reward: string;
  durationSec: number;
  inputCost: number;
  outputValue: number;
  profit: number;
  perHour: number;
  taskLocked: string | null;
}

const sumValue = (items: { item: { avg24hPrice?: number | null }; count: number }[]) =>
  items.reduce((acc, r) => acc + (r.item.avg24hPrice ?? 0) * r.count, 0);

export function craftProfit(craft: Craft, feeRate = 0.05): CraftProfit {
  const inputCost = sumValue(craft.requiredItems);
  const grossOut = sumValue(craft.rewardItems);
  const outputValue = Math.round(grossOut * (1 - feeRate)); // approx taxe flea sur la revente
  const profit = Math.round(outputValue - inputCost);
  const hours = (craft.duration ?? 0) / 3600;
  const reward = craft.rewardItems[0]?.item.name ?? '—';
  return {
    id: craft.id,
    station: craft.station?.name ?? '—',
    stationNorm: craft.station?.normalizedName ?? '',
    level: craft.level,
    reward: craft.rewardItems[0] ? `${craft.rewardItems[0].count}× ${reward}` : reward,
    durationSec: craft.duration ?? 0,
    inputCost: Math.round(inputCost),
    outputValue,
    profit,
    perHour: hours > 0 ? Math.round(profit / hours) : 0,
    taskLocked: craft.taskUnlock?.name ?? null,
  };
}

/* ----------------------------- Barters ----------------------------- */

export interface BarterValue {
  id: string;
  trader: string;
  level: number;
  reward: string;
  cost: number; // valeur des items donnés
  value: number; // valeur de l'item reçu
  savings: number; // value - cost (positif = bon)
  taskLocked: string | null;
}

export function barterValue(b: BarterTrade): BarterValue {
  const cost = sumValue(b.requiredItems);
  const value = sumValue(b.rewardItems);
  const reward = b.rewardItems[0] ? `${b.rewardItems[0].count}× ${b.rewardItems[0].item.name}` : '—';
  return {
    id: b.id,
    trader: b.trader?.name ?? '—',
    level: b.level,
    reward,
    cost: Math.round(cost),
    value: Math.round(value),
    savings: Math.round(value - cost),
    taskLocked: b.taskUnlock?.name ?? null,
  };
}
