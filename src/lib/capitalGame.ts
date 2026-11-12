export type CapitalContractId =
  | "capital"
  | "n20"
  | "triple_any"
  | "n19"
  | "double_any"
  | "n18"
  | "side"
  | "n17"
  | "suite"
  | "n16"
  | "colors_3"
  | "n15"
  | "exact_57"
  | "n14"
  | "n13"
  | "center"
  | "peluche"
  | "diagonal"
  | "shanghai"
  | "even_3"
  | "odd_3"
  | "exact_42"
  | "exact_69"
  | "exact_custom"
  | "packet"
  | "four_corners"
  | "outer_single"
  | "bad_hand"
  | "poubelle"
  | "petit_score";

export type CapitalDartZone = "inner-single" | "outer-single" | "outside" | "miss";
export type CapitalDart = { v: number; mult: 1 | 2 | 3; zone?: CapitalDartZone };
export type CapitalContractOptions = { exactTarget?: number; manualValidated?: boolean; shanghaiBonus?: number; packetAllowMultipliers?: boolean };
export type CapitalGridPresetId =
  | "clubs15" | "inverse15" | "bar17" | "committee15" | "modern17" | "alpes17"
  | "committee_shanghai17" | "committee_42_17" | "committee_petit17" | "committee_other17"
  | "beginner" | "intermediate" | "expert" | "legends";
export type CapitalPresetCategory = "club" | "bar" | "niveau";
export type CapitalPresetDefinition = { label: string; description: string; category: CapitalPresetCategory; contracts: CapitalContractId[] };
export type CapitalParticipantMode = "players" | "teams";
export type CapitalTeamsSourceMode = "manual" | "saved" | "auto";
export type CapitalStartOrderMode = "fixed" | "alternate" | "random" | "manual" | "bull";
export type CapitalModeKind = "official" | "custom";

export type CapitalPlayer = {
  id: string;
  profileId?: string | null;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  isBot?: boolean;
  botLevel?: string | number | null;
  teamId?: string | null;
  teamIndex?: number;
};

export type CapitalTeam = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  avatarUrl?: string | null;
  players: string[];
};

export type CapitalConfigPayload = {
  id?: string;
  mode: CapitalModeKind;
  gridVariant?: CapitalGridPresetId;
  committeeSpecialContract?: CapitalContractId;
  exactTarget?: number;
  shanghaiBonus?: number;
  packetAllowMultipliers?: boolean;
  participantMode: CapitalParticipantMode;
  teamsSourceMode?: CapitalTeamsSourceMode;
  players: CapitalPlayer[] | number;
  selectedIds: string[];
  teams?: CapitalTeam[];
  teamSize?: number;
  startOrderMode: CapitalStartOrderMode;
  startOrderApplied?: boolean;
  contracts: CapitalContractId[];
  customContracts?: CapitalContractId[];
  includeCapital: boolean;
  failDivideBy2: boolean;
  startingCapital?: number;
  victoryMode: "best_after_contracts" | "first_to_target";
  targetScore?: number;
  tieBreaker: "none" | "last_contract_total";
  inputMethod?: "keypad" | "dartboard" | "presets" | "visit" | "visit_score" | "voice";
  turnTimerSec?: number;
  botsEnabled?: boolean;
  botLevel?: "easy" | "normal" | "hard";
  botsAutoPlay?: boolean;
  botTurnDelayMs?: number;
  botRisk?: "safe" | "normal" | "aggressive";
  createdAt?: number;
};

export type CapitalVisit = {
  id: string;
  contractId: CapitalContractId;
  contractIndex: number;
  playerId: string;
  playerIndex: number;
  playerName: string;
  teamId?: string | null;
  darts: CapitalDart[];
  /** Points admissibles pour le contrat (et non total brut de la cible). */
  visitScore: number;
  /** Total réellement réalisé sur les fléchettes, y compris les impacts hors contrat. */
  rawVisitScore?: number;
  /** Nombre de fléchettes dont la valeur entre dans le gain du contrat. */
  qualifiedDarts?: number;
  success: boolean;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  penaltyLost: number;
  createdAt: number;
  exactTarget?: number;
  manualValidated?: boolean;
  bonusPoints?: number;
  /** Saisie du total sans détail des impacts : ne jamais fabriquer de segments. */
  scoreInputMode?: "visit_score" | "visit_detailed" | "keypad" | "dartboard" | "presets";
  dartsUsed?: 1 | 2 | 3;
};

export const CAPITAL_BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const RED_NUMBERS = new Set([20, 12, 14, 8, 7, 3, 2, 10, 13, 18]);

export const CAPITAL_OFFICIAL_CONTRACTS: CapitalContractId[] = [
  "capital",
  "n20",
  "triple_any",
  "n19",
  "double_any",
  "n18",
  "side",
  "n17",
  "suite",
  "n16",
  "colors_3",
  "n15",
  "exact_57",
  "n14",
  "center",
];

// Les ID historiques (clubs15, modern17, bar17) restent stables pour les sauvegardes.
// Les alternatives "Comité" sans source réglementaire sont des suggestions MSS configurables,
// pas des attributions officielles à des comités de la FFD.
const CAPITAL_ALPES_CONTRACTS: CapitalContractId[] = [
  "capital", "n20", "suite", "n19", "colors_3", "n18", "side", "n17", "exact_57", "n16",
  "peluche", "n15", "triple_any", "n14", "double_any", "n13", "center",
];
function replaceAlpesPeluche(withContract: CapitalContractId): CapitalContractId[] {
  return CAPITAL_ALPES_CONTRACTS.map(id => id === "peluche" ? withContract : id);
}
export const CAPITAL_CUSTOM_VARIANT_LABEL = "MON CAPITAL · variante personnelle" as const;

