// ============================================
// src/pages/FriendsPage.tsx
// Mode Online & Amis — v3 FULLWEB (Supabase)
// - Auth réelle via onlineApi (Supabase) + AuthOnlineProvider
// - Session restaurée automatiquement AU BOOT par useAuthOnline()
// - Cette page lit simplement l'état via useAuthOnline()
// - Statut global store.selfStatus (online / away / offline)
// - Statut cohérent sur Home / Profils / FriendsPage
// - Présence locale lastSeen + ping toutes les 30s en "online"
// - Lobbies ONLINE réels : création + join par code (Supabase)
// - Affiche le DRAPEAU du pays du profil actif (privateInfo.country)
//   via getCountryFlag() (src/lib/countryNames.ts)
// - Bouton TEST SUPABASE (juste pour vérifier la connexion)
// - Bloc "Salons online" AU-DESSUS de l’historique
// - ✅ Historique online DESIGN : cards + tri + regroupement (Aujourd’hui / 7 derniers jours / Avant)
// - Bouton "Lancer maintenant" qui ouvre x01_online_setup
//   avec le lobbyCode (salle d’attente temps réel via Worker DO).
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
  const payload: StoredPresence = {
    status,
    lastSeen: Date.now(),
  };
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
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        marginTop: 16,
      }}
    >
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
        {subtitle ? (
          <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>
            {subtitle}
          </div>
        ) : null}
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
        borderRadius: 16,
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
    gray: [
      "rgba(255,255,255,.08)",
      "rgba(255,255,255,.9)",
      "rgba(255,255,255,.12)",
    ],
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

