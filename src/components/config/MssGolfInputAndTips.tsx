import React from "react";
import awenaConseils from "../../assets/president/awena_conseils.webp";
import { MssConfigCaption, MssInputMethodIcon } from "./MssPremiumConfig";
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", width: "100%", maxWidth: 350, margin: "0 auto", gap: "clamp(3px,1.4vw,8px)", minWidth: 0 }}>
      {KILLER_INPUT_METHODS.map(method => {
        const active = value === method.id;
        const disabled = method.id !== "keypad" && method.id !== "dartboard";
        return <button type="button" key={method.id} title={method.label} aria-label={method.label} aria-pressed={active}
          disabled={disabled} onClick={() => { if (!disabled) onChange(method.id as GolfInputMode); }}
          style={{ width: "100%", minWidth: 0, aspectRatio: "1/1", maxHeight: 54, display: "grid", placeItems: "center",
            padding: 3, borderRadius: 13, border: `1px solid ${active ? accent : `${accent}55`}`,
            background: active ? `${accent}18` : "rgba(255,255,255,.035)", color: accent,
            boxShadow: active ? `0 0 12px ${accent}30` : "none", opacity: disabled ? .35 : 1,
            cursor: disabled ? "not-allowed" : "pointer" }}>
          <MssInputMethodIcon kind={method.id as any} size={24} />
        </button>;
      })}
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

/** Conseils propres au GOLF, rangés par étape. En PR on parcourt cette liste
 * à raison d'un conseil toutes les 5 secondes, sans remonter le composant image. */
const TIPS: Record<GolfAwenaStep, readonly string[]> = {
  intro: [
    "Vise le secteur du trou : au golf, c'est la précision qui fait la différence !",
    "Un parcours de 9 trous est idéal pour une partie rapide.",
  ],
  participants: [
    "En équipes, alternez les lanceurs pour garder un parcours équilibré.",
    "En DUEL chacun joue pour son score ; en ÉQUIPES les résultats sont regroupés.",
  ],
  rules: [
    "En STROKES, cherche le total le plus bas. Anticipe la pénalité MISS !",
    "Un parcours aléatoire change l'ordre des secteurs à viser.",
    "La grille des trous peut être masquée sans modifier les scores.",
  ],
  recap: [
    "Vérifie le parcours, les équipes et la saisie avant ton premier lancer.",
    "Contrôle l'ordre de départ et la pénalité MISS avant de lancer.",
  ],
};

const GOLF_QUICK_TIPS = Object.values(TIPS).flat();

/** Contrat charte MSS :
 * - PR : UNE image fixe en bas, seul le texte tourne toutes les 5 s ;
 * - AR : UNE image par étape visible, texte fixe jusqu'au changement d'étape.
 * Ne jamais insérer ce composant entre chaque bloc d'une PR. */
export function MssGolfAwenaTip({ step = "intro", mode = "arcade", tipOverride }: {
  step?: GolfAwenaStep;
  mode?: "quick" | "arcade";
  tipOverride?: string;
}) {
  const [tipIndex, setTipIndex] = React.useState(0);
  React.useEffect(() => {
    if (mode !== "quick") return;
    const intervalId = window.setInterval(() => {
      setTipIndex(index => (index + 1) % GOLF_QUICK_TIPS.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [mode]);
  const tip = mode === "quick" ? GOLF_QUICK_TIPS[tipIndex % GOLF_QUICK_TIPS.length] : (tipOverride || TIPS[step][0]);
  return <div role="note" aria-label="Astuce Awena"
    data-mss-awena-tip={mode} data-mss-awena-step={step}
    style={{ width: "100%", maxWidth: 260, margin: "12px auto 14px", position: "relative", containerType: "inline-size", pointerEvents: "none" }}>
    <img src={awenaConseils} alt="Awena donne un conseil" style={{ display: "block", width: "100%", height: "auto" }} />
    <div style={{ position: "absolute", top: "16%", left: "39%", width: "56%", height: "68%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4%", textAlign: "center", color: "#251c28", overflow: "hidden", padding: "0 1.5%", boxSizing: "border-box" }}>
      <strong style={{ fontSize: "clamp(8.5px,4.2cqw,10.5px)", fontWeight: 1000, color: "#d81e2b", lineHeight: 1.05 }}>ASTUCE</strong>
      <span aria-live="off" style={{ fontSize: "clamp(7px,3.1cqw,8.6px)", fontWeight: 800, lineHeight: 1.12, overflowWrap: "break-word", maxWidth: "100%" }}>{tip}</span>
    </div>
  </div>;
}
