// ============================================
// src/training/hooks/useLocalBots.ts
// Lecture BOTS (CPU) depuis localStorage (ProfilesBots.tsx: dc_bots_v1)
// ============================================

import React from "react";

export type BotLevel = "easy" | "medium" | "strong" | "pro" | "legend";

export type BotProfile = {
  id: string;
  name: string;
  level: BotLevel;
  botLevel?: string | null;
  avatarSeed?: string | number | null;
  avatarUrl?: string | null;
};

const LS_KEY = "dc_bots_v1";

export function useLocalBots() {
  const [bots, setBots] = React.useState<BotProfile[]>([]);

  React.useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return setBots([]);
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return setBots([]);
        setBots(
          arr
            .filter(Boolean)
            .map((b: any) => ({
              id: String(b.id ?? ""),
              name: String(b.name ?? "BOT"),
              level: (b.level ?? "medium") as BotLevel,
              botLevel: b.botLevel ?? b.level ?? null,
              avatarSeed: b.avatarSeed ?? null,
              avatarUrl: b.avatarUrl ?? null,
            }))
            .filter((b) => b.id)
        );
      } catch {
        setBots([]);
      }
    };

    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  return bots;
}
