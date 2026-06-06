# EFT Companion — Refonte complète (design + plan)

**Date:** 2026-06-06 · **Branche:** `ui-overhaul`
**Décisions verrouillées:** Vision complète (6 modules + ⌘K + scav helper) · Perso complète (niveau + LL marchands + hideout en localStorage) · Direction visuelle « warm field intelligence » · **Drop PvE** (PvP only, `gameMode:regular` hardcodé).

## 1. Essence du jeu (issue de la recherche)

EFT = une décision répétée sous pression : « ce que je porte vaut-il le risque, et comment je sors vivant avec ». Le jeu force des dizaines d'alt-tab vers le wiki par session pour la même poignée de questions. L'app collapse ces lookups en **verdicts rapides personnalisés**, depuis la data live tarkov.dev + un peu d'état joueur local (zéro compte, tout localStorage).

**Piliers de progression** : niveau PMC (horloge maîtresse, gate flea L15) · DAG des quêtes (→ Kappa via Collector, → Lightkeeper) · loyauté marchands (level + rep + commerce) · ordre de build hideout (moteur à roubles + buffs) · maîtrise éco (keep-vs-sell net de taxe, barter, craft/h) · discipline FiR · connaissance gear (pen vs classe d'armure).

**Pièges que l'UI doit prévenir** : détruire le FiR en mettant un item quête dans le secure container · extraire en « Run Through » (<200 XP & <7 min) · tank la rep d'un marchand avant un gate LL · porter un objet AP inefficace contre cibles molles.

## 2. Information architecture (modules)

| # | Module | Statut | Rôle |
|---|--------|--------|------|
| 0 | **Wipe Dashboard** | NOUVEAU (home `/`) | Où j'en suis + la prochaine chose à faire |
| 1 | **Maps & Extraction** | upgrade | D'ici, quelle sortie et à quel coût |
| 2 | **Quêtes & Progression** | upgrade | Que puis-je faire là maintenant |
| 3 | **Loot & Économie** | upgrade | Garder ou vendre, et où |
| 4 | **Gear: Ammo × Armor** | NOUVEAU | Ma balle pénètre-t-elle |
| 5 | **Hideout Planner** | upgrade | Quoi construire ensuite, à quel coût |
| — | **Command palette ⌘K** | NOUVEAU | Lookup global item/quête/map |
| — | **Scav & karma** | NOUVEAU (petit) | Cooldown + rappels karma (dans Dashboard) |

### Module 0 — Wipe Dashboard
- Input **niveau PMC** (number, localStorage) → alimente la logique d'éligibilité partout.
- Carte **prochain blocage** : plus proche gate parmi flea L15, prochain LL de chaque marchand (requiredPlayerLevel/Reputation/Commerce), prochaine quête bloquante — avec ce qui manque.
- **Anneau Kappa** (X / nb tâches kappaRequired faites) + checklist **Lightkeeper**.
- **Phase de wipe** (early/mid/late) dérivée du niveau + quêtes → priorités adaptées.
- **Hoard list agrégée** : items requis sur toutes quêtes incomplètes + niveaux hideout non construits, flag FiR, compteur « needed for N ».
- Bouton **new wipe / prestige** (confirm) : reset quêtes + niveau.
- Encart **Scav** : estimateur cooldown (timestamp + karma + IC level) + rappels karma.

### Module 1 — Maps & Extraction
- Extractions **filtrées faction**, color-codées : vert=libre, ambre=conditionnelle (switch/flare), bleu=payante (V-Ex), violet=partagée, rouge=clé/mines.
- Badges condition depuis `switches[].name` + `transferItem` (coût/clé). Règles co-op / V-Ex en tooltip.
- Classement **nearest-extract** (cap + distance, client-side) + 2-3 alternatives.
- **Pins objectifs** des quêtes incomplètes & éligibles du joueur sur la map (zones + `exitName` surligné).
- **Bring list** par raid : clés nécessaires (`objectives.requiredKeys`) + rappel cash V-Ex.
- Légende **layers groupés togglables** (extractions / spawns / quêtes / hazards). Garde projection `lib/maps.ts`.

### Module 2 — Quêtes & Progression
- Vue **Available Now** par défaut : `taskRequirements` satisfaits (status = array, gère branches échec), `minPlayerLevel ≤ niveau`, faction OK, `availableDelaySeconds` géré.
- **Checkboxes par objectif** (IDs stables) + % par marchand + filtres Kappa/LK.
- Badge **rep négative** (`finishRewards.traderStanding < 0`).
- Garde **FiR / secure container** sur items quête.
- Groupage **par map** (un raid = tous les objectifs faisables).

### Module 3 — Loot & Économie
- Verdict par item : **KEEP / SELL→trader / LIST flea / FENCE** avec ₽/slot, comparant chaque cash offer marchand vs flea **net de `fleaMarketFee`**, respectant `minLevelForFlea` vs niveau.
- Override **réservation** : KEEP si réservé par quête active (`usedInTasks` ∩ état quêtes) ou niveau hideout non construit, avec raison + warning secure container.
- Table **craft profit/h** (tous crafts, inputs au meilleur buy, output au meilleur sell net, flag si station non construite/task-locked).
- **Barter savings finder** + flèches **prix 48h** (`changeLast48hPercent`).

### Module 4 — Gear: Ammo × Armor
- **Matrice** ammo (lignes) × classes 1-6 (colonnes), cellule = note d'efficacité calculée (pen ≥ classe·10 + heuristique pen-chance), vert/ambre/rouge, clic = détail. Filtre par calibre.
- Planner **« what can I run »** : classe d'armure attendue + LL → ammo viable achetable maintenant + upgrade le moins cher.
- Badges/warnings tier (« AP : faible dégât chair, pas de frag »).
- Armures **plate-aware** (slots + allowedPlates), durabilité effective, silhouette de couverture.

### Module 5 — Hideout Planner
- Track niveaux construits (localStorage) + reco prochain build (cheap, ₽/h, stations flea-fee/scav-cooldown d'abord).
- **Shopping list fusionnée** (coût ₽ via buyFor/avg24h, flag FiR, flag « aussi requis quête »).
- **Calc ROI ferme Bitcoin** (courbe 1/10/25/50 GPU, Solar, break-even).
- Résolveur prérequis (`stationLevelRequirements` + `traderRequirements`).

## 3. Design system — « warm field intelligence »

**Tokens couleur**
```
--canvas #0E0F0C · --surface #16180F · --raised #1C1F15 · --popover #232619
--hairline #2A2F1E · --hairline-2 #3A4329
--accent #B8D43B (green, ≤10-15% surface : sélection/positif) · --accent-soft (glow 15%)
--amber #E9A13A (quêtes/Kappa, secondaire chaud) · --red #DD5A40 (danger only)
--cyan #4FD3C4 · --blue #6BB3EC · --purple #A78BFA · --positive #8FCE54
--pmc=amber · --scav=blue · --shared=green  (factions)
--ink rgba(235,238,225,.92) · --ink-2 .60 · --ink-3 .40 (jamais blanc pur)
```
**Type** : Barlow (sans humaniste) casse normale pour texte/titres ; JetBrains Mono **uniquement** chiffres/calibres/prix/IDs + micro-labels. Échelle display 28-32 / h2 20 / h3 16 / body 14-15 / small 13 / micro-mono 11. line-height 1.5.

**Forme & espace** : radius scale `--r-xs 6 / --r-sm 8 / --r-md 12 / --r-lg 16 / --r-pill 999`. Base spacing 4px (4/8/12/16/24/32/48). Élévation par **lumière + ombres douces**, pas bordures dures (`--shadow-sm/md/lg`).

**Tables** : density toggle (Condensed 40 / Regular 48 / Relaxed 56px, persisté). Texte left, chiffres mono **right-aligned**. Hairlines douces, **hover-lift pas zebra**, header sticky.

**Motion** : ease `cubic-bezier(.2,.8,.2,1)`. Hover lift translateY(-1px)+ombre 140ms ; transitions vue 240-320ms ; **skeleton shimmer** au fetch. `prefers-reduced-motion` respecté. **Kill** scanlines/grain/dot pulsé.

**Identité Tarkov par la substance** : teintes rareté `items.backgroundColor` sur icônes/cards · chiffres mono + voix green/amber-on-dark · max une texture quasi-invisible.

**Pickers** : combobox ARIA (`role=combobox`, `aria-expanded`, `aria-activedescendant`, clavier complet) remplace tous les `<select>`.

## 4. Couche data (tarkov.dev) — extensions

Garder `lib/tarkov.ts` ; étendre les queries (toutes en `gameMode:regular`) :
- **tasks** : + `taskRequirements{task{id name} status}`, `availableDelaySecondsMin`, `finishRewards{traderStanding{trader{name} standing}}`, `objectives{... zones{...} requiredKeys exitName possibleLocations}`.
- **items/loot** : + `buyFor{...}`, `changeLast48hPercent`, `fleaMarketFee`?, `backgroundColor`, `craftsFor{id}`, `bartersFor{id}`, `usedInTasks{id name}`.
- **armor** : + `armorSlots{... allowedPlates{...}}`, `material{destructibility}`, `repairCost`.
- **nouveau** : `traders{ name levels{ level requiredPlayerLevel requiredReputation requiredCommerce } cashOffers? }`, `crafts{...}`, `barters{...}`, `playerLevels{level exp}`, `fleaMarket{sellOfferFeeRate sellRequirementFeeRate minPlayerLevel}`.

`lib/maps.ts` projection : **inchangée**. `format.ts`, `useResource.ts` : tweaks mineurs (drop param mode → regular).

**Store Pinia** grandit : `level:number`, `traderLevels:Record<string,number>`, `hideoutBuilt:Record<string,number>`, `objectivesDone:Set<string>`, `lastScavTs`, `karma`, `intelLevel`, `tableDensity`. Getters d'éligibilité (questAvailable, fleaUnlocked, nextBottleneck).

## 5. Inventaire composants

**Primitives (nouvelles, `components/ui/`)** : `Card`, `Badge`, `Pill`, `Chip`, `Stat`, `Combobox`, `DataTable` (remplace SortableTable), `Skeleton`, `Modal`/`Popover`, `IconBox`, `ProgressRing`, `SegmentedControl`, `Toggle`, `Tooltip`, `EmptyState`.
**Layout** : `App.vue`, `AppHeader` (wordmark + faction segmented + niveau + statut), `AppSidebar` (nav arrondie pilule), `CommandPalette`.
**Carte** : `TacticalMap` (Leaflet, réécrit visuel + layers), `RoutePanel` (combobox), `MapLegend`.
**Modules** : `DashboardView`, `MapsView`, `QuestsView`, `LootView`, `GearView` (+ `AmmoMatrix`, `ArmorTable`), `HideoutView`.
**Logique jeu (`lib/`)** : `penetration.ts` (note ammo×classe), `economy.ts` (verdict, craft/h, barter), `progression.ts` (availability, bottleneck, hoard list), `btc.ts` (ROI).

## 6. Plan de build (phasé)

1. **Foundation** (séquentiel, cohésion critique) : `index.html` fonts, `style.css` tokens+utilitaires+leaflet, `lib/tarkov.ts` étendu, `stores/game.ts`, `lib/format.ts`/`useResource.ts`, `router.ts`, primitives `ui/`, `App/AppHeader/AppSidebar`.
2. **Logique jeu** : `penetration.ts`, `economy.ts`, `progression.ts`, `btc.ts` (+ tests critiques légers).
3. **Vues** (parallélisable, chacune compose les primitives) : Dashboard, Maps(+TacticalMap/RoutePanel), Quests, Loot, Gear, Hideout, CommandPalette.
4. **Intégration + build/type-check** : corriger jusqu'à `npm run build` ✅ et `npm run type-check` ✅, zéro erreur console.
5. **Polish** : screenshots chrome-devtools écran par écran vs « problèmes actuels », ajustements.
6. **Commits** petits et lisibles.

## 7. Critères d'acceptation
- `npm run build` ✅ + `npm run type-check` ✅, zéro erreur runtime.
- 6 modules + ⌘K affichent et chargent la data live.
- Tous `<select>` → Combobox (recherche/clavier/clic-extérieur OK).
- Niveau joueur drive Available Now / gating flea / affordability.
- Rendu nettement arrondi, lisible, premium, cohérent, responsive < 720px.
- PvE supprimé partout.
