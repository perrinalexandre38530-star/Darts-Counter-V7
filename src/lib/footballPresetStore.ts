import type { FootballConfigPayload } from "./gameEngines/footballEngine";

export type FootballPresetSettings = Partial<Pick<FootballConfigPayload,
  | "variant"
  | "botLevel"
  | "halfRounds"
  | "extraRounds"
  | "tieBreaker"
  | "goalTarget"
  | "penaltyShots"
  | "mercyGoals"
  | "targetDifficulty"
  | "kickoffMode"
  | "goalkeeperEnabled"
  | "missLosesPossession"
  | "randomOrder"
  | "coachHints"
  | "scoreInputMethod"
>>;

export type FootballBuiltinPreset = {
  id: "express" | "standard" | "cup" | "tactical" | "arcade" | "simulation";
  icon: string;
  title: string;
  subtitle: string;
  settings: FootballPresetSettings;
};

export type FootballCustomPreset = {
  id: string;
  name: string;
  createdAt: number;
  settings: FootballPresetSettings;
};

export const FOOTBALL_CUSTOM_PRESET_KEY = "dc_football_custom_presets_v1";
export const FOOTBALL_CUSTOM_PRESET_LIMIT = 3;

export const FOOTBALL_BUILTIN_PRESETS: FootballBuiltinPreset[] = [
  {
    id: "express",
    icon: "⚡",
    title: "EXPRESS",
    subtitle: "2 × 3 tours · rythme immédiat",
    settings: {
      variant: "match",
      halfRounds: 3,
      tieBreaker: "penalties",
      extraRounds: 2,
      goalkeeperEnabled: false,
      missLosesPossession: true,
      targetDifficulty: "accessible",
      mercyGoals: 0,
      coachHints: true,
    },
  },
  {
    id: "standard",
    icon: "⚽",
    title: "STANDARD",
    subtitle: "2 × 5 tours · expérience complète",
    settings: {
      variant: "match",
      halfRounds: 5,
      tieBreaker: "penalties",
      extraRounds: 3,
      goalkeeperEnabled: true,
      missLosesPossession: true,
      targetDifficulty: "standard",
      mercyGoals: 0,
      coachHints: true,
    },
  },
  {
    id: "cup",
    icon: "🏆",
    title: "COUPE",
    subtitle: "Match à élimination directe",
    settings: {
      variant: "match",
      halfRounds: 6,
      tieBreaker: "penalties",
      extraRounds: 2,
      goalkeeperEnabled: true,
      missLosesPossession: true,
      targetDifficulty: "standard",
      mercyGoals: 0,
      coachHints: true,
    },
  },
  {
    id: "tactical",
    icon: "🧠",
    title: "TACTIQUE",
    subtitle: "2 × 8 tours · secteurs exigeants",
    settings: {
      variant: "match",
      halfRounds: 8,
      tieBreaker: "golden_goal",
      extraRounds: 3,
      goalkeeperEnabled: true,
      missLosesPossession: true,
      targetDifficulty: "expert",
      mercyGoals: 0,
      coachHints: true,
    },
  },
  {
    id: "arcade",
    icon: "🔥",
    title: "ARCADE",
    subtitle: "Premier à 3 · sans gardien",
    settings: {
      variant: "first_to",
      goalTarget: 3,
      goalkeeperEnabled: false,
      missLosesPossession: true,
      targetDifficulty: "accessible",
      mercyGoals: 0,
      coachHints: true,
    },
  },
  {
    id: "simulation",
    icon: "🎙️",
    title: "SIMULATION",
    subtitle: "2 × 10 tours · nul autorisé",
    settings: {
      variant: "match",
      halfRounds: 10,
      tieBreaker: "draw",
      extraRounds: 3,
      goalkeeperEnabled: true,
      missLosesPossession: false,
      targetDifficulty: "expert",
      mercyGoals: 0,
      coachHints: false,
    },
  },
];

function safeParse(raw: string | null): FootballCustomPreset[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === "object" && entry.settings && typeof entry.settings === "object")
      .map((entry, index) => ({
        id: String(entry.id || `custom-${index + 1}`),
        name: String(entry.name || `Profil ${index + 1}`).slice(0, 24),
        createdAt: Number(entry.createdAt || Date.now()),
        settings: entry.settings as FootballPresetSettings,
      }))
      .slice(0, FOOTBALL_CUSTOM_PRESET_LIMIT);
  } catch {
    return [];
  }
}

export function loadFootballCustomPresets(): FootballCustomPreset[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(FOOTBALL_CUSTOM_PRESET_KEY));
}

function persistFootballCustomPresets(presets: FootballCustomPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOOTBALL_CUSTOM_PRESET_KEY, JSON.stringify(presets.slice(0, FOOTBALL_CUSTOM_PRESET_LIMIT)));
  } catch {}
}

export function saveFootballCustomPreset(nameInput: string, settings: FootballPresetSettings): FootballCustomPreset[] {
  const name = String(nameInput || "").trim().slice(0, 24);
  if (!name) return loadFootballCustomPresets();
  const current = loadFootballCustomPresets();
  const existing = current.find((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  const item: FootballCustomPreset = {
    id: existing?.id || `football-custom-${Date.now()}`,
    name,
    createdAt: Date.now(),
    settings: { ...settings },
  };
  const withoutExisting = current.filter((preset) => preset.id !== item.id);
  const next = [item, ...withoutExisting].slice(0, FOOTBALL_CUSTOM_PRESET_LIMIT);
  persistFootballCustomPresets(next);
  return next;
}

export function deleteFootballCustomPreset(id: string): FootballCustomPreset[] {
  const next = loadFootballCustomPresets().filter((preset) => preset.id !== String(id));
  persistFootballCustomPresets(next);
  return next;
}

export function snapshotFootballRules(input: FootballPresetSettings): FootballPresetSettings {
  return {
    variant: input.variant,
    botLevel: input.botLevel,
    halfRounds: input.halfRounds,
    extraRounds: input.extraRounds,
    tieBreaker: input.tieBreaker,
    goalTarget: input.goalTarget,
    penaltyShots: input.penaltyShots,
    mercyGoals: input.mercyGoals,
    targetDifficulty: input.targetDifficulty,
    kickoffMode: input.kickoffMode,
    goalkeeperEnabled: input.goalkeeperEnabled,
    missLosesPossession: input.missLosesPossession,
    randomOrder: input.randomOrder,
    coachHints: input.coachHints,
    scoreInputMethod: input.scoreInputMethod,
  };
}

export function footballRulesMatchPreset(current: FootballPresetSettings, preset: FootballPresetSettings): boolean {
  return Object.entries(preset).every(([key, value]) => (current as any)?.[key] === value);
}
