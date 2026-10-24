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
  tone?: "blue" | "teal" | "magenta" | "violet" | "green" | "gold" | "orange" | "yellow" | "red" | "dark";
  title?: string;
  ariaLabel?: string;
  /** L’icône remplit toute la surface de la touche (ex: visuel ZONES du Gros 6). */
  fullBleedIcon?: boolean;
};

type KeypadExtraMainButton = {
  label: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "blue" | "teal" | "magenta" | "violet" | "green" | "gold" | "orange" | "yellow" | "red" | "dark";
  title?: string;
  ariaLabel?: string;
};

type KeypadColorButton = {
  color: string;
  onClick: () => void;
  active?: boolean;
  title?: string;
  ariaLabel?: string;
};

type KeypadSecondaryAction = {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "blue" | "teal" | "magenta" | "violet" | "green" | "gold" | "orange" | "yellow" | "red" | "dark";
  title?: string;
  ariaLabel?: string;
};

type KeypadFooterAction = {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "blue" | "teal" | "magenta" | "violet" | "green" | "gold" | "orange" | "yellow" | "red" | "dark";
  title?: string;
  ariaLabel?: string;
};

type KeypadSingleRingSelector = {
  value: "outer" | "inner";
  onOuter: () => void;
  onInner: () => void;
  outerLabel?: string;
  innerLabel?: string;
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

  /** Boutons principaux supplémentaires (ex: GROS / PETIT). */
  extraMainButtons?: KeypadExtraMainButton[] | null;
  /** Rangée de couleurs contextuelle, sans libellé visible (ex: BSS KING). */
  colorButtons?: KeypadColorButton[] | null;
  /** Si true, DOUBLE/TRIPLE restent sélectionnés jusqu'à la prochaine valeur. */
  latchMultiplier?: boolean;

  /** Sélecteur optionnel des deux zones simples physiques (ex: PRISONER). */
  singleRingSelector?: KeypadSingleRingSelector | null;

  /** Action secondaire à côté du bouton retour/annuler (ex: MICRO Gros 6). */
  secondaryAction?: KeypadSecondaryAction | null;

  /** Remplace le bouton VALIDER du footer par une action dédiée (ex: DBULL Gros 6). */
  footerAction?: KeypadFooterAction | null;
  footerLeftSlot?: React.ReactNode;
  footerHideBull?: boolean;
  actionRowLayout?: "default" | "triple";

  /** Grise les touches numériques 1..20 tant qu'un type de zone n'a pas été choisi. */
  disableSegmentNumbers?: boolean;
  /** Met en évidence les secteurs actuellement utiles au gameplay. */
  highlightSegmentNumbers?: number[] | null;
  /** Met le bouton BULL en évidence lorsque le Bull est la cible. */
  highlightBull?: boolean;
  /** Indique le multiplicateur conseillé/exigé (D/T). */
  guideMultiplier?: 1 | 2 | 3 | null;
  /** Couleur du guide gameplay. */
  guideColor?: string;

  /** Petit retour d'état intégré dans le keypad, sans bande séparée au-dessus */
  noticeSlot?: React.ReactNode;

  /** Met le bouton VALIDER en surbrillance quand une volée vocale est prête. */
  validateAttention?: boolean;
  /** Libellé personnalisé du bouton de validation (défaut : VALIDER). */
  validateLabel?: React.ReactNode;
  /** Désactive uniquement la validation, sans bloquer le reste du keypad. */
  validateDisabled?: boolean;

  /** Disposition d’actions dédiée à certains modes (sans modifier le keypad standard). */
  layoutVariant?: "default" | "ptit1";

  /** Ajoute un padding bas safe-area (par défaut: true) */
  safeBottomPad?: boolean;

  /** Espace horizontal entre BULL, score central et VALIDER. Défaut: 10px. */
  footerGap?: number;
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
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
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

const NUMBER_ROWS = [
  [0, 1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
] as const;

// PERF : les 21 touches numériques sont entièrement statiques. Elles ne doivent
// pas être réconciliées à chaque dart, changement de multiplicateur ou mise à jour
// du score. Le parent lui fournit volontairement un callback stable.
const KeypadNumberGrid = React.memo(function KeypadNumberGrid({
  onNumber,
  disableSegmentNumbers = false,
  highlightSegmentNumbers = null,
  highlightColor = "#ffe46b",
}: {
  onNumber: (n: number) => void;
  disableSegmentNumbers?: boolean;
  highlightSegmentNumbers?: number[] | null;
  highlightColor?: string;
}) {
  const highlighted = new Set((highlightSegmentNumbers || []).map(Number));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {NUMBER_ROWS.map((row, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {row.map((n) => {
            const blocked = disableSegmentNumbers && n !== 0;
            return (
            <button
              key={n}
              type="button"
              style={{
                ...cell,
                ...(highlighted.has(Number(n)) && n !== 0 ? {
                  borderColor: `${highlightColor}cc`,
                  color: "#fff",
                  background: `linear-gradient(180deg,${highlightColor}30,rgba(12,15,22,.96))`,
                  boxShadow: `0 0 0 1px ${highlightColor}44 inset, 0 0 18px ${highlightColor}28`,
                  transform: "translateY(-1px)",
                } : null),
                ...(blocked ? { opacity: .28, filter: "grayscale(1)", cursor: "not-allowed", boxShadow: "none" } : null)
              }}
              onClick={() => { if (!blocked) onNumber(n); }}
              disabled={blocked}
              aria-disabled={blocked}
              title={blocked ? "Choisis d'abord DOUBLE, TRIPLE, GROS ou PETIT" : (n === 0 ? "MISS" : String(n))}
            >
              {n}
            </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

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
  extraMainButtons = null,
  colorButtons = null,
  latchMultiplier = false,
  singleRingSelector = null,
  secondaryAction = null,
  footerAction = null,
  footerLeftSlot = null,
  footerHideBull = false,
  disableSegmentNumbers = false,
  highlightSegmentNumbers = null,
  highlightBull = false,
  guideMultiplier = null,
  guideColor = "#ffe46b",
  noticeSlot = null,
  validateAttention = false,
  validateLabel = "VALIDER",
  validateDisabled = false,
  layoutVariant = "default",
  safeBottomPad = true,
  footerGap = 10,
  actionRowLayout = "default",
}: Props) {
  const currentThrow = Array.isArray(_currentThrow) ? _currentThrow : [];
  const total = throwTotal(currentThrow);

  const onNumberRef = React.useRef(onNumber);
  onNumberRef.current = onNumber;
  const handleNumber = React.useCallback((n: number) => {
    onNumberRef.current(n);
  }, []);

  const extraButtons = Array.isArray(extraMainButtons) ? extraMainButtons.filter(Boolean).slice(0, 2) : [];
  const colorRowButtons = Array.isArray(colorButtons) ? colorButtons.filter(Boolean).slice(0, 4) : [];
  const usePtit1ActionRows = layoutVariant === "ptit1" && extraButtons.length >= 2 && !!secondaryAction && !!auxAction;
  const useExtendedMainRow = extraButtons.length > 0;
  const useTripleActionRow = actionRowLayout === "triple" && !!secondaryAction && !!auxAction;

  const extraButtonStyle = (active = false, tone: KeypadExtraMainButton['tone'] = 'dark'): React.CSSProperties => {
    const tones = {
      blue: active
        ? { background: 'linear-gradient(180deg, rgba(0,196,255,.28), rgba(0,70,120,.42))', color: '#dcf6ff', border: '1px solid rgba(129,230,255,.9)' }
        : { background: 'linear-gradient(180deg, rgba(0,196,255,.12), rgba(0,70,120,.18))', color: '#d8f6ff', border: '1px solid rgba(129,230,255,.35)' },
      teal: active
        ? { background: 'linear-gradient(180deg, rgba(71,219,201,.32), rgba(11,90,86,.44))', color: '#e7fffb', border: '1px solid rgba(130,255,243,.92)' }
        : { background: 'linear-gradient(180deg, rgba(71,219,201,.14), rgba(11,90,86,.22))', color: '#c7fffa', border: '1px solid rgba(130,255,243,.34)' },
      magenta: active
        ? { background: 'linear-gradient(180deg, rgba(255,105,214,.30), rgba(92,20,84,.44))', color: '#ffe1ff', border: '1px solid rgba(255,189,245,.9)' }
        : { background: 'linear-gradient(180deg, rgba(255,105,214,.12), rgba(92,20,84,.20))', color: '#ffd9fa', border: '1px solid rgba(255,189,245,.35)' },
      violet: active
        ? { background: 'linear-gradient(180deg, rgba(200,132,255,.30), rgba(74,26,120,.44))', color: '#f7e8ff', border: '1px solid rgba(228,196,255,.92)' }
        : { background: 'linear-gradient(180deg, rgba(200,132,255,.12), rgba(74,26,120,.22))', color: '#efd9ff', border: '1px solid rgba(228,196,255,.35)' },
      green: active
        ? { background: 'linear-gradient(180deg, rgba(100,255,160,.24), rgba(20,92,52,.40))', color: '#e7fff1', border: '1px solid rgba(175,255,208,.9)' }
        : { background: 'linear-gradient(180deg, rgba(100,255,160,.11), rgba(20,92,52,.18))', color: '#e7fff1', border: '1px solid rgba(175,255,208,.32)' },
      gold: active
        ? { background: 'linear-gradient(180deg, rgba(255,227,120,.35), rgba(122,87,12,.42))', color: '#fff5cc', border: '1px solid rgba(255,230,156,.92)' }
        : { background: 'linear-gradient(180deg, rgba(255,227,120,.16), rgba(122,87,12,.24))', color: '#fff0bf', border: '1px solid rgba(255,230,156,.38)' },
      orange: active
        ? { background: 'linear-gradient(180deg, #ffae45, #e66f00)', color: '#fff4df', border: '1px solid #ffd4a1' }
        : { background: 'linear-gradient(180deg, #f58a1f, #b94f00)', color: '#ffefd7', border: '1px solid rgba(255,190,112,.72)' },
      yellow: active
        ? { background: 'linear-gradient(180deg, #fff0a8, #f5cc58)', color: '#5b3510', border: '1px solid #fff5c9' }
        : { background: 'linear-gradient(180deg, #ffe795, #dcb442)', color: '#654019', border: '1px solid rgba(255,240,170,.82)' },
      red: active
        ? { background: 'linear-gradient(180deg, #ff6a72, #b01224)', color: '#fff0f2', border: '1px solid #ffc0c6' }
        : { background: 'linear-gradient(180deg, rgba(255,72,92,.92), rgba(120,10,24,.96))', color: '#ffecef', border: '1px solid rgba(255,164,174,.70)' },
      dark: active
        ? { background: 'linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.08))', color: '#fff', border: '1px solid rgba(255,255,255,.88)' }
        : { background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.9)', border: '1px solid rgba(255,255,255,.1)' },
    } as const;
    return { ...btnBase, ...(tones[tone] || tones.dark), boxShadow: active ? '0 0 18px rgba(255,255,255,.15)' : 'none' };
  };

  const auxToneStyles = (tone: KeypadAuxAction['tone'] = 'dark', active = false) => {
    const map = {
      blue: active
        ? { background: 'linear-gradient(180deg, rgba(0,196,255,.24), rgba(0,0,0,.38))', color: '#dcf6ff', border: '1px solid rgba(129,230,255,.55)', boxShadow: '0 0 22px rgba(0,196,255,.14)' }
        : { background: 'linear-gradient(180deg, rgba(0,196,255,.12), rgba(0,0,0,.30))', color: '#d8f6ff', border: '1px solid rgba(129,230,255,.24)', boxShadow: 'none' },
      teal: active
        ? { background: 'linear-gradient(180deg, rgba(71,219,201,.24), rgba(0,0,0,.38))', color: '#e7fffb', border: '1px solid rgba(130,255,243,.55)', boxShadow: '0 0 22px rgba(71,219,201,.14)' }
        : { background: 'linear-gradient(180deg, rgba(71,219,201,.12), rgba(0,0,0,.30))', color: '#c7fffa', border: '1px solid rgba(130,255,243,.24)', boxShadow: 'none' },
      magenta: active
        ? { background: 'linear-gradient(180deg, rgba(255,105,214,.22), rgba(0,0,0,.38))', color: '#ffe1ff', border: '1px solid rgba(255,189,245,.55)', boxShadow: '0 0 22px rgba(255,105,214,.14)' }
        : { background: 'linear-gradient(180deg, rgba(255,105,214,.12), rgba(0,0,0,.30))', color: '#ffd9fa', border: '1px solid rgba(255,189,245,.24)', boxShadow: 'none' },
      violet: active
        ? { background: 'linear-gradient(180deg, rgba(200,132,255,.24), rgba(0,0,0,.38))', color: '#f7e8ff', border: '1px solid rgba(228,196,255,.55)', boxShadow: '0 0 22px rgba(200,132,255,.14)' }
        : { background: 'linear-gradient(180deg, rgba(200,132,255,.12), rgba(0,0,0,.30))', color: '#efd9ff', border: '1px solid rgba(228,196,255,.24)', boxShadow: 'none' },
      green: active
        ? { background: 'linear-gradient(180deg, rgba(100,255,160,.22), rgba(0,0,0,.38))', color: '#e7fff1', border: '1px solid rgba(175,255,208,.55)', boxShadow: '0 0 22px rgba(100,255,160,.14)' }
        : { background: 'linear-gradient(180deg, rgba(100,255,160,.11), rgba(0,0,0,.30))', color: '#e7fff1', border: '1px solid rgba(175,255,208,.24)', boxShadow: 'none' },
      gold: active
        ? { background: 'linear-gradient(180deg, rgba(255,205,54,.42), rgba(0,0,0,.22))', color: '#fff5cc', border: '1px solid rgba(255,230,156,.60)', boxShadow: '0 0 22px rgba(255,175,0,.18)' }
        : { background: 'linear-gradient(180deg, rgba(255,205,54,.18), rgba(0,0,0,.30))', color: '#fff0bf', border: '1px solid rgba(255,230,156,.28)', boxShadow: 'none' },
      red: active
        ? { background: 'linear-gradient(180deg, rgba(255,106,114,.35), rgba(78,0,10,.48))', color: '#fff3f5', border: '1px solid rgba(255,176,185,.62)', boxShadow: '0 0 22px rgba(255,74,96,.22)' }
        : { background: 'linear-gradient(180deg, rgba(255,86,106,.18), rgba(0,0,0,.32))', color: '#ffe6ea', border: '1px solid rgba(255,152,165,.32)', boxShadow: 'none' },
      dark: active
        ? { background: 'linear-gradient(180deg, rgba(180,255,30,.24), rgba(0,0,0,.38))', color: '#d8ff66', border: '1px solid rgba(180,255,30,.55)', boxShadow: '0 0 22px rgba(180,255,30,.22)' }
        : { background: 'rgba(255,255,255,.055)', color: 'rgba(255,255,255,.92)', border: '1px solid rgba(255,255,255,.12)', boxShadow: 'none' },
    } as const;
    return map[tone] || map.dark;
  };
  const actionContent = (action:any, fallback?:React.ReactNode) => action?.icon ?? action?.label ?? fallback ?? null;

  return (
    <div
      data-mss-keypad="1"
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

      {singleRingSelector ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            onClick={singleRingSelector.onOuter}
            aria-pressed={singleRingSelector.value === "outer" && multiplier === 1}
            style={{
              ...btnBase,
              background: singleRingSelector.value === "outer" && multiplier === 1
                ? "rgba(22,92,66,.35)"
                : "rgba(255,255,255,.04)",
              color: singleRingSelector.value === "outer" && multiplier === 1
                ? "#8be0b8"
                : "rgba(255,255,255,.82)",
              borderColor: singleRingSelector.value === "outer" && multiplier === 1
                ? "rgba(139,224,184,.72)"
                : "rgba(255,255,255,.08)",
            }}
            title="Simple extérieur"
          >
            {singleRingSelector.outerLabel || "SIMPLE EXT."}
          </button>

          <button
            type="button"
            onClick={singleRingSelector.onInner}
            aria-pressed={singleRingSelector.value === "inner" && multiplier === 1}
            style={{
              ...btnBase,
              background: singleRingSelector.value === "inner" && multiplier === 1
                ? "rgba(179,68,151,.20)"
                : "rgba(255,255,255,.04)",
              color: singleRingSelector.value === "inner" && multiplier === 1
                ? "#ffccff"
                : "rgba(255,255,255,.82)",
              borderColor: singleRingSelector.value === "inner" && multiplier === 1
                ? "rgba(255,208,255,.72)"
                : "rgba(255,255,255,.08)",
            }}
            title="Simple intérieur"
          >
            {singleRingSelector.innerLabel || "SIMPLE INT."}
          </button>
        </div>
      ) : null}

      {/* Actions principales. P’TIT 1 possède volontairement son ordre propre. */}
      {usePtit1ActionRows ? (
        <>
          <div
            data-mss-ptit1-keypad-row="primary"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              style={{ ...btnDouble, borderColor: multiplier === 2 ? "#9bd7ff" : "rgba(255,255,255,.08)" }}
              aria-pressed={multiplier === 2}
              onClick={onDouble}
              onMouseUp={latchMultiplier ? undefined : onSimple}
              title="Double"
            >
              DOUBLE
            </button>
            <button
              type="button"
              style={{ ...btnTriple, borderColor: multiplier === 3 ? "#ffd0ff" : "rgba(255,255,255,.08)" }}
              aria-pressed={multiplier === 3}
              onClick={onTriple}
              onMouseUp={latchMultiplier ? undefined : onSimple}
              title="Triple"
            >
              TRIPLE
            </button>
            <button
              type="button"
              style={{ ...splitActionBase, ...auxToneStyles(secondaryAction!.tone || "red", !!secondaryAction!.active), opacity: secondaryAction!.disabled ? .45 : 1 }}
              onClick={secondaryAction!.onClick}
              disabled={secondaryAction!.disabled}
              title={secondaryAction!.title || "MISS"}
              aria-label={secondaryAction!.ariaLabel || secondaryAction!.title || "MISS"}
            >
              <ActionIcon>{secondaryAction!.icon}</ActionIcon>
            </button>
            <button
              type="button"
              style={{
                ...splitActionBase,
                background: "linear-gradient(180deg, rgba(255,198,58,.96), rgba(255,175,0,.90))",
                color: "#1a1a1a",
                border: "1px solid rgba(255,180,0,.34)",
                boxShadow: "0 10px 22px rgba(255,170,0,.24)",
                fontWeight: 1000,
              }}
              onClick={onCancel}
              onContextMenu={(e) => { e.preventDefault(); onBackspace?.(); }}
              title="Retour / annuler"
              aria-label="Retour / annuler"
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, minWidth: 0 }}>
                <UndoMiniIcon size={18} />
                <span style={{ fontSize: 9, whiteSpace: "nowrap" }}>ANNULER</span>
              </span>
            </button>
          </div>

          <div
            data-mss-ptit1-keypad-row="zones"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              marginBottom: noticeSlot ? 8 : 10,
            }}
          >
            {extraButtons.slice(0, 2).map((btn, idx) => (
              <button
                key={idx}
                type="button"
                style={extraButtonStyle(!!btn.active, btn.tone || (idx === 0 ? "yellow" : "orange"))}
                aria-pressed={!!btn.active}
                onClick={btn.onClick}
                title={btn.title || String(btn.label)}
                aria-label={btn.ariaLabel || String(btn.label)}
              >
                {btn.label}
              </button>
            ))}
            <button
              type="button"
              style={{
                ...splitActionBase,
                ...auxToneStyles(auxAction!.tone || "gold", !!auxAction!.active),
                opacity: auxAction!.disabled ? .45 : 1,
                position: "relative",
                overflow: "hidden",
                fontWeight: 1000,
              }}
              onClick={auxAction!.onClick}
              disabled={auxAction!.disabled}
              title={auxAction!.title || auxAction!.label}
              aria-label={auxAction!.ariaLabel || auxAction!.label}
            >
              {auxAction!.fullBleedIcon ? (
                <>
                  <span style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", borderRadius: "inherit", opacity: .72 }}>
                    {auxAction!.icon}
                  </span>
                  <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.68))" }} />
                  <span style={{ position: "relative", zIndex: 2, padding: "0 5px", fontSize: 8.5, lineHeight: 1.05, textAlign: "center", color: "#fff3bd", textShadow: "0 1px 3px #000" }}>{auxAction!.label}</span>
                </>
              ) : (
                <span style={{ fontSize: 9 }}>{auxAction!.label}</span>
              )}
            </button>
          </div>
        </>
      ) : useExtendedMainRow ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${2 + extraButtons.length}, minmax(0, 1fr))`,
              gap: 10,
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              style={{
                ...btnDouble,
                borderColor: multiplier === 2 ? "#9bd7ff" : "rgba(255,255,255,.08)",
              }}
              aria-pressed={multiplier === 2}
              onClick={onDouble}
              onMouseUp={latchMultiplier ? undefined : onSimple}
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
              onMouseUp={latchMultiplier ? undefined : onSimple}
              title="Triple"
            >
              TRIPLE
            </button>

            {extraButtons.map((btn, idx) => (
              <button
                key={idx}
                type="button"
                style={extraButtonStyle(!!btn.active, btn.tone || (idx === 0 ? 'blue' : 'magenta'))}
                aria-pressed={!!btn.active}
                onClick={btn.onClick}
                title={btn.title || String(btn.label)}
                aria-label={btn.ariaLabel || String(btn.label)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {useTripleActionRow ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginBottom: noticeSlot ? 8 : 10,
              }}
            >
              <button
                type="button"
                style={{
                  ...splitActionBase,
                  background: "linear-gradient(180deg, rgba(255,198,58,.96), rgba(255,175,0,.90))",
                  color: "#1a1a1a",
                  border: "1px solid rgba(255,180,0,.34)",
                  boxShadow: "0 10px 22px rgba(255,170,0,.24)",
                  fontWeight: 1000,
                  fontSize: 10,
                }}
                onClick={onCancel}
                onContextMenu={(e) => { e.preventDefault(); onBackspace?.(); }}
                title="Retour / effacer"
                aria-label="Retour / effacer"
              >
                ANNULER
              </button>
              <button
                type="button"
                style={{ ...splitActionBase, ...auxToneStyles(secondaryAction!.tone || 'green', !!secondaryAction!.active), opacity: secondaryAction!.disabled ? .45 : 1, fontWeight: 1000 }}
                onClick={secondaryAction!.onClick}
                disabled={secondaryAction!.disabled}
                title={secondaryAction!.title || String(secondaryAction!.label || 'Action')}
                aria-label={secondaryAction!.ariaLabel || secondaryAction!.title || String(secondaryAction!.label || 'Action')}
              >
                {secondaryAction!.icon ?? secondaryAction!.label ?? "ACTION"}
              </button>
              <button
                type="button"
                style={{ ...splitActionBase, ...auxToneStyles(auxAction!.tone || 'gold', !!auxAction!.active), opacity: auxAction!.disabled ? 0.45 : 1, fontWeight: 1000 }}
                onClick={auxAction!.onClick}
                disabled={auxAction!.disabled}
                title={auxAction!.title || String(auxAction!.label)}
                aria-label={auxAction!.ariaLabel || auxAction!.title || String(auxAction!.label)}
              >
                {auxAction!.icon ?? auxAction!.label}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: auxAction ? "1fr 1fr" : "1fr",
                gap: 8,
                marginBottom: noticeSlot ? 8 : 10,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: secondaryAction ? "1fr 1fr" : "1fr", gap: 8, minWidth: 0 }}>
                <button
                  type="button"
                  style={auxAction ? {
                    ...splitActionBase,
                    background: "linear-gradient(180deg, rgba(255,198,58,.96), rgba(255,175,0,.90))",
                    color: "#1a1a1a",
                    border: "1px solid rgba(255,180,0,.34)",
                    boxShadow: "0 10px 22px rgba(255,170,0,.24)",
                  } : btnCancel}
                  onClick={onCancel}
                  onContextMenu={(e) => { e.preventDefault(); onBackspace?.(); }}
                  title="Retour / effacer"
                  aria-label="Retour / effacer"
                >
                  {auxAction ? <ActionIcon><UndoMiniIcon /></ActionIcon> : "ANNULER"}
                </button>
                {secondaryAction ? (
                  <button
                    type="button"
                    style={{ ...splitActionBase, ...auxToneStyles(secondaryAction.tone || 'teal', !!secondaryAction.active), opacity: secondaryAction.disabled ? .45 : 1 }}
                    onClick={secondaryAction.onClick}
                    disabled={secondaryAction.disabled}
                    title={secondaryAction.title || String(secondaryAction.label || 'Action')}
                    aria-label={secondaryAction.ariaLabel || secondaryAction.title || String(secondaryAction.label || 'Action')}
                  >
                    {secondaryAction.icon ?? secondaryAction.label}
                  </button>
                ) : null}
              </div>
              {auxAction ? (
                <button
                  type="button"
                  style={{
                    ...splitActionBase,
                    ...auxToneStyles(auxAction.tone || 'dark', !!auxAction.active),
                    opacity: auxAction.disabled ? 0.45 : 1,
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={auxAction.onClick}
                  disabled={auxAction.disabled}
                  title={auxAction.title || auxAction.label}
                  aria-label={auxAction.ariaLabel || auxAction.label}
                >
                  {auxAction.fullBleedIcon ? (
                    <span style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", borderRadius: "inherit" }}>
                      {auxAction.icon}
                    </span>
                  ) : (
                    auxAction.icon ?? auxAction.label
                  )}
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: noticeSlot ? 8 : 10,
          }}
        >
          <button
            type="button"
            style={{
              ...btnDouble,
              borderColor: guideMultiplier === 2 ? `${guideColor}dd` : multiplier === 2 ? "#9bd7ff" : "rgba(255,255,255,.08)",
              boxShadow: guideMultiplier === 2 ? `0 0 18px ${guideColor}30` : undefined,
            }}
            aria-pressed={multiplier === 2}
            onClick={onDouble}
            onMouseUp={latchMultiplier ? undefined : onSimple}
            title="Double"
          >
            DOUBLE
          </button>

          <button
            type="button"
            style={{
              ...btnTriple,
              borderColor: guideMultiplier === 3 ? `${guideColor}dd` : multiplier === 3 ? "#ffd0ff" : "rgba(255,255,255,.08)",
              boxShadow: guideMultiplier === 3 ? `0 0 18px ${guideColor}30` : undefined,
            }}
            aria-pressed={multiplier === 3}
            onClick={onTriple}
            onMouseUp={latchMultiplier ? undefined : onSimple}
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
                  ...auxToneStyles(auxAction.tone || 'dark', !!auxAction.active),
                  opacity: auxAction.disabled ? 0.45 : 1,
                  position: "relative",
                  overflow: "hidden",
                }}
                onClick={auxAction.onClick}
                disabled={auxAction.disabled}
                title={auxAction.title || auxAction.label}
                aria-label={auxAction.ariaLabel || auxAction.label}
              >
                {auxAction.fullBleedIcon ? (
                  <span style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", borderRadius: "inherit" }}>
                    {auxAction.icon}
                  </span>
                ) : (
                  <ActionIcon>{auxAction.icon}</ActionIcon>
                )}
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

      {noticeSlot ? <div style={{ marginBottom: 8 }}>{noticeSlot}</div> : null}

      {/* Grille chiffres statique : mémoïsée pour rester instantanée sur mobile. */}
      {colorRowButtons.length ? (
        <div data-mss-keypad-color-row="1" style={{ display: "grid", gridTemplateColumns: `repeat(${colorRowButtons.length}, minmax(0, 1fr))`, gap: 8, marginBottom: 8 }}>
          {colorRowButtons.map((btn, idx) => (
            <button key={idx} type="button" onClick={btn.onClick} aria-pressed={!!btn.active} title={btn.title || btn.ariaLabel || "Couleur"} aria-label={btn.ariaLabel || btn.title || "Couleur"} style={{ height: 34, borderRadius: 10, border: btn.active ? "2px solid #fff" : "1px solid rgba(255,255,255,.28)", background: btn.color, boxShadow: btn.active ? `0 0 0 2px ${btn.color}55, 0 0 18px ${btn.color}88` : "inset 0 0 0 1px rgba(0,0,0,.18)", transform: btn.active ? "translateY(-1px)" : "none", cursor: "pointer" }} />
          ))}
        </div>
      ) : null}

      <KeypadNumberGrid onNumber={handleNumber} disableSegmentNumbers={disableSegmentNumbers} highlightSegmentNumbers={highlightSegmentNumbers} highlightColor={guideColor} />

      {/* BULL ou SLOT à gauche + centre + VALIDER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(88px, .8fr) minmax(50px, .42fr) minmax(118px, 1fr)",
          alignItems: "center",
          gap: footerGap,
          marginTop: 10,
        }}
      >
        <div style={{ minWidth: 0, display: "flex", alignItems: "center" }}>
          {footerLeftSlot ? (
            <div style={{ width: "100%" }}>{footerLeftSlot}</div>
          ) : footerHideBull ? (
            <div style={{ width: "100%", minHeight: 40 }} />
          ) : (
            <button
              type="button"
              style={{
                ...btnBull,
                width: "100%",
                ...(highlightBull ? {
                  borderColor: `${guideColor}dd`,
                  boxShadow: `0 0 18px ${guideColor}30, inset 0 0 0 1px ${guideColor}44`,
                  filter: "brightness(1.12)",
                } : null),
              }}
              onClick={onBull}
            >
              BULL
            </button>
          )}
        </div>

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
            <div style={{ display: "grid", placeItems: "center", width: "100%" }}>
              {centerSlot}
            </div>
          ) : hideTotal ? null : (
            <span style={totalPill}>{total}</span>
          )}
        </div>

        {footerAction ? (
          <button
            type="button"
            style={{ ...btnBase, width: "100%", ...auxToneStyles(footerAction.tone || 'green', false), fontWeight: 1000 }}
            onClick={footerAction.onClick}
            disabled={footerAction.disabled}
            title={footerAction.title || String(footerAction.label)}
            aria-label={footerAction.ariaLabel || footerAction.title || String(footerAction.label)}
          >
            {footerAction.label}
          </button>
        ) : (
          <button
            type="button"
            style={{
              ...btnGold,
              width: "100%",
              ...(validateAttention ? { color: "#050505", background: "linear-gradient(180deg, #ffffff, #ffd666)", border: "1px solid rgba(255,255,255,.92)", boxShadow: "0 0 24px rgba(255,255,255,.56), 0 10px 22px rgba(255,170,0,.28)", animation: "dcVoiceGlow .9s ease-in-out infinite" } : null),
              ...(validateDisabled ? { opacity: .48, cursor: "not-allowed", boxShadow: "none", filter: "saturate(.55)" } : null),
            }}
            onClick={onValidate}
            disabled={validateDisabled}
            title={validateAttention ? "Volée vocale prête : clique pour valider" : "Valider la volée"}
            aria-label={validateAttention ? "Valider la volée vocale" : "Valider la volée"}
            aria-disabled={validateDisabled}
          >
            {validateLabel}
          </button>
        )}
      </div>
    </div>
  );
}
