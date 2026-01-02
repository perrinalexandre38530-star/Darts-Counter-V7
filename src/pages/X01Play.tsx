// ============================================
// src/pages/X01Play.tsx (OPTION A CLEAN)
// Wrapper (snapshot) + X01Core (moteur + UI)
// + AUTOSAVE propre
// + Nouveau LegBannerModal (unique)
// + Suppression complète de EndBanner / ContinueModal
// ============================================

import React from "react";
import { useX01Engine } from "../hooks/useX01Engine";
import Keypad from "../components/Keypad";
import EndOfLegOverlay from "../components/EndOfLegOverlay";
import { playSound } from "../lib/sound";
import { History, type SavedMatch } from "../lib/history";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import trophyCup from "../ui_assets/trophy-cup.png";

// Réseau Stats / Agg
import type {
  Visit as VisitType,
  PlayerLite as PlayerLiteType,
  Profile,
  MatchRecord,
  Dart as UIDart,
  LegResult,
  FinishPolicy,
  X01Snapshot,
} from "../lib/types";

import { StatsBridge } from "../lib/statsBridge";
import { addMatchSummary, commitLiteFromLeg } from "../lib/statsLiteIDB";
import { extractAggFromSavedMatch } from "../lib/aggFromHistory";
import * as StatsOnce from "../lib/statsOnce";
import { saveMatchStats, aggregateMatch } from "../lib/stats";
import { commitMatchSummary, buildX01Summary } from "../lib/playerStats";

import { onlineApi } from "../lib/onlineApi";
import { useAuthOnline } from "../hooks/useAuthOnline";

/* ===================================================================== 
   TRAINING-LIKE SAVE FOR NORMAL X01 MATCHES
   Sauvegarde simple dans LA MÊME STRUCTURE que TrainingX01Play
   (clé : dc_training_x01_stats_v1)
===================================================================== */

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingLikeEntry = {
  // même base que TrainingFinishStats de TrainingX01Play
  date: number;
  darts: number;
  avg3D: number;
  pctS: number;
  pctD: number;
  pctT: number;
  bestVisit: number;
  checkout: number;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  bySegment: Record<string, number>;
  bySegmentS: Record<string, number>;
  bySegmentD: Record<string, number>;
  bySegmentT: Record<string, number>;

  // champs bonus (ignorés par TrainingX01Play / StatsHub si non utilisés)
  playerId: string;
  startScore: number;
  visits: number;
};

function loadTrainingStats(): TrainingLikeEntry[] {
  try {
    const raw = localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrainingLikeEntry[]) : [];
  } catch {
    return [];
  }
}

function saveTrainingStats(arr: TrainingLikeEntry[]) {
  try {
    localStorage.setItem(TRAINING_X01_STATS_KEY, JSON.stringify(arr));
  } catch {
    // quota plein => on ignore, pas grave pour le match normal
  }
}

/**
 * Ajoute une entrée “type Training” pour un match X01 normal
 */
function addTrainingLikeEntry(params: {
  playerId: string;
  darts: number;
  scored: number;
  bestVisit: number;
  bestCheckout: number;
  startScore: number;
}) {
  const { playerId, darts, scored, bestVisit, bestCheckout, startScore } =
    params;

  const avg3D = darts > 0 ? (scored / darts) * 3 : 0;
  const visits = Math.ceil(darts / 3);

  const entry: TrainingLikeEntry = {
    date: Date.now(),
    darts,
    avg3D,
    pctS: 0,
    pctD: 0,
    pctT: 0,
    bestVisit,
    checkout: bestCheckout,

    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    miss: 0,
    bull: 0,
    dBull: 0,
    bust: 0,

    bySegment: {},
    bySegmentS: {},
    bySegmentD: {},
    bySegmentT: {},

    playerId,
    startScore,
    visits,
  };

  const prev = loadTrainingStats();
  prev.push(entry);
  saveTrainingStats(prev);
}

/* ==================== AUTOSAVE ==================== */
const AUTOSAVE_KEY = "dc-x01-autosave-v1";

