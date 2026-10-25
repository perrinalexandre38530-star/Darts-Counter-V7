// WAVE 3 — façade canonique des entités métier qui portent des médias.
// Les écrans peuvent continuer à importer les stores historiques ; les pipelines
// backup/sync utilisent ce module pour ne plus reconstruire trois conventions
// différentes de références média.

import { loadBots, getCanonicalBotMediaRef, type BotRecord } from "../lib/bots";
import { getAllDartSets, getCanonicalDartSetMediaRefs, type DartSet } from "../lib/dartSetsStore";
import { loadTeams, getCanonicalTeamMediaRefs, type TeamEntity } from "../lib/petanqueTeamsStore";

export type CanonicalEntityKind = "bot" | "dartset" | "team";
export type CanonicalMediaRef = { kind: CanonicalEntityKind; entityId: string; slot: string; mediaKey: string };

export function loadCanonicalEntityCollections(): { bots: BotRecord[]; dartSets: DartSet[]; teams: TeamEntity[] } {
  return { bots: loadBots(), dartSets: getAllDartSets(), teams: loadTeams() };
}

export function collectCanonicalEntityMediaRefs(input?: Partial<{ bots: BotRecord[]; dartSets: DartSet[]; teams: TeamEntity[] }>): CanonicalMediaRef[] {
  const collections = input || loadCanonicalEntityCollections();
  const refs: CanonicalMediaRef[] = [];
  for (const bot of collections.bots || []) {
    const mediaKey = getCanonicalBotMediaRef(bot);
    if (mediaKey) refs.push({ kind: "bot", entityId: String(bot.id), slot: "avatar", mediaKey });
  }
  for (const set of collections.dartSets || []) {
    const media = getCanonicalDartSetMediaRefs(set);
    if (media.main) refs.push({ kind: "dartset", entityId: String(set.id), slot: "main", mediaKey: media.main });
    if (media.thumb) refs.push({ kind: "dartset", entityId: String(set.id), slot: "thumb", mediaKey: media.thumb });
  }
  for (const team of collections.teams || []) {
    const media = getCanonicalTeamMediaRefs(team);
    if (media.logo) refs.push({ kind: "team", entityId: String(team.id), slot: "logo", mediaKey: media.logo });
    if (media.cover) refs.push({ kind: "team", entityId: String(team.id), slot: "cover", mediaKey: media.cover });
  }
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.entityId}:${ref.slot}:${ref.mediaKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function auditCanonicalEntityStores(input?: Partial<{ bots: BotRecord[]; dartSets: DartSet[]; teams: TeamEntity[] }>) {
  const collections = { ...loadCanonicalEntityCollections(), ...(input || {}) };
  const refs = collectCanonicalEntityMediaRefs(collections);
  const duplicateMediaKeys = Array.from(refs.reduce((map, ref) => {
    const rows = map.get(ref.mediaKey) || [];
    rows.push(ref);
    map.set(ref.mediaKey, rows);
    return map;
  }, new Map<string, CanonicalMediaRef[]>()).entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([mediaKey, rows]) => ({ mediaKey, refs: rows }));
  return {
    counts: {
      bots: (collections.bots || []).length,
      dartSets: (collections.dartSets || []).length,
      teams: (collections.teams || []).length,
      mediaRefs: refs.length,
    },
    mediaRefs: refs,
    duplicateMediaKeys,
    ok: duplicateMediaKeys.length === 0,
  };
}
