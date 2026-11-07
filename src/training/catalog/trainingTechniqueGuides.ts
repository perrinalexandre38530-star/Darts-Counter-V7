/** Original MSS practice prompts: not a transcription of any third-party course. */
export type TechniqueGuideStep = { title: string; cue: string };

const GUIDES: Record<string, TechniqueGuideStep[]> = {
  tech_feet: [
    { title: "Installe tes appuis", cue: "Choisis une position des pieds confortable et garde le corps stable à l'oche." },
    { title: "Repère ton équilibre", cue: "Effectue trois lancers sans déplacer tes pieds. Observe si ton centre de gravité bouge." },
    { title: "Reproduis", cue: "Recule, replace-toi et refais exactement la même installation avant chaque volée." },
  ],
  tech_elbow: [
    { title: "Aligne le geste", cue: "Présente ton avant-bras dans la direction de la zone choisie, sans forcer l'épaule." },
    { title: "Observe le coude", cue: "Sur trois lancers, surveille les écarts latéraux du coude. Cherche une trajectoire simple." },
    { title: "Stabilise", cue: "Répète une volée en gardant un point de départ identique pour le bras." },
  ],
  tech_rear_foot: [
    { title: "Teste l'appui", cue: "Ajuste le pied arrière jusqu'à trouver un équilibre naturel." },
    { title: "Mesure les tensions", cue: "Lance une volée puis vérifie que genou, bassin et épaule restent décontractés." },
    { title: "Garde ton repère", cue: "Reviens à l'oche et replace le pied arrière au même endroit plusieurs fois." },
  ],
  tech_release: [
    { title: "Prépare le lâcher", cue: "Prends la fléchette sans serrer exagérément les doigts." },
    { title: "Laisse partir", cue: "Pendant trois lancers, laisse l'ouverture des doigts accompagner le mouvement du bras." },
    { title: "Répète sans forcer", cue: "Travaille une sortie naturelle et similaire sur toute la volée." },
  ],
  tech_extension: [
    { title: "Prépare le bras", cue: "Choisis une amplitude de mouvement fluide, sans tension inutile." },
    { title: "Accompagne vers la cible", cue: "Laisse l'avant-bras s'étendre vers la zone visée, sans casser le rythme." },
    { title: "Fixe une sensation", cue: "Répète plusieurs volées en retrouvant la même accélération progressive." },
  ],
  tech_follow: [
    { title: "Observe la fin", cue: "Après le lancer, conserve une seconde la position finale du bras." },
    { title: "Compare trois gestes", cue: "Vérifie si la main termine au même endroit sur trois fléchettes." },
    { title: "Stabilise le suivi", cue: "Refais une volée en privilégiant un mouvement complet et régulier." },
  ],
  tech_pullback: [
    { title: "Définis l'armement", cue: "Trouve un recul d'avant-bras confortable qui ne modifie pas ton équilibre." },
    { title: "Garde une amplitude", cue: "Sur trois lancers, essaie de retrouver la même distance de recul." },
    { title: "Lance avec fluidité", cue: "Enchaîne le recul et l'extension dans un mouvement sans pause artificielle." },
  ],
  tech_rhythm: [
    { title: "Choisis ton tempo", cue: "Installe-toi, vise et lance à un rythme confortable, sans accélérer au hasard." },
    { title: "Régularise les intervalles", cue: "Garde à peu près le même temps entre chaque fléchette de la volée." },
    { title: "Vérifie sous pression", cue: "Change de cible mais conserve le même tempo d'installation et de lancer." },
  ],
  tech_routine: [
    { title: "Construis tes repères", cue: "Choisis trois gestes simples à répéter avant chaque volée." },
    { title: "Enchaîne sans hésiter", cue: "Reprends ces mêmes repères sur trois volées, même si le résultat varie." },
    { title: "Teste la constance", cue: "Fais une courte pause et retrouve immédiatement la même préparation." },
  ],
  tech_gaze: [
    { title: "Choisis un point", cue: "Au lieu de regarder toute la cible, fixe une petite zone précise." },
    { title: "Garde le regard", cue: "Pendant la volée, maintiens la focalisation sur ce point pendant le geste." },
    { title: "Transfère la méthode", cue: "Change de segment sans changer la façon de fixer la zone choisie." },
  ],
};

export function getTrainingTechniqueGuide(id: string, fallback: string): TechniqueGuideStep[] {
  return GUIDES[id] || [
    { title: "Comprendre le geste", cue: fallback },
    { title: "Essayer", cue: "Lance une volée en prêtant attention à un seul repère technique." },
    { title: "Répéter", cue: "Refais le geste en recherchant une sensation stable." },
  ];
}
