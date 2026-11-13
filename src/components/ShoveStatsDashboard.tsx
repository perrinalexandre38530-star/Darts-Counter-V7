import React from "react";
import { shoveTargets, shoveRuleSet } from "../lib/gameEngines/shoveAPennyTargets";
import { rankShovePlayers } from "../lib/gameEngines/shoveAPennyRanking";

const SOFT = "#aab5c9";
const GOLD = "#ffc34d";
const tones = ["#ffc34d", "#60c9ff", "#dc99ff", "#83e4b8", "#ff9b91", "#a7caed"];
const avatar = (p: any) => p?.avatarDataUrl || p?.avatarUrl || p?.avatar || p?.photoDataUrl || null;
const number = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const percentage = (a: number, b: number) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;
const format = (v: number) => Math.round(v * 10) / 10;

/** Graphiques et KPIs SHOVE basés exclusivement sur History/Wave61State. */
export default function ShoveStatsDashboard({ state, profiles = [], accent = GOLD, activePlayerId, isFinal = false }: {
  state: any; profiles?: any[]; accent?: string; activePlayerId?: string; isFinal?: boolean;
}) {
  const targets = shoveTargets(shoveRuleSet(state?.config?.modeOptions?.ruleSet));
  const required = Math.max(2, Number(state?.config?.modeOptions?.marksPerBox || 3));
  const goal = required * targets.length;
  const playerIds = rankShovePlayers(state);
  const profileById = new Map((profiles || []).map((p: any) => [String(p.id), p]));
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const selectedId = selectedPlayerId && playerIds.includes(selectedPlayerId) ? selectedPlayerId
    : activePlayerId && playerIds.includes(String(activePlayerId)) ? String(activePlayerId) : playerIds[0];
  const rows = playerIds.map((id: string, rank: number) => {
    const p = state?.players?.find((x: any) => String(x.id) === id) || {};
    const prof: any = profileById.get(id) || p;
    const st = state?.statsByPlayer?.[id] || {};
    const marksBySector = state?.special?.shoveMarksByPlayer?.[id] || {};
    const total = targets.reduce((sum, sector) => sum + number(marksBySector[String(sector)]), 0);
    const closed = targets.filter((sector) => number(marksBySector[String(sector)]) >= required).length;
    const darts = number(st.darts), visits = number(st.visits), hits = number(st.hits);
    const valid = Math.max(0, darts - number(st.misses));
    return { id, name: String(prof.name || p.name || "Joueur"), avatar: avatar(prof), rank: rank + 1, total, closed,
      darts, visits, hits, valid, accuracy: percentage(hits, darts), doubles: number(st.doubles), triples: number(st.triples),
      misses: number(st.misses), sectorMarks: marksBySector, bestVisit: number(st.bestVisit),
      tone: tones[rank % tones.length], marksPerDart: darts ? format(total / darts) : 0 };
  });
  const selected = rows.find((r) => r.id === selectedId) || rows[0];
  const cards: Array<[string, string | number]> = selected ? [
    ["CASES FERMÉES", `${selected.closed}/${targets.length}`], ["MARQUES TOTALES", `${selected.total}/${goal}`],
    ["PRÉCISION", `${selected.accuracy}%`], ["FLÉCHETTES", selected.darts], ["VOLÉES", selected.visits],
    ["MARQUES / FLÉCHETTE", selected.marksPerDart], ["DOUBLES", selected.doubles], ["TRIPLES", selected.triples],
    ["MISS", selected.misses],
  ] : [];
  const history: any[] = Array.isArray(state?.special?.shoveHistory) ? state.special.shoveHistory : [];
  const gained = history.filter((h) => String(h.playerId) === String(selectedId)).slice(-12).map((h) => number(h.gained));
  const maxGained = Math.max(1, ...gained);
  const pointY = (value: number) => 69 - (value / maxGained) * 54;
  const pointX = (index: number) => 17 + index * (gained.length > 1 ? 268 / (gained.length - 1) : 0);
  const sectorBars = selected ? targets.map((sector) => ({ label: sector === 25 ? "BULL" : String(sector), amount: number(selected.sectorMarks[String(sector)]) })) : [];
  return <div data-shove-stats-dashboard="1" style={{ marginTop: 11, display: "grid", gap: 11, color: "#fff" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
      <strong style={{ color: accent, fontSize: 11, fontWeight: 1100, letterSpacing: 1 }}>STATISTIQUES SHOVE A PENNY</strong>
      <span style={{ fontSize: 9, color: SOFT }}>{isFinal ? "BILAN FINAL" : "EN DIRECT"} · {state?.visits?.length || 0} VOLÉES</span>
    </div>
    <section style={{ display: "grid", gap: 7, padding: 10, background: "#0d1524", border: `1px solid ${accent}43`, borderRadius: 13 }}>
      <b style={{ color: accent, fontSize: 10 }}>CLASSEMENT {isFinal ? "FINAL" : "PROVISOIRE"}</b>
      {rows.map((r) => <button key={r.id} type="button" aria-pressed={selectedId === r.id} onClick={() => setSelectedPlayerId(r.id)} style={{ display: "grid", width: "100%", gridTemplateColumns: "22px 30px minmax(0,1fr) 57px", gap: 7, alignItems: "center", borderRadius: 9, padding: "5px 6px", border: `1px solid ${selectedId === r.id ? accent + "55" : "transparent"}`, background: selectedId === r.id ? `${accent}0f` : "rgba(255,255,255,.025)", cursor: "pointer", color: "#fff", textAlign: "left" }}>
        <b style={{ color: r.tone, fontSize: 11 }}>#{r.rank}</b>
        {r.avatar ? <img src={r.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${r.tone}` }} /> : <span style={{ fontWeight: 1000, textAlign: "center", color: r.tone }}>{r.name.slice(0, 1)}</span>}
        <div style={{ minWidth: 0 }}><b style={{ fontSize: 10, textTransform: "uppercase", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", display: "block" }}>{r.name}</b><div style={{ height: 5, marginTop: 5, borderRadius: 999, background: "#333a47", overflow: "hidden" }}><div style={{ width: `${percentage(r.closed, targets.length)}%`, height: "100%", borderRadius: 999, background: r.tone }} /></div></div>
        <b style={{ color: r.tone, fontSize: 10, textAlign: "right" }} title={`${r.total}/${goal} marques partielles ou complètes`}>{r.closed}/{targets.length} CASES</b>
      </button>)}
    </section>
    {selected ? <>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}><strong style={{ color: accent, fontSize: 11, textTransform: "uppercase" }}>{selected.name}</strong><span style={{ fontSize: 9, color: SOFT }}>• #{selected.rank}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
        {cards.map(([label, value]) => <div key={label} style={{ borderRadius: 10, padding: "8px 5px", textAlign: "center", border: "1px solid #3b4354", background: "linear-gradient(155deg,#172032,#0c121d)" }}><span style={{ display: "block", color: SOFT, fontSize: 8, fontWeight: 950 }}>{label}</span><b style={{ display: "block", marginTop: 4, color: accent, fontSize: 16, fontWeight: 1100 }}>{value}</b></div>)}
      </div>
      <section style={{ border: `1px solid ${accent}39`, borderRadius: 13, padding: 10, background: "#101622" }}>
        <div style={{ fontWeight: 1000, color: accent, fontSize: 10, marginBottom: 9 }}>RÉPARTITION DES MARQUES PAR CASE</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${targets.length},minmax(0,1fr))`, gap: 3, minHeight: 86, alignItems: "end" }}>
          {sectorBars.map(({ label, amount }) => <div key={label} style={{ display: "grid", justifyItems: "center", alignItems: "end", gap: 4 }}><b style={{ color: amount >= required ? accent : SOFT, fontSize: 9 }}>{amount}</b><div style={{ height: 55, width: "75%", display: "flex", alignItems: "end", borderRadius: "5px 5px 0 0", background: "#262d3c", overflow: "hidden" }}><div style={{ height: `${percentage(amount, required)}%`, width: "100%", background: amount >= required ? accent : "#6988bf", borderRadius: "4px 4px 0 0" }} /></div><small style={{ color: "#c9d1e0", fontSize: 8 }}>{label}</small></div>)}
        </div>
      </section>
      <section style={{ border: `1px solid ${accent}39`, borderRadius: 13, padding: 10, background: "#101622" }}>
        <div style={{ fontWeight: 1000, color: accent, fontSize: 10 }}>ÉVOLUTION · MARQUES PERSONNELLES PAR VOLÉE</div>
        {gained.length ? <svg viewBox="0 0 302 90" role="img" aria-label="Graphique des marques gagnées à chaque volée" style={{ width: "100%", height: 128, overflow: "visible" }}>
          {[19,44,69].map((y) => <line key={y} x1="12" y1={y} x2="291" y2={y} stroke="#384154" strokeWidth=".75" strokeDasharray="2 3" />)}
          <polyline fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={gained.map((n, i) => `${pointX(i)},${pointY(n)}`).join(" ")} />
          {gained.map((v, i) => <g key={i}><circle cx={pointX(i)} cy={pointY(v)} r="4" fill={accent} stroke="#07111b" strokeWidth="1.4" /><text x={pointX(i)} y={Math.max(10, pointY(v) - 9)} fill="#fff" fontSize="9" textAnchor="middle">{v}</text></g>)}
        </svg> : <p style={{ margin: "12px 0 4px", color: SOFT, fontSize: 10, textAlign: "center" }}>Le graphique apparaîtra après la première volée validée.</p>}
      </section>
    </> : null}
  </div>;
}
