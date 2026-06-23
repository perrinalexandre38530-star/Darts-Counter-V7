import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { getFootFormat } from "./footFormats";
import { getFootGameTicker } from "./footTickers";
import footPitchBg from "../../assets/foot-pitch.webp";

type Props = { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void };
type EventType = "goal" | "assist" | "yellow" | "red" | "own_goal" | "penalty_scored" | "penalty_missed" | "foul" | "shot_on" | "shot_off" | "post" | "crossbar" | "substitution";
type GoalKind = "right_foot" | "left_foot" | "header" | "penalty" | "free_kick" | "own_goal_awarded";

const labels: Record<EventType, string> = {
  goal: "But",
  assist: "Passe déc.",
  yellow: "Jaune",
  red: "Rouge",
  own_goal: "CSC",
  penalty_scored: "Penalty marqué",
  penalty_missed: "Penalty raté",
  foul: "Faute",
  shot_on: "Tir cadré",
  shot_off: "Tir non cadré",
  post: "Poteau",
  crossbar: "Transversale",
  substitution: "Remplacement",
};
const icons: Record<EventType, string> = {
  goal: "⚽",
  assist: "🎯",
  yellow: "🟨",
  red: "🟥",
  own_goal: "🥅",
  penalty_scored: "✅",
  penalty_missed: "❌",
  foul: "🧱",
  shot_on: "🎯",
  shot_off: "↗️",
  post: "🥅",
  crossbar: "📏",
  substitution: "🔁",
};
const goalOptions: Array<{ key: GoalKind; label: string; icon: string }> = [
  { key: "right_foot", label: "Pied droit", icon: "🦶" },
  { key: "left_foot", label: "Pied gauche", icon: "🦶" },
  { key: "header", label: "Tête", icon: "🧠" },
  { key: "penalty", label: "Penalty", icon: "🎯" },
  { key: "free_kick", label: "Coup-franc direct", icon: "🌀" },
  { key: "own_goal_awarded", label: "CSC adverse", icon: "🥅" },
];
const statOptions: Array<{ type: EventType; label: string; icon: string }> = [
  { type: "foul", label: "Faute", icon: "🧱" },
  { type: "yellow", label: "Carton Jaune", icon: "🟨" },
  { type: "red", label: "Carton Rouge", icon: "🟥" },
  { type: "shot_on", label: "Tir cadré", icon: "🎯" },
  { type: "shot_off", label: "Tir non cadré", icon: "↗️" },
  { type: "post", label: "Poteau", icon: "🥅" },
  { type: "crossbar", label: "Transversale", icon: "📏" },
  { type: "penalty_missed", label: "Penalty loupé", icon: "❌" },
  { type: "assist", label: "Passe décisive", icon: "🎯" },
  { type: "substitution", label: "Remplacement", icon: "🔁" },
];

