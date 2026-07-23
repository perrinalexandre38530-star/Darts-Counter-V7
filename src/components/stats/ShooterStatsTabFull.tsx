// @ts-nocheck
import React from "react";

const ACCENT = "#42d6ff";
const GOOD = "#65efb4";
const BAD = "#ff7c93";
const GOLD = "#ffd76a";

function n(value: any, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function txt(value: any) { return String(value ?? "").trim(); }
function pid(row: any) { return txt(row?.id || row?.playerId || row?.profileId || row?.pid); }
function pname(row: any) { return txt(row?.name || row?.playerName || row?.displayName || "Joueur"); }
function ratio(a: number, b: number) { return b > 0 ? (a / b) * 100 : 0; }
function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function playedAt(record: any) { return n(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt); }
function isShooter(record: any) {
  const blob = [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .map((v) => txt(v).toLowerCase()).join(" ");
  return blob.includes("shooter");
}
function pools(record: any) { return [record?.payload?.stats?.players, record?.payload?.summary?.players, record?.payload?.summary?.perPlayer, record?.summary?.players, record?.summary?.perPlayer, record?.payload?.players, record?.players].filter(Array.isArray); }
function findRow(record: any, id: string, name?: string | null) {
  const wantedName = txt(name).toLowerCase();
  for (const pool of pools(record)) {
    const byId = pool.find((row: any) => pid(row) === String(id)); if (byId) return byId;
    if (wantedName) { const byName = pool.find((row: any) => pname(row).toLowerCase() === wantedName); if (byName) return byName; }
  }
  return null;
}
function winnerIds(record: any) {
  const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = txt(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function sum(rows: any[], ...keys: string[]) { return rows.reduce((total, row) => { for (const key of keys) { const v = row?.[key]; if (v !== undefined && v !== null && Number.isFinite(Number(v))) return total + Number(v); } return total; }, 0); }
function best(rows: any[], ...keys: string[]) { return rows.reduce((max, row) => { for (const key of keys) { const v = Number(row?.[key]); if (Number.isFinite(v)) return Math.max(max, v); } return max; }, 0); }
function kpi(label: string, value: any, detail?: any, color = ACCENT) { return <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 12, minWidth: 0 }}><div style={{ color: "#9ea3b7", fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 22, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>{detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10.5 }}>{detail}</div> : null}</div>; }
function section(title: string, children: React.ReactNode) { return <section style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 12 }}><div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 9 }}>{title}</div>{children}</section>; }
function targetLabel(key: string) { return String(key) === "25" ? "BULL" : String(key); }

