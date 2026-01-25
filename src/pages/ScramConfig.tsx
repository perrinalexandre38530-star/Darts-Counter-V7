import React, { useEffect, useMemo, useState } from "react";
import type { Store, Profile } from "../lib/types";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerScram from "../assets/tickers/ticker_scram.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type BotLevel = "easy" | "normal" | "hard";

export type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: any | null;
  avatarUrl?: any | null;
  isBot?: boolean;
  botLevel?: BotLevel;
};

export type ScramConfigPayload = {
  players: number;            // compat
  playersList?: PlayerLite[]; // PRO
  botsEnabled: boolean;
  botLevel: BotLevel;

  /** Objectif de points en phase SCRAM (0 = pas d'objectif) */
  objectivePoints: number;

  /** Cap de rounds (0 = illimité) */
  roundCap: number;
};

const INFO_TEXT = `SCRAM — règles (PRO)

Phase 1 — RACE (fermeture)
- Les cibles sont : 20, 19, 18, 17, 16, 15 et BULL.
- Chaque équipe doit "fermer" toutes les cibles (3 hits par cible).

Phase 2 — SCRAM (points)
- Quand une équipe a fermé TOUTES les cibles, elle passe en phase SCRAM.
- Elle marque des points en touchant des cibles que l’équipe adverse N’A PAS fermées.
- Objectif optionnel : atteindre X points en phase SCRAM.

Équipes
- 2 à 8 joueurs : répartis automatiquement en TEAM A / TEAM B (alternance).`;

function loadUserBots(): PlayerLite[] {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? "BOT"),
        avatarDataUrl: b?.avatarDataUrl ?? b?.avatarUrl ?? null,
        avatarUrl: b?.avatarUrl ?? null,
        isBot: true,
        botLevel: (b?.botLevel as BotLevel) || "normal",
      }))
      .filter((b: any) => b.id && b.name);
  } catch {
    return [];
  }
}


function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  return false;
}

function botToFakeProfile(b: PlayerLite, forcedLevel?: BotLevel) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: (b as any).avatarDataUrl ?? (b as any).avatarUrl ?? null,
    avatarUrl: (b as any).avatarUrl ?? null,
    isBot: true,
    botLevel: (forcedLevel ?? b.botLevel ?? "normal") as BotLevel,
  } as any;
}

