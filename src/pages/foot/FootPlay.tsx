import React from "react";
import BackDot from "../../components/BackDot";
import { getFootFormat } from "./footFormats";
import { getFootGameTicker } from "./footTickers";

type Props = { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void };
type EventType = "goal" | "assist" | "yellow" | "red" | "own_goal" | "penalty_scored" | "penalty_missed";
const labels: Record<EventType, string> = { goal: "But", assist: "Passe déc.", yellow: "Jaune", red: "Rouge", own_goal: "CSC", penalty_scored: "Penalty marqué", penalty_missed: "Penalty raté" };
const icons: Record<EventType, string> = { goal: "⚽", assist: "🎯", yellow: "🟨", red: "🟥", own_goal: "🥅", penalty_scored: "✅", penalty_missed: "❌" };

export default function FootPlay({ go, params, onFinish }: Props) {
  const cfg = params?.config || {};
  const spec = getFootFormat(cfg.format);
  const teamA = String(cfg.teamA || (spec.kind === "duel" ? "Joueur A" : "Équipe A"));
  const teamB = String(cfg.teamB || (spec.kind === "duel" ? "Joueur B" : "Équipe B"));
  const [score, setScore] = React.useState<[number, number]>([0, 0]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [shoots, setShoots] = React.useState<[number, number]>([0, 0]);
  const rosterA = React.useMemo(() => buildRoster(cfg.teamAPlayerIds, cfg.playersA), [cfg.teamAPlayerIds, cfg.playersA]);
  const rosterB = React.useMemo(() => buildRoster(cfg.teamBPlayerIds, cfg.playersB), [cfg.teamBPlayerIds, cfg.playersB]);

  const addEvent = (team: 0 | 1, type: EventType, player?: any) => {
    const ev = { id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), team, teamName: team === 0 ? teamA : teamB, type, label: labels[type], icon: icons[type], format: spec.id, playerId: player?.id || null, playerName: player?.name || null };
    setEvents((prev) => [ev, ...prev]);
    if (type === "goal" || type === "penalty_scored") setScore(([a, b]) => team === 0 ? [a + 1, b] : [a, b + 1]);
    if (type === "own_goal") setScore(([a, b]) => team === 0 ? [a, b + 1] : [a + 1, b]);
    if (type === "penalty_scored" || type === "penalty_missed") setShoots(([a, b]) => team === 0 ? [a + 1, b] : [a, b + 1]);
  };

  const undo = () => {
    const ev = events[0];
    if (!ev) return;
    setEvents((prev) => prev.slice(1));
    if (ev.type === "goal" || ev.type === "penalty_scored") setScore(([a, b]) => ev.team === 0 ? [Math.max(0, a - 1), b] : [a, Math.max(0, b - 1)]);
    if (ev.type === "own_goal") setScore(([a, b]) => ev.team === 0 ? [a, Math.max(0, b - 1)] : [Math.max(0, a - 1), b]);
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
  const teamAVisual = cfg.teamAVisual || cfg.teamALogo || null;
  const teamBVisual = cfg.teamBVisual || cfg.teamBLogo || null;
  const periodCount = Math.max(1, Number(cfg.periods || spec.periods || 1));
  const periodSeconds = Math.max(1, Number(cfg.minutes || spec.minutesPerPeriod || 1)) * 60;
  const [clockRunning, setClockRunning] = React.useState(false);
  const [currentPeriod, setCurrentPeriod] = React.useState(1);
  const [remainingSeconds, setRemainingSeconds] = React.useState(periodSeconds);

  React.useEffect(() => {
    setClockRunning(false);
    setCurrentPeriod(1);
    setRemainingSeconds(periodSeconds);
  }, [periodSeconds, spec.id]);

  React.useEffect(() => {
    if (!clockRunning || isPenalty) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) return prev - 1;
        window.clearInterval(timer);
        setClockRunning(false);
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
  };

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, rgba(40,180,90,.25), transparent 38%), linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ position: "relative", height: 96, marginBottom: 12, borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 38px rgba(0,0,0,.45)" }}>
          <img src={tickerSrc} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.05) contrast(1.05)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.62), rgba(0,0,0,.12), rgba(0,0,0,.62))" }} />
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
            <BackDot onClick={() => go("foot_config", { format: spec.id, config: cfg })} />
          </div>
        </div>
        <h1 style={{ textAlign: "center", margin: "6px 0 4px", fontSize: 30 }}>{spec.label}</h1>
        <p style={{ textAlign: "center", margin: "0 0 14px", opacity: .72, fontWeight: 800 }}>{isPenalty ? `${cfg.shoots || 5} tirs par camp · mort subite possible` : `${cfg.periods || spec.periods} période(s) · ${cfg.minutes || spec.minutesPerPeriod} min`}</p>

        {!isPenalty && (
          <ClockBar
            running={clockRunning}
            period={currentPeriod}
            periodCount={periodCount}
            remaining={remainingSeconds}
            onToggle={() => setClockRunning((v) => !v)}
            onReset={() => { setClockRunning(false); setRemainingSeconds(periodSeconds); }}
            onNextPeriod={nextPeriod}
          />
        )}

        <div style={{ position: "relative", borderRadius: 26, padding: 18, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", boxShadow: "0 18px 44px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <ScoreGhost src={teamAVisual} side="left" />
          <ScoreGhost src={teamBVisual} side="right" />
          <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", textAlign: "center" }}>
            <TeamScore name={teamA} score={score[0]} extra={isPenalty ? `${shoots[0]} tir(s)` : spec.kind === "team" ? `${rosterA.length || spec.playersPerSide} joueurs` : "duel"} />
            <div style={{ fontSize: 28, fontWeight: 1000, opacity: .6 }}>-</div>
            <TeamScore name={teamB} score={score[1]} extra={isPenalty ? `${shoots[1]} tir(s)` : spec.kind === "team" ? `${rosterB.length || spec.playersPerSide} joueurs` : "duel"} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <EventPanel team={teamA} roster={rosterA} penalty={isPenalty} on={(type: EventType, player?: any) => addEvent(0, type, player)} />
          <EventPanel team={teamB} roster={rosterB} penalty={isPenalty} on={(type: EventType, player?: any) => addEvent(1, type, player)} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={undo} style={secondaryBtn}>ANNULER DERNIER</button>
          <button onClick={finish} style={primaryBtn}>TERMINER / ENREGISTRER</button>
        </div>

        <div style={{ borderRadius: 18, padding: 13, marginTop: 14, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.10)" }}>
          <div style={{ color: "#39f083", fontWeight: 1000, marginBottom: 8 }}>RÈGLES {spec.label}</div>
          {spec.rules.map((r) => <div key={r} style={{ opacity: .78, fontWeight: 750, fontSize: 13 }}>• {r}</div>)}
        </div>

        <h2 style={{ margin: "20px 0 10px", fontSize: 18 }}>ÉVÉNEMENTS</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {events.length === 0 ? <div style={{ opacity: .65, fontWeight: 800 }}>Aucun événement pour le moment.</div> : events.map((ev) => <div key={ev.id} style={{ borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)", fontWeight: 850 }}>{ev.icon} {ev.teamName} · {ev.label}{ev.playerName ? ` · ${ev.playerName}` : ""}</div>)}
        </div>
      </div>
    </div>
  );
}
function TeamScore({ name, score, extra }: any) {
  return (
    <div style={{ position: "relative", zIndex: 3, minWidth: 0 }}>
      <div style={{ fontSize: 13, opacity: .86, fontWeight: 1000, minHeight: 34, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ fontSize: 58, fontWeight: 1000, lineHeight: 1, textShadow: "0 4px 18px rgba(0,0,0,.65)" }}>{score}</div>
      <div style={{ fontSize: 11, opacity: .7, fontWeight: 900 }}>{extra}</div>
    </div>
  );
}

function ScoreGhost({ src, side }: { src?: string | null; side: "left" | "right" }) {
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
        [side]: "-9%",
        width: "46%",
        maxWidth: 260,
        height: "150%",
        objectFit: "cover",
        transform: `translateY(-50%) ${side === "right" ? "scaleX(-1)" : ""}`,
        opacity: .16,
        filter: "saturate(1.15) contrast(1.15) drop-shadow(0 0 22px rgba(57,240,131,.28))",
        pointerEvents: "none",
        borderRadius: 28,
      } as React.CSSProperties}
    />
  );
}

function ClockBar({ running, period, periodCount, remaining, onToggle, onReset, onNextPeriod }: any) {
  const mm = Math.floor(Number(remaining || 0) / 60);
  const ss = Number(remaining || 0) % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const canNext = period < periodCount;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", margin: "0 0 14px", padding: 10, borderRadius: 18, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.12)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#39f083", fontWeight: 1000, fontSize: 12 }}>CHRONO</div>
        <div style={{ fontWeight: 1000, fontSize: 22, lineHeight: 1.05 }}>{label}</div>
        <div style={{ opacity: .68, fontSize: 11, fontWeight: 850 }}>Période {period}/{periodCount}</div>
      </div>
      <button type="button" onClick={onToggle} style={clockBtn(running ? "pause" : "play")}>{running ? "⏸ Pause" : "▶ Lancer"}</button>
      <button type="button" onClick={remaining === 0 && canNext ? onNextPeriod : onReset} style={clockBtn("neutral")}>{remaining === 0 && canNext ? "Période +" : "↺"}</button>
    </div>
  );
}
function buildRoster(idsRaw: any, namesRaw: any) {
  const ids = Array.isArray(idsRaw) ? idsRaw.map(String) : [];
  const names = Array.isArray(namesRaw) ? namesRaw.map(String) : [];
  return ids.map((id, index) => ({ id, name: names[index] || `Joueur ${index + 1}` })).filter((p) => p.id);
}
function EventPanel({ team, roster, on, penalty }: any) {
  const teamKeys: EventType[] = penalty ? ["penalty_scored", "penalty_missed", "yellow", "red"] : ["goal", "assist", "yellow", "red", "own_goal"];
  const playerKeys: EventType[] = penalty ? ["penalty_scored", "penalty_missed"] : ["goal", "assist", "yellow", "red"];
  const teamOnlyKeys = teamKeys.filter((type) => !playerKeys.includes(type));
  return (
    <div style={{ borderRadius: 20, padding: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.10)" }}>
      <div style={{ fontWeight: 1000, marginBottom: 9, textAlign: "center" }}>{team}</div>
      {Array.isArray(roster) && roster.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: teamOnlyKeys.length ? 10 : 0 }}>
          {roster.map((player: any) => (
            <div key={player.id} style={{ borderRadius: 14, padding: 8, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {playerKeys.map((type) => <button key={type} onClick={() => on(type, player)} style={miniEventBtn}>{icons[type]} {labels[type]}</button>)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {(roster?.length ? teamOnlyKeys : teamKeys).map((type) => <button key={type} onClick={() => on(type)} style={eventBtn}>{icons[type]} {labels[type]}</button>)}
      </div>
    </div>
  );
}
const clockBtn = (tone: "play" | "pause" | "neutral"): React.CSSProperties => ({ border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: "10px 12px", background: tone === "play" ? "linear-gradient(135deg, #35d86f, #087535)" : tone === "pause" ? "linear-gradient(135deg, #ffbd3a, #ff7b1a)" : "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer", whiteSpace: "nowrap" });
const eventBtn: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", borderRadius: 13, padding: "10px 8px", background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 900, cursor: "pointer" };
const miniEventBtn: React.CSSProperties = { border: "1px solid rgba(255,255,255,.10)", borderRadius: 10, padding: "7px 5px", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 11, fontWeight: 900, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { flex: 1.4, border: 0, borderRadius: 16, padding: 12, background: "linear-gradient(135deg, #35d86f, #087535)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
