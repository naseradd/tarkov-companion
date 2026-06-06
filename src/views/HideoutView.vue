<script setup lang="ts">
import { computed, ref } from 'vue';
import { useResource } from '@/composables/useResource';
import { fetchHideout, type HideoutStation } from '@/lib/tarkov';
import Spinner from '@/components/Spinner.vue';
import { buildTime } from '@/lib/format';

const { data: stations, loading, error } = useResource<HideoutStation[]>('hideout', fetchHideout);
const expanded = ref<Set<string>>(new Set());
function toggle(id: string) {
  expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id);
  expanded.value = new Set(expanded.value);
}

// Stash en tête, puis ordre alpha
const ordered = computed(() => {
  const list = [...(stations.value ?? [])];
  return list.sort((a, b) => {
    const as = /stash/i.test(a.normalizedName) ? 0 : 1;
    const bs = /stash/i.test(b.normalizedName) ? 0 : 1;
    return as - bs || a.name.localeCompare(b.name);
  });
});

const guides = [
  {
    h: 'Priorités début de wipe',
    p: 'Vise dans l’ordre : Stash niv. 2, Espace sanitaire, Poste médical et Coin nutrition (santé + soins maison), puis Établi (munitions) et Centre de renseignement (réduit le temps des quêtes marchands et débloque des trocs). La Ferme à bitcoins arrive plus tard, c’est un puits à roubles au départ.',
  },
  {
    h: 'Le Stash d’abord',
    p: 'L’espace d’inventaire est ton vrai goulot d’étranglement. Monter le Stash tôt évite de jeter du butin et fluidifie chaque raid. Finance-le en revendant aux marchands le loot à faible valeur au slot et en gardant pour le flea ce qui vaut cher au slot (cf. module Items).',
  },
  {
    h: 'Roubles & rendement',
    p: 'Garde tout ce qui est demandé en quête ou en amélioration (l’onglet Items le signale « GARDER »). Vends aux marchands ce qui s’y vend mieux qu’au flea. Les crafts hideout (propane, munitions, militech) génèrent un revenu passif une fois les stations montées.',
  },
  {
    h: 'Compétences passives',
    p: 'Le Coin nutrition et l’aire de repos régénèrent énergie/hydratation hors raid. Le Hall (Place Lourde) et la Bibliothèque montent les compétences Métabolisme/Attention. Pense à lancer un craft long avant de fermer le jeu.',
  },
];
</script>

<template>
  <section>
    <span class="kick">Module 04 — Hideout & Économie</span>
    <h1 class="title">Hideout & progression</h1>
    <p class="lead">Par où commencer, quoi prioriser, et les prérequis exacts de chaque station (données live).</p>

    <div class="cards">
      <article v-for="g in guides" :key="g.h" class="panel card">
        <h3 class="sec" style="font-size: 15px">{{ g.h }}</h3>
        <p>{{ g.p }}</p>
      </article>
    </div>

    <h2 class="sec" style="margin-top: 26px">Stations & prérequis</h2>
    <Spinner v-if="loading" label="CHARGEMENT DU HIDEOUT…" />
    <p v-else-if="error" class="err">Erreur API : {{ error }}</p>

    <div v-else class="stations">
      <article v-for="s in ordered" :key="s.id" class="panel st" :class="{ prio: /stash/i.test(s.normalizedName) }">
        <header @click="toggle(s.id)">
          <img v-if="s.imageLink" :src="s.imageLink" class="st-img" :alt="s.name" />
          <div class="st-main">
            <div class="st-name">{{ s.name }}<span v-if="/stash/i.test(s.normalizedName)" class="badge b-kappa" style="margin-left: 8px">priorité</span></div>
            <div class="st-sub">{{ s.levels.length }} niveau<span v-if="s.levels.length > 1">x</span></div>
          </div>
          <span class="caret">{{ expanded.has(s.id) ? '–' : '+' }}</span>
        </header>

        <div v-if="expanded.has(s.id)" class="levels">
          <div v-for="lv in s.levels" :key="lv.level" class="lv">
            <div class="lv-head">
              <span class="lv-no">Niv. {{ lv.level }}</span>
              <span class="lv-time">{{ buildTime(lv.constructionTime) }}</span>
            </div>
            <div v-if="lv.itemRequirements.length" class="items">
              <div v-for="(it, i) in lv.itemRequirements" :key="i" class="it">
                <img v-if="it.item.iconLink" :src="it.item.iconLink" class="icon sm" :alt="it.item.name" />
                <div><b>{{ it.count }}×</b> {{ it.item.shortName || it.item.name }}</div>
              </div>
            </div>
            <div class="lv-req">
              <span v-for="(sr, i) in lv.stationLevelRequirements ?? []" :key="'s' + i" class="badge b-info">{{ sr.station.name }} niv. {{ sr.level }}</span>
              <span v-for="(tr, i) in lv.traderRequirements ?? []" :key="'t' + i" class="badge b-lk">{{ tr.trader.name }} LL{{ tr.level }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.card p { font-size: 13px; line-height: 1.55; color: var(--muted); margin: 0; }
.card h3 { color: var(--acid); }
.stations { display: flex; flex-direction: column; gap: 8px; }
.st { padding: 0; overflow: hidden; }
.st.prio { border-color: var(--acid-dim); }
.st header { display: flex; align-items: center; gap: 12px; padding: 11px 14px; cursor: pointer; }
.st-img { width: 38px; height: 38px; object-fit: contain; background: var(--slot); border: 1px solid var(--line2); border-radius: 2px; padding: 2px; flex: 0 0 auto; }
.st-main { flex: 1; }
.st-name { font-family: var(--cond); font-weight: 600; font-size: 16px; text-transform: uppercase; }
.st-sub { font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
.caret { font-family: var(--mono); color: var(--dim); }
.levels { border-top: 1px solid var(--line); padding: 8px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
.lv { border-left: 2px solid var(--line2); padding-left: 12px; }
.lv-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.lv-no { font-family: var(--cond); font-weight: 700; text-transform: uppercase; color: var(--acid); }
.lv-time { font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
.items { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 6px; }
.it { display: flex; align-items: center; gap: 7px; background: #11140d; border: 1px solid var(--line); border-radius: 2px; padding: 4px 8px 4px 4px; font-size: 12px; }
.lv-req { display: flex; flex-wrap: wrap; gap: 5px; }
.err { color: var(--red); font-family: var(--mono); }
</style>
