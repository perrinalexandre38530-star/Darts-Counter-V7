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
import { pushNasAccountSnapshot, pullNasAccountSnapshot, getNasSyncState, computeNasSyncSummary } from "../lib/manualNasSync";
import { getApiUrl } from "../lib/apiClient";
import { generateDiagnostic, exportDiagnostic } from "../lib/diagnosticPro";
import { getCrashLog, getLastCrashReport } from "../lib/crashReporter";
import { simulateDevMatchesAllGames } from "../lib/devMatchSimulator";
import { useSport } from "../contexts/SportContext";

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
const SOFTS: ThemeId[] = ["blueOcean", "limeYellow", "sage", "skyBlue"];
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

const PAGE_BG = "#050712";
const CARD_BG = "rgba(8, 10, 20, 0.98)";
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

type SettingsTab = "menu" | "account" | "theme" | "lang" | "general" | "sport" | "developer";

// ---------------- Account pages (NEW simple & clean) ----------------

type AccountPage = "account_menu" | "account_notifications" | "account_danger";

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

  async function handleDeleteAccountV8() {
    const ok = window.confirm(
      "⚠️ Cette action est définitive.\n\n" +
        "Toutes tes données (profil, stats, dartsets) seront supprimées côté cloud.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteAccount();
      alert("Compte supprimé. Un nouveau compte vierge a été recréé.");
    } catch (e: any) {
      setError("Erreur suppression compte : " + (e?.message ?? e));
    } finally {
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
    if (typeof window !== "undefined") window.location.hash = "#/auth/login";
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
                    onClick={logout}
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

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme() as any;
  const { lang, setLang, t } = useLang();

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
    type DevSub = "menu" | "diagnostics" | "tests" | "nas" | "logs" | "security";
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
      ? t("settings.menu.backupNas", "Backup NAS")
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
      : tab === "developer"
      ? t("settings.dev.pageSubtitle", "Diagnostic, tests, logs, sécurité technique et outils NAS avancés.")
      : t("settings.nas.pageSubtitle", "Créer ou charger manuellement la sauvegarde NAS du compte.");

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
              title={t("settings.menu.backupNas", "Backup NAS")}
              subtitle="Créer sauvegarde NAS ou charger sauvegarde NAS. Aucun reset ici."
              theme={theme}
              onClick={() => setTab("general")}
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
        {tab === "developer" && <DeveloperSection />}
        {tab === "general" && <NasBackupSection />}
      </div>
    </div>
  );
}
