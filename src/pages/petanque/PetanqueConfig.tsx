// =============================================================
// src/pages/petanque/PetanqueConfig.tsx
// Config Pétanque — UI calquée sur X01ConfigV3 (cards + carrousel + pills)
// ✅ Sans BOTS IA
// ✅ Équipes auto A/B selon le mode (1v1, 2v2, 3v3, 4v4)
// ✅ NEW: HANDICAP/VARIANTES (équipes impaires) + presets
// ✅ NEW: Boules/joueur auto (compensation) + score auto (selon total boules/équipe)
// ✅ Params : score cible + mesurage autorisé
// ✅ NEW : InfoDot "i" alignés à droite (score officiel / début officiel)
// ✅ NEW : options départ (pile ou face / départ défini / boule la + proche amical)
// ✅ NEW : ordre des joueurs (libre / défini)
// ✅ NEW : rôles (Tireur / Pointeur 1 / Pointeur 2 / Polyvalent) indicatifs
// ✅ CTA sticky "Démarrer la partie"
// IMPORTANT: le bouton Démarrer fait : go("petanque.play", { cfg: config, mode: config.mode })
// ✅ NEW (Teams): sélection/creation d'équipes + logo (partagé avec Profiles > Teams via teamsStore)
// ✅ NEW (FFA3): mode solo 3 joueurs EXACTS, pas d’équipes (UI & payload)
// ✅ NEW (Singles SOLO): mode solo 2 joueurs EXACTS, pas d’équipes (UI & payload)
// =============================================================

import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import InfoDot from "../../components/InfoDot";

// ✅ NEW: Store unique Teams
import {
  loadTeamsBySport,
  createTeam,
  fileToDataUrl,
  type TeamEntity,
} from "../../lib/teamsStore";

type PetanqueModeId =
  | "singles"
  | "doublette"
  | "triplette"
  | "quadrette"
  | "ffa3" // ✅ NEW
  | "variants"
  | "handicap"
  | "training";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type TeamId = "A" | "B";

type StartRule = "toss" | "fixedA" | "fixedB" | "closest_boule";
type ThrowOrderRule = "free" | "fixed";

type PlayerRole = "tireur" | "pointeur1" | "pointeur2" | "polyvalent";

type VariantPresetKey = "1v2" | "2v3" | "3v4" | "4v3" | "3v2" | "2v1";

type PetanqueConfigPayload = {
  id: string;
  mode: PetanqueModeId;
  createdAt: number;

  targetScore: number;
  measurementAllowed: boolean;

  startRule: StartRule;
  throwOrderRule: ThrowOrderRule;
  roles: Record<string, PlayerRole>;

  // ✅ FFA3 / singles / training : pas d’équipes
  teams?: Array<{
    id: TeamId;
    name: string;
    color: string;
    playerIds: string[];
    ballsPerPlayer?: number[];
    // ✅ NEW: logo (optionnel)
    logoDataUrl?: string | null;
    // ✅ NEW: lien vers team store
    teamRefId?: string | null;
  }>;

  players: Array<{
    id: string;
    name: string;
    avatarDataUrl?: string | null;
  }>;

  variants?: {
    teamASize: number;
    teamBSize: number;
    ballsPerPlayerA: number[];
    ballsPerPlayerB: number[];
    autoCompensation: boolean;
    autoTargetScore: boolean;
    ballsPerTeam: number;
    preset?: VariantPresetKey;
  };
};

const TARGET_SCORES = [11, 13, 15, 21] as const;

const TEAM_LABELS: Record<TeamId, string> = { A: "Équipe A", B: "Équipe B" };
const TEAM_COLORS: Record<TeamId, string> = { A: "#f7c85c", B: "#ff4fa2" };

// ------------------------------------------------------------
// Profiles helpers (supporte store.profiles array OU {ids,byId})
// ------------------------------------------------------------
function safeStr(v: any, fallback: string) {
  return typeof v === "string" && v.trim().length ? v.trim() : fallback;
}

function extractProfiles(store: any): Profile[] {
  const p = store?.profiles;

  // Array direct
  if (Array.isArray(p)) return p as Profile[];

  // { ids, byId }
  if (p?.ids && Array.isArray(p.ids) && p?.byId) {
    return p.ids.map((id: string) => p.byId?.[id]).filter(Boolean);
  }

  return [];
}

// ------------------------------------------------------------
// Helpers règles joueurs / boules / score
// ------------------------------------------------------------
function requiredPlayersFixed(mode: PetanqueModeId) {
  if (mode === "singles") return 2;
  if (mode === "doublette") return 4;
  if (mode === "triplette") return 6;
  if (mode === "quadrette") return 8;
  if (mode === "ffa3") return 3; // ✅ NEW
  return 1;
}

