import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";

const INFO_HALVE_IT = `
HALVE-IT est un jeu de précision et de régularité.

Chaque manche impose une cible précise.

🎯 Si au moins une fléchette touche la cible durant la volée,
le score du joueur est conservé.

❌ Si aucune fléchette ne touche la cible,
le score du joueur est divisé par deux.

Le joueur avec le score final le plus élevé remporte la partie.
`;

export default function HalveItConfig() {
  const navigate = useNavigate();
  const { t } = useLang();

  const [players, setPlayers] = useState(2);
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<"easy" | "normal" | "hard">("normal");

  const [preset, setPreset] = useState<"standard" | "short">("standard");
  const [bullEnabled, setBullEnabled] = useState(true);
  const [doubleBull, setDoubleBull] = useState(false);

  return (
    <div className="page">
      <PageHeader
        title="HALVE-IT"
        left={<BackDot onClick={() => navigate(-1)} />}
        right={<InfoDot title="Règles HALVE-IT" content={INFO_HALVE_IT} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect
            value={players}
            options={[2, 3, 4]}
            onChange={setPlayers}
          />
        </OptionRow>

        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
          <OptionRow label={t("config.botLevel", "Difficulté IA")}>
            <OptionSelect
              value={botLevel}
              options={["easy", "normal", "hard"]}
              onChange={setBotLevel}
            />
          </OptionRow>
        )}
      </Section>

      <Section title={t("config.rules", "Règles de jeu")}>
        <OptionRow label="Ordre des cibles">
          <OptionSelect
            value={preset}
            options={[
              { value: "standard", label: "Standard (15 → 20 → Bull)" },
              { value: "short", label: "Court" },
            ]}
            onChange={setPreset}
          />
        </OptionRow>

        <OptionRow label="Bull activé">
          <OptionToggle value={bullEnabled} onChange={setBullEnabled} />
        </OptionRow>

        {bullEnabled && (
          <OptionRow label="Double Bull">
            <OptionToggle value={doubleBull} onChange={setDoubleBull} />
          </OptionRow>
        )}
      </Section>

      <Section>
        <button
          className="btn-primary w-full"
          onClick={() =>
            navigate("/halve-it/play", {
              state: {
                players,
                botsEnabled,
                botLevel,
                preset,
                bullEnabled,
                doubleBull,
              },
            })
          }
        >
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
