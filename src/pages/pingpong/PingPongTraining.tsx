// =============================================================
// src/pages/pingpong/PingPongTraining.tsx
// Ping-Pong — Training (LOCAL ONLY)
// - Session simple : timer optionnel + succès/échecs + série max
// - Stockage localStorage (dc-pingpong-training)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
};

type TrainingState = {
  startedAt: number | null;
  elapsedMs: number; // cumul
  running: boolean;
  success: number;
  fail: number;
  streak: number;
  bestStreak: number;
  goalSeconds: number | null; // null = libre
};

const LS_KEY = "dc-pingpong-training";

function now() {
  return Date.now();
}

function load(): TrainingState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) throw new Error("no");
    const p = JSON.parse(raw);
    const goalSeconds = typeof p?.goalSeconds === "number" && p.goalSeconds > 0 ? Math.round(p.goalSeconds) : null;
    return {
      startedAt: typeof p?.startedAt === "number" ? p.startedAt : null,
      elapsedMs: typeof p?.elapsedMs === "number" ? p.elapsedMs : 0,
      running: !!p?.running,
      success: typeof p?.success === "number" ? p.success : 0,
      fail: typeof p?.fail === "number" ? p.fail : 0,
      streak: typeof p?.streak === "number" ? p.streak : 0,
      bestStreak: typeof p?.bestStreak === "number" ? p.bestStreak : 0,
      goalSeconds,
    };
  } catch {
    return {
      startedAt: null,
      elapsedMs: 0,
      running: false,
      success: 0,
      fail: 0,
      streak: 0,
      bestStreak: 0,
      goalSeconds: 300,
    };
  }
}

function save(st: TrainingState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  } catch {}
}

function fmtTime(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PingPongTraining({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState<TrainingState>(() => load());

  // Tick (si running)
  React.useEffect(() => {
    if (!st.running || !st.startedAt) return;
    const id = window.setInterval(() => {
      setSt((prev) => {
        if (!prev.running || !prev.startedAt) return prev;
        const elapsedMs = prev.elapsedMs + (now() - prev.startedAt);
        const next: TrainingState = {
          ...prev,
          startedAt: now(),
          elapsedMs,
        };
        // auto-stop si objectif temps
        if (next.goalSeconds && elapsedMs >= next.goalSeconds * 1000) {
          next.running = false;
          next.startedAt = null;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [st.running, st.startedAt, st.goalSeconds]);

  React.useEffect(() => {
    save(st);
  }, [st]);

  const total = st.success + st.fail;
  const sr = total > 0 ? Math.round((st.success / total) * 100) : 0;
  const liveElapsedMs = st.running && st.startedAt ? st.elapsedMs + (now() - st.startedAt) : st.elapsedMs;
  const remainingMs = st.goalSeconds ? Math.max(0, st.goalSeconds * 1000 - liveElapsedMs) : 0;

  function startStop() {
    setSt((prev) => {
      if (prev.running) {
        // stop => figer elapsed
        const elapsedMs = prev.startedAt ? prev.elapsedMs + (now() - prev.startedAt) : prev.elapsedMs;
        return { ...prev, running: false, startedAt: null, elapsedMs };
      }
      return { ...prev, running: true, startedAt: now() };
    });
  }

  function resetAll() {
    setSt({
      startedAt: null,
      elapsedMs: 0,
      running: false,
      success: 0,
      fail: 0,
      streak: 0,
      bestStreak: 0,
      goalSeconds: st.goalSeconds,
    });
  }

  function addSuccess() {
    setSt((prev) => {
      const streak = prev.streak + 1;
      return {
        ...prev,
        success: prev.success + 1,
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
      };
    });
  }

  function addFail() {
    setSt((prev) => ({ ...prev, fail: prev.fail + 1, streak: 0 }));
  }

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("pingpong_menu")}>←</button>
        <div style={title}>PING-PONG · TRAINING</div>
        <button style={ghost(theme)} onClick={resetAll}>↻</button>
      </div>

      <div style={card(theme)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "stretch" }}>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Temps</div>
            <div style={kpiVal}>{st.goalSeconds ? fmtTime(remainingMs) : fmtTime(liveElapsedMs)}</div>
            <div style={kpiHint}>{st.goalSeconds ? "Restant" : "Écoulé"}</div>
          </div>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Réussite</div>
            <div style={kpiVal}>{sr}%</div>
            <div style={kpiHint}>{st.success}/{total}</div>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Série</div>
            <div style={kpiVal}>{st.streak}</div>
            <div style={kpiHint}>En cours</div>
          </div>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Record</div>
            <div style={kpiVal}>{st.bestStreak}</div>
            <div style={kpiHint}>Meilleure série</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={primary(theme)} onClick={startStop}>{st.running ? "Pause" : "Start"}</button>
          <button style={btn(theme)} onClick={addSuccess}>+ Réussi</button>
          <button style={btn(theme)} onClick={addFail}>+ Raté</button>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.85, lineHeight: 1.45 }}>
          Astuce : utilise “Réussi / Raté” pour tracker un exercice (services, régularité, etc.).
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Objectif temps</div>
          <select
            value={st.goalSeconds ? String(st.goalSeconds) : "free"}
            onChange={(e) => {
              const v = e.target.value;
              setSt((prev) => ({ ...prev, goalSeconds: v === "free" ? null : Number(v) || 300 }));
            }}
            style={select(theme)}
          >
            <option value="free">Libre</option>
            <option value="60">1 min</option>
            <option value="180">3 min</option>
            <option value="300">5 min</option>
            <option value="600">10 min</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  return {
    height: "100dvh",
    overflow: "hidden",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, flex: 1, textAlign: "center" };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
    opacity: 0.9,
  };
}

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
  };
}

function kpi(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    padding: 12,
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
  };
}

const kpiLabel: React.CSSProperties = { fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 };
const kpiVal: React.CSSProperties = { fontSize: 30, fontWeight: 1000 as any, letterSpacing: 1 };
const kpiHint: React.CSSProperties = { marginTop: 4, fontSize: 12, fontWeight: 800, opacity: 0.75 };

function primary(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: theme?.primary ? `${theme.primary}22` : "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function btn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}

function select(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    outline: "none",
    fontWeight: 900,
  };
}
