// @ts-nocheck
import React from "react";

const ACCENT = "#e4c06b";
const GOOD = "#65efb4";
const BAD = "#ff7c93";

function n(value: any, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function txt(value: any) { return String(value ?? "").trim(); }
function pid(row: any) { return txt(row?.id || row?.playerId || row?.profileId || row?.pid); }
function pname(row: any) { return txt(row?.name || row?.playerName || row?.displayName || "Joueur"); }
function ratio(a: number, b: number) { return b > 0 ? (a / b) * 100 : 0; }
function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function playedAt(record: any) { return n(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt); }
function isBobs(record: any) {
  const blob = [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .map((v) => txt(v).toLowerCase()).join(" ");
  return blob.includes("bobs_27") || blob.includes("bobs27") || blob.includes("bob's 27") || blob.includes("bob’s 27");
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
function targetLabel(key: string) { return String(key) === "25" ? "DBULL" : `D${key}`; }

export default function Bobs27StatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isBobs).map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) })).filter((item) => item.row).sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);
  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId))).length;
  const darts = sum(rows, "dartsThrown", "darts");
  const visits = sum(rows, "visits", "targetAttempts");
  const hits = sum(rows, "targetHits", "validDoubles", "validHits");
  const successful = sum(rows, "successfulVisits");
  const failed = sum(rows, "failedVisits", "penaltyEvents");
  const pointsWon = sum(rows, "pointsWon");
  const pointsLost = sum(rows, "pointsLost", "penaltyLost");
  const finalScoreTotal = sum(rows, "finalScore", "score", "points");
  const bestScore = best(rows, "finalScore", "score", "points");
  const bestVisit = best(rows, "bestVisit");
  const bestVisitHits = best(rows, "bestVisitHits");
  const bestStreak = best(rows, "bestSuccessStreak");
  const perfect = sum(rows, "perfectVisits", "threeHitVisits");
  const oneHit = sum(rows, "oneHitVisits");
  const twoHit = sum(rows, "twoHitVisits");
  const threeHit = sum(rows, "threeHitVisits");
  const eliminated = rows.filter((row) => row?.eliminated === true).length;
  const targetAccuracy = ratio(hits, darts);
  const successRate = ratio(successful, visits);
  const avgScore = games ? finalScoreTotal / games : 0;
  const avgGain = visits ? pointsWon / visits : 0;
  const misses = sum(rows, "misses");
  const wasted = sum(rows, "wastedDarts");
  const doubles = sum(rows, "doubles");
  const dbulls = sum(rows, "dbulls");

  const targetAgg = React.useMemo(() => {
    const out: Record<string, any> = {};
    rows.forEach((row: any) => {
      const source = row?.targetStats || row?.rawStats?.targets || {};
      Object.entries(source).forEach(([key, stat]: any) => {
        const cur = out[key] || { attempts: 0, darts: 0, hits: 0, pointsWon: 0, penaltyLost: 0, bestHits: 0 };
        cur.attempts += n(stat?.attempts); cur.darts += n(stat?.darts); cur.hits += n(stat?.hits); cur.pointsWon += n(stat?.pointsWon); cur.penaltyLost += n(stat?.penaltyLost); cur.bestHits = Math.max(cur.bestHits, n(stat?.bestHits)); out[key] = cur;
      });
    });
    return Object.entries(out).map(([key, stat]: any) => ({ key, ...stat, accuracy: ratio(stat.hits, stat.darts), successRate: ratio(Math.min(stat.attempts, stat.hits > 0 ? stat.attempts : 0), stat.attempts) })).sort((a: any, b: any) => (a.key === "25" ? 25 : Number(a.key)) - (b.key === "25" ? 25 : Number(b.key)));
  }, [rows]);
  const bestTargets = [...targetAgg].filter((row) => row.darts).sort((a, b) => b.accuracy - a.accuracy || b.hits - a.hits).slice(0, 5);
  const weakTargets = [...targetAgg].filter((row) => row.darts).sort((a, b) => a.accuracy - b.accuracy || b.darts - a.darts).slice(0, 5);

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques BOB’S 27.</div>;
  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>BOB’S 27 — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Précision sur les doubles, sanctions 0/3, séries, scores finaux et performance cible par cible.</div>
    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie BOB’S 27 terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""}`)}
        {kpi("Win rate", pct(ratio(wins, games)), `${wins}/${games}`)}
        {kpi("Meilleur score", bestScore, `Moy. finale ${avgScore.toFixed(1)}`)}
        {kpi("Précision double", pct(targetAccuracy), `${hits}/${darts} fléchettes`)}
        {kpi("Cibles réussies", pct(successRate), `${successful}/${visits} volées`)}
        {kpi("0/3 / pénalités", failed, `−${pointsLost} points`, BAD)}
        {kpi("Points gagnés", `+${pointsWon}`, `Moy. +${avgGain.toFixed(1)} / volée`, GOOD)}
        {kpi("Meilleure volée", bestVisit, `${bestVisitHits}/3 touches`)}
        {kpi("Perfect 3/3", perfect, `${oneHit}× 1/3 • ${twoHit}× 2/3 • ${threeHit}× 3/3`)}
        {kpi("Meilleure série", bestStreak, "cibles consécutives avec ≥1 hit")}
        {kpi("Éliminations", eliminated, `${games - eliminated} partie${games - eliminated > 1 ? "s" : ""} terminée${games - eliminated > 1 ? "s" : ""}`)}
        {kpi("Fléchettes perdues", wasted, `${misses} MISS • ${doubles} doubles physiques • ${dbulls} DBULL`)}
      </div>

      {section("Précision par double", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 7 }}>{targetAgg.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center", border: `1px solid ${row.accuracy >= targetAccuracy ? `${GOOD}35` : "rgba(255,255,255,.06)"}` }}><div style={{ color: "#aab0c1", fontSize: 9.5 }}>{targetLabel(row.key)}</div><div style={{ marginTop: 2, color: row.hits ? GOOD : BAD, fontSize: 18, fontWeight: 1000 }}>{row.hits}/{row.darts}</div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 900 }}>{pct(row.accuracy)}</div><div style={{ marginTop: 2, color: "#777d91", fontSize: 8.5 }}>+{row.pointsWon} / −{row.penaltyLost}</div></div>)}</div>)}

      {section("Points forts / doubles à travailler", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><div style={{ borderRadius: 14, background: `${GOOD}0d`, border: `1px solid ${GOOD}30`, padding: 10 }}><div style={{ color: GOOD, fontSize: 10, fontWeight: 1000, marginBottom: 6 }}>MEILLEURS</div>{bestTargets.map((row: any) => <div key={row.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, padding: "3px 0" }}><b>{targetLabel(row.key)}</b><span>{pct(row.accuracy)} · {row.hits} hits</span></div>)}</div><div style={{ borderRadius: 14, background: `${BAD}0d`, border: `1px solid ${BAD}30`, padding: 10 }}><div style={{ color: BAD, fontSize: 10, fontWeight: 1000, marginBottom: 6 }}>À TRAVAILLER</div>{weakTargets.map((row: any) => <div key={row.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, padding: "3px 0" }}><b>{targetLabel(row.key)}</b><span>{pct(row.accuracy)} · {row.hits} hits</span></div>)}</div></div>)}

      {section("Parties récentes", <div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 10).map(({ record, row }, index) => { const won = row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)); const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—"; return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}><div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : row?.eliminated ? "OUT" : "#" + (row?.rank || "—")}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Score {n(row?.finalScore ?? row?.score)} • {n(row?.targetHits)} hits / {n(row?.darts)} darts ({n(row?.doubleAccuracy).toFixed(1)}%) • 0/3 {n(row?.failedVisits)} • série {n(row?.bestSuccessStreak)} • best +{n(row?.bestVisit)}</div></div><div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{n(row?.finalScore ?? row?.score)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>score</div></div></div>; })}</div>)}
    </>}
  </div>;
}
