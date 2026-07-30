// @ts-nocheck
// =============================================================
// src/pages/modes/DartsModePlay.tsx
// Play générique pour les nouveaux modes (base scoring)
// UI historique conservée + journal exact S / D / T / BULL / DBULL / MISS.
// =============================================================
import React from "react";
import InfoDot from "../../components/InfoDot";
import ScoreInputHub from "../../components/ScoreInputHub";
import { getModeById } from "../../lib/dartsModesCatalog";
import type { Dart as UIDart } from "../../lib/types";
import { History } from "../../lib/history";
import {
  buildDartsTelemetry,
  canonicalVisitFromUiDarts,
  scoreDarts,
} from "../../lib/dartsTelemetry";

function normalizePlayers(cfg: any) {
  const configured = cfg?.players;
  if (Array.isArray(configured) && configured.length) {
    return configured.map((p: any, index: number) => ({
      id: String(p?.id ?? p?.profileId ?? `p${index + 1}`),
      name: String(p?.name ?? p?.displayName ?? `Joueur ${index + 1}`),
      avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null,
    }));
  }
  const count = Math.max(1, Math.min(12, Number(configured) || Number(cfg?.playersCount) || 2));
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Joueur ${index + 1}`,
    avatarDataUrl: null,
  }));
}

export default function DartsModePlay({ go, gameId, config }) {
  const mode = getModeById(gameId);
  const cfg = config ?? (() => {
    try {
      return JSON.parse(localStorage.getItem(`dc_modecfg_${gameId}`) || "null");
    } catch {
      return null;
    }
  })() ?? {};

  const players = React.useMemo(() => normalizePlayers(cfg), [cfg]);
  const rounds = Math.max(1, Number(cfg?.rounds ?? mode?.defaultRounds ?? 10) || 10);
  const targetScore = Math.max(0, Number(cfg?.targetScore) || 0);

  const [active, setActive] = React.useState(0);
  const [roundIdx, setRoundIdx] = React.useState(1);
  const [scores, setScores] = React.useState(() => players.map(() => 0));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [finished, setFinished] = React.useState(false);

  const matchIdRef = React.useRef(
    `${String(gameId || "darts_mode")}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const createdAtRef = React.useRef(Date.now());
  const visitsRef = React.useRef<any[]>([]);

  React.useEffect(() => {
    setScores((previous) => {
      if (previous.length === players.length) return previous;
      return players.map((_: any, index: number) => Number(previous[index] || 0));
    });
  }, [players.length]);

  const buildRecord = React.useCallback((
    status: "in_progress" | "finished",
    nextScores: number[],
    nextActive: number,
    nextRound: number,
    winnerId: string | null,
  ) => {
    const now = Date.now();
    const rec: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: String(gameId || "darts_mode"),
      sport: "darts",
      status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      finishedAt: status === "finished" ? now : undefined,
      players: players.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
      })),
      winnerId,
      game: {
        mode: String(gameId || "darts_mode"),
        rounds,
        targetScore: targetScore || null,
      },
      summary: {
        title: mode?.label ?? "MODE DARTS",
        finished: status === "finished",
        winnerId,
        rounds,
        finalScores: Object.fromEntries(
          players.map((p: any, index: number) => [p.id, Number(nextScores[index] || 0)])
        ),
      },
      payload: {
        kind: String(gameId || "darts_mode"),
        mode: String(gameId || "darts_mode"),
        sport: "darts",
        config: cfg,
        scores: nextScores,
        activePlayerIndex: nextActive,
        roundIdx: nextRound,
        visitHistory: visitsRef.current.slice(),
        events: visitsRef.current.slice(),
      },
    };

    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) {
      rec.payload.telemetry = telemetry;
      rec.payload.dartTelemetry = telemetry;
      rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      rec.summary.perPlayer = telemetry.perPlayer;
      rec.summary.telemetryExact = true;
      rec.summary.telemetryCoverage = "full";
    }
    return rec;
  }, [cfg, gameId, mode?.label, players, rounds, targetScore]);

  const persist = React.useCallback((
    status: "in_progress" | "finished",
    nextScores: number[],
    nextActive: number,
    nextRound: number,
    winnerId: string | null,
  ) => {
    const record = buildRecord(status, nextScores, nextActive, nextRound, winnerId);
    void History.upsert(record).catch((error: any) => {
      console.warn(`[${String(gameId || "darts_mode")}] history persistence failed`, error);
    });
  }, [buildRecord, gameId]);

  function appendDart(dart: UIDart) {
    setCurrentThrow((previous) => previous.length >= 3 ? previous : [...previous, dart]);
  }

  function commit(darts: UIDart[]) {
    if (finished || !players.length || !Array.isArray(darts) || !darts.length) return;

    const exactDarts = darts.slice(0, 3);
    const value = Math.max(0, Math.min(180, scoreDarts(exactDarts)));
    const player = players[active];
    const playerId = String(player?.id ?? `p${active + 1}`);
    const playerVisitIndex = visitsRef.current.filter(
      (visit: any) => String(visit?.playerId) === playerId
    ).length;

    visitsRef.current.push(canonicalVisitFromUiDarts({
      playerId,
      darts: exactDarts,
      visitIndex: playerVisitIndex,
      roundIndex: Math.max(0, roundIdx - 1),
      source: String(gameId || "darts_mode"),
    }));

    const nextScores = scores.slice();
    nextScores[active] = Number(nextScores[active] || 0) + value;

    const isLastPlayer = active >= players.length - 1;
    const nextActive = isLastPlayer ? 0 : active + 1;
    const nextRound = isLastPlayer ? roundIdx + 1 : roundIdx;

    let winnerIndex = -1;
    if (targetScore > 0 && nextScores[active] >= targetScore) {
      winnerIndex = active;
    } else if (isLastPlayer && roundIdx >= rounds) {
      const best = Math.max(...nextScores);
      winnerIndex = nextScores.indexOf(best);
    }

    setScores(nextScores);
    setCurrentThrow([]);
    setMultiplier(1);

    if (winnerIndex >= 0) {
      const winnerId = String(players[winnerIndex]?.id ?? `p${winnerIndex + 1}`);
      setFinished(true);
      persist("finished", nextScores, nextActive, nextRound, winnerId);

      if (targetScore > 0 && winnerIndex === active && nextScores[active] >= targetScore) {
        alert(`${players[active]?.name ?? "Joueur"} a atteint ${targetScore} !`);
      } else {
        alert(`Fin ! Vainqueur: ${players[winnerIndex]?.name ?? "Joueur"} (${nextScores[winnerIndex]})`);
      }
      go("home");
      return;
    }

    setActive(nextActive);
    setRoundIdx(nextRound);
    persist("in_progress", nextScores, nextActive, nextRound, null);
  }

  const T = {
    text: "#fff",
    sub: "rgba(255,255,255,0.72)",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    accent: "#f3c76a",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      overflowY: "auto",
      background: "radial-gradient(1100px 700px at 50% -10%, rgba(243,199,106,0.18), rgba(0,0,0,0) 60%), linear-gradient(180deg,#05060a,#070811 55%,#05060a)",
      color: T.text,
      display: "flex",
      flexDirection: "column",
      padding: 10,
      gap: 10,
    }}>
      {/* Header historique conservé */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 4px 0",
      }}>
        <div>
          <div style={{ fontWeight: 950, color: T.accent, fontSize: 18 }}>
            {mode?.label ?? "Mode"}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
            Round {Math.min(roundIdx, rounds)}/{rounds}
            {targetScore ? ` • Objectif ${targetScore}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <InfoDot title={mode?.infoTitle ?? "Regles"} body={mode?.infoBody ?? ""} />
          <button onClick={() => go("home")} style={{
            border: `1px solid ${T.border}`,
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 900,
          }}>
            Quitter
          </button>
        </div>
      </div>

      {/* Scoreboard historique conservé */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {players.map((player: any, index: number) => {
          const isActive = index === active && !finished;
          return (
            <div key={player.id ?? index} style={{
              background: T.card,
              border: `1px solid ${isActive ? "rgba(243,199,106,0.55)" : T.border}`,
              borderRadius: 16,
              padding: 12,
              boxShadow: isActive ? "0 18px 40px rgba(0,0,0,0.45)" : "none",
            }}>
              <div style={{
                fontWeight: 950,
                letterSpacing: 0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {player.name ?? "Joueur"}
              </div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 950 }}>
                {scores[index] ?? 0}
              </div>
              {isActive && (
                <div style={{ marginTop: 6, fontSize: 12, color: T.sub }}>
                  Joueur actif
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Saisie exacte : aucune volée agrégée ambiguë */}
      {!finished && (
        <div style={{
          marginTop: "auto",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 12,
        }}>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>
            Volée exacte — S / D / T / BULL / DBULL / MISS
          </div>
          <ScoreInputHub
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onCancel={() => {
              setCurrentThrow([]);
              setMultiplier(1);
            }}
            onBackspace={() => setCurrentThrow((previous) => previous.slice(0, -1))}
            onNumber={(number: number) => appendDart({ v: number, mult: multiplier } as UIDart)}
            onBull={() => appendDart({
              v: 25,
              mult: multiplier === 2 ? 2 : 1,
            } as UIDart)}
            onMiss={() => appendDart({ v: 0, mult: 0 } as UIDart)}
            onDirectDart={appendDart}
            onSetVisitDarts={(darts: UIDart[]) => setCurrentThrow((darts || []).slice(0, 3))}
            onValidate={() => commit(currentThrow)}
            preferredMethod={cfg?.scoreInputMethod ?? cfg?.inputMethod ?? null}
            compact
            fitToParent
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={() => {
              setCurrentThrow([]);
              setMultiplier(1);
            }} style={{
              border: `1px solid ${T.border}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 900,
            }}>
              Effacer
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => go("darts_mode_config", { gameId })} style={{
              border: `1px solid ${T.border}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 900,
            }}>
              Configurer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
