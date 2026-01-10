// ============================================
// src/components/CardBtn.tsx
// Bouton "card" réutilisable (style menu StatsShell / Profiles)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;

  // Optionnel : petit badge à droite (ex: "NEW")
  badge?: string;

  // Optionnel : remplace le chevron par un contenu custom à droite
  rightSlot?: React.ReactNode;

  // Optionnel : affiche un bouton "i" à droite (si tu veux)
  onInfo?: () => void;

  style?: React.CSSProperties;
};

export default function CardBtn({
  title,
  subtitle,
  onClick,
  disabled,
  badge,
  rightSlot,
  onInfo,
  style,
}: Props) {
  const { theme } = useTheme();

  const border = `1px solid ${theme?.border ?? "rgba(255,255,255,.10)"}`;
  const bg = theme?.card ?? "rgba(10,10,10,.55)";
  const textSoft = theme?.textSoft ?? "rgba(255,255,255,.70)";
  const primary = theme?.primary ?? "#b7ff1a";

  const canClick = !disabled && typeof onClick === "function";

  return (
    <button
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      style={{
        width: "100%",
        textAlign: "left",
        border,
        background: bg,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        cursor: canClick ? "pointer" : "not-allowed",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 900,
            letterSpacing: 0.8,
            fontSize: 18,
            color: "#fff",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 1.25,
              color: textSoft,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {badge ? (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.6,
              color: "#0b0b0b",
              background: primary,
              boxShadow: `0 0 18px ${primary}55`,
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </div>
        ) : null}

        {typeof onInfo === "function" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInfo();
            }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: `1px solid ${primary}55`,
              background: "rgba(0,0,0,.25)",
              color: primary,
              fontWeight: 900,
              cursor: "pointer",
            }}
            aria-label="Info"
            title="Info"
          >
            i
          </button>
        ) : null}

        {rightSlot ?? (
          <div
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: "#fff",
              opacity: 0.9,
              paddingLeft: 4,
            }}
            aria-hidden="true"
          >
            ›
          </div>
        )}
      </div>
    </button>
  );
}
