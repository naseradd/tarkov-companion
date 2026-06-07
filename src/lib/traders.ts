// Connaissance métier curatée par marchand : identité, spécialité, comment monter
// sa loyauté (LL), et pièges. Les seuils chiffrés (niveau / rép / commerce) viennent
// de l'API (TraderShop.levels) ; ici on documente le « comment », stable entre wipes.

export interface TraderTip {
  /** Une ligne d'identité. */
  tagline: string;
  /** Ce qu'il vend de meilleur / pourquoi on va le voir. */
  sells: string;
  /** Catégories d'items où il est le meilleur acheteur (vendre = commerce). */
  bestBuyer: string;
  /** Actions concrètes pour monter sa loyauté. */
  levelUp: string[];
  /** Piège ou détail non-évident. */
  watch?: string;
  /** Accent de teinte pour la page (token CSS). */
  accent?: string;
}

// Clé = normalizedName de tarkov.dev.
export const TRADER_TIPS: Record<string, TraderTip> = {
  prapor: {
    tagline: 'Quartier-maître. Armes, munitions et grenades de base, en roubles.',
    sells: 'Armes AK & SKS, munitions de départ, grenades, magazines, premières optiques.',
    bestBuyer: 'Armes brutes ramassées sur les Scavs, magazines, pièces militaires.',
    levelUp: [
      'Enchaîne ses quêtes (gros standing) — c’est la voie principale de loyauté.',
      'Vends-lui les armes de Scav non lootables au flea : monte le commerce roubles vite.',
      'LL2 demande niveau 15 — synchro avec le déblocage du flea.',
    ],
    watch: 'Plusieurs de ses quêtes donnent du standing négatif à d’autres marchands — vérifie le badge rouge avant de rendre.',
  },
  therapist: {
    tagline: 'Médecin. Soins, bouffe, conteneurs sécurisés. Le meilleur générateur de commerce.',
    sells: 'Médikits, provisions, conteneur sécurisé (Γ puis plus grand en LL), sacs sécurisés.',
    bestBuyer: 'Items barter (provisions, ménager, médical) et meds — top acheteur roubles.',
    levelUp: [
      'Revends-lui tes barter items et meds lootés : c’est le marchand commerce n°1.',
      'Fais ses quêtes médicales tôt — gros standing et déblocage de soins.',
      'Vise LL pour agrandir le conteneur sécurisé : énorme gain de slots sécurisés.',
    ],
    watch: 'Garde quelques medkits/IFAK : souvent requis en FiR pour ses quêtes.',
  },
  skier: {
    tagline: 'Trafiquant. Armes, mods, et quelques conteneurs. Roubles et euros.',
    sells: 'Armes & mods variés, certains sacs/rigs, items barter contre euros.',
    bestBuyer: 'Armes et mods de milieu de gamme, montres et objets de valeur.',
    levelUp: [
      'Ses quêtes rapportent bien ; certaines sont orientées action/PvP.',
      'Vendre des armes assemblées (gunsmith) lui pousse le commerce.',
      'Garde des euros : plusieurs de ses barters et achats sont en €.',
    ],
  },
  peacekeeper: {
    tagline: 'Marchand OTAN. Optiques, armes US/EU et munitions — paie en DOLLARS.',
    sells: 'Optiques (red dots, lunettes), armes 5.56/M4, munitions OTAN, casques.',
    bestBuyer: 'Optiques, électronique militaire, items OTAN.',
    levelUp: [
      'Garde tes dollars : son commerce et ses achats sont en USD.',
      'Ses quêtes débloquent les optiques et munitions meta — priorise-les pour le gear.',
      'Vendre de l’électronique / optiques lootées monte son commerce.',
    ],
    watch: 'Commerce compté en dollars : convertis (≈ via flea) avant de viser un palier.',
  },
  mechanic: {
    tagline: 'Armurier. Mods d’armes, munitions meta, clés. Débloque Jaeger.',
    sells: 'Mods d’ergonomie/recul, munitions perforantes meta, clés, outils.',
    bestBuyer: 'Mods d’armes, électronique, outils et pièces techniques.',
    levelUp: [
      'Fais « Introduction » tôt : elle débloque Jaeger.',
      'Les quêtes Gunsmith donnent gros XP/standing — garde les armes de base requises.',
      'Revends-lui mods et électronique pour pousser le commerce.',
    ],
    watch: 'Gunsmith exige des builds exacts en FiR : ne vends pas les armes/mods de départ.',
  },
  ragman: {
    tagline: 'Fripier. Armures, rigs, sacs, casques, vêtements. Top acheteur de gear.',
    sells: 'Armures lourdes, plate carriers, sacs à dos, casques, fringues.',
    bestBuyer: 'Armures, rigs, sacs et casques lootés — montée de commerce la plus rapide.',
    levelUp: [
      'Vends-lui tout le gear de corps loot : c’est de loin le commerce le plus rapide du wipe.',
      'Ses quêtes « collecte » demandent des items précis — check avant de tout vendre.',
      'LL3+ débloque les meilleurs sacs et plate carriers : objectif prioritaire.',
    ],
  },
  jaeger: {
    tagline: 'Chasseur. Munitions chasse, soins, bouffe. Verrouillé au départ.',
    sells: 'Munitions chasse/marksman, meds, provisions, pièges, items de survie.',
    bestBuyer: 'Items de chasse, food, et certaines munitions.',
    levelUp: [
      'Débloque-le via « Introduction » chez Mechanic.',
      'Ses quêtes sont orientées élimination/exploration — fortes en XP de niveau.',
      'Beaucoup de ses tâches sont requises pour le Kappa : suis-les pour la trame.',
    ],
    watch: 'Inaccessible tant que « Introduction » (Mechanic) n’est pas faite.',
  },
  fence: {
    tagline: 'Receleur. Pas de loyauté classique — sa rép suit ta karma & coop.',
    sells: 'Stock aléatoire d’items joueurs (revendus), parfois de bonnes affaires.',
    bestBuyer: 'Tout, sans FiR — pratique pour fourguer du loot non-FiR rapidement.',
    levelUp: [
      'Monte sa rép via extractions coop et en aidant/épargnant les Player Scavs.',
      'Rendre des objets perdus (lost-and-found) et bien jouer le Scav karma aide.',
      'LL2/LL3 améliorent prix d’achat/vente et le stock — utile en fin de wipe.',
    ],
    watch: 'Tuer des Scavs/PScav en raid fait chuter ta karma → bloque la rép Fence et Lightkeeper.',
  },
  ref: {
    tagline: 'Marchand Arena. Barters en GP coins, items premium.',
    sells: 'Barters exclusifs contre GP coins, gear et conteneurs spécifiques.',
    bestBuyer: '—',
    levelUp: [
      'Lié à l’écosystème Arena / GP coins plutôt qu’au commerce classique.',
      'Garde tes GP coins pour ses barters à forte valeur.',
    ],
  },
};

export const fallbackTip: TraderTip = {
  tagline: 'Marchand.',
  sells: 'Stock variable selon la loyauté.',
  bestBuyer: '—',
  levelUp: ['Fais ses quêtes et vends-lui ce qu’il rachète le mieux pour monter le commerce.'],
};

export const traderTip = (normalizedName: string): TraderTip =>
  TRADER_TIPS[normalizedName] ?? fallbackTip;
