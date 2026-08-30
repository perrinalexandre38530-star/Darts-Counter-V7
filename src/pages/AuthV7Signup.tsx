// ============================================
// src/pages/AuthV7Signup.tsx
// Auth V7 — Création compte public / invité
// Refonte visuelle alignée avec le portail AccountStart / Login
// ============================================
import React from "react";
import { __SUPABASE_ENV__ } from "../lib/supabaseClient";
import { onlineApi } from "../lib/onlineApi";
import { hasMeaningfulRemoteSnapshotPayload, restoreRemoteSnapshotIntoLocalApp } from "../lib/remoteSnapshotRestore";
import { useLang, type Lang } from "../contexts/LangContext";
import authBrandLogo from "../assets/auth-logo-ms-gold.png";

type Props = { go: (t: any, p?: any) => void };
type AccessMode = "public" | "invite";

type LangOption = {
  code: Lang;
  flag: string;
  short: string;
  label: string;
};

const LANGUAGE_OPTIONS: LangOption[] = [
  { code: "fr", flag: "🇫🇷", short: "FR", label: "Français" },
  { code: "en", flag: "🇬🇧", short: "EN", label: "English" },
  { code: "es", flag: "🇪🇸", short: "ES", label: "Español" },
  { code: "de", flag: "🇩🇪", short: "DE", label: "Deutsch" },
  { code: "it", flag: "🇮🇹", short: "IT", label: "Italiano" },
  { code: "pt", flag: "🇵🇹", short: "PT", label: "Português" },
  { code: "nl", flag: "🇳🇱", short: "NL", label: "Nederlands" },
  { code: "ru", flag: "🇷🇺", short: "RU", label: "Русский" },
  { code: "zh", flag: "🇨🇳", short: "ZH", label: "中文" },
  { code: "ja", flag: "🇯🇵", short: "JA", label: "日本語" },
  { code: "ar", flag: "🇸🇦", short: "AR", label: "العربية" },
  { code: "hi", flag: "🇮🇳", short: "HI", label: "हिन्दी" },
  { code: "tr", flag: "🇹🇷", short: "TR", label: "Türkçe" },
  { code: "da", flag: "🇩🇰", short: "DA", label: "Dansk" },
  { code: "no", flag: "🇳🇴", short: "NO", label: "Norsk" },
  { code: "sv", flag: "🇸🇪", short: "SV", label: "Svenska" },
  { code: "is", flag: "🇮🇸", short: "IS", label: "Íslenska" },
  { code: "pl", flag: "🇵🇱", short: "PL", label: "Polski" },
  { code: "ro", flag: "🇷🇴", short: "RO", label: "Română" },
  { code: "sr", flag: "🇷🇸", short: "SR", label: "Српски" },
  { code: "hr", flag: "🇭🇷", short: "HR", label: "Hrvatski" },
  { code: "cs", flag: "🇨🇿", short: "CS", label: "Čeština" },
];

function hasLinkedLocalProfile(userId?: string | null): boolean {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return false;
    const store = (window as any)?.__appStore?.store ?? null;
    const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
    return profiles.some((p: any) => String((p?.privateInfo || {})?.onlineUserId || "") === uid);
  } catch {
    return false;
  }
}

function armNasProfileOnboarding(userId?: string | null) {
  try {
    const uid = String(userId || "").trim();
    if (uid) localStorage.setItem("dc_nas_profile_onboarding_uid", uid);
  } catch {}
}

async function hasRemoteSnapshot(): Promise<boolean> {
  try {
    const res: any = await onlineApi.pullStoreSnapshot();
    if (res?.status !== "ok") return false;
    return hasMeaningfulRemoteSnapshotPayload(res?.payload ?? null);
  } catch {
    return false;
  }
}

async function restoreRemoteSnapshotIntoLocalStore(): Promise<boolean> {
  try {
    const res: any = await onlineApi.pullStoreSnapshot();
    if (res?.status !== "ok") return false;
    return await restoreRemoteSnapshotIntoLocalApp(res?.payload ?? null);
  } catch (e) {
    console.warn("[AuthV7Signup] restoreRemoteSnapshotIntoLocalStore failed", e);
    return false;
  }
}

