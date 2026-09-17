import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerGotcha from "../assets/tickers/ticker_gotcha.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>OBJECTIF</b><br/>Pars de 0 et atteins exactement le score cible, classiquement 301.</div>
  <div><b style={{ color: "#ff6b32" }}>GOTCHA !</b><br/>Si ton total devient exactement égal au total d'un adversaire, son score est remis à 0.</div>
  <div><b style={{ color: "#ffc34f" }}>BUST</b><br/>Dépasser la cible annule normalement la volée ; une variante Hardcore peut renvoyer le joueur à 0.</div>
  <div><b style={{ color: "#ff6b32" }}>SORTIE</b><br/>Straight, Double Out ou Master Out selon la configuration.</div>
</div>;

export default function GotchaConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="gotcha" definition={{ id: "gotcha", title: "GOTCHA", ticker: tickerGotcha, accent: "#ff9b31", accent2: "#ff482b", minPlayers: 2, maxPlayers: 12, playTab: "gotcha_play", guidedSteps: ["Participants", "Gotcha", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
