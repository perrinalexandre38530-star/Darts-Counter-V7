// ============================================
// src/pages/AuthV7Login.tsx
// Connexion email unifiée : compte public Supabase OU compte NAS invité/fondateur existant.
// Le code d’invitation sert uniquement à la création d’un compte privé.
// Visuel aligné sur le portail AccountStart (Gold / logo / langues).
// ============================================
import React from "react";
import { onlineApi } from "../lib/onlineApi";
import { useLang, type Lang } from "../contexts/LangContext";
import authBrandLogo from "../assets/auth-logo-ms-gold.png";

type Props = {
  go: (t: any, p?: any) => void;
};

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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

export default function AuthV7Login({ go }: Props) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canResend, setCanResend] = React.useState(false);
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const lastNetErrAtRef = React.useRef<number>(0);
  const langDockRef = React.useRef<HTMLDivElement | null>(null);
  const { lang, setLang, t } = useLang();
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

  const showBackendUnreachable = (details?: string) => {
    const now = Date.now();
    if (now - lastNetErrAtRef.current < 30_000) return;
    lastNetErrAtRef.current = now;
    setError(
      `${t("auth.login.serviceUnavailable", "Impossible de joindre le service de connexion.")}${
        details ? `\n\n${details}` : ""
      }`
    );
  };

  const looksLikeNetworkError = (x: any) => {
    const msg = String(x?.message || x || "");
    return (
      x?.name === "AbortError" ||
      /Failed to fetch/i.test(msg) ||
      /NetworkError/i.test(msg) ||
      (/fetch/i.test(msg) && /failed/i.test(msg)) ||
      /timeout/i.test(msg)
    );
  };

  async function resendConfirm() {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError(t("auth.login.validEmailResend", "Entre une adresse email valide pour renvoyer l’email."));
      return;
    }

    setLoading(true);
    const hardStop = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev || t("auth.login.timeout", "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau."));
    }, 12000);

    try {
      await onlineApi.resendSignupConfirmation(e);
      setError(t("auth.login.confirmationResent", "Email de confirmation renvoyé ✅ Ouvre le DERNIER email reçu."));
      setCanResend(false);
    } catch (e: any) {
      if (looksLikeNetworkError(e)) {
        showBackendUnreachable(
          t(
            "auth.login.networkHint",
            "Teste en 4G/navigation privée si un bloqueur réseau gêne Supabase ou le backend NAS/R2."
          )
        );
      } else {
        setError(e?.message || t("auth.login.resendFailed", "Impossible de renvoyer l’email."));
      }
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  }

  const onSubmit = async () => {
    setError(null);
    setCanResend(false);
    const e = email.trim();
    if (!e || !e.includes("@")) return setError(t("auth.login.validEmail", "Entre une adresse email valide."));
    if (!password) return setError(t("auth.login.passwordRequired", "Entre ton mot de passe."));

    setLoading(true);
    const hardStop = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev || t("auth.login.timeout", "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau."));
    }, 25000);

    try {
      const session = await withTimeout(
        onlineApi.loginPublic({ email: e, password }),
        20000,
        t("auth.login.connection", "Connexion")
      );
      void session;
      // La connexion ouvre l'application immédiatement. Le hook d'authentification
      // recharge le store du BON user puis cherche sa sauvegarde en arrière-plan.
      go("gameSelect");
    } catch (err: any) {
      const msg = String(err?.message || err || t("auth.login.failed", "Connexion impossible."));
      if (looksLikeNetworkError(err)) {
        showBackendUnreachable(
          t(
            "auth.login.networkPublicHint",
            "Vérifie Supabase et la connexion réseau. Le NAS/R2 n'est pas requis pour ouvrir une session publique."
          )
        );
        return;
      }
      setError(msg);
      if (/not confirmed|non confirmé|email non confirmé/i.test(msg)) setCanResend(true);
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  };

  const openInvitationSignup = () => {
    try {
      localStorage.setItem("dc_auth_signup_invite_mode", "1");
    } catch {}
    go("auth_v7_signup");
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

        <h1 style={titleStyle}>{t("auth.login.title", "Connexion")}</h1>
        <p style={subtitleStyle}>
          {t(
            "auth.login.subtitle.clean",
            "Connecte-toi avec ton adresse email et ton mot de passe pour retrouver automatiquement ton compte sur cet appareil."
          )}
        </p>

        <div style={formPanelStyle}>
          <div style={formPanelTitleStyle}>{t("auth.login.emailTitle", "Connexion par email")}</div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.login.emailPlaceholder", "Adresse email")}
            aria-label={t("auth.login.emailPlaceholder", "Adresse email")}
            autoComplete="email"
            inputMode="email"
            style={inputStyle}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) void onSubmit();
            }}
            placeholder={t("auth.login.passwordPlaceholder", "Mot de passe")}
            aria-label={t("auth.login.passwordPlaceholder", "Mot de passe")}
            type="password"
            autoComplete="current-password"
            style={inputStyle}
          />

          <button onClick={onSubmit} disabled={loading} style={primaryBtnStyle}>
            {loading ? t("auth.login.loading", "Connexion...") : t("auth.login.submit", "Connexion")}
          </button>
        </div>

        <div style={linksRowStyle}>
          <button onClick={() => go("auth_v7_signup")} style={linkBtnStyle}>
            {t("auth.login.createAccount", "Créer un compte")}
          </button>
          <button onClick={() => go("auth_forgot")} style={linkBtnStyle}>
            {t("auth.login.forgotPassword", "Mot de passe oublié ?")}
          </button>
        </div>

        <button onClick={openInvitationSignup} disabled={loading} style={inviteBtnStyle}>
          <span aria-hidden="true">🔑</span>
          {t("auth.login.invitation", "J’ai un code d’invitation")}
        </button>

        {error ? (
          <div style={errorPanelStyle}>
            <div style={{ fontSize: 12.6, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{error}</div>
            {canResend ? (
              <button onClick={resendConfirm} disabled={loading} style={resendBtnStyle}>
                {t("auth.login.resendConfirmation", "Renvoyer l’email de confirmation")}
              </button>
            ) : null}
          </div>
        ) : null}

        <button onClick={() => go("account_start")} style={secondaryBtnStyle}>
          ← {t("auth.login.back", "Retour")}
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
  fontSize: 33,
  fontWeight: 900,
  letterSpacing: 2.6,
  textAlign: "center",
  backgroundImage: "linear-gradient(120deg, #ffc63a, #fff5c8, #ffc63a)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  color: "transparent",
  textTransform: "uppercase",
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

const resendBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: "9px 10px",
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.05)",
  color: "rgba(255,255,255,.94)",
  cursor: "pointer",
  fontWeight: 900,
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