function clampInt(n: any, min: number, max: number) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function presetToSizes(k: VariantPresetKey): { a: number; b: number } {
  switch (k) {
    case "1v2":
      return { a: 1, b: 2 };
    case "2v3":
      return { a: 2, b: 3 };
    case "3v4":
      return { a: 3, b: 4 };
    case "4v3":
      return { a: 4, b: 3 };
    case "3v2":
      return { a: 3, b: 2 };
    case "2v1":
      return { a: 2, b: 1 };
    default:
      return { a: 3, b: 2 };
  }
}

function ballsPerTeamForSizes(a: number, b: number) {
  const mx = Math.max(a, b);
  return mx >= 4 ? 8 : 6;
}

function distributeBalls(total: number, teamSize: number): number[] {
  const n = Math.max(1, teamSize);
  const base = Math.floor(total / n);
  let rem = total % n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(base + (rem > 0 ? 1 : 0));
    if (rem > 0) rem--;
  }
  return out;
}

function computeBalancedBalls(a: number, b: number) {
  const ballsPerTeam = ballsPerTeamForSizes(a, b);
  const ballsA = distributeBalls(ballsPerTeam, a);
  const ballsB = distributeBalls(ballsPerTeam, b);
  return { ballsPerTeam, ballsA, ballsB };
}

function targetScoreForBallsPerTeam(ballsPerTeam: number): number {
  if (ballsPerTeam >= 8) return 15;
  return 13;
}

function defaultBallsForMode(mode: PetanqueModeId, teamSize: number): number[] {
  if (mode === "triplette") return Array.from({ length: teamSize }, () => 2);
  if (mode === "quadrette") return Array.from({ length: teamSize }, () => 2);
  if (mode === "training") return Array.from({ length: Math.max(1, teamSize) }, () => 3);
  return Array.from({ length: teamSize }, () => 3);
}

// ------------------------------------------------------------

