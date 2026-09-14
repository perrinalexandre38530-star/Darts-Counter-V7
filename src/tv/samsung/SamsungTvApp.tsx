import * as React from "react";
import ViewerScreen from "../../components/viewer/ViewerScreen";
import { fetchViewerSnapshot, normalizeViewerCode } from "../../lib/viewer/viewerClient";
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

const LAST_CODE_KEY = "mss_samsung_tv_last_viewer_code_v1";
const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
const GRID_COLUMNS = 8;
const TV_BUILD_MARKER = "MSS_TV_FULL_APP_BUILD_20260914_02";
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
  at: number;
};

type TvProfile = {
  id: string;
  name: string;
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
  at: number;
};

type TvScreen =
  | "hub"
  | "sports"
  | "sport"
  | "profiles"
  | "stats"
  | "online"
  | "agenda"
  | "settings"
  | "x01setup"
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
          <div className="mss-tv-build-marker">TV FULL APP V2 · 2026.09.14-02</div>
        </div>
        <div className={`mss-tv-link-state is-${connectionStatus}`}>
          <span className="mss-tv-link-dot" />
          {connectionText(connectionStatus)}
        </div>
      </header>

      <section className="mss-tv-billboard" style={{ ["--sport-accent" as any]: activeSport.accent }}>
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
              className={`mss-tv-menu-card${focused ? " is-focused" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onActivate(index)}
            >
              {item.id === "games" || item.kind === "scoreboard" ? <TvWatermark src={activeSport.logo} strong={item.id === "games"} /> : null}
              <span className="mss-tv-menu-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="mss-tv-menu-label">{label}</span>
              <span className="mss-tv-menu-subtitle">{subtitle}</span>
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
    <main className="mss-tv-section">
      <TvPageHeader
        title="SPORTS"
        subtitle="Choisis une discipline. La sélection est immédiatement synchronisée avec le téléphone."
        connectionStatus={connectionStatus}
      />
      <section className="mss-tv-sport-grid">
        {TV_SPORTS.map((sport, index) => (
          <button
            type="button"
            tabIndex={-1}
            key={sport.id}
            className={`mss-tv-sport-card${index === focusIndex ? " is-focused" : ""}${sport.id === activeSport ? " is-active" : ""}`}
            style={{ ["--sport-accent" as any]: sport.accent }}
            onMouseEnter={() => onFocus(index)}
            onClick={() => onChoose(sport.id)}
          >
            <TvWatermark src={sport.logo} strong />
            <span className="mss-tv-sport-card-label">{sport.label}</span>
            <span className="mss-tv-sport-card-subtitle">{sport.subtitle}</span>
            {sport.id === activeSport ? <span className="mss-tv-active-pill">ACTIF</span> : null}
          </button>
        ))}
      </section>
      <footer className="mss-tv-page-footer">OK : ouvrir le sport · Retour : menu TV</footer>
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

  return (
    <main className="mss-tv-section">
      <TvPageHeader
        title={sport.label}
        subtitle={sportId === "darts" ? "Choisis un mode de jeu. OK ouvre sa configuration sur le téléphone et garde la TV synchronisée." : "Choisis un mode ou une action."}
        connectionStatus={connectionStatus}
      />
      <section className="mss-tv-sport-hero" style={{ ["--sport-accent" as any]: sport.accent }}>
        <TvWatermark src={sport.logo} strong />
        <div className="mss-tv-sport-hero-title">{sport.label}</div>
        <div className="mss-tv-sport-hero-copy">Télécommande Samsung + téléphone · même session</div>
        {actions.length > pageSize ? <div className="mss-tv-page-count">{page + 1} / {Math.ceil(actions.length / pageSize)}</div> : null}
      </section>
      <section className="mss-tv-action-grid">
        {visible.map((action, localIndex) => {
          const index = start + localIndex;
          return (
            <button
              type="button"
              tabIndex={-1}
              key={`${action.id}-${index}`}
              className={`mss-tv-action-card${focusIndex === index ? " is-focused" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onLaunch(action)}
            >
              <span className="mss-tv-action-label">{action.label}</span>
              <span className="mss-tv-action-subtitle">{action.subtitle || action.category || "Ouvrir"}</span>
            </button>
          );
        })}
      </section>
      <footer className="mss-tv-page-footer">OK : ouvrir / lancer la configuration · Retour : SPORTS</footer>
    </main>
  );
}

