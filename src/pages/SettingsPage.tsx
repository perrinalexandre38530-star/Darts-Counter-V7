
import React from "react";
import type { Settings } from "../lib/types";
import { clearStore } from "../lib/storage";

type DiagState = {
  memUsedMB: string;
  memLimitMB: string;
  storeMB: string;
  route: string;
  lastRuntimeError: string;
  lastMemoryWarning: string;
  lastStoreWarning: string;
  lastChunkError: string;
  updatedAt: string;
};

function formatDateTime(ts: any) {
  try {
    if (!ts) return "—";
    return new Date(Number(ts)).toLocaleString();
  } catch {
    return "—";
  }
}

function truncate(s: string, n = 180) {
  const v = String(s || "");
  if (v.length <= n) return v;
  return v.slice(0, n) + "…";
}

function readDiagnostics(): DiagState {
  const fallback: DiagState = {
    memUsedMB: "?",
    memLimitMB: "?",
    storeMB: "?",
    route: "—",
    lastRuntimeError: "—",
    lastMemoryWarning: "—",
    lastStoreWarning: "—",
    lastChunkError: "—",
    updatedAt: "—",
  };

  try {
    const memRaw = localStorage.getItem("dc_memory_diag_v1");
    const mem = memRaw ? JSON.parse(memRaw) : null;

    const runtimeRaw = localStorage.getItem("dc_last_runtime_error_v1");
    const runtime = runtimeRaw ? JSON.parse(runtimeRaw) : null;

    const memWarnRaw = localStorage.getItem("dc_last_memory_warning_v1");
    const memWarn = memWarnRaw ? JSON.parse(memWarnRaw) : null;

    const storeWarnRaw = localStorage.getItem("dc_store_size_warning");
    const storeWarn = storeWarnRaw ? JSON.parse(storeWarnRaw) : null;

    const chunkRaw = localStorage.getItem("dc_last_chunk_error_v1");
    const chunk = chunkRaw ? JSON.parse(chunkRaw) : null;

    return {
      memUsedMB: String(mem?.usedMB ?? "?"),
      memLimitMB: String(mem?.limitMB ?? "?"),
      storeMB: String(mem?.storeMB ?? "?"),
      route: String(mem?.route ?? "—"),
      lastRuntimeError: runtime
        ? `${formatDateTime(runtime.at)} — ${truncate(runtime.message || runtime.stack || "Erreur runtime")}`
        : "—",
      lastMemoryWarning: memWarn
        ? `${formatDateTime(memWarn.at)} — ${memWarn.usedMB}/${memWarn.limitMB} MB sur ${memWarn.route || "—"}`
        : "—",
      lastStoreWarning: storeWarn
        ? `${formatDateTime(storeWarn.at)} — ${storeWarn.mb} MB`
        : "—",
      lastChunkError: chunk
        ? `${formatDateTime(chunk.at)} — ${truncate(chunk.message || "Chunk error")}`
        : "—",
      updatedAt: formatDateTime(mem?.at),
    };
  } catch {
    return fallback;
  }
}

function diagTone(used: string, limit: string) {
  const u = Number(used);
  const l = Number(limit);
  if (!Number.isFinite(u) || !Number.isFinite(l) || l <= 0) {
    return { color: "#9aa4b2", label: "Inconnu" };
  }
  const ratio = u / l;
  if (ratio >= 0.85) return { color: "#ff6b6b", label: "Critique" };
  if (ratio >= 0.7) return { color: "#ffb020", label: "Surveillance" };
  return { color: "#2ecc71", label: "OK" };
}

