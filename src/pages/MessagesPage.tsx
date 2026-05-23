import React from "react";
import {
  acceptSharedMatch,
  importSharedMatch,
  listFriendRequests,
  listFriends,
  listPrivateMessages,
  listProfileFriendLinks,
  listSharedMatches,
  refuseSharedMatch,
  respondFriendRequest,
  respondProfileFriendLink,
  sendPrivateMessage,
  type FriendRequest,
  type PrivateMessageItem,
  type OnlineFriendUser,
  type ProfileFriendLink,
  type SharedMatchItem,
} from "../lib/friendsApi";

type MsgTab = "messages" | "requests" | "shares" | "links" | "invites" | "system";

type Props = {
  store?: any;
  update?: (mut: (s: any) => any) => void;
  go?: (tab: any, params?: any) => void;
  params?: any;
};

const CARD_BG = "linear-gradient(180deg, rgba(18,18,26,.96), rgba(8,8,13,.98))";
const GOLD = "#ffd56a";
const BLUE = "#79c8ff";
const GREEN = "#7dffb2";
const RED = "#ff7b7b";
const STROKE = "rgba(255,255,255,.13)";

function asUserName(user?: OnlineFriendUser | null): string {
  return String(user?.displayName || user?.nickname || user?.id || user?.userId || "Ami").trim();
}

function asDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status?: string) {
  const s = String(status || "pending").toLowerCase();
  if (s === "accepted") return "Accepté";
  if (s === "refused" || s === "rejected") return "Refusé";
  if (s === "imported") return "Importé";
  if (s === "cancelled") return "Annulé";
  return "En attente";
}

function statusColor(status?: string) {
  const s = String(status || "pending").toLowerCase();
  if (s === "accepted" || s === "imported") return GREEN;
  if (s === "refused" || s === "rejected" || s === "cancelled") return RED;
  return GOLD;
}

function titleOfSharedMatch(item: SharedMatchItem) {
  return String(
    item.title ||
      item.payload?.summary?.title ||
      item.payload?.kind ||
      item.sport ||
      "Partie partagée"
  );
}

function playersLine(payload: any): string {
  const arr =
    (Array.isArray(payload?.summary?.players) && payload.summary.players) ||
    (Array.isArray(payload?.payload?.players) && payload.payload.players) ||
    (Array.isArray(payload?.players) && payload.players) ||
    [];
  const names = arr
    .map((p: any) => String(p?.name || p?.displayName || p?.nickname || p || "").trim())
    .filter(Boolean);
  return names.length ? names.join(" • ") : "Joueurs non détaillés";
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    border: `1px solid ${STROKE}`,
    borderRadius: 22,
    padding: 14,
    background: CARD_BG,
    boxShadow: "0 18px 42px rgba(0,0,0,.34)",
    ...extra,
  };
}

