import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ScoreEndSheet({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={sheet}>
        <h3>SCORE — Ajouter une mène</h3>

        <div style={{ display: "flex", gap: 12 }}>
          <button>A +</button>
          <span>0</span>
          <button>B +</button>
        </div>

        <button onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const sheet: React.CSSProperties = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  minWidth: 280,
  color: "#fff"
};
