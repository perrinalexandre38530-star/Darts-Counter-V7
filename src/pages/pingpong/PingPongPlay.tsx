// ============================================
// src/pages/pingpong/PingPongPlay.tsx
// ✅ UI calquée sur src/pages/petanque/PetanquePlay.tsx (mêmes helpers visuels wrap/card/boutons)
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
const TICKERS = import.meta.glob("../../assets/tickers/*.png", { eager: true, import: "default" }) as Record<string, string>;

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
  if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(s)) return fallback;
  return s;
}

function findProfile(profilesList: Profile[], label: string) {
  const n = String(label || "").trim().toLowerCase();
  if (!n) return null;
  return (
    (profilesList as any[]).find((p) => String(p.nickname || "").trim().toLowerCase() === n) ||
    (profilesList as any[]).find((p) => String(p.name || "").trim().toLowerCase() === n) ||
    (profilesList as any[]).find((p) => String(p.email || "").trim().toLowerCase() === n) ||
    null
  );
}

function looksLikeUuid(v: any): boolean {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(s);
}

function resolveProfile(profilesList: Profile[], idOrName?: any, fallbackName?: string): Profile | null {
  const id = String(idOrName || "").trim();

  // 1) match by id (uuid)
  if (id && looksLikeUuid(id)) {
    const hit = profilesList.find(
      (p) => String((p as any)?.id || (p as any)?.profileId || "").trim() === id
    );
    if (hit) return hit;
  }

  // 2) match by exact name (nickname/displayName/name/email local part)
  const wanted = String(fallbackName || (looksLikeUuid(idOrName) ? "" : idOrName || ""))
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
    if (candFields(p).some((c: any) => String(c).trim().toLowerCase().replace(/\s+/g, " ") === wanted)) return p;
  }
  for (const p of profilesList) {
    if (candFields(p).some((c: any) => String(c).trim().toLowerCase().includes(wanted) || wanted.includes(String(c).trim().toLowerCase()))) return p;
  }
  return null;
}


function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "J";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function cssVarOr(fallback: string, varName: string) {
return `var(${varName}, ${fallback})`;
}

function hexToRgba(hex: string, a: number) {
  const h = String(hex || "").replace("#", "").trim();
  if (!h) return `rgba(255,200,90,${a})`;
  const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
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
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
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
    gap: 10,
    overflow: "hidden",
    backdropFilter: "blur(12px)",
  };
}


function cardSoft(theme: any): React.CSSProperties {
return {
  borderRadius: 16,
  padding: 12,
  border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
  background: cssVarOr("rgba(0,0,0,0.14)", "--glass2"),
  display: "flex",
  flexDirection: "column",
  gap: 10,
  backdropFilter: "blur(10px)",
};
}

function sub(_theme: any): React.CSSProperties {
return { fontWeight: 900, opacity: 0.85 };
}

const row: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };

function primary(theme: any): React.CSSProperties {
return {
  flex: 1,
  borderRadius: 14,
  padding: "6px 10px",
  border: `1px solid ${cssVarOr("rgba(255,255,255,0.18)", "--stroke")}`,
  background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
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
  background: "linear-gradient(180deg, rgba(255,60,60,0.22), rgba(255,60,60,0.12))",
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

function chipBtn(theme: any): React.CSSProperties {
return {
  borderRadius: 999,
  padding: "6px 10px",
  border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
  background: "linear-gradient(180deg, rgba(240,177,42,0.18), rgba(0,0,0,0.12))",
  color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
  fontWeight: 1100 as any,
  cursor: "pointer",
  letterSpacing: 0.5,
};
}

function modeBtn(theme: any, active: boolean): React.CSSProperties {
return {
  borderRadius: 999,
  padding: "6px 10px",
  border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
  background: active ? "rgba(240,177,42,0.16)" : cssVarOr("rgba(255,255,255,0.06)", "--glass"),
  color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
  fontWeight: 1100 as any,
  cursor: "pointer",
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
gap: 10,
};

function ptBtn(theme: any): React.CSSProperties {
  const p = primaryColor(theme);
  const s = secondaryColor(theme);
  return {
    flex: 1,
    borderRadius: 14,
    padding: "12px 0",
    border: `1px solid ${hexToRgba(p, 0.22)}`,
    background: `linear-gradient(180deg, ${hexToRgba(p, 0.10)}, ${hexToRgba(s, 0.04)})`,
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
  const teamAIds = Array.isArray((st as any)?.teamAProfileIds) ? (st as any).teamAProfileIds : [];
  const teamBIds = Array.isArray((st as any)?.teamBProfileIds) ? (st as any).teamBProfileIds : [];
  const profileA = React.useMemo(() => resolveProfile(profilesList, teamAIds?.[0], st.sideA), [profilesList, teamAIds?.[0], st.sideA]);
  const profileB = React.useMemo(() => resolveProfile(profilesList, teamBIds?.[0], st.sideB), [profilesList, teamBIds?.[0], st.sideB]);
  const nameA = React.useMemo(
    () => safeName((profileA as any)?.nickname || (profileA as any)?.displayName || (profileA as any)?.name || st.sideA, "—"),
    [profileA, st.sideA]
  );
  const nameB = React.useMemo(
    () => safeName((profileB as any)?.nickname || (profileB as any)?.displayName || (profileB as any)?.name || st.sideB, "—"),
    [profileB, st.sideB]
  );

  const ptsA = Number((st as any).pointsA ?? 0);
  const ptsB = Number((st as any).pointsB ?? 0);
  const setsA = Number((st as any).setsA ?? 0);
  const setsB = Number((st as any).setsB ?? 0);

  const pointsPerSet = Number((st as any).pointsPerSet ?? 11);
  const setsToWin = Number((st as any).setsToWin ?? 1);
  const winByTwo = Boolean((st as any).winByTwo ?? true);

  const inDeuce = ptsA >= pointsPerSet - 1 && ptsB >= pointsPerSet - 1;
  const played = ptsA + ptsB;
  const diff = Math.abs(ptsA - ptsB);

  const uiMode = String((st as any).uiMode ?? (st as any).mode ?? "match_1v1");
  const ticker = React.useMemo(() => {
    if (uiMode.includes("tournante")) return getTickerFromCandidates(["pingpong_tournante", "pingpong_games", "pingpong"]);
    if (uiMode.includes("2v2")) return getTickerFromCandidates(["pingpong_2v2", "pingpong_games", "pingpong"]);
    if (uiMode.includes("2v1")) return getTickerFromCandidates(["pingpong_2v1", "pingpong_games", "pingpong"]);
    return getTickerFromCandidates(["pingpong_1v1", "pingpong_games", "pingpong"]);
  }, [uiMode]);

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
  }, [(st as any).finished, onFinish]);

  return (
    <div className="container" style={wrap(theme)}>
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
            <InfoDot />
          </div>
        </div>
      </div>

      {/* SCORE / TEAMS (structure carte identique) */}
      <div style={card(theme)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 62, height: 62, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.18)" }}>
              {profileA ? (
                <ProfileAvatar profile={profileA as any} label={nameA} size={62} showStars={false} />
              ) : (
                <div style={{ width: 62, height: 62, display: "grid", placeItems: "center", fontWeight: 1100, opacity: 0.92 }}>
                  {initials(nameA)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 1100 as any, opacity: 0.96, textAlign: "center" }}>{nameA}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...sub(theme) }}>Sets</span>
              <span style={{ fontWeight: 1200 as any }}>{setsA}</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ ...sub(theme), marginBottom: 6 }}>SCORE</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 10 }}>
              <div style={kpi()}>{ptsA}</div>
              <div style={{ fontSize: 22, opacity: 0.7 }}>–</div>
              <div style={kpi()}>{ptsB}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              SET {(st as any).setIndex ?? 1} • {setsToWin} sets gagnants • {pointsPerSet} pts {winByTwo ? "• écart 2" : ""}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 62, height: 62, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.18)" }}>
              {profileB ? (
                <ProfileAvatar profile={profileB as any} label={nameB} size={62} showStars={false} />
              ) : (
                <div style={{ width: 62, height: 62, display: "grid", placeItems: "center", fontWeight: 1100, opacity: 0.92 }}>
                  {initials(nameB)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 1100 as any, opacity: 0.96, textAlign: "center" }}>{nameB}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...sub(theme) }}>Sets</span>
              <span style={{ fontWeight: 1200 as any }}>{setsB}</span>
            </div>
          </div>
        </div>

        {/* actions header */}
        <div style={row}>
          <button style={primary(theme)} onClick={() => {}} disabled>
            DÉMARRER
          </button>
          <button style={ghost(theme)} onClick={() => {}} disabled>
            SERVICE
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Statistiques</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Ping-Pong</div>
        </div>

        <div style={grid2}>
          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Sets</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 1200 as any }}>
                {setsA}–{setsB}
              </div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>best-of</div>
            </div>
          </div>

          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Points</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 1200 as any }}>
                {ptsA}–{ptsB}
              </div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>{pointsPerSet} / set</div>
            </div>
          </div>

          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Deuce</div>
            <div style={{ fontWeight: 1200 as any }}>{inDeuce ? "OUI" : "NON"}</div>
          </div>

          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Écart</div>
            <div style={{ fontWeight: 1200 as any }}>{diff}</div>
          </div>

          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Points joués</div>
            <div style={{ fontWeight: 1200 as any }}>{played}</div>
          </div>

          <div style={cardSoft(theme)}>
            <div style={sub(theme)}>Serveur</div>
            <div style={{ fontWeight: 1200 as any }}>{String((st as any).serverLabel || "—")}</div>
          </div>
        </div>
      </div>

      {/* POINTS (remplace Mene) */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Point</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>+1 / -1</div>
        </div>

        <div style={ptsGrid}>
          <button style={ptBtn(theme)} onClick={() => setSt((prev: any) => addPoint(prev, "A", +1))}>+1 A</button>
          <button style={ptBtn(theme)} onClick={() => setSt((prev: any) => addPoint(prev, "B", +1))}>+1 B</button>
          <button style={ptBtn(theme)} onClick={() => setSt((prev: any) => addPoint(prev, "A", -1))}>-1 A</button>
          <button style={ptBtn(theme)} onClick={() => setSt((prev: any) => addPoint(prev, "B", -1))}>-1 B</button>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Actions</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Match</div>
        </div>

        <div style={row}>
          <button style={ghost(theme)} onClick={() => setSt((prev: any) => undo(prev))}>Annuler dernier point</button>
          <button
            style={danger(theme)}
            onClick={() => {
              resetPingPong();
              go("pingpong_config");
            }}
          >
            Nouvelle partie
          </button>
        </div>
      </div>

      {/* OPTIONS */}
      <div style={card(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 1100 as any }}>Options avancées</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Officiel / Fun / Custom</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <div style={{ opacity: 0.9 }}>Mode</div>
          <div style={{ ...sub(theme) }}>{uiMode}</div>

          <div style={{ opacity: 0.9 }}>Service</div>
          <div style={{ ...sub(theme) }}>{String((st as any).serveStart ?? "manual")}</div>

          <div style={{ opacity: 0.9 }}>Rotation</div>
          <div style={{ ...sub(theme) }}>
            {String((st as any).serviceEvery ?? 2)} pts (deuce: {String((st as any).deuceServiceEvery ?? 1)})
          </div>
        </div>
      </div>
    </div>
  );
}

