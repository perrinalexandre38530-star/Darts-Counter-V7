import React from "react";
import type { FitMuscle } from "../../fit/fitStore";
import { FIT_MUSCLE_COLORS, FIT_MUSCLE_LABELS } from "../../fit/fitExerciseTaxonomy";

type Props = {
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  counts?: Partial<Record<FitMuscle, number>>;
  lang?: string;
};

type ZoneProps = {
  muscle: FitMuscle;
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  children: React.ReactNode;
};

function Zone({ muscle, selected, onSelect, children }: ZoneProps) {
  const active = selected === muscle;
  const color = FIT_MUSCLE_COLORS[muscle];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={muscle}
      onClick={() => onSelect(muscle)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(muscle); }}
      style={{ cursor: "pointer", outline: "none" }}
    >
      <g
        fill={color}
        fillOpacity={active ? .96 : .48}
        stroke={active ? "#fff" : color}
        strokeWidth={active ? 1.7 : .7}
        style={{ filter: active ? `drop-shadow(0 0 6px ${color})` : `drop-shadow(0 0 2px ${color}55)`, transition: "all .16s ease" }}
      >{children}</g>
    </g>
  );
}

const baseStroke = { fill: "rgba(255,255,255,.035)", stroke: "rgba(255,255,255,.23)", strokeWidth: 1.05 } as const;

function FrontBody({ selected, onSelect }: Pick<Props, "selected" | "onSelect">) {
  return <svg viewBox="0 0 170 330" width="100%" height="100%" aria-label="Face du corps">
    <ellipse cx="85" cy="26" rx="19" ry="22" {...baseStroke}/>
    <path d="M72 48 Q85 55 98 48 L108 70 Q126 75 135 96 L126 150 Q119 171 113 198 L110 245 100 318H88L85 250 82 318H70L60 245 57 198Q51 171 44 150L35 96Q44 75 62 70Z" {...baseStroke}/>
    <path d="M62 70 46 79 31 128 20 180 30 184 45 138 57 103" {...baseStroke}/>
    <path d="M108 70 124 79 139 128 150 180 140 184 125 138 113 103" {...baseStroke}/>

    <Zone muscle="Cou" selected={selected} onSelect={onSelect}><path d="M75 49h20l4 18H71Z"/></Zone>
    <Zone muscle="Épaules" selected={selected} onSelect={onSelect}><ellipse cx="57" cy="79" rx="15" ry="11"/><ellipse cx="113" cy="79" rx="15" ry="11"/></Zone>
    <Zone muscle="Pectoraux" selected={selected} onSelect={onSelect}><path d="M64 78Q84 70 84 101Q68 106 58 97Z"/><path d="M106 78Q86 70 86 101Q102 106 112 97Z"/></Zone>
    <Zone muscle="Biceps" selected={selected} onSelect={onSelect}><ellipse cx="45" cy="112" rx="9" ry="22"/><ellipse cx="125" cy="112" rx="9" ry="22"/></Zone>
    <Zone muscle="Avant-bras" selected={selected} onSelect={onSelect}><path d="M38 132 28 174 39 177 50 137Z"/><path d="M132 132 142 174 131 177 120 137Z"/></Zone>
    <Zone muscle="Abdos" selected={selected} onSelect={onSelect}><rect x="72" y="104" width="11" height="24" rx="5"/><rect x="87" y="104" width="11" height="24" rx="5"/><rect x="72" y="131" width="11" height="24" rx="5"/><rect x="87" y="131" width="11" height="24" rx="5"/><rect x="74" y="158" width="9" height="20" rx="4"/><rect x="87" y="158" width="9" height="20" rx="4"/></Zone>
    <Zone muscle="Abducteurs" selected={selected} onSelect={onSelect}><path d="M59 181Q68 176 74 188L68 211Q59 207 56 195Z"/><path d="M111 181Q102 176 96 188L102 211Q111 207 114 195Z"/></Zone>
    <Zone muscle="Adducteurs" selected={selected} onSelect={onSelect}><path d="M77 184Q83 181 84 193L81 228Q74 222 73 207Z"/><path d="M93 184Q87 181 86 193L89 228Q96 222 97 207Z"/></Zone>
    <Zone muscle="Quadriceps" selected={selected} onSelect={onSelect}><path d="M62 196Q73 187 80 200L78 247Q67 247 61 234Z"/><path d="M108 196Q97 187 90 200L92 247Q103 247 109 234Z"/></Zone>
    <Zone muscle="Mollets" selected={selected} onSelect={onSelect}><path d="M62 252Q70 246 77 257L75 302Q65 301 61 285Z"/><path d="M108 252Q100 246 93 257L95 302Q105 301 109 285Z"/></Zone>
  </svg>;
}

