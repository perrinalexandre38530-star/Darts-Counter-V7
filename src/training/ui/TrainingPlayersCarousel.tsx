// ============================================
// src/training/ui/TrainingPlayersCarousel.tsx
// Carrousel de joueurs locaux
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { Profile } from "../../lib/types";
import ProfileAvatar from "../../components/ProfileAvatar";

function initialsFromName(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TrainingPlayersCarousel({
  profiles,
  selectedIds,
  onChange,
  max = 4,
  min = 1,
}: {
  profiles?: Profile[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  min?: number;
}) {
  const { theme } = useTheme();
  const list = Array.isArray(profiles) ? profiles : [];

  if (!list.length) {
    return (
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Aucun profil local. Crée un profil dans l’onglet « Profils ».
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 6,
        paddingRight: 6,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {list.map((p) => {
        const selected = selectedIds.includes(p.id);
        const name = (p as any).nickname ?? (p as any).name ?? "Joueur";
        const initials = initialsFromName(name);

        return (
          <button
            key={p.id}
            type="button"
            title={name}
            onClick={() => {
              const exists = selectedIds.includes(p.id);
              if (exists) {
                if (selectedIds.length <= min) return;
                onChange(selectedIds.filter((id) => id !== p.id));
                return;
              }
              if (selectedIds.length >= max) return;
              onChange([...selectedIds, p.id]);
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
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative" }}>
                <ProfileAvatar
                  profile={p as any}
                  size={58}
                  showStars={false}
                  avg3D={null as any}
                  ringColor={selected ? theme.primary : "rgba(255,255,255,0.16)"}
                  textColor="#fff"
                />
                {!((p as any).avatarUrl || (p as any).avatarDataUrl) ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 16,
                      color: "rgba(255,255,255,0.9)",
                      textShadow: "0 0 10px rgba(0,0,0,0.9)",
                    }}
                  >
                    {initials}
                  </div>
                ) : null}
              </div>
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
              {name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
