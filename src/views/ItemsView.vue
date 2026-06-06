<script setup lang="ts">
import { computed, ref } from 'vue';
import { useResource } from '@/composables/useResource';
import { fetchAmmo, fetchArmor, fetchGuns, fetchLoot, type Ammo, type ArmorItem, type GunItem, type LootItem } from '@/lib/tarkov';
import SortableTable, { type Column } from '@/components/SortableTable.vue';
import Spinner from '@/components/Spinner.vue';
import { rub, num, pct, cleanCaliber } from '@/lib/format';

const tab = ref<'ammo' | 'armor' | 'guns' | 'loot'>('ammo');

const ammo = useResource<Ammo[]>('ammo', fetchAmmo);
const armor = useResource<ArmorItem[]>('armor', fetchArmor);
const guns = useResource<GunItem[]>('guns', fetchGuns);
const loot = useResource<LootItem[]>('loot', fetchLoot);

const penColor = (p: number) => (p >= 40 ? 'var(--green)' : p >= 20 ? 'var(--amber)' : 'var(--red)');
const classColor = (c: number) => (c >= 5 ? 'var(--green)' : c >= 3 ? 'var(--amber)' : 'var(--red)');

/* ---- rows ---- */
const ammoRows = computed(() =>
  (ammo.data.value ?? []).map((a) => ({
    id: a.item.id, icon: a.item.iconLink, wiki: a.item.wikiLink, name: a.item.shortName || a.item.name,
    caliber: cleanCaliber(a.caliber), pen: a.penetrationPower, dmg: a.damage,
    frag: Math.round(a.fragmentationChance * 100), proj: a.projectileCount, price: a.item.avg24hPrice,
  })),
);
const armorRows = computed(() =>
  (armor.data.value ?? [])
    .filter((a) => a.properties?.class != null)
    .map((a) => ({
      id: a.id, icon: a.iconLink, wiki: a.wikiLink, name: a.shortName || a.name,
      cls: a.properties!.class as number, dura: a.properties!.durability ?? 0,
      mat: a.properties!.material?.name ?? '—', speed: a.properties!.speedPenalty ?? 0,
      ergo: a.properties!.ergoPenalty ?? 0, price: a.avg24hPrice,
    })),
);
const gunRows = computed(() =>
  (guns.data.value ?? [])
    .filter((g) => g.properties?.caliber)
    .map((g) => ({
      id: g.id, icon: g.iconLink, wiki: g.wikiLink, name: g.shortName || g.name,
      caliber: cleanCaliber(g.properties!.caliber), ergo: g.properties!.ergonomics ?? 0,
      recoil: g.properties!.recoilVertical ?? 0, fireRate: g.properties!.fireRate ?? 0,
      dist: g.properties!.effectiveDistance ?? 0, price: g.avg24hPrice,
    })),
);
const lootRows = computed(() =>
  (loot.data.value ?? []).map((l) => {
    const slots = (l.width || 1) * (l.height || 1);
    const vendors = (l.sellFor ?? []).filter((s) => s.vendor.normalizedName !== 'flea-market');
    const best = vendors.sort((a, b) => b.priceRUB - a.priceRUB)[0];
    const flea = l.avg24hPrice ?? 0;
    const keep = (l.usedInTasks?.length ?? 0) > 0;
    const value = Math.max(flea, best?.priceRUB ?? 0);
    return {
      id: l.id, icon: l.iconLink, wiki: l.wikiLink, name: l.shortName || l.name,
      size: `${l.width}×${l.height}`, slots,
      vendorName: best?.vendor.name ?? '—', vendorPrice: best?.priceRUB ?? 0,
      flea, perSlot: Math.round(value / slots), keep,
    };
  }),
);

/* ---- columns ---- */
const ammoCols: Column[] = [
  { key: 'name', label: 'Cartouche', sortable: false },
  { key: 'caliber', label: 'Calibre' },
  { key: 'pen', label: 'Pénétration', align: 'right' },
  { key: 'dmg', label: 'Dégâts', align: 'right' },
  { key: 'frag', label: 'Frag %', align: 'right' },
  { key: 'proj', label: 'Proj.', align: 'right' },
  { key: 'price', label: 'Flea', align: 'right' },
];
const armorCols: Column[] = [
  { key: 'name', label: 'Armure', sortable: false },
  { key: 'cls', label: 'Classe', align: 'right' },
  { key: 'dura', label: 'Durab.', align: 'right' },
  { key: 'mat', label: 'Matériau' },
  { key: 'speed', label: 'Vitesse', align: 'right' },
  { key: 'price', label: 'Flea', align: 'right' },
];
const gunCols: Column[] = [
  { key: 'name', label: 'Arme', sortable: false },
  { key: 'caliber', label: 'Calibre' },
  { key: 'ergo', label: 'Ergo', align: 'right' },
  { key: 'recoil', label: 'Recul V.', align: 'right' },
  { key: 'fireRate', label: 'Cadence', align: 'right' },
  { key: 'dist', label: 'Dist. eff.', align: 'right' },
  { key: 'price', label: 'Flea', align: 'right' },
];
const lootCols: Column[] = [
  { key: 'name', label: 'Objet', sortable: false },
  { key: 'size', label: 'Taille', sortValue: (r) => r.slots },
  { key: 'vendorPrice', label: 'Meilleur PNJ', align: 'right' },
  { key: 'flea', label: 'Flea (24h)', align: 'right' },
  { key: 'perSlot', label: '₽ / slot', align: 'right' },
  { key: 'keep', label: 'Verdict', align: 'center', sortValue: (r) => (r.keep ? 1 : 0) },
];

