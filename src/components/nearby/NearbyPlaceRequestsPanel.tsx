import React from "react";
import type { NearbyPlaceRequest } from "../../lib/nearbyPlayersApi";

type Props = {
  requests: NearbyPlaceRequest[];
  accent: string;
  onRespond?: (request: NearbyPlaceRequest, status: "accepted" | "rejected") => void;
  onCancel?: (request: NearbyPlaceRequest) => void;
  onOpenMessages?: () => void;
};

const KIND_ICON: Record<string, string> = {
  club: "🏛",
  team: "🛡",
  tournament: "🏆",
  venue: "📌",
};

const ACTION_LABEL: Record<string, string> = {
  join: "Demande d’adhésion",
  participate: "Inscription",
  challenge: "Défi sportif",
  contact: "Prise de contact",
};

function statusLabel(status: NearbyPlaceRequest["status"]) {
  if (status === "accepted") return "ACCEPTÉE";
  if (status === "rejected") return "REFUSÉE";
  if (status === "cancelled") return "ANNULÉE";
  return "EN ATTENTE";
}

function statusColor(status: NearbyPlaceRequest["status"], accent: string) {
  if (status === "accepted") return "#79efa0";
  if (status === "rejected") return "#ff9aab";
  if (status === "cancelled") return "#b1bac7";
  return accent;
}

export default function NearbyPlaceRequestsPanel({ requests, accent, onRespond, onCancel, onOpenMessages }: Props) {
  const incoming = requests.filter((request) => request.direction === "incoming");
  const outgoing = requests.filter((request) => request.direction === "outgoing");
  const pendingIncoming = incoming.filter((request) => request.status === "pending");
  const visibleOutgoing = outgoing.filter((request) => request.status === "pending" || request.status === "accepted");

  if (!pendingIncoming.length && !visibleOutgoing.length) return null;

  const shell: React.CSSProperties = {
    borderRadius: 22,
    border: `1px solid ${accent}55`,
    background: `radial-gradient(120% 150% at 0% 0%, ${accent}1f, rgba(5,10,17,.94) 58%)`,
    padding: 14,
    boxShadow: "0 16px 42px rgba(0,0,0,.25)",
  };
  const button: React.CSSProperties = {
    borderRadius: 11,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.05)",
    color: "#fff",
    minHeight: 38,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 1000,
    cursor: "pointer",
  };

  return (
    <section style={{ display: "grid", gap: 10 }}>
      {pendingIncoming.length ? (
        <div style={{ ...shell, borderColor: `${accent}88` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ fontSize: 22 }}>🔥</div>
            <div>
              <div style={{ color: accent, fontWeight: 1000 }}>DEMANDES LOCALES REÇUES ({pendingIncoming.length})</div>
              <div style={{ marginTop: 2, fontSize: 11, opacity: .68 }}>Inscriptions, adhésions, défis et prises de contact.</div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {pendingIncoming.map((request) => (
              <article key={request.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 9, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", display: "grid", placeItems: "center", background: `${accent}18`, border: `1px solid ${accent}44`, fontSize: 20 }}>
                    {request.userAvatarUrl ? <img src={request.userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{request.userDisplayName || "Joueur"}</div>
                    <div style={{ marginTop: 2, color: accent, fontSize: 11, fontWeight: 900 }}>{KIND_ICON[request.placeKind] || "📍"} {request.placeTitle}</div>
                    <div style={{ marginTop: 2, fontSize: 10.5, opacity: .7 }}>{ACTION_LABEL[request.requestType] || "Demande locale"}{request.partySize > 1 ? ` • ${request.partySize} personnes` : ""}</div>
                  </div>
                </div>
                {request.message ? <div style={{ marginTop: 8, borderRadius: 12, padding: 8, background: "rgba(0,0,0,.18)", fontSize: 11.5, lineHeight: 1.4, opacity: .82 }}>{request.message}</div> : null}
                <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <button type="button" style={{ ...button, borderColor: accent, background: `${accent}18`, color: accent }} onClick={() => onRespond?.(request, "accepted")}>✓ Accepter</button>
                  <button type="button" style={button} onClick={() => onRespond?.(request, "rejected")}>Refuser</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {visibleOutgoing.length ? (
        <div style={shell}>
          <div style={{ fontWeight: 1000 }}>MES DEMANDES LOCALES ({visibleOutgoing.length})</div>
          <div style={{ marginTop: 9, display: "grid", gap: 7 }}>
            {visibleOutgoing.map((request) => {
              const color = statusColor(request.status, accent);
              return (
                <article key={request.id} style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", padding: 10, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <div style={{ width: 39, height: 39, flex: "0 0 auto", borderRadius: 12, display: "grid", placeItems: "center", background: `${color}15`, border: `1px solid ${color}44`, fontSize: 18 }}>{KIND_ICON[request.placeKind] || "📍"}</div>
                  <div style={{ minWidth: 150, flex: 1 }}>
                    <div style={{ fontWeight: 1000 }}>{request.placeTitle}</div>
                    <div style={{ marginTop: 2, fontSize: 10.5, opacity: .68 }}>{ACTION_LABEL[request.requestType] || "Demande locale"} • {request.ownerDisplayName || "Organisateur"}</div>
                  </div>
                  <span style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${color}55`, background: `${color}14`, color, fontSize: 9.5, fontWeight: 1000 }}>{statusLabel(request.status)}</span>
                  {request.status === "pending" ? <button type="button" style={button} onClick={() => onCancel?.(request)}>Annuler</button> : null}
                  {request.status === "accepted" && onOpenMessages ? <button type="button" style={{ ...button, borderColor: color, color }} onClick={onOpenMessages}>💬 Contacter</button> : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
