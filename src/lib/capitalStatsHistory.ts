/**
 * CAPITAL V158 — lecture stricte des parties terminées pour les statistiques.
 * Source : enregistrements History V4 / History.get(). Jamais les checkpoints
 * in_progress, ni une identité déduite d'un nom quand un ID différent est présent.
 * Aucun changement ou réparation des données historiques.
 */
export type CapitalHistoryMatch = {
  record: any;
  row: any;
  variantId: string;
  variantLabel: string;
};

const clean = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => clean(value).toLowerCase();
const recordTime = (record: any) => Number(record?.updatedAt || record?.summary?.finishedAt || record?.createdAt || 0) || 0;
const pools = (record: any): any[][] => [
  record?.payload?.stats?.players,
  record?.summary?.players,
  record?.summary?.perPlayer,
  record?.payload?.summary?.players,
  record?.payload?.summary?.perPlayer,
  record?.payload?.players,
  record?.players,
].filter(Array.isArray);

export function isCompletedCapitalRecord(record: any): boolean {
  if (!record || typeof record !== "object") return false;
  const tokens = [record?.kind, record?.mode, record?.game?.mode, record?.summary?.mode, record?.payload?.mode, record?.payload?.kind, record?.payload?.summary?.mode];
  if (!tokens.some((value) => lower(value) === "capital")) return false;
  const status = lower(record?.status);
  if (["in_progress", "inprogress", "playing", "active", "running"].includes(status)) return false;
  return ["finished", "complete", "completed", "done"].includes(status)
    || record?.summary?.finished === true
    || !!record?.summary?.finishedAt
    || !!record?.payload?.summary?.finishedAt;
}

function identities(row: any): string[] {
  return [row?.id, row?.playerId, row?.profileId, row?.pid, ...(Array.isArray(row?.aliases) ? row.aliases : [])]
    .map(clean).filter(Boolean);
}

/** Une homonymie ne doit jamais attribuer les résultats d'un autre profil. */
export function findCapitalHistoryPlayer(record: any, wantedId: string, wantedName?: string | null): any | null {
  const id = clean(wantedId);
  if (!id) return null;
  const candidates = pools(record).flat();
  const exact = candidates.find((row: any) => identities(row).includes(id));
  if (exact) return exact;
  // Repli limité aux anciennes lignes sans aucun identifiant, avec nom unique.
  const name = lower(wantedName);
  if (!name) return null;
  const byName = candidates.filter((row: any) => !identities(row).length && lower(row?.name || row?.playerName || row?.displayName || row?.nickname) === name);
  return byName.length === 1 ? byName[0] : null;
}

const VARIANT_NAMES: Record<string, string> = {
  clubs15: "OFFICIEL", inverse15: "MIROIR", committee15: "HÉRITAGE",
  bar17: "DIAGONALE", modern17: "PELUCHE", alpes17: "PELUCHE",
  committee_shanghai17: "SHANGHAI", committee_42_17: "42",
  committee_petit17: "ÉCONOME", committee_other17: "À LA CARTE",
  beginner: "STANDARD", intermediate: "CHALLENGER", expert: "EXPERT", legends: "LÉGENDES",
};

export function capitalHistoryVariant(record: any): { id: string; label: string } {
  const summary = record?.summary?.capitalVariant || record?.payload?.summary?.capitalVariant || {};
  const cfg = record?.config || record?.payload?.config || {};
  if (cfg.mode === "custom" || summary.id === "custom") {
    return { id: `custom:${clean(cfg.savedVariantId || summary.savedVariantId || cfg.savedVariantName || summary.label || "personnalise")}`,
      label: clean(cfg.savedVariantName || summary.label || "MON CAPITAL") };
  }
  const id = clean(cfg.gridVariant || summary.id || "clubs15");
  return { id, label: VARIANT_NAMES[id] || clean(summary.label || "PERSONNALISÉ") };
}

export function capitalCompletedMatches(records: any[], wantedId: string, wantedName?: string | null): CapitalHistoryMatch[] {
  const latest = new Map<string, any>();
  for (const record of Array.isArray(records) ? records : []) {
    if (!isCompletedCapitalRecord(record)) continue;
    const key = clean(record?.matchId || record?.id);
    if (!key) continue;
    const prior = latest.get(key);
    if (!prior || (pools(record).some((pool) => pool.length) && !pools(prior).some((pool) => pool.length)) || recordTime(record) > recordTime(prior)) {
      latest.set(key, record);
    }
  }
  return [...latest.values()].map((record) => {
    const row = findCapitalHistoryPlayer(record, wantedId, wantedName);
    const variant = capitalHistoryVariant(record);
    return { record, row, variantId: variant.id, variantLabel: variant.label };
  }).filter((item) => !!item.row).sort((a, b) => recordTime(b.record) - recordTime(a.record));
}
