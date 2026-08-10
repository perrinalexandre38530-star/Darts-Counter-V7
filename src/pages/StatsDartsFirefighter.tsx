// @ts-nocheck
// =============================================================
// Centre de statistiques — DARTS FIREFIGHTER V3
// Dashboard complet : missions, intervention, fléchettes, carte et brigade.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { loadDartsFirefighterStatsCache, loadDartsFirefighterStatsUnified } from "../lib/dartsFirefighterStats";
import { difficultyLabel, finishReasonLabel } from "../lib/gameEngines/dartsFirefighterEngine";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const GREEN = "#5ce6a8";
const RED = "#ff5264";
const PURPLE = "#b996ff";
const SOFT = "#9098aa";
const WHITE = "#edf2f8";
const CHART_COLORS = [WATER, FIRE, GOLD, GREEN, PURPLE, RED, "#67d7d0", "#ff8e6e"];

type StatsTab = "overview" | "operations" | "darts" | "missions" | "brigade";

function n(value: any) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmt1(value: any) { return n(value).toFixed(1); }
function fmtDuration(ms: number) { const s = Math.max(0, Math.round(n(ms) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function fmtDate(ts: number) { try { return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } }
function fmtShortDate(ts: number) { try { return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); } catch { return "—"; } }
function panel(extra: React.CSSProperties = {}): React.CSSProperties { return { borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.27))", border: "1px solid rgba(255,255,255,.085)", boxShadow: "0 14px 34px rgba(0,0,0,.24)", boxSizing: "border-box", minWidth: 0, ...extra }; }
function mergeCounter(target: Record<string, number>, source: any) { Object.entries(source || {}).forEach(([key, value]) => { target[key] = n(target[key]) + n(value); }); return target; }
function missionLabel(id: any) { const key = String(id || "custom"); return key === "express" ? "Intervention express" : key === "wildfire" ? "Feu de forêt" : key === "civil_protection" ? "Protection civile" : key === "inferno_survival" ? "Survie Inferno" : "Personnalisée"; }
function objectiveLabel(id: any) { return id === "survival" ? "Survie" : id === "protect_critical" ? "Protection" : "Extinction"; }
function statusLabel(id: any) { return id === "fire3" ? "Feu N3" : id === "fire2" ? "Feu N2" : id === "fire1" ? "Feu N1" : id === "smoke" ? "Fumée" : id === "protected" ? "Protégée" : id === "destroyed" ? "Perdue" : "Saine"; }
function statusColor(id: any) { return id === "fire3" ? RED : id === "fire2" ? FIRE : id === "fire1" ? "#ff9a3c" : id === "smoke" ? "#b5bac4" : id === "protected" ? WATER : id === "destroyed" ? "#6f7480" : GREEN; }

const INFO = <div style={{ display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.45 }}>
  <div><strong style={{ color: FIRE }}>GLOBAL</strong><br />Missions, victoires, scores, records, grades, cartes et difficultés.</div>
  <div><strong style={{ color: WATER }}>INTERVENTION</strong><br />Eau, extinction, fumée, protections, propagation, territoires perdus et efficacité tactique.</div>
  <div><strong style={{ color: GREEN }}>FLÉCHETTES</strong><br />S/D/T, Bull, DBull, MISS, segments, volées 1/2/3 fléchettes, cibles exactes et économies.</div>
  <div><strong style={{ color: GOLD }}>BRIGADE</strong><br />Contributions individuelles, précision, score, extinctions, blocages et interventions critiques.</div>
</div>;

export default function StatsDartsFirefighter(props: any) {
  const { theme } = useTheme();
  const embedded = Boolean(props?.embedded);
  const [items, setItems] = React.useState<any[]>(() => loadDartsFirefighterStatsCache());
  const [syncing, setSyncing] = React.useState(false);
  const [range, setRange] = React.useState<"day" | "week" | "month" | "year" | "all">("all");
  const [tab, setTab] = React.useState<StatsTab>("overview");
  const selectedPlayerId = String(props?.playerId || "").trim();
  const selectedPlayerName = String(props?.playerName || "").trim().toLowerCase();

  const refresh = React.useCallback(() => {
    setItems(loadDartsFirefighterStatsCache());
    setSyncing(true);
    void loadDartsFirefighterStatsUnified().then(setItems).finally(() => setSyncing(false));
  }, []);
  React.useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("dc-darts-firefighter-updated", onUpdate);
    window.addEventListener("dc-history-updated", onUpdate);
    return () => {
      window.removeEventListener("dc-darts-firefighter-updated", onUpdate);
      window.removeEventListener("dc-history-updated", onUpdate);
    };
  }, [refresh]);

  const scoped = React.useMemo(() => {
    const now = Date.now();
    let from = 0;
    if (range === "day") { const d = new Date(); d.setHours(0,0,0,0); from = d.getTime(); }
    else if (range === "week") from = now - 7 * 86400000;
    else if (range === "month") { const d = new Date(); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
    else if (range === "year") { const d = new Date(); from = new Date(d.getFullYear(), 0, 1).getTime(); }
    return items.filter((match: any) => {
      if (from && n(match.ts) < from) return false;
      if (!selectedPlayerId && !selectedPlayerName) return true;
      return (match.players || []).some((player: any) => String(player?.id || player?.playerId || player?.profileId || "") === selectedPlayerId || (selectedPlayerName && String(player?.name || "").trim().toLowerCase() === selectedPlayerName));
    });
  }, [items, range, selectedPlayerId, selectedPlayerName]);

  const agg = React.useMemo(() => {
    const total = scoped.length;
    const wins = scoped.filter((m) => m.won).length;
    const score = scoped.reduce((s, m) => s + n(m.score), 0);
    const darts = scoped.reduce((s, m) => s + n(m.totalDarts), 0);
    const hits = scoped.reduce((s, m) => s + n(m.totalHits), 0);
    const visits = scoped.reduce((s, m) => s + n(m.totalVisits), 0);
    const duration = scoped.reduce((s, m) => s + n(m.durationMs), 0);
    const activeTerritories = scoped.reduce((s, m) => s + n(m.activeTerritories), 0);
    const fireReduced = scoped.reduce((s, m) => s + n(m.totalFireReduced), 0);
    const extinguished = scoped.reduce((s, m) => s + n(m.totalExtinguished), 0);
    const destroyed = scoped.reduce((s, m) => s + n(m.totalDestroyed), 0);
    const spread = scoped.reduce((s, m) => s + n(m.totalSpread), 0);
    const blocked = scoped.reduce((s, m) => s + n(m.propagationBlocked), 0);
    const water = scoped.reduce((s, m) => s + n(m.waterApplied), 0);
    const targetAttempts = scoped.reduce((s, m) => s + n(m.exactTargetAttempts), 0);
    const targetHits = scoped.reduce((s, m) => s + n(m.exactTargetHits), 0);
    return {
      total, wins, losses: total - wins, winRate: pct(wins, total), score,
      avgScore: total ? score / total : 0, bestScore: Math.max(0, ...scoped.map((m) => n(m.score))),
      darts, hits, visits, accuracy: pct(hits, darts), scorePerDart: darts ? score / darts : 0, scorePerVisit: visits ? score / visits : 0,
      fireReduced, extinguished, destroyed, spread, blocked,
      protected: scoped.reduce((s, m) => s + n(m.protectionsPlaced), 0),
      smokeCleared: scoped.reduce((s, m) => s + n(m.smokeCleared), 0),
      criticalInterventions: scoped.reduce((s, m) => s + n(m.criticalInterventions), 0),
      water, waterEfficiency: water ? fireReduced / water : 0,
      canadairs: scoped.reduce((s, m) => s + n(m.canadairs), 0),
      singles: scoped.reduce((s, m) => s + n(m.singles), 0), doubles: scoped.reduce((s, m) => s + n(m.doubles), 0), triples: scoped.reduce((s, m) => s + n(m.triples), 0),
      bulls: scoped.reduce((s, m) => s + n(m.bulls), 0), dbulls: scoped.reduce((s, m) => s + n(m.dbulls), 0), misses: scoped.reduce((s, m) => s + n(m.misses), 0),
      uselessDarts: scoped.reduce((s, m) => s + n(m.uselessDarts), 0),
      perfectVisits: scoped.reduce((s, m) => s + n(m.perfectVisits), 0),
      earlyValidatedVisits: scoped.reduce((s, m) => s + n(m.earlyValidatedVisits), 0), dartsSaved: scoped.reduce((s, m) => s + n(m.dartsSaved), 0),
      oneDartVisits: scoped.reduce((s, m) => s + n(m.oneDartVisits), 0), twoDartVisits: scoped.reduce((s, m) => s + n(m.twoDartVisits), 0), threeDartVisits: scoped.reduce((s, m) => s + n(m.threeDartVisits), 0),
      targetAttempts, targetHits, exactTargetRate: pct(targetHits, targetAttempts),
      gradeS: scoped.filter((m) => String(m.missionGrade || "").toUpperCase() === "S").length,
      gradeA: scoped.filter((m) => String(m.missionGrade || "").toUpperCase() === "A").length,
      avgRating: total ? scoped.reduce((s, m) => s + n(m.missionRating), 0) / total : 0,
      bestRating: Math.max(0, ...scoped.map((m) => n(m.missionRating))),
      avgRounds: total ? scoped.reduce((s, m) => s + n(m.roundsPlayed), 0) / total : 0,
      avgDuration: total ? duration / total : 0,
      bestVisit: Math.max(0, ...scoped.map((m) => n(m.bestVisitScore))), maxCombo: Math.max(0, ...scoped.map((m) => n(m.maxCombo))),
      preservationRate: activeTerritories ? pct(Math.max(0, activeTerritories - destroyed), activeTerritories) : 0,
      blockRate: pct(blocked, blocked + spread),
      activeTerritories,
    };
  }, [scoped]);

  const playerAgg = React.useMemo(() => {
    const out: any = { games: 0, darts: 0, visits: 0, hits: 0, singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0, waterApplied: 0, fireReduced: 0, firesExtinguished: 0, smokeCleared: 0, protectionsPlaced: 0, propagationBlocked: 0, uselessDarts: 0, score: 0, perfectVisits: 0, criticalInterventions: 0, earlyValidatedVisits: 0, dartsSaved: 0, oneDartVisits: 0, twoDartVisits: 0, threeDartVisits: 0, bestVisitScore: 0, hitsBySegment: {} };
    scoped.forEach((match) => {
      const rows = (match.players || []).filter((player: any) => !selectedPlayerId && !selectedPlayerName || String(player?.id || player?.playerId || player?.profileId || "") === selectedPlayerId || (selectedPlayerName && String(player?.name || "").trim().toLowerCase() === selectedPlayerName));
      rows.forEach((player: any) => {
        out.games += 1;
        ["darts","visits","hits","singles","doubles","triples","bulls","dbulls","misses","waterApplied","fireReduced","firesExtinguished","smokeCleared","protectionsPlaced","propagationBlocked","uselessDarts","score","perfectVisits","criticalInterventions","earlyValidatedVisits","dartsSaved","oneDartVisits","twoDartVisits","threeDartVisits"].forEach((key) => { out[key] += n(player?.[key]); });
        out.bestVisitScore = Math.max(out.bestVisitScore, n(player?.bestVisitScore));
        mergeCounter(out.hitsBySegment, player?.hitsBySegment);
      });
    });
    out.accuracy = pct(out.hits, out.darts);
    out.usefulRate = pct(Math.max(0, out.darts - out.uselessDarts - out.misses), out.darts);
    out.scorePerDart = out.darts ? out.score / out.darts : 0;
    return out;
  }, [scoped, selectedPlayerId, selectedPlayerName]);

  const trends = React.useMemo(() => [...scoped].sort((a,b) => n(a.ts)-n(b.ts)).slice(-24).map((m, index) => ({ index: index + 1, date: fmtShortDate(m.ts), score: n(m.score), rating: n(m.missionRating), accuracy: n(m.accuracy), fire: n(m.totalFireReduced), extinguished: n(m.totalExtinguished), blocked: n(m.propagationBlocked), preservation: n(m.preservationRate) })), [scoped]);

  const breakdown = React.useCallback((keyGetter: (m:any)=>string, labelGetter?: (key:string)=>string) => {
    const map = new Map<string, any>();
    scoped.forEach((m) => { const key = keyGetter(m); const row = map.get(key) || { key, name: labelGetter ? labelGetter(key) : key, games: 0, wins: 0, score: 0, rating: 0 }; row.games += 1; row.wins += m.won ? 1 : 0; row.score += n(m.score); row.rating += n(m.missionRating); map.set(key,row); });
    return Array.from(map.values()).map((row:any) => ({ ...row, winRate: pct(row.wins,row.games), avgScore: row.games ? row.score/row.games : 0, avgRating: row.games ? row.rating/row.games : 0 })).sort((a:any,b:any)=>b.games-a.games);
  }, [scoped]);

  const byDifficulty = React.useMemo(() => breakdown((m)=>String(m.difficulty||"firefighter"),(key)=>difficultyLabel(key as any)), [breakdown]);
  const byMap = React.useMemo(() => breakdown((m)=>String(m.mapId||"FR")), [breakdown]);
  const byPreset = React.useMemo(() => breakdown((m)=>String(m.missionPreset||"custom"),missionLabel), [breakdown]);
  const byObjective = React.useMemo(() => breakdown((m)=>String(m.objective||"extinguish_all"),objectiveLabel), [breakdown]);
  const byFinish = React.useMemo(() => breakdown((m)=>String(m.finishReason||"unknown"),(key)=>key === "unknown" ? "Non renseigné" : finishReasonLabel(key as any)), [breakdown]);

  const segmentData = React.useMemo(() => Object.entries(playerAgg.hitsBySegment || {}).map(([name,value])=>({ name, value:n(value) })).sort((a,b)=>b.value-a.value).slice(0,16), [playerAgg]);
  const dartBedData = React.useMemo(() => [
    { name:"Simples", value:playerAgg.singles, color:WATER }, { name:"Doubles", value:playerAgg.doubles, color:GOLD }, { name:"Triples", value:playerAgg.triples, color:PURPLE },
    { name:"Bull", value:playerAgg.bulls, color:GREEN }, { name:"DBull", value:playerAgg.dbulls, color:"#65f2c4" }, { name:"MISS", value:playerAgg.misses, color:RED },
  ].filter((row)=>row.value>0), [playerAgg]);
  const visitLengthData = React.useMemo(() => [{name:"1 flèche",value:playerAgg.oneDartVisits,color:GREEN},{name:"2 flèches",value:playerAgg.twoDartVisits,color:WATER},{name:"3 flèches",value:playerAgg.threeDartVisits,color:GOLD}].filter(r=>r.value>0), [playerAgg]);
  const outcomeData = React.useMemo(() => [{name:"Victoires",value:agg.wins,color:GREEN},{name:"Défaites",value:agg.losses,color:RED}].filter(r=>r.value>0), [agg]);
  const gradesData = React.useMemo(() => {
    const counts: Record<string,number> = {}; scoped.forEach(m=>{ const k=String(m.missionGrade||"—").toUpperCase(); counts[k]=(counts[k]||0)+1; });
    return Object.entries(counts).map(([name,value],i)=>({name,value,color:CHART_COLORS[i%CHART_COLORS.length]}));
  },[scoped]);
  const statusData = React.useMemo(() => {
    const counts: Record<string,number> = {}; scoped.forEach(m=>mergeCounter(counts,m.finalStatusCounts));
    return Object.entries(counts).map(([key,value])=>({name:statusLabel(key),value,color:statusColor(key)})).filter(r=>r.value>0);
  },[scoped]);
  const flowData = React.useMemo(() => [
    {name:"Éteints",value:agg.extinguished,color:GREEN},{name:"Bloqués",value:agg.blocked,color:WATER},{name:"Protégés",value:agg.protected,color:GOLD},{name:"Fumées levées",value:agg.smokeCleared,color:PURPLE},{name:"Propagés",value:agg.spread,color:FIRE},{name:"Perdus",value:agg.destroyed,color:RED},
  ],[agg]);

  const contributors = React.useMemo(() => {
    const out = new Map<string,any>();
    scoped.forEach((match) => (match.players || []).forEach((player:any) => {
      const id = String(player?.id || player?.playerId || player?.profileId || player?.name || "unknown");
      const row = out.get(id) || { id, name:player?.name||id, avatarDataUrl:player?.avatarDataUrl||player?.avatar||null, games:0,darts:0,hits:0,score:0,fireReduced:0,extinguished:0,blocked:0,water:0,protected:0,critical:0,perfect:0,bestVisit:0 };
      row.games += 1; row.darts += n(player?.darts); row.hits += n(player?.hits); row.score += n(player?.score); row.fireReduced += n(player?.fireReduced); row.extinguished += n(player?.firesExtinguished); row.blocked += n(player?.propagationBlocked); row.water += n(player?.waterApplied); row.protected += n(player?.protectionsPlaced); row.critical += n(player?.criticalInterventions); row.perfect += n(player?.perfectVisits); row.bestVisit = Math.max(row.bestVisit,n(player?.bestVisitScore));
      if (!row.avatarDataUrl) row.avatarDataUrl = player?.avatarDataUrl || player?.avatar || null;
      out.set(id,row);
    }));
    return Array.from(out.values()).map(row=>({...row,accuracy:pct(row.hits,row.darts),scorePerDart:row.darts?row.score/row.darts:0})).sort((a,b)=>b.score-a.score||b.fireReduced-a.fireReduced);
  },[scoped]);

  const fastestWin = React.useMemo(() => scoped.filter(m=>m.won&&n(m.durationMs)>0).sort((a,b)=>n(a.durationMs)-n(b.durationMs))[0] || null,[scoped]);
  const bestFireMission = React.useMemo(() => [...scoped].sort((a,b)=>n(b.totalFireReduced)-n(a.totalFireReduced))[0] || null,[scoped]);
  const bestBlockMission = React.useMemo(() => [...scoped].sort((a,b)=>n(b.propagationBlocked)-n(a.propagationBlocked))[0] || null,[scoped]);

  const tabButtons: Array<[StatsTab,string,string]> = [["overview","Résumé","📊"],["operations","Intervention","🚒"],["darts","Fléchettes","🎯"],["missions","Missions","🗺️"],["brigade","Brigade","👨‍🚒"]];
  const content = <main style={{ width:"min(1060px,100%)", margin:"0 auto", padding:embedded?"0":"8px 9px 22px", boxSizing:"border-box" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
      <div><div style={{ color:FIRE,fontSize:11.5,fontWeight:1100,letterSpacing:.8 }}>DARTS FIREFIGHTER · STATS CENTER</div><div style={{ color:theme?.textSoft||SOFT,fontSize:8.8 }}>{syncing?"Synchronisation…":`${scoped.length} mission${scoped.length>1?"s":""} · ${selectedPlayerId||selectedPlayerName?"vue joueur":"vue globale"}`}</div></div>
      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{[["day","J"],["week","7J"],["month","M"],["year","A"],["all","TOUT"]].map(([id,label])=><button key={id} onClick={()=>setRange(id as any)} style={pill(range===id,WATER)}>{label}</button>)}</div>
    </div>
    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:7 }}>{tabButtons.map(([id,label,icon])=><button key={id} onClick={()=>setTab(id)} style={{ ...pill(tab===id,tab===id?FIRE:"#8f97a9"), minWidth:104, minHeight:36, display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,flex:"0 0 auto" }}><span>{icon}</span>{label}</button>)}</div>

    {!scoped.length ? <section style={{ ...panel(), padding:22,textAlign:"center",borderColor:`${FIRE}35` }}><div style={{ fontSize:34 }}>🚒</div><div style={{ color:"#fff",fontWeight:1100,marginTop:5 }}>Aucune mission Darts Firefighter</div><div style={{ color:SOFT,fontSize:10,marginTop:4 }}>Les statistiques apparaîtront ici après la première intervention terminée.</div></section> : <>
      {tab === "overview" ? <OverviewTab agg={agg} trends={trends} outcomeData={outcomeData} gradesData={gradesData} fastestWin={fastestWin} bestFireMission={bestFireMission} bestBlockMission={bestBlockMission} /> : null}
      {tab === "operations" ? <OperationsTab agg={agg} trends={trends} flowData={flowData} statusData={statusData} /> : null}
      {tab === "darts" ? <DartsTab agg={agg} playerAgg={playerAgg} trends={trends} dartBedData={dartBedData} visitLengthData={visitLengthData} segmentData={segmentData} selected={Boolean(selectedPlayerId||selectedPlayerName)} /> : null}
      {tab === "missions" ? <MissionsTab scoped={scoped} byDifficulty={byDifficulty} byMap={byMap} byPreset={byPreset} byObjective={byObjective} byFinish={byFinish} gradesData={gradesData} /> : null}
      {tab === "brigade" ? <BrigadeTab contributors={contributors} selected={Boolean(selectedPlayerId||selectedPlayerName)} /> : null}
    </>}
  </main>;

  if (embedded) return content;
  return <div style={{ minHeight:"100dvh",color:theme?.text||"#fff",background:`radial-gradient(circle at 50% -6%,${FIRE}20 0,${theme?.bg||"#080a11"} 46%,#020305 100%)` }}><PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" left={<div style={{ marginLeft:6 }}><BackDot onClick={()=>props?.setTab?props.setTab("stats"):window.history.back()} color={FIRE} glow={`${FIRE}88`} /></div>} right={<div style={{ marginRight:6 }}><InfoDot title="Statistiques Darts Firefighter" color={WATER} glow={`${WATER}88`} content={INFO} /></div>} />{content}</div>;
}

function OverviewTab({ agg,trends,outcomeData,gradesData,fastestWin,bestFireMission,bestBlockMission }:any) {
  return <>
    <section style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(118px,1fr))",gap:6,marginBottom:7 }}>
      <Kpi label="Missions" value={agg.total} color={WATER} icon="🚒" />
      <Kpi label="Victoires" value={`${agg.winRate}%`} sub={`${agg.wins}/${agg.total}`} color={GREEN} icon="✅" />
      <Kpi label="Note" value={`${fmt1(agg.avgRating)}`} sub="/100" color={GOLD} icon="🎖️" />
      <Kpi label="Score moyen" value={Math.round(agg.avgScore)} color={FIRE} icon="⭐" />
      <Kpi label="Précision" value={`${agg.accuracy}%`} color={GREEN} icon="🎯" />
      <Kpi label="Préservation" value={`${agg.preservationRate}%`} color={WATER} icon="🛡️" />
      <Kpi label="Feux éteints" value={agg.extinguished} color={GREEN} icon="🧯" />
      <Kpi label="Blocage propagation" value={`${agg.blockRate}%`} color={WATER} icon="🚧" />
    </section>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:7,marginBottom:7 }}>
      <TrendCard title="SCORE / MISSION" value={Math.round(agg.avgScore)} data={trends} dataKey="score" color={FIRE} />
      <TrendCard title="NOTE DE MISSION" value={`${fmt1(agg.avgRating)}/100`} data={trends} dataKey="rating" color={GOLD} />
      <TrendCard title="PRÉCISION" value={`${agg.accuracy}%`} data={trends} dataKey="accuracy" color={GREEN} />
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:7,marginBottom:7 }}>
      <ChartPanel title="RÉSULTATS" subtitle="Victoires / défaites"><Donut data={outcomeData} center={`${agg.winRate}%`} /></ChartPanel>
      <ChartPanel title="GRADES" subtitle="Qualité globale des interventions"><Donut data={gradesData} center={agg.total} /></ChartPanel>
    </div>
    <section style={panel()}><SectionTitle title="RECORDS OPÉRATIONNELS" subtitle="Meilleures performances enregistrées" color={GOLD} /><div style={{ marginTop:8,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:6 }}>
      <Record label="Meilleur score" value={agg.bestScore} note="points" color={FIRE}/><Record label="Meilleure note" value={`${agg.bestRating}/100`} note="mission" color={GOLD}/><Record label="Meilleure volée" value={agg.bestVisit} note="points" color={PURPLE}/><Record label="Combo max" value={`x${agg.maxCombo}`} note="enchaînement" color={GREEN}/><Record label="Victoire la + rapide" value={fastestWin?fmtDuration(fastestWin.durationMs):"—"} note={fastestWin?fmtDate(fastestWin.ts):"aucune"} color={WATER}/><Record label="Feu supprimé / mission" value={bestFireMission?n(bestFireMission.totalFireReduced):0} note={bestFireMission?fmtDate(bestFireMission.ts):"—"} color={FIRE}/><Record label="Blocages / mission" value={bestBlockMission?n(bestBlockMission.propagationBlocked):0} note={bestBlockMission?fmtDate(bestBlockMission.ts):"—"} color={WATER}/><Record label="Flèches économisées" value={agg.dartsSaved} note={`${agg.earlyValidatedVisits} validations tôt`} color={GREEN}/>
    </div></section>
  </>;
}

