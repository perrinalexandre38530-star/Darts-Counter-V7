import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerBssKing from "../assets/tickers/ticker_bss_king.webp";

const rules = <div style={{display:"grid",gap:10,fontSize:13,lineHeight:1.5}}>
  <div><b style={{color:"#f0c76a"}}>COMMENT JOUER ?</b><br/>À chaque tournée, <b>tous les joueurs ont le même objectif</b>. Tu lances jusqu’à 3 fléchettes et seuls les coups indiqués à l’écran rapportent des points.</div>
  <div><b style={{color:"#ff5d73"}}>1 · MARQUE DES POINTS BSS</b><br/>Le barème dépend du défi affiché. Tes touches donnent des <b>points BSS</b> et forment ton score de tournée. Quand tout le monde a joué, <b>le seul meilleur score gagne 1 écusson BSS</b>. En cas d’égalité en tête, personne ne gagne d’écusson.</div>
  <div><b style={{color:"#f0c76a"}}>2 · COLLECTIONNE LES ÉCUSSONS</b><br/><b>Points BSS → meilleur score de la tournée → 1 écusson.</b> Atteins ensuite le quota choisi : 3, 5 ou 7 écussons. Les points BSS restent cumulés et servent aussi de départage à égalité d’écussons.</div>
  <div><b style={{color:"#ff5d73"}}>3 · PRENDS LE TRÔNE</b><br/>Dès que tu as assez d’écussons, ton objectif personnel devient le <b>TRÔNE</b>. Touche le Bull demandé par la configuration et <b>tu gagnes immédiatement la partie : tu deviens BSS KING</b>.</div>
  <div><b style={{color:"#f0c76a"}}>LES DÉFIS</b><br/>Exemples : faire le plus de points, viser uniquement un secteur, uniquement les Doubles, les Triples, le Bull, les secteurs 1–10 ou 11–20. <b>Pas besoin de les mémoriser :</b> l’objectif et son barème sont affichés pendant ton tour.</div>
</div>;

export default function BssKingConfig(props:any){
  return <NewDartsModeConfig {...props} mode="bss_king" definition={{id:"bss_king",title:"BSS KING",ticker:tickerBssKing,accent:"#f0c76a",accent2:"#d74855",minPlayers:2,maxPlayers:10,playTab:"bss_king_play",guidedSteps:["Participants","Règles BSS","Format","Saisie","Résumé"],rulesContent:rules}}/>;
}