export const CAPITAL_GRID_PRESETS: Record<CapitalGridPresetId, CapitalPresetDefinition> = {
  clubs15: {
    label: "OFFICIEL · 15 tours", category: "club",
    description: "Grille traditionnelle des clubs en 15 tours, présentée sous OFFICIEL pour retrouver facilement le Capital classique. Cette appellation ne signifie pas homologation fédérale.",
    contracts: [...CAPITAL_OFFICIAL_CONTRACTS],
  },
  inverse15: {
    label: "MIROIR · 15 tours", category: "club",
    description: "MIROIR · CLUB. Les nombres 20, 19, 18, 17, 16, 15 et 14 restent à leur place, comme le Capital initial et le Bull final. Seuls les six contrats spéciaux sont inversés : 57 exact, Trois couleurs, Suite, Côte à côte, Double, Triple.",
    // Capital, chiffres et Bull fixes ; seuls les six contrats intercalés sont inversés.
    // OFFICIEL : Triple, Double, Côte à côte, Suite, Trois couleurs, 57 exact.
    // MIROIR   : 57 exact, Trois couleurs, Suite, Côte à côte, Double, Triple.
    contracts: ["capital", "n20", "exact_57", "n19", "colors_3", "n18", "suite", "n17", "side", "n16", "double_any", "n15", "triple_any", "n14", "center"],
  },
  bar17: {
    label: "DIAGONALE · 17 tours", category: "bar",
    description: "DIAGONALE · BAR. Grille de 17 tours comprenant le défi Diagonale, dans son ordre de contrats initial.",
    contracts: ["capital", "n20", "colors_3", "n19", "suite", "n18", "triple_any", "n17", "exact_57", "n16", "double_any", "n15", "side", "n14", "diagonal", "n13", "center"],
  },
  committee15: {
    label: "HÉRITAGE · 15 tours", category: "club",
    description: "HÉRITAGE · CLUB. Variante traditionnelle de 15 tours : Côte, Suite et Couleurs avant Double et Triple. Sans attribution fédérale universelle.",
    contracts: ["capital", "n20", "side", "n19", "suite", "n18", "colors_3", "n17", "double_any", "n16", "triple_any", "n15", "exact_57", "n14", "center"],
  },
  modern17: {
    label: "PELUCHE · 17 tours", category: "bar",
    description: "PELUCHE · Grille de 17 tours avec Peluche, Suite, Couleurs, Côte à côte, 57, Triple et Double. Elle réunit les anciennes entrées Moderne et Alpes, dont les contrats étaient identiques.",
    contracts: [...CAPITAL_ALPES_CONTRACTS],
  },
  alpes17: {
    label: "PELUCHE (ancienne Alpes) · 17 tours", category: "bar",
    description: "PELUCHE · BAR. Grille dite du comité des Alpes (attribution non vérifiée) en 17 tours, avec Peluche au 11e tour.",
    contracts: [...CAPITAL_ALPES_CONTRACTS],
  },
  committee_shanghai17: {
    label: "SHANGHAI · 17 tours", category: "bar",
    description: "SHANGHAI · BAR. Variante MSS de 17 tours : le contrat Peluche est remplacé par Shanghai. Ce n’est pas un règlement fédéral officiel.",
    contracts: replaceAlpesPeluche("shanghai"),
  },
  committee_42_17: {
    label: "42 · 17 tours", category: "bar",
    description: "42 · BAR. Variante MSS de 17 tours : à la place de Peluche, atteindre exactement 42 points.",
    contracts: replaceAlpesPeluche("exact_42"),
  },
  committee_petit17: {
    label: "ÉCONOME · 17 tours", category: "bar",
    description: "ÉCONOME · BAR. Variante MSS de 17 tours : à la place de Peluche, terminer la volée avec moins de 10 points.",
    contracts: replaceAlpesPeluche("petit_score"),
  },
  committee_other17: {
    label: "À LA CARTE · 17 tours", category: "bar",
    description: "À LA CARTE · BAR. Remplace Peluche par un contrat spécial au choix dans une grille de 17 tours. Départ sur 69 exact ; modification libre en configuration.",
    contracts: replaceAlpesPeluche("shanghai"),
  },
  beginner: {
    label: "STANDARD · 17 tours", category: "niveau",
    description: "STANDARD · Capital de départ, chiffres de 20 à 13 et un contrat spécial accessible entre chaque chiffre (Double, Triple, Croix, Pairs, Impairs, Peluche, 42 exact). Bull final.",
    contracts: [
      "capital", "n20", "double_any", "n19", "triple_any", "n18", "four_corners", "n17",
      "even_3", "n16", "odd_3", "n15", "peluche", "n14", "exact_42", "n13", "center",
    ],
  },
  intermediate: {
    label: "CHALLENGER · 17 tours", category: "niveau",
    description: "CHALLENGER · Capital de départ, chiffres de 20 à 13 et un contrat difficile entre chaque chiffre (Shanghai, Diagonale, Paquet, Couronne, Côte à côte, Poubelle, 69 exact). Bull final.",
    contracts: [
      "capital", "n20", "shanghai", "n19", "diagonal", "n18", "packet", "n17",
      "outer_single", "n16", "side", "n15", "poubelle", "n14", "exact_69", "n13", "center",
    ],
  },
  expert: {
    label: "EXPERT · 18 tours", category: "niveau",
    description: "EXPERT · Enchaînement des 16 contrats spéciaux les plus techniques, sans contrat numérique de 20 à 13 ni défi de découverte comme Peluche ou Croix ; capital initial et Bull final.",
    contracts: [
      "capital", "even_3", "odd_3", "colors_3", "side", "suite",
      "exact_42", "petit_score", "exact_57", "packet", "outer_single", "bad_hand",
      "poubelle", "exact_69", "diagonal", "shanghai", "exact_custom", "center",
    ],
  },
  legends: {
    label: "LÉGENDES · 30 tours", category: "niveau",
    description: "LÉGENDES · Marathon intégral : 30 contrats distincts, capital de départ, valeurs de 20 à 13, tous les défis classiques et spéciaux, y compris Score exact libre. Bull final.",
    contracts: [
      "capital", "n20", "double_any", "triple_any", "n19", "four_corners", "peluche",
      "n18", "even_3", "odd_3", "n17", "colors_3", "side", "n16", "suite",
      "exact_42", "petit_score", "n15", "exact_57", "packet", "n14", "outer_single",
      "bad_hand", "poubelle", "n13", "exact_69", "diagonal", "shanghai", "exact_custom", "center",
    ],
  },
};

/** Liste stable pour alimenter le sélecteur et le choix d'une base personnalisée. */
export const CAPITAL_PRESET_ORDER: CapitalGridPresetId[] = [
  "clubs15", "inverse15", "committee15",
  "bar17", "modern17", "committee_shanghai17", "committee_42_17", "committee_petit17", "committee_other17",
  "beginner", "intermediate", "expert", "legends",
];

/** Trois familles de modèles. MON CAPITAL est ajouté comme quatrième catégorie par l'interface. */
export const CAPITAL_PRESET_GROUPS: {
  category: CapitalPresetCategory;
  label: string;
  contracts: CapitalGridPresetId[];
}[] = [
  { category: "club", label: "CLUB", contracts: ["clubs15", "inverse15", "committee15"] },
  { category: "bar", label: "BAR", contracts: ["bar17", "modern17", "committee_shanghai17", "committee_42_17", "committee_petit17", "committee_other17"] },
  { category: "niveau", label: "NIVEAU", contracts: ["beginner", "intermediate", "expert", "legends"] },
];

/** Anciennes sauvegardes Alpes : même grille que Moderne/Peluche, un seul choix visible. */
export function canonicalCapitalGridPreset(id?: CapitalGridPresetId): CapitalGridPresetId {
  return id === "alpes17" ? "modern17" : id && CAPITAL_GRID_PRESETS[id] ? id : "clubs15";
}

/** Contrats spéciaux possibles à la place de Peluche pour une grille locale de comité. */
export const CAPITAL_COMMITTEE_REPLACEMENTS: CapitalContractId[] = [
  "shanghai", "exact_42", "exact_69", "packet", "outer_single", "four_corners",
  "bad_hand", "poubelle", "petit_score", "diagonal", "even_3", "odd_3",
];

/** Copie défensive : ni Maison ni les variantes à choix local ne doivent muter un modèle. */
export function capitalPresetContracts(id: CapitalGridPresetId, committeeSpecialContract?: CapitalContractId): CapitalContractId[] {
  if (id === "committee_other17") {
    const replacement = CAPITAL_COMMITTEE_REPLACEMENTS.includes(committeeSpecialContract as CapitalContractId)
      ? committeeSpecialContract as CapitalContractId : "shanghai";
    return replaceAlpesPeluche(replacement);
  }
  return [...(CAPITAL_GRID_PRESETS[id] || CAPITAL_GRID_PRESETS.clubs15).contracts];
}

export const CAPITAL_SELECTABLE_CONTRACTS: CapitalContractId[] = [
  ...CAPITAL_OFFICIAL_CONTRACTS.filter((id) => id !== "capital"),
  "n13", "peluche", "diagonal", "shanghai", "even_3", "odd_3", "exact_42", "exact_69", "exact_custom", "packet", "four_corners", "outer_single", "bad_hand", "poubelle", "petit_score",
];

