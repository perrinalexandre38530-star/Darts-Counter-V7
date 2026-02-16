// =============================================================
// src/pages/X01PlayV3.tsx
// X01 V3 — moteur neuf + UI du "beau" X01Play
// + Tour automatique des BOTS (isBot / botLevel)
// + Sauvegarde Historique à la fin du match
// + Autosave localStorage (reprise après coupure)
// =============================================================

import React, { useEffect } from "react";
import { useViewport } from "../hooks/useViewport";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";

import { getTeamAvatarUrl } from "../assets/teamAvatars";
import type {
  X01ConfigV3,
  X01PlayerId,
  X01DartInputV3,
} from "../types/x01v3";
import { useX01EngineV3 } from "../hooks/useX01EngineV3";
import type { Dart as UIDart } from "../lib/types";

import ScoreInputHub from "../components/ScoreInputHub";
import BackDot from "../components/BackDot";
// Caméra assistée (dartsmind-like UX)
import CameraAssistedOverlay from "../components/CameraAssistedOverlay";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../lib/x01v3/x01LegOverlayV3";
import { extAdaptCheckoutSuggestion, type X01OutModeV3 } from "../lib/x01v3/x01CheckoutV3";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";
import { useVoiceScoreInput } from "../hooks/useVoiceScoreInput";

import EndOfLegOverlay from "../components/EndOfLegOverlay";
import type { LegStats } from "../lib/stats";
import { buildLegStatsFromV3LiveForOverlay } from "../lib/x01v3/x01V3LegStatsAdapter";

// ✅ Layout unifié (MEP)
import GameplayLayout from "../components/gameplay/GameplayLayout";
import tickerX01 from "../assets/tickers/ticker_x01.png";

import { StatsBridge } from "../lib/statsBridge";
import { loadBots } from "./ProfilesBots";




function useMediaQueryLocal(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(!!mql.matches);
    onChange();
    try {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      // Safari legacy
      // @ts-ignore
      mql.addListener(onChange);
      // @ts-ignore
      return () => mql.removeListener(onChange);
    }
  }, [query]);
  return matches;
}

type HeaderBlockProps = {
  showThrowCounter?: boolean;
  currentPlayer: any;
  currentAvatar: string | null;
  currentRemaining: number;
  currentThrow: UIDart[];
  doubleOut: boolean;
  liveRanking: { id: string; name: string; score: number }[];
  curDarts: number;
  curM3D: string;
  bestVisit: number;
  useSets: boolean;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  checkoutText: string | null;
};


import {
  x01SfxV3Preload,
  x01PlaySfxV3,
  x01SfxV3Configure,      // ✅ AJOUT
  x01EnsureAudioUnlocked, // ✅ AJOUT
  isBull,
  isDBull,
  isDouble,
  isTriple,
  announceVisit,
  announceEndGame,
} from "../lib/x01SfxV3";

// ---------------- Constantes visuelles / autosave ----------------

const NAV_HEIGHT = 64;
const CONTENT_MAX = 520;
const AUTOSAVE_KEY = "x01v3:autosave";

const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background:
    "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};

const miniText: React.CSSProperties = {
  fontSize: 12,
  color: "#d9dbe3",
  lineHeight: 1.25,
};

const miniRankRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
};

const miniRankName: React.CSSProperties = {
  fontWeight: 700,
  color: "#ffcf57",
};

const miniRankScore: React.CSSProperties = {
  fontWeight: 800,
  color: "#ffcf57",
};

const miniRankScoreFini: React.CSSProperties = {
  fontWeight: 800,
  color: "#7fe2a9",
};

// ---------------- Types & helpers locaux ----------------

type Props = {
  config: X01ConfigV3;
  onExit?: () => void; // QUITTER -> Home (via App)
  onShowSummary?: (matchId: string) => void; // RÉSUMÉ -> Historique détaillé
  onReplayNewConfig?: () => void; // REJOUER -> changer paramètres (App)
  resume?: {
    resumeId: string;
    darts: X01DartInputV3[];
  };
};

type MiniRankingRow = {
  id: X01PlayerId;
  name: string;
  score: number;
  legsWon: number;
  setsWon: number;
  avg3: number;
};

type X01V3AutosaveSnapshot = {
  id: string;
  createdAt: number;
  config: X01ConfigV3;
  darts: X01DartInputV3[];
};

function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}

function chipStyle(d?: UIDart, red = false): React.CSSProperties {
  if (!d)
    return {
      background: "rgba(255,255,255,.06)",
      color: "#bbb",
      border: "1px solid rgba(255,255,255,.08)",
    };

  if (red)
    return {
      background: "rgba(200,30,30,.18)",
      color: "#ff8a8a",
      border: "1px solid rgba(255,80,80,.35)",
    };

  if (d.v === 25 && d.mult === 2)
    return {
      background: "rgba(13,160,98,.18)",
      color: "#8ee6bf",
      border: "1px solid rgba(13,160,98,.35)",
    };

  if (d.v === 25)
    return {
      background: "rgba(13,160,98,.12)",
      color: "#7bd6b0",
      border: "1px solid rgba(13,160,98,.3)",
    };

  if (d.mult === 3)
    return {
      background: "rgba(179,68,151,.18)",
      color: "#ffd0ff",
      border: "1px solid rgba(179,68,151,.35)",
    };

  if (d.mult === 2)
    return {
      background: "rgba(46,150,193,.18)",
      color: "#cfeaff",
      border: "1px solid rgba(46,150,193,.35)",
    };

  return {
    background: "rgba(255,187,51,.12)",
    color: "#ffc63a",
    border: "1px solid rgba(255,187,51,.4)",
  };
}

function dartValue(d: UIDart) {
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}

// Somme des points d'une volée (pour preview checkout)
function sumThrow(throwDarts: UIDart[] | undefined | null): number {
  if (!throwDarts || !Array.isArray(throwDarts)) return 0;
  return throwDarts.reduce((s, d) => s + dartValue(d), 0);
}


// Checkout suggestion à partir de la structure V3
function formatCheckoutFromVisit(suggestion: any): string {
  if (!suggestion?.darts || !Array.isArray(suggestion.darts)) return "";
  return suggestion.darts
    .map((d: any) => {
      const seg = d.segment === 25 ? "BULL" : String(d.segment);
      if (d.multiplier === 1) return seg;
      if (d.multiplier === 2) return `D${seg}`;
      if (d.multiplier === 3) return `T${seg}`;
      return seg;
    })
    .join(" • ");
}

// Pastilles pour la dernière volée d’un joueur
function renderLastVisitChips(
  pid: string,
  lastVisits: Record<string, UIDart[]>,
  isBust?: boolean
) {
  const darts = lastVisits[pid] ?? [];
  if (!darts.length) return null;

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {darts.map((d, i) => {
        const st = chipStyle(d, false);

        const bg = isBust ? "rgba(200,30,30,.18)" : (st.background as string);
        const bd = isBust ? "1px solid rgba(255,80,80,.35)" : (st.border as string);
        const co = isBust ? "#ff8a8a" : (st.color as string);

        return (
          <span
            key={i}
            style={{
              minWidth: 36,
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              background: bg,
              border: bd,
              color: co,
            }}
          >
            {fmt(d)}
          </span>
        );
      })}
    </span>
  );
}


/* ---------------------------------------------------
   Petit "cerveau" BOT local (placeholder)
   - plus tard tu pourras le déplacer dans ../lib/botBrain.ts
--------------------------------------------------- */

type BotLevel = "easy" | "medium" | "hard" | "pro" | "legend" | undefined;

// =============================================================
// ✅ External scoring (Scolia-ready) — AJOUT UNIQUEMENT
// - Source de comptage: "manual" (Keypad) | "external" (événements)
// - IMPORTANT: on ne touche pas au moteur. On injecte juste des X01DartInputV3.
// - Événement public (bridge):
//   window.dispatchEvent(new CustomEvent("dc:x01v3:dart", { detail: { segment: 20, multiplier: 3 } }))
//   window.dispatchEvent(new CustomEvent("dc:x01v3:visit", { detail: { darts: [{segment:20,multiplier:3},{segment:20,multiplier:3},{segment:20,multiplier:3}] } }))
// =============================================================
type ScoringSource = "manual" | "external";

const EXTERNAL_DART_EVENT = "dc:x01v3:dart";
const EXTERNAL_VISIT_EVENT = "dc:x01v3:visit";

function normalizeExternalDart(input: any): X01DartInputV3 | null {
  if (!input || typeof input !== "object") return null;
  const seg = Number((input as any).segment);
  const mult = Number((input as any).multiplier);
  if (!Number.isFinite(seg) || !Number.isFinite(mult)) return null;

  // segment: 0 (MISS), 25 (bull), ou 1..20
  const sOK = seg === 0 || seg === 25 || (seg >= 1 && seg <= 20);
  if (!sOK) return null;

  // multiplier: 1..3
  const mOK = mult === 1 || mult === 2 || mult === 3;
  if (!mOK) return null;

  return { segment: seg, multiplier: mult as 1 | 2 | 3 };
}

function normalizeExternalVisit(input: any): X01DartInputV3[] {
  const darts = (input as any)?.darts;
  if (!Array.isArray(darts)) return [];
  const out: X01DartInputV3[] = [];
  for (const d of darts) {
    const nd = normalizeExternalDart(d);
    if (nd) out.push(nd);
    if (out.length >= 3) break;
  }
  return out;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type BotStyle = "balanced" | "aggressive" | "safe" | "clutch";

function computeBotVisit(
  level: BotLevel,
  currentScore: number,
  outMode: "double" | "simple" | "master"
): UIDart[] {
  const doubleOut = outMode === "double";
  const singleOut = outMode === "simple";
  const masterOut = outMode === "master";

  const darts: UIDart[] = [];

  type EffLevel = "easy" | "medium" | "hard" | "pro" | "legend";

  type BotSkillProfile = {
    // scoring (T20, T19, etc.)
    scoringExact: number;
    scoringRing: number;
    scoringNeighbor: number;
    scoringBigMiss: number;

    // doubles / checkouts
    doubleExact: number;
    doubleRing: number;
    doubleNeighbor: number;
    doubleBigMiss: number;
  };

  const SKILL: Record<EffLevel, BotSkillProfile> = {
    easy: {
      scoringExact: 0.35,
      scoringRing: 0.20,
      scoringNeighbor: 0.20,
      scoringBigMiss: 0.25,
      doubleExact: 0.25,
      doubleRing: 0.25,
      doubleNeighbor: 0.20,
      doubleBigMiss: 0.30,
    },
    medium: {
      scoringExact: 0.45,
      scoringRing: 0.25,
      scoringNeighbor: 0.18,
      scoringBigMiss: 0.12,
      doubleExact: 0.40,
      doubleRing: 0.25,
      doubleNeighbor: 0.20,
      doubleBigMiss: 0.15,
    },
    hard: {
      scoringExact: 0.55,
      scoringRing: 0.25,
      scoringNeighbor: 0.15,
      scoringBigMiss: 0.05,
      doubleExact: 0.60,
      doubleRing: 0.20,
      doubleNeighbor: 0.15,
      doubleBigMiss: 0.05,
    },
    pro: {
      // 🔥 PRO : très peu de gros MISS, bons sur les doubles
      scoringExact: 0.70,
      scoringRing: 0.20,
      scoringNeighbor: 0.08,
      scoringBigMiss: 0.02,
      doubleExact: 0.80, // ~ 4 doubles sur 5
      doubleRing: 0.12,
      doubleNeighbor: 0.06,
      doubleBigMiss: 0.02,
    },
    legend: {
      // 🔥 LÉGENDE : quasi jamais loin de la cible
      scoringExact: 0.80,
      scoringRing: 0.15,
      scoringNeighbor: 0.04,
      scoringBigMiss: 0.01,
      doubleExact: 0.90, // ~ 9 doubles sur 10
      doubleRing: 0.06,
      doubleNeighbor: 0.03,
      doubleBigMiss: 0.01,
    },
  };

  let effLevel: EffLevel = "easy";
  if (level === "medium") effLevel = "medium";
  else if (level === "hard") effLevel = "hard";
  else if (level === "pro") effLevel = "pro";
  else if (level === "legend") effLevel = "legend";

  const skill = SKILL[effLevel];

  // -----------------------------
  // 2) NEIGHBORS RÉELS DE LA CIBLE (ordre de la board)
  // -----------------------------
  const BOARD_ORDER = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
    3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  const NEIGHBORS: Record<number, [number, number]> = {
    20: [5, 1],
    1: [20, 18],
    18: [1, 4],
    4: [18, 13],
    13: [4, 6],
    6: [13, 10],
    10: [6, 15],
    15: [10, 2],
    2: [15, 17],
    17: [2, 3],
    3: [17, 19],
    19: [3, 7],
    7: [19, 16],
    16: [7, 8],
    8: [16, 11],
    11: [8, 14],
    14: [11, 9],
    9: [14, 12],
    12: [9, 5],
    5: [12, 20],
  };

  const allSingles = BOARD_ORDER.slice();

  function dartScore(d: UIDart): number {
    if (d.v === 25 && d.mult === 2) return 50;
    return d.v * d.mult;
  }

  // -----------------------------
  // 3) CHOIX D’UN "PLAN" / CIBLE LOGIQUE
  // -----------------------------
  function chooseIdealTarget(remaining: number, dartsLeft: number): UIDart {
    // SINGLE-OUT / MASTER-OUT : on peut finir sans forcément un double
    if (!doubleOut) {
      // SINGLE-OUT : n'importe quel segment peut finir
      if (singleOut) {
        if (remaining === 50) return { v: 25, mult: 2 }; // DBULL
        if (remaining <= 60 && remaining % 3 === 0 && remaining / 3 <= 20) return { v: remaining / 3, mult: 3 };
        if (remaining <= 40 && remaining % 2 === 0) return { v: remaining / 2, mult: 2 };
        if (remaining <= 20) return { v: remaining, mult: 1 };
        // sinon scoring
        return { v: 20, mult: 3 };
      }

      // MASTER-OUT : finir sur double OU triple (ou DBULL)
      if (masterOut) {
        if (remaining === 50) return { v: 25, mult: 2 }; // DBULL
        if (remaining <= 60 && remaining % 3 === 0 && remaining / 3 <= 20) return { v: remaining / 3, mult: 3 };
        if (remaining <= 40 && remaining % 2 === 0) return { v: remaining / 2, mult: 2 };
        // préparation : viser gros scoring
        if (remaining > 100) return { v: 20, mult: 3 };
        if (remaining > 60) return { v: 20, mult: 3 };
        if (remaining > 40) return { v: 20, mult: 2 };
        if (remaining > 20) return { v: 20, mult: 1 };
        return { v: remaining, mult: 1 };
      }

      // fallback (ne devrait pas arriver)
      return { v: 20, mult: 3 };
    }

    // DOUBLE-OUT : vraie stratégie
    // 1) Finish direct si <= 50
    if (remaining === 50) {
      // DBULL
      return { v: 25, mult: 2 };
    }
    if (remaining <= 40 && remaining >= 2 && remaining % 2 === 0) {
      // D20, D16, D8, etc.
      return { v: remaining / 2, mult: 2 };
    }

    // 2) Zone 51–110 : on essaie de préparer un finish propre (40, 32, etc.)
    if (remaining > 50 && remaining <= 110 && dartsLeft >= 2) {
      const candidateScores = [60, 57, 54, 51, 50, 48, 45, 40, 36, 32];
      const SCORE_TO_TARGET: Record<number, UIDart> = {
        60: { v: 20, mult: 3 }, // T20
        57: { v: 19, mult: 3 }, // T19
        54: { v: 18, mult: 3 }, // T18
        51: { v: 17, mult: 3 }, // T17
        50: { v: 25, mult: 2 }, // DBULL
        48: { v: 16, mult: 3 }, // T16
        45: { v: 15, mult: 3 }, // T15
        40: { v: 20, mult: 2 }, // D20
        36: { v: 18, mult: 2 }, // D18
        32: { v: 16, mult: 2 }, // D16
      };

      for (const score of candidateScores) {
        if (score >= remaining) continue;
        const newRemaining = remaining - score;

        if (
          (newRemaining === 50) ||
          (newRemaining <= 40 &&
            newRemaining >= 2 &&
            newRemaining % 2 === 0)
        ) {
          return SCORE_TO_TARGET[score];
        }
      }
    }

    // 3) Loin du finish : scoring lourd T20/T19
    if (remaining > 170) {
      return { v: 20, mult: 3 };
    }

    // 4) Zone 111–170 : on continue à bourriner T20
    return { v: 20, mult: 3 };
  }

  // -----------------------------
  // 4) "SCATTER" : COMMENT IL RÂTE AUTOUR DE LA CIBLE
  // -----------------------------
  function applyScatter(
    target: UIDart,
    mode: "scoring" | "double"
  ): UIDart {
    const s = skill;

    let pExact: number;
    let pRing: number;
    let pNeighbor: number;
    let pBig: number;

    if (mode === "double") {
      pExact = s.doubleExact;
      pRing = s.doubleRing;
      pNeighbor = s.doubleNeighbor;
      pBig = s.doubleBigMiss;
    } else {
      pExact = s.scoringExact;
      pRing = s.scoringRing;
      pNeighbor = s.scoringNeighbor;
      pBig = s.scoringBigMiss;
    }

    const r = Math.random();

    // EXACT
    if (r < pExact) {
      return target;
    }

    // MÊME NOMBRE, AUTRE ANNEAU (simple au lieu de double, etc.)
    if (r < pExact + pRing) {
      // Bull à part
      if (target.v === 25) {
        if (target.mult === 2) {
          // DBULL -> BULL
          return { v: 25, mult: 1 };
        }
        // BULL raté -> complètement à côté
        return { v: 0, mult: 1 };
      }

      let ringOptions: number[];
      if (target.mult === 3) {
        ringOptions = [1, 2]; // peut finir en simple ou double
      } else if (target.mult === 2) {
        ringOptions = [1]; // D -> S
      } else {
        // visait simple
        ringOptions = mode === "double" ? [2] : [1, 2, 3];
      }

      const mult =
        ringOptions[randomInt(0, ringOptions.length - 1)] as 1 | 2 | 3;

      return { v: target.v, mult };
    }

    // NEIGHBORS (cases à côté, ex: vise 17 mais touche 2 ou 3)
    if (r < pExact + pRing + pNeighbor) {
      if (target.v === 25) {
        // raté bull -> random simple sur la board
        const v =
          allSingles[randomInt(0, allSingles.length - 1)];
        return { v, mult: 1 };
      }

      const neigh = NEIGHBORS[target.v] ?? [target.v, target.v];
      const v = neigh[randomInt(0, neigh.length - 1)];

      // Pour les doubles, le miss crédible c'est le simple voisin
      const mult =
        mode === "double"
          ? 1
          : target.mult === 1
          ? 1
          : target.mult;

      return { v, mult };
    }

    // GROS MISS : complètement à côté
    if (Math.random() < 0.5) {
      return { v: 0, mult: 1 };
    }
    const v = allSingles[randomInt(0, allSingles.length - 1)];
    return { v, mult: 1 };
  }

  // -----------------------------
  // 5) BOUCLE SUR LES 3 FLÉCHETTES
  // -----------------------------
  let remaining = currentScore;

  for (let i = 0; i < 3; i++) {
    if (remaining <= 0) break;

    const dartsLeft = 3 - i;

    const ideal = chooseIdealTarget(remaining, dartsLeft);

    // Si on vise un double -> on applique la précision "double"
    const mode: "scoring" | "double" =
      ideal.mult === 2 ? "double" : "scoring";

    const hit = applyScatter(ideal, mode);

    darts.push(hit);

    const scored = dartScore(hit);

    // On ne simule pas les busts ultra précisément ici,
    // on s'aligne juste sur un plan cohérent
    remaining = Math.max(remaining - scored, 0);
  }

  return darts;
}

// ============================================================
// CHECKOUT helper (UI) — recalcul après CHAQUE fléchette / annuler
// - propose un finish selon le nombre de fléchettes restantes (1..3)
// - chart standard jusqu'à 170 (double-out)
// ============================================================

function computeCheckoutText(
  remaining: number,
  dartsLeft: number,
  outMode: "double" | "simple" | "master"
): string | null {
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  if (dartsLeft <= 0) return null;

  // En une visite (max 3 darts) on ne peut pas dépasser 180
  // => si >180, pas de checkout en 3 fléchettes
  if (remaining > 180) return null;

  type Dart = { code: string; score: number; kind: "S" | "D" | "T" | "B"; isFinisher: boolean };

  const all: Dart[] = [];
  const doubles: Dart[] = [];
  const masters: Dart[] = []; // doubles + triples (+ DBULL)

  // Singles / Doubles / Triples 1..20
  for (let n = 1; n <= 20; n++) {
    all.push({ code: `S${n}`, score: n, kind: "S", isFinisher: outMode !== "double" && outMode !== "master" }); // finisher en single-out seulement
    const d: Dart = { code: `D${n}`, score: 2 * n, kind: "D", isFinisher: true };
    all.push(d);
    doubles.push(d);
    masters.push(d);

    const t: Dart = { code: `T${n}`, score: 3 * n, kind: "T", isFinisher: outMode !== "double" }; // finisher en single/master
    all.push(t);
    masters.push(t);
  }

  // Bulls
  all.push({ code: "SBULL", score: 25, kind: "B", isFinisher: outMode === "simple" });
  const db: Dart = { code: "DBULL", score: 50, kind: "D", isFinisher: true };
  all.push(db);
  doubles.push(db);
  masters.push(db);

  const lastPool =
    outMode === "double" ? doubles :
    outMode === "master" ? masters :
    all;

  // Préférences "pro" (une seule variation)
  const preferredTriples = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
  const preferredDoubles = [20, 16, 18, 10, 12, 8, 6, 4, 2, 1, 5, 9, 14, 7, 3, 11, 13, 15, 17, 19, 25]; // 25 => DBULL

  function dartPenalty(d: Dart, isLast: boolean): number {
    // base : préférer moins de risque / plus standard
    if (d.code === "SBULL") return 40; // éviter bull (sauf nécessité)
    if (d.code === "DBULL") {
      // DBULL OK surtout en dernier dart
      return isLast ? 4 : 22;
    }

    const kind = d.code[0] as "S" | "D" | "T";
    const num = parseInt(d.code.slice(1), 10);

    if (kind === "T") {
      const idx = preferredTriples.indexOf(num);
      return idx >= 0 ? idx : 30 + (20 - num) * 0.25; // triples non standards pénalisés
    }

    if (kind === "D") {
      const mapped = num === 25 ? 25 : num;
      const idx = preferredDoubles.indexOf(mapped);
      return (isLast ? 0 : 6) + (idx >= 0 ? idx * 0.9 : 40);
    }

    // Singles : plutôt à éviter dans une ligne "pro"
    return 18 + (20 - num) * 0.15;
  }

  function scoreLine(line: Dart[]): number {
    // Priorité : finir en moins de darts (si possible),
    // puis choisir la ligne la plus "pro" (penalty le plus bas).
    let p = 0;
    for (let i = 0; i < line.length; i++) {
      p += dartPenalty(line[i], i === line.length - 1);
    }
    return line.length * 1000 + p;
  }

  function formatLine(line: Dart[]): string {
    return line.map((d) => d.code).join(" ");
  }

  let best: { line: Dart[]; score: number } | null = null;

  const maxDarts = Math.min(3, Math.max(1, dartsLeft));

  // On autorise de finir "avant" la fin de la volée (1 ou 2 darts),
  // mais on propose UNE seule ligne : la meilleure possible.
  for (let used = 1; used <= maxDarts; used++) {
    if (used === 1) {
      for (const a of lastPool) {
        if (a.score !== remaining) continue;

        // validation finisher selon outMode
        if (outMode === "double" && a.kind !== "D") continue;
        if (outMode === "master" && !(a.kind === "D" || a.kind === "T")) continue;

        const line = [a];
        const sc = scoreLine(line);
        if (!best || sc < best.score) best = { line, score: sc };
      }
    } else if (used === 2) {
      for (const a of all) {
        const rem1 = remaining - a.score;
        if (rem1 <= 0) continue;

        for (const b of lastPool) {
          if (a.score + b.score !== remaining) continue;

          if (outMode === "double" && b.kind !== "D") continue;
          if (outMode === "master" && !(b.kind === "D" || b.kind === "T")) continue;

          const line = [a, b];
          const sc = scoreLine(line);
          if (!best || sc < best.score) best = { line, score: sc };
        }
      }
    } else {
      for (const a of all) {
        const rem1 = remaining - a.score;
        if (rem1 <= 0) continue;

        for (const b of all) {
          const rem2 = rem1 - b.score;
          if (rem2 <= 0) continue;

          for (const c of lastPool) {
            if (a.score + b.score + c.score !== remaining) continue;

            if (outMode === "double" && c.kind !== "D") continue;
            if (outMode === "master" && !(c.kind === "D" || c.kind === "T")) continue;

            const line = [a, b, c];
            const sc = scoreLine(line);
            if (!best || sc < best.score) best = { line, score: sc };
          }
        }
      }
    }

    if (best && best.line.length === 1) break;
  }

  return best ? formatLine(best.line) : null;
}


// =============================================================
// Composant principal X01PlayV3
// =============================================================


// --- TEAM AVATAR (assets preferred) ---
type _TeamSkin = "pink" | "gold" | "blue" | "green";
const teamAvatarSrc = (skin: _TeamSkin) => getTeamAvatarUrl(skin);

// --- TEAM SKIN RESOLVER (from team name/color) ---
type TeamSkin = "pink" | "gold" | "blue" | "green";
const resolveTeamSkin = (team: any): TeamSkin => {
  const n = String(team?.name ?? "").toLowerCase();
  const c = String(team?.color ?? "").toLowerCase();

  // name hints
  if (n.includes("pink") || n.includes("rose")) return "pink";
  if (n.includes("gold") || n.includes("jaune") || n.includes("yellow")) return "gold";
  if (n.includes("blue") || n.includes("bleu")) return "blue";
  if (n.includes("green") || n.includes("vert")) return "green";

  // color hints (hex-ish)
  if (c.includes("ff4f") || c.includes("ff00") || c.includes("pink") || c.includes("magenta")) return "pink";
  if (c.includes("ffcf") || c.includes("ffb8") || c.includes("gold") || c.includes("yellow")) return "gold";
  if (c.includes("18a0") || c.includes("00b0") || c.includes("blue") || c.includes("cyan")) return "blue";
  if (c.includes("00e6") || c.includes("00f5") || c.includes("green")) return "green";

  // stable fallback
  return "gold";
};
const teamAvatarUrl = (team: any) => getTeamAvatarUrl(resolveTeamSkin(team));
export default function X01PlayV3({
  config,
  onExit,
  onShowSummary,
  onReplayNewConfig,
  resume,
}: Props) {
  // Fullscreen gameplay (mobile) — hide tabbar + lock global scroll
  useFullscreenPlay();
  const { isLandscapeTablet } = useViewport();
  const { theme } = useTheme();
  
  const isTabletUi = useMediaQueryLocal("(min-width: 900px) and (orientation: landscape)");
const themePrimary = (theme as any)?.colors?.primary ?? (theme as any)?.primary ?? "#ffcc55";

  // ✅ IMPORTANT : on récupère aussi la langue courante de l’app
  const { t, lang } = useLang() as any;

  // ✅ Panel flottant JOUEURS (ouvre la liste existante dans un modal scrollable)
  const [playersPanelOpen, setPlayersPanelOpen] = React.useState(false);

  // =====================================================
  // 🔓 UNLOCK AUDIO (réutilisable)
  // -> on le fait au mount, ET tu pourras l’appeler au 1er tir/1er clic
  // =====================================================
  const ensureAudioUnlockedNow = React.useCallback(() => {
    try {
      x01EnsureAudioUnlocked();
    } catch {}
  }, []);

  // ✅ Preload + unlock audio + warm-up voices
  React.useEffect(() => {
    // ✅ installe l’unlock + preload sfx + warm-up voices
    x01SfxV3Preload();

    // ✅ tente un unlock immédiat (desktop / certains navigateurs)
    ensureAudioUnlockedNow();

    // ✅ warm-up voices (Chrome peut être vide au 1er getVoices)
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.getVoices?.();
        // certains navigateurs remplissent plus tard
        const handler = () => {
          try {
            window.speechSynthesis.getVoices?.();
          } catch {}
        };
        window.speechSynthesis.onvoiceschanged = handler;
      }
    } catch {}
  }, [ensureAudioUnlockedNow]);

  // ✅ Injecte la langue au module TTS pour éviter voix EN par défaut
  React.useEffect(() => {
    // lang attendu: "fr" | "it" | "en" | "es" ... (ou "fr-FR", etc.)
    // fallback sûr: français
    try {
      (x01SfxV3Configure as any)?.({ ttsLang: (lang as any) || "fr" });
    } catch {
      // ignore
    }

    // ✅ re-warm voices au changement de langue (utile sur Chrome)
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.getVoices?.();
      }
    } catch {}
  }, [lang]);

  // Pour éviter de sauvegarder le match plusieurs fois (History)
  const hasSavedMatchRef = React.useRef(false);
  // ID unique de la partie dans l'historique (même id pour "en cours" et "terminé")
  const historyIdRef = React.useRef<string | null>(null);

  // Autosave : log de toutes les fléchettes (dans l'ordre global)
  const replayDartsRef = React.useRef<X01DartInputV3[]>([]);
  const isReplayingRef = React.useRef(false);
  const hasReplayedRef = React.useRef(false);

 // =====================================================
