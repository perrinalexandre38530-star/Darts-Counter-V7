// =============================================================
// src/lib/petanqueTeamsStore.ts
// Store unique "Teams" (localStorage) pour Pétanque (et extensible multi-sport)
// - CRUD équipes (nom, logo)
// - Persistance localStorage
//
// ✅ Intègre le store "unique Teams" (TeamEntity / TeamSport)
// ✅ Garde des exports rétro-compatibles pour l'ancien code Pétanque
// =============================================================

import { getTeamAvatarUrl } from "../assets/teamAvatars";
import { getTeamLogoTemplateBySrc, resolveTeamLogoSrc } from "../assets/teamLogoLibrary";
import { fileToCompressedImageDataUrl, sanitizeStoredImage, setJsonWithQuotaRecovery } from "./teamImageStorage";

export type TeamSport = string;

export type TeamEntity = {
  id: string;
  sport: TeamSport;
  /** Sports associés : si allSports=true, l’équipe apparaît partout. Sinon sportIds contient les sports autorisés. */
  allSports?: boolean;
  sportIds?: TeamSport[];
  name: string;
  logoDataUrl?: string | null; // dataURL local ou URL média NAS (compat UI)
  logoUrl?: string | null;
  logoAssetId?: string | null;
  logoLibraryId?: string | null;
  logoLibraryFileName?: string | null;
  logoMediaAssetId?: string | null;
  teamLogoAssetId?: string | null;
  avatarUrl?: string | null;
  avatarAssetId?: string | null;
  imageUrl?: string | null;
  imageAssetId?: string | null;
  logoSha256?: string | null;
  /** Logo choisi dans la bibliothèque interne: stable entre builds/appareils/NAS. */
  logoLibraryId?: string | null;
  logoLibraryFileName?: string | null;

  // ---------------------------
  // Champs étendus (optionnels)
  // - Utilisés aujourd'hui par la Pétanque
  // - Ignorés par les autres sports
  // ---------------------------
  countryCode?: string; // ex: "FR"
  countryName?: string; // ex: "France"
  regionCode?: string; // ex: "FR-IDF"
  regionName?: string; // ex: "Île-de-France"
  regionLogoDataUrl?: string | null;
  regionLogoUrl?: string | null;
  regionLogoAssetId?: string | null;
  regionLogoSha256?: string | null;
  coverDataUrl?: string | null;
  coverUrl?: string | null;
  coverAssetId?: string | null;
  coverSha256?: string | null;
  slogan?: string; // 50 chars max (UI)
  description?: string;
  playerIds?: string[]; // ids de profiles locaux

  /** Type d’équipe : loisir = local/privé, club = synchronisable Online/Club. */
  teamKind?: "leisure" | "club";
  clubId?: string | null;
  clubName?: string | null;
  clubRole?: string | null;
  clubVisibility?: "private" | "members" | "public" | string | null;
  syncedClubTeamId?: string | null;

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
  allSports?: boolean;
  sportIds?: TeamSport[];
  countryCode?: string; // ex: "FR"
  countryName?: string; // ex: "France"
  regionCode?: string;
  regionName?: string;
  regionLogoDataUrl?: string | null;
  slogan?: string;
  description?: string;
  playerIds?: string[];
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  logoLibraryId?: string | null;
  logoLibraryFileName?: string | null;
  teamKind?: "leisure" | "club";
  clubId?: string | null;
  clubName?: string | null;
  clubRole?: string | null;
  clubVisibility?: "private" | "members" | "public" | string | null;
  syncedClubTeamId?: string | null;
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
  const raw = String(s || "generic").toLowerCase().trim();
  if (!raw) return "generic";
  if (raw === "baby-foot" || raw === "baby_foot" || raw === "foosball") return "babyfoot";
  if (raw === "ping-pong" || raw === "tabletennis" || raw === "table_tennis") return "pingpong";
  if (raw === "dice" || raw === "dice_game") return "dicegame";
  return raw;
}

function normalizeSportIds(value: any, fallbackSport?: any): TeamSport[] {
  const raw = Array.isArray(value) ? value : [];
  const out = raw.map(normalizeSport).filter(Boolean);
  const fallback = normalizeSport(fallbackSport);
  if (out.length === 0 && fallback) out.push(fallback);
  return Array.from(new Set(out));
}

