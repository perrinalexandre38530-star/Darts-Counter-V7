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
  markPrivateThreadRead,
  deletePrivateMessage,
  type FriendRequest,
  type PrivateMessageItem,
  type OnlineFriendUser,
  type ProfileFriendLink,
  type SharedMatchItem,
} from "../lib/friendsApi";
import { markMessageCenterRefreshNeeded, requestMessageNotificationsPermission, showMessageCenterNotification } from "../lib/messageCenterNotify";

type MsgTab = "messages" | "requests" | "shares" | "links" | "invites" | "system";
type ChatMode = "messenger" | "group" | "rooms" | "announces";

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


function presenceState(raw?: string | null): { key: "online" | "away" | "offline"; label: string; color: string } {
  const s = String(raw || "offline").trim().toLowerCase();
  if (["online", "ready", "connected", "active"].includes(s)) return { key: "online", label: "En ligne", color: "#62ff63" };
  if (["away", "idle", "busy", "absent", "pending"].includes(s)) return { key: "away", label: "Absent", color: "#ffc44d" };
  return { key: "offline", label: "Déconnecté", color: "#7b838d" };
}

function userAvatarUrl(user?: any): string {
  return String(user?.avatarUrl || user?.avatar_url || user?.avatar || user?.photoUrl || user?.photoURL || "").trim();
}

function initialsOfName(name: string): string {
  const clean = String(name || "Ami").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "A";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${a}${b}`.toUpperCase();
}

function AvatarBubble({
  user,
  size = 50,
  selected = false,
  showStatus = true,
  statusOverride,
}: {
  user?: any;
  size?: number;
  selected?: boolean;
  showStatus?: boolean;
  statusOverride?: string;
}) {
  const name = asUserName(user);
  const src = userAvatarUrl(user);
  const st = presenceState(statusOverride || user?.status || user?.presenceStatus || user?.presence_status);
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        border: `2px solid ${selected ? BLUE : "rgba(255,255,255,.16)"}`,
        background: "radial-gradient(circle at 35% 20%, rgba(255,255,255,.20), rgba(255,255,255,.045) 48%, rgba(0,0,0,.50))",
        boxShadow: selected ? `0 0 18px ${BLUE}55` : "0 10px 22px rgba(0,0,0,.34)",
        overflow: "visible",
      }}
      title={`${name} • ${st.label}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
        />
      ) : (
        <span style={{ color: "#fff", fontWeight: 1000, fontSize: Math.max(12, Math.round(size * 0.32)), letterSpacing: -0.5 }}>
          {initialsOfName(name)}
        </span>
      )}
      {showStatus ? (
        <span
          aria-label={st.label}
          style={{
            position: "absolute",
            right: Math.max(1, Math.round(size * 0.02)),
            bottom: Math.max(1, Math.round(size * 0.02)),
            width: Math.max(11, Math.round(size * 0.26)),
            height: Math.max(11, Math.round(size * 0.26)),
            borderRadius: 999,
            background: st.color,
            border: "2px solid rgba(8,9,14,.95)",
            boxShadow: `0 0 12px ${st.color}99`,
          }}
        />
      ) : null}
    </div>
  );
}

function MessageMenuIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

function ChatActionIcon({ name, size = 18 }: { name: "reply" | "edit" | "copy" | "share" | "delete"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "reply") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M9 10 4 15l5 5"/><path {...p} d="M5 15h8a7 7 0 0 0 7-7V5"/></svg>;
  if (name === "edit") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path {...p} d="m13.5 6.5 4 4"/></svg>;
  if (name === "copy") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="8" y="8" width="11" height="11" rx="2"/><path {...p} d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>;
  if (name === "share") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M18 8a3 3 0 1 0-2.8-4"/><path {...p} d="M6 15a3 3 0 1 0 2.8 4"/><path {...p} d="m8.8 14 6.4 3.7"/><path {...p} d="m15.2 6.3-6.4 3.7"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M3 6h18"/><path {...p} d="M8 6V4h8v2"/><path {...p} d="m19 6-1 14H6L5 6"/><path {...p} d="M10 11v5"/><path {...p} d="M14 11v5"/></svg>;
}


function MessengerToolIcon({ name, size = 19 }: { name: "back" | "phone" | "video" | "clip" | "camera" | "mic" | "smile" | "more"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "back") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M15 18 9 12l6-6"/><path {...p} d="M10 12h10"/></svg>;
  if (name === "phone") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.45 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.3-1.25a2 2 0 0 1 2.1-.45c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z"/></svg>;
  if (name === "video") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="6" width="12" height="12" rx="2"/><path {...p} d="m15 10 6-3v10l-6-3"/></svg>;
  if (name === "clip") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.6 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/></svg>;
  if (name === "camera") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5Z"/><circle {...p} cx="12" cy="13" r="3"/></svg>;
  if (name === "mic") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="9" y="2" width="6" height="12" rx="3"/><path {...p} d="M5 10a7 7 0 0 0 14 0"/><path {...p} d="M12 17v5"/></svg>;
  if (name === "smile") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M8 14s1.5 2 4 2 4-2 4-2"/><path {...p} d="M9 9h.01M15 9h.01"/></svg>;
  return <MessageMenuIcon size={size} />;
}

function RoundMessengerButton({ title, children, onClick, tone = BLUE }: { title: string; children: React.ReactNode; onClick?: () => void; tone?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        border: `1px solid ${tone}55`,
        background: `linear-gradient(180deg, ${tone}16, rgba(255,255,255,.035))`,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: `0 0 14px ${tone}18`,
      }}
    >
      {children}
    </button>
  );
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


