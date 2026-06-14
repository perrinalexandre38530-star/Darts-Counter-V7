import React from "react";
import BackDot from "../../components/BackDot";
import logoFoot from "../../assets/games/logo-foot.png";
import foot01 from "../../assets/tickers/foot-01.webp";
import foot02 from "../../assets/tickers/foot-02.webp";
import foot03 from "../../assets/tickers/foot-03.webp";

type Props = { go: (route: any, params?: any) => void; store?: any; update?: any };

function Card({ title, subtitle, icon, ticker, onClick }: { title: string; subtitle: string; icon: string; ticker: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 94,
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 22,
        padding: 16,
        background: "linear-gradient(135deg, rgba(12,90,48,.88), rgba(5,20,12,.95))",
        color: "#fff",
        textAlign: "left",
        boxShadow: "0 18px 42px rgba(0,0,0,.35)",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <img
        src={ticker}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.44,
          filter: "saturate(1.08) contrast(1.05)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,.80) 0%, rgba(0,0,0,.48) 50%, rgba(0,0,0,.20) 100%)",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 50, height: 50, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 25 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: .6 }}>{title}</div>
          <div style={{ marginTop: 4, fontSize: 12.5, opacity: .86, fontWeight: 750, lineHeight: 1.25 }}>{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

export default function FootHome({ go }: Props) {
  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, rgba(40,180,90,.30), transparent 36%), linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <BackDot onClick={() => go("gameSelect")} />
        <div style={{ textAlign: "center", marginTop: 6, marginBottom: 18 }}>
          <img src={logoFoot} alt="FOOT" style={{ width: 118, height: 118, objectFit: "contain", filter: "drop-shadow(0 0 22px rgba(80,255,140,.35))" }} />
          <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: 1.8, marginTop: 6 }}>FOOT</div>
          <div style={{ fontSize: 13, opacity: .78, fontWeight: 800 }}>Matchs, tournois, classement et stats football.</div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Card title="JOUER" subtitle="Lancer un match rapide : score, buts, cartons, événements." icon="⚽" ticker={foot01} onClick={() => go("foot_menu")} />
          <Card title="TOURNOIS" subtitle="Créer ou reprendre une compétition FOOT avec poules / classement." icon="🏆" ticker={foot02} onClick={() => go("tournaments", { forceMode: "foot", sport: "foot", source: "local" })} />
          <Card title="STATS" subtitle="Consulter les matchs FOOT enregistrés et les bilans équipes." icon="📊" ticker={foot03} onClick={() => go("stats")} />
        </div>
      </div>
    </div>
  );
}
