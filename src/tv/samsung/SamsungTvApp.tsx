import * as React from "react";
import { fetchViewerSnapshot, normalizeViewerCode } from "../../lib/viewer/viewerClient";
import { getTicker } from "../../lib/tickers";
import type { ViewerLiveSnapshot } from "../../lib/viewer/types";
import { createViewerRealtimeConnection, type ViewerRealtimeConnection } from "../../lib/viewer/viewerRealtime";
import {
  VIEWER_TV_MENU,
  isViewerGameplayRoute,
  viewerMenuIndexForRoute,
  viewerRouteLabel,
} from "../../lib/viewer/viewerNavigation";
import {
  TV_SPORTS,
  tvLaunchActionsForSport,
  tvSportById,
  type TvLaunchAction,
  type TvSportId,
} from "./tvCatalog";
import tickerGolfOfficial from "../../assets/tickers/ticker_golf.png";
import tickerDartsRacerOfficial from "../../assets/tickers/ticker_darts_racer.png";
import type { SamsungTvNativeAppBoot } from "./tvNativeAppBridge";

const SamsungTvSharedAppHost = React.lazy(() => import("./SamsungTvSharedAppHost"));

const LAST_CODE_KEY = "mss_samsung_tv_last_viewer_code_v1";
const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
const GRID_COLUMNS = 8;
const TV_BUILD_MARKER = "MSS_TV_SHARED_APP_BUILD_20260919_06";
const TV_LIST_PAGE_SIZE = 12;
const TV_STATS_PROFILE_LIMIT = 8;

function clampIndex(value: number, count: number) {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Number.isFinite(value) ? value : 0));
}

type Copy = {
  title: string;
  subtitle: string;
  enterCode: string;
  hint: string;
  connect: string;
  clear: string;
  del: string;
  lastCode: string;
  invalid: string;
  back: string;
};

function getCopy(): Copy {
  const fr = String(navigator.language || "").toLowerCase().startsWith("fr");
  if (fr) {
    return {
      title: "MULTISPORTS SCORING",
      subtitle: "SAMSUNG TV · INTERACTIF",
      enterCode: "Entre le code Viewer affiché sur le téléphone ou ouvre le mode TV public",
      hint: "Télécommande : flèches pour naviguer · OK pour valider · Retour pour effacer",
      connect: "CONNECTER",
      clear: "EFFACER",
      del: "⌫",
      lastCode: "Dernier code",
      invalid: "Le code Viewer doit contenir 6 caractères.",
      back: "Changer de code",
    };
  }
  return {
    title: "MULTISPORTS SCORING",
    subtitle: "SAMSUNG TV · INTERACTIVE",
    enterCode: "Enter the Viewer code shown on your phone or open the public TV mode",
    hint: "Remote: arrows to navigate · OK to select · Back to delete",
    connect: "CONNECT",
    clear: "CLEAR",
    del: "⌫",
    lastCode: "Last code",
    invalid: "The Viewer code must contain 6 characters.",
    back: "Change code",
  };
}

function readLastCode() {
  try {
    return normalizeViewerCode(window.localStorage.getItem(LAST_CODE_KEY) || "").slice(0, CODE_LENGTH);
  } catch {
    return "";
  }
}

function saveLastCode(code: string) {
  try {
    if (code) window.localStorage.setItem(LAST_CODE_KEY, code);
    else window.localStorage.removeItem(LAST_CODE_KEY);
  } catch {}
}

function codeFromHash(hash: string) {
  const raw = String(hash || "");
  const match = raw.match(/^#\/(?:viewer|tv)\/([^?#]+)/i);
  return normalizeViewerCode(match?.[1] || "").slice(0, CODE_LENGTH);
}

function preferTvHashNamespace() {
  try {
    const hash = String(window.location.hash || "").toLowerCase();
    const path = String(window.location.pathname || "").toLowerCase();
    return hash === "#/tv" || hash.startsWith("#/tv/") || path === "/tv" || path.startsWith("/tv/");
  } catch {
    return false;
  }
}

function setHash(code: string | null) {
  const base = preferTvHashNamespace() ? "#/tv" : "#/viewer";
  const next = code ? `${base}/${encodeURIComponent(code)}` : base;
  try {
    if (window.location.hash !== next) window.location.hash = next;
  } catch {}
}

function exitTizenApp() {
  try {
    const tizen = (window as any).tizen;
    tizen?.application?.getCurrentApplication?.()?.exit?.();
  } catch {}
}

function useTizenStartup() {
  React.useEffect(() => {
    document.documentElement.dataset.mssSamsungTv = "1";
    document.body.dataset.mssSamsungTv = "1";
    return () => {
      delete document.documentElement.dataset.mssSamsungTv;
      delete document.body.dataset.mssSamsungTv;
    };
  }, []);
}

function TvJoin({ onJoin }: { onJoin: (code: string) => void }) {
  const copy = React.useMemo(getCopy, []);
  const [code, setCode] = React.useState(readLastCode);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [error, setError] = React.useState("");
  const totalKeys = CODE_CHARS.length + 3;
  const connectIndex = totalKeys - 1;
  const clearIndex = totalKeys - 2;
  const deleteIndex = totalKeys - 3;

  const append = React.useCallback((ch: string) => {
    setError("");
    setCode((prev) => normalizeViewerCode(`${prev}${ch}`).slice(0, CODE_LENGTH));
  }, []);

  const removeOne = React.useCallback(() => {
    setError("");
    setCode((prev) => prev.slice(0, -1));
  }, []);

  const submit = React.useCallback(() => {
    const clean = normalizeViewerCode(code).slice(0, CODE_LENGTH);
    if (clean.length !== CODE_LENGTH) {
      setError(copy.invalid);
      return;
    }
    saveLastCode(clean);
    onJoin(clean);
  }, [code, copy.invalid, onJoin]);

  const activate = React.useCallback((index: number) => {
    if (index < CODE_CHARS.length) return append(CODE_CHARS[index]);
    if (index === deleteIndex) return removeOne();
    if (index === clearIndex) {
      setCode("");
      setError("");
      return;
    }
    if (index === connectIndex) submit();
  }, [append, clearIndex, connectIndex, deleteIndex, removeOne, submit]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = String(event.key || "");
      const keyCode = Number((event as any).keyCode || (event as any).which || 0);
      if (keyCode === 10009 || key === "BrowserBack" || key === "GoBack") {
        event.preventDefault();
        if (code) removeOne();
        else exitTizenApp();
        return;
      }
      const upper = key.toUpperCase();
      if (upper.length === 1 && CODE_CHARS.includes(upper)) {
        event.preventDefault();
        append(upper);
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        removeOne();
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        activate(focusIndex);
        return;
      }
      let next = focusIndex;
      if (key === "ArrowLeft") next = Math.max(0, focusIndex - 1);
      else if (key === "ArrowRight") next = Math.min(totalKeys - 1, focusIndex + 1);
      else if (key === "ArrowUp") next = Math.max(0, focusIndex - GRID_COLUMNS);
      else if (key === "ArrowDown") next = Math.min(totalKeys - 1, focusIndex + GRID_COLUMNS);
      else return;
      event.preventDefault();
      setFocusIndex(next);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [activate, append, code, focusIndex, removeOne, totalKeys]);

  const renderKey = (label: string, index: number, kind: "char" | "delete" | "clear" | "connect" = "char") => {
    const active = focusIndex === index;
    return (
      <button key={`${label}-${index}`} type="button" tabIndex={-1} className={`mss-tv-key mss-tv-key--${kind}${active ? " is-focused" : ""}`} onMouseEnter={() => setFocusIndex(index)} onClick={() => activate(index)}>
        {label}
      </button>
    );
  };

  return (
    <main className="mss-tv-join">
      <section className="mss-tv-join-card">
        <header className="mss-tv-brand">
          <div className="mss-tv-brand-title">{copy.title}</div>
          <div className="mss-tv-brand-subtitle">{copy.subtitle}</div>
        </header>
        <div className="mss-tv-join-copy">{copy.enterCode}</div>
        <div className="mss-tv-code" aria-label="Viewer code">
          {Array.from({ length: CODE_LENGTH }).map((_, index) => <span key={index} className={code[index] ? "is-filled" : ""}>{code[index] || "·"}</span>)}
        </div>
        <div className="mss-tv-keypad">
          {CODE_CHARS.map((ch, index) => renderKey(ch, index))}
          {renderKey(copy.del, deleteIndex, "delete")}
          {renderKey(copy.clear, clearIndex, "clear")}
          {renderKey(copy.connect, connectIndex, "connect")}
        </div>
        {error ? <div className="mss-tv-error">{error}</div> : null}
        <footer className="mss-tv-help">
          <span>{copy.hint}</span>
          {readLastCode() ? <span>{copy.lastCode}: {readLastCode()}</span> : null}
        </footer>
      </section>
    </main>
  );
}

type PhoneNavigation = {
  tab: string;
  label: string;
  gameplay: boolean;
  params?: any;
  gameConfig?: any;
  at: number;
};

type TvProfile = {
  id: string;
  name: string;
  avatar?: string | null;
  countryCode?: string;
  stats?: {
    games?: number;
    wins?: number;
    losses?: number;
    avg3?: number;
    bestVisit?: number;
    bestCheckout?: number;
    h180?: number;
    coRate?: number;
  };
};

type TvFriend = {
  id: string;
  name: string;
  status: string;
};

type TvState = {
  activeSport: TvSportId;
  activeProfileId: string | null;
  profiles: TvProfile[];
  friends: TvFriend[];
  inProgress: Array<{
    id: string;
    kind: string;
    updatedAt: number;
    players: Array<{ id: string; name: string }>;
  }>;
  settings: {
    lang: string;
    defaultX01: number;
    doubleOut: boolean;
    randomOrder: boolean;
    ttsOnThird: boolean;
    neonTheme: boolean;
  };
  theme: {
    id: string;
    primary: string;
    accent: string;
    bg: string;
    card: string;
    text: string;
    textSoft: string;
    texture: string;
    textureOpacity: string;
  };
  at: number;
};

type TvScreen =
  | "hub"
  | "sports"
  | "sport"
  | "profiles"
  | "profile_detail"
  | "profile_edit"
  | "stats"
  | "online"
  | "agenda"
  | "settings"
  | "setup"
  | "setup_picker"
  | "scoreboard";

const EMPTY_TV_STATE: TvState = {
  activeSport: "darts",
  activeProfileId: null,
  profiles: [],
  friends: [],
  inProgress: [],
  settings: {
    lang: "fr",
    defaultX01: 501,
    doubleOut: true,
    randomOrder: false,
    ttsOnThird: false,
    neonTheme: true,
  },
  theme: {
    id: "gold",
    primary: "#ffd56a",
    accent: "#4fb4ff",
    bg: "#05070b",
    card: "#101522",
    text: "#f8fafc",
    textSoft: "rgba(255,255,255,.62)",
    texture: "none",
    textureOpacity: "0",
  },
  at: 0,
};

function connectionText(status: string) {
  if (status === "connected") return "TÉLÉPHONE CONNECTÉ";
  if (status === "connecting") return "CONNEXION…";
  if (status === "error") return "CONNEXION DÉGRADÉE";
  return "TÉLÉPHONE HORS LIGNE";
}

function screenForPhoneTab(tab: string): TvScreen | null {
  const value = String(tab || "");
  if (!value) return null;
  if (isViewerGameplayRoute(value)) return "scoreboard";
  if (value === "gameSelect") return "sports";
  if (value === "games" || value === "home" || value.endsWith("_config") || value.includes(".config")) return "sport";
  if (value.startsWith("profile")) return "profiles";
  if (value === "online" || value.startsWith("message") || value.startsWith("spectator")) return "online";
  if (value.startsWith("stats") || value.includes("leaderboard")) return "stats";
  if (value === "agenda" || value.includes("calendar")) return "agenda";
  if (value === "settings" || value.startsWith("cast_") || value.startsWith("viewer_")) return "settings";
  return null;
}

function TvWatermark({ src, strong = false }: { src?: string; strong?: boolean }) {
  if (!src) return null;
  return (
    <span className={`mss-tv-card-watermark${strong ? " is-strong" : ""}`} aria-hidden="true">
      <img src={src} alt="" draggable={false} />
    </span>
  );
}

function TvProfileAvatar({ profile, size = "medium" }: { profile?: TvProfile | null; size?: "small" | "medium" | "large" }) {
  const name = String(profile?.name || "?");
  return (
    <span className={`mss-tv-avatar mss-tv-avatar--${size}`}>
      {profile?.avatar ? <img src={profile.avatar} alt="" draggable={false} /> : <b>{name.slice(0, 2).toUpperCase()}</b>}
    </span>
  );
}

function applyTvTheme(theme: TvState["theme"]) {
  try {
    const root = document.documentElement;
    root.dataset.mssTvTheme = String(theme?.id || "gold");
    root.style.setProperty("--mss-tv-accent", theme?.primary || "#ffd56a");
    root.style.setProperty("--mss-tv-accent-2", theme?.accent || "#4fb4ff");
    root.style.setProperty("--mss-tv-bg", theme?.bg || "#05070b");
    root.style.setProperty("--mss-tv-card", theme?.card || "#101522");
    root.style.setProperty("--mss-tv-text", theme?.text || "#f8fafc");
    root.style.setProperty("--mss-tv-muted", theme?.textSoft || "rgba(255,255,255,.62)");
  } catch {}
}

const TV_SPORT_HERO_TICKERS: Record<TvSportId, string[]> = {
  darts: ["darts_games", "menu_games", "darts"],
  petanque: ["petanque_games", "petanque_menu_games", "petanque_1v1"],
  pingpong: ["pingpong_games", "pingpong_1v1"],
  babyfoot: ["babyfoot_games", "babyfoot_match", "babyfoot_1v1"],
  molkky: ["molkky_games", "molkky_classic"],
  dicegame: ["dice_games", "dice_duel"],
  foot: ["foot_games", "foot_home", "foot_1v1"],
  running: ["running_games", "running"],
  fit: ["fit_games", "fit_perf", "fit"],
  esports: ["esports_games", "esports"],
};

function firstTicker(keys: Array<string | null | undefined>) {
  for (const key of keys) {
    if (!key) continue;
    try {
      const hit = getTicker(String(key));
      if (hit) return hit;
    } catch {}
  }
  return null;
}

function tvSportHeroImage(sportId: TvSportId) {
  const sport = tvSportById(sportId);
  return firstTicker(TV_SPORT_HERO_TICKERS[sportId] || []) || sport.art;
}

function tvActionImage(sportId: TvSportId, action: TvLaunchAction) {
  if (sportId === "darts" && action.id === "golf") return tickerGolfOfficial;
  if (sportId === "darts" && action.id === "mario_kart") return tickerDartsRacerOfficial;
  if (sportId === "darts" && action.id === "killer_progressive") {
    return firstTicker(["killer"]) || tvSportById(sportId).logo;
  }
  const candidates = [
    ...(action.tickerKeys || []),
    `${sportId}_${action.id}`,
    action.id,
    action.params?.presetVariantId,
    action.params?.preset,
    action.params?.format ? `${sportId}_${action.params.format}` : null,
  ];
  return firstTicker(candidates) || tvSportById(sportId).logo;
}

function useKeepFocusedVisible(focusIndex: number, screen: TvScreen) {
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const node = document.querySelector<HTMLElement>(".is-focused");
        node?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusIndex, screen]);
}

