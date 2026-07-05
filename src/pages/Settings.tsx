// ============================================
// src/pages/Settings.tsx — Thème + Langue + Compte + Reset App + Choix de sport
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
// + Drapeaux pour les langues
// + Catégories + carrousels horizontaux pour les thèmes
// + Bloc "Compte & sécurité" inline (V8 always-connected)
// + Bloc "Notifications & communications"
// + Bouton "Tout réinitialiser" (hard reset + reload)
// + Bouton "Supprimer mon compte" (via useAuthOnline().deleteAccount ONLY)
// ✅ NEW : UI "shell" style StatsShell : header + liste de cartes menu
// - Le menu remplace le row d’onglets : tu cliques une carte => ouvre la section
// - Bouton "Retour" en haut :
//   • si on est dans une section => retour au menu settings
//   • sinon => retour Home
// ✅ NEW : Boutons “Changer de jeu” + “Réinitialiser le choix” (START_GAME_KEY)
// ✅ NEW (REQUEST): Vraie page "Compte" simple et efficace :
//   - Menu Compte (cartes): Profil / Notifications / Sécurité / Danger
//   - Sous-pages claires (retour interne au menu compte)
//
// ✅ NEW (DEV MODE):
// - Bloc "Développeur" dans Settings (menu) :
//   • Toggle ON/OFF
//   • ON = rend cliquables les features grisées (non terminées)
// - Panel "Tests & Simulations" (best-effort flags locaux, reset ciblés, etc.)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { THEMES, type ThemeId, type AppTheme } from "../theme/themePresets";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { AccountToolsPanel } from "../components/account/AccountToolsPanel";
import OnlineStatsCleanupPanel from "../components/OnlineStatsCleanupPanel";
import { pushNasAccountSnapshot, pullNasAccountSnapshot, getNasSyncState, computeNasSyncSummary } from "../lib/manualNasSync";
import { getApiUrl } from "../lib/apiClient";
import { generateDiagnostic, exportDiagnostic } from "../lib/diagnosticPro";
import { getCrashLog, getLastCrashReport } from "../lib/crashReporter";
import { simulateDevMatchesAllGames } from "../lib/devMatchSimulator";
import { injectDevX01ReferenceMatch } from "../lib/devInjectX01TestMatch";
import { useSport } from "../contexts/SportContext";

import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  endGoogleCastSession,
  getGoogleCastAppId,
  getGoogleCastState,
  pingGoogleCastReceiver,
  requestGoogleCastSession,
  resetGoogleCastAppId,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";
import { buildViewerWaitingSnapshot } from "../lib/viewer/buildViewerSnapshot";
import { createViewerSession, publishViewerSnapshot, viewerJoinUrl } from "../lib/viewer/viewerClient";
import { clearActiveViewerSession, getActiveViewerSession, setActiveViewerSession, subscribeViewerSessionChanged } from "../lib/viewer/viewerSession";
import { clearViewerDiagLog, getViewerDiagLog } from "../lib/viewer/viewerPublisher";
import type { ViewerSessionInfo } from "../lib/viewer/types";
import {
  getLocalStorageCapabilities,
  estimateBrowserStorage,
  formatStorageBytes,
  formatStoragePrice,
  getPublicStorageDestinations,
  getPublicStoragePlans,
  loadStoragePrefs,
  saveStoragePrefs,
  type StorageDestinationId,
  type StoragePlanId,
} from "../lib/storagePlans";
import {
  createStorageCheckoutSession,
  getAccountStorageUsage,
  deleteCloudObjectRemote,
  downloadCloudObject,
  getCloudStorageStatus,
  getSupabaseAccountStatus,
  saveAccountStoragePreferences,
  uploadCloudObject,
  verifyStorageCheckoutSession,
  type AccountStorageUsage,
  type CloudStorageStatus,
  type SupabaseAccountStatus,
  type StorageBillingInterval,
} from "../lib/cloudStorageApi";

// ✅ DEV MODE (assure-toi d’avoir DevModeProvider au root)
import { useDevMode } from "../contexts/DevModeContext";

// IMPORTANT: ajuste les chemins si tes assets sont ailleurs
import logoDarts from "../assets/games/logo-darts.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoBabyFoot from "../assets/games/logo-babyfoot.png";

// ✅ Sports à venir (SOON)
import logoArchery from "../assets/games/logo-archery.png";
import logoMolkky from "../assets/games/logo-molkky.png";
import logoPadel from "../assets/games/logo-padel.png";
import logoPickleball from "../assets/games/logo-pickleball.png";
import logoFrisbee from "../assets/games/logo-frisbee.png";
import logoBillard from "../assets/games/logo-billard.png";
import logoBadminton from "../assets/games/logo-badminton.png";
import logoBasket from "../assets/games/logo-basket.png";
import logoCornhole from "../assets/games/logo-cornhole.png";
import logoDiceGame from "../assets/games/logo-dicegame.png";
import logoFoot from "../assets/games/logo-foot.png";
import logoRugby from "../assets/games/logo-rugby.png";
import logoVolley from "../assets/games/logo-volley.png";
import logoTennis from "../assets/games/logo-tennis.png";
import logoChess from "../assets/games/logo-chess.png";

type Props = { go?: (tab: any, params?: any) => void };

// ---------------- Thèmes dispo + descriptions fallback ----------------

const NEONS: ThemeId[] = ["gold", "pink", "petrol", "green", "magenta", "red", "orange", "white"];
const SOFTS: ThemeId[] = ["blueNight", "blueOcean", "limeYellow", "sage", "skyBlue"];
const DARKS: ThemeId[] = ["darkTitanium", "darkCarbon", "darkFrost", "darkObsidian"];

const THEME_META: Record<ThemeId, { defaultLabel: string; defaultDesc: string }> = {
  gold: { defaultLabel: "Gold néon", defaultDesc: "Thème premium doré" },
  pink: { defaultLabel: "Rose fluo", defaultDesc: "Ambiance arcade rose" },
  petrol: { defaultLabel: "Bleu pétrole", defaultDesc: "Bleu profond néon" },
  green: { defaultLabel: "Vert néon", defaultDesc: "Style practice lumineux" },
  magenta: { defaultLabel: "Magenta", defaultDesc: "Violet / magenta intense" },
  red: { defaultLabel: "Rouge", defaultDesc: "Rouge arcade agressif" },
  orange: { defaultLabel: "Orange", defaultDesc: "Orange chaud énergique" },
  white: { defaultLabel: "Blanc", defaultDesc: "Fond clair moderne" },

  blueNight: { defaultLabel: "Bleu nuit", defaultDesc: "Fond sombre + flash bleu clair" },
  blueOcean: { defaultLabel: "Bleu océan", defaultDesc: "Bleu naturel océan / ciel" },
  limeYellow: { defaultLabel: "Vert jaune", defaultDesc: "Couleur lime hyper flashy" },
  sage: { defaultLabel: "Vert sauge", defaultDesc: "Tons verts naturels et doux" },
  skyBlue: { defaultLabel: "Bleu pastel", defaultDesc: "Bleu très doux et lumineux" },

  darkTitanium: { defaultLabel: "Titane sombre", defaultDesc: "Look métal premium mat" },
  darkCarbon: { defaultLabel: "Carbone", defaultDesc: "Ambiance fibre carbone moderne" },
  darkFrost: { defaultLabel: "Givre sombre", defaultDesc: "Noir givré futuriste" },
  darkObsidian: { defaultLabel: "Obsidienne", defaultDesc: "Noir poli premium et lisible" },
};

function getPreset(id: ThemeId): AppTheme {
  const found = THEMES.find((t) => t.id === id);
  return found ?? THEMES[0];
}

// ---------------- Langues + libellés fallback ----------------

const LANG_CHOICES: { id: Lang; defaultLabel: string; short: string }[] = [
  { id: "fr", defaultLabel: "Français", short: "FR" },
  { id: "en", defaultLabel: "English", short: "GB" },
  { id: "es", defaultLabel: "Español", short: "ES" },
  { id: "de", defaultLabel: "Deutsch", short: "DE" },
  { id: "it", defaultLabel: "Italiano", short: "IT" },
  { id: "pt", defaultLabel: "Português", short: "PT" },
  { id: "nl", defaultLabel: "Nederlands", short: "NL" },

  { id: "ru", defaultLabel: "Русский", short: "RU" },
  { id: "zh", defaultLabel: "中文", short: "CN" },
  { id: "ja", defaultLabel: "日本語", short: "JP" },
  { id: "ar", defaultLabel: "العربية", short: "AR" },

  { id: "hi", defaultLabel: "हिन्दी", short: "HI" },
  { id: "tr", defaultLabel: "Türkçe", short: "TR" },

  { id: "da", defaultLabel: "Dansk", short: "DK" },
  { id: "no", defaultLabel: "Norsk", short: "NO" },
  { id: "sv", defaultLabel: "Svenska", short: "SE" },
  { id: "is", defaultLabel: "Íslenska", short: "IS" },

  { id: "pl", defaultLabel: "Polski", short: "PL" },
  { id: "ro", defaultLabel: "Română", short: "RO" },
  { id: "sr", defaultLabel: "Српски", short: "RS" },
  { id: "hr", defaultLabel: "Hrvatski", short: "HR" },
  { id: "cs", defaultLabel: "Čeština", short: "CZ" },
];

const LANG_FLAGS: Record<Lang, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
  ru: "🇷🇺",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ar: "🇸🇦",
  hi: "🇮🇳",
  tr: "🇹🇷",
  da: "🇩🇰",
  no: "🇳🇴",
  sv: "🇸🇪",
  is: "🇮🇸",
  pl: "🇵🇱",
  ro: "🇷🇴",
  sr: "🇷🇸",
  hr: "🇭🇷",
  cs: "🇨🇿",
};

// ---------------- Animation halo une seule fois ----------------

function injectSettingsAnimationsOnce() {
  if (typeof document === "undefined") return;
  const STYLE_ID = "dc-settings-theme-animations";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.innerHTML = `
    @keyframes dcSettingsHaloPulse {
      0%   { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
      40%  { box-shadow: 0 0 12px currentColor, 0 0 26px currentColor; }
      100% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
    }

    @keyframes dcSettingsCardGlow {
      0%, 100% { opacity: 0.02; }
      50% { opacity: 0.12; }
    }
  `;
  document.head.appendChild(style);
}

function safeAlert(msg: string) {
  try {
    // eslint-disable-next-line no-alert
    alert(msg);
  } catch {}
}

// ---------------- Bouton de thème (compact) ----------------

type ThemeChoiceButtonProps = {
  id: ThemeId;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
};

function ThemeChoiceButton({ id, label, desc, active, onClick }: ThemeChoiceButtonProps) {
  const preset = getPreset(id);
  const neonColor = preset.primary;
  const [hovered, setHovered] = React.useState(false);

  const cardBoxShadow = active || hovered ? `0 0 14px ${neonColor}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.01 : 1.0;
  const borderColor = active ? neonColor : "rgba(255,255,255,0.12)";
  const titleColor = active ? neonColor : "#FFFFFF";
  const descColor = active ? neonColor : "rgba(255,255,255,0.6)";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        padding: "8px 10px",
        background: active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${borderColor}`,
        boxShadow: cardBoxShadow,
        color: "#FFFFFF",
        cursor: "pointer",
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out",
        minWidth: 140,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${neonColor}`,
            background: "transparent",
            color: neonColor,
            boxShadow: active
              ? `0 0 8px ${neonColor}, 0 0 18px ${neonColor}`
              : hovered
              ? `0 0 5px ${neonColor}`
              : "none",
            animation: active ? "dcSettingsHaloPulse 2.1s ease-in-out infinite" : "",
            flexShrink: 0,
          }}
        />
        <span style={{ color: titleColor }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: descColor, lineHeight: 1.25 }}>{desc}</div>
    </button>
  );
}

// ---------------- Bouton de langue ----------------

type LanguageChoiceButtonProps = {
  id: Lang;
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
};

function LanguageChoiceButton({ id, label, active, onClick, primary }: LanguageChoiceButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const flag = LANG_FLAGS[id] ?? id.toUpperCase();

  const borderColor = active ? primary : "rgba(255,255,255,0.18)";
  const textColor = active ? primary : "rgba(255,255,255,0.8)";
  const bg = active ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.04)";
  const boxShadow = active || hovered ? `0 0 12px ${primary}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.03 : 1.0;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        boxShadow,
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, color 0.18s ease-out",
      }}
    >
      <span style={{ fontSize: 16, minWidth: 24, textAlign: "center" }}>{flag}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------------- Constantes de page & prefs ----------------

const LEGACY_PAGE_BG = "#050712";
const LEGACY_CARD_BG = "rgba(8, 10, 20, 0.98)";
const PAGE_BG = LEGACY_PAGE_BG;
const CARD_BG = LEGACY_CARD_BG;
const LS_ACCOUNT_PREFS = "dc_account_prefs_v1";

// ✅ Choix jeu/sport au démarrage
const START_GAME_KEY = "dc-start-game";

// ✅ DEV test flags
const FORCE_OFFLINE_KEY = "dc:force_offline:v1";
const SEED_DEMO_KEY = "dc:seed_demo:v1";