function loadAutosave(): X01Snapshot | null {
  try {
    const s = localStorage.getItem(AUTOSAVE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return null;
}

let __lastAutosaveTs = 0;
function saveAutosave(snap: X01Snapshot | null) {
  if (!snap) return;
  try {
    const now = Date.now();
    if (now - __lastAutosaveTs < 800) return;
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    __lastAutosaveTs = now;
  } catch {}
}

function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {}
}

/* ==================== STYLES MINI-CARD ==================== */
const miniCard: React.CSSProperties = {
  width: "clamp(150px,22vw,190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background: "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
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
const miniRankName: React.CSSProperties = { fontWeight: 700, color: "#ffcf57" };
const miniRankScore: React.CSSProperties = { fontWeight: 800, color: "#ffcf57" };
const miniRankScoreFini: React.CSSProperties = {
  fontWeight: 800,
  color: "#7fe2a9",
};

/* ==================== CONSTANTES ==================== */
const NAV_HEIGHT = 64;
const CONTENT_MAX = 520;

type Mode = "simple" | "double" | "master";
type EnginePlayer = { id: string; name: string };

/* ========================================================
   NOUVEAU BANDEAU MODAL FIN DE MANCHE — LegBannerModal
======================================================== */
type LegBannerProps = {
  players: { id: string; name: string }[];
  profiles: Profile[];
  pendingFirstWin: { playerId: string } | null;
  finishedOrder: string[];
  setsTarget: number;             // nombre de sets à gagner
  legsTarget: number;             // nombre de manches à gagner pour un set
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  currentSet: number;
  currentLegInSet: number;
  onContinue: () => void;
  onShowRanking: () => void;
  onNextLeg: () => void;
};

function LegBannerModal(props: LegBannerProps) {
  const {
    players,
    profiles,
    pendingFirstWin,
    finishedOrder,
    setsTarget,
    legsTarget,
    legsWon,
    setsWon,
    currentSet,
    currentLegInSet,
    onContinue,
    onShowRanking,
    onNextLeg,
  } = props;

  const isDuel = players.length === 2;
  const isSetLegMode = setsTarget > 1 || legsTarget > 1;

  const winnerId =
    pendingFirstWin?.playerId ||
    (finishedOrder && finishedOrder.length ? finishedOrder[0] : null);

  if (!winnerId) return null;

  const winnerPlayer = players.find((p) => p.id === winnerId) || null;
  const winnerProfile = profiles.find((p) => p.id === winnerId) || null;

  // ⚠️ Au moment où le bandeau apparaît, le moteur n’a PAS encore
  // ajouté cette manche à legsWon. On affiche donc le score
  // « après cette manche » en ajoutant +1 au vainqueur.
  const winnerLegsBefore = legsWon[winnerId] ?? 0;
  const winnerLegsAfter = winnerLegsBefore + 1;

  // Est-ce que cette manche fait gagner le SET ?
  const willWinSet =
    isDuel && isSetLegMode && legsTarget > 0 && winnerLegsAfter >= legsTarget;

  const winnerSetsBefore = setsWon[winnerId] ?? 0;
  const winnerSetsAfter = willWinSet ? winnerSetsBefore + 1 : winnerSetsBefore;

  // Est-ce que cette manche fait gagner le MATCH (tous les sets requis gagnés) ?
  const willWinMatch =
    willWinSet && setsTarget > 0 && winnerSetsAfter >= setsTarget;

  // Texte score "1-1", "2-1", etc. (score des MANCHES dans le set en cours)
  let scoreText: string | null = null;

  if (isDuel) {
    const other = players.find((p) => p.id !== winnerId);
    if (other) {
      const otherLegsBefore = legsWon[other.id] ?? 0;
      const otherLegsAfter = otherLegsBefore; // il ne gagne pas cette manche
      scoreText = `${winnerLegsAfter} - ${otherLegsAfter}`;
    }
  } else if (isSetLegMode) {
    const wl = winnerLegsAfter;
    scoreText =
      wl > 0
        ? `${wl} manche${wl > 1 ? "s" : ""} gagnée${wl > 1 ? "s" : ""}`
        : null;
  }

  // ✅ Nom de l’adversaire pour affichage "Alex 1-1 Neven"
  const opponentName =
    isDuel ? players.find((p) => p.id !== winnerId)?.name ?? null : null;

  // ✅ Libellé du bouton principal (bas) :
  // - pas de set/leg : Terminer
  // - set gagné mais match fini : Terminer le match
  // - set gagné mais match continue : Set suivant
  // - sinon : Manche suivante
  let primaryLabel: string;
  if (!isSetLegMode) {
    primaryLabel = "Terminer";
  } else if (willWinMatch) {
    primaryLabel = "Terminer le match";
  } else if (willWinSet) {
    primaryLabel = "Set suivant";
  } else {
    primaryLabel = "Manche suivante";
  }

  // ✅ Badge sous le nom : "Manche gagnée" ou "SET gagné"
  const victoryLabel = willWinSet ? "SET gagné" : "Manche gagnée";

  // ✅ "Continuer (laisser finir)" uniquement si 3 joueurs et +
  const showContinue = players.length >= 3;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(0,0,0,.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(460px, 92%)",
          borderRadius: 18,
          padding: 16,
          background:
            "linear-gradient(180deg, rgba(22,22,26,.98), rgba(12,12,14,.98))",
          border: "1px solid rgba(255,255,255,.18)",
          boxShadow: "0 20px 40px rgba(0,0,0,.7)",
          color: "#f5f5f7",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          {/* Avatar + Texte gagnant */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Avatar CLEAN */}
            <div
              style={{
                position: "relative",
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                flexShrink: 0,
              }}
            >
              {winnerProfile?.avatarDataUrl ? (
                <img
                  src={winnerProfile.avatarDataUrl}
                  alt={winnerProfile.name}
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
                    fontWeight: 900,
                    color: "#1a1a1a",
                    fontSize: 24,
                  }}
                >
                  <img
                    src={trophyCup}
                    alt="Trophée"
                    style={{
                      width: "80%",
                      height: "80%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Texte */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  opacity: 0.85,
                  marginBottom: 2,
                }}
              >
                {isSetLegMode ? (
                  <>
                    Manche {currentLegInSet}/{legsTarget} · Set {currentSet}/
                    {setsTarget}
                  </>
                ) : (
                  <>Manche {currentLegInSet}</>
                )}
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#ffcf57",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span>
                  {winnerProfile?.name || winnerPlayer?.name || "Vainqueur"}
                </span>

                {scoreText && (
                  <>
                    <span
                      style={{
                        fontSize: 15,
                        color: "#f5f5f7",
                        opacity: 0.9,
                      }}
                    >
                      · {scoreText}
                    </span>

                    {opponentName && (
                      <span
                        style={{
                          fontSize: 15,
                          color: "#f5f5f7",
                          opacity: 0.9,
                        }}
                      >
                        · {opponentName}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#e7e7e7",
                  opacity: 0.9,
                }}
              >
                {victoryLabel}
              </div>
            </div>
          </div>

          {/* Petit icône TROPHÉE à droite */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "rgba(246,194,86,0.16)",
              boxShadow: "0 0 6px rgba(246,194,86,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={trophyCup}
              alt="Trophée"
              style={{
                width: "80%",
                height: "80%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        {/* Boutons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 4,
          }}
        >
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "10px 12px",
                border: "1px solid rgba(120,200,140,.5)",
                background: "linear-gradient(180deg,#35c86d,#23a958)",
                color: "#08130c",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Continuer (laisser finir)
            </button>
          )}

          <button
            type="button"
            onClick={onShowRanking}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "9px 12px",
              border: "1px solid rgba(255,255,255,.18)",
              background:
                "linear-gradient(180deg, rgba(40,40,46,.95), rgba(24,24,28,.98))",
              color: "#f5f5f7",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Résumé
          </button>

          <button
            type="button"
            onClick={onNextLeg}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "10px 12px",
              border: "1px solid rgba(255,190,70,.6)",
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#151515",
              fontWeight: 900,
              cursor: "pointer",
              marginTop: 2,
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================
   HELPERS VISUELS (pastilles + formatage)
======================================================== */
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

/* Dernière volée — pastilles */
type VisitLite = {
  p: string;
  segments: { v: number; mult?: 1 | 2 | 3 }[];
  bust?: boolean;
  score?: number;
  ts?: number;
  isCheckout?: boolean;
  remainingAfter?: number;
};

function renderLastVisitChipsFromLog(visitsLog: VisitLite[], pid: string) {
  const v = [...(visitsLog || [])].filter((vv) => vv.p === pid).pop();
  if (!v || !v.segments?.length) return null;

  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    height: 24,
    padding: "0 10px",
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 12,
    marginLeft: 6,
  };

  const chips = v.segments.map((s, i) => {
    const d = { v: s.v, mult: (s.mult || 1) as 1 | 2 | 3 };
    const st = chipStyle(d);
    return (
      <span
        key={i}
        style={{
          ...chipBase,
          background: st.background,
          color: st.color,
          border: st.border as string,
        }}
      >
        {fmt(d)}
      </span>
    );
  });

  if (v.bust) {
    const st = chipStyle(undefined, true);
    chips.push(
      <span
        key="bust"
        style={{
          ...chipBase,
          background: st.background,
          color: st.color,
          border: st.border as string,
        }}
      >
        Bust
      </span>
    );
  }

  return <span style={{ display: "inline-flex", flexWrap: "wrap" }}>{chips}</span>;
}

/* ========================================================
   PARAMÈTRES DE DÉMARRAGE
======================================================== */
type StartParams = {
  playerIds: string[];
  start: 301 | 501 | 701 | 901 | 1001;
  outMode?: Mode;
  inMode?: Mode;
  setsToWin?: number;
  legsPerSet?: number;
  finishPolicy?: FinishPolicy;
  resume?: X01Snapshot | null;
};

function readStartParams(
  propIds: string[] | undefined,
  propStart: any,
  propOut: Mode | undefined,
  propIn: Mode | undefined,
  propSets?: number,
  propLegs?: number,
  params?: any
): StartParams {
  const fromProps: Partial<StartParams> = {
    playerIds: propIds || [],
    start: propStart ?? 501,
    outMode: propOut,
    inMode: propIn,
    setsToWin: propSets,
    legsPerSet: propLegs,
  };
  const fromParams: Partial<StartParams> = params?.startParams ?? {};
  const fromGlobal: Partial<StartParams> =
    (typeof window !== "undefined" && (window as any).__x01StartParams) || {};

  return {
    playerIds:
      fromParams.playerIds ?? fromGlobal.playerIds ?? fromProps.playerIds ?? [],
    start: (fromParams.start ?? fromGlobal.start ?? fromProps.start ?? 501) as any,
    outMode: (fromParams.outMode ??
      fromGlobal.outMode ??
      fromProps.outMode ??
      "double") as Mode,
    inMode: (fromParams.inMode ??
      fromGlobal.inMode ??
      fromProps.inMode ??
      "simple") as Mode,
    setsToWin:
      fromParams.setsToWin ?? fromGlobal.setsToWin ?? fromProps.setsToWin ?? 1,
    legsPerSet:
      fromParams.legsPerSet ?? fromGlobal.legsPerSet ?? fromProps.legsPerSet ?? 1,
    finishPolicy: (fromParams.finishPolicy ??
      fromGlobal.finishPolicy ??
      ("firstToZero" as FinishPolicy)) as FinishPolicy,
    resume: (fromParams.resume ?? fromGlobal.resume ?? null) as X01Snapshot | null,
  };
}

/* ========================================================
   AUDIO SAFE HELPERS
======================================================== */
function tryPlay(a: any) {
  if (!a?.play) return;
  try {
    const p = a.play();
    if (p?.catch) p.catch(() => {});
  } catch {}
}

function createAudio(urls: string[]) {
  try {
    const a = new Audio();
    const pick = urls.find((u) => {
      const ext = u.split(".").pop()!;
      const mime = ext === "mp3" ? "audio/mpeg" : ext === "ogg" ? "audio/ogg" : "";
      return mime && a.canPlayType(mime) !== "";
    });

    if (!pick)
      return { play() {}, pause() {}, currentTime: 0, volume: 1, loop: false };

    a.src = pick;
    return a;
  } catch {
    return { play() {}, pause() {}, currentTime: 0, volume: 1, loop: false };
  }
}

/* ========================================================
   CHECKOUT HELPER (double-out)
======================================================== */
function suggestCheckout(
  rest: number,
  doubleOut: boolean,
  dartsLeft: 1 | 2 | 3
): string[] {
  if (rest < 2 || rest > 170) return [];
  if (!doubleOut) return rest <= 50 ? [rest === 50 ? "BULL" : `S${rest}`] : [];

  const map: Record<number, string> = {
    170: "T20 T20 D25",
    167: "T20 T19 D25",
    164: "T20 T18 D25",
    161: "T20 T17 D25",
    160: "T20 T20 D20",
    158: "T20 T20 D19",
    157: "T20 T19 D20",
    156: "T20 T20 D18",
    155: "T20 T19 D19",
    154: "T20 T18 D20",
    153: "T20 T19 D18",
    152: "T20 T20 D16",
    151: "T20 T17 D20",
    150: "T20 T18 D18",
    140: "T20 T20 D10",
    139: "T20 T13 D20",
    138: "T20 T18 D12",
    137: "T20 T15 D16",
    136: "T20 T20 D8",
    135: "T20 T17 D12",
    130: "T20 T18 D8",
    129: "T19 T16 D12",
    128: "T18 T14 D16",
    127: "T20 T17 D8",
    126: "T19 T19 D6",
    125: "25 T20 D20",
    124: "T20 T16 D8",
    123: "T19 T16 D9",
    122: "T18 T18 D7",
    121: "T20 11 D25",
    120: "T20 D20",
    119: "T19 10 D25",
    118: "T20 18 D20",
    117: "T20 17 D20",
    116: "T20 16 D20",
    115: "T20 15 D20",
    110: "T20 10 D20",
    109: "T20 9 D20",
    108: "T20 16 D16",
    107: "T19 18 D16",
    101: "T20 9 D16",
    100: "T20 D20",
    99: "T19 10 D16",
    98: "T20 D19",
    97: "T19 D20",
    96: "T20 D18",
    95: "T19 D19",
    94: "T18 D20",
    93: "T19 D18",
    92: "T20 D16",
    91: "T17 D20",
    90: "T18 D18",
    89: "T19 D16",
    88: "T16 D20",
    87: "T17 D18",
    86: "T18 D16",
    85: "T15 D20",
    84: "T16 D18",
    83: "T17 D16",
    82: "BULL D16",
    81: "T15 D18",
    80: "T20 D10",
    79: "T19 D11",
    78: "T18 D12",
    77: "T19 D10",
    76: "T20 D8",
    75: "T17 D12",
    74: "T14 D16",
    73: "T19 D8",
    72: "T16 D12",
    71: "T13 D16",
    70: "T20 D5",
  };

  const best = map[rest];
  if (best && best.split(" ").length <= dartsLeft) return [best];
  return [];
}

/* ========================================================
   FALLBACK: emitHistoryRecord_X01
======================================================== */
async function emitHistoryRecord_X01(args: {
  playersLite: PlayerLiteType[];
  winnerId: string | null;
  resumeId: string | null;
  legStats: any;
  visitsLog: any[];
  onFinish: (m: MatchRecord) => void;
}) {
  try {
    const id = crypto.randomUUID?.() ?? String(Date.now());
    await History.upsert({
      id,
      kind: "x01",
      status: "finished",
      players: args.playersLite,
      winnerId: args.winnerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      summary: null,
      payload: { legs: [args.legStats], visits: args.visitsLog },
    } as any);

    await History.list();
  } catch (e) {
    console.warn("[emitHistoryRecord_X01:fallback]", e);
  }
}

/* ========================================================
   WRAPPER X01Play (début)
======================================================== */
export default function X01Play(props: {
  profiles?: Profile[];
  playerIds?: string[];
  start?: 301 | 501 | 701 | 901 | 1001;
  outMode?: Mode;
  inMode?: Mode;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
  params?: { resumeId?: string; startParams?: StartParams } | any;
  setsToWin?: number;
  legsPerSet?: number;
}) {
  const {
    profiles = [],
    playerIds = [],
    start = 501,
    outMode = "double",
    inMode = "simple",
    onFinish,
    onExit,
    params,
    setsToWin = 1,
    legsPerSet = 1,
  } = props;

  const merged = readStartParams(
    playerIds,
    start,
    outMode,
    inMode,
    setsToWin,
    legsPerSet,
    params
  );

  const resumeId: string | undefined = params?.resumeId;

  const [ready, setReady] = React.useState(false);
  const [resumeSnapshot, setResumeSnapshot] = React.useState<X01Snapshot | null>(
    merged.resume ?? null
  );

  const hasResumeIntent = !!resumeId || !!merged.resume;
  const isResumeMode = !!resumeSnapshot;
  const isFreshStart = !hasResumeIntent;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isFreshStart) {
          clearAutosave();
          if (alive) setResumeSnapshot(null);
          if (alive) setReady(true);
          return;
        }

        if (merged.resume) {
          if (alive) setResumeSnapshot(merged.resume);
          if (alive) setReady(true);
          return;
        }

        if (resumeId) {
          const rec: SavedMatch | null = await History.get(resumeId);
          const snap = rec?.kind === "x01" ? (rec.payload as any)?.state : null;
          if (alive) setResumeSnapshot(snap ?? null);
        }
      } catch {
        if (alive) setResumeSnapshot(null);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [resumeId, merged.resume, isFreshStart]);

  const restoredOnceRef = React.useRef(false);
  React.useEffect(() => {
    if (!ready || restoredOnceRef.current) return;
    restoredOnceRef.current = true;

    if (!hasResumeIntent) return;
    if (resumeSnapshot) return;

    const snap = loadAutosave();
    if (snap) setResumeSnapshot(snap);
  }, [ready, resumeSnapshot, hasResumeIntent]);

  const freshNonce = React.useRef(
    !hasResumeIntent ? (crypto.randomUUID?.() ?? String(Date.now())) : ""
  ).current;

  const engineKey = React.useMemo(() => {
    if (resumeSnapshot) {
      const idx = (resumeSnapshot as any)?.currentIndex ?? 0;
      const scores = Array.isArray((resumeSnapshot as any)?.scores)
        ? (resumeSnapshot as any).scores.join("-")
        : "noscores";
      return `resume:${idx}:${scores}`;
    }
    return `fresh:${merged.playerIds.join("-")}:${merged.start}:${freshNonce}`;
  }, [resumeSnapshot, merged.playerIds, merged.start, freshNonce]);

  if (!ready) {
    return (
      <div
        style={{
          padding: 16,
          maxWidth: CONTENT_MAX,
          margin: "40px auto",
          textAlign: "center",
          color: "#ffcf57",
          fontWeight: 900,
        }}
      >
        Chargement…
      </div>
    );
  }

  return (
    <X01Core
      key={engineKey}
      profiles={profiles}
      playerIds={merged.playerIds}
      start={merged.start}
      outMode={(merged.outMode || "double") as Mode}
      inMode={(merged.inMode || "simple") as Mode}
      setsToWin={merged.setsToWin || 1}
      legsPerSet={merged.legsPerSet || 1}
      finishPref={merged.finishPolicy as FinishPolicy}
      resumeSnapshot={resumeSnapshot}
      resumeId={resumeId}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}

/* ======================================================================
   X01Core — cœur du jeu
   Option A : LegBannerModal = seule fin de manche
====================================================================== */
function X01Core({
  profiles,
  playerIds,
  start,
  outMode,
  inMode,
  setsToWin,
  legsPerSet,
  finishPref,
  resumeSnapshot,
  resumeId,
  onFinish,
  onExit,
}: {
  profiles: Profile[];
  playerIds: string[];
  start: 301 | 501 | 701 | 901 | 1001;
  outMode: Mode;
  inMode: Mode;
  setsToWin: number;
  legsPerSet: number;
  finishPref: FinishPolicy;
  resumeSnapshot: X01Snapshot | null;
  resumeId?: string;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
}) {

  // --- Auth online (pour savoir si on peut uploader le match) ---
  const { status: onlineStatus, user: onlineUser } = useAuthOnline();
  const canUploadOnline = onlineStatus === "signed_in" && !!onlineUser;

  /* =====================================================
     RÈGLES (snapshot > props)
  ===================================================== */
  const resumeRules = resumeSnapshot?.rules as
    | {
        start: number;
        outMode?: Mode;
        inMode?: Mode;
        setsToWin?: number;
        legsPerSet?: number;
      }
    | undefined;

  const startFromResume = (resumeRules?.start ?? start) as any;
  const playerIdsFromResume =
    resumeSnapshot?.players?.map((p: any) => p.id) ?? playerIds;

  const outMFromResume = resumeRules?.outMode ?? outMode;
  const inMFromResume = resumeRules?.inMode ?? inMode;

  // ✅ Sets uniquement en duel : si nbPlayers >= 3 → sets forcés à 1
  const rawSetsFromResume = resumeRules?.setsToWin ?? setsToWin;
  const isDuelConfig = playerIdsFromResume.length === 2;
  const setsFromResume =
    rawSetsFromResume && rawSetsFromResume > 0
      ? isDuelConfig
        ? rawSetsFromResume
        : 1
      : 1;

  const legsFromResume = resumeRules?.legsPerSet ?? legsPerSet;

  /* =====================================================
     OVERLAY DE MANCHE
  ===================================================== */
  const [lastLegResult, setLastLegResult] = React.useState<any | null>(null);
  const [overlayOpen, setOverlayOpen] = React.useState(false);

  const overlayClosedOnceRef = React.useRef(false);
  const lastLegKeyRef = React.useRef("");

  React.useEffect(() => {
    if (!lastLegResult) return;
    const key = `${lastLegResult.finishedAt}|${lastLegResult.legNo}`;
    if (key !== lastLegKeyRef.current) {
      lastLegKeyRef.current = key;
      setOverlayOpen(true);
    }
  }, [lastLegResult]);

  /* =====================================================
     LOG VOLÉES
  ===================================================== */
  const [visitsLog, setVisitsLog] = React.useState<VisitLite[]>([]);
  const visitNoRef = React.useRef(0);
  const matchLegsRef = React.useRef<any[]>([]);
  const matchVisitsRef = React.useRef<VisitLite[]>([]); // 🔥 toutes les visites du match

  function pushVisitLog(visit: any) {
    const segs =
      visit?.darts?.map((d: UIDart) => ({
        v: d.v,
        mult: (d.mult || 1) as 1 | 2 | 3,
      })) ?? [];

    const v: VisitLite = {
      p: visit.playerId,
      score: visit.score || 0,
      remainingAfter: visit.remainingAfter || 0,
      bust: visit.bust,
      isCheckout: visit.isCheckout,
      segments: segs,
      ts: Date.now(),
    };

    // ✅ log de la manche en cours (pour pastilles / overlay)
    setVisitsLog((prev) => [...prev, v]);

    // ✅ log global du match (pour stats & History)
    matchVisitsRef.current.push(v);
  }

  /* =====================================================
     FIN DE MATCH différée
  ===================================================== */
  const [pendingFinish, setPendingFinish] =
    React.useState<MatchRecord | null>(null);

  const defaultFinishPolicy: FinishPolicy =
    finishPref ??
    ((localStorage.getItem("opt_continue_policy") ?? "firstToZero") as any);

  /* =====================================================
     STATS LIVE (pour header & players list)
  ===================================================== */
  const [lastByPlayer, setLastByPlayer] = React.useState<
    Record<string, UIDart[]>
  >({});
  const [lastBustByPlayer, setLastBustByPlayer] = React.useState<
    Record<string, boolean>
  >({});
  const [dartsCount, setDartsCount] = React.useState<Record<string, number>>(
    {}
  );
  const [pointsSum, setPointsSum] = React.useState<Record<string, number>>({});
  const [visitsCount, setVisitsCount] = React.useState<Record<string, number>>(
    {}
  );
  const [bestVisitByPlayer, setBestVisitByPlayer] = React.useState<
    Record<string, number>
  >({});
  const [missByPlayer, setMissByPlayer] = React.useState<
    Record<string, number>
  >({});
  const [bustByPlayer, setBustByPlayer] = React.useState<
    Record<string, number>
  >({});
  const [dbullByPlayer, setDBullByPlayer] = React.useState<
    Record<string, number>
  >({});

  const [hitsByPlayer, setHitsByPlayer] = React.useState<
    Record<string, { h60: number; h100: number; h140: number; h180: number }>
  >({});
  const [impactByPlayer, setImpactByPlayer] = React.useState<
    Record<string, { doubles: number; triples: number; bulls: number }>
  >({});

  /* =====================================================
     HOOK MOTEUR
  ===================================================== */
  const {
    state,
    currentPlayer,
    turnIndex,
    scoresByPlayer,
    isOver, // plus utilisé pour terminer le match, mais on le garde pour l’instant
    winner,
    submitThrowUI,
    undoLast,
    pendingFirstWin,
    finishedOrder,
    continueAfterFirst,
    endNow,
    isContinuing,
    // Sets / Legs
    currentSet,
    currentLegInSet,
    setsTarget,
    legsTarget,
    setsWon,
    legsWon,
    ruleWinnerId, // 👈 nouveau champ utilisé pour la fin de match
  } = useX01Engine({
    profiles,
    playerIds: playerIdsFromResume,
    start: startFromResume,
    doubleOut: outMFromResume !== "simple",
    resume: resumeSnapshot,
    // ✅ côté moteur : si partie à 3+ joueurs, setsFromResume est déjà forcé à 1
    setsToWin: setsFromResume,
    legsPerSet: legsFromResume,
    outMode: outMFromResume,
    inMode: inMFromResume,
    finishPolicy: defaultFinishPolicy,
    onFinish: (m) => {
      // on ne navigue plus ici : on stocke juste le MatchRecord
      setPendingFinish(m);
    },
    /* ===== FIN DE MANCHE (LEG) ===== */
    onLegEnd: async (res: LegResult) => {
      // commit stats minimal
      StatsOnce.commitX01Leg?.({
        matchId: matchIdRef.current,
        profiles,
        leg: res,
        winnerId: res.winnerId ?? null,
        startScore: startFromResume,
      });

      const playersLite = mapEnginePlayersToLite(
        state.players as any,
        profiles
      );

      // conversion visits
      const visits: VisitType[] = visitsLog.map((v) => ({
        p: v.p,
        segments: v.segments.map((s) => ({ v: s.v, mult: s.mult })),
        bust: v.bust,
        score: v.score,
        ts: v.ts!,
        isCheckout: v.isCheckout,
        remainingAfter: v.remainingAfter!,
      }));

      const { leg, legacy } = StatsBridge.makeLeg(
        visits as any,
        playersLite,
        res.winnerId ?? null
      );

      // open ranking overlay
      setLastLegResult({
        ...legacy,
        __legStats: leg,
        winnerId: res.winnerId ?? null,
        finishedAt: Date.now(),
      });

      try {
        commitLiteFromLeg(legacy, playersLite, res.winnerId);
      } catch {}

      matchLegsRef.current.push(leg);

      // reset volée + stats live de la manche
      visitNoRef.current = 0;
      setVisitsLog([]);
      setMissByPlayer({});
      setBustByPlayer({});
      setDBullByPlayer({});

      // 👉 on remet à zéro tout ce qui doit repartir à 0
      // à chaque nouvelle manche (mais on garde bestVisitByPlayer)
      setDartsCount({});
      setPointsSum({});
      setVisitsCount({});
    },
  });

  // ✅ duel / sets pour l'affichage
  const isDuel = (state.players as any)?.length === 2;
  const useSetsUi = isDuel && (setsTarget ?? setsFromResume) > 1;

  // ✅ mémos frais pour le header compact
  const legsWonNow = { ...legsWon };
  const setsWonNow = { ...setsWon };

  /* =====================================================
     PERSISTENCE — id du match
  ===================================================== */
  const initialMatchId = React.useRef(
    resumeSnapshot && resumeId
      ? resumeId
      : crypto.randomUUID?.() ?? String(Date.now())
  ).current;

  const historyIdRef = React.useRef(initialMatchId);
  const matchIdRef = React.useRef(initialMatchId);

  /* =====================================================
     SFX
  ===================================================== */
  const dartHit = React.useMemo(
    () => createAudio(["/sounds/dart-hit.mp3", "/sounds/dart-hit.ogg"]),
    []
  );
  const bustSnd = React.useMemo(
    () => createAudio(["/sounds/bust.mp3", "/sounds/bust.ogg"]),
    []
  );
  const voiceOn = React.useMemo(
    () => (localStorage.getItem("opt_voice") ?? "true") === "true",
    []
  );

  const profileById = React.useMemo(() => {
    const m: Record<string, Profile> = {};
    for (const p of profiles) m[p.id] = p;
    return m;
  }, [profiles]);

  const playersByIdMemo = React.useMemo(() => {
    return Object.fromEntries(
      (state.players as any)?.map((p: EnginePlayer) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          avatarDataUrl: profileById[p.id]?.avatarDataUrl ?? null,
        },
      ])
    );
  }, [state.players, profileById]);

  /* =====================================================
     VOLÉE COURANTE (UI)
  ===================================================== */
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const currentRemaining =
    scoresByPlayer[currentPlayer?.id ?? ""] ?? startFromResume;

  function dartValue(d: UIDart) {
    if (d.v === 25 && d.mult === 2) return 50;
    return d.v * d.mult;
  }

  function playDartSfx(d: UIDart, nextThrow: UIDart[]) {
    const v = nextThrow.reduce((s, x) => s + dartValue(x), 0);
    if (nextThrow.length === 3 && v === 180) return playSound("180");
    if (d.v === 25 && d.mult === 2) return playSound("doublebull");
    if (d.v === 25) return playSound("bull");
    if (d.mult === 3) return playSound("triple");
    if (d.mult === 2) return playSound("double");
    return playSound("dart-hit");
  }

  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: multiplier };
    const next = [...currentThrow, d];
    playDartSfx(d, next);
    tryPlay(dartHit);
    navigator.vibrate?.(25);
    setCurrentThrow(next);
    setMultiplier(1);
  }

  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    const next = [...currentThrow, d];
    playDartSfx(d, next);
    tryPlay(dartHit);
    navigator.vibrate?.(25);
    setCurrentThrow(next);
    setMultiplier(1);
  }

  /* =====================================================
     VALIDATION VOLÉE
  ===================================================== */
  function validateThrow() {
    if (!currentThrow.length || !currentPlayer) return;

    const curRemaining = scoresByPlayer[currentPlayer.id];
    const volleyPts = currentThrow.reduce((s, x) => s + dartValue(x), 0);
    const after = curRemaining - volleyPts;

    let willBust = after < 0;
    const doubleOutActive = outMFromResume !== "simple";

    if (!willBust && doubleOutActive && after === 0) {
      const last = currentThrow[currentThrow.length - 1];
      const isDouble = last.v === 25 ? last.mult === 2 : last.mult === 2;
      willBust = !isDouble;
    }

    const ptsForStats = willBust ? 0 : volleyPts;

    const miss = currentThrow.filter((d) => d.v === 0).length;
    const db = currentThrow.filter((d) => d.v === 25 && d.mult === 2).length;

    if (miss)
      setMissByPlayer((m) => ({
        ...m,
        [currentPlayer.id]: (m[currentPlayer.id] || 0) + miss,
      }));

    if (db)
      setDBullByPlayer((m) => ({
        ...m,
        [currentPlayer.id]: (m[currentPlayer.id] || 0) + db,
      }));

    if (willBust)
      setBustByPlayer((m) => ({
        ...m,
        [currentPlayer.id]: (m[currentPlayer.id] || 0) + 1,
      }));

    // Log visite
    pushVisitLog({
      playerId: currentPlayer.id,
      score: ptsForStats,
      remainingAfter: willBust ? curRemaining : Math.max(after, 0),
      bust: willBust,
      isCheckout: !willBust && after === 0,
      darts: currentThrow,
    });

    // Stats globales
    setDartsCount((m) => ({
      ...m,
      [currentPlayer.id]: (m[currentPlayer.id] || 0) + currentThrow.length,
    }));
    setPointsSum((m) => ({
      ...m,
      [currentPlayer.id]: (m[currentPlayer.id] || 0) + ptsForStats,
    }));
    setVisitsCount((m) => ({
      ...m,
      [currentPlayer.id]: (m[currentPlayer.id] || 0) + 1,
    }));
    setBestVisitByPlayer((m) => ({
      ...m,
      [currentPlayer.id]: Math.max(m[currentPlayer.id] || 0, volleyPts),
    }));

    // Hits
    setHitsByPlayer((m) => {
      const prev =
        m[currentPlayer.id] || {
          h60: 0,
          h100: 0,
          h140: 0,
          h180: 0,
        };
      const add = { ...prev };
      if (volleyPts >= 60) add.h60++;
      if (volleyPts >= 100) add.h100++;
      if (volleyPts >= 140) add.h140++;
      if (volleyPts === 180) add.h180++;
      return { ...m, [currentPlayer.id]: add };
    });

    // Impact (doubles/triples/bulls)
    setImpactByPlayer((m) => {
      const p = m[currentPlayer.id] || {
        doubles: 0,
        triples: 0,
        bulls: 0,
      };
      const add = { ...p };
      for (const d of currentThrow) {
        if (d.v === 25) add.bulls += d.mult === 2 ? 1 : 0.5;
        if (d.mult === 2) add.doubles++;
        if (d.mult === 3) add.triples++;
      }
      return { ...m, [currentPlayer.id]: add };
    });

    /* --- PERSISTENCE APRÈS VOLÉE --- */
    try {
      const playersArr = state.players as any as EnginePlayer[];
      const idx = playersArr.findIndex((p) => p.id === currentPlayer.id);
      const curIdx = idx >= 0 ? idx : 0;

      const scoresAfter = playersArr.map((p) =>
        p.id !== currentPlayer.id
          ? scoresByPlayer[p.id]
          : willBust
          ? scoresByPlayer[p.id]
          : Math.max(after, 0)
      );

      const isCheckout = !willBust && after === 0;
      const nextIndex = isCheckout
        ? curIdx
        : (curIdx + 1) % playersArr.length;

      const engineLike = {
        rules: {
          start: startFromResume,
          doubleOut: outMFromResume !== "simple",
          setsToWin: setsFromResume,
          legsPerSet: legsFromResume,
          outMode: outMFromResume,
          inMode: inMFromResume,
        },
        players: playersArr,
        scores: scoresAfter,
        currentIndex: nextIndex,
        dartsThisTurn: [],
        winnerId: isCheckout ? currentPlayer.id : null,
      };

      const rec = makeX01RecordFromEngineCompat({
        engine: engineLike,
        existingId: historyIdRef.current,
      });

      History.upsert(rec);
      historyIdRef.current = rec.id;

      if (!isCheckout) {
        saveAutosave((rec as any).payload.state);
      } else clearAutosave();
    } catch {}

    // Reset UI
    setLastByPlayer((m) => ({ ...m, [currentPlayer.id]: currentThrow }));
    setLastBustByPlayer((m) => ({ ...m, [currentPlayer.id]: willBust }));

    if (willBust) {
      tryPlay(bustSnd);
      navigator.vibrate?.([120, 60, 140]);
    } else if (voiceOn && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(
        `${currentPlayer.name}, ${volleyPts} points`
      );
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }

    submitThrowUI(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  /* =====================================================
     BACKSPACE / ANNULER
  ===================================================== */
  function handleBackspace() {
    playSound("dart-hit");
    setCurrentThrow((t) => t.slice(0, -1));
  }

  function handleCancel() {
    playSound("bust");
    if (currentThrow.length) setCurrentThrow((t) => t.slice(0, -1));
    else undoLast?.();
  }

  /* =====================================================
     LIVE RANKING
  ===================================================== */
  const liveRanking = React.useMemo(() => {
    const arr = (state.players as any).map((p: EnginePlayer) => ({
      id: p.id,
      name: p.name,
      score: scoresByPlayer[p.id],
    }));
    arr.sort((a, b) => {
      const az = a.score === 0;
      const bz = b.score === 0;
      if (az && !bz) return -1;
      if (!az && bz) return 1;
      return a.score - b.score;
    });
    return arr;
  }, [state.players, scoresByPlayer]);

  /* =====================================================
     HANDLE QUIT
  ===================================================== */
  function persistNowBeforeExit() {
    try {
      const rec = makeX01RecordFromEngineCompat({
        engine: buildEngineLike([], winner?.id ?? null),
        existingId: historyIdRef.current,
      });
      History.upsert(rec);
      historyIdRef.current = rec.id;

      if (!winner?.id) saveAutosave((rec as any).payload.state);
      else clearAutosave();
    } catch {}
  }

  function handleQuit() {
    if (pendingFinish) {
      flushPendingFinish();
    } else {
      persistNowBeforeExit();
      onExit();
    }
  }

  const latestPersistFnRef = React.useRef(() => {});
  latestPersistFnRef.current = persistNowBeforeExit;

  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden")
        latestPersistFnRef.current();
    };
    const onBeforeUnload = () => latestPersistFnRef.current();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  /* =====================================================
   FIN DE MATCH — NOUVELLE LOGIQUE (VERSION FINALE)
===================================================== */

// Sauvegarde l’état final (snapshot) dans History + clear autosave
function persistOnFinish() {
  try {
    const rec = makeX01RecordFromEngineCompat({
      engine: buildEngineLike([], winner?.id ?? null),
      existingId: historyIdRef.current,
    });

    History.upsert(rec);
    historyIdRef.current = rec.id;
    clearAutosave();
  } catch {}
}

// Sécurité : on ne finalise qu’une seule fois
const hasFinishedRef = React.useRef(false);

// Déclenchement si le moteur a déterminé un winnerId
React.useEffect(() => {
  if (!ruleWinnerId) return;
  if (hasFinishedRef.current) return;

  // total sets configuré (props ou snapshot)
  const totalSets =
    (setsTarget && setsTarget > 0 ? setsTarget : setsFromResume) || 1;

  // mode "best of"
  const setsNeededToWin = Math.floor(totalSets / 2) + 1;

  const winnerSets = setsWon?.[ruleWinnerId] ?? 0;
  if (winnerSets < setsNeededToWin) return;

  finalizeMatch();
}, [ruleWinnerId, setsWon, setsTarget, setsFromResume]);

/* =====================================================
   FINALIZE MATCH — VERSION FINALE (bridge-only)
===================================================== */
async function finalizeMatch() {
  if (hasFinishedRef.current) return;
  hasFinishedRef.current = true;

  // snapshot final
  persistOnFinish();

  // petit helper num()
  const num = (x: any): number => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };

  try {
    /* -------------------------------------------------
       0) Setup de base
    ------------------------------------------------- */
    const playersArr = mapEnginePlayersToLite(
      state.players as any,
      profiles
    );
    const matchId = matchIdRef.current;

    // Résumé complet via StatsBridge (la source fiable)
    const bridgeSummary = StatsBridge.makeMatch(
      matchLegsRef.current,
      playersArr,
      matchId,
      "x01"
    );

    const bridgePerPlayer: any[] = Array.isArray(
      (bridgeSummary as any).perPlayer
    )
      ? (bridgeSummary as any).perPlayer
      : [];

    // gagnant final
    const winnerIdFinal =
      ruleWinnerId ??
      winner?.id ??
      (bridgeSummary as any).winnerId ??
      null;

    /* -------------------------------------------------
       1) SUMMARY PAR JOUEUR (on fait confiance au bridge)
    ------------------------------------------------- */
    const summaryPerPlayer = playersArr.map((p) => {
      const b =
        bridgePerPlayer.find(
          (pp: any) =>
            pp?.playerId === p.id || pp?.id === p.id
        ) ?? {};

      const impact = impactByPlayer[p.id] || {
        doubles: 0,
        triples: 0,
        bulls: 0,
      };

      const darts =
        num(b.darts) ||
        num(b.nbDarts) ||
        num(b.totalDarts);

      const scored =
        num(b.scored) ||
        num(b.points) ||
        num(b.totalPoints) ||
        num(b.scoreSum) ||
        num(b.scoredPoints);

      const avg3FromBridge =
        num(b.avg3) ||
        num(b.avg_3) ||
        num(b.avg3Darts) ||
        num(b.average3) ||
        num(b.avg3D);

      const avg3 =
        avg3FromBridge ||
        (darts > 0 ? (scored / darts) * 3 : 0);

      const bestVisit =
        num(b.bestVisit) ||
        num(b.best_visit) ||
        num(b.best);

      const bestCheckout =
        num(b.bestCheckout) ||
        num(b.best_co) ||
        num(b.bestFinish);

      const h60 = num(b.h60);
      const h100 = num(b.h100);
      const h140 = num(b.h140);
      const h180 = num(b.h180);
      const miss = num(b.miss);
      const bust = num(b.bust);
      const dbull = num(b.dbull);

      return {
        playerId: p.id,
        name: p.name,
        darts,
        avg3,
        bestVisit,
        bestCheckout,
        h60,
        h100,
        h140,
        h180,
        miss,
        bust,
        dbull,
        doubles: impact.doubles,
        triples: impact.triples,
        bulls: impact.bulls,
        win: winnerIdFinal === p.id,
      };
    });

    /* -------------------------------------------------
       2) QUICK STATS — addMatchSummary
    ------------------------------------------------- */
    const avg3ByPlayer: Record<string, number> = {};
    const bestVisitByPlayer: Record<string, number> = {};
    const bestCheckoutByPlayer: Record<string, number> = {};

    for (const s of summaryPerPlayer) {
      avg3ByPlayer[s.playerId] =
        Math.round((s.avg3 || 0) * 100) / 100;
      bestVisitByPlayer[s.playerId] = s.bestVisit || 0;
      bestCheckoutByPlayer[s.playerId] =
        s.bestCheckout || 0;
    }

    try {
      await addMatchSummary({
        winnerId: winnerIdFinal,
        perPlayer: Object.fromEntries(
          playersArr.map((p) => [
            p.id,
            {
              id: p.id,
              games: 1,
              wins: winnerIdFinal === p.id ? 1 : 0,
              avg3: avg3ByPlayer[p.id],
            },
          ])
        ),
      });
    } catch {
      // quick stats non bloquant
    }

    /* -------------------------------------------------
       3) VISITES + SUMMARY POUR HISTORY
    ------------------------------------------------- */
    const visitsForPersist: VisitType[] = (
      matchVisitsRef.current || []
    ).map((v) => ({
      p: v.p,
      segments: v.segments,
      bust: v.bust,
      score: v.score,
      ts: v.ts!,
      isCheckout: v.isCheckout,
      remainingAfter: v.remainingAfter,
    }));

    const summaryForHistory = {
      kind: "x01",
      legs: matchLegsRef.current.length,
      darts: summaryPerPlayer.reduce(
        (s, p) => s + (p.darts || 0),
        0
      ),
      avg3ByPlayer,
      bestVisitByPlayer,
      bestCheckoutByPlayer,
      perPlayer: summaryPerPlayer,
    };

    // =====================================================
    // 3bis) History.upsert avec le vrai summary X01
    //       → utilisé par StatsHub › X01 multi
    // =====================================================
    try {
      History.upsert({
        id: matchId,
        kind: "x01",
        status: "finished",
        players: playersArr,
        winnerId: winnerIdFinal,
        updatedAt: Date.now(),
        summary: summaryForHistory,
        payload: {
          visits: visitsForPersist,
          legs: matchLegsRef.current,
          meta: {
            currentSet,
            currentLegInSet,
            legsTarget: legsFromResume,
          },
        },
      } as any);
    } catch (err) {
      console.warn(
        "[X01Play] History.upsert (summaryForHistory) failed",
        err
      );
    }

    await safeSaveMatch({
      id: matchId,
      players: playersArr,
      winnerId: winnerIdFinal,
      summary: summaryForHistory,
      payload: {
        visits: visitsForPersist,
        legs: matchLegsRef.current,
        meta: {
          currentSet,
          currentLegInSet,
          legsTarget: legsFromResume,
        },
      },
    });

    /* -------------------------------------------------
       4) ONLINE SYNC — non bloquant
    ------------------------------------------------- */
    if (canUploadOnline) {
      try {
        await onlineApi.uploadMatch({
          mode: "x01",
          isTraining: false,
          payload: {
            matchId,
            rules: {
              start: startFromResume,
              outMode: outMFromResume,
              inMode: inMFromResume,
              setsToWin: setsFromResume,
              legsPerSet: legsFromResume,
              finishPolicy:
                outMFromResume !== "simple"
                  ? "doubleOut"
                  : "singleOut",
            },
            players: playersArr,
            winnerId: winnerIdFinal,
            legs: matchLegsRef.current,
            visits: visitsForPersist,
            meta: {
              currentSet,
              currentLegInSet,
              legsTarget: legsFromResume,
            },
          },
        });
      } catch (err) {
        console.warn("[Online] uploadMatch failed:", err);
      }
    }

    // force refresh des listeners StatsHub (dc-history-updated)
    await History.list();

    /* -------------------------------------------------
       5) Fallback mini-history
    ------------------------------------------------- */
    try {
      const legForLegacy =
        lastLegResult?.__legStats ??
        matchLegsRef.current.at(-1);

      await emitHistoryRecord_X01({
        playersLite: playersArr,
        winnerId: winnerIdFinal,
        resumeId: resumeId ?? null,
        legStats: legForLegacy,
        visitsLog: [],
        onFinish,
      });
    } catch {
      // non bloquant
    }

    /* -------------------------------------------------
       6) Stats profils (médaillons / couronnes)
    ------------------------------------------------- */
    try {
      commitMatchSummary(
        buildX01Summary({
          kind: "x01",
          winnerId: winnerIdFinal,
          perPlayer: summaryPerPlayer,
        })
      );
    } catch {
      // non bloquant
    }

    /* -------------------------------------------------
       7) StatsHub X01 global (rich stats)
    ------------------------------------------------- */
    try {
      const playersIds = playersArr.map((p) => p.id);
      const m = aggregateMatch(
        matchLegsRef.current as any,
        playersIds
      );

      saveMatchStats({
        id: crypto.randomUUID?.() ?? String(Date.now()),
        createdAt: Date.now(),
        rules: {
          x01Start: startFromResume,
          finishPolicy:
            outMFromResume !== "simple"
              ? "doubleOut"
              : "singleOut",
          setsToWin: setsFromResume,
          legsPerSet: legsFromResume,
        },
        players: playersIds,
        winnerId: winnerIdFinal,
        computed: m,
      });
    } catch {
      // non bloquant
    }

    /* -------------------------------------------------
       8) Voix - annonce classement final
    ------------------------------------------------- */
    try {
      if (
        (localStorage.getItem("opt_voice") ?? "true") ===
          "true" &&
        "speechSynthesis" in window
      ) {
        const ordered = [...liveRanking];
        const ords = [
          "",
          "Deuxième",
          "Troisième",
          "Quatrième",
          "Cinquième",
        ];
        const parts: string[] = [];

        if (ordered[0]) parts.push(`Victoire ${ordered[0].name}`);
        for (let i = 1; i < ordered.length; i++) {
          if (ords[i]) parts.push(`${ords[i]} ${ordered[i].name}`);
        }

        const text = parts.join(". ") + ".";
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {
      // non bloquant
    }

    // Fin effective
    flushPendingFinish();
  } catch (e) {
    console.warn("[finalizeMatch]", e);
  }
}

  /* =====================================================
     FLUSH FIN
  ===================================================== */
  function flushPendingFinish() {
    if (pendingFinish) {
      const m = pendingFinish;
      setPendingFinish(null);
      setOverlayOpen(false);
      onFinish(m);
      return;
    }

    const rec = makeX01RecordFromEngineCompat({
      engine: buildEngineLike([], winner?.id ?? null),
      existingId: historyIdRef.current,
    });
    History.upsert(rec);
    historyIdRef.current = rec.id;
    onFinish(rec);
  }

  /* =====================================================
     REBUILD ENGINE-LIKE
  ===================================================== */
  function buildEngineLike(dartsThisTurn: UIDart[], winnerId: string | null) {
    const playersArr = state.players as any as EnginePlayer[];
    const scores = playersArr.map(
      (p) => scoresByPlayer[p.id] ?? startFromResume
    );
    const idx = playersArr.findIndex((p) => p.id === currentPlayer?.id);

    return {
      rules: {
        start: startFromResume,
        doubleOut: outMFromResume !== "simple",
        setsToWin: setsFromResume,
        legsPerSet: legsFromResume,
        outMode: outMFromResume,
        inMode: inMFromResume,
      },
      players: playersArr,
      scores,
      currentIndex: idx >= 0 ? idx : 0,
      dartsThisTurn,
      winnerId,
    };
  }

  /* =====================================================
     FIN DE MANCHE → Overlay classement
  ===================================================== */
  function handleContinueFromRanking(e?: any) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    overlayClosedOnceRef.current = true;
    setOverlayOpen(false);
    setLastLegResult(null);
    queueMicrotask(() => (overlayClosedOnceRef.current = false));
  }

  /* =====================================================
     MESURE HEADER (scroll zone OK mobile)
  ===================================================== */
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

  /* =====================================================
     MESURE KEYPAD (pour espace joueurs)
  ===================================================== */
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

  /* =====================================================
     RENDU GLOBAL
  ===================================================== */
  const currentPlayerId = currentPlayer?.id ?? "";

  return (
    <div
      className="x01play-container"
      style={{ overflow: "hidden", minHeight: "100vh" }}
    >
      {/* HEADER FIXE */}
      <div
        ref={headerWrapRef}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          zIndex: 60,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 10,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {/* Barre haute */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: 6,
          }}
        >
          {/* BOUTON QUITTER */}
          <button
            onClick={handleQuit}
            style={{
              borderRadius: 10,
              padding: "5px 11px",
              border: "1px solid rgba(255,180,0,.3)",
              background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
              color: "#1a1a1a",
              fontWeight: 900,
              boxShadow: "0 8px 18px rgba(255,170,0,.25)",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            ← Quitter
          </button>

          {/* HEADER COMPACT (AVATARS + SCORE) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {isDuel && useSetsUi && (
              <DuelHeaderCompact
                leftAvatarUrl={
                  profileById[(state.players as any)[0].id]?.avatarDataUrl ??
                  ""
                }
                rightAvatarUrl={
                  profileById[(state.players as any)[1].id]?.avatarDataUrl ??
                  ""
                }
                leftSets={setsWonNow[(state.players as any)[0].id] ?? 0}
                rightSets={setsWonNow[(state.players as any)[1].id] ?? 0}
                leftLegs={legsWonNow[(state.players as any)[0].id] ?? 0}
                rightLegs={legsWonNow[(state.players as any)[1].id] ?? 0}
              />
            )}
          </div>

          {/* CAPSULE SET / LEG */}
          <SetLegChip
            currentSet={currentSet}
            currentLegInSet={currentLegInSet}
            setsTarget={setsFromResume}
            legsTarget={legsFromResume}
            useSets={useSetsUi}
          />
        </div>

        {/* HEADER */}
        <div style={{ maxWidth: CONTENT_MAX, margin: "0 auto" }}>
          <HeaderBlock
            currentPlayer={currentPlayer as any}
            currentAvatar={
              (currentPlayer &&
                profileById[currentPlayer.id]?.avatarDataUrl) ??
              null
            }
            currentRemaining={currentRemaining}
            currentThrow={currentThrow}
            doubleOut={outMFromResume !== "simple"}
            liveRanking={liveRanking}
            curDarts={dartsCount[currentPlayerId] || 0}
            curM3D={
              (dartsCount[currentPlayerId] || 0) > 0
                ? (
                    (pointsSum[currentPlayerId] || 0) /
                    (dartsCount[currentPlayerId] || 1)
                  ).toFixed(2)
                : "0.00"
            }
            bestVisit={bestVisitByPlayer[currentPlayerId] || 0}
            dartsLeft={(3 - currentThrow.length) as 1 | 2 | 3}
            legsWon={legsWon}
            setsWon={setsWon}
            useSets={useSetsUi}
          />
        </div>
      </div>

      {/* ZONE JOUEURS — SCROLLABLE ENTRE HEADER ET KEYPAD */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: headerH,
          bottom: NAV_HEIGHT + keypadH + 8,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 10,
          paddingTop: 4,
          paddingBottom: 4,
          overflowY: "auto",
          zIndex: 40,
        }}
      >
        <PlayersListOnly
          statePlayers={state.players as any}
          profileById={profileById}
          dartsCount={dartsCount}
          pointsSum={pointsSum}
          start={startFromResume}
          scoresByPlayer={scoresByPlayer}
          visitsLog={visitsLog}
          legsWon={legsWon}
          setsWon={setsWon}
          useSets={useSetsUi}
        />
      </div>

      {/* KEYPAD FIXE EN BAS, ALIGNÉ EN LARGEUR */}
      <div
        ref={keypadWrapRef}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: NAV_HEIGHT,
          zIndex: 45,
          padding: "0 10px 4px",
          width: `min(100%, ${CONTENT_MAX}px)`,
        }}
      >
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={handleBackspace}
          onCancel={handleCancel}
          onNumber={handleNumber}
          onBull={handleBull}
          onValidate={validateThrow}
          hidePreview
        />
      </div>

      {/* NOUVEAU BANDEAU — Fin de manche */}
      {pendingFirstWin && (
        <LegBannerModal
          players={state.players as any}
          profiles={profiles}
          pendingFirstWin={pendingFirstWin}
          finishedOrder={finishedOrder ?? []}
          setsTarget={setsTarget ?? setsFromResume}
          legsTarget={legsTarget ?? legsFromResume}
          legsWon={legsWon ?? {}}
          setsWon={setsWon ?? {}}
          currentSet={currentSet}
          currentLegInSet={currentLegInSet}
          onContinue={continueAfterFirst}
          onShowRanking={() => setOverlayOpen(true)}
          onNextLeg={endNow}
        />
      )}

      {/* OVERLAY STATS & CLASSEMENT */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: overlayOpen ? "auto" : "none",
        }}
      >
        <EndOfLegOverlay
          open={overlayOpen}
          result={lastLegResult}
          playersById={playersByIdMemo}
          onClose={handleContinueFromRanking}
          onReplay={handleContinueFromRanking}
          onSave={(res) => {
            try {
              const playersNow = mapEnginePlayersToLite(
                state.players as any,
                profiles
              );

              History.upsert({
                kind: "leg",
                id: crypto.randomUUID?.() ?? String(Date.now()),
                status: "finished",
                players: playersNow,
                updatedAt: Date.now(),
                createdAt: Date.now(),
                payload: {
                  ...res,
                  meta: {
                    currentSet,
                    currentLegInSet,
                    setsTarget: setsFromResume,
                    legsTarget: legsFromResume,
                  },
                },
              } as any);
              History.list();
            } catch {}
            handleContinueFromRanking();
          }}
        />
      </div>
    </div>
  );

  /* =====================================================
     Sous-composants : HeaderBlock & PlayersListOnly
  ===================================================== */

  function HeaderBlock({
    currentPlayer,
    currentAvatar,
    currentRemaining,
    currentThrow,
    doubleOut,
    liveRanking,
    curDarts,
    curM3D,
    bestVisit,
    useSets,
    legsWon,
    setsWon,
  }: any) {
    const legsWonThisSet =
      currentPlayer?.id && legsWon ? legsWon[currentPlayer.id] ?? 0 : 0;
    const setsWonTotal =
      currentPlayer?.id && setsWon ? setsWon[currentPlayer.id] ?? 0 : 0;

    return (
      <div
        style={{
          background:
            "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 18,
          padding: 7,
          boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 8,
            alignItems: "center",
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
                background: "linear-gradient(180deg,#1b1b1f,#111114)",
                boxShadow: "0 6px 22px rgba(0,0,0,.35)",
              }}
            >
              {currentAvatar ? (
                <img
                  src={currentAvatar}
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
              {useSets ? (
                <>
                  Manches : <b>{legsWonThisSet}</b> • Sets :{" "}
                  <b>{setsWonTotal}</b>
                </>
              ) : (
                <>
                  Manches : <b>{legsWonThisSet}</b>
                </>
              )}
            </div>

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
                <div>
                  Volée : <b>{currentThrow.length}/3</b>
                </div>
              </div>
            </div>
          </div>

          {/* SCORE + VOLÉE + CHECKOUT + RANKING */}
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {/* SCORE */}
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "#ffcf57",
                textShadow: "0 4px 18px rgba(255,195,26,.25)",
                lineHeight: 1.02,
              }}
            >
              {Math.max(
                currentRemaining -
                  currentThrow.reduce(
                    (s: number, d: UIDart) => s + dartValue(d),
                    0
                  ),
                0
              )}
            </div>

            {/* Pastilles live */}
            <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
              {[0, 1, 2].map((i) => {
                const d = currentThrow[i];
                const afterNow =
                  currentRemaining -
                  currentThrow
                    .slice(0, i + 1)
                    .reduce((s: number, x: UIDart) => s + dartValue(x), 0);

                const wouldBust =
                  afterNow < 0 ||
                  (doubleOut &&
                    afterNow === 0 &&
                    !(() => {
                      const last = currentThrow[i];
                      return (
                        last?.mult === 2 ||
                        (last?.v === 25 && last.mult === 2)
                      );
                    })());

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

            {/* Checkout suggestion */}
            {(() => {
              const only = suggestCheckout(
                Math.max(
                  currentRemaining -
                    currentThrow.reduce(
                      (s: number, d: UIDart) => s + dartValue(d),
                      0
                    ),
                  0
                ),
                doubleOut,
                (3 - currentThrow.length) as any
              )[0];

              if (!only || currentThrow.length >= 3) return null;

              return (
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
                      {only}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Mini ranking */}
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
                {liveRanking.map((r: any, i: number) => (
                  <div key={r.id} style={miniRankRow}>
                    <div style={miniRankName}>
                      {i + 1}. {r.name}
                    </div>
                    <div
                      style={
                        r.score === 0 ? miniRankScoreFini : miniRankScore
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

  function PlayersListOnly({
    statePlayers,
    profileById,
    dartsCount,
    pointsSum,
    start,
    scoresByPlayer,
    visitsLog,
    legsWon,
    setsWon,
    useSets,
  }: any) {
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
        {statePlayers.map((p: EnginePlayer) => {
          const prof = profileById[p.id];
          const avatarSrc = prof?.avatarDataUrl ?? null;

          const dCount = dartsCount[p.id] || 0;
          const pSum = pointsSum[p.id] || 0;
          const a3d = dCount > 0 ? ((pSum / dCount) * 3).toFixed(2) : "0.00";
          const score = scoresByPlayer[p.id] ?? start;
          const legsWonThisSet = legsWon?.[p.id] ?? 0;
          const setsWonTotal = setsWon?.[p.id] ?? 0;

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
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {renderLastVisitChipsFromLog(visitsLog, p.id)}
                  </div>
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

                <div
                  style={{
                    fontSize: 11.5,
                    color: "#cfd1d7",
                    marginTop: 1,
                  }}
                >
                  {useSets
                    ? `Manches : ${legsWonThisSet} • Sets : ${setsWonTotal}`
                    : `Manches : ${legsWonThisSet}`}
                </div>
              </div>

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
      </div>
    );
  }
}

/* =====================================================
   Helper: mapEnginePlayersToLite
===================================================== */
function mapEnginePlayersToLite(
  players: EnginePlayer[],
  profiles: Profile[]
): PlayerLiteType[] {
  const profMap = new Map<string, Profile>();
  for (const p of profiles) profMap.set(p.id, p);

  return players.map((p) => {
    const prof = profMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      avatarDataUrl: prof?.avatarDataUrl ?? undefined,
    } as PlayerLiteType;
  });
}

/* ===== Persist helpers ===== */
function makeX01RecordFromEngineCompat(args: {
  engine: {
    rules: {
      start: number;
      doubleOut: boolean;
      setsToWin?: number;
      legsPerSet?: number;
      outMode?: Mode;
      inMode?: Mode;
    };
    players: EnginePlayer[];
    scores: number[];
    currentIndex: number;
    dartsThisTurn: UIDart[];
    winnerId: string | null;
  };
  existingId?: string;
}): MatchRecord {
  const { engine, existingId } = args;
  const now = Date.now();

  const payload = {
    state: {
      rules: engine.rules,
      players: engine.players,
      scores: engine.scores,
      currentIndex: engine.currentIndex,
      dartsThisTurn: engine.dartsThisTurn,
      winnerId: engine.winnerId,
    },
    kind: "x01",
  };

  const rec: MatchRecord = {
    id: existingId ?? (crypto.randomUUID?.() ?? String(now)),
    kind: "x01",
    status: engine.winnerId ? "finished" : "in_progress",
    players: engine.players.map((p) => ({
      id: p.id,
      name: p.name,
    })) as any,
    winnerId: engine.winnerId,
    createdAt: now,
    updatedAt: now,
    payload: payload as any,
  };

  return rec;
}

async function safeSaveMatch({
  id,
  players,
  winnerId,
  summary,
  payload,
}: {
  id: string;
  players: { id: string; name?: string; avatarDataUrl?: string | null }[];
  winnerId: string | null;
  summary: {
    legs?: number;
    darts?: number;
    avg3ByPlayer?: Record<string, number>;
    bestVisitByPlayer?: Record<string, number>;
    bestCheckoutByPlayer?: Record<string, number>;
    co?: number;
  } | null;
  payload: any;
}) {
  try {
    const now = Date.now();

    await History.upsert({
      id,
      kind: "x01",
      status: "finished",
      players,
      winnerId,
      createdAt: now,
      updatedAt: now,
      summary: summary || null,
      payload,
    } as any);

    // Agg léger pour profils
    const { winnerId: w, perPlayer } = extractAggFromSavedMatch({
      id,
      players,
      winnerId,
      summary,
      payload,
    });

    if (perPlayer && Object.keys(perPlayer).length) {
      await addMatchSummary({ winnerId: w, perPlayer });
    }

    await History.list();
  } catch (e) {
    console.warn("[HIST:FAIL]", e);
  }
}

function SetLegChip({
  currentSet,
  currentLegInSet,
  setsTarget,
  legsTarget,
  useSets,
}: {
  currentSet: number;
  currentLegInSet: number;
  setsTarget: number;
  legsTarget: number;
  useSets: boolean;
}) {
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

  // ❌ Pas de notion de sets quand useSets=false → on n'affiche que les legs
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
