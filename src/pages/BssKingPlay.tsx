// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import bssArt from "../assets/bss/bss_original.jpg";
import bssBg from "../assets/bss/bss_bg.webp";
import bssThrone from "../assets/bss/bss_throne_card.webp";
import bssPentagram from "../assets/bss/bss_pentagram.png";
import bssGearSkull from "../assets/bss/bss_gear_skull.png";
import bssSkullCross from "../assets/bss/bss_skull_cross.png";
import bssPtsBssBlock from "../assets/bss/ui/bss_pts_bss_block.webp";
import bssEcussonBlock from "../assets/bss/ui/bss_ecusson_block.webp";
import tickerBssKing from "../assets/tickers/ticker_bss_king.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { NewModeInput, avatarOf, dartLabel, isBotProfile, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import { cloneBssState, createBssState, evaluateBssVisit, getBssDartBoardColor, getBssDartSingleArea, normalizeBssConfig, pickBssBotDarts, playBssVisit, type BssState } from "../lib/gameEngines/bssKingEngine";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { PremiumAwenaButton } from "./newModes/PremiumPartyModeUi";
import { useLang } from "../contexts/LangContext";
import "./newModes/PremiumPartyModeUi.css";

const GOLD = "#f0c76a";
const RED = "#d74855";
const BG = "#09080b";
const SOFT = "#a9a1a5";
const COLORS = ["#f0c76a", "#ff667a", "#65d7ff", "#7df2a7", "#bc8cff", "#ff9b54", "#f9ed69", "#6de4da", "#ff7dd1", "#9dc3ff"];
const SHELL_BG = { backgroundImage: `linear-gradient(180deg, rgba(9,8,11,.82), rgba(9,8,11,.96)), url(${bssBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } as const;

type BssInputColor = "red" | "black" | "green" | "white";
type BssInputArea = "big" | "small";
const BSS_INPUT_COLORS: Array<{ id:BssInputColor; hex:string; label:string }> = [
  { id:"red", hex:"#d52232", label:"Rouge" },
  { id:"black", hex:"#111318", label:"Noir" },
  { id:"green", hex:"#199b58", label:"Vert" },
  { id:"white", hex:"#f2f1ea", label:"Blanc" },
];
function bssColorLabel(color:any){ return BSS_INPUT_COLORS.find(c=>c.id===String(color))?.label.toUpperCase() || String(color||"COULEUR").toUpperCase(); }
function bssInputLabel(color:BssInputColor|null, area:BssInputArea|null, previous?:string){
  const bits=["BSSMETA", color?`c=${color}`:"", area?`a=${area}`:""].filter(Boolean);
  return bits.length>1?bits.join("|"):(previous||undefined);
}

function panel(extra: any = {}) {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.09)",
    borderRadius: 18,
    background: "linear-gradient(180deg,rgba(24,20,24,.96),rgba(10,9,12,.985))",
    boxShadow: "0 12px 30px rgba(0,0,0,.34)",
    ...extra,
  };
}
function scoreLabel(d: any) { try { return dartLabel(d); } catch { return "—"; } }
function tagStyle(border: string, bg: string, fg = "#fff") {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: fg, fontSize: 10, fontWeight: 1000, letterSpacing: .4 } as const;
}
function formatMetricValue(value: any) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  if (Math.abs(num) >= 100) return num.toFixed(1).replace(/\.0$/, "");
  return num.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

const BSS_COLOR_HEX:Record<string,string>={red:"#ff4d5d",green:"#44d17a",black:"#b9c2cf",white:"#fff7dd"};
const BSS_COLOR_LABEL:Record<string,string>={red:"ROUGE",green:"VERT",black:"NOIR",white:"BLANC"};
const COLOR_CHALLENGES=new Set(["color","color_area","color_bed","color_target","color_bonus","three_colors"]);
const AREA_CHALLENGES=new Set(["big_single","small_single","color_area","area_parity","area_range","area_bonus"]);
function challengeUsesColor(ch:any){ return COLOR_CHALLENGES.has(String(ch?.kind||"")); }
function challengeUsesArea(ch:any){ return AREA_CHALLENGES.has(String(ch?.kind||"")); }
function bssHitVisual(d:any,lang:string,showColor:boolean){
  if(!d||d.bed==="MISS") return {label:"MISS",color:"#ff6f7d",background:"rgba(150,20,36,.30)",border:"rgba(255,120,135,.42)"};
  if(d.bed==="OB") return {label:lang==="fr"?"1/2 BULL":"BULL",color:"#8be0b8",background:"rgba(22,92,66,.35)",border:"rgba(139,224,184,.45)"};
  if(d.bed==="IB") return {label:lang==="fr"?"BULL":"DBULL",color:"#ffe6ea",background:"linear-gradient(180deg,rgba(255,86,106,.24),rgba(78,0,10,.46))",border:"rgba(255,152,165,.42)"};
  const n=Number(d.number||0), area=getBssDartSingleArea(d), boardColor=getBssDartBoardColor(d);
  let prefix=d.bed; let color="#fff"; let background="rgba(255,255,255,.055)"; let border="rgba(255,255,255,.12)";
  if(d.bed==="D"){color="#bfeaff";background="rgba(46,150,193,.20)";border="rgba(155,215,255,.38)";}
  else if(d.bed==="T"){color="#ffccff";background="rgba(179,68,151,.20)";border="rgba(255,208,255,.38)";}
  else if(area==="big"){prefix="G";color="#fff4df";background="linear-gradient(180deg,#f58a1f,#b94f00)";border="rgba(255,190,112,.72)";}
  else if(area==="small"){prefix="P";color="#5b3510";background="linear-gradient(180deg,#ffe795,#dcb442)";border="rgba(255,240,170,.82)";}
  const suffix=showColor&&boardColor?` ${BSS_COLOR_LABEL[boardColor]||String(boardColor).toUpperCase()}`:"";
  return {label:`${prefix}${n}${suffix}`,color,background,border,colorAccent:boardColor?BSS_COLOR_HEX[boardColor]:undefined};
}

function bssObjective(challenge: any, throneFinish: "bull" | "dbull") {
  if (challenge?.kind === "throne") return throneFinish === "dbull"
    ? { goal: "TOUCHE LE DBULL 50", scoring: "En phase TRÔNE, un seul DBULL 50 suffit. Les points ne comptent plus : la touche fait gagner immédiatement la partie." }
    : { goal: "TOUCHE LE BULL", scoring: "En phase TRÔNE, un Bull 25 ou un DBULL 50 suffit. Les points ne comptent plus : la touche fait gagner immédiatement la partie." };
  if (challenge?.kind === "target") return { goal: `VISE UNIQUEMENT LE ${challenge.target}`, scoring: `Seul le secteur ${challenge.target} compte : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS.` };
  if (challenge?.kind === "double") return { goal: "VISE LES DOUBLES", scoring: "Chaque Double touché vaut 3 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "triple") return { goal: "VISE LES TRIPLES", scoring: "Chaque Triple touché vaut 4 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "bull") return { goal: "VISE LE CENTRE", scoring: "Bull 25 = 2 points BSS · DBULL 50 = 5 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "low") return { goal: "VISE LES SECTEURS 1 À 10", scoring: "Seuls 1 à 10 comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  if (challenge?.kind === "high") return { goal: "VISE LES SECTEURS 11 À 20", scoring: "Seuls 11 à 20 comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  if (challenge?.kind === "even") return { goal: "PAIRS UNIQUEMENT", scoring: "Seuls les secteurs pairs comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  if (challenge?.kind === "odd") return { goal: "IMPAIRS UNIQUEMENT", scoring: "Seuls les secteurs impairs comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  if (challenge?.kind === "triple_even") return { goal: "TRIPLES PAIRS", scoring: "Seuls les triples d’un secteur pair comptent. Chaque réussite vaut 5 points BSS." };
  if (challenge?.kind === "dbull") return { goal: "BULLE ROUGE", scoring: "Seul le DBULL 50 compte. Chaque DBULL vaut 6 points BSS." };
  if (challenge?.kind === "color") return { goal: `COULEUR ${bssColorLabel(challenge.targetColor)}`, scoring: `Seules les zones ${bssColorLabel(challenge.targetColor)} comptent · Simple=1 · Double=2 · Triple=3.` };
  if (challenge?.kind === "big_single") return { goal: "GROS SIMPLE", scoring: "Seuls les GROS simples comptent · 2 points BSS par touche." };
  if (challenge?.kind === "small_single") return { goal: "PETIT SIMPLE", scoring: "Seuls les PETITS simples comptent · 2 points BSS par touche." };
  if (challenge?.kind === "color_area") return { goal: `${bssColorLabel(challenge.targetColor)} + ${challenge.targetArea === "small" ? "PETIT" : "GROS"}`, scoring: `Sélectionne ${bssColorLabel(challenge.targetColor)} + ${challenge.targetArea === "small" ? "PETIT" : "GROS"} puis la valeur du secteur · 3 points BSS par touche conforme.` };
  if (challenge?.kind === "color_bed") return { goal: `${bssColorLabel(challenge.targetColor)} + ${challenge.targetBed === "T" ? "TRIPLE" : "DOUBLE"}`, scoring: `Sélectionne ${bssColorLabel(challenge.targetColor)} + ${challenge.targetBed === "T" ? "TRIPLE" : "DOUBLE"} puis la valeur. Chaque touche conforme vaut ${challenge.targetBed === "T" ? 5 : 4} points BSS.` };
  if (challenge?.kind === "area_parity") return { goal: `${challenge.targetArea === "small" ? "PETITS" : "GROS"} ${challenge.targetParity === "odd" ? "IMPAIRS" : "PAIRS"}`, scoring: `Seuls les ${challenge.targetArea === "small" ? "petits" : "gros"} simples des secteurs ${challenge.targetParity === "odd" ? "impairs" : "pairs"} comptent · 3 points BSS par touche.` };
  if (challenge?.kind === "area_range") return { goal: `${challenge.targetArea === "small" ? "PETIT" : "GROS"} ${challenge.targetRange === "low" ? "1-10" : "11-20"}`, scoring: `Seuls les ${challenge.targetArea === "small" ? "petits" : "gros"} simples des secteurs ${challenge.targetRange === "low" ? "1 à 10" : "11 à 20"} comptent · 3 points BSS par touche.` };
  if (challenge?.kind === "color_target") return { goal: `${bssColorLabel(challenge.targetColor)} + ${challenge.target}`, scoring: `Seules les touches du secteur ${challenge.target} en ${bssColorLabel(challenge.targetColor)} comptent. Le lit touché augmente la valeur BSS.` };
  if (challenge?.kind === "color_bonus") return { goal: `BONUS ${bssColorLabel(challenge.targetColor)}`, scoring: `Toutes les touches comptent normalement, mais chaque fléchette en ${bssColorLabel(challenge.targetColor)} rapporte +2 points BSS.` };
  if (challenge?.kind === "area_bonus") return { goal: `BONUS ${challenge.targetArea === "small" ? "PETIT" : "GROS"}`, scoring: `Toutes les touches comptent normalement, mais chaque ${challenge.targetArea === "small" ? "petit" : "gros"} simple rapporte +2 points BSS.` };
  if (challenge?.kind === "sequence") return { goal: `SUITE ${challenge.sequenceStart}-${Number(challenge.sequenceStart || 1) + 1}-${Number(challenge.sequenceStart || 1) + 2}`, scoring: `Chaque secteur distinct de la suite rapporte 3 points BSS. Les trois secteurs touchés = +3 points bonus.` };
  if (challenge?.kind === "max_score") return { goal: `MAX ${challenge.maxScore}`, scoring: `Approche-toi le plus possible de ${challenge.maxScore} sans dépasser. Ton score BSS progresse jusqu’à 12 points ; dépassement = 0.` };
  if (challenge?.kind === "exact_score") return { goal: `EXACT ${challenge.exactScore}`, scoring: `Plus ton score réel est proche de ${challenge.exactScore}, plus tu marques. Exact = 12 points BSS ; proche = score intermédiaire.` };
  if (challenge?.kind === "no_miss") return { goal: "SANS FAUTE", scoring: "Les 3 fléchettes doivent toucher la cible. Un seul MISS annule toute la volée. Si les 3 touchent, Simple = 1 · Double = 2 · Triple = 3 · Bull = 2 · DBULL = 4." };
  if (challenge?.kind === "same_number") return { goal: "TRIPLÉ DE SECTEUR", scoring: "Répète le même numéro : 1 touche = 1 point BSS · une paire = 5 · un triplé = 10." };
  if (challenge?.kind === "three_different") return { goal: "3 SECTEURS DIFFÉRENTS", scoring: "Chaque numéro différent augmente ton score : 1 différent = 2 · 2 différents = 4 · 3 différents = 8 points BSS." };
  if (challenge?.kind === "one_each_bed") return { goal: "SIMPLE + DOUBLE + TRIPLE", scoring: "Simple = 2 · Double = 3 · Triple = 4 lorsqu’ils sont présents. Trio complet = +3 points bonus." };
  if (challenge?.kind === "sdt_target") return { goal: `S-D-T DU ${challenge.target}`, scoring: `Sur le ${challenge.target} : Simple = 2 · Double = 3 · Triple = 4. Trio complet = +3 points bonus.` };
  if (challenge?.kind === "ascending") return { goal: "MONTÉE", scoring: "1 point par fléchette valide +3 pour chaque progression correcte entre deux fléchettes. Montée parfaite = 9 points BSS." };
  if (challenge?.kind === "descending") return { goal: "DESCENTE", scoring: "1 point par fléchette valide +3 pour chaque descente correcte entre deux fléchettes. Descente parfaite = 9 points BSS." };
  if (challenge?.kind === "neighbors") return { goal: `VOISINS DU ${challenge.target}`, scoring: `Chaque voisin distinct touché rapporte 3 points BSS. Les trois zones touchées = +3 points bonus.` };
  if (challenge?.kind === "bull_sandwich") return { goal: "SANDWICH BULL", scoring: "Bull en 1re = 3 · touche centrale = 1 · Bull en 3e = 3. Sandwich complet = +4 points bonus." };
  if (challenge?.kind === "mirror") return { goal: "MIROIR", scoring: "Chaque touche vaut 1 point BSS. Si la 1re et la 3e fléchette touchent le même numéro : +6 points bonus." };
  if (challenge?.kind === "avoid_target") return { goal: `INTERDIT ${challenge.target}`, scoring: `Marque librement, mais si une seule fléchette touche le secteur ${challenge.target}, toute la volée vaut 0.` };
  if (challenge?.kind === "three_colors") return { goal: "3 COULEURS", scoring: "Chaque couleur différente rapporte 2 points BSS. Trois couleurs différentes = +3 points bonus." };
  if (challenge?.kind === "bull_double") return { goal: "BULL + DOUBLE", scoring: "Au moins un Bull = 4 points BSS · au moins un Double = 4 · les deux dans la volée = +2 bonus." };
  if (challenge?.kind === "min_score") return { goal: `CAP ${challenge.minScore}+`, scoring: `Ton score BSS augmente à mesure que tu approches puis dépasses ${challenge.minScore}. Maximum : 12 points BSS.` };
  if (challenge?.kind === "double_target") return { goal: `RÉPÈTE LE ${challenge.target}`, scoring: `Chaque touche sur le ${challenge.target} rapporte : Simple = 3 · Double = 4 · Triple = 5 points BSS.` };
  return { goal: "FAIS LE PLUS DE POINTS POSSIBLE", scoring: "Tournée libre : Simple = 1 · Double = 2 · Triple = 3 · Bull 25 = 2 · DBULL 50 = 4 points BSS." };
}
function bssObjectiveCompact(challenge: any, throneFinish: "bull" | "dbull") {
  if (challenge?.kind === "throne") return throneFinish === "dbull" ? "DBULL KING" : "BULL KING";
  if (challenge?.kind === "target") return `SECTEUR ${challenge.target}`;
  if (challenge?.kind === "double") return "DOUBLES";
  if (challenge?.kind === "triple") return "TRIPLES";
  if (challenge?.kind === "bull") return "CENTRE";
  if (challenge?.kind === "low") return "SECTEURS 1-10";
  if (challenge?.kind === "high") return "SECTEURS 11-20";
  if (challenge?.kind === "even") return "PAIRS";
  if (challenge?.kind === "odd") return "IMPAIRS";
  if (challenge?.kind === "triple_even") return "TRIPLES PAIRS";
  if (challenge?.kind === "dbull") return "DBULL ROUGE";
  if (challenge?.kind === "color") return `COULEUR ${bssColorLabel(challenge.targetColor)}`;
  if (challenge?.kind === "big_single") return "GROS SIMPLE";
  if (challenge?.kind === "small_single") return "PETIT SIMPLE";
  if (challenge?.kind === "color_area") return `${bssColorLabel(challenge.targetColor)} + ${challenge.targetArea === "small" ? "PETIT" : "GROS"}`;
  if (challenge?.kind === "color_bed") return `${bssColorLabel(challenge.targetColor)} + ${challenge.targetBed === "T" ? "TRIPLE" : "DOUBLE"}`;
  if (challenge?.kind === "area_parity") return `${challenge.targetArea === "small" ? "PETIT" : "GROS"} ${challenge.targetParity === "odd" ? "IMPAIRS" : "PAIRS"}`;
  if (challenge?.kind === "area_range") return `${challenge.targetArea === "small" ? "PETIT" : "GROS"} ${challenge.targetRange === "low" ? "1-10" : "11-20"}`;
  if (challenge?.kind === "color_target") return `${bssColorLabel(challenge.targetColor)} + ${challenge.target}`;
  if (challenge?.kind === "color_bonus") return `BONUS ${bssColorLabel(challenge.targetColor)}`;
  if (challenge?.kind === "area_bonus") return `BONUS ${challenge.targetArea === "small" ? "PETIT" : "GROS"}`;
  if (challenge?.kind === "sequence") return `SUITE ${challenge.sequenceStart}-${Number(challenge.sequenceStart || 1) + 1}-${Number(challenge.sequenceStart || 1) + 2}`;
  if (challenge?.kind === "max_score") return `MAX ${challenge.maxScore}`;
  if (challenge?.kind === "exact_score") return `EXACT ${challenge.exactScore}`;
  if (challenge?.kind === "no_miss") return "SANS FAUTE";
  if (challenge?.kind === "same_number") return "TRIPLÉ";
  if (challenge?.kind === "three_different") return "3 DIFFÉRENTS";
  if (challenge?.kind === "one_each_bed") return "S + D + T";
  if (challenge?.kind === "sdt_target") return `S-D-T ${challenge.target}`;
  if (challenge?.kind === "ascending") return "MONTÉE";
  if (challenge?.kind === "descending") return "DESCENTE";
  if (challenge?.kind === "neighbors") return `VOISINS ${challenge.target}`;
  if (challenge?.kind === "bull_sandwich") return "BULL / ? / BULL";
  if (challenge?.kind === "mirror") return "MIROIR";
  if (challenge?.kind === "avoid_target") return `INTERDIT ${challenge.target}`;
  if (challenge?.kind === "three_colors") return "3 COULEURS";
  if (challenge?.kind === "bull_double") return "BULL + DOUBLE";
  if (challenge?.kind === "min_score") return `CAP ${challenge.minScore}+`;
  if (challenge?.kind === "double_target") return `RÉPÈTE ${challenge.target}`;
  return "BEST SCORE";
}

function getPointsHelp(challenge: any, throneFinish: "bull" | "dbull") {
  const rows = [
    "Les points BSS = le total cumulé de tes points gagnés pendant les tournées.",
    "Ils servent à mesurer ta domination et à départager le classement si plusieurs joueurs ont le même nombre d’écussons.",
  ];
  if (challenge?.kind === "open") rows.push("Tournée libre : S=1 · D=2 · T=3 · Bull=2 · DBull=4.");
  if (challenge?.kind === "target") rows.push(`Défi secteur ${challenge.target} : seul ce secteur compte · S=1 · D=2 · T=3.`);
  if (challenge?.kind === "double") rows.push("Défi Double : chaque Double touché vaut 3 points BSS.");
  if (challenge?.kind === "triple") rows.push("Défi Triple : chaque Triple touché vaut 4 points BSS.");
  if (challenge?.kind === "bull") rows.push("Défi Bull : Bull 25 = 2 points BSS · DBULL 50 = 5 points BSS.");
  if (challenge?.kind === "low") rows.push("Défi 1 à 10 : seuls les secteurs 1 à 10 comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "high") rows.push("Défi 11 à 20 : seuls les secteurs 11 à 20 comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "even") rows.push("Défi pairs : seuls les numéros pairs comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "odd") rows.push("Défi impairs : seuls les numéros impairs comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "triple_even") rows.push("Défi triples pairs : un triple sur un secteur pair vaut 5 points BSS.");
  if (challenge?.kind === "dbull") rows.push("Défi bulle rouge : seul le DBULL 50 compte · 6 points BSS par DBULL.");
  if (challenge?.kind === "color") rows.push(`Défi couleur ${bssColorLabel(challenge.targetColor)} : la couleur se sélectionne puis la valeur du secteur est saisie. Simple=1 · Double=2 · Triple=3.`);
  if (challenge?.kind === "big_single") rows.push("Défi GROS SIMPLE : sélectionne GROS puis la valeur du secteur. Chaque bon gros simple vaut 2 points BSS.");
  if (challenge?.kind === "small_single") rows.push("Défi PETIT SIMPLE : sélectionne PETIT puis la valeur du secteur. Chaque bon petit simple vaut 2 points BSS.");
  if (challenge?.kind === "color_area") rows.push(`Défi combiné : sélectionne ${bssColorLabel(challenge.targetColor)} + ${challenge.targetArea === "small" ? "PETIT" : "GROS"} puis la valeur. Chaque touche conforme vaut 3 points BSS.`);
  if (challenge?.kind === "color_bed") rows.push(`Défi couleur + lit : sélectionne ${bssColorLabel(challenge.targetColor)} + ${challenge.targetBed === "T" ? "TRIPLE" : "DOUBLE"} puis la valeur. Chaque touche conforme vaut ${challenge.targetBed === "T" ? 5 : 4} points BSS.`);
  if (challenge?.kind === "area_parity") rows.push(`Défi zone + parité : ${challenge.targetArea === "small" ? "PETITS" : "GROS"} simples sur secteurs ${challenge.targetParity === "odd" ? "impairs" : "pairs"} · 3 points par touche.`);
  if (challenge?.kind === "area_range") rows.push(`Défi zone + plage : ${challenge.targetArea === "small" ? "PETITS" : "GROS"} simples sur ${challenge.targetRange === "low" ? "1 à 10" : "11 à 20"} · 3 points par touche.`);
  if (challenge?.kind === "color_target") rows.push(`Défi couleur + secteur : seules les touches ${bssColorLabel(challenge.targetColor)} du ${challenge.target} comptent, avec bonus selon le lit.`);
  if (challenge?.kind === "color_bonus") rows.push(`Défi bonus couleur : toutes les touches comptent et chaque touche ${bssColorLabel(challenge.targetColor)} ajoute +2 points BSS.`);
  if (challenge?.kind === "area_bonus") rows.push(`Défi bonus zone : toutes les touches comptent et chaque ${challenge.targetArea === "small" ? "PETIT" : "GROS"} simple ajoute +2 points BSS.`);
  if (challenge?.kind === "sequence") rows.push(`Défi suite : chaque secteur distinct de la suite rapporte 3 points BSS ; les trois = +3 bonus.`);
  if (challenge?.kind === "max_score") rows.push(`Défi plafond : score réel de la volée ≤ ${challenge.maxScore}. Plus tu t’approches du plafond sans le dépasser, mieux c’est. Dépassement = 0.`);
  if (challenge?.kind === "exact_score") rows.push(`Défi exact : exact = 12 points BSS ; plus tu t’éloignes de ${challenge.exactScore}, plus le score BSS diminue.`);
  if (challenge?.kind === "no_miss") rows.push("Défi sans faute : les 3 fléchettes doivent toucher la cible. Un MISS annule toute la volée.");
  if (challenge?.kind === "same_number") rows.push("Défi triplé : 1 répétition = 1 point, une paire sur le même numéro = 5, un triplé = 10.");
  if (challenge?.kind === "three_different") rows.push("Défi variété : 1 numéro différent = 2 points, 2 = 4, 3 = 8.");
  if (challenge?.kind === "one_each_bed") rows.push("Défi S+D+T : Simple=2 · Double=3 · Triple=4 · trio complet = +3 bonus.");
  if (challenge?.kind === "sdt_target") rows.push(`Défi S-D-T ${challenge.target} : Simple=2 · Double=3 · Triple=4 · trio complet = +3 bonus.`);
  if (challenge?.kind === "ascending") rows.push("Défi montée : 1 point par touche +3 pour chaque progression correcte. Montée parfaite = 9.");
  if (challenge?.kind === "descending") rows.push("Défi descente : 1 point par touche +3 pour chaque descente correcte. Descente parfaite = 9.");
  if (challenge?.kind === "neighbors") rows.push(`Défi voisins : chaque voisin distinct du ${challenge.target} vaut 3 points ; trio complet = +3 bonus.`);
  if (challenge?.kind === "bull_sandwich") rows.push("Défi sandwich Bull : 3 points par Bull aux extrémités, 1 au centre, +4 si le sandwich est complet.");
  if (challenge?.kind === "mirror") rows.push("Défi miroir : chaque touche vaut 1 ; si la 1re et la 3e ont le même numéro = +6 bonus.");
  if (challenge?.kind === "avoid_target") rows.push(`Défi interdit : toucher le ${challenge.target} annule toute la volée.`);
  if (challenge?.kind === "three_colors") rows.push("Défi 3 couleurs : chaque couleur différente vaut 2 ; trois couleurs = +3 bonus.");
  if (challenge?.kind === "bull_double") rows.push("Défi Bull + Double : Bull=4 · Double=4 · combinaison complète=+2 bonus.");
  if (challenge?.kind === "min_score") rows.push(`Défi CAP ${challenge.minScore}+ : le score BSS progresse avec le score réel, jusqu’à 12 points.`);
  if (challenge?.kind === "double_target") rows.push(`Défi répétition ${challenge.target} : chaque touche rapporte S=3 · D=4 · T=5 points BSS.`);
  if (challenge?.kind === "throne") rows.push(throneFinish === "dbull" ? "Phase TRÔNE : les points ne comptent plus, il faut toucher le DBULL 50." : "Phase TRÔNE : les points ne comptent plus, il faut toucher Bull 25 ou DBULL 50.");
  rows.push("Les écussons, eux, ne se gagnent qu’en terminant seul meilleur score de la tournée.");
  return rows;
}

function BssLineIcon({ name, size = 23 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "rules") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path {...p} d="M8 8h7M8 12h7M8 16h4"/></svg>;
  if (name === "points") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M13 2 5 13h6l-1 9 9-13h-6l0-7Z"/></svg>;
  if (name === "ranking") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z"/><path {...p} d="M6 5H4v2a4 4 0 0 0 4 4M18 5h2v2a4 4 0 0 1-4 4M12 12v3M9 20h6M10 15h4"/></svg>;
  if (name === "journal") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="5" y="3" width="14" height="18" rx="2"/><path {...p} d="M9 3v18M12 8h4M12 12h4M12 16h3"/></svg>;
  if (name === "beer") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 7h10v13H5zM15 10h2.3a2.7 2.7 0 0 1 0 5.4H15M7 4.5c0-1.2 1-2.2 2.2-2.2.8 0 1.5.4 1.9 1 .4-.4.9-.6 1.5-.6A2.4 2.4 0 0 1 15 5.1V7H7V4.5Z"/><path {...p} d="M8 10v7M11 10v7"/></svg>;
  if (name === "chaos") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m12 2 2.1 5.1L20 8l-4.2 4 1 5.8-4.8-2.7-4.8 2.7 1-5.8L4 8l5.9-.9L12 2Z"/><path {...p} d="m9.5 10 5 4M14.5 10l-5 4"/></svg>;
  if (name === "crown") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Z"/><path {...p} d="M7 21h10"/></svg>;
  if (name === "target") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>;
  if (name === "shield") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 19 6v5c0 4.8-2.7 8.2-7 10-4.3-1.8-7-5.2-7-10V6l7-3Z"/><path {...p} d="M9 12h6"/></svg>;
  if (name === "close") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m6 6 12 12M18 6 6 18"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="M12 8v5M12 16h.01"/></svg>;
}
function ToolIconButton({ name, label, onClick, active, accent }: any) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`bss-tool-icon ${active ? "is-active" : ""}`} style={{ ["--tool-accent" as any]: accent }}><BssLineIcon name={name} size={23}/></button>;
}
function ModalTabs({ items, value, onChange, accent }: any) {
  return <div className="bss-modal-tabs">{items.map((it:any)=><button key={it.id} type="button" onClick={()=>onChange(it.id)} className={value===it.id?"is-active":""} style={{ ["--tab-accent" as any]: accent }}>{it.label}</button>)}</div>;
}
function StatusPill({ icon, label, value, color, muted = false }: any) {
  return <div className="bss-status-pill" style={{ ["--pill-color" as any]: color, opacity: muted ? .72 : 1 }}><span><BssLineIcon name={icon} size={17}/></span><div><small>{label}</small><b>{value}</b></div></div>;
}

export default function BssKingPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const { lang } = useLang();
  const go = props?.go ?? props?.setTab, store = props?.store, onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeBssConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<BssState>(() => restored?.mode === "bss_king" ? cloneBssState(restored) : createBssState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(resumeRecord?.resume?.currentThrow) ? resumeRecord.resume.currentThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [selectedColor, setSelectedColor] = React.useState<BssInputColor | null>(null);
  const [selectedArea, setSelectedArea] = React.useState<BssInputArea | null>(null);
  const [notice, setNotice] = React.useState("");
  const [botRecap, setBotRecap] = React.useState<any>(null);
  const [overlay, setOverlay] = React.useState<null | "rules" | "points" | "ranking" | "journal" | "objective">(null);
  const [overlayTab, setOverlayTab] = React.useState("main");
  const playerStripRef = React.useRef<HTMLDivElement | null>(null);
  const [undo, setUndo] = React.useState<BssState[]>([]);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), checkpointRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `bss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const active = state.players[state.activePlayerIndex], activeProfile = active ? profileById.get(String(active.id)) || active : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const activeBotHitRate = Number(activeProfile?.bssHitRate);
  const activeBotStars = Number(activeProfile?.bssStars || 0);
  const configLaunchMode = config.quickParty === true || config.partyMode === "quick" ? "quick" : "arcade";
  const backToConfig = React.useCallback(() => go?.("bss_king_config", { launchMode: configLaunchMode }), [go, configLaunchMode]);
  const activeColor = active ? COLORS[Math.max(0, state.players.findIndex((p: any) => p.id === active.id)) % COLORS.length] : GOLD;
  const throneMode = Boolean(active && state.throneReady?.[active.id]);
  const challenge = throneMode ? { kind: "throne", title: "PRENDS LE TRÔNE", subtitle: config.rules.throneFinish === "dbull" ? "DBULL 50 obligatoire" : "BULL 25 ou DBULL 50", icon: "👑" } : state.challenge;
  const objective = React.useMemo(() => bssObjective(challenge, config.rules.throneFinish), [challenge, config.rules.throneFinish]);
  const objectiveCompact = React.useMemo(() => bssObjectiveCompact(challenge, config.rules.throneFinish), [challenge, config.rules.throneFinish]);
  const needsColorInput = challengeUsesColor(challenge);
  const needsAreaInput = challengeUsesArea(challenge);
  const pointsHelp = React.useMemo(() => getPointsHelp(challenge, config.rules.throneFinish), [challenge, config.rules.throneFinish]);
  const activeBadges = Number(state.badges[active?.id] || 0);
  const badgesRemaining = Math.max(0, Number(config.rules.badgesToThrone || 0) - activeBadges);
  const winReminder = throneMode
    ? "Phase TRÔNE : ici le score ne compte plus, seule la bonne touche donne la victoire."
    : `${badgesRemaining} écusson${badgesRemaining > 1 ? "s" : ""} avant le TRÔNE · meilleur score de la tournée = 1 écusson.`;
  const currentThrowSummary = currentThrow.length ? currentThrow.map((d: any) => scoreLabel(uiToGameDart(d))).join(" · ") : (throneMode ? "👑 Tente le Trône" : "🎯 Jusqu’à 3 fléchettes");
  const currentGameDarts = React.useMemo(() => currentThrow.map(uiToGameDart), [currentThrow]);
  const decorateBssInputDart = React.useCallback((d:any) => ({ ...d, label: bssInputLabel(selectedColor, selectedArea, d?.label) }), [selectedColor, selectedArea]);
  const resetBssInputSelectors = React.useCallback(() => { setMultiplier(1); setSelectedColor(null); setSelectedArea(null); }, []);
  const selectBssArea = React.useCallback((area:BssInputArea) => { setSelectedArea(v => v===area ? null : area); setMultiplier(1); }, []);
  const selectBssMultiplier = React.useCallback((value:1|2|3) => { setSelectedArea(null); setMultiplier(value); }, []);
  const liveVisitScore = React.useMemo(() => currentGameDarts.reduce((sum: number, d: any) => {
    if (!d || d.bed === "MISS") return sum;
    if (d.bed === "IB") return sum + 50;
    if (d.bed === "OB") return sum + 25;
    const n = Number(d.number || 0);
    return sum + n * (d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1);
  }, 0), [currentGameDarts]);
  const liveBssPoints = React.useMemo(() => evaluateBssVisit(currentGameDarts, challenge as any), [currentGameDarts, challenge]);
  const objectiveBullets = React.useMemo(() => String(objective?.scoring || "").split("·").map((part:string)=>part.trim()).filter(Boolean), [objective]);
  const upcomingChallenges = React.useMemo(() => [challenge, ...((state.challengeQueue || []).slice(0, 24))], [challenge, state.challengeQueue]);
  const playedChallenges = React.useMemo(() => [...(state.playedChallenges || [])].slice().reverse(), [state.playedChallenges]);
  const appendBssInputDart = React.useCallback((dart: UIDart) => {
    setCurrentThrow((prev: UIDart[]) => prev.length >= 3 ? prev : [...prev, decorateBssInputDart(dart)]);
    resetBssInputSelectors();
  }, [decorateBssInputDart, resetBssInputSelectors]);
  const renderBssHitChip = React.useCallback((dart:UIDart|undefined,index:number) => {
    const gd=dart?uiToGameDart(dart):null;
    if(!gd) return <span className="bss-hit-chip is-empty" data-i18n-skip="true">—</span>;
    const visual=bssHitVisual(gd,lang,needsColorInput);
    return <span className="bss-hit-chip" data-i18n-skip="true" style={{color:visual.color,background:visual.background,borderColor:visual.border,boxShadow:visual.colorAccent?`inset 0 -3px 0 ${visual.colorAccent}88`:undefined}}>{visual.label}</span>;
  },[lang,needsColorInput]);
  const throneLabel = config.rules.throneFinish === "dbull" ? "DBULL ONLY" : "BULL / DBULL";
  const modeMood = config.rules.chaosEnabled ? "CHAOS ACTIVÉ" : "MODE CLASSIQUE";
  const ranking = React.useMemo(() => [...state.players].map((p: any, i: number) => ({ p, badges: Number(state.badges[p.id] || 0), influence: Number(state.influence[p.id] || 0), i })).sort((a, b) => b.badges - a.badges || b.influence - a.influence || a.i - b.i), [state.players, state.badges, state.influence]);
  const roundHistory = React.useMemo(() => {
    const map = new Map<number, any[]>();
    for (const v of state.visits || []) {
      const r = Number(v?.round || 0);
      if (!r) continue;
      const rows = map.get(r) || [];
      rows.push(v);
      map.set(r, rows);
    }
    return [...map.entries()].sort((a,b)=>b[0]-a[0]).map(([round, visits]) => {
      const scoreById: Record<string, number> = {};
      for (const v of visits) scoreById[String(v.playerId)] = Number(v.score || 0);
      const rows = state.players.map((p:any, i:number)=>({ p, score:Number(scoreById[p.id] || 0), i })).sort((a,b)=>b.score-a.score||a.i-b.i);
      const best = rows[0]?.score || 0;
      const winners = best > 0 ? rows.filter((x:any)=>x.score===best) : [];
      return { round, rows, best, winnerId: winners.length === 1 ? winners[0].p.id : null, tie: winners.length > 1, complete: visits.length >= state.players.length };
    });
  }, [state.visits, state.players]);
  const currentRoundRanking = React.useMemo(() => state.players.map((p:any,i:number)=>({p,score:Number(state.roundScores[p.id]||0),played:(state.roundPlayedIds||[]).includes(p.id),i})).sort((a,b)=>b.score-a.score||a.i-b.i), [state.players,state.roundScores,state.roundPlayedIds]);
  const winner = state.winnerId ? profileById.get(String(state.winnerId)) || state.players.find((p: any) => p.id === state.winnerId) : null;

  const buildRecord = React.useCallback((s: BssState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const rankingRows = [...s.players].map((p: any, i: number) => ({ id: p.id, name: p.name, badges: Number(s.badges[p.id] || 0), influence: Number(s.influence[p.id] || 0), order: i })).sort((a, b) => b.badges - a.badges || b.influence - a.influence || a.order - b.order);
    const quickParty = s.config.quickParty === true || s.config.partyMode === "quick";
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "bss_king", mode: "bss_king", sport: "darts", status, quickParty, partyMode: quickParty ? "quick" : "arcade", createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "bss_king", badgesToThrone: s.config.rules.badgesToThrone, quickParty },
      summary: { mode: "bss_king", quickParty, partyMode: quickParty ? "quick" : "arcade", finished: status === "finished", winnerId: s.winnerId, badges: s.badges, influence: s.influence, ranking: rankingRows, config: s.config, totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs: Math.max(0, (status === "finished" ? (s.finishedAt || Date.now()) : Date.now()) - Number(s.startedAt || Date.now())) },
      resume: { mode: "bss_king", config: s.config, state: cloneBssState(s), currentThrow: draft.slice(0, 3), updatedAt: Date.now() },
      payload: { kind: "bss_king", mode: "bss_king", sport: "darts", quickParty, partyMode: quickParty ? "quick" : "arcade", config: s.config, stateSnapshot: cloneBssState(s), currentThrow: draft.slice(0, 3), visits: s.visits, stats: { mode: "bss_king", players: s.statsByPlayer, badges: s.badges, influence: s.influence } },
    };
  }, [profiles, currentThrow]);

  const save = React.useCallback(async (s: BssState, draft: UIDart[] = currentThrow) => { try { await History.upsert(buildRecord(s, "in_progress", draft)); } catch (e) { console.warn("[BSS KING] checkpoint failed", e); } }, [buildRecord, currentThrow]);
  React.useEffect(() => { if (checkpointRef.current) return; checkpointRef.current = true; if (state.phase !== "finished") void save(state, currentThrow); }, [save, state, currentThrow]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void save(state, currentThrow), 180); return () => window.clearTimeout(t); }, [state.activePlayerIndex, state.round, currentThrow, save]);
  React.useEffect(() => { if (state.phase !== "finished" || finishedRef.current) return; finishedRef.current = true; const rec = buildRecord(state, "finished", []); if (typeof onFinish === "function") onFinish(rec, { navigate: false }); else void History.upsert(rec).catch(() => { }); }, [state, onFinish, buildRecord]);

  const validate = React.useCallback(() => {
    if (!active || activeIsBot || !currentThrow.length) return;
    const darts = currentThrow.map(uiToGameDart);
    setUndo(v => [...v.slice(-9), cloneBssState(state)]);
    const next = playBssVisit(state, darts);
    const last = next.visits[next.visits.length - 1];
    setState(next);
    setCurrentThrow([]);
    resetBssInputSelectors();
    setNotice(last?.events?.[0] || "");
  }, [active, activeIsBot, currentThrow, state, resetBssInputSelectors]);

  const doUndo = React.useCallback(() => {
    if (currentThrow.length) { setCurrentThrow(v => v.slice(0, -1)); return; }
    setUndo(v => {
      const copy = [...v], prev = copy.pop();
      if (prev) { setState(prev); setNotice("Dernière tournée annulée"); }
      return copy;
    });
  }, [currentThrow]);

  React.useEffect(() => {
    if (state.phase !== "playing" || !activeIsBot || botBusy.current || botRecap) return;
    botBusy.current = true;
    const botPlayer=active; const botProfile=activeProfile; const botChallenge=challenge; const botObjective=objectiveCompact; const badgesBefore=Number(state.badges?.[botPlayer?.id]||0);
    const t = window.setTimeout(() => {
      const darts = pickBssBotDarts(state, config.botLevel, Number.isFinite(activeBotHitRate) ? activeBotHitRate : undefined);
      setUndo(v => [...v.slice(-9), cloneBssState(state)]);
      const next = playBssVisit(state, darts);
      const last = next.visits[next.visits.length - 1];
      setState(next);
      setNotice("");
      setBotRecap({ player:botPlayer, profile:botProfile, darts:last?.darts||darts, score:Number(last?.score||0), events:last?.events||[], objective:botObjective, challenge:botChallenge, badgesBefore, badgesAfter:Number(next.badges?.[botPlayer?.id]||0) });
      botBusy.current = false;
    }, 760);
    return () => { window.clearTimeout(t); botBusy.current = false; };
  }, [state, activeIsBot, config.botLevel, activeBotHitRate, botRecap]);

  React.useEffect(() => {
    awena?.setRuntimeContext?.({
      route: "bss_king_play",
      modeId: "bss_king",
      screenLabel: "BSS KING · Partie",
      facts: {
        round: state.round,
        challenge: challenge.title,
        objective: objective.goal,
        scoring: objective.scoring,
        badgesToThrone: config.rules.badgesToThrone,
        activeBadges,
        badgesRemaining,
        throneMode,
        activePlayer: active?.name || "",
        bssPoints: "Les points BSS sont les points cumulés marqués pendant les tournées. Ils servent notamment au départage si des joueurs ont autant d’écussons.",
        scoringExamples: pointsHelp.join(" "),
        howToWin: "Gagner seul une tournée = 1 écusson. Atteindre le quota d’écussons débloque le Trône. Réussir le Bull final configuré = victoire immédiate.",
      }
    });
  }, [awena, state.round, challenge.title, objective.goal, objective.scoring, active?.name, config.rules.badgesToThrone, activeBadges, badgesRemaining, throneMode, pointsHelp]);

  React.useEffect(() => {
    const el = playerStripRef.current?.querySelector(`[data-bss-player-id="${String(active?.id || "")}"]`) as HTMLElement | null;
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }), 40);
  }, [active?.id, state.round]);
  React.useEffect(() => {
    if (!overlay) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOverlay(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);
  React.useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2700);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (state.phase === "finished") return <div style={{ height: "100dvh", overflow: "auto", background: `radial-gradient(circle at 50% 12%,rgba(215,72,85,.24),transparent 34%),${BG}`, ...SHELL_BG, color: "#fff" }}>
    <PageHeader tickerSrc={tickerBssKing} tickerAlt="BSS KING" tickerHeight={72} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={backToConfig} color={GOLD} glow={`${GOLD}88`} /></div>} />
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 90px" }}>
      <section style={panel({ padding: 20, textAlign: "center", border: `1px solid ${GOLD}66`, boxShadow: `0 0 34px ${GOLD}20,0 18px 50px rgba(0,0,0,.5)` })}>
        <img src={bssPentagram} alt="" aria-hidden style={{ position: "absolute", right: -18, top: -18, width: 200, opacity: .08 }} />
        <div style={{ fontSize: 13, fontWeight: 1000, letterSpacing: 2, color: GOLD }}>👑 BSS KING 👑</div>
        <div style={{ display: "grid", placeItems: "center", marginTop: 12 }}><ProfileAvatar profile={winner} size={96} showStars={false} ringColor={GOLD} /></div>
        <div style={{ fontSize: 30, fontWeight: 1100, marginTop: 8 }}>{playerName(winner)}</div>
        <div style={{ color: SOFT, marginTop: 4 }}>s'assoit sur le trône et devient le BSS KING.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <span style={tagStyle(`${GOLD}77`, "rgba(240,199,106,.14)", GOLD)}>COURONNEMENT {throneLabel}</span>
          <span style={tagStyle("rgba(255,255,255,.15)", "rgba(255,255,255,.06)")}>TOURNÉES {state.round}</span>
          <span className="bss-result-metric bss-result-metric--badge"><b>{formatMetricValue(state.badges?.[state.winnerId] || 0)}</b><small>ÉCUSSONS</small></span>
          <span className="bss-result-metric bss-result-metric--beer"><b>{formatMetricValue(state.influence?.[state.winnerId] || 0)}</b><small>PTS BSS</small></span>
        </div>
        <img src={bssArt} alt="Il était une fois les BSS" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 15, marginTop: 16, border: "1px solid rgba(255,255,255,.1)" }} />
        <div style={{ marginTop: 12, fontSize: 11.2, color: SOFT, lineHeight: 1.45 }}>Rappel : les écussons font progresser vers le Trône. Les points BSS représentent le total de points cumulés sur les tournées et servent aussi de départage si nécessaire.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 16 }}>
          <button onClick={() => { const fresh = createBssState(players, config); setState(fresh); setUndo([]); setNotice(""); setOverlay(null); finishedRef.current = false; matchIdRef.current = `bss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }} style={{ padding: 13, borderRadius: 999, border: `1px solid ${GOLD}99`, background: `${GOLD}18`, color: "#fff", fontWeight: 1000 }}>↻ REJOUER</button>
          <button onClick={backToConfig} style={{ padding: 13, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 1000 }}>CONFIGURATION</button>
        </div>
        <button onClick={() => go?.("games", { gamesView: "all" })} style={{ width: "100%", marginTop: 8, padding: 13, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: "#ddd", fontWeight: 900 }}>RETOUR AUX JEUX</button>
      </section>
    </div>
  </div>;

  return <div className="bss19-play" style={{ ["--bss-accent" as any]: activeColor }} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerBssKing} tickerAlt="BSS KING" tickerHeight={82} tickerFit="contain" tickerEdgeFade="strong" tickerImageScale={1} tickerBottomGap={6} left={<div style={{ marginLeft: 7 }}><BackDot onClick={backToConfig} color={activeColor} glow={`${activeColor}88`} /></div>} right={awena?.enabled !== false ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="bss_king_play" mode="bss_king" screenLabel="BSS KING · Partie" accent={activeColor} /></div> : null} />

    <div className="bss-player-ribbon" ref={playerStripRef} aria-label="Résumé des joueurs">
      {state.players.map((p:any, idx:number) => {
        const prof = profileById.get(String(p.id)) || p;
        const on = String(p.id) === String(active?.id);
        const badges = Number(state.badges[p.id] || 0);
        const pts = Number(state.influence[p.id] || 0);
        const throne = Boolean(state.throneReady?.[p.id]);
        const color = COLORS[idx % COLORS.length];
        const avatarSrc = avatarOf(prof) || null;
        return <button type="button" key={p.id} data-bss-player-id={String(p.id)} onClick={() => { setOverlayTab("global"); setOverlay("ranking"); }} className={`bss-ribbon-player ${on ? "is-active" : ""} ${throne ? "is-throne" : ""}`} style={{ ["--player-color" as any]: on ? activeColor : color }}>
          <span className="bss-ribbon-bg" aria-hidden style={avatarSrc ? { backgroundImage: `url(${avatarSrc})` } : undefined} />
          <span className="bss-ribbon-scrim" aria-hidden />
          <b className="bss-ribbon-name">{p.name}</b>
          <div className="bss-ribbon-meters">
            <span className="bss-ribbon-meter bss-ribbon-meter--badge" title={`Écussons : ${formatMetricValue(badges)}`}>{formatMetricValue(badges)}</span>
            <span className="bss-ribbon-meter bss-ribbon-meter--beer" title={`Points BSS : ${formatMetricValue(pts)}`}>{formatMetricValue(pts)}</span>
          </div>
          {on ? <strong>À TOI</strong> : null}
        </button>;
      })}
    </div>

    <main className="bss19-main">
      {notice ? <div className="bss-turn-toast"><BssLineIcon name="beer" size={20}/><div><b>TOURNÉE</b><span>{notice}</span></div></div> : null}

      {overlay ? <div className="bss-modal-backdrop" onMouseDown={() => setOverlay(null)} role="presentation">
        <section className={`bss-modal ${overlay === "ranking" ? "is-ranking" : ""}`} onMouseDown={(e)=>e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="bss-modal-head">
            <div className="bss-modal-head-icon"><BssLineIcon name={overlay === "ranking" ? "ranking" : overlay === "journal" ? "journal" : overlay === "points" ? "points" : overlay === "objective" ? "target" : "rules"} size={25}/></div>
            <div><small>{overlay === "rules" ? "RÈGLES BSS KING" : overlay === "points" ? "POINTS BSS" : overlay === "ranking" ? "CLASSEMENTS" : overlay === "journal" ? "JOURNAL" : "OBJECTIF"}</small><h3>{overlay === "rules" ? "Comment gagner la partie" : overlay === "points" ? "Comprendre les points BSS" : overlay === "ranking" ? "Suivre toute la partie" : overlay === "journal" ? "Historique des actions" : objective.goal}</h3></div>
            <button type="button" className="bss-modal-close" onClick={() => setOverlay(null)} aria-label="Fermer"><BssLineIcon name="close" size={21}/></button>
          </div>

          {overlay === "objective" ? <>
            <ModalTabs accent={activeColor} value={overlayTab} onChange={setOverlayTab} items={[{id:"main",label:"OBJECTIF"},{id:"scale",label:"BARÈME"},{id:"all",label:"TOURNÉES À JOUER"},{id:"done",label:"TOURNÉES JOUÉES"},{id:"win",label:"VICTOIRE"}]}/>
            <div className="bss-modal-body">
              {overlayTab === "main" ? <div className="bss-objective-detail"><span>OBJECTIF ACTUEL · TOURNÉE {state.round}</span><h2>{objective.goal}</h2><div className="bss-rich-list">{objectiveBullets.map((line:string,i:number)=><div key={i}><b>{i+1}.</b><span>{line}</span></div>)}</div><div className="bss-objective-callout">{winReminder}</div></div> : null}
              {overlayTab === "scale" ? <div className="bss-list-cards">{pointsHelp.map((line:string,i:number)=>{const bits=String(line||"").split("·").map((part:string)=>part.trim()).filter(Boolean);return <div key={i}><b>{i===0?"POINTS BSS":i===1?"À QUOI SERVENT-ILS ?":`RÈGLE ${i-1}`}</b><span>{bits[0]||line}</span>{bits.length>1?<ul>{bits.slice(1).map((bit:string,idx:number)=><li key={idx}>{bit}</li>)}</ul>:null}</div>;})}</div> : null}
              {overlayTab === "all" ? <div className="bss-objective-grid">{upcomingChallenges.map((c:any,idx:number)=>{const d=bssObjective(c,config.rules.throneFinish);const current=idx===0;return <div key={`${c.kind}-${idx}`} className={current?"is-current":""}><small>{current?`TOURNÉE ${state.round} · EN COURS`:`TOURNÉE ${state.round+idx} · À JOUER`}</small><b>{d.goal}</b><p>{d.scoring}</p></div>;})}{state.replayChallenges?.length?<div><small>RÉSERVE ÉGALITÉS</small><b>{state.replayChallenges.length} contrat(s) en attente</b><p>Si le plan complet est consommé, les tournées terminées à égalité seront rejouées automatiquement.</p></div>:null}</div> : null}
              {overlayTab === "done" ? (playedChallenges.length ? <div className="bss-objective-grid">{playedChallenges.map((row:any,idx:number)=>{const d=bssObjective(row.challenge,config.rules.throneFinish);const winnerNames=(row.winnerIds||[]).map((id:string)=>state.players.find((p:any)=>p.id===id)?.name||"Joueur");const result=row.tie?`Égalité à ${row.bestScore} pts BSS · ${winnerNames.join(" / ")}`:row.winnerId?`${winnerNames[0]||"Joueur"} gagne l'écusson avec ${row.bestScore} pts BSS.`:row.blank?"Aucun point marqué sur cette tournée.":"Tournée terminée.";return <div key={`${row.round}-${idx}`}><small>TOURNÉE {row.round}</small><b>{d.goal}</b><p>{result}</p></div>;})}</div> : <p className="bss-empty">Aucune tournée effectuée pour le moment.</p>) : null}
              {overlayTab === "win" ? <div className="bss-win-steps">{[
                ["1","JOUE LA TOURNÉE","Tous les joueurs tentent le même objectif avec jusqu’à 3 fléchettes."],
                ["2","GAGNE L’ÉCUSSON","Le seul meilleur score de la tournée gagne 1 écusson BSS."],
                ["3","DÉBLOQUE LE TRÔNE",`Atteins ${config.rules.badgesToThrone} écussons pour passer en phase de couronnement.`],
                ["4","DEVIENS KING",config.rules.throneFinish === "dbull" ? "Touche le DBULL 50 pendant ta tentative de Trône." : "Touche Bull 25 ou DBULL 50 pendant ta tentative de Trône."]
              ].map((x:any)=><div key={x[0]}><i>{x[0]}</i><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</div> : null}
            </div>
          </> : null}

          {overlay === "rules" ? <div className="bss-modal-body"><div className="bss-win-steps">{[
            ["1","MÊME DÉFI POUR TOUS","Chaque tournée impose exactement le même objectif à tous les joueurs."],
            ["2","MEILLEUR SCORE = ÉCUSSON","Le seul meilleur score de la tournée gagne 1 écusson. Égalité en tête : aucun écusson."],
            ["3","ÉCUSSONS = ACCÈS AU TRÔNE",`À ${config.rules.badgesToThrone} écussons, la prochaine tentative du joueur devient une tentative de Trône.`],
            ["4","CENTRE FINAL = VICTOIRE",config.rules.throneFinish === "dbull" ? "DBULL 50 obligatoire pour devenir BSS KING." : "Bull 25 ou DBULL 50 suffisent pour devenir BSS KING."]
          ].map((x:any)=><div key={x[0]}><i>{x[0]}</i><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</div></div> : null}

          {overlay === "points" ? <div className="bss-modal-body"><div className="bss-points-hero"><BssLineIcon name="points" size={34}/><div><b>POINTS BSS</b><span>Ils correspondent aux points gagnés en respectant l’objectif de chaque tournée. Ils s’additionnent sur toute la partie et départagent les joueurs à nombre d’écussons égal.</span></div></div><div className="bss-list-cards">{pointsHelp.map((line:string,i:number)=>{const bits=String(line||"").split("·").map((part:string)=>part.trim()).filter(Boolean);return <div key={i}><b>{i===0?"TOTAL BSS":i===1?"DÉPARTAGE":`BARÈME ${i-1}`}</b><span>{bits[0]||line}</span>{bits.length>1?<ul>{bits.slice(1).map((bit:string,idx:number)=><li key={idx}>{bit}</li>)}</ul>:null}</div>;})}</div></div> : null}

          {overlay === "ranking" ? <>
            <ModalTabs accent={activeColor} value={overlayTab} onChange={setOverlayTab} items={[{id:"global",label:"GLOBAL"},{id:"round",label:"TOURNÉE"},{id:"history",label:"HISTORIQUE"},{id:"progress",label:"TRÔNE"}]}/>
            <div className="bss-modal-body">
              {overlayTab === "global" ? <div className="bss-ranking-list">{ranking.map(({p,badges,influence}:any,idx:number)=>{const prof=profileById.get(String(p.id))||p;const on=String(p.id)===String(active?.id);return <div key={p.id} className={on?"is-active":""}><strong>{idx+1}</strong><ProfileAvatar profile={prof} size={40} showStars={false} ringColor={on?activeColor:"rgba(255,255,255,.14)"}/><div><b>{p.name}</b><span>{badges} écusson{badges!==1?"s":""} · {influence} pts BSS</span></div><em>{state.throneReady?.[p.id]?"TRÔNE":""}</em></div>})}</div> : null}
              {overlayTab === "round" ? <div className="bss-ranking-list">{currentRoundRanking.map(({p,score,played}:any,idx:number)=>{const prof=profileById.get(String(p.id))||p;const on=String(p.id)===String(active?.id);return <div key={p.id} className={on?"is-active":""}><strong>{idx+1}</strong><ProfileAvatar profile={prof} size={40} showStars={false} ringColor={on?activeColor:"rgba(255,255,255,.14)"}/><div><b>{p.name}</b><span>{played?"Tournée jouée":"À jouer"}</span></div><em>{score} pts</em></div>})}</div> : null}
              {overlayTab === "history" ? <div className="bss-round-history">{roundHistory.length ? roundHistory.map((r:any)=><div key={r.round}><header><b>TOURNÉE {r.round}</b><span>{r.winnerId ? `${state.players.find((p:any)=>p.id===r.winnerId)?.name || "Joueur"} +1 écusson` : r.tie ? "Égalité · aucun écusson" : r.complete ? "Aucun écusson" : "En cours"}</span></header><section>{r.rows.map((x:any)=><span key={x.p.id} className={r.winnerId===x.p.id?"is-winner":""}>{x.p.name}<b>{x.score}</b></span>)}</section></div>) : <p className="bss-empty">Aucune tournée terminée pour le moment.</p>}</div> : null}
              {overlayTab === "progress" ? <div className="bss-throne-progress">{ranking.map(({p,badges,influence}:any)=>{const prof=profileById.get(String(p.id))||p;const ratio=Math.min(1,badges/Math.max(1,config.rules.badgesToThrone));return <div key={p.id}><ProfileAvatar profile={prof} size={42} showStars={false} ringColor={state.throneReady?.[p.id]?GOLD:"rgba(255,255,255,.16)"}/><div><b>{p.name}</b><span>{badges}/{config.rules.badgesToThrone} écussons · {influence} pts BSS</span><i><u style={{width:`${ratio*100}%`}}/></i></div><strong>{state.throneReady?.[p.id]?"👑":""}</strong></div>})}</div> : null}
            </div>
          </> : null}

          {overlay === "journal" ? <div className="bss-modal-body"><div className="bss-journal">{state.events.slice().reverse().map((e:string,i:number)=><div key={`${e}-${i}`} className={i===0?"is-latest":""}><i/><span>{e}</span></div>)}</div></div> : null}
        </section>
      </div> : null}
      {botRecap ? <div className="bss-bot-recap-backdrop" role="presentation"><section className="bss-bot-recap" role="dialog" aria-modal="true">
        <div className="bss-bot-recap-head"><ProfileAvatar profile={botRecap.profile||botRecap.player} size={54} showStars={false} ringColor={activeColor}/><div><small>BOT BSS · {Number(botRecap.profile?.bssStars)>0 ? `${Number(botRecap.profile.bssStars)}★` : "TOURNÉE"}</small><h3>{String(botRecap.player?.name||"BOT").toUpperCase()}</h3><span>{botRecap.objective}</span></div></div>
        <div className="bss-bot-recap-hits">{(botRecap.darts||[]).map((d:any,i:number)=>{const v=bssHitVisual(d,lang,challengeUsesColor(botRecap.challenge));return <span key={i} data-i18n-skip="true" style={{color:v.color,background:v.background,borderColor:v.border,boxShadow:v.colorAccent?`inset 0 -3px 0 ${v.colorAccent}88`:undefined}}>{v.label}</span>})}</div>
        <div className="bss-bot-recap-score"><div><small>PTS BSS</small><b>+{formatMetricValue(botRecap.score)}</b></div><div><small>ÉCUSSONS</small><b>{botRecap.badgesAfter}</b></div></div>
        <p>{botRecap.badgesAfter>botRecap.badgesBefore?"🏆 Le BOT remporte la tournée : +1 écusson.":(botRecap.events?.[0]||"Tournée du BOT terminée.")}</p>
        <button type="button" onClick={()=>setBotRecap(null)}>CONTINUER</button>
      </section></div> : null}
      <div className="bss-main-grid">
        <div className="bss-left-column">
          <section className="bss-active-card">
            <div className="bss-active-watermark"><ProfileAvatar profile={activeProfile} size={170} showStars={false} ringColor="transparent" /></div>
            <div className="bss-active-shade" />
            <div className="bss-status-row">
              <StatusPill icon="beer" label="TOURNÉE" value={state.round} color={GOLD}/>
              <StatusPill icon="chaos" label="CHAOS" value={config.rules.chaosEnabled ? "ACTIF" : "OFF"} color={config.rules.chaosEnabled ? "#59e18b" : "#ff5b65"}/>
              <StatusPill icon="crown" label="COURONNEMENT" value={throneLabel} color={GOLD}/>
            </div>
            <div className="bss-active-content">
              <div className="bss-score-side">
                <div className="bss-active-name" style={{ color: activeColor }}>{String(active?.name || "").toUpperCase()}</div>
                <div className="bss-score-metrics">
                  <div className="bss-metric-item bss-metric-item--score">
                    <div className="bss-live-score"><b>{liveBssPoints}</b></div>
                    <span>SCORE BSS · TOURNÉE</span>
                  </div>
                  <div className="bss-metric-item bss-metric-item--shield">
                    <div className="bss-shape-metric is-shield"><b>{formatMetricValue(activeBadges)}</b></div>
                    <span>ÉCUSSONS</span>
                  </div>
                  <div className="bss-metric-item bss-metric-item--pack">
                    <div className="bss-shape-metric is-pack"><b>{formatMetricValue(Number(state.influence[active?.id] || 0))}</b></div>
                    <span>PTS BSS</span>
                  </div>
                </div>
              </div>
              <button type="button" className="bss-objective-card" onClick={() => { setOverlayTab("main"); setOverlay("objective"); }}>
                <small>OBJECTIF</small>
                <b>{objectiveCompact}</b>
              </button>
            </div>
          </section>

          <div className="bss-tool-row" aria-label="Informations de partie">
            <ToolIconButton name="rules" label="Règles" active={overlay === "rules"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("rules"); }}/>
            <ToolIconButton name="points" label="Points BSS" active={overlay === "points"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("points"); }}/>
            <ToolIconButton name="ranking" label="Classement" active={overlay === "ranking"} accent={activeColor} onClick={() => { setOverlayTab("global"); setOverlay("ranking"); }}/>
            <ToolIconButton name="journal" label="Journal" active={overlay === "journal"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("journal"); }}/>
          </div>
        </div>

        <div className="bss-input-column">
          {!activeIsBot ? <NewModeInput
            currentThrow={currentThrow}
            setCurrentThrow={setCurrentThrow}
            multiplier={multiplier}
            setMultiplier={selectBssMultiplier}
            onValidate={validate}
            onCancel={() => { setCurrentThrow([]); resetBssInputSelectors(); }}
            dartDecorator={decorateBssInputDart}
            onDartCommitted={resetBssInputSelectors}
            keypadPreviewRenderer={renderBssHitChip}
            keypadExtraMainButtons={needsAreaInput ? [
              { label: "GROS", onClick: () => selectBssArea("big"), active: selectedArea === "big", tone: "orange", title: "Gros simple" },
              { label: "PETIT", onClick: () => selectBssArea("small"), active: selectedArea === "small", tone: "yellow", title: "Petit simple" },
            ] : null}
            keypadColorButtons={needsColorInput ? BSS_INPUT_COLORS.map((c) => ({
              color: c.hex,
              onClick: () => setSelectedColor((v) => v === c.id ? null : c.id),
              active: selectedColor === c.id,
              title: c.label,
              ariaLabel: "Couleur " + c.label,
            })) : null}
            keypadLatchMultiplier
            keypadSecondaryAction={{ label: "BULL", icon: <span data-i18n-skip="true" style={{fontWeight:1000}}>{lang === "fr" ? "1/2 BULL" : "BULL"}</span>, onClick: () => appendBssInputDart({ v:25, mult:1 }), tone: "green", title: "BULL 25" }}
            keypadAuxActionOverride={{ label: "DBULL", icon: <span data-i18n-skip="true" style={{fontWeight:1000}}>{lang === "fr" ? "BULL" : "DBULL"}</span>, onClick: () => appendBssInputDart({ v:50, mult:1 }), tone: "red", title: "DBULL 50" }}
            preferredMethod={config.scoreInputMethod}
            minDartsToValidate={1}
            validateLabel={throneMode ? "TRÔNE" : "VALIDER"}
            accent={activeColor}
            fitMinScale={0.42}
            keypadFooterHideBull
            keypadActionRowLayout="triple"
            keypadFooterLeftSlot={<div className="bss-keypad-footer-points-wrap"><div className="bss-keypad-footer-points"><b>+{liveBssPoints}</b></div><span>PTS BSS</span></div>}
            centerSlot={<div className="bss-keypad-score-box"><span>SCORE</span><b>{liveVisitScore}</b>{(selectedColor||selectedArea)?<small>{[selectedColor?BSS_INPUT_COLORS.find(c=>c.id===selectedColor)?.label:null,selectedArea==="big"?"GROS":selectedArea==="small"?"PETIT":null].filter(Boolean).join(" · ")}</small>:null}</div>}
          /> : <div className="bss-bot-panel"><ProfileAvatar profile={activeProfile} size={88} showStars={false} ringColor={activeColor}/><b>{active?.name}</b><span>{activeBotStars>0?`${activeBotStars}★ · `:""}Le BOT BSS prépare sa tournée…</span></div>}
        </div>
      </div>
    </main>

    <style>{`
      .bss19-play{position:fixed;inset:0;width:100vw;height:100dvh;max-height:100dvh;overflow:hidden;display:flex;flex-direction:column;background:radial-gradient(circle at 50% 0%,rgba(215,72,85,.17),transparent 32%),${BG};background-image:linear-gradient(180deg,rgba(9,8,11,.82),rgba(9,8,11,.96)),url(${bssBg});background-size:cover;background-position:center;color:#fff;box-sizing:border-box;overscroll-behavior:none}
      .bss19-play *{box-sizing:border-box}
      .bss-result-metric{position:relative;width:98px;height:78px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 12px 8px;background-position:center;background-repeat:no-repeat;background-size:contain;text-align:center;filter:drop-shadow(0 6px 12px rgba(0,0,0,.35));text-shadow:0 1px 5px rgba(0,0,0,.92)}.bss-result-metric--badge{background-image:url(${bssEcussonBlock});color:${GOLD}}.bss-result-metric--beer{background-image:url(${bssPtsBssBlock});color:#ff9f1c}.bss-result-metric b{max-width:100%;font-size:17px;line-height:.95;font-weight:1200;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bss-result-metric small{margin-top:3px;font-size:5.9px;line-height:1;font-weight:1100;letter-spacing:.32px;color:currentColor}
      .bss-player-ribbon{flex:0 0 96px;min-height:96px;display:flex;align-items:center;gap:8px;overflow-x:auto;overflow-y:hidden;margin-top:12px;padding:6px 9px 8px;scroll-snap-type:x proximity;scrollbar-width:none;background:linear-gradient(90deg,rgba(7,8,12,.92),rgba(18,15,19,.9),rgba(7,8,12,.92));border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08)}
      .bss-player-ribbon::-webkit-scrollbar{display:none}
      .bss-ribbon-player{scroll-snap-align:center;position:relative;overflow:hidden;flex:0 0 126px;height:78px;min-width:126px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(20,19,23,.96),rgba(7,8,11,.98));color:#fff;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:6px 7px 8px;text-align:center;cursor:pointer;transition:.18s ease;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)}
      .bss-ribbon-player.is-active{flex-basis:144px;border-color:var(--player-color);background:linear-gradient(180deg,color-mix(in srgb,var(--player-color) 16%,rgba(20,18,23,.98)),rgba(7,8,11,.98));box-shadow:0 0 18px color-mix(in srgb,var(--player-color) 24%,transparent), inset 0 0 0 1px color-mix(in srgb,var(--player-color) 22%,transparent)}
      .bss-ribbon-player.is-throne:not(.is-active){border-color:rgba(240,199,106,.45)}.bss-ribbon-bg{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;opacity:.42;transform:scale(1.18);filter:saturate(1.02) contrast(1.06)}.bss-ribbon-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,9,13,.18),rgba(7,9,13,.42) 40%,rgba(7,9,13,.72) 100%)}.bss-ribbon-name{position:relative;z-index:1;display:block;width:100%;padding-top:1px;text-align:center;font-size:10px;font-weight:1000;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7)}.bss-ribbon-meters{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;align-items:end}.bss-ribbon-meter{position:relative;display:grid;place-items:center;height:46px;padding:0 8px;font-size:11.25px;line-height:.9;font-weight:1200;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 5px rgba(0,0,0,.85);background-position:center;background-repeat:no-repeat;background-size:contain}.bss-ribbon-meter--badge{background-image:url(${bssEcussonBlock});color:${GOLD}}.bss-ribbon-meter--beer{background-image:url(${bssPtsBssBlock});color:#ff9f1c}
      .bss-ribbon-copy{min-width:0}.bss-ribbon-copy b{display:block;font-size:8.7px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bss-ribbon-copy span{display:block;margin-top:4px;color:#a8a1aa;font-size:7.5px;white-space:nowrap}.bss-ribbon-copy i{font-style:normal;color:var(--player-color);font-weight:1100}.bss-ribbon-copy em{font-style:normal;color:#74707a}
      .bss-ribbon-player>strong{position:absolute;right:5px;top:4px;z-index:2;padding:2px 5px;border-radius:999px;background:var(--player-color);color:#05070a;font-size:6.1px;font-weight:1200;letter-spacing:.4px}
      .bss19-main{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;padding:6px 9px 9px}
      .bss-main-grid{height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,.92fr) minmax(380px,1.08fr);gap:8px}
      .bss-left-column{min-height:0;display:flex;flex-direction:column;gap:6px;align-items:stretch;overflow:hidden}.bss-input-column{min-height:0;overflow:hidden}
      .bss-active-card{position:relative;flex:0 0 auto;min-height:238px;overflow:hidden;border-radius:17px;border:1px solid color-mix(in srgb,var(--bss-accent) 48%,rgba(255,255,255,.08));background:linear-gradient(135deg,rgba(19,18,23,.98),rgba(7,8,11,.98));box-shadow:0 12px 34px rgba(0,0,0,.32),0 0 22px color-mix(in srgb,var(--bss-accent) 10%,transparent)}
      .bss-active-watermark{position:absolute;left:-28px;bottom:-40px;opacity:.14;transform:scale(1.35);filter:saturate(.8);pointer-events:none}.bss-active-shade{position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--bss-accent) 8%,transparent),rgba(0,0,0,.05) 42%,rgba(0,0,0,.36));pointer-events:none}
      .bss-status-row{position:relative;z-index:2;height:49px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:7px 7px 0}
      .bss-status-pill{min-width:0;height:38px;border-radius:11px;border:1px solid color-mix(in srgb,var(--pill-color) 42%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--pill-color) 8%,rgba(3,5,8,.62));display:grid;grid-template-columns:27px minmax(0,1fr);align-items:center;padding:4px 6px;gap:5px}.bss-status-pill>span{color:var(--pill-color);display:grid;place-items:center}.bss-status-pill div{min-width:0}.bss-status-pill small{display:block;color:#83808a;font-size:6.1px;font-weight:1000;letter-spacing:.55px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bss-status-pill b{display:block;margin-top:2px;color:var(--pill-color);font-size:8.4px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bss-active-content{position:relative;z-index:2;height:calc(100% - 49px);display:grid;grid-template-columns:minmax(0,1.28fr) minmax(128px,.72fr);gap:7px;padding:5px 7px 8px}.bss-score-side{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.bss-active-name{max-width:100%;margin-top:1px;font-size:16px;font-weight:1250;letter-spacing:.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;text-shadow:0 0 18px color-mix(in srgb,var(--bss-accent) 18%,transparent)}
      .bss-score-metrics{width:100%;display:grid;grid-template-columns:minmax(0,1.12fr) 80px 88px;gap:8px;align-items:flex-end;margin-top:8px}.bss-metric-item{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;min-width:0}.bss-metric-item>span{font-size:6.1px;font-weight:1100;letter-spacing:.48px;color:#9a95a0;text-transform:uppercase;line-height:1.1;text-align:center}.bss-live-score{width:100%;height:86px;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 32%,rgba(255,255,255,.07));background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center}.bss-live-score b{color:var(--bss-accent);font-size:clamp(40px,5.8vw,60px);line-height:.82;font-weight:1200;text-shadow:0 0 22px color-mix(in srgb,var(--bss-accent) 34%,transparent)}.bss-shape-metric{position:relative;width:100%;height:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 12px 8px;border:0;background-color:transparent;background-position:center;background-repeat:no-repeat;background-size:contain;filter:drop-shadow(0 6px 12px rgba(0,0,0,.36));text-align:center;overflow:visible}.bss-shape-metric.is-shield{background-image:url(${bssEcussonBlock});color:${GOLD}}.bss-shape-metric.is-pack{background-image:url(${bssPtsBssBlock});color:#ff9f1c}.bss-shape-metric b{max-width:100%;font-size:17px;line-height:.94;font-weight:1200;color:currentColor;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 5px rgba(0,0,0,.9)}
      .bss-objective-card{position:relative;overflow:hidden;min-width:0;height:100%;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 42%,rgba(255,255,255,.08));background-color:#0a090b;background-image:linear-gradient(180deg,rgba(16,8,10,.42),rgba(7,8,10,.70)),url(${bssThrone});background-repeat:no-repeat,no-repeat;background-position:center,center;background-size:cover,auto 95%;color:#fff;padding:10px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;box-shadow:inset 0 0 30px rgba(0,0,0,.25)}.bss-objective-card small{margin-top:0;color:${RED};font-size:7px;font-weight:1200;letter-spacing:.9px}.bss-objective-card>b{margin-top:6px;font-size:clamp(12px,1.45vw,18px);line-height:1.06;font-weight:1250;letter-spacing:.4px;max-width:100%;white-space:normal;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .bss-tool-row{flex:0 0 50px;display:flex;gap:6px;align-items:center;justify-content:center;padding:3px 5px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,15,19,.92),rgba(7,8,11,.96))}.bss-tool-icon{width:44px;height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(21,22,28,.98),rgba(6,8,12,.98));color:#cfd5df;display:grid;place-items:center;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.015)}.bss-tool-icon.is-active,.bss-tool-icon:hover{color:var(--tool-accent);border-color:color-mix(in srgb,var(--tool-accent) 55%,rgba(255,255,255,.08));box-shadow:0 0 15px color-mix(in srgb,var(--tool-accent) 18%,transparent)}
      .bss-input-column>[data-mss-play-input="1"]{height:100%!important}.bss-keypad-live{min-width:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;line-height:1}.bss-keypad-live b{color:#fff;font-size:24px;font-weight:1250;line-height:.9}.bss-keypad-bss{width:52px;height:34px;display:grid;place-items:center;background-image:url(${bssPtsBssBlock});background-position:center;background-repeat:no-repeat;background-size:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))}.bss-keypad-bss span{display:block;color:#ff9f1c;font-size:10px;font-weight:1200;text-shadow:0 1px 4px rgba(0,0,0,.85)}.bss-keypad-live>small{color:#d7dbe4;font-size:6.6px;font-weight:1000;letter-spacing:.35px;white-space:nowrap}.bss-bot-panel{height:100%;min-height:0;border-radius:17px;border:1px solid color-mix(in srgb,var(--bss-accent) 38%,rgba(255,255,255,.08));background:linear-gradient(180deg,rgba(14,16,22,.97),rgba(5,7,10,.98));display:flex;flex-direction:column;align-items:center;justify-content:center}.bss-bot-panel>b{margin-top:9px;color:var(--bss-accent);font-size:20px}.bss-bot-panel>span{margin-top:5px;color:#969cac;font-size:10px}
      .bss-turn-toast{position:absolute;z-index:40;left:50%;top:8px;transform:translateX(-50%);width:min(520px,calc(100% - 18px));min-height:48px;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 45%,rgba(255,255,255,.08));background:rgba(8,9,12,.94);backdrop-filter:blur(10px);box-shadow:0 16px 42px rgba(0,0,0,.45);display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:8px;padding:7px 11px;color:var(--bss-accent);animation:bssToastIn .2s ease-out}.bss-turn-toast div{min-width:0}.bss-turn-toast b{display:block;font-size:7px;letter-spacing:.8px}.bss-turn-toast span{display:block;margin-top:2px;color:#fff;font-size:9.6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@keyframes bssToastIn{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}
      .bss-modal-backdrop{position:fixed;z-index:10000;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(5px);display:grid;place-items:center;padding:14px}.bss-modal{position:relative;isolation:isolate;width:min(760px,100%);max-height:min(82dvh,760px);overflow:hidden;border-radius:19px;border:1px solid color-mix(in srgb,var(--bss-accent) 44%,rgba(255,255,255,.10));background:linear-gradient(180deg,rgba(21,18,22,.995),rgba(7,8,11,.995));box-shadow:0 26px 80px rgba(0,0,0,.65);display:flex;flex-direction:column}.bss-modal::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0;transition:opacity .18s ease}.bss-modal.is-ranking::before{opacity:.16;background-image:linear-gradient(180deg,rgba(12,10,14,.1),rgba(6,7,10,.52)),url(${bssThrone});background-repeat:no-repeat,no-repeat;background-position:center,center;background-size:cover,min(520px,74%) auto}.bss-modal>*{position:relative;z-index:1}.bss-modal-head{flex:0 0 auto;display:grid;grid-template-columns:42px minmax(0,1fr) 38px;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.bss-modal-head-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--bss-accent);background:color-mix(in srgb,var(--bss-accent) 9%,rgba(0,0,0,.4));border:1px solid color-mix(in srgb,var(--bss-accent) 35%,transparent)}.bss-modal-head small{display:block;color:var(--bss-accent);font-size:7.5px;font-weight:1100;letter-spacing:.9px}.bss-modal-head h3{margin:2px 0 0;font-size:15px;line-height:1.1}.bss-modal-close{width:36px;height:36px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;display:grid;place-items:center;cursor:pointer}.bss-modal-tabs{flex:0 0 auto;display:flex;gap:5px;padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto;scrollbar-width:none}.bss-modal-tabs::-webkit-scrollbar{display:none}.bss-modal-tabs button{flex:0 0 auto;min-width:88px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#959ba8;font-size:7.6px;font-weight:1100;letter-spacing:.35px;cursor:pointer}.bss-modal-tabs button.is-active{color:var(--tab-accent);border-color:color-mix(in srgb,var(--tab-accent) 50%,transparent);background:color-mix(in srgb,var(--tab-accent) 9%,rgba(0,0,0,.35))}.bss-modal-body{min-height:0;overflow:auto;padding:11px 12px 14px}
      .bss-objective-detail{text-align:center;padding:9px}.bss-objective-detail>span{color:var(--bss-accent);font-size:8px;font-weight:1100;letter-spacing:.8px}.bss-objective-detail h2{margin:7px 0 0;font-size:clamp(22px,4vw,36px)}.bss-objective-detail p{max-width:620px;margin:8px auto 0;color:#b2adb5;font-size:11px;line-height:1.55}.bss-objective-callout{margin:12px auto 0;max-width:620px;border-radius:13px;border:1px solid rgba(240,199,106,.25);background:rgba(240,199,106,.07);padding:9px 10px;color:${GOLD};font-size:9.8px;font-weight:900}
      .bss-list-cards{display:grid;gap:7px}.bss-list-cards>div{border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.03);padding:9px 10px}.bss-list-cards b{display:block;color:var(--bss-accent);font-size:8px;letter-spacing:.55px}.bss-list-cards span{display:block;margin-top:3px;color:#ddd8df;font-size:10px;line-height:1.45}.bss-objective-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bss-objective-grid>div{border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);padding:9px}.bss-objective-grid small{color:var(--bss-accent);font-size:7px;font-weight:1100}.bss-objective-grid b{display:block;margin-top:3px;font-size:10.5px}.bss-objective-grid p{margin:4px 0 0;color:#96919a;font-size:8.7px;line-height:1.35}
      .bss-win-steps{display:grid;gap:7px}.bss-win-steps>div{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);padding:8px 9px}.bss-win-steps i{width:31px;height:31px;border-radius:999px;display:grid;place-items:center;background:var(--bss-accent);color:#071014;font-style:normal;font-weight:1200}.bss-win-steps b{display:block;font-size:9px}.bss-win-steps span{display:block;margin-top:2px;color:#a29da6;font-size:8.8px;line-height:1.35}.bss-points-hero{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 38%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--bss-accent) 8%,rgba(0,0,0,.25));padding:10px;margin-bottom:8px;color:var(--bss-accent)}.bss-points-hero b{display:block}.bss-points-hero span{display:block;margin-top:3px;color:#ddd8df;font-size:9.3px;line-height:1.4}
      .bss-ranking-list{display:grid;gap:6px}.bss-ranking-list>div{display:grid;grid-template-columns:28px 42px minmax(0,1fr) auto;gap:8px;align-items:center;border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.025);padding:7px 8px}.bss-ranking-list>div.is-active{border-color:color-mix(in srgb,var(--bss-accent) 55%,transparent);background:color-mix(in srgb,var(--bss-accent) 8%,rgba(0,0,0,.2))}.bss-ranking-list>div>strong{color:${GOLD};text-align:center}.bss-ranking-list b{display:block;font-size:10px}.bss-ranking-list span{display:block;margin-top:2px;color:#908b94;font-size:8px}.bss-ranking-list em{font-style:normal;color:var(--bss-accent);font-size:8.5px;font-weight:1100}.bss-round-history{display:grid;gap:8px}.bss-round-history>div{border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.025);overflow:hidden}.bss-round-history header{display:flex;justify-content:space-between;gap:8px;padding:7px 9px;background:rgba(255,255,255,.035)}.bss-round-history header b{color:var(--bss-accent);font-size:8px}.bss-round-history header span{color:#aaa4ad;font-size:7.5px}.bss-round-history section{display:flex;gap:4px;overflow-x:auto;padding:7px}.bss-round-history section span{flex:0 0 auto;min-width:90px;border-radius:9px;border:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.18);padding:5px 7px;color:#aaa4ad;font-size:7.5px}.bss-round-history section span b{float:right;color:#fff;font-size:9px}.bss-round-history section span.is-winner{border-color:rgba(240,199,106,.38);color:${GOLD}}.bss-empty{text-align:center;color:#8d8891;font-size:9px;padding:24px}.bss-throne-progress{display:grid;gap:7px}.bss-throne-progress>div{display:grid;grid-template-columns:44px minmax(0,1fr) 30px;gap:9px;align-items:center;border-radius:12px;padding:7px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.bss-throne-progress b{font-size:9.5px}.bss-throne-progress span{display:block;margin-top:2px;color:#908b95;font-size:7.6px}.bss-throne-progress i{display:block;margin-top:5px;height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.bss-throne-progress u{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--bss-accent),${GOLD})}.bss-throne-progress strong{text-align:center;font-size:17px}.bss-journal{display:grid;gap:0}.bss-journal>div{display:grid;grid-template-columns:8px minmax(0,1fr);gap:8px;padding:8px 2px;border-top:1px solid rgba(255,255,255,.055)}.bss-journal>div:first-child{border-top:0}.bss-journal i{width:7px;height:7px;border-radius:99px;background:rgba(255,255,255,.18);margin-top:3px}.bss-journal .is-latest i{background:var(--bss-accent);box-shadow:0 0 10px color-mix(in srgb,var(--bss-accent) 70%,transparent)}.bss-journal span{font-size:9px;line-height:1.4;color:#aaa5ad}.bss-journal .is-latest span{color:#fff}
      @media (max-width:980px){.bss-player-ribbon{flex-basis:92px;min-height:92px}.bss19-main{padding:4px 6px 6px}.bss-main-grid{grid-template-columns:1fr;grid-template-rows:auto 50px minmax(0,1fr);gap:5px}.bss-left-column{display:contents}.bss-active-card{grid-row:1;min-height:168px}.bss-tool-row{grid-row:2;height:50px}.bss-input-column{grid-row:3;min-height:0}.bss-active-content{grid-template-columns:minmax(0,1.24fr) minmax(126px,.76fr)}.bss-status-row{height:43px;padding-top:5px}.bss-status-pill{height:34px}.bss-active-content{height:calc(100% - 43px)}.bss-score-metrics{grid-template-columns:minmax(0,1.1fr) 72px 78px;gap:6px}.bss-live-score{height:76px}.bss-shape-metric{height:78px;padding:5px 10px 7px}.bss-shape-metric b{font-size:15px}.bss-metric-item>span{font-size:5.5px}.bss-live-score b{font-size:41px}.bss-ribbon-player{flex-basis:118px;min-width:118px;height:74px}.bss-ribbon-player.is-active{flex-basis:134px}.bss-ribbon-meter{height:42px;font-size:10.75px}.bss-objective-card{background-size:cover,auto 100%}}
      @media (max-width:620px){.bss-player-ribbon{padding-left:6px;padding-right:6px;gap:7px;margin-top:14px}.bss-ribbon-player{flex-basis:112px;min-width:112px;height:72px}.bss-ribbon-player.is-active{flex-basis:130px}.bss-ribbon-name{font-size:9px}.bss-ribbon-meter{height:38px;padding:0 5px;font-size:10px}.bss-active-card{min-height:172px}.bss-status-pill{grid-template-columns:22px minmax(0,1fr);padding:3px 4px}.bss-status-pill small{font-size:5.5px}.bss-status-pill b{font-size:7.4px}.bss-active-content{grid-template-columns:minmax(0,1.18fr) minmax(108px,.72fr);gap:5px;padding:4px 5px 6px}.bss-active-name{font-size:13px}.bss-score-metrics{grid-template-columns:minmax(0,1fr) 62px 72px;gap:4px;margin-top:4px}.bss-live-score{height:70px}.bss-live-score b{font-size:36px}.bss-shape-metric{height:72px;padding:5px 8px 7px}.bss-shape-metric b{font-size:13px}.bss-metric-item>span{font-size:4.8px}.bss-objective-card{padding:7px 5px;background-size:cover,100% 100%}.bss-objective-card>b{font-size:10px}.bss-tool-row{justify-content:space-around}.bss-tool-icon{width:42px;height:42px}.bss-modal-backdrop{padding:7px}.bss-modal{max-height:88dvh}.bss-objective-grid{grid-template-columns:1fr}.bss-modal-tabs button{min-width:82px}.bss-modal.is-ranking::before{background-size:cover,88% auto}}
      @media (max-height:720px) and (orientation:landscape){.bss-player-ribbon{flex:0 0 74px;min-height:74px}.bss-ribbon-player{height:62px}.bss-main-grid{grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);grid-template-rows:1fr}.bss-left-column{display:flex}.bss-active-card{min-height:0;height:min(278px,calc(100dvh - 140px))}.bss-tool-row{flex:0 0 46px;height:46px}.bss-tool-icon{width:40px;height:40px}.bss-keypad-score-box{max-width:74px;padding:4px 6px}.bss-keypad-score-box b{font-size:20px}.bss-keypad-score-box small{font-size:5.2px}.bss-keypad-footer-points-wrap{max-width:70px;gap:1px}.bss-keypad-footer-points-wrap>span{font-size:5.6px}.bss-keypad-footer-points{width:70px;height:36px}.bss-keypad-footer-points b{font-size:11px}.bss-objective-card{background-size:cover,auto 88%}.bss-modal.is-ranking::before{background-size:cover,66% auto}}

      .bss-hit-chip{display:inline-flex;align-items:center;justify-content:center;min-width:62px;max-width:118px;height:42px;padding:0 10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);font-size:12px;font-weight:1100;letter-spacing:.25px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 4px rgba(0,0,0,.72)}.bss-hit-chip.is-empty{background:rgba(0,0,0,.55);color:#6f7688;border-color:rgba(255,255,255,.08)}
      .bss-bot-recap-backdrop{position:fixed;z-index:12000;inset:0;display:grid;place-items:center;padding:14px;background:rgba(0,0,0,.62);backdrop-filter:blur(6px)}.bss-bot-recap{width:min(430px,100%);border-radius:20px;border:1px solid color-mix(in srgb,var(--bss-accent) 48%,rgba(255,255,255,.12));background:linear-gradient(180deg,rgba(22,18,23,.98),rgba(7,8,11,.995));box-shadow:0 28px 80px rgba(0,0,0,.68);padding:14px}.bss-bot-recap-head{display:grid;grid-template-columns:56px minmax(0,1fr);gap:11px;align-items:center}.bss-bot-recap-head small{display:block;color:var(--bss-accent);font-size:7px;font-weight:1100;letter-spacing:.9px}.bss-bot-recap-head h3{margin:2px 0 0;font-size:19px}.bss-bot-recap-head span{display:block;margin-top:3px;color:#aaa4ad;font-size:9px}.bss-bot-recap-hits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:13px}.bss-bot-recap-hits>span{height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;font-size:11px;font-weight:1100;text-align:center}.bss-bot-recap-score{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.bss-bot-recap-score>div{border-radius:12px;border:1px solid rgba(240,199,106,.22);background:rgba(240,199,106,.06);padding:8px;text-align:center}.bss-bot-recap-score small{display:block;color:#99939d;font-size:6.5px;font-weight:1000}.bss-bot-recap-score b{display:block;margin-top:2px;color:${GOLD};font-size:19px}.bss-bot-recap p{margin:10px 0 0;color:#ddd8df;font-size:9.5px;line-height:1.4;text-align:center}.bss-bot-recap>button{width:100%;height:42px;margin-top:11px;border-radius:12px;border:1px solid rgba(255,180,0,.35);background:linear-gradient(180deg,#ffc63a,#ffaf00);color:#17120a;font-weight:1200;cursor:pointer}

      /* BSS KING V21 additions */
      .bss-keypad-score-box{min-width:0;width:100%;max-width:82px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 7px;border-radius:14px;border:1px solid rgba(240,199,106,.48);background:linear-gradient(180deg,rgba(240,199,106,.18),rgba(22,17,10,.96));box-shadow:0 0 0 1px rgba(255,220,150,.08),0 10px 24px rgba(0,0,0,.30);text-align:center;line-height:1;overflow:hidden}.bss-keypad-score-box span{color:${GOLD};font-size:7px;font-weight:1000;letter-spacing:.45px}.bss-keypad-score-box b{color:#fff;font-size:22px;font-weight:1250;line-height:.9}.bss-keypad-score-box small{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;color:#d7dbe4;font-size:5.8px;font-weight:1000;letter-spacing:.25px;white-space:nowrap}
      .bss-keypad-footer-points-wrap{width:100%;max-width:86px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;text-align:center}.bss-keypad-footer-points-wrap>span{display:block;color:#d7dbe4;font-size:6.2px;font-weight:1100;letter-spacing:.42px;line-height:1}.bss-keypad-footer-points{width:86px;height:48px;display:flex;align-items:center;justify-content:center;background-image:url(${bssPtsBssBlock});background-position:center;background-repeat:no-repeat;background-size:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35));text-align:center}.bss-keypad-footer-points b{display:block;color:#ff9f1c;font-size:14px;font-weight:1200;text-shadow:0 1px 4px rgba(0,0,0,.85)}
      .bss-rich-list{max-width:620px;margin:10px auto 0;display:grid;gap:6px;text-align:left}.bss-rich-list>div{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;align-items:start;padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.03)}.bss-rich-list b{color:var(--bss-accent);font-size:10px}.bss-rich-list span{color:#ddd8df;font-size:10.4px;line-height:1.45}
      .bss-list-cards ul{margin:6px 0 0 16px;padding:0;color:#c9c4cc;font-size:9.1px;line-height:1.45}.bss-list-cards li+li{margin-top:3px}.bss-objective-grid>div.is-current{border-color:color-mix(in srgb,var(--bss-accent) 55%,rgba(255,255,255,.1));box-shadow:0 0 0 1px color-mix(in srgb,var(--bss-accent) 30%,transparent),0 10px 24px rgba(0,0,0,.24)}
    `}</style>
  </div>;
}
