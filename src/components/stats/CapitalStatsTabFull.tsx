// @ts-nocheck
import React from "react";
import { buildCapitalPlayerStats, CAPITAL_CONTRACT_META, capitalDartScore } from "../../lib/capitalGame";
import { capitalCompletedMatches } from "../../lib/capitalStatsHistory";
import { buildCapitalPersonalRecords } from "../../lib/capitalPersonalRecords";

const ACCENT = "#ffd166";

function number(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function text(value: any) { return String(value ?? "").trim(); }
function playerName(row: any) { return text(row?.name || row?.playerName || row?.displayName || row?.nickname || "Joueur"); }
function percent(value: number) { return `${Math.round(value * 10) / 10}%`; }
function round1(value: number) { return Math.round(value * 10) / 10; }
function ratio(num: number, den: number) { return den ? (num / den) * 100 : 0; }

function visitsOf(record: any) {
  const pools = [record?.payload?.stats?.visits, record?.payload?.summary?.visits, record?.summary?.visits, record?.payload?.visits, record?.visits];
  return pools.find((pool) => Array.isArray(pool)) || [];
}
function normalizeRow(record: any, row: any, wantedId: string) {
  if (!row) return null;
  const visits = visitsOf(record).filter((visit: any) => String(visit?.playerId || "") === String(wantedId));
  if (!visits.length) return row;
  try {
    const finalCapital = number(row?.finalCapital ?? row?.capital ?? row?.score, 0);
    const derived = buildCapitalPlayerStats([{ ...row, id: wantedId, name: playerName(row) }] as any, visits as any, [finalCapital])[0];
    return { ...derived, ...row, contractStats: row?.contractStats || derived?.contractStats, sectorHits: row?.sectorHits || derived?.sectorHits, sectorPoints: row?.sectorPoints || derived?.sectorPoints, buckets: row?.buckets || derived?.buckets };
  } catch { return row; }
}
function winnerIds(record: any): string[] {
  const raw = record?.winnerIds || record?.summary?.winnerIds || record?.payload?.winnerIds || record?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = text(record?.winnerId || record?.summary?.winnerId || record?.payload?.winnerId || record?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function playedAt(record: any) { return number(record?.updatedAt || record?.summary?.finishedAt || record?.payload?.summary?.finishedAt || record?.createdAt); }
function statValue(rows: any[], ...keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) return total + Number(value);
    }
    return total;
  }, 0);
}
function bestValue(rows: any[], ...keys: string[]) {
  return rows.reduce((best, row) => {
    for (const key of keys) {
      const value = Number(row?.[key]);
      if (Number.isFinite(value)) return Math.max(best, value);
    }
    return best;
  }, 0);
}
function kpi(label: string, value: any, detail?: any, accent = ACCENT) {
  return <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", padding: 12, minWidth: 0 }}>
    <div style={{ color: "#9ea3b7", fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: .55 }}>{label}</div>
    <div style={{ marginTop: 4, color: accent, fontSize: 22, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "#aeb3c3", fontSize: 10.5 }}>{detail}</div> : null}
  </div>;
}
function section(title: string, children: React.ReactNode) {
  return <section style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 12 }}>
    <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 9 }}>{title}</div>
    {children}
  </section>;
}

