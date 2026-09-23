// =============================================================
// CRADOS — BOTS IA officiels + familles/équipes
// Les BOTS CPU créés par l'utilisateur restent chargés séparément.
// =============================================================

import alexKleenex from "../assets/avatars/crados-bots/morvellos_alex_kleenex.webp";
import mathieuMorveux from "../assets/avatars/crados-bots/morvellos_mathieu_morveux.webp";
import brunoRhino from "../assets/avatars/crados-bots/morvellos_bruno_rhino.webp";
import reneQuiCoule from "../assets/avatars/crados-bots/morvellos_rene_qui_coule.webp";
import marcoCrado from "../assets/avatars/crados-bots/crado_marco_crado.webp";
import albanDegoutant from "../assets/avatars/crados-bots/crado_alban_degoutant.webp";
import momoPoubello from "../assets/avatars/crados-bots/crado_momo_poubello.webp";
import romainVilain from "../assets/avatars/crados-bots/crado_romain_vilain.webp";
import gegeDeglingue from "../assets/avatars/crados-bots/deglingos_gege_deglingue.webp";
import dedeDetraque from "../assets/avatars/crados-bots/deglingos_dede_detraque.webp";
import emileDebile from "../assets/avatars/crados-bots/deglingos_emile_debile.webp";
import rikeNique from "../assets/avatars/crados-bots/deglingos_rike_nique.webp";
import jojoRototo from "../assets/avatars/crados-bots/gastros_jojo_rototo.webp";
import herveDiarrhee from "../assets/avatars/crados-bots/gastros_herve_diarrhee.webp";
import cedricColique from "../assets/avatars/crados-bots/gastros_cedric_colique.webp";
import mathiasChiasse from "../assets/avatars/crados-bots/gastros_mathias_chiasse.webp";
import joseRatatine from "../assets/avatars/crados-bots/decompositos_jose_ratatine.webp";
import fanyPourrie from "../assets/avatars/crados-bots/decompositos_fany_pourrie.webp";
import liliMoisie from "../assets/avatars/crados-bots/decompositos_lili_moisie.webp";
import marionPutrefaction from "../assets/avatars/crados-bots/decompositos_marion_putrefaction.webp";
import theoVomito from "../assets/avatars/crados-bots/gerbos_theo_vomito.webp";
import yvetteGalette from "../assets/avatars/crados-bots/gerbos_yvette_galette.webp";
import bebertBegere from "../assets/avatars/crados-bots/gerbos_bebert_begere.webp";
import remiVomi from "../assets/avatars/crados-bots/gerbos_remi_vomi.webp";
import morvellosTeamBadge from "../assets/avatars/crados-teams/morvellos_team_badge.webp";
import cradoTeamBadge from "../assets/avatars/crados-teams/crado_team_badge.webp";
import deglingosTeamBadge from "../assets/avatars/crados-teams/deglingos_team_badge.webp";
import gastrosTeamBadge from "../assets/avatars/crados-teams/gastros_team_badge.webp";
import decompositosTeamBadge from "../assets/avatars/crados-teams/decompositos_team_badge.webp";
import gerbosTeamBadge from "../assets/avatars/crados-teams/gerbos_team_badge.webp";

export type CradosFamilyKey = "morvellos" | "crado" | "deglingos" | "gastros" | "decompositos" | "gerbos";
export type CradosOfficialBot = {
  id: string;
  name: string;
  avatarDataUrl: string;
  avatarUrl: string;
  avatar: string;
  isBot: true;
  bot: true;
  cpu: true;
  type: "bot";
  kind: "bot";
  source: "crados_official";
  systemBot: true;
  officialCharacter: true;
  locked: true;
  characterId: string;
  groupLabel: string;
  cradosFamily: CradosFamilyKey;
  cradosFamilyLabel: string;
  cradosAiLevel: number;
  cradosAiRating: number;
  cradosAiDifficulty: "easy" | "normal" | "hard";
  cradosLevelLabel: string;
  cradosRatingLabel: string;
  profileStarring: number;
  botLevel: string;
  level: string;
};

export type CradosBotTeam = {
  id: string;
  key: CradosFamilyKey;
  name: string;
  familyLabel: string;
  accent: string;
  memberIds: string[];
  botTeamLevel: number;
  botTeamRating: number;
  avatarDataUrl: string | null;
};

const FAMILY_META: Record<CradosFamilyKey, { label: string; accent: string; teamBadge: string }> = {
  morvellos: { label: "MORVELLOS", accent: "#9ad93a", teamBadge: morvellosTeamBadge },
  crado: { label: "CRADO", accent: "#d6a12e", teamBadge: cradoTeamBadge },
  deglingos: { label: "DÉGLINGOS", accent: "#8f6cff", teamBadge: deglingosTeamBadge },
  gastros: { label: "GASTROS", accent: "#ff6b35", teamBadge: gastrosTeamBadge },
  decompositos: { label: "DÉCOMPOSITOS", accent: "#20c9bd", teamBadge: decompositosTeamBadge },
  gerbos: { label: "GERBOS", accent: "#d3d43a", teamBadge: gerbosTeamBadge },
};

