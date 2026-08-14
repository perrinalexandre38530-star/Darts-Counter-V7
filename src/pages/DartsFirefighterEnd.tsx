// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — écran de fin V2
// Bilan épuré + onglets statistiques + graphiques.
// =============================================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  activeIncidents,
  computeDartsFirefighterMissionGrade,
  difficultyLabel,
  finishReasonLabel,
  fireStatus,
  fireTerritoryColor,
  type DartsFirefighterState,
  type FireTerritory,
} from "../lib/gameEngines/dartsFirefighterEngine";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import "../styles/darts-firefighter-end.css";

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const RED = "#ff5264";
const GREEN = "#5ce6a8";
const PURPLE = "#b996ff";
const SOFT = "#8f98aa";
const PLAYER_COLORS = [WATER, "#ffbf45", "#ff6aa9", "#8d7dff", "#62e9aa", "#ff8a5b", "#d4d8e5", "#66a7ff"];
const TOOLTIP_STYLE: any = { background: "rgba(5,8,14,.97)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#fff", fontSize: 10, boxShadow: "0 10px 28px rgba(0,0,0,.38)" };

type EndTab = "summary" | "operations" | "darts" | "brigade" | "map";

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Pompier";
}
function n(value: any) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function gradeColor(grade: string) {
  return grade === "S" ? GOLD : grade === "A" ? WATER : grade === "B" ? GREEN : grade === "C" ? "#d5d9e2" : RED;
}
function statusLabel(territory: FireTerritory) {
  if (territory.destroyed) return "Détruit";
  if (territory.fireLevel > 0) return `Feu N${territory.fireLevel}`;
  if (territory.smoke) return "Fumée";
  if (territory.protection > 0) return `Protection ${territory.protection}`;
  return "Sain";
}
function statusKey(territory: FireTerritory) {
  if (territory.destroyed) return "destroyed";
  if (territory.fireLevel >= 3) return "fire3";
  if (territory.fireLevel === 2) return "fire2";
  if (territory.fireLevel === 1) return "fire1";
  if (territory.smoke) return "smoke";
  if (territory.protection > 0) return "protected";
  return "safe";
}
function statusColor(key: string) {
  return key === "fire3" ? RED : key === "fire2" ? FIRE : key === "fire1" ? "#ffad33" : key === "smoke" ? "#c2b59f" : key === "protected" ? WATER : key === "destroyed" ? "#66707f" : GREEN;
}
function missionObjectiveLabel(state: DartsFirefighterState) {
  if (state.config.objective === "survival") return `Survie · ${state.config.maxRounds} rounds`;
  if (state.config.objective === "protect_critical") return `Protection · ${state.config.criticalTerritories} zones critiques`;
  return "Extinction totale";
}

export type DartsFirefighterEndProps = {
  state: DartsFirefighterState;
  profilesById: Map<string, any>;
  onClose: () => void;
  onReplay: () => void;
  onStats: () => void;
  onHistory: () => void;
};