// ✅ Bot avatars fallback (si un BOT n'a pas avatarDataUrl dans config)
// -> on charge la liste des bots et on résout l'avatar proprement
// =====================================================

const botsMap = React.useMemo(() => {
  try {
    const bots = (loadBots as any)?.() || [];
    const m: Record<string, any> = {};
    for (const b of bots) {
      if (b?.id) m[String(b.id)] = b;
    }
    return m;
  } catch {
    return {};
  }
}, []);

// ✅ AVATAR RESOLVER UNIQUE (humains + bots)
const resolveAvatar = React.useCallback(
  (p: any): string | null => {
    if (!p) return null;

    // 1) champs directs sur le player (humain ou bot)
    const direct =
      p.avatarDataUrl ??
      p.avatarUrl ??
      p.photoUrl ??
      p.avatar ??
      null;

    if (direct) return direct;

    // 2) fallback BOT : on tente via botsMap (id du player)
    if (p.isBot) {
      const b = botsMap[String(p.id)];
      return (
        b?.avatarDataUrl ??
        b?.avatarUrl ??
        b?.photoUrl ??
        b?.avatar ??
        null
      );
    }

    return null;
  },
  [botsMap]
);

// Overlay "Résumé de la manche" (EndOfLegOverlay)
const [summaryOpen, setSummaryOpen] = React.useState(false);
const [summaryLegStats, setSummaryLegStats] = React.useState<LegStats | null>(
  null
);

const summaryPlayersById = React.useMemo(() => {
  return Object.fromEntries(
    (config.players || []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name || "Joueur",
        avatarDataUrl: resolveAvatar(p),
      },
    ])
  );
}, [config.players, resolveAvatar]);

const {
  state,
  liveStatsByPlayer,
  activePlayerId,
  scores,
  status,
  throwDart,
  undoLastDart, // 🔥 UNDO illimité du moteur V3
  startNextLeg,
} = useX01EngineV3({ config });

const players = (config as any)?.players ?? [];
const activePlayer = players.find((p) => p.id === activePlayerId) || null;

// ============================================================
// 🔁 Force resync UI depuis le moteur (UNDO cross-joueur)
// - Sync currentThrow + lastVisitsByPlayer (utilisé par PlayersListOnly)
// ============================================================
const forceSyncFromEngine = React.useCallback(() => {
  currentThrowFromEngineRef.current = true;

  const v: any = (state as any)?.visit;

  const raw: UIDart[] =
    v?.darts && Array.isArray(v.darts) && v.darts.length
      ? v.darts.map((d: any) => ({
          v: d.segment,
          mult: d.multiplier as 1 | 2 | 3,
        }))
      : [];

  setCurrentThrow(raw);

  // ✅ CRITIQUE: la liste joueurs lit lastVisitsByPlayer, pas currentThrow
  // ⚠️ IMPORTANT: ne JAMAIS écraser la dernière volée avec "[]".
  // Le moteur remet souvent state.visit à vide au changement de joueur.
  // Si on écrase ici, la dernière volée disparaît pour tous les joueurs.
  if (activePlayerId && raw.length > 0) {
    setLastVisitsByPlayer((m) => ({ ...m, [activePlayerId]: raw }));
    setLastVisitIsBustByPlayer((m) => ({ ...m, [activePlayerId]: false }));
  }
}, [state, activePlayerId]);

// =====================================================
// ✅ BOT TURN — DOIT ÊTRE DÉCLARÉ AVANT TOUT useEffect QUI L’UTILISE
// =====================================================
const isBotTurn = React.useMemo(() => {
  return !!activePlayer && Boolean((activePlayer as any).isBot);
}, [activePlayer]);

  // =====================================================
  // ✅ Source de comptage (manual / external)
  // =====================================================
  const scoringSource: ScoringSource =
    ((config as any)?.scoringSource as ScoringSource) ||
    (((config as any)?.externalScoring ? "external" : "manual") as ScoringSource);

  const externalProvider: "bridge" | "camera_assisted" =
    (((config as any)?.externalProvider as any) || "bridge") === "camera_assisted" ? "camera_assisted" : "bridge";

  const canUseCameraAssisted = scoringSource === "external" && externalProvider === "camera_assisted";
  const [cameraOpen, setCameraOpen] = React.useState(false);


  // =====================================================
  // 🎤 Voice scoring (MVP) — dictée 3 fléchettes + confirmation
  // - Ignore automatiquement si scoringSource=external ou BOT
  // =====================================================
  const voiceScoreEnabled = !!(config as any)?.voiceScoreInputEnabled;

  const speakVoiceScore = React.useCallback(
    (text: string) => {
      try {
        if (typeof window === "undefined") return;
        const synth = (window as any).speechSynthesis;
        if (!synth) return;

        try {
          synth.cancel?.();
        } catch {}

        const u = new SpeechSynthesisUtterance(text);
        u.lang = (lang || "fr").startsWith("fr") ? "fr-FR" : lang || "en-US";
        synth.speak(u);
      } catch {
        // ignore
      }
    },
    [lang]
  );

  const voiceScore = useVoiceScoreInput({
    enabled:
      voiceScoreEnabled &&
      scoringSource !== "external" &&
      !isBotTurn &&
      status === "running",
    lang: (lang || "fr").startsWith("fr") ? "fr-FR" : "en-US",
    speak: speakVoiceScore,
    announcePlayer: false, // X01PlayV3 annonce déjà le tour
    playerName: activePlayer?.name || "",
    onCommit: (vdarts) => {
      try {
        if (!vdarts?.length) return;
        if (status !== "running") return;
        if (scoringSource === "external") return;
        if (isBotTurn) return;

        // UI: dernière volée
        const pid = activePlayerId as string;
        const uiDarts: UIDart[] = vdarts.map((d) => {
          if ((d as any).kind === "BULL") return ({ v: 25, mult: 1 } as any);
          if ((d as any).kind === "DBULL") return ({ v: 25, mult: 2 } as any);
          if ((d as any).kind === "MISS") return ({ v: 20, mult: 0 } as any);
          const kind = (d as any).kind as "S" | "D" | "T";
          const base = (d as any).base as number;
          const mult = kind === "T" ? 3 : kind === "D" ? 2 : 1;
          return ({ v: base, mult } as any);
        });

        setLastVisitsByPlayer((m) => ({ ...m, [pid]: uiDarts.slice(-3) }));

        // Audio unlock best-effort
        try {
          ensureAudioUnlockedNow();
        } catch {}

        // On pousse au moteur APRÈS confirmation
        const inputs: X01DartInputV3[] = vdarts.map((d: any) => {
          if (d.kind === "BULL") return { segment: 25, multiplier: 1 } as any;
          if (d.kind === "DBULL") return { segment: 25, multiplier: 2 } as any;
          if (d.kind === "MISS") return { segment: 20, multiplier: 0 } as any;
          const mult = d.kind === "T" ? 3 : d.kind === "D" ? 2 : 1;
          return { segment: d.base, multiplier: mult } as any;
        });

        inputs.forEach((input, index) => {
          setTimeout(() => {
            throwDart(input);

            // Autosave + replay log
            replayDartsRef.current = replayDartsRef.current.concat([input]);
            persistAutosave();
          }, index * 10);
        });
      } catch (e) {
        console.warn("[X01PlayV3] voice scoring commit failed", e);
      }
    },
    onNeedManual: () => {
      try {
        speakVoiceScore(
          (lang || "fr").startsWith("fr")
            ? "Ok. Corrige manuellement au clavier."
            : "Ok. Please correct manually."
        );
      } catch {}
    },
  });

  React.useEffect(() => {
    if (!voiceScoreEnabled) return;
    if (scoringSource === "external") return;
    if (status !== "running") return;
    if (!activePlayerId) return;
    if (isBotTurn) return;
    voiceScore.beginTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerId]);

  // Y a-t-il AU MOINS un BOT dans la partie ?
  const hasBots = React.useMemo(
    () => players.some((p: any) => !!(p as any).isBot),
    [players]
  );

  // Targets SETS/LEGS (robuste: compat anciens configs / modes TEAMS)
  const setsTarget = Math.max(
    1,
    Number(
      (config as any).setsToWin ??
        (config as any).setsTarget ??
        (config as any).sets ??
        (config as any).setsToWinCount ??
        1
    )
  );
  const legsTarget = Math.max(
    1,
    Number(
      (config as any).legsPerSet ??
        (config as any).legsTarget ??
        (config as any).legs ??
        (config as any).legsToWin ??
        1
    )
  );
  const isDuel = players.length === 2;
  const useSetsUi = setsTarget > 1 || legsTarget > 1;

  // ---------------- Avatars (depuis config.players) ----------------

  const profileById = React.useMemo(() => {
    const m: Record<string, { avatarDataUrl: string | null; name: string }> = {};
    for (const p of players as any[]) {
      m[p.id] = {
        avatarDataUrl: resolveAvatar(p),
        name: p.name,
      };
    }
    return m;
  }, [players, resolveAvatar]);
  
  // Backward-compat: anciens builds stockaient `matchMode`.
  const isTeamsMode =
    ((config as any).gameMode === "teams" || (config as any).matchMode === "teams") &&
    Array.isArray((config as any).teams) &&
    ((config as any).teams?.length ?? 0) >= 2;

