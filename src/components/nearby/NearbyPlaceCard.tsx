import React from "react";
import type { NearbyPlace, NearbyPlaceRequestType } from "../../lib/nearbyPlayersApi";

type Props = {
  place: NearbyPlace;
  accent: string;
  onRequest?: (type: NearbyPlaceRequestType) => void;
  onCancelRequest?: () => void;
  onDelete?: () => void;
};

const KIND: Record<string, { icon: string; label: string; color: string; action: string; requestType: NearbyPlaceRequestType }> = {
  club: { icon: "🏛", label: "CLUB", color: "#9a88ff", action: "Rejoindre le club", requestType: "join" },
  team: { icon: "🛡", label: "ÉQUIPE", color: "#52d7ff", action: "Défier l’équipe", requestType: "challenge" },
  tournament: { icon: "🏆", label: "TOURNOI", color: "#ffc65d", action: "Participer", requestType: "participate" },
  venue: { icon: "📌", label: "LIEU", color: "#78efa1", action: "Contacter", requestType: "contact" },
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

function formatDate(raw?: string | null) {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function requestLabel(status?: string | null) {
  if (status === "accepted") return "✓ Demande acceptée";
  if (status === "pending") return "⏳ Demande envoyée";
  if (status === "rejected") return "↻ Renvoyer une demande";
  if (status === "cancelled") return "↻ Refaire une demande";
  return "";
}

export default function NearbyPlaceCard({ place, accent, onRequest, onCancelRequest, onDelete }: Props) {
  const meta = KIND[place.kind] || KIND.venue;
  const accepted = Math.max(0, Number(place.acceptedCount || 0));
  const capacity = place.maxParticipants == null ? null : Math.max(2, Number(place.maxParticipants));
  const full = capacity != null && accepted >= capacity;
  const status = String(place.myRequestStatus || "");
  const skillMin = place.minSkillLevel == null ? null : Math.max(1, Math.min(5, Number(place.minSkillLevel)));
  const skillMax = place.maxSkillLevel == null ? null : Math.max(1, Math.min(5, Number(place.maxSkillLevel)));
  const cover = String(place.coverUrl || "").trim();
  const organizer = String(place.organizerLabel || place.ownerDisplayName || place.metadata?.publisherName || "Organisateur");

  const button: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${meta.color}66`,
    background: `${meta.color}15`,
    color: meta.color,
    minHeight: 41,
    padding: "8px 11px",
    fontWeight: 1000,
    cursor: "pointer",
  };

  return (
    <article style={{ borderRadius: 24, overflow: "hidden", border: `1px solid ${meta.color}55`, background: `radial-gradient(110% 100% at 0% 0%, ${meta.color}24, transparent 58%), linear-gradient(145deg, rgba(8,14,23,.98), rgba(3,7,13,.97))`, boxShadow: "0 18px 44px rgba(0,0,0,.3)" }}>
      {cover ? (
        <div style={{ position: "relative", height: 112, overflow: "hidden", background: `${meta.color}12` }}>
          <img src={cover} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.72) saturate(.9)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 15%, rgba(4,9,16,.9) 100%)" }} />
          <div style={{ position: "absolute", left: 12, bottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(3,8,14,.82)", border: `1px solid ${meta.color}77`, fontSize: 18 }}>{meta.icon}</span>
            <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(3,8,14,.82)", border: `1px solid ${meta.color}55`, color: meta.color, fontSize: 9.5, fontWeight: 1000 }}>{meta.label}</span>
          </div>
        </div>
      ) : null}

      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: cover ? "minmax(0,1fr)" : "58px minmax(0,1fr)", gap: 11, alignItems: "center" }}>
          {!cover ? <div style={{ width: 58, height: 58, borderRadius: 18, display: "grid", placeItems: "center", fontSize: 27, border: `1px solid ${meta.color}66`, background: `${meta.color}18`, boxShadow: `0 0 20px ${meta.color}22` }}>{meta.icon}</div> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
              {!cover ? <span style={{ borderRadius: 999, padding: "4px 7px", background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 9.5, fontWeight: 1000 }}>{meta.label}</span> : null}
              <span style={{ borderRadius: 999, padding: "4px 7px", background: `${accent}12`, border: `1px solid ${accent}35`, color: accent, fontSize: 9.5, fontWeight: 1000 }}>📍 {place.distanceLabel}</span>
              {full ? <span style={{ borderRadius: 999, padding: "4px 7px", background: "rgba(255,91,110,.12)", border: "1px solid rgba(255,91,110,.35)", color: "#ff9baa", fontSize: 9.5, fontWeight: 1000 }}>COMPLET</span> : null}
            </div>
            <div style={{ marginTop: 6, fontSize: 17, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.title}</div>
            <div style={{ marginTop: 3, fontSize: 11, opacity: .72 }}>{SPORT_LABEL[place.sport] || place.sport}{place.areaLabel ? ` • ${place.areaLabel}` : ""}</div>
            <div style={{ marginTop: 3, fontSize: 10.5, opacity: .62 }}>Par {organizer}</div>
          </div>
        </div>

        {place.description ? <div style={{ marginTop: 11, fontSize: 12, opacity: .8, lineHeight: 1.48 }}>{place.description}</div> : null}

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {capacity != null ? <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", fontSize: 10.5, fontWeight: 900 }}>👥 {accepted}/{capacity}</span> : accepted > 0 ? <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", fontSize: 10.5, fontWeight: 900 }}>👥 {accepted} inscrit(s)</span> : null}
          {skillMin != null || skillMax != null ? <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(255,200,92,.08)", border: "1px solid rgba(255,200,92,.25)", color: "#ffd677", fontSize: 10.5, fontWeight: 900 }}>★ Niveau {skillMin || 1}{skillMax && skillMax !== skillMin ? ` à ${skillMax}` : ""}</span> : null}
          <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 10, opacity: .75 }}>{place.preciseLocation ? "📌 Lieu public précis" : "◌ Zone approximative"}</span>
        </div>

        {place.startsAt ? <div style={{ marginTop: 9, borderRadius: 12, padding: "8px 9px", background: "rgba(255,255,255,.045)", fontSize: 11.5, fontWeight: 900 }}>🗓 {formatDate(place.startsAt)}{place.endsAt ? ` → ${formatDate(place.endsAt)}` : ""}</div> : null}

        {!place.isOwner ? (
          <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: status === "pending" ? "1fr auto" : "1fr", gap: 7 }}>
            <button
              type="button"
              disabled={full || status === "accepted" || status === "pending"}
              onClick={() => onRequest?.(meta.requestType)}
              style={{ ...button, opacity: full || status === "accepted" || status === "pending" ? .62 : 1 }}
            >
              {full ? "Complet" : requestLabel(status) || `${meta.icon} ${meta.action}`}
            </button>
            {status === "pending" && onCancelRequest ? <button type="button" onClick={onCancelRequest} style={{ ...button, borderColor: "rgba(255,255,255,.16)", background: "rgba(255,255,255,.04)", color: "#fff", padding: "0 12px" }}>Annuler</button> : null}
          </div>
        ) : null}

        {place.isOwner && onDelete ? <button type="button" onClick={onDelete} style={{ marginTop: 11, width: "100%", borderRadius: 12, border: "1px solid rgba(255,110,125,.4)", background: "rgba(255,90,110,.1)", color: "#ff9aa8", minHeight: 39, padding: "0 12px", fontWeight: 1000, cursor: "pointer" }}>Supprimer de la carte</button> : null}
      </div>
    </article>
  );
}
