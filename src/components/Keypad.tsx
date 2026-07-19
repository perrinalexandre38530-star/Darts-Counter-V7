// ============================================
// src/components/Keypad.tsx
// Keypad stylé — boutons ANNULER & VALIDER en or
// (rangée "Flèche 1 / 2 / 3" supprimée pour gagner de la place)
// ✅ FIX: le "+0pts" (aperçu total) est masqué quand hidePreview=true (Shanghai)
// ✅ NEW: hideTotal + centerSlot (pour KILLER: masquer total volée / afficher logo au centre)
// ✅ SAFE-AREA: padding bas pour éviter le keypad coupé en bas sur mobile
// ✅ PRESETS/VOICE: action compacte intégrée dans la rangée du haut, à côté d'ANNULER
// ============================================
import React from "react";
import type { Dart as UIDart } from "../lib/types";

type KeypadAuxAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  ariaLabel?: string;
};

type Props = {
  /** Volée en cours (0..3 flèches) */
  currentThrow: UIDart[];
  /** Multiplicateur actif (1 par défaut, 2 = DOUBLE, 3 = TRIPLE) */
  multiplier: 1 | 2 | 3;

  // Actions
  onSimple: () => void; // repasse à S (après un appui D/T)
  onDouble: () => void; // active D
  onTriple: () => void; // active T
  onBackspace?: () => void; // supprime la dernière entrée locale (utilisé sur clic droit ANNULER)
  onCancel: () => void; // logique "Annuler" déléguée au parent
  onNumber: (n: number) => void; // 0..20 (0 = MISS)
  onBull: () => void; // OB/DBULL (25/50)
  onValidate: () => void; // bouton Valider

  /** Masquer les 3 badges d’aperçu (si affichés ailleurs) */
  hidePreview?: boolean;

  /** Masquer le total (centre entre BULL & VALIDER) */
  hideTotal?: boolean;

  /** Remplace le centre (ex: logo Killer). Prioritaire sur hideTotal */
  centerSlot?: React.ReactNode;

  /** Action compacte à droite d'ANNULER : PRESET ou MICRO selon la méthode choisie */
  auxAction?: KeypadAuxAction | null;

  /** Petit retour d'état intégré dans le keypad, sans bande séparée au-dessus */
  noticeSlot?: React.ReactNode;

  /** Met le bouton VALIDER en surbrillance quand une volée vocale est prête. */
  validateAttention?: boolean;

  /** Ajoute un padding bas safe-area (par défaut: true) */
  safeBottomPad?: boolean;
};

/* ---------- Helpers ---------- */
function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}
function throwTotal(throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d) => {
    if (!d) return acc;
    if (d.v === 0) return acc; // MISS
    if (d.v === 25) return acc + (d.mult === 2 ? 50 : 25); // BULL / DBULL
    return acc + d.v * d.mult;
  }, 0);
}

/* ---------- Styles ---------- */
const wrapCard: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  padding: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  userSelect: "none",
};

const btnBase: React.CSSProperties = {
  height: "clamp(44px, 8.5vw, 52px)",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.04)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 0,
};

const btnDouble: React.CSSProperties = {
  ...btnBase,
  background: "rgba(46,150,193,.2)",
  color: "#bfeaff",
};
const btnSimple: React.CSSProperties = {
  ...btnBase,
  background: "rgba(73,188,128,.18)",
  color: "#c8ffe0",
};
const btnTriple: React.CSSProperties = {
  ...btnBase,
  background: "rgba(179,68,151,.2)",
  color: "#ffccff",
};
const btnGold: React.CSSProperties = {
  ...btnBase,
  background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
  color: "#1a1a1a",
  border: "1px solid rgba(255,180,0,.3)",
  boxShadow: "0 10px 22px rgba(255,170,0,.28)",
};
const btnCancel: React.CSSProperties = btnGold;
const btnBull: React.CSSProperties = {
  ...btnBase,
  background: "rgba(22,92,66,.35)",
  color: "#8be0b8",
};
const cell: React.CSSProperties = { ...btnBase, width: "100%" };

const chip: React.CSSProperties = {
  display: "inline-block",
  minWidth: 56,
  textAlign: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(0,0,0,.55)",
  border: "1px solid rgba(255,255,255,.08)",
  fontWeight: 800,
  letterSpacing: 0.5,
  color: "#e9d7ff",
  boxShadow: "0 0 22px rgba(250,213,75,.25)",
};

const totalPill: React.CSSProperties = {
  background: "rgba(255,187,51,.12)",
  border: "1px solid rgba(255,187,51,.4)",
  borderRadius: 12,
  padding: "8px 12px",
  color: "#ffc63a",
  fontWeight: 900,
  minWidth: 50,
  textAlign: "center",
  fontSize: 21,
};

const splitActionBase: React.CSSProperties = {
  ...btnBase,
  height: "clamp(44px, 8.5vw, 52px)",
  width: "100%",
  display: "grid",
  placeItems: "center",
  padding: "0",
  lineHeight: 1,
};

function ActionIcon({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "grid", placeItems: "center", color: "currentColor" }}>{children}</span>;
}

export function UndoMiniIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M11 7 6 12l5 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LightningMiniIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" fill="currentColor" />
    </svg>
  );
}

