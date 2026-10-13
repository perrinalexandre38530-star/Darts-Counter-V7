// @ts-nocheck
import React from "react";
import type { Dart as UIDart } from "../../lib/types";

const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));

function dartValue(d:any){
  if(!d)return 0;
  const v=Number(d?.v||0),m=Number(d?.mult||1);
  if(v===0)return 0;
  if(v===50)return 50;
  if(v===25)return m===2?50:25;
  return v*Math.max(1,Math.min(3,m));
}
function dartText(d:any){
  if(!d)return "—";
  const v=Number(d?.v||0),m=Number(d?.mult||1);
  if(v===0)return "MISS";
  if(v===50||(v===25&&m===2))return "DBULL";
  if(v===25)return "BULL";
  const ring=String(d?.label||"").toLowerCase();
  if(m===1&&ring==="inner_single")return `S-IN ${v}`;
  if(m===1&&ring==="outer_single")return `S-OUT ${v}`;
  return `${m===3?"T":m===2?"D":"S"}${v}`;
}

function Frame({children,accent,title,kicker,status,statusTone="normal",className=""}:any){
  return <section className={`gameplay-visual ${className}`} style={{["--gv-accent" as any]:accent||"#ffc04c"}}>
    <header className="gameplay-visual__head"><div><small>{kicker}</small><b>{title}</b></div>{status?<span className={`gameplay-visual__status is-${statusTone}`}>{status}</span>:null}</header>
    <div className="gameplay-visual__body">{children}</div>
  </section>;
}

function DartSlot({dart,index,state="pending",meta}:any){
  return <div className={`gv-dart is-${state}`}><small>F{index+1}</small><b>{dartText(dart)}</b><span>{dart?dartValue(dart):"—"}</span>{meta?<em>{meta}</em>:null}</div>;
}

export function FiftyOneByFiveGameplayVisual({accent,currentThrow=[],rawTotal=0,dividedScore=0,valid=false,bust=false,activeScore=0,projected=0,target=51,requireThreeScoringDarts=true}:any){
  const darts=(currentThrow||[]).slice(0,3),complete=darts.length>=3||!requireThreeScoringDarts;
  const remain=Math.max(0,Number(target)-Number(activeScore));
  const finishRaw=remain*5;
  const status=bust?"BUST":valid?"VOLÉE VALIDE":darts.length?(complete?"NON VALIDE":"À COMPLÉTER"):"PRÊT";
  const tone=bust?"danger":valid?"success":darts.length&&complete?"danger":"normal";
  const nextMultiple=Math.ceil(Math.max(0,Number(rawTotal))/5)*5;
  const deltaToMultiple=Math.max(0,nextMultiple-Number(rawTotal));
  return <Frame accent={accent} kicker="CALCUL EN DIRECT" title="DIVISE PAR 5" status={status} statusTone={tone} className="gv-51">
    <div className="gv-51__grid">
      <div className="gv-darts">{[0,1,2].map(i=><DartSlot key={i} dart={darts[i]} index={i} state={!darts[i]?"pending":bust?"danger":valid?"success":"filled"}/>)}</div>
      <div className={`gv-equation ${bust?"is-danger":valid?"is-success":""}`}><small>TOTAL BRUT</small><b>{rawTotal||0}</b><i>÷ 5</i><strong>{valid&&!bust?`+${dividedScore}`:"—"}</strong><span>{valid&&!bust?`${activeScore} → ${projected}`:`score ${activeScore}/${target}`}</span></div>
    </div>
    <div className="gv-51__footer"><div className="gv-progress"><i style={{width:`${clamp((activeScore/Math.max(1,target))*100)}%`}}/><u style={{left:`${clamp((projected/Math.max(1,target))*100)}%`}}/></div><span>{finishRaw<=180?`FINISH POSSIBLE : ${finishRaw} BRUT`:(darts.length&&!valid&&deltaToMultiple?`+${deltaToMultiple} pour atteindre un multiple de 5`:`RESTE ${remain}`)}</span></div>
  </Frame>;
}

export function LooperGameplayVisual({accent,currentThrow=[],phase="playing",targetLabel="—",hitIndex=-1,nextTargetLabel="—",lives=0,shields=0}:any){
  const darts=(currentThrow||[]).slice(0,3),hit=Number(hitIndex)>=0;
  const status=phase==="assignment"?"CHOISIS LA CIBLE":hit?"BOUCLE SAUVÉE":darts.length>=3?"VIE EN DANGER":"VISE LA CIBLE";
  const tone=hit?"success":darts.length>=3?"danger":"normal";
  return <Frame accent={accent} kicker={phase==="assignment"?"MISE EN JEU":"BOUCLE ACTIVE"} title="CIBLE EXACTE" status={status} statusTone={tone} className="gv-looper">
    <div className="gv-loop__row">
      <div className={`gv-target-orb ${hit?"is-hit":""}`}><small>{phase==="assignment"?"DÉPART":"À TOUCHER"}</small><b>{phase==="assignment"?"?":targetLabel}</b><span>{phase==="assignment"?"1 fléchette":"zone exacte"}</span></div>
      <div className="gv-loop__flow"><div className="gv-darts">{[0,1,2].map(i=>{const d=darts[i];let state="pending",meta="";if(d){if(phase==="assignment"){state=i===0?"accent":"pending";meta=i===0?"FIXE":"";}else if(i===hitIndex){state="success";meta="TOUCHÉ";}else if(hit&&i>hitIndex){state="accent";meta="POSE";}else{state="danger";meta="RATÉ";}}return <DartSlot key={i} dart={d} index={i} state={state} meta={meta}/>})}</div><div className="gv-loop__next"><small>PROCHAINE CIBLE</small><b>{phase==="assignment"?(darts[0]?dartText(darts[0]):"—"):hit?nextTargetLabel:"?"}</b><span>{hit?"la boucle continue":"d’abord toucher la cible"}</span></div></div>
      <div className="gv-loop__survival"><span><small>VIES</small><b>{"♥".repeat(Math.max(0,Math.min(5,Number(lives)||0)))||"—"}</b></span><span><small>BOUCLIERS</small><b>{Number(shields)||0} 🛡</b></span></div>
    </div>
  </Frame>;
}

