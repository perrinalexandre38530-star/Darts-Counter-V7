// =============================================================
// src/pages/babyfoot/BabyFootPlay.tsx
// Baby-Foot — Play (LOCAL ONLY)
// Refonte UI match premium inspirée Pétanque + X01 sets
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useStore } from "../../contexts/StoreContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import ProfileAvatar from "../../components/ProfileAvatar";
import BabyFootEndGameSummary from "../../components/BabyFootEndGameSummary";
import BabyFootSetsBar from "../../components/BabyFootSetsBar";
import BabyFootDuelScoreCard from "../../components/babyfoot/BabyFootDuelScoreCard";
import BabyFootLiveHeader from "../../components/babyfoot/BabyFootLiveHeader";
import BabyFootLiveStatsCard from "../../components/babyfoot/BabyFootLiveStatsCard";
import BabyFootPhasePanel from "../../components/babyfoot/BabyFootPhasePanel";
import BabyFootTeamCard from "../../components/babyfoot/BabyFootTeamCard";

import { sendCastSnapshot } from "../../cast/googleCast";
import {
  addGoal,
  addPenaltyShot,
  computeDurationMs,
  finishByTime,
  loadBabyFootState,
  startIfNeeded,
  startMatch,
  undo as undoGoal,
  type BabyFootEvent,
  type BabyFootState,
  type BabyFootTeamId,
} from "../../lib/babyfootStore";

const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function pickTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const candidate of candidates) {
    const suffixA = `/ticker_${candidate}.png`;
    const suffixB = `/ticker-${candidate}.png`;
    for (const key of Object.keys(TICKERS)) {
      if (key.endsWith(suffixA) || key.endsWith(suffixB)) return TICKERS[key];
    }
  }
  return null;
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

type ProfileLike = { id?: string; name?: string; avatarDataUrl?: string | null; avatarUrl?: string | null } | null;

type GoalLikeEvent = Extract<BabyFootEvent, { t: "goal" }>;
type FinishLikeEvent = Extract<BabyFootEvent, { t: "finish" }>;

type ReconstructedScore = { scoreA: number; scoreB: number };

