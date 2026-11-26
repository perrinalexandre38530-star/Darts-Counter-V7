import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

const tips = [
  "Pour survivre, dépasse le score de la volée précédente.",
  "Cinq vies donnent une partie équilibrée, idéale pour débuter.",
  "Avec moins de vies, chaque fléchette devient décisive.",
  "En mode classique, égaler le score précédent ne suffit pas.",
  "La dernière vie peut tout changer : assure les points avant de prendre des risques.",
];

/** Partie rapide MSS : une seule illustration, texte tournant toutes les 5 s. */
export default function MssFiveLivesQuickAwenaTip() {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setInterval(() => setIndex(i => (i + 1) % tips.length), 5000);
    return () => window.clearInterval(timer);
  }, []);
  return <div role="note" aria-label="Astuce Awena 5 Vies" style={{width:"100%",maxWidth:260,position:"relative",containerType:"inline-size",margin:"14px auto",pointerEvents:"none"}}>
    <img src={awenaConseils} alt="Awena te donne une astuce" style={{width:"100%",height:"auto",display:"block"}} />
    <div style={{position:"absolute",top:"16%",left:"39%",width:"56%",height:"68%",textAlign:"center",display:"grid",alignContent:"center",color:"#241b26",overflow:"hidden",boxSizing:"border-box",padding:"0 1%"}}>
      <b style={{color:"#d81e2b",fontSize:"clamp(8px,4.2cqw,10px)"}}>ASTUCE</b>
      <span aria-live="off" style={{fontSize:"clamp(7px,3.1cqw,8.5px)",fontWeight:900,lineHeight:1.13}}>{tips[index]}</span>
    </div>
  </div>;
}