export const CAPITAL_CONTRACT_META: Record<CapitalContractId, { short: string; label: string; rule: string }> = {
  capital: { short: "CAP", label: "Capital", rule: "Les trois fléchettes constituent le capital de départ." },
  n20: { short: "20", label: "20", rule: "Toucher le secteur 20 : seuls S20, D20 et T20 rapportent des points." },
  triple_any: { short: "T", label: "Triple", rule: "Toucher au moins un triple. Seuls les impacts dans une zone TRIPLE rapportent des points." },
  n19: { short: "19", label: "19", rule: "Toucher le secteur 19 : seuls S19, D19 et T19 rapportent des points." },
  double_any: { short: "D", label: "Double", rule: "Toucher au moins un double, DBULL compris. Seuls les DOUBLES (DBULL inclus) rapportent des points." },
  n18: { short: "18", label: "18", rule: "Toucher le secteur 18 : seuls S18, D18 et T18 rapportent des points." },
  side: { short: "CÔTE", label: "Côte à côte", rule: "Toucher trois secteurs voisins dans l'ordre circulaire de la cible, sans Bull." },
  n17: { short: "17", label: "17", rule: "Toucher le secteur 17 : seuls S17, D17 et T17 rapportent des points." },
  suite: { short: "SUITE", label: "Suite", rule: "Toucher trois numéros consécutifs numériquement, dans n'importe quel ordre." },
  n16: { short: "16", label: "16", rule: "Toucher le secteur 16 : seuls S16, D16 et T16 rapportent des points." },
  colors_3: { short: "3C", label: "Trois couleurs", rule: "Toucher trois couleurs différentes parmi noir, blanc, rouge et vert." },
  n15: { short: "15", label: "15", rule: "Toucher le secteur 15 : seuls S15, D15 et T15 rapportent des points." },
  exact_57: { short: "57", label: "57 exact", rule: "Obtenir exactement 57 points sur une, deux ou trois fléchettes." },
  n14: { short: "14", label: "14", rule: "Toucher le secteur 14 : seuls S14, D14 et T14 rapportent des points." },
  n13: { short: "13", label: "13", rule: "Toucher le secteur 13 : seuls S13, D13 et T13 rapportent des points." },
  center: { short: "BULL", label: "Centre", rule: "Toucher le BULL25 ou le DBULL50. Seules les fléchettes au Centre rapportent des points." },
  peluche: { short: "PEL", label: "Peluche", rule: "Trois fléchettes dans les zones de score, au plus 20 points au total. Aucun MISS." },
  diagonal: { short: "DIAG", label: "Diagonale", rule: "Dans cet ordre : un numéro, BULL25 extérieur (DBULL50 interdit), puis le secteur diamétralement opposé (ex. 20, BULL25, 3)." },
  shanghai: { short: "SH", label: "Shanghai", rule: "Réaliser un simple, un double et un triple d'un même numéro, dans n'importe quel ordre." },
  even_3: { short: "PAIRS", label: "Trois pairs", rule: "Trois fléchettes dans des secteurs numérotés pairs (Bull exclu)." },
  odd_3: { short: "IMPAIRS", label: "Trois impairs", rule: "Trois fléchettes dans des secteurs numérotés impairs (Bull exclu)." },
  exact_42: { short: "42", label: "42 exact", rule: "Atteindre exactement 42 points avec au maximum trois fléchettes." },
  exact_69: { short: "69", label: "69 exact", rule: "Atteindre exactement 69 points avec au maximum trois fléchettes." },
  exact_custom: { short: "EXACT", label: "Score exact libre", rule: "Atteindre le score exact défini en configuration (1 à 180)." },
  packet: { short: "PAQUET", label: "La Boule / Paquet", rule: "Planter trois fléchettes dans le même numéro et le même multiplicateur (ex. S12, S12, S12)." },
  four_corners: { short: "CROIX", label: "Quatre coins / Croix", rule: "Les trois fléchettes doivent toucher uniquement les numéros 20, 3, 11 ou 6." },
  outer_single: { short: "COUR", label: "Extérieur / Couronne", rule: "Trois simples extérieurs entre le triple et le double. Activer S EXT avant chaque fléchette." },
  bad_hand: { short: "MAIN", label: "Mauvaise main", rule: "Lancer les trois fléchettes avec la main non directrice, dans des zones de score, puis confirmer manuellement." },
  poubelle: { short: "ZÉRO", label: "Poubelle / Zéro", rule: "Trois fléchettes plantées dans le contour hors score, sans tomber au sol. Réussite : le capital ne change pas." },
  petit_score: { short: "<10", label: "Petit score", rule: "Trois fléchettes dans les zones de score pour un total strictement inférieur à 10. Aucun MISS." },
};

/** 13 est présent dans les deux grilles de 17 tours. */

export function clampCapitalNumber(value: any, min: number, max: number, fallback = min): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function capitalDartScore(dart: CapitalDart): number {
  if (dart?.zone === "outside" || dart?.zone === "miss") return 0;
  const value = Number(dart?.v || 0);
  const rawMultiplier = Number(dart?.mult || 1);
  const multiplier = rawMultiplier === 3 ? 3 : rawMultiplier === 2 ? 2 : 1;
  if (value === 25) return value * (multiplier === 2 ? 2 : 1);
  if (value < 1 || value > 20) return 0;
  return value * multiplier;
}

export function capitalVisitScore(darts: CapitalDart[]): number {
  return (Array.isArray(darts) ? darts : []).reduce((sum, dart) => sum + capitalDartScore(dart), 0);
}

export function normalizeCapitalDarts(darts: CapitalDart[]): CapitalDart[] {
  const allowedZones = new Set<CapitalDartZone>(["inner-single", "outer-single", "outside", "miss"]);
  const normalized = (Array.isArray(darts) ? darts : []).slice(0, 3).map((dart: any) => {
    const zone: CapitalDartZone | undefined = allowedZones.has(dart?.zone) ? dart.zone : undefined;
    const v = zone === "outside" || zone === "miss" ? 0 : clampCapitalNumber(dart?.v, 0, 25, 0);
    const rawMultiplier = Number(dart?.mult || 1);
    if (![1, 2, 3].includes(rawMultiplier) || (v === 25 && rawMultiplier === 3))
      return { v: 0, mult: 1, zone: "miss" } as CapitalDart;
    const mult = v === 25 ? (rawMultiplier === 2 ? 2 : 1) : rawMultiplier === 3 ? 3 : rawMultiplier === 2 ? 2 : 1;
    // Un S EXT n'est jamais un double/triple, et le Bull ne possède pas d'anneau simple extérieur numéroté.
    if ((zone === "outer-single" || zone === "inner-single") && (mult !== 1 || v === 25 || v === 0))
      return { v: 0, mult: 1, zone: "miss" } as CapitalDart;
    return { v, mult, ...(zone ? { zone } : {}) } as CapitalDart;
  });
  while (normalized.length < 3) normalized.push({ v: 0, mult: 1, zone: "miss" });
  return normalized;
}

function validBoardNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 20;
}

function dartColor(dart: CapitalDart): "black" | "white" | "red" | "green" | "none" {
  const value = Number(dart?.v || 0);
  const multiplier = Number(dart?.mult || 1);
  if (value === 25) return multiplier === 2 ? "red" : "green";
  if (!validBoardNumber(value)) return "none";
  if (multiplier === 1) {
    const index = CAPITAL_BOARD_ORDER.indexOf(value);
    return index >= 0 && index % 2 === 0 ? "black" : "white";
  }
  return RED_NUMBERS.has(value) ? "red" : "green";
}

