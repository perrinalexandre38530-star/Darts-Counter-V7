// @ts-nocheck
// =============================================================
// CARGO — centre de performances V3
// Poids, contrats, séries, précision, risques, variantes et évolution.
// =============================================================

import React from "react";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const PURPLE = "#d98cff";
const SOFT = "#aab1bf";

const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const txt = (value: any) => String(value ?? "").trim();
const ratio = (part: number, total: number) => total > 0 ? part / total : 0;
const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;
const playedAt = (record: any) => n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt);
const sum = (rows: any[], ...keys: string[]) => rows.reduce((total, row) => total + keys.reduce((value, key) => value || n(row?.[key]), 0), 0);
const max = (rows: any[], ...keys: string[]) => Math.max(0, ...rows.map((row) => keys.reduce((value, key) => value || n(row?.[key]), 0)));
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function isCargo(record: any) {
  return [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.stats?.mode]
    .map((value) => txt(value).toLowerCase())
    .join("|")
    .includes("cargo");
}
function pools(record: any) {
  return [record?.summary?.perPlayer, record?.payload?.summary?.perPlayer, record?.payload?.stats?.players, record?.summary?.rankings, record?.payload?.players, record?.summary?.players, record?.players].filter(Array.isArray);
}
function findRow(record: any, playerId: string, playerName?: string) {
  const found: any[] = [];
  for (const pool of pools(record)) {
    const byId = pool.find((row: any) => txt(row?.id || row?.playerId || row?.profileId) === txt(playerId));
    const byName = playerName ? pool.find((row: any) => txt(row?.name || row?.playerName).toLowerCase() === txt(playerName).toLowerCase()) : null;
    const row = byId || byName;
    if (row) found.push(row);
  }
  return found.reduce((acc, row) => ({ ...acc, ...row }), null);
}
function winnerIds(record: any) {
  return [record?.winnerIds, record?.summary?.winnerIds, record?.payload?.winnerIds, record?.payload?.summary?.winnerIds, record?.winnerId, record?.summary?.winnerId]
    .flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : [])
    .map(String);
}
function didWin(record: any, row: any, playerId: string) {
  return row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId));
}
function variantOf(record: any) {
  return record?.summary?.variant || record?.payload?.summary?.variant || record?.payload?.config?.variant || "cargo_classic";
}
function participantMode(record: any) {
  return record?.summary?.config?.participantMode || record?.payload?.config?.participantMode || "players";
}
function addMap(target: Record<string, number>, source: any) {
  if (!source || typeof source !== "object") return;
  Object.entries(source).forEach(([key, value]) => { target[key] = (target[key] || 0) + n(value); });
}
function panel(accent = "rgba(255,255,255,.09)"): React.CSSProperties {
  return { borderRadius: 17, border: `1px solid ${accent}`, background: "linear-gradient(180deg,rgba(255,255,255,.045),rgba(0,0,0,.21))", padding: 11, boxSizing: "border-box" };
}
function Kpi({ label, value, detail, color = ORANGE }: any) {
  return <div style={{ ...panel(), minWidth: 0 }}><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 20, lineHeight: 1.05, fontWeight: 1150 }}>{value}</div>{detail ? <div style={{ marginTop: 4, color: "#81889a", fontSize: 8 }}>{detail}</div> : null}</div>;
}
function Section({ title, children, accent = ORANGE, subtitle }: any) {
  return <section style={{ ...panel(), marginTop: 11 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 9 }}><div style={{ color: accent, fontSize: 9.5, fontWeight: 1100, textTransform: "uppercase", letterSpacing: .65 }}>{title}</div>{subtitle ? <div style={{ color: SOFT, fontSize: 7.5 }}>{subtitle}</div> : null}</div>{children}</section>;
}
function Bar({ label, value, maxValue, color = ORANGE, detail }: any) {
  const width = maxValue > 0 ? Math.max(0, Math.min(100, n(value) / maxValue * 100)) : 0;
  return <div style={{ display: "grid", gridTemplateColumns: "105px minmax(0,1fr) 52px", gap: 7, alignItems: "center" }}><div style={{ minWidth: 0 }}><div style={{ color: "#c0c5d1", fontSize: 8.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>{detail ? <div style={{ color: "#737a89", fontSize: 7 }}>{detail}</div> : null}</div><div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ height: "100%", width: `${width}%`, borderRadius: 999, background: `linear-gradient(90deg,${color}88,${color})`, boxShadow: `0 0 8px ${color}44` }} /></div><div style={{ textAlign: "right", color, fontSize: 9, fontWeight: 1050 }}>{value}</div></div>;
}
function Donut({ items, center, label }: any) {
  const total = Math.max(1, items.reduce((sum: number, item: any) => sum + n(item.value), 0));
  let cursor = 0;
  const stops = items.map((item: any) => { const start = cursor; cursor += n(item.value) / total * 100; return `${item.color} ${start}% ${cursor}%`; }).join(",");
  return <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: 12, alignItems: "center" }}><div style={{ width: 112, height: 112, borderRadius: "50%", background: `conic-gradient(${stops || `${SOFT} 0 100%`})`, position: "relative", display: "grid", placeItems: "center", boxShadow: "inset 0 0 20px rgba(0,0,0,.35)" }}><div style={{ width: 72, height: 72, borderRadius: "50%", background: "#0c0e12", display: "grid", placeItems: "center", textAlign: "center", border: "1px solid rgba(255,255,255,.08)" }}><div><div style={{ color: "#fff", fontSize: 20, fontWeight: 1150 }}>{center}</div><div style={{ color: SOFT, fontSize: 7 }}>{label}</div></div></div></div><div style={{ display: "grid", gap: 6 }}>{items.map((item: any) => <div key={item.label} style={{ display: "grid", gridTemplateColumns: "9px minmax(0,1fr) auto", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: item.color }} /><span style={{ color: "#c5cad5", fontSize: 8.5 }}>{item.label}</span><strong style={{ color: item.color, fontSize: 9 }}>{item.value}</strong></div>)}</div></div>;
}
function Trend({ items, parcel }: any) {
  const top = Math.max(1, ...items.map((item: any) => n(item.score)));
  return <div style={{ height: 116, display: "flex", alignItems: "flex-end", gap: 4, padding: "9px 7px 4px", borderRadius: 14, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>{items.map((item: any, index: number) => { const height = Math.max(5, n(item.score) / top * 88); const color = item.won ? GOLD : parcel ? BLUE : ORANGE; return <div key={`${item.date}-${index}`} title={`${item.date} · ${item.score} ${parcel ? "colis" : "kg"} · ${item.accuracy}%`} style={{ flex: 1, minWidth: 5, maxWidth: 32, height, borderRadius: "5px 5px 2px 2px", background: `linear-gradient(180deg,${color},${color}66)`, boxShadow: item.won ? `0 0 10px ${GOLD}55` : "none", position: "relative" }}><span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 3, color: "rgba(0,0,0,.72)", fontSize: 6.5, fontWeight: 1100 }}>{item.rank ? `#${item.rank}` : ""}</span></div>; })}</div>;
}

