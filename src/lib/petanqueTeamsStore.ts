// =============================================================
// src/lib/petanqueTeamsStore.ts
// Store unique "Teams" (localStorage) pour Pétanque (et extensible multi-sport)
// - CRUD équipes (nom, logo)
// - Persistance localStorage
//
// ✅ Intègre le store "unique Teams" (TeamEntity / TeamSport)
// ✅ Garde des exports rétro-compatibles pour l'ancien code Pétanque
// =============================================================

export type TeamSport = "petanque" | "darts" | "generic";

export type TeamEntity = {
  id: string;
  sport: TeamSport;
  name: string;
  logoDataUrl?: string | null; // base64 dataURL (PNG/JPG)
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------
// Rétro-compat Pétanque (ancien type)
// ---------------------------------------------------------------------
// NOTE: On conserve countryCode/countryName dans le type pour compat,
// mais le store "unique" ne l'exploite pas (tu pourras le rajouter plus tard
// si tu veux des équipes multi-sport avec pays).
export type PetanqueTeam = {
  id: string;
  name: string;
  countryCode?: string; // ex: "FR"
  countryName?: string; // ex: "France"
  logoDataUrl?: string | null;
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------
// Storage key (IMPORTANT)
// ---------------------------------------------------------------------
// Si tu veux VRAIMENT un store unique Teams partagé par Profiles > Teams ET PetanqueConfig,
// il faut que la clé soit commune.
// Ici on choisit la clé "dc-teams-v1" (celle proposée).
//
// Si aujourd’hui ta page Teams utilise une autre clé, aligne-la sur celle-ci
// (ou fais un migrateur).
const STORAGE_KEY = "dc-teams-v1";

// ---------------------------
// Helpers
// ---------------------------
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function now() {
  return Date.now();
}

export function makeTeamId(prefix: string = "team") {
  return `${prefix}-${now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------
// CRUD (générique, multi-sport)
// ---------------------------
export function loadTeams(): TeamEntity[] {
  const data = safeParse<TeamEntity[]>(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(data)) return [];

  return data
    .filter((t) => t && typeof t.id === "string" && typeof t.name === "string")
    .map((t) => ({
      id: String(t.id),
      sport: (t.sport as TeamSport) ?? "generic",
      name: String(t.name ?? "").trim(),
      logoDataUrl: t.logoDataUrl ?? null,
      createdAt: Number(t.createdAt ?? 0) || 0,
      updatedAt: Number(t.updatedAt ?? 0) || 0,
    }))
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

export function saveTeams(list: TeamEntity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertTeam(team: TeamEntity) {
  const list = loadTeams();
  const idx = list.findIndex((t) => t.id === team.id);

  const next: TeamEntity = {
    ...team,
    name: (team.name ?? "").trim(),
    updatedAt: now(),
    createdAt: team.createdAt ?? now(),
    logoDataUrl: team.logoDataUrl ?? null,
    sport: team.sport ?? "generic",
  };

  if (idx >= 0) list[idx] = next;
  else list.unshift(next);

  saveTeams(list);
  return next;
}

export function createTeam(input: { sport: TeamSport; name: string; logoDataUrl?: string | null }): TeamEntity {
  const t: TeamEntity = {
    id: makeTeamId(input.sport),
    sport: input.sport,
    name: (input.name ?? "").trim(),
    logoDataUrl: input.logoDataUrl ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  upsertTeam(t);
  return t;
}

export function updateTeam(
  teamId: string,
  patch: Partial<Pick<TeamEntity, "name" | "logoDataUrl" | "sport">>
): TeamEntity | null {
  const list = loadTeams();
  const idx = list.findIndex((t) => t.id === teamId);
  if (idx < 0) return null;

  const prev = list[idx];

  const next: TeamEntity = {
    ...prev,
    ...patch,
    name: (patch.name ?? prev.name).trim(),
    sport: (patch.sport ?? prev.sport) as TeamSport,
    logoDataUrl: patch.logoDataUrl ?? prev.logoDataUrl ?? null,
    updatedAt: now(),
  };

  list[idx] = next;
  saveTeams(list);
  return next;
}

export function deleteTeam(teamId: string) {
  const list = loadTeams().filter((t) => t.id !== teamId);
  saveTeams(list);
  return list;
}

export function loadTeamsBySport(sport: TeamSport): TeamEntity[] {
  return loadTeams().filter((t) => t.sport === sport);
}

// ---------------------------
// DataURL helper (logo upload)
// ---------------------------
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("FileReader error"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

// =====================================================================
// API Rétro-compat Pétanque (anciens noms de fonctions / type)
// =====================================================================

export function loadPetanqueTeams(): PetanqueTeam[] {
  // On lit le store unique et on filtre sur sport="petanque"
  const list = loadTeamsBySport("petanque");
  // Conversion minimale TeamEntity -> PetanqueTeam (country fields optionnels)
  return list.map((t) => ({
    id: t.id,
    name: t.name,
    countryCode: "FR",
    countryName: "France",
    logoDataUrl: t.logoDataUrl ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export function savePetanqueTeams(list: PetanqueTeam[]) {
  // On upsert chaque team en sport="petanque" dans le store unique
  // (on conserve l’ordre en upsertant depuis la fin)
  const existing = loadTeams().filter((t) => t.sport !== "petanque");

  const mapped: TeamEntity[] = (list ?? []).map((t) => ({
    id: t.id,
    sport: "petanque",
    name: (t.name ?? "").trim(),
    logoDataUrl: t.logoDataUrl ?? null,
    createdAt: t.createdAt ?? now(),
    updatedAt: t.updatedAt ?? now(),
  }));

  // On garde les autres sports + on remet la pétanque au-dessus (tri fait à la lecture)
  saveTeams([...mapped, ...existing]);
}

export function createPetanqueTeam(partial?: Partial<PetanqueTeam>): PetanqueTeam {
  const ts = now();
  return {
    id: partial?.id ?? makeTeamId("petanque"),
    name: partial?.name ?? "Nouvelle équipe",
    countryCode: partial?.countryCode ?? "FR",
    countryName: partial?.countryName ?? "France",
    logoDataUrl: partial?.logoDataUrl ?? null,
    createdAt: partial?.createdAt ?? ts,
    updatedAt: partial?.updatedAt ?? ts,
  };
}

export function upsertPetanqueTeam(team: PetanqueTeam) {
  const next = upsertTeam({
    id: team.id,
    sport: "petanque",
    name: (team.name ?? "").trim(),
    logoDataUrl: team.logoDataUrl ?? null,
    createdAt: team.createdAt ?? now(),
    updatedAt: team.updatedAt ?? now(),
  });

  // Retour au format PetanqueTeam
  const out: PetanqueTeam = {
    id: next.id,
    name: next.name,
    countryCode: team.countryCode ?? "FR",
    countryName: team.countryName ?? "France",
    logoDataUrl: next.logoDataUrl ?? null,
    createdAt: next.createdAt,
    updatedAt: next.updatedAt,
  };
  return out;
}

export function deletePetanqueTeam(teamId: string) {
  // Supprime dans le store unique
  const after = deleteTeam(teamId);
  // Retourne uniquement les équipes pétanque au format rétro
  return after
    .filter((t) => t.sport === "petanque")
    .map((t) => ({
      id: t.id,
      name: t.name,
      countryCode: "FR",
      countryName: "France",
      logoDataUrl: t.logoDataUrl ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })) as PetanqueTeam[];
}
