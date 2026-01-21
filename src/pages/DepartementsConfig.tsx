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
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS, type TerritoryMap } from "../lib/territories/maps";

type BotLevel = "easy" | "normal" | "hard";

export type TerritoriesConfigPayload = {
  players: number;
  /** ✅ NEW — teams */
  teamSize: 1 | 2 | 3;
  /** ✅ NEW — chosen player ids (humans + bots) */
  selectedIds: string[];
  /** ✅ NEW — team assignment by id (0..teamCount-1) */
  teamsById?: Record<string, number>;

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  /** Objectif = nb de territoires possédés pour gagner */
  objective: number;
  /** Pays / map sélectionnée */
  mapId: string; // "FR" | "EN" | "IT" | ...
};

const INFO_TEXT = `TERRITORIES
- Choisis une carte (pays) dans le configurateur.
- Sélectionne les joueurs (humains + bots) via le carrousel.
- En mode équipes, assigne chaque joueur à une team (CHOIX TEAMS).
- La partie utilise 20 territoires tirés de la carte (cases 1..20).
- Capture à partir de 3 d'influence (strictement max).
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
const LS_BOTS_KEY = "dc_bots_v1";

/** Very tolerant bot detector */
function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  if (p.kind === "bot") return true;
  return false;
}

type BotLite = { id: string; name: string; avatarDataUrl: string | null; botLevel?: string };

function readUserBotsFromLS(): BotLite[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((b) => ({
      id: String(b.id),
      name: b.name || "BOT",
      avatarDataUrl: b.avatarDataUrl ?? null,
      botLevel: b.botLevel ?? b.levelLabel ?? b.levelName ?? b.performanceLevel ?? b.difficulty ?? "",
    }));
  } catch {
    return [];
  }
}

/** Build a fake profile compatible with ProfileAvatar */
function botToFakeProfile(b: BotLite) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: b.avatarDataUrl,
    isBot: true,
    botLevel: b.botLevel || "",
  } as any;
}

function clampTeamSize(v: any): 1 | 2 | 3 {
  const n = Number(v);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;

  // ✅ EXACT pattern as KillerConfig
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const humanProfiles = storeProfiles.filter((p) => p && !isBotLike(p));
  // bots from LS (custom bots)
  const [userBots, setUserBots] = React.useState<BotLite[]>([]);

  React.useEffect(() => {
    setUserBots(readUserBotsFromLS());
  }, []);

  const primary = (theme as any)?.primary ?? "#7dffca";
  const primarySoft = (theme as any)?.primarySoft ?? "rgba(125,255,202,0.16)";

  // ---------------- state
  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);

  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");

  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);

  const [mapId, setMapId] = React.useState<string>(() => "FR");

  // selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    // try restore
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 6);
    } catch {}
    return [];
  });

  const [teamsById, setTeamsById] = React.useState<Record<string, number>>({});

  // computed teamCount (CHOIX TEAMS): for solo -> each player its own team; for teams -> user assigns teams,
  // teamCount is max assigned+1 OR minimum required based on selectedIds length / teamSize.
  const minPlayers = teamSize === 1 ? 2 : teamSize * 2;
  const maxPlayers = 6;

  const teamCount = React.useMemo(() => {
    if (teamSize === 1) return selectedIds.length || 0;
    const base = Math.floor(selectedIds.length / teamSize);
    const maxAssigned = Math.max(-1, ...selectedIds.map((id) => (teamsById[id] ?? -1)));
    return Math.max(base, maxAssigned + 1);
  }, [selectedIds, teamSize, teamsById]);

  const maps: TerritoryMap[] = React.useMemo(() => {
    const list = MAP_ORDER.map((id) => TERRITORY_MAPS[id]).filter(Boolean);
    const extras = Object.values(TERRITORY_MAPS).filter((m) => !MAP_ORDER.includes(m.id));
    return [...list, ...extras];
  }, []);

  function goBack() {
    if ((props as any)?.go) return (props as any).go("games");
    if ((props as any)?.setTab) return (props as any).setTab("games");
    window.history.back();
  }

  function goProfiles() {
    if ((props as any)?.go) return (props as any).go("profiles");
    if ((props as any)?.setTab) return (props as any).setTab("profiles");
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter((x) => x !== id);
        return next;
      }
      if (prev.length >= maxPlayers) return prev;
      return [...prev, id];
    });
  }

  // keep teamsById clean when players removed
  React.useEffect(() => {
    setTeamsById((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!selectedIds.includes(k)) delete next[k];
      }
      return next;
    });
  }, [selectedIds]);

  // If bots disabled, remove bot ids from selection
  React.useEffect(() => {
    if (botsEnabled) return;
    setSelectedIds((prev) => {
      const botIds = new Set(userBots.map((b) => b.id));
      return prev.filter((id) => !botIds.has(id));
    });
  }, [botsEnabled, userBots]);

  // When teamSize changes, ensure min players condition; do not auto-add players (user controls)
  const selectionValid = React.useMemo(() => {
    if (selectedIds.length < minPlayers) return false;
    if (teamSize === 1) return true;

    // need exact multiples
    if (selectedIds.length % teamSize !== 0) return false;

    // must assign each selected id to a team [0..teamCount-1]
    // and each team must have exactly teamSize members
    const counts = Array.from({ length: teamCount }, () => 0);
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= teamCount) return false;
      counts[te]++;
    }
    return counts.every((c) => c === teamSize);
  }, [selectedIds, minPlayers, teamSize, teamsById, teamCount]);

  // Build payload
  const payload: TerritoriesConfigPayload = {
    players: selectedIds.length,
    teamSize,
    selectedIds,
    teamsById: teamSize === 1 ? undefined : teamsById,
    botsEnabled,
    botLevel,
    rounds,
    objective,
    mapId,
  };

  function start() {
    if (!selectionValid) return;
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    if ((props as any)?.go) return (props as any).go("departements_play", { config: payload });
    if ((props as any)?.setTab) return (props as any).setTab("departements_play", { config: payload });
  }

  const cardBg = "rgba(10, 12, 24, 0.96)";

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* MAPS CAROUSEL */}
      <Section title={t("territories.map", "Carte (pays)")}>
        <div className="dc-scroll-thin" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10 }}>
          {maps.map((m) => {
            const selected = m.id === mapId;
            const src = findTerritoriesTicker(m.tickerId);
            return (
              <button
                key={m.id}
                onClick={() => setMapId(m.id)}
                style={{
                  minWidth: 210,
                  maxWidth: 210,
                  textAlign: "left",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: selected ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
                  background: selected ? primarySoft : "rgba(255,255,255,0.04)",
                  boxShadow: selected ? `0 12px 28px ${primary}22` : "0 10px 24px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, letterSpacing: 0.6 }}>
                    {m.id}{" "}
                    {selected && (
                      <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.9, fontWeight: 950 }}>
                        SELECTED
                      </span>
                    )}
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

      {/* PLAYERS CAROUSEL */}
      <Section title={t("config.players", "Joueurs")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
            Sélection : {selectedIds.length}/{maxPlayers} — min {minPlayers}
          </div>
          <button className="btn-secondary" onClick={goProfiles}>
            + Profils
          </button>
        </div>

        {humanProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
            Aucun profil local. Crée des joueurs dans <b>Profils</b>.
          </p>
        ) : (
          <div
            className="dc-scroll-thin"
            style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 12, paddingLeft: 8 }}
          >
            {humanProfiles.map((p: any) => {
              const active = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  role="button"
                  onClick={() => togglePlayer(p.id)}
                  style={{
                    minWidth: 122,
                    maxWidth: 122,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    flexShrink: 0,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: "50%",
                      overflow: "hidden",
                      boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                      background: active
                        ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})`
                        : "#111320",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        overflow: "hidden",
                        filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                        opacity: active ? 1 : 0.6,
                        transition: "filter .2s ease, opacity .2s ease",
                      }}
                    >
                      <ProfileAvatar profile={p as any} size={78} />
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
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

                  {/* CHOIX TEAMS (only when teamSize>1 and selected) */}
                  {teamSize > 1 && active && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                      {Array.from({ length: Math.max(2, Math.floor(selectedIds.length / teamSize) || 2) }, (_, i) => i).map(
                        (te) => {
                          const sel = teamsById[p.id] === te;
                          return (
                            <button
                              key={te}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTeamsById((prev) => ({ ...prev, [p.id]: te }));
                              }}
                              style={{
                                padding: "4px 7px",
                                borderRadius: 999,
                                border: sel ? `1px solid ${primary}88` : "1px solid rgba(255,255,255,0.12)",
                                background: sel ? primarySoft : "rgba(0,0,0,0.18)",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                              title={`Team ${te + 1}`}
                            >
                              T{te + 1}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Teams mode selector */}
        <div style={{ marginTop: 8 }}>
          <OptionRow label="Mode équipes">
            <OptionSelect
              value={teamSize}
              options={[
                { value: 1, label: "Solo" },
                { value: 2, label: "2 v 2" },
                { value: 3, label: "3 v 3" },
              ]}
              onChange={(v: any) => setTeamSize(clampTeamSize(v))}
            />
          </OptionRow>
          {teamSize > 1 && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
              CHOIX TEAMS : assigne chaque participant à une team. Chaque team doit avoir exactement {teamSize} joueurs.
            </div>
          )}
        </div>

        {/* Bots */}
        <div style={{ marginTop: 12, borderRadius: 16, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.10)" }}>
          <OptionRow label="Bots IA">
            <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
          </OptionRow>

          {botsEnabled && (
            <>
              <OptionRow label="Difficulté IA">
                <OptionSelect
                  value={botLevel}
                  options={[
                    { value: "easy", label: "Easy" },
                    { value: "normal", label: "Normal" },
                    { value: "hard", label: "Hard" },
                  ]}
                  onChange={setBotLevel}
                />
              </OptionRow>

              {userBots.length > 0 ? (
                <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 10 }}>
                  {userBots.map((b) => {
                    const active = selectedIds.includes(b.id);
                    const fakeProfile = botToFakeProfile(b);
                    return (
                      <div
                        key={b.id}
                        role="button"
                        onClick={() => togglePlayer(b.id)}
                        style={{
                          minWidth: 122,
                          maxWidth: 122,
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 7,
                          flexShrink: 0,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            width: 78,
                            height: 78,
                            borderRadius: "50%",
                            overflow: "hidden",
                            boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                            background: active
                              ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})`
                              : "#111320",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              overflow: "hidden",
                              filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                              opacity: active ? 1 : 0.6,
                              transition: "filter .2s ease, opacity .2s ease",
                            }}
                          >
                            <ProfileAvatar profile={fakeProfile} size={78} showStars={false} />
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            color: active ? "#f6f2e9" : "#7e8299",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.name}
                        </div>

                        {teamSize > 1 && active && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                            {Array.from({ length: Math.max(2, Math.floor(selectedIds.length / teamSize) || 2) }, (_, i) => i).map(
                              (te) => {
                                const sel = teamsById[b.id] === te;
                                return (
                                  <button
                                    key={te}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTeamsById((prev) => ({ ...prev, [b.id]: te }));
                                    }}
                                    style={{
                                      padding: "4px 7px",
                                      borderRadius: 999,
                                      border: sel ? `1px solid ${primary}88` : "1px solid rgba(255,255,255,0.12)",
                                      background: sel ? primarySoft : "rgba(0,0,0,0.18)",
                                      color: "#fff",
                                      fontSize: 11,
                                      fontWeight: 950,
                                    }}
                                    title={`Team ${te + 1}`}
                                  >
                                    T{te + 1}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 8 }}>
                  Aucun bot personnalisé trouvé (dc_bots_v1).
                </div>
              )}
            </>
          )}
        </div>

        {!selectionValid && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
            Sélection / teams non valides : ajuste le nombre de joueurs et les teams.
          </div>
        )}
      </Section>

      {/* Rules */}
      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
        </OptionRow>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start} disabled={!selectionValid}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
