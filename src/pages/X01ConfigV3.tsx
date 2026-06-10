// @ts-nocheck
// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 — style "Cricket params" + gestion d'équipes
// + Sélection de BOTS IA créés dans Profils (LS "dc_bots_v1")
// + Intégration de BOTS IA "pro" prédéfinis (Green Machine, Snake King…)
// + NEW : audio config (Sons Arcade / Bruitages / Voix IA + voix sélection)
// + NEW : Comptage externe (vidéo / bridge) + bouton "i" explicatif (tuto + tests)
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BotPagedSelector from "../components/BotPagedSelector";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import tickerX01 from "../assets/tickers/ticker_x01.png";
import {
  getAllDartSets,
  getAllSelectableDartSets,
  getDartSetsForProfile,
  getPublicDartSetsForSelector,
  getFavoriteDartSetForProfile,
  getDartSetThumbImageSrc,
  getDartSetMainImageSrc,
  type DartSet,
} from "../lib/dartSetsStore";
import { x01EnsureAudioUnlocked, x01SfxV3Preload } from "../lib/x01SfxV3";
import { SCORE_INPUT_LS_KEY, sanitizeScoreInputMethod, type ScoreInputMethod } from "../lib/scoreInput/types";
import { loadBots as loadStoredBots, subscribeBotsChange } from "../lib/bots";
import { useCurrentProfile } from "../contexts/StoreContext";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { BOT_PRO_TEAMS } from "../lib/botTeams";
import botTeamEliteLogo from "../assets/ui/competition_bot_team_elite.webp";
import botTeamProLogo from "../assets/ui/competition_bot_team_pro.webp";
import botTeamChallengerLogo from "../assets/ui/competition_bot_team_challenger.webp";
import botTeamMixLogo from "../assets/ui/competition_bot_team_mix.webp";
import botTeamRisingLogo from "../assets/ui/competition_bot_team_rising.webp";

// 🔽 IMPORTS DE TOUS LES AVATARS BOTS PRO
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";

const BOT_TEAM_LOGO_BY_KEY: Record<string, any> = {
  elite: botTeamEliteLogo,
  pro: botTeamProLogo,
  challenger: botTeamChallengerLogo,
  mix: botTeamMixLogo,
  rising: botTeamRisingLogo,
};

// UI-only: "multi" = plusieurs joueurs en mode classique (pas teams)
type MatchModeV3 = "solo" | "multi" | "teams";
type MultiFinishModeV3 = "stop_on_first" | "continue_ranking";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";
type TeamId = "gold" | "pink" | "blue" | "green";
type TeamsSourceMode = "manual" | "saved";
type ParticipantMode = "players" | "teams";

type Props = {
  profiles: Profile[];
  activeProfileId?: string | null;
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
  go?: (tab: any, params?: any) => void; // pour ouvrir "Créer BOT"
};

const START_SCORES: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
const LEGS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];
const SETS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];

const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};

const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f7c85c",
  pink: "#ff4fa2",
  blue: "#4fc3ff",
  green: "#6dff7c",
};

// ---------- Audio / voix ----------
type VoiceOption = { id: string; label: string };

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "default", label: "Défaut" },
  { id: "female", label: "Voix féminine" },
  { id: "male", label: "Voix masculine" },
  { id: "robot", label: "Voix robot" },
];

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string; // libellé ("Easy", "Standard", "Pro", "Légende", etc.)
};

type ResolvedPlayerPrefs = {
  favX01: 301 | 501 | 701 | 901;
  favDoubleOut: boolean;
  ttsVoice: string;
  sfxVolume: number;
};

function normalizeFavX01(input: unknown, fallback: 301 | 501 | 701 | 901 = 501): 301 | 501 | 701 | 901 {
  const allowed: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
  const n = Number(input);
  return allowed.includes(n as any) ? (n as 301 | 501 | 701 | 901) : fallback;
}

function normalizeFavDoubleOut(input: unknown, fallback = true): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input !== 0;
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["false", "0", "off", "no", "non", "simple", "simple-out", "single", "single-out"].includes(raw)) return false;
  if (["true", "1", "on", "yes", "oui", "double", "double-out"].includes(raw)) return true;
  return fallback;
}

function normalizeVoiceId(input: unknown, fallback = "default"): string {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["default", "female", "male", "robot"].includes(raw)) return raw;
  if (raw.includes("fem")) return "female";
  if (raw.includes("male") || raw.includes("masc") || raw.includes("homme")) return "male";
  if (raw.includes("robot")) return "robot";
  return fallback;
}

function normalizeSfxVolumePct(input: unknown, fallback = 80): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return 0;
  if (n >= 100) return 100;
  return Math.round(n);
}

function extractProfilePrefs(profile: any): ResolvedPlayerPrefs {
  const preferences = ((profile as any)?.preferences || {}) as Record<string, any>;
  const privateInfo = ((profile as any)?.privateInfo || {}) as Record<string, any>;
  const merged = { ...preferences, ...privateInfo };

  return {
    favX01: normalizeFavX01(
      merged.favX01 ?? merged.prefX01StartScore ?? merged.defaultX01 ?? merged.startScore,
      501
    ),
    favDoubleOut: normalizeFavDoubleOut(
      merged.favDoubleOut ?? merged.doubleOut ?? merged.outMode,
      true
    ),
    ttsVoice: normalizeVoiceId(
      merged.ttsVoice ?? merged.voiceId ?? merged.voice ?? merged.tts,
      "default"
    ),
    sfxVolume: normalizeSfxVolumePct(merged.sfxVolume ?? merged.volumeSfx ?? merged.sfx ?? merged.volume, 80),
  };
}

function buildDefaultSelectedIds(humans: Profile[], activeProfileId: string | null | undefined): string[] {
  const ordered = Array.isArray(humans) ? humans.slice() : [];
  if (activeProfileId) {
    const idx = ordered.findIndex((p) => p.id === activeProfileId);
    if (idx > 0) {
      const [active] = ordered.splice(idx, 1);
      if (active) ordered.unshift(active);
    }
  }
  if (ordered.length >= 2) return [ordered[0].id, ordered[1].id];
  if (ordered.length === 1) return [ordered[0].id];
  return [];
}


const X01_LAST_SELECTED_PLAYERS_KEY = "dc_x01_v3_last_selected_player_ids";
const X01_PLAYER_USAGE_KEY = "dc_x01_v3_player_usage_counts";

function x01ReadJsonObject(key: string): any {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function x01ReadLastSelectedPlayerIds(): string[] {
  const parsed = x01ReadJsonObject(X01_LAST_SELECTED_PLAYERS_KEY);
  const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ids) ? parsed.ids : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    const sid = String(id || "").trim();
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    out.push(sid);
  }
  return out;
}

function x01ReadPlayerUsageCounts(): Record<string, number> {
  const parsed = x01ReadJsonObject(X01_PLAYER_USAGE_KEY);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed || {})) {
    const id = String(k || "").trim();
    const n = Number(v);
    if (id && Number.isFinite(n) && n > 0) out[id] = n;
  }
  return out;
}

function x01PersistLastSelectedPlayerIds(ids: string[]) {
  try {
    if (typeof window === "undefined") return;
    const clean = (ids || []).map((x) => String(x || "").trim()).filter(Boolean);
    window.localStorage.setItem(X01_LAST_SELECTED_PLAYERS_KEY, JSON.stringify({ ids: clean, ts: Date.now() }));
  } catch {}
}

function x01BumpPlayerUsage(ids: string[]) {
  try {
    if (typeof window === "undefined") return;
    const counts = x01ReadPlayerUsageCounts();
    for (const raw of ids || []) {
      const id = String(raw || "").trim();
      if (!id) continue;
      counts[id] = Number(counts[id] || 0) + 1;
    }
    window.localStorage.setItem(X01_PLAYER_USAGE_KEY, JSON.stringify(counts));
  } catch {}
}

function buildLastOrDefaultSelectedIds(humans: Profile[], activeProfileId: string | null | undefined): string[] {
  const available = new Set((Array.isArray(humans) ? humans : []).map((p: any) => String(p?.id || "").trim()).filter(Boolean));
  const recent = x01ReadLastSelectedPlayerIds().filter((id) => available.has(id));
  if (recent.length > 0) return recent;
  return buildDefaultSelectedIds(humans, activeProfileId);
}



function x01ProfileNameKey(value: any): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function x01BuildProfileLookup(profiles: any[] = []) {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  const addId = (raw: any, canonical: string) => {
    const id = String(raw || "").trim();
    if (id && canonical) byId.set(id, canonical);
  };
  for (const p of Array.isArray(profiles) ? profiles : []) {
    const canonical = String(p?.id || p?.profileId || p?.localProfileId || p?.playerId || p?.uid || "").trim();
    if (!canonical) continue;
    [p?.id, p?.profileId, p?.localProfileId, p?.playerId, p?.uid, p?.uuid].forEach((v) => addId(v, canonical));
    const nk = x01ProfileNameKey(p?.name || p?.displayName || p?.label);
    if (nk) byName.set(nk, canonical);
  }
  return { byId, byName };
}

function x01ResolveHistoryPlayerId(raw: any, lookup: { byId: Map<string, string>; byName: Map<string, string> }): string {
  const id = String(raw || "").trim();
  if (!id) return "";
  return lookup.byId.get(id) || lookup.byName.get(x01ProfileNameKey(id)) || id;
}

function x01ExtractPlayerIdsFromHistoryRow(row: any, lookup = x01BuildProfileLookup([])): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (v: any) => {
    const id = x01ResolveHistoryPlayerId(v, lookup);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  const visitPlayer = (p: any, depth = 0) => {
    if (!p || depth > 4) return;
    if (typeof p === "string" || typeof p === "number") {
      add(p);
      return;
    }
    if (Array.isArray(p)) {
      p.forEach((x) => visitPlayer(x, depth + 1));
      return;
    }
    if (typeof p !== "object") return;

    // Champs d'identité fréquents dans les historiques anciens/nouveaux.
    [
      p.id, p.profileId, p.playerId, p.localProfileId, p.uid, p.uuid,
      p.pid, p.userProfileId, p.ownerProfileId, p.linkedTargetLocalProfileId,
      p.name, p.displayName, p.label,
    ].forEach(add);

    // Parcours ciblé : on évite un scan JSON complet trop coûteux mais on couvre
    // les formes réelles des payloads de match X01 / multi / reprise.
    const nestedKeys = [
      "player", "profile", "participant", "players", "profiles", "participants",
      "teamPlayers", "lineup", "members", "opponents", "scores", "scoreByPlayer",
      "stats", "statsByPlayer", "avg3ByPlayer", "config", "state", "summary",
      "payload", "resume", "game",
    ];
    for (const key of nestedKeys) {
      if (p[key] != null) visitPlayer(p[key], depth + 1);
    }
  };

  const buckets = [
    row?.players,
    row?.participants,
    row?.profiles,
    row?.playerIds,
    row?.profileIds,
    row?.summary?.players,
    row?.summary?.participants,
    row?.summary?.profiles,
    row?.summary?.playerIds,
    row?.summary?.profileIds,
    row?.payload?.players,
    row?.payload?.participants,
    row?.payload?.profiles,
    row?.payload?.playerIds,
    row?.payload?.profileIds,
    row?.payload?.config?.players,
    row?.payload?.config?.participants,
    row?.payload?.config?.profiles,
    row?.payload?.config?.playerIds,
    row?.payload?.config?.profileIds,
    row?.payload?.state?.players,
    row?.payload?.state?.participants,
    row?.resume?.players,
    row?.resume?.participants,
    row?.resume?.config?.players,
    row?.resume?.config?.participants,
    row?.game?.players,
    row?.game?.participants,
  ];
  for (const bucket of buckets) visitPlayer(bucket);

  // Certains historiques n'ont pas de tableau players mais uniquement des maps
  // par id joueur : avg3ByPlayer, statsByPlayer, scoreByPlayer...
  const idMaps = [
    row?.summary?.avg3ByPlayer,
    row?.summary?.statsByPlayer,
    row?.summary?.scoreByPlayer,
    row?.payload?.summary?.avg3ByPlayer,
    row?.payload?.summary?.statsByPlayer,
    row?.payload?.statsByPlayer,
    row?.payload?.scoreByPlayer,
    row?.resume?.statsByPlayer,
    row?.resume?.scoreByPlayer,
  ];
  for (const map of idMaps) {
    if (map && typeof map === "object" && !Array.isArray(map)) {
      Object.keys(map).forEach(add);
    }
  }

  return out;
}

function x01MergePlayerUsageFromHistory(rows: any[], base: Record<string, number> = {}, profiles: any[] = []): Record<string, number> {
  const out: Record<string, number> = { ...(base || {}) };
  const lookup = x01BuildProfileLookup(profiles);
  for (const row of Array.isArray(rows) ? rows : []) {
    // On compte uniquement les lignes qui ressemblent à des matchs réels.
    const kind = String(row?.kind || row?.game?.mode || row?.payload?.kind || row?.payload?.game?.mode || "").toLowerCase();
    const ids = x01ExtractPlayerIdsFromHistoryRow(row, lookup);
    if (!ids.length) continue;
    const weight = kind.includes("x01") || !kind ? 1 : 1;
    for (const id of ids) out[id] = Number(out[id] || 0) + weight;
    const winnerId = row?.winnerId ?? row?.summary?.winnerId ?? row?.payload?.winnerId ?? row?.payload?.summary?.winnerId;
    const wid = x01ResolveHistoryPlayerId(winnerId, lookup);
    if (wid) out[wid] = Number(out[wid] || 0) + 0.25;
  }
  return out;
}

