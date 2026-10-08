import * as React from "react";
import type { OnlineCompetitionInboxItem, OnlineCompetitionDiscoveryItem } from "../hooks/useOnlineCompetitionInbox";

type InboxShape = {
  items: OnlineCompetitionInboxItem[];
  invitations: OnlineCompetitionInboxItem[];
  requests: OnlineCompetitionInboxItem[];
  active: OnlineCompetitionInboxItem[];
  followed: OnlineCompetitionInboxItem[];
  discoverable: OnlineCompetitionDiscoveryItem[];
  alerts: Array<{
    id: string;
    competitionId: string;
    competitionName: string;
    label: string;
    createdAt: number;
  }>;
  loading: boolean;
  error: string;
  lastSyncAt: number;
  refresh: (notify?: boolean) => Promise<any>;
  actionBusy: string;
  actionNotice: string;
  acceptInvitation: (item: OnlineCompetitionInboxItem) => Promise<boolean>;
  declineInvitation: (item: OnlineCompetitionInboxItem) => Promise<boolean>;
  cancelRequest: (item: OnlineCompetitionInboxItem) => Promise<boolean>;
  joinOpenCompetition: (item: OnlineCompetitionDiscoveryItem) => Promise<boolean>;
  requestCompetitionAccess: (item: OnlineCompetitionDiscoveryItem) => Promise<boolean>;
  followCompetition: (item: OnlineCompetitionDiscoveryItem) => Promise<boolean>;
  unfollowCompetition: (item: OnlineCompetitionInboxItem) => Promise<boolean>;
  clearActionNotice: () => void;
  clearAlerts: () => void;
};

type Props = {
  inbox: InboxShape;
  accent?: string;
  isSignedIn: boolean;
  onOpen: (competitionId: string) => void;
  onLogin?: () => void;
};

function hexToRgb(hex: string) {
  const raw = String(hex || "#22E6FF").replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => `${c}${c}`).join("") : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function relationLabel(item: OnlineCompetitionInboxItem) {
  if (item.relation === "owner") return "PROPRIÉTAIRE";
  if (item.relation === "admin") return "ADMIN";
  if (item.relation === "participant") return "PARTICIPANT";
  if (item.relation === "invited") return "INVITATION";
  if (item.relation === "following") return "SUIVI";
  return "DEMANDE";
}

function formatSync(ts: number) {
  if (!ts) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 10) return "à l’instant";
  if (seconds < 60) return `il y a ${seconds}s`;
  return `il y a ${Math.floor(seconds / 60)} min`;
}

function challengeFormatLabel(item: OnlineCompetitionInboxItem) {
  const format = String(item.competition?.challengeCompetition?.format || "").toLowerCase();
  if (format === "objectives") return "CHAMPIONNAT OBJECTIFS";
  if (format === "divisions") return "LIGUES & DIVISIONS";
  if (format === "free") return "COMPÉTITION LIBRE";
  if (format === "duels") return "CONFRONTATIONS";
  return String(item.competition?.game?.mode || "COMPÉTITION").toUpperCase();
}

function competitionFormatLabel(competition: any) {
  const format = String(competition?.challengeCompetition?.format || "").toLowerCase();
  if (format === "objectives") return "CHAMPIONNAT OBJECTIFS";
  if (format === "divisions") return "LIGUES & DIVISIONS";
  if (format === "free") return "COMPÉTITION LIBRE";
  if (format === "duels") return "CONFRONTATIONS";
  return String(competition?.game?.mode || competition?.mode || "COMPÉTITION").toUpperCase();
}

function discoveryPolicyLabel(item: OnlineCompetitionDiscoveryItem) {
  return item.enrollmentPolicy === "open" ? "INSCRIPTION IMMÉDIATE" : "SUR VALIDATION";
}

function statusTone(status: string) {
  const value = String(status || "").toLowerCase();
  if (["approved", "accepted", "running"].includes(value)) return "#65e6a2";
  if (["rejected", "declined", "cancelled", "revoked"].includes(value)) return "#ff7178";
  return "#ffcf73";
}

function requestLabel(item: OnlineCompetitionInboxItem) {
  const status = String(item.request?.status || "pending");
  if (status === "approved") return "DEMANDE ACCEPTÉE";
  if (status === "rejected") return "DEMANDE REFUSÉE";
  if (status === "cancelled") return "DEMANDE ANNULÉE";
  return "DEMANDE EN ATTENTE";
}