export function CallThreeGameplayVisual({accent,phase="playing",calls=[],draftCalls=[],selectedSlot=0,currentThrow=[],preview=[],ordered=true,callerName="Caller",activeName="Joueur"}:any){
  const labels=(phase==="calling"?draftCalls:calls).map((x:any)=>typeof x==="string"?x:String(x??"—"));
  const darts=(currentThrow||[]).slice(0,3);
  const hits=(preview||[]).filter((x:any)=>x?.ok).length;
  const pts=(preview||[]).reduce((a:number,x:any)=>a+Number(x?.pts||0),0);
  const status=phase==="calling"?"PHASE CALLER":hits===3?"FULL CALL":darts.length>=3?`${hits}/3 RÉUSSIES`:`${activeName} RÉPOND`;
  const tone=hits===3?"success":darts.length>=3&&hits===0?"danger":"normal";
  return <Frame accent={accent} kicker={phase==="calling"?`${callerName} prépare l'appel`:ordered?"ORDRE STRICT":"ORDRE LIBRE"} title="LES 3 APPELS" status={status} statusTone={tone} className="gv-call3">
    <div className="gv-call3__calls">{[0,1,2].map(i=>{const pv=preview?.[i]||{},hasDart=ordered?!!darts[i]:darts.length>=3;const fail=phase!=="calling"&&hasDart&&!pv.ok;const state=phase==="calling"?(i===selectedSlot?"selected":"waiting"):pv.ok?"success":fail?"danger":"waiting";return <div key={i} className={`gv-call is-${state}`}><small>APPEL {i+1}</small><b>{labels[i]||"—"}</b>{phase==="calling"?<span>{i===selectedSlot?"EN ÉDITION":"PRÊT"}</span>:<><span>{pv.ok?`OK +${pv.pts}`:fail?"RATÉ":"À JOUER"}</span><em>{pv.dartIndex>=0?`F${pv.dartIndex+1}`:""}</em></>}</div>})}</div>
    <div className="gv-call3__footer"><div className="gv-call3__darts">{[0,1,2].map(i=><span key={i} className={darts[i]?"is-filled":""}>{dartText(darts[i])}</span>)}</div><div><b>{phase==="calling"?"📣":`+${pts} PTS`}</b><span>{phase==="calling"?"Confirme les 3 cibles":hits===3?"BONUS FULL CALL +2":"S=1 · D=2 · T=3"}</span></div></div>
  </Frame>;
}

export function SteeplechaseGameplayVisual({accent,sequence=[],activeStep=0,previewStep=0,activeTarget,previewTarget,fences=[],players=[]}:any){
  const route=[...(sequence||[]).map((n:any)=>({kind:"number",number:Number(n),label:String(n),fence:(fences||[]).map(Number).includes(Number(n))})),{kind:"bull",label:"BULL",fence:false}];
  const current=Math.max(0,Math.min(route.length-1,Number(activeStep)||0)),ghost=Math.max(current,Math.min(route.length-1,Number(previewStep)||0));
  const target=activeTarget||route[current]||{};
  const status=target?.kind==="bull"?"ARRIVÉE":target?.fence?"HAIE":"COURSE";
  return <Frame accent={accent} kicker="PARCOURS EN DIRECT" title="STEEPLECHASE" status={`${status} · ${target?.label||"—"}`} statusTone={target?.kind==="bull"?"danger":target?.fence?"warning":"normal"} className="gv-steeple">
    <div className="gv-track">{route.map((r:any,i:number)=>{const done=i<current,preview=i>=current&&i<ghost,now=i===ghost;return <div key={`${r.label}-${i}`} className={`gv-track__cell ${r.fence?"is-fence":""} ${r.kind==='bull'?"is-bull":""} ${done?"is-done":""} ${preview?"is-preview":""} ${now?"is-now":""}`}><small>{i+1}</small><b>{r.fence?`T${r.label}`:r.label}</b>{r.fence?<span>HAIE</span>:r.kind==='bull'?<span>FIN</span>:null}</div>})}</div>
    <div className="gv-steeple__footer"><div className="gv-runners">{(players||[]).slice(0,5).map((p:any)=><div key={p.id}><span style={{borderColor:p.color||accent}}>{String(p.name||"?").slice(0,1).toUpperCase()}</span><i><u style={{width:`${clamp((Number(p.step||0)/Math.max(1,route.length))*100)}%`,background:p.color||accent}}/></i><b>{Number(p.step||0)}/{route.length}</b></div>)}</div><div className="gv-steeple__next"><small>APRÈS LA VOLÉE</small><b>{previewTarget?.label||target?.label||"—"}</b></div></div>
  </Frame>;
}
