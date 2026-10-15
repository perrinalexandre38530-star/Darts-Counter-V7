// ============================================
// STATS SYSTEM DIAGNOSTIC
// Read-only end-to-end audit of the statistics pipeline:
// IndexedDB -> History -> payload hydration -> Stats index -> quick mirror -> StatsHub UI.
// No data is deleted or rewritten by this module.
// ============================================

import {
  History,
  auditHistoryStorageFootprint,
  type HistoryStorageAudit,
} from "./history";
import {
  isStatsIndexDirty,
  loadStatsIndex,
  loadStatsQuickMirrorSync,
  type StatsIndex,
} from "./stats/rebuildStatsFromHistory";
import {
  isStatsDiagnosticTraceEnabled,
  readStatsDiagnosticTrace,
  recordStatsDiagnosticEvent,
  type StatsDiagnosticTraceEvent,
} from "./statsDiagnosticsTrace";

export type StatsDiagnosticStatus = "ok" | "warn" | "fail" | "skip";

export type StatsSystemDiagnosticCheck = {
  id: string;
  label: string;
  status: StatsDiagnosticStatus;
  detail: string;
  evidence?: any;
};

export type StatsSystemDiagnosticPipeline = {
  storageRows: number | null;
  historyRows: number;
  historyFinished: number;
  historyInProgress: number;
  historyX01: number;
  activeHeaderMatches: number;
  activeHeaderX01: number;
  activeDeepX01: number | null;
  activeDeepX01ByExactId: number | null;
  activeDeepX01ByName: number | null;
  statsIndexRows: number | null;
  statsIndexFinished: number | null;
  statsIndexX01: number | null;
  statsIndexActiveMatches: number | null;
  quickMirrorActiveMatches: number | null;
  uiNormalizedMatches: number | null;
  uiSelectedMatches: number | null;
};

export type StatsSystemDiagnosticReport = {
  version: "stats-diagnostic-v124";
  generatedAt: string;
  deep: boolean;
  traceEnabled: boolean;
  profile: {
    id: string;
    name: string;
    storeActiveProfileId?: string;
    storeActiveProfileName?: string;
  };
  summary: { ok: number; warn: number; fail: number; skip: number; total: number };
  pipeline: StatsSystemDiagnosticPipeline;
  checks: StatsSystemDiagnosticCheck[];
  diagnosis: Array<{ severity: "info" | "warn" | "critical"; code: string; message: string }>;
  timingsMs: Record<string, number>;
  history: {
    statusCounts: Record<string, number>;
    modeCounts: Record<string, number>;
    duplicateIds: string[];
    missingHeaderPlayers: number;
    x01Rows: number;
    deep?: {
      tested: number;
      failed: number;
      avgMs: number;
      maxMs: number;
      exactIdMatches: number;
      nameMatches: number;
      anyIdentityMatches: number;
      rowsWithoutPlayerIdentity: number;
      identityPaths: Record<string, number>;
      failures: Array<{ id: string; error: string }>;
      slowest: Array<{ id: string; ms: number; matched: boolean; path?: string }>;
    };
  };
  index: {
    present: boolean;
    version?: number;
    rebuiltAt?: number;
    source?: string;
    rowsScanned?: number;
    dirty: boolean;
    byMode?: Record<string, number>;
    active?: any;
  };
  quickMirror: {
    present: boolean;
    updatedAt?: number;
    active?: any;
  };
  storage?: HistoryStorageAudit | null;
  ui?: Record<string, any> | null;
  trace: StatsDiagnosticTraceEvent[];
};

export type StatsSystemDiagnosticOptions = {
  deep?: boolean;
  activeProfileId?: string | null;
  activeProfileName?: string | null;
  uiSnapshot?: Record<string, any> | null;
  maxDeepRows?: number;
  onProgress?: (progress: { phase: string; current?: number; total?: number; detail?: string }) => void;
};

const LAST_REPORT_KEY = "dc_stats_system_diagnostic_report_v124";

function safeLsGet(key: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
}
function safeLsSet(key: string, value: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch {}
}
function safeLsRemove(key: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch {}
}

