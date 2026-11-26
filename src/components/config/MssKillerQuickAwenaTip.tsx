import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

/** Charte MSS — partie rapide : image unique fixe, texte en rotation toutes les 5 secondes. */
const KILLER_QUICK_TIPS = [
  "Choisis ton équipe ou tes adversaires avant de commencer la chasse aux vies !",
  "Pour devenir KILLER, touche d'abord ton propre numéro selon la règle choisie.",
  "Le double et le triple peuvent faire davantage de dégâts si tu actives le multiplicateur.",
  "Au BULL, certaines variantes permettent de soigner, protéger ou attaquer plusieurs adversaires.",
  "En ordre BULL, lancez physiquement puis classez les participants selon leurs résultats.",
  "Vérifie les résurrections et l'auto-pénalité avant de lancer la partie.",
];

export default function MssKillerQuickAwenaTip() {
  const [tipIndex, setTipIndex] = React.useState(0);
  React.useEffect(() => {
    const interval = window.setInterval(() => setTipIndex(index => (index + 1) % KILLER_QUICK_TIPS.length), 5000);
    return () => window.clearInterval(interval);
  }, []);
  return <div role="note" aria-label="Astuce Awena KILLER" data-mss-awena-tip="quick"
    style={{ width: "100%", maxWidth: 260, margin: "10px auto 14px", position: "relative", containerType: "inline-size", pointerEvents: "none" }}>
    <img src={awenaConseils} alt="Awena donne un conseil KILLER" style={{ display: "block", width: "100%", height: "auto" }} />
    <div style={{ position: "absolute", top: "16%", left: "39%", width: "56%", height: "68%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4%", textAlign: "center", color: "#251c28", overflow: "hidden", padding: "0 1.5%", boxSizing: "border-box" }}>
      <strong style={{ fontSize: "clamp(8.5px,4.2cqw,10.5px)", fontWeight: 1000, color: "#d81e2b", lineHeight: 1.05 }}>ASTUCE</strong>
      <span style={{ fontSize: "clamp(7px,3.1cqw,8.6px)", fontWeight: 800, lineHeight: 1.12, overflowWrap: "break-word", maxWidth: "100%" }}>{KILLER_QUICK_TIPS[tipIndex]}</span>
    </div>
  </div>;
}
