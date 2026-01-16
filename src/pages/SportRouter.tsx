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

import BabyFootMenuGames from "./babyfoot/BabyFootMenuGames";

import PingPongMenuGames from "./pingpong/PingPongMenuGames";

export function SportHome(props: any) {
  const { sport } = useSport();
  if (sport === "petanque") return <PetanqueHome {...props} />;
  // ✅ Pour Baby-Foot & Ping-Pong, on aligne le flux sur "DartsCounter" :
  // l'entrée du sport affiche le MENU MODES (comme l'onglet Games), pas un écran "resume".
  if (sport === "babyfoot") return <BabyFootMenuGames {...props} />;
  if (sport === "pingpong") return <PingPongMenuGames {...props} />;
  return <Home {...props} />;
}

export function SportGames(props: any) {
  const { sport } = useSport();
  if (sport === "petanque") return <PetanqueHub {...props} />;
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
