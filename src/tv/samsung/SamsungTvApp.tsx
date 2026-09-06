import * as React from "react";
import ViewerDisplay from "../../pages/viewer/ViewerDisplay";
import { normalizeViewerCode } from "../../lib/viewer/viewerClient";

const LAST_CODE_KEY = "mss_samsung_tv_last_viewer_code_v1";
const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
const GRID_COLUMNS = 8;

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
      subtitle: "SAMSUNG TV · VIEWER",
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
    subtitle: "SAMSUNG TV · VIEWER",
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

    // Directional keys, Enter and Back are provided by the TV without
    // registration. Media/color keys would need tvinputdevice.registerKey().
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
  const totalKeys = CODE_CHARS.length + 3; // delete, clear, connect
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
    if (index < CODE_CHARS.length) {
      append(CODE_CHARS[index]);
      return;
    }
    if (index === deleteIndex) {
      removeOne();
      return;
    }
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
      <button
        key={`${label}-${index}`}
        type="button"
        tabIndex={-1}
        className={`mss-tv-key mss-tv-key--${kind}${active ? " is-focused" : ""}`}
        onMouseEnter={() => setFocusIndex(index)}
        onClick={() => activate(index)}
      >
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
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <span key={index} className={code[index] ? "is-filled" : ""}>{code[index] || "·"}</span>
          ))}
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

export default function SamsungTvApp() {
  useTizenStartup();
  const [sessionId, setSessionId] = React.useState(() => codeFromHash(window.location.hash));

  const join = React.useCallback((code: string) => {
    const clean = normalizeViewerCode(code).slice(0, CODE_LENGTH);
    if (!clean) return;
    saveLastCode(clean);
    setSessionId(clean);
    setHash(clean);
  }, []);

  const go = React.useCallback((tab: any, params?: any) => {
    if (tab === "viewer_display") {
      join(String(params?.sessionId || ""));
      return;
    }
    setSessionId("");
    setHash(null);
  }, [join]);

  React.useEffect(() => {
    const syncHash = () => setSessionId(codeFromHash(window.location.hash));
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  React.useEffect(() => {
    if (!sessionId) return;
    const onBack = (event: KeyboardEvent) => {
      const key = String(event.key || "");
      const keyCode = Number((event as any).keyCode || (event as any).which || 0);
      if (keyCode !== 10009 && key !== "BrowserBack" && key !== "GoBack") return;
      event.preventDefault();
      event.stopPropagation();
      setSessionId("");
      setHash(null);
    };
    window.addEventListener("keydown", onBack, { capture: true });
    return () => window.removeEventListener("keydown", onBack, { capture: true } as any);
  }, [sessionId]);

  if (!sessionId) return <TvJoin onJoin={join} />;

  return (
    <div className="mss-samsung-tv-viewer">
      <button className="mss-tv-change-code" onClick={() => go("viewer_join")} tabIndex={-1}>
        {getCopy().back}
      </button>
      <ViewerDisplay go={go} sessionId={sessionId} displayMode="tv" />
    </div>
  );
}
