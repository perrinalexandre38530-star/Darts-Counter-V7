import React from "react";
import { createPortal } from "react-dom";
import MssSelectorIconButton from "../MssSelectorIconButton";

/** Menu CRÉER officiel de KILLER. Une seule implémentation utilisée dans chaque configurateur MSS. */
export type MssKillerCreateKind = "profile" | "bot" | "team" | "bot-team";
export default function MssKillerCreateMenu({
  open, accent, onClose, onChoose, withTeams = true,
}: {
  open: boolean;
  accent: string;
  onClose: () => void;
  onChoose: (kind: MssKillerCreateKind) => void;
  withTeams?: boolean;
}) {
  if (!open) return null;
  const choices: Array<{ kind: MssKillerCreateKind; icon: "players" | "bots" | "teams" | "bot-teams"; label: string }> = [
    { kind: "profile", icon: "players", label: "JOUEUR" },
    { kind: "bot", icon: "bots", label: "BOT CPU" },
    ...(withTeams ? [
      { kind: "team" as const, icon: "teams" as const, label: "ÉQUIPE" },
      { kind: "bot-team" as const, icon: "bot-teams" as const, label: "TEAM BOT" },
    ] : []),
  ];
  return createPortal(
    <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10120, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 14 }}>
      <div role="dialog" aria-modal="true" aria-label="Choisir le type de création"
        style={{ width: "min(430px,100%)", boxSizing: "border-box", background: "#0b0e1b", border: `1px solid ${accent}88`, borderRadius: 18, padding: 15, display: "grid", gap: 17, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: accent, fontSize: 14, fontWeight: 1000, letterSpacing: .8 }}>CRÉER</span>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: 0, background: "transparent", color: accent, fontSize: 26, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${withTeams ? 4 : 2}, minmax(0,1fr))`, gap: 6, alignItems: "start" }}>
          {choices.map(choice => <div key={choice.kind} style={{ display: "grid", justifyItems: "center", gap: 7, minWidth: 0 }}>
            <MssSelectorIconButton icon={choice.icon} label={`Créer ${choice.label.toLowerCase()}`} accent={accent} onClick={() => onChoose(choice.kind)} />
            <span style={{ fontSize: 10, fontWeight: 950, textAlign: "center", lineHeight: 1.25, color: accent }}>{choice.label}</span>
          </div>)}
        </div>
      </div>
    </div>,
    document.body,
  );
}
