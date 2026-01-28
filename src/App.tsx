// @ts-nocheck
// ============================================
// src/App.tsx — Navigation + wiring propre (v5 sécurisé)
// Fix: "Lancer partie" n'affiche plus la dernière reprise
// + Intégration pages Training (menu / play / stats)
// + X01Play V3 en parallèle du X01 actuel
// + Stats : bouton menu => StatsShell (menu), puis StatsHub (détails)
// + Stats Online : StatsOnline (détails ONLINE)
// + Stats Cricket : StatsCricket (vue dédiée Cricket)
// + SyncCenter : export/import des stats locales
// + Account bridge : au premier lancement sans profil actif,
//   on redirige vers Profils > Mon profil (connexion / création compte).
//
// ✅ NEW (PROD Auth): callback email Supabase + reset password
// - Supporte liens : /#/auth/callback  et  /#/auth/reset
// - Détecte le hash au boot + hashchange
// - Évite le chaos "otp_expired/access_denied" côté app
//
// ✅ NEW: SPLASH SCREEN (logo + jingle) au boot (WEB/PWA)
// - Pop + bounce + glow + sparkle
// - Audio best-effort (autoplay peut être bloqué par navigateur)
// - Durée ~ 1350ms, puis app normale
//
// ✅ NEW: AUDIO PERSISTANT (overflow) -> la musique ne s'arrête pas au changement de page
// - On monte un <audio id="dc-splash-audio"> AU NIVEAU AppRoot (ne se démonte pas)
// - SplashScreen pilote ce player global (au lieu d'avoir son <audio> interne)
//
// ✅ NEW: CRASH CATCHER (affiche l'erreur au lieu de "Aïe aïe aïe")
// - Wrap l'app avec <CrashCatcher> pour capturer erreurs React + window.error + unhandledrejection
//
// ✅ PATCH D: AUTH UNIQUE
// - On garde AuthOnlineProvider
// - On enlève définitivement tout AuthProvider/AuthSessionProvider legacy
//
// ✅ NEW: ROUTE SPECTATOR
// - Ajout Tab "spectator"
// - Ajout import SpectatorPage
// - Ajout case "spectator" => <SpectatorPage .../>
//
// ✅ NEW: ROUTE GAME SELECT (multisports)
// - Ajout Tab "gameSelect"
// - Ajout import GameSelect
// - App démarre sur gameSelect (si profil OK)  ✅ IMPORTANT: TOUJOURS GameSelect après intro
//
// ✅ NEW: SPORT-AWARE + PÉTANQUE
// - Ajout SportProvider/useSport
// - Home global (non sport-aware)
// - Games sport-aware (Pétanque -> PetanqueHub)
// - Boot : GameSelect TOUJOURS (même si sport déjà choisi)
// - Ajout Tab "petanque_play" + route
//
// ✅ NEW (OBLIGATOIRE): TABS PÉTANQUE (menu/config/play)
// - Ajout Tab "petanque_menu" / "petanque_config" / "petanque_play"
// - Ajout imports PetanqueMenuGames / PetanqueConfig / PetanquePlay
// - Ajout cases dans switch(tab)
//
// ✅ PATCH (IMPORTANT): SPORT SWITCH RUNTIME (sans reload / sans relancer intro)
// - Settings dispatch "dc:sport-change"
// - App écoute et met à jour le sport actif runtime + SportContext (si dispo)
// - Résout: "cliquer Fléchettes dans Settings -> home Pétanque".
//
// ✅ NEW (STATS PÉTANQUE) — EXACT STATSHELL UI
// - On NE crée PAS de CardBtn
// - On copie StatsShell -> PetanqueStatsShell (visuel identique)
// - On masque ONLINE et TRAINING côté Pétanque
// - Option B (propre) : go("petanque_stats_players"), etc. (routes créées ici, pages à créer ensuite)
// ============================================

import * as React from "react";
const { useEffect, useMemo, useState, useRef, useCallback } = React;
import { migrateLocalStorageToIndexedDB } from "./lib/storageMigration";
import BottomNav from "./components/BottomNav";

import AuthStart from "./pages/AuthStart";
import AccountStart from "./pages/AccountStart";
import AuthV7Login from "./pages/AuthV7Login";
import AuthV7Signup from "./pages/AuthV7Signup";
import AuthCallback from "./pages/AuthCallback"; // si présent dans ton projet
import AuthReset from "./pages/AuthReset";

import SplashScreen from "./components/SplashScreen";

// ✅ NEW: AUDIO SPLASH global (persistant)
import SplashJingle from "./assets/audio/splash_jingle.mp3";

// ✅ NEW: CRASH CATCHER (à créer dans src/components/CrashCatcher.tsx)
import CrashCatcher from "./components/CrashCatcher";
import MobileErrorOverlay from "./components/MobileErrorOverlay";

// Persistance (IndexedDB via storage.ts)
import { loadStore, saveStore } from "./lib/storage";
// OPFS / StorageManager — demande la persistance une fois au boot
import { ensurePersisted } from "./lib/deviceStore";
// 🔒 Garde-fou localStorage (purge legacy si trop plein)
import { purgeLegacyLocalStorageIfNeeded } from "./lib/storageQuota";

// 🚀 warmUp lite aggregator
import { warmAggOnce } from "./boot/warmAgg";

// Mode Online
import { onlineApi } from "./lib/onlineApi";
import { ensureLocalProfileForOnlineUser } from "./lib/accountBridge";

// ✅ Supabase client
import { supabase } from "./lib/supabaseClient";

// Types
import type { Store, Profile, MatchRecord } from "./lib/types";
import type { X01ConfigV3 as X01ConfigV3Type } from "./types/x01v3";

// Pages
import GameSelect from "./pages/GameSelect";
import Home from "./pages/Home";
import Games from "./pages/Games";
import ModeNotReady from "./pages/ModeNotReady";
import TournamentsHome from "./pages/TournamentsHome";
import Profiles from "./pages/Profiles";
import FriendsPage from "./pages/FriendsPage";
import Settings from "./pages/Settings";
import X01Setup from "./pages/X01Setup";
import X01Play from "./pages/X01Play";
import X01OnlineSetup from "./pages/X01OnlineSetup";
import CricketPlay from "./pages/CricketPlay";

// ✅ KILLER (CONFIG + PLAY)
import KillerConfig from "./pages/KillerConfig";
import KillerPlay from "./pages/KillerPlay";
import KillerSummaryPage from "./pages/KillerSummaryPage";

// ✅ NEW: LES 5 VIES (CONFIG + PLAY)
import FiveLivesConfig from "./pages/FiveLivesConfig";
import FiveLivesPlay from "./pages/FiveLivesPlay";

import ShanghaiPlay from "./pages/ShanghaiPlay";
import LobbyPick from "./pages/LobbyPick";
import X01End from "./pages/X01End";
import AvatarCreator from "./pages/AvatarCreator";
import ProfilesBots from "./pages/ProfilesBots";

import TrainingMenu from "./pages/TrainingMenu";
import TrainingX01Config from "./pages/TrainingX01Config";
import TrainingX01Play from "./pages/TrainingX01Play";
import TrainingClock from "./pages/TrainingClock";
import TrainingModePage from "./pages/TrainingModePage";
import { useTrainingAutoSync } from "./training/sync/useTrainingAutoSync";

import ShanghaiConfigPage from "./pages/ShanghaiConfig";
import ShanghaiEnd from "./pages/ShanghaiEnd";

// ✅ NEW: WARFARE
import WarfareConfigPage from "./pages/WarfareConfig";
import WarfarePlay from "./pages/WarfarePlay";

// ✅ NEW: Battle Royale (config)
import BattleRoyaleConfigPage from "./pages/BattleRoyaleConfig";
import BattleRoyalePlay from "./pages/BattleRoyalePlay";

// ✅ NEW: Spectator
import SpectatorPage from "./pages/SpectatorPage";

// Historique
import { History } from "./lib/history";

// ✅ DartSets localStorage store (synced into App store)
import { getAllDartSets, replaceAllDartSets } from "./lib/dartSetsStore";

// ✅ NEW: rebuild stats cache when history changes (FAST STATS HUB)
import { rebuildStatsForProfile } from "./lib/stats/rebuildStats";

// Stats pages
import StatsShell from "./pages/StatsShell";
import StatsHub from "./pages/StatsHub";
import StatsOnline from "./pages/StatsOnline";
import StatsCricket from "./pages/StatsCricket";
import StatsLeaderboardsPage from "./pages/StatsLeaderboardsPage"; // ⭐ CLASSEMENTS

// TOURNOI
import TournamentCreate from "./pages/TournamentCreate";
import TournamentComposeTeams from "./pages/TournamentComposeTeams";
import TournamentView from "./pages/TournamentView";
import TournamentMatchPlay from "./pages/TournamentMatchPlay";
import TournamentRoadmap from "./pages/TournamentRoadmap";

// X01 V3
import X01ConfigV3 from "./pages/X01ConfigV3";
import X01PlayV3 from "./pages/X01PlayV3";

// 🌟 Nouveau : SYNC / Partage stats locales
import SyncCenter from "./pages/SyncCenter";

// Contexts
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";
import { StoreProvider } from "./contexts/StoreContext";
import { AudioProvider } from "./contexts/AudioContext";
import { AuthOnlineProvider, useAuthOnline } from "./hooks/useAuthOnline";
import { DevModeProvider } from "./contexts/DevModeContext";

// ✅ NEW: Sport context + Pétanque pages
import { SportProvider, useSport } from "./contexts/SportContext";
import PetanquePlay from "./pages/petanque/PetanquePlay";
import PetanqueHome from "./pages/petanque/PetanqueHome";
import PetanqueTeams from "./pages/petanque/PetanqueTeams";
import PetanqueTeamEdit from "./pages/petanque/PetanqueTeamEdit";

// ✅ NEW: Pétanque STATS — copie visuelle StatsShell (identique UI)
import PetanqueStatsShell from "./pages/petanque/PetanqueStatsShell";
import PetanqueStatsPlayersPage from "./pages/petanque/PetanqueStatsPlayersPage";
import PetanqueStatsTeamsPage from "./pages/petanque/PetanqueStatsTeamsPage";
import PetanqueStatsLeaderboardsPage from "./pages/petanque/PetanqueStatsLeaderboardsPage";
import PetanqueStatsMatchesPage from "./pages/petanque/PetanqueStatsMatchesPage";
import PetanqueStatsHistoryPage from "./pages/petanque/PetanqueStatsHistoryPage";

import PetanqueTournamentsHome from "./pages/petanque/PetanqueTournamentsHome";
import PetanqueTournamentCreate from "./pages/petanque/PetanqueTournamentCreate";
import PetanqueTournamentView from "./pages/petanque/PetanqueTournamentView";
import PetanqueTournamentMatchScore from "./pages/petanque/PetanqueTournamentMatchScore";

