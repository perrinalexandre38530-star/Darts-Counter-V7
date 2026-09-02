export type AppSportId =
  | "fit"
  | "running"
  | "darts"
  | "foot"
  | "babyfoot"
  | "pingpong"
  | "petanque"
  | "molkky"
  | "dicegame"
  | "esports"
  | "archery"
  | "badminton"
  | "basket"
  | "billard"
  | "chess"
  | "cornhole"
  | "frisbee"
  | "padel"
  | "pickleball"
  | "rugby"
  | "tennis"
  | "volley";

export type AppSportCatalogEntry = {
  id: AppSportId;
  label: string;
  accent: string;
  enabled: boolean;
};

// Source de vérité commune GameSelect / Agenda.
// IMPORTANT : lorsqu'un nouveau module passe de SOON à disponible, basculer
// simplement `enabled` à true ici : il apparaîtra aussi automatiquement dans
// les sélecteurs et filtres de l'Agenda.
export const APP_SPORT_CATALOG: readonly AppSportCatalogEntry[] = [
  { id: "fit", label: "FIT PERF", accent: "#F4B942", enabled: true },
  { id: "running", label: "RUNNING PERF", accent: "#FF7A00", enabled: true },
  { id: "darts", label: "DARTS", accent: "#EEFF31", enabled: true },
  { id: "foot", label: "FOOT", accent: "#72FF24", enabled: true },
  { id: "babyfoot", label: "BABY-FOOT", accent: "#248BFF", enabled: true },
  { id: "pingpong", label: "PING-PONG", accent: "#FF3FA4", enabled: true },
  { id: "petanque", label: "PÉTANQUE", accent: "#D79A2B", enabled: true },
  { id: "molkky", label: "MÖLKKY", accent: "#F2C98F", enabled: true },
  { id: "dicegame", label: "DICE GAME", accent: "#9C6BFF", enabled: true },
  { id: "esports", label: "E-SPORTS", accent: "#31D6FF", enabled: true },

  // Modules déjà préparés graphiquement, encore SOON dans le sélecteur principal.
  { id: "archery", label: "TIR À L'ARC", accent: "#FFD21A", enabled: false },
  { id: "badminton", label: "BADMINTON", accent: "#7E8F22", enabled: false },
  { id: "basket", label: "BASKET", accent: "#606A73", enabled: false },
  { id: "billard", label: "BILLARD", accent: "#F4F4F4", enabled: false },
  { id: "chess", label: "ÉCHECS", accent: "#C7CBD1", enabled: false },
  { id: "cornhole", label: "CORNHOLE", accent: "#FF3B30", enabled: false },
  { id: "frisbee", label: "FRISBEE", accent: "#A76B42", enabled: false },
  { id: "padel", label: "PADEL", accent: "#FF91D6", enabled: false },
  { id: "pickleball", label: "PICKLEBALL", accent: "#57D8C8", enabled: false },
  { id: "rugby", label: "RUGBY", accent: "#FF8F80", enabled: false },
  { id: "tennis", label: "TENNIS", accent: "#69B9FF", enabled: false },
  { id: "volley", label: "VOLLEY-BALL", accent: "#B6A0FF", enabled: false },
] as const;

const META = new Map<AppSportId, AppSportCatalogEntry>(APP_SPORT_CATALOG.map((item) => [item.id, item]));

export function appSportMeta(id: AppSportId): AppSportCatalogEntry {
  return META.get(id) || APP_SPORT_CATALOG[0];
}

function readRuntimeUnlocks(): Set<string> {
  const out = new Set<string>();
  if (typeof localStorage === "undefined") return out;
  for (const key of ["mss-unlocked-sports-v1", "mss-enabled-sports-v1", "dc-unlocked-sports"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id) => out.add(String(id || "").toLowerCase()));
      else if (parsed && typeof parsed === "object") Object.entries(parsed).forEach(([id, value]) => { if (value) out.add(String(id).toLowerCase()); });
    } catch {}
  }
  return out;
}

export function isAppSportEnabled(id: AppSportId): boolean {
  const meta = appSportMeta(id);
  if (meta.enabled) return true;
  return readRuntimeUnlocks().has(id);
}

export function enabledAppSports(): AppSportCatalogEntry[] {
  return APP_SPORT_CATALOG.filter((item) => isAppSportEnabled(item.id));
}
