// ============================================
// src/pages/FriendsPage.tsx
// ONLINE HUB — Home “jeu” (ticker + dashboard + CTA)
//
// ✅ UI (comme CAPTURE 1):
// - Header 1 = "ONLINE" (sans "MODE EN LIGNE")
// - "Serveur : OK" déplacé SOUS le titre (à la place de HUB)
// - InfoDot tout à droite (composant commun)
// - Header 2 = Profil (1 seul avatar + 1 seul nom)
// - Statut présence coloré: En ligne (vert) / Absent (orange)
//
// ✅ LOGIQUE (fixes):
// - Serveur OK indépendant de l'auth
// - Session Supabase FIABLE via useAuthOnline() (source unique)
// - Boutons Créer/Rejoindre actifs si session connectée
// - Connexion / Déconnexion / Reconnexion fonctionnelles
// - Ne bloque jamais l’UI si table `profiles` manque
//
// ✅ NEW (étapes 3 & 4):
// - Header EXACT: ONLINE + Serveur OK dessous + InfoDot à droite
// - Profil: 1 seul avatar / 1 seul nom
// - Boutons "Créer/Rejoindre" => canPlayOnline = isSignedIn
// - Hint clair si disabled
//
// ✅ NEW (Realtime Presence + Chat MVP):
// - Quand signed_in : joinPresence realtime + présenceMap live
// - En ligne / Absent : setState() côté Realtime
// - Chat MVP : si lobby existe -> zone messages (fetch + subscribe + post)
//
// ✅ NEW (Spectateur activé):
// - GhostButton “👀 Spectateur” -> go("spectator")
// ============================================

import React from "react";
import { useSport } from "../contexts/SportContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Store } from "../lib/types";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineLobby } from "../lib/onlineApi";
import type { OnlineMatch } from "../lib/onlineTypes";
import { getCountryFlag } from "../lib/countryNames";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";
import {
  listFriends,
  listFriendRequests,
  listSharedItems,
  markSharedItemRead,
  removeFriend,
  respondFriendRequest,
  searchUsers,
  sendFriendRequest,
  shareWithFriend,
  updatePresence,
  type FriendRequest,
  type OnlineFriendUser,
  type SharedOnlineItem,
} from "../lib/friendsApi";


// ✅ Realtime presence + chat MVP
import { joinPresence } from "../lib/onlinePresence";
import { fetchMessages, postMessage, subscribeMessages } from "../lib/chatApi";
import { History } from "../lib/history";
import { getTicker } from "../lib/tickers";
import {
  filterOnlineStatsHardDeleted,
  listOnlineStatsCleanupSessions,
} from "../lib/onlineStatsExclusions";

/* -------------------------------------------------
   Constantes localStorage
--------------------------------------------------*/
const LS_PRESENCE_KEY = "dc_online_presence_v1";
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type PresenceStatus = "online" | "away" | "offline";
type StoredPresence = { status: PresenceStatus; lastSeen: number };

/* -------------------------------------------------
   Helpers
--------------------------------------------------*/
function savePresenceToLS(status: PresenceStatus) {
  if (typeof window === "undefined") return;
  const payload: StoredPresence = { status, lastSeen: Date.now() };
  try {
    window.localStorage.setItem(LS_PRESENCE_KEY, JSON.stringify(payload));
  } catch {}
}

function loadPresenceFromLS(): StoredPresence | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_PRESENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lastSeen !== "number") return null;
    const st = parsed.status;
    const status: PresenceStatus =
      st === "online" || st === "away" || st === "offline" ? st : "offline";
    return { status, lastSeen: parsed.lastSeen };
  } catch {
    return null;
  }
}

function clearActiveOnlineResume(code?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const c = String(code || "").trim().toUpperCase();
    window.localStorage.removeItem("dc_online_active_match_v1");
    if (c) window.localStorage.removeItem(`dc_online_active_match_${c}`);
  } catch {}
}

function loadActiveOnlineResume(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("dc_online_active_match_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = Number(parsed?.at || 0);
    const code = String(parsed?.lobbyCode || parsed?.params?.lobbyCode || "").trim().toUpperCase();
    const status = String(parsed?.status || parsed?.params?.status || parsed?.state?.status || "").toLowerCase();
    if (!code || !at || Date.now() - at > 1000 * 60 * 60 * 8) {
      clearActiveOnlineResume(code);
      return null;
    }
    if (status === "ended" || status === "finished" || status === "match_end" || status === "closed") {
      clearActiveOnlineResume(code);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatLastSeenAgo(lastSeen: number | null): string | null {
  if (!lastSeen) return null;
  const diffMs = Date.now() - lastSeen;
  if (diffMs < 0) return null;

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 0) return "À l’instant";
  if (diffMin === 1) return "Il y a 1 min";
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return "Il y a 1 h";
  return `Il y a ${diffH} h`;
}

function toTs(m: any) {
  const ts = m?.finishedAt || m?.startedAt || m?.createdAt || 0;
  const n = typeof ts === "number" ? ts : Date.parse(ts);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safePct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 100);
}

function fmt1(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}


function onlineNum(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOnlineHistoryForHub(row: any, idx = 0): any | null {
  if (!row || typeof row !== "object") return null;
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const nestedPayload = payload?.payload && typeof payload.payload === "object" ? payload.payload : {};
  const summary = row.summary && typeof row.summary === "object"
    ? row.summary
    : payload.summary && typeof payload.summary === "object"
    ? payload.summary
    : nestedPayload.summary && typeof nestedPayload.summary === "object"
    ? nestedPayload.summary
    : {};

  const rawMode = String(row.kind || row.mode || payload.mode || payload.onlineMode || nestedPayload.mode || nestedPayload.onlineMode || "").toLowerCase();
  const isOnline =
    row.online === true ||
    payload.online === true ||
    nestedPayload.online === true ||
    payload.source === "online" ||
    nestedPayload.source === "online" ||
    rawMode.includes("online") ||
    !!row.lobbyCode ||
    !!row.lobby_code ||
    !!payload.lobbyCode ||
    !!payload.lobby_code ||
    !!nestedPayload.lobbyCode ||
    !!nestedPayload.lobby_code;
  if (!isOnline) return null;

  const mode = rawMode.includes("x01") ? "x01" : String(payload.onlineMode || payload.mode || row.mode || row.kind || "online").toLowerCase();
  const createdRaw = row.createdAt ?? row.created_at ?? row.date ?? payload.createdAt ?? payload.created_at ?? summary.createdAt ?? nestedPayload.createdAt ?? Date.now();
  const finishedRaw = row.finishedAt ?? row.finished_at ?? row.updatedAt ?? row.updated_at ?? payload.finishedAt ?? payload.finished_at ?? createdRaw;
  const createdAt = typeof createdRaw === "number" ? createdRaw : Date.parse(String(createdRaw));
  const finishedAt = typeof finishedRaw === "number" ? finishedRaw : Date.parse(String(finishedRaw));

  const statsFromRow = row.stats || {};
  const statsFromPayload = payload.stats || nestedPayload.stats || {};
  const darts = onlineNum(row.darts ?? statsFromRow.darts ?? payload.darts ?? payload.dartsCount ?? summary.darts ?? statsFromPayload.darts, 0);
  const totalScore = onlineNum(row.totalScore ?? statsFromRow.totalScore ?? payload.totalScore ?? summary.totalScore ?? statsFromPayload.totalScore, 0);
  const bestVisit = onlineNum(row.bestVisit ?? statsFromRow.bestVisit ?? summary.bestVisit ?? statsFromPayload.bestVisit, 0);
  const bestCheckout = onlineNum(row.bestCheckout ?? statsFromRow.bestCheckout ?? summary.bestCheckout ?? statsFromPayload.bestCheckout, 0);

  return {
    ...row,
    id: String(row.id || row.matchId || row.match_id || payload.matchId || payload.id || `online-history-${idx}`),
    mode,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    finishedAt: Number.isFinite(finishedAt) ? finishedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
    payload,
    summary,
    stats: {
      ...(statsFromPayload || {}),
      ...(statsFromRow || {}),
      darts,
      totalScore,
      bestVisit,
      bestCheckout,
      avg3D: onlineNum(statsFromRow.avg3D ?? statsFromRow.avg3 ?? statsFromPayload.avg3D ?? statsFromPayload.avg3, darts > 0 ? (totalScore / darts) * 3 : 0),
      checkoutPct: onlineNum(statsFromRow.checkoutPct ?? statsFromPayload.checkoutPct ?? row.checkoutPct ?? payload.checkoutPct, 0),
    },
  };
}

function onlineHubMatchKey(row: any): string {
  const candidates = [
    row?.id,
    row?.matchId,
    row?.match_id,
    row?.lobbyCode,
    row?.lobby_code,
    row?.payload?.matchId,
    row?.payload?.id,
    row?.payload?.lobbyCode,
    row?.payload?.lobby_code,
    row?.summary?.matchId,
  ];
  for (const candidate of candidates) {
    const key = String(candidate || "").trim();
    if (key) return key.toLowerCase();
  }
  return `${String(row?.mode || "online").toLowerCase()}::${toTs(row)}::${JSON.stringify(row?.players || row?.payload?.players || []).slice(0, 160)}`;
}

async function loadOnlineHubMatchesFromHistoryAndCache(): Promise<any[]> {
  const out: any[] = [];

  // ✅ Source prioritaire : exactement la même que le panneau
  // Réglages > Développeur > Nettoyage Online.
  // Avant, le Hub tentait de relire History/localStorage avec une normalisation
  // trop restrictive : les cartes existaient bien dans l'historique, mais le Hub
  // pouvait rester à 0. Ici on compte les sessions Online agrégées/non supprimées
  // par onlineStatsExclusions, donc Hub / Stats / Nettoyage parlent la même langue.
  try {
    const cleanupSessions = await listOnlineStatsCleanupSessions();
    if (Array.isArray(cleanupSessions)) {
      out.push(
        ...cleanupSessions
          .filter((session: any) => !session?.excludedFromStats && !session?.deletedAt)
          .map((session: any, idx: number) => ({
            ...session,
            id: String(session?.id || session?.matchId || `online-cleanup-${idx}`),
            matchId: session?.matchId || session?.id,
            mode: String(session?.mode || session?.sport || "x01").toLowerCase().includes("x01") ? "x01" : String(session?.mode || "online").toLowerCase(),
            createdAt: Number(session?.createdAt || session?.finishedAt || Date.now()),
            finishedAt: Number(session?.finishedAt || session?.createdAt || Date.now()),
            payload: session?.raw || session?.payload || {},
            summary: session?.summary || session?.raw?.summary || {},
            stats: {
              darts: onlineNum(session?.darts, 0),
              totalScore: onlineNum(session?.totalScore, 0),
              bestVisit: onlineNum(session?.bestVisit, 0),
              bestCheckout: onlineNum(session?.bestCheckout, 0),
              avg3D: onlineNum(session?.avg3D ?? session?.avg3, 0),
              checkoutPct: onlineNum(session?.checkoutPct, 0),
            },
          })),
      );
    }
  } catch (err) {
    console.warn("[OnlineHub] lecture sessions nettoyage online impossible", err);
  }

  // Fallbacks conservés : utile pour les anciennes sauvegardes non indexées.
  try {
    const api: any = History as any;
    const rows = typeof api.listFinished === "function" ? await api.listFinished() : typeof api.list === "function" ? await api.list() : [];
    if (Array.isArray(rows)) out.push(...rows.map(normalizeOnlineHistoryForHub).filter(Boolean));
  } catch (err) {
    console.warn("[OnlineHub] lecture History online impossible", err);
  }
  try {
    const raw = window.localStorage.getItem(LS_ONLINE_MATCHES_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    if (Array.isArray(rows)) out.push(...rows.map(normalizeOnlineHistoryForHub).filter(Boolean));
  } catch {}

  const merged = new Map<string, any>();
  for (const row of filterOnlineStatsHardDeleted(out) || []) {
    merged.set(onlineHubMatchKey(row), row);
  }
  return Array.from(merged.values());
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: number | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  }) as Promise<T>;
}

function normalizeErrMessage(e: any) {
  const msg = String(e?.message || e || "");
  if (!msg) return "Erreur inconnue.";
  // Hint typique supabase : table profiles manquante
  if (msg.includes("profiles") && (msg.includes("Could not find") || msg.includes("404"))) {
    return "Supabase: table `profiles` introuvable (migration/RLS). La session peut fonctionner quand même.";
  }
  if (msg.includes("JWT") || msg.includes("invalid") || msg.includes("expired")) {
    return "Session Supabase invalide/expirée. Clique sur Reconnexion.";
  }
  return msg;
}


function hexToRgbParts(hex: string) {
  const clean = String(hex || "#22E6FF").replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return "34,230,255";
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function darkenHex(hex: string, amount = 0.38) {
  const parts = hexToRgbParts(hex).split(",").map((v) => Number(v));
  const [r, g, b] = parts.map((v) => Math.max(0, Math.min(255, Math.round(v * (1 - amount)))));
  return `rgb(${r},${g},${b})`;
}

/* -------------------------------------------------
   UI atoms
--------------------------------------------------*/
function Pill({
  label,
  tone = "gold",
  title,
}: {
  label: string;
  tone?: "gold" | "blue" | "green" | "red" | "orange" | "gray";
  title?: string;
}) {
  const map: any = {
    gold: ["rgba(var(--online-accent-rgb),.18)", "var(--online-accent)", "rgba(var(--online-accent-rgb),.35)"],
    blue: ["rgba(79,180,255,.14)", "#4fb4ff", "rgba(79,180,255,.35)"],
    green: ["rgba(127,226,169,.14)", "#7fe2a9", "rgba(127,226,169,.35)"],
    orange: ["rgba(255,179,71,.14)", "var(--online-accent)", "rgba(255,179,71,.35)"],
    red: ["rgba(255,90,90,.14)", "#ff5a5a", "rgba(255,90,90,.35)"],
    gray: ["rgba(255,255,255,.08)", "rgba(255,255,255,.9)", "rgba(255,255,255,.12)"],
  };
  const [bg, fg, bd] = map[tone] || map.gray;

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11.2,
        fontWeight: 950,
        letterSpacing: 0.2,
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function NeonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(var(--online-accent-rgb),.06), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,.55)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 950,
            letterSpacing: 0.2,
            color: "var(--online-accent)",
            textShadow: "0 0 12px rgba(var(--online-accent-rgb),.25)",
          }}
        >
          {title}
        </div>
        {subtitle ? <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>{subtitle}</div> : null}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
  tone = "gold",
  subLabel,
}: {
  label: string;
  subLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "gold" | "blue" | "green" | "gray";
}) {
  const bg =
    tone === "green"
      ? ["#35c86d", "#23a958"]
      : tone === "blue"
      ? ["#4fb4ff", "#1c78d5"]
      : tone === "gray"
      ? ["#454545", "#2d2d2d"]
      : ["var(--online-accent)", "var(--online-accent-dark)"];

  const fg = tone === "gray" ? "rgba(255,255,255,.60)" : tone === "gold" ? "#04101f" : "#04101f";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        borderRadius: 16,
        padding: "12px 12px",
        border: "1px solid rgba(255,255,255,.16)",
        background: `linear-gradient(180deg, ${bg[0]}, ${bg[1]})`,
        color: fg,
        fontWeight: 950,
        fontSize: 13.8,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.62 : 1,
        boxShadow: "0 10px 22px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span style={{ display: "grid", gap: 2, textAlign: "left" }}>
        <span>{label}</span>
        {subLabel ? <span style={{ fontSize: 11.2, fontWeight: 900, opacity: 0.78 }}>{subLabel}</span> : null}
      </span>
      <span style={{ fontWeight: 1000, fontSize: 16 }}>›</span>
    </button>
  );
}

function GhostButton({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,.12)",
        background:
          tone === "danger"
            ? "linear-gradient(180deg, rgba(255,90,90,.14), rgba(0,0,0,.28))"
            : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
        color: tone === "danger" ? "#ffb3b3" : "#f5f5f7",
        fontWeight: 950,
        fontSize: 12.4,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: "0 10px 20px rgba(0,0,0,.45)",
      }}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------
   Ticker (auto-défilement)
