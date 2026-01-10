// ============================================
// src/pages/petanque/PetanquePlay.tsx
// ✅ Version MOBILE-SAFE (sheet scroll + LIVE stable) + ✅ FFA3 LOCAL (0..3 points)
// - Sheet scroll iOS/Android fiable (WebkitOverflowScrolling + 100dvh + overscrollBehavior)
// - Header sticky (Fermer toujours accessible) + tap dehors pour fermer
// - Caméra JAMAIS auto-start (mobile permission safe)
// - LIVE fluide en "TAP" par défaut sur mobile
// - AUTO possible, mais OpenCV ne tourne QUE si "Détection ON" (detectOn)
// - Bouton Pause / Reprendre (coupe l'analyse sans stopper la caméra)
// ✅ NEW (UI): Score + logos équipes + composition + rôles + stats joueurs (+/−) persistées localStorage
// ✅ NEW (FFA3 local): 3 joueurs, premier à 13, max 3 points par mène (0..3)
// ✅ NEW (UI PATCH): Header "ARCADE" fixe + gros médaillons TEAMS + KPI Score Neon + noms sous avatars
// ✅ FIX (UI): ne jamais afficher les UUID bruts en noms (fallback "Joueur X")
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

import {
  addEnd,
  loadPetanqueState,
  resetPetanque,
  undoLastEnd,
  type PetanqueState,
  type PetanqueTeamId,
  addMeasurement,
  undoLastMeasurement,
} from "../../lib/petanqueStore";

import { loadPetanqueConfig } from "../../lib/petanqueConfigStore";
import { loadOpenCv } from "../../lib/vision/opencv";

import type { Profile } from "../../lib/types";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

const PTS_END = [1, 2, 3, 4, 5, 6];
const PTS = [0, 1, 2, 3, 4, 5, 6];
type PhotoPoint = { x: number; y: number }; // normalized 0..1
type MeasureMode = "manual" | "photo" | "live";

type RoleCode = "P1" | "P2" | "T" | "Po";

function roleCodeFromLabel(role?: string | null): RoleCode {
  const r = (role || "").toLowerCase();
  if (r.includes("pointeur 1") || r === "p1") return "P1";
  if (r.includes("pointeur 2") || r === "p2") return "P2";
  if (r.includes("tireur") || r === "t") return "T";
  return "Po";
}

function roleColor(theme: any, code: RoleCode) {
  // tu peux aligner ces couleurs sur ton thème si tu veux
  switch (code) {
    case "P1":
      return cssVarOr("#58d7ff", "--roleP1");
    case "P2":
      return cssVarOr("#7dff8a", "--roleP2");
    case "T":
      return cssVarOr("#ff5fd7", "--roleT");
    case "Po":
    default:
      return cssVarOr("#ffd35a", "--rolePo");
  }
}

function rolePillStyle(theme: any, code: RoleCode): React.CSSProperties {
  const c = roleColor(theme, code);
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 1000 as any,
    letterSpacing: 0.3,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: "rgba(0,0,0,0.25)",
    color: c,
    boxShadow: `0 0 14px ${c}33`,
    whiteSpace: "nowrap",
  };
}

// =====================
// Helpers (colors/avatars)
// =====================
function pickTeamColor(theme: any, side: "A" | "B") {
  const primary = theme?.primary || "#FFD24A";
  const alt =
    theme?.secondary ||
    theme?.pink ||
    theme?.magenta ||
    theme?.green ||
    theme?.gold ||
    primary;
  return side === "A" ? primary : alt;
}

function getAvatarSrc(p: any): string | null {
  return (
    p?.avatarDataUrl ||
    p?.avatarUrl ||
    p?.avatar ||
    p?.photoDataUrl ||
    p?.photoUrl ||
    null
  );
}

// =====================
// ✅ UUID masking helpers
// =====================
function isLikelyUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    (s ?? "").trim()
  );
}

function prettyPlayerName(raw: string, fallback: string) {
  const s = (raw ?? "").trim();
  if (!s) return fallback;
  if (isLikelyUuid(s)) return fallback; // ✅ masque l’UUID
  return s;
}

function MedallionAvatar({
  src,
  size = 66,
  border,
  glow,
  fallback,
}: {
  src: string | null;
  size?: number;
  border: string;
  glow: string;
  fallback?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.22)",
        border: `1px solid ${border}`,
        boxShadow: `0 0 16px ${glow}`,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <span style={{ opacity: 0.75, fontWeight: 950, fontSize: 22 }}>
          {fallback || "?"}
        </span>
      )}
    </div>
  );
}

// ==========================
// ✅ TEAMS + Roles + Stats
// ==========================
type PlayerRole = "Tireur" | "Pointeur 1" | "Pointeur 2" | "Polyvalent";

type PlayerLine = {
  id: string; // profileId (ou fallback)
  name: string;
  role?: PlayerRole;
  profile?: Profile;
};

type TeamLine = {
  id?: string;
  name: string;
  logoDataUrl?: string | null;
  players: PlayerLine[];
};

type PlayerStats = {
  points: number;
  carreau: number;
  tirReussi: number;
  trou: number;
  bec: number;
  butAnnulation: number;
  butPoint: number;
};

const EMPTY_STATS: PlayerStats = {
  points: 0,
  carreau: 0,
  tirReussi: 0,
  trou: 0,
  bec: 0,
  butAnnulation: 0,
  butPoint: 0,
};

