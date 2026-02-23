// ============================================
// src/pages/pingpong/PingPongPlay.tsx
// ✅ UI calquée sur src/pages/petanque/PetanquePlay.tsx (mêmes helpers visuels wrap/card/boutons)
// ✅ Ajout logique SERVICE (1v1 / 2v2 / 2v1 + deuce) + modal départ si "manual"
// ⚠️ On garde le legacy en bas (commenté) pour ne rien perdre.
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import {
  loadPingPongState,
  savePingPongState,
  resetPingPong,
  addPoint,
  undo,
} from "../../lib/pingpongStore";

import type { Profile } from "../../lib/types";

// ✅ Tickers (comme les menus)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTickerFromCandidates(candidates: string[]) {
  const uniq = Array.from(new Set((candidates || []).filter(Boolean)));
  for (const id of uniq) {
    const norm = String(id).trim().toLowerCase();
    const cand = Array.from(
      new Set([
        norm,
        norm.replace(/\s+/g, "_"),
        norm.replace(/\s+/g, "-"),
        norm.replace(/-/g, "_"),
        norm.replace(/_/g, "-"),
        norm.replace(/[^a-z0-9_\-]/g, ""),
      ])
    ).filter(Boolean);

    for (const c of cand) {
      const suffixA = `/ticker_${c}.png`;
      const suffixB = `/ticker-${c}.png`;
      for (const k of Object.keys(TICKERS)) {
        if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
      }
    }
  }
  return null;
}

const PROFILES_CACHE_KEY = "dc-profiles-cache-v1";

function readProfilesCache(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_CACHE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as any) : [];
  } catch {
    return [];
  }
}

function safeName(name: any, fallback: string) {
  const s = String(name || "").trim();
  if (!s) return fallback;
  // évite UUID bruts
  if (
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
      s
    )
  )
    return fallback;
  return s;
}

function findProfile(profilesList: Profile[], label: string) {
  const n = String(label || "").trim().toLowerCase();
  if (!n) return null;
  return (
    (profilesList as any[]).find(
      (p) => String(p.nickname || "").trim().toLowerCase() === n
    ) ||
    (profilesList as any[]).find(
      (p) => String(p.name || "").trim().toLowerCase() === n
    ) ||
    (profilesList as any[]).find(
      (p) => String(p.email || "").trim().toLowerCase() === n
    ) ||
    null
  );
}

function looksLikeUuid(v: any): boolean {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    s
  );
}

function resolveProfile(
  profilesList: Profile[],
  idOrName?: any,
  fallbackName?: string
): Profile | null {
  const id = String(idOrName || "").trim();

  // 1) match by id (uuid)
  if (id && looksLikeUuid(id)) {
    const hit = profilesList.find(
      (p) => String((p as any)?.id || (p as any)?.profileId || "").trim() === id
    );
    if (hit) return hit;
  }

  // 2) match by exact name (nickname/displayName/name/email local part)
  const wanted = String(
    fallbackName || (looksLikeUuid(idOrName) ? "" : idOrName || "")
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!wanted) return null;

  const candFields = (p: any) =>
    [
      p?.nickname,
      p?.displayName,
      p?.name,
      p?.username,
      p?.email ? String(p.email).split("@")[0] : null,
    ].filter(Boolean);

  for (const p of profilesList) {
    if (
      candFields(p).some(
        (c: any) =>
          String(c).trim().toLowerCase().replace(/\s+/g, " ") === wanted
      )
    )
      return p;
  }
  for (const p of profilesList) {
    if (
      candFields(p).some(
        (c: any) =>
          String(c).trim().toLowerCase().includes(wanted) ||
          wanted.includes(String(c).trim().toLowerCase())
      )
    )
      return p;
  }
  return null;
}