function OperationsTab({ agg,trends,flowData,statusData }:any) {
  return <>
    <section style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:6,marginBottom:7 }}>
      <Kpi label="Niveaux supprimés" value={agg.fireReduced} color={FIRE} icon="🔥"/><Kpi label="Extinctions" value={agg.extinguished} color={GREEN} icon="🧯"/><Kpi label="Eau" value={agg.water} color={WATER} icon="💧"/><Kpi label="Efficacité eau" value={fmt1(agg.waterEfficiency)} sub="niv./unité" color={WATER} icon="⚙️"/><Kpi label="Protections" value={agg.protected} color={WATER} icon="🛡️"/><Kpi label="Fumées levées" value={agg.smokeCleared} color={PURPLE} icon="🌫️"/><Kpi label="Canadairs" value={agg.canadairs} color={GOLD} icon="✈️"/><Kpi label="Interv. critiques" value={agg.criticalInterventions} color={RED} icon="🏥"/><Kpi label="Propagations" value={agg.spread} color={FIRE} icon="↗️"/><Kpi label="Bloquées" value={agg.blocked} color={WATER} icon="🚧"/><Kpi label="Zones perdues" value={agg.destroyed} color={RED} icon="⬛"/><Kpi label="Préservées" value={`${agg.preservationRate}%`} color={GREEN} icon="🌲"/>
    </section>
    <section style={{ ...panel(),marginBottom:7 }}><SectionTitle title="INDICATEURS DE MAÎTRISE" subtitle="Capacité de la brigade à contenir l’incendie" color={WATER}/><div style={{ marginTop:8 }}><RatioBar label="Territoires préservés" value={agg.preservationRate} color={GREEN}/><RatioBar label="Propagation bloquée" value={agg.blockRate} color={WATER}/><RatioBar label="Précision de tir" value={agg.accuracy} color={GOLD}/><RatioBar label="Cibles exactes" value={agg.exactTargetRate} color={PURPLE}/></div></section>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:7,marginBottom:7 }}>
      <ChartPanel title="BILAN DU FEU" subtitle="Actions positives et pression subie"><ResponsiveContainer width="100%" height={220}><BarChart data={flowData} margin={{top:8,right:6,left:-18,bottom:0}}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="name" tick={{fill:SOFT,fontSize:8}} interval={0}/><YAxis tick={{fill:SOFT,fontSize:8}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="value" radius={[6,6,0,0]}>{flowData.map((row:any,i:number)=><Cell key={i} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="ÉTAT FINAL DES TERRITOIRES" subtitle="Répartition cumulée à la fin des missions"><Donut data={statusData} center={agg.activeTerritories}/></ChartPanel>
    </div>
    <ChartPanel title="PRESSION AU FIL DES MISSIONS" subtitle="Feu supprimé, extinctions et blocages"><ResponsiveContainer width="100%" height={220}><LineChart data={trends}><CartesianGrid stroke="rgba(255,255,255,.06)"/><XAxis dataKey="date" tick={{fill:SOFT,fontSize:8}}/><YAxis tick={{fill:SOFT,fontSize:8}}/><Tooltip contentStyle={tooltipStyle}/><Line type="monotone" dataKey="fire" name="Niveaux supprimés" stroke={FIRE} strokeWidth={2} dot={false}/><Line type="monotone" dataKey="extinguished" name="Extinctions" stroke={GREEN} strokeWidth={2} dot={false}/><Line type="monotone" dataKey="blocked" name="Blocages" stroke={WATER} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></ChartPanel>
  </>;
}

function DartsTab({ agg,playerAgg,trends,dartBedData,visitLengthData,segmentData,selected }:any) {
  return <>
    <section style={{ ...panel(),marginBottom:7,borderColor:`${WATER}35` }}><div style={{ display:"flex",justifyContent:"space-between",gap:8,alignItems:"center" }}><SectionTitle title={selected?"FLÉCHETTES DU JOUEUR":"FLÉCHETTES DE LA BRIGADE"} subtitle="Toutes les touches enregistrées dart par dart" color={WATER}/><div style={{ color:SOFT,fontSize:8,fontWeight:900 }}>{playerAgg.darts} DARTS</div></div><div style={{ marginTop:8,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))",gap:6 }}><Mini label="Précision" value={`${playerAgg.accuracy}%`} color={GREEN}/><Mini label="Score / dart" value={fmt1(playerAgg.scorePerDart)} color={GOLD}/><Mini label="Meilleure volée" value={playerAgg.bestVisitScore} color={FIRE}/><Mini label="Volées parfaites" value={playerAgg.perfectVisits} color={GREEN}/><Mini label="Flèches sauvées" value={playerAgg.dartsSaved} color={WATER}/><Mini label="Tirs inutiles" value={playerAgg.uselessDarts} color={RED}/></div></section>
    <section style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))",gap:6,marginBottom:7 }}><Kpi label="Simples" value={playerAgg.singles} color={WATER} icon="S"/><Kpi label="Doubles" value={playerAgg.doubles} color={GOLD} icon="D"/><Kpi label="Triples" value={playerAgg.triples} color={PURPLE} icon="T"/><Kpi label="Bull" value={playerAgg.bulls} color={GREEN} icon="25"/><Kpi label="DBull" value={playerAgg.dbulls} color="#65f2c4" icon="50"/><Kpi label="MISS" value={playerAgg.misses} color={RED} icon="×"/></section>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:7,marginBottom:7 }}>
      <ChartPanel title="RÉPARTITION DES TOUCHES" subtitle="Simple / Double / Triple / Bulls / MISS"><Donut data={dartBedData} center={playerAgg.darts}/></ChartPanel>
      <ChartPanel title="LONGUEUR DES VOLÉES" subtitle="Validation après 1, 2 ou 3 fléchettes"><Donut data={visitLengthData} center={playerAgg.visits}/></ChartPanel>
    </div>
    <ChartPanel title="SEGMENTS LES PLUS TOUCHÉS" subtitle="Top des cases enregistrées"><ResponsiveContainer width="100%" height={250}><BarChart data={segmentData} layout="vertical" margin={{top:4,right:12,left:10,bottom:4}}><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false}/><XAxis type="number" tick={{fill:SOFT,fontSize:8}}/><YAxis type="category" dataKey="name" width={44} tick={{fill:WHITE,fontSize:8,fontWeight:900}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="value" name="Touches" fill={WATER} radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></ChartPanel>
    <div style={{ marginTop:7,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:7 }}><TrendCard title="PRÉCISION / MISSION" value={`${playerAgg.accuracy}%`} data={trends} dataKey="accuracy" color={GREEN}/><section style={panel()}><SectionTitle title="CIBLES UNIQUES" subtitle="Performance sur les cartes de plus de 20 zones" color={PURPLE}/><div style={{ marginTop:8 }}><RatioBar label="Exactes" value={agg.exactTargetRate} color={PURPLE}/><div style={{ marginTop:9,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5 }}><Mini label="Tentées" value={agg.targetAttempts} color={WHITE}/><Mini label="Réussies" value={agg.targetHits} color={GREEN}/><Mini label="Valid. tôt" value={agg.earlyValidatedVisits} color={WATER}/></div></div></section></div>
  </>;
}

