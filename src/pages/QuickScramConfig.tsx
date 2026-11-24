import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

export default function QuickScramConfig({ go, onBack }: { go: (route: string, params?: any) => void; onBack: () => void }) {
  const [session] = React.useState(() => `scram-quick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(Array.from({ length: 8 }, (_, i) => `J${i + 1}`));
  const [useBull, setUseBull] = React.useState(true);
  const [maxRoundsPerPhase, setMaxRounds] = React.useState(20);
  const [firstStopper, setFirstStopper] = React.useState("random");
  function start() {
    const players = names.slice(0, count).map((name, i) => ({
      id: `${session}-p${i + 1}`, temporaryPlayerId: `${session}-p${i + 1}`, profileId: null, isTemporary: true, isBot: false,
      name: name.trim() || `J${i + 1}`, avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session),
    }));
    const a = players.filter((_, i) => i % 2 === 0), b = players.filter((_, i) => i % 2 === 1);
    const teams = [{ id: `${session}-a`, name: "ÉQUIPE A", side: "A", playerIds: a.map(p => p.id) },
      { id: `${session}-b`, name: "ÉQUIPE B", side: "B", playerIds: b.map(p => p.id) }];
    const chosen = firstStopper === "random" ? Math.random() < .5 ? "A" : "B" : firstStopper;
    go("scram_play", { players: count, selectedIds: players.map(p => p.id), playersList: players,
      teamConfigs: teams, botIds: [], botsEnabled: false, botLevel: "normal", useBull, maxRoundsPerPhase, firstStopper: chosen,
      participantMode: "players", inputMethod: "keypad", quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true });
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", padding: "0 12px 100px", background: "#050710", color: "#fff" }}>
    <DartsQuickHeader modeId="scram" title="SCRAM" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="SCRAM" />
      <MssQuickPlayers count={count} choices={[2, 4, 6, 8]} onCount={setCount} names={names} onNames={setNames}
        label="Participants · 2 camps" info="Camps A et B composés en alternance, avec le même nombre de joueurs." sessionId={session} />
      <MssQuickPanel title="Règles · Scram">
        <MssQuickChoices label="Bull" options={[{ value: true, label: "INCLUS" }, { value: false, label: "EXCLU" }]} value={useBull} onChange={setUseBull} />
        <MssQuickChoices label="Tours maximum par phase" options={[10, 20, 30].map(n => ({ value: n, label: String(n) }))} value={maxRoundsPerPhase} onChange={setMaxRounds} compact />
        <MssQuickChoices label="Premier bloqueur" options={[{ value: "random", label: "ALÉATOIRE" }, { value: "A", label: "ÉQUIPE A" }, { value: "B", label: "ÉQUIPE B" }]} value={firstStopper} onChange={setFirstStopper} />
      </MssQuickPanel>
      <MssQuickRecap entries={[["Camps", `2 × ${count / 2} joueurs`], ["Bull", useBull ? "Inclus" : "Exclu"],
        ["Tours par phase", maxRoundsPerPhase], ["Premier bloqueur", firstStopper === "random" ? "Aléatoire" : `Équipe ${firstStopper}`]]} />
      <MssQuickStart onClick={start} />
    </main>
  </div>;
}
