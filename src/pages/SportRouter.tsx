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
import PetanquePlay from "./petanque/PetanquePlay";
import PetanqueMenuGames from "./petanque/PetanqueMenuGames";

import BabyFootHome from "./babyfoot/BabyFootHome";
import BabyFootMenuGames from "./babyfoot/BabyFootMenuGames";

import PingPongHome from "./pingpong/PingPongHome";
import PingPongMenuGames from "./pingpong/PingPongMenuGames";

export function SportHome(props: any) {
  const { sport } = useSport();
  if (sport === "petanque") return <PetanqueHome {...props} />;
  if (sport === "babyfoot") return <BabyFootHome {...props} />;
  if (sport === "pingpong") return <PingPongHome {...props} />;
  return <Home {...props} />;
}

export function SportGames(props: any) {
  const { sport } = useSport();
  // ✅ Menu "Local" identique DartsCounter, adapté au sport
  if (sport === "petanque") return <PetanqueMenuGames {...props} />;
  if (sport === "babyfoot") return <BabyFootMenuGames {...props} />;
  if (sport === "pingpong") return <PingPongMenuGames {...props} />;
  return <Games {...props} />;
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
