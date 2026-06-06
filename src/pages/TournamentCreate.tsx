// @ts-nocheck
// ============================================
// src/pages/TournamentCreate.tsx
// Tournois (LOCAL) — Create (UI refacto v1) — BIG TOURNAMENTS (NO LIMITS)
//
// ✅ Adapté PÉTANQUE : options de création (Simple / Doublette / Triplette / Quadrette)
// - forceMode=petanque => mode verrouillé "petanque"
// - Ajout section "Pétanque — Composition" (taille d’équipe)
// - Règle de sélection : nb joueurs doit être multiple de teamSize et >= teamSize*2
// - ❌ PÉTANQUE = AUCUN BOT (UI + logique) + ❌ Auto-fill bots
// - Format tournoi PÉTANQUE : KO / Championnat / Poules+KO (pas de double élimination, pas de best-of)
// - Bracket KO en PÉTANQUE raisonné en "équipes" (Auto pow2 équipes ou Manuel nb équipes)
//
// ✅ FIX (ENGINE V2):
// - engine V2 attend `viewKind` (et repechage optionnel) -> PASSÉS à createTournamentDraft
//
// ✅ FIX IMPORTANT (DOUBLON BRACKET):
// - stages conformes à Tournaments.tsx V2 (ids: ko/rr/w/l/gf/rep + role)
// - évite KO “se” qui provoque souvent un affichage double dans TournamentView
// ============================================

import React from "react";
import type { Store } from "../lib/types";

// ✅ ENGINE + STORE (comme Tournaments.tsx)
import type { Tournament } from "../lib/tournaments/types";
import { createTournamentDraft, buildInitialMatches } from "../lib/tournaments/engine";
import { upsertTournamentLocal, upsertMatchesForTournamentLocal } from "../lib/tournaments/storeLocal";
import { saveOnlineCompetition } from "../lib/tournaments/onlineStore";

// ✅ Avatar + StarRing (comme X01Config)
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { loadBots as loadStoredBots } from "../lib/bots";
import tickerCompetitions from "../assets/tickers/ticker_competitions.png";
import leagueWatermark from "../assets/ui/competition_league_watermark.png";
import tournamentWatermark from "../assets/ui/competition_tournament_watermark.png";
import botTeamEliteLogo from "../assets/ui/competition_bot_team_elite.webp";
import botTeamProLogo from "../assets/ui/competition_bot_team_pro.webp";
import botTeamChallengerLogo from "../assets/ui/competition_bot_team_challenger.webp";
import botTeamMixLogo from "../assets/ui/competition_bot_team_mix.webp";
import botTeamRisingLogo from "../assets/ui/competition_bot_team_rising.webp";
import { BABYFOOT_LEAGUE_BADGES } from "../lib/leagueBadgeAssets";
import { loadTeamsBySport, createTeam as createStoredTeam, upsertTeam as upsertStoredTeam, fileToDataUrl as fileToCompressedTeamLogoDataUrl } from "../lib/petanqueTeamsStore";

// ✅ AVATARS BOTS PRO (assets existants) — (utilisés hors Pétanque)
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";
import { BOT_PRO_TEAMS } from "../lib/botTeams";

// ⚠️ Si tu as aussi "the-nuke.png" dans le dossier, décommente :
// import avatarTheNuke from "../assets/avatars/bots-pro/the-nuke.png";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any; // ✅ IMPORTANT: route params (ex: { forceMode: "petanque" })
};

type Mode = "x01" | "cricket" | "killer" | "shanghai" | "petanque" | "babyfoot" | "pingpong" | "molkky" | "dicegame" | "football" | "rugby" | "basket" | "badminton" | "tennis";
type TourFormat = "single_ko" | "double_ko" | "round_robin" | "groups_ko";
type BestOf = 1 | 3 | 5 | 7;

type PetanqueTeamSize = 1 | 2 | 3 | 4;

const BOT_TEAM_LOGOS = [botTeamEliteLogo, botTeamProLogo, botTeamChallengerLogo, botTeamMixLogo];

const COVER_PRESETS_PER_PAGE = 6;

const COMMON_COVER_PRESETS = [
  { id: "common-01", label: "Commun 01", src: new URL("../assets/covers/common/common_cover_01.webp", import.meta.url).href },
  { id: "common-02", label: "Commun 02", src: new URL("../assets/covers/common/common_cover_02.webp", import.meta.url).href },
  { id: "common-03", label: "Commun 03", src: new URL("../assets/covers/common/common_cover_03.webp", import.meta.url).href },
  { id: "common-04", label: "Commun 04", src: new URL("../assets/covers/common/common_cover_04.webp", import.meta.url).href },
  { id: "common-05", label: "Commun 05", src: new URL("../assets/covers/common/common_cover_05.webp", import.meta.url).href },
  { id: "common-06", label: "Commun 06", src: new URL("../assets/covers/common/common_cover_06.webp", import.meta.url).href },
  { id: "common-07", label: "Commun 07", src: new URL("../assets/covers/common/common_cover_07.webp", import.meta.url).href },
  { id: "common-08", label: "Commun 08", src: new URL("../assets/covers/common/common_cover_08.webp", import.meta.url).href },
  { id: "common-09", label: "Commun 09", src: new URL("../assets/covers/common/common_cover_09.webp", import.meta.url).href },
  { id: "common-10", label: "Commun 10", src: new URL("../assets/covers/common/common_cover_10.webp", import.meta.url).href },
  { id: "common-11", label: "Commun 11", src: new URL("../assets/covers/common/common_cover_11.webp", import.meta.url).href },
  { id: "common-12", label: "Commun 12", src: new URL("../assets/covers/common/common_cover_12.webp", import.meta.url).href },
  { id: "common-13", label: "Commun 13", src: new URL("../assets/covers/common/common_cover_13.webp", import.meta.url).href },
  { id: "common-14", label: "Commun 14", src: new URL("../assets/covers/common/common_cover_14.webp", import.meta.url).href },
  { id: "common-15", label: "Commun 15", src: new URL("../assets/covers/common/common_cover_15.webp", import.meta.url).href },
];

const DARTS_COVER_PRESETS = [
  { id: "darts-01", label: "Fléchettes 01", src: new URL("../assets/covers/darts/darts_cover_01.webp", import.meta.url).href },
  { id: "darts-02", label: "Fléchettes 02", src: new URL("../assets/covers/darts/darts_cover_02.webp", import.meta.url).href },
  { id: "darts-03", label: "Fléchettes 03", src: new URL("../assets/covers/darts/darts_cover_03.webp", import.meta.url).href },
  { id: "darts-04", label: "Fléchettes 04", src: new URL("../assets/covers/darts/darts_cover_04.webp", import.meta.url).href },
  { id: "darts-05", label: "Fléchettes 05", src: new URL("../assets/covers/darts/darts_cover_05.webp", import.meta.url).href },
  { id: "darts-06", label: "Fléchettes 06", src: new URL("../assets/covers/darts/darts_cover_06.webp", import.meta.url).href },
  { id: "darts-07", label: "Fléchettes 07", src: new URL("../assets/covers/darts/darts_cover_07.webp", import.meta.url).href },
  { id: "darts-08", label: "Fléchettes 08", src: new URL("../assets/covers/darts/darts_cover_08.webp", import.meta.url).href },
  { id: "darts-09", label: "Fléchettes 09", src: new URL("../assets/covers/darts/darts_cover_09.webp", import.meta.url).href },
  { id: "darts-10", label: "Fléchettes 10", src: new URL("../assets/covers/darts/darts_cover_10.webp", import.meta.url).href },
  { id: "darts-11", label: "Fléchettes 11", src: new URL("../assets/covers/darts/darts_cover_11.webp", import.meta.url).href },
  { id: "darts-12", label: "Fléchettes 12", src: new URL("../assets/covers/darts/darts_cover_12.webp", import.meta.url).href },
  { id: "darts-13", label: "Fléchettes 13", src: new URL("../assets/covers/darts/darts_cover_13.webp", import.meta.url).href },
  { id: "darts-14", label: "Fléchettes 14", src: new URL("../assets/covers/darts/darts_cover_14.webp", import.meta.url).href },
  { id: "darts-15", label: "Fléchettes 15", src: new URL("../assets/covers/darts/darts_cover_15.webp", import.meta.url).href },
  { id: "darts-16", label: "Fléchettes 16", src: new URL("../assets/covers/darts/darts_cover_16.webp", import.meta.url).href },
  { id: "darts-17", label: "Fléchettes 17", src: new URL("../assets/covers/darts/darts_cover_17.webp", import.meta.url).href },
  { id: "darts-18", label: "Fléchettes 18", src: new URL("../assets/covers/darts/darts_cover_18.webp", import.meta.url).href },
  { id: "darts-19", label: "Fléchettes 19", src: new URL("../assets/covers/darts/darts_cover_19.webp", import.meta.url).href },
  { id: "darts-20", label: "Fléchettes 20", src: new URL("../assets/covers/darts/darts_cover_20.webp", import.meta.url).href },
  { id: "darts-21", label: "Fléchettes 21", src: new URL("../assets/covers/darts/darts_cover_21.webp", import.meta.url).href },
  { id: "darts-22", label: "Fléchettes 22", src: new URL("../assets/covers/darts/darts_cover_22.webp", import.meta.url).href },
  { id: "darts-23", label: "Fléchettes 23", src: new URL("../assets/covers/darts/darts_cover_23.webp", import.meta.url).href },
  { id: "darts-24", label: "Fléchettes 24", src: new URL("../assets/covers/darts/darts_cover_24.webp", import.meta.url).href },
  { id: "darts-25", label: "Fléchettes 25", src: new URL("../assets/covers/darts/darts_cover_25.webp", import.meta.url).href },
  { id: "darts-26", label: "Fléchettes 26", src: new URL("../assets/covers/darts/darts_cover_26.webp", import.meta.url).href },
  { id: "darts-27", label: "Fléchettes 27", src: new URL("../assets/covers/darts/darts_cover_27.webp", import.meta.url).href },
  { id: "darts-28", label: "Fléchettes 28", src: new URL("../assets/covers/darts/darts_cover_28.webp", import.meta.url).href },
  { id: "darts-29", label: "Fléchettes 29", src: new URL("../assets/covers/darts/darts_cover_29.webp", import.meta.url).href },
  { id: "darts-30", label: "Fléchettes 30", src: new URL("../assets/covers/darts/darts_cover_30.webp", import.meta.url).href },
  { id: "darts-31", label: "Fléchettes 31", src: new URL("../assets/covers/darts/darts_cover_31.webp", import.meta.url).href },
  { id: "darts-32", label: "Fléchettes 32", src: new URL("../assets/covers/darts/darts_cover_32.webp", import.meta.url).href },
  { id: "darts-33", label: "Fléchettes 33", src: new URL("../assets/covers/darts/darts_cover_33.webp", import.meta.url).href },
  { id: "darts-34", label: "Fléchettes 34", src: new URL("../assets/covers/darts/darts_cover_34.webp", import.meta.url).href },
  { id: "darts-35", label: "Fléchettes 35", src: new URL("../assets/covers/darts/darts_cover_35.webp", import.meta.url).href },
  { id: "darts-36", label: "Fléchettes 36", src: new URL("../assets/covers/darts/darts_cover_36.webp", import.meta.url).href },
  { id: "darts-37", label: "Fléchettes 37", src: new URL("../assets/covers/darts/darts_cover_37.webp", import.meta.url).href },
  { id: "darts-38", label: "Fléchettes 38", src: new URL("../assets/covers/darts/darts_cover_38.webp", import.meta.url).href },
  { id: "darts-39", label: "Fléchettes 39", src: new URL("../assets/covers/darts/darts_cover_39.webp", import.meta.url).href },
];

const PETANQUE_COVER_PRESETS = [
  { id: "petanque-01", label: "Pétanque 01", src: new URL("../assets/covers/petanque/petanque_cover_01.webp", import.meta.url).href },
  { id: "petanque-02", label: "Pétanque 02", src: new URL("../assets/covers/petanque/petanque_cover_02.webp", import.meta.url).href },
  { id: "petanque-03", label: "Pétanque 03", src: new URL("../assets/covers/petanque/petanque_cover_03.webp", import.meta.url).href },
  { id: "petanque-04", label: "Pétanque 04", src: new URL("../assets/covers/petanque/petanque_cover_04.webp", import.meta.url).href },
  { id: "petanque-05", label: "Pétanque 05", src: new URL("../assets/covers/petanque/petanque_cover_05.webp", import.meta.url).href },
  { id: "petanque-06", label: "Pétanque 06", src: new URL("../assets/covers/petanque/petanque_cover_06.webp", import.meta.url).href },
  { id: "petanque-07", label: "Pétanque 07", src: new URL("../assets/covers/petanque/petanque_cover_07.webp", import.meta.url).href },
  { id: "petanque-08", label: "Pétanque 08", src: new URL("../assets/covers/petanque/petanque_cover_08.webp", import.meta.url).href },
  { id: "petanque-09", label: "Pétanque 09", src: new URL("../assets/covers/petanque/petanque_cover_09.webp", import.meta.url).href },
  { id: "petanque-10", label: "Pétanque 10", src: new URL("../assets/covers/petanque/petanque_cover_10.webp", import.meta.url).href },
  { id: "petanque-11", label: "Pétanque 11", src: new URL("../assets/covers/petanque/petanque_cover_11.webp", import.meta.url).href },
  { id: "petanque-12", label: "Pétanque 12", src: new URL("../assets/covers/petanque/petanque_cover_12.webp", import.meta.url).href },
];

const BABYFOOT_COVER_PRESETS = [
  { id: "babyfoot-01", label: "Baby-foot 01", src: new URL("../assets/covers/babyfoot/babyfoot_cover_01.webp", import.meta.url).href },
  { id: "babyfoot-02", label: "Baby-foot 02", src: new URL("../assets/covers/babyfoot/babyfoot_cover_02.webp", import.meta.url).href },
  { id: "babyfoot-03", label: "Baby-foot 03", src: new URL("../assets/covers/babyfoot/babyfoot_cover_03.webp", import.meta.url).href },
  { id: "babyfoot-04", label: "Baby-foot 04", src: new URL("../assets/covers/babyfoot/babyfoot_cover_04.webp", import.meta.url).href },
  { id: "babyfoot-05", label: "Baby-foot 05", src: new URL("../assets/covers/babyfoot/babyfoot_cover_05.webp", import.meta.url).href },
  { id: "babyfoot-06", label: "Baby-foot 06", src: new URL("../assets/covers/babyfoot/babyfoot_cover_06.webp", import.meta.url).href },
  { id: "babyfoot-07", label: "Baby-foot 07", src: new URL("../assets/covers/babyfoot/babyfoot_cover_07.webp", import.meta.url).href },
  { id: "babyfoot-08", label: "Baby-foot 08", src: new URL("../assets/covers/babyfoot/babyfoot_cover_08.webp", import.meta.url).href },
  { id: "babyfoot-09", label: "Baby-foot 09", src: new URL("../assets/covers/babyfoot/babyfoot_cover_09.webp", import.meta.url).href },
  { id: "babyfoot-10", label: "Baby-foot 10", src: new URL("../assets/covers/babyfoot/babyfoot_cover_10.webp", import.meta.url).href },
  { id: "babyfoot-11", label: "Baby-foot 11", src: new URL("../assets/covers/babyfoot/babyfoot_cover_11.webp", import.meta.url).href },
  { id: "babyfoot-12", label: "Baby-foot 12", src: new URL("../assets/covers/babyfoot/babyfoot_cover_12.webp", import.meta.url).href },
];

const PINGPONG_COVER_PRESETS = [
  { id: "pingpong-01", label: "Ping-Pong 01", src: new URL("../assets/covers/pingpong/pingpong_cover_01.webp", import.meta.url).href },
  { id: "pingpong-02", label: "Ping-Pong 02", src: new URL("../assets/covers/pingpong/pingpong_cover_02.webp", import.meta.url).href },
  { id: "pingpong-03", label: "Ping-Pong 03", src: new URL("../assets/covers/pingpong/pingpong_cover_03.webp", import.meta.url).href },
  { id: "pingpong-04", label: "Ping-Pong 04", src: new URL("../assets/covers/pingpong/pingpong_cover_04.webp", import.meta.url).href },
  { id: "pingpong-05", label: "Ping-Pong 05", src: new URL("../assets/covers/pingpong/pingpong_cover_05.webp", import.meta.url).href },
  { id: "pingpong-06", label: "Ping-Pong 06", src: new URL("../assets/covers/pingpong/pingpong_cover_06.webp", import.meta.url).href },
  { id: "pingpong-07", label: "Ping-Pong 07", src: new URL("../assets/covers/pingpong/pingpong_cover_07.webp", import.meta.url).href },
  { id: "pingpong-08", label: "Ping-Pong 08", src: new URL("../assets/covers/pingpong/pingpong_cover_08.webp", import.meta.url).href },
  { id: "pingpong-09", label: "Ping-Pong 09", src: new URL("../assets/covers/pingpong/pingpong_cover_09.webp", import.meta.url).href },
  { id: "pingpong-10", label: "Ping-Pong 10", src: new URL("../assets/covers/pingpong/pingpong_cover_10.webp", import.meta.url).href },
];

const MOLKKY_COVER_PRESETS = [
  { id: "molkky-01", label: "Mölkky 01", src: new URL("../assets/covers/molkky/molkky_cover_01.webp", import.meta.url).href },
  { id: "molkky-02", label: "Mölkky 02", src: new URL("../assets/covers/molkky/molkky_cover_02.webp", import.meta.url).href },
  { id: "molkky-03", label: "Mölkky 03", src: new URL("../assets/covers/molkky/molkky_cover_03.webp", import.meta.url).href },
  { id: "molkky-04", label: "Mölkky 04", src: new URL("../assets/covers/molkky/molkky_cover_04.webp", import.meta.url).href },
  { id: "molkky-05", label: "Mölkky 05", src: new URL("../assets/covers/molkky/molkky_cover_05.webp", import.meta.url).href },
  { id: "molkky-06", label: "Mölkky 06", src: new URL("../assets/covers/molkky/molkky_cover_06.webp", import.meta.url).href },
  { id: "molkky-07", label: "Mölkky 07", src: new URL("../assets/covers/molkky/molkky_cover_07.webp", import.meta.url).href },
  { id: "molkky-08", label: "Mölkky 08", src: new URL("../assets/covers/molkky/molkky_cover_08.webp", import.meta.url).href },
  { id: "molkky-09", label: "Mölkky 09", src: new URL("../assets/covers/molkky/molkky_cover_09.webp", import.meta.url).href },
  { id: "molkky-10", label: "Mölkky 10", src: new URL("../assets/covers/molkky/molkky_cover_10.webp", import.meta.url).href },
];

const FOOTBALL_COVER_PRESETS = [
  { id: "football-01", label: "Football 01", src: new URL("../assets/covers/football/football_cover_01.webp", import.meta.url).href },
  { id: "football-02", label: "Football 02", src: new URL("../assets/covers/football/football_cover_02.webp", import.meta.url).href },
  { id: "football-03", label: "Football 03", src: new URL("../assets/covers/football/football_cover_03.webp", import.meta.url).href },
  { id: "football-04", label: "Football 04", src: new URL("../assets/covers/football/football_cover_04.webp", import.meta.url).href },
  { id: "football-05", label: "Football 05", src: new URL("../assets/covers/football/football_cover_05.webp", import.meta.url).href },
  { id: "football-06", label: "Football 06", src: new URL("../assets/covers/football/football_cover_06.webp", import.meta.url).href },
  { id: "football-07", label: "Football 07", src: new URL("../assets/covers/football/football_cover_07.webp", import.meta.url).href },
  { id: "football-08", label: "Football 08", src: new URL("../assets/covers/football/football_cover_08.webp", import.meta.url).href },
];

const DICEGAME_COVER_PRESETS = [
  { id: "dicegame-01", label: "Dés 01", src: new URL("../assets/covers/dicegame/dicegame_cover_01.webp", import.meta.url).href },
  { id: "dicegame-02", label: "Dés 02", src: new URL("../assets/covers/dicegame/dicegame_cover_02.webp", import.meta.url).href },
  { id: "dicegame-03", label: "Dés 03", src: new URL("../assets/covers/dicegame/dicegame_cover_03.webp", import.meta.url).href },
  { id: "dicegame-04", label: "Dés 04", src: new URL("../assets/covers/dicegame/dicegame_cover_04.webp", import.meta.url).href },
  { id: "dicegame-05", label: "Dés 05", src: new URL("../assets/covers/dicegame/dicegame_cover_05.webp", import.meta.url).href },
  { id: "dicegame-06", label: "Dés 06", src: new URL("../assets/covers/dicegame/dicegame_cover_06.webp", import.meta.url).href },
  { id: "dicegame-07", label: "Dés 07", src: new URL("../assets/covers/dicegame/dicegame_cover_07.webp", import.meta.url).href },
  { id: "dicegame-08", label: "Dés 08", src: new URL("../assets/covers/dicegame/dicegame_cover_08.webp", import.meta.url).href },
];

const BADMINTON_COVER_PRESETS = [
  { id: "badminton-01", label: "Badminton 01", src: new URL("../assets/covers/badminton/badminton_cover_01.webp", import.meta.url).href },
  { id: "badminton-02", label: "Badminton 02", src: new URL("../assets/covers/badminton/badminton_cover_02.webp", import.meta.url).href },
  { id: "badminton-03", label: "Badminton 03", src: new URL("../assets/covers/badminton/badminton_cover_03.webp", import.meta.url).href },
  { id: "badminton-04", label: "Badminton 04", src: new URL("../assets/covers/badminton/badminton_cover_04.webp", import.meta.url).href },
  { id: "badminton-05", label: "Badminton 05", src: new URL("../assets/covers/badminton/badminton_cover_05.webp", import.meta.url).href },
  { id: "badminton-06", label: "Badminton 06", src: new URL("../assets/covers/badminton/badminton_cover_06.webp", import.meta.url).href },
  { id: "badminton-07", label: "Badminton 07", src: new URL("../assets/covers/badminton/badminton_cover_07.webp", import.meta.url).href },
  { id: "badminton-08", label: "Badminton 08", src: new URL("../assets/covers/badminton/badminton_cover_08.webp", import.meta.url).href },
];

const TENNIS_COVER_PRESETS = [
  { id: "tennis-01", label: "Tennis 01", src: new URL("../assets/covers/tennis/tennis_cover_01.webp", import.meta.url).href },
  { id: "tennis-02", label: "Tennis 02", src: new URL("../assets/covers/tennis/tennis_cover_02.webp", import.meta.url).href },
  { id: "tennis-03", label: "Tennis 03", src: new URL("../assets/covers/tennis/tennis_cover_03.webp", import.meta.url).href },
  { id: "tennis-04", label: "Tennis 04", src: new URL("../assets/covers/tennis/tennis_cover_04.webp", import.meta.url).href },
  { id: "tennis-05", label: "Tennis 05", src: new URL("../assets/covers/tennis/tennis_cover_05.webp", import.meta.url).href },
  { id: "tennis-06", label: "Tennis 06", src: new URL("../assets/covers/tennis/tennis_cover_06.webp", import.meta.url).href },
  { id: "tennis-07", label: "Tennis 07", src: new URL("../assets/covers/tennis/tennis_cover_07.webp", import.meta.url).href },
  { id: "tennis-08", label: "Tennis 08", src: new URL("../assets/covers/tennis/tennis_cover_08.webp", import.meta.url).href },
];

const COMPETITION_COVER_PRESETS_BY_MODE: Partial<Record<Mode, any[]>> = {
  x01: DARTS_COVER_PRESETS,
  cricket: DARTS_COVER_PRESETS,
  killer: DARTS_COVER_PRESETS,
  shanghai: DARTS_COVER_PRESETS,
  petanque: PETANQUE_COVER_PRESETS,
  babyfoot: BABYFOOT_COVER_PRESETS,
  pingpong: PINGPONG_COVER_PRESETS,
  molkky: MOLKKY_COVER_PRESETS,
  dicegame: DICEGAME_COVER_PRESETS,
  football: FOOTBALL_COVER_PRESETS,
  badminton: BADMINTON_COVER_PRESETS,
  tennis: TENNIS_COVER_PRESETS,
};

const getCompetitionCoverPresets = (m?: Mode | null) => [
  ...((m && COMPETITION_COVER_PRESETS_BY_MODE[m]) ? COMPETITION_COVER_PRESETS_BY_MODE[m]! : COMMON_COVER_PRESETS),
  ...COMMON_COVER_PRESETS,
];

const MODE_LABEL: Record<Mode, string> = {
  x01: "X01",
  cricket: "Cricket",
  killer: "Killer",
  shanghai: "Shanghai",
  petanque: "Pétanque",
  babyfoot: "Baby-foot",
  pingpong: "Ping-Pong",
  molkky: "Mölkky",
  dicegame: "Dés",
  football: "Football",
  rugby: "Rugby",
  basket: "Basket",
  badminton: "Badminton",
  tennis: "Tennis",
};


const DARTS_CREATE_MODES: Mode[] = ["x01", "cricket", "shanghai"];
const SPORT_CREATE_MODES: Record<string, Mode[]> = {
  darts: DARTS_CREATE_MODES,
  petanque: ["petanque"],
  babyfoot: ["babyfoot"],
  pingpong: ["pingpong"],
  molkky: ["molkky"],
  dicegame: ["dicegame"],
  football: ["football"],
  rugby: ["rugby"],
  basket: ["basket"],
  badminton: ["badminton"],
  tennis: ["tennis"],
};

function normalizeCompetitionSport(value: any): string {
  const raw = String(value || "darts").toLowerCase().trim();
  if (!raw || raw === "darts" || raw === "x01" || raw === "cricket" || raw === "killer" || raw === "shanghai") return "darts";
  if (raw === "baby-foot" || raw === "baby_foot" || raw === "foosball") return "babyfoot";
  if (raw === "ping-pong" || raw === "tabletennis" || raw === "table_tennis") return "pingpong";
  if (raw === "dice" || raw === "dice_game") return "dicegame";
  return raw;
}

