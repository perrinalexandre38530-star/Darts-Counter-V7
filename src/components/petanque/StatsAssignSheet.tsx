import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const STATS = [
  "Pointage",
  "Bec",
  "Trou",
  "Tir réussi",
  "Carreau",
  "PTS Assist",
  "PTS Concédé"
];

export default function StatsAssignSheet({ open, onClose }: Props) {
  const [values, setValues] = React.useState<Record<string, number>>({});

  if (!open) return null;

  const inc = (k: string) =>
    setValues(v => ({ ...v, [k]: (v[k] || 0) + 1 }));

  const dec = (k: string) =>
    setValues(v => ({ ...v, [k]: Math.max(0, (v[k] || 0) - 1) }));

  return (
    <div style={overlay}>
      <div style={sheet}>
        <h3>Stats — Attribution</h3>

        {STATS.map(s => (
          <div key={s} style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1 }}>{s}</span>
            <button onClick={() => dec(s)}>-</button>
            <span>{values[s] || 0}</span>
            <button onClick={() => inc(s)}>+</button>
          </div>
        ))}

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
  minWidth: 320,
  color: "#fff"
};