export default function DartsFirefighterEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: DartsFirefighterEndProps) {
  const [tab, setTab] = React.useState<EndTab>("summary");
  const duration = Math.max(0, (state.finishedAt || Date.now()) - state.startedAt);
  const missionGrade = computeDartsFirefighterMissionGrade(state);
  const grade = gradeColor(missionGrade.grade);

  const playerRows = React.useMemo(() => state.players
    .map((player: any, index: number) => ({
      player,
      profile: profilesById.get(String(player.id)) || player,
      stats: state.playerStats[player.id] || {},
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    }))
    .map((row: any) => ({ ...row, accuracy: pct(n(row.stats.hits), n(row.stats.darts)) }))
    .sort((a: any, b: any) => n(b.stats.score) - n(a.stats.score)), [state.players, state.playerStats, profilesById]);

  const totals = React.useMemo(() => playerRows.reduce((acc: any, row: any) => {
    const s = row.stats;
    acc.darts += n(s.darts); acc.hits += n(s.hits); acc.fire += n(s.fireReduced); acc.water += n(s.waterApplied);
    acc.protected += n(s.protectionsPlaced); acc.extinguished += n(s.firesExtinguished); acc.score += n(s.score);
    acc.blocked += n(s.propagationBlocked); acc.smoke += n(s.smokeCleared); acc.singles += n(s.singles); acc.doubles += n(s.doubles);
    acc.triples += n(s.triples); acc.bulls += n(s.bulls); acc.dbulls += n(s.dbulls); acc.misses += n(s.misses);
    acc.one += n(s.oneDartVisits); acc.two += n(s.twoDartVisits); acc.three += n(s.threeDartVisits);
    acc.dartsSaved += n(s.dartsSaved); acc.early += n(s.earlyValidatedVisits);
    return acc;
  }, { darts:0,hits:0,fire:0,water:0,protected:0,extinguished:0,score:0,blocked:0,smoke:0,singles:0,doubles:0,triples:0,bulls:0,dbulls:0,misses:0,one:0,two:0,three:0,dartsSaved:0,early:0 }), [playerRows]);

  const finalZones = React.useMemo(() => state.territories.filter((t: FireTerritory) => t.playable), [state.territories]);
  const finalStatusData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    finalZones.forEach((t: FireTerritory) => { const key = statusKey(t); counts[key] = n(counts[key]) + 1; });
    const names: Record<string,string> = { safe:"Saines", protected:"Protégées", smoke:"Fumée", fire1:"Feu N1", fire2:"Feu N2", fire3:"Feu N3", destroyed:"Perdues" };
    return Object.entries(counts).filter(([,value]) => value > 0).map(([key,value]) => ({ key, name:names[key] || key, value, color:statusColor(key) }));
  }, [finalZones]);

  const visitSeries = React.useMemo(() => state.history.map((visit: any, index: number) => ({
    index: index + 1,
    score: n(visit.score),
    cumulative: state.history.slice(0, index + 1).reduce((sum: number, item: any) => sum + n(item.score), 0),
  })), [state.history]);

  const operationBars = [
    { name:"Éteints", value:n(state.totalExtinguished), color:GREEN },
    { name:"Feu réduit", value:totals.fire, color:FIRE },
    { name:"Blocages", value:n(state.propagationBlocked), color:WATER },
    { name:"Propagation", value:n(state.totalSpread), color:"#ff9c35" },
    { name:"Perdus", value:n(state.totalDestroyed), color:RED },
  ];
  const dartMix = [
    { name:"Simples", value:totals.singles, color:WATER },
    { name:"Doubles", value:totals.doubles, color:GOLD },
    { name:"Triples", value:totals.triples, color:FIRE },
    { name:"Bull", value:totals.bulls, color:GREEN },
    { name:"DBull", value:totals.dbulls, color:PURPLE },
    { name:"MISS", value:totals.misses, color:RED },
  ].filter((row) => row.value > 0);
  const visitLength = [
    { name:"1 flèche", value:totals.one, color:GREEN },
    { name:"2 flèches", value:totals.two, color:GOLD },
    { name:"3 flèches", value:totals.three, color:FIRE },
  ];
  const playerScoreData = playerRows.map((row: any) => ({ name: playerName(row.profile), score:n(row.stats.score), color:row.color }));

  const bestPlayer = playerRows[0] || null;
  const accuracy = pct(totals.hits, totals.darts);
  const preservation = finalZones.length ? pct(finalZones.filter((t: FireTerritory) => !t.destroyed).length, finalZones.length) : 0;
  const blockRate = pct(n(state.propagationBlocked), n(state.propagationBlocked) + n(state.totalSpread));
  const tabs: { id:EndTab; label:string; icon:string }[] = [
    { id:"summary", label:"BILAN", icon:"🚒" },
    { id:"operations", label:"INTERVENTION", icon:"🔥" },
    { id:"darts", label:"FLÉCHETTES", icon:"🎯" },
    { id:"brigade", label:"BRIGADE", icon:"👨‍🚒" },
    { id:"map", label:"TERRITOIRES", icon:"🗺" },
  ];

  return <div className="dff-end-overlay">
    <section className="dff-end-shell" style={{ "--result": state.won ? GREEN : RED, "--grade": grade } as React.CSSProperties}>
      <header className="dff-end-hero">
        <button type="button" className="dff-end-close" onClick={onClose} aria-label="Fermer">×</button>
        <div className="dff-end-result-pill">{state.won ? "✓ MISSION RÉUSSIE" : "! MISSION ÉCHOUÉE"}</div>
        <div className="dff-end-hero-grid">
          <div className="dff-end-grade">
            <span>GRADE</span><strong>{missionGrade.grade}</strong><small>{missionGrade.rating}/100</small>
          </div>
          <div className="dff-end-hero-copy">
            <h2>{finishReasonLabel(state.finishReason)}</h2>
            <p>{difficultyLabel(state.config.difficulty)} · {state.config.mapId} · {missionObjectiveLabel(state)}</p>
            <div className="dff-end-score"><strong>{state.score}</strong><span>PTS BRIGADE</span></div>
          </div>
        </div>
      </header>

      <nav className="dff-end-tabs" aria-label="Statistiques de fin de partie">
        {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}
      </nav>

      <main className="dff-end-content">
        {tab === "summary" ? <SummaryPage state={state} totals={totals} duration={duration} accuracy={accuracy} preservation={preservation} blockRate={blockRate} visitSeries={visitSeries} bestPlayer={bestPlayer} profilesById={profilesById} /> : null}
        {tab === "operations" ? <OperationsPage state={state} totals={totals} operationBars={operationBars} finalStatusData={finalStatusData} preservation={preservation} blockRate={blockRate} /> : null}
        {tab === "darts" ? <DartsPage totals={totals} accuracy={accuracy} dartMix={dartMix} visitLength={visitLength} visitSeries={visitSeries} /> : null}
        {tab === "brigade" ? <BrigadePage playerRows={playerRows} playerScoreData={playerScoreData} /> : null}
        {tab === "map" ? <TerritoriesPage finalZones={finalZones} finalStatusData={finalStatusData} /> : null}
      </main>

      <footer className="dff-end-actions">
        <button type="button" className="is-fire" onClick={onReplay}>↻ <span>REJOUER</span></button>
        <button type="button" className="is-water" onClick={onStats}>▥ <span>STATS COMPLÈTES</span></button>
        <button type="button" className="is-gold" onClick={onHistory}>◷ <span>HISTORIQUE</span></button>
      </footer>
    </section>
  </div>;
}

