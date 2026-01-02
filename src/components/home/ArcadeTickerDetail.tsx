// =============================================================
// src/components/home/ArcadeTickerDetail.tsx
// Bandeau détaillé sous le ticker principal
// - Même esprit néon premium
// - Hauteur ≈ 2 gros boutons Home
// - Détaille item.detail (splitté sur " · ") en puces KPI
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { ArcadeTickerItem } from "./ArcadeTicker";

type Props = {
  item: ArcadeTickerItem;
};

export default function ArcadeTickerDetail({ item }: Props) {
  const { theme } = useTheme();
  const accent = item.accentColor ?? theme.primary ?? "#F6C256";

  const detailParts =
    (item.detail ?? "")
      .split("·")
      .map((p) => p.trim())
      .filter(Boolean) || [];

  return (
    <div style={{ marginTop: 10, marginBottom: 18 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 22,
          border: `1px solid ${
            theme.borderSoft ?? "rgba(255,255,255,0.14)"
          }`,
          boxShadow: "0 22px 44px rgba(0,0,0,0.9)",
          minHeight: 150, // ≈ 2 gros boutons Home (marges comprises)
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.04), rgba(0,0,0,0.97))",
        }}
      >
        {/* Halo néon léger */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -30,
            background: `radial-gradient(circle at 0% 0%, ${accent}24, transparent 60%)`,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            padding: "12px 14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Titre + sous-titre */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {item.title}
          </div>

          {item.text && (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.4,
                color: theme.textSoft ?? "rgba(255,255,255,0.85)",
              }}
            >
              {item.text}
            </div>
          )}

          {/* Ligne de séparation néon */}
          <div
            style={{
              marginTop: 4,
              height: 2,
              borderRadius: 999,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              boxShadow: `0 0 10px ${accent}88`,
            }}
          />

          {/* Puces KPI détaillées */}
          {detailParts.length > 0 && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {detailParts.map((part) => (
                <div
                  key={part}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: `1px solid ${accent}AA`,
                    background: "rgba(0,0,0,0.72)",
                    boxShadow: `0 0 16px ${accent}55`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.textStrong ?? "#FFFFFF",
                    whiteSpace: "nowrap",
                  }}
                >
                  {part}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
