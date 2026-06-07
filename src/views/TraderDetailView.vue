<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTraderShops, fetchTasks, type TraderShop, type Task, type TraderCashOffer } from '@/lib/tarkov';
import { traderStandingQuests, type PlayerState } from '@/lib/progression';
import { traderTip } from '@/lib/traders';
import { compact, num, rub } from '@/lib/format';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import IconBox from '@/components/ui/IconBox.vue';
import Spinner from '@/components/ui/Spinner.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Reveal from '@/components/ui/Reveal.vue';

const route = useRoute();
const game = useGameStore();
const shops = useResource<TraderShop[]>('traderShops', fetchTraderShops);
const tasks = useResource<Task[]>('tasks', fetchTasks);

const normName = computed(() => String(route.params.name));
const shop = computed(() => (shops.data.value ?? []).find((t) => t.normalizedName === normName.value) ?? null);
const tip = computed(() => traderTip(normName.value));
const ready = computed(() => !shops.loading.value);

const player = computed<PlayerState>(() => ({
  level: game.level, faction: game.faction, completed: game.completed,
  traderLL: game.traderLL, hideoutLevel: game.hideoutLevel,
}));

const curLL = computed(() => game.traderLL(normName.value));
const maxLL = computed(() => shop.value?.levels.length ?? 1);
const currencySym = computed(() => {
  const c = shop.value?.currency?.name ?? 'Roubles';
  return c === 'Dollars' ? '$' : c === 'Euros' ? '€' : '₽';
});
function price(n: number) { return num(n) + ' ' + currencySym.value; }

// Paliers de loyauté avec leurs exigences (data-driven).
const ladder = computed(() =>
  (shop.value?.levels ?? []).map((l) => ({
    level: l.level,
    reqLevel: l.requiredPlayerLevel ?? 0,
    reqRep: l.requiredReputation ?? 0,
    reqCommerce: l.requiredCommerce ?? 0,
    current: l.level === curLL.value,
    reached: l.level <= curLL.value,
  })),
);
const nextLevel = computed(() => ladder.value.find((l) => l.level === curLL.value + 1) ?? null);

// Quêtes qui donnent de la rép à ce marchand (front faisable en premier).
const repQuests = computed(() => {
  if (!shop.value) return [];
  return traderStandingQuests(tasks.data.value ?? [], shop.value.name, player.value);
});
const repAvailable = computed(() => repQuests.value.filter((r) => r.state === 'available'));

/* -------- Meilleurs achats (cash offers) -------- */
// « Meilleurs » = stock le plus précieux par défaut. « Affaires » = vraies marges sous le flea,
// filtrées du bruit (petits mods au prix flea peu fiable) et affichées en ₽ absolus, pas en %.
const mode = ref<'all' | 'deals'>('all');
const onlyUnlocked = ref(false);
const search = ref('');
const modeOpts = [
  { value: 'all', label: 'Meilleurs items' },
  { value: 'deals', label: 'Affaires vs flea' },
];

const DEAL_FLOOR = 2500; // prix trader mini pour qu'une « affaire » soit pertinente (coupe le bruit)

interface OfferRow {
  o: TraderCashOffer;
  margin: number | null; // flea - prixRUB en ₽ (positif = moins cher que le flea)
  unlocked: boolean;
}

const offers = computed<OfferRow[]>(() => {
  const list = shop.value?.cashOffers ?? [];
  return list.map((o) => {
    const flea = o.item.avg24hPrice ?? 0;
    const margin = flea > 0 && o.priceRUB > 0 ? flea - o.priceRUB : null;
    return { o, margin, unlocked: curLL.value >= (o.minTraderLevel ?? 1) };
  });
});

