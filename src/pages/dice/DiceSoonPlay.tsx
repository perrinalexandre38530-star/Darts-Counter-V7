// @ts-nocheck
// =============================================================
// src/pages/dice/DiceSoonPlay.tsx
// Placeholder PLAY pour modes en cours de dev (Farkle / 421 / Poker Dice)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import ConfigTickerHeader from "../../components/ConfigTickerHeader";
import { getTicker } from "../../lib/tickers";

type Props = { go: (t: any, p?: any) => void; params?: any };

export default function DiceSoonPlay({ go, params }: Props) {
  const { theme } = useTheme() as any;

  const headerSrc = getTicker("dice_games") || getTicker("dice_games") || "";

  const { t } = useLang() as any;
  const primary = theme?.colors?.accent ?? theme?.primary ?? "#7cff6d";

  const title = params?.title || "MODE";
  const subtitle = params?.subtitle || "En cours de développement";

  return (
    <div style={{ padding: 18 }}>
      <ConfigTickerHeader
        src={headerSrc}
        height={78}
        left={<BackDot onClick={() => go("dice_menu")} />}
        sticky={false}
      />

      

      <div
        style={{
          marginTop: 60,
          borderRadius: 18,
          padding: 18,
          border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.10)"}`,
          background: "rgba(0,0,0,.35)",
          boxShadow: "0 16px 40px rgba(0,0,0,.45)",
          maxWidth: 640,
          marginInline: "auto",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, color: "#fff" }}>{title}</div>
        <div style={{ marginTop: 6, color: "rgba(255,255,255,.70)" }}>{subtitle}</div>

        <div style={{ marginTop: 14, color: "rgba(255,255,255,.72)", lineHeight: 1.5 }}>
          Cette page PLAY est un placeholder. On a déjà câblé le menu + la config pour ce mode.
          <br />
          Prochaine étape : moteur de scoring + UI de jeu + stats/historique.
        </div>

        <button
          onClick={() => go("dice_menu")}
          style={{
            marginTop: 16,
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: primary,
            color: "#0b0b0b",
            fontWeight: 900,
            letterSpacing: 1,
            cursor: "pointer",
            boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 10px 28px ${primary}55`,
          }}
        >
          RETOUR AUX MODES
        </button>
      </div>
    </div>
  );
}