type AccountPrefs = {
  emailsNews: boolean;
  emailsStats: boolean;
  inAppNotifs: boolean;
};

const DEFAULT_PREFS: AccountPrefs = {
  emailsNews: true,
  emailsStats: true,
  inAppNotifs: true,
};

function safeReadJson<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtDateTime(v: any): string {
  try {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return new Date(n).toLocaleString();
  } catch {
    return "—";
  }
}

// ---------------- Petit composant ligne toggle ----------------

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  const primary = theme.primary;

  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        padding: "6px 8px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${theme.borderSoft}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        {help && (
          <div className="subtitle" style={{ fontSize: 11, color: theme.textSoft }}>
            {help}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            background: checked ? primary : "rgba(255,255,255,0.08)",
            border: `1px solid ${checked ? primary : theme.borderSoft}`,
            display: "flex",
            alignItems: "center",
            padding: 2,
            boxSizing: "border-box",
            cursor: "pointer",
            boxShadow: checked ? `0 0 10px ${primary}66` : "none",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#050712",
              transform: `translateX(${checked ? 18 : 0}px)`,
              transition: "transform 0.18s ease-out",
            }}
          />
        </button>
      </div>
    </label>
  );
}

/* -------------------------------------------------------------
   RESET TOTAL HARDCORE
------------------------------------------------------------- */
async function fullHardReset() {
  try {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}

    try {
      const anyIndexedDB: any = (window as any).indexedDB;
      if (anyIndexedDB && typeof anyIndexedDB.databases === "function") {
        const dbs = await anyIndexedDB.databases();
        for (const db of dbs) {
          if (db?.name) {
            await new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name as string);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          }
        }
      } else {
        const knownDbs = ["dc_stats_v1", "dc_history_v1", "dc_profiles_v1", "dc_training_v1"];
        for (const name of knownDbs) {
          await new Promise<void>((resolve) => {
            const req = window.indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        }
      }
    } catch {}

    // Ancien sign-out Supabase retiré : le reset local ne dépend plus de cette configuration obsolète.

    try {
      const anyWindow = window as any;
      if (anyWindow.__DARTS_STORE__?.setState) {
        anyWindow.__DARTS_STORE__.setState(() => ({
          profiles: [],
          bots: [],
          history: [],
          settings: {},
          activeProfileId: null,
        }));
      }
    } catch {}

    window.location.reload();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("FULL HARD RESET FAILED", err);
    alert("Erreur lors du reset complet. Tu peux aussi vider manuellement les données du site dans le navigateur.");
  }
}

async function clearGameDataAndStatsOnly() {
  try {
    if (typeof window === "undefined") return;

    const ok = window.confirm(
      "⚠️ Reset données & statistiques\n\n" +
        "Cette action supprime uniquement les historiques, matchs simulés et statistiques locales de cet appareil.\n" +
        "Les profils, bots, dartsets, thème, langue et compte sont conservés autant que possible.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    const patterns = [
      "history",
      "histories",
      "stats",
      "stat",
      "match",
      "matches",
      "game-record",
      "game_record",
      "dev-match-simulator",
    ];

    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      for (const k of keys) {
        const lower = k.toLowerCase();
        if (patterns.some((needle) => lower.includes(needle))) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {}

    try {
      const anyIndexedDB: any = (window as any).indexedDB;
      const names = new Set<string>();
      if (anyIndexedDB && typeof anyIndexedDB.databases === "function") {
        const dbs = await anyIndexedDB.databases();
        for (const db of dbs || []) {
          const name = String(db?.name || "");
          const lower = name.toLowerCase();
          if (name && patterns.some((needle) => lower.includes(needle))) names.add(name);
        }
      }
      ["dc_stats_v1", "dc_history_v1"].forEach((name) => names.add(name));
      for (const name of names) {
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    } catch {}

    window.location.reload();
  } catch (err) {
    console.error("CLEAR GAME DATA/STATS FAILED", err);
    alert("Erreur pendant le reset données/statistiques. Tu peux vider manuellement l’historique depuis le navigateur.");
  }
}

// ---------------- UI card menu (settings shell) ----------------

function SettingsMenuCard({
  title,
  subtitle,
  theme,
  onClick,
  rightHint,
}: {
  title: string;
  subtitle: string;
  theme: any;
  onClick?: () => void;
  rightHint?: string;
}) {
  return (
    <div
      className="dc-settings-shell-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        // ✅ FIX: rgba alpha invalide -> 0.55
        boxShadow: `0 16px 32px rgba(0,0,0,0.55), 0 0 18px ${theme.primary}22`,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 18,
          background: "radial-gradient(circle at 15% 0%, rgba(255,255,255,.10), transparent 60%)",
          opacity: 0.0,
          pointerEvents: "none",
          animation: "dcSettingsCardGlow 3.6s ease-in-out infinite",
          mixBlendMode: "screen",
        }}
      />
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: theme.textSoft,
              lineHeight: 1.3,
              maxWidth: 360,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rightHint && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.primary}44`,
                color: theme.primary,
                background: "rgba(0,0,0,0.35)",
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: 0.4,
                boxShadow: `0 0 10px ${theme.primary}22`,
                whiteSpace: "nowrap",
              }}
            >
              {rightHint}
            </div>
          )}

          <div
            style={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 999,
              border: `1px solid ${theme.primary}66`,
              background: "rgba(0,0,0,0.45)",
              boxShadow: `0 0 10px ${theme.primary}33`,
              display: "grid",
              placeItems: "center",
              color: theme.primary,
              fontWeight: 900,
            }}
          >
            ›
          </div>
        </div>
      </button>
    </div>
  );
}

// ---------------- Composant DEV MODE (Settings / menu) ----------------

function DevModeBlock({ go }: { go?: (tab: any, params?: any) => void }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const dev = useDevMode() as any;
  const { sport } = useSport();

  const enabled: boolean = !!dev?.enabled;
  const setEnabled: (v: boolean) => void = dev?.setEnabled ?? (() => {});

  const [openTests, setOpenTests] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [simBusy, setSimBusy] = React.useState(false);
  const [simLastResult, setSimLastResult] = React.useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const sectionStyle: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    padding: 16,
    marginTop: 10,
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
    padding: "8px 12px",
    background: active ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.04)",
    color: active ? theme.primary : theme.textSoft,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: active ? `0 0 14px ${theme.primary}33` : "none",
  });

  function resetForceOffline() {
    try {
      localStorage.removeItem(FORCE_OFFLINE_KEY);
      notify(t("settings.dev.tests.online", "Online simulé (flag OFF)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function setForceOffline() {
    try {
      localStorage.setItem(FORCE_OFFLINE_KEY, "1");
      notify(t("settings.dev.tests.offline", "Offline simulé (flag ON)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function seedDemo() {
    try {
      localStorage.setItem(SEED_DEMO_KEY, String(Date.now()));
      notify(t("settings.dev.tests.seed", "Seed démo demandé (flag)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  async function simulateAllGames() {
    if (simBusy) return;
    const ok = window.confirm(
      "Simulation de parties DEV\n\n" +
        "Cette action remplace les anciennes simulations DEV du sport actif par des parties fictives terminées.\n" +
        "Elle évite donc les compteurs doublés quand tu relances plusieurs fois le test.\n" +
        "Les parties sont marquées devSim/source=dev-match-simulator-v1.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    setSimBusy(true);
    setSimLastResult(null);
    try {
      const res = await simulateDevMatchesAllGames({ perGame: 1, sport: sport as any, replacePrevious: true });
      const label = `${res.created} parties fictives créées (${Object.keys(res.games).length} jeux, ${res.removed} ancienne(s) simulation(s) supprimée(s)).`;
      setSimLastResult(label);
      notify(label);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Erreur simulation parties.";
      setSimLastResult(msg);
      notify(msg);
    } finally {
      setSimBusy(false);
    }
  }

  async function injectX01ReferenceMatch() {
    try {
      const rec = await injectDevX01ReferenceMatch();
      const msg = "Match X01 test JN/SP injecté dans l'historique.";
      setSimLastResult(msg);
      notify(msg);
      if (go) {
        go("x01_end", { matchId: rec.id, resumeId: rec.id, showEnd: true, fresh: Date.now() });
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Erreur injection match X01 test.";
      setSimLastResult(msg);
      notify(msg);
    }
  }

  function clearOnlyDevFlags() {
    try {
      localStorage.removeItem(FORCE_OFFLINE_KEY);
      localStorage.removeItem(SEED_DEMO_KEY);
      notify(t("settings.dev.tests.cleared", "Flags DEV supprimés."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function clearLocalStorageNonCritical() {
    const ok = window.confirm(
      "⚠️ Reset local (soft)\n\n" +
        "Cette action efface le LocalStorage (y compris préférences UI / flags),\n" +
        "sans tenter de supprimer les bases IndexedDB.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    try {
      localStorage.clear();
      sessionStorage.clear();
      notify("LocalStorage vidé. Recharge la page.");
    } catch {
      notify("Erreur reset local.");
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              margin: 0,
              marginBottom: 4,
              fontSize: 16,
              fontWeight: 900,
              color: theme.primary,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${theme.primary}55`,
            }}
          >
            {t("settings.dev.title", "Développeur")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.35 }}>
            {t(
              "settings.dev.subtitle",
              "ON = rend cliquables uniquement les features déjà grisées (non terminées)."
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          style={pillBtn(enabled)}
          title={t("settings.dev.toggleHint", "Active/désactive l’unlock des features grisées.")}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: theme.textSoft }}>
          {enabled
            ? t("settings.dev.stateOn", "Unlock activé : les boutons gris sont testables.")
            : t("settings.dev.stateOff", "Unlock inactif : comportement normal (gris = inactif).")}
        </div>

        <button
          type="button"
          onClick={() => setOpenTests((v) => !v)}
          style={{
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            color: theme.textSoft,
            fontWeight: 900,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {openTests ? t("settings.dev.tests.hide", "Masquer tests") : t("settings.dev.tests.show", "Tests & simu")}
        </button>
      </div>

      {toast && (
        <div style={{ marginTop: 10, fontSize: 11, color: theme.primary, fontWeight: 800 }}>
          {toast}
        </div>
      )}

      {openTests && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8, color: "#fff" }}>
            {t("settings.dev.tests.title", "Tests & Simulations")}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.primary}55`,
                background: `linear-gradient(135deg, ${theme.primary}14, rgba(255,255,255,0.03))`,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Simulations rapides
              </div>
              <button
                type="button"
                onClick={simulateAllGames}
                disabled={simBusy}
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${theme.primary}`,
                  padding: "11px 12px",
                  background: simBusy ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.55)",
                  color: simBusy ? theme.textSoft : theme.primary,
                  fontWeight: 950,
                  cursor: simBusy ? "wait" : "pointer",
                  textAlign: "left",
                  boxShadow: simBusy ? "none" : `0 0 16px ${theme.primary}22`,
                }}
              >
                {simBusy ? "Simulation en cours…" : "Créer simulations — sport actif"}
                <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                  Remplace les anciennes simulations DEV du sport actif, puis ajoute 1 partie terminée par jeu. En mode Darts : X01, Cricket, Killer, Shanghai et Golf.
                </div>
              </button>
              <button
                type="button"
                onClick={injectX01ReferenceMatch}
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(125,226,169,0.75)",
                  padding: "11px 12px",
                  background: "rgba(0,60,35,0.32)",
                  color: "#7de2a9",
                  fontWeight: 950,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 0 16px rgba(125,226,169,0.18)",
                }}
              >
                Injecter match X01 test JN/SP
                <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                  Crée directement en historique la partie 301 simple out : JN 117/61/26/74/23 et SP 67/120/65/bust. Ouvre ensuite le résumé pour tester sans rejouer.
                </div>
              </button>
              {simLastResult && <div style={{ marginTop: 8, fontSize: 11, color: theme.primary, fontWeight: 850 }}>{simLastResult}</div>}
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.025)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Réseau / flags
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={setForceOffline}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  padding: "10px 10px",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("settings.dev.tests.offlineBtn", "Simuler OFFLINE")}
              </button>

              <button
                type="button"
                onClick={resetForceOffline}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  padding: "10px 10px",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("settings.dev.tests.onlineBtn", "Simuler ONLINE")}
              </button>
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.02)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Maintenance locale
              </div>

            <button
              type="button"
              onClick={seedDemo}
              style={{
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                padding: "10px 10px",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.seedBtn", "Seed démo (flag)")}
              <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                {t(
                  "settings.dev.tests.seedHelp",
                  "Pose un flag local. À brancher côté app (store) pour injecter des profils/parties de test."
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={clearOnlyDevFlags}
              style={{
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                padding: "10px 10px",
                background: "rgba(255,255,255,0.02)",
                color: theme.textSoft,
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.clearFlags", "Supprimer flags DEV")}
            </button>

            <button
              type="button"
              onClick={clearLocalStorageNonCritical}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,120,120,0.55)",
                padding: "10px 10px",
                background: "rgba(255,0,0,0.06)",
                color: "#ffb3b3",
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.softReset", "Reset local (soft)")}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 1.35 }}>
                {t(
                  "settings.dev.tests.softResetHelp",
                  "Efface LocalStorage/SessionStorage uniquement (sans IndexedDB)."
                )}
              </div>
            </button>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
            {t(
              "settings.dev.tests.note",
              "Note : ces tests posent surtout des flags. Pour que ce soit pleinement effectif, lis FORCE_OFFLINE_KEY dans tes modules réseau/sync."
            )}
          </div>
        </div>
      )}

      {openTests && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              fontWeight: 900,
              color: theme.primary,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Sécurité & outils compte DEV
          </div>
          <div style={{ fontSize: 11, color: theme.textSoft, lineHeight: 1.35, marginBottom: 8 }}>
            Les actions techniques de session, sync express, refresh, purge locale et debug sont regroupées ici pour ne plus polluer la page Compte.
          </div>
          <AccountToolsPanel go={go} />
        </div>
      )}
    </section>
  );
}

