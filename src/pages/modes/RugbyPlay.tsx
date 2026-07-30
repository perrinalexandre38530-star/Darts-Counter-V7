import React, { useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Dart as UIDart } from "../lib/types";
import { History } from "../lib/history";
import {
  buildDartsTelemetry,
  canonicalVisitFromUiDarts,
  scoreDarts,
} from "../lib/dartsTelemetry";

type BotLevel = "easy" | "normal" | "hard";
type Config = {
  players: number | any[];
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
  scoreInputMethod?: string | null;
  inputMethod?: string | null;
};

const INFO_TEXT = `MVP : base jouable. Version complète : points selon actions.
Chaque volée est conservée fléchette par fléchette avec S / D / T / BULL / DBULL / MISS.`;

function normalizePlayers(config: Config, params: any) {
  const explicit = params?.players ?? config?.players;
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((player: any, index: number) => ({
      id: String(player?.id ?? player?.profileId ?? `p${index + 1}`),
      name: String(player?.name ?? player?.displayName ?? `Joueur ${index + 1}`),
      avatarDataUrl: player?.avatarDataUrl ?? player?.avatarUrl ?? null,
    }));
  }

  const count = Math.max(1, Math.min(12, Number(explicit) || 2));
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Joueur ${index + 1}`,
    avatarDataUrl: null,
  }));
}

export default function RugbyPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: Config =
    (props?.params?.config as Config) ||
    (props?.config as Config) ||
    {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 25,
    };

  const players = useMemo(() => normalizePlayers(cfg, props?.params), [cfg, props?.params]);
  const rounds = Math.max(1, Number(cfg?.rounds) || 10);

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => players.map(() => 0));
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const matchIdRef = useRef(
    `rugby-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const createdAtRef = useRef(Date.now());
  const visitsRef = useRef<any[]>([]);

  const isFinished = roundIdx >= rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    let best = -Infinity;
    let winnerIndex = 0;
    for (let index = 0; index < scores.length; index += 1) {
      if (scores[index] > best) {
        best = scores[index];
        winnerIndex = index;
      }
    }
    return {
      idx: winnerIndex,
      id: String(players[winnerIndex]?.id ?? `p${winnerIndex + 1}`),
      score: best,
    };
  }, [isFinished, players, scores]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function buildRecord(
    status: "in_progress" | "finished",
    nextScores: number[],
    nextPlayerIdx: number,
    nextRoundIdx: number,
    winnerId: string | null,
  ) {
    const now = Date.now();
    const record: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "rugby",
      sport: "darts",
      status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      finishedAt: status === "finished" ? now : undefined,
      players: players.map((player: any) => ({
        id: player.id,
        name: player.name,
        avatarDataUrl: player.avatarDataUrl ?? null,
      })),
      winnerId,
      game: {
        mode: "rugby",
        rounds,
        objective: Number(cfg?.objective) || 25,
      },
      summary: {
        title: "RUGBY",
        finished: status === "finished",
        winnerId,
        rounds,
        finalScores: Object.fromEntries(
          players.map((player: any, index: number) => [
            player.id,
            Number(nextScores[index] || 0),
          ])
        ),
      },
      payload: {
        kind: "rugby",
        mode: "rugby",
        sport: "darts",
        config: cfg,
        scores: nextScores,
        playerIdx: nextPlayerIdx,
        roundIdx: nextRoundIdx,
        visitHistory: visitsRef.current.slice(),
        events: visitsRef.current.slice(),
      },
    };

    const telemetry = buildDartsTelemetry(record, record.payload);
    if (telemetry) {
      record.payload.telemetry = telemetry;
      record.payload.dartTelemetry = telemetry;
      record.summary.hitSummary = {
        ...telemetry.totals,
        byPlayer: telemetry.perPlayer,
      };
      record.summary.perPlayer = telemetry.perPlayer;
      record.summary.telemetryExact = true;
      record.summary.telemetryCoverage = "full";
    }
    return record;
  }

  function persist(
    status: "in_progress" | "finished",
    nextScores: number[],
    nextPlayerIdx: number,
    nextRoundIdx: number,
    winnerId: string | null,
  ) {
    const record = buildRecord(
      status,
      nextScores,
      nextPlayerIdx,
      nextRoundIdx,
      winnerId,
    );
    void History.upsert(record).catch((error: any) => {
      console.warn("[rugby] history persistence failed", error);
    });
  }

  function appendDart(dart: UIDart) {
    setCurrentThrow((previous) =>
      previous.length >= 3 ? previous : [...previous, dart]
    );
  }

  function validate() {
    if (isFinished || !currentThrow.length || !players.length) return;

    const exactDarts = currentThrow.slice(0, 3);
    const visitScore = Math.max(0, Math.min(180, scoreDarts(exactDarts)));
    const player = players[playerIdx];
    const playerId = String(player?.id ?? `p${playerIdx + 1}`);
    const playerVisitIndex = visitsRef.current.filter(
      (visit: any) => String(visit?.playerId) === playerId
    ).length;

    visitsRef.current.push(canonicalVisitFromUiDarts({
      playerId,
      darts: exactDarts,
      visitIndex: playerVisitIndex,
      roundIndex: roundIdx,
      source: "rugby",
    }));

    const nextScores = scores.slice();
    nextScores[playerIdx] = Number(nextScores[playerIdx] || 0) + visitScore;

    const nextPlayer = (playerIdx + 1) % players.length;
    const nextRound = nextPlayer === 0 ? roundIdx + 1 : roundIdx;
    const finishedNow = nextRound >= rounds;

    let winnerId: string | null = null;
    if (finishedNow) {
      const best = Math.max(...nextScores);
      const winnerIndex = nextScores.indexOf(best);
      winnerId = String(players[winnerIndex]?.id ?? `p${winnerIndex + 1}`);
    }

    setScores(nextScores);
    setCurrentThrow([]);
    setMultiplier(1);
    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);

    persist(
      finishedNow ? "finished" : "in_progress",
      nextScores,
      nextPlayer,
      nextRound,
      winnerId,
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="RUGBY"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles RUGBY" content={INFO_TEXT} />}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, rounds)}/{rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                Rugby (MVP)
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.player", "JOUEUR")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : `${playerIdx + 1}/${players.length}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {scores.map((score, index) => {
            const active = !isFinished && index === playerIdx;
            return (
              <div
                key={players[index]?.id ?? index}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active
                    ? "1px solid rgba(120,255,200,0.35)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: active
                    ? "rgba(120,255,200,0.10)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {players[index]?.name ?? `${t("generic.player", "Joueur")} ${index + 1}`}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>
                  {score}
                </div>
              </div>
            );
          })}
        </div>

        {!isFinished && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.visit", "VOLÉE")} — S / D / T / BULL / DBULL / MISS
            </div>

            <div style={{ marginTop: 10 }}>
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
                onNumber={(number: number) =>
                  appendDart({ v: number, mult: multiplier } as UIDart)
                }
                onBull={() =>
                  appendDart({
                    v: 25,
                    mult: multiplier === 2 ? 2 : 1,
                  } as UIDart)
                }
                onMiss={() => appendDart({ v: 0, mult: 0 } as UIDart)}
                onDirectDart={appendDart}
                onSetVisitDarts={(darts: UIDart[]) =>
                  setCurrentThrow((darts || []).slice(0, 3))
                }
                onValidate={validate}
                preferredMethod={cfg?.scoreInputMethod ?? cfg?.inputMethod ?? null}
                compact
                fitToParent
              />
            </div>
          </div>
        )}

        {isFinished && winner && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,215,100,0.35)",
              background: "rgba(255,215,100,0.12)",
              fontWeight: 1000,
            }}
          >
            {t("generic.winner", "Gagnant")} : {players[winner.idx]?.name ?? `${t("generic.player", "Joueur")} ${winner.idx + 1}`} — {winner.score}
          </div>
        )}
      </div>
    </div>
  );
}
