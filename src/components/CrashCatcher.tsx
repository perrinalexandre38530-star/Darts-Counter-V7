import React from "react";
import {
  captureCrash,
  copyCrashReport,
  formatCrashReportText,
  getLastCrashReport,
  type CrashReport,
} from "../lib/crashReporter";
import { repairApplication, safeModeReload } from "../lib/appRecovery";

type CrashState = { report: CrashReport | null; copied: boolean };

export default class CrashCatcher extends React.Component<
  { children: React.ReactNode },
  CrashState
> {
  state: CrashState = { report: null, copied: false };

  componentDidMount() {
    try {
      const last = getLastCrashReport();
      if (last && Date.now() - last.ts < 15_000) {
        this.setState({ report: last });
      }
    } catch {}
  }

  componentDidCatch(error: any, info: any) {
    console.error("[CRASH CAPTURED]", error, info);
    const report = captureCrash("react-render", error, {
      stack:
        [error?.stack || "", info?.componentStack || ""].filter(Boolean).join("\n\n") || undefined,
      raw: info?.componentStack ? String(info.componentStack) : undefined,
    });
    this.setState({ report, copied: false });
  }

  render() {
    const report = this.state.report;
    if (!report) return this.props.children;

    const txt = formatCrashReportText(report);

    return (
      <div
        style={{
          minHeight: "100dvh",
          padding: 14,
          background: "#0b0b10",
          color: "#fff",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          💥 CRASH CAPTURÉ
        </div>

        <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 10 }}>
          Fais une capture de cet écran et envoie-la. Le bouton <b>Copier le rapport</b> copie aussi la raison du plantage.
        </div>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(255,255,255,.06)",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            maxHeight: "62dvh",
            overflow: "auto",
          }}
        >
          {txt}
        </pre>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={async () => {
              const ok = await copyCrashReport(report);
              this.setState({ copied: !!ok });
            }}
            style={btnStyle()}
          >
            {this.state.copied ? "✅ Rapport copié" : "📋 Copier le rapport"}
          </button>

          <button onClick={() => window.location.reload()} style={btnStyle("amber")}>
            🔄 Recharger
          </button>

          <button onClick={() => safeModeReload()} style={btnStyle("danger")}>
            🧯 Safe mode
          </button>

          <button onClick={() => { void repairApplication(); }} style={btnStyle("danger")}>
            🛠️ Réparer
          </button>
        </div>
      </div>
    );
  }
}

function btnStyle(kind: "normal" | "amber" | "danger" = "normal"): React.CSSProperties {
  const background =
    kind === "danger"
      ? "linear-gradient(180deg,#ff8d8d,#ff5252)"
      : kind === "amber"
      ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
      : "rgba(255,255,255,.08)";
  const color = kind === "normal" ? "#fff" : "#1b1508";
  const border = kind === "normal" ? "1px solid rgba(255,255,255,.2)" : "none";
  return {
    borderRadius: 999,
    padding: "10px 12px",
    border,
    fontWeight: 900,
    background,
    color,
    cursor: "pointer",
  };
}
