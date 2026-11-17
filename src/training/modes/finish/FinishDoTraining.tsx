import React from "react";
import "./finishDoTraining.css";
import { useLang } from "../../../contexts/LangContext";
import { recordTrainingSession } from "../../stats/trainingStatsHub";

/** A deterministic DO checkout tutor. All scores are derived from actual darts, never intended targets. */
type Dart = { label: string; value: number; finish: boolean; kind: "S" | "D" | "T" | "MISS" };
const DARTS: Dart[] = [
  ...Array.from({length: 20}, (_, i) => ({label:`S${i+1}`, value:i+1, finish:false, kind:"S" as const})),
  ...Array.from({length: 20}, (_, i) => ({label:`D${i+1}`, value:(i+1)*2, finish:true, kind:"D" as const})),
  ...Array.from({length: 20}, (_, i) => ({label:`T${i+1}`, value:(i+1)*3, finish:false, kind:"T" as const})),
  {label:"BULL25",value:25,finish:false,kind:"S"},
  {label:"BULL50",value:50,finish:true,kind:"D"},
  {label:"MISS",value:0,finish:false,kind:"MISS"},
];
const priority = (d: Dart) => d.label === "D20" ? 0 : d.label === "D16" ? 1 : d.label === "D18" ? 2 : d.label === "D12" ? 3 : d.label === "D10" ? 4 : d.label === "D8" ? 5 : d.label === "BULL50" ? 12 : d.kind === "T" ? 20 - d.value/10 : d.kind === "D" ? 25 : d.kind === "S" ? 35 : 100;
const throwOptions = DARTS.filter(d => d.value > 0);
/** Fewer darts first, then prefer practical doubles / high-scoring setup darts. */
export function checkoutRoutes(score: number, dartsLeft = 3, maxResults = 3): Dart[][] {
  if (!Number.isInteger(score) || score < 2 || score > 170 || dartsLeft < 1) return [];
  const result: Dart[][] = [];
  const visit = (remaining: number, depth: number, route: Dart[]) => {
    if (depth === 1) {
      for (const dart of throwOptions) if (dart.finish && dart.value === remaining) result.push([...route, dart]);
      return;
    }
    for (const dart of throwOptions) {
      if (dart.value >= remaining - 1) continue;
      // Avoid redundant intermediate doubles when an ordinary setup dart exists.
      if (dart.kind === "D" && remaining > 50) continue;
      visit(remaining - dart.value, depth - 1, [...route, dart]);
    }
  };
  for (let n = 1; n <= Math.min(3,dartsLeft); n++) {
    visit(score,n,[]);
    if (result.length) break;
  }
  result.sort((a,b) => {
    const pa = a.reduce((sum,d,i) => sum + priority(d)*(i === a.length-1 ? 2 : 0.1), 0);
    const pb = b.reduce((sum,d,i) => sum + priority(d)*(i === b.length-1 ? 2 : 0.1), 0);
    return pa-pb || a.map(d=>d.label).join().localeCompare(b.map(d=>d.label).join());
  });
  const seen = new Set<string>();
  return result.filter(route => {const key = route.map(x=>x.label).join("-"); if(seen.has(key))return false; seen.add(key);return true;}).slice(0,maxResults);
}

