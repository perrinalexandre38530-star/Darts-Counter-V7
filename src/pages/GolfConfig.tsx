// =============================================================
// src/pages/GolfConfig.tsx
// GOLF (Darts) — Config PRO (UX alignée sur DepartementsConfig / X01Config)
// - Carrousel Profils (humains) toujours visible
// - Carrousel Bots IA visible si toggle activé
// - Bots = PRO_BOTS + bots custom (localStorage dc_bots_v1)
// - Sélection via click (selectedIds)
// =============================================================

import React from "react";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";

import tickerGolf from "../assets/tickers/ticker_golf.png";

// ✅ Avatars PRO bots (assets locaux)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";

type BotLevel = "easy" | "normal" | "hard";
type HoleOrderMode = "chronological" | "random";
type GolfScoringMode = "strokes" | "points";

export type GolfConfigPayload = {
  players: number;
  selectedIds: string[];
  holes: 9 | 18;
  teamsEnabled: boolean;
  botsEnabled: boolean;
  botLevel: BotLevel;
  missStrokes: 4 | 5 | 6;
  holeOrderMode: HoleOrderMode;
  scoringMode: GolfScoringMode;
  showHoleGrid: boolean;
};

const LS_CFG_KEY = "dc_modecfg_golf";
const LS_BOTS_KEY = "dc_bots_v1";

type BotLite = { id: string; name: string; avatarDataUrl: string | null; botLevel?: string };

const PRO_BOTS: BotLite[] = [
  { id: "pro_green_machine", name: "Green Machine", avatarDataUrl: avatarGreenMachine, botLevel: "hard" },
  { id: "pro_snake_king", name: "Snake King", avatarDataUrl: avatarSnakeKing, botLevel: "hard" },
  { id: "pro_wonder_kid", name: "Wonder Kid", avatarDataUrl: avatarWonderKid, botLevel: "hard" },
  { id: "pro_ice_man", name: "Ice Man", avatarDataUrl: avatarIceMan, botLevel: "hard" },
];

function readUserBotsFromLS(): BotLite[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((b) => ({
        id: String(b.id),
        name: b.name || "BOT",
        avatarDataUrl: b.avatarDataUrl ?? null,
        botLevel: b.botLevel ?? b.levelLabel ?? b.levelName ?? b.performanceLevel ?? b.difficulty ?? "",
      }))
      .filter((b) => !!b.id);
  } catch {
    return [];
  }
}

function botToFakeProfile(b: BotLite) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: b.avatarDataUrl,
    isBot: true,
    botLevel: b.botLevel || "",
  } as any;
}

function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  return false;
}

