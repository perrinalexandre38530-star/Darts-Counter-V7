import React from "react";
import type { TrainingSessionCard, TrainingSessionExerciseRow } from "../profile/trainingSessionCards";

const cyan = "#43e1f3";
const mint = "#8cffcb";
const red = "#ff8e9d";
const textStyle: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

function StatBox({ icon, label, value, warning = false }: { icon: string; label: string; value: string; warning?: boolean }) {
  return <div style={{ minWidth: 0, padding: "12px 6px", borderRadius: 12, border: warning ? "1px solid rgba(255,107,128,.42)" : "1px solid rgba(39,220,255,.27)", background: warning ? "linear-gradient(155deg,rgba(240,66,86,.09),rgba(10,16,24,.65))" : "linear-gradient(145deg,rgba(39,220,255,.09),rgba(10,16,24,.65))", display: "grid", justifyItems: "center", gap: 3, textAlign: "center" }}>
    <span aria-hidden="true" style={{ color: warning ? red : cyan, fontSize: 17, lineHeight: 1 }}>{icon}</span>
    <strong style={{ ...textStyle, fontSize: "clamp(16px,3vw,22px)", lineHeight: 1.2, overflowWrap: "anywhere" }}>{value}</strong>
    <span style={{ fontSize: 10, opacity: .8 }}>{label}</span>
  </div>;
}

function ResultPill({ success }: { success: boolean | null }) {
  if (success === null) return <span style={{ color: "#c1c9d3", fontSize: 10, fontWeight: 700 }}>Non renseigné</span>;
  return <span style={{ color: success ? mint : red, borderRadius: 7, border: `1px solid ${success ? "rgba(80,255,174,.30)" : "rgba(255,107,128,.30)"}`, background: success ? "rgba(80,255,174,.08)" : "rgba(255,107,128,.075)", padding: "5px 8px", fontSize: 10, fontWeight: 850, whiteSpace: "nowrap" }}>
    {success ? "✓ Réussi" : "× À améliorer"}
  </span>;
}

function ExerciseResultRow({ row, number }: { row: TrainingSessionExerciseRow; number: number }) {
  const value = (n: number | null, unit: string = "") => n === null ? "—" : `${Math.round(n)}${unit}`;
  const accuracyColor = row.accuracy === null ? "inherit" : row.accuracy >= 50 ? cyan : red;
  return <div style={{ padding: "11px 10px", borderRadius: 11, border: "1px solid rgba(39,220,255,.13)", background: "linear-gradient(110deg,rgba(18,47,60,.45),rgba(10,14,24,.62))", minWidth: 0 }}>
    <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0, justifyContent: "space-between" }}>
      <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, flex: "0 0 26px", display: "grid", placeItems: "center", background: "rgba(39,220,255,.10)", border: "1px solid rgba(39,220,255,.35)", color: cyan, fontSize: 12, fontWeight: 900 }}>{number}</span>
        <span style={{ minWidth: 0, fontSize: 12.5, fontWeight: 850, lineHeight: 1.25, overflowWrap: "anywhere" }}>{row.title}</span>
      </div>
      <ResultPill success={row.success}/>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 10 }}>
      {([
        ["PERF.", value(row.performance, "/100"), "#f5f9ff"],
        ["PRÉCISION", value(row.accuracy, "%"), accuracyColor],
        ["FLÉCHETTES", value(row.darts), "#f5f9ff"],
        ["POINTS", value(row.points), "#f5f9ff"],
      ] as const).map(([label, amount, color]) => <div key={label} style={{ minWidth: 0, padding: "6px 2px", background: "rgba(0,0,0,.15)", borderRadius: 7, textAlign: "center" }}>
        <div style={{ fontSize: 8.5, opacity: .65, letterSpacing: .1 }}>{label}</div>
        <div style={{ ...textStyle, fontSize: "clamp(10px,2.5vw,14px)", fontWeight: 900, color, marginTop: 3, overflowWrap: "anywhere" }}>{amount}</div>
      </div>)}
    </div>
    {(row.hits !== null || row.goal !== null || row.completion !== null) && <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10.5, opacity: .67, fontVariantNumeric: "tabular-nums" }}>
      {row.hits !== null && <span>Touches : <b>{row.hits}</b></span>}
      {row.goal !== null && <span>Objectif : <b>{row.goal}</b></span>}
      {row.completion !== null && <span>Progression : <b>{Math.round(row.completion)} %</b></span>}
    </div>}
    {!!row.aggregatedDarts && <div style={{ marginTop: 6, fontSize: 10, color: "#ffd86b" }}>Saisie du score global : {row.aggregatedDarts} fléchette(s) sans détail S/D/T.</div>}
    {row.darts === null && <div style={{ marginTop: 6, fontSize: 10, color: "#c6d0db" }}>Détail indisponible pour cet ancien enregistrement.</div>}
  </div>;
}

/** Display-only, no writes to Training stats or competitive match History. */
export default function TrainingSessionResultsCard({ card, expanded, onToggle }: { card: TrainingSessionCard; expanded: boolean; onToggle: () => void }) {
  return <article style={{ minWidth: 0, borderRadius: 18, padding: "clamp(12px,2.2vw,18px)", border: "1px solid rgba(39,220,255,.33)", background: "linear-gradient(145deg,rgba(6,26,37,.9),rgba(9,13,24,.94) 58%,rgba(10,24,34,.87))", boxShadow: "0 8px 22px rgba(0,0,0,.16)" }}>
    <div style={{ color: mint, fontSize: 10, fontWeight: 950, letterSpacing: .4 }}>TERMINÉE · {card.kind === "program" ? "PROGRAMME" : "ENTRAÎNEMENT LIBRE"}</div>
    <h3 style={{ margin: "5px 0 0", fontSize: "clamp(16px,3vw,19px)", lineHeight: 1.23, fontWeight: 950, overflowWrap: "anywhere" }}>{card.title}</h3>
    <div style={{ fontSize: 11, opacity: .67, marginTop: 5 }}>{new Date(card.at).toLocaleDateString("fr-FR")} · {card.count} exercice{card.count > 1 ? "s" : ""}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 13 }}>
      <StatBox icon="▥" label="Performance" value={`${Math.round(card.performance)}/100`} />
      <StatBox icon="◎" label="Précision" value={card.accuracy == null ? "—" : `${Math.round(card.accuracy)} %`} />
      <StatBox icon="➤" label="Fléchettes" value={String(card.darts)} />
      <StatBox icon="★" label="Objectifs réussis" value={`${card.successes}/${card.count}`} warning={card.successes < card.count} />
    </div>
    <button type="button" aria-expanded={expanded} aria-label={`${expanded ? "Masquer" : "Voir"} le détail de ${card.title}`} onClick={onToggle} style={{ marginTop: 13, padding: "10px 16px", minHeight: 42, borderRadius: 10, border: "1px solid rgba(39,220,255,.48)", background: "rgba(39,220,255,.11)", color: "inherit", cursor: "pointer", fontSize: 12, fontWeight: 900 }}>
      {expanded ? "MASQUER LE DÉTAIL" : `VOIR LES ${card.exercises.length} RÉSULTATS`}
    </button>
    {expanded && <section aria-label={`Statistiques détaillées de ${card.title}`} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(39,220,255,.20)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, fontSize: 12, fontWeight: 950 }}>☷ DÉTAIL PAR EXERCICE</div>
      <div style={{ display: "grid", gap: 7 }}>
        {card.exercises.map((row, index) => <ExerciseResultRow key={`${card.id}:${index}:${row.exerciseId}`} row={row} number={index + 1}/>)}
      </div>
    </section>}
  </article>;
}
