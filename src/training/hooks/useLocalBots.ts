import { useEffect, useState } from "react";

// ============================================
// src/training/hooks/useLocalBots.ts
// Hook local simple pour BOTS IA (training)
// Lecture depuis localStorage ("dc_local_bots")
// ============================================

export type BotProfile = {
  id: string;
  name: string;
  level?: string;
  avatarUrl?: string;
};

const STORAGE_KEY = "dc_local_bots";

function readBots(): BotProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useLocalBots(): BotProfile[] {
  const [bots, setBots] = useState<BotProfile[]>(() => readBots());

  useEffect(() => {
    const refresh = () => setBots(readBots());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  return bots;
}
