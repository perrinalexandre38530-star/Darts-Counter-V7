import React from "react";
import BackDot from "../../components/BackDot";
import { getFootFormat } from "./footFormats";
import { getFootGameTicker } from "./footTickers";

type Props = { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void };
type EventType = "goal" | "assist" | "yellow" | "red" | "own_goal" | "penalty_scored" | "penalty_missed" | "foul" | "shot_on" | "shot_off" | "post" | "crossbar";
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
];

export default function FootPlay({ go, params, onFinish }: Props) {
  const cfg = params?.config || {};
  const spec = getFootFormat(cfg.format);
  const teamA = String(cfg.teamA || (spec.kind === "duel" ? "Joueur A" : "Équipe A"));
  const teamB = String(cfg.teamB || (spec.kind === "duel" ? "Joueur B" : "Équipe B"));
  const [score, setScore] = React.useState<[number, number]>([0, 0]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [shoots, setShoots] = React.useState<[number, number]>([0, 0]);
  const [actionModal, setActionModal] = React.useState<null | { kind: "goal" | "more"; team: 0 | 1; teamName: string; player?: any }>(null);
  const buzzerPlayedRef = React.useRef(false);
  const rosterA = React.useMemo(() => buildRoster(cfg.teamAPlayerIds, cfg.playersA, cfg.playersAVisuals), [cfg.teamAPlayerIds, cfg.playersA, cfg.playersAVisuals]);
  const rosterB = React.useMemo(() => buildRoster(cfg.teamBPlayerIds, cfg.playersB, cfg.playersBVisuals), [cfg.teamBPlayerIds, cfg.playersB, cfg.playersBVisuals]);

  const addEvent = (team: 0 | 1, type: EventType, player?: any, extra?: any) => {
    const ev = {
      id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      team,
      teamName: team === 0 ? teamA : teamB,
      type,
      label: labels[type],
      icon: icons[type],
      format: spec.id,
      playerId: player?.id || null,
      playerName: player?.name || null,
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
    if (goalKind === "own_goal_awarded") {
      const adverseTeam = actionModal.team === 0 ? 1 : 0;
      const adverseName = adverseTeam === 0 ? teamA : teamB;
      const ev = {
        id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        team: adverseTeam,
        teamName: adverseName,
        scoringTeam: actionModal.team,
        scoringTeamName: actionModal.teamName,
        type: "own_goal",
        label: "CSC adverse",
        icon: icons.own_goal,
        format: spec.id,
        playerId: null,
        playerName: null,
        awardedToPlayerId: actionModal.player?.id || null,
        awardedToPlayerName: actionModal.player?.name || null,
        goalKind,
      };
      setEvents((prev) => [ev, ...prev]);
      setScore(([a, b]) => actionModal.team === 0 ? [a + 1, b] : [a, b + 1]);
    } else {
      addEvent(actionModal.team, goalKind === "penalty" ? "penalty_scored" : "goal", actionModal.player, { goalKind, goalLabel });
    }
    setActionModal(null);
  };

  const addStatDetail = (type: EventType) => {
    if (!actionModal) return;
    addEvent(actionModal.team, type, actionModal.player, { statOnly: true });
    setActionModal(null);
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
  const [rulesOpen, setRulesOpen] = React.useState(false);

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, rgba(40,180,90,.25), transparent 38%), linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ position: "relative", height: 96, marginBottom: 12, borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 38px rgba(0,0,0,.45)" }}>
          <img src={tickerSrc} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.05) contrast(1.05)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.62), rgba(0,0,0,.12), rgba(0,0,0,.62))" }} />
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
            <BackDot onClick={() => go("foot_config", { format: spec.id, config: cfg })} />
          </div>
          <button type="button" aria-label="Règles" onClick={() => setRulesOpen(true)} style={infoDotBtn}>ⓘ</button>
        </div>
        <h1 style={{ textAlign: "center", margin: "6px 0 4px", fontSize: 34, color: THEME, textShadow: `0 0 18px ${THEME}66` }}>{spec.label}</h1>
        <p style={{ textAlign: "center", margin: "0 0 14px", color: THEME, opacity: .9, fontWeight: 1000 }}>{isPenalty ? `${cfg.shoots || 5} tirs par camp · mort subite possible` : `${cfg.periods || spec.periods} période(s) · ${cfg.minutes || spec.minutesPerPeriod} min`}</p>

        {!isPenalty && (
          <ClockBar
            running={clockRunning}
            period={currentPeriod}
            periodCount={periodCount}
            remaining={remainingSeconds}
            onToggle={() => { if (!clockRunning && remainingSeconds === 0) buzzerPlayedRef.current = false; setClockRunning((v) => !v); }}
            onReset={() => { setClockRunning(false); setRemainingSeconds(periodSeconds); buzzerPlayedRef.current = false; }}
            onNextPeriod={nextPeriod}
          />
        )}

        <FootPlayTabs active={activeTab} onChange={setActiveTab} showRanking={Boolean(cfg.competitionId || cfg.leagueId || cfg.tournamentId)} />

        {activeTab === "score" && <>
        <div style={{ position: "relative", borderRadius: 26, padding: 18, border: "1px solid rgba(255,255,255,.14)", background: "linear-gradient(90deg, rgba(10,35,18,.86), rgba(13,46,24,.76), rgba(10,35,18,.86))", boxShadow: "0 18px 44px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <ScoreGhost src={teamAVisual} side="left" />
          <ScoreGhost src={teamBVisual} side="right" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(3,14,8,.34), rgba(3,14,8,.72) 38%, rgba(3,14,8,.72) 62%, rgba(3,14,8,.34))", zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", textAlign: "center" }}>
            <TeamScore name={teamA} score={score[0]} extra={isPenalty ? `${shoots[0]} tir(s)` : spec.kind === "team" ? `${rosterA.length || spec.playersPerSide} joueurs` : ""} />
            <div style={{ fontSize: 28, fontWeight: 1000, color: THEME, opacity: .7 }}>-</div>
            <TeamScore name={teamB} score={score[1]} extra={isPenalty ? `${shoots[1]} tir(s)` : spec.kind === "team" ? `${rosterB.length || spec.playersPerSide} joueurs` : ""} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <EventPanel team={teamA} roster={rosterA} penalty={isPenalty} onGoal={(player?: any) => setActionModal({ kind: "goal", team: 0, teamName: teamA, player })} onMore={(player?: any) => setActionModal({ kind: "more", team: 0, teamName: teamA, player })} onPenalty={(type: EventType, player?: any) => addEvent(0, type, player)} />
          <EventPanel team={teamB} roster={rosterB} penalty={isPenalty} onGoal={(player?: any) => setActionModal({ kind: "goal", team: 1, teamName: teamB, player })} onMore={(player?: any) => setActionModal({ kind: "more", team: 1, teamName: teamB, player })} onPenalty={(type: EventType, player?: any) => addEvent(1, type, player)} />
        </div>

        </>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={undo} style={secondaryBtn}>ANNULER DERNIER</button>
          <button onClick={finish} style={primaryBtn}>TERMINER / ENREGISTRER</button>
        </div>

        {activeTab === "timeline" && <TimelineTab events={events} />}
        {activeTab === "stats" && <StatsTab score={score} shoots={shoots} events={events} teamA={teamA} teamB={teamB} />}
        {activeTab === "lineup" && <LineupTab teamA={teamA} teamB={teamB} rosterA={rosterA} rosterB={rosterB} />}
        {activeTab === "ranking" && <EmptyTab title="CLASSEMENT" text="Le classement lié à cette ligue ou ce tournoi sera affiché ici." />}
      </div>
      {rulesOpen && <RulesModal title={`Règles ${spec.label}`} rules={spec.rules} onClose={() => setRulesOpen(false)} />}
      {actionModal && (
        <ActionModal
          data={actionModal}
          onClose={() => setActionModal(null)}
          onGoal={addGoalDetail}
          onStat={addStatDetail}
        />
      )}
    </div>
  );
}
function TeamScore({ name, score, extra }: any) {
  return (
    <div style={{ position: "relative", zIndex: 3, minWidth: 0 }}>
      <div style={{ fontSize: 16, color: THEME, fontWeight: 1000, minHeight: 28, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: `0 0 12px ${THEME}55` }}>{name}</div>
      <div style={{ fontSize: 62, fontWeight: 1000, lineHeight: 1, textShadow: "0 4px 18px rgba(0,0,0,.65)" }}>{score}</div>
      {extra ? <div style={{ fontSize: 11, opacity: .75, fontWeight: 900 }}>{extra}</div> : null}
    </div>
  );
}

