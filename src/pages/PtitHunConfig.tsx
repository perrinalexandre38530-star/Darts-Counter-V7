import React from "react";
import NewDartsModeConfig from "./newModes/NewDartsModeConfig";
import ticker from "../assets/tickers/ticker_ptit_1.png";
import { useLang } from "../contexts/LangContext";
import DartsSpecialZonesRulesVisual from "../components/DartsSpecialZonesRulesVisual";

function Ptit1RulesContent({ lang }: { lang: string }) {
  const fr = String(lang || "fr").toLowerCase().startsWith("fr");
  return <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.5 }}>
    <div><b style={{ color: "#f2c84b" }}>{fr ? "BUT" : "GOAL"}</b><br/>{fr ? "Finir avec le score le plus bas. Le petit 1 est la zone reine, mais la précision autour du centre et les bonus peuvent complètement retourner la partie." : "Finish with the lowest score. Small 1 is the safest scoring area, while the centre and bonuses can completely change the match."}</div>
    <div><b style={{ color: "#8fffb7" }}>{fr ? "PETIT / GROS SIMPLE" : "SMALL / BIG SINGLE"}</b><br/>{fr ? "Petit simple intérieur = valeur du numéro. Gros simple extérieur = valeur ×10 par défaut. Le multiplicateur du gros simple est configurable." : "Inner small single = sector value. Outer big single = sector value ×10 by default. The big-single multiplier is configurable."}</div>
    <div><b style={{ color: "#ff8e72" }}>{fr ? "ZONES À RISQUE" : "RISK ZONES"}</b><br/>{fr ? "Double = valeur du Double ×2 · Triple = valeur du Triple ×3 · Bull25 = 25 ×4 · MISS = total ×5 par défaut. Toutes ces sanctions sont configurables." : "Double = Double value ×2 · Triple = Triple value ×3 · Bull25 = 25 ×4 · MISS = total ×5 by default. All penalties are configurable."}</div>
    <div><b style={{ color: "#78f3d4" }}>DBULL</b><br/>{fr ? "Par défaut le 1er Bull50 divise immédiatement le score courant par 2, le 2e Bull50 cumulé le divise par 4, puis le 3e déclenche ZÉRO ABSOLU. Le calcul se fait au moment exact du hit : les fléchettes déjà jouées sont incluses, puis la volée continue normalement après le DBULL. Le diviseur de base et le seuil de ZÉRO ABSOLU sont configurables. À 0, un MISS multiplicatif repart du score de départ pour éviter un MISS gratuit." : "By default the 1st Bull50 immediately divides the current score by 2, the 2nd cumulative Bull50 divides it by 4, then the 3rd triggers ABSOLUTE ZERO. The effect happens at the exact hit: earlier darts in the visit are included and the player keeps throwing afterwards. The base divisor and ABSOLUTE ZERO threshold are configurable. At 0, a multiplicative MISS restarts from the configured starting score to prevent a free MISS."}</div>
    <div><b style={{ color: "#f2c84b" }}>{fr ? "TRIPLE NUL" : "TRIPLE ZERO"}</b><br/>{fr ? "Trois fléchettes dans le même petit simple pendant une volée = 0 point pour toute la volée." : "Three darts in the same small single during one visit = 0 points for the whole visit."}</div>
    <div><b style={{ color: "#8fffb7" }}>{fr ? "BOUCLIER DU HUN" : "HUN SHIELD"}</b><br/>{fr ? "Trois volées consécutives de TRIPLE NUL débloquent le bouclier : dans chaque volée, les 3 fléchettes doivent toucher le même petit simple. Le numéro peut changer d’une volée à l’autre. Une fois actif, le bouclier réduit les pénalités dangereuses. Seuil et puissance sont configurables." : "Three consecutive TRIPLE ZERO visits unlock the shield: in each visit, all 3 darts must hit the same small single. The number may change from one visit to the next. Once active, the shield reduces dangerous penalties. Threshold and strength are configurable."}</div>
    <div><b style={{ color: "#ffd84d" }}>JACKPOT</b><br/>{fr ? "Une ou deux zones spéciales apparaissent uniquement sur des DOUBLES ou des TRIPLES. Toucher une zone Jackpot annule la volée entière : 0 point. Le type de zone et son renouvellement sont configurables." : "One or two Jackpot zones appear only on DOUBLES or TRIPLES. Hitting a Jackpot cancels the whole visit: 0 points. Zone type and refresh behavior are configurable."}</div>
    <div><b style={{ color: "#65d8ff" }}>{fr ? "ZONES SPÉCIALES HORS CIBLE" : "SPECIAL OFF-BOARD ZONES"}</b><br/>{fr ? "P’TIT 1 reprend les mêmes zones fermées des chiffres et le contour extérieur que GROS 6. Dans le keypad, ouvre ZONE puis choisis exactement la zone touchée. Dans P’TIT 1, cette saisie est traitée comme un MISS spécial et applique la pénalité MISS configurée." : "P’TIT 1 uses the same enclosed number zones and outer ring as BIG 6. In the keypad, open ZONE and select the exact area hit. In P’TIT 1, that input is treated as a special MISS and applies the configured MISS penalty."}</div>
    <DartsSpecialZonesRulesVisual lang={lang} borderColor="#f2c84b66" />
  </div>;
}


export default function PtitHunConfig(props: any) {
  const { lang } = useLang();
  const rules = <Ptit1RulesContent lang={String(lang || "fr")} />;
  return <NewDartsModeConfig {...props} mode="ptit_hun" definition={{
    id: "ptit_hun",
    title: "P’TIT 1",
    ticker,
    accent: "#f2c84b",
    accent2: "#e04b2a",
    minPlayers: 1,
    maxPlayers: 12,
    playTab: "ptit_hun_play",
    guidedSteps: String(lang || "fr").toLowerCase().startsWith("fr") ? ["Participants", "Score & zones", "Bonus", "Jackpot", "Format", "Saisie", "Résumé"] : ["Participants", "Score & zones", "Bonuses", "Jackpot", "Format", "Input", "Summary"],
    rulesContent: rules,
  }} />;
}
