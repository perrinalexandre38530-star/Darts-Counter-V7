import {
  analyzeLegacySnapshot,
  buildLegacyMigrationSnapshot,
  isLegacyMigrationCandidate,
  legacyMatchFingerprint,
  legacyMigrationJournalKey,
  LEGACY_MIGRATION_QUARANTINE_KEY,
  type LegacyMigrationPlan,
} from "../data/legacyMigrationV1";
import { isRegisteredPortableLocalStorageKey } from "../data/dataRegistry";
import { registerCanonicalIdentity } from "../data/identityAliases";
import { accountOwnedTeams } from "../data/organizationDataBoundary";
import { listCanonicalHistoryV4, listHistoryV4Tombstones } from "./historyV4";
import { importCloudSnapshot, getKV, getStorageUser, loadStore, setKV } from "./storage";
import { refreshStatsIndexFromHistoryNow } from "./stats/rebuildStatsFromHistory";

export type LegacyMigrationRuntimeReport = {
  ok: boolean;
  alreadyApplied: boolean;
  plan: LegacyMigrationPlan;
  importedMatches: number;
  repairedMatches: number;
  incompleteMatches: number;
  duplicateMatches: number;
  quarantinedMatches: number;
  importedProfiles: number;
  agendaEvents: number;
  warnings: string[];
  appliedAt: string;
};

function clean(value: any): string {
  return String(value ?? "").trim();
}

