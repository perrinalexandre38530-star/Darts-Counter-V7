import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerMenteur from "../assets/tickers/ticker_menteur.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>ENCHÈRES</b><br/>Chaque joueur annonce le contrat qu'il pense pouvoir réaliser : score, zone ou combinaison selon le deck choisi.</div>
  <div><b style={{ color: "#ff8f35" }}>SURENCHÈRE</b><br/>Le joueur suivant doit surenchérir ou dire « MENTEUR ! ». Les annonces montent jusqu'à ce qu'un joueur provoque l'autre.</div>
  <div><b style={{ color: "#ff5d4a" }}>RÉSOLUTION</b><br/>Le joueur défié tente de réaliser son contrat avec sa volée. S'il réussit, le challenger perd une vie ; sinon, c'est le menteur qui en perd une.</div>
  <div><b style={{ color: "#ffc34f" }}>VICTOIRE</b><br/>Le dernier joueur ayant encore des vies gagne la partie.</div>
</div>;

export default function MenteurConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="menteur" definition={{ id: "menteur", title: "MENTEUR", ticker: tickerMenteur, accent: "#ffbf37", accent2: "#ff4a3c", minPlayers: 2, maxPlayers: 12, playTab: "menteur_play", guidedSteps: ["Participants", "Bluff", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
