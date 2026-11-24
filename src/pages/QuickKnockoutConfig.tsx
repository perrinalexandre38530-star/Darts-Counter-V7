import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

export default function QuickKnockoutConfig({ onBack, onStart }: { onBack: () => void; onStart: (params: any) => void }) {
  const [session] = React.useState(() => `quick-knockout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const [count, setCount] = React.useState(2);
  const [rounds, setRounds] = React.useState(10);
  const [names, setNames] = React.useState(["J1", "J2", "J3", "J4"]);
  function start() {
    const players = names.slice(0, count).map((n, i) => ({ id: `${session}-p${i + 1}`, temporaryPlayerId: `${session}-p${i + 1}`,
      name: n.trim() || `J${i + 1}`, profileId: null, isTemporary: true, isBot: false,
      avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session) }));
    onStart({ config: { players: count, botsEnabled: false, botLevel: "normal", rounds, objective: 0,
      quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true },
      players, quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true });
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", color: "white", background: "#050710", padding: "0 12px 100px" }}>
    <DartsQuickHeader modeId="knockout" title="KNOCKOUT" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="KNOCKOUT" />
      <MssQuickPlayers count={count} choices={[2, 3, 4]} onCount={setCount} names={names} onNames={setNames} sessionId={session} />
      <MssQuickPanel title="Règles · Knockout">
        <MssQuickChoices label="Nombre maximum de manches" options={[5, 8, 10, 12, 15].map(n => ({ value: n, label: String(n) }))} value={rounds} onChange={setRounds} compact />
        <small style={{ color: "#aebbd3", lineHeight: 1.45 }}>À chaque manche, le score le plus faible est éliminé. Le dernier joueur en lice gagne.</small>
      </MssQuickPanel>
      <MssQuickRecap entries={[["Participants", count], ["Manches maximum", rounds], ["Règle", "Élimination au score le plus faible"]]} />
      <MssQuickStart onClick={start} />
    </main>
  </div>;
}
