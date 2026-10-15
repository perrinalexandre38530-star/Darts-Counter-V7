import * as React from "react";
import {
  estimateBrowserStorage,
  formatStorageBytes,
  getStorageDestination,
  loadStoragePrefs,
} from "../../lib/storagePlans";
import { getExternalBackupStatus } from "../../lib/externalBackupTarget";
import { getPersonalCloudBackupMeta, getPersonalCloudStatus } from "../../lib/personalCloudApi";
import { listCloudVaultBackups } from "../../lib/cloudStorageApi";
import { listLocalMemorySlots, listNasMemorySlots } from "../../lib/storageVault";
import { computeNasSyncSummary, getNasSyncState } from "../../lib/manualNasSync";
import {
  getIncrementalBackupStats,
  listUnsyncedIncrementalChanges,
} from "../../lib/incrementalBackupJournal";
import { useBackgroundBackupState } from "../../lib/backgroundBackup";
import { useBackgroundRestoreState } from "../../lib/backgroundRestore";

type Props = { theme: any };
type Level = "ok" | "warn" | "fail" | "info";
type Check = { id: string; label: string; level: Level; detail: string };

const REPORT_KEY = "dc_backup_diagnostic_report_v126";

function readSavedReport(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function dateMs(value: any): number {
  const candidates = [
    value?.updatedAt,
    value?.updated_at,
    value?.createdAt,
    value?.created_at,
    value?.exportedAt,
    value?.metadata?.exportedAt,
    value?.metadata?.createdAt,
  ];
  for (const candidate of candidates) {
    const n = Date.parse(String(candidate || ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function latestOf<T = any>(rows: T[]): T | null {
  if (!Array.isArray(rows) || !rows.length) return null;
  return [...rows].sort((a: any, b: any) => dateMs(b) - dateMs(a))[0] || null;
}

function fmtDate(value: any): string {
  const ms = typeof value === "number" ? value : Date.parse(String(value || ""));
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  try {
    return new Date(ms).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function backupSummary(value: any): any | null {
  const candidates = [
    value?.summary,
    value?.__summary,
    value?.metadata?.summary,
    value?.metadata_json?.summary,
    value?.metadata?.vaultSummary,
    value?.metadata_json?.vaultSummary,
  ];
  return candidates.find((row) => row && typeof row === "object") || null;
}

function normalizeCounts(summary: any): Record<string, number> {
  const n = (value: any) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  return {
    profiles: n(summary?.profiles ?? summary?.totalProfiles),
    history: n(summary?.matches ?? summary?.historyRows ?? summary?.history),
    stats: n(summary?.statsMatches ?? summary?.statsBlocks),
    x01: n(summary?.x01Matches),
    teams: n(summary?.teams),
    dartSets: n(summary?.dartsets ?? summary?.dartSets),
  };
}

function errorText(error: any): string {
  return String(error?.message || error || "Erreur inconnue").trim();
}

async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timer: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`Délai dépassé (${Math.round(ms / 1000)} s)`)), ms);
      }),
    ]);
  } finally {
    if (timer != null) window.clearTimeout(timer);
  }
}

function statusColor(level: Level): string {
  if (level === "ok") return "#7ee787";
  if (level === "warn") return "#f6c85f";
  if (level === "fail") return "#ff7b88";
  return "#8bdcff";
}

function statusIcon(level: Level): string {
  if (level === "ok") return "✓";
  if (level === "warn") return "!";
  if (level === "fail") return "×";
  return "i";
}