function TvPageHeader({
  title,
  subtitle,
  connectionStatus,
}: {
  title: string;
  subtitle: string;
  connectionStatus: string;
}) {
  return (
    <header className="mss-tv-page-header">
      <div>
        <div className="mss-tv-page-eyebrow">MULTISPORTS SCORING TV</div>
        <div className="mss-tv-page-title">{title}</div>
        <div className="mss-tv-page-subtitle">{subtitle}</div>
      </div>
      <div className={`mss-tv-link-state is-${connectionStatus}`}>
        <span className="mss-tv-link-dot" />
        {connectionText(connectionStatus)}
      </div>
    </header>
  );
}

function TvHub({
  sessionId,
  snapshot,
  connectionStatus,
  phoneNavigation,
  tvState,
  focusIndex,
  onFocus,
  onActivate,
}: {
  sessionId: string;
  snapshot: ViewerLiveSnapshot | null;
  connectionStatus: string;
  phoneNavigation: PhoneNavigation | null;
  tvState: TvState;
  focusIndex: number;
  onFocus: (index: number) => void;
  onActivate: (index: number) => void;
}) {
  const live = !!snapshot && Array.isArray(snapshot.players) && snapshot.players.length > 0 && snapshot.phase !== "lobby";
  const active = snapshot?.players?.find((p) => p.isActive) || snapshot?.players?.[0] || null;
  const activeSport = tvSportById(tvState.activeSport);
  return (
    <main className="mss-tv-hub" data-build={TV_BUILD_MARKER}>
      <header className="mss-tv-hub-header">
        <div>
          <div className="mss-tv-hub-title">MULTISPORTS SCORING</div>
          <div className="mss-tv-hub-subtitle">TV COMPLÈTE · SESSION {sessionId}</div>
          <div className="mss-tv-build-marker">TV SHARED APP V6 · 2026.09.19-06</div>
        </div>
        <div className={`mss-tv-link-state is-${connectionStatus}`}>
          <span className="mss-tv-link-dot" />
          {connectionText(connectionStatus)}
        </div>
      </header>

      <section className="mss-tv-billboard" style={{ ["--sport-accent" as any]: activeSport.accent }}>
        <img className="mss-tv-billboard-art" src={activeSport.art} alt="" draggable={false} />
        <TvWatermark src={activeSport.logo} strong />
        <div className="mss-tv-billboard-kicker">{live ? "EN DIRECT MAINTENANT" : "EXPÉRIENCE TV COMPLÈTE"}</div>
        <div className="mss-tv-billboard-title">
          {live ? `${String(snapshot?.game || activeSport.label).toUpperCase()} · ${active?.name || "Joueur"}` : `${activeSport.label} sur grand écran`}
        </div>
        <div className="mss-tv-billboard-copy">
          {live
            ? `${active?.name || "Joueur"} joue actuellement · score ${active?.score ?? "—"} · pilotage simultané téléphone + télécommande.`
            : `${activeSport.label} sélectionné · lance une partie, consulte les profils, les stats et l'online directement sur la TV.`}
        </div>
        <div className="mss-tv-billboard-meta">
          <span>SESSION {sessionId}</span>
          <span>{phoneNavigation?.label || "ACCUEIL TV"}</span>
          <span>{tvState.profiles.length} PROFILS</span>
          <span>{tvState.friends.length} AMIS</span>
        </div>
      </section>

      <section className="mss-tv-shelf">
        <div className="mss-tv-shelf-head">
          <div className="mss-tv-shelf-title">Parcourir</div>
          <div className="mss-tv-shelf-subtitle">Navigation type streaming · accès direct à toutes les rubriques TV</div>
        </div>
        <section className="mss-tv-menu-grid">
        {VIEWER_TV_MENU.map((item, index) => {
          const focused = focusIndex === index;
          const isScoreboard = item.kind === "scoreboard";
          const label = isScoreboard ? (live ? "PARTIE EN COURS" : "LANCER UNE PARTIE") : item.label;
          const subtitle = isScoreboard
            ? (live ? "Ouvrir le scoreboard live" : "Choisir un sport et démarrer")
            : item.subtitle;
          return (
            <button
              key={item.id}
              type="button"
              tabIndex={-1}
              className={`mss-tv-menu-card mss-tv-menu-card--clean${focused ? " is-focused" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onActivate(index)}
            >
              <span className="mss-tv-menu-label">{label}</span>
              {isScoreboard && live ? <span className="mss-tv-live-pill">LIVE</span> : null}
            </button>
          );
        })}
        </section>
      </section>

      <footer className="mss-tv-hub-footer">
        <span>← ↑ ↓ → naviguer · OK ouvrir</span>
        <span>Retour : écran précédent · changer de code</span>
      </footer>
    </main>
  );
}

function TvSports({
  connectionStatus,
  activeSport,
  focusIndex,
  onFocus,
  onChoose,
}: {
  connectionStatus: string;
  activeSport: TvSportId;
  focusIndex: number;
  onFocus: (index: number) => void;
  onChoose: (sport: TvSportId) => void;
}) {
  return (
    <main className="mss-tv-section mss-tv-section--sports">
      <TvPageHeader
        title="SPORTS"
        subtitle="Choisis une discipline. Une carte = un logo, sans surcharge visuelle."
        connectionStatus={connectionStatus}
      />
      <section className="mss-tv-sport-grid mss-tv-scroll-region">
        {TV_SPORTS.map((sport, index) => (
          <button
            type="button"
            tabIndex={-1}
            aria-label={sport.label}
            key={sport.id}
            className={`mss-tv-sport-card mss-tv-sport-card--logo${index === focusIndex ? " is-focused" : ""}${sport.id === activeSport ? " is-active" : ""}`}
            style={{ ["--sport-accent" as any]: sport.accent }}
            onMouseEnter={() => onFocus(index)}
            onClick={() => onChoose(sport.id)}
          >
            <img className="mss-tv-sport-logo-only" src={sport.logo} alt={sport.label} draggable={false} />
          </button>
        ))}
      </section>
      <footer className="mss-tv-page-footer">
        <span>OK : ouvrir le sport · Retour : menu TV</span>
        <span>{tvSportById(TV_SPORTS[focusIndex]?.id || activeSport).label}</span>
      </footer>
    </main>
  );
}

function TvSportLauncher({
  connectionStatus,
  sportId,
  focusIndex,
  onFocus,
  onLaunch,
}: {
  connectionStatus: string;
  sportId: TvSportId;
  focusIndex: number;
  onFocus: (index: number) => void;
  onLaunch: (action: TvLaunchAction) => void;
}) {
  const sport = tvSportById(sportId);
  const actions = tvLaunchActionsForSport(sportId);
  const pageSize = 12;
  const page = Math.floor(Math.max(0, focusIndex) / pageSize);
  const start = page * pageSize;
  const visible = actions.slice(start, start + pageSize);
  const heroImage = tvSportHeroImage(sportId);

  return (
    <main className="mss-tv-section mss-tv-section--launcher">
      <TvPageHeader
        title={sport.label}
        subtitle="Choisis le ticker officiel du mode de jeu. OK ouvre sa configuration guidée TV."
        connectionStatus={connectionStatus}
      />
      <div className="mss-tv-launcher-body mss-tv-scroll-region">
        <section className="mss-tv-sport-hero mss-tv-sport-hero--contained" style={{ ["--sport-accent" as any]: sport.accent }}>
          <img className="mss-tv-sport-hero-art" src={heroImage} alt={sport.label} draggable={false} />
          {actions.length > pageSize ? <div className="mss-tv-page-count">{page + 1} / {Math.ceil(actions.length / pageSize)}</div> : null}
        </section>
        <section className="mss-tv-action-grid mss-tv-action-grid--tickers">
          {visible.map((action, localIndex) => {
            const index = start + localIndex;
            const ticker = tvActionImage(sportId, action);
            return (
              <button
                type="button"
                tabIndex={-1}
                aria-label={action.label}
                key={`${action.id}-${index}`}
                className={`mss-tv-action-card mss-tv-action-card--ticker${focusIndex === index ? " is-focused" : ""}`}
                onMouseEnter={() => onFocus(index)}
                onClick={() => onLaunch(action)}
              >
                <img className="mss-tv-action-ticker" src={ticker} alt={action.label} draggable={false} />
              </button>
            );
          })}
        </section>
      </div>
      <footer className="mss-tv-page-footer">
        <span>OK : configuration guidée · Retour : SPORTS</span>
        {actions[focusIndex] ? <span>{actions[focusIndex].label}</span> : null}
      </footer>
    </main>
  );
}

function TvProfiles({
  connectionStatus,
  tvState,
  focusIndex,
  onFocus,
  onOpen,
  onCreate,
}: {
  connectionStatus: string;
  tvState: TvState;
  focusIndex: number;
  onFocus: (index: number) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const entries: Array<TvProfile | null> = [null, ...tvState.profiles];
  const page = Math.floor(Math.max(0, focusIndex) / TV_LIST_PAGE_SIZE);
  const pageStart = page * TV_LIST_PAGE_SIZE;
  const visibleEntries = entries.slice(pageStart, pageStart + TV_LIST_PAGE_SIZE);
  return (
    <main className="mss-tv-section mss-tv-section--profiles">
      <TvPageHeader title="PROFILS" subtitle="Créer, consulter, activer, renommer ou supprimer un profil directement depuis la TV." connectionStatus={connectionStatus} />
      <section className="mss-tv-profile-grid mss-tv-scroll-region">
        {visibleEntries.map((profile, localIndex) => {
          const index = pageStart + localIndex;
          if (!profile) {
            return (
              <button
                type="button"
                tabIndex={-1}
                key="create-profile"
                className={`mss-tv-profile-card mss-tv-profile-card--create${focusIndex === index ? " is-focused" : ""}`}
                onMouseEnter={() => onFocus(index)}
                onClick={onCreate}
              >
                <span className="mss-tv-profile-create-plus">＋</span>
                <span className="mss-tv-profile-name">CRÉER UN PROFIL</span>
                <span className="mss-tv-profile-meta">Depuis la télécommande</span>
              </button>
            );
          }
          return (
            <button
              type="button"
              tabIndex={-1}
              key={profile.id}
              className={`mss-tv-profile-card${focusIndex === index ? " is-focused" : ""}${profile.id === tvState.activeProfileId ? " is-active" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onOpen(profile.id)}
            >
              <TvProfileAvatar profile={profile} size="medium" />
              <span className="mss-tv-profile-name">{profile.name}</span>
              <span className="mss-tv-profile-meta">{profile.id === tvState.activeProfileId ? "PROFIL ACTIF" : "OK pour consulter / modifier"}</span>
              <span className="mss-tv-profile-kpis">{statValue(profile.stats?.games)} parties · {statValue(profile.stats?.wins)} victoires</span>
            </button>
          );
        })}
      </section>
      <footer className="mss-tv-page-footer">
        <span>OK : ouvrir · Retour : menu TV</span>
        {entries.length > TV_LIST_PAGE_SIZE ? <span>PAGE {page + 1}/{Math.ceil(entries.length / TV_LIST_PAGE_SIZE)}</span> : null}
      </footer>
    </main>
  );
}

function statValue(value: any, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return decimals ? n.toFixed(decimals) : String(Math.round(n));
}

type ProfileEditorState = {
  mode: "create" | "rename";
  profileId: string | null;
  name: string;
};

const TV_PROFILE_KEYS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((label) => ({ id: label, label, kind: "char" as const })),
  { id: "space", label: "ESPACE", kind: "space" as const },
  { id: "delete", label: "⌫", kind: "delete" as const },
  { id: "clear", label: "EFFACER", kind: "clear" as const },
  { id: "save", label: "ENREGISTRER", kind: "save" as const },
];

