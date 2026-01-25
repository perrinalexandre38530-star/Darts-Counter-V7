// ============================================
// TRAINING — Header commun (BackDot + InfoDot)
// NOTE: aligné sur les composants existants.
// ============================================

import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

type Props = {
  /** ticker src direct (ex: import tickerX from ...) */
  tickerSrc?: string | null;
  /** contenu des règles affiché par InfoDot */
  rules: React.ReactNode;
  /** action back optionnelle */
  onBack?: (() => void) | null;
};

export default function TrainingHeader({ tickerSrc, rules, onBack }: Props) {
  return (
    <div style={{ position: "relative" }}>
      {tickerSrc ? (
        <img
          src={tickerSrc}
          alt="Training"
          draggable={false}
          style={{
            width: "100%",
            height: 92,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <BackDot onClick={onBack ?? undefined} />
        </div>

        <div style={{ pointerEvents: "auto" }}>
          <InfoDot>{rules}</InfoDot>
        </div>
      </div>
    </div>
  );
}