// ✅ NEW: Pétanque flow (menu/config/play)
import PetanqueMenuGames from "./pages/petanque/PetanqueMenuGames";
import PetanqueConfig from "./pages/petanque/PetanqueConfig";

// ✅ NEW: Baby-Foot (LOCAL)
import BabyFootHome from "./pages/babyfoot/BabyFootHome";
import BabyFootMenuGames from "./pages/babyfoot/BabyFootMenuGames";
import BabyFootConfig from "./pages/babyfoot/BabyFootConfig";
import BabyFootPlay from "./pages/babyfoot/BabyFootPlay";
import BabyFootStatsShell from "./pages/babyfoot/BabyFootStatsShell";
import BabyFootStatsHistoryPage from "./pages/babyfoot/BabyFootStatsHistoryPage";

// ✅ NEW: Ping-Pong (LOCAL)
import PingPongHome from "./pages/pingpong/PingPongHome";
import PingPongMenuGames from "./pages/pingpong/PingPongMenuGames";
import PingPongConfig from "./pages/pingpong/PingPongConfig";
import PingPongPlay from "./pages/pingpong/PingPongPlay";
import PingPongStatsShell from "./pages/pingpong/PingPongStatsShell";
import PingPongStatsHistoryPage from "./pages/pingpong/PingPongStatsHistoryPage";

// Dev helper
import { installHistoryProbe } from "./dev/devHistoryProbe";
import DartsModeConfig from "./pages/modes/DartsModeConfig";
import DartsModePlay from "./pages/modes/DartsModePlay";

// ✅ NEW: Darts modes (Config + Play) — MVP pages (câblage dédié)
import HalveItConfig from "./pages/HalveItConfig";
import HalveItPlay from "./pages/HalveItPlay";
import CountUpConfig from "./pages/CountUpConfig";
import DefiConfig from "./pages/DefiConfig";
import DefiPlay from "./pages/DefiPlay";
import CountUpPlay from "./pages/CountUpPlay";
import PrisonerConfig from "./pages/PrisonerConfig";
import PrisonerPlay from "./pages/PrisonerPlay";
import SuperBullConfig from "./pages/SuperBullConfig";
import SuperBullPlay from "./pages/SuperBullPlay";
import ShooterConfig from "./pages/ShooterConfig";
import ShooterPlay from "./pages/ShooterPlay";
import TicTacToeConfig from "./pages/TicTacToeConfig";
import TicTacToePlay from "./pages/TicTacToePlay";
import KnockoutConfig from "./pages/KnockoutConfig";
import KnockoutPlay from "./pages/KnockoutPlay";
import Bobs27Config from "./pages/Bobs27Config";
import Bobs27Play from "./pages/Bobs27Play";
import ScramConfig from "./pages/ScramConfig";
import ScramPlay from "./pages/ScramPlay";
import GolfConfig from "./pages/GolfConfig";
import GolfPlay from "./pages/GolfPlay";
import BaseballConfig from "./pages/BaseballConfig";
import BaseballPlay from "./pages/BaseballPlay";
import Game170Config from "./pages/Game170Config";
import Game170Play from "./pages/Game170Play";
import FootballConfig from "./pages/FootballConfig";
import FootballPlay from "./pages/FootballPlay";
import BatardConfig from "./pages/BatardConfig";
import FunGagesConfig from "./pages/FunGagesConfig";
import FunGagesPlay from "./pages/FunGagesPlay";
import BatardPlay from "./pages/BatardPlay";
import CapitalConfig from "./pages/CapitalConfig";
import CapitalPlay from "./pages/CapitalPlay";
import HappyMilleConfig from "./pages/HappyMilleConfig";
import HappyMillePlay from "./pages/HappyMillePlay";
import RugbyConfig from "./pages/RugbyConfig";
import RugbyPlay from "./pages/RugbyPlay";
import DepartementsConfig from "./pages/DepartementsConfig";
import DepartementsPlay from "./pages/DepartementsPlay";
import EnculetteConfig from "./pages/EnculetteConfig";
import EnculettePlay from "./pages/EnculettePlay";

if (import.meta.env.DEV) installHistoryProbe();

// =============================================================
// ✅ START GAME / SPORT (persisted) + runtime switch
// =============================================================
const START_GAME_KEY = "dc-start-game";
type StartGameId = "darts" | "petanque" | "pingpong" | "babyfoot";

// =============================================================
// ✅ SAFE MERGE — profils (évite crash au boot)
// - merge liste existante + liste réhydratée
// - dédoublonnage par id
// - préfère les champs "nouveaux" s’ils sont définis
// =============================================================
function mergeProfilesSafe<T extends { id: string }>(base: T[], incoming: T[]) {
  const a = Array.isArray(base) ? base : [];
  const b = Array.isArray(incoming) ? incoming : [];

  const map = new Map<string, T>();
  for (const p of a) {
    if (p && typeof p.id === "string") map.set(p.id, p);
  }
  for (const p of b) {
    if (!p || typeof p.id !== "string") continue;
    const prev = map.get(p.id);
    map.set(p.id, prev ? ({ ...prev, ...p } as T) : p);
  }

  return Array.from(map.values());
}

// =============================================================
// ✅ NEW: Helpers upload avatar Supabase (PROFILES)
// - dataUrl (png base64) -> Blob
// - upload (upsert) dans bucket public "avatars"
// - renvoie publicUrl
// =============================================================
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Impossible de convertir dataUrl -> Blob");
  return await res.blob();
}

async function uploadAvatarToSupabase(opts: { bucket: string; objectPath: string; pngDataUrl: string }): Promise<{ publicUrl: string }> {
  const blob = await dataUrlToBlob(opts.pngDataUrl);

  const { error: upErr } = await supabase.storage.from(opts.bucket).upload(opts.objectPath, blob, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(opts.objectPath);
  const publicUrl = (data as any)?.publicUrl || "";
  if (!publicUrl) throw new Error("getPublicUrl() a renvoyé une URL vide");
  return { publicUrl };
}

/* --- helpers --- */
function withAvatars(rec: any, profiles: any[]) {
  const get = (arr: any[]) =>
    (arr || []).map((p: any) => {
      const prof = profiles.find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

  const players = rec?.players?.length ? rec.players : rec?.payload?.players || [];
  const filled = get(players);

  return {
    ...rec,
    players: filled,
    payload: { ...(rec?.payload || {}), players: filled },
  };
}

/* ============================================================
   ✅ FIX AVATAR (anti overwrite par undefined)
============================================================ */
function buildChangelogSlides(t: (k: string, d?: string) => string, entries: any[]): any[] {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return [];

  const safeParseDateStr = (s: string) => {
    const x = String(s || "").trim();
    if (!x) return null;
    const d = Date.parse(x);
    return Number.isFinite(d) ? d : null;
  };

  const sorted = [...list].sort((a, b) => {
    const ta = safeParseDateStr(a.date ?? "") ?? 0;
    const tb = safeParseDateStr(b.date ?? "") ?? 0;
    return tb - ta;
  });

  return sorted.slice(0, 3).map((e, idx) => {
    const bullets = Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : [];
    const text =
      bullets.length > 0
        ? bullets.slice(0, 4).map((x) => `• ${x}`).join("\n")
        : t("home.changelog.empty", "Améliorations et correctifs divers.");

    const dateStr = String(e.date ?? "").trim();
    const title = dateStr ? `${t("home.changelog.title", "Patch notes")} — ${dateStr}` : t("home.changelog.title", "Patch notes");

    return {
      id: `changelog-${e.id ?? idx}`,
      kind: "news",
      title,
      text: `${String(e.title ?? "").trim()}\n${text}`.trim(),
      imageKey: "tipNews",
      weight: 9 - idx,
      hot: true,
      forceNew: true,
      version: 1,
    };
  });
}

/* ============================================================
   ✅ NEW: sanitizeStoreForCloud (anti base64 dans snapshot cloud)
============================================================ */
function sanitizeStoreForCloud(s: any) {
  let clone: any;
  try {
    clone = JSON.parse(JSON.stringify(s || {}));
  } catch {
    clone = { ...(s || {}) };
  }

  if (Array.isArray(clone.profiles)) {
    clone.profiles = clone.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const v = out.avatarDataUrl;
      if (typeof v === "string" && v.startsWith("data:")) delete out.avatarDataUrl;

      // 🔒 sécurité: ne JAMAIS pousser un mot de passe en cloud
      try {
        if (out.privateInfo && typeof out.privateInfo === "object") {
          const pi: any = { ...(out.privateInfo as any) };
          if (pi.password) delete pi.password;
          out.privateInfo = pi;
        }
      } catch {}

      return out;
    });
  }

  if (Array.isArray(clone.history)) {
    clone.history = clone.history.map((r: any) => {
      const rr = { ...(r || {}) };

      if (Array.isArray(rr.players)) {
        rr.players = rr.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = (pp as any).avatarDataUrl ?? (pp as any).avatarUrl;
          if (typeof v === "string" && v.startsWith("data:")) {
            if (typeof (pp as any).avatarDataUrl === "string" && (pp as any).avatarDataUrl.startsWith("data:")) delete (pp as any).avatarDataUrl;
            if (typeof (pp as any).avatarUrl === "string" && (pp as any).avatarUrl.startsWith("data:")) delete (pp as any).avatarUrl;
          }
          return pp;
        });
      }

      if (rr.payload && Array.isArray(rr.payload.players)) {
        rr.payload = { ...(rr.payload || {}) };
        rr.payload.players = rr.payload.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = (pp as any).avatarDataUrl ?? (pp as any).avatarUrl;
          if (typeof v === "string" && v.startsWith("data:")) {
            if (typeof (pp as any).avatarDataUrl === "string" && (pp as any).avatarDataUrl.startsWith("data:")) delete (pp as any).avatarDataUrl;
            if (typeof (pp as any).avatarUrl === "string" && (pp as any).avatarUrl.startsWith("data:")) delete (pp as any).avatarUrl;
          }
          return pp;
        });
      }

      return rr;
    });
  }

  // ✅ DartSets : ne pas pousser de base64 (photoDataUrl) en cloud
  if (Array.isArray((clone as any).dartSets)) {
    (clone as any).dartSets = (clone as any).dartSets.map((ds: any) => {
      const dso = { ...(ds || {}) };
      const p = dso.photoDataUrl;
      if (typeof p === "string" && p.startsWith("data:")) delete dso.photoDataUrl;
      return dso;
    });
  }

  return clone;
}

