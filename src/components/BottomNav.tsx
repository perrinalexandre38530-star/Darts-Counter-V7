import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useSport } from "../contexts/SportContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { pollMessageCenterAndNotify, requestMessageNotificationsPermission, type MessageCenterUnreadSummary } from "../lib/messageCenterNotify";
import { shouldHideOnlineMessagingForCurrentRuntime } from "../config/androidStoreV1";
import { dismissBackgroundBackupState, useBackgroundBackupState } from "../lib/backgroundBackup";
import { dismissBackgroundRestoreState, useBackgroundRestoreState } from "../lib/backgroundRestore";

/**
 * BottomNav
 * - Le bouton "Stats" ouvre le menu StatsShell (puis accès au Hub).
 * - Visuellement, l’onglet "Stats" reste actif quand on est dans statsHub.
 * - ✅ Onglet "Tournois" (local) + actif aussi dans tournament_* routes
 * - ✅ IMPORTANT: masquer l’onglet "Online" quand le sport actif = PÉTANQUE
 *
 * Source de vérité = SportContext (choisi par GameSelect via setSport()).
 * => On n’utilise PAS de heuristiques DOM.
 */

type TabKey =
  | "home"
  | "games"
  | "running_plan"
  | "fit_plan"
  | "tournaments"
  | "tournament_create"
  | "tournament_list"
  | "tournament_view"
  | "tournament_match_play"
  | "profiles"
  | "friends"
  | "online"
  | "messages"
  | "stats"
  | "statsHub"
  | "settings"
  | "cast_host"
  | "viewer_host"
  | "cast_room"
  // au cas où ton routing le contient
  | "petanque_home"
  | "petanque_menu"
  | "petanque_config"
  | "petanque_play"
  | "babyfoot_menu"
  | "babyfoot_league";

type NavItem = {
  k: Exclude<
    TabKey,
    | "statsHub"
    | "tournament_create"
    | "tournament_list"
    | "tournament_view"
    | "tournament_match_play"
    | "petanque_home"
    | "petanque_menu"
    | "petanque_config"
    | "petanque_play"
    | "viewer_host"
    | "cast_room"
  >;
  label: string;
  icon: React.ReactNode;
};

function Icon({ name, size = 22 }: { name: TabKey; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M3 11.5 12 4l9 7.5" />
          <path {...p} d="M5 10.5V20h14v-9.5" />
        </svg>
      );

    case "games":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="7" />
          <circle {...p} cx="12" cy="12" r="3.2" />
          <path {...p} d="M12 5V3" />
          <path {...p} d="M19 12h2" />
          <path {...p} d="M12 21v-2" />
          <path {...p} d="M3 12h2" />
        </svg>
      );

    case "running_plan":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M6 3v3M18 3v3M4 8h16" />
          <rect {...p} x="4" y="5" width="16" height="16" rx="2.5" />
          <path {...p} d="m8 13 2.2 2.2L16 10" />
        </svg>
      );

    case "fit_plan":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M5 4h5v16H5zM14 4h5v16h-5z" />
          <path {...p} d="M7.5 8h0M16.5 8h0" />
        </svg>
      );

    case "tournaments":
    case "tournament_create":
    case "tournament_list":
    case "tournament_view":
    case "tournament_match_play":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z" />
          <path {...p} d="M6 5H4v2a4 4 0 0 0 4 4" />
          <path {...p} d="M18 5h2v2a4 4 0 0 1-4 4" />
          <path {...p} d="M12 12v3" />
          <path {...p} d="M9 20h6" />
          <path {...p} d="M10 15h4" />
        </svg>
      );

    case "profiles":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20a6.5 6.5 0 0 1 16 0" />
          <circle {...p} cx="12" cy="8" r="3.6" />
        </svg>
      );

    case "friends":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="7" />
          <path {...p} d="M12 5c2 2.8 2 11.2 0 14" />
          <path {...p} d="M5 12h14" />
          <circle
            cx="18.2"
            cy="6"
            r="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle cx="18.2" cy="6" r="0.9" fill="currentColor" />
        </svg>
      );


    case "messages":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 5.5h16v10.5H8l-4 3.5V5.5Z" />
          <path {...p} d="M8 9h8" />
          <path {...p} d="M8 12.5h5.5" />
        </svg>
      );

    case "stats":
    case "statsHub":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20V7" />
          <path {...p} d="M10 20V4" />
          <path {...p} d="M16 20v-6" />
          <path {...p} d="M22 20V9" />
        </svg>
      );

    case "cast_host":
    case "viewer_host":
    case "cast_room":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M3 18a3 3 0 0 1 3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 13a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 8a13 13 0 0 1 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 5h14v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "settings":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            {...p}
            d="m12 3 1.6 2.4a2 2 0 0 0 1.1.8l2.8.7-.7 2.8a2 2 0 0 0 .2 1.4l1.4 2.3-2.3 1.4a2 2 0 0 0-1 .9l-.8 2.7-2.8-.6a2 2 0 0 0-1.4.2L9 21l-1.4-2.3a2 2 0 0 0-.9-1l-2.7-.8.6-2.8a2 2 0 0 0-.2-1.4L3 9l2.3-1.4a2 2 0 0 0 1-.9l.8-2.7 2.8.6a2 2 0 0 0 1.4-.2Z"
          />
          <circle {...p} cx="12" cy="12" r="2.8" />
        </svg>
      );

    default:
      return null;
  }
}