const shownOffers = computed(() => {
  const q = search.value.trim().toLowerCase();
  let list = offers.value.filter((r) => {
    if (onlyUnlocked.value && !r.unlocked) return false;
    if (q && !r.o.item.name.toLowerCase().includes(q) && !(r.o.item.shortName ?? '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (mode.value === 'deals') {
    list = list
      .filter((r) => r.margin != null && r.margin > 0 && r.o.priceRUB >= DEAL_FLOOR)
      .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));
  } else {
    list = [...list].sort((a, b) => b.o.priceRUB - a.o.priceRUB);
  }
  return list.slice(0, 60);
});
const totalOffers = computed(() => shop.value?.cashOffers.length ?? 0);
</script>

<template>
  <section class="view">
    <RouterLink to="/marchands" class="back">← Tous les marchands</RouterLink>

    <Spinner v-if="!ready" block label="Chargement du marchand…" />
    <EmptyState v-else-if="!shop" icon="∅" title="Marchand introuvable">
      Retourne à la liste des marchands.
    </EmptyState>

    <template v-else>
      <!-- HERO -->
      <header class="thero">
        <img v-if="shop.imageLink" :src="shop.imageLink" class="tportrait" :alt="shop.name" />
        <div class="thero-body">
          <span class="kicker">Marchand · paie en {{ shop.currency?.name ?? 'roubles' }}</span>
          <h1 class="thero-name">{{ shop.name }}</h1>
          <p class="thero-tag">{{ tip.tagline }}</p>
          <div class="thero-stats">
            <Badge variant="accent">LL {{ curLL }} / {{ maxLL }}</Badge>
            <Badge v-if="totalOffers" variant="info">{{ totalOffers }} offres</Badge>
            <Badge v-if="repAvailable.length" variant="amber">{{ repAvailable.length }} quêtes rép dispo</Badge>
          </div>
        </div>
      </header>

      <!-- LL LADDER (réglable ici) -->
      <Reveal><Card class="block" tone="surface">
        <div class="block-head">
          <span class="kicker">Loyauté — règle ton LL réel</span>
          <span class="hint">Indépendant du niveau PMC</span>
        </div>
        <div class="ladder">
          <button
            v-for="l in ladder"
            :key="l.level"
            class="rung"
            :class="{ reached: l.reached, current: l.current }"
            @click="game.setTraderLevel(normName, l.level)"
          >
            <span class="rung-ll num">LL{{ l.level }}</span>
            <span class="rung-req">
              <span class="num">niv {{ l.reqLevel || '—' }}</span>
              <span v-if="l.reqRep" class="num">· rép {{ l.reqRep }}</span>
              <span v-if="l.reqCommerce" class="num">· {{ compact(l.reqCommerce) }} ₽</span>
            </span>
          </button>
        </div>
        <p v-if="nextLevel" class="next-ll">
          Pour <b class="num">LL{{ nextLevel.level }}</b> : niveau PMC <b class="num">{{ nextLevel.reqLevel }}</b>,
          réputation <b class="num">{{ nextLevel.reqRep }}</b>, commerce <b class="num">{{ compact(nextLevel.reqCommerce) }} ₽</b> dépensés.
        </p>
        <p v-else class="next-ll">Loyauté maximale atteinte. ✓</p>
      </Card></Reveal>

      <div class="cols">
        <!-- COMMENT MONTER -->
        <Reveal class="col"><Card class="block">
          <span class="kicker">Comment le monter</span>
          <ul class="tips">
            <li v-for="(t, i) in tip.levelUp" :key="i">{{ t }}</li>
          </ul>
          <div v-if="tip.watch" class="watch">⚠ {{ tip.watch }}</div>

          <template v-if="repAvailable.length">
            <span class="kicker mt">Quêtes rép faisables maintenant</span>
            <RouterLink
              v-for="r in repAvailable.slice(0, 6)"
              :key="r.task.id"
              :to="`/quetes?q=${encodeURIComponent(r.task.name)}`"
              class="repq"
            >
              <span class="repq-name">{{ r.task.name }}</span>
              <span class="repq-rep num">+{{ r.standing }}</span>
            </RouterLink>
          </template>
        </Card></Reveal>

        <!-- SPÉCIALITÉ -->
        <Reveal class="col" :index="1"><Card class="block" tone="surface">
          <span class="kicker">Spécialité</span>
          <p class="spec"><b>Vend</b> · {{ tip.sells }}</p>
          <p class="spec"><b>Meilleur acheteur de</b> · {{ tip.bestBuyer }}</p>
          <RouterLink to="/loot" class="spec-link">Décider keep / vendre → Loot &amp; Éco</RouterLink>
        </Card></Reveal>
      </div>

      <!-- MEILLEURS ACHATS -->
      <Reveal><Card class="block">
        <div class="shop-head">
          <span class="kicker">Meilleurs achats chez {{ shop.name }}</span>
          <SegmentedControl v-model="mode" :options="modeOpts" size="sm" />
        </div>
        <p class="shop-lead">
          « Meilleurs items » trie par valeur. « Affaires vs flea » montre ce qui coûte nettement moins cher
          que son prix flea moyen (à acheter, voire revendre). Marge en ₽ par rapport au flea.
        </p>
        <div class="shop-tools">
          <input v-model="search" class="search-field" placeholder="Rechercher un item…" />
          <button class="toggle-pill" :class="{ on: onlyUnlocked }" @click="onlyUnlocked = !onlyUnlocked">
            {{ onlyUnlocked ? '✓ ' : '' }}Débloqués à mon LL{{ curLL }}
          </button>
        </div>

        <div v-if="shownOffers.length" class="offers">
          <div v-for="r in shownOffers" :key="r.o.item.id + r.o.minTraderLevel" class="offer" :class="{ locked: !r.unlocked }">
            <IconBox :src="r.o.item.iconLink" :bg="r.o.item.backgroundColor" :size="40" />
            <div class="offer-main">
              <a :href="r.o.item.wikiLink || undefined" target="_blank" class="offer-name">{{ r.o.item.name }}</a>
              <div class="offer-sub">
                <Badge :variant="r.unlocked ? 'good' : 'info'">LL{{ r.o.minTraderLevel }}</Badge>
                <span v-if="r.o.taskUnlock" class="lock-q">🔒 {{ r.o.taskUnlock.name }}</span>
                <span v-if="r.o.buyLimit" class="lim num">max {{ r.o.buyLimit }}/reset</span>
              </div>
            </div>
            <div class="offer-pricing">
              <div class="offer-price num">{{ price(r.o.price) }}</div>
              <div v-if="r.o.item.avg24hPrice" class="offer-flea num">flea {{ compact(r.o.item.avg24hPrice) }} ₽</div>
            </div>
            <div class="offer-margin">
              <Badge v-if="r.margin != null && r.margin > 0" variant="good" :title="`${rub(r.margin)} sous le flea`">−{{ compact(r.margin) }}</Badge>
              <Badge v-else-if="r.margin != null && r.margin < 0" variant="danger" :title="`${rub(-r.margin)} au-dessus du flea`">+{{ compact(-r.margin) }}</Badge>
            </div>
          </div>
          <p v-if="totalOffers > 60" class="more">Top 60 affichés sur {{ totalOffers }} offres. Affine avec la recherche.</p>
        </div>
        <EmptyState v-else icon="₽" :title="mode === 'deals' ? 'Aucune affaire nette sous le flea' : 'Aucune offre'">
          {{ mode === 'deals' ? 'Bascule sur « Meilleurs items » pour voir l’inventaire complet.' : 'Ce marchand ne vend pas d’items contre cash (barters / karma).' }}
        </EmptyState>
      </Card></Reveal>
    </template>
  </section>
</template>

<style scoped>
.back { font-size: 13px; color: var(--ink-3); display: inline-block; margin-bottom: 14px; }
.back:hover { color: var(--accent); }

/* HERO */
.thero { display: flex; gap: 20px; align-items: center; margin-bottom: 22px; }
.tportrait { width: 96px; height: 96px; border-radius: var(--r-lg); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; box-shadow: var(--shadow-md); flex: 0 0 auto; }
.thero-name { font-family: var(--font-display); font-weight: 700; font-size: clamp(28px, 4vw, 42px); line-height: 1.05; margin: 6px 0 6px; letter-spacing: -0.02em; }
.thero-tag { color: var(--ink-2); font-size: 14.5px; max-width: 60ch; margin: 0 0 12px; }
.thero-stats { display: flex; gap: 7px; flex-wrap: wrap; }

.block { margin-bottom: 14px; }
.block-head, .shop-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.hint { font-size: 12px; color: var(--ink-3); }
.kicker.mt, .mt { margin-top: 16px; display: block; }

/* LADDER */
.ladder { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.rung {
  flex: 1 1 120px; min-width: 110px; text-align: left; cursor: pointer;
  background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--r-md);
  padding: 11px 13px; display: flex; flex-direction: column; gap: 4px;
  transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart), background var(--t1) var(--ease);
}
.rung:hover { border-color: var(--hairline-2); transform: translateY(-2px); }
.rung.reached { background: var(--surface-2); }
.rung.current { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--shadow-accent); }
.rung-ll { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--ink); }
.rung.current .rung-ll { color: var(--accent); }
.rung-req { font-size: 11px; color: var(--ink-3); display: flex; gap: 4px; flex-wrap: wrap; }
.next-ll { font-size: 13px; color: var(--ink-2); margin: 14px 0 0; }
.next-ll b { color: var(--ink); }