export function capitalContractSuccess(contract: CapitalContractId, rawDarts: CapitalDart[], options: CapitalContractOptions = {}): boolean {
  const darts = normalizeCapitalDarts(rawDarts);
  const values = darts.map((dart) => dart.v).filter(validBoardNumber);
  const uniqueValues = Array.from(new Set(values));

  switch (contract) {
    case "capital":
      return true;
    case "n20":
      return darts.some((dart) => dart.v === 20);
    case "triple_any":
      return darts.some((dart) => dart.mult === 3 && validBoardNumber(dart.v));
    case "n19":
      return darts.some((dart) => dart.v === 19);
    case "double_any":
      return darts.some((dart) => dart.mult === 2 && (validBoardNumber(dart.v) || dart.v === 25));
    case "n18":
      return darts.some((dart) => dart.v === 18);
    case "side": {
      if (uniqueValues.length !== 3) return false;
      const indexes = uniqueValues.map((value) => CAPITAL_BOARD_ORDER.indexOf(value));
      if (indexes.some((index) => index < 0)) return false;
      return CAPITAL_BOARD_ORDER.some((_, start) => {
        const triplet = new Set([start, (start + 1) % 20, (start + 2) % 20]);
        return indexes.every((index) => triplet.has(index));
      });
    }
    case "n17":
      return darts.some((dart) => dart.v === 17);
    case "suite": {
      if (uniqueValues.length !== 3) return false;
      const sorted = [...uniqueValues].sort((a, b) => a - b);
      return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
    }
    case "n16":
      return darts.some((dart) => dart.v === 16);
    case "colors_3": {
      const colors = darts.map(dartColor).filter((color) => color !== "none");
      return colors.length === 3 && new Set(colors).size === 3;
    }
    case "n15":
      return darts.some((dart) => dart.v === 15);
    case "exact_57":
      return capitalVisitScore(darts) === 57;
    case "n14":
      return darts.some((dart) => dart.v === 14);
    case "n13":
      return darts.some((dart) => dart.v === 13);
    case "center":
      return darts.some((dart) => dart.v === 25);
    case "peluche":
      return darts.every((dart) => dart.v > 0) && capitalVisitScore(darts) <= 20;
    case "diagonal": {
      // La trajectoire doit traverser la couronne du BULL25 : le DBULL50 central ne valide pas.
      if (!validBoardNumber(darts[0].v) || darts[1].v !== 25 || darts[1].mult !== 1 || !validBoardNumber(darts[2].v)) return false;
      const firstIndex = CAPITAL_BOARD_ORDER.indexOf(darts[0].v);
      return darts[2].v === CAPITAL_BOARD_ORDER[(firstIndex + 10) % 20];
    }
    case "shanghai":
      return darts.every((dart) => validBoardNumber(dart.v) && dart.v === darts[0].v) && new Set(darts.map((dart) => dart.mult)).size === 3;
    case "even_3":
      return darts.every((dart) => validBoardNumber(dart.v) && dart.v % 2 === 0);
    case "odd_3":
      return darts.every((dart) => validBoardNumber(dart.v) && dart.v % 2 === 1);
    case "exact_42":
      return capitalVisitScore(darts) === 42;
    case "exact_69":
      return capitalVisitScore(darts) === 69;
    case "exact_custom":
      return capitalVisitScore(darts) === clampCapitalNumber(options.exactTarget, 1, 180, 42);
    case "packet":
      return darts.every((dart) => validBoardNumber(dart.v) && dart.v === darts[0].v && dart.mult === darts[0].mult && (dart.zone || "") === (darts[0].zone || "") && (options.packetAllowMultipliers === true || dart.mult === 1));
    case "four_corners":
      return darts.every((dart) => [20, 3, 11, 6].includes(dart.v));
    case "outer_single":
      return darts.every((dart) => validBoardNumber(dart.v) && dart.mult === 1 && dart.zone === "outer-single");
    case "bad_hand":
      return options.manualValidated === true && darts.every((dart) => validBoardNumber(dart.v) || dart.v === 25);
    case "poubelle":
      return darts.every((dart) => dart.zone === "outside");
    case "petit_score":
      return darts.every((dart) => dart.v > 0) && capitalVisitScore(darts) < 10;
    default:
      return false;
  }
}

/** Les 8 contrats numériques ne créditent que les fléchettes dans le numéro visé. */
export function capitalNumericTarget(contract: CapitalContractId): number | null {
  if (!/^n(13|14|15|16|17|18|19|20)$/.test(contract)) return null;
  return Number(contract.slice(1));
}

/** Le total d'une volée ne permet PAS de certifier un contrat dépendant des impacts.
 * Les seuls contrats calculables sans détail sont Capital initial et les scores exacts.
 */
export function capitalAggregateIsVerifiable(contract: CapitalContractId): boolean {
  return contract === "capital" || contract === "exact_57" || contract === "exact_42" || contract === "exact_69" || contract === "exact_custom";
}

/** Résultat de qualification : les points bruts ne deviennent jamais automatiquement
 * des points CAPITAL. Une volée ratée vaut zéro point admissible, même si elle
 * contient des impacts dans des secteurs étrangers au contrat.
 */
export function evaluateCapitalContract(
  contract: CapitalContractId,
  rawDarts: CapitalDart[],
  options: CapitalContractOptions = {},
): { success: boolean; rawVisitScore: number; visitScore: number; qualifiedDarts: number } {
  const darts = normalizeCapitalDarts(rawDarts);
  const rawVisitScore = capitalVisitScore(darts);
  const success = capitalContractSuccess(contract, darts, options);
  if (!success) return { success: false, rawVisitScore, visitScore: 0, qualifiedDarts: 0 };
  const number = capitalNumericTarget(contract);
  const qualified = number !== null
    ? darts.filter(dart => dart.v === number)
    : contract === "double_any"
      ? darts.filter(dart => dart.mult === 2 && (validBoardNumber(dart.v) || dart.v === 25))
      : contract === "triple_any"
        ? darts.filter(dart => dart.mult === 3 && validBoardNumber(dart.v))
        : contract === "center"
          ? darts.filter(dart => dart.v === 25)
          : contract === "poubelle"
            ? []
            : darts.filter(dart => dart.v > 0 && dart.zone !== "outside" && dart.zone !== "miss");
  return { success, rawVisitScore, visitScore: capitalVisitScore(qualified), qualifiedDarts: qualified.length };
}

export function applyCapitalVisit(
  scoreBefore: number,
  contract: CapitalContractId,
  rawDarts: CapitalDart[],
  failDivideBy2 = true,
  options: CapitalContractOptions = {}
): { scoreAfter: number; visitScore: number; rawVisitScore: number; qualifiedDarts: number; bonusPoints: number; success: boolean; delta: number; penaltyLost: number } {
  const { visitScore, rawVisitScore, qualifiedDarts, success } = evaluateCapitalContract(contract, rawDarts, options);
  const bonusPoints = success && contract === "shanghai" ? clampCapitalNumber(options.shanghaiBonus, 0, 500, 0) : 0;
  const scoreAfter = contract === "capital"
    ? visitScore
    : success
      ? scoreBefore + visitScore + bonusPoints
      : failDivideBy2
        ? Math.floor(scoreBefore / 2)
        : scoreBefore;
  return {
    scoreAfter, visitScore, rawVisitScore, qualifiedDarts, bonusPoints,
    success, delta: scoreAfter - scoreBefore, penaltyLost: Math.max(0, scoreBefore - scoreAfter),
  };
}

/** Contrôle aussi qu'un total est physiquement réalisable avec exactement N fléchettes
 * (MISS=0 inclus), et pas seulement inférieur à 60 × N.
 */
export function capitalTotalPossible(total: number, dartsUsed: 1 | 2 | 3): boolean {
  if (!Number.isInteger(total) || total < 0 || total > 60 * dartsUsed) return false;
  const values = [0, 25, 50, ...Array.from({ length: 20 }, (_, index) => index + 1)
    .flatMap(n => [n, n * 2, n * 3])];
  let reachable = new Set([0]);
  for (let i = 0; i < dartsUsed; i += 1) {
    const next = new Set<number>();
    for (const prefix of reachable) for (const score of values) next.add(prefix + score);
    reachable = next;
  }
  return reachable.has(total);
}

/** Saisie SCORE VOLÉE, limitée aux contrats vérifiables avec le seul total.
 * Pour tous les autres, un score brut + un bouton « réussi » ne constitue jamais
 * une preuve ; l'interface doit demander les S/D/T réels de la volée.
 */
export function applyCapitalAggregateVisit(
  scoreBefore: number,
  contract: CapitalContractId,
  rawTotal: number,
  _declaredSuccess: boolean,
  failDivideBy2 = true,
  options: CapitalContractOptions = {},
  dartsUsed: 1 | 2 | 3 = 3,
) {
  const total = Number(rawTotal);
  const validTotal = capitalTotalPossible(total, dartsUsed);
  const requiresDetail = !capitalAggregateIsVerifiable(contract);
  // L'appelant doit BLOQUER toute sauvegarde tant que les impacts restent inconnus.
  if (requiresDetail || !validTotal) {
    return { scoreAfter: scoreBefore, visitScore: 0, rawVisitScore: validTotal ? total : 0,
      qualifiedDarts: 0, bonusPoints: 0, success: false, delta: 0, penaltyLost: 0, requiresDetail: true };
  }
  const target = contract === "exact_57" ? 57 : contract === "exact_42" ? 42 :
    contract === "exact_69" ? 69 : contract === "exact_custom" ? clampCapitalNumber(options.exactTarget, 1, 180, 42) : null;
  const success = contract === "capital" || total === target;
  const visitScore = success ? total : 0;
  const scoreAfter = contract === "capital" ? total
    : success ? scoreBefore + visitScore
    : failDivideBy2 ? Math.floor(scoreBefore / 2) : scoreBefore;
  return { scoreAfter, visitScore, rawVisitScore: total, qualifiedDarts: 0,
    bonusPoints: 0, success, delta: scoreAfter - scoreBefore,
    penaltyLost: Math.max(0, scoreBefore - scoreAfter), requiresDetail: false };
}

