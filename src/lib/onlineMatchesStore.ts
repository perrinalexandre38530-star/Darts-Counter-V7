// ============================================
// src/lib/onlineMatchesStore.ts
// Cache local des matchs Online (mock ou réel)
// - Clé unique : dc_online_matches_v1
// - Utilisé par FriendsPage (historique) + StatsOnline
// ============================================

export const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

export type OnlineMatchLite = {
  id: string;
  mode: string; // ex: "x01", "cricket"...
  createdAt: number;
  finishedAt?: number;

  // Stats basiques (facultatives)
  darts?: number;
  totalScore?: number;
  avg3?: number;
  bestVisit?: number;
  bestCheckout?: number;

  // Buckets type "60+", "100+", "140+", "180"...
  buckets?: Record<string, number>;

  // Indicateur mock (pour plus tard distinguer backend réel)
  isMock?: boolean;

  // Métadonnées libres (adversaire, lobbyId, etc.)
  meta?: any;
};

function safeParse(raw: string | null): OnlineMatchLite[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OnlineMatchLite[];
  } catch {
    return [];
  }
}

export function loadOnlineMatches(): OnlineMatchLite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_ONLINE_MATCHES_KEY);
    return safeParse(raw);
  } catch {
    return [];
  }
}

export function saveOnlineMatches(list: OnlineMatchLite[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Ajoute un match Online dans le cache local.
 * Retourne le match "normalisé".
 */
export function addOnlineMatch(
  input: Omit<OnlineMatchLite, "id" | "createdAt"> & {
    id?: string;
    createdAt?: number;
  }
): OnlineMatchLite {
  const now = Date.now();
  const id =
    input.id ||
    `online-${now}-${Math.random().toString(36).slice(2, 8)}`;

  const match: OnlineMatchLite = {
    id,
    mode: input.mode || "x01",
    createdAt: input.createdAt ?? now,
    finishedAt: input.finishedAt ?? now,
    darts: input.darts ?? 0,
    totalScore: input.totalScore ?? 0,
    avg3: input.avg3 ?? 0,
    bestVisit: input.bestVisit ?? 0,
    bestCheckout: input.bestCheckout ?? 0,
    buckets: input.buckets ?? {},
    isMock: input.isMock ?? true,
    meta: input.meta ?? {},
  };

  const list = loadOnlineMatches();
  // on met le plus récent au début
  const next = [match, ...list].slice(0, 200); // hard limit 200
  saveOnlineMatches(next);

  return match;
}

/** Dev util : reset complet (si besoin). */
export function clearOnlineMatches() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_ONLINE_MATCHES_KEY);
  } catch {
    // ignore
  }
}
