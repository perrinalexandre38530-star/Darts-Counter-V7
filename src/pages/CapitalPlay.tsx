// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import targetBg from "../assets/target_bg.png";
import euro1Bg from "../assets/capital_money/euro_1.webp";
import euro2Bg from "../assets/capital_money/euro_2.webp";
import euro3Bg from "../assets/capital_money/euro_3.webp";
import money1Bg from "../assets/capital_money/money_1.webp";
import money2Bg from "../assets/capital_money/money_2.webp";
import money3Bg from "../assets/capital_money/money_3.webp";
import money4Bg from "../assets/capital_money/money_4.webp";
import money5Bg from "../assets/capital_money/money_5.webp";
import money6Bg from "../assets/capital_money/money_6.webp";
import money7Bg from "../assets/capital_money/money_7.webp";
import money8Bg from "../assets/capital_money/money_8.webp";
import money9Bg from "../assets/capital_money/money_9.webp";
import money10Bg from "../assets/capital_money/money_10.webp";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

const CAPITAL_SCORE_BACKGROUNDS = [
  euro1Bg, euro2Bg, euro3Bg,
  money1Bg, money2Bg, money3Bg, money4Bg, money5Bg,
  money6Bg, money7Bg, money8Bg, money9Bg, money10Bg,
];

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