/**
 * Diagnostic NON DESTRUCTIF des événements CAPITAL.
 * Le journal de volées est la source de vérité pour la grille live et la fin de
 * partie. On ne modifie jamais ici une ancienne sauvegarde : tout écart est
 * signalé afin d'éviter une correction automatique erronée de l'Historique V4.
 */
export type CapitalIntegrityIssue = {
  code: "unknown_player" | "invalid_round" | "wrong_contract" | "wrong_order" |
    "score_before" | "score_after" | "raw_score" | "qualified_score" |
    "success" | "bonus" | "penalty" | "delta" | "qualified_darts" |
    "unverifiable_aggregate" | "final_score";
  visitId?: string;
  playerId?: string;
  contractIndex?: number;
  expected?: string | number | boolean;
  observed?: string | number | boolean;
};

export function auditCapitalVisitLog(
  players: Array<Pick<CapitalPlayer, "id">>,
  contracts: CapitalContractId[],
  visits: CapitalVisit[],
  options: CapitalContractOptions & {
    includeCapital?: boolean;
    startingCapital?: number;
    failDivideBy2?: boolean;
    expectedScores?: number[];
  } = {},
): { ok: boolean; checkedVisits: number; unverifiableVisits: number; replayedScores: number[]; issues: CapitalIntegrityIssue[] } {
  const issues: CapitalIntegrityIssue[] = [];
  const initial = options.includeCapital === false ? Number(options.startingCapital ?? 0) : 0;
  const scores = players.map(() => initial);
  const nextRoundForPlayer = players.map(() => 0);
  const byId = new Map(players.map((player, index) => [String(player.id), index]));
  let checkedVisits = 0;
  let unverifiableVisits = 0;

  for (const visit of visits || []) {
    const playerId = String(visit.playerId);
    const playerIndex = byId.get(playerId);
    const issue = (code: CapitalIntegrityIssue["code"], expected?: string | number | boolean, observed?: string | number | boolean) => {
      issues.push({ code, visitId: visit.id, playerId, contractIndex: visit.contractIndex, ...(expected !== undefined ? {expected} : {}), ...(observed !== undefined ? {observed} : {}) });
    };
    if (playerIndex === undefined) { issue("unknown_player"); continue; }
    const contract = contracts[visit.contractIndex];
    if (!contract) { issue("invalid_round"); continue; }
    if (visit.contractId !== contract) issue("wrong_contract", contract, visit.contractId);
    if (visit.contractIndex !== nextRoundForPlayer[playerIndex])
      issue("wrong_order", nextRoundForPlayer[playerIndex], visit.contractIndex);
    nextRoundForPlayer[playerIndex] = visit.contractIndex + 1;

    const before = scores[playerIndex];
    if (visit.scoreBefore !== before) issue("score_before", before, visit.scoreBefore);
    const aggregate = visit.scoreInputMode === "visit_score" && (!visit.darts || visit.darts.length === 0);
    const applied = aggregate
      ? applyCapitalAggregateVisit(before, contract, Number(visit.rawVisitScore ?? visit.visitScore), true,
          options.failDivideBy2 !== false, { ...options, exactTarget: visit.exactTarget ?? options.exactTarget },
          (visit.dartsUsed || 3) as 1 | 2 | 3)
      : applyCapitalVisit(before, contract, visit.darts || [], options.failDivideBy2 !== false,
          { ...options, exactTarget: visit.exactTarget ?? options.exactTarget, manualValidated: visit.manualValidated === true });
    if ("requiresDetail" in applied && applied.requiresDetail) {
      // Les sommes seules ne démontrent jamais des combinaisons de segments.
      issue("unverifiable_aggregate");
      unverifiableVisits += 1;
      scores[playerIndex] = Number(visit.scoreAfter);
      continue;
    }
    checkedVisits += 1;
    const compare = (code: CapitalIntegrityIssue["code"], expected: number | boolean, observed: number | boolean | undefined) => {
      if (observed !== undefined && expected !== observed) issue(code, expected, observed);
    };
    compare("score_after", applied.scoreAfter, visit.scoreAfter);
    compare("raw_score", applied.rawVisitScore, visit.rawVisitScore);
    compare("qualified_score", applied.visitScore, visit.visitScore);
    compare("success", applied.success, visit.success);
    compare("bonus", applied.bonusPoints, visit.bonusPoints);
    compare("penalty", applied.penaltyLost, visit.penaltyLost);
    compare("delta", applied.delta, visit.delta);
    compare("qualified_darts", applied.qualifiedDarts, visit.qualifiedDarts);
    scores[playerIndex] = applied.scoreAfter;
  }

  if (Array.isArray(options.expectedScores)) {
    for (let index = 0; index < players.length; index += 1) {
      const observed = Number(options.expectedScores[index] ?? 0);
      if (scores[index] !== observed) {
        issues.push({ code: "final_score", playerId: String(players[index].id), expected: scores[index], observed });
      }
    }
  }
  return { ok: issues.length === 0, checkedVisits, unverifiableVisits, replayedScores: scores, issues };
}

export function replayCapitalScores(
  players: CapitalPlayer[],
  visits: CapitalVisit[],
  includeCapital: boolean,
  startingCapital = 0
): number[] {
  const byId = new Map(players.map((player, index) => [String(player.id), index]));
  const scores = Array.from({ length: players.length }, () => includeCapital ? 0 : startingCapital);
  for (const visit of visits || []) {
    const index = byId.get(String(visit.playerId));
    if (index == null) continue;
    scores[index] = Number(visit.scoreAfter || 0);
  }
  return scores;
}

function randomHit(probability: number): boolean {
  return Math.random() < probability;
}