function Pill({ children, tone = GOLD }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${tone}77`,
        color: tone,
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 900,
        background: `${tone}14`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({ label, onClick, tone = GOLD, disabled = false }: { label: string; onClick?: () => void; tone?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${tone}88`,
        background: disabled ? "rgba(255,255,255,.04)" : `linear-gradient(180deg, ${tone}24, rgba(0,0,0,.20))`,
        color: disabled ? "rgba(255,255,255,.38)" : "#fff",
        borderRadius: 14,
        padding: "9px 11px",
        fontWeight: 950,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 0 16px ${tone}22`,
      }}
    >
      {label}
    </button>
  );
}

function EmptyCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={cardStyle({ textAlign: "center", padding: 22, opacity: 0.82 })}>
      <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 1000, color: "#fff", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.35 }}>{text}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, margin: "12px 0 10px" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#fff" }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: "rgba(255,255,255,.58)", marginTop: 2 }}>{subtitle}</div> : null}
      </div>
      {typeof badge === "number" ? <Pill tone={badge > 0 ? GOLD : "rgba(255,255,255,.45)"}>{badge}</Pill> : null}
    </div>
  );
}

export default function MessagesPage({ store, update, go }: Props) {
  const [active, setActive] = React.useState<MsgTab>("requests");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [friends, setFriends] = React.useState<OnlineFriendUser[]>([]);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [sharedMatches, setSharedMatches] = React.useState<SharedMatchItem[]>([]);
  const [profileLinks, setProfileLinks] = React.useState<ProfileFriendLink[]>([]);
  const [privateMessages, setPrivateMessages] = React.useState<PrivateMessageItem[]>([]);
  const [messageToUserId, setMessageToUserId] = React.useState("");
  const [messageText, setMessageText] = React.useState("");

  const salonInvites = React.useMemo(() => {
    const raw = Array.isArray(store?.onlineInvites) ? store.onlineInvites : [];
    return raw;
  }, [store?.onlineInvites]);

  const systemNotifications = React.useMemo(() => {
    const raw = Array.isArray(store?.notifications) ? store.notifications : [];
    return raw;
  }, [store?.notifications]);

  const incomingFriendRequests = friendRequests.filter((r) => r.direction !== "outgoing" && String(r.status || "pending") === "pending");
  const outgoingFriendRequests = friendRequests.filter((r) => r.direction === "outgoing" && String(r.status || "pending") === "pending");
  const incomingShares = sharedMatches.filter((s) => s.direction !== "outgoing");
  const incomingProfileLinks = profileLinks.filter((l) => l.direction !== "outgoing");
  const outgoingProfileLinks = profileLinks.filter((l) => l.direction === "outgoing");

  const counters = {
    messages: privateMessages.length,
    requests: incomingFriendRequests.length + outgoingFriendRequests.length,
    shares: incomingShares.filter((s) => String(s.status || "pending") === "pending").length,
    links: profileLinks.filter((l) => String(l.status || "pending") === "pending").length,
    invites: salonInvites.length,
    system: systemNotifications.length,
  };

  const totalPending = counters.requests + counters.shares + counters.links + counters.invites + counters.system;

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextFriends, nextRequests, nextShares, nextLinks, nextMessages] = await Promise.all([
        listFriends().catch(() => []),
        listFriendRequests().catch(() => []),
        listSharedMatches().catch(() => []),
        listProfileFriendLinks().catch(() => []),
        listPrivateMessages().catch(() => []),
      ]);
      setFriends(Array.isArray(nextFriends) ? nextFriends : []);
      setFriendRequests(Array.isArray(nextRequests) ? nextRequests : []);
      setSharedMatches(Array.isArray(nextShares) ? nextShares : []);
      setProfileLinks(Array.isArray(nextLinks) ? nextLinks : []);
      setPrivateMessages(Array.isArray(nextMessages) ? nextMessages : []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  async function runAction(label: string, fn: () => Promise<any>) {
    setError(null);
    setInfo(null);
    try {
      await fn();
      setInfo(label);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function handleSendPrivateMessage() {
    const toUserId = String(messageToUserId || "").trim();
    const text = String(messageText || "").trim();
    if (!toUserId) {
      setError("Choisis un ami destinataire.");
      return;
    }
    if (!text) {
      setError("Écris un message avant d’envoyer.");
      return;
    }
    await runAction("Message envoyé ✅", async () => {
      await sendPrivateMessage(toUserId, text);
      setMessageText("");
    });
  }

  function openOnline() {
    if (typeof go === "function") go("online", { initialOnlineTab: "requests" });
  }

  const tabs: Array<{ id: MsgTab; label: string; icon: string; badge: number }> = [
    { id: "messages", label: "Messages", icon: "💬", badge: counters.messages },
    { id: "links", label: "Profils liés", icon: "🔗", badge: counters.links },
    { id: "shares", label: "Parties", icon: "🏆", badge: counters.shares },
    { id: "requests", label: "Amis", icon: "👥", badge: counters.requests },
    { id: "invites", label: "Salons", icon: "🎮", badge: counters.invites },
    { id: "system", label: "Système", icon: "📣", badge: counters.system },
  ];

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 104, color: "#f5f5f7" }}>
      <div
        style={{
          ...cardStyle({
            padding: 16,
            marginBottom: 12,
            background:
              "radial-gradient(900px 220px at 0% 0%, rgba(255,213,106,.18), transparent 55%), radial-gradient(820px 220px at 100% 0%, rgba(90,180,255,.16), transparent 55%), linear-gradient(180deg, rgba(22,22,30,.96), rgba(8,8,13,.98))",
          }),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 1000, color: GOLD, lineHeight: 1, textShadow: "0 0 18px rgba(255,213,106,.24)" }}>
              MESSAGERIE
            </div>
            <div style={{ marginTop: 7, fontSize: 12.5, color: "rgba(255,255,255,.68)", lineHeight: 1.35 }}>
              Centre unique pour les messages, demandes, partages, invitations online et notifications système.
            </div>
          </div>
          <Pill tone={totalPending > 0 ? GOLD : GREEN}>{totalPending} à traiter</Pill>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 14, paddingBottom: 2, scrollbarWidth: "none" as any }}>
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  flex: "0 0 auto",
                  border: `1px solid ${isActive ? GOLD : STROKE}`,
                  borderRadius: 16,
                  padding: "9px 11px",
                  color: isActive ? "#111" : "#fff",
                  background: isActive ? GOLD : "rgba(255,255,255,.045)",
                  fontWeight: 1000,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  boxShadow: isActive ? "0 0 18px rgba(255,213,106,.22)" : "none",
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge > 0 ? (
                  <span style={{ minWidth: 19, height: 19, borderRadius: 999, background: isActive ? "#111" : GOLD, color: isActive ? GOLD : "#111", display: "grid", placeItems: "center", fontSize: 11 }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <div style={cardStyle({ marginBottom: 10 })}>Chargement de la messagerie…</div> : null}
      {error ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(255,100,100,.45)", color: RED })}>Erreur : {error}</div> : null}
      {info ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(125,255,178,.35)", color: GREEN })}>{info}</div> : null}

      {active === "messages" ? (
        <>
          <SectionTitle title="Messages privés entre amis" subtitle="Envoi direct NAS entre comptes amis." badge={privateMessages.length} />
          <div style={cardStyle({ marginBottom: 10, borderColor: `${BLUE}55` })}>
            <div style={{ fontWeight: 1000, marginBottom: 8, color: BLUE }}>Nouveau message</div>
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={messageToUserId}
                onChange={(e) => setMessageToUserId((e.target as HTMLSelectElement).value)}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "10px 11px",
                  border: `1px solid ${STROKE}`,
                  background: "rgba(0,0,0,.35)",
                  color: "#fff",
                  fontWeight: 800,
                  outline: "none",
                }}
              >
                <option value="">— Choisir un ami —</option>
                {friends.map((f) => {
                  const id = String(f.userId || f.id || "");
                  return <option key={id} value={id}>{asUserName(f)}</option>;
                })}
              </select>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText((e.target as HTMLTextAreaElement).value)}
                placeholder="Écris ton message…"
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: "10px 11px",
                  border: `1px solid ${STROKE}`,
                  background: "rgba(0,0,0,.35)",
                  color: "#fff",
                  fontWeight: 700,
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ActionButton label="Envoyer" tone={GREEN} onClick={handleSendPrivateMessage} />
              </div>
            </div>
          </div>

          {privateMessages.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {privateMessages.map((m: any, idx: number) => {
                const incoming = m.direction !== "outgoing";
                const user = incoming ? m.fromUser : m.toUser;
                return (
                  <div key={m?.id || idx} style={cardStyle({ borderColor: incoming && !m.readAt ? `${GREEN}66` : STROKE })}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 1000 }}>{incoming ? `De ${asUserName(user)}` : `À ${asUserName(user)}`}</div>
                      <Pill tone={incoming && !m.readAt ? GREEN : BLUE}>{asDate(m?.createdAt)}</Pill>
                    </div>
                    <div style={{ marginTop: 7, color: "rgba(255,255,255,.78)", fontSize: 13, whiteSpace: "pre-wrap" }}>{m?.text || "—"}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyCard icon="💬" title="Aucun message privé" text="Envoie un premier message à un ami depuis cette page." />
          )}
        </>
      ) : null}

            {active === "links" ? (
        <>
          <SectionTitle title="Demandes d’association profil local ↔ compte ami" subtitle="Le lien ne devient valide pour les stats qu’après acceptation par le compte ami." badge={counters.links} />
          {incomingProfileLinks.length || outgoingProfileLinks.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {[...incomingProfileLinks, ...outgoingProfileLinks].map((link) => {
                const incoming = link.direction !== "outgoing";
                const user = incoming ? link.requesterUser : link.targetUser;
                const tone = statusColor(link.status);
                return (
                  <div key={link.id} style={cardStyle({ borderColor: `${tone}55` })}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 1000, fontSize: 15 }}>{incoming ? `${asUserName(user)} veut associer un profil` : `Demande envoyée à ${asUserName(user)}`}</div>
                        <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12, marginTop: 4 }}>
                          Profil local : <b style={{ color: "#fff" }}>{link.localProfileName || link.localProfileId}</b>
                        </div>
                      </div>
                      <Pill tone={tone}>{statusLabel(link.status)}</Pill>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill tone={link.statsShared ? GREEN : GOLD}>Stats partagées : {link.statsShared ? "OUI" : "NON"}</Pill>
                      <Pill tone={BLUE}>Créé : {asDate(link.createdAt)}</Pill>
                    </div>
                    {incoming && String(link.status || "pending") === "pending" ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <ActionButton label="Accepter" tone={GREEN} onClick={() => runAction("Association acceptée ✅", () => respondProfileFriendLink(link.id, "accepted"))} />
                        <ActionButton label="Refuser" tone={RED} onClick={() => runAction("Association refusée", () => respondProfileFriendLink(link.id, "refused"))} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyCard icon="🔗" title="Aucune demande d’association" text="Quand un profil local sera lié à un compte ami, la demande apparaîtra ici avec Accepter / Refuser." />
          )}
        </>
      ) : null}

      {active === "shares" ? (
        <>
          <SectionTitle title="Parties partagées reçues" subtitle="Les matchs reçus peuvent être acceptés, importés ou refusés." badge={incomingShares.length} />
          {incomingShares.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {incomingShares.map((item) => {
                const tone = statusColor(item.status);
                const pending = String(item.status || "pending") === "pending";
                return (
                  <div key={item.id} style={cardStyle({ borderColor: `${tone}55` })}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 15 }}>{titleOfSharedMatch(item)}</div>
                        <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12, marginTop: 4 }}>De : <b style={{ color: "#fff" }}>{asUserName(item.ownerUser)}</b></div>
                        <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12, marginTop: 4 }}>{playersLine(item.payload)}</div>
                      </div>
                      <Pill tone={tone}>{statusLabel(item.status)}</Pill>
                    </div>
                    {item.message ? <div style={{ marginTop: 9, color: "rgba(255,255,255,.78)", fontSize: 13 }}>“{item.message}”</div> : null}
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <ActionButton label="Accepter" tone={GREEN} disabled={!pending} onClick={() => runAction("Partie acceptée ✅", () => acceptSharedMatch(item.id))} />
                      <ActionButton label="Importer" tone={GOLD} disabled={String(item.status || "") === "imported"} onClick={() => runAction("Partie marquée importée ✅", () => importSharedMatch(item.id))} />
                      <ActionButton label="Refuser" tone={RED} disabled={!pending} onClick={() => runAction("Partie refusée", () => refuseSharedMatch(item.id))} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyCard icon="🏆" title="Aucune partie reçue" text="Les parties envoyées directement par tes amis apparaîtront ici." />
          )}
        </>
      ) : null}

      {active === "requests" ? (
        <>
          <SectionTitle title="Demandes d’amis" subtitle="Demandes reçues et envoyées depuis le compte NAS." badge={counters.requests} />
          {incomingFriendRequests.length || outgoingFriendRequests.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {[...incomingFriendRequests, ...outgoingFriendRequests].map((req) => {
                const incoming = req.direction !== "outgoing";
                const user = incoming ? req.fromUser : req.toUser;
                return (
                  <div key={req.id} style={cardStyle({ borderColor: `${GOLD}55` })}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 1000 }}>{incoming ? `${asUserName(user)} veut devenir ami` : `Demande envoyée à ${asUserName(user)}`}</div>
                        {req.message ? <div style={{ marginTop: 5, color: "rgba(255,255,255,.70)", fontSize: 12 }}>“{req.message}”</div> : null}
                      </div>
                      <Pill tone={GOLD}>En attente</Pill>
                    </div>
                    {incoming ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <ActionButton label="Accepter" tone={GREEN} onClick={() => runAction("Demande d’ami acceptée ✅", () => respondFriendRequest(req.id, "accepted"))} />
                        <ActionButton label="Refuser" tone={RED} onClick={() => runAction("Demande d’ami refusée", () => respondFriendRequest(req.id, "rejected"))} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyCard icon="👥" title="Aucune demande d’ami" text={`Tu as ${friends.length} ami${friends.length > 1 ? "s" : ""}. Les nouvelles demandes apparaîtront ici.`} />
          )}
        </>
      ) : null}

      {active === "invites" ? (
        <>
          <SectionTitle title="Invitations de salon online" subtitle="Les invitations de match seront centralisées ici." badge={salonInvites.length} />
          {salonInvites.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {salonInvites.map((inv: any, idx: number) => (
                <div key={inv?.id || idx} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>{inv?.title || `Salon ${inv?.code || "online"}`}</div>
                    <Pill tone={BLUE}>{inv?.mode || "Online"}</Pill>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionButton label="Rejoindre" tone={GREEN} onClick={() => go?.("online", { lobbyCode: inv?.code })} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard icon="🎮" title="Aucune invitation de salon" text="Les invitations online reçues apparaîtront ici avec un bouton Rejoindre." />
          )}
        </>
      ) : null}

      {active === "system" ? (
        <>
          <SectionTitle title="Notifications système" subtitle="Synchronisation, compte, NAS, sécurité et informations importantes." badge={systemNotifications.length} />
          {systemNotifications.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {systemNotifications.map((n: any, idx: number) => (
                <div key={n?.id || idx} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>{n?.title || "Notification"}</div>
                    <Pill tone={BLUE}>{asDate(n?.createdAt)}</Pill>
                  </div>
                  <div style={{ marginTop: 7, color: "rgba(255,255,255,.70)", fontSize: 13 }}>{n?.text || n?.message || "—"}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard icon="📣" title="Aucune notification système" text="Les alertes NAS, synchronisation, compte ou sécurité apparaîtront ici." />
          )}
        </>
      ) : null}

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <ActionButton label="Rafraîchir" tone={BLUE} onClick={() => loadAll()} />
        <ActionButton label="Ouvrir Online" tone={GOLD} onClick={openOnline} />
      </div>
    </div>
  );
}
