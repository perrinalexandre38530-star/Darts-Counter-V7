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

function metricText(row: any) {
  const label = String(row?.metric?.label || "SCORE");
  const value = row?.metric?.value ?? row?.score ?? 0;
  return `${label} ${value}`;
}

function bestBy(rows: any[], selector: (row: any) => number, preferWinner = false) {
  return rows.reduce((best: any, row: any) => {
    if (!best) return row;
    const a = selector(row);
    const b = selector(best);
    if (a !== b) return a > b ? row : best;
    if (preferWinner && row.winner !== best.winner) return row.winner ? row : best;
    return row.rank < best.rank ? row : best;
  }, null);
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
      team: state?.config?.teamByPlayer?.[id] || null,
      winner: state?.winnerTeamId
        ? String(state?.config?.teamByPlayer?.[id] || "") === String(state.winnerTeamId)
        : String(state?.winnerId || "") === id,
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
    const metricDelta = n(b.metric?.value) - n(a.metric?.value);
    if (metricDelta) return metricDelta;
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

export function buildWave61Awards(rows: any[]) {
  if (!rows.length) return [];
  const winner = rows.find((row: any) => row.winner) || rows[0];
  const precision = bestBy(rows.filter((row: any) => row.darts > 0), (row) => row.accuracy, true);
  const bull = bestBy(rows, (row) => row.bulls, true);
  const combo = bestBy(rows, (row) => row.bestCombo || row.bestVisit, true);
  const awards = [
    { key: "winner", icon: "🏆", label: "VICTOIRE", row: winner, value: metricText(winner) },
    precision ? { key: "precision", icon: "🎯", label: "PRÉCISION", row: precision, value: `${precision.accuracy}%` } : null,
    bull ? { key: "bull", icon: "⭕", label: "BULL MASTER", row: bull, value: `${bull.bulls} bull${bull.bulls > 1 ? "s" : ""}` } : null,
    combo ? { key: "combo", icon: "🔥", label: "MEILLEURE SÉRIE", row: combo, value: `${Math.max(combo.bestCombo, combo.bestVisit)}` } : null,
  ].filter(Boolean);
  return awards;
}

export default function Wave61EndSummary({ state, profiles, accent, familyLabel }: any) {
  const rows = React.useMemo(() => buildWave61EndRows(state, profiles), [state, profiles]);
  const stats = React.useMemo(() => buildWave61MatchStats(state), [state]);
  const awards = React.useMemo(() => buildWave61Awards(rows), [rows]);
  const top = rows.slice(0, 3);
  const teamMode = state?.config?.participantMode === "teams";
  const teamRows = teamMode
    ? Object.entries(state?.teamScores || {}).map(([id, score]) => ({ id, score: n(score), winner: String(state?.winnerTeamId || "") === String(id) })).sort((a, b) => (a.winner === b.winner ? b.score - a.score : a.winner ? -1 : 1))
    : [];
  const isGreenRed = state?.modeId === "green_vs_red";
  const greenRedFormat = String(state?.config?.modeOptions?.matchFormat || "duel");
  const greenRedBullRule = String(state?.config?.modeOptions?.bullRule || "classic");
  const greenRedRuleLabel = greenRedBullRule === "color_lock" ? "BULL DE COULEUR" : greenRedBullRule === "color_bonus" ? "BULL BONUS" : "CLASSIQUE";

  return <div style={{ display: "grid", gap: 9, textAlign: "left" }}>
    {isGreenRed ? <div data-green-red-final-table="1" style={{ ...card(accent), padding: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", marginBottom:7 }}>
        <div style={{ color:accent, fontSize:9, fontWeight:1050, letterSpacing:.8 }}>GREEN VS RED · TABLEAU FINAL</div>
        <div style={{ color:SOFT, fontSize:8.3, fontWeight:900 }}>{greenRedFormat === "teams" ? "TEAM" : greenRedFormat === "multi_random" ? "MULTI ALÉATOIRE" : "DUEL"} · {greenRedRuleLabel}</div>
      </div>
      <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620, fontSize:9 }}>
          <thead><tr style={{ color:accent, background:"rgba(255,255,255,.035)", textAlign:"left" }}><th style={{padding:7}}>#</th><th style={{padding:7}}>Joueur</th><th style={{padding:7}}>Couleur</th><th style={{padding:7}}>Score</th><th style={{padding:7}}>Étape</th><th style={{padding:7}}>Doubles</th><th style={{padding:7}}>Triples</th><th style={{padding:7}}>Bulls</th><th style={{padding:7}}>Pénalités</th><th style={{padding:7}}>Bonus Bull</th></tr></thead>
          <tbody>{rows.map((row:any)=><tr key={row.id} style={{ borderTop:"1px solid rgba(255,255,255,.055)", color:row.winner?"#fff":"#cbd1dd", background:row.winner?`${accent}0c`:"transparent" }}>
            <td style={{padding:7,fontWeight:1000}}>{row.rank}</td>
            <td style={{padding:7,fontWeight:950}}>{row.name}{row.team ? ` · TEAM ${row.team === "A" ? "VERTE" : "ROUGE"}` : ""}</td>
            <td style={{padding:7,fontWeight:1000,color:String(state?.special?.greenRedColorByPlayer?.[row.id]||"GREEN")==="RED"?"#ff5c69":"#44e58f"}}>{String(state?.special?.greenRedColorByPlayer?.[row.id]||"GREEN")}</td>
            <td style={{padding:7,fontWeight:1100}}>{Math.round(row.score)}</td>
            <td style={{padding:7}}>{Math.min(11,n(state?.special?.greenRedStepByPlayer?.[row.id]))}/11</td>
            <td style={{padding:7}}>{row.doubles}</td><td style={{padding:7}}>{row.triples}</td><td style={{padding:7}}>{row.bulls}</td>
            <td style={{padding:7}}>-{n(state?.special?.greenRedPenaltyByPlayer?.[row.id])}</td>
            <td style={{padding:7}}>+{n(state?.special?.greenRedBullBonusByPlayer?.[row.id])}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 6 }}>
      {[
        ["FLÈCHES", stats.totalDarts],
        ["PRÉCISION", `${stats.accuracy}%`],
        ["BULLS", stats.bulls],
        ["BEST VOLÉE", stats.bestVisit],
        ["DOUBLES", stats.doubles],
        ["TRIPLES", stats.triples],
        ["BEST COMBO", stats.bestCombo],
        ["TOUCHES", `${stats.totalHits}/${stats.totalDarts}`],
      ].map(([label, value]) => <div key={String(label)} style={{ ...card(accent), textAlign: "center" }}><div style={{ color: accent, fontSize: 8.4, fontWeight: 1000, letterSpacing: .7 }}>{label}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 18, fontWeight: 1100 }}>{value}</div></div>)}
    </div>

    <div style={{ ...card(accent), padding: 8 }}>
      <div style={{ color: accent, fontSize: 9, fontWeight: 1050, letterSpacing: .8, marginBottom: 7 }}>RÉCOMPENSES DU MATCH</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 6 }}>
        {awards.map((award: any) => <div key={award.key} style={{ borderRadius: 11, padding: 8, border: `1px solid ${award.key === "winner" ? accent + "77" : "rgba(255,255,255,.08)"}`, background: award.key === "winner" ? `${accent}10` : "rgba(255,255,255,.025)", display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 7, alignItems: "center" }}>
          <ProfileAvatar profile={award.row.profile} size={34} showStars={false} ringColor={award.key === "winner" ? accent : "rgba(255,255,255,.18)"} />
          <div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 8.1, fontWeight: 1100, letterSpacing: .6 }}>{award.icon} {award.label}</div><div style={{ color: "#fff", fontSize: 10.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{award.row.name}</div><div style={{ color: SOFT, fontSize: 8.4 }}>{award.value}</div></div>
        </div>)}
      </div>
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
          <div style={{ minWidth: 0 }}><div style={{ color: row.winner ? "#fff" : "#dce1eb", fontWeight: 1000, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.rank === 1 ? "🥇 " : row.rank === 2 ? "🥈 " : "🥉 "}{row.name}</div><div style={{ color: SOFT, fontSize: 8.8, marginTop: 2 }}>{metricText(row)} · {row.accuracy}%</div><div style={{ color: SOFT, fontSize: 7.8, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.metric?.sub || `${row.hits} touches`}</div></div>
        </div>)}
      </div>
    </div>

    <div style={{ ...card(accent), padding: 8 }}>
      <div style={{ color: accent, fontSize: 9, fontWeight: 1050, letterSpacing: .8, marginBottom: 7 }}>DÉTAILS JOUEURS · OBJECTIF DU MODE</div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 9.2 }}>
        <thead><tr style={{ color: accent, background: "rgba(255,255,255,.035)", textAlign: "left" }}><th style={{ padding: 7 }}>#</th><th style={{ padding: 7 }}>Joueur</th><th style={{ padding: 7 }}>Objectif</th><th style={{ padding: 7 }}>Détail mode</th><th style={{ padding: 7 }}>Score</th><th style={{ padding: 7 }}>Flèches</th><th style={{ padding: 7 }}>Touches</th><th style={{ padding: 7 }}>Précision</th><th style={{ padding: 7 }}>S/D/T</th><th style={{ padding: 7 }}>Best</th></tr></thead>
        <tbody>{rows.map((row: any) => <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,.055)", color: row.winner ? "#fff" : "#cbd1dd", background: row.winner ? `${accent}0c` : "transparent" }}><td style={{ padding: 7, fontWeight: 1000 }}>{row.rank}</td><td style={{ padding: 7, fontWeight: 900 }}>{row.name}{row.team ? ` · ${row.team}` : ""}</td><td style={{ padding: 7, color: row.winner ? accent : "#fff", fontWeight: 1000 }}>{metricText(row)}</td><td style={{ padding: 7, color: SOFT, maxWidth: 230 }}>{row.metric?.sub || "—"}</td><td style={{ padding: 7 }}>{Math.round(row.score)}</td><td style={{ padding: 7 }}>{row.darts}</td><td style={{ padding: 7 }}>{row.hits}</td><td style={{ padding: 7 }}>{row.accuracy}%</td><td style={{ padding: 7 }}>{row.doubles}/{row.triples}/{row.bulls}</td><td style={{ padding: 7 }}>{Math.max(row.bestVisit, row.bestCombo)}</td></tr>)}</tbody>
      </table>
      </div>
    </div>
  </div>;
}
