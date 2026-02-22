import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import { PRO_BOTS, proBotToProfile } from "../lib/botsPro";

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

const LS_BOTS_KEY = "dc_bots_v1";

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
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((b: any) => b?.id)
      .map((b: any) => ({
        id: String(b.id),
        name: String(b?.name || "BOT"),
        avatarDataUrl: b?.avatarDataUrl || b?.avatar || null,
        isBot: true,
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
    if (ids.length) {
      resolved = ids.map((id) => allEntities.get(id) || { id, name: id, isBot: false });
    } else {
      resolved = Array.from({ length: Math.max(1, cfg.players || 2) }, (_, i) => ({
        id: String(i + 1),
        name: `Joueur ${i + 1}`,
      }));
    }
    if (cfg?.startOrderMode === "random" && ids.length) resolved = shuffleCopy(resolved);
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
    if (props?.setTab) return props.setTab("capital_config");
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

    const th: Dart[] = forcedThrow ? [...forcedThrow] : [...currentThrow];
    while (th.length < 3) th.push({ v: 0, mult: 1 });

    const ok = contractSuccess(currentContract, th);
    const visit = scoreThrow(th);

    setScores((prev) => {
      const out = [...prev];
      const prevScore = out[playerIdx] ?? 0;

      let nextScore = prevScore;

      if (currentContract === "capital") {
        nextScore = visit;
      } else {
        if (ok) nextScore = prevScore + visit;
        else nextScore = cfg?.failDivideBy2 === false ? prevScore : Math.floor(prevScore / 2);
      }

      out[playerIdx] = nextScore;

      if (cfg?.victoryMode === "first_to_target" && typeof cfg?.targetScore === "number" && cfg.targetScore > 0 && nextScore >= cfg.targetScore) {
        setWinnerIdx(playerIdx);
        setRoundIdx(rounds);
      }

      return out;
    });

    if (roundIdx === rounds - 1) {
      setLastContractTotals((prev) => {
        const out = [...prev];
        out[playerIdx] = visit;
        return out;
      });
    }

    const nextP = (playerIdx + 1) % playerCount;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;

    setPlayerIdx(nextP);
    setRoundIdx(nextR);

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
      const th = botMakeThrow(currentContract, level, risk);
      setCurrentThrow(th);
      window.setTimeout(() => {
        validateTurn(true, th);
        botActingRef.current = false;
      }, 120);
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

  const EndModal = () => {
    if (!isFinished || !endModalOpen) return null;

    const cols = participants.map((p, i) => ({
      i,
      name: p?.nickname ?? p?.name ?? `Joueur ${i + 1}`,
      isBot: !!p?.isBot,
      score: Number(scores[i] ?? 0),
      last: Number(lastContractTotals[i] ?? 0),
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
                  {participants[winnerI]?.name ?? `Joueur ${winnerI + 1}`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
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

                {rowLabelCell("Dernier contrat (tie-break)")}
                {cols.map((p) => cell(p.last, p.i === winnerI))}

                {rowLabelCell("Contrats joués")}
                {cols.map((p) => cell(rounds, p.i === winnerI))}

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
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>{isFinished ? "—" : `${playerIdx + 1}/${playerCount}`}</div>
              {timeLeft > 0 && !isFinished && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, fontWeight: 950 }}>⏱ {timeLeft}s</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            const leader = isFinished ? i === winnerI : false;
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
                  {t("generic.player", "Joueur")} {i + 1} {leader ? "🏆" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {isFinished ? (
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>Fin de partie — vainqueur : Joueur {winnerI + 1}</div>
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
