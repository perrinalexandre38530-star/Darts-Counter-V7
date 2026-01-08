// ============================================================
// src/lib/petanqueConfigStore.ts
// Store simple de configuration Pétanque (localStorage)
// ============================================================

export type PetanqueMode =
  | "simple"
  | "doublette"
  | "triplette"
  | "training";

export type TrainingFocus = "shooting" | "pointing" | "mix";

export type PetanqueGameConfig = {
  mode: PetanqueMode;

  teamAPlayerIds: string[];
  teamBPlayerIds: string[];

  targetScore: 13 | 15 | 21;

  options: {
    endsLimit?: number;
    winByTwo?: boolean;
    allowMeasurements?: boolean;
    trainingFocus?: TrainingFocus;
  };
};

const STORAGE_KEY = "dc-petanque-config-v1";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function slotsForMode(mode: PetanqueMode): number {
  switch (mode) {
    case "simple":
      return 1;
    case "doublette":
      return 2;
    case "triplette":
      return 3;
    case "training":
      return 1;
    default:
      return 1;
  }
}

export function defaultConfigForMode(
  mode: PetanqueMode
): PetanqueGameConfig {
  const slots = slotsForMode(mode);

  return {
    mode,
    teamAPlayerIds: Array(slots).fill(""),
    teamBPlayerIds: mode === "training" ? [] : Array(slots).fill(""),
    targetScore: 13,
    options: {
      allowMeasurements: true,
      winByTwo: false,
      trainingFocus: mode === "training" ? "mix" : undefined,
    },
  };
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