/** Training scenarios are examples of actual outcomes, not automatically scored darts. */
const RECOVERY_DRILLS = [
  { id:"single20", start:100, aim:"T20", actual:"S20", remaining:80, route:"T20 → D10", noteFr:"Le simple 20 laisse 80 : il reste deux fléchettes pour T20 puis D10.", noteEn:"S20 leaves 80: two darts remain for T20 then D10." },
  { id:"neighbor5", start:100, aim:"T20", actual:"T5", remaining:85, route:"T15 → D20", noteFr:"Le triple 5 voisin vaut 15 : recalcule sur 85.", noteEn:"Neighboring T5 scores 15: recalculate from 85." },
  { id:"single19", start:101, aim:"T20", actual:"S20", remaining:81, route:"T19 → D12", noteFr:"Le simple 20 laisse 81. T19 puis D12 fait 81.", noteEn:"S20 leaves 81. T19 then D12 completes 81." },
  { id:"double16", start:32, aim:"D16", actual:"S16", remaining:16, route:"D8", noteFr:"Tu touches le simple 16 : D8 termine. Si tu touches S8, vise ensuite D4.", noteEn:"S16 leaves D8. If you hit S8 next, aim at D4." },
  { id:"bull25", start:50, aim:"BULL50", actual:"BULL25", remaining:25, route:"S9 → D8", noteFr:"BULL25 n'est pas un double final : S9 prépare D8.", noteEn:"BULL25 cannot finish DO: S9 prepares D8." },
  { id:"safe41", start:41, aim:"S1", actual:"S9", remaining:32, route:"D16", noteFr:"Un S9 prépare D16 : bon repli quand S1 était prévu.", noteEn:"S9 leaves D16: a useful alternative to the planned S1." },
] as const;
/** Plan de placement pour le prochain passage lorsque la sortie immédiate n'existe pas. */
const PREFERRED_LEAVES = [40,32,36,24,16,20,28,8,4,2,50] as const;
export function checkoutSetup(score: number, dartsLeft: number): { route: Dart[]; leave: number } | null {
  if (!Number.isInteger(score) || score < 2 || dartsLeft < 1) return null;
  // Favor a familiar finishing double, without reaching zero on a non-double.
  const candidates: {route:Dart[];leave:number;weight:number}[] = [];
  const visit = (remaining:number, depth:number, route:Dart[]) => {
    if (route.length && PREFERRED_LEAVES.includes(remaining as typeof PREFERRED_LEAVES[number])) {
      const rank=PREFERRED_LEAVES.indexOf(remaining as typeof PREFERRED_LEAVES[number]);
      candidates.push({route,leave:remaining,weight:rank*9+route.length*3});
    }
    if(depth===0)return;
    for(const dart of throwOptions){
      if(dart.value>=remaining-1)continue;
      // Favour the big treble / practical singles; keep search bounded.
      if(dart.kind==="D")continue;
      visit(remaining-dart.value,depth-1,[...route,dart]);
    }
  };
  visit(score,Math.min(3,dartsLeft),[]);
  candidates.sort((a,b)=>a.weight-b.weight || b.route.reduce((sum,d)=>sum+d.value,0)-a.route.reduce((sum,d)=>sum+d.value,0));
  return candidates[0] ? {route:candidates[0].route,leave:candidates[0].leave} : null;
}
const PRO_TIPS = [
  { score: 32, fr: "La chaîne D16 → D8 → D4 → D2 → D1 te laisse plusieurs replis si tu touches un simple.", en: "The D16 → D8 → D4 → D2 → D1 ladder gives useful recovery doubles after a single." },
  { score: 40, fr: "Sur D20, si tu touches S20, il reste 20 : le plan B est D10.", en: "At D20, hitting S20 leaves 20: switch to D10." },
  { score: 50, fr: "Au BULL50, toucher BULL25 laisse 25 : joue S9 puis D8 si tu as encore deux fléchettes.", en: "At BULL50, hitting BULL25 leaves 25: S9 then D8 with two darts left." },
  { score: 100, fr: "À 100, T20 → D20. Si le T20 devient S20, joue T20 → D10.", en: "At 100, T20 → D20. If T20 lands S20, switch to T20 → D10." },
];
const DEFAULT_SCORES = [32,40,36,24,50,46,52,58,64,70,81,87,96,100,101,121,125,130,141,164,167,170];
type Shot = { dart:Dart; before:number; after:number; bust:boolean; finish:boolean };
export default function FinishDoTraining({onExit, challenge = false}:{onExit:()=>void;challenge?:boolean}) {
  const { lang } = useLang();
  const en = String(lang).toLowerCase().startsWith("en");
  const [score,setScore]=React.useState(40);
  const [level,setLevel]=React.useState<"basic"|"advanced"|"random">("basic");
  const [visitStart,setVisitStart]=React.useState(40);
  const [shots,setShots]=React.useState<Shot[]>([]);
  const [dartsUsed,setDartsUsed]=React.useState(0);
  const [won,setWon]=React.useState(false);
  const [finished,setFinished]=React.useState(false);
  const [showRoutes,setShowRoutes]=React.useState(true);
  const [type,setType]=React.useState<"S"|"D"|"T">("S");
  const [attempts,setAttempts]=React.useState(0);
  const [successes,setSuccesses]=React.useState(0);
  const [started,setStarted]=React.useState(false);
  const [activeDrill,setActiveDrill]=React.useState<string|null>(null);
  const [history,setHistory]=React.useState<{score:number;won:boolean;darts:number}[]>([]);
  // Save only when an attempt is accepted (next checkout/exit); Undo can then correct it.
  const pendingResult=React.useRef<{score:number;won:boolean;darts:number;shots:Shot[]}|null>(null);
  const savePending=()=>{
    const result=pendingResult.current;
    if(!result)return;
    pendingResult.current=null;
    const hits=result.shots.filter(s=>s.dart.kind!=="MISS").length;
    recordTrainingSession(challenge?"training_finish_challenge":"training_finish_do", result.darts,
      result.shots.reduce((sum,s)=>sum+s.dart.value,0),{
        checkoutScore:result.score,success:result.won,checkoutSuccess:result.won,
        hits,finishDoubleOut:true,busts:result.shots.filter(s=>s.bust).length,
        dartsLog:result.shots.map(s=>({label:s.dart.label,score:s.dart.value,bust:s.bust,finish:s.finish})),
      });
  };
  const drill=RECOVERY_DRILLS.find(d=>d.id===activeDrill);
  const lastShot=shots.length?shots[shots.length-1]:null;
  // A bust ends the visit immediately; the next dart starts a fresh visit.
  const visitThrows=shots.reduce((count,shot)=>{ const next=count+1; return shot.bust||next===3?0:next; },0);
  const remainingDarts=3-visitThrows;
  const setup=React.useMemo(()=>checkoutSetup(score,remainingDarts),[score,remainingDarts]);
  const tip=PRO_TIPS.find(t=>t.score===score);
  const activeRoutes=React.useMemo(()=>checkoutRoutes(score,remainingDarts),[score,remainingDarts]);
  const isBust=shots.length>0 && shots[shots.length-1]?.bust;
  const fmt=(r:Dart[])=>r.map(x=>x.label).join(" → ");
  const nextScore=()=> {
    const pool=level==="basic"?DEFAULT_SCORES.slice(0,8):level==="advanced"?DEFAULT_SCORES.slice(8):DEFAULT_SCORES;
    return pool[Math.floor(Math.random()*pool.length)];
  };
  const reset=(value:number)=>{savePending();const v=Math.max(2,Math.min(170,Math.round(value)||40));setScore(v);setVisitStart(v);setShots([]);setDartsUsed(0);setWon(false);setFinished(false);setStarted(true);};
  const record=(dart:Dart)=>{
    if(!started||finished)return;
    const after=score-dart.value;
    const finish=after===0 && dart.finish;
    const bust=after<2 && !finish;
    const nextDarts=dartsUsed+1;
    const visitEnd=visitThrows+1===3;
    const shot={dart,before:score,after:bust?visitStart:after,bust,finish};
    setShots(prev=>[...prev,shot]);setDartsUsed(nextDarts);
    setScore(bust?visitStart:after);
    if(finish){pendingResult.current={score:shots[0]?.before??visitStart,won:true,darts:nextDarts,shots:[...shots,shot]};setWon(true);setFinished(true);setAttempts(n=>n+1);setSuccesses(n=>n+1);setHistory(old=>[{score:shots[0]?.before??visitStart,won:true,darts:nextDarts},...old].slice(0,15));return;}
    if(challenge && (bust || visitEnd)) {
      pendingResult.current={score:shots[0]?.before??visitStart,won:false,darts:nextDarts,shots:[...shots,shot]};
      setFinished(true);setAttempts(n=>n+1);setHistory(old=>[{score:shots[0]?.before??visitStart,won:false,darts:nextDarts},...old].slice(0,15));return;
    }
    if(bust || visitEnd)setVisitStart(bust?visitStart:after);
  };
  const undo=()=>{
    if(!shots.length)return;
    const previous=shots.slice(0,-1);
    const start=shots[0].before;
    let rest=start,vs=start;
    let count=0;previous.forEach(shot=>{count++;const diff=rest-shot.dart.value;const bust=diff<2 && !(diff===0&&shot.dart.finish);rest=bust?vs:diff;if(bust||count===3){vs=rest;count=0;}});
    setShots(previous);setScore(rest);setVisitStart(vs);setDartsUsed(previous.length);
    if(finished){pendingResult.current=null;setFinished(false);setWon(false);setAttempts(n=>Math.max(0,n-1));if(won)setSuccesses(n=>Math.max(0,n-1));setHistory(old=>old.slice(1));}
  };
  const btn:React.CSSProperties={border:"1px solid rgba(255,255,255,.2)",borderRadius:12,padding:"10px 12px",background:"#202737",color:"white",fontWeight:800,cursor:"pointer"};
  const card:React.CSSProperties={background:"rgba(20,28,42,.94)",border:"1px solid rgba(255,255,255,.12)",borderRadius:18,padding:16};
  return <div className="mss-finish-do" style={{color:"#f4f7ff",padding:"12px 12px 36px",maxWidth:1050,margin:"auto"}}>
    <div className="mss-finish-header" style={{...card,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:12}}><div><div style={{color:"#32d7ef",fontWeight:900,letterSpacing:2,fontSize:12}}>MSS • {challenge?"CHALLENGE":"TRAINING"}</div><h2 style={{margin:"5px 0"}}>{en?"DOUBLE OUT FINISHES":"FINISHS DOUBLE OUT"}</h2><small>{en?"Learn the checkout and adapt after every dart":"Apprends les combinaisons et les plans B après chaque fléchette"}</small></div><button style={btn} onClick={()=>{savePending();onExit();}}>← {en?"Back":"Retour"}</button></div>
    <div className="mss-finish-layout" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:12}}>
      <section className="mss-finish-config" style={card}>
        <h3 style={{marginTop:0}}>{en?"Choose a checkout":"Choisis ton finish DO"}</h3>
        <div style={{marginBottom:12,padding:10,borderRadius:12,background:"rgba(40,110,120,.25)"}}>
          <strong>🎯 {en?"Pro recovery drills":"DÉFIS PLANS B"}</strong>
          <p style={{fontSize:12,margin:"5px 0 8px"}}>{en?"Select a scenario, play the actual hit shown, then complete the checkout with the remaining darts.":"Choisis une situation, saisis la touche réellement obtenue puis tente le finish avec les fléchettes restantes."}</p>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{RECOVERY_DRILLS.map(d=><button key={d.id} style={{...btn,fontSize:11,padding:"7px 9px",background:activeDrill===d.id?"#0e7287":"#202737"}} onClick={()=>{setActiveDrill(d.id);reset(d.start)}}>{d.start} • {d.aim} ⇢ {d.actual}</button>)}</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{(["basic","advanced","random"] as const).map(l=><button key={l} style={{...btn,background:level===l?"#0e7287":"#202737"}} onClick={()=>setLevel(l)}>{l==="basic"?"2–70":l==="advanced"?"81–170":en?"Mixed":"Mixte"}</button>)}</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>{(level==="basic"?DEFAULT_SCORES.slice(0,8):level==="advanced"?DEFAULT_SCORES.slice(8):DEFAULT_SCORES.slice(0,12)).map(n=><button style={{...btn,background:score===n?"#0e7287":"#202737"}} key={n} onClick={()=>reset(n)}>{n}</button>)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><label>{en?"Custom score":"Score libre"} <input aria-label="Score départ" type="number" min="2" max="170" value={started?shots[0]?.before??score:score} onChange={e=>{if(!started||!shots.length){const n=Number(e.target.value);setScore(n);setVisitStart(n);setStarted(false);}}} style={{width:70,padding:8,borderRadius:8}}/></label><button style={btn} onClick={()=>reset(score)}>{en?"Start / restart":"Démarrer / Recommencer"}</button><button style={btn} onClick={()=>reset(nextScore())}>{en?"Random finish":"Finish aléatoire"}</button></div>
        <div className="mss-finish-scoreboard" aria-live="polite"><div className="mss-finish-score-label">{en?"REMAINING · DOUBLE OUT":"RESTE À SORTIR · DOUBLE OUT"}</div><strong className="mss-finish-score-number" style={{color:won?"#66eba9":"#35d9fb"}}>{score}</strong><div className="mss-finish-darts">{Array.from({length:3},(_,i)=><span key={i} className={i<remainingDarts&&!finished?"available":"spent"}>🎯</span>)}</div><div className="mss-finish-score-status">{won?"✅ CHECKOUT !":isBust?(en?"BUST — visit score restored":"BUST — score de volée restauré"):`${remainingDarts} ${en?"darts left in visit":"fléchette(s) dans la volée"}`}</div></div>
        {finished&&<div style={{marginTop:12,padding:10,borderRadius:12,background:"#1e3c43"}}>{won?"FINISH DO VALIDÉ !": "Défi non réussi sur cette volée."} <button style={btn} onClick={()=>reset(nextScore())}>{en?"Next":"Suivant"}</button></div>}
      </section>
      <section className="mss-finish-keypad" style={card}>
        <h3 style={{marginTop:0}}>{en?"Actual dart input":"Saisie des fléchettes réelles"}</h3>
        <div className="mss-finish-multipliers" style={{display:"flex",gap:7,marginBottom:12}}>{(["S","D","T"] as const).map(k=><button key={k} style={{...btn,flex:1,background:type===k?({S:"#525c6b",D:"#057ca9",T:"#9a35b4"}[k]):"#202737"}} onClick={()=>setType(k)}>{k}</button>)}</div>
        <div className="mss-finish-numbers" style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:5}}>{Array.from({length:20},(_,i)=>i+1).map(n=><button key={n} disabled={!started||finished} style={{...btn,padding:"11px 1px",opacity:finished?.5:1,background:type==="S"?"#535b68":type==="D"?"#057ca9":"#9736b4"}} onClick={()=>record(DARTS.find(d=>d.label===`${type}${n}`)!)}>{n}</button>)}</div>
        <div className="mss-finish-specials" style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>{["BULL25","BULL50","MISS"].map(name=><button key={name} disabled={!started||finished} style={{...btn,flex:1,background:name==="BULL25"?"#147b3c":name==="BULL50"?"#bb2b32":"#c98734",color:name==="MISS"?"#362009":"white"}} onClick={()=>record(DARTS.find(d=>d.label===name)!)}>{name}</button>)}</div>
        <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><button style={btn} disabled={!shots.length} onClick={undo}>↶ {en?"Undo":"Annuler"}</button><span style={{fontSize:12,opacity:.8}}>{shots.map(s=>`${s.dart.label}${s.bust?" (BUST)":""}`).join(" · ")||"—"}</span></div>
      </section>
      <section className="mss-finish-coach" style={card}><div className="mss-finish-awena-head"><img src="/awena/awena-bot-medallion.webp" alt="Awena" loading="lazy"/><div><h3 style={{margin:"0 0 4px"}}>AWENA • {en?"Checkout coach":"COACH FINISH DO"}</h3><small>{en?"Your real hit decides the next route":"Ta touche réelle décide du prochain chemin"}</small></div></div>
        <label style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><input type="checkbox" checked={showRoutes} onChange={e=>setShowRoutes(e.target.checked)}/>{en?"Show combinations and recovery routes":"Afficher combinaisons et plans B"}</label>
        {drill&&<div style={{padding:11,marginBottom:10,borderRadius:12,border:"1px solid #51c7ce"}}>
          <strong>{en?"Recovery scenario":"SITUATION DE RATTRAPAGE"} • {drill.start}</strong>
          <div style={{marginTop:5,fontSize:13}}>{en?"Aimed":"Visé"} : <b>{drill.aim}</b> · {en?"Actual hit":"Touché"} : <b>{drill.actual}</b></div>
          <p style={{margin:"6px 0",fontSize:13}}>{en?drill.noteEn:drill.noteFr}</p>
          <div style={{fontSize:12}}>{en?"If that actual hit occurs":"Si cette touche est réellement obtenue"} : <b>{drill.remaining} → {drill.route}</b></div>
          {lastShot&&<div style={{marginTop:7,fontSize:12,color:"#8deac9"}}>{en?"Your actual last dart":"Ta dernière fléchette réelle"} : <b>{lastShot.dart.label}</b> · {en?"remaining":"reste"} <b>{score}</b> — {en?"Awena recalculates below":"Awena recalcule ci-dessous"}.</div>}
        </div>}
        {showRoutes?<>{activeRoutes.length?activeRoutes.map((r,i)=><div key={i} className="mss-finish-route"><b className="mss-finish-route-label">{i===0?"PLAN A":`PLAN ${i+1}`}</b><div className="mss-finish-route-darts">{r.map((d,j)=><React.Fragment key={`${j}-${d.label}`}><span className={`mss-finish-dart-pill ${d.finish?"final":""}`}>{d.label}</span>{j<r.length-1&&<span className="mss-finish-arrow">→</span>}</React.Fragment>)}</div></div>):<div style={{padding:10,opacity:.85}}>{score>170?"Finish impossible en 3 fléchettes.":score===1?"BUST : 1 restant est interdit.":en?"No checkout with the darts left: set up a double for next visit.":"Pas de finish avec les fléchettes restantes : prépare un double pour la prochaine volée."}</div>}
          {!activeRoutes.length && setup && !finished && <div className="mss-finish-setup"><strong>🎯 {en?"SET UP NEXT VISIT":"PLACEMENT • PROCHAINE VOLÉE"}</strong><div className="mss-finish-route-darts">{setup.route.map((d,i)=><React.Fragment key={`${i}-${d.label}`}><span className="mss-finish-dart-pill">{d.label}</span><span className="mss-finish-arrow">→</span></React.Fragment>)}<span className="mss-finish-dart-pill final">{setup.leave}</span></div><small>{en?"Target a manageable double next visit. Adapt after every real hit.":"Prépare un double confortable pour la prochaine volée. Recalcule après chaque touche réelle."}</small></div>}
          {tip && <p className="mss-finish-pro-tip">💡 {en?tip.en:tip.fr}</p>}
          {shots.length>0&&!finished&&<p style={{fontSize:13}}>💡 {en?"Plan recalculated from your actual hit. Remember: an intended triple hit as a single changes the entire route.":"Plan recalculé depuis ta touche réelle. Un triple visé mais touché en simple change toute la combinaison."}</p>}
          <p style={{fontSize:13,opacity:.83}}>🎯 {en?"Pro tip: aim for 32 (D16), then 16 (D8), 8 (D4), 4 (D2), 2 (D1). S16 on 32 leaves D8. Never leave 1.":"Astuce de placement : 32 → D16 ; si tu touches S16, il reste 16 → D8 ; puis D4, D2, D1. Évite absolument de laisser 1."}</p>
          </>:<p>{en?"Blind practice: work out your route before showing it.":"Entraînement à l'aveugle : trouve ton chemin avant d'afficher l'aide."}</p>}
        <p style={{fontSize:12,opacity:.65}}>{en?"Bull50 is a valid double-out finisher. Bust restores the score from the start of the visit.":"BULL50 est un double final valide. Un BUST restaure le score au début de la volée."}</p>
      </section>
    </div>
    <section className="mss-finish-summary" style={{...card,marginTop:12}}><strong>{en?"Session summary":"BILAN DE SESSION"}</strong> • {successes}/{attempts} {en?"completed":"réussis"} {attempts>0?`(${Math.round(100*successes/attempts)} %)` : ""}<div style={{fontSize:12,opacity:.75,marginTop:5}}>{challenge?"CHALLENGE : 1 seule volée de 3 fléchettes maximum par finish.":"TRAINING : autant de volées que nécessaire, avec recalcul à chaque fléchette. Les résultats sont enregistrés au passage au finish suivant ou au retour."}</div>{history.length>0&&<div style={{marginTop:8,fontSize:12}}>{history.map((h,i)=><span key={i} style={{marginRight:12}}>{h.score} : {h.won?`✓ ${h.darts} darts`:'✗'}</span>)}</div>}</section>
  </div>;
}
