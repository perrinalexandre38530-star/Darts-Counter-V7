// ============================================
// src/pages/AccountStart.tsx
// Portail Auth PRO : social OAuth + Connexion / Création / Mot de passe oublié
// ============================================
import React from "react";
import SocialLoginPanel from "../components/auth/SocialLoginPanel";
import { SOCIAL_AUTH_LABELS, startSocialSignIn, type SocialAuthProvider } from "../lib/socialAuth";
import { useLang, type Lang } from "../contexts/LangContext";
const authBrandLogo = "/app-512.png";

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
  chooseLanguage: string;
  providerError: (label: string) => string;
};

type LangOption = {
  code: Lang;
  flag: string;
  short: string;
  label: string;
};

const AUTH_PAGE_COPY: Record<Lang, AuthPageCopy> = {
  fr: {
    welcome: "Bienvenue",
    subtitle:
      "Connecte-toi pour retrouver automatiquement ton compte, ton profil, ton avatar et tes statistiques sur tous tes appareils.",
    or: "OU",
    loginEmail: "Se connecter avec email",
    createAccount: "Créer un compte",
    forgotPassword: "Mot de passe oublié ?",
    security: "🔒 Une connexion est obligatoire pour accéder à MULTISPORTS SCORING.",
    chooseLanguage: "Choisir la langue",
    providerError: (label) => `Connexion ${label} impossible.`,
  },
  en: {
    welcome: "Welcome",
    subtitle:
      "Sign in to automatically recover your account, profile, avatar and statistics across all your devices.",
    or: "OR",
    loginEmail: "Sign in with email",
    createAccount: "Create an account",
    forgotPassword: "Forgot password?",
    security: "🔒 Sign-in is required to access MULTISPORTS SCORING.",
    chooseLanguage: "Choose language",
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
    chooseLanguage: "Elegir idioma",
    providerError: (label) => `No se puede iniciar sesión con ${label}.`,
  },
  de: {
    welcome: "Willkommen",
    subtitle:
      "Melde dich an, um dein Konto, Profil, Avatar und deine Statistiken automatisch auf all deinen Geräten wiederzufinden.",
    or: "ODER",
    loginEmail: "Mit E-Mail anmelden",
    createAccount: "Konto erstellen",
    forgotPassword: "Passwort vergessen?",
    security: "🔒 Eine Anmeldung ist erforderlich, um auf MULTISPORTS SCORING zuzugreifen.",
    chooseLanguage: "Sprache wählen",
    providerError: (label) => `Anmeldung mit ${label} nicht möglich.`,
  },
  it: {
    welcome: "Benvenuto",
    subtitle:
      "Accedi per ritrovare automaticamente il tuo account, il tuo profilo, il tuo avatar e le tue statistiche su tutti i tuoi dispositivi.",
    or: "OPPURE",
    loginEmail: "Accedi con email",
    createAccount: "Crea un account",
    forgotPassword: "Password dimenticata?",
    security: "🔒 L'accesso è obbligatorio per usare MULTISPORTS SCORING.",
    chooseLanguage: "Scegli la lingua",
    providerError: (label) => `Impossibile accedere con ${label}.`,
  },
  pt: {
    welcome: "Bem-vindo",
    subtitle:
      "Inicia sessão para recuperares automaticamente a tua conta, o teu perfil, o teu avatar e as tuas estatísticas em todos os teus dispositivos.",
    or: "OU",
    loginEmail: "Entrar com email",
    createAccount: "Criar conta",
    forgotPassword: "Esqueceste-te da palavra-passe?",
    security: "🔒 É obrigatório iniciar sessão para aceder ao MULTISPORTS SCORING.",
    chooseLanguage: "Escolher idioma",
    providerError: (label) => `Não foi possível entrar com ${label}.`,
  },
  nl: {
    welcome: "Welkom",
    subtitle:
      "Log in om je account, profiel, avatar en statistieken automatisch op al je apparaten terug te vinden.",
    or: "OF",
    loginEmail: "Inloggen met e-mail",
    createAccount: "Account aanmaken",
    forgotPassword: "Wachtwoord vergeten?",
    security: "🔒 Inloggen is verplicht om MULTISPORTS SCORING te gebruiken.",
    chooseLanguage: "Taal kiezen",
    providerError: (label) => `Inloggen met ${label} is niet mogelijk.`,
  },
  ru: {
    welcome: "Добро пожаловать",
    subtitle:
      "Войдите, чтобы автоматически восстановить вашу учетную запись, профиль, аватар и статистику на всех ваших устройствах.",
    or: "ИЛИ",
    loginEmail: "Войти по email",
    createAccount: "Создать аккаунт",
    forgotPassword: "Забыли пароль?",
    security: "🔒 Для доступа к MULTISPORTS SCORING требуется вход в систему.",
    chooseLanguage: "Выбрать язык",
    providerError: (label) => `Не удалось войти через ${label}.`,
  },
  zh: {
    welcome: "欢迎",
    subtitle: "登录后即可在所有设备上自动找回你的账户、个人资料、头像和统计数据。",
    or: "或",
    loginEmail: "使用邮箱登录",
    createAccount: "创建账户",
    forgotPassword: "忘记密码？",
    security: "🔒 访问 MULTISPORTS SCORING 需要先登录。",
    chooseLanguage: "选择语言",
    providerError: (label) => `无法使用 ${label} 登录。`,
  },
  ja: {
    welcome: "ようこそ",
    subtitle: "ログインすると、すべてのデバイスでアカウント、プロフィール、アバター、統計を自動的に復元できます。",
    or: "または",
    loginEmail: "メールでログイン",
    createAccount: "アカウントを作成",
    forgotPassword: "パスワードをお忘れですか？",
    security: "🔒 MULTISPORTS SCORING にアクセスするにはログインが必要です。",
    chooseLanguage: "言語を選択",
    providerError: (label) => `${label} でログインできません。`,
  },
  ar: {
    welcome: "مرحبًا",
    subtitle: "سجّل الدخول لاستعادة حسابك وملفك الشخصي وصورتك الرمزية وإحصاءاتك تلقائيًا على جميع أجهزتك.",
    or: "أو",
    loginEmail: "تسجيل الدخول بالبريد الإلكتروني",
    createAccount: "إنشاء حساب",
    forgotPassword: "هل نسيت كلمة المرور؟",
    security: "🔒 تسجيل الدخول مطلوب للوصول إلى MULTISPORTS SCORING.",
    chooseLanguage: "اختر اللغة",
    providerError: (label) => `تعذر تسجيل الدخول عبر ${label}.`,
  },
  hi: {
    welcome: "स्वागत है",
    subtitle:
      "अपने सभी डिवाइसों पर अपना खाता, प्रोफ़ाइल, अवतार और आँकड़े अपने आप पाने के लिए साइन इन करें।",
    or: "या",
    loginEmail: "ईमेल से साइन इन करें",
    createAccount: "खाता बनाएं",
    forgotPassword: "पासवर्ड भूल गए?",
    security: "🔒 MULTISPORTS SCORING तक पहुँचने के लिए साइन इन करना आवश्यक है।",
    chooseLanguage: "भाषा चुनें",
    providerError: (label) => `${label} से साइन इन नहीं हो सका।`,
  },
  tr: {
    welcome: "Hoş geldiniz",
    subtitle:
      "Tüm cihazlarında hesabını, profilini, avatarını ve istatistiklerini otomatik olarak bulmak için giriş yap.",
    or: "VEYA",
    loginEmail: "E-posta ile giriş yap",
    createAccount: "Hesap oluştur",
    forgotPassword: "Şifreni mi unuttun?",
    security: "🔒 MULTISPORTS SCORING'e erişmek için giriş yapmak zorunludur.",
    chooseLanguage: "Dil seç",
    providerError: (label) => `${label} ile giriş yapılamıyor.`,
  },
  da: {
    welcome: "Velkommen",
    subtitle:
      "Log ind for automatisk at finde din konto, din profil, din avatar og dine statistikker på alle dine enheder.",
    or: "ELLER",
    loginEmail: "Log ind med e-mail",
    createAccount: "Opret konto",
    forgotPassword: "Glemt adgangskode?",
    security: "🔒 Du skal være logget ind for at få adgang til MULTISPORTS SCORING.",
    chooseLanguage: "Vælg sprog",
    providerError: (label) => `Kan ikke logge ind med ${label}.`,
  },
  no: {
    welcome: "Velkommen",
    subtitle:
      "Logg inn for automatisk å finne kontoen din, profilen din, avataren din og statistikken din på alle enhetene dine.",
    or: "ELLER",
    loginEmail: "Logg inn med e-post",
    createAccount: "Opprett konto",
    forgotPassword: "Glemt passord?",
    security: "🔒 Innlogging er påkrevd for å få tilgang til MULTISPORTS SCORING.",
    chooseLanguage: "Velg språk",
    providerError: (label) => `Kan ikke logge inn med ${label}.`,
  },
  sv: {
    welcome: "Välkommen",
    subtitle:
      "Logga in för att automatiskt hitta ditt konto, din profil, din avatar och din statistik på alla dina enheter.",
    or: "ELLER",
    loginEmail: "Logga in med e-post",
    createAccount: "Skapa konto",
    forgotPassword: "Glömt lösenordet?",
    security: "🔒 Inloggning krävs för att få åtkomst till MULTISPORTS SCORING.",
    chooseLanguage: "Välj språk",
    providerError: (label) => `Det går inte att logga in med ${label}.`,
  },
  is: {
    welcome: "Velkomin",
    subtitle:
      "Skráðu þig inn til að finna sjálfkrafa reikninginn þinn, prófílinn þinn, avatarið þitt og tölfræðina þína á öllum tækjunum þínum.",
    or: "EÐA",
    loginEmail: "Skrá inn með tölvupósti",
    createAccount: "Búa til reikning",
    forgotPassword: "Gleymt lykilorði?",
    security: "🔒 Innskráning er nauðsynleg til að fá aðgang að MULTISPORTS SCORING.",
    chooseLanguage: "Velja tungumál",
    providerError: (label) => `Ekki tókst að skrá inn með ${label}.`,
  },
  pl: {
    welcome: "Witamy",
    subtitle:
      "Zaloguj się, aby automatycznie odzyskać swoje konto, profil, awatar i statystyki na wszystkich urządzeniach.",
    or: "LUB",
    loginEmail: "Zaloguj się e-mailem",
    createAccount: "Utwórz konto",
    forgotPassword: "Nie pamiętasz hasła?",
    security: "🔒 Logowanie jest wymagane, aby uzyskać dostęp do MULTISPORTS SCORING.",
    chooseLanguage: "Wybierz język",
    providerError: (label) => `Nie można zalogować się przez ${label}.`,
  },
  ro: {
    welcome: "Bine ai venit",
    subtitle:
      "Autentifică-te pentru a-ți regăsi automat contul, profilul, avatarul și statisticile pe toate dispozitivele tale.",
    or: "SAU",
    loginEmail: "Conectează-te cu email",
    createAccount: "Creează un cont",
    forgotPassword: "Ai uitat parola?",
    security: "🔒 Autentificarea este obligatorie pentru a accesa MULTISPORTS SCORING.",
    chooseLanguage: "Alege limba",
    providerError: (label) => `Nu te poți conecta cu ${label}.`,
  },
  sr: {
    welcome: "Добродошли",
    subtitle:
      "Пријавите се да бисте аутоматски пронашли свој налог, профил, аватар и статистику на свим уређајима.",
    or: "ИЛИ",
    loginEmail: "Пријава имејлом",
    createAccount: "Креирај налог",
    forgotPassword: "Заборавили сте лозинку?",
    security: "🔒 Пријава је обавезна за приступ апликацији MULTISPORTS SCORING.",
    chooseLanguage: "Изабери језик",
    providerError: (label) => `Пријава преко ${label} није успела.`,
  },
  hr: {
    welcome: "Dobrodošli",
    subtitle:
      "Prijavi se kako bi automatski pronašao svoj račun, profil, avatar i statistiku na svim svojim uređajima.",
    or: "ILI",
    loginEmail: "Prijava e-poštom",
    createAccount: "Izradi račun",
    forgotPassword: "Zaboravljena lozinka?",
    security: "🔒 Prijava je obavezna za pristup MULTISPORTS SCORING aplikaciji.",
    chooseLanguage: "Odaberi jezik",
    providerError: (label) => `Prijava putem ${label} nije uspjela.`,
  },
  cs: {
    welcome: "Vítejte",
    subtitle:
      "Přihlaste se a automaticky získejte svůj účet, profil, avatar a statistiky na všech svých zařízeních.",
    or: "NEBO",
    loginEmail: "Přihlásit se e-mailem",
    createAccount: "Vytvořit účet",
    forgotPassword: "Zapomněli jste heslo?",
    security: "🔒 Pro přístup do MULTISPORTS SCORING je nutné přihlášení.",
    chooseLanguage: "Vybrat jazyk",
    providerError: (label) => `Nelze se přihlásit pomocí ${label}.`,
  },
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

export default function AccountStart({ onLogin, onCreate, onForgot }: Props) {
  const [socialBusy, setSocialBusy] = React.useState<SocialAuthProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const { lang, setLang } = useLang();
  const copy = AUTH_PAGE_COPY[lang] || AUTH_PAGE_COPY.fr;
  const currentLangOption = LANGUAGE_OPTIONS.find((option) => option.code === lang) || LANGUAGE_OPTIONS[0];
  const langDockRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!langDockRef.current) return;
      const target = event.target as Node | null;
      if (target && !langDockRef.current.contains(target)) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

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
    <div className="container" style={pageStyle}>
      <div ref={langDockRef} style={langDockStyle}>
        <button
          type="button"
          onClick={() => setShowLangMenu((value) => !value)}
          style={langButtonStyle}
          aria-label={copy.chooseLanguage}
          title={copy.chooseLanguage}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{currentLangOption.flag}</span>
          <span style={{ fontSize: 12.5, fontWeight: 900 }}>{currentLangOption.short}</span>
          <span style={{ fontSize: 10, opacity: 0.78 }}>▾</span>
        </button>

        {showLangMenu ? (
          <div style={langMenuStyle}>
            <div style={langMenuHeaderStyle}>{copy.chooseLanguage}</div>
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
        <div style={logoWrapStyle}>
          <img src={authBrandLogo} alt="MULTISPORTS SCORING" style={logoStyle} />
        </div>

        <h1 style={welcomeTitleStyle}>{copy.welcome}</h1>

        <p style={subtitleStyle}>{copy.subtitle}</p>

        <SocialLoginPanel busyProvider={socialBusy} onProvider={(provider) => void onSocial(provider)} />

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>{copy.or}</span>
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

const logoWrapStyle: React.CSSProperties = {
  width: "min(260px, 72vw)",
  margin: "0 auto 6px",
  padding: 0,
  border: "none",
  background: "transparent",
  boxShadow: "none",
  borderRadius: 0,
};

const logoStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
  filter: "drop-shadow(0 12px 28px rgba(0,0,0,.38))",
};

const welcomeTitleStyle: React.CSSProperties = {
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

const dividerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9 };
const dividerLineStyle: React.CSSProperties = { height: 1, flex: 1, background: "rgba(255,198,58,.18)" };
const dividerTextStyle: React.CSSProperties = { fontSize: 11, opacity: 0.72, fontWeight: 850, color: "#ffd45a" };

const primaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "13px 14px",
  fontWeight: 950,
  background: "linear-gradient(180deg,#ffc63a,#ffb300)",
  color: "#1b1508",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,.35), 0 0 20px rgba(255,198,58,.12)",
};

const secondaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "12px 14px",
  fontWeight: 900,
  background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03))",
  color: "#fff",
  border: "1px solid rgba(255,198,58,.16)",
  cursor: "pointer",
};

const forgotBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "9px 14px",
  fontWeight: 800,
  background: "transparent",
  color: "#fff2cc",
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
  fontSize: 10.9,
  opacity: 0.72,
  lineHeight: 1.4,
  color: "rgba(255,255,255,.86)",
};
