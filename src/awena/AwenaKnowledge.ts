export type AwenaModeKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  summary: string;
  tip: string;
};

const MODES: AwenaModeKnowledge[] = [
  {
    id: "x01",
    label: "X01",
    aliases: ["x01", "301", "501", "701", "901"],
    summary: "En X01, chaque joueur part du score choisi et soustrait le total de ses fléchettes. Le premier qui atteint exactement zéro gagne. Si le Double Out est activé, la dernière fléchette doit être un double.",
    tip: "En Double Out, pense à préparer un double confortable avant la dernière volée. Les doubles 16 et 20 offrent beaucoup de routes de secours.",
  },
  {
    id: "killer",
    label: "Killer",
    aliases: ["killer"],
    summary: "Dans Killer, chaque joueur doit d'abord valider son numéro puis utiliser ses touches pour attaquer les vies des autres joueurs. Le dernier joueur encore en vie remporte la partie.",
    tip: "Ne cherche pas uniquement à attaquer. Sécurise d'abord ton statut de Killer, puis cible le joueur le plus dangereux selon ses vies restantes.",
  },
  {
    id: "darts_firefighter",
    label: "Darts Firefighter",
    aliases: ["firefighter", "pompier", "incendie", "canadair"],
    summary: "Dans Darts Firefighter, les fléchettes déclenchent des actions de lutte contre l'incendie sur les territoires. Il faut protéger les zones menacées, gérer la propagation et utiliser les actions spéciales comme le Canadair au bon moment.",
    tip: "Priorise les territoires critiques et surveille la propagation. Une action spectaculaire vaut moins qu'une intervention qui évite plusieurs pertes au tour suivant.",
  },
  {
    id: "darts_poker",
    label: "Darts Poker",
    aliases: ["poker", "darts poker"],
    summary: "Dans Darts Poker, les secteurs de la cible correspondent à des cartes. Chaque fléchette peut faire gagner une carte et l'objectif est de construire la meilleure main possible dans la limite de fléchettes prévue.",
    tip: "Observe les cartes encore disponibles avant chaque lancer : une cible moins évidente peut améliorer beaucoup plus fortement ta main.",
  },
  {
    id: "attrape_moi",
    label: "Attrape-moi si tu peux",
    aliases: ["attrape", "chasseur", "fuyard", "attrape-moi"],
    summary: "Attrape-moi si tu peux oppose un chasseur et un fuyard. Les deux rôles ont des objectifs différents et la pression change rapidement selon l'écart entre eux.",
    tip: "Adapte ta prise de risque à ton rôle : le fuyard doit maintenir son avance, tandis que le chasseur gagne à choisir les zones qui réduisent l'écart de façon régulière.",
  },
];

export function routeToAwenaMode(route?: string): AwenaModeKnowledge | null {
  const value = String(route || "").toLowerCase();
  if (!value) return null;
  return MODES.find((mode) => mode.aliases.some((alias) => value.includes(alias.replace(/\s+/g, "_")) || value.includes(alias))) || null;
}

export function findAwenaMode(input?: string, route?: string): AwenaModeKnowledge | null {
  const routeMode = routeToAwenaMode(route);
  const value = String(input || "").toLowerCase();
  if (!value) return routeMode;
  return MODES.find((mode) => mode.aliases.some((alias) => value.includes(alias))) || routeMode;
}

export function allAwenaModes() {
  return MODES.slice();
}
