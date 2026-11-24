import React from "react";
import MssSelectorIconButton from "../MssSelectorIconButton";

/**
 * MSS CONFIG — Format d'un match de darts.
 * Présentation uniquement : les règles, les presets, la persistance et les calculs
 * restent intégralement dans le configurateur du mode appelant.
 * Référence graphique : KILLER (icônes BottomNav + valeurs compactes + détail sélectionné).
 */
export type MssVictoryMode = "best_of" | "first_to";
export type MssStartOrder = "random" | "alternate" | "manual" | "bull";

type Props = {
  accent: string;
  legMode: MssVictoryMode;
  legValue: number;
  legOptions: number[];
  setMode: MssVictoryMode;
  setValue: number;
  setOptions: number[];
  startOrder: MssStartOrder;
  selectedSummary: string;
  onLegMode: (value: MssVictoryMode) => void;
  onLegValue: (value: number) => void;
  onSetMode: (value: MssVictoryMode) => void;
  onSetValue: (value: number) => void;
  onStartOrder: (value: MssStartOrder) => void;
  proExpanded: boolean;
  onTogglePro: () => void;
  proContent?: React.ReactNode;
  /** L’ordre de départ a sa propre étape en X01 guidé. */
  showStartOrder?: boolean;
  /** Cache uniquement la sélection des presets Pro sur les écrans Partie rapide. */
  showAdvancedFormats?: boolean;
};

const serviceChoices = [
  { id: "alternate", icon: "alternate-order", label: "ALTERNÉ", detail: "Chaque participant commence à tour de rôle." },
  { id: "random", icon: "random-order", label: "ALÉATOIRE", detail: "Le premier participant est tiré au sort." },
  { id: "manual", icon: "manual-pick", label: "MANUEL", detail: "Choisis toi-même l'ordre de passage." },
  { id: "bull", icon: "bull-order", label: "BULL", detail: "Le départ se décide par un lancer vers le BULL." },
] as const;

function IconModeGroup({ value, onChange, accent, legend }: {
  value: MssVictoryMode;
  onChange: (value: MssVictoryMode) => void;
  accent: string;
  legend: string;
}) {
  return (
    <div role="group" aria-label={legend} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
      {(["best_of", "first_to"] as const).map(mode => {
        const active = mode === value;
        const name = mode === "best_of" ? "Best Of" : "First To";
        return (
          <button
            key={mode}
            type="button"
            aria-label={`${legend} : ${name}`}
            title={name}
            aria-pressed={active}
            onClick={() => onChange(mode)}
            style={{ width: 43, height: 43, flex: "0 0 43px", borderRadius: 13, padding: 0,
              border: `1px solid ${active ? accent : `${accent}65`}`,
              background: active ? `${accent}22` : "rgba(255,255,255,.035)",
              color: accent, cursor: "pointer", display: "grid", placeItems: "center",
              boxShadow: active ? `0 0 13px ${accent}35` : "none",
              WebkitTapHighlightColor: "transparent" }}
          >
            <strong aria-hidden="true" style={{ fontSize: 15, fontWeight: 1000, letterSpacing: .1 }}>{mode === "best_of" ? "BO" : "FT"}</strong>
          </button>
        );
      })}
    </div>
  );
}

