export type ClosestCenterDiagnosticLevel = "info" | "ok" | "warn" | "reject";
export type ClosestCenterDiagnosticStage = "baseline" | "preflight" | "analysis" | "reread" | "validation" | "round";

export type ClosestCenterDiagnosticEntry = {
  id: string;
  at: number;
  sessionId: string;
  round: number;
  playerId?: string | null;
  playerName?: string | null;
  stage: ClosestCenterDiagnosticStage;
  level: ClosestCenterDiagnosticLevel;
  code: string;
  message: string;
  metrics?: Record<string, number | string | boolean | null | undefined>;
};

const KEY = "dc_closest_center_camera_diagnostics_v1";
const LIMIT = 160;

function safeParse(raw: string | null): ClosestCenterDiagnosticEntry[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(Boolean).slice(-LIMIT) : [];
  } catch {
    return [];
  }
}

export function loadClosestCenterDiagnostics(): ClosestCenterDiagnosticEntry[] {
  try { return safeParse(window.localStorage.getItem(KEY)); } catch { return []; }
}

export function appendClosestCenterDiagnostic(entry: Omit<ClosestCenterDiagnosticEntry, "id" | "at"> & Partial<Pick<ClosestCenterDiagnosticEntry, "id" | "at">>) {
  const normalized: ClosestCenterDiagnosticEntry = {
    ...entry,
    id: entry.id || `ccdiag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at || Date.now(),
  };
  try {
    const next = [...loadClosestCenterDiagnostics(), normalized].slice(-LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dc:closest-center-diagnostic", { detail: normalized }));
  } catch {}
  return normalized;
}

export function clearClosestCenterDiagnostics() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("dc:closest-center-diagnostics-cleared"));
  } catch {}
}

export function summarizeClosestCenterDiagnostics(entries: ClosestCenterDiagnosticEntry[]) {
  const list = entries || [];
  const rejected = list.filter(x => x.level === "reject").length;
  const warnings = list.filter(x => x.level === "warn").length;
  const rereads = list.filter(x => x.stage === "reread" && (x.level === "ok" || x.level === "warn")).length;
  const accepted = list.filter(x => x.stage === "validation" && x.level === "ok").length;
  return { total: list.length, rejected, warnings, rereads, accepted };
}


export type ClosestCenterQualityReport = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  accepted: number;
  rejected: number;
  warnings: number;
  rereads: number;
  avgUncertaintyMm: number | null;
  avgFrameAgreement: number | null;
  manualOwners: number;
  rounds: Array<{ round:number; accepted:number; rejected:number; warnings:number; rereads:number; avgUncertaintyMm:number | null; qualityScore:number }>;
  rejectionReasons: Array<{ code:string; count:number }>;
};

function metricNumber(entry: ClosestCenterDiagnosticEntry, key: string): number | null {
  const value = entry.metrics?.[key];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function qualityScoreFor(entries: ClosestCenterDiagnosticEntry[]) {
  const summary = summarizeClosestCenterDiagnostics(entries);
  const validations = entries.filter(x => x.stage === "validation" && x.level === "ok");
  const uncertainties = validations.map(x => metricNumber(x, "avgUncertaintyMm")).filter((x): x is number => x != null);
  const frameAgreement = entries.map(x => metricNumber(x, "avgFrameAgreement")).filter((x): x is number => x != null);
  const accepted = Math.max(1, summary.accepted);
  const rejectPenalty = Math.min(42, (summary.rejected / accepted) * 16);
  const warningPenalty = Math.min(18, (summary.warnings / accepted) * 5);
  const rereadPenalty = Math.min(10, (summary.rereads / accepted) * 2);
  const uncertainty = avg(uncertainties);
  const uncertaintyPenalty = uncertainty == null ? 0 : Math.max(0, Math.min(20, (uncertainty - .45) * 7));
  const agreement = avg(frameAgreement);
  const agreementPenalty = agreement == null ? 0 : Math.max(0, Math.min(10, (.92 - agreement) * 50));
  return Math.max(0, Math.min(100, Math.round(100 - rejectPenalty - warningPenalty - rereadPenalty - uncertaintyPenalty - agreementPenalty)));
}

export function buildClosestCenterQualityReport(entries: ClosestCenterDiagnosticEntry[]): ClosestCenterQualityReport {
  const list = entries || [];
  const summary = summarizeClosestCenterDiagnostics(list);
  const validations = list.filter(x => x.stage === "validation" && x.level === "ok");
  const uncertainties = validations.map(x => metricNumber(x, "avgUncertaintyMm")).filter((x): x is number => x != null);
  const frameAgreement = list.map(x => metricNumber(x, "avgFrameAgreement")).filter((x): x is number => x != null);
  const manualOwners = validations.reduce((sum, x) => sum + (metricNumber(x, "manualOwners") || 0), 0);
  const score = qualityScoreFor(list);
  const grade: ClosestCenterQualityReport["grade"] = score >= 90 ? "A" : score >= 78 ? "B" : score >= 64 ? "C" : "D";

  const roundIds = Array.from(new Set(list.map(x => Number(x.round)).filter(Number.isFinite))).sort((a,b) => a-b);
  const rounds = roundIds.map(round => {
    const rows = list.filter(x => Number(x.round) === round);
    const s = summarizeClosestCenterDiagnostics(rows);
    const u = rows.filter(x => x.stage === "validation" && x.level === "ok").map(x => metricNumber(x, "avgUncertaintyMm")).filter((x): x is number => x != null);
    return { round, accepted:s.accepted, rejected:s.rejected, warnings:s.warnings, rereads:s.rereads, avgUncertaintyMm:avg(u), qualityScore:qualityScoreFor(rows) };
  });

  const reasonCounts = new Map<string, number>();
  list.filter(x => x.level === "reject").forEach(x => reasonCounts.set(x.code, (reasonCounts.get(x.code) || 0) + 1));
  const rejectionReasons = Array.from(reasonCounts.entries()).map(([code,count]) => ({code,count})).sort((a,b) => b.count-a.count || a.code.localeCompare(b.code));

  return {
    score, grade, accepted:summary.accepted, rejected:summary.rejected, warnings:summary.warnings, rereads:summary.rereads,
    avgUncertaintyMm:avg(uncertainties), avgFrameAgreement:avg(frameAgreement), manualOwners, rounds, rejectionReasons,
  };
}
