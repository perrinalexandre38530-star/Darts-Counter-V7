import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { quickPartyAvatar } from "../../lib/quickPartyAvatars";
import MssParticipantModeIcon from "./MssParticipantModeIcon";

/** UI de référence des parties rapides CLASSIQUE : panneaux/KILLER-X01,
 * boutons inspirés du BottomNav, couleurs issues du ThemeContext.
 * Les configs métier gardent leurs propres contraintes et handlers de départ. */
export function MssQuickPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <section style={{ background: "rgba(9,12,24,.94)", border: `1px solid ${accent}45`, borderRadius: 20,
    padding: "15px 15px 17px", display: "grid", gap: 13, minWidth: 0 }}>
    <strong style={{ color: accent, fontSize: 15, fontWeight: 950, textTransform: "uppercase", letterSpacing: .6 }}>{title}</strong>
    {children}
  </section>;
}

export function MssQuickChoices<T extends string | number | boolean>({ label, options, value, onChange, compact = false }: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
    {label ? <div style={{ fontSize: 12, fontWeight: 900, color: "#b5bfd7", textTransform: "uppercase" }}>{label}</div> : null}
    <div style={{ display: "flex", justifyContent: compact ? "center" : "flex-start", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
      {options.map(option => <button type="button" key={String(option.value)} aria-pressed={value === option.value}
        onClick={() => onChange(option.value)} style={{ minHeight: compact ? 38 : 40, minWidth: compact ? 38 : 54,
          padding: compact ? "7px 9px" : "8px 11px", borderRadius: compact ? 999 : 12,
          background: value === option.value ? `${accent}23` : "rgba(255,255,255,.035)",
          border: `1px solid ${value === option.value ? accent : "rgba(255,255,255,.15)"}`,
          color: value === option.value ? accent : "#f4f5fb", fontSize: compact ? 13 : 12,
          fontWeight: 900, cursor: "pointer" }}>{option.label}</button>)}
    </div>
  </div>;
}

export function MssQuickPlayers({ count, choices, onCount, names, onNames, sessionId, label = "PARTICIPANTS", info }: {
  count: number;
  choices: readonly number[];
  onCount: (count: number) => void;
  names: string[];
  onNames: (names: string[]) => void;
  sessionId: string;
  label?: string;
  info?: string;
}) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  const mode = count === 1 ? "solo" : count === 2 ? "duel" : "multi";
  return <MssQuickPanel title={label}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${choices.includes(1) ? 3 : 2},minmax(0,1fr))`, gap: 9 }}>
      {([...(choices.includes(1) ? ["solo"] : []), "duel", "multi"] as const).map(kind => {
        const active = mode === kind;
        const available = kind === "solo" ? choices.includes(1) : kind === "duel" ? choices.includes(2) : choices.some(n => n > 2);
        if (!available) return null;
        const label = kind === "solo" ? "SOLO" : kind === "duel" ? "DUEL" : "MULTI";
        return <button type="button" key={kind} aria-pressed={active} onClick={() => {
          if (kind === "solo") onCount(1);
          else if (kind === "duel") onCount(2);
          else onCount(choices.find(n => n > 2) || count);
        }} style={{ minWidth: 0, minHeight: 93, padding: "10px 5px", borderRadius: 17, display: "grid", justifyItems: "center", alignContent: "center", gap: 8,
          background: active ? `${accent}20` : "rgba(255,255,255,.035)", border: `1px solid ${active ? accent : `${accent}55`}`,
          color: accent, fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
          {kind === "solo" ? <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="7" r="3"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg> : <MssParticipantModeIcon kind={kind} size={32} />}
          {label}
        </button>;
      })}
    </div>
    {mode === "multi" && <MssQuickChoices label="Nombre de joueurs" options={choices.filter(n => n > 2).map(n => ({ value: n, label: String(n) }))} value={count} onChange={onCount} compact />}
    {info ? <p style={{ margin: 0, fontSize: 11, color: "#b1bbcf" }}>{info}</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      {names.slice(0, count).map((name, index) => <label key={index} style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 8,
        background: "rgba(255,255,255,.035)", borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", padding: "8px 7px" }}>
        <img src={quickPartyAvatar(index, sessionId)} alt="" width="36" height="36" draggable={false} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accent}88` }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", color: accent, fontSize: 10, fontWeight: 900 }}>J{index + 1}</span>
          <input type="text" maxLength={32} aria-label={`Nom du joueur ${index + 1}`} value={name}
            onFocus={e => e.currentTarget.select()} onChange={e => onNames(names.map((v, i) => i === index ? e.target.value : v))}
            style={{ boxSizing: "border-box", display: "block", width: "100%", minWidth: 0, background: "transparent", border: 0, outline: 0,
              color: "#fff", fontSize: 13, fontWeight: 900, padding: "2px 0" }} />
        </div>
      </label>)}
    </div>
  </MssQuickPanel>;
}

export function MssQuickRecap({ entries }: { entries: readonly [string, string | number][] }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <MssQuickPanel title="Récapitulatif">
    <div style={{ display: "grid", gap: 0 }}>
      {entries.map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)", gap: 10,
        padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <span style={{ color: "#acb8cf", fontSize: 12, fontWeight: 750 }}>{label}</span>
        <strong style={{ textAlign: "right", color: "#fff", fontSize: 12, overflowWrap: "anywhere" }}>{value}</strong>
      </div>)}
    </div>
    <small style={{ color: accent, fontWeight: 900 }}>✓ Partie rapide · avatars MSS · sans modification des profils</small>
  </MssQuickPanel>;
}

export function MssQuickStart({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <button type="button" onClick={onClick} style={{ width: "100%", minHeight: 58, borderRadius: 999,
    border: `1px solid ${accent}`, background: accent,
    color: "#191b20", fontWeight: 1000, fontSize: 18, cursor: "pointer", boxShadow: `0 4px 22px ${accent}44` }}>LANCER LA PARTIE</button>;
}
