// =============================================================
// src/lib/teamsStore.ts
// Store unique TEAMS multi-sport (localStorage)
// Key: dc-teams-v1
// =============================================================

import { fileToCompressedImageDataUrl, sanitizeStoredImage, setJsonWithQuotaRecovery } from "./teamImageStorage";

export type TeamSport = "petanque" | "darts" | string;

export type Team = {
  id: string;              // uuid
  sport: TeamSport;        // "petanque"
  name: string;            // "Les Boulistes"
  logoDataUrl?: string;    // optionnel (base64) -> OK pour local
  logoUrl?: string;        // optionnel (si un jour tu upload)
  createdAt: number;
  updatedAt: number;
};

const KEY = "dc-teams-v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v);
  } catch {
    return "[]";
  }
}

export function loadTeams(): Team[] {
  const arr = safeParse<any[]>(localStorage.getItem(KEY), []);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(Boolean)
    .map((t) => ({
      id: String(t.id || ""),
      sport: String(t.sport || "petanque"),
      name: String(t.name || "Team"),
      logoDataUrl: sanitizeStoredImage(t.logoDataUrl) || undefined,
      logoUrl: t.logoUrl ? String(t.logoUrl) : undefined,
      createdAt: Number(t.createdAt || Date.now()),
      updatedAt: Number(t.updatedAt || Date.now()),
    }))
    .filter((t) => !!t.id);
}

export function saveTeams(next: Team[]) {
  const clean = (next || []).map((t: any) => ({ ...t, logoDataUrl: sanitizeStoredImage(t?.logoDataUrl) || undefined }));
  setJsonWithQuotaRecovery(KEY, clean, (list: any[]) =>
    (list || []).map((t: any) => ({ ...t, logoDataUrl: undefined }))
  );
}

export function loadTeamsBySport(sport: TeamSport): Team[] {
  const key = String(sport || "").toLowerCase();
  return loadTeams().filter((t) => String(t.sport || "").toLowerCase() === key);
}

function uid(): string {
  // uuid si dispo, sinon fallback
  const c: any = globalThis.crypto as any;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTeam(input: {
  sport: TeamSport;
  name: string;
  logoDataUrl?: string;
  logoUrl?: string;
}): Team {
  const now = Date.now();
  const team: Team = {
    id: uid(),
    sport: input.sport,
    name: input.name.trim() || "Team",
    logoDataUrl: sanitizeStoredImage(input.logoDataUrl) || undefined,
    logoUrl: input.logoUrl,
    createdAt: now,
    updatedAt: now,
  };

  const prev = loadTeams();
  saveTeams([team, ...prev]);
  return team;
}

export function updateTeam(
  id: string,
  patch: Partial<Omit<Team, "id" | "createdAt">>
): Team | null {
  const prev = loadTeams();
  const i = prev.findIndex((t) => t.id === id);
  if (i === -1) return null;

  const now = Date.now();
  const next: Team = {
    ...prev[i],
    ...patch,
    id: prev[i].id,
    createdAt: prev[i].createdAt,
    updatedAt: now,
  };

  const out = [...prev];
  out[i] = next;
  saveTeams(out);
  return next;
}

export function deleteTeam(id: string) {
  const prev = loadTeams();
  saveTeams(prev.filter((t) => t.id !== id));
}

// ---------------------------
// DataURL helper (logo upload)
// ---------------------------
export function fileToDataUrl(file: File): Promise<string> {
  return fileToCompressedImageDataUrl(file, { maxSize: 256, quality: 0.78 });
}