function NumericTargets({ label, value, values, accent, onChange }: {
  label: string;
  value: number;
  values: number[];
  accent: string;
  onChange: (value: number) => void;
}) {
  // Toutes les valeurs restent visibles ; seulement 2 rangées pour les FIRST TO longs.
  const columns = values.length > 8 ? 6 : Math.max(1, values.length);
  return (
    <div role="group" aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`, gap: 5, maxWidth: 430, margin: "0 auto" }}>
      {values.map(n => (
        <button type="button" key={n} aria-label={`${label} : ${n}`} aria-pressed={n === value} onClick={() => onChange(n)}
          style={{ width: "100%", minWidth: 0, maxWidth: 44, aspectRatio: "1 / 1", padding: 0, justifySelf: "center",
            borderRadius: "50%", border: `1px solid ${n === value ? accent : "rgba(255,255,255,.12)"}`,
            background: n === value ? `${accent}26` : "rgba(255,255,255,.025)",
            color: n === value ? accent : "#d7ddef", fontSize: 13, fontWeight: 900,
            boxShadow: n === value ? `0 0 12px ${accent}23` : "none", cursor: "pointer" }}>
          {n}
        </button>
      ))}
    </div>
  );
}

function VictorySection({ title, mode, value, values, accent, onMode, onValue }: {
  title: string;
  mode: MssVictoryMode;
  value: number;
  values: number[];
  accent: string;
  onMode: (mode: MssVictoryMode) => void;
  onValue: (value: number) => void;
}) {
  return (
    <div style={{ padding: "11px 9px 12px", borderRadius: 15, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.055)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
        <div style={{ fontSize: 13, fontWeight: 950, color: accent, letterSpacing: .65 }}>{title}</div>
        <IconModeGroup value={mode} onChange={onMode} accent={accent} legend={title} />
      </div>
      <div style={{ color: accent, textAlign: "center", fontSize: 11.5, fontWeight: 900, letterSpacing: .6, marginBottom: 8 }}>
        {mode === "best_of" ? "BEST OF" : "FIRST TO"}
      </div>
      <NumericTargets label={`Nombre de ${title.toLowerCase()}`} value={value} values={values} accent={accent} onChange={onValue} />
    </div>
  );
}

/** Sélecteur d'ordre commun : une étape autonome ou section dans un format complet. */
export function MssStartOrderSection({ accent, value, onChange }: {
  accent: string;
  value: MssStartOrder;
  onChange: (next: MssStartOrder) => void;
}) {
  const current = serviceChoices.find(item => item.id === value) ?? serviceChoices[0];
  return (
    <div role="group" aria-label="Ordre de départ" style={{ minWidth: 0 }}>
      <div style={{ color: accent, fontSize: 13, fontWeight: 950, letterSpacing: .8, marginBottom: 12 }}>ORDRE DE DÉPART</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, flexWrap: "nowrap" }}>
        {serviceChoices.map(choice => (
          <MssSelectorIconButton key={choice.id} icon={choice.icon} label={choice.label}
            active={value === choice.id} accent={accent} onClick={() => onChange(choice.id)} />
        ))}
      </div>
      <div aria-live="polite" style={{ textAlign: "center", marginTop: 10, minHeight: 40 }}>
        <div style={{ color: accent, fontSize: 13, fontWeight: 950, letterSpacing: .7 }}>{current.label}</div>
        <div style={{ color: "#aeb6cb", fontSize: 11, lineHeight: 1.35, marginTop: 4 }}>{current.detail}</div>
      </div>
    </div>
  );
}

export default function MssMatchFormatPanel({
  accent, legMode, legValue, legOptions, setMode, setValue, setOptions,
  startOrder, selectedSummary, onLegMode, onLegValue, onSetMode, onSetValue,
  onStartOrder, proExpanded, onTogglePro, proContent, showStartOrder = true, showAdvancedFormats = true,
}: Props) {
  return (
    <section aria-label="Configuration du format de match" style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: .85, fontWeight: 950, color: accent, marginBottom: 11 }}>
        FORMAT DE MATCH
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <VictorySection title="LEGS" mode={legMode} value={legValue} values={legOptions} accent={accent} onMode={onLegMode} onValue={onLegValue} />
        <VictorySection title="SETS" mode={setMode} value={setValue} values={setOptions} accent={accent} onMode={onSetMode} onValue={onSetValue} />
      </div>
      <div aria-live="polite" style={{ textAlign: "center", fontSize: 12, fontWeight: 850, lineHeight: 1.4, color: "#fff", padding: "10px 8px", marginTop: 9, borderRadius: 12, background: `${accent}13`, border: `1px solid ${accent}36` }}>
        <span style={{ color: "#acb7ce", fontWeight: 700 }}>FORMAT CHOISI </span>
        <strong style={{ color: accent }}>{selectedSummary}</strong>
      </div>
      {showAdvancedFormats && <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
          <strong style={{ color: accent, fontSize: 12, letterSpacing: .6 }}>FORMATS PRO / AVANCÉS</strong>
          <button type="button" onClick={onTogglePro} aria-expanded={proExpanded} aria-label={proExpanded ? "Masquer les formats professionnels" : "Afficher les formats professionnels"}
            style={{ border: `1px solid ${accent}80`, background: proExpanded ? `${accent}22` : "rgba(255,255,255,.025)", color: accent,
              borderRadius: 12, padding: "7px 12px", fontWeight: 900, cursor: "pointer", fontSize: 11 }}>
            {proExpanded ? "MASQUER −" : "AFFICHER +"}
          </button>
        </div>
        {proExpanded && <div style={{ marginTop: 9 }}>{proContent}</div>}
      </div>}
      {showStartOrder && <MssStartOrderSection accent={accent} value={startOrder} onChange={onStartOrder} />}
    </section>
  );
}
