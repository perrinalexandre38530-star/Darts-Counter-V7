import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_51_by_5.webp";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffd34d" }}>OBJECTIF</b><br/>Atteins exactement 51 points de jeu. Chaque volée commence par le total réel des trois fléchettes.</div>
  <div><b style={{ color: "#5fffd2" }}>DIVISIBLE PAR 5</b><br/>La volée ne marque que si son total est divisible par 5. Le quotient est ajouté au score : 25 vaut 5 points, 60 vaut 12 points.</div>
  <div><b style={{ color: "#ffd34d" }}>VOLÉE VALIDE</b><br/>Dans la règle classique, les trois fléchettes doivent toutes toucher une zone qui score ; un miss annule la volée.</div>
  <div><b style={{ color: "#5fffd2" }}>VICTOIRE</b><br/>Le premier joueur à atteindre exactement l'objectif gagne. Dépasser l'objectif provoque un bust selon la variante choisie.</div>
</div>;

export default function FiftyOneByFiveConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="fifty_one_by_five" definition={{ id: "fifty_one_by_five", title: "51 BY 5", ticker, accent: "#ffd34d", accent2: "#42e6c2", minPlayers: 1, maxPlayers: 12, playTab: "fifty_one_by_five_play", guidedSteps: ["Participants", "51 BY 5", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
