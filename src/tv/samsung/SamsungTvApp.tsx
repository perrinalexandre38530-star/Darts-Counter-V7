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

const LAST_CODE_KEY = "mss_samsung_tv_last_viewer_code_v1";
const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
const GRID_COLUMNS = 8;
const TV_BUILD_MARKER = "MSS_TV_INTERACTIVE_BUILD_20260914_01";

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
      enterCode: "Entre le code Viewer affiché sur le téléphone",
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
    enterCode: "Enter the Viewer code shown on your phone",
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
  if (!raw.startsWith("#/viewer/")) return "";
  return normalizeViewerCode(raw.replace(/^#\/viewer\//, "").split(/[?#]/)[0] || "").slice(0, CODE_LENGTH);
}

function setHash(code: string | null) {
  const next = code ? `#/viewer/${encodeURIComponent(code)}` : "#/join";
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

function connectionText(status: string) {
  if (status === "connected") return "TÉLÉPHONE CONNECTÉ";
  if (status === "connecting") return "CONNEXION…";
  if (status === "error") return "CONNEXION DÉGRADÉE";
  return "TÉLÉPHONE HORS LIGNE";
}

function TvHub({
  sessionId,
  snapshot,
  connectionStatus,
  phoneNavigation,
  focusIndex,
  onFocus,
  onActivate,
}: {
  sessionId: string;
  snapshot: ViewerLiveSnapshot | null;
  connectionStatus: string;
  phoneNavigation: PhoneNavigation | null;
  focusIndex: number;
  onFocus: (index: number) => void;
  onActivate: (index: number) => void;
}) {
  const live = !!snapshot && Array.isArray(snapshot.players) && snapshot.players.length > 0 && snapshot.phase !== "lobby";
  const active = snapshot?.players?.find((p) => p.isActive) || snapshot?.players?.[0] || null;
  return (
    <main className="mss-tv-hub" data-build={TV_BUILD_MARKER}>
      <header className="mss-tv-hub-header">
        <div>
          <div className="mss-tv-hub-title">MULTISPORTS SCORING</div>
          <div className="mss-tv-hub-subtitle">TV INTERACTIVE · SESSION {sessionId}</div>
          <div className="mss-tv-build-marker">INTERACTIVE V1 · 2026.09.14-01</div>
        </div>
        <div className={`mss-tv-link-state is-${connectionStatus}`}>
          <span className="mss-tv-link-dot" />
          {connectionText(connectionStatus)}
        </div>
      </header>

      <section className="mss-tv-now">
        <div className="mss-tv-now-kicker">ÉCRAN DU TÉLÉPHONE</div>
        <div className="mss-tv-now-title">{phoneNavigation?.label || "En attente du téléphone"}</div>
        <div className="mss-tv-now-copy">
          {live
            ? `${String(snapshot?.game || "partie").toUpperCase()} · ${active?.name || "Joueur"} · ${active?.score ?? "—"}`
            : "Navigue sur le téléphone ou utilise la télécommande Samsung : les deux écrans restent liés."}
        </div>
      </section>

      <section className="mss-tv-menu-grid">
        {VIEWER_TV_MENU.map((item, index) => {
          const focused = focusIndex === index;
          const disabled = item.kind === "scoreboard" && !live;
          return (
            <button
              key={item.id}
              type="button"
              tabIndex={-1}
              className={`mss-tv-menu-card${focused ? " is-focused" : ""}${disabled ? " is-disabled" : ""}`}
              onMouseEnter={() => onFocus(index)}
              onClick={() => onActivate(index)}
            >
              <span className="mss-tv-menu-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="mss-tv-menu-label">{item.label}</span>
              <span className="mss-tv-menu-subtitle">{item.kind === "scoreboard" && !live ? "Aucune partie active" : item.subtitle}</span>
              {item.kind === "scoreboard" && live ? <span className="mss-tv-live-pill">LIVE</span> : null}
            </button>
          );
        })}
      </section>

      <footer className="mss-tv-hub-footer">
        <span>← ↑ ↓ → naviguer · OK ouvrir</span>
        <span>Retour : écran précédent / changer de code</span>
      </footer>
    </main>
  );
}

export default function SamsungTvApp() {
  useTizenStartup();
  const [sessionId, setSessionId] = React.useState(() => codeFromHash(window.location.hash));
  const [snapshot, setSnapshot] = React.useState<ViewerLiveSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState("connecting");
  const [phoneNavigation, setPhoneNavigation] = React.useState<PhoneNavigation | null>(null);
  const [mode, setMode] = React.useState<"hub" | "scoreboard">("hub");
  const [focusIndex, setFocusIndex] = React.useState(1);
  const [autoFollowGame, setAutoFollowGame] = React.useState(true);
  const realtimeRef = React.useRef<ViewerRealtimeConnection | null>(null);

  const join = React.useCallback((code: string) => {
    const clean = normalizeViewerCode(code).slice(0, CODE_LENGTH);
    if (!clean) return;
    saveLastCode(clean);
    setSessionId(clean);
    setSnapshot(null);
    setPhoneNavigation(null);
    setMode("hub");
    setAutoFollowGame(true);
    setHash(clean);
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
      if (hasGame && autoFollowGame) setMode("scoreboard");
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
      onStatus: (next) => alive && setConnectionStatus(next),
      onSnapshot: (next) => applySnapshot(next),
      onCommand: (data) => {
        if (!alive || !data || typeof data !== "object") return;
        if (data.type !== "navigation_state") return;
        const nav: PhoneNavigation = {
          tab: String(data.tab || ""),
          label: String(data.label || viewerRouteLabel(String(data.tab || ""))),
          gameplay: !!data.gameplay || isViewerGameplayRoute(String(data.tab || "")),
          at: Number(data.at || Date.now()),
        };
        setPhoneNavigation(nav);
        setFocusIndex(viewerMenuIndexForRoute(nav.tab));
        if (nav.gameplay) {
          setAutoFollowGame(true);
          setMode("scoreboard");
        } else if (!snapshot?.players?.length) {
          setMode("hub");
        }
      },
    });

    return () => {
      alive = false;
      if (pollTimer != null) window.clearTimeout(pollTimer);
      realtimeRef.current?.close();
      realtimeRef.current = null;
    };
  // snapshot intentionally not a dependency: realtime callbacks own the current session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const hasLiveGame = !!snapshot && Array.isArray(snapshot.players) && snapshot.players.length > 0 && snapshot.phase !== "lobby";

  const activateMenu = React.useCallback((index: number) => {
    const item = VIEWER_TV_MENU[index];
    if (!item) return;
    if (item.kind === "scoreboard") {
      if (!hasLiveGame) return;
      setAutoFollowGame(false);
      setMode("scoreboard");
      return;
    }
    if (!item.tab) return;
    realtimeRef.current?.sendCommand({
      type: "navigate",
      tab: item.tab,
      source: "samsung-tv",
      at: Date.now(),
    });
  }, [hasLiveGame]);

  React.useEffect(() => {
    if (!sessionId) return;
    const onKey = (event: KeyboardEvent) => {
      const key = String(event.key || "");
      const keyCode = Number((event as any).keyCode || (event as any).which || 0);
      const isBack = keyCode === 10009 || key === "BrowserBack" || key === "GoBack";

      if (isBack) {
        event.preventDefault();
        event.stopPropagation();
        if (mode === "scoreboard") {
          setAutoFollowGame(false);
          setMode("hub");
        } else {
          realtimeRef.current?.close();
          setSessionId("");
          setHash(null);
        }
        return;
      }

      if (mode !== "hub") return;
      let next = focusIndex;
      const cols = 2;
      if (key === "ArrowLeft") next = Math.max(0, focusIndex - 1);
      else if (key === "ArrowRight") next = Math.min(VIEWER_TV_MENU.length - 1, focusIndex + 1);
      else if (key === "ArrowUp") next = Math.max(0, focusIndex - cols);
      else if (key === "ArrowDown") next = Math.min(VIEWER_TV_MENU.length - 1, focusIndex + cols);
      else if (key === "Enter") {
        event.preventDefault();
        activateMenu(focusIndex);
        return;
      } else return;

      event.preventDefault();
      setFocusIndex(next);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [activateMenu, focusIndex, mode, sessionId]);

  if (!sessionId) return <TvJoin onJoin={join} />;

  if (mode === "scoreboard" && hasLiveGame) {
    return (
      <div className="mss-samsung-tv-viewer">
        <div className="mss-tv-scoreboard-hint">Retour : menu TV</div>
        <ViewerScreen snapshot={snapshot} connectionLabel={connectionStatus === "connected" ? "temps réel" : "reconnexion…"} displayMode="tv" />
      </div>
    );
  }

  return (
    <TvHub
      sessionId={sessionId}
      snapshot={snapshot}
      connectionStatus={connectionStatus}
      phoneNavigation={phoneNavigation}
      focusIndex={focusIndex}
      onFocus={setFocusIndex}
      onActivate={activateMenu}
    />
  );
}