function competitionSportLabel(sport: string): string {
  const s = normalizeCompetitionSport(sport);
  if (s === "darts") return "Fléchettes";
  if (s === "babyfoot") return "Baby-foot";
  if (s === "petanque") return "Pétanque";
  if (s === "pingpong") return "Ping-Pong";
  if (s === "molkky") return "Mölkky";
  if (s === "dicegame") return "Dés";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ✅ Thème unique (doré)
const THEME = "#f7c85c";

function clamp(n: number, a: number, b: number) {
  const x = Number.isFinite(n) ? n : a;
  return Math.max(a, Math.min(b, x));
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function nextPow2(n: number) {
  const x = Math.max(1, (n | 0));
  let p = 1;
  while (p < x) p <<= 1;
  return p;
}

function numFromText(txt: any) {
  const s = String(txt ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* -----------------------------
   Optional stats bridge (safe)
------------------------------ */

let getBasicProfileStatsAsync: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getBasicProfileStatsAsync = require("../lib/statsBridge")?.getBasicProfileStatsAsync;
} catch {}

/* -----------------------------
   Rating -> stars + stats resolver
------------------------------ */

function starsFromAvg3D(avg: number) {
  const a = Number.isFinite(avg) ? avg : 0;
  if (a >= 75) return 5;
  if (a >= 65) return 4;
  if (a >= 55) return 3;
  if (a >= 45) return 2;
  if (a >= 30) return 1;
  return 0;
}

// ✅ robust avg resolver (store + raw + statsBridge)
function resolveAvg3D(obj: any): number {
  const candidates = [
    obj?.avg3D,
    obj?.avg3,
    obj?.stats?.avg3D,
    obj?.stats?.avg3,
    obj?.statsLite?.avg3D,
    obj?.statsLite?.avg3,
    obj?.quickStats?.avg3D,
    obj?.quickStats?.avg3,
    obj?.globalStats?.avg3D,
    obj?.globalStats?.avg3,
    obj?.rating,
    obj?.level,
    obj?.botLevel,
    obj?.difficulty,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

async function safeAvg3DForProfile(profileRaw: any, store?: any): Promise<number> {
  // 1) store caches éventuels
  try {
    const pid = String(profileRaw?.id || "");
    const fromStore = [
      store?.statsByProfile?.[pid]?.avg3D,
      store?.quickStatsByProfile?.[pid]?.avg3D,
      store?.profilesStats?.[pid]?.avg3D,
      store?.statsByProfile?.[pid]?.avg3,
      store?.quickStatsByProfile?.[pid]?.avg3,
      store?.profilesStats?.[pid]?.avg3,
    ];
    for (const v of fromStore) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {}

  // 2) raw profile
  const direct = resolveAvg3D(profileRaw);
  if (direct > 0) return direct;

  // 3) statsBridge fallback
  if (typeof getBasicProfileStatsAsync === "function") {
    try {
      const st = await getBasicProfileStatsAsync(profileRaw?.id);
      const v = resolveAvg3D(st);
      if (v > 0) return v;
    } catch {}
  }

  return 0;
}

/* -----------------------------
   ✅ BOTS CATALOG (assets + user-created)
   (Utilisé hors Pétanque)
------------------------------ */

// ✅ 1) Bots PRO (assets réels)
const BOTS_PRO_ASSETS = [
  { id: "bot_green_machine", name: "Green Machine", rating: 100, botLevel: 5, avatarDataUrl: avatarGreenMachine },
  { id: "bot_wonder_kid", name: "Wonder Kid", rating: 100, botLevel: 5, avatarDataUrl: avatarWonderKid },
  { id: "bot_cool_hand", name: "Cool Hand", rating: 100, botLevel: 5, avatarDataUrl: avatarCoolHand },
  { id: "bot_the_power", name: "The Power", rating: 100, botLevel: 5, avatarDataUrl: avatarThePower },
  { id: "bot_crafty", name: "Crafty", rating: 100, botLevel: 5, avatarDataUrl: avatarCraftyCockney },
  { id: "bot_jackpot", name: "Jackpot", rating: 90, botLevel: 4.5, avatarDataUrl: avatarJackpot },
  { id: "bot_barney", name: "Barney", rating: 90, botLevel: 4.5, avatarDataUrl: avatarBarney },
  { id: "bot_ice_man", name: "Ice Man", rating: 80, botLevel: 4, avatarDataUrl: avatarIceMan },
  { id: "bot_snake_king", name: "Snake King", rating: 80, botLevel: 4, avatarDataUrl: avatarSnakeKing },
  { id: "bot_flying_scotsman", name: "Flying Scotsman", rating: 80, botLevel: 4, avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_bully_boy", name: "Bully Boy", rating: 80, botLevel: 4, avatarDataUrl: avatarBullyBoy },
  { id: "bot_the_ferret", name: "The Ferret", rating: 80, botLevel: 4, avatarDataUrl: avatarTheFerret },
  { id: "bot_the_asp", name: "The Asp", rating: 80, botLevel: 4, avatarDataUrl: avatarTheAsp },
  { id: "bot_darth_maple", name: "Darth Maple", rating: 70, botLevel: 3.5, avatarDataUrl: avatarDarthMaple },
  { id: "bot_hollywood", name: "Hollywood", rating: 60, botLevel: 3, avatarDataUrl: avatarHollywood },
  { id: "bot_the_menace", name: "The Menace", rating: 60, botLevel: 3, avatarDataUrl: avatarTheMenace },
  { id: "bot_the_giant", name: "The Giant", rating: 80, botLevel: 4, avatarDataUrl: avatarTheGiant },
  { id: "bot_voltage", name: "Voltage", rating: 70, botLevel: 3.5, avatarDataUrl: avatarVoltage },
  { id: "bot_one_dart", name: "One Dart", rating: 70, botLevel: 3.5, avatarDataUrl: avatarOneDart },
  { id: "bot_the_hammer", name: "The Hammer", rating: 60, botLevel: 3, avatarDataUrl: avatarTheHammer },
];

const BOT_PRO_AVATAR_BY_NAME: Record<string, any> = Object.fromEntries(
  BOTS_PRO_ASSETS.map((b) => [String(b.name || "").trim().toLowerCase(), b.avatarDataUrl])
);

function botAvatarFor(obj: any) {
  const nameKey = String(obj?.name || "").trim().toLowerCase();
  return (
    obj?.avatarUrl ||
    obj?.avatarDataUrl ||
    obj?.avatarPath ||
    obj?.avatar ||
    obj?.photo ||
    obj?.thumb ||
    BOT_PRO_AVATAR_BY_NAME[nameKey] ||
    null
  );
}

// ✅ detect bot “créé user” (Profiles → création bot) — ROBUSTE
function isBotProfile(p: any) {
  if (!p) return false;
  if (p.isBot === true) return true;
  if (p.ai === true || p.isAI === true) return true;
  if (String(p.isBot).toLowerCase() === "true") return true;
  if (String(p.ai).toLowerCase() === "true") return true;
  if (String(p.isAI).toLowerCase() === "true") return true;

  const t = String(p.type || p.kind || p.profileType || p.source || p.role || "").toLowerCase().trim();
  if (t === "bot" || t === "ai" || t === "cpu") return true;
  if (t.includes("bot")) return true;

  if (p.botLevel != null) return true;
  if (p.difficulty != null) return true;
  if (p.skill != null) return true;

  return false;
}

// ✅ localStorage bots : clés connues + scan "bot" (fallback)
function readBotsFromLocalStorage(): any[] {
  const keys = ["dc_bots_v1", "dc-bots-v1", "dcBotsV1", "darts-counter-bots", "bots"];

  // 1) clés connues
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.bots)
          ? parsed.bots
          : Array.isArray(parsed?.items)
            ? parsed.items
            : Array.isArray(parsed?.list)
              ? parsed.list
              : [];
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
  }

  // 2) scan localStorage: toute clé contenant "bot"
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!/bot/i.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.bots)
            ? parsed.bots
            : Array.isArray(parsed?.items)
              ? parsed.items
              : Array.isArray(parsed?.list)
                ? parsed.list
                : [];
        if (Array.isArray(arr) && arr.length) return arr;
      } catch {}
    }
  } catch {}

  return [];
}

// ✅ fingerprint stable: détecte changement localStorage DANS LE MÊME ONGLET (poll)
function botsFingerprintLS(): string {
  try {
    const keys = ["dc_bots_v1", "dc-bots-v1", "dcBotsV1", "darts-counter-bots", "bots"];
    const chunks: string[] = [];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) chunks.push(k + ":" + String(v.length));
    }

    try {
      let countBotKeys = 0;
      let sumLen = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (!/bot/i.test(k)) continue;
        countBotKeys++;
        const v = localStorage.getItem(k);
        if (v) sumLen += v.length;
      }
      chunks.push("scan:" + countBotKeys + ":" + sumLen);
    } catch {}

    return chunks.join("|");
  } catch {
    return "";
  }
}

function getBotsFromStore(store: any) {
  const out: any[] = [];
  const seen = new Set<string>();

  const pushBot = (p: any, forcedBot = false) => {
    if (!p) return;
    if (!forcedBot && !isBotProfile(p)) return;

    const id = String(p?.id || p?.uuid || p?.botId || "").trim();
    const name = String(p?.name || p?.displayName || p?.pseudo || "Bot").trim();
    const key = id || `bot_${name.toLowerCase()}`;
    if (!key || seen.has(key)) return;
    seen.add(key);

    const avg = resolveAvg3D(p) || Number(p?.rating || p?.level || 0) || 0;
    const avatar = botAvatarFor(p);

    out.push({
      id: id || key,
      name,
      avatar,
      avatarDataUrl: avatar,
      avg3D: Number(avg) || 0,
      isBot: true,
      raw: p,
    });
  };

  try {
    if (Array.isArray(store?.bots)) store.bots.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.botProfiles)) store.botProfiles.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.aiBots)) store.aiBots.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.settings?.bots)) store.settings.bots.forEach((b: any) => pushBot(b, true));
  } catch {}

  try {
    if (Array.isArray(store?.profiles)) store.profiles.forEach((p: any) => pushBot(p, false));
  } catch {}

  try {
    const libBots = loadStoredBots();
    if (Array.isArray(libBots)) libBots.forEach((b: any) => pushBot(b, true));
  } catch {}

  try {
    const lsBots = readBotsFromLocalStorage();
    if (Array.isArray(lsBots)) lsBots.forEach((b: any) => pushBot(b, true));
  } catch {}

  return out;
}

function pickBotsToFill(fromCatalog: any[], need: number, avgTarget: number) {
  const pool = Array.isArray(fromCatalog) ? fromCatalog.filter(Boolean) : [];
  if (!pool.length || need <= 0) return [];
  const sorted = [...pool].sort(
    (a, b) => Math.abs((Number(a.avg3D) || 0) - avgTarget) - Math.abs((Number(b.avg3D) || 0) - avgTarget)
  );
  const out: any[] = [];
  for (let i = 0; i < need; i++) out.push(sorted[i % sorted.length]);
  return out;
}

/* -----------------------------
   UI atoms (THEME neon-ish)
------------------------------ */

function Section({ title, subtitle, children, accent = THEME, watermark }: any) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: 16,
        marginTop: 14,
        background: `radial-gradient(135% 140% at 0% 0%, ${accent}24, transparent 54%), linear-gradient(180deg, rgba(22,22,28,0.985), rgba(7,7,11,0.995))`,
        border: `1px solid ${accent}33`,
        boxShadow: `0 18px 42px rgba(0,0,0,0.58), 0 0 20px ${accent}14`,
      }}
    >
      {watermark ? (
        <img
          src={watermark}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            right: -28,
            top: "50%",
            width: 152,
            height: 152,
            objectFit: "contain",
            opacity: 0.13,
            transform: "translateY(-50%) rotate(-8deg)",
            pointerEvents: "none",
            filter: `drop-shadow(0 0 18px ${accent}22)`,
            userSelect: "none",
          }}
        />
      ) : null}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 1000, letterSpacing: 0.3, color: accent, textShadow: `0 0 12px ${accent}35` }}>
            {title}
          </div>
          {subtitle ? <div style={{ fontSize: 12, opacity: 0.82, lineHeight: 1.38, maxWidth: 520 }}>{subtitle}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function NeonPill({ active, label, onClick, small, disabled, primary = THEME }: any) {
  const isDisabled = !!disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: small ? "6px 10px" : "7px 12px",
        border: active ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.12)",
        background: active ? `linear-gradient(180deg, ${primary}22, rgba(0,0,0,0.20))` : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: "rgba(255,255,255,0.95)",
        fontWeight: active ? 950 : 850,
        fontSize: small ? 11.5 : 12.2,
        cursor: isDisabled ? "not-allowed" : "pointer",
        boxShadow: active ? `0 0 18px ${primary}44, 0 10px 22px rgba(0,0,0,0.35)` : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function NeonPrimary({ label, onClick, disabled, primary = THEME }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        borderRadius: 999,
        padding: "12px 14px",
        border: "none",
        fontWeight: 950,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        color: "#1b1508",
        background: disabled ? "linear-gradient(180deg,#555,#333)" : `linear-gradient(90deg, ${primary}, #ffe9a3)`,
        boxShadow: disabled ? "none" : "0 14px 34px rgba(0,0,0,0.55)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function NeonGhost({ label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.9)",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

/* -----------------------------
   Info (i) modal centered
------------------------------ */

function InfoIconButton({ onClick }: any) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        color: "#fff",
        fontWeight: 950,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flex: "0 0 auto",
        boxShadow: "0 0 12px rgba(0,0,0,0.55)",
      }}
      aria-label="Info"
      title="Info"
    >
      i
    </button>
  );
}

function CenterInfoModal({ open, title, children, onClose, primary }: any) {
  if (!open) return null;
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(12,14,28,0.96), rgba(6,7,14,0.98))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.70)",
          padding: 14,
          color: "#f2f2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 950, color: primary, fontSize: 14 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 10,
              padding: "6px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#d7d9f0", lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
   Players helpers + MEDALLION (no circles)
------------------------------ */

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function PlayerMedallion({ name, dataUrl, avg3D, active, isBot, primary = THEME }: any) {
  const SCALE = 0.82;
  const AVATAR = Math.round(78 * SCALE);
  const STAR = Math.round(18 * SCALE);
  const WRAP = AVATAR + STAR;

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, display: "grid", placeItems: "center", overflow: "visible", background: "transparent" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, opacity: 0.95 }}>
        <ProfileStarRing anchorSize={AVATAR} starSize={STAR} gapPx={-2} stepDeg={10} avg3d={Number(avg3D) || 0} color={primary} />
      </div>

      {active ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: AVATAR + 7,
            height: AVATAR + 7,
            borderRadius: "50%",
            boxShadow: `0 0 14px ${primary}66, 0 0 26px ${primary}18`,
            zIndex: 0,
            background: "transparent",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <div
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: "50%",
          overflow: "hidden",
          zIndex: 1,
          background: "transparent",
          boxShadow: "none",
          filter: active ? "none" : "brightness(0.88) saturate(0.92)",
          opacity: active ? 1 : 0.85,
          transition: "filter .15s ease, opacity .15s ease",
        }}
      >
        <ProfileAvatar size={AVATAR} dataUrl={dataUrl ?? undefined} label={getInitials(name)} showStars={false} noFrame />
      </div>

      {isBot ? (
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 950,
            background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
            color: "#160f06",
            boxShadow: `0 0 10px ${primary}33`,
            zIndex: 3,
            whiteSpace: "nowrap",
          }}
        >
          BOT
        </div>
      ) : null}
    </div>
  );
}

function PlayerCarouselTile({ active, name, avatarUrl, avg3D, onClick, isBot, primary = THEME }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 104,
        flex: "0 0 auto",
        border: "none",
        background: "transparent",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        padding: 0,
        display: "grid",
        justifyItems: "center",
        gap: 8,
        scrollSnapAlign: "start",
        opacity: active ? 1 : 0.86,
      }}
      title={name}
    >
      <PlayerMedallion name={name} dataUrl={avatarUrl} avg3D={avg3D} active={active} isBot={!!isBot} primary={primary} />
      <div style={{ width: 104, fontSize: 11.5, fontWeight: 950, opacity: active ? 1 : 0.55, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "opacity .15s ease" }}>
        {name || "Joueur"}
      </div>
    </button>
  );
}

/* -----------------------------
   Sheet (mode picker)
------------------------------ */

function Sheet({ open, title, onClose, children, primary = THEME }: any) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.62)", display: "grid", placeItems: "end center", padding: 12 }} onMouseDown={onClose}>
      <div
        style={{
          width: "min(520px, 96vw)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))",
          boxShadow: "0 22px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 950, fontSize: 14, color: primary }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 20, cursor: "pointer", lineHeight: 1 }} aria-label="Fermer" title="Fermer">
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
   UI rows (1 line option + i outside)
------------------------------ */

function LineOption({ label, active, onClick, onInfo, primary = THEME, disabled }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={!!disabled}
        style={{
          height: 40,
          borderRadius: 14,
          border: active ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
          background: active ? `linear-gradient(180deg, ${primary}22, rgba(0,0,0,0.20))` : "rgba(9,11,20,0.92)",
          color: "rgba(255,255,255,0.95)",
          fontWeight: 950,
          textAlign: "left",
          padding: "0 12px",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: active ? `0 0 18px ${primary}33` : "none",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {label}
      </button>
      <InfoIconButton onClick={onInfo} />
    </div>
  );
}

function RowTitle({ label }: any) {
  return <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 8 }}>{label}</div>;
}

function TextInput({ value, onChange, placeholder, width = "100%" }: any) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,8,12,0.75)",
        color: "#fff",
        padding: "10px 12px",
        fontSize: 13.5,
        outline: "none",
      }}
    />
  );
}

function smartBack(go: Props["go"], fallbackTab: any, fallbackParams?: any) {
  // Navigation interne uniquement : l'historique navigateur peut revenir sur un hash vide
  // et afficher un écran noir dans cette PWA. On reste dans le routeur React.
  go(fallbackTab, fallbackParams);
}

function GuidedVisualHeader({ onBack, accent = THEME }: any) {
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <img
        src={tickerCompetitions}
        alt="Compétitions"
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          maxHeight: 104,
          objectFit: "contain",
          borderRadius: 18,
          boxShadow: "0 16px 40px rgba(0,0,0,.62), 0 0 24px rgba(183,255,0,.12)",
          userSelect: "none",
        }}
      />
      <div style={{ position: "absolute", left: 10, top: 10, zIndex: 4 }}>
        <BackDot onClick={onBack} size={40} title="Retour" color={accent} glow={`${accent}88`} />
      </div>
    </div>
  );
}

function GuidedHeroCard({
  titleLine2,
  sportLabel,
  sourceLabel,
  primary = THEME,
  kindLabel,
  watermark,
  configMode,
  onConfigModeChange,
  info,
  competitionLogo,
}: any) {
  const isGuided = configMode === "guided";
  const modeButton = (active: boolean, label: string, value: "guided" | "full") => (
    <button
      type="button"
      onClick={() => onConfigModeChange?.(value)}
      style={{
        borderRadius: 999,
        border: active ? `1px solid ${primary}AA` : "1px solid rgba(255,255,255,.12)",
        background: active
          ? `linear-gradient(180deg, ${primary}28, rgba(0,0,0,.28))`
          : "rgba(255,255,255,.045)",
        color: active ? primary : "rgba(255,255,255,.76)",
        padding: "8px 10px",
        fontSize: 12,
        fontWeight: 1000,
        cursor: "pointer",
        boxShadow: active ? `0 0 18px ${primary}24` : "none",
      }}
    >
      {label}
    </button>
  );

  const chip = (label: string, strong = false) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 24,
        padding: strong ? "5px 13px" : "5px 11px",
        borderRadius: 999,
        border: strong ? `1px solid ${primary}77` : "1px solid rgba(255,255,255,.12)",
        color: strong ? primary : "rgba(255,255,255,.82)",
        background: strong ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.045)",
        fontSize: strong ? 11 : 10.5,
        fontWeight: strong ? 1000 : 950,
        letterSpacing: strong ? .45 : .35,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        padding: 16,
        border: `1px solid ${primary}44`,
        background: `radial-gradient(130% 125% at 0% 0%, ${primary}20, transparent 56%), linear-gradient(180deg, rgba(20,20,26,.985), rgba(6,6,9,.995))`,
        boxShadow: `0 24px 60px rgba(0,0,0,.68), 0 0 24px ${primary}14`,
      }}
    >
      <img
        src={watermark}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          right: -32,
          top: "54%",
          width: 192,
          height: 192,
          objectFit: "contain",
          opacity: 0.22,
          transform: "translateY(-50%) rotate(-8deg)",
          pointerEvents: "none",
          filter: `drop-shadow(0 0 20px ${primary}24)`,
          userSelect: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
          {modeButton(isGuided, "Guidée", "guided")}
          {modeButton(!isGuided, "Complète", "full")}
          <InfoDot title="Configuration compétition" size={34} color={primary} glow={`${primary}77`} content={info} />
        </div>

        <div
          style={{
            minHeight: 92,
            display: "grid",
            alignContent: "center",
            justifyItems: "center",
            textAlign: "center",
            padding: "14px 8px 10px",
          }}
        >
          <div style={{ color: primary, fontSize: 13, lineHeight: 1, letterSpacing: 1.8, fontWeight: 1000, textTransform: "uppercase", textShadow: `0 0 14px ${primary}44` }}>
            CRÉATION
          </div>
          <div
            style={{
              marginTop: 6,
              width: "100%",
              display: "grid",
              gridTemplateColumns: competitionLogo ? "44px minmax(0, max-content) 44px" : "minmax(0, max-content)",
              alignItems: "center",
              justifyContent: "center",
              columnGap: competitionLogo ? 8 : 0,
              color: "#fff",
              fontSize: "clamp(20px, 6vw, 32px)",
              lineHeight: .96,
              fontWeight: 1000,
              textTransform: "uppercase",
              textShadow: "0 3px 18px rgba(0,0,0,.62)",
              minWidth: 0,
            }}
          >
            {competitionLogo ? (
              <span
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  padding: 3,
                  border: `1px solid ${primary}88`,
                  background: "rgba(0,0,0,.42)",
                  boxShadow: `0 0 18px ${primary}42`,
                  display: "grid",
                  placeItems: "center",
                  pointerEvents: "none",
                  justifySelf: "end",
                }}
              >
                <img
                  src={competitionLogo}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 999,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </span>
            ) : null}
            <span style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center" }}>
              {titleLine2}
            </span>
            {competitionLogo ? <span aria-hidden="true" style={{ width: 38, height: 38, justifySelf: "start" }} /> : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, flexWrap: "wrap", padding: "0 8px" }}>
          {chip(kindLabel, true)}
          {chip(sportLabel)}
          {chip(sourceLabel)}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Page
------------------------------ */

export default function TournamentCreate({ store, go, params }: Props) {

  // ✅ FORCE SPORT multi-sport (local + online) : vient de GameSelect / BottomNav.
  const forceMode = normalizeCompetitionSport(params?.forceMode ?? params?.sport ?? "darts");
  const initialSource = String(params?.source || "local").toLowerCase() === "online" ? "online" : "local";
  const [source, setSource] = React.useState<"local" | "online">(initialSource as "local" | "online");
  React.useEffect(() => {
    setSource(initialSource as "local" | "online");
  }, [initialSource]);
  const competitionKind = String(params?.kind || params?.competitionKind || "tournament").toLowerCase();
  const isLeague = competitionKind === "league" || competitionKind === "championship" || competitionKind === "championnat";
  const primary = isLeague ? "#f7c85c" : "#ff7fe2";
  const primaryAura = isLeague ? "rgba(247,200,92,0.13)" : "rgba(255,127,226,0.14)";
  const kindWatermark = isLeague ? leagueWatermark : tournamentWatermark;
  const isPetanque = forceMode === "petanque";
  const isBabyFoot = forceMode === "babyfoot";
  const [configMode, setConfigMode] = React.useState<"guided" | "full">(String(params?.configMode || "guided") === "full" ? "full" : "guided");
  const [guidedStep, setGuidedStep] = React.useState(0);
  const availableModes = SPORT_CREATE_MODES[forceMode] || DARTS_CREATE_MODES;
  const lockedSportMode = availableModes.length === 1 ? availableModes[0] : null;
  const sportLabel = competitionSportLabel(forceMode);

  const [name, setName] = React.useState(isLeague ? `Ligue ${sportLabel}` : `Tournoi ${sportLabel}`);
  const [competitionAvatar, setCompetitionAvatar] = React.useState<string | null>(null);
  const [competitionCover, setCompetitionCover] = React.useState<string | null>(null);
  const [competitionCoverImportDiag, setCompetitionCoverImportDiag] = React.useState<string>("");
  const [showCompetitionLogoPicker, setShowCompetitionLogoPicker] = React.useState(false);
  const [showCompetitionCoverPicker, setShowCompetitionCoverPicker] = React.useState(false);

  // ✅ IMPORTANT: le choix est verrouillé au SPORT actif. Darts peut choisir X01/Cricket/Killer/Shanghai, jamais Baby-foot.
  const [mode, setMode] = React.useState<Mode | null>(lockedSportMode || availableModes[0] || "x01");
  const [sheetMode, setSheetMode] = React.useState(false);

  React.useEffect(() => {
    const allowed = SPORT_CREATE_MODES[forceMode] || DARTS_CREATE_MODES;
    const next = allowed.length === 1 ? allowed[0] : (allowed.includes(mode as Mode) ? mode : allowed[0]);
    setMode(next || "x01");
    if (allowed.length === 1) setSheetMode(false);
  }, [forceMode]);

  // ✅ PÉTANQUE : composition (Simple/Doublette/Triplette/Quadrette)
  const [petanqueTeamSize, setPetanqueTeamSize] = React.useState<PetanqueTeamSize>(2);

  // ✅ PÉTANQUE — entrée participants
  // - "profiles": sélection de profils humains puis regroupement en équipes
  // - "teams": création directe d'équipes (sans profils) pour gros tournois
  const [petanqueEntry, setPetanqueEntry] = React.useState<"profiles" | "teams">("profiles");
  const [participantKind, setParticipantKind] = React.useState<"solo" | "teams">("solo");

  // ✅ PÉTANQUE — mode "teams" (sans profils)
  const [teamsSearch, setTeamsSearch] = React.useState<string>("");
  const [teamsExpandedIdx, setTeamsExpandedIdx] = React.useState<number | null>(null);
  const [teamsImportOpen, setTeamsImportOpen] = React.useState(false);
  const [teamsImportText, setTeamsImportText] = React.useState<string>("");
  const [teamsInput, setTeamsInput] = React.useState<{ id: string; name: string; players: string[]; logoDataUrl?: string | null; playerIds?: string[] }[]>([]);
  const [storedTeams, setStoredTeams] = React.useState<any[]>([]);
  const [teamCreateOpen, setTeamCreateOpen] = React.useState(false);
  const [teamCreateName, setTeamCreateName] = React.useState("");
  const [teamCreateLogo, setTeamCreateLogo] = React.useState<string | null>(null);
  const [teamCreateRoster, setTeamCreateRoster] = React.useState<string[]>([]);
  const [teamCreateQuery, setTeamCreateQuery] = React.useState("");

  // ✅ Confrontations par équipes (Ligue + Tournoi)
  // Dans les ligues réelles, une rencontre d'équipe n'est pas seulement "équipe A vs équipe B" :
  // elle peut contenir plusieurs matchs individuels/doublettes, puis les points de rencontre sont additionnés.
  const [teamConfrontationFormat, setTeamConfrontationFormat] = React.useState<"custom" | "single" | "singles" | "singles_doubles">("custom");
  const [teamConfrontationPlayers, setTeamConfrontationPlayers] = React.useState<string>("4");
  const [teamConfrontationDoubles, setTeamConfrontationDoubles] = React.useState<string>("1");
  const [teamConfrontationSoloCount, setTeamConfrontationSoloCount] = React.useState<string>("4");
  const [teamConfrontationDuoCount, setTeamConfrontationDuoCount] = React.useState<string>("1");
  const [teamConfrontationMultiCount, setTeamConfrontationMultiCount] = React.useState<string>("0");
  const [teamConfrontationMultiPlayers, setTeamConfrontationMultiPlayers] = React.useState<string>("3");
  const [teamConfrontationWinMode, setTeamConfrontationWinMode] = React.useState<"match_points" | "legs_sets">("match_points");

  const [participantsDropdownOpen, setParticipantsDropdownOpen] = React.useState(false);
  const [includeBotsInParticipantList, setIncludeBotsInParticipantList] = React.useState(false);
  const [includeBotTeamsInTeamList, setIncludeBotTeamsInTeamList] = React.useState(false);
  const guidedTabsRef = React.useRef<HTMLDivElement | null>(null);
  const guidedTabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);


