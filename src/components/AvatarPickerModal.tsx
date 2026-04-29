import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (avatar: string) => void;
  avatars: string[];
};

export default function AvatarPickerModal({
  open,
  onClose,
  onSelect,
  avatars,
}: Props) {
  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span>Choisir un avatar</span>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={grid}>
          {avatars.map((a, i) => (
            <img
              key={i}
              src={a}
              style={avatar}
              onClick={() => {
                onSelect(a);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// styles simples (pas casser ton UI)
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  width: "90%",
  maxWidth: 500,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10,
  color: "white",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
};

const avatar: React.CSSProperties = {
  width: "100%",
  borderRadius: "50%",
  cursor: "pointer",
};