export default function CapitalStatsTabFull({ records = [], playerId: wantedPlayerId, playerName: wantedPlayerName }: any) {
  const [variantFilter, setVariantFilter] = React.useState("all");
  const allMatches = React.useMemo(() => capitalCompletedMatches(records, String(wantedPlayerId || ""), wantedPlayerName)
    .map((item) => ({ ...item, row: normalizeRow(item.record, item.row, String(wantedPlayerId || "")) })),
  [records, wantedPlayerId, wantedPlayerName]);
  const variants = React.useMemo(() => {
    const groups = new Map<string, { id: string; label: string; games: number; wins: number; best: number }>();
    for (const item of allMatches) {
      const group = groups.get(item.variantId) || { id: item.variantId, label: item.variantLabel, games: 0, wins: 0, best: 0 };
      group.games += 1;
      if (winnerIds(item.record).includes(String(wantedPlayerId))) group.wins += 1;
      group.best = Math.max(group.best, number(item.row?.finalCapital ?? item.row?.capital ?? item.row?.score));
      groups.set(item.variantId, group);
    }
    return [...groups.values()].sort((a, b) => b.games - a.games || a.label.localeCompare(b.label));
  }, [allMatches, wantedPlayerId]);
  // Un filtre supprimé ne doit pas donner l'impression que l'historique a disparu.
  const effectiveFilter = variantFilter === "all" || variants.some((v) => v.id === variantFilter) ? variantFilter : "all";
  const matches = React.useMemo(() => effectiveFilter === "all" ? allMatches : allMatches.filter((item) => item.variantId === effectiveFilter), [allMatches, effectiveFilter]);
  const rows = matches.map((item) => item.row);
  const personalRecords = React.useMemo(() => buildCapitalPersonalRecords(matches, String(wantedPlayerId || "")), [matches, wantedPlayerId]);
  const games = matches.length;
  const wins = matches.filter((item) => winnerIds(item.record).includes(String(wantedPlayerId))).length;
  const losses = Math.max(0, games - wins);
  const winRate = ratio(wins, games);
  const darts = statValue(rows, "dartsThrown", "darts", "totalThrows");
  const visits = statValue(rows, "visits", "turns", "rounds");
  const successful = statValue(rows, "successfulContracts", "successfulVisits", "validHits");
  const failed = statValue(rows, "failedContracts", "failedVisits", "fails");
  const attempts = successful + failed;
  const successRate = ratio(successful, attempts);
  const pointsWon = statValue(rows, "pointsWon", "points");
  const capitalLost = statValue(rows, "capitalLost", "penaltyLost");
  const finalCapitalTotal = statValue(rows, "finalCapital", "capital", "score");
  const startingCapitalTotal = statValue(rows, "startingCapital");
  const grossCapitalTotal = statValue(rows, "grossCapital") || (startingCapitalTotal + pointsWon);
  const averageCapital = games ? finalCapitalTotal / games : 0;
  const averageStartingCapital = games ? startingCapitalTotal / games : 0;
  const bestCapital = bestValue(rows, "finalCapital", "capital", "score");
  const peakCapital = bestValue(rows, "peakCapital", "finalCapital");
  const lowestCapital = rows.length ? Math.min(...rows.map((r) => number(r?.lowestCapital ?? r?.finalCapital, 0))) : 0;
  const bestVisit = bestValue(rows, "bestVisit");
  const bestGain = bestValue(rows, "bestGain");
  const biggestLoss = bestValue(rows, "biggestLoss");
  const totalScored = statValue(rows, "rawPointsScored", "totalScore");
  const averageVisit = visits ? totalScored / visits : 0;
  const avg3 = darts ? (totalScored / darts) * 3 : 0;
  const exact57 = statValue(rows, "exact57");
  const penaltyEvents = statValue(rows, "penaltyEvents");
  const avgPenalty = penaltyEvents ? capitalLost / penaltyEvents : 0;
  const retentionRate = ratio(finalCapitalTotal, grossCapitalTotal);
  const hitCount = statValue(rows, "hitCount") || Math.max(0, darts - statValue(rows, "misses"));
  const hitRate = ratio(hitCount, darts);
  const successStreakMax = bestValue(rows, "successStreakMax");
  const failStreakMax = bestValue(rows, "failStreakMax");
  const hits = {
    singles: statValue(rows, "singles"), doubles: statValue(rows, "doubles"), triples: statValue(rows, "triples"), bulls: statValue(rows, "bulls"), dbulls: statValue(rows, "dbulls"), misses: statValue(rows, "misses"),
  };
  const buckets = {
    v60: statValue(rows, "visits60Plus"), v100: statValue(rows, "visits100Plus"), v140: statValue(rows, "visits140Plus"), v180: statValue(rows, "visits180", "h180"), zero: statValue(rows, "zeroVisits"),
  };

  const contractAgg = React.useMemo(() => {
    const out: Record<string, any> = {};
    rows.forEach((row: any) => Object.entries(row?.contractStats || {}).forEach(([id, stat]: any) => {
      const cur = out[id] || { attempts: 0, successes: 0, failures: 0, pointsWon: 0, capitalLost: 0, rawPoints: 0, bestVisit: 0 };
      cur.attempts += number(stat?.attempts); cur.successes += number(stat?.successes); cur.failures += number(stat?.failures); cur.pointsWon += number(stat?.pointsWon); cur.capitalLost += number(stat?.capitalLost); cur.rawPoints += number(stat?.rawPoints); cur.bestVisit = Math.max(cur.bestVisit, number(stat?.bestVisit));
      out[id] = cur;
    }));
    return Object.entries(out).map(([id, stat]: any) => ({ id, ...stat, successRate: ratio(stat.successes, stat.attempts), averageVisit: stat.attempts ? stat.rawPoints / stat.attempts : 0 })).sort((a: any, b: any) => b.attempts - a.attempts || b.successRate - a.successRate);
  }, [rows]);

  const sectorAgg = React.useMemo(() => {
    const hits: Record<string, number> = {}, points: Record<string, number> = {};
    rows.forEach((row: any) => {
      Object.entries(row?.sectorHits || {}).forEach(([key, value]) => { hits[key] = (hits[key] || 0) + number(value); });
      Object.entries(row?.sectorPoints || {}).forEach(([key, value]) => { points[key] = (points[key] || 0) + number(value); });
    });
    return Object.keys({ ...hits, ...points }).map((sector) => ({ sector, hits: hits[sector] || 0, points: points[sector] || 0 })).sort((a, b) => b.hits - a.hits || b.points - a.points);
  }, [rows]);

  if (!wantedPlayerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques CAPITAL.</div>;

  return <div style={{ padding: 16 }}>
    <div style={{ color: ACCENT, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>CAPITAL — Statistiques détaillées</div>
    <div style={{ marginTop: 5, color: "#aeb3c5", fontSize: 11.5 }}>Capital, contrats, pénalités, précision, impacts et performance contrat par contrat.</div>

    {variants.length ? section("Bilan par variante", <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
        {[{ id: "all", label: "TOUTES", games: allMatches.length }, ...variants].map((variant) => (
          <button key={variant.id} type="button" onClick={() => setVariantFilter(variant.id)}
            aria-pressed={effectiveFilter === variant.id}
            style={{ cursor: "pointer", padding: "9px 11px", borderRadius: 11, border: `1px solid ${effectiveFilter === variant.id ? ACCENT : "rgba(255,255,255,.15)"}`,
              background: effectiveFilter === variant.id ? "rgba(255,209,102,.18)" : "rgba(255,255,255,.035)", color: effectiveFilter === variant.id ? ACCENT : "#e2e5eb", fontSize: 11, fontWeight: 950 }}>
            {variant.label} · {variant.games}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 7 }}>
        {variants.map((variant) => <div key={variant.id} style={{ background: "rgba(0,0,0,.20)", borderRadius: 12, padding: 9, border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ color: ACCENT, fontWeight: 950, fontSize: 11 }}>{variant.label}</div>
          <div style={{ fontSize: 10.5, marginTop: 4 }}>{variant.games} partie{variant.games > 1 ? "s" : ""} · {variant.wins} victoire{variant.wins > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 10.5, opacity: .7 }}>Record : {variant.best}</div>
        </div>)}
      </div>
      <div style={{ marginTop: 7, fontSize: 10, color: "#aeb3c5" }}>Choisis une variante pour filtrer toutes les statistiques ci-dessous. Seules les parties terminées sont comptées.</div>
    </>) : null}

    {games && section("Records personnels · contrats & variantes", <>
      <div style={{ color: "#aeb3c5", fontSize: 10.5, marginBottom: 10 }}>
        Records calculés depuis les volées validées des parties terminées, pour {effectiveFilter === "all" ? "toutes les variantes" : variants.find(v => v.id === effectiveFilter)?.label || "cette variante"}. Les impacts et les scores non enregistrés ne sont jamais estimés.
      </div>
      {personalRecords.gamesWithVisits === 0 ? <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,.23)", fontSize: 11, color: "#aeb3c5" }}>Aucune volée détaillée disponible pour établir des records fiables.</div> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 12 }}>
          {kpi("Meilleur gain validé", personalRecords.bestGain ? `+${personalRecords.bestGain.value}` : "—",
            personalRecords.bestGain ? `${CAPITAL_CONTRACT_META[personalRecords.bestGain.contractId]?.short || personalRecords.bestGain.contractId} · ${personalRecords.bestGain.variantLabel}` : "Donnée indisponible", "#a8ff68")}
          {kpi("Plus longue série", personalRecords.bestStreak ? personalRecords.bestStreak.value : "—",
            personalRecords.bestStreak ? `${personalRecords.bestStreak.variantLabel} · contrats consécutifs` : "Donnée indisponible")}
          {kpi("Capital maximum", personalRecords.bestPeak ? personalRecords.bestPeak.value : "—",
            personalRecords.bestPeak?.variantLabel || "Donnée indisponible")}
          {kpi("Contrats validés", `${personalRecords.contractsSucceeded}/${personalRecords.contractsAttempted}`,
            `${percent(ratio(personalRecords.contractsSucceeded, personalRecords.contractsAttempted))} · ${personalRecords.gamesWithVisits} parties documentées`)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <strong style={{ color: ACCENT, fontSize: 11 }}>RECORDS PAR CONTRAT</strong>
          <span style={{ color: "#aeb3c5", fontSize: 10 }}>Glisser horizontalement →</span>
        </div>
        <div role="region" aria-label="Records CAPITAL par contrat" tabIndex={0} style={{ overflowX: "auto", maxWidth: "100%", borderRadius: 12, border: "1px solid rgba(255,209,102,.22)", overscrollBehaviorX: "contain" }}>
          <table style={{ width: "100%", minWidth: 540, borderCollapse: "collapse", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
            <thead><tr style={{ background: "rgba(255,209,102,.12)", color: ACCENT }}>
              {[["Contrat", "left"], ["Réussites", "center"], ["Taux", "center"], ["Record validé", "right"], ["Points cumulés", "right"]].map(([label, align]) => <th key={label} scope="col" style={{ textAlign: align, padding: "10px 7px", whiteSpace: "nowrap" }}>{label}</th>)}
            </tr></thead>
            <tbody>{personalRecords.contracts.map((item, i) => <tr key={item.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", background: i % 2 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.1)" }}>
              <th scope="row" style={{ textAlign: "left", padding: "9px 7px", fontWeight: 900 }}>{CAPITAL_CONTRACT_META[item.id]?.label || item.id.replaceAll("_", " ")}</th>
              <td style={{ textAlign: "center", whiteSpace: "nowrap", color: "#a8ff68", fontWeight: 900 }}>{item.successes}/{item.attempts}</td>
              <td style={{ textAlign: "center", color: item.successRate >= 50 ? "#a8ff68" : "#ffad6a" }}>{percent(item.successRate)}</td>
              <td style={{ textAlign: "right", color: ACCENT, fontWeight: 1000 }} title={item.bestCreditedVariant || ""}>{item.bestCredited === null ? "—" : `+${item.bestCredited}`}</td>
              <td style={{ textAlign: "right", padding: "9px 7px" }}>+{item.totalCredited}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{ color: "#99a0b0", fontSize: 10, marginTop: 7 }}>« Record validé » = meilleurs points réellement crédités sur une seule manche réussie, bonus inclus ; jamais le score brut hors contrat. Sélectionne une variante ci-dessus pour voir ses propres records.</div>
      </>}
    </>)}

    {!games ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", color: "#aeb3c5" }}>Aucune partie CAPITAL terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        {kpi("Parties", games, `${wins} victoire${wins > 1 ? "s" : ""} • ${losses} défaite${losses > 1 ? "s" : ""}`)}
        {kpi("Win rate", percent(winRate), `${wins}/${games}`)}
        {kpi("Meilleur capital", bestCapital, `Moy. ${averageCapital.toFixed(1)}`)}
        {kpi("Capital de départ", averageStartingCapital.toFixed(1), `Pic record ${peakCapital} • mini ${lowestCapital}`)}
        {kpi("Capital conservé", percent(retentionRate), `Net cumulé ${finalCapitalTotal - startingCapitalTotal >= 0 ? "+" : ""}${finalCapitalTotal - startingCapitalTotal}`)}
        {kpi("Réussite contrats", percent(successRate), `${successful}/${attempts} • ${failed} échecs`)}
        {kpi("Points gagnés", pointsWon, `Capital perdu ${capitalLost}`)}
        {kpi("Pénalités", penaltyEvents, `Moy. −${avgPenalty.toFixed(1)} • max −${biggestLoss}`)}
        {kpi("Moyenne / volée", averageVisit.toFixed(1), `AVG/3 ${avg3.toFixed(1)} • Best ${bestVisit}`)}
        {kpi("Meilleur gain", `+${bestGain}`, `Série réussites ${successStreakMax} • échecs ${failStreakMax}`)}
        {kpi("Précision impacts", percent(hitRate), `${hitCount}/${darts} fléchettes utiles`)}
        {kpi("57 exacts", exact57, `${visits} volées • ${darts} fléchettes`)}
      </div>

      {section("Répartition des impacts", <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
          {[['Simple', hits.singles], ['Double', hits.doubles], ['Triple', hits.triples], ['Bull', hits.bulls], ['DBull', hits.dbulls], ['Miss', hits.misses]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#9da2b4", fontSize: 9.5 }}>{label}</div><div style={{ marginTop: 2, color: label === "Miss" ? "#ff7c93" : ACCENT, fontSize: 18, fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 2, color: "#777d91", fontSize: 9 }}>{darts ? percent((number(value) / darts) * 100) : "0%"}</div></div>)}
        </div>
      </>)}

      {section("Grosses volées", <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
        {[['60+', buckets.v60], ['100+', buckets.v100], ['140+', buckets.v140], ['180', buckets.v180], ['0 pt', buckets.zero]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 13, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ color: "#9da2b4", fontSize: 9.5 }}>{label}</div><div style={{ marginTop: 2, color: ACCENT, fontSize: 18, fontWeight: 1000 }}>{value}</div></div>)}
      </div>)}

      {section("Performance par contrat", <div style={{ display: "grid", gap: 6 }}>
        {contractAgg.length ? contractAgg.map((row: any) => {
          const label = CAPITAL_CONTRACT_META[row.id as keyof typeof CAPITAL_CONTRACT_META]?.label || row.id.replaceAll("_", " ");
          return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "minmax(90px,1.2fr) 70px 70px 70px 70px", gap: 7, alignItems: "center", padding: 8, borderRadius: 12, background: "rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight: 1000, fontSize: 11 }}>{label}</div><div style={{ color: ACCENT, fontWeight: 1000 }}>{percent(row.successRate)}</div><div style={{ fontSize: 10.5 }}>+{row.pointsWon}</div><div style={{ fontSize: 10.5, color: "#ff8aa6" }}>−{row.capitalLost}</div><div style={{ fontSize: 10.5 }}>Best {row.bestVisit}</div>
          </div>;
        }) : <div style={{ color: "#aeb3c5", fontSize: 11 }}>Ventilation disponible sur les prochaines parties enregistrées.</div>}
      </div>)}

      {section("Secteurs les plus utilisés", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        {sectorAgg.slice(0, 10).map((row) => <div key={row.sector} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: 9, borderRadius: 12, background: "rgba(0,0,0,.18)" }}><span style={{ fontWeight: 1000 }}>{row.sector === "25" ? "BULL" : `Secteur ${row.sector}`}</span><span style={{ color: ACCENT, fontWeight: 1000 }}>{row.hits} hits • {row.points} pts</span></div>)}
      </div>)}

      <section style={{ marginTop: 12 }}>
        <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 8 }}>Parties récentes</div>
        <div style={{ display: "grid", gap: 7 }}>
          {matches.slice(0, 10).map(({ record, row, variantLabel }, index) => {
            const won = winnerIds(record).includes(String(wantedPlayerId));
            const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
            return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: 10, borderRadius: 15, border: `1px solid ${won ? `${ACCENT}66` : "rgba(255,255,255,.08)"}`, background: won ? `${ACCENT}0d` : "rgba(255,255,255,.03)" }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: won ? ACCENT : "rgba(255,255,255,.07)", color: won ? "#080a10" : "#c8cbd6", fontWeight: 1000 }}>{won ? "WIN" : "#" + (row?.rank || "—")}</div>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{date} • {record?.summary?.participantMode === "teams" ? "Équipes" : "Joueurs"}</div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 900 }}>{variantLabel}</div><div style={{ color: "#aeb3c3", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{number(row?.startingCapital)}→{number(row?.finalCapital ?? row?.capital ?? row?.score)} • contrats {number(row?.successfulContracts)}/{number(row?.contractsPlayed)} ({number(row?.successRate).toFixed(1)}%) • +{number(row?.pointsWon)} / −{number(row?.capitalLost)} • hit {number(row?.hitRate).toFixed(1)}% • best {number(row?.bestVisit)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: ACCENT, fontSize: 20, fontWeight: 1000 }}>{number(row?.finalCapital ?? row?.capital ?? row?.score)}</div><div style={{ color: "#9297aa", fontSize: 9.5 }}>capital</div></div>
            </div>;
          })}
        </div>
      </section>
    </>}
  </div>;
}
