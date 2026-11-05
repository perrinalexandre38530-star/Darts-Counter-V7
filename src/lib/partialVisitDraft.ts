/**
 * Brouillon *local* de volée en cours, non validée (TOP 10 / Morpion).
 * Cette donnée n'est ni un match ni un checkpoint History V4 et n'est jamais
 * utilisée pour calculer résultats, sauvegardes ou statistiques.
 */
export type PartialVisitMode = "top_10" | "tic_tac_toe";
export type PartialDart = { v: number; mult: 1 | 2 | 3 };
export type PartialVisitIdentity = {
  mode: PartialVisitMode;
  matchId: string;
  playerId: string;
  round: number;
  current: number;
  committedVisits: number;
  previousVisit: string;
};
export type PartialVisit = { darts: PartialDart[]; multiplier: 1 | 2 | 3 };

const KEY_PREFIX = "mss:unvalidated-visit:v1:";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function localStore(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

function key(id: PartialVisitIdentity): string {
  return KEY_PREFIX + id.mode + ":" + encodeURIComponent(id.matchId);
}

/** Deterministic fingerprint of the last already committed visit, not of UI drafts. */
export function previousVisitFingerprint(visits: unknown[]): string {
  const raw = JSON.stringify(visits.length ? visits[visits.length - 1] : null) ?? "null";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function validDart(d: unknown): d is PartialDart {
  if (!d || typeof d !== "object") return false;
  const { v, mult } = d as PartialDart;
  return Number.isInteger(v) && (v === 0 || v === 25 || (v >= 1 && v <= 20)) &&
    (mult === 1 || mult === 2 || mult === 3) &&
    (v !== 0 || mult === 1) && (v !== 25 || mult !== 3);
}

function validIdentity(i: PartialVisitIdentity): boolean {
  return (i.mode === "top_10" || i.mode === "tic_tac_toe") &&
    typeof i.matchId === "string" && i.matchId.length > 0 && i.matchId.length <= 256 &&
    typeof i.playerId === "string" && i.playerId.length > 0 &&
    Number.isInteger(i.round) && i.round >= 0 &&
    Number.isInteger(i.current) && i.current >= 0 &&
    Number.isInteger(i.committedVisits) && i.committedVisits >= 0 &&
    typeof i.previousVisit === "string";
}

/** Persist only 1–3 darts of the *current* human player's not-yet-validated visit. */
export function savePartialVisit(id: PartialVisitIdentity, darts: PartialDart[], multiplier: 1 | 2 | 3): boolean {
  const storage = localStore();
  if (!storage || !validIdentity(id)) return false;
  if (!darts.length) { clearPartialVisit(id); return true; }
  if (darts.length > 3 || !darts.every(validDart) || ![1, 2, 3].includes(multiplier)) return false;
  try {
    storage.setItem(key(id), JSON.stringify({ identity: id, darts, multiplier, storedAt: Date.now() }));
    return true;
  } catch { return false; } // Private mode / blocked storage / full quota: game remains playable.
}

/** Restore only if History's validated progress still matches the exact visit. */
export function loadPartialVisit(id: PartialVisitIdentity): PartialVisit | null {
  const storage = localStore();
  if (!storage || !validIdentity(id)) return null;
  let raw: string | null = null;
  try { raw = storage.getItem(key(id)); } catch { return null; }
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    const expected = id;
    const got = saved?.identity;
    const matches = !!got && (Object.keys(expected) as Array<keyof PartialVisitIdentity>)
      .every((k) => got[k] === expected[k]);
    if (matches && Number.isFinite(saved.storedAt) && saved.storedAt <= Date.now() &&
        Date.now() - saved.storedAt < MAX_AGE_MS &&
        Array.isArray(saved.darts) && saved.darts.length >= 1 && saved.darts.length <= 3 &&
        saved.darts.every(validDart) && [1, 2, 3].includes(saved.multiplier)) {
      return { darts: saved.darts.map((d: PartialDart) => ({ v: d.v, mult: d.mult })), multiplier: saved.multiplier };
    }
  } catch { /* malformed draft is not trusted */ }
  clearPartialVisit(id);
  return null;
}

export function clearPartialVisit(id: Pick<PartialVisitIdentity, "mode" | "matchId">): void {
  try { localStore()?.removeItem(KEY_PREFIX + id.mode + ":" + encodeURIComponent(id.matchId)); }
  catch { /* no-op */ }
}
