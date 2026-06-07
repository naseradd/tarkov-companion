// Fil narratif 1.0 d'Escape from Tarkov — référence curatée.
// IMPORTANT : ces chapitres NE SONT PAS dans les données de quêtes tarkov.dev en
// gameMode:regular (contenu narratif, NPC Kerman/Voevoda/Survivor sans tâches en PvP).
// Donc non trackables par l'app : on les présente en référence, pas en checklist.
// Source : Escape from Tarkov Wiki (Story chapters) + couverture 1.0, juin 2026.

export interface StoryChapter {
  name: string;       // nom in-game (EN)
  fr: string;         // résumé FR
  spine: boolean;     // fait partie du tronc principal Tour → Falling Skies → The Ticket
  order?: number;     // position dans le tronc (si spine)
}

// Les 9 chapitres narratifs officiels. Le tronc principal est ordonné ; les autres
// sont des chapitres liés / d'événements dont l'ordre exact n'est pas garanti.
export const STORY_CHAPTERS: StoryChapter[] = [
  { name: 'Tour', fr: 'Ouverture : débloque les marchands et les cartes, met en place le décor.', spine: true, order: 1 },
  { name: 'Falling Skies', fr: 'Lance la trame : un avion s’écrase, Mr. Kerman te contacte au sujet de la mallette blindée.', spine: true, order: 2 },
  { name: 'The Ticket', fr: 'Acte final : le choix qui détermine laquelle des 4 fins tu obtiens.', spine: true, order: 3 },
  { name: 'Accidental Witness', fr: 'Chapitre narratif lié à la trame TerraGroup.', spine: false },
  { name: 'Batya', fr: 'Chapitre narratif secondaire.', spine: false },
  { name: 'Blue Fire', fr: 'Chapitre narratif secondaire.', spine: false },
  { name: 'The Labyrinth', fr: 'Chapitre narratif secondaire.', spine: false },
  { name: 'The Unheard', fr: 'Chapitre narratif (arc The Unheard).', spine: false },
  { name: 'They Are Already Here', fr: 'Chapitre narratif (arc événementiel).', spine: false },
];

export interface StoryEnding {
  name: string;
  fr: string;
  tone: 'best' | 'good' | 'mixed' | 'bad';
  desc: string;
}

// Les 4 fins, choisies dans « The Ticket ».
export const ENDINGS: StoryEnding[] = [
  { name: 'Savior', fr: 'Sauveur', tone: 'best', desc: 'La « vraie » fin : tu t’évades selon tes termes ET tu sauves ceux qui dépendaient de toi.' },
  { name: 'Survivor', fr: 'Survivant', tone: 'good', desc: 'Tu t’évades net : libre, sans dettes ni obligations.' },
  { name: 'Debtor', fr: 'Débiteur', tone: 'mixed', desc: 'Tu t’évades, mais tu dois 500 millions de roubles à Prapor.' },
  { name: 'Fallen', fr: 'Déchu', tone: 'bad', desc: 'Fin par défaut : tu ne t’évades pas de Tarkov.' },
];

export const spineChapters = () => STORY_CHAPTERS.filter((c) => c.spine).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
export const sideChapters = () => STORY_CHAPTERS.filter((c) => !c.spine);
