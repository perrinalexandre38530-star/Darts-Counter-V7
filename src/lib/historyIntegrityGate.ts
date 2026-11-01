import { getCanonicalAccountScopeId } from "./canonicalAccountScope";
import { getHistoryV4AuthorityStamp, listCanonicalHistoryV4 } from "./historyV4";
import { isQuickPartyRecord } from "./quickParty";

export type HistoryPortableIntegrityManifest = {
  version: 1;
  activeCount: number;
  finishedCount: number;
  activeIdsHash: string;
  finishedIdsHash: string;
  contentHash: string;
};


export type CrossDeviceReleaseManifest = {
  version: "w8-v111";
  history: HistoryPortableIntegrityManifest;
  stats: {
    includeNonFinished: boolean;
    expectedCount: number;
    expectedIdsHash: string;
  };
};

export type CrossDeviceReleaseComparison = {
  ok: boolean;
  historyIdsEqual: boolean;
  finishedIdsEqual: boolean;
  contentEqual: boolean;
  statsExpectedEqual: boolean;
  expected: CrossDeviceReleaseManifest;
  actual: CrossDeviceReleaseManifest;
};

export type HistoryRowSetComparison = {
  idsEqual: boolean;
  finishedIdsEqual: boolean;
  contentEqual: boolean;
  expected: HistoryPortableIntegrityManifest;
  actual: HistoryPortableIntegrityManifest;
  missingIds: string[];
  extraIds: string[];
  missingFinishedIds: string[];
  extraFinishedIds: string[];
};

export type LocalDataIntegrityReleaseGateReport = {
  version: "w4-v235";
  generatedAt: string;
  scope: string;
  ok: boolean;
  repairedStats: boolean;
  history: {
    manifest: HistoryPortableIntegrityManifest;
    authorityFingerprint: string;
    revisionSum: number;
  };
  stats: {
    present: boolean;
    includeNonFinished: boolean;
    expectedCount: number;
    actualCount: number;
    expectedIdsHash: string;
    actualIdsHash: string;
    idsEqual: boolean;
    metadataMatchesHistoryAuthority: boolean;
    totalsMatch: boolean;
    missingIds: string[];
    extraIds: string[];
  };
};

function cleanId(value: any): string {
  return String(value ?? "").trim();
}

