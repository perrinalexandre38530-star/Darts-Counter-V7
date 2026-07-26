// @ts-nocheck
import React from "react";

const ACCENT = "#ffd76a";
const GOOD = "#65efb4";
const BAD = "#ff667e";
const CYAN = "#42d6ff";

const n = (v: any, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const txt = (v: any) => String(v ?? "").trim();
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%";
const playedAt = (r: any) => n(r?.updatedAt || r?.summary?.finishedAt || r?.payload?.summary?.finishedAt || r?.createdAt);
const rowId = (r: any) => txt(r?.id || r?.playerId || r?.profileId || r?.pid);
const rowName = (r: any) => txt(r?.name || r?.playerName || r?.displayName || "Joueur");

function isHalveIt(record: any) {
  const blob = [record?.kind, record?.mode, record?.game, record?.variantId, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.summary?.mode]
    .filter(Boolean).map((v) => txt(v).toLowerCase()).join(" ");
  return blob.includes("halve_it") || blob.includes("halve-it") || blob.includes("halve it") || blob.includes("half-it");
}
function pools(record: any) {
  return [record?.payload?.stats?.players, record?.payload?.summary?.players, record?.payload?.summary?.perPlayer, record?.summary?.players, record?.summary?.perPlayer, record?.payload?.players, record?.players].filter(Array.isArray);
}
function findRow(record: any, id: string, name?: string | null) {
  const wantedName = txt(name).toLowerCase();
  for (const pool of pools(record)) {
    const byId = pool.find((row: any) => rowId(row) === String(id));
    if (byId) return byId;
    if (wantedName) {
      const byName = pool.find((row: any) => rowName(row).toLowerCase() === wantedName);
      if (byName) return byName;
    }
  }
  return null;
}
function winnerIds(record: any) {
  const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = txt(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function sum(rows: any[], ...keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) if (row?.[key] !== undefined && Number.isFinite(Number(row[key]))) return total + Number(row[key]);
    return total;
  }, 0);
}
function best(rows: any[], ...keys: string[]) {
  return rows.reduce((m, row) => {
    for (const key of keys) if (Number.isFinite(Number(row?.[key]))) return Math.max(m, Number(row[key]));
    return m;
  }, 0);
}
function Kpi({ label, value, detail, color = ACCENT }: any) {
  return <div style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 11, minWidth: 0 }}>
    <div style={{ color: "#9ea3b7", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 22, fontWeight: 1000, lineHeight: 1 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 9.5 }}>{detail}</div> : null}
  </div>;
}
function Section({ title, children }: any) {
  return <section style={{ marginTop: 12, borderRadius: 17, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 11 }}>
    <div style={{ color: ACCENT, fontSize: 10.5, fontWeight: 1000, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>{children}
  </section>;
}
function targetLabel(key: string, stat: any) {
  return txt(stat?.label) || ({ open: "LIBRE", double_any: "DOUBLE", triple_any: "TRIPLE", bull: "BULL" } as any)[key] || key.replace(/^n/, "");
}

export default function HalveItStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter(isHalveIt)
    .map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) }))
    .filter((item) => item.row)
    .sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);

  const rows = matches.map((x) => x.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }) => {
    const ids = winnerIds(record);
    return row?.win === true || row?.winner === true || ids.includes(String(playerId)) || (row?.teamId && ids.includes(String(row.teamId)));
  }).length;
  const darts = sum(rows, "dartsThrown", "darts");
  const visits = sum(rows, "visits", "targetAttempts");
  const hits = sum(rows, "validHits", "targetHits");
  const halves = sum(rows, "halvingEvents", "penaltyEvents");
  const pointsWon = sum(rows, "pointsWon");
  const pointsLost = sum(rows, "pointsLostByHalving", "pointsLost");
  const failed = sum(rows, "failedVisits");
  const perfect = sum(rows, "perfectVisits", "threeHitVisits");
  const successes = sum(rows, "successfulVisits");
  const oneHit = sum(rows, "oneHitVisits"), twoHit = sum(rows, "twoHitVisits"), threeHit = sum(rows, "threeHitVisits");
  const bestVisit = best(rows, "bestVisit");
  const bestStreak = best(rows, "bestSuccessStreak");
  const bestFinal = best(rows, "finalScore", "score", "points");
  const singles = sum(rows, "singles"), doubles = sum(rows, "doubles"), triples = sum(rows, "triples"), bulls = sum(rows, "bulls"), dbulls = sum(rows, "dbulls"), misses = sum(rows, "misses");

  const targetAgg = React.useMemo(() => {
    const out: Record<string, any> = {};
    rows.forEach((row: any) => {
      const source = row?.targetStats || row?.rawStats?.targets || {};
      Object.entries(source).forEach(([key, stat]: any) => {
        const cur = out[key] || { label: targetLabel(key, stat), attempts: 0, darts: 0, hits: 0, pointsWon: 0, pointsLost: 0, failed: 0, perfect: 0, bestVisit: 0 };
        cur.attempts += n(stat?.attempts); cur.darts += n(stat?.darts); cur.hits += n(stat?.validHits ?? stat?.hits);
        cur.pointsWon += n(stat?.pointsWon ?? stat?.points); cur.pointsLost += n(stat?.pointsLost);
        cur.failed += n(stat?.failedVisits); cur.perfect += n(stat?.perfectVisits); cur.bestVisit = Math.max(cur.bestVisit, n(stat?.bestVisit));
        out[key] = cur;
      });
    });
    return Object.entries(out).map(([key, stat]: any) => ({ key, ...stat, accuracy: stat.darts ? stat.hits / stat.darts * 100 : 0 }));
  }, [rows]);

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques HALVE-IT.</div>;
  return <div style={{ padding: 14 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>HALVE-IT — Statistiques détaillées</div>
    <div style={{ marginTop: 4, color: "#aeb3c5", fontSize: 11 }}>Scoring, précision sur les contrats, divisions par deux, pertes de points, séries et détail cible par cible.</div>
    {!games ? <div style={{ marginTop: 13, padding: 15, borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie HALVE-IT terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label="Parties" value={games} detail={`${wins} victoire${wins > 1 ? "s" : ""}`} />
        <Kpi label="Win rate" value={pct(wins, games)} detail={`${wins}/${games}`} />
        <Kpi label="Précision contrats" value={pct(hits, darts)} detail={`${hits}/${darts} darts`} color={GOOD} />
        <Kpi label="Volées réussies" value={pct(successes, visits)} detail={`${successes}/${visits}`} color={GOOD} />
        <Kpi label="HALVE subis" value={halves} detail={`${pointsLost} points perdus`} color={BAD} />
        <Kpi label="Points gagnés" value={`+${pointsWon}`} detail={`${visits ? (pointsWon / visits).toFixed(1) : "0.0"}/volée`} color={CYAN} />
        <Kpi label="Meilleure volée" value={bestVisit} detail={`Série réussie max : ${bestStreak}`} />
        <Kpi label="Meilleur score final" value={bestFinal} detail={`${perfect} volée${perfect > 1 ? "s" : ""} parfaite${perfect > 1 ? "s" : ""}`} />
      </div>

      <Section title="Réussite des volées">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
          {[["0/3", failed, BAD],["1/3", oneHit, "#fff"],["2/3", twoHit, CYAN],["3/3", threeHit, GOOD]].map(([label,value,color]: any) => <div key={label} style={{ padding: 9, borderRadius: 12, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#959aad", fontSize: 9 }}>{label}</div><div style={{ color, fontWeight: 1000, fontSize: 19 }}>{value}</div></div>)}
        </div>
      </Section>

      <Section title="Impacts lancés">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
          {[["Singles",singles],["Doubles",doubles],["Triples",triples],["BULL",bulls],["DBULL",dbulls],["MISS",misses]].map(([label,value]: any) => <div key={label} style={{ padding: 9, borderRadius: 12, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#959aad", fontSize: 9 }}>{label}</div><div style={{ color: label === "MISS" ? BAD : ACCENT, fontWeight: 1000, fontSize: 18 }}>{value}</div></div>)}
        </div>
      </Section>

      <Section title="Contrats / cibles">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(95px,1fr))", gap: 7 }}>
          {targetAgg.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 12, background: "rgba(0,0,0,.22)", border: `1px solid ${row.failed ? `${BAD}30` : `${GOOD}24`}`, textAlign: "center" }}>
            <div style={{ color: "#aeb3c3", fontSize: 9, fontWeight: 900 }}>{row.label}</div>
            <div style={{ color: row.hits ? GOOD : BAD, fontSize: 18, fontWeight: 1000 }}>{row.hits}/{row.darts}</div>
            <div style={{ color: ACCENT, fontSize: 9.5, fontWeight: 900 }}>{Math.round(row.accuracy * 10) / 10}%</div>
            <div style={{ marginTop: 2, color: "#7f8495", fontSize: 8 }}>+{row.pointsWon} · −{row.pointsLost} · {row.failed} halve</div>
          </div>)}
        </div>
      </Section>

      <Section title="Parties récentes">
        <div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 10).map(({ record, row }, index) => {
          const ids = winnerIds(record); const won = row?.win === true || row?.winner === true || ids.includes(String(playerId)) || (row?.teamId && ids.includes(String(row.teamId)));
          const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
          return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: won ? `${ACCENT}0e` : "rgba(255,255,255,.03)", border: `1px solid ${won ? `${ACCENT}55` : "rgba(255,255,255,.08)"}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#151008" : "#d0d3dc", fontWeight: 1000 }}>{won ? "WIN" : `#${row?.rank || "—"}`}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: "#aeb3c3", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.validHits)} hits • {n(row?.halvingEvents)} halve • +{n(row?.pointsWon)} / −{n(row?.pointsLostByHalving ?? row?.pointsLost)} pts • best {n(row?.bestVisit)}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{n(row?.finalScore ?? row?.score ?? row?.points)}</div><div style={{ color: "#9297aa", fontSize: 9 }}>score</div></div>
          </div>;
        })}</div>
      </Section>
    </>}
  </div>;
}