function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "J";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function splitNames(s: string): string[] {
  return String(s || "")
    .split(/\s*(?:·|&|\+|,|\/|\|)\s*/g)
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function cssVarOr(fallback: string, varName: string) {
  return `var(${varName}, ${fallback})`;
}

function hexToRgba(hex: string, a: number) {
  const h = String(hex || "").replace("#", "").trim();
  if (!h) return `rgba(255,200,90,${a})`;
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  if (!Number.isFinite(n)) return `rgba(255,200,90,${a})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function primaryColor(theme: any) {
  return theme?.primary || theme?.colors?.primary || "#ffc85a";
}

function secondaryColor(theme: any) {
  return theme?.secondary || theme?.colors?.secondary || "#ff6eb4";
}

function neonBorder(theme: any) {
  const p = primaryColor(theme);
  const s = secondaryColor(theme);
  return `linear-gradient(90deg, ${hexToRgba(p, 0.55)}, ${hexToRgba(s, 0.55)})`;
}

function wrap(theme: any): React.CSSProperties {
  const dark =
    theme?.id?.includes("dark") ||
    theme?.id === "darkTitanium" ||
    theme?.id === "dark";
  const p = primaryColor(theme);
  const s = secondaryColor(theme);
  const base = dark
    ? cssVarOr(
        "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.92))",
        "--bg"
      )
    : cssVarOr(
        "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.05), rgba(255,255,255,0.94))",
        "--bg"
      );

  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    padding: 14,
    paddingBottom: 110,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),

    // Neon ambience: 2 soft halos + your existing theme background
    background: `
      radial-gradient(900px 420px at 18% 0%, ${hexToRgba(p, 0.16)}, transparent 60%),
      radial-gradient(900px 420px at 82% 0%, ${hexToRgba(s, 0.14)}, transparent 60%),
      ${base}
    `,

    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

function card(theme: any): React.CSSProperties {
  const p = primaryColor(theme);
  const s = secondaryColor(theme);

  return {
    position: "relative",
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,

    backgroundColor: cssVarOr("rgba(8,10,18,0.70)", "--glass"),
    backgroundImage: `
      ${neonBorder(theme)},
      linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))
    `,
    backgroundSize: "100% 2px, 100% 100%",
    backgroundPosition: "0 0, 0 0",
    backgroundRepeat: "no-repeat, no-repeat",

    boxShadow: `
      0 12px 30px rgba(0,0,0,0.30),
      0 0 0 1px rgba(255,255,255,0.05),
      0 0 22px ${hexToRgba(p, 0.14)},
      0 0 18px ${hexToRgba(s, 0.10)}
    `,

    display: "flex",
    flexDirection: "column",
    gap: 6,
    overflow: "hidden",
    backdropFilter: "blur(12px)",
  };
}

function cardSoft(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: 12,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.14)", "--glass2"),
    display: "flex",
    flexDirection: "column",
    gap: 6,
    backdropFilter: "blur(10px)",
  };
}

function sub(_theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.85 };
}

const row: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };

function primary(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.18)", "--stroke")}`,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1100 as any,
    cursor: "pointer",
  };
}

function danger(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background:
      "linear-gradient(180deg, rgba(255,60,60,0.22), rgba(255,60,60,0.12))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1100 as any,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.05)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 900,
    cursor: "pointer",
    opacity: 0.95,
    backdropFilter: "blur(10px)",
  };
}

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const ptsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 6,
};

function ptBtn(theme: any, active = false): React.CSSProperties {
  const p = primaryColor(theme);
  const s = secondaryColor(theme);
  const border = active ? "rgba(110,180,255,0.65)" : hexToRgba(p, 0.22);
  const bg = active
    ? `linear-gradient(180deg, rgba(110,180,255,0.16), rgba(0,0,0,0.06))`
    : `linear-gradient(180deg, ${hexToRgba(p, 0.10)}, ${hexToRgba(s, 0.04)})`;
  return {
    flex: 1,
    borderRadius: 14,
    padding: "12px 0",
    border: `1px solid ${border}`,
    background: bg,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 10px 26px rgba(0,0,0,0.35), 0 0 14px ${hexToRgba(p, 0.10)}`,
  };
}

function kpi(): React.CSSProperties {
  return {
    fontSize: 42,
    fontWeight: 1200 as any,
    lineHeight: 1,
    letterSpacing: -1,
    textShadow: "0 12px 26px rgba(0,0,0,0.35)",
  };
}

function scoreBig(theme: any, side: "A" | "B"): React.CSSProperties {
  const c = side === "A" ? primaryColor(theme) : secondaryColor(theme);
  return {
    fontSize: 56,
    fontWeight: 1400 as any,
    lineHeight: 0.95,
    letterSpacing: -1,
    color: c,
    fontFamily:
      "Bangers, 'Luckiest Guy', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    textShadow:
      `0 3px 0 rgba(0,0,0,0.45),
       0 16px 30px rgba(0,0,0,0.55),
       0 0 18px ${hexToRgba(c, 0.35)},
       0 0 34px ${hexToRgba(c, 0.22)}`,
    filter: "saturate(1.15)",
  };
}

function scoreLabel(theme: any): React.CSSProperties {
  const t = cssVarOr(theme?.colors?.text ?? "#fff", "--text");
  return {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: 900 as any,
    color: hexToRgba(t, 0.9),
    textTransform: "uppercase" as any,
    textShadow: "0 2px 10px rgba(0,0,0,0.45)",
    WebkitTextStroke: "1px rgba(0,0,0,0.30)" as any,
  };
}

function pmBtn(theme: any): React.CSSProperties {
  const p = primaryColor(theme);
  return {
    width: 34,
    height: 26,
    borderRadius: 10,
    border: `1px solid ${hexToRgba(p, 0.25)}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1200 as any,
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
  };
}

function setPillMini(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    fontSize: 12,
    fontWeight: 1100 as any,
    letterSpacing: 0.4,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function infoMiniBtn(theme: any): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.16)", "--glass2"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1200 as any,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    opacity: 0.95,
  };
}

function rulesPop(theme: any): React.CSSProperties {
  return {
    marginTop: 10,
    borderRadius: 14,
    padding: 10,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.18)", "--glass2"),
    fontSize: 12,
    lineHeight: 1.35,
  };
}

const tickerImg: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  userSelect: "none",
  pointerEvents: "none",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
};

const sheetWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  padding: 14,
  paddingTop: "max(14px, env(safe-area-inset-top))",
  paddingBottom: "max(14px, env(safe-area-inset-bottom))",
  background: "rgba(0,0,0,0.62)",
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(6px)",
};

const finishWrap: React.CSSProperties = {
  ...sheetWrap,
  background: "rgba(0,0,0,0.72)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
};