/* --------------------------------------------
   ROUTES
-------------------------------------------- */
type Tab =
  | "account_start"
  | "auth_start"
  | "auth_forgot"
  | "auth_v7_login"
  | "auth_v7_signup"
  | "home"
  | "gameSelect"
  | "games"
  | "mode_not_ready"
  // ✅ NEW (OBLIGATOIRE): Tabs Pétanque (snake_case)
  | "petanque_menu"
  | "petanque_config"
  | "petanque_play"
  // ✅ NEW: Tabs Baby-Foot (LOCAL)
  | "babyfoot_menu"
  | "babyfoot_config"
  | "babyfoot_play"
  | "babyfoot_stats_history"
  // ✅ NEW: Tabs Ping-Pong (LOCAL)
  | "pingpong_menu"
  | "pingpong_config"
  | "pingpong_play"
  | "pingpong_stats_history"
  // ✅ NEW: Teams Pétanque (CRUD local)
  | "petanque_teams"
  | "petanque_team_edit"
  // ✅ NEW (Option B): Stats Pétanque (routes propres)
  | "petanque_stats_players"
  | "petanque_stats_teams"
  | "petanque_stats_leaderboards"
  | "petanque_stats_matches"
  | "petanque_stats_history"
  | "petanque_tournaments"
  | "petanque_tournament_create"
  | "petanque_tournament_view"
  | "petanque_tournament_match_score"
  // (legacy / existing)
  | "petanque.menu"
  | "petanque.config"
  | "petanque.play"
  | "tournaments"
  | "tournament_create"
  | "tournament_compose_teams"
  | "tournament_view"
  | "tournament_match_play"
  | "tournament_roadmap"
  | "profiles"
  | "profiles_bots"
  | "friends"
  | "online"
  | "spectator"
  | "settings"
  | "stats"
  | "statsHub"
  | "stats_online"
  | "cricket_stats"
  | "statsDetail"
  | "stats_leaderboards"
  | "x01setup"
  | "x01_online_setup"
  | "x01"
  | "x01_end"
  | "cricket"
  | "killer"
  | "killer_config"
  | "killer_play"
  | "killer_summary"
  | "five_lives_config"
  | "five_lives_play"
  | "shanghai"
  | "shanghai_play"
  | "warfare_config"
  | "warfare_play"
  | "battle_royale"
  | "battle_royale_play"
  | "training"
  | "training_x01"
  | "training_x01_play"
  | "training_stats"
  | "training_clock"
  | "training_mode"
  | "avatar"
  | "x01_config_v3"
  | "x01_play_v3"
  | "sync_center"
  | "auth_callback"
  | "darts_mode_config"
  | "darts_mode_play"
  // ✅ NEW: Darts modes dedicated tabs (Config + Play)
  | "halve_it_config"
  | "halve_it_play"
  | "count_up_config"
  | "count_up_play"
  | "prisoner_config"
  | "prisoner_play"
  | "super_bull_config"
  | "super_bull_play"
  | "shooter_config"
  | "shooter_play"
  | "tic_tac_toe_config"
  | "tic_tac_toe_play"
  | "knockout_config"
  | "knockout_play"
  | "bobs_27_config"
  | "bobs_27_play"
  | "scram_config"
  | "scram_play"
  | "golf_config"
  | "golf_play"
  | "baseball_config"
  | "baseball_play"
  | "game_170_config"
  | "game_170_play"
  | "football_config"
  | "football_play"
  | "batard_config"
  | "batard_play"
  | "fun_gages_config"
  | "fun_gages_play"
  | "capital_config"
  | "capital_play"
  | "happy_mille_config"
  | "happy_mille_play"
  | "rugby_config"
  | "rugby_play"
  | "departements_config"
  | "departements_play"
  | "enculette_config"
  | "enculette_play"
  | "auth_reset";

/* redirect TrainingStats → StatsHub */
function RedirectToStatsTraining({ go }: { go: (tab: Tab, params?: any) => void }) {
  React.useEffect(() => {
    go("statsHub", { tab: "training" });
  }, [go]);
  return null;
}

/* --------------------------------------------
   ✅ NEW: AUTH CALLBACK (PROD)
-------------------------------------------- */
function AuthCallbackRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [msg, setMsg] = React.useState("Connexion en cours…");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // ✅ NEW: capture session from Supabase email links (PKCE code or implicit tokens)
        try {
          const href = String(window.location.href || "");
          const u = new URL(href);
          const fromSearch = u.searchParams.get("code");
          const fromHashQuery = (() => {
            const h = String(u.hash || "");
            const q = h.includes("?") ? h.split("?")[1] : "";
            return q ? new URLSearchParams(q).get("code") : null;
          })();
          const code = fromSearch || fromHashQuery;

          // PKCE flow: exchange code -> session
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else {
            // Implicit flow: tokens can be in hash
            const h = String(u.hash || "").replace(/^#/, "");
            const qs = h.includes("?") ? h.split("?")[1] : h;
            const sp = new URLSearchParams(qs);
            const access_token = sp.get("access_token");
            const refresh_token = sp.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        } catch (e) {
          console.warn("[auth_callback] session parse/exchange failed", e);
        }

        try {
          await onlineApi.restoreSession();
        } catch {}

        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.error("[auth_callback] getSession error:", error);
          setMsg("Erreur de connexion. Ouvre le DERNIER email reçu et réessaie.");
          return;
        }

        if (data?.session) {
          try {
            window.location.hash = "#/online";
          } catch {}
          go("online");
          return;
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session) {
            try {
              window.location.hash = "#/online";
            } catch {}
            go("online");
          }
        });

        setTimeout(() => {
          if (alive) {
            setMsg("Presque fini… si ça bloque : ouvre le DERNIER email reçu (les anciens liens expirent).");
          }
        }, 900);

        return () => sub.subscription.unsubscribe();
      } catch (e) {
        console.error("[auth_callback] fatal:", e);
        if (alive) setMsg("Erreur de connexion. Réessaie avec le DERNIER email reçu.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [go]);

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("profiles", { view: "me", autoCreate: true })}>← Retour</button>
      <h2 style={{ marginTop: 10 }}>Authentification</h2>
      <p style={{ opacity: 0.9 }}>{msg}</p>
    </div>
  );
}

