// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Baby-Foot — Config (LOCAL)
// Objectif: rendu + UX calqués sur X01ConfigV3 (DartsCounter)
// ✅ Presets depuis menus (MATCH / FUN / TRAINING / DÉFIS) -> config spécifique par carte
// ✅ Sélection ÉQUIPES via catalogue (Profils > Teams) en carrousel (flèches)
// ✅ Sélection JOUEURS par camp en carrousel (flèches) + quota strict (1v1/2v2/2v1)
// ✅ Règles épurées
// ✅ FIX: profilesForA / profilesForB déclarés
// ✅ FIX: alias storeSetTarget pour éviter le conflit avec le state local
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { onlineApi } from "../../lib/onlineApi";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../../lib/profileUsage";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import TeamPagedSelector from "../../components/TeamPagedSelector";

import {
  loadBabyFootTeams,
  createBabyFootTeam,
  upsertBabyFootTeam,
  type BabyFootTeam,
} from "../../lib/petanqueTeamsStore";

import {
  loadBabyFootState,
  resetBabyFoot,
  setMode,
  setTarget as storeSetTarget,
  setTeams,
  setTeamsProfiles,
  setAdvancedOptions,
  startMatch,
  type BabyFootMode,
  type BabyFootRulePreset,
  type BabyFootDemiRule,
  type BabyFootPissetteRule,
  type BabyFootGamelleRule,
  type BabyFootPecheOffRule,
  type BabyFootPecheDefRule,
} from "../../lib/babyfootStore";

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function pickTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

type Props = { go: (t: any, p?: any) => void; params?: any; store: Store };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const DEMI_OPTIONS: Array<{ value: BabyFootDemiRule; label: string }> = [
  { value: "suspend", label: "Suspendu cumulatif" },
  { value: "forbidden", label: "Interdit" },
];

const PISSETTE_OPTIONS: Array<{ value: BabyFootPissetteRule; label: string }> = [
  { value: "point", label: "Autorisée : +1 but" },
  { value: "forbidden_stat", label: "Interdite : tentative + refus, 0 point" },
  { value: "stat_only", label: "Stat seulement : 0 point" },
];

const GAMELLE_OPTIONS: Array<{ value: BabyFootGamelleRule; label: string }> = [
  { value: "plus_one_scoring_team", label: "Autorisée : +1 à l'équipe qui la fait" },
  { value: "minus_one_conceding_team", label: "Bar : -1 à l'équipe qui la subit" },
  { value: "stat_only", label: "Stat seulement : 0 point" },
];

const PECHE_OFF_OPTIONS: Array<{ value: BabyFootPecheOffRule; label: string }> = [
  { value: "forbidden", label: "Interdite : bouton neutre / stat non comptée" },
  { value: "minus_one_conceding_team", label: "Autorisée : -1 à l'équipe qui la subit" },
  { value: "stat_only", label: "Stat seulement : 0 point" },
];

const PECHE_DEF_OPTIONS: Array<{ value: BabyFootPecheDefRule; label: string }> = [
  { value: "forbidden", label: "Interdite : bouton neutre / stat non comptée" },
  { value: "cancel_goal", label: "Autorisée : annule le dernier but adverse" },
  { value: "stat_only", label: "Stat seulement : 0 point" },
];

function pillStyle(
  active: boolean,
  primary: string,
  primarySoft: string
): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: active ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
    background: active ? primarySoft : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.84)",
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 0.35,
    cursor: "pointer",
    boxShadow: active
      ? `0 10px 22px rgba(0,0,0,0.30), 0 0 0 2px ${primary}22`
      : "none",
    whiteSpace: "nowrap",
    userSelect: "none",
  };
}

function sectionTitle(label: string, color: string) {
  return (
    <div
      style={{
        fontSize: 12,
        opacity: 0.92,
        fontWeight: 1000,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color,
        marginBottom: 10,
      }}
    >
      {label}
    </div>
  );
}

function cardStyle(cardBg: string): React.CSSProperties {
  return {
    background: cardBg,
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: "16px 14px 14px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
  };
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    cursor: "pointer",
    userSelect: "none",
  };
}

function ArrowBtn({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ ...iconBtnStyle(), pointerEvents: "auto" }}
      role="button"
      aria-label={dir === "left" ? "Précédent" : "Suivant"}
      title={dir === "left" ? "Précédent" : "Suivant"}
    >
      <div style={{ fontSize: 18, opacity: 0.95 }}>
        {dir === "left" ? "‹" : "›"}
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.62)",
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10, 12, 24, 0.98)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>{title}</div>
          <div style={{ marginLeft: "auto" }}>
            <div
              onClick={onClose}
              style={{ ...iconBtnStyle(), width: 32, height: 32 }}
            >
              ✕
            </div>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function TeamAvatar({
  team,
  primary,
}: {
  team: BabyFootTeam | null;
  primary: string;
}) {
  const logo = team?.logoDataUrl || team?.regionLogoDataUrl || null;
  const name = team?.name || "Nommer plus tard";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 8, width: 128 }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 999,
          border: `1px solid ${primary}22`,
          background: "rgba(255,255,255,0.06)",
          boxShadow: `0 14px 36px rgba(0,0,0,0.40), 0 0 0 2px ${primary}10`,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {logo ? (
          <img
            src={logo}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontWeight: 1000, opacity: 0.92, letterSpacing: 1 }}>
            {initials || "—"}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.86,
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={name}
      >
        {name}
      </div>
    </div>
  );
}

