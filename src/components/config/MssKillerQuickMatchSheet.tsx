import React from "react";
import { MssConfigCaption, MssConfigFact } from "./MssPremiumConfig";

export interface MssQuickMatchPlayer {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
}

interface Props {
  accent: string;
  players: MssQuickMatchPlayer[];
  teams?: Array<{ id: string; name: string; color: string; logo?: string | null; members: MssQuickMatchPlayer[] }>;
  formatLabel: string;
  facts: readonly (readonly [string, string | number])[];
  audio: string;
  input: string;
  ready: boolean;
}

/** Fiche de partie commune inspirée directement du récapitulatif KILLER.
 * Conserve les données métier du configurateur appelant : aucun effet sur le moteur. */
export default function MssKillerQuickMatchSheet({ accent, players, teams, formatLabel, facts, audio, input, ready }: Props) {
  const hasTeams = Boolean(teams?.length);
  const avatar = (player: MssQuickMatchPlayer, size = 30, color = accent) => (
    <span key={player.id} title={player.name} style={{ flex: `0 0 ${size}px`, width: size, height: size, display: "inline-grid", placeItems: "center", border: `1px solid ${color}99`, borderRadius: "50%", padding: 2, boxSizing: "border-box", background: "rgba(8,10,21,.85)", overflow: "hidden" }}>
      {player.avatarDataUrl || player.avatarUrl ? <img src={player.avatarDataUrl || player.avatarUrl || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <span style={{ fontWeight: 900, color, fontSize: Math.max(9, size * .35) }}>{player.name.slice(0,2).toUpperCase()}</span>}
    </span>
  );
  const sectionStyle: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 9 };
  return <section style={{ border: `1px solid ${accent}55`, borderRadius: 18, background: "linear-gradient(155deg,rgba(25,26,37,.9),rgba(9,11,21,.94))", padding: "14px 12px 12px", display: "grid", gap: 12, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
        <strong style={{ fontSize: 15, fontWeight: 1000, letterSpacing: .7, color: accent }}>FICHE DE PARTIE</strong>
        <span style={{ color: "#afb8cb", fontSize: 11 }}>{formatLabel}</span>
      </div>
      <span role="status" style={{ border: `1px solid ${ready ? accent : "#fb7185"}55`, borderRadius: 20, padding: "5px 9px", fontWeight: 950, fontSize: 10, whiteSpace: "nowrap", color: ready ? accent : "#fb7185" }}>{ready ? "✓ PRÊT" : "À COMPLÉTER"}</span>
    </div>
    <div style={sectionStyle}>
      <MssConfigCaption accent={accent}>{hasTeams ? "ÉQUIPES EN JEU" : "JOUEURS EN JEU"}</MssConfigCaption>
      {hasTeams ? <div style={{ display: "grid", gap: 7 }}>
        {teams!.map(team => <div key={team.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", minWidth: 0, background: "rgba(255,255,255,.028)", borderRadius: 11, borderLeft: `2px solid ${team.color}` }}>
          {team.logo ? <img src={team.logo} alt="" style={{ width: 37, height: 37, objectFit: "contain", flexShrink: 0 }} /> : <span style={{ color: team.color, fontSize: 12, fontWeight: 950 }}>{team.name.slice(0, 2)}</span>}
          <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", color: team.color, fontSize: 12 }}>{team.name}</strong><span style={{ color: "#bbc2d3", fontSize: 10, lineHeight: 1.3, overflowWrap: "anywhere" }}>{team.members.map(m => m.name).join(" · ")}</span></div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>{team.members.map(member => avatar(member, 25, team.color))}</div>
        </div>)}
      </div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>
        {players.map(player => <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 3px", minWidth: 0 }}>{avatar(player)}<strong style={{ fontSize: 11, overflowWrap: "anywhere", minWidth: 0 }}>{player.name}</strong></div>)}
      </div>}
    </div>
    <div style={sectionStyle}>
      <MssConfigCaption accent={accent}>RÈGLES ESSENTIELLES</MssConfigCaption>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 12 }}>{facts.map(([label,value]) => <MssConfigFact key={label} label={label} value={value}/>)}</div>
    </div>
    <div style={sectionStyle}>
      <MssConfigCaption accent={accent}>SAISIE ET AUDIO</MssConfigCaption>
      <MssConfigFact label="Saisie" value={input}/>
      <MssConfigFact label="Audio" value={audio}/>
    </div>
    <div style={{ color: accent, fontSize: 10.5, fontWeight: 850, lineHeight: 1.4 }}>✓ Partie rapide · avatars MSS temporaires · profils enregistrés inchangés</div>
  </section>;
}