function clamp0(n: number) {
  return Math.max(0, n | 0);
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extraction tolérante Teams + roster depuis matchCfg (priorité) puis st.
 * Fallback sur st.teamA/st.teamB.
 */
function extractTeams(st: any, matchCfg: any): { A: TeamLine; B: TeamLine } {
  const asStr = (v: any) => (v == null ? "" : String(v)).trim();

  const normalizeLogo = (raw: any): string | null => {
    if (!raw) return null;
    const v =
      raw?.logoDataUrl ??
      raw?.teamLogoDataUrl ??
      raw?.logoUrl ??
      raw?.teamLogoUrl ??
      raw?.logo ??
      raw?.teamLogo ??
      raw?.image ??
      raw?.img ??
      raw?.medal ??
      raw?.badge ??
      raw;
    const s = asStr(v);
    return s ? s : null;
  };

  // ✅ IMPORTANT: dans TON PetanqueConfig, les profils "résolvables" arrivent via cfg.players
  // On indexe donc profiles + players (et versions nested cfg.*)
  const profilesArr = (
    matchCfg?.profiles ??
    matchCfg?.cfg?.profiles ??
    matchCfg?.players ??
    matchCfg?.cfg?.players ??
    []
  ) as any[];

  const profilesIndex: Record<string, any> = {};
  if (Array.isArray(profilesArr)) {
    profilesArr.forEach((p) => {
      const id = asStr(p?.id);
      if (id) profilesIndex[id] = p;
    });
  }

  const normalizePlayers = (
    rawPlayers: any,
    profilesIndex?: Record<string, any>
  ): PlayerLine[] => {
    const arr = Array.isArray(rawPlayers) ? rawPlayers : [];
    return arr
      .map((p: any, idx: number) => {
        const fallback = `Joueur ${idx + 1}`;

        // 1) p est un string (souvent profileId)
        if (typeof p === "string") {
          const maybeProfile = profilesIndex?.[p];
          const rawName =
            asStr(maybeProfile?.displayName ?? maybeProfile?.name) || asStr(p);
          const name = prettyPlayerName(rawName, fallback);

          return {
            id: asStr(maybeProfile?.id) || asStr(p) || `p-${idx}`,
            name,
            role: (maybeProfile?.role as PlayerRole) ?? undefined,
            profile: maybeProfile as Profile,
          };
        }

        // 2) p est un objet (player ou profile-like)
        const id = asStr(
          p?.id ?? p?.profileId ?? p?.pid ?? p?.profile?.id ?? `p-${idx}`
        );

        const prof = (p?.profile ?? profilesIndex?.[id]) as any;

        const rawName =
          asStr(p?.name ?? p?.displayName ?? p?.label) ||
          asStr(prof?.displayName ?? prof?.name) ||
          asStr(id);

        const name = prettyPlayerName(rawName, fallback);

        const role =
          (p?.role as PlayerRole) ?? (prof?.role as PlayerRole) ?? undefined;

        const profile: Profile | undefined =
          (prof as Profile) ??
          ((p?.avatarUrl || p?.avatarDataUrl || p?.displayName || p?.name)
            ? (p as Profile)
            : undefined);

        return { id, name, role, profile };
      })
      .filter(Boolean);
  };

  // ✅ Récup multi-formats (objet A/B, tableau, cfg nested, champs à plat)
  const teamA_1 = matchCfg?.teams?.A ?? matchCfg?.cfg?.teams?.A;
  const teamB_1 = matchCfg?.teams?.B ?? matchCfg?.cfg?.teams?.B;

  const teamA_2 = matchCfg?.teamA ?? matchCfg?.cfg?.teamA;
  const teamB_2 = matchCfg?.teamB ?? matchCfg?.cfg?.teamB;

  const teamsArr = matchCfg?.teams ?? matchCfg?.cfg?.teams;
  const teamA_3 = Array.isArray(teamsArr)
    ? teamsArr.find((t) => asStr(t?.id ?? t?.key).toUpperCase() === "A")
    : null;
  const teamB_3 = Array.isArray(teamsArr)
    ? teamsArr.find((t) => asStr(t?.id ?? t?.key).toUpperCase() === "B")
    : null;

  const flatAName =
    matchCfg?.teamAName ??
    matchCfg?.cfg?.teamAName ??
    matchCfg?.nameA ??
    matchCfg?.A;
  const flatBName =
    matchCfg?.teamBName ??
    matchCfg?.cfg?.teamBName ??
    matchCfg?.nameB ??
    matchCfg?.B;

  const flatALogo =
    matchCfg?.teamALogo ?? matchCfg?.cfg?.teamALogo ?? matchCfg?.logoA;
  const flatBLogo =
    matchCfg?.teamBLogo ?? matchCfg?.cfg?.teamBLogo ?? matchCfg?.logoB;

  const flatAPlayers =
    matchCfg?.teamAPlayers ??
    matchCfg?.playersA ??
    matchCfg?.teamAPlayerIds ??
    matchCfg?.teamAProfiles ??
    matchCfg?.cfg?.teamAPlayers ??
    matchCfg?.cfg?.playersA ??
    matchCfg?.cfg?.teamAPlayerIds ??
    matchCfg?.cfg?.teamAProfiles;

  const flatBPlayers =
    matchCfg?.teamBPlayers ??
    matchCfg?.playersB ??
    matchCfg?.teamBPlayerIds ??
    matchCfg?.teamBProfiles ??
    matchCfg?.cfg?.teamBPlayers ??
    matchCfg?.cfg?.playersB ??
    matchCfg?.cfg?.teamBPlayerIds ??
    matchCfg?.cfg?.teamBProfiles;

  const rawA =
    teamA_1 ??
    teamA_2 ??
    teamA_3 ??
    (flatAName || flatALogo || flatAPlayers
      ? { name: flatAName, logo: flatALogo, players: flatAPlayers }
      : null) ??
    st?.teams?.A ??
    (st?.teamA ? { name: st.teamA } : null) ??
    null;

  const rawB =
    teamB_1 ??
    teamB_2 ??
    teamB_3 ??
    (flatBName || flatBLogo || flatBPlayers
      ? { name: flatBName, logo: flatBLogo, players: flatBPlayers }
      : null) ??
    st?.teams?.B ??
    (st?.teamB ? { name: st.teamB } : null) ??
    null;

  const pickPlayers = (rawTeam: any) => {
    // ✅ essaie toutes les clés usuelles qu’on rencontre en config
    return (
      rawTeam?.players ??
      rawTeam?.members ??
      rawTeam?.roster ??
      rawTeam?.profiles ??
      rawTeam?.playerIds ??
      rawTeam?.profileIds ??
      rawTeam?.composition ??
      rawTeam?.lineup ??
      rawTeam?.slots ??
      rawTeam?.selected ??
      rawTeam?.picks ??
      rawTeam?.p ??
      []
    );
  };

  const A: TeamLine = {
    id: asStr(rawA?.id) || undefined,
    name: asStr(rawA?.name ?? rawA?.label ?? st?.teamA) || "Équipe A",
    logoDataUrl: normalizeLogo(rawA),
    players: normalizePlayers(pickPlayers(rawA), profilesIndex),
  };

  const B: TeamLine = {
    id: asStr(rawB?.id) || undefined,
    name: asStr(rawB?.name ?? rawB?.label ?? st?.teamB) || "Équipe B",
    logoDataUrl: normalizeLogo(rawB),
    players: normalizePlayers(pickPlayers(rawB), profilesIndex),
  };

  // ✅ Dernier filet de sécurité : matchCfg.players[] avec team=A/B
  if ((!A.players.length || !B.players.length) && Array.isArray(matchCfg?.players)) {
    const global = matchCfg.players;
    const a2 = global.filter(
      (p: any) => asStr(p?.team ?? p?.teamId ?? p?.side).toUpperCase() === "A"
    );
    const b2 = global.filter(
      (p: any) => asStr(p?.team ?? p?.teamId ?? p?.side).toUpperCase() === "B"
    );
    if (!A.players.length && a2.length) A.players = normalizePlayers(a2, profilesIndex);
    if (!B.players.length && b2.length) B.players = normalizePlayers(b2, profilesIndex);
  }

  return { A, B };
}

function statLabel(k: keyof PlayerStats) {
  switch (k) {
    case "points":
      return "Points";
    case "carreau":
      return "Carreau";
    case "tirReussi":
      return "Tir OK";
    case "trou":
      return "Trou";
    case "bec":
      return "Bec";
    case "butAnnulation":
      return "But KO";
    case "butPoint":
      return "But +";
    default:
      return k;
  }
}

// =====================
// ✅ HEADER "ARCADE" FIXED
// =====================
function PetanqueHeaderArcade(props: {
  theme: any;
  go: (tab: any, params?: any) => void;
  allowMeasurements: boolean;
  onMeasure: () => void;
  isFfa3: boolean;

  teams?: { A: TeamLine; B: TeamLine };
  scoreA?: number;
  scoreB?: number;

  ffaPlayers?: string[];
  ffaScores?: number[];
  ffaWinnerIdx?: number | null;

  onAddEndA?: () => void;
  onAddEndB?: () => void;
}) {
  const {
    theme,
    go,
    allowMeasurements,
    onMeasure,
    isFfa3,
    teams,
    scoreA,
    scoreB,
    ffaPlayers,
    ffaScores,
    ffaWinnerIdx,
    onAddEndA,
    onAddEndB,
  } = props;

  const colorA = pickTeamColor(theme, "A");
  const colorB = pickTeamColor(theme, "B");

  // ✅ LOGO D'ÉQUIPE > AVATAR JOUEUR > FALLBACK
  const teamAImg =
    teams?.A?.logoDataUrl ||
    (teams?.A?.players?.[0]?.profile
      ? getAvatarSrc(teams.A.players[0].profile)
      : null) ||
    null;

  const teamBImg =
    teams?.B?.logoDataUrl ||
    (teams?.B?.players?.[0]?.profile
      ? getAvatarSrc(teams.B.players[0].profile)
      : null) ||
    null;

    return (
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          zIndex: 50,
          padding: 10,
          paddingBottom: 10,
          background: "linear-gradient(180deg, rgba(0,0,0,.70), rgba(0,0,0,.12))",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          {/* Nav row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <button className="btn ghost" style={ghost(theme)} onClick={() => go("games")}>
              ← Jeux
            </button>
    
            <div style={{ display: "flex", justifyContent: "center", flex: 1 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  color: theme.primary,
                  textShadow: `0 0 14px ${theme.primary}55`,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}33`,
                  background: "linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.36))",
                  boxShadow: `0 0 18px ${theme.primary}22`,
                }}
              >
                PÉTANQUE
              </div>
            </div>
    
            <button className="btn ghost" style={ghost(theme)} onClick={() => go("home")}>
              Home
            </button>
          </div>
    
          {/* KPI card */}
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
              background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
              overflow: "hidden",
              padding: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              {allowMeasurements ? (
                <button className="btn primary" style={chipBtn(theme)} onClick={onMeasure}>
                  Mesurer
                </button>
              ) : (
                <div />
              )}
            </div>
    
            {isFfa3 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                {(ffaPlayers || []).slice(0, 3).map((raw, i) => {
                  const name = prettyPlayerName(String(raw ?? ""), `Joueur ${i + 1}`);
                  return (
                    <div key={i} style={{ textAlign: "center", minWidth: 0 }}>
                      <div className="badge" style={pill(theme)} title={name}>
                        {name}
                      </div>
                      <div style={{ fontWeight: 1100 as any, fontSize: 28, marginTop: 6 }}>
                        {(ffaScores || [0, 0, 0])[i] ?? 0}
                      </div>
                      {ffaWinnerIdx === i && (
                        <div className="badge" style={win(theme)}>
                          Vainqueur
                        </div>
                      )}
                    </div>
                  );
                })}
                <div
                  className="subtitle"
                  style={{
                    ...muted(theme),
                    gridColumn: "1 / -1",
                    textAlign: "center",
                  }}
                >
                  3 joueurs — premier à 13 — max 3 points par mène
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                {/* TEAM A */}
                <div style={{ display: "grid", justifyItems: "start", gap: 6, minWidth: 0 }}>
                  <MedallionAvatar
                    src={teamAImg}
                    size={72}
                    border={`${colorA}88`}
                    glow={`${colorA}35`}
                    fallback="A"
                  />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: colorA,
                      textShadow: `0 0 12px ${colorA}55`,
                      maxWidth: 160,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={teams?.A?.name || "TEAM A"}
                  >
                    {teams?.A?.name || "TEAM A"}
                  </div>
                </div>
    
                {/* ✅ SCORE KPI + (+ sous chaque équipe) */}
                <div
                  style={{
                    borderRadius: 16,
                    padding: "10px 14px",
                    border: `1px solid ${theme.primary}55`,
                    background: "linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.38))",
                    boxShadow: `0 0 22px ${theme.primary}22`,
                    display: "grid",
                    placeItems: "center",
                    minWidth: 170,
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        opacity: 0.85,
                        marginBottom: 2,
                      }}
                    >
                      Score
                    </div>
    
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 1000,
                          color: colorA,
                          textShadow: `0 0 14px ${colorA}66`,
                          lineHeight: 1,
                          minWidth: 36,
                          textAlign: "right",
                        }}
                      >
                        {scoreA ?? 0}
                      </div>
                      <div style={{ opacity: 0.65, fontWeight: 900 }}>—</div>
                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 1000,
                          color: colorB,
                          textShadow: `0 0 14px ${colorB}66`,
                          lineHeight: 1,
                          minWidth: 36,
                          textAlign: "left",
                        }}
                      >
                        {scoreB ?? 0}
                      </div>
                    </div>
                  </div>
    
                  {/* ✅ + sous chaque score */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      width: "100%",
                    }}
                  >
                    <button
                      className="btn"
                      style={{
                        borderRadius: 999,
                        padding: "8px 10px",
                        border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
                        background: "rgba(255,255,255,0.06)",
                        color: colorA,
                        fontWeight: 1100 as any,
                        cursor: "pointer",
                      }}
                      onClick={onAddEndA}
                      disabled={!onAddEndA}
                      title="Ajouter une mène pour l'équipe A"
                    >
                      +
                    </button>
    
                    <button
                      className="btn"
                      style={{
                        borderRadius: 999,
                        padding: "8px 10px",
                        border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
                        background: "rgba(255,255,255,0.06)",
                        color: colorB,
                        fontWeight: 1100 as any,
                        cursor: "pointer",
                      }}
                      onClick={onAddEndB}
                      disabled={!onAddEndB}
                      title="Ajouter une mène pour l'équipe B"
                    >
                      +
                    </button>
                  </div>
                </div>
    
                {/* TEAM B */}
                <div style={{ display: "grid", justifyItems: "end", gap: 6, minWidth: 0 }}>
                  <MedallionAvatar
                    src={teamBImg}
                    size={72}
                    border={`${colorB}88`}
                    glow={`${colorB}35`}
                    fallback="B"
                  />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: colorB,
                      textShadow: `0 0 12px ${colorB}55`,
                      maxWidth: 160,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "right",
                    }}
                    title={teams?.B?.name || "TEAM B"}
                  >
                    {teams?.B?.name || "TEAM B"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
}

