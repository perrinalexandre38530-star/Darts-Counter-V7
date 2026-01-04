// ============================================
// src/App.tsx — Navigation + wiring propre (v5 sécurisé)
// Fix: "Lancer partie" n'affiche plus la dernière reprise
// + Intégration pages Training (menu / play / stats)
// + X01Play V3 en parallèle du X01 actuel
// + Stats : bouton menu => StatsShell (menu), puis StatsHub (détails)
// + Stats Online : StatsOnline (détails ONLINE)
// + Stats Cricket : StatsCricket (vue dédiée Cricket)
// + SyncCenter : export/import des stats locales
// + Account bridge : au premier lancement sans profil actif,
//   on redirige vers Profils > Mon profil (connexion / création compte).
//
// ✅ NEW (PROD Auth): callback email Supabase + reset password
// - Supporte liens : /#/auth/callback  et  /#/auth/reset
// - Détecte le hash au boot + hashchange
// - Évite le chaos "otp_expired/access_denied" côté app
//
// ✅ NEW: SPLASH SCREEN (logo + jingle) au boot (WEB/PWA)
// - Pop + bounce + glow + sparkle
// - Audio best-effort (autoplay peut être bloqué par navigateur)
// - Durée ~ 1350ms, puis app normale
//
// ✅ NEW: AUDIO PERSISTANT (overflow) -> la musique ne s'arrête pas au changement de page
// - On monte un <audio id="dc-splash-audio"> AU NIVEAU AppRoot (ne se démonte pas)
// - SplashScreen pilote ce player global (au lieu d'avoir son <audio> interne)
//
// ✅ NEW: CRASH CATCHER (affiche l'erreur au lieu de "Aïe aïe aïe")
// - Wrap l'app avec <CrashCatcher> pour capturer erreurs React + window.error + unhandledrejection
//
// ✅ PATCH D: AUTH UNIQUE
// - On garde AuthOnlineProvider
// - On enlève définitivement tout AuthProvider/AuthSessionProvider legacy
//
// ✅ PATCH V8: AUTO-SESSION AU BOOT
// - onlineApi.ensureAutoSession() au tout premier mount (OBLIGATOIRE)
// ============================================

import React from "react";
import BottomNav from "./components/BottomNav";

import AuthStart from "./pages/AuthStart";
import AccountStart from "./pages/AccountStart";

import SplashScreen from "./components/SplashScreen";

// ✅ NEW: AUDIO SPLASH global (persistant)
import SplashJingle from "./assets/audio/splash_jingle.mp3";

// ✅ NEW: CRASH CATCHER
import CrashCatcher from "./components/CrashCatcher";
import MobileErrorOverlay from "./components/MobileErrorOverlay";

// Persistance (IndexedDB via storage.ts)
import { loadStore, saveStore } from "./lib/storage";
// OPFS / StorageManager — demande la persistance une fois au boot
import { ensurePersisted } from "./lib/deviceStore";
// 🔒 Garde-fou localStorage (purge legacy si trop plein)
import { purgeLegacyLocalStorageIfNeeded } from "./lib/storageQuota";

// 🚀 warmUp lite aggregator
import { warmAggOnce } from "./boot/warmAgg";

// Mode Online
import { onlineApi } from "./lib/onlineApi";

// ✅ Supabase client
import { supabase } from "./lib/supabaseClient";

// Types
import type { Store, Profile, MatchRecord } from "./lib/types";
import type { X01ConfigV3 as X01ConfigV3Type } from "./types/x01v3";

// Pages
import Home from "./pages/Home";
import Games from "./pages/Games";
import TournamentsHome from "./pages/TournamentsHome";
import Profiles from "./pages/Profiles";
import FriendsPage from "./pages/FriendsPage";
import Settings from "./pages/Settings";
import X01Setup from "./pages/X01Setup";
import X01Play from "./pages/X01Play";
import X01OnlineSetup from "./pages/X01OnlineSetup";
import CricketPlay from "./pages/CricketPlay";

// ✅ KILLER (CONFIG + PLAY)
import KillerConfig from "./pages/KillerConfig";
import KillerPlay from "./pages/KillerPlay";
import KillerSummaryPage from "./pages/KillerSummaryPage";

import ShanghaiPlay from "./pages/ShanghaiPlay";
import LobbyPick from "./pages/LobbyPick";
import X01End from "./pages/X01End";
import AvatarCreator from "./pages/AvatarCreator";
import ProfilesBots from "./pages/ProfilesBots";

import TrainingMenu from "./pages/TrainingMenu";
import TrainingX01Play from "./pages/TrainingX01Play";
import TrainingClock from "./pages/TrainingClock";

import ShanghaiConfigPage from "./pages/ShanghaiConfig";
import ShanghaiEnd from "./pages/ShanghaiEnd";

// Historique
import { History } from "./lib/history";

// ✅ DartSets localStorage store (synced into App store)
import { getAllDartSets, replaceAllDartSets } from "./lib/dartSetsStore";

// ✅ NEW: rebuild stats cache when history changes (FAST STATS HUB)
import { rebuildStatsForProfile } from "./lib/stats/rebuildStats";

// Stats pages
import StatsShell from "./pages/StatsShell";
import StatsHub from "./pages/StatsHub";
import StatsOnline from "./pages/StatsOnline";
import StatsCricket from "./pages/StatsCricket";
import StatsLeaderboardsPage from "./pages/StatsLeaderboardsPage"; // ⭐ CLASSEMENTS

// TOURNOI
import TournamentCreate from "./pages/TournamentCreate";
import TournamentView from "./pages/TournamentView";
import TournamentMatchPlay from "./pages/TournamentMatchPlay";
import TournamentRoadmap from "./pages/TournamentRoadmap";

// X01 V3
import X01ConfigV3 from "./pages/X01ConfigV3";
import X01PlayV3 from "./pages/X01PlayV3";

// 🌟 Nouveau : SYNC / Partage stats locales
import SyncCenter from "./pages/SyncCenter";

// Contexts
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";
import { StoreProvider } from "./contexts/StoreContext";
import { AudioProvider } from "./contexts/AudioContext";
import { AuthOnlineProvider, useAuthOnline } from "./hooks/useAuthOnline";

