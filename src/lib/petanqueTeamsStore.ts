// =============================================================
// src/lib/petanqueTeamsStore.ts
// Store local "Teams" dédié à la Pétanque (NE TOUCHE PAS aux bots Darts)
// - CRUD équipes (nom, pays, logo)
// - Persistance localStorage
// =============================================================

export type PetanqueTeam = {
    id: string;
    name: string;
    countryCode?: string; // ex: "FR"
    countryName?: string; // ex: "France"
    logoDataUrl?: string | null; // image (data-uri) optionnelle
    createdAt: number;
    updatedAt: number;
  };
  
  const LS_KEY = "bsc-petanque-teams-v1";
  
  function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  
  export function loadPetanqueTeams(): PetanqueTeam[] {
    return safeParse<PetanqueTeam[]>(localStorage.getItem(LS_KEY), []);
  }
  
  export function savePetanqueTeams(list: PetanqueTeam[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }
  
  export function createPetanqueTeam(partial?: Partial<PetanqueTeam>): PetanqueTeam {
    const now = Date.now();
    return {
      id: partial?.id ?? `team-${now}-${Math.random().toString(16).slice(2)}`,
      name: partial?.name ?? "Nouvelle équipe",
      countryCode: partial?.countryCode ?? "FR",
      countryName: partial?.countryName ?? "France",
      logoDataUrl: partial?.logoDataUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }
  
  export function upsertPetanqueTeam(team: PetanqueTeam) {
    const list = loadPetanqueTeams();
    const idx = list.findIndex((t) => t.id === team.id);
    const next = { ...team, updatedAt: Date.now() };
  
    if (idx >= 0) list[idx] = next;
    else list.unshift(next);
  
    savePetanqueTeams(list);
    return next;
  }
  
  export function deletePetanqueTeam(teamId: string) {
    const list = loadPetanqueTeams().filter((t) => t.id !== teamId);
    savePetanqueTeams(list);
    return list;
  }
  