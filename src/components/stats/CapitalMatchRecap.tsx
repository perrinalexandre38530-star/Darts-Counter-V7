import React, { useMemo } from "react";
import { buildCapitalMatchInsights, type CapitalInsightPlayer, type CapitalInsightVisit } from "../../lib/capitalMatchInsights";

const COLORS = ["#29ddff", "#ed6ac7", "#ffb055", "#a28bff", "#63e6a2", "#ffe275", "#f88b91", "#71dbce"];
const format = (value: number) => Number(value).toLocaleString("fr-FR");

export default function CapitalMatchRecap({ players, scores, contracts, visits, contractLabel }: {
  players: CapitalInsightPlayer[];
  scores: number[];
  contracts: string[];
  visits: CapitalInsightVisit[];
  contractLabel: (contract: string) => string;
}) {
  const result = useMemo(() => buildCapitalMatchInsights(players, contracts, visits), [players, contracts, visits]);
  const plotWidth = 760, plotHeight = 210, left = 38, right = 10, top = 15, bottom = 30;
  const plotW = plotWidth - left - right, plotH = plotHeight - top - bottom;
  const allScores = result.timeline.flatMap((point) => point.values.filter((v): v is number => v !== null));
  const min = Math.min(0, ...allScores), max = Math.max(1, ...allScores);
  const y = (value: number) => top + (max - value) / (max - min || 1) * plotH;
  const x = (index: number) => left + index / Math.max(1, result.timeline.length - 1) * plotW;
  const ranking = players.map((person, index) => ({
    id: String(person.id ?? index), name: person.nickname || person.name || `Joueur ${index + 1}`,
    index, score: Number.isFinite(Number(scores[index])) ? Number(scores[index]) : null,
    validated: visits.filter((visit) => String(visit.playerId) === String(person.id ?? index) &&
      visit.success === true && visit.contractId !== "capital").length,
  })).sort((a, b) => Number(b.score ?? -Infinity) - Number(a.score ?? -Infinity) || a.index - b.index);
  const highlights = [
    { label: "PLUS GROS GAIN", value: result.bestGain ? `+${format(result.bestGain.amount)}` : "—", player: result.bestGain?.playerName, detail: result.bestGain ? `Tour ${result.bestGain.round} · ${contractLabel(result.bestGain.contractId)}` : null, tone: "#5bff9c" },
    { label: "PLUS GROSSE PERTE", value: result.biggestLoss ? format(result.biggestLoss.amount) : "—", player: result.biggestLoss?.playerName, detail: result.biggestLoss ? `Tour ${result.biggestLoss.round} · ${contractLabel(result.biggestLoss.contractId)}` : null, tone: "#ffae65" },
    { label: "PLUS LONGUE SÉRIE", value: result.longestStreak ? `${result.longestStreak.count} contrats` : "—", player: result.longestStreak?.playerName, detail: "Réussites consécutives", tone: "#fada7b" },
    { label: "CAPITAL LE PLUS HAUT", value: result.maxCapital ? format(result.maxCapital.value) : "—", player: result.maxCapital?.playerName, detail: "Pic durant la partie", tone: "#54dcff" },
    { label: "PLUS DE CONTRATS RÉUSSIS", value: result.mostSuccessful ? `${result.mostSuccessful.count}` : "—", player: result.mostSuccessful?.playerName, detail: "Hors capital initial", tone: "#c5b6ff" },
  ];

  return <section aria-label="Bilan et évolution du capital" style={{ minWidth: 0, margin: "12px 14px 0", border: "1px solid rgba(255,195,68,.36)", borderRadius: 17, overflow: "hidden", background: "linear-gradient(155deg,rgba(61,37,13,.48),rgba(7,12,20,.91) 45%)" }}>
    <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,215,106,.13)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
      <strong style={{ color: "#ffd26d", fontSize: 13, letterSpacing: .5 }}>ÉVOLUTION DU CAPITAL · BILAN DU MATCH</strong>
      <span style={{ color: "#aab9cc", fontSize: 11 }}>{result.completedRounds}/{contracts.length} contrats complets</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 7, padding: "10px 12px 0" }}>
      {ranking.map((person, index) => <div key={person.id} style={{ minWidth: 0, border: `1px solid ${COLORS[person.index % COLORS.length]}55`, borderRadius: 12, padding: "8px 10px", background: `${COLORS[person.index % COLORS.length]}0c`, display: "flex", gap: 9, alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 1000, color: person.score === ranking[0]?.score ? "#ffd26d" : "#afbecd" }}>#{person.score === null ? "—" : 1 + ranking.filter((other) => other.score !== null && other.score > person.score!).length}</span>
        <div style={{ minWidth: 0, flex: 1 }}><div style={{ color: COLORS[person.index % COLORS.length], fontSize: 11, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</div>
          <div style={{ color: "#a6b5c5", fontSize: 9.5 }}>{person.validated} contrats validés</div></div>
        <strong style={{ color: "#ffe2a2", fontSize: 20 }}>{person.score === null ? "—" : format(person.score)}</strong>
      </div>)}
    </div>
    <div style={{ padding: "10px 10px 2px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 14px", marginBottom: 7 }}>
        {players.map((p, i) => <span key={String(p.id ?? i)} style={{ fontSize: 10.5, color: COLORS[i % COLORS.length], fontWeight: 900 }}>● {p.nickname || p.name || `Joueur ${i + 1}`}</span>)}
      </div>
      <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} role="img" aria-label="Courbes du capital après chaque contrat, par joueur" style={{ display: "block", width: "100%", height: "auto" }}>
        {[0,1,2,3,4].map((n) => { const value = min + (max - min) * n / 4; return <g key={n}>
          <line x1={left} y1={y(value)} x2={plotWidth-right} y2={y(value)} stroke="#ffe3a1" strokeOpacity={.13} strokeDasharray="3 5" />
          <text x={left-5} y={y(value)+4} fill="#b7a28c" textAnchor="end" fontSize="11">{Math.round(value)}</text>
        </g>; })}
        {result.timeline.map((point, index) => (index % Math.max(1, Math.ceil(contracts.length / 10)) === 0 || index === contracts.length) ? <text key={index} x={x(index)} y={plotHeight-8} fill="#a7b1c2" textAnchor="middle" fontSize="11">{index || "D"}</text> : null)}
        {players.map((player, pi) => {
          // Une volée manquante coupe la ligne : aucun capital inventé.
          const sections: string[][] = []; let segment: string[] = [];
          for (let i = 0; i < result.timeline.length; i++) {
            const v = result.timeline[i].values[pi];
            if (v === null || v === undefined) { if (segment.length) sections.push(segment); segment = []; }
            else segment.push(`${x(i)},${y(v)}`);
          }
          if (segment.length) sections.push(segment);
          return <g key={String(player.id ?? pi)}>
            {sections.map((values, i) => values.length > 1 ? <polyline key={i} points={values.join(" ")} fill="none" stroke={COLORS[pi % COLORS.length]} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" /> : <circle key={i} cx={Number(values[0].split(",")[0])} cy={Number(values[0].split(",")[1])} r="3" fill={COLORS[pi % COLORS.length]} />)}
          </g>;
        })}
      </svg>
      <div style={{ color: "#a9adba", fontSize: 10, margin: "-2px 0 8px", textAlign: "center" }}>D = départ · nombre = tour joué · une courbe interrompue indique une volée absente</div>
    </div>
    <div style={{ padding: "0 12px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8 }}>
      {highlights.map((item) => <div key={item.label} style={{ padding: 10, border: "1px solid rgba(255,255,255,.09)", background: "rgba(0,0,0,.20)", borderRadius: 12, minWidth: 0 }}>
        <div style={{ color: "#adb3bf", fontSize: 9, fontWeight: 900 }}>{item.label}</div>
        <div style={{ color: item.tone, fontSize: 21, fontWeight: 1000, marginTop: 2 }}>{item.value}</div>
        <div style={{ fontSize: 10.5, fontWeight: 900, overflowWrap: "anywhere" }}>{item.player || "Aucun résultat"}</div>
        {item.detail && <div style={{ color: "#b1ad9f", fontSize: 9.5, marginTop: 3 }}>{item.detail}</div>}
      </div>)}
    </div>
    {result.lastLeadChange ? <div style={{ margin: "0 12px 12px", padding: "9px 11px", borderRadius: 11, background: "rgba(255,215,106,.08)", border: "1px solid rgba(255,215,106,.22)", fontSize: 11 }}>
      <strong style={{ color: "#ffd26d" }}>DERNIER CHANGEMENT DE LEADER</strong> · {result.lastLeadChange.playerName}, au tour {result.lastLeadChange.round} ({contractLabel(result.lastLeadChange.contractId)})
    </div> : null}
  </section>;
}
