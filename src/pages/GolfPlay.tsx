
// === GOLF SCORE DISPLAY (ADD) ===
const GOLF_SCORE_DISPLAY: Record<number, { label: string; color: string }> = {
  [-2]: { label: "DB", color: "#9b5cff" }, // violet
  [-1]: { label: "B",  color: "#ff4fa3" }, // rose
  [0]:  { label: "D",  color: "#ffd34d" }, // OR
  [1]:  { label: "T",  color: "#4dff88" }, // GREEN
  [3]:  { label: "S",  color: "#4da3ff" }, // BLUE
  [5]:  { label: "M",  color: "#ff4d4d" }, // RED
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";
import tickerGolfEagle from "../assets/tickers/ticker_golf_eagle.png";
import tickerGolfBirdie from "../assets/tickers/ticker_golf_birdie.png";
import tickerGolfSimple from "../assets/tickers/ticker_golf_simple.png";
import tickerGolfPar from "../assets/tickers/ticker_golf_par.png";
import tickerGolfBogey from "../assets/tickers/ticker_golf_bogey.png";
import tickerGolfMiss from "../assets/tickers/ticker_golf_miss.png";
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import teamBlueLogo from "../ui_assets/teams/team_blue.png";
import teamGreenLogo from "../ui_assets/teams/team_green.png";
import { playGolfIntro, stopGolfIntro, playGolfTickerSound, playGolfPerfSfx, unlockAudio } from "../lib/sfx";
import { speak, setVoiceEnabled } from "../lib/voice";
import { useLang } from "../contexts/LangContext";

/**
 * GOLF (darts) — Play
 * ✅ Règles OFFICIELLES (Golf darts)
 * - 9 ou 18 trous, ordre Chronologique ou Aléatoire (stable sur la partie)
 * - Jusqu'à 3 fléchettes par joueur et par trou
 * - Le joueur peut s'arrêter à tout moment
 * - La DERNIÈRE fléchette lancée du tour fait le score du trou
 *   • Double = 1   • Triple = 3   • Simple = 4   • Miss (section cible ratée) = 5
 * - Score total le plus bas gagne
 *
 * UX / UI (demandes)
 * - Header profil actif "comme X01PlayV3" (avatar + watermark + mini classement)
 * - Mini-stats sous l'avatar: Darts / Miss / D / T / S
 * - Sous le score: nom du joueur en MAJUSCULES (pas dans un bouton)
 * - Bandeau TROU/CIBLE: uniquement "TROU x/y" à gauche et "CIBLE : n" à droite + ticker parcours au centre
 * - Ticker parcours: aléatoire parmi 32 images, SANS répétition sur une même partie, change à chaque trou
 * - Keypad bas: supprimer titres "SAISIE" + rappel trou/cible (infos déjà au-dessus)
 * - Grille trous pleine largeur : 1–9, et 10–18 en dessous si 18 trous
 */

type AnyFn = (...args: any[]) => any;

// 🔊 Timing sons/voix
const PERF_SFX_DELAY_MS = 1500; // décale le SFX perf après le bruitage arcade
const TTS_AFTER_AUDIO_MS = 2600 + PERF_SFX_DELAY_MS; // laisse passer blip + sfx perf


type Props = {
  setTab?: AnyFn; // setTab("golf_config", {config}) etc.
  go?: AnyFn; // go("golf_config", {config}) etc.
  tabParams?: any; // { config }
  params?: any; // { config } (selon App.tsx)
  store?: any; // profiles store (optionnel)
};

// ---------------- Tickers "parcours" (32) ----------------
// Place tes images dans: src/assets/tickers/golf_parcours/*.png
// Ex: Parcours 1.png ... Parcours 32.png
const PARCOURS_TICKERS = Object.values(
  import.meta.glob("../assets/tickers/golf_parcours/*.png", {
    eager: true,
    import: "default",
  })
) as string[];

// Alias attendu par certaines parties du code (random/no-repeat).
// Fallback sécurité : si aucun ticker "parcours" n'existe, on utilise le ticker du mode.
const GOLF_TICKERS: string[] = PARCOURS_TICKERS.length ? PARCOURS_TICKERS : [tickerGolf];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const INFO_TEXT =
  "GOLF (fléchettes) :\n" +
  "- Chaque trou vise une section (souvent le numéro du trou).\n" +
  "- Jusqu’à 3 flèches par joueur. Tu peux t’arrêter avant.\n" +
  "- La DERNIÈRE flèche lancée du tour fait le score :\n" +
  "  Double=1 • Triple=3 • Simple=4 • Miss=5\n" +
  "- Le score total le plus bas gagne.";


function langToLocale(lang: string | undefined): string {
  const l = (lang ?? "fr").toLowerCase();
  switch (l) {
    case "fr": return "fr-FR";
    case "en": return "en-US";
    case "es": return "es-ES";
    case "de": return "de-DE";
    case "it": return "it-IT";
    case "pt": return "pt-PT";
    case "nl": return "nl-NL";
    case "ru": return "ru-RU";
    case "zh": return "zh-CN";
    case "ja": return "ja-JP";
    case "ar": return "ar-SA";
    case "hi": return "hi-IN";
    case "tr": return "tr-TR";
    case "da": return "da-DK";
    case "no": return "nb-NO";
    case "sv": return "sv-SE";
    case "is": return "is-IS";
    case "pl": return "pl-PL";
    case "ro": return "ro-RO";
    case "sr": return "sr-RS";
    case "hr": return "hr-HR";
    case "cs": return "cs-CZ";
    default:
      return `${l}-${l.toUpperCase()}`;
  }
}

function perfLabelFR(perf: string) {
  switch (perf) {
    case "EAGLE": return "un EAGLE";
    case "BIRDIE": return "un BIRDIE";
    case "PAR": return "un PAR";
    case "BOGEY": return "un BOGEY";
    case "SIMPLE": return "un SIMPLE";
    case "MISS": return "un MISS";
    default: return perf;
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeStr(v: any, fallback = "") {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

function sum(nums: number[]) {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

function getProfilesMap(store: any): Record<string, any> {
  // ultra défensif : selon tes stores
  const profiles =
    store?.profiles ??
    store?.profilesStore?.profiles ??
    store?.profileStore?.profiles ??
    store?.profiles_v7 ??
    [];
  const out: Record<string, any> = {};
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      if (!p?.id) continue;
      out[p.id] = p;
    }
  }
  return out;
}

type GolfConfig = {
  startOrderMode?: "chronological" | "random";
  holes?: number; // 9 ou 18
  holesCount?: number; // alias possible
  selectedIds?: string[]; // ids profils
  teamsEnabled?: boolean;
  teamCount?: 2 | 3 | 4;
  teamAssignments?: Record<string, "gold" | "pink" | "blue" | "green">;
  botsEnabled?: boolean;
  botLevel?: any;
  missStrokes?: number; // configurable: 4..8
  holeOrderMode?: "chronological" | "random"; // config officielle
  order?: "chronological" | "random"; // legacy
  scoringMode?: "strokes" | "rounds"; // config officielle
  showHoleGrid?: boolean; // config officielle
  showGrid?: boolean; // legacy
};


type PlayerStat = {
  darts: number;
  miss: number;
  d: number;
  t: number;
  s: number;
  b: number; // bull
  db: number; // double bull
  turns: number; // nb de tours démarrés
  hit1: number; // réussite à la 1ère flèche (D/T/S)
  hit2: number; // réussite à la 2e flèche
  hit3: number; // réussite à la 3e flèche
};

type HistoryEntry = {
  holeIdx: number;
  playerIdx: number;
  startAt: number;
  turnPos: number;
  teamTurnPos: number;
  teamCursor: [number, number, number, number];
  isFinished: boolean;
  prevScores: (number | null)[][];
  prevTeamScores: (number | null)[][];
  prevTurnThrows: ThrowKind[];
  prevStats: PlayerStat[];
};



type ThrowKind = "DB" | "B" | "D" | "T" | "S" | "M"; // DBull / Bull / Double / Triple / Simple / Miss

function kindToScore(k: ThrowKind, missStrokes: number): number {
  if (k === "DB") return -2; // Eagle
  if (k === "B") return -1; // Birdie
  if (k === "D") return 0; // Par
  if (k === "T") return 1; // Bogey
  if (k === "S") return 3; // Double Bogey
  return missStrokes; // configurable
}

type TeamKey = "gold" | "pink" | "blue" | "green";
const TEAM_KEYS_ALL: TeamKey[] = ["gold", "pink", "blue", "green"];
const TEAM_META: Record<TeamKey, { label: string; color: string; logo: string }> = {
  gold: { label: "TEAM GOLD", color: "#ffcf57", logo: teamGoldLogo },
  pink: { label: "TEAM PINK", color: "#ff7ac8", logo: teamPinkLogo },
  blue: { label: "TEAM BLUE", color: "#6bb7ff", logo: teamBlueLogo },
  green: { label: "TEAM GREEN", color: "#7fe2a9", logo: teamGreenLogo },
};

function getTeamColorByLabel(label?: string): string | null {
  const t = String(label || "").trim().toUpperCase();
  for (const k of TEAM_KEYS_ALL) {
    if (t === TEAM_META[k].label) return TEAM_META[k].color;
  }
  return null;
}


function getTeamLogoByLabel(label?: string): string | null {
  const t = String(label || "").trim().toUpperCase();
  for (const k of TEAM_KEYS_ALL) {
    if (t === TEAM_META[k].label) return TEAM_META[k].logo;
  }
  return null;
}


// ---------------- Carousel joueurs (CLONE style KILLER header carousel) ----------------

function GolfAvatarChip({
  src,
  name,
  total,
  isActive,
  theme,
}: {
  src?: string | null;
  name?: string;
  total: number;
  isActive: boolean;
  theme: string;
}) {
  const initials = String(name || "J")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const isTeam = String(name || "").trim().toUpperCase().startsWith("TEAM ");

  const teamColor = (isTeam ? (getTeamColorByLabel(name) || theme) : theme);

  const neon = isActive
    ? `0 0 0 1px rgba(120,255,220,.22), 0 0 18px rgba(120,255,220,.16), 0 0 42px rgba(120,255,220,.10)`
    : "none";

  return (
    <div
      style={{
        flex: "0 0 auto",
        height: 42,
        borderRadius: 999,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "52px 1fr",
        alignItems: "stretch",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.22)",
        boxShadow: neon,
      }}
      title={name}
    >
      <div style={{ position: "relative", width: 52, height: 42, overflow: "hidden" }}>
        {src ? (
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scale(1.35) translateY(2px)",
              transformOrigin: "center",
              filter: "contrast(1.05) saturate(1.05)",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.06)",
              borderRight: "1px solid rgba(255,255,255,.08)",
              fontWeight: 1000,
              color: "rgba(255,255,255,.8)",
            }}
          >
            {initials}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "0 12px",
          minWidth: 120,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 1000,
              color: isActive ? teamColor : (isTeam ? teamColor : "rgba(255,255,255,.92)"),
              letterSpacing: 0.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 108,
            }}
          >
            {name || "Joueur"}
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 900 }}>Total</div>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 1000,
            color: isTeam ? teamColor : theme,
            letterSpacing: 0.6,
            textShadow: isActive ? `0 0 12px rgba(120,255,220,.16)` : "none",
          }}
        >
          {total}
        </div>
      </div>
    </div>
  );
}

