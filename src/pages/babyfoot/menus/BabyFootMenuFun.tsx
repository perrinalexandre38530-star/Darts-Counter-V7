// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuFun.tsx
// BABY-FOOT — FUN
// Rendu visuel aligné sur BabyFootMenuMatch.tsx :
// - Cartes "Games style" : ticker à droite (~3/4) + fade à gauche
// - Hauteur ticker = hauteur carte
// - Bouton Info (i) sur chaque carte (à droite)
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

type FunPreset = {
  key: string;
  title: string;
  subtitle: string;
  badge: string;
  tickerSrc: string;
  infoTitle: string;
  infoBody: string;
  onClick: () => void;
};

export default function BabyFootMenuFun({ onBack, go }: Props) {
  const { theme } = useTheme();

  const presets: FunPreset[] = [
    {
      key: "classic9",
      title: "CLASSIC 9",
      subtitle: "Preset jouable • 1v1 • premier à 9",
      badge: "PLAY",
      tickerSrc: "/tickers/ticker_babyfoot_fun_classic9.png",
      infoTitle: "CLASSIC 9",
      infoBody: "Règle simple : 1v1, premier à 9 buts.",
      onClick: () => go("babyfoot_config", { presetMode: "1v1", presetTarget: 9 }),
    },
    {
      key: "goldengoal",
      title: "GOLDEN GOAL",
      subtitle: "1v1 • premier but gagne",
      badge: "GG",
      tickerSrc: "/tickers/ticker_babyfoot_fun_goldengoal.png",
      infoTitle: "GOLDEN GOAL",
      infoBody: "Match 1v1 en mort subite : le premier but met fin au match.",
      onClick: () => go("babyfoot_config", { presetMode: "1v1", presetGoldenGoal: true, presetTarget: 1 }),
    },
    {
      key: "handicap",
      title: "HANDICAP",
      subtitle: "2v1 • TEAM B démarre à +2",
      badge: "H+2",
      tickerSrc: "/tickers/ticker_babyfoot_fun_handicap.png",
      infoTitle: "HANDICAP",
      infoBody: "Mode 2v1 : Team B commence avec un avantage de +2.",
      onClick: () => go("babyfoot_config", { presetMode: "2v1", presetTarget: 10, presetHandicapA: 0, presetHandicapB: 2 }),
    },
    {
      key: "sets_bo3",
      title: "SETS BO3",
      subtitle: "2v2 • 2 sets gagnants • 5 buts",
      badge: "BO3",
      tickerSrc: "/tickers/ticker_babyfoot_fun_sets_bo3.png",
      infoTitle: "SETS BO3",
      infoBody: "Mode 2v2 en sets : Best Of 3, chaque set à 5 buts.",
      onClick: () => go("babyfoot_config", { presetMode: "2v2", presetBestOf: 3, presetSetTarget: 5 }),
    },
  ];

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={onBack} />
        <div style={topTitle}>BABY-FOOT — FUN</div>
        <InfoDot title="FUN" body="Règles FUN spécifiques au baby-foot (presets)." />
      </div>

      <div style={subTitle}>Choisis une règle FUN</div>

      <div style={grid}>
        {presets.map((p) => (
          <button key={p.key} style={cardRow(theme)} onClick={p.onClick}>
            {/* zone texte à gauche */}
            <div style={cardContent}>
              <div style={cardTitle}>{p.title}</div>
              <div style={cardSub}>{p.subtitle}</div>
            </div>

            {/* zone ticker à droite */}
            <div style={tickerPanel}>
              <img src={p.tickerSrc} alt={p.title} style={tickerImg} />
              <div style={leftFade} />
            </div>

            {/* badge + info (i) */}
            <div style={rightCol}>
              <div style={pill}>{p.badge}</div>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={infoWrap}
              >
                <InfoDot title={p.infoTitle} body={p.infoBody} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- styles (alignés Match) ----------

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
  marginBottom: 8,
};

const topTitle: any = { textAlign: "center", fontWeight: 900, letterSpacing: 1, opacity: 0.95 };
const subTitle: any = { textAlign: "center", opacity: 0.75, fontWeight: 800, marginBottom: 12 };

const grid: any = { display: "grid", gap: 10 };

const cardH = 92;
const tickerPanelW = "76%";

const cardRow = (theme: any) => ({
  position: "relative",
  height: cardH,
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  padding: 0,
  overflow: "hidden",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  textAlign: "left",
  display: "flex",
  alignItems: "stretch",
});

const cardContent: any = {
  position: "relative",
  zIndex: 3,
  flex: "1 1 auto",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 2,
};

const cardTitle: any = { fontWeight: 950, letterSpacing: 0.8 };
const cardSub: any = { opacity: 0.75, fontWeight: 700, marginTop: 2, fontSize: 12 };

const tickerPanel: any = {
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  width: tickerPanelW,
  borderLeft: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
  zIndex: 1,
};

const tickerImg: any = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  filter: "saturate(1.08) contrast(1.06)",
};

// IMPORTANT : fade gauche identique à Match
const leftFade: any = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: "46%",
  background: "linear-gradient(90deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0.0) 100%)",
  zIndex: 2,
  pointerEvents: "none",
};

const rightCol: any = {
  position: "absolute",
  right: 10,
  top: 8,
  bottom: 8,
  zIndex: 4,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "space-between",
  pointerEvents: "none", // on réactive seulement sur infoWrap
};

const pill: any = {
  pointerEvents: "none",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.22)",
  fontWeight: 950,
  letterSpacing: 1,
  opacity: 0.92,
};

const infoWrap: any = {
  pointerEvents: "auto",
  transform: "scale(0.95)",
  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
};
