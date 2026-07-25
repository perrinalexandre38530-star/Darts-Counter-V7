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
  solo = false,
  allowBots = true,
}: {
  profiles?: Profile[];
  selectedPlayerIds: string[];
  setSelectedPlayerIds: (ids: string[]) => void;
  selectedBotIds: string[];
  setSelectedBotIds: (ids: string[]) => void;
  maxPlayers?: number;
  maxBots?: number;
  solo?: boolean;
  allowBots?: boolean;
}) {
  const { theme } = useTheme();
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const effectiveMaxPlayers = solo ? 1 : maxPlayers;

  React.useEffect(() => {
    if (!solo) return;
    if (selectedPlayerIds.length > 1) {
      setSelectedPlayerIds(selectedPlayerIds.slice(0, 1));
    }
  }, [selectedPlayerIds, setSelectedPlayerIds, solo]);

  React.useEffect(() => {
    if (!solo || selectedPlayerIds.length > 0 || safeProfiles.length === 0) return;
    const firstId = String(safeProfiles[0]?.id || "");
    if (firstId) setSelectedPlayerIds([firstId]);
  }, [safeProfiles, selectedPlayerIds.length, setSelectedPlayerIds, solo]);

  React.useEffect(() => {
    if (allowBots || selectedBotIds.length === 0) return;
    setSelectedBotIds([]);
  }, [allowBots, selectedBotIds, setSelectedBotIds]);

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 18,
        border: `1px solid ${theme.borderSoft}`,
        background: "linear-gradient(145deg,rgba(7,25,38,.82),rgba(0,0,0,.50))",
        padding: 12,
        boxShadow: "0 12px 28px rgba(0,0,0,.24)",
      }}
    >
      <div
        style={{
          fontWeight: 950,
          letterSpacing: 0.9,
          marginBottom: 5,
          color: "#27dcff",
          textTransform: "uppercase",
        }}
      >
        {solo ? "Joueur" : "Participants"}
      </div>

      <div style={{ fontSize: 12, opacity: 0.76, marginBottom: 9 }}>
        {solo
          ? "Session d'entraînement solo : sélectionne le profil qui recevra les statistiques."
          : "Sélectionne les joueurs locaux et, si le mode l'autorise, les BOTS IA."}
      </div>

      <TrainingPlayersCarousel
        profiles={safeProfiles}
        selectedIds={selectedPlayerIds}
        onChange={(ids) => setSelectedPlayerIds(solo ? ids.slice(-1) : ids)}
        max={effectiveMaxPlayers}
        min={1}
      />

      {allowBots && !solo ? (
        <>
          <div style={{ height: 10 }} />
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.88, marginBottom: 6 }}>
            BOTS IA
          </div>
          <TrainingBotsCarousel
            selectedIds={selectedBotIds}
            onChange={setSelectedBotIds}
            max={maxBots}
          />
        </>
      ) : null}
    </div>
  );
}
