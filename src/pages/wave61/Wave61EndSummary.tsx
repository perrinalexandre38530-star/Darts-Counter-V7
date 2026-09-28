// @ts-nocheck
import React from "react";
import ProfileAvatar from "../../components/ProfileAvatar";
import { wave61PrimaryMetric, type Wave61State } from "../../lib/gameEngines/wave61Engine";

const SOFT = "#aeb5c8";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(hits: number, darts: number) {
  return darts > 0 ? Math.round((hits / darts) * 1000) / 10 : 0;
}

function nameOf(profile: any, fallback = "Joueur") {
  return String(profile?.name || profile?.displayName || profile?.nickname || fallback);
}

function card(accent: string): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${accent}35`,
    background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",
    padding: 9,
  };
}

export function buildWave61EndRows(state: Wave61State, profiles: any[]) {
  const profileById = new Map((profiles || []).map((p: any) => [String(p?.id || ""), p]));
  const rows = (state?.players || []).map((p: any) => {
    const id = String(p?.id || "");
    const st: any = state?.statsByPlayer?.[id] || {};
    const metric = wave61PrimaryMetric(state, id);
    const profile = profileById.get(id) || p;
    const darts = n(st.darts);
    const hits = n(st.hits);
    return {
      id,
      profile,
      name: nameOf(profile, p?.name || "Joueur"),
      winner: String(state?.winnerId || "") === id,
      team: state?.config?.teamByPlayer?.[id] || null,
      score: n(state?.scores?.[id]),
      progress: n(state?.progress?.[id]),
      health: n(state?.health?.[id]),
      lives: n(state?.lives?.[id]),
      darts,
      visits: n(st.visits),
      hits,
      misses: n(st.misses),
      accuracy: pct(hits, darts),
      bulls: n(st.bulls),
      doubles: n(st.doubles),
      triples: n(st.triples),
      bestVisit: n(st.bestVisit),
      bestCombo: n(st.bestCombo),
      damage: n(st.damage),
      damageTaken: n(st.damageTaken),
      safeReveals: n(st.safeReveals),
      metric,
    };
  });

  return rows.sort((a: any, b: any) => {
    if (a.winner !== b.winner) return a.winner ? -1 : 1;
    if (b.progress !== a.progress) return b.progress - a.progress;
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.name.localeCompare(b.name, "fr");
  }).map((row: any, index: number) => ({ ...row, rank: index + 1 }));
}

export function buildWave61MatchStats(state: Wave61State) {
  const rows = Object.values(state?.statsByPlayer || {}) as any[];
  const totalDarts = rows.reduce((sum, st) => sum + n(st?.darts), 0);
  const totalHits = rows.reduce((sum, st) => sum + n(st?.hits), 0);
  return {
    totalDarts,
    totalVisits: rows.reduce((sum, st) => sum + n(st?.visits), 0),
    totalHits,
    accuracy: pct(totalHits, totalDarts),
    bulls: rows.reduce((sum, st) => sum + n(st?.bulls), 0),
    doubles: rows.reduce((sum, st) => sum + n(st?.doubles), 0),
    triples: rows.reduce((sum, st) => sum + n(st?.triples), 0),
    bestVisit: rows.reduce((best, st) => Math.max(best, n(st?.bestVisit)), 0),
    bestCombo: rows.reduce((best, st) => Math.max(best, n(st?.bestCombo)), 0),
    totalDamage: rows.reduce((sum, st) => sum + n(st?.damage), 0),
  };
}

export default function Wave61EndSummary({ state, profiles, accent, familyLabel }: any) {
  const rows = React.useMemo(() => buildWave61EndRows(state, profiles), [state, profiles]);
  const stats = React.useMemo(() => buildWave61MatchStats(state), [state]);
  const top = rows.slice(0, 3);
  const teamMode = state?.config?.participantMode === "teams";
  const teamRows = teamMode
    ? Object.entries(state?.teamScores || {}).map(([id, score]) => ({ id, score: n(score), winner: String(state?.winnerTeamId || "") === String(id) })).sort((a, b) => (a.winner === b.winner ? b.score - a.score : a.winner ? -1 : 1))
    : [];

  return <div style={{ display: "grid", gap: 9, textAlign: "left" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 6 }}>
      {[
        ["FLÈCHES", stats.totalDarts],
        ["PRÉCISION", `${stats.accuracy}%`],
        ["BULLS", stats.bulls],
        ["BEST VOLÉE", stats.bestVisit],
      ].map(([label, value]) => <div key={String(label)} style={{ ...card(accent), textAlign: "center" }}><div style={{ color: accent, fontSize: 8.4, fontWeight: 1000, letterSpacing: .7 }}>{label}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 18, fontWeight: 1100 }}>{value}</div></div>)}
    </div>

    {teamRows.length ? <div style={{ ...card(accent), display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
      <b style={{ color: accent, fontSize: 9.5 }}>ÉQUIPES</b>
      {teamRows.map((team: any) => <span key={team.id} style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${team.winner ? accent : "rgba(255,255,255,.13)"}`, background: team.winner ? `${accent}18` : "rgba(255,255,255,.035)", color: team.winner ? "#fff" : SOFT, fontSize: 9.3, fontWeight: 900 }}>{team.winner ? "🏆 " : ""}TEAM {team.id} · {Math.round(team.score)}</span>)}
    </div> : null}

    <div style={{ ...card(accent), padding: 8 }}>
      <div style={{ color: accent, fontSize: 9, fontWeight: 1050, letterSpacing: .8, marginBottom: 7 }}>PODIUM · {String(familyLabel || "WAVE61").toUpperCase()}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6 }}>
        {top.map((row: any) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 7, alignItems: "center", borderRadius: 11, padding: 7, border: `1px solid ${row.winner ? accent + "88" : "rgba(255,255,255,.08)"}`, background: row.winner ? `${accent}12` : "rgba(255,255,255,.025)" }}>
          <ProfileAvatar profile={row.profile} size={34} showStars={false} ringColor={row.winner ? accent : "rgba(255,255,255,.18)"} />
          <div style={{ minWidth: 0 }}><div style={{ color: row.winner ? "#fff" : "#dce1eb", fontWeight: 1000, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.rank === 1 ? "🥇 " : row.rank === 2 ? "🥈 " : "🥉 "}{row.name}</div><div style={{ color: SOFT, fontSize: 8.8, marginTop: 2 }}>{row.metric?.label || "SCORE"} {row.metric?.value ?? row.score} · {row.accuracy}%</div></div>
        </div>)}
      </div>
    </div>

    <div style={{ ...card(accent), padding: 8 }}>
      <div style={{ color: accent, fontSize: 9, fontWeight: 1050, letterSpacing: .8, marginBottom: 7 }}>DÉTAILS JOUEURS</div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 610, fontSize: 9.2 }}>
        <thead><tr style={{ color: accent, background: "rgba(255,255,255,.035)", textAlign: "left" }}><th style={{ padding: 7 }}>#</th><th style={{ padding: 7 }}>Joueur</th><th style={{ padding: 7 }}>Score</th><th style={{ padding: 7 }}>Progression</th><th style={{ padding: 7 }}>Flèches</th><th style={{ padding: 7 }}>Touches</th><th style={{ padding: 7 }}>Précision</th><th style={{ padding: 7 }}>Bulls</th><th style={{ padding: 7 }}>Best</th></tr></thead>
        <tbody>{rows.map((row: any) => <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,.055)", color: row.winner ? "#fff" : "#cbd1dd", background: row.winner ? `${accent}0c` : "transparent" }}><td style={{ padding: 7, fontWeight: 1000 }}>{row.rank}</td><td style={{ padding: 7, fontWeight: 900 }}>{row.name}{row.team ? ` · ${row.team}` : ""}</td><td style={{ padding: 7 }}>{Math.round(row.score)}</td><td style={{ padding: 7 }}>{Math.round(row.progress)}%</td><td style={{ padding: 7 }}>{row.darts}</td><td style={{ padding: 7 }}>{row.hits}</td><td style={{ padding: 7 }}>{row.accuracy}%</td><td style={{ padding: 7 }}>{row.bulls}</td><td style={{ padding: 7 }}>{row.bestVisit}</td></tr>)}</tbody>
      </table>
      </div>
    </div>
  </div>;
}
