import React from "react";
import { captureCrash, copyCrashReport, formatCrashReportText, type CrashReport } from "../lib/crashReporter";

type State = {
  hasError: boolean;
  report: CrashReport | null;
  copied: boolean;
};

export default class ErrorBoundary extends React.Component<any, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, report: null, copied: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true } as Partial<State>;
  }

  componentDidCatch(error: any, info: any) {
    console.error("React crash:", error, info);
    const report = captureCrash("react-boundary", error, {
      stack: [error?.stack || "", info?.componentStack || ""].filter(Boolean).join("\n\n") || undefined,
      raw: info?.componentStack ? String(info.componentStack) : undefined,
    });
    this.setState({ report, copied: false });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const txt = formatCrashReportText(this.state.report);

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b10",
          color: "#fff",
          padding: 20,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <h2>⚠️ Une erreur est survenue</h2>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{txt}</pre>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={async () => {
              const ok = await copyCrashReport(this.state.report);
              this.setState({ copied: !!ok });
            }}
            style={buttonStyle("plain")}
          >
            {this.state.copied ? "✅ Rapport copié" : "📋 Copier le rapport"}
          </button>

          <button onClick={() => location.reload()} style={buttonStyle("amber")}>
            Recharger l'application
          </button>
        </div>
      </div>
    );
  }
}

function buttonStyle(kind: "plain" | "amber"): React.CSSProperties {
  return {
    marginTop: 10,
    padding: "10px 16px",
    borderRadius: 999,
    border: kind === "plain" ? "1px solid rgba(255,255,255,.2)" : "none",
    fontWeight: 800,
    background: kind === "plain" ? "rgba(255,255,255,.08)" : "#ffc63a",
    color: kind === "plain" ? "#fff" : "#1b1508",
    cursor: "pointer",
  };
}