function Card({ children, accentRgb }: { children: React.ReactNode; accentRgb: string }) {
  return (
    <div style={{
      borderRadius: 18,
      padding: 12,
      border: `1px solid rgba(${accentRgb},.25)`,
      background: "linear-gradient(180deg, rgba(5,10,18,.98), rgba(2,5,10,.99))",
      boxShadow: "0 14px 30px rgba(0,0,0,.42)",
    }}>
      {children}
    </div>
  );
}

export default function OnlineCompetitionsPanel({ inbox, accent = "#22E6FF", isSignedIn, onOpen, onLogin }: Props) {
  const accentRgb = hexToRgb(accent);
  const [view, setView] = React.useState<"mine" | "discover">("mine");
  const [discoveryQuery, setDiscoveryQuery] = React.useState("");
  const [discoveryFilter, setDiscoveryFilter] = React.useState<"all" | "challenge" | "open" | "approval">("all");

  const filteredDiscoverable = React.useMemo(() => {
    const q = discoveryQuery.trim().toLowerCase();
    return inbox.discoverable.filter((item) => {
      const competition = item.competition || {};
      const mode = String(competition?.game?.mode || competition?.mode || "").toLowerCase();
      if (discoveryFilter === "challenge" && mode !== "challenge") return false;
      if (discoveryFilter === "open" && item.enrollmentPolicy !== "open") return false;
      if (discoveryFilter === "approval" && item.enrollmentPolicy !== "approval") return false;
      if (!q) return true;
      return [item.name, competitionFormatLabel(competition), String(competition?.hostOrganizationName || "")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [inbox.discoverable, discoveryQuery, discoveryFilter]);

  if (!isSignedIn) {
    return (
      <div style={{ marginTop: 10 }}>
        <Card accentRgb={accentRgb}>
          <b style={{ color: accent, fontSize: 14 }}>MES COMPÉTITIONS</b>
          <div style={{ marginTop: 6, fontSize: 12, opacity: .72 }}>
            Connecte ton compte Online pour retrouver tes compétitions, invitations et demandes d’inscription.
          </div>
          {onLogin ? (
            <button type="button" onClick={onLogin} style={{ marginTop: 10, minHeight: 38, borderRadius: 12, border: `1px solid rgba(${accentRgb},.38)`, background: `rgba(${accentRgb},.14)`, color: "#fff", padding: "0 12px", fontWeight: 1000 }}>
              CONNEXION / PROFIL
            </button>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      <Card accentRgb={accentRgb}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <div style={{ color: accent, fontWeight: 1000, fontSize: 15 }}>COMPÉTITIONS ONLINE</div>
            <div style={{ marginTop: 4, fontSize: 11, opacity: .68 }}>{view === "mine" ? "Mes compétitions, invitations et progression." : "Découvre les compétitions publiques ouvertes aux inscriptions."}</div>
          </div>
          <button
            type="button"
            onClick={() => void inbox.refresh(false)}
            disabled={inbox.loading}
            style={{ minWidth: 86, minHeight: 34, borderRadius: 11, border: `1px solid rgba(${accentRgb},.30)`, background: `rgba(${accentRgb},.10)`, color: "#fff", fontSize: 9, fontWeight: 1000 }}
          >
            {inbox.loading ? "SYNC…" : "↻ ACTUALISER"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10, padding: 4, borderRadius: 12, background: "#060b12", border: "1px solid rgba(255,255,255,.07)" }}>
          <button type="button" onClick={() => setView("mine")} style={{ minHeight: 34, borderRadius: 9, border: view === "mine" ? `1px solid rgba(${accentRgb},.34)` : "1px solid transparent", background: view === "mine" ? `rgba(${accentRgb},.12)` : "transparent", color: view === "mine" ? "#fff" : "#8391a1", fontSize: 8.5, fontWeight: 1000 }}>MES COMPÉTITIONS</button>
          <button type="button" onClick={() => setView("discover")} style={{ minHeight: 34, borderRadius: 9, border: view === "discover" ? "1px solid rgba(255,207,115,.34)" : "1px solid transparent", background: view === "discover" ? "rgba(95,61,7,.24)" : "transparent", color: view === "discover" ? "#ffcf73" : "#8391a1", fontSize: 8.5, fontWeight: 1000 }}>DÉCOUVRIR <span style={{ opacity: .65 }}>({inbox.discoverable.length})</span></button>
        </div>

        {view === "mine" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
          {[
            ["ACTIVES", inbox.active.length, "#65e6a2"],
            ["SUIVIES", inbox.followed.length, "#4fb4ff"],
            ["INVITATIONS", inbox.invitations.length, "#ffcf73"],
            ["DEMANDES", inbox.requests.filter((item) => String(item.request?.status || "") === "pending").length, accent],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ borderRadius: 12, padding: "8px 9px", border: "1px solid rgba(255,255,255,.08)", background: "#070c13" }}>
              <span style={{ display: "block", fontSize: 8, opacity: .58, fontWeight: 1000 }}>{label}</span>
              <b style={{ display: "block", marginTop: 3, fontSize: 19, color: String(color) }}>{String(value)}</b>
            </div>
          ))}
        </div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
          <div style={{ borderRadius: 12, padding: "8px 9px", border: "1px solid rgba(255,207,115,.12)", background: "#070c13" }}><span style={{ display: "block", fontSize: 8, opacity: .58, fontWeight: 1000 }}>DISPONIBLES</span><b style={{ display: "block", marginTop: 3, fontSize: 19, color: "#ffcf73" }}>{inbox.discoverable.length}</b></div>
          <div style={{ borderRadius: 12, padding: "8px 9px", border: "1px solid rgba(101,230,162,.12)", background: "#070c13" }}><span style={{ display: "block", fontSize: 8, opacity: .58, fontWeight: 1000 }}>OUVERTES</span><b style={{ display: "block", marginTop: 3, fontSize: 19, color: "#65e6a2" }}>{inbox.discoverable.filter((item) => item.enrollmentPolicy === "open" && !item.competitionIsFull).length}</b></div>
        </div>}

        <div style={{ marginTop: 8, fontSize: 9, opacity: .55 }}>
          Dernière synchro : {formatSync(inbox.lastSyncAt)} · actualisation automatique toutes les ~20 s.
        </div>
        {inbox.error ? <div style={{ marginTop: 7, color: "#ff9aa1", fontSize: 10 }}>{inbox.error}</div> : null}
        {inbox.actionNotice ? (
          <button type="button" onClick={inbox.clearActionNotice} style={{ width: "100%", marginTop: 8, textAlign: "left", borderRadius: 10, padding: "7px 9px", border: "1px solid rgba(101,230,162,.20)", background: "rgba(20,70,48,.28)", color: "#d9ffea", fontSize: 9, fontWeight: 800 }}>
            {inbox.actionNotice} <span style={{ opacity: .55 }}>· fermer</span>
          </button>
        ) : null}
      </Card>

      {view === "discover" ? (
        <Card accentRgb={accentRgb}>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={discoveryQuery}
              onChange={(event) => setDiscoveryQuery(event.target.value)}
              placeholder="Rechercher une compétition…"
              style={{ minHeight: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", background: "#070c13", color: "#fff", padding: "0 11px", fontSize: 10, fontWeight: 800 }}
            />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[
                ["all", "TOUTES"],
                ["challenge", "CHALLENGE"],
                ["open", "OUVERTES"],
                ["approval", "VALIDATION"],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setDiscoveryFilter(key as typeof discoveryFilter)} style={{ minHeight: 29, borderRadius: 999, border: discoveryFilter === key ? "1px solid rgba(255,207,115,.34)" : "1px solid rgba(255,255,255,.08)", background: discoveryFilter === key ? "rgba(95,61,7,.24)" : "#080d14", color: discoveryFilter === key ? "#ffcf73" : "#95a2b1", padding: "0 9px", fontSize: 7.5, fontWeight: 1000 }}>{label}</button>
              ))}
            </div>
          </div>

          {filteredDiscoverable.length ? (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {filteredDiscoverable.map((item) => {
                const busy = inbox.actionBusy === item.id;
                const competition = item.competition || {};
                const host = String(competition?.hostOrganizationName || "").trim();
                const participantText = item.maxParticipants ? `${item.participantsCount}/${item.maxParticipants}` : String(item.participantsCount);
                return (
                  <div key={`discover-${item.id}`} style={{ padding: 11, borderRadius: 14, border: `1px solid ${item.competitionIsFull ? "rgba(255,113,120,.16)" : "rgba(255,207,115,.16)"}`, background: "linear-gradient(180deg,#09111a,#05090f)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ display: "block", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</b>
                        <span style={{ display: "block", marginTop: 3, color: accent, fontSize: 8, fontWeight: 1000 }}>{competitionFormatLabel(competition)}</span>
                        {host ? <span style={{ display: "block", marginTop: 2, fontSize: 7.5, opacity: .58 }}>{host}</span> : null}
                      </div>
                      <span style={{ flex: "0 0 auto", padding: "4px 7px", borderRadius: 999, border: `1px solid ${item.enrollmentPolicy === "open" ? "rgba(101,230,162,.25)" : "rgba(255,207,115,.25)"}`, color: item.enrollmentPolicy === "open" ? "#65e6a2" : "#ffcf73", fontSize: 7, fontWeight: 1000 }}>{discoveryPolicyLabel(item)}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
                      <span style={{ padding: "6px 7px", borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", fontSize: 7.2, opacity: .75 }}>JOUEURS<b style={{ display: "block", marginTop: 2, color: "#fff", fontSize: 9.5 }}>{participantText}</b></span>
                      <span style={{ padding: "6px 7px", borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", fontSize: 7.2, opacity: .75 }}>CYCLE<b style={{ display: "block", marginTop: 2, color: "#fff", fontSize: 9.5 }}>{item.currentCycle}</b></span>
                      <span style={{ padding: "6px 7px", borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", fontSize: 7.2, opacity: .75 }}>OUVERTS<b style={{ display: "block", marginTop: 2, color: "#fff", fontSize: 9.5 }}>{item.openObjectives.length}</b></span>
                    </div>
                    {item.openObjectives.length ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>{item.openObjectives.slice(0, 6).map((objective) => <span key={`${item.id}-${objective}`} style={{ padding: "3px 6px", borderRadius: 999, border: "1px solid rgba(101,230,162,.14)", color: "#b9f9d5", fontSize: 7, fontWeight: 900 }}>{objectiveLabel(objective)}</span>)}</div> : null}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,.8fr) minmax(0,.9fr) minmax(0,1.25fr)", gap: 6, marginTop: 9 }}>
                      <button type="button" disabled={busy} onClick={() => onOpen(item.id)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid rgba(${accentRgb},.24)`, background: `rgba(${accentRgb},.08)`, color: "#fff", fontSize: 7.6, fontWeight: 1000 }}>VOIR</button>
                      <button type="button" disabled={busy} onClick={() => void inbox.followCompetition(item)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(79,180,255,.26)", background: "rgba(8,35,58,.62)", color: "#9fd8ff", fontSize: 7.6, fontWeight: 1000, opacity: busy ? .55 : 1 }}>SUIVRE</button>
                      <button type="button" disabled={busy || item.competitionIsFull} onClick={() => void (item.enrollmentPolicy === "open" ? inbox.joinOpenCompetition(item) : inbox.requestCompetitionAccess(item))} style={{ minHeight: 34, borderRadius: 10, border: item.competitionIsFull ? "1px solid rgba(255,255,255,.07)" : item.enrollmentPolicy === "open" ? "1px solid rgba(101,230,162,.30)" : "1px solid rgba(255,207,115,.30)", background: item.competitionIsFull ? "#070b11" : item.enrollmentPolicy === "open" ? "rgba(15,68,46,.72)" : "rgba(78,52,7,.52)", color: item.competitionIsFull ? "#6f7985" : "#fff", fontSize: 7.6, fontWeight: 1000, opacity: busy ? .55 : 1 }}>{busy ? "…" : item.competitionIsFull ? "COMPLÈTE" : item.enrollmentPolicy === "open" ? "REJOINDRE" : "DEMANDER"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ marginTop: 10, padding: 16, textAlign: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "#070c13", fontSize: 9.5, opacity: .64 }}>Aucune compétition publique ne correspond à ces filtres.</div>
          )}
        </Card>
      ) : <>

      {inbox.alerts.length ? (
        <Card accentRgb={accentRgb}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b style={{ color: "#ffcf73", fontSize: 12 }}>ACTUALITÉS COMPÉTITIONS</b>
            <button type="button" onClick={inbox.clearAlerts} style={{ border: 0, background: "transparent", color: "#9aa8b8", fontSize: 9, fontWeight: 1000 }}>EFFACER</button>
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {inbox.alerts.slice(0, 5).map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => onOpen(alert.competitionId)}
                style={{ textAlign: "left", borderRadius: 12, padding: "9px 10px", border: "1px solid rgba(255,207,115,.18)", background: "rgba(64,43,7,.34)", color: "#fff" }}
              >
                <b style={{ display: "block", fontSize: 10 }}>{alert.competitionName}</b>
                <span style={{ display: "block", marginTop: 2, fontSize: 9, color: "#ffcf73" }}>{alert.label}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {inbox.invitations.length ? (
        <Card accentRgb={accentRgb}>
          <b style={{ color: "#ffcf73", fontSize: 12 }}>INVITATIONS REÇUES</b>
          <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
            {inbox.invitations.map((item) => {
              const busy = inbox.actionBusy === item.id;
              return (
                <div key={`invite-${item.id}`} style={{ display: "grid", gap: 9, padding: 10, borderRadius: 13, border: "1px solid rgba(255,207,115,.18)", background: "#080d14" }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 8.5, color: "#ffcf73" }}>INVITATION EN ATTENTE · {challengeFormatLabel(item)}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                    <button type="button" disabled={busy} onClick={() => void inbox.acceptInvitation(item)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(101,230,162,.34)", background: "rgba(15,68,46,.78)", color: "#fff", fontSize: 8.2, fontWeight: 1000, opacity: busy ? .55 : 1 }}>{busy ? "…" : "ACCEPTER"}</button>
                    <button type="button" disabled={busy} onClick={() => void inbox.declineInvitation(item)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,113,120,.28)", background: "rgba(70,18,23,.64)", color: "#ffb0b5", fontSize: 8.2, fontWeight: 1000, opacity: busy ? .55 : 1 }}>REFUSER</button>
                    <button type="button" disabled={busy} onClick={() => onOpen(item.id)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,207,115,.28)", background: "rgba(78,52,7,.48)", color: "#fff", fontSize: 8.2, fontWeight: 1000, padding: "0 10px", opacity: busy ? .55 : 1 }}>VOIR</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {inbox.requests.length ? (
        <Card accentRgb={accentRgb}>
          <b style={{ color: accent, fontSize: 12 }}>MES DEMANDES D’INSCRIPTION</b>
          <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
            {inbox.requests.map((item) => {
              const status = String(item.request?.status || "pending");
              const tone = statusTone(status);
              const busy = inbox.actionBusy === item.id;
              return (
                <div key={`request-${item.id}`} style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "#080d14", color: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 }}>{item.name}</b>
                    <span style={{ color: tone, fontSize: 8, fontWeight: 1000 }}>{requestLabel(item)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 7 }}>
                    {status === "pending" ? <button type="button" disabled={busy} onClick={() => void inbox.cancelRequest(item)} style={{ minHeight: 30, borderRadius: 9, border: "1px solid rgba(255,113,120,.24)", background: "rgba(65,18,22,.55)", color: "#ffb0b5", padding: "0 9px", fontSize: 7.8, fontWeight: 1000, opacity: busy ? .55 : 1 }}>{busy ? "…" : "ANNULER"}</button> : null}
                    <button type="button" disabled={busy} onClick={() => onOpen(item.id)} style={{ minHeight: 30, borderRadius: 9, border: `1px solid rgba(${accentRgb},.24)`, background: `rgba(${accentRgb},.08)`, color: "#fff", padding: "0 9px", fontSize: 7.8, fontWeight: 1000, opacity: busy ? .55 : 1 }}>OUVRIR</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {inbox.followed.length ? (
        <Card accentRgb={accentRgb}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <b style={{ color: "#4fb4ff", fontSize: 12 }}>COMPÉTITIONS SUIVIES</b>
              <span style={{ display: "block", marginTop: 2, fontSize: 8, opacity: .58 }}>Suivi spectateur · résultats et nouvelles journées sans inscription.</span>
            </div>
            <span style={{ fontSize: 9, opacity: .55 }}>{inbox.followed.length}</span>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {inbox.followed.map((item) => {
              const busy = inbox.actionBusy === item.id;
              return (
                <div key={`follow-${item.id}`} style={{ padding: 10, borderRadius: 13, border: "1px solid rgba(79,180,255,.16)", background: "linear-gradient(180deg,#08111a,#05090f)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 10.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</b>
                      <span style={{ display: "block", marginTop: 3, color: "#4fb4ff", fontSize: 8, fontWeight: 1000 }}>SUIVI · {challengeFormatLabel(item)}</span>
                    </div>
                    <span style={{ borderRadius: 999, padding: "4px 7px", border: "1px solid rgba(79,180,255,.20)", color: "#9fd8ff", fontSize: 7, fontWeight: 1000 }}>CYCLE {item.currentCycle}</span>
                  </div>
                  {item.openObjectives.length ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>{item.openObjectives.slice(0, 6).map((objective) => <span key={`follow-${item.id}-${objective}`} style={{ padding: "3px 6px", borderRadius: 999, border: "1px solid rgba(101,230,162,.14)", color: "#b9f9d5", fontSize: 7, fontWeight: 900 }}>{objectiveLabel(objective)}</span>)}</div> : null}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    <button type="button" disabled={busy} onClick={() => onOpen(item.id)} style={{ minHeight: 32, borderRadius: 9, border: "1px solid rgba(79,180,255,.28)", background: "rgba(8,35,58,.76)", color: "#fff", fontSize: 7.8, fontWeight: 1000 }}>OUVRIR</button>
                    <button type="button" disabled={busy} onClick={() => void inbox.unfollowCompetition(item)} style={{ minHeight: 32, borderRadius: 9, border: "1px solid rgba(255,113,120,.20)", background: "rgba(60,18,22,.42)", color: "#ffb0b5", fontSize: 7.8, fontWeight: 1000, opacity: busy ? .55 : 1 }}>{busy ? "…" : "NE PLUS SUIVRE"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card accentRgb={accentRgb}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <b style={{ color: "#65e6a2", fontSize: 12 }}>MES COMPÉTITIONS ACTIVES</b>
          <span style={{ fontSize: 9, opacity: .55 }}>{inbox.active.length}</span>
        </div>
        {inbox.active.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {inbox.active.map((item) => (
              <button
                key={`active-${item.id}`}
                type="button"
                onClick={() => onOpen(item.id)}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  padding: 11,
                  color: "#fff",
                  border: `1px solid rgba(${accentRgb},.18)`,
                  background: "linear-gradient(180deg,#09111a,#05090f)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</b>
                    <span style={{ display: "block", marginTop: 3, fontSize: 8.2, color: accent, fontWeight: 1000 }}>{relationLabel(item)} · {challengeFormatLabel(item)}</span>
                  </div>
                  <span style={{ borderRadius: 999, padding: "4px 7px", border: "1px solid rgba(101,230,162,.24)", color: "#65e6a2", fontSize: 7.5, fontWeight: 1000 }}>
                    CYCLE {item.currentCycle}
                  </span>
                </div>
                {item.playerProgress ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
                    <span style={{ borderRadius: 9, padding: "6px 7px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", fontSize: 7.4, opacity: .78 }}>OBJECTIFS <b style={{ display: "block", marginTop: 2, fontSize: 10, color: "#fff" }}>{item.playerProgress.playedObjectives}/{item.playerProgress.totalObjectives}</b></span>
                    <span style={{ borderRadius: 9, padding: "6px 7px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", fontSize: 7.4, opacity: .78 }}>ESSAIS <b style={{ display: "block", marginTop: 2, fontSize: 10, color: "#fff" }}>{item.playerProgress.attemptsUsed}/{item.playerProgress.attemptsMax}</b></span>
                    <span style={{ borderRadius: 9, padding: "6px 7px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", fontSize: 7.4, opacity: .78 }}>DIVISION <b style={{ display: "block", marginTop: 2, fontSize: 10, color: "#fff" }}>{item.playerProgress.division ? `D${item.playerProgress.division}` : "—"}</b></span>
                  </div>
                ) : null}
                {item.playerProgress?.nextObjective ? <div style={{ marginTop: 7, padding: "6px 8px", borderRadius: 9, border: "1px solid rgba(101,230,162,.16)", background: "rgba(15,68,46,.20)", color: "#b9f9d5", fontSize: 8, fontWeight: 900 }}>▶ À JOUER · {objectiveLabel(item.playerProgress.nextObjective)}</div> : null}
                {item.openObjectives.length ? (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {item.openObjectives.slice(0, 8).map((objective) => (
                      <span key={objective} style={{ padding: "3px 6px", borderRadius: 999, background: "rgba(101,230,162,.07)", border: "1px solid rgba(101,230,162,.16)", color: "#b9f9d5", fontSize: 7.5, fontWeight: 900 }}>
                        {objectiveLabel(objective)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 7, fontSize: 8.5, opacity: .56 }}>Aucune nouvelle journée ouverte pour le moment.</div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 10, opacity: .62 }}>Tu n’es inscrit à aucune compétition Online pour le moment.</div>
        )}
      </Card>
      </>}
    </div>
  );
}
