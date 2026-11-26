import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { quickPartyAvatar } from "../../lib/quickPartyAvatars";
import MssParticipantModeIcon from "./MssParticipantModeIcon";
import MssSelectorIconButton from "../MssSelectorIconButton";

export type QuickParticipantMode = "solo" | "duel" | "teams" | "multi";
export type QuickStartOrderMode = "random" | "alternate" | "manual" | "bull";

const QUICK_TEAM_META = [
  { id: "gold", label: "TEAM GOLD", short: "TG", color: "#f7c85c" },
  { id: "pink", label: "TEAM PINK", short: "TP", color: "#ff73bf" },
  { id: "blue", label: "TEAM BLUE", short: "TB", color: "#66bcff" },
  { id: "green", label: "TEAM GREEN", short: "TV", color: "#7be7a7" },
] as const;

const QUICK_START_ORDER_OPTIONS: Array<{
  id: QuickStartOrderMode;
  icon: "random-order" | "alternate-order" | "manual-pick" | "bull-order";
  label: string;
  detail: string;
}> = [
  { id: "random", icon: "random-order", label: "ALÉATOIRE", detail: "Les participants sont mélangés automatiquement au lancement de la partie." },
  { id: "alternate", icon: "alternate-order", label: "ALTERNÉ", detail: "Le départ respecte l'ordre actuel des participants sélectionnés." },
  { id: "manual", icon: "manual-pick", label: "MANUEL", detail: "Tu conserves l'ordre affiché et tu peux le réorganiser plus tard si le mode le permet." },
  { id: "bull", icon: "bull-order", label: "BULL", detail: "Après le lancer physique à la bull, classe les participants selon le résultat obtenu." },
];

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

