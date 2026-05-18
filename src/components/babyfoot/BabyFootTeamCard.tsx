import React from "react";
import ProfileAvatar from "../ProfileAvatar";

type ProfileLike = {
  id?: string;
  name?: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
} | null;

type Props = {
  team: "A" | "B";
  name: string;
  score: number;
  playerIds: string[];
  getProfile: (id: string) => ProfileLike;
  logoDataUrl?: string | null;
  handicap?: number;
  onAddGoal: () => void;
  disabled?: boolean;
  accent: "green" | "pink";
  footerLabel?: string;
};

function TeamLogo({ label, logoDataUrl }: { label: string; logoDataUrl?: string | null }) {
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt={label}
        style={{
          width: 44,
          height: 44,
          objectFit: "cover",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.05)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        display: "grid",
        placeItems: "center",
        fontSize: 21,
        fontWeight: 1100,
      }}
    >
      {label.trim().slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

export default function BabyFootTeamCard({
  team,
  name,
  score,
  playerIds,
  getProfile,
  logoDataUrl,
  handicap = 0,
  onAddGoal,
  disabled = false,
  accent,
  footerLabel,
}: Props) {
  const color = accent === "green" ? "#7cffc4" : "#ff82b8";
  const buttonBg =
    accent === "green"
      ? "linear-gradient(180deg, rgba(124,255,196,0.24), rgba(124,255,196,0.10))"
      : "linear-gradient(180deg, rgba(255,130,184,0.24), rgba(255,130,184,0.10))";
  const visiblePlayers = playerIds.slice(0, 2);
  const extraPlayers = Math.max(0, playerIds.length - visiblePlayers.length);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          accent === "green"
            ? "radial-gradient(700px 180px at 0% 0%, rgba(124,255,196,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))"
            : "radial-gradient(700px 180px at 100% 0%, rgba(255,130,184,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <TeamLogo label={name} logoDataUrl={logoDataUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 0.8, color, opacity: 0.94 }}>ÉQUIPE {team}</div>
            <div
              title={name}
              style={{
                marginTop: 3,
                fontSize: 15,
                fontWeight: 1100,
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, fontWeight: 1000, opacity: 0.72 }}>
              {playerIds.length} joueur{playerIds.length > 1 ? "s" : ""}{handicap > 0 ? ` • Hcap ${handicap}` : ""}
            </div>
          </div>
        </div>

        <div
          style={{
            minWidth: 46,
            textAlign: "center",
            borderRadius: 14,
            padding: "7px 8px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 1000, letterSpacing: 0.7, opacity: 0.62 }}>BUTS</div>
          <div style={{ marginTop: 3, fontSize: 18, fontWeight: 1100, lineHeight: 1 }}>{score}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {visiblePlayers.map((playerId) => {
          const profile = getProfile(playerId);
          const label = profile?.name || playerId;
          return (
            <div
              key={playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                minWidth: 0,
                flex: "1 1 0",
                borderRadius: 12,
                padding: "7px 8px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <ProfileAvatar profile={profile || { id: playerId, name: playerId }} size={28} />
              <div
                style={{
                  minWidth: 0,
                  fontSize: 12,
                  fontWeight: 1000,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.66 }}>
          {footerLabel || "Action rapide"}
          {extraPlayers > 0 ? ` • +${extraPlayers}` : ""}
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          disabled={disabled}
          style={{
            minWidth: 104,
            height: 40,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: disabled ? "rgba(255,255,255,0.05)" : buttonBg,
            color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
            fontWeight: 1100,
            letterSpacing: 0.5,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          + BUT
        </button>
      </div>
    </div>
  );
}
