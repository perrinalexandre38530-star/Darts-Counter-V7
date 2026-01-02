import React from "react";

type CrashState = { error?: any; info?: any };

function formatErr(e: any) {
  try {
    if (!e) return "Erreur inconnue";
    if (typeof e === "string") return e;
    if (e?.stack) return String(e.stack);
    if (e?.message) return String(e.message);
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}

export default class CrashCatcher extends React.Component<
  { children: React.ReactNode },
  CrashState
> {
  state: CrashState = {};

  componentDidCatch(error: any, info: any) {
    try {
      console.error("[CRASH CAPTURED]", error, info);
      // Persist pour le relire après reload si besoin
      localStorage.setItem(
        "dc_last_crash_v1",
        JSON.stringify(
          {
            at: Date.now(),
            error: formatErr(error),
            info: info?.componentStack ? String(info.componentStack) : "",
          },
          null,
          2
        )
      );
    } catch {}
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const errTxt = formatErr(error);
    const stack = info?.componentStack ? String(info.componentStack) : "";

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
          Fais une capture de cet écran et envoie-la.
        </div>

        <div style={{ display: "grid", gap: 10 }}>
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
{errTxt}
          </pre>

          {stack ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "rgba(255,255,255,.04)",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                opacity: 0.9,
              }}
            >
{stack}
            </pre>
          ) : null}

          <button
            onClick={() => window.location.reload()}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: "none",
              fontWeight: 900,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1b1508",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
