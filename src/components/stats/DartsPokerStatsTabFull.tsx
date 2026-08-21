// @ts-nocheck
import React from "react";
import { deriveDartsPokerPlayerMetrics, pokerNum as n, pokerRound1, resolveDartsPokerRounds, resolveDartsPokerStateStats, resolveDartsPokerVisits } from "../../lib/dartsPokerAnalytics";

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#9aa1b2";
const PINK = "#ff63b8";
const ORANGE = "#ff9b52";

const txt = (value: any) => String(value ?? "").trim();
const pct = (a: number, b?: number) => b === undefined ? `${pokerRound1(n(a))}%` : b > 0 ? `${pokerRound1((n(a) / n(b)) * 100)}%` : "0%";
const playedAt = (record: any) => n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt);
const fmt = (value: any, digits = 1) => { const valueNum = n(value); return Number.isInteger(valueNum) ? String(valueNum) : valueNum.toFixed(digits); };

function isPoker(record: any) {
  const blob = [record?.kind, record?.mode, record?.gameId, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.stats?.mode].map((value) => txt(value).toLowerCase()).join("|");
  return blob.includes("darts_poker") || blob.includes("darts poker") || blob.includes("dartspoker");
}
function playerPools(record: any) { return [record?.summary?.perPlayer, record?.payload?.summary?.perPlayer, record?.payload?.stats?.players, record?.summary?.rankings, record?.payload?.players, record?.summary?.players, record?.players].filter(Array.isArray); }
function rowId(row: any) { return txt(row?.id || row?.playerId || row?.profileId); }
function rowName(row: any) { return txt(row?.name || row?.playerName || row?.displayName); }
function findRow(record: any, playerId: string, playerName?: string | null) {
  const matches: any[] = [];
  for (const pool of playerPools(record)) {
    const byId = pool.find((row: any) => rowId(row) === txt(playerId));
    if (byId) matches.push(byId);
    if (playerName) { const byName = pool.find((row: any) => rowName(row).toLowerCase() === txt(playerName).toLowerCase()); if (byName && !matches.includes(byName)) matches.push(byName); }
  }
  const snapshotStats = resolveDartsPokerStateStats(record, String(playerId));
  if (snapshotStats && Object.keys(snapshotStats).length) matches.unshift(snapshotStats);
  return matches.reduce((acc, row) => ({ ...(acc || {}), ...row }), null);
}
function winnerIds(record: any) { const values = [record?.winnerIds, record?.summary?.winnerIds, record?.payload?.winnerIds, record?.payload?.summary?.winnerIds, record?.winnerId, record?.summary?.winnerId]; return values.flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : []).map(String); }
function didWin(record: any, row: any, playerId: string) { return row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)); }
function Kpi({ label, value, detail, color = GOLD }: any) { return <div style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 10, minWidth: 0 }}><div style={{ color: SOFT, fontSize: 8.2, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 19, fontWeight: 1100, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "#81889a", fontSize: 8.1 }}>{detail}</div> : null}</div>; }
function Section({ title, children, accent = GOLD, subtitle }: any) { return <section style={{ marginTop: 11, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", padding: 11 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 8 }}><div style={{ color: accent, fontSize: 9.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .65 }}>{title}</div>{subtitle ? <div style={{ color: "#72798b", fontSize: 8 }}>{subtitle}</div> : null}</div>{children}</section>; }
function Bar({ label, value, max, color = GOLD }: any) { const width = max > 0 ? Math.max(0, Math.min(100, n(value) / max * 100)) : 0; return <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) 44px", gap: 7, alignItems: "center" }}><div style={{ color: "#c0c5d1", fontSize: 8.8, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ height: "100%", width: `${width}%`, background: `linear-gradient(90deg,${color}99,${color})`, boxShadow: `0 0 8px ${color}55` }} /></div><div style={{ textAlign: "right", color, fontSize: 9, fontWeight: 1000 }}>{value}</div></div>; }
function addMap(target: Record<string, number>, source: any) { Object.entries(source || {}).forEach(([key, value]) => { target[key] = (target[key] || 0) + n(value); }); }
function topMap(map: Record<string, number>) { return Object.entries(map).sort((a,b) => b[1] - a[1])[0] || ["—",0]; }

export default function DartsPokerStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState("all");
  const now = Date.now();
  const ranges: Record<string, number> = { day: 86400000, week: 7 * 86400000, month: 31 * 86400000, year: 366 * 86400000 };
  const matches = (records || []).filter(isPoker).map((record: any) => {
    const row = findRow(record, playerId, playerName);
    if (!row) return null;
    const rounds = resolveDartsPokerRounds(record);
    const visits = resolveDartsPokerVisits(record);
    const contractsEnabled = record?.payload?.config?.contractsEnabled ?? record?.summary?.contractsEnabled ?? true;
    const metrics = deriveDartsPokerPlayerMetrics({ playerId: String(playerId), stats: row, rounds, visits, contractsEnabled });
    return { record, row: { ...row, ...metrics }, rounds, visits };
  }).filter(Boolean).filter((item: any) => range === "all" || playedAt(item.record) >= now - ranges[range]).sort((a: any, b: any) => playedAt(b.record) - playedAt(a.record));

  const rows = matches.map((item: any) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
  const sum = (key: string) => rows.reduce((total: number, row: any) => total + n(row?.[key]), 0);
  const max = (key: string) => rows.reduce((best: number, row: any) => Math.max(best, n(row?.[key])), 0);
  const darts = sum("darts"), hits = sum("hits"), misses = sum("misses");
  const handsPlayed = sum("handsPlayed"), handsWon = sum("handsWon"), handsTied = sum("handsTied");
  const points = sum("points"), contracts = sum("contractHits"), contractAttempts = sum("contractsAttempted"), contractBonus = sum("contractBonusPoints");
  const choices = sum("choicesUsed"), choicesEarned = sum("choicesEarned"), exchanges = sum("exchangesUsed"), exchangesEarned = sum("exchangesEarned");
  const powersUsed = choices + exchanges, powersEarned = choicesEarned + exchangesEarned;
  const cards = sum("cardsCollected"), marketCards = sum("marketCards"), autoDraws = sum("autoDraws"), powerCards = sum("powerCards"), jokers = sum("jokers");
  const singles = sum("singles"), doubles = sum("doubles"), triples = sum("triples"), bulls = sum("bulls"), dbulls = sum("dbulls");
  const strongHands = sum("strongHands"), premiumHands = sum("premiumHands"), podiums = sum("podiums");
  const rankMap: Record<string, number> = {}, suitMap: Record<string, number> = {}, segmentMap: Record<string, number> = {};
  rows.forEach((row: any) => { addMap(rankMap, row?.cardsByRank); addMap(suitMap, row?.cardsBySuit); addMap(segmentMap, row?.hitsBySegment); });
  const [favoriteSegment, favoriteSegmentHits] = topMap(Object.fromEntries(Object.entries(segmentMap).filter(([key]) => key.toUpperCase() !== "MISS")));
  const [favoriteRank, favoriteRankCount] = topMap(rankMap);
  const [favoriteSuit, favoriteSuitCount] = topMap(suitMap);
  const bestRow = rows.slice().sort((a: any, b: any) => n(b?.bestHandScore) - n(a?.bestHandScore))[0] || null;
  const categories = [
    ["Carte haute", sum("highCardHands"), "#aeb2c3"],["Paire", sum("pairs"), BLUE],["Double paire", sum("twoPairs"), GREEN],["Brelan", sum("threeOfAKinds"), GOLD],["Suite", sum("straights"), "#a78bfa"],["Couleur", sum("flushes"), PINK],["Full", sum("fullHouses"), RED],["Carré", sum("fourOfAKinds"), ORANGE],["Quinte flush", sum("straightFlushes"), "#fff"],["Royale", sum("royalFlushes"), GOLD],
  ];
  const categoryMax = Math.max(1, ...categories.map((item) => n(item[1])));
  const recordsRows = [
    ["Meilleur score de partie", matches.slice().sort((a:any,b:any)=>n(b.row.points)-n(a.row.points))[0], (m:any)=>`${fmt(m?.row?.points)} pts`, GOLD],
    ["Meilleure précision", matches.slice().sort((a:any,b:any)=>n(b.row.accuracy)-n(a.row.accuracy))[0], (m:any)=>pct(m?.row?.accuracy), GREEN],
    ["Plus de contrats", matches.slice().sort((a:any,b:any)=>n(b.row.contractHits)-n(a.row.contractHits))[0], (m:any)=>`${fmt(m?.row?.contractHits)} réussis`, RED],
    ["Meilleure série de hits", matches.slice().sort((a:any,b:any)=>n(b.row.bestHitStreak)-n(a.row.bestHitStreak))[0], (m:any)=>`${fmt(m?.row?.bestHitStreak)} hits`, ORANGE],
    ["Meilleure main", matches.slice().sort((a:any,b:any)=>n(b.row.bestHandScore)-n(a.row.bestHandScore))[0], (m:any)=>m?.row?.bestHandLabel || "—", GOLD],
    ["Plus de jokers", matches.slice().sort((a:any,b:any)=>n(b.row.jokers)-n(a.row.jokers))[0], (m:any)=>`${fmt(m?.row?.jokers)} joker(s)`, PINK],
  ];

  return <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[["all","Tout"],["day","24 h"],["week","7 j"],["month","30 j"],["year","1 an"]].map(([key,label]) => <button key={key} onClick={() => setRange(key)} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${range === key ? GOLD : "rgba(255,255,255,.10)"}`, background: range === key ? `${GOLD}18` : "rgba(255,255,255,.03)", color: range === key ? GOLD : SOFT, fontWeight: 1000, fontSize: 9 }}>{label}</button>)}</div>

    {!games ? <div style={{ marginTop: 16, borderRadius: 18, padding: 18, textAlign: "center", color: SOFT, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>Aucune partie DARTS POKER exploitable pour ce joueur.</div> : <>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Parties" value={games} color={GOLD} /><Kpi label="Victoires" value={wins} detail={pct(wins, games)} color={GREEN} /><Kpi label="Points Poker" value={points} detail={`${pokerRound1(points/games)} / partie`} color={GOLD} /><Kpi label="Mains gagnées" value={handsWon} detail={`${pct(handsWon,handsPlayed)} · ${handsPlayed} jouées`} color={GREEN} />
        <Kpi label="Précision" value={pct(hits,darts)} detail={`${hits}/${darts} hits`} color={BLUE} /><Kpi label="Contrats" value={`${contracts}/${contractAttempts}`} detail={`${pct(contracts,contractAttempts)} · +${contractBonus} pts`} color={RED} /><Kpi label="Pouvoirs" value={`${powersUsed}/${powersEarned}`} detail={`${pct(powersUsed,powersEarned)} utilisés`} color={PINK} /><Kpi label="Meilleure main" value={bestRow?.bestHandLabel || "—"} color={GOLD} />
        <Kpi label="Cartes collectées" value={cards} detail={`${pokerRound1(cards/games)} / partie`} color={BLUE} /><Kpi label="Podiums de manche" value={podiums} detail={pct(podiums,handsPlayed)} color={GOLD} /><Kpi label="Mains fortes" value={strongHands} detail={`Brelan+ · ${pct(strongHands,handsPlayed)}`} color={ORANGE} /><Kpi label="Mains premium" value={premiumHands} detail={`Couleur+ · ${pct(premiumHands,handsPlayed)}`} color={RED} />
      </div>

      <Section title="Précision & bagues" accent={BLUE} subtitle={`${darts} fléchettes analysées`}><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Singles" value={singles} detail={pct(singles,darts)} color={BLUE} /><Kpi label="Doubles" value={doubles} detail={pct(doubles,darts)} color={GREEN} /><Kpi label="Triples" value={triples} detail={pct(triples,darts)} color={GOLD} /><Kpi label="Bull" value={bulls} detail={pct(bulls,darts)} color={PINK} />
        <Kpi label="Double Bull" value={dbulls} detail={pct(dbulls,darts)} color={RED} /><Kpi label="MISS" value={misses} detail={pct(misses,darts)} color={RED} /><Kpi label="Meilleure série" value={max("bestHitStreak")} detail="hits consécutifs" color={ORANGE} /><Kpi label="Segment favori" value={favoriteSegment || "—"} detail={`${favoriteSegmentHits || 0} hits`} color={GOLD} />
      </div></Section>

      <Section title="Poker & rendement" accent={GOLD}><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Mains jouées" value={handsPlayed} color={GOLD} /><Kpi label="Mains gagnées" value={handsWon} detail={pct(handsWon,handsPlayed)} color={GREEN} /><Kpi label="Égalités" value={handsTied} detail={pct(handsTied,handsPlayed)} color={BLUE} /><Kpi label="Points / main" value={pokerRound1(points/Math.max(1,handsPlayed))} color={GOLD} />
        <Kpi label="Mains fortes" value={strongHands} detail="Brelan ou mieux" color={ORANGE} /><Kpi label="Premium" value={premiumHands} detail="Couleur ou mieux" color={RED} /><Kpi label="Podiums" value={podiums} detail={pct(podiums,handsPlayed)} color={GOLD} /><Kpi label="Série victoires" value={max("bestRoundWinStreak")} detail="manches consécutives" color={GREEN} />
      </div></Section>

      <Section title="Cartes & acquisition" accent={BLUE}><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Marché" value={marketCards} detail={`${pct(marketCards,cards)} des cartes`} color={BLUE} /><Kpi label="Auto-draw" value={autoDraws} detail={pct(autoDraws,cards)} color={SOFT} /><Kpi label="Via pouvoirs" value={powerCards} detail={pct(powerCards,cards)} color={PINK} /><Kpi label="Jokers" value={jokers} color={RED} />
        <Kpi label="Rang favori" value={favoriteRank || "—"} detail={`${favoriteRankCount || 0} cartes`} color={GOLD} /><Kpi label="Couleur favorite" value={favoriteSuit || "—"} detail={`${favoriteSuitCount || 0} cartes`} color={RED} /><Kpi label="Cartes / hit" value={hits ? (cards/hits).toFixed(2) : "0"} color={BLUE} /><Kpi label="Cartes / partie" value={(cards/games).toFixed(1)} color={GOLD} />
      </div></Section>

      <Section title="Pouvoirs & contrats" accent={PINK}><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Choix gagnés" value={choicesEarned} color={PINK} /><Kpi label="Choix utilisés" value={choices} detail={pct(choices,choicesEarned)} color={PINK} /><Kpi label="Échanges gagnés" value={exchangesEarned} color={BLUE} /><Kpi label="Échanges utilisés" value={exchanges} detail={pct(exchanges,exchangesEarned)} color={BLUE} />
        <Kpi label="Contrats tentés" value={contractAttempts} color={RED} /><Kpi label="Contrats réussis" value={contracts} detail={pct(contracts,contractAttempts)} color={GREEN} /><Kpi label="Bonus contrats" value={`+${contractBonus}`} detail="points" color={GOLD} /><Kpi label="Utilisation pouvoirs" value={pct(powersUsed,powersEarned)} detail={`${powersUsed}/${powersEarned}`} color={PINK} />
      </div></Section>

      <Section title="Répartition des combinaisons" accent={RED}><div style={{ display: "grid", gap: 7 }}>{categories.map(([label,value,color]: any) => <Bar key={label} label={label} value={value} max={categoryMax} color={color} />)}</div></Section>

      <Section title="Cartes collectées" accent={BLUE}><div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(150px,1fr)", gap: 12 }}><div><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginBottom: 6 }}>PAR RANG</div><div style={{ display: "grid", gridTemplateColumns: "repeat(13,minmax(0,1fr))", gap: 4 }}>{["2","3","4","5","6","7","8","9","10","J","Q","K","A"].map((rank) => <div key={rank} style={{ padding: "7px 2px", borderRadius: 9, textAlign: "center", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: GOLD, fontWeight: 1100, fontSize: 10 }}>{rank}</div><div style={{ color: "#fff", fontSize: 9 }}>{rankMap[rank] || 0}</div></div>)}</div></div><div><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginBottom: 6 }}>PAR COULEUR</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>{["♠","♥","♦","♣"].map((suit) => <div key={suit} style={{ padding: 9, borderRadius: 10, textAlign: "center", color: suit === "♥" || suit === "♦" ? RED : "#fff", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 18 }}>{suit}</div><b>{suitMap[suit] || 0}</b></div>)}</div></div></div></Section>

      <Section title="Records personnels" accent={ORANGE}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{recordsRows.map(([label,item,value,color]: any) => { const date = item && playedAt(item.record) ? new Date(playedAt(item.record)).toLocaleDateString("fr-FR") : "—"; return <div key={label} style={{ padding: 9, borderRadius: 13, border: `1px solid ${color}35`, background: `${color}08` }}><div style={{ color: SOFT, fontSize: 7.5, textTransform: "uppercase", fontWeight: 1000 }}>{label}</div><div style={{ color, fontSize: 16, fontWeight: 1100, marginTop: 3 }}>{value(item)}</div><div style={{ color: "#707789", fontSize: 7.5, marginTop: 2 }}>{date}</div></div>; })}</div></Section>

      <Section title="Parties récentes" accent={GOLD}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", fontSize: 9 }}><thead><tr style={{ color: GOLD, textAlign: "left" }}>{["Date","Rés.","Pts","Mains","V","Contrats","Préc.","S/D/T","Bull/DB","Miss","Cartes","Pouvoirs","Best","Streak"].map((x)=><th key={x} style={{ padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>{x}</th>)}</tr></thead><tbody>{matches.slice(0,20).map(({record,row}:any,index:number)=>{ const won=didWin(record,row,String(playerId)); const date=playedAt(record)?new Date(playedAt(record)).toLocaleDateString("fr-FR"):"—"; return <tr key={record?.id||index}><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.05)"}}>{date}</td><td style={{padding:7,color:won?GREEN:SOFT,fontWeight:1000}}>{won?"WIN":`#${n(row?.rank)||"—"}`}</td><td style={{padding:7,color:GOLD,fontWeight:1000}}>{fmt(row.points)}</td><td style={{padding:7}}>{fmt(row.handsPlayed)}</td><td style={{padding:7}}>{fmt(row.handsWon)}</td><td style={{padding:7}}>{fmt(row.contractHits)}/{fmt(row.contractsAttempted)}</td><td style={{padding:7,color:BLUE}}>{pct(row.accuracy)}</td><td style={{padding:7}}>{row.singles}/{row.doubles}/{row.triples}</td><td style={{padding:7}}>{row.bulls}/{row.dbulls}</td><td style={{padding:7,color:row.misses?RED:GREEN}}>{row.misses}</td><td style={{padding:7}}>{row.cardsCollected}</td><td style={{padding:7}}>{row.powersUsed}/{row.powersEarned}</td><td style={{padding:7,color:GOLD}}>{row.bestHandLabel||"—"}</td><td style={{padding:7}}>{row.bestHitStreak}</td></tr>;})}</tbody></table></div></Section>
    </>}
  </div>;
}
