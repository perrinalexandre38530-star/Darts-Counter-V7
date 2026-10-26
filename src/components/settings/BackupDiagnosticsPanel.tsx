import React from "react";
import { loadStoragePrefs, formatStorageBytes, estimateBrowserStorage } from "../../lib/storagePlans";
import { getExternalBackupStatus } from "../../lib/externalBackupTarget";
import { getBackgroundBackupState, subscribeBackgroundBackup, type BackgroundBackupState } from "../../lib/backgroundBackup";
import { getBackgroundRestoreState, subscribeBackgroundRestore, type BackgroundRestoreState } from "../../lib/backgroundRestore";
import { getIncrementalBackupStats, listUnsyncedIncrementalChanges } from "../../lib/incrementalBackupJournal";
import { getNasSyncState } from "../../lib/manualNasSync";
import { getPersonalCloudStatus } from "../../lib/personalCloudApi";
import { getDirectR2Status, getDirectR2Usage } from "../../lib/directR2BackupApi";
import { clearBackupPerfEvents, readBackupPerfEvents, summarizeBackupPerfEvents, type BackupPerfEvent } from "../../lib/backupPerformanceDiagnostics";
import { shouldAttemptRemoteWork } from "../../lib/offlineFirstRuntime";
import { getGlobalSyncState } from "../../lib/sync/syncOrchestrator";

const REPORT_KEY = "dc_backup_diagnostic_report_v140";

type ThemeLike = {
  text?: string;
  textSoft?: string;
  primary?: string;
  borderSoft?: string;
};

type DiagnosticCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "info";
  detail: string;
  data?: any;
};

type BackupDiagnosticReport = {
  version: "v140";
  generatedAt: string;
  destination: string;
  checks: DiagnosticCheck[];
  background: {
    backup: BackgroundBackupState;
    restore: BackgroundRestoreState;
  };
  incremental: {
    journal: any;
    unsynced: Record<string, number>;
  };
  performance: {
    recent: BackupPerfEvent[];
    slowest: BackupPerfEvent[];
  };
  raw?: any;
};

function useBackgroundBackupState(): BackgroundBackupState {
  return React.useSyncExternalStore(subscribeBackgroundBackup, getBackgroundBackupState, getBackgroundBackupState);
}

function useBackgroundRestoreState(): BackgroundRestoreState {
  return React.useSyncExternalStore(subscribeBackgroundRestore, getBackgroundRestoreState, getBackgroundRestoreState);
}

function formatDate(value: unknown): string {
  const n = typeof value === "number" ? value : Date.parse(String(value || ""));
  if (!Number.isFinite(n) || n <= 0) return "—";
  try { return new Date(n).toLocaleString(); } catch { return "—"; }
}

function statusColor(status: DiagnosticCheck["status"]): string {
  if (status === "ok") return "#65e6a8";
  if (status === "warn") return "#ffd36a";
  if (status === "fail") return "#ff8a8a";
  return "#72dfff";
}

