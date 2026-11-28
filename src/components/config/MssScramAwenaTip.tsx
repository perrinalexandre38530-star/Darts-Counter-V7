import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

const tips = [
  "Dans SCRAM, un camp ferme les secteurs pendant que l'autre cherche à marquer.",
  "Compose deux camps équilibrés : 2, 4, 6 ou 8 joueurs, bots compris.",
  "Le Bloqueur ferme les cibles ; le Scoreur ne marque que sur les secteurs encore ouverts.",
  "Vérifie les deux camps et le premier bloqueur avant de démarrer.",
];
export default function MssScramAwenaTip({step,quick=false}:{step:number;quick?:boolean}) {
  const [tipIndex,setTipIndex] = React.useState(step);
  React.useEffect(()=>{if(!quick)return;const interval=window.setInterval(()=>setTipIndex(i=>(i+1)%tips.length),5000);return()=>window.clearInterval(interval)},[quick]);
  return <div role="note" aria-label="Astuce Awena SCRAM" style={{width:"100%",maxWidth:290,margin:"18px auto",position:"relative",containerType:"inline-size",pointerEvents:"none"}}>
    <img src={awenaConseils} alt="Awena te conseille" style={{display:"block",width:"100%",height:"auto"}} />
    <div style={{position:"absolute",left:"39%",top:"16%",width:"56%",height:"68%",display:"grid",alignContent:"center",textAlign:"center",padding:"0 1%",boxSizing:"border-box",color:"#271624",overflow:"hidden"}}>
      <strong style={{color:"#dd2034",fontWeight:1000,fontSize:"clamp(8px,4.1cqw,10px)"}}>ASTUCE</strong>
      <span style={{fontSize:"clamp(7px,3.1cqw,9px)",fontWeight:900,lineHeight:1.15,overflowWrap:"break-word"}}>{tips[Math.min(tips.length-1,Math.max(0,quick?tipIndex:step))]}</span>
    </div>
  </div>;
}
