import React, { useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerFunGages from "../assets/tickers/ticker_fun_gages.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

export type FunGagesConfigPayload = {
  players: number;
  perPlayer: boolean;
};

const INFO_TEXT = `GAGES / MODE FUN\n\nVersion jouable (standalone):\n- Tu peux lancer une partie "Gages" indépendante.\n- À chaque tour, on tire un gage aléatoire (avec historique).\n\nNote: le déclenchement automatique de gages depuis les autres modes (bust, 180, bull, etc.) sera branché ensuite via un toggle Settings + overlay.`;

export default function FunGagesConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = useState(2);
  const [perPlayer, setPerPlayer] = useState(true);

  const payload: FunGagesConfigPayload = { players, perPlayer };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    if (props?.setTab) return props.setTab("fun_gages_play", { config: payload });
  }

  return (
    <div className="page">
      <PageHeader
        title="GAGES"
        tickerSrc={tickerFunGages}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GAGES" content={INFO_TEXT} />}
      />

      <Section title={t("config.players", "Joueurs")}> 
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}> 
          <OptionSelect value={players} options={[1, 2, 3, 4, 5, 6, 8, 10, 12]} onChange={setPlayers} />
        </OptionRow>

        <OptionRow label={t("config.turnByTurn", "Tour par joueur")}> 
          <OptionSelect
            value={perPlayer ? 1 : 0}
            options={[
              { value: 1, label: t("generic.yes", "Oui") },
              { value: 0, label: t("generic.no", "Non") },
            ]}
            onChange={(v: any) => setPerPlayer(Number(v) === 1)}
          />
        </OptionRow>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start}>
          {t("config.startGame", "Démarrer")}
        </button>
      </Section>
    </div>
  );
}
