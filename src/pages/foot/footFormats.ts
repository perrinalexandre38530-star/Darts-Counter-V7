export type FootFormatId = "penalty" | "1v1" | "2v2" | "3v3" | "5v5" | "7v7" | "8v8" | "11v11";

export type FootFormatSpec = {
  id: FootFormatId;
  label: string;
  icon: string;
  kind: "duel" | "team";
  playersPerSide: number;
  periods: number;
  minutesPerPeriod: number;
  maxPlayersHint: string;
  rules: string[];
};

export const FOOT_FORMATS: FootFormatSpec[] = [
  { id: "penalty", label: "PENALTY", icon: "🥅", kind: "duel", playersPerSide: 1, periods: 1, minutesPerPeriod: 0, maxPlayersHint: "Duel tireur/gardien", rules: ["Séance de tirs au but.", "Chaque camp démarre avec 5 tirs.", "Mort subite disponible si égalité.", "Un tir marqué ajoute 1 but au score."] },
  { id: "1v1", label: "1V1", icon: "⚽", kind: "duel", playersPerSide: 1, periods: 2, minutesPerPeriod: 5, maxPlayersHint: "Duel joueur contre joueur", rules: ["Match court en duel.", "Score libre avec buts, cartons et événements.", "Victoire au score final, nul autorisé hors compétition."] },
  { id: "2v2", label: "2V2", icon: "👥", kind: "team", playersPerSide: 2, periods: 2, minutesPerPeriod: 7, maxPlayersHint: "2 joueurs par équipe", rules: ["Match par équipes de 2.", "Sélection équipe domicile puis extérieur.", "Événements attribuables à l’équipe.", "Nul autorisé hors compétition."] },
  { id: "3v3", label: "3V3", icon: "🔺", kind: "team", playersPerSide: 3, periods: 2, minutesPerPeriod: 8, maxPlayersHint: "3 joueurs par équipe", rules: ["Format réduit rapide.", "Remises en jeu et règles simplifiées.", "Le score équipe suffit pour la V1."] },
  { id: "5v5", label: "FIVE", icon: "🟢", kind: "team", playersPerSide: 5, periods: 2, minutesPerPeriod: 12, maxPlayersHint: "5 joueurs par équipe", rules: ["Format futsal / city.", "Deux périodes configurables.", "Buts, passes, cartons, CSC."] },
  { id: "7v7", label: "7V7", icon: "🛡️", kind: "team", playersPerSide: 7, periods: 2, minutesPerPeriod: 20, maxPlayersHint: "7 joueurs par équipe", rules: ["Format demi-terrain.", "Deux mi-temps configurables.", "Classement compatible tournoi/ligue plus tard."] },
  { id: "8v8", label: "8V8", icon: "⭐", kind: "team", playersPerSide: 8, periods: 2, minutesPerPeriod: 25, maxPlayersHint: "8 joueurs par équipe", rules: ["Format jeunes / loisir.", "Deux périodes configurables.", "Stats équipe prêtes pour l’historique."] },
  { id: "11v11", label: "11V11", icon: "🏟️", kind: "team", playersPerSide: 11, periods: 2, minutesPerPeriod: 45, maxPlayersHint: "11 joueurs par équipe", rules: ["Format football complet.", "Deux mi-temps de 45 min par défaut.", "Buts, passes, jaunes, rouges, CSC."] },
];

export function getFootFormat(id: any): FootFormatSpec {
  return FOOT_FORMATS.find((f) => f.id === id) || FOOT_FORMATS[0];
}
