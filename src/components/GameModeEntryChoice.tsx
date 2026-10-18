import React from "react";
import { useLang } from "../contexts/LangContext";
import tickerArcade from "../assets/tickers/ticker_arcade.png";
import tickerPartieRapide from "../assets/tickers/ticker_partie_rapide.png";
import tickerQuickGame from "../assets/tickers/ticker_quick_game.png";

type Props = {
  title: string;
  subtitle?: string;
  onQuick: () => void;
  onArcade: () => void;
  onBack: () => void;
};

export default function GameModeEntryChoice({ title, onQuick, onArcade, onBack }: Props) {
  const { lang } = useLang();
  const isFr = String(lang || "fr").toLowerCase() === "fr";

  const labels = isFr
    ? {
        header: "PARTIE RAPIDE OU EXPÉRIENCE ARCADE",
        back: "Retour",
        quickAlt: "Partie rapide",
        arcadeAlt: "Arcade",
      }
    : {
        header: "QUICK GAME OR ARCADE EXPERIENCE",
        back: "Back",
        quickAlt: "Quick Game",
        arcadeAlt: "Arcade",
      };

  const tickerButton = (src: string, alt: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt}
      style={{
        width: "100%",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "block",
        lineHeight: 0,
        borderRadius: 18,
        overflow: "visible",
        filter: "drop-shadow(0 12px 26px rgba(0,0,0,.38))",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          objectFit: "contain",
          borderRadius: 18,
        }}
      />
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
        color: "#fff",
        padding: "12px 14px 28px",
        display: "grid",
        alignContent: "start",
        gap: 14,
        overflowX: "hidden",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          aria-label={labels.back}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.05)",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ‹
        </button>

        <div style={{ minWidth: 0, textAlign: "center" }}>
          <div
            style={{
              fontSize: 25,
              fontWeight: 950,
              letterSpacing: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div style={{ marginTop: 3, fontSize: 10, opacity: 0.62, fontWeight: 850, letterSpacing: 0.35, lineHeight: 1.25 }}>
            {labels.header}
          </div>
        </div>
        <div />
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          minWidth: 0,
          margin: "6px auto 0",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 12,
        }}
      >
        {tickerButton(isFr ? tickerPartieRapide : tickerQuickGame, labels.quickAlt, onQuick)}
        {tickerButton(tickerArcade, labels.arcadeAlt, onArcade)}
      </div>
    </div>
  );
}
