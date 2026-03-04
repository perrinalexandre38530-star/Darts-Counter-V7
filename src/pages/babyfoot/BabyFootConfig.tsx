// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Baby-Foot — Config (LOCAL)
// Objectif: rendu + UX calqués sur X01ConfigV3 (DartsCounter)
// ✅ Presets depuis menus (MATCH / FUN / TRAINING / DÉFIS) -> config spécifique par carte
// ✅ Sélection ÉQUIPES via catalogue (Profils > Teams) en carrousel (flèches)
// ✅ Sélection JOUEURS par camp en carrousel (flèches) + quota strict (1v1/2v2/2v1)
// ✅ Règles épurées:
//    - Sets ON/OFF au-dessus
//    - Score cible via dropdown (5 ou 10)
//    - BO1/BO3/BO5 sur une seule ligne (si Sets ON)
// ✅ Chrono épuré:
//    - Durée dropdown (3/5/7/10 min)
//    - Prolongation dropdown (Aucune / 30 / 60 / 90 sec)
// ✅ Golden Goal + OT Golden Goal avec bouton info (modal)
// ✅ Options chrono:
//    - Match nul à la fin du temps réglementaire (si chrono ON)
//    - Victoire par 2 buts d'écart (hors contrainte temps)
// ✅ Handicap toujours dispo (même en chrono)
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

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
  setTarget,
  setTeams,
  setTeamsProfiles,
  setAdvancedOptions,
  startMatch,
  type BabyFootMode,
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
    boxShadow: active ? `0 10px 22px rgba(0,0,0,0.30), 0 0 0 2px ${primary}22` : "none",
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
      <div style={{ fontSize: 18, opacity: 0.95 }}>{dir === "left" ? "‹" : "›"}</div>
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
            <div onClick={onClose} style={{ ...iconBtnStyle(), width: 32, height: 32 }}>
              ✕
            </div>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92 }}>{children}</div>
      </div>
    </div>
  );
}