function GolfPlayersCarousel({
  players,
  activeId,
  theme,
}: {
  players: { id: string; name: string; avatar: string | null; total: number }[];
  activeId?: string | null;
  theme: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!activeId) return;
    const wrap = wrapRef.current;
    const el = itemRefs.current[activeId];
    if (!wrap || !el) return;

    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const wrapCenter = wrapRect.left + wrapRect.width / 2;
    const elCenter = elRect.left + elRect.width / 2;

    const delta = elCenter - wrapCenter;
    wrap.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeId, players.length]);

  return (
    <div style={{ padding: "2px 2px 0px", marginTop: 2, marginBottom: 10 }}>
      <div
        ref={wrapRef}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 4,
          paddingTop: 2,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {players.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div key={p.id} ref={(node) => (itemRefs.current[p.id] = node)}>
              <GolfAvatarChip src={p.avatar} name={p.name} total={p.total} isActive={isActive} theme={theme} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Header "Joueur actif" (CLONE feel X01PlayV3) ----------------

const miniCard: React.CSSProperties = {
  boxSizing: "border-box",
  // ✅ Responsive (phone safe): this panel must never overflow the viewport
  width: "clamp(140px, 44vw, 190px)",
  maxWidth: "calc(100vw - 18px)",
  padding: 7,
  borderRadius: 12,
  overflow: "hidden",
  background:
    "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};

const miniText: React.CSSProperties = {
  // font scales down on phone
  fontSize: "clamp(10px, 2.6vw, 12px)",
  color: "#d9dbe3",
  lineHeight: 1.25,
};

const miniRankRow: React.CSSProperties = {
  // ✅ score column is fixed, name truncates — prevents overflow
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  overflow: "hidden",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: "clamp(9px, 2.3vw, 10px)",
  lineHeight: 1.15,
};

const miniRankName: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "inherit",
  color: "#ffcf57",
  letterSpacing: 0.2,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const miniRankScore: React.CSSProperties = {
  flex: "0 0 auto",
  minWidth: 28,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontSize: "clamp(9px, 2.3vw, 10px)",
  fontWeight: 900,
  color: "#ffcf57",
};

const miniRankScoreFini: React.CSSProperties = {
  flex: "0 0 auto",
  minWidth: 28,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontSize: "clamp(9px, 2.3vw, 10px)",
  fontWeight: 900,
  color: "#7fe2a9",
};

const avatarMedallion: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "50%",
  overflow: "hidden",
  background: "linear-gradient(180deg,#1b1b1f,#111114)",
  boxShadow: "0 10px 28px rgba(0,0,0,.42)",
  border: "2px solid rgba(120,255,220,.70)",
  outline: "4px solid rgba(0,0,0,.35)",
};

const tinyAvatar: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.16)",
  background: "rgba(0,0,0,.35)",
  flex: "0 0 auto",
  marginRight: 6,
};

