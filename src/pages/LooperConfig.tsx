import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_looper.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#8ff7ff" }}>FOLLOW THE LEADER</b><br/>Une cible exacte est posée. Les joueurs suivants ont jusqu'à trois fléchettes pour la toucher ; un échec coûte une vie.</div>
  <div><b style={{ color: "#ff72ff" }}>SEGMENT EXACT</b><br/>Simple intérieur et simple extérieur sont différents, comme les doubles, triples et bulls. Une touche valide permet de poser la cible suivante avec les fléchettes restantes.</div>
  <div><b style={{ color: "#8ff7ff" }}>LOOPS</b><br/>Les zones fermées dessinées par certains chiffres du cerclage peuvent elles aussi devenir des cibles si l'option est activée.</div>
  <div><b style={{ color: "#ff72ff" }}>VICTOIRE</b><br/>Le dernier joueur avec au moins une vie remporte la partie.</div>
</div>;

export default function LooperConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="looper" definition={{ id: "looper", title: "LOOPER", ticker, accent: "#8ff7ff", accent2: "#da66ff", minPlayers: 2, maxPlayers: 12, playTab: "looper_play", guidedSteps: ["Participants", "Looper", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
