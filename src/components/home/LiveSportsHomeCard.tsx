import React from "react";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { SportId } from "../../contexts/SportContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { isLiveSportsSupportedSport } from "../../sportsLive/support";

type Props = {
  sport: SportId | string;
  onClick: () => void;
  style?: React.CSSProperties;
};

export default function LiveSportsHomeCard({ sport, onClick, style }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();

  if (!isLiveSportsSupportedSport(sport)) return null;

  const subtitle = pickLegacyLocalizedText(
    lang,
    "Directs • Calendrier • Résultats • Diffusions officielles",
    "Live • Schedule • Results • Official broadcasts",
    "Directo • Calendario • Resultados • Emisiones oficiales",
  );

  const hint = pickLegacyLocalizedText(
    lang,
    "Suivre les compétitions officielles",
    "Follow official competitions",
    "Seguir competiciones oficiales",
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`LIVE SPORTS — ${hint}`}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "54px minmax(0,1fr) auto",
        gap: 12,
        alignItems: "center",
        minHeight: 86,
        margin: "10px 0 14px",
        padding: "12px 14px",
        borderRadius: 20,
        border: "1px solid rgba(255,66,83,.44)",
        background:
          "radial-gradient(110% 160% at 0% 50%, rgba(255,40,58,.22), transparent 52%), linear-gradient(135deg, rgba(22,8,12,.98), rgba(8,10,16,.98))",
        color: theme.text ?? "#fff",
        boxShadow: "0 16px 32px rgba(0,0,0,.42), 0 0 24px rgba(255,48,68,.09)",
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(255,103,115,.50)",
          background: "linear-gradient(145deg, rgba(255,46,65,.30), rgba(255,46,65,.08))",
          color: "#ff5366",
          boxShadow: "0 0 18px rgba(255,46,65,.28)",
        }}
      >
        <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
          <path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
        </svg>
      </span>

      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 17, lineHeight: 1.05, letterSpacing: .6, color: "#fff" }}>LIVE SPORTS</strong>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 20,
              padding: "2px 7px",
              borderRadius: 999,
              background: "#ff3047",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 1000,
              letterSpacing: .7,
              boxShadow: "0 0 12px rgba(255,48,71,.38)",
            }}
          >
            ● LIVE
          </span>
        </span>
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, lineHeight: 1.35, color: theme.textSoft ?? "rgba(255,255,255,.72)" }}>
          {subtitle}
        </span>
      </span>

      <span aria-hidden style={{ color: "#ff5366", fontSize: 26, fontWeight: 1000, lineHeight: 1 }}>›</span>
    </button>
  );
}