export default function FootPlay({ go, params, onFinish }: Props) {
  const cfg = params?.config || {};
  const spec = getFootFormat(cfg.format);
  const teamA = String(cfg.teamA || (spec.kind === "duel" ? "Joueur A" : "Équipe A"));
  const teamB = String(cfg.teamB || (spec.kind === "duel" ? "Joueur B" : "Équipe B"));
  const [score, setScore] = React.useState<[number, number]>([0, 0]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [shoots, setShoots] = React.useState<[number, number]>([0, 0]);
  const [actionModal, setActionModal] = React.useState<null | { kind: "goal" | "more"; team: 0 | 1; teamName: string }>(null);
  const [playerPickModal, setPlayerPickModal] = React.useState<null | { team: 0 | 1; teamName: string; actionType: EventType; goalKind?: GoalKind; goalLabel?: string; statOnly?: boolean; awardedCsc?: boolean }>(null);
  const [assistModal, setAssistModal] = React.useState<null | { team: 0 | 1; teamName: string; scorer: any; actionType: EventType; goalKind?: GoalKind; goalLabel?: string; autoSubOut?: any }>(null);
  const [substitutionModal, setSubstitutionModal] = React.useState<null | { team: 0 | 1; teamName: string }>(null);
  const buzzerPlayedRef = React.useRef(false);
  const rosterA = React.useMemo(() => buildRoster(cfg.teamAPlayerIds, cfg.playersA, cfg.playersAVisuals), [cfg.teamAPlayerIds, cfg.playersA, cfg.playersAVisuals]);
  const rosterB = React.useMemo(() => buildRoster(cfg.teamBPlayerIds, cfg.playersB, cfg.playersBVisuals), [cfg.teamBPlayerIds, cfg.playersB, cfg.playersBVisuals]);

  const lineupSize = Math.max(1, Number(spec.playersPerSide || 1));
  const [lineupA, setLineupA] = React.useState<string[]>(() => rosterA.slice(0, lineupSize).map((p: any) => String(p.id)));
  const [lineupB, setLineupB] = React.useState<string[]>(() => rosterB.slice(0, lineupSize).map((p: any) => String(p.id)));
  const initialLineupsRef = React.useRef<{ a: string[]; b: string[] } | null>(null);

  React.useEffect(() => {
    const next = rosterA.slice(0, lineupSize).map((p: any) => String(p.id));
    setLineupA(next);
    initialLineupsRef.current = null;
  }, [rosterA.map((p: any) => p.id).join("|"), lineupSize]);

  React.useEffect(() => {
    const next = rosterB.slice(0, lineupSize).map((p: any) => String(p.id));
    setLineupB(next);
    initialLineupsRef.current = null;
  }, [rosterB.map((p: any) => p.id).join("|"), lineupSize]);

  React.useEffect(() => {
    if (!initialLineupsRef.current && (lineupA.length || lineupB.length)) {
      initialLineupsRef.current = { a: [...lineupA], b: [...lineupB] };
    }
  }, [lineupA.join("|"), lineupB.join("|")]);

  const addEvent = (team: 0 | 1, type: EventType, player?: any, extra?: any) => {
    const ev = {
      id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      team,
      teamName: team === 0 ? teamA : teamB,
      type,
      label: labels[type],
      icon: icons[type],
      period: currentPeriod,
      clockRemaining: remainingSeconds,
      periodSeconds,
      format: spec.id,
      playerId: player?.id || null,
      playerName: player?.name || null,
      scoreAAfter: (type === "goal" || type === "penalty_scored") && team === 0 ? score[0] + 1 : type === "own_goal" && team === 1 ? score[0] + 1 : score[0],
      scoreBAfter: (type === "goal" || type === "penalty_scored") && team === 1 ? score[1] + 1 : type === "own_goal" && team === 0 ? score[1] + 1 : score[1],
      ...extra,
    };
    setEvents((prev) => [ev, ...prev]);
    if (type === "goal" || type === "penalty_scored") setScore(([a, b]) => team === 0 ? [a + 1, b] : [a, b + 1]);
    if (type === "own_goal") setScore(([a, b]) => team === 0 ? [a, b + 1] : [a + 1, b]);
    if (type === "penalty_scored" || type === "penalty_missed") setShoots(([a, b]) => team === 0 ? [a + 1, b] : [a, b + 1]);
  };

  const addGoalDetail = (goalKind: GoalKind) => {
    if (!actionModal) return;
    const goalLabel = goalOptions.find((x) => x.key === goalKind)?.label || "But";
    setPlayerPickModal({
      team: actionModal.team,
      teamName: actionModal.teamName,
      actionType: goalKind === "own_goal_awarded" ? "own_goal" : goalKind === "penalty" ? "penalty_scored" : "goal",
      goalKind,
      goalLabel,
      awardedCsc: goalKind === "own_goal_awarded",
    });
    setActionModal(null);
  };

  const addStatDetail = (type: EventType) => {
    if (!actionModal) return;
    if (type === "substitution") {
      setSubstitutionModal({ team: actionModal.team, teamName: actionModal.teamName });
      setActionModal(null);
      return;
    }
    setPlayerPickModal({
      team: actionModal.team,
      teamName: actionModal.teamName,
      actionType: type,
      statOnly: true,
    });
    setActionModal(null);
  };

  const confirmPlayerAction = (player?: any, meta?: any) => {
    if (!playerPickModal) return;
    if (playerPickModal.awardedCsc) {
      const scoringTeam = playerPickModal.team;
      const adverseTeam = scoringTeam === 0 ? 1 : 0;
      const adverseName = adverseTeam === 0 ? teamA : teamB;
      const ev = {
        id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        team: adverseTeam,
        teamName: adverseName,
        scoringTeam,
        scoringTeamName: playerPickModal.teamName,
        type: "own_goal",
        label: "CSC adverse",
        icon: icons.own_goal,
        period: currentPeriod,
        clockRemaining: remainingSeconds,
        periodSeconds,
        format: spec.id,
        playerId: null,
        playerName: null,
        awardedToPlayerId: player?.id || null,
        awardedToPlayerName: player?.name || null,
        scoreAAfter: scoringTeam === 0 ? score[0] + 1 : score[0],
        scoreBAfter: scoringTeam === 1 ? score[1] + 1 : score[1],
        goalKind: playerPickModal.goalKind,
      };
      setEvents((prev) => [ev, ...prev]);
      setScore(([a, b]) => scoringTeam === 0 ? [a + 1, b] : [a, b + 1]);
    } else {
      if (meta?.autoSubOut) {
        performSubstitution(playerPickModal.team, playerPickModal.teamName, meta.autoSubOut, player);
      }
      const isGoalAction = playerPickModal.actionType === "goal" || playerPickModal.actionType === "penalty_scored";
      if (isGoalAction) {
        setAssistModal({
          team: playerPickModal.team,
          teamName: playerPickModal.teamName,
          scorer: player,
          actionType: playerPickModal.actionType,
          goalKind: playerPickModal.goalKind,
          goalLabel: playerPickModal.goalLabel,
          autoSubOut: meta?.autoSubOut || null,
        });
      } else {
        addEvent(playerPickModal.team, playerPickModal.actionType, player, {
          goalKind: playerPickModal.goalKind,
          goalLabel: playerPickModal.goalLabel,
          statOnly: playerPickModal.statOnly,
        });
      }
    }
    setPlayerPickModal(null);
  };

  const confirmAssist = (assistPlayer?: any | null) => {
    if (!assistModal) return;
    addEvent(assistModal.team, assistModal.actionType, assistModal.scorer, {
      goalKind: assistModal.goalKind,
      goalLabel: assistModal.goalLabel,
      assistPlayerId: assistPlayer?.id || null,
      assistPlayerName: assistPlayer?.name || null,
    });
    setAssistModal(null);
  };


  const performSubstitution = (team: 0 | 1, teamName: string, outPlayer?: any, inPlayer?: any) => {
    if (!outPlayer || !inPlayer || String(outPlayer.id) === String(inPlayer.id)) return;
    const setter = team === 0 ? setLineupA : setLineupB;
    setter((prev) => {
      const next = [...prev];
      const outIndex = next.findIndex((id) => String(id) === String(outPlayer.id));
      const inIndex = next.findIndex((id) => String(id) === String(inPlayer.id));
      if (outIndex < 0) return prev;
      if (inIndex >= 0) next[inIndex] = String(outPlayer.id);
      next[outIndex] = String(inPlayer.id);
      return next;
    });
    const ev = {
      id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      team,
      teamName,
      type: "substitution" as EventType,
      label: "Remplacement",
      icon: icons.substitution,
      period: currentPeriod,
      clockRemaining: remainingSeconds,
      periodSeconds,
      format: spec.id,
      playerId: inPlayer?.id || null,
      playerName: inPlayer?.name || null,
      outPlayerId: outPlayer?.id || null,
      outPlayerName: outPlayer?.name || null,
      inPlayerId: inPlayer?.id || null,
      inPlayerName: inPlayer?.name || null,
      scoreAAfter: score[0],
      scoreBAfter: score[1],
    };
    setEvents((prev) => [ev, ...prev]);
  };

  const confirmSubstitution = (outPlayer?: any, inPlayer?: any) => {
    if (!substitutionModal || !outPlayer || !inPlayer) return;
    performSubstitution(substitutionModal.team, substitutionModal.teamName, outPlayer, inPlayer);
    setSubstitutionModal(null);
  };

  const undo = () => {
    const ev = events[0];
    if (!ev) return;
    setEvents((prev) => prev.slice(1));
    if (ev.type === "goal" || ev.type === "penalty_scored") setScore(([a, b]) => ev.team === 0 ? [Math.max(0, a - 1), b] : [a, Math.max(0, b - 1)]);
    if (ev.type === "own_goal") {
      const scoringTeam = typeof ev.scoringTeam === "number" ? ev.scoringTeam : ev.team === 0 ? 1 : 0;
      setScore(([a, b]) => scoringTeam === 0 ? [Math.max(0, a - 1), b] : [a, Math.max(0, b - 1)]);
    }
    if (ev.type === "penalty_scored" || ev.type === "penalty_missed") setShoots(([a, b]) => ev.team === 0 ? [Math.max(0, a - 1), b] : [a, Math.max(0, b - 1)]);
  };

  const finish = () => {
    const winner = score[0] === score[1] ? null : score[0] > score[1] ? teamA : teamB;
    const match = {
      id: `foot-${spec.id}-${Date.now()}`,
      kind: "foot",
      createdAt: Date.now(),
      players: [{ id: "foot_team_a", name: teamA, teamIndex: 0 }, { id: "foot_team_b", name: teamB, teamIndex: 1 }],
      winnerId: winner === teamA ? "foot_team_a" : winner === teamB ? "foot_team_b" : null,
      summary: { sport: "foot", mode: `foot_${spec.id}`, format: spec.id, formatLabel: spec.label, teamA, teamB, scoreA: score[0], scoreB: score[1], winner, events, shoots, config: cfg },
      payload: { sport: "foot", mode: `foot_${spec.id}`, format: spec.id, formatLabel: spec.label, teamA, teamB, score, events, shoots, config: cfg, summary: { teamA, teamB, scoreA: score[0], scoreB: score[1], winner, events } }
    };
    if (onFinish) onFinish(match); else go("stats");
  };

  const isPenalty = spec.id === "penalty";
  const showLineup = spec.playersPerSide >= 3;
  const tickerSrc = getFootGameTicker(spec.id);
  const teamAVisual = cfg.teamAVisual || cfg.teamALogo || firstRosterVisual(rosterA) || null;
  const teamBVisual = cfg.teamBVisual || cfg.teamBLogo || firstRosterVisual(rosterB) || null;
  const periodCount = Math.max(1, Number(cfg.periods || spec.periods || 1));
  const periodSeconds = Math.max(1, Number(cfg.minutes || spec.minutesPerPeriod || 1)) * 60;
  const [clockRunning, setClockRunning] = React.useState(false);
  const [currentPeriod, setCurrentPeriod] = React.useState(1);
  const [remainingSeconds, setRemainingSeconds] = React.useState(periodSeconds);

  React.useEffect(() => {
    setClockRunning(false);
    setCurrentPeriod(1);
    setRemainingSeconds(periodSeconds);
    buzzerPlayedRef.current = false;
  }, [periodSeconds, spec.id]);

  React.useEffect(() => {
    if (!clockRunning || isPenalty) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) return prev - 1;
        window.clearInterval(timer);
        setClockRunning(false);
        if (!buzzerPlayedRef.current) {
          buzzerPlayedRef.current = true;
          playFootBuzzer();
        }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [clockRunning, isPenalty]);

  const nextPeriod = () => {
    if (isPenalty) return;
    setClockRunning(false);
    setCurrentPeriod((prev) => Math.min(periodCount, prev + 1));
    setRemainingSeconds(periodSeconds);
    buzzerPlayedRef.current = false;
  };

  const [activeTab, setActiveTab] = React.useState<FootPlayTab>("score");
  React.useEffect(() => {
    if (!showLineup && activeTab === "lineup") setActiveTab("score");
  }, [showLineup, activeTab]);
  const [rulesOpen, setRulesOpen] = React.useState(false);

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--dc-accent, #22e6ff) 18%, transparent), transparent 38%), linear-gradient(180deg, var(--dc-bg, #061424), #020408)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ position: "relative", height: 112, marginBottom: 12, borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 38px rgba(0,0,0,.45)" }}>
          <img src={tickerSrc} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.05) contrast(1.05)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.68), rgba(0,0,0,.18), rgba(0,0,0,.68))" }} />
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <BackDot onClick={() => go("foot_config", { format: spec.id, config: cfg })} />
          </div>
          <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <div style={{ padding: "4px 14px", borderRadius: 999, color: THEME, fontSize: 38, fontWeight: 1000, letterSpacing: ".04em", textShadow: `0 0 20px ${THEME_66}, 0 4px 14px rgba(0,0,0,.8)` }}>{spec.label}</div>
          </div>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <InfoDot
              title={`Règles ${spec.label}`}
              size={52}
              content={
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ color: THEME, fontWeight: 1000 }}>{spec.label}</div>
                  {spec.rules.map((r: string) => <div key={r} style={{ opacity: .88, fontWeight: 850 }}>• {r}</div>)}
                </div>
              }
            />
          </div>
        </div>

        {!isPenalty && (
          <ClockBar
            running={clockRunning}
            period={currentPeriod}
            periodCount={periodCount}
            remaining={remainingSeconds}
            onToggle={() => { if (!clockRunning && remainingSeconds === 0) buzzerPlayedRef.current = false; setClockRunning((v) => !v); }}
            onReset={() => { setClockRunning(false); setRemainingSeconds(periodSeconds); buzzerPlayedRef.current = false; }}
            onNextPeriod={nextPeriod}
            configLabel={isPenalty ? `${cfg.shoots || 5} tirs par camp · mort subite possible` : `${cfg.periods || spec.periods} période(s) · ${cfg.minutes || spec.minutesPerPeriod} min`}
          />
        )}

        <FootPlayTabs active={activeTab} onChange={setActiveTab} showRanking={Boolean(cfg.competitionId || cfg.leagueId || cfg.tournamentId)} showLineup={showLineup} />

        {activeTab === "score" && <>
        <div style={{ position: "relative", borderRadius: 26, padding: 18, border: `1px solid ${THEME_33}`, background: "linear-gradient(90deg, rgba(0,0,0,.58), rgba(8,14,20,.46), rgba(0,0,0,.58))", boxShadow: `0 18px 44px rgba(0,0,0,.35), inset 0 0 38px ${THEME_08}`, overflow: "hidden" }}>
          <ScoreGhost src={teamAVisual} side="left" />
          <ScoreGhost src={teamBVisual} side="right" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.10), rgba(0,0,0,.42) 42%, rgba(0,0,0,.42) 58%, rgba(0,0,0,.10))", zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", textAlign: "center" }}>
            <TeamScore name={teamA} score={score[0]} extra={isPenalty ? `${shoots[0]} tir(s)` : ""} />
            <div style={{ fontSize: 28, fontWeight: 1000, color: THEME, opacity: .7 }}>-</div>
            <TeamScore name={teamB} score={score[1]} extra={isPenalty ? `${shoots[1]} tir(s)` : ""} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <EventPanel team={teamA} penalty={isPenalty} onGoal={() => setActionModal({ kind: "goal", team: 0, teamName: teamA })} onMore={() => setActionModal({ kind: "more", team: 0, teamName: teamA })} onPenalty={(type: EventType) => setPlayerPickModal({ team: 0, teamName: teamA, actionType: type })} />
          <EventPanel team={teamB} penalty={isPenalty} onGoal={() => setActionModal({ kind: "goal", team: 1, teamName: teamB })} onMore={() => setActionModal({ kind: "more", team: 1, teamName: teamB })} onPenalty={(type: EventType) => setPlayerPickModal({ team: 1, teamName: teamB, actionType: type })} />
        </div>

        </>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={undo} style={secondaryBtn}>ANNULER DERNIER</button>
          <button onClick={finish} style={primaryBtn}>TERMINER / ENREGISTRER</button>
        </div>

        {activeTab === "timeline" && <TimelineTab events={events} />}
        {activeTab === "stats" && <StatsTab score={score} shoots={shoots} events={events} teamA={teamA} teamB={teamB} teamAVisual={teamAVisual} teamBVisual={teamBVisual} rosterA={rosterA} rosterB={rosterB} initialLineups={initialLineupsRef.current || { a: lineupA, b: lineupB }} elapsedSeconds={getCurrentMatchElapsedSeconds(currentPeriod, periodSeconds, remainingSeconds)} />}
        {showLineup && activeTab === "lineup" && <LineupTab teamA={teamA} teamB={teamB} rosterA={rosterA} rosterB={rosterB} playersPerSide={spec.playersPerSide} lineupA={lineupA} lineupB={lineupB} setLineupA={setLineupA} setLineupB={setLineupB} onSubstitute={performSubstitution} />}
        {activeTab === "ranking" && <EmptyTab title="CLASSEMENT" text="Le classement lié à cette ligue ou ce tournoi sera affiché ici." />}
      </div>
      {actionModal && (
        <ActionModal
          data={actionModal}
          onClose={() => setActionModal(null)}
          onGoal={addGoalDetail}
          onStat={addStatDetail}
        />
      )}
      {playerPickModal && (
        <PlayerPickModal
          data={playerPickModal}
          roster={playerPickModal.team === 0 ? rosterA : rosterB}
          fallbackName={playerPickModal.teamName}
          playersPerSide={spec.playersPerSide}
          activeIds={playerPickModal.team === 0 ? lineupA : lineupB}
          onClose={() => setPlayerPickModal(null)}
          onSelect={confirmPlayerAction}
        />
      )}
      {assistModal && (
        <AssistModal
          data={assistModal}
          roster={assistModal.team === 0 ? rosterA : rosterB}
          activeIds={assistModal.team === 0 ? lineupA : lineupB}
          onClose={() => setAssistModal(null)}
          onSelect={confirmAssist}
        />
      )}
      {substitutionModal && (
        <SubstitutionModal
          data={substitutionModal}
          roster={substitutionModal.team === 0 ? rosterA : rosterB}
          activeIds={substitutionModal.team === 0 ? lineupA : lineupB}
          onClose={() => setSubstitutionModal(null)}
          onConfirm={confirmSubstitution}
        />
      )}
    </div>
  );
}
function TeamScore({ name, score, extra }: any) {
  return (
    <div style={{ position: "relative", zIndex: 3, minWidth: 0 }}>
      <div style={{ fontSize: 16, color: THEME, fontWeight: 1000, minHeight: 28, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: `0 0 12px ${THEME_55}` }}>{name}</div>
      <div style={{ fontSize: 62, fontWeight: 1000, lineHeight: 1, textShadow: "0 4px 18px rgba(0,0,0,.65)" }}>{score}</div>
      {extra ? <div style={{ fontSize: 11, opacity: .75, fontWeight: 900 }}>{extra}</div> : null}
    </div>
  );
}

