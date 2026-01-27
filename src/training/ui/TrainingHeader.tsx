// ============================================
// TRAINING — Header commun (BackDot optionnel)
// ============================================

import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

type Props = {
  title: string;
  rules: React.ReactNode;
  onBack?: (() => void) | null;
};

export default function TrainingHeader({ title, rules, onBack }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        padding: 12,
        paddingTop: "calc(env(safe-area-inset-top) + 10px)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ width: 42 }}>
          {onBack ? <BackDot onClick={onBack} /> : null}
        </div>

        <div style={{ flex: 1, textAlign: "center", fontWeight: 900, letterSpacing: 1.1 }}>
          {title}
        </div>

        <div style={{ width: 42, display: "flex", justifyContent: "flex-end" }}>
          <InfoDot onClick={() => setOpen(true)} />
        </div>
      </div>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              width: "100%",
              borderRadius: 18,
              background: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: 16,
              boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Règles</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.95 }}>{rules}</div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 12,
                marginLeft: "auto",
                display: "block",
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "rgba(255,255,255,0.9)",
                color: "#000",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
