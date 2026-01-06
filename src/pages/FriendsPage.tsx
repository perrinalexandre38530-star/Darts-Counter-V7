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
// - Session Supabase FIABLE via supabase.auth.getSession() (même si table profiles manque)
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
import type { Store } from "../lib/types";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineLobby } from "../lib/onlineApi";
import type { OnlineMatch } from "../lib/onlineTypes";
import { getCountryFlag } from "../lib/countryNames";
import InfoDot from "../components/InfoDot";

// ⚠️ adapte si ton projet exporte supabase ailleurs
import { supabase } from "../lib/supabase";

// ✅ Realtime presence + chat MVP
import { joinPresence } from "../lib/onlinePresence";
import { fetchMessages, postMessage, subscribeMessages } from "../lib/chatApi";

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
    gold: ["rgba(255,213,106,.18)", "#ffd56a", "rgba(255,213,106,.35)"],
    blue: ["rgba(79,180,255,.14)", "#4fb4ff", "rgba(79,180,255,.35)"],
    green: ["rgba(127,226,169,.14)", "#7fe2a9", "rgba(127,226,169,.35)"],
    orange: ["rgba(255,179,71,.14)", "#ffb347", "rgba(255,179,71,.35)"],
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
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
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
            color: "#ffd56a",
            textShadow: "0 0 12px rgba(255,215,80,.25)",
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
      : ["#ffd56a", "#e9a93d"];

  const fg = tone === "gray" ? "rgba(255,255,255,.60)" : tone === "gold" ? "#1c1304" : "#04101f";

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
          "radial-gradient(1200px 180px at 20% 0%, rgba(255,213,106,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
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

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,213,106,.55), rgba(79,180,255,.35), transparent)", opacity: 0.75 }} />

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
              }}
            >
              <Pill label="•" tone={it.tone || "gold"} />
              <span style={{ letterSpacing: 0.2 }}>{it.text}</span>
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
        {winner ? <div style={{ fontSize: 11, color: "#ffd56a", fontWeight: 950 }}>🏆 {winner}</div> : null}
      </div>

      <div style={{ fontSize: 11, opacity: 0.88, lineHeight: 1.2 }}>{playersLabel}</div>
    </div>
  );
}

/* -------------------------------------------------
   Composant principal
--------------------------------------------------*/
type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
};

