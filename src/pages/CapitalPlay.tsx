// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import { PRO_BOTS, proBotToProfile } from "../lib/botsPro";
import { loadBotPlayers } from "../lib/bots";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  applyCapitalVisit,
  buildCapitalMatchStats,
  buildCapitalPlayerStats,
  buildCapitalTeamStats,
  capitalDartLabel,
  makeCapitalBotVisit,
  normalizeCapitalDarts,
  rankCapitalPlayers,
  type CapitalVisit,
} from "../lib/capitalGame";

type BotLevel = "easy" | "normal" | "hard";

export type CapitalModeKind = "official" | "custom";

export type CapitalContractID =
  | "capital"
  | "n20"
  | "triple_any"
  | "n19"
  | "double_any"
  | "n18"
  | "side"
  | "n17"
  | "suite"
  | "n16"
  | "colors_3"
  | "n15"
  | "exact_57"
  | "n14"
  | "center";

export type CapitalStartOrderMode = "random" | "fixed";

export type CapitalConfigPayload = {
  // ✅ Participants
  players: number; // total (humains + bots)
  selectedIds?: string[]; // ids profils/bots (si fourni, il prime)
  startOrderMode?: CapitalStartOrderMode;
  startOrderApplied?: boolean;
  participantMode?: "players" | "teams";
  teamsSourceMode?: "manual" | "saved" | "auto";
  playersList?: any[];
  teams?: Array<{
    id: string;
    name: string;
    color?: string | null;
    logoDataUrl?: string | null;
    playerIds?: string[];
    players?: string[];
  }>;
  playerDartSets?: Record<string, string | null>;

  // Bots
  botsEnabled: boolean;
  botLevel: BotLevel;

  // Mode / Contrats
  mode: CapitalModeKind;
  customContracts?: CapitalContractID[];
  includeCapital?: boolean;

  // Saisie
  inputMethod?: "keypad" | "dartboard" | "presets";

  // ✅ Victoire / tie-break (optionnel, depuis CapitalConfig)
  victoryMode?: "best_after_contracts" | "first_to_target";
  targetScore?: number;
  tieBreaker?: "none" | "last_contract_total";

  // ✅ Règles
  failDivideBy2?: boolean;
  startingCapital?: number;

  // ✅ Timer
  turnTimerSec?: number; // 0 = off

  // ✅ Bots (comportement)
  botsAutoPlay?: boolean; // true = bot joue tout seul
  botTurnDelayMs?: number; // délai avant action bot (ms)
  botRisk?: "safe" | "normal" | "aggressive";
};

type Dart = { v: number; mult: 1 | 2 | 3 };

const OFFICIAL_CONTRACTS: CapitalContractID[] = [
  "capital",
  "n20",
  "triple_any",
  "n19",
  "double_any",
  "n18",
  "side",
  "n17",
  "suite",
  "n16",
  "colors_3",
  "n15",
  "exact_57",
  "n14",
  "center",
];

const INFO_TEXT = `RÈGLE OFFICIELLE — CAPITAL (15 contrats)

Avant les contrats, chaque joueur lance 3 fléchettes pour se constituer son CAPITAL (score de départ).
Ensuite, chaque contrat se joue en 1 volée de 3 fléchettes :

- ✅ Contrat réussi → on AJOUTE le total de la volée au score
- ❌ Contrat raté → le score est DIVISÉ PAR 2 (arrondi à l’entier inférieur)

Contrats: Capital, 20, Triple, 19, Double, 18, Side (côte à côte), 17, Suite, 16, Couleur, 15, 57, 14, Centre.`;

/* ================================
   Densité / responsive (style X01End)
================================ */
const D = {
  fsBody: 12,
  fsHead: 12,
  padCellV: 6,
  padCellH: 10,
  radius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  bg: "rgba(255,255,255,0.04)",
  headBg: "rgba(255,255,255,0.06)",
};

function safeStoreProfiles(store: any): any[] {
  const profiles =
    store?.profiles ??
    store?.profilesStore?.profiles ??
    store?.profileStore?.profiles ??
    store?.profiles_v7 ??
    [];
  return Array.isArray(profiles) ? profiles : [];
}

function safeCustomBotsProfiles(): any[] {
  try {
    return loadBotPlayers().map((b: any) => ({
      id: String(b.id),
      name: String(b?.name || "BOT"),
      avatarDataUrl: b?.avatarDataUrl || b?.avatarUrl || b?.avatar || null,
      avatarUrl: b?.avatarUrl || b?.avatar || null,
      avatar: b?.avatar || b?.avatarUrl || b?.avatarDataUrl || null,
      isBot: true,
      botLevel: b?.botLevel ?? b?.level ?? undefined,
    }));
  } catch {
    return [];
  }
}

function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/**
 * Mapping “classique” des couleurs rouge/vert sur les anneaux double/triple.
 * (Dartboard standard : rouge = 20,12,14,8,7,3,2,10,13,18 ; vert = le reste)
 */
const RED_NUMS = new Set([20, 12, 14, 8, 7, 3, 2, 10, 13, 18]);

function scoreDart(d: Dart): number {
  if (!d) return 0;
  const v = Number(d.v || 0);
  const m = Number(d.mult || 1);
  if (!Number.isFinite(v) || !Number.isFinite(m)) return 0;
  if (v === 25) return 25 * m; // bull=25, double-bull=50
  if (v <= 0) return 0;
  return v * m;
}

