// ============================================================
// src/lib/petanqueConfigStore.ts
// Store simple de configuration Pétanque (localStorage)
// + ✅ NEW: Répertoire d'équipes (noms) + sélection équipe A/B
// ============================================================

export type PetanqueMode =
  | "simple"
  | "doublette"
  | "triplette"
  | "quadrette" // ✅ NEW: 4v4 (2 boules/joueur)
  | "handicap" // ✅ NEW: équipes déséquilibrées (3v2, 4v3, 1v2, etc.)
  | "training";

export type TrainingFocus = "shooting" | "pointing" | "mix";

// ✅ NEW: équipes "nommées" (catalogue local)
export type PetanqueTeam = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type PetanqueGameConfig = {
  mode: PetanqueMode;

  // joueurs (IDs profils locaux)
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];

  targetScore: 13 | 15 | 21;

  options: {
    endsLimit?: number;
    winByTwo?: boolean;
    allowMeasurements?: boolean;

    // training
    trainingFocus?: TrainingFocus;

    // ✅ NEW: gestion boules/joueur (quadrette = 2)
    ballsPerPlayer?: 2 | 3;

    // ✅ NEW: handicap (tailles dynamiques)
    handicapA?: number; // 1..4
    handicapB?: number; // 1..4
  };

  // ✅ NEW: catalogue d'équipes + sélection persistée
  teams?: PetanqueTeam[];
  selectedTeamAId?: string | null;
  selectedTeamBId?: string | null;
};

const STORAGE_KEY = "dc-petanque-config-v1";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function slotsForMode(mode: PetanqueMode, cfg?: PetanqueGameConfig): number {
  switch (mode) {
    case "simple":
      return 1;
    case "doublette":
      return 2;
    case "triplette":
      return 3;
    case "quadrette":
      return 4;
    case "handicap": {
      // handicap = tailles A/B custom
      const a = Math.max(1, Math.min(4, Number(cfg?.options?.handicapA ?? 3)));
      const b = Math.max(1, Math.min(4, Number(cfg?.options?.handicapB ?? 2)));
      // ici on renvoie le max, car l’UI va afficher A et B séparément
      return Math.max(a, b);
    }
    case "training":
      return 1;
    default:
      return 1;
  }
}

export function defaultConfigForMode(mode: PetanqueMode): PetanqueGameConfig {
  const base: PetanqueGameConfig = {
    mode,
    teamAPlayerIds: [],
    teamBPlayerIds: [],
    targetScore: 13,
    options: {
      allowMeasurements: true,
      winByTwo: false,
      ballsPerPlayer: 3,
    },

    // ✅ NEW: initialisation safe
    teams: [],
    selectedTeamAId: null,
    selectedTeamBId: null,
  };

  if (mode === "training") {
    base.teamAPlayerIds = [""];
    base.teamBPlayerIds = [];
    base.options.trainingFocus = "mix";
    return base;
  }

  if (mode === "handicap") {
    // défaut “impairs” : 3 vs 2
    base.options.handicapA = 3;
    base.options.handicapB = 2;
    base.teamAPlayerIds = Array(3).fill("");
    base.teamBPlayerIds = Array(2).fill("");
    return base;
  }

  const slots =
    mode === "simple"
      ? 1
      : mode === "doublette"
      ? 2
      : mode === "triplette"
      ? 3
      : mode === "quadrette"
      ? 4
      : 1;

  base.teamAPlayerIds = Array(slots).fill("");
  base.teamBPlayerIds = Array(slots).fill("");

  if (mode === "quadrette") {
    base.options.ballsPerPlayer = 2; // ✅ 2 boules / joueur
  }

  return base;
}

// ------------------------------------------------------------
// Persistence
// ------------------------------------------------------------

export function loadPetanqueConfig(): PetanqueGameConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePetanqueConfig(config: PetanqueGameConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ------------------------------------------------------------
// ✅ NEW: Teams repository helpers
// (compat: ne casse pas les anciennes configs déjà stockées)
// ------------------------------------------------------------

const uid = () => Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);

/**
 * Garantit que les champs teams / selectedTeamAId / selectedTeamBId existent.
 * Ne modifie pas ton mode / players / options.
 */
export function ensureTeams(cfg: PetanqueGameConfig | null): PetanqueGameConfig {
  const base: PetanqueGameConfig =
    cfg ??
    ({
      mode: "simple",
      teamAPlayerIds: [""],
      teamBPlayerIds: [""],
      targetScore: 13,
      options: { allowMeasurements: true, winByTwo: false, ballsPerPlayer: 3 },
    } as PetanqueGameConfig);

  if (!Array.isArray(base.teams)) base.teams = [];
  if (typeof base.selectedTeamAId === "undefined") base.selectedTeamAId = null;
  if (typeof base.selectedTeamBId === "undefined") base.selectedTeamBId = null;

  return base;
}

/**
 * Crée une équipe si elle n'existe pas déjà (case-insensitive).
 * Retourne l'équipe existante si déjà présente.
 */
export function upsertPetanqueTeam(name: string): PetanqueTeam {
  const n = String(name || "").trim();
  if (!n) throw new Error("Nom d’équipe vide");

  const cfg0 = ensureTeams(loadPetanqueConfig());
  const now = Date.now();

  const existing = (cfg0.teams || []).find((t) => t.name.trim().toLowerCase() === n.toLowerCase());
  if (existing) return existing;

  const team: PetanqueTeam = {
    id: uid(),
    name: n,
    createdAt: now,
    updatedAt: now,
  };

  cfg0.teams = [team, ...(cfg0.teams || [])];
  savePetanqueConfig(cfg0);
  return team;
}

export function deletePetanqueTeam(teamId: string) {
  const cfg0 = ensureTeams(loadPetanqueConfig());
  cfg0.teams = (cfg0.teams || []).filter((t) => t.id !== teamId);

  if (cfg0.selectedTeamAId === teamId) cfg0.selectedTeamAId = null;
  if (cfg0.selectedTeamBId === teamId) cfg0.selectedTeamBId = null;

  savePetanqueConfig(cfg0);
}

export function setSelectedTeams(teamAId: string | null, teamBId: string | null) {
  const cfg0 = ensureTeams(loadPetanqueConfig());
  cfg0.selectedTeamAId = teamAId;
  cfg0.selectedTeamBId = teamBId;
  savePetanqueConfig(cfg0);
}

export function resolveTeamName(cfg: PetanqueGameConfig | null, teamId: string | null, fallback: string) {
  if (!cfg || !teamId) return fallback;
  const t = (cfg.teams || []).find((x) => x.id === teamId);
  return t?.name || fallback;
}
