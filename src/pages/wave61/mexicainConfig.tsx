import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mexicain" as const;
const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "bullEnabled", label: "BULL dans le tirage", type: "select", defaultValue: "yes", options: [{ value: "yes", label: "Oui · secteurs 1 à 20 + BULL" }, { value: "no", label: "Non · secteurs 1 à 20" }] },
  { key: "progressive", label: "Variante", type: "select", defaultValue: "classic", options: [{ value: "classic", label: "CLASSIQUE · 3 vies" }, { value: "survival", label: "SURVIE · 5 vies" }, { value: "progressive", label: "PROGRESSIF · 3 vies, malus croissant" }] },
];
export default function MexicainConfig(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro="Un numéro commun est tiré avant chaque manche. Trois fléchettes par joueur : seule la cible tirée compte. Le plus petit score perd une vie ; si tous sont ex æquo, personne ne perd de vie." />;
}