export function MssQuickPlayers({
  count,
  choices,
  onCount,
  names,
  onNames,
  sessionId,
  label = "PARTICIPANTS",
  info,
  mode,
  onModeChange,
  allowTeams = false,
  teamCount = 2,
  onTeamCount,
  teamsInfo,
}: {
  count: number;
  choices: readonly number[];
  onCount: (count: number) => void;
  names: string[];
  onNames: (names: string[]) => void;
  sessionId: string;
  label?: string;
  info?: string;
  mode?: QuickParticipantMode;
  onModeChange?: (mode: QuickParticipantMode) => void;
  allowTeams?: boolean;
  teamCount?: number;
  onTeamCount?: (count: number) => void;
  teamsInfo?: string;
}) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  const derivedMode: QuickParticipantMode = count === 1 ? "solo" : count === 2 ? "duel" : "multi";
  const resolvedMode: QuickParticipantMode = mode ?? derivedMode;
  const showTeams = allowTeams && resolvedMode === "teams";
  const displayedTeamCount = Math.max(2, Math.min(4, teamCount || 2));
  const maxTeamsAllowed = Math.max(2, Math.min(4, count));
  const teamCountOptions = [2, 3, 4].filter((value) => value <= maxTeamsAllowed);

  return <MssQuickPanel title={label}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${allowTeams ? 3 : choices.includes(1) ? 3 : 2},minmax(0,1fr))`, gap: 9 }}>
      {([...(choices.includes(1) ? ["solo"] : []), "duel", ...(allowTeams ? ["teams"] : []), "multi"] as QuickParticipantMode[]).map(kind => {
        const active = resolvedMode === kind;
        const available = kind === "solo"
          ? choices.includes(1)
          : kind === "duel"
            ? choices.includes(2)
            : kind === "teams"
              ? allowTeams
              : choices.some(n => n > 2);
        if (!available) return null;
        const label = kind === "solo" ? "SOLO" : kind === "duel" ? "DUEL" : kind === "teams" ? "ÉQUIPES" : "MULTI";
        const icon = kind === "solo"
          ? <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="7" r="3"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg>
          : <MssParticipantModeIcon kind={kind === "teams" ? "teams" : kind === "multi" ? "multi" : "duel"} size={32} />;
        return <button type="button" key={kind} aria-pressed={active} onClick={() => {
          if (kind === "solo") onCount(1);
          else if (kind === "duel") onCount(2);
          else if (kind === "teams") onCount(Math.max(2, count));
          else onCount(Math.max(choices.find(n => n > 2) || count, 3));
          onModeChange?.(kind);
        }} style={{ minWidth: 0, minHeight: 93, padding: "10px 5px", borderRadius: 17, display: "grid", justifyItems: "center", alignContent: "center", gap: 8,
          background: active ? `${accent}20` : "rgba(255,255,255,.035)", border: `1px solid ${active ? accent : `${accent}55`}`,
          color: accent, fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
          {icon}
          {label}
        </button>;
      })}
    </div>

    {(resolvedMode === "multi" || resolvedMode === "teams") && (
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <strong style={{ fontSize: 12, color: "#b5bfd7", textTransform: "uppercase" }}>
          {resolvedMode === "teams" ? "Nombre de participants" : "Nombre de joueurs"}
        </strong>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${(resolvedMode === "teams" ? choices : choices.filter(n => n > 2)).length},minmax(0,1fr))`, gap: 5, minWidth: 0 }}>
          {(resolvedMode === "teams" ? choices : choices.filter(n => n > 2)).map(n => <button key={n} type="button" aria-pressed={count === n}
            onClick={() => onCount(n)} style={{ width: "100%", aspectRatio: "1", minWidth: 0, borderRadius: "50%", padding: 0,
              background: count === n ? `${accent}22` : "rgba(255,255,255,.035)", border: `1px solid ${count === n ? accent : "rgba(255,255,255,.15)"}`,
              fontWeight: 950, color: count === n ? accent : "#f4f5fb", fontSize: 12, cursor: "pointer" }}>{n}</button>)}
        </div>
      </div>
    )}

    {showTeams && onTeamCount ? (
      <MssQuickChoices
        label="Nombre d'équipes"
        options={teamCountOptions.map(n => ({ value: n, label: String(n) }))}
        value={Math.min(displayedTeamCount, Math.max(...teamCountOptions))}
        onChange={onTeamCount}
        compact
      />
    ) : null}

    {showTeams && teamsInfo ? <p style={{ margin: 0, fontSize: 11, color: "#b1bbcf" }}>{teamsInfo}</p> : info ? <p style={{ margin: 0, fontSize: 11, color: "#b1bbcf" }}>{info}</p> : null}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      {names.slice(0, count).map((name, index) => {
        const teamMeta = QUICK_TEAM_META[index % displayedTeamCount];
        return <label key={index} style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 8,
          background: "rgba(255,255,255,.035)", borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", padding: "8px 7px" }}>
          <img src={quickPartyAvatar(index, sessionId)} alt="" width="36" height="36" draggable={false} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accent}88` }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ display: "block", color: accent, fontSize: 10, fontWeight: 900 }}>J{index + 1}</span>
              {showTeams ? (
                <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 7px", borderRadius: 999,
                  background: `${teamMeta.color}16`, border: `1px solid ${teamMeta.color}70`, color: teamMeta.color, fontSize: 9.5, fontWeight: 1000, letterSpacing: .3 }}>
                  {teamMeta.short}
                </span>
              ) : null}
            </div>
            <input type="text" maxLength={32} aria-label={`Nom du joueur ${index + 1}`} value={name}
              onFocus={e => e.currentTarget.select()} onChange={e => onNames(names.map((v, i) => i === index ? e.target.value : v))}
              style={{ boxSizing: "border-box", display: "block", width: "100%", minWidth: 0, background: "transparent", border: 0, outline: 0,
                color: "#fff", fontSize: 13, fontWeight: 900, padding: "2px 0" }} />
          </div>
        </label>;
      })}
    </div>
  </MssQuickPanel>;
}

export function MssQuickStartOrder({ value, onChange }: { value: QuickStartOrderMode; onChange: (value: QuickStartOrderMode) => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  const activeOption = QUICK_START_ORDER_OPTIONS.find((item) => item.id === value) ?? QUICK_START_ORDER_OPTIONS[0];
  return <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
    <div style={{ fontSize: 12, fontWeight: 900, color: "#b5bfd7", textTransform: "uppercase" }}>Ordre de départ</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "nowrap" }}>
      {QUICK_START_ORDER_OPTIONS.map((option) => (
        <MssSelectorIconButton
          key={option.id}
          icon={option.icon}
          label={option.label}
          accent={accent}
          active={value === option.id}
          onClick={() => onChange(option.id)}
        />
      ))}
    </div>
    <div style={{ textAlign: "center", display: "grid", gap: 4, minHeight: 44 }}>
      <div style={{ color: accent, fontSize: 13, fontWeight: 950, letterSpacing: .7 }}>{activeOption.label}</div>
      <div style={{ color: "#aeb6cb", fontSize: 11, lineHeight: 1.45 }}>{activeOption.detail}</div>
    </div>
  </div>;
}

export function MssQuickRecap({ entries, ready = true, footer }: { entries: readonly [string, React.ReactNode][]; ready?: boolean; footer?: React.ReactNode }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <MssQuickPanel title="Récapitulatif">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, flexWrap: "wrap" }}>
      <div style={{ color: "#acb8cf", fontSize: 11, fontWeight: 850, letterSpacing: .55, textTransform: "uppercase" }}>Paramètres de lancement</div>
      <span style={{ color: ready ? accent : "#ff8f8f", border: `1px solid ${ready ? accent : "#ff8f8f"}66`,
        borderRadius: 999, fontWeight: 950, fontSize: 10.5, padding: "4px 9px", letterSpacing: .35 }}>
        {ready ? "✓ PRÊT" : "À COMPLÉTER"}
      </span>
    </div>
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
      {entries.map(([label, value]) => <div key={String(label)} style={{ minWidth: 0, padding: "10px 11px", borderRadius: 12,
        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ color: "#a9afc4", fontSize: 10, letterSpacing: .65, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
        <div style={{ color: "#f6f8fd", fontSize: 12, fontWeight: 900, lineHeight: 1.4, marginTop: 4, overflowWrap: "anywhere" }}>{value}</div>
      </div>)}
    </div>
    <div style={{ color: accent, fontWeight: 900, fontSize: 11.5, lineHeight: 1.4 }}>
      {footer ?? "✓ Partie rapide · avatars MSS · sans modification des profils"}
    </div>
  </MssQuickPanel>;
}

export function MssQuickStart({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f5c257";
  return <button type="button" onClick={onClick} style={{ width: "100%", minHeight: 58, borderRadius: 999,
    border: `1px solid ${accent}`, background: accent,
    color: "#191b20", fontWeight: 1000, fontSize: 18, cursor: "pointer", boxShadow: `0 4px 22px ${accent}44` }}>LANCER LA PARTIE</button>;
}
