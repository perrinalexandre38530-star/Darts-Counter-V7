import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "black_vs_white" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "firstTrack", label: "Attribution des pistes", type: "select", defaultValue: "random", options: [
    { value: "random", label: "ALÉATOIRE · premier joueur tiré au sort" },
    { value: "black", label: "J1 NOIR · alternance NOIR / BLANC" },
    { value: "white", label: "J1 BLANC · alternance BLANC / NOIR" },
  ] },
  { key: "dtRule", label: "Doubles / Triples de sa piste", type: "select", defaultValue: "bonus", options: [
    { value: "bonus", label: "BONUS · valeur réelle D/T" },
    { value: "neutral", label: "SIMPLE · valeur du numéro" },
    { value: "penalty", label: "INTERDIT · pénalité D/T" },
  ] },
  { key: "bullRule", label: "BULL 25 / BULL 50", type: "select", defaultValue: "bonus", options: [
    { value: "bonus", label: "BONUS · points configurés" },
    { value: "neutral", label: "NEUTRE · 0 point" },
    { value: "penalty", label: "INTERDIT · pénalité D/T" },
  ] },
  { key: "bullBonus", label: "Valeur du bonus BULL", type: "select", defaultValue: 25, options: [
    { value: 0, label: "0" }, { value: 10, label: "+10" }, { value: 25, label: "+25" }, { value: 50, label: "+50" },
  ] },
  { key: "wrongColorPenalty", label: "Pénalité simple adverse", type: "select", defaultValue: 5, options: [
    { value: 0, label: "0" }, { value: 5, label: "−5" }, { value: 10, label: "−10" }, { value: 20, label: "−20" },
  ] },
  { key: "missPenalty", label: "Pénalité MISS", type: "select", defaultValue: 5, options: [
    { value: 0, label: "0" }, { value: 5, label: "−5" }, { value: 10, label: "−10" }, { value: 20, label: "−20" },
  ] },
  { key: "dtPenalty", label: "Pénalité D/T ou BULL interdit", type: "select", defaultValue: 5, options: [
    { value: 0, label: "0" }, { value: 5, label: "−5" }, { value: 10, label: "−10" }, { value: 20, label: "−20" },
  ] },
  { key: "perfectVisitBonus", label: "Bonus 3 touches valides", type: "select", defaultValue: 0, options: [
    { value: 0, label: "AUCUN" }, { value: 5, label: "+5" }, { value: 10, label: "+10" }, { value: 20, label: "+20" },
  ] },
];

const DEDICATED_INTRO = "Chaque joueur reçoit une piste de SIMPLES NOIRE ou BLANCHE. Les simples de sa piste marquent leur valeur ; la couleur adverse et les MISS peuvent pénaliser. Les Doubles/Triples et le BULL suivent les règles choisies. Après le nombre de rounds configuré, le meilleur total gagne.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