export function readLastStatsSystemDiagnosticReport(): StatsSystemDiagnosticReport | null {
  try {
    const raw = safeLsGet(LAST_REPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === "stats-diagnostic-v124" ? parsed as StatsSystemDiagnosticReport : null;
  } catch {
    return null;
  }
}

export function clearLastStatsSystemDiagnosticReport(): void {
  safeLsRemove(LAST_REPORT_KEY);
}

function persistReport(report: StatsSystemDiagnosticReport): void {
  try { safeLsSet(LAST_REPORT_KEY, JSON.stringify(report)); } catch {}
}

function nowMs(): number {
  try { return performance.now(); } catch { return Date.now(); }
}

function norm(value: any): string {
  return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function idsOf(player: any): string[] {
  const out = [player?.id, player?.playerId, player?.profileId, player?.uid, player?.userId, player?.localId]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return [...new Set(out)];
}

function nameOf(player: any): string {
  return String(player?.name ?? player?.displayName ?? player?.nickname ?? player?.pseudo ?? player?.label ?? "").trim();
}

function toPlayerRows(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  try {
    return Object.entries(value).map(([key, raw]: [string, any]) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const hasId = idsOf(raw).length > 0;
        return hasId ? raw : { id: /^\d+$/.test(key) ? undefined : key, ...raw };
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function statusKey(row: any): string {
  const raw = String(row?.status || "unknown").trim().toLowerCase();
  return raw || "unknown";
}

function modeKey(row: any): string {
  const raw = [
    row?.kind,
    row?.mode,
    row?.game?.mode,
    row?.game,
    row?.summary?.kind,
    row?.summary?.mode,
    row?.summary?.game?.mode,
    row?.payload?.kind,
    row?.payload?.mode,
    row?.payload?.game?.mode,
    row?.payload?.config?.mode,
  ].filter((v) => v != null).map((v) => String(v).toLowerCase()).join(" ");
  if (raw.includes("cricket")) return "cricket";
  if (raw.includes("killer")) return "killer";
  if (raw.includes("shanghai")) return "shanghai";
  if (raw.includes("x01") || /(^|\s)(301|501|701|1001)(\s|$)/.test(raw)) return "x01";
  return String(row?.kind || row?.mode || row?.game?.mode || "unknown").trim().toLowerCase() || "unknown";
}

function isFinished(row: any): boolean {
  const status = statusKey(row).replace(/\s+/g, "_");
  return status.includes("finish") || status.includes("complete") || ["done", "ended", "end", "match_end", "match-ended", "matchend", "terminee", "terminée"].includes(status);
}

function collectIdentityPools(row: any): Array<{ path: string; rows: any[] }> {
  const candidates: Array<[string, any]> = [
    ["players", row?.players],
    ["summary.players", row?.summary?.players],
    ["summary.perPlayer", row?.summary?.perPlayer],
    ["payload.players", row?.payload?.players],
    ["payload.config.players", row?.payload?.config?.players],
    ["payload.state.players", row?.payload?.state?.players],
    ["payload.snapshot.players", row?.payload?.snapshot?.players],
    ["payload.match.players", row?.payload?.match?.players],
    ["payload.summary.players", row?.payload?.summary?.players],
    ["payload.summary.perPlayer", row?.payload?.summary?.perPlayer],
    ["payload.summary.ranking", row?.payload?.summary?.ranking],
    ["payload.summary.rankings", row?.payload?.summary?.rankings],
    ["payload.summary.finalRanking", row?.payload?.summary?.finalRanking],
    ["payload.summary.multiRanking", row?.payload?.summary?.multiRanking],
    ["payload.summary.classification", row?.payload?.summary?.classification],
    ["payload.summary.standings", row?.payload?.summary?.standings],
    ["resume.players", row?.resume?.players],
    ["resume.config.players", row?.resume?.config?.players],
    ["resume.state.players", row?.resume?.state?.players],
  ];
  return candidates.map(([path, value]) => ({ path, rows: toPlayerRows(value) })).filter((entry) => entry.rows.length > 0);
}

function inspectPlayerMatch(row: any, profileId: string, profileName: string): { matched: boolean; exactId: boolean; byName: boolean; path?: string; identityPresent: boolean } {
  const wantedId = String(profileId || "").trim();
  const wantedName = norm(profileName);
  const pools = collectIdentityPools(row);
  let identityPresent = false;
  for (const pool of pools) {
    for (const player of pool.rows) {
      const ids = idsOf(player);
      const pname = norm(nameOf(player));
      if (ids.length || pname) identityPresent = true;
      const exactId = !!wantedId && ids.includes(wantedId);
      const byName = !!wantedName && pname === wantedName;
      if (exactId || byName) return { matched: true, exactId, byName, path: pool.path, identityPresent: true };
    }
  }
  return { matched: false, exactId: false, byName: false, identityPresent };
}

function check(id: string, label: string, status: StatsDiagnosticStatus, detail: string, evidence?: any): StatsSystemDiagnosticCheck {
  return { id, label, status, detail, ...(evidence !== undefined ? { evidence } : {}) };
}

function addCount(map: Record<string, number>, key: string): void {
  map[key] = Number(map[key] || 0) + 1;
}

function resolveRuntimeProfile(explicitId?: string | null, explicitName?: string | null) {
  let store: any = null;
  try { store = (globalThis as any)?.__appStore?.store || null; } catch {}
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const storeActiveId = String(store?.activeProfileId || "").trim();
  const storeActive = profiles.find((p: any) => String(p?.id || "") === storeActiveId) || profiles[0] || null;
  return {
    id: String(explicitId || storeActiveId || storeActive?.id || "").trim(),
    name: String(explicitName || storeActive?.name || storeActive?.displayName || storeActive?.nickname || "").trim(),
    storeActiveProfileId: storeActiveId,
    storeActiveProfileName: String(storeActive?.name || storeActive?.displayName || storeActive?.nickname || "").trim(),
  };
}

export async function runStatsSystemDiagnostic(options: StatsSystemDiagnosticOptions = {}): Promise<StatsSystemDiagnosticReport> {
  const deep = !!options.deep;
  const onProgress = options.onProgress;
  const profile = resolveRuntimeProfile(options.activeProfileId, options.activeProfileName);
  const timingsMs: Record<string, number> = {};
  const checks: StatsSystemDiagnosticCheck[] = [];
  const diagnosis: StatsSystemDiagnosticReport["diagnosis"] = [];

  recordStatsDiagnosticEvent("diagnostic.start", { deep, profileId: profile.id, profileName: profile.name }, true);
  onProgress?.({ phase: "history", detail: "Lecture des en-têtes Historique…" });

  let rows: any[] = [];
  let t0 = nowMs();
  try { rows = await History.list(); } catch (error: any) {
    checks.push(check("history-read", "Lecture History.list()", "fail", `Impossible de lire l’historique : ${String(error?.message || error)}`));
  }
  timingsMs.historyList = Math.round((nowMs() - t0) * 10) / 10;

  const statusCounts: Record<string, number> = {};
  const modeCounts: Record<string, number> = {};
  const idCounts = new Map<string, number>();
  let missingHeaderPlayers = 0;
  let activeHeaderMatches = 0;
  let activeHeaderX01 = 0;
  for (const row of rows) {
    addCount(statusCounts, statusKey(row));
    const mode = modeKey(row);
    addCount(modeCounts, mode);
    const id = String(row?.id || row?.matchId || "").trim();
    if (id) idCounts.set(id, Number(idCounts.get(id) || 0) + 1);
    if (!Array.isArray(row?.players) || row.players.length === 0) missingHeaderPlayers += 1;
    const headerMatch = inspectPlayerMatch({ players: row?.players, summary: row?.summary }, profile.id, profile.name);
    if (headerMatch.matched) {
      activeHeaderMatches += 1;
      if (mode === "x01") activeHeaderX01 += 1;
    }
  }
  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id).slice(0, 60);
  const historyFinished = rows.filter(isFinished).length;
  const historyInProgress = Math.max(0, rows.length - historyFinished);
  const x01Rows = rows.filter((row) => modeKey(row) === "x01" && isFinished(row));

  if (!checks.some((c) => c.id === "history-read")) {
    checks.push(check(
      "history-read",
      "Historique — source de vérité",
      rows.length > 0 ? "ok" : "warn",
      `${rows.length} partie(s) lue(s) en ${timingsMs.historyList} ms · ${historyFinished} terminée(s) · ${x01Rows.length} X01.`,
      { total: rows.length, finished: historyFinished, x01: x01Rows.length, statusCounts, modeCounts },
    ));
  }

  if (duplicateIds.length) checks.push(check("duplicate-ids", "IDs de parties", "fail", `${duplicateIds.length} ID(s) dupliqué(s) détecté(s).`, { duplicateIds }));
  else checks.push(check("duplicate-ids", "IDs de parties", "ok", "Aucun doublon d’ID visible dans History.list()."));

  onProgress?.({ phase: "storage", detail: "Contrôle IndexedDB headers/details…" });
  let storage: HistoryStorageAudit | null = null;
  t0 = nowMs();
  try { storage = await auditHistoryStorageFootprint(); } catch {}
  timingsMs.storageAudit = Math.round((nowMs() - t0) * 10) / 10;
  if (storage) {
    const parityDelta = Math.abs(Number(storage.headerRows || 0) - Number(storage.detailRows || 0));
    checks.push(check(
      "history-storage",
      "IndexedDB Historique",
      parityDelta === 0 ? "ok" : "warn",
      `${storage.headerRows} header(s) / ${storage.detailRows} détail(s) · ${storage.totalApproxMB} Mo · ${storage.suspiciousCount} entrée(s) volumineuse(s).`,
      { headerRows: storage.headerRows, detailRows: storage.detailRows, suspiciousCount: storage.suspiciousCount, totalApproxMB: storage.totalApproxMB },
    ));
  } else {
    checks.push(check("history-storage", "IndexedDB Historique", "skip", "Audit de stockage indisponible sur cet appareil."));
  }

  onProgress?.({ phase: "index", detail: "Lecture de l’index Stats et du miroir rapide…" });
  t0 = nowMs();
  const idx = await loadStatsIndex().catch(() => null) as StatsIndex | null;
  timingsMs.statsIndexLoad = Math.round((nowMs() - t0) * 10) / 10;
  const dirty = isStatsIndexDirty();
  const quick = loadStatsQuickMirrorSync();
  const idxX01 = Number((idx as any)?.byMode?.x01?.matches ?? 0) || 0;
  const idxActive = profile.id ? ((idx as any)?.byPlayer?.[profile.id] || null) : null;
  const quickActive = profile.id ? ((quick as any)?.byPlayer?.[profile.id] || null) : null;
  const idxFinished = idx ? Number((idx as any)?.totals?.finished ?? (idx as any)?.totals?.matches ?? 0) || 0 : null;

  if (!idx && historyFinished > 0) {
    checks.push(check("stats-index", "Index central Stats", "fail", `Aucun index Stats alors que ${historyFinished} partie(s) terminée(s) existent.`));
  } else if (idx) {
    const diff = Math.abs(Number(idxFinished || 0) - historyFinished);
    checks.push(check(
      "stats-index",
      "Index central Stats",
      diff === 0 ? "ok" : "fail",
      `History terminées=${historyFinished} · index=${idxFinished} · rowsScanned=${Number((idx as any)?.meta?.rowsScanned || 0)} · source=${String((idx as any)?.meta?.source || "—")}.`,
      { historyFinished, indexFinished: idxFinished, rowsScanned: (idx as any)?.meta?.rowsScanned, source: (idx as any)?.meta?.source, rebuiltAt: (idx as any)?.rebuiltAt },
    ));
  } else {
    checks.push(check("stats-index", "Index central Stats", "warn", "Historique et index Stats sont tous les deux vides."));
  }

  if (idx) {
    const x01Diff = Math.abs(idxX01 - x01Rows.length);
    checks.push(check(
      "x01-global",
      "X01 — Historique ↔ index",
      x01Diff === 0 ? "ok" : "fail",
      `Historique X01 terminé=${x01Rows.length} · index X01=${idxX01}${x01Diff ? ` · écart=${x01Diff}` : ""}.`,
      { historyX01: x01Rows.length, indexX01: idxX01, matchIdsIndexed: Array.isArray((idx as any)?.matchIdsByMode?.x01) ? (idx as any).matchIdsByMode.x01.length : 0 },
    ));
  } else {
    checks.push(check("x01-global", "X01 — Historique ↔ index", "skip", `Historique X01=${x01Rows.length}, index absent.`));
  }

  checks.push(check(
    "stats-dirty",
    "État de fraîcheur de l’index",
    dirty ? "warn" : "ok",
    dirty ? "L’index est marqué DIRTY : une reconstruction a été demandée mais n’est pas encore consolidée." : "L’index n’est pas marqué DIRTY.",
  ));

  if (quick) {
    const idxMatches = Number(idxActive?.matches || 0) || 0;
    const quickMatches = Number(quickActive?.matches || 0) || 0;
    checks.push(check(
      "quick-mirror",
      "Miroir rapide Home / premier affichage",
      idxActive && quickActive && idxMatches !== quickMatches ? "warn" : "ok",
      `Miroir=${quickMatches} match(s) pour le profil · index=${idxMatches} · mis à jour ${quick.updatedAt ? new Date(quick.updatedAt).toLocaleString() : "—"}.`,
      { quickMatches, indexMatches: idxMatches, updatedAt: quick.updatedAt },
    ));
  } else {
    checks.push(check("quick-mirror", "Miroir rapide Home / premier affichage", historyFinished ? "warn" : "skip", "Aucun miroir rapide Stats disponible."));
  }

  const headerIdentityStatus: StatsDiagnosticStatus = profile.id || profile.name ? (activeHeaderMatches > 0 ? "ok" : "warn") : "skip";
  checks.push(check(
    "profile-header-identity",
    "Identité du profil dans les en-têtes",
    headerIdentityStatus,
    profile.id || profile.name
      ? `${activeHeaderMatches} partie(s) reconnue(s) dans les en-têtes, dont ${activeHeaderX01} X01 · profil=${profile.name || "—"} (${profile.id || "ID absent"}).`
      : "Aucun profil actif identifiable pour comparer les parties.",
  ));

  let deepInfo: StatsSystemDiagnosticReport["history"]["deep"] | undefined;
  let activeDeepX01: number | null = null;
  let activeDeepX01ByExactId: number | null = null;
  let activeDeepX01ByName: number | null = null;

  if (deep) {
    const maxDeepRows = Math.max(1, Math.min(300, Number(options.maxDeepRows || 180) || 180));
    const candidates = x01Rows.slice(0, maxDeepRows);
    const failures: Array<{ id: string; error: string }> = [];
    const slowest: Array<{ id: string; ms: number; matched: boolean; path?: string }> = [];
    const identityPaths: Record<string, number> = {};
    let exactIdMatches = 0;
    let nameMatches = 0;
    let anyIdentityMatches = 0;
    let rowsWithoutPlayerIdentity = 0;
    let durationTotal = 0;
    let maxMs = 0;

    onProgress?.({ phase: "deep", current: 0, total: candidates.length, detail: "Hydratation X01 partie par partie…" });
    for (let i = 0; i < candidates.length; i += 1) {
      const light = candidates[i];
      const id = String(light?.id || light?.matchId || "").trim();
      const started = nowMs();
      let full: any = light;
      let error = "";
      try {
        if (id) full = (await History.get(id)) || light;
      } catch (e: any) {
        error = String(e?.message || e || "lecture impossible").slice(0, 240);
        failures.push({ id, error });
      }
      const ms = Math.round((nowMs() - started) * 10) / 10;
      durationTotal += ms;
      maxMs = Math.max(maxMs, ms);
      const hit = inspectPlayerMatch(full, profile.id, profile.name);
      if (!hit.identityPresent) rowsWithoutPlayerIdentity += 1;
      if (hit.exactId) exactIdMatches += 1;
      if (hit.byName) nameMatches += 1;
      if (hit.matched) {
        anyIdentityMatches += 1;
        if (hit.path) addCount(identityPaths, hit.path);
      }
      slowest.push({ id, ms, matched: hit.matched, ...(hit.path ? { path: hit.path } : {}) });
      onProgress?.({ phase: "deep", current: i + 1, total: candidates.length, detail: id ? `${i + 1}/${candidates.length} · ${id.slice(0, 18)}` : `${i + 1}/${candidates.length}` });
      if (i + 1 < candidates.length) await new Promise<void>((resolve) => setTimeout(resolve, 4));
    }

    deepInfo = {
      tested: candidates.length,
      failed: failures.length,
      avgMs: candidates.length ? Math.round((durationTotal / candidates.length) * 10) / 10 : 0,
      maxMs,
      exactIdMatches,
      nameMatches,
      anyIdentityMatches,
      rowsWithoutPlayerIdentity,
      identityPaths,
      failures: failures.slice(0, 30),
      slowest: slowest.sort((a, b) => b.ms - a.ms).slice(0, 20),
    };
    activeDeepX01 = anyIdentityMatches;
    activeDeepX01ByExactId = exactIdMatches;
    activeDeepX01ByName = nameMatches;
    timingsMs.deepX01Scan = Math.round(durationTotal * 10) / 10;

    checks.push(check(
      "x01-decode",
      "X01 — hydratation des payloads",
      failures.length ? "fail" : "ok",
      `${candidates.length} X01 testée(s) · ${failures.length} erreur(s) · moyenne ${deepInfo.avgMs} ms · max ${maxMs} ms.`,
      deepInfo,
    ));

    if (profile.id || profile.name) {
      const legacyGap = Math.max(0, anyIdentityMatches - exactIdMatches);
      checks.push(check(
        "x01-profile-identity",
        "X01 — rattachement au profil actif",
        anyIdentityMatches === 0 && x01Rows.length ? "fail" : legacyGap > 0 ? "warn" : "ok",
        `${anyIdentityMatches}/${candidates.length} X01 rattachée(s) au profil · ID exact=${exactIdMatches} · nom=${nameMatches}${legacyGap ? ` · ${legacyGap} partie(s) dépendent d’un alias/nom.` : ""}`,
        { anyIdentityMatches, exactIdMatches, nameMatches, identityPaths, rowsWithoutPlayerIdentity },
      ));
    }
  } else {
    checks.push(check("x01-decode", "X01 — hydratation des payloads", "skip", "Non exécuté en analyse rapide. Utilise TEST COMPLET pour vérifier chaque X01."));
  }

  const ui = options.uiSnapshot || null;
  const uiNormalized = ui && Number.isFinite(Number(ui.normalizedMatches)) ? Number(ui.normalizedMatches) : null;
  const uiSelected = ui && Number.isFinite(Number(ui.selectedMatches)) ? Number(ui.selectedMatches) : null;
  if (ui) {
    const uiLoss = uiNormalized != null && historyFinished > 0 && uiNormalized < Math.floor(historyFinished * 0.75);
    checks.push(check(
      "stats-ui",
      "Stats Center — données réellement visibles",
      uiLoss ? "fail" : "ok",
      `UI normalisée=${uiNormalized ?? "—"} · matchs du profil=${uiSelected ?? "—"} · historique terminé=${historyFinished} · onglet=${String(ui.currentMode || "—")}.`,
      ui,
    ));
  } else {
    checks.push(check("stats-ui", "Stats Center — données réellement visibles", "skip", "Snapshot UI non fourni."));
  }

  // Diagnostic synthesis: locate the first stage where counts diverge.
  if (storage && Number(storage.headerRows || 0) < historyFinished) {
    diagnosis.push({ severity: "critical", code: "storage-before-history-loss", message: `Le stockage ne contient que ${storage.headerRows} header(s) pour ${historyFinished} partie(s) terminée(s) visibles.` });
  }
  if (idx && Number(idxFinished || 0) !== historyFinished) {
    diagnosis.push({ severity: "critical", code: "history-to-index-loss", message: `La perte se situe entre History et l’index Stats : ${historyFinished} partie(s) terminée(s) dans History contre ${idxFinished} dans l’index.` });
  }
  if (idx && idxX01 !== x01Rows.length) {
    diagnosis.push({ severity: "critical", code: "x01-index-loss", message: `Le moteur X01 indexe ${idxX01} partie(s) alors que l’Historique en contient ${x01Rows.length}.` });
  }
  if (deepInfo && deepInfo.anyIdentityMatches > deepInfo.exactIdMatches) {
    diagnosis.push({ severity: "warn", code: "legacy-profile-identity", message: `${deepInfo.anyIdentityMatches - deepInfo.exactIdMatches} X01 du profil ne reposent pas sur son ID exact et nécessitent le rapprochement par nom/alias.` });
  }
  if (deepInfo && deepInfo.failed > 0) {
    diagnosis.push({ severity: "critical", code: "history-payload-decode", message: `${deepInfo.failed} payload(s) X01 ne peuvent pas être relus correctement.` });
  }
  if (uiNormalized != null && idxFinished != null && uiNormalized < idxFinished) {
    diagnosis.push({ severity: "warn", code: "index-to-ui-loss", message: `L’index contient ${idxFinished} partie(s) mais StatsHub n’en a normalisé que ${uiNormalized} : le filtre/hydratation UI élimine encore des lignes.` });
  }
  if (quick && idxActive && Number(quickActive?.matches || 0) !== Number(idxActive?.matches || 0)) {
    diagnosis.push({ severity: "warn", code: "quick-mirror-stale", message: `Le miroir rapide (${Number(quickActive?.matches || 0)}) et l’index (${Number(idxActive?.matches || 0)}) divergent pour le profil actif.` });
  }
  if (dirty) diagnosis.push({ severity: "warn", code: "stats-index-dirty", message: "L’index est marqué dirty : un écran peut afficher l’ancien cache avant la reconstruction." });
  if (!diagnosis.length) diagnosis.push({ severity: "info", code: "pipeline-consistent", message: "Aucune rupture chiffrée évidente n’a été détectée dans le pipeline contrôlé." });

  const summary = checks.reduce((acc, row) => {
    acc[row.status] += 1;
    acc.total += 1;
    return acc;
  }, { ok: 0, warn: 0, fail: 0, skip: 0, total: 0 });

  const report: StatsSystemDiagnosticReport = {
    version: "stats-diagnostic-v124",
    generatedAt: new Date().toISOString(),
    deep,
    traceEnabled: isStatsDiagnosticTraceEnabled(),
    profile,
    summary,
    pipeline: {
      storageRows: storage ? Number(storage.headerRows || storage.rows || 0) : null,
      historyRows: rows.length,
      historyFinished,
      historyInProgress,
      historyX01: x01Rows.length,
      activeHeaderMatches,
      activeHeaderX01,
      activeDeepX01,
      activeDeepX01ByExactId,
      activeDeepX01ByName,
      statsIndexRows: idx ? Number((idx as any)?.totals?.matches || 0) : null,
      statsIndexFinished: idxFinished,
      statsIndexX01: idx ? idxX01 : null,
      statsIndexActiveMatches: idxActive ? Number(idxActive?.matches || 0) : null,
      quickMirrorActiveMatches: quickActive ? Number(quickActive?.matches || 0) : null,
      uiNormalizedMatches: uiNormalized,
      uiSelectedMatches: uiSelected,
    },
    checks,
    diagnosis,
    timingsMs,
    history: {
      statusCounts,
      modeCounts,
      duplicateIds,
      missingHeaderPlayers,
      x01Rows: x01Rows.length,
      ...(deepInfo ? { deep: deepInfo } : {}),
    },
    index: {
      present: !!idx,
      ...(idx ? {
        version: Number((idx as any)?.version || 0),
        rebuiltAt: Number((idx as any)?.rebuiltAt || 0),
        source: String((idx as any)?.meta?.source || ""),
        rowsScanned: Number((idx as any)?.meta?.rowsScanned || 0),
        dirty,
        byMode: Object.fromEntries(Object.entries((idx as any)?.byMode || {}).map(([key, value]: [string, any]) => [key, Number(value?.matches || 0)])),
        active: idxActive,
      } : { dirty }),
    },
    quickMirror: {
      present: !!quick,
      ...(quick ? { updatedAt: Number(quick.updatedAt || 0), active: quickActive } : {}),
    },
    storage,
    ui,
    trace: readStatsDiagnosticTrace().slice(-120),
  };

  persistReport(report);
  recordStatsDiagnosticEvent("diagnostic.complete", {
    deep,
    summary,
    pipeline: report.pipeline,
    diagnosis: diagnosis.map((item) => ({ severity: item.severity, code: item.code })),
  }, true);
  onProgress?.({ phase: "done", detail: `Diagnostic terminé · ${summary.fail} échec(s) · ${summary.warn} alerte(s)` });
  return report;
}
