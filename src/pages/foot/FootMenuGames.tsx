import React from "react";
import BackDot from "../../components/BackDot";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };

export default function FootMenuGames({ go }: Props) {
  const cards = [
    { title: "MATCH RAPIDE", sub: "Score + événements essentiels", icon: "⚽", click: () => go("foot_config") },
    { title: "TOURNOI FOOT", sub: "Créer/reprendre via le module compétitions", icon: "🏆", click: () => go("tournaments", { forceMode: "foot", sport: "foot", source: "local" }) },
    { title: "ÉQUIPES", sub: "Préparation des équipes FOOT", icon: "🛡️", click: () => go("profiles", { sport: "foot" }) },
  ];
  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <BackDot onClick={() => go("home")} />
        <h1 style={{ textAlign: "center", margin: "8px 0 4px", fontSize: 32, letterSpacing: 1.3 }}>FOOT — JEUX</h1>
        <p style={{ textAlign: "center", margin: "0 0 18px", opacity: .72, fontWeight: 750 }}>V1 dédiée au sport FOOT. Le mode darts “football” reste intact.</p>
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((c) => (
            <button key={c.title} onClick={c.click} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, padding: 16, color: "#fff", background: "rgba(255,255,255,.055)", textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(70,220,120,.14)", fontSize: 24 }}>{c.icon}</div>
                <div><div style={{ fontWeight: 1000, fontSize: 17 }}>{c.title}</div><div style={{ opacity: .72, fontSize: 12.5, marginTop: 4 }}>{c.sub}</div></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
