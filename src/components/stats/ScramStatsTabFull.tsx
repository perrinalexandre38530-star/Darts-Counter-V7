// @ts-nocheck
import * as React from "react";

const ACCENT = "#65d4ff";
const GOLD = "#ffd76a";
const GREEN = "#72f0a8";
const RED = "#ff7c93";
const EDGE = "rgba(255,255,255,.09)";
const TEXT70 = "rgba(255,255,255,.70)";

function n(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function text(value: any) { return String(value ?? "").trim(); }
function sameId(a: any, b: any) {
  const aa = text(a).replace(/^online:/, "");
  const bb = text(b).replace(/^online:/, "");
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return aa.length >= 12 && bb.length >= 12 && (aa.startsWith(bb) || bb.startsWith(aa));
}
function pid(row: any) { return text(row?.id || row?.playerId || row?.profileId || row?.uid); }
function isScramRecord(record: any) {
  const blob = [record?.kind, record?.mode, record?.game?.mode, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .filter(Boolean).map((v) => text(v).toLowerCase()).join(" ");
  return blob.includes("scram");
}
function pools(record: any) {
  return [record?.payload?.stats?.players, record?.payload?.summary?.players, record?.payload?.summary?.perPlayer, record?.summary?.players, record?.summary?.perPlayer, record?.players, record?.payload?.players].filter(Array.isArray);
}
function findRow(record: any, playerId: string) {
  for (const pool of pools(record)) {
    const hit = pool.find((row: any) => sameId(pid(row), playerId));
    if (hit) return hit;
  }
  const maps = [record?.payload?.summary?.detailedByPlayer, record?.summary?.detailedByPlayer];
  for (const map of maps) {
    if (!map || typeof map !== "object") continue;
    for (const [id, row] of Object.entries(map)) if (sameId(id, playerId)) return { id, ...(row as any) };
  }
  return null;
}
function dateOf(record: any) { return n(record?.updatedAt || record?.finishedAt || record?.payload?.finishedAt || record?.createdAt); }
function sum(rows: any[], ...keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) return total + Number(value);
    }
    return total;
  }, 0);
}
function best(rows: any[], ...keys: string[]) {
  return rows.reduce((value, row) => {
    for (const key of keys) {
      const candidate = Number(row?.[key]);
      if (Number.isFinite(candidate)) return Math.max(value, candidate);
    }
    return value;
  }, 0);
}
function pct(part: number, total: number) { return total > 0 ? (part / total) * 100 : 0; }
function fmt1(v: any) { return (Math.round(n(v) * 10) / 10).toFixed(1); }
function fmt2(v: any) { return (Math.round(n(v) * 100) / 100).toFixed(2); }
function winnerIds(record: any): string[] {
  const many = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(many)) return many.map(String);
  const one = text(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function isWinner(record: any, row: any, playerId: string) {
  return row?.win === true || row?.winner === true || winnerIds(record).some((id) => sameId(id, playerId));
}
function kpi(label: string, value: any, detail?: any, accent = ACCENT) {
  return <div style={{ borderRadius: 16, border: `1px solid ${EDGE}`, background: "rgba(255,255,255,.04)", padding: 11, minWidth: 0 }}>
    <div style={{ color: "#9ea3b7", fontSize: 9.8, fontWeight: 900, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
    <div style={{ marginTop: 4, color: accent, fontSize: 21, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10 }}>{detail}</div> : null}
  </div>;
}
function section(title: string, children: React.ReactNode) {
  return <section style={{ marginTop: 12, borderRadius: 18, border: `1px solid ${EDGE}`, background: "rgba(255,255,255,.035)", padding: 12 }}>
    <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .65, marginBottom: 9 }}>{title}</div>
    {children}
  </section>;
}

