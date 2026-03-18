// ============================================
// src/training/hooks/useLocalBots.ts
// Lecture BOTS (CPU) depuis localStorage / stockage compressé
// ============================================

import React from "react";
import { loadBots, subscribeBotsChange, type BotRecord, type BotLevel } from "../../lib/bots";

export type { BotLevel };

export type BotProfile = {
  id: string;
  name: string;
  level: BotLevel;
  botLevel?: string | null;
  avatarSeed?: string | number | null;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
};

function toBotProfile(b: BotRecord): BotProfile {
  const avatarDataUrl = b.avatarDataUrl ?? (b as any)?.avatarUrl ?? null;
  return {
    id: String(b.id ?? ""),
    name: String(b.name ?? "BOT"),
    level: (b.level ?? "medium") as BotLevel,
    botLevel: b.botLevel ?? b.level ?? null,
    avatarSeed: b.avatarSeed ?? null,
    avatarUrl: avatarDataUrl,
    avatarDataUrl,
  };
}

export function useLocalBots() {
  const [bots, setBots] = React.useState<BotProfile[]>([]);

  React.useEffect(() => {
    const refresh = () => {
      try {
        const next = loadBots()
          .filter(Boolean)
          .map(toBotProfile)
          .filter((b) => b.id);
        setBots(next);
      } catch {
        setBots([]);
      }
    };

    refresh();
    return subscribeBotsChange(refresh);
  }, []);

  return bots;
}
