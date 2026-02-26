import React from "react";
import { createPortal } from "react-dom";

export default function RulesModal({
  open,
  onClose,
  title,
  children,
  /** Optional element rendered in the top-right corner (replaces the default × button). */
  topRight,
  /** If true, hides the default × button (useful when you already provide a footer button). */
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  topRight?: React.ReactNode;
  hideClose?: boolean;
}) {
  if (!open) return null;

  const node = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        // iOS/Android: évite que le "center" paraisse collé en haut (barre d'adresse / 100vh buggy)
        height: "100dvh",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: "92%",
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
          margin: 0,
          transform: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between" style={{ marginBottom: 8, paddingRight: 42 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
        </div>

        {/* Top-right slot (Tour:X etc.) OR default close button */}
        {topRight ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            {topRight}
          </div>
        ) : !hideClose ? (
          <button
            className="btn"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 34,
              height: 34,
              borderRadius: 12,
              padding: 0,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "#fff",
              fontSize: 18,
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            ×
          </button>
        ) : null}

        <div style={{ paddingTop: 6 }}>{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
