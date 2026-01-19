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


type BotLevel = "easy" | "normal" | "hard";

export type DepartementsConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
  // TERRITORIES map selection (country / dataset)
  mapId: string; // ex: FR, EN, IT, DE, ES, US, CN, AU, JP, RU, WORLD
};

const INFO_TEXT = `Choisis une carte (pays) : elle définit les territoires du mode TERRITORIES.\n\nAstuce : le ticker affiché sert d’aperçu visuel de la carte sélectionnée.`;

const MAPS: { id: string; label: string; tickerId: string }[] = [
  { id: "FR", label: "France", tickerId: "fr" },
  { id: "EN", label: "England", tickerId: "en" },
  { id: "IT", label: "Italy", tickerId: "it" },
  { id: "DE", label: "Germany", tickerId: "de" },
  { id: "ES", label: "Spain", tickerId: "es" },
  { id: "US", label: "USA", tickerId: "us" },
  { id: "CN", label: "China", tickerId: "cn" },
  { id: "AU", label: "Australia", tickerId: "au" },
  { id: "JP", label: "Japan", tickerId: "jp" },
  { id: "RU", label: "Russia", tickerId: "ru" },
  { id: "WORLD", label: "World", tickerId: "world" },
];

// Load all TERRITORIES tickers from assets (Vite eager import)
const TICKERS = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function tickerSrcFor(tickerId: string) {
  // expected file: ticker_territories_<id>.png
  const key = `../assets/tickers/ticker_territories_${String(tickerId).toLowerCase()}.png`;
  return TICKERS[key] || "";
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = useState(2);
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [rounds, setRounds] = useState(10);
  const [objective, setObjective] = useState(0);
  const [mapId, setMapId] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return "FR";
      const parsed = JSON.parse(raw);
      const v = parsed?.mapId;
      return typeof v === "string" && v ? v : "FR";
    } catch {
      return "FR";
    }
  });

  const payload: DepartementsConfigPayload = { players, botsEnabled, botLevel, rounds, objective, mapId };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // Persist in the generic key so DartsModeScaffold / future engine can read it
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify({
        modeId: "departements",
        ...payload,
      }));
    } catch {}
    // App.tsx wiring: tab "departements_play"
    if (props?.setTab) return props.setTab("departements_play", { config: payload });
    // Router alternative: à adapter au câblage final si besoin
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      <Section title={t("territories.map", "Carte (pays)")}
        right={
          <InfoDot
            title={t("territories.mapInfoTitle", "Carte")}
            content={t(
              "territories.mapInfo",
              "Choisis la carte (pays) à utiliser. Le ticker affiché sert d’aperçu et la carte est utilisée en jeu."
            )}
          />
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {MAPS.map((m) => {
            const sel = mapId === m.id;
            const src = tickerSrcFor(m.tickerId);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMapId(m.id)}
                className={`rounded-2xl border px-2.5 pt-2.5 pb-2 text-left transition active:scale-[0.99] ${
                  sel
                    ? "border-yellow-300/60 bg-yellow-300/10"
                    : "border-white/10 bg-white/5 hover:bg-white/7"
                }`}
              >
                <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {src ? (
                    <img
                      src={src}
                      alt={m.label}
                      className="w-full h-[78px] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-[78px] flex items-center justify-center text-white/50 text-xs">
                      ticker_territories_{m.tickerId}.png manquant
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold leading-tight truncate">{m.label}</div>
                    <div className="text-[11px] text-white/60">{m.id}</div>
                  </div>
                  <div
                    className={`h-6 w-6 rounded-full border ${
                      sel
                        ? "border-yellow-300/70 bg-yellow-300/20"
                        : "border-white/15 bg-black/20"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

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
