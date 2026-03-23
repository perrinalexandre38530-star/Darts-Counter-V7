import React from "react";
import { captureCrash, copyCrashReport, formatCrashReportText, type CrashReport } from "../lib/crashReporter";
import { repairApplication, safeModeReload } from "../lib/appRecovery";

export default function BootGuard({ children }: any) {
  const [bootError, setBootError] = React.useState<CrashReport | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      console.error("Boot error", e.error || e);
      const report = captureCrash("boot-window-error", e.error || e.message || e, {
        source: e?.filename ? `${e.filename}:${e.lineno || 0}:${e.colno || 0}` : undefined,
      });
      setBootError(report);
    };

    window.addEventListener("error", handler);

    return () => {
      window.removeEventListener("error", handler);
    };
  }, []);

  if (bootError) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b10", color: "#fff", padding: 20 }}>
        <h2>Crash au démarrage</h2>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{formatCrashReportText(bootError)}</pre>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={async () => {
              const ok = await copyCrashReport(bootError);
              setCopied(!!ok);
            }}
          >
            {copied ? "✅ Rapport copié" : "📋 Copier le rapport"}
          </button>
          <button onClick={() => window.location.reload()}>Recharger</button>
          <button onClick={() => safeModeReload()}>🧯 Safe mode</button>
          <button onClick={() => { void repairApplication(); }}>🛠️ Réparer</button>
        </div>
      </div>
    );
  }

  return children;
}