export function MicroMiniIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Keypad({
  currentThrow: _currentThrow,
  multiplier,
  onSimple,
  onDouble,
  onTriple,
  onBackspace,
  onCancel,
  onNumber,
  onBull,
  onValidate,
  hidePreview = false,
  hideTotal = false,
  centerSlot = null,
  auxAction = null,
  noticeSlot = null,
  validateAttention = false,
  safeBottomPad = true,
}: Props) {
  const currentThrow = Array.isArray(_currentThrow) ? _currentThrow : [];
  const total = throwTotal(currentThrow);

  const rows = [
    [0, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
  ];

  return (
    <div
      style={{
        ...wrapCard,
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        paddingBottom: safeBottomPad
          ? "calc(12px + var(--safe-bottom))"
          : wrapCard.padding,
      }}
    >
      {/* Badges de volée */}
      {!hidePreview && (
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "nowrap",
            width: "100%",
          }}
        >
          <span style={{ ...chip, color: "#eec7ff" }}>{fmt(currentThrow[0])}</span>
          <span style={{ ...chip, color: "#cfe6ff" }}>{fmt(currentThrow[1])}</span>
          <span style={{ ...chip, color: "#ffe7c0" }}>{fmt(currentThrow[2])}</span>
        </div>
      )}

      {/* SIMPLE / DOUBLE / TRIPLE / ANNULER + action compacte PRESET ou MICRO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginBottom: noticeSlot ? 8 : 10,
        }}
      >
        <button
          type="button"
          style={{
            ...btnSimple,
            borderColor: multiplier === 1 ? "#a9ffd0" : "rgba(255,255,255,.08)",
            boxShadow: multiplier === 1 ? "0 0 16px rgba(111,255,180,.20)" : "none",
          }}
          aria-pressed={multiplier === 1}
          onClick={onSimple}
          title="Simple"
        >
          SIMPLE
        </button>

        <button
          type="button"
          style={{
            ...btnDouble,
            borderColor: multiplier === 2 ? "#9bd7ff" : "rgba(255,255,255,.08)",
          }}
          aria-pressed={multiplier === 2}
          onClick={onDouble}
          title="Double"
        >
          DOUBLE
        </button>

        <button
          type="button"
          style={{
            ...btnTriple,
            borderColor: multiplier === 3 ? "#ffd0ff" : "rgba(255,255,255,.08)",
          }}
          aria-pressed={multiplier === 3}
          onClick={onTriple}
          title="Triple"
        >
          TRIPLE
        </button>

        {auxAction ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 }}>
            <button
              type="button"
              style={{
                ...splitActionBase,
                background: "linear-gradient(180deg, rgba(255,198,58,.96), rgba(255,175,0,.90))",
                color: "#1a1a1a",
                border: "1px solid rgba(255,180,0,.34)",
                boxShadow: "0 10px 22px rgba(255,170,0,.24)",
              }}
              onClick={onCancel}
              onContextMenu={(e) => {
                e.preventDefault();
                onBackspace?.();
              }}
              title="Annuler (clic droit : supprimer la dernière entrée locale)"
              aria-label="Annuler"
            >
              <ActionIcon><UndoMiniIcon /></ActionIcon>
            </button>

            <button
              type="button"
              style={{
                ...splitActionBase,
                background: auxAction.active
                  ? "linear-gradient(180deg, rgba(180,255,30,.24), rgba(0,0,0,.38))"
                  : "rgba(255,255,255,.055)",
                color: auxAction.active ? "#d8ff66" : "rgba(255,255,255,.92)",
                border: auxAction.active ? "1px solid rgba(180,255,30,.55)" : "1px solid rgba(255,255,255,.12)",
                boxShadow: auxAction.active ? "0 0 22px rgba(180,255,30,.22)" : "none",
                opacity: auxAction.disabled ? 0.45 : 1,
              }}
              onClick={auxAction.onClick}
              disabled={auxAction.disabled}
              title={auxAction.title || auxAction.label}
              aria-label={auxAction.ariaLabel || auxAction.label}
            >
              <ActionIcon>{auxAction.icon}</ActionIcon>
            </button>
          </div>
        ) : (
          <button
            type="button"
            style={btnCancel}
            onClick={onCancel}
            onContextMenu={(e) => {
              e.preventDefault();
              onBackspace?.();
            }}
            title="Annuler (clic droit : supprimer la dernière entrée locale)"
            aria-label="Annuler"
          >
            ANNULER
          </button>
        )}
      </div>

      {noticeSlot ? <div style={{ marginBottom: 8 }}>{noticeSlot}</div> : null}

      {/* Grille chiffres (pas de conteneur scrollable => ne peut pas “disparaître”) */}
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {row.map((n) => (
              <button
                key={n}
                type="button"
                style={cell}
                onClick={() => onNumber(n)}
                title={n === 0 ? "MISS" : String(n)}
              >
                {n}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* BULL + (TOTAL ou SLOT) CENTRÉ + VALIDER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(88px, .8fr) minmax(50px, .42fr) minmax(118px, 1fr)",
          alignItems: "center",
          gap: 10,
          marginTop: 10,
        }}
      >
        <button
          type="button"
          style={{ ...btnBull, width: "100%" }}
          onClick={onBull}
        >
          BULL
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            minHeight: 40,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          {centerSlot ? (
            <div style={{ display: "grid", placeItems: "center" }}>
              {centerSlot}
            </div>
          ) : hideTotal ? null : (
            <span style={totalPill}>{total}</span>
          )}
        </div>

        <button
          type="button"
          style={{
            ...btnGold,
            width: "100%",
            ...(validateAttention
              ? {
                  color: "#050505",
                  background: "linear-gradient(180deg, #ffffff, #ffd666)",
                  border: "1px solid rgba(255,255,255,.92)",
                  boxShadow: "0 0 24px rgba(255,255,255,.56), 0 10px 22px rgba(255,170,0,.28)",
                  animation: "dcVoiceGlow .9s ease-in-out infinite",
                }
              : null),
          }}
          onClick={onValidate}
          title={validateAttention ? "Volée vocale prête : clique pour valider" : "Valider la volée"}
          aria-label={validateAttention ? "Valider la volée vocale" : "Valider la volée"}
        >
          VALIDER
        </button>
      </div>
    </div>
  );
}