function readJournal(accountUserId?: string | null): any {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(legacyMigrationJournalKey(accountUserId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJournal(accountUserId: string | null, report: LegacyMigrationRuntimeReport): void {
  if (typeof localStorage === "undefined") return;
  const existing = readJournal(accountUserId);
  const entries = Array.isArray(existing?.entries) ? existing.entries : [];
  const nextEntry = {
    fingerprint: report.plan.source.fingerprint,
    sourceExportedAt: report.plan.source.exportedAt,
    appliedAt: report.appliedAt,
    ok: report.ok,
    summary: report.plan.summary,
    warnings: report.warnings.slice(0, 50),
    quarantined: report.plan.history.actions
      .filter((action) => action.disposition === "quarantined")
      .slice(0, 100),
  };
  const next = {
    _v: 1,
    accountUserId: accountUserId || null,
    updatedAt: Date.now(),
    entries: [...entries.filter((entry: any) => clean(entry?.fingerprint) !== report.plan.source.fingerprint), nextEntry].slice(-40),
  };
  try { localStorage.setItem(legacyMigrationJournalKey(accountUserId), JSON.stringify(next)); } catch (error) {
    console.warn("[legacy-migration] unable to persist journal", error);
  }
}

function journalHasFingerprint(accountUserId: string | null, fingerprint: string): boolean {
  const journal = readJournal(accountUserId);
  return Array.isArray(journal?.entries) && journal.entries.some((entry: any) => clean(entry?.fingerprint) === fingerprint && entry?.ok === true);
}

async function persistQuarantine(plan: LegacyMigrationPlan): Promise<void> {
  const rows = plan?.history?.quarantinedRows && typeof plan.history.quarantinedRows === "object"
    ? plan.history.quarantinedRows
    : {};
  const ids = Object.keys(rows);
  if (!ids.length) return;
  const previous: any = await getKV<any>(LEGACY_MIGRATION_QUARANTINE_KEY).catch(() => null);
  const entries = Array.isArray(previous?.entries) ? previous.entries : [];
  const actionById = new Map(plan.history.actions.map((action) => [action.matchId, action]));
  const incoming = ids.map((id) => ({
    sourceFingerprint: plan.source.fingerprint,
    sourceExportedAt: plan.source.exportedAt,
    matchId: id,
    reason: actionById.get(id)?.reason || "legacy-quarantine",
    quarantinedAt: Date.now(),
    row: rows[id],
  }));
  const dedup = new Map<string, any>();
  for (const entry of [...entries, ...incoming]) {
    const key = `${clean(entry?.sourceFingerprint)}:${clean(entry?.matchId)}`;
    if (key !== ":") dedup.set(key, entry);
  }
  await setKV(LEGACY_MIGRATION_QUARANTINE_KEY, {
    _v: 1,
    updatedAt: Date.now(),
    entries: Array.from(dedup.values()).slice(-500),
  });
}

function registerPlanIdentities(plan: LegacyMigrationPlan, accountUserId: string | null): void {
  const profileById = new Map(plan.profiles.importable.map((profile: any) => [clean(profile?.id), profile]));
  for (const profile of plan.profiles.importable) {
    const id = clean(profile?.id);
    if (!id) continue;
    registerCanonicalIdentity({ accountUserId, canonicalProfileId: id, profile });
  }
  for (const link of plan.identityLinks) {
    const canonical = clean(link?.canonicalProfileId);
    if (!canonical) continue;
    const profile = profileById.get(canonical) || { id: canonical };
    registerCanonicalIdentity({
      accountUserId,
      canonicalProfileId: canonical,
      profile,
      accountIds: link.accountIds,
      legacyProfileIds: link.aliasIds,
    });
  }
}

export async function analyzeLegacySnapshotAgainstCurrent(input: any): Promise<LegacyMigrationPlan> {
  const accountUserId = clean(getStorageUser()) || null;
  const [store, currentRows, tombstones] = await Promise.all([
    loadStore<any>().catch(() => ({})),
    listCanonicalHistoryV4({ hydratePayload: false, includeDeleted: false }).catch(() => []),
    listHistoryV4Tombstones().catch(() => []),
  ]);
  const currentProfileIds = (Array.isArray(store?.profiles) ? store.profiles : []).map((profile: any) => clean(profile?.id)).filter(Boolean);
  const currentMatchIds = currentRows.map((row: any) => clean(row?.id || row?.matchId)).filter(Boolean);
  const currentMatchFingerprints = currentRows.map((row: any) => legacyMatchFingerprint(row)).filter(Boolean);
  const currentTombstoneIds = tombstones.map((row: any) => clean(row?.id || row?.matchId)).filter(Boolean);
  return analyzeLegacySnapshot(input, {
    currentAccountUserId: accountUserId,
    currentProfileIds,
    currentMatchIds,
    currentMatchFingerprints,
    currentTombstoneIds,
    portableLocalStoragePredicate: (key) => isRegisteredPortableLocalStorageKey(key),
  });
}

export async function migrateLegacySnapshotIntoCurrent(
  input: any,
  opts?: { force?: boolean; onProgress?: (progress: number, message: string) => void },
): Promise<LegacyMigrationRuntimeReport> {
  if (!isLegacyMigrationCandidate(input)) throw new Error("Ce fichier n'est pas un snapshot legacy migrable.");
  const reportProgress = (value: number, message: string) => { try { opts?.onProgress?.(value, message); } catch {} };
  const accountUserId = clean(getStorageUser()) || null;
  reportProgress(2, "Analyse legacy et déduplication…");
  const plan = await analyzeLegacySnapshotAgainstCurrent(input);
  if (!opts?.force && journalHasFingerprint(accountUserId, plan.source.fingerprint)) {
    return {
      ok: true,
      alreadyApplied: true,
      plan,
      importedMatches: 0,
      repairedMatches: 0,
      incompleteMatches: 0,
      duplicateMatches: plan.summary.duplicate,
      quarantinedMatches: plan.summary.quarantined,
      importedProfiles: 0,
      agendaEvents: 0,
      warnings: ["Cette source legacy a déjà été migrée sur ce compte."],
      appliedAt: new Date().toISOString(),
    };
  }

  if (plan.aliasConflicts.length) {
    plan.warnings.push(`${plan.aliasConflicts.length} conflit(s) d'identité explicite conservé(s) sans remapping.`);
  }

  reportProgress(12, "Enregistrement des alias d’identité explicites…");
  registerPlanIdentities(plan, accountUserId);

  reportProgress(20, "Préparation du snapshot legacy assaini…");
  const snapshot = buildLegacyMigrationSnapshot(plan, input);
  snapshot.portableAccountData.teams = accountOwnedTeams(snapshot.portableAccountData.teams);
  snapshot.portableAccountData.counts.teams = snapshot.portableAccountData.teams.length;

  reportProgress(28, "Fusion non destructive dans History V4 et les stores canoniques…");
  await importCloudSnapshot(snapshot, {
    mode: "merge",
    onProgress: (progress, message) => reportProgress(28 + Math.round(Math.max(0, Math.min(100, progress)) * 0.48), message),
  });

  if (plan.agenda.events.length) {
    reportProgress(78, `Consolidation de ${plan.agenda.events.length} événement(s) Agenda…`);
    await setKV("mss-multisport-agenda-v2", plan.agenda.events);
  }

  reportProgress(84, "Conservation des lignes ambiguës en quarantaine…");
  await persistQuarantine(plan);

  reportProgress(86, "Reconstruction des statistiques depuis History V4…");
  await refreshStatsIndexFromHistoryNow({ reason: `legacy-migration:${plan.source.fingerprint}` }).catch((error) => {
    plan.warnings.push(`Rebuild Stats différé: ${String((error as any)?.message || error || "erreur")}`);
  });

  const appliedAt = new Date().toISOString();
  const runtimeReport: LegacyMigrationRuntimeReport = {
    ok: true,
    alreadyApplied: false,
    plan,
    importedMatches: plan.summary.migrate + plan.summary.repaired + plan.summary.incomplete,
    repairedMatches: plan.summary.repaired,
    incompleteMatches: plan.summary.incomplete,
    duplicateMatches: plan.summary.duplicate,
    quarantinedMatches: plan.summary.quarantined,
    importedProfiles: plan.summary.profilesImportable,
    agendaEvents: plan.summary.agendaEvents,
    warnings: plan.warnings,
    appliedAt,
  };
  writeJournal(accountUserId, runtimeReport);
  try {
    window.dispatchEvent(new CustomEvent("dc:legacy-migration-complete", { detail: runtimeReport }));
    window.dispatchEvent(new CustomEvent("dc-stats-index-updated", { detail: { reason: "legacy-migration", restored: true } }));
  } catch {}
  reportProgress(100, "Migration legacy terminée sans écraser l’état canonique.");
  return runtimeReport;
}
