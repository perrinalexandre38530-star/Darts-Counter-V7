// ============================================
// src/training/ui/TrainingBotsCarousel.tsx
// Carrousel BOTS IA
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLocalBots, type BotProfile } from "../hooks/useLocalBots";

function badge(level: string) {
  const l = String(level || "").toLowerCase();
  if (l === "easy") return "EASY";
  if (l === "medium") return "MED";
  if (l === "strong") return "STR";
  if (l === "pro") return "PRO";
  if (l === "legend") return "LEG";
  return l.toUpperCase();
}

export default function TrainingBotsCarousel({
  bots,
  selectedIds,
  onChange,
  max = 4,
}: {
  bots?: BotProfile[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}) {
  const { theme } = useTheme();
  const localBots = useLocalBots();
  const list = Array.isArray(bots) ? bots : localBots;

  if (!list.length) {
    return (
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Aucun BOT. Va dans « Profils » → « BOTS » pour en créer.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, paddingRight: 6 }}>
      {list.map((b) => {
        const selected = selectedIds.includes(b.id);
        return (
          <button
            key={b.id}
            type="button"
            title={b.name}
            onClick={() => {
              const exists = selectedIds.includes(b.id);
              if (exists) return onChange(selectedIds.filter((id) => id !== b.id));
              if (selectedIds.length >= max) return;
              onChange([...selectedIds, b.id]);
            }}
            style={{
              flexShrink: 0,
              width: 86,
              borderRadius: 18,
              border: selected ? `1px solid ${theme.primary}88` : "1px solid rgba(255,255,255,0.12)",
              background: selected ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.04)",
              boxShadow: selected ? `0 0 22px ${theme.primary}44` : "0 10px 22px rgba(0,0,0,0.35)",
              padding: 10,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto",
                border: selected ? `2px solid ${theme.primary}` : "2px solid rgba(255,255,255,0.18)",
                boxShadow: selected ? `0 0 18px ${theme.primary}55` : "none",
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {b.avatarUrl ? (
                <img src={b.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                badge(b.level).slice(0, 3)
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 900,
                textAlign: "center",
                color: selected ? theme.primary : "rgba(255,255,255,0.92)",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {b.name}
            </div>

            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                fontSize: 10,
                fontWeight: 900,
                padding: "2px 6px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {badge(b.level)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