const teamsView = React.useMemo(() => {
  if (!isTeamsMode) return null;

  const teams = ((config as any).teams as any[]) || [];
  const teamMetaById: Record<string, { name?: string; color?: string }> = Object.fromEntries(
    teams.map((t: any) => [String(t.id), { name: t.name, color: t.color || (String(t.name||"").toLowerCase().includes("pink") ? "#ff4fd8" : String(t.name||"").toLowerCase().includes("rose") ? "#ff4fd8" : String(t.name||"").toLowerCase().includes("gold") ? "#ffcf57" : undefined) }])
  );
  const playersById: Record<string, any> = Object.fromEntries(
    (players as any[]).map((p: any) => [p.id, p])
  );

  return teams
    .map((t: any) => {
      const ids: string[] = Array.isArray(t.players) ? t.players : [];
      const members = ids
        .map((id) => playersById[id])
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: profileById[p.id]?.avatarDataUrl ?? null,
          isActive: p.id === activePlayerId,
        }));

      const score =
        ids.length > 0 ? (scores as any)[ids[0]] ?? (scores as any)[activePlayerId] : (scores as any)[activePlayerId];

      return {
        id: t.id,
        name: t.name || teamMetaById[String(t.id)]?.name || "TEAM",
        color: t.color || teamMetaById[String(t.id)]?.color || "#ffcf57",
        avatarUrl: teamAvatarUrl(t),

        playerIds: ids,
        players: members,
        score,
      };
    })
    .filter((t: any) => t.players.length > 0);
}, [isTeamsMode, (config as any).teams, players, profileById, scores, activePlayerId]);

const activeTeam = React.useMemo(() => {
  if (!teamsView || !activePlayerId) return null;
  return (teamsView as any[]).find((t: any) => (t.playerIds || []).includes(activePlayerId)) || null;
}, [teamsView, activePlayerId]);


  const currentScore =
    activePlayer ? (scores[activePlayer.id] ?? config.startScore) : config.startScore;

  const currentVisit = state.visit;

    // out mode ? (double / single / master) — selon config
  const outMode: "double" | "simple" | "master" = React.useMemo(() => {
    const raw =
      (config as any).outMode ??
      (config as any).finishMode ??
      ((config as any).doubleOut === true ? "double" : null);

    // ✅ Compat: certains anciens écrans utilisent "single" au lieu de "simple"
    if (raw === "master") return "master";
    if (raw === "simple" || raw === "single") return "simple";
    if (raw === "double") return "double";
    // défaut historique = double-out
    return "double";
  }, [config]);

  // Affichage "Volée x/3" (désactivé par défaut) — active seulement si config.showThrowCounter === true
  const showThrowCounter = (config as any)?.showThrowCounter === true;


  function isValidFinisher(d: any): boolean {
    if (!d) return false;
    const isD = d.mult === 2 || (d.v === 25 && d.mult === 2);
    const isT = d.mult === 3;
    if (outMode === "double") return isD;
    if (outMode === "master") return isD || isT;
    return true; // single out
  }


  // Compat : certaines parties du code utilisent encore un booléen doubleOut
  const doubleOut = outMode === "double";

  // =====================================================
  // Checkout (UI) — recalcul live après chaque fléchette / annuler
  // =====================================================
// =====================================================
  // Autosave : persistance / reprise (A1 basé sur la liste des darts)
  // =====================================================

  const persistAutosave = React.useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const engineMatchId: string | undefined = (state as any)?.matchId;
      const matchId =
        historyIdRef.current ||
        engineMatchId ||
        `x01v3-${config.startScore}-${Date.now().toString(16)}`;

      historyIdRef.current = matchId;

      const snap: X01V3AutosaveSnapshot = {
        id: matchId,
        createdAt: Date.now(),
        config,
        darts: replayDartsRef.current,
      };
      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));

      const lightPlayers = (config.players || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl:
          p.avatarDataUrl ?? p.avatarUrl ?? p.photoUrl ?? null,
      }));

      const payload = {
        mode: "x01_multi",
        variant: "x01_v3",
        game: "x01",
        startScore: config.startScore,
        matchId,
        config: { ...config, players: lightPlayers },
        darts: replayDartsRef.current,
      };

      const record: any = {
        id: matchId,
        kind: "x01",
        status: "in_progress",
        createdAt: snap.createdAt,
        updatedAt: snap.createdAt,
        players: lightPlayers,
        winnerId: null,
        summary: {
          matchId,
          status: "in_progress",
        },
        payload,
      };

      History.upsert(record).catch((err) => {
        console.warn("[X01PlayV3] History.upsert(in_progress) failed", err);
      });
    } catch (e) {
      console.warn("[X01PlayV3] persistAutosave failed", e);
    }
  }, [config, state]);

  // =====================================================
  // Reprise depuis HISTORIQUE (props.resume)
  // - rejoue les darts pour reconstruire l'état moteur (scores, tour, legs)
  // - fixe l'id pour continuer autosave/history.upsert sur le même record
  // =====================================================
  React.useEffect(() => {
    if (hasReplayedRef.current) return;
    if (!resume || !Array.isArray(resume.darts)) return;

    try {
      hasReplayedRef.current = true;
      isReplayingRef.current = true;

      // On reprend sur le même record d'historique
      historyIdRef.current = String(resume.resumeId);

      // On conserve aussi le replay log pour les futures saves
      replayDartsRef.current = resume.darts.slice();

      // Rejoue les darts de façon séquentielle (évite un batch qui peut être ignoré)
      const darts = resume.darts.slice();
      darts.forEach((d, i) => {
        setTimeout(() => {
          try {
            throwDart(d);
          } catch (e) {
            console.warn("[X01PlayV3] resume replay dart failed", e);
          }
        }, i * 5);
      });

      // Fin de replay (flag)
      setTimeout(() => {
        isReplayingRef.current = false;
      }, darts.length * 5 + 10);
    } catch (e) {
      console.warn("[X01PlayV3] resume(history) failed", e);
      isReplayingRef.current = false;
    }
  }, [resume, throwDart]);


  // Reprise auto : DÉSACTIVÉE par défaut (évite les "volées fantômes").
// Pour forcer une reprise (debug), mettre localStorage[AUTOSAVE_KEY + ":resume"] = "1"
// puis recharger la page.
  React.useEffect(() => {
    if (hasReplayedRef.current) return;
    hasReplayedRef.current = true;

    if (typeof window === "undefined") return;
    try {
      const resumeFlag = window.localStorage.getItem(AUTOSAVE_KEY + ":resume");
      if (resumeFlag !== "1") return;

      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as X01V3AutosaveSnapshot;
      if (!snap || !Array.isArray(snap.darts)) return;

      const snapPlayers = (snap.config?.players ?? []) as any[];

      if (
        snap.config?.startScore !== config.startScore ||
        !Array.isArray(snapPlayers) ||
        snapPlayers.length !== config.players.length
      ) {
        return;
      }

      const sameNames = snapPlayers.every((p, idx) => {
        const target = config.players[idx] as any;
        return p.name === target.name;
      });
      if (!sameNames) return;

      isReplayingRef.current = true;
      replayDartsRef.current = snap.darts.slice();

      snap.darts.forEach((d) => {
        throwDart(d);
      });

      isReplayingRef.current = false;
    } catch (e) {
      console.warn("[X01PlayV3] autosave resume failed", e);
    }
  }, [config, throwDart]);

  // Quand le match est terminé : on vide l’autosave
  React.useEffect(() => {
    if (status === "match_end") {
      replayDartsRef.current = [];
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(AUTOSAVE_KEY);
          window.localStorage.removeItem(AUTOSAVE_KEY + ":resume");
        } catch (e) {
          console.warn("[X01PlayV3] clear autosave failed", e);
        }
      }
    }
  }, [status]);

  // ✅ NOTE :
  // Tu peux maintenant appeler ensureAudioUnlockedNow() au 1er clic user (ex: pushDart/validateThrow)
  // pour garantir que les SFX arcade partent.


  // =====================================================
  // AUDIO FLAGS (depuis config) + helpers SFX/VOICE
  // =====================================================

  // ⚙️ defaults = ON
  const audioCfg = (config as any)?.audio ?? {};

  // "Sons Arcade" : DBULL/BULL/180/DOUBLE/TRIPLE/BUST/VICTORY
  const arcadeEnabled: boolean = audioCfg.arcadeEnabled !== false;

  // "Bruitages" : dart-hit (et éventuellement d'autres "hits" secs)
  const hitEnabled: boolean = audioCfg.hitEnabled !== false;

  // "Voix IA" : announceVisit / announceEndGame
  const voiceEnabled: boolean = audioCfg.voiceEnabled !== false;

  // Voice sélectionnée (depuis écran Profil / paramètres joueur)
  const voiceId: string | undefined = audioCfg.voiceId ?? undefined;

  // Volume SFX global (si tu veux le brancher plus tard sur un slider)
  const sfxVolume: number =
    typeof audioCfg.sfxVolume === "number" ? audioCfg.sfxVolume : 0.75;

  const playHitSfx = React.useCallback(
    (kind: any, opts?: any) => {
      if (!hitEnabled) return;
      x01PlaySfxV3(kind, { volume: sfxVolume, ...(opts || {}) });
    },
    [hitEnabled, sfxVolume]
  );

  const playArcadeSfx = React.useCallback(
    (kind: any, opts?: any) => {
      if (!arcadeEnabled) return;
      x01PlaySfxV3(kind, { volume: sfxVolume, ...(opts || {}) });
    },
    [arcadeEnabled, sfxVolume]
  );

  // =====================================================
// 🧩 ARCADE KEY MAPPER (si les IDs audio ne matchent pas)
// -> essaye plusieurs keys connues avant d'abandonner
// =====================================================

const tryPlayAny = React.useCallback(
  (kinds: string[], opts?: any) => {
    for (const k of kinds) {
      try {
        x01PlaySfxV3(k as any, opts);
        return; // si ça ne throw pas, on considère OK
      } catch {}
    }
    // debug (visible en console)
    console.warn("[X01PlayV3] Arcade SFX: aucun key n'a matché", kinds);
  },
  [/* rien */]
);

const playArcadeMapped = React.useCallback(
  (event: "dbull" | "bull" | "double" | "triple" | "bust" | "score_180" | "victory", opts?: any) => {
    if (!arcadeEnabled) return;

    // ⚠️ Variantes courantes selon l’implémentation du fichier x01SfxV3.ts
    const MAP: Record<string, string[]> = {
      dbull: ["dbull", "dBull", "double_bull", "dbull_hit", "arcade_dbull", "sfx_dbull"],
      bull: ["bull", "oBull", "outer_bull", "bull_hit", "arcade_bull", "sfx_bull"],
      double: ["double", "dbl", "hit_double", "arcade_double", "sfx_double"],
      triple: ["triple", "tpl", "hit_triple", "arcade_triple", "sfx_triple"],
      bust: ["bust", "busted", "arcade_bust", "sfx_bust"],
      score_180: ["score_180", "180", "one_eighty", "arcade_180", "sfx_180"],
      victory: ["victory", "win", "winner", "arcade_victory", "sfx_victory"],
    };

    tryPlayAny(MAP[event] || [event], { volume: sfxVolume, ...(opts || {}) });
  },
  [arcadeEnabled, sfxVolume, tryPlayAny]
);

  // =====================================================
// 🗣️ VOIX IA — annonce de volée (langue + voix sélectionnée)
// =====================================================

const speakVisit = React.useCallback(
  (playerName: string, visitScore: number) => {
    if (!voiceEnabled) return;

    // sécurité
    const name = (playerName || "").trim();
    if (!name) return;

    try {
      // ✅ Signature étendue : (name, score, { voiceId, lang })
      (announceVisit as any)(
        name,
        visitScore,
        {
          voiceId: voiceId || undefined,
          lang: lang || "fr", // ← LANGUE APP (fr / it / en / es…)
        }
      );
    } catch {
      try {
        // fallback 1 : signature (name, score)
        announceVisit(name, visitScore);
      } catch {
        // ignore total
      }
    }
  },
  [voiceEnabled, voiceId, lang]
);

  
// =====================================================
// 🎵 SCORE SFX (80..179 + NULL) + DELAY VOICE (>=2s)
// - Tous les fichiers sont chargés depuis /public/sounds
//   ex: /public/sounds/score_80.mp3
// =====================================================

const voiceTimerRef = React.useRef<number | null>(null);
const turnAnnouncedRef = React.useRef<string | null>(null);

const playPublicSound = React.useCallback(
  (fileName: string, opts?: { volume?: number }) => {
    try {
      if (typeof Audio === "undefined") return null as any;
      const a = new Audio(`/sounds/${fileName}`);
      a.volume = Math.max(0, Math.min(1, opts?.volume ?? sfxVolume ?? 0.75));
      // évite empilement
      a.currentTime = 0;
      a.play().catch(() => {});
      return a;
    } catch {
      return null as any;
    }
  },
  [sfxVolume]
);

const scheduleVoice = React.useCallback(
  (fn: () => void, delayMs: number) => {
    if (!voiceEnabled) return;
    if (voiceTimerRef.current) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceTimerRef.current = window.setTimeout(() => {
      voiceTimerRef.current = null;
      fn();
    }, Math.max(0, delayMs));
  },
  [voiceEnabled]
);

const playScoreSfxAndMaybeDelayVoice = React.useCallback(
  (args: {
    playerName: string;
    pid: string;
    scoreBefore: number;
    darts: UIDart[];
    visitScore: number;
    isBustNow: boolean;
    isCheckoutNow: boolean;
  }) => {
    const { playerName, pid, scoreBefore, darts, visitScore, isBustNow, isCheckoutNow } = args;

    // ---- BUST : son dédié, pas de score SFX/voix ----
    if (isBustNow) {
      if (arcadeEnabled) {
        playArcadeMapped("bust", { rateLimitMs: 180, volume: sfxVolume });
      }
      return;
    }

    // ---- Null sfx (0..10) hors checkout et hors bust ----
    if (!isBustNow && !isCheckoutNow && visitScore >= 0 && visitScore <= 10) {
      if (arcadeEnabled) {
        const audio = playPublicSound("score-null.mp3", { volume: sfxVolume });
        if (audio && typeof (audio as any).addEventListener === "function") {
          (audio as any).addEventListener(
            "ended",
            () => {
              // ✅ Réduire la latence SFX -> voix (cible ~1s)
              scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
            },
            { once: true } as any
          );
        } else {
          // fallback si l'event "ended" n'est pas dispo
          scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
        }
      } else {
        // si pas de sfx arcade, on annonce quand même (avec un léger délai)
        scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
      }
      return;
    }

    // ---- Scores 80..179 : SFX dédié + voix ~1s après le son ----
    if (!isBustNow && visitScore >= 80 && visitScore <= 179) {
      if (arcadeEnabled) {
        const audio = playPublicSound(`score_${visitScore}.mp3`, { volume: sfxVolume });
        if (audio && typeof audio.addEventListener === "function") {
          audio.addEventListener(
            "ended",
            () => {
              scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
            },
            { once: true } as any
          );
        } else {
          scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
        }
      } else {
        // pas de SFX => voix immédiate
        speakVisit(playerName, visitScore);
      }
      return;
    }

    // ---- 180 : déjà géré arcade (comme avant) + voix ~1s ----
    if (!isBustNow && visitScore === 180 && darts.length === 3) {
      if (arcadeEnabled) {
        playArcadeMapped("score_180", { rateLimitMs: 300 });
        scheduleVoice(() => speakVisit(playerName, visitScore), 1000);
      } else {
        speakVisit(playerName, visitScore);
      }
      return;
    }

    // ---- Autres scores : voix normale (immédiate) ----
    speakVisit(playerName, visitScore);
  },
  [arcadeEnabled, playArcadeMapped, playPublicSound, scheduleVoice, speakVisit, sfxVolume]
);

// =====================================================
// 🗣️ VOIX IA — annonce du TOUR du joueur
// =====================================================

const speakText = React.useCallback(
  (text: string) => {
    if (!voiceEnabled) return;
    try {
      if (typeof window === "undefined") return;
      const synth = (window as any).speechSynthesis;
      if (!synth) return;

      // stop queue pour éviter les empilements
      try {
        synth.cancel();
      } catch {}

      const u = new SpeechSynthesisUtterance(text);
      // Langue (simple)
      u.lang = (lang || "fr").startsWith("fr") ? "fr-FR" : lang || "en-US";

      // Profil "robot" (optionnel)
      if (voiceId === "robot") {
        u.rate = 0.95;
        u.pitch = 0.8;
      } else {
        u.rate = 1.02;
        u.pitch = 1.0;
      }

      // Tente de choisir une voix cohérente (si dispo)
      const voices: SpeechSynthesisVoice[] = synth.getVoices?.() || [];
      const wantsFemale = voiceId === "female";
      const wantsMale = voiceId === "male";

      const pick = (v: SpeechSynthesisVoice) => {
        const name = (v.name || "").toLowerCase();
        const local = (v.lang || "").toLowerCase();
        const okLang =
          (lang || "fr").startsWith("fr") ? local.includes("fr") : true;

        if (!okLang) return false;

        if (wantsFemale) return name.includes("female") || name.includes("woman") || name.includes("fem");
        if (wantsMale) return name.includes("male") || name.includes("man") || name.includes("hom");
        return true;
      };

      const chosen = voices.find(pick) || voices.find((v) => (v.lang || "").toLowerCase().includes("fr")) || voices[0];
      if (chosen) u.voice = chosen;

      synth.speak(u);
    } catch {
      // ignore
    }
  },
  [voiceEnabled, voiceId, lang]
);

React.useEffect(() => {
  // on annonce uniquement pendant une partie en cours
  if (status !== "running") return;
  if (!activePlayerId) return;

  // anti-spam
  if (turnAnnouncedRef.current === activePlayerId) return;
  turnAnnouncedRef.current = activePlayerId;

  const playerName = profileById?.[activePlayerId as any]?.name || activePlayer?.name || "Joueur";
  // Ex: "Tour de Alex" / "À toi Alex"
  const phrase = (lang || "fr").startsWith("fr")
    ? `À toi ${playerName}`
    : `Your turn ${playerName}`;

  // petit délai pour laisser l'UI se mettre à jour
  scheduleVoice(() => speakText(phrase), 350);
}, [activePlayerId, status, activePlayer, profileById, scheduleVoice, speakText, lang]);

// =====================================================
// 🎬 INTRO SOUND au début de partie
// =====================================================
const introPlayedRef = React.useRef(false);
React.useEffect(() => {
  if (introPlayedRef.current) return;
  introPlayedRef.current = true;
  if (!arcadeEnabled) return;
  // intro dès l'entrée dans le match
  playPublicSound("game-intro.mp3", { volume: sfxVolume });
}, [arcadeEnabled, playPublicSound, sfxVolume]);

// =====================================================
// ÉTAT LOCAL KEYPAD (logique v1 + synchro UNDO moteur)
// =====================================================

const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
const [bustError, setBustError] = React.useState<string | null>(null);
  // ✅ UI helpers for BUST (used by keypad cancel / validate flows)
  const [bustBanner, setBustBanner] = React.useState<boolean>(false);
  const [isBust, setIsBust] = React.useState<boolean>(false);

const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

// ✅ ÉTAT: dernière volée par joueur (sert à PlayersListOnly + bust preview)
const [lastVisitsByPlayer, setLastVisitsByPlayer] = React.useState<
  Record<string, UIDart[]>
>({});

const [lastVisitIsBustByPlayer, setLastVisitIsBustByPlayer] = React.useState<
  Record<string, boolean>
>({});

// 🔒 garde-fou anti double-validation HUMAIN
const isValidatingRef = React.useRef(false);

// 🔒 garde-fou BOT : (gardé si tu veux le réutiliser plus tard)
const botUndoGuardRef = React.useRef(false);

// 🔊 anti double-bust (bust preview déjà joué avant validation)
const bustPreviewPlayedRef = React.useRef(false);

// 🔊 timer pour déclencher le BUST avec délai
const bustSoundTimeoutRef = React.useRef<number | null>(null);