function ProfileAvatarCard({
  p,
  selected,
  primary,
}: {
  p: Profile;
  selected: boolean;
  primary: string;
}) {
  const avatar = (p as any)?.avatarDataUrl || (p as any)?.avatarData || null;
  const name = (p as any)?.name || "—";
  return (
    <div
      style={{
        width: 92,
        display: "grid",
        justifyItems: "center",
        gap: 8,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 999,
          overflow: "hidden",
          border: selected
            ? `2px solid ${primary}aa`
            : "1px solid rgba(255,255,255,0.12)",
          boxShadow: selected
            ? `0 12px 30px rgba(0,0,0,0.40), 0 0 0 3px ${primary}22`
            : "0 12px 28px rgba(0,0,0,0.35)",
          background: "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontWeight: 1000, opacity: 0.9 }}>
            {String(name).slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.86,
          textAlign: "center",
          maxWidth: 92,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={name}
      >
        {name}
      </div>
    </div>
  );
}

export default function BabyFootConfig({ go, store, params }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try {
        window.scrollTo(0, 0);
      } catch {}
    }
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  const primary = (theme as any)?.primary ?? "#f7c85c";
  const primarySoft = (theme as any)?.primarySoft ?? "rgba(247,200,92,0.16)";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  const saved = useMemo(() => loadBabyFootState(), []);

  const [teamsCatalog, setTeamsCatalog] = useState<BabyFootTeam[]>(() =>
    loadBabyFootTeams()
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTeamsCatalog(loadBabyFootTeams());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // En provenance du hub Online, params.mode vaut "babyfoot" : ce n’est PAS un format de match.
  // On l’ignore ici pour ne pas verrouiller la sélection 1v1 / 2v2 / 2v1.
  const rawRouteModeId = (params as any)?.mode as string | undefined;
  const routeModeId = String(rawRouteModeId || "").toLowerCase() === "babyfoot" ? undefined : rawRouteModeId;
  const presetMode = (params as any)?.presetMode as BabyFootMode | undefined;
  const presetTarget = (params as any)?.presetTarget as number | undefined;
  const presetVariantId = (params as any)?.presetVariantId as string | undefined;

  const presetTimerSec =
    (params as any)?.presetTimerSec ??
    (params as any)?.presetDurationSec ??
    (params as any)?.presetDuration ??
    undefined;

  const presetCategory = (params as any)?.presetCategory as string | undefined;
  const presetTraining = (params as any)?.presetTraining as string | undefined;
  const presetGoldenGoal = (params as any)?.presetGoldenGoal as boolean | undefined;

  const routeCategory: "match" | "fun" | "training" | "defis" | undefined =
    (presetCategory as any) ??
    (typeof routeModeId === "string" && routeModeId.startsWith("match_")
      ? "match"
      : undefined) ??
    (presetTraining ? "training" : undefined);

  const routeModeFromId: BabyFootMode | undefined =
    routeModeId === "match_2v2"
      ? "2v2"
      : routeModeId === "match_2v1"
      ? "2v1"
      : routeModeId === "match_1v1"
      ? "1v1"
      : undefined;

  const routeVariant: string | undefined =
    presetVariantId ??
    (typeof routeModeId === "string" ? routeModeId : undefined) ??
    (presetTraining ? String(presetTraining) : undefined);

  const lockFormat = !!routeModeId || !!routeCategory || !!presetTraining;
  const isOnlineBabyFoot = Boolean((params as any)?.online || (params as any)?.lobbyCode);
  const onlineLobbyCode = String((params as any)?.lobbyCode || "").trim().toUpperCase();

  const presetSetsEnabled =
    (params as any)?.presetSetsEnabled ??
    ((params as any)?.presetBestOf ? true : undefined) ??
    ((params as any)?.presetSetTarget ? true : undefined);

  const presetBestOf = (params as any)?.presetBestOf as (1 | 3 | 5) | undefined;
  const presetSetTarget = (params as any)?.presetSetTarget as number | undefined;
  const presetHandicapA = (params as any)?.presetHandicapA as number | undefined;
  const presetHandicapB = (params as any)?.presetHandicapB as number | undefined;

  const [mode, setModeUI] = useState<BabyFootMode>(
    presetMode || routeModeFromId || saved.mode || "1v1"
  );

  // IMPORTANT UX: comme pour les joueurs, on ne réhydrate jamais les équipes
  // de l’ancienne partie sur une nouvelle config. L’utilisateur repart proprement
  // de zéro et choisit ses nouvelles équipes explicitement.
  const [teamARefId, setTeamARefId] = useState<string>("");
  const [teamBRefId, setTeamBRefId] = useState<string>("");

  const [target, setTargetUI] = useState<number>(presetTarget ?? saved.target ?? 10);
  const [scoreMode, setScoreMode] = useState<"target" | "balls5" | "balls10" | "balls11" | "chrono">(
    (saved as any).scoreMode === "balls5" ||
    (saved as any).scoreMode === "balls10" ||
    (saved as any).scoreMode === "balls11" ||
    (saved as any).scoreMode === "chrono"
      ? (saved as any).scoreMode
      : "target"
  );

  const [useTimer, setUseTimer] = useState<boolean>(
    (Number.isFinite(Number(presetTimerSec)) && Number(presetTimerSec) > 0) ||
      (Number.isFinite((saved as any).matchDurationSec) &&
        (saved as any).matchDurationSec > 0)
  );

  const [durationSec, setDurationSec] = useState<number>(
    clamp(Number(presetTimerSec ?? (saved as any).matchDurationSec ?? 180), 15, 60 * 30)
  );

  const [overtimeSec, setOvertimeSec] = useState<number>(
    clamp(Number((saved as any).overtimeSec ?? 60), 0, 60 * 10)
  );

  const [goldenGoal, setGoldenGoal] = useState<boolean>(
    presetGoldenGoal !== undefined
      ? !!presetGoldenGoal
      : !!(saved as any).goldenGoal
  );

  const [overtimeGoldenGoal, setOvertimeGoldenGoal] = useState<boolean>(
    (saved as any).overtimeGoldenGoal === undefined
      ? true
      : !!(saved as any).overtimeGoldenGoal
  );

  const [setsEnabled, setSetsEnabled] = useState<boolean>(
    !!(presetSetsEnabled ?? (saved as any).setsEnabled)
  );

  const [setsBestOf, setSetsBestOf] = useState<1 | 3 | 5>(
    (((presetBestOf ?? (saved as any).setsBestOf ?? 3) === 5
      ? 5
      : (presetBestOf ?? (saved as any).setsBestOf ?? 3) === 1
      ? 1
      : 3) as any) as 1 | 3 | 5
  );

  const [setTargetValue, setSetTargetValue] = useState<number>(
    clamp(Number(presetSetTarget ?? (saved as any).setTarget ?? 5), 1, 30)
  );

  const [handicapA, setHandicapA] = useState<number>(
    clamp(Number(presetHandicapA ?? (saved as any).handicapA ?? 0), 0, 99)
  );
  const [handicapB, setHandicapB] = useState<number>(
    clamp(Number(presetHandicapB ?? (saved as any).handicapB ?? 0), 0, 99)
  );

  const [allowDrawOnTimeEnd, setAllowDrawOnTimeEnd] = useState<boolean>(
    (saved as any).allowDrawOnTimeEnd !== undefined
      ? !!(saved as any).allowDrawOnTimeEnd
      : true
  );

  const [requireTwoGoalLead, setRequireTwoGoalLead] = useState<boolean>(
    (saved as any).requireTwoGoalLead !== undefined
      ? !!(saved as any).requireTwoGoalLead
      : false
  );

  const [rulesPreset, setRulesPreset] = useState<BabyFootRulePreset>(
    (saved as any).rulesPreset === "bar" ? "bar" : "competition"
  );
  const [demiRule, setDemiRule] = useState<BabyFootDemiRule>(
    (saved as any).demiRule === "forbidden" ? "forbidden" : "suspend"
  );
  const [pissetteRule, setPissetteRule] = useState<BabyFootPissetteRule>(
    (saved as any).pissetteRule === "forbidden_stat" || (saved as any).pissetteRule === "stat_only"
      ? (saved as any).pissetteRule
      : "point"
  );
  const [gamelleRule, setGamelleRule] = useState<BabyFootGamelleRule>(
    (saved as any).gamelleRule === "minus_one_conceding_team" || (saved as any).gamelleRule === "stat_only"
      ? (saved as any).gamelleRule
      : "plus_one_scoring_team"
  );
  const [pecheOffRule, setPecheOffRule] = useState<BabyFootPecheOffRule>(
    (saved as any).pecheOffRule === "minus_one_conceding_team" || (saved as any).pecheOffRule === "stat_only"
      ? (saved as any).pecheOffRule
      : "forbidden"
  );
  const [pecheDefRule, setPecheDefRule] = useState<BabyFootPecheDefRule>(
    (saved as any).pecheDefRule === "cancel_goal" || (saved as any).pecheDefRule === "stat_only"
      ? (saved as any).pecheDefRule
      : "forbidden"
  );
  const [allowRoulette, setAllowRoulette] = useState<boolean>(!!(saved as any).allowRoulette);
  const [allowTacles, setAllowTacles] = useState<boolean>(!!(saved as any).allowTacles);
  const [allowLobShot, setAllowLobShot] = useState<boolean>(!!(saved as any).allowLobShot);

  // IMPORTANT UX: la page de config ne doit jamais ressortir les joueurs
  // de la partie précédente. On repart volontairement de zéro à chaque
  // nouvelle configuration, comme les sélecteurs Darts Counter.
  const [selA, setSelA] = useState<string[]>([]);
  const [selB, setSelB] = useState<string[]>([]);

  const [confirmA, setConfirmA] = useState(false);
  const [confirmB, setConfirmB] = useState(false);

  const capA = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const capB = mode === "2v2" ? 2 : 1;

  const teamsModeAvailable = mode === "2v2" || mode === "2v1";
  const [campSource, setCampSource] = useState<"manual" | "existing">("manual");
  const useExistingTeams = teamsModeAvailable && campSource === "existing";
  const showTeamsPicker = useExistingTeams;
  const showTeamsPickerB = useExistingTeams && mode === "2v2";
  const isBallLimitedScore = scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11";
  const isChronoScore = scoreMode === "chrono";

  type GuidedStep = "source" | "teamA" | "teamB" | "playerA" | "playerB" | "score" | "sets" | "timer" | "golden" | "advanced" | "summary";
  const firstGuidedStep: GuidedStep = teamsModeAvailable ? "source" : "playerA";
  const [configMode, setConfigMode] = useState<"guided" | "full">("guided");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(firstGuidedStep);

  const guidedSteps = useMemo(() => {
    const steps: GuidedStep[] = [];
    if (teamsModeAvailable) steps.push("source");
    if (useExistingTeams) steps.push("teamA");
    if (useExistingTeams && mode === "2v2") steps.push("teamB");
    steps.push("playerA", "playerB", "score", "sets");
    if (isChronoScore) steps.push("timer", "golden");
    steps.push("advanced", "summary");
    return steps;
  }, [teamsModeAvailable, useExistingTeams, mode, isChronoScore]);

  useEffect(() => {
    if (!guidedSteps.includes(guidedStep)) {
      setGuidedStep(guidedSteps[0] || "playerA");
    }
  }, [guidedStep, guidedSteps]);

  useEffect(() => {
    if (!teamsModeAvailable && campSource !== "manual") setCampSource("manual");
  }, [teamsModeAvailable, campSource]);

  useEffect(() => {
    if (isChronoScore) {
      if (!useTimer) setUseTimer(true);
      return;
    }
    if (useTimer) setUseTimer(false);
    if (goldenGoal) setGoldenGoal(false);
    if (overtimeSec > 0) setOvertimeSec(0);
    if (overtimeGoldenGoal) setOvertimeGoldenGoal(false);
  }, [isChronoScore, useTimer, goldenGoal, overtimeSec, overtimeGoldenGoal]);

  const guidedStepIndex = Math.max(0, guidedSteps.indexOf(guidedStep));
  const guidedTabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tabs = guidedTabsRef.current;
    if (!tabs) return;
    const activeTab = tabs.querySelector<HTMLButtonElement>(`[data-guided-step="${guidedStep}"]`);
    if (!activeTab) return;
    const raf = window.requestAnimationFrame(() => {
      activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [guidedStep, guidedSteps.length]);

  const goGuided = (delta: number) => {
    const next = clamp(guidedStepIndex + delta, 0, guidedSteps.length - 1);
    setGuidedStep(guidedSteps[next] || guidedSteps[0] || "playerA");
  };

  const applyRulePreset = (preset: BabyFootRulePreset) => {
    setRulesPreset(preset);
    if (preset === "bar") {
      setDemiRule("suspend");
      setPissetteRule("forbidden_stat");
      setGamelleRule("minus_one_conceding_team");
      setPecheOffRule("minus_one_conceding_team");
      setPecheDefRule("cancel_goal");
      setAllowRoulette(false);
      setAllowTacles(false);
      setAllowLobShot(false);
      return;
    }
    setDemiRule("suspend");
    setPissetteRule("point");
    setGamelleRule("plus_one_scoring_team");
    setPecheOffRule("forbidden");
    setPecheDefRule("forbidden");
    setAllowRoulette(false);
    setAllowTacles(false);
    setAllowLobShot(false);
  };

  const profiles: Profile[] = useMemo(
    () => sortProfilesByModeUsage(((store as any)?.profiles || []) as Profile[], "babyfoot", (store as any)?.activeProfileId),
    [(store as any)?.profiles, (store as any)?.activeProfileId]
  );

  const selectedASet = new Set(selA.map(String));
  const selectedBSet = new Set(selB.map(String));

  const teamPlayerIds = (team: BabyFootTeam | null): string[] => {
    if (!team) return [];
    const rawIds = Array.isArray((team as any).playerIds)
      ? (team as any).playerIds
      : Array.isArray((team as any).players)
        ? (team as any).players
            .map((player: any) =>
              typeof player === "string"
                ? player
                : player?.id ?? player?.profileId ?? player?.playerId ?? null
            )
        : [];
    return Array.from(new Set(rawIds.map((id: any) => String(id || "").trim()).filter(Boolean)));
  };

  const headerTickerId =
    routeVariant || (routeCategory ? `${routeCategory}_${mode}` : null) || `babyfoot_${mode}`;
  const headerTicker = pickTicker(headerTickerId) || pickTicker(`babyfoot_${mode}`) || null;

  const findTeam = (id: string) => teamsCatalog.find((x) => x.id === id) ?? null;
  const teamAObj = teamARefId ? findTeam(teamARefId) : null;
  const teamBObj = teamBRefId ? findTeam(teamBRefId) : null;

  const teamAPlayerIdSet = new Set(teamPlayerIds(teamAObj));
  const teamBPlayerIdSet = new Set(teamPlayerIds(teamBObj));

  const profilesForA: Profile[] = profiles.filter((p: any) => {
    const id = String(p?.id || "");
    if (!id) return false;
    if (useExistingTeams && teamAObj && !teamAPlayerIdSet.has(id)) return false;
    if (selectedASet.has(id)) return true;
    if (selectedBSet.has(id)) return false;
    return true;
  });

  const profilesForB: Profile[] = profiles.filter((p: any) => {
    const id = String(p?.id || "");
    if (!id) return false;
    if (useExistingTeams && teamBObj && !teamBPlayerIdSet.has(id)) return false;
    if (selectedBSet.has(id)) return true;
    if (selectedASet.has(id)) return false;
    return true;
  });

  useEffect(() => {
    if (mode === "2v1" && teamBRefId) setTeamBRefId("");
  }, [mode, teamBRefId]);

  // Pas de sélection automatique des équipes : cela évite de relancer
  // une ancienne composition ou une équipe par défaut sans action utilisateur.

  // Règle globale équipes A/B/C :
  // on autorise volontairement la même équipe enregistrée sur A et B.
  // Les joueurs déjà choisis côté A sont masqués côté B, donc Familia peut devenir
  // Familia A / Familia B tant qu'il reste assez de joueurs libres.
  useEffect(() => {
    // Plus de remplacement automatique quand teamARefId === teamBRefId.
  }, [showTeamsPicker, mode, teamARefId, teamBRefId, teamsCatalog]);

  useEffect(() => {
    if (!useExistingTeams) return;
    if (teamAObj) {
      setSelA((prev) => prev.filter((id) => teamAPlayerIdSet.has(String(id))));
    }
    if (teamBObj) {
      setSelB((prev) => prev.filter((id) => teamBPlayerIdSet.has(String(id))));
    }
  }, [useExistingTeams, teamARefId, teamBRefId, teamsCatalog]);

  const teamsReady = !useExistingTeams || (mode === "2v1" ? !!teamARefId : !!teamARefId && !!teamBRefId);
  const canStart = teamsReady && selA.length === capA && selB.length === capB && confirmA && confirmB;
  const showStartButton = configMode === "full" || guidedStep === "summary";

  useEffect(() => {
    // Changement de format = vraie nouvelle sélection.
    // On évite les restes 2v2 -> 1v1 / ancienne partie -> nouvelle partie.
    setSelA([]);
    setSelB([]);
    setTeamARefId("");
    setTeamBRefId("");
    setConfirmA(false);
    setConfirmB(false);
    setConfigMode("guided");
    setCampSource("manual");
    setGuidedStep(mode === "2v2" || mode === "2v1" ? "source" : "playerA");
    try {
      setTeams("TEAM A", "TEAM B", { teamARefId: null, teamBRefId: null, teamALogoDataUrl: null, teamBLogoDataUrl: null } as any);
      setTeamsProfiles([], []);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    setConfirmA(selA.length === capA);
    setConfirmB(selB.length === capB);
  }, [selA.length, selB.length, capA, capB]);

  useEffect(() => {
    const to510 = (v: number) => (v <= 7 ? 5 : 10);
    if (setsEnabled) {
      setSetTargetValue((v) => (v === 5 || v === 10 ? v : to510(v)));
    } else {
      setTargetUI((v) => (v === 5 || v === 10 ? v : to510(v)));
    }
  }, [setsEnabled]);

  const togglePlayer = (team: "A" | "B", idRaw: string) => {
    const id = String(idRaw || "").trim();
    if (!id) return;

    if (team === "A") {
      setSelB((prev) => prev.filter((x) => String(x) !== id));
      setSelA((prev) => {
        const clean = prev.map(String).filter(Boolean);
        if (clean.includes(id)) return clean.filter((x) => x !== id);

        // Même logique UX que Darts Counter, adaptée aux quotas Baby-Foot :
        // quand le camp est plein, cliquer un nouveau joueur remplace l'ancien
        // au lieu de bloquer la sélection.
        if (capA <= 1) return [id];
        if (clean.length >= capA) return [...clean.slice(1), id].slice(0, capA);
        return [...clean, id].slice(0, capA);
      });
      return;
    }

    setSelA((prev) => prev.filter((x) => String(x) !== id));
    setSelB((prev) => {
      const clean = prev.map(String).filter(Boolean);
      if (clean.includes(id)) return clean.filter((x) => x !== id);
      if (capB <= 1) return [id];
      if (clean.length >= capB) return [...clean.slice(1), id].slice(0, capB);
      return [...clean, id].slice(0, capB);
    });
  };


  const selectTeam = (side: "A" | "B", idRaw: string) => {
    const id = String(idRaw || "").trim();
    if (!id) return;

    if (side === "A") {
      setTeamARefId((prev) => (String(prev) === id ? "" : id));
      setSelA([]);
      setConfirmA(false);
      return;
    }

    setTeamBRefId((prev) => (String(prev) === id ? "" : id));
    setSelB([]);
    setConfirmB(false);
  };

  const clearTeamSelection = () => {
    setTeamARefId("");
    setTeamBRefId("");
    try {
      setTeams("TEAM A", "TEAM B", { teamARefId: null, teamBRefId: null, teamALogoDataUrl: null, teamBLogoDataUrl: null } as any);
    } catch {
      // ignore
    }
  };

  const clearPlayerSelection = () => {
    setSelA([]);
    setSelB([]);
    setConfirmA(false);
    setConfirmB(false);
    setConfigMode("guided");
    setGuidedStep(teamsModeAvailable ? "source" : "playerA");
    try {
      setTeamsProfiles([], []);
    } catch {
      // ignore
    }
  };

  const advanceAfterTeamPick = (side: "A" | "B") => {
    window.setTimeout(() => {
      if (side === "A") setGuidedStep(showTeamsPickerB ? "teamB" : "playerA");
      else setGuidedStep("playerA");
    }, 0);
  };

  const advanceAfterPlayerPick = (side: "A" | "B", idRaw: string) => {
    const id = String(idRaw || "").trim();
    if (!id) return;
    const ids = side === "A" ? selA : selB;
    const cap = side === "A" ? capA : capB;
    const already = ids.map(String).includes(id);
    const nextCount = already ? Math.max(0, ids.length - 1) : Math.min(cap, ids.length + 1);
    if (nextCount < cap) return;
    window.setTimeout(() => {
      if (side === "A") setGuidedStep("playerB");
      else setGuidedStep("score");
    }, 0);
  };

  const getProfileById = (id: string) =>
    profiles.find((p: any) => String((p as any)?.id) === String(id)) as any;

  function SelectedPlayersStrip({
    ids,
    onEdit,
  }: {
    ids: string[];
    onEdit: () => void;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {ids.map((id) => {
          const p: any = getProfileById(id);
          const avatar = p?.avatarDataUrl || p?.avatarData || null;
          const name = p?.name || "—";
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 10px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${primary}1f`,
                boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  overflow: "hidden",
                  border: `1px solid ${primary}33`,
                  background: "rgba(0,0,0,0.22)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ fontWeight: 1000, opacity: 0.9 }}>
                    {String(name).slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontWeight: 950,
                  opacity: 0.92,
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
            </div>
          );
        })}

        <div style={{ marginLeft: "auto" }}>
          <div
            onClick={onEdit}
            style={{ ...iconBtnStyle(), width: 34, height: 34 }}
            role="button"
            aria-label={t("edit", "Modifier")}
            title={t("edit", "Modifier")}
          >
            ✓
          </div>
        </div>
      </div>
    );
  }

  function SelectedTeamStrip({
    team,
    onClear,
  }: {
    team: BabyFootTeam | null;
    onClear: () => void;
  }) {
    if (!team) return null;

    const logo = team.logoDataUrl || team.regionLogoDataUrl || null;
    const name = team.name || "Équipe";
    const playersCount = Array.isArray((team as any).players)
      ? (team as any).players.length
      : Array.isArray((team as any).playerIds)
        ? (team as any).playerIds.length
        : 0;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${primary}33`,
          boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            overflow: "hidden",
            border: `1px solid ${primary}33`,
            background: "rgba(0,0,0,0.24)",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ fontWeight: 1000, opacity: 0.9 }}>
              {String(name).slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 1000,
              opacity: 0.94,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, opacity: 0.68, fontWeight: 800 }}>
            {playersCount} joueur(s)
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          style={{
            border: `1px solid ${primary}33`,
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            borderRadius: 999,
            padding: "9px 12px",
            fontWeight: 900,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          Retirer
        </button>
      </div>
    );
  }


  const aPlayersRef = useRef<HTMLDivElement | null>(null);
  const bPlayersRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (el: HTMLDivElement | null, dir: "left" | "right") => {
    if (!el) return;
    const dx = (dir === "left" ? -1 : 1) * 220;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  const cycleTeam = (side: "A" | "B", dir: "left" | "right") => {
    if (!teamsCatalog.length) return;

    const ids = teamsCatalog.map((t) => t.id);
    const curId = side === "A" ? teamARefId : teamBRefId;
    const otherId = side === "A" ? teamBRefId : teamARefId;

    const startIdx = curId ? ids.indexOf(curId) : -1;
    const step = dir === "left" ? -1 : 1;

    if (ids.length === 1) {
      if (side === "A") setTeamARefId(ids[0]);
      else setTeamBRefId(ids[0]);
      return;
    }

    let idx = startIdx < 0 ? 0 : (startIdx + step + ids.length) % ids.length;
    let guard = 0;
    while (guard < ids.length && ids[idx] === otherId) {
      idx = (idx + step + ids.length) % ids.length;
      guard++;
    }

    const nextId = ids[idx];
    if (!nextId) return;

    if (side === "A") setTeamARefId(nextId);
    else setTeamBRefId(nextId);
  };

  const scoreOptions = [
    { value: "target5", label: t("bf_score5", "Premier à 5") },
    { value: "target10", label: t("bf_score10", "Premier à 10") },
    { value: "balls5", label: "5 balles jouées" },
    { value: "balls10", label: "10 balles jouées" },
    { value: "balls11", label: "11 balles jouées" },
    { value: "chrono", label: "Chrono" },
  ] as const;

  const scoreSelectValue = scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11" || scoreMode === "chrono" ? scoreMode : target === 5 ? "target5" : "target10";

  const applyScoreSelect = (value: string) => {
    if (value === "balls5" || value === "balls10" || value === "balls11") {
      setScoreMode(value);
      setTargetUI(value === "balls5" ? 5 : value === "balls11" ? 11 : 10);
      setUseTimer(false);
      return;
    }
    if (value === "chrono") {
      setScoreMode("chrono");
      setTargetUI(999);
      setUseTimer(true);
      return;
    }
    setScoreMode("target");
    setTargetUI(value === "target5" ? 5 : 10);
  };

  const durationOptions = [
    { value: 180, label: t("bf_3min", "3 min") },
    { value: 300, label: t("bf_5min", "5 min") },
    { value: 420, label: t("bf_7min", "7 min") },
    { value: 600, label: t("bf_10min", "10 min") },
  ];

  const overtimeOptions = [
    { value: 0, label: t("bf_none", "Aucune") },
    { value: 30, label: t("bf_30s", "30 sec") },
    { value: 60, label: t("bf_60s", "60 sec") },
    { value: 90, label: t("bf_90s", "90 sec") },
  ];

  const scoreLabel = (value: number) => {
    if (scoreMode === "balls5") return "5 balles jouées";
    if (scoreMode === "balls10") return "10 balles jouées";
    if (scoreMode === "balls11") return "11 balles jouées";
    if (scoreMode === "chrono") return "Chrono";
    return value === 5 ? t("bf_score5", "Premier à 5") : value === 10 ? t("bf_score10", "Premier à 10") : `Premier à ${value}`;
  };
  const durationLabel = (value: number) => durationOptions.find((o) => o.value === value)?.label || `${Math.round(value / 60)} min`;
  const overtimeLabel = (value: number) => overtimeOptions.find((o) => o.value === value)?.label || `${value} sec`;
  const optionLabel = <T extends string>(items: Array<{ value: T; label: string }>, value: T) => items.find((o) => o.value === value)?.label || String(value);
  const overtimeEnabled = useTimer && !goldenGoal && overtimeSec > 0;
  const toggleGoldenGoal = () => {
    setGoldenGoal((current) => {
      const next = !current;
      if (next) {
        setOvertimeSec(0);
        setOvertimeGoldenGoal(false);
      }
      return next;
    });
  };
  const toggleOvertime = () => {
    if (!useTimer) return;
    if (overtimeSec > 0) {
      setOvertimeSec(0);
      return;
    }
    setGoldenGoal(false);
    setOvertimeGoldenGoal(false);
    setOvertimeSec(60);
  };
  const updateOvertimeSec = (value: number) => {
    if (value > 0) {
      setGoldenGoal(false);
      setOvertimeGoldenGoal(false);
    }
    setOvertimeSec(value);
  };

  const [infoOpen, setInfoOpen] = useState(false);

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createTeamSide, setCreateTeamSide] = useState<"A" | "B">("A");
  const [createTeamName, setCreateTeamName] = useState("");
  const [createTeamLogo, setCreateTeamLogo] = useState<string | null>(null);

  const openCreateTeam = (side: "A" | "B") => {
    setCreateTeamSide(side);
    setCreateTeamName("");
    setCreateTeamLogo(null);
    setCreateTeamOpen(true);
  };

  const createTeamCommit = () => {
    const name = String(createTeamName || "").trim();
    if (!name) return;
    const team = createBabyFootTeam({ name, logoDataUrl: createTeamLogo || null });
    try {
      upsertBabyFootTeam(team);
    } catch {
      // ignore
    }
    const nextList = loadBabyFootTeams();
    setTeamsCatalog(nextList);
    if (createTeamSide === "A") setTeamARefId(team.id);
    if (createTeamSide === "B") setTeamBRefId(team.id);
    setCreateTeamOpen(false);
  };

  useEffect(() => {
    const m = presetMode || routeModeFromId;
    if (m && (m === "1v1" || m === "2v2" || m === "2v1")) setModeUI(m);
  }, [presetMode, routeModeFromId]);

  const applyAndStart = async () => {
    setMode(mode);

    const playerA = profiles.find(
      (p) => String((p as any)?.id) === String(selA[0] || "")
    ) as any;
    const playerB = profiles.find(
      (p) => String((p as any)?.id) === String(selB[0] || "")
    ) as any;

    const manualCampA = mode === "2v1" ? "TEAM GOLD" : "TEAM GOLD";
    const manualCampB = mode === "2v1" ? String(playerB?.name || "JOUEUR SOLO") : "TEAM PINK";

    const sameSourceTeam = useExistingTeams && mode === "2v2" && teamAObj && teamBObj && String(teamAObj?.id || "") === String(teamBObj?.id || "");
    // Même club autorisé des deux côtés si les joueurs choisis sont différents.
    // Le suffixe A/B/C est uniquement une notion de sélection, jamais un renommage de match.
    const nameA =
      mode === "1v1"
        ? String(playerA?.name || "JOUEUR A")
        : useExistingTeams
        ? String(teamAObj?.name || "TEAM A")
        : manualCampA;

    const nameB =
      mode === "1v1"
        ? String(playerB?.name || "JOUEUR B")
        : mode === "2v1"
        ? manualCampB
        : useExistingTeams
        ? String(teamBObj?.name || "TEAM B")
        : "TEAM PINK";

    const defaultGoldTeam = !useExistingTeams && mode !== "1v1"
      ? teamsCatalog.find((team: any) => String(team?.id || "") === "bf-team-gold" || String(team?.name || "").trim().toUpperCase() === "TEAM GOLD")
      : null;
    const defaultPinkTeam = !useExistingTeams && mode === "2v2"
      ? teamsCatalog.find((team: any) => String(team?.id || "") === "bf-team-pink" || String(team?.name || "").trim().toUpperCase() === "TEAM PINK")
      : null;
    const matchTeamA = useExistingTeams ? teamAObj : defaultGoldTeam;
    const matchTeamB = useExistingTeams && mode === "2v2" ? teamBObj : defaultPinkTeam;

    setTeams(nameA, nameB, {
      teamARefId: matchTeamA?.id ?? null,
      teamBRefId: mode === "2v2" ? matchTeamB?.id ?? null : null,
      teamALogoDataUrl:
        matchTeamA?.logoDataUrl ?? matchTeamA?.logoUrl ?? matchTeamA?.regionLogoDataUrl ?? null,
      teamBLogoDataUrl:
        mode === "2v2"
          ? matchTeamB?.logoDataUrl ?? matchTeamB?.logoUrl ?? matchTeamB?.regionLogoDataUrl ?? null
          : null,
      campSource,
    } as any);

    setTeamsProfiles(selA, selB);
    const effectiveTarget = scoreMode === "chrono" ? 999 : scoreMode === "balls5" ? 5 : scoreMode === "balls10" ? 10 : scoreMode === "balls11" ? 11 : target;
    storeSetTarget(effectiveTarget);

    (setAdvancedOptions as any)({
      scoreMode,
      maxBalls: scoreMode === "balls5" ? 5 : scoreMode === "balls10" ? 10 : scoreMode === "balls11" ? 11 : null,
      matchDurationSec: useTimer ? durationSec : null,
      overtimeSec: useTimer ? overtimeSec : 0,
      goldenGoal,
      overtimeGoldenGoal: false,
      handicapA,
      handicapB,
      setsEnabled,
      setsBestOf,
      setTarget:
        setsEnabled
          ? scoreMode === "balls5"
            ? 5
            : scoreMode === "balls10"
              ? 10
              : scoreMode === "balls11"
                ? 11
                : setTargetValue === 5 || setTargetValue === 10
                  ? setTargetValue
                  : 5
          : setTargetValue,
      allowDrawOnTimeEnd: useTimer ? !!allowDrawOnTimeEnd : false,
      requireTwoGoalLead: !!requireTwoGoalLead,
      rulesPreset,
      demiRule,
      pissetteRule,
      gamelleRule,
      pecheOffRule,
      pecheDefRule,
      allowRoulette,
      allowTacles,
      allowLobShot,
    });

    try { recordProfileUsageForMode("babyfoot", [...selA, ...selB]); } catch {}

    const nextState = startMatch();

    if (isOnlineBabyFoot && onlineLobbyCode) {
      try {
        await onlineApi.startMatch({
          lobbyCode: onlineLobbyCode,
          initialState: {
            ...nextState,
            config: nextState,
            sport: "babyfoot",
            mode: "babyfoot",
            onlineMode: "babyfoot",
            online: true,
            lobbyCode: onlineLobbyCode,
            lobbyId: (params as any)?.lobbyId || null,
            source: "babyfoot_config",
          },
        } as any);
      } catch (error: any) {
        window.alert(error?.message || "Impossible de lancer le match Baby-Foot online. Vérifie que tu es l’hôte et que tous les joueurs sont prêts.");
        return;
      }
    }

    go("babyfoot_play", {
      ...(params || {}),
      presetCategory: routeCategory,
      presetVariantId: routeVariant,
      online: isOnlineBabyFoot,
      onlineMode: isOnlineBabyFoot ? "babyfoot" : (params as any)?.onlineMode,
      lobbyCode: onlineLobbyCode || (params as any)?.lobbyCode,
      lobbyId: (params as any)?.lobbyId || null,
    });
  };

  const resetConfig = () => {
    resetBabyFoot();
    const s = loadBabyFootState();
    setModeUI(s.mode);
    setTeamARefId("");
    setTeamBRefId("");
    setCampSource("manual");
    setTargetUI(s.target ?? 10);
    setUseTimer(!!(s as any).matchDurationSec);
    setDurationSec(Number((s as any).matchDurationSec ?? 180));
    setOvertimeSec(Number((s as any).overtimeSec ?? 60));
    setGoldenGoal(!!(s as any).goldenGoal);
    setOvertimeGoldenGoal(
      (s as any).overtimeGoldenGoal === undefined
        ? true
        : !!(s as any).overtimeGoldenGoal
    );
    setSetsEnabled(!!(s as any).setsEnabled);
    setSetsBestOf(
      ((s as any).setsBestOf ?? 3) === 5
        ? 5
        : ((s as any).setsBestOf ?? 3) === 1
        ? 1
        : 3
    );
    setSetTargetValue(Number((s as any).setTarget ?? 5));
    setHandicapA(Number((s as any).handicapA ?? 0));
    setHandicapB(Number((s as any).handicapB ?? 0));
    setAllowDrawOnTimeEnd(
      (s as any).allowDrawOnTimeEnd !== undefined
        ? !!(s as any).allowDrawOnTimeEnd
        : true
    );
    setRequireTwoGoalLead(!!(s as any).requireTwoGoalLead);
    setRulesPreset((s as any).rulesPreset === "bar" ? "bar" : "competition");
    setDemiRule((s as any).demiRule === "forbidden" ? "forbidden" : "suspend");
    setPissetteRule((s as any).pissetteRule === "forbidden_stat" || (s as any).pissetteRule === "stat_only" ? (s as any).pissetteRule : "point");
    setGamelleRule((s as any).gamelleRule === "minus_one_conceding_team" || (s as any).gamelleRule === "stat_only" ? (s as any).gamelleRule : "plus_one_scoring_team");
    setPecheOffRule((s as any).pecheOffRule === "minus_one_conceding_team" || (s as any).pecheOffRule === "stat_only" ? (s as any).pecheOffRule : "forbidden");
    setPecheDefRule((s as any).pecheDefRule === "cancel_goal" || (s as any).pecheDefRule === "stat_only" ? (s as any).pecheDefRule : "forbidden");
    setAllowRoulette(!!(s as any).allowRoulette);
    setAllowTacles(!!(s as any).allowTacles);
    setAllowLobShot(!!(s as any).allowLobShot);
    setSelA([]);
    setSelB([]);
    setConfirmA(false);
    setConfirmB(false);
    setConfigMode("guided");
    setCampSource("manual");
    setGuidedStep(mode === "2v2" || mode === "2v1" ? "source" : "playerA");
  };

  const backTo = (params as any)?.backTo || (params as any)?.from || "babyfoot_games";

  const screenBg =
    "radial-gradient(1200px 600px at 50% -10%, rgba(120,140,255,0.22), transparent 55%), radial-gradient(900px 500px at 10% 10%, rgba(247,200,92,0.16), transparent 55%), radial-gradient(900px 500px at 90% 15%, rgba(255,90,140,0.10), transparent 60%), linear-gradient(180deg, rgba(8,9,16,1) 0%, rgba(6,7,12,1) 60%, rgba(6,7,12,1) 100%)";

  const campALabel =
    mode === "1v1"
      ? t("bf_player_a", "Joueur A")
      : useExistingTeams
      ? mode === "2v1"
        ? t("bf_team", "Équipe")
        : t("bf_team_a", "Équipe A")
      : "TEAM GOLD";

  const campBLabel =
    mode === "1v1"
      ? t("bf_player_b", "Joueur B")
      : mode === "2v1"
      ? t("bf_player", "Joueur solo")
      : useExistingTeams
      ? t("bf_team_b", "Équipe B")
      : "TEAM PINK";

  const campAName =
    mode === "1v1"
      ? (profiles.find(
          (p) => String((p as any)?.id) === String(selA[0] || "")
        ) as any)?.name || campALabel
      : useExistingTeams
      ? teamAObj?.name || campALabel
      : campALabel;

  const campBName =
    mode === "1v1"
      ? (profiles.find(
          (p) => String((p as any)?.id) === String(selB[0] || "")
        ) as any)?.name || campBLabel
      : mode === "2v1"
      ? (profiles.find(
          (p) => String((p as any)?.id) === String(selB[0] || "")
        ) as any)?.name || campBLabel
      : useExistingTeams
      ? teamBObj?.name || campBLabel
      : campBLabel;

  return (
    <div style={{ minHeight: "100vh", background: screenBg, color: "rgba(255,255,255,0.94)" }}>
      <div style={{ padding: "10px 12px 0" }}>
        <div style={{ position: "relative", marginLeft: -12, marginRight: -12, height: 118, overflow: "hidden", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", background: "rgba(255,255,255,0.06)" }}>
          {headerTicker ? (
            <>
              <img
                src={headerTicker}
                alt="ticker"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.00) 14%, rgba(0,0,0,0.00) 86%, rgba(0,0,0,0.42) 100%)",
                }}
              />
            </>
          ) : null}

          <div style={{ position: "absolute", left: 10, top: 10 }}>
            <BackDot onClick={() => go(backTo)} />
          </div>
          <div style={{ position: "absolute", right: 10, top: 10 }}>
            <InfoDot onClick={() => setInfoOpen(true)} />
          </div>
        </div>
      </div>

      <div ref={contentRef} style={{ padding: "12px 12px 200px" }}>
        {!lockFormat ? (
          <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
            {sectionTitle(t("bf_format", "FORMAT"), primary)}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["1v1", "2v2", "2v1"] as BabyFootMode[]).map((m) => (
                <div
                  key={m}
                  style={pillStyle(mode === m, primary, primarySoft)}
                  onClick={() => setModeUI(m)}
                >
                  {m.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ ...cardStyle(cardBg), marginBottom: 12, border: `1px solid ${primary}22` }}>
          {sectionTitle("TYPE DE CONFIGURATION", primary)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => setConfigMode("guided")} style={pillStyle(configMode === "guided", primary, primarySoft)}>Visite guidée</button>
            <button type="button" onClick={() => setConfigMode("full")} style={pillStyle(configMode === "full", primary, primarySoft)}>Config complète</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72, lineHeight: 1.4, fontWeight: 800 }}>
            {configMode === "guided"
              ? "Assistant étape par étape, comme la création tournoi : on choisit d’abord les camps, puis les joueurs, puis les paramètres."
              : "Configuration classique complète avec tous les blocs affichés sur la page."}
          </div>
        </div>

        {configMode === "guided" ? (
          <>
            <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
              {sectionTitle(`ÉTAPE ${guidedStepIndex + 1}/${guidedSteps.length}`, primary)}
              <div
                ref={guidedTabsRef}
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  scrollSnapType: "x proximity",
                  WebkitOverflowScrolling: "touch",
                  paddingBottom: 4,
                  marginBottom: 12,
                }}
              >
                {guidedSteps.map((step, idx) => {
                  const label = step === "source" ? "Type de camps" : step === "teamA" ? (mode === "2v1" ? "Équipe 2 joueurs" : "Équipe domicile") : step === "teamB" ? "Équipe extérieur" : step === "playerA" ? "Joueurs A" : step === "playerB" ? "Joueurs B" : step === "score" ? "Score" : step === "sets" ? "Sets" : step === "timer" ? "Chrono" : step === "golden" ? "Golden Goal" : step === "advanced" ? "Autres" : "Récap";
                  return (
                    <button
                      key={step}
                      type="button"
                      data-guided-step={step}
                      onClick={() => setGuidedStep(step)}
                      style={{ ...pillStyle(guidedStep === step, primary, primarySoft), flex: "0 0 auto", scrollSnapAlign: "center" }}
                    >
                      {idx + 1}. {label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginBottom: 6 }}>
                {guidedStep === "source" ? "Choisir la composition des camps" : guidedStep === "teamA" ? (mode === "2v1" ? "Choisir l’équipe à 2 joueurs" : "Choisir l’équipe domicile") : guidedStep === "teamB" ? "Choisir l’équipe extérieur" : guidedStep === "playerA" ? `Choisir ${capA} joueur${capA > 1 ? "s" : ""} pour ${campAName}` : guidedStep === "playerB" ? `Choisir ${capB} joueur${capB > 1 ? "s" : ""} pour ${campBName}` : guidedStep === "score" ? "Régler le score de la partie" : guidedStep === "sets" ? "Régler le format en sets" : guidedStep === "timer" ? "Régler le chrono" : guidedStep === "golden" ? "Régler le Golden Goal" : guidedStep === "advanced" ? "Régler les règles spéciales" : "Vérifier le récapitulatif"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 850, lineHeight: 1.4 }}>
                {mode === "1v1" ? "Mode SOLO : joueur domicile, joueur extérieur, puis règles." : campSource === "existing" ? (mode === "2v1" ? "Équipe existante : choisis l’équipe à deux joueurs, puis le joueur solo." : "Équipes existantes : choisis les deux équipes, puis les joueurs de chaque camp.") : (mode === "2v1" ? "Sans équipe existante : choisis directement les deux joueurs TEAM GOLD puis le joueur solo." : "Sans équipe existante : choisis directement les joueurs et ils seront rangés en TEAM GOLD / TEAM PINK.")}
              </div>
            </div>


            {guidedStep === "source" && teamsModeAvailable ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("COMPOSITION DES CAMPS", primary)}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCampSource("manual");
                      clearTeamSelection();
                      setGuidedStep("playerA");
                    }}
                    style={pillStyle(campSource === "manual", primary, primarySoft)}
                  >
                    Sans équipe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCampSource("existing");
                      setSelA([]);
                      setSelB([]);
                      setGuidedStep("teamA");
                    }}
                    style={pillStyle(campSource === "existing", primary, primarySoft)}
                  >
                    Équipe existante
                  </button>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.74, lineHeight: 1.45, fontWeight: 850 }}>
                  <b>Sans équipe</b> : joueurs libres assignés directement en TEAM GOLD / TEAM PINK.
                  <br />
                  <b>Équipe existante</b> : sélection d’une équipe enregistrée, puis choix des joueurs qui jouent dans cette équipe.
                </div>
              </div>
            ) : null}

            {guidedStep === "teamA" && showTeamsPicker ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle(mode === "2v1" ? "ÉQUIPE À 2 JOUEURS" : "ÉQUIPE DOMICILE", primary)}
                <TeamPagedSelector teams={teamsCatalog} selectedIds={teamARefId ? [teamARefId] : []} onToggle={(id: string) => selectTeam("A", id)} onAfterToggle={() => advanceAfterTeamPick("A")} closeOnSelect accent={primary} pageSize={9} modalTitle={mode === "2v1" ? "Équipe à 2 joueurs" : "Équipe domicile"} chooseLabel="Choisir équipe" listLabel="Liste équipes" />
                {teamARefId ? <div style={{ marginTop: 12 }}><SelectedTeamStrip team={teamAObj} onClear={() => { setTeamARefId(""); setSelA([]); }} /></div> : null}
              </div>
            ) : null}

            {guidedStep === "teamB" && showTeamsPickerB ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("ÉQUIPE EXTÉRIEUR", primary)}
                <TeamPagedSelector teams={teamsCatalog} selectedIds={teamBRefId ? [teamBRefId] : []} onToggle={(id: string) => selectTeam("B", id)} onAfterToggle={() => advanceAfterTeamPick("B")} closeOnSelect accent={primary} pageSize={9} modalTitle="Équipe extérieur" chooseLabel="Choisir équipe" listLabel="Liste équipes" />
                {teamBRefId ? <div style={{ marginTop: 12 }}><SelectedTeamStrip team={teamBObj} onClear={() => { setTeamBRefId(""); setSelB([]); }} /></div> : null}
              </div>
            ) : null}

            {guidedStep === "playerA" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle(`JOUEURS ${campAName}`, primary)}
                <PlayerPagedSelector usageMode="babyfoot" showProfileStarring={false} profiles={profilesForA} selectedIds={selA} onToggle={(id: string) => togglePlayer("A", id)} onAfterToggle={(id: string) => advanceAfterPlayerPick("A", id)} closeOnSelect={capA <= 1 || selA.length >= capA - 1} accent={primary} pageSize={9} modalTitle={`${campAName} · ${capA} joueur${capA > 1 ? "s" : ""}`} />
                <div style={{ marginTop: 12 }}><SelectedPlayersStrip ids={selA} onEdit={() => setGuidedStep("playerA")} /></div>
              </div>
            ) : null}

            {guidedStep === "playerB" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle(`JOUEURS ${campBName}`, primary)}
                <PlayerPagedSelector usageMode="babyfoot" showProfileStarring={false} profiles={profilesForB} selectedIds={selB} onToggle={(id: string) => togglePlayer("B", id)} onAfterToggle={(id: string) => advanceAfterPlayerPick("B", id)} closeOnSelect={capB <= 1 || selB.length >= capB - 1} accent={primary} pageSize={9} modalTitle={`${campBName} · ${capB} joueur${capB > 1 ? "s" : ""}`} />
                <div style={{ marginTop: 12 }}><SelectedPlayersStrip ids={selB} onEdit={() => setGuidedStep("playerB")} /></div>
              </div>
            ) : null}

            {guidedStep === "score" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...cardStyle(cardBg) }}>
                  {sectionTitle("SCORE", primary)}
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                      {t("bf_target", "Score cible")}
                    </div>
                    <select
                      value={scoreSelectValue}
                      onChange={(e) => applyScoreSelect(e.target.value)}
                      style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}
                    >
                      {scoreOptions.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
                    </select>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72, lineHeight: 1.35 }}>
                      {(scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11")
                        ? `La partie s’arrête après ${scoreMode === "balls5" ? 5 : scoreMode === "balls11" ? 11 : 10} balles jouées. Demi sur la dernière balle = -1 point.`
                        : scoreMode === "chrono"
                        ? "La partie s’arrête quand le chrono arrive à zéro, sauf prolongation ou Golden Goal selon les réglages suivants."
                        : "La partie s’arrête dès qu’un camp atteint le score cible."}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {scoreMode === "target" ? (
                      <div style={pillStyle(requireTwoGoalLead, primary, primarySoft)} onClick={() => setRequireTwoGoalLead((v) => !v)}>
                        {t("bf_win_by_two", "2 buts d'écart")}
                      </div>
                    ) : null}
                    {isChronoScore ? <div style={pillStyle(allowDrawOnTimeEnd, primary, primarySoft)} onClick={() => setAllowDrawOnTimeEnd((v) => !v)}>{t("bf_allow_draw", "Match nul")}</div> : null}
                  </div>
                </div>
                <div style={{ ...cardStyle(cardBg) }}>
                  {sectionTitle(t("bf_handicap", "HANDICAP"), primary)}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>{mode === "1v1" ? t("bf_player_a", "Joueur A") : t("bf_team_a", "Équipe A")}</div><input type="number" value={handicapA} min={0} max={99} onChange={(e) => setHandicapA(clamp(Number(e.target.value || 0), 0, 99))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }} /></div>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>{mode === "1v1" ? t("bf_player_b", "Joueur B") : mode === "2v1" ? t("bf_player", "Joueur") : t("bf_team_b", "Équipe B")}</div><input type="number" value={handicapB} min={0} max={99} onChange={(e) => setHandicapB(clamp(Number(e.target.value || 0), 0, 99))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }} /></div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.70 }}>{t("bf_handicap_hint", "Handicap = malus : les buts de départ sont donnés à l’adversaire.")}</div>
                </div>
              </div>
            ) : null}

            {guidedStep === "sets" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("SETS", primary)}
                {scoreMode !== "target" ? (
                  <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.74, lineHeight: 1.35 }}>
                    Les sets restent disponibles : chaque set reprend le mode de score choisi ({scoreMode === "balls5" ? "5 balles" : scoreMode === "balls10" ? "10 balles" : scoreMode === "balls11" ? "11 balles" : "chrono"}).
                  </div>
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1.1 }}>JOUER EN SETS</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                    <div style={pillStyle(!setsEnabled, primary, primarySoft)} onClick={() => setSetsEnabled(false)}>OFF</div>
                    <div style={pillStyle(setsEnabled, primary, primarySoft)} onClick={() => setSetsEnabled(true)}>ON</div>
                  </div>
                </div>
                {setsEnabled ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>{t("bf_bestof", "Best Of")}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {[1, 3, 5].map((bo) => <div key={bo} style={pillStyle(setsBestOf === bo, primary, primarySoft)} onClick={() => setSetsBestOf(bo as any)}>BO{bo}</div>)}
                      </div>
                    </div>
                    {scoreMode === "target" ? (
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Score cible par set</div>
                        <select value={setTargetValue === 5 || setTargetValue === 10 ? setTargetValue : 5} onChange={(e) => setSetTargetValue(Number(e.target.value))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                          <option value={5} style={{ color: "#111" }}>Premier à 5</option>
                          <option value={10} style={{ color: "#111" }}>Premier à 10</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45, fontWeight: 850 }}>
                        Chaque set utilise la règle choisie dans Score : {scoreMode === "balls5" ? "5 balles" : scoreMode === "balls10" ? "10 balles" : scoreMode === "balls11" ? "11 balles" : "chrono"}.
                      </div>
                    )}
                  </div>
                ) : <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, fontWeight: 850 }}>Sets désactivés : la partie se joue en score simple.</div>}
              </div>
            ) : null}

            {guidedStep === "timer" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("CHRONO", primary)}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1.1 }}>CHRONO DE MATCH</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                    <div style={pillStyle(!useTimer, primary, primarySoft)} onClick={() => setUseTimer(false)}>OFF</div>
                    <div style={pillStyle(useTimer, primary, primarySoft)} onClick={() => setUseTimer(true)}>ON</div>
                  </div>
                </div>
                {useTimer ? (
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>{t("bf_duration", "Durée")}</div>
                    <select value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                      {durationOptions.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {guidedStep === "golden" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("GOLDEN GOAL / PROLONGATION", primary)}
                <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45, fontWeight: 850, marginBottom: 10 }}>
                  Choisis une seule option en cas d’égalité à la fin du temps réglementaire : but en or immédiat OU prolongation chronométrée.
                </div>
                {!useTimer ? (
                  <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, fontWeight: 850 }}>
                    Active d’abord le chrono pour utiliser le Golden Goal ou une prolongation.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={pillStyle(goldenGoal, primary, primarySoft)} onClick={toggleGoldenGoal}>Golden Goal {goldenGoal ? "ON" : "OFF"}</div>
                      <div style={pillStyle(overtimeEnabled, primary, primarySoft)} onClick={toggleOvertime}>Prolongation {overtimeEnabled ? "ON" : "OFF"}</div>
                      <div style={{ marginLeft: "auto" }}><div onClick={() => setInfoOpen(true)} style={iconBtnStyle()} title={t("info", "Info")}>?</div></div>
                    </div>
                    {overtimeEnabled ? (
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Durée de prolongation</div>
                        <select value={overtimeSec} onChange={(e) => updateOvertimeSec(Number(e.target.value))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                          {overtimeOptions.filter((o) => o.value > 0).map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
                        </select>
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72, lineHeight: 1.4 }}>La prolongation peut se terminer sur un match nul si l’égalité reste parfaite à la fin du temps ajouté.</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {guidedStep === "advanced" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...cardStyle(cardBg) }}>
                  {sectionTitle("RÈGLES SPÉCIALES", primary)}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={pillStyle(rulesPreset === "competition", primary, primarySoft)} onClick={() => applyRulePreset("competition")}>RÈGLE DE COMPÉTITION</div>
                    <div style={pillStyle(rulesPreset === "bar", primary, primarySoft)} onClick={() => applyRulePreset("bar")}>RÈGLE DE BAR</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Demi</div><select value={demiRule} onChange={(e) => setDemiRule(e.target.value as BabyFootDemiRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>{DEMI_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}</select></div>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pissette</div><select value={pissetteRule} onChange={(e) => setPissetteRule(e.target.value as BabyFootPissetteRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>{PISSETTE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}</select></div>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Gamelle</div><select value={gamelleRule} onChange={(e) => setGamelleRule(e.target.value as BabyFootGamelleRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>{GAMELLE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}</select></div>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pêche offensive</div><select value={pecheOffRule} onChange={(e) => setPecheOffRule(e.target.value as BabyFootPecheOffRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>{PECHE_OFF_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}</select></div>
                    <div><div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pêche défensive</div><select value={pecheDefRule} onChange={(e) => setPecheDefRule(e.target.value as BabyFootPecheDefRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>{PECHE_DEF_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}</select></div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={pillStyle(allowRoulette, primary, primarySoft)} onClick={() => setAllowRoulette((v) => !v)}>Roulette {allowRoulette ? "ON" : "OFF"}</div>
                    <div style={pillStyle(allowTacles, primary, primarySoft)} onClick={() => setAllowTacles((v) => !v)}>Tacles {allowTacles ? "ON" : "OFF"}</div>
                    <div style={pillStyle(allowLobShot, primary, primarySoft)} onClick={() => setAllowLobShot((v) => !v)}>Parachute {allowLobShot ? "ON" : "OFF"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {guidedStep === "summary" ? (
              <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
                {sectionTitle("RÉCAPITULATIF", primary)}
                <div style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 850, opacity: 0.88 }}>
                  <div><b style={{ color: primary }}>Format :</b> {mode.toUpperCase()}</div>
                  <div><b style={{ color: primary }}>Composition :</b> {useExistingTeams ? "Équipes existantes" : "Sans équipe existante"}</div>
                  <div><b style={{ color: primary }}>Camp A :</b> {campAName} · {selA.length}/{capA} joueur{capA > 1 ? "s" : ""}</div>
                  <div><b style={{ color: primary }}>Camp B :</b> {campBName} · {selB.length}/{capB} joueur{capB > 1 ? "s" : ""}</div>
                  <div><b style={{ color: primary }}>Mode score :</b> {setsEnabled ? `Sets BO${setsBestOf}` : "Score simple"}</div>
                  <div><b style={{ color: primary }}>Mode score :</b> {scoreLabel(target)}</div>
                  {scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11" ? <div><b style={{ color: primary }}>Limite :</b> {scoreMode === "balls5" ? 5 : scoreMode === "balls11" ? 11 : 10} balles jouées • demi dernière balle = -1</div> : null}
                  {scoreMode === "target" ? <div><b style={{ color: primary }}>Score cible :</b> {setsEnabled ? `${scoreLabel(setTargetValue)} par set` : scoreLabel(target)}</div> : null}
                  <div><b style={{ color: primary }}>2 buts d’écart :</b> {requireTwoGoalLead ? "ON" : "OFF"}</div>
                  <div><b style={{ color: primary }}>Handicap :</b> A +{handicapA} / B +{handicapB}</div>
                  <div><b style={{ color: primary }}>Chrono :</b> {useTimer ? durationLabel(durationSec) : "désactivé"}</div>
                  <div><b style={{ color: primary }}>Match nul :</b> {useTimer && allowDrawOnTimeEnd ? "autorisé" : "non"}</div>
                  <div><b style={{ color: primary }}>Fin en cas d’égalité :</b> {!useTimer ? "sans chrono" : goldenGoal ? "Golden Goal" : overtimeEnabled ? `Prolongation ${overtimeLabel(overtimeSec)}` : allowDrawOnTimeEnd ? "match nul possible" : "aucune option spéciale"}</div>
                  <div><b style={{ color: primary }}>Règles :</b> {rulesPreset === "bar" ? "Bar" : "Compétition"}</div>
                  <div><b style={{ color: primary }}>Demi :</b> {optionLabel(DEMI_OPTIONS, demiRule)}</div>
                  <div><b style={{ color: primary }}>Pissette :</b> {optionLabel(PISSETTE_OPTIONS, pissetteRule)}</div>
                  <div><b style={{ color: primary }}>Gamelle :</b> {optionLabel(GAMELLE_OPTIONS, gamelleRule)}</div>
                  <div><b style={{ color: primary }}>Pêche offensive :</b> {optionLabel(PECHE_OFF_OPTIONS, pecheOffRule)}</div>
                  <div><b style={{ color: primary }}>Pêche défensive :</b> {optionLabel(PECHE_DEF_OPTIONS, pecheDefRule)}</div>
                  <div><b style={{ color: primary }}>Options :</b> Roulette {allowRoulette ? "ON" : "OFF"} · Tacles {allowTacles ? "ON" : "OFF"} · Parachute {allowLobShot ? "ON" : "OFF"}</div>
                </div>
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: guidedStepIndex <= 0 ? "1fr" : "1fr 1fr", gap: 10, marginTop: 12 }}>
              {guidedStepIndex > 0 ? <button type="button" onClick={() => goGuided(-1)} style={pillStyle(false, primary, primarySoft)}>Précédent</button> : null}
              <button type="button" onClick={() => guidedStepIndex >= guidedSteps.length - 1 ? setConfigMode("full") : goGuided(1)} style={pillStyle(true, primary, primarySoft)}>{guidedStepIndex >= guidedSteps.length - 1 ? "Config complète" : "Suivant"}</button>
            </div>
          </>
        ) : (
          <>

        {teamsModeAvailable ? (
          <div style={{ ...cardStyle(cardBg), marginBottom: 12, border: `1px solid ${primary}18` }}>
            {sectionTitle("COMPOSITION DES CAMPS", primary)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setCampSource("manual");
                  clearTeamSelection();
                }}
                style={pillStyle(campSource === "manual", primary, primarySoft)}
              >
                Sans équipe
              </button>
              <button
                type="button"
                onClick={() => {
                  setCampSource("existing");
                  setSelA([]);
                  setSelB([]);
                  setConfirmA(false);
                  setConfirmB(false);
                }}
                style={pillStyle(campSource === "existing", primary, primarySoft)}
              >
                Équipe existante
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72, lineHeight: 1.4, fontWeight: 850 }}>
              {campSource === "manual"
                ? "Joueurs libres : ils seront assignés directement aux camps TEAM GOLD / TEAM PINK."
                : "Équipes enregistrées : choisis les équipes, puis les joueurs qui jouent dans chaque camp."}
            </div>
          </div>
        ) : null}


        {showTeamsPicker ? (
          <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
            {sectionTitle(t("bf_teams", "ÉQUIPES"), primary)}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900 }}>
                {t("bf_select_teams", "Sélectionner les équipes")}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div
                  style={pillStyle(false, primary, primarySoft)}
                  onClick={() => go("babyfoot_teams")}
                >
                  {t("manage", "Gérer")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 850 }}>
                {teamARefId || teamBRefId
                  ? `${teamARefId ? "1" : "0"}/1 côté A${showTeamsPickerB ? ` · ${teamBRefId ? "1" : "0"}/1 côté B` : ""}`
                  : t("bf_no_teams_selected", "Aucune équipe sélectionnée")}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div
                  style={pillStyle(!teamARefId && !teamBRefId, primary, primarySoft)}
                  onClick={clearTeamSelection}
                  role="button"
                  title={t("bf_clear_teams", "Désélectionner les équipes")}
                >
                  {t("bf_clear_teams", "Désélectionner")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
                  {mode === "2v1"
                    ? t("bf_team_2players", "Équipe (2 joueurs)")
                    : t("bf_team_a", "Équipe A")}
                </div>
                <TeamPagedSelector
                  teams={teamsCatalog}
                  selectedIds={teamARefId ? [teamARefId] : []}
                  onToggle={(id: string) => selectTeam("A", id)}
                  onAfterToggle={() => advanceAfterTeamPick("A")}
                  closeOnSelect
                  accent={primary}
                  pageSize={9}
                  modalTitle={mode === "2v1" ? t("bf_team_2players", "Équipe (2 joueurs)") : t("bf_team_a", "Équipe A")}
                  chooseLabel={t("bf_choose_team", "Choisir équipe")}
                  listLabel={t("bf_team_list", "Liste équipes")}
                />
              </div>

              {showTeamsPickerB ? (
                <>
                  <div style={{ display: "grid", placeItems: "center", opacity: 0.65, fontWeight: 900 }}>
                    VS
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
                      {t("bf_team_b", "Équipe B")}
                    </div>
                    <TeamPagedSelector
                      teams={teamsCatalog}
                      selectedIds={teamBRefId ? [teamBRefId] : []}
                      onToggle={(id: string) => selectTeam("B", id)}
                      onAfterToggle={() => advanceAfterTeamPick("B")}
                      closeOnSelect
                      accent={primary}
                      pageSize={9}
                      modalTitle={t("bf_team_b", "Équipe B")}
                      chooseLabel={t("bf_choose_team", "Choisir équipe")}
                      listLabel={t("bf_team_list", "Liste équipes")}
                    />
                  </div>
                </>
              ) : null}

              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <div
                  style={pillStyle(false, primary, primarySoft)}
                  onClick={() => openCreateTeam("A")}
                >
                  {t("bf_create_team", "+ Créer une équipe")}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_players", "JOUEURS"), primary)}
          <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800, marginBottom: 10 }}>
            {t("bf_pick_exact", "Sélectionne exactement")} {capA} vs {capB}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 850 }}>
              {selA.length + selB.length > 0
                ? `${selA.length}/${capA} côté A · ${selB.length}/${capB} côté B`
                : t("bf_no_players_selected", "Aucun joueur sélectionné")}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div
                style={pillStyle(selA.length === 0 && selB.length === 0, primary, primarySoft)}
                onClick={clearPlayerSelection}
                role="button"
                title={t("bf_clear_players", "Désélectionner les joueurs")}
              >
                {t("bf_clear_players", "Désélectionner")}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {campAName}
          </div>
          <PlayerPagedSelector
            usageMode="babyfoot"
            showProfileStarring={false}
            profiles={profilesForA}
            selectedIds={selA}
            onToggle={(id: string) => togglePlayer("A", id)}
            onAfterToggle={(id: string) => advanceAfterPlayerPick("A", id)}
            closeOnSelect={capA <= 1 || selA.length >= capA - 1}
            accent={primary}
            pageSize={9}
            modalTitle={`${campALabel} · ${capA} joueur${capA > 1 ? "s" : ""}`}
          />

          <div style={{ height: 14 }} />

          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {campBName}
          </div>
          <PlayerPagedSelector
            usageMode="babyfoot"
            showProfileStarring={false}
            profiles={profilesForB}
            selectedIds={selB}
            onToggle={(id: string) => togglePlayer("B", id)}
            onAfterToggle={(id: string) => advanceAfterPlayerPick("B", id)}
            closeOnSelect={capB <= 1 || selB.length >= capB - 1}
            accent={primary}
            pageSize={9}
            modalTitle={`${campBLabel} · ${capB} joueur${capB > 1 ? "s" : ""}`}
          />
        </div>

        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_rules", "RÈGLES"), primary)}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1.1 }}>
              {t("bf_sets", "SETS")}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <div style={pillStyle(!setsEnabled, primary, primarySoft)} onClick={() => setSetsEnabled(false)}>
                OFF
              </div>
              <div style={pillStyle(setsEnabled, primary, primarySoft)} onClick={() => setSetsEnabled(true)}>
                ON
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {t("bf_target", "Score cible")}
              </div>

              <select
                value={scoreSelectValue}
                onChange={(e) => applyScoreSelect(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  padding: "12px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${primary}22`,
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                  fontWeight: 950,
                }}
              >
                {scoreOptions.map((o) => (
                  <option key={o.value} value={o.value} style={{ color: "#111" }}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72, lineHeight: 1.35 }}>
                {(scoreMode === "balls5" || scoreMode === "balls10" || scoreMode === "balls11")
                  ? `La partie s’arrête après ${scoreMode === "balls5" ? 5 : scoreMode === "balls11" ? 11 : 10} balles jouées. Demi sur la dernière balle = -1 point.`
                  : scoreMode === "chrono"
                  ? "La partie s’arrête au chrono choisi plus bas, sauf prolongation ou Golden Goal."
                  : "La partie s’arrête au score cible."}
              </div>
            </div>

            {setsEnabled ? (
              <div>
                <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                  {t("bf_bestof", "Best Of")}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[1, 3, 5].map((bo) => (
                    <div
                      key={bo}
                      style={pillStyle(setsBestOf === bo, primary, primarySoft)}
                      onClick={() => setSetsBestOf(bo as any)}
                    >
                      BO{bo}
                    </div>
                  ))}
                </div>
                {scoreMode === "target" ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Score cible par set</div>
                    <select value={setTargetValue === 5 || setTargetValue === 10 ? setTargetValue : 5} onChange={(e) => setSetTargetValue(Number(e.target.value))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                      <option value={5} style={{ color: "#111" }}>Premier à 5</option>
                      <option value={10} style={{ color: "#111" }}>Premier à 10</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.76, lineHeight: 1.45, fontWeight: 850 }}>
                    Chaque set utilise la règle choisie dans Score : {scoreMode === "balls5" ? "5 balles" : scoreMode === "balls10" ? "10 balles" : scoreMode === "balls11" ? "11 balles" : "chrono"}.
                  </div>
                )}
              </div>
            ) : scoreMode !== "target" ? (
              <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.35 }}>Les sets peuvent aussi être activés avec ce mode : chaque set reprend la règle {scoreMode === "balls5" ? "5 balles" : scoreMode === "balls10" ? "10 balles" : scoreMode === "balls11" ? "11 balles" : "chrono"}.</div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {scoreMode === "target" ? (
                <div
                style={pillStyle(requireTwoGoalLead, primary, primarySoft)}
                onClick={() => setRequireTwoGoalLead((v) => !v)}
                title={t("bf_win_by_two_tip", "Exige 2 buts d'écart pour gagner (hors contrainte temps)")}
              >
                {t("bf_win_by_two", "2 buts d'écart")}
              </div>
              ) : null}

              {isChronoScore ? (
                <div
                  style={pillStyle(allowDrawOnTimeEnd, primary, primarySoft)}
                  onClick={() => setAllowDrawOnTimeEnd((v) => !v)}
                  title={t("bf_allow_draw_tip", "Autorise le match nul si égalité à la fin du temps")}
                >
                  {t("bf_allow_draw", "Match nul")}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {t("bf_handicap", "HANDICAP")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 850, marginBottom: 6 }}>
                    {mode === "1v1" ? t("bf_player_a", "Joueur A") : t("bf_team_a", "Équipe A")}
                  </div>
                  <input type="number" value={handicapA} min={0} max={99} onChange={(e) => setHandicapA(clamp(Number(e.target.value || 0), 0, 99))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 850, marginBottom: 6 }}>
                    {mode === "1v1" ? t("bf_player_b", "Joueur B") : mode === "2v1" ? t("bf_player", "Joueur") : t("bf_team_b", "Équipe B")}
                  </div>
                  <input type="number" value={handicapB} min={0} max={99} onChange={(e) => setHandicapB(clamp(Number(e.target.value || 0), 0, 99))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }} />
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.70 }}>
                {t("bf_handicap_hint", "Handicap = malus : les buts de départ sont donnés à l’adversaire.")}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle("RÈGLES SPÉCIALES", primary)}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={pillStyle(rulesPreset === "competition", primary, primarySoft)} onClick={() => applyRulePreset("competition")}>RÈGLE DE COMPÉTITION</div>
            <div style={pillStyle(rulesPreset === "bar", primary, primarySoft)} onClick={() => applyRulePreset("bar")}>RÈGLE DE BAR</div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.4, marginBottom: 10 }}>
            Chaque bouton du scoring suit exactement ces réglages. Pissette interdite = tentative + refus, sans point. Gamelle / pêche peuvent être autorisées, interdites ou en stat seulement selon ta règle locale.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Demi</div>
              <select value={demiRule} onChange={(e) => setDemiRule(e.target.value as BabyFootDemiRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                {DEMI_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pissette</div>
              <select value={pissetteRule} onChange={(e) => setPissetteRule(e.target.value as BabyFootPissetteRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                {PISSETTE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Gamelle</div>
              <select value={gamelleRule} onChange={(e) => setGamelleRule(e.target.value as BabyFootGamelleRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                {GAMELLE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pêche offensive</div>
              <select value={pecheOffRule} onChange={(e) => setPecheOffRule(e.target.value as BabyFootPecheOffRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                {PECHE_OFF_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Pêche défensive</div>
              <select value={pecheDefRule} onChange={(e) => setPecheDefRule(e.target.value as BabyFootPecheDefRule)} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                {PECHE_DEF_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={pillStyle(allowRoulette, primary, primarySoft)} onClick={() => setAllowRoulette((v) => !v)}>Roulette {allowRoulette ? "ON" : "OFF"}</div>
            <div style={pillStyle(allowTacles, primary, primarySoft)} onClick={() => setAllowTacles((v) => !v)}>Tacles {allowTacles ? "ON" : "OFF"}</div>
            <div style={pillStyle(allowLobShot, primary, primarySoft)} onClick={() => setAllowLobShot((v) => !v)}>Parachute {allowLobShot ? "ON" : "OFF"}</div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
            Râteaux : interdits. Les variations choisies ici sont appliquées au score live et aux statistiques du match.
          </div>
        </div>

        {isChronoScore ? (
          <>
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 12,
                opacity: 0.92,
                fontWeight: 1000,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: primary,
              }}
            >
              {t("bf_timer", "CHRONO")}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <div style={pillStyle(!useTimer, primary, primarySoft)} onClick={() => setUseTimer(false)}>
                OFF
              </div>
              <div style={pillStyle(useTimer, primary, primarySoft)} onClick={() => setUseTimer(true)}>
                ON
              </div>
            </div>
          </div>

          {useTimer ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {t("bf_duration", "Durée")}
              </div>
              <select
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  padding: "12px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${primary}22`,
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                  fontWeight: 950,
                }}
              >
                {durationOptions.map((o) => (
                  <option key={o.value} value={o.value} style={{ color: "#111" }}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle("GOLDEN GOAL / PROLONGATION", primary)}
          <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45, marginBottom: 10 }}>
            En cas d’égalité à la fin du temps réglementaire, choisis soit un but en or immédiat, soit une prolongation chronométrée. Les deux sont exclusifs.
          </div>
          {!useTimer ? (
            <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>Active le chrono pour utiliser ces options.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={pillStyle(goldenGoal, primary, primarySoft)} onClick={toggleGoldenGoal}>Golden Goal {goldenGoal ? "ON" : "OFF"}</div>
                <div style={pillStyle(overtimeEnabled, primary, primarySoft)} onClick={toggleOvertime}>Prolongation {overtimeEnabled ? "ON" : "OFF"}</div>
                <div style={{ marginLeft: "auto" }}><div onClick={() => setInfoOpen(true)} style={iconBtnStyle()} title={t("info", "Info")}>?</div></div>
              </div>
              {overtimeEnabled ? (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>Durée de prolongation</div>
                  <select value={overtimeSec} onChange={(e) => updateOvertimeSec(Number(e.target.value))} style={{ width: "100%", borderRadius: 14, padding: "12px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${primary}22`, color: "rgba(255,255,255,0.92)", outline: "none", fontWeight: 950 }}>
                    {overtimeOptions.filter((o) => o.value > 0).map((o) => <option key={o.value} value={o.value} style={{ color: "#111" }}>{o.label}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
          )}
        </div>
          </>
        ) : null}

        </>
        )}
      </div>



      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          padding: "10px 12px 10px",
          background:
            "linear-gradient(180deg, rgba(6,7,12,0) 0%, rgba(6,7,12,0.75) 20%, rgba(6,7,12,0.96) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          zIndex: 999,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={resetConfig}
            style={{
              flex: "0 0 auto",
              borderRadius: 14,
              padding: "12px 12px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 950,
              letterSpacing: 0.3,
              cursor: "pointer",
            }}
          >
            {t("reset", "Reset")}
          </button>

          {showStartButton ? (
            <button
              onClick={applyAndStart}
              disabled={!canStart}
              style={{
                flex: 1,
                borderRadius: 14,
                padding: "12px 14px",
                background: !canStart
                  ? "rgba(255,255,255,0.08)"
                  : `linear-gradient(180deg, ${primary} 0%, ${primary}cc 100%)`,
                border: !canStart
                  ? "1px solid rgba(255,255,255,0.10)"
                  : `1px solid ${primary}aa`,
                color: !canStart ? "rgba(255,255,255,0.55)" : "#081018",
                fontWeight: 1000,
                letterSpacing: 0.4,
                boxShadow: !canStart
                  ? "none"
                  : `0 16px 40px rgba(0,0,0,0.45), 0 0 0 3px ${primary}18`,
                cursor: !canStart ? "not-allowed" : "pointer",
              }}
              title={!canStart ? t("bf_need_players", "Sélectionne les joueurs requis") : ""}
            >
              {t("start", "Démarrer")}
            </button>
          ) : null}
        </div>
      </div>

      <Modal
        open={infoOpen}
        title={t("bf_rules_info", "Golden Goal / Prolongation — explications")}
        onClose={() => setInfoOpen(false)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 1000, marginBottom: 4 }}>Golden Goal</div>
            <div style={{ opacity: 0.9 }}>
              À la fin du temps réglementaire, si le score est à égalité, <b>le prochain but termine le match</b>.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 1000, marginBottom: 4 }}>Prolongation</div>
            <div style={{ opacity: 0.9 }}>
              Si le match est à égalité, on ajoute une durée de prolongation. Si l’égalité reste parfaite au bout de cette durée, <b>la partie peut finir sur un match nul</b>.
            </div>
          </div>
          <div style={{ opacity: 0.78, fontSize: 12 }}>
            Golden Goal et Prolongation sont exclusifs : activer l’un désactive automatiquement l’autre.
          </div>
        </div>
      </Modal>

      <Modal
        open={createTeamOpen}
        title={t("bf_quick_create_team", "Créer une équipe")}
        onClose={() => setCreateTeamOpen(false)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900 }}>
            {t("bf_team_name", "Nom de l’équipe")}
          </div>
          <input
            value={createTeamName}
            onChange={(e) => setCreateTeamName(e.target.value)}
            placeholder={t("bf_team_name_ph", "Ex: Team Kraken")}
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "12px 12px",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${primary}22`,
              color: "rgba(255,255,255,0.92)",
              outline: "none",
              fontWeight: 900,
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900 }}>
            {t("bf_team_logo", "Logo (optionnel)")}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (!f) return;
              const rd = new FileReader();
              rd.onload = () => setCreateTeamLogo(String(rd.result || ""));
              rd.readAsDataURL(f);
            }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setCreateTeamOpen(false)}
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {t("cancel", "Annuler")}
            </button>
            <button
              type="button"
              onClick={createTeamCommit}
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                border: `1px solid ${primary}44`,
                background: `linear-gradient(180deg, ${primary}22, rgba(255,255,255,0.06))`,
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              {t("create", "Créer")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}