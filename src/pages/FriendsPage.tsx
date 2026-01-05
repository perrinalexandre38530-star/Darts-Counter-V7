// ============================================
// src/pages/FriendsPage.tsx
// Mode Online & Amis — v8 FULLWEB (Supabase)
//
// ✅ V8 RULES (OBLIGATOIRE)
// - AUCUN formulaire login/signup ici
// - AUCUN bouton login / signup
// - On affiche juste l'état via useAuthOnline()
// - onlineApi.ensureAutoSession() est déclenché AU BOOT (dans App.tsx)
//
// ✅ Features conservées
// - Statut global store.selfStatus (online / away / offline)
// - Présence locale lastSeen + ping toutes les 30s en "online"
// - Lobbies ONLINE : create + join par code
// - Affiche drapeau pays du profil actif (privateInfo.country)
// - Bouton TEST SUPABASE
// - Bloc "Salons online" AU-DESSUS de l’historique
// - Historique online : cards + tri + regroupement (Aujourd’hui / 7 derniers jours / Avant)
// - Bouton "Lancer maintenant" -> x01_online_setup avec lobbyCode
// ============================================

import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import type { Store } from "../lib/types";

import { onlineApi } from "../lib/onlineApi";
import type { OnlineLobby } from "../lib/onlineApi";
import type { OnlineMatch } from "../lib/onlineTypes";

import { supabase } from "../lib/supabase";
import { getCountryFlag } from "../lib/countryNames";

/* -------------------------------------------------
   Constantes localStorage
--------------------------------------------------*/
const LS_PRESENCE_KEY = "dc_online_presence_v1";
// Gardé pour compat avec StatsOnline (qui lit encore ce cache local)
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type PresenceStatus = "online" | "away" | "offline";

type StoredPresence = {
  status: PresenceStatus;
  lastSeen: number;
};

/* ------ Helpers localStorage présence ------ */