export default function ShooterStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isShooter).map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) })).filter((item) => item.row).sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);
  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)) || (row?.teamId && winnerIds(record).includes(String(row.teamId)))).length;
  const darts = sum(rows, "dartsThrown", "darts");
  const visits = sum(rows, "visits", "targetAttempts");
  const hits = sum(rows, "validDarts", "targetHits", "validHits");
  const marks = sum(rows, "marks");
  const appliedMarks = sum(rows, "marksApplied");
  const points = sum(rows, "pointsWon", "points");
  const penalties = sum(rows, "penaltyEvents");
  const penaltyPoints = sum(rows, "penaltyPoints");
  const progressPenalties = sum(rows, "progressPenalties");
  const clears = sum(rows, "targetClearCredits");
  const successful = sum(rows, "successfulVisits");
  const failed = sum(rows, "failedVisits");
  const perfect = sum(rows, "perfectVisits", "threeHitVisits");
  const firstDart = sum(rows, "firstDartHits");
  const bestMarks = best(rows, "bestVisitMarks");
  const bestPoints = best(rows, "bestVisitPoints");
  const bestStreak = best(rows, "bestHitStreak");
  const bestVisitStreak = best(rows, "bestSuccessVisitStreak");
  const bestProgress = best(rows, "targetsCleared", "progressTargetIndex");
  const accuracy = ratio(hits, darts);
  const successRate = ratio(successful, visits);
  const avgMarks = visits ? marks / visits : 0;
  const avgPoints = visits ? points / visits : 0;
  const singles = sum(rows, "singles"), doubles = sum(rows, "doubles"), triples = sum(rows, "triples"), bulls = sum(rows, "bulls"), dbulls = sum(rows, "dbulls"), misses = sum(rows, "misses");

  const targetAgg = React.useMemo(() => {
    const out: Record<string, any> = {};
    rows.forEach((row: any) => {
      const source = row?.targetStats || row?.rawStats?.targets || {};
      Object.entries(source).forEach(([key, stat]: any) => {
        const cur = out[key] || { attempts: 0, darts: 0, validDarts: 0, marks: 0, marksApplied: 0, points: 0, clears: 0, bestVisitMarks: 0, bestVisitPoints: 0 };
        cur.attempts += n(stat?.attempts); cur.darts += n(stat?.darts); cur.validDarts += n(stat?.validDarts ?? stat?.hits); cur.marks += n(stat?.marks); cur.marksApplied += n(stat?.marksApplied); cur.points += n(stat?.points); cur.clears += n(stat?.clears); cur.bestVisitMarks = Math.max(cur.bestVisitMarks, n(stat?.bestVisitMarks)); cur.bestVisitPoints = Math.max(cur.bestVisitPoints, n(stat?.bestVisitPoints)); out[key] = cur;
      });
    });
    return Object.entries(out).map(([key, stat]: any) => ({ key, ...stat, accuracy: ratio(stat.validDarts, stat.darts), marksPerVisit: stat.attempts ? stat.marks / stat.attempts : 0 })).sort((a: any, b: any) => (a.key === "25" ? 25 : Number(a.key)) - (b.key === "25" ? 25 : Number(b.key)));
  }, [rows]);
  const bestTargets = [...targetAgg].filter((row) => row.darts).sort((a, b) => b.accuracy - a.accuracy || b.marks - a.marks).slice(0, 5);
  const weakTargets = [...targetAgg].filter((row) => row.darts).sort((a, b) => a.accuracy - b.accuracy || b.darts - a.darts).slice(0, 5);

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques SHOOTER.</div>;
  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>SHOOTER — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Précision cible par cible, marks, progression, séries, volées parfaites, pénalités et scoring.</div>
    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie SHOOTER terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""}`)}
        {kpi("Win rate", pct(ratio(wins, games)), `${wins}/${games}`)}
        {kpi("Précision", pct(accuracy), `${hits}/${darts} fléchettes`, GOOD)}
        {kpi("Cibles validées", clears, `Meilleure progression : ${bestProgress}`)}
        {kpi("Marks", marks, `${appliedMarks} appliqués · ${avgMarks.toFixed(2)}/volée`)}
        {kpi("Points", points, `${avgPoints.toFixed(1)}/volée`, GOLD)}
        {kpi("Volées réussies", pct(successRate), `${successful}/${visits}`)}
        {kpi("0/3", failed, `${penalties} pénalités`, BAD)}
        {kpi("Perfect 3/3", perfect, `${firstDart} hits dès la 1re flèche`, GOOD)}
        {kpi("Meilleure volée", `${bestMarks} marks`, `${bestPoints} points`)}
        {kpi("Meilleure série darts", bestStreak, `${bestVisitStreak} volées avec ≥1 hit`)}
        {kpi("Pénalités", penaltyPoints ? `−${penaltyPoints} pts` : progressPenalties ? `−${progressPenalties} marks` : "0", `${penalties} événement${penalties > 1 ? "s" : ""}`, BAD)}
      </div>

      {section("Répartition des impacts", <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{[["Singles", singles],["Doubles", doubles],["Triples", triples],["BULL", bulls],["DBULL", dbulls],["MISS", misses]].map(([label,value]: any) => <div key={label} style={{ padding: 10, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#959aad", fontSize: 9.5 }}>{label}</div><div style={{ color: label === "MISS" ? BAD : ACCENT, fontSize: 19, fontWeight: 1000 }}>{value}</div></div>)}</div>)}

      {section("Précision par cible", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 7 }}>{targetAgg.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center", border: `1px solid ${row.accuracy >= accuracy ? `${GOOD}35` : "rgba(255,255,255,.06)"}` }}><div style={{ color: "#aab0c1", fontSize: 9.5 }}>{targetLabel(row.key)}</div><div style={{ marginTop: 2, color: row.validDarts ? GOOD : BAD, fontSize: 18, fontWeight: 1000 }}>{row.validDarts}/{row.darts}</div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 900 }}>{pct(row.accuracy)}</div><div style={{ marginTop: 2, color: "#777d91", fontSize: 8.5 }}>{row.marks} marks · {row.points} pts</div></div>)}</div>)}

      {section("Points forts / cibles à travailler", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><div style={{ borderRadius: 14, background: `${GOOD}0d`, border: `1px solid ${GOOD}30`, padding: 10 }}><div style={{ color: GOOD, fontSize: 10, fontWeight: 1000, marginBottom: 6 }}>MEILLEURES</div>{bestTargets.map((row: any) => <div key={row.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, padding: "3px 0" }}><b>{targetLabel(row.key)}</b><span>{pct(row.accuracy)} · {row.marks} marks</span></div>)}</div><div style={{ borderRadius: 14, background: `${BAD}0d`, border: `1px solid ${BAD}30`, padding: 10 }}><div style={{ color: BAD, fontSize: 10, fontWeight: 1000, marginBottom: 6 }}>À TRAVAILLER</div>{weakTargets.map((row: any) => <div key={row.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, padding: "3px 0" }}><b>{targetLabel(row.key)}</b><span>{pct(row.accuracy)} · {row.validDarts}/{row.darts}</span></div>)}</div></div>)}

      {section("Parties récentes", <div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 10).map(({ record, row }, index) => { const winsArr = winnerIds(record); const won = row?.win === true || row?.winner === true || winsArr.includes(String(playerId)) || (row?.teamId && winsArr.includes(String(row.teamId))); const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—"; const seqLen = n(record?.summary?.targetSequence?.length || record?.payload?.summary?.targetSequence?.length || record?.payload?.state?.sequence?.length); return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}><div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : "#" + (row?.rank || "—")}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.targetsCleared)}/{seqLen || "?"} cibles • {n(row?.validDarts)} hits / {n(row?.darts)} darts ({n(row?.accuracy).toFixed(1)}%) • {n(row?.marks)} marks • {n(row?.pointsWon ?? row?.points)} pts • série {n(row?.bestHitStreak)}</div></div><div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{n(row?.targetsCleared)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>cibles</div></div></div>; })}</div>)}
    </>}
  </div>;
}
