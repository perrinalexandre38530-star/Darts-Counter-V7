import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "black_vs_white" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "matchFormat", label: "Format de partie", type: "select", defaultValue: "duel", options: [
    { value: "duel", label: "DUEL · 2 joueurs" }, { value: "teams", label: "TEAM · 4 / 6 / 8 joueurs" }, { value: "multi_random", label: "MULTI ALÉATOIRE · 3 à 10 joueurs" },
  ], help: "Même structure de partie que GREEN VS RED : duel, équipes ou multi. Les pistes NOIRE/BLANCHE remplacent VERT/ROUGE." },
  { key: "seriesFormat", label: "Scoreboard / manches", type: "select", defaultValue: "single", options: [
    { value: "single", label: "1 MANCHE · sans scoreboard" }, { value: "bo3", label: "BO 3" }, { value: "bo5", label: "BO 5" }, { value: "bo7", label: "BO 7" }, { value: "ft3", label: "FT 3" }, { value: "ft5", label: "FT 5" }, { value: "ft7", label: "FT 7" }, { value: "ft9", label: "FT 9" }, { value: "ft11", label: "FT 11" },
  ] },
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
