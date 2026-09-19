import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerCrados from "../assets/tickers/ticker_crados.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#d4ff44" }}>CONTAMINATION</b><br/>Simple = 1 couche, Double = 2, Triple = 3. Quand un secteur atteint le nombre de couches demandé, il devient « crado » et appartient au joueur.</div>
  <div><b style={{ color: "#9eea3a" }}>PIÈGES</b><br/>Toucher un secteur sale adverse reste dangereux. En BLOCAGE, tu prends la puissance complète de la touche en crasse. En VOL, tu attaques les couches pour tenter de retourner le secteur, mais chaque contact adverse ajoute quand même +1 CRASSE.</div>
  <div><b style={{ color: "#74d92d" }}>DOUCHE</b><br/>Le Bull peut nettoyer : SBULL retire un peu de crasse, DBULL lave beaucoup plus si l'option est activée.</div>
  <div><b style={{ color: "#d4ff44" }}>VICTOIRE</b><br/>Le dernier joueur encore sous la limite de crasse remporte la manche.</div>
</div>;

export default function CradosConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="crados" definition={{ id: "crados", title: "CRADOS", ticker: tickerCrados, accent: "#b7f247", accent2: "#4dc536", minPlayers: 2, maxPlayers: 12, playTab: "crados_play", guidedSteps: ["Participants", "Crasse", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
