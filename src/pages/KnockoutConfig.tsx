import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import NativeStartOrderConfig from "../components/NativeStartOrderConfig";
import tickerKnockout from "../assets/tickers/ticker_knockout.png";
import { useTheme } from "../contexts/ThemeContext";
import { MssClassicConfigFlow, MssClassicOverview, MssClassicRecap, type ClassicConfigView } from "../components/config/MssClassicConfigFlow";
import { MssQuickPanel, MssQuickChoices, MssQuickStart } from "../components/config/MssQuickClassicControls";

/** KNOCKOUT · même architecture de configuration que KILLER/X01.
 * Les cinq valeurs du payload et la route de lancement restent inchangées. */
type BotLevel = "easy" | "normal" | "hard";
export type KnockoutConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
};

const STEPS = ["Awena", "Participants", "Bots IA", "Règles", "Récapitulatif"];
const INFO_TEXT = "MVP : version jouable. Éliminations à implémenter ensuite.";

export default function KnockoutConfig(props: any) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f6c256";
  const [view, setView] = React.useState<ClassicConfigView>("guided");
  const [step, setStep] = React.useState(0);
  const [showHelp, setShowHelp] = React.useState(false);
  const [players, setPlayers] = React.useState(2);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(10);
  const [objective, setObjective] = React.useState(0);
  const guided = view === "guided";
  const visible = (n: number) => !guided || step === n;

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }
  function start() {
    const payload: KnockoutConfigPayload = { players, botsEnabled, botLevel, rounds, objective };
    if (props?.setTab) props.setTab("knockout_play", { config: payload });
  }

  return <div className="page" style={{ paddingBottom: 110, color: "#fff" }}>
    <PageHeader difficultyGameId="knockout" title="KNOCKOUT" tickerSrc={tickerKnockout}
      left={<BackDot onClick={goBack} />} right={<InfoDot title="Règles KNOCKOUT" content={INFO_TEXT} />} />
    <div style={{ maxWidth: 730, margin: "0 auto", padding: "12px 12px 20px", display: "grid", gap: 13 }}>
      <MssClassicConfigFlow title="KNOCKOUT" steps={STEPS} step={step} view={view} accent={accent}
        summary={`${players} joueurs`} onStep={setStep} onView={setView} onHelp={() => setShowHelp(v => !v)} />
      {visible(0) && <MssClassicOverview title="KNOCKOUT · AWENA VOUS EXPLIQUE"
        description="Choisis les participants, le nombre de manches et l'objectif. Le jeu conserve ses règles actuelles." accent={accent}
        onHelp={() => setShowHelp(v => !v)} />}
      {showHelp && <div role="note" style={{ fontSize: 12, color: "#d4ddef", border: `1px solid ${accent}55`, padding: 12, borderRadius: 14 }}>{INFO_TEXT}</div>}
      {visible(1) && <MssQuickPanel title="Participants">
        <MssQuickChoices label="Nombre de joueurs" compact options={[2,3,4].map(value => ({ value, label: String(value) }))} value={players} onChange={setPlayers} />
        <small style={{ color: "#aeb9ce" }}>De 2 à 4 joueurs, selon les limites actuelles de KNOCKOUT.</small>
      </MssQuickPanel>}
      {visible(2) && <MssQuickPanel title="Bots IA">
        <MssQuickChoices label="Adversaires automatiques" options={[{ value: false, label: "OFF" }, { value: true, label: "ON" }]} value={botsEnabled} onChange={setBotsEnabled} />
        {botsEnabled && <MssQuickChoices label="Niveau" options={[{ value: "easy" as const, label: "Facile" }, { value: "normal" as const, label: "Normal" }, { value: "hard" as const, label: "Difficile" }]} value={botLevel} onChange={setBotLevel} />}
      </MssQuickPanel>}
      {visible(3) && <MssQuickPanel title="Règles de la partie">
        <MssQuickChoices label="Manches" options={[5,8,10,12,15].map(value => ({ value, label: String(value) }))} value={rounds} onChange={setRounds} compact />
        <MssQuickChoices label="Objectif" options={[0,100,170,300,500,1000].map(value => ({ value, label: value === 0 ? "Libre" : String(value) }))} value={objective} onChange={setObjective} />
        <NativeStartOrderConfig />
      </MssQuickPanel>}
      {visible(4) && <MssClassicRecap accent={accent} ready entries={[
        ["Participants", `${players} joueurs`], ["Bots IA", botsEnabled ? `ON · ${botLevel}` : "OFF"],
        ["Manches", rounds], ["Objectif", objective || "Libre"],
      ]} />}
      {(!guided || step === STEPS.length - 1) && <MssQuickStart onClick={start} />}
    </div>
  </div>;
}