function scoreThrow(th: Dart[]): number {
  return (th || []).reduce((acc, d) => acc + scoreDart(d), 0);
}

function isValidNumber(v: number): boolean {
  return Number.isFinite(v) && v >= 1 && v <= 20;
}

function contractLabel(id: CapitalContractID): string {
  switch (id) {
    case "capital":
      return "Capital";
    case "n20":
      return "20";
    case "triple_any":
      return "Triple";
    case "n19":
      return "19";
    case "double_any":
      return "Double";
    case "n18":
      return "18";
    case "side":
      return "Side";
    case "n17":
      return "17";
    case "suite":
      return "Suite";
    case "n16":
      return "16";
    case "colors_3":
      return "Couleur";
    case "n15":
      return "15";
    case "exact_57":
      return "57";
    case "n14":
      return "14";
    case "center":
      return "Centre";
    default:
      return String(id);
  }
}

type DartColor = "black" | "white" | "red" | "green" | "none";

/** Renvoie une couleur “contrat Couleur” (noir/blanc pour simples, rouge/vert pour doubles/triples, bull vert/rouge) */
function dartColor(d: Dart): DartColor {
  const v = d?.v ?? 0;
  const mult = d?.mult ?? 1;

  if (v === 25) {
    // bull ext = vert, bull int (double) = rouge
    return mult === 2 ? "red" : "green";
  }
  if (!isValidNumber(v)) return "none";

  if (mult === 1) {
    const idx = BOARD_ORDER.indexOf(v);
    if (idx < 0) return "none";
    return idx % 2 === 0 ? "black" : "white"; // 20 (index 0) = noir, puis alternance
  }
  // double/triple
  return RED_NUMS.has(v) ? "red" : "green";
}

function isTripleAny(th: Dart[]): boolean {
  return (th || []).some((d) => d?.mult === 3 && isValidNumber(d?.v ?? 0));
}

function isDoubleAny(th: Dart[]): boolean {
  return (th || []).some((d) => d?.mult === 2 && (isValidNumber(d?.v ?? 0) || d?.v === 25));
}

function hasNumber(th: Dart[], n: number): boolean {
  return (th || []).some((d) => d?.v === n && isValidNumber(n));
}

function isCenter(th: Dart[]): boolean {
  return (th || []).some((d) => d?.v === 25);
}

function isSuite(th: Dart[]): boolean {
  const nums = (th || []).map((d) => d?.v ?? 0).filter((v) => isValidNumber(v));
  if (nums.length !== 3) return false;
  const set = Array.from(new Set(nums));
  if (set.length !== 3) return false;
  set.sort((a, b) => a - b);
  return set[2] - set[0] === 2 && set[1] === set[0] + 1;
}

function isSide(th: Dart[]): boolean {
  // 3 secteurs côte à côte sur la cible (ordre circulaire), bull interdit
  const nums = (th || []).map((d) => d?.v ?? 0).filter((v) => isValidNumber(v));
  if (nums.length !== 3) return false;
  const setNums = Array.from(new Set(nums));
  if (setNums.length !== 3) return false;

  const idxs = setNums.map((n) => BOARD_ORDER.indexOf(n)).filter((i) => i >= 0);
  if (idxs.length !== 3) return false;

  // contiguous triplet on circular ring
  for (let start = 0; start < 20; start++) {
    const needed = new Set([start, (start + 1) % 20, (start + 2) % 20]);
    if (idxs.every((i) => needed.has(i))) return true;
  }
  return false;
}

function isColors3(th: Dart[]): boolean {
  const cols = (th || []).map(dartColor).filter((c) => c !== "none");
  if (cols.length !== 3) return false;
  return new Set(cols).size === 3;
}

function isExact(th: Dart[], target: number): boolean {
  return scoreThrow(th) === target;
}

function contractSuccess(contract: CapitalContractID, th: Dart[]): boolean {
  switch (contract) {
    case "capital":
      return (th || []).length === 3; // toujours “réussi” si 3 fléchettes saisies
    case "n20":
      return hasNumber(th, 20);
    case "triple_any":
      return isTripleAny(th);
    case "n19":
      return hasNumber(th, 19);
    case "double_any":
      return isDoubleAny(th);
    case "n18":
      return hasNumber(th, 18);
    case "side":
      return isSide(th);
    case "n17":
      return hasNumber(th, 17);
    case "suite":
      return isSuite(th);
    case "n16":
      return hasNumber(th, 16);
    case "colors_3":
      return isColors3(th);
    case "n15":
      return hasNumber(th, 15);
    case "exact_57":
      return isExact(th, 57);
    case "n14":
      return hasNumber(th, 14);
    case "center":
      return isCenter(th);
    default:
      return false;
  }
}

function rand(p: number) {
  return Math.random() < p;
}

