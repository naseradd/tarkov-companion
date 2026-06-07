<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTraderShops, type TraderShop } from '@/lib/tarkov';
import { traderTip } from '@/lib/traders';
import Badge from '@/components/ui/Badge.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Reveal from '@/components/ui/Reveal.vue';

const game = useGameStore();
const shops = useResource<TraderShop[]>('traderShops', fetchTraderShops);

// Marchands « réels » : ceux avec des paliers de loyauté ou un vrai stock cash.
const roster = computed(() =>
  (shops.data.value ?? [])
    .filter((t) => t.levels.length > 1 || t.cashOffers.length > 0)
    .sort((a, b) => b.levels.length - a.levels.length || a.name.localeCompare(b.name)),
);

function rows(t: TraderShop) {
  const cur = game.traderLL(t.normalizedName);
  const max = t.levels.length;
  const next = t.levels.find((l) => l.level === cur + 1) ?? null;
  return { cur, max, next, tip: traderTip(t.normalizedName), offers: t.cashOffers.length };
}
</script>

<template>
  <section class="view">
    <span class="kicker">Économie</span>
    <h1 class="page-title">Marchands</h1>
    <p class="lead">
      Une fiche par marchand : ce qu’il vend de meilleur, et les actions concrètes pour monter sa loyauté.
      Règle ton LL réel sur chaque fiche, la loyauté est indépendante de ton niveau PMC.
    </p>

    <Spinner v-if="shops.loading.value" block label="Chargement des marchands…" />

    <div v-else class="roster">
      <Reveal v-for="(t, i) in roster" :key="t.id" :index="i" tag="div">
        <RouterLink :to="`/marchands/${t.normalizedName}`" class="trader">
          <img v-if="t.imageLink" :src="t.imageLink" class="t-portrait" :alt="t.name" />
          <div class="t-body">
            <div class="t-top">
              <h2 class="t-name">{{ t.name }}</h2>
              <Badge variant="accent">LL {{ rows(t).cur }}/{{ rows(t).max }}</Badge>
            </div>
            <p class="t-tag">{{ rows(t).tip.tagline }}</p>
            <div class="t-foot">
              <span class="t-pips">
                <i v-for="n in rows(t).max" :key="n" :class="{ on: n <= rows(t).cur }" />
              </span>
              <span v-if="rows(t).next" class="t-next num">→ LL{{ rows(t).next!.level }} : niv {{ rows(t).next!.requiredPlayerLevel }}</span>
              <span v-else class="t-next max">loyauté max ✓</span>
              <span v-if="rows(t).offers" class="t-offers num">{{ rows(t).offers }} offres</span>
            </div>
          </div>
          <span class="t-arrow">→</span>
        </RouterLink>
      </Reveal>
    </div>
  </section>
</template>

<style scoped>
.roster { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 11px; margin-top: 6px; }
.trader {
  display: flex; align-items: center; gap: 14px;
  background: linear-gradient(180deg, var(--raised), var(--surface));
  border: 1px solid var(--hairline); border-radius: var(--r-md);
  padding: 13px 15px; box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-sm);
  transition: transform var(--t1) var(--ease-out-quart), box-shadow var(--t1) var(--ease), border-color var(--t1) var(--ease);
}
.trader:hover { transform: translateY(-3px); border-color: var(--hairline-2); box-shadow: inset 0 1px 0 var(--highlight), var(--shadow-md); }
.t-portrait { width: 60px; height: 60px; border-radius: var(--r-md); object-fit: cover; border: 1px solid var(--hairline-2); background: #000; flex: 0 0 auto; }
.t-body { flex: 1; min-width: 0; }
.t-top { display: flex; align-items: center; gap: 10px; }
.t-name { font-family: var(--font-display); font-weight: 600; font-size: 18px; margin: 0; }
.t-tag { font-size: 12.5px; color: var(--ink-2); margin: 3px 0 9px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.t-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.t-pips { display: inline-flex; gap: 3px; }
.t-pips i { width: 18px; height: 4px; border-radius: var(--r-pill); background: var(--hairline-2); transition: background var(--t2) var(--ease); }
.t-pips i.on { background: var(--accent); }
.t-next { font-size: 11px; color: var(--ink-3); }
.t-next.max { color: var(--positive); }
.t-offers { font-size: 11px; color: var(--ink-3); }
.t-arrow { color: var(--ink-3); font-size: 18px; flex: 0 0 auto; transition: transform var(--t2) var(--ease-out-quart), color var(--t1) var(--ease); }
.trader:hover .t-arrow { transform: translateX(4px); color: var(--accent); }
@media (max-width: 480px) { .roster { grid-template-columns: 1fr; } }
</style>
