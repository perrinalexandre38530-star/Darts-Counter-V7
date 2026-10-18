import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  title: string;
  subtitle?: string;
  onQuick: () => void;
  onArcade: () => void;
  onBack: () => void;
};

export default function GameModeEntryChoice({ title, subtitle, onQuick, onArcade, onBack }: Props) {
  const { theme } = useTheme();
  const primary = theme?.primary || "#55e6ff";

  const card = (accent: string): React.CSSProperties => ({
    borderRadius: 24,
    border: `1px solid ${accent}88`,
    background: `radial-gradient(120% 120% at 0% 0%, ${accent}24, rgba(8,10,14,.96) 58%), linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015))`,
    boxShadow: `0 14px 42px rgba(0,0,0,.42), 0 0 24px ${accent}18`,
    padding: "22px 18px",
    minHeight: 210,
    display: "grid",
    alignContent: "space-between",
    gap: 18,
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
  });

  return (
    <div style={{ minHeight: "100%", color: "#fff", padding: "12px 14px 26px", display: "grid", alignContent: "start", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          aria-label="Retour"
          onClick={onBack}
          style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 22, cursor: "pointer" }}
        >
          ‹
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 25, fontWeight: 950, letterSpacing: .7 }}>{title}</div>
          <div style={{ marginTop: 3, fontSize: 11, opacity: .62, fontWeight: 800, letterSpacing: .4 }}>{subtitle || "CHOISIS TON EXPÉRIENCE"}</div>
        </div>
        <div />
      </div>

      <div style={{ maxWidth: 980, width: "100%", margin: "6px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <button type="button" onClick={onQuick} style={card("#52f5b2")}>
          <div>
            <div style={{ fontSize: 36, marginBottom: 9 }}>⚡</div>
            <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: .4 }}>PARTIE RAPIDE</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, opacity: .76 }}>
              Sans profils · noms facultatifs · réglages essentiels · sons coupés.
            </div>
          </div>
          <div style={{ fontWeight: 950, color: "#52f5b2", fontSize: 12, letterSpacing: .75 }}>JOUER IMMÉDIATEMENT →</div>
        </button>

        <button type="button" onClick={onArcade} style={card(primary)}>
          <div>
            <div style={{ fontSize: 36, marginBottom: 9 }}>🎮</div>
            <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: .4 }}>ARCADE</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, opacity: .76 }}>
              Profils · bots · équipes · sets de fléchettes · sons · statistiques complètes.
            </div>
          </div>
          <div style={{ fontWeight: 950, color: primary, fontSize: 12, letterSpacing: .75 }}>CONFIGURATION COMPLÈTE →</div>
        </button>
      </div>
    </div>
  );
}
