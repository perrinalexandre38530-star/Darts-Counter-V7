import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";
import { MssConfigCaption, MssInputMethodChoice } from "./MssPremiumConfig";
import { KILLER_INPUT_METHODS } from "../../lib/scoreInput/killerInput";

export type GolfInputMode = "keypad" | "dartboard";

/** Reprend les CINQ pictogrammes et la description de KILLER.
 * GOLF ne sait encore exploiter que KEY­PAD et CIBLE ; jamais de fausse option active. */
export function MssGolfInputMethodSelector({ value, onChange, accent }: {
  value: GolfInputMode;
  onChange: (mode: GolfInputMode) => void;
  accent: string;
}) {
  const current = KILLER_INPUT_METHODS.find(method => method.id === value) || KILLER_INPUT_METHODS[0];
  return <div role="group" aria-label="Mode de saisie GOLF" style={{ minWidth: 0 }}>
    <MssConfigCaption accent={accent}>MODE DE SAISIE</MssConfigCaption>
    <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "nowrap" }}>
      {KILLER_INPUT_METHODS.map(method => <MssInputMethodChoice key={method.id}
        icon={method.id} label={method.label} accent={accent}
        active={value === method.id}
        disabled={method.id !== "keypad" && method.id !== "dartboard"}
        onClick={() => {
          if (method.id === "keypad" || method.id === "dartboard") onChange(method.id);
        }} />)}
    </div>
    <div aria-live="polite" style={{ display: "grid", gap: 5, marginTop: 10, textAlign: "center" }}>
      <strong style={{ color: accent, fontSize: 13, fontWeight: 950, letterSpacing: .7 }}>{current.label}</strong>
      <span style={{ color: "#aeb6cb", fontSize: 11, lineHeight: 1.45 }}>{current.description}</span>
      <span style={{ color: "#8993aa", fontSize: 10, lineHeight: 1.4 }}>
        Vocal, caméra et AutoDarts indisponibles pour GOLF ; ces boutons restent désactivés.
      </span>
    </div>
  </div>;
}

export type GolfAwenaStep = "intro" | "participants" | "rules" | "recap";
const TIPS: Record<GolfAwenaStep, string> = {
  intro: "Vise le secteur du trou : au golf, c'est la précision qui fait la différence !",
  participants: "En équipes, alternez les lanceurs pour garder un parcours équilibré.",
  rules: "En STROKES, cherche le total le plus bas. Anticipe la pénalité MISS !",
  recap: "Vérifie le parcours, les équipes et la saisie avant ton premier lancer.",
};

/** Même visuel Awena CONSEILS que KILLER. Une astuce différente sous chaque étape. */
export function MssGolfAwenaTip({ step }: { step: GolfAwenaStep }) {
  return <div role="note" aria-label={`Astuce Awena : ${step}`}
    style={{ width: "100%", maxWidth: 220, margin: "12px auto 14px", position: "relative", containerType: "inline-size", pointerEvents: "none" }}>
    <img src={awenaConseils} alt="Awena donne un conseil" style={{ display: "block", width: "100%", height: "auto" }} />
    <div style={{ position: "absolute", top: "16%", left: "39%", width: "56%", height: "68%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4%", textAlign: "center", color: "#251c28", overflow: "hidden", padding: "0 1.5%", boxSizing: "border-box" }}>
      <strong style={{ fontSize: "clamp(8.5px,4.2cqw,10.5px)", fontWeight: 1000, color: "#d81e2b", lineHeight: 1.05 }}>ASTUCE</strong>
      <span style={{ fontSize: "clamp(7px,3.1cqw,8.6px)", fontWeight: 800, lineHeight: 1.12, overflowWrap: "break-word", maxWidth: "100%" }}>{TIPS[step]}</span>
    </div>
  </div>;
}
