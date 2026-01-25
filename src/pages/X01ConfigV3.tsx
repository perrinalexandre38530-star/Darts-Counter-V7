// @ts-nocheck
// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 — style "Cricket params" + gestion d'équipes
// + Sélection de BOTS IA créés dans Profils (LS "dc_bots_v1")
// + Intégration de BOTS IA "pro" prédéfinis (Green Machine, Snake King…)
// + NEW : audio config (Sons Arcade / Bruitages / Voix IA + voix sélection)
// + NEW : Comptage externe (vidéo / bridge) + bouton "i" explicatif (tuto + tests)
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import tickerX01 from "../assets/tickers/ticker_x01.png";
import {
  getDartSetsForProfile,
  getFavoriteDartSetForProfile,
  type DartSet,
} from "../lib/dartSetsStore";
import { x01EnsureAudioUnlocked, x01SfxV3Preload } from "../lib/x01SfxV3";
import { SCORE_INPUT_LS_KEY, type ScoreInputMethod } from "../lib/scoreInput/types";


// 🔽 IMPORTS DE TOUS LES AVATARS BOTS PRO
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

// UI-only: "multi" = plusieurs joueurs en mode classique (pas teams)
type MatchModeV3 = "solo" | "multi" | "teams";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";
type TeamId = "gold" | "pink" | "blue" | "green";

type Props = {
  profiles: Profile[];
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
  go?: (tab: any, params?: any) => void; // pour ouvrir "Créer BOT"
};

const START_SCORES: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
const LEGS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];
const SETS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];

const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};

const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f7c85c",
  pink: "#ff4fa2",
  blue: "#4fc3ff",
  green: "#6dff7c",
};

// Clé locale BOTS (même que Profils>Bots)
const LS_BOTS_KEY = "dc_bots_v1";

// ---------- Audio / voix ----------
type VoiceOption = { id: string; label: string };

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "default", label: "Défaut" },
  { id: "female", label: "Voix féminine" },
  { id: "male", label: "Voix masculine" },
  { id: "robot", label: "Voix robot" },
];

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string; // libellé ("Easy", "Standard", "Pro", "Légende", etc.)
};

// -------------------------------------------------------------
// PlayerDartBadge
// - Petit badge "jeu de fléchettes" sous un joueur X01
// - Affiche le nom du set (et mini visuel si dispo)
// - Chaque tap passe au set suivant (cycle)
// -------------------------------------------------------------
type PlayerDartBadgeProps = {
  profileId?: string | null;
  dartSetId?: string | null;
  onChange: (id: string | null) => void;
};

const PlayerDartBadge: React.FC<PlayerDartBadgeProps> = ({
  profileId,
  dartSetId,
  onChange,
}) => {
  const { theme, palette } = useTheme() as any;
  const { lang } = useLang() as any;
  const primary = (theme?.primary || palette?.primary || "#f5c35b") as string;

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [favorite, setFavorite] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    if (!profileId) {
      setSets([]);
      setFavorite(null);
      return;
    }
    const all = getDartSetsForProfile(profileId);
    setSets(all);
    setFavorite(getFavoriteDartSetForProfile(profileId) || null);
  }, [profileId]);

  if (!profileId || sets.length === 0) return null;

  const explicit = dartSetId ? sets.find((s) => s.id === dartSetId) || null : null;
  const current = explicit || favorite || sets[0];

  const handleClick = () => {
    if (!current) return;
    const idx = sets.findIndex((s) => s.id === current.id);
    const next = sets[(idx + 1) % sets.length];
    onChange(next?.id ?? null);
  };

  const labelBase =
    lang === "fr"
      ? "Jeu de fléchettes"
      : lang === "es"
      ? "Juego de dardos"
      : lang === "de"
      ? "Dart-Set"
      : "Dart set";

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        marginTop: 6,
        alignSelf: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.18)",
        background:
          "radial-gradient(circle at 0% 0%, rgba(245,195,91,.22), rgba(8,8,20,.96))",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "#fff",
        fontSize: 10,
        maxWidth: 180,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer",
      }}
      aria-label={labelBase}
      title={labelBase}
    >
      {(current as any)?.thumbImageUrl ? (
        <img
          src={(current as any).thumbImageUrl}
          alt=""
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: "0 0 6px rgba(0,0,0,.9)",
          }}
        />
      ) : (
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: (current as any)?.bgColor || "#050509",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            boxShadow: "0 0 6px rgba(0,0,0,.9)",
            border: `1px solid ${primary}cc`,
          }}
        >
          🎯
        </div>
      )}

      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {current?.name ?? "Set"}
      </span>
    </button>
  );
};

// ------------------------------------------------------
// BOTS IA "PRO" PRÉDÉFINIS
// ------------------------------------------------------
const PRO_BOTS: BotLite[] = [
  {
    id: "bot_pro_mvg",
    name: "Green Machine",
    botLevel: "Légende",
    avatarDataUrl: avatarGreenMachine,
  },
  {
    id: "bot_pro_wright",
    name: "Snake King",
    botLevel: "Pro",
    avatarDataUrl: avatarSnakeKing,
  },
  {
    id: "bot_pro_littler",
    name: "Wonder Kid",
    botLevel: "Prodige Pro",
    avatarDataUrl: avatarWonderKid,
  },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan },
  {
    id: "bot_pro_anderson",
    name: "Flying Scotsman",
    botLevel: "Pro",
    avatarDataUrl: avatarFlyingScotsman,
  },
  {
    id: "bot_pro_humphries",
    name: "Cool Hand",
    botLevel: "Pro",
    avatarDataUrl: avatarCoolHand,
  },
  {
    id: "bot_pro_taylor",
    name: "The Power",
    botLevel: "Légende",
    avatarDataUrl: avatarThePower,
  },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret },
];

