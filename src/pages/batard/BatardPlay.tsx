import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFullscreenPlay } from "../../hooks/useFullscreenPlay";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import Keypad from "../../components/Keypad";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";

import type { Dart as UIDart } from "../../lib/types";
import type { BatardConfig as BatardRulesConfig, BatardRound } from "../../lib/batard/batardTypes";
import { computeBatardReplaySnapshot, useBatardEngine } from "../../hooks/useBatardEngine";
import type { BatardConfigPayload } from "./BatardConfig";

import { History } from "../../lib/history";
import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";

const INFO_TEXT = `BÂTARD — basé sur BatardConfig
- Chaque round impose une contrainte (cible / bull / multiplicateur)
- scoreOnlyValid: si activé => tu scores uniquement les flèches valides
- minValidHitsToAdvance: nb minimum de hits valides pour avancer
- failPolicy: malus / recul rounds / freeze
`;

// ---------------- Constantes visuelles (align X01PlayV3) ----------------
const CONTENT_MAX = 520;

const miniCard: React.CSSProperties = {
  // ✅ Must never overflow outside the active-player block (phone safe)
  width: "clamp(150px, 42vw, 190px)",
  maxWidth: "100%",
  padding: 6,
  borderRadius: 12,
  overflow: "hidden",
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
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) max-content",
  gap: 8,
  alignItems: "center",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
  minWidth: 0,
  overflow: "hidden",
};