export default function BackupDiagnosticsPanel({ theme }: Props) {
  const backupJob = useBackgroundBackupState();
  const restoreJob = useBackgroundRestoreState();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<any>(() => readSavedReport());

  async function analyse() {
    if (busy) return;
    setBusy(true);

    const errors: Record<string, string> = {};
    const prefs = loadStoragePrefs();
    const destination = getStorageDestination(prefs.selectedDestination);

    const browserStorage = await estimateBrowserStorage().catch((error) => {
      errors.browserStorage = errorText(error);
      return { usage: 0, quota: 0, free: 0 };
    });

    const external = await getExternalBackupStatus().catch((error) => {
      errors.external = errorText(error);
      return null;
    });

    const localSlots = await Promise.resolve(listLocalMemorySlots()).catch((error) => {
      errors.local = errorText(error);
      return [] as any[];
    });

    const nasState = getNasSyncState();
    const nasSlots = await withTimeout(Promise.resolve(listNasMemorySlots()), 8000).catch((error) => {
      errors.nas = errorText(error);
      return [] as any[];
    });

    const currentSummary = await withTimeout(Promise.resolve(computeNasSyncSummary()), 8000).catch((error) => {
      errors.currentSummary = errorText(error);
      return null;
    });

    const googleDriveStatus = await withTimeout(getPersonalCloudStatus("google_drive"), 8000).catch((error) => {
      errors.googleDrive = errorText(error);
      return null;
    });

    const googleDriveBackup = googleDriveStatus?.connected
      ? await withTimeout(getPersonalCloudBackupMeta("google_drive"), 8000).catch((error) => {
          errors.googleDriveBackup = errorText(error);
          return null;
        })
      : null;

    const r2Slots = await withTimeout(listCloudVaultBackups(2, false), 8000).catch((error) => {
      errors.r2 = errorText(error);
      return [] as any[];
    });

    const incrementalStats = await getIncrementalBackupStats().catch((error) => {
      errors.incremental = errorText(error);
      return null;
    });

    const [nasPending, drivePending] = await Promise.all([
      listUnsyncedIncrementalChanges("nas").catch((error) => {
        errors.incrementalNas = errorText(error);
        return [];
      }),
      listUnsyncedIncrementalChanges("google_drive").catch((error) => {
        errors.incrementalDrive = errorText(error);
        return [];
      }),
    ]);

    const localLatest = latestOf(localSlots as any[]);
    const nasLatest = latestOf(nasSlots as any[]);
    const r2Latest = latestOf(r2Slots as any[]);
    const checks: Check[] = [];
    const add = (id: string, label: string, level: Level, detail: string) => checks.push({ id, label, level, detail });

    add(
      "local",
      "Mémoire locale",
      errors.local ? "fail" : localSlots.length ? "ok" : "warn",
      errors.local || `${localSlots.length} sauvegarde(s) locale(s) · dernière ${fmtDate(localLatest?.updatedAt || localLatest?.createdAt)}`,
    );

    const nasSelected = prefs.selectedDestination === "founder_nas";
    add(
      "nas",
      "NAS",
      errors.nas ? (nasSelected ? "fail" : "warn") : nasSlots.length ? "ok" : nasSelected ? "warn" : "info",
      errors.nas || `${nasSlots.length} snapshot(s) · ${nasState.dirty ? "modifications locales en attente" : "journal propre"}`,
    );

    const driveSelected = prefs.selectedDestination === "google_drive";
    add(
      "drive",
      "Google Drive",
      errors.googleDrive ? (driveSelected ? "fail" : "warn") : googleDriveStatus?.connected ? "ok" : driveSelected ? "fail" : "info",
      errors.googleDrive || (googleDriveStatus?.connected
        ? `Connecté${googleDriveBackup ? ` · backup ${fmtDate(googleDriveBackup?.updatedAt || googleDriveBackup?.createdAt)}` : " · aucun backup détecté"}`
        : "Non connecté"),
    );

    const r2Selected = prefs.selectedDestination === "cloud_r2";
    add(
      "r2",
      "Cloud R2",
      errors.r2 ? (r2Selected ? "fail" : "warn") : r2Slots.length ? "ok" : r2Selected ? "warn" : "info",
      errors.r2 || `${r2Slots.length} checkpoint(s) actif(s)`,
    );

    const externalSelected = ["device_file", "external_sd_manual", "personal_cloud_manual"].includes(String(prefs.selectedDestination));
    add(
      "external",
      "Fichier / SD / USB",
      errors.external ? (externalSelected ? "fail" : "warn") : external?.configured && external?.permission === "granted" ? "ok" : externalSelected ? "warn" : "info",
      errors.external || (external?.configured
        ? `${external.fileName || "cible mémorisée"} · permission ${external.permission || "inconnue"}`
        : "Aucune cible externe mémorisée"),
    );

    const pendingForActive = nasSelected ? nasPending.length : driveSelected ? drivePending.length : 0;
    add(
      "incremental",
      "Mode incrémental",
      errors.incremental ? "warn" : pendingForActive > 50 ? "warn" : "ok",
      errors.incremental || `NAS ${nasPending.length} changement(s) · Drive ${drivePending.length} changement(s) · checkpoint ${fmtDate(incrementalStats?.lastCheckpointAt)}`,
    );

    if (backupJob.status !== "idle") {
      add(
        "backup-progress",
        "Progression sauvegarde",
        backupJob.status === "error" ? "fail" : backupJob.status === "success" ? "ok" : "info",
        `${backupJob.progress}% · ${backupJob.message || backupJob.status}`,
      );
    }
    if (restoreJob.status !== "idle") {
      add(
        "restore-progress",
        "Progression restauration",
        restoreJob.status === "error" ? "fail" : restoreJob.status === "success" ? "ok" : "info",
        `${restoreJob.progress}% · ${restoreJob.phase || "phase inconnue"} · ${restoreJob.message || restoreJob.status}`,
      );
    }

    const next = {
      version: "v126",
      generatedAt: new Date().toISOString(),
      selectedDestination: prefs.selectedDestination,
      destinationLabel: destination?.shortLabel || destination?.label || prefs.selectedDestination,
      preferences: prefs,
      browserStorage,
      current: {
        summary: currentSummary,
        counts: normalizeCounts(currentSummary),
      },
      local: {
        slots: localSlots.length,
        latestAt: localLatest?.updatedAt || localLatest?.createdAt || null,
        latestSummary: backupSummary(localLatest),
        latestCounts: normalizeCounts(backupSummary(localLatest)),
      },
      nas: {
        slots: nasSlots.length,
        state: nasState,
        latestAt: nasLatest?.updatedAt || nasLatest?.createdAt || null,
        latestSummary: backupSummary(nasLatest),
        latestCounts: normalizeCounts(backupSummary(nasLatest)),
      },
      googleDrive: {
        status: googleDriveStatus,
        latest: googleDriveBackup,
        latestSummary: backupSummary(googleDriveBackup),
        latestCounts: normalizeCounts(backupSummary(googleDriveBackup)),
      },
      r2: {
        slots: r2Slots.length,
        latestAt: r2Latest?.updated_at || r2Latest?.created_at || r2Latest?.updatedAt || r2Latest?.createdAt || null,
        latestSummary: backupSummary(r2Latest),
        latestCounts: normalizeCounts(backupSummary(r2Latest)),
      },
      external,
      incremental: {
        stats: incrementalStats,
        nasPending: nasPending.length,
        googleDrivePending: drivePending.length,
      },
      progress: {
        backup: backupJob,
        restore: restoreJob,
      },
      checks,
      errors,
    };

    setReport(next);
    try { window.localStorage.setItem(REPORT_KEY, JSON.stringify(next)); } catch {}
    setBusy(false);
  }

  async function copyReport() {
    const payload = {
      ...(report || {}),
      copiedAt: new Date().toISOString(),
      liveProgress: { backup: backupJob, restore: restoreJob },
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Diagnostic Sauvegardes copié.");
    } catch {
      window.alert(text);
    }
  }

  const flatCard: React.CSSProperties = {
    border: `1px solid ${theme.borderSoft}`,
    borderRadius: 12,
    background: "rgba(0,0,0,.22)",
    padding: 10,
  };

  const checks: Check[] = Array.isArray(report?.checks) ? report.checks : [];

  const ProgressRow = ({ label, state, phase }: { label: string; state: any; phase?: string | null }) => {
    if (!state || state.status === "idle") return null;
    const level: Level = state.status === "error" ? "fail" : state.status === "success" ? "ok" : "info";
    const pct = Math.max(0, Math.min(100, Number(state.progress || 0)));
    return (
      <div style={flatCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ color: theme.text, fontWeight: 900, fontSize: 11.5 }}>{label}</div>
          <div style={{ color: statusColor(level), fontWeight: 900, fontSize: 10 }}>{pct}%</div>
        </div>
        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)", marginTop: 7 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: statusColor(level), transition: "width .2s ease" }} />
        </div>
        <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 9.8, lineHeight: 1.35 }}>
          {phase ? `${phase} · ` : ""}{state.message || state.status}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ ...flatCard, background: "rgba(255,255,255,.025)" }}>
        <div style={{ color: theme.text, fontWeight: 950, fontSize: 13 }}>Sauvegardes / restaurations</div>
        <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 10.2, lineHeight: 1.4 }}>
          Lecture seule : NAS, Drive, R2, mémoire locale, SD / fichier, journal incrémental et progression des opérations.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}>
          <button
            type="button"
            onClick={() => void analyse()}
            disabled={busy}
            style={{ minHeight: 38, borderRadius: 10, border: `1px solid ${theme.primary}70`, background: "rgba(255,255,255,.035)", color: theme.primary, fontWeight: 950, fontSize: 10.5, cursor: busy ? "wait" : "pointer", opacity: busy ? .65 : 1 }}
          >
            {busy ? "ANALYSE…" : "ANALYSER"}
          </button>
          <button
            type="button"
            onClick={() => void copyReport()}
            disabled={!report}
            style={{ minHeight: 38, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.text, fontWeight: 900, fontSize: 10.5, cursor: report ? "pointer" : "default", opacity: report ? 1 : .5 }}
          >
            COPIER RAPPORT
          </button>
        </div>
      </div>

      <ProgressRow label="Sauvegarde" state={backupJob} />
      <ProgressRow label="Restauration" state={restoreJob} phase={restoreJob?.phase} />

      {report ? (
        <>
          <div style={flatCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div>
                <div style={{ color: theme.textSoft, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: .8 }}>Destination active</div>
                <div style={{ marginTop: 2, color: theme.text, fontWeight: 950, fontSize: 12.5 }}>{report.destinationLabel || report.selectedDestination}</div>
              </div>
              <div style={{ color: theme.textSoft, fontSize: 9.5 }}>{fmtDate(report.generatedAt)}</div>
            </div>
            <div style={{ marginTop: 7, color: theme.textSoft, fontSize: 9.8 }}>
              Stockage navigateur : {formatStorageBytes(Number(report?.browserStorage?.usage || 0))} utilisés · {formatStorageBytes(Number(report?.browserStorage?.free || 0))} libres
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {checks.map((check) => (
              <div key={check.id} style={{ ...flatCard, display: "grid", gridTemplateColumns: "24px minmax(0,1fr)", gap: 8, alignItems: "start", padding: "9px 10px" }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", border: `1px solid ${statusColor(check.level)}55`, color: statusColor(check.level), fontSize: 12, fontWeight: 1000 }}>
                  {statusIcon(check.level)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: theme.text, fontSize: 11.2, fontWeight: 900 }}>{check.label}</div>
                  <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.8, lineHeight: 1.35, wordBreak: "break-word" }}>{check.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={flatCard}>
            <div style={{ color: theme.text, fontSize: 11.2, fontWeight: 900 }}>Contenu détecté</div>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5, color: theme.textSoft, fontSize: 9.8 }}>
              <div>History actuel : <b style={{ color: theme.text }}>{Number(report?.current?.counts?.history || 0)}</b></div>
              <div>Profils actuels : <b style={{ color: theme.text }}>{Number(report?.current?.counts?.profiles || 0)}</b></div>
              <div>Slots locaux : <b style={{ color: theme.text }}>{Number(report?.local?.slots || 0)}</b></div>
              <div>Snapshots NAS : <b style={{ color: theme.text }}>{Number(report?.nas?.slots || 0)}</b></div>
              <div>Delta NAS : <b style={{ color: theme.text }}>{Number(report?.incremental?.nasPending || 0)}</b></div>
              <div>Delta Drive : <b style={{ color: theme.text }}>{Number(report?.incremental?.googleDrivePending || 0)}</b></div>
            </div>
          </div>

          <details style={{ ...flatCard, color: theme.textSoft }}>
            <summary style={{ cursor: "pointer", color: theme.text, fontWeight: 900, fontSize: 10.5 }}>Rapport JSON</summary>
            <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 9, lineHeight: 1.35 }}>{JSON.stringify(report, null, 2)}</pre>
          </details>
        </>
      ) : (
        <div style={{ ...flatCard, color: theme.textSoft, fontSize: 10.2, lineHeight: 1.4 }}>
          Lance « ANALYSER » pour contrôler les différentes destinations sans créer, supprimer ni restaurer de sauvegarde.
        </div>
      )}
    </div>
  );
}
