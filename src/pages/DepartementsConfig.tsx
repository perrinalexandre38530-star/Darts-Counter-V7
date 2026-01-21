import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS, type TerritoryMap } from "../lib/territories/maps";
import type { Profile } from "../lib/types";

// 🔽 IMPORTS DE TOUS LES AVATARS BOTS PRO (même set que X01ConfigV3)
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

type BotLevel = "easy" | "normal" | "hard";

type BotLite = {
  id: string;
  name: string;
  botLevel?: string;
  avatarDataUrl?: string | null;
};

export type TerritoriesConfigPayload = {
  players: number;

  // ✅ NEW — sélection réelle des participants
  selectedIds: string[]; // profils + bots

  // ✅ NEW — équipes
  teamSize: 1 | 2 | 3;
  teams?: Record<string, number>; // participantId -> teamIndex (CHOIX TEAMS)

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
- Sélectionne les joueurs (max 6) + bots (optionnel).
- Mode équipes : SOLO / 2v2 / 3v3.
- CHOIX TEAMS : tu assignes chaque participant à une Team.
- La partie utilise 20 territoires tirés de la carte sélectionnée.
- Objectif : posséder X territoires.
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
const MAX_PLAYERS = 6;

const PRO_BOTS: BotLite[] = [
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "Légende", avatarDataUrl: avatarGreenMachine },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "Pro", avatarDataUrl: avatarSnakeKing },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "Prodige Pro", avatarDataUrl: avatarWonderKid },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "Légende", avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "Pro", avatarDataUrl: avatarCoolHand },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "Légende", avatarDataUrl: avatarThePower },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret },
];

function loadCustomBots(): BotLite[] {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((b: any) => ({
        id: String(b.id || b.botId || ""),
        name: String(b.name || b.label || "Bot"),
        botLevel: String(b.botLevel || b.level || ""),
        avatarDataUrl: b.avatarDataUrl || b.avatar || null,
      }))
      .filter((b: BotLite) => !!b.id);
  } catch {
    return [];
  }
}