function CapitalLiveStatsModal({ open, onClose, participants, playerStats, visits, selectedIndex, onSelectPlayer }: any) {
  const [tab, setTab] = useState<"resume" | "evolution" | "contrats" | "precision" | "comparatif" | "volees">("resume");
  if (!open) return null;

  const safeIndex = Math.max(0, Math.min(Number(selectedIndex || 0), Math.max(0, participants.length - 1)));
  const profile = participants[safeIndex] || {};
  const stats = playerStats[safeIndex] || {};
  const playerId = String(stats?.id || stats?.playerId || profile?.id || "");
  const rows = (visits || []).filter((visit: any) => String(visit?.playerId || "") === playerId);
  const evolutionData = [
    { label: "Départ", capital: Number(stats?.startingCapital || 0), volee: 0, delta: 0 },
    ...rows.map((visit: any, index: number) => ({
      label: `R${Number(visit?.contractIndex ?? index) + 1}`,
      capital: Number(visit?.scoreAfter || 0),
      volee: Number(visit?.visitScore || 0),
      delta: Number(visit?.delta || 0),
      contrat: contractLabel(visit?.contractId),
    })),
  ];
  const contractData = Object.entries(stats?.contractStats || {}).map(([id, value]: any) => ({
    id,
    contrat: contractLabel(id as CapitalContractID),
    tentatives: Number(value?.attempts || 0),
    reussites: Number(value?.successes || 0),
    echecs: Number(value?.failures || 0),
    taux: Number(value?.successRate || 0),
    points: Number(value?.pointsWon || 0),
    brut: Number(value?.rawPoints || 0),
    perdu: Number(value?.capitalLost || 0),
    best: Number(value?.bestVisit || 0),
    moyenne: Number(value?.averageVisit || 0),
  })).sort((a: any, b: any) => b.tentatives - a.tentatives || b.points - a.points);
  const impactsData = [
    { name: "Simples", value: Number(stats?.singles || 0) },
    { name: "Doubles", value: Number(stats?.doubles || 0) },
    { name: "Triples", value: Number(stats?.triples || 0) },
    { name: "Bull", value: Number(stats?.bulls || 0) },
    { name: "DBull", value: Number(stats?.dbulls || 0) },
    { name: "Miss", value: Number(stats?.misses || 0) },
  ];
  const radarData = [
    { metric: "Contrats", value: Number(stats?.successRate || 0) },
    { metric: "Précision", value: Number(stats?.hitRate || 0) },
    { metric: "Rétention", value: Math.min(100, Number(stats?.capitalRetentionRate || 0)) },
    { metric: "60+", value: Math.min(100, Number(stats?.visits60Plus || 0) * 15) },
    { metric: "Best", value: Math.min(100, (Number(stats?.bestVisit || 0) / 180) * 100) },
    { metric: "Série", value: Math.min(100, Number(stats?.successStreakMax || 0) * 18) },
  ];
  const compareData = (playerStats || []).map((row: any, index: number) => ({
    name: participants[index]?.nickname || participants[index]?.name || row?.name || `J${index + 1}`,
    capital: Number(row?.finalCapital || row?.capital || 0),
    reussite: Number(row?.successRate || 0),
    precision: Number(row?.hitRate || 0),
    avg3: Number(row?.avg3 || 0),
    best: Number(row?.bestVisit || 0),
  }));
  const sectors = Object.entries(stats?.sectorHits || {}).map(([sector, hits]: any) => ({ sector, hits: Number(hits || 0), points: Number(stats?.sectorPoints?.[sector] || 0) })).sort((a: any, b: any) => b.hits - a.hits || b.points - a.points).slice(0, 10);
  const kpis = [
    ["Capital actuel", stats?.finalCapital ?? stats?.capital ?? 0],
    ["Capital départ", stats?.startingCapital ?? 0],
    ["Pic capital", stats?.peakCapital ?? 0],
    ["Plancher", stats?.lowestCapital ?? 0],
    ["Gain net", `${Number(stats?.netCapitalChange || 0) >= 0 ? "+" : ""}${Number(stats?.netCapitalChange || 0)}`],
    ["Rétention", `${stats?.capitalRetentionRate ?? 0}%`],
    ["Points gagnés", stats?.pointsWon ?? 0],
    ["Capital perdu", stats?.capitalLost ?? 0],
    ["Contrats réussis", `${stats?.successfulContracts ?? 0}/${stats?.contractsPlayed ?? 0}`],
    ["Réussite", `${stats?.successRate ?? 0}%`],
    ["Best volée", stats?.bestVisit ?? 0],
    ["Moy. volée", stats?.averageVisit ?? 0],
    ["AVG / 3", stats?.avg3 ?? 0],
    ["Précision", `${stats?.hitRate ?? 0}%`],
    ["Fléchettes", stats?.dartsThrown ?? 0],
    ["Pénalités", stats?.penaltyEvents ?? 0],
    ["Pénalité moy.", stats?.avgPenalty ?? 0],
    ["Série réussie", stats?.successStreakMax ?? 0],
    ["Série échecs", stats?.failStreakMax ?? 0],
    ["Secteur favori", stats?.topSector ? `${stats.topSector} (${stats?.topSectorHits || 0})` : "—"],
  ];
  const tabs = [
    ["resume", "Résumé"], ["evolution", "Évolution"], ["contrats", "Contrats"],
    ["precision", "Précision"], ["comparatif", "Comparatif"], ["volees", "Volées"],
  ];
  const chartTooltip = { background: "rgba(4,8,14,.96)", border: "1px solid rgba(53,216,255,.28)", borderRadius: 10, color: "#fff", fontSize: 11 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(760px, 97vw)", maxHeight: "91dvh", overflow: "hidden", borderRadius: 22, border: "1px solid rgba(53,216,255,.42)", background: "linear-gradient(180deg, rgba(7,17,25,.99), rgba(2,7,12,.99))", boxShadow: "0 24px 90px rgba(0,0,0,.74), 0 0 30px rgba(53,216,255,.10)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px 10px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <ProfileAvatar profile={profile} size={42} showStars={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "#35d8ff", fontSize: 9, fontWeight: 1000, letterSpacing: .9 }}>STATS LIVE — CAPITAL</div>
            <div style={{ marginTop: 2, fontSize: 17, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.nickname || profile?.name || stats?.name || "Joueur"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 18, fontWeight: 1000 }}>×</button>
        </div>

        {participants.length > 1 ? <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 11px 3px" }}>
          {participants.map((participant: any, index: number) => <button key={String(participant?.id || index)} type="button" onClick={() => onSelectPlayer(index)} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, minHeight: 32, padding: "4px 8px", borderRadius: 999, border: index === safeIndex ? "1px solid rgba(53,216,255,.60)" : "1px solid rgba(255,255,255,.10)", background: index === safeIndex ? "rgba(53,216,255,.12)" : "rgba(255,255,255,.035)", color: index === safeIndex ? "#35d8ff" : "#fff", fontSize: 10, fontWeight: 950 }}><ProfileAvatar profile={participant} size={22} showStars={false} />{participant?.nickname || participant?.name || `Joueur ${index + 1}`}</button>)}
        </div> : null}

        <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 11px" }}>
          {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id as any)} style={{ flex: "0 0 auto", minHeight: 32, padding: "6px 10px", borderRadius: 999, border: tab === id ? "1px solid rgba(255,207,87,.62)" : "1px solid rgba(255,255,255,.10)", background: tab === id ? "rgba(255,207,87,.13)" : "rgba(255,255,255,.03)", color: tab === id ? "#ffcf57" : "rgba(255,255,255,.72)", fontSize: 9.5, fontWeight: 1000 }}>{label}</button>)}
        </div>

        <div className="dc-scroll-thin" style={{ maxHeight: "calc(91dvh - 138px)", overflowY: "auto", padding: "2px 11px 14px" }}>
          {tab === "resume" ? <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 6 }}>
              {kpis.map(([label, value]) => <div key={String(label)} style={{ padding: "9px 8px", borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ color: "rgba(255,255,255,.48)", fontSize: 8, fontWeight: 950, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 3, color: label === "Capital actuel" || label === "Réussite" ? "#ffcf57" : "#fff", fontSize: 17, fontWeight: 1000 }}>{value}</div></div>)}
            </div>
            <div style={{ marginTop: 9, height: 220, padding: "8px 4px 2px", borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)" }}>
              <div style={{ padding: "0 8px 5px", fontSize: 9.5, fontWeight: 1000, color: "#35d8ff" }}>COURBE DU CAPITAL</div>
              <ResponsiveContainer width="100%" height="90%"><LineChart data={evolutionData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }} /><YAxis tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }} width={36} /><Tooltip contentStyle={chartTooltip as any} /><Line type="monotone" dataKey="capital" stroke="#ffcf57" strokeWidth={2.5} dot={{ r: 2 }} /></LineChart></ResponsiveContainer>
            </div>
          </> : null}

          {tab === "evolution" ? <div style={{ display: "grid", gap: 9 }}>
            <div style={{ height: 230, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#ffcf57", marginBottom: 5 }}>CAPITAL APRÈS CHAQUE CONTRAT</div><ResponsiveContainer width="100%" height="90%"><AreaChart data={evolutionData}><defs><linearGradient id="capitalArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffcf57" stopOpacity={.38}/><stop offset="95%" stopColor="#ffcf57" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><YAxis width={36} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Area type="monotone" dataKey="capital" stroke="#ffcf57" fill="url(#capitalArea)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
            <div style={{ height: 210, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#35d8ff", marginBottom: 5 }}>VARIATION PAR CONTRAT</div><ResponsiveContainer width="100%" height="90%"><BarChart data={evolutionData.slice(1)}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><YAxis width={36} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Bar dataKey="delta" fill="#35d8ff" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
          </div> : null}

          {tab === "contrats" ? <>
            <div style={{ height: 220, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#ffcf57", marginBottom: 5 }}>RÉUSSITE PAR CONTRAT</div><ResponsiveContainer width="100%" height="90%"><BarChart data={contractData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="contrat" tick={{ fill: "rgba(255,255,255,.5)", fontSize: 7 }}/><YAxis domain={[0,100]} width={32} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Bar dataKey="taux" fill="#ffcf57" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
            <div style={{ marginTop: 8, display: "grid", gap: 5 }}>{contractData.length ? contractData.map((row: any) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "minmax(78px,1.4fr) repeat(5,minmax(44px,.7fr))", gap: 4, alignItems: "center", padding: "7px 6px", borderRadius: 10, background: "rgba(255,255,255,.03)", fontSize: 9 }}><b style={{ color: "#35d8ff", overflow: "hidden", textOverflow: "ellipsis" }}>{row.contrat}</b><span>{row.taux}%</span><span>+{row.points}</span><span>-{row.perdu}</span><span>Best {row.best}</span><span>Moy {row.moyenne}</span></div>) : <div style={{ opacity: .55, padding: 12 }}>Aucun contrat joué pour l’instant.</div>}</div>
          </> : null}

          {tab === "precision" ? <div style={{ display: "grid", gap: 9 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 9 }}>
              <div style={{ height: 230, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#35d8ff", marginBottom: 5 }}>PROFIL DE PERFORMANCE</div><ResponsiveContainer width="100%" height="90%"><RadarChart data={radarData}><PolarGrid stroke="rgba(255,255,255,.12)"/><PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,.65)", fontSize: 8 }}/><Radar dataKey="value" stroke="#35d8ff" fill="#35d8ff" fillOpacity={.22}/><Tooltip contentStyle={chartTooltip as any}/></RadarChart></ResponsiveContainer></div>
              <div style={{ height: 230, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#ffcf57", marginBottom: 5 }}>IMPACTS</div><ResponsiveContainer width="100%" height="90%"><BarChart data={impactsData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,.5)", fontSize: 7 }}/><YAxis width={28} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Bar dataKey="value" fill="#ffcf57" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
            </div>
            <div style={{ padding: 10, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#35d8ff" }}>SECTEURS LES PLUS TOUCHÉS</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{sectors.length ? sectors.map((row: any) => <span key={row.sector} style={{ padding: "6px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,.09)", background: "rgba(0,0,0,.20)", fontSize: 9 }}><b style={{ color: "#ffcf57" }}>{row.sector}</b> · {row.hits} hits · {row.points} pts</span>) : <span style={{ opacity: .5 }}>Aucun impact enregistré.</span>}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>{[["60+",stats?.visits60Plus],["100+",stats?.visits100Plus],["140+",stats?.visits140Plus],["180",stats?.visits180]].map(([label,value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 12, background: "rgba(255,255,255,.035)", textAlign: "center" }}><div style={{ fontSize: 8, opacity: .5 }}>{label}</div><b style={{ color: "#ffcf57", fontSize: 17 }}>{value ?? 0}</b></div>)}</div>
          </div> : null}

          {tab === "comparatif" ? <div style={{ display: "grid", gap: 9 }}>
            <div style={{ height: 240, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#ffcf57", marginBottom: 5 }}>CAPITAL / BEST</div><ResponsiveContainer width="100%" height="90%"><BarChart data={compareData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,.6)", fontSize: 8 }}/><YAxis width={36} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Bar dataKey="capital" fill="#ffcf57" radius={[4,4,0,0]}/><Bar dataKey="best" fill="#35d8ff" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
            <div style={{ height: 220, borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", padding: 8 }}><div style={{ fontSize: 9.5, fontWeight: 1000, color: "#35d8ff", marginBottom: 5 }}>RÉUSSITE / PRÉCISION</div><ResponsiveContainer width="100%" height="90%"><BarChart data={compareData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,.6)", fontSize: 8 }}/><YAxis domain={[0,100]} width={32} tick={{ fill: "rgba(255,255,255,.5)", fontSize: 8 }}/><Tooltip contentStyle={chartTooltip as any}/><Bar dataKey="reussite" fill="#ffcf57" radius={[4,4,0,0]}/><Bar dataKey="precision" fill="#35d8ff" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
          </div> : null}

          {tab === "volees" ? <div style={{ display: "grid", gap: 6 }}>{rows.length ? [...rows].reverse().map((visit: any) => <div key={visit.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, padding: "8px 9px", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><div style={{ minWidth: 0 }}><div style={{ color: "#35d8ff", fontSize: 9, fontWeight: 1000 }}>{contractLabel(visit.contractId)} · R{Number(visit.contractIndex || 0) + 1}</div><div style={{ marginTop: 3, fontSize: 11, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(visit.darts || []).map((dart: any) => capitalDartLabel(dart)).join(" · ")}</div><div style={{ marginTop: 2, fontSize: 8.5, opacity: .5 }}>{visit.scoreBefore} → {visit.scoreAfter}</div></div><div style={{ textAlign: "right" }}><b style={{ color: visit.success ? "#71e7a6" : "#ff7b8d", fontSize: 15 }}>{visit.success ? `+${visit.visitScore}` : `-${visit.penaltyLost || 0}`}</b><div style={{ fontSize: 8, opacity: .55 }}>{visit.success ? "RÉUSSI" : "ÉCHEC"}</div></div></div>) : <div style={{ opacity: .55, padding: 14 }}>Aucune volée enregistrée.</div>}</div> : null}
        </div>
      </div>
    </div>
  );
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

  const scoreCardBackgrounds = useMemo(() => {
    // Toutes les images Euro/Money fournies font partie du pool.
    // On mélange une seule fois pour cette composition de participants afin
    // que le visuel reste stable pendant la partie mais change d'une partie à l'autre.
    const pool = [...CAPITAL_SCORE_BACKGROUNDS];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return participants.map((_: any, index: number) => pool[index % pool.length]);
  }, [participants]);

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
  const [liveStatsOpen, setLiveStatsOpen] = useState<boolean>(false);
  const [liveStatsPlayerIdx, setLiveStatsPlayerIdx] = useState<number>(0);

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
  const activeProfile = participants[playerIdx] || null;
  const activeStats = rawPlayerStats[playerIdx] || {};
  const activeName = activeProfile?.nickname || activeProfile?.name || `${t("generic.player", "Joueur")} ${playerIdx + 1}`;
  const activeTeam = normalizedTeams.find((team: any) => (team.players || []).includes(String(activeProfile?.id || ""))) || null;
  const rankedScoreRows = useMemo(() => scores.map((score, index) => ({
    index,
    score: Number(score || 0),
    name: participants[index]?.nickname || participants[index]?.name || `${t("generic.player", "Joueur")} ${index + 1}`,
    profile: participants[index],
  })).sort((a, b) => b.score - a.score || a.index - b.index), [scores, participants, t]);
  const scoreRankByIndex = useMemo(() => {
    const map = new Map<number, number>();
    rankedScoreRows.forEach((row, position) => map.set(row.index, position + 1));
    return map;
  }, [rankedScoreRows]);

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

      <div style={{ padding: "10px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <section
          style={{
            marginBottom: 8,
            padding: 0,
            overflow: "hidden",
            borderRadius: 20,
            border: "1px solid rgba(47,216,255,.55)",
            background: "linear-gradient(180deg, rgba(7,17,24,.94), rgba(3,8,12,.96))",
            boxShadow: "0 0 24px rgba(47,216,255,.10), 0 18px 40px rgba(0,0,0,.38)",
          }}
        >
          <div
            style={{
              position: "relative",
              minHeight: 126,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(128px,140px)",
              gap: 4,
              alignItems: "stretch",
              padding: "8px 10px",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.40), rgba(0,0,0,.18) 38%, rgba(0,0,0,.08) 64%, rgba(0,0,0,.34))" }} />
            {!isFinished && activeProfile ? (
              <div style={{ position: "absolute", left: -20, top: -4, bottom: -4, width: "25%", minWidth: 84, overflow: "hidden", opacity: .14, pointerEvents: "none" }}>
                <div style={{ position: "absolute", left: -16, top: 16, transform: "scale(1.22)", transformOrigin: "left top", filter: "saturate(.88)" }}>
                  <ProfileAvatar profile={activeProfile} size={82} showStars={false} />
                </div>
              </div>
            ) : null}
            {activeTeam?.logoDataUrl ? (
              <div style={{ position: "absolute", right: "calc(128px + 12px)", top: -4, bottom: -4, width: "22%", minWidth: 76, overflow: "hidden", opacity: .13, pointerEvents: "none" }}>
                <img src={activeTeam.logoDataUrl} alt="" style={{ position: "absolute", right: -10, top: 20, width: 74, height: 74, borderRadius: "50%", objectFit: "cover" }} />
              </div>
            ) : null}

            <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, textAlign: "center", padding: "2px 8px 2px 6px" }}>
              <div style={{ color: activeTeam?.color || "#35d8ff", fontSize: 14, fontWeight: 1000, letterSpacing: .7, lineHeight: 1.05, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isFinished ? "—" : activeName}
              </div>
              <div style={{ marginTop: 5, color: "#ffcf57", fontSize: 60, fontWeight: 900, lineHeight: 1, textShadow: "0 4px 18px rgba(255,195,26,.24)" }}>
                {isFinished ? "—" : scores[playerIdx] ?? 0}
              </div>
              <div style={{ marginTop: 4, color: "rgba(255,255,255,.56)", fontSize: 8.5, fontWeight: 900, letterSpacing: .55 }}>
                CAPITAL • #{Math.max(1, scoreRankByIndex.get(playerIdx) || playerIdx + 1)}/{playerCount}
              </div>
              {activeTeam ? <div style={{ marginTop: 3, color: activeTeam.color || "#ffcf57", fontSize: 8.5, fontWeight: 950, textTransform: "uppercase" }}>{activeTeam.name}</div> : null}
            </div>

            <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 18, background: "#050913", isolation: "isolate" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 18, backgroundImage: `linear-gradient(180deg, rgba(4,8,16,.34), rgba(4,8,16,.62)), url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: 1 }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 42, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, background: "linear-gradient(90deg, rgba(4,8,16,.98) 0%, rgba(4,8,16,.82) 42%, rgba(4,8,16,.28) 76%, rgba(4,8,16,0) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 1, background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,207,87,.66), rgba(255,255,255,.02))", boxShadow: "0 0 12px rgba(255,207,87,.22)", pointerEvents: "none" }} />
              <div style={{ position: "relative", width: "100%", padding: "7px 5px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,.56)", fontSize: 8.5, fontWeight: 950, letterSpacing: .8 }}>CONTRAT</div>
                <div style={{ marginTop: 4, color: "#ffcf57", fontSize: 22, lineHeight: 1.02, fontWeight: 1100, textShadow: "0 0 16px rgba(255,207,87,.42)", maxWidth: "100%", wordBreak: "break-word" }}>
                  {isFinished ? "—" : contractLabel(currentContract)}
                </div>
                <div style={{ marginTop: 7, color: "#35d8ff", fontSize: 9, fontWeight: 950 }}>
                  ROUND {Math.min(roundIdx + 1, rounds)}/{rounds}
                </div>
                {timeLeft > 0 && !isFinished ? <div style={{ marginTop: 4, color: "#fff", fontSize: 9, fontWeight: 950 }}>⏱ {timeLeft}s</div> : null}
              </div>
            </div>
          </div>
        </section>

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

        {scores.length > 2 ? (
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr)",
              alignItems: "center",
              gap: 8,
              padding: "7px 9px",
              borderRadius: 15,
              border: "1px solid rgba(255,207,87,.20)",
              background: "rgba(255,255,255,.035)",
            }}
          >
            <div style={{ color: "#ffcf57", fontSize: 9, fontWeight: 1000, letterSpacing: .7 }}>🏆 CLASSEMENT</div>
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", minWidth: 0, paddingBottom: 1 }}>
              {rankedScoreRows.map((row, rank) => (
                <div
                  key={`rank-${row.index}`}
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 7px",
                    borderRadius: 999,
                    border: row.index === playerIdx ? "1px solid rgba(53,216,255,.52)" : "1px solid rgba(255,255,255,.09)",
                    background: row.index === playerIdx ? "rgba(53,216,255,.10)" : "rgba(0,0,0,.18)",
                  }}
                >
                  <span style={{ color: rank === 0 ? "#ffcf57" : "rgba(255,255,255,.62)", fontSize: 9, fontWeight: 1000 }}>{rank + 1}</span>
                  <ProfileAvatar profile={row.profile} size={20} showStars={false} />
                  <span style={{ maxWidth: 74, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: row.index === playerIdx ? "#35d8ff" : "#fff", fontSize: 9.5, fontWeight: 950 }}>{row.name}</span>
                  <b style={{ color: "#ffcf57", fontSize: 10 }}>{row.score}</b>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={scores.length > 2 ? "dc-scroll-thin" : undefined}
          style={scores.length > 2
            ? { marginTop: 8, display: "flex", gap: 9, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 3 }
            : { marginTop: 8, display: "grid", gridTemplateColumns: scores.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}
        >
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            const leader = isFinished ? winningPlayerIds.includes(String(participants[i]?.id)) : false;
            const rank = scoreRankByIndex.get(i) || i + 1;
            const scoreDecoration = scoreCardBackgrounds[i] || CAPITAL_SCORE_BACKGROUNDS[i % CAPITAL_SCORE_BACKGROUNDS.length];
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  flex: scores.length > 2 ? "0 0 min(43vw, 190px)" : undefined,
                  minWidth: scores.length > 2 ? 148 : 0,
                  minHeight: 94,
                  scrollSnapAlign: scores.length > 2 ? "start" : undefined,
                  borderRadius: 16,
                  padding: "10px 11px",
                  border: active
                    ? "1px solid rgba(53,216,255,.52)"
                    : leader
                      ? "1px solid rgba(255,207,87,.52)"
                      : "1px solid rgba(255,255,255,0.10)",
                  background: active
                    ? "linear-gradient(145deg, rgba(0,112,140,.22), rgba(0,30,42,.24))"
                    : leader
                      ? "rgba(255,207,87,.08)"
                      : "rgba(255,255,255,0.035)",
                  boxShadow: active ? "0 0 18px rgba(53,216,255,.08)" : "none",
                }}
              >
                <img
                  src={scoreDecoration}
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: -14,
                    bottom: -18,
                    width: "72%",
                    height: "116%",
                    objectFit: "contain",
                    objectPosition: "right bottom",
                    opacity: active ? .16 : .105,
                    filter: active ? "saturate(.92) contrast(1.05)" : "grayscale(.25) saturate(.68)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <div style={{ minWidth: 0, fontSize: 11.5, opacity: .94, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {participants[i]?.nickname || participants[i]?.name || `${t("generic.player", "Joueur")} ${i + 1}`}{leader ? " 🏆" : ""}
                  </div>
                  <span style={{ flex: "0 0 auto", color: active ? "#35d8ff" : "rgba(255,255,255,.48)", fontSize: 9, fontWeight: 1000 }}>#{rank}</span>
                </div>
                <div style={{ position: "relative", zIndex: 1, marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ color: active ? "#fff" : "rgba(255,255,255,.90)", fontSize: 28, lineHeight: 1, fontWeight: 1000, textShadow: "0 2px 10px rgba(0,0,0,.55)" }}>{s}</div>
                  <div style={{ transform: "scale(1.02)", filter: "drop-shadow(0 3px 9px rgba(0,0,0,.55))" }}>
                    <ProfileAvatar profile={participants[i]} size={46} showStars={false} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isFinished ? (
          <button
            type="button"
            onClick={() => { setLiveStatsPlayerIdx(playerIdx); setLiveStatsOpen(true); }}
            title="Ouvrir les statistiques détaillées"
            style={{
              width: "100%",
              marginTop: 8,
              padding: 0,
              color: "inherit",
              display: "grid",
              gridTemplateColumns: "repeat(5,minmax(0,1fr))",
              borderRadius: 16,
              border: "1px solid rgba(53,216,255,.18)",
              background: "rgba(255,255,255,.028)",
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 0 0 rgba(53,216,255,0)",
            }}
          >
            {[
              ["DÉPART", activeStats?.startingCapital ?? 0, "#ffcf57"],
              ["ACTUEL", scores[playerIdx] ?? 0, "#35d8ff"],
              ["BEST", activeStats?.bestVisit ?? 0, "#ffcf57"],
              ["RÉUSSITE", `${activeStats?.successRate ?? 0}%`, "#71e7a6"],
              ["PÉNAL.", activeStats?.penaltyEvents ?? 0, "#ff7b8d"],
            ].map(([label, value, color], index) => (
              <div key={String(label)} style={{ minWidth: 0, padding: "7px 3px 8px", textAlign: "center", borderLeft: index ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                <div style={{ color: "rgba(255,255,255,.46)", fontSize: 7.2, lineHeight: 1, fontWeight: 950, letterSpacing: .35, whiteSpace: "nowrap" }}>{label}</div>
                <div style={{ marginTop: 4, color: String(color), fontSize: 13.5, lineHeight: 1, fontWeight: 1000 }}>{value}</div>
              </div>
            ))}
          </button>
        ) : null}

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
          <div style={{ marginTop: 8 }}>
            <div>
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

          </div>
        )}
      </div>

      <CapitalLiveStatsModal
        open={liveStatsOpen}
        onClose={() => setLiveStatsOpen(false)}
        participants={participants}
        playerStats={rawPlayerStats}
        visits={visits}
        selectedIndex={liveStatsPlayerIdx}
        onSelectPlayer={setLiveStatsPlayerIdx}
      />
      <EndModal />
    </div>
  );
}