function GolfHeaderBlock(props: {

  currentPlayer: { id: string; name: string; avatar: string | null } | null;
  currentAvatar: string | null;
  currentTotal: number;
  currentStats: PlayerStat;
  liveRanking: { id: string; name: string; score: number; avatar: string | null }[];
  isFinished: boolean;
  teamBadge?: { label: string; color: string } | null;
  perfOverlay?: PerfKey | null;
}) {
  const { currentPlayer, currentAvatar, currentTotal, currentStats, liveRanking, isFinished, teamBadge, perfOverlay } = props;

  // ✅ Défilement auto mini-stats : S/D/T/M puis B/DB/T/M (toutes ~6.5s)
  const [showBullStats, setShowBullStats] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setShowBullStats((v) => !v), 6500);
    return () => window.clearInterval(id);
  }, []);

  const bgAvatarUrl = (teamBadge?.label ? getTeamLogoByLabel(teamBadge.label) : null) || currentAvatar || null;
  const playerName = (currentPlayer?.name ?? "—").toUpperCase();

  const turns = Math.max(1, currentStats.turns || 0);
  const pct = (n: number, d: number) => {
    if (d <= 0) return 0;
    return Math.round((n / d) * 100);
  };
  const p1 = pct(currentStats.hit1 || 0, turns);
  const p2 = pct(currentStats.hit2 || 0, turns);
  const p3 = pct(currentStats.hit3 || 0, turns);
  const pMiss = pct(currentStats.miss || 0, currentStats.darts || 0);

  const accent = teamBadge?.color ?? "#ffcf57";
  const medSize = teamBadge ? 84 : 96;
  const medallionStyle: React.CSSProperties = {
    ...avatarMedallion,
    width: medSize,
    height: medSize,
    border: `2px solid ${accent}B3`,
    boxShadow: `0 10px 28px rgba(0,0,0,.42), 0 0 18px ${accent}33`,
  };

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Watermark avatar — cadré sur la zone SCORE (droite), plein hauteur header */}
      {!!bgAvatarUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          <img
            src={bgAvatarUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: "-18%",
              width: "78%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 40%",
              transform: "scale(1.12)",
              opacity: 0.22,
              filter: "saturate(1.35) contrast(1.18) brightness(1.05)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 34%, rgba(10,10,12,.55) 60%, rgba(10,10,12,.18) 76%, rgba(10,10,12,0) 90%)",
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 10,
          alignItems: teamBadge ? "start" : "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* AVATAR + MINI STATS (demandées) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={medallionStyle}>
            {currentAvatar ? (
              <img src={currentAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", color: "#999", fontWeight: 800 }}>
                ?
              </div>
            )}
          </div>

          {/* Mini card stats joueur actif: Darts / Miss / D / T / S */}
          <div style={{ ...miniCard, width: 176, maxWidth: 176, boxSizing: "border-box" }}>
            <div style={{ ...miniText, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ opacity: 0.9 }}>Darts</span>
                <span style={{ minWidth: 34, textAlign: "center", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.14)", color: "#b9ffe9", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{currentStats.darts}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                <div
                  style={{
                    borderRadius: 10,
                    padding: "6px 0",
                    textAlign: "center",
                    border: showBullStats ? "1px solid rgba(255,120,220,0.45)" : "1px solid rgba(70,160,255,0.45)",
                    background: showBullStats ? "rgba(160,35,115,0.22)" : "rgba(20,85,185,0.22)",
                    boxShadow: showBullStats ? "0 0 18px rgba(255,120,220,0.14)" : "0 0 18px rgba(70,160,255,0.16)",
                    fontWeight: 1000,
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.92, color: showBullStats ? "#ffb3ec" : "#bfeaff" }}>{showBullStats ? "B" : "S"}</div>
                  <div style={{ fontSize: 14, color: showBullStats ? "#ffb3ec" : "#bfeaff" }}>{showBullStats ? currentStats.b : currentStats.s}</div>
                </div>
                <div
                  style={{
                    borderRadius: 10,
                    padding: "6px 0",
                    textAlign: "center",
                    border: showBullStats ? "1px solid rgba(170,120,255,0.35)" : "1px solid rgba(255,195,26,0.35)",
                    background: showBullStats ? "rgba(120,70,185,0.18)" : "rgba(255,195,26,0.16)",
                    fontWeight: 1000,
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.9, color: showBullStats ? "#e1ccff" : "#ffcf57" }}>{showBullStats ? "DB" : "D"}</div>
                  <div style={{ fontSize: 14, color: showBullStats ? "#e1ccff" : "#ffcf57" }}>{showBullStats ? currentStats.db : currentStats.d}</div>
                </div>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(120,255,220,0.35)", background: "rgba(40,120,90,0.22)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.9, color: "#b9ffe9" }}>T</div>
                  <div style={{ fontSize: 14, color: "#b9ffe9" }}>{currentStats.t}</div>
                </div>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(255,120,120,0.35)", background: "rgba(120,40,40,0.22)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.9, color: "#ffb2b2" }}>M</div>
                  <div style={{ fontSize: 14, color: "#ffb2b2" }}>{currentStats.miss}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, opacity: 0.98 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%1st</span>
                  <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(255,195,26,.35)", background: "rgba(255,195,26,.14)", color: "#ffcf57", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%2nd</span>
                  <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.12)", color: "#b9ffe9", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p2}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%3rd</span>
                  <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.30)", background: "rgba(120,255,220,.09)", color: "rgba(185,255,233,0.92)", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p3}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%miss</span>
                  <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(255,120,120,.35)", background: "rgba(255,120,120,.10)", color: "#ffb2b2", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{pMiss}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCORE + NOM + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            position: "relative",
            overflow: "hidden",
            borderRadius: 14,
            padding: 6,
          }}
        >
{teamBadge ? (
  <div
    style={{
      display: "inline-flex",
      alignSelf: "center",
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${teamBadge.color}55`,
      background: `${teamBadge.color}22`,
      color: teamBadge.color,
      fontWeight: 1000,
      letterSpacing: 0.6,
      fontSize: 12,
      textTransform: "uppercase",
      boxShadow: "0 10px 20px rgba(0,0,0,.28)",
    }}
  >
    {teamBadge.label}
  </div>
) : null}



          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              position: "relative",
              zIndex: 2,
              color: accent,
              textShadow: `0 4px 18px ${accent}33`,
              lineHeight: 1.02,
            }}
          >
            {currentTotal}
          </div>

          {/* Nom en MAJUSCULES (pas un bouton) */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              fontWeight: 950,
              letterSpacing: 1.2,
              fontSize: 14,
              color: accent,
              opacity: 0.95,
              textTransform: "uppercase",
            }}
            title={currentPlayer?.name ?? ""}
          >
            {playerName}
          </div>

          {/* Mini ranking */}
          <div style={{ ...miniCard, margin: "0 auto", height: "auto", width: "clamp(132px, 42vw, 176px)", maxWidth: "calc(100vw - 18px)" }}>
            <div style={{ fontSize: 11, color: "#d9dbe3", marginBottom: 4, textAlign: "left", paddingLeft: 2, opacity: 0.9 }}>
              Classement
            </div>

            <div style={{ padding: "0 2px 2px 2px", maxHeight: 96, overflowY: "auto", overscrollBehavior: "contain" }}>
              {liveRanking.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    ...miniRankRow,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    columnGap: 8,
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                    <span style={tinyAvatar}>
                      {r.avatar ? (
                        <img src={r.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                    </span>
                    <span style={{ ...miniRankName, color: getTeamColorByLabel(r.name) ?? miniRankName.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i + 1}. {r.name}
                    </span>
                  </div>

                  <span
                    style={{
                      ...(isFinished ? miniRankScoreFini : miniRankScore),
                      justifySelf: "end",
                      minWidth: 26,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {r.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GolfPlay(props: Props) {
  const { setTab, go, tabParams, params, store } = props;

  // Compat routing : certains écrans passent via params, d'autres via tabParams
  const routeParams = (params ?? tabParams ?? {}) as any;
  const { lang } = useLang();
  const ttsLang = useMemo(() => langToLocale(lang), [lang]);
  const cfg: GolfConfig = (routeParams?.config ?? {}) as GolfConfig;

  // Throws du tour (jusqu'à 3) : on garde uniquement le TYPE, le score final est celui de la DERNIÈRE
  const [turnThrows, setTurnThrows] = useState<ThrowKind[]>([]);



  // 🎵 Musique d'intro (à l'entrée du jeu)
  useEffect(() => {
    try {
      setVoiceEnabled(true);
      playGolfIntro(0.45);
      return () => {
        try { stopGolfIntro(); } catch {}
        try {
          if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
          if (ttsRankTimerRef.current) window.clearTimeout(ttsRankTimerRef.current);
        } catch {}
      };
    } catch {
      return;
    }
  }, []);

  const roundsMode =
  (cfg as any).scoringMode === "rounds" ||
  (cfg as any).display === "rounds" ||
  (cfg as any).scoreMode === "rounds" ||
  (cfg as any).format === "rounds" ||
  (cfg as any).rounds === true;

const holes = clamp(Number((cfg as any).holes ?? (cfg as any).holesCount ?? 9), 1, 18);
const showGrid = ((cfg as any).showHoleGrid ?? (cfg as any).showGrid ?? true) !== false;
const teamsEnabled = !!(cfg as any).teamsEnabled;
const missStrokesVal = clamp(Number((cfg as any).missStrokes ?? 5), 4, 8);

const startOrderRaw =
  (cfg as any).startOrderMode ??
  (cfg as any).startOrder ??
  (cfg as any).startOrderPlayers ??
  (cfg as any).startOrderTeams ??
  (cfg as any).randomStart ??
  null;

const startOrderNorm = String(startOrderRaw ?? "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const startRandom =
  startOrderRaw === true ||
  startOrderNorm.includes("alea") ||
  startOrderNorm.includes("random") ||
  startOrderNorm.includes("shuffle");

  const profilesById = useMemo(() => getProfilesMap(store), [store]);

  // roster : si config a selectedIds, on construit un roster avec noms/avatars
  const roster = useMemo(() => {
    const ids: string[] = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
    if (ids.length) {
      return ids.map((id, i) => {
        const p = profilesById[id];
        return {
          id,
          name: safeStr(p?.name, `Joueur ${i + 1}`),
          avatar: p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoUrl ?? null,
        };
      });
    }
    return [
      { id: "p1", name: "Joueur 1", avatar: null },
      { id: "p2", name: "Joueur 2", avatar: null },
    ];
  }, [cfg.selectedIds, profilesById]);

  // Alias compat : ancien code attendait `players`
  const players = roster;

  const playersCount = roster.length || 2;

// Teams: jusqu'à 4 équipes (Gold / Pink / Blue / Green)
const teamCountRaw = Number((cfg as any).teamCount ?? 2);
const teamCount = (teamCountRaw === 3 ? 3 : teamCountRaw >= 4 ? 4 : 2) as 2 | 3 | 4;

const enabledTeamKeys = useMemo<TeamKey[]>(() => {
  if (!teamsEnabled) return [];
  return TEAM_KEYS_ALL.slice(0, teamCount);
}, [teamsEnabled, teamCount]);

const teamAssignmentsRaw = ((cfg as any).teamAssignments ?? {}) as Record<string, TeamKey>;

const teamMembersIdxs = useMemo(() => {
  const out: Record<TeamKey, number[]> = { gold: [], pink: [], blue: [], green: [] };
  if (!teamsEnabled) return out;

  // auto-assign fallback (round-robin) pour tout joueur non assigné / invalide
  let rr = 0;
  const denom = Math.max(1, enabledTeamKeys.length);
  for (let i = 0; i < roster.length; i++) {
    const pid = roster[i]?.id;
    const assigned = pid ? teamAssignmentsRaw[pid] : undefined;
    const valid = assigned && enabledTeamKeys.includes(assigned);
    const key = (valid ? assigned : enabledTeamKeys[rr % denom]) as TeamKey;
    rr++;
    out[key].push(i);
  }
  return out;
}, [teamsEnabled, roster, enabledTeamKeys, teamAssignmentsRaw]);

const activeTeamKeys = useMemo(() => {
  if (!teamsEnabled) return [] as TeamKey[];
  return enabledTeamKeys.filter((k) => (teamMembersIdxs[k]?.length ?? 0) > 0);
}, [teamsEnabled, enabledTeamKeys, teamMembersIdxs]);

const teamsOk = teamsEnabled && activeTeamKeys.length >= 2;

const teamIndexByKey = useMemo(() => {
  const m: Record<string, number> = {};
  enabledTeamKeys.forEach((k, idx) => (m[k] = idx));
  return m as Record<TeamKey, number>;
}, [enabledTeamKeys]);



  // Ordre des cibles (stable) : chronologique ou random
  const holeTargets = useMemo(() => {
    const base = Array.from({ length: holes }, (_, i) => i + 1);

    // Normalisation ultra-defensive: la config peut stocker "aleatoire", "random", boolean, etc.
    // ✅ on supporte explicitement holeOrderMode (clé utilisée côté config)
    const raw =
      (cfg as any).holeOrderMode ??
      (cfg as any).order ??
      (cfg as any).targetOrder ??
      (cfg as any).holesOrder ??
      (cfg as any).sequence ??
      (cfg as any).randomOrder ??
      (cfg as any).isRandom ??
      null;

    const rawNorm = String(raw ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // enlève les accents

    const isRandom =
      raw === true ||
      rawNorm.includes("alea") ||
      rawNorm.includes("random") ||
      rawNorm.includes("shuffle");

    if (!isRandom) return base;

    // Shuffle stable sur la partie.
    const out = shuffle(base);

    // ✅ UX: éviter que la 1ère cible soit systématiquement "1" (donne l'impression que le mode aléatoire ne marche pas)
    if (out.length > 1 && out[0] === 1) {
      const j = out.findIndex((v) => v !== 1);
      if (j > 0) {
        const tmp = out[0];
        out[0] = out[j];
        out[j] = tmp;
      }
    }

    return out;
  }, [holes, cfg]);
  // scores[playerIdx][holeIdx] = score final du trou (1/3/4/5) ou null
  const [scores, setScores] = useState<(number | null)[][]>(() => {
    const s: (number | null)[][] = [];
    for (let p = 0; p < playersCount; p++) s.push(Array.from({ length: holes }, () => null));
    return s;
  });

  // Scores par équipe (GOLD/PINK/BLUE/GREEN) — 4 slots fixes (les équipes actives dépendent de teamCount + assignements)
  const [teamScores, setTeamScores] = useState<(number | null)[][]>(() => {
    return TEAM_KEYS_ALL.map(() => Array.from({ length: holes }, () => null));
  });

  // === HAS PLAYED AT LEAST ONE HOLE (for history save gating) ===
  // ✅ true si au moins un score non-null a été saisi (joueurs ou équipes)
  const hasPlayedAtLeastOneHole = React.useMemo(() => {
    const anyNonNull = (mat: (number | null)[][]) => mat.some((row) => row.some((v) => v !== null));
    return teamsOk ? anyNonNull(teamScores) : anyNonNull(scores);
  }, [teamsOk, scores, teamScores]);

	  const [statsByPlayer, setStatsByPlayer] = useState<PlayerStat[]>(() =>
	    Array.from({ length: playersCount }, () => ({ darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 }))
	  );

  const [holeIdx, setHoleIdx] = useState(0);

  // Non-teams
  const [playerIdx, setPlayerIdx] = useState(0);

  // Ordre de départ (joueurs) : on garde un ordre circulaire stable sur toute la partie
  const [startAt, setStartAt] = useState(0); // index de départ dans la liste roster


  const playerOrder = useMemo(() => {
    const base = Array.from({ length: playersCount }, (_, i) => i);
    if (!startRandom || playersCount <= 1) return base;
    const s = ((startAt % playersCount) + playersCount) % playersCount;
    return base.slice(s).concat(base.slice(0, s));
  }, [playersCount, startRandom, startAt]);
  const [turnPos, setTurnPos] = useState(0); // position courante dans l'ordre de jeu (0..playersCount-1)

  // Teams : alternance équipe->équipe et rotation des joueurs dans chaque équipe
  const [teamTurnPos, setTeamTurnPos] = useState(0); // index dans activeTeamKeys
  const [teamCursor, setTeamCursor] = useState<[number, number, number, number]>([0, 0, 0, 0]); // cursor par TEAM_KEYS_ALL
  const [isFinished, setIsFinished] = useState(false);

  // ✅ Ordre de départ (joueur/équipe) — stable sur la partie
  const initStartOrderRef = useRef(false);
  useEffect(() => {
    if (initStartOrderRef.current) return;
    initStartOrderRef.current = true;

    if (!startRandom) return;

    if (teamsOk) {
      const n = activeTeamKeys.length;
      if (n > 1) setTeamTurnPos(Math.floor(Math.random() * n));
      return;
    }

    // Non-teams: ordre circulaire aléatoire (stable sur la partie)
    if (playersCount > 1) {
      const start = Math.floor(Math.random() * playersCount);
      setStartAt(start);
      setTurnPos(0);
      setPlayerIdx(start);
    }
  }, [startRandom, teamsOk, activeTeamKeys.length, playersCount]);

  // "Tableau des scores" : carte compacte + popup (tables 1–9 et 10–18 empilées)
  const [showScoresModal, setShowScoresModal] = useState(false);
  // ✅ Fin de match: tableau récapitulatif (modal)
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const endMatchModalOnceRef = useRef(false);

  // ✅ À la fin du match : ouvrir automatiquement le tableau de fin (comme X01)
  useEffect(() => {
    if (!isFinished) return;
    if (endMatchModalOnceRef.current) return;
    endMatchModalOnceRef.current = true;
    setShowEndMatchModal(true);
  }, [isFinished]);
  const scoreTickerPoolRef = useRef<string[]>([]);
  const [scoreCardTickerSrc, setScoreCardTickerSrc] = useState<string>(() => {
    scoreTickerPoolRef.current = shuffle(GOLF_TICKERS);
    return scoreTickerPoolRef.current[0] ?? tickerGolf;
  });

  // Throws du tour (jusqu'à 3) : on garde uniquement le TYPE, le score final est celui de la DERNIÈRE

  // ✅ Ticker performance (EAGLE/BIRDIE/PAR/BOGEY/MISS) + SFX associé
  type PerfKey = "EAGLE" | "BIRDIE" | "PAR" | "BOGEY" | "SIMPLE" | "MISS";
  const [perfOverlay, setPerfOverlay] = useState<PerfKey | null>(null);
  const perfTimerRef = useRef<number | null>(null);
  const lastPerfRef = useRef<PerfKey | null>(null);

  // 🔊 Sert à retarder la voix jusqu'à la fin des sons en cours
  const audioBusyUntilRef = useRef<number>(0);

  const lastActorNameRef = useRef<string>("");
  const ttsTimerRef = useRef<number | null>(null);
  const ttsRankTimerRef = useRef<number | null>(null);
  const lastTtsVariantRef = useRef<number>(-1);
  const lastHoleIdxRef = useRef<number>(-1);
  const initialTurnSpokenRef = useRef(false);

  // 🔊 Petit "blip" arcade à l'apparition du ticker perf (sans asset)
  function playTickerBlip() {
    try {
      if (typeof window === "undefined") return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime;
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      osc.stop(t0 + 0.085);
      osc.onended = () => {
        try { ctx.close(); } catch {}
      };
    } catch {
      // ignore
    }
  }

  function triggerPerf(perf: PerfKey) {
    try {
      if (perfTimerRef.current) window.clearTimeout(perfTimerRef.current);
      setPerfOverlay(perf);      // 🔊 SFX + petit blip arcade + bruitage ticker (immédiat)
      playTickerBlip();
      try { playGolfTickerSound(perf as any); } catch {}

      // marque la fenêtre audio occupée (blip + ticker + sfx perf)
      audioBusyUntilRef.current = Date.now() + TTS_AFTER_AUDIO_MS + 200;

      // 🔓 unlock mobile + 🔊 SFX perf (décalé de 1.5s pour laisser respirer le blip)
      try { unlockAudio(); } catch {}
      window.setTimeout(() => {
        try { playGolfPerfSfx(perf as any, 0.9); } catch {}
      }, PERF_SFX_DELAY_MS);

      perfTimerRef.current = window.setTimeout(() => setPerfOverlay(null), 1600);
    } catch {}
  }

  function kindToPerf(k: ThrowKind): PerfKey {
    if (k === "DB") return "EAGLE";
    if (k === "B") return "BIRDIE";
    if (k === "D") return "PAR";
    if (k === "T") return "BOGEY";
    if (k === "S") return "SIMPLE";
    return "MISS";
  }

  function pickVariant(max: number) {
    if (max <= 1) return 0;
    let i = Math.floor(Math.random() * max);
    if (i === lastTtsVariantRef.current) i = (i + 1) % max;
    lastTtsVariantRef.current = i;
    return i;
  }

  function buildCombinedTts(opts: { actor?: string; perf?: PerfKey; nextPlayer?: string; isNewHole?: boolean }) {
    const actor = (opts.actor ?? "").trim();
    const next = (opts.nextPlayer ?? "").trim();
    const perf = opts.perf ?? null;

    if (lang === "fr") {
      const perfTxt = perf ? perfLabelFR(perf) : "";
      const isHole = !!opts.isNewHole;

      const templates = [
        (a: string, p: string, n: string) => `${a} a réalisé ${p}. ${isHole ? `Nouveau trou. ` : ""}${n}, à toi de jouer.`,
        (a: string, p: string, n: string) => `${p}, pour ${a}. ${isHole ? `On passe au trou suivant. ` : ""}${n}, à toi.`,
        (a: string, p: string, n: string) => `Action validée : ${a}, ${p}. ${isHole ? `Nouveau trou. ` : ""}${n}, c'est à toi.`,
      ];

      if (actor && perfTxt && next) {
        const idx = pickVariant(templates.length);
        return templates[idx](actor, perfTxt, next);
      }
      if (next) {
        return `${isHole ? "Nouveau trou. " : ""}${next}, à toi de jouer.`;
      }
      return "";
    }

    // EN + fallback (simple)
    const perfTxt = perf ? String(perf).toLowerCase() : "";
    const templatesEn = [
      (a: string, p: string, n: string) => `${a} scored ${p}. ${opts.isNewHole ? "New hole. " : ""}${n}, your turn.`,
      (a: string, p: string, n: string) => `${p} for ${a}. ${opts.isNewHole ? "Next hole. " : ""}${n}, you're up.`,
    ];
    if (actor && perfTxt && next) {
      const idx = pickVariant(templatesEn.length);
      return templatesEn[idx](actor, perfTxt, next);
    }
    if (next) return `${opts.isNewHole ? "New hole. " : ""}${next}, your turn.`;
    return "";
  }

  
  function buildRankingTts(kind: "intermediate" | "final") {
    const top = ranking.slice(0, 3).map((r) => safeStr(r.name)).filter(Boolean);
    if (top.length === 0) return "";
    const a = top[0] ?? "";
    const b = top[1] ?? "";
    const c = top[2] ?? "";

    if (lang === "fr") {
      const head = kind === "final" ? "Classement final." : "Classement intermédiaire.";
      // ✅ Format strict demandé: Head + 1er/2e/3e noms uniquement
      if (a && b && c) return `${head} Premier ${a}. Deuxième ${b}. Troisième ${c}.`;
      if (a && b) return `${head} Premier ${a}. Deuxième ${b}.`;
      return `${head} Premier ${a}.`;
    }

    const head = kind === "final" ? "Final ranking." : "Intermediate ranking.";
    if (a && b && c) return `${head} First ${a}. Second ${b}. Third ${c}.`;
    if (a && b) return `${head} First ${a}. Second ${b}.`;
    return `${head} First ${a}.`;
  }


// Ticker "parcours" : aléatoire sans répétition sur une même partie, change à chaque trou
  const tickerList = (PARCOURS_TICKERS.length ? PARCOURS_TICKERS : [tickerGolf]).slice();
  const tickerPoolRef = useRef<string[]>([]);
  const [holeTickerSrc, setHoleTickerSrc] = useState<string>(() => {
    tickerPoolRef.current = shuffle(tickerList);
    return tickerPoolRef.current[0] ?? tickerGolf;
  });

  useEffect(() => {
    // à chaque trou: prend l'index correspondant dans le pool (sans répétition)
    const pool = tickerPoolRef.current;
    const next = pool[holeIdx] ?? pool[pool.length - 1] ?? tickerGolf;
    setHoleTickerSrc(next);
  }, [holeIdx]);

  // Ticker de la carte "TABLEAU DES SCORES" : défilement auto (sans répétition immédiate)
  useEffect(() => {
    if (!showGrid) return;
    const id = window.setInterval(() => {
      const pool = scoreTickerPoolRef.current;
      let nextPool = pool.slice(1);
      if (nextPool.length === 0) {
        nextPool = shuffle(GOLF_TICKERS);
        // évite de reprendre immédiatement la même image
        if (nextPool[0] === scoreCardTickerSrc && nextPool.length > 1) {
          const tmp = nextPool[0];
          nextPool[0] = nextPool[1];
          nextPool[1] = tmp;
        }
      }
      scoreTickerPoolRef.current = nextPool;
      setScoreCardTickerSrc(nextPool[0] ?? tickerGolf);
    }, 6000);
    return () => window.clearInterval(id);
  }, [showGrid, scoreCardTickerSrc]);

  const historyRef = useRef<HistoryEntry[]>([]);

  const playerTotals = useMemo(() => scores.map((row) => sum(row.map((v) => (typeof v === "number" ? v : 0)))), [scores]);
const teamTotals = useMemo(() => teamScores.map((row) => sum(row.map((v) => (typeof v === "number" ? v : 0)))), [teamScores]);

const HIT_ORDER: Array<"DBULL" | "BULL" | "D" | "T" | "S" | "M"> = ["DBULL", "BULL", "D", "T", "S", "M"];

function bestHitFromStat(s: any): "DBULL" | "BULL" | "D" | "T" | "S" | "M" {
  const db = Number(s?.db ?? 0);
  const b = Number(s?.b ?? 0);
  const d = Number(s?.d ?? 0);
  const t = Number(s?.t ?? 0);
  const si = Number(s?.s ?? 0);
  if (db > 0) return "DBULL";
  if (b > 0) return "BULL";
  if (d > 0) return "D";
  if (t > 0) return "T";
  if (si > 0) return "S";
  return "M";
}

function hitRank(hit: string): number {
  const idx = HIT_ORDER.indexOf(hit as any);
  return idx == -1 ? HIT_ORDER.length : idx;
}

function pct(n: number, d: number): number {
  if (!d || d <= 0) return 0;
  return n / d;
}

function rankCompare(a: any, b: any): number {
  // 1) plus petit score
  if (a.total !== b.total) return a.total - b.total;

  // 2) meilleur hit (DBULL > BULL > D > T > S > M)
  const ha = hitRank(a.bestHit);
  const hb = hitRank(b.bestHit);
  if (ha !== hb) return ha - hb;

  // 3) moins de fléchettes jouées
  if (a.darts !== b.darts) return a.darts - b.darts;

  // 4) %1st / %2nd / %3rd (du meilleur au moins bon)
  if (a.p1 !== b.p1) return b.p1 - a.p1;
  if (a.p2 !== b.p2) return b.p2 - a.p2;
  if (a.p3 !== b.p3) return b.p3 - a.p3;

  return 0;
}

const ranking = useMemo(() => {
  if (teamsOk) {
    const arr = enabledTeamKeys
      .filter((k) => (teamMembersIdxs[k]?.length ?? 0) > 0)
      .map((k) => {
        const idx = teamIndexByKey[k] ?? 0;
        const members = teamMembersIdxs[k] ?? [];

        // agrégation stats team (somme)
        const agg = members.reduce(
          (acc: any, pi: number) => {
            const s = statsByPlayer[pi] ?? { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 };
            acc.darts += Number(s.darts ?? 0);
            acc.miss += Number(s.miss ?? 0);
            acc.d += Number(s.d ?? 0);
            acc.t += Number(s.t ?? 0);
            acc.s += Number(s.s ?? 0);
            acc.b += Number(s.b ?? 0);
            acc.db += Number(s.db ?? 0);
            acc.turns += Number(s.turns ?? 0);
            acc.hit1 += Number(s.hit1 ?? 0);
            acc.hit2 += Number(s.hit2 ?? 0);
            acc.hit3 += Number(s.hit3 ?? 0);
            return acc;
          },
          { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 }
        );

        const bestHit = bestHitFromStat(agg);
        const turns = Number(agg.turns ?? 0);

        return {
          idx,
          id: `team_${k}`,
          name: TEAM_META[k].label,
          avatar: TEAM_META[k].logo,
          total: teamTotals[idx] ?? 0,
          color: TEAM_META[k].color,
          bestHit,
          darts: Number(agg.darts ?? 0),
          p1: pct(Number(agg.hit1 ?? 0), turns),
          p2: pct(Number(agg.hit2 ?? 0), turns),
          p3: pct(Number(agg.hit3 ?? 0), turns),
        };
      });

    arr.sort(rankCompare);
    return arr;
  }

  const arr = roster.map((p, idx) => {
    const s = statsByPlayer[idx] ?? { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 };
    const bestHit = bestHitFromStat(s);
    const turns = Number(s.turns ?? 0);

    return {
      idx,
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      total: playerTotals[idx] ?? 0,
      bestHit,
      darts: Number(s.darts ?? 0),
      p1: pct(Number(s.hit1 ?? 0), turns),
      p2: pct(Number(s.hit2 ?? 0), turns),
      p3: pct(Number(s.hit3 ?? 0), turns),
    };
  });

  arr.sort(rankCompare);
  return arr;
}, [roster, playerTotals, teamsOk, teamTotals, enabledTeamKeys, teamMembersIdxs, teamIndexByKey, statsByPlayer]);

  // ✅ TTS classement provisoire : géré via advanceAfterFinalize() (désactivé ici)

  // ✅ TTS classement final : géré via advanceAfterFinalize() (désactivé ici)

  // ✅ TTS: annonce du premier joueur au début de partie
  useEffect(() => {
    if (initialTurnSpokenRef.current) return;
    if (playersCount <= 0) return;

    try {
      const p = players[activePlayerIdx];
      const name = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
      if (!name) return;
      initialTurnSpokenRef.current = true;
      window.setTimeout(
        () => speak(lang === "fr" ? `${name}, à toi de jouer.` : `${name}, your turn.`, { lang: ttsLang }),
        700
      );
    } catch {
      // ignore
    }
  }, [playersCount, playerIdx, lang, ttsLang]);





  const activeTeamKey: TeamKey | null = teamsOk ? (activeTeamKeys[teamTurnPos] ?? null) : null;
useEffect(() => {
  if (!teamsOk) return;
  setTeamTurnPos((p) => {
    const max = Math.max(0, activeTeamKeys.length - 1);
    return p > max ? 0 : p;
  });
}, [teamsOk, activeTeamKeys.length]);


const activePlayerIdx = !teamsOk
  ? playerIdx
  : (() => {
      const k = activeTeamKey;
      if (!k) return playerIdx;
      const ids = teamMembersIdxs[k] ?? [];
      const keyIndex = TEAM_KEYS_ALL.indexOf(k);
      const cur = teamCursor[keyIndex] ?? 0;
      if (!ids.length) return playerIdx;
      return ids[cur % ids.length];
    })();

const activePlayer = !isFinished ? roster[activePlayerIdx] : null;
const activeAvatar = activePlayer?.avatar ?? null;
const activeTotal = !isFinished ? (teamsOk && activeTeamKey ? (teamTotals[teamIndexByKey[activeTeamKey] ?? 0] ?? 0) : (playerTotals[activePlayerIdx] ?? 0)) : 0;
const activeStats =
  !isFinished
    ? statsByPlayer[activePlayerIdx] ??
      { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 }
    : { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 };


  const target = holeTargets[holeIdx] ?? (holeIdx + 1);

  function goBack() {
    const payload = { config: cfg };
    if (typeof setTab === "function") return setTab("golf_config", payload);
    if (typeof go === "function") return go("golf_config", payload);
  }

  function pushHistory(
  prevScores: (number | null)[][],
  prevTeamScores: (number | null)[][],
  prevTurn: ThrowKind[],
  prevStats: PlayerStat[]
) {
  historyRef.current.push({
    holeIdx,
    playerIdx,
    teamTurnPos,
    teamCursor,
    isFinished,
    prevScores: prevScores.map((r) => r.slice()),
    prevTeamScores: prevTeamScores.map((r) => r.slice()),
    prevTurnThrows: prevTurn.slice(),
    prevStats: prevStats.map((s) => ({ ...s })),
  });
  if (historyRef.current.length > 200) historyRef.current.shift();
}

  function advanceAfterFinalize() {
  // ✅ ticker + son sur validation (au moment où l'on passe au joueur suivant)
  const validatedPerf = lastPerfRef.current;
  if (validatedPerf) {
    triggerPerf(validatedPerf);
    lastPerfRef.current = null;
  }
  if (!teamsOk) {
    // Ordre joueurs: on avance dans playerOrder, et on ne change de trou qu'après que TOUT le monde a joué
    const nextPos = turnPos + 1;
    if (nextPos < playersCount) {
      const nextPlayerIndex = playerOrder[nextPos] ?? playerIdx;
      setTurnPos(nextPos);
      setPlayerIdx(nextPlayerIndex);
      setTurnThrows([]);

      // ✅ TTS: annonce du joueur suivant (toujours) — après SFX/ticker
      try {
        if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
        const p = players[nextPlayerIndex];
        const nextName = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
        if (nextName) {
          const delay = Math.max(TTS_AFTER_AUDIO_MS, audioBusyUntilRef.current - Date.now() + 80);
          // après blip + SFX perf
          ttsTimerRef.current = window.setTimeout(
            () => speak(lang === "fr" ? `À toi de jouer, ${nextName}.` : `${nextName}, your turn.`, { lang: ttsLang }),
            delay
          );
        }
      } catch {
        // ignore
      }


      return;
    }

    const nextHole = holeIdx + 1;
    if (nextHole < holes) {
      const nextPlayerIndex = playerOrder[0] ?? 0;
      setHoleIdx(nextHole);
      setTurnPos(0);
      setPlayerIdx(nextPlayerIndex);
      setTurnThrows([]);

      // ✅ TTS: annonce du joueur suivant (toujours) — après SFX/ticker (nouveau trou)
      try {
        if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
        const p = players[nextPlayerIndex];
        const nextName = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
        if (nextName) {
          const delay = Math.max(TTS_AFTER_AUDIO_MS, audioBusyUntilRef.current - Date.now() + 80);
          ttsTimerRef.current = window.setTimeout(
            () => speak(lang === "fr" ? `À toi de jouer, ${nextName}.` : `${nextName}, your turn.`, { lang: ttsLang }),
            delay
          );
        }
      } catch {
        // ignore
      }

      // ✅ TTS classement intermédiaire (format strict), après la phrase "à toi de jouer"
      try {
        if (ttsRankTimerRef.current) window.clearTimeout(ttsRankTimerRef.current);
        const msgRank = buildRankingTts("intermediate");
        if (msgRank) {
          ttsRankTimerRef.current = window.setTimeout(() => speak(msgRank, { lang: ttsLang }), 5200);
        }
      } catch {
        // ignore
      }
    } else {
            setIsFinished(true);
      setTurnThrows([]);

      // ✅ TTS classement final (format strict) — après SFX/ticker
      try {
        if (ttsRankTimerRef.current) window.clearTimeout(ttsRankTimerRef.current);
        const msgFinal = buildRankingTts("final");
        if (msgFinal) {
          ttsRankTimerRef.current = window.setTimeout(() => speak(msgFinal, { lang: ttsLang }), Math.max(TTS_AFTER_AUDIO_MS, audioBusyUntilRef.current - Date.now() + 80));
        }
      } catch {
        // ignore
      }
    }
    return;
  }

  // Teams: rotation par JOUEURS dans chaque équipe (tous les membres jouent chaque trou)
  const k = activeTeamKey;
  setTurnThrows([]);

  if (k) {
    const memberIdxs = teamMembersIdxs[k] ?? [];
    const keyIndex = TEAM_KEYS_ALL.indexOf(k);
    const cur = teamCursor[keyIndex] ?? 0;
    const nextMember = cur + 1;

    // ✅ On reste sur la même équipe tant que tous ses membres n'ont pas joué le trou
    if (memberIdxs.length && nextMember < memberIdxs.length) {
      setTeamCursor((prev) => {
        const next = prev.slice() as [number, number, number, number];
        next[keyIndex] = nextMember;
        return next;
      });

      // ✅ TTS: annonce joueur suivant (même équipe) après SFX/ticker
      try {
        if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
        const pi = memberIdxs[nextMember];
        const p = roster[pi];
        const nextName = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
        if (nextName) {
          ttsTimerRef.current = window.setTimeout(
            () => speak(lang === "fr" ? `À toi de jouer, ${nextName}.` : `${nextName}, your turn.`, { lang: ttsLang }),
            TTS_AFTER_AUDIO_MS
          );
        }
      } catch {}
      return;
    }

    // ✅ équipe terminée sur ce trou -> reset curseur membre pour cette équipe (prochain trou)
    setTeamCursor((prev) => {
      const next = prev.slice() as [number, number, number, number];
      next[keyIndex] = 0;
      return next;
    });
  }

  // ✅ équipe suivante
  const nextPos = teamTurnPos + 1;

  if (nextPos < activeTeamKeys.length) {
    setTeamTurnPos(nextPos);

    // force le curseur membre de l'équipe suivante à 0
    try {
      const k2 = activeTeamKeys[nextPos];
      if (k2) {
        const idx2 = TEAM_KEYS_ALL.indexOf(k2);
        setTeamCursor((prev) => {
          const next = prev.slice() as [number, number, number, number];
          next[idx2] = 0;
          return next;
        });

        // ✅ TTS: annonce premier joueur de l'équipe suivante
        const ids2 = teamMembersIdxs[k2] ?? [];
        const pi2 = ids2[0];
        const p2 = roster[pi2];
        const nextName2 = safeStr(p2?.name ?? p2?.label ?? p2?.pseudo ?? "");
        if (nextName2) {
          if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
          ttsTimerRef.current = window.setTimeout(
            () => speak(lang === "fr" ? `À toi de jouer, ${nextName2}.` : `${nextName2}, your turn.`, { lang: ttsLang }),
            TTS_AFTER_AUDIO_MS
          );
        }
      }
    } catch {}

    return;
  }

  // fin de rotation -> trou suivant
  setTeamTurnPos(0);
  // reset tous les curseurs équipe à 0 pour le nouveau trou
  setTeamCursor([0, 0, 0, 0]);

  const nextHole = holeIdx + 1;
  if (nextHole < holes) {
    setHoleIdx(nextHole);

    // ✅ TTS: annonce premier joueur de la première équipe active au nouveau trou
    try {
      const k0 = activeTeamKeys[0];
      if (k0) {
        const ids0 = teamMembersIdxs[k0] ?? [];
        const pi0 = ids0[0];
        const p0 = roster[pi0];
        const n0 = safeStr(p0?.name ?? p0?.label ?? p0?.pseudo ?? "");
        if (n0) {
          if (ttsTimerRef.current) window.clearTimeout(ttsTimerRef.current);
          ttsTimerRef.current = window.setTimeout(
            () => speak(lang === "fr" ? `À toi de jouer, ${n0}.` : `${n0}, your turn.`, { lang: ttsLang }),
            TTS_AFTER_AUDIO_MS
          );
        }
      }
    } catch {}
  } else {
    setIsFinished(true);

    // ✅ TTS classement final (format strict) — après SFX/ticker
    try {
      if (ttsRankTimerRef.current) window.clearTimeout(ttsRankTimerRef.current);
      const msgFinal = buildRankingTts("final");
      if (msgFinal) {
        ttsRankTimerRef.current = window.setTimeout(() => speak(msgFinal, { lang: ttsLang }), Math.max(TTS_AFTER_AUDIO_MS, audioBusyUntilRef.current - Date.now() + 80));
      }
    } catch {
      // ignore
    }
  }

}


  function finalizeTurn(
  prevScores: (number | null)[][],
  nextScores: (number | null)[][],
  prevTeamScores: (number | null)[][],
  nextTeamScores: (number | null)[][],
  prevTurn: ThrowKind[]
) {
  // le score du trou est la DERNIÈRE flèche lancée
  const last = prevTurn[prevTurn.length - 1];
  if (last) lastPerfRef.current = kindToPerf(last);
  const holeScore = last ? kindToScore(last, missStrokesVal) : null;
  if (holeScore == null) return;

  // ✅ Toujours écrire le score sur le joueur ACTIF (solo + teams)
  nextScores[activePlayerIdx][holeIdx] = holeScore;

  // ✅ En mode TEAMS, on calcule le score d'équipe uniquement quand TOUS les membres ont joué ce trou
  if (teamsOk && activeTeamKey) {
    const ti = teamIndexByKey[activeTeamKey] ?? 0;
    const memberIdxs = teamMembersIdxs[activeTeamKey] ?? [];
    if (memberIdxs.length) {
      const vals = memberIdxs
        .map((pi) => nextScores[pi]?.[holeIdx])
        .filter((v) => v !== null && v !== undefined) as number[];

      // si tous les membres ont un score pour ce trou -> commit équipe (best ball = min)
      if (vals.length === memberIdxs.length) {
        const best = Math.min(...vals);
        nextTeamScores[ti][holeIdx] = best;
      }
    }
  }
}



  function recordThrow(kind: ThrowKind) {
    if (isFinished) return;
    setScores((prevScores) => {
      const prevTurn = turnThrows.slice();
      const prevStats = statsByPlayer.map((s) => ({ ...s }));
      pushHistory(prevScores, teamScores, prevTurn, prevStats);

      // update stats
      const nextStats = prevStats.map((s) => ({ ...s }));
      const st = nextStats[activePlayerIdx] ?? { darts: 0, miss: 0, d: 0, t: 0, s: 0, b: 0, db: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 };
      const dartIdx = prevTurn.length; // 0..2
      if (dartIdx === 0) {
        st.turns += 1;
        // ✅ mémorise l'acteur (utile si le tour se termine en 3 flèches sans stop)
        try {
          const p = players[playerIdx];
          lastActorNameRef.current = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
        } catch {
          // ignore
        }
      }
      st.darts += 1;
      if (kind === "M") st.miss += 1;
      if (kind === "D") st.d += 1;
      if (kind === "T") st.t += 1;
      if (kind === "S") st.s += 1;
      if (kind === "B") st.b += 1;
      if (kind === "DB") st.db += 1;
      // réussite sur la flèche (pas un miss)
      if (kind !== "M") {
        if (dartIdx === 0) st.hit1 += 1;
        if (dartIdx === 1) st.hit2 += 1;
        if (dartIdx === 2) st.hit3 += 1;
      }
      nextStats[activePlayerIdx] = st;
      setStatsByPlayer(nextStats);

      // update turnThrows
      const nextTurn = prevTurn.concat(kind).slice(0, 3);
      setTurnThrows(nextTurn);

      // update scores if this throw ends the turn (3 darts)
const nextScores = prevScores.map((r) => r.slice());
const nextTeamScores = teamScores.map((r) => r.slice());

if (nextTurn.length >= 3) {
  finalizeTurn(prevScores, nextScores, teamScores, nextTeamScores, nextTurn);
  if (teamsOk) setTeamScores(nextTeamScores);
  // advance
  setTimeout(() => advanceAfterFinalize(), 0);
}

      return nextScores;
    });
  }

  function stopTurn() {
    if (isFinished) return;
    if (turnThrows.length <= 0) return;

    // ✅ mémorise le joueur qui vient de jouer (pour TTS après validation)
    try {
      const p = players[playerIdx];
      lastActorNameRef.current = safeStr(p?.name ?? p?.label ?? p?.pseudo ?? "");
    } catch {
      lastActorNameRef.current = "";
    }

    setScores((prevScores) => {
      const prevTurn = turnThrows.slice();
      const prevStats = statsByPlayer.map((s) => ({ ...s }));
      pushHistory(prevScores, teamScores, prevTurn, prevStats);

      const nextScores = prevScores.map((r) => r.slice());
const nextTeamScores = teamScores.map((r) => r.slice());

finalizeTurn(prevScores, nextScores, teamScores, nextTeamScores, prevTurn);
if (teamsOk) setTeamScores(nextTeamScores);

setTimeout(() => advanceAfterFinalize(), 0);
return nextScores;
    });
  }

  function undo() {
  const h = historyRef.current.pop();
  if (!h) return;
  setScores(h.prevScores.map((r) => r.slice()));
  setTeamScores(h.prevTeamScores.map((r) => r.slice()));
  setHoleIdx(h.holeIdx);
  setPlayerIdx(h.playerIdx);
  setStartAt(h.startAt ?? 0);
  setTurnPos(h.turnPos ?? 0);
  setTeamTurnPos(h.teamTurnPos);
  setTeamCursor(h.teamCursor);
  setIsFinished(h.isFinished);
  setTurnThrows(h.prevTurnThrows.slice());
  setStatsByPlayer(h.prevStats.map((s) => ({ ...s })));
}


  // ---------------- UI helpers ----------------
  const cardBase: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };

  function HolesTableBlock(props: { start: number; end: number; title: string }) {
    const { start, end, title } = props;
    const cols = end - start + 1;

    const headerCells = Array.from({ length: cols }, (_, i) => start + i);
    const headerTargets = headerCells.map((h) => holeTargets[h - 1] ?? h);

    const cellPill = (v: number) => {
  // On veut des chiffres simples colorés (pas de chip néon)
  // DBull = -2 (violet) / Bull = -1 (rose) — on garde aussi 0 en fallback si tu l'utilises ailleurs
  if (v === -2) return { color: "#d8b6ff" };
  if (v === -1 || v === 0) return { color: "#ff9fe6" };

  // 1 = Double (hole in one), 3 = Triple, 4 = Simple, M = Miss (missStrokesVal)
  if (v === 1) return { color: "#ffcf57" };
  if (v === 3) return { color: "#b9ffe9" };
  if (v === 4) return { color: "rgba(255,255,255,.92)" };
  return { color: "#ffb2b2" };
};


    return (
      <div
        style={{
          ...cardBase,
          padding: 12,
          marginTop: 12,
          background:
            "radial-gradient(120% 160% at 0% 0%, rgba(120,255,220,0.10), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.30))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ color: "#b9ffe9", fontWeight: 1000, textShadow: "0 0 16px rgba(120,255,220,.18)" }}>{title}</div>
          <div style={{ opacity: 0.72, fontSize: 12, fontWeight: 900 }}>Score bas gagne</div>
        </div>

        <div style={{ overflowX: "hidden" }}>
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `46px repeat(${cols}, minmax(0, 1fr)) 64px`,
              gap: 6,
              padding: "8px 8px",
              borderRadius: 14,
              background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.18))",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 12,
              fontWeight: 1000,
              color: "rgba(255,255,255,0.75)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div>#</div>
            {headerTargets.map((n, idx) => (
              <div key={idx} style={{ textAlign: "center", letterSpacing: 0.4 }}>
                {n}
              </div>
            ))}
            <div style={{ textAlign: "right" }}>Total</div>
          </div>

          {/* rows */}
          {(teamsOk
            ? enabledTeamKeys
                .filter((k) => (teamMembersIdxs[k]?.length ?? 0) > 0)
                .map((k) => ({ id: `team_${k}`, name: TEAM_META[k].label, avatar: TEAM_META[k].logo, teamKey: k as TeamKey, teamIndex: teamIndexByKey[k] ?? 0 }))
            : roster.map((p) => ({ ...p, teamKey: null as any, teamIndex: -1 }))
          ).map((p: any, pIdx: number) => {
            const row = (teamsOk ? teamScores[p.teamIndex] : scores[pIdx]) || [];
            const slice = row.slice(start - 1, end);
            const rowTotal = (teamsOk ? teamTotals[p.teamIndex] : playerTotals[pIdx]) ?? 0;
            const isActive = !isFinished && (teamsOk ? (activeTeamKey ? p.teamKey === activeTeamKey : false) : pIdx === playerIdx);

            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `46px repeat(${cols}, minmax(0, 1fr)) 64px`,
                  gap: 6,
                  padding: "10px 8px",
                  borderRadius: 14,
                  marginTop: 10,
                  border: isActive ? "1px solid rgba(120,255,220,0.22)" : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "linear-gradient(180deg, rgba(120,255,220,0.10), rgba(0,0,0,0.22))"
                    : "linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.12))",
                  boxShadow: isActive ? "0 14px 30px rgba(0,0,0,0.35)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isActive
                        ? "1px solid rgba(120,255,220,.55)"
                        : "1px solid rgba(255,255,255,.14)",
                      boxShadow: isActive
                        ? "0 0 0 3px rgba(0,0,0,.28), 0 0 16px rgba(120,255,220,.25)"
                        : "0 0 0 3px rgba(0,0,0,.28)",
                      background: "rgba(0,0,0,.35)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span
                        style={{
                          fontWeight: 1000,
                          fontSize: 13,
                          color: isActive ? "#b9ffe9" : "rgba(255,255,255,0.78)",
                        }}
                      >
                        {pIdx + 1}
                      </span>
                    )}
                  </div>
                </div>

                {slice.map((v, i) => {
                  const isCurrentCell = !isFinished && (teamsOk ? (activeTeamKey ? p.teamKey === activeTeamKey : false) : pIdx === playerIdx) && holeIdx === start - 1 + i;

                  if (typeof v !== "number") {
                    return (
                      <div
                        key={i}
                        style={{
                          textAlign: "center",
                          fontWeight: 1000,
                          color: isCurrentCell ? "rgba(185,255,233,0.85)" : "rgba(255,255,255,0.28)",
                        }}
                      >
                        —
                      </div>
                    );
                  }

                  const st = cellPill(v);

                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                      <div
                        style={{
                          minWidth: 30,
                          height: 26,
                          padding: "0 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          border: "none",
                          background: "transparent",
                          color: st.color,
                          fontWeight: 1000,
                          boxShadow: isCurrentCell ? "0 0 18px rgba(120,255,220,0.18)" : "none",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      minWidth: 44,
                      height: 26,
                      padding: "0 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      border: "1px solid rgba(255,195,26,.35)",
                      background: "rgba(255,195,26,.10)",
                      color: "#ffcf57",
                      fontWeight: 1000,
                      letterSpacing: 0.2,
                    }}
                  >
                    {rowTotal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Chips d'état du tour (3 flèches)
const throwChips = [0, 1, 2].map((i) => {
  const k = turnThrows[i];
  if (!k) return "—";
  if (k === "DB") return "DB";
  if (k === "B") return "B";
  if (k === "D") return "D";
  if (k === "T") return "T";
  if (k === "S") return "S";
  return "M";
});


  function chipStyle(label: string): React.CSSProperties {
  if (label === "DB")
    return { border: "1px solid rgba(180,120,255,0.55)", background: "rgba(120,60,170,0.20)", color: "#d8b6ff" };
  if (label === "B")
    return { border: "1px solid rgba(255,120,220,0.55)", background: "rgba(160,35,115,0.20)", color: "#ff9fe6" };
  if (label === "D") return { border: "1px solid rgba(255,195,26,.35)", background: "rgba(255,195,26,.16)", color: "#ffcf57" };
  if (label === "T") return { border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.14)", color: "#b9ffe9" };
  if (label === "S")
    return {
      border: "1px solid rgba(70,160,255,.45)",
      background: "rgba(20,85,185,.22)",
      color: "#bfeaff",
      boxShadow: "0 0 18px rgba(70,160,255,.16)",
    };
  if (label === "M") return { border: "1px solid rgba(255,95,95,.35)", background: "rgba(255,95,95,.14)", color: "#ffb2b2" };
  return { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#d9dbe3" };
}


  function keyValueBadge(kind: ThrowKind, value: number) {
    const base: React.CSSProperties = {
      width: 26,
      height: 22,
      borderRadius: 7,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 1000,
      fontSize: 13,
      letterSpacing: 0.2,
      flex: "0 0 auto",
      boxShadow: "0 10px 22px rgba(0,0,0,.35)",
    };
    if (kind === "DB")
      return (
        <span
          style={{
            ...base,
            border: "1px solid rgba(180,120,255,0.6)",
            background: "rgba(180,120,255,0.18)",
            color: "#d8b6ff",
            boxShadow: "0 0 18px rgba(180,120,255,0.18), 0 10px 22px rgba(0,0,0,.35)",
          }}
        >
          {value}
        </span>
      );
    if (kind === "B")
      return (
        <span
          style={{
            ...base,
            border: "1px solid rgba(255,120,220,0.65)",
            background: "rgba(255,120,220,0.18)",
            color: "#ff9fe6",
            boxShadow: "0 0 18px rgba(255,120,220,0.18), 0 10px 22px rgba(0,0,0,.35)",
          }}
        >
          {value}
        </span>
      );
    if (kind === "D")
      return (
        <span
          style={{
            ...base,
            border: "1px solid rgba(255,195,26,0.55)",
            background: "rgba(255,195,26,0.18)",
            color: "#ffcf57",
            boxShadow: "0 0 18px rgba(255,195,26,0.18), 0 10px 22px rgba(0,0,0,.35)",
          }}
        >
          {value}
        </span>
      );
    if (kind === "T")
      return (
        <span
          style={{
            ...base,
            border: "1px solid rgba(120,255,220,0.55)",
            background: "rgba(120,255,220,0.14)",
            color: "#b9ffe9",
            boxShadow: "0 0 18px rgba(120,255,220,0.16), 0 10px 22px rgba(0,0,0,.35)",
          }}
        >
          {value}
        </span>
      );
    if (kind === "S")
      return (
        <span
          style={{
            ...base,
            border: "1px solid rgba(70,160,255,0.60)",
            background: "rgba(20,85,185,0.22)",
            color: "#bfeaff",
            boxShadow: "0 0 18px rgba(70,160,255,0.18), 0 10px 22px rgba(0,0,0,.35)",
          }}
        >
          {value}
        </span>
      );
    return (
      <span
        style={{
          ...base,
          border: "1px solid rgba(255,120,120,0.55)",
          background: "rgba(255,120,120,0.12)",
          color: "#ffb2b2",
          boxShadow: "0 0 18px rgba(255,120,120,0.16), 0 10px 22px rgba(0,0,0,.35)",
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <div className="page">
      <PageHeader title="GOLF" tickerSrc={tickerGolf} left={<BackDot onClick={goBack} />} right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />} />

      {/* ✅ Ticker perf (flottant) */}
      {perfOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop pour éviter de voir le UI derrière (transparences des tickers) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "min(520px, calc(100vw - 24px))",
              filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.65))",
            }}
          >
            <img
              src={
                perfOverlay === "EAGLE"
                  ? tickerGolfEagle
                  : perfOverlay === "BIRDIE"
                    ? tickerGolfBirdie
                    : perfOverlay === "PAR"
                      ? tickerGolfPar
                      : perfOverlay === "BOGEY"
                        ? tickerGolfBogey
                        : perfOverlay === "SIMPLE"
                          ? tickerGolfSimple
                          : tickerGolfMiss
              }
              alt=""
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 14,
              }}
            />
          </div>
        </div>
      )}


      <div style={{ padding: 12 }}>
        {/* Carousel joueurs (clone KILLER) */}
        <GolfPlayersCarousel
  players={
    teamsOk
      ? enabledTeamKeys
          .filter((k) => (teamMembersIdxs[k]?.length ?? 0) > 0)
          .map((k) => ({
            id: `team_${k}`,
            name: TEAM_META[k].label,
            avatar: TEAM_META[k].logo,
            total: teamTotals[teamIndexByKey[k] ?? 0] ?? 0,
          }))
      : roster.map((p, idx) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar ?? null,
          total: playerTotals[idx] ?? 0,
        }))
  }
  activeId={
    !isFinished
      ? teamsOk && activeTeamKey
        ? `team_${activeTeamKey}`
        : roster[activePlayerIdx]?.id
      : null
  }
  theme={"#b9ffe9"}
/>
<GolfHeaderBlock
  currentPlayer={activePlayer}
  currentAvatar={activeAvatar}
  currentTotal={activeTotal}
  currentStats={activeStats}
  liveRanking={ranking.map((r: any) => ({ id: r.id, name: r.name, score: r.total, avatar: r.avatar ?? null }))}
  isFinished={isFinished}
  teamBadge={teamsOk && activeTeamKey ? { label: TEAM_META[activeTeamKey].label, color: TEAM_META[activeTeamKey].color } : null}

  perfOverlay={perfOverlay}
/>


        {/* Bandeau TROU / ticker parcours / CIBLE (ticker plein, texte sur l’image) */}
        <div
          style={{
            ...cardBase,
            padding: 0,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 62,
              width: "100%",
              backgroundImage: `url(${holeTickerSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: 18,
            }}
          >
            {/* voile pour la lisibilité */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,.80) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.80) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
              }}
            >
              <div
                style={{
                  fontWeight: 1000,
                  color: "#b9ffe9",
                  textShadow: "0 3px 14px rgba(120,255,220,.25)",
                  letterSpacing: 0.6,
                }}
              >
                TROU {holeIdx + 1}/{holes}
              </div>

              <div
                style={{
                  fontWeight: 1000,
                  color: "#b9ffe9",
                  textShadow: "0 3px 14px rgba(120,255,220,.25)",
                  letterSpacing: 0.6,
                }}
              >
                CIBLE : {target}
              </div>
            </div>
          </div>
        </div>

        {/* TABLEAU DES SCORES : carte compacte (ouvre un bloc flottant avec 1–9 / 10–18 empilés) */}
        {showGrid && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowScoresModal(true)}
              style={{
                ...cardBase,
                padding: 0,
                width: "100%",
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* background ticker */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${scoreCardTickerSrc})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.55,
                  filter: "saturate(1.15) contrast(1.08)",
                }}
              />
              {/* overlay */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,.76) 0%, rgba(0,0,0,.48) 45%, rgba(0,0,0,.76) 100%), radial-gradient(120% 140% at 0% 0%, rgba(120,255,220,.18), transparent 55%)",
                }}
              />

<div
  style={{
    position: "relative",
    zIndex: 1,
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 1000,
    fontSize: 18,                 // ⬅️ légèrement plus gros
    letterSpacing: 1.4,
    color: "#b9ffe9",             // ⬅️ couleur thème Golf
    textShadow:
      "0 0 16px rgba(120,255,220,.35), 0 8px 22px rgba(0,0,0,.55)",
    textTransform: "uppercase",
  }}
>
  TABLEAU DES SCORES
              </div>
            </button>

            {showScoresModal && (
              <div
                role="dialog"
                aria-modal="true"
                onClick={() => setShowScoresModal(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,.64)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
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
                    ...cardBase,
                    width: "min(680px, 100%)",
                    maxHeight: "82vh",
                    overflow: "hidden",
                    borderRadius: 20,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "rgba(255,255,255,.92)" }}>
                      TABLEAU DES SCORES
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScoresModal(false)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.30)",
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      FERMER
                    </button>
                  </div>

                  <div style={{ padding: 12, overflowY: "auto", maxHeight: "calc(82vh - 56px)" }}>
                    {roundsMode && (
                      <div style={{ ...cardBase, padding: 10, marginBottom: 12, borderRadius: 16 }}>
                        <div style={{ fontWeight: 1000, marginBottom: 8, color: "rgba(255,255,255,.92)" }}>
                          ROUNDS
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {roster.map((p, idx) => (
                            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                              <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                                <span style={{ ...tinyAvatar, width: 20, height: 20 }}>
                                  {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                                </span>
                                <span style={{ fontWeight: 900, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.name}
                                </span>
                              </div>
                              <span style={{ minWidth: 46, textAlign: "center", padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)", fontWeight: 1000 }}>
                                {statsByPlayer[idx]?.turns ?? 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {holes <= 9 ? (
                      <HolesTableBlock start={1} end={holes} title={`Trous 1–${holes}`} />
                    ) : (
                      <>
                        <HolesTableBlock start={1} end={9} title="Trous 1–9" />
                        <HolesTableBlock start={10} end={holes} title={`Trous 10–${holes}`} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAISIE (en bas) — sans titres "SAISIE" / trou-cible */}
        {!isFinished && (
          <div style={{ ...cardBase, padding: 12, marginTop: 12 }}>
            {/* chips de tour */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
              {throwChips.map((lab, i) => {
                const st = chipStyle(lab);
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 42,
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "none",
                      background: "transparent",
                      color: st.color as any,
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    {lab}
                  </span>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 6,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <button
                onClick={() => recordThrow("DB")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(180,120,255,0.38)",
                  background: "rgba(120,60,170,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>DBULL</span>
                  {keyValueBadge("DB", kindToScore("DB", missStrokesVal))}
                </span>
              </button>

              <button
                onClick={() => recordThrow("B")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,220,0.45)",
                  background: "rgba(160,35,115,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>BULL</span>
                  {keyValueBadge("B", kindToScore("B", missStrokesVal))}
                </span>
              </button>

              <button
                onClick={() => recordThrow("D")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,195,26,0.35)",
                  background: "rgba(255,195,26,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>DOUBLE</span>
                  {keyValueBadge("D", kindToScore("D", missStrokesVal))}
                </span>
              </button>

              <button
                onClick={() => recordThrow("T")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(120,255,220,0.35)",
                  background: "rgba(40,120,90,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>TRIPLE</span>
                  {keyValueBadge("T", kindToScore("T", missStrokesVal))}
                </span>
              </button>

              <button
                onClick={() => recordThrow("S")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(70,160,255,0.45)",
                  background: "rgba(20,85,185,0.22)",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.45), 0 0 18px rgba(70,160,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>SIMPLE</span>
                  {keyValueBadge("S", kindToScore("S", missStrokesVal))}
                </span>
              </button>

              <button
                onClick={() => recordThrow("M")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "10px 8px",
                  minHeight: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,120,0.35)",
                  background: "rgba(120,40,40,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 12,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ letterSpacing: 0.4 }}>MISS</span>
                  {keyValueBadge("M", kindToScore("M", missStrokesVal))}
                </span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
              <button
                onClick={stopTurn}
                disabled={turnThrows.length === 0}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,105,180,0.45)",
                  background: "linear-gradient(180deg, rgba(255,215,236,0.95), rgba(255,186,221,0.90))",
                  color: "#b01863",
                  boxShadow:
                    "0 14px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 18px rgba(255,105,180,0.18)",
                  fontWeight: 1000,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  opacity: turnThrows.length === 0 ? 0.45 : 1,
                }}
              >
                JOUEUR SUIVANT
              </button>

              <button
                onClick={undo}
                disabled={historyRef.current.length === 0}
                style={{
                  width: 140,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,180,0,.30)",
                  background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
                  color: "#1a1a1a",
                  boxShadow: "0 10px 22px rgba(255,170,0,.28), 0 14px 32px rgba(0,0,0,0.35)",
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  opacity: historyRef.current.length === 0 ? 0.45 : 1,
                }}
              >
                ANNULER
              </button>
            </div>
          </div>
        )}

        {isFinished && (
          <div
            style={{
              ...cardBase,
              padding: 14,
              marginTop: 12,
              background:
                "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0.18))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 1000, fontSize: 16, color: "#ffd36a", letterSpacing: 0.6, textTransform: "uppercase" }}>
                Résultats du match
              </div>

              <div style={{ display: "inline-flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEndMatchModal(true)}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(120,255,220,.22)",
                    background: "rgba(0,0,0,0.28)",
                    color: "#b9ffe9",
                    fontWeight: 1000,
                    letterSpacing: 0.6,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Résultats
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.22)",
                    color: "rgba(255,255,255,0.82)",
                    fontWeight: 1000,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Rejouer
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {ranking[0] ? (
                <div style={{ fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>
                  Vainqueur : {ranking[0].name} — {ranking[0].total}
                </div>
              ) : null}
            </div>

            {/* Mini classement (top 3) */}
            <div style={{ marginTop: 10, ...cardBase, padding: 10, borderRadius: 16 }}>
              <div style={{ fontWeight: 1000, marginBottom: 8, color: "rgba(255,255,255,.92)", letterSpacing: 0.4 }}>
                CLASSEMENT FINAL
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ranking.slice(0, 3).map((r: any, i: number) => (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 14,
                      border: i === 0 ? "1px solid rgba(255,195,26,.30)" : "1px solid rgba(255,255,255,0.10)",
                      background: i === 0 ? "rgba(255,195,26,.10)" : "rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: i === 0 ? "rgba(255,195,26,.22)" : "rgba(255,255,255,0.10)",
                        color: i === 0 ? "#ffd36a" : "rgba(255,255,255,0.75)",
                        fontWeight: 1000,
                        fontSize: 12,
                      }}
                    >
                      {i + 1}
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden", gap: 8 }}>
                      <span style={{ ...tinyAvatar, width: 20, height: 20 }}>
                        {r.avatar ? <img src={r.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                      </span>
                      <span style={{ fontWeight: 1000, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </span>
                    </div>

                    <div
                      style={{
                        minWidth: 54,
                        height: 26,
                        padding: "0 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        border: "1px solid rgba(255,195,26,.35)",
                        background: "rgba(255,195,26,.10)",
                        color: "#ffcf57",
                        fontWeight: 1000,
                        letterSpacing: 0.2,
                      }}
                    >
                      {r.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau trous (visible directement à la fin du match, comme X01) */}
            {holes <= 9 ? (
              <div style={{ marginTop: 10 }}>
                <HolesTableBlock start={1} end={holes} title={`Trous 1–${holes}`} />
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <HolesTableBlock start={1} end={9} title="Trous 1–9" />
                <HolesTableBlock start={10} end={holes} title={`Trous 10–${holes}`} />
              </div>
            )}

            {roundsMode && (
              <div style={{ marginTop: 10, ...cardBase, padding: 10, borderRadius: 16 }}>
                <div style={{ fontWeight: 1000, marginBottom: 8, color: "rgba(255,255,255,.92)" }}>
                  ROUNDS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {roster.map((p, idx) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                        <span style={{ ...tinyAvatar, width: 20, height: 20 }}>
                          {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </span>
                        <span style={{ fontWeight: 900, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ minWidth: 46, textAlign: "center", padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)", fontWeight: 1000 }}>
                        {statsByPlayer[idx]?.turns ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {showEndMatchModal && (
              <div
                role="dialog"
                aria-modal="true"
                onClick={() => setShowEndMatchModal(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,.68)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
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
                    ...cardBase,
                    width: "min(760px, 100%)",
                    maxHeight: "86vh",
                    overflow: "hidden",
                    borderRadius: 20,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "rgba(255,255,255,.92)" }}>
                      RÉSULTATS DU MATCH
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEndMatchModal(false)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.30)",
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      FERMER
                    </button>
                  </div>

                  <div style={{ padding: 12, overflowY: "auto", maxHeight: "calc(86vh - 56px)" }}>
                    {/* Classement final */}
                    <div style={{ ...cardBase, padding: 12, borderRadius: 18 }}>
                      <div style={{ fontWeight: 1000, color: "#b9ffe9", marginBottom: 10, letterSpacing: 0.6 }}>
                        CLASSEMENT FINAL
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {ranking.map((r: any, i: number) => (
                          <div
                            key={r.id ?? i}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "28px 1fr auto",
                              gap: 10,
                              alignItems: "center",
                              padding: "10px 10px",
                              borderRadius: 14,
                              border: i === 0 ? "1px solid rgba(255,195,26,0.28)" : "1px solid rgba(255,255,255,0.10)",
                              background: i === 0
                                ? "linear-gradient(180deg, rgba(255,195,26,0.14), rgba(0,0,0,0.18))"
                                : "linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.12))",
                            }}
                          >
                            <div style={{ fontWeight: 1000, color: i === 0 ? "#ffcf57" : "rgba(255,255,255,0.72)" }}>
                              {i + 1}
                            </div>

                            <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                              <span style={{ ...tinyAvatar, width: 22, height: 22 }}>
                                {r.avatar ? <img src={r.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                              </span>
                              <span
                                style={{
                                  fontWeight: 1000,
                                  color: (typeof r.color === "string" ? r.color : "rgba(255,255,255,0.92)"),
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.name}
                              </span>
                            </div>

                            <div
                              style={{
                                minWidth: 54,
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 1000,
                                color: i === 0 ? "#ffcf57" : "#b9ffe9",
                              }}
                            >
                              {r.total}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tableau des trous (final) */}
                    {holes <= 9 ? (
                      <HolesTableBlock start={1} end={holes} title={`Trous 1–${holes}`} />
                    ) : (
                      <>
                        <HolesTableBlock start={1} end={9} title="Trous 1–9" />
                        <HolesTableBlock start={10} end={holes} title={`Trous 10–${holes}`} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}