// 🔒 indique si currentThrow vient du moteur (rebuild / UNDO)
//    ou

  const checkoutText = React.useMemo(() => {
  // on ne propose des checkouts que pendant une partie
  if (status !== "running" && status !== "playing") return null;

  // remaining après la saisie en cours (preview)
  const remaining = currentScore - sumThrow(currentThrow);
  const dartsLeft = Math.max(0, 3 - (currentThrow?.length || 0));

  // aucun checkout possible si <= 1 (impossible de finir) ou plus de darts
  if (remaining > 170) return null; // pas de finish standard
  if (remaining <= 1) return null;
  if (dartsLeft <= 0) return null;

  // finishMode / outMode (SIMPLE / DOUBLE / MASTER)
  // ✅ utilise le outMode global ("double" | "single" | "master") et mappe vers X01OutModeV3
  const checkoutOutMode: X01OutModeV3 =
    outMode === "master" ? "master" : outMode === "double" ? "double" : "simple";

  const sug = extAdaptCheckoutSuggestion({ score: remaining, dartsLeft, outMode: checkoutOutMode });
  if (!sug) return null;

  const txt = formatCheckoutFromVisit(sug);
  return txt || null;
}, [status, currentThrow, currentScore, outMode]);
  // de la saisie locale sur le keypad

  const currentThrowFromEngineRef = React.useRef(false);


// 🔄 SYNC AVEC LE MOTEUR UNIQUEMENT POUR LES CAS "ENGINE-DRIVEN"
//    (UNDO global, rebuild, etc.)
React.useEffect(() => {
  if (!currentThrowFromEngineRef.current) return;

  const v: any = state.visit;

  if (!v) {
    setCurrentThrow([]);
    return;
  }

  const raw: UIDart[] =
    v.darts && Array.isArray(v.darts) && v.darts.length
      ? v.darts.map((d: any) => ({
          v: d.segment,
          mult: d.multiplier as 1 | 2 | 3,
        }))
      : v.dartsThrown && Array.isArray(v.dartsThrown) && v.dartsThrown.length
      ? v.dartsThrown.map((d: any) => ({
          v: d.value,
          mult: d.mult as 1 | 2 | 3,
        }))
      : [];

  if (!raw.length) {
    setCurrentThrow([]);
    return;
  }

  setCurrentThrow((prev) => {
    if (
      prev.length === raw.length &&
      prev.every((d, i) => d.v === raw[i].v && d.mult === raw[i].mult)
    ) {
      return prev;
    }
    return raw;
  });
}, [state]);

// 🔄 CHANGEMENT DE JOUEUR ACTIF → on vide la volée locale
//    (sauf en cas d'UNDO/rebuild où c'est le moteur qui pilote)
React.useEffect(() => {
  if (currentThrowFromEngineRef.current) return;
  setCurrentThrow([]);
  setMultiplier(1);
}, [activePlayerId]);

function pushDart(value: number, multOverride?: 1 | 2 | 3) {
  ensureAudioUnlockedNow();
  currentThrowFromEngineRef.current = false;

  if (!activePlayerId) return;
  if (currentThrow.length >= 3) return;

  const forcedMult = multOverride ?? multiplier;
  const safeMult: 1 | 2 | 3 =
    value === 25 ? ((forcedMult === 2 ? 2 : 1) as any) : (forcedMult as any);
  const dart: UIDart = { v: value, mult: safeMult } as UIDart;

  // 1) hit
  playHitSfx("dart_hit", { rateLimitMs: 40, volume: 0.55 });

  // 2) arcade bull/dbull + 3) double/triple (avec DBULL exclusif)
  const isDbull = dart.v === 25 && dart.mult === 2;
  const isBullNow = dart.v === 25 && dart.mult === 1;

  if (isDbull) playArcadeMapped("dbull");
  else if (isBullNow) playArcadeMapped("bull");

  if (!isDbull) {
    if (dart.mult === 3) playArcadeMapped("triple");
    else if (dart.mult === 2) playArcadeMapped("double");
  }

  const nextThrow = [...currentThrow, dart];
  setCurrentThrow(nextThrow);
  setMultiplier(1);

  // ---- BUST PREVIEW (dès que ça devient bust) + son BUST décalé 1.5s
  if (bustSoundTimeoutRef.current) {
    window.clearTimeout(bustSoundTimeoutRef.current);
    bustSoundTimeoutRef.current = null;
  }

  try {
    const scoreBefore = currentScore;

    const visitScore = nextThrow.reduce(
      (s, d) => s + (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult),
      0
    );

    const remainingAfter = scoreBefore - visitScore;
    const willBustNow =
      remainingAfter < 0 || ((outMode === "double" || outMode === "master") && remainingAfter === 1);

    if (willBustNow) {
      // ✅ afficher la volée bust en rouge (liste joueurs)
      setLastVisitsByPlayer((m) => ({
        ...m,
        [activePlayerId]: nextThrow,
      }));
      setLastVisitIsBustByPlayer((m) => ({
        ...m,
        [activePlayerId]: true,
      }));

      if (!bustPreviewPlayedRef.current) {
        bustPreviewPlayedRef.current = true;

        bustSoundTimeoutRef.current = window.setTimeout(() => {
          playArcadeMapped("bust", { rateLimitMs: 220 });
          bustSoundTimeoutRef.current = null;
        }, 1500);
      }
    } else {
      bustPreviewPlayedRef.current = false;
      setLastVisitIsBustByPlayer((m) => ({
        ...m,
        [activePlayerId]: false,
      }));
    }
  } catch {
    // ignore
  }
}

const isBustLocked = !!(activePlayerId && (lastVisitIsBustByPlayer as any)?.[activePlayerId]);

const handleSimple = () => {
  if (isBustLocked) return;
  setMultiplier(1);
};
const handleDouble = () => {
  if (isBustLocked) return;
  setMultiplier(2);
};
const handleTriple = () => {
  if (isBustLocked) return;
  setMultiplier(3);
};

const handleNumber = (value: number) => {
  if (isBustLocked) return;
  pushDart(value);
};
const handleBull = () => {
  if (isBustLocked) return;
  pushDart(25);
};

const handleDirectDart = (d: UIDart) => {
  if (isBustLocked) return;
  pushDart(d.v, d.mult as any);
};

const handleBackspace = () => {
  if (isBustLocked) return;
  currentThrowFromEngineRef.current = false;

  bustPreviewPlayedRef.current = false;
  if (bustSoundTimeoutRef.current) {
    window.clearTimeout(bustSoundTimeoutRef.current);
    bustSoundTimeoutRef.current = null;
  }

  setCurrentThrow((prev) => prev.slice(0, -1));
};

const handleCancel = () => {
  // Cancel = undo last input safely.
  // - If there is a local currentThrow: remove the last dart
  // - Otherwise: ask the engine to undo the last committed dart (any player/turn)

  bustPreviewPlayedRef.current = false;
  if (bustSoundTimeoutRef.current) {
    window.clearTimeout(bustSoundTimeoutRef.current);
    bustSoundTimeoutRef.current = null;
  }

  // Always clear bust state when cancelling
  setBustError("");
  // ⚠️ Le lock bust est dérivé de lastVisitIsBustByPlayer.
  // En Cancel/UNDO, on déverrouille pour le joueur courant.
  setLastVisitIsBustByPlayer((prev) => ({
    ...prev,
    [activePlayerId]: false,
  }));
  setBustBanner(false);
  setIsBust(false);

  // 1) Local edit: pop one dart from the current visit
  if (currentThrow.length > 0) {
    setCurrentThrow((prev) => prev.slice(0, -1));
    currentThrowFromEngineRef.current = false;
    setMultiplier(1);
    return;
  }

// 2) Engine undo: revert the last committed dart from history
botUndoGuardRef.current = true;
try {
  undoLastDart();
  persistAutosave();

  // ✅ RESYNC UI après UNDO (y compris si on revient au joueur précédent)
  window.setTimeout(() => {
    forceSyncFromEngine();
  }, 0);
} finally {
  window.setTimeout(() => {
    botUndoGuardRef.current = false;
  }, 0);
}
};

const validateThrow = async () => {
  if (isValidatingRef.current) return;
  isValidatingRef.current = true;

  const toSend = [...currentThrow];
  const pid = activePlayerId;

  // ✅ on coupe tout timer bust “prévu”
  bustPreviewPlayedRef.current = false;
  if (bustSoundTimeoutRef.current) {
    window.clearTimeout(bustSoundTimeoutRef.current);
    bustSoundTimeoutRef.current = null;
  }

  try {
    const playerName = activePlayer?.name || "Joueur";
    const scoreBefore = scores[pid] ?? config.startScore;

    const visitScore = toSend.reduce(
      (s, d) => s + (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult),
      0
    );

    const isBustNow =
      scoreBefore - visitScore < 0 || ((outMode === "double" || outMode === "master") && scoreBefore - visitScore === 1);

    const remainingAfter = scoreBefore - visitScore;
    const last = toSend[toSend.length - 1];
    const lastIsDouble = !!last && (last.mult === 2 || (last.v === 25 && last.mult === 2));
      const lastIsTriple = !!last && last.mult === 3;
      const lastIsFinisher = (outMode === "double") ? lastIsDouble : (outMode === "master") ? (lastIsDouble || lastIsTriple) : true;
    const isCheckoutNow = !isBustNow && remainingAfter === 0 && lastIsFinisher;
// ✅ sons scores (80..179 + null + 180) + délai voix (>=2s)
    playScoreSfxAndMaybeDelayVoice({
      playerName,
      pid,
      scoreBefore,
      darts: toSend,
      visitScore,
      isBustNow,
      isCheckoutNow,
    });

    // ✅ volée validée : reset le flag rouge
    setLastVisitIsBustByPlayer((m: Record<string, boolean>) => ({
      ...m,
      [pid]: false,
    }));
  } catch (e) {
    console.warn("[X01PlayV3] end-of-visit sfx/voice failed", e);
  }

  setLastVisitsByPlayer((m: Record<string, UIDart[]>) => ({
    ...m,
    [pid]: toSend,
  }));

  const inputs: X01DartInputV3[] = toSend.map((d) => ({
    segment: d.v === 25 ? 25 : d.v,
    multiplier: d.mult as 1 | 2 | 3,
  }));

  setCurrentThrow([]);
  setMultiplier(1);

  currentThrowFromEngineRef.current = false;

  replayDartsRef.current = replayDartsRef.current.concat(inputs);
  persistAutosave();

  inputs.forEach((input, index) => {
    setTimeout(() => {
      throwDart(input);

      if (index === inputs.length - 1) {
        isValidatingRef.current = false;

        // ✅ CRITIQUE (BUST / TEAMS): resync UI depuis le moteur après la fin de visite
        // (évite de conserver des fléchettes affichées sur la visite suivante)
        window.setTimeout(() => {
          forceSyncFromEngine();
        }, 0);
      }
    }, index * 10);
  });

  if (!inputs.length) isValidatingRef.current = false;
};

// =====================================================
// 🎥 EXTERNAL SCORER (Scolia-ready) — AJOUT UNIQUEMENT
// - En mode "external", on écoute des événements window et on pousse des darts dans le moteur.
// - IMPORTANT: on ne modifie rien au moteur, on appelle throwDart(input).
// - Events supportés:
//   - dc:x01v3:dart  -> { segment, multiplier }
//   - dc:x01v3:visit -> { darts: [{segment,multiplier}, ...] } (max 3)
// =====================================================
React.useEffect(() => {
  if (typeof window === "undefined") return;
  if (scoringSource !== "external") return;

  // Si c'est un tour BOT, ou qu'on rejoue un autosave, on ignore les events externes
  if (isBotTurn) return;

  const onDart = (ev: any) => {
    try {
      const detail = ev?.detail;
      const dart = normalizeExternalDart(detail);
      if (!dart) return;

      // ✅ alimente l’UI "dernière volée" (1→3 fléchettes) pour la PlayersListOnly
      const pid = activePlayerId as string;
      const uiDart: UIDart = {
        v: dart.segment === 25 ? 25 : dart.segment,
        mult: dart.multiplier as 1 | 2 | 3,
      } as any;

      setLastVisitsByPlayer((m) => {
        const prev = m[pid] ?? [];
        const next = [...prev, uiDart].slice(-3);
        return { ...m, [pid]: next };
      });

      // 🔓 audio (si le bridge arrive via click/stream, on tente quand même)
      ensureAudioUnlockedNow();

      // On force un refresh UI via le moteur (moteur-driven)
      currentThrowFromEngineRef.current = true;

      // SFX minimal (optionnel)
      try {
        playHitSfx("dart_hit", { rateLimitMs: 40, volume: 0.55 });
      } catch {}

      // Pousse dans le moteur
      throwDart(dart);

      // Autosave + replay log
      replayDartsRef.current = replayDartsRef.current.concat([dart]);
      persistAutosave();
    } catch (e) {
      console.warn("[X01PlayV3] external dart failed", e);
    }
  };

  const onVisit = (ev: any) => {
    try {
      const detail = ev?.detail;
      const darts = normalizeExternalVisit(detail);
      if (!darts.length) return;

      // ✅ alimente l’UI "dernière volée" (3 fléchettes) pour la PlayersListOnly
      const pid = activePlayerId as string;
      const ui = darts.map(
        (d) =>
          ({
            v: d.segment === 25 ? 25 : d.segment,
            mult: d.multiplier as 1 | 2 | 3,
          }) as any
      ) as UIDart[];

      setLastVisitsByPlayer((m) => ({ ...m, [pid]: ui.slice(-3) }));

      ensureAudioUnlockedNow();

      // ✅ sons scores + voix (comme au keypad)
      try {
        const playerName = activePlayer?.name || profileById?.[pid as any]?.name || "Joueur";
        const scoreBefore = scores[pid] ?? config.startScore;

        const visitScore = darts.reduce((s: number, d: any) => {
          if (d.segment === 25 && d.multiplier === 2) return s + 50;
          return s + (d.segment || 0) * (d.multiplier || 1);
        }, 0);

        const isBustNow =
          scoreBefore - visitScore < 0 || ((outMode === "double" || outMode === "master") && scoreBefore - visitScore === 1);

        const remainingAfter = scoreBefore - visitScore;
        const lastD = ui[ui.length - 1];
        const lastIsDouble = !!lastD && (lastD.mult === 2 || (lastD.v === 25 && lastD.mult === 2));
        const lastIsTriple = !!lastD && lastD.mult === 3;

        const lastIsFinisher =
        (outMode === "double") ? lastIsDouble :
        (outMode === "master") ? (lastIsDouble || lastIsTriple) :
         true;

        const isCheckoutNow = !isBustNow && remainingAfter === 0 && lastIsFinisher;

        playScoreSfxAndMaybeDelayVoice({
          playerName,
          pid,
          scoreBefore,
          darts: ui,
          visitScore,
          isBustNow,
          isCheckoutNow,
        });

        // reset bust flag rouge
        setLastVisitIsBustByPlayer((m: Record<string, boolean>) => ({ ...m, [pid]: false }));
      } catch {}

      currentThrowFromEngineRef.current = true;

      // Petits SFX (1 par dart, sans spam)
      for (const d of darts) {
        try {
          playHitSfx("dart_hit", { rateLimitMs: 40, volume: 0.55 });
        } catch {}
        throwDart(d);
      }

      replayDartsRef.current = replayDartsRef.current.concat(darts);
      persistAutosave();
    } catch (e) {
      console.warn("[X01PlayV3] external visit failed", e);
    }
  };

  window.addEventListener(EXTERNAL_DART_EVENT, onDart as any);
  window.addEventListener(EXTERNAL_VISIT_EVENT, onVisit as any);

  return () => {
    window.removeEventListener(EXTERNAL_DART_EVENT, onDart as any);
    window.removeEventListener(EXTERNAL_VISIT_EVENT, onVisit as any);
  };
}, [
  scoringSource,
  isBotTurn,
  activePlayerId, // ✅ important sinon pid stale
  ensureAudioUnlockedNow,
  throwDart,
  persistAutosave,
  playHitSfx,
]);

  // =====================================================
  // STATS LIVE & MINI-RANKING
  // =====================================================


  // --- Baselines "per LEG" pour afficher M3D sur la leg en cours uniquement
  // liveStatsByPlayer cumule sur tout le match (dartsThrown/totalScore), donc on stocke un offset
  const legKey = `${(state as any).currentSet ?? 1}-${(state as any).currentLeg ?? 1}`;
  const legBaselineRef = React.useRef<{
  key: string;
  byPlayer: Record<string, { darts0: number; totalScore0: number }>;
}>({
  key: "",
  byPlayer: {},
});

React.useEffect(() => {
  if (legBaselineRef.current.key === legKey) return;

  const byPlayer: Record<string, { darts0: number; totalScore0: number }> = {};
  for (const p of players as any[]) {
    const pid = String((p as any)?.id || "");
    if (!pid) continue;
    const live: any = (liveStatsByPlayer as any)?.[pid] || {};
    byPlayer[pid] = {
      darts0: Number(live?.dartsThrown ?? 0),
      totalScore0: Number(live?.totalScore ?? 0),
    };
  }

  legBaselineRef.current = { key: legKey, byPlayer };
}, [legKey, players, liveStatsByPlayer]);

