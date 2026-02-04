// =============================================================
// src/pages/ScramPlay.tsx
// SCRAM — PLAY (engine v1)
// - Phase RACE + Phase SCRAM (team-based)
// - Input via DartboardClickable (0..3 fléchettes) + Validate / Undo
// - UI "plateau" lisible + mini-stats live
// IMPORTANT: Bull mapping
//   - OB = v=25
//   - IB = v=50
// (aligné sur uiThrowToGameDarts/uiDartToGameDart)
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import DartboardClickable from "../components/DartboardClickable";
import tickerScram from "../assets/tickers/ticker_scram.png";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { useScramEngine } from "../hooks/useScramEngine";

type UIDart = { v: number; mult: 1 | 2 | 3; label?: string };

type ConfigPayload = {
  selectedIds: string[];
  objective: number;
  roundsCap: number;
  // compat
  players?: number;
};

const INFO_TEXT =
  "SCRAM (v1) — 2 phases\n\n" +
  "1) RACE : les 2 équipes ferment 20→15 (+ Bull) en 3 marques (S=1, D=2, T=3 ; Bull=OB(25)/IB(50)).\n" +
  "2) SCRAM : l'équipe qui a gagné la RACE devient SCORERS (elle marque des points).\n" +
  "   L'autre équipe devient CLOSERS (elle ferme les cibles).\n\n" +
  "Victoire :\n" +
  "- SCORERS atteignent l'objectif de points → SCORERS gagnent\n" +
  "- CLOSERS ferment toutes les cibles → CLOSERS gagnent";

function toLabel(d: UIDart): string {
  if (!d || !Number.isFinite(d.v)) return "MISS";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return "OB";
  if (d.v === 50) return "IB";
  const p = d.mult === 1 ? "S" : d.mult === 2 ? "D" : "T";
  return `${p}${d.v}`;
}

function safeInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function computeLiveMiniStats(state: any) {
  // Agrégats simples à partir de state.history (BaseEngine)
  const out = {
    darts: 0,
    miss: 0,
    s: 0,
    d: 0,
    t: 0,
    ob: 0,
    ib: 0,
    byTeam: {
      A: { darts: 0, miss: 0, s: 0, d: 0, t: 0, ob: 0, ib: 0 },
      B: { darts: 0, miss: 0, s: 0, d: 0, t: 0, ob: 0, ib: 0 },
    } as any,
  };

  const teamByPlayer: Record<string, "A" | "B"> = state?.teamByPlayer ?? {};

  for (const h of state?.history ?? []) {
    const team = teamByPlayer[String(h.playerId)] ?? "A";
    for (const dart of h?.darts ?? []) {
      out.darts += 1;
      out.byTeam[team].darts += 1;

      if (!dart || dart.bed === "MISS") {
        out.miss += 1;
        out.byTeam[team].miss += 1;
        continue;
      }

      if (dart.bed === "S") { out.s += 1; out.byTeam[team].s += 1; }
      else if (dart.bed === "D") { out.d += 1; out.byTeam[team].d += 1; }
      else if (dart.bed === "T") { out.t += 1; out.byTeam[team].t += 1; }
      else if (dart.bed === "OB") { out.ob += 1; out.byTeam[team].ob += 1; }
      else if (dart.bed === "IB") { out.ib += 1; out.byTeam[team].ib += 1; }
    }
  }

  return out;
}

