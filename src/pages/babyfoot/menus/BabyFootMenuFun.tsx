// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuFun.tsx
// FUN Baby-Foot — base (WIP contrôlé)
// 👉 On laisse l'écran exister (pas placeholder vide) + 1 entrée jouable
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

export default function BabyFootMenuFun({ onBack, go }: Props) {
  const { theme } = useTheme();

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={onBack} />
        <div style={topTitle}>BABY-FOOT — FUN</div>
        <InfoDot title="FUN" body="Écran dédié baby-foot. Une entrée jouable est déjà dispo." />
      </div>

      <div style={grid}>
        <button style={card(theme)} onClick={() => go("babyfoot_config", { presetMode: "1v1", presetTarget: 9 })}>
          <div style={cardTitle}>CLASSIC 9</div>
          <div style={cardSub}>Preset jouable • 1v1 • premier à 9</div>
          <div style={pill}>PLAY</div>
        </button>

        <div style={note}>
          FUN : on pourra ajouter ici des règles spécifiques (ex: sets, handicap, combo, etc.) sans toucher aux autres sports.
        </div>
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

const note: any = {
  opacity: 0.7,
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.35,
  padding: 10,
  borderRadius: 14,
  border: "1px dashed rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.14)",
};