function ScoreGhost({ src, side }: { src?: string | null; side: "left" | "right" }) {
  if (!src) return null;
  const fadeMask = side === "left"
    ? "linear-gradient(90deg, #000 0%, #000 34%, rgba(0,0,0,.65) 52%, transparent 82%, transparent 100%)"
    : "linear-gradient(270deg, #000 0%, #000 34%, rgba(0,0,0,.65) 52%, transparent 82%, transparent 100%)";
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 0,
        top: "50%",
        [side]: "-10%",
        width: "50%",
        maxWidth: 320,
        aspectRatio: "1 / 1",
        transform: `translateY(-50%)`,
        borderRadius: "999px",
        overflow: "hidden",
        background: "radial-gradient(circle, rgba(255,255,255,.10), rgba(0,0,0,.18) 62%, rgba(0,0,0,0) 74%)",
        boxShadow: `0 0 42px ${THEME_22}`,
        opacity: .98,
        pointerEvents: "none",
        WebkitMaskImage: fadeMask,
        maskImage: fadeMask,
      } as React.CSSProperties}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: "3%",
          width: "94%",
          height: "94%",
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: "999px",
          transform: "scale(1.12)",
          opacity: .96,
          filter: "saturate(1.28) contrast(1.10)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, borderRadius: "999px", background: side === "left"
        ? "linear-gradient(90deg, rgba(0,0,0,.00), rgba(0,0,0,.12) 36%, rgba(0,0,0,.92) 100%)"
        : "linear-gradient(270deg, rgba(0,0,0,.00), rgba(0,0,0,.12) 36%, rgba(0,0,0,.92) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "999px", boxShadow: `inset 0 0 34px rgba(0,0,0,.34), inset 0 0 0 2px ${THEME_18}` }} />
    </div>
  );
}