// Dev helper
import { installHistoryProbe } from "./dev/devHistoryProbe";
if (import.meta.env.DEV) installHistoryProbe();

// =============================================================
// ✅ SAFE MERGE — profils (évite crash au boot)
// - merge liste existante + liste réhydratée
// - dédoublonnage par id
// - préfère les champs "nouveaux" s’ils sont définis
// =============================================================
function mergeProfilesSafe<T extends { id: string }>(base: T[], incoming: T[]) {
  const a = Array.isArray(base) ? base : [];
  const b = Array.isArray(incoming) ? incoming : [];

  const map = new Map<string, T>();
  for (const p of a) {
    if (p && typeof p.id === "string") map.set(p.id, p);
  }
  for (const p of b) {
    if (!p || typeof p.id !== "string") continue;
    const prev = map.get(p.id);
    map.set(p.id, prev ? ({ ...prev, ...p } as T) : p);
  }

  return Array.from(map.values());
}

// =============================================================
// ✅ NEW: Helpers upload avatar Supabase (PROFILES)
// - dataUrl (png base64) -> Blob
// - upload (upsert) dans bucket public "avatars"
// - renvoie publicUrl
// =============================================================
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Impossible de convertir dataUrl -> Blob");
  return await res.blob();
}

async function uploadAvatarToSupabase(opts: {
  bucket: string;
  objectPath: string;
  pngDataUrl: string;
}): Promise<{ publicUrl: string }> {
  const blob = await dataUrlToBlob(opts.pngDataUrl);

  const { error: upErr } = await supabase.storage.from(opts.bucket).upload(opts.objectPath, blob, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(opts.objectPath);
  const publicUrl = (data as any)?.publicUrl || "";
  if (!publicUrl) throw new Error("getPublicUrl() a renvoyé une URL vide");
  return { publicUrl };
}

/* --- helpers --- */
function withAvatars(rec: any, profiles: any[]) {
  const get = (arr: any[]) =>
    (arr || []).map((p: any) => {
      const prof = profiles.find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

  const players = rec?.players?.length ? rec.players : rec?.payload?.players || [];
  const filled = get(players);

  return {
    ...rec,
    players: filled,
    payload: { ...(rec?.payload || {}), players: filled },
  };
}

/* ============================================================
   ✅ FIX AVATAR (anti overwrite par undefined)
============================================================ */
function buildChangelogSlides(t: (k: string, d?: string) => string, entries: any[]): any[] {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return [];

  const safeParseDateStr = (s: string) => {
    const x = String(s || "").trim();
    if (!x) return null;
    const d = Date.parse(x);
    return Number.isFinite(d) ? d : null;
  };

  const sorted = [...list].sort((a, b) => {
    const ta = safeParseDateStr(a.date ?? "") ?? 0;
    const tb = safeParseDateStr(b.date ?? "") ?? 0;
    return tb - ta;
  });

  return sorted.slice(0, 3).map((e, idx) => {
    const bullets = Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : [];
    const text =
      bullets.length > 0
        ? bullets.slice(0, 4).map((x) => `• ${x}`).join("\n")
        : t("home.changelog.empty", "Améliorations et correctifs divers.");

    const dateStr = String(e.date ?? "").trim();
    const title = dateStr
      ? `${t("home.changelog.title", "Patch notes")} — ${dateStr}`
      : t("home.changelog.title", "Patch notes");

    return {
      id: `changelog-${e.id ?? idx}`,
      kind: "news",
      title,
      text: `${String(e.title ?? "").trim()}\n${text}`.trim(),
      imageKey: "tipNews",
      weight: 9 - idx,
      hot: true,
      forceNew: true,
      version: 1,
    };
  });
}

/* ============================================================
   ✅ NEW: sanitizeStoreForCloud (anti base64 dans snapshot cloud)
============================================================ */
function sanitizeStoreForCloud(s: any) {
  let clone: any;
  try {
    clone = JSON.parse(JSON.stringify(s || {}));
  } catch {
    clone = { ...(s || {}) };
  }

  if (Array.isArray(clone.profiles)) {
    clone.profiles = clone.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const v = out.avatarDataUrl;
      if (typeof v === "string" && v.startsWith("data:")) delete out.avatarDataUrl;

      // 🔒 sécurité: ne JAMAIS pousser un mot de passe en cloud
      try {
        if (out.privateInfo && typeof out.privateInfo === "object") {
          const pi: any = { ...(out.privateInfo as any) };
          if (pi.password) delete pi.password;
          out.privateInfo = pi;
        }
      } catch {}

      return out;
    });
  }

  if (Array.isArray(clone.history)) {
    clone.history = clone.history.map((r: any) => {
      const rr = { ...(r || {}) };

      if (Array.isArray(rr.players)) {
        rr.players = rr.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = pp.avatarDataUrl;
          if (typeof v === "string" && v.startsWith("data:")) delete pp.avatarDataUrl;
          return pp;
        });
      }

      if (rr.payload && Array.isArray(rr.payload.players)) {
        rr.payload = { ...(rr.payload || {}) };
        rr.payload.players = rr.payload.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = pp.avatarDataUrl;
          if (typeof v === "string" && v.startsWith("data:")) delete pp.avatarDataUrl;
          return pp;
        });
      }

      return rr;
    });
  }

  // ✅ DartSets : ne pas pousser de base64 (photoDataUrl) en cloud
  if (Array.isArray((clone as any).dartSets)) {
    (clone as any).dartSets = (clone as any).dartSets.map((ds: any) => {
      const dso = { ...(ds || {}) };
      const p = dso.photoDataUrl;
      if (typeof p === "string" && p.startsWith("data:")) delete dso.photoDataUrl;
      return dso;
    });
  }

  return clone;
}

/* --------------------------------------------
   ROUTES
-------------------------------------------- */
type Tab =
  | "account_start"
  | "auth_start"
  | "auth_forgot"
  | "home"
  | "games"
  | "tournaments"
  | "tournament_create"
  | "tournament_view"
  | "tournament_match_play"
  | "tournament_roadmap"
  | "profiles"
  | "profiles_bots"
  | "friends"
  | "online"
  | "settings"
  | "stats"
  | "statsHub"
  | "stats_online"
  | "cricket_stats"
  | "statsDetail"
  | "stats_leaderboards"
  | "x01setup"
  | "x01_online_setup"
  | "x01"
  | "x01_end"
  | "cricket"
  | "killer"
  | "killer_config"
  | "killer_play"
  | "killer_summary"
  | "shanghai"
  | "shanghai_play"
  | "battle_royale"
  | "training"
  | "training_x01"
  | "training_stats"
  | "training_clock"
  | "avatar"
  | "x01_config_v3"
  | "x01_play_v3"
  | "sync_center"
  | "auth_callback"
  | "auth_reset";