export default function ScramPlay(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  const cfg: ConfigPayload =
    (props?.params as any) ||
    (props?.config as any) ||
    ({ selectedIds: [], objective: 200, roundsCap: 0 } as any);

  const store = (props as any)?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const profileById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of storeProfiles) m.set(String(p.id), p);
    return m;
  }, [storeProfiles]);

  const selectedIds = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
  const players = React.useMemo(() => {
    const out: { id: string; name: string }[] = [];
    for (let i = 0; i < selectedIds.length; i++) {
      const id = String(selectedIds[i]);
      const p = profileById.get(id);
      out.push({ id, name: p?.name || p?.username || p?.display_name || `Joueur ${i + 1}` });
    }
    return out;
  }, [profileById, selectedIds.join("|")]);

  // sécurité
  const safePlayers = players.length >= 2 ? players : [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];

  const { state, play, undo, canUndo, isFinished } = useScramEngine(safePlayers as any, {
    objective: safeInt(cfg.objective || 0),
    maxRounds: safeInt(cfg.roundsCap || 0),
    useBull: true,
    marksToClose: 3,
  });

  const primary = (theme as any)?.primary ?? "#7dffca";
  const teamA = (theme as any)?.pink ?? "#ff6bd6";
  const teamB = (theme as any)?.gold ?? "#f6c256";

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentTeam = state.teamByPlayer[currentPlayer?.id] ?? "A";

  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [throwDarts, setThrowDarts] = React.useState<UIDart[]>([]);

  React.useEffect(() => {
    // clear throw on turn change
    setThrowDarts([]);
  }, [state.turnIndex]);

  function onHit(seg: number, m: 1 | 2 | 3) {
    if (isFinished) return;
    setThrowDarts((prev) => {
      if (prev.length >= 3) return prev;

      // DartboardClickable: seg = 1..20, ou 25 pour bull
      // 🔥 mapping bull: OB=25 (single), IB=50 (double)
      let v = 0;
      let multLocal: 1 | 2 | 3 = m;

      if (seg === 25) {
        v = m === 2 ? 50 : 25;
        multLocal = 1; // pour label; le bed est dérivé de v (25/50)
      } else {
        v = Math.max(0, Math.min(20, Math.floor(seg)));
      }

      const d: UIDart = { v, mult: multLocal, label: "" };
      d.label = toLabel(d);
      return [...prev, d];
    });
  }

  function validate() {
    if (isFinished) return;
    // v=25/50 gère OB/IB automatiquement via uiThrowToGameDarts
    play(throwDarts.map((d) => ({ v: d.v, mult: d.mult })) as any);
    setThrowDarts([]);
  }

  function clearThrow() {
    setThrowDarts([]);
  }

  function goBack() {
    const go = (props as any)?.setTab ?? (props as any)?.go;
    if (typeof go === "function") return go("scram_config");
    window.history.back();
  }

  const phaseLabel = state.phase === "race" ? "RACE" : state.phase === "scram" ? "SCRAM" : "FIN";
  const scorers = state.scorersTeam;
  const closers = state.closersTeam;

  const mini = React.useMemo(() => computeLiveMiniStats(state), [state]);

  const activeTeamStats = currentTeam === "A" ? mini.byTeam.A : mini.byTeam.B;

  function targetLabel(tg: number) {
    return tg === 25 ? "B" : String(tg);
  }

  function renderMarksRow(marks: any, color: string) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.targets.length}, 1fr)`, gap: 8 }}>
        {state.targets.map((tg: number) => {
          const v = Math.min(state.rules.marksToClose, Math.max(0, Number(marks?.[tg] ?? 0)));
          const closed = v >= state.rules.marksToClose;
          return (
            <div
              key={tg}
              style={{
                borderRadius: 14,
                padding: "10px 8px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: closed ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.9 }}>{targetLabel(tg)}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "center" }}>
                {Array.from({ length: state.rules.marksToClose }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.22)",
                      background: i < v ? color : "rgba(255,255,255,0.10)",
                      boxShadow: i < v ? `0 0 12px ${color}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="SCRAM"
        tickerSrc={tickerScram}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles SCRAM" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        {/* Top status */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 1 }}>
                {t("generic.phase", "PHASE")} {phaseLabel}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1100, marginTop: 6 }}>
                {isFinished ? "Partie terminée" : `${currentPlayer?.name || "—"}`}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                Équipe: <span style={{ fontWeight: 1000, color: currentTeam === "A" ? teamA : teamB }}>{currentTeam}</span>
                {state.phase === "scram" && (
                  <>
                    {" "}— rôle: {currentTeam === scorers ? "SCORER" : currentTeam === closers ? "CLOSER" : "—"}
                  </>
                )}
              </div>

              {/* mini-stats live (actif) */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 12,
                  opacity: 0.9,
                }}
              >
                <span><b>Darts</b> {activeTeamStats.darts}</span>
                <span><b>Miss</b> {activeTeamStats.miss}</span>
                <span><b>S</b> {activeTeamStats.s}</span>
                <span><b>D</b> {activeTeamStats.d}</span>
                <span><b>T</b> {activeTeamStats.t}</span>
                <span><b>OB</b> {activeTeamStats.ob}</span>
                <span><b>IB</b> {activeTeamStats.ib}</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 1 }}>SCRAM SCORE</div>
              <div style={{ fontSize: 22, fontWeight: 1100, marginTop: 6, color: primary }}>{state.scramScore}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                Objectif: <span style={{ fontWeight: 1000 }}>{state.rules.objective || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Targets state */}
        <div style={{ marginTop: 12 }}>
          {state.phase === "race" ? (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 1100, opacity: 0.9 }}>RACE — fermeture des cibles</div>
                {state.raceWinner && (
                  <div style={{ marginLeft: "auto", fontWeight: 1100 }}>
                    Gagnant: <span style={{ color: state.raceWinner === "A" ? teamA : teamB }}>{state.raceWinner}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 8, color: teamA }}>TEAM A</div>
                  {renderMarksRow(state.raceMarks.A, teamA)}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 8, color: teamB }}>TEAM B</div>
                  {renderMarksRow(state.raceMarks.B, teamB)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 1100, opacity: 0.9 }}>SCRAM — CLOSERS ferment, SCORERS marquent</div>
                <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>
                  SCORERS: <span style={{ color: scorers === "A" ? teamA : teamB, fontWeight: 1100 }}>{scorers}</span>
                  {" · "}
                  CLOSERS: <span style={{ color: closers === "A" ? teamA : teamB, fontWeight: 1100 }}>{closers}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 8 }}>
                  Progression CLOSERS ({closers})
                </div>
                {renderMarksRow(state.closersMarks, closers === "A" ? teamA : teamB)}
              </div>
            </>
          )}
        </div>

        {/* Input */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setMult(1)}
              style={{
                flex: 1,
                borderRadius: 14,
                border: mult === 1 ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.12)",
                background: mult === 1 ? "rgba(125,255,202,0.12)" : "rgba(255,255,255,0.05)",
                color: "#fff",
                padding: "10px 8px",
                fontWeight: 1100,
              }}
            >
              S
            </button>
            <button
              onClick={() => setMult(2)}
              style={{
                flex: 1,
                borderRadius: 14,
                border: mult === 2 ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.12)",
                background: mult === 2 ? "rgba(125,255,202,0.12)" : "rgba(255,255,255,0.05)",
                color: "#fff",
                padding: "10px 8px",
                fontWeight: 1100,
              }}
            >
              D
            </button>
            <button
              onClick={() => setMult(3)}
              style={{
                flex: 1,
                borderRadius: 14,
                border: mult === 3 ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.12)",
                background: mult === 3 ? "rgba(125,255,202,0.12)" : "rgba(255,255,255,0.05)",
                color: "#fff",
                padding: "10px 8px",
                fontWeight: 1100,
              }}
            >
              T
            </button>
          </div>

          <DartboardClickable onHit={onHit} multiplier={mult} disabled={isFinished} />

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                flex: 1,
                minWidth: 220,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>Volée</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1200 }}>
                {throwDarts.length ? (
                  throwDarts.map((d, i) => (
                    <span key={i} style={{ marginRight: 12, color: d.v === 0 ? "rgba(255,255,255,0.55)" : "#fff" }}>
                      {toLabel(d)}
                    </span>
                  ))
                ) : (
                  "—"
                )}
              </div>
            </div>

            <button
              onClick={clearThrow}
              disabled={!throwDarts.length || isFinished}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                padding: "12px 12px",
                fontWeight: 1100,
                opacity: !throwDarts.length || isFinished ? 0.5 : 1,
              }}
            >
              Clear
            </button>
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                padding: "12px 12px",
                fontWeight: 1100,
                opacity: canUndo ? 1 : 0.5,
              }}
            >
              Undo
            </button>
            <button
              onClick={validate}
              disabled={isFinished}
              style={{
                borderRadius: 14,
                border: `1px solid ${primary}`,
                background: "rgba(125,255,202,0.14)",
                color: "#fff",
                padding: "12px 14px",
                fontWeight: 1200,
                opacity: isFinished ? 0.5 : 1,
              }}
            >
              Valider
            </button>
          </div>

          {/* mini agrégats globaux */}
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
            Total: <b>{mini.darts}</b> darts · <b>{mini.miss}</b> miss · <b>{mini.s}</b>S / <b>{mini.d}</b>D / <b>{mini.t}</b>T · <b>{mini.ob}</b>OB / <b>{mini.ib}</b>IB
          </div>
        </div>

        {isFinished && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85, letterSpacing: 1 }}>RÉSULTAT</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1200 }}>
              Équipe gagnante: <span style={{ color: state.winningTeam === "A" ? teamA : teamB }}>{state.winningTeam || "—"}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
              Team A: {mini.byTeam.A.darts} darts / {mini.byTeam.A.miss} miss · Team B: {mini.byTeam.B.darts} darts / {mini.byTeam.B.miss} miss
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
