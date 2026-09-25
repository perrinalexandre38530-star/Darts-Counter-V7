import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "#b7f247";
const CYAN = "#19e6ff";
const GOLD = "#ffd21a";
const RED = "#d92c3a";
const ORANGE = "#ff7a1a";
const MAGENTA = "#c83dff";
const WHITE = "#f7f8fa";
const MUTED = "#8d978f";

function n(v: any) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function obj(v: any) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function modeOf(r: any) {
  return String(r?.kind || r?.mode || r?.game?.mode || r?.summary?.mode || r?.payload?.mode || r?.payload?.kind || "").toLowerCase();
}
function isFinished(r: any) {
  const status = String(r?.status || "").toLowerCase();
  if (status === "in_progress" || status === "playing" || status === "live") return false;
  if (status === "finished" || r?.summary?.finished === true || r?.winnerId || r?.summary?.winnerId || r?.payload?.stateSnapshot?.phase === "finished") return true;
  return true;
}
function playerStat(r: any, pid: string) {
  const pools = [
    r?.payload?.stats?.players,
    r?.summary?.perPlayer,
    r?.payload?.summary?.perPlayer,
    r?.payload?.stateSnapshot?.statsByPlayer,
    r?.resume?.state?.statsByPlayer,
  ];
  for (const pool of pools) {
    if (pool && !Array.isArray(pool) && typeof pool === "object" && pool[pid]) return obj(pool[pid]);
    if (Array.isArray(pool)) {
      const hit = pool.find((x: any) => String(x?.id || x?.playerId || x?.profileId || "") === pid);
      if (hit) return obj(hit);
    }
  }
  return {};
}
function recordHasPlayer(r: any, pid: string) {
  if (Object.keys(playerStat(r, pid)).length) return true;
  const pools = [r?.players, r?.payload?.players, r?.payload?.stateSnapshot?.players, r?.resume?.state?.players];
  return pools.some((pool: any) => Array.isArray(pool) && pool.some((p: any) => String(p?.id || p?.playerId || p?.profileId || "") === pid));
}
function winnerId(r: any) { return String(r?.winnerId || r?.summary?.winnerId || r?.payload?.stateSnapshot?.winnerId || r?.resume?.state?.winnerId || ""); }
function playedAt(r: any) { return n(r?.finishedAt || r?.updatedAt || r?.createdAt || r?.summary?.finishedAt); }
function fmtDate(ts: number) {
  if (!ts) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(ts)); } catch { return "—"; }
}
function fmtDuration(ms: number) {
  if (!ms) return "—";
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

function Card({ children, style }: any) {
  return <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(20,27,18,.82),rgba(7,10,8,.94))", boxShadow: "0 14px 34px rgba(0,0,0,.22)", padding: 13, minWidth: 0, ...style }}>{children}</div>;
}
function Kpi({ label, value, detail, color = ACCENT }: any) {
  return <Card style={{ padding: 12 }}><div style={{ color: MUTED, fontSize: 9.5, fontWeight: 950, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 24, fontWeight: 1100, lineHeight: 1 }}>{value}</div>{detail ? <div style={{ marginTop: 5, color: "#adb6af", fontSize: 9 }}>{detail}</div> : null}</Card>;
}
function SectionTitle({ children, sub }: any) {
  return <div style={{ marginBottom: 10 }}><div style={{ color: "#e8ffbe", fontSize: 12, fontWeight: 1100, letterSpacing: .75 }}>{children}</div>{sub ? <div style={{ marginTop: 2, color: MUTED, fontSize: 9 }}>{sub}</div> : null}</div>;
}

