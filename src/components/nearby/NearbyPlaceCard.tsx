import React from "react";
import type { NearbyPlace } from "../../lib/nearbyPlayersApi";

type Props = {
  place: NearbyPlace;
  accent: string;
  onContact?: () => void;
  onInvite?: () => void;
  onDelete?: () => void;
};

const KIND: Record<string, { icon: string; label: string; color: string }> = {
  club: { icon: "🏛", label: "CLUB", color: "#9a88ff" },
  team: { icon: "🛡", label: "ÉQUIPE", color: "#52d7ff" },
  tournament: { icon: "🏆", label: "TOURNOI", color: "#ffc65d" },
  venue: { icon: "📌", label: "LIEU", color: "#78efa1" },
};

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NearbyPlaceCard({ place, accent, onContact, onInvite, onDelete }: Props) {
  const meta = KIND[place.kind] || KIND.venue;
  return (
    <article style={{ borderRadius: 22, overflow: "hidden", border: `1px solid ${meta.color}55`, background: `radial-gradient(110% 100% at 0% 0%, ${meta.color}24, transparent 58%), linear-gradient(145deg, rgba(8,14,23,.98), rgba(3,7,13,.97))`, boxShadow: "0 16px 40px rgba(0,0,0,.28)", padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", gap: 11, alignItems: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, display: "grid", placeItems: "center", fontSize: 27, border: `1px solid ${meta.color}66`, background: `${meta.color}18`, boxShadow: `0 0 20px ${meta.color}22` }}>{meta.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ borderRadius: 999, padding: "4px 7px", background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 9.5, fontWeight: 1000 }}>{meta.label}</span>
            <span style={{ borderRadius: 999, padding: "4px 7px", background: `${accent}12`, border: `1px solid ${accent}35`, color: accent, fontSize: 9.5, fontWeight: 1000 }}>📍 {place.distanceLabel}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.title}</div>
          <div style={{ marginTop: 3, fontSize: 11, opacity: .7 }}>{place.sport}{place.areaLabel ? ` • ${place.areaLabel}` : ""}</div>
        </div>
      </div>
      {place.description ? <div style={{ marginTop: 11, fontSize: 12, opacity: .78, lineHeight: 1.45 }}>{place.description}</div> : null}
      {place.startsAt ? <div style={{ marginTop: 9, borderRadius: 12, padding: "8px 9px", background: "rgba(255,255,255,.045)", fontSize: 11.5, fontWeight: 900 }}>🗓 {formatDate(place.startsAt)}{place.endsAt ? ` → ${formatDate(place.endsAt)}` : ""}</div> : null}
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: onDelete ? "1fr auto" : "repeat(2,minmax(0,1fr))", gap: 7 }}>
        {onContact ? <button type="button" onClick={onContact} style={{ borderRadius: 12, border: `1px solid ${accent}66`, background: `${accent}15`, color: accent, minHeight: 39, fontWeight: 1000, cursor: "pointer" }}>💬 Contacter</button> : null}
        {onInvite ? <button type="button" onClick={onInvite} style={{ borderRadius: 12, border: `1px solid ${meta.color}66`, background: `${meta.color}15`, color: meta.color, minHeight: 39, fontWeight: 1000, cursor: "pointer" }}>{place.kind === "tournament" ? "🏆 Participer" : "⚡ Proposer une rencontre"}</button> : null}
        {onDelete ? <button type="button" onClick={onDelete} style={{ borderRadius: 12, border: "1px solid rgba(255,110,125,.4)", background: "rgba(255,90,110,.1)", color: "#ff9aa8", minHeight: 39, padding: "0 12px", fontWeight: 1000, cursor: "pointer" }}>Supprimer</button> : null}
      </div>
    </article>
  );
}
