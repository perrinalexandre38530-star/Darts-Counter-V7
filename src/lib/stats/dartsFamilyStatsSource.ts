/**
 * Projection lecture-seule History V4 -> statistiques des familles de jeux.
 * CHASE partage les statistiques des 5 vies, SPLIT SCORE reste distinct de
 * HALVE-IT malgré le moteur commun. Ne jamais muter le record historique.
 */
import { dartsFamilyHistoryKey } from "../historyDartsVariants";

export type DartsFamilyStatsMode = "five_lives" | "halve_it" | "split_score";

export function dartsFamilyStatsMode(record: unknown): DartsFamilyStatsMode | null {
  const key = dartsFamilyHistoryKey(record);
  if (key === "chase" || key === "five_lives") return "five_lives";
  return key === "halve_it" || key === "split_score" ? key : null;
}

/** History.list() peut masquer variantId : ouvrir le détail HALVE-IT aussi
 * lorsque l'onglet SPLIT SCORE est actif, puis classifier le record complet. */
export function shouldHydrateFamilyHistoryForStats(record: unknown, focusedMode: string | null | undefined): boolean {
  const family = dartsFamilyStatsMode(record);
  if (focusedMode === "split_score") return family === "halve_it" || family === "split_score";
  if (focusedMode === "five_lives") return family === "five_lives";
  return false;
}

function normId(v: unknown): string {
  return String(v ?? "").trim().replace(/^online:/i, "");
}
function normName(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Ne pas fusionner deux joueurs homonymes porteurs d'identifiants distincts.
 * Les lignes héritées réellement sans identifiant gardent le secours par nom. */
export function dartsStatsRowMatchesProfile(row: unknown, playerId: string | null | undefined, playerName?: string | null): boolean {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const r = row as Record<string, any>;
  const identities = [r.id, r.playerId, r.profileId, r.pid, r.selectedPlayerId]
    .map(normId).filter(Boolean);
  const sought = normId(playerId);
  if (sought && identities.includes(sought)) return true;
  if (identities.length) return false;
  const name = normName(playerName);
  return !!name && [r.name, r.playerName, r.displayName, r.nickname, r.profileName]
    .some((candidate) => normName(candidate) === name);
}

export function isDartsFamilyDraw(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, any>;
  return r.tied === true || r.summary?.tied === true || r.payload?.tied === true || r.payload?.summary?.tied === true;
}