function teamMatchesSport(team: Pick<TeamEntity, "sport" | "allSports" | "sportIds">, sport: TeamSport): boolean {
  const s = normalizeSport(sport);
  if ((team as any).allSports === true) return true;
  const ids = normalizeSportIds((team as any).sportIds, (team as any).sport);
  return ids.includes(s) || normalizeSport((team as any).sport) === s;
}

function normalizeTextField(value: any): string | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s || undefined;
}

function normalizeImageRef(...values: any[]): string | null {
  for (const value of values) {
    const dataUrl = sanitizeStoredImage(value);
    if (dataUrl) return dataUrl;
    const s = typeof value === "string" ? value.trim() : "";
    if (!s) continue;
    if (/^https?:\/\//i.test(s) || s.startsWith("/media/") || s.startsWith("/assets/") || /\/(media|assets)\//.test(s)) return s;
  }
  return null;
}

function normalizeTeamEntity(t: any): TeamEntity | null {
  if (!t || typeof t !== "object") return null;
  const id = typeof t.id === "string" ? t.id : "";
  const name = typeof t.name === "string" ? t.name.trim() : "";
  if (!id || !name) return null;

  const createdAt = Number(t.createdAt ?? 0) || 0;
  const updatedAt = Number(t.updatedAt ?? 0) || 0;

  const countryCode = typeof t.countryCode === "string" ? t.countryCode.toUpperCase().slice(0, 2) : undefined;
  const countryName = typeof t.countryName === "string" ? t.countryName : undefined;
  const regionCode = typeof t.regionCode === "string" ? t.regionCode : undefined;
  const regionName = typeof t.regionName === "string" ? t.regionName : undefined;
  const inputLogoLibraryId = normalizeTextField(t.logoLibraryId || t.logoTemplateId || t.libraryLogoId || t.logoId);
  const inputLogoLibraryFileName = normalizeTextField(t.logoLibraryFileName || t.logoFileName || t.fileName);
  const libraryFromSrc = getTeamLogoTemplateBySrc(t.logoDataUrl || t.logoUrl || t.avatarUrl || t.imageUrl || t.logo);
  const logoLibraryId = inputLogoLibraryId || libraryFromSrc?.id || null;
  const logoLibraryFileName = inputLogoLibraryFileName || libraryFromSrc?.fileName || null;
  const libraryLogoSrc = resolveTeamLogoSrc(logoLibraryId || logoLibraryFileName || null);
  const logoUrl = normalizeTextField(libraryLogoSrc || t.logoUrl || t.avatarUrl || t.imageUrl || t.logo);
  const logoAssetId = normalizeTextField(t.logoAssetId || t.logoMediaAssetId || t.teamLogoAssetId || t.avatarAssetId || t.imageAssetId);
  const regionLogoUrl = normalizeTextField(t.regionLogoUrl);
  const regionLogoAssetId = normalizeTextField(t.regionLogoAssetId);
  const coverUrl = normalizeTextField(t.coverUrl);
  const coverAssetId = normalizeTextField(t.coverAssetId);
  const regionLogoDataUrl = normalizeImageRef(t.regionLogoDataUrl, t.regionLogoUrl);
  const slogan = typeof t.slogan === "string" ? t.slogan : undefined;
  const description = typeof t.description === "string" ? t.description : undefined;
  const playerIds = Array.isArray(t.playerIds) ? t.playerIds.filter((x: any) => typeof x === "string") : undefined;
  const teamKind = String(t.teamKind || t.kind || t.scope || "leisure").toLowerCase() === "club" ? "club" : "leisure";

  return {
    id,
    sport: normalizeSport(t.sport),
    allSports: t.allSports === true,
    sportIds: normalizeSportIds(t.sportIds, t.sport),
    name,
    logoDataUrl: normalizeImageRef(t.logoDataUrl, libraryLogoSrc, t.logoUrl, t.avatarUrl, t.imageUrl, t.logo),
    logoUrl: logoUrl ?? null,
    logoLibraryId,
    logoLibraryFileName,
    logoAssetId: logoAssetId ?? null,
    logoMediaAssetId: normalizeTextField(t.logoMediaAssetId || logoAssetId) ?? null,
    teamLogoAssetId: normalizeTextField(t.teamLogoAssetId || logoAssetId) ?? null,
    avatarUrl: normalizeTextField(t.avatarUrl || logoUrl) ?? null,
    avatarAssetId: normalizeTextField(t.avatarAssetId || logoAssetId) ?? null,
    imageUrl: normalizeTextField(t.imageUrl || logoUrl) ?? null,
    imageAssetId: normalizeTextField(t.imageAssetId || logoAssetId) ?? null,
    logoSha256: normalizeTextField(t.logoSha256 || t.logoHash || t.avatarSha256) ?? null,
    countryCode,
    countryName,
    regionCode,
    regionName,
    regionLogoDataUrl,
    regionLogoUrl: regionLogoUrl ?? null,
    regionLogoAssetId: regionLogoAssetId ?? null,
    regionLogoSha256: normalizeTextField(t.regionLogoSha256 || t.regionLogoHash) ?? null,
    coverDataUrl: normalizeImageRef(t.coverDataUrl, t.coverUrl),
    coverUrl: coverUrl ?? null,
    coverAssetId: coverAssetId ?? null,
    coverSha256: normalizeTextField(t.coverSha256 || t.coverHash) ?? null,
    slogan,
    description,
    playerIds,
    teamKind,
    clubId: normalizeTextField(t.clubId) ?? null,
    clubName: normalizeTextField(t.clubName) ?? null,
    clubRole: normalizeTextField(t.clubRole) ?? null,
    clubVisibility: normalizeTextField(t.clubVisibility || "members") ?? "members",
    syncedClubTeamId: normalizeTextField(t.syncedClubTeamId || t.clubTeamId) ?? null,
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
//         logoDataUrl: sanitizeStoredImage(t.logoDataUrl),
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
  setJsonWithQuotaRecovery(STORAGE_KEY, clean, (teams: TeamEntity[]) =>
    (teams || []).map((t: any) => ({
      ...t,
      logoDataUrl: null,
      regionLogoDataUrl: null,
      coverDataUrl: null,
    }))
  );
  try { window.dispatchEvent(new Event("dc-teams-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc:teams-changed")); } catch {}
}

export function upsertTeam(team: TeamEntity) {
  const list = loadTeams();
  const idx = list.findIndex((t) => t.id === team.id);

  const ts = now();
  const libraryFromSrc = getTeamLogoTemplateBySrc((team as any).logoDataUrl || (team as any).logoUrl || (team as any).avatarUrl || (team as any).imageUrl || (team as any).logo);
  const logoLibraryId = normalizeTextField((team as any).logoLibraryId || (team as any).logoTemplateId || libraryFromSrc?.id) ?? null;
  const logoLibraryFileName = normalizeTextField((team as any).logoLibraryFileName || (team as any).logoFileName || libraryFromSrc?.fileName) ?? null;
  const libraryLogoSrc = resolveTeamLogoSrc(logoLibraryId || logoLibraryFileName || null);

  const next: TeamEntity = {
    ...team,
    id: String(team.id || makeTeamId(team.sport || "team")),
    name: (team.name ?? "").trim(),
    updatedAt: ts,
    createdAt: Number(team.createdAt ?? 0) || ts,
    logoDataUrl: normalizeImageRef(team.logoDataUrl, libraryLogoSrc, (team as any).logoUrl, (team as any).avatarUrl, (team as any).imageUrl),
    logoUrl: normalizeTextField(libraryLogoSrc || (team as any).logoUrl || (team as any).avatarUrl || (team as any).imageUrl) ?? null,
    logoLibraryId,
    logoLibraryFileName,
    logoAssetId: normalizeTextField((team as any).logoAssetId || (team as any).logoMediaAssetId || (team as any).teamLogoAssetId || (team as any).avatarAssetId || (team as any).imageAssetId) ?? null,
    sport: normalizeSport(team.sport),
    allSports: (team as any).allSports === true,
    sportIds: normalizeSportIds((team as any).sportIds, team.sport),

    // Champs étendus
    countryCode: typeof team.countryCode === "string" ? team.countryCode.toUpperCase().slice(0, 2) : team.countryCode,
    countryName: typeof team.countryName === "string" ? team.countryName : team.countryName,
    regionCode: typeof team.regionCode === "string" ? team.regionCode : team.regionCode,
    regionName: typeof team.regionName === "string" ? team.regionName : team.regionName,
    regionLogoDataUrl: normalizeImageRef((team as any).regionLogoDataUrl, (team as any).regionLogoUrl),
    regionLogoUrl: normalizeTextField((team as any).regionLogoUrl) ?? null,
    regionLogoAssetId: normalizeTextField((team as any).regionLogoAssetId) ?? null,
    coverDataUrl: normalizeImageRef((team as any).coverDataUrl, (team as any).coverUrl),
    coverUrl: normalizeTextField((team as any).coverUrl) ?? null,
    coverAssetId: normalizeTextField((team as any).coverAssetId) ?? null,
    slogan: typeof (team as any).slogan === "string" ? (team as any).slogan : (team as any).slogan,
    description: typeof (team as any).description === "string" ? (team as any).description : (team as any).description,
    playerIds: Array.isArray((team as any).playerIds) ? (team as any).playerIds.filter((x: any) => typeof x === "string") : (team as any).playerIds,
    teamKind: String((team as any).teamKind || "leisure").toLowerCase() === "club" ? "club" : "leisure",
    clubId: normalizeTextField((team as any).clubId) ?? null,
    clubName: normalizeTextField((team as any).clubName) ?? null,
    clubRole: normalizeTextField((team as any).clubRole) ?? null,
    clubVisibility: normalizeTextField((team as any).clubVisibility || "members") ?? "members",
    syncedClubTeamId: normalizeTextField((team as any).syncedClubTeamId || (team as any).clubTeamId) ?? null,
  };

  // Ne pas réinjecter "Team" ici : pendant l'édition, un champ nom vide doit rester vide
  // sinon la dernière lettre effacée fait réapparaître automatiquement "Équipe" / "Team".
  if (!next.name && idx < 0) next.name = "Team";

  if (idx >= 0) list[idx] = next;
  else list.unshift(next);

  saveTeams(list);
  return next;
}

export function createTeam(input: { sport: TeamSport; name: string; logoDataUrl?: string | null; allSports?: boolean; sportIds?: TeamSport[]; teamKind?: "leisure" | "club"; clubName?: string | null; clubId?: string | null }): TeamEntity {
  const ts = now();
  const t: TeamEntity = {
    id: makeTeamId(input.sport),
    sport: normalizeSport(input.sport),
    allSports: input.allSports === true,
    sportIds: normalizeSportIds(input.sportIds, input.sport),
    name: (input.name ?? "").trim(),
    logoDataUrl: normalizeImageRef(input.logoDataUrl),
    logoLibraryId: getTeamLogoTemplateBySrc(input.logoDataUrl)?.id ?? null,
    logoLibraryFileName: getTeamLogoTemplateBySrc(input.logoDataUrl)?.fileName ?? null,
    teamKind: input.teamKind === "club" ? "club" : "leisure",
    clubName: normalizeTextField(input.clubName) ?? null,
    clubId: normalizeTextField(input.clubId) ?? null,
    clubVisibility: "members",
    createdAt: ts,
    updatedAt: ts,
  };
  if (!t.name) t.name = "Team";
  upsertTeam(t);
  return t;
}

export function updateTeam(
  teamId: string,
  patch: Partial<Pick<TeamEntity, "name" | "logoDataUrl" | "sport" | "allSports" | "sportIds">>
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
    allSports: patch.allSports ?? prev.allSports,
    sportIds: normalizeSportIds(patch.sportIds ?? prev.sportIds, patch.sport ?? prev.sport),
    logoDataUrl: normalizeImageRef(patch.logoDataUrl ?? prev.logoDataUrl, resolveTeamLogoSrc((patch as any).logoLibraryId || (prev as any).logoLibraryId || null), (patch as any).logoUrl ?? (prev as any).logoUrl),
    logoLibraryId: (patch as any).logoLibraryId ?? (prev as any).logoLibraryId ?? getTeamLogoTemplateBySrc(patch.logoDataUrl ?? prev.logoDataUrl)?.id ?? null,
    logoLibraryFileName: (patch as any).logoLibraryFileName ?? (prev as any).logoLibraryFileName ?? getTeamLogoTemplateBySrc(patch.logoDataUrl ?? prev.logoDataUrl)?.fileName ?? null,
    updatedAt: now(),
  };

  // Laisser le nom vide pendant la saisie; les écrans d'affichage ont déjà leurs fallbacks.
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
  return loadTeams().filter((t) => teamMatchesSport(t, s));
}

// ---------------------------
// DataURL helper (logo upload)
// ---------------------------
export function fileToDataUrl(file: File): Promise<string> {
  return fileToCompressedImageDataUrl(file, { maxSize: 256, quality: 0.78 });
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
    allSports: t.allSports === true,
    sportIds: normalizeSportIds(t.sportIds, t.sport),
    countryCode: t.countryCode ?? FALLBACK_CC,
    countryName: t.countryName ?? FALLBACK_CN,
    regionCode: t.regionCode ?? "",
    regionName: t.regionName ?? "",
    regionLogoDataUrl: t.regionLogoDataUrl ?? t.regionLogoUrl ?? null,
    slogan: t.slogan ?? "",
    description: t.description ?? "",
    playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
    logoDataUrl: normalizeImageRef(t.logoDataUrl, t.logoUrl, t.avatarUrl, t.imageUrl),
    logoUrl: t.logoUrl ?? t.avatarUrl ?? t.imageUrl ?? null,
    logoAssetId: t.logoAssetId ?? t.logoMediaAssetId ?? t.teamLogoAssetId ?? t.avatarAssetId ?? t.imageAssetId ?? null,
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
      logoDataUrl: normalizeImageRef(t.logoDataUrl, (t as any).logoUrl),
      logoUrl: normalizeTextField((t as any).logoUrl) ?? null,
      logoAssetId: normalizeTextField((t as any).logoAssetId) ?? null,
      countryCode: (t.countryCode ?? FALLBACK_CC).toUpperCase().slice(0, 2),
      countryName: t.countryName ?? FALLBACK_CN,
      regionCode: t.regionCode ?? "",
      regionName: t.regionName ?? "",
      regionLogoDataUrl: normalizeImageRef(t.regionLogoDataUrl, (t as any).regionLogoUrl),
      regionLogoUrl: normalizeTextField((t as any).regionLogoUrl) ?? null,
      regionLogoAssetId: normalizeTextField((t as any).regionLogoAssetId) ?? null,
      slogan: t.slogan ?? "",
      description: t.description ?? "",
      playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
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
    regionCode: partial?.regionCode ?? "FR-IDF",
    regionName: partial?.regionName ?? "Île-de-France",
    regionLogoDataUrl: normalizeImageRef(partial?.regionLogoDataUrl, (partial as any)?.regionLogoUrl),
    slogan: partial?.slogan ?? "",
    description: partial?.description ?? "",
    playerIds: Array.isArray(partial?.playerIds) ? partial?.playerIds : [],
    logoDataUrl: normalizeImageRef(partial?.logoDataUrl, (partial as any)?.logoUrl),
    logoUrl: normalizeTextField((partial as any)?.logoUrl) ?? null,
    logoAssetId: normalizeTextField((partial as any)?.logoAssetId) ?? null,
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
    logoDataUrl: normalizeImageRef(team.logoDataUrl, (team as any).logoUrl),
    logoUrl: normalizeTextField((team as any).logoUrl) ?? null,
    logoAssetId: normalizeTextField((team as any).logoAssetId) ?? null,
    countryCode: (team.countryCode ?? FALLBACK_CC).toUpperCase().slice(0, 2),
    countryName: team.countryName ?? FALLBACK_CN,
    regionCode: team.regionCode ?? "",
    regionName: team.regionName ?? "",
    regionLogoDataUrl: normalizeImageRef(team.regionLogoDataUrl, (team as any).regionLogoUrl),
    regionLogoUrl: normalizeTextField((team as any).regionLogoUrl) ?? null,
    regionLogoAssetId: normalizeTextField((team as any).regionLogoAssetId) ?? null,
    slogan: team.slogan ?? "",
    description: team.description ?? "",
    playerIds: Array.isArray(team.playerIds) ? team.playerIds : [],
    createdAt: team.createdAt ?? ts,
    updatedAt: team.updatedAt ?? ts,
  });

  // Retour au format PetanqueTeam
  const out: PetanqueTeam = {
    id: next.id,
    name: next.name,
    countryCode: next.countryCode ?? team.countryCode ?? FALLBACK_CC,
    countryName: next.countryName ?? team.countryName ?? FALLBACK_CN,
    regionCode: next.regionCode ?? team.regionCode ?? "",
    regionName: next.regionName ?? team.regionName ?? "",
    regionLogoDataUrl: next.regionLogoDataUrl ?? team.regionLogoDataUrl ?? null,
    slogan: next.slogan ?? team.slogan ?? "",
    description: next.description ?? team.description ?? "",
    playerIds: Array.isArray(next.playerIds) ? next.playerIds : Array.isArray(team.playerIds) ? team.playerIds : [],
    logoDataUrl: next.logoDataUrl ?? next.logoUrl ?? null,
    logoUrl: next.logoUrl ?? null,
    logoAssetId: next.logoAssetId ?? next.logoMediaAssetId ?? next.teamLogoAssetId ?? next.avatarAssetId ?? next.imageAssetId ?? null,
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
      countryCode: t.countryCode ?? FALLBACK_CC,
      countryName: t.countryName ?? FALLBACK_CN,
      regionCode: t.regionCode ?? "",
      regionName: t.regionName ?? "",
      regionLogoDataUrl: normalizeImageRef(t.regionLogoDataUrl, (t as any).regionLogoUrl),
      slogan: t.slogan ?? "",
      description: t.description ?? "",
      playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
      logoDataUrl: normalizeImageRef(t.logoDataUrl, (t as any).logoUrl, (t as any).avatarUrl, (t as any).imageUrl),
      logoUrl: (t as any).logoUrl ?? (t as any).avatarUrl ?? (t as any).imageUrl ?? null,
      logoAssetId: (t as any).logoAssetId ?? (t as any).logoMediaAssetId ?? (t as any).teamLogoAssetId ?? (t as any).avatarAssetId ?? (t as any).imageAssetId ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })) as PetanqueTeam[];
}

