import React from "react";
import {
  SOCIAL_AUTH_LABELS,
  SOCIAL_AUTH_PRIMARY_PROVIDERS,
  SOCIAL_AUTH_SECONDARY_PROVIDERS,
  getSocialProviderAvailabilityMap,
  type SocialAuthProvider,
  type SocialProviderAvailability,
} from "../../lib/socialAuth";
import { useLang, type Lang } from "../../contexts/LangContext";

type Props = {
  busyProvider: SocialAuthProvider | null;
  disabled?: boolean;
  onProvider: (provider: SocialAuthProvider) => void;
};

type SocialPanelCopy = {
  quickTitle: string;
  otherConnections: string;
  openMore: string;
  continueWith: (label: string, blocked: boolean) => string;
  titleWith: (label: string, blocked: boolean) => string;
};

const SOCIAL_PANEL_COPY: Record<Lang, SocialPanelCopy> = {
  fr: {
    quickTitle: "Connexion rapide",
    otherConnections: "Autres connexions",
    openMore: "Afficher les autres connexions",
    continueWith: (label, blocked) => `Continuer avec ${label}${blocked ? " — à configurer" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — à configurer dans Supabase" : ""}`,
  },
  en: {
    quickTitle: "Quick sign in",
    otherConnections: "Other connections",
    openMore: "Show other connections",
    continueWith: (label, blocked) => `Continue with ${label}${blocked ? " — needs setup" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configure in Supabase" : ""}`,
  },
  es: {
    quickTitle: "Conexión rápida",
    otherConnections: "Otras conexiones",
    openMore: "Mostrar otras conexiones",
    continueWith: (label, blocked) => `Continuar con ${label}${blocked ? " — por configurar" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configurar en Supabase" : ""}`,
  },
  de: {
    quickTitle: "Schnellanmeldung",
    otherConnections: "Weitere Verbindungen",
    openMore: "Weitere Verbindungen anzeigen",
    continueWith: (label, blocked) => `Mit ${label} fortfahren${blocked ? " — Einrichtung nötig" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — in Supabase konfigurieren" : ""}`,
  },
  it: {
    quickTitle: "Accesso rapido",
    otherConnections: "Altri accessi",
    openMore: "Mostra altri accessi",
    continueWith: (label, blocked) => `Continua con ${label}${blocked ? " — da configurare" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configura in Supabase" : ""}`,
  },
  pt: {
    quickTitle: "Ligação rápida",
    otherConnections: "Outras ligações",
    openMore: "Mostrar outras ligações",
    continueWith: (label, blocked) => `Continuar com ${label}${blocked ? " — por configurar" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configurar no Supabase" : ""}`,
  },
  nl: {
    quickTitle: "Snel aanmelden",
    otherConnections: "Andere verbindingen",
    openMore: "Andere verbindingen tonen",
    continueWith: (label, blocked) => `Doorgaan met ${label}${blocked ? " — nog te configureren" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configureren in Supabase" : ""}`,
  },
  ru: {
    quickTitle: "Быстрый вход",
    otherConnections: "Другие способы входа",
    openMore: "Показать другие способы входа",
    continueWith: (label, blocked) => `Продолжить через ${label}${blocked ? " — требуется настройка" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — настройте в Supabase" : ""}`,
  },
  zh: {
    quickTitle: "快速登录",
    otherConnections: "其他登录方式",
    openMore: "显示其他登录方式",
    continueWith: (label, blocked) => `使用 ${label} 继续${blocked ? " — 需配置" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — 请在 Supabase 中配置" : ""}`,
  },
  ja: {
    quickTitle: "クイックログイン",
    otherConnections: "その他の接続",
    openMore: "その他の接続を表示",
    continueWith: (label, blocked) => `${label} で続行${blocked ? " — 設定が必要" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — Supabase で設定してください" : ""}`,
  },
  ar: {
    quickTitle: "اتصال سريع",
    otherConnections: "اتصالات أخرى",
    openMore: "عرض الاتصالات الأخرى",
    continueWith: (label, blocked) => `المتابعة عبر ${label}${blocked ? " — يحتاج إلى إعداد" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — قم بإعداده في Supabase" : ""}`,
  },
  hi: {
    quickTitle: "त्वरित साइन-इन",
    otherConnections: "अन्य कनेक्शन",
    openMore: "अन्य कनेक्शन दिखाएँ",
    continueWith: (label, blocked) => `${label} से जारी रखें${blocked ? " — सेटअप आवश्यक" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — Supabase में कॉन्फ़िगर करें" : ""}`,
  },
  tr: {
    quickTitle: "Hızlı giriş",
    otherConnections: "Diğer bağlantılar",
    openMore: "Diğer bağlantıları göster",
    continueWith: (label, blocked) => `${label} ile devam et${blocked ? " — kurulum gerekli" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — Supabase'te yapılandır" : ""}`,
  },
  da: {
    quickTitle: "Hurtig login",
    otherConnections: "Andre forbindelser",
    openMore: "Vis andre forbindelser",
    continueWith: (label, blocked) => `Fortsæt med ${label}${blocked ? " — kræver opsætning" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — konfigurer i Supabase" : ""}`,
  },
  no: {
    quickTitle: "Rask innlogging",
    otherConnections: "Andre tilkoblinger",
    openMore: "Vis andre tilkoblinger",
    continueWith: (label, blocked) => `Fortsett med ${label}${blocked ? " — krever oppsett" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — konfigurer i Supabase" : ""}`,
  },
  sv: {
    quickTitle: "Snabbinloggning",
    otherConnections: "Andra anslutningar",
    openMore: "Visa andra anslutningar",
    continueWith: (label, blocked) => `Fortsätt med ${label}${blocked ? " — kräver konfiguration" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — konfigurera i Supabase" : ""}`,
  },
  is: {
    quickTitle: "Flýtiskráning",
    otherConnections: "Aðrar tengingar",
    openMore: "Sýna aðrar tengingar",
    continueWith: (label, blocked) => `Halda áfram með ${label}${blocked ? " — þarf uppsetningu" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — stilla í Supabase" : ""}`,
  },
  pl: {
    quickTitle: "Szybkie logowanie",
    otherConnections: "Inne połączenia",
    openMore: "Pokaż inne połączenia",
    continueWith: (label, blocked) => `Kontynuuj z ${label}${blocked ? " — wymaga konfiguracji" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — skonfiguruj w Supabase" : ""}`,
  },
  ro: {
    quickTitle: "Conectare rapidă",
    otherConnections: "Alte conexiuni",
    openMore: "Afișează alte conexiuni",
    continueWith: (label, blocked) => `Continuă cu ${label}${blocked ? " — necesită configurare" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — configurează în Supabase" : ""}`,
  },
  sr: {
    quickTitle: "Брза пријава",
    otherConnections: "Остале везе",
    openMore: "Прикажи остале везе",
    continueWith: (label, blocked) => `Настави преко ${label}${blocked ? " — потребно подешавање" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — подеси у Supabase-у" : ""}`,
  },
  hr: {
    quickTitle: "Brza prijava",
    otherConnections: "Druge prijave",
    openMore: "Prikaži druge prijave",
    continueWith: (label, blocked) => `Nastavi s ${label}${blocked ? " — potrebno postavljanje" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — postavi u Supabaseu" : ""}`,
  },
  cs: {
    quickTitle: "Rychlé přihlášení",
    otherConnections: "Další připojení",
    openMore: "Zobrazit další připojení",
    continueWith: (label, blocked) => `Pokračovat přes ${label}${blocked ? " — vyžaduje nastavení" : ""}`,
    titleWith: (label, blocked) => `${label}${blocked ? " — nastavte v Supabase" : ""}`,
  },
};

