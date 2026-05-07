import * as React from "react";
import { normalizeViewerCode } from "../../lib/viewer/viewerClient";

type Props = { go: (tab: any, params?: any) => void };

export default function ViewerJoin({ go }: Props) {
  const [code, setCode] = React.useState("");
  const clean = normalizeViewerCode(code);

  function join() {
    if (!clean) return;
    go("viewer_display", { sessionId: clean });
  }

  return (
    <div style={{ minHeight: "100dvh", color: "#f8fafc", background: "radial-gradient(circle at top, #172033 0%, #070910 58%, #030406 100%)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px" }}>
        <button onClick={() => go("viewer_host")} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900 }}>
          ← Viewer
        </button>
        <div style={{ marginTop: 28, borderRadius: 28, padding: 22, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <div style={{ fontSize: 30, fontWeight: 1100, color: "#ffd56a" }}>Rejoindre un viewer</div>
          <p style={{ opacity: 0.82, lineHeight: 1.45 }}>Entre le code affiché sur le téléphone, ou scanne le QR code depuis la tablette.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") join(); }}
            placeholder="EX: A7D2-K9QX"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "16px 14px", fontSize: 22, letterSpacing: 2, textTransform: "uppercase", fontWeight: 1000 }}
          />
          <button disabled={!clean} onClick={join} style={{ width: "100%", marginTop: 14, borderRadius: 18, padding: "14px 16px", border: "none", background: clean ? "linear-gradient(180deg,#ffd56a,#ffb72a)" : "rgba(255,255,255,.12)", color: clean ? "#17120b" : "rgba(255,255,255,.58)", fontWeight: 1100, fontSize: 16 }}>
            Ouvrir l’écran viewer
          </button>
        </div>
      </div>
    </div>
  );
}