/*
=========================== LEGACY CONTENT (NE PAS SUPPRIMER) ===========================

// =============================================================

// ✅ Tickers (comme Config)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", { eager: true, import: "default" }) as Record<string, string>;

function getTickerFromCandidates(candidates: string[]) {
  const uniq = Array.from(new Set((candidates || []).filter(Boolean)));
  for (const id of uniq) {
    const norm = String(id).trim().toLowerCase();
    const cand = Array.from(new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])).filter(Boolean);
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

function splitNames(s: string): string[] {
  return String(s || "").split(/\s*(?:·|&|\+|,|\/|\|)\s* /g).map(x => String(x||"").trim()).filter(Boolean).slice(0, 4);
}

// ✅ Profils cache (pour récupérer les avatars, comme la page Profils)
const PROFILES_CACHE_KEY = "dc-profiles-cache-v1";

function readProfilesCache(): any[] {
  try {
    const raw = localStorage.getItem(PROFILES_CACHE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normName(s: any) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveProfileByName(name: string): any | null {
  const n = normName(name);
  if (!n) return null;
  const list = readProfilesCache();
  // match nickname/name/displayName/email local part
  for (const p of list) {
    const cands = [
      p?.nickname,
      p?.displayName,
      p?.name,
      p?.username,
      p?.email ? String(p.email).split("@")[0] : null,
    ].filter(Boolean);
    if (cands.some((c: any) => normName(c) === n)) return p;
  }
  // fallback: includes match
  for (const p of list) {
    const cands = [
      p?.nickname,
      p?.displayName,
      p?.name,
      p?.username,
      p?.email ? String(p.email).split("@")[0] : null,
    ].filter(Boolean);
    if (cands.some((c: any) => normName(c).includes(n) || n.includes(normName(c)))) return p;
  }
  return null;
}
// src/pages/pingpong/PingPongPlay.tsx
// Ping-Pong — Play (LOCAL ONLY)
// - Sets + points A/B + undo
// - Auto appelle onFinish() quand sets gagnants atteints
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  addPoint,
  loadPingPongState,
  savePingPongState,
  undo as undoPoint,
} from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

export default function PingPongPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  // ✅ Résolution avatars depuis le cache profils
  const profileA = React.useMemo(() => resolveProfileByName(st.sideA), [st.sideA]);
  const profileB = React.useMemo(() => resolveProfileByName(st.sideB), [st.sideB]);

  React.useEffect(() => {
    savePingPongState(st);
  }, [st]);

  const finish = React.useCallback(() => {
    if (!onFinish) return;
    const now = Date.now();
    if (st.mode === "tournante") {
      const w = st.tournanteWinner || (Array.isArray(st.tournantePlayers) && st.tournantePlayers.length === 1 ? st.tournantePlayers[0] : null);
      onFinish({
        id: st.matchId,
        kind: "pingpong",
        sport: "pingpong",
        createdAt: st.createdAt || now,
        updatedAt: now,
        mode: "tournante",
        players: { active: [st.tournanteActiveA, st.tournanteActiveB, ...(st.tournanteQueue || [])].filter(Boolean), eliminated: st.tournanteEliminated || [] },
        winnerName: w,
        summary: {
          title: w ? `Tournante — Vainqueur : ${w}` : "Tournante — terminée",
        },
      });
      return;
    }

    const winnerSideId = st.winner;
    const title =
      st.mode === "simple"
        ? `${st.sideA} ${st.pointsA}–${st.pointsB} ${st.sideB}`
        : `${st.sideA} ${st.setsA}–${st.setsB} ${st.sideB}`;

    onFinish({
      id: st.matchId,
      kind: "pingpong",
      sport: "pingpong",
      createdAt: st.createdAt || now,
      updatedAt: now,
      mode: st.mode,
      uiMode: (st as any).uiMode ?? null,
      sides: {
        A: { id: "A", name: st.sideA },
        B: { id: "B", name: st.sideB },
      },
      config: { pointsPerSet: st.pointsPerSet, setsToWin: st.setsToWin, winByTwo: st.winByTwo },
      state: {
        setIndex: st.setIndex,
        points: { A: st.pointsA, B: st.pointsB },
        sets: { A: st.setsA, B: st.setsB },
      },
      winnerSideId,
      summary: {
        title,
        detail:
          st.mode === "simple"
            ? `Points: ${st.pointsA}–${st.pointsB}`
            : `Points set ${st.setIndex}: ${st.pointsA}–${st.pointsB}`,
      },
    });
  }, [onFinish, st]);

  React.useEffect(() => {
    if (st.finished) finish();
  }, [st.finished, finish]);  // UI mode (menu games): match_1v1 / match_2v2 / match_2v1 / tournante / training
  const uiMode: string = String((st as any)?.uiMode ?? (st.mode === "tournante" ? "tournante" : "match_1v1"));
  const is2v2 = uiMode === "match_2v2";
  const is2v1 = uiMode === "match_2v1";
  const isTraining = uiMode === "training";
  const isTournante = uiMode === "tournante" || st.mode === "tournante";

  const headerTicker = React.useMemo(() => {
    if (isTraining) return getTickerFromCandidates(["pingpong_training", "pingpong_games", "pingpong"]);
    if (isTournante) return getTickerFromCandidates(["pingpong_tournante", "pingpong_games", "pingpong"]);
    if (is2v2) return getTickerFromCandidates(["pingpong_2v2", "pingpong_games", "pingpong"]);
    if (is2v1) return getTickerFromCandidates(["pingpong_2v1", "pingpong_games", "pingpong"]);
    return getTickerFromCandidates(["pingpong_1v1", "pingpong_games", "pingpong"]);
  }, [isTraining, isTournante, is2v2, is2v1]);

  // Service config (vient du Config via setConfig)
  const serveStart = ((st as any).serveStart ?? "A") as string; // "A" | "B" | "manual" | "toss_first_point"
  const serviceEvery = Number((st as any).serviceEvery ?? 2);
  const deuceServiceEvery = Number((st as any).deuceServiceEvery ?? 1);

  // État local (pour "manual" et "toss_first_point")
  const [manualStart, setManualStart] = React.useState<"A" | "B" | null>(null);
  const [firstPointSide, setFirstPointSide] = React.useState<"A" | "B" | null>(null);

  // Reset au changement de set
  React.useEffect(() => {
    setManualStart(null);
    setFirstPointSide(null);
  }, [st.setIndex]);

  const totalPts = (st.pointsA || 0) + (st.pointsB || 0);
  const inDeuce = (st.pointsA || 0) >= (st.pointsPerSet || 11) - 1 && (st.pointsB || 0) >= (st.pointsPerSet || 11) - 1;
  const interval = inDeuce ? Math.max(1, deuceServiceEvery) : Math.max(1, serviceEvery);

  // Détermine le côté qui sert "au tour"
  const startSide: "A" | "B" | null =
    serveStart === "A" ? "A" :
    serveStart === "B" ? "B" :
    serveStart === "manual" ? manualStart :
    serveStart === "toss_first_point" ? firstPointSide :
    "A";

  // Séquence de service (officiel) :
  // - 1v1 : A, B, A, B...
  // - 2v2 : A1, B1, A2, B2 (puis repeat)
  // - 2v1 : A1, B1, A2, B1 (repeat) — logique “équilibrée”
  const sideAPlayers = React.useMemo(() => splitNames(st.sideA), [st.sideA]);
  const sideBPlayers = React.useMemo(() => splitNames(st.sideB), [st.sideB]);

  type ServeSlot = { side: "A" | "B"; idx: 0 | 1 };

  const serveSequence: ServeSlot[] = React.useMemo(() => {
    if (is2v2) return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }, { side: "A", idx: 1 }, { side: "B", idx: 1 }];
    if (is2v1) return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }, { side: "A", idx: 1 }, { side: "B", idx: 0 }];
    return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }];
  }, [is2v2, is2v1]);

  // Calcule le slot courant
  const currentServe: ServeSlot | null = React.useMemo(() => {
    if (!startSide) return null;
    const seq = serveSequence;
    if (!seq.length) return null;

    // Décale la séquence si on commence par B
    let rotated = seq.slice();
    if (startSide === "B") {
      // cherche le premier slot côté B dans la séquence
      const firstB = rotated.findIndex(s => s.side === "B");
      if (firstB > 0) rotated = rotated.slice(firstB).concat(rotated.slice(0, firstB));
    }

    const turn = Math.floor(totalPts / interval) % rotated.length;
    return rotated[turn] ?? null;
  }, [startSide, serveSequence, totalPts, interval]);

  const handleAddPoint = React.useCallback((side: "A" | "B", delta: number) => {
    if (delta > 0 && serveStart === "toss_first_point" && !firstPointSide && totalPts === 0) {
      setFirstPointSide(side);
    }
    setSt(prev => addPoint(prev, side, delta));
  }, [serveStart, firstPointSide, totalPts]);

  const handleUndo = React.useCallback(() => {
    setSt(prev => undoPoint(prev));
    // best effort: si on revient à 0–0, on reset le toss
    if (serveStart === "toss_first_point" && totalPts <= 1) setFirstPointSide(null);
  }, [serveStart, totalPts]);

  return (
    <div style={wrap(theme)}>
      {/* HEADER (ticker plein écran comme PétanquePlay) * /}
      <div style={{ marginLeft: -14, marginRight: -14, marginTop: -14 }}>
        <div style={{ position: "relative" }}>
          {headerTicker ? (
            <img src={headerTicker} alt="Ping-Pong" style={tickerImg} draggable={false} />
          ) : (
            <div style={{ height: 70 }} />
          )}
          <button style={backOverlay(theme)} onClick={() => go("pingpong_menu")}>✕</button>
          <button style={ghostOverlay(theme)} onClick={() => setSt(loadPingPongState())}>↻</button>
        </div>
      </div>

      {/* SCORE CARD — mise en page calquée sur PétanquePlay * /}
      <div style={card(theme)}>
        <div style={topRow}>
          <div style={playerCol}>
            <div style={avatar(theme)}>{profileA ? <ProfileAvatar profile={profileA} size={46} /> : initials(st.sideA)}</div>
            <div style={playerName}>{st.sideA || ""}</div>
            <div style={miniLabel}>Sets</div>
            <div style={miniValue}>{st.setsA ?? 0}</div>
          </div>

          <div style={scoreMid}>
            <div style={scoreTag}>SCORE</div>
            <div style={scoreValue(theme)}>{(st.pointsA ?? 0)} – {(st.pointsB ?? 0)}</div>
            <div style={setPill}>
              <span style={{ opacity: 0.8 }}>SET</span>&nbsp;
              <b>{st.setIndex ?? 1}</b>
            </div>

            {/* Infos règles (comme la pastille Pétanque) * /}
            <div style={rulesPill}>
              {(st.setsToWin ?? 1)} sets gagnants • {(st.pointsPerSet ?? 11)} pts • {st.winByTwo ? "écart 2" : "no écart"}
            </div>
          </div>

          <div style={playerCol}>
            <div style={avatar(theme)}>{profileB ? <ProfileAvatar profile={profileB} size={46} /> : initials(st.sideB)}</div>
            <div style={playerName}>{st.sideB || ""}</div>
            <div style={miniLabel}>Sets</div>
            <div style={miniValue}>{st.setsB ?? 0}</div>
          </div>
        </div>

        {/* Actions principales (comme PétanquePlay : 2 gros boutons) * /}
        <div style={primaryActions}>
          <button style={primaryBtn(theme)} onClick={() => {
            // "DÉMARRER" = valide choix serveur si manual, sinon no-op
            if (serveStart === "manual" && !manualStart) return;
          }}>
            DÉMARRER
          </button>
          <button
            style={secondaryBtn(theme)}
            onClick={() => {
              // Toggle service mode (fun) : auto <-> manualStart
              if (serveStart === "manual") return;
              // simple indicateur : on force un overlay manuel au set suivant via manualStart
              setManualStart(null);
            }}
          >
            SERVICE
          </button>
        </div>
      </div>

      {/* STATS CARD — même placement que PétanquePlay * /}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Statistiques</div>
          <div style={cardHint}>Ping-Pong</div>
        </div>

        <div style={statsGrid}>
          <div style={statRow}><span>Sets</span><b>{(st.setsA ?? 0)} – {(st.setsB ?? 0)}</b></div>
          <div style={statRow}><span>Points</span><b>{(st.pointsA ?? 0)} – {(st.pointsB ?? 0)}</b></div>
          <div style={statRow}><span>Points joués</span><b>{totalPts}</b></div>
          <div style={statRow}><span>Écart</span><b>{Math.abs((st.pointsA ?? 0) - (st.pointsB ?? 0))}</b></div>
          <div style={statRow}><span>Deuce</span><b>{inDeuce ? "OUI" : "NON"}</b></div>
          <div style={statRow}><span>Serveur</span><b>{currentServe ? (currentServe.side === "A" ? (st.sideA || "A") : (st.sideB || "B")) : "—"}</b></div>
        </div>
      </div>

      {/* INPUT CARD — “Mène” de PétanquePlay => “Point” Ping-Pong * /}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Point</div>
          <div style={cardHint}>+1 / -1</div>
        </div>

        <div style={pointActions}>
          <button style={pointBtn(theme, currentServe?.side === "A")} onClick={() => !st.finished && handleAddPoint("A", +1)}>
            +1 A
          </button>
          <button style={pointBtn(theme, false)} onClick={() => !st.finished && handleAddPoint("A", -1)}>
            -1 A
          </button>
          <button style={pointBtn(theme, currentServe?.side === "B")} onClick={() => !st.finished && handleAddPoint("B", +1)}>
            +1 B
          </button>
          <button style={pointBtn(theme, false)} onClick={() => !st.finished && handleAddPoint("B", -1)}>
            -1 B
          </button>
        </div>
      </div>

      {/* ACTIONS CARD — comme PétanquePlay * /}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Actions</div>
          <div style={cardHint}>Match</div>
        </div>

        <div style={actionsRow}>
          <button style={btn(theme)} onClick={() => handleUndo()}>Annuler dernier point</button>
          <button style={btnDanger(theme)} onClick={() => setSt(loadPingPongState())}>Nouvelle partie</button>
        </div>
      </div>

      {/* Options avancées — placeholder visuel identique (on branche au fur et à mesure) * /}
      <div style={card(theme)}>
        <div style={advHeader}>
          <div style={cardTitle}>Options avancées</div>
          <div style={cardHint}>Officiel / Fun / Custom</div>
        </div>
        <div style={advBody}>
          <div style={advLine}><span>Service</span><b>{serveStart === "toss_first_point" ? "Lancer de balle" : serveStart === "manual" ? "Manuel" : serveStart === "A" ? "A commence" : "B commence"}</b></div>
          <div style={advLine}><span>Rotation</span><b>{serviceEvery} pts (deuce: {deuceServiceEvery})</b></div>
          <div style={advLine}><span>Mode</span><b>{uiMode}</b></div>
        </div>
      </div>

      {/* Modal départ (même logique, mais alignée visuellement) * /}
      {serveStart === "manual" && !manualStart && !st.finished && !isTournante && (
        <div style={sheetWrap}>
          <div style={sheetCard(theme)}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Ordre de départ</div>
            <div style={{ opacity: 0.9, marginBottom: 10 }}>Choisis qui sert en premier pour ce set.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={btn(theme)} onClick={() => setManualStart("A")}>{st.sideA || ""} sert</button>
              <button style={btn(theme)} onClick={() => setManualStart("B")}>{st.sideB || ""} sert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    padding: 14,
    paddingBottom: 110, // ✅ évite que le bas soit masqué par la BottomNav

    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, flex: 1, textAlign: "center" };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    opacity: 0.9,
  };
}

function kpi(theme: any): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 12,
    alignItems: "stretch",
  };
}

function sideBlock(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  };
}

const sideName: React.CSSProperties = {
  fontWeight: 950,
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
    textOverflow: "ellipsis",
};

const setsLine: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  opacity: 0.9,
};

const setsLabel: React.CSSProperties = { fontWeight: 900, fontSize: 12, letterSpacing: 0.3, opacity: 0.85 };
const setsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 20, letterSpacing: 0.5 };

const pointsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 42, letterSpacing: 1, textAlign: "center" };
const btnRow: React.CSSProperties = { display: "flex", gap: 10 };

function btn(theme: any): React.CSSProperties {
  const p = primaryColor(theme);
  return {
    flex: 1,
    borderRadius: 14,
    padding: "12px 0",
    border: `1px solid ${hexToRgba(p, 0.18)}`,
    background: `linear-gradient(180deg, ${hexToRgba(p, 0.08)}, rgba(255,255,255,0.04))`,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 10px 26px rgba(0,0,0,0.35)`,
  };
}


function btnDanger(theme: any): React.CSSProperties {
  return {
    ...btn(theme),
    border: `1px solid ${hexToRgba("#ff4050", 0.45)}`,
    background: `linear-gradient(180deg, ${hexToRgba("#ff4050", 0.16)}, rgba(255,255,255,0.03))`,
    boxShadow: `0 10px 26px rgba(0,0,0,0.35), 0 0 16px ${hexToRgba("#ff4050", 0.12)}`,
  };
}


function card(theme: any): React.CSSProperties {
  return {
    position: "relative",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(12,14,22,0.55)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
  };
}

function mid(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  };
}

const vs: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, opacity: 0.9 };

function meta(theme: any): React.CSSProperties {
  return {
    marginTop: 8,
    fontWeight: 900,
    opacity: 0.85,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    textAlign: "center",
    fontSize: 12,
  };
}

function done(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    fontWeight: 950,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}

function hint(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.75,
    fontWeight: 800,
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
  // ✅ fondu gauche + droite (fusion dans la carte)
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
};

function backOverlay(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: 12,
    top: "max(10px, env(safe-area-inset-top))",
    ...back(theme),
  };
}

function ghostOverlay(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    right: 12,
    top: "max(10px, env(safe-area-inset-top))",
    ...ghost(theme),
  };
}

function serveBadge(theme: any): React.CSSProperties {
  return {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.6,
    padding: "3px 7px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(110,180,255,0.14)",
    color: theme?.colors?.text ?? "#fff",
  };
}

const modalWrap: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0,0,0,0.55)",
  zIndex: 50,
};

function modalCard(theme: any): React.CSSProperties {
  return {
    width: "min(520px, 100%)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10,12,20,0.95)",
    padding: 14,
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    color: theme?.colors?.text ?? "#fff",
  };
}

function initials(name: string) {
  const s = String(name || "").trim();
  if (!s) return "PP";
  const parts = s.split(/\s+/g).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join("") || "PP";
}

const topRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 10,
  alignItems: "center",
};

const playerCol: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

function avatar(theme: any): React.CSSProperties {
  return {
    width: 54,
    height: 54,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    letterSpacing: 0.4,
  };
}

const playerName: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  opacity: 0.95,
  textAlign: "center",
  maxWidth: 140,
    textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const miniLabel: React.CSSProperties = { fontSize: 11, opacity: 0.7, marginTop: 2 };
const miniValue: React.CSSProperties = { fontSize: 22, fontWeight: 1100 as any, lineHeight: 1 };

const scoreMid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const scoreTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 1100 as any,
  letterSpacing: 1.2,
  opacity: 0.85,
};

function scoreValue(theme: any): React.CSSProperties {
  return {
    fontSize: 34,
    fontWeight: 1200 as any,
    lineHeight: 1,
    textShadow: "0 10px 28px rgba(0,0,0,0.35)",
    color: theme?.colors?.text ?? "#fff",
  };
}

const setPill: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
};

const rulesPill: React.CSSProperties = {
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  opacity: 0.92,
  textAlign: "center",
};

const primaryActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 4,
};

function primaryBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.07)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1100,
    letterSpacing: 0.4,
    cursor: "pointer",
  };
}

function secondaryBtn(theme: any): React.CSSProperties {
  return {
    ...primaryBtn(theme),
    background: "rgba(255,255,255,0.04)",
    opacity: 0.92,
  };
}

const cardTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
};

const cardTitle: React.CSSProperties = { fontWeight: 1100 as any, fontSize: 14 };
const cardHint: React.CSSProperties = { fontSize: 12, opacity: 0.7 };

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const statRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
};

const pointActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

function pointBtn(theme: any, isServe: boolean): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: `1px solid ${isServe ? "rgba(110,180,255,0.55)" : "rgba(255,255,255,0.16)"}`,
    background: isServe ? "rgba(110,180,255,0.12)" : "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

const actionsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const advHeader: React.CSSProperties = { display: "flex", alignItems: "baseline", justifyContent: "space-between" };
const advBody: React.CSSProperties = { display: "grid", gap: 8, marginTop: 6 };
const advLine: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
};

const sheetWrap: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: 12,
  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  background: "rgba(0,0,0,0.45)",
  zIndex: 60,
};

function sheetCard(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(15,18,28,0.92)",
    padding: 12,
    color: theme?.colors?.text ?? "#fff",
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
  };
}


========================================================================================
*/