export default function AuthV7Signup({ go }: Props) {
  const { lang, setLang, t } = useLang();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [invitationCode, setInvitationCode] = React.useState("");
  const [accessMode, setAccessMode] = React.useState<AccessMode>(() => {
    try {
      const flag = localStorage.getItem("dc_auth_signup_invite_mode") === "1";
      if (flag) localStorage.removeItem("dc_auth_signup_invite_mode");
      return flag ? "invite" : "public";
    } catch {
      return "public";
    }
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const langDockRef = React.useRef<HTMLDivElement | null>(null);

  const isInviteMode = accessMode === "invite";
  const currentLangOption = LANGUAGE_OPTIONS.find((option) => option.code === lang) || LANGUAGE_OPTIONS[0];

  React.useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!langDockRef.current) return;
      const target = event.target as Node | null;
      if (target && !langDockRef.current.contains(target)) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    const e = email.trim();
    const invite = invitationCode.trim();
    if (!e || !e.includes("@")) return setError(t("auth.signup.validEmail", "Entre une adresse email valide."));
    if (!password || password.length < 6) return setError(t("auth.signup.passwordMin", "Mot de passe : 6 caractères minimum."));
    if (password !== confirm) return setError(t("auth.signup.passwordMismatch", "Les mots de passe ne correspondent pas."));
    if (isInviteMode && !invite) return setError(t("auth.signup.inviteCodeRequired", "Entre le code d’invitation privé que tu as reçu."));

    if (!isInviteMode && !__SUPABASE_ENV__.hasEnv) {
      setError(`${t("auth.signup.envMissing", "Compte public Supabase non configuré côté application.")}\n${t("auth.signup.envMissingDetails", "Variables manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.")}\nURL actuelle: ${__SUPABASE_ENV__.url || "(vide)"}`);
      return;
    }

    setLoading(true);
    try {
      const nickname = e.split("@")[0] || "Player";
      const session = isInviteMode
        ? await onlineApi.signupWithInvitation({ email: e, password, nickname, invitationCode: invite })
        : await onlineApi.signupPublic({ email: e, password, nickname });

      if (session?.token || session?.user?.id) {
        const uid = String(session?.user?.id || "").trim();
        setInfo(isInviteMode ? t("auth.signup.inviteCreated", "Compte invité créé et connecté ✅") : t("auth.signup.publicCreated", "Compte public créé ✅"));

        if (uid && session?.token) {
          const restored = await restoreRemoteSnapshotIntoLocalStore();
          const linked = hasLinkedLocalProfile(uid);
          const remote = restored || (await hasRemoteSnapshot());
          if (!linked && !remote) {
            armNasProfileOnboarding(uid);
            go("profiles", {
              view: "locals",
              nasProfileOnboarding: true,
              autoCreate: true,
              returnTo: { tab: "profiles", params: { view: "me" } },
            });
            return;
          }
        }

        if (!isInviteMode && !session?.token) {
          setInfo(t("auth.signup.confirmEmail", "Compte public créé ✅ Ouvre le DERNIER email reçu pour confirmer ton compte, puis reviens sur l’app."));
          return;
        }

        go("gameSelect");
        return;
      }

      setInfo(t("auth.signup.confirmEmail", "Compte public créé ✅ Ouvre le DERNIER email reçu pour confirmer ton compte, puis reviens sur l’app."));
    } catch (e: any) {
      setError(e?.message || t("auth.signup.failed", "Création de compte impossible."));
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (next: Lang) => {
    setLang(next);
    setShowLangMenu(false);
  };

  return (
    <div className="container" style={pageStyle}>
      <div ref={langDockRef} style={langDockStyle}>
        <button
          type="button"
          onClick={() => setShowLangMenu((value) => !value)}
          style={langButtonStyle}
          aria-label={t("auth.language.choose", "Choisir la langue")}
          title={t("auth.language.choose", "Choisir la langue")}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{currentLangOption.flag}</span>
          <span style={{ fontSize: 12.5, fontWeight: 900 }}>{currentLangOption.short}</span>
          <span style={{ fontSize: 10, opacity: 0.78 }}>▾</span>
        </button>

        {showLangMenu ? (
          <div style={langMenuStyle}>
            <div style={langMenuHeaderStyle}>{t("auth.language.choose", "Choisir la langue")}</div>
            <div style={langGridStyle}>
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.code === currentLangOption.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => changeLang(option.code)}
                    aria-label={option.label}
                    title={option.label}
                    style={{
                      ...langMenuItemStyle,
                      ...(active
                        ? {
                            borderColor: "rgba(255,198,58,.55)",
                            background: "linear-gradient(180deg, rgba(255,198,58,.18), rgba(255,198,58,.08))",
                            color: "#fff5c7",
                            boxShadow: "0 0 0 1px rgba(255,198,58,.18) inset",
                          }
                        : null),
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{option.flag}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.4 }}>{option.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div style={cardStyle}>
        <div style={logoTileStyle}>
          <img src={authBrandLogo} alt="MULTISPORTS SCORING" style={logoStyle} />
        </div>

        <h1 style={titleStyle}>{isInviteMode ? t("auth.signup.inviteTitle", "Créer un compte invité") : t("auth.signup.title", "Créer un compte")}</h1>
        <p style={subtitleStyle}>
          {isInviteMode
            ? t("auth.signup.inviteSubtitle", "Accès privé réservé aux personnes qui ont reçu un code d’invitation.")
            : t("auth.signup.subtitle", "Crée ton compte Multisports pour synchroniser ton profil, ton avatar et tes statistiques sur tous tes appareils.")}
        </p>

        <div style={formPanelStyle}>
          <div style={formPanelTitleStyle}>
            {isInviteMode ? t("auth.signup.invitePanel", "Création avec invitation") : t("auth.signup.publicPanel", "Création du compte")}
          </div>

          {isInviteMode ? (
            <input
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder={t("auth.signup.inviteCode", "Code d’invitation privé")}
              aria-label={t("auth.signup.inviteCode", "Code d’invitation privé")}
              autoComplete="one-time-code"
              style={inputStyle}
            />
          ) : null}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.signup.email", "Adresse email")}
            aria-label={t("auth.signup.email", "Adresse email")}
            autoComplete="email"
            inputMode="email"
            style={inputStyle}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.signup.password", "Mot de passe (6+ caractères)")}
            aria-label={t("auth.signup.password", "Mot de passe (6+ caractères)")}
            type="password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) void onSubmit();
            }}
            placeholder={t("auth.signup.confirmPassword", "Confirmer le mot de passe")}
            aria-label={t("auth.signup.confirmPassword", "Confirmer le mot de passe")}
            type="password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <button onClick={onSubmit} disabled={loading} style={primaryBtnStyle}>
            {loading
              ? t("auth.signup.loading", "Création...")
              : isInviteMode
                ? t("auth.signup.submitInvite", "Créer le compte avec invitation")
                : t("auth.signup.submit", "Créer le compte")}
          </button>
        </div>

        <div style={linksRowStyle}>
          <button onClick={() => go("auth_v7_login")} style={linkBtnStyle}>
            {t("auth.signup.already", "J’ai déjà un compte")}
          </button>
          <button onClick={() => go("auth_forgot")} style={linkBtnStyle}>
            {t("auth.signup.forgot", "Mot de passe oublié ?")}
          </button>
        </div>

        <button
          onClick={() => {
            setError(null);
            setInfo(null);
            setAccessMode(isInviteMode ? "public" : "invite");
          }}
          style={inviteBtnStyle}
        >
          <span aria-hidden="true">{isInviteMode ? "↩" : "🔑"}</span>
          {isInviteMode
            ? t("auth.signup.backPublic", "Revenir au compte public")
            : t("auth.signup.haveInvite", "J’ai un code d’invitation")}
        </button>

        {error ? (
          <div style={errorPanelStyle}>
            <div style={{ fontSize: 12.6, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{error}</div>
          </div>
        ) : null}

        {info ? (
          <div style={infoPanelStyle}>
            <div style={{ fontSize: 12.6, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{info}</div>
          </div>
        ) : null}

        <button onClick={() => go("account_start")} style={secondaryBtnStyle}>
          ← {t("auth.signup.back", "Retour")}
        </button>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: "24px 18px 34px",
  minHeight: "100dvh",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  textAlign: "center",
  position: "relative",
  background:
    "radial-gradient(circle at 50% 6%, rgba(255,205,74,.18), transparent 26%), radial-gradient(circle at 15% 85%, rgba(255,181,46,.10), transparent 22%), linear-gradient(180deg, #050607 0%, #030405 100%)",
};

const cardStyle: React.CSSProperties = {
  width: "min(540px, 100%)",
  display: "grid",
  gap: 14,
  padding: "18px 18px 22px",
  borderRadius: 28,
  border: "1px solid rgba(255,198,58,.20)",
  background: "linear-gradient(180deg, rgba(12,13,16,.96), rgba(5,7,9,.985))",
  boxShadow: "0 26px 80px rgba(0,0,0,.78), 0 0 38px rgba(255,198,58,.10)",
};

const logoTileStyle: React.CSSProperties = {
  width: "min(206px, 56vw)",
  margin: "0 auto",
  borderRadius: 30,
  border: "1px solid rgba(255,198,58,.24)",
  background: "linear-gradient(180deg, rgba(20,20,24,.98), rgba(8,9,12,.98))",
  boxShadow: "0 18px 42px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.06)",
  padding: "14px 14px 12px",
};

const logoStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 20,
  filter: "drop-shadow(0 10px 24px rgba(0,0,0,.34))",
};

const titleStyle: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 31,
  fontWeight: 900,
  letterSpacing: 0.3,
  color: "#fff",
};

const subtitleStyle: React.CSSProperties = {
  opacity: 0.84,
  margin: "0 auto 2px",
  maxWidth: 470,
  lineHeight: 1.42,
  fontSize: 14,
  color: "rgba(255,255,255,.95)",
};

const formPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 13,
  borderRadius: 20,
  border: "1px solid rgba(255,198,58,.18)",
  background: "linear-gradient(180deg, rgba(255,198,58,.06), rgba(255,255,255,.025))",
};

const formPanelTitleStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 950,
  letterSpacing: 0.9,
  textTransform: "uppercase",
  color: "#ffd45a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(255,198,58,.16)",
  background: "rgba(3,4,6,.72)",
  color: "#fff",
  outline: "none",
  fontSize: 14,
  boxShadow: "0 0 0 1px rgba(0,0,0,.28) inset",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 999,
  padding: "13px 14px",
  fontWeight: 950,
  fontSize: 14,
  border: "none",
  color: "#1b1508",
  background: "linear-gradient(180deg,#ffc63a,#ffb300)",
  boxShadow: "0 10px 24px rgba(0,0,0,.35), 0 0 20px rgba(255,198,58,.12)",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 999,
  padding: "12px 14px",
  fontWeight: 900,
  background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03))",
  color: "#fff",
  border: "1px solid rgba(255,198,58,.16)",
  cursor: "pointer",
};

const linksRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#fff2cc",
  cursor: "pointer",
  textDecoration: "underline",
  padding: "2px 0",
  fontWeight: 850,
  fontSize: 12.8,
};

const inviteBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 16,
  padding: "11px 12px",
  border: "1px dashed rgba(255,198,58,.30)",
  background: "rgba(255,198,58,.05)",
  color: "#fff4d0",
  cursor: "pointer",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const errorPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 9,
  padding: "11px 12px",
  borderRadius: 15,
  background: "rgba(255,80,80,.08)",
  border: "1px solid rgba(255,100,100,.22)",
  color: "#ffd7d7",
  textAlign: "left",
};

const infoPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 9,
  padding: "11px 12px",
  borderRadius: 15,
  background: "rgba(255,198,58,.08)",
  border: "1px solid rgba(255,198,58,.22)",
  color: "#fff2cc",
  textAlign: "left",
};

const langDockStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
};

const langButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "8px 12px",
  borderRadius: 16,
  border: "1px solid rgba(255,198,58,.25)",
  background: "rgba(10,12,15,.95)",
  color: "#fff4d0",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(0,0,0,.42)",
};

const langMenuStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 10,
  width: "min(264px, calc(100vw - 24px))",
  display: "grid",
  gap: 10,
  borderRadius: 18,
  border: "1px solid rgba(255,198,58,.18)",
  background: "rgba(8,10,13,.98)",
  boxShadow: "0 20px 46px rgba(0,0,0,.50)",
};

const langMenuHeaderStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 900,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#ffc63a",
  opacity: 0.95,
};

const langGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  maxHeight: "56vh",
  overflowY: "auto",
  paddingRight: 2,
};

const langMenuItemStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "8px 6px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.04)",
  color: "rgba(255,255,255,.94)",
  display: "grid",
  placeItems: "center",
  gap: 3,
  cursor: "pointer",
};
