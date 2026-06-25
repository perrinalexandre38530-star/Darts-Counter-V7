// @ts-nocheck
// =============================================================
// src/assets/teamLogoLibrary.ts
// Bibliothèque interne de logos d'équipe prêts à choisir.
// Les fichiers sont de vraies images WebP embarquées dans l'application.
// Convention fichiers : src/assets/team_logos/team_logo_001.webp, etc.
// =============================================================

import teamLogo001 from "./team_logos/team_logo_001.webp";
import teamLogo002 from "./team_logos/team_logo_002.webp";
import teamLogo003 from "./team_logos/team_logo_003.webp";
import teamLogo004 from "./team_logos/team_logo_004.webp";
import teamLogo005 from "./team_logos/team_logo_005.webp";
import teamLogo006 from "./team_logos/team_logo_006.webp";

export type TeamLogoCategory =
  | "popular"
  | "darts"
  | "football"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "molkky"
  | "dicegame"
  | "multisport";

export type TeamLogoTemplate = {
  id: string;
  fileName: string;
  label: string;
  category: TeamLogoCategory;
  tags: string[];
  src: string;
};

export const TEAM_LOGO_CATEGORIES: Array<{ id: TeamLogoCategory | "all"; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "popular", label: "Populaires" },
  { id: "darts", label: "Fléchettes" },
  { id: "football", label: "Foot" },
  { id: "petanque", label: "Pétanque" },
  { id: "babyfoot", label: "Baby-foot" },
  { id: "pingpong", label: "Ping-pong" },
  { id: "molkky", label: "Mölkky" },
  { id: "dicegame", label: "Dés" },
  { id: "multisport", label: "Multi" },
];

export const TEAM_LOGO_LIBRARY: TeamLogoTemplate[] = [
  {
    id: "team_logo_001",
    fileName: "team_logo_001.webp",
    label: "Logo 001",
    category: "multisport",
    tags: ["popular", "skull", "crane", "crâne", "blue", "bleu", "dark", "esport"],
    src: teamLogo001,
  },
  {
    id: "team_logo_002",
    fileName: "team_logo_002.webp",
    label: "Logo 002",
    category: "darts",
    tags: ["popular", "bullseye", "cible", "target", "darts", "fléchettes", "flechettes"],
    src: teamLogo002,
  },
  {
    id: "team_logo_003",
    fileName: "team_logo_003.webp",
    label: "Logo 003",
    category: "multisport",
    tags: ["popular", "wolf", "loup", "animal", "blue", "bleu", "esport"],
    src: teamLogo003,
  },
  {
    id: "team_logo_004",
    fileName: "team_logo_004.webp",
    label: "Logo 004",
    category: "multisport",
    tags: ["popular", "eagle", "aigle", "animal", "gold", "or", "esport"],
    src: teamLogo004,
  },
  {
    id: "team_logo_005",
    fileName: "team_logo_005.webp",
    label: "Logo 005",
    category: "multisport",
    tags: ["popular", "dragon", "purple", "violet", "animal", "fantasy", "esport"],
    src: teamLogo005,
  },
  {
    id: "team_logo_006",
    fileName: "team_logo_006.webp",
    label: "Logo 006",
    category: "multisport",
    tags: ["popular", "phoenix", "fire", "feu", "flamme", "orange", "esport"],
    src: teamLogo006,
  },
];

export function getRandomTeamLogo(category?: TeamLogoCategory | "all") {
  const wanted = String(category || "all");
  const filtered = TEAM_LOGO_LIBRARY.filter((logo) => {
    if (!wanted || wanted === "all") return true;
    if (wanted === "popular") return (logo.tags || []).includes("popular");
    return logo.category === wanted;
  });
  const pool = filtered.length ? filtered : TEAM_LOGO_LIBRARY;
  return pool[Math.floor(Math.random() * pool.length)] || TEAM_LOGO_LIBRARY[0];
}
