import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";

/** Charte MSS : configuration Arcade, conseil fixe par étape ;
 * Partie rapide, une image fixe et texte tournant toutes les 5 secondes. */
export default function MssArcadeAwenaTip({ tip, tips, quick = false }: {
  tip?: string; tips?: readonly string[]; quick?: boolean;
}) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (!quick || !tips?.length) return;
    const timer = window.setInterval(() => setIndex(n => (n + 1) % tips.length), 5000);
    return () => window.clearInterval(timer);
  }, [quick, tips]);
  const current = quick && tips?.length ? tips[index % tips.length] : tip;
  if (!current) return null;
  return <div role="note" aria-label="Astuce Awena" data-mss-awena-tip={quick ? "quick" : "arcade"}
    style={{ width: "100%", maxWidth: 285, margin: "15px auto 12px", position: "relative", containerType: "inline-size", pointerEvents: "none" }}>
    <img src={awenaConseils} alt="Awena donne un conseil" style={{ display: "block", width: "100%", height: "auto" }}/>
    <div style={{ position: "absolute", top: "16%", left: "39%", width: "56%", height: "68%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", alignItems: "center", gap: "4%", overflow: "hidden", color: "#251c28", padding: "0 1.5%", boxSizing: "border-box" }}>
      <strong style={{ fontSize: "clamp(8px,4.1cqw,11px)", fontWeight: 1000, color: "#d81e2b", lineHeight: 1 }}>ASTUCE</strong>
      <span style={{ fontSize: "clamp(7px,3.05cqw,9px)", fontWeight: 850, lineHeight: 1.12, overflowWrap: "break-word" }}>{current}</span>
    </div>
  </div>;
}