export default function X01ConfigV3({ profiles, onBack, onStart, go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const [rulesOpen, setRulesOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Always land at the top when entering config screens
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try { window.scrollTo(0, 0); } catch {}
    }
    const el = contentRef.current;
    if (el) el.scrollTop = 0;
  }, []);


  const allProfiles: Profile[] = profiles ?? [];
  const humanProfiles = allProfiles.filter((p) => !(p as any).isBot);

  // ---- BOTS depuis localStorage (fallback si pas dans store.profiles) ----
  const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>([]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_BOTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];

      const mapped: BotLite[] = (parsed || []).map((b: any) => {
        const levelLabel: string =
          b.botLevel ??
          b.levelLabel ??
          b.levelName ??
          b.performanceLevel ??
          b.performance ??
          b.skill ??
          b.difficulty ??
          "";

        return {
          id: String(b.id),
          name: b.name || "BOT",
          avatarDataUrl: b.avatarDataUrl ?? null,
          botLevel: levelLabel,
        };
      });

      setBotsFromLS(mapped);
    } catch (e) {
      console.warn("[X01ConfigV3] load BOTS LS failed:", e);
    }
  }, []);

  // Bots créés dans le store (Profils) marqués isBot
  const userBotsFromStore: BotLite[] = React.useMemo(() => {
    return (allProfiles || [])
      .filter((p) => (p as any).isBot)
      .map((p: any) => ({
        id: p.id,
        name: p.name || "BOT",
        avatarDataUrl: p.avatarDataUrl ?? null,
        botLevel:
          p.botLevel ??
          p.levelLabel ??
          p.levelName ??
          p.performanceLevel ??
          p.performance ??
          p.skill ??
          p.difficulty ??
          "",
      }));
  }, [allProfiles]);

  // Base user bots = store ou LS
  const userBots: BotLite[] = React.useMemo(() => {
    if (userBotsFromStore.length > 0) return userBotsFromStore;
    return botsFromLS;
  }, [userBotsFromStore, botsFromLS]);

  // BOTS finaux = PRO + user
  const botProfiles: BotLite[] = React.useMemo(() => {
    return [...PRO_BOTS, ...userBots];
  }, [userBots]);

  // ---- état local des paramètres ----
  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<InModeV3>("simple");
  const [outMode, setOutMode] = React.useState<OutModeV3>("double");
  const [legsPerSet, setLegsPerSet] = React.useState<number>(3);
  const [setsToWin, setSetsToWin] = React.useState<number>(1);
  const [serveMode, setServeMode] = React.useState<ServiceModeV3>("alternate");
  const [matchMode, setMatchMode] = React.useState<MatchModeV3>("solo");

  // ---- NEW : AUDIO OPTIONS ----
  const [arcadeEnabled, setArcadeEnabled] = React.useState<boolean>(true);
  const [hitEnabled, setHitEnabled] = React.useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(true);
  const [voiceId, setVoiceId] = React.useState<string>("default");

  // ---- NEW : COMPTAGE EXTERNE ----
  const [externalScoringEnabled, setExternalScoringEnabled] = React.useState<boolean>(false);
  // ---- NEW : SAISIE VOCALE DES SCORES (MVP) ----
  const [voiceScoreEnabled, setVoiceScoreEnabled] = React.useState<boolean>(false);

  // ---- NEW : METHODE DE SAISIE (Keypad / Cible / Presets / Voice / Auto / IA) ----
  const [scoreInputMethod, setScoreInputMethod] = React.useState<ScoreInputMethod>(() => {
    try {
      const v = (localStorage.getItem(SCORE_INPUT_LS_KEY) || 'keypad') as ScoreInputMethod;
      if (v === 'keypad' || v === 'dartboard' || v === 'presets' || v === 'voice' || v === 'auto' || v === 'ai') return v;
    } catch {}
    return 'keypad';
  });

  const [externalInfoOpen, setExternalInfoOpen] = React.useState<boolean>(false);
  const [externalInfoStep, setExternalInfoStep] = React.useState<1 | 2 | 3>(1);

  // ✅ Helpers TEST : envoie des events vers X01PlayV3
  const dispatchExternalDart = React.useCallback((segment: number, multiplier: 1 | 2 | 3) => {
    try {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent("dc:x01v3:dart", { detail: { segment, multiplier } }));
    } catch (e) {
      console.warn("[X01ConfigV3] dispatchExternalDart failed", e);
    }
  }, []);

  const dispatchExternalVisit = React.useCallback(
    (darts: Array<{ segment: number; multiplier: 1 | 2 | 3 }>) => {
      try {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("dc:x01v3:visit", { detail: { darts: (darts || []).slice(0, 3) } })
        );
      } catch (e) {
        console.warn("[X01ConfigV3] dispatchExternalVisit failed", e);
      }
    },
    []
  );

  // évite d’écraser le choix manuel si on change de joueur sélectionné
  const voiceTouchedRef = React.useRef(false);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    if (humanProfiles.length >= 2) return [humanProfiles[0].id, humanProfiles[1].id];
    if (humanProfiles.length === 1) return [humanProfiles[0].id];
    return [];
  });

  // ⚙️ pré-remplit la voix depuis le 1er profil humain sélectionné (si dispo)
  React.useEffect(() => {
    if (voiceTouchedRef.current) return;

    const firstHumanSelectedId =
      selectedIds.find((id) => humanProfiles.some((p) => p.id === id)) ??
      humanProfiles[0]?.id ??
      null;

    if (!firstHumanSelectedId) return;

    const p: any = humanProfiles.find((x) => x.id === firstHumanSelectedId);
    if (!p) return;

    const candidate: string | undefined = p.ttsVoice ?? p.voiceId ?? p.voice ?? p.tts ?? undefined;
    if (candidate && typeof candidate === "string") setVoiceId(candidate);
  }, [selectedIds, humanProfiles]);

  // playerId -> teamId
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>({});

  // profileId -> dartSetId (ou null)
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>({});

  const handleChangePlayerDartSet = (profileId: string, dartSetId: string | null) => {
    setPlayerDartSets((prev) => ({ ...prev, [profileId]: dartSetId }));
  };

  // ---- helpers sélection joueurs (humains + bots) ----
  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];

      // nettoie l'affectation d'équipe si on retire un joueur
      setTeamAssignments((prevTeams) => {
        if (!exists) return prevTeams;
        const clone = { ...prevTeams };
        delete clone[id];
        return clone;
      });

      return next;
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((prev) => {
      const current = prev[playerId] ?? null;
      const next = { ...prev };
      next[playerId] = current === teamId ? null : teamId;
      return next;
    });
  }

  const totalPlayers = selectedIds.length;

  // ---- conditions pour pouvoir démarrer ----
  const canStart = React.useMemo(() => {
    if (totalPlayers === 0) return false;
    if (matchMode === "solo") return totalPlayers === 2;
    if (matchMode === "multi") return totalPlayers >= 2;
    return totalPlayers >= 4; // teams
  }, [totalPlayers, matchMode]);

  // ---- désactivation visuelle des modes impossibles ----
  const soloDisabled = totalPlayers !== 2;
  const multiDisabled = totalPlayers < 2;
  const teamsDisabled = totalPlayers < 4;

  // ---- validation mode équipes ----
  function validateTeams() {
    const teamBuckets: Record<TeamId, string[]> = { gold: [], pink: [], blue: [], green: [] };

    selectedIds.forEach((pid) => {
      const tId = teamAssignments[pid];
      if (tId) teamBuckets[tId].push(pid);
    });

    const usedTeams = (Object.keys(teamBuckets) as TeamId[]).filter((tid) => teamBuckets[tid].length > 0);

    if (usedTeams.length < 2) {
      alert(t("x01v3.teams.needTwoTeams", "Sélectionne au moins 2 équipes (Gold / Pink / Blue / Green)."));
      return null;
    }

    const sizes = Array.from(new Set(usedTeams.map((tid) => teamBuckets[tid].length))).filter((n) => n > 0);

    if (sizes.length !== 1) {
      alert(t("x01v3.teams.sameSize", "Toutes les équipes doivent avoir le même nombre de joueurs."));
      return null;
    }

    const size = sizes[0];
    const teamCount = usedTeams.length;

    const ok =
      (teamCount === 2 && (size === 2 || size === 3 || size === 4)) ||
      (teamCount === 3 && size === 2) ||
      (teamCount === 4 && size === 2);

    if (!ok) {
      alert(
        t(
          "x01v3.teams.invalidCombo",
          "Combinaisons autorisées : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
        )
      );
      return null;
    }

    return usedTeams.map((tid) => ({
      id: tid,
      name: TEAM_LABELS[tid],
      color: TEAM_COLORS[tid],
      players: teamBuckets[tid],
    }));
  }

  // ---- validation & lancement ----
  function handleStart() {
    if (!canStart) {
      if (totalPlayers === 0) {
        alert(t("x01v3.config.needPlayer", "Sélectionne au moins un joueur local ou un BOT IA."));
        return;
      }
      if (matchMode === "solo" && totalPlayers !== 2) {
        alert(t("x01v3.config.needTwoPlayersSolo", "En mode Solo (1v1), sélectionne exactement 2 joueurs."));
        return;
      }
      if (totalPlayers < 2) {
        alert(t("x01v3.config.needTwoPlayers", "Sélectionne au moins 2 joueurs pour ce mode."));
        return;
      }
    }


// 🔓 Audio: preload + unlock (clic utilisateur) -> permet l'intro & les SFX dès l'entrée en match
try {
  x01SfxV3Preload();
  x01EnsureAudioUnlocked();
} catch (e) {
  // ignore
}

    let teams: null | Array<{ id: TeamId; name: string; color: string; players: string[] }> = null;

    if (matchMode === "teams") {
      teams = validateTeams();
      if (!teams) return;
    }

    const players = selectedIds
      .map((id) => {
        const human = allProfiles.find((p) => p.id === id);
        if (human) {
          const dartSetId = playerDartSets[human.id] ?? null;
          return {
            id: human.id,
            profileId: human.id,
            name: human.name,
            avatarDataUrl: (human as any).avatarDataUrl ?? null,
            isBot: !!(human as any).isBot,
            botLevel: (human as any).botLevel ?? undefined,
            dartSetId,
          };
        }

        const bot = botProfiles.find((b) => b.id === id);
        if (bot) {
          return {
            id: bot.id,
            profileId: null,
            name: bot.name,
            avatarDataUrl: bot.avatarDataUrl ?? null,
            isBot: true,
            botLevel: bot.botLevel ?? undefined,
            dartSetId: null,
          };
        }

        return null;
      })
      .filter(Boolean) as any[];

    const baseCfg: any = {
      id: `x01v3-${Date.now()}`,
      startScore,
      inMode,
      outMode,
      legsPerSet,
      setsToWin,
      serveMode,
      // ✅ L'engine V3 se base sur `gameMode` ("solo" | "teams")
      // `matchMode` reste un champ UI/backward-compat ("solo" | "multi" | "teams")
      gameMode: matchMode === "teams" ? "teams" : "solo",
      matchMode,
      players,
      createdAt: Date.now(),

      // ✅ source de scoring (keypad vs externe)
      scoringSource: externalScoringEnabled ? "external" : "manual",

      // ✅ saisie vocale scores (3 fléchettes + confirmation oui/non)
      // (ignorée automatiquement si scoringSource=external)
      voiceScoreInputEnabled: voiceScoreEnabled,

      // ✅ NEW: méthode de saisie préférée (persistée aussi en localStorage)
      scoreInputDefaultMethod: scoreInputMethod,

      // ✅ audio config consommée par X01PlayV3
      audio: { arcadeEnabled, hitEnabled, voiceEnabled, voiceId },
    };

    if (matchMode === "teams" && teams) baseCfg.teams = teams;

    try {
      try {
        localStorage.setItem(SCORE_INPUT_LS_KEY, scoreInputMethod);
      } catch {}
      onStart(baseCfg as X01ConfigV3);
    } catch (e) {
      console.warn("[X01ConfigV3] onStart a échoué :", e);
    }
  }

  // ---- Style / thème ----
  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  return (
    <div
      className="screen x01-config-v3-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 10, marginLeft: -12, marginRight: -12 }}>
        {(() => {
          const DOT_SIZE = 36;
          const DOT_GLOW = `${primary}88`;
          return (
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "max(6px, env(safe-area-inset-top))",
              }}
            >
              <img
                src={tickerX01}
                alt="X01"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                draggable={false}
              />

              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <BackDot
                  onClick={() =>
                    typeof onBack === "function"
                      ? onBack()
                      : typeof go === "function"
                      ? go("games")
                      : null
                  }
                  title={t("common.back", "Retour")}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>

              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                <InfoDot
                  onClick={() => setRulesOpen(true)}
                  title={t("common.rules", "Règles")}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>
            </div>
          );
        })()}
      </header>

      {/* CONTENU SCROLLABLE */}
      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* --------- BLOC JOUEURS (HUMAINS) --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "20px 12px 16px",
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("x01v3.localPlayers", "Joueurs")}
          </div>

          {humanProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
              {t(
                "x01v3.noProfiles",
                "Aucun profil local. Tu peux créer des joueurs et des BOTS dans le menu Profils."
              )}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 12,
                  marginBottom: 6,
                  paddingLeft: 24,
                  paddingRight: 8,
                  justifyContent: "flex-start",
                }}
                className="dc-scroll-thin"
              >
                {humanProfiles.map((p) => {
                  const active = selectedIds.includes(p.id);

                  const teamId =
                    matchMode === "teams" ? (teamAssignments[p.id] as TeamId | null) ?? null : null;
                  const haloColor = teamId ? TEAM_COLORS[teamId] : primary;

                  return (
                    <div
                      key={p.id}
                      role="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 120,
                        maxWidth: 120,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active ? `0 0 28px ${haloColor}aa` : "0 0 14px rgba(0,0,0,0.65)",
                          background: active
                            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${haloColor})`
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
                            transition: "filter 0.2s ease, opacity 0.2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
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

                      {/* Badge set (ne doit pas toggle le joueur) */}
                      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                        <PlayerDartBadge
                          profileId={p.id}
                          dartSetId={playerDartSets[p.id] ?? null}
                          onChange={(id) => handleChangePlayerDartSet(p.id, id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                {t("x01v3.playersHint", "2 joueurs pour un duel, 3+ pour Multi ou Équipes.")}
              </p>
            </>
          )}
        </section>

        {/* --------- BLOC BOTS IA --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
            {t("x01v3.bots.title", "Bots IA")}
          </h3>

          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
            {t("x01v3.bots.subtitle", 'Ajoute des BOTS IA : bots "pro" prédéfinis ou BOTS que tu as créés dans le menu Profils.')}
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              overflowY: "visible",
              paddingBottom: 10,
              paddingTop: 16,
              marginTop: 10,
              marginBottom: 10,
            }}
            className="dc-scroll-thin"
          >
            {botProfiles.map((bot) => {
              const { level } = resolveBotLevel(bot.botLevel);
              const active = selectedIds.includes(bot.id);

              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => togglePlayer(bot.id)}
                  style={{
                    minWidth: 96,
                    maxWidth: 96,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  <BotMedallion bot={bot} level={level} active={active} />

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: "center",
                      color: active ? "#f6f2e9" : "#7e8299",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 4,
                    }}
                  >
                    {bot.name}
                  </div>

                  <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                        background: "radial-gradient(circle at 30% 0, #6af3ff, #008cff)",
                        color: "#020611",
                        boxShadow: "0 0 10px rgba(0,172,255,0.55), 0 0 18px rgba(0,172,255,0.35)",
                        border: "1px solid rgba(144,228,255,0.9)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      BOT
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => go && go("profiles_bots")}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${primary}`,
              background: "rgba(255,255,255,0.04)",
              color: primary,
              fontWeight: 700,
              fontSize: 11,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {t("x01v3.bots.manage", "Gérer les BOTS")}
          </button>
        </section>

        {/* --------- BLOC PARAMÈTRES DE BASE + AUDIO + EXTERNAL --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("x01v3.baseParams", "Paramètres de base")}
          </h3>

          {/* Score de départ */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.startScore", "Score de départ")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {START_SCORES.map((s) => (
                <PillButton
                  key={s}
                  label={String(s)}
                  active={startScore === s}
                  onClick={() => setStartScore(s)}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              ))}
            </div>
          </div>

          {/* Mode d'entrée */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.inMode", "Mode d'entrée")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.in.simple", "Simple IN")}
                active={inMode === "simple"}
                onClick={() => setInMode("simple")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.double", "Double IN")}
                active={inMode === "double"}
                onClick={() => setInMode("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.master", "Master IN")}
                active={inMode === "master"}
                onClick={() => setInMode("master")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* Mode de sortie */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.outMode", "Mode de sortie")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.out.simple", "Simple OUT")}
                active={outMode === "simple"}
                onClick={() => setOutMode("simple")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.double", "Double OUT")}
                active={outMode === "double"}
                onClick={() => setOutMode("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.master", "Master OUT")}
                active={outMode === "master"}
                onClick={() => setOutMode("master")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          
          {/* ✅ FORMAT DU MATCH (intégré dans Paramètres de base) */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.format", "Format du match")}
            </div>
		<div style={{ marginBottom: 10 }}>
	            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.legsPerSet", "Manches par set")}</div>
	            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
	              {LEGS_OPTIONS.map((n) => (
	                <PillButton
	                  key={n}
	                  label={String(n)}
	                  active={legsPerSet === n}
	                  onClick={() => setLegsPerSet(n)}
	                  primary={primary}
	                  primarySoft={primarySoft}
	                  compact
	                />
	              ))}
	            </div>
	          </div>

	          <div>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.setsToWin", "Sets à gagner")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SETS_OPTIONS.map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={setsToWin === n}
                  onClick={() => setSetsToWin(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
	          </div>
	          </div>
          </div>

          {/* ✅ SERVICE / ORDRE DE DÉPART (intégré dans Paramètres de base) */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.service", "Service / ordre de départ")}
            </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.service", "Service / ordre de départ")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <PillButton
                label={t("x01v3.service.random", "Aléatoire")}
                active={serveMode === "random"}
                onClick={() => setServeMode("random")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.service.alternate", "Alterné (officiel)")}
                active={serveMode === "alternate"}
                onClick={() => setServeMode("alternate")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>{t("x01v3.matchMode", "Mode de match")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.mode.solo", "Solo (1v1)")}
                active={matchMode === "solo"}
                onClick={() => {
                  if (soloDisabled) return;
                  setMatchMode("solo");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={soloDisabled}
              />
              <PillButton
                label={t("x01v3.mode.multi", "Multi (FFA)")}
                active={matchMode === "multi"}
                onClick={() => {
                  if (multiDisabled) return;
                  setMatchMode("multi");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={multiDisabled}
              />
              <PillButton
                label={t("x01v3.mode.teams", "Équipes")}
                active={matchMode === "teams"}
                onClick={() => {
                  if (teamsDisabled) return;
                  setMatchMode("teams");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={teamsDisabled}
              />
            </div>
          </div>
          </div>

{/* ✅ AUDIO / VOIX */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.audio.title", "Audio")}
            </div>

            {/* Sons Arcade */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.arcade", "Sons Arcade")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={arcadeEnabled === true}
                  onClick={() => setArcadeEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={arcadeEnabled === false}
                  onClick={() => setArcadeEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.arcadeHint", "DBULL / BULL / DOUBLE / TRIPLE / 180 / BUST / victoire")}
              </div>
            </div>

            {/* Bruitages */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.hit", "Bruitages")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={hitEnabled === true}
                  onClick={() => setHitEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={hitEnabled === false}
                  onClick={() => setHitEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.hitHint", "Son de fléchette (dart-hit)")}
              </div>
            </div>

            {/* Voix IA */}
            <div>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.voice", "Voix IA")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={voiceEnabled === true}
                  onClick={() => setVoiceEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={voiceEnabled === false}
                  onClick={() => setVoiceEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                  {t("x01v3.audio.voiceSelect", "Voix")}
                </div>
                <select
                  value={voiceId}
                  onChange={(e) => {
                    voiceTouchedRef.current = true;
                    setVoiceId(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(9,11,20,0.9)",
                    color: "#f2f2ff",
                    padding: "0 10px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  {VOICE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                  {t("x01v3.audio.voiceHint", "Utilisée pour l'annonce des scores / fin de match.")}
                </div>
              </div>
            </div>
          </div>



          {/* ✅ METHODE DE SAISIE (UI) */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.inputMethod.title", "Méthode de saisie")}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.inputMethod.desc",
                "Choisis l’interface par défaut (tu pourras basculer en match via le hub)."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.inputMethod.keypad", "KEYPAD")}
                active={scoreInputMethod === "keypad"}
                onClick={() => setScoreInputMethod("keypad")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.dartboard", "CIBLE")}
                active={scoreInputMethod === "dartboard"}
                onClick={() => setScoreInputMethod("dartboard")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.presets", "PRESETS")}
                active={scoreInputMethod === "presets"}
                onClick={() => setScoreInputMethod("presets")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <PillButton
                label={t("x01v3.inputMethod.voice", "VOICE")}
                active={scoreInputMethod === "voice"}
                onClick={() => setScoreInputMethod("voice")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.auto", "AUTO")}
                active={scoreInputMethod === "auto"}
                onClick={() => setScoreInputMethod("auto")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("x01v3.inputMethod.ai", "IA")}
                active={scoreInputMethod === "ai"}
                onClick={() => setScoreInputMethod("ai")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {scoreInputMethod === "dartboard"
                ? t("x01v3.inputMethod.hintDartboard", "CIBLE : touche la cible pour saisir directement S/D/T.")
                : scoreInputMethod === "presets"
                ? t("x01v3.inputMethod.hintPresets", "PRESETS : raccourcis 1 tap (ex: 180) qui remplissent la volée.")
                : scoreInputMethod === "voice"
                ? t("x01v3.inputMethod.hintVoice", "VOICE : nécessite d’activer la commande vocale ci-dessous.")
                : scoreInputMethod === "auto"
                ? t("x01v3.inputMethod.hintAuto", "AUTO : module d’auto-scoring léger (si disponible).")
                : scoreInputMethod === "ai"
                ? t("x01v3.inputMethod.hintAi", "IA : dartsmind-like / vision (si disponible).")
                : t("x01v3.inputMethod.hintKeypad", "KEYPAD : saisie manuelle classique.")}
            </div>
          </div>

          {/* ✅ COMMANDE VOCALE (SAISIE SCORES) */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.voiceScore.title", "Commande vocale (saisie scores)")}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.voiceScore.desc",
                "Le joueur dicte ses 3 fléchettes. La voix récapitule et demande confirmation (oui/non)."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.off", "OFF")}
                active={voiceScoreEnabled === false}
                onClick={() => setVoiceScoreEnabled(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.on", "ON")}
                active={voiceScoreEnabled === true}
                onClick={() => setVoiceScoreEnabled(true)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {voiceScoreEnabled
                ? t(
                    "x01v3.voiceScore.onHint",
                    "ON : saisie vocale active au début du tour (si supportée). Confirmation obligatoire."
                  )
                : t("x01v3.voiceScore.offHint", "OFF : saisie au keypad.")}
            </div>

            {voiceScoreEnabled && externalScoringEnabled && (
              <div style={{ fontSize: 11, color: "#ffcc66", marginTop: 8 }}>
                {t(
                  "x01v3.voiceScore.warnExternal",
                  "Note : le comptage externe est activé ; la commande vocale sera ignorée en play."
                )}
              </div>
            )}
          </div>

          {/* ✅ COMPTAGE EXTERNE + bouton info */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary }}>
                {t("x01v3.external.title", "Comptage externe (vidéo)")}
              </div>

              <button
                type="button"
                onClick={() => {
                  setExternalInfoStep(1);
                  setExternalInfoOpen(true);
                }}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(0,0,0,0.55)",
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
                aria-label="Info comptage externe"
                title="Info"
              >
                i
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.external.desc",
                "Active si tu veux que le match soit piloté par une source externe (caméra / bridge / automatisation)."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.off", "OFF")}
                active={externalScoringEnabled === false}
                onClick={() => setExternalScoringEnabled(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.on", "ON")}
                active={externalScoringEnabled === true}
                onClick={() => setExternalScoringEnabled(true)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {externalScoringEnabled
                ? t("x01v3.external.onHint", "ON : X01PlayV3 écoute des events externes et applique les tirs au moteur.")
                : t("x01v3.external.offHint", "OFF : mode normal au keypad.")}
            </div>
          </div>

          {/* ✅ MODAL FLOTTANT : tuto + pages + scroll interne + tests */}
          {externalInfoOpen && (
            <div
              onClick={() => setExternalInfoOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(560px, 100%)",
                  maxHeight: "78vh",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "linear-gradient(180deg, rgba(10,12,24,0.96), rgba(6,7,14,0.98))",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
                  padding: 14,
                  color: "#f2f2ff",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flex: "0 0 auto" }}>
                  <div style={{ fontWeight: 900, color: primary, fontSize: 14 }}>
                    {t("x01v3.external.howTitle", "Connexion comptage externe")}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExternalInfoOpen(false)}
                    style={{
                      borderRadius: 10,
                      padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t("common.close", "Fermer")}
                  </button>
                </div>

                {/* Step tabs */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, flex: "0 0 auto" }}>
                  <button type="button" onClick={() => setExternalInfoStep(1)} style={pillStep(externalInfoStep === 1, primary)}>
                    1) Activer
                  </button>
                  <button type="button" onClick={() => setExternalInfoStep(2)} style={pillStep(externalInfoStep === 2, primary)}>
                    2) Bridge (clé)
                  </button>
                  <button type="button" onClick={() => setExternalInfoStep(3)} style={pillStep(externalInfoStep === 3, primary)}>
                    3) Tester
                  </button>
                </div>

                {/* Scrollable body */}
                <div
                  style={{
                    flex: "1 1 auto",
                    overflowY: "auto",
                    paddingRight: 6,
                    fontSize: 12,
                    color: "#d7d9f0",
                    lineHeight: 1.42,
                  }}
                  className="dc-scroll-thin"
                >
                  {/* STEP 1 */}
                  {externalInfoStep === 1 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Résumé (rapide)</div>
                      <div style={{ marginBottom: 10 }}>
                        <b>But :</b> recevoir automatiquement les tirs depuis un appareil externe (caméra / système Scolia-like / capteur).
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Étapes</div>
                        <div style={{ color: "#e7e9ff" }}>
                          <div>1) Dans X01 Config → <b>Comptage externe = ON</b></div>
                          <div>2) Tu lances la partie</div>
                          <div>3) Un <b>bridge</b> envoie les tirs vers l’app</div>
                          <div>4) Le score bouge tout seul (pas besoin du keypad)</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        👉 L’étape 2 est la plus importante : elle explique <b>où tourne le bridge</b> et <b>comment il envoie les tirs</b>.
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {externalInfoStep === 2 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Étape 2 — Le bridge (le connecteur)</div>

                      <div style={{ marginBottom: 10 }}>
                        <b>Le bridge</b> est un petit programme externe qui fait le lien entre :
                        <br />• ton <b>appareil de comptage</b> (caméra / board / système tiers)
                        <br />• et <b>Darts Counter</b> (ton navigateur / ton téléphone)
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Où est-ce que ça tourne ?</div>
                        <div style={{ color: "#e7e9ff" }}>
                          • Sur un <b>PC / Mac / Raspberry Pi</b><br />
                          • Idéalement <b>sur le même réseau (Wi-Fi)</b> que l’appareil qui affiche Darts Counter<br />
                          • Le bridge reste <b>allumé pendant toute la partie</b>
                        </div>
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Ce que fait le bridge (simple)</div>
                        <div style={{ color: "#e7e9ff" }}>
                          1) Il <b>récupère</b> les tirs (ex : “T20”, “D16”, “Bull”, “Miss”)<br />
                          2) Il <b>convertit</b> en format simple : <code>segment + multiplier</code><br />
                          3) Il <b>envoie</b> à Darts Counter pendant la partie
                        </div>
                      </div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Option A & B (les 2 en même temps)</div>
                        <div style={{ color: "#e7e9ff" }}>
                          <b>A) Même appareil (le plus simple)</b><br />
                          Tu ouvres Darts Counter sur le <b>PC</b> et le bridge tourne sur le <b>même PC</b>. Le bridge envoie directement au navigateur.
                          <div style={{ height: 8 }} />
                          <b>B) Appareil séparé (mobile/tablette)</b><br />
                          Tu joues sur téléphone/tablette, et le bridge tourne sur un PC/Raspberry. Le bridge doit <b>envoyer sur le réseau</b> vers l’appareil (URL locale / WebSocket local / relay page).
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        <b>Important :</b> si ton appareil ne fournit aucun flux exploitable (API/SDK/WebSocket/MQTT/HTTP),
                        alors aucun bridge ne peut “deviner” les tirs.
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {externalInfoStep === 3 && (
                    <div>
                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Tests & format attendu</div>

                      <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6, color: primary }}>Events supportés</div>

                        <div style={{ fontSize: 12, color: "#e7e9ff" }}>
                          • <b>dc:x01v3:dart</b> → <code>{`{ segment, multiplier }`}</code>
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                            segment: 0..20 ou 25 (bull). multiplier: 1/2/3 (2 = DBull si segment=25)
                          </div>

                          <div style={{ height: 8 }} />

                          • <b>dc:x01v3:visit</b> → <code>{`{ darts: [{segment,multiplier}, ...] }`}</code> (max 3)
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                            Envoie une volée complète d’un coup (1 à 3 fléchettes).
                          </div>
                        </div>

                        <pre
                          style={{
                            margin: "10px 0 0 0",
                            padding: 10,
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.35)",
                            overflowX: "auto",
                            fontSize: 12,
                            lineHeight: 1.35,
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e7e9ff",
                          }}
                        >{`// 1 fléchette (T20)
window.dispatchEvent(new CustomEvent("dc:x01v3:dart", {
  detail: { segment: 20, multiplier: 3 }
}));

// 1 volée (180)
window.dispatchEvent(new CustomEvent("dc:x01v3:visit", {
  detail: { darts: [
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 },
    { segment: 20, multiplier: 3 }
  ] }
}));`}</pre>
                      </div>

                      <div style={{ fontWeight: 900, color: primary, marginBottom: 8 }}>Tests rapides</div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button type="button" onClick={() => dispatchExternalDart(20, 3)} style={extTestBtn(primary)}>
                          TEST T20
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(25, 1)} style={extTestBtn("#4fc3ff")}>
                          TEST BULL
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(25, 2)} style={extTestBtn("#ff4fa2")}>
                          TEST DBULL
                        </button>
                        <button type="button" onClick={() => dispatchExternalDart(0, 1)} style={extTestBtn("rgba(255,255,255,0.6)")}>
                          TEST MISS
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            dispatchExternalVisit([
                              { segment: 20, multiplier: 3 },
                              { segment: 20, multiplier: 3 },
                              { segment: 20, multiplier: 3 },
                            ])
                          }
                          style={extTestBtn("#6dff7c")}
                        >
                          TEST VISIT 180
                        </button>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                        Lance une partie X01 avec <b>Comptage externe = ON</b> : si le score bouge avec les tests, ton listener est OK.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer nav */}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flex: "0 0 auto" }}>
                  <button
                    type="button"
                    onClick={() => setExternalInfoStep((s) => (s === 1 ? 1 : ((s - 1) as any)))}
                    style={navBtn(false)}
                    disabled={externalInfoStep === 1}
                  >
                    ← Précédent
                  </button>

                  <button
                    type="button"
                    onClick={() => setExternalInfoStep((s) => (s === 3 ? 3 : ((s + 1) as any)))}
                    style={navBtn(true)}
                    disabled={externalInfoStep === 3}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* --------- BLOC FORMAT DU MATCH --------- */}
        

        {/* --------- BLOC SERVICE + MODE DE MATCH --------- */}
        

        {/* --------- BLOC COMPO ÉQUIPES --------- */}
        {matchMode === "teams" && totalPlayers >= 2 && (
          <TeamsSection
            profiles={allProfiles}
            selectedIds={selectedIds}
            teamAssignments={teamAssignments}
            setPlayerTeam={setPlayerTeam}
          />
        )}
        <div style={{ height: 96 }} />
      </div>

      {/* CTA collée au-dessus de la barre de nav */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleStart}
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
        </div>
      </div>

      {/* RULES OVERLAY */}
      {rulesOpen && (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "78vh",
              overflowY: "auto",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: `1px solid ${primary}33`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 1, color: primary, textTransform: "uppercase" }}>Règles — X01</div>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.35 }}>
              <div style={{ marginBottom: 10 }}>
                <b>Objectif</b> : atteindre exactement <b>0</b>. Si tu descends sous 0, c’est <b>Bust</b> et le score revient au début de la volée.
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>IN</b> :
                <ul style={{ margin: "6px 0 0 18px" }}>
                  <li><b>Simple IN</b> : tu peux démarrer sur n’importe quel score.</li>
                  <li><b>Double IN</b> : tu dois commencer par un <b>double</b>.</li>
                  <li><b>Master IN</b> : tu dois commencer par <b>double ou triple</b>.</li>
                </ul>
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>OUT</b> :
                <ul style={{ margin: "6px 0 0 18px" }}>
                  <li><b>Simple OUT</b> : tu peux finir sur n’importe quel score.</li>
                  <li><b>Double OUT</b> : tu dois finir sur un <b>double</b>.</li>
                  <li><b>Master OUT</b> : tu dois finir sur <b>double ou triple</b>.</li>
                </ul>
              </div>
              <div style={{ opacity: 0.8 }}>
                Les options <b>Sets</b>/<b>Manches</b> déterminent le format du match, et l’ordre de service peut être aléatoire ou alterné selon ton réglage.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* --------- Sous-section équipes avec grissage intelligent --------- */

type TeamsSectionProps = {
  profiles: Profile[];
  selectedIds: string[];
  teamAssignments: Record<string, TeamId | null>;
  setPlayerTeam: (playerId: string, tid: TeamId) => void;
};

function TeamsSection({ profiles, selectedIds, teamAssignments, setPlayerTeam }: TeamsSectionProps) {
  const { t } = useLang() as any;

  const cardBg = "rgba(10, 12, 24, 0.96)";
  const totalPlayers = selectedIds.length;

  const counts: Record<TeamId, number> = { gold: 0, pink: 0, blue: 0, green: 0 };

  selectedIds.forEach((pid) => {
    const tId = teamAssignments[pid];
    if (tId) counts[tId]++;
  });

  const orderedTeams: TeamId[] = ["gold", "pink", "blue", "green"];

  const maxTeams = totalPlayers <= 4 ? 2 : totalPlayers <= 6 ? 3 : 4;
  const maxPerTeamBase = totalPlayers >= 8 ? 4 : totalPlayers >= 6 ? 3 : 2;
  const usedTeamsCount = orderedTeams.filter((tid) => counts[tid] > 0).length;
  const maxPerTeam = usedTeamsCount >= 3 ? 2 : maxPerTeamBase;

  return (
    <section
      style={{
        background: cardBg,
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        border: `1px solid rgba(255,255,255,0.04)`,
      }}
    >
      <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: "#9fa4c0", marginBottom: 6 }}>
        {t("x01v3.teams.title", "Composition des équipes")}
      </h3>

      <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
        {t(
          "x01v3.teams.subtitle",
          "Assigne chaque joueur à une Team : Gold, Pink, Blue ou Green. Combos possibles : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
        )}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {selectedIds.map((pid) => {
          const p = profiles.find((pr) => pr.id === pid);
          if (!p) return null;
          const team = teamAssignments[pid] ?? null;

          return (
            <div key={pid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <ProfileAvatar profile={p} size={28} />
                <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 120 }}>
                  {p.name}
                </span>
              </div>

              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {orderedTeams.map((tid, idx) => {
                  const allowedTeamSlot = idx < maxTeams;
                  const full = counts[tid] >= maxPerTeam && team !== tid;
                  const disabled = !allowedTeamSlot || full;

                  return (
                    <TeamPillButton
                      key={tid}
                      label={TEAM_LABELS[tid].replace("Team ", "")}
                      color={TEAM_COLORS[tid]}
                      active={team === tid}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setPlayerTeam(pid, tid);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------ Helpers UI ------------------ */

function pillStep(active: boolean, primary: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "radial-gradient(circle at 20% 0%, rgba(245,195,91,.22), rgba(8,8,20,.96))"
      : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function navBtn(primaryStyle: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: primaryStyle ? "rgba(245,195,91,0.14)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    minWidth: 120,
  };
}

function extTestBtn(accent: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: `0 0 14px ${accent}33, 0 0 22px rgba(0,0,0,0.55)`,
    whiteSpace: "nowrap",
  };
}

/* --------- Helpers niveau BOT (1 à 5 étoiles) --------- */

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  const v = (botLevelRaw || "").toLowerCase().trim();
  if (!v) return { level: 1 };

  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return { level: n };
  }

  if (v.includes("legend") || v.includes("légende")) return { level: 5 };
  if (v.includes("pro")) return { level: 4 };

  if (v.includes("fort") || v.includes("strong") || v.includes("hard") || v.includes("difficile"))
    return { level: 3 };
  if (v.includes("standard") || v.includes("normal") || v.includes("medium") || v.includes("moyen"))
    return { level: 2 };
  if (v.includes("easy") || v.includes("facile") || v.includes("beginner") || v.includes("débutant") || v.includes("rookie"))
    return { level: 1 };

  return { level: 1 };
}

/* Médaillon BOT – doré pour les PRO IA, bleu pour les bots classiques */
function BotMedallion({
  bot,
  level,
  active,
}: {
  bot: BotLite;
  level: number; // 1..5
  active: boolean;
}) {
  const isPro = String(bot.id || "").startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.6;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;
  const WRAP = MEDALLION + STAR;

  const lvl = Math.max(1, Math.min(5, level));
  const fakeAvg3d = 15 + (lvl - 1) * 12;

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, flex: "0 0 auto", overflow: "visible" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing
          anchorSize={MEDALLION}
          gapPx={-2 * SCALE}
          starSize={STAR}
          stepDeg={10}
          avg3d={fakeAvg3d}
          color={COLOR}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: (WRAP - MEDALLION) / 2,
          left: (WRAP - MEDALLION) / 2,
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          padding: 6 * SCALE,
          background: active
            ? isPro
              ? "linear-gradient(135deg, #fff3c2, #f7c85c)"
              : "linear-gradient(135deg, #7df3ff, #00b4ff)"
            : isPro
            ? "linear-gradient(135deg, #2a2a1f, #1a1a12)"
            : "linear-gradient(135deg, #2c3640, #141b26)",
          boxShadow: active
            ? `0 0 24px ${COLOR_GLOW}, inset 0 0 10px rgba(0,0,0,.7)`
            : `0 0 14px rgba(0,0,0,0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: active ? "scale(1.05)" : "scale(1)",
          transition: "transform .15s ease, box-shadow .15s ease",
          border: active ? `2px solid ${COLOR}` : `2px solid ${isPro ? "rgba(247,200,92,0.5)" : "rgba(144,228,255,0.9)"}`,
        }}
      >
        <ProfileAvatar
          size={AVATAR}
          dataUrl={bot.avatarDataUrl ?? undefined}
          label={bot.name?.[0]?.toUpperCase() || "B"}
          showStars={false}
        />
      </div>
    </div>
  );
}

/* ------------------ Pills réutilisables ------------------ */

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
  disabled?: boolean;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled ? "rgba(40,42,60,0.7)" : active ? primarySoft : "rgba(9,11,20,0.9)";

  const border = isDisabled
    ? "1px solid rgba(255,255,255,0.04)"
    : active
    ? `1px solid ${primary}`
    : "1px solid rgba(255,255,255,0.07)";

  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 700 : 600,
        boxShadow: active && !isDisabled ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

type TeamPillProps = {
  label: string;
  color: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

function TeamPillButton({ label, color, active, disabled, onClick }: TeamPillProps) {
  const baseBg = active ? color : "rgba(9,11,20,0.9)";
  const baseColor = active ? "#151515" : "#e5e7f8";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: "3px 8px",
        border: disabled
          ? "1px solid rgba(255,255,255,0.06)"
          : active
          ? `1px solid ${color}`
          : "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "rgba(40,42,60,0.6)" : baseBg,
        color: disabled ? "#777b92" : baseColor,
        fontSize: 11,
        fontWeight: 800,
        boxShadow: active && !disabled ? `0 0 10px ${color}55` : "none",
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