function ScoreGhost({ src, side }: { src?: string | null; side: "left" | "right" }) {
  if (!src) return null;
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 0,
        top: "50%",
        [side]: "-11%",
        width: "44%",
        maxWidth: 270,
        aspectRatio: "1 / 1",
        transform: `translateY(-50%) ${side === "right" ? "scaleX(-1)" : ""}`,
        borderRadius: "999px",
        overflow: "hidden",
        background: "radial-gradient(circle, rgba(57,240,131,.18), rgba(0,0,0,.82) 66%, rgba(0,0,0,0) 70%)",
        boxShadow: "0 0 44px rgba(57,240,131,.18)",
        opacity: .5,
        pointerEvents: "none",
      } as React.CSSProperties}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: "8%",
          width: "84%",
          height: "84%",
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: "999px",
          transform: "scale(1.38)",
          opacity: .42,
          filter: "saturate(1.2) contrast(1.12) drop-shadow(0 0 18px rgba(57,240,131,.25))",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, rgba(0,0,0,.05), rgba(0,0,0,.78) 78%)` }} />
    </div>
  );
}

function ClockBar({ running, period, periodCount, remaining, onToggle, onReset, onNextPeriod }: any) {
  const mm = Math.floor(Number(remaining || 0) / 60);
  const ss = Number(remaining || 0) % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const canNext = period < periodCount;
  return (
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", margin: "0 0 10px", padding: 12, minHeight: 68, borderRadius: 18, background: "rgba(57,240,131,.075)", border: `1px solid ${THEME}33`, overflow: "hidden" }}>
      <div style={{ minWidth: 0, position: "relative", zIndex: 2 }}>
        <div style={{ color: THEME, fontWeight: 1000, fontSize: 12 }}>CHRONO</div>
        <div style={{ opacity: .78, fontSize: 11, fontWeight: 900 }}>Période {period}/{periodCount}</div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", fontWeight: 1000, fontSize: 30, lineHeight: 1, color: "#fff", textShadow: `0 0 18px ${THEME}44`, pointerEvents: "none" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "end", position: "relative", zIndex: 2 }}>
        <button type="button" onClick={onToggle} style={clockBtn(running ? "pause" : "play")}>{running ? "⏸ Pause" : "▶ Lancer"}</button>
        <button type="button" onClick={remaining === 0 && canNext ? onNextPeriod : onReset} style={clockBtn("neutral")}>{remaining === 0 && canNext ? "Période +" : "↺"}</button>
      </div>
    </div>
  );
}
function buildRoster(idsRaw: any, namesRaw: any, visualsRaw?: any) {
  const ids = Array.isArray(idsRaw) ? idsRaw.map(String) : [];
  const names = Array.isArray(namesRaw) ? namesRaw.map(String) : [];
  const visuals = Array.isArray(visualsRaw) ? visualsRaw.map((v) => String(v || "")) : [];
  return ids.map((id, index) => ({ id, name: names[index] || `Joueur ${index + 1}`, visual: visuals[index] || null })).filter((p) => p.id);
}
function firstRosterVisual(roster: any[]) {
  return Array.isArray(roster) ? roster.find((p) => p?.visual)?.visual || null : null;
}
function EventPanel({ team, roster, onGoal, onMore, onPenalty, penalty }: any) {
  const safeRoster = Array.isArray(roster) && roster.length ? roster : [{ id: `team_${team}`, name: team }];
  const hidePlayerName = safeRoster.length === 1 && String(safeRoster[0]?.name || "").trim() === String(team || "").trim();
  return (
    <div style={{ borderRadius: 20, padding: 12, background: `linear-gradient(180deg, ${THEME}10, rgba(255,255,255,.035))`, border: `1px solid ${THEME}33`, boxShadow: `0 0 24px ${THEME}12` }}>
      <div style={{ color: THEME, fontWeight: 1000, marginBottom: 9, textAlign: "center", fontSize: 17, textShadow: `0 0 12px ${THEME}55` }}>{team}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {safeRoster.map((player: any) => (
          <div key={player.id} style={{ borderRadius: 14, padding: 8, background: "rgba(0,0,0,.20)", border: `1px solid ${THEME}24` }}>
            {!hidePlayerName ? <div style={{ color: THEME, fontSize: 12, fontWeight: 1000, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div> : null}
            {penalty ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button onClick={() => onPenalty("penalty_scored", player)} style={miniEventBtn}>✅ Marqué</button>
                <button onClick={() => onPenalty("penalty_missed", player)} style={miniEventBtn}>❌ Raté</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                <button onClick={() => onGoal(player)} style={miniEventBtn}>⚽ BUT</button>
                <button onClick={() => onMore(player)} style={{ ...miniEventBtn, minWidth: 46, fontSize: 18, lineHeight: 1 }}>+</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
type FootPlayTab = "score" | "timeline" | "stats" | "lineup" | "ranking";
const THEME = "#39f083";

function FootPlayTabs({ active, onChange, showRanking }: { active: FootPlayTab; onChange: (tab: FootPlayTab) => void; showRanking: boolean }) {
  const tabs: Array<{ key: FootPlayTab; label: string }> = [
    { key: "score", label: "SCORE" },
    { key: "timeline", label: "FIL DU MATCH" },
    { key: "stats", label: "STATS" },
    { key: "lineup", label: "COMPO" },
  ];
  if (showRanking) tabs.push({ key: "ranking", label: "CLASSEMENT" });
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0 10px", margin: "0 0 2px", scrollbarWidth: "none" }}>
      {tabs.map((tab) => (
        <button key={tab.key} type="button" onClick={() => onChange(tab.key)} style={{ border: `1px solid ${active === tab.key ? THEME : "rgba(255,255,255,.12)"}`, borderRadius: 999, padding: "10px 12px", background: active === tab.key ? `${THEME}22` : "rgba(255,255,255,.055)", color: active === tab.key ? THEME : "#fff", fontWeight: 1000, whiteSpace: "nowrap", boxShadow: active === tab.key ? `0 0 18px ${THEME}22` : "none" }}>{tab.label}</button>
      ))}
    </div>
  );
}

function TimelineTab({ events }: { events: any[] }) {
  return (
    <section style={tabPanelStyle}>
      <h2 style={tabTitleStyle}>FIL DU MATCH</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {events.length === 0 ? <div style={{ opacity: .65, fontWeight: 800 }}>Aucun événement pour le moment.</div> : events.map((ev) => <div key={ev.id} style={{ borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,.06)", border: `1px solid ${THEME}22`, fontWeight: 850 }}>{ev.icon} {ev.scoringTeamName || ev.teamName} · {ev.goalLabel || ev.label}{ev.playerName ? ` · ${ev.playerName}` : ev.awardedToPlayerName ? ` · pour ${ev.awardedToPlayerName}` : ""}</div>)}
      </div>
    </section>
  );
}

function StatsTab({ score, shoots, events, teamA, teamB }: any) {
  const goals = events.filter((ev: any) => ev.type === "goal" || ev.type === "penalty_scored" || ev.type === "own_goal").length;
  const cards = events.filter((ev: any) => ev.type === "yellow" || ev.type === "red").length;
  return <EmptyTab title="STATS" text={`${teamA} ${score[0]} - ${score[1]} ${teamB} · ${goals} but(s) · ${cards} carton(s) · tirs au but ${shoots[0]}-${shoots[1]}`} />;
}

function LineupTab({ teamA, teamB, rosterA, rosterB }: any) {
  return (
    <section style={tabPanelStyle}>
      <h2 style={tabTitleStyle}>COMPO</h2>
      <RosterList title={teamA} roster={rosterA} />
      <RosterList title={teamB} roster={rosterB} />
    </section>
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
      <div style={{ width: "min(420px, 100%)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,25,17,.98), rgba(5,10,8,.98))", border: `1px solid ${THEME}44`, boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 10 }}>
          <div style={{ color: THEME, fontWeight: 1000, fontSize: 20 }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${THEME}33`, borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", width: 38, height: 38, fontWeight: 1000 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>{rules.map((r) => <div key={r} style={{ opacity: .82, fontWeight: 850 }}>• {r}</div>)}</div>
      </div>
    </div>
  );
}