--------------------------------------------------*/
function OnlineTicker({
  items,
  speedSec = 22,
}: {
  items: Array<{ text: string; tone?: "gold" | "blue" | "green" | "red" | "orange" | "gray" }>;
  speedSec?: number;
}) {
  const css = `
  @keyframes dcTickerScroll {
    0% { transform: translate3d(0,0,0); }
    100% { transform: translate3d(-50%,0,0); }
  }`;

  const doubled = [...items, ...items];

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(1200px 180px at 20% 0%, rgba(var(--online-accent-rgb),.14), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,.55)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{css}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,.85), transparent 18%, transparent 82%, rgba(0,0,0,.85))",
          pointerEvents: "none",
          opacity: 0.95,
        }}
      />

      <div style={{ padding: "10px 10px 8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.2, opacity: 0.82 }}>LIVE FEED</div>
        <Pill label="AUTO" tone="blue" />
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(var(--online-accent-rgb),.55), rgba(79,180,255,.35), transparent)", opacity: 0.75 }} />

      <div style={{ position: "relative", overflow: "hidden", padding: "10px 0" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            paddingLeft: 12,
            whiteSpace: "nowrap",
            width: "max-content",
            animation: `dcTickerScroll ${speedSec}s linear infinite`,
          }}
        >
          {doubled.map((it, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.06)",
                boxShadow: "0 8px 18px rgba(0,0,0,.35)",
                fontSize: 12,
                fontWeight: 900,
                opacity: 0.95,
                maxWidth: "min(84vw, 410px)",
                minWidth: 0,
              }}
            >
              <Pill label="•" tone={it.tone || "gold"} />
              <span
                style={{
                  letterSpacing: 0.2,
                  display: "inline-block",
                  maxWidth: "min(78vw, 360px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  verticalAlign: "bottom",
                }}
              >
                {it.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   Match mini card
--------------------------------------------------*/
function MatchMiniCard({
  title,
  dateLabel,
  playersLabel,
  winner,
  kindTone,
}: {
  title: string;
  dateLabel: string;
  playersLabel: string;
  winner: string | null;
  kindTone: "gold" | "green" | "blue" | "gray" | "red" | "orange";
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 10,
        background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))",
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 10px 20px rgba(0,0,0,.45)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div
          style={{
            fontWeight: 950,
            fontSize: 12.5,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <Pill label={kindTone === "green" ? "Training" : "Match"} tone={kindTone} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 11, opacity: 0.82 }}>{dateLabel}</div>
        {winner ? <div style={{ fontSize: 11, color: "var(--online-accent)", fontWeight: 950 }}>🏆 {winner}</div> : null}
      </div>

      <div style={{ fontSize: 11, opacity: 0.88, lineHeight: 1.2 }}>{playersLabel}</div>
    </div>
  );
}


/* -------------------------------------------------
   Import d'un partage reçu dans l'historique local
--------------------------------------------------*/
function getShareImportableMatch(item: SharedOnlineItem): any | null {
  const payload: any = item?.payload || null;
  if (!payload) return null;
  const type = String(item?.type || "").toLowerCase();
  if (type === "match" || type === "score" || type === "snapshot") return payload;
  if (type === "stats" && payload?.lastMatch) return payload.lastMatch;
  if (payload?.match) return payload.match;
  if (payload?.lastMatch) return payload.lastMatch;
  return null;
}

function buildImportedHistoryRecord(item: SharedOnlineItem): any | null {
  const match = getShareImportableMatch(item);
  if (!match || typeof match !== "object") return null;

  const now = Date.now();
  const baseId = String(
    item.matchId ||
      match.matchId ||
      match.id ||
      match.payload?.matchId ||
      `shared_${item.id || now}`
  );
  const id = baseId.startsWith("shared_") ? baseId : `shared_${baseId}`;
  const createdRaw = match.createdAt || match.created_at || match.finishedAt || match.date || item.createdAt;
  const createdAt = typeof createdRaw === "number" ? createdRaw : Date.parse(String(createdRaw || ""));
  const players = Array.isArray(match.players)
    ? match.players
    : Array.isArray(match.payload?.players)
    ? match.payload.players
    : Array.isArray(match.summary?.players)
    ? match.summary.players
    : [];

  const kind = String(match.kind || match.game || match.mode || item.sport || "x01").toLowerCase();
  const status = String(match.status || match.payload?.status || "finished") === "in_progress" ? "finished" : "finished";

  return {
    ...match,
    id,
    matchId: id,
    kind: kind || "x01",
    game: match.game ?? match.mode ?? item.sport ?? null,
    status,
    players,
    winnerId: match.winnerId ?? match.winner?.id ?? match.result?.winnerId ?? null,
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
    updatedAt: now,
    summary: match.summary || match.result || match.stats || null,
    payload: {
      ...(match.payload && typeof match.payload === "object" ? match.payload : match),
      importedFromShare: true,
      importedShareId: item.id,
      importedShareTitle: item.title || null,
      importedShareOwner: item.ownerUser?.displayName || item.ownerUser?.nickname || null,
      importedAt: new Date(now).toISOString(),
    },
  };
}


/* -------------------------------------------------
   Détail d'un partage reçu
--------------------------------------------------*/
function ShareDetailsModal({
  item,
  onClose,
  onImport,
  importing = false,
}: {
  item: SharedOnlineItem;
  onClose: () => void;
  onImport?: (item: SharedOnlineItem) => void;
  importing?: boolean;
}) {
  const payload: any = item?.payload || {};
  const owner = item.ownerUser?.displayName || item.ownerUser?.nickname || "Ami";
  const kind = String(item.type || "partage");
  const isStats = kind === "stats";
  const last = payload?.lastMatch || null;
  const asDate = (v: any) => {
    const t = new Date(String(v || "")).getTime();
    return Number.isFinite(t) && t > 0 ? new Date(t).toLocaleDateString() : "—";
  };
  const titleOf = (m: any) => String(m?.title || m?.mode || m?.game || m?.sport || item.title || "Match partagé");
  const playersOf = (m: any) => {
    const players = Array.isArray(m?.players) ? m.players : Array.isArray(m?.payload?.players) ? m.payload.players : [];
    const names = players.map((p: any) => p?.name || p?.displayName || p?.nickname).filter(Boolean);
    return names.length ? names.slice(0, 4).join(" vs ") : "—";
  };
  const winnerOf = (m: any) => String(m?.winner?.name || m?.winnerName || m?.payload?.winnerName || m?.result?.winnerName || "").trim();
  const importableMatch = getShareImportableMatch(item);
  const canImport = !!importableMatch;

  const metrics = isStats
    ? [
        ["Joueur", payload?.playerName || owner],
        ["Matchs semaine", Number(payload?.weekMatchesCount || 0)],
        ["Avg 3D", Number(payload?.avg3DWeek || 0) > 0 ? fmt1(Number(payload.avg3DWeek)) : "—"],
        ["Checkout", Number(payload?.checkoutPctWeek || 0) > 0 ? `${fmt1(Number(payload.checkoutPctWeek))}%` : "—"],
      ]
    : [
        ["Sport", item.sport || payload?.sport || "darts"],
        ["Match", item.title || titleOf(payload)],
        ["Joueurs", playersOf(payload)],
        ["Vainqueur", winnerOf(payload) || "—"],
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.72)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(430px, 100%)",
          maxHeight: "82vh",
          overflow: "auto",
          borderRadius: 22,
          border: "1px solid rgba(var(--online-accent-rgb),.28)",
          background:
            "radial-gradient(140% 120% at 0% 0%, rgba(var(--online-accent-rgb),.16), transparent 48%), linear-gradient(180deg, rgba(25,25,32,.98), rgba(7,7,10,.99))",
          boxShadow: "0 24px 70px rgba(0,0,0,.78), 0 0 34px rgba(198,255,0,.13)",
          padding: 16,
          color: "#f5f5f7",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 1000, letterSpacing: 1 }}>PARTAGE REÇU</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000, color: "var(--online-accent)", lineHeight: 1.15 }}>
              {item.title || (isStats ? "Stats partagées" : "Match partagé")}
            </div>
            <div style={{ marginTop: 5, fontSize: 12.2, opacity: 0.82 }}>Envoyé par {owner}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 34,
              height: 34,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              fontWeight: 1000,
              cursor: "pointer",
              flexShrink: 0,
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          {metrics.map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.055)",
                padding: 10,
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 10.5, opacity: 0.72, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div>
              <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000, color: "#f5f5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {String(value ?? "—")}
              </div>
            </div>
          ))}
        </div>

        {last ? (
          <div style={{ marginTop: 12 }}>
            <MatchMiniCard
              title={titleOf(last)}
              dateLabel={asDate(last?.createdAt || last?.created_at || last?.date || item.createdAt)}
              playersLabel={playersOf(last)}
              winner={winnerOf(last) || null}
              kindTone="blue"
            />
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {canImport ? (
            <button
              type="button"
              onClick={() => onImport?.(item)}
              disabled={importing}
              style={{
                minHeight: 42,
                borderRadius: 14,
                border: "1px solid rgba(127,226,169,.34)",
                background: importing
                  ? "rgba(255,255,255,.08)"
                  : "linear-gradient(180deg, rgba(127,226,169,.22), rgba(127,226,169,.10))",
                color: "#dfffea",
                fontWeight: 1000,
                cursor: importing ? "default" : "pointer",
                boxShadow: "0 0 18px rgba(127,226,169,.12)",
              }}
            >
              {importing ? "Import en cours…" : "⬇️ Importer dans l’historique"}
            </button>
          ) : null}
          <div style={{ fontSize: 11.5, opacity: 0.72, lineHeight: 1.35 }}>
            Ce détail est lu depuis le partage NAS. Les matchs importés apparaissent ensuite dans l’historique local et peuvent alimenter les statistiques comme une partie terminée.
          </div>
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------
   Onglets ONLINE — ajout non destructif
   Objectif: conserver la page historique et restructurer l'affichage
   sans supprimer les blocs existants.
--------------------------------------------------*/
type OnlineMainTab = "hub" | "friends" | "requests" | "shares" | "play" | "activity" | "official";

type OnlineTabSpec = {
  id: OnlineMainTab;
  label: string;
  icon: string;
  hint: string;
  badge?: number | string | null;
  tone?: "gold" | "blue" | "green" | "red" | "orange" | "gray";
};
type OnlineGameModeId =
  | "babyfoot"
  | "x01"
  | "killer"
  | "shanghai"
  | "golf"
  | "cricket"
  | "warfare"
  | "battle_royale"
  | "territories"
  | "capital"
  | "batard"
  | "scram"
  | "five_lives"
  | "clock";

type OnlineGameModeSpec = {
  id: OnlineGameModeId;
  label: string;
  shortLabel: string;
  icon: string;
  route: string;
  hint: string;
  tickerKey?: string;
  favorite?: boolean;
};

const LS_ONLINE_SELECTED_MODE_KEY = "dc_online_selected_mode_v1";
const LS_BABYFOOT_ONLINE_SCOPE_KEY = "dc_babyfoot_online_scope_v1";

type BabyFootOnlineScope = "match" | "league" | "tournament";

type BabyFootOnlineScopeSpec = {
  id: BabyFootOnlineScope;
  label: string;
  shortLabel: string;
  icon: string;
  createHint: string;
  joinHint: string;
};

const BABYFOOT_ONLINE_SCOPES: BabyFootOnlineScopeSpec[] = [
  {
    id: "match",
    label: "Match classique",
    shortLabel: "Match",
    icon: "⚽",
    createHint: "Salon Baby-Foot simple",
    joinHint: "Rejoindre un match avec un code salon",
  },
  {
    id: "league",
    label: "Ligue",
    shortLabel: "Ligue",
    icon: "🏆",
    createHint: "Salon lié à une ligue",
    joinHint: "Rejoindre une ligue ou un match de ligue",
  },
  {
    id: "tournament",
    label: "Tournoi",
    shortLabel: "Tournoi",
    icon: "🏅",
    createHint: "Salon lié à un tournoi",
    joinHint: "Rejoindre un tournoi ou un match de tournoi",
  },
];

function getBabyFootOnlineScopeSpec(scope: any): BabyFootOnlineScopeSpec {
  const id = String(scope || "match").toLowerCase();
  return BABYFOOT_ONLINE_SCOPES.find((item) => item.id === id) || BABYFOOT_ONLINE_SCOPES[0];
}

function loadBabyFootOnlineScope(): BabyFootOnlineScope {
  if (typeof window === "undefined") return "match";
  try {
    const raw = String(window.localStorage.getItem(LS_BABYFOOT_ONLINE_SCOPE_KEY) || "match").toLowerCase();
    return getBabyFootOnlineScopeSpec(raw).id;
  } catch {
    return "match";
  }
}

function saveBabyFootOnlineScope(scope: BabyFootOnlineScope) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(LS_BABYFOOT_ONLINE_SCOPE_KEY, scope); } catch {}
}

const ONLINE_GAME_MODES: OnlineGameModeSpec[] = [
  { id: "babyfoot", label: "Baby-Foot", shortLabel: "Baby-Foot", icon: "⚽", route: "babyfoot_config", hint: "1v1 / 2v2 / 2v1 en ligne", tickerKey: "babyfoot_match", favorite: true },
  { id: "battle_royale", label: "Battle Royale", shortLabel: "Battle", icon: "👑", route: "battle_royale", hint: "Survie multi-joueurs", tickerKey: "ticker_battle_royale", favorite: true },
  { id: "x01", label: "X01", shortLabel: "X01", icon: "🎯", route: "x01_online_setup", hint: "501 / 301 / sets / legs", tickerKey: "x01", favorite: true },
  { id: "batard", label: "Bâtard", shortLabel: "Bâtard", icon: "😈", route: "batard_config", hint: "Mode fun / gages", tickerKey: "ticker_batard_players" },
  { id: "capital", label: "Capital", shortLabel: "Capital", icon: "🏛️", route: "capital_config", hint: "Défis capitales", tickerKey: "capital" },
  { id: "clock", label: "Tour de l’horloge", shortLabel: "Horloge", icon: "🕒", route: "training_clock", hint: "Progression autour du board", tickerKey: "clock" },
  { id: "cricket", label: "Cricket", shortLabel: "Cricket", icon: "🏏", route: "cricket", hint: "Classique / variantes", tickerKey: "cricket" },
  { id: "five_lives", label: "Les 5 vies", shortLabel: "5 vies", icon: "❤️", route: "five_lives_config", hint: "Survie en 5 vies", tickerKey: "five_lives" },
  { id: "golf", label: "Golf", shortLabel: "Golf", icon: "⛳", route: "golf_config", hint: "Par, birdie, eagle", tickerKey: "golf" },
  { id: "killer", label: "Killer", shortLabel: "Killer", icon: "💀", route: "killer_config", hint: "Cibles, vies, variantes", tickerKey: "ticker_killer", favorite: true },
  { id: "scram", label: "SCRAM", shortLabel: "SCRAM", icon: "🚧", route: "scram_config", hint: "Bloquer / scorer", tickerKey: "scram" },
  { id: "shanghai", label: "Shanghai", shortLabel: "Shanghai", icon: "🏮", route: "shanghai", hint: "Tours 1 à 20", tickerKey: "shanghai" },
  { id: "territories", label: "Territories", shortLabel: "Territories", icon: "🗺️", route: "departements_config", hint: "Cartes / conquête", tickerKey: "territories" },
  { id: "warfare", label: "Warfare", shortLabel: "Warfare", icon: "⚔️", route: "warfare_config", hint: "Mode attaque", tickerKey: "warfare" },
];

const SORTED_ONLINE_GAME_MODES: OnlineGameModeSpec[] = [...ONLINE_GAME_MODES].sort((a, b) => {
  if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
  return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
});

function getOnlineModeTicker(mode: OnlineGameModeSpec): string | null {
  return (
    getTicker(mode.tickerKey || mode.id) ||
    getTicker(`ticker_${mode.id}`) ||
    getTicker(mode.id) ||
    getTicker("dice_games")
  );
}

function getOnlineModeSpec(mode: any): OnlineGameModeSpec {
  const id = String(mode || "x01") as OnlineGameModeId;
  return ONLINE_GAME_MODES.find((m) => m.id === id) || ONLINE_GAME_MODES[0];
}

function loadSelectedOnlineMode(): OnlineGameModeId {
  if (typeof window === "undefined") return "x01";
  try {
    const raw = window.localStorage.getItem(LS_ONLINE_SELECTED_MODE_KEY);
    return getOnlineModeSpec(raw).id;
  } catch {
    return "x01";
  }
}

function saveSelectedOnlineMode(mode: OnlineGameModeId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ONLINE_SELECTED_MODE_KEY, mode);
  } catch {}
}