function TvProfileDetail({
  connectionStatus, profile, isActive, focusIndex, deleteArmed, onFocus, onAction,
}: {
  connectionStatus: string;
  profile: TvProfile;
  isActive: boolean;
  focusIndex: number;
  deleteArmed: boolean;
  onFocus: (index: number) => void;
  onAction: (action: "activate" | "stats" | "rename" | "phone" | "delete") => void;
}) {
  const s = profile.stats || {};
  const actions = [
    { id: "activate", label: isActive ? "PROFIL ACTIF" : "DÉFINIR ACTIF", value: isActive ? "✓" : "OK" },
    { id: "stats", label: "CONSULTER LES STATS", value: `${statValue(s.games)} parties` },
    { id: "rename", label: "RENOMMER", value: profile.name },
    { id: "phone", label: "ÉDITION AVANCÉE", value: "Téléphone" },
    { id: "delete", label: deleteArmed ? "CONFIRMER SUPPRESSION" : "SUPPRIMER", value: deleteArmed ? "OK À NOUVEAU" : "" },
  ] as const;
  return (
    <main className="mss-tv-section mss-tv-section--profile-detail">
      <TvPageHeader title="PROFIL" subtitle="Consultation et gestion du profil depuis la TV." connectionStatus={connectionStatus} />
      <section className="mss-tv-profile-detail-layout mss-tv-scroll-region">
        <article className="mss-tv-profile-identity-card">
          <TvProfileAvatar profile={profile} size="large" />
          <div className="mss-tv-profile-detail-name">{profile.name}</div>
          <div className="mss-tv-profile-detail-badge">{isActive ? "PROFIL ACTIF" : "PROFIL LOCAL"}</div>
          <div className="mss-tv-profile-detail-stats">
            <span><b>{statValue(s.games)}</b>PARTIES</span>
            <span><b>{statValue(s.wins)}</b>VICTOIRES</span>
            <span><b>{statValue(s.avg3, 1)}</b>MOY. / 3</span>
            <span><b>{statValue(s.bestCheckout)}</b>BEST CO</span>
          </div>
        </article>
        <div className="mss-tv-profile-actions">
          {actions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              tabIndex={-1}
              className={`mss-tv-setting-card${focusIndex === index ? " is-focused" : ""}${action.id === "delete" ? " is-danger" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onAction(action.id)}
            >
              <span>{action.label}</span><b>{action.value}</b>
            </button>
          ))}
        </div>
      </section>
      <footer className="mss-tv-page-footer">OK : action · Retour : PROFILS</footer>
    </main>
  );
}

function TvProfileEditor({
  connectionStatus, editor, focusIndex, onFocus, onActivate,
}: {
  connectionStatus: string;
  editor: ProfileEditorState;
  focusIndex: number;
  onFocus: (index: number) => void;
  onActivate: (index: number) => void;
}) {
  return (
    <main className="mss-tv-section mss-tv-section--profile-editor">
      <TvPageHeader title={editor.mode === "create" ? "CRÉER UN PROFIL" : "RENOMMER LE PROFIL"} subtitle="Saisie du nom avec la télécommande Samsung." connectionStatus={connectionStatus} />
      <section className="mss-tv-profile-editor mss-tv-scroll-region">
        <div className="mss-tv-profile-name-input">{editor.name || "NOM DU PROFIL"}</div>
        <div className="mss-tv-profile-keyboard">
          {TV_PROFILE_KEYS.map((key, index) => (
            <button
              key={key.id}
              type="button"
              tabIndex={-1}
              className={`mss-tv-profile-key is-${key.kind}${focusIndex === index ? " is-focused" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onActivate(index)}
            >{key.label}</button>
          ))}
        </div>
      </section>
      <footer className="mss-tv-page-footer">OK : saisir · Retour : annuler</footer>
    </main>
  );
}

function TvStats({
  connectionStatus,
  tvState,
  focusIndex,
  onFocus,
  onSelectProfile,
}: {
  connectionStatus: string;
  tvState: TvState;
  focusIndex: number;
  onFocus: (index: number) => void;
  onSelectProfile: (id: string) => void;
}) {
  const profiles = tvState.profiles;
  const selected = profiles[focusIndex] || profiles.find((profile) => profile.id === tvState.activeProfileId) || profiles[0];
  const s = selected?.stats || {};
  return (
    <main className="mss-tv-section">
      <TvPageHeader title="STATS" subtitle="Performances synchronisées depuis les profils du téléphone." connectionStatus={connectionStatus} />
      {profiles.length ? (
        <>
          <section className="mss-tv-profile-strip">
            {profiles.slice(0, 8).map((profile, index) => (
              <button
                type="button"
                tabIndex={-1}
                key={profile.id}
                className={`mss-tv-profile-chip${focusIndex === index ? " is-focused" : ""}`}
                onMouseEnter={() => onFocus(index)}
                onClick={() => onSelectProfile(profile.id)}
              >
                <TvProfileAvatar profile={profile} size="small" />
                <span>{profile.name}</span>
              </button>
            ))}
          </section>
          <section className="mss-tv-stats-layout">
            <div className="mss-tv-stats-player"><TvProfileAvatar profile={selected} size="large" /><span>{selected?.name || "Joueur"}</span></div>
            <div className="mss-tv-stat-grid">
              <div className="mss-tv-stat-card"><b>{statValue(s.games)}</b><span>PARTIES</span></div>
              <div className="mss-tv-stat-card"><b>{statValue(s.wins)}</b><span>VICTOIRES</span></div>
              <div className="mss-tv-stat-card"><b>{statValue(s.avg3, 1)}</b><span>MOY. / 3</span></div>
              <div className="mss-tv-stat-card"><b>{statValue(s.bestVisit)}</b><span>MEILLEURE VOLÉE</span></div>
              <div className="mss-tv-stat-card"><b>{statValue(s.bestCheckout)}</b><span>MEILLEUR CO</span></div>
              <div className="mss-tv-stat-card"><b>{statValue(s.h180)}</b><span>180</span></div>
            </div>
          </section>
        </>
      ) : <div className="mss-tv-empty">Aucune statistique profil synchronisée.</div>}
      <footer className="mss-tv-page-footer">← → : changer de profil · Retour : menu TV</footer>
    </main>
  );
}

function TvOnline({
  connectionStatus,
  friends,
  focusIndex,
  onFocus,
}: {
  connectionStatus: string;
  friends: TvFriend[];
  focusIndex: number;
  onFocus: (index: number) => void;
}) {
  return (
    <main className="mss-tv-section">
      <TvPageHeader title="ONLINE" subtitle="Présence communautaire synchronisée avec le téléphone." connectionStatus={connectionStatus} />
      {friends.length ? (
        <section className="mss-tv-profile-grid">
          {friends
            .slice(Math.floor(focusIndex / TV_LIST_PAGE_SIZE) * TV_LIST_PAGE_SIZE, Math.floor(focusIndex / TV_LIST_PAGE_SIZE) * TV_LIST_PAGE_SIZE + TV_LIST_PAGE_SIZE)
            .map((friend, localIndex) => {
              const pageStart = Math.floor(focusIndex / TV_LIST_PAGE_SIZE) * TV_LIST_PAGE_SIZE;
              const index = pageStart + localIndex;
              return (
            <button
              type="button"
              tabIndex={-1}
              key={friend.id}
              className={`mss-tv-profile-card${focusIndex === index ? " is-focused" : ""}`}
              onMouseEnter={() => onFocus(index)}
            >
              <span className={`mss-tv-online-dot is-${friend.status}`} />
              <span className="mss-tv-profile-name">{friend.name}</span>
              <span className="mss-tv-profile-meta">{friend.status.toUpperCase()}</span>
            </button>
              );
            })}
        </section>
      ) : <div className="mss-tv-empty">Aucun ami synchronisé pour le moment.</div>}
      <footer className="mss-tv-page-footer">
        <span>Retour : menu TV</span>
        {friends.length > TV_LIST_PAGE_SIZE ? <span>PAGE {Math.floor(focusIndex / TV_LIST_PAGE_SIZE) + 1}/{Math.ceil(friends.length / TV_LIST_PAGE_SIZE)}</span> : null}
      </footer>
    </main>
  );
}

function TvAgenda({ connectionStatus }: { connectionStatus: string }) {
  return (
    <main className="mss-tv-section">
      <TvPageHeader title="AGENDA" subtitle="Agenda MULTISPORTS SCORING synchronisé avec l'écran du téléphone." connectionStatus={connectionStatus} />
      <section className="mss-tv-info-panels">
        <div className="mss-tv-info-card">
          <b>AGENDA MULTISPORTS</b>
          <span>La navigation Agenda est maintenant réellement ouverte sur la TV et le téléphone. La grille détaillée des événements sera branchée sur le même canal de données dans l'étape suivante.</span>
        </div>
      </section>
      <footer className="mss-tv-page-footer">Retour : menu TV</footer>
    </main>
  );
}

