import React from "react";
import {
  clearLastStatsSystemDiagnosticReport,
  readLastStatsSystemDiagnosticReport,
  runStatsSystemDiagnostic,
  type StatsSystemDiagnosticReport,
} from "../../lib/statsSystemDiagnostics";
import {
  clearStatsDiagnosticTrace,
  isStatsDiagnosticTraceEnabled,
  readStatsDiagnosticTrace,
  setStatsDiagnosticTraceEnabled,
} from "../../lib/statsDiagnosticsTrace";

type Props = {
  profileId?: string | null;
  profileName?: string | null;
  uiSnapshot?: Record<string, any> | null;
  onReloadSources?: () => void;
};

const STATUS_COLOR: Record<string, string> = {
  ok: "#72ffad",
  warn: "#ffd36a",
  fail: "#ff8e8e",
  skip: "#9ca8b5",
};

export default function StatsSystemDiagnosticsPanel({ profileId, profileName, uiSnapshot, onReloadSources }: Props) {
  const [report, setReport] = React.useState<StatsSystemDiagnosticReport | null>(() => readLastStatsSystemDiagnosticReport());
  const [busy, setBusy] = React.useState<"fast" | "deep" | null>(null);
  const [progress, setProgress] = React.useState<{ phase: string; current?: number; total?: number; detail?: string } | null>(null);
  const [traceEnabled, setTraceEnabled] = React.useState(() => isStatsDiagnosticTraceEnabled());
  const [, forceRender] = React.useReducer((value) => value + 1, 0);

  const run = React.useCallback(async (deep: boolean) => {
    if (busy) return;
    setBusy(deep ? "deep" : "fast");
    setProgress({ phase: "start", detail: deep ? "Démarrage du test complet…" : "Démarrage de l’analyse…" });
    try {
      const next = await runStatsSystemDiagnostic({
        deep,
        activeProfileId: profileId,
        activeProfileName: profileName,
        uiSnapshot,
        maxDeepRows: 220,
        onProgress: setProgress,
      });
      setReport(next);
    } catch (error: any) {
      window.alert(`Diagnostic Stats impossible : ${String(error?.message || error || "erreur inconnue")}`);
    } finally {
      setBusy(null);
    }
  }, [busy, profileId, profileName, uiSnapshot]);

  const copy = React.useCallback(async () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Rapport Diagnostic Stats copié.");
    } catch {
      window.prompt("Copie ce diagnostic :", text);
    }
  }, [report]);

  const toggleTrace = React.useCallback(() => {
    const next = !traceEnabled;
    setStatsDiagnosticTraceEnabled(next);
    setTraceEnabled(next);
    forceRender();
  }, [traceEnabled]);

  const clearAll = React.useCallback(() => {
    clearLastStatsSystemDiagnosticReport();
    clearStatsDiagnosticTrace();
    setReport(null);
    setProgress(null);
    forceRender();
  }, []);

  const pipelineRows = report ? [
    ["IDB", report.pipeline.storageRows],
    ["History", report.pipeline.historyRows],
    ["Terminées", report.pipeline.historyFinished],
    ["X01 History", report.pipeline.historyX01],
    ["X01 profil header", report.pipeline.activeHeaderX01],
    ["X01 profil deep", report.pipeline.activeDeepX01],
    ["Index", report.pipeline.statsIndexFinished],
    ["X01 index", report.pipeline.statsIndexX01],
    ["Index profil", report.pipeline.statsIndexActiveMatches],
    ["Quick profil", report.pipeline.quickMirrorActiveMatches],
    ["UI normalisée", report.pipeline.uiNormalizedMatches],
    ["UI profil", report.pipeline.uiSelectedMatches],
  ] : [];

  const trace = readStatsDiagnosticTrace().slice(-12).reverse();
  const border = report?.summary.fail ? "rgba(255,110,110,.7)" : report?.summary.warn ? "rgba(255,211,106,.55)" : "rgba(72,220,255,.42)";

  return (
    <div style={{ position: "fixed", left: 10, right: 10, bottom: 136, zIndex: 9997, maxHeight: "68vh", overflow: "auto", background: "rgba(5,9,14,.985)", border: `1px solid ${border}`, borderRadius: 14, padding: 12, color: "#fff", fontSize: 11, boxShadow: "0 14px 40px rgba(0,0,0,.65)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div>
          <b style={{ color: "#66e8ff", fontSize: 13 }}>DIAGNOSTIC INTERNE STATS — PIPELINE COMPLET</b>
          <div style={{ marginTop: 3, opacity: .64, fontSize: 10.4 }}>IndexedDB → History → hydratation → index → cache rapide → Stats Center</div>
        </div>
        <span style={{ color: traceEnabled ? "#72ffad" : "#9ca8b5", fontWeight: 900 }}>{traceEnabled ? "TRACE ON" : "TRACE OFF"}</span>
      </div>

      <div style={{ padding: "8px 9px", border: "1px solid rgba(255,255,255,.10)", borderRadius: 10, background: "rgba(255,255,255,.025)", lineHeight: 1.45 }}>
        Ce diagnostic est <b>lecture seule</b>. Il compte les données à chaque étage et localise exactement l’endroit où des parties disparaissent. Le test complet ouvre aussi chaque payload X01 pour vérifier l’identité joueur et les erreurs de décodage.
      </div>

      <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 7 }}>
        <button type="button" disabled={!!busy} onClick={() => void run(false)} style={buttonStyle("#66e8ff", busy === "fast")}>{busy === "fast" ? "ANALYSE…" : "ANALYSER"}</button>
        <button type="button" disabled={!!busy} onClick={() => void run(true)} style={buttonStyle("#ffd36a", busy === "deep")}>{busy === "deep" ? "TEST COMPLET…" : "TEST COMPLET X01"}</button>
        <button type="button" disabled={!report || !!busy} onClick={() => void copy()} style={buttonStyle("#fff", false)}>COPIER RAPPORT</button>
        <button type="button" disabled={!!busy} onClick={toggleTrace} style={buttonStyle(traceEnabled ? "#72ffad" : "#bbb", false)}>{traceEnabled ? "ARRÊTER TRACE" : "ACTIVER TRACE"}</button>
        <button type="button" disabled={!!busy} onClick={() => onReloadSources?.()} style={buttonStyle("#9dd7ff", false)}>RECHARGER SOURCES</button>
        <button type="button" disabled={!!busy} onClick={clearAll} style={buttonStyle("#ff9c9c", false)}>EFFACER DIAG</button>
      </div>

      {progress && (busy || progress.phase === "done") ? (
        <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 9, border: "1px solid rgba(102,232,255,.18)", background: "rgba(0,80,110,.10)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: "#66e8ff" }}>{progress.phase.toUpperCase()}</b><span>{progress.current != null && progress.total != null ? `${progress.current}/${progress.total}` : ""}</span></div>
          <div style={{ marginTop: 3, opacity: .75 }}>{progress.detail || "Analyse en cours…"}</div>
          {busy === "deep" && progress.total ? <div style={{ marginTop: 6, height: 5, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(2, Math.min(100, ((progress.current || 0) / progress.total) * 100))}%`, background: "linear-gradient(90deg,#39d9ff,#ffd36a)" }}/></div> : null}
        </div>
      ) : null}

      {report ? (
        <>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            {[["OK", report.summary.ok, "ok"], ["WARN", report.summary.warn, "warn"], ["ÉCHEC", report.summary.fail, "fail"], ["SKIP", report.summary.skip, "skip"]].map(([label, value, status]) => (
              <div key={String(label)} style={{ padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.025)" }}><div style={{ opacity: .62, fontSize: 9 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 950, color: STATUS_COLOR[String(status)] }}>{String(value)}</div></div>
            ))}
          </div>

          <div style={{ marginTop: 10, color: "#ffd36a", fontWeight: 950 }}>PIPELINE — OÙ LES PARTIES DISPARAISSENT</div>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
            {pipelineRows.map(([label, value]) => <div key={String(label)} style={{ padding: "6px 7px", borderRadius: 8, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ opacity: .55, fontSize: 8.8 }}>{String(label)}</div><b style={{ fontSize: 14 }}>{value == null ? "—" : String(value)}</b></div>)}
          </div>

          <div style={{ marginTop: 10, color: "#ffb46a", fontWeight: 950 }}>ANALYSE AUTOMATIQUE</div>
          <div style={{ marginTop: 5, display: "grid", gap: 5 }}>
            {report.diagnosis.map((item) => <div key={item.code} style={{ padding: "7px 8px", borderRadius: 8, border: `1px solid ${item.severity === "critical" ? "rgba(255,110,110,.32)" : item.severity === "warn" ? "rgba(255,211,106,.25)" : "rgba(114,255,173,.20)"}`, background: "rgba(0,0,0,.22)" }}><b style={{ color: item.severity === "critical" ? "#ff8e8e" : item.severity === "warn" ? "#ffd36a" : "#72ffad" }}>{item.code}</b><div style={{ marginTop: 2, opacity: .82 }}>{item.message}</div></div>)}
          </div>

          <details style={{ marginTop: 10 }} open={report.summary.fail > 0}>
            <summary style={{ cursor: "pointer", color: "#66e8ff", fontWeight: 950 }}>DÉTAIL DES CONTRÔLES ({report.checks.length})</summary>
            <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
              {report.checks.map((row) => <div key={row.id} style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}><div style={{ display: "flex", gap: 7, alignItems: "center" }}><b style={{ color: STATUS_COLOR[row.status], minWidth: 48 }}>{row.status.toUpperCase()}</b><strong>{row.label}</strong></div><div style={{ marginTop: 2, opacity: .72, lineHeight: 1.4 }}>{row.detail}</div></div>)}
            </div>
          </details>

          <div style={{ marginTop: 8, opacity: .58 }}>Rapport : {new Date(report.generatedAt).toLocaleString()} · {report.deep ? "TEST COMPLET" : "ANALYSE RAPIDE"} · profil {report.profile.name || "—"}</div>
        </>
      ) : <div style={{ marginTop: 9, opacity: .62 }}>Aucun rapport enregistré. Lance d’abord « ANALYSER ». Si le problème est intermittent, active aussi TRACE puis utilise normalement l’application avant de relancer le diagnostic.</div>}

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", color: "#aab6c3", fontWeight: 900 }}>TRACE CHRONOLOGIQUE ({readStatsDiagnosticTrace().length})</summary>
        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
          {trace.length ? trace.map((event) => <div key={event.id} style={{ padding: "6px 7px", borderRadius: 7, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><b>{new Date(event.at).toLocaleTimeString()} · {event.channel}</b><div style={{ marginTop: 2, opacity: .6, wordBreak: "break-word" }}>{safeCompact(event.data)}</div></div>) : <div style={{ opacity: .55 }}>Aucun événement. Active TRACE pour suivre les mutations History/index/restauration.</div>}
        </div>
      </details>
    </div>
  );
}

function buttonStyle(color: string, busy: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${color}66`,
    background: busy ? `${color}22` : "rgba(255,255,255,.045)",
    color,
    padding: "6px 9px",
    fontWeight: 900,
    fontSize: 9.6,
    cursor: "pointer",
  };
}

function safeCompact(value: any): string {
  try {
    const text = JSON.stringify(value ?? {});
    return text.length > 260 ? `${text.slice(0, 257)}…` : text;
  } catch {
    return String(value ?? "");
  }
}
