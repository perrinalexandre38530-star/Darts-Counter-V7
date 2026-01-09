// ============================================================
// src/lib/petanqueConfigStore.ts
// Store simple de configuration Pétanque (localStorage)
// ============================================================

export type PetanqueMode =
  | "simple"
  | "doublette"
  | "triplette"
  | "quadrette" // ✅ NEW: 4v4 (2 boules/joueur)
  | "handicap"  // ✅ NEW: équipes déséquilibrées (3v2, 4v3, 1v2, etc.)
  | "training";

export type TrainingFocus = "shooting" | "pointing" | "mix";

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
    mode === "simple" ? 1 :
    mode === "doublette" ? 2 :
    mode === "triplette" ? 3 :
    mode === "quadrette" ? 4 :
    1;

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