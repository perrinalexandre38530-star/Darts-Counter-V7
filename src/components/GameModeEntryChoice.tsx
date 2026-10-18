import React from "react";
import { useLang } from "../contexts/LangContext";
import BackDot from "./BackDot";
import tickerArcade from "../assets/tickers/ticker_arcade.png";
import tickerPartieRapide from "../assets/tickers/ticker_partie_rapide.png";
import tickerQuickGame from "../assets/tickers/ticker_quick_game.png";
import tickerX01 from "../assets/tickers/ticker_x01.png";

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
  const normalizedTitle = String(title || "").trim().toLowerCase();
  const modeTicker = normalizedTitle === "x01" ? tickerX01 : null;

  const labels = isFr
    ? {
        back: "Retour",
        quickAlt: "Partie rapide",
        arcadeAlt: "Arcade",
      }
    : {
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
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,.34))",
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
        gap: 8,
        overflowX: "hidden",
      }}
    >
      {modeTicker ? (
        <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "0 auto" }}>
          <img src={modeTicker} alt={title} style={{ width: "100%", height: "auto", display: "block", borderRadius: 16 }} />
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot onClick={onBack} title={labels.back} size={36} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", alignItems: "center", gap: 8 }}>
          <BackDot onClick={onBack} title={labels.back} size={36} />
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
          </div>
          <div />
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          minWidth: 0,
          margin: "4px auto 0",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 8,
        }}
      >
        {tickerButton(isFr ? tickerPartieRapide : tickerQuickGame, labels.quickAlt, onQuick)}
        {tickerButton(tickerArcade, labels.arcadeAlt, onArcade)}
      </div>
    </div>
  );
}
