// @ts-nocheck
// ============================================================
// LOTERIE — Centre de statistiques "MAX"
// - KPIs complets + comparateurs période précédente
// - Courbes multi-métriques
// - Camemberts pseudo-3D
// - Bar charts variantes / cibles / équipes
// - Radar de profil + heatmap segments
// - Cartons, régularité, séries, rendement, teams
// ============================================================
import React from "react";

const GOLD = "#F6C256";
const CYAN = "#42D6FF";
const GOOD = "#70EFBD";
const PINK = "#FF63B8";
const BAD = "#FF718A";
const ORANGE = "#FF9B52";
const VIOLET = "#A78BFA";
const BLUE = "#60A5FA";
const EDGE = "rgba(255,255,255,.10)";
const SOFT = "rgba(255,255,255,.66)";
const CARD = "linear-gradient(180deg,rgba(17,18,20,.96),rgba(10,12,16,.94))";
const COLORS = [GOLD, CYAN, GOOD, PINK, ORANGE, VIOLET, BLUE, BAD];

type RangeKey = "all" | "day" | "week" | "month" | "year";

const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const txt = (v: any) => String(v ?? "").trim();
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));
const pctNum = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0;
const pct = (a: number, b: number) => `${round1(pctNum(a, b))}%`;
const round1 = (v: number) => Math.round((Number(v) || 0) * 10) / 10;
const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const playedAt = (r: any) => n(r?.finishedAt ?? r?.endedAt ?? r?.updatedAt ?? r?.createdAt);
const fmt1 = (v: any) => Number(v || 0).toFixed(1);
const fmt2 = (v: any) => Number(v || 0).toFixed(2);