function difficultyForRating(rating: number): "easy" | "normal" | "hard" {
  if (rating >= 75) return "hard";
  if (rating >= 45) return "normal";
  return "easy";
}
function levelLabel(level: number): string {
  if (level >= 5) return "Boss";
  if (level >= 4.5) return "Expert";
  if (level >= 4) return "Difficile";
  if (level >= 3.5) return "Confirmé";
  if (level >= 3) return "Normal";
  if (level >= 2) return "Faible";
  return "Très faible";
}
function ratingLabel(rating: number): string {
  if (rating >= 90) return "Boss CRADOS";
  if (rating >= 75) return "Redoutable";
  if (rating >= 60) return "Solide";
  if (rating >= 45) return "Moyen";
  if (rating >= 30) return "Faible";
  return "Ultra-crasseux";
}
function bot(id: string, name: string, avatar: string, family: CradosFamilyKey, stars: number, rating: number): CradosOfficialBot {
  const meta = FAMILY_META[family];
  return {
    id,
    name,
    avatarDataUrl: avatar,
    avatarUrl: avatar,
    avatar,
    isBot: true,
    bot: true,
    cpu: true,
    type: "bot",
    kind: "bot",
    source: "crados_official",
    systemBot: true,
    officialCharacter: true,
    locked: true,
    characterId: id.replace(/^bot_crados_/, ""),
    groupLabel: meta.label,
    cradosFamily: family,
    cradosFamilyLabel: meta.label,
    cradosAiLevel: stars,
    cradosAiRating: rating,
    cradosAiDifficulty: difficultyForRating(rating),
    cradosLevelLabel: levelLabel(stars),
    cradosRatingLabel: ratingLabel(rating),
    profileStarring: stars,
    botLevel: `${stars}/5`,
    level: rating >= 90 ? "pro" : rating >= 75 ? "strong" : rating >= 45 ? "medium" : "easy",
  };
}

// Hiérarchie CRADOS validée : chaque BOT a une note visuelle en étoiles
// ET un rating IA interne /100. Plus le rating est bas, plus il vise mal,
// prend de mauvaises décisions et se salit facilement.
export const CRADOS_BOTS: CradosOfficialBot[] = [
  // MORVELLOS — moyenne équipe 63/100
  bot("bot_crados_morvellos_alex_kleenex", "Alex Kleenex", alexKleenex, "morvellos", 2.5, 54),
  bot("bot_crados_morvellos_bruno_rhino", "Bruno Rhino", brunoRhino, "morvellos", 3, 60),
  bot("bot_crados_morvellos_rene_qui_coule", "René qui coule", reneQuiCoule, "morvellos", 3.5, 66),
  bot("bot_crados_morvellos_mathieu_morveux", "Mathieu Morveux", mathieuMorveux, "morvellos", 3.5, 72),

  // CRADO — moyenne équipe 43/100
  bot("bot_crados_crado_alban_degoutant", "Alban Dégoûtant", albanDegoutant, "crado", 2, 34),
  bot("bot_crados_crado_romain_vilain", "Romain Vilain", romainVilain, "crado", 2, 40),
  bot("bot_crados_crado_momo_poubello", "Momo Poubello", momoPoubello, "crado", 2.5, 46),
  bot("bot_crados_crado_marco_crado", "Marco Crado", marcoCrado, "crado", 2.5, 52),

  // DÉGLINGOS — moyenne équipe 84.5/100
  bot("bot_crados_deglingos_emile_debile", "Émile Débile", emileDebile, "deglingos", 3.5, 74),
  bot("bot_crados_deglingos_rike_nique", "Riké Niqué", rikeNique, "deglingos", 4, 80),
  bot("bot_crados_deglingos_dede_detraque", "Dédé Détraqué", dedeDetraque, "deglingos", 4.5, 88),
  bot("bot_crados_deglingos_gege_deglingue", "Gégé Déglingué", gegeDeglingue, "deglingos", 5, 96),

  // GASTROS — moyenne équipe 53/100
  bot("bot_crados_gastros_herve_diarrhee", "Hervé Diarrhée", herveDiarrhee, "gastros", 2, 44),
  bot("bot_crados_gastros_cedric_colique", "Cédric Colique", cedricColique, "gastros", 2.5, 50),
  bot("bot_crados_gastros_jojo_rototo", "Jojo Rototo", jojoRototo, "gastros", 3, 56),
  bot("bot_crados_gastros_mathias_chiasse", "Mathias Chiasse", mathiasChiasse, "gastros", 3, 62),

  // DÉCOMPOSITOS — moyenne équipe 73/100
  bot("bot_crados_decompositos_jose_ratatine", "José Ratatiné", joseRatatine, "decompositos", 3, 64),
  bot("bot_crados_decompositos_fany_pourrie", "Fany Pourrie", fanyPourrie, "decompositos", 3.5, 70),
  bot("bot_crados_decompositos_lili_moisie", "Lili Moisie", liliMoisie, "decompositos", 4, 76),
  bot("bot_crados_decompositos_marion_putrefaction", "Marion Putréfaction", marionPutrefaction, "decompositos", 4, 82),

  // GERBOS — moyenne équipe 29/100 : les plus crasseux / faciles à battre
  bot("bot_crados_gerbos_yvette_galette", "Yvette Galette", yvetteGalette, "gerbos", 2, 38),
  bot("bot_crados_gerbos_remi_vomi", "Rémi Vomi", remiVomi, "gerbos", 1.5, 26),
  bot("bot_crados_gerbos_theo_vomito", "Théo Vomito", theoVomito, "gerbos", 1.5, 32),
  bot("bot_crados_gerbos_bebert_begere", "Bébert Begère", bebertBegere, "gerbos", 1, 20),
];

