// @ts-nocheck
import React from "react";
import type { NewDartsModeId } from "./NewDartsModeConfig";
import "./NewFourModeConfigGuide.css";

type Props = {
  mode: NewDartsModeId;
  accent: string;
  accent2?: string;
  settings?: any;
  compact?: boolean;
};

const STEP_DATA: Record<string, { icon:string; title:string; text:string }[]> = {
  fifty_one_by_five: [
    { icon:"🎯", title:"LANCE 3 FLÉCHETTES", text:"Additionne la volée réelle." },
    { icon:"➗", title:"DIVISE PAR 5", text:"Le total doit être divisible par 5." },
    { icon:"🏁", title:"FINIS EXACT", text:"Atteins l’objectif sans le dépasser." },
  ],
  looper: [
    { icon:"◎", title:"TOUCHE LA CIBLE", text:"La zone exacte est obligatoire." },
    { icon:"↻", title:"POSE LA SUIVANTE", text:"Les fléchettes restantes imposent la suite." },
    { icon:"♥", title:"RESTE EN VIE", text:"Un échec coûte une vie ou un bouclier." },
  ],
  call_three: [
    { icon:"📣", title:"3 APPELS", text:"Le caller choisit trois cibles." },
    { icon:"🎯", title:"RÉPONDS", text:"Chaque fléchette doit valider son appel." },
    { icon:"🔥", title:"MARQUE", text:"Simple 1 · Double 2 · Triple 3." },
  ],
  steeplechase: [
    { icon:"🏁", title:"SUIS LA PISTE", text:"Avance secteur après secteur." },
    { icon:"🚧", title:"FRANCHIS LES HAIES", text:"13 · 17 · 8 · 5 passent en Triple." },
    { icon:"🎯", title:"TERMINE AU BULL", text:"Le Bull est la ligne d’arrivée." },
  ],
};

function FiftyOneExample({accent,settings}:any){
  const target=Number(settings?.target||51), strict=settings?.requireThreeScoringDarts!==false;
  return <div className="nf-guide__example nf-guide__51" style={{["--nf-accent" as any]:accent}}>
    <div className="nf-guide__dart">S20</div><b>+</b><div className="nf-guide__dart">S20</div><b>+</b><div className="nf-guide__dart">S10</div><strong>= 50</strong><i>÷ 5</i><em>+10</em>
    <span>Objectif {target} · {strict?"3 fléchettes qui scorent":"MISS toléré si le total reste valide"}</span>
  </div>;
}
function LooperExample({accent,settings}:any){
  return <div className="nf-guide__example nf-guide__looper" style={{["--nf-accent" as any]:accent}}>
    <div className="nf-guide__target"><small>CIBLE</small><b>T20</b></div><strong>→</strong><div className="nf-guide__hit"><small>F1</small><b>T20 ✓</b></div><strong>→</strong><div className="nf-guide__hit is-next"><small>F3</small><b>D16</b></div>
    <span>D16 devient la cible suivante · {Number(settings?.lives||5)} vies</span>
  </div>;
}
function CallThreeExample({accent,settings}:any){
  const ordered=settings?.ordered!==false;
  return <div className="nf-guide__example nf-guide__call" style={{["--nf-accent" as any]:accent}}>
    {["20","5","BULL"].map((x,i)=><div key={x}><small>APPEL {i+1}</small><b>{x}</b><span>{i===0?"S20 +1":i===1?"D5 +2":"BULL +2"}</span></div>)}
    <em>{ordered?"ORDRE STRICT : F1→20 · F2→5 · F3→BULL":"ORDRE LIBRE : valide les 3 cibles dans l’ordre que tu veux"}</em>
  </div>;
}
function SteepleExample({accent,settings}:any){
  const fences=settings?.fences!==false;
  return <div className="nf-guide__example nf-guide__steeple" style={{["--nf-accent" as any]:accent}}>
    {[20,1,18,4,13,6,10].map((n,i)=><div key={n} className={n===13&&fences?"is-fence":i<3?"is-done":""}><small>{i+1}</small><b>{n===13&&fences?`T${n}`:n}</b>{n===13&&fences?<span>HAIE</span>:null}</div>)}<strong>…</strong><div className="is-finish"><b>BULL</b><span>FIN</span></div>
    <em>{settings?.zone==="inner_single"?"Petit simple intérieur sur les secteurs normaux":"Tout simple accepté sur les secteurs normaux"}</em>
  </div>;
}

