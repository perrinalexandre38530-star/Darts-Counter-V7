import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerBssKing from "../assets/tickers/ticker_bss_king.webp";

const rules = <div style={{display:"grid",gap:10,fontSize:13,lineHeight:1.5}}>
  <div><b style={{color:"#f0c76a"}}>OBJECTIF</b><br/>Remporte les tournées, collectionne les écussons BSS puis prends le trône.</div>
  <div><b style={{color:"#ff5d73"}}>DÉFIS BSS</b><br/>Chaque tournée change la règle : libre, secteur imposé, Doubles, Triples, Bull ou autres défis de la bande.</div>
  <div><b style={{color:"#f0c76a"}}>ÉCUSSONS</b><br/>Le meilleur score d'influence de la tournée gagne un écusson. Une égalité ne distribue rien.</div>
  <div><b style={{color:"#ff5d73"}}>BSS KING</b><br/>Quand ton quota d'écussons est atteint, ton prochain objectif devient le TRÔNE. Touche le Bull demandé pour être couronné.</div>
</div>;

export default function BssKingConfig(props:any){
  return <NewDartsModeConfig {...props} mode="bss_king" definition={{id:"bss_king",title:"BSS KING",ticker:tickerBssKing,accent:"#f0c76a",accent2:"#d74855",minPlayers:2,maxPlayers:10,playTab:"bss_king_play",guidedSteps:["Participants","Règles BSS","Format","Saisie","Résumé"],rulesContent:rules}}/>;
}
