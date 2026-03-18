import React from "react";

export default function MatchDetailCard({
  match,
  playersById,
  score,
  onClose,
  onPlay,
  onSimulate,
}: any) {
  if (!match) return null;

  const p1 = playersById?.[match.aPlayerId];
  const p2 = playersById?.[match.bPlayerId];

  const a = score?.a ?? "-";
  const b = score?.b ?? "-";

  const winner =
    score && score.a !== score.b
      ? score.a > score.b
        ? "A"
        : "B"
      : null;

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={header}>
          <div>
            <div style={title}>{match.phaseLabel || "Match"}</div>
            <div style={subtitle}>{match.status}</div>
          </div>
          <button onClick={onClose} style={close}>✕</button>
        </div>

        <div style={scoreBlock}>
          <Player p={p1} score={a} winner={winner === "A"} />
          <div style={vs}>VS</div>
          <Player p={p2} score={b} winner={winner === "B"} />
        </div>

        <div style={infos}>
          <Info label="Format" value={match.format || "BO"} />
          <Info label="Round" value={match.roundLabel} />
          <Info label="Statut" value={match.status} />
        </div>

        <div style={actions}>
          <button onClick={onPlay} style={primary}>
            ▶ Jouer
          </button>
          <button onClick={onSimulate} style={secondary}>
            ⚡ Simuler
          </button>
        </div>
      </div>
    </div>
  );
}

function Player({ p, score, winner }: any) {
  return (
    <div
      style={{
        ...player,
        border: winner ? "2px solid #7fe2a9" : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <img src={p?.avatar} style={avatar} />
      <div style={name}>{p?.name || "TBD"}</div>
      <div style={scoreStyle}>{score}</div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div style={info}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const card = {
  width: "95%",
  maxWidth: 500,
  background: "#111",
  borderRadius: 20,
  padding: 20,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const title = { fontSize: 18, fontWeight: 800 };
const subtitle = { fontSize: 12, opacity: 0.6 };

const close = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
};

const scoreBlock = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 20,
  gap: 10,
};

const vs = { opacity: 0.5 };

const player = {
  flex: 1,
  textAlign: "center",
  padding: 10,
  borderRadius: 12,
};

const avatar = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  objectFit: "cover",
};

const name = {
  fontSize: 13,
  marginTop: 6,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const scoreStyle = {
  fontSize: 28,
  fontWeight: 900,
  marginTop: 6,
};

const infos = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 20,
};

const info = { textAlign: "center" };
const infoLabel = { fontSize: 10, opacity: 0.6 };
const infoValue = { fontSize: 13 };

const actions = {
  display: "flex",
  gap: 10,
  marginTop: 20,
};

const primary = {
  flex: 1,
  background: "#ffcf57",
  border: "none",
  padding: 12,
  borderRadius: 10,
};

const secondary = {
  flex: 1,
  background: "#333",
  border: "none",
  padding: 12,
  borderRadius: 10,
};
