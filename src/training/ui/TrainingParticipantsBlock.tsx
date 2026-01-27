// ============================================
// src/training/ui/TrainingParticipantsBlock.tsx
// Bloc commun : Joueurs locaux + BOTS IA
// ============================================

import React from "react";
import type { Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import TrainingPlayersCarousel from "./TrainingPlayersCarousel";
import TrainingBotsCarousel from "./TrainingBotsCarousel";

export default function TrainingParticipantsBlock({
  profiles,
  selectedPlayerIds,
  setSelectedPlayerIds,
  selectedBotIds,
  setSelectedBotIds,
  maxPlayers = 4,
  maxBots = 4,
}: {
  profiles?: Profile[];
  selectedPlayerIds: string[];
  setSelectedPlayerIds: (ids: string[]) => void;
  selectedBotIds: string[];
  setSelectedBotIds: (ids: string[]) => void;
  maxPlayers?: number;
  maxBots?: number;
}) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 18,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.35)",
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 900, letterSpacing: 0.6, marginBottom: 8, color: theme.primary }}>
        Participants
      </div>

      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
        Sélectionne tes joueurs locaux et/ou des BOTS IA.
      </div>

      <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 6 }}>Joueurs locaux</div>
      <TrainingPlayersCarousel
        profiles={profiles}
        selectedIds={selectedPlayerIds}
        onChange={setSelectedPlayerIds}
        max={maxPlayers}
        min={1}
      />

      <div style={{ height: 10 }} />

      <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 6 }}>BOTS IA</div>
      <TrainingBotsCarousel selectedIds={selectedBotIds} onChange={setSelectedBotIds} max={maxBots} />
    </div>
  );
}
