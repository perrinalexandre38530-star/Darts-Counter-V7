// @ts-nocheck
import React from "react";

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#9aa1b2";
const PINK = "#ff63b8";

const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const txt = (value: any) => String(value ?? "").trim();
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%";
const playedAt = (record: any) => n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt);

function isPoker(record: any) {
  const blob = [record?.kind, record?.mode, record?.gameId, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.stats?.mode].map((value) => txt(value).toLowerCase()).join("|");
  return blob.includes("darts_poker") || blob.includes("darts poker") || blob.includes("dartspoker");
}
function playerPools(record: any) {
  return [record?.summary?.perPlayer, record?.payload?.summary?.perPlayer, record?.payload?.stats?.players, record?.summary?.rankings, record?.payload?.players, record?.summary?.players, record?.players].filter(Array.isArray);
}
function rowId(row: any) { return txt(row?.id || row?.playerId || row?.profileId); }
function rowName(row: any) { return txt(row?.name || row?.playerName || row?.displayName); }
function findRow(record: any, playerId: string, playerName?: string | null) {
  const matches: any[] = [];
  for (const pool of playerPools(record)) {
    const byId = pool.find((row: any) => rowId(row) === txt(playerId));
    if (byId) matches.push(byId);
    if (playerName) {
      const byName = pool.find((row: any) => rowName(row).toLowerCase() === txt(playerName).toLowerCase());
      if (byName && !matches.includes(byName)) matches.push(byName);
    }
  }
  return matches.reduce((acc, row) => ({ ...acc, ...row }), null);
}
function winnerIds(record: any) {
  const values = [record?.winnerIds, record?.summary?.winnerIds, record?.payload?.winnerIds, record?.payload?.summary?.winnerIds, record?.winnerId, record?.summary?.winnerId];
  return values.flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : []).map(String);
}
function didWin(record: any, row: any, playerId: string) { return row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)); }
function Kpi({ label, value, detail, color = GOLD }: any) { return <div style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 10, minWidth: 0 }}><div style={{ color: SOFT, fontSize: 8.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 20, fontWeight: 1100, lineHeight: 1.05 }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "#81889a", fontSize: 8.5 }}>{detail}</div> : null}</div>; }
function Section({ title, children, accent = GOLD }: any) { return <section style={{ marginTop: 11, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", padding: 11 }}><div style={{ color: accent, fontSize: 9.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .65, marginBottom: 8 }}>{title}</div>{children}</section>; }
function Bar({ label, value, max, color = GOLD }: any) { const width = max > 0 ? Math.max(0, Math.min(100, n(value) / max * 100)) : 0; return <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) 38px", gap: 7, alignItems: "center" }}><div style={{ color: "#c0c5d1", fontSize: 8.8, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ height: "100%", width: `${width}%`, background: `linear-gradient(90deg,${color}99,${color})`, boxShadow: `0 0 8px ${color}55` }} /></div><div style={{ textAlign: "right", color, fontSize: 9, fontWeight: 1000 }}>{value}</div></div>; }

export default function DartsPokerStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState("all");
  const now = Date.now();
  const ranges: Record<string, number> = { day: 86400000, week: 7 * 86400000, month: 31 * 86400000, year: 366 * 86400000 };
  const matches = (records || []).filter(isPoker).map((record: any) => ({ record, row: findRow(record, playerId, playerName) })).filter((item: any) => item.row).filter((item: any) => range === "all" || playedAt(item.record) >= now - ranges[range]).sort((a: any, b: any) => playedAt(b.record) - playedAt(a.record));

  const rows = matches.map((item: any) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
  const darts = rows.reduce((sum: number, row: any) => sum + n(row?.darts ?? row?.dartsThrown), 0);
  const hits = rows.reduce((sum: number, row: any) => sum + n(row?.hits), 0);
  const handsPlayed = rows.reduce((sum: number, row: any) => sum + n(row?.handsPlayed), 0);
  const handsWon = rows.reduce((sum: number, row: any) => sum + n(row?.handsWon), 0);
  const points = rows.reduce((sum: number, row: any) => sum + n(row?.roundPoints ?? row?.handsWon), 0);
  const contracts = rows.reduce((sum: number, row: any) => sum + n(row?.contractHits), 0);
  const contractBonus = rows.reduce((sum: number, row: any) => sum + n(row?.contractBonusPoints), 0);
  const choices = rows.reduce((sum: number, row: any) => sum + n(row?.choicesUsed), 0);
  const exchanges = rows.reduce((sum: number, row: any) => sum + n(row?.exchangesUsed), 0);
  const jokers = rows.reduce((sum: number, row: any) => sum + n(row?.jokers), 0);
  const cards = rows.reduce((sum: number, row: any) => sum + n(row?.cardsCollected), 0);
  const bestRow = rows.slice().sort((a: any, b: any) => n(b?.bestHandScore) - n(a?.bestHandScore))[0] || null;
  const categories = [
    ["Carte haute", rows.reduce((s: number, r: any) => s + n(r?.highCardHands), 0), "#aeb2c3"],
    ["Paire", rows.reduce((s: number, r: any) => s + n(r?.pairs), 0), BLUE],
    ["Double paire", rows.reduce((s: number, r: any) => s + n(r?.twoPairs), 0), GREEN],
    ["Brelan", rows.reduce((s: number, r: any) => s + n(r?.threeOfAKinds), 0), GOLD],
    ["Suite", rows.reduce((s: number, r: any) => s + n(r?.straights), 0), "#a78bfa"],
    ["Couleur", rows.reduce((s: number, r: any) => s + n(r?.flushes), 0), PINK],
    ["Full", rows.reduce((s: number, r: any) => s + n(r?.fullHouses), 0), RED],
    ["Carré", rows.reduce((s: number, r: any) => s + n(r?.fourOfAKinds), 0), "#ff9b52"],
    ["Quinte flush", rows.reduce((s: number, r: any) => s + n(r?.straightFlushes), 0), "#fff"],
    ["Royale", rows.reduce((s: number, r: any) => s + n(r?.royalFlushes), 0), GOLD],
  ];
  const categoryMax = Math.max(1, ...categories.map((item) => n(item[1])));
  const rankMap: Record<string, number> = {};
  const suitMap: Record<string, number> = {};
  rows.forEach((row: any) => { Object.entries(row?.cardsByRank || {}).forEach(([key, value]) => { rankMap[key] = (rankMap[key] || 0) + n(value); }); Object.entries(row?.cardsBySuit || {}).forEach(([key, value]) => { suitMap[key] = (suitMap[key] || 0) + n(value); }); });

  return <div style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[["all","Tout"],["day","24 h"],["week","7 j"],["month","30 j"],["year","1 an"]].map(([key,label]) => <button key={key} onClick={() => setRange(key)} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${range === key ? GOLD : "rgba(255,255,255,.10)"}`, background: range === key ? `${GOLD}18` : "rgba(255,255,255,.03)", color: range === key ? GOLD : SOFT, fontWeight: 1000, fontSize: 9 }}>{label}</button>)}</div>

    {!games ? <div style={{ marginTop: 16, borderRadius: 18, padding: 18, textAlign: "center", color: SOFT, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>Aucune partie DARTS POKER exploitable pour ce joueur.</div> : <>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Parties" value={games} color={GOLD} />
        <Kpi label="Victoires" value={wins} detail={pct(wins, games)} color={GREEN} />
        <Kpi label="Points Poker" value={points} detail={`${handsWon} victoire${handsWon > 1 ? "s" : ""}`} color={GOLD} />
        <Kpi label="Contrats réussis" value={contracts} detail={`+${contractBonus} points bonus`} color={RED} />
        <Kpi label="Mains gagnées" value={handsWon} detail={`${handsPlayed} jouées`} color={GREEN} />
        <Kpi label="Précision" value={pct(hits, darts)} detail={`${hits}/${darts} fléchettes`} color={BLUE} />
        <Kpi label="Cartes gagnées" value={cards} color={GOLD} />
        <Kpi label="Choix utilisés" value={choices} color={PINK} />
        <Kpi label="Échanges" value={exchanges} color={BLUE} />
        <Kpi label="Jokers" value={jokers} color={RED} />
      </div>

      <Section title="Meilleure main" accent={GOLD}><div style={{ padding: 13, borderRadius: 15, textAlign: "center", background: `linear-gradient(135deg,${RED}16,${GOLD}10)`, border: `1px solid ${GOLD}44` }}><div style={{ color: GOLD, fontSize: 22, fontWeight: 1200 }}>{bestRow?.bestHandLabel || "—"}</div><div style={{ color: SOFT, fontSize: 9, marginTop: 4 }}>{handsPlayed} mains analysées · {pct(handsWon, handsPlayed)} de mains remportées</div></div></Section>

      <Section title="Répartition des combinaisons" accent={RED}><div style={{ display: "grid", gap: 7 }}>{categories.map(([label,value,color]: any) => <Bar key={label} label={label} value={value} max={categoryMax} color={color} />)}</div></Section>

      <Section title="Cartes collectées" accent={BLUE}><div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(150px,1fr)", gap: 12 }}><div><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginBottom: 6 }}>PAR RANG</div><div style={{ display: "grid", gridTemplateColumns: "repeat(13,minmax(0,1fr))", gap: 4 }}>{["2","3","4","5","6","7","8","9","10","J","Q","K","A"].map((rank) => <div key={rank} style={{ padding: "7px 2px", borderRadius: 9, textAlign: "center", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: GOLD, fontWeight: 1100, fontSize: 10 }}>{rank}</div><div style={{ color: "#fff", fontSize: 9 }}>{rankMap[rank] || 0}</div></div>)}</div></div><div><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginBottom: 6 }}>PAR COULEUR</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>{["♠","♥","♦","♣"].map((suit) => <div key={suit} style={{ padding: 9, borderRadius: 10, textAlign: "center", color: suit === "♥" || suit === "♦" ? RED : "#fff", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 18 }}>{suit}</div><b>{suitMap[suit] || 0}</b></div>)}</div></div></div></Section>

      <Section title="Parties récentes"><div style={{ display: "grid", gap: 7 }}>{matches.slice(0, 12).map(({ record, row }: any, index: number) => { const won = didWin(record, row, String(playerId)); const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—"; return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, border: `1px solid ${won ? GOLD + "66" : "rgba(255,255,255,.08)"}`, background: won ? `${GOLD}0c` : "rgba(255,255,255,.025)" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: won ? GOLD : "rgba(255,255,255,.06)", color: won ? "#111" : "#d1d5df", fontSize: 9, fontWeight: 1100 }}>{won ? "WIN" : `#${n(row?.rank) || "—"}`}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 10 }}>{date} · {n(record?.summary?.configuredRounds || record?.payload?.config?.rounds)} manches</div><div style={{ color: SOFT, fontSize: 8.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.handsWon)} mains · {n(row?.contractHits)} contrats · {row?.bestHandLabel || "—"}</div></div><div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontSize: 18, fontWeight: 1100 }}>{n(row?.roundPoints ?? row?.handsWon)}</div><div style={{ color: "#7e8597", fontSize: 7.5 }}>points</div></div></div>; })}</div></Section>
    </>}
  </div>;
}