/* COLS */
.cols { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
.col { min-width: 0; }
.tips { margin: 12px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 9px; }
.tips li { position: relative; padding-left: 20px; font-size: 13.5px; color: var(--ink); line-height: 1.45; }
.tips li::before { content: '▸'; position: absolute; left: 2px; color: var(--accent); }
.watch { margin-top: 14px; background: var(--amber-soft); border: 1px solid #5c4517; border-radius: var(--r-sm); padding: 9px 12px; font-size: 12.5px; color: var(--ink); }
.repq { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-sm); padding: 8px 11px; margin-top: 7px; transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart); }
.repq:hover { border-color: var(--accent-dim); transform: translateX(2px); }
.repq-name { font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.repq-rep { color: var(--positive); font-size: 13px; font-weight: 600; flex: 0 0 auto; }
.spec { font-size: 13.5px; color: var(--ink-2); margin: 12px 0 0; line-height: 1.5; }
.spec b { color: var(--ink); font-weight: 600; }
.spec-link { display: inline-block; margin-top: 14px; font-size: 13px; }

/* SHOP */
.shop-lead { font-size: 12.5px; color: var(--ink-3); margin: 8px 0 12px; max-width: 70ch; }
.shop-tools { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.search-field { min-width: 200px; flex: 0 1 auto; background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm); color: var(--ink); padding: 9px 13px; font-size: 14px; }
.search-field:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-soft); }
.toggle-pill { background: var(--surface-2); border: 1px solid var(--hairline); color: var(--ink-2); border-radius: var(--r-pill); padding: 8px 15px; cursor: pointer; font-size: 13px; transition: all var(--t1) var(--ease); }
.toggle-pill:hover { border-color: var(--hairline-2); color: var(--ink); }
.toggle-pill.on { background: var(--accent); color: var(--ink-on-accent); border-color: var(--accent); font-weight: 600; }

.offers { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 9px; }
.offer { display: flex; align-items: center; gap: 11px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 9px 12px; transition: border-color var(--t1) var(--ease), transform var(--t1) var(--ease-out-quart); }
.offer:hover { border-color: var(--hairline-2); transform: translateY(-2px); }
.offer.locked { opacity: 0.62; }
.offer-main { flex: 1; min-width: 0; }
.offer-name { font-size: 13.5px; color: var(--ink); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.offer-name:hover { color: var(--accent); }
.offer-sub { display: flex; align-items: center; gap: 7px; margin-top: 3px; flex-wrap: wrap; }
.lock-q { font-size: 10.5px; color: var(--amber); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.lim { font-size: 10px; color: var(--ink-3); }
.offer-pricing { text-align: right; flex: 0 0 auto; }
.offer-price { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.offer-flea { font-size: 10.5px; color: var(--ink-3); }
.offer-margin { flex: 0 0 auto; width: 52px; text-align: right; }
.more { font-size: 12px; color: var(--ink-3); margin: 12px 0 0; grid-column: 1 / -1; }

@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .thero { gap: 14px; } .tportrait { width: 72px; height: 72px; } }
</style>
