import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerCastle from "../assets/tickers/ticker_castle.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>OBJECTIF</b><br/>Construis ton château avant les autres. La règle classique utilise 15 briques.</div>
  <div><b style={{ color: "#ff7f32" }}>NUMÉRO PERSONNEL</b><br/>Chaque joueur reçoit un numéro unique. Le toucher construit son château : Simple = 1 brique, Double = 2, Triple = 3.</div>
  <div><b style={{ color: "#ff5d4a" }}>ATTAQUE</b><br/>Toucher le numéro d'un adversaire détruit le même nombre de briques chez lui. Un château ne descend jamais sous 0.</div>
  <div><b style={{ color: "#ffc34f" }}>VICTOIRE</b><br/>Le premier à atteindre le nombre de briques demandé remporte la manche.</div>
</div>;

export default function CastleConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="castle" definition={{ id: "castle", title: "CASTLE", ticker: tickerCastle, accent: "#ffb33f", accent2: "#ff6d2d", minPlayers: 2, maxPlayers: 12, playTab: "castle_play", guidedSteps: ["Participants", "Château", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