export default function ScramStatsTabFull({ records = [], playerId }: { records?: any[]; playerId?: string | null }) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter(isScramRecord)
    .map((record) => ({ record, row: playerId ? findRow(record, String(playerId)) : null }))
    .filter((item) => item.row)
    .sort((a, b) => dateOf(b.record) - dateOf(a.record)), [records, playerId]);

  if (!playerId) return <div style={{ padding: 16, color: TEXT70 }}>Sélectionne un joueur pour afficher ses statistiques SCRAM.</div>;
  if (!matches.length) return <div style={{ padding: 16, color: TEXT70 }}>Aucune partie SCRAM terminée pour ce profil.</div>;

  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => isWinner(record, row, String(playerId))).length;
  const losses = games - wins;
  const darts = sum(rows, "dartsThrown", "darts");
  const visits = sum(rows, "visits");
  const hits = sum(rows, "hits");
  const misses = sum(rows, "misses");
  const points = sum(rows, "points", "score");
  const marks = sum(rows, "marks", "totalMarks", "marksTotal");
  const closes = sum(rows, "closed", "closes", "closedNumbers");
  const scoringHits = sum(rows, "scoringHits");
  const blockedDarts = sum(rows, "blockedDarts");
  const wastedDarts = sum(rows, "wastedDarts");
  const onTargetDarts = sum(rows, "onTargetDarts");
  const stopperVisits = sum(rows, "stopperVisits");
  const scorerVisits = sum(rows, "scorerVisits");
  const stopperDarts = sum(rows, "stopperDarts");
  const scorerDarts = sum(rows, "scorerDarts");
  const bestScore = best(rows, "bestScoringVisit", "bestVisit");
  const bestMarks = best(rows, "bestMarksVisit");
  const mpr = stopperDarts ? (marks / stopperDarts) * 3 : 0;
  const pointsPerScorerVisit = scorerVisits ? points / scorerVisits : 0;
  const pointsPerScorerDart = scorerDarts ? points / scorerDarts : 0;
  const marksPerStopperVisit = stopperVisits ? marks / stopperVisits : 0;
  const hitRate = pct(hits, darts);
  const targetRate = onTargetDarts ? pct(onTargetDarts, darts) : rows.reduce((acc, row) => acc + n(row?.targetRate), 0) / games;
  const scoreEfficiency = pct(scoringHits, scorerDarts);
  const blockedRate = pct(blockedDarts, scorerDarts);
  const missRate = pct(misses, darts);
  const singles = sum(rows, "singles"), doubles = sum(rows, "doubles"), triples = sum(rows, "triples"), bulls = sum(rows, "bulls"), dbulls = sum(rows, "dbulls");

  const segments: Record<string, any> = {};
  for (const key of ["15","16","17","18","19","20","25"]) segments[key] = { darts: 0, marks: 0, closes: 0, scoringHits: 0, points: 0, blockedDarts: 0 };
  for (const row of rows) for (const key of Object.keys(segments)) {
    const src = row?.segmentStats?.[key] || {};
    for (const field of Object.keys(segments[key])) segments[key][field] += n(src?.[field]);
  }

  const phase = { "1": { visits: 0, darts: 0, points: 0, marks: 0, closes: 0 }, "2": { visits: 0, darts: 0, points: 0, marks: 0, closes: 0 } } as any;
  for (const row of rows) for (const key of ["1", "2"]) {
    const src = row?.phaseStats?.[key] || {};
    for (const field of Object.keys(phase[key])) phase[key][field] += n(src?.[field]);
  }

  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>SCRAM — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Toutes les données enregistrées sur les rôles Bloqueur et Scoreur, la précision, les segments et les fermetures.</div>

    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
      {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""} • ${losses} défaite${losses > 1 ? "s" : ""}`)}
      {kpi("Win rate", `${fmt1(pct(wins, games))}%`, `${wins}/${games}`)}
      {kpi("Points", points, `Moy. ${fmt1(points / games)} / partie`, GREEN)}
      {kpi("Marks", marks, `MPR bloqueur ${fmt2(mpr)}`, GOLD)}
      {kpi("Fermetures", closes, `${fmt2(stopperVisits ? closes / stopperVisits : 0)} / volée bloqueur`)}
      {kpi("Meilleure volée score", bestScore, `${fmt1(pointsPerScorerVisit)} pts / volée scoreur`, GREEN)}
      {kpi("Meilleure volée marks", bestMarks, `${fmt2(marksPerStopperVisit)} marks / volée bloqueur`, GOLD)}
      {kpi("Fléchettes", darts, `${visits} volées`)}
      {kpi("Précision impacts", `${fmt1(hitRate)}%`, `${hits} hits • ${misses} miss`)}
      {kpi("Précision cibles SCRAM", `${fmt1(targetRate)}%`, `${onTargetDarts || "—"} darts sur 15-20/Bull`)}
      {kpi("Efficacité scoreur", `${fmt1(scoreEfficiency)}%`, `${scoringHits}/${scorerDarts} darts de score`, GREEN)}
      {kpi("Fléchettes bloquées", blockedDarts, `${fmt1(blockedRate)}% des darts scoreur`, RED)}
      {kpi("Points / dart scoreur", fmt2(pointsPerScorerDart), `${scorerDarts} darts scoreur`, GREEN)}
      {kpi("Darts inutiles", wastedDarts, `${fmt1(pct(wastedDarts, darts))}% du total`, RED)}
      {kpi("Miss rate", `${fmt1(missRate)}%`, `${misses} miss`, RED)}
      {kpi("Répartition rôles", `${stopperVisits}/${scorerVisits}`, `${stopperDarts} darts bloqueur • ${scorerDarts} scoreur`)}
    </div>

    {section("Répartition des impacts", <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
      {[["Simple", singles], ["Double", doubles], ["Triple", triples], ["Bull", bulls], ["DBull", dbulls], ["Miss", misses]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#9da2b4", fontSize: 9.5 }}>{label}</div><div style={{ marginTop: 2, color: label === "Miss" ? RED : ACCENT, fontSize: 18, fontWeight: 1000 }}>{value}</div></div>)}
    </div>)}

    {section("Performance par rôle", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      <div style={{ padding: 11, borderRadius: 15, background: "rgba(255,215,106,.06)", border: "1px solid rgba(255,215,106,.20)" }}><div style={{ color: GOLD, fontWeight: 1000 }}>BLOQUEUR</div><div style={{ marginTop: 7, color: TEXT70, fontSize: 11, lineHeight: 1.55 }}>{stopperVisits} volées • {stopperDarts} darts<br/>{marks} marks • MPR {fmt2(mpr)}<br/>{closes} fermetures • Best {bestMarks} marks<br/>{fmt2(marksPerStopperVisit)} marks / volée</div></div>
      <div style={{ padding: 11, borderRadius: 15, background: "rgba(114,240,168,.06)", border: "1px solid rgba(114,240,168,.20)" }}><div style={{ color: GREEN, fontWeight: 1000 }}>SCOREUR</div><div style={{ marginTop: 7, color: TEXT70, fontSize: 11, lineHeight: 1.55 }}>{scorerVisits} volées • {scorerDarts} darts<br/>{points} points • {scoringHits} impacts score<br/>Best {bestScore} pts • {fmt1(pointsPerScorerVisit)} pts / volée<br/>{blockedDarts} darts bloquées</div></div>
    </div>)}

    {section("Efficacité par segment", <div style={{ overflowX: "auto", borderRadius: 13, border: `1px solid ${EDGE}` }}>
      <table style={{ width: "100%", minWidth: 670, borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ color: ACCENT, textAlign: "left" }}>{["Segment","Darts","Marks","Ferm.","Score hits","Points","Bloquées","Pts/dart"].map((h) => <th key={h} style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{h}</th>)}</tr></thead><tbody>{Object.entries(segments).map(([key, seg]: any) => <tr key={key}><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}`, fontWeight: 1000, color: ACCENT }}>{key === "25" ? "Bull" : key}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.darts}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.marks}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.closes}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.scoringHits}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.points}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.blockedDarts}</td><td style={{ padding: "8px 7px", borderBottom: `1px solid ${EDGE}` }}>{seg.scoringHits ? fmt1(seg.points / seg.scoringHits) : "0.0"}</td></tr>)}</tbody></table>
    </div>)}

    {section("Phase 1 / Phase 2", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      {["1","2"].map((key) => <div key={key} style={{ padding: 11, borderRadius: 15, background: "rgba(0,0,0,.20)" }}><div style={{ color: ACCENT, fontWeight: 1000 }}>PHASE {key}</div><div style={{ marginTop: 6, color: TEXT70, fontSize: 11, lineHeight: 1.55 }}>{phase[key].visits} volées • {phase[key].darts} darts<br/>{phase[key].points} points • {phase[key].marks} marks<br/>{phase[key].closes} fermetures</div></div>)}
    </div>)}

    {section("Parties récentes", <div style={{ display: "grid", gap: 7 }}>
      {matches.slice(0, 10).map(({ record, row }, index) => {
        const won = isWinner(record, row, String(playerId));
        const when = dateOf(record) ? new Date(dateOf(record)).toLocaleDateString("fr-FR") : "—";
        const team = text(row?.team).toUpperCase();
        const summary = record?.summary || record?.payload?.summary || {};
        const score = `${n(summary?.scoreA ?? record?.payload?.state?.scores?.A)} — ${n(summary?.scoreB ?? record?.payload?.state?.scores?.B)}`;
        return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : EDGE}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#071019" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : "LOSS"}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{when} • {score}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team ? `Camp ${team} • ` : ""}{n(row?.points)} pts • {n(row?.marks)} marks • {n(row?.closed ?? row?.closes)} ferm. • MPR {fmt2(row?.mpr)}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 17, fontWeight: 1000 }}>{n(row?.bestScoringVisit ?? row?.bestVisit)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>best pts</div></div>
        </div>;
      })}
    </div>)}
  </div>;
}