export default function CradosStatsTabFull({ records, playerId, playerName }: { records: any[]; playerId: string; playerName?: string }) {
  const pid = String(playerId || "");
  const rows = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter((r: any) => modeOf(r).includes("crados") && recordHasPlayer(r, pid) && isFinished(r))
    .sort((a: any, b: any) => playedAt(a) - playedAt(b)), [records, pid]);

  const matchRows = React.useMemo(() => rows.map((rec: any, index: number) => {
    const st = playerStat(rec, pid);
    const won = winnerId(rec) === pid;
    return {
      id: String(rec?.id || rec?.matchId || `${index}`),
      ts: playedAt(rec),
      label: fmtDate(playedAt(rec)),
      won,
      darts: n(st.darts || st.dartsThrown),
      visits: n(st.visits),
      singles: n(st.singles), doubles: n(st.doubles), triples: n(st.triples), bulls: n(st.bulls), dbulls: n(st.dbulls), misses: n(st.misses), hits: n(st.hits),
      layers: n(st.layersPlaced), zones: n(st.sectorsClaimed), steals: n(st.sectorsStolen), dirtTaken: n(st.dirtTaken), dirtWashed: n(st.dirtWashed), dirtInflicted: n(st.dirtInflicted),
      splash: n(st.bullSplashInflicted), opponentHits: n(st.opponentSectorHits), ownHits: n(st.ownSectorHits), freeHits: n(st.freeSectorHits),
      bestImpact: n(st.bestVisitImpact), maxDirt: n(st.maxDirt), eliminations: n(st.eliminationsCaused), legs: n(st.legsWon),
      duration: n(rec?.summary?.durationMs || (rec?.finishedAt && rec?.createdAt ? rec.finishedAt - rec.createdAt : 0)),
    };
  }), [rows, pid]);

  const agg = React.useMemo(() => matchRows.reduce((a: any, r: any) => {
    a.matches += 1; a.wins += r.won ? 1 : 0;
    for (const key of ["darts","visits","singles","doubles","triples","bulls","dbulls","misses","hits","layers","zones","steals","dirtTaken","dirtWashed","dirtInflicted","splash","opponentHits","ownHits","freeHits","eliminations","legs","duration"]) a[key] += n(r[key]);
    a.bestImpact = Math.max(a.bestImpact, r.bestImpact); a.maxDirt = Math.max(a.maxDirt, r.maxDirt);
    return a;
  }, { matches:0,wins:0,darts:0,visits:0,singles:0,doubles:0,triples:0,bulls:0,dbulls:0,misses:0,hits:0,layers:0,zones:0,steals:0,dirtTaken:0,dirtWashed:0,dirtInflicted:0,splash:0,opponentHits:0,ownHits:0,freeHits:0,eliminations:0,legs:0,duration:0,bestImpact:0,maxDirt:0 }), [matchRows]);

  const winRate = agg.matches ? Math.round((agg.wins / agg.matches) * 1000) / 10 : 0;
  const accuracy = agg.darts ? Math.round((agg.hits / agg.darts) * 1000) / 10 : 0;
  const avgZones = agg.matches ? Math.round((agg.zones / agg.matches) * 100) / 100 : 0;
  const avgDirt = agg.matches ? Math.round((agg.dirtTaken / agg.matches) * 100) / 100 : 0;
  const dartData = [
    { name: "Simple", value: agg.singles, color: WHITE },
    { name: "Double", value: agg.doubles, color: CYAN },
    { name: "Triple", value: agg.triples, color: MAGENTA },
    { name: "Bull", value: agg.bulls, color: "#58df86" },
    { name: "DBull", value: agg.dbulls, color: "#25f39a" },
    { name: "Miss", value: agg.misses, color: GOLD },
  ].filter((x) => x.value > 0);
  const contamination = [
    { name: "Couches", value: agg.layers, fill: ACCENT },
    { name: "Zones", value: agg.zones, fill: "#6fe087" },
    { name: "Vols", value: agg.steals, fill: MAGENTA },
    { name: "Infligée", value: agg.dirtInflicted, fill: ORANGE },
    { name: "Reçue", value: agg.dirtTaken, fill: RED },
    { name: "Lavée", value: agg.dirtWashed, fill: CYAN },
  ];
  const progression = matchRows.slice(-20).map((r: any, i: number) => ({ match: i + 1, zones: r.zones, steals: r.steals, washed: r.dirtWashed, dirt: r.dirtTaken, win: r.won ? 1 : 0 }));

  if (!rows.length) return <Card><SectionTitle>CRADOS — statistiques détaillées</SectionTitle><div style={{ color: MUTED, fontSize: 12 }}>Aucune partie CRADOS terminée enregistrée pour {playerName || "ce joueur"}.</div></Card>;

  return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 }}>
      <Kpi label="Parties" value={agg.matches} detail={`${agg.wins} victoire${agg.wins > 1 ? "s" : ""}`} />
      <Kpi label="Taux de victoire" value={`${winRate}%`} color={GOLD} />
      <Kpi label="Précision" value={`${accuracy}%`} detail={`${agg.hits}/${agg.darts} fléchettes`} color={CYAN} />
      <Kpi label="Zones / partie" value={avgZones} detail={`${agg.zones} secteurs contaminés`} color="#6fe087" />
      <Kpi label="Crasse / partie" value={avgDirt} detail={`${agg.dirtTaken} reçue · ${agg.dirtWashed} lavée`} color={ORANGE} />
      <Kpi label="Meilleure volée" value={agg.bestImpact || "—"} detail="impact CRADOS" color={MAGENTA} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <Card>
        <SectionTitle sub="Répartition de toutes les fléchettes enregistrées">TYPE DE TOUCHES</SectionTitle>
        <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><PieChart><Pie data={dartData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={50} outerRadius={90} paddingAngle={2}>{dartData.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip contentStyle={{ background: "#0c100d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10 }} /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></div>
      </Card>
      <Card>
        <SectionTitle sub="Contamination, vols et nettoyage">IMPACT CRADOS</SectionTitle>
        <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><BarChart data={contamination} margin={{ top: 8, right: 6, left: -20, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#9da69f", fontSize: 9 }} /><YAxis tick={{ fill: "#79827b", fontSize: 9 }} /><Tooltip contentStyle={{ background: "#0c100d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10 }} /><Bar dataKey="value" radius={[7,7,2,2]}>{contamination.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer></div>
      </Card>
    </div>

    <Card>
      <SectionTitle sub="20 dernières parties terminées">ÉVOLUTION</SectionTitle>
      <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><LineChart data={progression} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.05)" /><XAxis dataKey="match" tick={{ fill: "#8f9991", fontSize: 9 }} /><YAxis tick={{ fill: "#79827b", fontSize: 9 }} /><Tooltip contentStyle={{ background: "#0c100d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10 }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="zones" name="Zones" stroke={ACCENT} strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="steals" name="Vols" stroke={MAGENTA} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="washed" name="Crasse lavée" stroke={CYAN} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="dirt" name="Crasse reçue" stroke={ORANGE} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
    </Card>

    <Card>
      <SectionTitle sub="Détails cumulés issus de l'historique sauvegardé">TABLEAU CRADOS</SectionTitle>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, fontSize: 10 }}><thead><tr>{["Mesure","Valeur","Mesure","Valeur"].map((h,i)=><th key={`${h}-${i}`} style={{ textAlign: i%2 ? "right" : "left", color: MUTED, padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>{h}</th>)}</tr></thead><tbody>{[
        ["Couches posées", agg.layers, "Secteurs contaminés", agg.zones],
        ["Secteurs volés", agg.steals, "Crasse infligée", agg.dirtInflicted],
        ["Crasse reçue", agg.dirtTaken, "Crasse lavée", agg.dirtWashed],
        ["Propagation Bull", agg.splash, "Éliminations causées", agg.eliminations],
        ["Touches libres", agg.freeHits, "Touches adverses", agg.opponentHits],
        ["Touches propres", agg.ownHits, "Crasse max atteinte", agg.maxDirt],
        ["Manches gagnées", agg.legs, "Temps cumulé", fmtDuration(agg.duration)],
      ].map((r:any,idx)=><tr key={idx}>{r.map((v:any,j:number)=><td key={j} style={{ padding:"8px", borderBottom:"1px solid rgba(255,255,255,.045)", textAlign:j%2?"right":"left", color:j%2?"#ecfff0":"#abb5ad", fontWeight:j%2?1000:700 }}>{v}</td>)}</tr>)}</tbody></table></div>
    </Card>

    <Card>
      <SectionTitle sub="Parties les plus récentes">HISTORIQUE DE PERFORMANCE</SectionTitle>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 9.5 }}><thead><tr>{["Date","Résultat","Darts","Zones","Vols","Infligée","Lavée","Impact max"].map((h)=><th key={h} style={{ color:MUTED,textAlign:h==="Date"||h==="Résultat"?"left":"right",padding:"7px",borderBottom:"1px solid rgba(255,255,255,.08)" }}>{h}</th>)}</tr></thead><tbody>{[...matchRows].reverse().slice(0,20).map((r:any)=><tr key={r.id}><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)"}}>{r.label}</td><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",color:r.won?ACCENT:"#ff8a78",fontWeight:1000}}>{r.won?"VICTOIRE":"DÉFAITE"}</td>{[r.darts,r.zones,r.steals,r.dirtInflicted,r.dirtWashed,r.bestImpact].map((v:any,i:number)=><td key={i} style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",textAlign:"right",fontWeight:900}}>{v}</td>)}</tr>)}</tbody></table></div>
    </Card>
  </div>;
}