/* redirect TrainingStats → StatsHub */
function RedirectToStatsTraining({ go }: { go: (tab: Tab, params?: any) => void }) {
  React.useEffect(() => {
    go("statsHub", { tab: "training" });
  }, [go]);
  return null;
}

/* --------------------------------------------
   ✅ NEW: AUTH CALLBACK (PROD)
-------------------------------------------- */
function AuthCallbackRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [msg, setMsg] = React.useState("Connexion en cours…");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        try {
          await onlineApi.restoreSession();
        } catch {}

        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.error("[auth_callback] getSession error:", error);
          setMsg("Erreur de connexion. Ouvre le DERNIER email reçu et réessaie.");
          return;
        }

        if (data?.session) {
          try {
            window.location.hash = "#/online";
          } catch {}
          go("online");
          return;
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session) {
            try {
              window.location.hash = "#/online";
            } catch {}
            go("online");
          }
        });

        setTimeout(() => {
          if (alive) {
            setMsg("Presque fini… si ça bloque : ouvre le DERNIER email reçu (les anciens liens expirent).");
          }
        }, 900);

        return () => sub.subscription.unsubscribe();
      } catch (e) {
        console.error("[auth_callback] fatal:", e);
        if (alive) setMsg("Erreur de connexion. Réessaie avec le DERNIER email reçu.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [go]);

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("profiles", { view: "me", autoCreate: true })}>← Retour</button>
      <h2 style={{ marginTop: 10 }}>Authentification</h2>
      <p style={{ opacity: 0.9 }}>{msg}</p>
    </div>
  );
}