function ActionModal({ data, onClose, onGoal, onStat }: any) {
  const title = data.kind === "goal" ? "Détail du but" : "Stat sans impact score";
  const subtitle = `${data.teamName}${data.player?.name ? ` · ${data.player.name}` : ""}`;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.66)", backdropFilter: "blur(7px)" }} onClick={onClose}>
      <div style={{ width: "min(420px, 100%)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(8,25,17,.98), rgba(5,10,8,.98))", border: "1px solid rgba(57,240,131,.28)", boxShadow: "0 22px 80px rgba(0,0,0,.55)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: "#39f083", fontWeight: 1000, fontSize: 20 }}>{title}</div>
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
const clockBtn = (tone: "play" | "pause" | "neutral"): React.CSSProperties => ({ border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: "10px 12px", background: tone === "play" ? "linear-gradient(135deg, #35d86f, #087535)" : tone === "pause" ? "linear-gradient(135deg, #ffbd3a, #ff7b1a)" : "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer", whiteSpace: "nowrap" });
const modalBtn: React.CSSProperties = { border: `1px solid ${THEME}33`, borderRadius: 14, padding: "12px 10px", background: `${THEME}12`, color: "#fff", fontWeight: 1000, cursor: "pointer", minHeight: 48 };
const miniEventBtn: React.CSSProperties = { border: `1px solid ${THEME}35`, borderRadius: 10, padding: "9px 8px", background: `${THEME}12`, color: "#fff", fontSize: 12, fontWeight: 1000, cursor: "pointer", boxShadow: `inset 0 0 18px ${THEME}08` };
const infoDotBtn: React.CSSProperties = { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 54, height: 54, borderRadius: 999, border: `1px solid ${THEME}55`, background: "rgba(0,0,0,.35)", color: THEME, fontSize: 24, fontWeight: 1000, boxShadow: `0 0 22px ${THEME}33`, cursor: "pointer" };
const tabPanelStyle: React.CSSProperties = { borderRadius: 18, padding: 13, marginTop: 12, background: "rgba(255,255,255,.045)", border: `1px solid ${THEME}22` };
const tabTitleStyle: React.CSSProperties = { margin: "0 0 10px", color: THEME, fontSize: 18, fontWeight: 1000 };
const secondaryBtn: React.CSSProperties = { flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { flex: 1.4, border: 0, borderRadius: 16, padding: 12, background: "linear-gradient(135deg, #35d86f, #087535)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