function BackBody({ selected, onSelect }: Pick<Props, "selected" | "onSelect">) {
  return <svg viewBox="0 0 170 330" width="100%" height="100%" aria-label="Dos du corps">
    <ellipse cx="85" cy="26" rx="19" ry="22" {...baseStroke}/>
    <path d="M72 48 Q85 55 98 48 L108 70 Q126 75 135 96 L126 150 Q119 171 113 198 L110 245 100 318H88L85 250 82 318H70L60 245 57 198Q51 171 44 150L35 96Q44 75 62 70Z" {...baseStroke}/>
    <path d="M62 70 46 79 31 128 20 180 30 184 45 138 57 103" {...baseStroke}/>
    <path d="M108 70 124 79 139 128 150 180 140 184 125 138 113 103" {...baseStroke}/>

    <Zone muscle="Cou" selected={selected} onSelect={onSelect}><path d="M75 49h20l4 18H71Z"/></Zone>
    <Zone muscle="Épaules" selected={selected} onSelect={onSelect}><ellipse cx="57" cy="79" rx="15" ry="11"/><ellipse cx="113" cy="79" rx="15" ry="11"/></Zone>
    <Zone muscle="Dos" selected={selected} onSelect={onSelect}><path d="M66 75Q85 88 104 75L111 111Q105 142 94 158H76Q65 142 59 111Z"/></Zone>
    <Zone muscle="Triceps" selected={selected} onSelect={onSelect}><ellipse cx="45" cy="112" rx="9" ry="22"/><ellipse cx="125" cy="112" rx="9" ry="22"/></Zone>
    <Zone muscle="Avant-bras" selected={selected} onSelect={onSelect}><path d="M38 132 28 174 39 177 50 137Z"/><path d="M132 132 142 174 131 177 120 137Z"/></Zone>
    <Zone muscle="Lombaires" selected={selected} onSelect={onSelect}><path d="M70 151Q85 158 100 151L98 182Q85 190 72 182Z"/></Zone>
    <Zone muscle="Fessiers" selected={selected} onSelect={onSelect}><ellipse cx="72" cy="196" rx="16" ry="17"/><ellipse cx="98" cy="196" rx="16" ry="17"/></Zone>
    <Zone muscle="Abducteurs" selected={selected} onSelect={onSelect}><path d="M58 194Q67 190 70 209L66 227Q58 218 55 205Z"/><path d="M112 194Q103 190 100 209L104 227Q112 218 115 205Z"/></Zone>
    <Zone muscle="Ischios" selected={selected} onSelect={onSelect}><path d="M63 211Q74 204 80 216L78 251Q68 255 62 242Z"/><path d="M107 211Q96 204 90 216L92 251Q102 255 108 242Z"/></Zone>
    <Zone muscle="Mollets" selected={selected} onSelect={onSelect}><path d="M62 252Q70 246 77 257L75 302Q65 301 61 285Z"/><path d="M108 252Q100 246 93 257L95 302Q105 301 109 285Z"/></Zone>
  </svg>;
}

export default function FitBodyMap({ selected, onSelect, counts = {}, lang = "fr" }: Props) {
  const key = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const selectedLabel = selected === "Tous" ? (key === "en" ? "All muscle groups" : key === "es" ? "Todos los grupos" : "Tous les groupes") : FIT_MUSCLE_LABELS[selected][key];
  const selectedCount = selected === "Tous" ? Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0) : Number(counts[selected] || 0);

  return <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.075)", background: "radial-gradient(circle at 50% 20%,rgba(246,194,86,.055),rgba(255,255,255,.018) 42%,rgba(0,0,0,.06))", overflow: "hidden" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 11px 7px" }}>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 7.5, fontWeight: 1000, letterSpacing: .9, opacity: .48 }}>{key === "en" ? "TARGET AREA" : key === "es" ? "ZONA OBJETIVO" : "ZONE CIBLÉE"}</div><div style={{ marginTop: 2, fontSize: 14, fontWeight: 1000 }}>{selectedLabel}</div></div>
      <div style={{ minWidth: 42, height: 32, borderRadius: 11, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.035)", fontSize: 10, fontWeight: 1000 }}>{selected === "Tous" ? "∞" : selectedCount}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, padding: "0 6px 6px" }}>
      <div style={{ minWidth: 0 }}><div style={{ textAlign: "center", fontSize: 6.8, fontWeight: 1000, letterSpacing: .8, opacity: .42 }}>{key === "en" ? "FRONT" : key === "es" ? "FRENTE" : "FACE"}</div><div style={{ height: 255 }}><FrontBody selected={selected} onSelect={onSelect}/></div></div>
      <div style={{ minWidth: 0 }}><div style={{ textAlign: "center", fontSize: 6.8, fontWeight: 1000, letterSpacing: .8, opacity: .42 }}>{key === "en" ? "BACK" : key === "es" ? "ESPALDA" : "DOS"}</div><div style={{ height: 255 }}><BackBody selected={selected} onSelect={onSelect}/></div></div>
    </div>
  </div>;
}