function isBotId(id: string) {
  return String(id || "").startsWith("bot_");
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

function HumanChip({
  p,
  active,
  onClick,
}: {
  p: Profile;
  active: boolean;
  onClick: () => void;
}) {
  const WRAP = 92;
  const MED = 78;

  const haloColor = active ? "rgba(255,215,100,0.45)" : "rgba(0,0,0,0)";
  return (
    <button
      onClick={onClick}
      style={{
        width: WRAP,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        opacity: active ? 1 : 0.55,
        filter: active ? "none" : "grayscale(0.9)",
        transition: "filter .2s ease, opacity .2s ease",
      }}
      title={p.name}
    >
      <div style={{ width: WRAP, height: WRAP, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: active ? `0 0 28px ${haloColor}` : "0 0 14px rgba(0,0,0,0.65)",
            background: active ? "radial-gradient(circle at 30% 20%, #fff8d0, rgba(255,215,100,0.35))" : "#111320",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: (WRAP - MED) / 2,
            left: (WRAP - MED) / 2,
            width: MED,
            height: MED,
            borderRadius: "50%",
            overflow: "hidden",
            border: active ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <ProfileAvatar profile={p} size={MED} />
        </div>

        {/* star ring (extérieur) */}
        <div style={{ position: "absolute", inset: -6, pointerEvents: "none", opacity: active ? 1 : 0.55 }}>
          <ProfileStarRing
            anchorSize={MED}
            gapPx={-2}
            starSize={14}
            stepDeg={12}
            avg3d={(p as any)?.stats?.avg3d ?? 0}
            color={"rgba(255,215,100,0.85)"}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 850,
          textAlign: "center",
          color: active ? "#f6f2e9" : "#7e8299",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {p.name}
      </div>
    </button>
  );
}

function BotChip({
  bot,
  active,
  onClick,
}: {
  bot: BotLite;
  active: boolean;
  onClick: () => void;
}) {
  const isPro = String(bot.id || "").startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const WRAP = 92;
  const MED = 78;

  return (
    <button
      onClick={onClick}
      style={{
        width: WRAP,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        opacity: active ? 1 : 0.55,
        filter: active ? "none" : "grayscale(0.9)",
        transition: "filter .2s ease, opacity .2s ease, transform .15s ease",
        transform: active ? "scale(1.02)" : "scale(1)",
      }}
      title={bot.name}
    >
      <div style={{ width: WRAP, height: WRAP, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: active ? `0 0 24px ${COLOR_GLOW}` : "0 0 14px rgba(0,0,0,0.65)",
            background: active
              ? isPro
                ? "radial-gradient(circle at 30% 20%, #fff3c2, rgba(247,200,92,0.35))"
                : "radial-gradient(circle at 30% 20%, #bdf6ff, rgba(0,180,255,0.35))"
              : "#111320",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: (WRAP - MED) / 2,
            left: (WRAP - MED) / 2,
            width: MED,
            height: MED,
            borderRadius: "50%",
            overflow: "hidden",
            border: active ? `2px solid ${COLOR}55` : "2px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {bot.avatarDataUrl ? (
            <img
              src={bot.avatarDataUrl}
              alt={bot.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              draggable={false}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000 }}>
              BOT
            </div>
          )}
        </div>

        {/* star ring */}
        <div style={{ position: "absolute", inset: -6, pointerEvents: "none", opacity: active ? 1 : 0.55 }}>
          <ProfileStarRing anchorSize={MED} gapPx={-2} starSize={14} stepDeg={12} avg3d={0} color={COLOR} />
        </div>

        {/* badge PRO */}
        {isPro && (
          <div
            style={{
              position: "absolute",
              right: -2,
              top: -2,
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 950,
              background: "rgba(0,0,0,0.65)",
              border: `1px solid ${COLOR}99`,
              color: "#fff",
            }}
          >
            PRO
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 850,
          textAlign: "center",
          color: active ? "#f6f2e9" : "#7e8299",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {bot.name}
      </div>
    </button>
  );
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  const { theme, palette } = useTheme() as any;
  const primary = (theme?.primary || palette?.primary || "#f5c35b") as string;

  // profils
  const profiles: Profile[] = Array.isArray(props?.store?.profiles) ? props.store.profiles : [];

  // maps
  const [mapId, setMapId] = React.useState<string>("FR");

  // ✅ sélection participants
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");

  // règles
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);

  // ✅ équipes
  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);
  const [teamById, setTeamById] = React.useState<Record<string, number>>({}); // CHOIX TEAMS

  // restore local cfg
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.mapId) setMapId(String(saved.mapId));
      if (Array.isArray(saved?.selectedIds)) setSelectedIds(saved.selectedIds.slice(0, MAX_PLAYERS));
      if (typeof saved?.botsEnabled === "boolean") setBotsEnabled(saved.botsEnabled);
      if (saved?.botLevel) setBotLevel(saved.botLevel);
      if (saved?.rounds) setRounds(saved.rounds);
      if (saved?.objective) setObjective(saved.objective);
      if (saved?.teamSize) setTeamSize(saved.teamSize);
      if (saved?.teams && typeof saved.teams === "object") setTeamById(saved.teams);
    } catch {}
  }, []);

  const maps: TerritoryMap[] = React.useMemo(() => {
    const list = MAP_ORDER.map((id) => TERRITORY_MAPS[id]).filter(Boolean);
    const extras = Object.values(TERRITORY_MAPS).filter((m) => !MAP_ORDER.includes(m.id));
    return [...list, ...extras];
  }, []);

  const customBots = React.useMemo(() => loadCustomBots(), [botsEnabled]);
  const allBots = React.useMemo(() => [...PRO_BOTS, ...customBots], [customBots]);

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  // Si bots désactivés => retire tous les bots sélectionnés
  React.useEffect(() => {
    if (botsEnabled) return;
    setSelectedIds((prev) => prev.filter((id) => !isBotId(id)));
  }, [botsEnabled]);

  // ✅ teams count dynamique (dépend du nombre sélectionné)
  const minPlayers = teamSize === 1 ? 2 : teamSize * 2;
  const playersCount = selectedIds.length;

  const teamsCount = React.useMemo(() => {
    if (teamSize === 1) return playersCount; // solo: team = joueur
    if (playersCount < minPlayers) return 0;
    if (playersCount % teamSize !== 0) return Math.ceil(playersCount / teamSize); // on affiche quand même
    return Math.max(2, playersCount / teamSize);
  }, [teamSize, playersCount, minPlayers]);

  // init team assignments (si manquants)
  React.useEffect(() => {
    if (teamSize === 1) {
      setTeamById({});
      return;
    }
    setTeamById((prev) => {
      const next = { ...prev };
      const tc = Math.max(2, Math.ceil(Math.max(playersCount, minPlayers) / teamSize));
      let cursor = 0;
      for (const id of selectedIds) {
        if (typeof next[id] !== "number") {
          next[id] = cursor % tc;
          cursor++;
        }
      }
      // cleanup removed ids
      for (const k of Object.keys(next)) {
        if (!selectedIds.includes(k)) delete next[k];
      }
      return next;
    });
  }, [selectedIds, teamSize, playersCount, minPlayers]);

  // validation teams (CHOIX)
  const teamCounts = React.useMemo(() => {
    const counts = Array.from({ length: Math.max(teamsCount, 0) }, () => 0);
    if (teamSize === 1) return counts;
    for (const id of selectedIds) {
      const ti = teamById[id];
      if (typeof ti === "number" && ti >= 0 && ti < counts.length) counts[ti]++;
    }
    return counts;
  }, [selectedIds, teamById, teamsCount, teamSize]);

  const teamsValid = React.useMemo(() => {
    if (teamSize === 1) return playersCount >= 2;
    if (playersCount < minPlayers) return false;
    if (playersCount % teamSize !== 0) return false;
    if (teamsCount < 2) return false;
    return teamCounts.length === teamsCount && teamCounts.every((c) => c === teamSize);
  }, [teamSize, playersCount, minPlayers, teamsCount, teamCounts]);

  const canStart = React.useMemo(() => {
    if (teamSize === 1) return playersCount >= 2;
    return teamsValid;
  }, [teamSize, playersCount, teamsValid]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    const payload: TerritoriesConfigPayload = {
      players: playersCount,
      selectedIds,
      teamSize,
      teams: teamSize === 1 ? undefined : teamById,
      botsEnabled,
      botLevel,
      rounds,
      objective,
      mapId,
    };
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    if (props?.setTab) return props.setTab("departements_play", { config: payload });
  }

  function gotoProfiles() {
    if (props?.setTab) return props.setTab("profiles");
  }

  function setTeamFor(id: string, teamIndex: number) {
    setTeamById((prev) => ({ ...prev, [id]: teamIndex }));
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* MAP CAROUSEL */}
      <Section title={t("territories.map", "Carte (pays)")}>
        <CardShell>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {maps.map((m) => {
              const selected = m.id === mapId;
              const src = findTerritoriesTicker(m.tickerId);
              return (
                <button
                  key={m.id}
                  onClick={() => setMapId(m.id)}
                  style={{
                    minWidth: 220,
                    textAlign: "left",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: selected ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
                    background: selected ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                    boxShadow: selected ? "0 12px 28px rgba(0,0,0,0.45)" : "0 10px 24px rgba(0,0,0,0.35)",
                    cursor: "pointer",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, letterSpacing: 0.6 }}>{m.id}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>{selected ? "SELECTED" : ""}</div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1000 }}>{m.name}</div>

                  <div style={{ marginTop: 10 }}>
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
        </CardShell>
      </Section>

      {/* PLAYERS SELECTION */}
      <Section title={t("config.players", "Joueurs")}>
        <CardShell>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
              Sélection : {selectedIds.length}/{MAX_PLAYERS} — min {minPlayers}
            </div>

            <button
              onClick={gotoProfiles}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              + Profils
            </button>
          </div>

          {/* carrousel humains */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {profiles.map((p) => {
              const active = selectedIds.includes(p.id);
              return <HumanChip key={p.id} p={p} active={active} onClick={() => toggleId(p.id)} />;
            })}
            {profiles.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                Aucun profil trouvé. Clique sur “+ Profils”.
              </div>
            )}
          </div>

          {/* équipes */}
          <div style={{ marginTop: 12 }}>
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

            {teamSize > 1 && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
                CHOIX TEAMS : assigne chaque participant à une team. Chaque team doit avoir exactement {teamSize} joueurs.
              </div>
            )}

            {teamSize > 1 && selectedIds.length > 0 && (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {selectedIds.map((id) => {
                  const isBot = isBotId(id);
                  const p = profiles.find((x) => x.id === id);
                  const b = allBots.find((x) => x.id === id);
                  const label = isBot ? (b?.name || "Bot") : (p?.name || "Joueur");
                  const ti = typeof teamById[id] === "number" ? teamById[id] : 0;
                  const tc = Math.max(2, teamsCount || 2);

                  return (
                    <div
                      key={id}
                      style={{
                        borderRadius: 14,
                        padding: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.14)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
                          {isBot ? (
                            b?.avatarDataUrl ? (
                              <img src={b.avatarDataUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000 }}>B</div>
                            )
                          ) : (
                            <ProfileAvatar profile={p as any} size={34} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850 }}>
                            {isBot ? "BOT" : "HUMAN"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {Array.from({ length: tc }, (_, k) => k).map((k) => {
                          const sel = k === ti;
                          return (
                            <button
                              key={k}
                              onClick={() => setTeamFor(id, k)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: sel ? `1px solid ${primary}88` : "1px solid rgba(255,255,255,0.12)",
                                background: sel ? `${primary}22` : "rgba(255,255,255,0.06)",
                                color: "#fff",
                                fontWeight: 950,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              T{k + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* résumé teams */}
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 14,
                    padding: 10,
                    border: teamsValid ? `1px solid rgba(120,255,200,0.30)` : "1px solid rgba(255,120,120,0.25)",
                    background: teamsValid ? "rgba(120,255,200,0.10)" : "rgba(255,120,120,0.08)",
                    fontSize: 12,
                    fontWeight: 900,
                    opacity: 0.95,
                  }}
                >
                  {teamsValid
                    ? `Teams OK : ${teamsCount} teams × ${teamSize}`
                    : `Teams invalides : sélection multiple de ${teamSize}, et chaque team doit avoir ${teamSize} joueurs.`}
                  {teamsCount > 0 && (
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {teamCounts.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.12)",
                          }}
                        >
                          Team {i + 1}: {c}/{teamSize}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* bots */}
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

                <div style={{ marginTop: 12, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                  {allBots.map((b) => {
                    const active = selectedIds.includes(b.id);
                    return <BotChip key={b.id} bot={b} active={active} onClick={() => toggleId(b.id)} />;
                  })}
                  {allBots.length === 0 && (
                    <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                      Aucun bot trouvé.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardShell>
      </Section>

      {/* RULES */}
      <Section title={t("config.rules", "Règles")}>
        <CardShell>
          <OptionRow label={t("config.rounds", "Rounds")}>
            <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
          </OptionRow>

          <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
            <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
          </OptionRow>
        </CardShell>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start} disabled={!canStart} style={{ opacity: canStart ? 1 : 0.5 }}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
        {!canStart && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontWeight: 900, textAlign: "center" }}>
            {teamSize === 1
              ? "Sélectionne au moins 2 joueurs."
              : "Sélection / teams non valides : ajuste le nombre de joueurs et les teams."}
          </div>
        )}
      </Section>
    </div>
  );
}