function sortProfilesByUsageThenAlpha(profiles: Profile[], usageCounts: Record<string, number>, activeProfileId?: string | null): Profile[] {
  const usageScore = (p: any) => {
    const ids = [p?.id, p?.profileId, p?.playerId, p?.localProfileId, p?.uid].map((x) => String(x || "").trim()).filter(Boolean);
    let best = 0;
    for (const id of ids) best = Math.max(best, Number(usageCounts?.[id] || 0));
    const fields = [p?.usageCount, p?.useCount, p?.uses, p?.timesUsed, p?.matchCount, p?.matchesCount, p?.matchesPlayed, p?.gamesPlayed, p?.played];
    for (const raw of fields) {
      const n = Number(raw);
      if (Number.isFinite(n)) best = Math.max(best, n);
    }
    return best;
  };
  return (Array.isArray(profiles) ? profiles : []).slice().sort((a: any, b: any) => {
    const ua = usageScore(a);
    const ub = usageScore(b);
    if (ua !== ub) return ub - ua;
    // Si aucune stat d'utilisation n'existe encore, on garde le profil actif devant.
    if (ua === 0 && ub === 0 && activeProfileId) {
      if (String(a?.id) === String(activeProfileId) && String(b?.id) !== String(activeProfileId)) return -1;
      if (String(b?.id) === String(activeProfileId) && String(a?.id) !== String(activeProfileId)) return 1;
    }
    return String(a?.name || a?.label || "").localeCompare(String(b?.name || b?.label || ""), undefined, { sensitivity: "base", numeric: true });
  });
}


