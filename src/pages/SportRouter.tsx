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
import PetanqueMenu from "./petanque/PetanqueMenu"; // (tu l'as déjà)
import PetanquePlay from "./petanque/PetanquePlay"; // (tu l'as déjà)

export function SportHome(props: any) {
  const { sport } = useSport();
  if (sport === "petanque") return <PetanqueHome {...props} />;
  return <Home {...props} />;
}

export function SportGames(props: any) {
  const { sport } = useSport();
  if (sport === "petanque") return <PetanqueMenu {...props} />;
  return <Games {...props} />;
}

export function SportStats(props: any) {
  const { sport } = useSport();
  // Pétanque: pour l’instant on réutilise le même shell (visuel identique),
  // ensuite on branchera des dashboards pétanque dedans.
  return <StatsShell {...props} />;
}

export function SportTournaments(props: any) {
  const { sport } = useSport();
  // Tournois: mode commun multi-sport => on garde la même page (look identique)
  return <TournamentsHome {...props} />;
}

export function SportPetanquePlay(props: any) {
  return <PetanquePlay {...props} />;
}