function MessageCenterTabIcon({ name, size = 21 }: { name: MsgTab; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "messages":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 5.5h16v10.5H8l-4 3.5V5.5Z" />
          <path {...p} d="M8 9h8" />
          <path {...p} d="M8 12.5h5.5" />
        </svg>
      );
    case "links":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M10 13.5a4 4 0 0 0 5.7.1l2.4-2.4a4 4 0 0 0-5.7-5.7l-1.1 1.1" />
          <path {...p} d="M14 10.5a4 4 0 0 0-5.7-.1l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.1-1.1" />
        </svg>
      );
    case "shares":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z" />
          <path {...p} d="M6 5H4v2a4 4 0 0 0 4 4" />
          <path {...p} d="M18 5h2v2a4 4 0 0 1-4 4" />
          <path {...p} d="M12 12v3" />
          <path {...p} d="M9 20h6" />
          <path {...p} d="M10 15h4" />
        </svg>
      );
    case "requests":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <circle {...p} cx="9" cy="8" r="3" />
          <path {...p} d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <circle {...p} cx="17" cy="9" r="2.5" />
          <path {...p} d="M14.5 19.5a4.5 4.5 0 0 1 6-4.2" />
        </svg>
      );
    case "invites":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <rect {...p} x="4" y="7" width="16" height="10" rx="4" />
          <path {...p} d="M8 12h4" />
          <path {...p} d="M10 10v4" />
          <circle cx="16.5" cy="11" r="1" fill="currentColor" />
          <circle cx="18.5" cy="13" r="1" fill="currentColor" />
        </svg>
      );
    case "system":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path {...p} d="M10 21h4" />
          <path {...p} d="M12 3V2" />
        </svg>
      );
    default:
      return null;
  }
}


function ChatModeIcon({ name, size = 21 }: { name: ChatMode; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "messenger":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 5.5h16v10.5H8l-4 3.5V5.5Z" />
          <path {...p} d="M8 9h8" />
          <path {...p} d="M8 12.5h5.5" />
        </svg>
      );
    case "group":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <circle {...p} cx="9" cy="8" r="3" />
          <circle {...p} cx="17" cy="9" r="2.5" />
          <path {...p} d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path {...p} d="M14.5 19.5a4.5 4.5 0 0 1 6-4.2" />
          <path {...p} d="M16.5 4.5v3" />
          <path {...p} d="M15 6h3" />
        </svg>
      );
    case "rooms":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M5 7h14v9H8l-3 3V7Z" />
          <path {...p} d="M8 10h8" />
          <path {...p} d="M8 13h5" />
          <path {...p} d="M17 4v3" />
          <path {...p} d="M15.5 5.5h3" />
        </svg>
      );
    case "announces":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 11v3a2 2 0 0 0 2 2h2l2 4h3l-2-4h2l7 3V6l-7 3H6a2 2 0 0 0-2 2Z" />
          <path {...p} d="M20 9.5c1 .7 1 4.3 0 5" />
        </svg>
      );
    default:
      return null;
  }
}