const tabs = [
  { id: 'ammo', label: 'Munitions', r: ammo }, { id: 'armor', label: 'Armures', r: armor },
  { id: 'guns', label: 'Armes', r: guns }, { id: 'loot', label: 'Vendre / Garder', r: loot },
] as const;
</script>

<template>
  <section>
    <span class="kick">Module 03 — Arsenal & Loot</span>
    <h1 class="title">Munitions, armures & loot</h1>
    <p class="lead">Données triables et live. Trie par pénétration, classe, ergonomie ou valeur au slot. L'onglet loot indique quoi garder (quête) ou revendre, et où.</p>

    <div class="pillrow">
      <button v-for="t in tabs" :key="t.id" class="chip" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </div>

    <!-- Munitions -->
    <div v-if="tab === 'ammo'">
      <Spinner v-if="ammo.loading.value" />
      <p v-else-if="ammo.error.value" class="err">Erreur : {{ ammo.error.value }}</p>
      <SortableTable v-else :columns="ammoCols" :rows="ammoRows" initial-key="pen" :initial-dir="-1">
        <template #cell-name="{ row }"><div class="namecell"><img v-if="row.icon" :src="row.icon" class="icon sm" /><a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.name }}</a><span v-else>{{ row.name }}</span></div></template>
        <template #cell-pen="{ row }"><b :style="{ color: penColor(row.pen) }">{{ row.pen }}</b></template>
        <template #cell-frag="{ row }">{{ row.frag }}%</template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </SortableTable>
    </div>

    <!-- Armures -->
    <div v-else-if="tab === 'armor'">
      <Spinner v-if="armor.loading.value" />
      <p v-else-if="armor.error.value" class="err">Erreur : {{ armor.error.value }}</p>
      <SortableTable v-else :columns="armorCols" :rows="armorRows" initial-key="cls" :initial-dir="-1">
        <template #cell-name="{ row }"><div class="namecell"><img v-if="row.icon" :src="row.icon" class="icon sm" /><a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.name }}</a><span v-else>{{ row.name }}</span></div></template>
        <template #cell-cls="{ row }"><span class="badge" :style="{ color: classColor(row.cls), borderColor: 'currentColor' }">CL.{{ row.cls }}</span></template>
        <template #cell-speed="{ row }">{{ pct(row.speed) }}</template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </SortableTable>
    </div>

    <!-- Armes -->
    <div v-else-if="tab === 'guns'">
      <Spinner v-if="guns.loading.value" />
      <p v-else-if="guns.error.value" class="err">Erreur : {{ guns.error.value }}</p>
      <SortableTable v-else :columns="gunCols" :rows="gunRows" initial-key="ergo" :initial-dir="-1">
        <template #cell-name="{ row }"><div class="namecell"><img v-if="row.icon" :src="row.icon" class="icon sm" /><a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.name }}</a><span v-else>{{ row.name }}</span></div></template>
        <template #cell-dist="{ row }">{{ row.dist }} m</template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </SortableTable>
    </div>

    <!-- Loot -->
    <div v-else>
      <Spinner v-if="loot.loading.value" />
      <p v-else-if="loot.error.value" class="err">Erreur : {{ loot.error.value }}</p>
      <SortableTable v-else :columns="lootCols" :rows="lootRows" initial-key="perSlot" :initial-dir="-1">
        <template #cell-name="{ row }"><div class="namecell"><img v-if="row.icon" :src="row.icon" class="icon sm" /><a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.name }}</a><span v-else>{{ row.name }}</span></div></template>
        <template #cell-vendorPrice="{ row }"><span class="muted" style="font-size: 10px">{{ row.vendorName }}</span> {{ num(row.vendorPrice) }}</template>
        <template #cell-flea="{ row }">{{ num(row.flea) }}</template>
        <template #cell-perSlot="{ row }"><b style="color: var(--acid)">{{ num(row.perSlot) }}</b></template>
        <template #cell-keep="{ row }"><span class="badge" :class="row.keep ? 'b-quest' : 'b-info'">{{ row.keep ? 'GARDER' : 'vendre' }}</span></template>
      </SortableTable>
    </div>
  </section>
</template>

<style scoped>
.namecell { display: flex; align-items: center; gap: 9px; }
.namecell a, .namecell span { font-family: var(--body); font-size: 12.5px; }
.err { color: var(--red); font-family: var(--mono); }
</style>