function TvSettings({
  connectionStatus,
  settings,
  focusIndex,
  onFocus,
  onAction,
}: {
  connectionStatus: string;
  settings: TvState["settings"];
  focusIndex: number;
  onFocus: (index: number) => void;
  onAction: (key: string, value: any) => void;
}) {
  const scores = [301, 501, 701, 901];
  const currentScoreIndex = Math.max(0, scores.indexOf(Number(settings.defaultX01)));
  const items = [
    {
      key: "defaultX01",
      label: "X01 PAR DÉFAUT",
      value: String(settings.defaultX01 || 501),
      next: scores[(currentScoreIndex + 1) % scores.length],
    },
    { key: "doubleOut", label: "DOUBLE OUT", value: settings.doubleOut ? "ON" : "OFF", next: !settings.doubleOut },
    { key: "randomOrder", label: "ORDRE ALÉATOIRE", value: settings.randomOrder ? "ON" : "OFF", next: !settings.randomOrder },
    { key: "ttsOnThird", label: "ANNONCES VOCALES", value: settings.ttsOnThird ? "ON" : "OFF", next: !settings.ttsOnThird },
    { key: "neonTheme", label: "THÈME NÉON", value: settings.neonTheme ? "ON" : "OFF", next: !settings.neonTheme },
  ];
  return (
    <main className="mss-tv-section">
      <TvPageHeader title="RÉGLAGES" subtitle="Quelques réglages globaux peuvent maintenant être modifiés directement avec la télécommande." connectionStatus={connectionStatus} />
      <section className="mss-tv-settings-grid">
        {items.map((item, index) => (
          <button
            type="button"
            tabIndex={-1}
            key={item.key}
            className={`mss-tv-setting-card${focusIndex === index ? " is-focused" : ""}`}
            onMouseEnter={() => onFocus(index)}
            onClick={() => onAction(item.key, item.next)}
          >
            <span>{item.label}</span>
            <b>{item.value}</b>
          </button>
        ))}
      </section>
      <footer className="mss-tv-page-footer">OK : modifier · Retour : menu TV</footer>
    </main>
  );
}


type GuidedSetupState = {
  sportId: TvSportId;
  actionId: string;
  playerCount: number;
  playerIndexes: number[];
  startScore: 301 | 501 | 701 | 901;
  inMode: "single" | "double" | "master";
  outMode: "single" | "double" | "master";
  legsPerSet: number;
  setsToWin: number;
  serveMode: "alternate" | "random";
  targetScore: number;
  pointsPerSet: number;
  winByTwo: boolean;
  goldenGoal: boolean;
  durationMin: number;
};

type GuidedSetupRow = {
  id: string;
  label: string;
  value: string;
  primary?: boolean;
  run: () => void;
};

type GuidedPickerOption = {
  id: string;
  label: string;
  value: any;
  profile?: TvProfile;
};

function guidedPickerOptions(rowId: string, state: GuidedSetupState, action: TvLaunchAction, profiles: TvProfile[]): GuidedPickerOption[] {
  const minPlayers = Math.max(1, Number(action.minPlayers || 1));
  const maxByAction = Math.max(minPlayers, Number(action.maxPlayers || 8));
  const maxPlayers = profiles.length ? Math.min(maxByAction, profiles.length) : minPlayers;
  if (rowId === "player-count") {
    return Array.from({ length: Math.max(1, maxPlayers - minPlayers + 1) }, (_, index) => {
      const value = minPlayers + index;
      return { id: `count-${value}`, label: `${value} JOUEUR${value > 1 ? "S" : ""}`, value };
    });
  }
  if (rowId.startsWith("player-")) {
    return profiles.map((profile, index) => ({ id: profile.id || `profile-${index}`, label: profile.name || `Joueur ${index + 1}`, value: index, profile }));
  }
  if (rowId === "score") return [301, 501, 701, 901].map((value) => ({ id: String(value), label: String(value), value }));
  if (rowId === "in") return [
    { id: "single", label: "SINGLE IN", value: "single" },
    { id: "double", label: "DOUBLE IN", value: "double" },
    { id: "master", label: "MASTER IN", value: "master" },
  ];
  if (rowId === "out") return [
    { id: "single", label: "SINGLE OUT", value: "single" },
    { id: "double", label: "DOUBLE OUT", value: "double" },
    { id: "master", label: "MASTER OUT", value: "master" },
  ];
  if (rowId === "legs") return [1, 2, 3, 5].map((value) => ({ id: `legs-${value}`, label: `${value} LEG${value > 1 ? "S" : ""}`, value }));
  if (rowId === "sets") {
    const values = state.sportId === "pingpong" ? [1, 2, 3, 4] : state.sportId === "babyfoot" ? [1, 2, 3] : [1, 2, 3, 5];
    return values.map((value) => ({ id: `sets-${value}`, label: `${value} SET${value > 1 ? "S" : ""}`, value }));
  }
  if (rowId === "serve") return [
    { id: "alternate", label: "ORDRE ALTERNÉ", value: "alternate" },
    { id: "random", label: "ORDRE ALÉATOIRE", value: "random" },
  ];
  if (rowId === "target") {
    const values = state.sportId === "petanque" ? [7, 11, 13, 15] : state.sportId === "babyfoot" ? [1, 5, 7, 9, 10] : state.sportId === "molkky" ? [30, 40, 50] : [100, 200, 500, 1000, 10000];
    return values.map((value) => ({ id: `target-${value}`, label: String(value), value }));
  }
  if (rowId === "points") return [11, 21].map((value) => ({ id: `points-${value}`, label: `${value} POINTS`, value }));
  if (rowId === "win2") return [{ id: "yes", label: "OUI", value: true }, { id: "no", label: "NON", value: false }];
  if (rowId === "golden") return [{ id: "yes", label: "OUI", value: true }, { id: "no", label: "NON", value: false }];
  if (rowId === "duration") return [5, 10, 15, 20, 30].map((value) => ({ id: `duration-${value}`, label: `${value} MIN`, value }));
  return [];
}

function guidedPickerSelectedIndex(rowId: string, state: GuidedSetupState, action: TvLaunchAction, profiles: TvProfile[]) {
  const options = guidedPickerOptions(rowId, state, action, profiles);
  let value: any = null;
  if (rowId === "player-count") value = state.playerCount;
  else if (rowId.startsWith("player-")) value = state.playerIndexes[Math.max(0, Number(rowId.split("-")[1] || 0))] ?? 0;
  else if (rowId === "score") value = state.startScore;
  else if (rowId === "in") value = state.inMode;
  else if (rowId === "out") value = state.outMode;
  else if (rowId === "legs") value = state.legsPerSet;
  else if (rowId === "sets") value = state.setsToWin;
  else if (rowId === "serve") value = state.serveMode;
  else if (rowId === "target") value = state.targetScore;
  else if (rowId === "points") value = state.pointsPerSet;
  else if (rowId === "win2") value = state.winByTwo;
  else if (rowId === "golden") value = state.goldenGoal;
  else if (rowId === "duration") value = state.durationMin;
  const at = options.findIndex((option) => option.value === value);
  return Math.max(0, at);
}

function applyGuidedPickerValue(rowId: string, value: any, state: GuidedSetupState, profiles: TvProfile[]): GuidedSetupState {
  if (rowId === "player-count") {
    const nextCount = Math.max(1, Number(value || 1));
    const nextIndexes = Array.from({ length: nextCount }, (_, index) => state.playerIndexes[index] ?? (profiles.length ? index % profiles.length : 0));
    return { ...state, playerCount: nextCount, playerIndexes: nextIndexes };
  }
  if (rowId.startsWith("player-")) {
    const slot = Math.max(0, Number(rowId.split("-")[1] || 0));
    const nextIndex = Math.max(0, Number(value || 0));
    const next = [...state.playerIndexes];
    const previous = next[slot] ?? 0;
    const otherSlot = next.findIndex((profileIndex, index) => index !== slot && profileIndex === nextIndex);
    if (otherSlot >= 0) next[otherSlot] = previous;
    next[slot] = nextIndex;
    return { ...state, playerIndexes: next };
  }
  if (rowId === "score") return { ...state, startScore: Number(value) as 301 | 501 | 701 | 901 };
  if (rowId === "in") return { ...state, inMode: value };
  if (rowId === "out") return { ...state, outMode: value };
  if (rowId === "legs") return { ...state, legsPerSet: Number(value) };
  if (rowId === "sets") return { ...state, setsToWin: Number(value) };
  if (rowId === "serve") return { ...state, serveMode: value };
  if (rowId === "target") return { ...state, targetScore: Number(value) };
  if (rowId === "points") return { ...state, pointsPerSet: Number(value) };
  if (rowId === "win2") return { ...state, winByTwo: !!value };
  if (rowId === "golden") return { ...state, goldenGoal: !!value };
  if (rowId === "duration") return { ...state, durationMin: Number(value) };
  return state;
}

function createGuidedSetup(sportId: TvSportId, action: TvLaunchAction, tvState: TvState): GuidedSetupState {
  const profiles = tvState.profiles;
  const minPlayers = Math.max(1, Number(action.minPlayers || 1));
  const maxByAction = Math.max(minPlayers, Number(action.maxPlayers || 8));
  const maxPlayers = profiles.length ? Math.min(maxByAction, profiles.length) : minPlayers;
  const requested = Math.max(minPlayers, Number(action.defaultPlayers || minPlayers));
  const playerCount = Math.max(minPlayers, Math.min(maxPlayers, requested));
  const activeIndex = Math.max(0, profiles.findIndex((p) => p.id === tvState.activeProfileId));
  const playerIndexes = Array.from({ length: Math.max(1, playerCount) }, (_, index) => profiles.length ? ((activeIndex + index) % profiles.length) : 0);
  return {
    sportId,
    actionId: action.id,
    playerCount,
    playerIndexes,
    startScore: ([301, 501, 701, 901].includes(Number(tvState.settings.defaultX01)) ? Number(tvState.settings.defaultX01) : 501) as 301 | 501 | 701 | 901,
    inMode: "single",
    outMode: tvState.settings.doubleOut ? "double" : "single",
    legsPerSet: 1,
    setsToWin: 1,
    serveMode: tvState.settings.randomOrder ? "random" : "alternate",
    targetScore: sportId === "petanque" ? 13 : sportId === "babyfoot" ? Number(action.params?.presetTarget || 10) : sportId === "molkky" ? 50 : 100,
    pointsPerSet: 11,
    winByTwo: true,
    goldenGoal: !!action.params?.presetGoldenGoal,
    durationMin: 10,
  };
}

function cycleNumber(value: number, options: number[]) {
  const at = Math.max(0, options.indexOf(Number(value)));
  return options[(at + 1) % options.length];
}