function NeonIconTab({
  active,
  label,
  description,
  badge = 0,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  description?: string;
  badge?: number;
  tone: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={description || label}
      aria-label={label}
      onClick={onClick}
      style={{
        position: "relative",
        minWidth: 0,
        height: 52,
        border: `1px solid ${active ? `${tone}cc` : STROKE}`,
        borderRadius: 16,
        padding: 0,
        color: active ? tone : "rgba(255,255,255,.72)",
        background: active
          ? `radial-gradient(110% 120% at 50% 0%, ${tone}35, rgba(255,255,255,.055) 58%, rgba(0,0,0,.30))`
          : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
        fontWeight: 1000,
        display: "grid",
        placeItems: "center",
        boxShadow: active ? `0 -5px 18px ${tone}44, 0 0 18px ${tone}25` : "inset 0 1px 0 rgba(255,255,255,.06)",
        overflow: "visible",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "17%",
          right: "17%",
          height: 3,
          borderRadius: "0 0 999px 999px",
          background: active ? tone : "transparent",
          boxShadow: active ? `0 0 14px ${tone}` : "none",
        }}
      />
      {children}
      {badge > 0 ? (
        <span
          style={{
            position: "absolute",
            top: -7,
            right: -5,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: tone,
            color: "#111",
            display: "grid",
            placeItems: "center",
            fontSize: 10.5,
            lineHeight: 1,
            fontWeight: 1000,
            border: "1px solid rgba(0,0,0,.45)",
            boxShadow: `0 0 14px ${tone}88`,
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
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
  const [chatMode, setChatMode] = React.useState<ChatMode>("messenger");
  const [actionsOpen, setActionsOpen] = React.useState(false);
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
  const [chatFullscreen, setChatFullscreen] = React.useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = React.useState("");
  const [messageMenuPosition, setMessageMenuPosition] = React.useState<{ top: number; left: number; side: "left" | "right" }>({ top: 0, left: 0, side: "right" });
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openMessageMenuId) return;
    const close = () => setOpenMessageMenuId("");
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [openMessageMenuId]);

  function broadcastMessageBadge(total: number) {
    const nextTotal = Math.max(0, Math.floor(Number(total || 0)));
    try {
      window.dispatchEvent(new CustomEvent("dc-message-center-count", {
        detail: {
          unreadMessages: Math.max(0, nextTotal),
          friendRequests: counters?.requests || 0,
          profileLinks: counters?.links || 0,
          sharedMatches: counters?.shares || 0,
          system: counters?.system || 0,
          invites: counters?.invites || 0,
          total: nextTotal,
          newestLabel: "",
          newestKey: "",
        },
      }));
    } catch {}
    try {
      const clean = document.title.replace(/^\(\d+\)\s+/, "");
      document.title = nextTotal > 0 ? `(${nextTotal}) ${clean}` : clean;
    } catch {}
  }

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

  const selectedThreadBase = messageThreads.find((t) => t.id === selectedThreadUserId) || messageThreads[0] || null;
  const selectedFriend = selectedThreadBase ? friends.find((f: any) => String(f?.userId || f?.id || "") === String(selectedThreadBase.id)) : null;
  const selectedThread = selectedThreadBase ? { ...selectedThreadBase, user: { ...(selectedThreadBase.user || {}), ...(selectedFriend || {}) } } : null;
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
    if (active !== "messages" || !selectedThread?.id) return;
    const unreadIncoming = selectedThread.messages.filter((m: any) => m?.direction !== "outgoing" && !m?.readAt && m?.id);
    if (!unreadIncoming.length) return;
    let cancelled = false;

    markPrivateThreadRead(String(selectedThread.id))
      .catch(() => Promise.all(unreadIncoming.map((m: any) => markPrivateMessageRead(String(m.id)).catch(() => null))))
      .then(() => {
        if (cancelled) return;
        const now = new Date().toISOString();
        const ids = new Set(unreadIncoming.map((m: any) => String(m.id)));
        setPrivateMessages((prev) => prev.map((m: any) => (ids.has(String(m?.id || "")) ? { ...m, readAt: now } : m)));
        markMessageCenterRefreshNeeded();
        try {
          broadcastMessageBadge(Math.max(0, totalPending - ids.size));
        } catch {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [active, selectedThread?.id, selectedThread?.messages, totalPending]);

  React.useEffect(() => {
    if (active !== "messages") return;
    try { chatEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); } catch {}
  }, [active, selectedThread?.id, displayedMessages.length, chatFullscreen]);

  React.useEffect(() => {
    setOpenMessageMenuId("");
  }, [selectedThread?.id]);

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
    const toUserId = String(messageToUserId || selectedThread?.id || "").trim();
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
    setPrivateMessages((prev) => {
      const removed = (prev as any[]).find((m: any) => String(m?.id || "") === String(id));
      const next = prev.filter((m: any) => String(m?.id || "") !== String(id));
      if (removed?.direction !== "outgoing" && !removed?.readAt) broadcastMessageBadge(Math.max(0, totalPending - 1));
      return next;
    });
    markMessageCenterRefreshNeeded();
    try {
      await deletePrivateMessage(id);
      setInfo("Message supprimé de cette conversation ✅");
    } catch (e: any) {
      setError(e?.message || String(e));
      await loadAll();
    }
  }

  function openMessengerThread(threadId: string, unread = 0) {
    const id = String(threadId || "").trim();
    if (!id) return;
    setSelectedThreadUserId(id);
    setMessageToUserId(id);
    setChatFullscreen(true);
    setOpenMessageMenuId("");
    if (unread > 0) {
      const now = new Date().toISOString();
      setPrivateMessages((prev) => prev.map((m: any) => {
        const peerId = privateMessagePeerId(m);
        return peerId === id && m?.direction !== "outgoing" && !m?.readAt ? { ...m, readAt: now } : m;
      }));
      broadcastMessageBadge(Math.max(0, totalPending - unread));
      markPrivateThreadRead(id).catch(() => {});
      markMessageCenterRefreshNeeded();
    }
  }

  async function activatePhoneNotifications() {
    const permission = await requestMessageNotificationsPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      setInfo("Notifications téléphone activées ✅");
      await showMessageCenterNotification("Multisports Scoring", "Notifications activées pour la messagerie.");
    }
    else if (permission === "denied") setError("Notifications bloquées par le téléphone/navigateur. Autorise-les dans les paramètres du site ou de l’application.");
    else if (permission === "unsupported") setError("Notifications non supportées par ce navigateur.");
  }

  function openOnline() {
    if (typeof go === "function") go("online", { initialOnlineTab: "requests" });
  }

  const tabs: Array<{ id: MsgTab; label: string; badge: number; tone: string }> = [
    { id: "messages", label: "Messages", badge: counters.messages, tone: GOLD },
    { id: "requests", label: "Amis", badge: counters.requests, tone: "#c78bff" },
    { id: "links", label: "Associations profils", badge: counters.links, tone: BLUE },
    { id: "invites", label: "Invitations jeu Online", badge: counters.invites, tone: GREEN },
    { id: "shares", label: "Cartes parties reçues", badge: counters.shares, tone: GOLD },
    { id: "system", label: "Notifs", badge: counters.system, tone: RED },
  ];

  const chatModes: Array<{ id: ChatMode; label: string; description: string; badge: number; tone: string }> = [
    { id: "messenger", label: "Messenger", description: "Discuter avec un ami", badge: unreadPrivateMessages, tone: BLUE },
    { id: "group", label: "Groupe", description: "Créer un groupe d'amis et discuter ensemble", badge: 0, tone: "#c78bff" },
    { id: "rooms", label: "Salon de T'Chat", description: "Discuter dans des salons créés online", badge: salonInvites.length, tone: GREEN },
    { id: "announces", label: "Annonces", description: "Les joueurs peuvent laisser des annonces visibles de tous", badge: 0, tone: GOLD },
  ];

  const actionItems = [
    { label: "Messages", count: counters.messages, tone: GOLD, tab: "messages" as MsgTab, detail: "Messages privés non lus." },
    { label: "Amis", count: counters.requests, tone: "#c78bff", tab: "requests" as MsgTab, detail: "Demandes d'amis en attente." },
    { label: "Associations profils", count: counters.links, tone: BLUE, tab: "links" as MsgTab, detail: "Liens profil local ↔ compte ami à traiter." },
    { label: "Invitations jeu Online", count: counters.invites, tone: GREEN, tab: "invites" as MsgTab, detail: "Invitations ou salons online." },
    { label: "Cartes parties reçues", count: counters.shares, tone: GOLD, tab: "shares" as MsgTab, detail: "Partages de parties / stats historiques." },
    { label: "Notifs", count: counters.system, tone: RED, tab: "system" as MsgTab, detail: "Notifications système." },
  ];


  if (active === "messages" && chatFullscreen && selectedThread) {
    const st = presenceState(selectedThread.user?.status || selectedThread.user?.presenceStatus || selectedThread.user?.presence_status);
    return (
      <div
        className="container"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483000,
          width: "100vw",
          height: "100dvh",
          padding: 0,
          margin: 0,
          color: "#f5f5f7",
          background: "radial-gradient(820px 360px at 50% -10%, rgba(121,200,255,.16), transparent 60%), linear-gradient(180deg, #0b0d15 0%, #05060a 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            padding: "12px 12px 10px",
            minHeight: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderBottom: `1px solid ${STROKE}`,
            background: "linear-gradient(180deg, rgba(255,255,255,.070), rgba(255,255,255,.018))",
            boxShadow: "0 12px 26px rgba(0,0,0,.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <RoundMessengerButton title="Retour au menu Messages" tone={BLUE} onClick={() => { setChatFullscreen(false); setOpenMessageMenuId(""); }}>
              <MessengerToolIcon name="back" size={22} />
            </RoundMessengerButton>
            <AvatarBubble user={selectedThread.user} size={42} selected={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: GOLD, fontWeight: 1000, fontSize: 13, letterSpacing: ".02em" }}>T'Chat Messenger</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2, minWidth: 0 }}>
                <span style={{ color: "#fff", fontWeight: 1000, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asUserName(selectedThread.user)}</span>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: st.color, boxShadow: `0 0 10px ${st.color}` }} />
                <span style={{ color: "rgba(255,255,255,.58)", fontSize: 11, fontWeight: 800 }}>{st.label}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
            <RoundMessengerButton title="Appel audio" tone={GREEN} onClick={() => setInfo("Appel audio : option prête à câbler.")}><MessengerToolIcon name="phone" /></RoundMessengerButton>
            <RoundMessengerButton title="Visio" tone={BLUE} onClick={() => setInfo("Visio : option prête à câbler.")}><MessengerToolIcon name="video" /></RoundMessengerButton>
            <RoundMessengerButton title="Options conversation" tone={GOLD} onClick={() => setInfo("Options conversation : option prête à câbler.")}><MessengerToolIcon name="more" /></RoundMessengerButton>
          </div>
        </div>

        {info ? <div style={{ flex: "0 0 auto", margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(125,255,178,.35)", color: GREEN }) }}>{info}</div> : null}
        {error ? <div style={{ flex: "0 0 auto", margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(255,100,100,.45)", color: RED }) }}>Erreur : {error}</div> : null}

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          {displayedMessages.length ? (
            displayedMessages.map((m: any, idx: number) => {
              const incoming = m.direction !== "outgoing";
              const msgId = String(m?.id || `local-${idx}`);
              const menuOpen = openMessageMenuId === msgId;
              return (
                <div
                  key={msgId}
                  style={{
                    position: "relative",
                    alignSelf: incoming ? "flex-start" : "flex-end",
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: incoming ? "row" : "row-reverse",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      minWidth: 74,
                      border: `1px solid ${incoming ? "rgba(255,255,255,.13)" : `${GREEN}55`}`,
                      borderRadius: incoming ? "15px 15px 15px 5px" : "15px 15px 5px 15px",
                      padding: "7px 9px 6px",
                      background: incoming ? "rgba(255,255,255,.052)" : "linear-gradient(180deg, rgba(125,255,178,.17), rgba(0,0,0,.20))",
                      boxShadow: incoming && !m.readAt ? "0 0 16px rgba(125,255,178,.11)" : "none",
                    }}
                  >
                    <div style={{ color: "#fff", fontSize: 12.5, whiteSpace: "pre-wrap", lineHeight: 1.24 }}>{m?.text || "—"}</div>
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
                      <span style={{ color: "rgba(255,255,255,.48)", fontSize: 9.8, fontWeight: 800 }}>{asDate(m?.createdAt)}</span>
                      {!incoming ? <span style={{ color: BLUE, fontSize: 11, fontWeight: 1000 }}>✓✓</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      if (menuOpen) {
                        setOpenMessageMenuId("");
                        return;
                      }
                      const rect = event.currentTarget.getBoundingClientRect();
                      const menuWidth = 126;
                      const safePad = 8;
                      const left = incoming
                        ? Math.min(window.innerWidth - menuWidth - safePad, rect.left + 18)
                        : Math.max(safePad, rect.right - menuWidth);
                      const top = Math.min(window.innerHeight - 150, Math.max(safePad, rect.top + 20));
                      setMessageMenuPosition({ top, left, side: incoming ? "left" : "right" });
                      setOpenMessageMenuId(msgId);
                    }}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      border: `1px solid ${menuOpen ? BLUE : "rgba(255,255,255,.10)"}`,
                      background: menuOpen ? `${BLUE}18` : "rgba(255,255,255,.035)",
                      color: menuOpen ? BLUE : "rgba(255,255,255,.56)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      flex: "0 0 auto",
                    }}
                    title="Options du message"
                    aria-label="Options du message"
                  >
                    <MessageMenuIcon size={15} />
                  </button>
                  {menuOpen ? (
                    <div
                      style={{
                        position: "fixed",
                        zIndex: 2147483647,
                        top: messageMenuPosition.top,
                        left: messageMenuPosition.left,
                        width: 126,
                        border: `1px solid ${BLUE}66`,
                        borderRadius: 12,
                        padding: 3,
                        background: "linear-gradient(180deg, rgba(30,31,38,.99), rgba(14,15,21,.99))",
                        boxShadow: `0 12px 28px rgba(0,0,0,.62), 0 0 16px ${BLUE}22`,
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      {[
                        ["reply", "Répondre"],
                        ["edit", "Éditer"],
                        ["copy", "Copier"],
                        ["share", "Partager"],
                      ].map(([name, label]) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            if (name === "copy") {
                              navigator.clipboard?.writeText(String(m?.text || "")).catch(() => {});
                              setInfo("Message copié ✅");
                            } else {
                              setInfo(`${label} : option prête à câbler.`);
                            }
                            setOpenMessageMenuId("");
                          }}
                          style={{ width: "100%", border: 0, background: "transparent", color: "rgba(255,255,255,.88)", display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 850, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}
                        >
                          <ChatActionIcon name={name as any} size={15} /> <span>{label}</span>
                        </button>
                      ))}
                      <div style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "3px 4px" }} />
                      <button
                        type="button"
                        onClick={() => { setOpenMessageMenuId(""); handleDeletePrivateMessage(String(m?.id || "")); }}
                        style={{ width: "100%", border: 0, background: "transparent", color: RED, display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 950, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}
                      >
                        <ChatActionIcon name="delete" size={15} /> <span>Supprimer</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptyCard icon="💬" title="Aucun message privé" text="Écris ton premier message dans cette conversation." />
          )}
          <div ref={chatEndRef} />
        </div>

        <div
          style={{
            flex: "0 0 auto",
            padding: "9px 10px 12px",
            borderTop: `1px solid ${STROKE}`,
            background: "linear-gradient(180deg, rgba(255,255,255,.025), rgba(0,0,0,.30))",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: 8, alignItems: "end" }}>
            <RoundMessengerButton title="Emoji" tone={BLUE}><MessengerToolIcon name="smile" /></RoundMessengerButton>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText((e.target as HTMLTextAreaElement).value)}
              placeholder="Écrire un message…"
              rows={1}
              style={{
                width: "100%",
                minHeight: 38,
                maxHeight: 92,
                borderRadius: 18,
                padding: "10px 11px",
                border: `1px solid ${STROKE}`,
                background: "rgba(0,0,0,.35)",
                color: "#fff",
                fontWeight: 700,
                outline: "none",
                resize: "none",
              }}
            />
            <RoundMessengerButton title="Pièce jointe" tone={BLUE} onClick={() => setInfo("Pièce jointe : option prête à câbler.")}><MessengerToolIcon name="clip" /></RoundMessengerButton>
            <RoundMessengerButton title="Photo" tone={BLUE} onClick={() => setInfo("Photo : option prête à câbler.")}><MessengerToolIcon name="camera" /></RoundMessengerButton>
            <RoundMessengerButton title="Message vocal" tone={GREEN} onClick={() => setInfo("Message vocal : option prête à câbler.")}><MessengerToolIcon name="mic" /></RoundMessengerButton>
            <ActionButton label="Envoyer" tone={GREEN} onClick={handleSendPrivateMessage} />
          </div>
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            title="Afficher les actions à traiter"
            style={{
              border: `1px solid ${(totalPending > 0 ? GOLD : GREEN)}88`,
              background: `linear-gradient(180deg, ${(totalPending > 0 ? GOLD : GREEN)}1f, rgba(0,0,0,.20))`,
              color: "#fff",
              borderRadius: 16,
              minWidth: 72,
              padding: "7px 9px",
              display: "grid",
              gap: 2,
              justifyItems: "center",
              cursor: "pointer",
              boxShadow: `0 0 16px ${(totalPending > 0 ? GOLD : GREEN)}22`,
            }}
          >
            <span style={{ fontSize: 9.5, fontWeight: 950, color: "rgba(255,255,255,.68)", textTransform: "uppercase", letterSpacing: ".04em" }}>À traiter</span>
            <span style={{ minWidth: 30, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${(totalPending > 0 ? GOLD : GREEN)}88`, color: totalPending > 0 ? GOLD : GREEN, background: `${(totalPending > 0 ? GOLD : GREEN)}16`, fontSize: 14, fontWeight: 1000 }}>
              {totalPending}
            </span>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 8,
            paddingTop: 14,
            paddingBottom: 2,
            width: "100%",
          }}
        >
          {tabs.map((t) => (
            <NeonIconTab
              key={t.id}
              active={active === t.id}
              label={t.label}
              badge={t.badge}
              tone={t.tone}
              onClick={() => setActive(t.id)}
            >
              <MessageCenterTabIcon name={t.id} size={22} />
            </NeonIconTab>
          ))}
        </div>
      </div>

      {actionsOpen ? (
        <div
          role="dialog"
          aria-label="Actions à traiter"
          onClick={() => setActionsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,.42)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(330px, 88vw)",
              height: "100%",
              padding: 16,
              paddingTop: 24,
              background: "linear-gradient(180deg, rgba(18,18,27,.98), rgba(5,5,10,.99))",
              borderLeft: `1px solid ${GOLD}55`,
              boxShadow: `-18px 0 42px rgba(0,0,0,.45), 0 0 24px ${GOLD}22`,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ color: GOLD, fontWeight: 1000, fontSize: 20 }}>À traiter</div>
                <div style={{ color: "rgba(255,255,255,.58)", fontSize: 12 }}>{totalPending} action{totalPending > 1 ? "s" : ""} en attente</div>
              </div>
              <ActionButton label="Fermer" tone={GOLD} onClick={() => setActionsOpen(false)} />
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {actionItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setActive(item.tab);
                    setActionsOpen(false);
                  }}
                  style={{
                    textAlign: "left",
                    border: `1px solid ${item.count > 0 ? `${item.tone}88` : STROKE}`,
                    borderRadius: 18,
                    padding: 12,
                    color: "#fff",
                    background: item.count > 0 ? `${item.tone}12` : "rgba(255,255,255,.035)",
                    boxShadow: item.count > 0 ? `0 0 18px ${item.tone}22` : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>{item.label}</div>
                    <Pill tone={item.count > 0 ? item.tone : "rgba(255,255,255,.45)"}>{item.count}</Pill>
                  </div>
                  <div style={{ marginTop: 5, color: "rgba(255,255,255,.62)", fontSize: 12 }}>{item.detail}</div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {loading ? <div style={cardStyle({ marginBottom: 10 })}>Chargement de la messagerie…</div> : null}
      {error ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(255,100,100,.45)", color: RED })}>Erreur : {error}</div> : null}
      {info ? <div style={cardStyle({ marginBottom: 10, borderColor: "rgba(125,255,178,.35)", color: GREEN })}>{info}</div> : null}

      {active === "messages" ? (
        <>
          <SectionTitle
            title="T'Chat Messenger"
            badge={unreadPrivateMessages}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            {chatModes.map((mode) => (
              <NeonIconTab
                key={mode.id}
                active={chatMode === mode.id}
                label={mode.label}
                description={`${mode.label} — ${mode.description}`}
                badge={mode.badge}
                tone={mode.tone}
                onClick={() => setChatMode(mode.id)}
              >
                <ChatModeIcon name={mode.id} size={22} />
              </NeonIconTab>
            ))}
          </div>

          {chatMode === "messenger" ? (
            <>
          {messageThreads.length ? (
            <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 0 12px", scrollbarWidth: "none" as any }}>
              {messageThreads.map((thread) => {
                const selected = selectedThread?.id === thread.id;
                const friend = friends.find((f: any) => String(f?.userId || f?.id || "") === String(thread.id));
                const user = { ...(thread.user || {}), ...(friend || {}) };
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openMessengerThread(thread.id, thread.unread)}
                    style={{
                      position: "relative",
                      flex: "0 0 86px",
                      width: 86,
                      minHeight: 98,
                      border: `1px solid ${selected ? BLUE : "rgba(255,255,255,.10)"}`,
                      borderRadius: 24,
                      padding: "10px 7px 8px",
                      background: selected
                        ? "radial-gradient(110% 120% at 50% 0%, rgba(121,200,255,.20), rgba(255,255,255,.04) 58%, rgba(0,0,0,.36))"
                        : "linear-gradient(180deg, rgba(255,255,255,.040), rgba(255,255,255,.018))",
                      color: "#fff",
                      display: "grid",
                      justifyItems: "center",
                      gap: 7,
                      boxShadow: selected ? "0 0 22px rgba(121,200,255,.25), inset 0 1px 0 rgba(255,255,255,.08)" : "inset 0 1px 0 rgba(255,255,255,.055)",
                      cursor: "pointer",
                    }}
                    title={`${asUserName(user)} • ${presenceState(user?.status || user?.presenceStatus).label}`}
                  >
                    <AvatarBubble user={user} size={54} selected={selected} />
                    <div style={{ width: "100%", fontWeight: 1000, fontSize: 12.5, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asUserName(user)}</div>
                    {thread.unread > 0 ? (
                      <span style={{ position: "absolute", top: 4, right: 5, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: GREEN, color: "#07120b", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 1000, boxShadow: `0 0 14px ${GREEN}88` }}>
                        {thread.unread > 99 ? "99+" : thread.unread}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div style={cardStyle(chatFullscreen ? {
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            margin: 0,
            borderRadius: 0,
            borderColor: `${BLUE}66`,
            padding: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "radial-gradient(900px 360px at 50% -10%, rgba(121,200,255,.14), transparent 58%), linear-gradient(180deg, rgba(13,15,24,.99), rgba(5,6,11,.99))",
          } : { marginBottom: 10, borderColor: `${BLUE}55`, padding: 0, overflow: "hidden" })}>
            {chatFullscreen ? (
              <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${STROKE}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(180deg, rgba(255,255,255,.060), rgba(255,255,255,.018))", flex: "0 0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <RoundMessengerButton title="Retour messages" tone={BLUE} onClick={() => { setChatFullscreen(false); setOpenMessageMenuId(""); }}>
                    <MessengerToolIcon name="back" />
                  </RoundMessengerButton>
                  {selectedThread ? <AvatarBubble user={selectedThread.user} size={38} selected={false} /> : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: GOLD, fontWeight: 1000, fontSize: 13, letterSpacing: .2 }}>T'Chat Messenger</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1, minWidth: 0 }}>
                      <span style={{ color: "#fff", fontWeight: 1000, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedThread ? asUserName(selectedThread.user) : "Conversation"}</span>
                      {selectedThread ? <span style={{ width: 8, height: 8, borderRadius: 999, background: presenceState(selectedThread.user?.status || selectedThread.user?.presenceStatus).color, boxShadow: `0 0 10px ${presenceState(selectedThread.user?.status || selectedThread.user?.presenceStatus).color}` }} /> : null}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
                  <RoundMessengerButton title="Appel audio" tone={GREEN}><MessengerToolIcon name="phone" /></RoundMessengerButton>
                  <RoundMessengerButton title="Visio" tone={BLUE}><MessengerToolIcon name="video" /></RoundMessengerButton>
                  <RoundMessengerButton title="Options" tone={GOLD}><MessengerToolIcon name="more" /></RoundMessengerButton>
                </div>
              </div>
            ) : (
            <div style={{ padding: "11px 13px", borderBottom: `1px solid ${STROKE}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", background: "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.015))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {selectedThread ? (
                  <AvatarBubble user={selectedThread.user} size={42} selected={false} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: "50%", border: `1px solid ${STROKE}`, display: "grid", placeItems: "center" }}>💬</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedThread ? asUserName(selectedThread.user) : "Choisis une conversation"}</div>
                  <div style={{ fontSize: 11.2, color: "rgba(255,255,255,.58)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    {selectedThread ? presenceState(selectedThread.user?.status || selectedThread.user?.presenceStatus).label : "Choisis un ami et envoie ton premier message."}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => loadAll()} title="Rafraîchir" style={{ border: `1px solid ${BLUE}66`, width: 36, height: 36, borderRadius: 14, background: `${BLUE}12`, color: BLUE, display: "grid", placeItems: "center", cursor: "pointer", fontWeight: 1000 }}>↻</button>
            </div>
            )}

            <div
              style={{
                minHeight: chatFullscreen ? 0 : 220,
                maxHeight: chatFullscreen ? "none" : 430,
                flex: chatFullscreen ? "1 1 auto" : undefined,
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
                  const msgId = String(m?.id || `local-${idx}`);
                  const menuOpen = openMessageMenuId === msgId;
                  return (
                    <div
                      key={msgId}
                      style={{
                        position: "relative",
                        alignSelf: incoming ? "flex-start" : "flex-end",
                        maxWidth: "84%",
                        display: "flex",
                        flexDirection: incoming ? "row" : "row-reverse",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 86,
                          border: `1px solid ${incoming ? "rgba(255,255,255,.13)" : `${GREEN}55`}`,
                          borderRadius: incoming ? "15px 15px 15px 5px" : "15px 15px 5px 15px",
                          padding: "7px 9px 6px",
                          background: incoming ? "rgba(255,255,255,.052)" : "linear-gradient(180deg, rgba(125,255,178,.17), rgba(0,0,0,.20))",
                          boxShadow: incoming && !m.readAt ? "0 0 16px rgba(125,255,178,.11)" : "none",
                        }}
                      >
                        <div style={{ color: "#fff", fontSize: 12.7, whiteSpace: "pre-wrap", lineHeight: 1.24 }}>{m?.text || "—"}</div>
                        <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
                          <span style={{ color: "rgba(255,255,255,.48)", fontSize: 10, fontWeight: 800 }}>{asDate(m?.createdAt)}</span>
                          {!incoming ? <span style={{ color: BLUE, fontSize: 11, fontWeight: 1000 }}>✓✓</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          if (menuOpen) {
                            setOpenMessageMenuId("");
                            return;
                          }
                          const rect = event.currentTarget.getBoundingClientRect();
                          const menuWidth = 124;
                          const safePad = 8;
                          const left = incoming
                            ? Math.min(window.innerWidth - menuWidth - safePad, rect.left + 18)
                            : Math.max(safePad, rect.right - menuWidth);
                          const top = Math.min(window.innerHeight - 150, Math.max(safePad, rect.top + 20));
                          setMessageMenuPosition({ top, left, side: incoming ? "left" : "right" });
                          setOpenMessageMenuId(msgId);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: `1px solid ${menuOpen ? BLUE : "rgba(255,255,255,.10)"}`,
                          background: menuOpen ? `${BLUE}18` : "rgba(255,255,255,.035)",
                          color: menuOpen ? BLUE : "rgba(255,255,255,.56)",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          flex: "0 0 auto",
                        }}
                        title="Options du message"
                        aria-label="Options du message"
                      >
                        <MessageMenuIcon size={16} />
                      </button>
                      {menuOpen ? (
                        <div
                          style={{
                            position: "fixed",
                            zIndex: 999999,
                            top: messageMenuPosition.top,
                            left: messageMenuPosition.left,
                            width: 124,
                            border: `1px solid ${BLUE}66`,
                            borderRadius: 12,
                            padding: 3,
                            background: "linear-gradient(180deg, rgba(30,31,38,.99), rgba(14,15,21,.99))",
                            boxShadow: `0 12px 28px rgba(0,0,0,.62), 0 0 16px ${BLUE}22`,
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          {[
                            ["reply", "Répondre"],
                            ["edit", "Éditer"],
                            ["copy", "Copier"],
                            ["share", "Partager"],
                          ].map(([name, label]) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                if (name === "copy") {
                                  navigator.clipboard?.writeText(String(m?.text || "")).catch(() => {});
                                  setInfo("Message copié ✅");
                                } else {
                                  setInfo(`${label} : option prête à câbler.`);
                                }
                                setOpenMessageMenuId("");
                              }}
                              style={{ width: "100%", border: 0, background: "transparent", color: "rgba(255,255,255,.88)", display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 850, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}
                            >
                              <ChatActionIcon name={name as any} /> <span>{label}</span>
                            </button>
                          ))}
                          <div style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "3px 4px" }} />
                          <button
                            type="button"
                            onClick={() => { setOpenMessageMenuId(""); handleDeletePrivateMessage(String(m?.id || "")); }}
                            style={{ width: "100%", border: 0, background: "transparent", color: RED, display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 950, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}
                          >
                            <ChatActionIcon name="delete" /> <span>Supprimer</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyCard icon="💬" title="Aucun message privé" text="Choisis un ami puis envoie ton premier message." />
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: 12, borderTop: `1px solid ${STROKE}`, display: "grid", gap: 8 }}>
              {!chatFullscreen ? (
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
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: chatFullscreen ? "auto 1fr auto auto auto auto" : "1fr auto", gap: 8, alignItems: "end" }}>
                {chatFullscreen ? <RoundMessengerButton title="Emoji" tone={BLUE}><MessengerToolIcon name="smile" /></RoundMessengerButton> : null}
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText((e.target as HTMLTextAreaElement).value)}
                  placeholder={chatFullscreen ? "Écrire un message…" : "Écris ton message…"}
                  rows={chatFullscreen ? 1 : 2}
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
                {chatFullscreen ? <RoundMessengerButton title="Pièce jointe" tone={BLUE}><MessengerToolIcon name="clip" /></RoundMessengerButton> : null}
                {chatFullscreen ? <RoundMessengerButton title="Photo" tone={BLUE}><MessengerToolIcon name="camera" /></RoundMessengerButton> : null}
                {chatFullscreen ? <RoundMessengerButton title="Message vocal" tone={GREEN}><MessengerToolIcon name="mic" /></RoundMessengerButton> : null}
                <ActionButton label="Envoyer" tone={GREEN} onClick={handleSendPrivateMessage} />
              </div>
            </div>
          </div>            </>
          ) : chatMode === "group" ? (
            <div style={cardStyle({ borderColor: "rgba(199,139,255,.30)" })}>
              <SectionTitle title="Groupe" subtitle="Créer un groupe d'amis et discuter ensemble." />
              <EmptyCard icon="👥" title="Groupes d'amis" text="La page est prête : création de groupe, sélection des amis, fil commun et badges seront câblés ici." />
            </div>
          ) : chatMode === "rooms" ? (
            <div style={cardStyle({ borderColor: "rgba(125,255,178,.30)" })}>
              <SectionTitle title="Salon de T'Chat" subtitle="Discuter dans des salons créés online." />
              <EmptyCard icon="💬" title="Salons de T'Chat" text="Les conversations des salons online seront centralisées ici avec accès rapide aux salons actifs." />
            </div>
          ) : (
            <div style={cardStyle({ borderColor: "rgba(255,213,106,.30)" })}>
              <SectionTitle title="Annonces" subtitle="Les joueurs peuvent laisser des annonces visibles de tous." />
              <EmptyCard icon="📣" title="Annonces publiques" text="Mur d'annonces prévu pour organiser une partie, chercher des joueurs ou publier une info visible de tous." />
            </div>
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
          <SectionTitle title="Notifs" subtitle="Notifications téléphone, synchronisation, compte, NAS, sécurité et informations importantes." badge={systemNotifications.length} />
          <div style={cardStyle({ marginBottom: 10, borderColor: notifPermission === "granted" ? "rgba(125,255,178,.38)" : "rgba(255,213,106,.30)" })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 1000, color: "#fff" }}>Notifications téléphone</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,.64)", lineHeight: 1.35 }}>
                  État : <b style={{ color: notifPermission === "granted" ? GREEN : notifPermission === "denied" ? RED : GOLD }}>
                    {notifPermission === "granted" ? "ON" : notifPermission === "denied" ? "OFF / bloquées" : notifPermission === "unsupported" ? "Non supportées" : "OFF"}
                  </b>
                </div>
              </div>
              <ActionButton
                label={notifPermission === "granted" ? "Tester" : "Activer"}
                tone={notifPermission === "granted" ? GREEN : GOLD}
                onClick={activatePhoneNotifications}
              />
            </div>
            {notifPermission === "denied" ? (
              <div style={{ marginTop: 8, color: RED, fontSize: 12 }}>
                Les notifications sont bloquées côté téléphone/navigateur : autorise-les dans les paramètres du site ou de l’application installée.
              </div>
            ) : null}
          </div>
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