export default function GolfConfig(props: any) {
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
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const humanProfiles = storeProfiles.filter((p) => !isBotLike(p));

  const primary = (theme as any)?.primary ?? "#7dffca";
  const cardBg = "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))";

  const [teamsEnabled, setTeamsEnabled] = React.useState(false);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [holes, setHoles] = React.useState<9 | 18>(9);
  const [holeOrderMode, setHoleOrderMode] = React.useState<HoleOrderMode>("chronological");
  const [scoringMode, setScoringMode] = React.useState<GolfScoringMode>("strokes");
  const [missStrokes, setMissStrokes] = React.useState<4 | 5 | 6>(4);
  const [showHoleGrid, setShowHoleGrid] = React.useState(true);

  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    const custom = readUserBotsFromLS();
    const m = new Map<string, BotLite>();
    for (const b of PRO_BOTS) m.set(b.id, b);
    for (const b of custom) m.set(b.id, b);
    setUserBots(Array.from(m.values()));
  }, []);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CFG_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 8);
    } catch {}
    return humanProfiles.slice(0, 2).map((p) => String(p.id));
  });

  // persist
  React.useEffect(() => {
    try {
      localStorage.setItem(
        LS_CFG_KEY,
        JSON.stringify({
          selectedIds,
          teamsEnabled,
          botsEnabled,
          botLevel,
          holes,
          holeOrderMode,
          scoringMode,
          missStrokes,
          showHoleGrid,
        })
      );
    } catch {}
  }, [selectedIds, teamsEnabled, botsEnabled, botLevel, holes, holeOrderMode, scoringMode, missStrokes, showHoleGrid]);

  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(userBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
  }, [botsEnabled, userBots]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }

  function onStart() {
    const payload: GolfConfigPayload = {
      players: selectedIds.length,
      selectedIds,
      holes,
      teamsEnabled,
      botsEnabled,
      botLevel,
      missStrokes,
      holeOrderMode,
      scoringMode,
      showHoleGrid,
    };

    const go = (props as any)?.go ?? (props as any)?.params?.go;
    if (typeof go === "function") {
      go("golf.play", payload);
      return;
    }
    const setTab = (props as any)?.setTab;
    if (typeof setTab === "function") {
      setTab("golf.play", payload);
    }
  }

  const canStart = selectedIds.length >= 2;

  return (
    <div style={{ minHeight: "100dvh" }}>
      <PageHeader
        title="GOLF"
        left={<BackDot onClick={() => (props as any)?.go?.("games") || (props as any)?.setTab?.("games")} />}
        right={
          <InfoDot
            title="GOLF"
            body={
              "Chaque trou = cible N (1..9/18). Chaque joueur lance 3 flèches: score du trou = nombre de coups (strokes) ou points. Pénalité si aucun hit. Le total le plus bas gagne (mode strokes)."
            }
          />
        }
        ticker={tickerGolf}
      />

      <div style={{ padding: 12, paddingTop: 10 }}>
        <Section title={t("players") || "JOUEURS"}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              background: cardBg,
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, marginBottom: 8 }}>
              Sélection : {selectedIds.length}/8 — min 2
            </div>

            {/* Profils humains */}
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10 }}>
              {humanProfiles.map((p) => {
                const id = String(p.id);
                const active = selectedIds.includes(id);
                return (
                  <div
                    key={id}
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
                      onClick={() => togglePlayer(id)}
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
                        cursor: "pointer",
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
                        <ProfileAvatar profile={p} size={78} showStars={false} />
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
                      {p.name || "Joueur"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toggles */}
            <OptionRow label="Mode équipes (A/B)">
              <OptionToggle value={teamsEnabled} onChange={setTeamsEnabled} />
            </OptionRow>

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

                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, marginTop: 8 }}>
                  Bots : {userBots.length}
                </div>

                {userBots.length > 0 && (
                  <div
                    className="dc-scroll-thin"
                    style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 10 }}
                  >
                    {userBots.map((b) => {
                      const active = selectedIds.includes(b.id);
                      const fakeProfile = botToFakeProfile(b);
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
                            onClick={() => togglePlayer(b.id)}
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
                              cursor: "pointer",
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </Section>

        <Section title="RÈGLES">
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              background: cardBg,
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <OptionRow label="Nombre de trous">
              <OptionSelect
                value={holes}
                options={[
                  { value: 9, label: "9" },
                  { value: 18, label: "18" },
                ]}
                onChange={(v: any) => setHoles(Number(v) === 18 ? 18 : 9)}
              />
            </OptionRow>

            <OptionRow label="Ordre des trous">
              <OptionSelect
                value={holeOrderMode}
                options={[
                  { value: "chronological", label: "Chronologique" },
                  { value: "random", label: "Aléatoire" },
                ]}
                onChange={(v: any) => setHoleOrderMode(v === "random" ? "random" : "chronological")}
              />
            </OptionRow>

            <OptionRow label="Mode de scoring">
              <OptionSelect
                value={scoringMode}
                options={[
                  { value: "strokes", label: "Strokes (score bas gagne)" },
                  { value: "points", label: "Points (score haut gagne)" },
                ]}
                onChange={(v: any) => setScoringMode(v === "points" ? "points" : "strokes")}
              />
            </OptionRow>

            <OptionRow label="Pénalité si aucun hit">
              <OptionSelect
                value={missStrokes}
                options={[4, 5, 6].map((v) => ({ value: v, label: String(v) }))}
                onChange={(v: any) => setMissStrokes((Number(v) as any) || 4)}
              />
            </OptionRow>

            <OptionRow label="Afficher la grille des trous">
              <OptionToggle value={showHoleGrid} onChange={setShowHoleGrid} />
            </OptionRow>
          </div>
        </Section>

        <div style={{ padding: 12, paddingTop: 4 }}>
          <button className="btn-primary" disabled={!canStart} onClick={onStart} style={{ width: "100%" }}>
            {t("start") || "Démarrer la partie"}
          </button>
          {!canStart && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, fontWeight: 900, textAlign: "center" }}>
              Sélectionne au moins 2 joueurs (humains et/ou bots).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
