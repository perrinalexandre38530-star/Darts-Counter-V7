import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import type { Bobs27ConfigPayload } from "../lib/gameEngines/bobs27Engine";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

type Props = { onBack: () => void; onStart: (payload: Bobs27ConfigPayload) => void };
export default function QuickBobs27Config({ onBack, onStart }: Props) {
  const [sessionId] = React.useState(() => `quick-bobs27-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(() => Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [includeBull, setIncludeBull] = React.useState(true);
  const [negativeRule, setNegativeRule] = React.useState<"eliminate" | "continue">("eliminate");
  const [randomOrder, setRandomOrder] = React.useState(false);
  function start() {
    const playersList = names.slice(0, count).map((value, i) => ({
      id: `${sessionId}-p${i + 1}`, profileId: null, temporaryPlayerId: `${sessionId}-p${i + 1}`,
      isTemporary: true, isBot: false, name: value.trim() || `J${i + 1}`,
      avatarDataUrl: quickPartyAvatar(i, sessionId), avatarUrl: quickPartyAvatar(i, sessionId), dartSetId: null,
    }));
    const ordered = [...playersList];
    if (randomOrder) for (let i = ordered.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ordered[i], ordered[j]] = [ordered[j], ordered[i]]; }
    onStart({ mode: "bobs_27", participantMode: "players", players: count,
      selectedIds: ordered.map(p => p.id), playersList: ordered, teamConfigs: [], playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal",
      startingScore: 27, startTarget: 1, endTarget: 20, includeBull, negativeRule, randomOrder: false, scoreInputMethod: "keypad",
      quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true } as Bobs27ConfigPayload);
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", color: "white", background: "#050710", padding: "0 12px 100px" }}>
    <DartsQuickHeader modeId="bobs_27" title="BOB'S 27" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="BOB'S 27" />
      <MssQuickPlayers count={count} choices={Array.from({ length: 12 }, (_, i) => i + 1)} onCount={setCount} names={names} onNames={setNames} sessionId={sessionId} />
      <MssQuickPanel title="Règles · Bob's 27">
        <small style={{ color: "#b5bdd5" }}>Départ à 27 points · D1 à D20 · 3 fléchettes par cible.</small>
        <MssQuickChoices label="Fin du parcours" options={[{ value: false, label: "D20" }, { value: true, label: "D20 + DBULL" }]} value={includeBull} onChange={setIncludeBull} />
        <MssQuickChoices label="Score négatif" options={[{ value: "eliminate" as const, label: "ÉLIMINATION" }, { value: "continue" as const, label: "CONTINUER" }]} value={negativeRule} onChange={setNegativeRule} />
        <MssQuickChoices label="Ordre de départ" options={[{ value: false, label: "MANUEL" }, { value: true, label: "ALÉATOIRE" }]} value={randomOrder} onChange={setRandomOrder} />
      </MssQuickPanel>
      <MssQuickRecap entries={[["Participants", count], ["Parcours", includeBull ? "D1 à DBULL" : "D1 à D20"], ["Score négatif", negativeRule === "eliminate" ? "Élimination" : "Continuer"], ["Départ", randomOrder ? "Aléatoire" : "Dans l’ordre"]]} />
      <MssQuickStart onClick={start} />
    </main>
  </div>;
}