// ------------------------------------------------------------------
// Sport gating (source de vérité = SportContext)
// + fallback LS pour couvrir un render où sport n’est pas encore prêt.
// ------------------------------------------------------------------

type SportId = "darts" | "petanque" | "pingpong" | "babyfoot" | string;

// ⚠️ Mets ici EXACTEMENT la clé que ton SportContext persiste.
// Dans ton commentaire GameSelect : "persistance LS dc-start-game".
// Donc on tente d’abord "dc-start-game".
// Si tu utilises une autre clé dans SportContext, remplace-la ici.
const SPORT_LS_KEY = "dc-start-game";

function readSportFromLS(): SportId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = String(window.localStorage.getItem(SPORT_LS_KEY) ?? "").trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

export default function BottomNav({
  value,
  onChange,
  sportOverride,
}: {
  value: TabKey;
  onChange: (k: TabKey) => void;
  sportOverride?: SportId | null;
}) {
  const { theme } = useTheme();
  const { t, lang } = useLang();
  const sportCtx = useSport() as any;

  const tr = React.useCallback(
    (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es),
    [lang],
  );

  // SportContext attendu : { sport, setSport }
  const sportFromCtx: SportId | null = (sportCtx?.sport as SportId) ?? null;
  const sportFromLS: SportId | null = React.useMemo(() => readSportFromLS(), []);
  // App.tsx connait le sport runtime réellement affiché. Sur Android de test,
  // SportContext peut volontairement retomber sur Darts à cause de la whitelist
  // Store V1 alors que RUNNING PERFORMANCE est ouvert en runtime/dev.
  // La BottomNav doit suivre la page affichée, sans pour autant ouvrir Running
  // dans la whitelist Android.
  const sport: SportId = sportOverride ?? sportFromCtx ?? sportFromLS ?? "darts";

  // Online masqué uniquement pour les sports sans salon en ligne dédié.
  // Baby-Foot utilise le hub Online existant via l'onglet `friends`.
  const sportLc = String(sport).toLowerCase();
  const hideOnline = shouldHideOnlineMessagingForCurrentRuntime() || sportLc === "petanque" || sportLc === "pingpong" || sportLc === "running" || sportLc === "fit";

  // Couleurs pilotées par le thème
  const bg = (theme as any)?.navBg ?? theme.card ?? "#050608";
  const borderTop = theme.cardSoft ?? "#111827";
  const textSoft = theme.textSoft ?? "#9ca3af";
  const textMain = theme.textMain ?? "#f9fafb";
  const accent = (theme as any)?.navAccent ?? theme.primary ?? textMain;
  const [messageSummary, setMessageSummary] = React.useState<MessageCenterUnreadSummary | null>(null);
  const messageBadge = Math.max(0, Number(messageSummary?.total || 0));
  const backgroundBackup = useBackgroundBackupState();
  const backgroundRestore = useBackgroundRestoreState();
  const activeBackgroundJob = backgroundRestore.status === "running"
    ? { kind: "restore" as const, state: backgroundRestore }
    : backgroundBackup.status === "running"
      ? { kind: "backup" as const, state: backgroundBackup }
      : backgroundRestore.status !== "idle"
        ? { kind: "restore" as const, state: backgroundRestore }
        : backgroundBackup.status !== "idle"
          ? { kind: "backup" as const, state: backgroundBackup }
          : null;

  React.useEffect(() => {
    if (hideOnline) {
      setMessageSummary(null);
      return;
    }

    let alive = true;
    let timer: number | undefined;

    const run = async (notify = true) => {
      try {
        const summary = await pollMessageCenterAndNotify({ notify, updateDocumentTitle: true });
        if (alive) setMessageSummary(summary);
      } catch {
        if (alive) setMessageSummary(null);
      }
    };

    run(false);
    timer = window.setInterval(() => run(true), 15000);
    const onFocus = () => run(false);
    const onManual = () => run(false);
    const onCount = (event: any) => {
      if (alive && event?.detail) setMessageSummary(event.detail as MessageCenterUnreadSummary);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("dc-message-center-refresh", onManual as any);
    window.addEventListener("dc-message-center-count", onCount as any);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dc-message-center-refresh", onManual as any);
      window.removeEventListener("dc-message-center-count", onCount as any);
    };
  }, [hideOnline]);

  const tabs: NavItem[] = sportLc === "running"
    ? [
        { k: "home", label: t("nav.home", tr("Accueil", "Home", "Inicio")), icon: <Icon name="home" /> },
        {
          k: "games",
          label: t("nav.run", tr("Courir", "Run", "Correr")),
          icon: (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="15.5" cy="4.5" r="2" />
              <path d="m13.8 8.2-3.1 3.2 2.5 2.5 3.6-1.2" />
              <path d="m10.8 11.2-4.2.8M13.2 13.9l-2.7 5.1M13.2 13.9l4.7 4" />
            </svg>
          ),
        },
        { k: "running_plan", label: t("nav.plan", tr("Plan", "Plan", "Plan")), icon: <Icon name="running_plan" /> },
        { k: "stats", label: t("nav.stats", "Stats"), icon: <Icon name="stats" /> },
        { k: "profiles", label: t("nav.profiles", tr("Profil", "Profile", "Perfil")), icon: <Icon name="profiles" /> },
        { k: "settings", label: t("nav.settings", tr("Réglages", "Settings", "Ajustes")), icon: <Icon name="settings" /> },
      ]
    : sportLc === "fit"
      ? [
          { k: "home", label: t("nav.home", tr("Accueil", "Home", "Inicio")), icon: <Icon name="home" /> },
          {
            k: "games",
            label: t("nav.train", tr("Séance", "Train", "Sesión")),
            icon: (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 9v6M17 9v6M4 7v10M20 7v10M7 12h10" />
              </svg>
            ),
          },
          { k: "fit_plan", label: tr("Exercices", "Exercises", "Ejercicios"), icon: <Icon name="fit_plan" /> },
          { k: "stats", label: t("nav.stats", "Stats"), icon: <Icon name="stats" /> },
          { k: "profiles", label: t("nav.profiles", tr("Profil", "Profile", "Perfil")), icon: <Icon name="profiles" /> },
          { k: "settings", label: t("nav.settings", tr("Réglages", "Settings", "Ajustes")), icon: <Icon name="settings" /> },
        ]
      : [
        { k: "home", label: t("nav.home", tr("Accueil", "Home", "Inicio")), icon: <Icon name="home" /> },

        ...(hideOnline ? [] : [
          { k: "messages", label: t("nav.messages", tr("Messages", "Messages", "Mensajes")), icon: <Icon name="messages" /> },
        ]),

        { k: "profiles", label: t("nav.profiles", tr("Profils", "Profiles", "Perfiles")), icon: <Icon name="profiles" /> },
        { k: "games", label: t("nav.games", tr("Jeux", "Games", "Juegos")), icon: <Icon name="games" /> },
        { k: "tournaments", label: t("nav.competitions", tr("Compétitions", "Competitions", "Competiciones")), icon: <Icon name="tournaments" /> },

        ...(hideOnline ? [] : [
          { k: "online", label: t("nav.online", tr("En ligne", "Online", "En línea")), icon: <Icon name="friends" /> },
        ]),

        { k: "stats", label: t("nav.stats", "Stats"), icon: <Icon name="stats" /> },
        { k: "settings", label: t("nav.settings", tr("Réglages", "Settings", "Ajustes")), icon: <Icon name="settings" /> },
        { k: "cast_host", label: t("nav.screens", tr("Écrans", "Screens", "Pantallas")), icon: <Icon name="cast_host" /> },
      ];

  const tap = (k: NavItem["k"]) => {
    (navigator as any)?.vibrate?.(8);

    if (k === "stats") {
      onChange("stats");
      return;
    }
    onChange(k);
  };

  const isTournamentRoute =
    value === "tournaments" ||
    value === "tournament_create" ||
    value === "tournament_list" ||
    value === "tournament_view" ||
    value === "tournament_match_play" ||
    value === "babyfoot_league" ||
    (value === "babyfoot_menu" && sportLc === "babyfoot");

  return (
    <>
      {activeBackgroundJob ? (() => {
        const job = activeBackgroundJob.state;
        const isRestore = activeBackgroundJob.kind === "restore";
        const dismiss = () => {
          if (job.status === "running") return;
          if (isRestore) dismissBackgroundRestoreState();
          else dismissBackgroundBackupState();
        };
        const runningTitle = isRestore ? "♻️ Restauration en arrière-plan" : "💾 Sauvegarde en arrière-plan";
        const successTitle = isRestore ? "✅ Restauration terminée" : "✅ Sauvegarde terminée";
        const errorTitle = isRestore ? "⚠️ Restauration interrompue" : "⚠️ Sauvegarde interrompue";
        return (
        <div
          role="status"
          aria-live="polite"
          onClick={dismiss}
          style={{
            position: "fixed",
            left: 10,
            right: 10,
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            zIndex: 79,
            minHeight: 46,
            padding: "8px 12px 10px",
            borderRadius: 15,
            border: `1px solid ${job.status === "error" ? "#fb7185" : job.status === "success" ? "#34d399" : accent}`,
            background: "rgba(3,8,18,.96)",
            boxShadow: `0 0 18px ${job.status === "error" ? "rgba(251,113,133,.35)" : job.status === "success" ? "rgba(52,211,153,.32)" : `${accent}55`}`,
            color: textMain,
            cursor: job.status === "running" ? "default" : "pointer",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {job.status === "running" ? runningTitle : job.status === "success" ? successTitle : errorTitle}
              </div>
              <div style={{ marginTop: 2, color: textSoft, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {job.message || job.label}
              </div>
            </div>
            <strong style={{ color: job.status === "error" ? "#fb7185" : job.status === "success" ? "#34d399" : accent, fontSize: 12 }}>
              {job.status === "running" ? `${Math.max(1, Math.round(job.progress))}%` : "×"}
            </strong>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,.10)", overflow: "hidden", marginTop: 7 }}>
            <div style={{ width: `${Math.max(job.status === "running" ? 4 : 100, job.progress)}%`, height: "100%", borderRadius: 99, background: job.status === "error" ? "#fb7185" : job.status === "success" ? "#34d399" : accent, transition: "width .25s ease" }} />
          </div>
        </div>
        );
      })() : null}
      <nav
      className="bottom-nav"
      role="navigation"
      aria-label="Navigation principale"
      style={{
        background: bg,
        borderTop: `1px solid ${borderTop}`,
      }}
    >
      {tabs.map((t) => {
        const activeStats = t.k === "stats" && value === "statsHub";
        const activeTournaments = t.k === "tournaments" && isTournamentRoute;
        const activeScreens = t.k === "cast_host" && (value === "viewer_host" || value === "cast_room");
        const activeOnline = t.k === "online" && (value === "online" || value === "friends");
        const activeMessages = t.k === "messages" && value === "messages";
        const active = value === t.k || activeStats || activeTournaments || activeScreens || activeOnline || activeMessages;

        const halo = active ? accent : "transparent";

        return (
          <button
            key={t.k}
            className={`tab pill ${active ? "is-active" : ""}`}
            onClick={() => tap(t.k)}
            aria-current={active ? "page" : undefined}
            title={t.label}
            style={{
              color: active ? accent : textSoft,
            }}
          >
            <span
              className="pill-inner"
              style={{
                borderColor: active ? accent : "transparent",
                boxShadow: active
                  ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC`
                  : "none",
                background: active ? "rgba(0,0,0,0.22)" : "transparent",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                position: "relative",
              }}
            >
              {t.k === "messages" && messageBadge > 0 ? (
                <span
                  aria-label={`${messageBadge} notification${messageBadge > 1 ? "s" : ""} à lire`}
                  style={{
                    position: "absolute",
                    top: -7,
                    right: 4,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #ff3bbd, #ffd44d)",
                    color: "#12040f",
                    fontSize: 10.5,
                    fontWeight: 1000,
                    lineHeight: 1,
                    border: "1px solid rgba(255,255,255,.65)",
                    boxShadow: "0 0 12px rgba(255,59,189,.75), 0 0 18px rgba(255,212,77,.45)",
                    zIndex: 3,
                    pointerEvents: "none",
                  }}
                >
                  {messageBadge > 99 ? "99+" : messageBadge}
                </span>
              ) : null}
              <span
                className="tab-icon"
                style={{
                  filter: active ? `drop-shadow(0 0 6px ${halo})` : "none",
                }}
              >
                {t.icon}
              </span>
              <span
                className="tab-label"
                style={{
                  color: active ? textMain : textSoft,
                }}
              >
                {t.label}
              </span>
            </span>
          </button>
        );
      })}
      <div className="bn-safe" />
      </nav>
    </>
  );
}
