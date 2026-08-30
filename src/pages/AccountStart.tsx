// ============================================
// src/pages/AccountStart.tsx
// Portail Auth PRO : social OAuth + Connexion / Création / Mot de passe oublié
// ============================================
import React from "react";
import SocialLoginPanel from "../components/auth/SocialLoginPanel";
import { SOCIAL_AUTH_LABELS, startSocialSignIn, type SocialAuthProvider } from "../lib/socialAuth";
import { useLang, type Lang } from "../contexts/LangContext";
import appLogo from "../assets/LOGO.png";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
  onForgot: () => void;
};

type AuthPageCopy = {
  welcome: string;
  subtitle: string;
  or: string;
  loginEmail: string;
  createAccount: string;
  forgotPassword: string;
  security: string;
  providerError: (label: string) => string;
};

const AUTH_PAGE_COPY: Record<"fr" | "en" | "es", AuthPageCopy> = {
  fr: {
    welcome: "Bienvenue",
    subtitle:
      "Connecte-toi pour retrouver automatiquement ton compte, ton profil, ton avatar et tes statistiques sur tous tes appareils.",
    or: "OU",
    loginEmail: "Se connecter avec email",
    createAccount: "Créer un compte",
    forgotPassword: "Mot de passe oublié ?",
    security: "🔒 Une connexion est obligatoire pour accéder à MULTISPORTS SCORING.",
    providerError: (label) => `Connexion ${label} impossible.`,
  },
  en: {
    welcome: "Welcome",
    subtitle:
      "Sign in to automatically recover your account, profile, avatar and statistics on all your devices.",
    or: "OR",
    loginEmail: "Sign in with email",
    createAccount: "Create an account",
    forgotPassword: "Forgot password?",
    security: "🔒 A sign-in is required to access MULTISPORTS SCORING.",
    providerError: (label) => `Unable to sign in with ${label}.`,
  },
  es: {
    welcome: "Bienvenido",
    subtitle:
      "Inicia sesión para recuperar automáticamente tu cuenta, tu perfil, tu avatar y tus estadísticas en todos tus dispositivos.",
    or: "O",
    loginEmail: "Iniciar sesión con email",
    createAccount: "Crear una cuenta",
    forgotPassword: "¿Has olvidado tu contraseña?",
    security: "🔒 Es obligatorio iniciar sesión para acceder a MULTISPORTS SCORING.",
    providerError: (label) => `No se puede iniciar sesión con ${label}.`,
  },
};

const QUICK_LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "es", flag: "🇪🇸", label: "ES" },
];

function getQuickCopy(lang: Lang): AuthPageCopy {
  if (lang === "en") return AUTH_PAGE_COPY.en;
  if (lang === "es") return AUTH_PAGE_COPY.es;
  return AUTH_PAGE_COPY.fr;
}