// ---------------- Composant principal ----------------

type SettingsTab = "menu" | "account" | "theme" | "lang" | "general" | "sport" | "castViewer" | "developer";

// ---------------- Account pages (NEW simple & clean) ----------------

type AccountPage = "account_menu" | "account_storage" | "account_notifications" | "account_danger";

async function hardClearLocalAccountAndAppDataForDeletedAccount() {
  if (typeof window === "undefined") return;

  try { window.localStorage.clear(); } catch {}
  try { window.sessionStorage.clear(); } catch {}

  try {
    const idb: any = (window as any).indexedDB;
    if (!idb) return;

    if (typeof idb.databases === "function") {
      const dbs = await idb.databases();
      for (const db of dbs || []) {
        const name = String(db?.name || "").trim();
        if (!name) continue;
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
      return;
    }

    const known = [
      "dc_stats_v1",
      "dc_history_v1",
      "dc_profiles_v1",
      "dc_training_v1",
      "darts-counter-v7",
      "multisports-scoring",
    ];
    for (const name of known) {
      await new Promise<void>((resolve) => {
        const req = window.indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch {}
}

function forceAuthRoute(hash: "#/auth/login" | "#/auth/signup", reload = false) {
  if (typeof window === "undefined") return;
  try {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } catch {
    window.location.hash = hash;
  }
  if (reload) {
    try { window.location.reload(); } catch {}
  }
}

function AccountPages({
  go,
  onBackToSettingsMenu,
  onFullReset,
}: {
  go?: (tab: any, params?: any) => void;
  onBackToSettingsMenu: () => void;
  onFullReset?: () => void | Promise<void>;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const { session, status, loading, profile, updateProfile, deleteAccount, logout } = useAuthOnline() as any;

  const user = session?.user ?? null;
  const isSignedIn = !!user;

  const emailLabel = (user as any)?.email || "—";
  const userIdLabel = (user as any)?.id ? `#${String((user as any).id).slice(0, 8)}` : "—";

  const [page, setPage] = React.useState<AccountPage>("account_menu");

  const [displayName, setDisplayName] = React.useState(profile?.displayName || profile?.nickname || ((user as any)?.email ? String((user as any).email).split("@")[0] : ""));
  const [country, setCountry] = React.useState(profile?.country || "");

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [merging, setMerging] = React.useState(false);
  const [mergeMsg, setMergeMsg] = React.useState<string | null>(null);

  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState<AccountPrefs>(DEFAULT_PREFS);
  const [storagePrefs, setStoragePrefs] = React.useState(() => loadStoragePrefs());
  const [storageEstimate, setStorageEstimate] = React.useState<{ usage: number; quota: number; free: number }>(() => ({ usage: 0, quota: 0, free: 0 }));
  const [cloudUsage, setCloudUsage] = React.useState<AccountStorageUsage | null>(null);
  const [cloudUsageLoading, setCloudUsageLoading] = React.useState(false);
  const [cloudUsageError, setCloudUsageError] = React.useState<string | null>(null);
  const [cloudStorageStatus, setCloudStorageStatus] = React.useState<CloudStorageStatus | null>(null);
  const [cloudStorageTestLoading, setCloudStorageTestLoading] = React.useState(false);
  const [cloudStorageTestResult, setCloudStorageTestResult] = React.useState<{
    status: "ok" | "error" | "info";
    title: string;
    detail?: string;
    objectKey?: string;
  } | null>(null);
  const [supabaseAccountStatus, setSupabaseAccountStatus] = React.useState<SupabaseAccountStatus | null>(null);
  const [supabaseStatusLoading, setSupabaseStatusLoading] = React.useState(false);
  const [supabaseStatusResult, setSupabaseStatusResult] = React.useState<{
    status: "ok" | "error" | "info";
    title: string;
    detail?: string;
  } | null>(null);
  const [storageCheckoutLoading, setStorageCheckoutLoading] = React.useState<string | null>(null);
  const processedStorageCheckoutRef = React.useRef<string | null>(null);
  const storageCapabilities = React.useMemo(() => getLocalStorageCapabilities(), []);

  React.useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const est = await estimateBrowserStorage();
      if (alive) setStorageEstimate(est);
    };
    refresh();
    const onStoragePrefs = () => {
      setStoragePrefs(loadStoragePrefs());
      refresh();
    };
    window.addEventListener("dc-storage-prefs-changed", onStoragePrefs as any);
    window.addEventListener("storage", onStoragePrefs as any);
    return () => {
      alive = false;
      window.removeEventListener("dc-storage-prefs-changed", onStoragePrefs as any);
      window.removeEventListener("storage", onStoragePrefs as any);
    };
  }, []);

  const refreshCloudUsage = React.useCallback(async () => {
    if (!isSignedIn) {
      setCloudUsage(null);
      setCloudUsageError(null);
      return;
    }
    setCloudUsageLoading(true);
    setCloudUsageError(null);
    try {
      const usage = await getAccountStorageUsage();
      setCloudUsage(usage);
      try {
        const status = await getCloudStorageStatus();
        setCloudStorageStatus(status);
      } catch {
        setCloudStorageStatus(null);
      }
      try {
        const supabaseStatus = await getSupabaseAccountStatus();
        setSupabaseAccountStatus(supabaseStatus);
      } catch {
        setSupabaseAccountStatus(null);
      }
    } catch (e: any) {
      setCloudUsageError(e?.message || "Impossible de charger le quota cloud.");
    } finally {
      setCloudUsageLoading(false);
    }
  }, [isSignedIn]);

  React.useEffect(() => {
    if (page !== "account_storage") return;
    void refreshCloudUsage();
  }, [page, refreshCloudUsage]);

  async function syncStoragePrefsToBackend(saved: typeof storagePrefs) {
    if (!isSignedIn) return;
    try {
      const res = await saveAccountStoragePreferences({
        planId: saved.selectedCloudPlan,
        storageDestination: saved.selectedDestination,
      });
      await refreshCloudUsage();
      if (res?.requiresPayment) {
        setMessage(res.paymentMessage || "Offre préparée. Le quota cloud ne sera activé qu'après paiement.");
      }
    } catch (e: any) {
      setCloudUsageError(e?.message || "Préférence locale enregistrée, mais synchro compte impossible.");
    }
  }

  function persistStoragePrefs(next: Partial<typeof storagePrefs>, msg?: string) {
    const saved = saveStoragePrefs(next);
    setStoragePrefs(saved);
    setMessage(msg || "Préférence de stockage enregistrée.");
    void syncStoragePrefsToBackend(saved);
  }

  async function refreshSupabaseStatus(showFeedback = true) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de tester Supabase.");
      openAccountLogin();
      return;
    }
    setSupabaseStatusLoading(true);
    setSupabaseStatusResult({
      status: "info",
      title: "Test Supabase en cours…",
      detail: "Vérification de l’URL projet, des clés backend et de Supabase Auth.",
    });
    try {
      const status = await getSupabaseAccountStatus();
      setSupabaseAccountStatus(status);
      const missing = Array.isArray(status?.missingEnv) ? status.missingEnv.filter(Boolean) : [];
      if (!status?.configured || missing.length) {
        setSupabaseStatusResult({
          status: "error",
          title: "Supabase incomplet",
          detail: `Variables manquantes dans le .env : ${missing.join(", ") || "configuration non reconnue"}.`,
        });
        return;
      }
      const authDetail = status.auth?.message ? ` ${status.auth.message}` : "";
      setSupabaseStatusResult({
        status: status.auth?.reachable === false ? "info" : "ok",
        title: status.auth?.reachable === false ? "Supabase configuré, test réseau à surveiller" : "Supabase configuré",
        detail: `${status.message || "Supabase minimal prêt."}${authDetail}`,
      });
      if (showFeedback) setMessage(null);
    } catch (e: any) {
      const detail = e?.message || "Impossible de vérifier Supabase.";
      setSupabaseStatusResult({ status: "error", title: "Test Supabase échoué", detail });
    } finally {
      setSupabaseStatusLoading(false);
    }
  }

  async function runCloudStorageSmokeTest() {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de tester le stockage cloud.");
      openAccountLogin();
      return;
    }
    setCloudStorageTestLoading(true);
    setCloudUsageError(null);
    setMessage(null);
    setCloudStorageTestResult({
      status: "info",
      title: "Test R2 en cours…",
      detail: "Envoi d’un petit JSON compressé vers Cloudflare R2.",
    });
    try {
      const smokePayload = {
        ok: true,
        type: "storage_smoke_test",
        createdAt: new Date().toISOString(),
        app: "Darts Counter V7",
      };
      const result = await uploadCloudObject({
        objectType: "storage_smoke_test",
        sport: "system",
        title: "Test stockage R2",
        payload: smokePayload,
        gzip: true,
        metadata: { source: "settings_smoke_test" },
      });

      const objectId = result?.object?.id;
      const objectKey = result?.object?.object_key || result?.objectKey || "clé inconnue";
      let downloadOk = false;
      if (objectId) {
        const downloaded = await downloadCloudObject(objectId);
        const content = downloaded?.content as any;
        downloadOk = !!downloaded?.ok && content?.type === smokePayload.type && content?.app === smokePayload.app;
        if (!downloadOk) {
          throw new Error("Upload R2 OK, mais vérification lecture R2 impossible.");
        }
        try {
          const deleted = await deleteCloudObjectRemote(objectId);
          if (deleted?.usage) setCloudUsage(deleted.usage);
        } catch (deleteError: any) {
          setCloudStorageTestResult({
            status: "ok",
            title: "R2 fonctionne, mais l’objet test n’a pas été supprimé automatiquement.",
            detail: deleteError?.message || "Tu peux supprimer manuellement l’objet de test dans Cloudflare R2 si besoin.",
            objectKey,
          });
          return;
        }
      }

      if (result?.usage) setCloudUsage(result.usage);
      setCloudStorageTestResult({
        status: "ok",
        title: "Test R2 réussi",
        detail: "Upload OK · Lecture OK · Nettoyage OK. Le stockage Cloudflare R2 est opérationnel.",
        objectKey,
      });
      setMessage(null);
    } catch (e: any) {
      const missing = e?.missingEnv || e?.data?.missingEnv;
      const detail = Array.isArray(missing) && missing.length
        ? `Cloudflare R2 non configuré dans le .env : ${missing.join(", ")}`
        : e?.message || "Test stockage cloud impossible.";
      setCloudUsageError(detail);
      setCloudStorageTestResult({
        status: "error",
        title: "Test R2 échoué",
        detail,
      });
    } finally {
      setCloudStorageTestLoading(false);
      void refreshCloudUsage();
    }
  }

  async function startStorageCheckout(planId: StoragePlanId, interval: StorageBillingInterval) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant d'activer un abonnement cloud.");
      openAccountLogin();
      return;
    }
    const saved = saveStoragePrefs({ selectedCloudPlan: planId, selectedDestination: "cloud_r2" });
    setStoragePrefs(saved);
    setMessage(null);
    setCloudUsageError(null);
    setStorageCheckoutLoading(`${planId}:${interval}`);
    try {
      await saveAccountStoragePreferences({ planId, storageDestination: "cloud_r2" });
      const checkout = await createStorageCheckoutSession({ planId, interval });
      if (!checkout?.url) {
        throw new Error(checkout?.message || checkout?.error || "URL Stripe non retournée.");
      }
      window.location.href = checkout.url;
    } catch (e: any) {
      const missingEnv = e?.missingEnv || e?.data?.missingEnv || "";
      setCloudUsageError(
        missingEnv
          ? `Prix Stripe non configuré côté .env : ${missingEnv}`
          : e?.message || "Impossible de lancer le paiement Stripe."
      );
    } finally {
      setStorageCheckoutLoading(null);
      void refreshCloudUsage();
    }
  }

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = String(window.location.hash || "");
    if (!hash.includes("storage_checkout=")) return;
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(query);
    const statusParam = params.get("storage_checkout") || "";
    const sessionId = params.get("storage_session_id") || "";
    setPage("account_storage");
    try {
      const cleanHash = hash.split("?")[0] || "#/settings";
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${cleanHash}`);
    } catch {}
    if (statusParam === "cancel") {
      setMessage("Paiement annulé. L'offre payante reste en attente tant que Stripe n'a pas confirmé.");
      return;
    }
    if (!isSignedIn || !sessionId || sessionId === "cancelled" || processedStorageCheckoutRef.current === sessionId) return;
    processedStorageCheckoutRef.current = sessionId;
    setStorageCheckoutLoading("verify");
    verifyStorageCheckoutSession(sessionId)
      .then((res) => {
        if (res?.usage) setCloudUsage(res.usage);
        setMessage(res?.activated ? "Paiement confirmé : quota cloud activé." : "Paiement vérifié. Le quota sera activé dès confirmation Stripe.");
      })
      .catch((e: any) => setCloudUsageError(e?.message || "Impossible de vérifier le paiement Stripe."))
      .finally(() => setStorageCheckoutLoading(null));
  }, [isSignedIn]);

  React.useEffect(() => {
    setDisplayName(profile?.displayName || profile?.nickname || ((user as any)?.email ? String((user as any).email).split("@")[0] : ""));
    setCountry(profile?.country || "");
  }, [profile?.displayName, profile?.nickname, profile?.country, (user as any)?.email]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_ACCOUNT_PREFS);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AccountPrefs>;
      setPrefs({ ...DEFAULT_PREFS, ...parsed });
    } catch {}
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_ACCOUNT_PREFS, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  async function handleSaveProfile() {
    if (status !== "signed_in") return;
    setSavingProfile(true);
    setMessage(null);
    setError(null);

    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        country: country.trim() || undefined,
      });
      setMessage(t("settings.account.save.ok", "Informations de compte mises à jour."));
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn("[settings] updateProfile error", e);
      setError(e?.message || t("settings.account.save.error", "Impossible de mettre à jour le compte pour le moment."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogoutV8() {
    setMessage(null);
    setError(null);
    try {
      await logout();
      forceAuthRoute("#/auth/login", false);
    } catch (e: any) {
      setError("Erreur déconnexion : " + (e?.message ?? e));
    }
  }

  async function handleDeleteAccountV8() {
    const ok = window.confirm(
      "⚠️ Cette action est définitive.\n\n" +
        "Le compte sera supprimé de la base NAS, puis les données locales de cet appareil seront effacées.\n\n" +
        "Tu seras redirigé vers la création de compte. Continuer ?"
    );
    if (!ok) return;

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteAccount();
      await hardClearLocalAccountAndAppDataForDeletedAccount();
      forceAuthRoute("#/auth/signup", true);
    } catch (e: any) {
      setError("Erreur suppression compte : " + (e?.message ?? e));
      setDeleting(false);
    }
  }

  const sectionBox: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    padding: 16,
    marginBottom: 16,
  };

  const miniBack = (
    <button
      type="button"
      onClick={() => setPage("account_menu")}
      style={{
        border: "none",
        background: "transparent",
        color: theme.textSoft,
        fontSize: 14,
        cursor: "pointer",
        padding: 0,
        marginBottom: 10,
      }}
    >
      ← {t("settings.account.back", "Retour compte")}
    </button>
  );

  const accountStatusHint =
    status === "signed_in"
      ? t("settings.account.connectedShort", "Connecté")
      : t("settings.account.offlineShort", "Hors ligne");

  function openAccountLogin() {
    if (typeof go === "function") {
      go("account_start" as any);
      return;
    }
    if (typeof window !== "undefined") forceAuthRoute("#/auth/login", false);
  }

  function openMyProfile() {
    if (typeof go === "function") {
      go("profiles" as any, { view: "me", autoCreate: true });
      return;
    }
    if (typeof window !== "undefined") window.location.hash = "#/profiles?view=me";
  }

  const softCard: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,0.035)",
    padding: 12,
  };

  return (
    <div>
      {/* MENU COMPTE */}
      {page === "account_menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <section style={sectionBox}>
            {miniBack}
            <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18, color: theme.primary }}>Compte</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...softCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Statut
                  </div>
                  <div style={{ marginTop: 4, fontSize: 17, color: "#fff", fontWeight: 950 }}>
                    {accountStatusHint}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                    {status === "signed_in"
                      ? `${emailLabel} ${userIdLabel}`
                      : "Compte non connecté ou session locale."}
                  </div>
                </div>
                {status === "signed_in" ? (
                  <button
                    type="button"
                    onClick={handleLogoutV8}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${theme.borderSoft}`,
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Se déconnecter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openAccountLogin}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${theme.primary}77`,
                      padding: "10px 14px",
                      background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                      color: "#000",
                      fontWeight: 950,
                      cursor: "pointer",
                      boxShadow: `0 0 16px ${theme.primary}33`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Se connecter
                  </button>
                )}
              </div>

              <div style={softCard}>
                <h3 style={{ margin: 0, marginBottom: 6, fontSize: 16, color: theme.primary }}>Profil joueur</h3>
                <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.4, marginBottom: 10 }}>
                  Le surnom, l’avatar et les informations joueur se modifient depuis la carte Mon profil dans l’onglet Profils.
                </div>
                <button
                  type="button"
                  onClick={openMyProfile}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: `1px solid ${theme.primary}77`,
                    padding: "11px 12px",
                    background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                    color: "#000",
                    fontWeight: 950,
                    cursor: "pointer",
                    boxShadow: `0 0 16px ${theme.primary}22`,
                  }}
                >
                  Ouvrir le profil
                </button>
              </div>
            </div>
          </section>

          <SettingsMenuCard
            title="Stockage & abonnements"
            subtitle={`Destination actuelle : ${storagePrefs.selectedDestination === "cloud_r2" ? "Cloud R2" : storagePrefs.selectedDestination === "founder_nas" ? "NAS fondateur" : "local / appareil"}. Offre cloud : ${getPublicStoragePlans().find((p) => p.id === storagePrefs.selectedCloudPlan)?.shortLabel || "100 Mo"}.`}
            theme={theme}
            onClick={() => setPage("account_storage")}
            rightHint={storagePrefs.selectedDestination === "cloud_r2" ? "☁" : "↧"}
          />

          <SettingsMenuCard
            title={t("settings.account.menu.notifications", "Notifications")}
            subtitle="Options locales uniquement. À garder simple tant que les notifications réelles ne sont pas branchées."
            theme={theme}
            onClick={() => setPage("account_notifications")}
          />
          <SettingsMenuCard
            title={t("settings.account.menu.danger", "Reset")}
            subtitle="Suppression du compte ou reset des données/statistiques locales."
            theme={theme}
            onClick={() => setPage("account_danger")}
            rightHint="!"
          />
        </div>
      )}

      {/* STOCKAGE / ABONNEMENTS */}
      {page === "account_storage" && (
        <section style={sectionBox}>
          {miniBack}

          <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18, color: theme.primary }}>
            Stockage & abonnements
          </h2>

          <p style={{ margin: 0, marginBottom: 12, fontSize: 11.5, color: theme.textSoft, lineHeight: 1.45 }}>
            Le gratuit sert uniquement à tester le cloud. Le stockage lourd doit être payé par l'utilisateur :
            historiques, stats, compétitions, avatars, sauvegardes et médias partiront vers Cloudflare R2 quand le mode cloud sera branché.
            Ton compte fondateur reste prévu à part sur NAS.
          </p>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Stockage local appareil
            </div>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Utilisé</div>
                <div style={{ fontWeight: 950, color: "#fff" }}>{formatStorageBytes(storageEstimate.usage)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Quota estimé</div>
                <div style={{ fontWeight: 950, color: "#fff" }}>{formatStorageBytes(storageEstimate.quota)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Libre</div>
                <div style={{ fontWeight: 950, color: theme.primary }}>{formatStorageBytes(storageEstimate.free)}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              OPFS : {storageCapabilities.opfs ? "OK" : "non dispo"} · Persistance : {storageCapabilities.persistentStorage ? "OK" : "non dispo"} · Export fichier : {storageCapabilities.filePicker ? "sélecteur avancé" : "fallback téléchargement"}
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Quota cloud du compte
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: theme.primary }}>
                  {!isSignedIn
                    ? "Connecte-toi pour synchroniser un quota cloud"
                    : cloudUsageLoading
                      ? "Chargement…"
                      : cloudUsage
                        ? `${formatStorageBytes(cloudUsage.usedBytes)} / ${formatStorageBytes(cloudUsage.quotaBytes)}`
                        : "Non initialisé"}
                </div>
              </div>
              {isSignedIn && (
                <button
                  type="button"
                  onClick={() => void refreshCloudUsage()}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(255,255,255,0.055)",
                    color: theme.text,
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Actualiser
                </button>
              )}
            </div>
            {cloudUsage && (
              <>
                <div style={{ marginTop: 8, height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.borderSoft}` }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, cloudUsage.percentUsed))}%`, height: "100%", background: theme.primary }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
                  Plan actif : <b>{String(cloudUsage.preference?.plan_id || "free_test_100mb")}</b> · Restant : <b>{formatStorageBytes(cloudUsage.remainingBytes)}</b>
                  {cloudUsage.requiresPayment && (
                    <span style={{ color: "#ffcc66" }}> · paiement requis pour activer {String(cloudUsage.desiredPlanId || "l'offre choisie")}</span>
                  )}
                </div>
              </>
            )}
            {cloudUsageError && <div style={{ marginTop: 6, fontSize: 11, color: "#ff6b6b", lineHeight: 1.35 }}>{cloudUsageError}</div>}
            <div style={{ marginTop: 6, fontSize: 10.5, color: theme.textSoft, lineHeight: 1.35 }}>
              Sécurité : sélectionner une offre payante ne donne pas le quota tant que Stripe n'a pas confirmé l'abonnement. Le gratuit reste limité à 100 Mo.
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Cloudflare R2
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: cloudStorageStatus?.configured ? "#62d26f" : "#ffcc66" }}>
                  {cloudStorageStatus?.configured ? "Configuré" : "Pas encore configuré"}
                </div>
              </div>
              <button
                type="button"
                disabled={cloudStorageTestLoading || !isSignedIn}
                onClick={() => void runCloudStorageSmokeTest()}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}88`,
                  background: cloudStorageTestLoading ? "rgba(255,255,255,0.08)" : `${theme.primary}22`,
                  color: theme.primary,
                  padding: "8px 11px",
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: cloudStorageTestLoading || !isSignedIn ? "not-allowed" : "pointer",
                  opacity: cloudStorageTestLoading || !isSignedIn ? 0.65 : 1,
                }}
              >
                {cloudStorageTestLoading ? "Test…" : "Tester R2"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              {cloudStorageStatus?.message || "Ce test envoie un petit JSON compressé vers R2. Il échouera normalement tant que R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY ne sont pas remplis dans le .env."}
              {cloudStorageStatus?.bucket ? ` Bucket : ${cloudStorageStatus.bucket}.` : ""}
            </div>
            {cloudStorageTestResult && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  border: `1px solid ${
                    cloudStorageTestResult.status === "ok"
                      ? "rgba(98,210,111,0.55)"
                      : cloudStorageTestResult.status === "error"
                        ? "rgba(255,107,107,0.65)"
                        : theme.borderSoft
                  }`,
                  background:
                    cloudStorageTestResult.status === "ok"
                      ? "rgba(98,210,111,0.10)"
                      : cloudStorageTestResult.status === "error"
                        ? "rgba(255,107,107,0.10)"
                        : "rgba(255,255,255,0.055)",
                  padding: 10,
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: cloudStorageTestResult.status === "error" ? "#ff8c8c" : theme.text,
                }}
              >
                <div style={{ fontWeight: 950, color: cloudStorageTestResult.status === "ok" ? "#62d26f" : cloudStorageTestResult.status === "error" ? "#ff8c8c" : theme.primary }}>
                  {cloudStorageTestResult.title}
                </div>
                {cloudStorageTestResult.detail && (
                  <div style={{ marginTop: 4, color: theme.textSoft }}>{cloudStorageTestResult.detail}</div>
                )}
                {cloudStorageTestResult.objectKey && (
                  <div style={{ marginTop: 4, color: theme.textSoft, wordBreak: "break-all" }}>
                    Objet test : {cloudStorageTestResult.objectKey}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Supabase minimal
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: supabaseAccountStatus?.configured ? "#62d26f" : "#ffcc66" }}>
                  {supabaseAccountStatus?.configured ? "Configuré" : "Pas encore configuré"}
                </div>
              </div>
              <button
                type="button"
                disabled={supabaseStatusLoading || !isSignedIn}
                onClick={() => void refreshSupabaseStatus(true)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}88`,
                  background: supabaseStatusLoading ? "rgba(255,255,255,0.08)" : `${theme.primary}22`,
                  color: theme.primary,
                  padding: "8px 11px",
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: supabaseStatusLoading || !isSignedIn ? "not-allowed" : "pointer",
                  opacity: supabaseStatusLoading || !isSignedIn ? 0.65 : 1,
                }}
              >
                {supabaseStatusLoading ? "Test…" : "Tester Supabase"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              {supabaseAccountStatus?.message || "Supabase sert uniquement à l’authentification minimale et à l’index léger. Les données lourdes restent prévues pour Cloudflare R2."}
              {supabaseAccountStatus?.projectHost ? ` Projet : ${supabaseAccountStatus.projectHost}.` : ""}
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
              {[
                ["URL", supabaseAccountStatus?.projectUrlConfigured],
                ["Clé publique", supabaseAccountStatus?.anonKeyConfigured],
                ["Clé serveur", supabaseAccountStatus?.serviceRoleKeyConfigured],
              ].map(([label, ok]) => (
                <div
                  key={String(label)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${ok ? "rgba(98,210,111,0.45)" : "rgba(255,204,102,0.45)"}`,
                    background: ok ? "rgba(98,210,111,0.08)" : "rgba(255,204,102,0.08)",
                    padding: "7px 8px",
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: ok ? "#9cffaa" : "#ffdd88",
                  }}
                >
                  {String(label)} : {ok ? "OK" : "à remplir"}
                </div>
              ))}
            </div>
            {supabaseStatusResult && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  border: `1px solid ${
                    supabaseStatusResult.status === "ok"
                      ? "rgba(98,210,111,0.55)"
                      : supabaseStatusResult.status === "error"
                        ? "rgba(255,107,107,0.65)"
                        : theme.borderSoft
                  }`,
                  background:
                    supabaseStatusResult.status === "ok"
                      ? "rgba(98,210,111,0.10)"
                      : supabaseStatusResult.status === "error"
                        ? "rgba(255,107,107,0.10)"
                        : "rgba(255,255,255,0.055)",
                  padding: 10,
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: supabaseStatusResult.status === "error" ? "#ff8c8c" : theme.text,
                }}
              >
                <div style={{ fontWeight: 950, color: supabaseStatusResult.status === "ok" ? "#62d26f" : supabaseStatusResult.status === "error" ? "#ff8c8c" : theme.primary }}>
                  {supabaseStatusResult.title}
                </div>
                {supabaseStatusResult.detail && (
                  <div style={{ marginTop: 4, color: theme.textSoft }}>{supabaseStatusResult.detail}</div>
                )}
              </div>
            )}
          </div>


          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: theme.primary, marginBottom: 8 }}>
              Où stocker les données ?
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {getPublicStorageDestinations().map((dest) => {
                const active = storagePrefs.selectedDestination === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() =>
                      persistStoragePrefs(
                        {
                          selectedDestination: dest.id as StorageDestinationId,
                          preferExternalStorage: dest.id === "external_sd_manual" || dest.id === "device_file",
                        },
                        dest.id === "cloud_r2"
                          ? "Cloud R2 sélectionné. Les uploads réels seront bloqués tant que les clés R2 ne seront pas remplies dans le .env."
                          : "Destination locale enregistrée."
                      )
                    }
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      padding: 12,
                      border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      background: active ? `${theme.primary}16` : "rgba(255,255,255,0.035)",
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 950, color: active ? theme.primary : "#fff" }}>{dest.label}</span>
                      {active && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: theme.primary }}>ACTIF</span>}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>{dest.description}</div>
                    {dest.warning && <div style={{ marginTop: 5, fontSize: 10.5, color: "#ffcc66", lineHeight: 1.35 }}>{dest.warning}</div>}
                  </button>
                );
              })}

              <div
                style={{
                  borderRadius: 14,
                  padding: 12,
                  border: `1px dashed ${theme.primary}77`,
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <div style={{ fontWeight: 950, color: theme.primary }}>NAS fondateur</div>
                <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                  Réservé à ton compte admin : tu conserves ton NAS pour ne pas payer ton propre usage. Cette option ne sera pas proposée aux utilisateurs lambda.
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 950, color: theme.primary, marginBottom: 8 }}>
              Offres cloud publiques
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {getPublicStoragePlans().map((plan) => {
                const active = storagePrefs.selectedCloudPlan === plan.id;
                const activeOnServer = cloudUsage?.preference?.plan_id === plan.id;
                const pendingOnServer = cloudUsage?.desiredPlanId === plan.id;
                const monthly = formatStoragePrice(plan.priceMonthlyCents);
                const yearly = plan.priceYearlyCents ? formatStoragePrice(plan.priceYearlyCents) : null;
                const paid = plan.priceMonthlyCents > 0;
                const monthlyLoading = storageCheckoutLoading === `${plan.id}:monthly`;
                const yearlyLoading = storageCheckoutLoading === `${plan.id}:yearly`;
                return (
                  <div
                    key={plan.id}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      padding: 12,
                      border: active || activeOnServer ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      background: active || activeOnServer ? `${theme.primary}16` : "rgba(255,255,255,0.035)",
                      color: theme.text,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 950, color: active || activeOnServer ? theme.primary : "#fff" }}>{plan.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 950, color: theme.primary }}>{plan.shortLabel}</span>
                      {plan.badge && <span style={{ fontSize: 10, fontWeight: 950, border: `1px solid ${theme.primary}88`, borderRadius: 999, padding: "2px 7px", color: theme.primary }}>{plan.badge}</span>}
                      {activeOnServer && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: "#62d26f" }}>ACTIF</span>}
                      {!activeOnServer && pendingOnServer && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: "#ffcc66" }}>EN ATTENTE</span>}
                      {!activeOnServer && !pendingOnServer && active && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: theme.primary }}>CHOISI</span>}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 900 }}>
                      {plan.priceMonthlyCents === 0 ? "0 €" : `${monthly} / mois`}{yearly ? ` · ${yearly} / an` : ""}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>{plan.description}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {plan.features.slice(0, 4).map((f) => (
                        <span key={f} style={{ fontSize: 10.5, borderRadius: 999, padding: "3px 7px", background: "rgba(255,255,255,0.055)", color: theme.textSoft }}>
                          {f}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() =>
                          persistStoragePrefs(
                            {
                              selectedCloudPlan: plan.id as StoragePlanId,
                              selectedDestination: plan.id === "free_test_100mb" ? storagePrefs.selectedDestination : "cloud_r2",
                            },
                            `${plan.label} sélectionné (${plan.shortLabel}).`
                          )
                        }
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${theme.borderSoft}`,
                          background: active ? `${theme.primary}22` : "rgba(255,255,255,0.055)",
                          color: active ? theme.primary : theme.text,
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        {paid ? "Préparer cette offre" : "Activer gratuit"}
                      </button>

                      {paid && (
                        <>
                          <button
                            type="button"
                            disabled={!!storageCheckoutLoading}
                            onClick={() => void startStorageCheckout(plan.id as StoragePlanId, "monthly")}
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${theme.primary}88`,
                              background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                              color: "#000",
                              padding: "8px 11px",
                              fontSize: 11,
                              fontWeight: 950,
                              cursor: storageCheckoutLoading ? "wait" : "pointer",
                              opacity: storageCheckoutLoading ? 0.7 : 1,
                            }}
                          >
                            {monthlyLoading ? "Ouverture Stripe…" : `Payer mensuel ${monthly}`}
                          </button>
                          {yearly && (
                            <button
                              type="button"
                              disabled={!!storageCheckoutLoading}
                              onClick={() => void startStorageCheckout(plan.id as StoragePlanId, "yearly")}
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${theme.primary}55`,
                                background: "rgba(255,255,255,0.075)",
                                color: theme.primary,
                                padding: "8px 11px",
                                fontSize: 11,
                                fontWeight: 950,
                                cursor: storageCheckoutLoading ? "wait" : "pointer",
                                opacity: storageCheckoutLoading ? 0.7 : 1,
                              }}
                            >
                              {yearlyLoading ? "Ouverture Stripe…" : `Payer annuel ${yearly}`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {message && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#62d26f", lineHeight: 1.35 }}>
              {message}
            </div>
          )}
        </section>
      )}

      {/* NOTIFICATIONS */}
      {page === "account_notifications" && (
        <section style={sectionBox}>
          {miniBack}

          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18, color: theme.primary }}>
            {t("settings.account.notifications.title", "Notifications & communications")}
          </h2>

          <p className="subtitle" style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10, lineHeight: 1.4 }}>
            Ces réglages sont conservés localement. Ils ne déclenchent pas encore de vrais emails/push tant qu’aucun service de notifications n’est branché côté app.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            <ToggleRow
              label={t("settings.account.notifications.emailsNews", "Emails de nouveautés / promotions")}
              help={t(
                "settings.account.notifications.emailsNewsHelp",
                "Actualités majeures, nouvelles fonctionnalités, offres spéciales."
              )}
              checked={prefs.emailsNews}
              onChange={(v) => setPrefs((p) => ({ ...p, emailsNews: v }))}
            />
            <ToggleRow
              label={t("settings.account.notifications.emailsStats", "Emails de résumé de stats & conseils")}
              help={t(
                "settings.account.notifications.emailsStatsHelp",
                "Récapitulatif occasionnel de tes stats avec quelques tips."
              )}
              checked={prefs.emailsStats}
              onChange={(v) => setPrefs((p) => ({ ...p, emailsStats: v }))}
            />
            <ToggleRow
              label={t("settings.account.notifications.inAppNotifs", "Notifications dans l’app (sons / messages info)")}
              help={t(
                "settings.account.notifications.inAppNotifsHelp",
                "Contrôle les sons d’alerte et les petits messages d’infos dans l’application."
              )}
              checked={prefs.inAppNotifs}
              onChange={(v) => setPrefs((p) => ({ ...p, inAppNotifs: v }))}
            />
          </div>
        </section>
      )}

      {/* DANGER */}
      {page === "account_danger" && (
        <section style={sectionBox}>
          {miniBack}

          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18, color: "#ff6b6b" }}>
            {t("settings.account.danger", "Zone dangereuse")}
          </h2>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: theme.primary }}>
                Reset données & statistiques
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                Supprime les historiques, matchs simulés et statistiques locales de cet appareil. Les profils, bots, dartsets, thème et compte sont conservés autant que possible.
              </p>
              <button
                type="button"
                onClick={clearGameDataAndStatsOnly}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${theme.primary}66`,
                  background: "rgba(0,0,0,0.35)",
                  color: theme.primary,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Reset données & stats
              </button>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: theme.primary }}>
                Réinitialiser l’application
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                Hard reset local complet de cet appareil : profils locaux, bots, dartsets, historique, stats et réglages. Le compte NAS n’est pas supprimé.
              </p>
              <button
                type="button"
                onClick={() => onFullReset?.()}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,120,0.55)",
                  background: "rgba(255,0,0,0.06)",
                  color: "#ffb3b3",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Réinitialiser application
              </button>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,0,0,0.35)",
                background: "rgba(255,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: "#ff8a8a" }}>
                {t("settings.account.delete.title", "Supprimer mon compte définitivement")}
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
                Supprime le compte cloud et ses données associées. Action définitive.
              </p>
              {error && (
                <div className="subtitle" style={{ color: "#ff6666", fontSize: 11, marginBottom: 8 }}>
                  {error}
                </div>
              )}
              <button
                disabled={loading}
                onClick={handleDeleteAccountV8}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, #ff5c5c, #c92a2a)",
                  color: "#fff",
                  fontWeight: 900,
                  border: "none",
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                  boxShadow: "0 0 14px rgba(255,80,80,0.35)",
                }}
              >
                🗑️ {deleting ? "Suppression…" : "Supprimer mon compte"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


function CastViewerSettingsSection({ go }: { go?: (tab: any, params?: any) => void }) {
  const { theme } = useTheme() as any;
  const [castState, setCastState] = React.useState<any>(() => getGoogleCastState());
  const [appId, setAppId] = React.useState<string>(() => getGoogleCastAppId());
  const [viewer, setViewer] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [viewerDiag, setViewerDiag] = React.useState<any[]>(() => getViewerDiagLog());
  const [busy, setBusy] = React.useState<null | "cast" | "viewer" | "ping">(null);
  const [msg, setMsg] = React.useState<string>("Cast TV et Viewer tablette sont deux sorties séparées. Tu peux activer les deux sans conflit.");

  React.useEffect(() => {
    const refreshCast = () => {
      setCastState(getGoogleCastState());
      setAppId(getGoogleCastAppId());
    };
    refreshCast();
    return subscribeGoogleCastStatus(refreshCast);
  }, []);

  React.useEffect(() => subscribeViewerSessionChanged(() => setViewer(getActiveViewerSession())), []);

  React.useEffect(() => {
    const refresh = () => setViewerDiag(getViewerDiagLog());
    window.addEventListener("dc-viewer-diag", refresh as any);
    return () => window.removeEventListener("dc-viewer-diag", refresh as any);
  }, []);

  const box: React.CSSProperties = {
    borderRadius: 18,
    padding: 16,
    background: CARD_BG,
    border: `1px solid ${theme.borderSoft}`,
    boxShadow: `0 14px 34px rgba(0,0,0,.35), 0 0 14px ${theme.primary}18`,
  };

  const btn = (primary = false): React.CSSProperties => ({
    borderRadius: 14,
    padding: "10px 12px",
    border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
    background: primary ? `${theme.primary}22` : "rgba(255,255,255,0.04)",
    color: primary ? theme.primary : theme.text,
    fontWeight: 900,
    cursor: "pointer",
  });

  function saveCastAppId() {
    const next = String(appId || DEFAULT_GOOGLE_CAST_APP_ID).trim().toUpperCase();
    setGoogleCastAppId(next);
    setAppId(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setMsg(`Receiver Cast enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefaultCastAppId() {
    resetGoogleCastAppId();
    setAppId(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setMsg(`Receiver Cast par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function toggleCast() {
    setBusy("cast");
    try {
      if (castState?.isCasting) {
        await endGoogleCastSession();
        setMsg("Session Cast arrêtée.");
      } else {
        const res = await requestGoogleCastSession();
        if (res.ok) setMsg("Session Cast démarrée.");
        else setMsg(res.reason === "cancel" ? "Ouverture Cast annulée." : `Impossible d’ouvrir Cast : ${res.reason}`);
      }
    } finally {
      setCastState(getGoogleCastState());
      setBusy(null);
    }
  }

  async function pingCast() {
    setBusy("ping");
    try {
      const ok = await pingGoogleCastReceiver();
      setMsg(ok ? "PING envoyé au receiver Cast." : "PING impossible : aucune session Cast active ou erreur receiver.");
    } finally {
      setCastState(getGoogleCastState());
      setBusy(null);
    }
  }

  async function startViewer() {
    setBusy("viewer");
    setMsg("Création de la session viewer…");
    try {
      const res = await createViewerSession();
      const now = Date.now();
      const info: ViewerSessionInfo = {
        sessionId: res.sessionId,
        code: res.code || res.sessionId,
        joinUrl: res.joinUrl || viewerJoinUrl(res.sessionId),
        createdAt: now,
        expiresAt: res.expiresInSeconds ? now + res.expiresInSeconds * 1000 : null,
        enabled: true,
      };
      setActiveViewerSession(info);
      setViewer(info);
      try {
        await publishViewerSnapshot(info.sessionId, buildViewerWaitingSnapshot(info.sessionId));
      } catch {}
      setMsg("Session viewer active. Ouvre la page complète pour afficher le QR code.");
    } catch (e: any) {
      setMsg(`Erreur viewer : ${String(e?.message || e || "création impossible")}`);
    } finally {
      setBusy(null);
    }
  }

  async function copyViewerLink() {
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Lien viewer copié.");
    } catch {
      setMsg(url);
    }
  }

  function stopViewer() {
    clearActiveViewerSession();
    setViewer(null);
    setMsg("Session viewer arrêtée.");
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={box}>
        <h2 style={{ margin: "0 0 8px", color: theme.primary, fontSize: 18 }}>Sorties écran</h2>
        <p style={{ margin: 0, color: theme.textSoft, fontSize: 13, lineHeight: 1.45 }}>
          Le Cast envoie vers TV / Chromecast. Le Viewer tablette crée une session live séparée avec QR code. Les deux peuvent tourner en même temps.
        </p>
        <div style={{ marginTop: 12, color: msg.startsWith("Erreur") || msg.startsWith("Impossible") ? "#ffb4b4" : theme.text, fontSize: 13, fontWeight: 800 }}>
          {msg}
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>📺 Google Cast / TV</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>
              {castState?.isCasting ? `Actif${castState?.deviceName ? ` : ${castState.deviceName}` : ""}` : "Aucune session active"}
            </div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${castState?.isCasting ? theme.primary : theme.borderSoft}`, color: castState?.isCasting ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 1000 }}>
            {castState?.isCasting ? "ON" : "OFF"}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ color: theme.textSoft, fontSize: 12, fontWeight: 900 }}>Receiver Application ID</label>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value.toUpperCase())}
            placeholder="Ex: 3534BC6A"
            style={{
              borderRadius: 13,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.05)",
              color: theme.text,
              padding: "11px 12px",
              fontWeight: 900,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={saveCastAppId} style={btn(true)}>Enregistrer</button>
            <button type="button" onClick={restoreDefaultCastAppId} style={btn(false)}>App ID défaut</button>
            <button type="button" disabled={busy === "cast"} onClick={toggleCast} style={btn(true)}>{castState?.isCasting ? "Arrêter Cast" : "Lancer Cast"}</button>
            <button type="button" disabled={busy === "ping"} onClick={pingCast} style={btn(false)}>PING</button>
            <button type="button" onClick={() => go?.("cast_host")} style={btn(false)}>Page Cast complète</button>
          </div>
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>📱 Viewer tablette</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>
              {viewer?.sessionId ? `Session active : ${viewer.code || viewer.sessionId}` : "Aucune session active"}
            </div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${viewer?.sessionId ? theme.primary : theme.borderSoft}`, color: viewer?.sessionId ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 1000 }}>
            {viewer?.sessionId ? "ON" : "OFF"}
          </div>
        </div>

        {viewer?.sessionId && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div style={{ color: theme.primary, fontSize: 30, letterSpacing: 3, fontWeight: 1200 }}>{viewer.code || viewer.sessionId}</div>
            <div style={{ color: theme.textSoft, fontSize: 12, overflowWrap: "anywhere" }}>{viewer.joinUrl}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy === "viewer"} onClick={viewer?.sessionId ? copyViewerLink : startViewer} style={btn(true)}>
            {viewer?.sessionId ? "Copier lien" : busy === "viewer" ? "Création…" : "Créer viewer"}
          </button>
          {viewer?.sessionId && <button type="button" onClick={stopViewer} style={btn(false)}>Arrêter viewer</button>}
          <button type="button" onClick={() => go?.("viewer_host")} style={btn(false)}>Page Viewer / QR code</button>
          <button type="button" onClick={() => go?.("viewer_join")} style={btn(false)}>Rejoindre</button>
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>Diagnostic viewer</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>Derniers envois live vers tablette.</div>
          </div>
          <button type="button" onClick={() => { clearViewerDiagLog(); setViewerDiag([]); }} style={btn(false)}>Vider</button>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 6, maxHeight: 130, overflow: "auto" }}>
          {viewerDiag.length ? viewerDiag.slice(-6).reverse().map((d, i) => (
            <div key={i} style={{ fontSize: 11, color: theme.textSoft, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 5 }}>
              {new Date(d.at || Date.now()).toLocaleTimeString()} · {d.entry} · {d.extra ? JSON.stringify(d.extra).slice(0, 110) : ""}
            </div>
          )) : <div style={{ color: theme.textSoft, fontSize: 12 }}>Aucun envoi pour le moment.</div>}
        </div>
      </section>
    </div>
  );
}