// ✅ PÉTANQUE — équipes (assignation manuelle)
const [assignMode, setAssignMode] = React.useState<boolean>(true); // true = clic sur joueur => assignation vers l’équipe active
const [activeTeamIdx, setActiveTeamIdx] = React.useState<number>(0);
const [teamNames, setTeamNames] = React.useState<Record<number, string>>({});
const [teamOfPlayer, setTeamOfPlayer] = React.useState<Record<string, number>>({});

  // ✅ NEW : max joueurs (optionnel) — vide = illimité
  const [maxPlayers, setMaxPlayers] = React.useState<string>("");

  // ✅ MODAL INFO global (centré)
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoKey, setInfoKey] = React.useState<string | null>(null);
  const openInfo = (key: string) => {
    setInfoKey(key);
    setInfoOpen(true);
  };

  // ✅ IMPORTANT: refresh bots même si store ne change pas (utile hors pétanque)
  const [botsRefresh, setBotsRefresh] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setBotsRefresh((x) => x + 1);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    let last = botsFingerprintLS();
    const tick = () => {
      if (!mounted) return;
      const now = botsFingerprintLS();
      if (now !== last) {
        last = now;
        setBotsRefresh((x) => x + 1);
      }
    };
    const t = window.setInterval(tick, 700);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  const reloadStoredTeams = React.useCallback(() => {
    try {
      setStoredTeams(loadTeamsBySport(forceMode as any) || []);
    } catch {
      setStoredTeams([]);
    }
  }, [forceMode]);

  React.useEffect(() => {
    reloadStoredTeams();
    const onVis = () => {
      if (document.visibilityState === "visible") reloadStoredTeams();
    };
    window.addEventListener("focus", reloadStoredTeams);
    window.addEventListener("storage", reloadStoredTeams);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", reloadStoredTeams);
      window.removeEventListener("storage", reloadStoredTeams);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reloadStoredTeams]);

  // ---- Players (LOCAL) : humains uniquement ici
  const profiles = React.useMemo(() => {
    const arr = (store as any)?.profiles || [];
    return arr
      .filter((p: any) => p?.id && !isBotProfile(p))
      .map((p: any) => ({
        id: String(p.id),
        name: p?.name || p?.displayName || p?.pseudo || "Joueur",
        avatar: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || p?.photo || null,
        raw: p,
      }))
      .filter((p: any) => !!p.id);
  }, [store, botsRefresh]);

  // ✅ BOTS CATALOG (hors pétanque)
  const botsCatalog = React.useMemo(() => {
    const pro = BOTS_PRO_ASSETS.map((b) => ({
      id: String(b.id),
      name: b.name,
      avatar: b.avatarDataUrl ?? null,
      avg3D: Number(b.rating) || 0,
      botLevel: b.botLevel,
      isBot: true,
      raw: b,
    }));

    const userBots = getBotsFromStore(store as any);

    const out: any[] = [];
    const seen = new Set<string>();
    for (const b of [...pro, ...userBots]) {
      const key = String(b?.id || b?.name || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);

      out.push({
        ...b,
        avatar: botAvatarFor(b?.raw || b) || b.avatar || null,
        avg3D: Number(b.avg3D || 0) || 0,
        isBot: true,
      });
    }
    return out;
  }, [store, botsRefresh]);

  const botTeamsCatalog = React.useMemo(() => {
    const avatarById = new Map<string, any>();
    const botById = new Map<string, any>();
    for (const b of Array.isArray(botsCatalog) ? botsCatalog : []) {
      const id = String(b?.id || "");
      if (!id) continue;
      avatarById.set(id, botAvatarFor(b?.raw || b) || b?.avatar || b?.avatarDataUrl || null);
      botById.set(id, b);
    }

    const logoByKey: Record<string, any> = {
      elite: botTeamEliteLogo,
      pro: botTeamProLogo,
      challenger: botTeamChallengerLogo,
      mix: botTeamMixLogo,
      rising: botTeamRisingLogo,
    };

    return BOT_PRO_TEAMS.map((team: any) => {
      const members = (team.members || []).map((member: any) => {
        const src = botById.get(String(member.id)) || member;
        return {
          ...member,
          avatar: avatarById.get(String(member.id)) || src?.avatar || src?.avatarDataUrl || null,
          avg3D: Number(member.targetAvg3 || src?.avg3D || team.avg3D || 0) || 0,
          isBot: true,
        };
      });
      return {
        id: `botteam_${forceMode}_${team.key}`,
        key: team.key,
        name: team.name,
        sport: forceMode,
        isBotTeam: true,
        botTeamLevel: Number(team.botLevel || 1),
        avg3D: Number(team.avg3D || (Number(team.botLevel || 1) * 20)) || 0,
        stars: starsFromAvg3D(Number(team.avg3D || (Number(team.botLevel || 1) * 20)) || 0),
        logoDataUrl: logoByKey[team.key] || null,
        logoUrl: logoByKey[team.key] || null,
        playerIds: members.map((b: any) => String(b.id)),
        players: members.map((b: any) => String(b.name || "BOT")),
        members,
      };
    });
  }, [botsCatalog, forceMode]);

  // avg3D cache (humains)
  const [avgMap, setAvgMap] = React.useState<Record<string, number>>({});
  const [loadingAvg, setLoadingAvg] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingAvg(true);
      try {
        const out: Record<string, number> = {};
        for (const p of profiles) {
          const avg = await safeAvg3DForProfile(p.raw, store as any);
          out[p.id] = Number.isFinite(avg) ? avg : 0;
        }
        if (!mounted) return;
        setAvgMap(out);
      } finally {
        if (mounted) setLoadingAvg(false);
      }
    };

    if (profiles?.length) run();
    else setAvgMap({});

    return () => {
      mounted = false;
    };
  }, [profiles, store]);

  const [playerIds, setPlayerIds] = React.useState<string[]>(() => {
    const active = (store as any)?.activeProfiles || [];
    const fromActive = Array.isArray(active) ? active.map((x: any) => String(x)).filter(Boolean) : [];
    const base = fromActive.length ? fromActive : profiles.slice(0, 2).map((p: any) => String(p.id));
    return Array.from(new Set(base)).filter(Boolean);
  });

  React.useEffect(() => {
    setPlayerIds((prev) => {
      const stillValid = prev.filter((id) => profiles.some((p: any) => p.id === id));
      if (stillValid.length >= 2) return stillValid;
      if (profiles.length >= 2) return Array.from(new Set([...stillValid, profiles[0].id, profiles[1].id]));
      if (profiles.length === 1) return Array.from(new Set([...stillValid, profiles[0].id]));
      return stillValid;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  // ✅ Sélection lisible par le rendu guidé + la configuration complète.
  // Ne pas laisser cette variable uniquement dans createTournament(), sinon le wizard
  // crashe au rendu avec "selectedProfiles is not defined".
  const selectedProfiles = React.useMemo(
    () => profiles.filter((p: any) => playerIds.includes(String(p.id))),
    [profiles, playerIds]
  );

  
const togglePlayer = (id: string) => {
  // ✅ PÉTANQUE : si assignMode ON => clic assigne à l’équipe active (avec swap si besoin)
  if (isPetanque && assignMode) {
    const pid = String(id);

    // si pas sélectionné : on le sélectionne
    if (!playerIds.includes(pid)) {
      setPlayerIds((prev) => [...prev, pid]);
    }

    // assignation
    setTeamOfPlayer((prev) => {
      const selected = Array.from(new Set([...(playerIds || []), pid])).filter(Boolean);
      const teamCount = petanqueTeamCountFromSelected(selected.length);
      const ts = Number(petanqueTeamSize) || 1;
      const next = normalizePetanqueAssignments(selected, prev || {});

      const target = Math.max(0, Math.min(teamCount - 1, Number(activeTeamIdx) || 0));

      // build members list for target team
      const members: string[] = [];
      for (const k of Object.keys(next)) if (next[k] === target) members.push(k);

      const currentTeam = next[pid];

      // déjà dans la bonne équipe
      if (currentTeam === target) return next;

      // si place dispo => move simple
      if (members.length < ts) {
        next[pid] = target;
        return normalizePetanqueAssignments(selected, next);
      }

      // équipe pleine => swap avec le premier membre (sauf si pid déjà dedans, traité au-dessus)
      const swapWith = members[0];
      if (swapWith && swapWith !== pid) {
        const fromTeam = currentTeam;
        next[pid] = target;
        if (fromTeam != null) next[swapWith] = fromTeam;
        return normalizePetanqueAssignments(selected, next);
      }

      return normalizePetanqueAssignments(selected, next);
    });

    return;
  }

  // ✅ mode normal : toggle sélection joueur
  setPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
};

  // ------------------------------------------------------------
  // ✅ PÉTANQUE — mode "Par équipes" (sans profils)
  // ------------------------------------------------------------

  const normalizeTeamPlayers = React.useCallback(
    (players: any[]) => {
      const list = (Array.isArray(players) ? players : []).map((x) => String(x ?? "").trim()).filter(Boolean);
      // pad à teamSize
      const out = list.slice(0, Number(petanqueTeamSize) || 1);
      while (out.length < (Number(petanqueTeamSize) || 1)) out.push("");
      return out;
    },
    [petanqueTeamSize]
  );

  const makeTeamId = React.useCallback((i: number) => {
    const n = Math.max(1, Number(i) + 1);
    return `team_${n}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  const generateTeams = React.useCallback(
    (count: number) => {
      const n = Math.max(0, Math.min(256, Math.floor(Number(count) || 0)));
      if (!n) {
        setTeamsInput([]);
        setTeamsExpandedIdx(null);
        return;
      }
      const next = Array.from({ length: n }).map((_, idx) => ({
        id: makeTeamId(idx),
        name: `Équipe ${idx + 1}`,
        players: normalizeTeamPlayers([]),
      }));
      setTeamsInput(next);
      setTeamsExpandedIdx(0);
    },
    [makeTeamId, normalizeTeamPlayers]
  );

  const addTeamInput = React.useCallback(() => {
    setTeamsInput((prev) => {
      const arr = [...(prev || [])];
      const idx = arr.length;
      arr.push({ id: makeTeamId(idx), name: `Équipe ${idx + 1}`, players: normalizeTeamPlayers([]) });
      return arr;
    });
    setTeamsExpandedIdx((prev) => (prev == null ? 0 : prev));
  }, [makeTeamId, normalizeTeamPlayers]);

  const openTeamCreate = React.useCallback(() => {
    const nextName = `Équipe ${(teamsInput || []).length + 1}`;
    setTeamCreateName(nextName);
    setTeamCreateLogo(null);
    setTeamCreateRoster([]);
    setTeamCreateQuery("");
    setTeamCreateOpen(true);
  }, [teamsInput]);

  const commitTeamCreate = React.useCallback(() => {
    const clean = String(teamCreateName || "").trim() || `Équipe ${(teamsInput || []).length + 1}`;
    const roster = Array.from(new Set((teamCreateRoster || []).map(String).filter(Boolean)));
    let created: any = null;
    try {
      const base = createStoredTeam({ sport: forceMode as any, name: clean, logoDataUrl: teamCreateLogo || null });
      created = upsertStoredTeam({
        ...base,
        sport: forceMode as any,
        name: clean,
        logoDataUrl: teamCreateLogo || base?.logoDataUrl || null,
        playerIds: roster,
      } as any);
      reloadStoredTeams();
    } catch {
      created = { id: makeTeamId((teamsInput || []).length), name: clean, playerIds: roster, logoDataUrl: teamCreateLogo || null };
    }

    const picked = {
      id: String(created?.id || makeTeamId((teamsInput || []).length)),
      name: String(created?.name || clean),
      players: Array.isArray(created?.playerIds) ? created.playerIds : roster,
      playerIds: Array.isArray(created?.playerIds) ? created.playerIds : roster,
      logoDataUrl: created?.logoDataUrl || teamCreateLogo || null,
    };

    setTeamsInput((prev) => {
      const arr = [...(prev || [])].filter((t: any) => String(t?.id) !== String(picked.id));
      arr.push(picked);
      return arr;
    });
    setTeamsExpandedIdx((prev) => (prev == null ? 0 : prev));
    setTeamCreateOpen(false);
    setTeamCreateName("");
    setTeamCreateLogo(null);
    setTeamCreateRoster([]);
    setTeamCreateQuery("");
  }, [teamCreateName, teamCreateLogo, teamCreateRoster, teamsInput, makeTeamId, forceMode, reloadStoredTeams]);

  const toggleStoredTeam = React.useCallback((team: any) => {
    if (!team) return;
    const id = String(team?.id || "");
    if (!id) return;
    setTeamsInput((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const exists = arr.some((t: any) => String(t?.id || "") === id);
      if (exists) return arr.filter((t: any) => String(t?.id || "") !== id);
      return [
        ...arr,
        {
          id,
          name: String(team?.name || "Équipe"),
          players: Array.isArray(team?.playerIds) ? team.playerIds : [],
          playerIds: Array.isArray(team?.playerIds) ? team.playerIds : [],
          logoDataUrl: team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || null,
          logoUrl: team?.logoUrl || team?.logoDataUrl || team?.avatarDataUrl || null,
          isBotTeam: !!team?.isBotTeam,
          botTeamLevel: team?.botTeamLevel ?? null,
          avg3D: Number(team?.avg3D || 0) || 0,
          stars: Number(team?.stars || 0) || 0,
          members: Array.isArray(team?.members) ? team.members : [],
        },
      ];
    });
  }, []);

  const parseTeamsImportText = React.useCallback(
    (text: string) => {
      const ts = Number(petanqueTeamSize) || 1;
      const lines = String(text || "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const teams = lines.map((line, idx) => {
        let name = "";
        let players: string[] = [];

        if (line.includes(";")) {
          const [a, b] = line.split(";");
          name = String(a || "").trim();
          players = String(b || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
        } else if (line.includes("|")) {
          const parts = line
            .split("|")
            .map((x) => x.trim())
            .filter(Boolean);
          name = parts[0] || "";
          players = parts.slice(1);
        } else {
          name = line;
          players = [];
        }

        const p = (players || []).slice(0, ts);
        while (p.length < ts) p.push("");

        return {
          id: makeTeamId(idx),
          name: name || `Équipe ${idx + 1}`,
          players: p,
        };
      });

      setTeamsInput(teams);
      setTeamsExpandedIdx(teams.length ? 0 : null);
    },
    [makeTeamId, petanqueTeamSize]
  );

  // ---- bots sélectionnés (hors pétanque)
  const [botIds, setBotIds] = React.useState<string[]>([]);
  const toggleBot = (id: string) => setBotIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ❌ PÉTANQUE = AUCUN BOT (sécurité absolue)
  React.useEffect(() => {
    if (!isPetanque) return;
    setBotIds([]);
  }, [isPetanque]);

  const totalSelectedIds = React.useMemo(() => {
    if (isPetanque) return Array.from(new Set([...playerIds])).filter(Boolean);
    return Array.from(new Set([...playerIds, ...botIds])).filter(Boolean);
  }, [playerIds, botIds, isPetanque]);

  // ✅ PÉTANQUE contraintes de roster
  const isPetanqueProfiles = isPetanque && petanqueEntry === "profiles";
  const isPetanqueTeams = isPetanque && petanqueEntry === "teams";

  const petanqueMinPlayers = petanqueTeamSize * 2;
  const petanqueMultipleOk = isPetanqueProfiles ? totalSelectedIds.length % petanqueTeamSize === 0 : true;
  const petanqueMinOk = isPetanqueProfiles ? totalSelectedIds.length >= petanqueMinPlayers : isPetanqueTeams ? teamsInput.length >= 2 : true;

  const teamModeReady = !isPetanque && participantKind === "teams"
    ? (teamsInput || []).filter((t: any) => String(t?.name || "").trim()).length >= 2
    : true;
  const minPlayersOk = isPetanque ? petanqueMinOk : participantKind === "teams" ? teamModeReady : totalSelectedIds.length >= 2;


// ✅ PÉTANQUE — nombre d’équipes + normalisation assignations
const petanqueTeamsCount = React.useMemo(() => {
  return isPetanque ? petanqueTeamCountFromSelected(totalSelectedIds.length) : 0;
}, [isPetanque, totalSelectedIds.length, petanqueTeamSize]);

const petanqueTeamsCountEffective = React.useMemo(() => {
  if (!isPetanque) return 0;
  return isPetanqueTeams ? (teamsInput?.length || 0) : petanqueTeamsCount;
}, [isPetanque, isPetanqueTeams, teamsInput, petanqueTeamsCount]);

React.useEffect(() => {
  if (!isPetanqueProfiles) return;

  // clamp équipe active
  setActiveTeamIdx((prev) => {
    const max = Math.max(0, petanqueTeamsCount - 1);
    const v = Number.isFinite(prev as any) ? (prev as any) : 0;
    return Math.max(0, Math.min(max, v));
  });

  // noms par défaut
  setTeamNames((prev) => {
    const next = { ...(prev || {}) };
    for (let i = 0; i < petanqueTeamsCount; i++) {
      if (!next[i]) next[i] = `Équipe ${i + 1}`;
    }
    // nettoyage
    Object.keys(next).forEach((k) => {
      const idx = Number(k);
      if (!Number.isFinite(idx) || idx < 0 || idx >= petanqueTeamsCount) delete next[k];
    });
    return next;
  });

  // assignations
  setTeamOfPlayer((prev) => normalizePetanqueAssignments(totalSelectedIds, prev || {}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isPetanqueProfiles, petanqueTeamsCount, petanqueTeamSize, totalSelectedIds.join("|")]);

const petanqueTeamsReady = React.useMemo(() => {
  if (!isPetanque) return true;

  // ✅ MODE "Par équipes" : on valide les équipes saisies
  if (isPetanqueTeams) {
    const ts = Number(petanqueTeamSize) || 1;
    if ((teamsInput?.length || 0) < 2) return false;
    for (const t of teamsInput || []) {
      const nm = String(t?.name || "").trim();
      if (!nm) return false;
      const players = Array.isArray(t?.players) ? t.players : [];
      const filled = players.map((x) => String(x ?? "").trim()).filter(Boolean);
      if (filled.length !== ts) return false;
    }
    return true;
  }

  // ✅ MODE "Par profils" : on valide la composition issue des assignations
  if (!isPetanqueProfiles) return false;
  const { teams, ts, teamCount } = buildPetanqueTeamsFromAssignments(totalSelectedIds);

  if (teamCount < 2) return false;
  if (teams.some((t: any) => (t.memberIds?.length || 0) !== ts)) return false;

  // chaque joueur sélectionné doit être dans exactement une équipe
  const flat = teams.flatMap((t: any) => t.memberIds || []);
  const uniq = new Set(flat);
  if (uniq.size !== flat.length) return false;
  if (uniq.size !== totalSelectedIds.length) return false;

  return true;
}, [isPetanque, isPetanqueTeams, isPetanqueProfiles, teamsInput, totalSelectedIds.join("|"), teamOfPlayer, petanqueTeamSize, teamNames]);

  // ---- Format tournoi / ligue
  const [format, setFormat] = React.useState<TourFormat>(isLeague ? "round_robin" : "single_ko");
  const [bestOf, setBestOf] = React.useState<BestOf>(3);

  React.useEffect(() => {
    if (isLeague) setFormat("round_robin");
  }, [isLeague]);

  // ✅ NEW : RR / Poules
  const [rrRounds, setRrRounds] = React.useState(1); // 1..5
  const [playersPerGroup, setPlayersPerGroup] = React.useState<string>("4"); // libre
  const [qualifiersPerGroup, setQualifiersPerGroup] = React.useState(2);

  // ✅ NEW : Bracket Auto / Manuel
  const [bracketAuto, setBracketAuto] = React.useState(true);
  const [bracketTarget, setBracketTarget] = React.useState<string>("");

  // ✅ auto-fill bots (désactivé en Pétanque)
  const [autoFillBots, setAutoFillBots] = React.useState(true);
  React.useEffect(() => {
    if (!isPetanque) return;
    setAutoFillBots(false);
  }, [isPetanque]);

  // ✅ seedMode + repechage
  const [seedMode, setSeedMode] = React.useState<"random" | "byLevel">("random");
  const [repechageEnabled, setRepechageEnabled] = React.useState(false);

  // ---- Params match X01
  const defaultStart =
    (store?.settings?.defaultX01 as any) === 301 ||
    (store?.settings?.defaultX01 as any) === 501 ||
    (store?.settings?.defaultX01 as any) === 701 ||
    (store?.settings?.defaultX01 as any) === 901
      ? (store.settings.defaultX01 as 301 | 501 | 701 | 901)
      : 501;

  const [x01Start, setX01Start] = React.useState<301 | 501 | 701 | 901>(defaultStart);
  const [x01In, setX01In] = React.useState<"simple" | "double" | "master">("simple");
  const [x01Out, setX01Out] = React.useState<"simple" | "double" | "master">(store?.settings?.doubleOut ? "double" : "simple");
  const [leagueFormat, setLeagueFormat] = React.useState<"simple" | "return" | "free" | "multi">("simple");
  const isLeagueMulti = isLeague && leagueFormat === "multi";
  const isLeagueFree = isLeague && leagueFormat === "free";
  const isParticipantlessLeague = isLeagueMulti || isLeagueFree;
  const [leagueMultiPaidPlaces, setLeagueMultiPaidPlaces] = React.useState(6);
  const [leagueMultiFirstPoints, setLeagueMultiFirstPoints] = React.useState(10);
  const parsedLeagueMultiPoints = React.useMemo(() => {
    const places = Math.max(1, Math.min(20, Math.floor(Number(leagueMultiPaidPlaces) || 6)));
    const first = Math.max(1, Math.min(99, Math.floor(Number(leagueMultiFirstPoints) || 10)));
    return Array.from({ length: places }, (_, idx) => Math.max(1, first - idx * 2));
  }, [leagueMultiPaidPlaces, leagueMultiFirstPoints]);

  // ✅ create gate
  const canCreate = !!name.trim() && !!mode && (isParticipantlessLeague || minPlayersOk) && (!isPetanque || isParticipantlessLeague || (petanqueMultipleOk && petanqueTeamsReady));

  const TYPE_INFO: Record<TourFormat, string> = {
    single_ko: "Tableau KO : une défaite = élimination. Rapide et clair.",
    double_ko: "Double élimination : il faut 2 défaites pour sortir.",
    round_robin: "Championnat : tout le monde se rencontre, classement par victoires/points.",
    groups_ko: "Poules + KO : phase groupes (poules), puis tableau final KO (qualifiés).",
  };

  const OTHER_INFO = {
    players: isPetanque
      ? "Sélectionne des profils humains. Minimum = 2 équipes. Total joueurs = multiple de la taille d’équipe."
      : "Sélectionne des profils humains et/ou des BOTS IA. Minimum 2 joueurs pour créer.",
    botsSelect: "Sélection BOTS : bots PRO (assets) + bots créés via Profiles → bots.",
    bestOf: "Best-of = nombre de manches à gagner. BO3 = 2 manches gagnantes, BO5 = 3, etc.",
    seedMode: "Têtes de série : Aléatoire mélange au départ. Par niveau trie par avg3D (du meilleur au moins bon).",
    repechage: "Repêchage : ajoute une phase de consolation si possible (selon format / engine).",
    maxPlayers: "Optionnel : si tu as énormément de profils, tu peux fixer un max. Vide = illimité.",
    rrRounds: "Nombre de tours en Championnat / Poules : 1 = chacun rencontre chacun une fois (dans sa poule).",
    groups: "Joueurs par poule : l’app calcule automatiquement le nombre de poules (ceil(N / joueursParPoule)).",
    bracket: isPetanque
      ? "Bracket KO : Auto = prochaine puissance de 2 en nombre d’équipes (byes). Manuel = nombre d’équipes (8, 16, 24…)."
      : "Bracket KO : Auto = prochaine puissance de 2 (byes). Manuel = taille libre (ex: 24, 32, 48…).",
    autofill: "Auto-fill BOTS : complète automatiquement si tu n’as pas assez de joueurs (désactivé en Championnat).",
    petanqueTeam: "Composition Pétanque : Simple (1), Doublette (2), Triplette (3), Quadrette (4). Le total joueurs doit être un multiple.",
  };

  // ✅ engine V2: viewKind attendu
  function viewKindFromFormat(fmt: TourFormat) {
    if (fmt === "single_ko") return "single_ko";
    if (fmt === "double_ko") return "double_ko";
    if (fmt === "round_robin") return "round_robin";
    return "groups_ko";
  }

  function buildStagesForEngine(fmt: TourFormat, nPlayers: number) {
    const seeding = seedMode === "byLevel" ? "ordered" : "random";
    const rounds = Math.max(1, Number(rrRounds) || 1);

    if (fmt === "round_robin") {
      return [
        {
          id: "rr",
          type: "round_robin",
          role: "groups",
          name: "Championnat",
          groups: 1,
          rounds,
          qualifiersPerGroup: 0,
          seeding,
        },
      ];
    }

    if (fmt === "groups_ko") {
      const ppg = clamp(Number(playersPerGroup) || 4, 2, 9999);
      const groups = Math.max(1, Math.ceil(Math.max(2, nPlayers) / ppg));
      const q = clamp(Number(qualifiersPerGroup) || 2, 1, Math.max(1, ppg));

      const stages: any[] = [
        {
          id: "rr",
          type: "round_robin",
          role: "groups",
          name: "Poules",
          groups,
          rounds,
          qualifiersPerGroup: q,
          seeding,
        },
        { id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding },
      ];

      if (repechageEnabled) {
        stages.push({ id: "rep", type: "single_elim", role: "repechage", name: "Repêchage", seeding });
      }
      return stages;
    }

    if (fmt === "double_ko") {
      return [
        { id: "w", type: "single_elim", role: "ko", name: "Winners Bracket", seeding },
        { id: "l", type: "single_elim", role: "repechage", name: "Losers Bracket", seeding },
        { id: "gf", type: "single_elim", role: "ko", name: "Grande Finale", seeding },
      ];
    }

    const stages: any[] = [{ id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding }];
    if (repechageEnabled) {
      stages.push({ id: "rep", type: "single_elim", role: "repechage", name: "Repêchage", seeding });
    }
    return stages;
  }

  function computeAvgTarget(selected: any[]) {
    if (!selected?.length) return 50;
    const s = selected.reduce((acc, p) => acc + (Number(p?.avg3D || 0) || 0), 0);
    return s / selected.length;
  }


// --------------------------------------------
// ✅ PÉTANQUE — équipes (helpers)
// --------------------------------------------

function petanqueTeamCountFromSelected(nPlayers: number) {
  const ts = Number(petanqueTeamSize) || 1;
  return Math.max(0, Math.floor(Math.max(0, nPlayers) / ts));
}

function buildPetanqueTeamsFromAssignments(selectedIds: string[]) {
  const ts = Number(petanqueTeamSize) || 1;
  const teamCount = petanqueTeamCountFromSelected(selectedIds.length);

  const membersByTeam: string[][] = Array.from({ length: teamCount }, () => []);
  for (const pid of selectedIds) {
    const t = teamOfPlayer?.[pid];
    if (Number.isFinite(t) && t >= 0 && t < teamCount) membersByTeam[t].push(pid);
  }

  // fallback: si certains joueurs ne sont pas assignés (ou hors range), on complète
  const already = new Set(membersByTeam.flat());
  const unassigned = selectedIds.filter((id) => !already.has(id));
  for (const pid of unassigned) {
    let placed = false;
    for (let t = 0; t < teamCount; t++) {
      if (membersByTeam[t].length < ts) {
        membersByTeam[t].push(pid);
        placed = true;
        break;
      }
    }
    if (!placed && teamCount > 0) {
      membersByTeam[Math.min(teamCount - 1, 0)].push(pid);
    }
  }

  const teams = membersByTeam.map((memberIds, idx) => ({
    idx,
    id: `team_${idx + 1}`,
    name: teamNames?.[idx] || `Équipe ${idx + 1}`,
    memberIds: memberIds.slice(0, ts),
  }));

  return { teams, ts, teamCount };
}

function normalizePetanqueAssignments(selectedIds: string[], prev: Record<string, number>) {
  const ts = Number(petanqueTeamSize) || 1;
  const teamCount = petanqueTeamCountFromSelected(selectedIds.length);

  // 1) garder uniquement selected + range ok
  const next: Record<string, number> = {};
  const counts = Array.from({ length: teamCount }, () => 0);

  for (const pid of selectedIds) {
    const t = prev?.[pid];
    if (Number.isFinite(t) && t >= 0 && t < teamCount) {
      next[pid] = t;
      counts[t]++;
    }
  }

  const teamHasSpace = (t: number) => t >= 0 && t < teamCount && counts[t] < ts;

  // 2) désengorger équipes trop pleines
  for (const pid of selectedIds) {
    const t = next[pid];
    if (!Number.isFinite(t)) continue;
    if (t < 0 || t >= teamCount) continue;
    if (counts[t] <= ts) continue;

    // déplacer vers une autre équipe
    for (let k = 0; k < teamCount; k++) {
      if (k === t) continue;
      if (teamHasSpace(k)) {
        next[pid] = k;
        counts[t]--;
        counts[k]++;
        break;
      }
    }
  }

  // 3) assigner le reste (non assigné)
  for (const pid of selectedIds) {
    if (next[pid] != null) continue;

    const preferred = Number(activeTeamIdx) || 0;
    if (teamHasSpace(preferred)) {
      next[pid] = preferred;
      counts[preferred]++;
      continue;
    }

    let placed = false;
    for (let t = 0; t < teamCount; t++) {
      if (teamHasSpace(t)) {
        next[pid] = t;
        counts[t]++;
        placed = true;
        break;
      }
    }
    if (!placed && teamCount > 0) {
      next[pid] = Math.min(teamCount - 1, 0);
    }
  }

  return next;
}

  // ✅ KO sizing:
  // - hors pétanque: joueurs
  // - pétanque: équipes => pow2 équipes * teamSize, ou manuel nb équipes * teamSize
  
// ✅ KO sizing:
// - hors pétanque: entrants = joueurs
// - pétanque: entrants = équipes
//   Auto = prochaine puissance de 2 en équipes (byes), Manuel = nb équipes
function computeDesiredSize(currentEntrantsCount: number) {
  if (format === "round_robin") return null;

  if (!isPetanque) {
    if (bracketAuto) return nextPow2(currentEntrantsCount);
    const manual = Math.floor(numFromText(bracketTarget));
    if (Number.isFinite(manual) && manual >= 2) return manual;
    return nextPow2(currentEntrantsCount);
  }

  const teams = Math.max(1, Math.floor(currentEntrantsCount));

  if (bracketAuto) return nextPow2(teams);

  const manualTeams = Math.floor(numFromText(bracketTarget));
  if (Number.isFinite(manualTeams) && manualTeams >= 2) return manualTeams;

  return nextPow2(teams);
}

  
async function createTournament() {
  if (!canCreate) return;

  // ✅ PÉTANQUE : sécurité (aucun bot, seed random)
  const effectiveSeedMode = isPetanque ? "random" : seedMode;

  const cap = Math.floor(numFromText(maxPlayers));
  const capEnabled = Number.isFinite(cap) && cap > 1;

  const selectedProfiles = profiles.filter((p: any) => playerIds.includes(String(p.id)));
  const profileById = Object.fromEntries(selectedProfiles.map((p: any) => [String(p.id), p]));

  // --------------------------------------------
  // ✅ LIGUES SANS PARTICIPANTS AU DÉMARRAGE
  // - Saison libre : matchs ajoutés au fil de l'eau, sans calendrier imposé.
  // - Ligue MULTI : parties libres ajoutées ensuite avec barème par classement.
  // --------------------------------------------
  if (isParticipantlessLeague) {
    const rules = {
      sport: forceMode || mode || "darts",
      leagueFormat: isLeagueMulti ? "multi" : "free",
      scoringMode: isLeagueMulti ? "rank_points" : "match_points",
      rankPoints: isLeagueMulti ? parsedLeagueMultiPoints : [],
      paidPlaces: isLeagueMulti ? Math.max(1, Number(leagueMultiPaidPlaces) || parsedLeagueMultiPoints.length) : 0,
      participantsMode: "dynamic",
      freeMatches: true,
      calendarMode: isLeagueMulti ? "none" : "free",
      canAttachExternalMatches: true,
    };

    const tour: Tournament = createTournamentDraft({
      name: name.trim(),
      source: source as any,
      sport: forceMode || mode || "darts",
      kind: competitionKind,
      ownerProfileId: (store as any)?.activeProfileId ?? null,
      players: [],
      game: { mode: mode || forceMode || "x01", rules },
      stages: [],
      viewKind: "round_robin",
      repechage: { enabled: false },
      meta: {
        format: isLeagueMulti ? "league_multi" : "league_free",
        leagueFormat: isLeagueMulti ? "multi" : "free",
        scoringMode: isLeagueMulti ? "rank_points" : "match_points",
        rankPoints: isLeagueMulti ? parsedLeagueMultiPoints : [],
        participantsMode: "dynamic",
        freeMatches: true,
        calendarMode: isLeagueMulti ? "none" : "free",
        forceMode,
        source,
        competitionKind,
      },
    } as any);

    (tour as any).identity = {
      logoDataUrl: competitionAvatar || null,
      logoUrl: competitionAvatar || null,
      avatarDataUrl: competitionAvatar || null,
      coverDataUrl: competitionCover || null,
      bannerDataUrl: competitionCover || null,
    };
    (tour as any).logoDataUrl = competitionAvatar || null;
    (tour as any).avatarDataUrl = competitionAvatar || null;
    (tour as any).coverDataUrl = competitionCover || null;
    (tour as any).bannerDataUrl = competitionCover || null;
    (tour as any).sport = forceMode || mode || "darts";
    (tour as any).competitionSport = normalizeModeToTournamentMode(forceMode || mode || "darts");
    (tour as any).kind = competitionKind;
    (tour as any).type = competitionKind;
    (tour as any).competitionKind = competitionKind;
    (tour as any).updatedAt = Date.now();
    (tour as any).createdAt = (tour as any).createdAt || Date.now();

    // Une ligue libre/multi doit aussi être visible immédiatement dans À reprendre / En cours.
    (tour as any).status = "running";

    const matches: any[] = [];

    try {
      upsertTournamentLocal(tour as any);
      upsertMatchesForTournamentLocal(tour.id, matches as any);
      if (source === "online") {
        void saveOnlineCompetition({
          name: tour.name,
          sport: forceMode || String(mode || "darts"),
          mode: String(mode || forceMode || "x01"),
          kind: competitionKind,
          status: tour.status,
          tournament: tour,
          matches: matches as any,
          participants: [],
          settings: { ...rules, identity: (tour as any).identity || null },
        }).catch((err) => console.error("[TournamentCreate] online save failed:", err));
      }
    } catch (e) {
      console.error("[TournamentCreate] persist failed:", e);
    }

    go("tournament_view", { id: tour.id, forceMode, source, competitionKind });
    return;
  }

  // --------------------------------------------
  // ✅ MODE PÉTANQUE : on transforme les joueurs en ÉQUIPES (entrants = équipes)
  // --------------------------------------------
  if (isPetanque) {
    const ts = Number(petanqueTeamSize) || 1;

    // ✅ MODE "Par équipes" : on crée les entrants à partir de teamsInput (sans profils)
    const teamEntrants = isPetanqueTeams
      ? (teamsInput || []).map((t: any, idx: number) => {
          const teamId = String(t?.id || `team_${idx + 1}`);
          const teamName = (String(t?.name || "").trim() || `Équipe ${idx + 1}`).trim();
          const players = normalizeTeamPlayers(t?.players || []);
          const members = players.slice(0, ts).map((nm: string, k: number) => {
            const safeName = String(nm || "").trim() || `Joueur ${k + 1}`;
            return {
              id: `${teamId}_p${k + 1}`,
              name: safeName,
              avatarDataUrl: null,
              avg3D: 0,
              stars: 0,
            };
          });

          return {
            id: teamId,
            name: teamName,
            avatarDataUrl: null,
            source: "team",
            isBot: false,
            avg3D: 0,
            stars: 0,
            members,
          };
        })
      : (() => {
          // ✅ MODE "Par profils" : regroupement par assignation
          const selectedIds = Array.from(new Set([...playerIds])).filter(Boolean);

          // cap (optionnel) côté pétanque : cap sur JOUEURS -> on tronque puis on normalise
          let effectiveSelectedIds = selectedIds;
          if (capEnabled && effectiveSelectedIds.length > cap) {
            effectiveSelectedIds = shuffle(effectiveSelectedIds).slice(0, cap);
          }

          const teamCount = petanqueTeamCountFromSelected(effectiveSelectedIds.length);
          const normalizedAssignments = normalizePetanqueAssignments(effectiveSelectedIds, teamOfPlayer || {});
          const membersByTeam: string[][] = Array.from({ length: teamCount }, () => []);
          for (const pid of effectiveSelectedIds) {
            const t = normalizedAssignments[pid];
            if (Number.isFinite(t) && t >= 0 && t < teamCount) membersByTeam[t].push(pid);
          }

          return membersByTeam.map((memberIds, idx) => {
            const members = memberIds.slice(0, ts).map((pid) => {
              const pr = profileById[String(pid)];
              const avg = Number(avgMap?.[String(pid)] ?? 0) || 0;
              return {
                id: String(pid),
                name: pr?.name || "Joueur",
                avatarDataUrl: pr?.avatar || null,
                avg3D: avg,
                stars: starsFromAvg3D(avg),
              };
            });

            const avgTeam =
              members.length ? members.reduce((acc: number, m: any) => acc + (Number(m.avg3D) || 0), 0) / members.length : 0;

            return {
              id: `team_${idx + 1}`,
              name: (teamNames?.[idx] || `Équipe ${idx + 1}`).trim() || `Équipe ${idx + 1}`,
              avatarDataUrl: members?.[0]?.avatarDataUrl || null,
              source: "team",
              isBot: false,
              avg3D: avgTeam,
              stars: starsFromAvg3D(avgTeam),
              members,
            };
          });
        })();

    // ✅ seed : aléatoire (toujours en pétanque)
    const seededTeams =
      effectiveSeedMode === "byLevel"
        ? teamEntrants.slice().sort((a: any, b: any) => Number(b.avg3D || 0) - Number(a.avg3D || 0))
        : teamEntrants;

    const entrants = seededTeams;

    // ✅ desiredSize / bracket : exprimé en NOMBRE D'ÉQUIPES
    const desiredSize = computeDesiredSize(entrants.length);

    // ✅ formats autorisés uniquement
    let effectiveFormat: TourFormat = format;
    if (effectiveFormat === "double_ko") effectiveFormat = "single_ko";

    const stages = buildStagesForEngine(effectiveFormat, entrants.length);
    const viewKind = viewKindFromFormat(effectiveFormat);

    const rules = {
      targetScore: 13,
      teamSize: petanqueTeamSize, // 1/2/3/4
      teamLabel:
        petanqueTeamSize === 1 ? "simple" : petanqueTeamSize === 2 ? "doublette" : petanqueTeamSize === 3 ? "triplette" : "quadrette",
      repechageEnabled: !!repechageEnabled,
      seedMode: "random",
      rrRounds: Math.max(1, Number(rrRounds) || 1),
      leagueFormat,
      playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0, // = équipes par poule
      qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0), // = équipes qualifiées/poule
      bracketAuto: !!bracketAuto,
      bracketTarget: Math.floor(numFromText(bracketTarget)) || 0, // nb équipes si manuel
      desiredSize: desiredSize || 0, // nb équipes visé
      maxPlayers: capEnabled ? cap : 0, // cap joueurs (optionnel)
      teams: entrants.map((t: any) => ({
        id: t.id,
        name: t.name,
        memberIds: (t.members || []).map((m: any) => String(m.id)),
      })),
    };

    const tour: Tournament = createTournamentDraft({
      name: name.trim(),
      source: source as any,
      sport: forceMode || mode || "darts",
      kind: competitionKind,
      ownerProfileId: (store as any)?.activeProfileId ?? null,

      // ✅ ENGINE voit des "players" = équipes
      players: entrants.map((t: any) => ({
        id: String(t.id),
        name: t.name || "Équipe",
        avatarDataUrl: t.avatarDataUrl || null,
        source: "team",
        isBot: false,
      })),

      game: { mode: "petanque", rules },
      stages,

      viewKind,
      repechage: { enabled: !!repechageEnabled },

      meta: {
        format: effectiveFormat,
        leagueFormat,
        seedMode: "random",
        repechageEnabled: !!repechageEnabled,
        rrRounds: Math.max(1, Number(rrRounds) || 1),
        playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
        qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
        bracketAuto: !!bracketAuto,
        bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
        desiredSize: desiredSize || 0, // nb équipes
        autoFillBots: false,
        maxPlayers: capEnabled ? cap : 0,
        forceMode,
        participantKind,
        isPetanque: true,
        petanqueTeamSize: petanqueTeamSize,
        petanqueTeams: entrants.map((t: any) => ({
          id: t.id,
          name: t.name,
          members: (t.members || []).map((m: any) => ({ id: m.id, name: m.name, avatarDataUrl: m.avatarDataUrl || null })),
        })),
      },
    } as any);

    (tour as any).identity = {
      logoDataUrl: competitionAvatar || null,
      logoUrl: competitionAvatar || null,
      avatarDataUrl: competitionAvatar || null,
      coverDataUrl: competitionCover || null,
      bannerDataUrl: competitionCover || null,
    };
    (tour as any).logoDataUrl = competitionAvatar || null;
    (tour as any).avatarDataUrl = competitionAvatar || null;
    (tour as any).coverDataUrl = competitionCover || null;
    (tour as any).bannerDataUrl = competitionCover || null;
    (tour as any).sport = forceMode || mode || "darts";
    (tour as any).competitionSport = normalizeModeToTournamentMode(forceMode || mode || "darts");
    (tour as any).kind = competitionKind;
    (tour as any).type = competitionKind;
    (tour as any).competitionKind = competitionKind;
    (tour as any).updatedAt = Date.now();
    (tour as any).createdAt = (tour as any).createdAt || Date.now();

    const matches = buildInitialMatches(tour);

    try {
      upsertTournamentLocal(tour as any);
      upsertMatchesForTournamentLocal(tour.id, matches as any);
      if (source === "online") {
        void saveOnlineCompetition({
          name: tour.name,
          sport: "petanque",
          mode: "petanque",
          kind: competitionKind,
          status: tour.status,
          tournament: tour,
          matches: matches as any,
          participants: (tour as any).players || [],
          settings: { ...((tour as any).game?.rules || {}), identity: (tour as any).identity || null },
        }).catch((err) => console.error("[TournamentCreate] online save failed:", err));
      }
    } catch (e) {
      console.error("[TournamentCreate] persist failed:", e);
    }

    go("tournament_view", { id: tour.id, forceMode, source, competitionKind });
    return;
  }

  // --------------------------------------------
  // ✅ AUTRES MODES : logique existante (joueurs + bots)
  // --------------------------------------------

  let merged = selectedProfiles.map((p: any) => {
    const avg = Number(avgMap?.[p.id] ?? 0) || 0;
    return {
      id: String(p.id),
      name: p.name || "Joueur",
      avatarDataUrl: p.avatar || null,
      source: "local",
      avg3D: avg,
      stars: starsFromAvg3D(avg),
    };
  });

  // ✅ hors pétanque : en mode ÉQUIPE, les entrants deviennent les équipes, pas les avatars joueurs.
  if (participantKind === "teams") {
    merged = (teamsInput || [])
      .map((t: any, idx: number) => ({
        id: String(t?.id || `team_${idx + 1}`),
        name: String(t?.name || "").trim() || `Équipe ${idx + 1}`,
        avatarDataUrl: t?.logoDataUrl || t?.avatarDataUrl || null,
        source: "team",
        isTeam: true,
        isBot: !!t?.isBotTeam,
        isBotTeam: !!t?.isBotTeam,
        botTeamLevel: t?.botTeamLevel ?? null,
        memberIds: Array.isArray(t?.playerIds) ? t.playerIds : [],
        members: Array.isArray(t?.members) ? t.members : [],
        avg3D: Number(t?.avg3D || (t?.botTeamLevel ? Number(t.botTeamLevel) * 20 : 0)) || 0,
        stars: Number(t?.stars || starsFromAvg3D(Number(t?.avg3D || (t?.botTeamLevel ? Number(t.botTeamLevel) * 20 : 0)) || 0)) || 0,
      }))
      .filter((t: any) => !!String(t?.name || "").trim());
  }

  // ✅ hors pétanque: possibilité d’ajouter des bots sélectionnés uniquement en SOLO.
  const selectedBots = participantKind === "teams" ? [] : botsCatalog
    .filter((b: any) => botIds.includes(String(b.id)))
    .map((b: any, idx: number) => ({
      id: `bot_${String(b.id)}_${idx}_${Date.now()}`,
      name: b.name,
      avatarDataUrl: b.avatar ?? null,
      source: "bot",
      isBot: true,
      avg3D: Number(b.avg3D) || 0,
      stars: starsFromAvg3D(Number(b.avg3D) || 0),
    }));
  merged = participantKind === "teams" ? merged : merged.concat(selectedBots);

  if (capEnabled && merged.length > cap) {
    merged = shuffle(merged).slice(0, cap);
  }

  const seededPlayers =
    effectiveSeedMode === "byLevel"
      ? merged.slice().sort((a: any, b: any) => Number(b.avg3D || 0) - Number(a.avg3D || 0))
      : merged;

  let finalPlayers = seededPlayers.slice();

  // ✅ hors pétanque: auto-fill bots possible
  const shouldFill = autoFillBots && format !== "round_robin";
  const desiredSize = computeDesiredSize(finalPlayers.length);

  if (shouldFill && desiredSize && finalPlayers.length < desiredSize) {
    const avgTarget = computeAvgTarget(finalPlayers);
    const need = Math.max(0, desiredSize - finalPlayers.length);
    const bots = pickBotsToFill(botsCatalog, need, avgTarget).map((b: any, idx: number) => ({
      id: `autobot_${String(b.id)}_${idx}_${Date.now()}`,
      name: b.name,
      avatarDataUrl: b.avatar ?? null,
      source: "bot",
      isBot: true,
      avg3D: Number(b.avg3D) || 0,
      stars: starsFromAvg3D(Number(b.avg3D) || 0),
    }));
    finalPlayers = finalPlayers.concat(bots);
  }

  const teamSoloMatches = Math.max(0, Math.floor(numFromText(teamConfrontationSoloCount)) || 0);
  const teamDuoMatches = Math.max(0, Math.floor(numFromText(teamConfrontationDuoCount)) || 0);
  const teamMultiMatches = Math.max(0, Math.floor(numFromText(teamConfrontationMultiCount)) || 0);
  const teamMultiPlayersPerSide = Math.max(3, Math.floor(numFromText(teamConfrontationMultiPlayers)) || 3);
  const teamConfrontation = participantKind === "teams" ? {
    enabled: true,
    format: teamConfrontationFormat,
    label: teamConfrontationFormat === "single"
      ? "Rencontre unique"
      : teamConfrontationFormat === "singles"
        ? "Simples par ligne"
        : teamConfrontationFormat === "singles_doubles"
          ? "Simples + doublettes"
          : `${teamSoloMatches} SOLO · ${teamDuoMatches} DUO · ${teamMultiMatches} MULTI`,
    playersPerTeam: Math.max(1, Math.floor(numFromText(teamConfrontationPlayers)) || Math.max(teamSoloMatches, teamDuoMatches * 2, teamMultiMatches * teamMultiPlayersPerSide, 1)),
    singlesMatches: teamConfrontationFormat === "custom" ? teamSoloMatches : (teamConfrontationFormat === "single" ? 0 : Math.max(1, Math.floor(numFromText(teamConfrontationPlayers)) || 1)),
    doublesMatches: teamConfrontationFormat === "custom" ? teamDuoMatches : (teamConfrontationFormat === "singles_doubles" ? Math.max(0, Math.floor(numFromText(teamConfrontationDoubles)) || 0) : 0),
    multiMatches: teamConfrontationFormat === "custom" ? teamMultiMatches : 0,
    multiPlayersPerSide: teamMultiPlayersPerSide,
    totalLines: teamConfrontationFormat === "custom" ? (teamSoloMatches + teamDuoMatches + teamMultiMatches) : undefined,
    winMode: teamConfrontationWinMode,
    points: { win: 3, draw: 1, loss: 0 },
  } : { enabled: false };

  // ✅ règles : X01 spécifiques + autres modes (+ baby-foot)
  const rules =
    mode === "babyfoot"
      ? {
          bestOf,
          repechageEnabled: !!repechageEnabled,
          seedMode: effectiveSeedMode,
          rrRounds: Math.max(1, Number(rrRounds) || 1),
          leagueFormat,
          playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
          qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
          bracketAuto: !!bracketAuto,
          bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
          desiredSize: desiredSize || 0,
          autoFillBots: false, // ⚠️ pas de bots auto en baby-foot (pour l'instant)
          maxPlayers: capEnabled ? cap : 0,
          teamConfrontation,

          // baby-foot specific
          sport: "babyfoot",
          matchMode: (forceMode === "babyfoot" ? "1v1" : "1v1"),
          target: 10,
        }
      : mode === "x01"
      ? {
          start: x01Start,
          doubleOut: x01Out === "double",
          inMode: x01In,
          outMode: x01Out,
          bestOf,
          repechageEnabled: !!repechageEnabled,
          seedMode: effectiveSeedMode,
          rrRounds: Math.max(1, Number(rrRounds) || 1),
          playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
          qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
          bracketAuto: !!bracketAuto,
          bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
          desiredSize: desiredSize || 0,
          autoFillBots: !!autoFillBots,
          maxPlayers: capEnabled ? cap : 0,
          teamConfrontation,
        }
      : {
          bestOf,
          repechageEnabled: !!repechageEnabled,
          seedMode: effectiveSeedMode,
          rrRounds: Math.max(1, Number(rrRounds) || 1),
          playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
          qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
          bracketAuto: !!bracketAuto,
          bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
          desiredSize: desiredSize || 0,
          autoFillBots: !!autoFillBots,
          maxPlayers: capEnabled ? cap : 0,
          teamConfrontation,
        };

  const stages = buildStagesForEngine(format, finalPlayers.length);
  const viewKind = viewKindFromFormat(format);

  const tour: Tournament = createTournamentDraft({
    name: name.trim(),
    source: source as any,
    sport: forceMode || mode || "darts",
    kind: competitionKind,
    ownerProfileId: (store as any)?.activeProfileId ?? null,

    players: finalPlayers.map((p: any) => ({
      id: String(p.id),
      name: p.name || "Joueur",
      avatarDataUrl: p.avatarDataUrl || null,
      source: p.source || "local",
      isBot: !!p.isBot,
      isTeam: !!p.isTeam,
      memberIds: Array.isArray(p.memberIds) ? p.memberIds : undefined,
    })),

    game: { mode, rules },
    stages,

    viewKind,
    repechage: { enabled: !!repechageEnabled },

    meta: {
      format,
      leagueFormat,
      seedMode: effectiveSeedMode,
      repechageEnabled: !!repechageEnabled,
      rrRounds: Math.max(1, Number(rrRounds) || 1),
      playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
      qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
      bracketAuto: !!bracketAuto,
      bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
      desiredSize: desiredSize || 0,
      autoFillBots: !!autoFillBots,
      maxPlayers: capEnabled ? cap : 0,
      forceMode,
      source,
      competitionKind,
      participantKind,
      teamConfrontation: participantKind === "teams" ? teamConfrontation : undefined,
      teams: participantKind === "teams" ? finalPlayers.map((t: any) => ({ id: t.id, name: t.name, memberIds: t.memberIds || [] })) : undefined,
      isPetanque,
      petanqueTeamSize: isPetanque ? petanqueTeamSize : undefined,
    },
  } as any);

  (tour as any).identity = {
    logoDataUrl: competitionAvatar || null,
    logoUrl: competitionAvatar || null,
    avatarDataUrl: competitionAvatar || null,
    coverDataUrl: competitionCover || null,
    bannerDataUrl: competitionCover || null,
  };
  (tour as any).logoDataUrl = competitionAvatar || null;
  (tour as any).avatarDataUrl = competitionAvatar || null;
  (tour as any).coverDataUrl = competitionCover || null;
  (tour as any).bannerDataUrl = competitionCover || null;

  // Un tournoi/une ligue créée avec ses affiches doit apparaître directement dans "En cours" / "À reprendre".
  // Le statut "draft" restait caché derrière le filtre Brouillons et donnait l'impression que la création avait échoué.
  (tour as any).status = "running";

  const matches = buildInitialMatches(tour);

  try {
    upsertTournamentLocal(tour as any);
    upsertMatchesForTournamentLocal(tour.id, matches as any);
    if (source === "online") {
      void saveOnlineCompetition({
        name: tour.name,
        sport: forceMode || String(mode || "darts"),
        mode: String(mode || forceMode || "x01"),
        kind: competitionKind,
        status: tour.status,
        tournament: tour,
        matches: matches as any,
        participants: (tour as any).players || [],
        settings: { ...((tour as any).game?.rules || {}), identity: (tour as any).identity || null },
      }).catch((err) => console.error("[TournamentCreate] online save failed:", err));
    }
  } catch (e) {
    console.error("[TournamentCreate] persist failed:", e);
  }

  go("tournament_view", { id: tour.id, forceMode, source, competitionKind });
}

  const computedGroups = React.useMemo(() => {
  if (format !== "groups_ko") return 1;
  const ppg = clamp(Math.floor(numFromText(playersPerGroup)) || 4, 2, 9999);
  const entrants = isPetanque
    ? Math.max(2, petanqueTeamsCountEffective)
    : participantKind === "teams"
      ? Math.max(2, (teamsInput || []).length)
      : Math.max(2, totalSelectedIds.length);
  return Math.max(1, Math.ceil(entrants / ppg));
}, [format, playersPerGroup, totalSelectedIds.length, isPetanque, petanqueTeamsCountEffective, participantKind, teamsInput]);

  const desiredSizePreview = React.useMemo(() => {
  const entrants = isPetanque
    ? Math.max(2, petanqueTeamsCountEffective)
    : participantKind === "teams"
      ? Math.max(2, (teamsInput || []).length)
      : Math.max(2, totalSelectedIds.length);
  const d = computeDesiredSize(entrants);
  return d || 0;
}, [totalSelectedIds.length, bracketAuto, bracketTarget, format, isPetanque, petanqueTeamsCountEffective, participantKind, teamsInput]);

const petanqueTeamsUI = React.useMemo(() => {
  if (!isPetanque) return [];
  return buildPetanqueTeamsFromAssignments(totalSelectedIds).teams;
}, [isPetanque, totalSelectedIds.join("|"), teamOfPlayer, petanqueTeamSize, teamNames]);


  const guidedStepKeys = React.useMemo(() => {
    if (isLeague && leagueFormat === "multi") {
      return ["type", "identity", "format", "multiRules", "recap"];
    }
    if (isLeague && leagueFormat === "free") {
      return ["type", "identity", "format", "rules", "recap"];
    }
    if (isLeague) {
      return ["type", "identity", "format", "participantKind", "participants", "rules", "recap"];
    }
    return ["type", "identity", "participantKind", "participants", "format", "rules", "recap"];
  }, [isLeague, leagueFormat]);

  const guidedStepLabels: Record<string, string> = {
    type: "Type",
    identity: "Identité",
    format: "Format",
    participantKind: "Solo / équipe",
    participants: "Participants",
    rules: "Règles",
    multiRules: "Barème",
    recap: "Récap",
  };

  const guidedSteps = guidedStepKeys.map((k) => guidedStepLabels[k] || k);
  const guidedKindLabel = isLeague ? "ligue / championnat" : "tournoi";
  const guidedStepSafe = Math.max(0, Math.min(guidedSteps.length - 1, Number(guidedStep) || 0));
  const currentGuidedKey = guidedStepKeys[guidedStepSafe] || "type";
  const guidedStepTitle = (key: string, label: string) => `${Math.max(1, guidedStepKeys.indexOf(key) + 1)}. ${label}`;

  React.useEffect(() => {
    const btn = guidedTabRefs.current[guidedStepSafe];
    if (!btn) return;
    try {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } catch {
      try { btn.scrollIntoView({ block: "nearest", inline: "center" } as any); } catch {}
    }
  }, [guidedStepSafe, guidedStepKeys.join("|")]);

  React.useEffect(() => {
    setGuidedStep((prev) => Math.max(0, Math.min(guidedStepKeys.length - 1, Number(prev || 0))));
  }, [guidedStepKeys.length]);

  function goGuidedStep(delta: number) {
    setGuidedStep((prev) => Math.max(0, Math.min(guidedSteps.length - 1, Number(prev || 0) + delta)));
  }

  function setParticipantChoice(next: "solo" | "teams") {
    setParticipantKind(next);
    if (isPetanque) {
      if (next === "solo") {
        setPetanqueEntry("profiles");
        setPetanqueTeamSize(1);
      } else {
        setPetanqueEntry("teams");
        setPetanqueTeamSize((cur) => (Number(cur) > 1 ? cur : 2));
      }
      return;
    }

    // Tous les sports passent par un vrai sélecteur d'équipes du sport actif.
    // On ne crée plus automatiquement "Équipe 1 / Équipe 2" : l'utilisateur choisit ou crée ses teams.
    if (next === "teams") {
      setBotIds([]);
      reloadStoredTeams();
    }
  }

  function SourceIconChoice({ active, kind, onClick, accent = primary }: any) {
    const isOnline = kind === "online";
    const label = isOnline ? "ONLINE" : "LOCAL";
    const iconColor = active ? accent : "rgba(255,255,255,.86)";
    const p = {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2.15,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as const;

    const icon = isOnline ? (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <circle {...p} cx="12" cy="12" r="8" />
        <path {...p} d="M12 4c2.2 2.7 2.2 13.3 0 16" />
        <path {...p} d="M12 4c-2.2 2.7-2.2 13.3 0 16" />
        <path {...p} d="M4 12h16" />
        <path {...p} d="M6.2 7.5h11.6" />
        <path {...p} d="M6.2 16.5h11.6" />
      </svg>
    ) : (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <path {...p} d="M3.5 11.5 12 4.5l8.5 7" />
        <path {...p} d="M5.5 10.5V20h13v-9.5" />
        <path {...p} d="M9.5 20v-5h5v5" />
      </svg>
    );

    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          position: "relative",
          minHeight: 108,
          borderRadius: 20,
          border: active ? `1px solid ${accent}CC` : "1px solid rgba(255,255,255,.10)",
          background: active
            ? `radial-gradient(110% 120% at 50% 0%, ${accent}26, transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(8,8,12,.99))`
            : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          color: iconColor,
          boxShadow: active ? `0 0 24px ${accent}24, 0 18px 42px rgba(0,0,0,.48)` : "0 12px 28px rgba(0,0,0,.34)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          gap: 7,
          padding: "14px 10px 12px",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,.14)",
            background: active ? "rgba(0,0,0,.34)" : "rgba(0,0,0,.22)",
            color: iconColor,
            boxShadow: active ? `0 0 18px ${accent}50, inset 0 0 18px ${accent}14` : "inset 0 0 14px rgba(255,255,255,.035)",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            color: active ? accent : "rgba(255,255,255,.86)",
            fontSize: 13,
            lineHeight: 1,
            fontWeight: 1000,
            letterSpacing: .65,
            textTransform: "uppercase",
            textShadow: active ? `0 0 12px ${accent}44` : "none",
          }}
        >
          {label}
        </div>
        {active ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 24,
              height: 24,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: accent,
              color: "#181008",
              fontWeight: 1000,
              boxShadow: `0 0 16px ${accent}55`,
            }}
          >
            ✓
          </div>
        ) : null}
      </button>
    );
  }


  
function ParticipantIconChoice({ active, kind, onClick, accent = primary }: any) {
    const isTeam = kind === "teams";
    const label = isTeam ? "ÉQUIPE" : "SOLO";
    const iconColor = active ? accent : "rgba(255,255,255,.86)";
    const p = {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2.15,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as const;

    const icon = isTeam ? (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <circle {...p} cx="8" cy="8" r="3" />
        <circle {...p} cx="16" cy="8" r="3" />
        <path {...p} d="M3.8 19c.8-3.3 2.2-5 4.2-5s3.4 1.7 4.2 5" />
        <path {...p} d="M11.8 19c.8-3.3 2.2-5 4.2-5s3.4 1.7 4.2 5" />
      </svg>
    ) : (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <circle {...p} cx="12" cy="8" r="4" />
        <path {...p} d="M4.8 20c1.55-4 3.95-6 7.2-6s5.65 2 7.2 6" />
      </svg>
    );

    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          position: "relative",
          minHeight: 108,
          borderRadius: 20,
          border: active ? `1px solid ${accent}CC` : "1px solid rgba(255,255,255,.10)",
          background: active
            ? `radial-gradient(110% 120% at 50% 0%, ${accent}26, transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(8,8,12,.99))`
            : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          color: iconColor,
          boxShadow: active ? `0 0 24px ${accent}24, 0 18px 42px rgba(0,0,0,.48)` : "0 12px 28px rgba(0,0,0,.34)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          gap: 7,
          padding: "14px 10px 12px",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,.14)",
            background: active ? `radial-gradient(circle at 30% 0%, ${accent}33, rgba(0,0,0,.34))` : "rgba(0,0,0,.25)",
            boxShadow: active ? `0 0 18px ${accent}44` : "inset 0 0 18px rgba(0,0,0,.35)",
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: .5, color: active ? accent : "rgba(255,255,255,.86)" }}>
          {label}
        </div>
        {active ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 9,
              right: 9,
              width: 26,
              height: 26,
              borderRadius: 999,
              background: accent,
              color: "#191007",
              display: "grid",
              placeItems: "center",
              fontWeight: 1000,
              boxShadow: `0 0 14px ${accent}66`,
            }}
          >
            ✓
          </div>
        ) : null}
      </button>
    );
  }


function TeamCarouselTile({ team, index, onRemove, onClick, active = false, primary = THEME }: any) {
    const name = String(team?.name || `Équipe ${index + 1}`).trim() || `Équipe ${index + 1}`;
    const initial = name.slice(0, 1).toUpperCase() || "É";
    const logo = team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || null;
    const botLevel = Number(team?.botTeamLevel || 0) || 0;
    const ringScore = Number(team?.avg3D || (botLevel ? botLevel * 20 : 0)) || 0;
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 104,
          flex: "0 0 auto",
          display: "grid",
          justifyItems: "center",
          gap: 8,
          position: "relative",
          scrollSnapAlign: "start",
          border: "none",
          background: "transparent",
          color: "#fff",
          padding: 0,
          cursor: onClick ? "pointer" : "default",
        }}
        title={name}
      >
        <div style={{ width: 76, height: 86, position: "relative", display: "grid", placeItems: "end center", overflow: "visible" }}>
          {team?.isBotTeam && ringScore > 0 ? (
            <ProfileStarRing anchorSize={76} starSize={10} gapPx={-2} stepDeg={10} avg3d={ringScore} animateGlow />
          ) : null}
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              border: active ? `2px solid ${primary}` : `1px solid ${primary}AA`,
              background: `radial-gradient(circle at 35% 20%, ${primary}33, rgba(0,0,0,.42) 62%), rgba(0,0,0,.48)`,
              boxShadow: active ? `0 0 28px ${primary}66, inset 0 0 18px rgba(255,255,255,.05)` : `0 0 24px ${primary}30, inset 0 0 18px rgba(255,255,255,.04)`,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: 30,
              fontWeight: 1000,
              textShadow: `0 0 14px ${primary}55`,
              overflow: "hidden",
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              initial
            )}
          </div>
        </div>
        <div style={{ width: 104, fontSize: 11.5, fontWeight: 950, opacity: active ? 1 : .88, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {active ? (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: 12,
              width: 24,
              height: 24,
              borderRadius: 999,
              background: primary,
              color: "#191007",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 1000,
              boxShadow: `0 0 14px ${primary}66`,
              pointerEvents: "none",
            }}
          >
            ✓
          </div>
        ) : null}
        {onRemove ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove?.();
            }}
            style={{
              position: "absolute",
              top: -2,
              right: 12,
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(0,0,0,.58)",
              color: "rgba(255,255,255,.88)",
              display: "grid",
              placeItems: "center",
              fontSize: 15,
              fontWeight: 1000,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,.34)",
            }}
            title="Retirer l'équipe"
          >
            ×
          </span>
        ) : null}
      </button>
    );
  }

  function TeamAddTile({ onClick, primary = THEME }: any) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 104,
          flex: "0 0 auto",
          border: "none",
          background: "transparent",
          color: primary,
          cursor: "pointer",
          padding: 0,
          display: "grid",
          justifyItems: "center",
          gap: 8,
          scrollSnapAlign: "start",
        }}
        title="Créer une équipe"
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            border: `1px dashed ${primary}AA`,
            background: `radial-gradient(circle at 35% 20%, ${primary}1F, rgba(0,0,0,.38) 62%), rgba(0,0,0,.42)`,
            boxShadow: `0 0 22px ${primary}24`,
            display: "grid",
            placeItems: "center",
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 1000,
          }}
        >
          +
        </div>
        <div style={{ width: 104, fontSize: 11.5, fontWeight: 1000, textAlign: "center" }}>
          Équipe
        </div>
      </button>
    );
  }

  function pickCompetitionCoverFile(file?: File | null) {
    if (!file) {
      setCompetitionCoverImportDiag("Aucun fichier reçu");
      return;
    }

    const filename = String((file as any).name || "couverture");
    const sizeKo = Math.round((Number((file as any).size || 0) || 0) / 1024);
    setCompetitionCoverImportDiag(`Lecture · ${filename} · ${sizeKo} Ko`);

    // Aperçu immédiat dès la sélection : on affiche un blob local sans attendre FileReader.
    try {
      const instantUrl = URL.createObjectURL(file);
      setCompetitionCover(instantUrl);
    } catch (err) {
      console.warn("[TournamentCreate] cover objectURL preview failed", err);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result || !result.startsWith("data:image")) {
        setCompetitionCoverImportDiag(`Erreur · image illisible · ${filename}`);
        return;
      }
      setCompetitionCover(result);
      setCompetitionCoverImportDiag(`OK · ${filename} · aperçu affiché`);
    };
    reader.onerror = () => {
      setCompetitionCoverImportDiag(`Erreur FileReader · ${filename}`);
    };
    reader.readAsDataURL(file);
  }

  function handleCompetitionCoverInput(e: any) {
    const input = e?.currentTarget || e?.target;
    const file = input?.files?.[0] || null;
    pickCompetitionCoverFile(file);
    // Important : on ne vide PAS input.value avant la lecture, sinon certains navigateurs perdent le fichier.
  }

  function CoverPickerCard() {
    const hasCover = typeof competitionCover === "string" && competitionCover.length > 0;

    return (
      <button
        type="button"
        data-competition-identity-card="cover-picker"
        onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); setShowCompetitionCoverPicker(true); }}
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: 146,
          borderRadius: 22,
          border: hasCover ? `1px solid ${primary}BB` : "1px solid rgba(255,255,255,.11)",
          background: hasCover
            ? `radial-gradient(120% 135% at 50% 0%, ${primary}20, transparent 58%), linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025))`
            : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          color: hasCover ? primary : "rgba(255,255,255,.86)",
          boxShadow: hasCover ? `0 0 24px ${primary}24, 0 18px 42px rgba(0,0,0,.48)` : "0 12px 28px rgba(0,0,0,.34)",
          padding: 10,
          display: "grid",
          alignContent: "center",
          gap: 8,
          textAlign: "center",
          cursor: "pointer",
        }}
        title="Choisir une couverture"
      >
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${hasCover ? primary + "77" : "rgba(255,255,255,.12)"}`, boxShadow: hasCover ? `0 0 20px ${primary}22` : "inset 0 0 18px rgba(0,0,0,.35)", background: "rgba(0,0,0,.34)", minHeight: 72 }}>
          {hasCover ? (
            <img
              key={`cover-card-preview-${String(competitionCover).length}-${String(competitionCover).slice(0, 40)}`}
              src={competitionCover}
              alt="Aperçu couverture"
              draggable={false}
              style={{ display: "block", width: "100%", height: 72, objectFit: "cover" }}
              onError={() => setCompetitionCoverImportDiag("Image couverture non affichable")}
            />
          ) : (
            <div style={{ height: 72, display: "grid", placeItems: "center", color: primary }}>
              <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3.5 7h17v10H3.5z" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
                <path d="M7 14.5l3-3 2.2 2.2 1.5-1.5 3.3 3.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16.4" cy="9.4" r="1.15" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: hasCover ? "1fr 30px" : "1fr", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: .5, color: hasCover ? primary : "rgba(255,255,255,.86)", textAlign: "center" }}>
            COUVERTURE
          </div>
          {hasCover ? (
            <span
              aria-label="Couverture sélectionnée"
              title="Couverture sélectionnée"
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: `1px solid ${primary}66`,
                background: "rgba(0,0,0,.46)",
                color: primary,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 16px ${primary}22`,
                fontWeight: 1000,
              }}
            >
              ✓
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  function CompetitionCoverPickerModal({ selected, onPick, onClose, accent = primary }: any) {
    const hasSelected = typeof selected === "string" && selected.length > 0;
    const coverPresets = getCompetitionCoverPresets(mode);
    const [coverPresetPage, setCoverPresetPage] = React.useState(0);
    const coverPresetPageCount = Math.max(1, Math.ceil(coverPresets.length / COVER_PRESETS_PER_PAGE));
    const safeCoverPresetPage = Math.min(coverPresetPage, coverPresetPageCount - 1);
    const visibleCoverPresets = coverPresets.slice(
      safeCoverPresetPage * COVER_PRESETS_PER_PAGE,
      safeCoverPresetPage * COVER_PRESETS_PER_PAGE + COVER_PRESETS_PER_PAGE
    );

    React.useEffect(() => {
      setCoverPresetPage(0);
    }, [mode]);

    function clearCover(e?: any) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      onPick?.(null);
      setCompetitionCoverImportDiag("");
    }

    function pickPresetCover(src: string, label: string) {
      onPick?.(src);
      setCompetitionCoverImportDiag(`Bibliothèque · ${label}`);
    }

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          padding: 14,
          background: "rgba(0,0,0,.72)",
          display: "grid",
          placeItems: "center",
        }}
        onMouseDown={onClose}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            maxHeight: "86vh",
            overflowY: "auto",
            borderRadius: 22,
            border: `1px solid ${accent}44`,
            background: `radial-gradient(130% 135% at 0% 0%, ${accent}20, transparent 56%), linear-gradient(180deg, rgba(18,18,24,.98), rgba(6,6,9,.995))`,
            boxShadow: "0 24px 80px rgba(0,0,0,.78)",
            padding: 12,
            color: "#fff",
          }}
          className="dc-scroll-thin"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 14, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>
                Choisir une couverture
              </div>
              <div style={{ marginTop: 3, fontSize: 11.5, opacity: .72 }}>
                Bibliothèque intégrée de couvertures
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
              title="Fermer"
            >
              ×
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {hasSelected ? (
              <div style={{ borderRadius: 18, border: `1px solid ${accent}55`, background: "rgba(0,0,0,.24)", padding: 10, display: "grid", gap: 8 }}>
                <img
                  src={selected}
                  alt="Aperçu couverture sélectionnée"
                  draggable={false}
                  style={{ width: "100%", height: 118, objectFit: "cover", display: "block", borderRadius: 14, border: `1px solid ${accent}44` }}
                />
                <button
                  type="button"
                  onClick={clearCover}
                  style={{
                    justifySelf: "end",
                    display: "inline-grid",
                    gridAutoFlow: "column",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    border: `1px solid ${accent}66`,
                    background: "rgba(0,0,0,.46)",
                    color: accent,
                    padding: "7px 10px",
                    fontSize: 11.5,
                    fontWeight: 1000,
                    cursor: "pointer",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M9 7V5h6v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 10l1 10h8l1-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 12v5M14 12v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Retirer
                </button>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>
                Bibliothèque de couvertures
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {visibleCoverPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    onClick={() => pickPresetCover(preset.src, preset.label)}
                    style={{
                      borderRadius: 14,
                      border: selected === preset.src ? `1px solid ${accent}` : "1px solid rgba(255,255,255,.14)",
                      padding: 0,
                      overflow: "hidden",
                      background: "rgba(0,0,0,.32)",
                      cursor: "pointer",
                      boxShadow: selected === preset.src ? `0 0 18px ${accent}33` : "none",
                      display: "grid",
                    }}
                  >
                    <img src={preset.src} alt={preset.label} draggable={false} style={{ width: "100%", height: 76, objectFit: "cover", display: "block" }} />
                    <span style={{ padding: "7px 8px", fontSize: 11, fontWeight: 1000, color: selected === preset.src ? accent : "rgba(255,255,255,.82)", textAlign: "center" }}>
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
              {coverPresetPageCount > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCoverPresetPage((p: number) => Math.max(0, p - 1))}
                    disabled={safeCoverPresetPage <= 0}
                    aria-label="Page précédente"
                    title="Page précédente"
                    style={{
                      height: 34,
                      borderRadius: 999,
                      border: `1px solid ${accent}55`,
                      background: safeCoverPresetPage <= 0 ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.42)",
                      color: safeCoverPresetPage <= 0 ? "rgba(255,255,255,.32)" : accent,
                      fontWeight: 1000,
                      cursor: safeCoverPresetPage <= 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    ‹
                  </button>
                  <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 1000, color: "rgba(255,255,255,.72)" }}>
                    Page {safeCoverPresetPage + 1} / {coverPresetPageCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverPresetPage((p: number) => Math.min(coverPresetPageCount - 1, p + 1))}
                    disabled={safeCoverPresetPage >= coverPresetPageCount - 1}
                    aria-label="Page suivante"
                    title="Page suivante"
                    style={{
                      height: 34,
                      borderRadius: 999,
                      border: `1px solid ${accent}55`,
                      background: safeCoverPresetPage >= coverPresetPageCount - 1 ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.42)",
                      color: safeCoverPresetPage >= coverPresetPageCount - 1 ? "rgba(255,255,255,.32)" : accent,
                      fontWeight: 1000,
                      cursor: safeCoverPresetPage >= coverPresetPageCount - 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function TeamCreateModal({
    open,
    value,
    onChange,
    onCreate,
    onClose,
    primary = THEME,
    profiles = [],
    logo,
    onLogoChange,
    roster = [],
    onRosterChange,
    query = "",
    onQueryChange,
  }: any) {
    const [localLogoPreview, setLocalLogoPreview] = React.useState<string>(typeof logo === "string" && logo ? logo : "");
    const [logoImportDiag, setLogoImportDiag] = React.useState<string>("");
    const teamLogoObjectUrlRef = React.useRef<string | null>(null);
    const teamLogoInputRef = React.useRef<HTMLInputElement | null>(null);
    const teamLogoInputId = React.useMemo(() => `team-logo-input-${Math.random().toString(36).slice(2)}`, []);

    const teamLogoPreviewSrc = React.useMemo(() => {
      const local = typeof localLogoPreview === "string" ? localLogoPreview : "";
      const external = typeof logo === "string" ? logo : "";
      return local || external || "";
    }, [localLogoPreview, logo]);

    React.useEffect(() => {
      const incoming = typeof logo === "string" && logo ? logo : "";
      if (incoming) setLocalLogoPreview(incoming);
      else if (!teamLogoObjectUrlRef.current) setLocalLogoPreview("");
    }, [logo]);

    React.useEffect(() => {
      return () => {
        try {
          if (teamLogoObjectUrlRef.current) URL.revokeObjectURL(teamLogoObjectUrlRef.current);
        } catch {}
      };
    }, []);

    if (!open) return null;

    const list = (Array.isArray(profiles) ? profiles : [])
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        id: String(p.id),
        name: p?.name || p?.displayName || p?.pseudo || "Joueur",
        avatar: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || p?.photo || null,
      }))
      .filter((p: any) => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return true;
        return String(p?.name || "").toLowerCase().includes(q);
      });

    const selected = new Set((Array.isArray(roster) ? roster : []).map(String));

    async function pickLogo(file?: File | null) {
      if (!file) {
        setLogoImportDiag("Aucun fichier reçu");
        return;
      }
      const filename = String((file as any).name || "logo");
      const type = String((file as any).type || "").toLowerCase();
      const size = Number((file as any).size || 0);
      const ok = !type || type.startsWith("image/") || /\.(png|jpe?g|jfif|webp|gif|avif|svg|bmp|heic|heif)$/i.test(filename);
      if (!ok) {
        setLogoImportDiag(`Format refusé · ${filename}`);
        return;
      }

      setLogoImportDiag(`Lecture · ${filename} · ${Math.round(size / 1024)} Ko`);

      // 1) Aperçu garanti comme dans Profils > Teams : FileReader d'abord.
      // Le médaillon ne dépend plus uniquement de la compression canvas.
      let rawDataUrl = "";
      try {
        rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(file);
        });
        if (rawDataUrl && rawDataUrl.startsWith("data:image")) {
          setLocalLogoPreview(rawDataUrl);
          // Fallback persistable seulement si raisonnable; la compression remplace juste après.
          if (rawDataUrl.length < 220_000) onLogoChange?.(rawDataUrl);
        }
      } catch (err) {
        console.warn("[TournamentCreate] team logo FileReader preview failed", err);
      }

      // 2) ObjectURL en renfort pour affichage instantané sur navigateurs capricieux.
      try {
        if (teamLogoObjectUrlRef.current) URL.revokeObjectURL(teamLogoObjectUrlRef.current);
        const blobUrl = URL.createObjectURL(file);
        teamLogoObjectUrlRef.current = blobUrl;
        if (!rawDataUrl) setLocalLogoPreview(blobUrl);
      } catch (err) {
        console.warn("[TournamentCreate] team logo objectURL preview failed", err);
      }

      // 3) Version compressée pour sauvegarde anti-quota.
      try {
        const result = await fileToCompressedTeamLogoDataUrl(file);
        if (!result || !result.startsWith("data:image")) {
          setLogoImportDiag(rawDataUrl ? `Aperçu OK · compression impossible · ${filename}` : `Erreur · image illisible · ${filename}`);
          return;
        }
        try {
          if (teamLogoObjectUrlRef.current) URL.revokeObjectURL(teamLogoObjectUrlRef.current);
        } catch {}
        teamLogoObjectUrlRef.current = null;
        setLocalLogoPreview(result);
        onLogoChange?.(result);
        setLogoImportDiag(`OK · ${filename} · logo chargé`);
      } catch (err) {
        console.warn("[TournamentCreate] team logo compression failed", { filename, type, size, err });
        if (rawDataUrl && rawDataUrl.startsWith("data:image")) {
          setLogoImportDiag(`Aperçu OK · image non compressée · ${filename}`);
        } else {
          setLogoImportDiag(`Erreur import · ${filename}`);
        }
      }
    }

    function handleLogoInput(e: any) {
      const target = e?.currentTarget || e?.target;
      const file = target?.files?.[0] || null;
      pickLogo(file);
      // Important : on ne vide PAS target.value avant FileReader.
    }

    function togglePlayer(pid: string) {
      const id = String(pid || "");
      if (!id) return;
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onRosterChange?.(Array.from(next));
    }

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10020,
          background: "rgba(0,0,0,.74)",
          display: "grid",
          placeItems: "center",
          padding: 14,
        }}
        onMouseDown={onClose}
      >
        <div
          style={{
            width: "min(520px, 100%)",
            maxHeight: "min(78vh, 720px)",
            overflowY: "auto",
            borderRadius: 24,
            border: `1px solid ${primary}55`,
            background: `radial-gradient(130% 135% at 0% 0%, ${primary}22, transparent 58%), linear-gradient(180deg, rgba(20,20,26,.99), rgba(6,6,9,.995))`,
            boxShadow: "0 24px 80px rgba(0,0,0,.78)",
            padding: 16,
            color: "#fff",
          }}
          onMouseDown={(e: any) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ color: primary, fontSize: 13, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>
                Créer une équipe
              </div>
              <div style={{ marginTop: 3, fontSize: 11.5, opacity: .72 }}>
                Nom, logo et joueurs — équipe disponible pour ce sport.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(0,0,0,.36)",
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); teamLogoInputRef.current?.click?.(); }}
                onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); teamLogoInputRef.current?.click?.(); } }}
                style={{
                  position: "relative",
                  width: 86,
                  height: 86,
                  borderRadius: 999,
                  border: `1px solid ${primary}88`,
                  background: teamLogoPreviewSrc
                    ? `center / contain no-repeat url("${teamLogoPreviewSrc}"), radial-gradient(circle at 35% 20%, ${primary}35, rgba(0,0,0,.45) 62%), rgba(0,0,0,.48)`
                    : `radial-gradient(circle at 35% 20%, ${primary}35, rgba(0,0,0,.45) 62%), rgba(0,0,0,.48)`,
                  boxShadow: `0 0 24px ${primary}33, inset 0 0 18px rgba(255,255,255,.04)`,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  cursor: "pointer",
                  color: primary,
                  fontSize: 11,
                  fontWeight: 1000,
                  textAlign: "center",
                  padding: 0,
                }}
              >
                {teamLogoPreviewSrc ? (
                  <img
                    key={String(teamLogoPreviewSrc || "").slice(0, 100)}
                    src={teamLogoPreviewSrc}
                    alt="Logo équipe"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none", padding: 4 }}
                    onError={() => setLogoImportDiag("Image non affichable")}
                  />
                ) : (
                  <span style={{ pointerEvents: "none" }}>LOGO<br />ÉQUIPE</span>
                )}
                <input
                  id={teamLogoInputId}
                  ref={teamLogoInputRef}
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.jfif,.webp,.gif,.avif,.svg,.bmp,.heic,.heif"
                  aria-label="Choisir le logo de l’équipe"
                  onChange={handleLogoInput}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 3,
                  }}
                />
              </div>
              <label
                htmlFor={teamLogoInputId}
                onClick={(e: any) => { e.stopPropagation(); }}
                style={{
                  height: 28,
                  minWidth: 86,
                  borderRadius: 999,
                  border: `1px solid ${primary}66`,
                  background: "rgba(0,0,0,.38)",
                  color: primary,
                  fontSize: 10,
                  fontWeight: 1000,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  userSelect: "none",
                }}
              >
                Importer
              </label>
              {logoImportDiag ? (
                <div style={{ maxWidth: 92, fontSize: 9.5, lineHeight: 1.15, color: "rgba(255,255,255,.64)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {logoImportDiag}
                </div>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              <TextInput value={value} onChange={(e: any) => onChange?.(e.target.value)} placeholder="Nom de l’équipe" />
              <TextInput value={query} onChange={(e: any) => onQueryChange?.(e.target.value)} placeholder="Rechercher un joueur à ajouter" />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <RowTitle label={`Joueurs sélectionnés : ${selected.size}`} />
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
              {list.map((p: any) => {
                const active = selected.has(String(p.id));
                return (
                  <button
                    key={String(p.id)}
                    type="button"
                    onClick={() => togglePlayer(String(p.id))}
                    style={{
                      flex: "0 0 auto",
                      width: 82,
                      display: "grid",
                      justifyItems: "center",
                      gap: 6,
                      border: "none",
                      background: "transparent",
                      color: "#fff",
                      opacity: active ? 1 : .72,
                      cursor: "pointer",
                    }}
                    title={p.name}
                  >
                    <div style={{ position: "relative" }}>
                      <ProfileAvatar name={p.name} dataUrl={p.avatar || undefined} size={58} />
                      {active ? (
                        <span style={{ position: "absolute", right: -3, top: -3, width: 22, height: 22, borderRadius: 999, background: primary, color: "#191007", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 1000, boxShadow: `0 0 12px ${primary}66` }}>✓</span>
                      ) : null}
                    </div>
                    <span style={{ width: 82, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5, fontWeight: 900 }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.05)",
                color: "rgba(255,255,255,.86)",
                padding: "11px 12px",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onCreate}
              style={{
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
                color: "#1b1208",
                padding: "11px 12px",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Créer
            </button>
          </div>
        </div>
      </div>
    );
  }

function IdentityImageCard({ label, value, onChange, variant = "avatar", accent = primary, onOpenGallery }: any) {
    const isCover = variant === "cover";
    const [localPreview, setLocalPreview] = React.useState<string>(typeof value === "string" && value ? value : "");
    const [importDiag, setImportDiag] = React.useState<string>("");

    React.useEffect(() => {
      const incoming = typeof value === "string" && value ? value : "";
      setLocalPreview(incoming);
    }, [value]);

    function applyPreview(src: string, fileName = "image") {
      const clean = String(src || "");
      if (!clean) {
        setImportDiag(`Erreur · lecture vide · ${fileName}`);
        return;
      }
      setLocalPreview(clean);
      onChange?.(clean);
      setImportDiag(`OK · ${fileName} · aperçu affiché`);
    }

    function readPickedFile(file?: File | null) {
      if (!file) {
        setImportDiag("Aucun fichier reçu");
        return;
      }
      const fileName = String((file as any)?.name || "image");
      const fileSize = Number((file as any)?.size || 0);
      setImportDiag(`Lecture · ${fileName} · ${Math.round(fileSize / 1024)} Ko`);

      try {
        const blobUrl = URL.createObjectURL(file);
        setLocalPreview(blobUrl);
        onChange?.(blobUrl);
      } catch {}

      const reader = new FileReader();
      reader.onload = () => applyPreview(typeof reader.result === "string" ? reader.result : "", fileName);
      reader.onerror = () => setImportDiag(`Erreur FileReader · ${fileName}`);
      reader.readAsDataURL(file);
    }

    function handleInputFile(e: any) {
      const input = e?.currentTarget || e?.target;
      const file = input?.files?.[0] || null;
      readPickedFile(file);
      window.setTimeout(() => { try { input.value = ""; } catch {} }, 0);
    }

    const preview = localPreview || (typeof value === "string" ? value : "");
    const hasPreview = !!preview;

    const fallbackIcon = isCover ? (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 7h17v10H3.5z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 14.5l3-3 2.2 2.2 1.5-1.5 3.3 3.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16.4" cy="9.4" r="1.15" fill="currentColor" />
      </svg>
    ) : (
      <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M4.8 20c1.55-4 3.95-6 7.2-6s5.65 2 7.2 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );

    const cardStyle: React.CSSProperties = {
      position: "relative",
      overflow: "hidden",
      minHeight: 146,
      borderRadius: 22,
      border: hasPreview ? `1px solid ${accent}BB` : "1px solid rgba(255,255,255,.11)",
      background: hasPreview
        ? `radial-gradient(120% 135% at 50% 0%, ${accent}20, transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(8,8,12,.99))`
        : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
      color: hasPreview ? accent : "rgba(255,255,255,.86)",
      boxShadow: hasPreview ? `0 0 24px ${accent}24, 0 18px 42px rgba(0,0,0,.48)` : "0 12px 28px rgba(0,0,0,.34)",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      gap: 8,
      padding: "14px 10px 12px",
      WebkitTapHighlightColor: "transparent",
      textAlign: "center",
      userSelect: "none",
    };

    const content = (
      <>
        {isCover ? (
          <input
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.jfif,.webp,.gif,.avif,.svg,.bmp,.heic,.heif"
            aria-label="Choisir une couverture"
            onChange={handleInputFile}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: hasPreview ? 0.06 : 0.78,
                cursor: "pointer",
                zIndex: 80,
                fontSize: 10,
                color: "#fff",
                background: "rgba(0,0,0,.06)",
              }}
          />
        ) : null}

        {isCover && hasPreview ? (
          <img src={preview} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .62, pointerEvents: "none", zIndex: 0 }} />
        ) : null}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: isCover ? "100%" : 76,
            maxWidth: isCover ? 205 : 76,
            height: isCover ? 66 : 76,
            borderRadius: isCover ? 14 : 999,
            padding: isCover ? 0 : 4,
            border: hasPreview ? `1px solid ${accent}AA` : `1px solid ${accent}55`,
            background: hasPreview ? "rgba(0,0,0,.22)" : "rgba(0,0,0,.34)",
            boxShadow: hasPreview ? `0 0 22px ${accent}44` : `inset 0 0 18px rgba(0,0,0,.32), 0 0 14px ${accent}18`,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {hasPreview ? (
            <img src={preview} alt={label} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: isCover ? 13 : 999, background: "rgba(0,0,0,.35)", display: "block" }} onError={() => setImportDiag("Image non affichable")} />
          ) : (
            <div style={{ width: isCover ? 52 : 48, height: isCover ? 34 : 48, borderRadius: isCover ? 12 : 999, border: `1px solid ${accent}66`, display: "grid", placeItems: "center", background: "rgba(0,0,0,.28)", color: accent }}>
              {fallbackIcon}
            </div>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 1000, letterSpacing: .5, color: hasPreview ? accent : "rgba(255,255,255,.86)", pointerEvents: "none" }}>{label}</div>
        {importDiag ? <div style={{ position: "relative", zIndex: 1, maxWidth: "100%", fontSize: 9.5, lineHeight: 1.2, color: hasPreview ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.58)", opacity: .95, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{importDiag}</div> : null}
        {hasPreview ? (
          <button
            type="button"
            aria-label="Retirer"
            title="Retirer"
            onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); setLocalPreview(""); setImportDiag(""); onChange?.(null); }}
            style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.48)", color: "rgba(255,255,255,.86)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 1000, cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,.32)", zIndex: 120 }}
          >×</button>
        ) : null}
      </>
    );

    if (isCover) {
      return (
        <label data-competition-identity-card="cover" style={cardStyle}>
          {content}
        </label>
      );
    }

    return (
      <button
        type="button"
        data-competition-identity-card="logo"
        onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); onOpenGallery?.(); }}
        style={{ ...cardStyle, border: hasPreview ? `1px solid ${accent}BB` : "1px solid rgba(255,255,255,.11)" }}
      >
        {content}
      </button>
    );
  }

  function CompetitionLogoPickerModal({ selected, onPick, onClose, accent = primary }: any) {
    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(BABYFOOT_LEAGUE_BADGES.length / pageSize));
    const selectedIndex = selected ? BABYFOOT_LEAGUE_BADGES.findIndex((url) => url === selected) : -1;
    const [page, setPage] = React.useState(() => selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : 0);
    const start = page * pageSize;
    const badges = BABYFOOT_LEAGUE_BADGES.slice(start, start + pageSize);
    const canPrev = page > 0;
    const canNext = page < totalPages - 1;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          padding: 14,
          background: "rgba(0,0,0,.72)",
          display: "grid",
          placeItems: "center",
        }}
        onMouseDown={onClose}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            maxHeight: "86vh",
            overflow: "hidden",
            borderRadius: 22,
            border: `1px solid ${accent}44`,
            background: `radial-gradient(130% 135% at 0% 0%, ${accent}20, transparent 56%), linear-gradient(180deg, rgba(18,18,24,.98), rgba(6,6,9,.995))`,
            boxShadow: "0 24px 80px rgba(0,0,0,.78)",
            padding: 12,
            color: "#fff",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 14, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>
                Choisir un logo prédéfini
              </div>
              <div style={{ marginTop: 3, fontSize: 11.5, opacity: .72 }}>
                Banque baby-foot étendue à toutes les compétitions · Page {page + 1}/{totalPages}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
              title="Fermer"
            >
              ×
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                width: 34,
                height: 42,
                borderRadius: 14,
                border: `1px solid ${accent}44`,
                background: "rgba(255,255,255,.05)",
                color: accent,
                fontSize: 24,
                fontWeight: 1000,
                opacity: canPrev ? 1 : .35,
                cursor: canPrev ? "pointer" : "default",
              }}
            >
              ‹
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, maxHeight: "62vh", overflowY: "auto", padding: 2 }}>
              {badges.map((url, idx) => {
                const active = selected === url;
                const n = start + idx + 1;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onPick(url)}
                    title={`Logo ${n}`}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 999,
                      border: `2px solid ${active ? accent : "rgba(255,255,255,.16)"}`,
                      background: active ? `${accent}20` : "rgba(255,255,255,.04)",
                      boxShadow: active ? `0 0 20px ${accent}88` : "0 10px 20px rgba(0,0,0,.25)",
                      padding: 3,
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <img src={url} alt={`Logo ${n}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 999, display: "block" }} />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{
                width: 34,
                height: 42,
                borderRadius: 14,
                border: `1px solid ${accent}44`,
                background: "rgba(255,255,255,.05)",
                color: accent,
                fontSize: 24,
                fontWeight: 1000,
                opacity: canNext ? 1 : .35,
                cursor: canNext ? "pointer" : "default",
              }}
            >
              ›
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                onPick(null);
                onClose();
              }}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.05)",
                color: "rgba(255,255,255,.86)",
                padding: "10px 12px",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              RETIRER
            </button>
            <button
              type="button"
              onClick={() => onClose()}
              style={{
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(90deg, ${accent}, #ffe9a3)`,
                color: "#1b1208",
                padding: "10px 12px",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              VALIDER
            </button>
          </div>
        </div>
      </div>
    );
  }

  function GuidedChoiceCard({ active, title, text, onClick, accent = primary, disabled = false }: any) {
    return (
      <button
        type="button"
        disabled={!!disabled}
        onClick={onClick}
        style={{
          width: "100%",
          textAlign: "left",
          borderRadius: 18,
          padding: 14,
          border: active ? `1px solid ${accent}CC` : "1px solid rgba(255,255,255,.10)",
          background: active
            ? `radial-gradient(120% 130% at 0% 0%, ${accent}24, transparent 56%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))`
            : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          color: "#fff",
          boxShadow: active ? `0 0 22px ${accent}22, 0 18px 42px rgba(0,0,0,.50)` : "0 12px 28px rgba(0,0,0,.35)",
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 1000, color: active ? accent : "rgba(255,255,255,.94)" }}>{title}</div>
          <div style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: active ? accent : "rgba(255,255,255,.08)", color: active ? "#151008" : "rgba(255,255,255,.76)", fontWeight: 1000 }}>
            {active ? "✓" : "›"}
          </div>
        </div>
        {text ? <div style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.35, opacity: 0.78, fontWeight: 650 }}>{text}</div> : null}
      </button>
    );
  }

  function GuidedFooter({ final = false }: any) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: guidedStepSafe <= 0 ? "1fr" : "1fr 1fr", gap: 10, marginTop: 14 }}>
        {guidedStepSafe > 0 ? (
          <button
            type="button"
            onPointerDown={(e: any) => {
              e.preventDefault();
              goGuidedStep(-1);
            }}
            onClick={(e: any) => {
              if (e.detail === 0) goGuidedStep(-1);
            }}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              padding: "12px 10px",
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
              color: "#fff",
              fontWeight: 950,
              cursor: "pointer",
              touchAction: "manipulation",
              userSelect: "none",
              boxShadow: "0 14px 28px rgba(0,0,0,.28)",
            }}
          >
            ← Retour
          </button>
        ) : null}
        {final ? (
          <button
            type="button"
            disabled={!canCreate}
            onClick={createTournament}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "12px 10px",
              background: canCreate ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(255,255,255,.10)",
              color: canCreate ? "#181008" : "rgba(255,255,255,.50)",
              fontWeight: 1000,
              cursor: canCreate ? "pointer" : "not-allowed",
              boxShadow: canCreate ? `0 18px 34px rgba(0,0,0,.34), 0 0 22px ${primary}44` : "none",
            }}
          >
            {isLeague ? "Créer la ligue" : "Créer le tournoi"}
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={(e: any) => {
              e.preventDefault();
              goGuidedStep(1);
            }}
            onClick={(e: any) => {
              if (e.detail === 0) goGuidedStep(1);
            }}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "12px 10px",
              background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
              color: "#181008",
              fontWeight: 1000,
              cursor: "pointer",
              touchAction: "manipulation",
              userSelect: "none",
              boxShadow: `0 18px 34px rgba(0,0,0,.34), 0 0 22px ${primary}33`,
            }}
          >
            Continuer →
          </button>
        )}
      </div>
    );
  }

  const selectedNames = React.useMemo(() => {
    if ((isPetanque && petanqueEntry === "teams") || (!isPetanque && participantKind === "teams")) {
      return (teamsInput || []).map((t: any) => String(t?.name || "").trim()).filter(Boolean).slice(0, 6);
    }
    return selectedProfiles.map((p: any) => String(p?.name || "").trim()).filter(Boolean).slice(0, 6);
  }, [isPetanque, petanqueEntry, participantKind, teamsInput, selectedProfiles]);

  const infoContent = (() => {
    const k = String(infoKey || "");
    if (k === "players") return { title: "Joueurs", body: <>{OTHER_INFO.players}</> };
    if (k === "botsSelect") return { title: "Bots IA", body: <>{OTHER_INFO.botsSelect}</> };

    if (k === "type_single") return { title: "Élimination (KO)", body: <>{TYPE_INFO.single_ko}</> };
    if (k === "type_double") return { title: "Élimination double", body: <>{TYPE_INFO.double_ko}</> };
    if (k === "type_rr") return { title: "Championnat", body: <>{TYPE_INFO.round_robin}</> };
    if (k === "type_groups") return { title: "Poules + KO", body: <>{TYPE_INFO.groups_ko}</> };

    if (k === "bestof") return { title: "Best-of", body: <>{OTHER_INFO.bestOf}</> };
    if (k === "seed") return { title: "Têtes de série", body: <>{OTHER_INFO.seedMode}</> };
    if (k === "repechage") return { title: "Repêchage", body: <>{OTHER_INFO.repechage}</> };
    if (k === "maxPlayers") return { title: "Max joueurs", body: <>{OTHER_INFO.maxPlayers}</> };
    if (k === "rrRounds") return { title: "Tours RR", body: <>{OTHER_INFO.rrRounds}</> };
    if (k === "groups") return { title: "Poules", body: <>{OTHER_INFO.groups}</> };
    if (k === "bracket") return { title: "Bracket KO", body: <>{OTHER_INFO.bracket}</> };
    if (k === "autofill") return { title: "Auto-fill BOTS IA", body: <>{OTHER_INFO.autofill}</> };
    if (k === "petanqueTeam") return { title: "Composition Pétanque", body: <>{OTHER_INFO.petanqueTeam}</> };

    return { title: "Info", body: <>—</> };
  })();

  const defaultCompetitionName = isLeague ? `Ligue ${sportLabel}` : `Tournoi ${sportLabel}`;
  const defaultTitleLine2 = isLeague ? `Ligue de ${sportLabel}` : `Tournoi de ${sportLabel}`;
  const titleLine2 = String(name || "").trim() && String(name || "").trim() !== defaultCompetitionName
    ? String(name || "").trim().toUpperCase()
    : defaultTitleLine2.toUpperCase();
  const heroKindLabel = isLeague ? "LIGUE" : "TOURNOI";
  const heroSourceLabel = source === "online" ? "ONLINE" : "LOCAL";
  const heroInfoContent = (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.4 }}>
      <p style={{ margin: 0 }}>
        La configuration guidée découpe la création en étapes simples : type, solo/équipe, participants, format, règles puis récapitulatif.
      </p>
      <p style={{ margin: 0 }}>
        La configuration complète affiche tous les réglages sur une seule page pour les utilisateurs qui veulent tout ajuster directement.
      </p>
      <p style={{ margin: 0 }}>
        Le sport actif reste verrouillé sur <b>{sportLabel}</b>, donc les options proposées restent cohérentes avec le choix fait dans Jeux.
      </p>
    </div>
  );

  if (configMode === "guided") {
    const step = guidedStepSafe;

    return (
      <div
        className="container"
        style={{
          padding: 16,
          paddingBottom: 96,
          color: "#f5f5f7",
          background: `radial-gradient(circle at top, ${primaryAura} 0, rgba(10,10,14,0) 40%), radial-gradient(circle at 40% 0%, rgba(40,40,56,0.65), rgba(5,5,8,1) 55%, rgba(0,0,0,1) 100%)`,
          minHeight: "100vh",
        }}
      >
        <GuidedVisualHeader
          accent={primary}
          onBack={() => go("tournaments", { forceMode, source, entry: "create" })}
        />

        <GuidedHeroCard
          titleLine2={titleLine2}
          sportLabel={sportLabel.toUpperCase()}
          sourceLabel={heroSourceLabel}
          primary={primary}
          kindLabel={heroKindLabel}
          watermark={kindWatermark}
          configMode={configMode}
          onConfigModeChange={setConfigMode}
          info={heroInfoContent}
          competitionLogo={competitionAvatar}
        />

        <div ref={guidedTabsRef} style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as any, scrollBehavior: "smooth" }}>
          {guidedSteps.map((s, idx) => (
            <button
              key={s}
              ref={(el) => { guidedTabRefs.current[idx] = el; }}
              type="button"
              onClick={() => setGuidedStep(idx)}
              style={{
                flex: "0 0 auto",
                minWidth: 92,
                borderRadius: 999,
                padding: "9px 12px",
                border: idx === step ? `1px solid ${primary}AA` : "1px solid rgba(255,255,255,.10)",
                background: idx === step
                  ? `radial-gradient(120% 140% at 0% 0%, ${primary}24, transparent 56%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(10,10,14,.99))`
                  : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
                color: idx === step ? primary : "rgba(255,255,255,.74)",
                fontSize: 11.5,
                fontWeight: 1000,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: idx === step ? `0 0 18px ${primary}20` : "0 10px 22px rgba(0,0,0,.18)",
              }}
            >
              {idx + 1}. {s}
            </button>
          ))}
        </div>

        {currentGuidedKey === "type" ? (
          <Section title={guidedStepTitle("type", "Type de compétition")} subtitle={isLeague ? "Choisir un nom de ligue" : "Choisir un nom de tournoi"} accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <TextInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder={isLeague ? "Nom de la ligue" : "Nom du tournoi"} />
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <SourceIconChoice active={source === "local"} kind="local" onClick={() => setSource("local")} />
                <SourceIconChoice active={source === "online"} kind="online" accent="#4fb4ff" onClick={() => setSource("online")} />
              </div>
            </div>
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "identity" ? (
          <Section title={guidedStepTitle("identity", "Identité visuelle")} subtitle="" accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <IdentityImageCard
                label="LOGO"
                value={competitionAvatar}
                onChange={setCompetitionAvatar}
                variant="avatar"
                accent={primary}
                onOpenGallery={() => setShowCompetitionLogoPicker(true)}
              />
              <CoverPickerCard />
            </div>
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "participantKind" ? (
          <Section title={guidedStepTitle("participantKind", "Solo ou équipe")} subtitle="" accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <ParticipantIconChoice active={participantKind === "solo"} kind="solo" onClick={() => setParticipantChoice("solo")} />
              <ParticipantIconChoice active={participantKind === "teams"} kind="teams" onClick={() => setParticipantChoice("teams")} />
            </div>

            {isPetanque ? (
              <div style={{ marginTop: 12 }}>
                <RowTitle label="Taille d’équipe pétanque" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <NeonPill active={petanqueTeamSize === 1} label="Simple" onClick={() => setPetanqueTeamSize(1)} primary={primary} />
                  <NeonPill active={petanqueTeamSize === 2} label="Doublette" onClick={() => setPetanqueTeamSize(2)} primary={primary} />
                  <NeonPill active={petanqueTeamSize === 3} label="Triplette" onClick={() => setPetanqueTeamSize(3)} primary={primary} />
                  <NeonPill active={petanqueTeamSize === 4} label="Quadrette" onClick={() => setPetanqueTeamSize(4)} primary={primary} />
                </div>
              </div>
            ) : null}
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "participants" ? (
          <Section title={guidedStepTitle("participants", "Participants")} subtitle={participantKind === "teams" ? "Sélectionne ou prépare les équipes / joueurs." : "Sélectionne les joueurs."} accent={primary} watermark={kindWatermark}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, opacity: .82 }}>
                <b style={{ color: primary }}>{(isPetanque && petanqueEntry === "teams") || (!isPetanque && participantKind === "teams") ? (teamsInput || []).length : totalSelectedIds.length}</b> {(isPetanque && petanqueEntry === "teams") || (!isPetanque && participantKind === "teams") ? "équipe(s)" : "participant(s)"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isPetanque ? (
                  <>
                    <NeonPill active={petanqueEntry === "profiles"} label="Par profils" onClick={() => setPetanqueEntry("profiles")} small primary={primary} />
                    <NeonPill active={petanqueEntry === "teams"} label="Par équipes" onClick={() => setPetanqueEntry("teams")} small primary={primary} />
                  </>
                ) : null}
                {participantKind === "teams" && !isPetanque ? (
                  <>
                    <NeonGhost label="Vider" onClick={() => setTeamsInput([])} />
                  </>
                ) : (!isPetanque || petanqueEntry === "profiles") ? (
                  <>
                    <NeonGhost label="Tout sélectionner" onClick={() => setPlayerIds(profiles.map((p: any) => String(p.id)))} />
                    <NeonGhost label="Vider" onClick={() => setPlayerIds([])} />
                  </>
                ) : null}
              </div>
            </div>

            {participantKind !== "teams" && (!isPetanque || petanqueEntry === "profiles") ? (
              <div style={{ marginTop: 12, display: "flex", gap: 14, overflowX: "auto", overflowY: "visible", paddingTop: 10, paddingBottom: 10, WebkitOverflowScrolling: "touch" }} className="dc-scroll-thin">
                {profiles.map((p: any) => {
                  const avg = Number(avgMap?.[p.id] ?? 0) || 0;
                  const active = playerIds.includes(p.id);
                  return <PlayerCarouselTile key={p.id} active={active} name={p.name} avatarUrl={p.avatar} avg3D={avg} onClick={() => togglePlayer(p.id)} primary={primary} />;
                })}
              </div>
            ) : null}

            {participantKind !== "teams" && (!isPetanque || petanqueEntry === "profiles") ? (
              <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <NeonGhost label={participantsDropdownOpen ? "Masquer liste" : "Liste rapide"} onClick={() => setParticipantsDropdownOpen((v) => !v)} />
                  {!isPetanque ? (
                    <button
                      type="button"
                      onClick={() => setIncludeBotsInParticipantList((v) => { const next = !v; if (!next) setBotIds([]); return next; })}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${includeBotsInParticipantList ? primary : "rgba(255,255,255,.14)"}`,
                        background: includeBotsInParticipantList ? `${primary}22` : "rgba(255,255,255,.05)",
                        color: includeBotsInParticipantList ? primary : "rgba(255,255,255,.82)",
                        padding: "8px 10px",
                        fontSize: 11.5,
                        fontWeight: 1000,
                        cursor: "pointer",
                      }}
                    >
                      {includeBotsInParticipantList ? "☑" : "☐"} BOTS
                    </button>
                  ) : null}
                </div>
                {participantsDropdownOpen ? (
                  <div style={{ maxHeight: 230, overflowY: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.22)", padding: 8 }} className="dc-scroll-thin">
                    {profiles.map((p: any) => {
                      const active = playerIds.includes(String(p.id));
                      return (
                        <button key={`list_${p.id}`} type="button" onClick={() => togglePlayer(String(p.id))} style={{ width: "100%", display: "grid", gridTemplateColumns: "26px 34px 1fr", alignItems: "center", gap: 8, border: "none", background: active ? `${primary}18` : "transparent", color: "#fff", borderRadius: 12, padding: "7px 8px", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ color: active ? primary : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                          <ProfileAvatar name={p.name} dataUrl={p.avatar || undefined} size={30} />
                          <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        </button>
                      );
                    })}
                    {!isPetanque && includeBotsInParticipantList === true ? botsCatalog.map((b: any) => {
                      const id = String(b.id);
                      const active = botIds.includes(id);
                      return (
                        <button key={`bot_list_${id}`} type="button" onClick={() => toggleBot(id)} style={{ width: "100%", display: "grid", gridTemplateColumns: "26px 34px 1fr auto", alignItems: "center", gap: 8, border: "none", background: active ? `${primary}18` : "transparent", color: "#fff", borderRadius: 12, padding: "7px 8px", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ color: active ? primary : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                          <ProfileAvatar name={b.name} dataUrl={b.avatar || undefined} size={30} />
                          <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                          <span style={{ color: primary, fontSize: 10, fontWeight: 1000 }}>BOT</span>
                        </button>
                      );
                    }) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {participantKind === "teams" && !isPetanque ? (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <NeonGhost label={participantsDropdownOpen ? "Masquer liste" : "Liste équipes"} onClick={() => setParticipantsDropdownOpen((v) => !v)} />
                  <button
                    type="button"
                    onClick={() => setIncludeBotTeamsInTeamList((v) => { const next = !v; if (!next) setTeamsInput((prev: any[]) => (prev || []).filter((t: any) => !t?.isBotTeam)); return next; })}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${includeBotTeamsInTeamList ? primary : "rgba(255,255,255,.14)"}`,
                      background: includeBotTeamsInTeamList ? `${primary}22` : "rgba(255,255,255,.05)",
                      color: includeBotTeamsInTeamList ? primary : "rgba(255,255,255,.82)",
                      padding: "8px 10px",
                      fontSize: 11.5,
                      fontWeight: 1000,
                      cursor: "pointer",
                    }}
                  >
                    {includeBotTeamsInTeamList ? "☑" : "☐"} TEAMS BOTS
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    overflowY: "visible",
                    paddingTop: 10,
                    paddingBottom: 10,
                    WebkitOverflowScrolling: "touch",
                    scrollSnapType: "x proximity",
                  }}
                  className="dc-scroll-thin"
                >
                  {(storedTeams || []).map((t: any, idx: number) => {
                    const active = (teamsInput || []).some((x: any) => String(x?.id || "") === String(t?.id || ""));
                    return (
                      <TeamCarouselTile
                        key={String(t.id || idx)}
                        team={t}
                        index={idx}
                        active={active}
                        primary={primary}
                        onClick={() => toggleStoredTeam(t)}
                      />
                    );
                  })}
                  {(storedTeams || []).length === 0 && (teamsInput || []).map((t: any, idx: number) => (
                    <TeamCarouselTile
                      key={String(t.id || idx)}
                      team={t}
                      index={idx}
                      active
                      primary={primary}
                      onRemove={() => setTeamsInput((prev) => (prev || []).filter((_: any, i: number) => i !== idx))}
                    />
                  ))}
                  {includeBotTeamsInTeamList === true ? botTeamsCatalog.map((t: any, idx: number) => {
                    const active = (teamsInput || []).some((x: any) => String(x?.id || "") === String(t?.id || ""));
                    return <TeamCarouselTile key={String(t.id || idx)} team={t} index={idx} active={active} primary={primary} onClick={() => toggleStoredTeam(t)} />;
                  }) : null}
                  <TeamAddTile primary={primary} onClick={openTeamCreate} />
                </div>
                {participantsDropdownOpen ? (
                  <div style={{ maxHeight: 230, overflowY: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.22)", padding: 8 }} className="dc-scroll-thin">
                    {[...(storedTeams || []), ...(includeBotTeamsInTeamList === true ? botTeamsCatalog : [])].map((t: any, idx: number) => {
                      const active = (teamsInput || []).some((x: any) => String(x?.id || "") === String(t?.id || ""));
                      const logo = t?.logoDataUrl || t?.logoUrl || t?.avatarDataUrl || null;
                      const name = String(t?.name || `Équipe ${idx + 1}`);
                      return (
                        <button key={`team_list_${String(t?.id || idx)}`} type="button" onClick={() => toggleStoredTeam(t)} style={{ width: "100%", display: "grid", gridTemplateColumns: "26px 38px 1fr auto", alignItems: "center", gap: 8, border: "none", background: active ? `${primary}18` : "transparent", color: "#fff", borderRadius: 12, padding: "7px 8px", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ color: active ? primary : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                          <ProfileAvatar name={name} dataUrl={logo || undefined} size={34} />
                          <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                          {t?.isBotTeam ? <span style={{ color: primary, fontSize: 10, fontWeight: 1000 }}>BOT TEAM · {Number(t?.botTeamLevel || 0) || ""}★</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {(teamsInput || []).length < 2 ? <div style={{ fontSize: 12, opacity: .74 }}>Choisis ou crée au moins 2 équipes pour {sportLabel}.</div> : null}
              </div>
            ) : null}


            {isPetanque && petanqueEntry === "teams" ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <NeonGhost label="Générer 8" onClick={() => generateTeams(8)} />
                  <NeonGhost label="Générer 16" onClick={() => generateTeams(16)} />
                  <NeonGhost label="+ Équipe" onClick={() => addTeamInput()} />
                </div>
                {(teamsInput || []).slice(0, 8).map((t: any, idx: number) => (
                  <div key={String(t.id || idx)} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.24)", display: "grid", gap: 8 }}>
                    <TextInput value={String(t?.name || "")} onChange={(e: any) => setTeamsInput((prev) => { const next = [...(prev || [])]; const cur = next[idx] || { id: makeTeamId(idx), name: "", players: normalizeTeamPlayers([]) }; next[idx] = { ...cur, name: e.target.value }; return next; })} placeholder={`Équipe ${idx + 1}`} />
                    <div style={{ fontSize: 11.5, opacity: .7 }}>{(t?.players || []).filter(Boolean).length}/{petanqueTeamSize} joueurs renseignés</div>
                  </div>
                ))}
                {(teamsInput || []).length > 8 ? <div style={{ fontSize: 11.5, opacity: .72 }}>+ {(teamsInput || []).length - 8} autres équipes dans la configuration complète.</div> : null}
              </div>
            ) : null}

            {!isPetanque && participantKind !== "teams" && includeBotsInParticipantList === true ? (
              <div style={{ marginTop: 12 }}>
                <RowTitle label="Bots IA optionnels" />
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  {botsCatalog.slice(0, 24).map((b: any) => {
                    const id = String(b.id);
                    const active = botIds.includes(id);
                    return <PlayerCarouselTile key={id} active={active} name={b.name} avatarUrl={b.avatar} avg3D={b.avg3D} isBot onClick={() => setBotIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} primary={primary} />;
                  })}
                </div>
              </div>
            ) : null}
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "format" ? (
          <Section title={guidedStepTitle("format", "Format")} subtitle={isLeague ? "Choisis le rythme de la ligue." : "Choisis la structure du tournoi."} accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 10 }}>
              {isLeague ? (
                <>
                  <LineOption label="Championnat simple" active={leagueFormat === "simple"} onClick={() => { setLeagueFormat("simple"); setFormat("round_robin"); setRrRounds(1); }} onInfo={() => openInfo("type_rr")} primary={primary} />
                  <LineOption label="Aller / retour" active={leagueFormat === "return"} onClick={() => { setLeagueFormat("return"); setFormat("round_robin"); setRrRounds(2); }} onInfo={() => openInfo("type_rr")} primary={primary} />
                  <LineOption label="Saison libre" active={leagueFormat === "free"} onClick={() => { setLeagueFormat("free"); setFormat("round_robin"); setRrRounds(4); }} onInfo={() => openInfo("type_rr")} primary={primary} />
                  <LineOption label="Ligue MULTI" active={leagueFormat === "multi"} onClick={() => { setLeagueFormat("multi"); setFormat("round_robin"); setRrRounds(1); }} onInfo={() => openInfo("type_rr")} primary={primary} />
                </>
              ) : (
                <>
                  <LineOption label="Élimination directe" active={format === "single_ko"} onClick={() => setFormat("single_ko")} onInfo={() => openInfo("type_single")} primary={primary} />
                  {!isPetanque ? <LineOption label="Élimination double" active={format === "double_ko"} onClick={() => setFormat("double_ko")} onInfo={() => openInfo("type_double")} primary={primary} /> : null}
                  <LineOption label="Championnat" active={format === "round_robin"} onClick={() => setFormat("round_robin")} onInfo={() => openInfo("type_rr")} primary={primary} />
                  <LineOption label="Poules + KO" active={format === "groups_ko"} onClick={() => setFormat("groups_ko")} onInfo={() => openInfo("type_groups")} primary={primary} />
                </>
              )}
            </div>
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "rules" ? (
          <Section title={guidedStepTitle("rules", "Règles")} subtitle={`Réglages limités au sport actif : ${sportLabel}.`} accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 14 }}>
              {!lockedSportMode ? (
                <div>
                  <RowTitle label="Mode fléchettes" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {availableModes.map((m) => <NeonPill key={m} active={mode === m} label={MODE_LABEL[m]} onClick={() => setMode(m)} primary={primary} />)}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, opacity: .8 }}>Mode verrouillé : <b style={{ color: primary }}>{MODE_LABEL[lockedSportMode]}</b></div>
              )}

              {mode === "x01" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <RowTitle label="X01" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {([301, 501, 701, 901] as any[]).map((n) => <NeonPill key={n} active={x01Start === n} label={String(n)} onClick={() => setX01Start(n)} primary={primary} />)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NeonPill active={x01In === "simple"} label="Simple IN" onClick={() => setX01In("simple")} primary={primary} />
                    <NeonPill active={x01In === "double"} label="Double IN" onClick={() => setX01In("double")} primary={primary} />
                    <NeonPill active={x01In === "master"} label="Master IN" onClick={() => setX01In("master")} primary={primary} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NeonPill active={x01Out === "simple"} label="Simple OUT" onClick={() => setX01Out("simple")} primary={primary} />
                    <NeonPill active={x01Out === "double"} label="Double OUT" onClick={() => setX01Out("double")} primary={primary} />
                    <NeonPill active={x01Out === "master"} label="Master OUT" onClick={() => setX01Out("master")} primary={primary} />
                  </div>
                </div>
              ) : null}

              {!isPetanque ? (
                <div>
                  <RowTitle label="Best-of" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {([1, 3, 5, 7] as BestOf[]).map((v) => <NeonPill key={v} active={bestOf === v} label={`BO${v}`} onClick={() => setBestOf(v)} primary={primary} />)}
                  </div>
                </div>
              ) : null}

              {participantKind === "teams" && !isPetanque ? (
                <div style={{ display: "grid", gap: 12, padding: 12, borderRadius: 18, border: `1px solid ${primary}33`, background: "rgba(255,255,255,.035)" }}>
                  <RowTitle label="Programme d’une rencontre équipe" />
                  <div style={{ fontSize: 12, lineHeight: 1.35, opacity: .82 }}>
                    Définis simplement combien de matchs composent UNE affiche entre deux équipes. Exemple : Chartreuse United vs BOT Pro = 4 simples + 2 doubles + 1 multi.
                  </div>
                  <div style={{ display: "grid", gap: 9 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8, alignItems: "center" }}>
                      <div><b style={{ color: primary }}>SOLO</b><div style={{ fontSize: 10.5, opacity: .66 }}>1 joueur contre 1 joueur</div></div>
                      <TextInput value={teamConfrontationSoloCount} onChange={(e: any) => { setTeamConfrontationFormat("custom"); setTeamConfrontationSoloCount(e.target.value); }} placeholder="ex: 4" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8, alignItems: "center" }}>
                      <div><b style={{ color: primary }}>DUO</b><div style={{ fontSize: 10.5, opacity: .66 }}>2 joueurs contre 2 joueurs</div></div>
                      <TextInput value={teamConfrontationDuoCount} onChange={(e: any) => { setTeamConfrontationFormat("custom"); setTeamConfrontationDuoCount(e.target.value); }} placeholder="ex: 2" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8, alignItems: "center" }}>
                      <div><b style={{ color: primary }}>MULTI</b><div style={{ fontSize: 10.5, opacity: .66 }}>plusieurs joueurs par camp</div></div>
                      <TextInput value={teamConfrontationMultiCount} onChange={(e: any) => { setTeamConfrontationFormat("custom"); setTeamConfrontationMultiCount(e.target.value); }} placeholder="ex: 1" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8, alignItems: "center" }}>
                      <div><b style={{ color: primary }}>Joueurs en MULTI</b><div style={{ fontSize: 10.5, opacity: .66 }}>par équipe, seulement si MULTI &gt; 0</div></div>
                      <TextInput value={teamConfrontationMultiPlayers} onChange={(e: any) => setTeamConfrontationMultiPlayers(e.target.value)} placeholder="ex: 3" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NeonPill active={teamConfrontationWinMode === "match_points"} label="1 victoire = 1 point" onClick={() => setTeamConfrontationWinMode("match_points")} primary={primary} />
                    <NeonPill active={teamConfrontationWinMode === "legs_sets"} label="Cumuler legs / sets" onClick={() => setTeamConfrontationWinMode("legs_sets")} primary={primary} />
                  </div>
                  <div style={{ fontSize: 11, color: primary, fontWeight: 900 }}>
                    Total : {(Math.max(0, Math.floor(numFromText(teamConfrontationSoloCount)) || 0) + Math.max(0, Math.floor(numFromText(teamConfrontationDuoCount)) || 0) + Math.max(0, Math.floor(numFromText(teamConfrontationMultiCount)) || 0))} matchs par rencontre
                  </div>
                </div>
              ) : null}

              {(format === "round_robin" || format === "groups_ko") ? (
                <div>
                  <RowTitle label="Tours" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[1, 2, 3, 4, 5].map((n) => <NeonPill key={n} active={rrRounds === n} label={`${n} tour${n > 1 ? "s" : ""}`} onClick={() => setRrRounds(n)} primary={primary} />)}
                  </div>
                </div>
              ) : null}

              {format === "groups_ko" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <RowTitle label="Poules" />
                  <TextInput value={playersPerGroup} onChange={(e: any) => setPlayersPerGroup(e.target.value)} placeholder="Joueurs par poule" />
                  <div style={{ fontSize: 11.5, opacity: .72 }}>Poules auto : <b style={{ color: primary }}>{computedGroups}</b></div>
                </div>
              ) : null}

              {format !== "round_robin" ? (
                <div>
                  <RowTitle label="Bracket" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <NeonPill active={bracketAuto} label="Auto" onClick={() => setBracketAuto(true)} primary={primary} />
                    <NeonPill active={!bracketAuto} label="Manuel" onClick={() => setBracketAuto(false)} primary={primary} />
                  </div>
                  {!bracketAuto ? <div style={{ marginTop: 8 }}><TextInput value={bracketTarget} onChange={(e: any) => setBracketTarget(e.target.value)} placeholder="Taille bracket" /></div> : null}
                  <div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Aperçu : <b style={{ color: primary }}>{desiredSizePreview || "—"}</b></div>
                </div>
              ) : null}
            </div>
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "multiRules" ? (
          <Section title={guidedStepTitle("multiRules", "Barème MULTI")} subtitle="Configure simplement les places récompensées. Les places au-delà marqueront 0 point." accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <RowTitle label="Places qui marquent des points" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[3, 5, 6, 8, 10].map((n) => (
                    <NeonPill key={n} active={leagueMultiPaidPlaces === n} label={`${n} place${n > 1 ? "s" : ""}`} onClick={() => setLeagueMultiPaidPlaces(n)} primary={primary} />
                  ))}
                </div>
              </div>

              <div>
                <RowTitle label="Points du vainqueur" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[10, 12, 15, 20].map((n) => (
                    <NeonPill key={n} active={leagueMultiFirstPoints === n} label={`${n} pts`} onClick={() => setLeagueMultiFirstPoints(n)} primary={primary} />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {parsedLeagueMultiPoints.map((pts, idx) => (
                  <span
                    key={`${idx}-${pts}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 30,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: `1px solid ${primary}55`,
                      background: "rgba(255,255,255,.05)",
                      color: idx === 0 ? primary : "rgba(255,255,255,.86)",
                      fontSize: 12,
                      fontWeight: 1000,
                    }}
                  >
                    {idx + 1}{idx === 0 ? "er" : "e"} · {pts} pts
                  </span>
                ))}
              </div>
            </div>
            <GuidedFooter />
          </Section>
        ) : null}

        {currentGuidedKey === "recap" ? (
          <Section title={guidedStepTitle("recap", "Récapitulatif")} subtitle="Vérifie puis crée la compétition." accent={primary} watermark={kindWatermark}>
            <div style={{ display: "grid", gap: 9, fontSize: 13, lineHeight: 1.35 }}>
              <div><b style={{ color: primary }}>Nom :</b> {name || "—"}</div>
              <div><b style={{ color: primary }}>Type :</b> {guidedKindLabel}</div>
              <div><b style={{ color: primary }}>Sport :</b> {sportLabel}</div>
              <div><b style={{ color: primary }}>Source :</b> {source === "online" ? "Online" : "Local"}</div>
              <div><b style={{ color: primary }}>Participants :</b> {isParticipantlessLeague ? "Dynamiques, ajoutés par les parties" : participantKind === "teams" && !isPetanque ? (teamsInput || []).length : isPetanque && petanqueEntry === "teams" ? petanqueTeamsCountEffective : totalSelectedIds.length}</div>
              <div><b style={{ color: primary }}>Format :</b> {isLeagueMulti ? "Ligue MULTI" : isLeague ? (leagueFormat === "return" ? "Aller / retour" : leagueFormat === "free" ? "Saison libre" : "Championnat simple") : (TYPE_INFO[format] ? format : "—")}</div>
              {isLeagueMulti ? <div><b style={{ color: primary }}>Barème :</b> {parsedLeagueMultiPoints.map((p, idx) => `${idx + 1}${idx === 0 ? "er" : "e"}=${p}`).join(" · ")} · puis 0 pt</div> : null}
              <div><b style={{ color: primary }}>Identité :</b> {competitionAvatar ? "Logo OK" : "Sans logo"} · {competitionCover ? "Couverture OK" : "Sans couverture"}</div>
              {selectedNames.length ? <div style={{ opacity: .78 }}>Aperçu : {selectedNames.join(", ")}{selectedNames.length >= 6 ? "…" : ""}</div> : null}
            </div>
            {!canCreate ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: .75 }}>
                ⚠️ {isParticipantlessLeague ? "Nom requis pour créer cette ligue." : isPetanque ? `Nom + au moins ${petanqueMinPlayers} joueurs / équipes valides.` : "Nom + au moins 2 participants."}
              </div>
            ) : null}
            <GuidedFooter final />
          </Section>
        ) : null}

        <Sheet open={sheetMode && !isPetanque} title="Choisir un mode" onClose={() => setSheetMode(false)} primary={primary}>
          <div style={{ display: "grid", gap: 10 }}>
            {availableModes.map((m) => (
              <GuidedChoiceCard key={m} active={mode === m} title={MODE_LABEL[m]} onClick={() => { setMode(m); setSheetMode(false); }} />
            ))}
          </div>
        </Sheet>

        {showCompetitionLogoPicker ? (
          <CompetitionLogoPickerModal
            selected={competitionAvatar}
            accent={primary}
            onClose={() => setShowCompetitionLogoPicker(false)}
            onPick={(url: string | null) => {
              setCompetitionAvatar(url || null);
              if (url) setShowCompetitionLogoPicker(false);
            }}
          />
        ) : null}

        {showCompetitionCoverPicker ? (
          <CompetitionCoverPickerModal
            selected={competitionCover}
            accent={primary}
            onClose={() => setShowCompetitionCoverPicker(false)}
            onPick={(url: string | null) => {
              setCompetitionCover(url || null);
              if (url) setShowCompetitionCoverPicker(false);
            }}
          />
        ) : null}

        <TeamCreateModal
          open={teamCreateOpen}
          value={teamCreateName}
          onChange={setTeamCreateName}
          logo={teamCreateLogo}
          onLogoChange={setTeamCreateLogo}
          roster={teamCreateRoster}
          onRosterChange={setTeamCreateRoster}
          query={teamCreateQuery}
          onQueryChange={setTeamCreateQuery}
          profiles={profiles}
          onCreate={commitTeamCreate}
          onClose={() => setTeamCreateOpen(false)}
          primary={primary}
        />

        <CenterInfoModal open={infoOpen} title={infoContent.title} primary={primary} onClose={() => setInfoOpen(false)}>
          {infoContent.body}
        </CenterInfoModal>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
        background: `radial-gradient(circle at top, ${primaryAura} 0, rgba(10,10,14,0) 40%), radial-gradient(circle at 40% 0%, rgba(40,40,56,0.65), rgba(5,5,8,1) 55%, rgba(0,0,0,1) 100%)`,
        minHeight: "100vh",
      }}
    >
      <GuidedVisualHeader
        accent={primary}
        onBack={() => go("tournaments", { forceMode, source, entry: "create" })}
      />

      <GuidedHeroCard
        titleLine2={titleLine2}
        sportLabel={sportLabel.toUpperCase()}
        sourceLabel={heroSourceLabel}
        primary={primary}
        kindLabel={heroKindLabel}
        watermark={kindWatermark}
        configMode={configMode}
        onConfigModeChange={setConfigMode}
        info={heroInfoContent}
        competitionLogo={competitionAvatar}
      />

      {/* Infos */}
      <Section title={isLeague ? "Infos de la ligue" : "Infos du tournoi"} subtitle={`Sport actif : ${sportLabel}. Les autres sports sont volontairement masqués.`} accent={primary}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 6 }}>Nom</div>
            <TextInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder={isLeague ? "Nom de la ligue" : "Nom du tournoi"} />
          </div>

          {/* ✅ NEW : Max joueurs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 11.5, opacity: 0.82 }}>Max joueurs (optionnel)</div>
              <TextInput value={maxPlayers} onChange={(e: any) => setMaxPlayers(e.target.value)} placeholder="Vide = illimité (ex: 128)" />
              <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.3 }}>Si trop de profils, l’app prendra un échantillon aléatoire.</div>
            </div>
            <InfoIconButton onClick={() => openInfo("maxPlayers")} />
          </div>

          {/* ✅ MODE : filtré par sport actif */}
          {lockedSportMode ? (
            <div
              style={{
                borderRadius: 14,
                padding: 12,
                border: `1px solid ${primary}55`,
                background: `linear-gradient(180deg, ${primary}10, rgba(0,0,0,0.25))`,
              }}
            >
              <div style={{ fontSize: 11.5, opacity: 0.82 }}>Mode</div>
              <div style={{ fontSize: 13, fontWeight: 950, color: primary, marginTop: 4 }}>{MODE_LABEL[lockedSportMode]} (verrouillé)</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>Ce choix vient du sport actif : {sportLabel}. Impossible de créer une compétition d’un autre sport ici.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "grid", gap: 3 }}>
                  <div style={{ fontSize: 11.5, opacity: 0.82 }}>Mode</div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: mode ? primary : "rgba(255,255,255,0.65)" }}>
                    {mode ? MODE_LABEL[mode] : "Aucun mode choisi"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSheetMode(true)}
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: "none",
                    fontWeight: 950,
                    cursor: "pointer",
                    background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
                    color: "#1b1508",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Choisir mode
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {availableModes.map((m) => (
                  <NeonPill key={m} active={mode === m} label={MODE_LABEL[m]} onClick={() => setMode(m)} primary={primary} />
                ))}
              </div>
            </>
          )}
        </div>
      </Section>

      {/* ✅ IDENTITÉ VISUELLE */}
      <Section title="Identité visuelle" subtitle="" accent={primary} watermark={kindWatermark}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <IdentityImageCard
            label="LOGO"
            value={competitionAvatar}
            onChange={setCompetitionAvatar}
            variant="avatar"
            accent={primary}
            onOpenGallery={() => setShowCompetitionLogoPicker(true)}
          />
          <CoverPickerCard />
        </div>
      </Section>

      {/* ✅ PÉTANQUE — COMPOSITION */}
      {isPetanque ? (
        <Section title="Pétanque — Composition" subtitle="Choisis Simple / Doublette / Triplette / Quadrette." accent={primary}>
          <RowTitle label="Taille d’équipe" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <NeonPill active={petanqueTeamSize === 1} label="Simple (1)" onClick={() => setPetanqueTeamSize(1)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 2} label="Doublette (2)" onClick={() => setPetanqueTeamSize(2)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 3} label="Triplette (3)" onClick={() => setPetanqueTeamSize(3)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 4} label="Quadrette (4)" onClick={() => setPetanqueTeamSize(4)} primary={primary} />
            </div>
            <InfoIconButton onClick={() => openInfo("petanqueTeam")} />
          </div>

          <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.8, lineHeight: 1.35 }}>
            {petanqueEntry === "teams" ? (
              <>
                Minimum : <b style={{ color: primary }}>2</b> équipes.<br />
                Chaque équipe doit contenir exactement <b style={{ color: primary }}>{petanqueTeamSize}</b> joueur(s) (noms non vides).
              </>
            ) : (
              <>
                Minimum : <b style={{ color: primary }}>{petanqueMinPlayers}</b> joueurs (2 équipes).<br />
                Total sélectionné doit être un multiple de <b style={{ color: primary }}>{petanqueTeamSize}</b>.
              </>
            )}
          </div>

          {petanqueEntry !== "teams" && !petanqueMinOk ? (
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
              ⚠️ Pas assez de joueurs pour{" "}
              {petanqueTeamSize === 1 ? "Simple" : petanqueTeamSize === 2 ? "Doublette" : petanqueTeamSize === 3 ? "Triplette" : "Quadrette"}.
            </div>
          ) : null}

          {petanqueEntry !== "teams" && petanqueMinOk && !petanqueMultipleOk ? (
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
              ⚠️ Total non multiple de {petanqueTeamSize}. Ajoute/enlève des joueurs.
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* ✅ JOUEURS */}
      <Section
        title={isPetanque && petanqueEntry === "teams" ? "Équipes" : "Joueurs"}
        subtitle={
          isPetanque
            ? petanqueEntry === "teams"
              ? "Gros tournoi : saisis directement les équipes (sans profils)."
              : "Sélectionne tes profils (humains uniquement)."
            : "Sélectionne tes profils."
        }
        accent={primary}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            {isPetanque && petanqueEntry === "teams" ? (
              <>
                <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b> équipe(s)
              </>
            ) : (
              <>
                <b style={{ color: primary }}>{totalSelectedIds.length}</b> sélectionné(s)
                {isPetanque ? (
                  <>
                    {" "}
                    • <span style={{ opacity: 0.85 }}>équipes : </span>
                    <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {isPetanque ? (
              <>
                <NeonPill active={petanqueEntry === "profiles"} label="Par profils" onClick={() => setPetanqueEntry("profiles")} small primary={primary} />
                <NeonPill active={petanqueEntry === "teams"} label="Par équipes" onClick={() => setPetanqueEntry("teams")} small primary={primary} />
              </>
            ) : null}

            {(!isPetanque || petanqueEntry === "profiles") ? (
              <>
                <NeonGhost label="Tout sélectionner" onClick={() => setPlayerIds(profiles.map((p: any) => String(p.id)))} />
                <NeonGhost label="Vider" onClick={() => setPlayerIds([])} />
              </>
            ) : null}

            <InfoIconButton onClick={() => openInfo("players")} />
          </div>
        </div>

        {/* HUMAINS (profils) */}
        {(!isPetanque || petanqueEntry === "profiles") ? (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 14,
            overflowX: "auto",
            overflowY: "visible",
            paddingBottom: 10,
            paddingTop: 10,
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
          className="dc-scroll-thin"
        >
          {profiles.map((p: any) => {
            const avg = Number(avgMap?.[p.id] ?? 0) || 0;
            const active = playerIds.includes(p.id);
            return <PlayerCarouselTile key={p.id} active={active} name={p.name} avatarUrl={p.avatar} avg3D={avg} onClick={() => togglePlayer(p.id)} primary={primary} />;
          })}
        </div>
        ) : null}



{/* ✅ PÉTANQUE — ÉQUIPES (composition) */}
{isPetanque && petanqueEntry === "profiles" ? (
  <div style={{ marginTop: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.82 }}>
        <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b> équipe(s) •{" "}
        <span style={{ opacity: 0.75 }}>taille</span> <b style={{ color: primary }}>{petanqueTeamSize}</b>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
        <NeonPill active={!assignMode} label="Sélection" onClick={() => setAssignMode(false)} small primary={primary} />
        <NeonPill active={assignMode} label="Affectation" onClick={() => setAssignMode(true)} small primary={primary} />
      </div>
    </div>

    <div style={{ fontSize: 11.5, opacity: 0.72, lineHeight: 1.35, marginBottom: 10 }}>
      • <b style={{ color: primary }}>Sélection</b> : clic sur un joueur = ajoute / retire.<br />
      • <b style={{ color: primary }}>Affectation</b> : choisis une équipe ci-dessous, puis clic sur les joueurs pour les mettre dedans (swap automatique si l’équipe est pleine).
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {petanqueTeamsUI.map((t: any) => {
        const isActive = activeTeamIdx === t.idx;
        const members = (t.memberIds || []).map((pid: string) => {
          const pr = profiles.find((p: any) => String(p.id) === String(pid));
          const avg = Number(avgMap?.[String(pid)] ?? 0) || 0;
          return { id: String(pid), name: pr?.name || "Joueur", avatar: pr?.avatar || null, avg3D: avg };
        });

        return (
          <div
            key={t.id}
            style={{
              borderRadius: 16,
              border: isActive ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
              background: isActive ? `linear-gradient(180deg, ${primary}14, rgba(0,0,0,0.22))` : "rgba(9,11,20,0.72)",
              padding: 12,
              boxShadow: isActive ? `0 0 22px ${primary}22` : "none",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTeamIdx(t.idx);
              setAssignMode(true);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "grid", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, color: primary, fontSize: 12.5 }}>
                    {isActive ? "✓ " : ""}
                    Équipe {t.idx + 1}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.78 }}>
                    {members.length}/{petanqueTeamSize}
                  </div>
                </div>

                <TextInput
                  value={teamNames?.[t.idx] || ""}
                  onChange={(e: any) => setTeamNames((prev: any) => ({ ...(prev || {}), [t.idx]: e.target.value }))}
                  placeholder={`Nom équipe ${t.idx + 1}`}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {members.map((m: any) => (
                <div key={m.id} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 92 }}>
                  <PlayerMedallion name={m.name} dataUrl={m.avatar} avg3D={m.avg3D} active primary={primary} />
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.9, maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                    {m.name}
                  </div>
                </div>
              ))}

              {/* emplacements vides */}
              {Array.from({ length: Math.max(0, petanqueTeamSize - members.length) }).map((_, k) => (
                <div
                  key={`empty_${t.id}_${k}`}
                  style={{
                    minWidth: 92,
                    height: 92,
                    borderRadius: 16,
                    border: "1px dashed rgba(255,255,255,0.16)",
                    opacity: 0.6,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11.5,
                  }}
                >
                  Vide
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>

    {!petanqueTeamsReady ? (
      <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.75 }}>
        ⚠️ Composition invalide : chaque équipe doit contenir exactement {petanqueTeamSize} joueur(s), sans doublon.
      </div>
    ) : null}
  </div>
) : null}

{/* ✅ PÉTANQUE — ENTRÉE "Par équipes" (sans profils) */}
{isPetanque && petanqueEntry === "teams" ? (
  <div style={{ marginTop: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
      <div style={{ display: "grid", gap: 8, minWidth: 240, flex: "1 1 260px" }}>
        <RowTitle label="Recherche équipe" />
        <TextInput value={teamsSearch} onChange={(e: any) => setTeamsSearch(e.target.value)} placeholder="Nom de l'équipe" />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <NeonGhost label="Générer 16" onClick={() => generateTeams(16)} />
        <NeonGhost label="Générer 32" onClick={() => generateTeams(32)} />
        <NeonGhost label="Générer 64" onClick={() => generateTeams(64)} />
        <NeonGhost
          label={teamsImportOpen ? "Fermer import" : "Importer texte"}
          onClick={() => setTeamsImportOpen((v) => !v)}
        />
        <NeonGhost
          label="Ajouter équipe"
          onClick={() => {
            const idx = (teamsInput?.length || 0);
            const next = [...(teamsInput || []), { id: makeTeamId(idx), name: `Équipe ${idx + 1}`, players: normalizeTeamPlayers([]) }];
            setTeamsInput(next);
            setTeamsExpandedIdx(idx);
          }}
        />
      </div>
    </div>

    {teamsImportOpen ? (
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(9,11,20,0.72)",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35, marginBottom: 10 }}>
          1 équipe par ligne. Formats acceptés :<br />
          • <b style={{ color: primary }}>Équipe A</b><br />
          • <b style={{ color: primary }}>Équipe A; joueur1, joueur2</b><br />
          • <b style={{ color: primary }}>Équipe A | joueur1 | joueur2</b>
        </div>

        <textarea
          value={teamsImportText}
          onChange={(e) => setTeamsImportText(e.target.value)}
          placeholder={`Ex:\nÉquipe A; Alice, Bob\nÉquipe B | Charly | David`}
          style={{
            width: "100%",
            minHeight: 120,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(8,8,12,0.75)",
            color: "#fff",
            padding: "10px 12px",
            fontSize: 13,
            outline: "none",
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
          <NeonGhost
            label="Appliquer"
            onClick={() => {
              parseTeamsImportText(teamsImportText);
            }}
          />
          <NeonGhost label="Vider" onClick={() => setTeamsImportText("")} />
        </div>
      </div>
    ) : null}

    <div style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.35, marginBottom: 10 }}>
      Rappel : en mode <b style={{ color: primary }}>Par équipes</b>, chaque équipe doit avoir exactement <b style={{ color: primary }}>{petanqueTeamSize}</b> joueur(s)
      (noms non vides) et il faut au minimum <b style={{ color: primary }}>2</b> équipes.
    </div>

    {/* ✅ Liste rapide (toujours visible) */}
    <div
      style={{
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(10,10,12,.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.86, fontWeight: 800 }}>
          Liste des équipes ({(teamsInput || []).length})
        </div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          Clique une équipe pour l’ouvrir et modifier ses joueurs.
        </div>
      </div>

      {(teamsInput || []).length === 0 ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Aucune équipe pour le moment.</div>
      ) : (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(teamsInput || []).map((t: any, idx: number) => (
            <button
              key={t?.id || idx}
              type="button"
              onClick={() => setTeamsExpandedIdx(idx)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.10)",
                background: idx === teamsExpandedIdx ? "rgba(255,215,90,.16)" : "rgba(255,255,255,.04)",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
                maxWidth: "100%",
              }}
              title={(t?.players || []).filter(Boolean).join(", ")}
            >
              <span style={{ opacity: 0.8, marginRight: 6 }}>{idx + 1}.</span>
              <span style={{ fontWeight: 800 }}>
                {t?.name?.trim?.() ? t.name.trim() : `Équipe ${idx + 1}`}
              </span>
              <span style={{ opacity: 0.75, marginLeft: 8 }}>
                ({(t?.players || []).filter(Boolean).length}/{petanqueTeamSize})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {(teamsInput || [])
        .map((t: any, idx: number) => ({ ...t, _idx: idx }))
        .filter((t: any) => {
          const q = String(teamsSearch || "").trim().toLowerCase();
          if (!q) return true;
          const n = String(t?.name || "").toLowerCase();
          return n.includes(q);
        })
        .map((t: any) => {
          const idx = Number(t._idx) || 0;
          const expanded = teamsExpandedIdx === idx;
          const ts = Number(petanqueTeamSize) || 1;
          const players = Array.isArray(t?.players) ? t.players : [];
          const filled = players.map((x: any) => String(x ?? "").trim()).filter(Boolean).length;

          return (
            <div
              key={String(t.id || idx)}
              style={{
                borderRadius: 16,
                border: expanded ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
                background: expanded ? `linear-gradient(180deg, ${primary}14, rgba(0,0,0,0.22))` : "rgba(9,11,20,0.72)",
                padding: 12,
                boxShadow: expanded ? `0 0 22px ${primary}22` : "none",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTeamsExpandedIdx((prev) => (prev === idx ? null : idx));
                }}
              >
                <div style={{ fontWeight: 950, color: primary, fontSize: 12.5 }}>
                  {expanded ? "▾ " : "▸ "}Équipe {idx + 1}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.78 }}>
                  {filled}/{ts}
                </div>
              </div>

              {expanded ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <RowTitle label="Nom de l'équipe" />
                    <TextInput
                      value={String(t?.name || "")}
                      onChange={(e: any) => {
                        const v = e.target.value;
                        setTeamsInput((prev) => {
                          const next = [...(prev || [])];
                          const cur = next[idx] || { id: makeTeamId(idx), name: "", players: normalizeTeamPlayers([]) };
                          next[idx] = { ...cur, name: v };
                          return next;
                        });
                      }}
                      placeholder={`Équipe ${idx + 1}`}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <RowTitle label={`Joueurs (exactement ${ts})`} />
                    <div style={{ display: "grid", gap: 8 }}>
                      {Array.from({ length: ts }).map((_, k) => (
                        <TextInput
                          key={`${String(t.id || idx)}_p_${k}`}
                          value={String(players[k] ?? "")}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            setTeamsInput((prev) => {
                              const next = [...(prev || [])];
                              const cur = next[idx] || { id: makeTeamId(idx), name: `Équipe ${idx + 1}`, players: normalizeTeamPlayers([]) };
                              const p = Array.isArray(cur.players) ? [...cur.players] : [];
                              while (p.length < ts) p.push("");
                              p[k] = v;
                              next[idx] = { ...cur, players: p };
                              return next;
                            });
                          }}
                          placeholder={`Joueur ${k + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <NeonGhost
                      label="Supprimer"
                      onClick={() => {
                        setTeamsInput((prev) => {
                          const arr = [...(prev || [])];
                          arr.splice(idx, 1);
                          return arr.map((x: any, i: number) => ({ ...x, name: String(x?.name || `Équipe ${i + 1}`) }));
                        });
                        setTeamsExpandedIdx((prev) => {
                          if (prev == null) return null;
                          if (prev === idx) return null;
                          return prev > idx ? prev - 1 : prev;
                        });
                      }}
                    />

                    <NeonGhost
                      label="Dupliquer"
                      onClick={() => {
                        setTeamsInput((prev) => {
                          const arr = [...(prev || [])];
                          const cur = arr[idx];
                          if (!cur) return arr;
                          const copy = { ...cur, id: makeTeamId(arr.length), name: `${String(cur.name || `Équipe ${idx + 1}`)} (copy)` };
                          arr.splice(idx + 1, 0, copy);
                          return arr;
                        });
                        setTeamsExpandedIdx(idx + 1);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
    </div>

    {!petanqueTeamsReady ? (
      <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.75 }}>
        ⚠️ Équipes invalides : minimum 2 équipes et chaque équipe doit contenir exactement {petanqueTeamSize} joueur(s) (noms non vides).
      </div>
    ) : null}
  </div>
) : null}
        {/* BOTS (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>
                <b style={{ color: primary }}>{botIds.length}</b> bot(s)
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                <NeonGhost label="Tous les bots" onClick={() => setBotIds(botsCatalog.map((b: any) => String(b.id)))} />
                <NeonGhost label="Aucun bot" onClick={() => setBotIds([])} />
                <InfoIconButton onClick={() => openInfo("botsSelect")} />
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 14,
                overflowX: "auto",
                overflowY: "visible",
                paddingBottom: 10,
                paddingTop: 10,
                WebkitOverflowScrolling: "touch",
                scrollSnapType: "x mandatory",
              }}
              className="dc-scroll-thin"
            >
              {botsCatalog.map((b: any) => (
                <PlayerCarouselTile
                  key={String(b.id)}
                  active={botIds.includes(String(b.id))}
                  name={b.name}
                  avatarUrl={b.avatar}
                  avg3D={Number(b.avg3D) || 0}
                  isBot
                  onClick={() => toggleBot(String(b.id))}
                  primary={primary}
                />
              ))}
            </div>
          </>
        ) : null}

        {!minPlayersOk ? (
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
            ⚠️
            {isPetanque
              ? petanqueEntry === "teams"
                ? " Minimum 2 équipes."
                : ` Minimum ${petanqueMinPlayers} joueurs (2 équipes).`
              : " Minimum 2 joueurs."}
          </div>
        ) : null}
      </Section>

      {/* Params match X01 (hors pétanque) */}
      {!isPetanque && mode === "x01" ? (
        <Section title="Match — Paramètres X01" subtitle="Score de départ + IN/OUT." accent={primary}>
          <RowTitle label="Score de départ" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[301, 501, 701, 901].map((v) => (
              <NeonPill key={v} active={x01Start === v} label={String(v)} onClick={() => setX01Start(v as any)} primary={primary} />
            ))}
          </div>

          <div style={{ height: 10 }} />

          <RowTitle label="Mode d’entrée" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={x01In === "simple"} label="Simple IN" onClick={() => setX01In("simple")} primary={primary} />
            <NeonPill active={x01In === "double"} label="Double IN" onClick={() => setX01In("double")} primary={primary} />
            <NeonPill active={x01In === "master"} label="Master IN" onClick={() => setX01In("master")} primary={primary} />
          </div>

          <div style={{ height: 10 }} />

          <RowTitle label="Mode de sortie" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={x01Out === "simple"} label="Simple OUT" onClick={() => setX01Out("simple")} primary={primary} />
            <NeonPill active={x01Out === "double"} label="Double OUT" onClick={() => setX01Out("double")} primary={primary} />
            <NeonPill active={x01Out === "master"} label="Master OUT" onClick={() => setX01Out("master")} primary={primary} />
          </div>
        </Section>
      ) : null}

      {/* ✅ Format tournoi */}
      <Section title={isLeague ? "Format de la ligue / championnat" : "Format du tournoi"} subtitle={isPetanque ? "Formats Pétanque (réalistes)." : "Chaque option a son (i) comme TYPE."} accent={primary}>
        <RowTitle label="Type" />

        {isPetanque ? (
          <div style={{ display: "grid", gap: 10 }}>
            <LineOption label="Élimination directe (KO)" active={format === "single_ko"} onClick={() => setFormat("single_ko")} onInfo={() => openInfo("type_single")} primary={primary} />
            <LineOption label="Championnat" active={format === "round_robin"} onClick={() => setFormat("round_robin")} onInfo={() => openInfo("type_rr")} primary={primary} />
            <LineOption label="Poules + Phase finale (KO)" active={format === "groups_ko"} onClick={() => setFormat("groups_ko")} onInfo={() => openInfo("type_groups")} primary={primary} />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <LineOption label="Élimination simple" active={format === "single_ko"} onClick={() => setFormat("single_ko")} onInfo={() => openInfo("type_single")} primary={primary} />
            <LineOption label="Élimination double" active={format === "double_ko"} onClick={() => setFormat("double_ko")} onInfo={() => openInfo("type_double")} primary={primary} />
            <LineOption label="Championnat (RR)" active={format === "round_robin"} onClick={() => setFormat("round_robin")} onInfo={() => openInfo("type_rr")} primary={primary} />
            <LineOption label="Poules + KO" active={format === "groups_ko"} onClick={() => setFormat("groups_ko")} onInfo={() => openInfo("type_groups")} primary={primary} />
          </div>
        )}

        <div style={{ height: 14 }} />

        {/* Best-of (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <RowTitle label="Match — Best-of" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([1, 3, 5, 7] as BestOf[]).map((v) => (
                  <NeonPill key={v} active={bestOf === v} label={`BO${v}`} onClick={() => setBestOf(v)} primary={primary} />
                ))}
              </div>
              <InfoIconButton onClick={() => openInfo("bestof")} />
            </div>

            <div style={{ height: 14 }} />
          </>
        ) : null}

        {/* Têtes de série */}
        {!isPetanque ? (
          <>
            <RowTitle label="Têtes de série" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <NeonPill active={seedMode === "random"} label="Aléatoire" onClick={() => setSeedMode("random")} primary={primary} />
                <NeonPill active={seedMode === "byLevel"} label="Par niveau (avg3D)" onClick={() => setSeedMode("byLevel")} primary={primary} />
              </div>
              <InfoIconButton onClick={() => openInfo("seed")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : (
          <div style={{ fontSize: 11.5, opacity: 0.78, marginBottom: 14 }}>
            Têtes de série : <b style={{ color: primary }}>Aléatoire</b> (Pétanque)
          </div>
        )}

        {(format === "round_robin" || format === "groups_ko") ? (
          <>
            <RowTitle label="Tours (Round Robin)" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <NeonPill key={n} active={rrRounds === n} label={`${n} tour${n > 1 ? "s" : ""}`} onClick={() => setRrRounds(n)} primary={primary} />
                ))}
              </div>
              <InfoIconButton onClick={() => openInfo("rrRounds")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        {format === "groups_ko" ? (
          <>
            <RowTitle label="Poules" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <TextInput value={playersPerGroup} onChange={(e: any) => setPlayersPerGroup(e.target.value)} placeholder={isPetanque ? "Joueurs par poule (ex: 6)" : "Joueurs par poule (ex: 5)"} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                    <NeonPill key={n} active={qualifiersPerGroup === n} label={`${n} qualif/poule`} onClick={() => setQualifiersPerGroup(n)} primary={primary} />
                  ))}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                  Poules auto ≈ <b style={{ color: primary }}>{computedGroups}</b> (sur {isPetanque ? Math.max(2, petanqueTeamsCountEffective) : Math.max(2, totalSelectedIds.length)} {isPetanque ? "équipes" : "joueurs"})
                </div>
              </div>
              <InfoIconButton onClick={() => openInfo("groups")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        {format !== "round_robin" ? (
          <>
            <RowTitle label="Bracket KO" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <NeonPill active={bracketAuto} label={isPetanque ? "Auto (pow2 équipes)" : "Auto (pow2)"} onClick={() => setBracketAuto(true)} primary={primary} />
                  <NeonPill active={!bracketAuto} label={isPetanque ? "Manuel (équipes)" : "Manuel"} onClick={() => setBracketAuto(false)} primary={primary} />
                </div>

                {!bracketAuto ? (
                  <TextInput
                    value={bracketTarget}
                    onChange={(e: any) => setBracketTarget(e.target.value)}
                    placeholder={isPetanque ? "Nb équipes (ex: 8, 16, 24…)" : "Taille bracket (ex: 24, 32, 48...)"}
                  />
                ) : null}

                <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                  Taille visée (aperçu) : <b style={{ color: primary }}>{desiredSizePreview || "—"}</b>
                  {isPetanque ? <span style={{ opacity: 0.75 }}> équipes</span> : null}
                </div>
              </div>
              <InfoIconButton onClick={() => openInfo("bracket")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        <RowTitle label="Repêchage" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={repechageEnabled} label="ON" onClick={() => setRepechageEnabled(true)} primary={primary} />
            <NeonPill active={!repechageEnabled} label="OFF" onClick={() => setRepechageEnabled(false)} primary={primary} />
          </div>
          <InfoIconButton onClick={() => openInfo("repechage")} />
        </div>

        {/* Auto-fill (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <div style={{ height: 14 }} />
            <RowTitle label="Auto-fill BOTS IA" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <NeonPill active={autoFillBots} label="ON" onClick={() => setAutoFillBots(true)} disabled={format === "round_robin"} primary={primary} />
                <NeonPill active={!autoFillBots} label="OFF" onClick={() => setAutoFillBots(false)} disabled={format === "round_robin"} primary={primary} />
              </div>
              <InfoIconButton onClick={() => openInfo("autofill")} />
            </div>

            {format === "round_robin" ? <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>ℹ️ Auto-fill désactivé en Championnat.</div> : null}
          </>
        ) : null}
      </Section>

      {/* CTA */}
      <div style={{ marginTop: 14 }}>
        <NeonPrimary label={isLeague ? "Créer la ligue" : "Créer le tournoi"} onClick={createTournament} disabled={!canCreate} primary={primary} />
        {!canCreate ? (
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.72 }}>
            ⚠️{" "}
            {isPetanque
              ? `Nom + au moins ${petanqueMinPlayers} joueurs + total multiple de ${petanqueTeamSize}.`
              : "Renseigne un nom, choisis un mode et sélectionne au moins 2 joueurs."}
          </div>
        ) : null}
      </div>

      {/* Sheet mode (DARTS ONLY) */}
      <Sheet open={sheetMode && !isPetanque} title="Choisir un mode" onClose={() => setSheetMode(false)} primary={primary}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {availableModes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setSheetMode(false);
                }}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: "12px 12px",
                  border: mode === m ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                  color: "rgba(255,255,255,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  boxShadow: mode === m ? `0 14px 34px ${primary}22` : "none",
                }}
              >
                <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
                  <div style={{ fontWeight: 950, fontSize: 14, color: primary }}>{MODE_LABEL[m]}</div>
                </div>

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: `radial-gradient(circle at 30% 0%, ${primary}, ${primary}55)`,
                    boxShadow: `0 0 14px ${primary}33`,
                    display: "grid",
                    placeItems: "center",
                    color: "#120c06",
                    fontWeight: 950,
                  }}
                  aria-hidden
                >
                  ✓
                </div>
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {showCompetitionLogoPicker ? (
        <CompetitionLogoPickerModal
          selected={competitionAvatar}
          accent={primary}
          onClose={() => setShowCompetitionLogoPicker(false)}
          onPick={(url: string | null) => {
            setCompetitionAvatar(url || null);
            if (url) setShowCompetitionLogoPicker(false);
          }}
        />
      ) : null}

      {showCompetitionCoverPicker ? (
        <CompetitionCoverPickerModal
          selected={competitionCover}
          accent={primary}
          onClose={() => setShowCompetitionCoverPicker(false)}
          onPick={(url: string | null) => {
            setCompetitionCover(url || null);
            if (url) setShowCompetitionCoverPicker(false);
          }}
        />
      ) : null}

      {/* ✅ Modal info centré */}
      <CenterInfoModal open={infoOpen} title={infoContent.title} primary={primary} onClose={() => setInfoOpen(false)}>
        {infoContent.body}
      </CenterInfoModal>
    </div>
  );
}
