import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mexicain" as const;
const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "targetMode", label: "Choix de la cible", type: "select", defaultValue: "random", options: [{ value: "random", label: "TIRAGE ALÉATOIRE · nouvelle cible à chaque manche" }, { value: "fixed", label: "CIBLE IMPOSÉE · même secteur à chaque manche" }] },
  { key: "fixedTarget", label: "Segment choisi (mode cible imposée)", type: "select", defaultValue: "20", options: [...Array.from({length:20},(_,i)=>({value:String(i+1), label:`SECTEUR ${i+1}`})), {value:"21", label:"BULL 25 / 50"}] },
  { key: "bullEnabled", label: "BULL dans le tirage", type: "select", defaultValue: "yes", options: [{ value: "yes", label: "Oui · secteurs 1 à 20 + BULL" }, { value: "no", label: "Non · secteurs 1 à 20" }] },
  { key: "progressive", label: "Variante · vies", type: "select", defaultValue: "classic", options: [{ value: "classic", label: "CLASSIQUE · 3 vies" }, { value: "survival", label: "SURVIE · 5 vies" }, { value: "progressive", label: "PROGRESSIF · 3 vies, sanction croissante" }] },
];
export default function MexicainConfig(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro="Ambiance fiesta mexicaine : avant chaque manche, la piñata désigne une cible commune. Chaque joueur lance trois fléchettes ; seules les touches sur cette cible comptent. Le plus petit score perd une vie ; si tout le monde est à égalité, aucune vie n'est retirée." />;
}
