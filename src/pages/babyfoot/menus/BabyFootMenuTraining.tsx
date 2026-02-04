// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuTraining.tsx
// Menu TRAINING Baby-Foot — presets jouables (BETA)
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

export default function BabyFootMenuTraining({ onBack, go }: Props) {
  const { theme } = useTheme();

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={onBack} />
        <div style={topTitle}>BABY-FOOT — TRAINING</div>
        <InfoDot title="Training" body="Presets rapides (local). Objectif: jouer des matchs courts." />
      </div>

      <div style={grid}>
        <button style={card(theme)} onClick={() => go("babyfoot_config", { presetMode: "1v1", presetTarget: 5, presetDurationSec: 180 })}>
          <div style={cardTitle}>SPEED 5</div>
          <div style={cardSub}>1v1 • premier à 5</div>
          <div style={pill}>TARGET 5</div>
        </button>

        <button style={card(theme)} onClick={() => go("babyfoot_config", { presetMode: "2v2", presetTarget: 7, presetDurationSec: 210 })}>
          <div style={cardTitle}>TEAM QUICK 7</div>
          <div style={cardSub}>2v2 • premier à 7</div>
          <div style={pill}>TARGET 7</div>
        </button>

        <button style={card(theme)} onClick={() => go("babyfoot_config", { presetMode: "2v1", presetTarget: 6, presetDurationSec: 240 })}>
          <div style={cardTitle}>CHALLENGE 2V1</div>
          <div style={cardSub}>2v1 • premier à 6</div>
          <div style={pill}>TARGET 6</div>
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

const grid: any = { display: "grid", gap: 10 };

const card = (theme: any) => ({
  position: "relative",
  height: 92,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  padding: 12,
  overflow: "hidden",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  textAlign: "left",
});

const cardTitle: any = { fontWeight: 950, letterSpacing: 0.8 };
const cardSub: any = { opacity: 0.75, fontWeight: 700, marginTop: 2 };

const pill: any = {
  position: "absolute",
  right: 10,
  top: 10,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.20)",
  fontWeight: 950,
  letterSpacing: 1,
  opacity: 0.9,
};