export default function AccountStart({ onLogin, onCreate, onForgot }: Props) {
  const [socialBusy, setSocialBusy] = React.useState<SocialAuthProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const { lang, setLang } = useLang();
  const copy = getQuickCopy(lang);
  const currentLangOption = QUICK_LANG_OPTIONS.find((option) => option.code === lang) || QUICK_LANG_OPTIONS[0];

  const onSocial = async (provider: SocialAuthProvider) => {
    setError(null);
    setSocialBusy(provider);
    try {
      await startSocialSignIn(provider);
    } catch (err: any) {
      setError(String(err?.message || err || copy.providerError(SOCIAL_AUTH_LABELS[provider])));
      setSocialBusy(null);
    }
  };

  const changeLang = (next: Lang) => {
    setLang(next);
    setShowLangMenu(false);
  };

  return (
    <div
      className="container"
      style={{
        padding: "24px 18px 34px",
        minHeight: "100dvh",
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        textAlign: "center",
        position: "relative",
        background: "radial-gradient(circle at 50% 12%, rgba(35,230,255,.10), transparent 34%), #000",
      }}
    >
      <div style={langDockStyle}>
        <button
          type="button"
          onClick={() => setShowLangMenu((value) => !value)}
          style={langButtonStyle}
          aria-label="Choose language"
          title="Choose language"
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{currentLangOption.flag}</span>
          <span style={{ fontSize: 11.5, fontWeight: 900 }}>{currentLangOption.label}</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
        </button>

        {showLangMenu ? (
          <div style={langMenuStyle}>
            {QUICK_LANG_OPTIONS.map((option) => {
              const active = option.code === currentLangOption.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => changeLang(option.code)}
                  style={{
                    ...langMenuItemStyle,
                    ...(active
                      ? {
                          borderColor: "rgba(255,198,58,.48)",
                          background: "rgba(255,198,58,.12)",
                          color: "#fff2c5",
                        }
                      : null),
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{option.flag}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div style={cardStyle}>
        <div style={logoWrapStyle}>
          <img src={appLogo} alt="MULTISPORTS SCORING" style={logoStyle} />
        </div>

        <h2 style={{ margin: "0", fontSize: 31, lineHeight: 1.05 }}>{copy.welcome}</h2>
        <p style={{ opacity: 0.82, margin: "2px auto 2px", maxWidth: 480, lineHeight: 1.4, fontSize: 14 }}>
          {copy.subtitle}
        </p>

        <SocialLoginPanel busyProvider={socialBusy} onProvider={(provider) => void onSocial(provider)} />

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={{ fontSize: 11, opacity: 0.62, fontWeight: 850 }}>{copy.or}</span>
          <span style={dividerLineStyle} />
        </div>

        <div style={{ display: "grid", gap: 10, width: "100%" }}>
          <button className="btn primary" onClick={onLogin} style={primaryBtnStyle}>
            {copy.loginEmail}
          </button>

          <button className="btn" onClick={onCreate} style={secondaryBtnStyle}>
            {copy.createAccount}
          </button>

          <button className="btn" onClick={onForgot} style={forgotBtnStyle}>
            {copy.forgotPassword}
          </button>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <div style={securityStyle}>{copy.security}</div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  width: "min(520px, 100%)",
  display: "grid",
  gap: 14,
  padding: "18px 18px 22px",
  borderRadius: 26,
  border: "1px solid rgba(35,230,255,.14)",
  background: "linear-gradient(180deg, rgba(9,18,28,.94), rgba(2,5,9,.98))",
  boxShadow: "0 26px 80px rgba(0,0,0,.72), 0 0 34px rgba(35,230,255,.08)",
};

const logoWrapStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  paddingTop: 4,
};

const logoStyle: React.CSSProperties = {
  width: "min(210px, 64vw)",
  maxWidth: "100%",
  height: "auto",
  display: "block",
  filter: "drop-shadow(0 8px 22px rgba(0,0,0,.42))",
};

const langDockStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 5,
};

const langButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: "8px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(9,18,28,.9)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(0,0,0,.35)",
};

const langMenuStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  width: 84,
  display: "grid",
  gap: 6,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(9,18,28,.96)",
  boxShadow: "0 16px 34px rgba(0,0,0,.45)",
};

const langMenuItemStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.04)",
  color: "rgba(255,255,255,.92)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontWeight: 900,
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9 };
const dividerLineStyle: React.CSSProperties = { height: 1, flex: 1, background: "rgba(255,255,255,.11)" };

const primaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "13px 14px",
  fontWeight: 950,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#1b1508",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,.35), 0 0 20px rgba(255,198,58,.12)",
};

const secondaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "12px 14px",
  fontWeight: 900,
  background: "rgba(255,255,255,.07)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.13)",
  cursor: "pointer",
};

const forgotBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "9px 14px",
  fontWeight: 800,
  background: "transparent",
  color: "rgba(255,255,255,.85)",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
};

const errorStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 13,
  background: "rgba(255,80,80,.09)",
  border: "1px solid rgba(255,100,100,.24)",
  color: "#ffd7d7",
  fontSize: 12.5,
  lineHeight: 1.35,
};

const securityStyle: React.CSSProperties = {
  marginTop: 2,
  fontSize: 10.8,
  opacity: 0.62,
  lineHeight: 1.35,
};