/* --------------------------------------------
   ✅ NEW: FORGOT PASSWORD (REQUEST EMAIL)
-------------------------------------------- */
function AuthForgotRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  async function submit() {
    setStatus("");
    const e = email.trim();
    if (!e || !e.includes("@")) return setStatus("Entre une adresse email valide.");

    try {
      const redirectTo = `${window.location.origin}/#/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
      if (error) {
        console.error("[auth_forgot] resetPasswordForEmail error:", error);
        setStatus("Erreur : " + error.message);
        return;
      }
      setStatus("Email envoyé ✅ Ouvre le DERNIER email reçu pour réinitialiser.");
    } catch (err: any) {
      console.error("[auth_forgot] fatal:", err);
      setStatus("Erreur : " + (err?.message || "inconnue"));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("account_start")}>← Retour</button>
      <h2 style={{ marginTop: 10 }}>Mot de passe oublié</h2>
      <p style={{ opacity: 0.85 }}>Entre ton email, on t’envoie un lien de réinitialisation.</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
        <input
          type="email"
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />

        <button
          onClick={submit}
          style={{
            borderRadius: 999,
            padding: "10px 12px",
            border: "none",
            fontWeight: 900,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Envoyer le lien
        </button>

        {status ? <div style={{ opacity: 0.9 }}>{status}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------
   ✅ NEW: RESET PASSWORD (PROD)
-------------------------------------------- */
function AuthResetRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  // ✅ NEW: if user lands here from email link, exchange PKCE code / set implicit tokens
    // ✅ NEW: if user lands here from email link, establish a valid Supabase session
  // Supports multiple Supabase email URL shapes (hash-router + implicit tokens + PKCE code).
  React.useEffect(() => {
    (async () => {
      try {
        const href = String(window.location.href || "");
        const u = new URL(href);

        // Some providers / routers produce double-hash URLs:
        //   https://site/#access_token=...&refresh_token=...#/auth/reset
        // Keep only the left part (params) for parsing.
        const rawHash = String(u.hash || "").replace(/^#/, "");
        const hashLeft = rawHash.includes("#/") ? rawHash.split("#/")[0] : rawHash;

        // 1) PKCE code can appear in:
        //   - ?code=... (search)
        //   - #/auth/reset?code=... (hash query)
        //   - .../#/code=<uuid>/auth/reset (path-ish, rare)
        const fromSearch = u.searchParams.get("code");
        const fromHashQuery = (() => {
          const h = String(u.hash || "");
          const q = h.includes("?") ? h.split("?")[1] : "";
          return q ? new URLSearchParams(q).get("code") : null;
        })();
        const fromAny = (() => {
          const m = href.match(/code=([0-9a-fA-F-]{36})/);
          return m ? m[1] : null;
        })();

        const code = fromSearch || fromHashQuery || fromAny;

        // 2) Implicit tokens live in the hash fragment (access_token/refresh_token)
        const sp = new URLSearchParams(hashLeft.includes("?") ? hashLeft.split("?")[1] : hashLeft);
        const access_token = sp.get("access_token");
        const refresh_token = sp.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          return;
        }

        if (code) {
          // PKCE: requires the code_verifier stored in localStorage in the same browser context.
          await supabase.auth.exchangeCodeForSession(code);
          return;
        }

        // If we reach here, the URL does not contain usable auth payload.
        // The user cannot reset password from this page without the email link.
        console.warn("[auth_reset] No code or tokens found in URL.");
      } catch (e) {
        console.warn("[auth_reset] session parse/exchange failed", e);
      }
    })();
  }, []);



  async function submit() {
    setStatus("");
    if (!pw || pw.length < 6) return setStatus("Mot de passe trop court (min 6).");
    if (pw !== pw2) return setStatus("Les mots de passe ne correspondent pas.");

    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      console.error("[auth_reset] updateUser error:", error);
      setStatus("Erreur : " + error.message);
      return;
    }

    setStatus("Mot de passe mis à jour ✅");
    try {
      window.location.hash = "#/online";
    } catch {}
    go("online");
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("profiles", { view: "me", autoCreate: true })}>← Retour</button>

      <h2 style={{ marginTop: 10 }}>Réinitialiser le mot de passe</h2>

      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />

        <button
          onClick={submit}
          style={{
            borderRadius: 12,
            padding: "10px 12px",
            border: "none",
            fontWeight: 900,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Valider
        </button>

        {status ? <div style={{ opacity: 0.9 }}>{status}</div> : null}
      </div>
    </div>
  );
}

function StatsDetailRoute({ store, go, params }: any) {
  const [rec, setRec] = React.useState<any>(() => {
    if (params?.rec) {
      return withAvatars(params.rec, store.profiles || []);
    }
    const fromMem = (store.history || []).find((r: any) => r.id === params?.matchId);
    return fromMem ? withAvatars(fromMem, store.profiles || []) : null;
  });

  const matchId: string | undefined = params?.matchId;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!matchId) return;
      try {
        const byId = await (History as any)?.get?.(matchId);
        if (alive && byId) setRec(withAvatars(byId, store.profiles || []));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [matchId, store.profiles]);

  if (params?.showEnd && rec) {
    return (
      <X01End
        go={go}
        params={{
          matchId: rec.id,
          resumeId: rec.resumeId ?? rec.payload?.resumeId,
          showEnd: true,
        }}
      />
    );
  }

  if (rec) {
    const when = Number(rec.updatedAt ?? rec.createdAt ?? Date.now());
    const dateStr = new Date(when).toLocaleString();
    const players = Array.isArray(rec.players) ? rec.players : [];
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => go("statsHub", { tab: "history" })}>← Retour</button>
        <h2>
          {(rec.kind || "MATCH").toUpperCase()} — {dateStr}
        </h2>
        <div style={{ opacity: 0.85 }}>Joueurs : {players.map((p) => p.name).join(" · ")}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("statsHub", { tab: "history" })}>← Retour</button>
      {matchId ? "Chargement..." : "Aucune donnée"}
    </div>
  );
}

/* --------------------------------------------
   STORE INITIAL
-------------------------------------------- */
const initialStore: Store = {
  profiles: [],
  activeProfileId: null,
  friends: [],
  selfStatus: "online" as any,
  settings: {
    defaultX01: 501,
    doubleOut: true,
    randomOrder: false,
    lang: "fr",
    ttsOnThird: false,
    neonTheme: true,
  } as any,
  history: [],
  dartSets: getAllDartSets(),
} as any;

/* --------------------------------------------
   Préférences X01 par profil actif
-------------------------------------------- */
function getX01DefaultStart(store: Store): 301 | 501 | 701 | 901 {
  const profiles = store.profiles ?? [];
  const active = profiles.find((p) => p.id === store.activeProfileId) ?? null;

  const settingsDefault = (store.settings.defaultX01 as 301 | 501 | 701 | 901) || 501;
  if (!active) return settingsDefault;

  const pi = ((active as any).privateInfo || {}) as {
    prefX01StartScore?: number;
    prefAutoApplyPrefs?: boolean;
  };

  if (!pi.prefAutoApplyPrefs) return settingsDefault;

  const pref = Number(pi.prefX01StartScore ?? 0);
  const allowed: (301 | 501 | 701 | 901)[] = [301, 501, 701, 901];

  if (allowed.includes(pref as any)) return pref as 301 | 501 | 701 | 901;
  return settingsDefault;
}

/* BOTS LS */
const LS_BOTS_KEY = "dc_bots_v1";
/* ONLINE mirror LS (comme FriendsPage / StatsOnline) */
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type BotLS = {
  id: string;
  name: string;
  avatarSeed?: string;
  avatarDataUrl?: string | null;
  [k: string]: any;
};

function loadBotsLS(): BotLS[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    return raw ? (JSON.parse(raw) as BotLS[]) : [];
  } catch {
    return [];
  }
}

function saveBotsLS(list: BotLS[]) {
  try {
    localStorage.setItem(LS_BOTS_KEY, JSON.stringify(list));
  } catch {}
}

/* Service Worker banner */
function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    });
  }, []);

  function updateNow() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setShowPrompt(false);
  }

  return { showPrompt, updateNow, dismiss: () => setShowPrompt(false) };
}

function SWUpdateBanner() {
  const { showPrompt, updateNow, dismiss } = useServiceWorkerUpdate();
  if (!showPrompt) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(20,20,20,.9)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 12,
        boxShadow: "0 0 15px rgba(0,0,0,.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span>🔄 Nouvelle version disponible</span>
      <button
        onClick={updateNow}
        style={{
          background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
          color: "#000",
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Recharger
      </button>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          color: "#aaa",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
        title="Ignorer"
      >
        ✕
      </button>
    </div>
  );
}

/* --------------------------------------------
                APP
-------------------------------------------- */
function App() {
  useEffect(() => {
    migrateLocalStorageToIndexedDB();
  }, []);

  // LOT20: auto-sync training events (best-effort)
  useTrainingAutoSync();

  // ============================================================
  // ✅ CLOUD SNAPSHOT SYNC (source unique Supabase)
  // ============================================================
  const online = useAuthOnline();
  // PROFILES V7: on désactive l'hydratation automatique du store depuis le cloud
  // (elle écrasait des données locales et créait des états impossibles à déboguer).
  const [cloudHydrated, setCloudHydrated] = React.useState(true);

  // (legacy) Référence conservée pour logs/diagnostic éventuels.
  const cloudHydratedUserRef = React.useRef<string>("");

  const cloudPushTimerRef = React.useRef<number | null>(null);

  const [store, setStore] = React.useState<Store>(initialStore);

  // ============================================================


  // ✅ DEFAULT TAB = gameSelect (si boot OK). Les flows auth/hash peuvent override.
  // ✅ IMPORTANT: GameSelect doit toujours s'afficher (après intro)
  const [tab, setTab] = React.useState<Tab>("gameSelect");

  const [routeParams, setRouteParams] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);


  // ✅ ONLINE→LOCAL BRIDGE (COMPTE UTILISATEUR UNIQUE)
  // - Si l’utilisateur est connecté Supabase mais qu’aucun profil local actif n’existe,
  //   on crée / lie un profil local et on le met actif.
  // - Évite le loop "reconnexion demandée à chaque ouverture" (pas de profil local actif).
  // ============================================================
  React.useEffect(() => {
    if (loading) return;
    if (!online?.ready) return;
    if (online.status !== "signed_in") return;

    const hasProfiles = (store?.profiles?.length || 0) > 0;
    const hasActive = !!(store as any)?.activeProfileId;
    if (hasProfiles && hasActive) return;

    const user = (online as any)?.user || (online as any)?.session?.user || null;
    if (!user?.id) return;

    try {
      setStore((prev) => {
        const next = ensureLocalProfileForOnlineUser(prev as any, user as any, (online as any)?.profile ?? null) as any;
        queueMicrotask(() => saveStore(next));
        return next;
      });

      // Si on est encore sur un écran de démarrage auth/profil, on bascule vers l'app
      if (
        tab === "account_start" ||
        tab === "auth_start" ||
        tab === "auth_v7_login" ||
        tab === "auth_v7_signup"
      ) {
        setRouteParams(null);
        setTab("gameSelect");
      }
    } catch (e) {
      console.warn("[online→local] bridge failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, online?.ready, online?.status, (online as any)?.user?.id, tab, store?.profiles?.length, (store as any)?.activeProfileId]);

  // ✅ SPORT-AWARE : utilisé pour Home/Games (runtime-safe)
  const sportApi: any = useSport() as any;
  const sportFromCtx: StartGameId = (sportApi?.sport ?? "darts") as any;
  const setSportCtx: undefined | ((s: StartGameId) => void) = sportApi?.setSport;

  // ✅ Runtime sport (sans reload / sans relancer intro)
  const [activeSport, setActiveSport] = React.useState<StartGameId>(() => {
    try {
      const v = localStorage.getItem(START_GAME_KEY) as StartGameId | null;
      return v ?? (sportFromCtx || "darts");
    } catch {
      return sportFromCtx || "darts";
    }
  });

  // Sync: si SportContext change (GameSelect / autre), on reflète
  React.useEffect(() => {
    if (!sportFromCtx) return;
    setActiveSport(sportFromCtx);
  }, [sportFromCtx]);

  // ✅ Listen Settings → runtime switch (dc:sport-change)
  React.useEffect(() => {
    const handler = (e: any) => {
      const next = (e?.detail?.sport ?? e?.detail?.game ?? "darts") as StartGameId;

      setActiveSport(next);

      try {
        localStorage.setItem(START_GAME_KEY, next);
      } catch {}

      // Si SportContext expose setSport, on l’actualise aussi (sinon, on reste runtime-only)
      try {
        if (typeof setSportCtx === "function") setSportCtx(next);
      } catch {}
    };

    window.addEventListener("dc:sport-change", handler as any);
    return () => window.removeEventListener("dc:sport-change", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSportCtx]);

  // ✅ SPLASH gate (ne s'affiche pas pendant les flows auth)
  const [showSplash, setShowSplash] = React.useState(() => {
    const h = String(window.location.hash || "");
    const isAuthFlow =
    h.startsWith("#/auth/callback") ||
    h.startsWith("#/auth/reset") ||
    h.startsWith("#/auth/forgot") ||
    h.startsWith("#/auth/login") ||
    h.startsWith("#/auth/signup");
    return !isAuthFlow;
  });

  // 🛟 SAFETY NET : ne JAMAIS bloquer l'app sur le splash
  React.useEffect(() => {
    if (!showSplash) return;
    const hardTimeout = window.setTimeout(() => {
      console.warn("[Splash] forced exit (safety timeout)");
      setShowSplash(false);
    }, 8000);
    return () => window.clearTimeout(hardTimeout);
  }, [showSplash]);

  /* Boot: persistance + nettoyage localStorage + warm-up (SANS SFX UI) */
  React.useEffect(() => {
    ensurePersisted().catch(() => {});
    purgeLegacyLocalStorageIfNeeded();
    try {
      warmAggOnce();
    } catch {}
  }, []);

  /* Restore online session (pour Supabase côté SDK) */
  React.useEffect(() => {
    onlineApi.restoreSession().catch(() => {});
  }, []);

  // ✅ NEW: détecte les liens email Supabase via hash (+ /online)
  React.useEffect(() => {
    const applyHashRoute = () => {
      const h = String(window.location.hash || "");

      if (h.startsWith("#/auth/callback")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_callback");
        return;
      }
      if (h.startsWith("#/auth/reset")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_reset");
        return;
      }
      if (h.startsWith("#/auth/forgot")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_forgot");
        return;
      }
      if (h.startsWith("#/online")) {
        setRouteParams(null);
        setTab("online");
        return;
      }
      if (h.startsWith("#/spectator")) {
        setRouteParams(null);
        setTab("spectator");
        return;
      }
      if (h.startsWith("#/auth/login")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_v7_login");
        return;
      }
      if (h.startsWith("#/auth/signup")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_v7_signup");
        return;
      }
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  /* expose supabase globally for debug */
  React.useEffect(() => {
    (window as any).__supabase = supabase;
  }, []);

  /* X01 v1 config */
  const [x01Config, setX01Config] = React.useState<any>(null);

  /* X01 v3 config */
  const [x01ConfigV3, setX01ConfigV3] = React.useState<X01ConfigV3Type | null>(null);

  /* Navigation */
  function go(next: Tab, params?: any) {
    setRouteParams(params ?? null);
    setTab(next);

    if (
      next === "auth_callback" ||
      next === "auth_reset" ||
      next === "auth_forgot" ||
      next === "auth_v7_login" ||
      next === "auth_v7_signup"
    ) {
      setShowSplash(false);
    }

    try {
      if (next === "auth_callback") window.location.hash = "#/auth/callback";
      else if (next === "auth_reset") window.location.hash = "#/auth/reset";
      else if (next === "auth_forgot") window.location.hash = "#/auth/forgot";
      else if (next === "auth_v7_login") window.location.hash = "#/auth/login";
      else if (next === "auth_v7_signup") window.location.hash = "#/auth/signup";
      else if (next === "online") window.location.hash = "#/online";
      else if (next === "spectator") window.location.hash = "#/spectator";
      else {
        const h = String(window.location.hash || "");
        if (
          h.startsWith("#/auth/") ||
          h.startsWith("#/online") ||
          h.startsWith("#/spectator")
        )
          window.location.hash = "#/";
      }
    } catch {}
  }

  /* centralized update */
  function update(mut: (s: Store) => Store) {
    setStore((s) => {
      const next = mut({ ...s });
      queueMicrotask(() => saveStore(next));
      return next;
    });
  }

  // ✅ IMPORTANT: expose go globalement + store “vivant”
  React.useEffect(() => {
    try {
      (window as any).__appGo = go;
      (window as any).__appStore = (window as any).__appStore || {};
      (window as any).__appStore.go = go;
      (window as any).__appStore.store = store;
      (window as any).__appStore.tab = tab;
      (window as any).__appStore.update = update;
    } catch {}
  }, [store, tab]);

  /* Load store from IDB at boot + gate */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadStore<Store>();

        let base: Store;
        if (saved) {
          base = {
            ...initialStore,
            ...saved,
            profiles: saved.profiles ?? [],
            friends: saved.friends ?? [],
            history: saved.history ?? [],
            dartSets: (saved as any).dartSets ?? getAllDartSets(),
          };
        } else {
          base = { ...initialStore };
        }

        if (mounted) {
          setStore((prev) => ({
            ...base,
            profiles: mergeProfilesSafe(prev.profiles ?? [], base.profiles ?? []),
          }));

          const hasProfiles = (base.profiles ?? []).length > 0;
          const hasActive = !!base.activeProfileId;

          const h = String(window.location.hash || "");
          const isAuthFlow =
           h.startsWith("#/auth/callback") ||
           h.startsWith("#/auth/reset") ||
           h.startsWith("#/auth/forgot") ||
           h.startsWith("#/auth/login") ||
           h.startsWith("#/auth/signup");

          if (!isAuthFlow) {
            if (!hasProfiles || !hasActive) {
              setRouteParams(null);
              setTab("account_start");
            } else {
              // ✅ DEFAULT START : GameSelect DOIT TOUJOURS s'afficher après l'intro
              setRouteParams(null);
              setTab("gameSelect");
            }
          }
        }
      } catch {
        if (mounted) {
          setStore(initialStore);
          setRouteParams(null);
          setTab("account_start");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // ✅ AUTH — handler Supabase (conservé)
  // ============================================================
  const wipeAllLocalData = React.useCallback(async () => {
    setRouteParams(null);
    setTab("account_start");
  }, []);

  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN") {
          const user = session?.user || (await supabase.auth.getUser())?.data?.user || null;
          if (user?.id) cloudHydratedUserRef.current = String(user.id);
        }
        if (event === "SIGNED_OUT") {
          // PROFILES V7: on ne wipe PAS les données locales au logout.
        }
      } catch (e) {
        console.warn("[auth] onAuthStateChange handler error", e);
      }
    });

    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wipeAllLocalData]);

  // ============================================================
  // ✅ CLOUD HYDRATE (source unique)
  // ============================================================
  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (loading) return;
      if (!online?.ready) return;
      if (online.status !== "signed_in") return;
      if (cloudHydrated) return;

      try {
        const res: any = await onlineApi.pullStoreSnapshot();

        if (res?.status === "ok") {
          const payload = (res as any)?.payload ?? null;
          const cloudStore = payload?.store ?? payload?.idb?.store ?? payload ?? null;

          const isCloudEmpty = (() => {
            if (!cloudStore) return true;
            if (typeof cloudStore !== "object") return false;
            try {
              const keys = Object.keys(cloudStore as any);
              if (keys.length === 0) return true;
              const cs: any = cloudStore as any;
              const hasProfiles = Array.isArray(cs.profiles) && cs.profiles.length > 0;
              const hasHistory = Array.isArray(cs.history) && cs.history.length > 0;
              const hasFriends = Array.isArray(cs.friends) && cs.friends.length > 0;
              const hasDartSets = Array.isArray(cs.dartSets) && cs.dartSets.length > 0;
              const hasActive = !!cs.activeProfileId;
              return !(hasProfiles || hasHistory || hasFriends || hasDartSets || hasActive);
            } catch {
              return false;
            }
          })();

          const hasLocalData =
            (store?.profiles?.length || 0) > 0 ||
            !!(store as any)?.activeProfileId ||
            (store?.friends?.length || 0) > 0 ||
            (store?.history?.length || 0) > 0 ||
            ((store as any)?.dartSets?.length || 0) > 0;

          if (isCloudEmpty && hasLocalData) {
            try {
              const cloudSeed = sanitizeStoreForCloud(store);
              await onlineApi.pushStoreSnapshot(cloudSeed);
              console.log("[cloud] cloud empty -> seeded from local");
            } catch (e) {
              console.warn("[cloud] seed from local failed", e);
            }
            return; // ⛔ ne pas écraser le store local
          }

          if (cloudStore && typeof cloudStore === "object") {
            const next: Store = {
              ...initialStore,
              ...(cloudStore as any),
              profiles: (cloudStore as any).profiles ?? [],
              friends: (cloudStore as any).friends ?? [],
              history: (cloudStore as any).history ?? [],
              dartSets: (cloudStore as any).dartSets ?? getAllDartSets(),
            };

            if (!cancelled) {
              let mergedFinal: Store | null = null;

              setStore((prev) => {
                const mergedProfiles = mergeProfilesSafe(prev.profiles ?? [], next.profiles ?? []);
                const merged: Store = {
                  ...next,
                  profiles: mergedProfiles,
                  activeProfileId: next.activeProfileId ?? prev.activeProfileId ?? null,
                } as any;

                mergedFinal = merged;
                return mergedFinal as any;
              });

              await Promise.resolve();

              if (mergedFinal) {
                try {
                  await saveStore(mergedFinal);
                } catch {}

                try {
                  if ((mergedFinal as any).dartSets) replaceAllDartSets((mergedFinal as any).dartSets);
                } catch {}

                const hasProfiles = (mergedFinal.profiles ?? []).length > 0;
                const hasActive = !!mergedFinal.activeProfileId;

                const hh = String(window.location.hash || "");
                const isAuthFlow =
                  hh.startsWith("#/auth/callback") || hh.startsWith("#/auth/reset") || hh.startsWith("#/auth/forgot");

                if (!isAuthFlow && hasProfiles && hasActive) {
                  setRouteParams(null);
                  setTab("gameSelect");
                }
              }
            }
          }
        } else if (res?.status === "not_found") {
          const hasLocalData =
            (store?.profiles?.length || 0) > 0 ||
            !!(store as any)?.activeProfileId ||
            (store?.friends?.length || 0) > 0 ||
            (store?.history?.length || 0) > 0;

          if (hasLocalData) {
            const cloudSeed = sanitizeStoreForCloud(store);
            await onlineApi.pushStoreSnapshot(cloudSeed);
          } else {
            console.warn("[cloud] no snapshot yet + local empty -> skip seed (avoid wiping cloud by mistake)");
          }
        } else {
          console.warn("[cloud] hydrate error (skip seed)", res?.error || res);
        }
      } catch (e) {
        console.warn("[cloud] hydrate error", e);
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loading, online?.ready, online?.status, cloudHydrated, store]);

  // ============================================================
  // ✅ CLOUD PUSH (debounce)
  // ============================================================
  React.useEffect(() => {
    if (loading) return;
    if (!cloudHydrated) return;
    if (!online?.ready || online.status !== "signed_in") return;

    if (cloudPushTimerRef.current) {
      window.clearTimeout(cloudPushTimerRef.current);
      cloudPushTimerRef.current = null;
    }

    cloudPushTimerRef.current = window.setTimeout(async () => {
      try {
        const cloudSeed = sanitizeStoreForCloud(store);
        await onlineApi.pushStoreSnapshot(cloudSeed);
      } catch (e) {
        console.warn("[cloud] push snapshot error", e);
      }
    }, 250);

    return () => {
      if (cloudPushTimerRef.current) {
        window.clearTimeout(cloudPushTimerRef.current);
        cloudPushTimerRef.current = null;
      }
    };
  }, [store, loading, cloudHydrated, online?.ready, online?.status]);

  // ============================================================
  // ✅ DartSets bridge: localStorage dartSetsStore -> App store
  // ============================================================
  React.useEffect(() => {
    const sync = () => {
      try {
        const list = getAllDartSets();
        setStore((prev) => ({ ...(prev as any), dartSets: list } as any));
      } catch {}
    };
    sync();
    window.addEventListener("dc-dartsets-updated", sync as any);
    return () => window.removeEventListener("dc-dartsets-updated", sync as any);
  }, []);

  /* Save store each time it changes */
  React.useEffect(() => {
    if (!loading) {
      saveStore(store);
      try {
        window.dispatchEvent(new Event("dc-store-updated"));
      } catch {}
    }
  }, [store, loading]);

  /* Profiles mutator (✅ FIX: merge défensif) */
  function setProfiles(fn: (p: Profile[]) => Profile[]) {
    setStore((s) => {
      const next = {
        ...(s as any),
        profiles: mergeProfilesSafe((s as any)?.profiles ?? [], fn((s as any)?.profiles ?? [])),
      } as any;
      queueMicrotask(() => saveStore(next));
      return next;
    });
  }

  // ============================================================
  // ✅ FAST STATS HUB : rebuild cache stats au boot + après history update
  // ============================================================
  const __profilesRef = React.useRef<Profile[]>([]);
  React.useEffect(() => {
    __profilesRef.current = (store.profiles ?? []) as any;
  }, [store.profiles]);

  const __rebuildLockRef = React.useRef(false);

  React.useEffect(() => {
    const schedule = () => {
      if (__rebuildLockRef.current) return;
      __rebuildLockRef.current = true;

      const work = async () => {
        try {
          const profiles = (__profilesRef.current ?? []) as any[];
          await Promise.allSettled(profiles.map((p) => rebuildStatsForProfile(String(p?.id))));
        } catch (e) {
          console.warn("[stats] rebuild error:", e);
        } finally {
          __rebuildLockRef.current = false;
        }
      };

      try {
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === "function") ric(() => work(), { timeout: 2000 });
        else setTimeout(() => work(), 50);
      } catch {
        setTimeout(() => work(), 50);
      }
    };

    if (!loading) schedule();
    window.addEventListener("dc-history-updated", schedule);
    return () => window.removeEventListener("dc-history-updated", schedule);
  }, [loading]);

  /* --------------------------------------------
      pushHistory (FIN DE PARTIE)
  -------------------------------------------- */
  function pushHistory(m: MatchRecord) {
    const now = Date.now();
    const id = (m as any)?.id || (m as any)?.matchId || `x01-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "x01",
      status: "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players },
    };

    setStore((s) => {
      const list = [...((s as any).history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      const next = { ...(s as any), history: list } as any;
      queueMicrotask(() => saveStore(next));
      return next;
    });

    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    try {
      const raw = localStorage.getItem(LS_ONLINE_MATCHES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: saved.id,
        mode: saved.kind,
        createdAt: saved.createdAt,
        finishedAt: saved.updatedAt,
        players: saved.players,
        winnerId: saved.winnerId,
        summary: saved.summary ?? null,
        stats: (saved.payload as any)?.stats ?? null,
      });
      localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {}

    try {
      const supported = ["x01", "cricket", "killer", "shanghai"];
      if (supported.includes(saved.kind)) {
        onlineApi
          .uploadMatch({
            mode: saved.kind as any,
            payload: { summary: saved.summary ?? null, payload: saved.payload ?? null },
            isTraining: false,
            startedAt: saved.createdAt,
            finishedAt: saved.updatedAt,
          })
          .catch(() => {});
      }
    } catch {}

    go("statsHub", { tab: "history" });
  }


  /* --------------------------------------------
      pushPetanqueHistory (FIN DE PARTIE PÉTANQUE)
      - écrit dans store.history + History (IDB)
      - redirige vers stats Pétanque
  -------------------------------------------- */
  function pushPetanqueHistory(m: any) {
    const now = Date.now();
    const id = (m as any)?.id || (m as any)?.matchId || `petanque-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "petanque",
      sport: "petanque",
      status: "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players, summary, kind: (m as any)?.kind || "petanque", sport: "petanque" },
    };

    setStore((s) => {
      const list = [...((s as any).history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      const next = { ...(s as any), history: list } as any;
      queueMicrotask(() => saveStore(next));
      return next;
    });

    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    // ✅ Pétanque: pas d'upload match (pour l'instant) — uniquement stats locales
    go("petanque_stats_history", { focusMatchId: id });
  }

  /* --------------------------------------------
      pushBabyFootHistory (FIN DE MATCH BABY-FOOT)
      - écrit dans store.history + History (IDB)
      - redirige vers historique Baby-Foot
  -------------------------------------------- */
  function pushBabyFootHistory(m: any) {
    const now = Date.now();
    const id = (m as any)?.id || (m as any)?.matchId || `babyfoot-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "babyfoot",
      sport: "babyfoot",
      status: "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players, summary, kind: (m as any)?.kind || "babyfoot", sport: "babyfoot" },
    };

    setStore((s) => {
      const list = [...((s as any).history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      const next = { ...(s as any), history: list } as any;
      queueMicrotask(() => saveStore(next));
      return next;
    });

    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    go("babyfoot_stats_history", { focusMatchId: id });
  }

  /* --------------------------------------------
      pushPingPongHistory (FIN DE MATCH PING-PONG)
      - écrit dans store.history + History (IDB)
      - redirige vers historique Ping-Pong
  -------------------------------------------- */
  function pushPingPongHistory(m: any) {
    const now = Date.now();
    const id = (m as any)?.id || (m as any)?.matchId || `pingpong-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "pingpong",
      sport: "pingpong",
      status: "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players, summary, kind: (m as any)?.kind || "pingpong", sport: "pingpong" },
    };

    setStore((s) => {
      const list = [...((s as any).history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      const next = { ...(s as any), history: list } as any;
      queueMicrotask(() => saveStore(next));
      return next;
    });

    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    go("pingpong_stats_history", { focusMatchId: id });
  }

  const historyForUI = React.useMemo(
    () => (store.history || []).map((r: any) => withAvatars(r, store.profiles || [])),
    [store.history, store.profiles]
  );

  if (showSplash) {
    return <SplashScreen durationMs={6500} fadeOutMs={700} allowAudioOverflow={true} onFinish={() => setShowSplash(false)} />;
  }

  /* --------------------------------------------
        ROUTING SWITCH
  -------------------------------------------- */
  let page: React.ReactNode = null;

  if (loading) {
    page = (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Chargement...
      </div>
    );
  } else {
    switch (tab) {
      case "auth_callback":
        page = <AuthCallbackRoute go={go} />;
        break;

      case "auth_start":
        page = <AuthStart go={go} />;
        break;

      case "auth_v7_login":
        page = <AuthV7Login go={go} />;
        break;

      case "auth_v7_signup":
        page = <AuthV7Signup go={go} />;
        break;

      case "auth_reset":
        page = <AuthResetRoute go={go} />;
        break;

      case "account_start":
        page = (
          <AccountStart
            onLogin={() => go("auth_start")}
            onCreate={() => go("auth_start")}
            onForgot={() => go("auth_forgot")}
          />
        );
        break;

      case "auth_forgot":
        page = <AuthForgotRoute go={go} />;
        break;

      case "gameSelect":
        page = <GameSelect go={go} />;
        break;

      // ✅ HOME = SPORT-AWARE (runtime-safe)
      // IMPORTANT: on utilise activeSport (et non uniquement sportContext) pour éviter le bug "Settings -> Fléchettes -> Home Pétanque".
      case "home":
        page =
          activeSport === "petanque" ? (
            <PetanqueHome store={store} update={update} go={go} />
          ) : activeSport === "babyfoot" ? (
            <BabyFootHome store={store} update={update} go={go} />
          ) : activeSport === "pingpong" ? (
            <PingPongHome store={store} update={update} go={go} />
          ) : (
            <Home store={store} update={update} go={go} onConnect={() => go("profiles", { view: "me", autoCreate: true })} />
          );
        break;

      // ✅ GAMES = sport-aware (runtime-safe)
      case "games":
        page =
          activeSport === "petanque" ? (
            <PetanqueMenuGames go={go} />
          ) : activeSport === "babyfoot" ? (
            <BabyFootMenuGames go={go} />
          ) : activeSport === "pingpong" ? (
            <PingPongMenuGames go={go} />
          ) : (
            <Games setTab={(t: any, p?: any) => go(t, p)} />
          );
        break;

      // ✅ NEW (OBLIGATOIRE): Pétanque menu/config/play (snake_case)
      case "petanque_menu":
        page = <PetanqueMenuGames go={go} />;
        break;

      case "petanque_config":
        page = <PetanqueConfig go={go} params={routeParams} store={store} />;
        break;

      case "petanque_play":
        page = <PetanquePlay go={go} params={routeParams} store={store} onFinish={(m: any) => pushPetanqueHistory(m)} />;
        break;

      // ✅ NEW: Baby-Foot flow (LOCAL)
      case "babyfoot_menu":
        page = <BabyFootMenuGames go={go} />;
        break;

      case "babyfoot_config":
        page = <BabyFootConfig go={go} params={routeParams} store={store} />;
        break;

      case "babyfoot_play":
        page = <BabyFootPlay go={go} params={routeParams} onFinish={(m: any) => pushBabyFootHistory(m)} />;
        break;

      // ✅ NEW: Ping-Pong flow (LOCAL)
      case "pingpong_menu":
        page = <PingPongMenuGames go={go} />;
        break;

      case "pingpong_config":
        page = <PingPongConfig go={go} params={routeParams} store={store} />;
        break;

      case "pingpong_play":
        page = <PingPongPlay go={go} params={routeParams} onFinish={(m: any) => pushPingPongHistory(m)} />;
        break;

      // ✅ NEW: Teams Pétanque (CRUD local)
      case "petanque_teams":
        page = <PetanqueTeams go={go} params={routeParams} />;
        break;

      case "petanque_team_edit":
        page = <PetanqueTeamEdit go={go} params={routeParams} />;
        break;

      // (legacy / existing) — on laisse en place pour compat
      case "petanque.menu":
        page = <PetanqueMenuGames go={go} />;
        break;

      case "petanque.config":
        page = <PetanqueConfig go={go} params={routeParams} store={store} />;
        break;

      case "petanque.play":
        page = <PetanquePlay go={go} params={routeParams} store={store} onFinish={(m: any) => pushPetanqueHistory(m)} />;
        break;

      case "petanque_tournaments":
         page = <PetanqueTournamentsHome go={go} />;
         break;
        
      case "petanque_tournament_create":
         page = <PetanqueTournamentCreate go={go} />;
         break;
        
      case "petanque_tournament_view":
         page = <PetanqueTournamentView go={go} params={routeParams} />;
        break;
        
      case "petanque_tournament_match_score":
         page = <PetanqueTournamentMatchScore go={go} params={routeParams} />;
        break;  

      case "profiles":
        page = (
          <Profiles
            store={store}
            update={update}
            setProfiles={setProfiles}
            go={go}
            params={routeParams}
            autoCreate={!!routeParams?.autoCreate}
            sport={activeSport as any} // ✅ runtime-safe
          />
        );
        break;

      case "profiles_bots":
        page = <ProfilesBots store={store} go={go} />;
        break;

      case "friends":
        page = <FriendsPage store={store} update={update} go={go} />;
        break;

      case "online":
        page = <LobbyPick store={store as any} update={update as any} go={go as any} />;
        break;

      case "spectator":
        page = <SpectatorPage store={store} update={update} go={go} />;
        break;

      case "settings":
        page = <Settings go={go} />;
        break;

      // ✅ STATS (sport-aware) — même onglet BottomNav "stats"
      // Pétanque => PetanqueStatsShell (UI identique StatsShell + ONLINE/TRAINING masqués)
      case "stats":
        page =
          activeSport === "petanque" ? (
            <PetanqueStatsShell store={store} go={go} />
          ) : activeSport === "babyfoot" ? (
            <BabyFootStatsShell store={store} go={go} />
          ) : activeSport === "pingpong" ? (
            <PingPongStatsShell store={store} go={go} />
          ) : (
            <StatsShell store={store} go={go} />
          );
        break;

      // ✅ PÉTANQUE — STATS ROUTES (pages dédiées)
      case "petanque_stats_players":
        page = <PetanqueStatsPlayersPage store={store} go={go} params={routeParams} />;
        break;

      case "petanque_stats_teams":
        page = <PetanqueStatsTeamsPage store={store} go={go} params={routeParams} />;
        break;

      case "petanque_stats_leaderboards":
        page = <PetanqueStatsLeaderboardsPage store={store} go={go} params={routeParams} />;
        break;

      case "petanque_stats_matches":
        page = <PetanqueStatsMatchesPage store={store} go={go} params={routeParams} />;
        break;

      case "petanque_stats_history":
        page = <PetanqueStatsHistoryPage store={store} go={go} params={routeParams} />;
        break;

      // ✅ BABY-FOOT — STATS/HISTORY (LOCAL)
      case "babyfoot_stats_history":
        page = <BabyFootStatsHistoryPage store={store} go={go} params={routeParams} />;
        break;

      // ✅ PING-PONG — STATS/HISTORY (LOCAL)
      case "pingpong_stats_history":
        page = <PingPongStatsHistoryPage store={store} go={go} params={routeParams} />;
        break;

      case "statsHub":
        page = (
          <StatsHub
            go={go}
            tab={(routeParams?.tab as any) ?? "stats"}
            memHistory={historyForUI}
            mode={routeParams?.mode}
            initialPlayerId={routeParams?.initialPlayerId ?? null}
            initialStatsSubTab={routeParams?.initialStatsSubTab}
            playerId={routeParams?.playerId ?? null}
          />
        );
        break;

      case "stats_online":
        page = <StatsOnline />;
        break;

      case "cricket_stats":
        page = <StatsCricket profiles={store.profiles} activeProfileId={routeParams?.profileId ?? store.activeProfileId ?? null} />;
        break;

      case "statsDetail":
        page = <StatsDetailRoute store={store} go={go} params={routeParams} />;
        break;

      case "stats_leaderboards":
        page = <StatsLeaderboardsPage store={store} go={go} />;
        break;

      case "sync_center":
        page = <SyncCenter store={store} go={go} profileId={routeParams?.profileId ?? null} />;
        break;

        case "tournaments": {
          const isPetanque = String(activeSport || "").toLowerCase() === "petanque";
        
          page = (
            <TournamentsHome
              store={store}
              go={go}
              update={update}
              source="local"
              params={isPetanque ? { forceMode: "petanque" } : undefined}
            />
          );
          break;
        }

      case "tournament_create":
        page = <TournamentCreate store={store} go={go} params={routeParams} />;
        break;


      case "tournament_compose_teams":
        page = <TournamentComposeTeams store={store} go={go} params={routeParams} />;
        break;

      case "tournament_view": {
        const id = String(routeParams?.id ?? routeParams?.tournamentId ?? routeParams?.tid ?? "");
        page = <TournamentView store={store} go={go} id={id} />;
        break;
      }

      case "tournament_match_play": {
        const tournamentId = String(routeParams?.tournamentId ?? routeParams?.id ?? routeParams?.tid ?? "");
        const matchId = String(routeParams?.matchId ?? "");

        if (!tournamentId || !matchId) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("tournaments")}>← Retour</button>
              <p>Paramètres manquants (tournamentId/matchId).</p>
            </div>
          );
          break;
        }

        page = <TournamentMatchPlay store={store} go={go} params={{ tournamentId, matchId }} />;
        break;
      }

      case "tournament_roadmap":
        page = <TournamentRoadmap go={go} />;
        break;

      case "x01setup":
        page = (
          <X01Setup
            profiles={store.profiles}
            defaults={{ start: getX01DefaultStart(store), doubleOut: store.settings.doubleOut }}
            onCancel={() => go("games")}
            onStart={(opts) => {
              const players = store.settings.randomOrder ? opts.playerIds.slice().sort(() => Math.random() - 0.5) : opts.playerIds;
              setX01Config({ playerIds: players, start: opts.start, doubleOut: opts.doubleOut });
              go("x01", { resumeId: null, fresh: Date.now() });
            }}
          />
        );
        break;

      case "x01_online_setup": {
        const activeProfile = store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0] ?? null;
        const lobbyCode = routeParams?.lobbyCode ?? null;

        if (!activeProfile) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <p style={{ marginBottom: 8 }}>Aucun profil local n’est configuré pour lancer une manche online.</p>
              <button
                onClick={() => go("profiles", { view: "me", autoCreate: true })}
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 13,
                  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                  color: "#1b1508",
                  cursor: "pointer",
                }}
              >
                Créer / choisir un profil
              </button>
            </div>
          );
          break;
        }

        const storeForOnline: Store = { ...store, activeProfileId: activeProfile.id } as Store;
        page = <X01OnlineSetup store={storeForOnline} go={go} params={{ ...(routeParams || {}), lobbyCode }} />;
        break;
      }

      case "x01": {
        const isResume = !!routeParams?.resumeId;
        const isOnline = !!routeParams?.online;

        let effectiveConfig = x01Config;

        if (!effectiveConfig && isOnline && !isResume) {
          const activeProfile = store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0] ?? null;
          const startDefault = getX01DefaultStart(store);
          const start =
            startDefault === 301 || startDefault === 501 || startDefault === 701 || startDefault === 901 ? startDefault : 501;

          effectiveConfig = { start, doubleOut: store.settings.doubleOut, playerIds: activeProfile ? [activeProfile.id] : [] };
          setX01Config(effectiveConfig);
        }

        if (!effectiveConfig && !isResume) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <button onClick={() => go("x01setup")}>← Retour</button>
              <p>Configuration X01 manquante.</p>
            </div>
          );
          break;
        }

        const rawStart = effectiveConfig?.start ?? getX01DefaultStart(store);
        const startClamped: 301 | 501 | 701 | 901 = rawStart >= 901 ? 901 : (rawStart as any);

        const outMode = effectiveConfig?.doubleOut ? "double" : "simple";
        const playerIds = effectiveConfig?.playerIds ?? [];
        const freshToken = routeParams?.fresh ?? Date.now();
        const key = isResume ? `resume-${routeParams.resumeId}` : `fresh-${freshToken}`;

        page = (
          <X01Play
            key={key}
            profiles={store.profiles}
            playerIds={playerIds}
            start={startClamped}
            outMode={outMode}
            inMode="simple"
            params={isResume ? { resumeId: routeParams.resumeId } : undefined}
            onFinish={(m) => pushHistory(m)}
            onExit={() => (isOnline ? go("online") : go("x01setup"))}
          />
        );
        break;
      }

      case "x01_config_v3":
        page = (
          <X01ConfigV3
            profiles={store.profiles}
            onBack={() => go("games")}
            onStart={(cfg) => {
              setX01ConfigV3(cfg);
              go("x01_play_v3", { fresh: Date.now() });
            }}
            go={go}
          />
        );
        break;

      case "x01_play_v3": {
        if (!x01ConfigV3) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("x01_config_v3")}>← Retour</button>
              <p>Configuration X01 V3 manquante.</p>
            </div>
          );
          break;
        }

        const freshToken = routeParams?.fresh ?? Date.now();
        const key = `x01v3-${freshToken}`;

        page = (
          <X01PlayV3
            key={key}
            config={x01ConfigV3}
            onExit={() => go("x01_config_v3")}
            onReplayNewConfig={() => go("x01_config_v3")}
            onShowSummary={(matchId: string) => go("statsDetail", { matchId, showEnd: true })}
          />
        );
        break;
      }

      case "x01_end":
        page = <X01End go={go} params={routeParams} />;
        break;

      case "cricket":
        page = (
          <CricketPlay
            profiles={store.profiles ?? []}
            params={routeParams}
            onFinish={(m: any) => pushHistory(m)}
          />
        );
        break;

      case "killer":
      case "killer_config":
        page = <KillerConfig store={store} go={go} />;
        break;

      case "killer_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("killer_config")}>← Retour</button>
              <p>Configuration KILLER manquante.</p>
            </div>
          );
          break;
        }
        page = <KillerPlay store={store} go={go} config={cfg} onFinish={(m: any) => pushHistory(m)} />;
        break;
      }

      case "killer_summary":
        page = <KillerSummaryPage store={store} go={go} params={routeParams} />;
        break;

      case "five_lives_config":
        page = <FiveLivesConfig store={store} go={go} />;
        break;

      case "five_lives_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("five_lives_config")}>← Retour</button>
              <p>Configuration « Les 5 vies » manquante.</p>
            </div>
          );
          break;
        }
        page = <FiveLivesPlay store={store} go={go} config={cfg} onFinish={(m: any) => pushHistory(m)} />;
        break;
      }

      case "shanghai":
        page = <ShanghaiConfigPage store={store} go={go} />;
        break;

      case "shanghai_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("shanghai")}>← Retour</button>
              <p>Configuration SHANGHAI manquante.</p>
            </div>
          );
          break;
        }
        page = <ShanghaiPlay store={store} go={go} config={cfg} onFinish={(m: any) => pushHistory(m)} />;
        break;
      }

      case "shanghai_end":
        page = <ShanghaiEnd params={{ ...routeParams, go }} />;
        break;

      // ✅ NEW: WARFARE
      case "warfare_config":
        page = <WarfareConfigPage store={store} go={go} />;
        break;

      case "warfare_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("warfare_config")}>← Retour</button>
              <p>Configuration WARFARE manquante.</p>
            </div>
          );
          break;
        }
        page = <WarfarePlay go={go} config={cfg} />;
        break;
      }

      // ✅ NEW: BATTLE ROYALE (CONFIG)
      case "battle_royale":
        page = <BattleRoyaleConfigPage store={store} go={go} />;
        break;

      case "battle_royale_play": {
        const cfg = routeParams?.config;
        if (!cfg) { page = <div>Config manquante</div>; break; }
        page = <BattleRoyalePlay store={store} go={go} config={cfg} onFinish={(m) => pushHistory(m)} />;
        break;
      }

      case "training":
        page = <TrainingMenu go={go} />;
        break;

      case "training_x01":
        // ✅ NEW: menu de config avant de lancer Training X01
        page = <TrainingX01Config store={store} go={go} />;
        break;

      case "training_x01_play": {
        // config optionnelle (si absente, on garde le comportement legacy)
        page = <TrainingX01Play go={go} params={routeParams} />;
        break;
      }

      case "training_stats":
        page = <RedirectToStatsTraining go={go} />;
        break;

      case "training_clock":
        page = <TrainingClock profiles={store.profiles ?? []} activeProfileId={store.activeProfileId ?? null} go={go} />;
        break;

      case "training_mode": {
        const modeId: string | undefined = routeParams?.modeId || routeParams?.gameId;
        if (!modeId) {
          page = <div style={{ padding: 16 }}>Mode Training manquant</div>;
          break;
        }
        page = <TrainingModePage modeId={modeId} profiles={store.profiles ?? []} onExit={() => go("training")} />;
        break;
      }

      case "avatar": {
        const botId: string | undefined = routeParams?.botId;
        const profileIdFromParams: string | undefined = routeParams?.profileId;
        const backTo: Tab = (routeParams?.from as Tab) || "profiles";
        const isBotMode = !!routeParams?.isBot;

        // =========================
        // BOT AVATAR (LOCAL ONLY)
        // =========================
        if (botId) {
          const bots = loadBotsLS();
          const targetBot = bots.find((b) => b.id === botId) ?? null;

          async function handleSaveAvatarBot({ pngDataUrl, name }: { pngDataUrl: string; name: string }) {
            if (!targetBot) return go(backTo);

            const next = bots.slice();
            const idx = next.findIndex((b) => b.id === targetBot.id);

            const updated: BotLS = {
              ...targetBot,
              name: name?.trim() || targetBot.name,
              avatarDataUrl: pngDataUrl,
            };

            if (idx >= 0) next[idx] = updated;
            else next.push(updated);

            saveBotsLS(next);
            go(backTo);
          }

          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
                ← Retour
              </button>
              <AvatarCreator size={512} defaultName={targetBot?.name || ""} onSave={handleSaveAvatarBot} isBotMode={true} />
            </div>
          );
          break;
        }

        // =========================
        // PROFILE AVATAR (SUPABASE)
        // =========================
        const targetProfile = store.profiles.find((p) => p.id === (profileIdFromParams || store.activeProfileId)) ?? null;

        async function handleSaveAvatarProfile({ pngDataUrl, name }: { pngDataUrl: string; name: string }) {
          if (!targetProfile) return;

          const trimmedName = (name || "").trim();
          const now = Date.now();

          const bucket = "avatars";
          const uid = String((online as any)?.session?.user?.id || (online as any)?.user?.id || "");
          const objectPath = `${uid || targetProfile.id}/avatar.png`;

          try {
            const { publicUrl } = await uploadAvatarToSupabase({ bucket, objectPath, pngDataUrl });

            setProfiles((list) =>
              list.map((p) =>
                p.id === targetProfile.id
                  ? {
                      ...p,
                      name: trimmedName || p.name,
                      avatarUrl: publicUrl,
                      avatarUpdatedAt: now,
                      avatarDataUrl: null,
                    }
                  : p
              )
            );

            try {
              if ((online as any)?.status === "signed_in") {
                await onlineApi.updateProfile({
                  avatarUrl: publicUrl,
                  displayName: trimmedName || targetProfile.name || undefined,
                });
                try {
                  await (online as any)?.refresh?.();
                } catch {}
              }
            } catch (e) {
              console.warn("[AvatarUpload] online updateProfile failed", e);
            }

            go(backTo);
          } catch (e) {
            console.error("[AvatarUpload] upload failed -> fallback local avatarDataUrl", e);

            setProfiles((list) =>
              list.map((p) => (p.id === targetProfile.id ? { ...p, name: trimmedName || p.name, avatarDataUrl: pngDataUrl } : p))
            );

            go(backTo);
          }
        }

        page = (
          <div style={{ padding: 16 }}>
            <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
              ← Retour
            </button>
            <AvatarCreator size={512} defaultName={targetProfile?.name || ""} onSave={handleSaveAvatarProfile} isBotMode={isBotMode} />
          </div>
        );
        break;
      }



      // ============================================================
      // ✅ NEW: Dedicated Darts modes (Config + Play)
      // - Chaque page reçoit setTab=go + params=routeParams
      // - Les Config poussent vers "<mode>_play" avec { config }
      // ============================================================
      case "halve_it_config":
        page = <DefiConfig setTab={go} params={{ ...routeParams, modeId: "halve_it" }} />;
        break;
      case "halve_it_play":
        page = <DefiPlay setTab={go} params={{ ...routeParams, modeId: "halve_it" }} />;
        break;

      case "count_up_config":
        page = <DefiConfig setTab={go} params={{ ...routeParams, modeId: "count_up" }} />;
        break;
      case "count_up_play":
        page = <DefiPlay setTab={go} params={{ ...routeParams, modeId: "count_up" }} />;
        break;

      case "prisoner_config":
        page = <PrisonerConfig setTab={go} params={routeParams} />;
        break;
      case "prisoner_play":
        page = <PrisonerPlay setTab={go} params={routeParams} />;
        break;

      case "super_bull_config":
        page = <SuperBullConfig setTab={go} params={routeParams} />;
        break;
      case "super_bull_play":
        page = <SuperBullPlay setTab={go} params={routeParams} />;
        break;

      case "shooter_config":
        page = <ShooterConfig setTab={go} params={routeParams} />;
        break;
      case "shooter_play":
        page = <ShooterPlay setTab={go} params={routeParams} />;
        break;

      case "tic_tac_toe_config":
        page = <TicTacToeConfig setTab={go} params={routeParams} />;
        break;
      case "tic_tac_toe_play":
        page = <TicTacToePlay setTab={go} params={routeParams} />;
        break;

      case "knockout_config":
        page = <KnockoutConfig setTab={go} params={routeParams} />;
        break;
      case "knockout_play":
        page = <KnockoutPlay setTab={go} params={routeParams} />;
        break;

      case "bobs_27_config":
        page = <Bobs27Config setTab={go} params={routeParams} />;
        break;
      case "bobs_27_play":
        page = <Bobs27Play setTab={go} params={routeParams} />;
        break;

      case "scram_config":
        page = <ScramConfig store={store} go={go} setTab={go} params={routeParams} />;
        break;
      case "scram_play":
        page = <ScramPlay setTab={go} params={routeParams} />;
        break;

      case "golf_config":
        page = <GolfConfig store={store} go={go} setTab={go} params={routeParams} />;
        break;
      case "golf_play":
        page = <GolfPlay setTab={go} params={routeParams} />;
        break;

      case "baseball_config":
        page = <BaseballConfig setTab={go} params={routeParams} />;
        break;
      case "baseball_play":
        page = <BaseballPlay setTab={go} params={routeParams} />;
        break;

      case "game_170_config":
        page = <Game170Config setTab={go} params={routeParams} />;
        break;
      case "game_170_play":
        page = <Game170Play setTab={go} params={routeParams} />;
        break;

      case "football_config":
        page = <FootballConfig setTab={go} params={routeParams} />;
        break;
      case "football_play":
        page = <FootballPlay setTab={go} params={routeParams} />;
        break;

      case "batard_config":
        page = <BatardConfig setTab={go} params={routeParams} />;
        break;
      case "batard_play":
        page = <BatardPlay setTab={go} params={routeParams} />;
        break;

      case "fun_gages_config":
        page = <FunGagesConfig setTab={go} params={routeParams} />;
        break;
      case "fun_gages_play":
        page = <FunGagesPlay setTab={go} params={routeParams} />;
        break;

      case "capital_config":
        page = <CapitalConfig setTab={go} params={routeParams} />;
        break;
      case "capital_play":
        page = <CapitalPlay setTab={go} params={routeParams} />;
        break;

      case "happy_mille_config":
        page = <HappyMilleConfig setTab={go} params={routeParams} />;
        break;
      case "happy_mille_play":
        page = <HappyMillePlay setTab={go} params={routeParams} />;
        break;

      case "rugby_config":
        page = <RugbyConfig setTab={go} params={routeParams} />;
        break;
      case "rugby_play":
        page = <RugbyPlay setTab={go} params={routeParams} />;
        break;

      case "departements_config":
        page = <DepartementsConfig store={store} go={go} setTab={go} params={routeParams} />;
        break;
      case "departements_play":
        page = <DepartementsPlay store={store} go={go} setTab={go} params={routeParams} />;
        break;

      case "enculette_config":
        page = <EnculetteConfig setTab={go} params={routeParams} />;
        break;
      case "enculette_play":
        page = <EnculettePlay setTab={go} params={routeParams} />;
        break;

      case "darts_mode_config": {
        const gameId = routeParams?.gameId;
        page = <DartsModeConfig store={store} go={go} gameId={gameId} />;
        break;
      }

      case "darts_mode_play": {
        const gameId = routeParams?.gameId;
        const cfg = routeParams?.config;
        page = <DartsModePlay go={go} gameId={gameId} config={cfg} />;
        break;
      }

      case "mode_not_ready":
        page = <ModeNotReady go={go} params={routeParams} />;
        break;

      default:
        page = <GameSelect go={go} />;
    }
  }

  // ============================================================
  // ✅ FULLSCREEN (BottomNav MASQUÉE) — DARTS GAMEPLAYS
  // Objectif: libérer l'espace (keypad) pendant les parties.
  // ============================================================
  const HIDE_BOTTOM_NAV_TABS = new Set<Tab>([
    // Hub
    "gameSelect",

    // Darts (play)
    "x01",
    "x01_play_v3",
    "cricket",
    "killer_play",
    "shanghai_play",
    "warfare_play",
    "battle_royale_play",
    "five_lives_play",
    "training_x01_play",
    "training_clock",

    // ✅ NEW: Darts modes (play) — plein écran
    "halve_it_play",
    "count_up_play",
    "prisoner_play",
    "super_bull_play",
    "shooter_play",
    "tic_tac_toe_play",
    "knockout_play",
    "bobs_27_play",
    "scram_play",
    "baseball_play",
    "game_170_play",
    "football_play",
    "batard_play",
    "capital_play",
    "happy_mille_play",
    "rugby_play",
    "departements_play",
    "enculette_play",

    // Tournois: match en cours (plein écran)
    "tournament_match_play",
  ]);

  return (
    <CrashCatcher>
      <>
        <MobileErrorOverlay />

        <div className="container" style={{ paddingBottom: 88 }}>
          <AppGate go={go} tab={tab}>
            {page}
          </AppGate>
        </div>

        {/* ✅ BottomNav masquée sur gameSelect + tous les gameplays plein écran */}
        {!HIDE_BOTTOM_NAV_TABS.has(tab) && <BottomNav value={tab as any} onChange={(k: any) => go(k)} />}

        <SWUpdateBanner />
      </>
    </CrashCatcher>
  );
}

/* --------------------------------------------
   🔒 APP GATE — NE BLOQUE QUE LES PAGES ONLINE "post-login"
   ✅ V7: compte unique -> useAuthOnline()
-------------------------------------------- */
function AppGate({ go, tab, children }: { go: (t: any, p?: any) => void; tab: any; children: React.ReactNode }) {
  const { status, ready } = useAuthOnline();

  // pages qui nécessitent une session Supabase active
  const needsSession = tab === "stats_online" || tab === "x01_online_setup" || tab === "online";

  // pendant les flows auth, on ne gate pas
  const isAuthFlow =
  tab === "auth_reset" ||
  tab === "auth_callback" ||
  tab === "auth_forgot" ||
  tab === "auth_start" ||
  tab === "account_start" ||
  tab === "auth_v7_login" ||
  tab === "auth_v7_signup";

  if (!ready) {
    return (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Vérification de la session…
      </div>
    );
  }

  React.useEffect(() => {
    if (!isAuthFlow && needsSession && status !== "signed_in") {
      go("auth_start");
    }
  }, [isAuthFlow, needsSession, status, go]);

  if (!isAuthFlow && needsSession && status !== "signed_in") {
    return (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Redirection vers la connexion…
      </div>
    );
  }

  return <>{children}</>;
}

/* ---------- ROOT PROVIDERS ---------- */
export default function AppRoot() {
  return (
    <ThemeProvider>
      <DevModeProvider>
        <LangProvider>
          <StoreProvider>
            <AudioProvider>
              <AuthOnlineProvider>
                <SportProvider>
                  {/* ✅ player audio global persistant (rien à voir avec SFX UI) */}
                  <audio id="dc-splash-audio" src={SplashJingle} preload="auto" style={{ display: "none" }} />
                  <App />
                </SportProvider>
              </AuthOnlineProvider>
            </AudioProvider>
          </StoreProvider>
        </LangProvider>
      </DevModeProvider>
    </ThemeProvider>
  );
}