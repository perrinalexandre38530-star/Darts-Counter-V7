// =============================================================
// src/pages/ScramPlay.tsx
// SCRAM — PLAY (Cricket-style UI)
// - Reprend l'ergonomie CricketPlay : tableau cibles + modes KEYPAD/CIBLE + S/D/T + Dartboard
// - Branché sur le moteur ScramEngine via useScramEngine
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import DartboardClickable from "../components/DartboardClickable";
import { CricketMarkIcon } from "../components/MaskIcon";
import tickerScram from "../assets/tickers/ticker_scram.png";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useScramEngine } from "../hooks/useScramEngine";

type TeamId = "A" | "B";
type HitMode = "S" | "D" | "T";
type InputMethod = "keypad" | "dartboard";

type UIDart = { v: number; mult: 1 | 2 | 3 };

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.10)",
};

const TARGETS: number[] = [20, 19, 18, 17, 16, 15, 25];

const TARGET_COLORS: Record<number, string> = {
  15: "#F6C256",
  16: "#fbbf24",
  17: "#fb923c",
  18: "#f97316",
  19: "#fb7185",
  20: "#ef4444",
  25: "#b91c1c",
};

const SCORE_INPUT_LS_KEY = "dc_score_input_method"; // même clé que cricket (fallback)

function labelTarget(t: number) {
  return t === 25 ? "BULL" : String(t);
}

function clampMarks(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(3, Math.floor(v))) : 0;
}

function bullToUIDart(mode: HitMode): UIDart {
  // SCRAM: OB=25, IB=50 (aligné sur uiThrowToGameDarts)
  if (mode === "S") return { v: 25, mult: 1 };
  return { v: 50, mult: 1 };
}

function modeToMult(mode: HitMode): 1 | 2 | 3 {
  return mode === "S" ? 1 : mode === "D" ? 2 : 3;
}

function uiDartLabel(d: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return "OB";
  if (d.v === 50) return "IB";
  const p = d.mult === 1 ? "S" : d.mult === 2 ? "D" : "T";
  return `${p}${d.v}`;
}

function computeMini(state: any) {
  const out = { darts: 0, miss: 0, s: 0, d: 0, t: 0, ob: 0, ib: 0 };
  for (const h of state?.history ?? []) {
    for (const dart of h?.darts ?? []) {
      out.darts += 1;
      if (!dart || dart.bed === "MISS") out.miss += 1;
      if (dart?.bed === "S") out.s += 1;
      if (dart?.bed === "D") out.d += 1;
      if (dart?.bed === "T") out.t += 1;
      if (dart?.bed === "OB") out.ob += 1;
      if (dart?.bed === "IB") out.ib += 1;
    }
  }
  return out;
}

