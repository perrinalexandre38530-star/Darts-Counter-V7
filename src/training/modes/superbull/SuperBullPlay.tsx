import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { makeTrainingStats, type TrainingDart } from "../../lib/trainingDarts";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

type VisitRow = { score:number; hits:number; bulls:number; dbulls:number; labels:string[] };
const pct = (n:number,d:number) => d > 0 ? n / d * 100 : 0;

export default function SuperBullPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const target = Math.max(25, Math.floor(Number(config?.target || 100)));
  const maxDarts = Math.max(3, Math.floor(Number(config?.maxDarts || 30)));
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const dataRef = React.useRef({ darts:0,hits:0,points:0,bulls:0,dbulls:0,streak:0,bestStreak:0,perfectVisits:0,bestVisit:0,visits:[] as VisitRow[], dartPos:[{darts:0,hits:0,dbulls:0},{darts:0,hits:0,dbulls:0},{darts:0,hits:0,dbulls:0}] });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);
  const [dbullFlash, setDbullFlash] = React.useState(false);

  const finish = React.useCallback((success:boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const data = dataRef.current;
    const accuracyPct = pct(data.hits,data.darts);
    const dbullPct = pct(data.dbulls,data.darts);
    const completionPct = Math.min(100, data.points / target * 100);
    const pointsPerDart = data.darts ? data.points / data.darts : 0;
    const avg3 = pointsPerDart * 3;
    const stats = makeTrainingStats({ darts:data.darts,hits:data.hits,points:data.points,startedAt:startedAtRef.current,endedAt });
    const metrics = { target,maxDarts,bulls:data.bulls,dbulls:data.dbulls,bestStreak:data.bestStreak,perfectVisits:data.perfectVisits,bestVisit:data.bestVisit,accuracyPct,dbullPct,completionPct,pointsPerDart,avg3,visits:data.visits,dartPos:data.dartPos,score:completionPct };
    recordSoloTrainingResult({ modeId:"training_super_bull",config,participantIds:config?.selectedPlayerIds,startedAt:startedAtRef.current,endedAt,darts:data.darts,hits:data.hits,points:data.points,success,visitHistory:visitHistoryRef.current,metrics:{...metrics,accuracyPercent:accuracyPct} });
    setResult({ success,stats,metrics });
  },[config,maxDarts,target]);

  const onVisit = React.useCallback((darts:TrainingDart[]) => {
    if (endedRef.current || !darts.length) return;
    const data=dataRef.current;
    const remaining=Math.max(0,maxDarts-data.darts);
    const accepted=darts.slice(0,remaining);
    appendTrainingVisit(visitHistoryRef.current,accepted,{roundIndex:visitHistoryRef.current.length,result:"BULL"});
    let visitScore=0,visitHits=0,visitBulls=0,visitDbulls=0;
    const labels:string[]=[];
    accepted.forEach((dart,index)=>{
      if(endedRef.current||data.darts>=maxDarts)return;
      data.darts+=1;
      const pos=data.dartPos[index] || data.dartPos[0]; pos.darts+=1;
      const hit=!!(dart.bull||dart.dbull);
      const value=dart.dbull?50:dart.bull?25:0;
      labels.push(dart.dbull?"DBULL":dart.bull?"BULL":"MISS");
      if(hit){data.hits+=1;visitHits+=1;pos.hits+=1;data.points+=value;visitScore+=value;if(dart.dbull){data.dbulls+=1;visitDbulls+=1;pos.dbulls+=1;}else{data.bulls+=1;visitBulls+=1;}data.streak+=1;data.bestStreak=Math.max(data.bestStreak,data.streak);}else data.streak=0;
    });
    data.bestVisit=Math.max(data.bestVisit,visitScore);
    if(accepted.length===3&&visitHits===3)data.perfectVisits+=1;
    data.visits.push({score:visitScore,hits:visitHits,bulls:visitBulls,dbulls:visitDbulls,labels});
    if(visitDbulls>0){setDbullFlash(true);window.setTimeout(()=>setDbullFlash(false),650);}
    rerender();
    if(data.points>=target)finish(true);else if(data.darts>=maxDarts)finish(false);
  },[finish,maxDarts,target]);

  const data=dataRef.current;
  const accuracy=pct(data.hits,data.darts), dbullRate=pct(data.dbulls,data.darts), ppd=data.darts?data.points/data.darts:0, avg3=ppd*3;
  const remaining=Math.max(0,maxDarts-data.darts), needed=Math.max(0,target-data.points);
  const projectedDarts = ppd > 0 ? Math.ceil(needed/ppd) : null;
  const form = data.streak>=6?"LASER":data.streak>=4?"ON FIRE":data.streak>=2?"HOT":"CENTRE";
  const lastVisit=data.visits[data.visits.length-1];

  return <>
    <style>{css}</style>
    <TrainingPlayLayout
      title="Super Bull"
      tickerId="training_super_bull"
      onExit={onExit}
      participant={config?.activeParticipant}
      participantIndex={Number(config?.activeParticipantIndex || 0)+1}
      participantTotal={Number(config?.activeParticipantTotal || 1)}
      rules={<><p>BULL = 25 points, DBULL = 50 points. Toute autre zone vaut 0.</p><p>Atteins {target} points avant la limite de {maxDarts} fléchettes. Les badges HOT / ON FIRE / LASER sont visuels et ne multiplient jamais le score.</p></>}
      eyebrow="SUPER BULL · CENTRE DE CIBLE"
      target={`${data.points} / ${target}`}
      targetHint={`${needed} points restants · ${remaining} fléchettes disponibles`}
      progress={{value:data.points,max:target,label:"PROGRESSION OBJECTIF"}}
      kpis={[{label:"BULL",value:data.bulls},{label:"DBULL",value:data.dbulls},{label:"PRÉCISION",value:`${accuracy.toFixed(1)}%`},{label:"DARTS",value:`${data.darts}/${maxDarts}`}]}>
      <div className="sbt-v2">
        <section className={`sbt-target-wrap ${dbullFlash?"flash":""}`}>
          <div className="sbt-form"><span><small>FORME</small><b>{form}</b></span><em>{data.streak} hit{data.streak!==1?"s":""} de suite</em></div>
          <div className="sbt-target"><i className="outer"/><i className="bull"/><i className="dbull"/><span className="bulltxt">BULL<b>25</b></span><span className="dbulltxt">DBULL<b>50</b></span></div>
          <div className="sbt-live"><span><small>PTS / DART</small><b>{ppd.toFixed(1)}</b></span><span><small>AVG / 3</small><b>{avg3.toFixed(1)}</b></span><span><small>BEST SÉRIE</small><b>{data.bestStreak}</b></span><span><small>3/3 CENTRE</small><b>{data.perfectVisits}</b></span></div>
        </section>
        <section className="sbt-analysis">
          <div className="sbt-next"><span><small>À MARQUER</small><b>{needed}</b></span><span><small>FLÉCHETTES RESTANTES</small><b>{remaining}</b></span><span><small>DBULL RATE</small><b>{dbullRate.toFixed(1)}%</b></span><span><small>PROJECTION</small><b>{projectedDarts===null?"—":projectedDarts<=remaining?`${projectedDarts} darts":"HORS LIMITE"}</b></span></div>
          {lastVisit&&<div className="sbt-last"><header><span><small>DERNIÈRE VOLÉE</small><b>{lastVisit.score} PTS</b></span><em>{lastVisit.hits}/3 centre</em></header><div>{lastVisit.labels.map((label,i)=><span key={i} className={label.toLowerCase()}><small>D{i+1}</small><b>{label}</b></span>)}</div></div>}
          <div className="sbt-chart"><header><b>ÉVOLUTION DES VOLÉES</b><span>Best {data.bestVisit}</span></header><div>{data.visits.length?data.visits.map((v,i)=><i key={i} title={`Volée ${i+1} · ${v.score} pts`}><u style={{height:`${Math.max(5,v.score/150*100)}%`}}/><small>{v.score}</small></i>):<p>La courbe apparaîtra après la première volée.</p>}</div></div>
          <div className="sbt-position"><b>PRÉCISION PAR FLÉCHETTE</b><div>{data.dartPos.map((pos,i)=><span key={i}><small>D{i+1}</small><strong>{pct(pos.hits,pos.darts).toFixed(0)}%</strong><em>{pos.dbulls} DB</em></span>)}</div></div>
        </section>
      </div>
      <TrainingDartPad disabled={!!result} onVisit={onVisit} notice={<div style={{fontSize:10.5,textAlign:"center",opacity:.68}}>SUPER BULL ne compte que le centre : BULL 25 · DOUBLE + BULL = DBULL 50 · tout le reste = 0.</div>}/>
    </TrainingPlayLayout>
    <TrainingResultModal
      open={!!result}
      success={!!result?.success}
      title={result?.success?"SUPER BULL · OBJECTIF ATTEINT":"SUPER BULL · LIMITE ATTEINTE"}
      stats={result?.stats||makeTrainingStats({darts:0,hits:0,points:0,startedAt:Date.now()})}
      metrics={result?[{label:"BULL",value:result.metrics.bulls},{label:"DBULL",value:result.metrics.dbulls},{label:"PRÉCISION CENTRE",value:`${result.metrics.accuracyPct.toFixed(1)}%`},{label:"DBULL RATE",value:`${result.metrics.dbullPct.toFixed(1)}%`},{label:"PTS / DART",value:result.metrics.pointsPerDart.toFixed(1)},{label:"AVG / 3",value:result.metrics.avg3.toFixed(1)},{label:"BEST VOLÉE",value:result.metrics.bestVisit},{label:"MEILLEURE SÉRIE",value:result.metrics.bestStreak},{label:"VOLÉES 3/3",value:result.metrics.perfectVisits}]:[]}
      onClose={onExit}/>
  </>;
}

const css=`
.sbt-v2{display:grid;grid-template-columns:minmax(230px,.85fr) minmax(280px,1.15fr);gap:10px;margin-bottom:10px}.sbt-target-wrap,.sbt-analysis{padding:10px;border:1px solid #243748;border-radius:16px;background:linear-gradient(180deg,#09141e,#050b11)}.sbt-form{display:flex;justify-content:space-between;align-items:center;gap:8px}.sbt-form span{display:flex;flex-direction:column}.sbt-form small{font-size:6px;color:#708297;font-weight:1000;letter-spacing:.6px}.sbt-form b{font-size:14px;color:#27dcff}.sbt-form em{font-style:normal;font-size:7px;color:#92a2b3}.sbt-target{position:relative;width:min(230px,66vw);aspect-ratio:1;margin:8px auto;border-radius:50%;background:radial-gradient(circle,#ff4052 0 10%,#0c6845 10.5% 27%,#151f29 27.5% 72%,#060a0e 72.5%);border:4px solid #273746;box-shadow:inset 0 0 0 1px #607181,0 8px 25px #0008}.sbt-target i{position:absolute;border-radius:50%}.sbt-target .outer{inset:25%;border:1px dashed #ffffff18}.sbt-target .bull{inset:29%;border:1px solid #54f3ad55}.sbt-target .dbull{inset:42%;border:1px solid #ff899455}.sbt-target span{position:absolute;left:50%;transform:translateX(-50%);font-size:6px;text-align:center;font-weight:1000}.sbt-target span b{display:block;font-size:9px}.sbt-target .bulltxt{top:27%;color:#6ff2b5}.sbt-target .dbulltxt{top:43%;color:#fff}.sbt-target-wrap.flash .dbull{animation:sbtPulse .55s ease-out}.sbt-live{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.sbt-live span,.sbt-next span{padding:6px;border:1px solid #243647;border-radius:9px;background:#071019;display:flex;flex-direction:column;text-align:center}.sbt-live small,.sbt-next small{font-size:5.8px;color:#73859a;font-weight:1000}.sbt-live b,.sbt-next b{font-size:12px;color:#fff}.sbt-next{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.sbt-last,.sbt-chart,.sbt-position{margin-top:7px;padding:8px;border:1px solid #263747;border-radius:11px;background:#071019}.sbt-last header,.sbt-chart header{display:flex;justify-content:space-between;align-items:center}.sbt-last header span{display:flex;flex-direction:column}.sbt-last header small{font-size:6px;color:#77899e;font-weight:1000}.sbt-last header b,.sbt-chart header b{font-size:10px}.sbt-last header em,.sbt-chart header span{font-size:7px;color:#8ea0b3;font-style:normal}.sbt-last>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}.sbt-last>div span{padding:6px;border-radius:8px;border:1px solid #2b3b4b;display:flex;flex-direction:column;text-align:center}.sbt-last>div small{font-size:5.5px;color:#7d8da0}.sbt-last>div b{font-size:8px}.sbt-last .bull{border-color:#296d52;color:#59eaa5}.sbt-last .dbull{border-color:#813845;color:#ff6c7a}.sbt-last .miss{color:#8b99a8}.sbt-chart>div{height:72px;display:flex;align-items:flex-end;gap:4px;margin-top:5px}.sbt-chart i{position:relative;flex:1;height:100%;min-width:12px;border-radius:5px;background:#0d1823;overflow:hidden;display:flex;align-items:flex-end}.sbt-chart u{display:block;width:100%;background:linear-gradient(180deg,#2adeff,#146879);text-decoration:none}.sbt-chart small{position:absolute;left:0;right:0;bottom:2px;text-align:center;font-size:5.5px;color:#fff;font-weight:1000;text-shadow:0 1px 3px #000}.sbt-chart p{margin:auto;color:#718296;font-size:8px}.sbt-position>b{font-size:7px;color:#8da0b4}.sbt-position>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:5px}.sbt-position span{display:flex;flex-direction:column;text-align:center;padding:5px;border-radius:7px;background:#0b1620}.sbt-position small{font-size:5.5px;color:#75869a}.sbt-position strong{font-size:11px}.sbt-position em{font-size:5.5px;color:#ff7180;font-style:normal}@keyframes sbtPulse{0%{box-shadow:0 0 0 0 #ff405288}100%{box-shadow:0 0 0 28px #ff405200}}@media(prefers-reduced-motion:reduce){.sbt-target-wrap.flash .dbull{animation:none}}@media(max-width:720px){.sbt-v2{grid-template-columns:1fr}.sbt-target{width:min(210px,62vw)}}
`;
