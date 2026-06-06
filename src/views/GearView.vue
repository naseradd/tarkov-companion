<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchAmmo, fetchArmor, fetchGuns, type Ammo, type ArmorItem, type GunItem } from '@/lib/tarkov';
import { penRating, ratingColor, ratingLabel, ammoTier, ARMOR_CLASSES, type PenCell } from '@/lib/penetration';
import { rub, num, cleanCaliber, pct } from '@/lib/format';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import Spinner from '@/components/ui/Spinner.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Combobox from '@/components/ui/Combobox.vue';
import Chip from '@/components/ui/Chip.vue';
import Badge from '@/components/ui/Badge.vue';
import IconBox from '@/components/ui/IconBox.vue';

const game = useGameStore();
const tab = ref<'ammo' | 'armor' | 'guns'>('ammo');

const ammo = useResource<Ammo[]>('ammo', fetchAmmo);
const armor = useResource<ArmorItem[]>('armor', fetchArmor);
const guns = useResource<GunItem[]>('guns', fetchGuns);

/* ---------------- Ammo matrix ---------------- */
const caliber = ref('');
const targetClass = ref(0); // 0 = toutes
const affordableOnly = ref(false);

const calibers = computed(() => {
  const s = new Set<string>();
  for (const a of ammo.data.value ?? []) if (a.caliber) s.add(a.caliber);
  return [{ value: '', label: 'Tous calibres' }, ...[...s].map((c) => ({ value: c, label: cleanCaliber(c) })).sort((a, b) => a.label.localeCompare(b.label))];
});

function canBuy(a: Ammo): boolean {
  for (const b of a.item.buyFor ?? []) {
    if (b.vendor.normalizedName === 'flea-market') { if (game.fleaUnlocked) return true; continue; }
    if (b.vendor.trader) { if ((b.vendor.minTraderLevel ?? 1) <= game.traderLL(b.vendor.trader.normalizedName)) return true; }
  }
  return false;
}

const ammoRows = computed(() => {
  let list = (ammo.data.value ?? []).filter((a) => a.penetrationPower != null);
  if (caliber.value) list = list.filter((a) => a.caliber === caliber.value);
  if (affordableOnly.value) list = list.filter(canBuy);
  let rows = list.map((a) => {
    const cells: PenCell[] = ARMOR_CLASSES.map((c) => penRating(a.penetrationPower, c));
    const r: any = {
      id: a.item.id, icon: a.item.iconLink, wiki: a.item.wikiLink, name: a.item.shortName || a.item.name, full: a.item.name,
      caliber: cleanCaliber(a.caliber), pen: a.penetrationPower, dmg: a.damage,
      frag: Math.round(a.fragmentationChance * 100), price: a.item.avg24hPrice, tier: ammoTier(a.penetrationPower).maxClass,
      buyable: canBuy(a),
    };
    cells.forEach((c, i) => { r['c' + (i + 1)] = c.rating; r['cell' + (i + 1)] = c; });
    return r;
  });
  if (targetClass.value) rows = rows.filter((r) => r['c' + targetClass.value] >= 1).sort((a, b) => b['c' + targetClass.value] - a['c' + targetClass.value] || b.pen - a.pen);
  return rows;
});

const ammoCols = computed<Column[]>(() => {
  const cls: Column[] = ARMOR_CLASSES.map((c) => ({ key: 'c' + c, label: 'Cl.' + c, align: 'center' as const, width: '52px' }));
  return [
    { key: 'name', label: 'Cartouche', sortable: false },
    { key: 'pen', label: 'Pen', align: 'right' },
    { key: 'dmg', label: 'Dég.', align: 'right' },
    { key: 'frag', label: 'Frag', align: 'right' },
    ...cls,
    { key: 'price', label: 'Flea', align: 'right' },
  ];
});

