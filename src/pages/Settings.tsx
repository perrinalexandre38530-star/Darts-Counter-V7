// ============================================
// src/pages/Settings.tsx — Thème + Langue + Compte + Reset App
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
// + Drapeaux pour les langues
// + Catégories + carrousels horizontaux pour les thèmes
// + Bloc "Compte & sécurité" inline (V8 always-connected)
// + Bloc "Notifications & communications"
// + Bouton "Tout réinitialiser" (hard reset + reload)
// + Bouton "Supprimer mon compte" (via useAuthOnline().deleteAccount ONLY)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { THEMES, type ThemeId, type AppTheme } from "../theme/themePresets";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { supabase } from "../lib/supabaseClient";

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

  // Soft accents
  blueOcean: { defaultLabel: "Bleu océan", defaultDesc: "Bleu naturel océan / ciel" },
  limeYellow: { defaultLabel: "Vert jaune", defaultDesc: "Couleur lime hyper flashy" },
  sage: { defaultLabel: "Vert sauge", defaultDesc: "Tons verts naturels et doux" },
  skyBlue: { defaultLabel: "Bleu pastel", defaultDesc: "Bleu très doux et lumineux" },

  // Dark premiums
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
  `;
  document.head.appendChild(style);
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
   - Efface localStorage + sessionStorage
   - Wipe toutes les bases IndexedDB
   - Déconnexion Supabase sur cet appareil
   - Reset éventuel store global legacy
   - Reload
------------------------------------------------------------- */
async function fullHardReset() {
  try {
    if (typeof window === "undefined") return;

    // 1) storage
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}

    // 2) wipe IndexedDB
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

    // 3) logout supabase local (cet appareil)
    try {
      await supabase.auth.signOut({ scope: "local" } as any);
    } catch {}

    // 4) reset store global legacy si dispo
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
    alert(
      "Erreur lors du reset complet. Tu peux aussi vider manuellement les données du site dans le navigateur."
    );
  }
}

// ---------------- Bloc Compte & sécurité (V8) ----------------

function AccountSecurityBlock() {
  const { theme } = useTheme();
  const { t } = useLang();
  const { session, status, loading, updateProfile, deleteAccount, logout } = useAuthOnline();

  const user = session?.user ?? null;
  const profile = session?.profile ?? null;

  const [displayName, setDisplayName] = React.useState(profile?.displayName || user?.nickname || "");
  const [country, setCountry] = React.useState(profile?.country || "");

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState<AccountPrefs>(DEFAULT_PREFS);

  // Sync quand le profil change (refresh / pull)
  React.useEffect(() => {
    setDisplayName(profile?.displayName || user?.nickname || "");
    setCountry(profile?.country || "");
  }, [profile?.displayName, profile?.country, user?.nickname]);

  // Chargement des préférences (localStorage)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_ACCOUNT_PREFS);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AccountPrefs>;
      setPrefs({ ...DEFAULT_PREFS, ...parsed });
    } catch {}
  }, []);

  // Sauvegarde auto des prefs
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
      setError(
        e?.message ||
          t("settings.account.save.error", "Impossible de mettre à jour le compte pour le moment.")
      );
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
      // ✅ IMPORTANT : jamais supabase.functions.invoke() ici
      // ✅ On passe TOUJOURS par useAuthOnline().deleteAccount()
      await deleteAccount();

      alert("Compte supprimé. Un nouveau compte vierge a été recréé.");

      // (Optionnel mais pratique) : si tu veux TOUT nettoyer localement aussi
      // -> décommente la ligne suivante.
      // await fullHardReset();
    } catch (e: any) {
      setError("Erreur suppression compte : " + (e?.message ?? e));
    } finally {
      setDeleting(false);
    }
  }

  // Email : en V8 anon, souvent undefined
  const emailLabel = user?.email || "—";
  const userIdLabel = user?.id ? `#${user.id.slice(0, 8)}` : "—";

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
        {t("settings.account.titleShort", "Compte & sécurité")}
      </h2>

      <p className="subtitle" style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10, lineHeight: 1.4 }}>
        {t(
          "settings.account.subtitleV8",
          "V8 : l’app est toujours connectée (compte anonyme automatique). Tu peux personnaliser ton profil et supprimer ton compte à tout moment."
        )}
      </p>

      {/* Statut du compte */}
      <div
        style={{
          padding: 10,
          borderRadius: 12,
          border: `1px solid ${theme.borderSoft}`,
          background: "rgba(0,0,0,0.3)",
          marginBottom: 12,
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 4, fontWeight: 700 }}>{t("settings.account.status", "Statut du compte")}</div>

        {status === "signed_in" ? (
          <>
            <div style={{ color: theme.textSoft }}>
              {t("settings.account.connectedAsV8", "Session active")}{" "}
              <span style={{ opacity: 0.9 }}>
                ({emailLabel} {userIdLabel})
              </span>
            </div>
            <div className="subtitle" style={{ fontSize: 11, color: theme.textSoft, marginTop: 4 }}>
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

      {status === "signed_in" && (
        <>
          {/* Formulaire profil */}
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
            <div className="subtitle" style={{ color: "#5ad57a", fontSize: 11, marginBottom: 4 }}>
              {message}
            </div>
          )}
          {error && (
            <div className="subtitle" style={{ color: "#ff6666", fontSize: 11, marginBottom: 4 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {/* Debug/QA : logout */}
            <button type="button" className="btn sm" onClick={() => logout()} disabled={loading || deleting}>
              {t("settings.account.btn.logout", "Se déconnecter (debug)")}
            </button>

            <button
              type="button"
              className="btn primary sm"
              onClick={handleSaveProfile}
              disabled={savingProfile || loading || deleting}
              style={{
                background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                color: "#000",
                fontWeight: 700,
                minWidth: 140,
              }}
            >
              {savingProfile ? t("settings.account.save.loading", "Enregistrement…") : t("settings.account.save.btn", "Enregistrer")}
            </button>
          </div>

          {/* ✅ ZONE DANGEREUSE (V8) — BOUTON PRÊT À COLLER */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 12,
              border: "1px solid rgba(255,0,0,0.35)",
              background: "rgba(255,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#ff6b6b" }}>
              {t("settings.account.danger", "Zone dangereuse")}
            </div>

            <button
              disabled={loading || deleting}
              onClick={handleDeleteAccountV8}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                background: "linear-gradient(180deg, #ff5c5c, #c92a2a)",
                color: "#fff",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                opacity: loading || deleting ? 0.6 : 1,
              }}
            >
              🗑️ {deleting ? "Suppression…" : "Supprimer mon compte définitivement"}
            </button>

            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>
              {t(
                "settings.account.deleteHintV8",
                "Cette action supprime le compte cloud (profiles + user_store + auth). L’app recrée automatiquement un nouveau compte anonyme (V8)."
              )}
            </div>
          </div>

          {/* Bloc Notifications & communications */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${theme.borderSoft}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: theme.primary }}>
              {t("settings.account.notifications.title", "Notifications & communications")}
            </div>

            <p className="subtitle" style={{ fontSize: 11, color: theme.textSoft, marginBottom: 8 }}>
              {t("settings.account.notifications.subtitle", "Choisis les mails et notifications que tu souhaites recevoir.")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <ToggleRow
                label={t("settings.account.notifications.emailsNews", "Emails de nouveautés / promotions")}
                help={t("settings.account.notifications.emailsNewsHelp", "Actualités majeures, nouvelles fonctionnalités, offres spéciales.")}
                checked={prefs.emailsNews}
                onChange={(v) => setPrefs((p) => ({ ...p, emailsNews: v }))}
              />
              <ToggleRow
                label={t("settings.account.notifications.emailsStats", "Emails de résumé de stats & conseils")}
                help={t("settings.account.notifications.emailsStatsHelp", "Récapitulatif occasionnel de tes stats avec quelques tips.")}
                checked={prefs.emailsStats}
                onChange={(v) => setPrefs((p) => ({ ...p, emailsStats: v }))}
              />
              <ToggleRow
                label={t("settings.account.notifications.inAppNotifs", "Notifications dans l’app (sons / messages info)")}
                help={t("settings.account.notifications.inAppNotifsHelp", "Contrôle les sons d’alerte et les petits messages d’infos dans l’application.")}
                checked={prefs.inAppNotifs}
                onChange={(v) => setPrefs((p) => ({ ...p, inAppNotifs: v }))}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------- Composant principal ----------------

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme();
  const { lang, setLang, t } = useLang();

  React.useEffect(() => {
    injectSettingsAnimationsOnce();
  }, []);

  async function handleFullReset() {
    const ok = window.confirm(
      "⚠️ RÉINITIALISATION COMPLÈTE ⚠️\n\n" +
        "Cette action va effacer TOUTES les données locales de Darts Counter sur cet appareil :\n" +
        "- Profils locaux & BOTS\n" +
        "- Stats & historique de parties\n" +
        "- Réglages, thèmes, langue…\n\n" +
        "Action définitive. Continuer ?"
    );
    if (!ok) return;
    await fullHardReset();
  }

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Retour */}
      <button
        type="button"
        onClick={() => go && go("home")}
        style={{
          border: "none",
          background: "transparent",
          color: theme.textSoft,
          marginBottom: 8,
          fontSize: 15,
        }}
      >
        ← {t("settings.back", "Retour")}
      </button>

      {/* Titre */}
      <h1
        style={{
          margin: 0,
          fontSize: 26,
          color: theme.primary,
          textShadow: `0 0 12px ${theme.primary}66`,
        }}
      >
        {t("settings.title", "Réglages")}
      </h1>

      <div style={{ fontSize: 14, color: theme.textSoft, marginBottom: 16 }}>
        {t("settings.subtitle", "Personnalise le thème, la langue et ton compte Darts Counter.")}
      </div>

      {/* ---------- COMPTE & SÉCURITÉ + PREFS ---------- */}
      <AccountSecurityBlock />

      {/* ---------- BLOC THEME ---------- */}
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

        <div style={{ marginTop: 12, marginBottom: 6, color: theme.textSoft, fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>
          ⚡ {t("settings.theme.group.neons", "Néons classiques")}
        </div>
        <div className="dc-scroll-thin" style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}>
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

        <div style={{ marginTop: 16, marginBottom: 6, color: theme.textSoft, fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>
          🎨 {t("settings.theme.group.soft", "Couleurs douces")}
        </div>
        <div className="dc-scroll-thin" style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}>
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

        <div style={{ marginTop: 16, marginBottom: 6, color: theme.textSoft, fontSize: 13, fontWeight: 600, textTransform: "uppercase" }}>
          🌑 {t("settings.theme.group.dark", "Thèmes Dark Premium")}
        </div>
        <div className="dc-scroll-thin" style={{ overflowX: "auto", padding: "6px 0 10px 0", marginTop: 4, marginBottom: 4 }}>
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

      {/* ---------- BLOC LANGUE ---------- */}
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

      {/* ---------- BLOC RÉINITIALISATION ---------- */}
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
          }}
        >
          {t("settings.reset.button", "Tout réinitialiser")}
        </button>
      </section>
    </div>
  );
}