export default function CargoStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState("all");
  const now = Date.now();
  const rangeMs: Record<string, number> = { day: 86400000, week: 7 * 86400000, month: 31 * 86400000, year: 366 * 86400000 };
  const matches = (records || [])
    .filter(isCargo)
    .map((record: any) => ({ record, row: findRow(record, playerId, playerName) }))
    .filter((item: any) => item.row)
    .filter((item: any) => range === "all" || playedAt(item.record) >= now - rangeMs[range])
    .sort((a: any, b: any) => playedAt(b.record) - playedAt(a.record));
  const rows = matches.map((item: any) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
  const podiums = rows.filter((row: any) => n(row?.rank) > 0 && n(row?.rank) <= 3).length;
  const avgRank = mean(rows.map((row: any) => n(row?.rank)).filter((value) => value > 0));
  const darts = sum(rows, "darts", "dartsThrown");
  const hits = sum(rows, "hits");
  const visits = sum(rows, "visits");
  const singles = sum(rows, "singles");
  const doubles = sum(rows, "doubles");
  const triples = sum(rows, "triples");
  const bulls = sum(rows, "bulls");
  const dbulls = sum(rows, "dbulls");
  const misses = sum(rows, "misses");
  const weight = sum(rows, "totalWeight");
  const pallets = sum(rows, "pallets");
  const cartons = sum(rows, "cartons");
  const crates = sum(rows, "crates");
  const fullPallets = sum(rows, "fullPallets");
  const contracts = sum(rows, "completedContracts");
  const failed = sum(rows, "failedContracts");
  const parcels = sum(rows, "parcelsDelivered");
  const deliveries = sum(rows, "parcelDeliveries");
  const bonuses = sum(rows, "parcelBonuses");
  const lost = sum(rows, "lostWeight");
  const rejected = sum(rows, "rejectedWeight");
  const overloads = sum(rows, "overloads");
  const perfectLoads = sum(rows, "perfectLoads");
  const fragileCompleted = sum(rows, "fragileCompleted");
  const fragileBroken = sum(rows, "fragileBroken");
  const urgentCompleted = sum(rows, "urgentCompleted");
  const longest = max(rows, "longestSeries");
  const bestPallet = max(rows, "bestPalletWeight");
  const teamGames = matches.filter(({ record }: any) => participantMode(record) === "teams").length;
  const parcelGames = matches.filter(({ record }: any) => variantOf(record) === "parcel_delivery").length;
  const cargoGames = games - parcelGames;

  const seriesMap: Record<string, number> = {};
  const parcelSeriesMap: Record<string, number> = {};
  const numberMap: Record<string, number> = {};
  const bedMap: Record<string, number> = {};
  const segmentMap: Record<string, number> = {};
  rows.forEach((row: any) => {
    addMap(seriesMap, row?.seriesCompleted);
    addMap(parcelSeriesMap, row?.parcelSeries);
    addMap(numberMap, row?.weightByNumber);
    addMap(bedMap, row?.weightByBed);
    addMap(segmentMap, row?.hitsBySegment);
  });
  const topNumbers = Object.entries(numberMap).sort((a: any, b: any) => n(b[1]) - n(a[1])).slice(0, 10);
  const topSegments = Object.entries(segmentMap).filter(([key]) => key !== "MISS").sort((a: any, b: any) => n(b[1]) - n(a[1])).slice(0, 10);
  const maxNumber = Math.max(1, ...topNumbers.map((item: any) => n(item[1])));
  const maxSegment = Math.max(1, ...topSegments.map((item: any) => n(item[1])));
  const maxSeries = Math.max(1, ...Object.values(seriesMap).map(n), ...Object.values(parcelSeriesMap).map(n));

  const variantRows = Object.keys(matches.reduce((map: any, { record }: any) => { const key = variantOf(record); map[key] = true; return map; }, {})).map((variant) => {
    const subset = matches.filter(({ record }: any) => variantOf(record) === variant);
    const subsetRows = subset.map((item: any) => item.row);
    const variantWins = subset.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
    const parcel = variant === "parcel_delivery";
    const score = parcel ? sum(subsetRows, "parcelsDelivered") : sum(subsetRows, "totalWeight");
    return { variant, games: subset.length, wins: variantWins, winRate: ratio(variantWins, subset.length), accuracy: ratio(sum(subsetRows, "hits"), sum(subsetRows, "darts", "dartsThrown")), score, avgScore: subset.length ? score / subset.length : 0 };
  }).sort((a: any, b: any) => b.games - a.games);

  const trend = [...matches].reverse().slice(-16).map(({ record, row }: any) => ({ date: playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—", score: variantOf(record) === "parcel_delivery" ? n(row?.parcelsDelivered) : n(row?.totalWeight), accuracy: Math.round(ratio(n(row?.hits), n(row?.darts)) * 1000) / 10, rank: n(row?.rank), won: didWin(record, row, String(playerId)), parcel: variantOf(record) === "parcel_delivery" }));
  const mostlyParcel = parcelGames > cargoGames;
  const attempts = contracts + failed;

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques CARGO.</div>;
  return <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", padding: 4, boxSizing: "border-box" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div><div style={{ color: ORANGE, fontWeight: 1100, letterSpacing: 1, textTransform: "uppercase" }}>CARGO — Centre de performances</div><div style={{ marginTop: 4, color: SOFT, fontSize: 10 }}>Transport, contrats, séries, précision, sécurité et progression par variante.</div></div>
      <div style={{ display: "flex", gap: 5 }}>{[["all", "TOUT"], ["day", "24 H"], ["week", "7 J"], ["month", "30 J"], ["year", "1 AN"]].map(([key, label]) => <button key={key} onClick={() => setRange(key)} style={{ minHeight: 30, padding: "0 9px", borderRadius: 999, border: `1px solid ${range === key ? ORANGE : "rgba(255,255,255,.10)"}`, background: range === key ? `${ORANGE}18` : "rgba(255,255,255,.035)", color: range === key ? ORANGE : SOFT, fontWeight: 1000, fontSize: 8 }}>{label}</button>)}</div>
    </div>

    {!games ? <div style={{ marginTop: 14, padding: 18, borderRadius: 17, textAlign: "center", color: SOFT, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>Aucune partie CARGO terminée sur cette période.</div> : <>
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 7 }}>
        <Kpi label="Parties" value={games} detail={`${games - teamGames} joueurs · ${teamGames} équipes`} />
        <Kpi label="Victoires" value={wins} detail={`${pct(ratio(wins, games))} win rate`} color={GREEN} />
        <Kpi label="Podiums" value={podiums} detail={avgRank ? `rang moyen ${avgRank.toFixed(2)}` : "—"} color={GOLD} />
        <Kpi label="Précision" value={pct(ratio(hits, darts))} detail={`${hits}/${darts} fléchettes`} color={GREEN} />
        <Kpi label="Poids transporté" value={`${weight} kg`} detail={`${darts ? (weight / darts).toFixed(2) : "0.00"} kg/dart`} color={ORANGE} />
        <Kpi label="Colis livrés" value={parcels} detail={`${deliveries} livraisons · +${bonuses}`} color={BLUE} />
        <Kpi label="Palettes" value={pallets} detail={`${cartons} cartons · ${crates} caisses`} color={GOLD} />
        <Kpi label="Meilleure série" value={longest} detail={`${fullPallets} séries complètes`} color={PURPLE} />
      </div>

      <Section title="Évolution des missions" subtitle="score final des 16 dernières parties"><Trend items={trend} parcel={mostlyParcel} /></Section>

      <Section title="Qualité logistique" accent={GREEN}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 7 }}>
          <Kpi label="Contrats réussis" value={contracts} detail={attempts ? `${pct(ratio(contracts, attempts))} de réussite` : "Aucun contrat"} color={GREEN} />
          <Kpi label="Contrats échoués" value={failed} color={RED} />
          <Kpi label="Meilleure palette" value={`${bestPallet} kg`} color={GOLD} />
          <Kpi label="Poids / volée" value={`${visits ? (weight / visits).toFixed(1) : "0.0"} kg`} detail={`${visits} volées`} color={ORANGE} />
          <Kpi label="Poids perdu" value={`${lost} kg`} color={RED} />
          <Kpi label="Poids refusé" value={`${rejected} kg`} color={RED} />
          <Kpi label="Surcharges" value={overloads} color={RED} />
          <Kpi label="Charges parfaites" value={perfectLoads} color={GOLD} />
        </div>
      </Section>

      <Section title="Répartition des impacts"><Donut center={darts} label="DARTS" items={[{ label: "Singles", value: singles, color: ORANGE }, { label: "Doubles", value: doubles, color: BLUE }, { label: "Triples", value: triples, color: PURPLE }, { label: "Bull / DBull", value: bulls + dbulls, color: GOLD }, { label: "Miss", value: misses, color: RED }]} /></Section>

      <Section title="Paliers de séries" accent={PURPLE}>
        <div style={{ display: "grid", gap: 7 }}>{[1, 2, 3, 4, 5].map((count) => { const value = n(seriesMap[String(count)]) + n(parcelSeriesMap[String(count)]); return <Bar key={count} label={`${count} touche${count > 1 ? "s" : ""}`} value={value} maxValue={maxSeries} detail={count === 5 ? "palier maximal" : undefined} color={count >= 5 ? GOLD : count >= 4 ? ORANGE : count >= 3 ? PURPLE : GREEN} />; })}</div>
      </Section>

      {topNumbers.length ? <Section title="Numéros les plus rentables" accent={ORANGE} subtitle="poids produit par numéro"><div style={{ display: "grid", gap: 7 }}>{topNumbers.map(([label, value]: any) => <Bar key={label} label={`Numéro ${label}`} value={n(value)} maxValue={maxNumber} detail="kg transportés" color={ORANGE} />)}</div></Section> : null}

      {topSegments.length ? <Section title="Segments les plus touchés" accent={BLUE}><div style={{ display: "grid", gap: 7 }}>{topSegments.map(([label, value]: any) => <Bar key={label} label={label} value={n(value)} maxValue={maxSegment} color={label.startsWith("T") ? PURPLE : label.startsWith("D") ? BLUE : label.includes("BULL") ? GOLD : ORANGE} />)}</div></Section> : null}

      <Section title="Contrats spéciaux & risques" accent={RED}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 7 }}>
          <Kpi label="Fragiles réussis" value={fragileCompleted} color={GREEN} />
          <Kpi label="Fragiles cassés" value={fragileBroken} color={RED} />
          <Kpi label="Urgents livrés" value={urgentCompleted} color={GOLD} />
          <Kpi label="Sécurité" value={pct(ratio(Math.max(0, weight - lost - rejected), Math.max(1, weight)))} detail="charge conservée" color={BLUE} />
        </div>
      </Section>

      {variantRows.length ? <Section title="Comparatif des variantes" accent={BLUE}><div style={{ display: "grid", gap: 7 }}>{variantRows.map((item: any) => { const parcel = item.variant === "parcel_delivery"; return <div key={item.variant} style={{ padding: 9, borderRadius: 13, background: `${parcel ? BLUE : ORANGE}09`, border: `1px solid ${parcel ? BLUE : ORANGE}32`, display: "grid", gridTemplateColumns: "minmax(100px,1.5fr) repeat(4,minmax(0,1fr))", gap: 6, alignItems: "center", textAlign: "center" }}><div style={{ color: parcel ? BLUE : ORANGE, fontWeight: 1100, fontSize: 8.5, textAlign: "left" }}>{cargoVariantLabel(item.variant)}</div><div><b>{item.games}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>parties</small></div><div><b>{pct(item.winRate)}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>win</small></div><div><b>{pct(item.accuracy)}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>préc.</small></div><div><b>{Math.round(item.avgScore)}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>{parcel ? "colis/match" : "kg/match"}</small></div></div>; })}</div></Section> : null}

      <Section title="Parties récentes"><div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 12).map(({ record, row }: any, index: number) => { const won = didWin(record, row, String(playerId)); const variant = variantOf(record); const parcel = variant === "parcel_delivery"; const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—"; return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, border: `1px solid ${won ? ORANGE + "66" : "rgba(255,255,255,.08)"}`, background: won ? `${ORANGE}0c` : "rgba(255,255,255,.025)" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: won ? ORANGE : "rgba(255,255,255,.06)", color: won ? "#111" : "#d1d5df", fontSize: 9, fontWeight: 1100 }}>{won ? "WIN" : `#${n(row?.rank) || "—"}`}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 10 }}>{date} · {cargoVariantLabel(variant)} · {participantMode(record) === "teams" ? "ÉQUIPES" : "JOUEURS"}</div><div style={{ color: SOFT, fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.completedContracts)} contrats · {n(row?.pallets)} palettes · série {n(row?.longestSeries)} · {pct(ratio(n(row?.hits), n(row?.darts)))}</div></div><div style={{ textAlign: "right" }}><div style={{ color: parcel ? BLUE : ORANGE, fontSize: 18, fontWeight: 1100 }}>{parcel ? n(row?.parcelsDelivered) : n(row?.totalWeight)}</div><div style={{ color: SOFT, fontSize: 7 }}>{parcel ? "colis" : "kg"}</div></div></div>; })}</div></Section>
    </>}
  </div>;
}
