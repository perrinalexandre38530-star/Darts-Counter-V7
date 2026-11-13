/**
 * MSS · Parenté entre les modes de fléchettes.
 * Une parenté est une aide à la découverte, PAS une mutualisation des règles,
 * du scoring, des profils ou des parties sauvegardées.
 */
import { DARTS_GAMES } from "./dartsGameRegistry";

export type DartsGameFamily = {
  id: string;
  mainId: string;
  variantIds: readonly string[];
  note: string;
};

export const DARTS_GAME_FAMILIES: readonly DartsGameFamily[] = [
  {
    id: "cricket", mainId: "cricket",
    variantIds: ["cricket_cut_throat", "scram", "shove_a_penny", "enculette"],
    note: "Fermeture de secteurs, stratégies de marques et jeux de pub apparentés. Chaque mode garde son propre barème.",
  },
  {
    id: "five_lives", mainId: "five_lives", variantIds: ["chase"],
    note: "Même mécanique de cinq vies, avec une poursuite des scores différente.",
  },
  {
    id: "halve_it", mainId: "halve_it", variantIds: ["split_score", "double_down"],
    note: "Contrats à remplir sous peine de division du score : parcours et règles propres à chaque jeu.",
  },
  {
    id: "gros_6", mainId: "gros_6", variantIds: ["ptit_hun"],
    note: "Deux adaptations complémentaires de la famille des jeux de précision « Gros / P'tit ».",
  },
  {
    id: "killer", mainId: "killer", variantIds: ["killer_progressive"],
    note: "Killer traditionnel et progression des cœurs avant le statut de Killer.",
  },
  {
    id: "x01", mainId: "x01", variantIds: ["happy_mille", "v170", "training_x01"],
    note: "Défis et variantes de sorties issus du comptage X01.",
  },
  {
    id: "green_vs_red", mainId: "green_vs_red", variantIds: ["black_vs_white", "three_colors", "color_call"],
    note: "Jeux de pistes et de couleurs, avec des objectifs spécifiques à chaque mode.",
  },
  {
    id: "hi_score", mainId: "hi_score", variantIds: ["count_up", "nine_dart_century"],
    note: "Deux variantes de scoring positif : maximiser les points sur un parcours donné.",
  },
  {
    id: "tour_horloge", mainId: "tour_horloge", variantIds: ["la_suite", "bobs_27", "training_doubleio", "challenge", "shooter"],
    note: "Jeux de numéros successifs : tour complet ou suites de trois secteurs dans une volée.",
  },
  {
    id: "super_bull", mainId: "super_bull", variantIds: ["training_super_bull"],
    note: "Jeu axé sur la zone centrale et son entraînement dédié.",
  },
  {
    id: "top_10", mainId: "top_10", variantIds: ["top_10_training"],
    note: "Même objectif de performance, en partie compétitive ou en entraînement.",
  },
  {
    id: "capital", mainId: "capital", variantIds: ["shanghai", "call_three", "training_challenges"],
    note: "Défis de contrats et combinaisons de touches : règles et barèmes distincts.",
  },
  {
    id: "battle_royale", mainId: "battle_royale", variantIds: ["warfare", "knockout", "prisoner"],
    note: "Affrontements, survie et élimination avec des règles propres à chaque mode.",
  },
  {
    id: "baseball", mainId: "baseball", variantIds: ["football", "rugby", "bowling"],
    note: "Jeux de fléchettes inspirés de disciplines sportives, sans moteur de score commun.",
  },
] as const;

const familyByGameId = new Map<string, DartsGameFamily>();
for (const family of DARTS_GAME_FAMILIES) {
  for (const id of [family.mainId, ...family.variantIds]) {
    if (familyByGameId.has(id)) throw new Error(`Mode répertorié dans plusieurs familles : ${id}`);
    familyByGameId.set(id, family);
  }
}

export function dartsGameFamily(gameId: string | null | undefined): DartsGameFamily | null {
  return familyByGameId.get(String(gameId || "")) || null;
}

export function dartsGameRelatedIds(gameId: string | null | undefined): string[] {
  const family = dartsGameFamily(gameId);
  if (!family) return [];
  const ids = [family.mainId, ...family.variantIds];
  return ids.filter(id => id !== gameId && DARTS_GAMES.some(g => g.id === id));
}

export function dartsFamilyMainId(gameId: string | null | undefined): string | null {
  return dartsGameFamily(gameId)?.mainId || null;
}

export type DartsGameNavigation = { tab: string; params?: Record<string, unknown> };
/** Canonical playable configuration target, regardless of Games or config screen. */
export function dartsFamilyGameNavigation(gameId: string): DartsGameNavigation | null {
  const g = DARTS_GAMES.find(item => item.id === gameId);
  if (!g?.ready) return null;
  if (gameId === "training_super_bull") return { tab: "training_mode", params: { modeId: "training_super_bull" } };
  if (["training_x01", "tour_horloge", "training_doubleio", "training_challenges"].includes(gameId)) return { tab: "training_mode", params: { modeId: gameId } };
  if (gameId === "top_10_training") return { tab: "top_10_config", params: { training: true } };
  if (gameId === "cricket") return { tab: "cricket", params: { launchMode: "arcade" } };
  if (gameId === "cricket_cut_throat") return { tab: "cricket", params: { launchMode: "arcade", variantId: "cut_throat" } };
  if (gameId === "enculette") return { tab: "enculette_config", params: { launchMode: "arcade" } };
  if (gameId === "shanghai" || gameId === "battle_royale") return { tab: gameId, params: { launchMode: "arcade" } };
  if (gameId === "chase") return { tab: "five_lives_config", params: { launchMode: "arcade", variantId: "chase" } };
  if (gameId === "split_score") return { tab: "halve_it_config", params: { launchMode: "arcade", variantId: "split_score" } };
  if (gameId === "killer_progressive") return { tab: "killer_config", params: { launchMode: "arcade", variantId: "progressive", gameId } };
  if (["happy_mille", "v170", "count_up"].includes(gameId)) return { tab: g.tab, params: { launchMode: "arcade" } };
  if (gameId === "killer" || gameId === "five_lives" || gameId === "halve_it") {
    return { tab: g.tab, params: { launchMode: "arcade" } };
  }
  if (g.tab === "wave61_config") return { tab: "wave61_config", params: { gameId } };
  return { tab: g.tab, params: { ...(g.variantId ? { variantId: g.variantId } : {}) } };
}
