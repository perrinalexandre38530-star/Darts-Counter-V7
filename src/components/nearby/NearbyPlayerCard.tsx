import React from "react";
import type { NearbyEncounter, NearbyPlayer } from "../../lib/nearbyPlayersApi";

type PlayerLike = NearbyPlayer | NearbyEncounter;

type Props = {
  player: PlayerLike;
  accent: string;
  compact?: boolean;
  crossedCount?: number;
  lastCrossedAt?: string | null;
  proposed?: boolean;
  onFriend?: () => void;
  onMessage?: () => void;
  onMatch?: () => void;
  onTournament?: () => void;
};

const SPORT_LABEL: Record<string, string> = {
  darts: "Fléchettes",
  babyfoot: "Baby-foot",
  petanque: "Pétanque",
  pingpong: "Ping-pong",
  molkky: "Mölkky",
  dice: "Dés",
  foot: "Football",
};

const SPORT_ICON: Record<string, string> = {
  darts: "🎯",
  babyfoot: "⚽",
  petanque: "🔵",
  pingpong: "🏓",
  molkky: "🪵",
  dice: "🎲",
  foot: "⚽",
};

function flagEmoji(raw?: string | null) {
  const code = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}

function formatRelative(raw?: string | null) {
  if (!raw) return "";
  const time = new Date(raw).getTime();
  if (!Number.isFinite(time)) return "";
  const delta = Math.max(0, Date.now() - time);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 2) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(raw).toLocaleDateString();
}

function alpha(hex: string, opacity: string) {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${opacity}` : `rgba(34,230,255,${parseInt(opacity, 16) / 255})`;
}

export default function NearbyPlayerCard({
  player,
  accent,
  compact = false,
  crossedCount,
  lastCrossedAt,
  proposed,
  onFriend,
  onMessage,
  onMatch,
  onTournament,
}: Props) {
  const flag = flagEmoji(player.countryCode);
  const skill = Math.max(0, Math.min(5, Math.round(Number(player.skillLevel || 0))));
  const sports = Array.isArray(player.sports) ? player.sports.slice(0, 4) : [];
  const availableNow = !!player.availableNow;
  const lookingForGame = !!player.lookingForGame;
  const distanceLabel = String(player.distanceLabel || "À proximité");
  const displayName = String(player.displayName || "Joueur");

  const action: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.055)",
    color: "#fff",
    minHeight: 38,
    padding: "8px 10px",
    fontSize: 11.5,
    fontWeight: 1000,
    cursor: "pointer",
  };

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: compact ? 18 : 24,
        border: `1px solid ${alpha(accent, "55")}`,
        background: `
          radial-gradient(120% 90% at 0% 0%, ${alpha(accent, "2f")}, transparent 58%),
          radial-gradient(90% 100% at 100% 100%, ${lookingForGame ? "rgba(255,145,42,.18)" : "rgba(104,92,255,.12)"}, transparent 62%),
          linear-gradient(145deg, rgba(9,15,25,.98), rgba(3,7,13,.97))`,
        boxShadow: `0 18px 48px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.045), 0 0 28px ${alpha(accent, "18")}`,
        padding: compact ? 11 : 14,
      }}
    >
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", right: -48, top: -58, background: `${accent}12`, filter: "blur(2px)" }} />
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: compact ? "54px minmax(0,1fr)" : "72px minmax(0,1fr)", gap: compact ? 10 : 13, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: compact ? 54 : 72,
              height: compact ? 54 : 72,
              borderRadius: compact ? 17 : 22,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              border: `2px solid ${availableNow ? "#68f394" : accent}`,
              background: `linear-gradient(145deg, ${alpha(accent, "35")}, rgba(255,255,255,.04))`,
              boxShadow: `0 0 22px ${availableNow ? "rgba(104,243,148,.25)" : alpha(accent, "28")}`,
              fontSize: compact ? 22 : 28,
            }}
          >
            {player.avatarUrl ? <img src={player.avatarUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </div>
          <div style={{ position: "absolute", right: -4, bottom: -4, minWidth: 22, height: 22, padding: "0 4px", borderRadius: 999, display: "grid", placeItems: "center", background: "#07101b", border: "1px solid rgba(255,255,255,.18)", fontSize: 13 }}>{flag || "🌐"}</div>
          {availableNow ? <div title="Disponible maintenant" style={{ position: "absolute", left: -3, top: -3, width: 13, height: 13, borderRadius: "50%", background: "#69ef91", border: "2px solid #06101a", boxShadow: "0 0 12px #69ef91" }} /> : null}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1, fontSize: compact ? 14.5 : 17, fontWeight: 1000, letterSpacing: .2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ flex: "0 0 auto", borderRadius: 999, padding: "5px 8px", background: `${accent}18`, border: `1px solid ${accent}55`, color: accent, fontSize: 10.5, fontWeight: 1000 }}>📍 {distanceLabel}</div>
          </div>

          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {skill > 0 ? <span style={{ color: "#ffd66b", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(skill)}<span style={{ opacity: .24 }}>{"★".repeat(5 - skill)}</span></span> : <span style={{ fontSize: 10.5, opacity: .62 }}>Niveau non renseigné</span>}
            {player.cityLabel ? <span style={{ fontSize: 10.5, opacity: .68 }}>{player.cityLabel}</span> : null}
          </div>

          <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {sports.length ? sports.map((sport) => (
              <span key={sport} style={{ borderRadius: 999, padding: "4px 7px", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.09)", fontSize: 10.5, fontWeight: 850 }}>
                {SPORT_ICON[sport] || "🏅"} {SPORT_LABEL[sport] || sport}
              </span>
            )) : <span style={{ fontSize: 10.5, opacity: .6 }}>Multisports</span>}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: compact ? 9 : 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {availableNow ? <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(78,232,121,.12)", border: "1px solid rgba(78,232,121,.32)", color: "#8cffaa", fontSize: 10.5, fontWeight: 1000 }}>● DISPONIBLE</span> : null}
        {lookingForGame ? <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(255,147,49,.12)", border: "1px solid rgba(255,147,49,.35)", color: "#ffb060", fontSize: 10.5, fontWeight: 1000 }}>🔥 CHERCHE UNE PARTIE</span> : null}
        {crossedCount ? <span style={{ borderRadius: 999, padding: "5px 8px", background: `${accent}12`, border: `1px solid ${accent}38`, color: accent, fontSize: 10.5, fontWeight: 1000 }}>✦ CROISÉ {crossedCount} FOIS</span> : null}
        {lastCrossedAt ? <span style={{ padding: "5px 2px", fontSize: 10.5, opacity: .62 }}>{formatRelative(lastCrossedAt)}</span> : null}
      </div>

      {!compact ? (
        <div style={{ position: "relative", marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          {onFriend ? <button type="button" style={action} onClick={onFriend}>＋ Ami</button> : null}
          {onMessage ? <button type="button" style={action} onClick={onMessage}>💬 Message</button> : null}
          {onMatch ? <button type="button" disabled={proposed} style={{ ...action, borderColor: accent, background: `${accent}18`, color: accent, opacity: proposed ? .55 : 1 }} onClick={onMatch}>{proposed ? "✓ Match proposé" : "⚡ Proposer un match"}</button> : null}
          {onTournament ? <button type="button" style={{ ...action, borderColor: "rgba(255,190,82,.55)", color: "#ffd276", background: "rgba(255,190,82,.09)" }} onClick={onTournament}>🏆 Inviter tournoi</button> : null}
        </div>
      ) : null}
    </article>
  );
}