export default function SocialLoginPanel({ busyProvider, disabled = false, onProvider }: Props) {
  const [showMore, setShowMore] = React.useState(false);
  const [availability, setAvailability] = React.useState<Partial<Record<SocialAuthProvider, SocialProviderAvailability>>>({});
  const { lang } = useLang();
  const copy = SOCIAL_PANEL_COPY[lang] || SOCIAL_PANEL_COPY.fr;
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let alive = true;
    void getSocialProviderAvailabilityMap()
      .then((map) => {
        if (alive) setAvailability(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!panelRef.current) return;
      const target = event.target as Node | null;
      if (target && !panelRef.current.contains(target)) setShowMore(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const orderedVisibleProviders = [...SOCIAL_AUTH_PRIMARY_PROVIDERS, ...SOCIAL_AUTH_SECONDARY_PROVIDERS].filter(
    (provider) => availability[provider] !== "disabled"
  );
  const primaryProviders = orderedVisibleProviders.slice(0, 3);
  const secondaryProviders = orderedVisibleProviders.slice(3);
  const hasMore = secondaryProviders.length > 0;

  React.useEffect(() => {
    if (!hasMore && showMore) setShowMore(false);
  }, [hasMore, showMore]);

  return (
    <div ref={panelRef} style={panelStyle}>
      <div style={headerStyle}>{copy.quickTitle}</div>

      <div style={primaryGridStyle}>
        {primaryProviders.map((provider) => (
          <SocialLogoButton
            key={provider}
            provider={provider}
            busy={busyProvider === provider}
            blocked={availability[provider] === "disabled"}
            disabled={disabled || (!!busyProvider && busyProvider !== provider)}
            size="primary"
            labels={copy}
            onClick={() => onProvider(provider)}
          />
        ))}

        {hasMore ? (
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            disabled={disabled || !!busyProvider}
            aria-label={copy.openMore}
            title={copy.openMore}
            style={plusButtonStyle}
          >
            <span style={plusGlyphStyle}>+</span>
          </button>
        ) : null}
      </div>

      {showMore ? (
        <div style={floatingMenuStyle}>
          <div style={floatingMenuHeaderStyle}>{copy.otherConnections}</div>
          <div style={secondaryGridStyle}>
            {secondaryProviders.map((provider) => (
              <SocialLogoButton
                key={provider}
                provider={provider}
                busy={busyProvider === provider}
                blocked={availability[provider] === "disabled"}
                disabled={disabled || (!!busyProvider && busyProvider !== provider)}
                size="secondary"
                labels={copy}
                onClick={() => onProvider(provider)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type LogoButtonProps = {
  provider: SocialAuthProvider;
  busy: boolean;
  blocked: boolean;
  disabled: boolean;
  size: "primary" | "secondary";
  labels: SocialPanelCopy;
  onClick: () => void;
};

function SocialLogoButton({ provider, busy, blocked, disabled, size, labels, onClick }: LogoButtonProps) {
  const theme = SOCIAL_TILE_THEME[provider];
  const px = size === "primary" ? 62 : 54;
  const iconPx = size === "primary" ? 31 : 26;
  const isDisabled = disabled && !busy;
  const label = SOCIAL_AUTH_LABELS[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={labels.continueWith(label, blocked)}
      aria-disabled={blocked || isDisabled}
      title={labels.titleWith(label, blocked)}
      style={{
        width: px,
        height: px,
        borderRadius: size === "primary" ? 18 : 15,
        border: theme.border,
        background: theme.background,
        display: "grid",
        placeItems: "center",
        position: "relative",
        padding: 0,
        margin: "0 auto",
        cursor: isDisabled ? "default" : "pointer",
        opacity: blocked ? 0.38 : isDisabled ? 0.45 : 1,
        boxShadow: blocked ? "none" : "0 9px 22px rgba(0,0,0,.30)",
        transition: "transform .14s ease, opacity .14s ease, box-shadow .14s ease",
        overflow: "hidden",
      }}
    >
      <SocialProviderLogo provider={provider} size={iconPx} color={theme.logoColor} />
      {busy ? <span style={spinnerStyle} /> : null}
      {blocked ? (
        <span aria-hidden="true" style={blockedDotStyle}>
          !
        </span>
      ) : null}
    </button>
  );
}

function SocialProviderLogo({ provider, size, color }: { provider: SocialAuthProvider; size: number; color: string }) {
  if (provider === "azure") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#7fba00" d="M13 1h10v10H13z" />
        <path fill="#00a4ef" d="M1 13h10v10H1z" />
        <path fill="#ffb900" d="M13 13h10v10H13z" />
      </svg>
    );
  }

  const path = SOCIAL_ICON_PATHS[provider];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path fill={color} d={path} />
    </svg>
  );
}

const SOCIAL_TILE_THEME: Record<SocialAuthProvider, { background: string; border: string; logoColor: string }> = {
  facebook: { background: "#1877f2", border: "1px solid #1877f2", logoColor: "#fff" },
  google: { background: "#fff", border: "1px solid rgba(255,255,255,.95)", logoColor: "#4285f4" },
  azure: { background: "#fff", border: "1px solid rgba(255,255,255,.95)", logoColor: "#111" },
  apple: { background: "#050505", border: "1px solid rgba(255,255,255,.26)", logoColor: "#fff" },
  x: { background: "#050505", border: "1px solid rgba(255,255,255,.22)", logoColor: "#fff" },
  discord: { background: "#5865f2", border: "1px solid #5865f2", logoColor: "#fff" },
  instagram: { background: "linear-gradient(135deg,#833ab4 0%,#fd1d1d 55%,#fcb045 100%)", border: "1px solid rgba(255,255,255,.20)", logoColor: "#fff" },
  snapchat: { background: "#fffc00", border: "1px solid #fffc00", logoColor: "#111" },
  tiktok: { background: "#050505", border: "1px solid rgba(255,255,255,.22)", logoColor: "#fff" },
  github: { background: "#161b22", border: "1px solid rgba(255,255,255,.20)", logoColor: "#fff" },
  twitch: { background: "#9146ff", border: "1px solid #9146ff", logoColor: "#fff" },
  kakao: { background: "#fee500", border: "1px solid #fee500", logoColor: "#191919" },
};

const SOCIAL_ICON_PATHS: Record<Exclude<SocialAuthProvider, "azure">, string> & Partial<Record<"azure", string>> = {
  google: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
  apple: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701",
  facebook: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  discord: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m9.9229 5.5025A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  snapchat: "M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  twitch: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  kakao: "M12 2C5.925 2 1 5.925 1 10.766c0 3.11 2.03 5.84 5.09 7.4l-1.3 4.78c-.115.423.368.76.74.515l5.69-3.76c.255.018.514.03.78.03 6.075 0 11-3.925 11-8.765S18.075 2 12 2z",
};

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 12,
  borderRadius: 20,
  border: "1px solid rgba(255,198,58,.18)",
  background: "linear-gradient(180deg, rgba(255,198,58,.06), rgba(255,255,255,.025))",
  position: "relative",
};

const headerStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 950,
  letterSpacing: 0.9,
  opacity: 0.9,
  textTransform: "uppercase",
  color: "#ffd45a",
};

const primaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "center",
  gap: 10,
};

const secondaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "center",
  gap: 9,
};

const floatingMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% - 8px)",
  left: 12,
  right: 12,
  zIndex: 8,
  padding: 10,
  borderRadius: 18,
  border: "1px solid rgba(255,198,58,.18)",
  background: "rgba(7,9,12,.98)",
  boxShadow: "0 18px 36px rgba(0,0,0,.48)",
  display: "grid",
  gap: 10,
};

const floatingMenuHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: "uppercase",
  color: "#ffd45a",
};

const plusButtonStyle: React.CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: 18,
  border: "1px solid rgba(255,198,58,.32)",
  background: "linear-gradient(180deg, rgba(255,198,58,.14), rgba(255,198,58,.08))",
  display: "grid",
  placeItems: "center",
  padding: 0,
  margin: "0 auto",
  cursor: "pointer",
  boxShadow: "0 9px 22px rgba(0,0,0,.30)",
};

const plusGlyphStyle: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 500,
  color: "#ffd45a",
  marginTop: -2,
};

const spinnerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 5,
  borderRadius: 999,
  border: "2px solid rgba(255,255,255,.26)",
  borderTopColor: "#ffd45a",
  animation: "socialAuthSpin .8s linear infinite",
};

const blockedDotStyle: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 16,
  height: 16,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 1000,
  background: "#ffbd2e",
  color: "#19130a",
  border: "1px solid rgba(0,0,0,.35)",
};
