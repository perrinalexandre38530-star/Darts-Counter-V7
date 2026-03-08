// src/components/MobileErrorOverlay.tsx
import React from "react";
import {
  captureCrash,
  copyCrashReport,
  formatCrashReportText,
  type CrashReport,
} from "../lib/crashReporter";

export default function MobileErrorOverlay() {
  const [report, setReport] = React.useState<CrashReport | null>(null);
  const [open, setOpen] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem("dc-debug-overlay") === "0") return;
    } catch {}

    const onError = (ev: ErrorEvent) => {
      try {
        const next = captureCrash("window.error", ev.error || ev.message || ev, {
          source: ev.filename ? `${ev.filename}:${ev.lineno || 0}:${ev.colno || 0}` : undefined,
        });
        setReport(next);
        setOpen(true);
        setCopied(false);
      } catch (e) {
        const fallback = captureCrash("window.error-handler", e);
        setReport(fallback);
        setOpen(true);
      }
    };

    const onRej = (ev: PromiseRejectionEvent) => {
      try {
        const next = captureCrash("unhandledrejection", ev.reason);
        setReport(next);
        setOpen(true);
        setCopied(false);
      } catch (e) {
        const fallback = captureCrash("unhandledrejection-handler", e);
        setReport(fallback);
        setOpen(true);
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRej);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!report || !open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,.92)",
        color: "#fff",
        padding: 14,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>💥 ERREUR JS / PWA CAPTURÉE</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setOpen(false)} style={btnStyle()}>
          Fermer
        </button>
        <button
          onClick={async () => {
            const ok = await copyCrashReport(report);
            setCopied(!!ok);
          }}
          style={btnStyle()}
        >
          {copied ? "✅ Copié" : "Copier"}
        </button>
        <button
          onClick={() => {
            try {
              localStorage.setItem("dc_safe_mode_v1", "1");
            } catch {}
            window.location.reload();
          }}
          style={btnStyle("danger")}
        >
          Safe mode
        </button>
      </div>

      <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
        {formatCrashReportText(report)}
      </pre>

      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 14 }}>
        Astuce: pour désactiver l’overlay → mets <b>dc-debug-overlay</b> à "0" dans localStorage.
      </div>
    </div>
  );
}

function btnStyle(kind: "plain" | "danger" = "plain"): React.CSSProperties {
  return {
    border: kind === "plain" ? "1px solid rgba(255,255,255,.25)" : "none",
    background: kind === "plain" ? "rgba(255,255,255,.08)" : "linear-gradient(180deg,#ff8d8d,#ff5252)",
    color: kind === "plain" ? "#fff" : "#2a0e0e",
    borderRadius: 10,
    padding: "6px 10px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
