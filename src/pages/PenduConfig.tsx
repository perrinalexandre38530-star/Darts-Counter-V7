import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerPendu from "../assets/tickers/ticker_pendu.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>OBJECTIF</b><br/>Évite de compléter ton pendu. Chaque échec ajoute une partie du corps ; au total autorisé, le joueur est éliminé.</div>
  <div><b style={{ color: "#ff8f35" }}>DÉFI</b><br/>Le joueur actif crée ou tire un défi puis doit lui-même le réussir. S'il valide, tous les autres doivent reproduire exactement le défi annoncé.</div>
  <div><b style={{ color: "#ff5d4a" }}>ERREUR</b><br/>Tout joueur qui rate le défi prend une erreur : tête, corps, bras, jambes… jusqu'au pendu complet.</div>
  <div><b style={{ color: "#ffc34f" }}>VICTOIRE</b><br/>Le dernier joueur encore vivant remporte la partie.</div>
</div>;

export default function PenduConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="pendu" definition={{ id: "pendu", title: "PENDU", ticker: tickerPendu, accent: "#ffb33f", accent2: "#ff5a2d", minPlayers: 2, maxPlayers: 12, playTab: "pendu_play", guidedSteps: ["Participants", "Pendu", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