function buildGuidedSetupRows(
  state: GuidedSetupState,
  action: TvLaunchAction,
  profiles: TvProfile[],
  onChange: (next: GuidedSetupState) => void,
  onStart: () => void,
): GuidedSetupRow[] {
  const rows: GuidedSetupRow[] = [];
  const minPlayers = Math.max(1, Number(action.minPlayers || 1));
  const maxByAction = Math.max(minPlayers, Number(action.maxPlayers || 8));
  const maxPlayers = profiles.length ? Math.min(maxByAction, profiles.length) : minPlayers;
  const playerOptions = Array.from({ length: Math.max(1, maxPlayers - minPlayers + 1) }, (_, index) => minPlayers + index);

  rows.push({
    id: "player-count",
    label: "NOMBRE DE JOUEURS",
    value: String(state.playerCount),
    run: () => {
      const nextCount = playerOptions.length > 1 ? cycleNumber(state.playerCount, playerOptions) : state.playerCount;
      const indexes = Array.from({ length: nextCount }, (_, index) => state.playerIndexes[index] ?? (profiles.length ? index % profiles.length : 0));
      onChange({ ...state, playerCount: nextCount, playerIndexes: indexes });
    },
  });

  for (let slot = 0; slot < state.playerCount; slot += 1) {
    const profileIndex = state.playerIndexes[slot] ?? 0;
    rows.push({
      id: `player-${slot}`,
      label: `JOUEUR ${slot + 1}`,
      value: profiles[profileIndex]?.name || "Aucun profil",
      run: () => {
        if (!profiles.length) return;
        let nextIndex = (profileIndex + 1) % profiles.length;
        if (profiles.length > 1) {
          const occupied = new Set(state.playerIndexes.filter((_, idx) => idx !== slot));
          let guard = 0;
          while (occupied.has(nextIndex) && guard < profiles.length) {
            nextIndex = (nextIndex + 1) % profiles.length;
            guard += 1;
          }
        }
        const next = [...state.playerIndexes];
        next[slot] = nextIndex;
        onChange({ ...state, playerIndexes: next });
      },
    });
  }

  if (state.sportId === "darts" && action.id === "x01") {
    const scores: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
    const modes: Array<"single" | "double" | "master"> = ["single", "double", "master"];
    rows.push({ id: "score", label: "SCORE DE DÉPART", value: String(state.startScore), run: () => onChange({ ...state, startScore: cycleNumber(state.startScore, scores) as 301 | 501 | 701 | 901 }) });
    rows.push({ id: "in", label: "ENTRÉE", value: `${state.inMode.toUpperCase()} IN`, run: () => onChange({ ...state, inMode: modes[(modes.indexOf(state.inMode) + 1) % modes.length] }) });
    rows.push({ id: "out", label: "SORTIE", value: `${state.outMode.toUpperCase()} OUT`, run: () => onChange({ ...state, outMode: modes[(modes.indexOf(state.outMode) + 1) % modes.length] }) });
    rows.push({ id: "legs", label: "LEGS PAR SET", value: String(state.legsPerSet), run: () => onChange({ ...state, legsPerSet: cycleNumber(state.legsPerSet, [1, 2, 3, 5]) }) });
    rows.push({ id: "sets", label: "SETS À GAGNER", value: String(state.setsToWin), run: () => onChange({ ...state, setsToWin: cycleNumber(state.setsToWin, [1, 2, 3, 5]) }) });
    rows.push({ id: "serve", label: "ORDRE", value: state.serveMode === "random" ? "ALÉATOIRE" : "ALTERNÉ", run: () => onChange({ ...state, serveMode: state.serveMode === "random" ? "alternate" : "random" }) });
  } else if (state.sportId === "petanque") {
    rows.push({ id: "target", label: "SCORE CIBLE", value: String(state.targetScore), run: () => onChange({ ...state, targetScore: cycleNumber(state.targetScore, [7, 11, 13, 15]) }) });
  } else if (state.sportId === "pingpong") {
    rows.push({ id: "points", label: "POINTS PAR SET", value: String(state.pointsPerSet), run: () => onChange({ ...state, pointsPerSet: cycleNumber(state.pointsPerSet, [11, 21]) }) });
    rows.push({ id: "sets", label: "SETS À GAGNER", value: String(state.setsToWin), run: () => onChange({ ...state, setsToWin: cycleNumber(state.setsToWin, [1, 2, 3, 4]) }) });
    rows.push({ id: "win2", label: "2 POINTS D'ÉCART", value: state.winByTwo ? "OUI" : "NON", run: () => onChange({ ...state, winByTwo: !state.winByTwo }) });
  } else if (state.sportId === "babyfoot") {
    rows.push({ id: "target", label: "SCORE CIBLE", value: String(state.targetScore), run: () => onChange({ ...state, targetScore: cycleNumber(state.targetScore, [5, 7, 9, 10]) }) });
    rows.push({ id: "sets", label: "SETS À GAGNER", value: String(state.setsToWin), run: () => onChange({ ...state, setsToWin: cycleNumber(state.setsToWin, [1, 2, 3]) }) });
    rows.push({ id: "golden", label: "GOLDEN GOAL", value: state.goldenGoal ? "OUI" : "NON", run: () => onChange({ ...state, goldenGoal: !state.goldenGoal }) });
  } else if (state.sportId === "molkky") {
    rows.push({ id: "target", label: "SCORE CIBLE", value: String(state.targetScore), run: () => onChange({ ...state, targetScore: cycleNumber(state.targetScore, [30, 40, 50]) }) });
  } else if (state.sportId === "dicegame") {
    rows.push({ id: "target", label: "OBJECTIF", value: String(state.targetScore), run: () => onChange({ ...state, targetScore: cycleNumber(state.targetScore, [100, 200, 500, 1000, 10000]) }) });
  } else if (state.sportId === "foot") {
    rows.push({ id: "duration", label: "DURÉE", value: `${state.durationMin} MIN`, run: () => onChange({ ...state, durationMin: cycleNumber(state.durationMin, [5, 10, 15, 20, 30]) }) });
  }

  rows.push({ id: "launch", label: state.sportId === "darts" && action.id === "x01" ? "LANCER LA PARTIE" : "VALIDER LA CONFIGURATION", value: profiles.length ? "OK" : "PROFIL REQUIS", primary: true, run: onStart });
  return rows;
}

