import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

const TIPS = [
  "GROS 6 : la précision compte autant que le nombre de vies.",
  "Sélectionne JOUEURS ou ÉQUIPES avant de définir le format.",
  "En duel, deux adversaires ; en multi, plusieurs participants.",
  "Vérifie les profils, les bots et les équipes sélectionnées.",
  "Moins de vies accélère la partie ; plus de vies prolonge les défis.",
  "En strict, un SIMPLE ne remplace pas un DOUBLE ou un TRIPLE.",
  "Les zones spéciales rendent les coups hors cible plus exigeants.",
  "Le bonus de troisième fléchette modifie l'objectif suivant.",
  "La BULL peut déterminer le premier joueur à lancer.",
  "Choisis le KEYPAD pour saisir chaque impact avec précision.",
  "Choisis tes sons, bruitages et annonces avant de commencer.",
  "Vérifie les vies, les cibles et les participants avant de lancer.",
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