function ClockBar({ running, period, periodCount, remaining, onToggle, onReset, onNextPeriod, configLabel }: any) {
  const mm = Math.floor(Number(remaining || 0) / 60);
  const ss = Number(remaining || 0) % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const canNext = period < periodCount;
  return (
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", margin: "0 0 10px", padding: "24px 10px 10px", minHeight: 64, borderRadius: 18, background: THEME_08, border: `1px solid ${THEME_33}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 12, right: 12, top: 6, display: "flex", alignItems: "center", justifyContent: "center", color: THEME, fontWeight: 1000, fontSize: 13, opacity: .95, textShadow: `0 0 12px ${THEME_44}` }}>{configLabel}</div>
      <div style={{ minWidth: 0, position: "relative", zIndex: 2 }}>
        <div style={{ color: THEME, fontWeight: 1000, fontSize: 12 }}>CHRONO</div>
        <div style={{ opacity: .78, fontSize: 11, fontWeight: 900 }}>Période {period}/{periodCount}</div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%, -50%)", fontWeight: 1000, fontSize: 28, lineHeight: 1, color: "#fff", textShadow: `0 0 18px ${THEME_44}`, pointerEvents: "none" }}>{label}</div>
      <div style={{ display: "grid", gap: 7, justifyContent: "end", position: "relative", zIndex: 2 }}>
        <button type="button" aria-label={running ? "Pause" : "Lancer"} title={running ? "Pause" : "Lancer"} onClick={onToggle} style={clockIconBtn(running ? "pause" : "play")}>{running ? "Ⅱ" : "▶"}</button>
        <button type="button" aria-label={remaining === 0 && canNext ? "Période suivante" : "Réinitialiser"} title={remaining === 0 && canNext ? "Période suivante" : "Réinitialiser"} onClick={remaining === 0 && canNext ? onNextPeriod : onReset} style={clockIconBtn("neutral")}>{remaining === 0 && canNext ? "+" : "↺"}</button>
      </div>
    </div>
  );
}
function buildRoster(idsRaw: any, namesRaw: any, visualsRaw?: any) {
  const ids = Array.isArray(idsRaw) ? idsRaw.map(String) : [];
  const names = Array.isArray(namesRaw) ? namesRaw : [];
  const visuals = Array.isArray(visualsRaw) ? visualsRaw.map((v) => String(v || "")) : [];
  return ids.map((id, index) => {
    const raw: any = names[index];
    const name = typeof raw === "string" ? raw : String(raw?.name || raw?.displayName || `Joueur ${index + 1}`);
    const visual = visuals[index] || raw?.visual || raw?.avatar || raw?.avatarUrl || raw?.avatarDataUrl || raw?.photoUrl || raw?.image || null;
    return { id, name, visual };
  }).filter((p) => p.id);
}
function firstRosterVisual(roster: any[]) {
  return Array.isArray(roster) ? roster.find((p) => p?.visual)?.visual || null : null;
}
function EventPanel({ team, onGoal, onMore, onPenalty, penalty }: any) {
  return (
    <div style={{ borderRadius: 20, padding: 12, background: `linear-gradient(180deg, ${THEME_10}, rgba(255,255,255,.035))`, border: `1px solid ${THEME_33}`, boxShadow: `0 0 24px ${THEME_12}` }}>
      <div style={{ color: THEME, fontWeight: 1000, marginBottom: 10, textAlign: "center", fontSize: 18, textShadow: `0 0 12px ${THEME_55}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team}</div>
      {penalty ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => onPenalty("penalty_scored")} style={miniEventBtn}>✅ Marqué</button>
          <button onClick={() => onPenalty("penalty_missed")} style={miniEventBtn}>❌ Raté</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <button onClick={onGoal} style={{ ...miniEventBtn, minHeight: 52, fontSize: 15 }}>⚽ BUT</button>
          <button onClick={onMore} style={{ ...miniEventBtn, minWidth: 56, minHeight: 52, fontSize: 24, lineHeight: 1 }}>+</button>
        </div>
      )}
    </div>
  );
}

type FootPlayTab = "score" | "timeline" | "stats" | "lineup" | "ranking";
const THEME = "var(--dc-accent, #22e6ff)";
const THEME_08 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 8%, transparent)";
const THEME_10 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 10%, transparent)";
const THEME_12 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 12%, transparent)";
const THEME_18 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 18%, transparent)";
const THEME_22 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 22%, transparent)";
const THEME_24 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 24%, transparent)";
const THEME_28 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 28%, transparent)";
const THEME_33 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 33%, transparent)";
const THEME_35 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 35%, transparent)";
const THEME_44 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 44%, transparent)";
const THEME_55 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 55%, transparent)";
const THEME_66 = "color-mix(in srgb, var(--dc-accent, #22e6ff) 66%, transparent)";
const THEME_GRAD = "linear-gradient(135deg, var(--dc-accent, #22e6ff), color-mix(in srgb, var(--dc-accent, #22e6ff) 55%, #000))";

function FootPlayTabs({
  active,
  onChange,
  showRanking,
  showLineup,
}: {
  active: FootPlayTab;
  onChange: (tab: FootPlayTab) => void;
  showRanking: boolean;
  showLineup: boolean;
}) {
  const tabs: Array<{ key: FootPlayTab; label: string }> = [
    { key: "score", label: "SCORE" },
    { key: "timeline", label: "FIL" },
    { key: "stats", label: "STATS" },
  ];
  if (showLineup) tabs.push({ key: "lineup", label: "COMPO" });
  if (showRanking) tabs.push({ key: "ranking", label: "CLASS." });

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        gap: 0,
        margin: "0 0 12px",
        borderRadius: 0,
        overflow: "hidden",
        borderTop: `1px solid ${THEME_33}`,
        borderBottom: `1px solid ${THEME_33}`,
        background: "rgba(255,255,255,.035)",
        boxShadow: `inset 0 0 24px ${THEME_08}`,
      }}
    >
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              minWidth: 0,
              height: 44,
              border: 0,
              borderRight: `1px solid ${THEME_22}`,
              borderRadius: 0,
              padding: "0 4px",
              background: selected ? THEME_18 : "transparent",
              color: selected ? THEME : "rgba(255,255,255,.82)",
              fontWeight: 1000,
              fontSize: "clamp(10px, 2.5vw, 13px)",
              letterSpacing: ".02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
              textShadow: selected ? `0 0 12px ${THEME_44}` : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function TimelineTab({ events }: { events: any[] }) {
  return (
    <section style={tabPanelStyle}>
      <h2 style={tabTitleStyle}>FIL DU MATCH</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {events.length === 0 ? <div style={{ opacity: .65, fontWeight: 800 }}>Aucun événement pour le moment.</div> : events.map((ev) => <div key={ev.id} style={{ borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,.06)", border: `1px solid ${THEME_22}`, fontWeight: 850 }}>{formatFootEventSentence(ev)}</div>)}
      </div>
    </section>
  );
}

function formatFootEventSentence(ev: any) {
  const minute = getEventMinute(ev);
  const player = ev.playerName || ev.awardedToPlayerName || "Un joueur";
  const team = ev.scoringTeamName || ev.teamName || "son équipe";
  const scoreTxt = typeof ev.scoreAAfter === "number" && typeof ev.scoreBAfter === "number" ? ` : ${ev.scoreAAfter} à ${ev.scoreBAfter} pour ${team}` : "";
  if (ev.type === "goal") {
    if (ev.goalKind === "header") return `⚽ ${player} ouvre le score de la tête à la ${minute}e minute de jeu${scoreTxt}.`;
    if (ev.goalKind === "left_foot") return `⚽ ${player} marque du pied gauche à la ${minute}e minute de jeu${scoreTxt}.`;
    if (ev.goalKind === "right_foot") return `⚽ ${player} marque du pied droit à la ${minute}e minute de jeu${scoreTxt}.`;
    const assistTxt = ev.assistPlayerName ? `, passe décisive de ${ev.assistPlayerName}` : "";
    if (ev.goalKind === "free_kick") return `⚽ Coup-franc direct transformé par ${player} à la ${minute}e minute de jeu${assistTxt}${scoreTxt}.`;
    return `⚽ But pour ${team} par ${player} à la ${minute}e minute de jeu${assistTxt}${scoreTxt}.`;
  }
  if (ev.type === "penalty_scored") return `🎯 Penalty transformé par ${player} à la ${minute}e minute de jeu${scoreTxt}.`;
  if (ev.type === "assist") return `🎯 Passe décisive de ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "penalty_missed") return `❌ Penalty manqué pour ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "own_goal") return `🥅 CSC provoqué à la ${minute}e minute : but accordé à ${ev.scoringTeamName || team}${scoreTxt}.`;
  if (ev.type === "shot_on") return `🎯 Tir cadré de ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "shot_off") return `↗️ Tir non cadré de ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "post") return `🥅 ${player} trouve le poteau à la ${minute}e minute de jeu.`;
  if (ev.type === "crossbar") return `📏 ${player} trouve la transversale à la ${minute}e minute de jeu.`;
  if (ev.type === "foul") return `🧱 Faute de ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "yellow") return `🟨 Carton jaune pour ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "red") return `🟥 Carton rouge pour ${player} à la ${minute}e minute de jeu.`;
  if (ev.type === "substitution") return `🔁 Remplacement pour ${team} à la ${minute}e minute : ${ev.inPlayerName || player} entre à la place de ${ev.outPlayerName || "un joueur"}.`;
  return `${ev.icon || "•"} ${player} · ${ev.label || "Action"} · ${minute}e minute.`;
}

function getEventMinute(ev: any) {
  const period = Math.max(1, Number(ev.period || 1));
  const periodSeconds = Math.max(60, Number(ev.periodSeconds || 60));
  const remaining = Math.max(0, Number(ev.clockRemaining || 0));
  const elapsed = (period - 1) * periodSeconds + Math.max(0, periodSeconds - remaining);
  return Math.max(1, Math.ceil(elapsed / 60));
}
function getCurrentMatchElapsedSeconds(period: number, periodSeconds: number, remainingSeconds: number) {
  const p = Math.max(1, Number(period || 1));
  const ps = Math.max(60, Number(periodSeconds || 60));
  const rem = Math.max(0, Number(remainingSeconds || 0));
  return (p - 1) * ps + Math.max(0, ps - rem);
}

function getEventElapsedSeconds(ev: any) {
  const period = Math.max(1, Number(ev.period || 1));
  const periodSeconds = Math.max(60, Number(ev.periodSeconds || 60));
  const remaining = Math.max(0, Number(ev.clockRemaining || 0));
  return (period - 1) * periodSeconds + Math.max(0, periodSeconds - remaining);
}

function formatTimePlayed(seconds: number) {
  const m = Math.max(0, Math.floor(Number(seconds || 0) / 60));
  return `${m}'`;
}

function StatsTab({ score, shoots, events, teamA, teamB, teamAVisual, teamBVisual, rosterA, rosterB, initialLineups, elapsedSeconds }: any) {
  const teamStats = React.useMemo(() => buildFootStats(events, teamA, teamB, score, shoots, rosterA, rosterB, initialLineups, elapsedSeconds), [events, teamA, teamB, score, shoots, rosterA, rosterB, initialLineups, elapsedSeconds]);
  const [view, setView] = React.useState<"match" | "players">("match");

  const rows = [
    { label: "Score", left: `${score[0]}`, right: `${score[1]}` },
    { label: "2ème M-T", left: teamStats.teams[0].period2, right: teamStats.teams[1].period2 },
    { label: "1ère M-T", left: teamStats.teams[0].period1, right: teamStats.teams[1].period1 },
    { label: "Nombre de tirs", left: teamStats.teams[0].shotsTotal, right: teamStats.teams[1].shotsTotal },
    { label: "Tirs cadrés", left: teamStats.teams[0].shot_on, right: teamStats.teams[1].shot_on },
    { label: "Tirs non cadrés", left: teamStats.teams[0].shotsOffTotal, right: teamStats.teams[1].shotsOffTotal },
    { label: "Fautes", left: teamStats.teams[0].foul, right: teamStats.teams[1].foul },
    { label: "CJ", left: teamStats.teams[0].yellow, right: teamStats.teams[1].yellow },
    { label: "CR", left: teamStats.teams[0].red, right: teamStats.teams[1].red },
    { label: "TAB Réussi(s)", left: teamStats.teams[0].penalty_scored, right: teamStats.teams[1].penalty_scored },
    { label: "TAB raté(s)", left: teamStats.teams[0].penalty_missed, right: teamStats.teams[1].penalty_missed },
    { label: "CF Direct", left: teamStats.teams[0].free_kick, right: teamStats.teams[1].free_kick },
    { label: "But(s) Tête", left: teamStats.teams[0].header, right: teamStats.teams[1].header },
    { label: "But(s) Pied G", left: teamStats.teams[0].left_foot, right: teamStats.teams[1].left_foot },
    { label: "But(s) Pied D", left: teamStats.teams[0].right_foot, right: teamStats.teams[1].right_foot },
    { label: "Passes déc.", left: teamStats.teams[0].assist, right: teamStats.teams[1].assist },
    { label: "CSC", left: teamStats.teams[0].own_goal, right: teamStats.teams[1].own_goal },
  ];

  return (
    <section style={tabPanelStyle}>
      <StatsViewCarousel view={view} setView={setView} />
      {view === "match" ? (
        <FootStatsCard leftName={teamA} rightName={teamB} leftVisual={teamAVisual} rightVisual={teamBVisual} rows={rows} />
      ) : (
        <PlayerStatsTables leftName={teamA} rightName={teamB} leftPlayers={teamStats.players[0]} rightPlayers={teamStats.players[1]} />
      )}
    </section>
  );
}

