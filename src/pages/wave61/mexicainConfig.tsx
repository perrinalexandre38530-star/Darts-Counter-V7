import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mexicain" as const;
const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "targetMode", label: "Choix de la cible", type: "select", defaultValue: "random", help: "MEXICO parcourt les secteurs dans un ordre imprévisible sans répétition jusqu'à épuisement (20 secteurs, ou 21 avec BULL). Une même cible est jouée par tous les participants pendant la manche.", options: [{ value: "random", label: "ALÉATOIRE · tirage à chaque manche (répétitions possibles)" }, { value: "mexico", label: "🇲🇽 MEXICO · nouveau secteur garanti à chaque manche, sans répétition" }, { value: "fixed", label: "CIBLE IMPOSÉE · même secteur à chaque manche" }] },
  { key: "fixedTarget", label: "Segment choisi (mode cible imposée)", type: "select", defaultValue: "20", options: [...Array.from({length:20},(_,i)=>({value:String(i+1), label:`SECTEUR ${i+1}`})), {value:"21", label:"BULL 25 / 50"}] },
  { key: "bullEnabled", label: "BULL dans le tirage", type: "select", defaultValue: "yes", options: [{ value: "yes", label: "Oui · secteurs 1 à 20 + BULL" }, { value: "no", label: "Non · secteurs 1 à 20" }] },
  { key: "progressive", label: "Variante · vies", type: "select", defaultValue: "classic", options: [{ value: "classic", label: "CLASSIQUE · 3 vies" }, { value: "survival", label: "SURVIE · 5 vies" }, { value: "progressive", label: "PROGRESSIF · 3 vies, sanction croissante" }] },
];
export default function MexicainConfig(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro="Ambiance fiesta mexicaine : avant chaque manche, la piñata désigne une cible commune. En MEXICO, elle change systématiquement sans répétition jusqu'à avoir parcouru les secteurs. Chaque joueur lance trois fléchettes ; seules les touches sur cette cible comptent. RÈGLE DES ÉGALITÉS : un score identique ne bloque jamais la validation. Si tout le monde est ex æquo, aucune vie perdue ; si plusieurs joueurs partagent le plus petit score et que d'autres font mieux, chaque dernier ex æquo perd une vie." />;
}
