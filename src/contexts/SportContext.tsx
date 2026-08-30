// ============================================
// src/contexts/SportContext.tsx
// Sport actif (multi-jeux) — SAFE
// - Persiste dans localStorage "dc-start-game" (clé déjà utilisée par GameSelect)
// - N’impacte pas le store darts existant
// ============================================

import React from "react";
import { isAndroidStoreV1Runtime, isAndroidStoreV1SportAllowed } from "../config/androidStoreV1";

// ✅ Ajout MÖLKKY + DICE GAME (sports locaux)
export type SportId = "darts" | "petanque" | "pingpong" | "babyfoot" | "molkky" | "dicegame" | "foot" | "running" | "fit" | "esports";

const LS_KEY = "dc-start-game"; // on réutilise ta clé existante

function normalizeSport(x: any): SportId {
  const s = String(x || "").toLowerCase().trim();
  let next: SportId = "darts";
  if (s === "petanque") next = "petanque";
  else if (s === "pingpong") next = "pingpong";
  else if (s === "babyfoot") next = "babyfoot";
  else if (s === "molkky") next = "molkky";
  else if (s === "dicegame" || s === "dice" || s === "dice_game") next = "dicegame";
  // FOOT = sport football. Ne pas confondre avec le mode darts "football".
  else if (s === "foot" || s === "soccer") next = "foot";
  else if (s === "running" || s === "run") next = "running";
  else if (s === "fit" || s === "fitness" || s === "fitperf" || s === "fit_perf") next = "fit";
  else if (s === "esports" || s === "e-sports" || s === "gaming") next = "esports";

  // Une ancienne préférence Web ne doit pas rouvrir un sport BETA dans l'APK V1.
  if (isAndroidStoreV1Runtime() && !isAndroidStoreV1SportAllowed(next)) return "darts";
  return next;
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
let warnedMissingSportProvider = false;

function setSportWithoutProvider(s: SportId) {
  const next = normalizeSport(s);
  writeSport(next);
  try {
    window.dispatchEvent(new CustomEvent("dc:sport-change", { detail: { sport: next, source: "sport-context-fallback" } }));
  } catch {}
}

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = React.useState<SportId>(() => readSport());

  const setSport = React.useCallback((s: SportId) => {
    const next = normalizeSport(s);
    setSportState(next);
    writeSport(next);
  }, []);

  // si le LS change (multi-onglets) ou qu'un fallback boot/HMR demande
  // un changement de sport dans le même onglet, on resynchronise le Provider.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setSportState(normalizeSport(e.newValue));
    };
    const onSportChange = (e: Event) => {
      const next = normalizeSport((e as CustomEvent)?.detail?.sport);
      setSportState(next);
      writeSport(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("dc:sport-change", onSportChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dc:sport-change", onSportChange as EventListener);
    };
  }, []);

  return <SportContext.Provider value={{ sport, setSport }}>{children}</SportContext.Provider>;
}

export function useSport() {
  const ctx = React.useContext(SportContext);
  if (ctx) return ctx;

  // BOOT/HMR SAFE : StackBlitz/Vite peut momentanément conserver un Provider
  // provenant de l'ancienne instance du module pendant que ce hook vient d'être
  // rechargé. Un contexte React neuf vaut alors null même si <SportProvider> est
  // bien présent dans AppRoot. Cela ne doit jamais faire tomber toute l'application.
  if (!warnedMissingSportProvider) {
    warnedMissingSportProvider = true;
    console.warn("[SportContext] Provider momentanément indisponible — fallback boot/HMR activé");
  }

  return {
    sport: readSport(),
    setSport: setSportWithoutProvider,
  } satisfies Ctx;
}
