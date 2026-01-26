// ============================================
// src/training/ui/TrainingHeader.tsx
// Header Training (ticker + BackDot + InfoDot)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerTraining from "../../assets/tickers/ticker_training.png";

export default function TrainingHeader({
  title,
  rules,
  onBack,
}: {
  title?: string;
  rules?: React.ReactNode;
  onBack?: () => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          paddingTop: "env(safe-area-inset-top)",
          marginBottom: 10,
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={tickerTraining}
            alt="Training"
            draggable={false}
            style={{ width: "100%", height: 92, objectFit: "cover", display: "block" }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BackDot onClick={onBack} glow={theme.primary + "88"} />
              {title ? (
                <div
                  style={{
                    fontWeight: 900,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    textShadow: `0 0 10px ${theme.primary}55`,
                  }}
                >
                  {title}
                </div>
              ) : null}
            </div>

            <InfoDot
              size={34}
              color="#FFFFFF"
              glow={theme.primary + "66"}
              onClick={() => setOpen(true)}
            />
          </div>
        </div>
      </div>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, calc(100vw - 24px))",
              borderRadius: 18,
              background: "rgba(10,10,10,0.92)",
              border: `1px solid ${theme.primary}55`,
              boxShadow: "0 18px 50px rgba(0,0,0,0.75)",
              padding: 16,
              color: theme.text,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8, color: theme.primary }}>
              Règles & objectifs
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.9 }}>
              {rules ?? <p>Règles non définies.</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginLeft: "auto",
                marginTop: 12,
                display: "block",
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
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
    </>
  );
}
