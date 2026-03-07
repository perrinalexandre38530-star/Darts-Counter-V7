// =============================================================
// src/pages/GolfConfig.tsx
// GOLF (Darts) — Config PRO (UX alignée sur DepartementsConfig / X01Config)
// - Carrousel Profils (humains) toujours visible
// - Carrousel Bots IA visible si toggle activé
// - Bots = PRO_BOTS + bots custom (localStorage dc_bots_v1)
// - Sélection via click (selectedIds)
// - Mode TEAMS: GOLD / PINK / BLUE / GREEN (2 à 4 équipes, 3 possible)
//   + assignation manuelle ou auto (round-robin)
//   + équipes déséquilibrées autorisées (5/7 joueurs, etc.)
// - Ordre de départ: Chronologique ou Aléatoire (joueurs ou équipes)
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

// ✅ Logos teams (déjà présents dans le projet)
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import teamBlueLogo from "../ui_assets/teams/team_blue.png";
import teamGreenLogo from "../ui_assets/teams/team_green.png";

// ✅ Avatars PRO bots (assets locaux)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";

type BotLevel = "easy" | "normal" | "hard";
type HoleOrderMode = "chronological" | "random";
type GolfScoringMode = "strokes" | "points";
type StartOrderMode = "chronological" | "random";
type TeamKey = "gold" | "pink" | "blue" | "green";

