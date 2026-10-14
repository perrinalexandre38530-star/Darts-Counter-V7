import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_ptit_1.png";

const rules = <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
  <div><b style={{ color: "#f2c84b" }}>BUT</b><br/>Finir avec le score le plus bas. Le petit 1 est la zone reine, mais la précision autour du centre et les bonus peuvent complètement retourner la partie.</div>
  <div><b style={{ color: "#8fffb7" }}>PETIT / GROS SIMPLE</b><br/>Petit simple intérieur = valeur du numéro. Gros simple extérieur = valeur ×10 par défaut. Le multiplicateur du gros simple est configurable.</div>
  <div><b style={{ color: "#ff8e72" }}>ZONES À RISQUE</b><br/>Double = valeur du Double ×2 · Triple = valeur du Triple ×3 · Bull25 = 25 ×4 · MISS = total ×5 par défaut. Toutes ces sanctions sont configurables.</div>
  <div><b style={{ color: "#78f3d4" }}>DBULL</b><br/>Par défaut chaque Bull50 divise le score par 2. Le 3e Bull50 cumulé déclenche ZÉRO ABSOLU et remet le score à 0. Bonus et seuil sont configurables. Une fois à 0, une future pénalité multiplicative repart du score de départ comme base : impossible de rendre Double, Triple, Bull25 ou MISS gratuits avec 0 × n.</div>
  <div><b style={{ color: "#f2c84b" }}>TRIPLE NUL</b><br/>Trois fléchettes dans le même petit simple pendant une volée = 0 point pour toute la volée.</div>
  <div><b style={{ color: "#8fffb7" }}>BOUCLIER DU HUN</b><br/>Trois volées consécutives composées uniquement de petits simples débloquent le bouclier permanent. Les prochaines pénalités sont divisées par 2. Seuil et puissance sont configurables.</div>
  <div><b style={{ color: "#ffd84d" }}>JACKPOT</b><br/>Une ou deux zones spéciales apparaissent uniquement sur des DOUBLES ou des TRIPLES. Toucher une zone Jackpot annule la volée entière : 0 point. Le type de zone et son renouvellement sont configurables.</div>
</div>;

export default function PtitHunConfig(props: any) {
  return <NewDartsModeConfig {...props} mode="ptit_hun" definition={{
    id: "ptit_hun",
    title: "P’TIT 1",
    ticker,
    accent: "#f2c84b",
    accent2: "#e04b2a",
    minPlayers: 1,
    maxPlayers: 12,
    playTab: "ptit_hun_play",
    guidedSteps: ["Participants", "Score & zones", "Bonus", "Jackpot", "Format", "Saisie", "Résumé"],
    rulesContent: rules,
  }} />;
}
