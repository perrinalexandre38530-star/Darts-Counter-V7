import React from "react";
import ProfileAvatar from "../ProfileAvatar";

type ProfileLike = { id?: string; name?: string; avatarDataUrl?: string | null; avatarUrl?: string | null } | null;

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
  accent?: "green" | "pink";
  footerLabel?: string;
};

function TeamLogo({ label, logoDataUrl }: { label: string; logoDataUrl?: string | null }) {
  return logoDataUrl ? (
    <img
      src={logoDataUrl}
      alt={label}
      style={{
        width: 36,
        height: 36,
        objectFit: "cover",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
      }}
    />
  ) : (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        display: "grid",
        placeItems: "center",
        fontSize: 16,
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
  accent = "green",
  footerLabel,
}: Props) {
  const visiblePlayers = playerIds.slice(0, 2);
  const morePlayers = Math.max(0, playerIds.length - visiblePlayers.length);
  const scoreBg = accent === "green" ? "rgba(124,255,196,0.14)" : "rgba(255,130,184,0.14)";

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 12,
        border: `1px solid ${accent === "green" ? "rgba(124,255,196,0.18)" : "rgba(255,130,184,0.18)"}`,
        background:
          accent === "green"
            ? "radial-gradient(900px 220px at 0% 0%, rgba(124,255,196,0.12), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))"
            : "radial-gradient(900px 220px at 100% 0%, rgba(255,130,184,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 16px 30px rgba(0,0,0,0.22)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <TeamLogo label={name} logoDataUrl={logoDataUrl} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>ÉQUIPE {team}</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 1000, opacity: 0.74 }}>
            {playerIds.length} joueur{playerIds.length > 1 ? "s" : ""}{handicap > 0 ? ` • handicap +${handicap}` : ""}
          </div>
        </div>

        <div
          style={{
            minWidth: 62,
            borderRadius: 16,
            padding: "10px 8px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: scoreBg,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: 1, opacity: 0.62 }}>SCORE</div>
          <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1100, lineHeight: 1 }}>{score}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {visiblePlayers.map((id) => {
          const profile = getProfile(id);
          const label = profile?.name || id;
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                borderRadius: 14,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <ProfileAvatar profile={profile || { id, name: id }} size={34} />
              <div style={{ minWidth: 0, fontSize: 14, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
              </div>
            </div>
          );
        })}

        {morePlayers > 0 ? <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.7 }}>+{morePlayers} joueur{morePlayers > 1 ? "s" : ""}</div> : null}
      </div>

      {footerLabel ? <div style={{ marginTop: 10, fontSize: 11, fontWeight: 1000, opacity: 0.7 }}>{footerLabel}</div> : null}

      <button
        type="button"
        onClick={onAddGoal}
        disabled={disabled}
        style={{
          marginTop: 10,
          width: "100%",
          height: 48,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: disabled
            ? "rgba(255,255,255,0.05)"
            : accent === "green"
            ? "linear-gradient(180deg, rgba(124,255,196,0.22), rgba(124,255,196,0.10))"
            : "linear-gradient(180deg, rgba(255,130,184,0.22), rgba(255,130,184,0.10))",
          color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
          fontWeight: 1100,
          letterSpacing: 0.8,
          cursor: disabled ? "default" : "pointer",
        }}
      >
        + BUT
      </button>
    </div>
  );
}
