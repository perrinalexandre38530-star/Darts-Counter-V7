import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerPrisoner from "../assets-webp/tickers/ticker_prisoner.webp";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";


type BotLevel = "easy" | "normal" | "hard";

export type PrisonerConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  lives: number;
  objective: number;
};

const INFO_TEXT = `PRISONER (mode fun)

Règles (version jouable):
- Tous les joueurs jouent une volée par round (saisie simple 0..180).
- À la fin du round, le plus petit score perd 1 vie.
- Quand un joueur n'a plus de vies, il est éliminé.
- Le dernier joueur en vie gagne.
- Limite de rounds optionnelle (si atteinte: meilleur total gagne).`;

export default function PrisonerConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = useState(2);
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [rounds, setRounds] = useState(10);
  const [lives, setLives] = useState(3);
  const [objective, setObjective] = useState(0);

  const payload: PrisonerConfigPayload = { players, botsEnabled, botLevel, rounds, lives, objective };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // App.tsx wiring: tab "prisoner_play"
    if (props?.setTab) return props.setTab("prisoner_play", { config: payload });
    // Router alternative: à adapter au câblage final si besoin
  }

  return (
    <div className="page">
      <PageHeader
        title="PRISONER"
        tickerSrc={tickerPrisoner}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles PRISONER" content={INFO_TEXT} />}
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

        <OptionRow label={t("config.lives", "Vies")}>
          <OptionSelect value={lives} options={[1, 2, 3, 4, 5]} onChange={setLives} />
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
