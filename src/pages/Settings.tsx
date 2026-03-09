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
import { supabase } from "../lib/supabaseClient";
import { mergeNow } from "../lib/cloudSync";

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

    try {
      await supabase.auth.signOut({ scope: "local" } as any);
    } catch {}

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

function DevModeBlock() {
  const { theme } = useTheme();
  const { t } = useLang();
  const dev = useDevMode() as any;

  const enabled: boolean = !!dev?.enabled;
  const setEnabled: (v: boolean) => void = dev?.setEnabled ?? (() => {});

  const [openTests, setOpenTests] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

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

          <div style={{ display: "grid", gap: 8 }}>
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

          <div style={{ marginTop: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
            {t(
              "settings.dev.tests.note",
              "Note : ces tests posent surtout des flags. Pour que ce soit pleinement effectif, lis FORCE_OFFLINE_KEY dans tes modules réseau/sync."
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------- Composant principal ----------------

type SettingsTab = "menu" | "account" | "theme" | "lang" | "general" | "sport" | "diagnostics";

// ---------------- Account pages (NEW simple & clean) ----------------

type AccountPage = "account_menu" | "account_profile" | "account_notifications" | "account_security" | "account_danger";

function AccountPages({
  go,
  onBackToSettingsMenu,
}: {
  go?: (tab: any, params?: any) => void;
  onBackToSettingsMenu: () => void;
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

  return (
    <div>
      {/* Bandeau "résumé" toujours visible */}
      <section style={sectionBox}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: theme.primary,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {t("settings.account.titleShort", "Compte")}
            </div>
            <div className="subtitle" style={{ fontSize: 12, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
              {t("settings.account.subtitleV8", "V8 : l’app est toujours connectée (compte anonyme automatique).")}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
              <span style={{ fontWeight: 800, color: "#fff" }}>{accountStatusHint}</span>{" "}
              <span style={{ opacity: 0.9 }}>
                ({emailLabel} {userIdLabel})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToSettingsMenu}
            style={{
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Retour au menu Réglages"
          >
            ✕
          </button>
        </div>
      </section>

      {/* MENU COMPTE */}
      {page === "account_menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SettingsMenuCard
            title={t("settings.account.menu.profile", "Profil")}
            subtitle={t("settings.account.menu.profile.sub", "Pseudo, pays, informations visibles en ligne.")}
            theme={theme}
            onClick={() => setPage("account_profile")}
          />
          <SettingsMenuCard
            title={t("settings.account.menu.notifications", "Notifications")}
            subtitle={t("settings.account.menu.notifications.sub", "Emails & notifications dans l’app.")}
            theme={theme}
            onClick={() => setPage("account_notifications")}
          />
          <SettingsMenuCard
            title={t("settings.account.menu.security", "Sécurité")}
            subtitle={t("settings.account.menu.security.sub", "Etat de session, actions debug, etc.")}
            theme={theme}
            onClick={() => setPage("account_security")}
          />
          <SettingsMenuCard
            title={t("settings.account.menu.danger", "Zone dangereuse")}
            subtitle={t("settings.account.menu.danger.sub", "Suppression définitive du compte cloud.")}
            theme={theme}
            onClick={() => setPage("account_danger")}
            rightHint="!"
          />
        </div>
      )}

      {/* PROFIL */}
      {page === "account_profile" && (
        <section style={sectionBox}>
          {miniBack}

          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18, color: theme.primary }}>
            {t("settings.account.profile.title", "Profil")}
          </h2>

          {!isSignedIn ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: theme.textSoft, fontSize: 12 }}>
                {t(
                  "settings.account.profile.signedOut",
                  "Tu n'es pas connecté. Connecte-toi pour synchroniser ton profil (compte unique)."
                )}
              </div>
              <button className="btn" style={{ width: "100%" }} onClick={() => go && go("auth_start" as any)}>
                {t("settings.account.profile.cta", "Connexion")}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, marginTop: 6, marginBottom: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  <span style={{ color: theme.textSoft }}>{t("settings.account.email", "Email (optionnel)")}</span>
                  <input className="input" value={emailLabel} disabled style={{ opacity: 0.7 }} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  <span style={{ color: theme.textSoft }}>
                    {t("settings.account.displayName", "Pseudo en ligne (display name)")}
                  </span>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  <span style={{ color: theme.textSoft }}>{t("settings.account.country", "Pays (optionnel)")}</span>
                  <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
                </label>
              </div>

              {message && (
                <div className="subtitle" style={{ color: "#5ad57a", fontSize: 11, marginBottom: 6 }}>
                  {message}
                </div>
              )}
              {error && (
                <div className="subtitle" style={{ color: "#ff6666", fontSize: 11, marginBottom: 6 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile || loading || deleting}
                  style={{
                    flex: "1 1 220px",
                    minHeight: 44,
                    borderRadius: 999,
                    padding: "10px 12px",
                    border: "none",
                    background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                    color: "#000",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: savingProfile || loading || deleting ? 0.65 : 1,
                    boxShadow: `0 0 18px ${theme.primary}44`,
                  }}
                >
                  {savingProfile
                    ? t("settings.account.save.loading", "Enregistrement…")
                    : t("settings.account.save.btn", "Enregistrer")}
                </button>

                <button
                  type="button"
                  onClick={() => logout?.()}
                  disabled={loading || deleting || savingProfile}
                  style={{
                    flex: "1 1 220px",
                    minHeight: 44,
                    borderRadius: 999,
                    padding: "10px 12px",
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: loading || deleting || savingProfile ? "default" : "pointer",
                    opacity: loading || deleting || savingProfile ? 0.65 : 1,
                  }}
                >
                  {t("settings.account.btn.logout", "Se déconnecter")}
                </button>
              </div>
            </>
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
            {t("settings.account.notifications.subtitle", "Choisis les mails et notifications que tu souhaites recevoir.")}
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

      {/* SÉCURITÉ / ACTIONS */}
      {page === "account_security" && (
        <section style={sectionBox}>
          {miniBack}

          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18, color: theme.primary }}>
            {t("settings.account.security.title", "Sécurité")}
          </h2>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.3)",
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            <div style={{ marginBottom: 6, fontWeight: 900 }}>{t("settings.account.status", "Statut du compte")}</div>

            {status === "signed_in" ? (
              <>
                <div style={{ color: theme.textSoft }}>
                  {t("settings.account.connectedAsV8", "Session active")}{" "}
                  <span style={{ opacity: 0.9 }}>
                    ({emailLabel} {userIdLabel})
                  </span>
                </div>
                <div className="subtitle" style={{ fontSize: 11, color: theme.textSoft, marginTop: 6 }}>
                  {t(
                    "settings.account.connectedHintV8",
                    "Cette session est créée automatiquement. La sync cloud fonctionne via user_store."
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: theme.textSoft }}>
                {t("settings.account.notConnectedV8", "Session indisponible (rare). Rafraîchis la page.")}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => logout?.()}
              disabled={loading}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
                opacity: loading ? 0.6 : 1,
                flex: "1 1 180px",
              }}
            >
              {t("settings.account.btn.logout", "Se déconnecter")}
            </button>

            <button
              type="button"
              onClick={async () => {
                if (merging) return;
                setMergeMsg(null);
                setError(null);
                setMessage(null);
                setMerging(true);
                try {
                  await mergeNow({ source: "manual" } as any);
                  setMergeMsg(t("settings.account.merge.ok", "Fusion terminée : local + cloud"));
                } catch (e: any) {
                  setMergeMsg(null);
                  setError(e?.message ?? String(e));
                  safeAlert(`Fusion échouée : ${e?.message ?? e}`);
                } finally {
                  setMerging(false);
                }
              }}
              disabled={loading || !isSignedIn || merging}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.primary}66`,
                padding: "10px 12px",
                background: "rgba(0,0,0,0.35)",
                color: theme.primary,
                fontWeight: 900,
                cursor: !isSignedIn || loading || merging ? "not-allowed" : "pointer",
                boxShadow: `0 0 14px ${theme.primary}22`,
                flex: "1 1 220px",
                opacity: !isSignedIn || loading || merging ? 0.55 : 1,
              }}
              title={t(
                "settings.account.merge.tip",
                "Fusionne tes données locales avec ton compte cloud (anti-perte). Recommandé après première connexion sur un appareil."
              )}
            >
              {merging ? t("settings.account.merge.busy", "Fusion…") : t("settings.account.merge", "Fusionner local + cloud")}
            </button>

            <button
              type="button"
              onClick={() => go?.("gameSelect")}
              disabled={!go}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.primary}66`,
                padding: "10px 12px",
                background: "rgba(0,0,0,0.45)",
                color: theme.primary,
                fontWeight: 900,
                cursor: go ? "pointer" : "not-allowed",
                boxShadow: `0 0 14px ${theme.primary}22`,
                flex: "1 1 180px",
              }}
              title="Aller au hub de sélection"
            >
              {t("settings.account.btn.changeGame", "Changer de jeu")}
            </button>
          </div>

          {(mergeMsg || error) && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${error ? "rgba(255,0,0,0.35)" : theme.borderSoft}`,
                background: error ? "rgba(255,0,0,0.08)" : "rgba(255,255,255,0.05)",
                color: error ? "rgba(255,140,140,0.95)" : theme.text,
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {error ? `Erreur : ${error}` : mergeMsg}
            </div>
          )}

          {/* ✅ OUTILS COMPTE — SYNC EXPRESS */}
          <div style={{ marginTop: 14 }}>
            <AccountToolsPanel go={go} />
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

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid rgba(255,0,0,0.35)",
              background: "rgba(255,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8, color: "#ff8a8a" }}>
              {t("settings.account.delete.title", "Supprimer mon compte définitivement")}
            </div>

            <p
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: 11,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.35,
              }}
            >
              {t(
                "settings.account.deleteHintV8",
                "Cette action supprime le compte cloud (profiles + user_store + auth). L’app recrée automatiquement un nouveau compte anonyme (V8)."
              )}
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
                padding: "14px 16px",
                borderRadius: 12,
                background: "linear-gradient(180deg, #ff5c5c, #c92a2a)",
                color: "#fff",
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 0 18px rgba(255,80,80,0.45)",
              }}
            >
              🗑️ {deleting ? "Suppression…" : "Supprimer mon compte"}
            </button>
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

  function DiagnosticsSection() {
    const [tick, setTick] = React.useState(0);

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

    const report = {
      memoryDiag,
      storeDiag,
      storeWarn,
      memWarn,
      runtimeErr,
      chunkErr,
      href: (() => {
        try { return location.href; } catch { return ""; }
      })(),
      tick,
    };

    const copyReport = async () => {
      const txt = JSON.stringify(report, null, 2);
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
          <button type="button" onClick={copyReport} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, padding: "8px 12px", background: "rgba(0,0,0,0.35)", color: theme.primary, fontWeight: 900, cursor: "pointer", boxShadow: `0 0 10px ${theme.primary}22` }}>
            {t("settings.diagnostics.copy", "Copier le diagnostic")}
          </button>
          <button type="button" onClick={clearDiag} style={{ borderRadius: 12, border: `1px solid rgba(255,120,120,0.45)`, padding: "8px 12px", background: "rgba(90,0,0,0.22)", color: "#ffb7b7", fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.clear", "Vider les logs")}
          </button>
        </div>

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
      </section>
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
      ? t("settings.menu.general", "Réglages")
      : tab === "diagnostics"
      ? t("settings.menu.diagnostics", "Diagnostic")
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
      : tab === "diagnostics"
      ? t("settings.diagnostics.subtitle", "Mémoire, taille du store et derniers incidents capturés.")
      : t("settings.reset.subtitle", "Efface les données locales de l’application sur cet appareil.");

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

          {tab === "menu" && (
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
              subtitle={t("settings.menu.account.sub", "Profil, notifications, sécurité et suppression du compte.")}
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
              title={t("settings.menu.diagnostics", "Diagnostic")}
              subtitle={t("settings.menu.diagnostics.sub", "Mémoire, store, route active, derniers warnings et erreurs capturées.")}
              theme={theme}
              onClick={() => setTab("diagnostics")}
            />

            <SettingsMenuCard
              title={t("settings.menu.cast", "Caster sur un écran")}
              subtitle={t("settings.menu.cast.sub", "Diffuser un scoreboard sur TV / PC / tablette (code de room).")}
              theme={theme}
              onClick={() => go("cast_host" as any)}
            />
            <SettingsMenuCard
              title={t("settings.menu.general", "Réinitialiser")}
              subtitle={t("settings.menu.general.sub", "Effacer les données locales (hard reset + reload).")}
              theme={theme}
              onClick={() => setTab("general")}
            />

            {/* ✅ DEV MODE BLOCK (directement dans Settings / menu) */}
            <DevModeBlock />

            <div style={{ height: 10 }} />
          </div>
        )}

        {tab === "account" && <AccountPages go={go} onBackToSettingsMenu={() => setTab("menu")} />}

        {tab === "theme" && <ThemeSection />}
        {tab === "lang" && <LangSection />}
        {tab === "sport" && <SportSection />}
        {tab === "diagnostics" && <DiagnosticsSection />}
        {tab === "general" && <GeneralSection />}
      </div>
    </div>
  );
}
