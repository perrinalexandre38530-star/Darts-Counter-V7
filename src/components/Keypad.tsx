// =============================================================
// src/components/Keypad.tsx
// Keypad — saisie fléchettes (X01 / autres)
// ✅ Ajout: bustLock => désactive toute saisie (nombres, bull, S/D/T, backspace)
//              et laisse uniquement VALIDER + ANNULER actifs.
// =============================================================

import React from "react";

type Props = {
  currentThrow: { v: number; mult: 1 | 2 | 3 }[];
  multiplier: 1 | 2 | 3;

  onSimple: () => void;
  onDouble: () => void;
  onTriple: () => void;

  onBackspace: () => void; // retire 1 dart de la volée en cours
  onCancel: () => void; // "Annuler" (peut aussi faire UNDO moteur selon la page)
  onValidate: () => void; // valide la volée (bust possible)

  onNumber: (value: number) => void;
  onBull: () => void;

  hidePreview?: boolean;
  hideTotal?: boolean;

  /** Slot optionnel si tu veux afficher une UI custom au centre (ex: "Comptage externe...") */
  centerSlot?: React.ReactNode;

  /** ✅ NEW — quand true: seule "Valider" + "Annuler" restent actives */
  bustLock?: boolean;
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function totalThrowScore(darts: { v: number; mult: number }[]) {
  return darts.reduce((s, d) => {
    if (d.v === 25 && d.mult === 2) return s + 50;
    return s + (d.v || 0) * (d.mult || 1);
  }, 0);
}

function chipLabel(d?: { v: number; mult: 1 | 2 | 3 }) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}

const baseBtn: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.10)",
  background: "linear-gradient(180deg, rgba(28,28,34,.95), rgba(16,16,20,.98))",
  color: "#e9ecff",
  fontWeight: 900,
  fontSize: 16,
  padding: "14px 10px",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
  userSelect: "none",
};

const disabledBtn: React.CSSProperties = {
  opacity: 0.35,
  filter: "grayscale(0.8)",
  cursor: "not-allowed",
};

const actionBtn: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid rgba(255,180,0,.25)",
  background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
  color: "#151515",
  boxShadow: "0 10px 22px rgba(255,170,0,.16)",
};

const cancelBtn: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid rgba(255,80,80,.25)",
  background: "linear-gradient(180deg, rgba(210,40,40,.92), rgba(150,18,18,.95))",
  color: "#ffe6e6",
};

const pill: React.CSSProperties = {
  minWidth: 46,
  height: 30,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 10px",
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.06)",
  color: "#d9dbe3",
  fontWeight: 900,
  fontSize: 12,
};

export default function Keypad({
  currentThrow,
  multiplier,
  onSimple,
  onDouble,
  onTriple,
  onBackspace,
  onCancel,
  onValidate,
  onNumber,
  onBull,
  hidePreview,
  hideTotal,
  centerSlot,
  bustLock = false,
}: Props) {
  const canPressInputs = !bustLock;

  const press = (enabled: boolean, fn: () => void) => {
    if (!enabled) return;
    fn();
  };

  const pressNum = (enabled: boolean, v: number) => {
    if (!enabled) return;
    onNumber(v);
  };

  const score = totalThrowScore(currentThrow);

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.08), transparent 55%), linear-gradient(180deg, rgba(12,12,14,.92), rgba(7,7,9,.95))",
        boxShadow: "0 10px 28px rgba(0,0,0,.45)",
        padding: 10,
      }}
    >
      {/* Preview darts */}
      {!hidePreview && (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} style={pill}>
              {chipLabel(currentThrow[i])}
            </span>
          ))}
          {!hideTotal && (
            <span
              style={{
                ...pill,
                border: "1px solid rgba(255,187,51,.35)",
                background: "rgba(255,187,51,.10)",
                color: "#ffc63a",
              }}
            >
              {score}
            </span>
          )}
        </div>
      )}

      {/* Multipliers row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={() => press(canPressInputs, onSimple)}
          style={{
            ...baseBtn,
            ...(multiplier === 1
              ? {
                  border: "1px solid rgba(255,187,51,.40)",
                  background: "rgba(255,187,51,.12)",
                  color: "#ffc63a",
                }
              : null),
            ...(canPressInputs ? null : disabledBtn),
          }}
        >
          S
        </button>
        <button
          type="button"
          onClick={() => press(canPressInputs, onDouble)}
          style={{
            ...baseBtn,
            ...(multiplier === 2
              ? {
                  border: "1px solid rgba(46,150,193,.40)",
                  background: "rgba(46,150,193,.16)",
                  color: "#cfeaff",
                }
              : null),
            ...(canPressInputs ? null : disabledBtn),
          }}
        >
          D
        </button>
        <button
          type="button"
          onClick={() => press(canPressInputs, onTriple)}
          style={{
            ...baseBtn,
            ...(multiplier === 3
              ? {
                  border: "1px solid rgba(179,68,151,.40)",
                  background: "rgba(179,68,151,.16)",
                  color: "#ffd0ff",
                }
              : null),
            ...(canPressInputs ? null : disabledBtn),
          }}
        >
          T
        </button>
      </div>

      {/* Optional center slot */}
      {centerSlot ? (
        <div style={{ marginBottom: 10 }}>{centerSlot}</div>
      ) : null}

      {/* Numbers grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          marginBottom: 8,
        }}
      >
        {[20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(
          (n) => (
            <button
              key={n}
              type="button"
              onClick={() => pressNum(canPressInputs, n)}
              style={{
                ...baseBtn,
                ...(canPressInputs ? null : disabledBtn),
              }}
            >
              {n}
            </button>
          )
        )}

        {/* Bull */}
        <button
          type="button"
          onClick={() => press(canPressInputs, onBull)}
          style={{
            ...baseBtn,
            gridColumn: "span 2",
            border: "1px solid rgba(13,160,98,.35)",
            background: "rgba(13,160,98,.12)",
            color: "#8ee6bf",
            ...(canPressInputs ? null : disabledBtn),
          }}
        >
          BULL
        </button>

        {/* MISS (0) */}
        <button
          type="button"
          onClick={() => pressNum(canPressInputs, 0)}
          style={{
            ...baseBtn,
            gridColumn: "span 3",
            ...(canPressInputs ? null : disabledBtn),
          }}
        >
          MISS
        </button>
      </div>

      {/* Bottom actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => press(true, onCancel)}
          style={cancelBtn}
        >
          ANNULER
        </button>

        <button
          type="button"
          onClick={() => press(!bustLock, onBackspace)}
          style={{
            ...baseBtn,
            ...(bustLock ? disabledBtn : null),
          }}
          title="Backspace = retire 1 fléchette de la volée"
        >
          ⌫
        </button>

        <button
          type="button"
          onClick={() => press(true, onValidate)}
          style={actionBtn}
        >
          VALIDER
        </button>
      </div>
    </div>
  );
}