function TvProfiles({
  connectionStatus,
  tvState,
  focusIndex,
  onFocus,
  onSelect,
}: {
  connectionStatus: string;
  tvState: TvState;
  focusIndex: number;
  onFocus: (index: number) => void;
  onSelect: (id: string) => void;
}) {
  const profiles = tvState.profiles;
  return (
    <main className="mss-tv-section">
      <TvPageHeader title="PROFILS" subtitle="Consulte et sélectionne le profil actif directement depuis la TV." connectionStatus={connectionStatus} />
      {profiles.length ? (
        <section className="mss-tv-profile-grid">
          {profiles.map((profile, index) => (
            <button
              type="button"
              tabIndex={-1}
              key={profile.id}
              className={`mss-tv-profile-card${focusIndex === index ? " is-focused" : ""}${profile.id === tvState.activeProfileId ? " is-active" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onSelect(profile.id)}
            >
              <span className="mss-tv-profile-avatar">{profile.name.slice(0, 2).toUpperCase()}</span>
              <span className="mss-tv-profile-name">{profile.name}</span>
              <span className="mss-tv-profile-meta">{profile.id === tvState.activeProfileId ? "PROFIL ACTIF" : "OK pour sélectionner"}</span>
            </button>
          ))}
        </section>
      ) : (
        <div className="mss-tv-empty">Aucun profil synchronisé. Crée un profil sur le téléphone puis reviens ici.</div>
      )}
      <footer className="mss-tv-page-footer">OK : profil actif · Retour : menu TV</footer>
    </main>
  );
}

function statValue(value: any, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return decimals ? n.toFixed(decimals) : String(Math.round(n));
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
                {profile.name}
              </button>
            ))}
          </section>
          <section className="mss-tv-stats-layout">
            <div className="mss-tv-stats-player">{selected?.name || "Joueur"}</div>
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


type X01QuickState = {
  startScore: 301 | 501 | 701 | 901;
  playerOneIndex: number;
  playerTwoIndex: number;
  duel: boolean;
  outMode: "single" | "double";
};

function TvX01QuickSetup({
  connectionStatus,
  tvState,
  focusIndex,
  state,
  onFocus,
  onChange,
  onStart,
}: {
  connectionStatus: string;
  tvState: TvState;
  focusIndex: number;
  state: X01QuickState;
  onFocus: (index: number) => void;
  onChange: (next: X01QuickState) => void;
  onStart: () => void;
}) {
  const profiles = tvState.profiles;
  const p1 = profiles[state.playerOneIndex] || profiles[0];
  const p2 = profiles[state.playerTwoIndex] || profiles.find((profile) => profile.id !== p1?.id) || profiles[0];
  const scoreValues: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
  const scoreIndex = Math.max(0, scoreValues.indexOf(state.startScore));

  const actions = [
    {
      label: "SCORE DE DÉPART",
      value: String(state.startScore),
      run: () => onChange({ ...state, startScore: scoreValues[(scoreIndex + 1) % scoreValues.length] }),
    },
    {
      label: "FORMAT",
      value: state.duel && profiles.length > 1 ? "DUEL" : "SOLO",
      run: () => onChange({ ...state, duel: profiles.length > 1 ? !state.duel : false }),
    },
    {
      label: "JOUEUR 1",
      value: p1?.name || "Aucun profil",
      run: () => {
        if (!profiles.length) return;
        const next = (state.playerOneIndex + 1) % profiles.length;
        onChange({ ...state, playerOneIndex: next });
      },
    },
    {
      label: "JOUEUR 2",
      value: state.duel ? (p2?.name || "Aucun profil") : "—",
      run: () => {
        if (!state.duel || profiles.length < 2) return;
        let next = (state.playerTwoIndex + 1) % profiles.length;
        if (next === state.playerOneIndex) next = (next + 1) % profiles.length;
        onChange({ ...state, playerTwoIndex: next });
      },
    },
    {
      label: "SORTIE",
      value: state.outMode === "double" ? "DOUBLE OUT" : "SINGLE OUT",
      run: () => onChange({ ...state, outMode: state.outMode === "double" ? "single" : "double" }),
    },
    {
      label: "LANCER LA PARTIE",
      value: profiles.length ? "OK" : "PROFIL REQUIS",
      run: onStart,
      primary: true,
    },
  ];

  return (
    <main className="mss-tv-section">
      <TvPageHeader
        title="X01 · LANCEMENT RAPIDE"
        subtitle="Configure et démarre réellement la partie depuis la télécommande Samsung."
        connectionStatus={connectionStatus}
      />
      <section className="mss-tv-x01-setup">
        <div className="mss-tv-x01-summary">
          <div className="mss-tv-x01-score">{state.startScore}</div>
          <div className="mss-tv-x01-mode">{state.duel && profiles.length > 1 ? "DUEL" : "SOLO"} · {state.outMode === "double" ? "DOUBLE OUT" : "SINGLE OUT"}</div>
          <div className="mss-tv-x01-players">
            <span>{p1?.name || "Aucun profil"}</span>
            {state.duel && profiles.length > 1 ? <><b>VS</b><span>{p2?.name || "Joueur 2"}</span></> : null}
          </div>
        </div>
        <div className="mss-tv-x01-actions">
          {actions.map((action, index) => (
            <button
              key={action.label}
              type="button"
              tabIndex={-1}
              className={`mss-tv-setting-card${focusIndex === index ? " is-focused" : ""}${action.primary ? " is-primary" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={action.run}
            >
              <span>{action.label}</span>
              <b>{action.value}</b>
            </button>
          ))}
        </div>
      </section>
      <footer className="mss-tv-page-footer">OK : modifier / lancer · Retour : modes DARTS</footer>
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
  const [x01Quick, setX01Quick] = React.useState<X01QuickState>({
    startScore: 501,
    playerOneIndex: 0,
    playerTwoIndex: 1,
    duel: true,
    outMode: "double",
  });
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
            activeSport: tvSportById(data.activeSport).id,
            profiles: Array.isArray(data.profiles) ? data.profiles : [],
            friends: Array.isArray(data.friends) ? data.friends : [],
            inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
          };
          tvStateRef.current = next;
          selectedSportRef.current = next.activeSport;
          setTvState(next);
          setSelectedSport(next.activeSport);
          setX01Quick((prev) => {
            const activeIndex = Math.max(0, next.profiles.findIndex((profile) => profile.id === next.activeProfileId));
            const secondIndex = next.profiles.length > 1 ? (activeIndex === 0 ? 1 : 0) : 0;
            const defaultScore = [301, 501, 701, 901].includes(Number(next.settings.defaultX01))
              ? Number(next.settings.defaultX01) as 301 | 501 | 701 | 901
              : prev.startScore;
            return {
              ...prev,
              startScore: defaultScore,
              playerOneIndex: activeIndex,
              playerTwoIndex: secondIndex,
              duel: next.profiles.length > 1 ? prev.duel : false,
              outMode: next.settings.doubleOut ? "double" : "single",
            };
          });
          return;
        }

        if (data.type !== "navigation_state") return;
        const nav: PhoneNavigation = {
          tab: String(data.tab || ""),
          label: String(data.label || viewerRouteLabel(String(data.tab || ""))),
          gameplay: !!data.gameplay || isViewerGameplayRoute(String(data.tab || "")),
          at: Number(data.at || Date.now()),
        };
        setPhoneNavigation(nav);

        const nextScreen = screenForPhoneTab(nav.tab);
        if (nav.gameplay) {
          autoFollowGameRef.current = true;
          setAutoFollowGame(true);
          screenRef.current = "scoreboard";
          setScreen("scoreboard");
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
          setFocusIndex(Math.max(0, profileIndex));
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
    if (selectedSport === "darts" && action.id === "x01") {
      openScreen("x01setup");
      return;
    }
    sendNavigate(action.tab, action.params);
  }, [openScreen, selectedSport, sendNavigate]);

  const selectProfile = React.useCallback((profileId: string) => {
    realtimeRef.current?.sendCommand({
      type: "select_profile",
      profileId,
      source: "samsung-tv",
      at: Date.now(),
    });
    setTvState((prev) => ({ ...prev, activeProfileId: profileId }));
  }, []);

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

  const startQuickX01 = React.useCallback(() => {
    const profiles = tvState.profiles;
    const p1 = profiles[x01Quick.playerOneIndex] || profiles[0];
    const p2 = profiles[x01Quick.playerTwoIndex] || profiles.find((profile) => profile.id !== p1?.id);
    if (!p1) {
      openScreen("profiles");
      sendNavigate("profiles", { view: "me", autoCreate: true });
      return;
    }
    const playerIds = x01Quick.duel && p2 && p2.id !== p1.id ? [p1.id, p2.id] : [p1.id];
    realtimeRef.current?.sendCommand({
      type: "start_x01",
      config: {
        startScore: x01Quick.startScore,
        outMode: x01Quick.outMode,
        inMode: "single",
        playerIds,
        legsPerSet: 1,
        setsToWin: 1,
        serveMode: "alternate",
      },
      source: "samsung-tv",
      at: Date.now(),
    });
    autoFollowGameRef.current = true;
    setAutoFollowGame(true);
  }, [openScreen, sendNavigate, tvState.profiles, x01Quick]);

  const countForScreen = React.useCallback(() => {
    if (screen === "hub") return VIEWER_TV_MENU.length;
    if (screen === "sports") return TV_SPORTS.length;
    if (screen === "sport") return sportActions.length;
    if (screen === "profiles") return tvState.profiles.length;
    if (screen === "stats") return Math.min(TV_STATS_PROFILE_LIMIT, tvState.profiles.length);
    if (screen === "online") return tvState.friends.length;
    if (screen === "settings") return 5;
    if (screen === "x01setup") return 6;
    if (screen === "agenda") return 1;
    return 0;
  }, [screen, sportActions.length, tvState.friends.length, tvState.profiles.length]);

  const columnsForScreen = React.useCallback(() => {
    if (screen === "hub") return 2;
    if (screen === "sports") return 5;
    if (screen === "sport") return 3;
    if (screen === "profiles" || screen === "stats" || screen === "online") return 4;
    if (screen === "settings" || screen === "x01setup") return 2;
    return 1;
  }, [screen]);

  const activateCurrent = React.useCallback(() => {
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
    if (screen === "profiles" || screen === "stats") {
      const profile = tvState.profiles[focusIndex];
      if (profile) selectProfile(profile.id);
      return;
    }
    if (screen === "x01setup") {
      const profiles = tvState.profiles;
      const scores: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
      const scoreIndex = Math.max(0, scores.indexOf(x01Quick.startScore));
      if (focusIndex === 0) setX01Quick((prev) => ({ ...prev, startScore: scores[(scoreIndex + 1) % scores.length] }));
      else if (focusIndex === 1) setX01Quick((prev) => ({ ...prev, duel: profiles.length > 1 ? !prev.duel : false }));
      else if (focusIndex === 2 && profiles.length) setX01Quick((prev) => ({ ...prev, playerOneIndex: (prev.playerOneIndex + 1) % profiles.length }));
      else if (focusIndex === 3 && x01Quick.duel && profiles.length > 1) setX01Quick((prev) => {
        let next = (prev.playerTwoIndex + 1) % profiles.length;
        if (next === prev.playerOneIndex) next = (next + 1) % profiles.length;
        return { ...prev, playerTwoIndex: next };
      });
      else if (focusIndex === 4) setX01Quick((prev) => ({ ...prev, outMode: prev.outMode === "double" ? "single" : "double" }));
      else if (focusIndex === 5) startQuickX01();
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
    activateHub,
    chooseSport,
    focusIndex,
    launchAction,
    screen,
    selectProfile,
    sportActions,
    startQuickX01,
    tvState.profiles,
    tvState.settings,
    updateSetting,
    x01Quick,
  ]);

  React.useEffect(() => {
    if (!sessionId) return;
    const onKey = (event: KeyboardEvent) => {
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
        if (screen === "x01setup") {
          openScreen("sport", Math.max(0, tvLaunchActionsForSport("darts").findIndex((action) => action.id === "x01")));
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

      if (screen === "scoreboard") return;

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
    columnsForScreen,
    countForScreen,
    focusIndex,
    openScreen,
    phoneNavigation?.tab,
    screen,
    selectedSport,
    sessionId,
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

  if (screen === "scoreboard" && hasLiveGame) {
    return (
      <div className="mss-samsung-tv-viewer">
        <div className="mss-tv-scoreboard-hint">Retour : menu TV</div>
        <ViewerScreen snapshot={snapshot} connectionLabel={connectionStatus === "connected" ? "temps réel" : "reconnexion…"} displayMode="tv" />
      </div>
    );
  }

  if (screen === "sports") {
    return <TvSports connectionStatus={connectionStatus} activeSport={currentSport} focusIndex={focusIndex} onFocus={setFocusIndex} onChoose={chooseSport} />;
  }

  if (screen === "sport") {
    return <TvSportLauncher connectionStatus={connectionStatus} sportId={selectedSport} focusIndex={focusIndex} onFocus={setFocusIndex} onLaunch={launchAction} />;
  }

  if (screen === "profiles") {
    return <TvProfiles connectionStatus={connectionStatus} tvState={tvState} focusIndex={focusIndex} onFocus={setFocusIndex} onSelect={selectProfile} />;
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

  if (screen === "x01setup") {
    return (
      <TvX01QuickSetup
        connectionStatus={connectionStatus}
        tvState={tvState}
        focusIndex={focusIndex}
        state={x01Quick}
        onFocus={setFocusIndex}
        onChange={setX01Quick}
        onStart={startQuickX01}
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