function MatchMiniCard({
  m,
  title,
  dateLabel,
  playersLabel,
  winner,
  kindTone,
}: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 10,
        background:
          "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))",
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 10px 20px rgba(0,0,0,.45)",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
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
        <Pill
          label={
            m?.isTraining || (m?.payload as any)?.kind === "training_x01"
              ? "Training"
              : "Match"
          }
          tone={kindTone}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.82 }}>{dateLabel}</div>
        {winner ? (
          <div style={{ fontSize: 11, color: "#ffd56a", fontWeight: 900 }}>
            🏆 {winner}
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 11, opacity: 0.88, lineHeight: 1.2 }}>
        {playersLabel}
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
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  // -------- AUTH ONLINE (via AuthOnlineProvider) --------
  const {
    status: authStatus,
    loading: authLoading,
    user,
    profile,
    signup: signupOnline,
    login: loginOnline,
    logout: logoutOnline,
    refresh: refreshOnline,
  } = useAuthOnline();

  // Champs formulaire
  const [nickname, setNickname] = React.useState<string>(
    () => activeProfile?.name || ""
  );
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const isSignedIn = authStatus === "signed_in" && !!user;

  // --- Historique online (onlineApi.listMatches)
  const [matches, setMatches] = React.useState<OnlineMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  // -------- LOBBIES ONLINE (réels) --------
  const [creatingLobby, setCreatingLobby] = React.useState(false);
  const [lastCreatedLobby, setLastCreatedLobby] =
    React.useState<OnlineLobby | null>(null);

  const [joinCode, setJoinCode] = React.useState("");
  const [joiningLobby, setJoiningLobby] = React.useState(false);
  const [joinedLobby, setJoinedLobby] = React.useState<OnlineLobby | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinInfo, setJoinInfo] = React.useState<string | null>(null);

  // --- lastSeen (présence locale)
  const initialPresence = React.useMemo(() => loadPresenceFromLS(), []);
  const [lastSeen, setLastSeen] = React.useState<number | null>(
    initialPresence?.lastSeen ?? null
  );

  // --- statut global de l'app : store.selfStatus
  const selfStatus: PresenceStatus =
    (store.selfStatus as PresenceStatus) || "offline";

  const statusLabel =
    selfStatus === "away"
      ? "Absent"
      : selfStatus === "online"
      ? "En ligne"
      : "Hors ligne";

  const statusColor =
    selfStatus === "away"
      ? "#ffb347"
      : selfStatus === "online"
      ? "#7fe2a9"
      : "#cccccc";

  const displayName =
    activeProfile?.name ||
    profile?.displayName ||
    (user as any)?.nickname ||
    "Profil online";

  const lastSeenLabel = formatLastSeenAgo(lastSeen);

  // --- Drapeau pays du profil actif (privateInfo.country)
  const privateInfo = ((activeProfile as any)?.privateInfo || {}) as any;
  const countryRaw = privateInfo.country || "";
  const countryFlag = getCountryFlag(countryRaw);

  /* -------------------------------------------------
      TEST SUPABASE
  --------------------------------------------------*/
  async function testSupabase() {
    console.log("[TEST] Supabase: démarrage…");
    try {
      const { data, error } = await supabase
        .from("profiles_online")
        .select("*")
        .limit(1);

      console.log("[TEST] Supabase result:", { data, error });

      alert(
        error
          ? "Erreur Supabase (voir console)"
          : "Connexion Supabase OK (voir console)"
      );
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

  // 🔁 Ping toutes les 30s quand connecté + en ligne
  React.useEffect(() => {
    if (!isSignedIn || selfStatus !== "online") return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      savePresenceToLS("online");
      setLastSeen(Date.now());
    }, 30_000);

    return () => window.clearInterval(id);
  }, [isSignedIn, selfStatus]);

  // Sync présence / formulaire quand l'état AuthOnline change
  React.useEffect(() => {
    if (authStatus === "signed_in" && user) {
      setPresence("online");
      setEmail((user as any)?.email || "");
      setNickname(
        profile?.displayName ||
          (user as any)?.nickname ||
          activeProfile?.name ||
          ""
      );
    } else if (authStatus === "signed_out") {
      setPresence("offline");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, user, profile, activeProfile]);

  // Si on retrouve une ancienne présence locale très vieille, on bascule en "away"
  React.useEffect(() => {
    if (!initialPresence) return;
    const diff = Date.now() - initialPresence.lastSeen;
    if (diff > 10 * 60_000 && selfStatus === "online") {
      setPresence("away");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------
      Historique Online (vrai serveur)
  --------------------------------------------------*/

  React.useEffect(() => {
    if (!isSignedIn) {
      setMatches([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingMatches(true);
      try {
        const list = await onlineApi.listMatches(50);
        if (!cancelled) {
          setMatches(list || []);
          // ⚠️ Optionnel: mettre un cache local pour StatsOnline
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                LS_ONLINE_MATCHES_KEY,
                JSON.stringify(list || [])
              );
            }
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
  }, [isSignedIn]);

  function handleClearOnlineHistory() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LS_ONLINE_MATCHES_KEY);
      } catch {
        // ignore
      }
    }
    setMatches([]);
  }

  function getMatchTitle(m: OnlineMatch): string {
    const isTraining =
      (m as any).isTraining === true ||
      (m.payload as any)?.kind === "training_x01";

    if (m.mode === "x01") {
      return isTraining ? "X01 Training" : "X01 (match)";
    }
    return m.mode || "Match";
  }

  function formatMatchDate(m: OnlineMatch): string {
    const ts = (m as any).finishedAt || (m as any).startedAt || (m as any).createdAt;
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  /* -------------------------------------------------
      Actions AUTH (signup / login / logout)
  --------------------------------------------------*/

  async function handleSignup() {
    const nick = (nickname || activeProfile?.name || "").trim();
    const mail = email.trim().toLowerCase();
    const pass = password;

    setError(null);
    setInfo(null);

    if (!nick) {
      setError("Pseudo online requis.");
      return;
    }
    if (!mail || !pass) {
      setError(
        "Pour créer un compte online, email et mot de passe sont requis."
      );
      return;
    }

    setBusy(true);
    try {
      await signupOnline({
        email: mail,
        password: pass,
        nickname: nick,
      } as any);
      await refreshOnline();

      setPresence("online");
      setPassword("");
      setInfo("Compte online créé et connecté (serveur Supabase).");
    } catch (e: any) {
      console.warn(e);
      setError(
        e?.message || "Impossible de créer le compte en ligne pour le moment."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    const mail = email.trim().toLowerCase();
    const pass = password;

    setError(null);
    setInfo(null);

    if (!mail || !pass) {
      setError("Pour te connecter, entre email et mot de passe.");
      return;
    }

    setBusy(true);
    try {
      await loginOnline({
        email: mail,
        password: pass,
      } as any);
      await refreshOnline();

      setPresence("online");
      setPassword("");
      setInfo("Connexion réussie au serveur online.");
    } catch (e: any) {
      console.warn(e);
      setError(
        e?.message || "Impossible de te connecter en ligne pour le moment."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await logoutOnline();
      await refreshOnline();
    } catch (e) {
      console.warn("[FriendsPage] logout error", e);
    }
    setPresence("offline");
    setPassword("");
    setInfo("Déconnecté du mode online (compte conservé côté serveur).");
    setBusy(false);
  }

  // ---------- Création d'un salon X01 (Supabase) ----------
  async function handleCreateLobby() {
    if (!isSignedIn || !user) {
      setError("Tu dois être connecté en mode online pour créer un salon.");
      setInfo(null);
      return;
    }
    if (creatingLobby) return;

    setCreatingLobby(true);
    setError(null);
    setInfo(null);

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
      setJoinError(null);
      console.log("[online] lobby créé", lobby);
    } catch (e: any) {
      console.warn(e);
      setError(
        e?.message || "Impossible de créer un salon online pour le moment."
      );
    } finally {
      setCreatingLobby(false);
    }
  }

  // ---------- Join d'un salon X01 par code (Supabase) ----------
  async function handleJoinLobby() {
    const code = joinCode.trim().toUpperCase();

    setJoinError(null);
    setJoinInfo(null);
    setJoinedLobby(null);

    if (!code) {
      setJoinError("Entre un code de salon.");
      return;
    }
    if (!isSignedIn || !user) {
      setJoinError(
        "Tu dois être connecté en mode online pour rejoindre un salon."
      );
      return;
    }

    setJoiningLobby(true);

    try {
      const lobby = await onlineApi.joinLobby({
        code,
        userId: (user as any).id,
        nickname:
          profile?.displayName ||
          (user as any).nickname ||
          activeProfile?.name ||
          "Joueur",
      } as any);

      setJoinedLobby(lobby);
      setJoinInfo("Salon trouvé sur le serveur online.");
      console.log("[online] join lobby ok", lobby);
    } catch (e: any) {
      console.warn(e);
      setJoinError(
        e?.message || "Impossible de rejoindre ce salon pour le moment."
      );
    } finally {
      setJoiningLobby(false);
    }
  }

  /* -------------------------------------------------
      RENDER
  --------------------------------------------------*/

  // ✅ TRI global + groupement joli
  const sortedMatches = React.useMemo(() => {
    return (matches || [])
      .slice()
      .sort((a: any, b: any) => toTs(b) - toTs(a));
  }, [matches]);

  const grouped = React.useMemo(() => groupMatchesPretty(sortedMatches as any), [sortedMatches]);

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      {/* ✅ Bouton de test Supabase */}
      <button
        onClick={testSupabase}
        style={{
          marginBottom: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "#222",
          color: "#fff",
          fontSize: 12,
        }}
      >
        TEST SUPABASE
      </button>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        Mode Online & Amis
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Crée ton compte online pour synchroniser ton profil entre appareils et
        jouer de vraies parties en ligne (auth Supabase + salons online).
      </p>

      {/* --------- BLOC INFO --------- */}
      <div
        style={{
          fontSize: 11.5,
          marginBottom: 12,
          padding: 8,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(40,40,48,.88), rgba(18,18,22,.96))",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          {authLoading ? "Vérification de la session online…" : "Serveur online"}
        </div>

        <div style={{ opacity: 0.9 }}>
          Ton compte online est stocké sur un vrai serveur (Supabase). Tu peux
          te reconnecter depuis plusieurs appareils avec le même email/mot de
          passe.
        </div>

        <div style={{ marginTop: 4, color: "#ffcf57" }}>
          {isSignedIn
            ? "Connecté au serveur online."
            : authLoading
            ? "Connexion en cours…"
            : "Non connecté."}
        </div>

        {lastSeenLabel && (
          <div
            style={{
              marginTop: 2,
              opacity: 0.8,
              fontSize: 11,
            }}
          >
            Dernière activité : {lastSeenLabel}
          </div>
        )}
      </div>

      {/* --------- BLOC CONNEXION / CRÉATION --------- */}
      {!isSignedIn ? (
        <div
          style={{
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            background:
              "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.08), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.96), rgba(10,10,12,.98))",
            border: "1px solid rgba(255,255,255,.12)",
            boxShadow: "0 14px 30px rgba(0,0,0,.55)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Connexion / création rapide
          </div>

          {activeProfile && (
            <div style={{ fontSize: 11.5, opacity: 0.85, marginBottom: 6 }}>
              Profil local actif : <b>{activeProfile.name}</b> — utilisé comme
              pseudo par défaut.
            </div>
          )}

          {/* Champ PSEUDO */}
          <label
            style={{
              fontSize: 11.5,
              opacity: 0.9,
              display: "block",
              marginBottom: 4,
            }}
          >
            Pseudo online
          </label>

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={busy || authLoading}
            placeholder="Ex : CHEVROUTE, NINZALEX…"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 8,
            }}
          />

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || authLoading}
            placeholder="Email (pour te reconnecter sur tous tes appareils)"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 8,
            }}
          />

          {/* Mot de passe */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy || authLoading}
            placeholder="Mot de passe"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 10,
            }}
          />

          {/* Messages d'erreur / info */}
          {error && (
            <div style={{ marginBottom: 8, fontSize: 11.5, color: "#ff8a8a" }}>
              {error}
            </div>
          )}

          {info && !error && (
            <div style={{ marginBottom: 8, fontSize: 11.5, color: "#8fe6aa" }}>
              {info}
            </div>
          )}

          {/* BOUTONS */}
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <button
              type="button"
              onClick={handleSignup}
              disabled={busy || authLoading}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "8px 10px",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: busy || authLoading ? "default" : "pointer",
                background: "linear-gradient(180deg,#35c86d,#23a958)",
                color: "#08130c",
                boxShadow: "0 8px 18px rgba(0,0,0,.55)",
                opacity: busy || authLoading ? 0.5 : 1,
              }}
            >
              Créer un compte
            </button>

            <button
              type="button"
              onClick={handleLogin}
              disabled={busy || authLoading}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "8px 10px",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: busy || authLoading ? "default" : "pointer",
                background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: "#1b1508",
                boxShadow: "0 8px 18px rgba(0,0,0,.55)",
                opacity: busy || authLoading ? 0.5 : 1,
              }}
            >
              Se connecter
            </button>
          </div>
        </div>
      ) : (
        /* --------- BLOC PROFIL CONNECTÉ --------- */
        <div
          style={{
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            background:
              "radial-gradient(120% 160% at 0% 0%, rgba(127,226,169,.10), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.96), rgba(10,10,12,.98))",
            border: "1px solid rgba(127,226,169,.45)",
            boxShadow: "0 14px 30px rgba(0,0,0,.55)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Profil online connecté
          </div>

          {/* Avatar + Nom + Statut */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            {/* Wrapper externe pour pouvoir faire déborder le drapeau */}
            <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
              {/* Cercle avatar avec overflow hidden */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                }}
              >
                {activeProfile?.avatarDataUrl ? (
                  <img
                    src={activeProfile.avatarDataUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "#1a1a1a",
                      fontSize: 20,
                    }}
                  >
                    {(displayName || "??").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Petit drapeau pays centré en bas, qui dépasse du cercle */}
              {countryFlag && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "2px solid #000",
                    overflow: "hidden",
                    boxShadow: "0 0 8px rgba(0,0,0,.8)",
                    background: "#111",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 2,
                  }}
                  title={countryRaw}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{countryFlag}</span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#ffcf57" }}>
                {displayName}
              </div>

              {countryRaw && (
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                  {countryRaw}
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,.55)",
                    border: "1px solid rgba(255,255,255,.12)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                      boxShadow: `0 0 6px ${statusColor}`,
                    }}
                  />
                  <span>{statusLabel}</span>
                </span>
              </div>

              {lastSeenLabel && (
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>
                  Dernière activité : {lastSeenLabel}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setPresence(selfStatus === "away" ? "online" : "away")}
              disabled={busy}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "7px 10px",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                background: "linear-gradient(180deg,#444,#262626)",
                color: "#f5f5f7",
              }}
            >
              {selfStatus === "away" ? "Revenir en ligne" : "Absent"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              style={{
                borderRadius: 999,
                padding: "7px 12px",
                border: "none",
                fontWeight: 800,
                fontSize: 12,
                background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
                color: "#fff",
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      )}

      {/* --------- PLACEHOLDER FUTUR : Amis / présence détaillée --------- */}
      <div
        style={{
          marginTop: 4,
          fontSize: 11.5,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>À venir</div>
        <div style={{ opacity: 0.85 }}>
          Liste d’amis, invitations, présence en ligne détaillée seront ajoutés
          ici (basés sur les profils online).
        </div>
      </div>

      {/* --------- BLOC : Salons online (réels) — AU-DESSUS de l’historique --------- */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(32,32,40,.95), rgba(10,10,14,.98))",
          boxShadow: "0 10px 24px rgba(0,0,0,.55)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            fontSize: 14,
            color: "#ffd56a",
            textShadow: "0 0 10px rgba(255,215,80,.4)",
          }}
        >
          Salons online (serveur)
        </div>

        <div style={{ opacity: 0.85, marginBottom: 10 }}>
          Crée un salon X01 ou rejoins celui d’un ami avec un code (stocké sur le
          serveur).
        </div>

        <button
          type="button"
          onClick={handleCreateLobby}
          disabled={creatingLobby || !isSignedIn}
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,.16)",
            background: !isSignedIn
              ? "linear-gradient(180deg,#666,#444)"
              : creatingLobby
              ? "linear-gradient(180deg,#666,#444)"
              : "linear-gradient(180deg,#ffd56a,#e9a93d)",
            color: "#1c1304",
            fontWeight: 800,
            fontSize: 13,
            cursor: creatingLobby || !isSignedIn ? "default" : "pointer",
            marginBottom: 10,
            opacity: creatingLobby || !isSignedIn ? 0.6 : 1,
          }}
        >
          {!isSignedIn
            ? "Connecte-toi pour créer un salon"
            : creatingLobby
            ? "Création…"
            : "Créer un salon X01"}
        </button>

        <div style={{ marginTop: 2, marginBottom: 8 }}>
          <label style={{ fontSize: 11, opacity: 0.9, display: "block", marginBottom: 4 }}>
            Code de salon
          </label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Ex : 4F9Q"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(5,5,8,.95)",
              color: "#f5f5f7",
              padding: "7px 10px",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          />
          <button
            type="button"
            onClick={handleJoinLobby}
            disabled={joiningLobby || !isSignedIn}
            style={{
              width: "100%",
              borderRadius: 12,
              padding: "9px 12px",
              border: "1px solid rgba(255,255,255,.16)",
              background: !isSignedIn
                ? "linear-gradient(180deg,#555,#333)"
                : joiningLobby
                ? "linear-gradient(180deg,#555,#333)"
                : "linear-gradient(180deg,#4fb4ff,#1c78d5)",
              color: "#04101f",
              fontWeight: 800,
              fontSize: 13,
              cursor: joiningLobby || !isSignedIn ? "default" : "pointer",
              opacity: joiningLobby || !isSignedIn ? 0.65 : 1,
            }}
          >
            {!isSignedIn
              ? "Connecte-toi pour rejoindre"
              : joiningLobby
              ? "Recherche…"
              : "Rejoindre avec ce code"}
          </button>

          {(joinError || joinInfo) && (
            <div style={{ marginTop: 6, fontSize: 11.5 }}>
              {joinError && <div style={{ color: "#ff8a8a" }}>{joinError}</div>}
              {joinInfo && !joinError && (
                <div style={{ color: "#8fe6aa" }}>{joinInfo}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- WAITING ROOM ONLINE ---------- */}
      {(joinedLobby || lastCreatedLobby) && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.15)",
            background:
              "linear-gradient(180deg, rgba(34,34,44,.96), rgba(10,10,14,.98))",
            boxShadow: "0 12px 26px rgba(0,0,0,.55)",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              marginBottom: 10,
              color: "#ffd56a",
              textShadow: "0 0 10px rgba(255,215,80,.35)",
            }}
          >
            Salle d’attente Online
          </div>

          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#111",
              border: "1px solid rgba(255,255,255,.12)",
              fontFamily: "monospace",
              letterSpacing: 2,
              fontSize: 14,
              fontWeight: 800,
              color: "#ffd56a",
              textAlign: "center",
              boxShadow: "0 0 12px rgba(255,215,80,.25)",
            }}
          >
            {(joinedLobby || lastCreatedLobby)?.code}
          </div>

          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              background:
                "linear-gradient(180deg, rgba(44,44,54,.95), rgba(18,18,24,.98))",
              border: "1px solid rgba(255,255,255,.10)",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 56,
                height: 56,
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle,#ffd56a,#c8922f)",
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(255,215,80,.35)",
              }}
            >
              {activeProfile?.avatarDataUrl ? (
                <img
                  src={activeProfile.avatarDataUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: "#1a1a1a",
                    fontSize: 20,
                  }}
                >
                  {(activeProfile?.name || "??").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#ffd56a" }}>
                {activeProfile?.name || "Hôte"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Hôte — Attend les joueurs…
              </div>
            </div>

            {countryFlag && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #000",
                  background: "#111",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                }}
              >
                {countryFlag}
              </div>
            )}
          </div>

          {isSignedIn && user && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background:
                  "linear-gradient(180deg, rgba(30,30,38,.96), rgba(10,10,14,.98))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "radial-gradient(circle,#7fe2a9,#35c86d)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "#0a1a12",
                      fontSize: 18,
                    }}
                  >
                    {(profile?.displayName || (user as any)?.nickname || "J")[0]
                      ?.toUpperCase() || "J"}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#7fe2a9" }}>
                    {profile?.displayName || (user as any)?.nickname || "Joueur Online"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>A rejoint le salon</div>
                </div>
              </div>
            </div>
          )}

          {isSignedIn && (
            <button
              onClick={() =>
                go("x01_online_setup", {
                  lobbyCode: (joinedLobby || lastCreatedLobby)?.code || null,
                })
              }
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "10px 14px",
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                background: "linear-gradient(180deg,#35c86d,#23a958)",
                color: "#03140a",
                boxShadow: "0 10px 22px rgba(0,0,0,.5)",
                cursor: "pointer",
                marginTop: 10,
              }}
            >
              🚀 Lancer maintenant
            </button>
          )}
        </div>
      )}

      {/* ================= HISTORIQUE ONLINE — DESIGN (CARDS + TRI + GROUPES) ================= */}
      <SectionTitle
        title="Historique Online"
        subtitle="Trié du plus récent au plus ancien • regroupé automatiquement"
        right={
          isSignedIn ? (
            <button
              type="button"
              onClick={handleClearOnlineHistory}
              style={{
                borderRadius: 999,
                padding: "7px 10px",
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,90,90,.12)",
                color: "#ff8a8a",
                fontWeight: 900,
                fontSize: 11.5,
                cursor: "pointer",
              }}
              title="Supprime le cache local (utile si StatsOnline lit encore ce cache)"
            >
              Effacer cache local
            </button>
          ) : null
        }
      />

      <NeonCard accent="rgba(79,180,255,.55)" style={{ marginTop: 10 }}>
        {loadingMatches ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>Chargement…</div>
        ) : !isSignedIn ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>
            Connecte-toi pour voir ton historique online.
          </div>
        ) : sortedMatches.length === 0 ? (
          <div style={{ opacity: 0.85, paddingLeft: 6 }}>
            Aucun match online enregistré pour le moment.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, paddingLeft: 6 }}>
            {/* Aujourd’hui */}
            {grouped.today?.length ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.82, marginBottom: 6 }}>
                  Aujourd’hui
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.today.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining =
                      (m as any).isTraining === true ||
                      (m.payload as any)?.kind === "training_x01";
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
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.82, marginBottom: 6 }}>
                  7 derniers jours
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.week.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining =
                      (m as any).isTraining === true ||
                      (m.payload as any)?.kind === "training_x01";
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
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.82, marginBottom: 6 }}>
                  Avant
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped.older.map((m: any) => {
                    const title = getMatchTitle(m);
                    const playersLabel = getMatchPlayersLabel(m);
                    const winner = getMatchWinnerLabel(m);
                    const isTraining =
                      (m as any).isTraining === true ||
                      (m.payload as any)?.kind === "training_x01";
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
