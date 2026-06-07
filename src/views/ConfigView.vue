<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useResource } from '@/composables/useResource';
import { fetchTraders, fetchHideout, type TraderFull, type HideoutStation } from '@/lib/tarkov';
import Card from '@/components/ui/Card.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Stat from '@/components/ui/Stat.vue';
import Badge from '@/components/ui/Badge.vue';
import Modal from '@/components/ui/Modal.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Reveal from '@/components/ui/Reveal.vue';

const game = useGameStore();
const traders = useResource<TraderFull[]>('traders', fetchTraders);
const hideout = useResource<HideoutStation[]>('hideout', fetchHideout);

// Marchands réels avec des paliers de loyauté (exclut les pseudo-marchands sans LL)
const traderList = computed(() =>
  (traders.data.value ?? [])
    .filter((t) => t.levels.length > 1)
    .sort((a, b) => a.name.localeCompare(b.name)),
);
const hideoutList = computed(() =>
  [...(hideout.data.value ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
);

const factionOpts = [
  { value: 'PMC', label: 'PMC' },
  { value: 'Scav', label: 'Scav' },
];

const confirmReset = ref(false);
function doReset() { game.resetProgress(); confirmReset.value = false; }
</script>

<template>
  <section class="view">
    <span class="kicker">Configuration</span>
    <h1 class="page-title">Ton état de jeu</h1>
    <p class="lead">
      Saisis ta progression réelle pour rattraper l'app à ton point exact. Tout est stocké en local,
      sans compte. Niveau et loyauté marchands sont indépendants.
    </p>

    <!-- PROFIL -->
    <Reveal :index="0"><Card class="block">
      <span class="kicker">Profil</span>
      <div class="profile">
        <div class="field-row">
          <label>Niveau PMC</label>
          <div class="lvl">
            <button class="step" @click="game.setLevel(game.level - 1)">–</button>
            <input class="lvl-in num" type="number" min="1" max="79" :value="game.level"
              @change="game.setLevel(Number(($event.target as HTMLInputElement).value))" />
            <button class="step" @click="game.setLevel(game.level + 1)">+</button>
          </div>
          <Badge v-if="game.fleaUnlocked" variant="good">Flea débloqué</Badge>
          <Badge v-else variant="info">Flea à niv. 15</Badge>
        </div>
        <div class="field-row">
          <label>Faction</label>
          <SegmentedControl :model-value="game.faction" :options="factionOpts" size="sm"
            @update:model-value="game.setFaction($event as any)" />
        </div>
        <div class="field-row">
          <label>Prestige</label>
          <div class="lvl small">
            <button class="step" @click="game.setPrestige(game.prestige - 1)" :disabled="game.prestige <= 0">–</button>
            <span class="hn num">{{ game.prestige }}</span>
            <button class="step" @click="game.setPrestige(game.prestige + 1)" :disabled="game.prestige >= 5">+</button>
          </div>
          <span class="hint">Débloque les quêtes « New Beginning »</span>
        </div>
      </div>
    </Card></Reveal>

    <!-- MARCHANDS -->
    <Reveal :index="1"><Card class="block">
      <div class="block-head">
        <span class="kicker">Loyauté marchands (LL)</span>
        <span class="hint">Indépendant du niveau PMC</span>
      </div>
      <Spinner v-if="traders.loading.value" label="Chargement…" />
      <div v-else class="traders">
        <div v-for="t in traderList" :key="t.id" class="trow">
          <img v-if="t.imageLink" :src="t.imageLink" class="tav" :alt="t.name" />
          <span class="tname">{{ t.name }}</span>
          <div class="ll">
            <button
              v-for="lv in t.levels.length"
              :key="lv"
              class="llbtn"
              :class="{ on: game.traderLL(t.normalizedName) === lv }"
              @click="game.setTraderLevel(t.normalizedName, lv)"
            >{{ lv }}</button>
          </div>
        </div>
      </div>
    </Card></Reveal>

    <!-- HIDEOUT -->
    <Reveal :index="2"><Card class="block">
      <div class="block-head">
        <span class="kicker">Niveaux hideout construits</span>
        <span class="hint">Sert aux listes d'achat et réservations</span>
      </div>
      <Spinner v-if="hideout.loading.value" label="Chargement…" />
      <div v-else class="hideout">
        <div v-for="s in hideoutList" :key="s.id" class="hrow">
          <img v-if="s.imageLink" :src="s.imageLink" class="hav" :alt="s.name" />
          <span class="hname">{{ s.name }}</span>
          <div class="lvl small">
            <button class="step" :disabled="game.hideoutLevel(s.normalizedName) <= 0"
              @click="game.setHideoutLevel(s.normalizedName, game.hideoutLevel(s.normalizedName) - 1)">–</button>
            <span class="hn num">{{ game.hideoutLevel(s.normalizedName) }}<span class="hmax">/{{ s.levels.length }}</span></span>
            <button class="step" :disabled="game.hideoutLevel(s.normalizedName) >= s.levels.length"
              @click="game.setHideoutLevel(s.normalizedName, Math.min(s.levels.length, game.hideoutLevel(s.normalizedName) + 1))">+</button>
          </div>
        </div>
      </div>
    </Card></Reveal>

    <!-- QUÊTES + RESET -->
    <Reveal :index="3"><Card class="block">
      <span class="kicker">Quêtes & remise à zéro</span>
      <div class="foot-row">
        <div>
          <div class="foot-stat"><Stat tone="accent" :value="game.completedCount">quêtes cochées</Stat></div>
          <p class="hint" style="margin-top: 8px">Coche tes quêtes une à une dans le module Quêtes (filtre « Faites » pour t'y retrouver).</p>
        </div>
        <button class="reset" @click="confirmReset = true">↺ Nouveau wipe / prestige</button>
      </div>
    </Card></Reveal>

    <Modal v-model="confirmReset" title="Nouveau wipe ?">
      Réinitialise niveau, marchands, hideout, quêtes et objectifs. La faction est conservée. Action irréversible.
      <template #footer>
        <button class="btn ghost" @click="confirmReset = false">Annuler</button>
        <button class="btn danger" @click="doReset">Tout réinitialiser</button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.block { margin-bottom: 14px; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.hint { font-size: 12px; color: var(--ink-3); }
.profile { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 14px; }
.field-row { display: flex; align-items: center; gap: 12px; }
.field-row label { font-size: 13.5px; color: var(--ink-2); min-width: 80px; }

.lvl { display: inline-flex; align-items: center; background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--r-pill); padding: 2px; }
.step { width: 28px; height: 28px; border: none; background: transparent; color: var(--ink-2); cursor: pointer; border-radius: var(--r-pill); font-size: 16px; transition: all var(--t1) var(--ease); }
.step:hover:not(:disabled) { background: var(--surface-2); color: var(--accent); }
.step:disabled { opacity: 0.3; cursor: default; }
.lvl-in { width: 46px; text-align: center; background: transparent; border: none; color: var(--ink); font-size: 16px; font-weight: 600; -moz-appearance: textfield; }
.lvl-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.lvl-in:focus { outline: none; }
.lvl.small .step { width: 24px; height: 24px; font-size: 14px; }
.hn { min-width: 42px; text-align: center; font-weight: 600; }
.hmax { color: var(--ink-3); font-weight: 400; }

.num-in { width: 80px; background: var(--canvas); border: 1px solid var(--hairline-2); border-radius: var(--r-sm); color: var(--ink); padding: 7px 10px; font-size: 14px; }
.num-in:focus { outline: none; border-color: var(--accent-dim); }

.traders, .hideout { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-top: 14px; }
.trow, .hrow { display: flex; align-items: center; gap: 11px; background: var(--surface-2); border: 1px solid var(--hairline); border-radius: var(--r-md); padding: 9px 12px; }
.tav, .hav { width: 34px; height: 34px; border-radius: var(--r-xs); object-fit: contain; background: var(--slot-base); border: 1px solid var(--hairline-2); flex: 0 0 auto; }
.tname, .hname { flex: 1; min-width: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ll { display: inline-flex; gap: 3px; }
.llbtn { width: 28px; height: 28px; border: 1px solid var(--hairline-2); background: var(--canvas); color: var(--ink-2); border-radius: var(--r-sm); cursor: pointer; font-family: var(--font-mono); font-size: 13px; transition: all var(--t1) var(--ease); }
.llbtn:hover { border-color: var(--accent-dim); }
.llbtn.on { background: var(--accent); color: var(--ink-on-accent); border-color: var(--accent); font-weight: 700; }

.foot-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 14px; flex-wrap: wrap; }
.reset { background: transparent; border: 1px solid var(--hairline-2); color: var(--ink-3); border-radius: var(--r-sm); padding: 9px 15px; cursor: pointer; font-size: 13px; transition: all var(--t1) var(--ease); }
.reset:hover { border-color: var(--red); color: var(--red); }
.btn { border-radius: var(--r-sm); padding: 9px 16px; cursor: pointer; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--hairline-2); color: var(--ink-2); }
.btn.ghost:hover { color: var(--ink); }
.btn.danger { background: var(--red); color: #fff; }
</style>