const miniRankName: React.CSSProperties = {
  fontWeight: 700,
  color: "#ffcf57",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const miniRankScore: React.CSSProperties = {
  fontWeight: 800,
  color: "#ffcf57",
  whiteSpace: "nowrap",
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function roundLabel(round: BatardRound | null, idx: number) {
  if (!round) return `Round #${idx + 1}`;

  if (round.type === "TARGET_BULL") {
    return `Round #${idx + 1} — BULL (${round.multiplierRule || "ANY"})`;
  }

  if (round.type === "ANY_SCORE") {
    const m = round.multiplierRule || "ANY";
    return `Round #${idx + 1} — SCORE LIBRE (${m})`;
  }

  // TARGET_NUMBER
  const t = typeof (round as any).target === "number" ? (round as any).target : "?";
  const m = round.multiplierRule || "ANY";
  return `Round #${idx + 1} — ${m} ${t}`;
}

function makeMatchId(prefix: string) {
  const ts = Date.now();
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function sumThrow(throwDarts: UIDart[] | undefined | null): number {
  if (!throwDarts || !Array.isArray(throwDarts)) return 0;
  return throwDarts.reduce((s, d) => s + dartValue(d), 0);
}

type LightPlayer = { id: string; name?: string; avatarDataUrl?: string | null; dartSetId?: string | null };

// -------------------------------------------------------------
// HeaderBlock — copie visuelle X01PlayV3 (adapté score croissant)
// -------------------------------------------------------------
type HeaderBlockProps = {
  currentPlayer: { id: string; name: string } | null;
  currentAvatar: string | null;
  currentScore: number;
  currentThrow: UIDart[];
  liveRanking: Array<{ id: string; name: string; score: number }>;
  curDarts: number;
  curM3D: string;
  bestVisit: number;
};

function HeaderBlock(props: HeaderBlockProps) {
  const { currentPlayer, currentAvatar, currentScore, currentThrow, liveRanking, curDarts, curM3D, bestVisit } = props;

  // Batard = score qui augmente : preview = score + volée en cours
  const scoreAfterAll = Math.max((currentScore ?? 0) + sumThrow(currentThrow), 0);

  // avatar en fond derrière le score
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
      {/* Dégradé gauche -> droite pour fondre l'avatar dans le fond */}
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
              background: "linear-gradient(180deg,#1b1b1f,#111114)",
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

          <div style={{ fontWeight: 900, fontSize: 17, color: "#ffcf57" }}>{currentPlayer?.name ?? "—"}</div>
          <div style={{ fontSize: 11.5, color: "#d9dbe3" }}>
            {liveRanking?.length ? (
              <>
                Leader : <b>{liveRanking[0]?.name}</b>
              </>
            ) : null}
          </div>

          {/* Mini card stats joueur actif */}
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
              {currentThrow.length > 0 ? (
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
          {/* BG ancré AU SCORE */}
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
                filter: "saturate(1.35) contrast(1.18) brightness(1.08) drop-shadow(-10px 0 26px rgba(0,0,0,.55))",
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
            {scoreAfterAll}
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
              const st = chipStyle(d, false);

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
                  <div style={miniRankName}>
                    {i + 1}. {r.name}
                  </div>
                  <div style={miniRankScore}>{r.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// BatardPlay
// -------------------------------------------------------------
export default function BatardPlay(props: any) {
  useFullscreenPlay();
  const { t } = useLang();
  useTheme();

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];

  const cfg: BatardConfigPayload =
    (props?.params?.config as BatardConfigPayload) ||
    (props?.config as BatardConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      presetId: "classic",
      batard: {
        presetId: "classic_bar",
        label: "Classic (Bar)",
        winMode: "SCORE_MAX",
        failPolicy: "NONE",
        failValue: 0,
        scoreOnlyValid: true,
        minValidHitsToAdvance: 1,
        rounds: [{ id: "r9", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" }],
      } as BatardRulesConfig,
    };

  // -----------------------------------------------------------
  // Resume (History) — rebuild from visits[] + saved config
  // -----------------------------------------------------------
  const resumeId: string | null =
    (props?.params?.resumeId as string) ||
    (props?.params?.matchId as string) ||
    (props?.resumeId as string) ||
    null;

  const [resumeLoaded, setResumeLoaded] = useState<boolean>(false);
  const [runtimeCfg, setRuntimeCfg] = useState<BatardConfigPayload>(cfg);
  const [engineResetKey, setEngineResetKey] = useState<number>(0);
  const [engineInit, setEngineInit] = useState<any | null>(null);

  // -----------------------------------------------------------
  // Players resolution (human profiles + bots) — from BatardConfig
  // -----------------------------------------------------------
  const lightPlayers: LightPlayer[] = useMemo(() => {
    const humans = (runtimeCfg.selectedHumanIds || []).filter(Boolean);
    const bots = runtimeCfg.botsEnabled ? (runtimeCfg.selectedBotIds || []).filter(Boolean) : [];

    // If config is empty (edge), fallback to first N store profiles.
    const fallbackHumans =
      humans.length > 0
        ? humans
        : storeProfiles
            .filter((p) => p && p.id != null && !(p.isBot === true))
            .slice(0, Math.max(2, runtimeCfg.players))
            .map((p) => String(p.id));

    const allIds = [...fallbackHumans, ...bots].slice(0, Math.max(2, runtimeCfg.players));

    return allIds.map((id) => {
      // bot pro?
      const bot = PRO_BOTS.find((b) => b.id === id);
      if (bot) {
        return {
          id,
          name: bot.displayName || id,
          avatarDataUrl: getProBotAvatar(bot.avatarKey || bot.id) || null,
          dartSetId: null,
        };
      }

      const prof = storeProfiles.find((p) => String(p?.id) === String(id));
      return {
        id: String(id),
        name: prof?.name || prof?.displayName || String(id),
        avatarDataUrl: prof?.avatarDataUrl ?? null,
        dartSetId: (prof as any)?.dartSetId ?? (prof as any)?.activeDartSetId ?? null,
      };
    });
  }, [runtimeCfg.selectedHumanIds, runtimeCfg.selectedBotIds, runtimeCfg.botsEnabled, runtimeCfg.players, storeProfiles]);

  const playerIds = useMemo(() => lightPlayers.map((p) => p.id), [lightPlayers]);

  // -----------------------------------------------------------
  // Engine
  // -----------------------------------------------------------
  const { states, ranking, currentPlayerIndex, currentRound, submitVisit, finished, winnerId, turnCounter } =
    useBatardEngine(playerIds, runtimeCfg.batard, { resetKey: engineResetKey, initialSnapshot: engineInit });

  const active = states[currentPlayerIndex];
  const activeRoundIdx = active?.roundIndex ?? 0;

  // -----------------------------------------------------------
  // Persistence (History)
  // - In progress: upsert after each visit
  // - Finished: upsert once with summary + payload
  // -----------------------------------------------------------
  const matchIdRef = useRef<string>((props?.params?.matchId as string) || makeMatchId("batard"));
  const createdAtRef = useRef<number>(Date.now());
  const visitsRef = useRef<any[]>([]);
  const didSaveFinishedRef = useRef<boolean>(false);

  // Load resume match from History (if provided)
  useEffect(() => {
    let cancelled = false;
    if (!resumeId || resumeLoaded) return;
    (async () => {
      try {
        const rec: any = await History.get(resumeId);
        if (!rec || cancelled) {
          setResumeLoaded(true);
          return;
        }

        const payload = (rec as any).payload || (rec as any).decoded || null;
        const savedCfg = payload?.config || null;
        const savedVisits = Array.isArray(payload?.visits) ? payload.visits : [];

        // restore match id + createdAt
        if (rec?.id) matchIdRef.current = String(rec.id);
        if (payload?.createdAt) createdAtRef.current = Number(payload.createdAt) || createdAtRef.current;

        // restore visits for bestVisit/summary consistency
        visitsRef.current = savedVisits;

        // apply config from saved match (prefer saved players list)
        if (savedCfg) {
          // savedCfg.players may already be LightPlayer[]
          const maybePlayers = Array.isArray(savedCfg.players) ? savedCfg.players : null;
          if (maybePlayers && maybePlayers.length) {
            // keep same shape as BatardConfigPayload expects (players count etc.)
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any), players: maybePlayers.length }));
          } else {
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any) }));
          }
        }

        // build engine init snapshot
        const ids: string[] = Array.isArray(savedCfg?.players)
          ? savedCfg.players.map((p: any) => String(p.id))
          : lightPlayers.map((p) => p.id);

        const snap = computeBatardReplaySnapshot(ids, (savedCfg?.batard || runtimeCfg.batard) as any, savedVisits);
        setEngineInit(snap);
        setEngineResetKey((k) => k + 1);
      } catch (e) {
        console.warn("[BatardPlay] resume load failed", e);
      } finally {
        if (!cancelled) setResumeLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  function buildSummaryFromStates(finalStates: any[]) {
    const dartsByPlayer: Record<string, number> = {};
    const pointsByPlayer: Record<string, number> = {};
    const turnsByPlayer: Record<string, number> = {};
    const avg3ByPlayer: Record<string, number> = {};
    const failsByPlayer: Record<string, number> = {};
    const validHitsByPlayer: Record<string, number> = {};
    const advancesByPlayer: Record<string, number> = {};
    const bestVisitByPlayer: Record<string, number> = {};

    // best visit: from payload.visits if present
    try {
      for (const v of visitsRef.current) {
        const pid = String(v?.p || "");
        if (!pid) continue;
        const sc = Number(v?.score || 0);
        bestVisitByPlayer[pid] = Math.max(Number(bestVisitByPlayer[pid] || 0), sc);
      }
    } catch {}

    for (const p of finalStates || []) {
      const pid = String(p.id);
      const darts = Number(p?.stats?.dartsThrown || 0);
      const pts = Number(p?.stats?.pointsAdded || 0);
      const turns = Number(p?.stats?.turns || 0);
      const a3 = darts > 0 ? (pts / darts) * 3 : 0;

      dartsByPlayer[pid] = darts;
      pointsByPlayer[pid] = pts;
      turnsByPlayer[pid] = turns;
      avg3ByPlayer[pid] = a3;

      failsByPlayer[pid] = Number(p?.stats?.fails || 0);
      validHitsByPlayer[pid] = Number(p?.stats?.validHits || 0);
      advancesByPlayer[pid] = Number(p?.stats?.advances || 0);
    }

    return {
      matchId: matchIdRef.current,
      mode: "batard",
      presetId: runtimeCfg.presetId,
      batardPresetId: (runtimeCfg.batard as any)?.presetId,
      status: finished ? "finished" : "in_progress",

      // maps (compat deriveHistoryStats + statsBridge)
      darts: dartsByPlayer,
      pointsByPlayer,
      dartsByPlayer,
      turnsByPlayer,
      avg3ByPlayer,
      bestVisitByPlayer,

      // batard specifics
      failsByPlayer,
      validHitsByPlayer,
      advancesByPlayer,

      turns: turnCounter,
      winMode: runtimeCfg.batard.winMode,
      failPolicy: runtimeCfg.batard.failPolicy,
      failValue: runtimeCfg.batard.failValue,
      scoreOnlyValid: runtimeCfg.batard.scoreOnlyValid,
      minValidHitsToAdvance: runtimeCfg.batard.minValidHitsToAdvance,
    };
  }

  async function upsertHistory(status: "in_progress" | "finished") {
    const matchId = matchIdRef.current;
    const createdAt = createdAtRef.current;
    const updatedAt = Date.now();

    const summary = buildSummaryFromStates(states as any);
    // ✅ DartSet (best-effort) — utile pour Stats par fléchettes
    const dartSetId = (() => {
      try {
        const ids = (lightPlayers as any[]).map((p) => (p as any)?.dartSetId).filter((x) => typeof x === "string" && String(x).trim());
        if (!ids.length) return null;
        const uniq = Array.from(new Set(ids.map((x) => String(x).trim())));
        return uniq.length === 1 ? uniq[0] : null;
      } catch {
        return null;
      }
    })();
    const dartSetIdsByPlayer = (() => {
      try {
        const out: Record<string, string | null> = {};
        (lightPlayers as any[]).forEach((p) => {
          const pid = String((p as any)?.id ?? "");
          if (!pid) return;
          const v = (p as any)?.dartSetId;
          out[pid] = typeof v === "string" && v.trim() ? v.trim() : null;
        });
        return out;
      } catch {
        return {};
      }
    })();

    // ✅ Unified lightweight stats block for StatsHub aggregation
    const unifiedStats = (() => {
      try {
        const pointsByPlayer = (summary as any)?.pointsByPlayer || {};
        const dartsByPlayer = (summary as any)?.dartsByPlayer || (summary as any)?.darts || {};
        const turnsByPlayer = (summary as any)?.turnsByPlayer || {};
        const avg3ByPlayer = (summary as any)?.avg3ByPlayer || {};
        const failsByPlayer = (summary as any)?.failsByPlayer || {};
        const validHitsByPlayer = (summary as any)?.validHitsByPlayer || {};
        const advancesByPlayer = (summary as any)?.advancesByPlayer || {};
        const bestVisitByPlayer = (summary as any)?.bestVisitByPlayer || {};

        return {
          sport: "batard",
          mode: "batard",
          players: (lightPlayers as any[]).map((p) => {
            const pid = String((p as any)?.id ?? "");
            return {
              id: pid,
              name: String((p as any)?.name ?? (p as any)?.label ?? ""),
              win: status === "finished" ? pid === String(winnerId || "") : undefined,
              score: Number(pointsByPlayer?.[pid] ?? 0) || 0,
              darts: {
                thrown: Number(dartsByPlayer?.[pid] ?? 0) || 0,
              },
              averages: {
                avg3d: Number(avg3ByPlayer?.[pid] ?? 0) || 0,
              },
              special: {
                turns: Number(turnsByPlayer?.[pid] ?? 0) || 0,
                fails: Number(failsByPlayer?.[pid] ?? 0) || 0,
                validHits: Number(validHitsByPlayer?.[pid] ?? 0) || 0,
                advances: Number(advancesByPlayer?.[pid] ?? 0) || 0,
                bestVisit: Number(bestVisitByPlayer?.[pid] ?? 0) || 0,
              },
            };
          }),
          global: {
            duration: Number(updatedAt - createdAt) || 0,
            turns: Number(turnCounter || 0) || 0,
          },
        };
      } catch {
        return { sport: "batard", mode: "batard", players: [], global: {} };
      }
    })();

    const payload = {
      matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,

      dartSetId,
      meta: { dartSetId, dartSetIdsByPlayer },

      stats: unifiedStats,

      // store light config only (safe + stable)
      config: {
        ...runtimeCfg,
        players: lightPlayers,
      },

      // replay-friendly visits
      visits: visitsRef.current,

      // snapshot final states for summary / debug
      states: states,

      winnerId: status === "finished" ? winnerId : null,
    };

    const record: any = {
      id: matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,
      players: lightPlayers,
      winnerId: status === "finished" ? winnerId : null,
      summary,
      payload,
    };

    try {
      await History.upsert(record);
    } catch (e) {
      console.warn("[BatardPlay] History.upsert failed", e);
    }
  }

  // -----------------------------------------------------------
  // UI local state (keypad)
  // -----------------------------------------------------------
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  function goBack() {
    // demandé: BackDot doit revenir au menu Games de darts (pas gameselect)
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  // Keypad handlers
  const onNumber = (v: number) => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v, mult: multiplier, label: `${multiplier}x${v}` }]);
  };

  const onBull = () => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier, label: multiplier === 2 ? "DBULL" : "BULL" }]);
  };

  const onUndo = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => prev.slice(0, -1));
  };

  const onCancel = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const onValidate = () => {
    if (finished) return;

    const darts = [...currentThrow];
    const pid = String((states[currentPlayerIndex] as any)?.id || playerIds[currentPlayerIndex] || "");

    // compute visit score (for bestVisit + replay)
    const sc = darts.reduce((s, d) => s + Number((d.v || 0) * (d.mult || 1)), 0);

    visitsRef.current.push({
      p: pid,
      darts: darts.map((d) => ({ v: d.v, mult: d.mult })),
      score: sc,
      ts: Date.now(),
      roundIndexBefore: (states[currentPlayerIndex] as any)?.roundIndex ?? 0,
    });

    submitVisit(darts);

    setCurrentThrow([]);
    setMultiplier(1);
    setInfoMsg(null);
  };

  // Autosave: after each turnCounter change, persist in_progress (unless finished)
  const lastSavedTurnRef = useRef<number>(-1);
  useEffect(() => {
    if (finished) return;
    if (turnCounter === lastSavedTurnRef.current) return;
    lastSavedTurnRef.current = turnCounter;

    // only save after at least one turn (avoid junk record on open)
    if (turnCounter <= 0) return;

    upsertHistory("in_progress");
  }, [turnCounter, finished]);

  // Save finished once
  useEffect(() => {
    if (!finished) return;
    if (didSaveFinishedRef.current) return;
    didSaveFinishedRef.current = true;

    upsertHistory("finished");
  }, [finished]);

  // winner memo
  const winner = useMemo(() => {
    if (!finished || !winnerId) return null;
    const w = states.find((p) => p.id === winnerId) || null;
    return w ? { id: (w as any).id, score: (w as any).score } : null;
  }, [finished, winnerId, states]);

  // -----------------------------------------------------------
  // X01-like header derived values
  // -----------------------------------------------------------
  const activeId = String((states[currentPlayerIndex] as any)?.id || playerIds[currentPlayerIndex] || "");
  const activeLP = lightPlayers.find((p) => String(p.id) === activeId) || null;
  const activeName = String(activeLP?.name || activeId || "—");
  const activeAvatar = (activeLP?.avatarDataUrl as any) || null;
  const activeScore = Number((states[currentPlayerIndex] as any)?.score ?? 0) || 0;
  const activeDarts = Number((states[currentPlayerIndex] as any)?.stats?.dartsThrown ?? 0) || 0;
  const activeM3D = activeDarts > 0 ? ((activeScore / activeDarts) * 3).toFixed(1) : "0.0";
  const activeBestVisit = (() => {
    try {
      let best = 0;
      for (const v of visitsRef.current || []) {
        if (String(v?.p || "") !== activeId) continue;
        const sc = Number(v?.score || 0);
        if (sc > best) best = sc;
      }
      return best;
    } catch {
      return 0;
    }
  })();

  const liveRanking = useMemo(() => {
    const src: any[] = Array.isArray(ranking) && ranking.length ? ranking : Array.isArray(states) ? states : [];
    const arr = src
      .map((p: any) => {
        const pid = String(p?.id ?? "");
        const lp = lightPlayers.find((x) => String(x.id) === pid);
        return {
          id: pid,
          name: String(lp?.name || pid || "—"),
          score: Number(p?.score ?? 0) || 0,
        };
      })
      .filter((x) => x.id);
    arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    return arr;
  }, [ranking, states, lightPlayers]);

  return (
    <div className="page">
      <PageHeader
        title="BÂTARD"
        tickerSrc={tickerBatard}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="BÂTARD" content={INFO_TEXT} />}
      />

      <Section title={t("game.status", "Statut")}>
        <div style={{ maxWidth: CONTENT_MAX, margin: "0 auto" }}>
          <HeaderBlock
            currentPlayer={{ id: activeId, name: activeName }}
            currentAvatar={activeAvatar}
            currentScore={activeScore}
            currentThrow={currentThrow}
            liveRanking={liveRanking}
            curDarts={activeDarts}
            curM3D={activeM3D}
            bestVisit={activeBestVisit}
          />

          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12, lineHeight: 1.35 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800 }}>{roundLabel(currentRound as any, activeRoundIdx)}</div>
              <div>
                <b>winMode</b>: {runtimeCfg.batard.winMode} — <b>fail</b>: {runtimeCfg.batard.failPolicy}
                {runtimeCfg.batard.failPolicy !== "NONE" ? ` (${runtimeCfg.batard.failValue})` : ""}
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <b>scoreOnlyValid</b>: {String(runtimeCfg.batard.scoreOnlyValid)} — <b>minValidHitsToAdvance</b>:{" "}
              {runtimeCfg.batard.minValidHitsToAdvance}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {states.map((p, idx) => {
            const lp = lightPlayers.find((x) => x.id === (p as any).id);
            return (
              <div
                key={(p as any).id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: idx === currentPlayerIndex ? "rgba(255,215,0,0.10)" : "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>{lp?.name || (p as any).id}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    Round {Math.min((p as any).roundIndex + 1, runtimeCfg.batard.rounds.length)}/{runtimeCfg.batard.rounds.length}
                  </div>
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{(p as any).score}</div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
                  <span>🎯 hits: {(p as any).stats?.validHits}</span>
                  <span>🧮 tours: {(p as any).stats?.turns}</span>
                  <span>⚠️ fails: {(p as any).stats?.fails}</span>
                </div>

                {(p as any).lastVisit && (p as any).lastVisit.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                    Dernier tour:{" "}
                    {(p as any).lastVisit.map((d: any, i: number) => (
                      <span key={i} style={{ marginRight: 8 }}>
                        {d.mult}×{d.v}
                      </span>
                    ))}
                    <span style={{ marginLeft: 8, fontWeight: 800 }}>
                      ({(p as any).lastValidHits} hit{(p as any).lastValidHits === 1 ? "" : "s"})
                    </span>
                    {(p as any).lastAdvanced ? (
                      <span style={{ marginLeft: 8, fontWeight: 800 }}>✅</span>
                    ) : (
                      <span style={{ marginLeft: 8, fontWeight: 800 }}>❌</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {infoMsg && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
            {infoMsg}
          </div>
        )}
      </Section>

      {finished && winner ? (
        <Section title="🏁 Fin de partie">
          <div style={{ fontWeight: 900, fontSize: 22 }}>
            Gagnant: {lightPlayers.find((p) => p.id === winner.id)?.name || winner.id} — {winner.score} pts
          </div>

          <div style={{ marginTop: 12, opacity: 0.9, fontSize: 13 }}>
            Classement:
            <ol style={{ marginTop: 8 }}>
              {ranking.map((p: any) => (
                <li key={p.id}>
                  {lightPlayers.find((x) => x.id === p.id)?.name || p.id} — {p.score} pts (fails {p.stats.fails}, turns {p.stats.turns})
                </li>
              ))}
            </ol>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => props?.setTab?.("statsHub", { tab: "history" })}>
              Historique
            </button>
            <button className="btn" onClick={() => props?.setTab?.("batard_config")}>
              Rejouer / Reconfigurer
            </button>
          </div>
        </Section>
      ) : (
        <div style={{ paddingBottom: 120 }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onNumber={onNumber}
            onBull={onBull}
            onUndo={onUndo}
            onCancel={onCancel}
            onValidate={onValidate}
            hidePreview={false}
          />
        </div>
      )}
    </div>
  );
}
