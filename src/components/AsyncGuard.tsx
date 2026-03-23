import React from "react";
import { captureCrash, copyCrashReport, formatCrashReportText, type CrashReport } from "../lib/crashReporter";
import { repairApplication, safeModeReload } from "../lib/appRecovery";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  report: CrashReport | null;
  copied: boolean;
};

export default class AsyncGuard extends React.Component<Props, State> {
  private onUnhandledRejection: (event: PromiseRejectionEvent) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      report: null,
      copied: false,
    };

    this.onUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        const report = captureCrash("unhandledrejection", event?.reason ?? event);
        console.error("[AsyncGuard] unhandledrejection:", event?.reason);
        this.setState({ hasError: true, report, copied: false });
      } catch (e) {
        console.error("[AsyncGuard] handler failed:", e);
      }
    };
  }

  componentDidMount() {
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const msg = formatCrashReportText(this.state.report);

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b10",
          color: "#fff",
          padding: 16,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          ⚠️ ERREUR ASYNCHRONE CAPTURÉE
        </div>
        <div style={{ opacity: 0.85, marginBottom: 10 }}>
          Une promesse non gérée a été interceptée pour éviter un crash silencieux.
        </div>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(255,255,255,.06)",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          {msg}
        </pre>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button
            onClick={async () => {
              const ok = await copyCrashReport(this.state.report);
              this.setState({ copied: !!ok });
            }}
            style={btn("plain")}
          >
            {this.state.copied ? "✅ Rapport copié" : "📋 Copier le rapport"}
          </button>

          <button onClick={() => window.location.reload()} style={btn("amber")}>
            Recharger
          </button>

          <button onClick={() => safeModeReload()} style={btn("danger")}>
            🧯 Safe mode
          </button>

          <button onClick={() => { void repairApplication(); }} style={btn("danger")}>
            🛠️ Réparer
          </button>
        </div>
      </div>
    );
  }
}

function btn(kind: "plain" | "amber" | "danger"): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "10px 12px",
    border: kind === "plain" ? "1px solid rgba(255,255,255,.2)" : "none",
    fontWeight: 900,
    background:
      kind === "danger"
        ? "linear-gradient(180deg,#ff8d8d,#ff5252)"
        : kind === "plain"
        ? "rgba(255,255,255,.08)"
        : "linear-gradient(180deg,#ffc63a,#ffaf00)",
    color: kind === "plain" ? "#fff" : "#1b1508",
    cursor: "pointer",
  };
}