export default function NewFourModeConfigGuide({mode,accent,accent2,settings,compact=false}:Props){
  if(!STEP_DATA[mode])return null;
  const steps=STEP_DATA[mode];
  const critical = mode==="fifty_one_by_five"
    ? "Regarde le calcul en direct : si la volée n’est pas divisible par 5, elle ne marque rien."
    : mode==="looper"
      ? "Petit simple, grand simple, Double et Triple sont des cibles différentes."
      : mode==="call_three"
        ? (settings?.ordered!==false?"En ordre strict, une bonne cible touchée avec la mauvaise fléchette ne compte pas.":"En ordre libre, chaque cible ne peut être validée qu’une fois.")
        : "Sur une haie, le simple ne compte pas : il faut obligatoirement toucher le Triple.";
  return <div className={`nf-guide ${compact?"is-compact":""}`} style={{["--nf-accent" as any]:accent,["--nf-accent2" as any]:accent2||accent}}>
    <header><div><small>COMMENT ÇA SE JOUE ?</small><b>Compris en 10 secondes</b></div><span>MODE DÉDIÉ</span></header>
    <div className="nf-guide__steps">{steps.map((s,i)=><div key={s.title}><i>{s.icon}</i><strong>{i+1}</strong><b>{s.title}</b><span>{s.text}</span></div>)}</div>
    {mode==="fifty_one_by_five"?<FiftyOneExample accent={accent} settings={settings}/>:mode==="looper"?<LooperExample accent={accent} settings={settings}/>:mode==="call_three"?<CallThreeExample accent={accent} settings={settings}/>:<SteepleExample accent={accent} settings={settings}/>} 
    <div className="nf-guide__critical"><b>À RETENIR</b><span>{critical}</span></div>
  </div>;
}

export function NewFourModeReadyCard({mode,accent,settings}:Props){
  if(!STEP_DATA[mode])return null;
  const rows = mode==="fifty_one_by_five"
    ? [["OBJECTIF",settings?.target||51],["VOLÉE",settings?.requireThreeScoringDarts!==false?"3 darts scorent":"souple"],["BUST",settings?.bustRule==="zero"?"retour à 0":"score conservé"]]
    : mode==="looper"
      ? [["VIES",settings?.lives||5],["CIBLE","zone exacte"],["BOUCLIER",settings?.setterShield!==false?"ON":"OFF"]]
      : mode==="call_three"
        ? [["ROUNDS",settings?.rounds||10],["ORDRE",settings?.ordered!==false?"strict":"libre"],["BULL",settings?.bull!==false?"ON":"OFF"]]
        : [["SENS",settings?.direction==="counter"?"anti-horaire":"horaire"],["HAIES",settings?.fences!==false?"ON":"OFF"],["ARRIVÉE",settings?.finishBull==="double"?"DBULL":"BULL/DBULL"]];
  return <div className="nf-ready" style={{["--nf-accent" as any]:accent}}><div><small>PRÊT À JOUER</small><b>{mode==="fifty_one_by_five"?"51 BY 5":mode==="looper"?"LOOPER":mode==="call_three"?"CALL THREE":"STEEPLECHASE"}</b></div><div className="nf-ready__rows">{rows.map(([k,v])=><span key={String(k)}><small>{k}</small><b>{String(v)}</b></span>)}</div></div>;
}