export function makeCapitalBotVisit(
  contract: CapitalContractId,
  level: "easy" | "normal" | "hard" = "normal",
  risk: "safe" | "normal" | "aggressive" = "normal",
  options: CapitalContractOptions = {}
): CapitalDart[] {
  const baseAccuracy = level === "easy" ? 0.42 : level === "hard" ? 0.79 : 0.62;
  const riskDelta = risk === "aggressive" ? 0.08 : risk === "safe" ? -0.06 : 0;
  const accuracy = Math.max(0.15, Math.min(0.94, baseAccuracy + riskDelta));
  const miss = (): CapitalDart => ({ v: 0, mult: 1 });
  const dart = (v: number, mult: 1 | 2 | 3 = 1, zone?: CapitalDartZone): CapitalDart => ({ v, mult, ...(zone ? { zone } : {}) });
  const tryDart = (v: number, mult: 1 | 2 | 3 = 1) => randomHit(accuracy) ? dart(v, mult) : miss();

  switch (contract) {
    case "capital":
      return [tryDart(20, randomHit(accuracy * 0.55) ? 3 : 1), tryDart(19, randomHit(accuracy * 0.45) ? 3 : 1), tryDart(18, randomHit(accuracy * 0.35) ? 3 : 1)];
    case "n20": return [tryDart(20), tryDart(20), tryDart(20)];
    case "n19": return [tryDart(19), tryDart(19), tryDart(19)];
    case "n18": return [tryDart(18), tryDart(18), tryDart(18)];
    case "n17": return [tryDart(17), tryDart(17), tryDart(17)];
    case "n16": return [tryDart(16), tryDart(16), tryDart(16)];
    case "n15": return [tryDart(15), tryDart(15), tryDart(15)];
    case "n14": return [tryDart(14), tryDart(14), tryDart(14)];
    case "n13": return [tryDart(13), tryDart(13), tryDart(13)];
    case "double_any": return [tryDart(20, 2), tryDart(16, 2), tryDart(12, 2)];
    case "triple_any": return [tryDart(20, 3), tryDart(19, 3), tryDart(18, 3)];
    case "center": return [randomHit(accuracy) ? dart(25, randomHit(accuracy * 0.5) ? 2 : 1) : miss(), miss(), miss()];
    case "exact_57": return randomHit(accuracy) ? [dart(19, 3), miss(), miss()] : [dart(20), dart(19), dart(18)];
    case "suite": return randomHit(accuracy) ? [dart(18), dart(19), dart(20)] : [tryDart(10), tryDart(11), tryDart(12)];
    case "side": return randomHit(accuracy) ? [dart(20), dart(1), dart(18)] : [tryDart(6), tryDart(10), tryDart(15)];
    case "colors_3": return randomHit(accuracy) ? [dart(25), dart(20, 2), dart(19)] : [tryDart(20), tryDart(5), miss()];
    case "peluche": return randomHit(accuracy) ? [dart(7), dart(6), dart(6)] : [tryDart(5), tryDart(5), tryDart(5)];
    case "diagonal": return [tryDart(20), tryDart(25), tryDart(3)];
    case "shanghai": return [tryDart(20, 1), tryDart(20, 2), tryDart(20, 3)];
    case "even_3": return [tryDart(20), tryDart(18), tryDart(16)];
    case "odd_3": return [tryDart(19), tryDart(17), tryDart(15)];
    case "exact_42": return randomHit(accuracy) ? [dart(20, 2), dart(2), miss()] : [tryDart(20), tryDart(19), tryDart(18)];
    case "exact_69": return randomHit(accuracy) ? [dart(19), dart(25, 2), miss()] : [tryDart(20), tryDart(19), tryDart(18)];
    case "exact_custom": return makeCapitalExactBotVisit(clampCapitalNumber(options.exactTarget, 1, 180, 42), accuracy);
    case "packet": return [tryDart(12), tryDart(12), tryDart(12)];
    case "four_corners": return [tryDart(20), tryDart(3), tryDart(11)];
    case "outer_single": return [20, 19, 18].map((v) => randomHit(accuracy) ? dart(v, 1, "outer-single") : miss());
    case "bad_hand": return [tryDart(4), tryDart(5), tryDart(6)];
    case "poubelle": return [0, 0, 0].map(() => randomHit(accuracy) ? dart(0, 1, "outside") : miss());
    case "petit_score": return randomHit(accuracy) ? [dart(1), dart(2), dart(3)] : [tryDart(9), tryDart(7), tryDart(5)];
    default: return [miss(), miss(), miss()];
  }
}

/** Recherche une combinaison de 1 à 3 fléchettes sans inventer une cible impossible. */
function capitalExactCombination(target: number): CapitalDart[] | null {
  const all = [{ v: 0, mult: 1 as const }, ...Array.from({ length: 20 }, (_, i) => i + 1).flatMap((v) => ([1, 2, 3] as const).map((mult) => ({ v, mult }))), { v: 25, mult: 1 as const }, { v: 25, mult: 2 as const }];
  const byScore = new Map<number, CapitalDart>();
  for (const d of all) if (!byScore.has(capitalDartScore(d))) byScore.set(capitalDartScore(d), d);
  for (const a of all) for (const b of all) {
    const rest = target - capitalDartScore(a) - capitalDartScore(b);
    if (byScore.has(rest)) return [a, b, byScore.get(rest)!];
  }
  return null;
}

export function capitalExactScorePossible(target: number): boolean {
  return Number.isInteger(target) && target >= 1 && target <= 180 && capitalExactCombination(target) !== null;
}

function makeCapitalExactBotVisit(target: number, accuracy: number): CapitalDart[] {
  const combination = capitalExactCombination(target);
  if (!combination) return [{ v: 0, mult: 1 }, { v: 0, mult: 1 }, { v: 0, mult: 1 }];
  return combination.map((dart) => dart.v === 0 || randomHit(accuracy) ? dart : { v: 0, mult: 1 });
}