export function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme() as any;
  const { lang, setLang, t } = useLang();

  const isBlueNightTheme = themeId === "blueNight";
  const PAGE_BG = isBlueNightTheme
    ? "radial-gradient(900px 520px at 50% -14%, rgba(34,230,255,0.14), transparent 62%), radial-gradient(680px 360px at 0% 28%, rgba(122,247,255,0.08), transparent 62%), #06111F"
    : LEGACY_PAGE_BG;
  const CARD_BG = isBlueNightTheme
    ? "linear-gradient(180deg, rgba(15,34,55,0.96), rgba(6,17,31,0.98))"
    : LEGACY_CARD_BG;

  const [tab, setTab] = React.useState<SettingsTab>("menu");
  const [nasBusy, setNasBusy] = React.useState<null | "backup" | "restore">(null);
  const [nasStatus, setNasStatus] = React.useState<string>("");
  const [nasLastInfo, setNasLastInfo] = React.useState<any>(null);

  React.useEffect(() => {
    injectSettingsAnimationsOnce();
  }, []);

  async function handleFullReset() {
    const ok = window.confirm(
      "⚠️ RÉINITIALISATION COMPLÈTE ⚠️\n\n" +
        "Cette action va effacer TOUTES les données locales de MULTISPORTS SCORING sur cet appareil :\n" +
        "- Profils locaux & BOTS\n" +
        "- Stats & historique de parties\n" +
        "- Réglages, thèmes, langue…\n\n" +
        "Action définitive. Continuer ?"
    );
    if (!ok) return;
    await fullHardReset();
  }

  function formatBytes(value: any): string {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "0 Ko";
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / 1024 / 1024).toFixed(2)} Mo`;
  }

  function formatMs(value: any): string {
    const n = Math.max(0, Number(value || 0));
    if (n < 1000) return `${Math.round(n)} ms`;
    return `${(n / 1000).toFixed(2)} s`;
  }

  function getNasReportLines(kind: "backup" | "restore", summary: any, res?: any): string[] {
    const media = summary?.media || res?.summary?.media || {};
    const before = summary?.before || {};
    const lines: string[] = [];
    lines.push(kind === "backup" ? "✅ Synchronisation NAS terminée" : "✅ Rechargement NAS terminé");
    lines.push(`Profils locaux : ${summary?.profiles ?? 0}`);
    lines.push(`Bots CPU : ${summary?.bots ?? 0}`);
    lines.push(`Dartsets : ${summary?.dartSets ?? 0}`);
    lines.push(`Historique : ${summary?.history ?? 0}`);
    if (kind === "backup") {
      const createdNow = Math.max(0, Number(summary?.profiles || 0) - Number(before?.totalProfiles || before?.profiles || 0));
      lines.push(`Nouveaux profils détectés : ${createdNow}`);
      lines.push(`Avatars uploadés : ${Number(media?.avatarsUploaded || 0)}`);
      lines.push(`Avatars déjà présents NAS : ${Number(media?.avatarsAlreadyPresent || 0)}`);
      lines.push(`Avatars déjà liés : ${Number(media?.avatarsAlreadyLinked || 0)}`);
      lines.push(`Avatars sans image : ${Number(media?.avatarsMissing || 0)}`);
      lines.push(`Médias dartsets uploadés : ${Number(media?.mediaUploaded || 0)}`);
      lines.push(`Médias dartsets déjà présents : ${Number(media?.mediaAlreadyPresent || 0)}`);
      lines.push(`Base64 supprimés : ${Number(summary?.base64FieldsRemoved ?? media?.base64FieldsRemoved ?? 0)}`);
      lines.push(`Base64 restants dans snapshot : ${Number(summary?.base64FieldsAfter ?? summary?.dataImageFields ?? 0)}`);
      lines.push(`Snapshot allégé : ${summary?.snapshotLightened ? "oui" : "à vérifier"}`);
      lines.push(`Taille payload envoyé : ${formatBytes(summary?.payloadBytes || summary?.storeBytes)}`);
      lines.push(`Durée : ${formatMs(summary?.durationMs || media?.durationMs)}`);
    } else {
      lines.push(`Images NAS résolues : ${Number(summary?.mediaUrls || 0)}`);
      lines.push(`Base64 présents après recharge : ${Number(summary?.dataImageFields || 0)}`);
      lines.push(`Taille store local : ${formatBytes(summary?.storeBytes)}`);
    }
    const updatedAt = res?.updatedAt || res?.updated_at || res?.createdAt || "";
    if (updatedAt) lines.push(`MAJ NAS : ${String(updatedAt)}`);
    return lines;
  }

  function formatNasReport(kind: "backup" | "restore", summary: any, res?: any): string {
    return getNasReportLines(kind, summary, res).join("\n");
  }

  function ThemeSection() {
    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18, color: theme.primary }}>
          {t("settings.theme", "Thème")}
        </h2>

        <div
          style={{
            marginTop: 12,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          ⚡ {t("settings.theme.group.neons", "Néons classiques")}
        </div>
        <div
          className="dc-scroll-thin"
          style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {NEONS.map((id) => {
              const meta = THEME_META[id];
              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={t(`settings.theme.${id}.label`, meta.defaultLabel)}
                  desc={t(`settings.theme.${id}.desc`, meta.defaultDesc)}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          🎨 {t("settings.theme.group.soft", "Couleurs douces")}
        </div>
        <div
          className="dc-scroll-thin"
          style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {SOFTS.map((id) => {
              const meta = THEME_META[id];
              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={t(`settings.theme.${id}.label`, meta.defaultLabel)}
                  desc={t(`settings.theme.${id}.desc`, meta.defaultDesc)}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          🌑 {t("settings.theme.group.dark", "Thèmes Dark Premium")}
        </div>
        <div
          className="dc-scroll-thin"
          style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {DARKS.map((id) => {
              const meta = THEME_META[id];
              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={t(`settings.theme.${id}.label`, meta.defaultLabel)}
                  desc={t(`settings.theme.${id}.desc`, meta.defaultDesc)}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function LangSection() {
    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 6, fontSize: 18, color: theme.primary }}>
          {t("settings.lang", "Langue")}
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {LANG_CHOICES.map((opt) => (
            <LanguageChoiceButton
              key={opt.id}
              id={opt.id}
              label={t(`lang.${opt.id}`, opt.defaultLabel)}
              active={opt.id === lang}
              onClick={() => setLang(opt.id)}
              primary={theme.primary}
            />
          ))}
        </div>
      </section>
    );
  }

  function GeneralSection() {
    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.reset.title", "Réinitialiser l’application")}
        </h2>

        <p style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10, lineHeight: 1.4 }}>
          {t(
            "settings.reset.subtitle",
            "Efface tous les profils locaux, BOTS, stats, historique de parties et réglages. Action définitive."
          )}
        </p>

        <button
          type="button"
          onClick={handleFullReset}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "7px 12px",
            border: "1px solid rgba(255,120,120,0.8)",
            background: "linear-gradient(90deg, rgba(255,80,80,0.95), rgba(255,170,120,0.95))",
            color: "#120808",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            boxShadow: "0 0 18px rgba(255,80,80,0.65)",
            cursor: "pointer",
          }}
        >
          {t("settings.reset.button", "Tout réinitialiser")}
        </button>
      </section>
    );
  }

  function NasBackupSection() {
    const btnBase: React.CSSProperties = {
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    };

    async function handleBackup() {
      setNasBusy("backup");
      setNasStatus("⏳ Synchronisation NAS en cours...");
      setNasLastInfo(null);
      try {
        const res = await pushNasAccountSnapshot();
        const summary = await computeNasSyncSummary(res);
        setNasLastInfo({ ...(res ?? {}), summary });
        const msg = formatNasReport("backup", summary, res);
        setNasStatus(msg);
        safeAlert(msg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const finalMsg = `❌ Synchronisation NAS impossible : ${msg}`;
        setNasStatus(finalMsg);
        safeAlert(finalMsg);
      } finally {
        setNasBusy(null);
      }
    }

    async function handleRestore() {
      const ok = window.confirm(
        "Recharger le snapshot du NAS sur cet appareil ?\n\n" +
          "Cette action remplace l’état local importé par le snapshot du compte."
      );
      if (!ok) return;

      setNasBusy("restore");
      setNasStatus("⏳ Rechargement NAS en cours...");
      setNasLastInfo(null);
      try {
        const res = await pullNasAccountSnapshot();
        const summary = await computeNasSyncSummary(res);
        setNasLastInfo({ ...(res ?? {}), summary });
        const msg = formatNasReport("restore", summary, res);
        setNasStatus(msg);
        safeAlert(msg);
        // Après import manuel NAS, on recharge pour que tous les écrans relisent
        // le store IndexedDB fraîchement remplacé/hydraté.
        try { window.location.reload(); } catch {}
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const finalMsg = `❌ Rechargement NAS impossible : ${msg}`;
        setNasStatus(finalMsg);
        safeAlert(finalMsg);
      } finally {
        setNasBusy(null);
      }
    }

    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.nas.title", "Backup NAS")}
        </h2>

        <p style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10, lineHeight: 1.45 }}>
          {t(
            "settings.nas.subtitle",
            "Créer une sauvegarde NAS du compte ou charger la dernière sauvegarde NAS. Les outils techniques avancés sont dans le mode Développeur."
          )}
        </p>

        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.22)",
            marginBottom: 12,
            fontSize: 11,
            color: theme.textSoft,
            wordBreak: "break-all",
          }}
        >
          <div style={{ fontWeight: 800, color: theme.text, marginBottom: 4 }}>API NAS</div>
          <div>{getApiUrl()}</div>
        </div>

        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(255,255,255,0.03)",
            marginBottom: 12,
            fontSize: 11,
            color: theme.text,
          }}
        >
          {(() => { const s = getNasSyncState(); return s.dirty ? `⚠️ Modifications locales non synchronisées${s.reason ? ` (${s.reason})` : ""}` : "✅ Aucune modification locale en attente"; })()}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={handleBackup}
            disabled={nasBusy !== null}
            style={{
              ...btnBase,
              border: `1px solid ${theme.primary}`,
              background: "rgba(0,0,0,0.35)",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}22`,
              opacity: nasBusy ? 0.7 : 1,
            }}
          >
            {nasBusy === "backup" ? "Création..." : "Créer sauvegarde NAS"}
          </button>

          <button
            type="button"
            onClick={handleRestore}
            disabled={nasBusy !== null}
            style={{
              ...btnBase,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.04)",
              color: theme.text,
              opacity: nasBusy ? 0.7 : 1,
            }}
          >
            {nasBusy === "restore" ? "Chargement..." : "Charger sauvegarde NAS"}
          </button>
        </div>

        {nasStatus ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.03)",
              color: theme.text,
              fontSize: 12,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            {nasStatus}
          </div>
        ) : null}

        {nasLastInfo ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.textSoft,
              fontSize: 11,
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          >
            <div style={{ color: theme.text, fontWeight: 900, marginBottom: 6 }}>Détail technique</div>
            {nasLastInfo?.summary ? (
              <div style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
                {getNasReportLines("backup", nasLastInfo.summary, nasLastInfo).slice(1).join("\n")}
              </div>
            ) : null}
            <details>
              <summary style={{ cursor: "pointer", color: theme.primary, fontWeight: 800 }}>Voir la réponse API brute</summary>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(nasLastInfo, null, 2)}</div>
            </details>
          </div>
        ) : null}
      </section>
    );
  }

  function DiagnosticsSection() {
    const [tick, setTick] = React.useState(0);
    const [report, setReport] = React.useState<any>(null);

    React.useEffect(() => {
      const id = window.setInterval(() => setTick((v) => v + 1), 2000);
      return () => window.clearInterval(id);
    }, []);

    const memoryDiag = safeReadJson<any>("dc_memory_diag_v1");
    const storeDiag = safeReadJson<any>("dc_last_store_size_v1");
    const storeWarn = safeReadJson<any>("dc_store_size_warning");
    const memWarn = safeReadJson<any>("dc_last_memory_warning_v1");
    const runtimeErr = safeReadJson<any>("dc_last_runtime_error_v1");
    const chunkErr = safeReadJson<any>("dc_last_chunk_error_v1");
    const lastCrash = getLastCrashReport();
    const crashLog = getCrashLog();

    const rowStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      gap: 8,
      alignItems: "start",
      padding: "8px 0",
      borderBottom: `1px solid ${theme.borderSoft}`,
    };

    const monoBox: React.CSSProperties = {
      marginTop: 8,
      padding: 10,
      borderRadius: 12,
      border: `1px solid ${theme.borderSoft}`,
      background: "rgba(0,0,0,0.28)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 11,
      lineHeight: 1.4,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      color: theme.textSoft,
    };

    const snapshotReport = {
      memoryDiag,
      storeDiag,
      storeWarn,
      memWarn,
      runtimeErr,
      chunkErr,
      lastCrash,
      crashLog,
      href: (() => {
        try { return location.href; } catch { return ""; }
      })(),
      tick,
    };

    async function runDiagnostic() {
      try {
        const r = await generateDiagnostic();
        setReport(r);
      } catch (e: any) {
        safeAlert(`Diagnostic impossible: ${e?.message || e || "erreur inconnue"}`);
      }
    }

    const copyReport = async () => {
      const txt = JSON.stringify({ snapshot: snapshotReport, pro: report }, null, 2);
      try {
        await navigator.clipboard.writeText(txt);
        safeAlert("Diagnostic copié.");
      } catch {
        safeAlert(txt);
      }
    };

    const clearDiag = () => {
      const keys = [
        "dc_memory_diag_v1",
        "dc_last_store_size_v1",
        "dc_store_size_warning",
        "dc_last_memory_warning_v1",
        "dc_last_runtime_error_v1",
        "dc_last_chunk_error_v1",
        "dc_last_promise_error_v1",
        "dc_diag_routes_v2",
        "dc_diag_render_v2",
        "dc_diag_memory_samples_v2",
        "dc_diag_events_v2",
        "dc_diag_session_v2",
        "dc_diag_last_snapshot_v2",
        "dc_diag_longtasks_v2",
        "dc_last_crash_report_v2",
        "dc_crash_log_v2",
      ];
      for (const k of keys) {
        try { localStorage.removeItem(k); } catch {}
      }
      setTick((v) => v + 1);
    };

    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.diagnostics.title", "Diagnostic mémoire / crash")}
        </h2>

        <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.45, marginBottom: 10 }}>
          {t(
            "settings.diagnostics.help",
            "Ces informations servent à identifier les crashs PWA / mémoire sur mobile et les erreurs de chargement."
          )}
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>MEM</div>
          <div style={{ color: theme.text }}>{memoryDiag ? `${memoryDiag.usedMB ?? "?"} / ${memoryDiag.limitMB ?? "?"} MB` : "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>STORE</div>
          <div style={{ color: theme.text }}>{storeDiag?.mb != null ? `${storeDiag.mb} MB` : "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>Route</div>
          <div style={{ color: theme.text }}>{memoryDiag?.route || "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>Dernier relevé</div>
          <div style={{ color: theme.text }}>{fmtDateTime(memoryDiag?.at)}</div>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" onClick={() => setTick((v) => v + 1)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: theme.text, fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.refresh", "Rafraîchir")}
          </button>
          <button type="button" onClick={runDiagnostic} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, padding: "8px 12px", background: "rgba(0,0,0,0.35)", color: theme.primary, fontWeight: 900, cursor: "pointer", boxShadow: `0 0 10px ${theme.primary}22` }}>
            Analyser
          </button>
          <button type="button" onClick={() => exportDiagnostic(report)} disabled={!report} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, padding: "8px 12px", background: report ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.04)", color: report ? theme.primary : theme.textSoft, fontWeight: 900, cursor: report ? "pointer" : "not-allowed", boxShadow: report ? `0 0 10px ${theme.primary}22` : "none", opacity: report ? 1 : 0.7 }}>
            Exporter rapport
          </button>
          <button type="button" onClick={copyReport} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: theme.text, fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.copy", "Copier le diagnostic")}
          </button>
          <button type="button" onClick={clearDiag} style={{ borderRadius: 12, border: `1px solid rgba(255,120,120,0.45)`, padding: "8px 12px", background: "rgba(90,0,0,0.22)", color: "#ffb7b7", fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.clear", "Vider les logs")}
          </button>
        </div>

        {report ? (
          <div style={monoBox}>
            <div><strong>Rapport diagnostic ultra</strong></div>
            <div>Cause probable: {Array.isArray(report?.probableCause) ? report.probableCause.join(" / ") : report?.probableCause || "—"}</div>
            <div>Render count: {report?.app?.renderCount ?? "—"} — rate: {report?.app?.renderRatePerMin ?? "—"}/min</div>
            <div>Mémoire: {report?.memory?.jsHeap?.usedMB ?? "—"} / {report?.memory?.jsHeap?.limitMB ?? "—"} MB</div>
            <div>Timers: timeouts={report?.timers?.activeTimeouts ?? "—"} / intervals={report?.timers?.activeIntervals ?? "—"}</div>
            <div>Listeners actifs: {report?.listeners?.totalActive ?? "—"}</div>
            <div>Réseau: slow={report?.network?.slowCount ?? "—"} / failed={report?.network?.failedCount ?? "—"}</div>
            <div>Images lourdes: {report?.images?.heavyCount ?? "—"}</div>
            <div>Top renders: {Array.isArray(report?.react?.byComponent) ? report.react.byComponent.slice(0,3).map((x:any)=>`${x.component}:${x.count}`).join(" | ") : "—"}</div>
            <div>Routes suivies: {Array.isArray(report?.routes) ? report.routes.join(" | ") : "—"}</div>
          </div>
        ) : null}

        <div style={monoBox}>
          <div><strong>Warning mémoire</strong>: {memWarn ? fmtDateTime(memWarn.at) : "—"}</div>
          <div>{memWarn ? `used=${memWarn.usedMB} MB / limit=${memWarn.limitMB} MB / route=${memWarn.route || "—"}` : "Aucun"}</div>
        </div>

        <div style={monoBox}>
          <div><strong>Warning store</strong>: {storeWarn ? fmtDateTime(storeWarn.at) : "—"}</div>
          <div>{storeWarn ? `size=${storeWarn.mb} MB / reason=${storeWarn.reason || "—"}` : "Aucun"}</div>
        </div>

        <div style={monoBox}>
          <div><strong>Dernière erreur runtime</strong>: {runtimeErr ? fmtDateTime(runtimeErr.at) : "—"}</div>
          <div>{runtimeErr ? `${runtimeErr.type || "error"} — ${runtimeErr.message || ""}` : "Aucune"}</div>
          {runtimeErr?.href ? <div>URL: {runtimeErr.href}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Dernière erreur chunk</strong>: {chunkErr ? fmtDateTime(chunkErr.at) : "—"}</div>
          <div>{chunkErr ? `${chunkErr.message || ""}` : "Aucune"}</div>
          {chunkErr?.href ? <div>URL: {chunkErr.href}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Dernier crash capturé</strong>: {lastCrash ? fmtDateTime(lastCrash.at) : "—"}</div>
          <div>{lastCrash ? `${lastCrash.kind || "crash"} — ${lastCrash.message || ""}` : "Aucun"}</div>
          {lastCrash?.context?.route ? <div>Route: {lastCrash.context.route}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Historique des crashs</strong>: {Array.isArray(crashLog) ? crashLog.length : 0}</div>
          <div>Les derniers crashs restent en mémoire après redémarrage.</div>
          {Array.isArray(crashLog) && crashLog.length ? (
            <div style={{ marginTop: 8 }}>
              {crashLog.slice(0, 5).map((c: any, i: number) => (
                <div key={c?.id || i} style={{ padding: "4px 0", borderBottom: `1px solid ${theme.borderSoft}` }}>
                  <strong>{fmtDateTime(c?.at)}</strong> — {c?.kind || "crash"} — {c?.message || ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }


  function DeveloperSection() {
    type DevSub = "menu" | "diagnostics" | "tests" | "onlineCleanup" | "nas" | "logs" | "security";
    const [devSub, setDevSub] = React.useState<DevSub>("menu");

    const box: React.CSSProperties = {
      background: CARD_BG,
      borderRadius: 18,
      border: `1px solid ${theme.borderSoft}`,
      padding: 16,
      marginBottom: 16,
    };

    if (devSub !== "menu") {
      const titles: Record<DevSub, string> = {
        menu: "Développeur",
        diagnostics: "Diagnostic",
        tests: "Tests & simulations",
        onlineCleanup: "Nettoyage Online",
        nas: "Push / Pull NAS",
        logs: "Logs techniques",
        security: "Sécurité technique",
      };

      return (
        <div>
          <button
            type="button"
            onClick={() => setDevSub("menu")}
            style={{
              border: "none",
              background: "transparent",
              color: theme.textSoft,
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
              marginBottom: 10,
            }}
          >
            ← Retour développeur
          </button>

          <section style={box}>
            <div style={{ fontSize: 16, fontWeight: 950, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {titles[devSub]}
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: theme.textSoft, lineHeight: 1.35 }}>
              Zone réservée aux tests, diagnostics et actions techniques NAS. Les anciennes références Supabase/configurations obsolètes ne sont pas affichées ici.
            </div>
          </section>

          {devSub === "diagnostics" && <DiagnosticsSection />}
          {devSub === "tests" && <DevModeBlock go={go} />}
          {devSub === "onlineCleanup" && <OnlineStatsCleanupPanel />}
          {devSub === "nas" && <AccountToolsPanel go={go} />}
          {devSub === "logs" && <AccountToolsPanel go={go} />}
          {devSub === "security" && <AccountToolsPanel go={go} />}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <section style={box}>
          <div style={{ fontSize: 16, fontWeight: 950, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Mode développeur
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft, lineHeight: 1.4 }}>
            Tous les outils techniques sont regroupés ici : diagnostic, simulations, push/pull NAS, logs et sécurité. La page Réglages reste propre pour l’usage normal.
          </div>
        </section>

        <SettingsMenuCard title="Diagnostic" subtitle="Mémoire, store, routes, warnings, erreurs runtime et crashs capturés." theme={theme} onClick={() => setDevSub("diagnostics")} />
        <SettingsMenuCard title="Tests & simulations" subtitle="Déverrouillage DEV, simulation offline/online et création de parties fictives tous jeux." theme={theme} onClick={() => setDevSub("tests")} />
        <SettingsMenuCard title="Nettoyage Online" subtitle="Exclure/restaurer les sessions de test pour que Stats Online, X01Compare et Classements Online restent propres." theme={theme} onClick={() => setDevSub("onlineCleanup")} />
        <SettingsMenuCard title="Push / Pull NAS" subtitle="Actions techniques de synchronisation, comparaison local/cloud et refresh session." theme={theme} onClick={() => setDevSub("nas")} />
        <SettingsMenuCard title="Logs" subtitle="Réponses API, état session, snapshots locaux/cloud et exports de debug." theme={theme} onClick={() => setDevSub("logs")} />
        <SettingsMenuCard title="Sécurité technique" subtitle="Session, logout, purge locale, merge et outils compte réservés au debug." theme={theme} onClick={() => setDevSub("security")} />
      </div>
    );
  }

  function SportSection() {
    type GameId =
      | "darts"
      | "petanque"
      | "pingpong"
      | "babyfoot"
      | "archery"
      | "molkky"
      | "padel"
      | "pickleball"
      | "frisbee"
      | "billard"
      | "badminton"
      | "basket"
      | "cornhole"
      | "dicegame"
      | "foot"
      | "rugby"
      | "volley"
      | "tennis"
      | "chess";

    const GAMES: { id: GameId; label: string; logo: string }[] = [
      // ✅ DISPONIBLES
      { id: "darts", label: "Fléchettes", logo: logoDarts },
      { id: "petanque", label: "Pétanque", logo: logoPetanque },
      { id: "pingpong", label: "Ping-Pong", logo: logoPingPong },
      { id: "babyfoot", label: "Babyfoot", logo: logoBabyFoot },
      { id: "molkky", label: "Mölkky", logo: logoMolkky },

      // ⏳ SOON
      { id: "archery", label: "Tir à l'arc", logo: logoArchery },
      { id: "badminton", label: "Badminton", logo: logoBadminton },
      { id: "basket", label: "Basket", logo: logoBasket },
      { id: "billard", label: "Billard", logo: logoBillard },
      { id: "chess", label: "Échecs", logo: logoChess },
      { id: "cornhole", label: "Cornhole", logo: logoCornhole },
      { id: "dicegame", label: "Dice Game", logo: logoDiceGame },
      { id: "foot", label: "Foot", logo: logoFoot },
      { id: "frisbee", label: "Frisbee", logo: logoFrisbee },
      // (molkky est désormais activé)
      { id: "padel", label: "Padel", logo: logoPadel },
      { id: "pickleball", label: "Pickleball", logo: logoPickleball },
      { id: "rugby", label: "Rugby", logo: logoRugby },
      { id: "tennis", label: "Tennis", logo: logoTennis },
      { id: "volley", label: "Volley", logo: logoVolley },
    ];

    // ✅ Jeux réellement disponibles
    const ENABLED: Record<GameId, boolean> = {
      darts: true,
      petanque: true,
      pingpong: true,
      babyfoot: true,

      // ⏳ SOON
      archery: false,
      molkky: true,
      padel: false,
      pickleball: false,
      frisbee: false,
      billard: false,
      badminton: false,
      basket: false,
      cornhole: false,
      dicegame: true,
      foot: false,
      rugby: false,
      volley: false,
      tennis: false,
      chess: false,
    };

    // ✅ Tri demandé: disponibles d'abord, puis SOON (grisés), ordre alphabétique FR
    const sortedGames = React.useMemo(() => {
      const copy = [...GAMES];
      copy.sort((a, b) => a.label.localeCompare(b.label, "fr"));
      copy.sort((a, b) => Number(!!ENABLED[b.id]) - Number(!!ENABLED[a.id]));
      return copy;
    }, []);

    const onPick = (id: GameId) => {
      try {
        localStorage.setItem(START_GAME_KEY, id);
      } catch {}

      try {
        window.dispatchEvent(new CustomEvent("dc:sport-change", { detail: { sport: id } }));
      } catch {}

      if (!go) return;
      go("home");
    };

    const onReset = () => {
      try {
        localStorage.removeItem(START_GAME_KEY);
      } catch {}
      alert("Choix réinitialisé. Au prochain lancement, le hub de sélection réapparaîtra.");
    };

    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 6, fontSize: 18, color: theme.primary }}>
          {t("settings.sport.title", "Choix de sport")}
        </h2>

        <p className="subtitle" style={{ fontSize: 12, color: theme.textSoft, marginBottom: 12, lineHeight: 1.4 }}>
          {t("settings.sport.subtitle.short", "Sélectionne le jeu à utiliser au démarrage.")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {sortedGames.map((g) => {
            const enabled = !!ENABLED[g.id];

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  if (!enabled) return;
                  onPick(g.id);
                }}
                disabled={!enabled}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  cursor: enabled ? "pointer" : "not-allowed",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: enabled ? `0 0 18px ${theme.primary}12` : "none",
                  opacity: enabled ? 1 : 0.35,
                  filter: enabled ? "none" : "grayscale(1)",
                  position: "relative",
                }}
              >
                {!enabled && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.55)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.6,
                    }}
                  >
                    SOON
                  </div>
                )}

                <img
                  src={g.logo}
                  alt={g.label}
                  style={{
                    width: "100%",
                    maxWidth: 140,
                    height: 90,
                    objectFit: "contain",
                    filter: enabled ? "drop-shadow(0 0 10px rgba(0,0,0,0.45))" : "none",
                  }}
                />

                <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 800, letterSpacing: 0.4 }}>
                  {g.label}
                </div>

                {!enabled && (
                  <div className="subtitle" style={{ fontSize: 10, color: theme.textSoft, opacity: 0.9 }}>
                    {t("settings.sport.comingSoon", "Bientôt disponible")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onReset}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "transparent",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {t("settings.sport.resetChoice", "Réinitialiser le choix")}
          </button>
        </div>
      </section>
    );
  }

  const headerTitle =
    tab === "menu"
      ? t("settings.title", "Réglages")
      : tab === "account"
      ? t("settings.menu.account", "Compte")
      : tab === "theme"
      ? t("settings.menu.theme", "Thème")
      : tab === "lang"
      ? t("settings.menu.lang", "Langues")
      : tab === "general"
      ? "SAUVEGARDE"
      : tab === "castViewer"
      ? "Cast / Viewer"
      : tab === "developer"
      ? t("settings.menu.developer", "Développeur")
      : t("settings.menu.sport", "Choix de sport");

  const headerSubtitle =
    tab === "menu"
      ? t("settings.subtitle", "Personnalise le thème et la langue de l’application.")
      : tab === "account"
      ? t("settings.account.subtitleV8", "V8 : l’app est toujours connectée (compte anonyme automatique).")
      : tab === "theme"
      ? t("settings.theme.subtitle", "Choisis un thème néon (accents) pour l’interface.")
      : tab === "lang"
      ? t("settings.lang.subtitle", "Choisis la langue de l’interface.")
      : tab === "sport"
      ? t("settings.sport.subtitle", "Contrôle le sport/jeu au démarrage.")
      : tab === "castViewer"
      ? "Paramètres des deux sorties écran : Google Cast TV et Viewer tablette."
      : tab === "developer"
      ? t("settings.dev.pageSubtitle", "Diagnostic, tests, logs, sécurité technique et outils NAS avancés.")
      : "Backup NAS, synchronisation et restauration du compte.";

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        paddingTop: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      <div style={{ paddingInline: 16, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => {
            if (tab !== "menu") setTab("menu");
            else go && go("home");
          }}
          style={{
            border: "none",
            background: "transparent",
            color: theme.textSoft,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          ← {t("settings.back", "Retour")}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 520, paddingInline: 18, marginInline: "auto", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.9,
                textTransform: "uppercase",
                color: theme.primary,
                fontSize: "clamp(26px, 8vw, 40px)",
                textShadow: `0 0 14px ${theme.primary}66`,
                marginBottom: 4,
              }}
            >
              {headerTitle}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35, color: theme.textSoft, maxWidth: 320 }}>
              {headerSubtitle}
            </div>
          </div>

          {false && tab === "menu" && (
            <button
              onClick={() => setTab("general")}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.primary}`,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                background: theme.card,
                color: theme.primary,
                boxShadow: `0 0 12px ${theme.primary}55`,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t("settings.quickReset", "Reset")}
            </button>
          )}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, marginInline: "auto", paddingInline: 12 }}>
        {tab === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SettingsMenuCard
              title={t("settings.menu.account", "Compte")}
              subtitle="Compte/profil regroupés, notifications locales et zone dangereuse simplifiée."
              theme={theme}
              onClick={() => setTab("account")}
            />
            <SettingsMenuCard
              title={t("settings.menu.theme", "Thème")}
              subtitle={t("settings.menu.theme.sub", "Néons classiques, couleurs douces et dark premium.")}
              theme={theme}
              onClick={() => setTab("theme")}
            />
            <SettingsMenuCard
              title={t("settings.menu.lang", "Langues")}
              subtitle={t("settings.menu.lang.sub", "Choisis la langue de l’interface (drapeaux inclus).")}
              theme={theme}
              onClick={() => setTab("lang")}
            />
            <SettingsMenuCard
              title={t("settings.menu.sport", "Choix de sport")}
              subtitle={t("settings.menu.sport.sub", "Changer de jeu, réinitialiser le choix (hub au démarrage).")}
              theme={theme}
              onClick={() => setTab("sport")}
            />

            <SettingsMenuCard
              title={t("settings.menu.castViewer", "Cast / Viewer")}
              subtitle="Ouvre la page Écrans directement sur l’onglet Réglages : Cast TV, Viewer tablette et diagnostics."
              theme={theme}
              onClick={() => go?.("cast_host", { screenTab: "settings" })}
            />

            <SettingsMenuCard
              title="SAUVEGARDE"
              subtitle="Backup NAS, synchronisation, restauration et scan des blocs valides sur une seule page."
              theme={theme}
              onClick={() => go?.("storage_vault")}
            />

            <SettingsMenuCard
              title={t("settings.menu.developer", "Développeur")}
              subtitle="Diagnostic, tests, simulations, push NAS, logs et sécurité technique."
              theme={theme}
              onClick={() => setTab("developer")}
            />

            <div style={{ height: 10 }} />
          </div>
        )}

        {tab === "account" && <AccountPages go={go} onBackToSettingsMenu={() => setTab("menu")} onFullReset={handleFullReset} />}

        {tab === "theme" && <ThemeSection />}
        {tab === "lang" && <LangSection />}
        {tab === "sport" && <SportSection />}
        {tab === "castViewer" && <CastViewerSettingsSection go={go} />}
        {tab === "developer" && <DeveloperSection />}
        {tab === "general" && <NasBackupSection />}
      </div>
    </div>
  );
}

export default Settings;