// ---------------------------------------------------------------------
// Baby-Foot (store unique) — CRUD (même format que Pétanque)
// ---------------------------------------------------------------------
export type BabyFootTeam = {
  id: string;
  name: string;
  allSports?: boolean;
  sportIds?: TeamSport[];
  countryCode?: string;
  countryName?: string;
  regionCode?: string;
  regionName?: string;
  regionLogoDataUrl?: string | null;
  slogan?: string;
  description?: string;
  playerIds?: string[];
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  logoLibraryId?: string | null;
  logoLibraryFileName?: string | null;
  teamKind?: "leisure" | "club";
  clubId?: string | null;
  clubName?: string | null;
  clubRole?: string | null;
  clubVisibility?: "private" | "members" | "public" | string | null;
  syncedClubTeamId?: string | null;
  createdAt: number;
  updatedAt: number;
};


// ---------------------------------------------------------------------
// Baby-Foot — seeds "teams par défaut" (TEAM GOLD / PINK / GREEN / BLUE)
// - Ajoutés uniquement si absents (ne remplace rien)
// - Logos résolus via src/assets/teamAvatars.ts (assets locaux si dispo, sinon SVG fallback)
// ---------------------------------------------------------------------
const DEFAULT_BABYFOOT_TEAMS: Array<{ id: string; name: string; skin: "gold" | "pink" | "green" | "blue" }> = [
  { id: "bf-team-gold", name: "TEAM GOLD", skin: "gold" },
  { id: "bf-team-pink", name: "TEAM PINK", skin: "pink" },
  { id: "bf-team-green", name: "TEAM GREEN", skin: "green" },
  { id: "bf-team-blue", name: "TEAM BLUE", skin: "blue" },
];