function botMakeThrow(contract: CapitalContractID, level: any, risk: any): Dart[] {
  // heuristique simple et stable (pas “parfait”, mais jouable)
  const lvl = level || "normal";
  const rsk = risk || "normal";

  const baseAcc = lvl === "easy" ? 0.45 : lvl === "hard" ? 0.78 : 0.62;
  const riskBoost = rsk === "aggressive" ? 0.1 : rsk === "safe" ? -0.08 : 0;

  const acc = Math.max(0.15, Math.min(0.92, baseAcc + riskBoost));

  const miss = () => ({ v: 0, mult: 1 } as Dart);
  const pick = (v: number, mult: 1 | 2 | 3): Dart => ({ v, mult });
  const N = (n: number) => (rand(acc) ? pick(n, 1) : miss());

  if (contract === "capital") {
    return [
      rand(acc) ? pick(20, rand(acc * 0.55) ? 3 : 1) : miss(),
      rand(acc) ? pick(19, rand(acc * 0.4) ? 3 : 1) : miss(),
      rand(acc) ? pick(18, rand(acc * 0.35) ? 3 : 1) : miss(),
    ];
  }

  if (contract === "n20") return [N(20), miss(), miss()];
  if (contract === "n19") return [N(19), miss(), miss()];
  if (contract === "n18") return [N(18), miss(), miss()];
  if (contract === "n17") return [N(17), miss(), miss()];
  if (contract === "n16") return [N(16), miss(), miss()];
  if (contract === "n15") return [N(15), miss(), miss()];
  if (contract === "n14") return [N(14), miss(), miss()];

  if (contract === "double_any") return [rand(acc) ? pick(20, 2) : miss(), miss(), miss()];
  if (contract === "triple_any") return [rand(acc) ? pick(20, 3) : miss(), miss(), miss()];

  if (contract === "center") {
    return [rand(acc) ? pick(rand(acc * 0.55) ? 50 : 25, 1) : miss(), miss(), miss()];
  }

  if (contract === "exact_57") {
    if (rand(acc * 0.8)) return [pick(19, 3), miss(), miss()];
    return [pick(20, 1), pick(19, 1), pick(18, 1)];
  }

  if (contract === "suite") {
    if (rand(acc)) return [pick(20, 1), pick(19, 1), pick(18, 1)];
    return [pick(12, 1), pick(13, 1), pick(14, 1)];
  }

  if (contract === "side") {
    if (rand(acc)) return [pick(18, 1), pick(19, 1), pick(20, 1)];
    return [pick(9, 1), pick(10, 1), pick(11, 1)];
  }

  if (contract === "colors_3") {
    return [rand(acc) ? pick(25, 1) : miss(), rand(acc) ? pick(20, 2) : miss(), rand(acc) ? pick(19, 3) : miss()];
  }

  return [miss(), miss(), miss()];
}

