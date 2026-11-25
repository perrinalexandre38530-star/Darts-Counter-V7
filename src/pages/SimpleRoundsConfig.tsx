import React from "react";
import DartsRelatedModesPanel from "../components/DartsRelatedModesPanel";
import { dartsFamilyGameNavigation } from "../games/dartsGameFamilies";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import NativeStartOrderConfig from "../components/NativeStartOrderConfig";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { MssClassicConfigFlow, MssClassicOverview, MssClassicRecap, type ClassicConfigView } from "../components/config/MssClassicConfigFlow";
import { MssQuickPanel, MssQuickChoices, MssQuickStart } from "../components/config/MssQuickClassicControls";

/** COUNT-UP / SUPER BULL / 170 / HAPPY MILLE / ENCULETTE.
 * Navigation normalisée ; valeurs et contrat CommonConfig d'origine conservés. */
const STEPS = ["Awena", "Participants", "Bots IA", "Règles", "Récapitulatif"];
export default function SimpleRoundsConfig(props: any) {
  const { theme } = useTheme();
  const variantId: string = props?.variantId ?? "count_up";
  const playTab: string = props?.playTab ?? "count_up_play";
  const spec = SIMPLE_ROUND_VARIANTS[variantId] ?? SIMPLE_ROUND_VARIANTS.count_up;
  const accent = theme?.primary || "#f6c256";
  const [view, setView] = React.useState<ClassicConfigView>("guided");
  const [step, setStep] = React.useState(0);
  const [showHelp, setShowHelp] = React.useState(false);
  const [players, setPlayers] = React.useState(spec.defaults.players);
  const [botsEnabled, setBotsEnabled] = React.useState(spec.defaults.botsEnabled);
  const [botLevel, setBotLevel] = React.useState(spec.defaults.botLevel);
  const [humansCount, setHumansCount] = React.useState<number>(spec.defaults.humansCount ?? 1);
  const [rounds, setRounds] = React.useState(spec.defaults.rounds);
  const [objective, setObjective] = React.useState(spec.defaults.objective);
  const guided = view === "guided";
  const visible = (n: number) => !guided || step === n;
  const safeHumansCount = botsEnabled ? Math.min(Math.max(1, Number(humansCount || 1)), Math.max(1, players - 1)) : players;
  const payload: CommonConfig = { players, botsEnabled, botLevel, humansCount: safeHumansCount, rounds, objective };

  function goBack() { if (props?.setTab) return props.setTab("games"); window.history.back(); }
  function start() { props?.setTab?.(playTab, { config: payload }); }

  if (!SIMPLE_ROUND_VARIANTS[variantId]) return <div className="page" style={{ padding: 16, color: "#fff" }}>Variante inconnue : {variantId}</div>;

  return <div className="page" style={{ paddingBottom: 110, color: "#fff" }}>
    <PageHeader difficultyGameId="simple_rounds" title={spec.title} tickerSrc={spec.tickerSrc}
      left={<BackDot onClick={goBack} />} right={<InfoDot title={spec.infoTitle} content={spec.infoText} />} />
    <div style={{ maxWidth: 730, margin: "0 auto", padding: "12px 12px 20px", display: "grid", gap: 13 }}>
      <MssClassicConfigFlow title={spec.title} steps={STEPS} step={step} view={view} accent={accent}
        summary={`${players} joueur${players > 1 ? "s" : ""}`} onStep={setStep} onView={setView} onHelp={() => setShowHelp(v => !v)} />
      {visible(0) && <>
        <MssClassicOverview title={`${spec.title} · AWENA VOUS EXPLIQUE`} description={spec.infoText} accent={accent}
          onHelp={() => setShowHelp(v => !v)} />
        <DartsRelatedModesPanel gameId={variantId === "enculette" ? "enculette" : "count_up"} compact
          onOpenGame={id => { const target = dartsFamilyGameNavigation(id); if (target) props?.setTab?.(target.tab, target.params); }} />
      </>}
      {showHelp && <div role="note" style={{ fontSize: 12, lineHeight: 1.5, color: "#d4ddef", border: `1px solid ${accent}55`, padding: 12, borderRadius: 14 }}>{spec.infoText}</div>}
      {visible(1) && <MssQuickPanel title="Participants">
        <MssQuickChoices label="Nombre de joueurs" compact options={spec.playersOptions.map(value => ({ value, label: String(value) }))} value={players} onChange={setPlayers} />
        <small style={{ color: "#aeb9ce" }}>Limite de joueurs définie pour {spec.title}.</small>
      </MssQuickPanel>}
      {visible(2) && <MssQuickPanel title="Bots IA">
        <MssQuickChoices label="Bots" value={botsEnabled} onChange={setBotsEnabled}
          options={[{ value: false, label: "OFF" }, { value: true, label: "ON" }]} />
        {botsEnabled && <>
          {players > 1 && <MssQuickChoices label="Joueurs humains" compact
            options={Array.from({ length: players - 1 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            value={safeHumansCount} onChange={setHumansCount} />}
          <MssQuickChoices label="Difficulté" value={botLevel} onChange={setBotLevel}
            options={[{ value: "easy" as const, label: "Facile" }, { value: "normal" as const, label: "Normal" }, { value: "hard" as const, label: "Difficile" }]} />
        </>}
      </MssQuickPanel>}
      {visible(3) && <MssQuickPanel title="Règles">
        <MssQuickChoices label="Nombre de manches" compact options={spec.roundsOptions.map(value => ({ value, label: String(value) }))} value={rounds} onChange={setRounds} />
        <MssQuickChoices label="Objectif" options={spec.objectiveOptions.map(value => ({ value, label: value === 0 ? "Libre" : String(value) }))} value={objective} onChange={setObjective} />
        <NativeStartOrderConfig />
      </MssQuickPanel>}
      {visible(4) && <MssClassicRecap accent={accent} ready entries={[
        ["Jeu", spec.title], ["Participants", `${players} joueur${players > 1 ? "s" : ""}`],
        ["Bots IA", botsEnabled ? `${players - safeHumansCount} · ${botLevel}` : "OFF"],
        ["Manches", rounds], ["Objectif", objective || "Libre"],
      ]} />}
      {(!guided || step === STEPS.length - 1) && <MssQuickStart onClick={start} />}
    </div>
  </div>;
}