function savePresenceToLS(status: PresenceStatus) {
  if (typeof window === "undefined") return;
  const payload: StoredPresence = { status, lastSeen: Date.now() };
  try {
    window.localStorage.setItem(LS_PRESENCE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadPresenceFromLS(): StoredPresence | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_PRESENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lastSeen !== "number") return null;
    const st = parsed.status;
    const status: PresenceStatus = st === "online" || st === "away" || st === "offline" ? st : "offline";
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

/* ------------------------------
   UI helpers (cards / sections)
------------------------------ */

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
            fontWeight: 900,
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

function NeonCard({
  children,
  accent = "rgba(255,213,106,.55)",
  style,
}: {
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,.55)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${accent}, rgba(255,255,255,0))`,
          opacity: 0.9,
        }}
      />
      {children}
    </div>
  );
}

function Pill({
  label,
  tone = "gold",
}: {
  label: string;
  tone?: "gold" | "blue" | "green" | "red" | "gray";
}) {
  const map: any = {
    gold: ["rgba(255,213,106,.18)", "#ffd56a", "rgba(255,213,106,.35)"],
    blue: ["rgba(79,180,255,.14)", "#4fb4ff", "rgba(79,180,255,.35)"],
    green: ["rgba(127,226,169,.14)", "#7fe2a9", "rgba(127,226,169,.35)"],
    red: ["rgba(255,90,90,.14)", "#ff5a5a", "rgba(255,90,90,.35)"],
    gray: ["rgba(255,255,255,.08)", "rgba(255,255,255,.9)", "rgba(255,255,255,.12)"],
  };
  const [bg, fg, bd] = map[tone] || map.gray;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 10.8,
        fontWeight: 900,
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

function toTs(m: any) {
  const ts = m?.finishedAt || m?.startedAt || m?.createdAt || 0;
  const n = typeof ts === "number" ? ts : Date.parse(ts);
  return Number.isFinite(n) ? n : 0;
}

function groupMatchesPretty(list: any[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const today: any[] = [];
  const week: any[] = [];
  const older: any[] = [];

  for (const m of list) {
    const t = toTs(m);
    if (!t) {
      older.push(m);
      continue;
    }
    if (now - t < day) today.push(m);
    else if (now - t < 7 * day) week.push(m);
    else older.push(m);
  }

  return { today, week, older };
}

function MatchMiniCard({ m, title, dateLabel, playersLabel, winner, kindTone }: any) {
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
            fontWeight: 900,
            fontSize: 12.5,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <Pill label={m?.isTraining || (m?.payload as any)?.kind === "training_x01" ? "Training" : "Match"} tone={kindTone} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 11, opacity: 0.82 }}>{dateLabel}</div>
        {winner ? (
          <div style={{ fontSize: 11, color: "#ffd56a", fontWeight: 900 }}>🏆 {winner}</div>
        ) : null}
      </div>

      <div style={{ fontSize: 11, opacity: 0.88, lineHeight: 1.2 }}>{playersLabel}</div>
    </div>
  );
}

function MiniTile({ title, desc, tone = "blue" }: { title: string; desc: string; tone?: "blue" | "gold" | "green" }) {
  const accent =
    tone === "gold" ? "rgba(255,213,106,.55)" : tone === "green" ? "rgba(127,226,169,.55)" : "rgba(79,180,255,.55)";

  return (
    <div
      style={{
        borderRadius: 14,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
        boxShadow: "0 10px 20px rgba(0,0,0,.45)",
        position: "relative",
        overflow: "hidden",
        minHeight: 78,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(900px 140px at 0% 0%, ${accent.replace(",.55", ",.18")}, transparent 55%)`,
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 950, color: "#f5f5f7" }}>{title}</div>
          <Pill label="SOON" tone="gray" />
        </div>
        <div style={{ marginTop: 6, fontSize: 11.2, opacity: 0.82, lineHeight: 1.25 }}>{desc}</div>
      </div>
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
  // --- Profil local actif (fallback pseudo + avatar)
  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) || (store.profiles || [])[0] || null;

  // -------- AUTH ONLINE (V8: AUTO SESSION) --------
  const { ready, status, user, profile } = useAuthOnline();

  // ✅ V8 : ne JAMAIS bloquer avec un login UI
  if (!ready) {
    return (
      <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
        Connexion en cours…
      </div>
    );
  }

  const isSignedIn = status === "signed_in";

  // --- lastSeen (présence locale)
  const initialPresence = React.useMemo(() => loadPresenceFromLS(), []);
  const [lastSeen, setLastSeen] = React.useState<number | null>(initialPresence?.lastSeen ?? null);

  // --- statut global de l'app : store.selfStatus
  const selfStatus: PresenceStatus = (store.selfStatus as PresenceStatus) || "offline";

  const statusLabel = selfStatus === "away" ? "Absent" : selfStatus === "online" ? "En ligne" : "Hors ligne";
  const statusColor = selfStatus === "away" ? "#ffb347" : selfStatus === "online" ? "#7fe2a9" : "#cccccc";

  const displayName =
    activeProfile?.name || (profile as any)?.displayName || (profile as any)?.display_name || (user as any)?.nickname || "Joueur";

  const lastSeenLabel = formatLastSeenAgo(lastSeen);

  // --- Drapeau pays du profil actif (privateInfo.country)
  const privateInfo = ((activeProfile as any)?.privateInfo || {}) as any;
  const countryRaw = privateInfo.country || "";
  const countryFlag = getCountryFlag(countryRaw);

  // --- Historique online (onlineApi.listMatches)
  const [matches, setMatches] = React.useState<OnlineMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  // -------- LOBBIES ONLINE --------
  const [creatingLobby, setCreatingLobby] = React.useState(false);
  const [lastCreatedLobby, setLastCreatedLobby] = React.useState<OnlineLobby | null>(null);

  const [joinCode, setJoinCode] = React.useState("");
  const [joiningLobby, setJoiningLobby] = React.useState(false);
  const [joinedLobby, setJoinedLobby] = React.useState<OnlineLobby | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinInfo, setJoinInfo] = React.useState<string | null>(null);

  /* -------------------------------------------------
      TEST SUPABASE
  --------------------------------------------------*/
  async function testSupabase() {
    console.log("[TEST] Supabase: démarrage…");
    try {
      const { data, error } = await supabase.from("profiles_online").select("*").limit(1);
      console.log("[TEST] Supabase result:", { data, error });
      alert(error ? "Erreur Supabase (voir console)" : "Connexion Supabase OK (voir console)");
    } catch (e) {
      console.error("[TEST] Supabase: exception", e);
      alert("Exception lors de l’appel Supabase (voir console)");
    }
  }

  /* -------------------------------------------------
      Gestion présence locale (set + ping 30s)
  --------------------------------------------------*/
  function setPresence(newStatus: PresenceStatus) {
    update((st) => ({ ...st, selfStatus: newStatus as any }));
    savePresenceToLS(newStatus);
    setLastSeen(Date.now());
  }

  // 🔁 Ping toutes les 30s quand "online"
  React.useEffect(() => {
    if (!isSignedIn || selfStatus !== "online") return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      savePresenceToLS("online");
      setLastSeen(Date.now());
    }, 30_000);

    return () => window.clearInterval(id);
  }, [isSignedIn, selfStatus]);

  // Boot présence (si on retrouve une ancienne présence locale très vieille -> away)
  React.useEffect(() => {
    if (!initialPresence) return;
    const diff = Date.now() - initialPresence.lastSeen;
    if (diff > 10 * 60_000 && selfStatus === "online") {
      setPresence("away");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------
      Historique Online (serveur)
  --------------------------------------------------*/
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
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[online] listMatches failed", e);
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
    } catch {
      // ignore
    }
    setMatches([]);
  }

  function getMatchTitle(m: OnlineMatch): string {
    const isTraining = (m as any).isTraining === true || (m.payload as any)?.kind === "training_x01";
    if (m.mode === "x01") return isTraining ? "X01 Training" : "X01 (match)";
    return m.mode || "Match";
  }

  function formatMatchDate(m: OnlineMatch): string {
    const ts = (m as any).finishedAt || (m as any).startedAt || (m as any).createdAt;
    const d = new Date(ts);
    return d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function getMatchPlayersLabel(m: OnlineMatch): string {
    const players = (m.players || []) as any[];
    if (!players.length) return "Joueurs inconnus";
    if (players.length === 1) return players[0].name || "Solo";
    if (players.length === 2) return `${players[0].name} vs ${players[1].name}`;
    return players.map((p) => p.name).join(" · ");
  }

  function getMatchWinnerLabel(m: OnlineMatch): string | null {
    const winnerId = (m as any).winnerId;
    if (!winnerId) return null;
    const found = (m.players || []).find((p: any) => p.id === winnerId);
    return found?.name || null;
  }

  // ---------- Création d'un salon X01 ----------
  async function handleCreateLobby() {
    if (creatingLobby) return;

    setCreatingLobby(true);
    setJoinInfo(null);
    setJoinError(null);

    try {
      const lobby = await onlineApi.createLobby({
        mode: "x01",
        maxPlayers: 2,
        settings: {
          start: (store.settings as any).defaultX01,
          doubleOut: (store.settings as any).doubleOut,
        },
      } as any);

      setLastCreatedLobby(lobby);
      setJoinedLobby(null);
      setJoinInfo("Salon créé sur le serveur online.");
      console.log("[online] lobby créé", lobby);
    } catch (e: any) {
      console.warn(e);
      setJoinError(e?.message || "Impossible de créer un salon online pour le moment.");
    } finally {
      setCreatingLobby(false);
    }
  }

  // ---------- Join d'un salon X01 par code ----------
  async function handleJoinLobby() {
    const code = joinCode.trim().toUpperCase();

    setJoinError(null);
    setJoinInfo(null);
    setJoinedLobby(null);

    if (!code) {
      setJoinError("Entre un code de salon.");
      return;
    }

    setJoiningLobby(true);
    try {
      const lobby = await onlineApi.joinLobby({
        code,
        userId: (user as any)?.id || "anon",
        nickname:
          (profile as any)?.displayName ||
          (profile as any)?.display_name ||
          (user as any)?.nickname ||
          activeProfile?.name ||
          "Joueur",
      } as any);

      setJoinedLobby(lobby);
      setJoinInfo("Salon trouvé sur le serveur online.");
      console.log("[online] join lobby ok", lobby);
    } catch (e: any) {
      console.warn(e);
      setJoinError(e?.message || "Impossible de rejoindre ce salon pour le moment.");
    } finally {
      setJoiningLobby(false);
    }
  }

  // ✅ TRI global + groupement joli
  const sortedMatches = React.useMemo(() => (matches || []).slice().sort((a: any, b: any) => toTs(b) - toTs(a)), [matches]);
  const grouped = React.useMemo(() => groupMatchesPretty(sortedMatches as any), [sortedMatches]);

  const lobby = joinedLobby || lastCreatedLobby;
  const uidShort = typeof (user as any)?.id === "string" ? (user as any).id.slice(0, 8) : null;

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* ================= HERO HEADER (jeu online) ================= */}
      <div
        style={{
          borderRadius: 18,
          padding: 14,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "radial-gradient(1200px 240px at 20% 0%, rgba(255,213,106,.18), transparent 55%), radial-gradient(900px 220px at 90% 0%, rgba(79,180,255,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
          boxShadow: "0 12px 28px rgba(0,0,0,.60)",
          position: "relative",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(255,213,106,.08), rgba(79,180,255,.06), transparent)",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, opacity: 0.8 }}>MODE EN LIGNE</div>
              <div style={{ fontSize: 22, fontWeight: 950, marginTop: 4, textShadow: "0 0 18px rgba(255,215,80,.12)" }}>
                Online Hub
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 4 }}>
                Salons • Matchs • Amis • Historique • Classements
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <button
                onClick={testSupabase}
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,.35)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                title="TEST SUPABASE"
              >
                TEST SUPABASE
              </button>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: isSignedIn ? "rgba(127,226,169,.10)" : "rgba(255,90,90,.10)",
                  fontSize: 11.5,
                  fontWeight: 900,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isSignedIn ? "#7fe2a9" : "#ff5a5a",
                    boxShadow: isSignedIn ? "0 0 10px rgba(127,226,169,.35)" : "0 0 10px rgba(255,90,90,.35)",
                  }}
                />
                {isSignedIn ? "Serveur : OK" : "Serveur : hors ligne"}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,213,106,.55), rgba(79,180,255,.35), transparent)",
              opacity: 0.85,
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            V8 : compte cloud actif automatiquement (auto-session). Aucun écran login ici.
          </div>
        </div>
      </div>

      {/* ================= COMPTE CLOUD (propre) ================= */}
      <NeonCard accent="rgba(255,213,106,.55)">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar local + drapeau */}
          <div style={{ position: "relative", width: 62, height: 62, flexShrink: 0 }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                boxShadow: "0 0 16px rgba(255,215,80,.18)",
              }}
            >
              {activeProfile?.avatarDataUrl ? (
                <img src={activeProfile.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                    color: "#1a1a1a",
                    fontSize: 20,
                  }}
                >
                  {(displayName || "??").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {countryFlag ? (
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "2px solid #000",
                  overflow: "hidden",
                  boxShadow: "0 0 10px rgba(0,0,0,.85)",
                  background: "#111",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 2,
                }}
                title={countryRaw}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{countryFlag}</span>
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 950,
                color: "#ffd56a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textShadow: "0 0 12px rgba(255,215,80,.18)",
              }}
            >
              {displayName}
            </div>

            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Pill label={`Status : ${status}`} tone={isSignedIn ? "green" : "red"} />
              <Pill label="Auto-session" tone="blue" />
              {uidShort ? <Pill label={`UID: ${uidShort}…`} tone="gray" /> : null}
            </div>

            {lastSeenLabel ? <div style={{ marginTop: 7, fontSize: 11.3, opacity: 0.85 }}>Dernière activité : {lastSeenLabel}</div> : null}
          </div>
        </div>

        {/* Présence app */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPresence(selfStatus === "away" ? "online" : "away")}
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,.12)",
              fontWeight: 900,
              fontSize: 12,
              background:
                selfStatus === "away"
                  ? "linear-gradient(180deg, rgba(127,226,169,.18), rgba(0,0,0,.35))"
                  : "linear-gradient(180deg, rgba(255,179,71,.18), rgba(0,0,0,.35))",
              color: "#f5f5f7",
              cursor: "pointer",
            }}
          >
            {selfStatus === "away" ? "Revenir en ligne" : "Passer absent"}
          </button>

          <div
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(0,0,0,.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 950,
              minWidth: 130,
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span>{statusLabel}</span>
          </div>
        </div>
      </NeonCard>

      {/* ================= FEATURES ONLINE (tuiles style jeu) ================= */}
      <SectionTitle title="Fonctions en ligne" subtitle="Interface prête • fonctionnalités à brancher ensuite" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <MiniTile title="Amis" desc="Présence, invitations, messages" tone="blue" />
        <MiniTile title="Classements" desc="Saisons, top avg3D, winrate" tone="gold" />
        <MiniTile title="Tournois" desc="Brackets & événements" tone="green" />
        <MiniTile title="Replays" desc="Historique détaillé des matchs" tone="blue" />
      </div>

      {/* ================= SALONS ONLINE (serveur) ================= */}
      <SectionTitle title="Salons online" subtitle="Créer un salon X01 ou rejoindre avec un code (serveur)" />

      <NeonCard accent="rgba(79,180,255,.55)" style={{ marginTop: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={handleCreateLobby}
            disabled={creatingLobby}
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "12px 12px",
              border: "1px solid rgba(255,255,255,.16)",
              background: creatingLobby ? "linear-gradient(180deg,#666,#444)" : "linear-gradient(180deg,#ffd56a,#e9a93d)",
              color: "#1c1304",
              fontWeight: 950,
              fontSize: 13.5,
              cursor: creatingLobby ? "default" : "pointer",
              opacity: creatingLobby ? 0.65 : 1,
              boxShadow: "0 10px 22px rgba(0,0,0,.45)",
            }}
          >
            {creatingLobby ? "Création…" : "Créer un salon X01"}
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Code salon</div>
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

            <button
              type="button"
              onClick={handleJoinLobby}
              disabled={joiningLobby}
              style={{
                width: 160,
                borderRadius: 14,
                padding: "12px 12px",
                border: "1px solid rgba(255,255,255,.16)",
                background: joiningLobby ? "linear-gradient(180deg,#555,#333)" : "linear-gradient(180deg,#4fb4ff,#1c78d5)",
                color: "#04101f",
                fontWeight: 950,
                fontSize: 13,
                cursor: joiningLobby ? "default" : "pointer",
                opacity: joiningLobby ? 0.65 : 1,
                boxShadow: "0 10px 22px rgba(0,0,0,.45)",
              }}
            >
              {joiningLobby ? "Recherche…" : "Rejoindre"}
            </button>
          </div>

          {(joinError || joinInfo) && (
            <div style={{ fontSize: 11.8 }}>
              {joinError ? <div style={{ color: "#ff8a8a", fontWeight: 900 }}>{joinError}</div> : null}
              {joinInfo && !joinError ? <div style={{ color: "#8fe6aa", fontWeight: 900 }}>{joinInfo}</div> : null}
            </div>
          )}
        </div>
      </NeonCard>

      {/* ================= WAITING ROOM ONLINE ================= */}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 950, color: "#ffd56a", textShadow: "0 0 12px rgba(255,215,80,.18)" }}>
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
              fontWeight: 950,
              color: "#ffd56a",
              textAlign: "center",
              boxShadow: "0 0 14px rgba(255,215,80,.18)",
            }}
          >
            {lobby.code}
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))",
              border: "1px solid rgba(255,255,255,.10)",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle,#ffd56a,#c8922f)",
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(255,215,80,.22)",
              }}
            >
              {activeProfile?.avatarDataUrl ? (
                <img src={activeProfile.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                    color: "#1a1a1a",
                    fontSize: 20,
                  }}
                >
                  {(activeProfile?.name || "??").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 14, color: "#ffd56a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeProfile?.name || "Hôte"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Invite un ami avec le code ci-dessus</div>
            </div>

            {countryFlag ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #000",
                  background: "#111",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 15,
                  boxShadow: "0 0 10px rgba(0,0,0,.85)",
                }}
              >
                {countryFlag}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => go("x01_online_setup", { lobbyCode: lobby.code || null })}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "12px 14px",
              border: "none",
              fontWeight: 950,
              fontSize: 14.5,
              background: "linear-gradient(180deg,#35c86d,#23a958)",
              color: "#03140a",
              boxShadow: "0 12px 24px rgba(0,0,0,.55)",
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            🚀 Lancer maintenant
          </button>
        </div>
      )}

      {/* ================= HISTORIQUE ONLINE ================= */}
      <SectionTitle
        title="Historique Online"
        subtitle="Trié du plus récent au plus ancien • regroupé automatiquement"
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
              fontWeight: 950,
              fontSize: 11.5,
              cursor: "pointer",
            }}
            title="Supprime le cache local (utile si StatsOnline lit encore ce cache)"
          >
            Effacer cache local
          </button>
        }
      />

      <NeonCard accent="rgba(79,180,255,.55)" style={{ marginTop: 10 }}>
        {loadingMatches ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>Chargement…</div>
        ) : sortedMatches.length === 0 ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>
            Aucun match online enregistré pour le moment. Crée un salon X01 pour lancer ton premier match.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, paddingLeft: 6 }}>
            {/* Aujourd’hui */}
            {grouped.today?.length ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.82, marginBottom: 6 }}>Aujourd’hui</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.today.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining = (m as any).isTraining === true || (m.payload as any)?.kind === "training_x01";
                    return (
                      <MatchMiniCard
                        key={m.id}
                        m={m}
                        title={title}
                        dateLabel={formatMatchDate(m)}
                        playersLabel={playersLabel}
                        winner={winner}
                        kindTone={isTraining ? "green" : "gold"}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 7 derniers jours */}
            {grouped.week?.length ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.82, marginBottom: 6 }}>7 derniers jours</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.week.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining = (m as any).isTraining === true || (m.payload as any)?.kind === "training_x01";
                    return (
                      <MatchMiniCard
                        key={m.id}
                        m={m}
                        title={title}
                        dateLabel={formatMatchDate(m)}
                        playersLabel={playersLabel}
                        winner={winner}
                        kindTone={isTraining ? "green" : "gold"}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Avant */}
            {grouped.older?.length ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.82, marginBottom: 6 }}>Avant</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.older.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining = (m as any).isTraining === true || (m.payload as any)?.kind === "training_x01";
                    return (
                      <MatchMiniCard
                        key={m.id}
                        m={m}
                        title={title}
                        dateLabel={formatMatchDate(m)}
                        playersLabel={playersLabel}
                        winner={winner}
                        kindTone={isTraining ? "green" : "gold"}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </NeonCard>
    </div>
  );
}
