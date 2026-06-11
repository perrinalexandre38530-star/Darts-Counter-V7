import React from "react";
import BackDot from "../../components/BackDot";
import { FOOT_FORMATS } from "./footFormats";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };

export default function FootMenuGames({ go }: Props) {
  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <BackDot onClick={() => go("home")} />
        <h1 style={{ textAlign: "center", margin: "8px 0 4px", fontSize: 32, letterSpacing: 1.3 }}>FOOT — JEUX</h1>
        <p style={{ textAlign: "center", margin: "0 0 18px", opacity: .72, fontWeight: 750 }}>Choisis ton format de match. Penalty et 1v1 sont en duel, les autres formats sont en équipes.</p>
        <div style={{ display: "grid", gap: 12 }}>
          {FOOT_FORMATS.map((f) => (
            <button key={f.id} onClick={() => go("foot_config", { format: f.id })} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, padding: 16, color: "#fff", background: "rgba(255,255,255,.055)", textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(70,220,120,.14)", fontSize: 24 }}>{f.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, fontSize: 18 }}>{f.label}</div>
                  <div style={{ opacity: .72, fontSize: 12.5, marginTop: 4 }}>{f.maxPlayersHint} · {f.kind === "duel" ? "Duel" : "Équipes"}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