function getDefaultBabyFootTeamLogo(teamId?: any, teamName?: any): string | null {
  const id = String(teamId || "").trim();
  const normalizedName = String(teamName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const def = DEFAULT_BABYFOOT_TEAMS.find((team) => team.id === id || team.name.toLowerCase() === normalizedName);
  return def ? getTeamAvatarUrl(def.skin) : null;
}

function ensureDefaultBabyFootTeams(): void {
  const existing = loadTeamsBySport("babyfoot");
  const existingIds = new Set(existing.map((t) => t.id));

  let changed = false;
  const list = loadTeams();

  for (const def of DEFAULT_BABYFOOT_TEAMS) {
    if (existingIds.has(def.id)) continue;

    const ts = now();
    list.push({
      id: def.id,
      sport: "babyfoot",
      name: def.name,
      logoDataUrl: getTeamAvatarUrl(def.skin),
      createdAt: ts,
      updatedAt: ts,
    });

    changed = true;
  }

  if (changed) saveTeams(list);
}

export function loadBabyFootTeams(): BabyFootTeam[] {
  ensureDefaultBabyFootTeams();
  const list = loadTeamsBySport("babyfoot");
  return list.map((t: any) => ({
    id: t.id,
    name: t.name,
    allSports: t.allSports === true,
    sportIds: normalizeSportIds(t.sportIds, t.sport),
    countryCode: t.countryCode ?? "FR",
    countryName: t.countryName ?? "France",
    regionCode: t.regionCode ?? "",
    regionName: t.regionName ?? "",
    regionLogoDataUrl: normalizeImageRef(t.regionLogoDataUrl, (t as any).regionLogoUrl),
    slogan: t.slogan ?? "",
    description: t.description ?? "",
    playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
    logoDataUrl: normalizeImageRef(t.logoDataUrl, (t as any).logoUrl, (t as any).avatarUrl, (t as any).imageUrl, getDefaultBabyFootTeamLogo(t.id, t.name)),
    logoUrl: (t as any).logoUrl ?? (t as any).avatarUrl ?? (t as any).imageUrl ?? getDefaultBabyFootTeamLogo(t.id, t.name),
    logoAssetId: (t as any).logoAssetId ?? (t as any).logoMediaAssetId ?? (t as any).teamLogoAssetId ?? (t as any).avatarAssetId ?? (t as any).imageAssetId ?? null,
    createdAt: Number(t.createdAt || now()),
    updatedAt: Number(t.updatedAt || now()),
  }));
}

export function createBabyFootTeam(partial?: Partial<BabyFootTeam>): BabyFootTeam {
  const ts = now();
  return {
    id: partial?.id ?? makeTeamId("babyfoot"),
    name: (partial?.name ?? "Nouvelle équipe").trim(),
    countryCode: partial?.countryCode ?? "FR",
    countryName: partial?.countryName ?? "France",
    regionCode: partial?.regionCode ?? "FR-IDF",
    regionName: partial?.regionName ?? "Île-de-France",
    regionLogoDataUrl: normalizeImageRef(partial?.regionLogoDataUrl, (partial as any)?.regionLogoUrl),
    slogan: (partial?.slogan ?? "").slice(0, 50),
    description: partial?.description ?? "",
    playerIds: Array.isArray(partial?.playerIds) ? partial!.playerIds : [],
    logoDataUrl: normalizeImageRef(partial?.logoDataUrl, (partial as any)?.logoUrl),
    logoUrl: normalizeTextField((partial as any)?.logoUrl) ?? null,
    logoAssetId: normalizeTextField((partial as any)?.logoAssetId) ?? null,
    createdAt: Number((partial as any)?.createdAt ?? 0) || ts,
    updatedAt: Number((partial as any)?.updatedAt ?? 0) || ts,
  };
}

export function upsertBabyFootTeam(team: BabyFootTeam) {
  const ts = now();
  upsertTeam({
    id: (team as any).id || makeTeamId("babyfoot"),
    sport: "babyfoot",
    name: String((team as any).name ?? "").trim() || "Équipe",
    logoDataUrl: normalizeImageRef((team as any).logoDataUrl, (team as any).logoUrl),
    logoUrl: normalizeTextField((team as any).logoUrl) ?? null,
    logoAssetId: normalizeTextField((team as any).logoAssetId) ?? null,

    countryCode: String((team as any).countryCode ?? "FR").toUpperCase().slice(0, 2),
    countryName: (team as any).countryName ?? "France",
    regionCode: (team as any).regionCode ?? "",
    regionName: (team as any).regionName ?? "",
    regionLogoDataUrl: normalizeImageRef((team as any).regionLogoDataUrl, (team as any).regionLogoUrl),
    regionLogoUrl: normalizeTextField((team as any).regionLogoUrl) ?? null,
    regionLogoAssetId: normalizeTextField((team as any).regionLogoAssetId) ?? null,
    slogan: typeof (team as any).slogan === "string" ? (team as any).slogan.slice(0, 50) : "",
    description: typeof (team as any).description === "string" ? (team as any).description : "",
    playerIds: Array.isArray((team as any).playerIds)
      ? (team as any).playerIds.filter((x: any) => typeof x === "string")
      : [],

    updatedAt: ts,
    createdAt: Number((team as any).createdAt ?? 0) || ts,
  } as any);
}

export function deleteBabyFootTeam(id: string) {
  deleteTeam(String(id || ""));
}