function TvGuidedSetup({
  connectionStatus, tvState, action, focusIndex, state, onFocus, onChange, onStart,
}: {
  connectionStatus: string;
  tvState: TvState;
  action: TvLaunchAction;
  focusIndex: number;
  state: GuidedSetupState;
  onFocus: (index: number) => void;
  onChange: (next: GuidedSetupState) => void;
  onStart: () => void;
}) {
  const sport = tvSportById(state.sportId);
  const rows = buildGuidedSetupRows(state, action, tvState.profiles, onChange, onStart);
  const selectedProfiles = state.playerIndexes.slice(0, state.playerCount).map((index) => tvState.profiles[index]).filter(Boolean);
  const ticker = tvActionImage(state.sportId, action);
  return (
    <main className="mss-tv-section mss-tv-section--setup">
      <TvPageHeader title={`${action.label} · CONFIGURATION`} subtitle="Mode guidé TV : joueurs et paramètres réglables à la télécommande." connectionStatus={connectionStatus} />
      <section className="mss-tv-guided-layout mss-tv-scroll-region" style={{ ["--sport-accent" as any]: sport.accent }}>
        <aside className="mss-tv-guided-summary">
          <img className="mss-tv-guided-ticker" src={ticker} alt={action.label} draggable={false} />
          <div className="mss-tv-guided-roster">
            {selectedProfiles.map((profile, index) => (
              <div className="mss-tv-guided-player" key={`${profile.id}-${index}`}><TvProfileAvatar profile={profile} size="medium" /><span>{profile.name}</span></div>
            ))}
          </div>
          <div className="mss-tv-guide-copy">{state.playerCount} joueur{state.playerCount > 1 ? "s" : ""} · tous les paramètres ci-contre se modifient avec OK.</div>
        </aside>
        <div className="mss-tv-guided-actions">
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              tabIndex={-1}
              className={`mss-tv-setting-card${focusIndex === index ? " is-focused" : ""}${row.primary ? " is-primary" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={row.run}
            >
              <i className="mss-tv-guide-step">{String(index + 1).padStart(2, "0")}</i>
              <span>{row.label}<small>{row.id === "launch" ? "OK POUR VALIDER" : "OK POUR CHOISIR"}</small></span>
              <b>{row.value}</b>
            </button>
          ))}
        </div>
      </section>
      <footer className="mss-tv-page-footer"><span>OK : modifier / valider · Retour : {sport.label}</span><span>{focusIndex + 1}/{rows.length}</span></footer>
    </main>
  );
}


function TvGuidedPicker({
  connectionStatus, title, options, focusIndex, onFocus, onSelect,
}: {
  connectionStatus: string;
  title: string;
  options: GuidedPickerOption[];
  focusIndex: number;
  onFocus: (index: number) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <main className="mss-tv-section mss-tv-section--picker">
      <TvPageHeader title={title} subtitle="Choisis précisément la valeur avec les flèches puis valide avec OK." connectionStatus={connectionStatus} />
      <section className="mss-tv-picker-grid mss-tv-scroll-region">
        {options.map((option, index) => (
          <button
            key={`${option.id}-${index}`}
            type="button"
            tabIndex={-1}
            className={`mss-tv-picker-card${focusIndex === index ? " is-focused" : ""}`}
            onMouseEnter={() => onFocus(index)}
            onClick={() => onSelect(index)}
          >
            {option.profile ? <TvProfileAvatar profile={option.profile} size="medium" /> : null}
            <span>{option.label}</span>
          </button>
        ))}
      </section>
      <footer className="mss-tv-page-footer"><span>Flèches : parcourir · OK : sélectionner · Retour : configuration</span><span>{options.length ? `${focusIndex + 1}/${options.length}` : ""}</span></footer>
    </main>
  );
}

type TvScoreKey = {
  id: string;
  label: string;
  kind: "digit" | "delete" | "clear" | "preset" | "bust" | "submit";
  value?: string;
};

const TV_X01_SCORE_KEYS: TvScoreKey[] = [
  { id: "1", label: "1", kind: "digit", value: "1" },
  { id: "2", label: "2", kind: "digit", value: "2" },
  { id: "3", label: "3", kind: "digit", value: "3" },
  { id: "del", label: "⌫", kind: "delete" },
  { id: "4", label: "4", kind: "digit", value: "4" },
  { id: "5", label: "5", kind: "digit", value: "5" },
  { id: "6", label: "6", kind: "digit", value: "6" },
  { id: "60", label: "60", kind: "preset", value: "60" },
  { id: "7", label: "7", kind: "digit", value: "7" },
  { id: "8", label: "8", kind: "digit", value: "8" },
  { id: "9", label: "9", kind: "digit", value: "9" },
  { id: "100", label: "100", kind: "preset", value: "100" },
  { id: "clear", label: "C", kind: "clear" },
  { id: "0", label: "0", kind: "digit", value: "0" },
  { id: "140", label: "140", kind: "preset", value: "140" },
  { id: "180", label: "180", kind: "preset", value: "180" },
  { id: "bust", label: "BUST", kind: "bust" },
  { id: "26", label: "26", kind: "preset", value: "26" },
  { id: "45", label: "45", kind: "preset", value: "45" },
  { id: "ok", label: "VALIDER", kind: "submit" },
];

function playerProfileFallback(player: any, tvState: TvState): TvProfile | null {
  const pid = String(player?.id || "");
  const name = String(player?.name || "").trim().toLowerCase();
  return tvState.profiles.find((profile) => String(profile.id) === pid)
    || tvState.profiles.find((profile) => String(profile.name || "").trim().toLowerCase() === name)
    || null;
}

function playerAvatarSrc(player: any, tvState: TvState) {
  const direct = String(player?.avatarUrl || player?.avatarDataUrl || "");
  if (direct) return direct;
  return playerProfileFallback(player, tvState)?.avatar || null;
}

function TvInteractiveScoreboard({
  snapshot,
  tvState,
  connectionStatus,
  focusIndex,
  scoreBuffer,
  onFocus,
  onScoreKey,
}: {
  snapshot: ViewerLiveSnapshot;
  tvState: TvState;
  connectionStatus: string;
  focusIndex: number;
  scoreBuffer: string;
  onFocus: (index: number) => void;
  onScoreKey: (key: TvScoreKey) => void;
}) {
  const players = Array.isArray(snapshot.players) ? snapshot.players : [];
  const active = players.find((player: any) => player?.isActive) || players.find((player: any) => String(player?.id || "") === String(snapshot.activePlayerId || "")) || players[0];
  const game = String(snapshot.game || "").toLowerCase();
  const sport = tvSportById(snapshot.sport || tvState.activeSport);
  const isX01 = game === "x01";
  const match = snapshot.match || {};
  const activeStats: any = active?.stats || {};

  return (
    <main className="mss-tv-game-shell" style={{ ["--sport-accent" as any]: sport.accent }}>
      <img className="mss-tv-game-bg" src={sport.art} alt="" draggable={false} />
      <header className="mss-tv-game-header">
        <div className="mss-tv-game-brand">
          <img src={sport.logo} alt="" draggable={false} />
          <div>
            <div className="mss-tv-game-eyebrow">MULTISPORTS SCORING · {sport.label}</div>
            <div className="mss-tv-game-title">{snapshot.title || game.toUpperCase()} <span>LIVE</span></div>
          </div>
        </div>
        <div className="mss-tv-game-meta">
          <span className={`mss-tv-link-state is-${connectionStatus}`}><i className="mss-tv-link-dot" />{connectionText(connectionStatus)}</span>
          {match.setIndex != null ? <span>SET {match.setIndex}</span> : null}
          {match.legIndex != null ? <span>LEG {match.legIndex}</span> : null}
          {match.round != null ? <span>TOUR {match.round}</span> : null}
        </div>
      </header>

      <section className={`mss-tv-game-layout${isX01 ? " has-keypad" : ""}`}>
        <div className="mss-tv-score-stage">
          <section className="mss-tv-active-player">
            <div className="mss-tv-active-avatar">
              {playerAvatarSrc(active, tvState)
                ? <img src={String(playerAvatarSrc(active, tvState))} alt="" draggable={false} />
                : <span>{String(active?.name || "?").slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="mss-tv-active-copy">
              <div className="mss-tv-game-eyebrow">AU TOUR DE</div>
              <div className="mss-tv-active-name">{active?.name || "Joueur"}</div>
              <div className="mss-tv-active-stats">
                <span>MOY. {activeStats.avg3d ?? activeStats.avg ?? "—"}</span>
                <span>BEST {activeStats.bestVisit ?? "—"}</span>
                <span>DARTS {activeStats.totalThrows ?? activeStats.dartsThrown ?? "—"}</span>
              </div>
            </div>
            <div className="mss-tv-active-score">{active?.score ?? "—"}</div>
          </section>

          <div className="mss-tv-players-rail">
            {players.map((player: any) => {
              const avatar = playerAvatarSrc(player, tvState);
              return (
                <article key={String(player.id || player.name)} className={`mss-tv-player-tile${player?.isActive ? " is-active" : ""}`}>
                  <div className="mss-tv-player-tile-avatar">
                    {avatar ? <img src={String(avatar)} alt="" draggable={false} /> : <span>{String(player?.name || "?").slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="mss-tv-player-tile-copy"><b>{player?.name || "Joueur"}</b><span>{player?.isActive ? "EN JEU" : "EN ATTENTE"}</span></div>
                  <strong>{player?.score ?? "—"}</strong>
                </article>
              );
            })}
          </div>
        </div>

        {isX01 ? (
          <aside className="mss-tv-scorepad">
            <div className="mss-tv-scorepad-head">
              <div><span>SAISIE TV</span><b>Entre le score de la volée</b></div>
              <div className="mss-tv-scorepad-display">{scoreBuffer || "0"}</div>
            </div>
            <div className="mss-tv-scorepad-grid">
              {TV_X01_SCORE_KEYS.map((key, index) => (
                <button
                  key={key.id}
                  type="button"
                  tabIndex={-1}
                  className={`mss-tv-score-key is-${key.kind}${focusIndex === index ? " is-focused" : ""}`}
                  onMouseEnter={() => onFocus(index)}
                  onClick={() => onScoreKey(key)}
                >
                  {key.label}
                </button>
              ))}
            </div>
            <div className="mss-tv-scorepad-help">Télécommande : chiffres ou flèches · OK valider · téléphone utilisable en parallèle</div>
          </aside>
        ) : (
          <aside className="mss-tv-game-side-panel">
            <div className="mss-tv-game-side-title">PARTIE EN DIRECT</div>
            <p>Le scoreboard reprend le même snapshot que Google Cast avec une mise en page dédiée TV.</p>
            <div className="mss-tv-game-side-pill">{players.length} joueur{players.length > 1 ? "s" : ""}</div>
            <div className="mss-tv-game-side-pill">{String(snapshot.phase || "playing").toUpperCase()}</div>
          </aside>
        )}
      </section>

      <footer className="mss-tv-game-footer"><span>Retour : menu TV</span><span>{isX01 ? "Score 0–180 · BUST disponible" : "Scoreboard temps réel"}</span></footer>
    </main>
  );
}

export default function SamsungTvApp() {
  useTizenStartup();
  const [sessionId, setSessionId] = React.useState(() => codeFromHash(window.location.hash));
  const [snapshot, setSnapshot] = React.useState<ViewerLiveSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState("connecting");
  const [phoneNavigation, setPhoneNavigation] = React.useState<PhoneNavigation | null>(null);
  const [screen, setScreen] = React.useState<TvScreen>("hub");
  const [focusIndex, setFocusIndex] = React.useState(1);
  const [autoFollowGame, setAutoFollowGame] = React.useState(true);
  const [tvState, setTvState] = React.useState<TvState>(EMPTY_TV_STATE);
  const [selectedSport, setSelectedSport] = React.useState<TvSportId>("darts");
  const [selectedAction, setSelectedAction] = React.useState<TvLaunchAction | null>(null);
  const [guidedSetup, setGuidedSetup] = React.useState<GuidedSetupState | null>(null);
  const [setupPickerRowId, setSetupPickerRowId] = React.useState<string | null>(null);
  const [setupPickerReturnFocus, setSetupPickerReturnFocus] = React.useState(0);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [profileEditor, setProfileEditor] = React.useState<ProfileEditorState | null>(null);
  const [profileDeleteArmed, setProfileDeleteArmed] = React.useState(false);
  const [scoreBuffer, setScoreBuffer] = React.useState("");
  const [sharedAppBoot, setSharedAppBoot] = React.useState<SamsungTvNativeAppBoot | null>(null);
  const realtimeRef = React.useRef<ViewerRealtimeConnection | null>(null);
  const autoFollowGameRef = React.useRef(true);
  const screenRef = React.useRef<TvScreen>("hub");
  const tvStateRef = React.useRef<TvState>(EMPTY_TV_STATE);
  const selectedSportRef = React.useRef<TvSportId>("darts");

  React.useEffect(() => {
    autoFollowGameRef.current = autoFollowGame;
  }, [autoFollowGame]);

  React.useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  React.useEffect(() => {
    tvStateRef.current = tvState;
  }, [tvState]);

  React.useEffect(() => {
    selectedSportRef.current = selectedSport;
  }, [selectedSport]);

  React.useEffect(() => {
    applyTvTheme(tvState.theme);
  }, [tvState.theme]);

  useKeepFocusedVisible(focusIndex, screen);

  const join = React.useCallback((code: string) => {
    const clean = normalizeViewerCode(code).slice(0, CODE_LENGTH);
    if (!clean) return;
    saveLastCode(clean);
    setSessionId(clean);
    setSnapshot(null);
    setPhoneNavigation(null);
    setScreen("hub");
    setFocusIndex(1);
    setAutoFollowGame(true);
    autoFollowGameRef.current = true;
    setTvState(EMPTY_TV_STATE);
    setSelectedSport("darts");
    setSelectedAction(null);
    setGuidedSetup(null);
    setSelectedProfileId(null);
    setProfileEditor(null);
    setProfileDeleteArmed(false);
    setSharedAppBoot(null);
    setHash(clean);
  }, []);

  const openScreen = React.useCallback((next: TvScreen, focus = 0) => {
    screenRef.current = next;
    setScreen(next);
    setFocusIndex(Math.max(0, focus));
  }, []);

  React.useEffect(() => {
    const syncHash = () => setSessionId(codeFromHash(window.location.hash));
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  React.useEffect(() => {
    realtimeRef.current?.close();
    realtimeRef.current = null;
    if (!sessionId) return;

    let alive = true;
    let pollTimer: number | null = null;

    const applySnapshot = (next: ViewerLiveSnapshot | null) => {
      if (!alive || !next) return;
      setSnapshot(next);
      const hasGame = Array.isArray(next.players) && next.players.length > 0 && next.phase !== "lobby";
      if (hasGame && autoFollowGameRef.current) {
        screenRef.current = "scoreboard";
        setScreen("scoreboard");
        setFocusIndex(0);
      }
    };

    const poll = async () => {
      try {
        applySnapshot(await fetchViewerSnapshot(sessionId));
      } catch {}
      if (alive) pollTimer = window.setTimeout(poll, 2200);
    };
    void poll();

    realtimeRef.current = createViewerRealtimeConnection({
      sessionId,
      role: "guest",
      onStatus: (next) => {
        if (!alive) return;
        setConnectionStatus(next);
        if (next === "connected") {
          window.setTimeout(() => realtimeRef.current?.sendCommand({
            type: "request_tv_state",
            source: "samsung-tv",
            at: Date.now(),
          }), 0);
        }
      },
      onSnapshot: (next) => applySnapshot(next),
      onCommand: (data) => {
        if (!alive || !data || typeof data !== "object") return;

        if (data.type === "tv_state") {
          const next: TvState = {
            ...EMPTY_TV_STATE,
            ...data,
            settings: { ...EMPTY_TV_STATE.settings, ...(data.settings || {}) },
            theme: { ...EMPTY_TV_STATE.theme, ...(data.theme || {}) },
            activeSport: tvSportById(data.activeSport).id,
            profiles: Array.isArray(data.profiles) ? data.profiles : [],
            friends: Array.isArray(data.friends) ? data.friends : [],
            inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
          };
          tvStateRef.current = next;
          selectedSportRef.current = next.activeSport;
          setTvState(next);
          setSelectedSport(next.activeSport);
          return;
        }

        if (data.type !== "navigation_state") return;
        const nav: PhoneNavigation = {
          tab: String(data.tab || ""),
          label: String(data.label || viewerRouteLabel(String(data.tab || ""))),
          gameplay: !!data.gameplay || isViewerGameplayRoute(String(data.tab || "")),
          params: data.params || undefined,
          gameConfig: data.gameConfig || undefined,
          at: Number(data.at || Date.now()),
        };
        setPhoneNavigation(nav);

        const nextScreen = screenForPhoneTab(nav.tab);
        if (nav.gameplay) {
          autoFollowGameRef.current = true;
          setAutoFollowGame(true);
          const currentTvState = tvStateRef.current;
          setSharedAppBoot({
            version: 1,
            tab: nav.tab,
            params: { ...(nav.params || {}), ...(nav.gameConfig ? { config: nav.gameConfig } : {}), source: "samsung-tv-phone-follow" },
            gameConfig: nav.gameConfig || null,
            sportId: currentTvState.activeSport || selectedSportRef.current || "darts",
            sessionId,
            activeProfileId: currentTvState.activeProfileId,
            profiles: currentTvState.profiles,
            settings: currentTvState.settings,
            theme: currentTvState.theme,
            launchedAt: Date.now(),
          });
          return;
        }

        if (!nextScreen) return;
        screenRef.current = nextScreen;
        setScreen(nextScreen);

        if (nextScreen === "hub") {
          setFocusIndex(viewerMenuIndexForRoute(nav.tab));
        } else if (nextScreen === "sports") {
          setFocusIndex(Math.max(0, TV_SPORTS.findIndex((sport) => sport.id === tvStateRef.current.activeSport)));
        } else if (nextScreen === "sport") {
          const sportId = tvStateRef.current.activeSport || selectedSportRef.current;
          setSelectedSport(sportId);
          const actions = tvLaunchActionsForSport(sportId);
          const routeIndex = actions.findIndex((action) => action.tab === nav.tab);
          setFocusIndex(Math.max(0, routeIndex));
        } else if (nextScreen === "profiles" || nextScreen === "stats") {
          const profileIndex = tvStateRef.current.profiles.findIndex((profile) => profile.id === tvStateRef.current.activeProfileId);
          setFocusIndex(Math.max(0, profileIndex + (nextScreen === "profiles" ? 1 : 0)));
        } else {
          setFocusIndex(0);
        }
      },
    });

    return () => {
      alive = false;
      if (pollTimer != null) window.clearTimeout(pollTimer);
      realtimeRef.current?.close();
      realtimeRef.current = null;
    };
  // Realtime callbacks own the current session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const hasLiveGame = !!snapshot && Array.isArray(snapshot.players) && snapshot.players.length > 0 && snapshot.phase !== "lobby";
  const currentSport = tvSportById(tvState.activeSport).id;
  const sportActions = tvLaunchActionsForSport(selectedSport);

  const sendNavigate = React.useCallback((tab: string, params?: any) => {
    realtimeRef.current?.sendCommand({
      type: "navigate",
      tab,
      params: params || undefined,
      source: "samsung-tv",
      at: Date.now(),
    });
  }, []);

  const activateHub = React.useCallback((index: number) => {
    const item = VIEWER_TV_MENU[index];
    if (!item) return;

    if (item.kind === "scoreboard") {
      if (hasLiveGame) {
        autoFollowGameRef.current = false;
        setAutoFollowGame(false);
        openScreen("scoreboard");
      } else {
        openScreen("sports");
        sendNavigate("gameSelect");
      }
      return;
    }

    if (item.id === "games") {
      openScreen("sports");
      sendNavigate("gameSelect");
      return;
    }
    if (item.id === "profiles") openScreen("profiles");
    else if (item.id === "online") openScreen("online");
    else if (item.id === "stats") openScreen("stats");
    else if (item.id === "agenda") openScreen("agenda");
    else if (item.id === "settings") openScreen("settings");

    if (item.tab) sendNavigate(item.tab);
  }, [hasLiveGame, openScreen, sendNavigate]);

  const chooseSport = React.useCallback((sportId: TvSportId) => {
    selectedSportRef.current = sportId;
    setSelectedSport(sportId);
    openScreen("sport");
    realtimeRef.current?.sendCommand({
      type: "select_sport",
      sport: sportId,
      tab: "games",
      source: "samsung-tv",
      at: Date.now(),
    });
  }, [openScreen]);

  const launchAction = React.useCallback((action: TvLaunchAction) => {
    const current = tvStateRef.current;
    setSelectedAction(action);
    setGuidedSetup(null);
    setSetupPickerRowId(null);
    setSharedAppBoot({
      version: 1,
      tab: action.tab,
      params: { ...(action.params || {}), source: "samsung-tv-native", tvNative: true },
      gameConfig: null,
      sportId: selectedSport,
      sessionId,
      activeProfileId: current.activeProfileId,
      profiles: current.profiles,
      settings: current.settings,
      theme: current.theme,
      launchedAt: Date.now(),
    });
    // Le téléphone suit l'ouverture de la même configuration quand la route est autorisée.
    sendNavigate(action.tab, { ...(action.params || {}), source: "samsung-tv" });
  }, [selectedSport, sendNavigate, sessionId]);

  const selectProfile = React.useCallback((profileId: string) => {
    realtimeRef.current?.sendCommand({
      type: "select_profile",
      profileId,
      source: "samsung-tv",
      at: Date.now(),
    });
    setTvState((prev) => ({ ...prev, activeProfileId: profileId }));
  }, []);

  const openProfile = React.useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setProfileDeleteArmed(false);
    openScreen("profile_detail", 0);
  }, [openScreen]);

  const beginCreateProfile = React.useCallback(() => {
    setProfileEditor({ mode: "create", profileId: null, name: "" });
    openScreen("profile_edit", 0);
  }, [openScreen]);

  const beginRenameProfile = React.useCallback((profile: TvProfile) => {
    setProfileEditor({ mode: "rename", profileId: profile.id, name: profile.name });
    openScreen("profile_edit", 0);
  }, [openScreen]);

  const saveProfileEditor = React.useCallback(() => {
    const editor = profileEditor;
    const name = String(editor?.name || "").trim().replace(/\s+/g, " ").slice(0, 22);
    if (!editor || !name) return;
    if (editor.mode === "create") {
      realtimeRef.current?.sendCommand({ type: "profile_create", name, source: "samsung-tv", at: Date.now() });
      setProfileEditor(null);
      openScreen("profiles", 0);
      return;
    }
    if (editor.profileId) {
      realtimeRef.current?.sendCommand({ type: "profile_update", profileId: editor.profileId, patch: { name }, source: "samsung-tv", at: Date.now() });
      setTvState((prev) => ({ ...prev, profiles: prev.profiles.map((profile) => profile.id === editor.profileId ? { ...profile, name } : profile) }));
      setSelectedProfileId(editor.profileId);
      setProfileEditor(null);
      openScreen("profile_detail", 2);
    }
  }, [openScreen, profileEditor]);

  const deleteSelectedProfile = React.useCallback((profileId: string) => {
    realtimeRef.current?.sendCommand({ type: "profile_delete", profileId, source: "samsung-tv", at: Date.now() });
    setTvState((prev) => {
      const profiles = prev.profiles.filter((profile) => profile.id !== profileId);
      return { ...prev, profiles, activeProfileId: prev.activeProfileId === profileId ? (profiles[0]?.id || null) : prev.activeProfileId };
    });
    setSelectedProfileId(null);
    setProfileDeleteArmed(false);
    openScreen("profiles", 0);
  }, [openScreen]);

  const updateSetting = React.useCallback((key: string, value: any) => {
    realtimeRef.current?.sendCommand({
      type: "update_setting",
      key,
      value,
      source: "samsung-tv",
      at: Date.now(),
    });
    setTvState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  }, []);

  const sendTvScore = React.useCallback((value: number | "BUST") => {
    realtimeRef.current?.sendCommand({
      type: "x01_tv_score",
      score: value,
      source: "samsung-tv",
      at: Date.now(),
    });
    setScoreBuffer("");
  }, []);

  const activateScoreKey = React.useCallback((keyDef: TvScoreKey) => {
    if (!keyDef) return;
    if (keyDef.kind === "digit") {
      setScoreBuffer((prev) => {
        const next = `${prev}${keyDef.value || ""}`.replace(/^0+(?=\d)/, "").slice(0, 3);
        const value = Number(next || 0);
        return value <= 180 ? next : prev;
      });
      return;
    }
    if (keyDef.kind === "delete") {
      setScoreBuffer((prev) => prev.slice(0, -1));
      return;
    }
    if (keyDef.kind === "clear") {
      setScoreBuffer("");
      return;
    }
    if (keyDef.kind === "bust") {
      sendTvScore("BUST");
      return;
    }
    if (keyDef.kind === "preset") {
      const value = Number(keyDef.value || 0);
      if (Number.isFinite(value) && value >= 0 && value <= 180) sendTvScore(value);
      return;
    }
    if (keyDef.kind === "submit") {
      const value = Number(scoreBuffer || 0);
      if (Number.isFinite(value) && value >= 0 && value <= 180) sendTvScore(value);
    }
  }, [scoreBuffer, sendTvScore]);

  const activateProfileEditorKey = React.useCallback((index: number) => {
    const editor = profileEditor;
    const key = TV_PROFILE_KEYS[index];
    if (!editor || !key) return;
    if (key.kind === "char") setProfileEditor({ ...editor, name: `${editor.name}${key.label}`.slice(0, 22) });
    else if (key.kind === "space") setProfileEditor({ ...editor, name: `${editor.name} `.slice(0, 22) });
    else if (key.kind === "delete") setProfileEditor({ ...editor, name: editor.name.slice(0, -1) });
    else if (key.kind === "clear") setProfileEditor({ ...editor, name: "" });
    else if (key.kind === "save") saveProfileEditor();
  }, [profileEditor, saveProfileEditor]);

  const startGuidedSetup = React.useCallback(() => {
    const state = guidedSetup;
    const action = selectedAction;
    if (!state || !action) return;
    const profiles = tvState.profiles;
    const selectedProfiles = state.playerIndexes
      .slice(0, state.playerCount)
      .map((index) => profiles[index])
      .filter(Boolean);
    if (!selectedProfiles.length) {
      beginCreateProfile();
      return;
    }
    const playerIds = selectedProfiles.map((profile) => profile.id);

    if (state.sportId === "darts" && action.id === "x01") {
      realtimeRef.current?.sendCommand({
        type: "start_x01",
        config: {
          startScore: state.startScore,
          outMode: state.outMode,
          inMode: state.inMode,
          playerIds,
          legsPerSet: state.legsPerSet,
          setsToWin: state.setsToWin,
          serveMode: state.serveMode,
        },
        source: "samsung-tv",
        at: Date.now(),
      });
      autoFollowGameRef.current = true;
      setAutoFollowGame(true);
      return;
    }

    const guidedParams = {
      ...(action.params || {}),
      source: "samsung-tv",
      tvGuided: true,
      playerIds,
      selectedPlayerIds: playerIds,
      participantIds: playerIds,
      playerCount: state.playerCount,
      targetScore: state.targetScore,
      pointsPerSet: state.pointsPerSet,
      setsToWin: state.setsToWin,
      legsPerSet: state.legsPerSet,
      winByTwo: state.winByTwo,
      goldenGoal: state.goldenGoal,
      durationMin: state.durationMin,
    };
    sendNavigate(action.tab, guidedParams);
  }, [beginCreateProfile, guidedSetup, selectedAction, sendNavigate, tvState.profiles]);

  const openGuidedPicker = React.useCallback((rowId: string, rowIndex: number) => {
    const state = guidedSetup;
    const action = selectedAction;
    if (!state || !action) return;
    const options = guidedPickerOptions(rowId, state, action, tvStateRef.current.profiles);
    if (!options.length) return;
    setSetupPickerRowId(rowId);
    setSetupPickerReturnFocus(rowIndex);
    openScreen("setup_picker", guidedPickerSelectedIndex(rowId, state, action, tvStateRef.current.profiles));
  }, [guidedSetup, openScreen, selectedAction]);

  const selectGuidedPickerOption = React.useCallback((index: number) => {
    const state = guidedSetup;
    const action = selectedAction;
    const rowId = setupPickerRowId;
    if (!state || !action || !rowId) return;
    const options = guidedPickerOptions(rowId, state, action, tvStateRef.current.profiles);
    const option = options[index];
    if (!option) return;
    setGuidedSetup(applyGuidedPickerValue(rowId, option.value, state, tvStateRef.current.profiles));
    setSetupPickerRowId(null);
    openScreen("setup", setupPickerReturnFocus);
  }, [guidedSetup, openScreen, selectedAction, setupPickerReturnFocus, setupPickerRowId]);

  const countForScreen = React.useCallback(() => {
    if (screen === "hub") return VIEWER_TV_MENU.length;
    if (screen === "sports") return TV_SPORTS.length;
    if (screen === "sport") return sportActions.length;
    if (screen === "profiles") return tvState.profiles.length + 1;
    if (screen === "profile_detail") return selectedProfileId ? 5 : 0;
    if (screen === "profile_edit") return profileEditor ? TV_PROFILE_KEYS.length : 0;
    if (screen === "stats") return Math.min(TV_STATS_PROFILE_LIMIT, tvState.profiles.length);
    if (screen === "online") return tvState.friends.length;
    if (screen === "settings") return 5;
    if (screen === "setup" && guidedSetup && selectedAction) return buildGuidedSetupRows(guidedSetup, selectedAction, tvState.profiles, setGuidedSetup, startGuidedSetup).length;
    if (screen === "setup_picker" && guidedSetup && selectedAction && setupPickerRowId) return guidedPickerOptions(setupPickerRowId, guidedSetup, selectedAction, tvState.profiles).length;
    if (screen === "agenda") return 1;
    if (screen === "scoreboard" && String(snapshot?.game || "").toLowerCase() === "x01") return TV_X01_SCORE_KEYS.length;
    return 0;
  }, [guidedSetup, profileEditor, screen, selectedAction, selectedProfileId, setupPickerRowId, snapshot?.game, sportActions.length, startGuidedSetup, tvState.friends.length, tvState.profiles]);

  const columnsForScreen = React.useCallback(() => {
    if (screen === "hub") return 4;
    if (screen === "sports") return 5;
    if (screen === "sport") return 3;
    if (screen === "profiles" || screen === "stats" || screen === "online") return 4;
    if (screen === "profile_detail" || screen === "settings" || screen === "setup") return 2;
    if (screen === "setup_picker") return 4;
    if (screen === "profile_edit") return 7;
    if (screen === "scoreboard") return 4;
    return 1;
  }, [screen]);

  const activateCurrent = React.useCallback(() => {
    if (screen === "scoreboard") {
      const keyDef = TV_X01_SCORE_KEYS[focusIndex];
      if (keyDef) activateScoreKey(keyDef);
      return;
    }
    if (screen === "hub") return activateHub(focusIndex);
    if (screen === "sports") {
      const sport = TV_SPORTS[focusIndex];
      if (sport) chooseSport(sport.id);
      return;
    }
    if (screen === "sport") {
      const action = sportActions[focusIndex];
      if (action) launchAction(action);
      return;
    }
    if (screen === "profiles") {
      if (focusIndex === 0) beginCreateProfile();
      else {
        const profile = tvState.profiles[focusIndex - 1];
        if (profile) openProfile(profile.id);
      }
      return;
    }
    if (screen === "profile_detail") {
      const profile = tvState.profiles.find((item) => item.id === selectedProfileId);
      if (!profile) return;
      if (focusIndex === 0) selectProfile(profile.id);
      else if (focusIndex === 1) {
        const profileIndex = Math.max(0, tvState.profiles.findIndex((item) => item.id === profile.id));
        openScreen("stats", profileIndex);
      } else if (focusIndex === 2) beginRenameProfile(profile);
      else if (focusIndex === 3) sendNavigate("profiles", { view: "me", profileId: profile.id, edit: true, source: "samsung-tv" });
      else if (focusIndex === 4) {
        if (profileDeleteArmed) deleteSelectedProfile(profile.id);
        else setProfileDeleteArmed(true);
      }
      return;
    }
    if (screen === "profile_edit") {
      activateProfileEditorKey(focusIndex);
      return;
    }
    if (screen === "stats") {
      const profile = tvState.profiles[focusIndex];
      if (profile) selectProfile(profile.id);
      return;
    }
    if (screen === "setup" && guidedSetup && selectedAction) {
      const rows = buildGuidedSetupRows(guidedSetup, selectedAction, tvState.profiles, setGuidedSetup, startGuidedSetup);
      const row = rows[focusIndex];
      if (!row) return;
      if (row.id === "launch") row.run();
      else openGuidedPicker(row.id, focusIndex);
      return;
    }
    if (screen === "setup_picker") {
      selectGuidedPickerOption(focusIndex);
      return;
    }
    if (screen === "settings") {
      const settings = tvState.settings;
      const scores = [301, 501, 701, 901];
      const scoreIndex = Math.max(0, scores.indexOf(Number(settings.defaultX01)));
      const actions = [
        ["defaultX01", scores[(scoreIndex + 1) % scores.length]],
        ["doubleOut", !settings.doubleOut],
        ["randomOrder", !settings.randomOrder],
        ["ttsOnThird", !settings.ttsOnThird],
        ["neonTheme", !settings.neonTheme],
      ] as const;
      const action = actions[focusIndex];
      if (action) updateSetting(action[0], action[1]);
    }
  }, [
    activateProfileEditorKey,
    activateScoreKey,
    activateHub,
    beginCreateProfile,
    beginRenameProfile,
    chooseSport,
    deleteSelectedProfile,
    focusIndex,
    guidedSetup,
    launchAction,
    openGuidedPicker,
    openProfile,
    openScreen,
    profileDeleteArmed,
    screen,
    selectGuidedPickerOption,
    selectProfile,
    selectedAction,
    selectedProfileId,
    sendNavigate,
    sportActions,
    startGuidedSetup,
    tvState.profiles,
    tvState.settings,
    updateSetting,
  ]);

  React.useEffect(() => {
    if (!sessionId) return;
    const onKey = (event: KeyboardEvent) => {
      if (sharedAppBoot) return;
      const key = String(event.key || "");
      const keyCode = Number((event as any).keyCode || (event as any).which || 0);
      const isBack = keyCode === 10009 || key === "BrowserBack" || key === "GoBack";

      if (isBack) {
        event.preventDefault();
        event.stopPropagation();

        if (screen === "scoreboard") {
          autoFollowGameRef.current = false;
          setAutoFollowGame(false);
          openScreen("hub", viewerMenuIndexForRoute(phoneNavigation?.tab || ""));
          return;
        }
        if (screen === "profile_edit") {
          setProfileEditor(null);
          if (selectedProfileId) openScreen("profile_detail", 0);
          else openScreen("profiles", 0);
          return;
        }
        if (screen === "profile_detail") {
          setProfileDeleteArmed(false);
          openScreen("profiles", Math.max(0, tvState.profiles.findIndex((profile) => profile.id === selectedProfileId) + 1));
          return;
        }
        if (screen === "setup_picker") {
          setSetupPickerRowId(null);
          openScreen("setup", setupPickerReturnFocus);
          return;
        }
        if (screen === "setup") {
          setSetupPickerRowId(null);
          openScreen("sport", Math.max(0, sportActions.findIndex((action) => action.id === selectedAction?.id)));
          return;
        }
        if (screen === "sport") {
          openScreen("sports", Math.max(0, TV_SPORTS.findIndex((sport) => sport.id === selectedSport)));
          return;
        }
        if (screen !== "hub") {
          openScreen("hub", viewerMenuIndexForRoute(phoneNavigation?.tab || ""));
          return;
        }

        realtimeRef.current?.close();
        setSessionId("");
        setHash(null);
        return;
      }

      if (screen === "profile_edit" && /^[a-zA-Z ]$/.test(key)) {
        event.preventDefault();
        event.stopPropagation();
        if (key === " ") setProfileEditor((prev) => prev ? { ...prev, name: `${prev.name} `.slice(0, 22) } : prev);
        else setProfileEditor((prev) => prev ? { ...prev, name: `${prev.name}${key.toUpperCase()}`.slice(0, 22) } : prev);
        return;
      }
      if (screen === "profile_edit" && (key === "Backspace" || key === "Delete")) {
        event.preventDefault();
        event.stopPropagation();
        setProfileEditor((prev) => prev ? { ...prev, name: prev.name.slice(0, -1) } : prev);
        return;
      }

      if (screen === "scoreboard" && String(snapshot?.game || "").toLowerCase() === "x01" && /^[0-9]$/.test(key)) {
        event.preventDefault();
        event.stopPropagation();
        activateScoreKey({ id: `remote-${key}`, label: key, kind: "digit", value: key });
        return;
      }
      if (screen === "scoreboard" && String(snapshot?.game || "").toLowerCase() !== "x01") return;

      const count = countForScreen();
      if (!count) return;
      const cols = columnsForScreen();
      let next = focusIndex;

      if (key === "ArrowLeft") next = Math.max(0, focusIndex - 1);
      else if (key === "ArrowRight") next = Math.min(count - 1, focusIndex + 1);
      else if (key === "ArrowUp") next = Math.max(0, focusIndex - cols);
      else if (key === "ArrowDown") next = Math.min(count - 1, focusIndex + cols);
      else if (key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        activateCurrent();
        return;
      } else return;

      event.preventDefault();
      event.stopPropagation();
      if (next !== focusIndex) setFocusIndex(next);
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [
    activateCurrent,
    activateScoreKey,
    columnsForScreen,
    countForScreen,
    focusIndex,
    openScreen,
    phoneNavigation?.tab,
    screen,
    snapshot?.game,
    selectedAction?.id,
    selectedProfileId,
    selectedSport,
    setupPickerReturnFocus,
    sessionId,
    sharedAppBoot,
    sportActions,
    tvState.profiles,
  ]);

  React.useEffect(() => {
    const count = countForScreen();
    if (!count) {
      if (focusIndex !== 0) setFocusIndex(0);
      return;
    }
    if (focusIndex >= count) setFocusIndex(count - 1);
  }, [countForScreen, focusIndex, screen]);

  if (!sessionId) return <TvJoin onJoin={join} />;

  if (sharedAppBoot) {
    return (
      <React.Suspense fallback={<div className="mss-tv-shared-app-loading">Chargement de l’interface MULTISPORTS SCORING…</div>}>
        <SamsungTvSharedAppHost
          boot={sharedAppBoot}
          onExit={() => {
            setSharedAppBoot(null);
            setSelectedAction(null);
            setGuidedSetup(null);
            autoFollowGameRef.current = false;
            setAutoFollowGame(false);
            openScreen("sport", Math.max(0, sportActions.findIndex((action) => action.id === selectedAction?.id)));
          }}
        />
      </React.Suspense>
    );
  }

  if (screen === "scoreboard" && hasLiveGame && snapshot) {
    return (
      <TvInteractiveScoreboard
        snapshot={snapshot}
        tvState={tvState}
        connectionStatus={connectionStatus}
        focusIndex={focusIndex}
        scoreBuffer={scoreBuffer}
        onFocus={setFocusIndex}
        onScoreKey={activateScoreKey}
      />
    );
  }

  if (screen === "sports") {
    return <TvSports connectionStatus={connectionStatus} activeSport={currentSport} focusIndex={focusIndex} onFocus={setFocusIndex} onChoose={chooseSport} />;
  }

  if (screen === "sport") {
    return <TvSportLauncher connectionStatus={connectionStatus} sportId={selectedSport} focusIndex={focusIndex} onFocus={setFocusIndex} onLaunch={launchAction} />;
  }

  if (screen === "profiles") {
    return <TvProfiles connectionStatus={connectionStatus} tvState={tvState} focusIndex={focusIndex} onFocus={setFocusIndex} onOpen={openProfile} onCreate={beginCreateProfile} />;
  }

  if (screen === "profile_detail") {
    const profile = tvState.profiles.find((item) => item.id === selectedProfileId) || tvState.profiles[0] || null;
    if (!profile) return <TvProfiles connectionStatus={connectionStatus} tvState={tvState} focusIndex={0} onFocus={setFocusIndex} onOpen={openProfile} onCreate={beginCreateProfile} />;
    return (
      <TvProfileDetail
        connectionStatus={connectionStatus}
        profile={profile}
        isActive={profile.id === tvState.activeProfileId}
        focusIndex={focusIndex}
        deleteArmed={profileDeleteArmed}
        onFocus={(index) => { setProfileDeleteArmed(false); setFocusIndex(index); }}
        onAction={(action) => {
          if (action === "activate") selectProfile(profile.id);
          else if (action === "stats") openScreen("stats", Math.max(0, tvState.profiles.findIndex((item) => item.id === profile.id)));
          else if (action === "rename") beginRenameProfile(profile);
          else if (action === "phone") sendNavigate("profiles", { view: "me", profileId: profile.id, edit: true, source: "samsung-tv" });
          else if (action === "delete") { if (profileDeleteArmed) deleteSelectedProfile(profile.id); else setProfileDeleteArmed(true); }
        }}
      />
    );
  }

  if (screen === "profile_edit" && profileEditor) {
    return <TvProfileEditor connectionStatus={connectionStatus} editor={profileEditor} focusIndex={focusIndex} onFocus={setFocusIndex} onActivate={activateProfileEditorKey} />;
  }

  if (screen === "stats") {
    return <TvStats connectionStatus={connectionStatus} tvState={tvState} focusIndex={focusIndex} onFocus={setFocusIndex} onSelectProfile={selectProfile} />;
  }

  if (screen === "online") {
    return <TvOnline connectionStatus={connectionStatus} friends={tvState.friends} focusIndex={focusIndex} onFocus={setFocusIndex} />;
  }

  if (screen === "agenda") {
    return <TvAgenda connectionStatus={connectionStatus} />;
  }

  if (screen === "setup_picker" && guidedSetup && selectedAction && setupPickerRowId) {
    const rows = buildGuidedSetupRows(guidedSetup, selectedAction, tvState.profiles, setGuidedSetup, startGuidedSetup);
    const row = rows.find((item) => item.id === setupPickerRowId);
    const options = guidedPickerOptions(setupPickerRowId, guidedSetup, selectedAction, tvState.profiles);
    return (
      <TvGuidedPicker
        connectionStatus={connectionStatus}
        title={row?.label || "CHOISIR"}
        options={options}
        focusIndex={focusIndex}
        onFocus={setFocusIndex}
        onSelect={selectGuidedPickerOption}
      />
    );
  }

  if (screen === "setup" && guidedSetup && selectedAction) {
    return (
      <TvGuidedSetup
        connectionStatus={connectionStatus}
        tvState={tvState}
        action={selectedAction}
        focusIndex={focusIndex}
        state={guidedSetup}
        onFocus={setFocusIndex}
        onChange={setGuidedSetup}
        onStart={startGuidedSetup}
      />
    );
  }

  if (screen === "settings") {
    return <TvSettings connectionStatus={connectionStatus} settings={tvState.settings} focusIndex={focusIndex} onFocus={setFocusIndex} onAction={updateSetting} />;
  }

  return (
    <TvHub
      sessionId={sessionId}
      snapshot={snapshot}
      connectionStatus={connectionStatus}
      phoneNavigation={phoneNavigation}
      tvState={tvState}
      focusIndex={focusIndex}
      onFocus={setFocusIndex}
      onActivate={activateHub}
    />
  );
}