function MissionsTab({ scoped,byDifficulty,byMap,byPreset,byObjective,byFinish,gradesData }:any) {
  return <>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:7,marginBottom:7 }}><BreakPanel title="SCÉNARIOS" color={FIRE} rows={byPreset}/><BreakPanel title="OBJECTIFS" color={WATER} rows={byObjective}/><BreakPanel title="DIFFICULTÉS" color={GOLD} rows={byDifficulty}/><BreakPanel title="CARTES" color={GREEN} rows={byMap.slice(0,10)}/></div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:7,marginBottom:7 }}><ChartPanel title="GRADES DE MISSION" subtitle="Répartition des évaluations"><Donut data={gradesData} center={scoped.length}/></ChartPanel><BreakPanel title="FINS DE MISSION" color={RED} rows={byFinish}/></div>
    <section style={panel()}><SectionTitle title="DERNIÈRES MISSIONS" subtitle="Historique détaillé des interventions" color={FIRE}/><div style={{ marginTop:8,display:"grid",gap:6 }}>{scoped.slice(0,18).map((match:any)=><MissionRow key={match.id} match={match}/>)}</div></section>
  </>;
}

function BrigadeTab({ contributors,selected }:any) {
  return <>
    <section style={panel()}><SectionTitle title={selected?"CONTRIBUTION DU JOUEUR":"CLASSEMENT DE LA BRIGADE"} subtitle="Score, précision et impact opérationnel" color={WATER}/><div style={{ marginTop:8,display:"grid",gap:7 }}>{contributors.slice(0,16).map((row:any,index:number)=><div key={row.id} style={{ display:"grid",gridTemplateColumns:"28px 44px minmax(0,1fr)",gap:8,alignItems:"center",padding:9,borderRadius:14,background:"rgba(255,255,255,.032)",border:`1px solid ${index===0?GOLD:"rgba(255,255,255,.075)"}` }}><div style={{ color:index===0?GOLD:SOFT,fontWeight:1100,textAlign:"center" }}>#{index+1}</div><ProfileAvatar profile={row} size={42} showStars={false}/><div style={{ minWidth:0 }}><div style={{ display:"flex",justifyContent:"space-between",gap:8 }}><strong style={{ color:index===0?GOLD:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</strong><b style={{ color:WATER }}>{row.score} pts</b></div><div style={{ marginTop:5,display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:4 }}><Tiny label="Préc." value={`${row.accuracy}%`} color={GREEN}/><Tiny label="Feu" value={row.fireReduced} color={FIRE}/><Tiny label="Éteints" value={row.extinguished} color={GREEN}/><Tiny label="Blocages" value={row.blocked} color={WATER}/><Tiny label="Eau" value={row.water} color={WATER}/><Tiny label="Protégés" value={row.protected} color={GOLD}/><Tiny label="Critiques" value={row.critical} color={RED}/><Tiny label="Best" value={row.bestVisit} color={PURPLE}/></div></div></div>)}</div></section>
  </>;
}

function MissionRow({ match }:any) { return <div style={{ display:"grid",gridTemplateColumns:"36px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:9,borderRadius:13,background:match.won?`${GREEN}09`:`${RED}09`,border:`1px solid ${match.won?GREEN:RED}2f` }}><div style={{ width:34,height:34,borderRadius:11,display:"grid",placeItems:"center",background:match.won?`${GREEN}18`:`${RED}18`,fontSize:17 }}>{match.won?"✅":"🚨"}</div><div style={{ minWidth:0 }}><div style={{ color:match.won?GREEN:RED,fontSize:9.4,fontWeight:1050 }}>{match.won?"INCENDIE MAÎTRISÉ":finishReasonLabel(match.finishReason)}{match.missionGrade?` · GRADE ${match.missionGrade}`:""}</div><div style={{ color:"#fff",fontSize:9,fontWeight:950 }}>{missionLabel(match.missionPreset)} · {match.mapId} · {difficultyLabel(match.difficulty)} · {match.roundsPlayed} rounds</div><div style={{ color:SOFT,fontSize:7.8 }}>{fmtDate(match.ts)} · {match.totalExtinguished} éteint(s) · {match.propagationBlocked} blocage(s) · {match.totalDestroyed} perdu(s) · {n(match.accuracy).toFixed(0)}%</div></div><div style={{ textAlign:"right" }}><div style={{ color:GOLD,fontSize:15,fontWeight:1100 }}>{match.score}</div><div style={{ color:WATER,fontSize:7.5,fontWeight:1000 }}>{n(match.missionRating).toFixed(0)}/100</div></div></div>; }
function BreakPanel({ title,color,rows }:any) { return <section style={panel()}><SectionTitle title={title} subtitle="Missions · taux de réussite · score moyen" color={color}/><div style={{ marginTop:8,display:"grid",gap:6 }}>{rows.length?rows.map((row:any)=><BreakRow key={row.key} row={row} color={color}/>):<div style={{ color:SOFT,fontSize:9 }}>Aucune donnée.</div>}</div></section>; }
function BreakRow({ row,color }:any) { return <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,padding:8,borderRadius:12,background:`${color}08`,border:`1px solid ${color}25` }}><div><div style={{ color,fontWeight:1050,fontSize:9.4 }}>{row.name}</div><div style={{ color:SOFT,fontSize:7.8 }}>{row.games} mission(s) · {row.wins} victoire(s) · {row.winRate}%</div></div><div style={{ textAlign:"right" }}><div style={{ color:GOLD,fontWeight:1100 }}>{Math.round(row.avgScore)}</div><div style={{ color:WATER,fontSize:7.2 }}>{Math.round(row.avgRating)}/100</div></div></div>; }
function ChartPanel({ title,subtitle,children }:any) { return <section style={panel()}><SectionTitle title={title} subtitle={subtitle} color={WATER}/><div style={{ marginTop:6,minWidth:0 }}>{children}</div></section>; }
function TrendCard({ title,value,data,dataKey,color }:any) { return <section style={panel({ padding:10 })}><div style={{ display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline" }}><div style={{ color:SOFT,fontSize:7.7,fontWeight:1000,letterSpacing:.4 }}>{title}</div><strong style={{ color,fontSize:17 }}>{value}</strong></div><div style={{ height:72,marginTop:4 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={.38}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer></div></section>; }
function Donut({ data,center }:any) { return <div style={{ position:"relative",height:210 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>{data.map((row:any,i:number)=><Cell key={i} fill={row.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer><div style={{ position:"absolute",inset:0,display:"grid",placeItems:"center",pointerEvents:"none" }}><strong style={{ color:"#fff",fontSize:20 }}>{center}</strong></div><div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:-8 }}>{data.slice(0,8).map((row:any,i:number)=><span key={i} style={{ color:SOFT,fontSize:7.5 }}><b style={{ color:row.color||CHART_COLORS[i%CHART_COLORS.length] }}>●</b> {row.name} {row.value}</span>)}</div></div>; }
function Kpi({ label,value,sub,color,icon }:any) { return <div style={{ minWidth:0,minHeight:78,borderRadius:14,padding:8,textAlign:"center",background:`${color}0d`,border:`1px solid ${color}37` }}><div style={{ fontSize:14,color }}>{icon}</div><div style={{ color,fontSize:18,lineHeight:1,fontWeight:1100 }}>{value}</div>{sub?<div style={{ color:WHITE,fontSize:7.2,marginTop:2,fontWeight:900 }}>{sub}</div>:null}<div style={{ marginTop:4,color:SOFT,fontSize:6.8,fontWeight:1000,letterSpacing:.25 }}>{String(label).toUpperCase()}</div></div>; }
function Mini({ label,value,color }:any) { return <div style={{ minWidth:0,borderRadius:12,padding:8,textAlign:"center",background:"rgba(0,0,0,.22)",border:"1px solid rgba(255,255,255,.06)" }}><div style={{ color:SOFT,fontSize:6.9,fontWeight:950 }}>{String(label).toUpperCase()}</div><div style={{ color,fontSize:14,fontWeight:1100 }}>{value}</div></div>; }
function Tiny({ label,value,color }:any) { return <div style={{ minWidth:0,padding:"5px 3px",borderRadius:8,textAlign:"center",background:"rgba(0,0,0,.20)" }}><div style={{ color,fontSize:9.5,fontWeight:1100,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{value}</div><div style={{ color:SOFT,fontSize:5.6,fontWeight:900 }}>{String(label).toUpperCase()}</div></div>; }
function Record({ label,value,note,color }:any) { return <div style={{ minWidth:0,padding:9,borderRadius:13,background:`${color}0c`,border:`1px solid ${color}2d` }}><div style={{ color:SOFT,fontSize:6.7,fontWeight:1000 }}>{String(label).toUpperCase()}</div><div style={{ color,fontSize:16,fontWeight:1100,marginTop:2 }}>{value}</div><div style={{ color:"#aab1bf",fontSize:7.2,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{note}</div></div>; }
function SectionTitle({ title,subtitle,color }:any) { return <div><div style={{ color,fontSize:10,fontWeight:1100,letterSpacing:.7 }}>{title}</div><div style={{ color:SOFT,fontSize:8 }}>{subtitle}</div></div>; }
function RatioBar({ label,value,color }:any) { const safe=Math.max(0,Math.min(100,n(value))); return <div style={{ marginTop:7 }}><div style={{ display:"flex",justifyContent:"space-between",color:"#a7aebb",fontSize:8.4,fontWeight:900 }}><span>{label}</span><span style={{ color }}>{safe.toFixed(1)}%</span></div><div style={{ marginTop:3,height:7,borderRadius:999,background:"rgba(255,255,255,.08)",overflow:"hidden" }}><div style={{ width:`${safe}%`,height:"100%",background:color,boxShadow:`0 0 9px ${color}88` }}/></div></div>; }
function pill(active:boolean,color:string):React.CSSProperties { return { minHeight:31,padding:"0 9px",borderRadius:999,border:`1px solid ${active?color:"rgba(255,255,255,.09)"}`,background:active?`${color}17`:"rgba(255,255,255,.035)",color:active?color:"#9da4b5",fontSize:8.1,fontWeight:1000,cursor:"pointer" }; }
const tooltipStyle:any = { background:"rgba(5,8,14,.96)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,color:"#fff",fontSize:10,boxShadow:"0 10px 24px rgba(0,0,0,.35)" };
