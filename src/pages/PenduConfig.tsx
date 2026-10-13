import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerPendu from "../assets/tickers/ticker_pendu.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>OBJECTIF</b><br/>Survis à des rondes d’objectifs darts : score, couleur, pair/impair, moitié de cible, Double, Triple, Bull ou secteur précis.</div>
  <div><b style={{ color: "#ff8f35" }}>PENDU</b><br/>Chaque échec dessine une nouvelle partie du pendu. Quand il est complet, le joueur est éliminé.</div>
  <div><b style={{ color: "#ff5d4a" }}>PÉNALITÉS</b><br/>Selon la variante choisie, les morceaux peuvent déclencher des malédictions, une roulette, des bonus, des jokers ou des sabotages entre joueurs.</div>
  <div><b style={{ color: "#ffcf66" }}>PERFECT</b><br/>En SABOTAGE et CHAOS, réussir l’objectif dès la première fléchette rapporte un jeton pour handicaper un adversaire.</div>
  <div><b style={{ color: "#ffc34f" }}>VICTOIRE</b><br/>Le dernier joueur encore vivant remporte la manche.</div>
</div>;

export default function PenduConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="pendu" definition={{ id: "pendu", title: "PENDU", ticker: tickerPendu, accent: "#ffb33f", accent2: "#ff5a2d", minPlayers: 2, maxPlayers: 12, playTab: "pendu_play", guidedSteps: ["Participants", "Pendu", "Format", "Saisie", "Aide", "Résumé"], rulesContent: rules }} />;
}
