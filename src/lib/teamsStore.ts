// =============================================================
// src/lib/teamsStore.ts
// Store unique TEAMS multi-sport (localStorage)
// Key: dc-teams-v1
// =============================================================

import { fileToCompressedImageDataUrl, sanitizeStoredImage, setJsonWithQuotaRecovery } from "./teamImageStorage";
import { captureUserMediaFallback, teamLogoMediaKey } from "./userMediaFallback";
import { deleteDirectR2MediaFallback } from "./directR2BackupApi";

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
const r2BackfilledTeamIds = new Set<string>();

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
  const teams = arr
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
  for (const team of teams) {
    const src = String(team.logoDataUrl || team.logoUrl || "").trim();
    if (!src || r2BackfilledTeamIds.has(team.id)) continue;
    r2BackfilledTeamIds.add(team.id);
    void captureUserMediaFallback(teamLogoMediaKey(team.id), src, { kind: "team_logo", updatedAt: team.updatedAt })
      .catch(() => r2BackfilledTeamIds.delete(team.id));
  }
  return teams;
}

export function saveTeams(next: Team[]) {
  const clean = (next || []).map((t: any) => ({ ...t, logoDataUrl: sanitizeStoredImage(t?.logoDataUrl) || undefined }));
  setJsonWithQuotaRecovery(KEY, clean, (list: any[]) =>
    (list || []).map((t: any) => ({ ...t, logoDataUrl: undefined }))
  );
  // Le logo utilisateur est écrit séparément dans R2 AVANT qu'une future
  // récupération de quota localStorage puisse supprimer son DataURL local.
  for (const team of next || []) {
    const src = String((team as any)?.logoDataUrl || (team as any)?.logoUrl || "").trim();
    if (!team?.id || !src) continue;
    void captureUserMediaFallback(teamLogoMediaKey(team.id), src, {
      kind: "team_logo",
      updatedAt: Number(team.updatedAt || Date.now()),
    }).catch((error) => console.warn("[teamsStore] R2 team logo mirror failed", error));
  }
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
  void deleteDirectR2MediaFallback(teamLogoMediaKey(id)).catch(() => undefined);
}

// ---------------------------
// DataURL helper (logo upload)
// ---------------------------
export function fileToDataUrl(file: File): Promise<string> {
  return fileToCompressedImageDataUrl(file, { maxSize: 256, quality: 0.78 });
}