function sortOnlineDartSetsForPicker(list: DartSet[]): DartSet[] {
  return (Array.isArray(list) ? list : [])
    .slice()
    .sort((a: any, b: any) => {
      const favA = a?.isFavorite ? 1 : 0;
      const favB = b?.isFavorite ? 1 : 0;
      if (favA !== favB) return favB - favA;
      const usageA = Number(a?.usageCount || 0);
      const usageB = Number(b?.usageCount || 0);
      if (usageA !== usageB) return usageB - usageA;
      return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
}

function getOnlineDartSetThumbSrc(set: any): string | null {
  if (!set) return null;
  const candidates = [
    set.thumbImageUrl,
    set.mainImageUrl,
    set.photoThumbDataUrl,
    set.thumbDataUrl,
    set.thumbImageDataUrl,
    set.photoDataUrl,
    set.imageDataUrl,
    set.mainImageDataUrl,
    set.dartSetImageDataUrl,
    set.thumb,
    set.imageUrl,
    set.image,
    set.previewImageUrl,
    set.preview,
  ];
  for (const raw of candidates) {
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v) return v;
  }
  return null;
}

function OnlineDartSetPickerOverlay({
  open,
  profileId,
  value,
  accent,
  onClose,
  onChange,
}: {
  open: boolean;
  profileId?: string | null;
  value?: string | null;
  accent: string;
  onClose: () => void;
  onChange: (id: string | null) => void;
}) {
  const [sets, setSets] = React.useState<DartSet[]>([]);

  React.useEffect(() => {
    if (!open || !profileId) return;
    try {
      setSets(sortOnlineDartSetsForPicker(getDartSetsForProfile(profileId) || []));
    } catch {
      setSets([]);
    }
  }, [open, profileId]);

  if (!open || !profileId) return null;

  const selectSet = (id: string | null) => {
    onChange(id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.70)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 430px)",
          maxHeight: "78vh",
          overflow: "hidden",
          borderRadius: 24,
          border: `1px solid ${accent}66`,
          background: "linear-gradient(180deg, rgba(16,18,32,.98), rgba(5,6,13,.98))",
          boxShadow: `0 0 34px ${accent}44, 0 24px 70px rgba(0,0,0,.75)`,
          padding: 14,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ color: accent, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", fontSize: 15 }}>
            Choisir mon dartset
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.16)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            maxHeight: "calc(78vh - 86px)",
            overflowY: "auto",
            paddingRight: 2,
          }}
          className="dc-scroll-thin"
        >
          <button
            type="button"
            onClick={() => selectSet(null)}
            style={{
              borderRadius: 18,
              border: !value ? `2px solid ${accent}` : "1px solid rgba(255,255,255,.12)",
              background: !value ? `radial-gradient(circle at 50% 0%, ${accent}30, rgba(12,13,23,.98))` : "rgba(255,255,255,.04)",
              color: "#fff",
              minHeight: 106,
              padding: 8,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>⛔</span>
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Aucun set</span>
          </button>

          {sets.map((set: any) => {
            const thumb = getOnlineDartSetThumbSrc(set);
            const selected = String(set?.id) === String(value || "");
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => selectSet(set.id)}
                style={{
                  position: "relative",
                  borderRadius: 18,
                  border: selected ? `2px solid ${accent}` : "1px solid rgba(255,255,255,.12)",
                  background: selected ? `radial-gradient(circle at 50% 0%, ${accent}30, rgba(12,13,23,.98))` : "rgba(255,255,255,.04)",
                  color: "#fff",
                  padding: 8,
                  cursor: "pointer",
                  boxShadow: selected ? `0 0 18px ${accent}55` : "0 10px 22px rgba(0,0,0,.35)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  minWidth: 0,
                }}
              >
                {set?.isFavorite ? (
                  <span style={{ position: "absolute", top: 6, left: 8, color: "#ffd76a", textShadow: "0 0 10px #ffd76a" }}>★</span>
                ) : null}
                <span
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 15,
                    overflow: "hidden",
                    background: set?.bgColor || "rgba(255,255,255,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 26 }}>🎯</span>}
                </span>
                <span
                  style={{
                    width: "100%",
                    fontSize: 10,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {set?.name || "SET"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function OnlineTabIcon({ id, size = 30, color = "currentColor" }: { id: OnlineMainTab; size?: number; color?: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.15, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      {id === "hub" ? <><path {...common} d="M13 2 4 14h7l-1 8 10-13h-7V2Z" /></> : null}
      {id === "play" ? <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M12 12 17 7" /><path {...common} d="M17 7h-4" /><path {...common} d="M17 7v4" /></> : null}
      {id === "friends" ? <><path {...common} d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path {...common} d="M3.5 19c.8-3 2.4-4.6 5-4.6s4.2 1.6 5 4.6" /><path {...common} d="M16.5 11.5a2.6 2.6 0 1 0 0-5.2" /><path {...common} d="M15.4 14.5c2.2.2 3.8 1.7 4.6 4.2" /></> : null}
      {id === "requests" ? <><path {...common} d="M4 7h16v11H4z" /><path {...common} d="m4 8 8 5.7L20 8" /></> : null}
      {id === "shares" ? <><path {...common} d="M7 17h10" /><path {...common} d="M8 17V9h8v8" /><path {...common} d="M10 9V6h4v3" /><path {...common} d="M12 12v3" /><path {...common} d="M10.5 13.5h3" /></> : null}
      {id === "activity" ? <><path {...common} d="M5 19V9" /><path {...common} d="M12 19V5" /><path {...common} d="M19 19v-7" /><path {...common} d="M3.5 19.5h17" /></> : null}
      {id === "official" ? <><path {...common} d="M8 21h8" /><path {...common} d="M12 17v4" /><path {...common} d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path {...common} d="M7 6H4a3 3 0 0 0 3 3" /><path {...common} d="M17 6h3a3 3 0 0 1-3 3" /></> : null}
    </svg>
  );
}

function OnlineTabsBar({
  tabs,
  active,
  onChange,
}: {
  tabs: OnlineTabSpec[];
  active: OnlineMainTab;
  onChange: (tab: OnlineMainTab) => void;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 12,
        borderRadius: 22,
        padding: 8,
        border: "1px solid rgba(var(--online-accent-rgb),.28)",
        background:
          "radial-gradient(900px 150px at 10% 0%, rgba(var(--online-accent-rgb),.18), transparent 60%), linear-gradient(180deg, rgba(7,13,27,.96), rgba(3,7,16,.96))",
        boxShadow: "0 16px 38px rgba(0,0,0,.62), 0 0 28px rgba(var(--online-accent-rgb),.18)",
        backdropFilter: "blur(12px)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "minmax(92px, 1fr)",
          gap: 8,
          minWidth: 650,
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          const accent = "var(--online-accent)";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                position: "relative",
                minHeight: 88,
                borderRadius: 18,
                padding: "9px 8px",
                border: selected ? "1px solid var(--online-accent)" : "1px solid rgba(var(--online-accent-rgb),.18)",
                background: selected
                  ? "linear-gradient(180deg, rgba(var(--online-accent-rgb),.28), rgba(var(--online-accent-rgb),.08))"
                  : "linear-gradient(180deg, rgba(var(--online-accent-rgb),.08), rgba(0,0,0,.22))",
                color: "#f5f5f7",
                cursor: "pointer",
                boxShadow: selected
                  ? "0 0 26px rgba(var(--online-accent-rgb),.55), 0 10px 22px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.07)"
                  : "0 8px 18px rgba(0,0,0,.32), inset 0 0 0 1px rgba(255,255,255,.025)",
                textAlign: "center",
                display: "grid",
                justifyItems: "center",
                alignContent: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  color: accent,
                  background: selected ? "rgba(var(--online-accent-rgb),.16)" : "rgba(var(--online-accent-rgb),.07)",
                  filter: selected ? "drop-shadow(0 0 10px rgba(var(--online-accent-rgb),.85))" : "drop-shadow(0 0 5px rgba(var(--online-accent-rgb),.45))",
                }}
              >
                <OnlineTabIcon id={tab.id} />
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 1000,
                  letterSpacing: 0.15,
                  color: selected ? accent : "rgba(255,255,255,.88)",
                  textShadow: selected ? "0 0 12px rgba(var(--online-accent-rgb),.72)" : "none",
                }}
              >
                {tab.label}
              </span>
              {tab.badge != null && tab.badge !== "" ? (
                <span
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    minWidth: 21,
                    height: 21,
                    padding: "0 6px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(var(--online-accent-rgb),.38)",
                    color: accent,
                    fontSize: 10.5,
                    fontWeight: 1000,
                  }}
                >
                  {tab.badge}
                </span>
              ) : null}
              {selected ? <span style={{ position: "absolute", left: 15, right: 15, bottom: 5, height: 3, borderRadius: 999, background: accent, boxShadow: "0 0 14px rgba(var(--online-accent-rgb),.9)" }} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OnlineEmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <NeonCard style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ color: "var(--online-accent)", fontWeight: 1000, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12.4, opacity: 0.82, lineHeight: 1.35 }}>{text}</div>
      </div>
    </NeonCard>
  );
}

/* -------------------------------------------------
   Composant principal
--------------------------------------------------*/
type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
  initialOnlineTab?: OnlineMainTab;
};