function StatsViewCarousel({ view, setView }: { view: "match" | "players"; setView: (v: "match" | "players") => void }) {
  const isMatch = view === "match";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <button type="button" onClick={() => setView(isMatch ? "players" : "match")} style={carouselArrowBtn}>‹</button>
      <h2 style={{ ...tabTitleStyle, margin: 0 }}>{isMatch ? "STATS DU MATCH" : "STATS INDIVIDUELLES"}</h2>
      <button type="button" onClick={() => setView(isMatch ? "players" : "match")} style={carouselArrowBtn}>›</button>
    </div>
  );
}

function PlayerStatsTables({ leftName, rightName, leftPlayers, rightPlayers }: any) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <PlayerStatsTeamTable teamName={leftName} players={leftPlayers} />
      <PlayerStatsTeamTable teamName={rightName} players={rightPlayers} />
    </div>
  );
}

function PlayerStatsTeamTable({ teamName, players }: any) {
  const cols = ["B", "PD", "TC", "TNC", "F", "CJ/CR", "TJ"];
  const valueFor = (player: any, col: string) => {
    if (!player) return "0";
    if (col === "B") return player.goals || 0;
    if (col === "PD") return player.assist || 0;
    if (col === "TC") return player.shot_on || 0;
    if (col === "TNC") return player.shotsOffTotal || 0;
    if (col === "F") return player.foul || 0;
    if (col === "CJ/CR") return `${player.yellow || 0}/${player.red || 0}`;
    if (col === "TJ") return formatTimePlayed(player.timePlayedSeconds || 0);
    return 0;
  };
  const safePlayers = Array.isArray(players) ? players : [];
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${THEME_22}`, background: "rgba(255,255,255,.035)" }}>
      <div style={{ padding: "10px 12px", color: THEME, fontWeight: 1000, background: THEME_08, borderBottom: `1px solid ${THEME_22}`, overflowWrap: "anywhere", textAlign: "center" }}>{teamName}</div>
      <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))", alignItems: "center", background: "rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div />
        {cols.map((col) => <div key={col} style={playerTableHeaderCell}>{col}</div>)}
      </div>
      {safePlayers.length ? safePlayers.map((player: any) => (
        <div key={player.id || player.name} style={{ display: "grid", gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))", alignItems: "center", minHeight: 50, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "grid", placeItems: "center", padding: 6 }} title={player.name}><PlayerAvatarMini player={player} /></div>
          {cols.map((col) => <div key={col} style={playerTableValueCell}>{valueFor(player, col)}</div>)}
        </div>
      )) : <div style={{ padding: 12, opacity: .65, fontWeight: 800 }}>Aucun joueur.</div>}
      <div style={{ padding: "8px 12px", opacity: .65, fontSize: 10, fontWeight: 850 }}>B = but · PD = passe décisive · TC = tir cadré · TNC = tir non cadré · F = faute · CJ/CR = cartons · TJ = temps joué</div>
    </div>
  );
}

function FootStatsCard({ leftName, rightName, leftVisual, rightVisual, rows }: any) {
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${THEME_22}`, background: "rgba(255,255,255,.035)" }}>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 66, background: "linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.035), rgba(255,255,255,.08))", overflow: "hidden" }}>
        <StatsHeaderGhost src={leftVisual} side="left" />
        <StatsHeaderGhost src={rightVisual} side="right" />
        <div style={{ position: "relative", zIndex: 2, color: THEME, fontWeight: 1000, overflowWrap: "anywhere", lineHeight: 1.05, fontSize: "clamp(13px, 3.3vw, 18px)", textShadow: `0 0 12px ${THEME_44}` }}>{leftName}</div>
        <div style={{ position: "relative", zIndex: 2, color: THEME, fontWeight: 1000, textAlign: "right", overflowWrap: "anywhere", lineHeight: 1.05, fontSize: "clamp(13px, 3.3vw, 18px)", textShadow: `0 0 12px ${THEME_44}` }}>{rightName}</div>
      </div>
      {rows.map((row: any) => {
        const leftNum = Number(row.left || 0);
        const rightNum = Number(row.right || 0);
        const leftBest = leftNum > rightNum;
        const rightBest = rightNum > leftNum;
        return (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr", alignItems: "center", minHeight: 34, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ padding: "7px 12px", color: leftBest ? THEME : "#fff", fontWeight: 1000, borderBottom: `2px solid ${leftBest ? THEME_55 : "rgba(255,255,255,.55)"}`, background: leftBest ? `linear-gradient(90deg, ${THEME_12}, transparent)` : "linear-gradient(90deg, rgba(255,255,255,.08), transparent)" }}>{row.left}</div>
            <div style={{ padding: "7px 6px", textAlign: "center", fontWeight: 950, opacity: .92, fontSize: "clamp(10px, 2.55vw, 13px)", lineHeight: 1.08 }}>{row.label}</div>
            <div style={{ padding: "7px 12px", textAlign: "right", color: rightBest ? THEME : "#fff", fontWeight: 1000, borderBottom: `2px solid ${rightBest ? THEME_55 : "rgba(255,255,255,.55)"}`, background: rightBest ? `linear-gradient(270deg, ${THEME_12}, transparent)` : "linear-gradient(270deg, rgba(255,255,255,.08), transparent)" }}>{row.right}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatsHeaderGhost({ src, side }: { src?: string | null; side: "left" | "right" }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        zIndex: 1,
        top: "50%",
        [side]: -18,
        width: 110,
        height: 110,
        borderRadius: 999,
        objectFit: "cover",
        transform: "translateY(-50%) scale(1.15)",
        opacity: .20,
        filter: "saturate(1.2) contrast(1.12)",
        WebkitMaskImage: side === "left" ? "linear-gradient(90deg, #000 0%, #000 44%, transparent 100%)" : "linear-gradient(270deg, #000 0%, #000 44%, transparent 100%)",
        maskImage: side === "left" ? "linear-gradient(90deg, #000 0%, #000 44%, transparent 100%)" : "linear-gradient(270deg, #000 0%, #000 44%, transparent 100%)",
      } as React.CSSProperties}
    />
  );
}

function buildFootStats(events: any[], teamA: string, teamB: string, score: [number, number], shoots: [number, number], rosterA?: any[], rosterB?: any[], initialLineups?: { a?: string[]; b?: string[] }, elapsedSeconds?: number) {
  const emptyTeam = () => ({
    score: 0, period1: 0, period2: 0, shotsTotal: 0, shotsOffTotal: 0,
    goal: 0, penalty_scored: 0, penalty_missed: 0, own_goal: 0, foul: 0, yellow: 0, red: 0,
    shot_on: 0, shot_off: 0, post: 0, crossbar: 0,
    right_foot: 0, left_foot: 0, header: 0, free_kick: 0, assist: 0,
  });
  const emptyPlayer = (name: string, id: string, visual?: string | null) => ({
    key: id || name,
    id,
    name,
    visual: visual || null,
    goals: 0,
    shotsTotal: 0,
    shotsOffTotal: 0,
    foul: 0,
    yellow: 0,
    red: 0,
    shot_on: 0,
    shot_off: 0,
    post: 0,
    crossbar: 0,
    penalty_scored: 0,
    penalty_missed: 0,
    own_goal: 0,
    right_foot: 0,
    left_foot: 0,
    header: 0,
    free_kick: 0,
    assist: 0,
    timePlayedSeconds: 0,
  });

  const teams = [emptyTeam(), emptyTeam()];
  const players: any[] = [new Map(), new Map()];
  const visualByTeam: any[] = [new Map(), new Map()];
  const seedRoster = (team: number, roster?: any[]) => {
    if (!Array.isArray(roster)) return;
    roster.forEach((p: any) => {
      const name = String(p?.name || p?.displayName || "Joueur");
      const id = String(p?.id || name);
      const visual = p?.visual || p?.avatar || p?.avatarUrl || p?.avatarDataUrl || null;
      visualByTeam[team].set(id, visual);
      if (!players[team].has(id)) players[team].set(id, emptyPlayer(name, id, visual));
    });
  };
  seedRoster(0, rosterA);
  seedRoster(1, rosterB);

  const ensurePlayer = (team: number, ev: any) => {
    const name = ev.playerName || ev.awardedToPlayerName;
    const id = ev.playerId || ev.awardedToPlayerId || name;
    if (!name) return null;
    if (!players[team].has(String(id))) players[team].set(String(id), emptyPlayer(String(name), String(id), visualByTeam[team].get(String(id)) || null));
    return players[team].get(String(id));
  };

  events.forEach((ev: any) => {
    const team = typeof ev.scoringTeam === "number" ? ev.scoringTeam : Number(ev.team || 0);
    const eventTeam = Number(ev.team || 0);
    const statTeam = ev.type === "own_goal" && typeof ev.scoringTeam === "number" ? ev.scoringTeam : eventTeam;
    if (team === 0 || team === 1) {
      if (ev.type === "goal" || ev.type === "penalty_scored" || ev.type === "own_goal") {
        teams[team].score += 1;
        if (Number(ev.period || 1) <= 1) teams[team].period1 += 1;
        else teams[team].period2 += 1;
      }
    }
    if (statTeam !== 0 && statTeam !== 1) return;
    const ts = teams[statTeam];
    if (ev.type in ts) ts[ev.type as keyof typeof ts] += 1;
    if ((ev.type === "goal" || ev.type === "penalty_scored") && ev.assistPlayerName) ts.assist += 1;
    if (ev.type === "shot_on") ts.shotsTotal += 1;
    if (ev.type === "shot_off" || ev.type === "post" || ev.type === "crossbar" || ev.type === "penalty_missed") {
      ts.shotsTotal += 1;
      ts.shotsOffTotal += 1;
    }
    if (ev.type === "goal" || ev.type === "penalty_scored" || ev.type === "own_goal") {
      ts.shotsTotal += 1;
      ts.shot_on += 1;
    }
    if (ev.goalKind && ev.goalKind in ts) ts[ev.goalKind as keyof typeof ts] += 1;

    const ps = ensurePlayer(statTeam, ev);
    if (ps) {
      if (ev.type === "goal" || ev.type === "penalty_scored" || ev.type === "own_goal") ps.goals += 1;
      if (ev.type === "shot_on" || ev.type === "goal" || ev.type === "penalty_scored" || ev.type === "own_goal") {
        ps.shotsTotal += 1;
        ps.shot_on += 1;
      }
      if (ev.type === "shot_off" || ev.type === "post" || ev.type === "crossbar" || ev.type === "penalty_missed") {
        ps.shotsTotal += 1;
        ps.shotsOffTotal += 1;
      }
      ["foul", "yellow", "red", "penalty_scored", "penalty_missed", "own_goal"].forEach((k) => {
        if (ev.type === k) ps[k] += 1;
      });
      if (ev.goalKind && ev.goalKind in ps) ps[ev.goalKind] += 1;
      if ((ev.type === "goal" || ev.type === "penalty_scored") && ev.assistPlayerName) {
        const assistId = ev.assistPlayerId || ev.assistPlayerName;
        const assistName = String(ev.assistPlayerName);
        if (!players[statTeam].has(String(assistId))) players[statTeam].set(String(assistId), emptyPlayer(assistName, String(assistId), visualByTeam[statTeam].get(String(assistId)) || null));
        players[statTeam].get(String(assistId)).assist += 1;
      }
    }
  });

  // Temps de jeu : démarre avec les joueurs titulaires, puis applique les événements de remplacement.
  const currentElapsed = Math.max(0, Number(elapsedSeconds || 0));
  const computeTime = (team: 0 | 1, initialIds: string[]) => {
    const intervals = new Map<string, { start: number | null; total: number }>();
    const ensure = (id: string) => {
      if (!intervals.has(id)) intervals.set(id, { start: null, total: 0 });
      return intervals.get(id)!;
    };
    (initialIds || []).forEach((id) => { ensure(String(id)).start = 0; });
    const subs = events
      .filter((ev: any) => ev.type === "substitution" && Number(ev.team) === team)
      .slice()
      .sort((a: any, b: any) => getEventElapsedSeconds(a) - getEventElapsedSeconds(b));
    subs.forEach((ev: any) => {
      const t = Math.max(0, getEventElapsedSeconds(ev));
      const outId = String(ev.outPlayerId || "");
      const inId = String(ev.inPlayerId || ev.playerId || "");
      if (outId) {
        const out = ensure(outId);
        if (out.start != null) {
          out.total += Math.max(0, t - out.start);
          out.start = null;
        }
      }
      if (inId) {
        const inside = ensure(inId);
        if (inside.start == null) inside.start = t;
      }
    });
    intervals.forEach((interval, id) => {
      const total = interval.total + (interval.start != null ? Math.max(0, currentElapsed - interval.start) : 0);
      const p = players[team].get(id);
      if (p) p.timePlayedSeconds = total;
    });
  };
  computeTime(0, (initialLineups?.a || []).map(String));
  computeTime(1, (initialLineups?.b || []).map(String));

  teams[0].score = score[0];
  teams[1].score = score[1];
  return { teams, players: [Array.from(players[0].values()), Array.from(players[1].values())] };
}

function LineupTab({ teamA, teamB, rosterA, rosterB, playersPerSide, lineupA, lineupB, setLineupA, setLineupB, onSubstitute }: any) {
  const [side, setSide] = React.useState<0 | 1>(0);
  const [pickSpot, setPickSpot] = React.useState<number | null>(null);
  const count = Number(playersPerSide || 0);
  const defaultSpots = React.useMemo(() => getLineupSpots(count), [count]);
  const safeRosterA = Array.isArray(rosterA) ? rosterA : [];
  const safeRosterB = Array.isArray(rosterB) ? rosterB : [];
  const pitchRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<null | { index: number; side: 0 | 1; startX: number; startY: number; moved: boolean }>(null);
  const [spotsA, setSpotsA] = React.useState<Array<{ x: number; y: number }>>(() => defaultSpots);
  const [spotsB, setSpotsB] = React.useState<Array<{ x: number; y: number }>>(() => defaultSpots);
  const [selectedSubId, setSelectedSubId] = React.useState<string | null>(null);

  React.useEffect(() => { setSpotsA(defaultSpots); }, [defaultSpots.length]);
  React.useEffect(() => { setSpotsB(defaultSpots); }, [defaultSpots.length]);

  const roster = side === 0 ? safeRosterA : safeRosterB;
  const lineup = side === 0 ? lineupA : lineupB;
  const setLineup = side === 0 ? setLineupA : setLineupB;
  const spots = side === 0 ? spotsA : spotsB;
  const setSpots = side === 0 ? setSpotsA : setSpotsB;
  const title = side === 0 ? teamA : teamB;
  const getPlayer = (id?: string) => roster.find((p: any) => String(p.id) === String(id));
  const placed = (Array.isArray(lineup) ? lineup : []).map((id: string) => getPlayer(id));

  const replaceSpotWithBench = (index: number) => {
    if (!selectedSubId) return false;
    const oldAtSpot = lineup[index] || "";
    const outPlayer = getPlayer(oldAtSpot);
    const inPlayer = getPlayer(selectedSubId);
    if (outPlayer && inPlayer) onSubstitute?.(side, title, outPlayer, inPlayer);
    else {
      setLineup((prev: string[]) => {
        const next = [...prev];
        const subAlreadyOnPitch = next.findIndex((id) => String(id) === String(selectedSubId));
        if (subAlreadyOnPitch >= 0) next[subAlreadyOnPitch] = oldAtSpot;
        next[index] = selectedSubId;
        return next;
      });
    }
    setSelectedSubId(null);
    setPickSpot(null);
    return true;
  };

  const choosePlayerForSpot = (playerId: string) => {
    if (pickSpot === null) return;
    setLineup((prev: string[]) => {
      const next = [...prev];
      const previousIndex = next.findIndex((id, idx) => id === playerId && idx !== pickSpot);
      if (previousIndex >= 0) next[previousIndex] = next[pickSpot] || "";
      next[pickSpot] = playerId;
      return next;
    });
    setPickSpot(null);
  };

  const moveSpotFromPointer = (event: React.PointerEvent | PointerEvent, index: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(7, Math.min(93, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(7, Math.min(93, ((event.clientY - rect.top) / rect.height) * 100));
    setSpots((prev: any[]) => prev.map((spot, i) => i === index ? { x, y } : spot));
  };

  const onSpotPointerDown = (event: React.PointerEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { index, side, startX: event.clientX, startY: event.clientY, moved: false };
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch {}
  };

  const onSpotPointerMove = (event: React.PointerEvent, index: number) => {
    const drag = dragRef.current;
    if (!drag || drag.index !== index || drag.side !== side) return;
    const dist = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (dist > 5) drag.moved = true;
    if (drag.moved) moveSpotFromPointer(event, index);
  };

  const onSpotPointerUp = (event: React.PointerEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.index !== index || drag.side !== side || !drag.moved) {
      if (!replaceSpotWithBench(index)) setPickSpot(index);
    }
  };

  return (
    <section style={tabPanelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <h2 style={{ ...tabTitleStyle, margin: 0 }}>COMPO</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: `1px solid ${THEME_33}`, borderRadius: 14, overflow: "hidden", minWidth: 180 }}>
          <button type="button" onClick={() => { setSide(0); setPickSpot(null); setSelectedSubId(null); }} style={lineupSwitchBtn(side === 0)}>Domicile</button>
          <button type="button" onClick={() => { setSide(1); setPickSpot(null); setSelectedSubId(null); }} style={lineupSwitchBtn(side === 1)}>Extérieur</button>
        </div>
      </div>

      <div style={{ color: THEME, fontWeight: 1000, margin: "0 0 6px", textAlign: "center", textShadow: `0 0 12px ${THEME_44}` }}>{title}</div>
      <div style={{ opacity: .72, fontSize: 12, fontWeight: 850, textAlign: "center", marginBottom: 8 }}>Déplace les médaillons au doigt. Pour remplacer : sélectionne un remplaçant puis clique le titulaire.</div>

      <div ref={pitchRef} style={{ position: "relative", width: "100%", aspectRatio: "0.66 / 1", minHeight: 560, maxHeight: "min(78vh, 820px)", borderRadius: 22, overflow: "hidden", border: `1px solid ${THEME_33}`, background: "#07160c", boxShadow: `inset 0 0 28px ${THEME_12}`, touchAction: "none" }}>
        <img src={footPitchBg} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: .95, filter: "saturate(1.15) contrast(1.08)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.18))" }} />
        {spots.map((spot, index) => {
          const player = placed[index];
          const initial = String(player?.name || "?").trim().charAt(0).toUpperCase() || "?";
          return (
            <button type="button" key={`${side}-${index}`} onPointerDown={(e) => onSpotPointerDown(e, index)} onPointerMove={(e) => onSpotPointerMove(e, index)} onPointerUp={(e) => onSpotPointerUp(e, index)} style={{ position: "absolute", left: `${spot.x}%`, top: `${spot.y}%`, transform: "translate(-50%, -50%)", display: "grid", justifyItems: "center", gap: 4, width: 92, maxWidth: "24%", border: 0, background: "transparent", padding: 0, cursor: "grab", color: "#fff", touchAction: "none", userSelect: "none" }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", overflow: "hidden", border: `2px solid ${THEME}`, background: `radial-gradient(circle, ${THEME_28}, rgba(0,0,0,.82))`, boxShadow: `0 0 18px ${THEME_44}`, color: "#fff", fontWeight: 1000, fontSize: 18 }}>
                {player?.visual ? <img src={player.visual} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} /> : initial}
              </div>
              <div style={{ maxWidth: "100%", padding: "3px 7px", borderRadius: 999, background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 10, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player?.name || `Poste ${index + 1}`}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <BenchList title={selectedSubId ? "Remplaçant sélectionné : clique le joueur à sortir" : "Banc des remplaçants"} roster={roster.filter((p: any) => !(lineup || []).includes(String(p.id)))} onPick={(playerId: string) => setSelectedSubId(playerId)} />
        <RosterList title={title} roster={roster} />
      </div>

      {pickSpot !== null && <LineupPlayerPicker title={title} spot={pickSpot} roster={roster} onClose={() => setPickSpot(null)} onSelect={choosePlayerForSpot} />}
    </section>
  );
}

function LineupPlayerPicker({ title, spot, roster, onClose, onSelect }: any) {
  const safeRoster = Array.isArray(roster) && roster.length ? roster : [];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(420px, 100%)", maxHeight: "82vh", overflowY: "auto", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,20,24,.98), rgba(5,8,10,.98))", border: `1px solid ${THEME_33}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>Choisir le joueur</div>
            <div style={{ opacity: .72, fontWeight: 850, fontSize: 13 }}>{title} · poste {Number(spot) + 1}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME_33}`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {safeRoster.map((p: any) => (
            <button key={p.id} type="button" onClick={() => onSelect(String(p.id))} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${THEME_28}`, borderRadius: 16, padding: 10, background: THEME_10, color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
              <PlayerAvatarMini player={p} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLineupSpots(count: number): Array<{ x: number; y: number }> {
  const layouts: Record<number, Array<{ x: number; y: number }>> = {
    3: [{ x: 50, y: 84 }, { x: 34, y: 48 }, { x: 66, y: 48 }],
    5: [{ x: 50, y: 88 }, { x: 30, y: 62 }, { x: 70, y: 62 }, { x: 38, y: 34 }, { x: 62, y: 34 }],
    7: [{ x: 50, y: 90 }, { x: 26, y: 68 }, { x: 50, y: 68 }, { x: 74, y: 68 }, { x: 30, y: 38 }, { x: 70, y: 38 }, { x: 50, y: 22 }],
    8: [{ x: 50, y: 90 }, { x: 24, y: 70 }, { x: 50, y: 70 }, { x: 76, y: 70 }, { x: 32, y: 48 }, { x: 68, y: 48 }, { x: 38, y: 24 }, { x: 62, y: 24 }],
    11: [{ x: 50, y: 92 }, { x: 18, y: 76 }, { x: 38, y: 76 }, { x: 62, y: 76 }, { x: 82, y: 76 }, { x: 26, y: 54 }, { x: 50, y: 54 }, { x: 74, y: 54 }, { x: 26, y: 30 }, { x: 74, y: 30 }, { x: 50, y: 16 }],
  };
  if (layouts[count]) return layouts[count];
  return Array.from({ length: Math.max(3, count || 3) }, (_, i) => ({
    x: 20 + (i % 4) * 20,
    y: 84 - Math.floor(i / 4) * 22,
  }));
}

function lineupSwitchBtn(active: boolean): React.CSSProperties {
  return {
    border: 0,
    padding: "8px 10px",
    background: active ? THEME_22 : "rgba(255,255,255,.045)",
    color: active ? THEME : "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    minWidth: 0,
  };
}

function BenchList({ title, roster, onPick }: any) {
  const safe = Array.isArray(roster) ? roster : [];
  return (
    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <div style={{ color: THEME, fontWeight: 1000, marginBottom: 8 }}>{title}</div>
      {safe.length ? (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {safe.map((p: any) => (
            <button key={p.id} type="button" onClick={() => onPick?.(String(p.id))} title="Sélectionne ce remplaçant puis clique le joueur à remplacer sur le terrain" style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 62, border: 0, background: "transparent", color: "#fff", cursor: "pointer", padding: 0 }}>
              <PlayerAvatarMini player={p} />
              <div style={{ maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, fontWeight: 900, opacity: .82 }}>{p.name}</div>
            </button>
          ))}
        </div>
      ) : <div style={{ opacity: .62, fontWeight: 800, fontSize: 12 }}>Aucun remplaçant disponible.</div>}
    </div>
  );
}

function RosterList({ title, roster }: any) {
  const safe = Array.isArray(roster) && roster.length ? roster : [];
  return <div style={{ marginTop: 10 }}><div style={{ color: THEME, fontWeight: 1000, marginBottom: 6 }}>{title}</div>{safe.length ? safe.map((p: any) => <div key={p.id} style={{ opacity: .82, fontWeight: 850 }}>• {p.name}</div>) : <div style={{ opacity: .6, fontWeight: 800 }}>Aucun joueur détaillé.</div>}</div>;
}

function EmptyTab({ title, text }: { title: string; text: string }) {
  return <section style={tabPanelStyle}><h2 style={tabTitleStyle}>{title}</h2><div style={{ opacity: .76, fontWeight: 850 }}>{text}</div></section>;
}
function RulesModal({ title, rules, onClose }: { title: string; rules: string[]; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(420px, 100%)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,25,17,.98), rgba(5,10,8,.98))", border: `1px solid ${THEME_44}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 10 }}>
          <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME_33}`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>{rules.map((r) => <div key={r} style={{ opacity: .82, fontWeight: 850 }}>• {r}</div>)}</div>
      </div>
    </div>
  );
}

function PlayerPickModal({ data, roster, fallbackName, playersPerSide, activeIds, onClose, onSelect }: any) {
  const safeRoster = Array.isArray(roster) && roster.length ? roster : [{ id: `team_${fallbackName}`, name: fallbackName }];
  const activeSet = new Set((Array.isArray(activeIds) && activeIds.length ? activeIds : safeRoster.slice(0, Math.max(1, Number(playersPerSide || safeRoster.length))).map((id: any) => String(id))));
  const actionLabel = data.goalLabel || labels[data.actionType as EventType] || "Action";
  const [benchCandidate, setBenchCandidate] = React.useState<any | null>(null);
  const starters = safeRoster.filter((p: any) => activeSet.has(String(p.id)));
  const bench = safeRoster.filter((p: any) => !activeSet.has(String(p.id)));

  const choose = (player: any) => {
    if (!player) return;
    if (!activeSet.has(String(player.id)) && starters.length) {
      setBenchCandidate(player);
      return;
    }
    onSelect(player);
  };

  const renderPlayerButton = (p: any, isOnPitch: boolean) => (
    <button key={p.id} type="button" onClick={() => choose(p)} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${THEME_28}`, borderRadius: 16, padding: 10, background: isOnPitch ? THEME_10 : "rgba(255,255,255,.045)", color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
      <PlayerAvatarMini player={p} />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
      <span style={{ borderRadius: 999, padding: "4px 7px", background: isOnPitch ? THEME_18 : "rgba(255,255,255,.08)", color: isOnPitch ? THEME : "rgba(255,255,255,.7)", fontSize: 10, fontWeight: 1000 }}>{isOnPitch ? "Terrain" : "Rempl."}</span>
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(440px, 100%)", maxHeight: "82vh", overflowY: "auto", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,20,24,.98), rgba(5,8,10,.98))", border: `1px solid ${THEME_28}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>Choisir le joueur</div>
            <div style={{ opacity: .72, fontWeight: 850, fontSize: 13 }}>{data.teamName} · {actionLabel}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME_33}`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>

        {benchCandidate ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ borderRadius: 16, padding: 12, background: THEME_10, border: `1px solid ${THEME_28}`, fontWeight: 900 }}>
              <span style={{ color: THEME }}>Remplaçant sélectionné :</span> {benchCandidate.name}<br />
              <span style={{ opacity: .75, fontSize: 12 }}>Choisis le joueur qu’il remplace. Le remplacement sera appliqué puis la stat sera ajoutée.</span>
            </div>
            {starters.map((p: any) => (
              <button key={p.id} type="button" onClick={() => onSelect(benchCandidate, { autoSubOut: p })} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${THEME_28}`, borderRadius: 16, padding: 10, background: THEME_10, color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
                <PlayerAvatarMini player={p} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ opacity: .7, fontSize: 11 }}>sort</span>
              </button>
            ))}
            <button type="button" onClick={() => setBenchCandidate(null)} style={{ ...modalBtn, background: "rgba(255,255,255,.06)" }}>← Retour</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: THEME, fontWeight: 1000, fontSize: 13 }}>Joueurs sur le terrain</div>
              {starters.map((p: any) => renderPlayerButton(p, true))}
            </div>
            {bench.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 1000, fontSize: 13 }}>Remplaçants — sélection possible avec remplacement immédiat</div>
                {bench.map((p: any) => renderPlayerButton(p, false))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistModal({ data, roster, activeIds, onClose, onSelect }: any) {
  const activeSet = new Set((Array.isArray(activeIds) ? activeIds : []).map((id: any) => String(id)));
  const safeRoster = Array.isArray(roster) ? roster.filter((p: any) => String(p.id) !== String(data.scorer?.id) && (!activeSet.size || activeSet.has(String(p.id)))) : [];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(440px, 100%)", maxHeight: "82vh", overflowY: "auto", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,20,24,.98), rgba(5,8,10,.98))", border: `1px solid ${THEME_28}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>Passe décisive ?</div>
            <div style={{ opacity: .72, fontWeight: 850, fontSize: 13 }}>{data.teamName} · Buteur : {data.scorer?.name || "Joueur"}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME_33}`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" onClick={() => onSelect(null)} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${THEME_28}`, borderRadius: 16, padding: 12, background: "rgba(255,255,255,.055)", color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
            <span style={{ width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(255,255,255,.08)" }}>—</span>
            Aucune
          </button>
          {safeRoster.map((p: any) => (
            <button key={p.id} type="button" onClick={() => onSelect(p)} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${THEME_28}`, borderRadius: 16, padding: 10, background: THEME_10, color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
              <PlayerAvatarMini player={p} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


function SubstitutionModal({ data, roster, activeIds, onClose, onConfirm }: any) {
  const safeRoster = Array.isArray(roster) ? roster : [];
  const activeSet = new Set((Array.isArray(activeIds) ? activeIds : []).map((id: any) => String(id)));
  const starters = safeRoster.filter((p: any) => activeSet.has(String(p.id)));
  const bench = safeRoster.filter((p: any) => !activeSet.has(String(p.id)));
  const [outId, setOutId] = React.useState<string>("");
  const [inId, setInId] = React.useState<string>("");
  const outPlayer = safeRoster.find((p: any) => String(p.id) === String(outId));
  const inPlayer = safeRoster.find((p: any) => String(p.id) === String(inId));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(460px, 100%)", maxHeight: "84vh", overflowY: "auto", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,25,17,.98), rgba(5,10,8,.98))", border: `1px solid ${THEME_28}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>Remplacement</div>
            <div style={{ opacity: .72, fontWeight: 850, fontSize: 13 }}>{data.teamName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME_33}`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <SubPick title="Joueur qui sort" roster={starters.length ? starters : safeRoster} selectedId={outId} onSelect={setOutId} />
        <SubPick title="Joueur qui entre" roster={bench.length ? bench : safeRoster} selectedId={inId} onSelect={setInId} />
        <button type="button" disabled={!outPlayer || !inPlayer || outId === inId} onClick={() => onConfirm(outPlayer, inPlayer)} style={{ ...primaryBtn, width: "100%", marginTop: 12, opacity: !outPlayer || !inPlayer || outId === inId ? .45 : 1 }}>VALIDER LE REMPLACEMENT</button>
      </div>
    </div>
  );
}

function SubPick({ title, roster, selectedId, onSelect }: any) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: THEME, fontWeight: 1000, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {roster.map((p: any) => {
          const active = String(selectedId) === String(p.id);
          return (
            <button key={p.id} type="button" onClick={() => onSelect(String(p.id))} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${active ? THEME : THEME_28}`, borderRadius: 16, padding: 10, background: active ? THEME_22 : THEME_10, color: "#fff", fontWeight: 1000, cursor: "pointer", textAlign: "left" }}>
              <PlayerAvatarMini player={p} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayerAvatarMini({ player }: { player: any }) {
  const initial = String(player?.name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span style={{ width: 38, height: 38, borderRadius: 999, overflow: "hidden", display: "grid", placeItems: "center", flex: "0 0 auto", border: `1px solid ${THEME_44}`, background: THEME_12, boxShadow: `0 0 12px ${THEME_22}` }}>
      {player?.visual ? <img src={player.visual} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{initial}</span>}
    </span>
  );
}

function ActionModal({ data, onClose, onGoal, onStat }: any) {
  const title = data.kind === "goal" ? "Détail du but" : "Stat sans impact score";
  const subtitle = `${data.teamName}${data.player?.name ? ` · ${data.player.name}` : ""}`;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(420px, 100%)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,25,17,.98), rgba(5,10,8,.98))", border: `1px solid ${THEME_28}`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>{title}</div>
            <div style={{ opacity: .72, fontWeight: 850, fontSize: 13 }}>{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {data.kind === "goal" ? goalOptions.map((opt) => (
            <button key={opt.key} type="button" onClick={() => onGoal(opt.key)} style={modalBtn}>{opt.icon} {opt.label}</button>
          )) : statOptions.map((opt) => (
            <button key={opt.type} type="button" onClick={() => onStat(opt.type)} style={modalBtn}>{opt.icon} {opt.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
function playFootBuzzer() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    const notes = [740, 554, 740];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.24, now + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.19);
    });
    master.gain.exponentialRampToValueAtTime(0.8, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
}
const carouselArrowBtn: React.CSSProperties = { width: 40, height: 36, border: `1px solid ${THEME_33}`, borderRadius: 12, background: THEME_10, color: THEME, fontWeight: 1000, fontSize: 22, cursor: "pointer" };
const playerTableHeaderCell: React.CSSProperties = { textAlign: "center", color: THEME, fontSize: 10, fontWeight: 1000, padding: "7px 2px", borderLeft: "1px solid rgba(255,255,255,.06)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const playerTableValueCell: React.CSSProperties = { textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 1000, padding: "7px 2px", borderLeft: "1px solid rgba(255,255,255,.06)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const clockIconBtn = (tone: "play" | "pause" | "neutral"): React.CSSProperties => ({ width: 46, height: 38, border: `1px solid ${THEME_33}`, borderRadius: 14, padding: 0, display: "grid", placeItems: "center", background: tone === "play" ? THEME_GRAD : tone === "pause" ? "linear-gradient(135deg, #ffbd3a, #ff7b1a)" : "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, fontSize: 18, cursor: "pointer", boxShadow: tone === "neutral" ? "none" : `0 0 18px ${THEME_24}` });
const modalBtn: React.CSSProperties = { border: `1px solid ${THEME_33}`, borderRadius: 14, padding: "12px 10px", background: `${THEME_12}`, color: "#fff", fontWeight: 1000, cursor: "pointer", minHeight: 48 };
const miniEventBtn: React.CSSProperties = { border: `1px solid ${THEME_35}`, borderRadius: 10, padding: "9px 8px", background: `${THEME_12}`, color: "#fff", fontSize: 12, fontWeight: 1000, cursor: "pointer", boxShadow: `inset 0 0 18px ${THEME_08}` };
const infoDotBtn: React.CSSProperties = { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 54, height: 54, borderRadius: 999, border: `1px solid ${THEME_55}`, background: "rgba(0,0,0,.35)", color: THEME, fontSize: 24, fontWeight: 1000, boxShadow: `0 0 22px ${THEME_33}`, cursor: "pointer" };
const tabPanelStyle: React.CSSProperties = { borderRadius: 18, padding: 13, marginTop: 12, background: "rgba(255,255,255,.045)", border: `1px solid ${THEME_22}` };
const tabTitleStyle: React.CSSProperties = { margin: "0 0 10px", color: THEME, fontSize: 18, fontWeight: 1000, textAlign: "center" };
const secondaryBtn: React.CSSProperties = { flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { flex: 1.4, border: 0, borderRadius: 16, padding: 12, background: THEME_GRAD, color: "#fff", fontWeight: 1000, cursor: "pointer" };