export default function ScramPlay(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  const profiles = (props?.profiles ?? []) as any[];
  const params = props?.params ?? props ?? {};
  const selectedIds: string[] =
    params?.selectedIds ??
    params?.scram_config?.selectedIds ??
    params?.payload?.selectedIds ??
    [];

  const objective = Number(params?.objective ?? params?.scram_config?.objective ?? 200) || 200;
  const roundsCap = Number(params?.roundsCap ?? params?.scram_config?.roundsCap ?? 0) || 0;

  const players = React.useMemo(() => {
    const chosen = profiles.filter((p) => selectedIds.includes(p.id));
    // fallback (évite init vide)
    return chosen.length ? chosen : profiles.slice(0, 2);
  }, [profiles, selectedIds.join("|")]);

  const { state, play, undo, canUndo, isFinished, winner } = useScramEngine(players as any, {
    objective,
    maxRounds: roundsCap,
    useBull: true,
    marksToClose: 3,
  });

  const [hitMode, setHitMode] = React.useState<HitMode>("S");
  const [inputMethod, setInputMethod] = React.useState<InputMethod>(() => {
    try {
      const v = localStorage.getItem(SCORE_INPUT_LS_KEY);
      return v === "dartboard" ? "dartboard" : "keypad";
    } catch {
      return "keypad";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(SCORE_INPUT_LS_KEY, inputMethod);
    } catch {}
  }, [inputMethod]);

  const [throwDarts, setThrowDarts] = React.useState<UIDart[]>([]);
  const maxDarts = 3;

  const currentPlayer = state?.players?.[state?.currentPlayerIndex ?? 0];
  const teamByPlayer = (state?.teamByPlayer ?? {}) as Record<string, TeamId>;
  const activeTeam: TeamId = teamByPlayer[String(currentPlayer?.id)] ?? "A";

  const phase = state?.phase ?? "race";
  const mini = React.useMemo(() => computeMini(state), [state?.history]);

  // Marks getters
  const marksRace = (team: TeamId, target: number) => clampMarks(state?.raceMarks?.[team]?.[target] ?? 0);
  const marksClosers = (target: number) => clampMarks(state?.closersMarks?.[target] ?? 0);

  function onKeyPress(value: number) {
    if (isFinished) return;
    if (throwDarts.length >= maxDarts) return;
    if (value === 25) {
      setThrowDarts((prev) => [...prev, bullToUIDart(hitMode)]);
      return;
    }
    const mult = modeToMult(hitMode);
    setThrowDarts((prev) => [...prev, { v: value, mult }]);
  }

  function onDartboardHit(hit: any) {
    if (isFinished) return;
    if (!hit) return;
    if (throwDarts.length >= maxDarts) return;

    const v = Number(hit?.value ?? hit?.v ?? 0) || 0;
    const mult = Number(hit?.multiplier ?? hit?.mult ?? hit?.m ?? 1) as 1 | 2 | 3;
    // Normalize bull
    if (v === 25 && mult >= 2) {
      setThrowDarts((prev) => [...prev, { v: 50, mult: 1 }]);
      return;
    }
    setThrowDarts((prev) => [...prev, { v, mult: (mult === 2 ? 2 : mult === 3 ? 3 : 1) }]);
  }

  function onClear() {
    setThrowDarts([]);
  }

  function onValidate() {
    if (isFinished) return;
    if (!throwDarts.length) return;
    play(throwDarts as any);
    setThrowDarts([]);
  }

  // UI helpers
  const pill = (active: boolean, color: string) => ({
    flex: 1,
    padding: "12px 0",
    borderRadius: 999,
    border: `1px solid ${active ? color : "rgba(255,255,255,0.12)"}`,
    background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
    color: active ? "#fff" : "rgba(255,255,255,0.75)",
    fontWeight: 900,
    letterSpacing: 1,
  } as React.CSSProperties);

  const keypadNums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const infoText =
    "SCRAM — 2 phases\n\n" +
    "RACE : les 2 équipes ferment 20→15 (+ Bull) en 3 marques.\n" +
    "SCRAM : l'équipe gagnante de la RACE devient SCORERS (marque des points), l'autre CLOSERS (ferme).\n\n" +
    "Victoire : SCORERS atteignent l'objectif OU CLOSERS ferment toutes les cibles.";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* Header ticker */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}>
        <div style={{ padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <BackDot onClick={() => props?.go?.("local") ?? props?.navigate?.("/local")} />
          <div style={{ flex: 1 }} />
          <InfoDot text={infoText} />
        </div>
        <div style={{ padding: "0 12px 10px" }}>
          <img
            src={tickerScram}
            alt="SCRAM"
            style={{ width: "100%", height: 92, objectFit: "cover", borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)" }}
          />
        </div>
      </div>

      <div style={{ padding: 14, maxWidth: 820, margin: "0 auto" }}>
        {/* Status card */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>PHASE {String(phase).toUpperCase()}</div>
              <div style={{ fontSize: 26, fontWeight: 1000, lineHeight: 1.05 }}>{currentPlayer?.name ?? "—"}</div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Équipe: <span style={{ fontWeight: 900, color: activeTeam === "A" ? "#f472b6" : "#F6C256" }}>{activeTeam}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                Darts {mini.darts} • Miss {mini.miss} • S {mini.s} • D {mini.d} • T {mini.t} • OB {mini.ob} • IB {mini.ib}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, opacity: 0.75 }}>SCRAM SCORE</div>
              <div style={{ fontSize: 34, fontWeight: 1000, color: "#34d399" }}>{Number(state?.scramScore ?? 0)}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>Objectif: <b>{objective}</b></div>
            </div>
          </div>

          {isFinished ? (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.35)" }}>
              <b>Partie terminée</b> — Vainqueur: <b>{String(winner ?? state?.winningTeam ?? "—")}</b>
            </div>
          ) : null}
        </div>

        {/* Targets table (Cricket-style) */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 1000 }}>RACE — fermeture des cibles</div>
          <div
            style={{
              marginTop: 10,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 1fr", padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ opacity: 0.75, fontWeight: 900 }}>Cible</div>
              <div style={{ textAlign: "center", fontWeight: 1000, color: "#f472b6" }}>TEAM A</div>
              <div style={{ textAlign: "center", fontWeight: 1000, color: "#F6C256" }}>TEAM B</div>
            </div>

            {TARGETS.map((target) => {
              const a = phase === "race" ? marksRace("A", target) : (state?.raceMarks?.A ? clampMarks(state?.raceMarks?.A?.[target]) : 0);
              const b = phase === "race" ? marksRace("B", target) : (state?.raceMarks?.B ? clampMarks(state?.raceMarks?.B?.[target]) : 0);
              const closers = phase === "scram" ? marksClosers(target) : 0;

              // In SCRAM phase: show closers marks on closers column
              const closersTeam: TeamId | null = (state?.closersTeam ?? null) as any;
              const showA = phase === "scram" && closersTeam === "A" ? closers : a;
              const showB = phase === "scram" && closersTeam === "B" ? closers : b;

              const color = TARGET_COLORS[target] ?? "#fff";

              const cell = (n: number, accent: string) => (
                <div
                  style={{
                    height: 46,
                    borderRadius: 14,
                    background: "rgba(32, 40, 70, 0.35)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <CricketMarkIcon marks={n} color={accent} size={20} />
                </div>
              );

              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr 1fr",
                    gap: 10,
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      height: 46,
                      borderRadius: 14,
                      background: "rgba(0,0,0,0.20)",
                      border: `1px solid rgba(255,255,255,0.10)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 1000,
                      fontSize: 18,
                      color: "#fff",
                      boxShadow: `0 0 0 1px rgba(0,0,0,0.25), 0 0 18px rgba(0,0,0,0.20)`,
                    }}
                  >
                    {target === 25 ? "B" : target}
                  </div>
                  {cell(showA, "#f472b6")}
                  {cell(showB, "#F6C256")}
                </div>
              );
            })}
          </div>
        </div>

        {/* Input */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setInputMethod("keypad")}
              style={pill(inputMethod === "keypad", "#F6C256")}
            >
              KEYPAD
            </button>
            <button
              type="button"
              onClick={() => setInputMethod("dartboard")}
              style={pill(inputMethod === "dartboard", "#F6C256")}
            >
              CIBLE
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setHitMode("S")} style={pill(hitMode === "S", "#34d399")}>
              S
            </button>
            <button type="button" onClick={() => setHitMode("D")} style={pill(hitMode === "D", "#22d3ee")}>
              D
            </button>
            <button type="button" onClick={() => setHitMode("T")} style={pill(hitMode === "T", "#a855f7")}>
              T
            </button>
          </div>

          <button
            type="button"
            onClick={() => onKeyPress(25)}
            disabled={isFinished || throwDarts.length >= maxDarts}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(34,197,94,0.20)",
              fontWeight: 1000,
              letterSpacing: 0.5,
              color: "#d1fae5",
            }}
          >
            BULL (S=OB / D,T=IB)
          </button>

          {inputMethod === "keypad" ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 18,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {keypadNums.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onKeyPress(n)}
                    disabled={isFinished || throwDarts.length >= maxDarts}
                    style={{
                      height: 48,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(32, 40, 70, 0.45)",
                      color: "#fff",
                      fontWeight: 1000,
                      fontSize: 16,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <DartboardClickable onHit={onDartboardHit as any} disabled={isFinished || throwDarts.length >= maxDarts} />
            </div>
          )}

          {/* Volley footer */}
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              padding: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ opacity: 0.9 }}>
                <div style={{ fontWeight: 900 }}>Volée</div>
                <div style={{ marginTop: 4, fontSize: 16, fontWeight: 900 }}>
                  {throwDarts.length ? throwDarts.map(uiDartLabel).join("  ·  ") : "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={!throwDarts.length || isFinished}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    opacity: !throwDarts.length || isFinished ? 0.4 : 1,
                    fontWeight: 900,
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => (canUndo ? undo() : null)}
                  disabled={!canUndo || isFinished}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    opacity: !canUndo || isFinished ? 0.4 : 1,
                    fontWeight: 900,
                  }}
                >
                  Undo
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onValidate}
              disabled={!throwDarts.length || isFinished}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "14px 16px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,0.45)",
                background: "rgba(34,197,94,0.22)",
                color: "#d1fae5",
                fontWeight: 1000,
                letterSpacing: 1,
                opacity: !throwDarts.length || isFinished ? 0.45 : 1,
              }}
            >
              VALIDER
            </button>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
              Total: {mini.darts} darts • {mini.miss} miss • {mini.s}S / {mini.d}D / {mini.t}T • {mini.ob}OB / {mini.ib}IB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
