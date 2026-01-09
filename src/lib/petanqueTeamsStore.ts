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
// Store unique Teams partagé par Profiles > Teams ET PetanqueConfig.
const STORAGE_KEY = "dc-teams-v1";

// (Optionnel) Ancienne clé si tu avais un store Pétanque dédié auparavant.
// Mets-la à une valeur réelle si tu veux activer la migration au premier load.
// const LEGACY_PETANQUE_KEY = "dc-petanque-teams-v1";

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

function uuid(): string {
  const c: any = globalThis.crypto as any;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeTeamId(prefix: string = "team") {
  // garde ton format, mais plus robuste si jamais Math.random collide
  return `${prefix}-${uuid()}`;
}

function normalizeSport(s: any): TeamSport {
  if (s === "petanque" || s === "darts" || s === "generic") return s;
  return "generic";
}

function normalizeTeamEntity(t: any): TeamEntity | null {
  if (!t || typeof t !== "object") return null;
  const id = typeof t.id === "string" ? t.id : "";
  const name = typeof t.name === "string" ? t.name.trim() : "";
  if (!id || !name) return null;

  const createdAt = Number(t.createdAt ?? 0) || 0;
  const updatedAt = Number(t.updatedAt ?? 0) || 0;

  return {
    id,
    sport: normalizeSport(t.sport),
    name,
    logoDataUrl: t.logoDataUrl ?? null,
    createdAt,
    updatedAt,
  };
}

function sortByRecent(a: TeamEntity, b: TeamEntity) {
  const ta = a.updatedAt || a.createdAt || 0;
  const tb = b.updatedAt || b.createdAt || 0;
  return tb - ta;
}

function dedupeById(list: TeamEntity[]) {
  const map = new Map<string, TeamEntity>();
  for (const t of list) {
    if (!t?.id) continue;
    const prev = map.get(t.id);
    if (!prev) map.set(t.id, t);
    else {
      // garde la version la plus récente
      map.set(t.id, sortByRecent(t, prev) < 0 ? prev : t);
    }
  }
  return Array.from(map.values()).sort(sortByRecent);
}

// ---------------------------
// (Optionnel) Migration legacy -> store unique
// ---------------------------
// function maybeMigrateLegacyPetanqueTeams() {
//   try {
//     const legacy = safeParse<PetanqueTeam[]>(localStorage.getItem(LEGACY_PETANQUE_KEY));
//     if (!Array.isArray(legacy) || legacy.length === 0) return;
//     const existing = loadTeams(); // lit déjà STORAGE_KEY
//     const mapped: TeamEntity[] = legacy
//       .map((t) => ({
//         id: String(t.id || makeTeamId("petanque")),
//         sport: "petanque" as const,
//         name: String(t.name || "").trim() || "Équipe",
//         logoDataUrl: t.logoDataUrl ?? null,
//         createdAt: Number(t.createdAt || now()),
//         updatedAt: Number(t.updatedAt || now()),
//       }))
//       .filter((x) => !!x.id && !!x.name);
//     saveTeams(dedupeById([...existing, ...mapped]));
//     // Optionnel : cleanup
//     // localStorage.removeItem(LEGACY_PETANQUE_KEY);
//   } catch {
//     // ignore
//   }
// }

// ---------------------------
// CRUD (générique, multi-sport)
// ---------------------------
export function loadTeams(): TeamEntity[] {
  // maybeMigrateLegacyPetanqueTeams(); // <- active si besoin
  const data = safeParse<any[]>(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(data)) return [];

  const normalized = data
    .map(normalizeTeamEntity)
    .filter(Boolean) as TeamEntity[];

  return dedupeById(normalized);
}

export function saveTeams(list: TeamEntity[]) {
  const clean = dedupeById((list ?? []).map((x) => normalizeTeamEntity(x)).filter(Boolean) as TeamEntity[]);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function upsertTeam(team: TeamEntity) {
  const list = loadTeams();
  const idx = list.findIndex((t) => t.id === team.id);

  const ts = now();
  const next: TeamEntity = {
    ...team,
    id: String(team.id || makeTeamId(team.sport || "team")),
    name: (team.name ?? "").trim(),
    updatedAt: ts,
    createdAt: Number(team.createdAt ?? 0) || ts,
    logoDataUrl: team.logoDataUrl ?? null,
    sport: normalizeSport(team.sport),
  };

  if (!next.name) next.name = "Team";

  if (idx >= 0) list[idx] = next;
  else list.unshift(next);

  saveTeams(list);
  return next;
}

export function createTeam(input: { sport: TeamSport; name: string; logoDataUrl?: string | null }): TeamEntity {
  const ts = now();
  const t: TeamEntity = {
    id: makeTeamId(input.sport),
    sport: normalizeSport(input.sport),
    name: (input.name ?? "").trim(),
    logoDataUrl: input.logoDataUrl ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  if (!t.name) t.name = "Team";
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
    sport: normalizeSport(patch.sport ?? prev.sport),
    logoDataUrl: patch.logoDataUrl ?? prev.logoDataUrl ?? null,
    updatedAt: now(),
  };

  if (!next.name) next.name = prev.name || "Team";

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
  const s = normalizeSport(sport);
  return loadTeams().filter((t) => t.sport === s);
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

const FALLBACK_CC = "FR";
const FALLBACK_CN = "France";

export function loadPetanqueTeams(): PetanqueTeam[] {
  // On lit le store unique et on filtre sur sport="petanque"
  const list = loadTeamsBySport("petanque");

  // Conversion minimale TeamEntity -> PetanqueTeam
  // On ne “force” pas de logique pays dans le store unique, on met fallback.
  return list.map((t) => ({
    id: t.id,
    name: t.name,
    countryCode: FALLBACK_CC,
    countryName: FALLBACK_CN,
    logoDataUrl: t.logoDataUrl ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export function savePetanqueTeams(list: PetanqueTeam[]) {
  // Conserve les autres sports, remplace uniquement la pétanque,
  // et déduplique par id.
  const existingNonPetanque = loadTeams().filter((t) => t.sport !== "petanque");

  const ts = now();
  const mapped: TeamEntity[] = (list ?? [])
    .filter(Boolean)
    .map((t) => ({
      id: String(t.id || makeTeamId("petanque")),
      sport: "petanque" as const,
      name: String(t.name || "").trim() || "Équipe",
      logoDataUrl: t.logoDataUrl ?? null,
      createdAt: Number(t.createdAt || ts),
      updatedAt: Number(t.updatedAt || ts),
    }));

  saveTeams(dedupeById([...mapped, ...existingNonPetanque]));
}

export function createPetanqueTeam(partial?: Partial<PetanqueTeam>): PetanqueTeam {
  const ts = now();
  return {
    id: partial?.id ?? makeTeamId("petanque"),
    name: (partial?.name ?? "Nouvelle équipe").trim(),
    countryCode: partial?.countryCode ?? FALLBACK_CC,
    countryName: partial?.countryName ?? FALLBACK_CN,
    logoDataUrl: partial?.logoDataUrl ?? null,
    createdAt: partial?.createdAt ?? ts,
    updatedAt: partial?.updatedAt ?? ts,
  };
}

export function upsertPetanqueTeam(team: PetanqueTeam) {
  const ts = now();

  const next = upsertTeam({
    id: team.id || makeTeamId("petanque"),
    sport: "petanque",
    name: (team.name ?? "").trim() || "Équipe",
    logoDataUrl: team.logoDataUrl ?? null,
    createdAt: team.createdAt ?? ts,
    updatedAt: team.updatedAt ?? ts,
  });

  // Retour au format PetanqueTeam
  const out: PetanqueTeam = {
    id: next.id,
    name: next.name,
    countryCode: team.countryCode ?? FALLBACK_CC,
    countryName: team.countryName ?? FALLBACK_CN,
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
      countryCode: FALLBACK_CC,
      countryName: FALLBACK_CN,
      logoDataUrl: t.logoDataUrl ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })) as PetanqueTeam[];
}
