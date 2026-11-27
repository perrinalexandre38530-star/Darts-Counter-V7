import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";
const TIPS = [
  "Ferme les cibles 20 à 15 et le Bull en trois marques.",
  "Choisis JOUEURS ou ÉQUIPES avant de régler le match.",
  "En équipes, le Cricket actuel utilise un format deux contre deux.",
  "Vérifie la sélection de tous les profils et bots avant de jouer.",
  "Cut-Throat change le sens des points : consulte ses règles.",
  "En mode Points, une cible fermée peut encore rapporter.",
  "Dix manches forcent une partie courte, vingt permettent davantage de tactique.",
  "Tu peux mélanger les joueurs ou conserver l’ordre affiché.",
  "Vérifie les participants et la variante avant le départ.",
];
export default function MssCricketAwenaTip({step,quick=false}:{step?:number;quick?:boolean}) {
  const [index,setIndex]=React.useState(0);
  React.useEffect(()=>{if(!quick)return;const id=window.setInterval(()=>setIndex(x=>(x+1)%TIPS.length),5000);return()=>window.clearInterval(id)},[quick]);
  const tip=TIPS[quick?index:Math.min(TIPS.length-1,Math.max(0,step||0))];
  return <div role="note" aria-label="Astuce Awena CRICKET" style={{width:"100%",maxWidth:270,margin:"14px auto",position:"relative",containerType:"inline-size",pointerEvents:"none"}}>
    <img src={awenaConseils} alt="Awena te conseille" style={{display:"block",width:"100%",height:"auto"}}/>
    <div style={{position:"absolute",left:"39%",top:"16%",width:"56%",height:"68%",display:"grid",alignContent:"center",textAlign:"center",padding:"0 1%",boxSizing:"border-box",color:"#271624",overflow:"hidden"}}>
      <strong style={{color:"#dd2034",fontWeight:1000,fontSize:"clamp(8px,4.1cqw,10px)"}}>ASTUCE</strong>
      <span style={{fontSize:"clamp(7px,3.1cqw,9px)",fontWeight:900,lineHeight:1.13,overflowWrap:"break-word"}}>{tip}</span>
    </div>
  </div>
}