export default function ScramConfig(props: { store?: Store; go?: any; setTab?: any }) {
  const { t } = useLang();
  const theme = useTheme();

  const primary = (theme as any)?.primary ?? "#7dffca";
  const cardBg = "rgba(0,0,0,0.30)";

  const storeProfiles: PlayerLite[] = useMemo(() => {
    const ps = (props?.store as any)?.profiles as Profile[] | undefined;
    if (!ps || !Array.isArray(ps)) return [];
    return ps.map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? null,
      avatarUrl: (p as any).avatarUrl ?? null,
      isBot: (p as any).isBot ?? false,
      botLevel: (p as any).botLevel ?? "normal",
    }));
  }, [props?.store]);

  const userBots = useMemo(() => loadUserBots(), []);

  const humanProfiles = useMemo(() => storeProfiles.filter((p) => !isBotLike(p)), [storeProfiles]);
  const botsFromStore = useMemo(() => storeProfiles.filter((p) => isBotLike(p)), [storeProfiles]);

  const mergedBots = useMemo(() => {
    const byId = new Map<string, PlayerLite>();
    [...botsFromStore, ...userBots].forEach((b) => {
      if (!b?.id) return;
      if (byId.has(b.id)) return;
      byId.set(b.id, { ...b, isBot: true });
    });
    return Array.from(byId.values());
  }, [botsFromStore, userBots]);

  const available = useMemo(() => {
    const byId = new Map<string, PlayerLite>();
    [...humanProfiles, ...mergedBots].forEach((p) => {
      if (!p?.id) return;
      if (byId.has(p.id)) return;
      byId.set(p.id, p);
    });
    return Array.from(byId.values());
  }, [humanProfiles, mergedBots]);

  const defaultIds = useMemo(() => available.slice(0, 2).map((p) => p.id), [available]);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);

  useEffect(() => {
    if (!available.length) return;
    setSelectedIds((prev) => {
      if (prev && prev.length >= 2) return prev;
      const next = available.slice(0, 2).map((p) => p.id);
      return next.length ? next : prev;
    });
  }, [available]);

  const selectedPlayers = useMemo(() => {
    const map = new Map(available.map((p) => [p.id, p] as const));
    const list = selectedIds.map((id) => map.get(id)).filter(Boolean) as PlayerLite[];
    if (!list.length) return [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];
    if (list.length === 1) return [list[0], { id: "p2", name: "Joueur 2" }];
    return list;
  }, [available, selectedIds]);

  const playersCount = Math.max(2, Math.min(8, selectedPlayers.length));

  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");

  // If bots disabled, remove bots from selection
  useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(mergedBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
  }, [botsEnabled, mergedBots]);

  const [objectivePoints, setObjectivePoints] = useState(200);
  const [roundCap, setRoundCap] = useState(0);

  const payload: ScramConfigPayload = useMemo(
    () => ({
      players: playersCount,
      playersList: selectedPlayers.slice(0, playersCount),
      botsEnabled,
      botLevel,
      objectivePoints,
      roundCap,
    }),
    [playersCount, selectedPlayers, botsEnabled, botLevel, objectivePoints, roundCap]
  );

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    if (props?.go) return props.go("games");
    window.history.back();
  }

  function start() {
    if (props?.setTab) return props.setTab("scram_play", { config: payload });
    if (props?.go) return props.go("scram_play", { config: payload });
  }

  const pillStyle: React.CSSProperties = {
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.25)",
    padding: "10px 12px",
  };

  return (
    <div className="page">
      <PageHeader
        title="SCRAM"
        tickerSrc={tickerScram}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles SCRAM" content={INFO_TEXT} />}
      />

      
<Section title={t("config.players", "Joueurs")}>
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
    <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
      Sélection : {selectedIds.length}/8 — min 2
    </div>
  </div>

  {/* Profils locaux (humains) */}
  {humanProfiles.length === 0 ? (
    <p style={{ fontSize: 11, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
      Aucun profil local. Tu peux créer des joueurs dans <b>Profils</b>.
    </p>
  ) : (
    <div
      className="dc-scroll-thin"
      style={{
        display: "flex",
        gap: 18,
        overflowX: "auto",
        paddingBottom: 10,
        marginTop: 12,
        paddingLeft: 8,
      }}
    >
      {humanProfiles.map((p: any) => {
        const active = selectedIds.includes(p.id);
        return (
          <div
            key={p.id}
            style={{
              minWidth: 122,
              maxWidth: 122,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            <div
              role="button"
              onClick={() =>
                setSelectedIds((prev) => {
                  const exists = prev.includes(p.id);
                  if (exists) {
                    if (prev.length <= 2) return prev;
                    return prev.filter((x) => x !== p.id);
                  }
                  if (prev.length >= 8) return prev;
                  return [...prev, p.id];
                })
              }
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                overflow: "hidden",
                boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={active ? "Cliquer pour retirer" : "Cliquer pour ajouter"}
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
          </div>
        );
      })}
    </div>
  )}

  {/* Bots toggle + niveau */}
  <div style={{ marginTop: 6 }}>
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
  </div>

  {/* Bots IA */}
  {botsEnabled && (
    <div
      style={{
        marginTop: 10,
        borderRadius: 16,
        padding: 12,
        background: cardBg,
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>Bots : {mergedBots.length}</div>

      {mergedBots.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 8 }}>
          Aucun bot trouvé. Crée des bots dans <b>Profils</b> ou via le stockage <b>dc_bots_v1</b>.
        </div>
      ) : (
        <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 10 }}>
          {mergedBots.map((b) => {
            const active = selectedIds.includes(b.id);
            const fakeProfile = botToFakeProfile(b, botLevel);
            return (
              <div
                key={b.id}
                style={{
                  minWidth: 122,
                  maxWidth: 122,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                <div
                  role="button"
                  onClick={() =>
                    setSelectedIds((prev) => {
                      const exists = prev.includes(b.id);
                      if (exists) {
                        if (prev.length <= 2) return prev;
                        return prev.filter((x) => x !== b.id);
                      }
                      if (prev.length >= 8) return prev;
                      return [...prev, b.id];
                    })
                  }
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: "50%",
                    overflow: "hidden",
                    boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                    background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title={active ? "Cliquer pour retirer" : "Cliquer pour ajouter"}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}
</Section>

      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("scram.objectivePoints", "Objectif points (phase SCRAM)")}>
          <OptionSelect value={objectivePoints} options={[0, 50, 100, 150, 200, 300, 500]} onChange={setObjectivePoints} />
        </OptionRow>

        <OptionRow label={t("scram.roundCap", "Cap de rounds (0 = illimité)")}>
          <OptionSelect value={roundCap} options={[0, 5, 8, 10, 12, 15, 20]} onChange={setRoundCap} />
        </OptionRow>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start} disabled={selectedIds.length < 2}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