/* --------------------------------------------
   ✅ NEW: FORGOT PASSWORD (REQUEST EMAIL)
-------------------------------------------- */
function AuthForgotRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  async function submit() {
    setStatus("");
    const e = email.trim();
    if (!e || !e.includes("@")) return setStatus("Entre une adresse email valide.");

    try {
      const redirectTo = `${window.location.origin}/#/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
      if (error) {
        console.error("[auth_forgot] resetPasswordForEmail error:", error);
        setStatus("Erreur : " + error.message);
        return;
      }
      setStatus("Email envoyé ✅ Ouvre le DERNIER email reçu pour réinitialiser.");
    } catch (err: any) {
      console.error("[auth_forgot] fatal:", err);
      setStatus("Erreur : " + (err?.message || "inconnue"));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("account_start")}>← Retour</button>
      <h2 style={{ marginTop: 10 }}>Mot de passe oublié</h2>
      <p style={{ opacity: 0.85 }}>Entre ton email, on t’envoie un lien de réinitialisation.</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
        <input
          type="email"
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />

        <button
          onClick={submit}
          style={{
            borderRadius: 999,
            padding: "10px 12px",
            border: "none",
            fontWeight: 900,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Envoyer le lien
        </button>

        {status ? <div style={{ opacity: 0.9 }}>{status}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------
   ✅ NEW: RESET PASSWORD (PROD)
-------------------------------------------- */
function AuthResetRoute({ go }: { go: (t: Tab, p?: any) => void }) {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  async function submit() {
    setStatus("");
    if (!pw || pw.length < 6) return setStatus("Mot de passe trop court (min 6).");
    if (pw !== pw2) return setStatus("Les mots de passe ne correspondent pas.");

    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      console.error("[auth_reset] updateUser error:", error);
      setStatus("Erreur : " + error.message);
      return;
    }

    setStatus("Mot de passe mis à jour ✅");
    try {
      window.location.hash = "#/online";
    } catch {}
    go("online");
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("profiles", { view: "me", autoCreate: true })}>← Retour</button>

      <h2 style={{ marginTop: 10 }}>Réinitialiser le mot de passe</h2>

      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />

        <button
          onClick={submit}
          style={{
            borderRadius: 12,
            padding: "10px 12px",
            border: "none",
            fontWeight: 900,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Valider
        </button>

        {status ? <div style={{ opacity: 0.9 }}>{status}</div> : null}
      </div>
    </div>
  );
}

function StatsDetailRoute({ store, go, params }: any) {
  const [rec, setRec] = React.useState<any>(() => {
    if (params?.rec) {
      return withAvatars(params.rec, store.profiles || []);
    }
    const fromMem = (store.history || []).find((r: any) => r.id === params?.matchId);
    return fromMem ? withAvatars(fromMem, store.profiles || []) : null;
  });

  const matchId: string | undefined = params?.matchId;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!matchId) return;
      try {
        const byId = await (History as any)?.get?.(matchId);
        if (alive && byId) setRec(withAvatars(byId, store.profiles || []));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [matchId, store.profiles]);

  if (params?.showEnd && rec) {
    return (
      <X01End
        go={go}
        params={{
          matchId: rec.id,
          resumeId: rec.resumeId ?? rec.payload?.resumeId,
          showEnd: true,
        }}
      />
    );
  }

  if (rec) {
    const when = Number(rec.updatedAt ?? rec.createdAt ?? Date.now());
    const dateStr = new Date(when).toLocaleString();
    const players = Array.isArray(rec.players) ? rec.players : [];
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => go("statsHub", { tab: "history" })}>← Retour</button>
        <h2>
          {(rec.kind || "MATCH").toUpperCase()} — {dateStr}
        </h2>
        <div style={{ opacity: 0.85 }}>Joueurs : {players.map((p) => p.name).join(" · ")}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("statsHub", { tab: "history" })}>← Retour</button>
      {matchId ? "Chargement..." : "Aucune donnée"}
    </div>
  );
}

/* --------------------------------------------
   STORE INITIAL
-------------------------------------------- */
const initialStore: Store = {
  profiles: [],
  activeProfileId: null,
  friends: [],
  selfStatus: "online" as any,
  settings: {
    defaultX01: 501,
    doubleOut: true,
    randomOrder: false,
    lang: "fr",
    ttsOnThird: false,
    neonTheme: true,
  } as any,
  history: [],
  dartSets: getAllDartSets(),
} as any;

/* --------------------------------------------
   Préférences X01 par profil actif
-------------------------------------------- */
function getX01DefaultStart(store: Store): 301 | 501 | 701 | 901 {
  const profiles = store.profiles ?? [];
  const active = profiles.find((p) => p.id === store.activeProfileId) ?? null;

  const settingsDefault = (store.settings.defaultX01 as 301 | 501 | 701 | 901) || 501;
  if (!active) return settingsDefault;

  const pi = ((active as any).privateInfo || {}) as {
    prefX01StartScore?: number;
    prefAutoApplyPrefs?: boolean;
  };

  if (!pi.prefAutoApplyPrefs) return settingsDefault;

  const pref = Number(pi.prefX01StartScore ?? 0);
  const allowed: (301 | 501 | 701 | 901)[] = [301, 501, 701, 901];

  if (allowed.includes(pref as any)) return pref as 301 | 501 | 701 | 901;
  return settingsDefault;
}

/* BOTS LS */
const LS_BOTS_KEY = "dc_bots_v1";
/* ONLINE mirror LS (comme FriendsPage / StatsOnline) */
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type BotLS = {
  id: string;
  name: string;
  avatarSeed?: string;
  avatarDataUrl?: string | null;
  [k: string]: any;
};

function loadBotsLS(): BotLS[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    return raw ? (JSON.parse(raw) as BotLS[]) : [];
  } catch {
    return [];
  }
}

function saveBotsLS(list: BotLS[]) {
  try {
    localStorage.setItem(LS_BOTS_KEY, JSON.stringify(list));
  } catch {}
}

/* Service Worker banner */
function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    });
  }, []);

  function updateNow() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setShowPrompt(false);
  }

  return { showPrompt, updateNow, dismiss: () => setShowPrompt(false) };
}

function SWUpdateBanner() {
  const { showPrompt, updateNow, dismiss } = useServiceWorkerUpdate();
  if (!showPrompt) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(20,20,20,.9)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 12,
        boxShadow: "0 0 15px rgba(0,0,0,.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span>🔄 Nouvelle version disponible</span>
      <button
        onClick={updateNow}
        style={{
          background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
          color: "#000",
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Recharger
      </button>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          color: "#aaa",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
        title="Ignorer"
      >
        ✕
      </button>
    </div>
  );
}

/* --------------------------------------------
                APP
-------------------------------------------- */
function App() {
  // ============================================================
  // ✅ CLOUD SNAPSHOT SYNC (source unique Supabase)
  // ============================================================
  const online = useAuthOnline();
  const [cloudHydrated, setCloudHydrated] = React.useState(false);

  // ✅ Cloud hydrate "par user"
  const cloudHydratedUserRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!online?.ready) return;
    const uid = String((online as any)?.session?.user?.id || "");

    if (online.status !== "signed_in") {
      cloudHydratedUserRef.current = "";
      return;
    }

    if (uid && cloudHydratedUserRef.current !== uid) {
      cloudHydratedUserRef.current = uid;
      setCloudHydrated(false);
    }
  }, [online?.ready, online?.status, (online as any)?.session?.user?.id]);

  const cloudPushTimerRef = React.useRef<number | null>(null);

  const [store, setStore] = React.useState<Store>(initialStore);
  const [tab, setTab] = React.useState<Tab>("home");
  const [routeParams, setRouteParams] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // ✅ SPLASH gate (ne s'affiche pas pendant les flows auth)
  const [showSplash, setShowSplash] = React.useState(() => {
    const h = String(window.location.hash || "");
    const isAuthFlow = h.startsWith("#/auth/callback") || h.startsWith("#/auth/reset") || h.startsWith("#/auth/forgot");
    return !isAuthFlow;
  });

  // 🛟 SAFETY NET : ne JAMAIS bloquer l'app sur le splash
  React.useEffect(() => {
    if (!showSplash) return;
    const hardTimeout = window.setTimeout(() => {
      console.warn("[Splash] forced exit (safety timeout)");
      setShowSplash(false);
    }, 8000);
    return () => window.clearTimeout(hardTimeout);
  }, [showSplash]);

  /* ============================================================
     ✅ BOOT GLOBAL
     - persistance + purge + warmup
     - 🔥 AUTO-SESSION V8 (OBLIGATOIRE)
     - restore session SDK
  ============================================================ */
  React.useEffect(() => {
    ensurePersisted().catch(() => {});
    purgeLegacyLocalStorageIfNeeded();
    try {
      warmAggOnce();
    } catch {}

    // 🔥 V8 : garantit une session SUPABASE dès le démarrage
    // (crée un anon user si nécessaire)
    onlineApi.ensureAutoSession().catch((e) => console.error("[autoSession] failed", e));

    // Restore session côté SDK (storage/cookies)
    onlineApi.restoreSession().catch(() => {});
  }, []);

  // ✅ NEW: détecte les liens email Supabase via hash (+ /online)
  React.useEffect(() => {
    const applyHashRoute = () => {
      const h = String(window.location.hash || "");

      if (h.startsWith("#/auth/callback")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_callback");
        return;
      }
      if (h.startsWith("#/auth/reset")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_reset");
        return;
      }
      if (h.startsWith("#/auth/forgot")) {
        setShowSplash(false);
        setRouteParams(null);
        setTab("auth_forgot");
        return;
      }
      if (h.startsWith("#/online")) {
        setRouteParams(null);
        setTab("online");
        return;
      }
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  /* expose store globally for debug */
  React.useEffect(() => {
    (window as any).__supabase = supabase;
  }, []);

  /* X01 v1 config */
  const [x01Config, setX01Config] = React.useState<any>(null);

  /* X01 v3 config */
  const [x01ConfigV3, setX01ConfigV3] = React.useState<X01ConfigV3Type | null>(null);

  /* Navigation */
  function go(next: Tab, params?: any) {
    setRouteParams(params ?? null);
    setTab(next);

    if (next === "auth_callback" || next === "auth_reset" || next === "auth_forgot") {
      setShowSplash(false);
    }

    try {
      if (next === "auth_callback") window.location.hash = "#/auth/callback";
      else if (next === "auth_reset") window.location.hash = "#/auth/reset";
      else if (next === "auth_forgot") window.location.hash = "#/auth/forgot";
      else if (next === "online") window.location.hash = "#/online";
      else {
        const h = String(window.location.hash || "");
        if (h.startsWith("#/auth/") || h.startsWith("#/online")) window.location.hash = "#/";
      }
    } catch {}
  }

  /* centralized update */
  function update(mut: (s: Store) => Store) {
    setStore((s) => {
      const next = mut({ ...s });
      queueMicrotask(() => saveStore(next));
      return next;
    });
  }

  // ✅ IMPORTANT: expose go globalement + store “vivant”
  React.useEffect(() => {
    try {
      (window as any).__appGo = go;
      (window as any).__appStore = (window as any).__appStore || {};
      (window as any).__appStore.go = go;
      (window as any).__appStore.store = store;
      (window as any).__appStore.tab = tab;

      // ✅ NEW: permet aux listeners externes de muter le store
      (window as any).__appStore.update = update;
    } catch {}
  }, [store, tab]);

  /* Load store from IDB at boot + gate */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadStore<Store>();

        let base: Store;
        if (saved) {
          base = {
            ...initialStore,
            ...saved,
            profiles: saved.profiles ?? [],
            friends: saved.friends ?? [],
            history: saved.history ?? [],
            dartSets: (saved as any).dartSets ?? getAllDartSets(),
          };
        } else {
          base = { ...initialStore };
        }

        if (mounted) {
          setStore((prev) => ({
            ...base,
            profiles: mergeProfilesSafe(prev.profiles ?? [], base.profiles ?? []),
          }));

          const hasProfiles = (base.profiles ?? []).length > 0;
          const hasActive = !!base.activeProfileId;

          const h = String(window.location.hash || "");
          const isAuthFlow =
            h.startsWith("#/auth/callback") || h.startsWith("#/auth/reset") || h.startsWith("#/auth/forgot");

          if (!isAuthFlow) {
            if (!hasProfiles || !hasActive) {
              setRouteParams(null);
              setTab("account_start");
            } else {
              setTab("home");
            }
          }
        }
      } catch {
        if (mounted) {
          setStore(initialStore);
          setRouteParams(null);
          setTab("account_start");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // ✅ CLOUD HYDRATE (source unique)
  // - Quand on se CONNECTE => PULL snapshot cloud
  // - ✅ FIX: on hydrate RAM + IDB avec la VERSION MERGÉE (pas "next" brut)
  // - ✅ FIX: si on reçoit des profils + activeProfileId => on renvoie HOME
  // ============================================================
  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (loading) return;
      if (!online?.ready) return;
      if (online.status !== "signed_in") return;
      if (cloudHydrated) return;

      try {
        const res: any = await onlineApi.pullStoreSnapshot();

        if (res?.status === "ok") {
          const payload = (res as any)?.payload ?? null;
          const cloudStore = payload?.store ?? payload?.idb?.store ?? null;

          if (cloudStore && typeof cloudStore === "object") {
            const next: Store = {
              ...initialStore,
              ...(cloudStore as any),
              profiles: (cloudStore as any).profiles ?? [],
              friends: (cloudStore as any).friends ?? [],
              history: (cloudStore as any).history ?? [],
            };

            if (!cancelled) {
              let mergedFinal: Store | null = null;

              setStore((prev) => {
                const mergedProfiles = mergeProfilesSafe(prev.profiles ?? [], next.profiles ?? []);
                mergedFinal = {
                  ...next,
                  profiles: mergedProfiles,
                  // ✅ ne pas perdre un active local si le cloud est partiel
                  activeProfileId: next.activeProfileId ?? prev.activeProfileId ?? null,
                } as any;
                return mergedFinal as any;
              });

              // ✅ attend 1 tick pour être sûr que mergedFinal a été calculé
              await Promise.resolve();

              if (mergedFinal) {
                try {
                  await saveStore(mergedFinal);
                } catch {}

                // ✅ cloud wins -> sync dartsets localStorage
                try {
                  if ((mergedFinal as any).dartSets) replaceAllDartSets((mergedFinal as any).dartSets);
                } catch {}

                const hasProfiles = (mergedFinal.profiles ?? []).length > 0;
                const hasActive = !!mergedFinal.activeProfileId;

                const h = String(window.location.hash || "");
                const isAuthFlow =
                  h.startsWith("#/auth/callback") || h.startsWith("#/auth/reset") || h.startsWith("#/auth/forgot");

                if (!isAuthFlow && hasProfiles && hasActive) {
                  setRouteParams(null);
                  setTab("home");
                }
              }
            }
          }
        } else if (res?.status === "not_found") {
          const hasLocalData =
            (store?.profiles?.length || 0) > 0 ||
            !!(store as any)?.activeProfileId ||
            (store?.friends?.length || 0) > 0 ||
            (store?.history?.length || 0) > 0;

          if (hasLocalData) {
            const payload = {
              kind: "dc_store_snapshot_v1",
              createdAt: new Date().toISOString(),
              app: "darts-counter-v5",
              store: sanitizeStoreForCloud(store),
            };
            await onlineApi.pushStoreSnapshot(payload);
          } else {
            console.warn("[cloud] no snapshot yet + local empty -> skip seed (avoid wiping cloud by mistake)");
          }
        } else {
          console.warn("[cloud] hydrate error (skip seed)", res?.error || res);
        }
      } catch (e) {
        console.warn("[cloud] hydrate error", e);
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loading, online?.ready, online?.status, cloudHydrated, store]);

  // ============================================================
  // ✅ CLOUD PUSH (debounce)
  // ============================================================
  React.useEffect(() => {
    if (loading) return;
    if (!cloudHydrated) return;
    if (!online?.ready || online.status !== "signed_in") return;

    if (cloudPushTimerRef.current) {
      window.clearTimeout(cloudPushTimerRef.current);
      cloudPushTimerRef.current = null;
    }

    cloudPushTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = {
          kind: "dc_store_snapshot_v1",
          createdAt: new Date().toISOString(),
          app: "darts-counter-v5",
          store: sanitizeStoreForCloud(store),
        };
        await onlineApi.pushStoreSnapshot(payload);
      } catch (e) {
        console.warn("[cloud] push snapshot error", e);
      }
    }, 1200);

    return () => {
      if (cloudPushTimerRef.current) {
        window.clearTimeout(cloudPushTimerRef.current);
        cloudPushTimerRef.current = null;
      }
    };
  }, [store, loading, cloudHydrated, online?.ready, online?.status]);

  // ============================================================
  // ✅ DartSets bridge: localStorage dartSetsStore -> App store
  // - DartSetsPanel utilise dartSetsStore (localStorage)
  // - App store garde une copie dans store.dartSets (pour cloud snapshot)
  // ============================================================
  React.useEffect(() => {
    const sync = () => {
      try {
        const list = getAllDartSets();
        setStore((prev) => ({ ...(prev as any), dartSets: list } as any));
      } catch {}
    };
    sync();
    window.addEventListener("dc-dartsets-updated", sync as any);
    return () => window.removeEventListener("dc-dartsets-updated", sync as any);
  }, []);

  /* Save store each time it changes */
  React.useEffect(() => {
    if (!loading) {
      saveStore(store);

      // ✅ NEW: event global quand le store change
      try {
        window.dispatchEvent(new Event("dc-store-updated"));
      } catch {}
    }
  }, [store, loading]);

  /* Profiles mutator (✅ FIX: merge défensif) */
  function setProfiles(fn: (p: Profile[]) => Profile[]) {
    update((s) => ({
      ...s,
      profiles: mergeProfilesSafe(s.profiles ?? [], fn(s.profiles ?? [])),
    }));
  }

  // ============================================================
  // ✅ FAST STATS HUB : rebuild cache stats au boot + après history update
  // ============================================================
  const __profilesRef = React.useRef<Profile[]>([]);
  React.useEffect(() => {
    __profilesRef.current = (store.profiles ?? []) as any;
  }, [store.profiles]);

  const __rebuildLockRef = React.useRef(false);

  React.useEffect(() => {
    const schedule = () => {
      if (__rebuildLockRef.current) return;
      __rebuildLockRef.current = true;

      const work = async () => {
        try {
          const profiles = (__profilesRef.current ?? []) as any[];
          await Promise.allSettled(profiles.map((p) => rebuildStatsForProfile(String(p?.id))));
        } catch (e) {
          console.warn("[stats] rebuild error:", e);
        } finally {
          __rebuildLockRef.current = false;
        }
      };

      try {
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === "function") ric(() => work(), { timeout: 2000 });
        else setTimeout(() => work(), 50);
      } catch {
        setTimeout(() => work(), 50);
      }
    };

    if (!loading) schedule();
    window.addEventListener("dc-history-updated", schedule);
    return () => window.removeEventListener("dc-history-updated", schedule);
  }, [loading]);

  /* --------------------------------------------
      pushHistory (FIN DE PARTIE)
  -------------------------------------------- */
  function pushHistory(m: MatchRecord) {
    const now = Date.now();
    const id = (m as any)?.id || (m as any)?.matchId || `x01-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "x01",
      status: "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players },
    };

    update((s) => {
      const list = [...(s.history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      return { ...s, history: list };
    });

    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    try {
      const raw = localStorage.getItem(LS_ONLINE_MATCHES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: saved.id,
        mode: saved.kind,
        createdAt: saved.createdAt,
        finishedAt: saved.updatedAt,
        players: saved.players,
        winnerId: saved.winnerId,
        summary: saved.summary ?? null,
        stats: (saved.payload as any)?.stats ?? null,
      });
      localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {}

    try {
      const supported = ["x01", "cricket", "killer", "shanghai"];
      if (supported.includes(saved.kind)) {
        onlineApi
          .uploadMatch({
            mode: saved.kind as any,
            payload: { summary: saved.summary ?? null, payload: saved.payload ?? null },
            isTraining: false,
            startedAt: saved.createdAt,
            finishedAt: saved.updatedAt,
          })
          .catch(() => {});
      }
    } catch {}

    go("statsHub", { tab: "history" });
  }

  const historyForUI = React.useMemo(
    () => (store.history || []).map((r: any) => withAvatars(r, store.profiles || [])),
    [store.history, store.profiles]
  );

  if (showSplash) {
    return (
      <SplashScreen
        durationMs={6500}
        fadeOutMs={700}
        allowAudioOverflow={true}
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  /* --------------------------------------------
        ROUTING SWITCH
  -------------------------------------------- */
  let page: React.ReactNode = null;

  if (loading) {
    page = (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Chargement...
      </div>
    );
  } else {
    switch (tab) {
      case "auth_callback":
        page = <AuthCallbackRoute go={go} />;
        break;

      case "auth_start":
        page = <AuthStart go={go} />;
        break;

      case "auth_reset":
        page = <AuthResetRoute go={go} />;
        break;

      case "account_start":
        page = (
          <AccountStart
            onLogin={() => go("profiles", { view: "me", autoCreate: true, mode: "signin" })}
            onCreate={() => go("profiles", { view: "me", autoCreate: true, mode: "signup" })}
            onForgot={() => go("auth_forgot")}
          />
        );
        break;

      case "auth_forgot":
        page = <AuthForgotRoute go={go} />;
        break;

      case "home":
        page = (
          <Home
            store={store}
            update={update}
            go={go}
            onConnect={() => go("profiles", { view: "me", autoCreate: true })}
          />
        );
        break;

      case "games":
        page = <Games setTab={(t: any) => go(t)} />;
        break;

      case "profiles":
        page = (
          <Profiles
            store={store}
            update={update}
            setProfiles={setProfiles}
            go={go}
            params={routeParams}
            autoCreate={!!routeParams?.autoCreate}
          />
        );
        break;

      case "profiles_bots":
        page = <ProfilesBots store={store} go={go} />;
        break;

      case "friends":
        page = <FriendsPage store={store} update={update} go={go} />;
        break;

      case "online":
        page = <LobbyPick store={store as any} update={update as any} go={go as any} />;
        break;

      case "settings":
        page = <Settings go={go} />;
        break;

      case "stats":
        page = <StatsShell store={store} go={go} />;
        break;

      case "statsHub":
        page = (
          <StatsHub
            go={go}
            tab={(routeParams?.tab as any) ?? "stats"}
            memHistory={historyForUI}
            mode={routeParams?.mode}
            initialPlayerId={routeParams?.initialPlayerId ?? null}
            initialStatsSubTab={routeParams?.initialStatsSubTab}
            playerId={routeParams?.playerId ?? null}
          />
        );
        break;

      case "stats_online":
        page = <StatsOnline />;
        break;

      case "cricket_stats":
        page = (
          <StatsCricket
            profiles={store.profiles}
            activeProfileId={routeParams?.profileId ?? store.activeProfileId ?? null}
          />
        );
        break;

      case "statsDetail":
        page = <StatsDetailRoute store={store} go={go} params={routeParams} />;
        break;

      case "stats_leaderboards":
        page = <StatsLeaderboardsPage store={store} go={go} />;
        break;

      case "sync_center":
        page = <SyncCenter store={store} go={go} profileId={routeParams?.profileId ?? null} />;
        break;

      case "tournaments":
        page = <TournamentsHome store={store} go={go} update={update} source="local" />;
        break;

      case "tournament_create":
        page = <TournamentCreate store={store} go={go} />;
        break;

      case "tournament_view": {
        const id = String(routeParams?.id ?? routeParams?.tournamentId ?? routeParams?.tid ?? "");
        page = <TournamentView store={store} go={go} id={id} />;
        break;
      }

      case "tournament_match_play": {
        const tournamentId = String(routeParams?.tournamentId ?? routeParams?.id ?? routeParams?.tid ?? "");
        const matchId = String(routeParams?.matchId ?? "");

        if (!tournamentId || !matchId) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("tournaments")}>← Retour</button>
              <p>Paramètres manquants (tournamentId/matchId).</p>
            </div>
          );
          break;
        }

        page = <TournamentMatchPlay store={store} go={go} params={{ tournamentId, matchId }} />;
        break;
      }

      case "tournament_roadmap":
        page = <TournamentRoadmap go={go} />;
        break;

      case "x01setup":
        page = (
          <X01Setup
            profiles={store.profiles}
            defaults={{ start: getX01DefaultStart(store), doubleOut: store.settings.doubleOut }}
            onCancel={() => go("games")}
            onStart={(opts) => {
              const players = store.settings.randomOrder
                ? opts.playerIds.slice().sort(() => Math.random() - 0.5)
                : opts.playerIds;
              setX01Config({ playerIds: players, start: opts.start, doubleOut: opts.doubleOut });
              go("x01", { resumeId: null, fresh: Date.now() });
            }}
          />
        );
        break;

      case "x01_online_setup": {
        const activeProfile = store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0] ?? null;
        const lobbyCode = routeParams?.lobbyCode ?? null;

        if (!activeProfile) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <p style={{ marginBottom: 8 }}>Aucun profil local n’est configuré pour lancer une manche online.</p>
              <button
                onClick={() => go("profiles", { view: "me", autoCreate: true })}
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 13,
                  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                  color: "#1b1508",
                  cursor: "pointer",
                }}
              >
                Créer / choisir un profil
              </button>
            </div>
          );
          break;
        }

        const storeForOnline: Store = { ...store, activeProfileId: activeProfile.id } as Store;
        page = <X01OnlineSetup store={storeForOnline} go={go} params={{ ...(routeParams || {}), lobbyCode }} />;
        break;
      }

      case "x01": {
        const isResume = !!routeParams?.resumeId;
        const isOnline = !!routeParams?.online;

        let effectiveConfig = x01Config;

        if (!effectiveConfig && isOnline && !isResume) {
          const activeProfile =
            store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0] ?? null;
          const startDefault = getX01DefaultStart(store);
          const start =
            startDefault === 301 || startDefault === 501 || startDefault === 701 || startDefault === 901
              ? startDefault
              : 501;

          effectiveConfig = { start, doubleOut: store.settings.doubleOut, playerIds: activeProfile ? [activeProfile.id] : [] };
          setX01Config(effectiveConfig);
        }

        if (!effectiveConfig && !isResume) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <button onClick={() => go("x01setup")}>← Retour</button>
              <p>Configuration X01 manquante.</p>
            </div>
          );
          break;
        }

        const rawStart = effectiveConfig?.start ?? getX01DefaultStart(store);
        const startClamped: 301 | 501 | 701 | 901 = rawStart >= 901 ? 901 : (rawStart as any);

        const outMode = effectiveConfig?.doubleOut ? "double" : "simple";
        const playerIds = effectiveConfig?.playerIds ?? [];
        const freshToken = routeParams?.fresh ?? Date.now();
        const key = isResume ? `resume-${routeParams.resumeId}` : `fresh-${freshToken}`;

        page = (
          <X01Play
            key={key}
            profiles={store.profiles}
            playerIds={playerIds}
            start={startClamped}
            outMode={outMode}
            inMode="simple"
            params={isResume ? { resumeId: routeParams.resumeId } : undefined}
            onFinish={(m) => pushHistory(m)}
            onExit={() => (isOnline ? go("online") : go("x01setup"))}
          />
        );
        break;
      }

      case "x01_config_v3":
        page = (
          <X01ConfigV3
            profiles={store.profiles}
            onBack={() => go("games")}
            onStart={(cfg) => {
              setX01ConfigV3(cfg);
              go("x01_play_v3", { fresh: Date.now() });
            }}
            go={go}
          />
        );
        break;

      case "x01_play_v3": {
        if (!x01ConfigV3) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("x01_config_v3")}>← Retour</button>
              <p>Configuration X01 V3 manquante.</p>
            </div>
          );
          break;
        }

        const freshToken = routeParams?.fresh ?? Date.now();
        const key = `x01v3-${freshToken}`;

        page = (
          <X01PlayV3
            key={key}
            config={x01ConfigV3}
            onExit={() => go("x01_config_v3")}
            onReplayNewConfig={() => go("x01_config_v3")}
            onShowSummary={(matchId: string) => go("statsDetail", { matchId, showEnd: true })}
          />
        );
        break;
      }

      case "x01_end":
        page = <X01End go={go} params={routeParams} />;
        break;

      case "cricket":
        page = <CricketPlay profiles={store.profiles ?? []} onFinish={(m: any) => pushHistory(m)} />;
        break;

      case "killer":
      case "killer_config":
        page = <KillerConfig store={store} go={go} />;
        break;

      case "killer_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("killer_config")}>← Retour</button>
              <p>Configuration KILLER manquante.</p>
            </div>
          );
          break;
        }
        page = <KillerPlay store={store} go={go} config={cfg} onFinish={(m: any) => pushHistory(m)} />;
        break;
      }

      case "killer_summary":
        page = <KillerSummaryPage store={store} go={go} params={routeParams} />;
        break;

      case "shanghai":
        page = <ShanghaiConfigPage store={store} go={go} />;
        break;

      case "shanghai_play": {
        const cfg = routeParams?.config;
        if (!cfg) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("shanghai")}>← Retour</button>
              <p>Configuration SHANGHAI manquante.</p>
            </div>
          );
          break;
        }
        page = <ShanghaiPlay store={store} go={go} config={cfg} onFinish={(m: any) => pushHistory(m)} />;
        break;
      }

      case "shanghai_end":
        page = <ShanghaiEnd params={{ ...routeParams, go }} />;
        break;

      case "training":
        page = <TrainingMenu go={go} />;
        break;

      case "training_x01":
        page = <TrainingX01Play go={go} />;
        break;

      case "training_stats":
        page = <RedirectToStatsTraining go={go} />;
        break;

      case "training_clock":
        page = <TrainingClock profiles={store.profiles ?? []} activeProfileId={store.activeProfileId ?? null} go={go} />;
        break;

      case "avatar": {
        const botId: string | undefined = routeParams?.botId;
        const profileIdFromParams: string | undefined = routeParams?.profileId;
        const backTo: Tab = (routeParams?.from as Tab) || "profiles";
        const isBotMode = !!routeParams?.isBot;

        if (botId) {
          const bots = loadBotsLS();
          const targetBot = bots.find((b) => b.id === botId) ?? null;

          function handleSaveAvatarBot({ pngDataUrl, name }: { pngDataUrl: string; name: string }) {
            if (!targetBot) return go(backTo);

            const next = bots.slice();
            const idx = next.findIndex((b) => b.id === targetBot.id);

            const updated: BotLS = {
              ...targetBot,
              name: name?.trim() || targetBot.name,
              avatarDataUrl: pngDataUrl,
            };

            if (idx >= 0) next[idx] = updated;
            else next.push(updated);

            saveBotsLS(next);
            go(backTo);
          }

          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
                ← Retour
              </button>
              <AvatarCreator size={512} defaultName={targetBot?.name || ""} onSave={handleSaveAvatarBot} isBotMode={true} />
            </div>
          );
          break;
        }

        const targetProfile = store.profiles.find((p) => p.id === (profileIdFromParams || store.activeProfileId)) ?? null;

        async function handleSaveAvatarProfile({ pngDataUrl, name }: { pngDataUrl: string; name: string }) {
          if (!targetProfile) return;

          const trimmedName = (name || "").trim();
          const now = Date.now();

          const bucket = "avatars";
          const objectPath = `${targetProfile.id}/avatar.png`;

          try {
            const { publicUrl } = await uploadAvatarToSupabase({ bucket, objectPath, pngDataUrl });

            setProfiles((list) =>
              list.map((p) =>
                p.id === targetProfile.id
                  ? { ...p, name: trimmedName || p.name, avatarUrl: publicUrl, avatarUpdatedAt: now, avatarDataUrl: null }
                  : p
              )
            );

            go(backTo);
          } catch (e) {
            console.error("[AvatarUpload] upload failed -> fallback local avatarDataUrl", e);

            setProfiles((list) =>
              list.map((p) =>
                p.id === targetProfile.id
                  ? {
                      ...p,
                      name: trimmedName || p.name,
                      avatarDataUrl: pngDataUrl,
                    }
                  : p
              )
            );

            go(backTo);
          }
        }

        page = (
          <div style={{ padding: 16 }}>
            <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
              ← Retour
            </button>
            <AvatarCreator
              size={512}
              defaultName={targetProfile?.name || ""}
              onSave={handleSaveAvatarProfile}
              isBotMode={isBotMode}
            />
          </div>
        );
        break;
      }

      default:
        page = (
          <Home
            store={store}
            update={update}
            go={go}
            onConnect={() => go("profiles", { view: "me", autoCreate: true })}
          />
        );
    }
  }

  return (
    <CrashCatcher>
      <>
        <MobileErrorOverlay />

        <div className="container" style={{ paddingBottom: 88 }}>
          <AppGate go={go} tab={tab}>
            {page}
          </AppGate>
        </div>

        <BottomNav value={tab as any} onChange={(k: any) => go(k)} />
        <SWUpdateBanner />
      </>
    </CrashCatcher>
  );
}