function toTs(value: any): number {
  const n = Number(value || 0);
  if (Number.isFinite(n) && n > 0) return n;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function normalizedStatus(value: any): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function isFinishedHistoryIntegrityRow(row: any): boolean {
  const status = normalizedStatus(row?.status ?? row?.summary?.status);
  if (!status) return false;
  return status.includes("finish") || status.includes("complete") || [
    "done", "ended", "end", "match_end", "match-ended", "matchend", "terminee", "terminée",
  ].includes(status);
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashHistoryIdSet(idsInput: Iterable<any>): string {
  const ids = Array.from(new Set(Array.from(idsInput || []).map(cleanId).filter(Boolean))).sort();
  return `${ids.length}:${fnv1a32(ids.join("\n"))}`;
}

function normalizeRows(rowsInput: any[] | Record<string, any> | null | undefined): any[] {
  const rows = Array.isArray(rowsInput)
    ? rowsInput
    : rowsInput && typeof rowsInput === "object"
      ? Object.values(rowsInput)
      : [];
  const byId = new Map<string, any>();
  for (const raw of rows) {
    if (!raw || raw?.deleted === true) continue;
    const id = cleanId(raw?.id || raw?.matchId);
    if (!id) continue;
    byId.set(id, { ...raw, id, matchId: cleanId(raw?.matchId || id) || id });
  }
  return Array.from(byId.values()).sort((a, b) => cleanId(a?.id).localeCompare(cleanId(b?.id)));
}

export function buildHistoryPortableIntegrityManifest(rowsInput: any[] | Record<string, any> | null | undefined): HistoryPortableIntegrityManifest {
  const rows = normalizeRows(rowsInput);
  const activeIds = rows.map((row) => cleanId(row?.id)).filter(Boolean);
  const finishedIds = rows.filter(isFinishedHistoryIntegrityRow).map((row) => cleanId(row?.id)).filter(Boolean);
  const contentLines = rows.map((row) => [
    cleanId(row?.id),
    normalizedStatus(row?.status ?? row?.summary?.status),
    toTs(row?.updatedAt),
    toTs(row?.finishedAt ?? row?.summary?.finishedAt),
  ].join("|"));
  return {
    version: 1,
    activeCount: activeIds.length,
    finishedCount: finishedIds.length,
    activeIdsHash: hashHistoryIdSet(activeIds),
    finishedIdsHash: hashHistoryIdSet(finishedIds),
    contentHash: `${rows.length}:${fnv1a32(contentLines.join("\n"))}`,
  };
}

function setDifference(a: Set<string>, b: Set<string>): string[] {
  return Array.from(a).filter((id) => !b.has(id)).sort();
}

export function buildCrossDeviceReleaseManifest(
  rowsInput: any[] | Record<string, any> | null | undefined,
  options?: { includeNonFinished?: boolean },
): CrossDeviceReleaseManifest {
  const includeNonFinished = options?.includeNonFinished === true;
  const rows = normalizeRows(rowsInput);
  const expectedStatsIds = rows
    .filter((row) => !isQuickPartyRecord(row))
    .filter((row) => includeNonFinished || isFinishedHistoryIntegrityRow(row))
    .map((row) => cleanId(row?.id))
    .filter(Boolean)
    .sort();
  return {
    version: "w8-v111",
    history: buildHistoryPortableIntegrityManifest(rows),
    stats: {
      includeNonFinished,
      expectedCount: expectedStatsIds.length,
      expectedIdsHash: hashHistoryIdSet(expectedStatsIds),
    },
  };
}

export function compareCrossDeviceReleaseManifest(
  expectedInput: CrossDeviceReleaseManifest,
  localReport: LocalDataIntegrityReleaseGateReport,
): CrossDeviceReleaseComparison {
  const expected = expectedInput;
  const actual: CrossDeviceReleaseManifest = {
    version: "w8-v111",
    history: localReport.history.manifest,
    stats: {
      includeNonFinished: localReport.stats.includeNonFinished,
      expectedCount: localReport.stats.expectedCount,
      expectedIdsHash: localReport.stats.expectedIdsHash,
    },
  };
  const historyIdsEqual = String(expected?.history?.activeIdsHash || "") === String(actual.history.activeIdsHash || "");
  const finishedIdsEqual = String(expected?.history?.finishedIdsHash || "") === String(actual.history.finishedIdsHash || "");
  const contentEqual = String(expected?.history?.contentHash || "") === String(actual.history.contentHash || "");
  const statsExpectedEqual =
    Number(expected?.stats?.expectedCount || 0) === Number(actual.stats.expectedCount || 0) &&
    String(expected?.stats?.expectedIdsHash || "") === String(actual.stats.expectedIdsHash || "");
  return {
    ok: localReport.ok && historyIdsEqual && finishedIdsEqual && contentEqual && statsExpectedEqual,
    historyIdsEqual,
    finishedIdsEqual,
    contentEqual,
    statsExpectedEqual,
    expected,
    actual,
  };
}

export function assertCrossDeviceReleaseManifest(
  expected: CrossDeviceReleaseManifest | null | undefined,
  localReport: LocalDataIntegrityReleaseGateReport,
): CrossDeviceReleaseComparison | null {
  if (!expected || expected.version !== "w8-v111") return null;
  const comparison = compareCrossDeviceReleaseManifest(expected, localReport);
  if (comparison.ok) return comparison;
  throw new Error(
    `Release Gate inter-appareils KO : History ${comparison.expected.history.activeIdsHash} -> ${comparison.actual.history.activeIdsHash}; ` +
    `terminées ${comparison.expected.history.finishedIdsHash} -> ${comparison.actual.history.finishedIdsHash}; ` +
    `Stats ${comparison.expected.stats.expectedIdsHash} -> ${comparison.actual.stats.expectedIdsHash}.`,
  );
}

export function compareHistoryRowSets(
  expectedRows: any[] | Record<string, any> | null | undefined,
  actualRows: any[] | Record<string, any> | null | undefined,
): HistoryRowSetComparison {
  const expectedNormalized = normalizeRows(expectedRows);
  const actualNormalized = normalizeRows(actualRows);
  const expectedIds = new Set(expectedNormalized.map((row) => cleanId(row?.id)).filter(Boolean));
  const actualIds = new Set(actualNormalized.map((row) => cleanId(row?.id)).filter(Boolean));
  const expectedFinished = new Set(expectedNormalized.filter(isFinishedHistoryIntegrityRow).map((row) => cleanId(row?.id)).filter(Boolean));
  const actualFinished = new Set(actualNormalized.filter(isFinishedHistoryIntegrityRow).map((row) => cleanId(row?.id)).filter(Boolean));
  const expected = buildHistoryPortableIntegrityManifest(expectedNormalized);
  const actual = buildHistoryPortableIntegrityManifest(actualNormalized);
  return {
    idsEqual: expectedIds.size === actualIds.size && setDifference(expectedIds, actualIds).length === 0,
    finishedIdsEqual: expectedFinished.size === actualFinished.size && setDifference(expectedFinished, actualFinished).length === 0,
    contentEqual: expected.contentHash === actual.contentHash,
    expected,
    actual,
    missingIds: setDifference(expectedIds, actualIds),
    extraIds: setDifference(actualIds, expectedIds),
    missingFinishedIds: setDifference(expectedFinished, actualFinished),
    extraFinishedIds: setDifference(actualFinished, expectedFinished),
  };
}

function collectStatsIndexMatchIds(index: any): string[] {
  const out = new Set<string>();
  const buckets = index?.matchIdsByMode && typeof index.matchIdsByMode === "object" ? index.matchIdsByMode : {};
  for (const values of Object.values<any>(buckets)) {
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const id = cleanId(value);
      if (id) out.add(id);
    }
  }
  return Array.from(out).sort();
}

function statsMetadataMatchesAuthority(index: any, authority: any): boolean {
  const meta = index?.meta;
  if (!index || !meta || !authority) return false;
  return (
    Number(meta?.historySchemaVersion || 0) === 4 &&
    String(meta?.historyFingerprint || "") === String(authority?.fingerprint || "") &&
    Number(meta?.historyCount || 0) === Number(authority?.activeRows || 0) &&
    Number(meta?.historyFinishedCount || 0) === Number(authority?.finishedRows || 0) &&
    Number(meta?.historyRevisionSum || 0) === Number(authority?.revisionSum || 0)
  );
}

async function runLocalDataIntegrityReleaseGateOnce(): Promise<LocalDataIntegrityReleaseGateReport> {
  const [rows, authority, statsMod] = await Promise.all([
    listCanonicalHistoryV4({ hydratePayload: true, includeDeleted: false }),
    getHistoryV4AuthorityStamp(),
    import("./stats/rebuildStatsFromHistory"),
  ]);
  const statsIndex = await statsMod.loadStatsIndex().catch(() => null);
  const includeNonFinished = Boolean(statsIndex?.meta?.includeNonFinished);
  const expectedStatsRows = normalizeRows(rows).filter((row) => {
    if (isQuickPartyRecord(row)) return false;
    return includeNonFinished || isFinishedHistoryIntegrityRow(row);
  });
  const expectedStatsIds = expectedStatsRows.map((row) => cleanId(row?.id)).filter(Boolean).sort();
  const actualStatsIds = collectStatsIndexMatchIds(statsIndex);
  const expectedSet = new Set(expectedStatsIds);
  const actualSet = new Set(actualStatsIds);
  const missingIds = setDifference(expectedSet, actualSet);
  const extraIds = setDifference(actualSet, expectedSet);
  const idsEqual = expectedStatsIds.length === actualStatsIds.length && missingIds.length === 0 && extraIds.length === 0;
  const totalsMatch = !!statsIndex && Number(statsIndex?.totals?.matches || 0) === expectedStatsIds.length;
  const metadataMatchesHistoryAuthority = statsMetadataMatchesAuthority(statsIndex, authority);
  const historyManifest = buildHistoryPortableIntegrityManifest(rows);

  return {
    version: "w4-v235",
    generatedAt: new Date().toISOString(),
    scope: getCanonicalAccountScopeId() || "local",
    ok: idsEqual && totalsMatch && metadataMatchesHistoryAuthority,
    repairedStats: false,
    history: {
      manifest: historyManifest,
      authorityFingerprint: String(authority?.fingerprint || ""),
      revisionSum: Number(authority?.revisionSum || 0) || 0,
    },
    stats: {
      present: !!statsIndex,
      includeNonFinished,
      expectedCount: expectedStatsIds.length,
      actualCount: actualStatsIds.length,
      expectedIdsHash: hashHistoryIdSet(expectedStatsIds),
      actualIdsHash: hashHistoryIdSet(actualStatsIds),
      idsEqual,
      metadataMatchesHistoryAuthority,
      totalsMatch,
      missingIds,
      extraIds,
    },
  };
}

export async function runLocalDataIntegrityReleaseGate(options?: { repairStats?: boolean }): Promise<LocalDataIntegrityReleaseGateReport> {
  const first = await runLocalDataIntegrityReleaseGateOnce();
  if (first.ok || options?.repairStats !== true) return first;
  try {
    const statsMod = await import("./stats/rebuildStatsFromHistory");
    await statsMod.refreshStatsIndexFromHistoryNow({ persist: true, reason: "release-gate-w4-repair" });
  } catch {}
  const repaired = await runLocalDataIntegrityReleaseGateOnce();
  return { ...repaired, repairedStats: true };
}

export async function assertLocalDataIntegrityReleaseGate(options?: { repairStats?: boolean }): Promise<LocalDataIntegrityReleaseGateReport> {
  const report = await runLocalDataIntegrityReleaseGate(options);
  if (report.ok) return report;
  const missing = report.stats.missingIds.slice(0, 8).join(", ") || "—";
  const extra = report.stats.extraIds.slice(0, 8).join(", ") || "—";
  throw new Error(
    `Release Gate History/Stats KO : History attendu ${report.stats.expectedCount}, Stats ${report.stats.actualCount}; ` +
    `IDs manquants [${missing}] ; IDs en trop [${extra}] ; metadata=${report.stats.metadataMatchesHistoryAuthority ? "ok" : "mismatch"}.`,
  );
}