export default function SettingsPage({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
}) {
  const [diag, setDiag] = React.useState<DiagState>(() => readDiagnostics());

  React.useEffect(() => {
    const refresh = () => setDiag(readDiagnostics());
    refresh();
    const id = window.setInterval(refresh, 2000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function set<K extends keyof Settings>(key: K, v: Settings[K]) {
    onChange({ ...value, [key]: v });
  }

  function onReset() {
    const ok = window.confirm(
      "Réinitialiser toutes les données locales (profils, historiques, réglages) ?\n\nCette action est définitive."
    );
    if (ok) clearStore();
  }

  function copyDiagnostics() {
    const text =
      [
        "=== DIAGNOSTIC APP ===",
        `MEM: ${diag.memUsedMB} / ${diag.memLimitMB} MB`,
        `STORE: ${diag.storeMB} MB`,
        `ROUTE: ${diag.route}`,
        `UPDATED: ${diag.updatedAt}`,
        `RUNTIME: ${diag.lastRuntimeError}`,
        `MEM WARNING: ${diag.lastMemoryWarning}`,
        `STORE WARNING: ${diag.lastStoreWarning}`,
        `CHUNK ERROR: ${diag.lastChunkError}`,
      ].join("\n");

    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function clearDiagnostics() {
    try {
      localStorage.removeItem("dc_memory_diag_v1");
      localStorage.removeItem("dc_last_runtime_error_v1");
      localStorage.removeItem("dc_last_memory_warning_v1");
      localStorage.removeItem("dc_store_size_warning");
      localStorage.removeItem("dc_last_chunk_error_v1");
    } catch {}
    setDiag(readDiagnostics());
  }

  const tone = diagTone(diag.memUsedMB, diag.memLimitMB);

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>X01</h2>

        <div className="grid2" style={{ marginBottom: 10 }}>
          <div>
            <div className="subtitle" style={{ marginBottom: 6 }}>
              Score de départ
            </div>
            <select
              className="input"
              value={value.defaultX01}
              onChange={(e) =>
                set(
                  "defaultX01",
                  Number(e.target.value) as 301 | 501 | 701 | 1001
                )
              }
            >
              <option value={301}>301</option>
              <option value={501}>501</option>
              <option value={701}>701</option>
              <option value={1001}>1001</option>
            </select>
          </div>

          <div>
            <div className="subtitle" style={{ marginBottom: 6 }}>
              Sortie (out mode)
            </div>
            <select
              className="input"
              value={value.doubleOut ? "double" : "single"}
              onChange={(e) => set("doubleOut", e.target.value === "double")}
            >
              <option value="single">Single Out</option>
              <option value="double">Double Out</option>
            </select>
          </div>
        </div>

        <div className="row" style={{ gap: 14 }}>
          <label className="row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={value.randomOrder}
              onChange={(e) => set("randomOrder", e.target.checked)}
            />
            <span>Tirage aléatoire de l’ordre des joueurs</span>
          </label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          Ambiance & voix
        </h2>

        <div className="row" style={{ gap: 14, marginBottom: 10 }}>
          <label className="row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={value.neonTheme}
              onChange={(e) => set("neonTheme", e.target.checked)}
            />
            <span>Mode arcade (fond néon)</span>
          </label>

          <label className="row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={value.ttsOnThird}
              onChange={(e) => set("ttsOnThird", e.target.checked)}
            />
            <span>Activer la voix à la 3ᵉ fléchette</span>
          </label>
        </div>

        <div style={{ maxWidth: 280 }}>
          <div className="subtitle" style={{ marginBottom: 6 }}>
            Langue
          </div>
          <select
            className="input"
            value={value.lang}
            onChange={(e) => set("lang", e.target.value as Settings["lang"])}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16, borderColor: "rgba(255,196,0,.28)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          Diagnostic mémoire / crash
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="subtitle" style={{ marginBottom: 6 }}>Mémoire JS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: tone.color }}>
              {diag.memUsedMB} / {diag.memLimitMB} MB
            </div>
            <div className="subtitle" style={{ marginTop: 4 }}>
              État : {tone.label}
            </div>
          </div>

          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="subtitle" style={{ marginBottom: 6 }}>Taille store</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {diag.storeMB} MB
            </div>
            <div className="subtitle" style={{ marginTop: 4 }}>
              Dernière mesure : {diag.updatedAt}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>Route actuelle</div>
          <div className="input" style={{ minHeight: 40, display: "flex", alignItems: "center" }}>
            {diag.route}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>Dernière erreur runtime</div>
          <div className="input" style={{ minHeight: 56, whiteSpace: "pre-wrap" }}>
            {diag.lastRuntimeError}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>Dernier warning mémoire</div>
          <div className="input" style={{ minHeight: 56, whiteSpace: "pre-wrap" }}>
            {diag.lastMemoryWarning}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>Dernier warning store</div>
          <div className="input" style={{ minHeight: 56, whiteSpace: "pre-wrap" }}>
            {diag.lastStoreWarning}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>Dernière erreur de chunk</div>
          <div className="input" style={{ minHeight: 56, whiteSpace: "pre-wrap" }}>
            {diag.lastChunkError}
          </div>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={copyDiagnostics}>
            Copier le diagnostic
          </button>
          <button className="btn" onClick={() => setDiag(readDiagnostics())}>
            Rafraîchir
          </button>
          <button className="btn danger" onClick={clearDiagnostics}>
            Vider les logs diagnostic
          </button>
        </div>
      </section>

      <section className="card" style={{ borderColor: "rgba(255,92,102,.35)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          Réinitialiser l’application
        </h2>
        <p className="subtitle" style={{ margin: "0 0 12px" }}>
          Efface toutes les données locales (profils, historiques, réglages) et
          redémarre l’application.
        </p>
        <button className="btn danger" onClick={onReset}>
          Réinitialiser les données
        </button>
      </section>
    </div>
  );
}