function TeamAvatar({ team, primary }: { team: BabyFootTeam | null; primary: string }) {
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
          <img src={logo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontWeight: 1000, opacity: 0.92, letterSpacing: 1 }}>{initials || "—"}</div>
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
    <div style={{ width: 92, display: "grid", justifyItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 999,
          overflow: "hidden",
          border: selected ? `2px solid ${primary}aa` : "1px solid rgba(255,255,255,0.12)",
          boxShadow: selected
            ? `0 12px 30px rgba(0,0,0,0.40), 0 0 0 3px ${primary}22`
            : "0 12px 28px rgba(0,0,0,0.35)",
          background: "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {avatar ? (
          <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontWeight: 1000, opacity: 0.9 }}>{String(name).slice(0, 1).toUpperCase()}</div>
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

  // Teams catalog (Profils > Teams)
  const [teamsCatalog, setTeamsCatalog] = useState<BabyFootTeam[]>(() => loadBabyFootTeams());
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTeamsCatalog(loadBabyFootTeams());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // -------------------------
  // Presets / routing hints
  // -------------------------
  const routeModeId = (params as any)?.mode as string | undefined;

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
    (typeof routeModeId === "string" && routeModeId.startsWith("match_") ? "match" : undefined) ??
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

  const presetSetsEnabled =
    (params as any)?.presetSetsEnabled ??
    ((params as any)?.presetBestOf ? true : undefined) ??
    ((params as any)?.presetSetTarget ? true : undefined);
  const presetBestOf = (params as any)?.presetBestOf as (1 | 3 | 5) | undefined;
  const presetSetTarget = (params as any)?.presetSetTarget as number | undefined;

  const presetHandicapA = (params as any)?.presetHandicapA as number | undefined;
  const presetHandicapB = (params as any)?.presetHandicapB as number | undefined;

  // -------------------------
  // UI state
  // -------------------------
  const [mode, setModeUI] = useState<BabyFootMode>(presetMode || routeModeFromId || saved.mode || "1v1");

  const [teamARefId, setTeamARefId] = useState<string>((saved as any)?.teamARefId ? String((saved as any).teamARefId) : "");
  const [teamBRefId, setTeamBRefId] = useState<string>((saved as any)?.teamBRefId ? String((saved as any).teamBRefId) : "");

  const [target, setTargetUI] = useState<number>(presetTarget ?? saved.target ?? 10);

  const [useTimer, setUseTimer] = useState<boolean>(
    (Number.isFinite(Number(presetTimerSec)) && Number(presetTimerSec) > 0) ||
      (Number.isFinite((saved as any).matchDurationSec) && (saved as any).matchDurationSec > 0)
  );
  const [durationSec, setDurationSec] = useState<number>(
    clamp(Number(presetTimerSec ?? (saved as any).matchDurationSec ?? 180), 15, 60 * 30)
  );

  const [overtimeSec, setOvertimeSec] = useState<number>(clamp(Number((saved as any).overtimeSec ?? 60), 0, 60 * 10));

  const [goldenGoal, setGoldenGoal] = useState<boolean>(presetGoldenGoal !== undefined ? !!presetGoldenGoal : !!(saved as any).goldenGoal);
  const [overtimeGoldenGoal, setOvertimeGoldenGoal] = useState<boolean>((saved as any).overtimeGoldenGoal === undefined ? true : !!(saved as any).overtimeGoldenGoal);

  const [setsEnabled, setSetsEnabled] = useState<boolean>(!!(presetSetsEnabled ?? (saved as any).setsEnabled));
  const [setsBestOf, setSetsBestOf] = useState<1 | 3 | 5>(
    (((presetBestOf ?? (saved as any).setsBestOf ?? 3) === 5 ? 5 : (presetBestOf ?? (saved as any).setsBestOf ?? 3) === 1 ? 1 : 3) as any) as 1 | 3 | 5
  );
  const [setTarget, setSetTarget] = useState<number>(clamp(Number(presetSetTarget ?? (saved as any).setTarget ?? 5), 1, 30));

  const [handicapA, setHandicapA] = useState<number>(clamp(Number(presetHandicapA ?? (saved as any).handicapA ?? 0), 0, 99));
  const [handicapB, setHandicapB] = useState<number>(clamp(Number(presetHandicapB ?? (saved as any).handicapB ?? 0), 0, 99));

  // Align with babyfootStore fields
  const [allowDrawOnTimeEnd, setAllowDrawOnTimeEnd] = useState<boolean>(
    (saved as any).allowDrawOnTimeEnd !== undefined ? !!(saved as any).allowDrawOnTimeEnd : true
  );
  const [requireTwoGoalLead, setRequireTwoGoalLead] = useState<boolean>(
    (saved as any).requireTwoGoalLead !== undefined ? !!(saved as any).requireTwoGoalLead : false
  );

  const [selA, setSelA] = useState<string[]>(Array.isArray(saved.teamAProfileIds) ? saved.teamAProfileIds : []);
  const [selB, setSelB] = useState<string[]>(Array.isArray(saved.teamBProfileIds) ? saved.teamBProfileIds : []);

  // When a side is "locked", we hide the carousel and display only the selected players.
  const [lockPlayersA, setLockPlayersA] = useState(false);
  const [lockPlayersB, setLockPlayersB] = useState(false);

  const capA = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const capB = mode === "2v2" ? 2 : 1;

  const showTeamsPicker = mode === "2v2" || mode === "2v1";
  const showTeamsPickerB = mode === "2v2"; // 2v1: équipe uniquement côté A (côté "2 joueurs")

  const profiles: Profile[] = ((store as any)?.profiles || []) as Profile[];

  // Header ticker
  const headerTickerId = routeVariant || (routeCategory ? `${routeCategory}_${mode}` : null) || `babyfoot_${mode}`;
  const headerTicker = pickTicker(headerTickerId) || pickTicker(`babyfoot_${mode}`) || null;

  // Teams helpers
  const findTeam = (id: string) => teamsCatalog.find((x) => x.id === id) ?? null;
  const teamAObj = teamARefId ? findTeam(teamARefId) : null;
  const teamBObj = teamBRefId ? findTeam(teamBRefId) : null;

  // En 2v1, on ne garde pas de "team B" (c'est un joueur solo)
  useEffect(() => {
    if (mode === "2v1" && teamBRefId) setTeamBRefId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Default teams for team modes: GOLD vs PINK (avoid placeholder)
  useEffect(() => {
    if (!showTeamsPicker) return;
    if (!Array.isArray(teamsCatalog) || teamsCatalog.length === 0) return;

    const byName = (needle: string) =>
      teamsCatalog.find((t) => String(t?.name || "").trim().toLowerCase() === needle) ||
      teamsCatalog.find((t) => String(t?.name || "").trim().toLowerCase().includes(needle));

    const gold = byName("team gold") || teamsCatalog.find((t) => String(t?.id || "") === "bf-team-gold");
    const pink = byName("team pink") || teamsCatalog.find((t) => String(t?.id || "") === "bf-team-pink");

    const defA = gold?.id || teamsCatalog[0]?.id || "";
    const defB = pink?.id || teamsCatalog.find((t) => t?.id && t.id !== defA)?.id || defA || "";

    if (!teamARefId && defA) setTeamARefId(String(defA));
    if (mode === "2v2" && !teamBRefId && defB) setTeamBRefId(String(defB));
  }, [showTeamsPicker, teamsCatalog, teamARefId, teamBRefId, mode]);

  // En 2v2: l'équipe sélectionnée côté A ne doit jamais être proposée / sélectionnée côté B (et inversement)
  useEffect(() => {
    if (!showTeamsPicker) return;
    if (mode !== "2v2") return;
    if (!teamARefId || !teamBRefId) return;
    if (teamARefId !== teamBRefId) return;
    const nextB = teamsCatalog.find((t) => t?.id && t.id !== teamARefId);
    if (nextB?.id) setTeamBRefId(String(nextB.id));
  }, [showTeamsPicker, mode, teamARefId, teamBRefId, teamsCatalog]);

  const canStart = selA.length === capA && selB.length === capB;

  // Keep selections within quota if mode changes
  useEffect(() => {
    setSelA((prev) => prev.slice(0, capA));
    setSelB((prev) => prev.slice(0, capB));
    setLockPlayersA(false);
    setLockPlayersB(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Auto-lock when quota reached
  useEffect(() => {
    if (selA.length === capA && capA > 0) setLockPlayersA(true);
    if (selB.length === capB && capB > 0) setLockPlayersB(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selA.length, selB.length, capA, capB]);

  // When user enables sets, keep score dropdown coherent (5/10 only)
  useEffect(() => {
    const to510 = (v: number) => (v <= 7 ? 5 : 10);
    if (setsEnabled) setSetTarget((v) => (v === 5 || v === 10 ? v : to510(v)));
    else setTargetUI((v) => (v === 5 || v === 10 ? v : to510(v)));
  }, [setsEnabled]);

  const togglePlayer = (team: "A" | "B", id: string) => {
    if (team === "A") {
      setSelA((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capA) return prev;
        // Prevent selecting a player already chosen on the other side
        if (selB.includes(id)) return prev;
        return [...prev, id];
      });
    } else {
      setSelB((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capB) return prev;
        // Prevent selecting a player already chosen on the other side
        if (selA.includes(id)) return prev;
        return [...prev, id];
      });
    }
  };

  const getProfileById = (id: string) => profiles.find((p: any) => String((p as any)?.id) === String(id)) as any;

  function SelectedPlayersStrip({ ids, onEdit }: { ids: string[]; onEdit: () => void }) {
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
                  <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ fontWeight: 1000, opacity: 0.9 }}>{String(name).slice(0, 1).toUpperCase()}</div>
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

  // Carousels refs
  const aPlayersRef = useRef<HTMLDivElement | null>(null);
  const bPlayersRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (el: HTMLDivElement | null, dir: "left" | "right") => {
    if (!el) return;
    const dx = (dir === "left" ? -1 : 1) * 220;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  // Teams carousel with exclusion of the opposite selection
  const cycleTeam = (side: "A" | "B", dir: "left" | "right") => {
    if (!teamsCatalog.length) return;

    const ids = teamsCatalog.map((t) => t.id);
    const curId = side === "A" ? teamARefId : teamBRefId;
    const otherId = side === "A" ? teamBRefId : teamARefId;

    const startIdx = curId ? ids.indexOf(curId) : -1;
    const step = dir === "left" ? -1 : 1;

    // if only one team, just set it
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

  // Dropdown options
  const scoreOptions = [
    { value: 5, label: t("bf_score5", "Premier à 5") },
    { value: 10, label: t("bf_score10", "Premier à 10") },
  ];

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

  const [infoOpen, setInfoOpen] = useState(false);

  // Quick-create team modal (no navigation)
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

  // Apply preset mode once on mount
  useEffect(() => {
    const m = presetMode || routeModeFromId;
    if (m && (m === "1v1" || m === "2v2" || m === "2v1")) setModeUI(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAndStart = () => {
    setMode(mode);

    const playerA = profiles.find((p) => String((p as any)?.id) === String(selA[0] || "")) as any;
    const playerB = profiles.find((p) => String((p as any)?.id) === String(selB[0] || "")) as any;

    // Teams: names/logos
    const nameA =
      mode === "1v1"
        ? String(playerA?.name || "JOUEUR A")
        : teamAObj?.name || (saved as any).teamA || "TEAM A";

    const nameB =
      mode === "1v1"
        ? String(playerB?.name || "JOUEUR B")
        : mode === "2v1"
        ? String(playerB?.name || "JOUEUR")
        : teamBObj?.name || (saved as any).teamB || "TEAM B";

    setTeams(nameA, nameB, {
      teamARefId: teamAObj?.id ?? null,
      teamBRefId: mode === "2v2" ? (teamBObj?.id ?? null) : null,
      teamALogoDataUrl: teamAObj?.logoDataUrl ?? teamAObj?.regionLogoDataUrl ?? null,
      teamBLogoDataUrl: mode === "2v2" ? (teamBObj?.logoDataUrl ?? teamBObj?.regionLogoDataUrl ?? null) : null,
    });

    setTeamsProfiles(selA, selB);

    setTarget(target);

    (setAdvancedOptions as any)({
      matchDurationSec: useTimer ? durationSec : null,
      overtimeSec: useTimer ? overtimeSec : 0,
      goldenGoal,
      overtimeGoldenGoal,
      handicapA,
      handicapB,
      setsEnabled,
      setsBestOf,
      setTarget: setsEnabled ? (setTarget === 5 || setTarget === 10 ? setTarget : 5) : setTarget,
	      allowDrawOnTimeEnd: useTimer ? !!allowDrawOnTimeEnd : false,
	      requireTwoGoalLead: !!requireTwoGoalLead,
    });

    // Start match without nuking selections/options
    // (startMatch() initializes runtime fields)
    startMatch();

    go("babyfoot_play", {
      presetCategory: routeCategory,
      presetVariantId: routeVariant,
    });
  };

  const resetConfig = () => {
    resetBabyFoot();
    const s = loadBabyFootState();
    setModeUI(s.mode);
    setTeamARefId((s as any).teamARefId ? String((s as any).teamARefId) : "");
    setTeamBRefId((s as any).teamBRefId ? String((s as any).teamBRefId) : "");
    setTargetUI(s.target ?? 10);
    setUseTimer(!!(s as any).matchDurationSec);
    setDurationSec(Number((s as any).matchDurationSec ?? 180));
    setOvertimeSec(Number((s as any).overtimeSec ?? 60));
    setGoldenGoal(!!(s as any).goldenGoal);
    setOvertimeGoldenGoal((s as any).overtimeGoldenGoal === undefined ? true : !!(s as any).overtimeGoldenGoal);
    setSetsEnabled(!!(s as any).setsEnabled);
    setSetsBestOf(((s as any).setsBestOf ?? 3) === 5 ? 5 : ((s as any).setsBestOf ?? 3) === 1 ? 1 : 3);
    setSetTarget(Number((s as any).setTarget ?? 5));
    setHandicapA(Number((s as any).handicapA ?? 0));
    setHandicapB(Number((s as any).handicapB ?? 0));
	    setAllowDrawOnTimeEnd((s as any).allowDrawOnTimeEnd !== undefined ? !!(s as any).allowDrawOnTimeEnd : true);
	    setRequireTwoGoalLead(!!(s as any).requireTwoGoalLead);
    setSelA(Array.isArray(s.teamAProfileIds) ? s.teamAProfileIds : []);
    setSelB(Array.isArray(s.teamBProfileIds) ? s.teamBProfileIds : []);
  };

  const backTo = (params as any)?.backTo || (params as any)?.from || "babyfoot_games";

  const screenBg =
    "radial-gradient(1200px 600px at 50% -10%, rgba(120,140,255,0.22), transparent 55%), radial-gradient(900px 500px at 10% 10%, rgba(247,200,92,0.16), transparent 55%), radial-gradient(900px 500px at 90% 15%, rgba(255,90,140,0.10), transparent 60%), linear-gradient(180deg, rgba(8,9,16,1) 0%, rgba(6,7,12,1) 60%, rgba(6,7,12,1) 100%)";

  // labels
  const campALabel =
    mode === "1v1" ? t("bf_player_a", "Joueur A") : mode === "2v1" ? t("bf_team", "Équipe") : t("bf_team_a", "Équipe A");
  const campBLabel =
    mode === "1v1" ? t("bf_player_b", "Joueur B") : mode === "2v1" ? t("bf_player", "Joueur") : t("bf_team_b", "Équipe B");

  const campAName =
    mode === "1v1"
      ? (profiles.find((p) => String((p as any)?.id) === String(selA[0] || "")) as any)?.name || campALabel
      : teamAObj?.name || campALabel;

  const campBName =
    mode === "1v1"
      ? (profiles.find((p) => String((p as any)?.id) === String(selB[0] || "")) as any)?.name || campBLabel
      : mode === "2v1"
      ? (profiles.find((p) => String((p as any)?.id) === String(selB[0] || "")) as any)?.name || campBLabel
      : teamBObj?.name || campBLabel;

  return (
    <div style={{ minHeight: "100vh", background: screenBg, color: "rgba(255,255,255,0.94)" }}>
      {/* Header ticker */}
      <div style={{ padding: "10px 12px 0" }}>
        <div style={{ position: "relative", marginLeft: -12, marginRight: -12 }}>
          {headerTicker ? (
            <img
              src={headerTicker}
              alt="ticker"
              style={{
                width: "100%",
                height: 118,
                objectFit: "cover",
                display: "block",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
              }}
            />
          ) : (
            <div
              style={{
                height: 118,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                background: "rgba(255,255,255,0.06)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
              }}
            />
          )}

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
                <div key={m} style={pillStyle(mode === m, primary, primarySoft)} onClick={() => setModeUI(m)}>
                  {m.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ÉQUIPES (uniquement en 2v2/2v1) */}
        {showTeamsPicker ? (
          <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
            {sectionTitle(t("bf_teams", "ÉQUIPES"), primary)}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900 }}>
                {t("bf_select_teams", "Sélectionner les équipes")}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={pillStyle(false, primary, primarySoft)} onClick={() => go("babyfoot_teams")}>
                  {t("manage", "Gérer")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
              {/* Team A chooser */}
              <div style={{ display: "grid", justifyItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ArrowBtn dir="left" onClick={() => cycleTeam("A", "left")} />
                  <TeamAvatar team={teamAObj} primary={primary} />
                  <ArrowBtn dir="right" onClick={() => cycleTeam("A", "right")} />
                </div>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 900, letterSpacing: 1.2 }}>
                  {mode === "2v1" ? t("bf_team_2players", "Équipe (2 joueurs)") : t("bf_team_a", "Équipe A")}
                </div>
              </div>

              {showTeamsPickerB ? (
                <>
                  <div style={{ display: "grid", placeItems: "center", opacity: 0.65, fontWeight: 900 }}>VS</div>

                  {/* Team B chooser */}
                  <div style={{ display: "grid", justifyItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ArrowBtn dir="left" onClick={() => cycleTeam("B", "left")} />
                      <TeamAvatar team={teamBObj} primary={primary} />
                      <ArrowBtn dir="right" onClick={() => cycleTeam("B", "right")} />
                    </div>
                    <div style={{ height: 8 }} />
                    <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 900, letterSpacing: 1.2 }}>
                      {t("bf_team_b", "Équipe B")}
                    </div>
                  </div>
                </>
              ) : null}

              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <div style={pillStyle(false, primary, primarySoft)} onClick={() => openCreateTeam("A")}>
                  {t("bf_create_team", "+ Créer une équipe")}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* JOUEURS */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_players", "JOUEURS"), primary)}
          <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800, marginBottom: 10 }}>
            {t("bf_pick_exact", "Sélectionne exactement")} {capA} vs {capB}
          </div>

          {/* Camp A */}
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {campAName}
          </div>

          {confirmA ? (
            <SelectedPlayersStrip ids={selA} onEdit={() => setConfirmA(false)} />
          ) : (
            <div style={{ position: "relative", marginBottom: 14 }}>
              <div
                ref={aPlayersRef}
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  padding: "6px 44px",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {profilesForA.map((p) => {
                  const id = String((p as any).id);
                  const selected = selA.includes(id);
                  return (
                    <div key={id} style={{ scrollSnapAlign: "center" }} onClick={() => togglePlayer("A", id)}>
                      <ProfileAvatarCard p={p} selected={selected} primary={primary} />
                    </div>
                  );
                })}
              </div>

              <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)" }}>
                <ArrowBtn dir="left" onClick={() => scrollByCard(aPlayersRef.current, "left")} />
              </div>
              <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                <ArrowBtn dir="right" onClick={() => scrollByCard(aPlayersRef.current, "right")} />
              </div>
            </div>
          )}

          {/* Camp B */}
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {campBName}
          </div>

          {confirmB ? (
            <SelectedPlayersStrip ids={selB} onEdit={() => setConfirmB(false)} />
          ) : (
            <div style={{ position: "relative" }}>
              <div
                ref={bPlayersRef}
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  padding: "6px 44px",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {profilesForB.map((p) => {
                  const id = String((p as any).id);
                  const selected = selB.includes(id);
                  return (
                    <div key={id} style={{ scrollSnapAlign: "center" }} onClick={() => togglePlayer("B", id)}>
                      <ProfileAvatarCard p={p} selected={selected} primary={primary} />
                    </div>
                  );
                })}
              </div>

              <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)" }}>
                <ArrowBtn dir="left" onClick={() => scrollByCard(bPlayersRef.current, "left")} />
              </div>
              <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>
                <ArrowBtn dir="right" onClick={() => scrollByCard(bPlayersRef.current, "right")} />
              </div>
            </div>
          )}
        </div>

        {/* RÈGLES */}
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
                value={
                  setsEnabled
                    ? setTarget === 5 || setTarget === 10
                      ? setTarget
                      : 5
                    : target === 5 || target === 10
                    ? target
                    : 10
                }
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (setsEnabled) setSetTarget(v);
                  else setTargetUI(v);
                }}
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
            </div>

            {setsEnabled ? (
              <div>
                <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                  {t("bf_bestof", "Best Of")}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[1, 3, 5].map((bo) => (
                    <div key={bo} style={pillStyle(setsBestOf === bo, primary, primarySoft)} onClick={() => setSetsBestOf(bo as any)}>
                      BO{bo}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Options */}
	            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
	              <div
	                style={pillStyle(requireTwoGoalLead, primary, primarySoft)}
	                onClick={() => setRequireTwoGoalLead((v) => !v)}
	                title={t("bf_win_by_two_tip", "Exige 2 buts d'écart pour gagner (hors contrainte temps)")}
	              >
	                {t("bf_win_by_two", "2 buts d'écart")}
	              </div>
	              {useTimer ? (
	                <div
	                  style={pillStyle(allowDrawOnTimeEnd, primary, primarySoft)}
	                  onClick={() => setAllowDrawOnTimeEnd((v) => !v)}
	                  title={t("bf_allow_draw_tip", "Autorise le match nul si égalité à la fin du temps")}
	                >
	                  {t("bf_allow_draw", "Match nul")}
	                </div>
	              ) : null}
	            </div>
          </div>
        </div>

        {/* CHRONO */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.92, fontWeight: 1000, letterSpacing: 1.2, textTransform: "uppercase", color: primary }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

              <div>
                <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                  {t("bf_overtime", "Prolongation")}
                </div>
                <select
                  value={overtimeSec}
                  onChange={(e) => setOvertimeSec(Number(e.target.value))}
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
                  {overtimeOptions.map((o) => (
                    <option key={o.value} value={o.value} style={{ color: "#111" }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={pillStyle(goldenGoal, primary, primarySoft)} onClick={() => setGoldenGoal((v) => !v)}>
                  Golden Goal
                </div>
                <div style={pillStyle(overtimeGoldenGoal, primary, primarySoft)} onClick={() => setOvertimeGoldenGoal((v) => !v)}>
                  OT Golden Goal
                </div>

                <div style={{ marginLeft: "auto" }}>
                  <div onClick={() => setInfoOpen(true)} style={iconBtnStyle()} title={t("info", "Info")}>
                    ?
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={pillStyle(goldenGoal, primary, primarySoft)} onClick={() => setGoldenGoal((v) => !v)}>
                Golden Goal
              </div>
              <div style={pillStyle(overtimeGoldenGoal, primary, primarySoft)} onClick={() => setOvertimeGoldenGoal((v) => !v)}>
                OT Golden Goal
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div onClick={() => setInfoOpen(true)} style={iconBtnStyle()} title={t("info", "Info")}>
                  ?
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HANDICAP */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_handicap", "HANDICAP"), primary)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {mode === "1v1" ? t("bf_player_a", "Joueur A") : t("bf_team_a", "Équipe A")}
              </div>
              <input
                type="number"
                value={handicapA}
                min={0}
                max={99}
                onChange={(e) => setHandicapA(clamp(Number(e.target.value || 0), 0, 99))}
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
              />
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {mode === "1v1" ? t("bf_player_b", "Joueur B") : mode === "2v1" ? t("bf_player", "Joueur") : t("bf_team_b", "Équipe B")}
              </div>
              <input
                type="number"
                value={handicapB}
                min={0}
                max={99}
                onChange={(e) => setHandicapB(clamp(Number(e.target.value || 0), 0, 99))}
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
              />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.70 }}>{t("bf_handicap_hint", "Handicap = buts ajoutés au départ.")}</div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          // Keep above the bottom tabbar
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          padding: "10px 12px 10px",
          background: "linear-gradient(180deg, rgba(6,7,12,0) 0%, rgba(6,7,12,0.75) 20%, rgba(6,7,12,0.96) 100%)",
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

          <button
            onClick={applyAndStart}
            disabled={!canStart}
            style={{
              flex: 1,
              borderRadius: 14,
              padding: "12px 14px",
              background: !canStart ? "rgba(255,255,255,0.08)" : `linear-gradient(180deg, ${primary} 0%, ${primary}cc 100%)`,
              border: !canStart ? "1px solid rgba(255,255,255,0.10)" : `1px solid ${primary}aa`,
              color: !canStart ? "rgba(255,255,255,0.55)" : "#081018",
              fontWeight: 1000,
              letterSpacing: 0.4,
              boxShadow: !canStart ? "none" : `0 16px 40px rgba(0,0,0,0.45), 0 0 0 3px ${primary}18`,
              cursor: !canStart ? "not-allowed" : "pointer",
            }}
            title={!canStart ? t("bf_need_players", "Sélectionne les joueurs requis") : ""}
          >
            {t("start", "Démarrer")}
          </button>
        </div>
      </div>

      {/* Info modal */}
      <Modal open={infoOpen} title={t("bf_rules_info", "Golden Goal — explications")} onClose={() => setInfoOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 1000, marginBottom: 4 }}>Golden Goal</div>
            <div style={{ opacity: 0.9 }}>
              À la fin du temps réglementaire, si le score est à égalité, <b>le prochain but gagné termine le match</b>.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 1000, marginBottom: 4 }}>OT Golden Goal</div>
            <div style={{ opacity: 0.9 }}>
              Si le match est à égalité, on joue d’abord la <b>prolongation</b>. Pendant la prolongation,
              <b> le prochain but peut terminer le match</b> (si activé).
            </div>
          </div>
          <div style={{ opacity: 0.78, fontSize: 12 }}>
            Astuce : si tu actives <b>Match nul</b>, le Golden Goal ne s’applique pas à la fin du temps réglementaire.
          </div>
        </div>
      </Modal>

      {/* Quick create team modal */}
      <Modal open={createTeamOpen} title={t("bf_quick_create_team", "Créer une équipe")} onClose={() => setCreateTeamOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900 }}>{t("bf_team_name", "Nom de l’équipe")}</div>
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
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900 }}>{t("bf_team_logo", "Logo (optionnel)")}</div>
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
