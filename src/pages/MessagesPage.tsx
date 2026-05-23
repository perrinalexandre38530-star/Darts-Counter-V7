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
  markPrivateMessageRead,
  deletePrivateMessage,
  type FriendRequest,
  type PrivateMessageItem,
  type OnlineFriendUser,
  type ProfileFriendLink,
  type SharedMatchItem,
} from "../lib/friendsApi";
import { markMessageCenterRefreshNeeded, requestMessageNotificationsPermission } from "../lib/messageCenterNotify";

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
  const [active, setActive] = React.useState<MsgTab>("messages");
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
  const [selectedThreadUserId, setSelectedThreadUserId] = React.useState("");
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

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

  const unreadPrivateMessages = privateMessages.filter((m: any) => m?.direction !== "outgoing" && !m?.readAt).length;

  function privateMessagePeerId(m: any): string {
    const user = m?.direction === "outgoing" ? m?.toUser : m?.fromUser;
    return String(user?.userId || user?.id || m?.toUserId || m?.fromUserId || "").trim();
  }

  const messageThreads = React.useMemo(() => {
    const map = new Map<string, { user: any; messages: PrivateMessageItem[]; unread: number; lastAt: number }>();
    for (const m of privateMessages as any[]) {
      const incoming = m?.direction !== "outgoing";
      const user = incoming ? m?.fromUser : m?.toUser;
      const id = String(user?.userId || user?.id || (incoming ? m?.fromUserId : m?.toUserId) || "").trim();
      if (!id) continue;
      const prev = map.get(id) || { user, messages: [], unread: 0, lastAt: 0 };
      prev.user = prev.user || user;
      prev.messages.push(m);
      if (incoming && !m?.readAt) prev.unread += 1;
      prev.lastAt = Math.max(prev.lastAt, Date.parse(String(m?.createdAt || "")) || 0);
      map.set(id, prev);
    }
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, ...value, messages: value.messages.sort((a: any, b: any) => (Date.parse(String(a?.createdAt || "")) || 0) - (Date.parse(String(b?.createdAt || "")) || 0)) }))
      .sort((a, b) => b.lastAt - a.lastAt);
  }, [privateMessages]);

  const selectedThread = messageThreads.find((t) => t.id === selectedThreadUserId) || messageThreads[0] || null;
  const displayedMessages = selectedThread ? selectedThread.messages : privateMessages;

  const counters = {
    messages: unreadPrivateMessages,
    requests: incomingFriendRequests.length + outgoingFriendRequests.length,
    shares: incomingShares.filter((s) => String(s.status || "pending") === "pending").length,
    links: profileLinks.filter((l) => String(l.status || "pending") === "pending").length,
    invites: salonInvites.length,
    system: systemNotifications.length,
  };

  const totalPending = counters.messages + counters.requests + counters.shares + counters.links + counters.invites + counters.system;

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
      markMessageCenterRefreshNeeded();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);


  React.useEffect(() => {
    if (!selectedThreadUserId && messageThreads.length) {
      setSelectedThreadUserId(messageThreads[0].id);
    }
  }, [messageThreads, selectedThreadUserId]);

  React.useEffect(() => {
    if (active !== "messages") return;
    const unreadIncoming = displayedMessages.filter((m: any) => m?.direction !== "outgoing" && !m?.readAt && m?.id);
    if (!unreadIncoming.length) return;
    let cancelled = false;
    Promise.all(unreadIncoming.map((m: any) => markPrivateMessageRead(String(m.id)).catch(() => null)))
      .then(() => {
        if (cancelled) return;
        const now = new Date().toISOString();
        const ids = new Set(unreadIncoming.map((m: any) => String(m.id)));
        setPrivateMessages((prev) => prev.map((m: any) => (ids.has(String(m?.id || "")) ? { ...m, readAt: now } : m)));
        markMessageCenterRefreshNeeded();
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [active, selectedThreadUserId, displayedMessages]);

  async function runAction(label: string, fn: () => Promise<any>) {
    setError(null);
    setInfo(null);
    try {
      await fn();
      setInfo(label);
      await loadAll();
      markMessageCenterRefreshNeeded();
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
      setSelectedThreadUserId(toUserId);
      setMessageText("");
    });
  }

  async function handleDeletePrivateMessage(id: string) {
    if (!id) return;
    await runAction("Message supprimé de cette conversation ✅", async () => {
      await deletePrivateMessage(id);
    });
  }

  async function activatePhoneNotifications() {
    const permission = await requestMessageNotificationsPermission();
    setNotifPermission(permission);
    if (permission === "granted") setInfo("Notifications téléphone activées ✅");
    else if (permission === "denied") setError("Notifications bloquées par le téléphone/navigateur. Autorise-les dans les paramètres du site ou de l’application.");
    else if (permission === "unsupported") setError("Notifications non supportées par ce navigateur.");
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

        {notifPermission === "default" ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", border: "1px solid rgba(255,213,106,.24)", background: "rgba(255,213,106,.07)", borderRadius: 14, padding: "9px 10px" }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.72)", lineHeight: 1.25 }}>
              Active les notifications pour recevoir les nouveaux messages dans la barre du téléphone.
            </div>
            <ActionButton label="Activer" tone={GOLD} onClick={activatePhoneNotifications} />
          </div>
        ) : null}
      </div>

      {loading ? <div style={cardStyle({ marginBottom: 10 })}>Chargement de la messagerie…</div> : null}
      {error ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(255,100,100,.45)", color: RED })}>Erreur : {error}</div> : null}
      {info ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(125,255,178,.35)", color: GREEN })}>{info}</div> : null}

      {active === "messages" ? (
        <>
          <SectionTitle
            title="Chat privé"
            subtitle="Conversation type Messenger : une discussion par ami, messages lus automatiquement quand tu ouvres le fil."
            badge={unreadPrivateMessages}
          />

          {messageThreads.length ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" as any }}>
              {messageThreads.map((thread) => {
                const selected = selectedThread?.id === thread.id;
                const last = thread.messages[thread.messages.length - 1] as any;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setSelectedThreadUserId(thread.id);
                      setMessageToUserId(thread.id);
                    }}
                    style={{
                      flex: "0 0 auto",
                      minWidth: 132,
                      maxWidth: 168,
                      border: `1px solid ${selected ? BLUE : STROKE}`,
                      borderRadius: 18,
                      padding: "10px 11px",
                      background: selected ? "rgba(121,200,255,.15)" : "rgba(255,255,255,.045)",
                      color: "#fff",
                      textAlign: "left",
                      boxShadow: selected ? "0 0 18px rgba(121,200,255,.20)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asUserName(thread.user)}</div>
                      {thread.unread > 0 ? <Pill tone={GREEN}>{thread.unread}</Pill> : null}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,.58)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last?.text || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div style={cardStyle({ marginBottom: 10, borderColor: `${BLUE}55`, padding: 0, overflow: "hidden" })}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${STROKE}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 1000, color: BLUE }}>{selectedThread ? asUserName(selectedThread.user) : "Nouvelle conversation"}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.58)", marginTop: 2 }}>
                  {selectedThread ? `${selectedThread.messages.length} message(s)` : "Choisis un ami et envoie ton premier message."}
                </div>
              </div>
              <ActionButton label="Rafraîchir" tone={BLUE} onClick={() => loadAll()} />
            </div>

            <div
              style={{
                minHeight: 220,
                maxHeight: 430,
                overflowY: "auto",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 9,
                background: "radial-gradient(420px 220px at 50% 0%, rgba(121,200,255,.08), transparent 65%)",
              }}
            >
              {displayedMessages.length ? (
                displayedMessages.map((m: any, idx: number) => {
                  const incoming = m.direction !== "outgoing";
                  return (
                    <div
                      key={m?.id || idx}
                      style={{
                        alignSelf: incoming ? "flex-start" : "flex-end",
                        maxWidth: "86%",
                        border: `1px solid ${incoming ? "rgba(255,255,255,.14)" : `${GREEN}55`}`,
                        borderRadius: incoming ? "18px 18px 18px 6px" : "18px 18px 6px 18px",
                        padding: "9px 10px",
                        background: incoming ? "rgba(255,255,255,.055)" : "linear-gradient(180deg, rgba(125,255,178,.18), rgba(0,0,0,.20))",
                        boxShadow: incoming && !m.readAt ? "0 0 18px rgba(125,255,178,.13)" : "none",
                      }}
                    >
                      <div style={{ color: "#fff", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.32 }}>{m?.text || "—"}</div>
                      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "rgba(255,255,255,.46)", fontSize: 10.5, fontWeight: 800 }}>{asDate(m?.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePrivateMessage(String(m?.id || ""))}
                          style={{
                            border: "0",
                            background: "transparent",
                            color: "rgba(255,255,255,.50)",
                            fontWeight: 1000,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                          title="Supprimer ce message de mon affichage"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyCard icon="💬" title="Aucun message privé" text="Choisis un ami puis envoie ton premier message." />
              )}
            </div>

            <div style={{ padding: 12, borderTop: `1px solid ${STROKE}`, display: "grid", gap: 8 }}>
              <select
                value={messageToUserId || selectedThread?.id || ""}
                onChange={(e) => {
                  const next = (e.target as HTMLSelectElement).value;
                  setMessageToUserId(next);
                  if (next) setSelectedThreadUserId(next);
                }}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText((e.target as HTMLTextAreaElement).value)}
                  placeholder="Écris ton message…"
                  rows={2}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "10px 11px",
                    border: `1px solid ${STROKE}`,
                    background: "rgba(0,0,0,.35)",
                    color: "#fff",
                    fontWeight: 700,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
                <ActionButton label="Envoyer" tone={GREEN} onClick={handleSendPrivateMessage} />
              </div>
            </div>
          </div>
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
