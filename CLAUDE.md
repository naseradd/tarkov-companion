# EFT Field Terminal — Companion Escape from Tarkov

Companion web pour **Escape from Tarkov** (PvP only). Assiste un joueur dans sa progression scav/PMC : où aller, quoi extraire, quelle quête lancer, garder ou vendre, quelle balle pénètre, quoi construire. Data live tarkov.dev, zéro compte, état joueur en localStorage.

## Commandes
```bash
npm install
npm run dev          # Vite dev server
npm run build        # build prod — DOIT passer
npm run type-check   # vue-tsc --noEmit — DOIT passer
```

## Stack
Vite · Vue 3 (`<script setup lang="ts">`) · Pinia · vue-router · Leaflet brut (CRS.Simple) · **CSS simple piloté par design tokens** dans `src/style.css` (pas de Tailwind, pas de lib UI). Data : API GraphQL communautaire tarkov.dev (`https://api.tarkov.dev/graphql`).

## Architecture
```
src/
  style.css              # design tokens (:root) + utilitaires + overrides Leaflet — cœur du design
  App.vue                # layout : header + sidebar + RouterView animé
  router.ts              # 7 routes (dashboard / cartes / quetes / loot / gear / hideout / config)
  lib/
    tarkov.ts            # client GraphQL + queries + types — gameMode TOUJOURS regular
    maps.ts              # config cartes + projection coords(x,z)→pixels Leaflet — NE PAS toucher la logique
    format.ts            # ₽, temps, cap boussole, distance, calibre
    penetration.ts       # note efficacité ammo × classe d'armure
    economy.ts           # verdict keep/sell, ₽/slot net de taxe, craft/h, barter savings
    progression.ts       # quest availability (DAG), next bottleneck, hoard list agrégée
    btc.ts               # ROI ferme Bitcoin
  stores/game.ts         # Pinia : faction, niveau PMC, LL marchands, hideout build, quêtes+objectifs faits, scav/karma, density (tout localStorage)
  composables/useResource.ts  # fetch caché par ressource
  components/
    ui/                  # primitives : Card Badge Pill Chip Stat Combobox DataTable Skeleton Modal ProgressRing SegmentedControl Toggle Tooltip EmptyState IconBox
    AppHeader.vue AppSidebar.vue CommandPalette.vue
    TacticalMap.vue RoutePanel.vue MapLegend.vue
  views/
    DashboardView MapsView QuestsView LootView GearView HideoutView ConfigView
```

## Design system — « warm field intelligence »
Sombre tactique mais **chaud, arrondi, lisible, premium** (pas le CRT froid). Tout passe par les tokens de `style.css`.
- **Couleur** : rampe olive-charcoal (`--canvas/--surface/--raised/--popover`), élévation par lumière + ombres douces (`--shadow-*`) pas bordures dures. Acid green `--accent` **plafonné ~10-15%** (sélection/positif). Amber `--amber` secondaire (quêtes/Kappa). Rouge `--red` danger only. Texte jamais blanc pur (`--ink/--ink-2/--ink-3`).
- **Type** : Barlow (`--font-sans`) casse normale pour texte/titres ; JetBrains Mono (`--font-mono`) **UNIQUEMENT** chiffres/calibres/prix/IDs + micro-labels.
- **Forme** : radius `--r-xs 6 / --r-sm 8 / --r-md 12 / --r-lg 16 / --r-pill`. Spacing base 4px.
- **Motion** : ease `--ease`, hover-lift, transitions vue, skeleton shimmer. Respecter `prefers-reduced-motion`.
- **Identité Tarkov** : teintes rareté `items.backgroundColor` sur icônes ; voix mono green/amber-on-dark.

## Conventions
- TS partout, production-ready (gestion erreurs, types pertinents). Commentaires **seulement sur décisions non-évidentes**.
- Pickers = `Combobox` ARIA, **jamais** `<select>` natif.
- Tables = `DataTable` (tri + density toggle), chiffres mono right-aligned.
- État joueur = store Pinia → localStorage. Logique d'éligibilité dans `lib/progression.ts`, pas dans les vues.
- Toute query tarkov.dev hardcode `gameMode:regular`.

## Garde-fous (NE PAS casser)
- **Logique** de `lib/maps.ts` (projection, bounds, flipX/flipY) : visuel only, jamais la projection.
- Suivi quêtes/objectifs + état joueur en **localStorage** (pas de backend, pas de comptes — c'est l'avantage UX).
- **Pas de PvE** : `gameMode:regular` partout, pas de toggle mode.
- Pas de Tailwind / lib de composants. CSS simple + tokens.
- Responsive propre < 720px (sidebar → barre horizontale, grilles empilées).

## Pièges de gameplay que l'UI doit prévenir
FiR détruit par le secure container (warning sur items quête) · « Run Through » (<200 XP & <7 min) · tank rep marchand avant gate LL · ammo AP inefficace vs cibles molles.

## Référence
Spec complet : `docs/superpowers/specs/2026-06-06-eft-companion-redesign-design.md`.