export function capitalDartLabel(dart: CapitalDart): string {
  if (!dart || dart.zone === "miss") return "MISS";
  if (dart.zone === "outside") return "HORS CIBLE";
  if (dart.v === 0) return "MISS";
  if (dart.zone === "outer-single") return `S EXT ${dart.v}`;
  if (dart.zone === "inner-single") return `S INT ${dart.v}`;
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

export function buildCapitalPlayerStats(players: CapitalPlayer[], visits: CapitalVisit[], finalScores: number[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;

  return players.map((player, index) => {
    const rows = (visits || []).filter((visit) => String(visit.playerId) === String(player.id));
    const scoringRows = rows.filter((visit) => visit.contractId !== "capital");
    const opening = rows.find((visit) => visit.contractId === "capital");
    const darts = rows.flatMap((visit) => visit.darts || []);
    const successfulRows = scoringRows.filter((visit) => visit.success);
    const failedRows = scoringRows.filter((visit) => !visit.success);
    const visitsPlayed = rows.length;
    const successfulVisits = successfulRows.length;
    const failedVisits = failedRows.length;
    const pointsWon = successfulRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0) + Number(visit.bonusPoints || 0), 0);
    const capitalLost = scoringRows.reduce((sum, visit) => sum + Number(visit.penaltyLost || 0), 0);
    const scored = rows.reduce((sum, visit) => sum + Number(visit.rawVisitScore ?? visit.visitScore ?? 0), 0);
    const failedRawPoints = failedRows.reduce((sum, visit) => sum + Number(visit.rawVisitScore ?? visit.visitScore ?? 0), 0);
    const bestVisit = rows.reduce((best, visit) => Math.max(best, Number(visit.rawVisitScore ?? visit.visitScore ?? 0)), 0);
    const lowestVisit = rows.length ? rows.reduce((low, visit) => Math.min(low, Number(visit.rawVisitScore ?? visit.visitScore ?? 0)), Number.POSITIVE_INFINITY) : 0;
    const bestGain = rows.reduce((best, visit) => Math.max(best, Number(visit.delta || 0)), 0);
    const biggestLoss = rows.reduce((best, visit) => Math.max(best, Number(visit.penaltyLost || 0)), 0);
    const count = (predicate: (dart: CapitalDart) => boolean) => darts.filter(predicate).length;
    const knownDarts = darts.length;
    const dartsThrown = rows.reduce((total, visit) => total + (visit.dartsUsed
      ? Math.max(1, Math.min(3, Number(visit.dartsUsed))) : (visit.darts || []).length), 0);
    const unmeasuredDarts = dartsThrown - knownDarts;
    const hitCount = count((dart) => Number(dart?.v || 0) > 0);
    const outsideHits = count((dart) => dart.zone === "outside");
    const misses = knownDarts - hitCount - outsideHits;
    const singles = count((dart) => dart.v > 0 && dart.mult === 1 && dart.v !== 25);
    const doubles = count((dart) => dart.v > 0 && dart.mult === 2 && dart.v !== 25);
    const triples = count((dart) => dart.v > 0 && dart.mult === 3 && dart.v !== 25);
    const bulls = count((dart) => dart.v === 25 && dart.mult === 1);
    const dbulls = count((dart) => dart.v === 25 && dart.mult === 2);
    const finalCapital = Number(finalScores[index] || 0);
    const startingCapital = Number(opening?.scoreAfter ?? scoringRows[0]?.scoreBefore ?? 0);
    const scoreAfterValues = rows.map((visit) => Number(visit.scoreAfter || 0));
    const peakCapital = scoreAfterValues.length ? Math.max(...scoreAfterValues) : finalCapital;
    const lowestCapital = scoreAfterValues.length ? Math.min(...scoreAfterValues) : finalCapital;
    const averageCapitalAfterVisit = scoreAfterValues.length ? round1(scoreAfterValues.reduce((a, b) => a + b, 0) / scoreAfterValues.length) : finalCapital;
    const grossCapital = startingCapital + pointsWon;
    const netCapitalChange = finalCapital - startingCapital;
    const penaltyEvents = failedRows.filter((visit) => Number(visit.penaltyLost || 0) > 0).length;
    const avgPenalty = penaltyEvents ? round1(capitalLost / penaltyEvents) : 0;

    let successStreak = 0;
    let failStreak = 0;
    let successStreakMax = 0;
    let failStreakMax = 0;
    for (const visit of scoringRows) {
      if (visit.success) {
        successStreak += 1;
        failStreak = 0;
        successStreakMax = Math.max(successStreakMax, successStreak);
      } else {
        failStreak += 1;
        successStreak = 0;
        failStreakMax = Math.max(failStreakMax, failStreak);
      }
    }

    const contractStats: Record<string, {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      pointsWon: number;
      rawPoints: number;
      capitalLost: number;
      bestVisit: number;
      averageVisit: number;
    }> = {};
    for (const visit of scoringRows) {
      const key = String(visit.contractId || "unknown");
      const current = contractStats[key] || { attempts: 0, successes: 0, failures: 0, successRate: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, averageVisit: 0 };
      current.attempts += 1;
      current.successes += visit.success ? 1 : 0;
      current.failures += visit.success ? 0 : 1;
      current.pointsWon += visit.success ? Number(visit.visitScore || 0) + Number(visit.bonusPoints || 0) : 0;
      current.rawPoints += Number(visit.rawVisitScore ?? visit.visitScore ?? 0);
      current.capitalLost += Number(visit.penaltyLost || 0);
      current.bestVisit = Math.max(current.bestVisit, Number(visit.rawVisitScore ?? visit.visitScore ?? 0));
      current.successRate = ratio(current.successes, current.attempts);
      current.averageVisit = round1(current.rawPoints / current.attempts);
      contractStats[key] = current;
    }

    const sectorHits: Record<string, number> = {};
    const sectorPoints: Record<string, number> = {};
    for (const dart of darts) {
      const v = Number(dart?.v || 0);
      if (v <= 0) continue;
      const key = String(v);
      sectorHits[key] = (sectorHits[key] || 0) + 1;
      sectorPoints[key] = (sectorPoints[key] || 0) + capitalDartScore(dart);
    }
    const topSectorEntry = Object.entries(sectorHits).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
    const topScoringSectorEntry = Object.entries(sectorPoints).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
    const visitScores = rows.map((visit) => Number(visit.rawVisitScore ?? visit.visitScore ?? 0));
    const buckets = {
      zero: visitScores.filter((score) => score === 0).length,
      under20: visitScores.filter((score) => score > 0 && score < 20).length,
      h20: visitScores.filter((score) => score >= 20 && score < 40).length,
      h40: visitScores.filter((score) => score >= 40 && score < 60).length,
      h60: visitScores.filter((score) => score >= 60 && score < 100).length,
      h100: visitScores.filter((score) => score >= 100 && score < 140).length,
      h140: visitScores.filter((score) => score >= 140 && score < 180).length,
      h180: visitScores.filter((score) => score === 180).length,
    };
    const visits60Plus = visitScores.filter((score) => score >= 60).length;
    const visits100Plus = visitScores.filter((score) => score >= 100).length;
    const visits140Plus = visitScores.filter((score) => score >= 140).length;
    const maxDart = darts.reduce((best, dart) => Math.max(best, capitalDartScore(dart)), 0);
    const rawDartAverage = dartsThrown ? round1(scored / dartsThrown) : 0;

    const contractSuccess = (contractId: CapitalContractId) => scoringRows.filter((visit) => visit.contractId === contractId && visit.success).length;

    return {
      ...player,
      playerId: player.id,
      profileId: player.profileId ?? player.id,
      capital: finalCapital,
      finalCapital,
      score: finalCapital,
      startingCapital,
      peakCapital,
      lowestCapital,
      averageCapital: averageCapitalAfterVisit,
      averageCapitalAfterVisit,
      grossCapital,
      netCapitalChange,
      capitalRetentionRate: ratio(finalCapital, grossCapital),
      points: pointsWon,
      pointsWon,
      rawPointsScored: scored,
      failedRawPoints,
      capitalLost,
      penaltyLost: capitalLost,
      penaltyEvents,
      avgPenalty,
      visits: visitsPlayed,
      turns: visitsPlayed,
      rounds: visitsPlayed,
      contractsPlayed: scoringRows.length,
      targetsFaced: scoringRows.length,
      successfulContracts: successfulVisits,
      successfulVisits,
      validHits: rows.reduce((sum, visit) => sum + Number(visit.qualifiedDarts ?? 0), 0),
      failedContracts: failedVisits,
      failedVisits,
      fails: failedVisits,
      successRate: ratio(successfulVisits, scoringRows.length),
      successStreakMax,
      failStreakMax,
      darts: dartsThrown,
      dartsThrown,
      totalThrows: dartsThrown,
      hitCount,
      outsideHits,
      misses,
      hitRate: ratio(hitCount, knownDarts),
      knownDarts,
      unmeasuredDarts,
      impactCoverage: ratio(knownDarts, dartsThrown),
      missRate: ratio(misses, knownDarts),
      totalScore: scored,
      averageVisit: visitsPlayed ? round1(scored / visitsPlayed) : 0,
      avgVisit: visitsPlayed ? round1(scored / visitsPlayed) : 0,
      avg3: dartsThrown ? round1((scored / dartsThrown) * 3) : 0,
      rawDartAverage,
      averageSuccessfulVisit: successfulRows.length ? round1(successfulRows.reduce((sum, visit) => sum + Number(visit.visitScore || 0), 0) / successfulRows.length) : 0,
      averageFailedVisit: failedRows.length ? round1(failedRows.reduce((sum, visit) => sum + Number(visit.rawVisitScore ?? visit.visitScore ?? 0), 0) / failedRows.length) : 0,
      bestVisit,
      lowestVisit: Number.isFinite(lowestVisit) ? lowestVisit : 0,
      bestGain,
      biggestLoss,
      maxDart,
      exact57: contractSuccess("exact_57"),
      centerSuccess: contractSuccess("center"),
      tripleContractSuccess: contractSuccess("triple_any"),
      doubleContractSuccess: contractSuccess("double_any"),
      sideSuccess: contractSuccess("side"),
      suiteSuccess: contractSuccess("suite"),
      colorsSuccess: contractSuccess("colors_3"),
      singles,
      doubles,
      triples,
      bulls,
      dbulls,
      singleRate: ratio(singles, knownDarts),
      doubleRate: ratio(doubles, knownDarts),
      tripleRate: ratio(triples, knownDarts),
      bullRate: ratio(bulls + dbulls, knownDarts),
      zeroVisits: buckets.zero,
      visits60Plus,
      visits100Plus,
      visits140Plus,
      visits180: buckets.h180,
      h60: buckets.h60,
      h100: buckets.h100,
      h140: buckets.h140,
      h180: buckets.h180,
      buckets,
      sectorHits,
      sectorPoints,
      topSector: topSectorEntry ? Number(topSectorEntry[0]) : null,
      topSectorHits: topSectorEntry ? topSectorEntry[1] : 0,
      topScoringSector: topScoringSectorEntry ? Number(topScoringSectorEntry[0]) : null,
      topScoringSectorPoints: topScoringSectorEntry ? topScoringSectorEntry[1] : 0,
      successfulContractIds: scoringRows.filter((visit) => visit.success).map((visit) => visit.contractId),
      failedContractIds: scoringRows.filter((visit) => !visit.success).map((visit) => visit.contractId),
      contractStats,
      lastContractScore: scoringRows.length ? Number(scoringRows[scoringRows.length - 1].visitScore || 0) : 0,
      lastContractSuccess: scoringRows.length ? Boolean(scoringRows[scoringRows.length - 1].success) : false,
    };
  });
}

