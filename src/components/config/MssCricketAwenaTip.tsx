import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";
import { CRICKET_VARIANT_RULES } from "../../lib/cricketVariantRules";

const tips = {
  classic: [
    "Ferme les objectifs 15 à 20 et BULL en trois marques.",
    "Choisis JOUEURS ou ÉQUIPES avant de régler le match.",
    "En individuel, choisis DUEL ou MULTI. En équipes, le Cricket actuel reste en 2 contre 2.",
    "Vérifie tes profils et tes bots IA avant de lancer.",
    "Une fois une cible fermée, marque dessus tant qu'un adversaire l'a encore ouverte.",
    "Adapte la limite des manches à la durée de partie souhaitée.",
    "Choisis ton départ et le mode de saisie préféré.",
    "Vérifie le récapitulatif et la liste des participants avant de jouer.",
  ],
  extended: [
    "CRICKET MASTER : neuf objectifs à fermer en trois marques chacun.",
    "Le mode individuel n'impose pas de plafond de joueurs.",
    "DUEL pour deux joueurs, MULTI pour un nombre libre de participants.",
    "Le tableau de marques accueille tous les profils sélectionnés.",
    "Un double ou un triple compte aussi une marque dans sa catégorie.",
    "Les neuf objectifs nécessitent chacun trois marques pour être fermés.",
    "DBULL50 : choisis entre +2 BULL ou +1 DOUBLE si BULL est encore ouvert.",
    "Vérifie les neuf cibles, puis démarre la partie.",
  ],
  cut_throat: [
    "En CUT-THROAT, tu cherches à donner des points à tes adversaires.",
    "Deux camps ou une partie individuelle : sélectionne d'abord les participants.",
    "Les équipes du Cricket utilisent actuellement le format 2 contre 2.",
    "Complète la sélection des profils avant le lancement.",
    "Les points vont aux adversaires qui n'ont pas fermé la cible.",
    "Une longue partie offre plus de temps pour retourner la situation.",
    "Choisis l'ordre de départ puis le mode de saisie.",
    "Vérifie le tableau de départ avant de jouer.",
  ],
  no_score: [
    "CRICKET SANS POINTS : seule la fermeture des sept cibles compte.",
    "Sélectionne JOUEURS ou ÉQUIPES avant de composer le match.",
    "Choisis DUEL ou MULTI en individuel.",
    "Vérifie la sélection des profils et bots.",
    "Aucun point ne s'ajoute : ferme simplement 15 à 20 et BULL.",
    "Une limite de manches plus large facilite les parties équilibrées.",
    "Conserve l'ordre sélectionné ou tire au sort le premier joueur.",
    "L'objectif est de fermer toutes les cibles : vérifie le récapitulatif.",
  ],
};
type Variant = keyof typeof tips;
export default function MssCricketAwenaTip({step,stepName,quick=false,variant="classic"}:{step?:number;stepName?:string;quick?:boolean;variant?:string}) {
  const [index,setIndex]=React.useState(0);
  React.useEffect(()=>{if(!quick)return;const id=window.setInterval(()=>setIndex(x=>(x+1)%8),5000);return()=>window.clearInterval(id)},[quick]);
  const list = tips[(variant in tips ? variant : "classic") as Variant];
  const rule = CRICKET_VARIANT_RULES[variant as keyof typeof CRICKET_VARIANT_RULES];
  const keyedTips:Record<string,string> = {
    "Joueurs ou équipes":"Choisis JOUEURS ou ÉQUIPES. Les profils et les bots seront sélectionnés plus loin.",
    "Format":"En individuel, choisis DUEL ou MULTI. En équipes, définis ton format avant la sélection.",
    "Sélection":"Vérifie les avatars, les profils et les bots IA : chaque participant doit être présent.",
    "Règles de la variante": rule?.description || "Vérifie les règles spécifiques de cette variante.",
    "Scoring": variant==="cut_throat" ? "En CUT-THROAT, les points vont aux adversaires encore ouverts." : variant==="sudden_death" ? "En mort subite, le retard de points peut provoquer une élimination." : variant==="no_score" ? "Sans points, seules les fermetures des objectifs décident du résultat." : "Avec points, une cible fermée rapporte tant qu'un adversaire l'a encore ouverte.",
    "Manches":variant==="quickie" ? "QUICKIE : la partie est limitée à dix manches." : "Adapte la limite des manches à la durée souhaitée.",
    "Départ":"Choisis l'ordre de départ et l'alternance des premiers joueurs, puis vérifie les équipes.",
    "Saisie":"Choisis le clavier ou la cible interactive ; les autres méthodes indisponibles restent grisées.",
    "Départ et saisie":"Vérifie l'ordre de départ et le mode de saisie avant de lancer.",
    "Récapitulatif":"Contrôle le nombre de participants, les cibles et les paramètres avant de jouer.",
    "Choix joueurs":"Choisis exactement deux joueurs : l'un bat, l'autre lance.",
    "Règles et scoring":"ENGLISH : plus de 40 points par volée pour marquer ; BULL25 retire un guichet et BULL50 en retire deux.",
  };
  const quickTips = [rule?.description || list[0],keyedTips["Sélection"],keyedTips["Scoring"],keyedTips["Départ et saisie"],keyedTips["Récapitulatif"],keyedTips["Manches"],keyedTips["Format"],keyedTips["Joueurs ou équipes"]];
  const tip=quick?quickTips[index%quickTips.length]:stepName && keyedTips[stepName] ? keyedTips[stepName] : list[Math.min(list.length-1,Math.max(0,step||0))];
  return <div role="note" aria-label="Astuce Awena CRICKET" style={{width:"100%",maxWidth:290,margin:"14px auto",position:"relative",containerType:"inline-size",pointerEvents:"none"}}>
    <img src={awenaConseils} alt="Awena te conseille" style={{display:"block",width:"100%",height:"auto"}}/>
    <div style={{position:"absolute",left:"39%",top:"16%",width:"56%",height:"68%",display:"grid",alignContent:"center",textAlign:"center",padding:"0 1%",boxSizing:"border-box",color:"#271624",overflow:"hidden"}}>
      <strong style={{color:"#dd2034",fontWeight:1000,fontSize:"clamp(8px,4.1cqw,10px)"}}>ASTUCE</strong>
      <span style={{fontSize:"clamp(7px,3.1cqw,9px)",fontWeight:900,lineHeight:1.13,overflowWrap:"break-word"}}>{tip}</span>
    </div>
  </div>;
}