function parseX01BotLevelValue(input: any, fallback = 1): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.max(1, Math.min(5, Math.round(input * 2) / 2));
  }

  const raw = String(input ?? "").trim();
  const value = raw.toLowerCase();
  if (!value) return fallback;

  const fraction = value.match(/(\d+(?:[.,]\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(String(fraction[1]).replace(",", "."));
    if (Number.isFinite(n)) return Math.max(1, Math.min(5, Math.round(n * 2) / 2));
  }

  const decimal = value.match(/(?:niveau|level|lvl|botlevel|stars?|étoiles?)?\s*(\d+(?:[.,]\d+)?)/);
  if (decimal) {
    const n = Number(String(decimal[1]).replace(",", "."));
    if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.max(1, Math.min(5, Math.round(n * 2) / 2));
  }

  if (value.includes("legend") || value.includes("légende") || value.includes("legende")) return 5;
  if (value.includes("prodige")) return 4.5;
  if (value.includes("pro")) return 4;
  if (value.includes("fort") || value.includes("strong") || value.includes("hard") || value.includes("difficile")) return 3;
  if (value.includes("standard") || value.includes("regular") || value.includes("medium") || value.includes("normal") || value.includes("moyen")) return 2;
  if (value.includes("easy") || value.includes("facile") || value.includes("beginner") || value.includes("débutant") || value.includes("debutant") || value.includes("rookie")) return 1;

  return fallback;
}

function x01BotLevelToStarAvg3d(input: any, fallback = 1): number {
  return Math.round(parseX01BotLevelValue(input, fallback) * 20);
}

function toBotLite(input: any): BotLite {
  return {
    id: String(input?.id || ""),
    name: input?.name || "BOT",
    avatarDataUrl: input?.avatarDataUrl ?? input?.avatarUrl ?? input?.avatar ?? null,
    avatarUrl: input?.avatarUrl ?? input?.avatar ?? null,
    avatar: input?.avatar ?? input?.avatarUrl ?? input?.avatarDataUrl ?? null,
    botLevel:
      input?.botLevel ??
      input?.levelLabel ??
      input?.levelName ??
      input?.performanceLevel ??
      input?.performance ??
      input?.skill ??
      input?.difficulty ??
      input?.level ??
      "",
  };
}

// -------------------------------------------------------------
// PlayerDartBadge
// - Petit badge "jeu de fléchettes" sous un joueur X01
// - Affiche le set courant (image + nom)
// - 1 clic = passe au suivant
// - Inclut "Aucune" dans la boucle
// - Par défaut : Aucune (PAS de favori implicite)
// -------------------------------------------------------------
type PlayerDartBadgeProps = {
  profileId?: string | null;
  dartSetId?: string | null;
  onChange: (id: string | null) => void;
  compact?: boolean;
  allProfiles?: any[];
};

function x01IsFavoriteDartSet(set: any): boolean {
  if (!set) return false;
  return Boolean(
    set.isFavorite ||
      set.favorite ||
      set.fav ||
      set.starred ||
      set.isFav ||
      set.favoriteDartSet ||
      set.favoriteSet ||
      set.pinned
  );
}

function sortDartSetsForProfilePicker(list: DartSet[]): DartSet[] {
  return (Array.isArray(list) ? list : [])
    .slice()
    .sort((a: any, b: any) => {
      // Ordre demandé dans X01 :
      // 1) sets privés favoris autorisés
      // 2) sets publics favoris
      // 3) sets privés
      // 4) sets publics
      // puis utilisation, puis alphabétique.
      const privateA = !x01IsPublicDartSet(a) ? 1 : 0;
      const privateB = !x01IsPublicDartSet(b) ? 1 : 0;
      const favA = x01IsFavoriteDartSet(a) ? 1 : 0;
      const favB = x01IsFavoriteDartSet(b) ? 1 : 0;

      const groupA = privateA * 2 + favA;
      const groupB = privateB * 2 + favB;
      if (groupA !== groupB) return groupB - groupA;

      const usageA = Number(a?.usageCount || 0);
      const usageB = Number(b?.usageCount || 0);
      if (usageA !== usageB) return usageB - usageA;

      return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
}

function getDartSetThumbSrc(set: any): string | null {
  if (!set) return null;
  return getDartSetMainImageSrc(set) || getDartSetThumbImageSrc(set) || null;
}

function x01NormId(value: any): string {
  return String(value || "").trim();
}

function x01NormText(value: any): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function x01IsGlobalOwnerId(value: any): boolean {
  const id = x01NormText(value);
  return !id || ["global", "public", "shared", "all", "default", "library", "bibliotheque", "commun", "common"].includes(id);
}

function x01ScopeFlag(set: any): string {
  return x01NormText(set?.scope || set?.visibility || set?.access || set?.sharing || set?.shareScope || "");
}

function x01OwnerIds(set: any): string[] {
  const raw = [
    set?.profileId,
    set?.profile_id,
    set?.ownerProfileId,
    set?.localProfileId,
    set?.linkedTargetLocalProfileId,
    set?.privateProfileId,
    set?.targetLocalProfileId,
    set?.targetProfileId,
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    const id = x01NormId(v);
    if (!id || x01IsGlobalOwnerId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}


function x01GetDartSetOwnerProfile(set: any, allProfiles: any[] = []): any | null {
  if (!set || x01IsPublicDartSet(set)) return null;
  const owners = x01OwnerIds(set);
  if (!owners.length) return null;

  const profiles = Array.isArray(allProfiles) ? allProfiles : [];
  for (const ownerId of owners) {
    const ownerKey = x01NormId(ownerId);
    const found = profiles.find((p: any) => {
      const values = [p?.id, p?.profileId, p?.localProfileId, p?.playerId, p?.uid, p?.uuid];
      return values.some((v) => x01NormId(v) === ownerKey);
    });
    if (found) return found;
  }

  // Fallback minimal : permet quand même d'afficher une pastille avec initiale
  // si le profil complet n'est pas encore chargé dans la liste locale.
  return { id: owners[0], name: "" };
}

function x01ProfileIdentitySet(profileId: string, allProfiles: any[] = []): Set<string> {
  const ids = new Set<string>();
  const add = (v: any) => {
    const id = x01NormId(v);
    if (id && !x01IsGlobalOwnerId(id)) ids.add(id);
  };
  add(profileId);
  const pid = x01NormId(profileId);
  for (const p of Array.isArray(allProfiles) ? allProfiles : []) {
    const values = [p?.id, p?.profileId, p?.localProfileId, p?.playerId, p?.uid, p?.uuid];
    if (values.map(x01NormId).includes(pid)) values.forEach(add);
  }
  return ids;
}

function x01KnownProfileIds(allProfiles: any[] = []): Set<string> {
  const ids = new Set<string>();
  const add = (v: any) => {
    const id = x01NormId(v);
    if (id && !x01IsGlobalOwnerId(id)) ids.add(id);
  };
  for (const p of Array.isArray(allProfiles) ? allProfiles : []) {
    [p?.id, p?.profileId, p?.localProfileId, p?.playerId, p?.uid, p?.uuid].forEach(add);
  }
  return ids;
}

function x01HasExplicitPrivateTarget(set: any): boolean {
  return Boolean(x01NormId(set?.privateProfileId || set?.linkedTargetLocalProfileId || set?.targetLocalProfileId || set?.targetProfileId));
}

function x01HasConcreteOwnerValue(value: any): boolean {
  return x01NormId(value).length > 0;
}

function x01IsExplicitPublic(set: any): boolean {
  const flag = x01ScopeFlag(set);

  // PRIORITÉ ABSOLUE AU PUBLIC EXPLICITE.
  // Des anciennes sauvegardes ont gardé private=true/privateProfileId sur des
  // sets repassés en public. Si on relit ces vieux champs avant le public, X01
  // cache les publics pour les joueurs qui n'ont pas de privé.
  if (flag === "public" || flag === "global" || flag === "shared" || flag === "all") return true;
  if (set?.isPublic === true || set?.public === true || set?.shared === true) return true;

  const ownerValues = [set?.profileId, set?.ownerProfileId, set?.localProfileId, set?.profile_id];
  const hasAnyConcreteOwner = ownerValues.some((v) => x01HasConcreteOwnerValue(v) && !x01IsGlobalOwnerId(v));
  const hasGlobalOrEmptyOwner = !hasAnyConcreteOwner;

  // CORRECTION CIBLÉE : dans tes données actuelles, les publics créés dans
  // MES FLÉCHETTES peuvent rester marqués private=true/scope=private après
  // édition, MAIS sans propriétaire concret. Pour X01, sans propriétaire concret
  // = bibliothèque publique visible par tous. On garde l'exclusion si le set a
  // une cible privée explicite.
  if (hasGlobalOrEmptyOwner && !x01HasExplicitPrivateTarget(set)) return true;

  return false;
}

function x01IsExplicitPrivate(set: any): boolean {
  // IMPORTANT : PUBLIC gagne toujours sur les vieux flags legacy private/isPrivate.
  // Plusieurs versions précédentes ont laissé privateProfileId/private=true sur
  // des sets repassés en public, ce qui cachait tous les publics dans X01.
  if (x01IsExplicitPublic(set)) return false;
  const flag = x01ScopeFlag(set);
  return flag === "private" || flag === "prive" || flag === "privé" || set?.isPrivate === true || set?.private === true || x01HasExplicitPrivateTarget(set);
}

function x01IsPublicDartSet(set: any): boolean {
  // Public uniquement si le set le dit explicitement, ou si son propriétaire
  // legacy est global/public. Un custom sans owner clair ne devient plus public :
  // c'est exactement le cas qui faisait apparaître The Nuke chez Chevroute/Lehna.
  if (x01IsExplicitPublic(set)) return true;
  const hasPrivateMarker = x01IsExplicitPrivate(set) || x01HasExplicitPrivateTarget(set);
  if (hasPrivateMarker) return false;
  const ownerValues = [set?.profileId, set?.ownerProfileId, set?.localProfileId, set?.profile_id];
  return ownerValues.some((v) => x01HasConcreteOwnerValue(v) && x01IsGlobalOwnerId(v));
}

function x01DartSetMatchesProfile(set: any, profileId: string, allProfiles: any[] = []): boolean {
  const ids = x01ProfileIdentitySet(profileId, allProfiles);
  if (!ids.size || !set) return false;
  const owners = x01OwnerIds(set);
  // Un set privé sans propriétaire explicite ne doit pas devenir visible pour tout le monde.
  if (!owners.length) return false;
  return owners.some((id) => ids.has(id));
}

function x01DartSetSelectableForProfile(set: any, profileId: string, allProfiles: any[] = []): boolean {
  if (!set) return false;

  // RÈGLE FINALE X01 :
  // - PUBLIC = visible pour tous, même si des vieux champs privateProfileId/private
  //   sont encore stockés sur l'objet après une ancienne édition.
  // - PRIVÉ = visible uniquement pour le profil propriétaire.
  // L'erreur précédente était le "&& !x01HasExplicitPrivateTarget(set)" :
  // il cachait les sets publics qui portaient encore un champ privé legacy.
  if (x01IsPublicDartSet(set)) return true;

  const owners = x01OwnerIds(set);
  const profileIds = x01ProfileIdentitySet(profileId, allProfiles);
  const knownIds = x01KnownProfileIds(allProfiles);
  const ownerMatchesProfile = owners.some((id) => profileIds.has(id));

  const ownerIsKnownProfile = owners.some((id) => knownIds.has(id));
  if (x01IsExplicitPrivate(set) || ownerIsKnownProfile) return ownerMatchesProfile;

  // Données anciennes non publiques avec propriétaire inconnu : on ne les étend plus
  // à tous les joueurs. Les vrais publics passent déjà par x01IsPublicDartSet().
  return false;
}

function x01DedupeDartSets(list: DartSet[]): DartSet[] {
  const out: DartSet[] = [];
  const seen = new Set<string>();
  for (const set of Array.isArray(list) ? list : []) {
    const id = String((set as any)?.id || "").trim();
    const key = id || `${String((set as any)?.name || "").trim().toLowerCase()}|${String((set as any)?.mainImageUrl || (set as any)?.thumbImageUrl || "")}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(set);
  }
  return out;
}


let x01DartSetPickerCache: { version: string; byProfile: Record<string, DartSet[]> } | null = null;
function x01DartSetStorageVersion(): string {
  try {
    if (typeof window === "undefined") return "server";
    const raw = window.localStorage.getItem("dc_dart_sets_v1") || "";
    const meta = window.localStorage.getItem("dc_dart_sets_v1_meta") || "";
    // Inclure début + fin : changer public/privé peut garder la même longueur
    // et ne pas toucher les 96 premiers caractères, donc l'ancien cache X01
    // pouvait conserver une liste fausse.
    return `${raw.length}:${meta.length}:${raw.slice(0, 160)}:${raw.slice(-160)}:${meta.slice(0, 96)}:${meta.slice(-96)}`;
  } catch { return `${Date.now()}`; }
}
function x01GetCachedPickerDartSets(profileId: string, allProfiles: any[] = []): DartSet[] {
  const pid = String(profileId || "").trim();
  const version = x01DartSetStorageVersion();
  if (!x01DartSetPickerCache || x01DartSetPickerCache.version !== version) {
    x01DartSetPickerCache = { version, byProfile: {} };
  }
  if (!x01DartSetPickerCache.byProfile[pid]) {
    // Cache PAR PROFIL + invalidation par contenu localStorage : le changement
    // public/privé/favori est donc visible immédiatement dans X01, même si
    // l'évènement dc-dartsets-updated n'a pas été reçu par cette page.
    // Source robuste du sélecteur X01 :
    // 1) TOUS les sets publics réellement présents dans MES FLÉCHETTES, même si
    //    le store legacy ne les remonte pas via getPublicDartSetsForSelector().
    // 2) Les sets privés du profil demandé uniquement.
    // On ne modifie pas la règle propriétaire : le filtre final garde les privés
    // exclusifs au joueur, mais les publics passent enfin pour tout le monde.
    const allSelectable = getAllSelectableDartSets() || [];
    const allPublics = (allSelectable as any[]).filter((set: any) => x01IsPublicDartSet(set));
    x01DartSetPickerCache.byProfile[pid] = x01DedupeDartSets([
      ...(getPublicDartSetsForSelector() || []),
      ...allPublics,
      ...(getDartSetsForProfile(pid) || []),
    ] as any).filter((set: any) => x01DartSetSelectableForProfile(set, pid, allProfiles));
  }
  return x01DartSetPickerCache.byProfile[pid] || [];
}

const PlayerDartBadge: React.FC<PlayerDartBadgeProps> = ({
  profileId,
  dartSetId,
  onChange,
  compact = false,
  allProfiles = [],
}) => {
  const { theme, palette } = useTheme() as any;
  const { lang } = useLang() as any;
  const primary = (theme?.primary || palette?.primary || "#f5c35b") as string;

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [open, setOpen] = React.useState(false);

  const reloadSets = React.useCallback(() => {
    if (!profileId) {
      setSets([]);
      return;
    }
    // Source finale du sélecteur :
    // - publics reconstruits par le store = visibles pour tous ;
    // - privés retournés par getDartSetsForProfile = uniquement propriétaire.
    // On garde le filtre X01 en sécurité, mais le store fait maintenant la
    // séparation stricte public/privé à la source.
    const all = x01GetCachedPickerDartSets(String(profileId || ""), allProfiles);
    const library = all;

    try {
      if (typeof window !== "undefined" && (window as any).__DARTSETS_DEBUG === true) {
        console.info("[DartSetsDiag:X01Picker] reload", {
          profileId,
          libraryCount: library.length,
          count: all.length,
          publicCount: all.filter((x: any) => x01IsPublicDartSet(x) && !x01IsExplicitPrivate(x)).length,
          privateCount: all.filter((x: any) => x01IsExplicitPrivate(x)).length,
          names: all.map((x: any) => `${x?.name || "SET"}:${x?.scope || "?"}:${x?.profileId || "?"}`).slice(0, 20),
        });
      }
    } catch {}
    const nextSets = sortDartSetsForProfilePicker(all);
    setSets((prev) => {
      const a = (prev || []).map((x: any) => String(x?.id || "")).join("|");
      const b = nextSets.map((x: any) => String((x as any)?.id || "")).join("|");
      return a === b ? prev : nextSets;
    });
  }, [profileId, allProfiles]);

  React.useEffect(() => {
    reloadSets();
  }, [reloadSets]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onUpdated = () => { x01DartSetPickerCache = null; reloadSets(); };
    window.addEventListener("dc-dartsets-updated", onUpdated);
    return () => window.removeEventListener("dc-dartsets-updated", onUpdated);
  }, [reloadSets]);

  const hasProfile = !!profileId;
  const noneLabel = lang === "fr" ? "Aucun set" : "No set";
  const chooseLabel = lang === "fr" ? "Choix SET" : "SET choice";
  const titleLabel = lang === "fr" ? "Choisir un set" : "Choose dart set";

  // Ordre demandé : favoris d'abord, puis nombre d'utilisation, puis alphabetique.
  const orderedSets: DartSet[] = React.useMemo(() => sortDartSetsForProfilePicker(sets || []), [sets]);
  const selectedSet = React.useMemo(
    () => orderedSets.find((s: any) => String(s?.id) === String(dartSetId || "")) || null,
    [orderedSets, dartSetId]
  );

  const selectSet = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  if (!hasProfile) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          reloadSets();
          setOpen(true);
        }}
        aria-label={chooseLabel}
        title={titleLabel}
        style={{
          position: compact ? "absolute" : "relative",
          left: compact ? 8 : undefined,
          bottom: compact ? 6 : undefined,
          zIndex: compact ? 4 : undefined,
          marginTop: compact ? 0 : 6,
          alignSelf: "center",
          padding: compact ? 0 : "7px 12px",
          width: compact ? 30 : undefined,
          height: compact ? 30 : undefined,
          borderRadius: 999,
          border: `1px solid ${selectedSet ? primary : "rgba(255,255,255,.14)"}`,
          background: selectedSet
            ? `radial-gradient(circle at 0% 0%, ${primary}44, rgba(8,8,20,.96))`
            : "rgba(10,11,22,.92)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? 0 : 7,
          color: selectedSet ? "#fff" : "rgba(255,255,255,.86)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.45,
          textTransform: "uppercase",
          minWidth: compact ? 30 : 98,
          maxWidth: compact ? 30 : 108,
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: selectedSet ? `0 0 14px ${primary}55` : "0 0 10px rgba(0,0,0,.55)",
        }}
      >
        {selectedSet ? (
          <span
            style={{
              width: compact ? 24 : 30,
              height: compact ? 24 : 30,
              borderRadius: "50%",
              overflow: "hidden",
              border: `1px solid ${primary}`,
              boxShadow: `0 0 10px ${primary}66`,
              display: "inline-grid",
              placeItems: "center",
              flex: "0 0 auto",
              background: "rgba(0,0,0,.6)",
            }}
          >
            {getDartSetThumbSrc(selectedSet) ? (
              <img src={getDartSetThumbSrc(selectedSet) as string} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 13, lineHeight: 1 }}>🎯</span>
            )}
          </span>
        ) : (
          <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        )}
        {compact ? null : <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedSet ? "SET" : chooseLabel}</span>}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.68)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 430px)",
              maxHeight: "78vh",
              overflow: "hidden",
              borderRadius: 24,
              border: `1px solid ${primary}66`,
              background: "linear-gradient(180deg, rgba(16,18,32,.98), rgba(5,6,13,.98))",
              boxShadow: `0 0 34px ${primary}44, 0 24px 70px rgba(0,0,0,.75)`,
              padding: 14,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <div style={{ color: primary, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", fontSize: 15 }}>
                {titleLabel}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                maxHeight: "calc(78vh - 86px)",
                overflowY: "auto",
                paddingRight: 2,
              }}
              className="dc-scroll-thin"
            >
              <button
                type="button"
                onClick={() => selectSet(null)}
                style={{
                  borderRadius: 18,
                  border: !selectedSet ? `2px solid ${primary}` : "1px solid rgba(255,255,255,.12)",
                  background: !selectedSet ? `radial-gradient(circle at 50% 0%, ${primary}30, rgba(12,13,23,.98))` : "rgba(255,255,255,.04)",
                  color: "#fff",
                  minHeight: 106,
                  padding: 8,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 28 }}>⛔</span>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{noneLabel}</span>
              </button>

              {orderedSets.map((set: any) => {
                const thumb = getDartSetThumbSrc(set);
                const selected = String(set?.id) === String(dartSetId || "");
                const ownerProfile = x01GetDartSetOwnerProfile(set, allProfiles);
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => selectSet(set.id)}
                    style={{
                      position: "relative",
                      borderRadius: 18,
                      border: selected ? `2px solid ${primary}` : "1px solid rgba(255,255,255,.12)",
                      background: selected ? `radial-gradient(circle at 50% 0%, ${primary}30, rgba(12,13,23,.98))` : "rgba(255,255,255,.04)",
                      color: "#fff",
                      padding: 8,
                      cursor: "pointer",
                      boxShadow: selected ? `0 0 18px ${primary}55` : "0 10px 22px rgba(0,0,0,.35)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 7,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 15,
                        overflow: "hidden",
                        background: set?.bgColor || "rgba(255,255,255,.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 26 }}>🎯</span>
                      )}
                      {x01IsFavoriteDartSet(set) ? (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: 7,
                            top: 6,
                            zIndex: 3,
                            color: "#f5c35b",
                            fontSize: 20,
                            lineHeight: "20px",
                            textShadow: "0 0 7px rgba(245,195,91,.95), 0 0 16px rgba(245,195,91,.72)",
                            pointerEvents: "none",
                          }}
                        >
                          ★
                        </span>
                      ) : null}
                      {ownerProfile ? (
                        <span
                          title={ownerProfile?.name ? `Set privé de ${ownerProfile.name}` : "Set privé"}
                          style={{
                            position: "absolute",
                            right: 5,
                            bottom: 5,
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(5,6,12,.72)",
                            border: `1px solid ${primary}`,
                            boxShadow: `0 0 12px ${primary}88`,
                            overflow: "visible",
                          }}
                        >
                          <ProfileAvatar
                            profile={ownerProfile}
                            size={24}
                            showStars={false}
                            noFrame
                          />
                        </span>
                      ) : null}
                    </span>
                    <span
                      style={{
                        width: "100%",
                        fontSize: 10,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {set?.name || "SET"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

// ------------------------------------------------------
// BOTS IA "PRO" PRÉDÉFINIS
// ------------------------------------------------------
const PRO_BOTS: BotLite[] = [
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine as any },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid as any },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand as any },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower as any },

  { id: "bot_pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney as any },
  { id: "bot_pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot as any },
  { id: "bot_pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney as any },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan as any },

  { id: "bot_pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing as any },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy as any },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret as any },

  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp as any },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood as any },
  { id: "bot_pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple as any },
  { id: "bot_pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace as any },

  { id: "bot_pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant as any },
  { id: "bot_pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage as any },
  { id: "bot_pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart as any },
  { id: "bot_pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer as any },
];


// Équipes BOTS IA proposées dans le mode Équipes enregistrées.
// Elles utilisent les mêmes IDs que PRO_BOTS pour que X01PlayV3 les joue comme de vrais BOTS IA.
const BOT_TEAM_OPTIONS: any[] = [
  {
    id: "bot_team_elite_ia",
    name: "BOT Élite IA",
    isBotTeam: true,
    botLevel: "5/5",
    logoDataUrl: avatarGreenMachine as any,
    playerIds: ["bot_pro_mvg", "bot_pro_littler", "bot_pro_humphries", "bot_pro_taylor"],
  },
  {
    id: "bot_team_pro_ia",
    name: "BOT Pro IA",
    isBotTeam: true,
    botLevel: "4.5/5",
    logoDataUrl: avatarCraftyCockney as any,
    playerIds: ["bot_pro_crafty", "bot_pro_jackpot", "bot_pro_barney", "bot_pro_price"],
  },
  {
    id: "bot_team_challenger_ia",
    name: "BOT Challenger IA",
    isBotTeam: true,
    botLevel: "4/5",
    logoDataUrl: avatarSnakeKing as any,
    playerIds: ["bot_pro_wright", "bot_pro_anderson", "bot_pro_smith", "bot_pro_clayton"],
  },
  {
    id: "bot_team_mixte_ia",
    name: "BOT Mixte IA",
    isBotTeam: true,
    botLevel: "3.5/5",
    logoDataUrl: avatarTheAsp as any,
    playerIds: ["bot_pro_aspinall", "bot_pro_dobey", "bot_pro_darth_maple", "bot_pro_menace"],
  },
  {
    id: "bot_team_rising_ia",
    name: "BOT Rising IA",
    isBotTeam: true,
    botLevel: "3/5",
    logoDataUrl: avatarTheGiant as any,
    playerIds: ["bot_pro_the_giant", "bot_pro_voltage", "bot_pro_one_dart", "bot_pro_the_hammer"],
  },
];

export default function X01ConfigV3({ profiles, activeProfileId: activeProfileIdProp = null, onBack, onStart, go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  // ⚠️ Garde ces constantes de thème tout en haut du composant.
  // Les versions minifiées peuvent renommer `primary` en R1/B1/etc. ;
  // si une JSX factory ou un handler les lit avant leur initialisation,
  // la page plante en TDZ: "Cannot access 'R1' before initialization".
  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  const [rulesOpen, setRulesOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Always land at the top when entering config screens
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try { window.scrollTo(0, 0); } catch {}
    }
    const el = contentRef.current;
    if (el) el.scrollTop = 0;
  }, []);


  const allProfiles: Profile[] = profiles ?? [];
  const currentProfile = useCurrentProfile<any>();
  const activeProfileId = React.useMemo(() => {
    const fromProp = String(activeProfileIdProp || "").trim();
    if (fromProp) return fromProp;
    const fromContext = String(currentProfile?.id || "").trim();
    if (fromContext) return fromContext;
    try {
      const fromWindow = String((window as any)?.__appStore?.store?.activeProfileId || "").trim();
      return fromWindow || null;
    } catch {
      return null;
    }
  }, [activeProfileIdProp, currentProfile?.id]);
  const humanProfiles = React.useMemo(
    () => allProfiles.filter((p) => !(p as any).isBot),
    [allProfiles]
  );

  // ---- BOTS depuis stockage local (avec écoute live) ----
  const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>(() => {
    try {
      return loadStoredBots().map(toBotLite);
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const refresh = () => {
      try {
        setBotsFromLS(loadStoredBots().map(toBotLite));
      } catch (e) {
        console.warn("[X01ConfigV3] load BOTS LS failed:", e);
        setBotsFromLS([]);
      }
    };

    refresh();
    return subscribeBotsChange(refresh);
  }, []);

  // Bots créés dans le store (Profils) marqués isBot
  const userBotsFromStore: BotLite[] = React.useMemo(() => {
    return (allProfiles || [])
      .filter((p) => (p as any).isBot)
      .map((p: any) => ({
        id: p.id,
        name: p.name || "BOT",
        avatarDataUrl: p.avatarDataUrl ?? null,
        botLevel:
          p.botLevel ??
          p.levelLabel ??
          p.levelName ??
          p.performanceLevel ??
          p.performance ??
          p.skill ??
          p.difficulty ??
          "",
      }));
  }, [allProfiles]);

  // Base user bots = fusion store + LS (évite les pertes si une seule source est à jour)
  const userBots: BotLite[] = React.useMemo(() => {
    const merged = new Map<string, BotLite>();
    for (const bot of botsFromLS || []) merged.set(bot.id, bot);
    for (const bot of userBotsFromStore || []) {
      merged.set(bot.id, { ...(merged.get(bot.id) || {}), ...bot });
    }
    return Array.from(merged.values());
  }, [userBotsFromStore, botsFromLS]);

  // BOTS finaux = PRO + user
  const botProfiles: BotLite[] = React.useMemo(() => {
    return [...PRO_BOTS, ...userBots];
  }, [userBots]);

  // Profils disponibles pour l'assignation d'équipes = profils humains du store + bots PRO/user
  // (sinon les PRO_BOTS ne sont pas trouvés dans `profiles.find(...)` dans TeamsSection)
  const teamProfiles: Profile[] = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of allProfiles || []) m.set(p.id, p);
    for (const b of botProfiles || []) {
      if (!m.has(b.id)) {
        m.set(b.id, {
          id: b.id,
          name: b.name || "BOT",
          // components/ProfileAvatar gère avatarDataUrl
          avatarDataUrl: (b as any).avatarDataUrl ?? (b as any).avatarUrl ?? (b as any).avatar ?? null,
          avatarUrl: (b as any).avatarUrl ?? (b as any).avatar ?? null,
          avatar: (b as any).avatar ?? (b as any).avatarUrl ?? (b as any).avatarDataUrl ?? null,
          isBot: true,
          botLevel: b.botLevel || "",
        });
      }
    }
    return Array.from(m.values()) as Profile[];
  }, [allProfiles, botProfiles]);

  // ---- état local des paramètres ----
  const [playerUsageCounts, setPlayerUsageCounts] = React.useState<Record<string, number>>(() => x01ReadPlayerUsageCounts());

  React.useEffect(() => {
    const refreshUsage = () => setPlayerUsageCounts(x01ReadPlayerUsageCounts());
    refreshUsage();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", refreshUsage);
    window.addEventListener("dc-x01-player-usage-updated", refreshUsage as any);
    return () => {
      window.removeEventListener("storage", refreshUsage);
      window.removeEventListener("dc-x01-player-usage-updated", refreshUsage as any);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    const run = async () => {
      try {
        const mod = await import("../lib/history");
        const rows = await mod.History.list().catch(() => []);
        if (!alive) return;
        const merged = x01MergePlayerUsageFromHistory(rows as any[], x01ReadPlayerUsageCounts(), humanProfiles);
        try { window.localStorage.setItem(X01_PLAYER_USAGE_KEY, JSON.stringify(merged)); } catch {}
        setPlayerUsageCounts(merged);
        try { window.dispatchEvent(new Event("dc-x01-player-usage-updated")); } catch {}
        try { console.info("[x01-history-usage-scan-done]", { matches: Array.isArray(rows) ? rows.length : 0, players: Object.keys(merged).length }); } catch {}
      } catch {}
    };
    const w: any = window as any;
    // L'ordre "plus utilisés" doit être prêt dès l'ouverture du sélecteur.
    // Avant, requestIdleCallback pouvait attendre plusieurs secondes, donc la
    // première page restait alphabétique. On lance le scan une fois le rendu rendu.
    const id = window.setTimeout(run, 0);
    return () => {
      alive = false;
      try {
        window.clearTimeout(id as any);
      } catch {}
    };
  }, [humanProfiles]);

  const preferredHumanProfiles = React.useMemo(() => {
    return sortProfilesByUsageThenAlpha(humanProfiles, playerUsageCounts, activeProfileId);
  }, [humanProfiles, playerUsageCounts, activeProfileId]);

  const startTouchedRef = React.useRef(false);
  const outTouchedRef = React.useRef(false);
  const playersTouchedRef = React.useRef(false);

  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<InModeV3>("simple");
  const [outMode, setOutMode] = React.useState<OutModeV3>("double");
  const [legsPerSet, setLegsPerSet] = React.useState<number>(3);
  const [setsToWin, setSetsToWin] = React.useState<number>(1);
  const [serveMode, setServeMode] = React.useState<ServiceModeV3>("alternate");
  const [matchMode, setMatchMode] = React.useState<MatchModeV3>("solo");
  const [multiFinishMode, setMultiFinishMode] = React.useState<MultiFinishModeV3>("stop_on_first");

  // ---- NEW : AUDIO OPTIONS ----
  const [arcadeEnabled, setArcadeEnabled] = React.useState<boolean>(true);
  const [hitEnabled, setHitEnabled] = React.useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(true);
  const [voiceId, setVoiceId] = React.useState<string>("default");
  const [profileSfxVolume, setProfileSfxVolume] = React.useState<number>(0.8);

  // ---- NEW : COMPTAGE EXTERNE ----
  const [externalScoringEnabled, setExternalScoringEnabled] = React.useState<boolean>(false);
  // ---- NEW : SAISIE VOCALE DES SCORES (MVP) ----
  const [voiceScoreEnabled, setVoiceScoreEnabled] = React.useState<boolean>(false);

  // ---- METHODE DE SAISIE (Keypad / Cible / Presets / Voice) ----
  const [scoreInputMethod, setScoreInputMethod] = React.useState<ScoreInputMethod>(() => {
    try {
      const raw = localStorage.getItem(SCORE_INPUT_LS_KEY) || "keypad";
      const method = sanitizeScoreInputMethod(raw);
      if (method !== raw) localStorage.setItem(SCORE_INPUT_LS_KEY, method);
      return method;
    } catch {}
    return "keypad";
  });

  const selectScoreInputMethod = React.useCallback((method: ScoreInputMethod) => {
    setScoreInputMethod(method);
    try {
      localStorage.setItem(SCORE_INPUT_LS_KEY, method);
    } catch {}

    if (method === "voice") {
      setVoiceScoreEnabled(true);
      setExternalScoringEnabled(false);
      return;
    }

    // Une méthode manuelle ou preset coupe la commande vocale pour éviter deux moteurs actifs.
    setVoiceScoreEnabled(false);
  }, []);

  const [externalInfoOpen, setExternalInfoOpen] = React.useState<boolean>(false);
  const [externalInfoStep, setExternalInfoStep] = React.useState<1 | 2 | 3>(1);

  // ✅ Helpers TEST : envoie des events vers X01PlayV3
  const dispatchExternalDart = React.useCallback((segment: number, multiplier: 1 | 2 | 3) => {
    try {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent("dc:x01v3:dart", { detail: { segment, multiplier } }));
    } catch (e) {
      console.warn("[X01ConfigV3] dispatchExternalDart failed", e);
    }
  }, []);

  const dispatchExternalVisit = React.useCallback(
    (darts: Array<{ segment: number; multiplier: 1 | 2 | 3 }>) => {
      try {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("dc:x01v3:visit", { detail: { darts: (darts || []).slice(0, 3) } })
        );
      } catch (e) {
        console.warn("[X01ConfigV3] dispatchExternalVisit failed", e);
      }
    },
    []
  );

  // évite d’écraser le choix manuel si on change de joueur sélectionné
  const voiceTouchedRef = React.useRef(false);

  // Source principale de participants : joueurs classiques ou équipes fléchettes enregistrées/manuelles.
  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>("players");

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    buildLastOrDefaultSelectedIds(preferredHumanProfiles, activeProfileId)
  );

  React.useEffect(() => {
    const availableIds = new Set<string>([
      ...humanProfiles.map((p) => p.id),
      ...botProfiles.map((b) => b.id),
    ]);

    setSelectedIds((prev) => {
      const filtered = (prev || []).filter((id) => availableIds.has(id));
      if (filtered.length > 0 && filtered.length === (prev || []).length) return filtered;
      if (filtered.length > 0) return filtered;
      return buildLastOrDefaultSelectedIds(preferredHumanProfiles, activeProfileId);
    });
  }, [humanProfiles, botProfiles, preferredHumanProfiles, activeProfileId]);

  React.useEffect(() => {
    if (playersTouchedRef.current) return;
    setSelectedIds(buildLastOrDefaultSelectedIds(preferredHumanProfiles, activeProfileId));
  }, [preferredHumanProfiles, activeProfileId]);

  const prefProfile = React.useMemo(() => {
    const forcedActiveId =
      activeProfileId ??
      preferredHumanProfiles[0]?.id ??
      humanProfiles[0]?.id ??
      null;

    if (!forcedActiveId) return null;
    return humanProfiles.find((x) => x.id === forcedActiveId) ?? null;
  }, [humanProfiles, activeProfileId, preferredHumanProfiles]);

  const prefProfilePrefs = React.useMemo(
    () => extractProfilePrefs(prefProfile),
    [prefProfile]
  );

  // ⚙️ Pré-remplit les réglages depuis le profil actif / humain sélectionné
  React.useEffect(() => {
    if (!prefProfile) return;

    if (!startTouchedRef.current) {
      setStartScore(prefProfilePrefs.favX01);
    }

    if (!outTouchedRef.current) {
      setOutMode(prefProfilePrefs.favDoubleOut ? "double" : "simple");
    }

    if (!voiceTouchedRef.current) {
      setVoiceId(prefProfilePrefs.ttsVoice);
    }

    setProfileSfxVolume(Math.max(0, Math.min(1, prefProfilePrefs.sfxVolume / 100)));
  }, [prefProfile, prefProfilePrefs]);

  // playerId -> teamId
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>({});
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>("manual");
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>([]);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState<boolean>(true);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>([]);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>({});

  // profileId -> dartSetId (ou null)
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>({});
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(true);

  const handleChangePlayerDartSet = (profileId: string, dartSetId: string | null) => {
    setPlayerDartSets((prev) => ({ ...prev, [profileId]: dartSetId }));
  };

  // ---- helpers sélection joueurs (humains + bots) ----
  function togglePlayer(id: string) {
    playersTouchedRef.current = true;
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];

      // nettoie l'affectation d'équipe si on retire un joueur
      setTeamAssignments((prevTeams) => {
        if (!exists) return prevTeams;
        const clone = { ...prevTeams };
        delete clone[id];
        return clone;
      });

      return next;
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((prev) => {
      const current = prev[playerId] ?? null;
      const next = { ...prev };
      next[playerId] = current === teamId ? null : teamId;
      return next;
    });
  }

  const storedDartsTeams: TeamEntity[] = React.useMemo(() => {
    try {
      return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0);
    } catch {
      return [];
    }
  }, [allProfiles]);

  const botDartsTeams: any[] = React.useMemo(() => {
    const botByName = new Map<string, any>();
    for (const b of botProfiles || []) {
      const nameKey = String((b as any)?.name || "").trim().toLowerCase();
      if (nameKey && !botByName.has(nameKey)) botByName.set(nameKey, b);
    }

    return (BOT_PRO_TEAMS || [])
      .map((team: any) => {
        const members = (Array.isArray(team?.members) ? team.members : [])
          .map((member: any) => {
            const byName = botByName.get(String(member?.name || "").trim().toLowerCase());
            const id = String(byName?.id || member?.id || "");
            if (!id) return null;
            return {
              ...member,
              id,
              name: byName?.name || member?.name || "BOT IA",
              avatarDataUrl: byName?.avatarDataUrl || byName?.avatarUrl || byName?.avatar || null,
              botLevel: byName?.botLevel || `${member?.botLevel || team?.botLevel || 1}/5`,
              targetAvg3: Number(member?.targetAvg3 || team?.avg3D || 0) || 0,
            };
          })
          .filter(Boolean);

        return {
          id: `botteam_darts_${String(team?.key || team?.name || Date.now())}`,
          key: String(team?.key || "bot"),
          name: String(team?.name || "Équipe BOT IA"),
          sport: "darts",
          isBotTeam: true,
          botTeamLevel: Number(team?.botLevel || 1),
          botLevel: `${team?.botLevel || 1}/5`,
          avg3D: Number(team?.avg3D || 0) || 0,
          logoDataUrl: BOT_TEAM_LOGO_BY_KEY[String(team?.key || "")] || null,
          logoUrl: BOT_TEAM_LOGO_BY_KEY[String(team?.key || "")] || null,
          playerIds: members.map((m: any) => String(m.id)),
          members,
        };
      })
      .filter((team: any) => Array.isArray(team.playerIds) && team.playerIds.length > 0);
  }, [botProfiles]);

  const selectableDartsTeams: any[] = React.useMemo(() => {
    return [...storedDartsTeams, ...botDartsTeams];
  }, [storedDartsTeams, botDartsTeams]);

  const selectedStoredTeams = React.useMemo(() => {
    const selected = new Set(selectedStoredTeamIds.map(String));
    return storedDartsTeams.filter((team: any) => selected.has(String(team.id)));
  }, [storedDartsTeams, selectedStoredTeamIds]);

  const selectedBotTeams = React.useMemo(() => {
    if (!botTeamsPanelEnabled) return [];
    const selected = new Set(selectedBotTeamIds.map(String));
    return botDartsTeams.filter((team: any) => selected.has(String(team.id)));
  }, [botDartsTeams, selectedBotTeamIds, botTeamsPanelEnabled]);

  const selectedSavedTeams = React.useMemo(() => {
    return [...selectedStoredTeams, ...selectedBotTeams];
  }, [selectedStoredTeams, selectedBotTeams]);

  const savedTeamPlayerIds = React.useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    const validProfiles = new Set((teamProfiles || []).map((p: any) => String(p.id)));
    for (const team of selectedSavedTeams as any[]) {
      const tid = String(team?.id || "");
      const allIds = (Array.isArray(team?.playerIds) ? team.playerIds : []).map((x: any) => String(x || "")).filter(Boolean);
      const chosen = Array.isArray(savedTeamMemberSelections[tid]) ? savedTeamMemberSelections[tid] : allIds;
      for (const pid of chosen) {
        const id = String(pid || "");
        if (!id || seen.has(id) || !validProfiles.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }, [selectedSavedTeams, teamProfiles, savedTeamMemberSelections]);

  const botTeamPlayerIds = React.useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    const validProfiles = new Set((teamProfiles || []).map((p: any) => String(p.id)));
    for (const team of selectedBotTeams as any[]) {
      const tid = String(team?.id || "");
      const allIds = (Array.isArray(team?.playerIds) ? team.playerIds : []).map((x: any) => String(x || "")).filter(Boolean);
      const chosen = Array.isArray(savedTeamMemberSelections[tid]) ? savedTeamMemberSelections[tid] : allIds;
      for (const pid of chosen) {
        const id = String(pid || "");
        if (!id || seen.has(id) || !validProfiles.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }, [selectedBotTeams, teamProfiles, savedTeamMemberSelections]);

  const totalPlayers = selectedIds.length;
  const selectedSavedTeamsCount = selectedSavedTeams.length;
  const selectedBotTeamsCount = selectedBotTeams.length;
  const manualAssignedTeamsCount = React.useMemo(() => {
    const used = new Set<string>();
    for (const pid of selectedIds || []) {
      const tid = teamAssignments[pid];
      if (tid) used.add(String(tid));
    }
    return used.size;
  }, [selectedIds, teamAssignments]);

  // ---- conditions pour pouvoir démarrer ----
  const canStart = React.useMemo(() => {
    if (participantMode === "teams") {
      if (teamsSourceMode === "saved") return selectedSavedTeamsCount >= 2 && savedTeamPlayerIds.length >= 2;
      if (selectedBotTeamsCount > 0) return manualAssignedTeamsCount + selectedBotTeamsCount >= 2;
      return totalPlayers >= 4;
    }
    if (totalPlayers === 0) return false;
    if (matchMode === "solo") return totalPlayers === 2;
    if (matchMode === "multi") return totalPlayers >= 2;
    return totalPlayers >= 4; // équipes manuelles legacy
  }, [participantMode, totalPlayers, matchMode, teamsSourceMode, selectedSavedTeamsCount, savedTeamPlayerIds.length, selectedBotTeamsCount, manualAssignedTeamsCount]);

  // ---- désactivation visuelle des modes impossibles ----
  const soloDisabled = totalPlayers !== 2;
  const multiDisabled = totalPlayers < 2;
  const teamsDisabled = false;

  React.useEffect(() => {
    if (participantMode === "teams") setMatchMode("teams");
    else if (matchMode === "teams") setMatchMode(totalPlayers >= 3 ? "multi" : "solo");
  }, [participantMode]);

  React.useEffect(() => {
    if (participantMode === "teams") setMatchMode("teams");
  }, [participantMode, teamsSourceMode]);

  function toggleSavedTeamMember(teamId: string, playerId: string) {
    setSavedTeamMemberSelections((prev) => {
      const tid = String(teamId || "");
      const team = selectableDartsTeams.find((t: any) => String(t.id) === tid);
      const allIds = (Array.isArray((team as any)?.playerIds) ? (team as any).playerIds : []).map((x: any) => String(x || "")).filter(Boolean);
      const current = Array.isArray(prev[tid]) ? prev[tid] : allIds;
      const pid = String(playerId || "");
      const next = current.includes(pid) ? current.filter((id) => id !== pid) : [...current, pid];
      return { ...prev, [tid]: next };
    });
  }

  function ensureSavedTeamMembersInitialized(tid: string, teamList: any[]) {
    setSavedTeamMemberSelections((prev) => {
      if (prev[tid]) return prev;
      const team = teamList.find((t: any) => String(t.id) === tid);
      const allIds = (Array.isArray((team as any)?.playerIds) ? (team as any).playerIds : []).map((x: any) => String(x || "")).filter(Boolean);
      return { ...prev, [tid]: allIds };
    });
  }

  function toggleStoredTeam(teamId: string) {
    const tid = String(teamId || "");
    setSelectedStoredTeamIds((prev) => {
      const exists = prev.includes(tid);
      return exists ? prev.filter((id) => id !== tid) : [...prev, tid];
    });
    ensureSavedTeamMembersInitialized(tid, storedDartsTeams as any[]);
  }

  function toggleBotTeam(teamId: string) {
    const tid = String(teamId || "");
    setSelectedBotTeamIds((prev) => {
      const exists = prev.includes(tid);
      return exists ? prev.filter((id) => id !== tid) : [...prev, tid];
    });
    ensureSavedTeamMembersInitialized(tid, botDartsTeams as any[]);
  }

  function buildExternalTeamConfigs(teamList: any[]) {
    return (teamList || [])
      .map((team: any, index: number) => {
        const tid = String(team.id || `saved-${index}`);
        const allIds = (Array.isArray(team?.playerIds) ? team.playerIds : []).map((id: any) => String(id || "")).filter(Boolean);
        const selectedMembers = Array.isArray(savedTeamMemberSelections[tid]) ? savedTeamMemberSelections[tid] : allIds;
        const ids = selectedMembers
          .map((id: any) => String(id || ""))
          .filter((id: string) => !!id && teamProfiles.some((p: any) => String(p.id) === id));
        return {
          id: tid,
          name: String(team.name || `Équipe ${index + 1}`),
          color: ["#f7c85c", "#ff4fa2", "#4fc3ff", "#6dff7c"][index % 4],
          logoDataUrl: team.logoDataUrl ?? team.logoUrl ?? null,
          avatarUrl: team.logoDataUrl ?? team.logoUrl ?? team.avatarUrl ?? null,
          isBotTeam: !!team.isBotTeam,
          botLevel: team.botLevel ?? team.botTeamLevel ?? undefined,
          botTeamLevel: team.botTeamLevel ?? undefined,
          players: ids,
        };
      })
      .filter((team: any) => Array.isArray(team.players) && team.players.length > 0);
  }

  function validateSavedTeams() {
    if (selectedSavedTeams.length < 2) {
      alert("Sélectionne au moins 2 équipes enregistrées ou équipes BOTS IA.");
      return null;
    }

    const teams = buildExternalTeamConfigs(selectedSavedTeams);

    if (teams.length < 2) {
      alert("Les équipes sélectionnées doivent contenir au moins 1 joueur chacune.");
      return null;
    }

    return teams;
  }

  // ---- validation mode équipes ----
  function validateTeams() {
    const teamBuckets: Record<TeamId, string[]> = { gold: [], pink: [], blue: [], green: [] };

    selectedIds.forEach((pid) => {
      const tId = teamAssignments[pid];
      if (tId) teamBuckets[tId].push(pid);
    });

    const usedTeams = (Object.keys(teamBuckets) as TeamId[]).filter((tid) => teamBuckets[tid].length > 0);
    const manualTeams = usedTeams.map((tid) => ({
      id: tid,
      name: TEAM_LABELS[tid],
      color: TEAM_COLORS[tid],
      players: teamBuckets[tid],
    }));
    const botTeams = buildExternalTeamConfigs(selectedBotTeams);

    // Si des équipes BOTS IA sont ajoutées, elles deviennent des équipes adverses
    // à part entière. On autorise donc 1 équipe manuelle + 1 équipe BOT IA,
    // ou 2 équipes BOT IA, sans forcer la règle stricte 2v2/3v3 manuelle.
    if (botTeams.length > 0) {
      if (manualTeams.length + botTeams.length < 2) {
        alert("Compose au moins 1 équipe manuelle ou sélectionne 2 équipes BOTS IA.");
        return null;
      }
      return [...manualTeams, ...botTeams];
    }

    if (usedTeams.length < 2) {
      alert(t("x01v3.teams.needTwoTeams", "Sélectionne au moins 2 équipes (Gold / Pink / Blue / Green)."));
      return null;
    }

    const sizes = Array.from(new Set(usedTeams.map((tid) => teamBuckets[tid].length))).filter((n) => n > 0);

    if (sizes.length !== 1) {
      alert(t("x01v3.teams.sameSize", "Toutes les équipes doivent avoir le même nombre de joueurs."));
      return null;
    }

    const size = sizes[0];
    const teamCount = usedTeams.length;

    const ok =
      (teamCount === 2 && (size === 2 || size === 3 || size === 4)) ||
      (teamCount === 3 && size === 2) ||
      (teamCount === 4 && size === 2);

    if (!ok) {
      alert(
        t(
          "x01v3.teams.invalidCombo",
          "Combinaisons autorisées : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
        )
      );
      return null;
    }

    return manualTeams;
  }

  // ---- validation & lancement ----
  function handleStart() {
    if (!canStart) {
      if (matchMode === "teams" && teamsSourceMode === "saved") {
        alert("Sélectionne au moins 2 équipes enregistrées avec des joueurs.");
        return;
      }
      if (matchMode === "teams" && teamsSourceMode === "manual" && selectedBotTeamsCount > 0) {
        alert("Assigne au moins une équipe manuelle ou sélectionne 2 équipes BOTS IA.");
        return;
      }
      if (matchMode === "teams" && teamsSourceMode === "manual" && totalPlayers < 4) {
        alert("Sélectionne au moins 4 joueurs pour composer des équipes manuelles.");
        return;
      }
      if (totalPlayers === 0) {
        alert(t("x01v3.config.needPlayer", "Sélectionne au moins un joueur local ou un BOT IA."));
        return;
      }
      if (matchMode === "solo" && totalPlayers !== 2) {
        alert(t("x01v3.config.needTwoPlayersSolo", "En mode Solo (1v1), sélectionne exactement 2 joueurs."));
        return;
      }
      if (totalPlayers < 2) {
        alert(t("x01v3.config.needTwoPlayers", "Sélectionne au moins 2 joueurs pour ce mode."));
        return;
      }
    }

    // 🔓 Audio: preload + unlock (clic utilisateur) -> permet l'intro & les SFX dès l'entrée en match
    try {
      x01SfxV3Preload();
      x01EnsureAudioUnlocked();
    } catch (e) {
      // ignore
    }

    let teams: null | Array<any> = null;

    if (participantMode === "teams" || matchMode === "teams") {
      teams = teamsSourceMode === "saved" ? validateSavedTeams() : validateTeams();
      if (!teams) return;
    }

    const effectivePlayerIds =
      participantMode === "teams" && teamsSourceMode === "saved"
        ? savedTeamPlayerIds
        : participantMode === "teams" && teamsSourceMode === "manual" && selectedBotTeams.length > 0
        ? Array.from(new Set([...(selectedIds || []), ...(botTeamPlayerIds || [])].map(String)))
        : selectedIds;

    const players = effectivePlayerIds
      .map((id) => {
        const human = allProfiles.find((p) => p.id === id);
        if (human) {
          const dartSetId = playerDartSets[human.id] ?? null;
          return {
            id: human.id,
            profileId: human.id,
            name: human.name,
            avatarDataUrl: (human as any).avatarDataUrl ?? null,
            isBot: !!(human as any).isBot,
            botLevel: (human as any).botLevel ?? undefined,
            dartSetId,
          };
        }

        const bot = botProfiles.find((b) => b.id === id);
        if (bot) {
          return {
            id: bot.id,
            profileId: null,
            name: bot.name,
            avatarDataUrl: bot.avatarDataUrl ?? null,
            isBot: true,
            botLevel: bot.botLevel ?? undefined,
            dartSetId: null,
          };
        }

        return null;
      })
      .filter(Boolean) as any[];

    const baseCfg: any = {
      id: `x01v3-${Date.now()}`,
      startScore,
      inMode,
      outMode,
      legsPerSet,
      setsToWin,
      serveMode,
      // ✅ L'engine V3 se base sur `gameMode` ("solo" | "multi" | "teams")
      // `matchMode` reste un champ UI/backward-compat ("solo" | "multi" | "teams")
      gameMode: participantMode === "teams" || matchMode === "teams" ? "teams" : matchMode === "multi" ? "multi" : "solo",
      matchMode: participantMode === "teams" ? "teams" : matchMode,
      teamsSourceMode: participantMode === "teams" || matchMode === "teams" ? teamsSourceMode : undefined,
      // MULTI / FFA : choix utilisateur après le premier joueur fini
      multiFinishMode: matchMode === "multi" ? multiFinishMode : "stop_on_first",
      players,
      createdAt: Date.now(),

      // ✅ source de scoring (keypad vs externe)
      scoringSource: externalScoringEnabled ? "external" : "manual",

      // ✅ saisie vocale scores (3 fléchettes + confirmation oui/non)
      // (ignorée automatiquement si scoringSource=external)
      voiceScoreInputEnabled: voiceScoreEnabled,

      // ✅ NEW: méthode de saisie préférée (persistée aussi en localStorage)
      scoreInputDefaultMethod: scoreInputMethod,

      // ✅ audio config consommée par X01PlayV3
      audio: { arcadeEnabled, hitEnabled, voiceEnabled, voiceId, sfxVolume: profileSfxVolume },
    };

    if ((participantMode === "teams" || matchMode === "teams") && teams) baseCfg.teams = teams;

    try {
      try {
        localStorage.setItem(SCORE_INPUT_LS_KEY, sanitizeScoreInputMethod(scoreInputMethod));
      } catch {}
      x01PersistLastSelectedPlayerIds(effectivePlayerIds);
      x01BumpPlayerUsage(effectivePlayerIds);
      try {
        if (typeof window !== "undefined") window.dispatchEvent(new Event("dc-x01-player-usage-updated"));
      } catch {}
      onStart(baseCfg as X01ConfigV3);
    } catch (e) {
      console.warn("[X01ConfigV3] onStart a échoué :", e);
    }
  }

  // ---- Render ----
  return (
    <div
      className="screen x01-config-v3-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 10, marginLeft: -12, marginRight: -12 }}>
        {(() => {
          const DOT_SIZE = 36;
          const DOT_GLOW = `${primary}88`;
          return (
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "max(6px, env(safe-area-inset-top))",
              }}
            >
              <img
                src={tickerX01}
                alt="X01"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                draggable={false}
              />

              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <BackDot
                  onClick={() =>
                    typeof onBack === "function"
                      ? onBack()
                      : typeof go === "function"
                      ? go("games")
                      : null
                  }
                  title={t("common.back", "Retour")}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>

              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                <InfoDot
                  onClick={() => setRulesOpen(true)}
                  title={t("common.rules", "Règles")}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>
            </div>
          );
        })()}
      </header>

      {/* CONTENU SCROLLABLE */}
      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* --------- BLOC PARTICIPANTS : JOUEURS / ÉQUIPES --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "20px 12px 16px",
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            Participants
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <PillButton
              label="Joueurs"
              active={participantMode === "players"}
              onClick={() => setParticipantMode("players")}
              primary={primary}
              primarySoft={primarySoft}
            />
            <PillButton
              label="Équipes"
              active={participantMode === "teams"}
              onClick={() => {
                setParticipantMode("teams");
                setMatchMode("teams");
              }}
              primary={primary}
              primarySoft={primarySoft}
            />
          </div>

          {participantMode === "players" ? (
            humanProfiles.length === 0 ? (
              <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
                {t(
                  "x01v3.noProfiles",
                  "Aucun profil local. Tu peux créer des joueurs et des BOTS dans le menu Profils."
                )}
              </p>
            ) : (
              <>
                <PlayerPagedSelector
                  profiles={preferredHumanProfiles}
                  selectedIds={selectedIds}
                  onToggle={togglePlayer}
                  accent={primary}
                  pageSize={9}
                  modalTitle="Choisir des joueurs"
                  renderAvatarOverlay={(p: any) => (
                    <PlayerDartBadge
                      profileId={p.id}
                      dartSetId={playerDartSets[p.id] ?? null}
                      onChange={(id) => handleChangePlayerDartSet(p.id, id)}
                      compact
                      allProfiles={humanProfiles}
                    />
                  )}
                />

                <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                  {t("x01v3.playersHint", "2 joueurs pour un duel, 3+ pour Multi.")}
                </p>
              </>
            )
          ) : (
            <TeamsSection
              profiles={teamProfiles}
              selectableProfiles={preferredHumanProfiles}
              selectedIds={selectedIds}
              teamAssignments={teamAssignments}
              setPlayerTeam={setPlayerTeam}
              togglePlayer={togglePlayer}
              playerDartSets={playerDartSets}
              handleChangePlayerDartSet={handleChangePlayerDartSet}
              allProfiles={humanProfiles}
              sourceMode={teamsSourceMode}
              setSourceMode={setTeamsSourceMode}
              storedTeams={storedDartsTeams}
              selectedStoredTeamIds={selectedStoredTeamIds}
              toggleStoredTeam={toggleStoredTeam}
              botTeams={botDartsTeams}
              botTeamsPanelEnabled={botTeamsPanelEnabled}
              setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
              selectedBotTeamIds={selectedBotTeamIds}
              toggleBotTeam={toggleBotTeam}
              savedTeamMemberSelections={savedTeamMemberSelections}
              toggleSavedTeamMember={toggleSavedTeamMember}
              primary={primary}
              primarySoft={primarySoft}
            />
          )}
        </section>

        {participantMode === "teams" && (
          <BotTeamsSection
            botTeams={botDartsTeams}
            selectedBotTeamIds={selectedBotTeamIds}
            toggleBotTeam={toggleBotTeam}
            botTeamsPanelEnabled={botTeamsPanelEnabled}
            setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
            profiles={teamProfiles}
            savedTeamMemberSelections={savedTeamMemberSelections}
            toggleSavedTeamMember={toggleSavedTeamMember}
            primary={primary}
            primarySoft={primarySoft}
          />
        )}

        {participantMode === "players" && (
          <>
        {/* --------- BLOC BOTS IA --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, margin: 0 }}>
              {t("x01v3.bots.title", "Bots IA")}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                aria-pressed={botsPanelEnabled}
                onClick={() => setBotsPanelEnabled((v) => !v)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: `1px solid ${primary}88`,
                  background: botsPanelEnabled ? `${primary}18` : "rgba(255,255,255,0.04)",
                  color: primary,
                  fontWeight: 900,
                  fontSize: 11,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {botsPanelEnabled ? "☑ ON" : "☐ OFF"}
              </button>
              <button
                type="button"
                onClick={() => go && go("profiles_bots")}
                style={{
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: `1px solid ${primary}`,
                  background: "rgba(255,255,255,0.04)",
                  color: primary,
                  fontWeight: 900,
                  fontSize: 11,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t("x01v3.bots.manage", "Gérer les BOTS")}
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
            {t("x01v3.bots.subtitle", 'Ajoute des BOTS IA : bots "pro" prédéfinis ou BOTS que tu as créés dans le menu Profils.')}
          </p>

          {botsPanelEnabled ? (
            <BotPagedSelector
              bots={botProfiles}
              selectedIds={selectedIds}
              onToggle={togglePlayer}
              accent={primary}
              label="BOTS IA"
              showCheckbox={false}
            />
          ) : null}
        </section>

          </>
        )}

        {/* --------- BLOC PARAMÈTRES DE BASE + AUDIO + EXTERNAL --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("x01v3.baseParams", "Paramètres de base")}
          </h3>

          {/* Score de départ */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.startScore", "Score de départ")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {START_SCORES.map((s) => (
                <PillButton
                  key={s}
                  label={String(s)}
                  active={startScore === s}
                  onClick={() => { startTouchedRef.current = true; setStartScore(s); }}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              ))}
            </div>
          </div>

          {/* Mode d'entrée */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.inMode", "Mode d'entrée")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.in.simple", "Simple IN")}
                active={inMode === "simple"}
                onClick={() => setInMode("simple")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.double", "Double IN")}
                active={inMode === "double"}
                onClick={() => setInMode("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.master", "Master IN")}
                active={inMode === "master"}
                onClick={() => setInMode("master")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* Mode de sortie */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.outMode", "Mode de sortie")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.out.simple", "Simple OUT")}
                active={outMode === "simple"}
                onClick={() => { outTouchedRef.current = true; setOutMode("simple"); }}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.double", "Double OUT")}
                active={outMode === "double"}
                onClick={() => { outTouchedRef.current = true; setOutMode("double"); }}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.master", "Master OUT")}
                active={outMode === "master"}
                onClick={() => { outTouchedRef.current = true; setOutMode("master"); }}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          
          {/* ✅ FORMAT DU MATCH (intégré dans Paramètres de base) */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.format", "Format du match")}
            </div>
		<div style={{ marginBottom: 10 }}>
	            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.legsPerSet", "Manches par set")}</div>
	            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
	              {LEGS_OPTIONS.map((n) => (
	                <PillButton
	                  key={n}
	                  label={String(n)}
	                  active={legsPerSet === n}
	                  onClick={() => setLegsPerSet(n)}
	                  primary={primary}
	                  primarySoft={primarySoft}
	                  compact
	                />
	              ))}
	            </div>
	          </div>

	          <div>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.setsToWin", "Sets à gagner")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SETS_OPTIONS.map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={setsToWin === n}
                  onClick={() => setSetsToWin(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
	          </div>
	          </div>
          </div>

          {/* ✅ SERVICE / ORDRE DE DÉPART (intégré dans Paramètres de base) */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.service", "Service / ordre de départ")}
            </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.service", "Service / ordre de départ")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <PillButton
                label={t("x01v3.service.random", "Aléatoire")}
                active={serveMode === "random"}
                onClick={() => setServeMode("random")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.service.alternate", "Alterné (officiel)")}
                active={serveMode === "alternate"}
                onClick={() => setServeMode("alternate")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.matchMode", "Mode de match")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.mode.solo", "Solo (1v1)")}
                active={matchMode === "solo"}
                onClick={() => {
                  if (soloDisabled) return;
                  setMatchMode("solo");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={soloDisabled}
              />
              <PillButton
                label={t("x01v3.mode.multi", "Multi (FFA)")}
                active={matchMode === "multi"}
                onClick={() => {
                  if (multiDisabled) return;
                  setMatchMode("multi");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={multiDisabled}
              />
              <PillButton
                label={t("x01v3.mode.teams", "Équipes")}
                active={matchMode === "teams"}
                onClick={() => {
                  if (teamsDisabled) return;
                  setParticipantMode("teams");
                  setMatchMode("teams");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={teamsDisabled}
              />
            </div>
          </div>

          {matchMode === "multi" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.multiFinishMode", "Après le 1er joueur terminé")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("x01v3.multiFinish.stop", "Terminer la partie")}
                  active={multiFinishMode === "stop_on_first"}
                  onClick={() => setMultiFinishMode("stop_on_first")}
                  primary={primary}
                  primarySoft={primarySoft}
                />
                <PillButton
                  label={t("x01v3.multiFinish.continue", "Continuer le classement")}
                  active={multiFinishMode === "continue_ranking"}
                  onClick={() => setMultiFinishMode("continue_ranking")}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(230,234,255,0.68)", lineHeight: 1.35 }}>
                {multiFinishMode === "continue_ranking"
                  ? t("x01v3.multiFinish.continueHelp", "Les joueurs déjà sortis sont sautés, les autres continuent jusqu'au classement final.")
                  : t("x01v3.multiFinish.stopHelp", "La partie se termine dès que le premier joueur atteint 0.")}
              </div>
            </div>
          )}
          </div>

{/* ✅ AUDIO / VOIX */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.audio.title", "Audio")}
            </div>

            {/* Sons Arcade */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.arcade", "Sons Arcade")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={arcadeEnabled === true}
                  onClick={() => setArcadeEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={arcadeEnabled === false}
                  onClick={() => setArcadeEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.arcadeHint", "DBULL / BULL / DOUBLE / TRIPLE / 180 / BUST / victoire")}
              </div>
            </div>

            {/* Bruitages */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.hit", "Bruitages")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={hitEnabled === true}
                  onClick={() => setHitEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={hitEnabled === false}
                  onClick={() => setHitEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.hitHint", "Son de fléchette (dart-hit)")}
              </div>
            </div>

            {/* Voix IA */}
            <div>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.voice", "Voix IA")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={voiceEnabled === true}
                  onClick={() => setVoiceEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={voiceEnabled === false}
                  onClick={() => setVoiceEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                  {t("x01v3.audio.voiceSelect", "Voix")}
                </div>
                <select
                  value={voiceId}
                  onChange={(e) => {
                    voiceTouchedRef.current = true;
                    setVoiceId(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(9,11,20,0.9)",
                    color: "#f2f2ff",
                    padding: "0 10px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  {VOICE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                  {t("x01v3.audio.voiceHint", "Utilisée pour l'annonce des scores / fin de match.")}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ METHODE DE SAISIE (UI) */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.inputMethod.title", "Méthode de saisie")}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.inputMethod.desc",
                "Choisis l’interface par défaut : keypad, cible, presets ou voix."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.inputMethod.keypad", "KEYPAD")}
                active={scoreInputMethod === "keypad"}
                onClick={() => selectScoreInputMethod("keypad")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.dartboard", "CIBLE")}
                active={scoreInputMethod === "dartboard"}
                onClick={() => selectScoreInputMethod("dartboard")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.presets", "PRESETS")}
                active={scoreInputMethod === "presets"}
                onClick={() => selectScoreInputMethod("presets")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.voice", "VOICE")}
                active={scoreInputMethod === "voice"}
                onClick={() => selectScoreInputMethod("voice")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {scoreInputMethod === "dartboard"
                ? t("x01v3.inputMethod.hintDartboard", "CIBLE : touche la cible pour saisir directement S/D/T.")
                : scoreInputMethod === "presets"
                ? t("x01v3.inputMethod.hintPresets", "PRESETS : raccourcis 1 tap avec détail des fléchettes pour préserver les stats.")
                : scoreInputMethod === "voice"
                ? t("x01v3.inputMethod.hintVoice", "VOICE : commande vocale activée, récapitulatif puis confirmation oui/non.")
                : t("x01v3.inputMethod.hintKeypad", "KEYPAD : saisie manuelle classique.")}
            </div>
          </div>


          {/* ✅ COMMANDE VOCALE (SAISIE SCORES) */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.voiceScore.title", "Commande vocale (saisie scores)")}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.voiceScore.desc",
                "Le joueur dicte ses 3 fléchettes. La voix récapitule et demande confirmation (oui/non)."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.off", "OFF")}
                active={voiceScoreEnabled === false}
                onClick={() => {
                  setVoiceScoreEnabled(false);
                  if (scoreInputMethod === "voice") selectScoreInputMethod("keypad");
                }}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.on", "ON")}
                active={voiceScoreEnabled === true}
                onClick={() => {
                  setVoiceScoreEnabled(true);
                  setExternalScoringEnabled(false);
                  selectScoreInputMethod("voice");
                }}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {voiceScoreEnabled
                ? t(
                    "x01v3.voiceScore.onHint",
                    "ON : saisie vocale active au début du tour (si supportée). Confirmation obligatoire."
                  )
                : t("x01v3.voiceScore.offHint", "OFF : saisie au keypad.")}
            </div>

            {voiceScoreEnabled && externalScoringEnabled && (
              <div style={{ fontSize: 11, color: "#ffcc66", marginTop: 8 }}>
                {t(
                  "x01v3.voiceScore.warnExternal",
                  "Note : le comptage externe est activé ; la commande vocale sera ignorée en play."
                )}
              </div>
            )}
          </div>

          {/* ✅ COMPTAGE EXTERNE + bouton info */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.external.title", "Comptage externe (vidéo)")}
              </div>

              <button
                type="button"
                onClick={() => {
                  setExternalInfoStep(1);
                  setExternalInfoOpen(true);
                }}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(0,0,0,0.55)",
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
                aria-label="Info comptage externe"
                title="Info"
              >
                i
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.external.desc",
                "Active si tu veux que le match soit piloté par une source externe vidéo / caméra / bridge, façon Dartsmind."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.off", "OFF")}
                active={externalScoringEnabled === false}
                onClick={() => setExternalScoringEnabled(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.on", "ON")}
                active={externalScoringEnabled === true}
                onClick={() => {
                  setExternalScoringEnabled(true);
                  setVoiceScoreEnabled(false);
                  if (scoreInputMethod === "voice") selectScoreInputMethod("keypad");
                }}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {externalScoringEnabled
                ? t("x01v3.external.onHint", "ON : le match écoute les volées externes vidéo/bridge et les applique au même moteur de score.")
                : t("x01v3.external.offHint", "OFF : mode normal au keypad.")}
            </div>
          </div>

          {/* ✅ MODAL FLOTTANT : tuto + pages + scroll interne + tests */}
          {externalInfoOpen && (
            <div
              onClick={() => setExternalInfoOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(560px, 100%)",
                  maxHeight: "78vh",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "linear-gradient(180deg, rgba(10,12,24,0.96), rgba(6,7,14,0.98))",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
                  padding: 14,
                  color: "#f2f2ff",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flex: "0 0 auto" }}>
                  <div style={{ fontWeight: 900, color: primary, fontSize: 14 }}>
                    {t("x01v3.external.howTitle", "Connexion comptage externe")}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExternalInfoOpen(false)}
                    style={{
                      borderRadius: 10,
                      padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t("common.close", "Fermer")}
                  </button>
                </div>

                {/* Step tabs */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, flex: "0 0 auto" }}>
                  <button type="button" onClick={() => setExternalInfoStep(1)} style={pillStep(externalInfoStep === 1, primary)}>
                    1) Activer
                  </button>
                  <button type="button" onClick={() => setExternalInfoStep(2)} style={pillStep(externalInfoStep === 2, primary)}>
                    2) Bridge (clé)
                  </button>
                  <button type="button" onClick={() => setExternalInfoStep(3)} style={pillStep(externalInfoStep === 3, primary)}>
                    3) Tester
                  </button>
                </div>

                {/* Scrollable body */}
                <div
                  style={{
                    flex: "1 1 auto",
                    overflowY: "auto",
                    paddingRight: 6,
                    fontSize: 12,
                    color: "#d7d9f0",
                    lineHeight: 1.42,
                  }}
                  className="dc-scroll-thin"
                >
                  {/* STEP 1 */}
                  {externalInfoStep === 1 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Résumé (rapide)</div>
                      <div style={{ marginBottom: 10 }}>
                        <b>But :</b> recevoir automatiquement les tirs depuis un appareil externe (caméra / système Scolia-like / capteur).
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Étapes</div>
                        <div style={{ color: "#e7e9ff" }}>
                          <div>1) Dans X01 Config → <b>Comptage externe = ON</b></div>
                          <div>2) Tu lances la partie</div>
                          <div>3) Un <b>bridge</b> envoie les tirs vers l’app</div>
                          <div>4) Le score bouge tout seul (pas besoin du keypad)</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        👉 L’étape 2 est la plus importante : elle explique <b>où tourne le bridge</b> et <b>comment il envoie les tirs</b>.
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {externalInfoStep === 2 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Étape 2 — Le bridge (le connecteur)</div>

                      <div style={{ marginBottom: 10 }}>
                        <b>Le bridge</b> est un petit programme externe qui fait le lien entre :
                        <br />• ton <b>appareil de comptage</b> (caméra / board / système tiers)
                        <br />• et <b>Darts Counter</b> (ton navigateur / ton téléphone)
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Où est-ce que ça tourne ?</div>
                        <div style={{ color: "#e7e9ff" }}>
                          • Sur un <b>PC / Mac / Raspberry Pi</b><br />
                          • Idéalement <b>sur le même réseau (Wi-Fi)</b> que l’appareil qui affiche Darts Counter<br />
                          • Le bridge reste <b>allumé pendant toute la partie</b>
                        </div>
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Ce que fait le bridge (simple)</div>
                        <div style={{ color: "#e7e9ff" }}>
                          1) Il <b>récupère</b> les tirs (ex : “T20”, “D16”, “Bull”, “Miss”)<br />
                          2) Il <b>convertit</b> en format simple : <code>segment + multiplier</code><br />
                          3) Il <b>envoie</b> à Darts Counter pendant la partie
                        </div>
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Option A & B (les 2 en même temps)</div>
                        <div style={{ color: "#e7e9ff" }}>
                          <b>A) Même appareil (le plus simple)</b><br />
                          Tu ouvres Darts Counter sur le <b>PC</b> et le bridge tourne sur le <b>même PC</b>. Le bridge envoie directement au navigateur.
                          <div style={{ height: 8 }} />
                          <b>B) Appareil séparé (mobile/tablette)</b><br />
                          Tu joues sur téléphone/tablette, et le bridge tourne sur un PC/Raspberry. Le bridge doit <b>envoyer sur le réseau</b> vers l’appareil (URL locale / WebSocket local / relay page).
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        <b>Important :</b> si ton appareil ne fournit aucun flux exploitable (API/SDK/WebSocket/MQTT/HTTP),
                        alors aucun bridge ne peut “deviner” les tirs.
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {externalInfoStep === 3 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Tests & format attendu</div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Events supportés</div>

                        <div style={{ fontSize: 12, color: "#e7e9ff" }}>
                          • <b>dc:x01v3:dart</b> → <code>{`{ segment, multiplier }`}</code>
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                            segment: 0..20 ou 25 (bull). multiplier: 1/2/3 (2 = DBull si segment=25)
                          </div>

                          <div style={{ height: 8 }} />

                          • <b>dc:x01v3:visit</b> → <code>{`{ darts: [{segment,multiplier}, ...] }`}</code> (max 3)
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                            Envoie une volée complète d’un coup (1 à 3 fléchettes).
                          </div>
                        </div>

                        <pre
                          style={{
                            margin: "10px 0 0 0",
                            padding: 10,
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.35)",
                            overflowX: "auto",
                            fontSize: 12,
                            lineHeight: 1.35,
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e7e9ff",
                          }}
                        >{`// 1 fléchette (T20)
window.dispatchEvent(new CustomEvent("dc:x01v3:dart", {
  detail: { segment: 20, multiplier: 3 }
}));

// 1 volée (180)
window.dispatchEvent(new CustomEvent("dc:x01v3:visit", {
  detail: { darts: [
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 }
  ] }
}));`}</pre>
                      </div>

                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Tests rapides</div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button type="button" onClick={() => dispatchExternalDart(20, 3)} style={extTestBtn(primary)}>
                          TEST T20
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(25, 1)} style={extTestBtn("#4fc3ff")}>
                          TEST BULL
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(25, 2)} style={extTestBtn("#ff4fa2")}>
                          TEST DBULL
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(0, 1)} style={extTestBtn("rgba(255,255,255,0.6)")}>
                          TEST MISS
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            dispatchExternalVisit([
                              { segment: 20, multiplier: 3 },
                              { segment: 20, multiplier: 3 },
                              { segment: 20, multiplier: 3 },
                            ])
                          }
                          style={extTestBtn("#6dff7c")}
                        >
                          TEST VISIT 180
                        </button>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        Lance une partie X01 avec <b>Comptage externe = ON</b> : si le score bouge avec les tests, ton listener est OK.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer nav */}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flex: "0 0 auto" }}>
                  <button
                    type="button"
                    onClick={() => setExternalInfoStep((s) => (s === 1 ? 1 : ((s - 1) as any)))}
                    style={navBtn(false)}
                    disabled={externalInfoStep === 1}
                  >
                    ← Précédent
                  </button>

                  <button
                    type="button"
                    onClick={() => setExternalInfoStep((s) => (s === 3 ? 3 : ((s + 1) as any)))}
                    style={navBtn(true)}
                    disabled={externalInfoStep === 3}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <div style={{ height: 96 }} />
      </div>

      {/* CTA collée au-dessus de la barre de nav */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 999,
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2b52",
              boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? "pointer" : "default",
            }}
          >
            {t("x01v3.start", "Lancer la partie")}
          </button>
        </div>
      </div>

      {/* RULES OVERLAY */}
      {rulesOpen && (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "78vh",
              overflowY: "auto",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: `1px solid ${primary}33`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 1, color: primary, textTransform: "uppercase" }}>Règles — X01</div>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.35 }}>
              <div style={{ marginBottom: 10 }}>
                <b>Objectif</b> : atteindre exactement <b>0</b>. Si tu descends sous 0, c’est <b>Bust</b> et le score revient au début de la volée.
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>IN</b> :
                <ul style={{ margin: "6px 0 0 18px" }}>
                  <li><b>Simple IN</b> : tu peux démarrer sur n’importe quel score.</li>
                  <li><b>Double IN</b> : tu dois commencer par un <b>double</b>.</li>
                  <li><b>Master IN</b> : tu dois commencer par <b>double ou triple</b>.</li>
                </ul>
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>OUT</b> :
                <ul style={{ margin: "6px 0 0 18px" }}>
                  <li><b>Simple OUT</b> : tu peux finir sur n’importe quel score.</li>
                  <li><b>Double OUT</b> : tu dois finir sur un <b>double</b>.</li>
                  <li><b>Master OUT</b> : tu dois finir sur <b>double ou triple</b>.</li>
                </ul>
              </div>
              <div style={{ opacity: 0.8 }}>
                Les options <b>Sets</b>/<b>Manches</b> déterminent le format du match, et l’ordre de service peut être aléatoire ou alterné selon ton réglage.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* --------- Sous-section équipes avec grissage intelligent --------- */

type TeamsSectionProps = {
  profiles: Profile[];
  selectableProfiles?: Profile[];
  selectedIds: string[];
  teamAssignments: Record<string, TeamId | null>;
  setPlayerTeam: (playerId: string, tid: TeamId) => void;
  togglePlayer?: (id: string) => void;
  playerDartSets?: Record<string, string | null>;
  handleChangePlayerDartSet?: (profileId: string, dartSetId: string | null) => void;
  allProfiles?: Profile[];
  sourceMode: TeamsSourceMode;
  setSourceMode: (mode: TeamsSourceMode) => void;
  storedTeams: TeamEntity[];
  selectedStoredTeamIds: string[];
  toggleStoredTeam: (teamId: string) => void;
  botTeams?: any[];
  botTeamsPanelEnabled?: boolean;
  setBotTeamsPanelEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBotTeamIds?: string[];
  toggleBotTeam?: (teamId: string) => void;
  savedTeamMemberSelections?: Record<string, string[]>;
  toggleSavedTeamMember?: (teamId: string, playerId: string) => void;
  primary: string;
  primarySoft: string;
};

function BotTeamsSection({
  botTeams = [],
  selectedBotTeamIds = [],
  toggleBotTeam,
  botTeamsPanelEnabled = true,
  setBotTeamsPanelEnabled,
  profiles = [],
  savedTeamMemberSelections = {},
  toggleSavedTeamMember,
  primary,
  primarySoft,
}: any) {
  const selected = new Set((selectedBotTeamIds || []).map(String));
  const profileById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of profiles || []) m.set(String(p?.id || ""), p);
    return m;
  }, [profiles]);

  return (
    <section
      style={{
        background: "rgba(10, 12, 24, 0.96)",
        borderRadius: 18,
        padding: 12,
        marginBottom: 16,
        boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        border: `1px solid rgba(255,255,255,0.04)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, margin: 0 }}>
            Équipes BOTS IA
          </h3>
          <div style={{ marginTop: 5, color: "#8f94b2", fontSize: 11, lineHeight: 1.35 }}>
            Active ce bloc pour ajouter une équipe IA en mode manuel ou avec des équipes enregistrées.
          </div>
        </div>
        <button
          type="button"
          aria-pressed={!!botTeamsPanelEnabled}
          onClick={() => setBotTeamsPanelEnabled && setBotTeamsPanelEnabled((v: boolean) => !v)}
          style={{
            padding: "7px 11px",
            borderRadius: 999,
            border: `1px solid ${primary}88`,
            background: botTeamsPanelEnabled ? `${primary}18` : "rgba(255,255,255,0.04)",
            color: primary,
            fontWeight: 900,
            fontSize: 11,
            textTransform: "uppercase",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          {botTeamsPanelEnabled ? "☑ ON" : "☐ OFF"}
        </button>
      </div>

      {botTeamsPanelEnabled ? (
        botTeams.length === 0 ? (
          <div style={{ color: "#8f94b2", fontSize: 12, lineHeight: 1.35 }}>Aucune équipe BOT IA disponible.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 10 }}>
            {botTeams.map((team: any, index: number) => {
              const tid = String(team?.id || `bot-team-${index}`);
              const active = selected.has(tid);
              const name = String(team?.name || "Équipe BOT IA");
              const logo = team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || null;
              const level = Number(team?.botTeamLevel || parseFloat(String(team?.botLevel || "0")) || 0);
              const ids = (Array.isArray(team?.playerIds) ? team.playerIds : []).map((x: any) => String(x || "")).filter(Boolean);
              const chosen = Array.isArray(savedTeamMemberSelections?.[tid]) ? savedTeamMemberSelections[tid].map(String) : ids;
              const members = ids.map((id: string) => profileById.get(id)).filter(Boolean);

              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => toggleBotTeam && toggleBotTeam(tid)}
                  style={{
                    textAlign: "left",
                    borderRadius: 18,
                    padding: "12px 10px",
                    border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.08)",
                    background: active ? primarySoft : "rgba(8,10,20,0.90)",
                    color: "#f5f7ff",
                    cursor: "pointer",
                    boxShadow: active ? `0 0 20px ${primary}44` : "none",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ position: "relative", width: 58, height: 58, display: "grid", placeItems: "center", flex: "0 0 auto", overflow: "visible" }}>
                      {level > 0 ? <ProfileStarRing botLevel={level} anchorSize={54} starSize={8} gapPx={-4} /> : null}
                      <ProfileAvatar name={name} dataUrl={logo || undefined} size={46} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                        <span style={{ marginLeft: 6, padding: "2px 5px", borderRadius: 999, border: `1px solid ${primary}77`, color: primary, fontSize: 9, fontWeight: 950, verticalAlign: "middle" }}>IA</span>
                      </div>
                      <div style={{ color: "#9da3c0", fontSize: 11 }}>
                        {members.length || ids.length} joueur{(members.length || ids.length) > 1 ? "s" : ""}{level ? ` • Niveau ${level}/5` : ""}
                      </div>
                    </div>
                  </div>

                  {active && members.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                      {members.map((p: any) => {
                        const checked = chosen.includes(String(p.id));
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleSavedTeamMember && toggleSavedTeamMember(tid, String(p.id))}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              borderRadius: 999,
                              padding: "4px 7px",
                              border: checked ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.10)",
                              background: checked ? `${primary}18` : "rgba(255,255,255,0.04)",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            <ProfileAvatar profile={p} size={20} />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )
      ) : null}
    </section>
  );
}

function TeamsSection({
  profiles,
  selectableProfiles,
  selectedIds,
  teamAssignments,
  setPlayerTeam,
  togglePlayer,
  playerDartSets,
  handleChangePlayerDartSet,
  allProfiles,
  sourceMode,
  setSourceMode,
  storedTeams,
  selectedStoredTeamIds,
  toggleStoredTeam,
  botTeams = [],
  botTeamsPanelEnabled = true,
  setBotTeamsPanelEnabled,
  selectedBotTeamIds = [],
  toggleBotTeam,
  savedTeamMemberSelections,
  toggleSavedTeamMember,
  primary,
  primarySoft,
}: TeamsSectionProps) {
  const { t } = useLang() as any;

  const cardBg = "rgba(10, 12, 24, 0.96)";
  const totalPlayers = selectedIds.length;
  const selectedStored = new Set(selectedStoredTeamIds.map(String));
  const selectedBot = new Set((selectedBotTeamIds || []).map(String));
  const teamByPlayer = React.useMemo(() => new Map((profiles || []).map((p: any) => [String(p.id), p])), [profiles]);

  const counts: Record<TeamId, number> = { gold: 0, pink: 0, blue: 0, green: 0 };

  selectedIds.forEach((pid) => {
    const tId = teamAssignments[pid];
    if (tId) counts[tId]++;
  });

  const orderedTeams: TeamId[] = ["gold", "pink", "blue", "green"];

  const maxTeams = totalPlayers <= 4 ? 2 : totalPlayers <= 6 ? 3 : 4;
  const maxPerTeamBase = totalPlayers >= 8 ? 4 : totalPlayers >= 6 ? 3 : 2;
  const usedTeamsCount = orderedTeams.filter((tid) => counts[tid] > 0).length;
  const maxPerTeam = usedTeamsCount >= 3 ? 2 : maxPerTeamBase;

  const renderSavedTeamCard = (team: any, active: boolean, toggleTeam?: (teamId: string) => void) => {
    const ids = Array.isArray(team.playerIds) ? team.playerIds.map(String) : [];
    const members = ids.map((id: string) => teamByPlayer.get(id)).filter(Boolean);

    return (
      <button
        key={team.id}
        type="button"
        onClick={() => toggleTeam && toggleTeam(String(team.id))}
        style={{
          textAlign: "left",
          borderRadius: 16,
          padding: 10,
          border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.08)",
          background: active ? primarySoft : "rgba(8,10,20,0.9)",
          color: "#f5f7ff",
          cursor: "pointer",
          boxShadow: active ? `0 0 18px ${primary}33` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${active ? primary : "rgba(255,255,255,0.12)"}`,
              display: "grid",
              placeItems: "center",
              background: "rgba(16,22,36,0.9)",
              flex: "0 0 auto",
            }}
          >
            {team.logoDataUrl ? (
              <img src={team.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: primary, fontWeight: 950 }}>{String(team.name || "EQ").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {team.name || "Équipe"}
              {team.isBotTeam ? (
                <span style={{ marginLeft: 6, padding: "2px 5px", borderRadius: 999, border: `1px solid ${primary}77`, color: primary, fontSize: 9, fontWeight: 950, verticalAlign: "middle" }}>IA</span>
              ) : null}
            </div>
            <div style={{ color: "#9da3c0", fontSize: 11 }}>
              {members.length} joueur{members.length > 1 ? "s" : ""}
              {team.botLevel ? ` • Niveau ${team.botLevel}` : ""}
            </div>
          </div>
        </div>
        {members.length > 0 && active && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
            {members.map((p: any) => {
              const tid = String(team.id || "");
              const allIds = ids;
              const chosen = Array.isArray((savedTeamMemberSelections || {})[tid]) ? (savedTeamMemberSelections || {})[tid] : allIds;
              const checked = chosen.map(String).includes(String(p.id));
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSavedTeamMember && toggleSavedTeamMember(tid, String(p.id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 999,
                    padding: "4px 7px",
                    border: checked ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.10)",
                    background: checked ? `${primary}18` : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  <ProfileAvatar profile={p} size={20} />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </button>
    );
  };

  return (
    <section
      style={{
        background: cardBg,
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        border: `1px solid rgba(255,255,255,0.04)`,
      }}
    >
      <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: "#9fa4c0", marginBottom: 6 }}>
        {t("x01v3.teams.title", "Composition des équipes")}
      </h3>

      <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
        {sourceMode === "saved"
          ? "Choisis tes équipes enregistrées, puis coche les joueurs qui participent au match."
          : t(
              "x01v3.teams.subtitle",
              "Assigne chaque joueur à une Team : Gold, Pink, Blue ou Green. Combos possibles : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
            )}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <PillButton
          label="Manuel"
          active={sourceMode === "manual"}
          onClick={() => setSourceMode("manual")}
          primary={primary}
          primarySoft={primarySoft}
        />
        <PillButton
          label="Équipes enregistrées"
          active={sourceMode === "saved"}
          onClick={() => setSourceMode("saved")}
          primary={primary}
          primarySoft={primarySoft}
        />
      </div>

      {sourceMode === "saved" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
              Équipes enregistrées
            </div>
            {storedTeams.length === 0 ? (
              <div style={{ color: "#8f94b2", fontSize: 12, lineHeight: 1.35, marginBottom: 4 }}>
                Aucune équipe fléchettes enregistrée. Crée-les dans Profils → Teams Fléchettes.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 10 }}>
                {storedTeams.map((team: any) => renderSavedTeamCard(team, selectedStored.has(String(team.id)), toggleStoredTeam))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#c8cbe4", fontSize: 12, lineHeight: 1.35 }}>
            Choisir au minimum 4 joueurs, puis assigne-les manuellement à Gold, Pink, Blue ou Green.
          </div>
          {togglePlayer ? (
            <PlayerPagedSelector
              profiles={selectableProfiles || profiles}
              selectedIds={selectedIds}
              onToggle={togglePlayer}
              accent={primary}
              pageSize={9}
              modalTitle="Choisir les joueurs des équipes"
              renderAvatarOverlay={(p: any) => (
                handleChangePlayerDartSet ? (
                  <PlayerDartBadge
                    profileId={p.id}
                    dartSetId={(playerDartSets || {})[p.id] ?? null}
                    onChange={(id) => handleChangePlayerDartSet(p.id, id)}
                    compact
                    allProfiles={allProfiles || profiles}
                  />
                ) : null
              )}
            />
          ) : null}
          {selectedIds.length < 4 && (
            <div style={{ color: "#8f94b2", fontSize: 12, marginBottom: 4 }}>
              Sélectionne au moins 4 joueurs pour composer des équipes manuelles.
            </div>
          )}
          {selectedIds.map((pid) => {
            const p = profiles.find((pr) => pr.id === pid);
            if (!p) return null;
            const team = teamAssignments[pid] ?? null;

            return (
              <div key={pid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <ProfileAvatar profile={p} size={28} />
                  <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 120 }}>
                    {p.name}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {orderedTeams.map((tid, idx) => {
                    const allowedTeamSlot = idx < maxTeams;
                    const full = counts[tid] >= maxPerTeam && team !== tid;
                    const disabled = !allowedTeamSlot || full || selectedIds.length < 4;

                    return (
                      <TeamPillButton
                        key={tid}
                        label={TEAM_LABELS[tid].replace("Team ", "")}
                        color={TEAM_COLORS[tid]}
                        active={team === tid}
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          setPlayerTeam(pid, tid);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------ Helpers UI ------------------ */

function pillStep(active: boolean, primary: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "radial-gradient(circle at 20% 0%, rgba(245,195,91,.22), rgba(8,8,20,.96))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function navBtn(primaryStyle: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: primaryStyle ? "rgba(245,195,91,0.14)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    minWidth: 120,
  };
}

function extTestBtn(accent: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: `0 0 14px ${accent}33, 0 0 22px rgba(0,0,0,0.55)`,
    whiteSpace: "nowrap",
  };
}

/* --------- Helpers niveau BOT (1 à 5 étoiles) --------- */

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  return { level: parseX01BotLevelValue(botLevelRaw, 1) };
}

/* Médaillon BOT – doré pour les PRO IA, bleu pour les bots classiques */
function BotMedallion({
  bot,
  level,
  active,
}: {
  bot: BotLite;
  level: number; // 1..5
  active: boolean;
}) {
  const isPro = String(bot.id || "").startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.6;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;
  const WRAP = MEDALLION + STAR;

  const lvl = Math.max(1, Math.min(5, Number(level) || 1));
  const fakeAvg3d = x01BotLevelToStarAvg3d(lvl, 1);

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, flex: "0 0 auto", overflow: "visible" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing
          anchorSize={MEDALLION}
          gapPx={-2 * SCALE}
          starSize={STAR}
          stepDeg={10}
          avg3d={fakeAvg3d}
          color={COLOR}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: (WRAP - MEDALLION) / 2,
          left: (WRAP - MEDALLION) / 2,
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          padding: 6 * SCALE,
          background: active
            ? isPro
              ? "linear-gradient(135deg, #fff3c2, #f7c85c)"
              : "linear-gradient(135deg, #7df3ff, #00b4ff)"
            : isPro
            ? "linear-gradient(135deg, #2a2a1f, #1a1a12)"
            : "linear-gradient(135deg, #2c3640, #141b26)",
          boxShadow: active
            ? `0 0 24px ${COLOR_GLOW}, inset 0 0 10px rgba(0,0,0,.7)`
            : `0 0 14px rgba(0,0,0,0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: active ? "scale(1.05)" : "scale(1)",
          transition: "transform .15s ease, box-shadow .15s ease",
          border: active ? `2px solid ${COLOR}` : `2px solid ${isPro ? "rgba(247,200,92,0.5)" : "rgba(144,228,255,0.9)"}`,
        }}
      >
        <ProfileAvatar
          size={AVATAR}
          dataUrl={bot.avatarDataUrl ?? undefined}
          label={bot.name?.[0]?.toUpperCase() || "B"}
          showStars={false}
        />
      </div>
    </div>
  );
}

/* ------------------ Pills réutilisables ------------------ */

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
  disabled?: boolean;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled ? "rgba(40,42,60,0.7)" : active ? primarySoft : "rgba(9,11,20,0.9)";

  const border = isDisabled
    ? "1px solid rgba(255,255,255,0.04)"
    : active
    ? `1px solid ${primary}`
    : "1px solid rgba(255,255,255,0.07)";

  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 700 : 600,
        boxShadow: active && !isDisabled ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

type TeamPillProps = {
  label: string;
  color: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

function TeamPillButton({ label, color, active, disabled, onClick }: TeamPillProps) {
  const baseBg = active ? color : "rgba(9,11,20,0.9)";
  const baseColor = active ? "#151515" : "#e5e7f8";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: "3px 8px",
        border: disabled
          ? "1px solid rgba(255,255,255,0.06)"
          : active
          ? `1px solid ${color}`
          : "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "rgba(40,42,60,0.6)" : baseBg,
        color: disabled ? "#777b92" : baseColor,
        fontSize: 11,
        fontWeight: 800,
        boxShadow: active && !disabled ? `0 0 10px ${color}55` : "none",
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
