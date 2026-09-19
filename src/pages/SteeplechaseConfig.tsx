import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_steeplechase.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#7dffbd" }}>COURSE</b><br/>Pars du 20 puis avance autour de la cible dans l'ordre physique des secteurs jusqu'au 5, avant l'arrivée au Bull.</div>
  <div><b style={{ color: "#ffe06a" }}>ZONE INTÉRIEURE</b><br/>En classique, seul le petit simple situé entre le Bull et l'anneau triple permet de franchir un secteur.</div>
  <div><b style={{ color: "#7dffbd" }}>HAIES</b><br/>Quatre obstacles remplacent la zone normale : T13, T17, T8 et T5 doivent être touchés pour continuer.</div>
  <div><b style={{ color: "#ffe06a" }}>VICTOIRE</b><br/>Le premier joueur qui termine le parcours puis valide le Bull remporte la course.</div>
</div>;

export default function SteeplechaseConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="steeplechase" definition={{ id: "steeplechase", title: "STEEPLECHASE", ticker, accent: "#7dffbd", accent2: "#ffe06a", minPlayers: 1, maxPlayers: 12, playTab: "steeplechase_play", guidedSteps: ["Participants", "Parcours", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
