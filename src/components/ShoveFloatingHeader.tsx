import React from "react";
import shoveTicker from "../assets/tickers/ticker_shove_a_penny.webp";

type Props = {
  title: string;
  accent: string;
  onClose: () => void;
};

/**
 * En-tête commun des fenêtres flottantes SHOVE A PENNY.
 * Le bouton fermer est superposé en haut à droite du ticker,
 * et le titre du panneau est centré juste en dessous.
 */
export default function ShoveFloatingHeader({ title, accent, onClose }: Props) {
  return (
    <header data-shove-floating-header="1" style={{ display: "grid", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <img
          src={shoveTicker}
          alt="SHOVE A PENNY"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxHeight: 125,
            objectFit: "contain",
            objectPosition: "center",
            borderRadius: 12,
          }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={`Fermer ${title.toLowerCase()}`}
          title="Fermer"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 38,
            height: 38,
            borderRadius: 999,
            border: `1px solid ${accent}99`,
            background: "rgba(8, 12, 24, .82)",
            color: accent,
            fontSize: 20,
            fontWeight: 1000,
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 8px 18px rgba(0,0,0,.35), 0 0 14px ${accent}33`,
            backdropFilter: "blur(4px)",
          }}
        >
          ×
        </button>
      </div>

      <strong
        style={{
          width: "100%",
          textAlign: "center",
          color: accent,
          fontSize: 11,
          fontWeight: 1100,
          letterSpacing: 1.05,
          lineHeight: 1.3,
        }}
      >
        {title}
      </strong>
    </header>
  );
}
