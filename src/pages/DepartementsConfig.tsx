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
import type { Profile } from "../lib/types";

// -------------------------------------------------------------------
// TERRITORIES (Departements) — CONFIG (V3)
// - Carrousel des pays (tickers) sélectionnable
// - Carrousel joueurs (profils) comme X01ConfigV3 / Killer / Cricket
// - Bots configurables (PRO + bots utilisateur depuis localStorage dc_bots_v1)
// - Mode équipes (solo / 2v2 / 3v3) + contraintes cohérentes
// -------------------------------------------------------------------

type BotLevel = "easy" | "normal" | "hard";

export type TerritoriesConfigPayload = {
  // ✅ Sélection joueurs réels (profils + bots)
  selectedIds: string[];

  // Nombre de joueurs dérivé de selectedIds.length (resté en payload pour compat)
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
- Sélectionne tes joueurs via le carrousel (profils + bots).
- Mode équipes possible (2v2 / 3v3).
- La partie utilise 20 territoires tirés de la carte.
- Capture : influence S/D/T = +1/+2/+3, capture à partir de 3 (strictement max).
- Objectif : posséder X territoires.`;

const LS_BOTS_KEY = "dc_bots_v1";

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

// --- Bots PRO (même base que X01/Killer)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";

const PRO_BOTS: BotLite[] = [
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "Légende", avatarDataUrl: avatarGreenMachine as any },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "Pro", avatarDataUrl: avatarSnakeKing as any },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "Prodige Pro", avatarDataUrl: avatarWonderKid as any },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan as any },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "Pro", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "Pro", avatarDataUrl: avatarCoolHand as any },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "Légende", avatarDataUrl: avatarThePower as any },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy as any },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp as any },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood as any },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret as any },
];

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

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveAvatarSrc(p: any): string | null {
  if (!p) return null;
  // clés usuelles du projet
  const direct =
    (typeof p.avatarDataUrl === "string" && p.avatarDataUrl) ||
    (typeof p.avatarUrl === "string" && p.avatarUrl) ||
    (typeof p.photoUrl === "string" && p.photoUrl) ||
    null;
  return direct;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  useTheme();

  // -----------------------------
  // DATA: profils & bots
  // -----------------------------
  const storeProfiles: Profile[] = (props?.store?.profiles || []) as any;
  const humanProfiles: Profile[] = Array.isArray(storeProfiles)
    ? storeProfiles.filter((p) => p && !p.isBot)
    : [];

  const userBots = React.useMemo(() => {
    const arr = safeParse<BotLite[]>(localStorage.getItem(LS_BOTS_KEY));
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, []);

  const allBots: BotLite[] = React.useMemo(() => {
    // PRO + user
    const seen = new Set<string>();
    const out: BotLite[] = [];
    for (const b of [...PRO_BOTS, ...userBots]) {
      if (!b?.id || seen.has(b.id)) continue;
      seen.add(b.id);
      out.push(b);
    }
    return out;
  }, [userBots]);

  // -----------------------------
  // STATE
  // -----------------------------
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);
  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);

  const [mapId, setMapId] = React.useState<string>(() => "FR");

  // sélection joueurs = ids profils + ids bots
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    // fallback : auto-sélectionner 2 premiers profils si disponibles
    const initial: string[] = [];
    for (const p of humanProfiles.slice(0, 2)) initial.push(p.id);
    return initial;
  });

  // Quand les profils chargent, si rien sélectionné, on init à 2 profils
  React.useEffect(() => {
    if (selectedIds.length) return;
    const initial: string[] = [];
    for (const p of humanProfiles.slice(0, 2)) initial.push(p.id);
    if (initial.length) setSelectedIds(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanProfiles.length]);

  // -----------------------------
  // MAPS
  // -----------------------------
  const maps: TerritoryMap[] = React.useMemo(() => {
    const list = MAP_ORDER.map((id) => TERRITORY_MAPS[id]).filter(Boolean);
    const extras = Object.values(TERRITORY_MAPS).filter((m) => !MAP_ORDER.includes(m.id));
    return [...list, ...extras];
  }, []);

  // -----------------------------
  // CONSTRAINTS
  // -----------------------------
  const players = selectedIds.length;
  const minPlayers = teamSize === 1 ? 2 : teamSize * 2;
  const maxPlayers = 6;

  React.useEffect(() => {
    // si teamSize augmente, s'assurer qu'on a au moins 2 équipes
    if (players < minPlayers) {
      // auto-ajoute des bots si activés, sinon laisse l'utilisateur sélectionner
      if (botsEnabled) {
        const need = minPlayers - players;
        const add: string[] = [];
        for (const b of allBots) {
          if (add.length >= need) break;
          if (!selectedIds.includes(b.id)) add.push(b.id);
        }
        if (add.length) setSelectedIds((prev) => [...prev, ...add]);
      }
    }

    // cap max
    if (players > maxPlayers) {
      setSelectedIds((prev) => prev.slice(0, maxPlayers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSize, botsEnabled]);

  // si bots désactivés => retirer bots sélectionnés
  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(allBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botsEnabled]);

  const canStart = players >= minPlayers && players <= maxPlayers;

  const payload: TerritoriesConfigPayload = {
    selectedIds,
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

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const on = prev.includes(id);
      if (on) {
        // ne pas descendre sous minPlayers (si possible)
        if (prev.length <= minPlayers) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxPlayers) return prev;
      return [...prev, id];
    });
  }

  function start() {
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    if (props?.setTab) return props.setTab("departements_play", { config: payload });
  }

  // -----------------------------
  // UI Helpers (style carrousel)
  // -----------------------------
  const primary = "#7CFFB5";

  const cardStyle = (active: boolean) => ({
    minWidth: 250,
    borderRadius: 18,
    overflow: "hidden" as const,
    border: active ? "1px solid rgba(120,255,200,0.40)" : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
    boxShadow: active ? "0 12px 28px rgba(0,0,0,0.55)" : "0 10px 24px rgba(0,0,0,0.38)",
    cursor: "pointer" as const,
  });

  function Medallion({ name, avatarSrc, active, subtitle }: { name: string; avatarSrc: string | null; active: boolean; subtitle?: string }) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 10,
          minWidth: 110,
          borderRadius: 18,
          border: active ? `1px solid ${primary}55` : "1px solid rgba(255,255,255,0.08)",
          background: active ? `linear-gradient(180deg, rgba(124,255,181,0.14), rgba(255,255,255,0.03))` : "rgba(255,255,255,0.03)",
          boxShadow: active ? "0 0 26px rgba(124,255,181,0.22)" : "0 0 14px rgba(0,0,0,0.55)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
            background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              draggable={false}
            />
          ) : (
            <div style={{ fontSize: 26, fontWeight: 1000, opacity: 0.9 }}>{String(name || "?").slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div style={{ textAlign: "center", maxWidth: 100 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: active ? "#f6f2e9" : "#7e8299",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, marginTop: 2, color: active ? "#d8fff0" : "#7e8299" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* ---------------------- Pays (carrousel) ---------------------- */}
      <Section title={t("territories.map", "Carte (pays)")}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
          {maps.map((m) => {
            const active = m.id === mapId;
            const src = findTerritoriesTicker(m.tickerId);
            return (
              <div key={m.id} role="button" onClick={() => setMapId(m.id)} style={cardStyle(active)}>
                <div style={{ padding: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, letterSpacing: 0.8 }}>{m.id}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>{active ? "SELECTED" : ""}</div>
                </div>
                <div style={{ padding: "0 12px 10px" }}>
                  <div style={{ fontSize: 16, fontWeight: 1000, lineHeight: 1.1 }}>{m.name}</div>
                </div>

                <div style={{ padding: 12, paddingTop: 0 }}>
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
              </div>
            );
          })}
        </div>
      </Section>

      {/* ---------------------- Joueurs (carrousel) ---------------------- */}
      <Section title={t("config.players", "Joueurs")}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
            {t("config.playerCount", "Sélection")} : {players}/{maxPlayers} — min {minPlayers}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
              {t("territories.teams", "Mode équipes")}
            </div>
            <OptionSelect
              value={teamSize}
              options={[
                { value: 1, label: t("territories.solo", "Solo") },
                { value: 2, label: t("territories.2v2", "2 vs 2") },
                { value: 3, label: t("territories.3v3", "3 vs 3") },
              ]}
              onChange={(v: any) => setTeamSize(v as 1 | 2 | 3)}
            />
          </div>
        </div>

        {/* Profils humains */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
          {humanProfiles.map((p) => {
            const active = selectedIds.includes(p.id);
            return (
              <div key={p.id} role="button" onClick={() => togglePlayer(p.id)}>
                <Medallion name={p.name} subtitle={t("generic.human", "Humain")} avatarSrc={resolveAvatarSrc(p)} active={active} />
              </div>
            );
          })}

          {/* CTA Profils */}
          <div
            role="button"
            onClick={() => props?.setTab && props.setTab("profiles")}
            style={{
              minWidth: 120,
              borderRadius: 18,
              border: "1px dashed rgba(255,255,255,0.20)",
              background: "rgba(255,255,255,0.03)",
              padding: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 950,
              opacity: 0.85,
              cursor: "pointer",
            }}
          >
            + Profils
          </div>
        </div>

        {/* Bots IA */}
        <div style={{ marginTop: 12 }}>
          <OptionRow label={t("config.bots", "Bots IA")}>
            <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
          </OptionRow>

          {botsEnabled && (
            <div style={{ marginTop: 10 }}>
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

              <div style={{ marginTop: 12, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, opacity: botsEnabled ? 1 : 0.55 }}>
                {allBots.map((b) => {
                  const active = selectedIds.includes(b.id);
                  return (
                    <div key={b.id} role="button" onClick={() => togglePlayer(b.id)}>
                      <Medallion name={b.name} subtitle={b.botLevel || "BOT"} avatarSrc={resolveAvatarSrc(b)} active={active} />
                    </div>
                  );
                })}

                <div
                  role="button"
                  onClick={() => props?.setTab && props.setTab("profiles_bots")}
                  style={{
                    minWidth: 120,
                    borderRadius: 18,
                    border: "1px dashed rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                    opacity: 0.85,
                    cursor: "pointer",
                  }}
                >
                  Gérer BOTS
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ---------------------- Règles ---------------------- */}
      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
        </OptionRow>
      </Section>

      {/* ---------------------- Start ---------------------- */}
      <Section>
        {!canStart && (
          <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            {teamSize === 1
              ? "Sélectionne au moins 2 joueurs."
              : `Sélectionne au moins ${minPlayers} joueurs (2 équipes de ${teamSize}).`}
          </div>
        )}

        <button className="btn-primary w-full" onClick={start} disabled={!canStart} style={{ opacity: canStart ? 1 : 0.6 }}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