const avg3ByPlayer: Record<string, number> = React.useMemo(() => {
  const map: Record<string, number> = {};
  const base = legBaselineRef.current?.byPlayer || {};

  for (const p of players as any[]) {
    const pid = (p as any)?.id as any;
    const live: any = (liveStatsByPlayer as any)?.[pid] || {};

    const dartsTotal = Number(live?.dartsThrown ?? 0);
    const darts0 = Number(base?.[pid]?.darts0 ?? 0);
    const dartsLeg = Math.max(0, dartsTotal - darts0);

    if (!dartsLeg) {
      map[pid] = 0;
      continue;
    }

    // ✅ IMPORTANT:
    // - Solo/Multi: score du leg = startScore - score restant (scores reset à chaque leg)
    // - Teams: score restant est partagé => score du leg = delta de contribution individuelle (live.totalScore)
    const scoredLeg = isTeamsMode
      ? Math.max(0, Number(live?.totalScore ?? 0) - Number(base?.[pid]?.totalScore0 ?? 0))
      : Math.max(0, (config.startScore - (scores[pid] ?? config.startScore)));

    if (scoredLeg <= 0) {
      map[pid] = 0;
      continue;
    }

    map[pid] = (scoredLeg / dartsLeg) * 3;
  }

  return map;
}, [players, liveStatsByPlayer, scores, config.startScore, isTeamsMode]);

  const miniRanking: MiniRankingRow[] = React.useMemo(() => {
    return players
      .map((p: any) => {
        const pid = p.id as X01PlayerId;
        const avg3 = avg3ByPlayer[pid] ?? 0;
        return {
          id: pid,
          name: p.name,
          score: scores[pid] ?? config.startScore,
          legsWon: (state as any).legsWon?.[pid] ?? 0,
          setsWon: (state as any).setsWon?.[pid] ?? 0,
          avg3,
        };
      })
      .sort((a, b) => {
        // ✅ Classement de la LEG en cours : on trie uniquement sur le reste à faire
        if (a.score !== b.score) return a.score - b.score;
        // tie-break (soft) : meilleure moyenne sur la leg
        return (b.avg3 || 0) - (a.avg3 || 0);
      });
  }, [players, scores, state, config.startScore, avg3ByPlayer]);

  const liveRanking = React.useMemo(
    () => {
      // En TEAMS : mini-classement par équipes (pas par joueurs)
      if (isTeamsMode && Array.isArray(teamsView)) {
        return (teamsView as any[])
          .map((t: any) => ({
            id: String(t.id),
            name: String(t.name || "TEAM"),
            score: Number(t.score ?? config.startScore),
            color: String(t.color || "#ffcf57"),
          }))
          .sort((a: any, b: any) => a.score - b.score);
      }

      // Solo/Multi : mini-classement par joueurs
      return miniRanking.map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
      }));
    },
    [miniRanking, isTeamsMode, teamsView, config.startScore]
  );

  // Stats joueur actif
  const activeStats = activePlayer
    ? liveStatsByPlayer[activePlayer.id]
    : undefined;

  const curDarts = activeStats?.dartsThrown ?? 0;
  const curM3D = activePlayer
    ? (avg3ByPlayer[activePlayer.id] ?? 0).toFixed(2)
    : "0.00";
  const bestVisit = activeStats?.bestVisit ?? 0;

  // --- nouveaux compteurs live (garde pour Stats globales, pas affichés) ---
  const missCount =
    activeStats?.miss ??
    activeStats?.missCount ??
    activeStats?.misses ??
    0;

  const bustCount =
    activeStats?.bust ??
    activeStats?.bustCount ??
    activeStats?.busts ??
    0;

  const dBullCount =
    activeStats?.dBull ??
    activeStats?.doubleBull ??
    activeStats?.dBullCount ??
    0;

  const missPct =
    curDarts > 0 ? ((missCount / curDarts) * 100).toFixed(0) : "0";
  const bustPct =
    curDarts > 0 ? ((bustCount / curDarts) * 100).toFixed(0) : "0";
  const dBullPct =
    curDarts > 0 ? ((dBullCount / curDarts) * 100).toFixed(0) : "0";

  // =====================================================
  // Mesure header & keypad (pour scroll zone joueurs)
  // =====================================================

  const headerWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = React.useState(0);

  React.useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const measure = () =>
      setHeaderH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const keypadWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [keypadH, setKeypadH] = React.useState(0);

  React.useEffect(() => {
    const el = keypadWrapRef.current;
    if (!el) return;
    const measure = () =>
      setKeypadH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

   // =====================================================
  // Quitter / Rejouer / Résumé / Continuer
  // =====================================================

  function handleQuit() {
    // ✅ En quittant un match, on purge l'autosave pour éviter toute reprise "fantôme"
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTOSAVE_KEY);
        window.localStorage.removeItem(AUTOSAVE_KEY + ":resume");
      }
    } catch {}

    if (onExit) {
      onExit();
      return;
    }
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }

  // REJOUER même config : on relance l'écran avec la même config
  function handleReplaySameConfig() {
    // 🔁 Pour l’instant: reload complet de la page -> recrée un match X01V3
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }
  }

  // NOUVELLE PARTIE (retour écran de config)
  function handleReplayNewConfigInternal() {
    if (onReplayNewConfig) {
      onReplayNewConfig();
      return;
    }
    // fallback : on quitte
    handleQuit();
  }

  // RÉSUMÉ : on construit un LegStats à partir du moteur V3 + liveStats
  function handleShowSummary(_matchId: string) {
    try {
      const summaryRaw: any = (state as any)?.summary || {};
      const legStats = buildLegStatsFromV3LiveForOverlay(
        config,
        state as any,
        liveStatsByPlayer as any,
        scores as any,
        summaryRaw
      );

      setSummaryLegStats(legStats);
      setSummaryOpen(true);
    } catch (err) {
      console.warn("[X01PlayV3] failed to build LegStats for summary", err);
      // fallback : si jamais ça casse, on garde l'ancien comportement
      if (onShowSummary) {
        const id = _matchId || (state as any).matchId || "";
        onShowSummary(id);
      }
    }
  }

  // CONTINUER (3+ joueurs) : on laisse le moteur passer à la suite
  function handleContinueMulti() {
    startNextLeg();
  }

// =====================================================
// Sauvegarde du match dans l'Historique / Stats
// + 🔊 FIN DE MATCH : victoire + voix classement (respecte arcadeEnabled/voiceEnabled)
// =====================================================

