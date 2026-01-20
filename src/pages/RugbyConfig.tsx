import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerRugby from "../assets/tickers/ticker_rugby.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";


type BotLevel = "easy" | "normal" | "hard";

export type RugbyConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
};

const INFO_TEXT = `MVP : base jouable. Version complète : points selon actions.`;

export default function RugbyConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = useState(2);
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [rounds, setRounds] = useState(10);
  const [objective, setObjective] = useState(0);

  const payload: RugbyConfigPayload = { players, botsEnabled, botLevel, rounds, objective };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // App.tsx wiring: tab "rugby_play"
    if (props?.setTab) return props.setTab("rugby_play", { config: payload });
    // Router alternative: à adapter au câblage final si besoin
  }

  return (
    <div className="page">
      <PageHeader
        title="RUGBY"
        tickerSrc={tickerRugby}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles RUGBY" content={INFO_TEXT} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect value={players} options={[2, 3, 4]} onChange={setPlayers} />
        </OptionRow>

        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
          <OptionRow label={t("config.botLevel", "Difficulté IA")}>
            <OptionSelect
              value={botLevel}
              options={[
                { value: "easy", label: "Facile" },
                { value: "normal", label: "Normal" },
                { value: "hard", label: "Difficile" },
              ]}
              onChange={setBotLevel}
            />
          </OptionRow>
        )}
      </Section>

      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[5, 8, 10, 12, 15]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("config.objective", "Objectif")}>
          <OptionSelect value={objective} options={[0, 100, 170, 300, 500, 1000]} onChange={setObjective} />
        </OptionRow>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
