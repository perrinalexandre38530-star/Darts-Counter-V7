import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS, type TerritoryMap } from "../lib/territories/maps";

type BotLevel = "easy" | "normal" | "hard";

export type TerritoriesConfigPayload = {
  players: number;

  // ✅ NEW — équipes
  teamSize: 1 | 2 | 3;

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  /** Objectif = nb de territoires possédés pour gagner */
  objective: number;
  /** Pays / map sélectionnée */
  mapId: string; // "FR" | "EN" | "IT" | ...
};

const INFO_TEXT = `TERRITORIES
- Choisis une carte (pays) dans le configurateur (tickers).
- La partie utilise les territoires de cette carte.
- Capture : tu prends le contrôle des cases 1..20 (20 territoires tirés de la carte).
- Tu marques en capturant/tenant des territoires.
`;

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTerritoriesTicker(tickerId: string): string | null {
  const id = String(tickerId || "").toLowerCase();
  const suffix = `/ticker_territories_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.toLowerCase().endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

const MAP_ORDER = ["FR", "EN", "IT", "DE", "ES", "US", "CN", "AU", "JP", "RU", "WORLD"];

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = React.useState(2);

  // ✅ NEW — équipes
  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);

  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10); // 10 territoires pour gagner (recommandé)
  const [mapId, setMapId] = React.useState<string>(() => {
    // fallback simple
    return "FR";
  });

  // ✅ Garde la cohérence : si teamSize * 2 > players, on force players minimum
  React.useEffect(() => {
    const minPlayers = teamSize * 2;
    if (players < minPlayers) setPlayers(minPlayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSize]);

  const maps: TerritoryMap[] = React.useMemo(() => {
    const list = MAP_ORDER.map((id) => TERRITORY_MAPS[id]).filter(Boolean);
    // sécurité si tu ajoutes des maps plus tard
    const extras = Object.values(TERRITORY_MAPS).filter((m) => !MAP_ORDER.includes(m.id));
    return [...list, ...extras];
  }, []);

  const payload: TerritoriesConfigPayload = {
    players,
    teamSize,
    botsEnabled,
    botLevel,
    rounds,
    objective,
    mapId,
  };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // (Optionnel) persistance locale
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    if (props?.setTab) return props.setTab("departements_play", { config: payload });
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      <Section title={t("territories.map", "Carte (pays)")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {maps.map((m) => {
            const selected = m.id === mapId;
            const src = findTerritoriesTicker(m.tickerId);
            return (
              <button
                key={m.id}
                onClick={() => setMapId(m.id)}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: selected
                    ? "1px solid rgba(120,255,200,0.45)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: selected ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                  boxShadow: selected ? "0 12px 28px rgba(0,0,0,0.45)" : "0 10px 24px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                }}
              >
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, letterSpacing: 0.6 }}>
                    {m.id}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1000 }}>{m.name}</div>
                </div>

                <div style={{ padding: 10, paddingTop: 0 }}>
                  <div
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      aspectRatio: "800 / 330",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={`ticker ${m.id}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.95 }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                        ticker_territories_{m.tickerId}.png manquant
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          {/* ✅ Ajuste la liste selon teamSize pour éviter des combinaisons impossibles */}
          <OptionSelect
            value={players}
            options={
              teamSize === 1
                ? [2, 3, 4, 5, 6]
                : teamSize === 2
                ? [4, 6]
                : [6]
            }
            onChange={setPlayers}
          />
        </OptionRow>

        {/* ✅ NEW — Mode équipes */}
        <OptionRow label={t("territories.teams", "Mode équipes")}>
          <OptionSelect
            value={teamSize}
            options={[
              { value: 1, label: t("territories.solo", "Solo") },
              { value: 2, label: t("territories.2v2", "2 vs 2") },
              { value: 3, label: t("territories.3v3", "3 vs 3") },
            ]}
            onChange={(v: any) => setTeamSize(v as 1 | 2 | 3)}
          />
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
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
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