React.useEffect(() => {
  if (status !== "match_end") return;
  if (hasSavedMatchRef.current) return;
  hasSavedMatchRef.current = true;

  // =====================================================
// 🔊 FIN DE MATCH : victoire + voix classement (langue + voiceId)
// =====================================================
try {
  // ✅ FIN DE MATCH : on préfère le classement final du moteur (summary.rankings)
  const summaryRankings = Array.isArray((state as any)?.summary?.rankings)
    ? ((state as any).summary.rankings as any[])
    : [];

  // 🔎 Classement "live" (leg en cours) : tri sur le reste à faire (score)
  // ✅ Utilisé pour le mini-classement header ET comme fallback voix IA
  const liveRankingNames: string[] = (liveRanking || miniRanking || [])
    .map((r: any) => r?.name)
    .filter(Boolean);

  const rankingNames: string[] = summaryRankings.length
    ? summaryRankings
        .map((r: any) => r?.name || r?.playerName || r?.displayName)
        .filter(Boolean)
    : liveRankingNames;

  const winnerId: string | null =
    (state as any)?.summary?.winnerId ||
    (state as any)?.lastWinnerId ||
    (state as any)?.lastWinningPlayerId ||
    null;

  const winnerFromPlayers: string | null = winnerId
    ? ((players as any[]) || []).find((p: any) => p?.id === winnerId)?.name || null
    : null;

  const winnerName: string =
    (state as any)?.summary?.winnerName ||
    winnerFromPlayers ||
    rankingNames[0] ||
    liveRankingNames[0] ||
    "Joueur";

  // ✅ Son "victory" UNIQUEMENT si "Sons Arcade" activés
  if (arcadeEnabled) {
    playArcadeMapped("victory", { rateLimitMs: 800, volume: 0.25 });
  }

  // ✅ Voix IA UNIQUEMENT si "Voix IA" activée
  if (voiceEnabled) {
    const opts = {
      voiceId: voiceId || undefined,
      lang: lang || "fr", // ← langue de l'app
    };

    try {
      // ✅ Signature étendue (recommandée) :
      // announceEndGame({ winnerName, rankingNames, extra? }, opts?)
      (announceEndGame as any)({ winnerName, rankingNames }, opts);
    } catch {
      try {
        // fallback : certaines versions ont (payload, opts?) mais sans voiceId
        announceEndGame({ winnerName, rankingNames } as any, { lang: opts.lang } as any);
      } catch {
        try {
          // fallback ultime : signature simple sans opts
          announceEndGame({ winnerName, rankingNames } as any);
        } catch {
          // ignore
        }
      }
    }
  }
} catch (e) {
  console.warn("[X01PlayV3] end-game sfx/voice failed", e);
}

  // =====================================================
  // Sauvegarde Historique / Stats
  // =====================================================
  try {
    saveX01V3MatchToHistory({
      config,
      state,
      scores,
      liveStatsByPlayer,
    });
  } catch (err) {
    console.warn("[X01PlayV3] saveX01V3MatchToHistory failed", err);
  }
}, [
  status,
  config,
  state,
  scores,
  liveStatsByPlayer,
  miniRanking,
  arcadeEnabled,
  voiceEnabled,
  voiceId,
  lang, // ✅ AJOUT
]);

  // =====================================================
  // BOT : tour auto si joueur courant est un BOT
  // =====================================================

  React.useEffect(() => {
    console.log("[X01PlayV3][BOT] effect run", {
      activePlayerId,
      activePlayerName: activePlayer?.name,
      isBotTurn,
      status,
      isReplaying: isReplayingRef.current,
    });

    // 0) Pendant la reprise depuis autosave, on NE JOUE PAS les bots
    if (isReplayingRef.current) {
      console.log("[X01PlayV3][BOT] stop: replaying autosave");
      return;
    }

    // 🛡️ Pendant un UNDO global déclenché par ANNULER,
    // on ne lance PAS une nouvelle volée de BOT.
    if (botUndoGuardRef.current) {
      console.log("[X01PlayV3][BOT] stop: undo in progress");
      return;
    }

    // 1) Si ce n'est pas un tour de BOT → on ne fait rien
    if (!isBotTurn || !activePlayer) {
      console.log("[X01PlayV3][BOT] stop: not bot turn", {
        isBotTurn,
        hasActivePlayer: !!activePlayer,
      });
      return;
    }

    // 2) Si on est en fin de manche / set / match → on ne joue pas
    if (
      status === "leg_end" ||
      status === "set_end" ||
      status === "match_end"
    ) {
      console.log("[X01PlayV3][BOT] stop: end status", { status });
      return;
    }

    const pid = activePlayer.id;
    const scoreNow = scores[pid] ?? config.startScore;
    const level = ((activePlayer as any).botLevel as BotLevel) ?? "easy";

    console.log("[X01PlayV3][BOT] scheduling bot visit", {
      pid,
      name: activePlayer.name,
      scoreNow,
      level,
    });

    const timeout = window.setTimeout(() => {
      console.log("[X01PlayV3][BOT] timeout fired", {
        activePlayerId,
        status,
      });

      // on relit le joueur courant AU MOMENT DU TIR
      const currentActive = players.find(
        (p: any) => p.id === activePlayerId
      );
      const stillBot =
        !!currentActive && Boolean((currentActive as any).isBot);

      if (!stillBot) {
        console.log(
          "[X01PlayV3][BOT] abort: no longer bot active",
          { currentActiveName: currentActive?.name }
        );
        return;
      }

      if (
        status === "leg_end" ||
        status === "set_end" ||
        status === "match_end"
      ) {
        console.log(
          "[X01PlayV3][BOT] abort: status changed to end",
          { status }
        );
        return;
      }

      const visit = computeBotVisit(level, scoreNow, outMode);
      console.log("[X01PlayV3][BOT] visit computed", visit);

      // UI : mémorise la volée du BOT
      setLastVisitsByPlayer((m) => ({
        ...m,
        [pid]: visit,
      }));

      // Transforme la volée en inputs V3
      const inputs: X01DartInputV3[] = visit.map((d) => {
        if (d.v <= 0) {
          // MISS
          return { segment: 0, multiplier: 1 };
        }
        return {
          segment: d.v === 25 ? 25 : d.v,
          multiplier: d.mult as 1 | 2 | 3,
        };
      });

      // Joue TOUTE la volée (3 darts)
      inputs.forEach((input) => {
        throwDart(input);
      });

      // Autosave : on enregistre aussi les volées des bots
      replayDartsRef.current = replayDartsRef.current.concat(inputs);
      persistAutosave();
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    isBotTurn,
    activePlayer,
    activePlayerId,
    status,
    scores,
    config.startScore,
    doubleOut,
    players,
    throwDart,
    persistAutosave,
  ]);

  // =====================================================
  // Rendu principal : UI du "beau" X01Play
  // =====================================================

// =====================================================
// Layout spécial : PAYSAGE TABLETTE
// - HEADER pleine largeur en haut
// - 2 blocs côte à côte en dessous (sans scroll global)
//   * Gauche : Player + Score + Liste joueurs (liste scrollable interne)
//   * Droite : Mode de saisie (Keypad / Cible / Voice) + boutons inchangés
// - OVERLAYS inclus DANS le return (sinon JSX cassé)
// =====================================================

if (isLandscapeTablet) {
  return (
    <div
      className={`x01play-container theme-${theme.id} w-full flex flex-col`}
      style={{
        height: "100svh",
        minHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* HEADER : pleine largeur */}
      <div
        ref={headerWrapRef}
        style={{
          position: "relative",
          zIndex: 60,
          width: "100%",
          paddingInline: 12,
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            position: "relative",
          }}
        >
          <BackDot onClick={handleQuit} size={40} />

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {useSetsUi && (
              <div
                style={{
                  position: "absolute",
                  right: 14,
                  top: 10,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.35)",
                  boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
                  fontSize: 12,
                  color: "#ffd36a",
                }}
              >
                {setsTarget > 1 ? `Set ${state.currentSet}/${setsTarget} • ` : ""}
                {`Leg ${state.currentLeg}/${legsTarget}`}
              </div>
            )}

                        {/* Scoreboard SET/LEG (même rendu que SOLO) */}
            {useSetsUi && isTeamsMode && teamsView && (teamsView as any[]).length >= 2 ? (
              (teamsView as any[]).length === 2 ? (
                <DuelHeaderCompact
                  leftAvatarUrl={((teamsView as any[])[0]?.avatarUrl as string) ?? ""}
                  rightAvatarUrl={((teamsView as any[])[1]?.avatarUrl as string) ?? ""}
                  leftSets={(state as any).teamSetsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                  rightSets={(state as any).teamSetsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                  leftLegs={(state as any).teamLegsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                  rightLegs={(state as any).teamLegsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                />
              ) : (
                <TeamsHeaderCompact
                  teams={teamsView as any[]}
                  teamLegsWon={(state as any).teamLegsWon ?? {}}
                  teamSetsWon={(state as any).teamSetsWon ?? {}}
                />
              )
            ) : (
              isDuel && useSetsUi && (
                <DuelHeaderCompact
                  leftAvatarUrl={profileById[players[0].id]?.avatarDataUrl ?? ""}
                  rightAvatarUrl={profileById[players[1].id]?.avatarDataUrl ?? ""}
                  leftSets={(state as any).setsWon?.[players[0].id] ?? 0}
                  rightSets={(state as any).setsWon?.[players[1].id] ?? 0}
                  leftLegs={(state as any).legsWon?.[players[0].id] ?? 0}
                  rightLegs={(state as any).legsWon?.[players[1].id] ?? 0}
                />
              )
            )}
          </div>

          <SetLegChip
            currentSet={(state as any).currentSet ?? 1}
            currentLegInSet={(state as any).currentLeg ?? 1}
            setsTarget={setsTarget}
            legsTarget={legsTarget}
            useSets={useSetsUi}
          />
        </div>
      </div>

      {/* MAIN : 2 colonnes sans scroll global */}
      <div
        style={
          isTabletUi
            ? {
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                padding: 12,
                overflow: "hidden",
                alignItems: "stretch",
              }
            : {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch" as any,
              }
        }
      >
        {/* GAUCHE : Player+Score + Liste joueurs (scroll interne) */}
        <div style={
          isTabletUi
            ? { display: "flex", flexDirection: "column", overflow: "hidden" }
            : { display: "flex", flexDirection: "column", gap: 8 }
        }>
          <div style={{ flex: "0 0 auto" }}>
            {isTeamsMode && activeTeam ? (
            <TeamHeaderBlock
              teamColor={activeTeam.color}
              teamName={activeTeam.name}
              teamPlayers={activeTeam.players}
              activePlayerId={activePlayerId}
              teamScore={activeTeam.score}
              currentThrow={currentThrow}
              liveRanking={liveRanking}
              curDarts={curDarts}
              curM3D={curM3D}
              bestVisit={bestVisit}
              useSets={useSetsUi}
              teamLegsWon={(state as any).teamLegsWon ?? {}}
              teamSetsWon={(state as any).teamSetsWon ?? {}}
              teamId={activeTeam.id}
              checkoutText={checkoutText}
            showThrowCounter={showThrowCounter}
            />
          ) : (
            <HeaderBlock
              currentPlayer={activePlayer}
              currentAvatar={activePlayer ? profileById[activePlayer.id]?.avatarDataUrl ?? null : null}
              currentRemaining={currentScore}
              currentThrow={currentThrow}
              doubleOut={doubleOut}
              liveRanking={liveRanking}
              curDarts={curDarts}
              curM3D={curM3D}
              bestVisit={bestVisit}
              legsWon={(state as any).legsWon ?? {}}
              setsWon={(state as any).setsWon ?? {}}
              useSets={useSetsUi}
              checkoutText={checkoutText}
            showThrowCounter={showThrowCounter}
            />
          )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingTop: 10 }}>
            {isTeamsMode && teamsView ? (
            <TeamsPlayersList
              cameraOpen={cameraOpen}
              setCameraOpen={setCameraOpen}
              teams={teamsView}
              activePlayerId={activePlayerId}
              profileById={profileById}
              liveStatsByPlayer={liveStatsByPlayer}
              start={config.startScore}
              scoresByPlayer={scores}
              useSets={useSetsUi}
              lastVisitsByPlayer={lastVisitsByPlayer}
              lastVisitIsBustByPlayer={lastVisitIsBustByPlayer}
              avg3ByPlayer={avg3ByPlayer}
            />
          ) : (
            <PlayersListOnly
              cameraOpen={cameraOpen}
              setCameraOpen={setCameraOpen}
              players={players}
              profileById={profileById}
              liveStatsByPlayer={liveStatsByPlayer}
              start={config.startScore}
              scoresByPlayer={scores}
              legsWon={(state as any).legsWon ?? {}}
              setsWon={(state as any).setsWon ?? {}}
              useSets={useSetsUi}
              lastVisitsByPlayer={lastVisitsByPlayer}
              lastVisitIsBustByPlayer={lastVisitIsBustByPlayer}
              avg3ByPlayer={avg3ByPlayer}
            />
          )}
          </div>
        </div>

        {/* DROITE : Mode de saisie (inchangé, mais dans le flow) */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "visible",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}>
          <div style={{ flex: "0 0 auto", overflow: "visible" }}>
            <div
              ref={keypadWrapRef}
              style={{
                position: "relative",
                inset: 0,
                zIndex: 45,
                width: "100%",
                minHeight: 0,
                height: "auto",
                maxHeight: isTabletUi ? "100%" : "none",
              }}
            >
              {isBotTurn ? (
                <div
                  style={{
                    padding: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(180deg, rgba(10,10,12,.9), rgba(6,6,8,.95))",
                    textAlign: "center",
                    fontSize: 13,
                    color: "#e3e6ff",
                    boxShadow: "0 10px 24px rgba(0,0,0,.5)",
                  }}
                >
                  🤖 {activePlayer?.name ?? t("x01v3.bot.name", "BOT")}{" "}
                  {t("x01v3.bot.playing", "joue son tour...")}
                </div>
              ) : scoringSource === "external" ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(180deg, rgba(10,10,12,.9), rgba(6,6,8,.95))",
                    textAlign: "center",
                    fontSize: 13,
                    color: "#e3e6ff",
                    boxShadow: "0 10px 24px rgba(0,0,0,.5)",
                  }}
                >
                  🎥 {t("x01v3.external.title", "Comptage externe en cours…")}
                  <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 6 }}>
                    {t(
                      "x01v3.external.hint",
                      "Les fléchettes sont injectées automatiquement (Scolia/bridge)."
                    )}
                  </div>

                  {canUseCameraAssisted && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        style={{
                          height: 40,
                          borderRadius: 14,
                          padding: "0 14px",
                          border: "1px solid rgba(255,255,255,0.14)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))",
                          color: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                          boxShadow: "0 10px 24px rgba(0,0,0,.5)",
                        }}
                      >
                        {t("x01v3.camera.open", "Ouvrir Caméra")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: isBustLocked ? "1px solid rgba(255,80,80,.65)" : "1px solid transparent",
                    background: isBustLocked ? "rgba(120,0,0,.10)" : "transparent",
                    borderRadius: 14,
                    padding: 6,
                    height: isTabletUi ? "100%" : "auto",
                    boxSizing: "border-box",
                  }}
                >
                  {isBustLocked ? (
                    <div
                      style={{
                        marginBottom: 6,
                        textAlign: "center",
                        fontWeight: 900,
                        letterSpacing: 0.6,
                        color: "#ff6b6b",
                        textShadow: "0 0 14px rgba(255,90,90,.35)",
                      }}
                    >
                      BUST — {t("x01v3.bust.lock", "Saisie bloquée")}
                    </div>
                  ) : null}

                  {voiceScoreEnabled &&
                  scoringSource !== "external" &&
                  voiceScore.phase !== "OFF" &&
                  !isBotTurn ? (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: "8px 10px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.25)",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
                          {voiceScore.phase.startsWith("LISTEN")
                            ? t("x01v3.voiceScore.listening", "Micro : écoute...")
                            : voiceScore.phase === "RECAP_CONFIRM"
                            ? t("x01v3.voiceScore.confirm", "Confirmer : oui / non")
                            : t("x01v3.voiceScore.active", "Commande vocale")}
                        </div>

                        <button
                          type="button"
                          onClick={() => voiceScore.stop()}
                          style={{
                            borderRadius: 12,
                            padding: "6px 10px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                            flex: "0 0 auto",
                          }}
                        >
                          {t("common.stop", "Stop")}
                        </button>
                      </div>

                      {voiceScore.lastHeard ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                          {t("x01v3.voiceScore.heard", "Entendu")}: {voiceScore.lastHeard}
                        </div>
                      ) : null}

                      {voiceScore.dartsLabel ? (
                        <div style={{ marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                          {t("x01v3.voiceScore.rec", "Saisie")}: {voiceScore.dartsLabel}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    style={{
                      pointerEvents:
                        voiceScoreEnabled &&
                        scoringSource !== "external" &&
                        (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                          ? "none"
                          : "auto",
                      opacity:
                        voiceScoreEnabled &&
                        scoringSource !== "external" &&
                        (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                          ? 0.55
                          : 1,
                      filter:
                        voiceScoreEnabled &&
                        scoringSource !== "external" &&
                        (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                          ? "grayscale(.15)"
                          : "none",
                      height: "100%",
                    }}
                  >
                    <ScoreInputHub
                      currentThrow={currentThrow}
                      multiplier={multiplier}
                      onSimple={handleSimple}
                      onDouble={handleDouble}
                      onTriple={handleTriple}
                      onBackspace={handleBackspace}
                      onCancel={handleCancel}
                      onNumber={handleNumber}
                      onBull={handleBull}
                      onValidate={validateThrow}
                      onDirectDart={handleDirectDart}
                      hidePreview
                      showPlaceholders={false}
                      disabled={isBustLocked}
                      switcherMode="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAYS (inchangés) */}
      <X01LegOverlayV3
        open={status === "leg_end" || status === "set_end" || status === "match_end"}
        status={status}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
        onExitMatch={handleQuit}
        onReplaySameConfig={handleReplaySameConfig}
        onReplayNewConfig={handleReplayNewConfigInternal}
        onShowSummary={handleShowSummary}
        onContinueMulti={players.length >= 3 ? handleContinueMulti : undefined}
      />

      <EndOfLegOverlay
        open={summaryOpen && !!summaryLegStats}
        result={summaryLegStats}
        playersById={summaryPlayersById}
        onClose={() => setSummaryOpen(false)}
        onReplay={handleReplaySameConfig}
      />
    </div>
  );
}

  return (
    <div
      className={`x01play-container theme-${theme.id}`}
      // 100dvh = évite l'effet "aplati" quand la barre navigateur mobile change la hauteur utile.
      style={{
        height: "100svh",
        minHeight: "100svh",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
      }}
    >
      {/* ✅ MEP: Layout unifié (Header + Profil Actif + Joueurs modal + Volée + Saisie) */}
      <GameplayLayout
        title=""
        onBack={handleQuit}
        showInfo={false}
        topRightExtra={isTabletUi ? (
          <SetLegChip
                currentSet={(state as any).currentSet ?? 1}
                currentLegInSet={(state as any).currentLeg ?? 1}
                setsTarget={setsTarget}
                legsTarget={legsTarget}
                useSets={useSetsUi}
              />
        ) : null}
        headerCenter={!isTabletUi ? (
          <div ref={headerWrapRef} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                {useSetsUi && isTeamsMode && teamsView && (teamsView as any[]).length >= 2 ? (
                  (teamsView as any[]).length === 2 ? (
                    <DuelHeaderCompact
                      leftAvatarUrl={((teamsView as any[])[0]?.avatarUrl as string) ?? ""}
                      rightAvatarUrl={((teamsView as any[])[1]?.avatarUrl as string) ?? ""}
                      leftSets={(state as any).teamSetsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                      rightSets={(state as any).teamSetsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                      leftLegs={(state as any).teamLegsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                      rightLegs={(state as any).teamLegsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                    />
                  ) : (
                    <TeamsHeaderCompact
                      teams={teamsView as any[]}
                      teamLegsWon={(state as any).teamLegsWon ?? {}}
                      teamSetsWon={(state as any).teamSetsWon ?? {}}
                    />
                  )
                ) : (
                  isDuel &&
                  useSetsUi && (
                    <DuelHeaderCompact
                      leftAvatarUrl={profileById[players[0].id]?.avatarDataUrl ?? ""}
                      rightAvatarUrl={profileById[players[1].id]?.avatarDataUrl ?? ""}
                      leftSets={(state as any).setsWon?.[players[0].id] ?? 0}
                      rightSets={(state as any).setsWon?.[players[1].id] ?? 0}
                      leftLegs={(state as any).legsWon?.[players[0].id] ?? 0}
                      rightLegs={(state as any).legsWon?.[players[1].id] ?? 0}
                    />
                  )
                )}
              </div>

              <SetLegChip
                currentSet={(state as any).currentSet ?? 1}
                currentLegInSet={(state as any).currentLeg ?? 1}
                setsTarget={setsTarget}
                legsTarget={legsTarget}
                useSets={useSetsUi}
              />
            </div>
          </div>
        
        ) : null}
        activeProfileHeader={
          <div style={{ maxWidth: CONTENT_MAX, margin: "0 auto" }}>
            {isTabletUi ? (
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                {useSetsUi && isTeamsMode && teamsView && (teamsView as any[]).length >= 2 ? (
                  (teamsView as any[]).length === 2 ? (
                    <DuelHeaderCompact
                      leftAvatarUrl={((teamsView as any[])[0]?.avatarUrl as string) ?? ""}
                      rightAvatarUrl={((teamsView as any[])[1]?.avatarUrl as string) ?? ""}
                      leftSets={(state as any).teamSetsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                      rightSets={(state as any).teamSetsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                      leftLegs={(state as any).teamLegsWon?.[((teamsView as any[])[0]?.id as any)] ?? 0}
                      rightLegs={(state as any).teamLegsWon?.[((teamsView as any[])[1]?.id as any)] ?? 0}
                    />
                  ) : (
                    <TeamsHeaderCompact
                      teams={teamsView as any[]}
                      teamLegsWon={(state as any).teamLegsWon ?? {}}
                      teamSetsWon={(state as any).teamSetsWon ?? {}}
                    />
                  )
                ) : (
                  isDuel &&
                  useSetsUi && (
                    <DuelHeaderCompact
                      leftAvatarUrl={profileById[players[0].id]?.avatarDataUrl ?? ""}
                      rightAvatarUrl={profileById[players[1].id]?.avatarDataUrl ?? ""}
                      leftSets={(state as any).setsWon?.[players[0].id] ?? 0}
                      rightSets={(state as any).setsWon?.[players[1].id] ?? 0}
                      leftLegs={(state as any).legsWon?.[players[0].id] ?? 0}
                      rightLegs={(state as any).legsWon?.[players[1].id] ?? 0}
                    />
                  )
                )}
              </div>
              </div>
            ) : null}

            {isTeamsMode && activeTeam ? (
              <TeamHeaderBlock
                teamColor={activeTeam.color}
                teamId={activeTeam.id}
                teamName={activeTeam.name}
                teamPlayers={activeTeam.players}
                activePlayerId={activePlayerId}
                teamScore={activeTeam.score}
                currentThrow={currentThrow}
                liveRanking={liveRanking}
                curDarts={curDarts}
                curM3D={curM3D}
                bestVisit={bestVisit}
                useSets={useSetsUi}
                teamLegsWon={(state as any).teamLegsWon ?? {}}
                teamSetsWon={(state as any).teamSetsWon ?? {}}
                checkoutText={checkoutText}
              showThrowCounter={showThrowCounter}
            />
            ) : (
              <HeaderBlock
                currentPlayer={activePlayer}
                currentAvatar={
                  activePlayer
                    ? profileById[activePlayer.id]?.avatarDataUrl ?? null
                    : null
                }
                currentRemaining={currentScore}
                currentThrow={currentThrow}
                doubleOut={doubleOut}
                liveRanking={liveRanking}
                curDarts={curDarts}
                curM3D={curM3D}
                bestVisit={bestVisit}
                legsWon={(state as any).legsWon ?? {}}
                setsWon={(state as any).setsWon ?? {}}
                useSets={useSetsUi}
                checkoutText={checkoutText}
              showThrowCounter={showThrowCounter}
            />
            )}
          </div>
        }
        playersRowLabel="JOUEURS"
        // ⚠️ Identité visuelle : le ticker X01 doit rester en fond du bandeau JOUEURS.
        playersBannerImage={tickerX01}
        playersPanelTitle="Joueurs"
        playersRowRight={
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              border: `2px solid ${themePrimary}`,
              color: themePrimary,
              background: "rgba(0,0,0,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900,
              boxShadow: `0 0 14px ${themePrimary}55`,
            }}
          >
            {Array.isArray(players) ? players.length : 0}
          </span>
        }
        playersPanel={
          <div style={{ padding: "6px 4px" }}>
            {isTeamsMode && teamsView ? (
              <TeamsPlayersList
                cameraOpen={cameraOpen}
                setCameraOpen={setCameraOpen}
                teams={teamsView}
                activePlayerId={activePlayerId}
                profileById={profileById}
                liveStatsByPlayer={liveStatsByPlayer}
                start={config.startScore}
                scoresByPlayer={scores}
                useSets={useSetsUi}
                lastVisitsByPlayer={lastVisitsByPlayer}
                lastVisitIsBustByPlayer={lastVisitIsBustByPlayer}
                avg3ByPlayer={avg3ByPlayer}
              />
            ) : (
              <PlayersListOnly
                cameraOpen={cameraOpen}
                setCameraOpen={setCameraOpen}
                players={players}
                profileById={profileById}
                liveStatsByPlayer={liveStatsByPlayer}
                start={config.startScore}
                scoresByPlayer={scores}
                legsWon={(state as any).legsWon ?? {}}
                setsWon={(state as any).setsWon ?? {}}
                useSets={useSetsUi}
                lastVisitsByPlayer={lastVisitsByPlayer}
                lastVisitIsBustByPlayer={lastVisitIsBustByPlayer}
                avg3ByPlayer={avg3ByPlayer}
              />
            )}
          </div>
        }
        volleyInputDisplay={null}
        inputModes={
          <div
            ref={keypadWrapRef}
            style={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column", paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}
          >
            {isBotTurn ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(10,10,12,.9), rgba(6,6,8,.95))",
              textAlign: "center",
              fontSize: 13,
              color: "#e3e6ff",
              boxShadow: "0 10px 24px rgba(0,0,0,.5)",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            🤖 {activePlayer?.name ?? t("x01v3.bot.name", "BOT")}{" "}
            {t("x01v3.bot.playing", "joue son tour...")}
          </div>
        ) : scoringSource === "external" ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(10,10,12,.9), rgba(6,6,8,.95))",
              textAlign: "center",
              fontSize: 13,
              color: "#e3e6ff",
              boxShadow: "0 10px 24px rgba(0,0,0,.5)",
            }}
          >
            🎥 {t("x01v3.external.title", "Comptage externe en cours…")}
            <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 6 }}>
              {t(
                "x01v3.external.hint",
                "Les fléchettes sont injectées automatiquement (Scolia/bridge)."
              )}
            {canUseCameraAssisted && (
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  style={{
                    height: 40,
                    borderRadius: 14,
                    padding: "0 14px",
                    border: `1px solid rgba(255,255,255,0.14)`,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))`,
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: `0 10px 24px rgba(0,0,0,.5)`,
                  }}
                >
                  {t("x01v3.camera.open", "Ouvrir Caméra") }
                </button>
              </div>
            )}

            </div>
          </div>
        ) : (
          <div
            style={{
              border: isBustLocked ? "1px solid rgba(255,80,80,.65)" : "1px solid transparent",
              background: isBustLocked ? "rgba(120,0,0,.10)" : "transparent",
              borderRadius: 14,
              padding: 6,
              boxShadow: isBustLocked ? "0 0 0 1px rgba(255,80,80,.25), 0 10px 24px rgba(0,0,0,.45)" : undefined,
              filter: isBustLocked ? "grayscale(.25) saturate(.9)" : undefined,
              opacity: isBustLocked ? 0.92 : 1,
            }}
          >
            {isBustLocked ? (
              <div
                style={{
                  marginBottom: 6,
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  color: "#ff6b6b",
                  textShadow: "0 0 14px rgba(255,90,90,.35)",
                }}
              >
                BUST — {t("x01v3.bust.lock", "Saisie bloquée")}
              </div>
            ) : null}

          {voiceScoreEnabled && scoringSource !== "external" && voiceScore.phase !== "OFF" && !isBotTurn && (
            <div
              style={{
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
                  {voiceScore.phase.startsWith("LISTEN")
                    ? t("x01v3.voiceScore.listening", "Micro : écoute...")
                    : voiceScore.phase === "RECAP_CONFIRM"
                    ? t("x01v3.voiceScore.confirm", "Confirmer : oui / non")
                    : t("x01v3.voiceScore.active", "Commande vocale")}
                </div>
                <button
                  type="button"
                  onClick={() => voiceScore.stop()}
                  style={{
                    borderRadius: 12,
                    padding: "6px 10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  {t("common.stop", "Stop")}
                </button>
              </div>
              {voiceScore.lastHeard ? (
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  {t("x01v3.voiceScore.heard", "Entendu")}: {voiceScore.lastHeard}
                </div>
              ) : null}
              {voiceScore.dartsLabel ? (
                <div style={{ marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  {t("x01v3.voiceScore.rec", "Saisie")}: {voiceScore.dartsLabel}
                </div>
              ) : null}
            </div>
          )}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              pointerEvents:
                voiceScoreEnabled && scoringSource !== "external" && (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                  ? "none"
                  : "auto",
              opacity:
                voiceScoreEnabled && scoringSource !== "external" && (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                  ? 0.55
                  : 1,
              filter:
                voiceScoreEnabled && scoringSource !== "external" && (voiceScore.phase.startsWith("LISTEN") || voiceScore.phase === "RECAP_CONFIRM")
                  ? "grayscale(.15)"
                  : "none",
            }}
          >
            <ScoreInputHub
              currentThrow={currentThrow}
              multiplier={multiplier}
              onSimple={handleSimple}
              onDouble={handleDouble}
              onTriple={handleTriple}
              onBackspace={handleBackspace}
              onCancel={handleCancel}
              onNumber={handleNumber}
              onBull={handleBull}
              onValidate={validateThrow}
              onDirectDart={handleDirectDart}
              hidePreview
              showPlaceholders={false}
              disabled={isBustLocked}
              // ✅ UX: pas de dropdown, modes visibles, et auto-fit pour que le keypad ne force JAMAIS un scroll.
              switcherMode="inline"
              fitToParent
            />
          </div>
          </div>
        )}
          </div>
        }
      />

      {/* OVERLAY FIN DE MANCHE / SET / MATCH (V3) */}
      <X01LegOverlayV3
        open={
          status === "leg_end" ||
          status === "set_end" ||
          status === "match_end"
        }
        status={status}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
        onExitMatch={handleQuit}
        onReplaySameConfig={handleReplaySameConfig}
        onReplayNewConfig={handleReplayNewConfigInternal}
        onShowSummary={handleShowSummary}
        onContinueMulti={players.length >= 3 ? handleContinueMulti : undefined}
      />

      {/* OVERLAY RÉSUMÉ — gros tableau + graphs */}
      <EndOfLegOverlay
        open={summaryOpen && !!summaryLegStats}
        result={summaryLegStats}
        playersById={summaryPlayersById}
        onClose={() => setSummaryOpen(false)}
        onReplay={handleReplaySameConfig}
      />
    </div>
  );
}

// =============================================================
// Sous-composants UI (repris du beau X01Play, adaptés V3)
// =============================================================

function HeaderBlock(props: HeaderBlockProps) {
  const {
    currentPlayer,
    currentAvatar,
    currentRemaining,
    currentThrow,
    doubleOut, // pas encore utilisé
    liveRanking,
    curDarts,
    curM3D,
    bestVisit,
    useSets,
    legsWon,
    setsWon,
    checkoutText,
    showThrowCounter = false,
  } = props;

  const legsWonThisSet =
    (currentPlayer && legsWon[currentPlayer.id]) ?? 0;
  const setsWonTotal =
    (currentPlayer && setsWon[currentPlayer.id]) ?? 0;

  const remainingAfterAll = Math.max(
    currentRemaining -
      currentThrow.reduce(
        (s: number, d: UIDart) => s + dartValue(d),
        0
      ),
    0
  );

  // =====================================================
  // SOLO avatar en fond — sur toute la carte (fade à gauche)
  // même concept que le logo TEAM en mode TEAMS
  // =====================================================
  const bgAvatarUrl = currentAvatar || null;

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
            {/* Dégradé gauche -> droite pour fondre le logo dans le fond (≈ 3/4 de la carte) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 28%, rgba(10,10,12,.62) 52%, rgba(10,10,12,.22) 68%, rgba(10,10,12,0) 80%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* AVATAR + STATS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              background:
                "linear-gradient(180deg,#1b1b1f,#111114)",
              boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            }}
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#999",
                  fontWeight: 700,
                }}
              >
                ?
              </div>
            )}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
              color: "#ffcf57",
            }}
          >
            {currentPlayer?.name ?? "—"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#d9dbe3",
            }}
          >
            {liveRanking?.length ? (
              <>
                Leader : <b>{liveRanking[0]?.name}</b>
              </>
            ) : null}
          </div>

          {/* Mini card stats joueur actif */}
          <div
            style={{
              ...miniCard,
              width: 176,
              height: "auto",
              padding: 7,
            }}
          >
            <div style={miniText}>
              <div>
                Meilleure volée : <b>{bestVisit}</b>
              </div>
              <div>
                Moy/3D : <b>{curM3D}</b>
              </div>
              <div>
                Darts jouées : <b>{curDarts}</b>
              </div>
              {showThrowCounter && currentThrow.length > 0 ? (
                <div>
                  Volée : <b>{currentThrow.length}/3</b>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* SCORE + PASTILLES + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* BG ancré AU SCORE (centre = centre du 501) */}
          {!!bgAvatarUrl && (
            <img
              src={bgAvatarUrl}
              aria-hidden
              style={{
                position: "absolute",
                top: "40%",
                left: "60%",
                transform: "translate(-50%, -50%)",
                height: "250%",
                width: "auto",
                WebkitMaskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,1) 69%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,1) 69%, rgba(0,0,0,1) 100%)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",

                opacity: 0.22,
                filter:
                  "saturate(1.35) contrast(1.18) brightness(1.08) drop-shadow(-10px 0 26px rgba(0,0,0,.55))",
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* SCORE CENTRAL */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              position: "relative",
              zIndex: 2,
              color: "#ffcf57",
              textShadow: "0 4px 18px rgba(255,195,26,.25)",
              lineHeight: 1.02,
            }}
          >
            {remainingAfterAll}
          </div>

          {/* Pastilles live */}
          <div
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];

              const wouldBust =
                currentRemaining -
                  currentThrow
                    .slice(0, i + 1)
                    .reduce(
                      (s: number, x: UIDart) => s + dartValue(x),
                      0
                    ) <
                0;

              const st = chipStyle(d, wouldBust);

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 40,
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: st.border as string,
                    background: st.background as string,
                    color: st.color as string,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {fmt(d)}
                </span>
              );
            })}
          </div>

          {/* Checkout suggestion (moteur V3) */}
          {checkoutText ? (
            <div
              style={{
                marginTop: 3,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: 5,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.08)",
                  background:
                    "radial-gradient(120% 120% at 50% 0%, rgba(255,195,26,.10), rgba(30,30,34,.95))",
                  minWidth: 170,
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,187,51,.4)",
                    background: "rgba(255,187,51,.12)",
                    color: "#ffc63a",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    fontSize: 13,
                  }}
                >
                  {checkoutText}
                </span>
              </div>
            </div>
          ) : null}

          {/* Mini ranking */}
          <div
            style={{
              ...miniCard,
              alignSelf: "center",
              width: "min(310px,100%)",
              height: "auto",
              padding: 6,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                maxHeight: 3 * 26,
                overflow: liveRanking.length > 3 ? "auto" : "visible",
              }}
            >
              {liveRanking.map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <div style={{ ...miniRankName, color: (r as any).color || miniRankName.color }}>
                    {i + 1}. {r.name}
                  </div>
                  <div
                    style={
                      r.score === 0
                        ? miniRankScoreFini
                        : miniRankScore
                    }
                  >
                    {r.score === 0 ? "FINI" : r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function TeamHeaderBlock(props: {
  teamColor?: string;
  teamId: string;
  teamName: string;
  teamPlayers: Array<{ id: string; name: string; avatar: string | null; isActive: boolean }>;
  activePlayerId: string;
  teamScore: number;
  currentThrow: UIDart[];
  liveRanking: { id: string; name: string; score: number }[];
  curDarts: number;
  curM3D: string;
  bestVisit: number;
  useSets: boolean;
  teamLegsWon: Record<string, number>;
  teamSetsWon: Record<string, number>;
  checkoutText: string | null;
  showThrowCounter?: boolean;
}) {
  // =====================================================
  // Team logo (fond) — derrière le score (TEAMS only)
  // =====================================================
  const guessTeamSkin = (
    name: string,
    id: string,
    colorHex?: string
  ): "pink" | "gold" | "blue" | "green" => {
    const n = String(name || "").toLowerCase();
    const i = String(id || "").toLowerCase();
    const c = String(colorHex || "").toLowerCase();

    const has = (k: string) => n.includes(k) || i.includes(k);

    if (has("pink") || has("rose") || c.includes("ff4f") || c.includes("ff2") || c.includes("d8")) return "pink";
    if (has("gold") || has("or") || has("yellow") || c.includes("ffb") || c.includes("ffc") || c.includes("d3")) return "gold";
    if (has("blue") || has("bleu") || c.includes("18a0") || c.includes("00f") || c.includes("2d") || c.includes("4f")) return "blue";
    if (has("green") || has("vert") || c.includes("00e") || c.includes("0e") || c.includes("76") || c.includes("2ecc")) return "green";
    return "gold";
  };
  const {
    teamColor,
    teamId,
    teamName,
    teamPlayers,
    activePlayerId,
    teamScore,
    currentThrow,
    liveRanking,
    curDarts,
    curM3D,
    bestVisit,
    useSets,
    teamLegsWon,
    teamSetsWon,
    checkoutText,
    showThrowCounter = false,
  } = props;

  const color = teamColor || "#ffcf57";

  const teamLogoUrl = React.useMemo(() => {
    const skin = guessTeamSkin(teamName, teamId, teamColor);
    return getTeamAvatarUrl(skin as any);
  }, [teamName, teamId, teamColor]);

  const active = teamPlayers.find((p) => p.id === activePlayerId) || teamPlayers[0];

  const legsWonThisSet = teamLegsWon?.[teamId] ?? 0;
  const setsWonTotal = teamSetsWon?.[teamId] ?? 0;

  const remainingAfterAll = Math.max(
    (teamScore ?? 0) -
      currentThrow.reduce((s: number, d: UIDart) => s + dartValue(d), 0),
    0
  );

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BG TEAM sur toute la carte (meme rendu que SOLO) */}
      {!!teamLogoUrl && (
        <img
          src={teamLogoUrl}
          aria-hidden
          style={{
            position: "absolute",
            top: "44%",
            left: "72%",
            transform: "translate(-50%, -50%)",
            height: "150%",
            width: "auto",
            opacity: 0.14,
            filter: "saturate(1.20) contrast(1.10) brightness(1.06) drop-shadow(-8px 0 22px rgba(0,0,0,.55))",
            WebkitMaskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 62%, rgba(0,0,0,1) 100%)",
            maskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 62%, rgba(0,0,0,1) 100%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        />
      )}

            {/* Dégradé côté gauche (fondre le logo sur ~3/4) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 28%, rgba(10,10,12,.55) 54%, rgba(10,10,12,0) 78%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* TEAM MEDALLIONS + STATS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          {/* Medaillons superposés */}
          <div style={{ position: "relative", width: 112, height: 96 }}>
            {teamPlayers.slice(0, 4).map((p, i) => {
              const isActive = p.id === activePlayerId;
              const size = isActive ? 86 : 76;
              const left = 8 + i * 14;
              const top = isActive ? 4 : 10;
              const z = isActive ? 50 : 10 + i;

              return (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "linear-gradient(180deg,#1b1b1f,#111114)",
                    boxShadow: isActive
                      ? "0 0 0 2px rgba(255,195,26,.45), 0 10px 26px rgba(255,195,26,.18)"
                      : "0 6px 18px rgba(0,0,0,.35)",
                    transform: isActive ? "scale(1.00)" : "scale(.98)",
                    zIndex: z,
                    border: "1px solid rgba(255,255,255,.10)",
                  }}
                >
                  {p.avatar ? (
                    <img
                      src={p.avatar}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#999",
                        fontWeight: 700,
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
              color,
              textAlign: "center",
            }}
          >
            {active?.name ?? "—"}
          </div>

          {null}

          <div style={{ ...miniCard, width: 176, height: "auto", padding: 7 }}>
            <div style={miniText}>
              <div>
                Meilleure volée : <b>{bestVisit}</b>
              </div>
              <div>
                Moy/3D : <b>{curM3D}</b>
              </div>
              <div>
                Darts jouées : <b>{curDarts}</b>
              </div>
              {showThrowCounter && currentThrow.length > 0 ? (
                <div>
                  Volée : <b>{currentThrow.length}/3</b>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* SCORE + PASTILLES + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color,
              textShadow: "0 4px 18px rgba(0,0,0,.35)",
              lineHeight: 1.02,
              position: "relative",
              zIndex: 2,
            }}
          >
            {remainingAfterAll}
          </div>

          {/* Nom d'équipe AU-DESSUS du score (gain de place + cohérence) */}
          <div
            style={{
              marginTop: -6,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 0.3,
              color,
              textTransform: "uppercase",
              opacity: 0.95,
              position: "relative",
              zIndex: 2,
            }}
          >
            {teamName}
          </div>

          <div
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];
              const wouldBust =
                (teamScore ?? 0) -
                  currentThrow
                    .slice(0, i + 1)
                    .reduce((s: number, x: UIDart) => s + dartValue(x), 0) <
                0;

              const st = chipStyle(d, wouldBust);

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 40,
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: st.border as string,
                    background: st.background as string,
                    color: st.color as string,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {fmt(d)}
                </span>
              );
            })}
          </div>

          {checkoutText ? (
            <div style={{ marginTop: 3, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: 5,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.08)",
                  background:
                    "radial-gradient(120% 120% at 50% 0%, rgba(255,195,26,.10), rgba(30,30,34,.95))",
                  minWidth: 170,
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,187,51,.4)",
                    background: "rgba(255,187,51,.12)",
                    color: "#ffc63a",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    fontSize: 13,
                  }}
                >
                  {checkoutText}
                </span>
              </div>
            </div>
          ) : null}

          {/* Mini ranking (inchangé) */}
          <div
            style={{
              ...miniCard,
              alignSelf: "center",
              width: "min(310px,100%)",
              height: "auto",
              padding: 6,
            }}
          >
            <div
              style={{
                maxHeight: 3 * 26,
                overflow: liveRanking.length > 3 ? "auto" : "visible",
              }}
            >
              {liveRanking.map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <div style={{ ...miniRankName, color: (r as any).color || miniRankName.color }}>
                    {i + 1}. {r.name}
                  </div>
                  <div style={r.score === 0 ? miniRankScoreFini : miniRankScore}>
                    {r.score === 0 ? "FINI" : r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamsPlayersList(props: {
  cameraOpen: boolean;
  setCameraOpen: (v: boolean) => void;
  teams: any[];
  activePlayerId: string;
  profileById: Record<string, { avatarDataUrl: string | null; name: string }>;
  liveStatsByPlayer: Record<string, any>;
  start: number;
  scoresByPlayer: Record<string, number>;
  useSets: boolean;
  lastVisitsByPlayer: Record<string, UIDart[]>;
  lastVisitIsBustByPlayer: Record<string, boolean>;
  avg3ByPlayer: Record<string, number>;
}) {
  const {
    cameraOpen,
    setCameraOpen,
    teams,
    activePlayerId,
    profileById,
    liveStatsByPlayer,
    start,
    scoresByPlayer,
    lastVisitsByPlayer,
    lastVisitIsBustByPlayer,
    avg3ByPlayer,
  } = props;

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.85))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 9,
        marginBottom: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      }}
    >
      {teams.map((team: any) => {
        const teamColor = team?.color || "#ffcf57";
        const anchorId: string | undefined =
          Array.isArray(team?.playerIds) && team.playerIds.length
            ? String(team.playerIds[0])
            : Array.isArray(team?.players) && team.players.length
            ? String((team.players[0] as any)?.id || "")
            : undefined;

        const teamScore = anchorId ? scoresByPlayer[anchorId] ?? start : start;

        return (
          <div
            key={team.id}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.08)",
              background:
                "linear-gradient(180deg, rgba(28,28,32,.55), rgba(18,18,20,.55))",
              padding: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div style={{ fontWeight: 900, color: teamColor }}>
                {team.name}
              </div>
              <div style={{ fontWeight: 900, color: teamScore === 0 ? "#7fe2a9" : teamColor }}>
                {teamScore === 0 ? "FINI" : teamScore}
              </div>
            </div>

            {(team.players || []).map((p: any) => {
              const prof = profileById[p.id];
              const avatarSrc = prof?.avatarDataUrl ?? null;
              const live = liveStatsByPlayer[p.id];

              const dCount: number = live?.dartsThrown ?? 0;
              const a3d =
                dCount > 0 ? (avg3ByPlayer[p.id] ?? 0).toFixed(2) : "0.00";

              const isActive = p.id === activePlayerId;
              const score = scoresByPlayer[p.id] ?? start;

              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 9px",
                    borderRadius: 12,
                    background: isActive
                      ? "linear-gradient(180deg, rgba(255,195,26,.14), rgba(18,18,20,.65))"
                      : "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
                    border: isActive
                      ? "1px solid rgba(255,195,26,.35)"
                      : "1px solid rgba(255,255,255,.07)",
                    marginBottom: 5,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "rgba(255,255,255,.06)",
                    }}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#999",
                        }}
                      >
                        ?
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: teamColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>

                      {renderLastVisitChips(p.id, lastVisitsByPlayer, (lastVisitIsBustByPlayer as any)?.[p.id])}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#cfd1d7", marginTop: 2 }}>
                      Darts: {dCount} • Moy/3D: {a3d}
                    </div>
                  </div>

                  {/* Contribution joueur -> équipe (volées + points marqués) */}
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: 90,
                      fontSize: 11.5,
                      lineHeight: 1.15,
                      color: "#d9dbe3",
                    }}
                  >
                    <div style={{ fontWeight: 900, color: teamColor }}>
                      Volées: {Number(live?.visits ?? 0)}
                    </div>
                    <div style={{ fontWeight: 800, opacity: 0.95 }}>
                      Points: {Number(live?.totalScore ?? 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Caméra assistée overlay (dartsmind-like UX) */}
      <CameraAssistedOverlay
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDart={(d) => {
          try {
            if (typeof window === "undefined") return;
            window.dispatchEvent(
              new CustomEvent("dc:x01v3:dart", {
                detail: { segment: d.segment, multiplier: d.multiplier === 0 ? 1 : d.multiplier },
              })
            );
          } catch (e) {
            console.warn("[X01PlayV3] camera dispatch failed", e);
          }
        }}
      />
    </div>
  );
}


function PlayersListOnly(props: {
  cameraOpen: boolean;
  setCameraOpen: (v: boolean) => void;
  players: any[];
  profileById: Record<string, { avatarDataUrl: string | null; name: string }>;
  liveStatsByPlayer: Record<string, any>;
  start: number;
  scoresByPlayer: Record<string, number>;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  useSets: boolean;
  lastVisitsByPlayer: Record<string, UIDart[]>;
  lastVisitIsBustByPlayer: Record<string, boolean>;
  avg3ByPlayer: Record<string, number>;
}) {
  const {
    cameraOpen,
    setCameraOpen,
    players,
    profileById,
    liveStatsByPlayer,
    start,
    scoresByPlayer,
    legsWon,
    setsWon,
    useSets,
    lastVisitsByPlayer,
    lastVisitIsBustByPlayer,
    avg3ByPlayer,
  } = props;


  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.85))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 9,
        marginBottom: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      }}
    >
      {players.map((p: any) => {
        const prof = profileById[p.id];
        const avatarSrc = prof?.avatarDataUrl ?? null;
        const live = liveStatsByPlayer[p.id];

        const dCount: number = live?.dartsThrown ?? 0;
        const a3d =
          dCount > 0 ? (avg3ByPlayer[p.id] ?? 0).toFixed(2) : "0.00";

        const score = scoresByPlayer[p.id] ?? start;
        const legsWonThisSet = legsWon?.[p.id] ?? 0;
        const setsWonTotal = setsWon?.[p.id] ?? 0;

        const isBot = !!(p as any).isBot;
        const level = (p as any).botLevel as BotLevel;

        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 9px",
              borderRadius: 12,
              background:
                "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
              border: "1px solid rgba(255,255,255,.07)",
              marginBottom: 5,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(255,255,255,.06)",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#999",
                  }}
                >
                  ?
                </div>
              )}
            </div>

            {/* Bloc central */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: "#ffcf57",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                  {isBot && (
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        color: "#9fa4ff",
                        fontWeight: 700,
                      }}
                    >
                      · BOT {(level || "easy").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Pastilles dernière volée */}
                {renderLastVisitChips(p.id, lastVisitsByPlayer, (lastVisitIsBustByPlayer as any)?.[p.id])}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#cfd1d7",
                  marginTop: 2,
                }}
              >
                Darts: {dCount} • Moy/3D: {a3d}
              </div>
              {null}

            </div>

            {/* Score */}
            <div
              style={{
                fontWeight: 900,
                color: score === 0 ? "#7fe2a9" : "#ffcf57",
              }}
            >
              {score}
            </div>
          </div>
        );
      })}
    
      {/* Caméra assistée overlay (dartsmind-like UX) */}
      <CameraAssistedOverlay
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDart={(d) => {
          try {
            if (typeof window === "undefined") return;
            window.dispatchEvent(new CustomEvent("dc:x01v3:dart", { detail: { segment: d.segment, multiplier: d.multiplier === 0 ? 1 : d.multiplier } }));
          } catch (e) {
            console.warn("[X01PlayV3] camera dispatch failed", e);
          }
        }}
      />
</div>
  );
}


// =====================================================
// ✅ Header compact SET/LEG — MODE TEAMS (2 à 4 équipes)
// - Si 2 équipes : on utilise DuelHeaderCompact au-dessus.
// - Si 3/4 équipes : on affiche une rangée d’avatars + micro KPIs Sets/Legs.
// =====================================================
function TeamsHeaderCompact({
  teams,
  teamLegsWon,
  teamSetsWon,
}: {
  teams: Array<{ id: string; name: string; color: string; players: Array<{ avatar: string | null }> }>;
  teamLegsWon: Record<string, number>;
  teamSetsWon: Record<string, number>;
}) {
  const shown = (teams || []).slice(0, 4);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingInline: 8,
      }}
    >
      {shown.map((t) => {
        const avatar = (t as any)?.players?.[0]?.avatar ?? "";
        const sets = teamSetsWon?.[String(t.id)] ?? 0;
        const legs = teamLegsWon?.[String(t.id)] ?? 0;
        return (
          <div
            key={String(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minWidth: 44,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: `2px solid ${t.color || "rgba(255,255,255,0.22)"}`,
                background: "rgba(0,0,0,0.35)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                overflow: "hidden",
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={t.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                fontSize: 11,
                lineHeight: 1,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.72)" }}>{sets}S</span>
              <span style={{ color: "#ffd36a" }}>{legs}L</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetLegChip(props: {
  currentSet: number;
  currentLegInSet: number;
  setsTarget: number;
  legsTarget: number;
  useSets: boolean;
}) {
  const { currentSet, currentLegInSet, setsTarget, legsTarget, useSets } =
    props;

  const st: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 9px",
    border: "1px solid rgba(255,200,80,.35)",
    background:
      "linear-gradient(180deg, rgba(255,195,26,.12), rgba(30,30,34,.95))",
    color: "#ffcf57",
    fontWeight: 800,
    fontSize: 11.5,
    boxShadow: "0 6px 18px rgba(255,195,26,.15)",
    whiteSpace: "nowrap",
    borderRadius: 999,
  };

  if (!useSets) {
    return (
      <span style={st}>
        <span>
          Leg {currentLegInSet}/{legsTarget}
        </span>
      </span>
    );
  }

  return (
    <span style={st}>
      <span>
        Set {currentSet}/{setsTarget}
      </span>
      <span style={{ opacity: 0.6 }}>•</span>
      <span>
        Leg {currentLegInSet}/{legsTarget}
      </span>
    </span>
  );
}

// =============================================================
// Bridge X01 V3 -> Historique / Stats
// =============================================================

type X01V3HistoryPayload = {
  config: X01ConfigV3;
  state: any;
  scores: Record<string, number>;
  liveStatsByPlayer: Record<string, any>;
};

/* -------------------------------------------------------------
   Helpers : extraction des stats détaillées depuis liveStatsByPlayer
   Objectif : hitsS / hitsD / hitsT / miss / bull / dBull / bust
   + bySegmentS / bySegmentD / bySegmentT
------------------------------------------------------------- */

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function cloneNumberMap(obj: any | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) {
      out[String(k)] = n;
    }
  }
  return out;
}

function extractSegmentMapsFromLive(live: any) {
  // 1) Si on a déjà bySegmentS/D/T, on les clone tels quels
  let bySegmentS = cloneNumberMap(
    live?.bySegmentS ?? live?.segmentsS ?? live?.hitsBySegmentS
  );
  let bySegmentD = cloneNumberMap(
    live?.bySegmentD ?? live?.segmentsD ?? live?.hitsBySegmentD
  );
  let bySegmentT = cloneNumberMap(
    live?.bySegmentT ?? live?.segmentsT ?? live?.hitsBySegmentT
  );

  // 2) Fallback : structure combinée { [seg]: {S,D,T} }
  const combined =
    live?.bySegment ??
    live?.segmentHits ??
    live?.segmentsAll ??
    undefined;

  if (combined && typeof combined === "object") {
    for (const [segStr, entry] of Object.entries(combined)) {
      const segKey = String(segStr);
      if (!entry || typeof entry !== "object") continue;
      const e: any = entry;
      const s = numOr0(e.S, e.s, e.single, e.singles);
      const d = numOr0(e.D, e.d, e.double, e.doubles);
      const t = numOr0(e.T, e.t, e.triple, e.triples);
      if (s) bySegmentS[segKey] = (bySegmentS[segKey] || 0) + s;
      if (d) bySegmentD[segKey] = (bySegmentD[segKey] || 0) + d;
      if (t) bySegmentT[segKey] = (bySegmentT[segKey] || 0) + t;
    }
  }

  return { bySegmentS, bySegmentD, bySegmentT };
}

function extractDetailedStatsFromLive(live: any) {
  const hitsS = numOr0(
    live?.hitsS,
    live?.S,
    live?.singles,
    live?.hitsSingle
  );
  const hitsD = numOr0(
    live?.hitsD,
    live?.D,
    live?.doubles,
    live?.hitsDouble
  );
  const hitsT = numOr0(
    live?.hitsT,
    live?.T,
    live?.triples,
    live?.hitsTriple
  );

  const miss = numOr0(
    live?.miss,
    live?.misses,
    live?.missCount,
    live?.nbMiss
  );
  const bull = numOr0(
    live?.bull,
    live?.bulls,
    live?.bullHits,
    live?.hitsBull
  );
  const dBull = numOr0(
    live?.dBull,
    live?.doubleBull,
    live?.dbulls,
    live?.bullDoubleHits
  );
  const bust = numOr0(
    live?.bust,
    live?.busts,
    live?.bustCount,
    live?.nbBust
  );

  let darts = numOr0(
    live?.dartsThrown,
    live?.darts,
    live?.totalDarts
  );
  if (!darts) {
    // fallback minimal si pas de compteur global
    darts = hitsS + hitsD + hitsT + miss;
  }

  const { bySegmentS, bySegmentD, bySegmentT } =
    extractSegmentMapsFromLive(live);

  return {
    darts,
    hitsS,
    hitsD,
    hitsT,
    miss,
    bull,
    dBull,
    bust,
    bySegmentS,
    bySegmentD,
    bySegmentT,
  };
}

/* -------------------------------------------------------------
   Sauvegarde X01 V3 dans l'Historique
   - summary : toutes les stats utiles pour StatsHub / X01Multi
   - payload : VERSION LÉGÈRE (sans engineState ni liveStatsByPlayer)
     => évite les erreurs de quota
------------------------------------------------------------- */

function saveX01V3MatchToHistory({
  config,
  state,
  scores,
  liveStatsByPlayer,
}: X01V3HistoryPayload) {
  const players = config.players || [];

  const matchId =
    state?.matchId ||
    `x01v3-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const createdAt = state?.createdAt || Date.now();

  // -------------------------
  // Maps compatibles Summary
  // -------------------------
  const avg3ByPlayer: Record<string, number> = {};
  const bestVisitByPlayer: Record<string, number> = {};
  const bestCheckoutByPlayer: Record<string, number> = {};
  const perPlayer: any[] = [];
  const detailedByPlayer: Record<string, any> = {};

  // -------------------------
  // Maps pour reconstruire un LegacyLegResult (summary.legacy)
  // -------------------------
  const legacyRemaining: Record<string, number> = {};
  const legacyDarts: Record<string, number> = {};
  const legacyVisits: Record<string, number> = {};
  const legacyAvg3: Record<string, number> = {};
  const legacyBestVisit: Record<string, number> = {};
  const legacyBestCheckout: Record<string, number> = {};
  const legacyDoubles: Record<string, number> = {};
  const legacyTriples: Record<string, number> = {};
  const legacyBulls: Record<string, number> = {};
  const legacyDbulls: Record<string, number> = {};
  const legacyMiss: Record<string, number> = {};
  const legacyBust: Record<string, number> = {};
  const legacyPoints: Record<string, number> = {};
  const legacyHitsBySector: Record<string, Record<string, number>> = {};

  let winnerId: string | null = null;

  // -------------------------
  // Stats détaillées par joueur
  // -------------------------
  for (const p of players as any[]) {
    const pid = p.id as string;
    const live = (liveStatsByPlayer && liveStatsByPlayer[pid]) || {};
    const startScore = config.startScore ?? 501;
    const scoreNow = scores[pid] ?? startScore;
    const scored = startScore - scoreNow;

    const dartsThrown = live.dartsThrown ?? live.darts ?? 0;

    let avg3 = 0;
    if (dartsThrown > 0 && scored > 0) {
      avg3 = (scored / dartsThrown) * 3;
    }

    const bestVisit = live.bestVisit ?? 0;
    const bestCheckout = live.bestCheckout ?? 0;

    avg3ByPlayer[pid] = avg3;
    bestVisitByPlayer[pid] = bestVisit;
    bestCheckoutByPlayer[pid] = bestCheckout;

    // 🔍 Stats détaillées (hits S/D/T, miss, bull, etc.)
    const detail = extractDetailedStatsFromLive(live);
    detailedByPlayer[pid] = detail;

    // Reformatage compatible V2/V1 pour StatsHub et tous les dashboards
    const segments = {
      S: detail.bySegmentS,
      D: detail.bySegmentD,
      T: detail.bySegmentT,
    };

    const hits = {
      S: detail.hitsS,
      D: detail.hitsD,
      T: detail.hitsT,
      M: detail.miss,
    };

    perPlayer.push({
      playerId: pid,
      dartSetId: (p as any).dartSetId ?? null,
      dartPresetId: (p as any).dartPresetId ?? null,
    
      avg3,
      bestVisit,
      bestCheckout,
      darts: detail.darts,
      hits,
      bull: detail.bull,
      dBull: detail.dBull,
      bust: detail.bust,
      segments,
    });

    // -------------------------
    // Remplissage des maps "legacy" pour l'écran Historique détaillé
    // -------------------------
    legacyRemaining[pid] = scoreNow;
    legacyDarts[pid] = detail.darts;
    legacyVisits[pid] = detail.darts ? Math.ceil(detail.darts / 3) : 0;
    legacyAvg3[pid] = avg3;
    legacyBestVisit[pid] = bestVisit;
    legacyBestCheckout[pid] = bestCheckout;

    legacyDoubles[pid] = detail.hitsD;
    legacyTriples[pid] = detail.hitsT;
    legacyBulls[pid] = (detail.bull ?? 0) + (detail.dBull ?? 0);
    legacyDbulls[pid] = detail.dBull ?? 0;
    legacyMiss[pid] = detail.miss ?? 0;
    legacyBust[pid] = detail.bust ?? 0;
    legacyPoints[pid] = scored > 0 ? scored : 0;

    // hits par secteur combinés (S + D + T + BULL / DBULL + MISS)
    const sectorMap: Record<string, number> = {};

    for (const [seg, v] of Object.entries(detail.bySegmentS || {})) {
      const k = String(seg);
      sectorMap[k] = (sectorMap[k] || 0) + Number(v || 0);
    }
    for (const [seg, v] of Object.entries(detail.bySegmentD || {})) {
      const k = String(seg);
      sectorMap[k] = (sectorMap[k] || 0) + Number(v || 0);
    }
    for (const [seg, v] of Object.entries(detail.bySegmentT || {})) {
      const k = String(seg);
      sectorMap[k] = (sectorMap[k] || 0) + Number(v || 0);
    }

    if (detail.bull) {
      sectorMap["OB"] = (sectorMap["OB"] || 0) + detail.bull;
    }
    if (detail.dBull) {
      sectorMap["IB"] = (sectorMap["IB"] || 0) + detail.dBull;
    }
    if (detail.miss) {
      sectorMap["MISS"] = (sectorMap["MISS"] || 0) + detail.miss;
    }

    legacyHitsBySector[pid] = sectorMap;

    // Gagnant simple : score à 0
    if (scoreNow === 0 && !winnerId) {
      winnerId = pid;
    }
  }

  // -------------------------
  // On récupère ce que le moteur a déjà mis dans state.summary :
  // - rankings (avec legsWon / setsWon)
  // - game (legsPerSet / setsToWin / startScore...)
  // - winnerName éventuel
  // -------------------------
  const engineSummary: any = (state as any).summary || {};
  const rankings = Array.isArray(engineSummary.rankings)
    ? engineSummary.rankings
    : [];

  const engineGame = engineSummary.game || {};

  const winnerName =
    engineSummary.winnerName ||
    (players.find((p: any) => p.id === winnerId)?.name ?? null);

  // -------------------------
  // EXTRACTION LEGS / SETS / SCORE FINAL
  // -------------------------

  // maps issus de l'état moteur (souvent "dernier set")
  const legsMapState = (state as any).legsWon ?? {};
  const setsMapState = (state as any).setsWon ?? {};

  const legsByPlayer: Record<string, number> = {};
  const setsByPlayer: Record<string, number> = {};
  const legsPlayedByPlayer: Record<string, number> = {};
  const setsPlayedByPlayer: Record<string, number> = {};

  // Base : ce que dit l'état moteur
  players.forEach((p: any) => {
    const pid = p.id as string;
    legsByPlayer[pid] = Number(legsMapState[pid] ?? 0);
    setsByPlayer[pid] = Number(setsMapState[pid] ?? 0);
  });

  // Enrichissement avec engineSummary.rankings (totaux legs/sets gagnés + joués)
  for (const r of rankings as any[]) {
    const pid =
      r.playerId ?? r.id ?? r.pid ?? r.player_id ?? undefined;
    if (!pid) continue;

    // legs gagnés / perdus / joués
    const legsWon = numOr0(
      r.legsWon,
      r.legs_won,
      r.legs,
      r.wonLegs,
      r.legs_for
    );
    const legsLost = numOr0(
      r.legsLost,
      r.legs_lost,
      r.legsAgainst,
      r.lostLegs,
      r.legs_against
    );
    const legsPlayed = numOr0(
      r.legsPlayed,
      r.legs_played,
      legsWon + legsLost
    );

    // sets gagnés / perdus / joués
    const setsWon = numOr0(
      r.setsWon,
      r.sets_won,
      r.sets,
      r.wonSets,
      r.sets_for
    );
    const setsLost = numOr0(
      r.setsLost,
      r.sets_lost,
      r.setsAgainst,
      r.lostSets,
      r.sets_against
    );
    const setsPlayed = numOr0(
      r.setsPlayed,
      r.sets_played,
      setsWon + setsLost
    );

    // On prend le max entre ce que dit l'état et ce que dit le ranking
    if (legsWon > (legsByPlayer[pid] ?? 0)) {
      legsByPlayer[pid] = legsWon;
    }
    if (setsWon > (setsByPlayer[pid] ?? 0)) {
      setsByPlayer[pid] = setsWon;
    }

    if (legsPlayed > 0) {
      legsPlayedByPlayer[pid] = legsPlayed;
    }
    if (setsPlayed > 0) {
      setsPlayedByPlayer[pid] = setsPlayed;
    }

    // On pousse aussi ces infos dans detailedByPlayer pour usage futur
    detailedByPlayer[pid] = {
      ...(detailedByPlayer[pid] || {}),
      legsWonTotal: legsWon,
      legsPlayedTotal: legsPlayed,
      setsWonTotal: setsWon,
      setsPlayedTotal: setsPlayed,
    };
  }

  // Score final DUEL (ex : 2–1)
  let matchScore: { [pid: string]: number } = {};
  if (players.length === 2) {
    matchScore = {
      [players[0].id]: setsByPlayer[players[0].id] || 0,
      [players[1].id]: setsByPlayer[players[1].id] || 0,
    };
  } else {
    // multi-joueurs : classement par sets puis legs
    const sorted = [...players].sort((a, b) => {
      const sa = setsByPlayer[a.id] ?? 0;
      const sb = setsByPlayer[b.id] ?? 0;
      if (sb !== sa) return sb - sa;
      const la = legsByPlayer[a.id] ?? 0;
      const lb = legsByPlayer[b.id] ?? 0;
      return lb - la;
    });

    matchScore = {};
    sorted.forEach((p, idx) => {
      matchScore[p.id] = idx + 1; // 1er / 2e / 3e...
    });
  }

  // -------------------------
  // Objet legacy compatible avec l'ancien écran détaillé X01
  // -------------------------
  const legacy: any = {
    legNo: 1,
    winnerId,
    finishedAt: createdAt,
    remaining: legacyRemaining,
    darts: legacyDarts,
    visits: legacyVisits,
    avg3: legacyAvg3,
    bestVisit: legacyBestVisit,
    bestCheckout: legacyBestCheckout,
    doubles: legacyDoubles,
    triples: legacyTriples,
    bulls: legacyBulls,
    dbulls: legacyDbulls,
    misses: legacyMiss,
    busts: legacyBust,
    points: legacyPoints,
    hitsBySector: legacyHitsBySector,
    // Les buckets 60+/100+/140+/180 ne sont pas reconstruits ici,
    // ils resteront à 0 faute de détail par volée (option future).
  };

  // -------------------------
  // Summary.players : shape attendu par X01End / buildPerPlayerMetrics
  // -------------------------
  const summaryPlayers: Record<string, any> = {};
  for (const p of players as any[]) {
    const pid = p.id as string;
    const darts = legacyDarts[pid] || 0;
    const visits = legacyVisits[pid] || (darts ? Math.ceil(darts / 3) : 0);
    const points = legacyPoints[pid] || 0;

    summaryPlayers[pid] = {
      id: pid,
      name: p.name,
      avg3: avg3ByPlayer[pid] ?? 0,
      bestVisit: bestVisitByPlayer[pid] ?? 0,
      bestCheckout: bestCheckoutByPlayer[pid] ?? 0,
      darts,
      visits,
      _sumPoints: points,
      _sumDarts: darts,
      _sumVisits: visits || undefined,
      matches: 1,
      legs: legsPlayedByPlayer[pid] || 1,
      buckets: {},
      updatedAt: createdAt,
    };
  }

  const summary = {
    ...engineSummary,

    kind: "x01" as const,
    matchId,

    game: {
      ...engineGame,
      mode: "x01",
      startScore: config.startScore,
      legsPerSet: config.legsPerSet ?? null,
      setsToWin: config.setsToWin ?? null,
    },

    rankings,
    winnerName,

    updatedAt: createdAt,

    // nouvelle map players (utilisée en priorité par X01End)
    players: summaryPlayers,

    // Alias compat pour les anciens agrégateurs
    legsWon: legsByPlayer,
    setsWon: setsByPlayer,
    legsScore: legsByPlayer,
    setsScore: setsByPlayer,

    // 🔥 AJOUTS CRITIQUES POUR X01 MULTI
    legsByPlayer,
    setsByPlayer,
    legsPlayedByPlayer,
    setsPlayedByPlayer,
    matchScore,

    // Stats détaillées multi-joueurs
    avg3ByPlayer,
    bestVisitByPlayer,
    bestCheckoutByPlayer,
    perPlayer,
    detailedByPlayer,

    // Compatibilité rétro : l'ancien shape utilisé par History / LEO
    legacy,
  };

  // -------------------------
  // QUICK STATS PROFILS (dc-quick-stats pour ProfileStarRing)
  // -------------------------
  try {
    // On considère tout le match comme un "leg" global pour les quick-stats
    StatsBridge
      .commitLegAndAccumulate({ perPlayer }, legacy)
      .catch((err) => {
        console.warn(
          "[X01PlayV3] commitLegAndAccumulate failed",
          err
        );
      });
  } catch (err) {
    console.warn(
      "[X01PlayV3] quick-stats error (sync wrapper)",
      err
    );
  }

  // -------------------------
  // Payload "léger" pour l'historique
  // -------------------------

  const lightPlayers = players.map((p: any) => ({
    id: p.id,
    name: p.name,
    profileId: p.profileId ?? null,
    isBot: !!p.isBot,
    botLevel: p.botLevel ?? null,
    avatarDataUrl: p.avatarDataUrl ?? null,
  
    // ✅ IMPORTANT : set de fléchettes associé
    dartSetId: p.dartSetId ?? null, // ex: "myset-123"
    dartPresetId: p.dartPresetId ?? null, // optionnel si tu utilises aussi les presets
  }));

  const lightConfig: X01ConfigV3 = {
    ...config,
    players: lightPlayers as any,
  };

  // ✅ DartSets: méta unifiée pour StatsHub / agrégateurs
  // - dartSetIdsByPlayer: map { playerId -> dartSetId }
  // - dartSetId: set global si tous identiques (sinon null)
  const dartSetIdsByPlayer: Record<string, string | null> = {};
  for (const p of lightPlayers as any[]) {
    dartSetIdsByPlayer[String(p?.id)] = (p as any)?.dartSetId ?? null;
  }
  const uniqueDartSetIds = Array.from(
    new Set(Object.values(dartSetIdsByPlayer).filter((v) => !!v))
  ) as string[];
  const dartSetIdGlobal = uniqueDartSetIds.length === 1 ? uniqueDartSetIds[0] : null;

  // Détermine un mode compatible avec les anciens agrégateurs
  const isSolo = players.length === 1;
  const hasTeams =
    Array.isArray((config as any).teams) &&
    (config as any).teams.length > 0;

  let gameMode: "x01_solo" | "x01_multi" | "x01_teams" = "x01_multi";
  if (isSolo) gameMode = "x01_solo";
  else if (hasTeams) gameMode = "x01_teams";

  const payload = {
    mode: gameMode, // "x01_solo" | "x01_multi" | "x01_teams"
    variant: "x01_v3",
    game: "x01",
    startScore: config.startScore,
    matchId, // 🧷 idem summary
    resumeId: matchId,
    config: lightConfig,
    finalScores: scores,

    // ✅ compat dartsets (lecture simple côté agrégateurs)
    dartSetId: dartSetIdGlobal,
    meta: {
      dartSetId: dartSetIdGlobal,
      dartSetIdsByPlayer,
    },

    // 🔥 ICI on enregistre les maps "totales" (et plus juste le dernier set)
    legsWon: legsByPlayer,
    setsWon: setsByPlayer,
  };

  // -------------------------
  // Record History (léger)
  // -------------------------
  const record: any = {
    id: matchId,
    resumeId: matchId, // pour matchLink() dans HistoryPage
    kind: "x01",
    status: "finished",
    createdAt,
    updatedAt: createdAt,
    // ✅ compat dartsets (lecture simple)
    dartSetId: dartSetIdGlobal,
    players: lightPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      profileId: (p as any).profileId ?? null,
      avatarDataUrl: p.avatarDataUrl,
      dartSetId: p.dartSetId ?? null,
      dartPresetId: p.dartPresetId ?? null,
    })),
    winnerId,
    summary,
    payload,
  };

  try {
    // 1) 🟡 Met à jour le sac "dc-quick-stats" utilisé par Profils / centre de stats
    //    On construit un petit legacy minimal compatible avec StatsBridge.commitLegAndAccumulate
    const quickLegacy: any = {
      order: (players as any[]).map((p) => p.id as string),
      winnerId,

      remaining: legacyRemaining,
      darts: legacyDarts,
      visits: legacyVisits,
      points: legacyPoints,

      avg3: legacyAvg3,
      bestVisit: legacyBestVisit,
      bestCheckout: legacyBestCheckout,

      // ces champs ne sont pas utilisés par commitLegAndAccumulate,
      // mais on les passe pour rester compatibles avec le type LegacyMaps
      h60: {},
      h100: {},
      h140: {},
      h180: {},

      miss: legacyMiss,
      missPct: {},
      bust: legacyBust,
      bustPct: {},
      dbull: legacyDbulls,
      dbullPct: {},

      doubles: legacyDoubles,
      triples: legacyTriples,
      bulls: legacyBulls,
    };

    // 🔥 met à jour dc-quick-stats (games, darts, avg3, bestVisit, bestCheckout, wins)
    StatsBridge.commitLegAndAccumulate?.(null, quickLegacy);

    // 2) 🟢 Sauvegarde "lourde" dans l'historique (IndexedDB + fallback LS)
    History.upsert(record);
  } catch (err) {
    console.warn(
      "[X01PlayV3] History/StatsBridge save failed",
      err
    );
  }
}