function SummaryPage({ state, totals, duration, accuracy, preservation, blockRate, visitSeries, bestPlayer }: any) {
  return <div className="dff-end-page">
    <div className="dff-end-kpi-grid is-primary">
      <EndKpi label="Feux éteints" value={state.totalExtinguished} icon="🔥" color={GREEN} />
      <EndKpi label="Précision" value={`${accuracy}%`} icon="🎯" color={WATER} />
      <EndKpi label="Zones sauvées" value={`${preservation}%`} icon="🛡" color={GOLD} />
      <EndKpi label="Durée" value={fmtDuration(duration)} icon="⏱" color="#dbe2ed" />
    </div>

    <div className="dff-end-grid-2">
      <ChartCard title="PROGRESSION DU SCORE" subtitle="Évolution de la brigade au fil des volées">
        <div className="dff-end-chart is-medium"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visitSeries}><defs><linearGradient id="endScoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={GOLD} stopOpacity={.36}/><stop offset="95%" stopColor={GOLD} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="index" hide/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Area type="monotone" dataKey="cumulative" stroke={GOLD} fill="url(#endScoreGrad)" strokeWidth={2.5} dot={false}/></AreaChart></ResponsiveContainer></div>
      </ChartCard>
      <section className="dff-end-card dff-end-mission-summary">
        <div className="dff-end-section-title"><strong>RÉSUMÉ OPÉRATIONNEL</strong><span>Les chiffres à retenir</span></div>
        <div className="dff-end-mini-grid">
          <MiniStat label="Rounds" value={Math.max(1, state.roundIndex)} color={WATER}/>
          <MiniStat label="Propagation" value={state.totalSpread} color={FIRE}/>
          <MiniStat label="Bloquées" value={state.propagationBlocked} color={GREEN}/>
          <MiniStat label="Perdues" value={state.totalDestroyed} color={RED}/>
          <MiniStat label="Eau" value={totals.water} color={WATER}/>
          <MiniStat label="Blocage" value={`${blockRate}%`} color={GREEN}/>
        </div>
        {bestPlayer ? <div className="dff-end-best-player"><ProfileAvatar profile={bestPlayer.profile} size={42} showStars={false}/><div><small>MEILLEURE CONTRIBUTION</small><strong>{playerName(bestPlayer.profile)}</strong><span>{n(bestPlayer.stats.score)} pts · {bestPlayer.accuracy}% précision</span></div></div> : null}
      </section>
    </div>
  </div>;
}

