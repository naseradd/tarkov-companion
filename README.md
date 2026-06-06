# EFT · Field Terminal

Companion interactif pour **Escape from Tarkov** : cartes & itinéraires d'extraction, suivi de quêtes, tier lists (munitions / armures / armes), analyse loot vendre-ou-garder, et guide hideout. Données **live** via l'API GraphQL communautaire [tarkov.dev](https://tarkov.dev) (open source). Modes **PvP / PvE** et factions **PMC / Scav**.

> Application web mono-page, sans backend : tout est calculé côté client à partir de l'API publique.

## Stack

Vite · Vue 3 (`<script setup>` + TypeScript) · Pinia · vue-router · Leaflet (cartes `CRS.Simple`).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres scripts :

```bash
npm run build      # build de production -> dist/
npm run preview    # sert le build localement
npm run type-check # vérif TypeScript (vue-tsc)
```

## Créer le repo GitHub & pousser

> ⚠️ Je n'ai pas accès à ton compte GitHub depuis l'environnement où ce projet a été généré — il est livré **prêt-à-pousser**. Une seule fois, en local :

```bash
cd tarkov-companion
git init -b main
git add -A
git commit -m "init: EFT Field Terminal"

# nécessite gh (GitHub CLI) authentifié : gh auth login
gh repo create tarkov-companion --private --source=. --remote=origin --push
```

Sans `gh`, crée le repo vide sur github.com puis :

```bash
git remote add origin git@github.com:<ton-user>/tarkov-companion.git
git push -u origin main
```

## Déploiement

Hébergement statique (Vercel, Netlify, Cloudflare Pages, GitHub Pages). `npm run build` → publie `dist/`.
Comme on utilise l'historique HTML5 de vue-router, configure un **fallback SPA** vers `index.html` (Vercel/Netlify le font par défaut ; pour GitHub Pages, prévois un `404.html` redirigeant vers `index.html`).

## Modules

- **Cartes & extraction** — vraie image vectorielle de la carte (hébergée par tarkov.dev) sur fond Leaflet pan/zoom, spawns et extractions filtrés selon ta faction. Choisis spawn + destination → cap boussole, distance et contraintes (interrupteur, objet requis), + extractions classées par proximité.
- **Quêtes** — toutes les quêtes marchands, filtres (marchand, carte, recherche, Kappa, masquer complétées), objectifs typés, items et clés requis, prérequis. Complétion cochable, **sauvegardée en `localStorage`**.
- **Items** — munitions (pénétration / dégâts / frag), armures (classe / durabilité / pénalités), armes (ergo / recul / cadence), et loot avec meilleur vendeur, prix flea, **₽/slot** et verdict garder/vendre. Tout est triable.
- **Hideout** — guide de progression + stations avec prérequis exacts par niveau (items, stations, marchands, temps de construction).

## Architecture

```
src/
  lib/         tarkov.ts (client GraphQL + types + requêtes), maps.ts (config cartes + projection), format.ts
  stores/      game.ts (mode, faction, quêtes complétées — Pinia + localStorage)
  composables/ useResource.ts (chargement async + cache par mode)
  components/   AppHeader, AppSidebar, TacticalMap, RoutePanel, SortableTable, Spinner
  views/        MapsView, QuestsView, ItemsView, HideoutView
```

### Alignement des cartes

Les positions spawn/extraction viennent de l'API (approximation terrain, pas un GPS). Le repère de projection (`bounds` + `rotation`) provient du jeu de données communautaire utilisé par tarkov.dev. Si sur une carte les marqueurs apparaissent en miroir, passe `flipX` ou `flipY` à `true` dans la définition concernée (`src/lib/maps.ts`) — un seul caractère. Les cartes sans image vectorielle (Labyrinth, Icebreaker) basculent sur une vue schématique ; le bouton renvoie vers la carte détaillée tarkov.dev.

## Données & attribution

- API & cartes : **tarkov.dev** / the-hideout (open source). Le code et les textes de guide de ce projet sont originaux.
- « Escape from Tarkov » et ses contenus sont la propriété de **Battlestate Games**. Projet fan, non affilié.