function isLoterie(r: any) {
  const blob = [r?.kind, r?.mode, r?.gameId, r?.summary?.kind, r?.summary?.mode, r?.payload?.kind, r?.payload?.mode, r?.payload?.stats?.mode].map((x) => txt(x).toLowerCase()).join("|");
  return blob.includes("loterie");
}
function participantMode(r: any) {
  const mode = txt(r?.summary?.participantMode ?? r?.payload?.participantMode ?? r?.payload?.config?.participantMode ?? r?.participantMode).toLowerCase();
  return mode === "teams" ? "teams" : "players";
}
function variantKey(r: any) {
  const variant = txt(r?.summary?.variant ?? r?.payload?.config?.variant ?? r?.variant).toLowerCase();
  if (variant !== "express") return "classic";
  return `express_${txt(r?.summary?.expressTarget ?? r?.payload?.config?.expressTarget ?? "simple").toLowerCase()}`;
}
function variantLabel(key: string) {
  if (key === "classic") return "3 DARTS";
  if (key === "express_simple") return "SIMPLE";
  if (key === "express_double") return "DOUBLE";
  if (key === "express_triple") return "TRIPLE";
  return key.toUpperCase();
}
function playerPools(r: any) {
  return [r?.payload?.stats?.players, r?.payload?.players, r?.payload?.summary?.players, r?.summary?.players, r?.summary?.perPlayer, r?.players].filter(Array.isArray);
}
function teamPools(r: any) {
  return [r?.payload?.stats?.teams, r?.payload?.teams, r?.payload?.summary?.teams, r?.summary?.teams, r?.teams, r?.summary?.rankings].filter(Array.isArray);
}
function findTeam(r: any, teamId: any) {
  const id = txt(teamId);
  if (!id) return null;
  for (const arr of teamPools(r)) {
    const row = arr.find((x: any) => [x?.id, x?.teamId, x?.entityId].some((v) => txt(v) === id));
    if (row) return row;
  }
  return null;
}
function findRow(r: any, playerId: string, playerName?: string | null) {
  const pid = txt(playerId);
  const pname = txt(playerName).toLowerCase();
  for (const arr of playerPools(r)) {
    const byId = arr.find((x: any) => [x?.id, x?.playerId, x?.profileId].some((v) => txt(v) === pid));
    if (byId) return byId;
    if (pname) {
      const byName = arr.find((x: any) => txt(x?.name ?? x?.playerName ?? x?.displayName).toLowerCase() === pname);
      if (byName) return byName;
    }
  }
  if (participantMode(r) === "teams") {
    for (const arr of teamPools(r)) {
      const team = arr.find((x: any) => [...(x?.memberIds || []), ...(x?.playerIds || []), ...(x?.players || [])].map(txt).includes(pid));
      if (team) return { ...team, id: pid, playerId: pid, profileId: pid, teamId: team?.id || team?.teamId, teamName: team?.name, legacyTeamProjection: true, participantMode: "teams" };
    }
  }
  return null;
}
function winnerIds(r: any) {
  const values = [r?.winnerPlayerIds, r?.summary?.winnerPlayerIds, r?.payload?.winnerPlayerIds, r?.winnerId, r?.summary?.winnerId, r?.payload?.winnerId];
  return values.flatMap((v: any) => Array.isArray(v) ? v : v ? [v] : []).map(txt).filter(Boolean);
}
function didWin(r: any, row: any, playerId: string) {
  if (row?.win === true || row?.winner === true) return true;
  const ids = winnerIds(r);
  if (ids.includes(txt(playerId))) return true;
  if (row?.teamId && ids.includes(txt(row.teamId))) return true;
  return false;
}
function recordEvents(r: any) {
  const pools = [r?.payload?.events, r?.payload?.visitHistory, r?.events, r?.visitHistory, r?.summary?.events];
  return pools.find(Array.isArray) || [];
}
function eventBelongs(ev: any, record: any, row: any, playerId: string) {
  const pid = txt(playerId);
  if (participantMode(record) === "teams") {
    const actor = txt(ev?.actorId ?? ev?.memberId);
    if (actor) return actor === pid;
    if (row?.legacyTeamProjection) {
      return [ev?.entityId, ev?.teamEntityId, ev?.playerId, ev?.teamId].map(txt).includes(txt(row?.teamId));
    }
    return false;
  }
  return [ev?.playerId, ev?.actorId, ev?.entityId].map(txt).includes(pid);
}
function playerEvents(record: any, row: any, playerId: string) {
  return recordEvents(record).filter((ev: any) => eventBelongs(ev, record, row, playerId));
}
function rangeStart(range: RangeKey) {
  const now = new Date();
  if (range === "all") return 0;
  if (range === "day") { now.setHours(0,0,0,0); return now.getTime(); }
  if (range === "week") { now.setDate(now.getDate() - 7); return now.getTime(); }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return new Date(now.getFullYear(), 0, 1).getTime();
}
function previousBounds(range: RangeKey) {
  const now = new Date();
  if (range === "day") {
    const current = new Date(now); current.setHours(0,0,0,0);
    const prev = new Date(current); prev.setDate(prev.getDate() - 1);
    return [prev.getTime(), current.getTime()];
  }
  if (range === "week") {
    const curStart = Date.now() - 7 * 86400000;
    return [curStart - 7 * 86400000, curStart];
  }
  if (range === "month") {
    const current = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    return [prev, current];
  }
  if (range === "year") {
    const current = new Date(now.getFullYear(), 0, 1).getTime();
    const prev = new Date(now.getFullYear() - 1, 0, 1).getTime();
    return [prev, current];
  }
  return [0,0];
}
function sum(rows: any[], key: string) { return rows.reduce((s,r)=>s+n(r?.[key]),0); }
function best(rows: any[], key: string) { return rows.reduce((m,r)=>Math.max(m,n(r?.[key])),0); }
function minPositive(rows: any[], key: string) { const vals = rows.map((r)=>n(r?.[key])).filter((v)=>v>0); return vals.length ? Math.min(...vals) : 0; }
function mean(values: number[]) { return values.length ? values.reduce((a,b)=>a+b,0) / values.length : 0; }
function median(values: number[]) { if (!values.length) return 0; const a=[...values].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function stddev(values: number[]) { if (values.length < 2) return 0; const m=mean(values); return Math.sqrt(mean(values.map((v)=>(v-m)*(v-m)))); }

const card: React.CSSProperties = { background: CARD, border: `1px solid ${EDGE}`, borderRadius: 20, padding: 14, boxShadow: "0 10px 26px rgba(0,0,0,.35)", minWidth: 0 };
const titleStyle: React.CSSProperties = { color: GOLD, fontSize: 13, fontWeight: 1000, letterSpacing: .9, textTransform: "uppercase", textShadow: "0 0 8px rgba(246,194,86,.55)" };

function Kpi({ label, value, detail, color = GOLD, delta, compact = false }: any) {
  const d = Number(delta);
  const hasDelta = Number.isFinite(d) && Math.abs(d) >= .05;
  return <div style={{ borderRadius: 15, border: `1px solid ${color}24`, background: `linear-gradient(145deg,${color}0f,rgba(255,255,255,.025))`, padding: compact ? 8 : 10, minWidth: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,.035), 0 7px 18px rgba(0,0,0,.14)` }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:5 }}><div style={{ color: "#9298aa", fontSize: compact ? 7.6 : 8.5, fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>{hasDelta ? <div style={{ color:d>0?GOOD:BAD,fontSize:7.2,fontWeight:1000,whiteSpace:"nowrap" }}>{d>0?"▲":"▼"}{Math.abs(d).toFixed(1)}</div>:null}</div>
    <div style={{ marginTop: 3, color, fontSize: compact ? 16 : 19, lineHeight: 1, fontWeight: 1000 }}>{value}</div>
    {detail ? <div style={{ marginTop: 4, color: "#9fa5b7", fontSize: compact ? 7.7 : 8.8, lineHeight: 1.25 }}>{detail}</div> : null}
  </div>;
}
function Section({ title, subtitle, children, right }: any) {
  return <section style={{ ...card, marginTop: 11 }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start" }}><div><div style={titleStyle}>{title}</div>{subtitle ? <div style={{ marginTop: 3, color: SOFT, fontSize: 9.5, lineHeight:1.35 }}>{subtitle}</div> : null}</div>{right}</div><div style={{ marginTop: 10 }}>{children}</div></section>;
}
function RangePills({ value, onChange }: any) {
  const options: [RangeKey,string][] = [["day","Jour"],["week","7 jours"],["month","Mois"],["year","Année"],["all","Tout"]];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5, marginTop: 10 }}>{options.map(([key,label])=><button key={key} type="button" onClick={()=>onChange(key)} style={{ minHeight: 30, borderRadius: 999, border: `1px solid ${value===key ? GOLD : "rgba(255,255,255,.10)"}`, background: value===key ? "rgba(246,194,86,.12)" : "rgba(255,255,255,.035)", color: value===key ? GOLD : "#b7bccb", fontSize: 8.5, fontWeight: 1000 }}>{label}</button>)}</div>;
}
function MetricBar({ label, value, max, color = GOLD, detail, secondaryValue, secondaryColor = "rgba(255,255,255,.22)" }: any) {
  const w = max > 0 ? clamp((Number(value||0)/max)*100) : 0;
  const w2 = max > 0 ? clamp((Number(secondaryValue||0)/max)*100) : 0;
  return <div><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 9 }}><span style={{ color: "#d4d7e0", fontWeight: 900, minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{label}</span><span style={{ color, fontWeight: 1000, whiteSpace:"nowrap" }}>{detail ?? value}</span></div><div style={{ marginTop: 4, height: 8, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", position:"relative" }}>{secondaryValue != null ? <div style={{ position:"absolute",left:0,top:0,bottom:0,width:`${w2}%`,borderRadius:999,background:secondaryColor }} />:null}<div style={{ position:"absolute",left:0,top:0,bottom:0,width: `${w}%`, borderRadius: 999, background: color, boxShadow: `0 0 12px ${color}55` }} /></div></div>;
}

function Pie3D({ data, centerTop, centerBottom, size = 150 }: any) {
  const clean = (data || []).filter((x:any)=>n(x.value)>0);
  const total = clean.reduce((s:any,x:any)=>s+n(x.value),0);
  let cursor = 0;
  const stops:string[]=[];
  clean.forEach((x:any,i:number)=>{ const start=cursor; cursor += total ? (n(x.value)/total)*100 : 0; stops.push(`${x.color || COLORS[i%COLORS.length]} ${start}% ${cursor}%`); });
  const gradient = total ? `conic-gradient(${stops.join(",")})` : "conic-gradient(rgba(255,255,255,.10) 0 100%)";
  return <div style={{ display:"grid",gridTemplateColumns:`${size}px minmax(0,1fr)`,gap:12,alignItems:"center",minWidth:0 }}>
    <div style={{ width:size,height:Math.round(size*.72),position:"relative",margin:"0 auto" }}>
      <div style={{ position:"absolute",left:"8%",right:"8%",top:"18%",height:"70%",borderRadius:"50%",background:gradient,transform:"rotateX(58deg) translateY(11px)",filter:"brightness(.38) saturate(.82)",boxShadow:"0 15px 24px rgba(0,0,0,.48)" }} />
      <div style={{ position:"absolute",left:"8%",right:"8%",top:"8%",height:"70%",borderRadius:"50%",background:gradient,transform:"rotateX(58deg)",boxShadow:"inset 0 0 0 2px rgba(255,255,255,.11), 0 6px 14px rgba(0,0,0,.28)" }} />
      <div style={{ position:"absolute",left:"33%",right:"33%",top:"25%",height:"37%",borderRadius:"50%",background:"linear-gradient(180deg,#11151d,#080a0f)",transform:"rotateX(58deg)",boxShadow:"inset 0 2px 10px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.06)" }} />
      <div style={{ position:"absolute",inset:0,display:"grid",placeItems:"center",paddingTop:4,pointerEvents:"none" }}><div style={{textAlign:"center"}}><div style={{color:GOLD,fontSize:18,fontWeight:1000,lineHeight:1}}>{centerTop ?? total}</div><div style={{color:SOFT,fontSize:7.5,fontWeight:900,marginTop:3,textTransform:"uppercase"}}>{centerBottom || "TOTAL"}</div></div></div>
    </div>
    <div style={{display:"grid",gap:5,minWidth:0}}>{clean.length ? clean.map((x:any,i:number)=><div key={`${x.label}-${i}`} style={{display:"grid",gridTemplateColumns:"8px minmax(0,1fr) auto",gap:6,alignItems:"center",fontSize:8.5}}><span style={{width:8,height:8,borderRadius:999,background:x.color || COLORS[i%COLORS.length],boxShadow:`0 0 9px ${x.color || COLORS[i%COLORS.length]}66`}}/><span style={{color:"#cfd3df",fontWeight:850,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</span><span style={{color:x.color || COLORS[i%COLORS.length],fontWeight:1000}}>{n(x.value)} <span style={{color:SOFT,fontSize:7}}>· {round1(pctNum(n(x.value),total))}%</span></span></div>) : <div style={{color:SOFT,fontSize:9}}>Pas encore de données.</div>}</div>
  </div>;
}

function LineChart({ data, series, height = 160 }: any) {
  const safe = (data || []).slice(-30);
  if (safe.length < 2) return <div style={{height:110,display:"grid",placeItems:"center",color:SOFT,fontSize:9.5}}>Deux parties au minimum sont nécessaires pour tracer une courbe.</div>;
  const all = safe.flatMap((d:any)=>series.map((s:any)=>n(d[s.key])));
  const min = Math.min(...all,0); const max = Math.max(...all,1); const span=Math.max(.0001,max-min);
  const point = (v:number,i:number)=>({x:8+(i/Math.max(1,safe.length-1))*84,y:88-((v-min)/span)*72});
  return <div style={{position:"relative",height,borderRadius:15,border:"1px solid rgba(255,255,255,.06)",background:"linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008))",overflow:"hidden"}}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
      {[16,40,64,88].map(y=><line key={y} x1="7" y1={y} x2="94" y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".45" vectorEffect="non-scaling-stroke"/>)}
      {series.map((s:any)=>{ const pts=safe.map((d:any,i:number)=>{const p=point(n(d[s.key]),i);return `${p.x},${p.y}`}).join(" "); return <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth="2.1" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>; })}
      {series.map((s:any)=>safe.map((d:any,i:number)=>{ const p=point(n(d[s.key]),i); return <circle key={`${s.key}-${i}`} cx={p.x} cy={p.y} r="1.15" fill={s.color} vectorEffect="non-scaling-stroke"/>; }))}
    </svg>
    <div style={{position:"absolute",left:8,top:6,color:SOFT,fontSize:7.5}}>MAX {round1(max)}</div><div style={{position:"absolute",left:8,bottom:5,color:SOFT,fontSize:7.5}}>MIN {round1(min)}</div>
    <div style={{position:"absolute",right:7,top:6,display:"flex",flexWrap:"wrap",justifyContent:"flex-end",gap:7}}>{series.map((s:any)=><span key={s.key} style={{color:s.color,fontSize:7.2,fontWeight:1000}}>● {s.label}</span>)}</div>
  </div>;
}

function GroupedBars({ rows, metrics, maxValue, suffix = "" }: any) {
  const safe=(rows||[]).slice(0,10); const mx=maxValue || Math.max(1,...safe.flatMap((r:any)=>metrics.map((m:any)=>n(r[m.key]))));
  return <div style={{display:"grid",gap:9}}>{safe.map((r:any,i:number)=><div key={`${r.label}-${i}`}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{color:"#d7dbe6",fontSize:9,fontWeight:950,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>{r.label}</div><div style={{display:"flex",gap:6,flex:"0 0 auto"}}>{metrics.map((m:any)=><span key={m.key} style={{color:m.color,fontSize:7.5,fontWeight:1000}}>{m.short || m.label} {round1(n(r[m.key]))}{suffix}</span>)}</div></div><div style={{display:"grid",gap:3,marginTop:4}}>{metrics.map((m:any)=><div key={m.key} style={{height:5,borderRadius:999,background:"rgba(255,255,255,.055)",overflow:"hidden"}}><div style={{height:"100%",width:`${clamp((n(r[m.key])/mx)*100)}%`,background:m.color,borderRadius:999,boxShadow:`0 0 10px ${m.color}44`}}/></div>)}</div></div>)}</div>;
}

function Radar({ values }: any) {
  const axes=[
    ["VICTOIRES",clamp(values.win)], ["PRÉCISION",clamp(values.hit)], ["RENDEMENT",clamp(values.eff)],
    ["MULTI",clamp(values.multi)], ["CARTON",clamp(values.progress)], ["RÉGULARITÉ",clamp(values.regularity)]
  ];
  const cx=50,cy=50,R=34;
  const polar=(i:number,r:number)=>{const a=(-Math.PI/2)+(i/axes.length)*Math.PI*2;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
  const ring=(f:number)=>axes.map((_,i)=>polar(i,R*f).join(",")).join(" ");
  const poly=axes.map(([_,v],i)=>polar(i,R*(Number(v)/100)).join(",")).join(" ");
  return <div style={{display:"grid",gridTemplateColumns:"minmax(180px,.8fr) minmax(0,1.2fr)",gap:10,alignItems:"center"}}><svg viewBox="0 0 100 100" style={{width:"100%",maxWidth:245,margin:"0 auto",overflow:"visible"}}>{[.25,.5,.75,1].map(f=><polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth=".55"/>)}{axes.map((_,i)=>{const [x,y]=polar(i,R);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.09)" strokeWidth=".5"/>})}<polygon points={poly} fill="rgba(246,194,86,.20)" stroke={GOLD} strokeWidth="1.6"/><circle cx={cx} cy={cy} r="2" fill={GOLD}/></svg><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{axes.map(([label,value],i)=><div key={label} style={{padding:8,borderRadius:12,background:`${COLORS[i%COLORS.length]}0c`,border:`1px solid ${COLORS[i%COLORS.length]}22`}}><div style={{color:SOFT,fontSize:7.4,fontWeight:900}}>{label}</div><div style={{marginTop:2,color:COLORS[i%COLORS.length],fontSize:16,fontWeight:1000}}>{Math.round(Number(value))}</div></div>)}</div></div>;
}

function DeltaCompare({ items, hasPrevious }: any) {
  if (!hasPrevious) return <div style={{color:SOFT,fontSize:9.5}}>Pas assez de données sur la période précédente pour calculer les comparateurs.</div>;
  return <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>{items.map((it:any)=>{ const d=n(it.current)-n(it.previous); const positive = it.lowerIsBetter ? d < 0 : d > 0; const flat=Math.abs(d)<.05; const tone=flat?SOFT:(positive?GOOD:BAD); return <div key={it.label} style={{borderRadius:14,padding:10,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)"}}><div style={{color:SOFT,fontSize:7.8,fontWeight:950,textTransform:"uppercase"}}>{it.label}</div><div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:6,marginTop:4}}><span style={{color:it.color||GOLD,fontSize:17,fontWeight:1000}}>{it.format?it.format(it.current):round1(it.current)}</span><span style={{color:tone,fontSize:8.2,fontWeight:1000}}>{flat?"＝":d>0?"▲":"▼"} {Math.abs(d).toFixed(1)}{it.suffix||""}</span></div><div style={{marginTop:3,color:"#7f8596",fontSize:7.4}}>avant : {it.format?it.format(it.previous):round1(it.previous)}</div></div>})}</div>;
}

function SegmentHeatmap({ counts }: any) {
  const cells=[...Array.from({length:20},(_,i)=>i+1),25]; const max=Math.max(1,...cells.map(v=>n(counts?.[v])));
  return <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:5}}>{cells.map((v:any)=>{const c=n(counts?.[v]);const intensity=c/max;return <div key={v} style={{minHeight:46,borderRadius:11,border:`1px solid rgba(66,214,255,${.12+intensity*.52})`,background:`linear-gradient(180deg,rgba(66,214,255,${.04+intensity*.28}),rgba(246,194,86,${intensity*.12}))`,display:"grid",placeItems:"center",textAlign:"center",boxShadow:intensity>.6?"0 0 13px rgba(66,214,255,.13)":"none"}}><div><div style={{color:v===25?GOLD:"#fff",fontSize:13,fontWeight:1000}}>{v===25?"BULL":v}</div><div style={{color:SOFT,fontSize:7.2,marginTop:2}}>{c} dart{c>1?"s":""}</div></div></div>})}</div>;
}

function summarizeSubset(items: any[], playerId: string) {
  const rows=items.map((x:any)=>x.row); const games=rows.length; const wins=items.filter((x:any)=>didWin(x.record,x.row,playerId)).length;
  const visits=sum(rows,"visits"), success=sum(rows,"successfulVisits"), cells=sum(rows,"cellsRevealed"), multi=sum(rows,"multiHits");
  const avgVolley=visits?sum(rows,"totalVolleyScore")/visits:0;
  return {games,wins,winRate:pctNum(wins,games),hitRate:pctNum(success,visits),cellsPerVisit:visits?cells/visits:0,avgVolley,multiRate:pctNum(multi,visits),progress:mean(rows.map((r:any)=>n(r?.bestCardProgress)))};
}

export default function LoterieStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState<RangeKey>("all");
  const allMatches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isLoterie).map((record) => {
    const row = findRow(record, String(playerId || ""), playerName);
    const team = row?.teamId ? findTeam(record, row.teamId) : null;
    const events = row ? playerEvents(record,row,String(playerId||"")) : [];
    return { record, row, team, events };
  }).filter((x) => x.row).sort((a,b)=>playedAt(b.record)-playedAt(a.record)), [records, playerId, playerName]);

  const start = rangeStart(range);
  const matches = React.useMemo(() => allMatches.filter(({record}) => !start || playedAt(record) >= start), [allMatches, start]);
  const rows = matches.map((x) => x.row);
  const allPlayerEvents = matches.flatMap((x:any)=>x.events || []);
  const games = rows.length;
  const wins = matches.filter(({record,row}) => didWin(record,row,String(playerId))).length;
  const losses = games - wins;
  const teamMatches = matches.filter(({record}) => participantMode(record) === "teams");
  const soloMatches = matches.filter(({record}) => participantMode(record) !== "teams");
  const teamWins = teamMatches.filter(({record,row}) => didWin(record,row,String(playerId))).length;
  const darts = sum(rows,"dartsThrown");
  const visits = sum(rows,"visits");
  const success = sum(rows,"successfulVisits");
  const empty = sum(rows,"emptyVisits");
  const cells = sum(rows,"cellsRevealed");
  const multi = sum(rows,"multiHits");
  const maxHit = best(rows,"maxCellsInVisit");
  const bestStreak = best(rows,"bestStreak");
  const maxVolley = best(rows,"maxVolley");
  const totalVolley = sum(rows,"totalVolleyScore");
  const avgVolley = visits ? totalVolley / visits : 0;
  const avgCells = visits ? cells / visits : 0;
  const avgDartsPerVisit = visits ? darts / visits : 0;
  const cellsPer100Darts = darts ? (cells/darts)*100 : 0;
  const cellsPerSuccess = success ? cells/success : 0;
  const multiRate = pctNum(multi,visits);
  const successRate = pctNum(success,visits);
  const progressValues = rows.map((r)=>n(r?.bestCardProgress)).filter((v)=>v>=0);
  const avgProgress = mean(progressValues);
  const totalCellsPerCard = mean(rows.map((r:any)=>n(r?.cellsPerCard || r?.cards?.[0]?.total || r?.cards?.[0]?.cells?.length || 10))) || 10;
  const progressPct = pctNum(avgProgress,totalCellsPerCard);
  const finishVisits = rows.filter((r) => n(r?.completedOnVisit) > 0).map((r)=>n(r.completedOnVisit));
  const avgFinish = mean(finishVisits);
  const bestFinish = minPositive(rows,"completedOnVisit");
  const worstFinish = finishVisits.length ? Math.max(...finishVisits) : 0;
  const cardsCompleted = sum(rows,"cardsCompleted");
  const cardsPlayed = sum(rows,"cardsCount") || games;
  const allCards = rows.flatMap((r:any)=>Array.isArray(r?.cards)?r.cards:[]);
  const avgAllCardProgress = allCards.length ? mean(allCards.map((c:any)=>n(c?.progress))) : avgProgress;
  const nearCompleteCards = allCards.filter((c:any)=>{const t=n(c?.total||totalCellsPerCard);return t>0 && n(c?.progress)/t>=.8 && n(c?.progress)<t;}).length;
  const untouchedCards = allCards.filter((c:any)=>n(c?.progress)===0).length;
  const singles = sum(rows,"singles"), doubles = sum(rows,"doubles"), triples = sum(rows,"triples"), bulls = sum(rows,"bulls"), dbulls = sum(rows,"dbulls"), dartMisses = sum(rows,"dartMisses");
  const derivedDarts = allPlayerEvents.reduce((acc:any,ev:any)=>{ for(const d of Array.isArray(ev?.darts)?ev.darts:[]){ const v=n(d?.v),m=n(d?.mult); acc.total++; acc.points += n(d?.score ?? (v*m)); if(!v||!m){acc.miss++;continue;} acc.segment[v]=(acc.segment[v]||0)+1; if(v===25&&m===2)acc.dbull++; else if(v===25)acc.bull++; else if(m===3)acc.triple++; else if(m===2)acc.double++; else acc.single++; } return acc; },{total:0,points:0,miss:0,single:0,double:0,triple:0,bull:0,dbull:0,segment:{}});
  const dartTotal = derivedDarts.total || darts;
  const dartMissTotal = derivedDarts.total ? derivedDarts.miss : dartMisses;
  const dartPointTotal = derivedDarts.total ? derivedDarts.points : sum(rows,"dartPoints");
  const avgDartScore = dartTotal ? dartPointTotal/dartTotal : 0;
  const dartOnBoardRate = pctNum(Math.max(0,dartTotal-dartMissTotal),dartTotal);
  const S = derivedDarts.total ? derivedDarts.single : singles, D = derivedDarts.total ? derivedDarts.double : doubles, T = derivedDarts.total ? derivedDarts.triple : triples, B = derivedDarts.total ? derivedDarts.bull : bulls, DB = derivedDarts.total ? derivedDarts.dbull : dbulls;

  const hitHistogram = { zero:0, one:0, two:0, three:0 };
  const scoreMap = new Map<string,{label:string,attempts:number,hits:number,reveals:number,misses:number}>();
  if (allPlayerEvents.length) {
    allPlayerEvents.forEach((ev:any)=>{
      const rev=n(ev?.revealed); if(rev<=0)hitHistogram.zero++; else if(rev===1)hitHistogram.one++; else if(rev===2)hitHistogram.two++; else hitHistogram.three++;
      const label=txt(ev?.resultLabel ?? ev?.volleyScore ?? "0") || "0"; const cur=scoreMap.get(label)||{label,attempts:0,hits:0,reveals:0,misses:0}; cur.attempts++; cur.reveals+=rev; if(rev>0)cur.hits++; else cur.misses++; scoreMap.set(label,cur);
    });
  } else {
    hitHistogram.zero=empty; hitHistogram.one=Math.max(0,success-multi); hitHistogram.two=multi;
  }
  const jackpots = hitHistogram.three;
  const doubleHits = hitHistogram.two;
  const productiveScores=[...scoreMap.values()].sort((a,b)=>b.reveals-a.reveals || b.hits-a.hits || b.attempts-a.attempts);
  const missedScores=[...scoreMap.values()].sort((a,b)=>b.misses-a.misses || b.attempts-a.attempts);
  const mostProductive=productiveScores[0]; const mostMissed=missedScores[0];

  const classic = matches.filter(({record}) => variantKey(record)==="classic").length;
  const simple = matches.filter(({record}) => variantKey(record)==="express_simple").length;
  const dbl = matches.filter(({record}) => variantKey(record)==="express_double").length;
  const tpl = matches.filter(({record}) => variantKey(record)==="express_triple").length;

  const variantStats = ["classic","express_simple","express_double","express_triple"].map((key)=>{
    const subset=matches.filter((x:any)=>variantKey(x.record)===key); const rr=subset.map((x:any)=>x.row); const vv=sum(rr,"visits"), ss=sum(rr,"successfulVisits"), cc=sum(rr,"cellsRevealed"), mm=sum(rr,"multiHits"), dd=sum(rr,"dartsThrown"); const ww=subset.filter((x:any)=>didWin(x.record,x.row,String(playerId))).length;
    return { label:variantLabel(key), key, games:subset.length, winRate:pctNum(ww,subset.length), hitRate:pctNum(ss,vv), cellsPerVisit:vv?cc/vv:0, multiRate:pctNum(mm,vv), cellsPer100Darts:dd?(cc/dd)*100:0 };
  }).filter((x)=>x.games>0);

  const chronological=[...matches].reverse();
  const trend = chronological.map(({record,row}:any,i:number)=>({ label:String(i+1), hit:pctNum(n(row?.successfulVisits),n(row?.visits)), progress:pctNum(n(row?.bestCardProgress),n(row?.cellsPerCard || 10)), cells:n(row?.visits)?n(row?.cellsRevealed)/n(row?.visits):0, volley:n(row?.averageVolley), multi:pctNum(n(row?.multiHits),n(row?.visits)) }));
  const hitRates=trend.map((x:any)=>x.hit); const regularity = clamp(100 - stddev(hitRates)*2.1);
  const medianHit=median(hitRates);
  const averageRank=mean(rows.map((r:any)=>n(r?.rank)).filter((v)=>v>0));
  let currentWinStreak=0,bestWinStreak=0,rolling=0;
  chronological.forEach(({record,row}:any)=>{if(didWin(record,row,String(playerId))){rolling++;bestWinStreak=Math.max(bestWinStreak,rolling);}else rolling=0;}); currentWinStreak=rolling;
  const podiums=rows.filter((r:any)=>n(r?.rank)>0&&n(r?.rank)<=3).length;

  let previousItems:any[]=[];
  if (range === "all") {
    const currentChunk=allMatches.slice(0,Math.min(5,allMatches.length)); const prevChunk=allMatches.slice(currentChunk.length,currentChunk.length*2); previousItems=prevChunk; 
  } else {
    const [ps,pe]=previousBounds(range); previousItems=allMatches.filter(({record})=>playedAt(record)>=ps&&playedAt(record)<pe);
  }
  const currentCompare = range === "all" ? summarizeSubset(allMatches.slice(0,Math.min(5,allMatches.length)),String(playerId)) : summarizeSubset(matches,String(playerId));
  const previousCompare = summarizeSubset(previousItems,String(playerId));

  const teamNames = new Map<string,any>();
  teamMatches.forEach(({record,row,team}:any) => {
    const id = txt(row?.teamId || team?.id || row?.teamName || "team");
    const teamCells=n(team?.cellsRevealed || team?.score || 0); const contribution=n(row?.cellsRevealed);
    const cur = teamNames.get(id) || { id, name:txt(row?.teamName || team?.name || "Équipe"), games:0,wins:0,cells:0,visits:0,success:0,darts:0,multi:0,teamCells:0,contribution:0,members:new Set<string>() };
    cur.games++; cur.wins += didWin(record,row,String(playerId))?1:0; cur.cells += contribution; cur.visits += n(row?.visits); cur.success += n(row?.successfulVisits); cur.darts += n(row?.dartsThrown); cur.multi += n(row?.multiHits); cur.teamCells += teamCells; cur.contribution += contribution;
    const members=Array.isArray(team?.members)?team.members:[]; members.forEach((m:any)=>cur.members.add(txt(m?.name||m?.displayName||m?.id)));
    teamNames.set(id,cur);
  });
  const teamRows=[...teamNames.values()].map((x:any)=>({ ...x, winRate:pctNum(x.wins,x.games), hitRate:pctNum(x.success,x.visits), cellsPerVisit:x.visits?x.cells/x.visits:0, contributionShare:x.teamCells?pctNum(x.contribution,x.teamCells):0 })).sort((a,b)=>b.games-a.games||b.winRate-a.winRate);

  const profileRadar={ win:pctNum(wins,games), hit:successRate, eff:clamp(cellsPer100Darts*2.7), multi:clamp(multiRate*3.3), progress:progressPct, regularity };

  if (!playerId) return <div style={{ padding: 16, color: SOFT }}>Sélectionne un joueur pour afficher ses statistiques LOTERIE.</div>;

  return <div style={{ padding: 12, minWidth: 0 }}>
    <section style={card}>
      <div style={titleStyle}>🎰 LOTERIE — CENTRE DE PERFORMANCE</div>
      <div style={{ marginTop: 4, color: SOFT, fontSize: 10, lineHeight: 1.4 }}>Dashboard complet : résultats, cartons, précision, cibles, volées, régularité, comparateurs, variantes et performances individuelles / équipes.</div>
      <RangePills value={range} onChange={setRange} />
    </section>

    {!games ? <section style={{ ...card, marginTop: 11, color: SOFT }}>Aucune partie LOTERIE terminée sur cette période.</section> : <>
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        <Kpi label="Parties" value={games} detail={`${soloMatches.length} solo · ${teamMatches.length} teams`} color={GOLD} />
        <Kpi label="Win rate" value={pct(wins,games)} detail={`${wins} W · ${losses} L`} color={GOOD} delta={currentCompare.winRate-previousCompare.winRate} />
        <Kpi label="Taux découverte" value={`${round1(successRate)}%`} detail={`${success} hits · ${empty} ratés`} color={CYAN} delta={currentCompare.hitRate-previousCompare.hitRate} />
        <Kpi label="Cases / tour" value={fmt2(avgCells)} detail={`${cells} cases révélées`} color={GOOD} delta={currentCompare.cellsPerVisit-previousCompare.cellsPerVisit} />
        <Kpi label="Progression carton" value={`${round1(progressPct)}%`} detail={`${fmt1(avgProgress)}/${fmt1(totalCellsPerCard)} moyen`} color={GOLD} />
        <Kpi label="Multi-hit rate" value={`${round1(multiRate)}%`} detail={`${multi} multi · record ${maxHit}`} color={PINK} delta={currentCompare.multiRate-previousCompare.multiRate} />
        <Kpi label="Rendement / 100 darts" value={fmt1(cellsPer100Darts)} detail={`${fmt2(avgDartsPerVisit)} darts / tour`} color={ORANGE} />
        <Kpi label="Régularité" value={`${Math.round(regularity)}/100`} detail={`médiane HIT ${fmt1(medianHit)}%`} color={VIOLET} />
        <Kpi label="Meilleure série" value={bestStreak} detail={`série W ${bestWinStreak} · actuelle ${currentWinStreak}`} color={GOOD} />
        <Kpi label="Rang moyen" value={averageRank?fmt2(averageRank):"—"} detail={`${podiums} podium${podiums>1?"s":""}`} color={BLUE} />
        <Kpi label="Score / dart" value={fmt1(avgDartScore)} detail={`${dartPointTotal} points cumulés`} color={CYAN} />
        <Kpi label="Darts sur cible" value={`${round1(dartOnBoardRate)}%`} detail={`${dartMissTotal} MISS / ${dartTotal}`} color={dartOnBoardRate>=75?GOOD:ORANGE} />
      </div>

      <Section title="Comparateur de période" subtitle={range==="all"?"5 dernières parties comparées aux 5 précédentes.":"Période sélectionnée comparée à la période précédente équivalente."}>
        <DeltaCompare hasPrevious={previousCompare.games>0} items={[
          {label:"Win rate",current:currentCompare.winRate,previous:previousCompare.winRate,suffix:" pt",color:GOOD,format:(v:any)=>`${fmt1(v)}%`},
          {label:"Taux découverte",current:currentCompare.hitRate,previous:previousCompare.hitRate,suffix:" pt",color:CYAN,format:(v:any)=>`${fmt1(v)}%`},
          {label:"Cases / tour",current:currentCompare.cellsPerVisit,previous:previousCompare.cellsPerVisit,color:GOLD,format:(v:any)=>fmt2(v)},
          {label:"Volée moyenne",current:currentCompare.avgVolley,previous:previousCompare.avgVolley,color:ORANGE,format:(v:any)=>fmt1(v)},
          {label:"Multi rate",current:currentCompare.multiRate,previous:previousCompare.multiRate,suffix:" pt",color:PINK,format:(v:any)=>`${fmt1(v)}%`},
          {label:"Meilleur carton",current:currentCompare.progress,previous:previousCompare.progress,color:VIOLET,format:(v:any)=>fmt1(v)},
        ]}/>
      </Section>

      <Section title="Courbes de performance" subtitle="Évolution partie par partie : précision, progression des cartons, rendement et multi-hits.">
        <LineChart data={trend} series={[{key:"hit",label:"HIT %",color:GOOD},{key:"progress",label:"CARTON %",color:GOLD},{key:"multi",label:"MULTI %",color:PINK}]} height={170}/>
        <div style={{marginTop:9}}><LineChart data={trend} series={[{key:"cells",label:"CASES / TOUR",color:CYAN},{key:"volley",label:"VOLÉE MOY.",color:ORANGE}]} height={145}/></div>
      </Section>

      <Section title="Camemberts 3D — lecture rapide" subtitle="Répartition visuelle des résultats, des types de darts, des variantes et des issues de match.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
          <div style={{borderRadius:15,padding:8,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.055)"}}><div style={{color:GOOD,fontSize:9,fontWeight:1000,marginBottom:4}}>TOURS</div><Pie3D size={132} centerTop={`${round1(successRate)}%`} centerBottom="DÉCOUVERTE" data={[{label:"Avec découverte",value:success,color:GOOD},{label:"À vide",value:empty,color:BAD}]}/></div>
          <div style={{borderRadius:15,padding:8,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.055)"}}><div style={{color:CYAN,fontSize:9,fontWeight:1000,marginBottom:4}}>DARTS</div><Pie3D size={132} centerTop={dartTotal} centerBottom="FLÉCHETTES" data={[{label:"Simple",value:S,color:CYAN},{label:"Double",value:D,color:GOOD},{label:"Triple",value:T,color:PINK},{label:"Bull",value:B+DB,color:GOLD},{label:"MISS",value:dartMissTotal,color:BAD}]}/></div>
          <div style={{borderRadius:15,padding:8,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.055)"}}><div style={{color:GOLD,fontSize:9,fontWeight:1000,marginBottom:4}}>VARIANTES</div><Pie3D size={132} centerTop={games} centerBottom="PARTIES" data={[{label:"3 darts",value:classic,color:GOLD},{label:"Simple",value:simple,color:CYAN},{label:"Double",value:dbl,color:GOOD},{label:"Triple",value:tpl,color:PINK}]}/></div>
          <div style={{borderRadius:15,padding:8,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.055)"}}><div style={{color:VIOLET,fontSize:9,fontWeight:1000,marginBottom:4}}>RÉSULTATS</div><Pie3D size={132} centerTop={`${round1(pctNum(wins,games))}%`} centerBottom="WIN RATE" data={[{label:"Victoires",value:wins,color:GOOD},{label:"Défaites",value:losses,color:BAD}]}/></div>
        </div>
      </Section>

      <Section title="Profil LOTERIE — radar" subtitle="Indice synthétique sur 100 : résultats, précision, rendement, multi-hits, progression et régularité.">
        <Radar values={profileRadar}/>
      </Section>

      <Section title="Distribution des découvertes" subtitle="Nombre de cases ouvertes par tour. Le 3+ matérialise les tours jackpot.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7}}>
          <Kpi compact label="0 case" value={hitHistogram.zero} detail={pct(hitHistogram.zero,visits)} color={BAD}/>
          <Kpi compact label="1 case" value={hitHistogram.one} detail={pct(hitHistogram.one,visits)} color={GOOD}/>
          <Kpi compact label="2 cases" value={hitHistogram.two} detail={pct(hitHistogram.two,visits)} color={PINK}/>
          <Kpi compact label="3+ jackpot" value={hitHistogram.three} detail={pct(hitHistogram.three,visits)} color={GOLD}/>
        </div>
        <div style={{marginTop:10,display:"grid",gap:8}}>
          <MetricBar label="Tours positifs" value={success} max={Math.max(1,visits)} color={GOOD} detail={`${fmt1(successRate)}%`}/>
          <MetricBar label="Double hits" value={doubleHits} max={Math.max(1,visits)} color={PINK} detail={`${doubleHits}`}/>
          <MetricBar label="Jackpots 3+" value={jackpots} max={Math.max(1,visits)} color={GOLD} detail={`${jackpots}`}/>
          <MetricBar label="Tours à vide" value={empty} max={Math.max(1,visits)} color={BAD} detail={`${fmt1(pctNum(empty,visits))}%`}/>
        </div>
      </Section>

      <Section title="Volées & rendement" subtitle="Analyse du score produit et de son efficacité réelle pour ouvrir les cartons.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>
          <Kpi label="Volée moyenne" value={fmt1(avgVolley)} detail={`${visits} tours`} color={CYAN}/>
          <Kpi label="Meilleure volée" value={maxVolley} detail="record de partie" color={GOLD}/>
          <Kpi label="Cases / hit" value={fmt2(cellsPerSuccess)} detail="quand le tour est positif" color={GOOD}/>
          <Kpi label="Cases / 100 darts" value={fmt1(cellsPer100Darts)} detail="indice de rendement" color={ORANGE}/>
          <Kpi label="Darts / tour" value={fmt2(avgDartsPerVisit)} detail={`${darts} darts`} color={BLUE}/>
          <Kpi label="Points / dart" value={fmt1(avgDartScore)} detail={`${dartPointTotal} pts`} color={VIOLET}/>
        </div>
      </Section>

      <Section title="Cartons — profondeur statistique" subtitle="Progression moyenne de tous les cartons, cartons proches du jackpot et vitesse de complétion.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>
          <Kpi label="Cartons joués" value={cardsPlayed} detail={`${cardsCompleted} complété${cardsCompleted>1?"s":""}`} color={GOLD}/>
          <Kpi label="Progression globale" value={fmt1(avgAllCardProgress)} detail="cases moyennes / carton" color={CYAN}/>
          <Kpi label="Meilleur carton moyen" value={`${fmt1(avgProgress)}/${fmt1(totalCellsPerCard)}`} detail={`${fmt1(progressPct)}%`} color={GOOD}/>
          <Kpi label="Cartons à ≥80%" value={nearCompleteCards} detail="non encore complets" color={PINK}/>
          <Kpi label="Cartons intacts" value={untouchedCards} detail="0 case découverte" color={BAD}/>
          <Kpi label="Complétions" value={finishVisits.length} detail={`${pct(finishVisits.length,games)} des matchs`} color={GOLD}/>
          <Kpi label="Complétion moyenne" value={avgFinish?`${fmt1(avgFinish)} tours`:"—"} detail="sur les victoires" color={GOOD}/>
          <Kpi label="Record vitesse" value={bestFinish?`${bestFinish} tours`:"—"} detail={worstFinish?`plus long ${worstFinish}`:"aucune victoire"} color={ORANGE}/>
        </div>
      </Section>

      <Section title="Variantes — comparateur bâtons" subtitle="Win rate, précision, multi-hits et rendement selon le mode choisi en configuration.">
        {variantStats.length ? <GroupedBars rows={variantStats} maxValue={100} metrics={[{key:"winRate",label:"Win",short:"WIN",color:GOOD},{key:"hitRate",label:"Hit",short:"HIT",color:CYAN},{key:"multiRate",label:"Multi",short:"MULTI",color:PINK}] } suffix="%"/> : <div style={{color:SOFT,fontSize:9}}>Aucune variante à comparer.</div>}
        <div style={{marginTop:10,display:"grid",gridTemplateColumns:`repeat(${Math.min(4,Math.max(1,variantStats.length))},minmax(0,1fr))`,gap:6}}>{variantStats.map((v:any)=><div key={v.key} style={{padding:8,borderRadius:12,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.055)",textAlign:"center"}}><div style={{color:GOLD,fontSize:8,fontWeight:1000}}>{v.label}</div><div style={{color:CYAN,fontSize:14,fontWeight:1000,marginTop:3}}>{fmt2(v.cellsPerVisit)}</div><div style={{color:SOFT,fontSize:6.8}}>cases / tour</div><div style={{color:ORANGE,fontSize:10,fontWeight:1000,marginTop:3}}>{fmt1(v.cellsPer100Darts)}</div><div style={{color:SOFT,fontSize:6.5}}>cases / 100 darts</div></div>)}</div>
      </Section>

      <Section title="Cibles & scores — intelligence de jeu" subtitle="Quels scores ouvrent le plus de cases et lesquels génèrent le plus de tours ratés ? Disponible avec l'historique détaillé des nouvelles parties.">
        {productiveScores.length ? <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7,marginBottom:10}}><Kpi label="Score le + productif" value={mostProductive?.label || "—"} detail={`${mostProductive?.reveals||0} cases · ${mostProductive?.hits||0} hits`} color={GOOD}/><Kpi label="Score le + raté" value={mostMissed?.label || "—"} detail={`${mostMissed?.misses||0} ratés / ${mostMissed?.attempts||0}`} color={BAD}/></div>
          <GroupedBars rows={productiveScores.slice(0,8).map((x:any)=>({...x,label:x.label,hitRate:pctNum(x.hits,x.attempts)}))} metrics={[{key:"reveals",label:"Cases",short:"CASES",color:GOLD},{key:"attempts",label:"Tentatives",short:"ESSAIS",color:CYAN},{key:"misses",label:"Ratés",short:"RATÉS",color:BAD}]}/>
        </> : <div style={{color:SOFT,fontSize:9.5}}>Les anciennes parties ne contiennent pas toujours le détail des scores tentés. Les prochaines parties alimenteront automatiquement ce graphique.</div>}
      </Section>

      <Section title="Heatmap des segments" subtitle="Fréquence réelle des numéros touchés par les fléchettes du profil (1–20 + Bull).">
        <SegmentHeatmap counts={derivedDarts.segment}/>
      </Section>

      <Section title="Impacts de fléchettes" subtitle="Répartition complète S / D / T / Bull / DBull / MISS et précision générale.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>
          <Kpi compact label="Simples" value={S} detail={pct(S,dartTotal)} color={CYAN}/><Kpi compact label="Doubles" value={D} detail={pct(D,dartTotal)} color={GOOD}/><Kpi compact label="Triples" value={T} detail={pct(T,dartTotal)} color={PINK}/>
          <Kpi compact label="Bull" value={B} detail={pct(B,dartTotal)} color={GOLD}/><Kpi compact label="DBull" value={DB} detail={pct(DB,dartTotal)} color={ORANGE}/><Kpi compact label="MISS" value={dartMissTotal} detail={pct(dartMissTotal,dartTotal)} color={BAD}/>
        </div>
      </Section>

      <Section title="Statistiques en équipes" subtitle="Résultat collectif + contribution personnelle, rendement et part de cases ouvertes dans chaque équipe.">
        {teamMatches.length ? <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}><Kpi label="Matchs teams" value={teamMatches.length} detail={`${teamWins} victoires`} color={CYAN}/><Kpi label="Win rate teams" value={pct(teamWins,teamMatches.length)} detail="résultat de ton équipe" color={GOOD}/></div>
          <div style={{marginTop:10}}><GroupedBars rows={teamRows} maxValue={100} metrics={[{key:"winRate",short:"WIN",color:GOOD},{key:"hitRate",short:"HIT",color:CYAN},{key:"contributionShare",short:"PART",color:PINK}]} suffix="%"/></div>
          <div style={{marginTop:10,display:"grid",gap:7}}>{teamRows.map((team:any)=><div key={team.id} style={{padding:10,borderRadius:14,border:"1px solid rgba(255,255,255,.06)",background:"rgba(255,255,255,.025)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div style={{minWidth:0}}><div style={{fontWeight:1000,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{team.name}</div><div style={{color:SOFT,fontSize:7.8,marginTop:2}}>{team.members?.size?`${team.members.size} membres · `:""}{team.games} matchs · {team.cells} cases personnelles</div></div><div style={{textAlign:"right"}}><div style={{color:GOOD,fontSize:16,fontWeight:1000}}>{fmt1(team.winRate)}%</div><div style={{color:SOFT,fontSize:6.8}}>WIN</div></div></div><div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}><Kpi compact label="Cases / tour" value={fmt2(team.cellsPerVisit)} color={CYAN}/><Kpi compact label="Contribution" value={`${fmt1(team.contributionShare)}%`} color={PINK}/><Kpi compact label="Multi" value={team.multi} color={GOLD}/></div></div>)}</div>
        </> : <div style={{color:SOFT,fontSize:10}}>Aucune partie en équipes sur la période sélectionnée.</div>}
      </Section>

      <Section title="Stats cumulées — LOTERIE" subtitle="Tableau exhaustif du profil sur la période sélectionnée.">
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:560,fontSize:9.2}}><tbody>{[
          ["Sessions",games],["Victoires",wins],["Défaites",losses],["Win rate",pct(wins,games)],["Rang moyen",averageRank?fmt2(averageRank):"—"],["Podiums",podiums],["Série victoires max",bestWinStreak],["Série victoires actuelle",currentWinStreak],
          ["Tours",visits],["Tours positifs",success],["Tours à vide",empty],["Taux découverte",`${fmt1(successRate)}%`],["Cases révélées",cells],["Cases / tour",fmt2(avgCells)],["Cases / hit",fmt2(cellsPerSuccess)],["Cases / 100 darts",fmt1(cellsPer100Darts)],
          ["Multi-hits",multi],["Multi rate",`${fmt1(multiRate)}%`],["Double hits",doubleHits],["Jackpots 3+",jackpots],["Record cases / tour",maxHit],["Meilleure série découverte",bestStreak],["Régularité",`${Math.round(regularity)}/100`],["Médiane HIT",`${fmt1(medianHit)}%`],
          ["Darts",darts],["Darts / tour",fmt2(avgDartsPerVisit)],["Darts sur cible",`${fmt1(dartOnBoardRate)}%`],["Score / dart",fmt1(avgDartScore)],["Points cumulés",dartPointTotal],["Simples",S],["Doubles",D],["Triples",T],["Bull",B],["DBull",DB],["MISS",dartMissTotal],
          ["Volée moyenne",fmt1(avgVolley)],["Meilleure volée",maxVolley],["Cartons joués",cardsPlayed],["Cartons complétés",cardsCompleted],["Progression globale / carton",fmt1(avgAllCardProgress)],["Meilleur carton moyen",fmt1(avgProgress)],["Progression meilleur carton",`${fmt1(progressPct)}%`],["Cartons ≥80%",nearCompleteCards],["Cartons intacts",untouchedCards],["Complétion moyenne",avgFinish?fmt1(avgFinish):"—"],["Meilleure complétion",bestFinish||"—"],["Complétion la + longue",worstFinish||"—"],
          ["Matchs équipes",teamMatches.length],["Victoires équipes",teamWins],["Win rate équipes",pct(teamWins,teamMatches.length)],["Matchs solo",soloMatches.length]
        ].map(([label,value]:any)=><tr key={label}><td style={{padding:"7px 6px",color:"#aeb3c3",borderBottom:"1px solid rgba(255,255,255,.055)"}}>{label}</td><td style={{padding:"7px 6px",color:GOLD,fontWeight:1000,textAlign:"right",borderBottom:"1px solid rgba(255,255,255,.055)"}}>{value}</td></tr>)}</tbody></table></div>
      </Section>

      <Section title="Historique détaillé" subtitle="Les 20 dernières parties avec résultat, variante, mode, carton, rendement et statistiques clés.">
        <div style={{display:"grid",gap:7}}>{matches.slice(0,20).map(({record,row,team}:any,i:number)=>{
          const won=didWin(record,row,String(playerId)); const date=playedAt(record)?new Date(playedAt(record)).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—"; const vk=variantKey(record); const teamMode=participantMode(record)==="teams"; const total=n(row?.cellsPerCard||record?.payload?.config?.cellsPerCard||10); const hit=pctNum(n(row?.successfulVisits),n(row?.visits)); const eff=n(row?.visits)?n(row?.cellsRevealed)/n(row?.visits):0;
          return <div key={record?.id||i} style={{display:"grid",gridTemplateColumns:"45px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:9,borderRadius:14,background:won?"rgba(246,194,86,.07)":"rgba(255,255,255,.025)",border:`1px solid ${won?GOLD+"55":"rgba(255,255,255,.06)"}`}}><div style={{width:40,height:40,borderRadius:12,display:"grid",placeItems:"center",background:won?GOLD:"rgba(255,255,255,.06)",color:won?"#171008":"#c4c8d5",fontWeight:1000,fontSize:9}}>{won?"WIN":`#${n(row?.rank)||"—"}`}</div><div style={{minWidth:0}}><div style={{fontWeight:1000,fontSize:10.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{date} · {variantLabel(vk)} · {teamMode?"TEAMS":"SOLO"}{teamMode?` · ${row?.teamName||team?.name||"Équipe"}`:""}</div><div style={{marginTop:3,display:"flex",gap:7,flexWrap:"wrap",color:"#9fa5b7",fontSize:7.8,fontWeight:850}}><span style={{color:CYAN}}>HIT {fmt1(hit)}%</span><span>CASES {n(row?.cellsRevealed)}</span><span style={{color:GOOD}}>{fmt2(eff)}/tour</span><span style={{color:PINK}}>MULTI {n(row?.multiHits)}</span><span>SÉRIE {n(row?.bestStreak)}</span><span style={{color:ORANGE}}>AVG {fmt1(row?.averageVolley)}</span></div></div><div style={{textAlign:"right"}}><div style={{color:GOLD,fontWeight:1000,fontSize:16}}>{n(row?.bestCardProgress)}/{total}</div><div style={{color:"#9298aa",fontSize:7}}>carton</div></div></div>;
        })}</div>
      </Section>
    </>}
  </div>;
}