function OperationsPage({ state, totals, operationBars, finalStatusData, preservation, blockRate }: any) {
  return <div className="dff-end-page">
    <div className="dff-end-kpi-grid">
      <EndKpi label="Feu réduit" value={totals.fire} icon="🔥" color={FIRE}/>
      <EndKpi label="Fumée dissipée" value={totals.smoke} icon="💨" color="#c4c8d2"/>
      <EndKpi label="Protections" value={totals.protected} icon="🛡" color={WATER}/>
      <EndKpi label="Canadairs" value={countEvents(state, "canadair")} icon="✈" color={GOLD}/>
    </div>
    <div className="dff-end-grid-2">
      <ChartCard title="IMPACT DE L'INTERVENTION" subtitle="Actions positives et pression de l'incendie">
        <div className="dff-end-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={operationBars} layout="vertical" margin={{left:6,right:10}}><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={72} tick={{fill:"#aab3c2",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="value" radius={[0,8,8,0]}>{operationBars.map((row:any)=><Cell key={row.name} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </ChartCard>
      <ChartCard title="ÉTAT FINAL DES TERRITOIRES" subtitle="Répartition à la fin de la mission">
        <Donut data={finalStatusData} center={`${preservation}%`} centerLabel="SAUVÉS"/>
      </ChartCard>
    </div>
    <section className="dff-end-card"><div className="dff-end-section-title"><strong>EFFICACITÉ TACTIQUE</strong><span>Protection de la carte et maîtrise de la propagation</span></div><Ratio label="Territoires préservés" value={preservation} color={GREEN}/><Ratio label="Propagation bloquée" value={blockRate} color={WATER}/><Ratio label="Précision intervention" value={pct(totals.hits, totals.darts)} color={GOLD}/></section>
  </div>;
}

function DartsPage({ totals, accuracy, dartMix, visitLength, visitSeries }: any) {
  return <div className="dff-end-page">
    <div className="dff-end-kpi-grid">
      <EndKpi label="Fléchettes" value={totals.darts} icon="🎯" color={WATER}/>
      <EndKpi label="Précision" value={`${accuracy}%`} icon="◎" color={GREEN}/>
      <EndKpi label="Économisées" value={totals.dartsSaved} icon="⚡" color={GOLD}/>
      <EndKpi label="Volées courtes" value={totals.early} icon="✓" color={PURPLE}/>
    </div>
    <div className="dff-end-grid-2">
      <ChartCard title="RÉPARTITION DES IMPACTS" subtitle="Simple, Double, Triple, Bull et MISS"><Donut data={dartMix} center={totals.darts} centerLabel="DARTS"/></ChartCard>
      <ChartCard title="LONGUEUR DES VOLÉES" subtitle="Nombre de volées terminées en 1, 2 ou 3 fléchettes">
        <div className="dff-end-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={visitLength}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="name" tick={{fill:"#aab3c2",fontSize:8}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="value" radius={[8,8,0,0]}>{visitLength.map((row:any)=><Cell key={row.name} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </ChartCard>
    </div>
    <ChartCard title="SCORE PAR VOLÉE" subtitle="Régularité offensive au fil de la partie">
      <div className="dff-end-chart is-small"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visitSeries}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="index" hide/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Area type="monotone" dataKey="score" stroke={WATER} fill={`${WATER}20`} strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer></div>
    </ChartCard>
  </div>;
}

