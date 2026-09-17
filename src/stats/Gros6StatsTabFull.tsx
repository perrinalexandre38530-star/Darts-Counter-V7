// @ts-nocheck
import * as React from "react";

const ACCENT = "#ff9d25";
const PANEL = "rgba(255,255,255,.055)";
const STROKE = "rgba(255,255,255,.10)";

type Props = { records: any[]; playerId?: string | null };

function modeOf(rec: any) {
  return [rec?.kind, rec?.mode, rec?.summary?.mode, rec?.payload?.mode, rec?.payload?.config?.mode]
    .filter(Boolean).join("|").toLowerCase();
}
function dateOf(rec: any) { return Number(rec?.finishedAt || rec?.updatedAt || rec?.createdAt || 0); }
function pct(v: any) { const n = Number(v || 0); return `${n.toFixed(n >= 10 ? 0 : 1)}%`; }
function num(v: any, digits = 0) { const n = Number(v || 0); return Number.isFinite(n) ? n.toFixed(digits) : "0"; }
function topEntries(map: any, n = 5) {
  return Object.entries(map || {}).map(([label, value]) => ({ label, value: Number(value || 0) })).filter((x) => x.value > 0).sort((a,b) => b.value-a.value).slice(0,n);
}
function Kpi({ label, value, sub }: any) {
  return <div style={{ border:`1px solid ${STROKE}`, background:PANEL, borderRadius:15, padding:11, minWidth:0 }}>
    <div style={{ color:"rgba(226,232,240,.68)", fontSize:9, fontWeight:900, letterSpacing:.7, textTransform:"uppercase" }}>{label}</div>
    <div style={{ marginTop:4, color:ACCENT, fontSize:21, lineHeight:1, fontWeight:1000 }}>{value}</div>
    {sub ? <div style={{ marginTop:5, color:"rgba(226,232,240,.58)", fontSize:9.5 }}>{sub}</div> : null}
  </div>;
}
function Bar({ label, value, total }: any) {
  const pc = total > 0 ? Math.max(0, Math.min(100, Number(value||0)*100/total)) : 0;
  return <div style={{ display:"grid", gridTemplateColumns:"92px 1fr 38px", alignItems:"center", gap:8 }}>
    <div style={{ color:"#e8e9f2", fontSize:10, fontWeight:850, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
    <div style={{ height:8, background:"rgba(255,255,255,.07)", borderRadius:999, overflow:"hidden" }}><div style={{ height:"100%", width:`${pc}%`, background:ACCENT, borderRadius:999 }} /></div>
    <div style={{ color:"#fff", fontSize:10, fontWeight:950, textAlign:"right" }}>{value}</div>
  </div>;
}

export default function Gros6StatsTabFull({ records, playerId }: Props) {
  const matches = React.useMemo(() => (records || []).filter((r:any) => {
    const m = modeOf(r); return m.includes("gros_6") || m.includes("gros 6") || m.includes("gros6") || m.includes("big_6") || m.includes("big 6") || m.includes("big6");
  }).sort((a:any,b:any)=>dateOf(b)-dateOf(a)), [records]);

  const rows = React.useMemo(() => matches.map((rec:any) => {
    const candidates = rec?.payload?.stats?.players || rec?.stats?.players || rec?.summary?.perPlayer || rec?.summary?.rankings || [];
    const row = Array.isArray(candidates) ? candidates.find((p:any) => String(p?.playerId ?? p?.id ?? "") === String(playerId ?? "")) : null;
    return row ? { ...row, rec } : null;
  }).filter(Boolean), [matches, playerId]);

  const agg = React.useMemo(() => {
    const out:any = { games:rows.length,wins:0,targetsFaced:0,validations:0,attackDarts:0,d1:0,d2:0,d3:0,livesLost:0,lastDartSaves:0,targetsImposed:0,selectionAttempts:0,selectionSuccesses:0,distribution:{},specialZones:{},playedTargets:{},validatedTargets:{},imposedTargets:{} };
    const merge=(dst:any,src:any)=>Object.entries(src||{}).forEach(([k,v])=>dst[k]=Number(dst[k]||0)+Number(v||0));
    for (const r of rows) {
      if (r.isWinner) out.wins++;
      for (const k of ["targetsFaced","validations","attackDarts","d1","d2","d3","livesLost","lastDartSaves","targetsImposed","selectionAttempts","selectionSuccesses"]) out[k]+=Number(r[k]||0);
      merge(out.distribution,r.distribution); merge(out.specialZones,r.specialZones); merge(out.playedTargets,r.playedTargets); merge(out.validatedTargets,r.validatedTargets); merge(out.imposedTargets,r.imposedTargets);
    }
    out.validationRate = out.targetsFaced ? out.validations*100/out.targetsFaced : 0;
    out.dartsPerTarget = out.targetsFaced ? out.attackDarts/out.targetsFaced : 0;
    out.selectionEfficiency = out.selectionAttempts ? out.selectionSuccesses*100/out.selectionAttempts : 0;
    return out;
  }, [rows]);

  if (!playerId) return <div style={{ padding:18, color:"#cdd1e5" }}>Sélectionne un joueur pour afficher ses statistiques Gros 6.</div>;
  if (!rows.length) return <div style={{ padding:18, color:"#cdd1e5" }}>Aucune statistique Gros 6 détaillée pour ce joueur.</div>;

  const dartTotal = Object.values(agg.distribution).reduce((a:any,b:any)=>Number(a)+Number(b||0),0) as number;
  const distOrder = ["GROS","PETIT","DOUBLE","TRIPLE","BULL","DBULL","MISS","SPECIAL"];
  return <div style={{ display:"grid", gap:14, color:"#fff" }}>
    <div style={{ border:`1px solid ${ACCENT}55`, background:"linear-gradient(180deg,rgba(255,157,37,.12),rgba(0,0,0,.18))", borderRadius:18, padding:14 }}>
      <div style={{ color:ACCENT, fontSize:18, fontWeight:1000, letterSpacing:.8 }}>GROS 6 — STATISTIQUES</div>
      <div style={{ color:"rgba(226,232,240,.70)", fontSize:10.5, marginTop:4 }}>{agg.games} partie(s) analysée(s)</div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))", gap:8 }}>
      <Kpi label="Victoires" value={agg.wins} />
      <Kpi label="Validation" value={pct(agg.validationRate)} sub={`${agg.validations}/${agg.targetsFaced} cibles`} />
      <Kpi label="Darts / cible" value={num(agg.dartsPerTarget,2)} />
      <Kpi label="D1 / D2 / D3" value={`${agg.d1} / ${agg.d2} / ${agg.d3}`} />
      <Kpi label="Vies perdues" value={agg.livesLost} />
      <Kpi label="Sauvetages D3" value={agg.lastDartSaves} />
      <Kpi label="Cibles imposées" value={agg.targetsImposed} />
      <Kpi label="Efficacité sélection" value={pct(agg.selectionEfficiency)} sub={`${agg.selectionSuccesses}/${agg.selectionAttempts}`} />
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:10 }}>
      <section style={{ border:`1px solid ${STROKE}`, background:PANEL, borderRadius:16, padding:12 }}>
        <div style={{ color:ACCENT, fontWeight:950, fontSize:11, marginBottom:10 }}>RÉPARTITION DES TOUCHES</div>
        <div style={{ display:"grid", gap:8 }}>{distOrder.map(k => <Bar key={k} label={k === "SPECIAL" ? "ZONES HORS CIBLE" : k} value={Number(agg.distribution[k]||0)} total={dartTotal} />)}</div>
      </section>
      <section style={{ border:`1px solid ${STROKE}`, background:PANEL, borderRadius:16, padding:12 }}>
        <div style={{ color:ACCENT, fontWeight:950, fontSize:11, marginBottom:10 }}>ZONES SPÉCIALES TOUCHÉES</div>
        {topEntries(agg.specialZones,8).length ? <div style={{ display:"grid", gap:8 }}>{topEntries(agg.specialZones,8).map(x=><Bar key={x.label} label={x.label} value={x.value} total={Math.max(1,Object.values(agg.specialZones).reduce((a:any,b:any)=>Number(a)+Number(b||0),0) as number)} />)}</div> : <div style={{ color:"rgba(226,232,240,.55)", fontSize:10 }}>Aucune zone spéciale enregistrée.</div>}
      </section>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
      {[ ["CIBLES LES PLUS JOUÉES",agg.playedTargets], ["CIBLES LES PLUS VALIDÉES",agg.validatedTargets], ["CIBLES LES PLUS IMPOSÉES",agg.imposedTargets] ].map(([title,map]:any)=><section key={title} style={{ border:`1px solid ${STROKE}`, background:PANEL, borderRadius:16, padding:12 }}>
        <div style={{ color:ACCENT, fontWeight:950, fontSize:10.5, marginBottom:9 }}>{title}</div>
        <div style={{ display:"grid", gap:6 }}>{topEntries(map,6).map((x,i)=><div key={x.label} style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:10.5 }}><span style={{ color:"#e9eaf3" }}>{i+1}. {x.label}</span><b style={{ color:ACCENT }}>{x.value}</b></div>)}</div>
      </section>)}
    </div>

    <section style={{ border:`1px solid ${STROKE}`, background:PANEL, borderRadius:16, padding:12 }}>
      <div style={{ color:ACCENT, fontWeight:950, fontSize:11, marginBottom:9 }}>DERNIÈRES PARTIES</div>
      <div style={{ display:"grid", gap:7 }}>{rows.slice(0,8).map((r:any,i:number)=><div key={`${r.rec?.id||i}`} style={{ display:"grid", gridTemplateColumns:"90px 1fr auto", gap:8, alignItems:"center", padding:"8px 9px", borderRadius:11, background:"rgba(0,0,0,.20)" }}>
        <span style={{ color:"rgba(226,232,240,.58)", fontSize:9.5 }}>{new Date(dateOf(r.rec)).toLocaleDateString("fr-FR")}</span>
        <span style={{ color:"#fff", fontSize:10.5 }}>{r.isWinner ? "Victoire" : "Partie"} • {r.validations || 0}/{r.targetsFaced || 0} validées</span>
        <b style={{ color:ACCENT, fontSize:10 }}>{pct(r.validationRate)}</b>
      </div>)}</div>
    </section>
  </div>;
}