/* ---------------- Armor ---------------- */
const armorRows = computed(() =>
  (armor.data.value ?? [])
    .filter((a) => a.properties?.class != null)
    .map((a) => {
      const p = a.properties!;
      const plates = (p.armorSlots ?? []).filter((s) => (s.allowedPlates?.length ?? 0) > 0).length;
      return {
        id: a.id, icon: a.iconLink, bg: a.backgroundColor, wiki: a.wikiLink, name: a.shortName || a.name, full: a.name,
        cls: p.class as number, dura: p.durability ?? 0, mat: p.material?.name ?? '—',
        plates, ergo: p.ergoPenalty ?? 0, speed: p.speedPenalty ?? 0, price: a.avg24hPrice,
        rig: a.types?.includes('rig') && !a.types?.includes('armor'),
      };
    }),
);
const classColor = (c: number) => (c >= 5 ? 'var(--positive)' : c >= 4 ? 'var(--accent)' : c >= 3 ? 'var(--amber)' : 'var(--ink-2)');
const armorCols: Column[] = [
  { key: 'name', label: 'Armure', sortable: false },
  { key: 'cls', label: 'Classe', align: 'right' },
  { key: 'dura', label: 'Durab.', align: 'right' },
  { key: 'mat', label: 'Matériau' },
  { key: 'plates', label: 'Plaques', align: 'right' },
  { key: 'ergo', label: 'Ergo', align: 'right' },
  { key: 'speed', label: 'Vitesse', align: 'right' },
  { key: 'price', label: 'Flea', align: 'right' },
];

/* ---------------- Guns ---------------- */
const gunRows = computed(() =>
  (guns.data.value ?? [])
    .filter((g) => g.properties?.caliber)
    .map((g) => ({
      id: g.id, icon: g.iconLink, bg: g.backgroundColor, wiki: g.wikiLink, name: g.shortName || g.name, full: g.name,
      ammo: g.properties!.defaultAmmo?.name ?? null,
      caliber: cleanCaliber(g.properties!.caliber), ergo: g.properties!.ergonomics ?? 0,
      recoil: g.properties!.recoilVertical ?? 0, fireRate: g.properties!.fireRate ?? 0,
      dist: g.properties!.effectiveDistance ?? 0, price: g.avg24hPrice,
    })),
);
const gunCols: Column[] = [
  { key: 'name', label: 'Arme', sortable: false },
  { key: 'caliber', label: 'Calibre' },
  { key: 'ergo', label: 'Ergo', align: 'right' },
  { key: 'recoil', label: 'Recul V.', align: 'right' },
  { key: 'fireRate', label: 'Cadence', align: 'right' },
  { key: 'dist', label: 'Dist. eff.', align: 'right' },
  { key: 'price', label: 'Flea', align: 'right' },
];

const tabOpts = [
  { value: 'ammo', label: 'Ammo × Armure' },
  { value: 'armor', label: 'Armures' },
  { value: 'guns', label: 'Armes' },
];
const classChips = [0, 1, 2, 3, 4, 5, 6];
</script>

