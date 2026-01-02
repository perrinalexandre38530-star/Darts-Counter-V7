// src/components/MobileErrorOverlay.tsx
import React from "react";

type ErrState = {
  message: string;
  stack?: string;
  source?: string;
};

function formatAnyError(e: any): ErrState {
  if (!e) return { message: "Erreur inconnue (null/undefined)" };

  // Erreur classique
  if (e instanceof Error) {
    return { message: e.message || String(e), stack: e.stack || "" };
  }

  // UnhandledRejection souvent: { reason }
  if (typeof e === "object" && (e as any).reason) {
    return formatAnyError((e as any).reason);
  }

  // Objet avec message/stack
  if (typeof e === "object") {
    const msg = (e as any).message || JSON.stringify(e);
    const stack = (e as any).stack || "";
    return { message: String(msg), stack: String(stack) };
  }

  return { message: String(e) };
}

export default function MobileErrorOverlay() {
  const [err, setErr] = React.useState<ErrState | null>(null);
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    // Si on veut le couper facilement: localStorage.setItem("dc-debug-overlay","0")
    try {
      if (localStorage.getItem("dc-debug-overlay") === "0") return;
    } catch {}

    const onError = (ev: ErrorEvent) => {
      try {
        const st = formatAnyError(ev.error || ev.message);
        setErr({
          message: st.message || "Erreur JS",
          stack: st.stack || "",
          source: ev.filename ? `${ev.filename}:${ev.lineno || 0}:${ev.colno || 0}` : undefined,
        });
      } catch (e) {
        setErr({ message: "Erreur JS (handler failed)", stack: String(e) });
      }
    };

    const onRej = (ev: PromiseRejectionEvent) => {
      try {
        const st = formatAnyError(ev.reason);
        setErr({
          message: "Unhandled promise rejection: " + (st.message || String(ev.reason)),
          stack: st.stack || "",
        });
      } catch (e) {
        setErr({ message: "Unhandled rejection (handler failed)", stack: String(e) });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRej);

    // Petit ping au boot pour vérifier que le composant est monté
    // (utile si tu vois “Aïe aïe aïe” sans rien)
    try {
      console.log("[MobileErrorOverlay] mounted");
    } catch {}

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!err || !open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,.88)",
        color: "#fff",
        padding: 14,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>💥 ERREUR JS (Mobile)</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setOpen(false)}
          style={{
            border: "1px solid rgba(255,255,255,.25)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            borderRadius: 10,
            padding: "6px 10px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
        <button
          onClick={() => {
            try {
              navigator.clipboard?.writeText(
                `MESSAGE:\n${err.message}\n\nSOURCE:\n${err.source || ""}\n\nSTACK:\n${err.stack || ""}`
              );
            } catch {}
          }}
          style={{
            border: "1px solid rgba(255,255,255,.25)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            borderRadius: 10,
            padding: "6px 10px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Copier
        </button>
      </div>

      <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Message</div>
        <div style={{ opacity: 0.95 }}>{err.message}</div>

        {err.source ? (
          <>
            <div style={{ fontWeight: 900, marginTop: 12, marginBottom: 6 }}>Source</div>
            <div style={{ opacity: 0.9 }}>{err.source}</div>
          </>
        ) : null}

        {err.stack ? (
          <>
            <div style={{ fontWeight: 900, marginTop: 12, marginBottom: 6 }}>Stack</div>
            <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>{err.stack}</div>
          </>
        ) : null}
      </div>

      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 14 }}>
        Astuce: pour désactiver l’overlay → mets <b>dc-debug-overlay</b> à "0" dans localStorage.
      </div>
    </div>
  );
}
