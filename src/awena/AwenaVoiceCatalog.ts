import { AWENA_VOICE_PROFILE } from "./AwenaVoiceProfile";

export const AWENA_VOICE_CATALOG_VERSION = "1.0.0";
export const AWENA_VOICE_CATALOG_PROFILE = AWENA_VOICE_PROFILE;

export const AWENA_VOICE_CATALOG = {
  identity: {
    hello: "Bonjour, moi c'est Awena.",
    welcome: "Bienvenue dans MULTISPORTS SCORING.",
    intro: "Bonjour, moi c'est Awena. Je peux t'expliquer les modes de jeu, te guider dans l'application et t'aider pendant tes parties.",
    ready: "Je suis prête. À toi de jouer !",
    askMe: "Pose-moi une question quand tu veux.",
    explainOffer: "Tu veux que je t'explique ce mode ?",
    adviceOffer: "Je peux aussi te donner un conseil rapide.",
  },
  navigation: {
    openLocal: "Ouvre Local pour choisir un sport et lancer une partie.",
    chooseDarts: "Choisis Fléchettes pour accéder aux modes de jeu de darts.",
    choosePlayers: "Commence par sélectionner les joueurs, les équipes ou les bots.",
    configure: "Règle les options du mode puis appuie sur Démarrer la partie.",
    back: "Tu peux revenir à la configuration avec le bouton retour en haut de l'écran.",
    settings: "Tu peux modifier mes réglages depuis la page Awena dans Réglages.",
  },
  gameplay: {
    gameStart: "La partie commence. Bonne chance !",
    turnStart: "À toi de jouer, {player}.",
    score: "{player}, tu marques {score} points.",
    remaining: "{player}, il te reste {remaining} points.",
    greatVisit: "Très belle volée !",
    perfect180: "Cent quatre-vingts ! Magnifique !",
    bull: "Bull !",
    doubleBull: "Double bull !",
    checkoutChance: "Tu as une possibilité de sortie.",
    checkoutAdvice: "{player}, tu peux tenter {route}.",
    safeAdvice: "Joue la sécurité pour préparer une meilleure finition au prochain passage.",
    record: "Nouveau record personnel !",
    closeGame: "La partie est terminée.",
    victory: "Bravo {player}, tu remportes la partie !",
    defeat: "La partie est terminée. On remet ça quand tu veux.",
  },
  x01: {
    intro: "En X zéro un, chaque joueur part du score choisi et soustrait le total de ses fléchettes.",
    exactZero: "Pour gagner, il faut atteindre exactement zéro.",
    doubleOut: "En Double Out, la dernière fléchette doit terminer sur un double.",
    masterOut: "En Master Out, tu peux terminer sur un double ou un triple.",
    bust: "Bust. La volée est annulée et ton score revient à sa valeur de début de tour.",
    tip: "Prépare un double confortable avant d'arriver sur ta finition.",
    noCheckout: "Il n'y a pas de checkout direct avec les fléchettes restantes. Prépare la prochaine volée.",
    checkout: "{player}, il te reste {remaining}. Avec {dartsLeft} fléchettes, tu peux tenter {route}.",
  },
  killer: {
    intro: "Dans Killer, chaque joueur doit d'abord devenir Killer avant de pouvoir attaquer ses adversaires.",
    target: "Commence par sécuriser ton propre numéro.",
    attack: "Tu peux maintenant attaquer les vies adverses.",
    danger: "Attention, tu n'as presque plus de vies.",
    tip: "Une fois Killer, cible en priorité l'adversaire le plus dangereux.",
    victory: "Le dernier joueur encore en vie remporte la partie.",
  },
  firefighter: {
    intro: "Bienvenue dans Darts Firefighter. Ta mission est de protéger les territoires menacés par les incendies.",
    critical: "Attention, {territory} est en état critique.",
    fire: "Le feu progresse sur {territory}.",
    protected: "{territory} est maintenant protégé.",
    canadair: "Le Canadair est disponible. Choisis bien le moment de l'utiliser.",
    canadairAdvice: "Le Canadair est intéressant maintenant car plusieurs territoires sont menacés.",
    wind: "Le vent souffle vers {direction}. Surveille les territoires situés dans cette direction.",
    tip: "Priorise les zones critiques avant de chercher les actions les plus spectaculaires.",
  },
  poker: {
    intro: "Dans Darts Poker, les secteurs de la cible correspondent à des cartes.",
    cardWon: "Tu remportes {card}.",
    handComplete: "Ta main est complète.",
    handUpgrade: "Cette carte améliore ta combinaison.",
    tip: "Observe toujours les cartes disponibles avant de choisir ton prochain secteur.",
  },
  catchMe: {
    intro: "Dans Attrape-moi si tu peux, le fuyard et le chasseur ont des objectifs différents.",
    runner: "Tu es le fuyard. Maintiens ton avance.",
    hunter: "Tu es le chasseur. Réduis l'écart progressivement.",
    gap: "L'écart est maintenant de {gap} points.",
    tipRunner: "En fuyard, évite les risques inutiles lorsque ton avance est confortable.",
    tipHunter: "En chasseur, privilégie les zones régulières pour réduire l'écart sans perdre de tours.",
  },
  coach: {
    focus: "Reste concentré sur ton objectif principal.",
    calm: "Prends ton temps. Un lancer propre vaut mieux qu'un lancer précipité.",
    recover: "Ce n'est qu'une volée. Repars sur ton plan de jeu.",
    momentum: "Tu es sur une bonne dynamique. Continue comme ça.",
    strategy: "Je te conseille de privilégier la régularité sur cette séquence.",
  },
  system: {
    noContext: "Je n'ai pas encore assez de contexte pour répondre proprement à cette question.",
    modeNeeded: "Dis-moi quel mode tu veux comprendre.",
    listening: "Je t'écoute.",
    voiceStopped: "D'accord, j'arrête de parler.",
    unavailable: "Je ne peux pas encore répondre précisément à cette question sans inventer une règle.",
  },
} as const;

export type AwenaCatalogSection = keyof typeof AWENA_VOICE_CATALOG;

export function awenaLine(section: AwenaCatalogSection, key: string, vars: Record<string, string | number> = {}): string {
  const group = AWENA_VOICE_CATALOG[section] as Record<string, string>;
  const template = group?.[key];
  if (!template) return "";
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token) => String(vars[token] ?? `{${token}}`));
}

export function flattenAwenaVoiceCatalog(): Array<{ id: string; text: string }> {
  const lines: Array<{ id: string; text: string }> = [];
  for (const [section, group] of Object.entries(AWENA_VOICE_CATALOG)) {
    for (const [key, text] of Object.entries(group)) {
      lines.push({ id: `${section}.${key}`, text: String(text) });
    }
  }
  return lines;
}
