// @ts-nocheck
import React from "react";

const ACCENT = "#e4c06b";
const GOOD = "#65efb4";
const BAD = "#ff7c93";
const PINK = "#ff63b8";
const CYAN = "#42d6ff";

function n(value: any, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function txt(value: any) { return String(value ?? "").trim(); }
function pid(row: any) { return txt(row?.id || row?.playerId || row?.profileId || row?.pid); }
function pname(row: any) { return txt(row?.name || row?.playerName || row?.displayName || "Joueur"); }
function ratio(a: number, b: number) { return b > 0 ? (a / b) * 100 : 0; }
function pct(value: number) { return `${Math.round(value * 10) / 10}%`; }
function playedAt(record: any) { return n(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt); }
function isPrisoner(record: any) { const blob = [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode].map((v) => txt(v).toLowerCase()).join(" "); return blob.includes("prisoner"); }
function pools(record: any) { return [record?.payload?.stats?.players, record?.payload?.summary?.players, record?.payload?.summary?.perPlayer, record?.summary?.players, record?.summary?.perPlayer, record?.payload?.players, record?.players].filter(Array.isArray); }
function findRow(record: any, id: string, name?: string | null) { const wantedName = txt(name).toLowerCase(); for (const pool of pools(record)) { const byId = pool.find((row: any) => pid(row) === String(id)); if (byId) return byId; if (wantedName) { const byName = pool.find((row: any) => pname(row).toLowerCase() === wantedName); if (byName) return byName; } } return null; }
function winnerIds(record: any) { const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds; if (Array.isArray(raw)) return raw.map(String); const one = txt(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId); return one ? [one] : []; }
function sum(rows: any[], ...keys: string[]) { return rows.reduce((total, row) => { for (const key of keys) { const v = row?.[key]; if (v !== undefined && v !== null && Number.isFinite(Number(v))) return total + Number(v); } return total; }, 0); }
function best(rows: any[], ...keys: string[]) { return rows.reduce((max, row) => { for (const key of keys) { const v = Number(row?.[key]); if (Number.isFinite(v)) return Math.max(max, v); } return max; }, 0); }
function low(rows: any[], ...keys: string[]) { let out = Infinity; rows.forEach((row) => { for (const key of keys) { const v = Number(row?.[key]); if (Number.isFinite(v)) { out = Math.min(out, v); break; } } }); return Number.isFinite(out) ? out : 0; }
function kpi(label: string, value: any, detail?: any, color = ACCENT) { return <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 12, minWidth: 0 }}><div style={{ color: "#9ea3b7", fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 22, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>{detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10.5 }}>{detail}</div> : null}</div>; }
function section(title: string, children: React.ReactNode) { return <section style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 12 }}><div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 9 }}>{title}</div>{children}</section>; }

