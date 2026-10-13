import React from "react";
import {
  clearLastAccountSyncDiagnosticReport,
  readLastAccountSyncDiagnosticReport,
  runAccountSyncDiagnostic,
  type AccountSyncDiagnosticCheck,
  type AccountSyncDiagnosticReport,
} from "../../lib/accountSyncDiagnostics";

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  warn: "À SURVEILLER",
  fail: "ÉCHEC",
  skip: "NON TESTÉ",
};

const STATUS_COLOR: Record<string, string> = {
  ok: "#8fffc0",
  warn: "#ffd27a",
  fail: "#ff9b9b",
  skip: "#9da8b6",
};

export default function AccountSyncDiagnosticsPanel({ theme }: { theme: any }) {
  const [busy, setBusy] = React.useState<"read" | "active" | null>(null);
  const [report, setReport] = React.useState<AccountSyncDiagnosticReport | null>(() => readLastAccountSyncDiagnosticReport());
  const [elapsedSec, setElapsedSec] = React.useState(0);

  React.useEffect(() => {
    if (!busy) { setElapsedSec(0); return; }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 500);
    return () => window.clearInterval(timer);
  }, [busy]);

  const run = async (activeProbe: boolean) => {
    if (busy) return;
    setBusy(activeProbe ? "active" : "read");
    try {
      const next = await runAccountSyncDiagnostic({ activeProbe });
      setReport(next);
    } catch (error: any) {
      window.alert(`Diagnostic compte impossible : ${String(error?.message || error || "erreur inconnue")}`);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      window.alert("Diagnostic Compte / Sync copié.");
    } catch {
      window.alert(text);
    }
  };

  const clear = () => {
    clearLastAccountSyncDiagnosticReport();
    setReport(null);
  };

  const totalBad = Number(report?.summary?.fail || 0) + Number(report?.summary?.warn || 0);
  const border = report?.summary?.fail
    ? "rgba(255,110,110,.7)"
    : report && totalBad === 0
      ? "rgba(90,255,165,.55)"
      : "rgba(77,230,255,.38)";

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <div style={{ color: report?.summary?.fail ? "#ffaaaa" : "#78efff", fontWeight: 950, textTransform: "uppercase", letterSpacing: .7 }}>
        TEST INTERNE — COMPTE / SYNC / R2 / RESTAURATION / STATS
      </div>
      <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 11.5, lineHeight: 1.5 }}>
        Vérifie le compte connecté, <code>account_sync_documents</code>, RLS/Realtime, la parité Profils/Bots/Teams/Galerie/DartSets,
        History/Stats, le coffre média R2, la compression, le cache IndexedDB et le rollback avant restauration. Le test complet pousse les données
        actuelles vers le compte puis crée deux probes temporaires (Supabase + image R2) qui sont supprimés immédiatement après vérification.
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run(false)}
          style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "9px 12px", background: "rgba(0,0,0,.32)", color: busy ? theme.textSoft : theme.text, fontWeight: 900, cursor: busy ? "wait" : "pointer" }}
        >
          {busy === "read" ? "Analyse…" : "Analyser (lecture seule)"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run(true)}
          style={{ borderRadius: 12, border: "1px solid #4de6ff", padding: "9px 12px", background: "rgba(0,80,110,.18)", color: busy ? theme.textSoft : "#78efff", fontWeight: 950, cursor: busy ? "wait" : "pointer" }}
        >
          {busy === "active" ? `Test complet en cours… ${elapsedSec}s` : "TEST COMPLET + RESYNC"}
        </button>
        <button
          type="button"
          disabled={!report}
          onClick={() => void copy()}
          style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "9px 12px", background: "rgba(0,0,0,.32)", color: report ? theme.text : theme.textSoft, fontWeight: 850, cursor: report ? "pointer" : "default" }}
        >
          Copier le rapport
        </button>
        <button
          type="button"
          disabled={!report}
          onClick={clear}
          style={{ borderRadius: 12, border: "1px solid rgba(255,120,120,.45)", padding: "9px 12px", background: "rgba(90,0,0,.18)", color: report ? "#ffb7b7" : theme.textSoft, fontWeight: 850, cursor: report ? "pointer" : "default" }}
        >
          Effacer
        </button>
      </div>

      {busy ? (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", color: theme.textSoft, fontSize: 11, lineHeight: 1.45 }}>
          {busy === "active"
            ? `Synchronisation et probes en cours (${elapsedSec}s). Le premier passage peut durer 1 à 3 minutes si beaucoup de médias/history doivent être rattachés au compte. Ne ferme pas la page.`
            : `Analyse lecture seule en cours (${elapsedSec}s)…`}
        </div>
      ) : null}

      {report ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {[
              ["OK", report.summary.ok, "#8fffc0"],
              ["WARN", report.summary.warn, "#ffd27a"],
              ["ÉCHEC", report.summary.fail, "#ff9b9b"],
              ["SKIP", report.summary.skip, "#9da8b6"],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ padding: 9, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)" }}>
                <div style={{ fontSize: 10, color: theme.textSoft, fontWeight: 800 }}>{String(label)}</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: String(color) }}>{String(value)}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: theme.textSoft, marginBottom: 8 }}>
            {new Date(report.generatedAt).toLocaleString()} · {report.activeProbe ? "TEST COMPLET" : "LECTURE SEULE"} · UID {report.userId ? `${report.userId.slice(0, 8)}…` : "—"}
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {report.checks.map((check: AccountSyncDiagnosticCheck) => (
              <div key={check.id} style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 950, color: STATUS_COLOR[check.status] || theme.textSoft }}>
                    {STATUS_LABEL[check.status] || check.status.toUpperCase()}
                  </span>
                  <strong style={{ color: theme.text, fontSize: 11.5 }}>{check.label}</strong>
                </div>
                <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.8, lineHeight: 1.4 }}>{check.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ) : !busy ? (
        <div style={{ marginTop: 10, color: theme.textSoft, fontSize: 11 }}>
          Aucun diagnostic enregistré sur cet appareil.
        </div>
      ) : null}
    </div>
  );
}
