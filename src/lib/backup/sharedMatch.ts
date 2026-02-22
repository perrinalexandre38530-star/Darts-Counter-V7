// src/lib/backup/sharedMatch.ts
// ============================================
// Export "léger" d'une seule partie pour partage (Bluetooth / Mail / etc.)
// Contenu : match (History) + profils/dartsets référencés (best-effort)
// ✅ Pas de stats agrégées : elles seront rebuild au moment de l'import.

import { History, type SavedMatch } from "../history";
import { loadStore } from "../storage";
import type { Profile } from "../types";
import { getAllDartSets, type DartSet } from "../dartSetsStore";

export type SharedMatchPack = {
  version: 1;
  exportedAt: string;
  match: SavedMatch;
  profiles: Profile[];
  dartsets: DartSet[];
};

function uniqStrings(ids: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function exportSharedMatchPack(matchId: string): Promise<SharedMatchPack> {
  const match = await History.get(matchId);
  if (!match) throw new Error("Match introuvable");

  const players: any[] = Array.isArray((match as any).players) ? (match as any).players : [];

  const profileIds = uniqStrings(players.map((p) => p?.profileId));
  const dartsetIds = uniqStrings(players.map((p) => p?.dartsetId));

  const storeAny = await loadStore<any>().catch(() => null);
  const allProfiles: Profile[] = Array.isArray(storeAny?.profiles) ? storeAny.profiles : [];

  // dartSets : priorités
  // 1) store.dartSets (si présent)
  // 2) dartSetsStore (localStorage)
  const allDartSets: DartSet[] = Array.isArray(storeAny?.dartSets)
    ? storeAny.dartSets
    : (getAllDartSets() as any);

  const profiles = profileIds.length
    ? allProfiles.filter((p) => profileIds.includes(p.id))
    : [];

  const dartsets = dartsetIds.length
    ? allDartSets.filter((d: any) => dartsetIds.includes(d.id))
    : [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    match,
    profiles,
    dartsets,
  };
}
