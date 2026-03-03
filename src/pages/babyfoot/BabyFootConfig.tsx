// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Baby-Foot — Config (LOCAL)
// Objectif: rendu + UX calqués sur X01ConfigV3 (DartsCounter)
// ✅ Presets depuis menus (MATCH / FUN / TRAINING / DÉFIS) -> config spécifique par carte
// ✅ Sélection ÉQUIPES via catalogue (Profils > Teams) en carrousel (flèches)
// ✅ Sélection JOUEURS par équipe en carrousel (flèches) + quota strict (1v1/2v2/2v1)
// ✅ Règles épurées:
//    - Sets ON/OFF au-dessus
//    - Score cible via dropdown (5 ou 10)
//    - BO1/BO3/BO5 sur une seule ligne (si Sets ON)
// ✅ Chrono épuré:
//    - Durée dropdown (3/5/7/10 min)
//    - Prolongation dropdown (Aucune / 30 / 60 / 90 sec)
// ✅ Golden Goal + OT Golden Goal avec bouton info (modal)
// ✅ Handicap toujours dispo (même en chrono)
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import { loadBabyFootTeams, type BabyFootTeam } from "../../lib/petanqueTeamsStore";
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


function pillStyle(active: boolean, primary: string, primarySoft: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 12px",
    border: active ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
    background: active ? primarySoft : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.84)",
    fontWeight: 950,
    letterSpacing: 0.4,
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
    padding: "18px 14px 14px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
  };
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 36,
    height: 36,
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
      style={{
        ...iconBtnStyle(),
        pointerEvents: "auto",
      }}
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
            <div onClick={onClose} style={{ ...iconBtnStyle(), width: 34, height: 34 }}>
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
    <div style={{ display: "grid", justifyItems: "center", gap: 8, width: 120 }}>
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
          maxWidth: 140,
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
          border: selected ? `2px solid ${primary}aa` : "1px solid rgba(255,255,255,0.12)",
          boxShadow: selected ? `0 12px 30px rgba(0,0,0,0.40), 0 0 0 3px ${primary}22` : "0 12px 28px rgba(0,0,0,0.35)",
          background: "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {avatar ? (
          <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

  // Always land at top
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
  // Presets (depuis menus) — normalisation
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
    routeModeId === "match_2v2" ? "2v2" : routeModeId === "match_2v1" ? "2v1" : routeModeId === "match_1v1" ? "1v1" : undefined;

  const routeVariant: string | undefined =
    presetVariantId ??
    (typeof routeModeId === "string" ? routeModeId : undefined) ??
    (presetTraining ? String(presetTraining) : undefined);

  // format is generally locked by entry card (MATCH 1v1/2v2/2v1 etc.)
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

  // overtime: allow "none" -> 0
  const [overtimeSec, setOvertimeSec] = useState<number>(clamp(Number((saved as any).overtimeSec ?? 60), 0, 60 * 10));

  const [goldenGoal, setGoldenGoal] = useState<boolean>(
    presetGoldenGoal !== undefined ? !!presetGoldenGoal : !!(saved as any).goldenGoal
  );
  const [overtimeGoldenGoal, setOvertimeGoldenGoal] = useState<boolean>(
    (saved as any).overtimeGoldenGoal === undefined ? true : !!(saved as any).overtimeGoldenGoal
  );

  const [setsEnabled, setSetsEnabled] = useState<boolean>(!!(presetSetsEnabled ?? (saved as any).setsEnabled));
  const [setsBestOf, setSetsBestOf] = useState<1 | 3 | 5>(
    (((presetBestOf ?? (saved as any).setsBestOf ?? 3) === 5
      ? 5
      : (presetBestOf ?? (saved as any).setsBestOf ?? 3) === 1
      ? 1
      : 3) as any) as 1 | 3 | 5
  );
  const [setTarget, setSetTarget] = useState<number>(
    clamp(Number(presetSetTarget ?? (saved as any).setTarget ?? 5), 1, 30)
  );

  const [handicapA, setHandicapA] = useState<number>(clamp(Number(presetHandicapA ?? (saved as any).handicapA ?? 0), 0, 99));
  const [handicapB, setHandicapB] = useState<number>(clamp(Number(presetHandicapB ?? (saved as any).handicapB ?? 0), 0, 99));

  const [selA, setSelA] = useState<string[]>(Array.isArray(saved.teamAProfileIds) ? saved.teamAProfileIds : []);
  const [selB, setSelB] = useState<string[]>(Array.isArray(saved.teamBProfileIds) ? saved.teamBProfileIds : []);

  const capA = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const capB = mode === "2v2" ? 2 : 1;

  // Profiles list
  const profiles: Profile[] = ((store as any)?.profiles || []) as Profile[];

  // Header ticker
  const headerTickerId =
    routeVariant ||
    (routeCategory ? `${routeCategory}_${mode}` : null) ||
    `babyfoot_${mode}`;
  const headerTicker = pickTicker(headerTickerId) || pickTicker(`babyfoot_${mode}`) || null;

  // Teams helpers
  const findTeam = (id: string) => teamsCatalog.find((x) => x.id === id) ?? null;
  const teamAObj = teamARefId ? findTeam(teamARefId) : null;
  const teamBObj = teamBRefId ? findTeam(teamBRefId) : null;

  const canStart = selA.length === capA && selB.length === capB;

  // Keep selections within quota if mode changes (rare)
  useEffect(() => {
    setSelA((prev) => prev.slice(0, capA));
    setSelB((prev) => prev.slice(0, capB));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // When user enables sets, keep score dropdown coherent (5/10 only)
  useEffect(() => {
    const to57 = (v: number) => (v <= 7 ? 5 : 10);
    if (setsEnabled) {
      setSetTarget((v) => (v === 5 || v === 10 ? v : to57(v)));
    } else {
      setTargetUI((v) => (v === 5 || v === 10 ? v : to57(v)));
    }
  }, [setsEnabled]);

  const togglePlayer = (team: "A" | "B", id: string) => {
    if (team === "A") {
      setSelA((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capA) return prev;
        return [...prev, id];
      });
    } else {
      setSelB((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capB) return prev;
        return [...prev, id];
      });
    }
  };

  // Carousels refs
  const aPlayersRef = useRef<HTMLDivElement | null>(null);
  const bPlayersRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (el: HTMLDivElement | null, dir: "left" | "right") => {
    if (!el) return;
    const dx = (dir === "left" ? -1 : 1) * 220;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  // Teams carousel: we keep selection as refId + also set names/logos to babyfootState
  const cycleTeam = (side: "A" | "B", dir: "left" | "right") => {
    if (!teamsCatalog.length) return;
    const curId = side === "A" ? teamARefId : teamBRefId;
    const ids = teamsCatalog.map((t) => t.id);
    const idx = curId ? ids.indexOf(curId) : -1;
    const nextIdx =
      idx < 0
        ? 0
        : (idx + (dir === "left" ? -1 : 1) + ids.length) % ids.length;
    const nextTeam = teamsCatalog[nextIdx];
    if (!nextTeam) return;

    if (side === "A") setTeamARefId(nextTeam.id);
    else setTeamBRefId(nextTeam.id);
  };

  // UI: dropdown helpers
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

  // Apply preset mode once on mount (so UI + store align)
  useEffect(() => {
    const m = presetMode || routeModeFromId;
    if (m && (m === "1v1" || m === "2v2" || m === "2v1")) setModeUI(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAndStart = () => {
    // Mode
    setMode(mode);

    // Teams: resolve names/logos from ref
    const ta = teamAObj;
    const tb = teamBObj;

    const nameA = ta?.name || (saved as any).teamA || "TEAM A";
    const nameB = tb?.name || (saved as any).teamB || "TEAM B";

    setTeams(nameA, nameB, {
      teamARefId: ta?.id ?? null,
      teamBRefId: tb?.id ?? null,
      teamALogoDataUrl: ta?.logoDataUrl ?? ta?.regionLogoDataUrl ?? null,
      teamBLogoDataUrl: tb?.logoDataUrl ?? tb?.regionLogoDataUrl ?? null,
    });

    // Profiles selection
    setTeamsProfiles(selA, selB);

    // Targets
    if (setsEnabled) {
      // keep classic match target untouched; setTarget controls per set
      setTarget(target); // still store a sane default for non-sets (unused in play when setsEnabled)
    } else {
      setTarget(target);
    }

    // Advanced options
    setAdvancedOptions({
      matchDurationSec: useTimer ? durationSec : null,
      overtimeSec: useTimer ? overtimeSec : 0,
      goldenGoal,
      overtimeGoldenGoal,
      handicapA,
      handicapB,
      setsEnabled,
      setsBestOf,
      setTarget: setsEnabled ? (setTarget === 5 || setTarget === 10 ? setTarget : 5) : setTarget,
    });

    // Reset match runtime fields then start
    resetBabyFoot({ keepTeams: true, keepProfiles: true, keepOptions: true });
    startMatch();

    go("babyfoot_play", {
      presetCategory: routeCategory,
      presetVariantId: routeVariant,
    });
  };

  const resetConfig = () => {
    resetBabyFoot({ keepTeams: false, keepProfiles: false, keepOptions: false });
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
    setSelA(Array.isArray(s.teamAProfileIds) ? s.teamAProfileIds : []);
    setSelB(Array.isArray(s.teamBProfileIds) ? s.teamBProfileIds : []);
  };

  const screenBg =
    "radial-gradient(1200px 600px at 50% -10%, rgba(120,140,255,0.22), transparent 55%), radial-gradient(900px 500px at 10% 10%, rgba(247,200,92,0.16), transparent 55%), radial-gradient(900px 500px at 90% 15%, rgba(255,90,140,0.10), transparent 60%), linear-gradient(180deg, rgba(8,9,16,1) 0%, rgba(6,7,12,1) 60%, rgba(6,7,12,1) 100%)";

  return (
    <div style={{ minHeight: "100vh", background: screenBg, color: "rgba(255,255,255,0.94)" }}>
      {/* Header ticker (X01ConfigV3 style: full width with negative margins) */}
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
            <BackDot onClick={() => go("babyfoot_games")} />
          </div>
          <div style={{ position: "absolute", right: 10, top: 10 }}>
            <InfoDot onClick={() => setInfoOpen(true)} />
          </div>
        </div>
      </div>

      <div ref={contentRef} style={{ padding: "12px 12px 120px" }}>
        {/* TEAM MODE (hidden most of the time, kept for debug/unlocked route) */}
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

        {/* ÉQUIPES */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_teams", "ÉQUIPES"), primary)}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
              {t("bf_team_shared", "Équipes (noms & logos) — partagé avec Profils > Teams")}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 14,
            }}
          >
            {/* Team A chooser */}
            <div style={{ display: "grid", justifyItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ArrowBtn dir="left" onClick={() => cycleTeam("A", "left")} />
                <TeamAvatar team={teamAObj} primary={primary} />
                <ArrowBtn dir="right" onClick={() => cycleTeam("A", "right")} />
              </div>
              <div style={{ height: 8 }} />
              <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 900, letterSpacing: 1.2 }}>
                {t("bf_team_a", "Équipe A")}
              </div>
            </div>

            <div style={{ display: "grid", placeItems: "center", opacity: 0.65, fontWeight: 900 }}>
              VS
            </div>

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

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={pillStyle(false, primary, primarySoft)}
                onClick={() => go("babyfoot_teams")}
              >
                {t("bf_create_team", "+ Créer une équipe")}
              </div>
            </div>
          </div>
        </div>

        {/* JOUEURS */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_players", "JOUEURS"), primary)}
          <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800, marginBottom: 10 }}>
            {t("bf_pick_exact", "Sélectionne exactement")} {capA} vs {capB}
          </div>

          {/* Team A players */}
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {teamAObj?.name || t("bf_team_a", "Équipe A")}
          </div>

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
              {profiles.map((p) => {
                const id = (p as any).id;
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

          {/* Team B players */}
          <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 1000, letterSpacing: 1.1, marginBottom: 8 }}>
            {teamBObj?.name || t("bf_team_b", "Équipe B")}
          </div>

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
              {profiles.map((p) => {
                const id = (p as any).id;
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
        </div>

        {/* RÈGLES */}
        <div style={{ ...cardStyle(cardBg), marginBottom: 12 }}>
          {sectionTitle(t("bf_rules", "RÈGLES"), primary)}

          {/* Sets line */}
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

          {/* Score target dropdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900, marginBottom: 6 }}>
                {t("bf_target", "Score cible")}
              </div>

              <select
                value={setsEnabled ? (setTarget === 5 || setTarget === 10 ? setTarget : 5) : (target === 5 || target === 10 ? target : 10)}
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

            {/* BO line (only if sets ON) */}
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
              </div>
            ) : null}
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
                <div
                  style={pillStyle(goldenGoal, primary, primarySoft)}
                  onClick={() => setGoldenGoal((v) => !v)}
                >
                  Golden Goal
                </div>

                <div
                  style={pillStyle(overtimeGoldenGoal, primary, primarySoft)}
                  onClick={() => setOvertimeGoldenGoal((v) => !v)}
                >
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
              <div
                style={pillStyle(goldenGoal, primary, primarySoft)}
                onClick={() => setGoldenGoal((v) => !v)}
              >
                Golden Goal
              </div>
              <div
                style={pillStyle(overtimeGoldenGoal, primary, primarySoft)}
                onClick={() => setOvertimeGoldenGoal((v) => !v)}
              >
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
                {t("bf_team_a", "Équipe A")}
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
                {t("bf_team_b", "Équipe B")}
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
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.70 }}>
            {t("bf_handicap_hint", "Handicap = buts ajoutés au départ.")}
          </div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          background:
            "linear-gradient(180deg, rgba(6,7,12,0) 0%, rgba(6,7,12,0.75) 20%, rgba(6,7,12,0.96) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          zIndex: 50,
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
              Si le match est à égalité, on joue d’abord la <b>prolongation</b> (ex: 60 sec). Pendant la prolongation,
              <b> le prochain but peut terminer le match</b> (si activé).
            </div>
          </div>
          <div style={{ opacity: 0.78, fontSize: 12 }}>
            Astuce : en mode Chrono OFF, Golden Goal reste utile si tu veux une “mort subite” en cas d’égalité.
          </div>
        </div>
      </Modal>
    </div>
  );
}
