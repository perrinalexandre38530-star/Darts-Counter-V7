import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "marksPerBox", label: "Marques pour fermer", type: "select", defaultValue: 3, options: [{ value: 3, label: "3 · Classique" },{ value: 2, label: "2 · Rapide" },{ value: 4, label: "4 · Long" }] },
  { key: "overflowRule", label: "Surplus au-delà de la fermeture", type: "select", defaultValue: 1, options: [{ value: 1, label: "Poussés au joueur suivant · Classique" },{ value: 0, label: "Perdus" },{ value: 2, label: "Convertis en points" }] },
  { key: "overflowBonus", label: "Valeur d’un surplus converti", type: "select", defaultValue: 25, options: [{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
];

const DEDICATED_INTRO = "Ferme obligatoirement les cases dans l’ordre 15 → 16 → 17 → 18 → 19 → 20 → BULL. Une simple vaut 1 marque, un double 2, un triple 3 ; BULL/DBULL valent 1/2 marques.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