export default function PetanqueConfig({ store, go, params }: Props) {
  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx; // support ancien/new
  const { t } = useLang() as any;

  const rawMode = (params?.mode as string) || "singles";
  const mode: PetanqueModeId =
    rawMode === "simple"
      ? "singles"
      : rawMode === "ffa3"
      ? "ffa3"
      : rawMode === "variants"
      ? "variants"
      : rawMode === "handicap"
      ? "handicap"
      : (rawMode as PetanqueModeId);

  const isFfa3 = mode === "ffa3";
  const isVariants = mode === "variants" || mode === "handicap";

  // ✅ NEW: modes SOLO = pas d'équipes (UI & payload)
  const isSoloNoTeams = isFfa3 || mode === "singles";

  // ✅ Sans bots IA
  const profiles: Profile[] = React.useMemo(
    () => extractProfiles(store).filter((p: any) => !(p as any).isBot),
    [store]
  );

  // -------------------------
  // ✅ TEAMS (shared store)
  // -------------------------
  const [teamsCatalog, setTeamsCatalog] = React.useState<TeamEntity[]>(() =>
    loadTeamsBySport("petanque")
  );

  React.useEffect(() => {
    setTeamsCatalog(loadTeamsBySport("petanque"));
  }, []);

  const [teamARefId, setTeamARefId] = React.useState<string>("");
  const [teamBRefId, setTeamBRefId] = React.useState<string>("");

  // Modal create team
  const [teamModalOpen, setTeamModalOpen] = React.useState(false);
  const [teamModalSide, setTeamModalSide] = React.useState<TeamId>("A");
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamLogo, setNewTeamLogo] = React.useState<string | null>(null);
  const [teamCreateErr, setTeamCreateErr] = React.useState<string | null>(null);

  const openCreateTeam = (side: TeamId) => {
    setTeamModalSide(side);
    setNewTeamName("");
    setNewTeamLogo(null);
    setTeamCreateErr(null);
    setTeamModalOpen(true);
  };

  const onPickTeamLogo: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = await fileToDataUrl(f);
      setNewTeamLogo(data);
    } catch {
      setTeamCreateErr("Impossible de lire l’image.");
    }
  };

  const confirmCreateTeam = () => {
    const name = newTeamName.trim();
    if (!name) {
      setTeamCreateErr("Nom d’équipe requis.");
      return;
    }
    const created = createTeam({
      sport: "petanque",
      name,
      logoDataUrl: newTeamLogo ?? null,
    });
    const nextList = loadTeamsBySport("petanque");
    setTeamsCatalog(nextList);

    if (teamModalSide === "A") setTeamARefId(created.id);
    else setTeamBRefId(created.id);

    setTeamModalOpen(false);
  };

  const findTeam = (id: string) => teamsCatalog.find((t) => t.id === id) || null;

  const teamAObj = teamARefId ? findTeam(teamARefId) : null;
  const teamBObj = teamBRefId ? findTeam(teamBRefId) : null;

  // -------------------------
  // State variantes/handicap
  // -------------------------
  const [teamASizeState, setTeamASizeState] = React.useState<number>(3);
  const [teamBSizeState, setTeamBSizeState] = React.useState<number>(2);
  const [autoCompensation, setAutoCompensation] = React.useState<boolean>(true);
  const [autoTargetScore, setAutoTargetScore] = React.useState<boolean>(true);
  const [presetKey, setPresetKey] = React.useState<VariantPresetKey | null>("3v2");

  const [ballsPerPlayerA, setBallsPerPlayerA] = React.useState<number[]>([2, 2, 2]);
  const [ballsPerPlayerB, setBallsPerPlayerB] = React.useState<number[]>([3, 3]);
  const [ballsPerTeam, setBallsPerTeam] = React.useState<number>(6);

  const need = React.useMemo(() => {
    if (isFfa3) return 3; // ✅ FFA3 = 3 joueurs EXACTS
    if (isVariants) return Math.max(1, teamASizeState) + Math.max(1, teamBSizeState);
    return requiredPlayersFixed(mode);
  }, [isFfa3, isVariants, mode, teamASizeState, teamBSizeState]);

  // -------------------------
  // Paramètres
  // -------------------------
  const [targetScore, setTargetScore] = React.useState<number>(13);
  const [measurementAllowed, setMeasurementAllowed] = React.useState<boolean>(true);
  const [infoKey, setInfoKey] = React.useState<null | "score" | "start">(null);
  const [startRule, setStartRule] = React.useState<StartRule>("toss");
  const [throwOrderRule, setThrowOrderRule] = React.useState<ThrowOrderRule>("free");
  const [roles, setRoles] = React.useState<Record<string, PlayerRole>>({});

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    profiles.slice(0, need).map((p: any) => p.id)
  );

  // Init/reset quand le mode change
  React.useEffect(() => {
    // SOLO: on désactive tout le setup équipes/variants (UI masquée de toute façon)
    if (isSoloNoTeams) {
      setPresetKey(null);
      return;
    }

    if (mode === "quadrette") {
      setTeamASizeState(4);
      setTeamBSizeState(4);
      setAutoCompensation(false);
      setAutoTargetScore(false);
      setPresetKey(null);
      setBallsPerTeam(8);
      setBallsPerPlayerA([2, 2, 2, 2]);
      setBallsPerPlayerB([2, 2, 2, 2]);
      return;
    }

    if (isVariants) {
      const a = 3;
      const b = 2;
      setTeamASizeState(a);
      setTeamBSizeState(b);
      setAutoCompensation(true);
      setAutoTargetScore(true);
      setPresetKey("3v2");

      const bal = computeBalancedBalls(a, b);
      setBallsPerTeam(bal.ballsPerTeam);
      setBallsPerPlayerA(bal.ballsA);
      setBallsPerPlayerB(bal.ballsB);
      setTargetScore(targetScoreForBallsPerTeam(bal.ballsPerTeam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Sélection auto selon need
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const uniq = Array.from(new Set(prev));
      const take = uniq.slice(0, need);
      if (take.length === need) return take;
      const missing = need - take.length;
      const pool = profiles.map((p: any) => p.id).filter((id: string) => !take.includes(id));
      return [...take, ...pool.slice(0, Math.max(0, missing))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need, mode, profiles]);

  // Nettoyage roles
  React.useEffect(() => {
    setRoles((prev) => {
      const keep = new Set(selectedIds.slice(0, need));
      const next: Record<string, PlayerRole> = {};
      Object.keys(prev).forEach((k) => {
        if (keep.has(k)) next[k] = prev[k];
      });
      return next;
    });
  }, [selectedIds, need]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);

      if (mode === "training") {
        if (exists) return [];
        return [id];
      }

      if (exists) return prev.filter((x) => x !== id);

      // ✅ SOLO (singles & ffa3): max = need, si déjà plein => remplace le dernier
      if (isSoloNoTeams) {
        if (prev.length >= need) {
          const next = prev.slice(0, Math.max(0, need - 1));
          return [...next, id];
        }
        return [...prev, id];
      }

      // (team modes classiques)
      if (prev.length >= need) {
        const next = prev.slice(0, need - 1);
        return [...next, id];
      }
      return [...prev, id];
    });
  }

  const canStart = React.useMemo(() => {
    if (mode === "training") return selectedIds.length === 1;
    if (isFfa3) return selectedIds.length === 3; // ✅ EXACT 3
    // singles: need=2 => exact 2 via règle générale
    return selectedIds.length === need;
  }, [mode, isFfa3, selectedIds.length, need]);

  // En SOLO, on ne veut pas de logique équipe A/B (mais on garde les tailles pour les autres modes)
  const teamASize = isVariants
    ? clampInt(teamASizeState, 1, 4)
    : mode === "training"
    ? 1
    : Math.floor(need / 2);

  const teamBSize =
    mode === "training"
      ? 0
      : isVariants
      ? clampInt(teamBSizeState, 1, 4)
      : need - Math.floor(need / 2);

  function recalcVariants(
    a: number,
    b: number,
    nextAutoComp = autoCompensation,
    nextAutoScore = autoTargetScore
  ) {
    if (!nextAutoComp) return;
    const bal = computeBalancedBalls(a, b);
    setBallsPerTeam(bal.ballsPerTeam);
    setBallsPerPlayerA(bal.ballsA);
    setBallsPerPlayerB(bal.ballsB);
    if (nextAutoScore) setTargetScore(targetScoreForBallsPerTeam(bal.ballsPerTeam));
  }

  function applyPreset(k: VariantPresetKey) {
    const { a, b } = presetToSizes(k);
    setPresetKey(k);
    setTeamASizeState(a);
    setTeamBSizeState(b);
    setAutoCompensation(true);
    recalcVariants(a, b, true, autoTargetScore);
  }

  const teams = React.useMemo(() => {
    const aCount = teamASize;
    const bCount = teamBSize;

    const a = selectedIds.slice(0, aCount);
    const b = selectedIds.slice(aCount, aCount + bCount);

    let ballsA: number[] | undefined;
    let ballsB: number[] | undefined;

    if (isVariants) {
      ballsA = ballsPerPlayerA.slice(0, aCount);
      ballsB = ballsPerPlayerB.slice(0, bCount);
    } else if (mode !== "training") {
      ballsA = defaultBallsForMode(mode, aCount);
      ballsB = defaultBallsForMode(mode, bCount);
    }

    const aName = teamAObj?.name?.trim() ? teamAObj.name.trim() : TEAM_LABELS.A;
    const bName = teamBObj?.name?.trim() ? teamBObj.name.trim() : TEAM_LABELS.B;

    return [
      {
        id: "A" as TeamId,
        name: aName,
        color: TEAM_COLORS.A,
        playerIds: a,
        ballsPerPlayer: ballsA,
        logoDataUrl: teamAObj?.logoDataUrl ?? null,
        teamRefId: teamAObj?.id ?? null,
      },
      {
        id: "B" as TeamId,
        name: bName,
        color: TEAM_COLORS.B,
        playerIds: b,
        ballsPerPlayer: ballsB,
        logoDataUrl: teamBObj?.logoDataUrl ?? null,
        teamRefId: teamBObj?.id ?? null,
      },
    ];
  }, [
    selectedIds,
    teamASize,
    teamBSize,
    mode,
    isVariants,
    ballsPerPlayerA,
    ballsPerPlayerB,
    teamAObj,
    teamBObj,
  ]);

  function handleStart() {
    if (!canStart) {
      alert(
        mode === "training"
          ? t("petanque.config.needOne", "Sélectionne 1 joueur pour l'entraînement.")
          : isSoloNoTeams
          ? mode === "singles"
            ? t("petanque.config.needTwo", "Sélectionne exactement 2 joueurs (J1/J2).")
            : t("petanque.config.needThree", "Sélectionne exactement 3 joueurs (J1/J2/J3).")
          : t("petanque.config.needPlayers", `Sélectionne ${need} joueurs.`)
      );
      return;
    }

    const players = selectedIds
      .slice(0, need)
      .map((id) => profiles.find((p: any) => (p as any).id === id))
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: safeStr(p.displayName, "") || safeStr(p.name, "Joueur"),
        avatarDataUrl: p.avatarDataUrl ?? p.avatarUrl ?? null,
      }));

    const config: PetanqueConfigPayload = {
      id: `petanque-${Date.now()}`,
      mode,
      createdAt: Date.now(),
      targetScore: Math.max(1, Math.min(99, Math.floor(Number(targetScore) || 13))),
      measurementAllowed: !!measurementAllowed,
      startRule,
      throwOrderRule,
      roles,
      // ✅ SOLO/training: pas d'équipes dans le payload
      teams: isSoloNoTeams || mode === "training" ? undefined : teams,
      players,
      variants:
        isVariants && !isSoloNoTeams
          ? {
              teamASize,
              teamBSize,
              ballsPerPlayerA: ballsPerPlayerA.slice(0, teamASize),
              ballsPerPlayerB: ballsPerPlayerB.slice(0, teamBSize),
              autoCompensation,
              autoTargetScore,
              ballsPerTeam,
              preset: presetKey ?? undefined,
            }
          : undefined,
    };

    go("petanque.play" as any, { cfg: config, mode: config.mode });
  }

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  function LabelRow({
    label,
    info,
    onInfo,
  }: {
    label: React.ReactNode;
    info?: boolean;
    onInfo?: (ev?: any) => void;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "#c8cbe4" }}>{label}</div>
        <div style={{ marginLeft: "auto" }}>
          {info ? (
            <InfoDot
              onClick={(ev: any) => {
                ev?.stopPropagation?.();
                onInfo?.(ev);
              }}
              glow={(theme?.primary ?? primary) + "88"}
            />
          ) : null}
        </div>
      </div>
    );
  }

  const TeamSelectRow = ({
    side,
    value,
    onChange,
  }: {
    side: TeamId;
    value: string;
    onChange: (id: string) => void;
  }) => {
    const tm = value ? findTeam(value) : null;

    return (
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 12,
            color: "#c8cbe4",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 900, color: side === "A" ? TEAM_COLORS.A : TEAM_COLORS.B }}>
            {side === "A" ? "Équipe A" : "Équipe B"}
          </span>
          {tm?.logoDataUrl ? (
            <img
              src={tm.logoDataUrl}
              alt="logo"
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            />
          ) : null}
        </div>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(9,11,20,0.85)",
            color: "#e9ecff",
            outline: "none",
          }}
        >
          <option value="">{t("petanque.team.none", "— Nommer plus tard —")}</option>
          {teamsCatalog.map((tme) => (
            <option key={tme.id} value={tme.id}>
              {tme.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => openCreateTeam(side)}
            style={{
              padding: "7px 10px",
              borderRadius: 12,
              border: `1px solid ${primary}55`,
              background: "rgba(255,255,255,0.04)",
              color: "#e9ecff",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 0.7,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {t("petanque.team.create", "Créer")}
          </button>

          <button
            type="button"
            onClick={() => {
              setTeamsCatalog(loadTeamsBySport("petanque"));
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(9,11,20,0.75)",
              color: "#cfd2e8",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 0.7,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
            title="Rafraîchir la liste d'équipes"
          >
            ↻ {t("common.refresh", "Maj")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="screen petanque-config-screen"
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
      <header style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => go("petanque_menu" as any)}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(10,12,24,0.9)",
              color: "#f5f5f5",
              padding: "5px 10px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>{t("common.back", "Retour")}</span>
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, color: primary, textTransform: "uppercase" }}>
            {t("petanque.config.title", "Configuration")}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: "#d9d9e4", marginTop: 2 }}>
            {t("petanque.config.subtitle", "Prépare ta partie avant de commencer.")}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#b8bdd8" }}>
            {t("petanque.config.mode", "Mode")} : <b style={{ color: "#fff" }}>{mode}</b>
          </div>

          {isSoloNoTeams && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#9ea3bf" }}>
              {mode === "singles"
                ? t("petanque.config.singlesSoloHint", "Singles : mode solo — sélectionne exactement 2 joueurs (J1/J2).")
                : t("petanque.config.ffa3Hint", "FFA3 : mode solo — sélectionne exactement 3 joueurs (J1/J2/J3).")}
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* JOUEURS */}
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
            {t("petanque.config.players", "Joueurs")}
          </div>

          {/* ✅ Équipes (noms & logos) — MASQUÉ en SOLO */}
          {mode !== "training" && !isSoloNoTeams && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.9, textTransform: "uppercase", color: primary }}>
                  {t("petanque.config.teamsNames", "Équipes (noms & logos)")}
                </div>
                <div style={{ fontSize: 11, color: "#9ea3bf" }}>
                  {t("petanque.config.teamsNamesHint", "Partagé avec Profils > Teams")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <TeamSelectRow side="A" value={teamARefId} onChange={setTeamARefId} />
                <TeamSelectRow side="B" value={teamBRefId} onChange={setTeamBRefId} />
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#9ea3bf" }}>
                {t(
                  "petanque.config.teamsNamesNote",
                  "Astuce: si tu crées une équipe ici, elle apparaîtra automatiquement dans Profils > Teams (même store)."
                )}
              </div>
            </div>
          )}

          {/* VARIANTES / HANDICAP — MASQUÉ en SOLO */}
          {isVariants && !isSoloNoTeams && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.9, textTransform: "uppercase", color: primary }}>
                  {t("petanque.variants.title", "Variantes (équipes impaires)")}
                </div>
                <div style={{ fontSize: 11, color: "#9ea3bf" }}>{t("petanque.variants.hint", "Presets + compensation boules")}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {(["1v2", "2v3", "3v4", "4v3", "3v2", "2v1"] as VariantPresetKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => applyPreset(k)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: presetKey === k ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.12)",
                      background: presetKey === k ? primarySoft : "rgba(9,11,20,0.85)",
                      color: "#e9ecff",
                      fontWeight: 900,
                      fontSize: 11,
                      letterSpacing: 0.9,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#d0d3ea" }}>
                  <input
                    type="checkbox"
                    checked={autoCompensation}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAutoCompensation(next);
                      if (next) recalcVariants(teamASizeState, teamBSizeState, true, autoTargetScore);
                    }}
                  />
                  {t("petanque.variants.autoComp", "Auto compensation (boules)")}
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#d0d3ea" }}>
                  <input
                    type="checkbox"
                    checked={autoTargetScore}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAutoTargetScore(next);
                      if (next && autoCompensation) recalcVariants(teamASizeState, teamBSizeState, true, true);
                    }}
                  />
                  {t("petanque.variants.autoScore", "Score auto (selon boules/équipe)")}
                </label>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ flex: 1, fontSize: 12, color: "#c8cbe4" }}>
                  {t("petanque.variants.sizeA", "Taille Équipe A")}
                  <select
                    value={teamASizeState}
                    onChange={(e) => {
                      const a = clampInt(e.target.value, 1, 4);
                      setTeamASizeState(a);
                      setPresetKey(null);
                      recalcVariants(a, teamBSizeState);
                    }}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(9,11,20,0.85)",
                      color: "#e9ecff",
                      outline: "none",
                    }}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>

                <label style={{ flex: 1, fontSize: 12, color: "#c8cbe4" }}>
                  {t("petanque.variants.sizeB", "Taille Équipe B")}
                  <select
                    value={teamBSizeState}
                    onChange={(e) => {
                      const b = clampInt(e.target.value, 1, 4);
                      setTeamBSizeState(b);
                      setPresetKey(null);
                      recalcVariants(teamASizeState, b);
                    }}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(9,11,20,0.85)",
                      color: "#e9ecff",
                      outline: "none",
                    }}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#9ea3bf" }}>
                {t("petanque.variants.ballsTeam", "Boules / équipe")} :{" "}
                <b style={{ color: "#e9ecff" }}>{ballsPerTeam}</b> <span style={{ opacity: 0.9 }}>•</span>{" "}
                {t("petanque.variants.ballsPlayer", "Boules / joueur")} — A:{" "}
                <b style={{ color: "#e9ecff" }}>{ballsPerPlayerA.slice(0, teamASizeState).join("-") || "-"}</b> | B:{" "}
                <b style={{ color: "#e9ecff" }}>{ballsPerPlayerB.slice(0, teamBSizeState).join("-") || "-"}</b>
              </div>
            </div>
          )}

          {profiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
              {t("petanque.config.noProfiles", "Aucun profil local. Crée des joueurs dans Profils.")}
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
                {profiles.map((p: any) => {
                  const active = selectedIds.includes(p.id);

                  // ✅ SOLO: halo unique + badge J1/J2(/J3) (pas A/B)
                  let halo = primary;
                  if (!isSoloNoTeams && mode !== "training") {
                    const idx = selectedIds.indexOf(p.id);
                    if (idx >= 0) halo = idx < teamASize ? TEAM_COLORS.A : TEAM_COLORS.B;
                  }

                  const displayName =
                    safeStr(p.displayName, "") || safeStr(p.name, "") || safeStr(p.nickname, "") || "Profil";

                  const soloRank = isSoloNoTeams ? selectedIds.indexOf(p.id) : -1;

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
                          boxShadow: active ? `0 0 28px ${halo}aa` : "0 0 14px rgba(0,0,0,0.65)",
                          background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${halo})` : "#111320",
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
                        {displayName}
                      </div>

                      {/* Badge position */}
                      {mode !== "training" && active && (
                        <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                          {isSoloNoTeams ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 9,
                                fontWeight: 900,
                                letterSpacing: 0.7,
                                textTransform: "uppercase",
                                background: `radial-gradient(circle at 30% 0, ${primary}, #ffe9a3)`,
                                color: "#020611",
                                boxShadow: "0 0 10px rgba(0,0,0,0.55)",
                                border: "1px solid rgba(255,255,255,0.35)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {soloRank >= 0 ? `J${soloRank + 1}` : "J"}
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 9,
                                fontWeight: 900,
                                letterSpacing: 0.7,
                                textTransform: "uppercase",
                                background:
                                  selectedIds.indexOf(p.id) < teamASize
                                    ? `radial-gradient(circle at 30% 0, ${TEAM_COLORS.A}, #ffe9a3)`
                                    : `radial-gradient(circle at 30% 0, ${TEAM_COLORS.B}, #ffd1e6)`,
                                color: "#020611",
                                boxShadow: "0 0 10px rgba(0,0,0,0.55)",
                                border: "1px solid rgba(255,255,255,0.35)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {selectedIds.indexOf(p.id) < teamASize ? "A" : "B"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                {mode === "training"
                  ? t("petanque.config.hintTraining", "Sélectionne 1 joueur.")
                  : isSoloNoTeams
                  ? mode === "singles"
                    ? t("petanque.config.hintSingles", "Sélectionne exactement 2 joueurs (J1/J2).")
                    : t("petanque.config.hintFfa3", "Sélectionne exactement 3 joueurs (J1/J2/J3).")
                  : t("petanque.config.hint", `Sélectionne exactement ${need} joueurs.`)}
              </p>
            </>
          )}
        </section>

        {/* PARAMÈTRES */}
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
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
            {t("petanque.config.params", "Paramètres")}
          </h3>

          <div style={{ marginBottom: 12 }}>
            <LabelRow label={t("petanque.config.targetScore", "Score cible")} info onInfo={() => setInfoKey("score")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TARGET_SCORES.map((s) => (
                <PillButton
                  key={s}
                  label={String(s)}
                  active={targetScore === s}
                  onClick={() => setTargetScore(s)}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              ))}
              <PillButton
                label={t("petanque.config.custom13", "13 (def)")}
                active={targetScore === 13}
                onClick={() => setTargetScore(13)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.startRule", "Début de partie")} info onInfo={() => setInfoKey("start")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("petanque.config.start.toss", "Pile ou face (officiel)")}
                active={startRule === "toss"}
                onClick={() => setStartRule("toss")}
                primary={primary}
                primarySoft={primarySoft}
              />

              {/* ✅ SOLO: on masque “Départ équipe A/B” */}
              {!isSoloNoTeams && (
                <>
                  <PillButton
                    label={t("petanque.config.start.fixedA", "Départ Équipe A")}
                    active={startRule === "fixedA"}
                    onClick={() => setStartRule("fixedA")}
                    primary={primary}
                    primarySoft={primarySoft}
                    compact
                  />
                  <PillButton
                    label={t("petanque.config.start.fixedB", "Départ Équipe B")}
                    active={startRule === "fixedB"}
                    onClick={() => setStartRule("fixedB")}
                    primary={primary}
                    primarySoft={primarySoft}
                    compact
                  />
                </>
              )}

              <PillButton
                label={t("petanque.config.start.closest", "Boule la + proche (amical)")}
                active={startRule === "closest_boule"}
                onClick={() => setStartRule("closest_boule")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.throwOrder", "Ordre des joueurs")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("petanque.config.throwOrder.free", "Libre (compétition)")}
                active={throwOrderRule === "free"}
                onClick={() => setThrowOrderRule("free")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("petanque.config.throwOrder.fixed", "Défini")}
                active={throwOrderRule === "fixed"}
                onClick={() => setThrowOrderRule("fixed")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              {t(
                "petanque.config.throwOrderHint",
                "En compétition l’ordre est généralement libre (l’équipe s’organise). “Défini” sert surtout en amical."
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.measure", "Mesurage")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.on", "ON")}
                active={measurementAllowed === true}
                onClick={() => setMeasurementAllowed(true)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.off", "OFF")}
                active={measurementAllowed === false}
                onClick={() => setMeasurementAllowed(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              {t("petanque.config.measureHint", "Autorise l'ajout de mesures (manuel / photo / live) pendant la partie.")}
            </div>
          </div>
        </section>

        {/* RÔLES */}
        {canStart && (
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
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
              {t("petanque.config.roles", "Rôles (indicatif)")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedIds.slice(0, need).map((pid) => {
                const p: any = profiles.find((x: any) => x.id === pid);
                if (!p) return null;
                const v: PlayerRole = roles[pid] ?? "polyvalent";
                const name = safeStr(p.displayName, "") || safeStr(p.name, "") || safeStr(p.nickname, "") || "Profil";

                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ProfileAvatar profile={p} size={26} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{name}</span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {(["tireur", "pointeur1", "pointeur2", "polyvalent"] as const).map((r) => (
                        <PillButton
                          key={r}
                          label={
                            r === "tireur"
                              ? t("petanque.role.shooter", "Tireur")
                              : r === "pointeur1"
                              ? t("petanque.role.pointer1", "Pointeur 1")
                              : r === "pointeur2"
                              ? t("petanque.role.pointer2", "Pointeur 2")
                              : t("petanque.role.flex", "Polyvalent")
                          }
                          active={v === r}
                          onClick={() => setRoles((prev) => ({ ...prev, [pid]: r }))}
                          primary={primary}
                          primarySoft={primarySoft}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {t("petanque.config.rolesHint", "Ces rôles sont indicatifs et servent de repère (pas une règle de lancer).")}
            </div>
          </section>
        )}

        {/* RÉCAP ÉQUIPES — MASQUÉ en SOLO */}
        {mode !== "training" && !isSoloNoTeams && (
          <section
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: 12,
              marginBottom: 80,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
              {t("petanque.config.teams", "Équipes")}
            </h3>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {teams.map((tm) => {
                const expected = tm.id === "A" ? teamASize : teamBSize;

                return (
                  <div
                    key={tm.id}
                    style={{
                      flex: "1 1 160px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {tm.logoDataUrl ? (
                          <img
                            src={tm.logoDataUrl}
                            alt="logo"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              objectFit: "cover",
                              border: "1px solid rgba(255,255,255,0.18)",
                            }}
                          />
                        ) : null}
                        <div style={{ fontWeight: 900, color: tm.color, letterSpacing: 0.8, textTransform: "uppercase", fontSize: 12 }}>
                          {tm.name}
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: `1px solid ${tm.color}88`,
                          background: "rgba(0,0,0,0.25)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        {tm.playerIds.length} / {expected}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {tm.playerIds.map((pid, idx) => {
                        const p: any = profiles.find((x: any) => x.id === pid);
                        if (!p) return null;

                        const role = roles[pid] ?? "polyvalent";
                        const roleLabel = role === "tireur" ? "T" : role === "pointeur1" ? "P1" : role === "pointeur2" ? "P2" : "↔";
                        const balls = tm.ballsPerPlayer?.[idx];
                        const name = safeStr(p.displayName, "") || safeStr(p.name, "") || safeStr(p.nickname, "") || "Profil";

                        return (
                          <div key={pid} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <ProfileAvatar profile={p} size={26} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#e9ecff" }}>{name}</span>

                            <span
                              style={{
                                marginLeft: 2,
                                padding: "2px 6px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 900,
                                border: "1px solid rgba(255,255,255,0.16)",
                                background: "rgba(0,0,0,0.25)",
                                color: "#fff",
                              }}
                              title="Rôle indicatif"
                            >
                              {roleLabel}
                            </span>

                            {typeof balls === "number" && (
                              <span
                                style={{
                                  marginLeft: 2,
                                  padding: "2px 6px",
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 900,
                                  border: "1px solid rgba(255,255,255,0.14)",
                                  background: "rgba(255,255,255,0.06)",
                                  color: "#e9ecff",
                                }}
                                title="Boules / joueur"
                              >
                                {balls}B
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* CTA sticky */}
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
            {t("petanque.config.start", "Démarrer la partie")}
          </button>
        </div>
      </div>

      {/* Overlay infos */}
      {infoKey && (
        <div
          onClick={() => setInfoKey(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              margin: 16,
              padding: 16,
              borderRadius: 18,
              background: theme?.card ?? cardBg,
              border: `1px solid ${theme?.primary ? theme.primary + "55" : "rgba(247,200,92,0.35)"}`,
              color: theme?.text ?? "#fff",
              boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
            }}
          >
            {infoKey === "score" && (
              <>
                <div style={{ fontWeight: 900, color: theme?.primary ?? primary, marginBottom: 8, textTransform: "uppercase" }}>
                  Score officiel
                </div>
                <div style={{ fontSize: 13, color: theme?.textSoft ?? "#cfd2e8", lineHeight: 1.35 }}>
                  En compétition, une partie se joue en général en <b>13 points</b>. Certains formats peuvent être joués en <b>11</b>. Les autres
                  valeurs sont surtout pour l’amical.
                  <br />
                  <br />
                  En <b>Variantes</b>, tu peux activer “Score auto” (basé sur le total de boules/équipe) puis ajuster si besoin.
                </div>
              </>
            )}

            {infoKey === "start" && (
              <>
                <div style={{ fontWeight: 900, color: theme?.primary ?? primary, marginBottom: 8, textTransform: "uppercase" }}>
                  Début de partie
                </div>
                <div style={{ fontSize: 13, color: theme?.textSoft ?? "#cfd2e8", lineHeight: 1.35 }}>
                  En compétition, le début se fait par <b>tirage au sort (pile ou face)</b> pour déterminer qui commence (et lance le but en premier).
                </div>
              </>
            )}

            <button
              onClick={() => setInfoKey(null)}
              style={{
                marginTop: 12,
                borderRadius: 999,
                border: "none",
                background: theme?.primary ?? primary,
                color: "#000",
                padding: "6px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ✅ Modal create team — MASQUÉ en SOLO */}
      {teamModalOpen && !isSoloNoTeams && (
        <div
          onClick={() => setTeamModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, calc(100vw - 24px))",
              borderRadius: 18,
              background: cardBg,
              border: `1px solid rgba(255,255,255,0.10)`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
              padding: 14,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", color: primary }}>
                Créer une équipe ({teamModalSide})
              </div>
              <button
                onClick={() => setTeamModalOpen(false)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Fermer
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#b8bdd8", marginBottom: 8 }}>
              L’équipe sera ajoutée au store Teams, donc visible aussi dans Profils &gt; Teams.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Nom d’équipe</div>
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ex: Les Dieux de la Pétanque"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(9,11,20,0.85)",
                    color: "#fff",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Logo (optionnel)</div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#e9ecff",
                  }}
                >
                  Choisir un fichier
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onPickTeamLogo} />
                </label>

                {newTeamLogo ? (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={newTeamLogo}
                      alt="logo"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        objectFit: "cover",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewTeamLogo(null)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(9,11,20,0.75)",
                        color: "#cfd2e8",
                        fontWeight: 900,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        fontSize: 11,
                      }}
                    >
                      Retirer
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {teamCreateErr && <div style={{ marginTop: 10, color: "#ff8a8a", fontSize: 12, fontWeight: 800 }}>{teamCreateErr}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setTeamModalOpen(false)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Annuler
              </button>

              <button
                onClick={confirmCreateTeam}
                style={{
                  borderRadius: 12,
                  border: "none",
                  background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
                  color: "#151515",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 1000,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ UI helpers ------------------ */

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
  const border = isDisabled ? "1px solid rgba(255,255,255,0.04)" : active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.07)";
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