/* --------------------------------------------
   🔒 APP GATE — NE BLOQUE QUE LES PAGES ONLINE "post-login"
-------------------------------------------- */
function AppGate({
  go,
  tab,
  children,
}: {
  go: (t: any, p?: any) => void;
  tab: any;
  children: React.ReactNode;
}) {
  const { status, ready } = useAuthOnline();

  // pages qui nécessitent une session Supabase active
  const needsSession = tab === "stats_online" || tab === "x01_online_setup" || tab === "online";

  // pendant les flows auth, on ne gate pas
  const isAuthFlow =
    tab === "auth_reset" ||
    tab === "auth_callback" ||
    tab === "auth_forgot" ||
    tab === "auth_start" ||
    tab === "account_start";

  if (!ready) {
    return (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Vérification de la session…
      </div>
    );
  }

  React.useEffect(() => {
    if (!isAuthFlow && needsSession && status !== "signed_in") {
      go("auth_start");
    }
  }, [isAuthFlow, needsSession, status, go]);

  if (!isAuthFlow && needsSession && status !== "signed_in") {
    return (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Redirection vers la connexion…
      </div>
    );
  }

  return <>{children}</>;
}

/* ---------- ROOT PROVIDERS ---------- */
export default function AppRoot() {
  return (
    <ThemeProvider>
      <LangProvider>
        <StoreProvider>
          <AudioProvider>
            <AuthOnlineProvider>
              {/* ✅ player audio global persistant */}
              <audio id="dc-splash-audio" src={SplashJingle} preload="auto" style={{ display: "none" }} />
              <App />
            </AuthOnlineProvider>
          </AudioProvider>
        </StoreProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