export default function PrisonerStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isPrisoner).map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) })).filter((item) => item.row).sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);
  const rows = matches.map((item) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId))).length;
  const completed = rows.filter((r) => r?.completed === true).length;
  const eliminated = rows.filter((r) => r?.eliminated === true).length;
  const darts = sum(rows, "dartsThrown", "darts");
  const visits = sum(rows, "visits");
  const progress = sum(rows, "progressHits", "targetsCompleted", "progress");
  const captures = sum(rows, "captures");
  const opponentCaptures = sum(rows, "opponentCaptures");
  const rescues = sum(rows, "ownRescues");
  const captureLosses = sum(rows, "captureLosses");
  const prisoners = sum(rows, "prisonersCreated");
  const remaining = sum(rows, "prisonersRemaining");
  const inner = sum(rows, "innerSingles");
  const outer = sum(rows, "outerSingles");
  const doubles = sum(rows, "doubles");
  const triples = sum(rows, "triples");
  const bulls = sum(rows, "bulls") + sum(rows, "dbulls");
  const misses = sum(rows, "offboardMisses", "misses");
  const skipped = sum(rows, "turnsSkipped");
  const bestProgressVisit = best(rows, "bestProgressVisit");
  const bestStreak = best(rows, "bestProgressStreak");
  const maxOwned = best(rows, "maxDartsOwned", "finalDartsOwned");
  const minOwned = low(rows, "minDartsOwned", "finalDartsOwned");
  const avgFinalOwned = games ? sum(rows, "finalDartsOwned", "dartsOwned") / games : 0;
  const avgProgress = games ? sum(rows, "progress", "targetsCompleted") / games : 0;
  const progressAccuracy = ratio(sum(rows, "progressHits"), darts);
  const capturePerVisit = visits ? captures / visits : 0;

  const targetAgg = React.useMemo(() => {
    const out: Record<string, any> = {};
    rows.forEach((row: any) => {
      const source = row?.targetStats || row?.rawStats?.targets || {};
      Object.entries(source).forEach(([key, stat]: any) => {
        const cur = out[key] || { dartsAimed: 0, progressHits: 0, outerSingles: 0, doubles: 0, triples: 0, prisonerMistakes: 0 };
        Object.keys(cur).forEach((field) => cur[field] += n(stat?.[field])); out[key] = cur;
      });
    });
    return Object.entries(out).map(([key, stat]: any) => ({ key, ...stat, accuracy: ratio(stat.progressHits, stat.dartsAimed) })).sort((a: any, b: any) => Number(a.key) - Number(b.key));
  }, [rows]);

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques PRISONER.</div>;
  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>PRISONER — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Progression autour du cadran, captures, prisonniers, transferts de fléchettes, pertes et efficacité par cible.</div>
    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie PRISONER terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""}`)}
        {kpi("Win rate", pct(ratio(wins, games)), `${wins}/${games}`)}
        {kpi("Parcours terminés", completed, `${eliminated} élimination${eliminated > 1 ? "s" : ""}`, GOOD)}
        {kpi("Progression moyenne", `${avgProgress.toFixed(1)}/20`, `Précision progression ${pct(progressAccuracy)}`)}
        {kpi("Captures", captures, `${opponentCaptures} adverses • ${rescues} sauvetages`, CYAN)}
        {kpi("Fléchettes perdues", captureLosses, "capturées par les adversaires", BAD)}
        {kpi("Prisonniers créés", prisoners, `${remaining} encore prisonniers en fin de partie`, PINK)}
        {kpi("Captures / visite", capturePerVisit.toFixed(2), `${visits} visites`)}
        {kpi("Max fléchettes possédées", maxOwned, `Moy. finale ${avgFinalOwned.toFixed(1)}`, GOOD)}
        {kpi("Min fléchettes possédées", minOwned, `${skipped} tour${skipped > 1 ? "s" : ""} passé${skipped > 1 ? "s" : ""}`, BAD)}
        {kpi("Meilleure volée progression", `+${bestProgressVisit}`, `Série record ${bestStreak}`)}
        {kpi("MISS hors cible", misses, `${darts} fléchettes lancées`, BAD)}
      </div>

      {section("Zones touchées", <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{[["SE", outer, GOOD], ["SI", inner, PINK], ["Doubles", doubles, ACCENT], ["Triples", triples, CYAN], ["Bull/DBull", bulls, PINK], ["Progressions", progress, GOOD]].map(([label, value, color]: any) => <div key={label} style={{ padding: 10, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#9096aa", fontSize: 9.5 }}>{label}</div><div style={{ color, fontWeight: 1000, fontSize: 18 }}>{value}</div></div>)}</div>)}

      {targetAgg.length ? section("Efficacité par cible", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(82px,1fr))", gap: 7 }}>{targetAgg.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center", border: `1px solid ${row.progressHits ? `${GOOD}35` : "rgba(255,255,255,.06)"}` }}><div style={{ color: ACCENT, fontSize: 16, fontWeight: 1000 }}>{row.key}</div><div style={{ color: row.progressHits ? GOOD : BAD, fontSize: 12, fontWeight: 1000 }}>{row.progressHits}/{row.dartsAimed}</div><div style={{ color: "#9298aa", fontSize: 8.5 }}>{pct(row.accuracy)}</div><div style={{ marginTop: 2, color: PINK, fontSize: 8 }}>SI pièges {row.prisonerMistakes}</div></div>)}</div>) : null}

      {section("Parties récentes", <div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 10).map(({ record, row }, index) => { const won = row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)); const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—"; return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}><div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : row?.eliminated ? "OUT" : `${n(row?.progress)}/20`}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.progress)}/20 • {n(row?.captures)} captures • {n(row?.prisonersCreated)} prisonniers • {n(row?.finalDartsOwned ?? row?.dartsOwned)} fléchettes fin • {n(row?.offboardMisses)} MISS</div></div><div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{n(row?.progress)}/20</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>progression</div></div></div>; })}</div>)}
    </>}
  </div>;
}