export default function CapitalPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: CapitalConfigPayload =
    (props?.params?.config as CapitalConfigPayload) ||
    (props?.config as CapitalConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      mode: "official",
      includeCapital: true,
      customContracts: OFFICIAL_CONTRACTS,
    };

  const store = props?.store;

  const profiles = useMemo(() => safeStoreProfiles(store), [store]);
  const proBots = useMemo(() => PRO_BOTS.map((b) => proBotToProfile(b) as any), []);
  const customBots = useMemo(() => safeCustomBotsProfiles(), []);
  const allEntities = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of profiles) if (p?.id) m.set(String(p.id), p);
    for (const b of [...proBots, ...customBots]) if (b?.id) m.set(String(b.id), b);
    return m;
  }, [profiles, proBots, customBots]);

  const participants = useMemo(() => {
    const ids =
      Array.isArray(cfg?.selectedIds) && cfg.selectedIds.length ? cfg.selectedIds.map((x) => String(x)).filter(Boolean) : [];
    let resolved: any[] = [];
    const configuredPlayers = Array.isArray(cfg?.playersList) ? cfg.playersList : [];
    const configuredById = new Map(configuredPlayers.map((player: any) => [String(player?.id), player]));
    if (ids.length) {
      resolved = ids.map((id) => configuredById.get(id) || allEntities.get(id) || { id, name: id, isBot: false });
    } else {
      resolved = Array.from({ length: Math.max(1, cfg.players || 2) }, (_, i) => ({
        id: String(i + 1),
        name: `Joueur ${i + 1}`,
      }));
    }
    // CapitalConfig applique l'ordre aléatoire une seule fois. Compatibilité avec
    // les anciennes configurations qui ne possèdent pas startOrderApplied.
    if (cfg?.startOrderMode === "random" && !cfg?.startOrderApplied && ids.length) resolved = shuffleCopy(resolved);
    return resolved;
  }, [cfg, allEntities]);

  const playerCount = participants.length || Math.max(1, cfg.players || 2);

  const contracts = useMemo<CapitalContractID[]>(() => {
    if (cfg.mode === "official") return OFFICIAL_CONTRACTS;

    const base = Array.isArray(cfg.customContracts) ? cfg.customContracts.filter(Boolean) : [];
    const includeCapital = cfg.includeCapital !== false;

    let out = base.slice(0, 30);
    if (includeCapital) {
      out = out.filter((x) => x !== "capital");
      out.unshift("capital");
    }
    if (out.length === 0) out = OFFICIAL_CONTRACTS;
    return out;
  }, [cfg.mode, cfg.customContracts, cfg.includeCapital]);

  const rounds = contracts.length;

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);

  const [scores, setScores] = useState<number[]>(() =>
    Array.from({ length: playerCount }, () => (cfg?.includeCapital === false ? (cfg?.startingCapital ?? 0) : 0))
  );
  const [visits, setVisits] = useState<CapitalVisit[]>([]);
  const [finishedRecord, setFinishedRecord] = useState<any>(null);
  const historySavedRef = useRef(false);

  const [currentThrow, setCurrentThrow] = useState<Dart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  // ✅ Timer state (affichage)
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // ✅ Fin de partie: overlay résumé (tableau)
  const [endModalOpen, setEndModalOpen] = useState<boolean>(false);

  // ✅ Patch: tie-break + victoire + bots
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [lastContractTotals, setLastContractTotals] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const botActingRef = useRef(false);

  const currentContract = contracts[Math.min(roundIdx, rounds - 1)];
  const isFinished = roundIdx >= rounds;

  function goBack() {
    if (props?.setTab) return props.setTab("capital_config", { config: cfg, returnTab: "games" });
    if (props?.go) return props.go("capital_config", { config: cfg, returnTab: "games" });
    window.history.back();
  }

  function pushDart(d: Dart) {
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, d];
    });
  }

  function cancelTurn() {
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function validateTurn(force: boolean = false, forcedThrow?: Dart[]) {
    if (isFinished) return;
    if (!force && currentThrow.length === 0) return;

    const th = normalizeCapitalDarts((forcedThrow ? [...forcedThrow] : [...currentThrow]) as any) as Dart[];
    const before = Number(scores[playerIdx] || 0);
    const applied = applyCapitalVisit(before, currentContract as any, th as any, cfg?.failDivideBy2 !== false);
    const nextScores = [...scores];
    nextScores[playerIdx] = applied.scoreAfter;
    setScores(nextScores);

    const participant = participants[playerIdx] || {};
    const teamId = cfg?.teams?.find((team: any) => (team.players || team.playerIds || []).map(String).includes(String(participant.id)))?.id || participant?.teamId || null;
    const newVisit: CapitalVisit = {
      id: `capital-visit-${Date.now()}-${playerIdx}-${roundIdx}`,
      contractId: currentContract as any,
      contractIndex: roundIdx,
      playerId: String(participant?.id ?? playerIdx),
      playerIndex: playerIdx,
      playerName: participant?.nickname ?? participant?.name ?? `Joueur ${playerIdx + 1}`,
      teamId,
      darts: th as any,
      visitScore: applied.visitScore,
      success: applied.success,
      scoreBefore: before,
      scoreAfter: applied.scoreAfter,
      delta: applied.delta,
      penaltyLost: applied.penaltyLost,
      createdAt: Date.now(),
    };
    setVisits((previous) => [...previous, newVisit]);

    const targetReached = (() => {
      if (cfg?.victoryMode !== "first_to_target" || !Number(cfg?.targetScore)) return false;
      if (cfg?.participantMode !== "teams") return applied.scoreAfter >= Number(cfg.targetScore);
      const team = cfg?.teams?.find((candidate: any) => String(candidate.id) === String(teamId));
      if (!team) return false;
      const memberIds = (team.players || team.playerIds || []).map(String);
      const total = participants.reduce((sum, player, index) => memberIds.includes(String(player?.id)) ? sum + Number(nextScores[index] || 0) : sum, 0);
      return total >= Number(cfg.targetScore);
    })();

    if (targetReached) {
      setWinnerIdx(playerIdx);
      setRoundIdx(rounds);
    }

    if (roundIdx === rounds - 1) {
      setLastContractTotals((prev) => {
        const out = [...prev];
        out[playerIdx] = applied.visitScore;
        return out;
      });
    }

    if (!targetReached) {
      const nextP = (playerIdx + 1) % playerCount;
      const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
      setPlayerIdx(nextP);
      setRoundIdx(nextR);
    }

    cancelTurn();
  }

  const leaderIdx = useMemo(() => {
    let best = -Infinity;
    let bestIdx = 0;
    scores.forEach((s, i) => {
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [scores]);

  const normalizedTeams = useMemo(() => (Array.isArray(cfg?.teams) ? cfg.teams : []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || (index === 0 ? "#ff4fa2" : index === 1 ? "#f7c85c" : index === 2 ? "#4fc3ff" : "#6dff7c"),
    logoDataUrl: team?.logoDataUrl || null,
    players: (team?.players || team?.playerIds || []).map(String),
  })), [cfg?.teams]);

  const teamScores = useMemo(() => normalizedTeams.map((team: any) => ({
    ...team,
    score: participants.reduce((total, player, index) => team.players.includes(String(player?.id)) ? total + Number(scores[index] || 0) : total, 0),
    last: participants.reduce((total, player, index) => team.players.includes(String(player?.id)) ? total + Number(lastContractTotals[index] || 0) : total, 0),
  })), [normalizedTeams, participants, scores, lastContractTotals]);

  const finalWinnerIdx = useMemo(() => {
    if (winnerIdx !== null) return winnerIdx;
    if (!isFinished) return null;

    const best = Math.max(...scores);
    const tied = scores
      .map((s, i) => ({ s, i }))
      .filter((x) => x.s === best)
      .map((x) => x.i);

    if (tied.length <= 1) return tied[0] ?? 0;

    if (cfg?.tieBreaker === "last_contract_total") {
      let bestLC = -Infinity;
      let bestIdx = tied[0];
      for (const i of tied) {
        const v = lastContractTotals[i] ?? 0;
        if (v > bestLC) {
          bestLC = v;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    return tied[0];
  }, [winnerIdx, isFinished, scores, cfg?.tieBreaker, lastContractTotals]);

  const winnerTeam = useMemo(() => {
    if (cfg?.participantMode !== "teams" || !teamScores.length) return null;
    const ranked = [...teamScores].sort((a, b) => b.score - a.score || (cfg?.tieBreaker === "last_contract_total" ? b.last - a.last : 0));
    if (winnerIdx !== null) {
      const winnerPlayerId = String(participants[winnerIdx]?.id || "");
      return teamScores.find((team: any) => team.players.includes(winnerPlayerId)) || ranked[0];
    }
    return ranked[0] || null;
  }, [cfg?.participantMode, cfg?.tieBreaker, teamScores, winnerIdx, participants]);

  useEffect(() => {
    if (isFinished) setEndModalOpen(true);
  }, [isFinished]);

  const successNow = useMemo(() => {
    if (isFinished) return false;
    if (currentThrow.length === 0) return false;
    const th = [...currentThrow];
    while (th.length < 3) th.push({ v: 0, mult: 1 });
    return contractSuccess(currentContract, th);
  }, [isFinished, currentThrow, currentContract]);

  // ✅ Timer par tour: affichage + timeout => volée = 3 misses (0) puis validation
  useEffect(() => {
    const sec = Number(cfg?.turnTimerSec || 0);
    if (!sec || sec <= 0) {
      setTimeLeft(0);
      return;
    }
    if (isFinished) {
      setTimeLeft(0);
      return;
    }

    const currentEnt = participants[playerIdx];
    const isBot = !!currentEnt?.isBot;
    if (isBot && cfg?.botsEnabled && cfg?.botsAutoPlay) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(sec);

    const tickId = window.setInterval(() => {
      setTimeLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      validateTurn(true, [
        { v: 0, mult: 1 },
        { v: 0, mult: 1 },
        { v: 0, mult: 1 },
      ]);
    }, sec * 1000);

    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdx, roundIdx, isFinished, cfg?.turnTimerSec, cfg?.botsEnabled, cfg?.botsAutoPlay]);

  // ✅ Bot auto-play: génère une volée puis valide
  useEffect(() => {
    if (isFinished) return;
    if (!cfg?.botsEnabled) return;
    if (!cfg?.botsAutoPlay) return;

    const ent = participants[playerIdx];
    if (!ent?.isBot) return;

    if (botActingRef.current) return;
    botActingRef.current = true;

    const delay = Number(cfg?.botTurnDelayMs ?? 650);
    const level = cfg?.botLevel ?? "normal";
    const risk = cfg?.botRisk ?? "normal";

    const id = window.setTimeout(() => {
      const th = makeCapitalBotVisit(currentContract as any, level, risk) as Dart[];
      validateTurn(true, th);
      botActingRef.current = false;
    }, Math.max(0, delay));

    return () => {
      window.clearTimeout(id);
      botActingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    playerIdx,
    roundIdx,
    isFinished,
    cfg?.botsEnabled,
    cfg?.botsAutoPlay,
    cfg?.botTurnDelayMs,
    cfg?.botLevel,
    cfg?.botRisk,
    currentContract,
  ]);

  const winnerI = finalWinnerIdx ?? leaderIdx;
  const capitalPlayers = useMemo(() => participants.map((player: any, index: number) => ({
    ...player,
    id: String(player?.id ?? index),
    profileId: player?.isBot ? null : String(player?.profileId || player?.id || index),
    name: player?.nickname ?? player?.name ?? `Joueur ${index + 1}`,
    teamId: normalizedTeams.find((team: any) => team.players.includes(String(player?.id)))?.id || player?.teamId || null,
  })), [participants, normalizedTeams]);
  const rawPlayerStats = useMemo(() => buildCapitalPlayerStats(capitalPlayers as any, visits, scores), [capitalPlayers, visits, scores]);
  const winningPlayerIds = useMemo(() => winnerTeam
    ? [...winnerTeam.players]
    : finalWinnerIdx !== null ? [String(capitalPlayers[finalWinnerIdx]?.id || "")] : [], [winnerTeam, finalWinnerIdx, capitalPlayers]);
  const playerStats = useMemo(() => rankCapitalPlayers(rawPlayerStats, winningPlayerIds), [rawPlayerStats, winningPlayerIds]);
  const teamStats = useMemo(() => buildCapitalTeamStats(normalizedTeams as any, playerStats), [normalizedTeams, playerStats]);
  const matchStats = useMemo(() => buildCapitalMatchStats(playerStats, teamStats, visits), [playerStats, teamStats, visits]);

  useEffect(() => {
    if (!isFinished || historySavedRef.current || !visits.length) return;
    historySavedRef.current = true;
    const now = Date.now();
    const startedAt = Number(visits[0]?.createdAt || now);
    const savedMatchStats = { ...matchStats, durationMs: Math.max(Number(matchStats?.durationMs || 0), Math.max(0, now - startedAt)) };
    const winnerIds = winningPlayerIds.filter(Boolean);
    const record = {
      id: `capital-${now}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "capital",
      mode: "capital",
      sport: "darts",
      status: "finished",
      createdAt: startedAt,
      updatedAt: now,
      players: playerStats,
      teams: teamStats,
      winnerId: winnerIds[0] || null,
      winnerIds,
      winnerTeamId: winnerTeam?.id || null,
      config: cfg,
      summary: {
        mode: "capital",
        title: "CAPITAL",
        participantMode: cfg?.participantMode || "players",
        winnerId: winnerIds[0] || null,
        winnerIds,
        winnerTeamId: winnerTeam?.id || null,
        winnerTeamName: winnerTeam?.name || null,
        contracts: contracts.map((id) => ({ id, label: contractLabel(id) })),
        contractsPlayed: contracts.length,
        rounds: contracts.length,
        durationMs: savedMatchStats.durationMs,
        matchStats: savedMatchStats,
        stats: savedMatchStats,
        players: playerStats,
        perPlayer: playerStats,
        teams: teamStats,
        visits,
        finishedAt: now,
      },
      payload: {
        kind: "capital",
        mode: "capital",
        config: cfg,
        players: playerStats,
        teams: teamStats,
        winnerId: winnerIds[0] || null,
        winnerIds,
        winnerTeamId: winnerTeam?.id || null,
        stats: { players: playerStats, teams: teamStats, visits, match: savedMatchStats },
        summary: {
          mode: "capital",
          winnerId: winnerIds[0] || null,
          winnerIds,
          winnerTeamId: winnerTeam?.id || null,
          winnerTeamName: winnerTeam?.name || null,
          players: playerStats,
          perPlayer: playerStats,
          teams: teamStats,
          visits,
          contracts: contracts.map((id) => ({ id, label: contractLabel(id) })),
          contractsPlayed: contracts.length,
          rounds: contracts.length,
          durationMs: savedMatchStats.durationMs,
          matchStats: savedMatchStats,
          stats: savedMatchStats,
          finishedAt: now,
        },
      },
    };
    setFinishedRecord(record);
    try { props?.onFinish?.(record); } catch {}
  }, [isFinished, visits, playerStats, teamStats, matchStats, winningPlayerIds, winnerTeam, cfg, contracts, props?.onFinish]);

  const EndModal = () => {
    if (!isFinished || !endModalOpen) return null;

    const cols = participants.map((p, i) => ({
      i,
      name: p?.nickname ?? p?.name ?? `Joueur ${i + 1}`,
      isBot: !!p?.isBot,
      score: Number(scores[i] ?? 0),
      last: Number(lastContractTotals[i] ?? 0),
      stats: playerStats.find((row: any) => String(row.id || row.playerId) === String(p?.id)),
    }));

    const ranked = [...cols].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (cfg?.tieBreaker === "last_contract_total") return b.last - a.last;
      return a.i - b.i;
    });

    const rankOf = new Map<number, number>();
    ranked.forEach((r, idx) => rankOf.set(r.i, idx + 1));

    const headerCell = (children: any) => (
      <div
        style={{
          fontSize: D.fsHead,
          fontWeight: 950,
          opacity: 0.9,
          padding: `${D.padCellV}px ${D.padCellH}px`,
          background: D.headBg,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    );

    const rowLabelCell = (label: string) => (
      <div
        style={{
          fontSize: D.fsBody,
          fontWeight: 950,
          opacity: 0.85,
          padding: `${D.padCellV}px ${D.padCellH}px`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.20)",
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        {label}
      </div>
    );

    const cell = (val: any, highlight?: boolean) => (
      <div
        style={{
          fontSize: D.fsBody,
          padding: `${D.padCellV}px ${D.padCellH}px`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
          background: highlight ? "rgba(255,230,120,0.06)" : "transparent",
          fontWeight: highlight ? 1000 : 900,
        }}
      >
        {val}
      </div>
    );

    const gridCols = `220px repeat(${cols.length}, minmax(140px, 1fr))`;

    return (
      <div
        onClick={() => setEndModalOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(0,0,0,0.70)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 980,
            borderRadius: D.radius,
            border: D.border,
            background: "rgba(18,20,34,0.96)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 950, letterSpacing: 1 }}>FIN DE PARTIE — CAPITAL</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000 }}>
                🏆 Vainqueur :{" "}
                <span style={{ color: "rgba(255,230,120,0.95)" }}>
                  {winnerTeam?.name || participants[winnerI]?.name || `Joueur ${winnerI + 1}`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => finishedRecord && (props?.go || props?.setTab)?.("darts_mode_summary", { record: finishedRecord })}
                disabled={!finishedRecord}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,215,106,.35)", background: "rgba(255,215,106,.10)", fontWeight: 1000, opacity: finishedRecord ? 1 : .5 }}
              >
                Stats détaillées
              </button>
              <button
                onClick={() => setEndModalOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  fontWeight: 1000,
                }}
              >
                Fermer
              </button>
              <button
                onClick={goBack}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.10)",
                  fontWeight: 1000,
                }}
              >
                Rejouer / config
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ padding: 14 }}>
            <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
              {[
                ["Contrats", matchStats.contractsPlayed],
                ["Réussite", `${matchStats.successRate}%`],
                ["Fléchettes", matchStats.totalDarts],
                ["Précision", `${matchStats.hitRate}%`],
                ["Points gagnés", matchStats.totalPointsWon],
                ["Capital perdu", matchStats.totalCapitalLost],
                ["Best volée", matchStats.bestVisit],
                ["Moy. / volée", matchStats.averageVisit],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ padding: 10, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 9.5, opacity: .65, fontWeight: 950, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 3, color: "#ffd76a", fontSize: 18, fontWeight: 1000 }}>{value}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                borderRadius: D.radius,
                border: D.border,
                background: D.bg,
                overflow: "auto",
                maxHeight: "70vh",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: gridCols }}>
                {headerCell("STAT")}
                {cols.map((p) =>
                  headerCell(
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name} {p.isBot ? <span style={{ opacity: 0.7 }}>(BOT)</span> : null}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900 }}>Rang #{rankOf.get(p.i) ?? "—"}</div>
                    </div>
                  )
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: gridCols }}>
                {rowLabelCell("Score final")}
                {cols.map((p) => cell(p.score, p.i === winnerI))}

                {rowLabelCell("Capital de départ")}
                {cols.map((p) => cell(p.stats?.startingCapital ?? 0, p.i === winnerI))}

                {rowLabelCell("Pic de capital")}
                {cols.map((p) => cell(p.stats?.peakCapital ?? 0, p.i === winnerI))}

                {rowLabelCell("Capital minimum")}
                {cols.map((p) => cell(p.stats?.lowestCapital ?? 0, p.i === winnerI))}

                {rowLabelCell("Variation nette")}
                {cols.map((p) => cell(`${Number(p.stats?.netCapitalChange ?? 0) >= 0 ? "+" : ""}${p.stats?.netCapitalChange ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Capital conservé")}
                {cols.map((p) => cell(`${p.stats?.capitalRetentionRate ?? 0}%`, p.i === winnerI))}

                {rowLabelCell("Dernier contrat (tie-break)")}
                {cols.map((p) => cell(p.last, p.i === winnerI))}

                {rowLabelCell("Contrats joués")}
                {cols.map((p) => cell(p.stats?.contractsPlayed ?? rounds, p.i === winnerI))}

                {rowLabelCell("Contrats réussis")}
                {cols.map((p) => cell(p.stats?.successfulContracts ?? 0, p.i === winnerI))}

                {rowLabelCell("Taux de réussite")}
                {cols.map((p) => cell(`${p.stats?.successRate ?? 0}%`, p.i === winnerI))}

                {rowLabelCell("Points gagnés")}
                {cols.map((p) => cell(p.stats?.pointsWon ?? 0, p.i === winnerI))}

                {rowLabelCell("Capital perdu")}
                {cols.map((p) => cell(p.stats?.capitalLost ?? 0, p.i === winnerI))}

                {rowLabelCell("Pénalités")}
                {cols.map((p) => cell(`${p.stats?.penaltyEvents ?? 0} • moy. ${p.stats?.avgPenalty ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Série réussites max")}
                {cols.map((p) => cell(p.stats?.successStreakMax ?? 0, p.i === winnerI))}

                {rowLabelCell("Série échecs max")}
                {cols.map((p) => cell(p.stats?.failStreakMax ?? 0, p.i === winnerI))}

                {rowLabelCell("Volées / fléchettes")}
                {cols.map((p) => cell(`${p.stats?.visits ?? 0} / ${p.stats?.dartsThrown ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Moyenne / volée")}
                {cols.map((p) => cell(p.stats?.averageVisit ?? 0, p.i === winnerI))}

                {rowLabelCell("Moyenne / 3 flèches")}
                {cols.map((p) => cell(p.stats?.avg3 ?? 0, p.i === winnerI))}

                {rowLabelCell("Meilleure volée")}
                {cols.map((p) => cell(p.stats?.bestVisit ?? 0, p.i === winnerI))}

                {rowLabelCell("Meilleur gain")}
                {cols.map((p) => cell(`+${p.stats?.bestGain ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Plus grosse perte")}
                {cols.map((p) => cell(`-${p.stats?.biggestLoss ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Précision impacts")}
                {cols.map((p) => cell(`${p.stats?.hitRate ?? 0}%`, p.i === winnerI))}

                {rowLabelCell("S / D / T")}
                {cols.map((p) => cell(`${p.stats?.singles ?? 0} / ${p.stats?.doubles ?? 0} / ${p.stats?.triples ?? 0}`, p.i === winnerI))}

                {rowLabelCell("Bull / DBull / Miss")}
                {cols.map((p) => cell(`${p.stats?.bulls ?? 0} / ${p.stats?.dbulls ?? 0} / ${p.stats?.misses ?? 0}`, p.i === winnerI))}

                {rowLabelCell("60+ / 100+ / 140+ / 180")}
                {cols.map((p) => cell(`${p.stats?.visits60Plus ?? 0} / ${p.stats?.visits100Plus ?? 0} / ${p.stats?.visits140Plus ?? 0} / ${p.stats?.visits180 ?? 0}`, p.i === winnerI))}

                {rowLabelCell("57 exact")}
                {cols.map((p) => cell(p.stats?.exact57 ?? 0, p.i === winnerI))}

                {rowLabelCell("Secteur le + touché")}
                {cols.map((p) => cell(p.stats?.topSector ? `${p.stats.topSector} (${p.stats?.topSectorHits ?? 0})` : "—", p.i === winnerI))}

                {rowLabelCell("Mode")}
                {cols.map((p) => cell(cfg?.mode ?? "official", p.i === winnerI))}

                {rowLabelCell("Victoire")}
                {cols.map((p) =>
                  cell(cfg?.victoryMode === "first_to_target" ? `Score cible ${cfg?.targetScore ?? "?"}` : "Après contrats", p.i === winnerI)
                )}

                {rowLabelCell("/2 si échec")}
                {cols.map((p) => cell(cfg?.failDivideBy2 === false ? "OFF" : "ON", p.i === winnerI))}
              </div>
            </div>

            {teamStats.length ? (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {teamStats.map((team: any) => (
                  <div key={team.id} style={{ padding: 11, borderRadius: 14, background: `${team.color || "#ffd76a"}12`, border: `1px solid ${team.color || "#ffd76a"}55` }}>
                    <div style={{ fontSize: 11, opacity: .72, fontWeight: 900 }}>ÉQUIPE</div>
                    <div style={{ marginTop: 3, fontWeight: 1000 }}>{team.name}</div>
                    <div style={{ marginTop: 6, color: team.color || "#ffd76a", fontSize: 22, fontWeight: 1000 }}>{team.score}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 1000, opacity: .72 }}>DERNIÈRES VOLÉES</div>
              <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
                {visits.slice(-8).reverse().map((visit) => (
                  <div key={visit.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, fontSize: 11.5 }}>
                    <span><b>{visit.playerName}</b> • {contractLabel(visit.contractId as any)} • {visit.darts.map(capitalDartLabel as any).join(" · ")}</span>
                    <b style={{ color: visit.success ? "#72f0a8" : "#ff8aa6" }}>{visit.success ? `+${visit.visitScore}` : `/${cfg?.failDivideBy2 === false ? "—" : "2"}`}</b>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
              Astuce: clique en dehors du panneau pour fermer.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, rounds)}/{rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                Contrat :{" "}
                <span style={{ color: "rgba(255,230,120,0.95)" }}>{isFinished ? "—" : contractLabel(currentContract)}</span>
              </div>
              {!isFinished && (
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{successNow ? "✅ Contrat validé (si tu valides la volée)" : "—"}</div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>{t("generic.player", "JOUEUR")}</div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                {!isFinished ? <ProfileAvatar profile={participants[playerIdx]} size={34} showStars={false} /> : null}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 1000 }}>{isFinished ? "—" : participants[playerIdx]?.nickname || participants[playerIdx]?.name || `Joueur ${playerIdx + 1}`}</div>
                  {!isFinished ? <div style={{ fontSize: 10.5, opacity: .66 }}>#{playerIdx + 1}/{playerCount}</div> : null}
                </div>
              </div>
              {timeLeft > 0 && !isFinished && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, fontWeight: 950 }}>⏱ {timeLeft}s</div>
              )}
            </div>
          </div>
        </div>

        {teamScores.length ? (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            {teamScores.map((team: any) => {
              const active = !isFinished && team.players.includes(String(participants[playerIdx]?.id));
              const winner = isFinished && String(winnerTeam?.id) === String(team.id);
              return <div key={team.id} style={{ padding: 10, borderRadius: 15, background: `${team.color}12`, border: `1px solid ${active || winner ? team.color : `${team.color}55`}` }}>
                <div style={{ fontSize: 10.5, opacity: .72, fontWeight: 900 }}>{winner ? "🏆 " : ""}{team.name}</div>
                <div style={{ marginTop: 4, color: team.color, fontSize: 21, fontWeight: 1000 }}>{team.score}</div>
              </div>;
            })}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            const leader = isFinished ? winningPlayerIds.includes(String(participants[i]?.id)) : false;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active
                    ? "1px solid rgba(120,255,200,0.35)"
                    : leader
                      ? "1px solid rgba(255,230,120,0.45)"
                      : "1px solid rgba(255,255,255,0.10)",
                  background: active
                    ? "rgba(120,255,200,0.10)"
                    : leader
                      ? "rgba(255,230,120,0.10)"
                      : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {participants[i]?.nickname || participants[i]?.name || `${t("generic.player", "Joueur")} ${i + 1}`} {leader ? "🏆" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {isFinished ? (
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>Fin de partie — vainqueur : {winnerTeam?.name || participants[winnerI]?.name || `Joueur ${winnerI + 1}`}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                onClick={() => setEndModalOpen(true)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  fontWeight: 1000,
                }}
              >
                Résumé
              </button>
              <button
                onClick={goBack}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.10)",
                  fontWeight: 1000,
                }}
              >
                Rejouer / config
              </button>
              <button
                disabled={!finishedRecord}
                onClick={() => finishedRecord && (props?.go || props?.setTab)?.("darts_mode_summary", { record: finishedRecord })}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,215,106,.35)", background: "rgba(255,215,106,.10)", fontWeight: 1000, opacity: finishedRecord ? 1 : .5 }}
              >
                Stats détaillées
              </button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>Appuie sur retour pour rejouer / reconfigurer.</div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.throw", "VOLÉE")} ({currentThrow.length}/3) — S/D/T/Bull
            </div>

            <div style={{ marginTop: 10 }}>
              <ScoreInputHub
                currentThrow={currentThrow as any}
                multiplier={multiplier as any}
                onSimple={() => setMultiplier(1)}
                onDouble={() => setMultiplier(2)}
                onTriple={() => setMultiplier(3)}
                onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                onCancel={cancelTurn}
                onNumber={(n) => {
                  const v = Number(n);
                  if (!Number.isFinite(v)) return;
                  pushDart({ v, mult: v === 0 ? 1 : multiplier });
                  setMultiplier(1);
                }}
                onBull={() => {
                  const mult = multiplier === 2 ? 2 : 1;
                  pushDart({ v: 25, mult });
                  setMultiplier(1);
                }}
                onValidate={validateTurn as any}
                onDirectDart={(d: any) => {
                  pushDart({ v: Number(d?.v ?? 0), mult: Number(d?.mult ?? 1) as any });
                  setMultiplier(1);
                }}
                onMiss={() => {
                  pushDart({ v: 0, mult: 1 });
                  setMultiplier(1);
                }}
              />
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Total volée : <b>{scoreThrow(currentThrow)}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {currentContract === "capital" ? "⚑ Le total devient ton score de départ" : successNow ? "✅ Validé → + total" : "❌ Raté → score /2"}
              </div>
            </div>
          </div>
        )}
      </div>

      <EndModal />
    </div>
  );
}