export default function PetanquePlay({ go, params }: Props) {
  // ✅ Route params
  const matchMode = (params?.mode ?? params?.cfg?.mode ?? "singles") as any;
  const isFfa3 = matchMode === "ffa3";
  const matchCfg = params?.cfg ?? null;

  const { theme } = useTheme();
  const [st, setSt] = React.useState<PetanqueState>(() => loadPetanqueState());

  // =====================================================
  // ✅ FFA3 LOCAL (ne dépend pas du store Petanque)
  // =====================================================
  const ffaPlayers = (Array.isArray(params?.cfg?.players) && params.cfg.players.length === 3
    ? params.cfg.players
    : ["Joueur 1", "Joueur 2", "Joueur 3"]) as string[];

  type FfaEnd = { id: string; at: number; p: number; points: number };

  const [ffaScores, setFfaScores] = React.useState<number[]>([0, 0, 0]);
  const [ffaEnds, setFfaEnds] = React.useState<FfaEnd[]>([]);

  const ffaWinnerIdx = React.useMemo(() => {
    const idx = ffaScores.findIndex((s) => s >= 13);
    return idx >= 0 ? idx : null;
  }, [ffaScores]);

  const addFfaEnd = (playerIdx: number, points: number) => {
    if (ffaWinnerIdx != null) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setFfaScores((cur) => cur.map((s, i) => (i === playerIdx ? s + points : s)));
    setFfaEnds((cur) => [{ id, at: Date.now(), p: playerIdx, points }, ...cur]);
  };

  const undoFfaEnd = () => {
    setFfaEnds((cur) => {
      const [last, ...rest] = cur;
      if (!last) return cur;
      setFfaScores((scores) =>
        scores.map((s, i) => (i === last.p ? Math.max(0, s - last.points) : s))
      );
      return rest;
    });
  };

  const resetFfa = () => {
    setFfaScores([0, 0, 0]);
    setFfaEnds([]);
  };

  const PTS_FFA3 = [0, 1, 2, 3];

  // ==========================================
  // ✅ TEAMS + player stats (localStorage)
  // ==========================================
  const teams = React.useMemo(() => extractTeams(st as any, matchCfg), [st, matchCfg]);

  const matchKey = React.useMemo(() => {
    const id =
      (st as any)?.matchId ??
      (st as any)?.startedAt ??
      (st as any)?.createdAt ??
      (matchCfg as any)?.id ??
      "current";
    return `bsc-petanque-playerstats-v1:${String(id)}`;
  }, [st, matchCfg]);

  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerStats>>(() =>
    safeJsonParse<Record<string, PlayerStats>>(
      typeof window !== "undefined" ? localStorage.getItem(matchKey) : null,
      {}
    )
  );

  React.useEffect(() => {
    try {
      localStorage.setItem(matchKey, JSON.stringify(playerStats));
    } catch {
      // ignore
    }
  }, [matchKey, playerStats]);

  const bumpStat = React.useCallback(
    (playerId: string, key: keyof PlayerStats, delta: number) => {
      setPlayerStats((prev) => {
        const cur = prev[playerId] ?? EMPTY_STATS;
        const nextVal = clamp0((cur[key] ?? 0) + delta);
        return { ...prev, [playerId]: { ...cur, [key]: nextVal } };
      });
    },
    []
  );

  // ==========================================
  // ✅ UI COMPACTE : sheet joueur + attribution points après mène
  // ==========================================
  type PendingAssign = { team: PetanqueTeamId; pts: number } | null;

  const [quickAssignPoints, setQuickAssignPoints] = React.useState<boolean>(true);
  const [pendingAssign, setPendingAssign] = React.useState<PendingAssign>(null);

  const [pstatSheetOpen, setPstatSheetOpen] = React.useState(false);
  const [pstatPlayer, setPstatPlayer] = React.useState<PlayerLine | null>(null);

  const openPlayerSheet = (p: PlayerLine) => {
    setPstatPlayer(p);
    setPstatSheetOpen(true);
  };

  const closePlayerSheet = () => {
    setPstatSheetOpen(false);
    setPstatPlayer(null);
  };

  // =====================================================
// ✅ SHEET "MÈNE" (sous le score) : choix points + note
// =====================================================
const [endSheetOpen, setEndSheetOpen] = React.useState(false);
const [endTeam, setEndTeam] = React.useState<PetanqueTeamId>("A");
const [endPts, setEndPts] = React.useState<number>(1);
const [endNote, setEndNote] = React.useState<string>("");

const openEndSheet = React.useCallback((team: PetanqueTeamId) => {
  setEndTeam(team);
  setEndPts(1);
  setEndNote("");
  setEndSheetOpen(true);
}, []);

const closeEndSheet = React.useCallback(() => {
  setEndSheetOpen(false);
  setEndNote("");
}, []);

const maybeOpenAssignPoints = React.useCallback(
    (team: PetanqueTeamId, pts: number) => {
      if (!quickAssignPoints) return;
      if (!pts || pts <= 0) return;
      const roster = team === "A" ? teams.A.players : teams.B.players;
      if (!roster?.length) return;
      setPendingAssign({ team, pts });
    },
    [quickAssignPoints, teams]
  );

  
const commitEndFromSheet = React.useCallback(() => {
  // ✅ TDZ-safe: pas de dépendance à onAdd (qui est un const plus bas)
  setSt((prev) => addEnd(prev, endTeam, endPts));
  if (!isFfa3) maybeOpenAssignPoints(endTeam, endPts);
  // note optionnelle: non persistée tant que petanqueStore ne la supporte pas
  closeEndSheet();
}, [endTeam, endPts, isFfa3, maybeOpenAssignPoints, closeEndSheet]);

// ==========================
  // ✅ MESURAGE (sheet)
  // ==========================
  const [measureOpen, setMeasureOpen] = React.useState(false);
  const [mode, setMode] = React.useState<MeasureMode>("manual");

  // ✅ Mesurage autorisé : priorité params.cfg, sinon localStorage
  const cfgFromParams = params?.cfg ?? null;
  const cfgFromStorage = (typeof loadPetanqueConfig === "function"
    ? loadPetanqueConfig()
    : null) as any;
  const effectiveCfg = (cfgFromParams ?? cfgFromStorage) as any;
  const allowMeasurements: boolean = (effectiveCfg?.options?.allowMeasurements ?? true) === true;

  React.useEffect(() => {
    if (!allowMeasurements && measureOpen) setMeasureOpen(false);
  }, [allowMeasurements, measureOpen]);

  const onAdd = (team: PetanqueTeamId, pts: number) => {
    setSt((prev) => addEnd(prev, team, pts));
    if (!isFfa3) maybeOpenAssignPoints(team, pts);
  };
  const onUndo = () => setSt((prev) => undoLastEnd(prev));
  const onNew  = () => setSt((prev) => resetPetanque(prev));
// --- Manuel
  const [dA, setDA] = React.useState<string>("");
  const [dB, setDB] = React.useState<string>("");
  const [tol, setTol] = React.useState<string>("1");
  const [note, setNote] = React.useState<string>("");

  const numOrNaN = (v: string) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const dAN = numOrNaN(dA);
  const dBN = numOrNaN(dB);
  const tolN = Math.max(0, numOrNaN(tol));

  const canComputeManual =
    Number.isFinite(dAN) && Number.isFinite(dBN) && dAN >= 0 && dBN >= 0 && Number.isFinite(tolN);

  const deltaManual = canComputeManual ? Math.abs(dAN - dBN) : NaN;

  const manualWinner: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (!canComputeManual) return null;
    if (deltaManual <= tolN) return "TIE";
    return dAN < dBN ? "A" : "B";
  }, [canComputeManual, deltaManual, tolN, dAN, dBN]);

  const manualText = React.useMemo(() => {
    if (!canComputeManual) return "Renseigne les 2 distances (cm).";
    if (manualWinner === "TIE") return `Égalité (≤ ${tolN} cm) — à re-mesurer`;
    if (manualWinner === "A") return `${teams.A.name} est devant (+${deltaManual.toFixed(1)} cm)`;
    if (manualWinner === "B") return `${teams.B.name} est devant (+${deltaManual.toFixed(1)} cm)`;
    return "";
  }, [canComputeManual, manualWinner, tolN, deltaManual, teams.A.name, teams.B.name]);

  const onSaveManual = () => {
    if (!canComputeManual) return;
    setSt(
      addMeasurement(st, {
        dA: dAN,
        dB: dBN,
        tol: tolN,
        note,
      })
    );
    setDA("");
    setDB("");
    setNote("");
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ PHOTO (multi-boules)
  // ==========================
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);
  const [imgNatural, setImgNatural] = React.useState<{ w: number; h: number } | null>(null);

  const [pCochonnet, setPCochonnet] = React.useState<PhotoPoint | null>(null);
  const [ballsA, setBallsA] = React.useState<PhotoPoint[]>([]);
  const [ballsB, setBallsB] = React.useState<PhotoPoint[]>([]);

  const [calA, setCalA] = React.useState<PhotoPoint | null>(null);
  const [calB, setCalB] = React.useState<PhotoPoint | null>(null);
  const [calLenCm, setCalLenCm] = React.useState<string>("");
  const [calArm, setCalArm] = React.useState<"A" | "B" | null>(null);

  const [addSide, setAddSide] = React.useState<PetanqueTeamId>("A");
  const [loupeOn, setLoupeOn] = React.useState(true);
  const [hoverPt, setHoverPt] = React.useState<PhotoPoint | null>(null);

  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const clearPhoto = () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setImgNatural(null);
    setPCochonnet(null);
    setBallsA([]);
    setBallsB([]);
    setCalA(null);
    setCalB(null);
    setCalLenCm("");
    setCalArm(null);
    setHoverPt(null);
  };

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    clearPhoto();
    const url = URL.createObjectURL(f);
    setImgUrl(url);
  };

  const getPointFromEvent = (evt: React.MouseEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width;
    const y = (evt.clientY - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const distPx = (a: PhotoPoint, b: PhotoPoint, nat: { w: number; h: number }) => {
    const ax = a.x * nat.w,
      ay = a.y * nat.h;
    const bx = b.x * nat.w,
      by = b.y * nat.h;
    const dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calLenN = numOrNaN(calLenCm);
  const hasCalibration = !!(imgNatural && calA && calB && Number.isFinite(calLenN) && calLenN > 0);

  const pxPerCm = React.useMemo(() => {
    if (!hasCalibration || !imgNatural || !calA || !calB) return null;
    const d = distPx(calA, calB, imgNatural);
    if (d <= 0) return null;
    return d / calLenN; // px/cm
  }, [hasCalibration, imgNatural, calA, calB, calLenN]);

  const distValuePhoto = (p: PhotoPoint) => {
    if (!imgNatural || !pCochonnet) return null;
    const dpx = distPx(pCochonnet, p, imgNatural);
    return pxPerCm ? dpx / pxPerCm : dpx; // cm si calibré, sinon px
  };

  const minA_photo = React.useMemo(() => {
    if (!pCochonnet || !ballsA.length) return null;
    const vals = ballsA
      .map((b) => distValuePhoto(b))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [pCochonnet, ballsA, imgNatural, pxPerCm]);

  const minB_photo = React.useMemo(() => {
    if (!pCochonnet || !ballsB.length) return null;
    const vals = ballsB
      .map((b) => distValuePhoto(b))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [pCochonnet, ballsB, imgNatural, pxPerCm]);

  const winnerPhoto: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (minA_photo == null || minB_photo == null) return null;
    const d = Math.abs(minA_photo - minB_photo);
    if (d <= Math.max(0, tolN)) return "TIE";
    return minA_photo < minB_photo ? "A" : "B";
  }, [minA_photo, minB_photo, tolN]);

  const onPhotoClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    if (calArm) {
      if (calArm === "A") setCalA(pt);
      else setCalB(pt);
      setCalArm(null);
      return;
    }
    if (!pCochonnet) return setPCochonnet(pt);
    if (addSide === "A") setBallsA((cur) => [...cur, pt]);
    else setBallsB((cur) => [...cur, pt]);
  };

  const onPhotoMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!loupeOn) return;
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    setHoverPt(pt);
  };

  const onClearPhotoPoints = () => {
    setPCochonnet(null);
    setBallsA([]);
    setBallsB([]);
    setHoverPt(null);
  };

  const onSavePhoto = () => {
    if (minA_photo == null || minB_photo == null) return;
    const isCm = !!pxPerCm;
    const extra =
      (note?.trim() ? `${note.trim()} — ` : "") +
      `photo ${isCm ? "calibrée" : "non calibrée"} — A:${ballsA.length} / B:${ballsB.length} — unité:${
        isCm ? "cm" : "px"
      }`;

    setSt(
      addMeasurement(st, {
        dA: Number(minA_photo),
        dB: Number(minB_photo),
        tol: Math.max(0, Number(tolN) || 0),
        note: extra,
      })
    );
    onClearPhotoPoints();
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ LIVE (caméra + radar + AUTO-DETECT OpenCV)
  // ==========================
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const radarRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToEl = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Mobile heuristic
  const isNarrow = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 520px)")?.matches ?? window.innerWidth <= 520;
  }, []);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const liveWrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // ✅ refs anti-sauts (utilisés dans loop OpenCV)
  const lastNearestRef = React.useRef<{ x: number; y: number; r: number } | null>(null);
  const stableNearestRef = React.useRef<{ x: number; y: number; r: number } | null>(null);

  const liveC: PhotoPoint = { x: 0.5, y: 0.5 };

  const [liveOn, setLiveOn] = React.useState(false);
  const [liveErr, setLiveErr] = React.useState<string | null>(null);

  // Sur mobile: TAP par défaut, desktop: AUTO par défaut
  const [autoOn, setAutoOn] = React.useState<boolean>(() => {
    try {
      const mobile = window.matchMedia?.("(max-width: 520px)")?.matches ?? window.innerWidth <= 520;
      return !mobile;
    } catch {
      return true;
    }
  });

  // OpenCV ne tourne QUE si detectOn
  const [detectOn, setDetectOn] = React.useState<boolean>(false);

  const [circles, setCircles] = React.useState<Array<{ x: number; y: number; r: number }>>([]);
  const [nearestIdx, setNearestIdx] = React.useState<number | null>(null);

  // assignation équipes sur cercles détectés (AUTO mode)
  const [assignSide, setAssignSide] = React.useState<PetanqueTeamId>("A");
  const [circleTeam, setCircleTeam] = React.useState<Record<number, PetanqueTeamId>>({});

  // Manual fallback (tap)
  const [liveA, setLiveA] = React.useState<PhotoPoint[]>([]);
  const [liveB, setLiveB] = React.useState<PhotoPoint[]>([]);
  const [liveAddSide, setLiveAddSide] = React.useState<PetanqueTeamId>("A");

  // Réglages LIVE
  const [roiPct, setRoiPct] = React.useState<number>(0.7);
  const [minRadius, setMinRadius] = React.useState<number>(10);
  const [maxRadius, setMaxRadius] = React.useState<number>(60);
  const [param2, setParam2] = React.useState<number>(26);

  const [livePaused, setLivePaused] = React.useState(false);

  // accordéons (mobile)
  const [liveSectionOpen, setLiveSectionOpen] = React.useState(true);
  const [liveSettingsOpen, setLiveSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isNarrow) setLiveSettingsOpen(false);
    else setLiveSettingsOpen(true);
  }, [isNarrow]);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // Pause si onglet inactif
  React.useEffect(() => {
    const onVis = () => setLivePaused(document.visibilityState !== "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const stopLive = () => {
    setLiveOn(false);
    setDetectOn(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        (videoRef.current as any).srcObject = null;
      } catch {}
    }
  };

  const startLive = async () => {
    try {
      setLiveErr(null);
      stopLive();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" as any, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }

      setLiveOn(true);
    } catch (e: any) {
      setLiveOn(false);
      setDetectOn(false);
      setLiveErr(e?.message || "Caméra indisponible");
    }
  };

  const clearLive = () => {
    setLiveA([]);
    setLiveB([]);
    setCircles([]);
    setNearestIdx(null);
    setCircleTeam({});
    lastNearestRef.current = null;
    stableNearestRef.current = null;
  };

  const onLiveClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    if (liveAddSide === "A") setLiveA((cur) => [...cur, pt]);
    else setLiveB((cur) => [...cur, pt]);
  };

  const liveDist = (p: PhotoPoint) => {
    const dx = p.x - liveC.x;
    const dy = p.y - liveC.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const minA_live = React.useMemo(() => {
    if (!liveA.length) return null;
    return Math.min(...liveA.map(liveDist));
  }, [liveA]);

  const minB_live = React.useMemo(() => {
    if (!liveB.length) return null;
    return Math.min(...liveB.map(liveDist));
  }, [liveB]);

  const distToCenter = (p: { x: number; y: number }) => {
    const dx = p.x - 0.5;
    const dy = p.y - 0.5;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const autoMinA = React.useMemo(() => {
    const vals: number[] = [];
    circles.forEach((c, idx) => {
      if (circleTeam[idx] === "A") vals.push(distToCenter(c));
    });
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [circles, circleTeam]);

  const autoMinB = React.useMemo(() => {
    const vals: number[] = [];
    circles.forEach((c, idx) => {
      if (circleTeam[idx] === "B") vals.push(distToCenter(c));
    });
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [circles, circleTeam]);

  const autoWinner: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (autoMinA == null || autoMinB == null) return null;
    const d = Math.abs(autoMinA - autoMinB);
    if (d <= Math.max(0, tolN)) return "TIE";
    return autoMinA < autoMinB ? "A" : "B";
  }, [autoMinA, autoMinB, tolN]);

  // ==========================
  // ✅ AUTO-DETECT LOOP (OpenCV) — MOBILE SAFE
  // ==========================
  React.useEffect(() => {
    if (!measureOpen) return;
    if (mode !== "live") return;
    if (!autoOn) return;
    if (!detectOn) return;
    if (!liveOn) return;
    if (livePaused) return;

    let alive = true;
    let cv: any = null;
    let raf = 0;
    let busy = false;

    const TICK_MS = isNarrow ? 420 : 220;
    let lastTick = 0;

    const roiCanvas = document.createElement("canvas");
    const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });

    const ema = (prev: number, next: number, a: number) => prev * (1 - a) + next * a;

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const step = () => {
      if (!alive) return;
      if (busy) return;

      const now = performance.now();
      if (now - lastTick < TICK_MS) return;
      lastTick = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !roiCtx || !cv) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      busy = true;
      try {
        const targetW = isNarrow ? 360 : 520;
        const scale = targetW / w;
        const cw = Math.max(220, Math.floor(w * scale));
        const ch = Math.max(140, Math.floor(h * scale));

        const roi = Math.max(0.4, Math.min(1, roiPct));
        const rw = Math.floor(cw * roi);
        const rh = Math.floor(ch * roi);
        const rx = Math.floor((cw - rw) / 2);
        const ry = Math.floor((ch - rh) / 2);

        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, cw, ch);

        roiCanvas.width = rw;
        roiCanvas.height = rh;
        roiCtx.clearRect(0, 0, rw, rh);
        roiCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);

        const src = cv.imread(roiCanvas);
        const gray = new cv.Mat();
        const out = new cv.Mat();

        try {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
          cv.GaussianBlur(gray, gray, new cv.Size(7, 7), 1.5, 1.5, cv.BORDER_DEFAULT);

          cv.HoughCircles(
            gray,
            out,
            cv.HOUGH_GRADIENT,
            1.2,
            22,
            120,
            Math.max(5, Math.floor(param2)),
            Math.max(1, Math.floor(minRadius)),
            Math.max(1, Math.floor(maxRadius))
          );

          const found: Array<{ x: number; y: number; r: number }> = [];
          for (let i = 0; i < out.cols; i++) {
            const xRoi = out.data32F[i * 3 + 0];
            const yRoi = out.data32F[i * 3 + 1];
            const rRoi = out.data32F[i * 3 + 2];

            const xFull = rx + xRoi;
            const yFull = ry + yRoi;

            const nx = xFull / cw;
            const ny = yFull / ch;

            const border = 0.06;
            if (nx < border || nx > 1 - border || ny < border || ny > 1 - border) continue;

            found.push({ x: clamp01(nx), y: clamp01(ny), r: rRoi / Math.max(cw, ch) });
          }

          const last = lastNearestRef.current as any;
          const matchThreshold = 0.08;
          let chosenIdx: number | null = null;

          if (last && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], last);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0 && bestD <= matchThreshold) chosenIdx = bestIdx;
          }

          if (chosenIdx == null && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], { x: 0.5, y: 0.5 });
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0) chosenIdx = bestIdx;
          }

          const alpha = 0.35;
          if (chosenIdx != null) {
            const picked = found[chosenIdx];
            lastNearestRef.current = picked;

            const stable = stableNearestRef.current as any;
            if (!stable) stableNearestRef.current = { ...picked };
            else {
              stableNearestRef.current = {
                x: ema(stable.x, picked.x, alpha),
                y: ema(stable.y, picked.y, alpha),
                r: ema(stable.r, picked.r, alpha),
              };
            }
          } else {
            lastNearestRef.current = null;
            stableNearestRef.current = null;
          }

          let stableIdx: number | null = null;
          const stable = stableNearestRef.current as any;
          if (stable && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], stable);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0) stableIdx = bestIdx;
          }

          if (alive) {
            setCircles(found);
            setNearestIdx(stableIdx);
          }
        } finally {
          src.delete();
          gray.delete();
          out.delete();
        }
      } catch (e: any) {
        if (!alive) return;
        setLiveErr(e?.message || "OpenCV indisponible");
        setDetectOn(false);
      } finally {
        busy = false;
      }
    };

    const frame = () => {
      if (!alive) return;
      step();
      raf = requestAnimationFrame(frame);
    };

    (async () => {
      try {
        cv = await loadOpenCv();
        if (!alive) return;
        raf = requestAnimationFrame(frame);
      } catch (e: any) {
        if (!alive) return;
        setLiveErr(e?.message || "OpenCV indisponible");
        setDetectOn(false);
      }
    })();

    return () => {
      alive = false;
      try {
        if (raf) cancelAnimationFrame(raf);
      } catch {}
    };
  }, [measureOpen, mode, autoOn, detectOn, liveOn, livePaused, roiPct, minRadius, maxRadius, param2, isNarrow]);

  // ✅ MOBILE SAFE: on ne start JAMAIS la caméra automatiquement
  React.useEffect(() => {
    if (!measureOpen) {
      stopLive();
      setMode("manual");
      setCalArm(null);
      return;
    }
    if (measureOpen && mode !== "live") {
      stopLive();
    }
  }, [measureOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaveLive = () => {
    if (autoOn) {
      if (autoMinA == null || autoMinB == null) return;

      const extra =
        (note?.trim() ? `${note.trim()} — ` : "") +
        `live auto mode — detect:${detectOn ? "ON" : "OFF"} — ROI:${Math.round(
          roiPct * 100
        )}% — r[${minRadius},${maxRadius}] — p2:${param2} — cercles:${circles.length} — unité:screen`;

      setSt(
        addMeasurement(st, {
          dA: Number(autoMinA),
          dB: Number(autoMinB),
          tol: Math.max(0, Number(tolN) || 0),
          note: extra,
        })
      );

      clearLive();
      setMeasureOpen(false);
      return;
    }

    if (minA_live == null || minB_live == null) return;

    const extra =
      (note?.trim() ? `${note.trim()} — ` : "") +
      `live tap — centre=cible — A:${liveA.length} / B:${liveB.length} — unité:screen`;

    setSt(
      addMeasurement(st, {
        dA: Number(minA_live),
        dB: Number(minB_live),
        tol: Math.max(0, Number(tolN) || 0),
        note: extra,
      })
    );

    clearLive();
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ Store actions
  // ==========================
  const onUndoMeasurement = () => setSt(undoLastMeasurement(st));

  const measurements = (st as any).measurements as
    | Array<{
        id: string;
        at: number;
        dA: number;
        dB: number;
        winner: "A" | "B" | "TIE";
        delta: number;
        tol: number;
        note?: string;
      }>
    | undefined;

  const allPlayers = React.useMemo(() => [...teams.A.players, ...teams.B.players], [teams]);

  // ✅ padding-top sous header fixed (ajuste si tu changes le header)
  const headerPad = 172;

  return (
    <div className="container" style={wrap(theme)}>
      <PetanqueHeaderArcade
        theme={theme}
        go={go}
        allowMeasurements={allowMeasurements}
        onMeasure={() => setMeasureOpen(true)}
        isFfa3={isFfa3}
        teams={teams}
        scoreA={(st as any).scoreA ?? 0}
        scoreB={(st as any).scoreB ?? 0}
        ffaPlayers={ffaPlayers}
        ffaScores={ffaScores}
        ffaWinnerIdx={ffaWinnerIdx}
        onAddEndA={() => openEndSheet("A")}
        onAddEndB={() => openEndSheet("B")}
      />

      <div style={{ paddingTop: headerPad, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ✅ COMPOSITION (2 colonnes côte à côte) */}
{!isFfa3 && (
  <div className="card" style={cardStyle(theme)}>
    <div className="subtitle" style={sub(theme)}>ÉQUIPES</div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {(["A", "B"] as const).map((side) => {
        const t = side === "A" ? teams.A : teams.B;
        const teamColor = pickTeamColor(theme, side);

        return (
          <div key={side} className="card" style={cardSoftStyle(theme)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div className="subtitle" style={{ ...sub(theme), color: teamColor }}>
                {t.name}
              </div>
              <div className="subtitle" style={muted(theme)}>Rôles</div>
            </div>

            {!t.players.length ? (
              <div className="subtitle" style={muted(theme)}>
                Aucun joueur détecté (configure la composition pour avatars + rôles).
              </div>
            ) : (
              <>
                {/* Avatars 1 seule ligne */}
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {t.players.map((p, idx) => {
                    const safeName = prettyPlayerName(p.name, `Joueur ${idx + 1}`);
                    const code = roleCodeFromLabel(p.role);
                    return (
                      <div key={p.id} style={{ width: 96, flex: "0 0 auto", textAlign: "center" }}>
                        <MedallionAvatar
                          src={p.profile ? getAvatarSrc(p.profile) : null}
                          size={58}
                          border={`${teamColor}66`}
                          glow={`${teamColor}22`}
                          fallback={(safeName || "?").slice(0, 1).toUpperCase()}
                        />
                        <div
                          style={{
                            marginTop: 6,
                            fontWeight: 1100 as any,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={safeName}
                        >
                          {safeName}
                        </div>

                        <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                          <span style={rolePillStyle(theme, code)}>{code}</span>
                        </div>

                        {/* ✅ petit + pour stats joueur */}
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            style={{ ...miniBtnOn(theme), width: "100%", height: 34 }}
                            onClick={() => openPlayerSheet(p)}
                            title="Ajouter / modifier stats joueur"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}

{/* ✅ STATS — RÉSUMÉ (tops par stat) */}
{!isFfa3 && (
  <div className="card" style={cardStyle(theme)}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div className="subtitle" style={sub(theme)}>STATS — Résumé</div>
      <div className="subtitle" style={muted(theme)}>Top 3 par stat</div>
    </div>

    {(() => {
      const all = [...teams.A.players, ...teams.B.players];

      const defs: Array<{ k: keyof PlayerStats; label: string }> = [
        { k: "points", label: "Points" },
        { k: "carreau", label: "Carreau" },
        { k: "tirReussi", label: "Tir OK" },
        { k: "trou", label: "Trou" },
        { k: "bec", label: "Bec" },
        { k: "butAnnulation", label: "But KO" },
        { k: "butPoint", label: "But +" },
      ];

      const top3 = (k: keyof PlayerStats) =>
        all
          .map((p) => ({ p, v: (playerStats[p.id] ?? EMPTY_STATS)[k] ?? 0 }))
          .filter((x) => x.v > 0)
          .sort((a, b) => b.v - a.v)
          .slice(0, 3);

      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {defs.map((d) => {
            const rows = top3(d.k);

            return (
              <div key={String(d.k)} className="card" style={cardSoftStyle(theme)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div className="subtitle" style={sub(theme)}>{d.label}</div>
                  <div className="subtitle" style={muted(theme)}>Top</div>
                </div>

                {!rows.length ? (
                  <div className="subtitle" style={muted(theme)}>Aucun score.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {rows.map(({ p, v }, i) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 10px",
                          borderRadius: 14,
                          border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
                          background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span className="badge" style={pill(theme)}>#{i + 1}</span>
                          <div style={{ fontWeight: 1100 as any, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </div>
                        </div>
                        <div style={{ fontWeight: 1200 as any }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    })()}
  </div>
)}

                {/* ✅ STATS JOUEURS (COMPACT) */}
                {!isFfa3 && (
          <div className="card" style={cardStyle(theme)}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div className="subtitle" style={sub(theme)}>
                  STATS JOUEURS
                </div>
                <div className="subtitle" style={muted(theme)}>
                  Tap un joueur → panneau flottant (+/−)
                </div>
              </div>

              <button
                className="btn"
                style={modeBtn(theme, quickAssignPoints)}
                onClick={() => setQuickAssignPoints((v) => !v)}
                title="Après +1/+2/+3… demande qui a marqué et crédite ses points"
              >
                Points: {quickAssignPoints ? "AUTO" : "OFF"}
              </button>
            </div>

            {!allPlayers.length ? (
              <div className="subtitle" style={muted(theme)}>
                Ajoute des joueurs dans la config pour activer les stats individuelles.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: teams.A.name, color: pickTeamColor(theme, "A"), list: teams.A.players },
                  { label: teams.B.name, color: pickTeamColor(theme, "B"), list: teams.B.players },
                ].map((g, gi) => (
                  <div key={gi} className="card" style={cardSoftStyle(theme)}>
                    <div className="subtitle" style={{ ...sub(theme), color: g.color }}>
                      {g.label}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {g.list.map((p) => {
                        const s = playerStats[p.id] ?? EMPTY_STATS;
                        const pts = s.points ?? 0;

                        return (
                          <button
                            key={p.id}
                            className="btn"
                            style={{
                              ...ghost(theme),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "10px 12px",
                            }}
                            onClick={() => openPlayerSheet(p)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <MedallionAvatar
                                src={p.profile ? getAvatarSrc(p.profile) : null}
                                size={34}
                                border={cssVarOr("rgba(255,255,255,0.18)", "--stroke")}
                                glow={"rgba(0,0,0,0)"}
                                fallback={(p.name || "?").slice(0, 1).toUpperCase()}
                              />

                              <div style={{ minWidth: 0, textAlign: "left" }}>
                                <div
                                  style={{
                                    fontWeight: 1100 as any,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {p.name}
                                </div>

                                <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <span style={rolePill(theme)}>{p.role ?? "Non défini"}</span>
                                  <span style={pill(theme)}>Pts: {pts}</span>
                                </div>
                              </div>
                            </div>

                            <span className="badge" style={pill(theme)}>
                              Ouvrir
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ✅ GRILLE POINTS (FFA3 3 colonnes vs Teams 2 colonnes) */}
{isFfa3 ? (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 12,
    }}
  >
    {ffaPlayers.map((raw, idx) => {
      const name = prettyPlayerName(String(raw ?? ""), `Joueur ${idx + 1}`);
      return (
        <div key={idx} className="card" style={cardStyle(theme)}>
          <div className="subtitle" style={sub(theme)}>
            Mène — {name}
          </div>
          <div style={ptsGrid}>
            {PTS_FFA3.map((p) => (
              <button
                key={`P${idx}-${p}`}
                className="btn"
                style={ptBtn(theme)}
                onClick={() => addFfaEnd(idx, p)}
                disabled={ffaWinnerIdx != null}
              >
                +{p}
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
) : (
  // ✅ Mode équipes : la grille "Mène A / Mène B" est supprimée car remplacée
  // par les "+" sous le SCORE (dans le header).
  <div className="card" style={cardStyle(theme)}>
    <div className="subtitle" style={sub(theme)}>
      Mène
    </div>
    <div className="subtitle" style={muted(theme)}>
      Ajoute une mène via les boutons “+” sous le score (A/B).
    </div>
  </div>
)}


        {/* ✅ ACTIONS (branché FFA3) */}
        <div className="card" style={cardStyle(theme)}>
          <div className="subtitle" style={sub(theme)}>
            Actions
          </div>
          <div style={row}>
            <button
              className="btn"
              style={primary(theme)}
              onClick={isFfa3 ? undoFfaEnd : onUndo}
              disabled={isFfa3 ? !ffaEnds.length : !(st as any).ends?.length}
            >
              Annuler dernière mène
            </button>

            <button className="btn danger" style={danger(theme)} onClick={isFfa3 ? resetFfa : onNew}>
              Nouvelle partie
            </button>
          </div>
        </div>

        {/* ✅ MESURES (historique) */}
        <div className="card" style={cardStyle(theme)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div className="subtitle" style={sub(theme)}>
              Mesurages
            </div>
            <button
              className="btn ghost"
              style={ghost(theme)}
              onClick={onUndoMeasurement}
              disabled={!measurements?.length}
              title="Annuler la dernière mesure enregistrée"
            >
              Annuler mesure
            </button>
          </div>

          {!measurements?.length ? (
            <div className="subtitle" style={muted(theme)}>
              Aucun mesurage enregistré.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {measurements.slice(0, 8).map((m) => {
                const who =
                  m.winner === "TIE" ? "Égalité" : m.winner === "A" ? teams.A.name : teams.B.name;
                return (
                  <div key={m.id} style={endRow(theme)}>
                    <div className="badge" style={pill(theme)}>
                      {who}
                    </div>
                    <div style={endTxt(theme)}>
                      A {m.dA} — B {m.dB} — Δ {m.delta.toFixed(3)} (tol {m.tol})
                      {m.note ? ` — ${m.note}` : ""}
                    </div>
                  </div>
                );
              })}
              {measurements.length > 8 && (
                <div className="subtitle" style={muted(theme)}>
                  … {measurements.length - 8} autres mesures.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ HISTORIQUE DES MÈNES (FFA3 vs Teams) */}
        <div className="card" style={cardStyle(theme)}>
          <div className="subtitle" style={sub(theme)}>
            Historique des mènes
          </div>

          {isFfa3 ? (
            !ffaEnds.length ? (
              <div className="subtitle" style={muted(theme)}>
                Aucune mène enregistrée.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ffaEnds.map((e, idx) => (
                  <div key={e.id} style={endRow(theme)}>
                    <div className="badge" style={pill(theme)}>
                      {prettyPlayerName(String(ffaPlayers[e.p] ?? ""), `Joueur ${e.p + 1}`)}
                    </div>
                    <div style={endTxt(theme)}>
                      +{e.points} — mène #{ffaEnds.length - idx}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : !(st as any).ends?.length ? (
            <div className="subtitle" style={muted(theme)}>
              Aucune mène enregistrée.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(st as any).ends.map((e: any, idx: number) => (
                <div key={e.id} style={endRow(theme)}>
                  <div className="badge" style={pill(theme)}>
                    {e.winner === "A" ? teams.A.name : teams.B.name}
                  </div>
                  <div style={endTxt(theme)}>
                    +{e.points} — mène #{(st as any).ends.length - idx}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================
    ✅ SHEET "MÈNE" (points + validation) — déclenché par + sous score
========================================================= */}
{!isFfa3 && endSheetOpen && (
  <div
    style={overlay}
    onClick={closeEndSheet}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="card"
      style={{ ...sheet(theme), width: "min(560px, 100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header sticky */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingBottom: 10,
          marginBottom: 10,
          background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${cssVarOr("rgba(255,255,255,0.10)", "--stroke")}`,
        }}
      >
        <div>
          <div className="subtitle" style={sub(theme)}>
            Mène jouée
          </div>
          <div className="subtitle" style={muted(theme)}>
            Équipe : {endTeam === "A" ? teams.A.name : teams.B.name}
          </div>
        </div>

        <button className="btn ghost" style={ghost(theme)} onClick={closeEndSheet}>
          Fermer
        </button>
      </div>

      {/* Points */}
      <div className="card" style={cardSoftStyle(theme)}>
        <div className="subtitle" style={sub(theme)}>Points de la mène</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {PTS_END.map((p) => (
            <button
              key={p}
              className="btn"
              style={ptBtn(theme)}
              onClick={() => setEndPts(p)}
            >
              +{p}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="subtitle" style={label(theme)}>Sélection</div>
          <div className="badge" style={pill(theme)}>
            {endTeam === "A" ? teams.A.name : teams.B.name} — +{endPts}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="subtitle" style={label(theme)}>Note (optionnel)</div>
          <input
            className="input"
            style={input(theme)}
            value={endNote}
            onChange={(e) => setEndNote(e.target.value)}
            placeholder="Ex: mène serrée / terrain dur…"
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn primary"
          style={primary(theme)}
          onClick={commitEndFromSheet}
          disabled={(st as any).finished}
          title={(st as any).finished ? "Partie terminée" : "Valider"}
        >
          Valider la mène
        </button>

        <button
          className="btn ghost"
          style={ghost(theme)}
          onClick={() => {
            setEndPts(1);
            setEndNote("");
          }}
        >
          Réinitialiser
        </button>
      </div>

      <div className="subtitle" style={muted(theme)}>
        Si “Points AUTO” est activé, l’app te demandera ensuite qui a marqué.
      </div>
    </div>
  </div>
)}

                {/* =========================================================
            ✅ SHEET FLOTTANT — STATS JOUEUR (compact)
            - tap un joueur => openPlayerSheet(p)
        ========================================================== */}
        {!isFfa3 && pstatSheetOpen && pstatPlayer && (
          <div
            style={overlay}
            onClick={() => closePlayerSheet()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="card"
              style={{
                ...sheet(theme),
                width: "min(560px, 100%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 10,
                  marginBottom: 10,
                  background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
                  backdropFilter: "blur(14px)",
                  borderBottom: `1px solid ${cssVarOr(
                    "rgba(255,255,255,0.10)",
                    "--stroke"
                  )}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MedallionAvatar
                    src={pstatPlayer.profile ? getAvatarSrc(pstatPlayer.profile) : null}
                    size={44}
                    border={cssVarOr("rgba(255,255,255,0.18)", "--stroke")}
                    glow={"rgba(0,0,0,0)"}
                    fallback={(pstatPlayer.name || "?").slice(0, 1).toUpperCase()}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1200 as any, lineHeight: 1.1 }}>
                      {pstatPlayer.name}
                    </div>
                    <div className="subtitle" style={{ ...muted(theme), marginTop: 2 }}>
                      {pstatPlayer.role ?? "Non défini"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => closePlayerSheet()}
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* KPI rapides */}
              <div
                className="card"
                style={{
                  ...cardSoftStyle(theme),
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {(
                  [
                    ["points", "Points"],
                    ["carreau", "Carreau"],
                    ["tirReussi", "Tir OK"],
                    ["trou", "Trou"],
                    ["bec", "Bec"],
                    ["butAnnulation", "But KO"],
                    ["butPoint", "But +"],
                  ] as Array<[keyof PlayerStats, string]>
                ).map(([k, labelTxt]) => {
                  const cur = (playerStats[pstatPlayer.id] ?? EMPTY_STATS)[k] ?? 0;

                  return (
                    <div
                      key={String(k)}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${cssVarOr(
                          "rgba(255,255,255,0.12)",
                          "--stroke"
                        )}`,
                        background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
                        padding: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div className="subtitle" style={{ ...sub(theme), opacity: 0.8 }}>
                          {labelTxt}
                        </div>
                        <div style={{ fontWeight: 1200 as any, fontSize: 18 }}>{cur}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn"
                          style={miniBtn(theme)}
                          onClick={() => bumpStat(pstatPlayer.id, k, -1)}
                        >
                          −
                        </button>
                        <button
                          className="btn"
                          style={miniBtnOn(theme)}
                          onClick={() => bumpStat(pstatPlayer.id, k, +1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset joueur */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn ghost"
                  style={ghost(theme)}
                  onClick={() => {
                    // reset uniquement ce joueur
                    setPlayerStats((prev) => {
                      const next = { ...prev };
                      next[pstatPlayer.id] = { ...EMPTY_STATS };
                      return next;
                    });
                  }}
                >
                  Reset joueur
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ✅ SHEET "QUI A MARQUÉ ?" (après +1/+2/+3…)
            - déclenché par maybeOpenAssignPoints(team, pts)
        ========================================================== */}
        {!isFfa3 && pendingAssign && (
          <div
            style={overlay}
            onClick={() => setPendingAssign(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="card"
              style={{
                ...sheet(theme),
                width: "min(560px, 100%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 10,
                  marginBottom: 10,
                  background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
                  backdropFilter: "blur(14px)",
                  borderBottom: `1px solid ${cssVarOr(
                    "rgba(255,255,255,0.10)",
                    "--stroke"
                  )}`,
                }}
              >
                <div>
                  <div className="subtitle" style={sub(theme)}>
                    Attribution des points
                  </div>
                  <div className="subtitle" style={muted(theme)}>
                    {pendingAssign.team === "A" ? teams.A.name : teams.B.name} — +
                    {pendingAssign.pts}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => setPendingAssign(null)}
                  >
                    Annuler
                  </button>
                </div>
              </div>

              <div className="subtitle" style={muted(theme)}>
                Clique le joueur à créditer. (Tu peux ensuite ouvrir sa fiche si tu veux détailler.)
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {(pendingAssign.team === "A" ? teams.A.players : teams.B.players).map((p) => {
                  const pts = (playerStats[p.id] ?? EMPTY_STATS).points ?? 0;
                  return (
                    <button
                      key={p.id}
                      className="btn"
                      style={{
                        ...ghost(theme),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        textAlign: "left",
                      }}
                      onClick={() => {
                        bumpStat(p.id, "points", pendingAssign.pts);
                        setPendingAssign(null);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <MedallionAvatar
                          src={p.profile ? getAvatarSrc(p.profile) : null}
                          size={34}
                          border={cssVarOr("rgba(255,255,255,0.18)", "--stroke")}
                          glow={"rgba(0,0,0,0)"}
                          fallback={(p.name || "?").slice(0, 1).toUpperCase()}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 1100 as any,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={rolePill(theme)}>{p.role ?? "Non défini"}</span>
                            <span style={pill(theme)}>Pts: {pts}</span>
                          </div>
                        </div>
                      </div>

                      <span className="badge" style={pill(theme)}>
                        +{pendingAssign.pts}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn ghost"
                  style={ghost(theme)}
                  onClick={() => {
                    // Option utile: répartit automatiquement sur le 1er joueur (fallback)
                    const roster = pendingAssign.team === "A" ? teams.A.players : teams.B.players;
                    if (roster?.[0]) bumpStat(roster[0].id, "points", pendingAssign.pts);
                    setPendingAssign(null);
                  }}
                  title="Fallback rapide si tu veux passer"
                >
                  Attribuer au 1er
                </button>

                <button
                  className="btn"
                  style={modeBtn(theme, quickAssignPoints)}
                  onClick={() => {
                    setQuickAssignPoints(false);
                    setPendingAssign(null);
                  }}
                  title="Désactive l’attribution auto après les mènes"
                >
                  Désactiver AUTO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ✅ SHEET MOBILE SAFE — MESURAGE
            (structure fiabilisée : overlay -> sheet -> header sticky -> contenu)
        ========================================================== */}
        {allowMeasurements && measureOpen && (
          <div
            style={overlay}
            onClick={() => setMeasureOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={sheetRef}
              className="card"
              style={sheet(theme)}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ✅ Sticky Header */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 10,
                  marginBottom: 4,
                  background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
                  backdropFilter: "blur(14px)",
                  borderBottom: `1px solid ${cssVarOr(
                    "rgba(255,255,255,0.10)",
                    "--stroke"
                  )}`,
                }}
              >
                <div className="subtitle" style={sub(theme)}>
                  Mesurage
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => {
                      const el = radarRef.current as any;
                      el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                    }}
                    title="Aller au radar"
                  >
                    Radar ↓
                  </button>

                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => {
                      const el = sheetRef.current as any;
                      el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                    }}
                    title="Remonter"
                  >
                    ↑ Haut
                  </button>

                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => setMeasureOpen(false)}
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  style={modeBtn(theme, mode === "manual")}
                  onClick={() => setMode("manual")}
                >
                  Manuel
                </button>
                <button
                  className="btn"
                  style={modeBtn(theme, mode === "photo")}
                  onClick={() => setMode("photo")}
                >
                  Photo
                </button>
                <button
                  className="btn"
                  style={modeBtn(theme, mode === "live")}
                  onClick={() => setMode("live")}
                >
                  LIVE Radar
                </button>
              </div>

              {/* Shared */}
              <div style={row}>
                <div style={{ flex: 1 }}>
                  <div className="subtitle" style={label(theme)}>
                    Tolérance
                  </div>
                  <input
                    className="input"
                    style={input(theme)}
                    value={tol}
                    onChange={(e) => setTol(e.target.value)}
                    placeholder="1"
                    inputMode="decimal"
                  />
                </div>

                <div style={{ flex: 2 }}>
                  <div className="subtitle" style={label(theme)}>
                    Note (optionnel)
                  </div>
                  <input
                    className="input"
                    style={input(theme)}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: mesure serrée / terrain incliné…"
                  />
                </div>
              </div>

              {/* =========================
                  MANUAL
              ========================= */}
              {mode === "manual" ? (
                <>
                  <div className="subtitle" style={hint(theme)}>
                    Saisis les distances en centimètres (cochonnet → boule A / boule B).
                  </div>

                  <div style={grid2}>
                    <div className="card" style={cardSoftStyle(theme)}>
                      <div className="subtitle" style={sub(theme)}>
                        {teams.A.name}
                      </div>
                      <input
                        className="input"
                        style={input(theme)}
                        value={dA}
                        onChange={(e) => setDA(e.target.value)}
                        placeholder="Distance (cm)"
                        inputMode="decimal"
                      />
                    </div>

                    <div className="card" style={cardSoftStyle(theme)}>
                      <div className="subtitle" style={sub(theme)}>
                        {teams.B.name}
                      </div>
                      <input
                        className="input"
                        style={input(theme)}
                        value={dB}
                        onChange={(e) => setDB(e.target.value)}
                        placeholder="Distance (cm)"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div style={resultBox(theme, manualWinner)}>{manualText}</div>

                  <div style={row}>
                    <button
                      className="btn primary"
                      style={primary(theme)}
                      onClick={onSaveManual}
                      disabled={!canComputeManual}
                    >
                      Enregistrer la mesure
                    </button>
                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={() => {
                        setDA("");
                        setDB("");
                        setNote("");
                      }}
                    >
                      Effacer
                    </button>
                  </div>
                </>
              ) : mode === "photo" ? (
                /* =========================
                   PHOTO
                ========================= */
                <>
                  <div className="subtitle" style={hint(theme)}>
                    Photo : clique d’abord le cochonnet (C), puis ajoute des boules (A/B). Calibration optionnelle.
                  </div>

                  <div style={row}>
                    <label className="btn" style={fileBtn(theme)}>
                      Ajouter une photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPickImage}
                        style={{ display: "none" }}
                      />
                    </label>

                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={clearPhoto}
                      disabled={!imgUrl}
                    >
                      Réinitialiser
                    </button>

                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={() => setLoupeOn((v) => !v)}
                      disabled={!imgUrl}
                    >
                      Loupe: {loupeOn ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="card" style={cardSoftStyle(theme)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div className="subtitle" style={sub(theme)}>
                        Ajout de boules
                      </div>
                      <div className="subtitle" style={muted(theme)}>
                        A:{ballsA.length} / B:{ballsB.length}
                      </div>
                    </div>

                    <div style={row}>
                      <button
                        className="btn"
                        style={modeBtn(theme, addSide === "A")}
                        onClick={() => setAddSide("A")}
                      >
                        Ajouter {teams.A.name}
                      </button>
                      <button
                        className="btn"
                        style={modeBtn(theme, addSide === "B")}
                        onClick={() => setAddSide("B")}
                      >
                        Ajouter {teams.B.name}
                      </button>
                      <button
                        className="btn ghost"
                        style={ghost(theme)}
                        onClick={onClearPhotoPoints}
                        disabled={!pCochonnet && !ballsA.length && !ballsB.length}
                      >
                        Effacer points
                      </button>
                    </div>

                    <div className="subtitle" style={muted(theme)}>
                      Clic image ={" "}
                      {calArm
                        ? `Calibration ${calArm}`
                        : !pCochonnet
                        ? "Définir cochonnet (C)"
                        : `Ajouter boule (${addSide})`}
                    </div>
                  </div>

                  <div className="card" style={cardSoftStyle(theme)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div className="subtitle" style={sub(theme)}>
                        Calibration (optionnel)
                      </div>
                      <div className="subtitle" style={muted(theme)}>
                        {pxPerCm ? `OK: ~${pxPerCm.toFixed(1)} px/cm` : "Non calibrée"}
                      </div>
                    </div>

                    <div style={row}>
                      <button
                        className="btn ghost"
                        style={ghost(theme)}
                        onClick={() => setCalArm("A")}
                        disabled={!imgUrl}
                      >
                        Point Cal A {calArm === "A" ? "(clic…)" : ""}
                      </button>
                      <button
                        className="btn ghost"
                        style={ghost(theme)}
                        onClick={() => setCalArm("B")}
                        disabled={!imgUrl}
                      >
                        Point Cal B {calArm === "B" ? "(clic…)" : ""}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div className="subtitle" style={label(theme)}>
                          Longueur réelle (cm)
                        </div>
                        <input
                          className="input"
                          style={input(theme)}
                          value={calLenCm}
                          onChange={(e) => setCalLenCm(e.target.value)}
                          placeholder="ex: 10"
                          inputMode="decimal"
                        />
                      </div>

                      <button
                        className="btn ghost"
                        style={ghost(theme)}
                        onClick={() => {
                          setCalA(null);
                          setCalB(null);
                          setCalLenCm("");
                          setCalArm(null);
                        }}
                        disabled={!calA && !calB && !calLenCm}
                      >
                        Effacer calib
                      </button>
                    </div>
                  </div>

                  {imgUrl ? (
                    <div style={imgWrap(theme)}>
                      <div className="subtitle" style={imgHint(theme)}>
                        {calArm
                          ? `Calibration: clique le point ${calArm}`
                          : !pCochonnet
                          ? "Clique le cochonnet (C)."
                          : `Clique pour ajouter une boule (${addSide}).`}
                      </div>

                      <div
                        style={imgClickArea}
                        onClick={onPhotoClick}
                        onMouseMove={onPhotoMove}
                      >
                        <img
                          ref={imgRef}
                          src={imgUrl}
                          alt="Mesurage"
                          style={imgStyle}
                          onLoad={(e) => {
                            const el = e.currentTarget;
                            setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                          }}
                          draggable={false}
                        />

                        {imgNatural && (
                          <>
                            {pCochonnet && <div style={marker(theme, pCochonnet)} />}
                            {ballsA.map((b, i) => (
                              <div key={`ma-${i}`} style={marker(theme, b)} />
                            ))}
                            {ballsB.map((b, i) => (
                              <div key={`mb-${i}`} style={marker(theme, b)} />
                            ))}
                            {calA && <div style={marker(theme, calA)} />}
                            {calB && <div style={marker(theme, calB)} />}
                          </>
                        )}

                        {loupeOn && imgUrl && hoverPt && (
                          <div style={loupeStyle(imgUrl, hoverPt)} aria-hidden />
                        )}
                      </div>

                      <div style={resultBox(theme, winnerPhoto)}>
                        {minA_photo == null || minB_photo == null
                          ? "Ajoute au moins 1 boule A et 1 boule B pour comparer."
                          : `Plus proche A: ${minA_photo.toFixed(pxPerCm ? 1 : 0)} ${
                              pxPerCm ? "cm" : "px"
                            } — B: ${minB_photo.toFixed(pxPerCm ? 1 : 0)} ${
                              pxPerCm ? "cm" : "px"
                            }`}
                      </div>

                      <div style={row}>
                        <button
                          className="btn primary"
                          style={primary(theme)}
                          onClick={onSavePhoto}
                          disabled={minA_photo == null || minB_photo == null}
                        >
                          Enregistrer (photo)
                        </button>
                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={() => setPCochonnet(null)}
                          disabled={!pCochonnet}
                        >
                          Replacer C
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="subtitle" style={muted(theme)}>
                      Aucune image chargée.
                    </div>
                  )}
                </>
              ) : (
                /* =========================
                   LIVE
                ========================= */
                <>
                  <div className="subtitle" style={hint(theme)}>
                    LIVE mobile-safe : sur téléphone utilise “Mode TAP” (fluide). “Mode AUTO” + “Détection ON” lance OpenCV (optionnel). Pause coupe l’analyse immédiatement.
                  </div>

                  <div className="card" style={cardSoftStyle(theme)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div className="subtitle" style={sub(theme)}>
                        Caméra / Radar
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={() => setLiveSectionOpen((v) => !v)}
                        >
                          {liveSectionOpen ? "Réduire" : "Ouvrir"}
                        </button>

                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={liveOn ? stopLive : startLive}
                        >
                          {liveOn ? "Stop caméra" : "Démarrer caméra"}
                        </button>
                      </div>
                    </div>

                    <div className="subtitle" style={muted(theme)}>
                      Astuce mobile: autorise la caméra quand le navigateur le demande. Si ça lag, garde “Mode TAP” et laisse “Détection OFF”.
                    </div>
                  </div>

                  <div style={row}>
                    <button
                      className="btn"
                      style={modeBtn(theme, !autoOn)}
                      onClick={() => {
                        setAutoOn(false);
                        setDetectOn(false);
                      }}
                      disabled={!liveOn}
                    >
                      Mode TAP
                    </button>

                    <button
                      className="btn"
                      style={modeBtn(theme, autoOn)}
                      onClick={() => setAutoOn(true)}
                      disabled={!liveOn}
                    >
                      Mode AUTO
                    </button>

                    {autoOn ? (
                      <>
                        <button
                          className="btn"
                          style={modeBtn(theme, detectOn)}
                          onClick={() => setDetectOn((v) => !v)}
                          disabled={!liveOn}
                        >
                          Détection: {detectOn ? "ON" : "OFF"}
                        </button>

                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={() => setLivePaused((v) => !v)}
                          disabled={!liveOn}
                        >
                          {livePaused ? "Reprendre" : "Pause"}
                        </button>

                        <button
                          className="btn"
                          style={modeBtn(theme, assignSide === "A")}
                          onClick={() => setAssignSide("A")}
                          disabled={!liveOn}
                        >
                          Assigner {teams.A.name}
                        </button>
                        <button
                          className="btn"
                          style={modeBtn(theme, assignSide === "B")}
                          onClick={() => setAssignSide("B")}
                          disabled={!liveOn}
                        >
                          Assigner {teams.B.name}
                        </button>

                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={() => setCircleTeam({})}
                          disabled={!Object.keys(circleTeam).length}
                        >
                          Reset équipes
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn"
                          style={modeBtn(theme, liveAddSide === "A")}
                          onClick={() => setLiveAddSide("A")}
                          disabled={!liveOn}
                        >
                          Ajouter {teams.A.name}
                        </button>
                        <button
                          className="btn"
                          style={modeBtn(theme, liveAddSide === "B")}
                          onClick={() => setLiveAddSide("B")}
                          disabled={!liveOn}
                        >
                          Ajouter {teams.B.name}
                        </button>
                      </>
                    )}

                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={clearLive}
                      disabled={
                        !circles.length &&
                        !liveA.length &&
                        !liveB.length &&
                        !Object.keys(circleTeam).length
                      }
                    >
                      Effacer
                    </button>
                  </div>

                  {liveErr && <div style={resultBox(theme, "TIE")}>{liveErr}</div>}

                  <div className="card" style={cardSoftStyle(theme)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div className="subtitle" style={sub(theme)}>
                        Réglages LIVE (PRO)
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div className="subtitle" style={muted(theme)}>
                          ROI {Math.round(roiPct * 100)}% — r[{minRadius},{maxRadius}] — p2 {param2}
                          {livePaused ? " — PAUSE" : ""}
                        </div>
                        <button
                          className="btn ghost"
                          style={ghost(theme)}
                          onClick={() => setLiveSettingsOpen((v) => !v)}
                          disabled={!autoOn}
                        >
                          {liveSettingsOpen ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                    </div>

                    {liveSettingsOpen ? (
                      <>
                        <div style={liveSliderRow}>
                          <div style={{ flex: 1, minWidth: 190 }}>
                            <div className="subtitle" style={label(theme)}>
                              ROI (zone utile)
                            </div>
                            <input
                              type="range"
                              min={40}
                              max={100}
                              step={5}
                              value={Math.round(roiPct * 100)}
                              onChange={(e) =>
                                setRoiPct(
                                  Math.max(
                                    0.4,
                                    Math.min(1, Number(e.target.value) / 100)
                                  )
                                )
                              }
                              style={liveSlider(theme)}
                              disabled={!autoOn}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 190 }}>
                            <div className="subtitle" style={label(theme)}>
                              Min radius
                            </div>
                            <input
                              type="range"
                              min={4}
                              max={40}
                              step={1}
                              value={minRadius}
                              onChange={(e) => setMinRadius(Number(e.target.value))}
                              style={liveSlider(theme)}
                              disabled={!autoOn}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 190 }}>
                            <div className="subtitle" style={label(theme)}>
                              Max radius
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={120}
                              step={1}
                              value={maxRadius}
                              onChange={(e) => setMaxRadius(Number(e.target.value))}
                              style={liveSlider(theme)}
                              disabled={!autoOn}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 190 }}>
                            <div className="subtitle" style={label(theme)}>
                              Param2 (Hough)
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={60}
                              step={1}
                              value={param2}
                              onChange={(e) => setParam2(Number(e.target.value))}
                              style={liveSlider(theme)}
                              disabled={!autoOn}
                            />
                          </div>
                        </div>

                        <div className="subtitle" style={muted(theme)}>
                          Astuce: faux cercles → augmente Param2. Rien détecté → baisse Param2 ou ajuste les rayons. ROI réduit = plus stable/rapide.
                        </div>
                      </>
                    ) : (
                      <div className="subtitle" style={muted(theme)}>
                        Réglages masqués (mobile). Ouvre “Afficher” si besoin.
                      </div>
                    )}
                  </div>

                  {liveSectionOpen && (
                    <div ref={radarRef as any}>
                      <div
                        ref={liveWrapRef}
                        style={liveWrap(theme)}
                        onClick={!autoOn ? onLiveClick : undefined}
                      >
                        <video ref={videoRef} style={liveVideo} playsInline muted />
                        <canvas ref={canvasRef} style={{ display: "none" }} />

                        <div style={radarOverlay}>
                          <div style={radarSweep(theme)} />
                          <div style={crosshairOuter(theme)} />
                          <div style={crosshairInner} />
                        </div>

                        {autoOn &&
                          circles.map((c, idx) => {
                            const isBest = nearestIdx === idx;
                            const team = circleTeam[idx] || null;

                            return (
                              <div
                                key={`c-${idx}`}
                                style={liveCircle(
                                  theme,
                                  { x: c.x, y: c.y },
                                  c.r,
                                  isBest,
                                  team
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCircleTeam((cur) => ({ ...cur, [idx]: assignSide }));
                                }}
                                title={team ? `Équipe ${team}` : `Assigner à ${assignSide}`}
                              />
                            );
                          })}

                        {!autoOn && (
                          <>
                            <div style={liveMarker(theme, { x: 0.5, y: 0.5 }, false)} />
                            {liveA.map((p, i) => (
                              <div key={`la-${i}`} style={liveMarker(theme, p, false)} />
                            ))}
                            {liveB.map((p, i) => (
                              <div key={`lb-${i}`} style={liveMarker(theme, p, false)} />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="card" style={cardSoftStyle(theme)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div className="subtitle" style={sub(theme)}>
                        Lecture
                      </div>
                      <div className="subtitle" style={muted(theme)}>
                        {autoOn
                          ? `cercles:${circles.length} — assignés A:${
                              Object.values(circleTeam).filter((v) => v === "A").length
                            } / B:${
                              Object.values(circleTeam).filter((v) => v === "B").length
                            }`
                          : `A:${liveA.length} / B:${liveB.length}`}
                      </div>
                    </div>

                    <div className="subtitle" style={muted(theme)}>
                      {autoOn ? (
                        <>
                          Auto: A={autoMinA == null ? "—" : autoMinA.toFixed(4)} / B=
                          {autoMinB == null ? "—" : autoMinB.toFixed(4)}
                          {" — "}
                          {autoWinner == null
                            ? "Assigne au moins 1 boule A et 1 boule B"
                            : autoWinner === "TIE"
                            ? "Égalité"
                            : autoWinner === "A"
                            ? teams.A.name
                            : teams.B.name}
                          {" — "}
                          Détection: {detectOn ? "ON" : "OFF"}
                        </>
                      ) : (
                        <>TAP: ajoute A puis B puis Enregistrer</>
                      )}
                    </div>

                    <div style={row}>
                      <button
                        className="btn primary"
                        style={primary(theme)}
                        onClick={onSaveLive}
                        disabled={
                          autoOn
                            ? autoMinA == null || autoMinB == null
                            : minA_live == null || minB_live == null
                        }
                      >
                        Enregistrer ({autoOn ? "auto" : "tap"})
                      </button>
                    </div>

                    <div className="subtitle" style={muted(theme)}>
                      Note: sur mobile, “Mode TAP” est recommandé. “Mode AUTO” + “Détection ON” lance OpenCV (peut lag selon téléphone).
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================
   Styles
========================== */

function cssVarOr(fallback: string, varName: string) {
  return `var(${varName}, ${fallback})`;
}

function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    padding: 14,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    background: dark
      ? cssVarOr(
          "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.92))",
          "--bg"
        )
      : cssVarOr(
          "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.05), rgba(255,255,255,0.94))",
          "--bg"
        ),
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

function cardStyle(theme: any): React.CSSProperties {
  return {
    position: "relative",
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  };
}

function cardSoftStyle(theme: any): React.CSSProperties {
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
    padding: "10px 12px",
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
    padding: "10px 12px",
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
    padding: "10px 12px",
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
    padding: "8px 10px",
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
    padding: "8px 12px",
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
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.10))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1100 as any,
    cursor: "pointer",
  };
}

function win(_theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 1100 as any,
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: "rgba(240,177,42,0.14)",
  };
}

function muted(_theme: any): React.CSSProperties {
  return { opacity: 0.75, fontSize: 13, lineHeight: 1.35 };
}

function pill(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    fontWeight: 1000 as any,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  };
}

function endRow(_theme: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
    backdropFilter: "blur(10px)",
  };
}

function rolePill(_theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 1200 as any,
    letterSpacing: 0.6,
    border: `1px solid ${cssVarOr("rgba(240,177,42,0.35)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(240,177,42,0.18), rgba(0,0,0,0.10))",
    color: "rgba(255,255,255,0.92)",
    textShadow: "0 10px 22px rgba(0,0,0,0.55)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
  };
}

function endTxt(_theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.9, fontSize: 13 };
}

/* ✅ MOBILE SAFE OVERLAY + SHEET */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 10,
  zIndex: 9999,
  overscrollBehavior: "contain",
  touchAction: "manipulation",
};

function sheet(theme: any): React.CSSProperties {
  return {
    width: "min(980px, 100%)",
    borderRadius: 18,
    padding: 12,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 10,

    maxHeight: "calc(100dvh - 16px)",
    height: "auto",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",

    position: "relative",
    touchAction: "pan-y",
    backdropFilter: "blur(14px)",
  };
}

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 900,
    outline: "none",
  };
}

function label(_theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.75, fontSize: 12, paddingLeft: 2, marginBottom: 6 };
}

function hint(_theme: any): React.CSSProperties {
  return { opacity: 0.78, fontSize: 12, lineHeight: 1.35 };
}

function resultBox(_theme: any, w: "A" | "B" | "TIE" | null): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    fontWeight: 1100 as any,
    backdropFilter: "blur(10px)",
  };
  if (!w) return base;
  if (w === "TIE") return { ...base, background: "rgba(240,177,42,0.14)" };
  return { ...base, background: "rgba(240,177,42,0.12)" };
}

// Photo
function fileBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1100 as any,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function imgWrap(_theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backdropFilter: "blur(10px)",
  };
}

function imgHint(_theme: any): React.CSSProperties {
  return { opacity: 0.8, fontSize: 12 };
}

const imgClickArea: React.CSSProperties = {
  position: "relative",
  width: "100%",
  borderRadius: 14,
  overflow: "hidden",
  border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
  background: "rgba(0,0,0,0.20)",
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  userSelect: "none",
};

function marker(_theme: any, p: PhotoPoint): React.CSSProperties {
  return {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%, -50%)",
    width: 18,
    height: 18,
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.95)", "--text")}`,
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
    pointerEvents: "none",
  } as React.CSSProperties;
}

function loupeStyle(imgUrl: string, p: PhotoPoint): React.CSSProperties {
  const zoom = 2.8;
  const size = 130;
  const bgSize = `${zoom * 100}% ${zoom * 100}%`;
  const bgPos = `${p.x * 100}% ${p.y * 100}%`;
  return {
    position: "absolute",
    right: 10,
    top: 10,
    width: size,
    height: size,
    borderRadius: 18,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.18)", "--stroke")}`,
    backgroundImage: `url(${imgUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: bgSize,
    backgroundPosition: bgPos,
    boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
    pointerEvents: "none",
  };
}

/* LIVE Radar styles */
function liveWrap(_theme: any): React.CSSProperties {
  return {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.25)", "--glass2"),
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    touchAction: "manipulation",
  };
}

const liveVideo: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: "contrast(1.05) saturate(1.05)",
  pointerEvents: "none",
  userSelect: "none",
};

const radarOverlay: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

function radarSweep(_theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "140%",
    height: "140%",
    transform: "translate(-50%,-50%)",
    borderRadius: "999px",
    background:
      "conic-gradient(from 0deg, rgba(240,177,42,0.0), rgba(240,177,42,0.0), rgba(240,177,42,0.22), rgba(240,177,42,0.0))",
    animation: "dcRadarSpin 1.6s linear infinite",
    filter: "blur(0.2px)",
    mixBlendMode: "screen",
  };
}

function crosshairOuter(_theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 62,
    height: 62,
    transform: "translate(-50%,-50%)",
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.75)", "--text")}`,
    boxShadow: "0 0 0 6px rgba(240,177,42,0.12)",
  };
}

const crosshairInner: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 8,
  height: 8,
  transform: "translate(-50%,-50%)",
  borderRadius: 999,
  background: "rgba(255,255,255,0.95)",
};

function liveMarker(_theme: any, p: PhotoPoint, highlight: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%, -50%)",
    width: 18,
    height: 18,
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.92)", "--text")}`,
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.40)",
    pointerEvents: "none",
  };
  if (!highlight) return base;
  return {
    ...base,
    border: "3px solid rgba(240,177,42,0.95)",
    boxShadow: "0 0 0 8px rgba(240,177,42,0.16), 0 12px 28px rgba(0,0,0,0.45)",
  };
}

function liveCircle(_theme: any, p: PhotoPoint, rNorm: number, highlight: boolean, team: PetanqueTeamId | null): React.CSSProperties {
  const size = Math.max(22, Math.min(180, rNorm * 2 * 900));
  const teamStroke =
    team === "A"
      ? "rgba(0,255,180,0.90)"
      : team === "B"
      ? "rgba(255,120,120,0.90)"
      : "rgba(255,255,255,0.55)";
  const base: React.CSSProperties = {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%,-50%)",
    width: size,
    height: size,
    borderRadius: 999,
    border: `2px solid ${teamStroke}`,
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    pointerEvents: "auto",
    cursor: "pointer",
    backdropFilter: "blur(2px)",
  };
  if (!highlight) return base;
  return {
    ...base,
    border: "3px solid rgba(240,177,42,0.95)",
    boxShadow: "0 0 0 10px rgba(240,177,42,0.16), 0 14px 32px rgba(0,0,0,0.45)",
  };
}

const liveSliderRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

function liveSlider(_theme: any): React.CSSProperties {
  return { width: "100%", accentColor: "var(--gold, rgba(240,177,42,0.95))" as any };
}

/* ✅ Team / Roster styles */
const avatarFallback: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontWeight: 1100 as any,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
};

function miniBtn(theme: any): React.CSSProperties {
  return {
    width: 36,
    height: 32,
    borderRadius: 12,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1100 as any,
    cursor: "pointer",
  };
}

function miniBtnOn(theme: any): React.CSSProperties {
  return {
    ...miniBtn(theme),
    background: "rgba(240,177,42,0.16)",
  };
}

/*
IMPORTANT:
Ajoute l’animation radar une seule fois dans src/index.css :

@keyframes dcRadarSpin {
  from { transform: translate(-50%,-50%) rotate(0deg); }
  to   { transform: translate(-50%,-50%) rotate(360deg); }
}
*/