export function buildCapitalTeamStats(teams: CapitalTeam[], playerStats: any[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;
  return (teams || []).map((team, index) => {
    const members = playerStats.filter((player) => (team.players || []).map(String).includes(String(player.id || player.playerId)));
    const sum = (key: string) => members.reduce((total, player) => total + Number(player?.[key] || 0), 0);
    const max = (key: string) => members.reduce((best, player) => Math.max(best, Number(player?.[key] || 0)), 0);
    const darts = sum("dartsThrown");
    const rawPoints = sum("rawPointsScored");
    const attempts = sum("contractsPlayed");
    const successfulContracts = sum("successfulContracts");
    const contractStats: Record<string, any> = {};
    for (const member of members) {
      for (const [contractId, row] of Object.entries(member?.contractStats || {}) as Array<[string, any]>) {
        const current = contractStats[contractId] || { attempts: 0, successes: 0, failures: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, successRate: 0, averageVisit: 0 };
        current.attempts += Number(row?.attempts || 0);
        current.successes += Number(row?.successes || 0);
        current.failures += Number(row?.failures || 0);
        current.pointsWon += Number(row?.pointsWon || 0);
        current.rawPoints += Number(row?.rawPoints || 0);
        current.capitalLost += Number(row?.capitalLost || 0);
        current.bestVisit = Math.max(current.bestVisit, Number(row?.bestVisit || 0));
        current.successRate = ratio(current.successes, current.attempts);
        current.averageVisit = current.attempts ? round1(current.rawPoints / current.attempts) : 0;
        contractStats[contractId] = current;
      }
    }
    return {
      ...team,
      teamIndex: index,
      score: sum("finalCapital"),
      capital: sum("finalCapital"),
      finalCapital: sum("finalCapital"),
      startingCapital: sum("startingCapital"),
      peakCapital: sum("peakCapital"),
      lowestCapital: sum("lowestCapital"),
      netCapitalChange: sum("netCapitalChange"),
      pointsWon: sum("pointsWon"),
      rawPointsScored: rawPoints,
      capitalLost: sum("capitalLost"),
      penaltyEvents: sum("penaltyEvents"),
      successfulContracts,
      failedContracts: sum("failedContracts"),
      contractsPlayed: attempts,
      successRate: ratio(successfulContracts, attempts),
      dartsThrown: darts,
      visits: sum("visits"),
      avg3: darts ? round1((rawPoints / darts) * 3) : 0,
      averageVisit: sum("visits") ? round1(rawPoints / sum("visits")) : 0,
      hitCount: sum("hitCount"),
      misses: sum("misses"),
      outsideHits: sum("outsideHits"),
      hitRate: ratio(sum("hitCount"), sum("knownDarts")),
      knownDarts: sum("knownDarts"),
      unmeasuredDarts: sum("unmeasuredDarts"),
      singles: sum("singles"),
      doubles: sum("doubles"),
      triples: sum("triples"),
      bulls: sum("bulls"),
      dbulls: sum("dbulls"),
      bestVisit: max("bestVisit"),
      bestGain: max("bestGain"),
      biggestLoss: max("biggestLoss"),
      successStreakMax: max("successStreakMax"),
      failStreakMax: max("failStreakMax"),
      visits60Plus: sum("visits60Plus"),
      visits100Plus: sum("visits100Plus"),
      visits140Plus: sum("visits140Plus"),
      visits180: sum("visits180"),
      exact57: sum("exact57"),
      capitalRetentionRate: ratio(sum("finalCapital"), sum("grossCapital")),
      contractStats,
      members,
    };
  });
}

export function buildCapitalMatchStats(playerStats: any[], teamStats: any[], visits: CapitalVisit[]) {
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const ratio = (num: number, den: number) => den ? round1((num / den) * 100) : 0;
  const rows = Array.isArray(playerStats) ? playerStats : [];
  const sum = (key: string) => rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  const max = (key: string) => rows.reduce((best, row) => Math.max(best, Number(row?.[key] || 0)), 0);
  const darts = sum("dartsThrown");
  const totalVisits = sum("visits");
  const rawPoints = sum("rawPointsScored");
  const attempts = sum("contractsPlayed");
  const successfulContracts = sum("successfulContracts");
  const times = (visits || []).map((visit) => Number(visit?.createdAt || 0)).filter((value) => value > 0);
  const durationMs = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;
  const contractStats: Record<string, any> = {};
  for (const player of rows) {
    for (const [contractId, row] of Object.entries(player?.contractStats || {}) as Array<[string, any]>) {
      const current = contractStats[contractId] || { attempts: 0, successes: 0, failures: 0, pointsWon: 0, rawPoints: 0, capitalLost: 0, bestVisit: 0, successRate: 0, averageVisit: 0 };
      current.attempts += Number(row?.attempts || 0);
      current.successes += Number(row?.successes || 0);
      current.failures += Number(row?.failures || 0);
      current.pointsWon += Number(row?.pointsWon || 0);
      current.rawPoints += Number(row?.rawPoints || 0);
      current.capitalLost += Number(row?.capitalLost || 0);
      current.bestVisit = Math.max(current.bestVisit, Number(row?.bestVisit || 0));
      current.successRate = ratio(current.successes, current.attempts);
      current.averageVisit = current.attempts ? round1(current.rawPoints / current.attempts) : 0;
      contractStats[contractId] = current;
    }
  }
  return {
    players: rows.length,
    teams: Array.isArray(teamStats) ? teamStats.length : 0,
    totalVisits,
    totalDarts: darts,
    rawPointsScored: rawPoints,
    averageVisit: totalVisits ? round1(rawPoints / totalVisits) : 0,
    avg3: darts ? round1((rawPoints / darts) * 3) : 0,
    totalStartingCapital: sum("startingCapital"),
    totalFinalCapital: sum("finalCapital"),
    averageFinalCapital: rows.length ? round1(sum("finalCapital") / rows.length) : 0,
    bestFinalCapital: max("finalCapital"),
    totalPointsWon: sum("pointsWon"),
    totalCapitalLost: sum("capitalLost"),
    netCapitalChange: sum("netCapitalChange"),
    capitalRetentionRate: ratio(sum("finalCapital"), sum("grossCapital")),
    contractsPlayed: attempts,
    successfulContracts,
    failedContracts: sum("failedContracts"),
    successRate: ratio(successfulContracts, attempts),
    penaltyEvents: sum("penaltyEvents"),
    averagePenalty: sum("penaltyEvents") ? round1(sum("capitalLost") / sum("penaltyEvents")) : 0,
    bestVisit: max("bestVisit"),
    bestGain: max("bestGain"),
    biggestLoss: max("biggestLoss"),
    successStreakMax: max("successStreakMax"),
    failStreakMax: max("failStreakMax"),
    hitCount: sum("hitCount"),
    misses: sum("misses"),
    outsideHits: sum("outsideHits"),
    hitRate: ratio(sum("hitCount"), sum("knownDarts")),
    knownDarts: sum("knownDarts"),
    unmeasuredDarts: sum("unmeasuredDarts"),
    singles: sum("singles"),
    doubles: sum("doubles"),
    triples: sum("triples"),
    bulls: sum("bulls"),
    dbulls: sum("dbulls"),
    visits60Plus: sum("visits60Plus"),
    visits100Plus: sum("visits100Plus"),
    visits140Plus: sum("visits140Plus"),
    visits180: sum("visits180"),
    exact57: sum("exact57"),
    durationMs,
    contractStats,
  };
}

export function rankCapitalPlayers(playerStats: any[], winnerIds: string[] = []) {
  const winners = new Set(winnerIds.map(String));
  return [...(playerStats || [])]
    .sort((a, b) => Number(b.finalCapital || 0) - Number(a.finalCapital || 0) || Number(b.pointsWon || 0) - Number(a.pointsWon || 0))
    .map((player, index) => ({ ...player, rank: index + 1, position: index + 1, isWinner: winners.has(String(player.id || player.playerId)) }));
}