function OfficialCompetitionsPanel({
  rating,
  matches,
  country,
  goPlay,
}: {
  rating: number;
  matches: number;
  country?: string | null;
  goPlay: () => void;
}) {
  const safeCountry = String(country || "").trim() || "pays du profil";
  const leagueSize = 32;
  const seasonWeeks = 8;
  const divisions = [
    {
      id: "world",
      label: "Compétition mondiale",
      icon: "🌍",
      scope: "Monde entier",
      desc: "Classement global X01 501 Double Out, divisions alimentées avec tous les inscrits.",
    },
    {
      id: "continent",
      label: "Compétition continent",
      icon: "🧭",
      scope: "Auto selon ton pays",
      desc: "Affectation automatique par continent à partir du pays choisi dans le profil.",
    },
    {
      id: "country",
      label: "Compétition par pays",
      icon: "🏳️",
      scope: safeCountry,
      desc: "Ligues nationales créées automatiquement. Si une ligue est pleine, une nouvelle division du même niveau est ouverte.",
    },
  ];

  const leagues = [
    { id: "bronze", name: "Bronze", range: "0–39 Avg3D", required: 0, promote: "Top 6", relegate: "—" },
    { id: "silver", name: "Argent", range: "40–54 Avg3D", required: 40, promote: "Top 5", relegate: "Bottom 5" },
    { id: "gold", name: "Or", range: "55–69 Avg3D", required: 55, promote: "Top 4", relegate: "Bottom 5" },
    { id: "elite", name: "Élite", range: "70+ Avg3D", required: 70, promote: "Finales", relegate: "Bottom 6" },
  ];
  const current = leagues.slice().reverse().find((l) => rating >= l.required) || leagues[0];

  const rules = [
    `Divisions de ${leagueSize} joueurs maximum par ligue.`,
    `Inscription ouverte à tout moment : placement automatique selon Avg3D Online.`,
    `Saison de ${seasonWeeks} semaines, X01 501 Double Out fixe.`,
    "Victoire 3 pts · défaite 0 pt · forfait -1 pt.",
    "Départage : différence de legs, Avg3D, checkout %, meilleur CO.",
    "Montées/descentes automatiques à la fin de saison selon le rang.",
  ];

  return (
    <>
      <SectionTitle
        title="Compétitions officielles"
        subtitle="Mondiale · Continent · Pays — ligues X01 501 Double Out automatisées"
        right={<Pill label={`Ta ligue : ${current.name}`} tone="blue" />}
      />

      <NeonCard style={{ marginTop: 10, padding: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              border: "1px solid rgba(var(--online-accent-rgb),.36)",
              background: "linear-gradient(180deg, rgba(var(--online-accent-rgb),.16), rgba(0,0,0,.30))",
              boxShadow: "0 0 22px rgba(var(--online-accent-rgb),.14)",
            }}
          >
            <div style={{ color: "var(--online-accent)", fontWeight: 1000, fontSize: 15 }}>
              Placement automatique : Ligue {current.name}
            </div>
            <div style={{ marginTop: 5, fontSize: 12, opacity: 0.84, lineHeight: 1.35 }}>
              Base de calcul : Avg3D Online {rating ? rating.toFixed(1) : "—"} · {matches} match(s) compté(s).
              Les compétitions utilisent ton pays de profil pour t’inscrire automatiquement au bon continent et au bon pays.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {divisions.map((scope) => (
              <div
                key={scope.id}
                style={{
                  borderRadius: 16,
                  padding: 10,
                  border: "1px solid rgba(var(--online-accent-rgb),.24)",
                  background: "linear-gradient(180deg, rgba(var(--online-accent-rgb),.09), rgba(0,0,0,.22))",
                  minWidth: 0,
                }}
              >
                <div style={{ color: "var(--online-accent)", fontWeight: 1000, fontSize: 18 }}>{scope.icon}</div>
                <div style={{ marginTop: 5, color: "#fff", fontWeight: 1000, fontSize: 11.5, lineHeight: 1.12 }}>{scope.label}</div>
                <div style={{ marginTop: 4, color: "var(--online-accent)", fontSize: 10.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scope.scope}</div>
                <div style={{ marginTop: 6, fontSize: 10.5, opacity: 0.74, lineHeight: 1.25 }}>{scope.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {leagues.map((league) => {
              const unlocked = rating >= league.required || league.required === 0;
              const active = league.id === current.id;
              return (
                <div
                  key={league.id}
                  style={{
                    borderRadius: 16,
                    padding: 10,
                    border: active ? "1px solid var(--online-accent)" : "1px solid rgba(var(--online-accent-rgb),.20)",
                    background: active
                      ? "linear-gradient(180deg, rgba(var(--online-accent-rgb),.18), rgba(0,0,0,.28))"
                      : "linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.18))",
                    boxShadow: active ? "0 0 18px rgba(var(--online-accent-rgb),.24)" : "none",
                    opacity: unlocked ? 1 : 0.58,
                  }}
                >
                  <div style={{ color: active ? "var(--online-accent)" : "#f5f5f7", fontWeight: 1000, fontSize: 12.5 }}>Ligue {league.name}</div>
                  <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 900, opacity: 0.75 }}>{league.range}</div>
                  <div style={{ marginTop: 6, display: "grid", gap: 3, fontSize: 10.5, lineHeight: 1.22, opacity: 0.8 }}>
                    <span>👥 {leagueSize} joueurs max / division</span>
                    <span>⬆️ Montée : {league.promote}</span>
                    <span>⬇️ Descente : {league.relegate}</span>
                  </div>
                  <div style={{ marginTop: 7 }}>
                    <Pill label={active ? "Ta ligue" : unlocked ? "Accessible" : "Verrouillée"} tone={active || unlocked ? "blue" : "gray"} />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 10,
              border: "1px solid rgba(var(--online-accent-rgb),.22)",
              background: "rgba(255,255,255,.035)",
              fontSize: 11.5,
              lineHeight: 1.35,
              opacity: 0.9,
              display: "grid",
              gap: 5,
            }}
          >
            {rules.map((rule) => <div key={rule}>• {rule}</div>)}
          </div>

          <PrimaryButton label="🏆 S'inscrire / jouer une ligue officielle" subLabel="Mondiale · Continent · Pays" onClick={goPlay} />
        </div>
      </NeonCard>
    </>
  );
}

export default function FriendsPage({ store, update, go, initialOnlineTab }: Props) {
  const { theme } = useTheme();
  const onlineAccent = theme?.primary || "#22E6FF";
  const onlineAccentRgb = hexToRgbParts(onlineAccent);
  const onlineAccentDark = darkenHex(onlineAccent);
  const onlineBg = theme?.bg || "#020611";
  const sportCtx = useSport() as any;
  const activeSportId = String(sportCtx?.sport || "darts").toLowerCase();
  const onlineModesForSport = React.useMemo(() => {
    if (activeSportId === "babyfoot") return SORTED_ONLINE_GAME_MODES.filter((mode) => mode.id === "babyfoot");
    return SORTED_ONLINE_GAME_MODES.filter((mode) => mode.id !== "babyfoot");
  }, [activeSportId]);

  // Profil actif local
  const activeProfile =
    (store.profiles || []).find((p: any) => p.id === (store as any).activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  // Hook online (ne pas bloquer sur profile !)
  const auth = useAuthOnline() as any;
  const ready = !!auth.ready;

  // ---------------------------------------------------------------------------
  // ✅ Session state (source unique)
  // Certains anciens patches utilisaient "sessionState" (UI / gating).
  // Vite/esbuild ne typecheck pas : une variable manquante compile mais plante
  // au runtime (ReferenceError). On normalise donc ici.
  const sessionState: string =
    auth?.status ?? auth?.sessionState ?? auth?.state ?? (ready ? "signed_out" : "loading");
  const isSignedIn = sessionState === "signed_in";
  const sessionUserId = (auth?.user?.id ?? (auth as any)?.userId ?? null) as string | null;


  // Présence locale (uniquement UI)
  const initialPresence = React.useMemo(() => loadPresenceFromLS(), []);
  const [lastSeen, setLastSeen] = React.useState<number | null>(initialPresence?.lastSeen ?? null);

  const selfStatus: PresenceStatus = ((store as any).selfStatus as PresenceStatus) || "offline";
  const lastSeenLabel = formatLastSeenAgo(lastSeen);

  // Identité affichée (jamais d’email visible)
  const displayName =
    activeProfile?.name ||
    auth?.profile?.displayName ||
    auth?.profile?.display_name ||
    auth?.user?.nickname ||
    "Joueur";

  const privateInfo = ((activeProfile as any)?.privateInfo || {}) as any;
  const countryRaw = privateInfo.country || "";
  const countryFlag = getCountryFlag(countryRaw);

  const avatarUrl =
    (activeProfile as any)?.avatarDataUrl ||
    (activeProfile as any)?.avatarUrl ||
    (activeProfile as any)?.avatar ||
    null;

  /* -----------------------------
     Serveur status (ping)
  ------------------------------ */
  const [serverState, setServerState] = React.useState<"checking" | "ok" | "down">("checking");
  const [serverHint, setServerHint] = React.useState<string | null>(null);

  const pingServer = React.useCallback(async () => {
    setServerState("checking");
    try {
      const ping = (onlineApi as any)?.ping as undefined | (() => Promise<any>);
      if (!ping) {
        setServerState("ok");
        return;
      }
      await withTimeout(ping(), 4500, "Ping serveur: délai dépassé.");
      setServerState("ok");
      setServerHint(null);
    } catch (e: any) {
      setServerState("down");
      setServerHint(normalizeErrMessage(e));
    }
  }, []);

  React.useEffect(() => {
    pingServer().catch(() => {});
    const id = window.setInterval(() => pingServer().catch(() => {}), 25_000);
    return () => window.clearInterval(id);
  }, [pingServer]);
  /* -----------------------------
     Étape 4 — règle finale
  ------------------------------ */
  const canPlayOnline = isSignedIn;

  /* -----------------------------
     Realtime Presence (join + map + setState)
  ------------------------------ */
  const [presenceMap, setPresenceMap] = React.useState<Record<string, any>>({});
  const presenceRef = React.useRef<{
    leave: () => Promise<void>;
    setState: (s: any) => Promise<void>;
  } | null>(null);

  function setPresence(newStatus: PresenceStatus) {
    update((st) => ({ ...st, selfStatus: newStatus as any }));
    savePresenceToLS(newStatus);
    setLastSeen(Date.now());

    // ✅ sync realtime presence + API NAS friends/presence
    presenceRef.current?.setState(newStatus === "away" ? "away" : "online").catch(() => {});
    if (isSignedIn) {
      updatePresence(newStatus).catch(() => {});
    }
  }

  // Ping présence toutes les 30s quand "online"
  React.useEffect(() => {
    if (selfStatus !== "online") return;
    const id = window.setInterval(() => {
      savePresenceToLS("online");
      setLastSeen(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [selfStatus]);

  // ✅ join realtime presence quand signed_in
  React.useEffect(() => {
    let stop = false;

    async function run() {
      if (!isSignedIn || !sessionUserId) return;

      const p = await joinPresence({
        userId: sessionUserId,
        name: displayName,
        state: selfStatus === "away" ? "away" : "online",
        onChange: (map: any) => {
          if (!stop) setPresenceMap(map || {});
        },
      });

      presenceRef.current = p;
    }

    run().catch(() => {});
    return () => {
      stop = true;
      presenceRef.current?.leave?.().catch(() => {});
      presenceRef.current = null;
    };
  }, [isSignedIn, sessionUserId, displayName, selfStatus]);

  /* -----------------------------
     Connexion / Déconnexion / Reconnexion
  ------------------------------ */
  const [authHint, setAuthHint] = React.useState<string | null>(null);
  const [reconnecting, setReconnecting] = React.useState(false);

  const doReconnect = React.useCallback(async () => {
  if (reconnecting) return;
  setReconnecting(true);
  setAuthHint(null);
  try {
    // ✅ Pas d'auto-session ici. Supabase est la source de vérité.
    const refresh = auth?.refresh as undefined | (() => Promise<any>);
    if (refresh) await refresh().catch((e: any) => setAuthHint(normalizeErrMessage(e)));

    await pingServer();
    setAuthHint((prev) => prev || "Session vérifiée.");
  } catch (e: any) {
    setAuthHint(normalizeErrMessage(e));
  } finally {
    setReconnecting(false);
  }
}, [reconnecting, auth, pingServer]);

const doLogout = React.useCallback(async () => {
  setAuthHint(null);
  try {
    const logout = auth?.logout as undefined | (() => Promise<any>);
    if (logout) await logout();
    setAuthHint("Déconnecté.");
  } catch (e: any) {
    setAuthHint(normalizeErrMessage(e));
  }
}, [auth]);


  // auto-try au montage + au focus
  React.useEffect(() => {
    doReconnect().catch(() => {});
    const onVis = () => {
      if (document.visibilityState === "visible") doReconnect().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     Matches online
  ------------------------------ */
  const [matches, setMatches] = React.useState<OnlineMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMatches(true);
      try {
        const [serverList, historyList] = await Promise.all([
          onlineApi.listMatches(50).catch(() => [] as any[]),
          loadOnlineHubMatchesFromHistoryAndCache(),
        ]);
        const merged = new Map<string, any>();
        for (const row of [...(Array.isArray(serverList) ? serverList : []), ...(Array.isArray(historyList) ? historyList : [])]) {
          const normalized = normalizeOnlineHistoryForHub(row) || row;
          if (!normalized) continue;
          merged.set(onlineHubMatchKey(normalized), normalized);
        }
        const cleanList = filterOnlineStatsHardDeleted(Array.from(merged.values()));
        if (!cancelled) {
          setMatches(cleanList || []);
          try {
            window.localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(cleanList || []));
          } catch {}
        }
      } catch {
        if (!cancelled) {
          const fallback = await loadOnlineHubMatchesFromHistoryAndCache().catch(() => []);
          setMatches(fallback || []);
        }
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    }
    load();
    const onCleanupChanged = () => load();
    window.addEventListener("dc-online-matches-deleted", onCleanupChanged);
    window.addEventListener("dc-online-stats-exclusions-changed", onCleanupChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("dc-online-matches-deleted", onCleanupChanged);
      window.removeEventListener("dc-online-stats-exclusions-changed", onCleanupChanged);
    };
  }, []);

  function handleClearOnlineHistory() {
    try {
      window.localStorage.removeItem(LS_ONLINE_MATCHES_KEY);
    } catch {}
    setMatches([]);
  }

  function getMatchTitle(m: OnlineMatch): string {
    const isTraining = (m as any).isTraining === true || (m as any)?.payload?.kind === "training_x01";
    if ((m as any).mode === "x01") return isTraining ? "X01 Training" : "X01 (match)";
    return (m as any).mode || "Match";
  }
  function formatMatchDate(m: OnlineMatch): string {
    const ts = (m as any).finishedAt || (m as any).startedAt || (m as any).createdAt;
    const d = new Date(ts);
    return d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function getMatchPlayersLabel(m: OnlineMatch): string {
    const players = ((m as any).players || []) as any[];
    if (!players.length) return "Joueurs inconnus";
    if (players.length === 1) return players[0].name || "Solo";
    if (players.length === 2) return `${players[0].name} vs ${players[1].name}`;
    return players.map((p) => p.name).join(" · ");
  }
  function getMatchWinnerLabel(m: OnlineMatch): string | null {
    const winnerId = (m as any).winnerId;
    if (!winnerId) return null;
    const found = ((m as any).players || []).find((p: any) => p.id === winnerId);
    return found?.name || null;
  }

  /* -----------------------------
     Lobby create/join + anti-freeze
  ------------------------------ */
  const [creatingLobby, setCreatingLobby] = React.useState(false);
  const [lastCreatedLobby, setLastCreatedLobby] = React.useState<OnlineLobby | null>(null);

  const [joinCode, setJoinCode] = React.useState("");
  const [joiningLobby, setJoiningLobby] = React.useState(false);
  const [joinedLobby, setJoinedLobby] = React.useState<OnlineLobby | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinInfo, setJoinInfo] = React.useState<string | null>(null);
  const [copyInfo, setCopyInfo] = React.useState<string | null>(null);
  const [selectedOnlineMode, setSelectedOnlineMode] = React.useState<OnlineGameModeId>(() => loadSelectedOnlineMode());
  const [selectedBabyFootOnlineScope, setSelectedBabyFootOnlineScope] = React.useState<BabyFootOnlineScope>(() => loadBabyFootOnlineScope());
  const selectedBabyFootOnlineScopeSpec = React.useMemo(() => getBabyFootOnlineScopeSpec(selectedBabyFootOnlineScope), [selectedBabyFootOnlineScope]);
  const safeSelectedOnlineMode: OnlineGameModeId =
    activeSportId === "babyfoot"
      ? "babyfoot"
      : selectedOnlineMode === "babyfoot"
      ? "x01"
      : selectedOnlineMode;
  const selectedOnlineModeSpec = React.useMemo(() => getOnlineModeSpec(safeSelectedOnlineMode), [safeSelectedOnlineMode]);

  React.useEffect(() => {
    if (activeSportId === "babyfoot" && selectedOnlineMode !== "babyfoot") {
      setSelectedOnlineMode("babyfoot");
      saveSelectedOnlineMode("babyfoot");
    } else if (activeSportId !== "babyfoot" && selectedOnlineMode === "babyfoot") {
      setSelectedOnlineMode("x01");
      saveSelectedOnlineMode("x01");
    }
  }, [activeSportId, selectedOnlineMode]);

  const [activeOnlineResume, setActiveOnlineResume] = React.useState<any | null>(() => loadActiveOnlineResume());

  React.useEffect(() => {
    const refreshResume = () => setActiveOnlineResume(loadActiveOnlineResume());
    refreshResume();
    window.addEventListener("focus", refreshResume);
    document.addEventListener("visibilitychange", refreshResume);
    return () => {
      window.removeEventListener("focus", refreshResume);
      document.removeEventListener("visibilitychange", refreshResume);
    };
  }, []);

  async function resumeActiveOnlineMatch() {
    const saved = loadActiveOnlineResume();
    const code = String(saved?.lobbyCode || saved?.params?.lobbyCode || "").trim().toUpperCase();
    if (!saved || !code) {
      setJoinError("Aucune partie online à reprendre.");
      setActiveOnlineResume(null);
      return;
    }
    try {
      const row = await onlineApi.fetchMatchByCode(code).catch(() => null as any);
      const state = (row as any)?.state_json || (row as any)?.state || null;
      const liveStatus = String((row as any)?.status || (state as any)?.status || "").toLowerCase();
      if (liveStatus === "ended" || liveStatus === "finished" || liveStatus === "match_end" || liveStatus === "closed") {
        clearActiveOnlineResume(code);
        setActiveOnlineResume(null);
        setJoinInfo("Cette partie online est terminée. Elle reste disponible dans l’historique/statistiques.");
        return;
      }
      const liveMode = String((state as any)?.onlineMode || (state as any)?.mode || saved?.onlineMode || saved?.mode || "x01").toLowerCase();
      const params = {
        ...(saved.params || {}),
        ...(state && typeof state === "object" ? state : {}),
        online: true,
        onlineMode: liveMode === "babyfoot" ? "babyfoot" : "x01",
        mode: liveMode === "babyfoot" ? "babyfoot" : "x01",
        lobbyCode: code,
        fresh: Date.now(),
      };
      if ((state as any)?.config) params.config = { ...(state as any).config, online: true, onlineMode: params.onlineMode, lobbyCode: code };
      if ((state as any)?.players) params.players = (state as any).players;
      go?.(liveMode === "babyfoot" ? "babyfoot_play" : "x01_play_v3", params);
    } catch (e: any) {
      setJoinError(normalizeErrMessage(e) || "Impossible de reprendre la partie online.");
    }
  }

  function selectOnlineMode(mode: OnlineGameModeId) {
    setSelectedOnlineMode(mode);
    saveSelectedOnlineMode(mode);
    setJoinInfo(null);
    setJoinError(null);
  }

  function selectBabyFootOnlineScope(scope: BabyFootOnlineScope) {
    setSelectedBabyFootOnlineScope(scope);
    saveBabyFootOnlineScope(scope);
    setJoinInfo(null);
    setJoinError(null);
  }

  const createReqIdRef = React.useRef(0);
  const joinReqIdRef = React.useRef(0);

  function requireSignedInOrExplain(): boolean {
    if (canPlayOnline) return true;
    setJoinError("Connexion requise. Va dans “Mon profil” pour te connecter.");
    return false;
  }

  async function handleCreateLobby() {
    if (creatingLobby) return;
    if (!requireSignedInOrExplain()) return;

    const reqId = ++createReqIdRef.current;
    setCreatingLobby(true);
    setJoinInfo(null);
    setJoinError(null);

    try {
      const isBabyFootOnline = selectedOnlineModeSpec.id === "babyfoot";
      const babyFootScope = isBabyFootOnline ? selectedBabyFootOnlineScopeSpec.id : null;
      const babyFootScopeLabel = isBabyFootOnline ? selectedBabyFootOnlineScopeSpec.label : null;
      const lobby = await withTimeout(
        onlineApi.createLobby({
          mode: selectedOnlineModeSpec.id,
          maxPlayers: selectedOnlineModeSpec.id === "x01" ? 2 : selectedOnlineModeSpec.id === "babyfoot" ? 4 : 8,
          settings: {
            mode: selectedOnlineModeSpec.id,
            label: isBabyFootOnline ? `Baby-Foot · ${babyFootScopeLabel}` : selectedOnlineModeSpec.label,
            route: selectedOnlineModeSpec.route,
            sport: isBabyFootOnline ? "babyfoot" : "darts",
            babyfootOnlineScope: babyFootScope,
            competitionScope: babyFootScope,
            competitionKind: babyFootScope === "league" ? "league" : babyFootScope === "tournament" ? "tournament" : "match",
            source: isBabyFootOnline ? `babyfoot_online_${babyFootScope || "match"}` : "online_lobby",
            start: (store as any).settings?.defaultX01,
            doubleOut: (store as any).settings?.doubleOut,
          },
        } as any),
        12_000,
        "Création du salon : délai dépassé. (serveur/réseau) — réessaie."
      );

      if (createReqIdRef.current !== reqId) return;

      setLastCreatedLobby(lobby);
      setJoinedLobby(null);
      setJoinInfo(selectedOnlineModeSpec.id === "babyfoot" ? `Salon Baby-Foot · ${selectedBabyFootOnlineScopeSpec.label} créé.` : `Salon ${selectedOnlineModeSpec.label} créé.`);
    } catch (e: any) {
      if (createReqIdRef.current !== reqId) return;
      setJoinError(normalizeErrMessage(e) || "Impossible de créer un salon.");
    } finally {
      if (createReqIdRef.current === reqId) setCreatingLobby(false);
    }
  }

  async function handleJoinLobby() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setJoinError(activeSportId === "babyfoot" ? "Entre un code salon, ligue ou tournoi." : "Entre un code de salon.");
    if (joiningLobby) return;
    if (!requireSignedInOrExplain()) return;

    const reqId = ++joinReqIdRef.current;
    setJoiningLobby(true);
    setJoinError(null);
    setJoinInfo(null);
    setJoinedLobby(null);

    try {
      const lobbyRes = await withTimeout(
        onlineApi.joinLobby({
          code,
          userId: sessionUserId || "anon",
          nickname: displayName || "Joueur",
        } as any),
        12_000,
        "Rejoindre : délai dépassé. Vérifie le code et réessaie."
      );

      if (joinReqIdRef.current !== reqId) return;

      setJoinedLobby(lobbyRes);
      setJoinInfo("Salon trouvé.");
    } catch (e: any) {
      if (joinReqIdRef.current !== reqId) return;
      setJoinError(normalizeErrMessage(e) || "Impossible de rejoindre ce salon.");
    } finally {
      if (joinReqIdRef.current === reqId) setJoiningLobby(false);
    }
  }

  async function copyLobbyCode() {
    const code = String((lobby as any)?.code || "").toUpperCase();
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
      setCopyInfo("Code copié.");
    } catch {
      setCopyInfo(`Code : ${code}`);
    }
    window.setTimeout(() => setCopyInfo(null), 2200);
  }

  function cancelCreate() {
    createReqIdRef.current++;
    setCreatingLobby(false);
    setJoinError("Création annulée.");
  }

  const lobby = joinedLobby || lastCreatedLobby;
  const currentLobbyCode = String((lobby as any)?.code || "").trim().toUpperCase();
  const currentLobbyHostUserId = String((lobby as any)?.hostUserId || (lobby as any)?.host_user_id || "").trim();
  const isCurrentLobbyHost = !!sessionUserId && currentLobbyHostUserId === String(sessionUserId);
  const currentLobbyPlayer = React.useMemo(() => {
    const uid = String(sessionUserId || "").trim();
    return ((lobby as any)?.players || []).find((player: any) => String(player?.userId || player?.user_id || player?.id || "") === uid) || null;
  }, [lobby, sessionUserId]);
  const currentLobbyReady = String(currentLobbyPlayer?.status || "").toLowerCase() === "ready";
  const [updatingLobbyReady, setUpdatingLobbyReady] = React.useState(false);

  function replaceCurrentLobby(nextLobby: OnlineLobby) {
    const nextCode = String((nextLobby as any)?.code || "").trim().toUpperCase();
    if (!nextCode) return;
    setJoinedLobby((prev) => String((prev as any)?.code || "").trim().toUpperCase() === nextCode ? nextLobby : prev);
    setLastCreatedLobby((prev) => String((prev as any)?.code || "").trim().toUpperCase() === nextCode ? nextLobby : prev);
  }

  async function toggleCurrentLobbyReady() {
    if (!currentLobbyCode || updatingLobbyReady || isCurrentLobbyHost) return;
    if (!requireSignedInOrExplain()) return;
    setUpdatingLobbyReady(true);
    setJoinError(null);
    setJoinInfo(null);
    try {
      const nextLobby = await withTimeout(
        onlineApi.setLobbyReady({ code: currentLobbyCode, ready: !currentLobbyReady, nickname: displayName || "Joueur" } as any),
        10_000,
        "Statut prêt : délai dépassé. Réessaie."
      );
      replaceCurrentLobby(nextLobby);
      setJoinInfo(!currentLobbyReady ? "Statut : prêt." : "Statut : en attente.");
    } catch (e: any) {
      setJoinError(normalizeErrMessage(e) || "Impossible de modifier le statut prêt.");
    } finally {
      setUpdatingLobbyReady(false);
    }
  }

  /* -----------------------------
     Chat MVP (si lobby existe)
  ------------------------------ */
  const lobbyModeSpec = React.useMemo(() => {
    const modeFromLobby = (lobby as any)?.mode || (lobby as any)?.settings?.mode || selectedOnlineMode;
    return getOnlineModeSpec(modeFromLobby);
  }, [lobby, selectedOnlineMode]);

  async function launchOnlineLobby() {
    const code = String((lobby as any)?.code || "").toUpperCase();
    const spec = lobbyModeSpec;
    if (!code) {
      setActiveOnlineTab("play");
      setJoinError("Crée ou rejoins d’abord un salon.");
      return;
    }

    // IMPORTANT : ce bouton ouvre la salle d’attente, il ne démarre plus la partie.
    // Le lancement réel est réservé à l’hôte depuis la salle d’attente / config,
    // après validation NAS que tous les invités sont au statut “Prêt”.
    setJoinError(null);
    setJoinInfo(`Ouverture du salon ${spec.label}…`);

    const lobbySettings = ((lobby as any)?.settings || {}) as any;
    const babyFootScope = spec.id === "babyfoot"
      ? getBabyFootOnlineScopeSpec(lobbySettings.babyfootOnlineScope || lobbySettings.competitionScope || selectedBabyFootOnlineScope).id
      : null;

    go(spec.route as any, {
      online: true,
      onlineV9: true,
      onlineMode: spec.id,
      mode: spec.id,
      lobbyCode: code,
      lobbyId: (lobby as any)?.id || null,
      lobby,
      babyfootOnlineScope: babyFootScope,
      competitionScope: babyFootScope,
      competitionKind: babyFootScope === "league" ? "league" : babyFootScope === "tournament" ? "tournament" : "match",
      source: spec.id === "babyfoot" ? `babyfoot_online_${babyFootScope || "match"}` : "online_lobby_waiting_room",
    });
  }

  /* -----------------------------
     Chat MVP (si lobby existe)
  ------------------------------ */
  const lobbyKey = React.useMemo(() => {
    const code = (lobby as any)?.code;
    if (!code) return null;
    return String(code).toUpperCase();
  }, [lobby]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function refreshLobby() {
      if (!lobbyKey) return;
      try {
        const fresh = await onlineApi.getLobby(lobbyKey);
        if (cancelled || !fresh) return;
        if (joinedLobby) setJoinedLobby(fresh);
        else setLastCreatedLobby(fresh);
      } catch {
        // Le salon peut expirer ou être indisponible : on évite de faire clignoter l'UI.
      }
    }

    refreshLobby().catch(() => {});
    if (lobbyKey) {
      timer = window.setInterval(() => refreshLobby().catch(() => {}), 3000);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [lobbyKey, joinedLobby]);

  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [chatMessages, setChatMessages] = React.useState<any[]>([]);
  const [chatText, setChatText] = React.useState("");

  React.useEffect(() => {
    let unsub: null | (() => void) = null;
    let cancelled = false;

    async function run() {
      setChatError(null);
      setChatMessages([]);

      if (!isSignedIn || !sessionUserId || !lobbyKey) return;

      setChatLoading(true);
      try {
        const initial = await fetchMessages(lobbyKey);
        if (!cancelled) setChatMessages(Array.isArray(initial) ? initial : []);
      } catch (e: any) {
        if (!cancelled) setChatError(normalizeErrMessage(e));
      } finally {
        if (!cancelled) setChatLoading(false);
      }

      try {
        unsub = subscribeMessages(lobbyKey, (msg: any) => {
          setChatMessages((prev) => {
            const next = Array.isArray(prev) ? prev.slice() : [];
            next.push(msg);
            return next.slice(-200);
          });
        });
      } catch {}
    }

    run().catch(() => {});
    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {}
    };
  }, [isSignedIn, sessionUserId, lobbyKey]);

  async function sendChat() {
    const text = chatText.trim();
    if (!text) return;
    if (!isSignedIn || !sessionUserId || !lobbyKey) return;

    setChatText("");
    setChatError(null);

    try {
      await postMessage(lobbyKey, {
        userId: sessionUserId,
        name: displayName,
        text,
      });
    } catch (e: any) {
      setChatError(normalizeErrMessage(e));
    }
  }

  /* -----------------------------
     Amis / demandes / partages NAS
  ------------------------------ */
  const [friendsLoading, setFriendsLoading] = React.useState(false);
  const [friendsError, setFriendsError] = React.useState<string | null>(null);
  const [friendsInfo, setFriendsInfo] = React.useState<string | null>(null);
  const [onlineFriends, setOnlineFriends] = React.useState<OnlineFriendUser[]>([]);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [sharedItems, setSharedItems] = React.useState<SharedOnlineItem[]>([]);
  const [friendQuery, setFriendQuery] = React.useState("");
  const [friendSearchResults, setFriendSearchResults] = React.useState<OnlineFriendUser[]>([]);
  const [friendSearching, setFriendSearching] = React.useState(false);
  const [busyFriendId, setBusyFriendId] = React.useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = React.useState<string | null>(null);
  const [busyShareId, setBusyShareId] = React.useState<string | null>(null);
  const [selectedShare, setSelectedShare] = React.useState<SharedOnlineItem | null>(null);
  const [importingShareId, setImportingShareId] = React.useState<string | null>(null);

  const incomingRequests = React.useMemo(
    () => friendRequests.filter((r) => r.direction === "incoming" && r.status === "pending"),
    [friendRequests]
  );
  const outgoingRequests = React.useMemo(
    () => friendRequests.filter((r) => r.direction === "outgoing" && r.status === "pending"),
    [friendRequests]
  );
  const incomingShares = React.useMemo(
    () => sharedItems.filter((it) => it.direction === "incoming"),
    [sharedItems]
  );
  const outgoingShares = React.useMemo(
    () => sharedItems.filter((it) => it.direction === "outgoing"),
    [sharedItems]
  );

  const syncOnlineFriendsIntoStore = React.useCallback((friends: OnlineFriendUser[]) => {
    const mapped = (Array.isArray(friends) ? friends : [])
      .map((f) => ({
        id: String(f.id || f.userId || ""),
        userId: String(f.userId || f.id || ""),
        name: String(f.displayName || f.nickname || "Ami"),
        displayName: f.displayName || f.nickname || "Ami",
        nickname: f.nickname || f.displayName || "Ami",
        avatarUrl: f.avatarUrl || null,
        avatarDataUrl: null,
        status: f.status || "offline",
        lastSeenAt: f.lastSeenAt || null,
        source: "nas-online",
      }))
      .filter((f) => !!f.id);

    update((st: any) => {
      const current = Array.isArray(st?.friends) ? st.friends : [];
      const same = JSON.stringify(current.map((f: any) => ({ id: f.id || f.userId, status: f.status, avatarUrl: f.avatarUrl || null }))) ===
        JSON.stringify(mapped.map((f: any) => ({ id: f.id || f.userId, status: f.status, avatarUrl: f.avatarUrl || null })));
      if (same) return st;
      return { ...st, friends: mapped };
    });
  }, [update]);

  const loadSocial = React.useCallback(async () => {
    if (!isSignedIn) {
      setOnlineFriends([]);
      setFriendRequests([]);
      setSharedItems([]);
      return;
    }
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const [friends, requests, shares] = await Promise.all([
        listFriends(),
        listFriendRequests(),
        listSharedItems(),
      ]);
      const nextFriends = Array.isArray(friends) ? friends : [];
      setOnlineFriends(nextFriends);
      syncOnlineFriendsIntoStore(nextFriends);
      setFriendRequests(Array.isArray(requests) ? requests : []);
      setSharedItems(Array.isArray(shares) ? shares : []);
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setFriendsLoading(false);
    }
  }, [isSignedIn, syncOnlineFriendsIntoStore]);

  React.useEffect(() => {
    loadSocial().catch(() => {});
  }, [loadSocial]);

  React.useEffect(() => {
    if (!isSignedIn) return;
    updatePresence(selfStatus === "away" ? "away" : "online").catch(() => {});
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFriendSearch() {
    const q = friendQuery.trim();
    if (q.length < 2) {
      setFriendsError("Entre au moins 2 caractères pour chercher un joueur.");
      return;
    }
    setFriendSearching(true);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      const users = await searchUsers(q);
      setFriendSearchResults(users.filter((u) => String(u.id || u.userId || "") !== String(sessionUserId || "")));
      if (!users.length) setFriendsInfo("Aucun joueur trouvé.");
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setFriendSearching(false);
    }
  }

  async function handleSendFriendRequest(user: OnlineFriendUser) {
    const targetId = String(user.id || user.userId || "").trim();
    if (!targetId) return;
    setBusyFriendId(targetId);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      await sendFriendRequest(targetId);
      setFriendsInfo(`Demande envoyée à ${user.displayName || user.nickname || "ce joueur"}.`);
      await loadSocial();
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setBusyFriendId(null);
    }
  }

  async function handleRespondRequest(req: FriendRequest, status: "accepted" | "rejected") {
    setBusyRequestId(req.id);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      await respondFriendRequest(req.id, status);
      setFriendsInfo(status === "accepted" ? "Ami ajouté." : "Demande refusée.");
      await loadSocial();
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleRemoveFriend(friend: OnlineFriendUser) {
    const id = String(friend.id || friend.userId || "").trim();
    if (!id) return;
    setBusyFriendId(id);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      await removeFriend(id);
      setFriendsInfo("Ami supprimé.");
      await loadSocial();
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setBusyFriendId(null);
    }
  }

  async function handleShare(friend: OnlineFriendUser, kind: "stats" | "match") {
    const id = String(friend.id || friend.userId || "").trim();
    if (!id) return;
    setBusyShareId(`${id}:${kind}`);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      if (kind === "match" && lastMatch) {
        await shareWithFriend({
          targetUserId: id,
          type: "match",
          title: getMatchTitle(lastMatch),
          sport: "darts",
          matchId: String((lastMatch as any)?.id || ""),
          payload: lastMatch,
        });
      } else {
        await shareWithFriend({
          targetUserId: id,
          type: "stats",
          title: `Stats online de ${displayName}`,
          sport: "darts",
          payload: {
            playerName: displayName,
            weekMatchesCount,
            avg3DWeek,
            checkoutPctWeek,
            lastMatch: lastMatch || null,
            exportedAt: new Date().toISOString(),
          },
        });
      }
      setFriendsInfo(kind === "match" ? "Dernier match partagé." : "Stats partagées.");
      await loadSocial();
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e));
    } finally {
      setBusyShareId(null);
    }
  }

  async function handleReadShare(item: SharedOnlineItem) {
    if (!item?.id || item.readAt) return;
    try {
      await markSharedItemRead(item.id);
      await loadSocial();
    } catch {}
  }

  async function handleImportShareToHistory(item: SharedOnlineItem) {
    if (!item?.id || importingShareId) return;
    const record = buildImportedHistoryRecord(item);
    if (!record) {
      setFriendsError("Ce partage ne contient pas de match importable.");
      return;
    }
    setImportingShareId(item.id);
    setFriendsError(null);
    setFriendsInfo(null);
    try {
      await History.upsert(record as any);
      setFriendsInfo("Partage importé dans l’historique local.");
      await handleReadShare(item);
      setSelectedShare(null);
    } catch (e: any) {
      setFriendsError(normalizeErrMessage(e) || "Import impossible dans l’historique.");
    } finally {
      setImportingShareId(null);
    }
  }

  /* -----------------------------
     Home stats
  ------------------------------ */
  const sortedMatches = React.useMemo(
    () => (matches || []).slice().sort((a: any, b: any) => toTs(b) - toTs(a)),
    [matches]
  );

  const lastMatch = sortedMatches[0] as any | undefined;

  const weekMatchesCount = React.useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    return sortedMatches.filter((m: any) => now - toTs(m) <= week).length;
  }, [sortedMatches]);

  const avg3DWeek = React.useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const list = sortedMatches.filter((m: any) => now - toTs(m) <= week);
    const vals = list
      .map((m: any) => m?.stats?.avg3D ?? m?.payload?.stats?.avg3D ?? m?.payload?.avg3D)
      .filter((v: any) => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return 0;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
  }, [sortedMatches]);

  const avg3DOverall = React.useMemo(() => {
    const vals = sortedMatches
      .map((m: any) => m?.stats?.avg3D ?? m?.payload?.stats?.avg3D ?? m?.payload?.avg3D)
      .map((v: any) => Number(v))
      .filter((v: number) => Number.isFinite(v) && v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
  }, [sortedMatches]);

  const checkoutPctWeek = React.useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const list = sortedMatches.filter((m: any) => now - toTs(m) <= week);
    const vals = list
      .map((m: any) => m?.stats?.checkoutPct ?? m?.payload?.stats?.checkoutPct ?? m?.payload?.checkoutPct)
      .filter((v: any) => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return 0;
    return safePct(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  }, [sortedMatches]);

  const streakLabel = React.useMemo(() => {
    const you = (activeProfile as any)?.name || displayName;
    if (!lastMatch) return "—";
    const w = getMatchWinnerLabel(lastMatch);
    if (!w) return "—";
    return w === you ? "W1" : "L1";
  }, [lastMatch, activeProfile, displayName]);

  /* -----------------------------
     Ticker items
  ------------------------------ */
  const tickerItems = React.useMemo(() => {
    const items: Array<{ text: string; tone?: any }> = [];

    items.push({
      text:
        serverState === "ok"
          ? "Serveur : OK"
          : serverState === "down"
          ? "Serveur : hors ligne"
          : "Serveur : vérification…",
      tone: serverState === "ok" ? "green" : serverState === "down" ? "red" : "gray",
    });

    items.push({
      text:
        sessionState === "signed_in"
          ? "Session : connectée"
          : sessionState === "signed_out"
          ? "Session : déconnectée"
          : "Session : vérification…",
      tone: sessionState === "signed_in" ? "green" : sessionState === "signed_out" ? "red" : "gray",
    });

    if (lobby?.code) {
      items.push({ text: `Salle d’attente • CODE ${String((lobby as any).code).toUpperCase()}`, tone: "blue" });
      items.push({ text: "Invite un ami → partage le code", tone: "gold" });
    } else {
      items.push({ text: "Crée un salon X01 ou rejoins avec un code", tone: "gold" });
    }

    if (lastMatch) {
      const title = getMatchTitle(lastMatch);
      const vs = getMatchPlayersLabel(lastMatch);
      const win = getMatchWinnerLabel(lastMatch);
      items.push({ text: `Dernier : ${title} • ${vs}`, tone: "blue" });
      if (win) items.push({ text: `🏆 Vainqueur : ${win}`, tone: "gold" });
    } else {
      items.push({ text: "Aucun match online enregistré pour le moment", tone: "gray" });
    }

    items.push({ text: `Cette semaine : ${weekMatchesCount} match(s)`, tone: "green" });
    if (avg3DWeek > 0) items.push({ text: `Avg 3D (semaine) : ${fmt1(avg3DWeek)}`, tone: "gold" });
    if (checkoutPctWeek > 0) items.push({ text: `Checkout% (semaine) : ${fmt1(checkoutPctWeek)}%`, tone: "blue" });

    const count = Object.keys(presenceMap || {}).length;
    if (count > 0) items.push({ text: `Présence : ${count} joueur(s)`, tone: "green" });

    items.push({ text: "SOON : Chat amis • Classements • Tournois", tone: "gray" });

    return items;
  }, [serverState, sessionState, lobby, lastMatch, weekMatchesCount, avg3DWeek, checkoutPctWeek, presenceMap]);

  const [showInfo, setShowInfo] = React.useState(false);
  const [showPresencePanel, setShowPresencePanel] = React.useState(false);
  const [showDartSetPicker, setShowDartSetPicker] = React.useState(false);

  const serverChipTone = serverState === "ok" ? "green" : serverState === "down" ? "red" : "gray";
  const presenceTone = selfStatus === "online" ? "green" : selfStatus === "away" ? "orange" : "gray";
  const presenceLabel = selfStatus === "online" ? "En ligne" : selfStatus === "away" ? "Absent" : "Hors ligne";
  const onlineRatingValue = Math.max(0, Math.round(avg3DWeek || avg3DOverall || 0));
  const onlineLeagueLabel = activeSportId === "darts" ? "X01 501 · Dbl.Out" : activeSportId.toUpperCase();
  const onlineRankLabel = sortedMatches.length > 0 ? `#${Math.max(1, Math.min(999, 1000 - sortedMatches.length))}` : "—";
  const activeDartSetId = String((activeProfile as any)?.dartSetId || (activeProfile as any)?.activeDartSetId || (activeProfile as any)?.favoriteDartSetId || "").trim();
  const onlineProfileDartSets = React.useMemo(() => {
    const profileId = String((activeProfile as any)?.id || "").trim();
    if (!profileId) return [] as DartSet[];
    try {
      return sortOnlineDartSetsForPicker(getDartSetsForProfile(profileId) || []);
    } catch {
      return [] as DartSet[];
    }
  }, [(activeProfile as any)?.id, activeDartSetId]);
  const activeOnlineDartSet = React.useMemo(
    () => onlineProfileDartSets.find((set: any) => String(set?.id || "") === String(activeDartSetId || "")) || null,
    [onlineProfileDartSets, activeDartSetId]
  );
  const activeOnlineDartSetThumb = getOnlineDartSetThumbSrc(activeOnlineDartSet);

  function handlePickOnlineDartSet(dartSetId: string | null) {
    const profileId = String((activeProfile as any)?.id || "").trim();
    if (!profileId) return;
    update((st: any) => ({
      ...st,
      profiles: (st.profiles || []).map((p: any) =>
        String(p?.id || "") === profileId
          ? { ...p, dartSetId: dartSetId || null, activeDartSetId: dartSetId || null }
          : p
      ),
    }));
    try {
      window.dispatchEvent(new Event("dc-store-updated"));
      window.dispatchEvent(new Event("dc-dartsets-updated"));
    } catch {}
    setShowDartSetPicker(false);
  }


  const [activeOnlineTab, setActiveOnlineTab] = React.useState<OnlineMainTab>(() => (activeSportId === "babyfoot" ? "play" : initialOnlineTab || "hub"));

  const unreadSharesCount = React.useMemo(
    () => incomingShares.filter((it) => !it.readAt).length,
    [incomingShares]
  );

  const onlineTabs = React.useMemo<OnlineTabSpec[]>(
    () => [
      {
        id: "hub",
        label: "Hub",
        icon: "⚡",
        hint: "",
        badge: serverState === "ok" ? "OK" : serverState === "down" ? "OFF" : "…",
        tone: serverState === "ok" ? "green" : serverState === "down" ? "red" : "gray",
      },
      {
        id: "play",
        label: "Jouer",
        icon: "🎯",
        hint: "",
        badge: lobby?.code ? String((lobby as any).code).toUpperCase() : selectedOnlineModeSpec.shortLabel,
        tone: lobby?.code ? "gold" : "blue",
      },
      {
        id: "official",
        label: "Officiel",
        icon: "🏆",
        hint: "",
        badge: "Ligues",
        tone: "blue",
      },
      {
        id: "friends",
        label: "Amis",
        icon: "👥",
        hint: "",
        badge: onlineFriends.length,
        tone: "green",
      },
      {
        id: "requests",
        label: "Demandes",
        icon: "📨",
        hint: "",
        badge: incomingRequests.length + outgoingRequests.length,
        tone: incomingRequests.length > 0 ? "gold" : "gray",
      },
      {
        id: "shares",
        label: "Partages",
        icon: "🔗",
        hint: "",
        badge: unreadSharesCount || incomingShares.length,
        tone: unreadSharesCount > 0 ? "gold" : "blue",
      },
      {
        id: "activity",
        label: "Activité",
        icon: "📈",
        hint: "",
        badge: sortedMatches.length,
        tone: "orange",
      },
    ],
    [serverState, onlineFriends.length, incomingRequests.length, outgoingRequests.length, unreadSharesCount, incomingShares.length, lobby, selectedOnlineModeSpec.shortLabel, sortedMatches.length]
  );
  React.useEffect(() => {
    if (activeSportId === "babyfoot") {
      setActiveOnlineTab("play");
      return;
    }
    if (initialOnlineTab) {
      setActiveOnlineTab(initialOnlineTab);
    }
  }, [activeSportId, initialOnlineTab]);

  const showHubTab = activeOnlineTab === "hub";
  const showFriendsTab = activeOnlineTab === "friends";
  const showRequestsTab = activeOnlineTab === "requests";
  const showSharesTab = activeOnlineTab === "shares";
  const showPlayTab = activeOnlineTab === "play";
  const showActivityTab = activeOnlineTab === "activity";
  const showOfficialTab = activeOnlineTab === "official";

  if (!ready) {
    return (
      <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
        Connexion en cours…
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
        minHeight: "100dvh",
        background: `radial-gradient(760px 300px at 92% -8%, rgba(${onlineAccentRgb},.42), transparent 62%), radial-gradient(620px 260px at 0% 30%, rgba(${onlineAccentRgb},.18), transparent 64%), linear-gradient(180deg, ${onlineBg}, #020611 58%, #000 100%)`,
        ["--online-accent" as any]: onlineAccent,
        ["--online-accent-rgb" as any]: onlineAccentRgb,
        ["--online-accent-dark" as any]: onlineAccentDark,
      }}
    >
      {/* ================= HEADER (CAPTURE 1 EXACTE) ================= */}
      <NeonCard
        style={{
          background:
            "radial-gradient(1200px 240px at 20% 0%, rgba(var(--online-accent-rgb),.18), transparent 55%), radial-gradient(900px 220px at 90% 0%, rgba(79,180,255,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
          marginBottom: 12,
        }}
      >
        {/* ===== HEADER TITRE CENTRÉ : BackDot / ONLINE / InfoDot ===== */}
        <div
          className="online-header"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "46px minmax(0, 1fr) 46px",
            alignItems: "start",
            gap: 10,
          }}
        >
          <BackDot
            title="Retour"
            size={42}
            color={onlineAccent}
            glow={`rgba(${onlineAccentRgb},.55)`}
            onClick={() => {
              try {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                  return;
                }
              } catch {}
              go("home" as any);
            }}
          />

          <div className="online-title" style={{ minWidth: 0, textAlign: "center" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 1000,
                color: "var(--online-accent)",
                textShadow: "0 0 18px rgba(var(--online-accent-rgb),.38)",
                lineHeight: 1.0,
                letterSpacing: ".4px",
              }}
            >
              ONLINE
            </h1>

            <span className="pill pill-green" style={{ display: "inline-flex", marginTop: 8 }}>
              <Pill
                label={serverState === "ok" ? "Serveur : OK" : serverState === "down" ? "Serveur : hors ligne" : "Serveur : …"}
                tone={serverChipTone}
              />
            </span>
          </div>

          <div style={{ justifySelf: "end" }}>
            <InfoDot onClick={() => setShowInfo((v) => !v)} active={showInfo} />
          </div>
        </div>

        {showInfo ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
              padding: 12,
              boxShadow: "0 12px 26px rgba(0,0,0,.55)",
            }}
          >
            <div style={{ fontWeight: 1000, color: "var(--online-accent)" }}>Infos</div>
            <div style={{ marginTop: 6, fontSize: 12.2, opacity: 0.88, lineHeight: 1.25 }}>
              Crée un salon, rejoins un ami, retrouve ton historique online, et bientôt :
              spectateur • chat amis • classements • tournois.
            </div>
            {serverState === "down" && serverHint ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#ff8a8a", fontWeight: 950 }}>{serverHint}</div>
            ) : null}
            {authHint ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--online-accent)", fontWeight: 950 }}>{authHint}</div>
            ) : null}
          </div>
        ) : null}

        {/* ===== HEADER PROFIL — layout demandé */}
        <div
          className="online-profile online-profile-v2"
          style={{
            marginTop: 14,
            borderRadius: 20,
            padding: 12,
            border: "1px solid rgba(var(--online-accent-rgb),.24)",
            background:
              "radial-gradient(360px 180px at 50% 0%, rgba(var(--online-accent-rgb),.13), transparent 68%), linear-gradient(180deg, rgba(4,12,24,.58), rgba(0,0,0,.18))",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.025)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 12,
            alignItems: "center",
            justifyItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 430, minWidth: 0, display: "grid", justifyItems: "center", alignContent: "start", gap: 10, margin: "0 auto" }}>
            <div style={{ position: "relative", width: 138, height: 118 }}>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  transform: "translateX(-50%)",
                  width: 98,
                  height: 98,
                  display: "grid",
                  placeItems: "center",
                  filter: "drop-shadow(0 0 22px rgba(var(--online-accent-rgb),.48))",
                }}
                title={`Niveau basé sur l'Avg 3D Online : ${onlineRatingValue || 0}`}
              >
                <ProfileAvatar
                  profile={activeProfile as any}
                  size={92}
                  avg3D={onlineRatingValue || avg3DOverall || 0}
                  showStars={true}
                  showDartOverlay={false}
                  ringColor="rgba(var(--online-accent-rgb),.86)"
                  textColor="var(--online-accent)"
                />
              </div>

              <button
                type="button"
                title={activeOnlineDartSet ? `Dartset : ${(activeOnlineDartSet as any)?.name || "sélectionné"}` : "Choisir mon dartset"}
                onClick={() => setShowDartSetPicker(true)}
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 2,
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: showDartSetPicker ? "rgba(var(--online-accent-rgb),.24)" : "linear-gradient(180deg, rgba(var(--online-accent-rgb),.28), rgba(0,0,0,.55))",
                  border: "1px solid rgba(var(--online-accent-rgb),.65)",
                  color: "var(--online-accent)",
                  fontSize: 18,
                  boxShadow: "0 0 16px rgba(var(--online-accent-rgb),.35)",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                {activeOnlineDartSetThumb ? (
                  <img src={activeOnlineDartSetThumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span aria-hidden>🎯</span>
                )}
              </button>

              <div
                title={countryRaw || "Flag"}
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 2,
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(180deg, rgba(var(--online-accent-rgb),.22), rgba(0,0,0,.55))",
                  border: "1px solid rgba(var(--online-accent-rgb),.65)",
                  color: "var(--online-accent)",
                  fontSize: countryFlag ? 18 : 12,
                  fontWeight: 1000,
                  boxShadow: "0 0 16px rgba(var(--online-accent-rgb),.35)",
                }}
              >
                {countryFlag || "FR"}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                minWidth: 0,
                textAlign: "center",
                fontSize: 18,
                fontWeight: 1000,
                color: "var(--online-accent)",
                textShadow: "0 0 14px rgba(var(--online-accent-rgb),.45)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>

            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowPresencePanel((v) => !v)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(var(--online-accent-rgb),.56)",
                  background: showPresencePanel ? "rgba(var(--online-accent-rgb),.20)" : "rgba(255,255,255,.045)",
                  color: "var(--online-accent)",
                  padding: "8px 4px",
                  fontSize: 10.2,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: showPresencePanel ? "0 0 14px rgba(var(--online-accent-rgb),.28)" : "none",
                }}
              >
                {presenceLabel}
              </button>
              <div style={{ borderRadius: 12, border: "1px solid rgba(var(--online-accent-rgb),.26)", background: "rgba(255,255,255,.035)", padding: "8px 4px", textAlign: "center" }}>
                <div style={{ color: "var(--online-accent)", fontSize: 10.2, fontWeight: 1000 }}>RATING</div>
                <div style={{ marginTop: 2, fontSize: 11, fontWeight: 1000 }}>{onlineRatingValue || "—"}</div>
              </div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(var(--online-accent-rgb),.26)", background: "rgba(255,255,255,.035)", padding: "8px 4px", textAlign: "center" }}>
                <div style={{ color: "var(--online-accent)", fontSize: 10.2, fontWeight: 1000 }}>LIGUE</div>
                <div style={{ marginTop: 2, fontSize: 9.2, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{onlineLeagueLabel}</div>
              </div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(var(--online-accent-rgb),.26)", background: "rgba(255,255,255,.035)", padding: "8px 4px", textAlign: "center" }}>
                <div style={{ color: "var(--online-accent)", fontSize: 9.4, fontWeight: 1000 }}>CLASSEMENT</div>
                <div style={{ marginTop: 2, fontSize: 11, fontWeight: 1000 }}>{onlineRankLabel}</div>
              </div>
            </div>

            {showPresencePanel ? (
              <div
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(var(--online-accent-rgb),.40)",
                  background: "linear-gradient(180deg, rgba(var(--online-accent-rgb),.14), rgba(0,0,0,.56))",
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 6,
                  boxShadow: "0 12px 26px rgba(0,0,0,.45), 0 0 20px rgba(var(--online-accent-rgb),.18)",
                }}
              >
                <GhostButton label="En ligne" onClick={() => { setPresence("online"); setShowPresencePanel(false); }} />
                <GhostButton label="Absent" onClick={() => { setPresence("away"); setShowPresencePanel(false); }} />
                {isSignedIn ? (
                  <GhostButton label="Déconnexion" onClick={() => { setShowPresencePanel(false); doLogout(); }} tone="danger" />
                ) : (
                  <GhostButton label="Connexion" onClick={() => { setShowPresencePanel(false); go("profiles"); }} />
                )}
              </div>
            ) : null}

            <OnlineDartSetPickerOverlay
              open={showDartSetPicker}
              profileId={String((activeProfile as any)?.id || "")}
              value={activeDartSetId || null}
              accent={onlineAccent}
              onClose={() => setShowDartSetPicker(false)}
              onChange={handlePickOnlineDartSet}
            />

          </div>
        </div>
      </NeonCard>

      {/* ================= TICKER ================= */}
      <OnlineTicker items={tickerItems} speedSec={22} />

      <OnlineTabsBar tabs={onlineTabs} active={activeOnlineTab} onChange={setActiveOnlineTab} />

      {showHubTab ? (
        <>
          <SectionTitle title="Hub" />

          <NeonCard style={{ marginTop: 10, padding: 12 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 10, alignItems: "stretch" }}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    border: "1px solid rgba(var(--online-accent-rgb),.16)",
                    background: "linear-gradient(180deg, rgba(var(--online-accent-rgb),.10), rgba(255,255,255,.045))",
                    display: "grid",
                    gap: 8,
                    alignContent: "center",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.74 }}>ACTION PRIORITAIRE</div>
                  <div style={{ color: "var(--online-accent)", fontWeight: 1000, fontSize: 15.5, lineHeight: 1.15 }}>
                    {!isSignedIn
                      ? "Connecte ton compte"
                      : incomingRequests.length > 0
                      ? "Répondre aux demandes"
                      : unreadSharesCount > 0
                      ? "Voir les partages reçus"
                      : lobby?.code
                      ? `Salon ${String((lobby as any).code).toUpperCase()} prêt`
                      : "Créer ou rejoindre un salon"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.78, lineHeight: 1.3 }}>
                    {!isSignedIn
                      ? "Le online social nécessite une session active."
                      : incomingRequests.length > 0
                      ? `${incomingRequests.length} demande(s) en attente de réponse.`
                      : unreadSharesCount > 0
                      ? `${unreadSharesCount} partage(s) non lu(s).`
                      : lobby?.code
                      ? "Invite un ami avec le code ou lance la partie."
                      : "Le plus utile ici : lancer un salon ou rejoindre un ami."}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <PrimaryButton
                    label={lobby?.code ? "🎯 Ouvrir le salon" : "🎯 Jouer en ligne"}
                    subLabel={lobby?.code ? String((lobby as any).code).toUpperCase() : "Créer / rejoindre"}
                    tone="gold"
                    onClick={() => setActiveOnlineTab("play")}
                    disabled={!isSignedIn}
                  />
                  {!isSignedIn ? (
                    <GhostButton label="Connexion / profil" onClick={() => go("profiles")} />
                  ) : incomingRequests.length > 0 ? (
                    <GhostButton label="📨 Ouvrir les demandes" onClick={() => setActiveOnlineTab("requests")} />
                  ) : unreadSharesCount > 0 ? (
                    <GhostButton label="🔗 Ouvrir les partages" onClick={() => setActiveOnlineTab("shares")} />
                  ) : (
                    <GhostButton label="👥 Voir mes amis" onClick={() => setActiveOnlineTab("friends")} />
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <NeonCard style={{ padding: 10, borderRadius: 14, boxShadow: "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.65 }}>AMIS</div>
                  <div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000, color: "#7fe2a9" }}>{onlineFriends.length}</div>
                </NeonCard>
                <NeonCard style={{ padding: 10, borderRadius: 14, boxShadow: "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.65 }}>DEMANDES</div>
                  <div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000, color: incomingRequests.length ? "var(--online-accent)" : "#f5f5f7" }}>{incomingRequests.length}</div>
                </NeonCard>
                <NeonCard style={{ padding: 10, borderRadius: 14, boxShadow: "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.65 }}>PARTAGES</div>
                  <div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000, color: unreadSharesCount ? "var(--online-accent)" : "#4fb4ff" }}>{unreadSharesCount}</div>
                </NeonCard>
                <NeonCard style={{ padding: 10, borderRadius: 14, boxShadow: "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, opacity: 0.65 }}>MATCHS</div>
                  <div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000, color: "var(--online-accent)" }}>{sortedMatches.length}</div>
                </NeonCard>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 11.5,
                  opacity: 0.84,
                }}
              >
                <Pill label={serverState === "ok" ? "Serveur OK" : serverState === "down" ? "Serveur OFF" : "Serveur…"} tone={serverChipTone} />
                <Pill label={sessionState === "signed_in" ? "Session OK" : sessionState === "signed_out" ? "Déconnecté" : "Session…"} tone={sessionState === "signed_in" ? "green" : sessionState === "signed_out" ? "red" : "gray"} />
                <Pill label={presenceLabel} tone={presenceTone} />
                {lastMatch ? <span>Dernier match : <b>{getMatchTitle(lastMatch)}</b></span> : <span>Aucun match online enregistré.</span>}
              </div>
            </div>
          </NeonCard>
        </>
      ) : null}

      {showOfficialTab ? (
        <OfficialCompetitionsPanel
          rating={Number(onlineRatingValue || 0)}
          matches={sortedMatches.length}
          country={countryRaw}
          goPlay={() => setActiveOnlineTab("play")}
        />
      ) : null}

      {/* ================= AMIS / PARTAGE ================= */}
      {showFriendsTab ? (
        <>
      <SectionTitle
        title="Amis"
        subtitle="Ajoute des joueurs, accepte les demandes et partage tes stats"
        right={friendsLoading ? <Pill label="SYNC" tone="blue" /> : <Pill label={`${onlineFriends.length} ami(s)`} tone="green" />}
      />

      <NeonCard style={{ marginTop: 10 }}>
        {!isSignedIn ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12.5, opacity: 0.88, lineHeight: 1.35 }}>
              Connecte ton compte pour activer la liste d’amis, les demandes et le partage des stats.
            </div>
            <GhostButton label="Connexion / Mon profil" onClick={() => go("profiles")} />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFriendSearch().catch(() => {});
                }}
                placeholder="Pseudo ou email d’un joueur…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(5,5,8,.95)",
                  color: "#f5f5f7",
                  padding: "10px 12px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => handleFriendSearch().catch(() => {})}
                disabled={friendSearching}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "linear-gradient(180deg, var(--online-accent), var(--online-accent-dark))",
                  color: "#04101f",
                  fontWeight: 1000,
                  cursor: friendSearching ? "default" : "pointer",
                  opacity: friendSearching ? 0.65 : 1,
                  minWidth: 92,
                }}
              >
                {friendSearching ? "…" : "Chercher"}
              </button>
            </div>

            {friendsError ? <div style={{ color: "#ff8a8a", fontSize: 12, fontWeight: 950 }}>{friendsError}</div> : null}
            {friendsInfo ? <div style={{ color: "#8fe6aa", fontSize: 12, fontWeight: 950 }}>{friendsInfo}</div> : null}

            {friendSearchResults.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11.5, opacity: 0.82, fontWeight: 1000 }}>Résultats</div>
                {friendSearchResults.slice(0, 8).map((u) => {
                  const id = String(u.id || u.userId || "");
                  const name = u.displayName || u.nickname || "Joueur";
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: 14,
                        padding: 10,
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(255,255,255,.055)",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "radial-gradient(circle at 30% 0%, var(--online-accent), #856116)",
                          flexShrink: 0,
                        }}
                      >
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, color: "var(--online-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.75 }}>{u.status || "offline"}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendFriendRequest(u).catch(() => {})}
                        disabled={busyFriendId === id}
                        style={{
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,.14)",
                          background: "rgba(127,226,169,.14)",
                          color: "#8fe6aa",
                          padding: "8px 10px",
                          fontWeight: 1000,
                          fontSize: 11.5,
                        }}
                      >
                        {busyFriendId === id ? "…" : "Ajouter"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {incomingRequests.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11.5, opacity: 0.82, fontWeight: 1000 }}>Demandes reçues</div>
                {incomingRequests.map((r) => {
                  const u = r.fromUser || {};
                  const name = u.displayName || u.nickname || "Joueur";
                  return (
                    <div key={r.id} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(var(--online-accent-rgb),.22)", background: "rgba(var(--online-accent-rgb),.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 1000 }}>{name}</div>
                        <Pill label="Demande" tone="gold" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                        <GhostButton label={busyRequestId === r.id ? "…" : "Accepter"} onClick={() => handleRespondRequest(r, "accepted").catch(() => {})} disabled={busyRequestId === r.id} />
                        <GhostButton label="Refuser" onClick={() => handleRespondRequest(r, "rejected").catch(() => {})} disabled={busyRequestId === r.id} tone="danger" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 11.5, opacity: 0.82, fontWeight: 1000 }}>Mes amis</div>
                {outgoingRequests.length > 0 ? <Pill label={`${outgoingRequests.length} envoyée(s)`} tone="gray" /> : null}
              </div>
              {onlineFriends.length === 0 ? (
                <div style={{ opacity: 0.82, fontSize: 12.5 }}>Aucun ami pour le moment. Cherche un joueur au-dessus pour envoyer une demande.</div>
              ) : (
                onlineFriends.map((f) => {
                  const id = String(f.id || f.userId || "");
                  const name = f.displayName || f.nickname || "Joueur";
                  const status = String(f.status || "offline");
                  const tone = status === "online" ? "green" : status === "away" ? "orange" : "gray";
                  return (
                    <div key={id} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.055)", display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", background: "#111", flexShrink: 0 }}>
                          {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 1000, color: "var(--online-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          <div style={{ marginTop: 4 }}><Pill label={status === "online" ? "En ligne" : status === "away" ? "Absent" : "Offline"} tone={tone as any} /></div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(f).catch(() => {})}
                          disabled={busyFriendId === id}
                          style={{ borderRadius: 999, padding: "7px 9px", border: "1px solid rgba(255,90,90,.18)", background: "rgba(255,90,90,.10)", color: "#ff9c9c", fontWeight: 1000, fontSize: 11 }}
                        >
                          Retirer
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <GhostButton
                          label={busyShareId === `${id}:stats` ? "Partage…" : "📊 Partager stats"}
                          onClick={() => handleShare(f, "stats").catch(() => {})}
                          disabled={busyShareId === `${id}:stats`}
                        />
                        <GhostButton
                          label={busyShareId === `${id}:match` ? "Partage…" : "🎯 Dernier match"}
                          onClick={() => handleShare(f, "match").catch(() => {})}
                          disabled={!lastMatch || busyShareId === `${id}:match`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </NeonCard>
        </>
      ) : null}

      {showRequestsTab ? (
        <>
          <SectionTitle
            title="Demandes d’amis"
            subtitle="Demandes reçues, envoyées et réponses rapides"
            right={(incomingRequests.length + outgoingRequests.length) > 0 ? <Pill label={`${incomingRequests.length + outgoingRequests.length}`} tone="gold" /> : <Pill label="0" tone="gray" />}
          />
          {!isSignedIn ? (
            <OnlineEmptyCard title="Connexion requise" text="Connecte ton compte pour lire et répondre aux demandes d’amis." />
          ) : (
            <NeonCard style={{ marginTop: 10 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 1000, color: "var(--online-accent)" }}>Demandes reçues</div>
                    <Pill label={`${incomingRequests.length}`} tone={incomingRequests.length ? "gold" : "gray"} />
                  </div>
                  {incomingRequests.length === 0 ? (
                    <div style={{ opacity: 0.78, fontSize: 12.5 }}>Aucune demande reçue pour le moment.</div>
                  ) : (
                    incomingRequests.map((r) => {
                      const u = r.fromUser || {};
                      const name = u.displayName || u.nickname || "Joueur";
                      return (
                        <div key={r.id} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(var(--online-accent-rgb),.22)", background: "rgba(var(--online-accent-rgb),.08)", display: "grid", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)", border: "1px solid rgba(var(--online-accent-rgb),.20)", flexShrink: 0 }}>
                              {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 1000, color: "var(--online-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                              <div style={{ fontSize: 11.5, opacity: 0.74 }}>Souhaite t’ajouter en ami</div>
                            </div>
                            <Pill label="Reçue" tone="gold" />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <GhostButton label={busyRequestId === r.id ? "…" : "Accepter"} onClick={() => handleRespondRequest(r, "accepted").catch(() => {})} disabled={busyRequestId === r.id} />
                            <GhostButton label="Refuser" onClick={() => handleRespondRequest(r, "rejected").catch(() => {})} disabled={busyRequestId === r.id} tone="danger" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent)" }} />

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 1000, color: "#4fb4ff" }}>Demandes envoyées</div>
                    <Pill label={`${outgoingRequests.length}`} tone={outgoingRequests.length ? "blue" : "gray"} />
                  </div>
                  {outgoingRequests.length === 0 ? (
                    <div style={{ opacity: 0.78, fontSize: 12.5 }}>Aucune demande en attente côté envoi.</div>
                  ) : (
                    outgoingRequests.map((r) => {
                      const u = r.toUser || {};
                      const name = u.displayName || u.nickname || "Joueur";
                      return (
                        <div key={r.id} style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(79,180,255,.18)", background: "rgba(79,180,255,.08)", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)", flexShrink: 0 }}>
                            {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                            <div style={{ fontSize: 11.5, opacity: 0.74 }}>En attente d’acceptation</div>
                          </div>
                          <Pill label="Envoyée" tone="blue" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </NeonCard>
          )}
        </>
      ) : null}

      {showSharesTab && isSignedIn ? (
        <>
          <SectionTitle
            title="Partages reçus"
            subtitle="Stats, matchs et scores envoyés par tes amis"
            right={incomingShares.filter((it) => !it.readAt).length > 0 ? <Pill label={`${incomingShares.filter((it) => !it.readAt).length} nouveau(x)`} tone="gold" /> : <Pill label={`${incomingShares.length}`} tone="gray" />}
          />
          <NeonCard style={{ marginTop: 10 }}>
            {incomingShares.length === 0 ? (
              <div style={{ opacity: 0.82, fontSize: 12.5 }}>Aucun partage reçu pour le moment.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {incomingShares.slice(0, 6).map((it) => {
                  const owner = it.ownerUser?.displayName || it.ownerUser?.nickname || "Ami";
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        setSelectedShare(it);
                        handleReadShare(it).catch(() => {});
                      }}
                      style={{
                        textAlign: "left",
                        borderRadius: 14,
                        padding: 10,
                        border: `1px solid ${it.readAt ? "rgba(255,255,255,.10)" : "rgba(var(--online-accent-rgb),.30)"}`,
                        background: it.readAt ? "rgba(255,255,255,.055)" : "rgba(var(--online-accent-rgb),.08)",
                        color: "#f5f5f7",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 1000, color: "var(--online-accent)" }}>{it.title || it.type}</div>
                        <Pill label={it.type} tone={it.readAt ? "gray" : "gold"} />
                      </div>
                      <div style={{ marginTop: 5, fontSize: 11.8, opacity: 0.82 }}>Envoyé par {owner}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </NeonCard>
        </>
      ) : null}

      {selectedShare ? (
        <ShareDetailsModal
          item={selectedShare}
          onClose={() => setSelectedShare(null)}
          onImport={(it) => handleImportShareToHistory(it).catch(() => {})}
          importing={importingShareId === selectedShare.id}
        />
      ) : null}

      {/* ================= RÉSUMÉ ================= */}
      {showActivityTab ? (
        <>
      <SectionTitle title="Résumé" subtitle="Aperçu rapide (semaine + dernier match)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <NeonCard style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.78 }}>DERNIER MATCH</div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 1000, color: "var(--online-accent)" }}>
            {lastMatch ? getMatchTitle(lastMatch) : "—"}
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, opacity: 0.85, lineHeight: 1.25 }}>
            {lastMatch ? getMatchPlayersLabel(lastMatch) : "Pas d’historique online"}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {lastMatch ? <Pill label={formatMatchDate(lastMatch)} tone="gray" /> : <Pill label="—" tone="gray" />}
            {lastMatch && getMatchWinnerLabel(lastMatch) ? (
              <Pill label={`🏆 ${getMatchWinnerLabel(lastMatch)}`} tone="gold" />
            ) : (
              <Pill label="🏆 —" tone="gray" />
            )}
          </div>
        </NeonCard>

        <NeonCard style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.78 }}>SEMAINE</div>
          <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Match(s)</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#4fb4ff" }}>{weekMatchesCount}</div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Avg 3D</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "var(--online-accent)" }}>
                {avg3DWeek > 0 ? fmt1(avg3DWeek) : "—"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Checkout%</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#7fe2a9" }}>
                {checkoutPctWeek > 0 ? `${fmt1(checkoutPctWeek)}%` : "—"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Série</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#f5f5f7" }}>{streakLabel}</div>
            </div>
          </div>
        </NeonCard>
      </div>
        </>
      ) : null}

      {/* ================= JOUER EN LIGNE ================= */}
      {showPlayTab ? (
        <>
      <SectionTitle
        title="Jouer en ligne"
        subtitle={activeSportId === "babyfoot" ? "Baby-Foot Online · crée un salon ou rejoins un ami" : "Choisis le mode, crée un salon ou rejoins un ami"}
        right={
          creatingLobby ? (
            <button
              type="button"
              onClick={() => {
                createReqIdRef.current++;
                setCreatingLobby(false);
                setJoinError("Création annulée.");
              }}
              style={{
                borderRadius: 999,
                padding: "7px 10px",
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,90,90,.12)",
                color: "#ff8a8a",
                fontWeight: 1000,
                fontSize: 11.5,
                cursor: "pointer",
              }}
              title="Annule l’état bloqué"
            >
              Annuler
            </button>
          ) : null
        }
      />

      {activeOnlineResume?.lobbyCode ? (
        <NeonCard style={{ marginTop: 10, border: "1px solid rgba(143,230,170,.35)", background: "linear-gradient(180deg, rgba(26,72,45,.42), rgba(10,16,12,.94))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 1000, color: "#8fe6aa" }}>PARTIE ONLINE EN COURS</div>
              <div style={{ marginTop: 4, fontSize: 13, opacity: .9 }}>Salon {String(activeOnlineResume.lobbyCode).toUpperCase()} · reprise après veille / refresh / appel</div>
            </div>
            <button
              type="button"
              onClick={resumeActiveOnlineMatch}
              style={{ border: 0, borderRadius: 14, padding: "10px 12px", fontWeight: 1000, background: "linear-gradient(180deg,#8fe6aa,#35c978)", color: "#07130b", cursor: "pointer" }}
            >
              Reprendre
            </button>
          </div>
        </NeonCard>
      ) : null}

      <NeonCard style={{ marginTop: 10 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.86 }}>{activeSportId === "babyfoot" ? "Type de salon" : "Mode de jeu"}</div>
              <Pill label={activeSportId === "babyfoot" ? selectedBabyFootOnlineScopeSpec.shortLabel : selectedOnlineModeSpec.shortLabel} tone="gold" />
            </div>

            {activeSportId === "babyfoot" ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {BABYFOOT_ONLINE_SCOPES.map((scope) => {
                    const active = selectedBabyFootOnlineScope === scope.id;
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => selectBabyFootOnlineScope(scope.id)}
                        disabled={!!lobby?.code}
                        style={{
                          minHeight: 88,
                          borderRadius: 16,
                          border: active ? "1px solid rgba(var(--online-accent-rgb),.86)" : "1px solid rgba(255,255,255,.12)",
                          background: active
                            ? "radial-gradient(circle at 50% 0%, rgba(var(--online-accent-rgb),.22), rgba(255,255,255,.055))"
                            : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
                          boxShadow: active ? "0 0 22px rgba(var(--online-accent-rgb),.22), inset 0 0 0 1px rgba(255,255,255,.08)" : "inset 0 0 0 1px rgba(255,255,255,.035)",
                          color: "#f5f5f7",
                          padding: "9px 7px",
                          fontWeight: 1000,
                          cursor: lobby?.code ? "not-allowed" : "pointer",
                          opacity: lobby?.code && !active ? 0.55 : 1,
                          textAlign: "center",
                        }}
                        title={scope.joinHint}
                      >
                        <div style={{ fontSize: 20, lineHeight: 1 }}>{scope.icon}</div>
                        <div style={{ marginTop: 6, fontSize: 11.5, color: active ? "var(--online-accent)" : "#f5f5f7", textTransform: "uppercase", letterSpacing: .2 }}>{scope.shortLabel}</div>
                        <div style={{ marginTop: 4, fontSize: 9.7, opacity: .78, lineHeight: 1.15 }}>{scope.id === "match" ? "Classique" : scope.id === "league" ? "Rejoindre ligue" : "Rejoindre tournoi"}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ borderRadius: 14, border: "1px solid rgba(var(--online-accent-rgb),.18)", background: "rgba(var(--online-accent-rgb),.07)", padding: "8px 10px", fontSize: 11.2, lineHeight: 1.3, color: "var(--online-accent)", fontWeight: 850 }}>
                  <b>CRÉER</b> ouvre un salon Baby-Foot du type choisi. <b>REJOINDRE</b> accepte un code de salon, de ligue ou de tournoi.
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  padding: "4px 2px 10px",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {onlineModesForSport.map((mode) => {
                  const active = selectedOnlineMode === mode.id;
                  const tickerUrl = getOnlineModeTicker(mode);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => selectOnlineMode(mode.id)}
                      disabled={!!lobby?.code}
                      style={{
                        flex: "0 0 168px",
                        minHeight: 92,
                        textAlign: "left",
                        borderRadius: 16,
                        border: active ? "1px solid rgba(var(--online-accent-rgb),.82)" : "1px solid rgba(255,255,255,.12)",
                        background: tickerUrl
                          ? `linear-gradient(90deg, rgba(0,0,0,.86), rgba(0,0,0,.30)), url(${tickerUrl}) center / cover no-repeat`
                          : active
                          ? "linear-gradient(180deg, rgba(var(--online-accent-rgb),.18), rgba(255,255,255,.055))"
                          : "rgba(255,255,255,.045)",
                        boxShadow: active ? "0 0 20px rgba(var(--online-accent-rgb),.22), inset 0 0 0 1px rgba(255,255,255,.08)" : "inset 0 0 0 1px rgba(255,255,255,.035)",
                        color: "#f5f5f7",
                        padding: "10px 11px",
                        fontWeight: 1000,
                        cursor: lobby?.code ? "not-allowed" : "pointer",
                        opacity: lobby?.code && !active ? 0.55 : 1,
                        position: "relative",
                        overflow: "hidden",
                        scrollSnapAlign: "start",
                      }}
                      title={lobby?.code ? "Quitte ou crée un nouveau salon pour changer de mode" : mode.hint}
                    >
                      {mode.favorite ? (
                        <span
                          style={{
                            position: "absolute",
                            top: 7,
                            left: 7,
                            borderRadius: 999,
                            padding: "3px 7px",
                            background: "rgba(188,255,0,.18)",
                            border: "1px solid rgba(188,255,0,.32)",
                            color: "#c8ff00",
                            fontSize: 9.5,
                            fontWeight: 1000,
                            letterSpacing: .4,
                          }}
                        >
                          ★ FAVORI
                        </span>
                      ) : null}
                      <div style={{ position: "absolute", left: 11, right: 11, bottom: 10 }}>
                        <div style={{ fontSize: 14, textShadow: "0 2px 10px rgba(0,0,0,.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mode.shortLabel}</div>
                        <div style={{ marginTop: 3, fontSize: 10.5, opacity: 0.84, fontWeight: 850, lineHeight: 1.15, textShadow: "0 2px 8px rgba(0,0,0,.9)" }}>{mode.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <PrimaryButton
              label={creatingLobby ? "Création…" : "CRÉER"}
              subLabel={activeSportId === "babyfoot" ? selectedBabyFootOnlineScopeSpec.createHint : `Salon ${selectedOnlineModeSpec.shortLabel}`}
              disabled={creatingLobby || !canPlayOnline}
              onClick={handleCreateLobby}
              tone={!canPlayOnline ? "gray" : "gold"}
            />

            <PrimaryButton
              label={joiningLobby ? "Recherche…" : "REJOINDRE"}
              subLabel={activeSportId === "babyfoot" ? selectedBabyFootOnlineScopeSpec.joinHint : "Avec un code"}
              disabled={joiningLobby || !canPlayOnline}
              onClick={handleJoinLobby}
              tone={!canPlayOnline ? "gray" : "blue"}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.85 }}>{activeSportId === "babyfoot" ? "Code salon / ligue / tournoi" : "Code salon"}</div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder={activeSportId === "babyfoot" ? "EX : 4F9Q / LIGUE" : "EX : 4F9Q"}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(5,5,8,.95)",
                color: "#f5f5f7",
                padding: "10px 12px",
                fontSize: 13,
                letterSpacing: 2,
                textTransform: "uppercase",
                outline: "none",
              }}
            />
          </div>

          {!canPlayOnline && (
            <div className="hint" style={{ fontSize: 12, opacity: 0.88, color: "var(--online-accent)", fontWeight: 950 }}>
              Connexion requise pour jouer en ligne
            </div>
          )}

          {(joinError || joinInfo) && (
            <div style={{ fontSize: 11.8 }}>
              {joinError ? <div style={{ color: "#ff8a8a", fontWeight: 1000 }}>{joinError}</div> : null}
              {joinInfo && !joinError ? <div style={{ color: "#8fe6aa", fontWeight: 1000 }}>{joinInfo}</div> : null}
            </div>
          )}
        </div>
      </NeonCard>

      {/* ================= SALLE D’ATTENTE ================= */}
      {lobby && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,.12)",
            background:
              "radial-gradient(1200px 200px at 20% 0%, rgba(127,226,169,.12), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
            boxShadow: "0 14px 30px rgba(0,0,0,.62)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "var(--online-accent)", textShadow: "0 0 12px rgba(var(--online-accent-rgb),.18)" }}>
              Salle d’attente
            </div>
            <Pill label="LIVE" tone="green" />
          </div>

          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 14,
              background: "#0f0f14",
              border: "1px solid rgba(255,255,255,.12)",
              fontFamily: "monospace",
              letterSpacing: 2,
              fontSize: 16,
              fontWeight: 1000,
              color: "var(--online-accent)",
              textAlign: "center",
              boxShadow: "0 0 14px rgba(var(--online-accent-rgb),.18)",
            }}
          >
            {String((lobby as any).code || "").toUpperCase()}
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.84 }}>
                Mode : <span style={{ color: "var(--online-accent)" }}>{lobbyModeSpec.label}</span>
              </div>
              <Pill label={String((lobby as any).status || "waiting") === "started" ? "Lancé" : "En attente"} tone="green" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.84 }}>
                Joueurs {Number((lobby as any).playersCount || ((lobby as any).players || []).length || 0)}/{Number((lobby as any).maxPlayers || 2)}
              </div>
              <Pill label={String((lobby as any).code || "").toUpperCase()} tone="gold" />
            </div>

            {Array.isArray((lobby as any).players) && (lobby as any).players.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {((lobby as any).players || []).map((p: any, idx: number) => {
                  const name = String(p?.displayName || p?.nickname || p?.name || `Joueur ${idx + 1}`);
                  const avatar = String(p?.avatarUrl || "");
                  const role = String(p?.role || "player");
                  return (
                    <div
                      key={String(p?.userId || p?.id || idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(255,255,255,.055)",
                        padding: "8px 10px",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          background: avatar ? `center/cover no-repeat url(${avatar})` : "rgba(255,255,255,.10)",
                          border: "1px solid rgba(var(--online-accent-rgb),.28)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        <div style={{ fontSize: 10.8, opacity: 0.72 }}>{role === "spectator" ? "Spectateur" : idx === 0 ? "Hôte" : "Joueur"}</div>
                      </div>
                      <Pill
                        label={String(p?.status || "offline") === "ready" ? "Prêt" : String(p?.status || "offline") === "online" ? "Online" : "—"}
                        tone={String(p?.status || "offline") === "ready" || String(p?.status || "offline") === "online" ? "green" : "gray"}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.78 }}>En attente des joueurs…</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {!isCurrentLobbyHost ? (
              <GhostButton
                label={updatingLobbyReady ? "⏳ Mise à jour…" : currentLobbyReady ? "✅ Je suis prêt" : "☑️ Me mettre prêt"}
                onClick={toggleCurrentLobbyReady}
                disabled={updatingLobbyReady || !currentLobbyCode}
              />
            ) : null}
            <GhostButton
              label={`🚪 Ouvrir le salon ${lobbyModeSpec.shortLabel}`}
              onClick={launchOnlineLobby}
            />
            <GhostButton label={copyInfo || "📋 Copier le code"} onClick={copyLobbyCode} />
          </div>
        </div>
      )}

      {/* ================= CHAT MVP (si lobby) ================= */}
      {lobbyKey ? (
        <>
          <SectionTitle title="Chat (MVP)" subtitle={`Lobby ${lobbyKey}`} />
          <NeonCard style={{ marginTop: 10 }}>
            {chatError ? (
              <div style={{ color: "#ff8a8a", fontWeight: 950, fontSize: 12 }}>{chatError}</div>
            ) : null}

            <div
              style={{
                marginTop: chatError ? 10 : 0,
                maxHeight: 220,
                overflow: "auto",
                display: "grid",
                gap: 8,
                paddingRight: 4,
              }}
            >
              {chatLoading ? (
                <div style={{ opacity: 0.85 }}>Chargement…</div>
              ) : chatMessages.length === 0 ? (
                <div style={{ opacity: 0.85 }}>Aucun message. Lance la discussion 🙂</div>
              ) : (
                chatMessages.slice(-80).map((m: any, idx: number) => {
                  const name = String(m?.name || m?.user_name || "Joueur");
                  const text = String(m?.text || m?.message || "");
                  const mine = !!sessionUserId && (m?.userId === sessionUserId || m?.user_id === sessionUserId);
                  return (
                    <div
                      key={`${m?.id || idx}`}
                      style={{
                        borderRadius: 12,
                        padding: "8px 10px",
                        border: "1px solid rgba(255,255,255,.10)",
                        background: mine ? "rgba(127,226,169,.10)" : "rgba(255,255,255,.06)",
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.9 }}>
                        {name} {mine ? "• toi" : ""}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.2 }}>{text}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={canPlayOnline ? "Écris un message…" : "Connexion requise"}
                disabled={!canPlayOnline}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat().catch(() => {});
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(5,5,8,.95)",
                  color: "#f5f5f7",
                  padding: "10px 12px",
                  fontSize: 13,
                  outline: "none",
                  opacity: canPlayOnline ? 1 : 0.65,
                }}
              />
              <button
                type="button"
                onClick={() => sendChat().catch(() => {})}
                disabled={!canPlayOnline || !chatText.trim()}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "linear-gradient(180deg, #4fb4ff, #1c78d5)",
                  color: "#04101f",
                  fontWeight: 1000,
                  cursor: !canPlayOnline ? "default" : "pointer",
                  opacity: !canPlayOnline || !chatText.trim() ? 0.55 : 1,
                  minWidth: 84,
                }}
              >
                Envoyer
              </button>
            </div>
          </NeonCard>
        </>
      ) : null}

      {/* ================= EXPLORER ================= */}
      <SectionTitle title="Explorer" subtitle="Fonctions online (certaines en SOON pour l’instant)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <GhostButton label="🧾 Historique online" onClick={() => go("stats_online" as any)} />

        {/* ✅ Étape 5: Spectateur activé */}
        <GhostButton label="👀 Spectateur" onClick={() => go("spectator" as any)} />

        <GhostButton label="💬 Chat amis (SOON)" onClick={() => {}} disabled />
        <GhostButton label="🏆 Classements (SOON)" onClick={() => {}} disabled />
      </div>
        </>
      ) : null}

      {/* ================= ACTIVITÉ RÉCENTE ================= */}
      {showActivityTab ? (
        <>
      <SectionTitle
        title="Activité récente"
        subtitle="Tes derniers matchs online"
        right={
          <button
            type="button"
            onClick={handleClearOnlineHistory}
            style={{
              borderRadius: 999,
              padding: "7px 10px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,90,90,.12)",
              color: "#ff8a8a",
              fontWeight: 1000,
              fontSize: 11.5,
              cursor: "pointer",
            }}
            title="Supprime le cache local (utile en debug)"
          >
            Effacer cache local
          </button>
        }
      />

      <NeonCard style={{ marginTop: 10 }}>
        {loadingMatches ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>Chargement…</div>
        ) : sortedMatches.length === 0 ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>
            Aucun match online enregistré pour le moment. Crée un salon X01 pour lancer ton premier match.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, paddingLeft: 6 }}>
            {sortedMatches.slice(0, 5).map((m: any) => {
              const isTraining = (m as any).isTraining === true || (m as any)?.payload?.kind === "training_x01";
              return (
                <MatchMiniCard
                  key={m.id}
                  title={getMatchTitle(m)}
                  dateLabel={formatMatchDate(m)}
                  playersLabel={getMatchPlayersLabel(m)}
                  winner={getMatchWinnerLabel(m)}
                  kindTone={isTraining ? "green" : "gold"}
                />
              );
            })}

            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <GhostButton label="📊 Ouvrir Stats Online" onClick={() => go("stats_online" as any)} />
            </div>
          </div>
        )}
      </NeonCard>
        </>
      ) : null}

      <div style={{ height: 10 }} />
    </div>
  );
}