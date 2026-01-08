// ============================================
// src/pages/SportRouter.tsx
// Helper central: retourne les pages selon le sport actif
// ============================================

import React from "react";
import { useSport } from "../contexts/SportContext";

import Home from "./Home";
import Games from "./Games";
import StatsShell from "./StatsShell";
import TournamentsHome from "./TournamentsHome";

import PetanqueHome from "./petanque/PetanqueHome";
import PetanqueHub from "./petanque/PetanqueHub";
import PetanquePlay from "./petanque/PetanquePlay";

export function SportHome(props: any) {
  const { sport } = useSport();
  return sport === "petanque" ? <PetanqueHome {...props} /> : <Home {...props} />;
}

export function SportGames(props: any) {
  const { sport } = useSport();
  return sport === "petanque" ? <PetanqueHub {...props} /> : <Games {...props} />;
}

export function SportStats(props: any) {
  // Visuel identique (StatsShell). Plus tard: dashboards pétanque.
  return <StatsShell {...props} />;
}

export function SportTournaments(props: any) {
  // Tournois commun multi-sport (visuel identique)
  return <TournamentsHome {...props} />;
}

export function SportPetanquePlay(props: any) {
  return <PetanquePlay {...props} />;
}