function BrigadePage({ playerRows, playerScoreData }: any) {
  return <div className="dff-end-page">
    <ChartCard title="CLASSEMENT DE LA BRIGADE" subtitle="Score individuel par pompier">
      <div className="dff-end-chart is-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={playerScoreData} layout="vertical" margin={{left:8,right:12}}><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={78} tick={{fill:"#cdd4df",fontSize:9,fontWeight:700}} axisLine={false} tickLine={false}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="score" radius={[0,8,8,0]}>{playerScoreData.map((row:any)=><Cell key={row.name} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
    </ChartCard>
    <div className="dff-end-player-list">{playerRows.map((row:any,index:number)=><article key={row.player.id} className="dff-end-player-row" style={{"--player":row.color} as React.CSSProperties}><div className="dff-end-player-rank">#{index+1}</div><ProfileAvatar profile={row.profile} size={46} showStars={false}/><div className="dff-end-player-copy"><strong>{playerName(row.profile)}</strong><span>{row.accuracy}% précision · {n(row.stats.firesExtinguished)} extinction(s) · {n(row.stats.propagationBlocked)} blocage(s)</span><div><b>S {n(row.stats.singles)}</b><b>D {n(row.stats.doubles)}</b><b>T {n(row.stats.triples)}</b><b>B {n(row.stats.bulls)}</b><b>DB {n(row.stats.dbulls)}</b></div></div><div className="dff-end-player-score"><strong>{n(row.stats.score)}</strong><small>PTS</small></div></article>)}</div>
  </div>;
}

function TerritoriesPage({ finalZones, finalStatusData }: any) {
  const priorityZones = [...finalZones].sort((a:any,b:any) => {
    const rank=(t:any)=>t.destroyed?7:t.fireLevel>=3?6:t.fireLevel===2?5:t.fireLevel===1?4:t.smoke?3:t.protection?2:1;
    return rank(b)-rank(a) || n(b.target)-n(a.target);
  });
  return <div className="dff-end-page">
    <div className="dff-end-grid-2">
      <ChartCard title="ÉTAT FINAL" subtitle={`${finalZones.length} territoires engagés`}><Donut data={finalStatusData} center={finalZones.length} centerLabel="ZONES"/></ChartCard>
      <section className="dff-end-card"><div className="dff-end-section-title"><strong>LECTURE RAPIDE</strong><span>Les zones les plus sensibles apparaissent en premier</span></div><div className="dff-end-status-legend">{finalStatusData.map((row:any)=><span key={row.key} style={{"--status":row.color} as React.CSSProperties}><i/><b>{row.name}</b><em>{row.value}</em></span>)}</div></section>
    </div>
    <section className="dff-end-card"><div className="dff-end-section-title"><strong>TERRITOIRES</strong><span>État final de la carte</span></div><div className="dff-end-territory-grid">{priorityZones.map((territory:FireTerritory)=>{const key=statusKey(territory);const color=fireTerritoryColor(fireStatus(territory));return <article key={territory.id} className={`dff-end-territory is-${key}`} style={{"--territory":color} as React.CSSProperties}><strong>{territory.target}</strong><div><b>{territory.name}</b><span>{statusLabel(territory)}</span></div></article>})}</div></section>
  </div>;
}

function countEvents(state:any, type:string) {
  return (state.history || []).reduce((sum:number, visit:any) => sum + (Array.isArray(visit?.events) ? visit.events.filter((event:any) => String(event?.type || "") === type).length : 0), 0);
}
function EndKpi({ label, value, icon, color }: any) {
  return <div className="dff-end-kpi" style={{"--kpi":color} as React.CSSProperties}><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}
function MiniStat({ label,value,color }:any) { return <div className="dff-end-mini" style={{"--mini":color} as React.CSSProperties}><strong>{value}</strong><span>{label}</span></div>; }
function ChartCard({ title, subtitle, children }: any) { return <section className="dff-end-card"><div className="dff-end-section-title"><strong>{title}</strong><span>{subtitle}</span></div>{children}</section>; }
function Ratio({ label,value,color }:any) { const safe=Math.max(0,Math.min(100,n(value))); return <div className="dff-end-ratio"><div><span>{label}</span><b style={{color}}>{safe.toFixed(1)}%</b></div><div><i style={{width:`${safe}%`,background:color,boxShadow:`0 0 10px ${color}77`}}/></div></div>; }
function Donut({ data,center,centerLabel }:any) { return <div className="dff-end-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="80%" paddingAngle={2}>{data.map((row:any)=><Cell key={row.name} fill={row.color}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/></PieChart></ResponsiveContainer><div className="dff-end-donut-center"><strong>{center}</strong><small>{centerLabel}</small></div><div className="dff-end-donut-legend">{data.map((row:any)=><span key={row.name}><i style={{background:row.color}}/>{row.name} <b>{row.value}</b></span>)}</div></div>; }