function tourResultKey(tournamentId: unknown, matchId: unknown) {
  return `bf_tour_result_${String(tournamentId || "")}_${String(matchId || "")}`;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function lastPhaseAt(state: BabyFootState, phase: string) {
  const reversed = [...(state.events || [])].reverse();
  const found = reversed.find((event) => event?.t === "phase" && event?.phase === phase);
  return found?.at ?? null;
}

function getGoalEvents(events: BabyFootEvent[]) {
  return events.filter((event): event is GoalLikeEvent => event.t === "goal");
}

function getFinishEvent(events: BabyFootEvent[]) {
  const reversed = [...events].reverse();
  return reversed.find((event): event is FinishLikeEvent => event.t === "finish") ?? null;
}

function reconstructDisplayedScore(state: BabyFootState): ReconstructedScore {
  if (!state.setsEnabled) {
    return { scoreA: state.scoreA, scoreB: state.scoreB };
  }

  const baseA = Math.max(0, Number(state.handicapA) || 0);
  const baseB = Math.max(0, Number(state.handicapB) || 0);
  const events = state.events || [];
  const finishEvent = getFinishEvent(events);
  const setWinIndexes = events.reduce<number[]>((acc, event, index) => {
    if (event.t === "set_win") acc.push(index);
    return acc;
  }, []);

  let startIndex = -1;
  if (finishEvent?.reason === "sets" && setWinIndexes.length > 0) {
    startIndex = setWinIndexes.length >= 2 ? setWinIndexes[setWinIndexes.length - 2] ?? -1 : -1;
  } else if (setWinIndexes.length > 0) {
    startIndex = setWinIndexes[setWinIndexes.length - 1] ?? -1;
  }

  let scoreA = baseA;
  let scoreB = baseB;
  for (let index = startIndex + 1; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    if (event.t === "goal") {
      if (event.team === "A") scoreA += 1;
      if (event.team === "B") scoreB += 1;
    }
  }

  return { scoreA, scoreB };
}

function computeMomentumLabel(goalEvents: GoalLikeEvent[], teamA: string, teamB: string) {
  if (!goalEvents.length) return "Match équilibré";
  const last = goalEvents[goalEvents.length - 1];
  if (!last) return "Match équilibré";

  let streak = 0;
  for (let index = goalEvents.length - 1; index >= 0; index -= 1) {
    const event = goalEvents[index];
    if (!event || event.team !== last.team) break;
    streak += 1;
  }

  const teamName = last.team === "A" ? teamA : teamB;
  return streak > 1 ? `${teamName} sur ${streak} buts de suite` : `${teamName} a repris la main`;
}

export default function BabyFootPlay({ go, onFinish, params }: Props) {
  const { theme } = useTheme();
  const { store } = useStore() as any;

  const [state, setState] = useState<BabyFootState>(() => startIfNeeded());
  const [now, setNow] = useState(Date.now());
  const [pickTeam, setPickTeam] = useState<BabyFootTeamId | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => setState(loadBabyFootState());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const profiles = (store?.profiles || []) as any[];
  const getProfile = (id: string): ProfileLike => profiles.find((profile) => profile?.id === id) || null;

  const teamAIds = state.teamAProfileIds || [];
  const teamBIds = state.teamBProfileIds || [];

  const players = useMemo(() => {
    const makePlayer = (id: string) => ({ id });
    return [...teamAIds.map(makePlayer), ...teamBIds.map(makePlayer)];
  }, [teamAIds.join("|"), teamBIds.join("|")]);

  const durationMs = computeDurationMs(state);

  const regularStart = state.startedAt ?? state.createdAt;
  const regularLimitMs = state.matchDurationSec ? state.matchDurationSec * 1000 : null;
  const regularElapsed = Math.max(0, now - regularStart);
  const regularRemain = regularLimitMs != null ? Math.max(0, regularLimitMs - regularElapsed) : null;

  const otStart = lastPhaseAt(state, "overtime") ?? regularStart;
  const otLimitMs = state.overtimeSec != null ? Math.max(0, state.overtimeSec) * 1000 : null;
  const otElapsed = Math.max(0, now - otStart);
  const otRemain = otLimitMs != null ? Math.max(0, otLimitMs - otElapsed) : null;

  const neededSets = Math.floor((state.setsBestOf || 3) / 2) + 1;
  const canUndo = !state.finished && Array.isArray(state.events) && state.events.length > 0;

  const goalEvents = useMemo(() => getGoalEvents(state.events || []), [state.events]);
  const displayedScore = useMemo(() => reconstructDisplayedScore(state), [state]);

  const goalCountA = goalEvents.filter((event) => event.team === "A").length;
  const goalCountB = goalEvents.filter((event) => event.team === "B").length;
  const totalGoals = goalCountA + goalCountB;

  const lastGoalEvent = goalEvents.length ? goalEvents[goalEvents.length - 1] : null;
  const lastGoalTeamName = lastGoalEvent?.team === "A" ? state.teamA : lastGoalEvent?.team === "B" ? state.teamB : null;
  const lastGoalScorer = lastGoalEvent?.scorerId ? getProfile(lastGoalEvent.scorerId)?.name || lastGoalEvent.scorerId : null;
  const lastGoalLabel = lastGoalEvent
    ? lastGoalScorer
      ? `${lastGoalScorer} • ${lastGoalTeamName}`
      : `But ${lastGoalTeamName}`
    : "Aucun but pour le moment";

  const leaderLabel =
    displayedScore.scoreA === displayedScore.scoreB
      ? "Égalité"
      : displayedScore.scoreA > displayedScore.scoreB
      ? state.teamA
      : state.teamB;
  const momentumLabel = computeMomentumLabel(goalEvents, state.teamA, state.teamB);

  const cadenceLabel = (() => {
    const mins = durationMs / 60000;
    if (mins <= 0 || totalGoals === 0) return "0 but/min";
    return `${(totalGoals / mins).toFixed(2)} but/min`;
  })();

  const finishEvent = getFinishEvent(state.events || []);
  const finishReasonLabel = (() => {
    switch (finishEvent?.reason) {
      case "sets":
        return "Victoire aux sets";
      case "target":
        return "Target atteinte";
      case "penalties":
        return "Victoire aux penalties";
      case "golden":
        return "Golden goal";
      case "time":
        return "Fin du temps";
      default:
        return undefined;
    }
  })();

  const phaseLabel = (() => {
    if (state.finished) return "FIN";
    if (state.phase === "penalties") return "PENALTIES";
    if (state.phase === "overtime") return "OVERTIME";
    return "MATCH";
  })();

  const clockLabel = (() => {
    if (state.finished) return fmt(durationMs);
    if (state.phase === "overtime") return `OT ${fmt(otRemain ?? 0)}`;
    if (regularLimitMs != null) return fmt(regularRemain ?? 0);
    return fmt(regularElapsed);
  })();

  const targetLabel =
    state.phase === "penalties"
      ? "Séance en cours"
      : state.setsEnabled
      ? `Set ${state.setIndex} • objectif ${state.setTarget || state.target}`
      : `Objectif ${state.target}`;

  const secondaryLabel = state.setsEnabled
    ? `BO${state.setsBestOf || 3}`
    : state.goldenGoal
    ? "Golden goal"
    : state.matchDurationSec
    ? `${state.matchDurationSec}s`
    : undefined;

  const liveContext = [
    state.setsEnabled ? `Sets ${state.setsA}–${state.setsB}` : `Leader ${leaderLabel}`,
    regularLimitMs != null ? `Temps ${fmt(regularLimitMs)}` : "Sans chrono fixe",
    state.phase === "overtime" ? `OT ${fmt(otLimitMs ?? 0)}` : `Mode ${state.mode}`,
    state.goldenGoal && state.phase === "play" ? "Golden goal" : null,
    state.overtimeGoldenGoal && state.phase === "overtime" ? "Golden goal OT" : null,
  ].filter((entry): entry is string => Boolean(entry));

  const infoTitle = "Baby-Foot";
  const infoBody =
    "Refonte live premium : header match, sets séparés, duel score central, cartes équipes et panneau de phase.\n\n" +
    "• + BUT : ajoute un but à l'équipe\n" +
    "• UNDO : annule le dernier évènement\n" +
    "• FIN : laisse le store décider OT / penalties / fin selon le contexte\n\n" +
    "Phases : MATCH → OVERTIME → PENALTIES → FIN";

  useEffect(() => {
    try {
      sendCastSnapshot({
        game: "babyfoot",
        title: "Baby-Foot",
        status: state.finished ? "finished" : "live",
        players: [
          { id: "A", name: String(state.teamA || "Équipe A"), score: Number(displayedScore.scoreA || 0), active: false },
          { id: "B", name: String(state.teamB || "Équipe B"), score: Number(displayedScore.scoreB || 0), active: false },
        ],
        meta: {
          phase: state.phase,
          setsA: Number(state.setsA || 0),
          setsB: Number(state.setsB || 0),
          mode: state.mode,
        },
        updatedAt: Date.now(),
      });
    } catch {
      // noop
    }
  }, [displayedScore.scoreA, displayedScore.scoreB, state]);

  useEffect(() => {
    if (state.finished) return;

    if (state.phase === "play" && regularLimitMs != null && regularRemain === 0) {
      setState(finishByTime());
      return;
    }

    if (state.phase === "overtime" && otLimitMs != null && otRemain === 0) {
      setState(finishByTime());
    }
  }, [otLimitMs, otRemain, regularLimitMs, regularRemain, state.finished, state.phase]);

  useEffect(() => {
    if (!state.finished) return;

    const winnerTeam: BabyFootTeamId = (state.winner as BabyFootTeamId | null) || (displayedScore.scoreA >= displayedScore.scoreB ? "A" : "B");
    const winnerId = winnerTeam === "A" ? teamAIds[0] || null : teamBIds[0] || null;

    const payload = {
      kind: "babyfoot",
      sport: "babyfoot",
      matchId: state.matchId,
      id: state.matchId,
      createdAt: state.createdAt,
      finishedAt: state.finishedAt ?? Date.now(),
      winnerId,
      winnerTeam,
      players: players.map((player) => ({ id: player.id })),
      summary: {
        teamA: state.teamA,
        teamB: state.teamB,
        scoreA: displayedScore.scoreA,
        scoreB: displayedScore.scoreB,
        setsEnabled: state.setsEnabled,
        setsA: state.setsA,
        setsB: state.setsB,
        penalties: state.penalties ? { ...state.penalties } : null,
        durationMs,
        mode: state.mode,
        target: state.target,
        setTarget: state.setTarget,
        setsBestOf: state.setsBestOf,
        handicapA: state.handicapA ?? 0,
        handicapB: state.handicapB ?? 0,
      },
      events: state.events || [],
    };

    const tournamentId = (params as any)?.tournamentId;
    if (tournamentId) {
      try {
        localStorage.setItem(
          tourResultKey(tournamentId, state.matchId),
          JSON.stringify({
            at: Date.now(),
            winnerTeam,
            scoreA: displayedScore.scoreA,
            scoreB: displayedScore.scoreB,
            setsA: state.setsA,
            setsB: state.setsB,
          })
        );
      } catch {
        // noop
      }
    }

    onFinish?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedScore.scoreA, displayedScore.scoreB, durationMs, players, state.finished]);

  const headerTicker = useMemo(
    () => pickTicker(`babyfoot_${state.mode}`) || pickTicker("babyfoot_match") || pickTicker("babyfoot_games"),
    [state.mode]
  );

  const isPickScorerNeeded = (team: BabyFootTeamId) => {
    const ids = team === "A" ? teamAIds : teamBIds;
    return ids.length > 1;
  };

  const addForTeam = (team: BabyFootTeamId) => {
    if (state.finished || state.phase === "penalties") return;
    if (isPickScorerNeeded(team)) {
      setPickTeam(team);
      return;
    }
    const scorerId = (team === "A" ? teamAIds[0] : teamBIds[0]) || null;
    setState(addGoal(team, scorerId));
  };

  const scoreLine = state.setsEnabled
    ? `${state.setsA || 0}–${state.setsB || 0} sets • ${displayedScore.scoreA}–${displayedScore.scoreB}`
    : `${displayedScore.scoreA}–${displayedScore.scoreB}`;
  const winnerLabel = state.winner === "A" ? state.teamA : state.winner === "B" ? state.teamB : "Match nul";
  const detailsLine = [finishReasonLabel, `Durée ${fmt(durationMs)}`, state.mode].filter(Boolean).join(" • ");

  return (
    <div className="page" style={{ background: theme.bg, color: theme.text }}>
      <PageHeader
        tickerSrc={headerTicker || undefined}
        tickerAlt="Baby-Foot — Play"
        tickerHeight={92}
        left={<BackDot onClick={() => go("babyfoot_menu")} />}
        right={<InfoDot title={infoTitle} content={infoBody} glow={(theme?.colors?.primary ?? "#7cffc4") + "88"} />}
      />

      <div style={{ padding: 10, paddingBottom: 124, display: "grid", gap: 10, overflowX: "hidden" }}>
        <BabyFootLiveHeader
          phaseLabel={phaseLabel}
          modeLabel={state.mode}
          clockLabel={clockLabel}
          targetLabel={targetLabel}
          secondaryLabel={secondaryLabel}
        />

        {state.setsEnabled ? (
          <BabyFootSetsBar
            setsA={state.setsA || 0}
            setsB={state.setsB || 0}
            bestOf={state.setsBestOf || 3}
            currentSet={state.setIndex || 1}
            teamAName={state.teamA}
            teamBName={state.teamB}
          />
        ) : null}

        <BabyFootDuelScoreCard
          theme={theme}
          teamAName={state.teamA}
          teamBName={state.teamB}
          teamALogoDataUrl={state.teamALogoDataUrl}
          teamBLogoDataUrl={state.teamBLogoDataUrl}
          scoreA={displayedScore.scoreA}
          scoreB={displayedScore.scoreB}
          setsEnabled={state.setsEnabled}
          setsA={state.setsA || 0}
          setsB={state.setsB || 0}
          setTarget={state.setTarget || state.target}
          target={state.target}
          handicapA={state.handicapA}
          handicapB={state.handicapB}
        />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
          <BabyFootTeamCard
            team="A"
            name={state.teamA}
            score={displayedScore.scoreA}
            playerIds={teamAIds}
            getProfile={getProfile}
            logoDataUrl={state.teamALogoDataUrl}
            handicap={state.handicapA}
            onAddGoal={() => addForTeam("A")}
            disabled={state.finished || state.phase === "penalties"}
            accent="green"
            footerLabel={teamAIds.length > 1 ? "Choix du buteur avant validation" : "Validation directe du but"}
          />

          <BabyFootTeamCard
            team="B"
            name={state.teamB}
            score={displayedScore.scoreB}
            playerIds={teamBIds}
            getProfile={getProfile}
            logoDataUrl={state.teamBLogoDataUrl}
            handicap={state.handicapB}
            onAddGoal={() => addForTeam("B")}
            disabled={state.finished || state.phase === "penalties"}
            accent="pink"
            footerLabel={teamBIds.length > 1 ? "Choix du buteur avant validation" : "Validation directe du but"}
          />
        </div>

        <BabyFootPhasePanel
          state={state}
          lastGoalLabel={lastGoalLabel}
          liveContext={liveContext}
          onPenaltyShot={(team, scored) => setState(addPenaltyShot(team, scored))}
        />

        <BabyFootLiveStatsCard
          teamAName={state.teamA}
          teamBName={state.teamB}
          goalsA={goalCountA}
          goalsB={goalCountB}
          totalGoals={totalGoals}
          durationLabel={fmt(durationMs)}
          lastGoalLabel={lastGoalLabel}
          momentumLabel={momentumLabel}
          cadenceLabel={cadenceLabel}
        />
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "8px 10px calc(72px + env(safe-area-inset-bottom))",
          backdropFilter: "blur(10px)",
          background:
            "linear-gradient(180deg, rgba(10,10,18,0.00) 0%, rgba(10,10,18,0.72) 18%, rgba(10,10,18,0.94) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
          <DockButton
            label="UNDO"
            onClick={() => {
              if (!canUndo) return;
              setState(undoGoal());
            }}
            disabled={!canUndo}
          />
          <DockButton label="STATS" onClick={() => go("babyfoot_stats_center")} />
          <DockButton
            label="FIN"
            onClick={() => {
              if (state.finished) return;
              setState(finishByTime());
            }}
            disabled={state.finished}
            emphasized
          />
          <DockButton label="CONFIG" onClick={() => go("babyfoot_config")} />
        </div>
      </div>

      <BabyFootEndGameSummary
        open={state.finished}
        theme={theme}
        winnerLabel={winnerLabel}
        scoreLine={scoreLine}
        detailsLine={detailsLine}
        onReplay={() => setState(startMatch())}
        onStats={() => go("babyfoot_stats_center")}
        onGames={() => go("babyfoot_menu")}
      />

      {pickTeam ? (
        <Modal title={pickTeam === "A" ? `Buteur — ${state.teamA}` : `Buteur — ${state.teamB}`} onClose={() => setPickTeam(null)}>
          <div style={{ display: "grid", gap: 10 }}>
            {(pickTeam === "A" ? teamAIds : teamBIds).map((playerId) => {
              const profile = getProfile(playerId);
              const label = profile?.name || playerId;
              return (
                <button
                  key={playerId}
                  type="button"
                  onClick={() => {
                    setState(addGoal(pickTeam, playerId));
                    setPickTeam(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  <ProfileAvatar profile={profile || { id: playerId, name: playerId }} size={40} />
                  <div style={{ fontWeight: 1000, letterSpacing: 0.4, textAlign: "left" }}>{label}</div>
                </button>
              );
            })}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function DockButton({
  label,
  onClick,
  disabled = false,
  emphasized = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  emphasized?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: disabled
          ? "rgba(255,255,255,0.05)"
          : emphasized
          ? "linear-gradient(180deg, rgba(124,255,196,0.24), rgba(124,255,196,0.12))"
          : "rgba(255,255,255,0.06)",
        color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
        fontWeight: 1100,
        fontSize: 12,
        letterSpacing: 0.4,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,12,18,0.96)",
          padding: 16,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 1100, fontSize: 16, letterSpacing: 0.6 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "#fff",
              fontWeight: 900,
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}