function finishCard(theme: any): React.CSSProperties {
  const p = primaryColor(theme);
  return {
    width: "min(640px, 96vw)",
    maxHeight: "82vh",
    overflow: "auto",
    borderRadius: 20,
    border: `1px solid ${hexToRgba(p, 0.28)}`,
    background: "linear-gradient(180deg, rgba(24,28,40,0.96), rgba(14,16,24,0.92))",
    boxShadow: `0 30px 70px rgba(0,0,0,0.65), 0 0 28px ${hexToRgba(p, 0.20)}`,
    padding: 14,
  };
}

function servicePill(theme: any, active: boolean): React.CSSProperties {
  const c = primaryColor(theme);
  return {
    marginTop: 6,
    fontSize: 10,
    fontWeight: 1200 as any,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${hexToRgba(c, active ? 0.55 : 0.18)}`,
    background: active
      ? `linear-gradient(180deg, ${hexToRgba(c, 0.26)}, ${hexToRgba(c, 0.08)})`
      : "rgba(255,255,255,0.06)",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    boxShadow: active ? `0 0 20px ${hexToRgba(c, 0.28)}` : "none",
    opacity: active ? 1 : 0.55,
  };
}

function sheetCard(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 560,
    borderRadius: 22,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(15,18,28,0.92)", "--glass"),
    padding: 14,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    boxShadow: "0 22px 80px rgba(0,0,0,0.65)",
    backdropFilter: "blur(10px)",
  };
}

const miniWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  padding: 14,
  paddingTop: "max(14px, env(safe-area-inset-top))",
  paddingBottom: "max(14px, env(safe-area-inset-bottom))",
  background: "rgba(0,0,0,0.50)",
  zIndex: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
};

function miniCard(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(15,18,28,0.92)", "--glass"),
    padding: 14,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    boxShadow: "0 18px 60px rgba(0,0,0,0.58)",
    backdropFilter: "blur(10px)",
  };
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

export default function PingPongPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  // ✅ persistance
  React.useEffect(() => {
    savePingPongState(st as any);
  }, [st]);

  // ✅ force body bg (sinon zone grise/blanche)
  React.useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background =
      "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.92))";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  const profilesList = React.useMemo(() => readProfilesCache(), []);
  const teamAIds = Array.isArray((st as any)?.teamAProfileIds)
    ? (st as any).teamAProfileIds
    : [];
  const teamBIds = Array.isArray((st as any)?.teamBProfileIds)
    ? (st as any).teamBProfileIds
    : [];
  const profileA = React.useMemo(
    () => resolveProfile(profilesList, teamAIds?.[0], (st as any).sideA),
    [profilesList, teamAIds?.[0], (st as any).sideA]
  );
  const profileB = React.useMemo(
    () => resolveProfile(profilesList, teamBIds?.[0], (st as any).sideB),
    [profilesList, teamBIds?.[0], (st as any).sideB]
  );
  const nameA = React.useMemo(
    () =>
      safeName(
        (profileA as any)?.nickname ||
          (profileA as any)?.displayName ||
          (profileA as any)?.name ||
          (st as any).sideA,
        "—"
      ),
    [profileA, (st as any).sideA]
  );
  const nameB = React.useMemo(
    () =>
      safeName(
        (profileB as any)?.nickname ||
          (profileB as any)?.displayName ||
          (profileB as any)?.name ||
          (st as any).sideB,
        "—"
      ),
    [profileB, (st as any).sideB]
  );

  const ptsA = Number((st as any).pointsA ?? 0);

  const ptsB = Number((st as any).pointsB ?? 0);

  // timers
  const matchStartedAt = Number((st as any).matchStartedAt ?? 0) || 0;
  const setStartedAt = Number((st as any).setStartedAt ?? 0) || 0;
  const setDurationsMs: number[] = Array.isArray((st as any).setDurationsMs) ? ((st as any).setDurationsMs as any) : [];
  const formatMs = (ms: number) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    const s = Math.max(0, Math.floor((ms % 60000) / 1000));
    return `${m}:${String(s).padStart(2, "0")}`;
  };


  const finished = Boolean((st as any).finished);
  const matchStarted = Boolean((st as any).matchStarted);
  const [nowTick, setNowTick] = React.useState(() => Date.now());
  const matchElapsedMs = matchStarted && matchStartedAt ? Math.max(0, nowTick - matchStartedAt) : 0;
  const currentSetElapsedMs = matchStarted && setStartedAt ? Math.max(0, nowTick - setStartedAt) : 0;
    const setsA = Number((st as any).setsA ?? 0);
  const setsB = Number((st as any).setsB ?? 0);

  const pointsPerSet = Number((st as any).pointsPerSet ?? 11);
  const setsToWin = Number((st as any).setsToWin ?? 1);
  const winByTwo = Boolean((st as any).winByTwo ?? true);

  const uiMode = String((st as any).uiMode ?? (st as any).mode ?? "match_1v1");
  const [showRules, setShowRules] = React.useState(false);


  React.useEffect(() => {
    if (!matchStarted) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [matchStarted]);

  React.useEffect(() => {
    setShowRules(false);
  }, [uiMode, (st as any).setIndex]);
  const is2v2 = uiMode.includes("2v2");
  const is2v1 = uiMode.includes("2v1");
  const isTournante = uiMode.includes("tournante") || String((st as any).mode) === "tournante";

  const inDeuce = ptsA >= pointsPerSet - 1 && ptsB >= pointsPerSet - 1;
  const played = ptsA + ptsB;
  const diff = Math.abs(ptsA - ptsB);

  const ticker = React.useMemo(() => {
    if (uiMode.includes("tournante"))
      return getTickerFromCandidates(["pingpong_tournante", "pingpong_games", "pingpong"]);
    if (uiMode.includes("2v2"))
      return getTickerFromCandidates(["pingpong_2v2", "pingpong_games", "pingpong"]);
    if (uiMode.includes("2v1"))
      return getTickerFromCandidates(["pingpong_2v1", "pingpong_games", "pingpong"]);
    return getTickerFromCandidates(["pingpong_1v1", "pingpong_games", "pingpong"]);
  }, [uiMode]);

  // =========================
  // SERVICE (officiel)
  // =========================

  // Config service (vient du Config)
  const serveStart = String((st as any).serveStart ?? "manual");
  const serviceEvery = Math.max(1, Number((st as any).serviceEvery ?? 2));
  const deuceServiceEvery = Math.max(1, Number((st as any).deuceServiceEvery ?? 1));

  // État local pour "manual" et "toss_first_point"
  const [manualStart, setManualStart] = React.useState<"A" | "B" | null>(null);
  const [firstPointSide, setFirstPointSide] = React.useState<"A" | "B" | null>(null);

  // Reset au changement de set
  React.useEffect(() => {
    setManualStart(null);
    setFirstPointSide(null);
  }, [Number((st as any).setIndex ?? 1)]);

  const totalPts = ptsA + ptsB;
  const interval = inDeuce ? deuceServiceEvery : serviceEvery;

  const startSide: "A" | "B" | null =
    serveStart === "A"
      ? "A"
      : serveStart === "B"
      ? "B"
      : serveStart === "manual"
      ? manualStart
      : serveStart === "toss_first_point"
      ? firstPointSide
      : "A";

  type ServeSlot = { side: "A" | "B"; idx: 0 | 1 };

  const serveSequence: ServeSlot[] = React.useMemo(() => {
    if (is2v2)
      return [
        { side: "A", idx: 0 },
        { side: "B", idx: 0 },
        { side: "A", idx: 1 },
        { side: "B", idx: 1 },
      ];
    if (is2v1)
      return [
        { side: "A", idx: 0 },
        { side: "B", idx: 0 },
        { side: "A", idx: 1 },
        { side: "B", idx: 0 },
      ];
    return [
      { side: "A", idx: 0 },
      { side: "B", idx: 0 },
    ];
  }, [is2v2, is2v1]);

  const currentServe: ServeSlot | null = React.useMemo(() => {
    if (!startSide) return null;
    const seq = serveSequence;
    if (!seq.length) return null;

    // Décale la séquence si on commence par B
    let rotated = seq.slice();
    if (startSide === "B") {
      const firstB = rotated.findIndex((s) => s.side === "B");
      if (firstB > 0) rotated = rotated.slice(firstB).concat(rotated.slice(0, firstB));
    }

    const turn = Math.floor(totalPts / interval) % rotated.length;
    return rotated[turn] ?? null;
  }, [startSide, serveSequence, totalPts, interval]);

  const sideAPlayers = React.useMemo(() => splitNames(nameA), [nameA]);
  const sideBPlayers = React.useMemo(() => splitNames(nameB), [nameB]);

  const serverLabel = React.useMemo(() => {
    if (!currentServe) return "—";
    if (!is2v2 && !is2v1) return currentServe.side === "A" ? nameA : nameB;

    const arr = currentServe.side === "A" ? sideAPlayers : sideBPlayers;
    const fallback = currentServe.side === "A" ? nameA : nameB;
    const who = arr[currentServe.idx] || fallback;
    return `${who} (${currentServe.side}${currentServe.idx + 1})`;
  }, [currentServe, is2v2, is2v1, nameA, nameB, sideAPlayers, sideBPlayers]);

  const handleAddPoint = React.useCallback(
    (side: "A" | "B", delta: number) => {
      // scoring verrouillé tant que le match n'est pas démarré
      if (!matchStarted) return;
      // Détermine le 1er serveur au 1er point (si option)
      if (delta > 0 && serveStart === "toss_first_point" && !firstPointSide && totalPts === 0) {
        setFirstPointSide(side);
      }
      setSt((prev: any) => addPoint(prev, side, delta));
    },
    [serveStart, firstPointSide, totalPts, matchStarted]
  );


  const advStats = React.useMemo(() => {
    const log = Array.isArray((st as any).pointLog) ? ((st as any).pointLog as any[]) : [];
    const pts = { A: 0, B: 0 };
    const ptsOnServe = { A: 0, B: 0 };
    const ptsOnReturn = { A: 0, B: 0 };

    // streak max (consecutive point winners)
    let curW: "A" | "B" | null = null;
    let curLen = 0;
    const streakMax = { A: 0, B: 0 };

    // set point opportunities / converted
    const setPoints = { A: 0, B: 0 };
    const setPointsConv = { A: 0, B: 0 };

    let sA = 0;
    let sB = 0;
    let currentSet = 1;

    const canWinSetNext = (a: number, b: number, side: "A" | "B") => {
      const pps = Number((st as any).pointsPerSet ?? 11);
      const w2 = (st as any).winByTwo !== false;
      const a2 = side === "A" ? a + 1 : a;
      const b2 = side === "B" ? b + 1 : b;

      if (!w2) return a2 >= pps || b2 >= pps;

      if (a2 >= pps || b2 >= pps) {
        const d = Math.abs(a2 - b2);
        return d >= 2;
      }
      return false;
    };

    // iterate point by point in order
    let a = 0;
    let b = 0;
    for (let i = 0; i < log.length; i++) {
      const e = log[i];
      const w: "A" | "B" = e?.winner === "B" ? "B" : "A";
      const server: "A" | "B" = e?.server === "B" ? "B" : "A";
      const si = Number(e?.setIndex ?? currentSet);

      // detect new set (robust if log contains setIndex)
      if (si !== currentSet) {
        currentSet = si;
        a = 0;
        b = 0;
      }

      // opportunity BEFORE the point
      if (canWinSetNext(a, b, "A")) setPoints.A += 1;
      if (canWinSetNext(a, b, "B")) setPoints.B += 1;

      // apply point
      if (w === "A") a += 1;
      else b += 1;

      pts[w] += 1;
      if (w === server) ptsOnServe[w] += 1;
      else ptsOnReturn[w] += 1;

      // streak
      if (curW === w) curLen += 1;
      else {
        curW = w;
        curLen = 1;
      }
      streakMax[w] = Math.max(streakMax[w], curLen);

      // if set won at this point, check conversion
      const pps = Number((st as any).pointsPerSet ?? 11);
      const w2 = (st as any).winByTwo !== false;
      const diff = Math.abs(a - b);
      const setWon = (a >= pps || b >= pps) && (!w2 || diff >= 2) && (a !== b);
      if (setWon) {
        // conversion: winner had opportunity right before the winning point
        if (w === "A") setPointsConv.A += 1;
        else setPointsConv.B += 1;

        // reset for next set (next point should carry setIndex+1)
        a = 0;
        b = 0;
      }
    }

    // average points per set (sets finished + current if started)
    const setsFinished = Math.max(0, Number((st as any).setIndex ?? 1) - 1);
    const inSet = (Number((st as any).pointsA ?? 0) + Number((st as any).pointsB ?? 0)) > 0 ? 1 : 0;
    const denomSets = Math.max(1, setsFinished + inSet);

    const avgA = pts.A / denomSets;
    const avgB = pts.B / denomSets;

    const pctA = setPoints.A ? Math.round((setPointsConv.A / setPoints.A) * 100) : 0;
    const pctB = setPoints.B ? Math.round((setPointsConv.B / setPoints.B) * 100) : 0;

    return {
      totalPts: pts,
      ptsOnServe,
      ptsOnReturn,
      streakMax,
      ptsPerSetAvg: { A: avgA, B: avgB },
      setPoints,
      setPointsConv,
      setPointsPct: { A: pctA, B: pctB },
    };
  }, [st]);
  const handleUndo = React.useCallback(() => {
    setSt((prev: any) => undo(prev));
    // best-effort : si on revient à 0–0, reset le toss
    if (serveStart === "toss_first_point" && totalPts <= 1) setFirstPointSide(null);
  }, [serveStart, totalPts]);

  // ✅ finish hook (si ton store marque finished)
  React.useEffect(() => {
    if (!(st as any).finished) return;
    if (!onFinish) return;
    try {
      onFinish({
        sport: "pingpong",
        matchId: (st as any).matchId,
        mode: (st as any).mode,
        uiMode,
        sideA: nameA,
        sideB: nameB,
        pointsA: ptsA,
        pointsB: ptsB,
        setsA,
        setsB,
        pointsPerSet,
        setsToWin,
        winByTwo,
        finishedAt: Date.now(),
      });
    } catch {}
  }, [(st as any).finished, onFinish, uiMode, nameA, nameB, ptsA, ptsB, setsA, setsB, pointsPerSet, setsToWin, winByTwo]);

  const canPlay = !(st as any).finished;
  const canScore = canPlay && matchStarted;


const infoDotContent = (
  <div style={{ display: "grid", gap: 8 }}>
    <div>
      <div style={{ fontWeight: 1200 as any, marginBottom: 6 }}>Règles officielles (résumé)</div>
      <div style={{ opacity: 0.92, lineHeight: 1.35 }}>
        • Un set se joue à <b>{pointsPerSet}</b> points (souvent 11).<br />
        • Victoire avec <b>2 points d’écart</b> {winByTwo ? "(activé)" : "(désactivé)"} ; en cas d’égalité, on continue jusqu’à +2.<br />
        • Service : alternance tous les <b>{serviceEvery}</b> points, puis en deuce tous les <b>{deuceServiceEvery}</b> point(s).<br />
        • En double : service alterné + réception alternée (rotation d’équipe).
      </div>
    </div>

    <div>
      <div style={{ fontWeight: 1200 as any, marginBottom: 6 }}>Conditions de victoire</div>
      <div style={{ opacity: 0.92, lineHeight: 1.35 }}>
        • {setsToWin} set(s) gagnant(s) pour gagner le match.<br />
        • Mode: <b>{uiMode}</b> • Preset: <b>{String((st as any).rulesPreset ?? "official")}</b>
      </div>
    </div>

    <div>
      <div style={{ fontWeight: 1200 as any, marginBottom: 6 }}>Variantes FUN (si activées)</div>
      <div style={{ opacity: 0.88, lineHeight: 1.35 }}>
        • Service “toss” : le <b>1er point</b> détermine le serveur du set.<br />
        • Switch de côtés possible à chaque set / au set décisif.<br />
        • Tournante : duel, perdant éliminé, vainqueur reste (file d’attente).
      </div>
    </div>

    <div style={{ opacity: 0.85, fontSize: 12 }}>
      Astuce: en fin de set (deuce), ne panique pas — joue “safe” sur remise, cherche le point faible sur 2–3 échanges.
    </div>
  </div>
);

  return (
    <div className="container" style={wrap(theme)}>
      <style>
        {`@keyframes ppPulse { 0%{filter:drop-shadow(0 0 0 rgba(0,0,0,0));} 50%{filter:drop-shadow(0 0 16px rgba(255,255,255,0.10));} 100%{filter:drop-shadow(0 0 0 rgba(0,0,0,0));} }
           @keyframes ppNeon { 0%{opacity:.85} 50%{opacity:1} 100%{opacity:.85} }`}
      </style>
      {/* HEADER (même approche visuelle que Pétanque : ticker + dots) */}
      <div style={{ marginLeft: -14, marginRight: -14, marginTop: -14 }}>
        <div style={{ position: "relative" }}>
          {ticker ? (
            <img src={ticker} alt="Ping-Pong" style={tickerImg} draggable={false} />
          ) : (
            <div style={{ height: 74 }} />
          )}

          <div style={{ position: "absolute", left: 10, top: "max(10px, env(safe-area-inset-top))" }}>
            <BackDot onClick={() => go("pingpong_menu")} />
          </div>

          <div style={{ position: "absolute", right: 10, top: "max(10px, env(safe-area-inset-top))" }}>
            <InfoDot title="Règles Ping-Pong" content={infoDotContent} />
          </div>
        </div>
      </div>

      {/* SCORE / TEAMS (structure carte identique) */}
      <div style={card(theme)}>
        {/* Avatars de fond (zoom + dégradé) — style X01/Battle */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 78%, rgba(0,0,0,0) 100%)",
              maskImage:
                "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 78%, rgba(0,0,0,0) 100%)",
            }}
          >
            <div style={{ transform: "scale(1.55)", transformOrigin: "0% 50%", filter: "blur(0.2px)" }}>
              {profileA ? (
                <ProfileAvatar profile={profileA as any} label={nameA} size={220} showStars={false} />
              ) : null}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              WebkitMaskImage:
                "linear-gradient(270deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 78%, rgba(0,0,0,0) 100%)",
              maskImage:
                "linear-gradient(270deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 78%, rgba(0,0,0,0) 100%)",
            }}
          >
            <div style={{ transform: "scale(1.55)", transformOrigin: "100% 50%", filter: "blur(0.2px)" }}>
              {profileB ? (
                <ProfileAvatar profile={profileB as any} label={nameB} size={220} showStars={false} />
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {profileA ? (
                <ProfileAvatar profile={profileA as any} label={nameA} size={62} showStars={false} />
              ) : (
                <div
                  style={{
                    width: 62,
                    height: 62,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 1100,
                    opacity: 0.92,
                  }}
                >
                  {initials(nameA)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 1100 as any, opacity: 0.96, textAlign: "center" }}>
              {nameA}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...sub(theme) }}>Sets</span>
              <span style={{ fontWeight: 1200 as any }}>{setsA}</span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                ...sub(theme),
                marginBottom: 4,
                fontSize: 16,
                color: primaryColor(theme),
                textShadow: `0 0 12px ${hexToRgba(primaryColor(theme), 0.35)}`,
                fontFamily:
                  "Bangers, 'Luckiest Guy', system-ui, -apple-system, Segoe UI, Roboto, Arial",
                letterSpacing: 1,
                animation: "ppNeon 1.6s ease-in-out infinite",
              }}
            >
              SCORE
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    style={pmBtn(theme)}
                    onClick={() => handleAddPoint("A", +1)}
                    disabled={!canScore}
                    aria-label="Ajouter point A"
                  >
                    +
                  </button>
                  <button
                    style={pmBtn(theme)}
                    onClick={() => handleAddPoint("A", -1)}
                    disabled={!canScore}
                    aria-label="Retirer point A"
                  >
                    –
                  </button>
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <div style={scoreBig(theme, "A")}>{ptsA}</div>
                  </div>
                </div>

              <div style={{ fontSize: 20, opacity: 0.55, fontWeight: 1200 as any, lineHeight: 1 }}>–</div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <div style={scoreBig(theme, "B")}>{ptsB}</div>
                  </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    style={pmBtn(theme)}
                    onClick={() => handleAddPoint("B", +1)}
                    disabled={!canScore}
                    aria-label="Ajouter point B"
                  >
                    +
                  </button>
                  <button
                    style={pmBtn(theme)}
                    onClick={() => handleAddPoint("B", -1)}
                    disabled={!canScore}
                    aria-label="Retirer point B"
                  >
                    –
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <div style={setPillMini(theme)}>
                SET <b style={{ fontWeight: 1200 as any }}>{(st as any).setIndex ?? 1}</b>
              </div>
              <button
                style={infoMiniBtn(theme)}
                onClick={() => setShowRules((v) => !v)}
                aria-label="Détails réglages"
                title="Détails réglages"
              >
                i
              </button>
            </div>

            
{showRules && (
  <div style={miniWrap} onClick={() => setShowRules(false)}>
    <div style={miniCard(theme)} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 1200 as any, marginBottom: 10 }}>Infos match</div>

      <div style={{ display: "grid", gap: 8, opacity: 0.94, lineHeight: 1.35 }}>
        <div>
          <b>Format</b> : {setsToWin} sets gagnants • {pointsPerSet} pts •{" "}
          {winByTwo ? "écart 2 (deuce)" : "sans écart"}
        </div>
        <div>
          <b>Mode</b> : {uiMode}
        </div>
        <div>
          <b>Service</b> : {String((st as any).serveStart ?? "manual")}
        </div>
        <div>
          <b>Rotation</b> : {serviceEvery} pts (deuce: {deuceServiceEvery})
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button style={ghost(theme)} onClick={() => setShowRules(false)}>
          Fermer
        </button>
      </div>
    </div>
  </div>
)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>

            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {profileB ? (
                <ProfileAvatar profile={profileB as any} label={nameB} size={62} showStars={false} />
              ) : (
                <div
                  style={{
                    width: 62,
                    height: 62,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 1100,
                    opacity: 0.92,
                  }}
                >
                  {initials(nameB)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 1100 as any, opacity: 0.96, textAlign: "center" }}>
              {nameB}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...sub(theme) }}>Sets</span>
              <span style={{ fontWeight: 1200 as any }}>{setsB}</span>
            </div>
          </div>
        </div>

        {/* actions header */}
        <div style={row}>
          <button
            style={{
              ...primary(theme),
              background: matchStarted
                ? `linear-gradient(180deg, ${hexToRgba(primaryColor(theme), 0.22)}, rgba(0,0,0,0.10))`
                : (primary(theme).background as any),
              boxShadow: matchStarted
                ? `0 12px 34px rgba(0,0,0,0.40), 0 0 26px ${hexToRgba(primaryColor(theme), 0.22)}`
                : (primary(theme) as any).boxShadow,
              animation: matchStarted ? "ppPulse 1.25s ease-in-out infinite" : undefined,
              opacity: matchStarted ? 1 : 0.95,
            }}
            onClick={() => {
              // "DÉMARRER" = état match réel
              if (matchStarted) return;
              if (serveStart === "manual" && !manualStart && !isTournante) return;
              setSt((prev: any) => {
                const t = Date.now();
                return {
                  ...prev,
                  matchStarted: true,
                  matchStartedAt: (prev as any).matchStartedAt ?? t,
                  setStartedAt: (prev as any).setStartedAt ?? t,
                  updatedAt: t,
                };
              });
            }}
            disabled={matchStarted || (serveStart === "manual" && !manualStart && !isTournante)}
          >
            {matchStarted ? "EN COURS" : "DÉMARRER"}
          </button>
          {matchStarted && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 as any }}>
              ⏱ {formatMs(matchElapsedMs)}
              <span style={{ opacity: 0.7, fontWeight: 800 as any }}> · Set {formatMs(currentSetElapsedMs)}</span>
            </div>
          )}
          {!isTournante && (serveStart === "manual" || serveStart === "toss_first_point") && (
            <button
              style={ghost(theme)}
              onClick={() => {
                // override manuel AVANT start (sinon ça perturbe la rotation)
                if (matchStarted) return;
                if (serveStart === "manual") setManualStart(null);
                if (serveStart === "toss_first_point") setFirstPointSide(null);
              }}
              disabled={!canPlay || matchStarted}
            >
              SERVICE
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Statistiques</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Ping-Pong</div>
        </div>
  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
    {[
    { label: "Sets remportés", a: setsA, b: setsB, hint: `${setsToWin} pour gagner` },
    { label: "Points (set)", a: ptsA, b: ptsB, hint: `${pointsPerSet} / set` },
    { label: "Points totaux", a: advStats.totalPts.A, b: advStats.totalPts.B, hint: "tous sets confondus" },
    { label: "Pts sur service", a: advStats.ptsOnServe.A, b: advStats.ptsOnServe.B, hint: "quand tu sers" },
    { label: "Pts en retour", a: advStats.ptsOnReturn.A, b: advStats.ptsOnReturn.B, hint: "service adverse" },
    { label: "Streak max", a: advStats.streakMax.A, b: advStats.streakMax.B, hint: "série de points" },
    ].map((r, idx) => (
      <div
        key={idx}
        style={{
          borderRadius: 14,
          border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
          background: cssVarOr("rgba(15,18,28,0.60)", "--glassSoft"),
          padding: "8px 10px",
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div style={{ fontWeight: 1200 as any, fontSize: 16 }}>{r.a}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 1100 as any, opacity: 0.92, fontSize: 13 }}>{r.label}</div>
          <div style={{ fontSize: 10, opacity: 0.72 }}>{r.hint}</div>
        </div>
        <div style={{ fontWeight: 1200 as any, fontSize: 16, textAlign: "right" }}>{r.b}</div>
      </div>
    ))}
  </div>
</div>

{/* ACTIONS */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Actions</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Match</div>
        </div>

        <div style={row}>
  <button style={ghost(theme)} onClick={() => go("pingpong_config")}>
    Retour (config)
  </button>

  <button
    style={primary(theme)}
    onClick={() => {
      const next = resetPingPong(st as any);
      setManualStart(null);
      setTossWinner(null);
      setSt(next as any);
    }}
  >
    Relancer
  </button>

  <button
    style={danger(theme)}
    onClick={() => {
      go("pingpong_menu");
    }}
  >
    Quitter
  </button>
</div>
      </div>


      {/* FIN DE PARTIE (overlay dédié style X01) */}
      {finished && (
        <div style={finishWrap} onClick={() => {
          // click outside: go menu (safe) — mais on laisse les boutons faire le job
        }}>
          <div style={finishCard(theme)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1400 as any, fontSize: 20 }}>🏁 Fin de partie</div>
                <div style={{ opacity: 0.82, fontSize: 12, marginTop: 2 }}>
                  Vainqueur : <b>{winner === "A" ? nameA : winner === "B" ? nameB : "—"}</b>
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
                <div>⏱ {formatMs(matchElapsedMs)}</div>
                <div style={{ opacity: 0.75 }}>sets : {Array.isArray((st as any).setDurationsMs) ? (st as any).setDurationsMs.length : 0}</div>
              </div>
            </div>

            <div style={{ height: 10 }} />

            {/* Tableau comparatif */}
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Sets remportés", a: (st as any).setsA ?? 0, b: (st as any).setsB ?? 0, hint: "pour gagner" },
                { label: "Points totaux", a: advStats.pts.A, b: advStats.pts.B, hint: "tous sets confondus" },
                { label: "Pts sur SON service", a: advStats.ptsOnServe.A, b: advStats.ptsOnServe.B, hint: "points gagnés au service" },
                { label: "Pts sur service adverse", a: advStats.ptsOnReturn.A, b: advStats.ptsOnReturn.B, hint: "points gagnés en retour" },
                { label: "Streak max", a: advStats.streakMax.A, b: advStats.streakMax.B, hint: "série de points" },
                { label: "Pts / set (moy.)", a: Math.round((advStats.avgPerSet.A + Number.EPSILON) * 10) / 10, b: Math.round((advStats.avgPerSet.B + Number.EPSILON) * 10) / 10, hint: "moyenne par set" },
                { label: "Balles de set", a: advStats.setPoints.A, b: advStats.setPoints.B, hint: "opportunités détectées" },
                { label: "% balles de set", a: `${advStats.setPointsPct.A}%`, b: `${advStats.setPointsPct.B}%`, hint: "converties / obtenues" },
              ].map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
                    background: cssVarOr("rgba(15,18,28,0.60)", "--glassSoft"),
                    padding: "8px 10px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 1fr",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 1200 as any, fontSize: 16 }}>{r.a}</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 1100 as any, opacity: 0.92, fontSize: 13 }}>{r.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.72 }}>{r.hint}</div>
                  </div>
                  <div style={{ fontWeight: 1200 as any, fontSize: 16, textAlign: "right" }}>{r.b}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 10 }} />

            {/* Durées par set */}
            {Array.isArray((st as any).setDurationsMs) && (st as any).setDurationsMs.length > 0 && (
              <div style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div style={{ fontWeight: 1200 as any, marginBottom: 6 }}>⏱ Durées par set</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {(st as any).setDurationsMs.map((ms: number, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
                      <div>Set {i + 1}</div>
                      <div style={{ fontWeight: 1100 as any }}>{formatMs(Number(ms ?? 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
              <button style={ghost(theme)} onClick={() => go("pingpong_config")}>Retour (config)</button>
              <button
                style={primary(theme)}
                onClick={() => {
                  const next = resetPingPong(st as any);
                  setManualStart(null);
                  setTossWinner(null);
                  setSt(next as any);
                }}
              >
                Relancer
              </button>
              <button style={danger(theme)} onClick={() => go("pingpong_menu")}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal départ (manual) */}
      {serveStart === "manual" && !manualStart && canPlay && !isTournante && (
        <div style={sheetWrap}>
          <div style={sheetCard(theme)}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>Ordre de départ</div>
            <div style={{ opacity: 0.9, marginBottom: 10 }}>
              Choisis qui sert en premier pour ce set.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={primary(theme)} onClick={() => setManualStart("A")}>
                {nameA} sert
              </button>
              <button style={primary(theme)} onClick={() => setManualStart("B")}>
                {nameB} sert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
=========================== LEGACY CONTENT (NE PAS SUPPRIMER) ===========================

(Le legacy complet est volontairement conservé ici, en commentaire.)

========================================================================================
*/