function parseStoredJson(key: string): any {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function BackupDiagnosticsPanel({ theme }: { theme: ThemeLike }) {
  const backup = useBackgroundBackupState();
  const restore = useBackgroundRestoreState();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<BackupDiagnosticReport | null>(() => parseStoredJson(REPORT_KEY));

  const text = theme.text || "#f4fbff";
  const soft = theme.textSoft || "#a8b8c6";
  const border = theme.borderSoft || "rgba(255,255,255,.12)";
  const primary = theme.primary || "#4de6ff";

  const run = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const checks: DiagnosticCheck[] = [];
      const prefs = loadStoragePrefs();
      const nas = getNasSyncState();
      const online = shouldAttemptRemoteWork();
      const globalSync = getGlobalSyncState();

      // WAVE 7 — LOCAL is the operational authority. Surface its real quota
      // first, before any cloud/provider checks.
      try {
        const local = await estimateBrowserStorage();
        let persisted: boolean | null = null;
        try { persisted = typeof navigator?.storage?.persisted === "function" ? await navigator.storage.persisted() : null; } catch {}
        const percent = local.quota > 0 ? (local.usage / local.quota) * 100 : 0;
        const status: DiagnosticCheck["status"] = percent >= 95 ? "fail" : percent >= 85 ? "warn" : "ok";
        checks.push({
          id: "local",
          label: "LOCAL / IndexedDB",
          status,
          detail: `${formatStorageBytes(local.usage)} utilisés · ${formatStorageBytes(local.free)} libres${local.quota ? ` · ${percent.toFixed(1)}% du quota` : ""}${persisted === true ? " · stockage persistant" : persisted === false ? " · persistance non garantie" : ""}`,
          data: { ...local, percentUsed: percent, persisted },
        });
      } catch (error: any) {
        checks.push({ id: "local", label: "LOCAL / IndexedDB", status: "warn", detail: String(error?.message || error || "Quota local indisponible") });
      }

      checks.push({
        id: "sync",
        label: "Synchronisation globale",
        status: !online ? "info" : globalSync.status === "backoff" ? "warn" : globalSync.status === "running" || globalSync.status === "scheduled" ? "info" : "ok",
        detail: !online
          ? "Mode hors ligne : aucune requête distante. Les files restent locales et seront reprises automatiquement."
          : `État ${globalSync.status} · dernier succès ${formatDate(globalSync.lastSuccessAt)}${globalSync.nextAttemptAt ? ` · prochain essai ${formatDate(globalSync.nextAttemptAt)}` : ""}`,
        data: globalSync,
      });

      let external: any = null;
      let drive: any = null;
      let r2Status: any = null;
      let r2Usage: any = null;
      let journal: any = null;
      const unsynced: Record<string, number> = {};
      const perf = summarizeBackupPerfEvents(100);

      try {
        external = await getExternalBackupStatus();
        checks.push({
          id: "external",
          label: "Fichier / SD / USB",
          status: external?.configured ? "ok" : external?.supported ? "info" : "warn",
          detail: external?.configured
            ? `${external.fileName || "Cible externe"} · permission ${external.permission || "inconnue"} · dernier export ${formatDate(external.lastSavedAt)}`
            : external?.supported
              ? "Sélecteur fichier disponible, aucune cible persistante configurée."
              : "Accès direct fichier/SD non disponible sur ce runtime ; export téléchargement utilisé en repli.",
          data: external,
        });
      } catch (error: any) {
        checks.push({ id: "external", label: "Fichier / SD / USB", status: "fail", detail: String(error?.message || error || "Diagnostic impossible") });
      }

      try {
        journal = await getIncrementalBackupStats();
        for (const provider of ["founder_nas", "google_drive", "cloud_r2", "onedrive", "dropbox"]) {
          try { unsynced[provider] = (await listUnsyncedIncrementalChanges(provider)).length; }
          catch { unsynced[provider] = -1; }
        }
        checks.push({
          id: "incremental",
          label: "Journal incrémental",
          status: "ok",
          detail: `${journal?.pending || 0} changement(s) journalisé(s) · checkpoint ${formatDate(journal?.lastCheckpointAt)}`,
          data: { journal, unsynced },
        });
      } catch (error: any) {
        checks.push({ id: "incremental", label: "Journal incrémental", status: "fail", detail: String(error?.message || error || "Lecture impossible") });
      }

      const nasUnsupported = (() => { try { return localStorage.getItem("dc_incremental_nas_unsupported_v1") === "1"; } catch { return false; } })();
      const nasSupported = (() => { try { return localStorage.getItem("dc_incremental_nas_supported_v1") === "1"; } catch { return false; } })();
      const lastIncrementalError = parseStoredJson("dc_incremental_remote_last_error_v1");
      checks.push({
        id: "nas",
        label: "NAS",
        status: nasUnsupported ? "warn" : nas.dirty ? "warn" : "ok",
        detail: nasUnsupported
          ? "Le runtime a marqué l’endpoint incrémental NAS comme indisponible."
          : `${nas.dirty ? "Modifications locales en attente" : "État local propre"} · dernier envoi ${formatDate(nas.lastPushAt)} · dernier pull ${formatDate(nas.lastPullAt)}${nasSupported ? " · incrémental confirmé" : ""}`,
        data: { ...nas, incrementalSupported: nasSupported, incrementalUnsupported: nasUnsupported, unsynced: unsynced.founder_nas, lastIncrementalError },
      });

      try {
        if (!online) {
          checks.push({ id: "drive", label: "Google Drive", status: "info", detail: `Hors ligne · ${Math.max(0, Number(unsynced.google_drive || 0))} changement(s) en attente locale.` });
        } else {
          drive = await getPersonalCloudStatus("google_drive");
          checks.push({
          id: "drive",
          label: "Google Drive",
          status: drive?.connected ? "ok" : drive?.configured ? "warn" : "info",
          detail: drive?.connected
            ? `Connecté${drive.accountLabel ? ` · ${drive.accountLabel}` : ""} · changements non envoyés ${Math.max(0, Number(unsynced.google_drive || 0))}`
            : drive?.configured ? "Configuré mais non connecté." : "Aucune connexion Google Drive active.",
            data: { ...drive, unsynced: unsynced.google_drive },
          });
        }
      } catch (error: any) {
        checks.push({ id: "drive", label: "Google Drive", status: "warn", detail: String(error?.message || error || "Statut Drive indisponible") });
      }

      try {
        if (!online) {
          checks.push({ id: "r2", label: "Cloud R2 PREMIUM", status: "info", detail: `Hors ligne · aucune écriture R2 · ${Math.max(0, Number(unsynced.cloud_r2 || 0))} changement(s) en attente locale.` });
        } else {
          r2Status = await getDirectR2Status();
          try { r2Usage = await getDirectR2Usage(); } catch {}
          checks.push({
          id: "r2",
          label: "Cloud R2",
          status: r2Status?.ok ? "ok" : "warn",
          detail: r2Status?.ok
            ? `Route R2 disponible${r2Usage ? ` · ${formatStorageBytes(Number(r2Usage.usedBytes || 0))} utilisés` : ""}`
            : String(r2Status?.error || "Route R2 non confirmée"),
            data: { status: r2Status, usage: r2Usage, unsynced: unsynced.cloud_r2 },
          });
        }
      } catch (error: any) {
        checks.push({ id: "r2", label: "Cloud R2", status: "warn", detail: String(error?.message || error || "Statut R2 indisponible") });
      }

      const bgBackup = getBackgroundBackupState();
      const bgRestore = getBackgroundRestoreState();
      checks.push({
        id: "progress",
        label: "Progression sauvegarde / restauration",
        status: bgBackup.status === "error" || bgRestore.status === "error" ? "warn" : "ok",
        detail: `Sauvegarde ${bgBackup.status} ${Math.round(bgBackup.progress || 0)}% · restauration ${bgRestore.status} ${Math.round(bgRestore.progress || 0)}%${bgRestore.phase ? ` · phase ${bgRestore.phase}` : ""}`,
        data: { backup: bgBackup, restore: bgRestore },
      });

      const slowest = perf.slowest[0] || null;
      const slowStatus: DiagnosticCheck["status"] = !slowest ? "info" : slowest.durationMs >= 10_000 ? "fail" : slowest.durationMs >= 3_000 ? "warn" : "ok";
      checks.push({
        id: "performance",
        label: "Performance réelle",
        status: slowStatus,
        detail: slowest
          ? `Étape la plus lente : ${slowest.phase} · ${(slowest.durationMs / 1000).toFixed(slowest.durationMs >= 1000 ? 1 : 2)} s · ${slowest.operation}. ${perf.recent.length} mesure(s) récente(s).`
          : "Aucune mesure encore enregistrée. Lance une sauvegarde/restauration puis relance ANALYSER.",
        data: { slowest: perf.slowest, recent: perf.recent },
      });

      const result: BackupDiagnosticReport = {
        version: "v140",
        generatedAt: new Date().toISOString(),
        destination: String(prefs.selectedDestination || "app_local"),
        checks,
        background: { backup: bgBackup, restore: bgRestore },
        incremental: { journal, unsynced },
        performance: { recent: perf.recent, slowest: perf.slowest },
        raw: {
          prefs,
          online,
          globalSync,
          external,
          nas,
          drive,
          r2Status,
          r2Usage,
          lastRestore: parseStoredJson("dc_last_manual_restore_v1"),
          lastIncrementalError,
        },
      };
      setReport(result);
      try { localStorage.setItem(REPORT_KEY, JSON.stringify(result)); } catch {}
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const copy = React.useCallback(async () => {
    if (!report) return;
    const txt = JSON.stringify(report, null, 2);
    try { await navigator.clipboard.writeText(txt); }
    catch {
      try { window.prompt("Copie le rapport :", txt); } catch {}
    }
  }, [report]);

  const clearPerf = React.useCallback(() => {
    clearBackupPerfEvents();
    setReport((current) => current ? { ...current, performance: { recent: [], slowest: [] }, checks: current.checks.filter((check) => check.id !== "performance") } : current);
  }, []);

  const formatDuration = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : `${Math.round(ms)} ms`;

  const renderProgress = (label: string, value: number, message: string, status: string) => {
    const pct = Math.max(0, Math.min(100, Math.round(Number(value || 0))));
    return (
      <div style={{ padding: "12px 0", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <strong style={{ color: text, fontSize: 12 }}>{label}</strong>
          <span style={{ color: status === "error" ? "#ff8a8a" : status === "running" ? primary : soft, fontSize: 11, fontWeight: 800 }}>{status.toUpperCase()} · {pct}%</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: status === "error" ? "#ff8a8a" : primary, transition: "width .2s ease" }} />
        </div>
        <div style={{ marginTop: 6, color: soft, fontSize: 10.5, lineHeight: 1.35 }}>{message || "Aucune opération en cours."}</div>
      </div>
    );
  };

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 14, background: "rgba(0,0,0,.18)", padding: 14 }}>
      <div style={{ color: text, fontWeight: 900, fontSize: 15 }}>Sauvegardes / restaurations</div>
      <div style={{ color: soft, fontSize: 11, lineHeight: 1.45, marginTop: 4 }}>
        Lecture seule : NAS, Google Drive, R2, fichier/SD/USB, journal incrémental et progression réelle des opérations.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void run()} disabled={busy} style={{ borderRadius: 10, border: `1px solid ${primary}70`, background: `${primary}12`, color: primary, padding: "9px 12px", fontWeight: 900, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "ANALYSE…" : "ANALYSER"}
        </button>
        <button type="button" onClick={() => void copy()} disabled={!report} style={{ borderRadius: 10, border: `1px solid ${border}`, background: "rgba(255,255,255,.03)", color: report ? text : soft, padding: "9px 12px", fontWeight: 800, cursor: report ? "pointer" : "default" }}>
          COPIER RAPPORT
        </button>
        <button type="button" onClick={clearPerf} style={{ borderRadius: 10, border: `1px solid ${border}`, background: "rgba(255,255,255,.03)", color: soft, padding: "9px 12px", fontWeight: 800, cursor: "pointer" }}>
          EFFACER MESURES
        </button>
      </div>

      <div style={{ marginTop: 12, borderTop: `1px solid ${border}` }}>
        {renderProgress("Sauvegarde", backup.progress, backup.message, backup.status)}
        {renderProgress("Restauration", restore.progress, `${restore.phase ? `[${restore.phase}] ` : ""}${restore.message || ""}`, restore.status)}
      </div>

      {report ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: soft, fontSize: 10.5, marginBottom: 8 }}>Rapport V132 · {formatDate(report.generatedAt)} · destination active : <b style={{ color: text }}>{report.destination}</b></div>
          {Array.isArray(report.performance?.recent) && report.performance.recent.length ? (
            <div style={{ marginBottom: 10, border: `1px solid ${border}`, borderRadius: 11, padding: 10, background: "rgba(255,255,255,.018)" }}>
              <div style={{ color: text, fontWeight: 900, fontSize: 11.5, marginBottom: 7 }}>TEMPS MESURÉS — dernières étapes</div>
              <div style={{ display: "grid", gap: 5 }}>
                {report.performance.recent.slice(0, 8).map((row) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: text, fontSize: 10.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.operation.toUpperCase()} · {row.phase}</div>
                      {row.detail ? <div style={{ color: soft, fontSize: 9.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.detail}</div> : null}
                    </div>
                    <div style={{ color: row.durationMs >= 10_000 ? "#ff8a8a" : row.durationMs >= 3_000 ? "#ffd36a" : "#65e6a8", fontWeight: 1000, fontSize: 10.5 }}>{formatDuration(row.durationMs)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 7 }}>
            {report.checks.map((check) => (
              <div key={check.id} style={{ border: `1px solid ${border}`, borderRadius: 11, padding: "10px 11px", background: "rgba(255,255,255,.018)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: statusColor(check.status), flex: "0 0 auto" }} />
                  <strong style={{ color: text, fontSize: 11.5 }}>{check.label}</strong>
                </div>
                <div style={{ marginTop: 5, color: soft, fontSize: 10.5, lineHeight: 1.4 }}>{check.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, color: soft, fontSize: 11 }}>Lance ANALYSER pour créer le premier rapport.</div>
      )}
    </div>
  );
}
