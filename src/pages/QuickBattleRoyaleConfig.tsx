import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

/** Les profils rapides restent temporaires : aucune écriture dans les profils sauvegardés. */
export default function QuickBattleRoyaleConfig({ go, onBack }: { go: (route: string, params?: any) => void; onBack: () => void }) {
  const [session] = React.useState(() => `battle-quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [lives, setLives] = React.useState(3);
  const [rule, setRule] = React.useState("life_system");
  function start() {
    const players = names.slice(0, count).map((n, i) => ({ id: `${session}-p${i + 1}`, temporaryPlayerId: `${session}-p${i + 1}`, profileId: null,
      isTemporary: true, isBot: false, name: n.trim() || `J${i + 1}`,
      avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session) }));
    const meta = { quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true };
    go("battle_royale_play", { ...meta, matchId: session, config: { ...meta, players, lives,
      dartsPerTurn: 3, eliminationRule: rule, missLimit: 6, sfxEnabled: false, voiceEnabled: false } });
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", padding: "0 12px 100px", background: "#050710", color: "#fff" }}>
    <DartsQuickHeader modeId="battle_royale" title="BATTLE ROYALE" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="BATTLE ROYALE" />
      <MssQuickPlayers count={count} choices={[2, 3, 4, 6, 8, 12]} onCount={setCount} names={names} onNames={setNames} sessionId={session} />
      <MssQuickPanel title="Règles · Battle Royale">
        <MssQuickChoices label="Vies de départ" options={[3, 5, 7].map(n => ({ value: n, label: String(n) }))} value={lives} onChange={setLives} compact />
        <MssQuickChoices label="Élimination" options={[
          { value: "life_system", label: "PAR VIES" }, { value: "miss_x", label: "PAR MISS" }, { value: "zero_points", label: "SCORE ZÉRO" }
        ]} value={rule} onChange={setRule} />
      </MssQuickPanel>
      <MssQuickRecap entries={[["Participants", count], ["Vies", lives], ["Élimination", rule === "life_system" ? "Par vies" : rule === "miss_x" ? "Par MISS" : "Score zéro"]]} />
      <MssQuickStart onClick={start} />
    </main>
  </div>;
}
