import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  addEnd,
  loadPetanqueState,
  resetPetanque,
  undoLastEnd,
  type PetanqueState,
  type PetanqueTeamId,
  // ✅ NEW (ajouts dans petanqueStore)
  addMeasurement,
  undoLastMeasurement,
} from "../../lib/petanqueStore";

type Props = { go: (route: any, params?: any) => void };

const PTS = [0, 1, 2, 3, 4, 5, 6];

export default function PetanquePlay({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState<PetanqueState>(() => loadPetanqueState());

  const onAdd = (team: PetanqueTeamId, pts: number) => setSt(addEnd(st, team, pts));
  const onUndo = () => setSt(undoLastEnd(st));
  const onNew = () => setSt(resetPetanque(st));

  // ==========================
  // ✅ MESURAGE (sheet)
  // ==========================
  const [measureOpen, setMeasureOpen] = React.useState(false);
  const [dA, setDA] = React.useState<string>("");
  const [dB, setDB] = React.useState<string>("");
  const [tol, setTol] = React.useState<string>("1"); // tolérance cm (MVP)
  const [note, setNote] = React.useState<string>("");

  const numOrNaN = (v: string) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const dAN = numOrNaN(dA);
  const dBN = numOrNaN(dB);
  const tolN = Math.max(0, numOrNaN(tol));

  const canCompute = Number.isFinite(dAN) && Number.isFinite(dBN) && dAN >= 0 && dBN >= 0 && Number.isFinite(tolN);
  const delta = canCompute ? Math.abs(dAN - dBN) : NaN;

  const measureWinner: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (!canCompute) return null;
    if (delta <= tolN) return "TIE";
    return dAN < dBN ? "A" : "B";
  }, [canCompute, delta, tolN, dAN, dBN]);

  const measureText = React.useMemo(() => {
    if (!canCompute) return "Renseigne les 2 distances (cm).";
    if (measureWinner === "TIE") return `Égalité (≤ ${tolN} cm) — à re-mesurer`;
    if (measureWinner === "A") return `${st.teamA} est devant (+${delta.toFixed(1)} cm)`;
    if (measureWinner === "B") return `${st.teamB} est devant (+${delta.toFixed(1)} cm)`;
    return "";
  }, [canCompute, measureWinner, tolN, st.teamA, st.teamB, delta]);

  const onSaveMeasurement = () => {
    if (!canCompute) return;
    setSt(
      addMeasurement(st, {
        dA: dAN,
        dB: dBN,
        tol: tolN,
        note,
      })
    );
    // reset champs pour prochaine mesure
    setDA("");
    setDB("");
    setNote("");
    setMeasureOpen(false);
  };

  const onUndoMeasurement = () => setSt(undoLastMeasurement(st));

  const measurements = (st as any).measurements as
    | Array<{
        id: string;
        at: number;
        dA: number;
        dB: number;
        winner: "A" | "B" | "TIE";
        delta: number;
        tol: number;
        note?: string;
      }>
    | undefined;

  return (
    <div style={wrap(theme)}>
      <div style={topBar}>
        <button style={ghost(theme)} onClick={() => go("games")}>← Jeux</button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={title(theme)}>PÉTANQUE</div>
          <button style={chipBtn(theme)} onClick={() => setMeasureOpen(true)}>
            Mesurer
          </button>
        </div>

        <button style={ghost(theme)} onClick={() => go("home")}>Home</button>
      </div>

      <div style={card(theme)}>
        <div style={scoreLine(theme)}>
          <span style={chip(theme)}>{st.teamA}</span>
          <span style={score(theme)}>{st.scoreA}</span>
          <span style={sep(theme)}>—</span>
          <span style={score(theme)}>{st.scoreB}</span>
          <span style={chip(theme)}>{st.teamB}</span>
        </div>

        {st.finished && (
          <div style={win(theme)}>
            Victoire : {st.winner === "A" ? st.teamA : st.teamB}
          </div>
        )}
      </div>

      <div style={grid2}>
        <div style={card(theme)}>
          <div style={sub(theme)}>Mène — {st.teamA}</div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button key={`A-${p}`} style={ptBtn(theme)} onClick={() => onAdd("A", p)} disabled={st.finished}>
                +{p}
              </button>
            ))}
          </div>
        </div>

        <div style={card(theme)}>
          <div style={sub(theme)}>Mène — {st.teamB}</div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button key={`B-${p}`} style={ptBtn(theme)} onClick={() => onAdd("B", p)} disabled={st.finished}>
                +{p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sub(theme)}>Actions</div>
        <div style={row}>
          <button style={primary(theme)} onClick={onUndo} disabled={!st.ends.length}>Annuler dernière mène</button>
          <button style={danger(theme)} onClick={onNew}>Nouvelle partie</button>
        </div>
      </div>

      {/* ✅ MESURES (historique) */}
      <div style={card(theme)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={sub(theme)}>Mesurages</div>
          <button
            style={ghost(theme)}
            onClick={onUndoMeasurement}
            disabled={!measurements?.length}
            title="Annuler la dernière mesure enregistrée"
          >
            Annuler mesure
          </button>
        </div>

        {!measurements?.length ? (
          <div style={muted(theme)}>Aucun mesurage enregistré.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {measurements.slice(0, 8).map((m) => {
              const who =
                m.winner === "TIE"
                  ? "Égalité"
                  : m.winner === "A"
                  ? st.teamA
                  : st.teamB;

              return (
                <div key={m.id} style={endRow(theme)}>
                  <div style={pill(theme)}>{who}</div>
                  <div style={endTxt(theme)}>
                    A {m.dA}cm — B {m.dB}cm — Δ {m.delta.toFixed(1)}cm (tol {m.tol}cm)
                    {m.note ? ` — ${m.note}` : ""}
                  </div>
                </div>
              );
            })}
            {measurements.length > 8 && <div style={muted(theme)}>… {measurements.length - 8} autres mesures.</div>}
          </div>
        )}
      </div>

      <div style={card(theme)}>
        <div style={sub(theme)}>Historique des mènes</div>
        {!st.ends.length ? (
          <div style={muted(theme)}>Aucune mène enregistrée.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {st.ends.map((e, idx) => (
              <div key={e.id} style={endRow(theme)}>
                <div style={pill(theme)}>{e.winner === "A" ? st.teamA : st.teamB}</div>
                <div style={endTxt(theme)}>+{e.points} — mène #{st.ends.length - idx}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ SHEET MESURAGE */}
      {measureOpen && (
        <div style={overlay}>
          <div style={sheet(theme)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={sub(theme)}>Mesurage (cochonnet → boules)</div>
              <button style={ghost(theme)} onClick={() => setMeasureOpen(false)}>Fermer</button>
            </div>

            <div style={hint(theme)}>
              Saisis les distances en centimètres. Tolérance = marge d’égalité (ex: 1 cm).
            </div>

            <div style={grid2}>
              <div style={cardSoft(theme)}>
                <div style={sub(theme)}>{st.teamA}</div>
                <input
                  style={input(theme)}
                  value={dA}
                  onChange={(e) => setDA(e.target.value)}
                  placeholder="Distance (cm)"
                  inputMode="decimal"
                />
              </div>

              <div style={cardSoft(theme)}>
                <div style={sub(theme)}>{st.teamB}</div>
                <input
                  style={input(theme)}
                  value={dB}
                  onChange={(e) => setDB(e.target.value)}
                  placeholder="Distance (cm)"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div style={row}>
              <div style={{ flex: 1 }}>
                <div style={label(theme)}>Tolérance (cm)</div>
                <input
                  style={input(theme)}
                  value={tol}
                  onChange={(e) => setTol(e.target.value)}
                  placeholder="1"
                  inputMode="decimal"
                />
              </div>

              <div style={{ flex: 2 }}>
                <div style={label(theme)}>Note (optionnel)</div>
                <input
                  style={input(theme)}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: mesure serrée / terrain incliné…"
                />
              </div>
            </div>

            <div style={resultBox(theme, measureWinner)}>
              {measureText}
            </div>

            <div style={row}>
              <button style={primary(theme)} onClick={onSaveMeasurement} disabled={!canCompute}>
                Enregistrer la mesure
              </button>
              <button
                style={ghost(theme)}
                onClick={() => {
                  setDA("");
                  setDB("");
                  setNote("");
                }}
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: dark
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const topBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  paddingTop: 6,
};

function title(theme: any): React.CSSProperties {
  return { fontWeight: 900, letterSpacing: 2, opacity: 0.95 };
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
    gap: 10,
  };
}

function cardSoft(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
}

function sub(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.85 };
}

const row: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };

function primary(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function danger(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,60,60,0.18)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 800,
    cursor: "pointer",
    opacity: 0.92,
  };
}

function chipBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.20)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
    letterSpacing: 0.5,
  };
}

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const ptsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 };

function ptBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function scoreLine(theme: any): React.CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0" };
}

function chip(theme: any): React.CSSProperties {
  return {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    fontWeight: 900,
    opacity: 0.95,
  };
}

function score(theme: any): React.CSSProperties {
  return { fontWeight: 1000 as any, fontSize: 28, letterSpacing: 1 };
}

function sep(theme: any): React.CSSProperties {
  return { opacity: 0.5, fontWeight: 900 };
}

function win(theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}

function muted(theme: any): React.CSSProperties {
  return { opacity: 0.75, fontSize: 13 };
}

function endRow(theme: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.12)",
  };
}

function pill(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    maxWidth: 170,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function endTxt(theme: any): React.CSSProperties {
  return { fontWeight: 800, opacity: 0.9, fontSize: 13 };
}

// ==========================
// ✅ Sheet styles
// ==========================
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 12,
  zIndex: 9999,
};

function sheet(theme: any): React.CSSProperties {
  return {
    width: "min(720px, 100%)",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(15,15,18,0.94)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
}

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    outline: "none",
  };
}

function label(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.75, fontSize: 12, paddingLeft: 2, marginBottom: 6 };
}

function hint(theme: any): React.CSSProperties {
  return { opacity: 0.78, fontSize: 12, lineHeight: 1.35 };
}

function resultBox(theme: any, w: "A" | "B" | "TIE" | null): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
  };
  if (!w) return base;
  if (w === "TIE") return { ...base, background: "rgba(255,200,0,0.10)" };
  return { ...base, background: "rgba(0,255,180,0.10)" };
}
