import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";

export default function SimpleRoundsConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const variantId: string = props?.variantId ?? "count_up";
  const playTab: string = props?.playTab ?? "count_up_play";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];

  if (!spec) {
    return (
      <div className="page" style={{ padding: 16, color: "#fff" }}>
        Variante inconnue: {String(variantId)}
      </div>
    );
  }

  const [players, setPlayers] = useState(spec.defaults.players);
  const [botsEnabled, setBotsEnabled] = useState(spec.defaults.botsEnabled);
  const [botLevel, setBotLevel] = useState(spec.defaults.botLevel);
  const [rounds, setRounds] = useState(spec.defaults.rounds);
  const [objective, setObjective] = useState(spec.defaults.objective);

  const payload: CommonConfig = useMemo(
    () => ({ players, botsEnabled, botLevel, rounds, objective }),
    [players, botsEnabled, botLevel, rounds, objective]
  );

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    if (props?.setTab) return props.setTab(playTab, { config: payload });
  }

  return (
    <div className="page">
      <PageHeader
        title={spec.title}
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={spec.infoTitle} content={spec.infoText} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect value={players} options={spec.playersOptions} onChange={setPlayers} />
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
          <OptionSelect value={rounds} options={spec.roundsOptions} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("config.objective", "Objectif")}>
          <OptionSelect value={objective} options={spec.objectiveOptions} onChange={setObjective} />
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
