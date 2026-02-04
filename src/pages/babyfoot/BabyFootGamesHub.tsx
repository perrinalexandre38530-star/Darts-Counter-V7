// =============================================================
// src/pages/babyfoot/BabyFootGamesHub.tsx
// HUB Games — Baby-Foot (sport autonome)
// - Cartes arcade (match / fun / défis / training / tournoi / stats)
// - Ne dépend d'aucun autre sport
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import InfoDot from "../../components/InfoDot";
import BackDot from "../../components/BackDot";

import logoBabyFoot from "../../assets/games/logo-babyfoot.png";

type Section = "match" | "fun" | "defis" | "training" | "tournoi" | "stats";

type Props = {
  onBack: () => void;
  onSelect: (s: Section) => void;
};

export default function BabyFootGamesHub({ onBack, onSelect }: Props) {
  const { theme } = useTheme();

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={onBack} />
        <div style={topTitle}>BABY-FOOT — GAMES</div>
        <InfoDot title="Baby-foot" body="Sport autonome. Menus dédiés. Local only." />
      </div>

      <div style={hero(theme)}>
        <div style={heroBg} />
        <img src={logoBabyFoot} alt="babyfoot" style={heroLogo} />
        <div style={heroTitle}>Choisis une catégorie</div>
        <div style={heroSub}>Match • Fun • Défis • Training • Tournoi • Stats</div>
      </div>

      <div style={grid}>
        <button style={card(theme)} onClick={() => onSelect("match")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>MATCH</div>
          <div style={cardSub}>1v1 • 2v2 • 2v1</div>
          <div style={badgeOk}>OK</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>

        <button style={card(theme)} onClick={() => onSelect("training")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>TRAINING</div>
          <div style={cardSub}>Match rapide • presets</div>
          <div style={badgeBeta}>BETA</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>

        <button style={card(theme)} onClick={() => onSelect("fun")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>FUN</div>
          <div style={cardSub}>Modes fun (preset)</div>
          <div style={badgeWip}>WIP</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>

        <button style={card(theme)} onClick={() => onSelect("defis")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>DÉFIS</div>
          <div style={cardSub}>Challenges (preset)</div>
          <div style={badgeWip}>WIP</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>

        <button style={card(theme)} onClick={() => onSelect("tournoi")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>TOURNOI</div>
          <div style={cardSub}>Local • à venir</div>
          <div style={badgeWip}>WIP</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>

        <button style={card(theme)} onClick={() => onSelect("stats")}>
          <div style={cardBg(theme)} />
          <div style={cardTitle}>STATS</div>
          <div style={cardSub}>Résumé + historique</div>
          <div style={badgeOk}>OK</div>
          <img src={logoBabyFoot} style={cardImg} />
        </button>
      </div>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = { textAlign: "center", fontWeight: 900, letterSpacing: 1, opacity: 0.95 };

const hero = (theme: any) => ({
  position: "relative",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  padding: 14,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const heroBg: any = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(800px 300px at 30% 10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(600px 240px at 80% 90%, rgba(255,255,255,0.10), transparent 55%)",
  opacity: 0.7,
};

const heroLogo: any = { width: 84, height: 84, objectFit: "contain", position: "relative" };
const heroTitle: any = { marginTop: 6, fontWeight: 950, letterSpacing: 1, position: "relative" };
const heroSub: any = { marginTop: 2, opacity: 0.75, fontWeight: 700, position: "relative" };

const grid: any = { display: "flex", flexDirection: "column", gap: 10 };

const card = (theme: any) => ({
  position: "relative",
  minHeight: 96,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  padding: 14,
  paddingRight: 70,
  overflow: "hidden",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
});


const cardBg = (theme: any) => ({
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 52%, rgba(0,0,0,0.05) 100%), radial-gradient(700px 180px at 20% 30%, rgba(255,255,255,0.10), transparent 60%)",
  opacity: 0.9,
  zIndex: 1,
});

const cardTitle: any = { fontWeight: 950, letterSpacing: 0.8, position: "relative", zIndex: 2 };
const cardSub: any = { opacity: 0.75, fontWeight: 700, marginTop: 2, position: "relative", zIndex: 2 };

const cardImg: any = {
  position: "absolute",
  right: -10,
  top: -10,
  width: 150,
  height: 150,
  objectFit: "contain",
  opacity: 0.22,
  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.4))",
};

const badgeBase: any = {
  position: "absolute",
  top: 10,
  right: 10,
  padding: "4px 8px",
  borderRadius: 10,
  fontWeight: 950,
  letterSpacing: 0.8,
  fontSize: 11,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.22)",
};

const badgeOk: any = { ...badgeBase, color: "#d7ffef" };
const badgeBeta: any = { ...badgeBase, color: "#ffe7ad" };
const badgeWip: any = { ...badgeBase, color: "#ffb9b9" };
