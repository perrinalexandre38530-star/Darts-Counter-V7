import type { Lang } from "../contexts/LangContext";

const MAP_USAGE_STORAGE_KEY = "dc_territories_map_usage_v1";

type MapUsageEntry = {
  count: number;
  lastUsedAt: number;
};

type MapUsageIndex = Record<string, MapUsageEntry>;

const LANGUAGE_DEFAULT_MAP: Record<Lang, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "BR",
  nl: "NL",
  ru: "RU",
  zh: "CN",
  ja: "JP",
  ar: "SA",
  hi: "IN",
  tr: "ASIA",
  da: "DK",
  no: "NO",
  sv: "SE",
  is: "IS",
  pl: "PL",
  ro: "EU",
  sr: "EU",
  hr: "HR",
  cs: "CZ",
};

function normalizeMapId(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function readUsageIndex(): MapUsageIndex {
  try {
    const raw = window.localStorage.getItem(MAP_USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const output: MapUsageIndex = {};
    for (const [rawId, rawEntry] of Object.entries(parsed as Record<string, unknown>)) {
      const id = normalizeMapId(rawId);
      const entry = rawEntry as Partial<MapUsageEntry> | null;
      if (!id || !entry) continue;
      const count = Math.max(0, Math.floor(Number(entry.count) || 0));
      const lastUsedAt = Math.max(0, Number(entry.lastUsedAt) || 0);
      if (count > 0) output[id] = { count, lastUsedAt };
    }
    return output;
  } catch {
    return {};
  }
}

function writeUsageIndex(index: MapUsageIndex): void {
  try {
    window.localStorage.setItem(MAP_USAGE_STORAGE_KEY, JSON.stringify(index));
  } catch {
    // Le jeu doit rester utilisable même si le stockage est indisponible.
  }
}

export function recordTerritoriesMapUsage(mapId: string): void {
  const id = normalizeMapId(mapId);
  if (!id || typeof window === "undefined") return;

  const index = readUsageIndex();
  const previous = index[id] ?? { count: 0, lastUsedAt: 0 };
  index[id] = {
    count: previous.count + 1,
    lastUsedAt: Date.now(),
  };
  writeUsageIndex(index);
}

export function getMostUsedTerritoriesMapId(availableMapIds: readonly string[]): string | null {
  if (typeof window === "undefined") return null;
  const available = new Set(availableMapIds.map(normalizeMapId));
  const index = readUsageIndex();

  const ranked = Object.entries(index)
    .filter(([id, entry]) => available.has(id) && entry.count > 0)
    .sort(([, left], [, right]) => {
      if (right.count !== left.count) return right.count - left.count;
      return right.lastUsedAt - left.lastUsedAt;
    });

  return ranked[0]?.[0] ?? null;
}

export function getTerritoriesLocaleDefaultMapId(
  lang: Lang,
  availableMapIds: readonly string[],
): string {
  const available = new Set(availableMapIds.map(normalizeMapId));
  const requested = normalizeMapId(LANGUAGE_DEFAULT_MAP[lang]);
  if (available.has(requested)) return requested;

  // Repli continent/pays générique lorsque le pays de la langue n'existe pas.
  if (available.has("EU") && ["fr", "en", "es", "de", "it", "pt", "nl", "da", "no", "sv", "is", "pl", "ro", "sr", "hr", "cs"].includes(lang)) {
    return "EU";
  }
  if (available.has("ASIA") && ["ru", "zh", "ja", "ar", "hi", "tr"].includes(lang)) {
    return "ASIA";
  }
  if (available.has("WORLD")) return "WORLD";
  return availableMapIds[0] ? normalizeMapId(availableMapIds[0]) : "FR";
}

export function resolvePreferredTerritoriesMapId(
  lang: Lang,
  availableMapIds: readonly string[],
): string {
  return (
    getMostUsedTerritoriesMapId(availableMapIds)
    ?? getTerritoriesLocaleDefaultMapId(lang, availableMapIds)
  );
}
