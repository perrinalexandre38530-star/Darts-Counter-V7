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
        gridTemplateColumns: "32px minmax(0,1fr) auto",
        gap: 8,
        alignItems: "center",
        minHeight: 46,
        margin: "5px 0 8px",
        padding: "6px 10px",
        borderRadius: 13,
        border: "1px solid rgba(255,66,83,.40)",
        background: "linear-gradient(90deg, rgba(138,14,31,.92), rgba(12,14,20,.96) 42%, rgba(7,9,13,.98))",
        color: theme.text ?? "#fff",
        boxShadow: "0 8px 18px rgba(0,0,0,.26)",
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
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(255,255,255,.28)",
          background: "rgba(255,48,71,.16)",
          color: "#ff6576",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
          <path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
        </svg>
      </span>

      <span style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, overflow: "hidden" }}>
        <strong style={{ flex: "0 0 auto", fontSize: 13, lineHeight: 1, letterSpacing: .45, color: "#fff" }}>LIVE SPORTS</strong>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5, lineHeight: 1.2, color: theme.textSoft ?? "rgba(255,255,255,.72)" }}>
          {subtitle}
        </span>
      </span>

      <span aria-hidden style={{ color: "#ff6576", fontSize: 18, fontWeight: 1000, lineHeight: 1 }}>›</span>
    </button>
  );
}
