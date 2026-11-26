import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

const TIPS = [
  "GROS 6 : vise juste pour conserver tes vies.",
  "Commence par choisir JOUEURS ou ÉQUIPES.",
  "En JOUEURS : duel ou multi. En ÉQUIPES : règle le nombre de groupes et leurs membres.",
  "Choisis les profils et les bots, ou compose les équipes dans le sélecteur MSS.",
  "Les variantes modifient les règles. Lis l'InfoDot de chaque carte avant de choisir.",
  "Peu de cœurs : partie rapide. Beaucoup de cœurs : défi plus long.",
  "En équipes, choisis entre vies individuelles et réserve commune.",
  "En strict, distingue S, D et T ; en valeur, le multiplicateur n'importe pas.",
  "BULL25 vert : couronne extérieure. BULL50 rouge : centre DBULL. Les deux s'activent ensemble.",
  "En LIBRE, impose toutes les zones ; en PRO, doubles, triples et Bulls uniquement.",
  "Commence par le GROS 6 classique ou tire la première cible au sort.",
  "Les zones fermées et le contour extérieur ont chacun leur propre interrupteur.",
  "Active d'abord le bonus D3, puis choisis une, deux ou trois fléchettes.",
  "Le BULL peut décider du premier joueur à lancer.",
  "Le KEYPAD permet de saisir les impacts avec précision.",
  "Règle les sons Arcade, les bruitages et les annonces vocales.",
  "Avant de lancer, vérifie tous les participants et tes paramètres.",
];
export default function MssGros6AwenaTip({ mode, step = 0 }: { mode: "quick" | "arcade"; step?: number }) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (mode !== "quick") return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % TIPS.length), 5000);
    return () => window.clearInterval(timer);
  }, [mode]);
  const tip = mode === "quick" ? TIPS[index] : TIPS[Math.max(0, Math.min(TIPS.length - 1, step))];
  return <div role="note" aria-label="Astuce Awena" data-mss-awena-tip={mode}
    style={{ width: "100%", maxWidth: 260, margin: "12px auto 14px", position: "relative", containerType: "inline-size", pointerEvents: "none" }}>
    <img src={awenaConseils} alt="Awena te donne une astuce" style={{ display: "block", width: "100%", height: "auto" }}/>
    <div style={{ position: "absolute", top: "16%", left: "39%", width: "56%", height: "68%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "4%", textAlign: "center", overflow: "hidden", padding: "0 1.5%", boxSizing: "border-box", color: "#251c28" }}>
      <strong style={{ fontSize: "clamp(8.5px,4.2cqw,10.5px)", color: "#d81e2b", fontWeight: 1000 }}>ASTUCE</strong>
      <span style={{ fontSize: "clamp(7px,3.1cqw,8.6px)", fontWeight: 850, lineHeight: 1.12, overflowWrap: "break-word" }}>{tip}</span>
    </div>
  </div>;
}
