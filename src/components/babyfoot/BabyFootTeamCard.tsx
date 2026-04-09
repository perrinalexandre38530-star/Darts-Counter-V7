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
        width: 48,
        height: 48,
        objectFit: "cover",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
      }}
    />
  ) : (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        display: "grid",
        placeItems: "center",
        fontSize: 20,
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
  const accentGlow = accent === "green" ? "rgba(124,255,196,0.18)" : "rgba(255,130,184,0.18)";
  const accentBg = accent === "green" ? "rgba(124,255,196,0.12)" : "rgba(255,130,184,0.12)";
  const visibleIds = playerIds.slice(0, 3);
  const morePlayers = Math.max(0, playerIds.length - visibleIds.length);

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))",
        boxShadow: `0 18px 40px rgba(0,0,0,0.30), 0 0 0 1px ${accentGlow} inset`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 250,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <TeamLogo label={name} logoDataUrl={logoDataUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.66 }}>JOUEURS {team}</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>
              {playerIds.length} joueur{playerIds.length > 1 ? "s" : ""}
              {handicap > 0 ? ` • handicap +${handicap}` : ""}
            </div>
          </div>
        </div>

        <div
          style={{
            minWidth: 72,
            borderRadius: 18,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: accentBg,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1, opacity: 0.7 }}>SCORE</div>
          <div style={{ marginTop: 4, fontSize: 32, fontWeight: 1100, lineHeight: 1 }}>{score}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {visibleIds.map((id) => {
          const profile = getProfile(id);
          const label = profile?.name || id;
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 16,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <ProfileAvatar profile={profile || { id, name: id }} size={38} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
              </div>
            </div>
          );
        })}

        {morePlayers > 0 ? (
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>+{morePlayers} joueur{morePlayers > 1 ? "s" : ""} supplémentaire{morePlayers > 1 ? "s" : ""}</div>
        ) : null}
      </div>

      <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
        {footerLabel ? (
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.72 }}>{footerLabel}</div>
        ) : null}

        <button
          type="button"
          onClick={onAddGoal}
          disabled={disabled}
          style={{
            height: 54,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.14)",
            background: disabled
              ? "rgba(255,255,255,0.05)"
              : accent === "green"
              ? "linear-gradient(180deg, rgba(124,255,196,0.24), rgba(124,255,196,0.12))"
              : "linear-gradient(180deg, rgba(255,130,184,0.24), rgba(255,130,184,0.12))",
            color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
            fontWeight: 1100,
            letterSpacing: 0.9,
            cursor: disabled ? "default" : "pointer",
            boxShadow: disabled ? "none" : "0 14px 28px rgba(0,0,0,0.22)",
          }}
        >
          + BUT
        </button>
      </div>
    </div>
  );
}
