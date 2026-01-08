// ============================================
// src/contexts/SportContext.tsx
// Sport actif (multi-jeux) — SAFE
// - Persiste dans localStorage "dc-start-game" (clé déjà utilisée par GameSelect)
// - N’impacte pas le store darts existant
// ============================================

import React from "react";

export type SportId = "darts" | "petanque" | "pingpong" | "babyfoot";

const LS_KEY = "dc-start-game"; // on réutilise ta clé existante

function normalizeSport(x: any): SportId {
  const s = String(x || "").toLowerCase().trim();
  if (s === "petanque") return "petanque";
  if (s === "pingpong") return "pingpong";
  if (s === "babyfoot") return "babyfoot";
  return "darts";
}

function readSport(): SportId {
  try {
    return normalizeSport(localStorage.getItem(LS_KEY));
  } catch {
    return "darts";
  }
}

function writeSport(sport: SportId) {
  try {
    localStorage.setItem(LS_KEY, sport);
  } catch {}
}

type Ctx = {
  sport: SportId;
  setSport: (s: SportId) => void;
};

const SportContext = React.createContext<Ctx | null>(null);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = React.useState<SportId>(() => readSport());

  const setSport = React.useCallback((s: SportId) => {
    const next = normalizeSport(s);
    setSportState(next);
    writeSport(next);
  }, []);

  // si le LS change (multi-onglets), on resync
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setSportState(normalizeSport(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <SportContext.Provider value={{ sport, setSport }}>{children}</SportContext.Provider>;
}

export function useSport() {
  const ctx = React.useContext(SportContext);
  if (!ctx) throw new Error("useSport() must be used within <SportProvider>");
  return ctx;
}