export default function FriendsPage({ store, update, go }: Props) {
  // Profil actif local
  const activeProfile =
    (store.profiles || []).find((p: any) => p.id === (store as any).activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  // Hook online (ne pas bloquer sur profile !)
  const auth = useAuthOnline() as any;
  const ready = !!auth.ready;

  if (!ready) {
    return (
      <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
        Connexion en cours…
      </div>
    );
  }

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
     Session Supabase (FIABLE)
  ------------------------------ */
  const [sessionState, setSessionState] = React.useState<"checking" | "signed_in" | "signed_out">("checking");
  const [sessionUserId, setSessionUserId] = React.useState<string | null>(null);
  const [authHint, setAuthHint] = React.useState<string | null>(null);

  const refreshSession = React.useCallback(async () => {
    try {
      setSessionState("checking");
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const uid = data?.session?.user?.id || null;
      setSessionUserId(uid);
      setSessionState(uid ? "signed_in" : "signed_out");
    } catch (e: any) {
      setAuthHint(normalizeErrMessage(e));
      setSessionUserId(null);
      setSessionState("signed_out");
    }
  }, []);

  React.useEffect(() => {
    refreshSession().catch(() => {});
    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshSession().catch(() => {});
    });
    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, [refreshSession]);

  const isSignedIn = sessionState === "signed_in" && !!sessionUserId;

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

    // ✅ sync realtime presence
    presenceRef.current?.setState(newStatus === "away" ? "away" : "online").catch(() => {});
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
  const [reconnecting, setReconnecting] = React.useState(false);

  const doReconnect = React.useCallback(async () => {
    if (reconnecting) return;
    setReconnecting(true);
    setAuthHint(null);
    try {
      const ensure = (onlineApi as any)?.ensureAutoSession as undefined | (() => Promise<any>);
      if (ensure) {
        await withTimeout(ensure(), 8000, "Auto-session : délai dépassé.");
      }

      const refresh = auth?.refresh as undefined | (() => Promise<any>);
      if (refresh) {
        await refresh().catch((e: any) => setAuthHint(normalizeErrMessage(e)));
      }

      await pingServer();
      await refreshSession();
      setAuthHint((prev) => prev || "Reconnexion effectuée.");
    } catch (e: any) {
      setAuthHint(normalizeErrMessage(e));
      await refreshSession();
    } finally {
      setReconnecting(false);
    }
  }, [reconnecting, auth, pingServer, refreshSession]);

  const doLogout = React.useCallback(async () => {
    setAuthHint(null);
    try {
      const logout = auth?.logout as undefined | (() => Promise<any>);
      if (logout) await logout();
      else await supabase.auth.signOut();
    } catch (e: any) {
      setAuthHint(normalizeErrMessage(e));
    } finally {
      await refreshSession();
    }
  }, [auth, refreshSession]);

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
        const list = await onlineApi.listMatches(50);
        if (!cancelled) {
          setMatches(list || []);
          try {
            window.localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list || []));
          } catch {}
        }
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    }
    load();
    return () => {
      cancelled = true;
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
      const lobby = await withTimeout(
        onlineApi.createLobby({
          mode: "x01",
          maxPlayers: 2,
          settings: {
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
      setJoinInfo("Salon créé.");
    } catch (e: any) {
      if (createReqIdRef.current !== reqId) return;
      setJoinError(normalizeErrMessage(e) || "Impossible de créer un salon.");
    } finally {
      if (createReqIdRef.current === reqId) setCreatingLobby(false);
    }
  }

  async function handleJoinLobby() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setJoinError("Entre un code de salon.");
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

  function cancelCreate() {
    createReqIdRef.current++;
    setCreatingLobby(false);
    setJoinError("Création annulée.");
  }

  const lobby = joinedLobby || lastCreatedLobby;

  /* -----------------------------
     Chat MVP (si lobby existe)
  ------------------------------ */
  const lobbyKey = React.useMemo(() => {
    const code = (lobby as any)?.code;
    if (!code) return null;
    return String(code).toUpperCase();
  }, [lobby]);

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

  const serverChipTone = serverState === "ok" ? "green" : serverState === "down" ? "red" : "gray";
  const presenceTone = selfStatus === "online" ? "green" : selfStatus === "away" ? "orange" : "gray";
  const presenceLabel = selfStatus === "online" ? "En ligne" : selfStatus === "away" ? "Absent" : "Hors ligne";

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* ================= HEADER (CAPTURE 1 EXACTE) ================= */}
      <NeonCard
        style={{
          background:
            "radial-gradient(1200px 240px at 20% 0%, rgba(255,213,106,.18), transparent 55%), radial-gradient(900px 220px at 90% 0%, rgba(79,180,255,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
          marginBottom: 12,
        }}
      >
        {/* ===== HEADER TITRE ===== */}
        <div
          className="online-header"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="online-title" style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 1000,
                color: "#ffd56a",
                textShadow: "0 0 18px rgba(255,215,80,.22)",
                lineHeight: 1.0,
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

          <InfoDot onClick={() => setShowInfo((v) => !v)} active={showInfo} />
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
            <div style={{ fontWeight: 1000, color: "#ffd56a" }}>Infos</div>
            <div style={{ marginTop: 6, fontSize: 12.2, opacity: 0.88, lineHeight: 1.25 }}>
              Crée un salon, rejoins un ami, retrouve ton historique online, et bientôt :
              spectateur • chat amis • classements • tournois.
            </div>
            {serverState === "down" && serverHint ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#ff8a8a", fontWeight: 950 }}>{serverHint}</div>
            ) : null}
            {authHint ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#ffd56a", fontWeight: 950 }}>{authHint}</div>
            ) : null}
          </div>
        ) : null}

        {/* ===== HEADER PROFIL ===== */}
        <div
          className="online-profile"
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="avatar-block" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                boxShadow: "0 0 18px rgba(255,215,80,.22)",
                border: "1px solid rgba(255,255,255,.18)",
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 1000,
                    color: "#1a1a1a",
                    fontSize: 16,
                  }}
                >
                  {(displayName || "??").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                className="player-name"
                style={{
                  fontWeight: 1000,
                  color: "#ffd56a",
                  textShadow: "0 0 12px rgba(255,215,80,.18)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </div>

              <div className={`status ${selfStatus}`} style={{ marginTop: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Pill label={presenceLabel} tone={presenceTone} />
                {countryFlag ? <span style={{ fontSize: 16, lineHeight: 1 }} title={countryRaw}>{countryFlag}</span> : null}
                {lastSeenLabel ? <span style={{ opacity: 0.78, fontSize: 12 }}>({lastSeenLabel})</span> : null}
              </div>

              {/* (optionnel) mini aperçu présenceMap */}
              {Object.keys(presenceMap || {}).length > 0 ? (
                <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.85 }}>
                  {Object.keys(presenceMap).length} joueur(s) en présence
                </div>
              ) : null}
            </div>
          </div>

          <div className="profile-actions" style={{ display: "grid", gap: 8, alignContent: "start", width: 190 }}>
            {/* boutons alignés (même taille) */}
            <button onClick={() => setPresence("online")} className="btn green" style={{ width: "100%" }}>
              En ligne
            </button>
            <button onClick={() => setPresence("away")} className="btn orange" style={{ width: "100%" }}>
              Absent
            </button>

            {isSignedIn ? (
              <button onClick={doLogout} className="btn red" style={{ width: "100%" }}>
                Déconnexion
              </button>
            ) : (
              <button onClick={() => go("profiles")} className="btn blue" style={{ width: "100%" }}>
                Connexion
              </button>
            )}
          </div>
        </div>
      </NeonCard>

      {/* ================= TICKER ================= */}
      <OnlineTicker items={tickerItems} speedSec={22} />

      {/* ================= RÉSUMÉ ================= */}
      <SectionTitle title="Résumé" subtitle="Aperçu rapide (semaine + dernier match)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <NeonCard style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.78 }}>DERNIER MATCH</div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 1000, color: "#ffd56a" }}>
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
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#ffd56a" }}>
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

      {/* ================= JOUER EN LIGNE ================= */}
      <SectionTitle
        title="Jouer en ligne"
        subtitle="Créer un salon, rejoindre une salle d’attente"
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

      <NeonCard style={{ marginTop: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <PrimaryButton
            label={creatingLobby ? "Création…" : "Créer un salon X01"}
            subLabel="Match privé • invite un ami avec un code"
            disabled={creatingLobby || !canPlayOnline}
            onClick={handleCreateLobby}
            tone={!canPlayOnline ? "gray" : "gold"}
          />

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.85 }}>Code salon</div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="EX : 4F9Q"
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

          <PrimaryButton
            label={joiningLobby ? "Recherche…" : "Rejoindre"}
            subLabel="Accède à la salle d’attente"
            disabled={joiningLobby || !canPlayOnline}
            onClick={handleJoinLobby}
            tone={!canPlayOnline ? "gray" : "blue"}
          />

          {!canPlayOnline && (
            <div className="hint" style={{ fontSize: 12, opacity: 0.88, color: "#ffd56a", fontWeight: 950 }}>
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
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#ffd56a", textShadow: "0 0 12px rgba(255,215,80,.18)" }}>
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
              color: "#ffd56a",
              textAlign: "center",
              boxShadow: "0 0 14px rgba(255,215,80,.18)",
            }}
          >
            {String((lobby as any).code || "").toUpperCase()}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <GhostButton
              label="🚀 Reprendre / lancer le match"
              onClick={() => go("x01_online_setup", { lobbyCode: (lobby as any).code || null })}
            />
            <GhostButton label="📋 Copier le code (SOON)" onClick={() => {}} disabled />
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

      {/* ================= ACTIVITÉ RÉCENTE ================= */}
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

      <div style={{ height: 10 }} />
    </div>
  );
}