<template>
  <section class="view">
    <span class="kicker">Gear</span>
    <h1 class="page-title">Ta balle passe-t-elle ?</h1>
    <p class="lead">
      Matrice munition × classe d'armure : chaque case note l'efficacité (pen vs classe). Filtre par calibre,
      cible une classe d'armure, ou n'affiche que ce que tu peux acheter à tes niveaux de marchand.
    </p>

    <div class="bar"><SegmentedControl v-model="tab" :options="tabOpts" /></div>

    <!-- AMMO MATRIX -->
    <div v-if="tab === 'ammo'">
      <div class="controls">
        <div class="cb"><Combobox v-model="caliber" :options="calibers" size="sm" /></div>
        <div class="targets">
          <span class="ctl-lbl">Cible :</span>
          <Chip v-for="c in classChips" :key="c" :active="targetClass === c" @click="targetClass = c">{{ c === 0 ? 'Toutes' : 'Cl.' + c }}</Chip>
        </div>
        <Chip :active="affordableOnly" @click="affordableOnly = !affordableOnly">Achetable maintenant</Chip>
      </div>
      <div class="ratingkey">
        <span v-for="r in [4, 3, 2, 1, 0]" :key="r" class="rk"><i :style="{ background: ratingColor(r as any) }" />{{ ratingLabel(r as any) }}</span>
      </div>

      <Spinner v-if="ammo.loading.value" block label="Chargement des munitions…" />
      <p v-else-if="ammo.error.value" class="err">Erreur : {{ ammo.error.value }}</p>
      <DataTable v-else :columns="ammoCols" :rows="ammoRows" initial-key="pen" :initial-dir="-1">
        <template #cell-name="{ row }">
          <div class="namecell">
            <IconBox :src="row.icon" :size="30" />
            <div class="ammoname">
              <span class="gn-line">
                <a v-if="row.wiki" :href="row.wiki" target="_blank" :title="row.full">{{ row.name }}</a><span v-else>{{ row.name }}</span>
                <a v-if="row.wiki" :href="row.wiki" target="_blank" class="wikiic" title="Voir sur le wiki">↗</a>
              </span>
              <span class="cal">{{ row.caliber }}</span>
            </div>
            <span v-if="!row.buyable" class="nobuy" title="Hors de portée à tes niveaux de marchand">🔒</span>
          </div>
        </template>
        <template #cell-frag="{ row }">{{ row.frag }}%</template>
        <template v-for="c in ARMOR_CLASSES" :key="c" #[`cell-c${c}`]="{ row }">
          <span class="cell" :style="{ background: ratingColor(row['cell' + c].rating), opacity: 0.18 + row['cell' + c].rating * 0.2 }" :title="`Classe ${c} · ratio ${(row['cell' + c].ratio).toFixed(2)} · ${ratingLabel(row['cell' + c].rating)}`">
            <b :style="{ color: ratingColor(row['cell' + c].rating) }">{{ row['cell' + c].rating }}</b>
          </span>
        </template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </DataTable>
    </div>

    <!-- ARMOR -->
    <div v-else-if="tab === 'armor'">
      <Spinner v-if="armor.loading.value" block label="Chargement des armures…" />
      <p v-else-if="armor.error.value" class="err">Erreur : {{ armor.error.value }}</p>
      <DataTable v-else :columns="armorCols" :rows="armorRows" initial-key="cls" :initial-dir="-1">
        <template #cell-name="{ row }">
          <div class="namecell">
            <IconBox :src="row.icon" :bg="row.bg" :size="32" />
            <a v-if="row.wiki" :href="row.wiki" target="_blank" :title="row.full">{{ row.name }}</a><span v-else>{{ row.name }}</span>
            <a v-if="row.wiki" :href="row.wiki" target="_blank" class="wikiic" title="Voir sur le wiki">↗</a>
            <Badge v-if="row.rig" variant="info">rig</Badge>
          </div>
        </template>
        <template #cell-cls="{ row }"><b :style="{ color: classColor(row.cls) }">Cl.{{ row.cls }}</b></template>
        <template #cell-plates="{ row }">{{ row.plates || '—' }}</template>
        <template #cell-ergo="{ row }">{{ row.ergo }}</template>
        <template #cell-speed="{ row }">{{ pct(row.speed / 100) }}</template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </DataTable>
    </div>

    <!-- GUNS -->
    <div v-else>
      <Spinner v-if="guns.loading.value" block label="Chargement des armes…" />
      <p v-else-if="guns.error.value" class="err">Erreur : {{ guns.error.value }}</p>
      <DataTable v-else :columns="gunCols" :rows="gunRows" initial-key="ergo" :initial-dir="-1">
        <template #cell-name="{ row }">
          <div class="namecell">
            <IconBox :src="row.icon" :bg="row.bg" :size="34" />
            <div class="gunname">
              <span class="gn-line">
                <a v-if="row.wiki" :href="row.wiki" target="_blank">{{ row.full }}</a><span v-else>{{ row.full }}</span>
                <a v-if="row.wiki" :href="row.wiki" target="_blank" class="wikiic" title="Voir sur le wiki">↗</a>
              </span>
              <span v-if="row.ammo" class="gn-sub">munition par défaut : {{ row.ammo }}</span>
            </div>
          </div>
        </template>
        <template #cell-dist="{ row }">{{ row.dist }} m</template>
        <template #cell-price="{ row }">{{ rub(row.price) }}</template>
      </DataTable>
    </div>
  </section>
</template>

<style scoped>
.bar { margin-bottom: 16px; }
.controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; }
.cb { width: 180px; }
.targets { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ctl-lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-3); }
.ratingkey { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; font-size: 11.5px; color: var(--ink-3); }
.rk { display: inline-flex; align-items: center; gap: 5px; }
.rk i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.namecell { display: flex; align-items: center; gap: 10px; }
.namecell a, .namecell > span { font-size: 13.5px; }
.ammoname { display: flex; flex-direction: column; line-height: 1.25; }
.gunname { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.gn-line { display: inline-flex; align-items: center; gap: 6px; }
.gn-sub { font-size: 11px; color: var(--ink-3); }
.cal { font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); }
.wikiic { font-size: 11px; color: var(--ink-3); flex: 0 0 auto; }
.wikiic:hover { color: var(--amber); }
.nobuy { margin-left: auto; font-size: 11px; }
.cell { display: inline-grid; place-items: center; width: 34px; height: 26px; border-radius: var(--r-xs); }
.cell b { font-family: var(--font-mono); font-size: 13px; }
.err { color: var(--red); font-family: var(--font-mono); }
</style>