export const CRADOS_BOT_IDS = new Set(CRADOS_BOTS.map((item) => item.id));
export const CRADOS_BOT_BY_ID = Object.fromEntries(CRADOS_BOTS.map((item) => [item.id, item])) as Record<string, CradosOfficialBot>;

export const CRADOS_BOT_TEAMS: CradosBotTeam[] = (Object.keys(FAMILY_META) as CradosFamilyKey[]).map((key) => {
  const members = CRADOS_BOTS.filter((item) => item.cradosFamily === key);
  return {
    id: `bot_team_crados_${key}`,
    key,
    name: `Famille ${FAMILY_META[key].label}`,
    familyLabel: FAMILY_META[key].label,
    accent: FAMILY_META[key].accent,
    memberIds: members.map((item) => item.id),
    botTeamLevel: Math.round((members.reduce((sum, item) => sum + item.cradosAiLevel, 0) / Math.max(1, members.length)) * 10) / 10,
    botTeamRating: Math.round((members.reduce((sum, item) => sum + item.cradosAiRating, 0) / Math.max(1, members.length)) * 10) / 10,
    avatarDataUrl: FAMILY_META[key].teamBadge,
  };
});

export function isCradosOfficialBot(input: any): boolean {
  return CRADOS_BOT_IDS.has(String(input?.id || input || ""));
}

export function cradosBotRatingForProfile(profile: any, fallback: "easy" | "normal" | "hard" = "normal"): number {
  const official = CRADOS_BOT_BY_ID[String(profile?.id || "")];
  if (official) return official.cradosAiRating;

  const direct = Number(profile?.cradosAiRating);
  if (Number.isFinite(direct) && direct > 0) return Math.max(1, Math.min(100, direct));

  // Compatibilité avec les BOTS CPU personnels et les anciennes notes /5 :
  // 1★ = 20, 3★ = 58, 5★ = 96.
  const visibleLevel = Number(profile?.cradosAiLevel ?? profile?.profileStarring);
  if (Number.isFinite(visibleLevel) && visibleLevel > 0 && visibleLevel <= 5) {
    return Math.round((20 + (visibleLevel - 1) * 19) * 10) / 10;
  }

  const raw = String(profile?.botLevel ?? profile?.level ?? "").trim().toLowerCase().replace(",", ".");
  const numeric = Number((raw.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(numeric) && numeric > 0) {
    if (numeric > 5) return Math.max(1, Math.min(100, numeric));
    return Math.round((20 + (numeric - 1) * 19) * 10) / 10;
  }
  if (raw.includes("legend")) return 96;
  if (raw.includes("pro")) return 90;
  if (raw.includes("strong") || raw.includes("hard") || raw.includes("difficile")) return 80;
  if (raw.includes("medium") || raw.includes("normal") || raw.includes("moyen")) return 58;
  if (raw.includes("easy") || raw.includes("facile") || raw.includes("débutant") || raw.includes("debutant")) return 30;
  return fallback === "hard" ? 80 : fallback === "easy" ? 30 : 58;
}

export function cradosBotLevelForProfile(profile: any, fallback: "easy" | "normal" | "hard" = "normal"): number {
  const official = CRADOS_BOT_BY_ID[String(profile?.id || "")];
  if (official) return official.cradosAiLevel;
  const direct = Number(profile?.cradosAiLevel);
  if (Number.isFinite(direct) && direct > 0) return Math.max(1, Math.min(5, direct));
  const raw = String(profile?.profileStarring ?? profile?.botLevel ?? profile?.level ?? "").trim().toLowerCase().replace(",", ".");
  const numeric = Number((raw.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(numeric) && numeric > 0) return Math.max(1, Math.min(5, numeric > 5 ? numeric / 20 : numeric));
  if (raw.includes("legend")) return 5;
  if (raw.includes("pro")) return 4.5;
  if (raw.includes("strong") || raw.includes("hard") || raw.includes("difficile")) return 4;
  if (raw.includes("medium") || raw.includes("normal") || raw.includes("moyen")) return 3;
  if (raw.includes("easy") || raw.includes("facile") || raw.includes("débutant") || raw.includes("debutant")) return 2;
  return fallback === "hard" ? 4 : fallback === "easy" ? 2 : 3;
}
