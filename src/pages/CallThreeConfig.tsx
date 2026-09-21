import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_call_three.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffb13b" }}>3 CIBLES</b><br/>Avant la volée, trois cibles sont appelées. Le joueur doit viser la première avec sa première fléchette, la deuxième avec sa deuxième, puis la troisième.</div>
  <div><b style={{ color: "#ff6d3a" }}>ORDRE STRICT</b><br/>Toucher une cible au mauvais rang ne compte pas. Chaque fléchette n'a qu'une seule cible assignée.</div>
  <div><b style={{ color: "#ffb13b" }}>POINTS</b><br/>Simple = 1 point, Double = 2, Triple = 3. Si le Bull est activé : Bull extérieur = 2 points, DBULL = 3 points.</div>
  <div><b style={{ color: "#ff6d3a" }}>VICTOIRE</b><br/>Après le nombre de rounds prévu, le joueur ayant le plus de points gagne. En cas d’égalité, un round supplémentaire est joué.</div>
</div>;

export default function CallThreeConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="call_three" definition={{ id: "call_three", title: "CALL THREE", ticker, accent: "#ffb13b", accent2: "#ff5d36", minPlayers: 2, maxPlayers: 12, playTab: "call_three_play", guidedSteps: ["Participants", "Call Three", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
