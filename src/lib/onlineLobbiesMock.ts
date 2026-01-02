// ============================================
// src/lib/onlineLobbiesMock.ts
// Salons online — mock localStorage (A1)
// - Crée / rejoint / liste des salons X01
// - AUCUN réseau réel, tout est stocké en local
// - Servira de base pour le vrai backend plus tard
// ============================================

/** Clé localStorage pour les salons */
const LS_LOBBIES_KEY = "dc_online_lobbies_v1";

/** Type minimal pour un salon online (mock) */
export type OnlineLobby = {
  id: string;           // identifiant interne
  code: string;         // code partagé (ex : "4F9Q")
  mode: "x01";          // pour l’instant uniquement X01
  hostProfileId: string | null;
  hostName: string;
  createdAt: number;
};

/* ------------ Helpers localStorage ------------ */

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadLobbies(): OnlineLobby[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LS_LOBBIES_KEY);
  return safeParse<OnlineLobby[]>(raw, []);
}

function saveLobbies(list: OnlineLobby[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_LOBBIES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/* ------------ Génération de code salon ------------ */

function generateLobbyCode(existing: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/1 pour éviter les confusions
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      code += alphabet[idx];
    }
    if (!existing.has(code)) return code;
  }
  // fallback ultra rare
  return (
    "X" +
    Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")
  );
}

/* ------------ API mock salons ------------ */

/**
 * Crée un nouveau salon X01 en local.
 */
export async function createLobby(opts: {
  hostProfileId: string | null;
  hostName: string;
}): Promise<OnlineLobby> {
  const all = loadLobbies();
  const existingCodes = new Set(all.map((l) => l.code));

  const lobby: OnlineLobby = {
    id: "lob_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    code: generateLobbyCode(existingCodes),
    mode: "x01",
    hostProfileId: opts.hostProfileId,
    hostName: opts.hostName || "Joueur",
    createdAt: Date.now(),
  };

  all.unshift(lobby);
  saveLobbies(all);

  return lobby;
}

/**
 * Rejoint un salon par code (insensible à la casse).
 * Pour l’instant, on se contente de renvoyer le salon trouvé.
 */
export async function joinLobbyByCode(code: string): Promise<OnlineLobby | null> {
  const all = loadLobbies();
  const target = code.trim().toUpperCase();
  const lobby =
    all.find((l) => l.code.toUpperCase() === target) ?? null;
  return lobby;
}

/**
 * Liste des salons existants (mock).
 * `limit` permet de ne pas renvoyer une liste infinie.
 */
export async function listLobbies(limit = 20): Promise<OnlineLobby[]> {
  const all = loadLobbies();
  return all.slice(0, limit);
}

/**
 * Efface tous les salons (pratique pour debug).
 */
export async function clearLobbies(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_LOBBIES_KEY);
  } catch {
    // ignore
  }
}
