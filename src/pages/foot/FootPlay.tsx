import React from "react";
import BackDot from "../../components/BackDot";

type Props = { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void };
type EventType = "goal" | "assist" | "yellow" | "red" | "own_goal";
const labels: Record<EventType, string> = { goal: "But", assist: "Passe déc.", yellow: "Jaune", red: "Rouge", own_goal: "CSC" };
const icons: Record<EventType, string> = { goal: "⚽", assist: "🎯", yellow: "🟨", red: "🟥", own_goal: "🥅" };

export default function FootPlay({ go, params, onFinish }: Props) {
  const cfg = params?.config || {};
  const teamA = String(cfg.teamA || "Équipe A");
  const teamB = String(cfg.teamB || "Équipe B");
  const [score, setScore] = React.useState<[number, number]>([0, 0]);
  const [events, setEvents] = React.useState<any[]>([]);

  const addEvent = (team: 0 | 1, type: EventType) => {
    const ev = { id: `foot_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), team, teamName: team === 0 ? teamA : teamB, type, label: labels[type], icon: icons[type] };
    setEvents((prev) => [ev, ...prev]);
    if (type === "goal") setScore(([a, b]) => team === 0 ? [a + 1, b] : [a, b + 1]);
    if (type === "own_goal") setScore(([a, b]) => team === 0 ? [a, b + 1] : [a + 1, b]);
  };

  const undo = () => {
    const ev = events[0];
    if (!ev) return;
    setEvents((prev) => prev.slice(1));
    if (ev.type === "goal") setScore(([a, b]) => ev.team === 0 ? [Math.max(0, a - 1), b] : [a, Math.max(0, b - 1)]);
    if (ev.type === "own_goal") setScore(([a, b]) => ev.team === 0 ? [a, Math.max(0, b - 1)] : [Math.max(0, a - 1), b]);
  };

  const finish = () => {
    const winner = score[0] === score[1] ? null : score[0] > score[1] ? teamA : teamB;
    const match = { id: `foot-${Date.now()}`, kind: "foot", createdAt: Date.now(), players: [{ id: "foot_team_a", name: teamA, teamIndex: 0 }, { id: "foot_team_b", name: teamB, teamIndex: 1 }], winnerId: winner === teamA ? "foot_team_a" : winner === teamB ? "foot_team_b" : null, summary: { sport: "foot", mode: "foot_match", teamA, teamB, scoreA: score[0], scoreB: score[1], winner, events }, payload: { sport: "foot", mode: "foot_match", teamA, teamB, score, events, summary: { teamA, teamB, scoreA: score[0], scoreB: score[1], winner, events } } };
    if (onFinish) onFinish(match); else go("stats");
  };

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, rgba(40,180,90,.25), transparent 38%), linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <BackDot onClick={() => go("foot_config", { config: cfg })} />
        <h1 style={{ textAlign: "center", margin: "6px 0 14px", fontSize: 30 }}>MATCH FOOT</h1>
        <div style={{ borderRadius: 26, padding: 18, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", boxShadow: "0 18px 44px rgba(0,0,0,.35)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", textAlign: "center" }}>
            <TeamScore name={teamA} score={score[0]} />
            <div style={{ fontSize: 28, fontWeight: 1000, opacity: .6 }}>-</div>
            <TeamScore name={teamB} score={score[1]} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <EventPanel team={teamA} on={(type) => addEvent(0, type)} />
          <EventPanel team={teamB} on={(type) => addEvent(1, type)} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={undo} style={secondaryBtn}>ANNULER DERNIER</button>
          <button onClick={finish} style={primaryBtn}>TERMINER / ENREGISTRER</button>
        </div>

        <h2 style={{ margin: "20px 0 10px", fontSize: 18 }}>ÉVÉNEMENTS</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {events.length === 0 ? <div style={{ opacity: .65, fontWeight: 800 }}>Aucun événement pour le moment.</div> : events.map((ev) => <div key={ev.id} style={{ borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)", fontWeight: 850 }}>{ev.icon} {ev.teamName} · {ev.label}</div>)}
        </div>
      </div>
    </div>
  );
}
function TeamScore({ name, score }: any) { return <div><div style={{ fontSize: 13, opacity: .78, fontWeight: 900, minHeight: 34 }}>{name}</div><div style={{ fontSize: 58, fontWeight: 1000, lineHeight: 1 }}>{score}</div></div>; }
function EventPanel({ team, on }: any) { return <div style={{ borderRadius: 20, padding: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.10)" }}><div style={{ fontWeight: 1000, marginBottom: 9, textAlign: "center" }}>{team}</div><div style={{ display: "grid", gap: 8 }}>{(Object.keys(labels) as EventType[]).map((type) => <button key={type} onClick={() => on(type)} style={eventBtn}>{icons[type]} {labels[type]}</button>)}</div></div>; }
const eventBtn: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", borderRadius: 13, padding: "10px 8px", background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.07)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { flex: 1.4, border: 0, borderRadius: 16, padding: 12, background: "linear-gradient(135deg, #35d86f, #087535)", color: "#fff", fontWeight: 1000, cursor: "pointer" };
