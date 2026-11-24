import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

type ModeId = "count_up" | "happy_mille" | "game_170" | "enculette";
export default function QuickSimpleRoundsConfig({ modeId, onBack, onStart }: {
  modeId: ModeId; onBack: () => void; onStart: (params: any) => void;
}) {
  const spec = SIMPLE_ROUND_VARIANTS[modeId];
  const [sessionId] = React.useState(() => `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const [count, setCount] = React.useState(spec.defaults.players);
  const [names, setNames] = React.useState(Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [rounds, setRounds] = React.useState(spec.defaults.rounds);
  const [objective, setObjective] = React.useState(spec.defaults.objective);
  const choices = spec.playersOptions.map(Number);
  const launch = () => {
    const players = names.slice(0, count).map((name, index) => ({
      id: `${sessionId}-p${index + 1}`, temporaryPlayerId: `${sessionId}-p${index + 1}`,
      name: name.trim() || `J${index + 1}`, profileId: null, isTemporary: true, isBot: false,
      avatarDataUrl: quickPartyAvatar(index, sessionId), avatarUrl: quickPartyAvatar(index, sessionId),
    }));
    onStart({ config: { players: count, humansCount: count, botsEnabled: false, botLevel: "normal",
      rounds, objective, quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true },
      players, quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true });
  };
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", color: "white", background: "#050710", padding: "0 12px 100px" }}>
    <DartsQuickHeader modeId={modeId} title={spec.title} onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title={spec.title} />
      <MssQuickPlayers count={count} choices={choices} onCount={setCount} names={names} onNames={setNames} sessionId={sessionId} />
      <MssQuickPanel title={`Règles · ${spec.title}`}>
        <MssQuickChoices label="Manches" options={spec.roundsOptions.map(Number).map(n => ({ value: n, label: String(n) }))} value={rounds} onChange={setRounds} compact />
        <MssQuickChoices label="Objectif" options={spec.objectiveOptions.map(Number).map(n => ({ value: n, label: n === 0 ? "SANS OBJECTIF" : String(n) }))} value={objective} onChange={setObjective} compact />
      </MssQuickPanel>
      <MssQuickRecap entries={[["Participants", count], ["Manches", rounds], ["Objectif", objective || "Sans objectif"]]} />
      <MssQuickStart onClick={launch} />
    </main>
  </div>;
}
