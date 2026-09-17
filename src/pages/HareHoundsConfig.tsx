import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import tickerHareHounds from "../assets/tickers/ticker_hare_hounds.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#ffc34f" }}>POURSUITE</b><br/>Le Lièvre démarre sur 20. Le ou les Limiers partent derrière lui, généralement sur 5 ou 12.</div>
  <div><b style={{ color: "#ff8f35" }}>DÉPLACEMENT</b><br/>On suit l'ordre physique des numéros autour de la cible. Chaque touche valide sur la cible courante fait avancer d'une position.</div>
  <div><b style={{ color: "#ffc34f" }}>LIÈVRE</b><br/>Il gagne s'il boucle un tour complet et revient à 20 avant d'être rattrapé.</div>
  <div><b style={{ color: "#ff8f35" }}>LIMIERS</b><br/>Ils gagnent en rattrapant ou dépassant le Lièvre selon la logique de poursuite.</div>
</div>;

export default function HareHoundsConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="hare_hounds" definition={{ id: "hare_hounds", title: "HARE & HOUNDS", ticker: tickerHareHounds, accent: "#f6b63b", accent2: "#ff7b2f", minPlayers: 2, maxPlayers: 8, playTab: "hare_hounds_play", guidedSteps: ["Participants", "Poursuite", "Format", "Saisie", "Résumé"], rulesContent: rules }} />;
}