export type GolfConfigPayload = {
  players: number;
  selectedIds: string[];
  holes: 9 | 18;

  teamsEnabled: boolean;
  teamCount?: 2 | 3 | 4;
  teamAssignments?: Record<string, TeamKey>;

  botsEnabled: boolean;
  botLevel: BotLevel;

  missStrokes: 4 | 5 | 6 | 7 | 8;
  holeOrderMode: HoleOrderMode;
  scoringMode: GolfScoringMode;

  // ✅ ordre de départ (joueurs ou équipes)
  startOrderMode: StartOrderMode;

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

const TEAM_META: Record<TeamKey, { label: string; color: string; logo: string }> = {
  gold: { label: "TEAM GOLD", color: "#ffcf57", logo: teamGoldLogo },
  pink: { label: "TEAM PINK", color: "#ff7ac8", logo: teamPinkLogo },
  blue: { label: "TEAM BLUE", color: "#6bb7ff", logo: teamBlueLogo },
  green: { label: "TEAM GREEN", color: "#7fe2a9", logo: teamGreenLogo },
};

const TEAM_KEYS_ALL: TeamKey[] = ["gold", "pink", "blue", "green"];


function TeamPillButton({
  label,
  color,
  active,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 999,
        border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
        background: active ? `linear-gradient(180deg, ${color}33, rgba(0,0,0,0.22))` : "rgba(0,0,0,0.18)",
        color: active ? color : "rgba(255,255,255,0.85)",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.4,
        boxShadow: active ? `0 0 18px ${color}26` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

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

function normalizeTeamCount(n: any): 2 | 3 | 4 {
  const v = Number(n);
  if (v === 3) return 3;
  if (v >= 4) return 4;
  return 2;
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
  const cardBg = "radial-gradient(120% 160% at 0% 0%, rgba(125,255,202,0.14), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.34))";

  const [teamsEnabled, setTeamsEnabled] = React.useState(false);
  const [teamCount, setTeamCount] = React.useState<2 | 3 | 4>(2);
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamKey>>({});

  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [holes, setHoles] = React.useState<9 | 18>(9);
  const [holeOrderMode, setHoleOrderMode] = React.useState<HoleOrderMode>("chronological");
  const [scoringMode, setScoringMode] = React.useState<GolfScoringMode>("strokes");
  const [missStrokes, setMissStrokes] = React.useState<4 | 5 | 6 | 7 | 8>(5);
  const [showHoleGrid, setShowHoleGrid] = React.useState(true);

  // ✅ ordre de départ (joueurs ou équipes)
  const [startOrderMode, setStartOrderMode] = React.useState<StartOrderMode>("chronological");

  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    const custom = readUserBotsFromLS();
    const m = new Map<string, BotLite>();
    for (const b of PRO_BOTS) m.set(b.id, b);
    for (const b of custom) m.set(b.id, b);
    setUserBots(Array.from(m.values()));
  }, []);

  // Load config LS
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CFG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 8);
      }
    } catch {}
    return humanProfiles.slice(0, 2).map((p) => String(p.id));
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CFG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      setTeamsEnabled(!!parsed?.teamsEnabled);
      setTeamCount(normalizeTeamCount(parsed?.teamCount ?? 2));
      setTeamAssignments((parsed?.teamAssignments && typeof parsed.teamAssignments === "object") ? parsed.teamAssignments : {});

      setBotsEnabled(!!parsed?.botsEnabled);
      setBotLevel((parsed?.botLevel === "easy" || parsed?.botLevel === "hard" || parsed?.botLevel === "normal") ? parsed.botLevel : "normal");

      setHoles(Number(parsed?.holes) === 18 ? 18 : 9);
      setHoleOrderMode(parsed?.holeOrderMode === "random" ? "random" : "chronological");
      setScoringMode(parsed?.scoringMode === "points" ? "points" : "strokes");
      setMissStrokes((Number(parsed?.missStrokes) === 4 ? 4 : Number(parsed?.missStrokes) === 5 ? 5 : Number(parsed?.missStrokes) === 6 ? 6 : Number(parsed?.missStrokes) === 7 ? 7 : Number(parsed?.missStrokes) === 8 ? 8 : 5) as any);
      setShowHoleGrid(parsed?.showHoleGrid !== false);

      setStartOrderMode(parsed?.startOrderMode === "random" ? "random" : "chronological");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  React.useEffect(() => {
    try {
      localStorage.setItem(
        LS_CFG_KEY,
        JSON.stringify({
          selectedIds,

          teamsEnabled,
          teamCount,
          teamAssignments,

          botsEnabled,
          botLevel,

          holes,
          holeOrderMode,
          scoringMode,
          missStrokes,

          startOrderMode,

          showHoleGrid,
        })
      );
    } catch {}
  }, [
    selectedIds,
    teamsEnabled,
    teamCount,
    teamAssignments,
    botsEnabled,
    botLevel,
    holes,
    holeOrderMode,
    scoringMode,
    missStrokes,
    startOrderMode,
    showHoleGrid,
  ]);

  // Si bots désactivés: retirer ids bots
  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(userBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
  }, [botsEnabled, userBots]);

  // Nettoyage assignments quand roster change + auto fallback round-robin
  React.useEffect(() => {
    if (!teamsEnabled) return;

    const keys = TEAM_KEYS_ALL.slice(0, teamCount);
    setTeamAssignments((prev) => {
      const next: Record<string, TeamKey> = {};
      let rr = 0;
      for (const id of selectedIds) {
        const assigned = prev[id];
        const valid = assigned && keys.includes(assigned);
        next[id] = (valid ? assigned : keys[rr % keys.length]) as TeamKey;
        rr++;
      }
      return next;
    });
  }, [teamsEnabled, teamCount, selectedIds]);

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
      teamCount: teamsEnabled ? teamCount : undefined,
      teamAssignments: teamsEnabled ? teamAssignments : undefined,

      botsEnabled,
      botLevel,

      missStrokes,
      holeOrderMode,
      scoringMode,

      startOrderMode,

      showHoleGrid,
    };

    const go = (props as any)?.go ?? (props as any)?.params?.go;
    if (typeof go === "function") {
      go("golf_play", { config: payload });
      return;
    }
    const setTab = (props as any)?.setTab;
    if (typeof setTab === "function") {
      setTab("golf_play", { config: payload });
    }
  }

  // canStart : min 2 joueurs, et en teams => min 2 équipes non vides
  const enabledKeys = TEAM_KEYS_ALL.slice(0, teamCount);
  const teamNonEmptyCount = React.useMemo(() => {
    if (!teamsEnabled) return 0;
    const counts: Record<string, number> = {};
    enabledKeys.forEach((k) => (counts[k] = 0));
    selectedIds.forEach((id, idx) => {
      const k = teamAssignments[id] ?? enabledKeys[idx % enabledKeys.length];
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.values(counts).filter((n) => n > 0).length;
  }, [teamsEnabled, enabledKeys, selectedIds, teamAssignments]);

  const canStart = selectedIds.length >= 2 && (!teamsEnabled || teamNonEmptyCount >= 2);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <PageHeader
        title="GOLF"
        left={<BackDot onClick={() => (props as any)?.go?.("games") || (props as any)?.setTab?.("games")} />}
        right={
          <InfoDot
            title="GOLF"
            content={
              "Règles GOLF (darts)\n\n- Partie en 9 ou 18 trous.\n- Ordre des trous: Chronologique ou Aléatoire.\n- Chaque tour: jusqu’à 3 flèches.\n- Le score du trou dépend du dernier tir validé.\n- Total bas = vainqueur (Strokes) ou total haut = vainqueur (Points)."
            }
          />
        }
        tickerSrc={tickerGolf}
      />

      <div style={{ padding: 12, paddingTop: 10 }}>
        {/* HERO banner (style X01/Killer) */}
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.38)",
            marginBottom: 14,
            position: "relative",
            height: 86,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${tickerGolf})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(1.12) contrast(1.08)",
              opacity: 0.85,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.42) 42%, rgba(0,0,0,.84) 100%), radial-gradient(120% 140% at 0% 0%, rgba(125,255,202,.20), transparent 60%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: "12px 14px" }}>
            <div
              style={{
                fontWeight: 1000,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 10px 26px rgba(0,0,0,0.55)",
                fontSize: 16,
              }}
            >
              Configuration
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.26)",
                  color: primary,
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {holes} trous
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.26)",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {holeOrderMode === "random" ? "Trous aléatoires" : "Trous chronologiques"}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: teamsEnabled ? "rgba(255,207,87,0.12)" : "rgba(0,0,0,0.26)",
                  color: teamsEnabled ? "#ffcf57" : "rgba(255,255,255,0.75)",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {teamsEnabled ? `TEAMS (${teamCount})` : "SOLO"}
              </span>
            </div>
          </div>
        </div>

        <Section title={t("players") || "JOUEURS"}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              background: cardBg,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 14px 34px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
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
            <OptionRow label="Mode équipes (TEAMS)">
              <OptionToggle value={teamsEnabled} onChange={setTeamsEnabled} />
            </OptionRow>

            {teamsEnabled && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <OptionRow label="Nombre d'équipes" hint="2 à 4 (3 possible)">
                  <select
                    value={teamCount}
                    onChange={(e) => setTeamCount(normalizeTeamCount(e.target.value))}
                    style={{
                      height: 44,
                      borderRadius: 14,
                      padding: "0 14px",
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.22)",
                      color: "rgba(255,255,255,0.92)",
                      fontWeight: 900,
                      minWidth: 110,
                    }}
                  >
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </OptionRow>

                
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, opacity: 0.82 }}>Assignation</div>
                  <button
                    type="button"
                    onClick={() => {
                      const keys = TEAM_KEYS_ALL.slice(0, teamCount);
                      const next: Record<string, TeamKey> = {};
                      selectedIds.forEach((id, idx) => {
                        next[id] = keys[idx % keys.length] as TeamKey;
                      });
                      setTeamAssignments(next);
                    }}
                    style={{
                      height: 34,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.22)",
                      color: "rgba(255,255,255,0.90)",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Auto
                  </button>
                </div>


{/* ✅ Assignation type X01Config (avatar + nom dessous, 4 teams sur une ligne) */}
<div
  style={{
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }}
>
  {selectedIds.map((id, idx) => {
    const hp = humanProfiles.find((p) => String((p as any).id) === id);
    const bp = userBots.find((b) => String((b as any).id) === id);

    const name = (hp as any)?.name || (bp as any)?.name || "Joueur";
    const avatar =
      (hp as any)?.avatarDataUrl ||
      (hp as any)?.avatarUrl ||
      (bp as any)?.avatarDataUrl ||
      null;

    const availableKeys = TEAM_KEYS_ALL.slice(0, teamCount);
    const fallbackKey = availableKeys[idx % Math.max(1, availableKeys.length)] || "gold";
    const current = (teamAssignments[id] ?? fallbackKey) as TeamKey;

    return (
      <div
        key={id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.18))",
        }}
      >
        {/* Col joueur (avatar + nom dessous) */}
        <div
          style={{
            width: 92,
            flex: "0 0 92px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              boxShadow: "0 0 0 4px rgba(0,0,0,0.28)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {avatar ? (
              <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontWeight: 1000, opacity: 0.78 }}>{String(name).slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div
            title={name}
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: "rgba(255,255,255,0.92)",
              textAlign: "center",
              lineHeight: 1.1,
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
        </div>

        {/* Col équipes (4 pills, style X01Config) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
              alignItems: "center",
            }}
          >
            {TEAM_KEYS_ALL.map((k) => {
              const m = TEAM_META[k];
              const disabled = !availableKeys.includes(k);
              return (
                <TeamPillButton
                  key={k}
                  label={m.short}
                  color={m.color}
                  active={current === k}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setTeamAssignments((prev) => ({ ...prev, [id]: k }));
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  })}
</div>{teamNonEmptyCount < 2 && (
                  <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginTop: 4 }}>
                    ⚠️ Il faut au moins 2 équipes non vides pour lancer une partie TEAMS.
                  </div>
                )}
              </div>
            )}

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
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 14px 34px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
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

            <OptionRow label="Ordre de départ" hint={teamsEnabled ? "Équipes" : "Joueurs"}>
              <OptionSelect
                value={startOrderMode}
                options={[
                  { value: "chronological", label: "Chronologique" },
                  { value: "random", label: "Aléatoire" },
                ]}
                onChange={(v: any) => setStartOrderMode(v === "random" ? "random" : "chronological")}
              />
            </OptionRow>

            <OptionRow label="Mode de scoring" hint={scoringMode === "strokes" ? "Score bas gagne" : "Score haut gagne"}>
              <OptionSelect
                value={scoringMode}
                options={[
                  { value: "strokes", label: "Strokes" },
                  { value: "points", label: "Points" },
                ]}
                onChange={(v: any) => setScoringMode(v === "points" ? "points" : "strokes")}
              />
            </OptionRow>

            <OptionRow label="Pénalité (miss)">
              <OptionSelect
                value={missStrokes}
                options={[4, 5, 6, 7, 8].map((v) => ({ value: v, label: String(v) }))}
                onChange={(v: any) => setMissStrokes(((Number(v) as any) || 5) as any)}
              />
            </OptionRow>

            <OptionRow label="Afficher la grille des trous">
              <OptionToggle value={showHoleGrid} onChange={setShowHoleGrid} />
            </OptionRow>
          </div>
        </Section>

        {/* CTA collée au-dessus de la barre de nav (même design que X01/Killer) */}
        <div style={{ height: 96 }} />
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 999,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: "uppercase",
                background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
                color: canStart ? "#151515" : "#2b2b52",
                boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
                opacity: canStart ? 1 : 0.6,
                cursor: canStart ? "pointer" : "default",
              }}
            >
              {t("x01v3.start", "Lancer la partie")}
            </button>
            {!canStart && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontWeight: 900, textAlign: "center" }}>
                {teamsEnabled
                  ? "Sélectionne au moins 2 joueurs, et au moins 2 équipes non vides."
                  : "Sélectionne au moins 2 joueurs (humains et/ou bots)."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
