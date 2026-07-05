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
  deleteProfileFriendLink,
  sendPrivateMessage,
  markPrivateMessageRead,
  markPrivateThreadRead,
  deletePrivateMessage,
  editPrivateMessage,
  buildPrivateMessagesStreamUrl,
  startMessengerCall,
  acceptMessengerCall,
  declineMessengerCall,
  endMessengerCall,
  sendMessengerCallSignal,
  listMessengerCallSignals,
  listIncomingMessengerCalls,
  getMessengerCall,
  listMessengerGroups,
  createMessengerGroup,
  updateMessengerGroup,
  deleteMessengerGroup,
  blockOnlineUser,
  type FriendRequest,
  type PrivateMessageItem,
  type OnlineFriendUser,
  type ProfileFriendLink,
  type SharedMatchItem,
  type MessengerGroup,
} from "../lib/friendsApi";
import { markMessageCenterRefreshNeeded, requestMessageNotificationsPermission, showMessageCenterNotification } from "../lib/messageCenterNotify";
import ProfileStarRing from "../components/ProfileStarRing";

type MsgTab = "messages" | "requests" | "shares" | "links" | "invites" | "system";
type ChatMode = "messenger" | "group" | "rooms" | "announces";
type LocalChatGroup = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
  ownerId?: string;
  avatarUrl?: string;
  coverUrl?: string;
  lastMessage?: string;
  messages?: Array<{ id: string; text: string; author: string; createdAt: string; metadata?: any }>;
};
type LocalChatRoom = { id: string; title: string; topic: string; createdAt: string; ttlMinutes: number; members: number; messages?: Array<{ id: string; text: string; author: string; createdAt: string; expiresAt: string }> };
type LocalAnnouncement = { id: string; title: string; text: string; createdAt: string; author?: string; status: "published" | "blocked"; reason?: string };

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
const MESSAGE_TTL_HOURS = 24;
const MESSAGE_TTL_MS = MESSAGE_TTL_HOURS * 60 * 60 * 1000;

// Ref de secours au scope module : évite tout crash ReferenceError si une callback WebRTC
// asynchrone se déclenche hors du cycle React ou depuis une ancienne closure.
const remoteStreamRef: { current: MediaStream | null } = { current: null };


const EMOJI_BANK: Array<{ label: string; items: string[] }> = [
  { label: "Récents", items: ["😀","😃","😄","😁","😆","😂","🤣","😊","😇","🙂","🙃","😉","😍","🥰","😘","😜","🤪","😎","🥳","🤩","😱","😤","😭","😴"] },
  { label: "Réactions", items: ["👍","👎","👏","🙌","🙏","🤝","💪","👌","✌️","🤟","👊","🤘","🫶","🤌","👀","💯","✅","❌","🔥","⚡","💥","✨","⭐","🚀"] },
  { label: "Cœurs", items: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","💌","💋","🌹","🥹","🫠"] },
  { label: "Visages", items: ["😅","😋","😛","😝","🤑","🤗","🤔","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😵‍💫","🤯","🥵","🥶"] },
  { label: "Sport", items: ["🎯","🏆","🥇","🥈","🥉","🏅","⚽","🏀","🏈","🎾","🏓","🎱","🥊","🏁","🏋️","🤾","🚴","🏃","🥅","🎮","🕹️","🧢","👟","🥳"] },
  { label: "Soirée", items: ["🍻","🍺","🥂","🍾","🍷","🍹","🍸","🥃","🍕","🍔","🌭","🥨","🍟","🌮","🎉","🎊","🕺","💃","🤘","🎸","🎧","🎤","🥁","🎵"] },
  { label: "Objets", items: ["📷","🎙️","📎","📌","📍","🔔","🔕","📢","💬","📩","📱","💻","🔒","🔓","🧨","🧲","🛠️","⚙️","🎁","💡","🔋","🕹️","📡","🧭"] },
  { label: "Symboles", items: ["✅","☑️","❎","⚠️","🚫","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🔱","♻️","🔁","🔄","⬆️","⬇️","➡️","⬅️","🔜","🆗","🆕"] },
];

function isLikelyImageDataUrl(value: any): boolean {
  return typeof value === "string" && /^data:image\//i.test(value);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}


function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Lecture audio impossible"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlMimeType(dataUrl?: any): string {
  const m = String(dataUrl || "").match(/^data:([^;,]+)[;,]/i);
  return m?.[1] || "";
}

function isImageMetadata(meta: any): boolean {
  const mime = String(meta?.mimeType || dataUrlMimeType(meta?.dataUrl) || "").toLowerCase();
  return mime.startsWith("image/") || isLikelyImageDataUrl(meta?.dataUrl);
}

function isAudioMetadata(meta: any): boolean {
  const mime = String(meta?.mimeType || dataUrlMimeType(meta?.audioDataUrl || meta?.dataUrl) || "").toLowerCase();
  return mime.startsWith("audio/") || meta?.kind === "voice";
}

function messageTextForDisplay(message: any): string {
  const meta = metadataOfMessage(message);
  if (["photo", "file", "voice", "callInvite"].includes(String(meta.kind || ""))) return "";
  return String(message?.text || "");
}

function mediaLabel(meta: any): string {
  if (meta?.kind === "photo") return "Photo";
  if (meta?.kind === "voice") return "Message vocal";
  if (meta?.kind === "callInvite") return meta?.callType === "video" ? "Appel visio" : "Appel audio";
  if (isImageMetadata(meta)) return "Image";
  if (isAudioMetadata(meta)) return "Audio";
  return "Document";
}

function formatFileSize(bytes?: any): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

async function imageFileToPreviewDataUrl(file: File): Promise<string> {
  const mime = String(file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) return readFileAsDataUrl(file);
  if (typeof document === "undefined" || typeof Image === "undefined") return readFileAsDataUrl(file);
  const rawUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Aperçu image impossible"));
      node.src = rawUrl;
    });
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
    const width = Math.max(1, Math.round((img.width || maxSide) * scale));
    const height = Math.max(1, Math.round((img.height || maxSide) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readFileAsDataUrl(file);
    ctx.drawImage(img, 0, 0, width, height);
    const outputMime = mime === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputMime, 0.82));
    if (!blob) return readFileAsDataUrl(file);
    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(rawUrl);
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "message-piece-jointe";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function metadataOfMessage(message: any): any {
  return message?.metadata && typeof message.metadata === "object" ? message.metadata : {};
}

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

function countryFlagEmoji(countryCode?: any): string {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function userEmail(user?: any): string {
  return String(user?.email || user?.mail || user?.emailNormalized || "").trim();
}

function userAvg3d(user?: any): number {
  const raw = user?.avg3d ?? user?.avg3 ?? user?.stats?.avg3d ?? user?.stats?.avg3 ?? user?.profileStats?.avg3d ?? user?.profileStats?.avg3 ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function userIdOf(user?: any): string {
  return String(user?.userId || user?.id || user?.user_id || "").trim();
}

function userLevelStars(user?: any): number {
  const raw = user?.profileStars ?? user?.profileStarRating ?? user?.stars ?? user?.levelStars ?? user?.level ?? user?.stats?.level ?? 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function userStatNumber(user: any, keys: string[], fallback = 0): number {
  const bags = [user, user?.stats, user?.profileStats, user?.statsMeta, user?.metadata].filter(Boolean);
  for (const bag of bags) {
    for (const key of keys) {
      const n = Number(bag?.[key]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return fallback;
}

function FriendRequestUserCard({
  user,
  tone,
  right,
}: {
  user?: any;
  tone: string;
  right?: React.ReactNode;
}) {
  const flag = countryFlagEmoji(user?.countryCode || user?.country_code);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ position: "relative", width: 66, height: 70, display: "grid", placeItems: "end center" }}>
        <div style={{ position: "absolute", top: -12, left: -6, width: 78, height: 38, pointerEvents: "none" }}>
          <ProfileStarRing anchorSize={56} avg3d={userAvg3d(user)} starSize={8} gapPx={-1} stepDeg={13} animateGlow />
        </div>
        <AvatarBubble user={user} size={56} selected={false} showStatus />
        {flag ? (
          <span
            title={String(user?.country || user?.countryCode || "")}
            style={{
              position: "absolute",
              right: 1,
              bottom: 4,
              width: 24,
              height: 24,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(7,8,12,.94)",
              border: `1px solid ${tone}88`,
              boxShadow: `0 0 12px ${tone}33`,
              fontSize: 15,
            }}
          >
            {flag}
          </span>
        ) : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {asUserName(user)}
        </div>
        <div style={{ marginTop: 2, color: "rgba(255,255,255,.50)", fontSize: 10.8, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail(user) || "Adresse mail non renseignée"}
        </div>
      </div>
      <div style={{ flex: "0 0 auto" }}>{right}</div>
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


function MessengerToolIcon({ name, size = 19 }: { name: "back" | "phone" | "video" | "clip" | "camera" | "mic" | "smile" | "stats" | "send" | "more"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "back") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M15 18 9 12l6-6"/><path {...p} d="M10 12h10"/></svg>;
  if (name === "phone") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.45 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.3-1.25a2 2 0 0 1 2.1-.45c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z"/></svg>;
  if (name === "video") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="6" width="12" height="12" rx="2"/><path {...p} d="m15 10 6-3v10l-6-3"/></svg>;
  if (name === "clip") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.6 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"/></svg>;
  if (name === "camera") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5Z"/><circle {...p} cx="12" cy="13" r="3"/></svg>;
  if (name === "mic") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="9" y="2" width="6" height="12" rx="3"/><path {...p} d="M5 10a7 7 0 0 0 14 0"/><path {...p} d="M12 17v5"/></svg>;
  if (name === "smile") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M8 14s1.5 2 4 2 4-2 4-2"/><path {...p} d="M9 9h.01M15 9h.01"/></svg>;
  if (name === "stats") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 19V5"/><path {...p} d="M4 19h16"/><rect {...p} x="7" y="11" width="3" height="5" rx="1"/><rect {...p} x="12" y="7" width="3" height="9" rx="1"/><rect {...p} x="17" y="9" width="3" height="7" rx="1"/></svg>;
  if (name === "send") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M22 2 11 13"/><path {...p} d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>;
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

function tabButtonStyle(active: boolean, tone: string = GOLD): React.CSSProperties {
  return {
    border: `1px solid ${active ? tone : STROKE}`,
    borderRadius: 18,
    padding: "12px 14px",
    background: active ? `linear-gradient(135deg, ${tone}22, rgba(255,255,255,.045))` : "rgba(255,255,255,.045)",
    color: active ? tone : "rgba(255,255,255,.86)",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: active ? `0 0 22px ${tone}22, inset 0 1px 0 rgba(255,255,255,.12)` : "inset 0 1px 0 rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
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


function LabeledChoiceButton({
  active,
  label,
  badge = 0,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  badge?: number;
  tone: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        minWidth: 0,
        minHeight: 52,
        border: `1px solid ${active ? `${tone}cc` : STROKE}`,
        borderRadius: 16,
        padding: "8px 10px",
        color: active ? tone : "rgba(255,255,255,.82)",
        background: active ? `radial-gradient(110% 120% at 50% 0%, ${tone}30, rgba(255,255,255,.055) 62%, rgba(0,0,0,.30))` : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
        fontWeight: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: active ? `0 -5px 18px ${tone}38, 0 0 18px ${tone}20` : "inset 0 1px 0 rgba(255,255,255,.06)",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>{children}</span>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{label}</span>
      {badge > 0 ? <span style={{ position: "absolute", top: -7, right: -5, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: tone, color: "#111", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 1000, boxShadow: `0 0 14px ${tone}88` }}>{badge > 99 ? "99+" : badge}</span> : null}
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


function loadLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalJson(key: string, value: any) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

type MessageCenterCacheData = {
  ts: number;
  friends: OnlineFriendUser[];
  friendRequests: FriendRequest[];
  sharedMatches: SharedMatchItem[];
  profileLinks: ProfileFriendLink[];
  privateMessages: PrivateMessageItem[];
  groups?: LocalChatGroup[];
};

const MESSAGE_CENTER_CACHE_KEY = "ms_message_center_cache_v2";
const MESSAGE_CENTER_CACHE_TTL_MS = 45_000;
let messageCenterMemoryCache: MessageCenterCacheData | null = null;

function loadMessageCenterCache(): MessageCenterCacheData | null {
  if (messageCenterMemoryCache) return messageCenterMemoryCache;
  const cached = loadLocalJson<MessageCenterCacheData | null>(MESSAGE_CENTER_CACHE_KEY, null);
  if (!cached || typeof cached.ts !== "number") return null;
  messageCenterMemoryCache = cached;
  return cached;
}

function saveMessageCenterCache(data: MessageCenterCacheData) {
  messageCenterMemoryCache = data;
  saveLocalJson(MESSAGE_CENTER_CACHE_KEY, data);
}

function mergeGroupsById(primary: LocalChatGroup[], fallback: LocalChatGroup[]) {
  const map = new Map<string, LocalChatGroup>();
  for (const group of fallback || []) {
    if (group?.id) map.set(String(group.id), group);
  }
  for (const group of primary || []) {
    if (group?.id) map.set(String(group.id), { ...(map.get(String(group.id)) || {}), ...group });
  }
  return Array.from(map.values()).sort((a, b) => (Date.parse(String(b.createdAt || "")) || 0) - (Date.parse(String(a.createdAt || "")) || 0));
}

function normalizeMessengerGroup(group: any): LocalChatGroup {
  return {
    id: String(group?.id || group?.groupId || `grp_${Date.now()}`),
    name: String(group?.name || group?.title || "Groupe Messenger"),
    memberIds: Array.isArray(group?.memberIds) ? group.memberIds.map((x: any) => String(x)).filter(Boolean) : [],
    createdAt: String(group?.createdAt || group?.created_at || new Date().toISOString()),
    ownerId: String(group?.ownerId || group?.owner_user_id || ""),
    avatarUrl: group?.avatarUrl || group?.avatar_url || "",
    coverUrl: group?.coverUrl || group?.cover_url || "",
    lastMessage: group?.lastMessage || group?.last_message || "",
    messages: Array.isArray(group?.messages) ? group.messages : [],
  };
}

function guardAnnouncement(title: string, text: string): { ok: boolean; reason?: string } {
  return guardCommunityContent(`${title} ${text}`, "Annonce");
}

function guardCommunityContent(text: string, kind = "Message"): { ok: boolean; reason?: string } {
  const raw = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const forbidden = [
    "sexe", "sexuel", "porn", "porno", "nude", "nu ", "nue", "demoiselle", "jeune fille",
    "pute", "salope", "encule", "encu", "fdp", "connard", "conasse", "batard",
    "raciste", "haine", "menace", "violence", "drogue", "cannabis", "cocaine",
    "arnaque", "casino", "crypto", "telegram", "snap", "whatsapp",
  ];
  const hit = forbidden.find((w) => raw.includes(w));
  if (hit) return { ok: false, reason: `${kind} bloqué par IA Admin : contenu interdit détecté.` };
  if (raw.trim().length < 2) return { ok: false, reason: `${kind} trop court.` };
  return { ok: true };
}

function SectionTitle({ title, subtitle, badge, tone = GOLD }: { title: string; subtitle?: string; badge?: number; tone?: string }) {
  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center", gap: 3, margin: "12px 0 10px", textAlign: "center", padding: "0 34px" }}>
      <div style={{ fontSize: 18, fontWeight: 1000, color: tone, textShadow: `0 0 16px ${tone}55` }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)", marginTop: 2, maxWidth: 420 }}>{subtitle}</div> : null}
      {typeof badge === "number" ? <span style={{ position: "absolute", right: 0, top: 0 }}><Pill tone={badge > 0 ? tone : "rgba(255,255,255,.45)"}>{badge}</Pill></span> : null}
    </div>
  );
}

export default function MessagesPage({ store, update, go }: Props) {
  const cachedAtBoot = React.useMemo(() => loadMessageCenterCache(), []);
  const [active, setActive] = React.useState<MsgTab>("messages");
  const [chatMode, setChatMode] = React.useState<ChatMode>("messenger");
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [requestView, setRequestView] = React.useState<"received" | "sent">("received");
  const [linkView, setLinkView] = React.useState<"received" | "sent">("received");
  const [shareView, setShareView] = React.useState<"received" | "sent">("received");
  const [inviteView, setInviteView] = React.useState<"received" | "sent">("received");
  const [groupPanel, setGroupPanel] = React.useState<"create" | "list">("create");
  const [friendSearch, setFriendSearch] = React.useState("");
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = React.useState("");
  const [newGroupCoverUrl, setNewGroupCoverUrl] = React.useState("");
  const [groupFriendPickerOpen, setGroupFriendPickerOpen] = React.useState(false);
  const [groupAddMemberOpen, setGroupAddMemberOpen] = React.useState(false);
  const [groupEmojiOpen, setGroupEmojiOpen] = React.useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [groups, setGroups] = React.useState<LocalChatGroup[]>(() => mergeGroupsById(cachedAtBoot?.groups || [], loadLocalJson<LocalChatGroup[]>("ms_message_groups_v1", [])));
  const [newRoomTitle, setNewRoomTitle] = React.useState("");
  const [newRoomTopic, setNewRoomTopic] = React.useState("");
  const [rooms, setRooms] = React.useState<LocalChatRoom[]>(() => loadLocalJson<LocalChatRoom[]>("ms_message_rooms_v1", []));
  const [announcementTitle, setAnnouncementTitle] = React.useState("");
  const [announcementText, setAnnouncementText] = React.useState("");
  const [announcements, setAnnouncements] = React.useState<LocalAnnouncement[]>(() => loadLocalJson<LocalAnnouncement[]>("ms_message_announcements_v1", []));
  const [conversationOptionsOpen, setConversationOptionsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [friends, setFriends] = React.useState<OnlineFriendUser[]>(() => cachedAtBoot?.friends || []);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>(() => cachedAtBoot?.friendRequests || []);
  const [sharedMatches, setSharedMatches] = React.useState<SharedMatchItem[]>(() => cachedAtBoot?.sharedMatches || []);
  const [profileLinks, setProfileLinks] = React.useState<ProfileFriendLink[]>(() => cachedAtBoot?.profileLinks || []);
  const [privateMessages, setPrivateMessages] = React.useState<PrivateMessageItem[]>(() => cachedAtBoot?.privateMessages || []);
  const [messageToUserId, setMessageToUserId] = React.useState("");
  const [messageText, setMessageText] = React.useState("");
  const [replyToMessage, setReplyToMessage] = React.useState<PrivateMessageItem | null>(null);
  const [editingMessageId, setEditingMessageId] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [conversationPanel, setConversationPanel] = React.useState<{ type: string; title: string; text: string; metadata?: any; mediaUrl?: string } | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [selectedThreadUserId, setSelectedThreadUserId] = React.useState("");
  const [chatFullscreen, setChatFullscreen] = React.useState(false);
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [selectedRoomId, setSelectedRoomId] = React.useState("");
  const [communityText, setCommunityText] = React.useState("");
  const [renamingGroupId, setRenamingGroupId] = React.useState("");
  const [renameGroupValue, setRenameGroupValue] = React.useState("");
  const [openMessageMenuId, setOpenMessageMenuId] = React.useState("");
  const [messageMenuPosition, setMessageMenuPosition] = React.useState<{ top: number; left: number; side: "left" | "right" }>({ top: 0, left: 0, side: "right" });
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const attachInputRef = React.useRef<HTMLInputElement | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const groupAvatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const groupCoverInputRef = React.useRef<HTMLInputElement | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recorderChunksRef = React.useRef<Blob[]>([]);
  const recorderStartedAtRef = React.useRef<number>(0);
  const callStreamRef = React.useRef<MediaStream | null>(null);
  const callVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const peerRef = React.useRef<any>(null);
  const activeCallRef = React.useRef<any>(null);
  const callSignalsAfterRef = React.useRef<string>("");
  const callSignalTimerRef = React.useRef<number | null>(null);
  const processedSignalIdsRef = React.useRef<Set<string>>(new Set());
  const selectedThreadUserIdRef = React.useRef("");
  const chatFullscreenRef = React.useRef(false);
  const activeRef = React.useRef<MsgTab>("messages");
  const [activeCall, setActiveCall] = React.useState<any>(null);
  const [incomingCallNotice, setIncomingCallNotice] = React.useState<any>(null);
  const [remoteStreamTick, setRemoteStreamTick] = React.useState(0);
  const sendingPrivateRef = React.useRef(false);
  const incomingCallPollBusyRef = React.useRef(false);
  const notifiedIncomingCallIdsRef = React.useRef<Set<string>>(new Set());
  const ringingAudioRef = React.useRef<{ ctx?: AudioContext; stop?: () => void } | null>(null);
  const ringVibrateTimerRef = React.useRef<number | null>(null);

  const currentAccountId = String(store?.user?.id || store?.account?.id || store?.auth?.user?.id || store?.activeUser?.id || store?.profile?.userId || store?.activeProfile?.userId || "me").trim() || "me";

  React.useEffect(() => { selectedThreadUserIdRef.current = selectedThreadUserId; }, [selectedThreadUserId]);
  React.useEffect(() => { chatFullscreenRef.current = chatFullscreen; }, [chatFullscreen]);
  React.useEffect(() => { activeRef.current = active; }, [active]);
  React.useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

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

  React.useEffect(() => {
    return () => {
      try { recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop()); } catch {}
      try { callStreamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch {}
    };
  }, []);

  React.useEffect(() => saveLocalJson("ms_message_groups_v1", groups), [groups]);
  React.useEffect(() => saveLocalJson("ms_message_rooms_v1", rooms), [rooms]);
  React.useEffect(() => saveLocalJson("ms_message_announcements_v1", announcements), [announcements]);

  React.useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    setRecordingSeconds(Math.max(1, Math.round((Date.now() - Number(recorderStartedAtRef.current || Date.now())) / 1000)));
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.max(1, Math.round((Date.now() - Number(recorderStartedAtRef.current || Date.now())) / 1000)));
    }, 300);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  React.useEffect(() => {
    const video = callVideoRef.current;
    if (!video || conversationPanel?.type !== "video") return;
    try {
      video.srcObject = callStreamRef.current;
      const playResult = video.play?.();
      if (playResult && typeof (playResult as Promise<void>).catch === "function") {
        (playResult as Promise<void>).catch(() => {});
      }
    } catch {}
  }, [conversationPanel?.type]);


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

  const sentSalonInvites = React.useMemo(() => {
    const raw = Array.isArray(store?.onlineSentInvites) ? store.onlineSentInvites : Array.isArray(store?.sentOnlineInvites) ? store.sentOnlineInvites : [];
    return raw;
  }, [store?.onlineSentInvites, store?.sentOnlineInvites]);

  const systemNotifications = React.useMemo(() => {
    const raw = Array.isArray(store?.notifications) ? store.notifications : [];
    return raw;
  }, [store?.notifications]);

  const incomingFriendRequests = friendRequests.filter((r) => r.direction !== "outgoing" && String(r.status || "pending") === "pending");
  const outgoingFriendRequests = friendRequests.filter((r) => r.direction === "outgoing" && String(r.status || "pending") === "pending");
  const incomingShares = sharedMatches.filter((s) => s.direction !== "outgoing");
  const outgoingShares = sharedMatches.filter((s) => s.direction === "outgoing");
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

  const allMessengerContacts = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const friend of friends as any[]) {
      const id = userIdOf(friend);
      if (id) map.set(id, { ...(friend || {}), id, userId: id, fromFriendList: true });
    }
    for (const thread of messageThreads as any[]) {
      const id = String(thread.id || "").trim();
      if (!id) continue;
      map.set(id, { ...(thread.user || {}), ...(map.get(id) || {}), id, userId: id, thread });
    }
    return Array.from(map.values()).sort((a: any, b: any) => {
      const ta = Number(a?.thread?.lastAt || 0);
      const tb = Number(b?.thread?.lastAt || 0);
      if (tb !== ta) return tb - ta;
      const sa = presenceState(a?.status || a?.presenceStatus).key === "online" ? 1 : 0;
      const sb = presenceState(b?.status || b?.presenceStatus).key === "online" ? 1 : 0;
      if (sb !== sa) return sb - sa;
      return asUserName(a).localeCompare(asUserName(b), "fr");
    });
  }, [friends, messageThreads]);

  const normalizedFriendSearch = friendSearch.trim().toLowerCase();
  const matchesFriendSearch = React.useCallback((user: any) => {
    if (!normalizedFriendSearch) return true;
    return `${asUserName(user)} ${userEmail(user)}`.toLowerCase().includes(normalizedFriendSearch);
  }, [normalizedFriendSearch]);
  const filteredIncomingFriendRequests = incomingFriendRequests.filter((r) => matchesFriendSearch(r.fromUser));
  const filteredOutgoingFriendRequests = outgoingFriendRequests.filter((r) => matchesFriendSearch(r.toUser));
  const linkedAccepted = profileLinks.filter((l) => String(l.status || "pending").toLowerCase() === "accepted");

  function toggleGroupMember(id: string) {
    setSelectedGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function createGroup() {
    const name = newGroupName.trim() || `Groupe ${groups.length + 1}`;
    if (selectedGroupIds.length < 2) { setError("Sélectionne au moins 2 amis pour créer un groupe."); return; }
    const tempId = `grp_tmp_${Date.now()}`;
    const group: LocalChatGroup = {
      id: tempId,
      name,
      memberIds: selectedGroupIds,
      createdAt: new Date().toISOString(),
      ownerId: currentAccountId,
      avatarUrl: newGroupAvatarUrl || "",
      coverUrl: newGroupCoverUrl || "",
      lastMessage: "Groupe créé",
    };
    setGroups((prev) => [group, ...prev]);
    setNewGroupName("");
    setNewGroupAvatarUrl("");
    setNewGroupCoverUrl("");
    setSelectedGroupIds([]);
    setInfo("Groupe créé ✅");
    try {
      const saved = await createMessengerGroup({ name, memberIds: group.memberIds, avatarUrl: group.avatarUrl || "", coverUrl: group.coverUrl || "" });
      const normalized = normalizeMessengerGroup(saved);
      setGroups((prev) => prev.map((g) => g.id === tempId ? { ...g, ...normalized } : g));
      const cached = loadMessageCenterCache();
      if (cached) saveMessageCenterCache({ ...cached, groups: mergeGroupsById([normalized], (cached.groups || []).filter((g) => g.id !== tempId)) });
    } catch (e: any) {
      setError(`Groupe créé localement, mais non sauvegardé NAS : ${e?.message || String(e)}`);
    }
  }

  function createRoom() {
    const title = newRoomTitle.trim();
    if (!title) { setError("Nom du salon requis."); return; }
    const room: LocalChatRoom = { id: `room_${Date.now()}`, title, topic: newRoomTopic.trim() || "Discussion libre", createdAt: new Date().toISOString(), ttlMinutes: 10, members: 1 };
    setRooms((prev) => [room, ...prev]);
    setNewRoomTitle("");
    setNewRoomTopic("");
    setInfo("Salon créé — messages éphémères 10 min ✅");
  }

  function publishAnnouncement() {
    const title = announcementTitle.trim();
    const text = announcementText.trim();
    const guard = guardAnnouncement(title, text);
    const item: LocalAnnouncement = { id: `ann_${Date.now()}`, title: title || "Annonce", text: text || "—", createdAt: new Date().toISOString(), author: store?.profile?.displayName || store?.activeProfile?.name || "Moi", status: guard.ok ? "published" : "blocked", reason: guard.reason };
    setAnnouncements((prev) => [item, ...prev].slice(0, 50));
    if (guard.ok) { setAnnouncementTitle(""); setAnnouncementText(""); setInfo("Annonce publiée ✅"); }
    else setError(guard.reason || "Annonce bloquée par IA Admin.");
  }

  function deleteAnnouncement(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setInfo("Annonce supprimée ✅");
  }

  function openGroupChat(groupId: string) {
    setSelectedGroupId(groupId);
    setSelectedRoomId("");
    setSelectedThreadUserId("");
    setCommunityText("");
    setChatFullscreen(true);
    setInfo(null);
    setError(null);
  }

  function openRoomChat(roomId: string) {
    setSelectedRoomId(roomId);
    setSelectedGroupId("");
    setSelectedThreadUserId("");
    setCommunityText("");
    setChatFullscreen(true);
    setInfo(null);
    setError(null);
  }

  function sendGroupMessage() {
    const text = communityText.trim();
    const guard = guardCommunityContent(text, "Message de groupe");
    if (!guard.ok) { setError(guard.reason || "Message bloqué par IA Admin."); return; }
    setGroups((prev) => prev.map((g) => g.id === selectedGroupId ? { ...g, lastMessage: text, messages: [...(g.messages || []), { id: `gmsg_${Date.now()}`, text, author: "Moi", createdAt: new Date().toISOString() }] } : g));
    setCommunityText("");
    setInfo(null);
    setError(null);
  }

  function sendRoomMessage() {
    const text = communityText.trim();
    const guard = guardCommunityContent(text, "Message de salon");
    if (!guard.ok) { setError(guard.reason || "Message bloqué par IA Admin."); return; }
    const now = Date.now();
    setRooms((prev) => prev.map((r) => {
      if (r.id !== selectedRoomId) return r;
      const ttl = Math.max(5, Math.min(10, Number(r.ttlMinutes || 10)));
      const alive = (r.messages || []).filter((m) => Date.parse(m.expiresAt || "") > now);
      return { ...r, messages: [...alive, { id: `rmsg_${now}`, text, author: "Moi", createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttl * 60_000).toISOString() }] };
    }));
    setCommunityText("");
    setInfo(null);
    setError(null);
  }

  function startRenameGroup(group: LocalChatGroup) {
    setRenamingGroupId(group.id);
    setRenameGroupValue(group.name || "");
  }

  async function saveRenameGroup() {
    const nextName = renameGroupValue.trim();
    if (!renamingGroupId || !nextName) return;
    const groupId = renamingGroupId;
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name: nextName } : g));
    setRenamingGroupId("");
    setRenameGroupValue("");
    setInfo("Groupe renommé ✅");
    try { await updateMessengerGroup(groupId, { name: nextName }); } catch {}
  }

  async function readGroupMediaFile(kind: "avatar" | "cover", file?: File | null, groupId?: string) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (groupId) {
        setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, [kind === "avatar" ? "avatarUrl" : "coverUrl"]: dataUrl } : g));
        setInfo(kind === "avatar" ? "Avatar du groupe mis à jour ✅" : "Couverture du groupe mise à jour ✅");
        updateMessengerGroup(groupId, kind === "avatar" ? { avatarUrl: dataUrl } : { coverUrl: dataUrl }).catch(() => {});
      } else if (kind === "avatar") {
        setNewGroupAvatarUrl(dataUrl);
      } else {
        setNewGroupCoverUrl(dataUrl);
      }
    } catch (e: any) {
      setError(e?.message || "Image groupe impossible à charger.");
    }
  }

  function addMemberToSelectedGroup(memberId: string) {
    if (!selectedGroupId || !memberId) return;
    const nextGroup = groups.find((g) => g.id === selectedGroupId);
    const nextMemberIds = Array.from(new Set([...(nextGroup?.memberIds || []), memberId]));
    setGroups((prev) => prev.map((g) => g.id === selectedGroupId ? { ...g, memberIds: nextMemberIds } : g));
    updateMessengerGroup(selectedGroupId, { memberIds: nextMemberIds }).catch(() => {});
    setInfo("Membre ajouté au groupe ✅");
  }

  async function removeGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const isOwner = (group.ownerId || currentAccountId) === currentAccountId;
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedGroupId === groupId) { setSelectedGroupId(""); setChatFullscreen(false); }
    setInfo(isOwner ? "Groupe supprimé ✅" : "Groupe quitté ✅");
    try { await deleteMessengerGroup(groupId); } catch {}
  }

  function sendGroupAttachment(kind: "photo" | "file" | "voice" | "stats") {
    if (!selectedGroupId) return;
    const label = kind === "photo" ? "📷 Photo" : kind === "file" ? "📎 Pièce jointe" : kind === "voice" ? "🎙️ Message vocal" : "📊 Comparateur de stats";
    setGroups((prev) => prev.map((g) => g.id === selectedGroupId ? { ...g, lastMessage: label, messages: [...(g.messages || []), { id: `gmsg_${Date.now()}`, text: label, author: "Moi", createdAt: new Date().toISOString(), metadata: { kind } }] } : g));
    setInfo("Élément envoyé ✅");
  }

  const selectedThreadBase = messageThreads.find((t) => t.id === selectedThreadUserId) || null;
  const selectedFriend = selectedThreadUserId ? friends.find((f: any) => userIdOf(f) === String(selectedThreadUserId)) : null;
  const selectedThread = selectedThreadBase
    ? { ...selectedThreadBase, user: { ...(selectedThreadBase.user || {}), ...(selectedFriend || {}) } }
    : selectedFriend
      ? { id: userIdOf(selectedFriend), user: selectedFriend, messages: [] as PrivateMessageItem[], unread: 0, lastAt: 0 }
      : null;
  const displayedMessages = React.useMemo(() => {
    const base = selectedThread ? (selectedThread.messages || []) : [];
    const minTs = Date.now() - MESSAGE_TTL_MS;
    return base.filter((m: any) => {
      const ts = Date.parse(String(m?.createdAt || ""));
      return !Number.isFinite(ts) || ts >= minTs;
    });
  }, [selectedThread?.id, selectedThread?.messages]);

  const counters = {
    // À TRAITER = uniquement ce qui arrive chez le compte actif.
    // Les éléments envoyés ne doivent plus gonfler le badge global ni la pastille BottomNav.
    messages: unreadPrivateMessages,
    requests: incomingFriendRequests.length,
    shares: incomingShares.filter((s) => String(s.status || "pending") === "pending").length,
    links: incomingProfileLinks.filter((l) => String(l.status || "pending") === "pending").length,
    invites: salonInvites.length,
    system: systemNotifications.length,
  };

  const totalPending = counters.messages + counters.requests + counters.shares + counters.links + counters.invites + counters.system;

  React.useEffect(() => {
    // Synchronise immédiatement le compteur de cette page avec la BottomNav.
    // Comme ça, À TRAITER et le badge Messages en bas affichent toujours la même valeur.
    broadcastMessageBadge(totalPending);
  }, [totalPending]);

  const hasVisibleMessageData = friends.length > 0 || friendRequests.length > 0 || sharedMatches.length > 0 || profileLinks.length > 0 || privateMessages.length > 0 || groups.length > 0;

  const loadAll = React.useCallback(async (force = false) => {
    const cached = loadMessageCenterCache();
    const cacheFresh = !!cached && Date.now() - cached.ts < MESSAGE_CENTER_CACHE_TTL_MS;

    if (cached && !hasVisibleMessageData) {
      setFriends(Array.isArray(cached.friends) ? cached.friends : []);
      setFriendRequests(Array.isArray(cached.friendRequests) ? cached.friendRequests : []);
      setSharedMatches(Array.isArray(cached.sharedMatches) ? cached.sharedMatches : []);
      setProfileLinks(Array.isArray(cached.profileLinks) ? cached.profileLinks : []);
      setPrivateMessages(Array.isArray(cached.privateMessages) ? cached.privateMessages : []);
      if (Array.isArray(cached.groups) && cached.groups.length) setGroups((prev) => mergeGroupsById(cached.groups || [], prev || []));
    }

    const cachedHasUsefulData = !!cached && (
      (cached.friends?.length || 0) > 0 ||
      (cached.privateMessages?.length || 0) > 0 ||
      (cached.friendRequests?.length || 0) > 0 ||
      (cached.sharedMatches?.length || 0) > 0 ||
      (cached.profileLinks?.length || 0) > 0 ||
      ((cached.groups || []).length) > 0
    );

    // Si le cache est vide, on ne le considère jamais comme fiable : sinon l'écran peut rester
    // bloqué sur « Aucun ami / Aucun groupe » jusqu'à expiration du cache.
    if (!force && cacheFresh && cachedHasUsefulData) {
      setLoading(false);
      return;
    }

    if (!cached && !hasVisibleMessageData) setLoading(true);
    setError(null);
    try {
      const friendsPromise = listFriends()
        .then((items) => { const safe = Array.isArray(items) ? items : []; setFriends(safe); return safe; })
        .catch(() => cached?.friends || []);
      const requestsPromise = listFriendRequests()
        .then((items) => { const safe = Array.isArray(items) ? items : []; setFriendRequests(safe); return safe; })
        .catch(() => cached?.friendRequests || []);
      const sharesPromise = listSharedMatches()
        .then((items) => { const safe = Array.isArray(items) ? items : []; setSharedMatches(safe); return safe; })
        .catch(() => cached?.sharedMatches || []);
      const linksPromise = listProfileFriendLinks()
        .then((items) => { const safe = Array.isArray(items) ? items : []; setProfileLinks(safe); return safe; })
        .catch(() => cached?.profileLinks || []);
      const messagesPromise = listPrivateMessages()
        .then((items) => { const safe = Array.isArray(items) ? items : []; setPrivateMessages(safe); return safe; })
        .catch(() => cached?.privateMessages || []);
      const groupsPromise = listMessengerGroups()
        .then((items) => {
          const safe = mergeGroupsById((Array.isArray(items) ? items : []).map(normalizeMessengerGroup), loadLocalJson<LocalChatGroup[]>("ms_message_groups_v1", []));
          setGroups(safe);
          return safe;
        })
        .catch(() => cached?.groups || loadLocalJson<LocalChatGroup[]>("ms_message_groups_v1", []));

      // Les amis/groupes sont appliqués dès que leur requête finit, sans attendre les messages/pièces jointes.
      const [nextFriends, nextRequests, nextShares, nextLinks, nextMessages, normalizedGroups] = await Promise.all([
        friendsPromise, requestsPromise, sharesPromise, linksPromise, messagesPromise, groupsPromise,
      ]);
      const nextCache: MessageCenterCacheData = {
        ts: Date.now(),
        friends: Array.isArray(nextFriends) ? nextFriends : [],
        friendRequests: Array.isArray(nextRequests) ? nextRequests : [],
        sharedMatches: Array.isArray(nextShares) ? nextShares : [],
        profileLinks: Array.isArray(nextLinks) ? nextLinks : [],
        privateMessages: Array.isArray(nextMessages) ? nextMessages : [],
        groups: Array.isArray(normalizedGroups) ? normalizedGroups : [],
      };
      saveMessageCenterCache(nextCache);
      markMessageCenterRefreshNeeded();
    } catch (e: any) {
      if (!cached) setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [hasVisibleMessageData]);

  React.useEffect(() => {
    loadAll(false).catch(() => {});
  }, [loadAll]);

  React.useEffect(() => {
    // Affichage Messenger : on force une vraie synchro rapide quand l'écran Messages s'ouvre.
    // Ça évite qu'un cache vide ou un timeout NAS masque les amis/groupes pendant plusieurs minutes.
    if (active !== "messages") return;
    const t1 = window.setTimeout(() => loadAll(true).catch(() => {}), 250);
    const t2 = window.setTimeout(() => loadAll(true).catch(() => {}), 1800);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [active, loadAll]);


  React.useEffect(() => {
    if (!selectedThreadUserId && messageThreads.length) {
      setSelectedThreadUserId(messageThreads[0].id);
    }
  }, [messageThreads, selectedThreadUserId]);

  React.useEffect(() => {
    // Ne marque pas les messages comme lus tant qu'on est sur la racine T'Chat.
    // Le badge doit rester visible sur l'icône Messenger ET sur l'avatar de l'ami.
    if (active !== "messages" || !chatFullscreen || !selectedThread?.id) return;
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
  }, [active, chatFullscreen, selectedThread?.id, selectedThread?.messages, totalPending]);

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
      await loadAll(true);
      markMessageCenterRefreshNeeded();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function appendOptimisticOutgoingMessage(toUserId: string, text: string, metadata?: any) {
    const now = new Date().toISOString();
    const user = selectedThread?.user || friends.find((f: any) => userIdOf(f) === toUserId) || { id: toUserId, userId: toUserId, displayName: "Ami" };
    const optimistic: any = {
      id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      direction: "outgoing",
      toUserId,
      toUser: user,
      text,
      metadata: metadata || {},
      createdAt: now,
      optimistic: true,
    };
    setPrivateMessages((prev) => [...prev, optimistic as any]);
    return optimistic.id;
  }

  function mergeRealtimePrivateMessages(items: any[]) {
    if (!Array.isArray(items) || !items.length) return;
    setPrivateMessages((prev: any[]) => {
      const map = new Map<string, any>();
      for (const old of prev || []) {
        const id = String(old?.id || "");
        if (id) map.set(id, old);
      }
      for (const item of items) {
        const id = String(item?.id || "");
        if (!id) continue;
        const old = map.get(id) || {};
        map.set(id, { ...old, ...item, metadata: item?.metadata || old?.metadata || {} });
      }
      return Array.from(map.values()).sort((a: any, b: any) => (Date.parse(String(a?.createdAt || "")) || 0) - (Date.parse(String(b?.createdAt || "")) || 0)) as any;
    });
    markMessageCenterRefreshNeeded();
  }

  function friendSnapshotById(userId: string) {
    const id = String(userId || "").trim();
    if (!id) return null;
    return (friends as any[]).find((f: any) => userIdOf(f) === id) || null;
  }

  function stopIncomingCallRinging() {
    try { ringingAudioRef.current?.stop?.(); } catch {}
    try { ringingAudioRef.current?.ctx?.close?.(); } catch {}
    ringingAudioRef.current = null;
    if (ringVibrateTimerRef.current) {
      window.clearInterval(ringVibrateTimerRef.current);
      ringVibrateTimerRef.current = null;
    }
    try { navigator.vibrate?.(0); } catch {}
  }

  function startIncomingCallRinging() {
    if (ringingAudioRef.current) return;
    try {
      navigator.vibrate?.([700, 250, 700, 650]);
      ringVibrateTimerRef.current = window.setInterval(() => {
        try { navigator.vibrate?.([700, 250, 700, 650]); } catch {}
      }, 2600);
    } catch {}
    try {
      const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ctx.destination);
      let stopped = false;
      const beep = () => {
        if (stopped) return;
        try {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = 880;
          osc.connect(gain);
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.11, now + 0.03);
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.42);
          osc.start(now);
          osc.stop(now + 0.46);
        } catch {}
        window.setTimeout(beep, 1100);
      };
      beep();
      ringingAudioRef.current = { ctx, stop: () => { stopped = true; } };
    } catch {}
  }

  function noticeIncomingCall(callLike: any, sourceMessage?: any) {
    const call = callLike?.call || callLike || {};
    const callId = String(call?.id || call?.callId || callLike?.callId || sourceMessage?.metadata?.callId || "").trim();
    if (!callId) return;
    const callType = String(call?.callType || call?.type || callLike?.callType || sourceMessage?.metadata?.callType || "audio") === "video" ? "video" : "audio";
    const status = String(call?.status || callLike?.status || sourceMessage?.metadata?.status || "ringing").toLowerCase();
    if (status && !["ringing", "pending", "calling"].includes(status)) return;
    const expiresRaw = String(call?.expiresAt || callLike?.expiresAt || sourceMessage?.metadata?.expiresAt || "");
    if (expiresRaw && Number.isFinite(Date.parse(expiresRaw)) && Date.parse(expiresRaw) < Date.now()) return;
    const fromUserId = String(call?.callerUserId || callLike?.fromUserId || sourceMessage?.fromUserId || sourceMessage?.fromUser?.id || sourceMessage?.fromUser?.userId || "").trim();
    if (fromUserId && fromUserId === String(currentAccountId || "")) return;
    const friend = friendSnapshotById(fromUserId) || sourceMessage?.fromUser || call?.caller || {};
    const syntheticMessage = sourceMessage || {
      id: `incoming_call_${callId}`,
      text: callType === "video" ? "📹 Demande de visio" : "📞 Demande d’appel audio",
      body: callType === "video" ? "📹 Demande de visio" : "📞 Demande d’appel audio",
      direction: "incoming",
      fromUserId,
      toUserId: currentAccountId,
      fromUser: { ...(friend || {}), id: fromUserId, userId: fromUserId },
      metadata: { kind: "callInvite", callId, callType, status: "ringing", bridge: "online-call-signaling-v1" },
      createdAt: call?.createdAt || callLike?.createdAt || new Date().toISOString(),
      readAt: null,
    };
    setPrivateMessages((prev: any[]) => {
      const already = (prev || []).some((m: any) => String(metadataOfMessage(m)?.callId || "") === callId || String(m?.id || "") === String(syntheticMessage.id || ""));
      if (already) return prev as any;
      return [...prev, syntheticMessage as any] as any;
    });
    setIncomingCallNotice({ callId, callType, fromUserId, call, message: syntheticMessage, fromUser: friend });
    startIncomingCallRinging();
    if (!notifiedIncomingCallIdsRef.current.has(callId)) {
      notifiedIncomingCallIdsRef.current.add(callId);
      setInfo(`${callType === "video" ? "Visio" : "Appel audio"} entrant de ${asUserName(friend || sourceMessage?.fromUser || {})}`);
      try { showMessageCenterNotification(callType === "video" ? "Visio entrante" : "Appel audio entrant", `Appel de ${asUserName(friend || sourceMessage?.fromUser || {})}`); } catch {}
    }
    if (fromUserId && !selectedThreadUserIdRef.current) {
      setSelectedThreadUserId(fromUserId);
      setMessageToUserId(fromUserId);
    }
    markMessageCenterRefreshNeeded();
  }



  function upsertRealtimePrivateMessage(message: any) {
    if (!message?.id) return;
    setPrivateMessages((prev: any[]) => {
      const id = String(message.id || "");
      const existingIndex = prev.findIndex((m: any) => String(m?.id || "") === id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...message, metadata: message.metadata || next[existingIndex]?.metadata || {} } as any;
        return next as any;
      }
      // Remplace aussi un optimistic temporaire très proche si le serveur renvoie l'élément final.
      const msgTo = String(message?.toUserId || message?.toUser?.id || message?.toUser?.userId || "");
      const msgText = String(message?.text || message?.body || "");
      const tmpIndex = prev.findIndex((m: any) => String(m?.id || "").startsWith("tmp_") && String(m?.toUserId || m?.toUser?.id || "") === msgTo && String(m?.text || "") === msgText);
      if (tmpIndex >= 0) {
        const next = [...prev];
        next[tmpIndex] = { ...message, metadata: message.metadata || next[tmpIndex]?.metadata || {} } as any;
        return next as any;
      }
      return [...prev, message as any] as any;
    });

    const meta = metadataOfMessage(message);
    const incoming = message?.direction !== "outgoing";
    if (incoming && meta?.kind === "callInvite") {
      noticeIncomingCall({ callId: meta.callId, callType: meta.callType, fromUserId: message?.fromUserId || message?.fromUser?.id || message?.fromUser?.userId }, message);
    } else if (incoming && (!chatFullscreenRef.current || selectedThreadUserIdRef.current !== String(message?.fromUserId || message?.fromUser?.id || ""))) {
      try { showMessageCenterNotification("Nouveau message", `${asUserName(message?.fromUser || {})} t'a envoyé un élément.`); } catch {}
    }
    markMessageCenterRefreshNeeded();
  }

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    let es: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let closed = false;
    const connect = () => {
      try {
        const url = buildPrivateMessagesStreamUrl();
        if (!url) return;
        es = new EventSource(url);
        es.addEventListener("message:created", (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data || "{}"));
            if (data?.message) upsertRealtimePrivateMessage(data.message);
            const meta = data?.message ? metadataOfMessage(data.message) : null;
            if (data?.message?.direction !== "outgoing" && meta?.kind === "callInvite") {
              noticeIncomingCall({ callId: meta.callId, callType: meta.callType, fromUserId: data.message.fromUserId || data.message.fromUser?.id }, data.message);
            }
          } catch {}
        });
        es.addEventListener("message:read", (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data || "{}"));
            if (data?.message) upsertRealtimePrivateMessage(data.message);
          } catch {}
        });
        es.addEventListener("messages:snapshot", (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data || "{}"));
            if (Array.isArray(data?.messages)) {
              mergeRealtimePrivateMessages(data.messages);
              for (const msg of data.messages) {
                const meta = metadataOfMessage(msg);
                if (msg?.direction !== "outgoing" && meta?.kind === "callInvite") {
                  noticeIncomingCall({ callId: meta.callId, callType: meta.callType, fromUserId: msg.fromUserId || msg.fromUser?.id }, msg);
                }
              }
            }
          } catch {}
        });
        es.addEventListener("messages:changed", () => { loadAll(true).catch(() => {}); });
        es.addEventListener("call:incoming", (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data || "{}"));
            if (data?.message) upsertRealtimePrivateMessage(data.message);
            const call = data?.call || data || {};
            const isIncoming = String(call?.direction || data?.direction || "incoming") !== "outgoing";
            if (isIncoming) noticeIncomingCall(call, data?.message);
          } catch {}
        });
        es.addEventListener("call:accepted", (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data || "{}"));
            stopIncomingCallRinging();
            if (data?.call) setActiveCall(data.call);
            setInfo("Appel accepté ✅");
          } catch {}
        });
        es.addEventListener("call:declined", () => { stopIncomingCallRinging(); setInfo("Appel refusé"); closeCallPanel(false); });
        es.addEventListener("call:ended", () => { stopIncomingCallRinging(); setInfo("Appel terminé"); closeCallPanel(false); });
        es.onerror = () => {
          if (closed) return;
          if (!fallbackTimer) {
            fallbackTimer = window.setInterval(() => loadAll(true).catch(() => {}), 4500);
          }
        };
      } catch {
        fallbackTimer = window.setInterval(() => loadAll(true).catch(() => {}), 4500);
      }
    };
    connect();
    return () => {
      closed = true;
      try { es?.close(); } catch {}
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [loadAll]);

  React.useEffect(() => {
    if (active !== "messages") return;
    let stopped = false;
    const pollIncomingCallsAndMessages = async () => {
      if (stopped || incomingCallPollBusyRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      incomingCallPollBusyRef.current = true;
      try {
        const [messages, calls] = await Promise.all([
          listPrivateMessages().catch(() => []),
          listIncomingMessengerCalls().catch(() => []),
        ]);
        if (Array.isArray(messages) && messages.length) {
          mergeRealtimePrivateMessages(messages as any[]);
          for (const msg of messages as any[]) {
            const meta = metadataOfMessage(msg);
            if (msg?.direction !== "outgoing" && meta?.kind === "callInvite") {
              noticeIncomingCall({ callId: meta.callId, callType: meta.callType, fromUserId: msg.fromUserId || msg.fromUser?.id }, msg);
            }
          }
        }
        for (const call of (calls || []) as any[]) {
          const status = String(call?.status || "").toLowerCase();
          if (["ringing", "pending", "calling"].includes(status)) noticeIncomingCall(call);
        }
      } finally {
        incomingCallPollBusyRef.current = false;
      }
    };
    pollIncomingCallsAndMessages().catch(() => {});
    const timer = window.setInterval(() => pollIncomingCallsAndMessages().catch(() => {}), incomingCallNotice ? 850 : chatFullscreen ? 1200 : 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [active, chatFullscreen, selectedThreadUserId, friends, currentAccountId, incomingCallNotice?.callId]);

  React.useEffect(() => {
    if (active !== "messages" || !chatFullscreen) return;
    const timer = window.setInterval(() => loadAll(true).catch(() => {}), 12000);
    return () => window.clearInterval(timer);
  }, [active, chatFullscreen, selectedThreadUserId, loadAll]);

  React.useEffect(() => () => stopIncomingCallRinging(), []);

  function attachCallMediaToNodes() {
    try {
      if (callVideoRef.current && callStreamRef.current && callVideoRef.current.srcObject !== callStreamRef.current) {
        callVideoRef.current.srcObject = callStreamRef.current;
      }
    } catch {}
    try {
      if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (remoteAudioRef.current && remoteStreamRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
    } catch {}
  }

  React.useEffect(() => { attachCallMediaToNodes(); }, [conversationPanel?.type, remoteStreamTick, activeCall?.id]);

  async function prepareLocalMediaForCall(type: "audio" | "video") {
    try { callStreamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch {}
    callStreamRef.current = null;
    const media = await navigator.mediaDevices?.getUserMedia?.(type === "video" ? { audio: true, video: true } : { audio: true });
    callStreamRef.current = media || null;
    setTimeout(attachCallMediaToNodes, 30);
    return media;
  }

  function cleanupPeerOnly() {
    if (callSignalTimerRef.current) {
      window.clearInterval(callSignalTimerRef.current);
      callSignalTimerRef.current = null;
    }
    try { peerRef.current?.close?.(); } catch {}
    peerRef.current = null;
    processedSignalIdsRef.current = new Set();
    callSignalsAfterRef.current = "";
    remoteStreamRef.current = null;
    setRemoteStreamTick((v) => v + 1);
  }

  async function handleIncomingCallSignal(signal: any) {
    if (!signal?.id || processedSignalIdsRef.current.has(String(signal.id))) return;
    processedSignalIdsRef.current.add(String(signal.id));
    if (String(signal.fromUserId || "") === String(currentAccountId || "")) return;
    const pc = peerRef.current;
    if (!pc) return;
    const type = String(signal.signalType || signal.type || "");
    const payload = signal.payload || {};
    try {
      if (type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendMessengerCallSignal(String(signal.callId || activeCallRef.current?.id || activeCallRef.current?.callId || ""), "answer", answer);
      } else if (type === "answer") {
        if (pc.signalingState !== "stable") await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === "candidate" && payload) {
        await pc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
      } else if (type === "bye") {
        closeCallPanel(false);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur signal WebRTC");
    }
  }

  function startCallSignalPolling(callId: string) {
    if (callSignalTimerRef.current) window.clearInterval(callSignalTimerRef.current);
    callSignalTimerRef.current = window.setInterval(async () => {
      try {
        const signals = await listMessengerCallSignals(callId, callSignalsAfterRef.current || undefined);
        for (const signal of signals || []) {
          if (signal?.createdAt) callSignalsAfterRef.current = String(signal.createdAt);
          await handleIncomingCallSignal(signal);
        }
      } catch {}
    }, 900);
  }

  async function setupPeerConnection(call: any, type: "audio" | "video", role: "caller" | "callee") {
    const callId = String(call?.id || call?.callId || "");
    if (!callId) return;
    cleanupPeerOnly();
    const stream = callStreamRef.current || await prepareLocalMediaForCall(type);
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }] });
    peerRef.current = pc;
    remoteStreamRef.current = new MediaStream();
    setRemoteStreamTick((v) => v + 1);
    for (const track of stream?.getTracks?.() || []) pc.addTrack(track, stream);
    pc.onicecandidate = (event: any) => {
      if (event?.candidate) sendMessengerCallSignal(callId, "candidate", event.candidate).catch(() => {});
    };
    pc.ontrack = (event: any) => {
      const remote = remoteStreamRef.current || new MediaStream();
      const tracks = event?.streams?.[0]?.getTracks?.() || (event?.track ? [event.track] : []);
      for (const track of tracks) {
        if (!remote.getTracks().some((t) => t.id === track.id)) remote.addTrack(track);
      }
      remoteStreamRef.current = remote;
      setRemoteStreamTick((v) => v + 1);
      setTimeout(attachCallMediaToNodes, 30);
    };
    startCallSignalPolling(callId);
    if (role === "caller") {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
      await pc.setLocalDescription(offer);
      await sendMessengerCallSignal(callId, "offer", offer);
    }
  }

  async function handleSendPrivateMessage() {
    if (sendingPrivateRef.current) return;
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

    if (editingMessageId) {
      const id = String(editingMessageId);
      const editedAt = new Date().toISOString();
      setPrivateMessages((prev) => prev.map((m: any) => String(m?.id || "") === id ? { ...m, text, editedAt, metadata: { ...(m?.metadata || {}), editedAt } } : m));
      setEditingMessageId("");
      setMessageText("");
      setOpenMessageMenuId("");
      await runAction("Message modifié ✅", async () => {
        await editPrivateMessage(id, text);
        await loadAll(true);
      });
      return;
    }

    const replyPrefix = replyToMessage ? `↩ ${String(replyToMessage.text || "").slice(0, 90)}
` : "";
    const finalText = `${replyPrefix}${text}`;
    const optimisticId = appendOptimisticOutgoingMessage(toUserId, finalText);
    sendingPrivateRef.current = true;
    setSelectedThreadUserId(toUserId);
    setMessageToUserId(toUserId);
    setMessageText("");
    setReplyToMessage(null);
    setEmojiOpen(false);
    setInfo("Message envoyé ✅");
    setError(null);
    try {
      const ttlMeta = { expiresAt: new Date(Date.now() + MESSAGE_TTL_MS).toISOString(), ttlHours: MESSAGE_TTL_HOURS };
      setPrivateMessages((prev) => prev.map((m: any) => String(m?.id || "") === String(optimisticId) ? { ...m, metadata: { ...(m?.metadata || {}), ...ttlMeta } } : m));
      const saved: any = await sendPrivateMessage(toUserId, finalText, ttlMeta);
      if (saved?.id) {
        setPrivateMessages((prev) => prev.map((m: any) => String(m?.id || "") === String(optimisticId) ? { ...saved, metadata: saved.metadata || ttlMeta } : m));
      }
      markMessageCenterRefreshNeeded();
    } catch (e: any) {
      setPrivateMessages((prev) => prev.filter((m: any) => String(m?.id || "") !== String(optimisticId)));
      setError(e?.message || String(e));
    } finally {
      sendingPrivateRef.current = false;
    }
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
      await loadAll(true);
    }
  }




  async function handleBlockSelectedUser() {
    const id = String(selectedThread?.id || selectedThreadUserId || "").trim();
    if (!id) return;
    const name = asUserName(selectedThread?.user || {});
    const ok = typeof window === "undefined" ? true : window.confirm(`Bloquer ${name} ? Il ne pourra plus t'envoyer de messages ni t'appeler.`);
    if (!ok) return;
    try {
      await blockOnlineUser(id);
      setInfo(`${name} bloqué ✅`);
      setConversationOptionsOpen(false);
      closeCallPanel(false);
      await loadAll(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function clearConversationTools() {
    setEmojiOpen(false);
    setConversationPanel(null);
    setConversationOptionsOpen(false);
    setOpenMessageMenuId("");
  }

  function insertMessageText(fragment: string) {
    setMessageText((prev) => `${prev || ""}${fragment}`);
  }

  function handleReplyMessage(message: PrivateMessageItem) {
    setReplyToMessage(message);
    setEditingMessageId("");
    setMessageText("");
    setOpenMessageMenuId("");
    setInfo("Réponse activée : écris ton message puis envoie.");
  }

  function handleEditMessage(message: PrivateMessageItem) {
    if ((message as any)?.direction !== "outgoing") {
      setInfo("Tu ne peux éditer que tes propres messages.");
      setOpenMessageMenuId("");
      return;
    }
    setEditingMessageId(String((message as any)?.id || ""));
    setReplyToMessage(null);
    setMessageText(String((message as any)?.text || ""));
    setOpenMessageMenuId("");
    setInfo("Édition activée : modifie le texte puis envoie.");
  }

  async function handleCopyMessage(message: PrivateMessageItem) {
    try {
      await navigator.clipboard?.writeText(String((message as any)?.text || ""));
      setInfo("Message copié ✅");
    } catch {
      setError("Copie impossible sur ce navigateur.");
    }
    setOpenMessageMenuId("");
  }

  async function handleShareMessage(message: PrivateMessageItem) {
    const text = String((message as any)?.text || "");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Message Multisports", text });
        setInfo("Message partagé ✅");
      } else {
        await navigator.clipboard?.writeText(text);
        setInfo("Partage non disponible : message copié ✅");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Partage impossible.");
    }
    setOpenMessageMenuId("");
  }

  async function sendSystemChatText(text: string, metadata?: any) {
    const toUserId = String(messageToUserId || selectedThread?.id || "").trim();
    if (!toUserId) {
      setError("Choisis un ami destinataire.");
      return;
    }
    const ttlMeta = { ...(metadata || {}), expiresAt: metadata?.expiresAt || new Date(Date.now() + MESSAGE_TTL_MS).toISOString(), ttlHours: MESSAGE_TTL_HOURS };
    const optimisticId = appendOptimisticOutgoingMessage(toUserId, text, ttlMeta);
    setSelectedThreadUserId(toUserId);
    setMessageToUserId(toUserId);
    setInfo("Élément envoyé ✅");
    setError(null);
    sendPrivateMessage(toUserId, text, ttlMeta)
      .then((saved: any) => {
        if (saved?.id) {
          setPrivateMessages((prev) => prev.map((m: any) => String(m?.id || "") === String(optimisticId) ? { ...saved, metadata: saved.metadata || ttlMeta } : m));
        }
        markMessageCenterRefreshNeeded();
      })
      .catch((e: any) => {
        setPrivateMessages((prev) => prev.filter((m: any) => String(m?.id || "") !== String(optimisticId)));
        setError(e?.message || String(e));
      });
  }

  async function handleSelectedFile(file: File | null, kind: "file" | "photo") {
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const isImage = kind === "photo" || String(file.type || "").startsWith("image/");
    const label = isImage ? "📷 Photo" : "📎 Pièce jointe";
    const metadata: any = {
      kind: isImage ? "photo" : "file",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sizeKb,
      expiresAt: new Date(Date.now() + MESSAGE_TTL_MS).toISOString(),
      ttlHours: MESSAGE_TTL_HOURS,
    };
    try {
      if (isImage) {
        metadata.dataUrl = await imageFileToPreviewDataUrl(file);
      } else if (file.size <= 5 * 1024 * 1024) {
        metadata.dataUrl = await readFileAsDataUrl(file);
      } else {
        metadata.previewSkipped = true;
      }
    } catch {
      metadata.previewSkipped = true;
    }
    await sendSystemChatText(label, metadata);
  }

  async function openLocalCallPanel(type: "audio" | "video", title?: string, text?: string) {
    clearConversationTools();
    setConversationPanel({
      type,
      title: title || (type === "video" ? "Visio en cours" : "Appel audio en cours"),
      text: text || (type === "video" ? "Connexion visio NAS/WebRTC initialisée." : "Connexion audio NAS/WebRTC initialisée."),
    });
    setTimeout(attachCallMediaToNodes, 30);
  }

  async function openCallPanel(type: "audio" | "video") {
    const toUserId = String(messageToUserId || selectedThread?.id || "").trim();
    if (!toUserId) {
      setError("Choisis un ami à appeler.");
      return;
    }
    clearConversationTools();
    setError(null);
    try {
      // Important : on crée d'abord l'appel côté NAS pour déclencher tout de suite la sonnerie chez l'interlocuteur.
      const { call, message }: any = await startMessengerCall(toUserId, type, {
        messageMetadata: { ttlHours: MESSAGE_TTL_HOURS },
      });
      if (message?.id) upsertRealtimePrivateMessage(message);
      if (call?.id || call?.callId) {
        setActiveCall(call);
        await openLocalCallPanel(type, type === "video" ? "Appel visio en cours…" : "Appel audio en cours…", "Sonnerie envoyée à l’autre appareil. En attente de réponse…");
        try {
          await prepareLocalMediaForCall(type);
          await setupPeerConnection(call, type, "caller");
        } catch (mediaError: any) {
          setError(mediaError?.message || "Micro/caméra indisponible pour l'appel.");
          try { await endMessengerCall(String(call?.id || call?.callId || "")); } catch {}
          closeCallPanel(false);
          return;
        }
      }
      setInfo(type === "video" ? "Appel visio lancé ✅" : "Appel audio lancé ✅");
    } catch (e: any) {
      setError(e?.message || String(e));
      closeCallPanel(false);
    }
  }

  async function acceptIncomingCall(type: "audio" | "video", callId?: string) {
    const id = String(callId || incomingCallNotice?.callId || "").trim();
    stopIncomingCallRinging();
    clearConversationTools();
    try {
      await prepareLocalMediaForCall(type);
      let call: any = incomingCallNotice || { id, callId: id, callType: type };
      if (id) call = await acceptMessengerCall(id);
      setIncomingCallNotice(null);
      setActiveCall(call);
      await openLocalCallPanel(type, type === "video" ? "Visio acceptée" : "Appel audio accepté", "Appel accepté. Connexion directe en cours…");
      await setupPeerConnection(call, type, "callee");
      setInfo("Appel accepté ✅");
    } catch (e: any) {
      setError(e?.message || String(e));
      closeCallPanel(false);
    }
  }

  async function refuseIncomingCall(callId?: string) {
    const id = String(callId || incomingCallNotice?.callId || "").trim();
    stopIncomingCallRinging();
    try { if (id) await declineMessengerCall(id); } catch {}
    setIncomingCallNotice(null);
    setInfo("Appel refusé");
  }


  React.useEffect(() => {
    const processed = new Set<string>();

    const readPending = () => {
      let callId = "";
      let action = "open";
      try {
        callId = String(window.sessionStorage.getItem("dc_messenger_open_call_id") || "").trim();
        action = String(window.sessionStorage.getItem("dc_messenger_open_call_action") || "open").trim();
      } catch {}
      try {
        const hash = String(window.location.hash || "");
        const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
        const params = new URLSearchParams(query);
        callId = String(params.get("callId") || callId || "").trim();
        action = String(params.get("callAction") || action || "open").trim();
      } catch {}
      return { callId, action };
    };

    const openAndMaybeAccept = async (callId: string, action: string) => {
      const id = String(callId || "").trim();
      if (!id || processed.has(`${id}:${action}`)) return;
      processed.add(`${id}:${action}`);
      try { window.sessionStorage.removeItem("dc_messenger_open_call_id"); window.sessionStorage.removeItem("dc_messenger_open_call_action"); } catch {}
      let call: any = null;
      try { call = await getMessengerCall(id); } catch {}
      const callType = String(call?.callType || call?.type || "audio") === "video" ? "video" : "audio";
      const friendId = String(call?.callerUserId || call?.friendUserId || call?.caller?.id || call?.caller?.userId || "").trim();
      if (friendId) {
        setSelectedThreadUserId(friendId);
        setMessageToUserId(friendId);
      }
      setActive("messages");
      setChatFullscreen(true);
      if (action === "decline") {
        await refuseIncomingCall(id);
        return;
      }
      if (action === "accept") {
        setIncomingCallNotice({ callId: id, callType, fromUserId: friendId, call, fromUser: call?.caller || null });
        await acceptIncomingCall(callType as any, id);
      }
    };

    const consume = () => {
      const pending = readPending();
      if (pending.callId) openAndMaybeAccept(pending.callId, pending.action || "open").catch((e: any) => setError(e?.message || String(e)));
    };

    const onOpenCall = (event: any) => {
      const detail = event?.detail || {};
      const callId = String(detail.callId || "").trim();
      const action = String(detail.action || "open").trim();
      if (callId) openAndMaybeAccept(callId, action).catch((e: any) => setError(e?.message || String(e)));
      else consume();
    };

    consume();
    window.addEventListener("hashchange", consume);
    window.addEventListener("dc-messenger-open-call", onOpenCall as any);
    return () => {
      window.removeEventListener("hashchange", consume);
      window.removeEventListener("dc-messenger-open-call", onOpenCall as any);
    };
  }, []);

  function closeCallPanel(notifyRemote = true) {
    stopIncomingCallRinging();
    const callId = String(activeCallRef.current?.id || activeCallRef.current?.callId || "").trim();
    if (notifyRemote && callId) {
      sendMessengerCallSignal(callId, "bye", { reason: "hangup" }).catch(() => {});
      endMessengerCall(callId).catch(() => {});
    }
    cleanupPeerOnly();
    try { callStreamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch {}
    callStreamRef.current = null;
    setActiveCall(null);
    setConversationPanel(null);
  }

  function openConversationOptions() {
    setConversationOptionsOpen((v) => !v);
    setConversationPanel(null);
    setEmojiOpen(false);
    setOpenMessageMenuId("");
  }

  function openStatsComparator() {
    setEmojiOpen(false);
    setConversationOptionsOpen(false);
    setOpenMessageMenuId("");
    setConversationPanel({
      type: "stats",
      title: "Comparateur de stats",
      text: selectedThread?.user
        ? `Comparaison rapide entre ton profil et ${asUserName(selectedThread.user)}.`
        : "Choisis un ami pour comparer les statistiques de la discussion.",
    });
  }

  async function toggleRecording() {
    if (isRecording) {
      try { recorderRef.current?.stop(); } catch {}
      return;
    }
    clearConversationTools();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Enregistrement vocal non supporté par ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderChunksRef.current = [];
      recorderStartedAtRef.current = Date.now();
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const duration = Math.max(1, Math.round((Date.now() - recorderStartedAtRef.current) / 1000));
        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        try { stream.getTracks().forEach((track) => track.stop()); } catch {}
        setIsRecording(false);
        recorderRef.current = null;
        try {
          const audioDataUrl = await blobToDataUrl(blob);
          await sendSystemChatText(`🎙️ Message vocal (${duration}s)`, { kind: "voice", durationSeconds: duration, mimeType: blob.type || "audio/webm", audioDataUrl, sizeBytes: blob.size });
        } catch {
          await sendSystemChatText(`🎙️ Message vocal (${duration}s)`, { kind: "voice", durationSeconds: duration, mimeType: blob.type || "audio/webm", sizeBytes: blob.size, previewSkipped: true });
        }
      };
      recorder.start();
      setIsRecording(true);
      setInfo(null);
    } catch (e: any) {
      setIsRecording(false);
      setError(e?.message || "Micro indisponible.");
    }
  }


  function openMediaPreview(meta: any) {
    const url = String(meta?.dataUrl || meta?.audioDataUrl || "");
    setEmojiOpen(false);
    setConversationOptionsOpen(false);
    setOpenMessageMenuId("");
    setConversationPanel({
      type: "mediaPreview",
      title: mediaLabel(meta),
      text: `Aperçu disponible. Les messages et fichiers de messagerie sont conservés ${MESSAGE_TTL_HOURS}h puis supprimés du serveur.`,
      metadata: meta,
      mediaUrl: url,
    });
  }

  function openMediaDetails(meta: any) {
    setEmojiOpen(false);
    setConversationOptionsOpen(false);
    setOpenMessageMenuId("");
    setConversationPanel({
      type: "mediaDetails",
      title: "Détails",
      text: `${String(meta?.fileName || mediaLabel(meta))}\n${formatFileSize(meta?.sizeBytes)}\n${String(meta?.mimeType || dataUrlMimeType(meta?.dataUrl || meta?.audioDataUrl) || "type inconnu")}\nConservation : ${MESSAGE_TTL_HOURS}h`,
      metadata: meta,
      mediaUrl: String(meta?.dataUrl || meta?.audioDataUrl || ""),
    });
  }

  function downloadMessageMedia(meta: any) {
    const url = String(meta?.dataUrl || meta?.audioDataUrl || "");
    if (!url) {
      setError("Téléchargement indisponible : le fichier n’est pas présent dans le message.");
      return;
    }
    downloadDataUrl(url, String(meta?.fileName || (meta?.kind === "voice" ? "message-vocal.webm" : "piece-jointe")));
    setInfo("Téléchargement lancé ✅");
  }

  function openMessengerThread(threadId: string, unread = 0) {
    const id = String(threadId || "").trim();
    if (!id) return;
    setSelectedThreadUserId(id);
    setMessageToUserId(id);
    setChatFullscreen(true);
    setOpenMessageMenuId("");
    setEmojiOpen(false);
    setConversationPanel(null);
    setConversationOptionsOpen(false);
    setReplyToMessage(null);
    setEditingMessageId("");
    setSelectedGroupId("");
    setSelectedRoomId("");
    setInfo(null);
    setError(null);
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
    setConversationOptionsOpen(false);
    setActive("invites");
    setChatFullscreen(false);
    setInfo("Rubrique Invitations Online ouverte sans charger la page Online.");
  }

  const tabs: Array<{ id: MsgTab; label: string; badge: number; tone: string }> = [
    { id: "messages", label: "Messages", badge: counters.messages, tone: GOLD },
    { id: "invites", label: "Invitations salon Online", badge: counters.invites, tone: GREEN },
    { id: "requests", label: "Amis", badge: counters.requests, tone: "#c78bff" },
    { id: "links", label: "Associations profils", badge: counters.links, tone: BLUE },
    { id: "shares", label: "Parties partagées", badge: counters.shares, tone: GOLD },
    { id: "system", label: "Notifs", badge: counters.system, tone: RED },
  ];

  const chatModes: Array<{ id: ChatMode; label: string; description: string; badge: number; tone: string }> = [
    { id: "messenger", label: "Messenger", description: "Discuter avec un ami", badge: unreadPrivateMessages, tone: BLUE },
    { id: "group", label: "Groupe", description: "Créer un groupe d'amis et discuter ensemble", badge: 0, tone: "#c78bff" },
    { id: "rooms", label: "Salon de T'Chat", description: "Discuter dans des salons créés online", badge: salonInvites.length, tone: GREEN },
    { id: "announces", label: "Annonces", description: "Les joueurs peuvent laisser des annonces visibles de tous", badge: 0, tone: GOLD },
  ];

  const dedupedProfileLinks = React.useMemo(() => {
    const map = new Map<string, ProfileFriendLink>();
    for (const link of profileLinks || []) {
      const key = `${link.direction || ""}:${link.localProfileId || ""}:${userIdOf(link.direction === "outgoing" ? link.targetUser : link.requesterUser) || link.id}`;
      const prev = map.get(key);
      if (!prev || Date.parse(String(link.updatedAt || link.createdAt || "")) > Date.parse(String(prev.updatedAt || prev.createdAt || ""))) map.set(key, link);
    }
    return Array.from(map.values());
  }, [profileLinks]);

  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) || null : null;
  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) || null : null;

  const actionItems = [
    { label: "Messages", count: counters.messages, tone: GOLD, tab: "messages" as MsgTab, detail: "Messages privés non lus." },
    { label: "Amis", count: counters.requests, tone: "#c78bff", tab: "requests" as MsgTab, detail: "Demandes d'amis reçues en attente." },
    { label: "Associations profils", count: counters.links, tone: BLUE, tab: "links" as MsgTab, detail: "Demandes d'association reçues à traiter." },
    { label: "Invitations jeu Online", count: counters.invites, tone: GREEN, tab: "invites" as MsgTab, detail: "Invitations ou salons online." },
    { label: "Cartes parties reçues", count: counters.shares, tone: GOLD, tab: "shares" as MsgTab, detail: "Partages de parties / stats historiques." },
    { label: "Notifs", count: counters.system, tone: RED, tab: "system" as MsgTab, detail: "Notifications système." },
  ];

  function renderIncomingCallOverlay() {
    if (!incomingCallNotice || activeCall) return null;
    const callType = String(incomingCallNotice.callType || incomingCallNotice.call?.callType || incomingCallNotice.call?.type || "audio") === "video" ? "video" : "audio";
    const fromId = String(incomingCallNotice.fromUserId || incomingCallNotice.call?.callerUserId || incomingCallNotice.message?.fromUserId || "");
    const fromUser = friendSnapshotById(fromId) || incomingCallNotice.fromUser || incomingCallNotice.message?.fromUser || incomingCallNotice.call?.caller || {};
    const callId = String(incomingCallNotice.callId || incomingCallNotice.call?.id || incomingCallNotice.call?.callId || incomingCallNotice.message?.metadata?.callId || "");
    const tone = callType === "video" ? BLUE : GREEN;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "radial-gradient(circle at 50% 20%, rgba(125,255,178,.20), transparent 34%), linear-gradient(180deg, rgba(5,7,12,.96), rgba(0,0,0,.985))", color: "#fff", display: "grid", placeItems: "center", padding: 18 }}>
        <div style={{ width: "min(390px, 100%)", border: `1px solid ${tone}77`, borderRadius: 30, padding: 22, background: "linear-gradient(180deg, rgba(22,24,34,.96), rgba(7,8,13,.98))", boxShadow: `0 0 36px ${tone}30, 0 26px 80px rgba(0,0,0,.72)`, textAlign: "center" }}>
          <div style={{ color: tone, fontSize: 13, fontWeight: 1000, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>{callType === "video" ? "Appel visio entrant" : "Appel audio entrant"}</div>
          <div style={{ position: "relative", width: 132, height: 132, margin: "0 auto 14px", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `1px solid ${tone}40`, boxShadow: `0 0 30px ${tone}20` }} />
            <div style={{ position: "absolute", inset: 12, borderRadius: 999, border: `1px solid ${tone}55` }} />
            <AvatarBubble user={fromUser} size={92} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 1000, lineHeight: 1.05, marginBottom: 6 }}>{asUserName(fromUser || {})}</div>
          <div style={{ color: "rgba(255,255,255,.68)", fontSize: 13, fontWeight: 850, marginBottom: 18 }}>{callType === "video" ? "t’appelle en visio" : "t’appelle maintenant"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button type="button" onClick={() => refuseIncomingCall(callId)} style={{ border: `1px solid ${RED}88`, background: `linear-gradient(180deg, ${RED}24, rgba(0,0,0,.28))`, color: "#fff", borderRadius: 22, padding: "14px 10px", fontWeight: 1000, fontSize: 15, boxShadow: `0 0 22px ${RED}24` }}>✕ Refuser</button>
            <button type="button" onClick={() => acceptIncomingCall(callType as any, callId)} style={{ border: `1px solid ${tone}99`, background: `linear-gradient(180deg, ${tone}2e, rgba(0,0,0,.20))`, color: "#fff", borderRadius: 22, padding: "14px 10px", fontWeight: 1000, fontSize: 15, boxShadow: `0 0 26px ${tone}30` }}>{callType === "video" ? "📹 Répondre" : "📞 Répondre"}</button>
          </div>
          <button type="button" onClick={() => { stopIncomingCallRinging(); setIncomingCallNotice(null); }} style={{ marginTop: 14, border: "none", background: "transparent", color: "rgba(255,255,255,.58)", fontWeight: 850, fontSize: 12 }}>Masquer sans refuser</button>
        </div>
      </div>
    );
  }


  if (active === "messages" && chatFullscreen && (selectedGroup || selectedRoom)) {
    const isRoom = !!selectedRoom;
    const title = selectedGroup?.name || selectedRoom?.title || "Discussion";
    const subtitle = isRoom ? `Salon public • messages ${selectedRoom?.ttlMinutes || 10} min` : `${selectedGroup?.memberIds?.length || 0} amis`;
    const roomMessages = selectedRoom ? (selectedRoom.messages || []).filter((m) => Date.parse(m.expiresAt || "") > Date.now()) : [];
    const groupMessages = selectedGroup ? (selectedGroup.messages || []) : [];
    const items = isRoom ? roomMessages : groupMessages;
    return (
      <div className="container" style={{ position: "fixed", inset: 0, zIndex: 2147483000, width: "100vw", height: "100dvh", padding: 0, margin: 0, color: "#f5f5f7", background: "radial-gradient(820px 360px at 50% -10%, rgba(199,139,255,.16), transparent 60%), linear-gradient(180deg, #0b0d15 0%, #05060a 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {renderIncomingCallOverlay()}
        <div style={{ flex: "0 0 auto", padding: "12px", minHeight: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${STROKE}`, background: selectedGroup?.coverUrl ? `linear-gradient(90deg, rgba(5,6,10,.34), rgba(5,6,10,.90)), center/cover url(${selectedGroup.coverUrl})` : "linear-gradient(180deg, rgba(255,255,255,.070), rgba(255,255,255,.018))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <RoundMessengerButton title="Retour" tone={isRoom ? GREEN : "#c78bff"} onClick={() => { setChatFullscreen(false); setSelectedGroupId(""); setSelectedRoomId(""); setInfo(null); setError(null); }}><MessengerToolIcon name="back" size={22} /></RoundMessengerButton>
            <div style={{ width: 42, height: 42, borderRadius: 16, display: "grid", placeItems: "center", border: `1px solid ${isRoom ? GREEN : "#c78bff"}66`, background: selectedGroup?.avatarUrl ? `center/cover url(${selectedGroup.avatarUrl})` : "rgba(255,255,255,.06)", fontSize: 22, overflow: "hidden" }}>{selectedGroup?.avatarUrl ? null : (isRoom ? "💬" : "👥")}</div>
            <div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontWeight: 1000, fontSize: 13 }}>T'Chat Messenger</div><div style={{ color: "#fff", fontWeight: 1000, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div><div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 800 }}>{subtitle}</div></div>
          </div>
          {selectedGroup ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <RoundMessengerButton title="Ajouter un membre" tone={GREEN} onClick={() => setGroupAddMemberOpen((v) => !v)}>＋</RoundMessengerButton>
            <RoundMessengerButton title="Changer l’avatar" tone={BLUE} onClick={() => groupAvatarInputRef.current?.click?.()}><MessengerToolIcon name="camera" /></RoundMessengerButton>
            <RoundMessengerButton title="Changer la couverture" tone="#c78bff" onClick={() => groupCoverInputRef.current?.click?.()}>▰</RoundMessengerButton>
            <RoundMessengerButton title="Renommer le groupe" tone={GOLD} onClick={() => startRenameGroup(selectedGroup)}><ChatActionIcon name="edit" /></RoundMessengerButton>
            <RoundMessengerButton title={(selectedGroup.ownerId || currentAccountId) === currentAccountId ? "Supprimer le groupe" : "Quitter le groupe"} tone={RED} onClick={() => removeGroup(selectedGroup.id)}><ChatActionIcon name="delete" /></RoundMessengerButton>
          </div> : null}
        </div>
        {selectedGroup ? <>
          <input ref={groupAvatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readGroupMediaFile("avatar", (e.target as HTMLInputElement).files?.[0], selectedGroup.id)} />
          <input ref={groupCoverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readGroupMediaFile("cover", (e.target as HTMLInputElement).files?.[0], selectedGroup.id)} />
        </> : null}
        {groupAddMemberOpen && selectedGroup ? <div style={{ margin: "10px 12px 0", ...cardStyle({ borderRadius: 16, padding: 10, borderColor: "rgba(125,255,178,.45)" }) }}><div style={{ color: GREEN, fontWeight: 1000, marginBottom: 8 }}>Ajouter un membre</div><div style={{ display: "flex", gap: 8, overflowX: "auto" }}>{allMessengerContacts.filter((u:any) => !selectedGroup.memberIds.includes(userIdOf(u))).map((u:any) => <button key={`add-${userIdOf(u)}`} type="button" onClick={() => addMemberToSelectedGroup(userIdOf(u))} style={{ flex: "0 0 66px", border: `1px solid ${GREEN}55`, borderRadius: 14, background: "rgba(125,255,178,.08)", color: "#fff", padding: 7, display: "grid", justifyItems: "center", gap: 5 }}><AvatarBubble user={u} size={38} /><span style={{ fontSize: 10, fontWeight: 900, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asUserName(u)}</span></button>)}</div></div> : null}
        {renamingGroupId === selectedGroup?.id ? <div style={{ margin: "10px 12px 0", ...cardStyle({ borderRadius: 16, padding: 10, borderColor: "rgba(255,213,106,.45)" }) }}><input value={renameGroupValue} onChange={(e) => setRenameGroupValue((e.target as HTMLInputElement).value)} placeholder="Nouveau nom du groupe" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none" }} /><div style={{ display: "flex", gap: 8, marginTop: 8 }}><ActionButton label="Enregistrer" tone={GOLD} onClick={saveRenameGroup} /><ActionButton label="Annuler" tone={RED} onClick={() => setRenamingGroupId("")} /></div></div> : null}
        {info ? <div style={{ margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(125,255,178,.35)", color: GREEN }) }}>{info}</div> : null}
        {error ? <div style={{ margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(255,100,100,.45)", color: RED }) }}>Erreur : {error}</div> : null}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
          {isRoom ? <div style={{ ...cardStyle({ borderRadius: 14, padding: 10, borderColor: "rgba(125,255,178,.35)", color: GREEN }) }}>🛡️ IA Admin active : messages insultants, sexuels, haineux ou hors charte bloqués. Suppression automatique après {selectedRoom?.ttlMinutes || 10} minutes.</div> : null}
          {items.length ? items.map((m) => <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "82%", border: `1px solid ${isRoom ? GREEN : "#c78bff"}55`, borderRadius: "15px 15px 5px 15px", padding: "8px 10px", background: "linear-gradient(180deg, rgba(125,255,178,.13), rgba(0,0,0,.20))" }}><div style={{ color: "#fff", fontSize: 12.5, whiteSpace: "pre-wrap" }}>{m.text}</div><div style={{ color: "rgba(255,255,255,.48)", fontSize: 10, fontWeight: 800, textAlign: "right", marginTop: 4 }}>{asDate(m.createdAt)}{(m as any).expiresAt ? ` • expire ${asDate((m as any).expiresAt)}` : ""}</div></div>) : <EmptyCard icon={isRoom ? "💬" : "👥"} title="Aucun message" text="Écris le premier message de cette discussion." />}
        </div>
        <div style={{ flex: "0 0 auto", padding: "10px 12px 14px", borderTop: `1px solid ${STROKE}`, background: "rgba(5,6,10,.94)" }}>
          {!isRoom && groupEmojiOpen ? <div style={{ marginBottom: 8, border: `1px solid ${STROKE}`, borderRadius: 16, padding: 8, background: "rgba(0,0,0,.30)", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>{EMOJI_BANK[0].items.slice(0, 24).map((emoji, i) => <button key={`gemoji-${i}`} type="button" onClick={() => setCommunityText((prev) => `${prev}${emoji}`)} style={{ height: 30, borderRadius: 10, border: `1px solid ${STROKE}`, background: "rgba(255,255,255,.06)", fontSize: 16 }}>{emoji}</button>)}</div> : null}
          {!isRoom ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
            <RoundMessengerButton title="Smileys" tone={BLUE} onClick={() => setGroupEmojiOpen((v) => !v)}><MessengerToolIcon name="smile" /></RoundMessengerButton>
            <RoundMessengerButton title="Stats" tone={GOLD} onClick={() => sendGroupAttachment("stats")}><MessengerToolIcon name="stats" /></RoundMessengerButton>
            <RoundMessengerButton title="Pièce jointe" tone={BLUE} onClick={() => sendGroupAttachment("file")}><MessengerToolIcon name="clip" /></RoundMessengerButton>
            <RoundMessengerButton title="Photo" tone={BLUE} onClick={() => sendGroupAttachment("photo")}><MessengerToolIcon name="camera" /></RoundMessengerButton>
            <RoundMessengerButton title="Vocal" tone={GREEN} onClick={() => sendGroupAttachment("voice")}><MessengerToolIcon name="mic" /></RoundMessengerButton>
            <RoundMessengerButton title="Envoyer" tone="#c78bff" onClick={sendGroupMessage}><MessengerToolIcon name="send" /></RoundMessengerButton>
          </div> : null}
          <textarea value={communityText} onChange={(e) => setCommunityText((e.target as HTMLTextAreaElement).value)} rows={2} placeholder={isRoom ? "Message éphémère du salon…" : "Message du groupe…"} style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${STROKE}`, borderRadius: 16, padding: "12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none", resize: "none" }} />
          {isRoom ? <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><ActionButton label="Envoyer" tone={GREEN} onClick={sendRoomMessage} /></div> : null}
        </div>
      </div>
    );
  }

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
        {renderIncomingCallOverlay()}
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
            <RoundMessengerButton title="Appel audio" tone={GREEN} onClick={() => openCallPanel("audio")}><MessengerToolIcon name="phone" /></RoundMessengerButton>
            <RoundMessengerButton title="Visio" tone={BLUE} onClick={() => openCallPanel("video")}><MessengerToolIcon name="video" /></RoundMessengerButton>
            <RoundMessengerButton title="Options conversation" tone={GOLD} onClick={openConversationOptions}><MessengerToolIcon name="more" /></RoundMessengerButton>
          </div>
          {conversationOptionsOpen ? (
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 60,
                zIndex: 2147483647,
                width: "min(248px, calc(100vw - 24px))",
                border: `1px solid ${GOLD}66`,
                borderRadius: 16,
                padding: 8,
                background: "linear-gradient(180deg, rgba(27,27,34,.98), rgba(9,10,15,.99))",
                boxShadow: `0 18px 38px rgba(0,0,0,.62), 0 0 18px ${GOLD}25`,
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{ color: GOLD, fontWeight: 1000, fontSize: 12.5, margin: "2px 4px 7px" }}>Options conversation</div>
              <div style={{ display: "grid", gap: 6 }}>
                <ActionButton label="Marquer lu" tone={GREEN} onClick={() => selectedThread?.id && markPrivateThreadRead(String(selectedThread.id)).then(() => { setInfo("Conversation marquée comme lue ✅"); setConversationOptionsOpen(false); }).catch((e: any) => setError(e?.message || String(e)))} />
                <ActionButton label="Notifications" tone={GOLD} onClick={() => { setConversationOptionsOpen(false); activatePhoneNotifications(); }} />
                <ActionButton label="Bloquer" tone={RED} onClick={handleBlockSelectedUser} />
              </div>
            </div>
          ) : null}
        </div>

        {info ? <div style={{ flex: "0 0 auto", margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(125,255,178,.35)", color: GREEN }) }}>{info}</div> : null}
        {error ? <div style={{ flex: "0 0 auto", margin: "8px 12px 0", ...cardStyle({ borderRadius: 14, padding: "8px 10px", borderColor: "rgba(255,100,100,.45)", color: RED }) }}>Erreur : {error}</div> : null}

        {conversationPanel ? (
          <div style={{ flex: "0 0 auto", margin: "8px 12px 0", ...cardStyle({ borderRadius: 16, padding: 10, borderColor: `${conversationPanel.type === "video" ? BLUE : conversationPanel.type === "audio" ? GREEN : GOLD}66` }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ color: conversationPanel.type === "video" ? BLUE : conversationPanel.type === "audio" ? GREEN : GOLD, fontWeight: 1000, fontSize: 14 }}>{conversationPanel.title}</div>
                <div style={{ color: "rgba(255,255,255,.68)", fontSize: 11.5, marginTop: 3, lineHeight: 1.35 }}>{conversationPanel.text}</div>
              </div>
              <button type="button" onClick={closeCallPanel} style={{ border: `1px solid ${STROKE}`, background: "rgba(255,255,255,.04)", color: "#fff", borderRadius: 999, width: 28, height: 28, cursor: "pointer", fontWeight: 1000 }}>×</button>
            </div>
            {conversationPanel.type === "video" ? (
              <div style={{ position: "relative", marginTop: 10, border: `1px solid ${BLUE}55`, borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,.45)", boxShadow: `0 0 22px ${BLUE}18` }}>
                <video ref={remoteVideoRef} playsInline autoPlay style={{ width: "100%", maxHeight: 210, objectFit: "cover", display: "block", background: "#05070c" }} />
                <video ref={callVideoRef} muted playsInline autoPlay style={{ position: "absolute", right: 18, bottom: 76, width: 92, height: 70, objectFit: "cover", borderRadius: 12, border: `1px solid ${BLUE}77`, background: "#05070c" }} />
              </div>
            ) : conversationPanel.type === "audio" ? (
              <>
                <audio ref={remoteAudioRef} autoPlay playsInline />
                <div style={{ marginTop: 10, minHeight: 52, border: `1px solid ${GREEN}44`, borderRadius: 16, padding: "10px 12px", background: "rgba(125,255,178,.08)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: GREEN, boxShadow: `0 0 18px ${GREEN}` }} />
                <div style={{ flex: 1, display: "flex", gap: 4, alignItems: "center" }}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} style={{ width: 4, height: 6 + ((i * 5 + Date.now()) % 20), borderRadius: 999, background: GREEN, opacity: 0.35 + (i % 4) * 0.12 }} />
                  ))}
                </div>
                </div>
              </>
            ) : null}
            {conversationPanel.type === "mediaPreview" ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {isImageMetadata(conversationPanel.metadata) && conversationPanel.mediaUrl ? (
                  <img src={conversationPanel.mediaUrl} alt={String(conversationPanel.metadata?.fileName || "aperçu")} style={{ width: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 16, border: `1px solid ${BLUE}44`, background: "rgba(0,0,0,.35)" }} />
                ) : isAudioMetadata(conversationPanel.metadata) && conversationPanel.mediaUrl ? (
                  <audio controls src={conversationPanel.mediaUrl} style={{ width: "100%" }} />
                ) : (
                  <div style={{ border: `1px solid ${BLUE}44`, borderRadius: 14, padding: 12, color: "rgba(255,255,255,.74)", fontWeight: 850 }}>Aucun aperçu lisible pour ce fichier.</div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ActionButton label="Télécharger" tone={BLUE} onClick={() => downloadMessageMedia(conversationPanel.metadata)} />
                  <ActionButton label="Détails" tone={GOLD} onClick={() => openMediaDetails(conversationPanel.metadata)} />
                </div>
              </div>
            ) : conversationPanel.type === "mediaDetails" ? (
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap", border: `1px solid ${STROKE}`, borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.78)", fontSize: 12, fontWeight: 850, lineHeight: 1.45 }}>{conversationPanel.text}</div>
            ) : null}
            {conversationPanel.type === "stats" ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {[
                  ["AVG3D X01", userStatNumber(store?.activeProfile || store?.profile || {}, ["avg3d", "avg3", "average3"], 0), userStatNumber(selectedThread?.user || {}, ["avg3d", "avg3", "average3"], 0)],
                  ["CO %", userStatNumber(store?.activeProfile || store?.profile || {}, ["checkoutRate", "coPercent", "checkoutPercent"], 0), userStatNumber(selectedThread?.user || {}, ["checkoutRate", "coPercent", "checkoutPercent"], 0)],
                  ["Cricket MPR", userStatNumber(store?.activeProfile || store?.profile || {}, ["mpr", "cricketMpr"], 0), userStatNumber(selectedThread?.user || {}, ["mpr", "cricketMpr"], 0)],
                  ["Victoires", userStatNumber(store?.activeProfile || store?.profile || {}, ["wins", "victories", "totalWins"], 0), userStatNumber(selectedThread?.user || {}, ["wins", "victories", "totalWins"], 0)],
                ].map(([label, me, other]: any) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr", gap: 8, alignItems: "center", border: `1px solid ${STROKE}`, borderRadius: 12, padding: "7px 9px", background: "rgba(255,255,255,.035)" }}>
                    <span style={{ color: "rgba(255,255,255,.62)", fontSize: 11, fontWeight: 900 }}>{label}</span>
                    <span style={{ color: BLUE, fontSize: 12, fontWeight: 1000, textAlign: "center" }}>Toi<br />{Number(me || 0).toFixed(label.includes("%") ? 0 : 1)}</span>
                    <span style={{ color: GREEN, fontSize: 12, fontWeight: 1000, textAlign: "center" }}>{asUserName(selectedThread?.user || {})}<br />{Number(other || 0).toFixed(label.includes("%") ? 0 : 1)}</span>
                  </div>
                ))}
              </div>
            ) : conversationPanel.type === "options" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginTop: 10 }}>
                <ActionButton label="Marquer lu" tone={GREEN} onClick={() => selectedThread?.id && markPrivateThreadRead(String(selectedThread.id)).then(() => setInfo("Conversation marquée comme lue ✅")).catch((e: any) => setError(e?.message || String(e)))} />
                <ActionButton label="Notifications" tone={GOLD} onClick={activatePhoneNotifications} />
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <ActionButton label="Raccrocher" tone={RED} onClick={closeCallPanel} />
              </div>
            )}
          </div>
        ) : null}

        <div style={{ flex: "0 0 auto", margin: "7px 12px 0", border: `1px solid rgba(125,255,178,.22)`, borderRadius: 14, padding: "7px 10px", color: "rgba(255,255,255,.62)", background: "rgba(0,0,0,.20)", fontSize: 10.5, fontWeight: 800 }}>
          🕒 Messages, photos, pièces jointes et vocaux conservés {MESSAGE_TTL_HOURS}h puis supprimés du serveur.
        </div>

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
                    {(() => {
                      const txt = messageTextForDisplay(m);
                      return txt ? <div style={{ color: "#fff", fontSize: 12.5, whiteSpace: "pre-wrap", lineHeight: 1.24 }}>{txt}</div> : null;
                    })()}
                    {(() => {
                      const meta = metadataOfMessage(m);
                      if (meta.kind === "callInvite") {
                        const callType = meta.callType === "video" ? "video" : "audio";
                        return <div style={{ display: "grid", gap: 7, minWidth: 190 }}>
                          <div style={{ color: callType === "video" ? BLUE : GREEN, fontWeight: 1000, fontSize: 13 }}>{callType === "video" ? "📹 Appel visio" : "📞 Appel audio"}</div>
                          <div style={{ color: "rgba(255,255,255,.62)", fontSize: 11, fontWeight: 800 }}>Invitation d’appel • expire rapidement</div>
                          {incoming ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            <ActionButton label="Répondre" tone={callType === "video" ? BLUE : GREEN} onClick={() => acceptIncomingCall(callType as any, String(meta.callId || ""))} />
                            <ActionButton label="Refuser" tone={RED} onClick={() => refuseIncomingCall(String(meta.callId || ""))} />
                          </div> : <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 850 }}>Demande envoyée</div>}
                        </div>;
                      }
                      const mediaUrl = String(meta.dataUrl || meta.audioDataUrl || "");
                      if (isImageMetadata(meta) && mediaUrl) {
                        return <button type="button" onClick={() => openMediaPreview(meta)} style={{ marginTop: 0, border: 0, padding: 0, background: "transparent", cursor: "pointer", display: "block" }}>
                          <img src={mediaUrl} alt="Photo" style={{ width: "min(260px, 100%)", maxHeight: 230, objectFit: "cover", borderRadius: 14, border: `1px solid ${BLUE}44`, display: "block", background: "rgba(0,0,0,.25)" }} />
                        </button>;
                      }
                      if (meta.kind === "voice") {
                        return <div style={{ display: "grid", gap: 7, minWidth: 190 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, color: GREEN, fontSize: 12, fontWeight: 1000 }}><span>🎙️</span><span>Message vocal</span><span>{Number(meta.durationSeconds || 0)}s</span></div>
                          {mediaUrl ? <audio controls src={mediaUrl} style={{ width: "100%", height: 34 }} /> : <div style={{ color: RED, fontSize: 11, fontWeight: 850 }}>Lecture indisponible : audio non stocké dans le message.</div>}
                        </div>;
                      }
                      if (meta.kind === "file" || meta.kind === "photo") {
                        return <button type="button" onClick={() => openMediaPreview(meta)} style={{ marginTop: 0, width: "min(220px, 100%)", border: `1px solid ${BLUE}44`, borderRadius: 14, padding: "10px 11px", color: "rgba(255,255,255,.84)", background: "rgba(0,0,0,.20)", fontSize: 12, fontWeight: 950, cursor: "pointer", textAlign: "left" }}>
                          <span style={{ display: "block", color: BLUE, fontWeight: 1000 }}>{meta.kind === "photo" ? "📷 Photo" : "📎 Document"}</span>
                          <span style={{ display: "block", marginTop: 3, color: "rgba(255,255,255,.54)", fontSize: 10.5 }}>Toucher pour ouvrir</span>
                        </button>;
                      }
                      return null;
                    })()}
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
                      {metadataOfMessage(m)?.editedAt || (m as any)?.editedAt ? <span style={{ color: GOLD, fontSize: 9.3, fontWeight: 900 }}>modifié</span> : null}
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
                            if (name === "reply") handleReplyMessage(m);
                            else if (name === "edit") handleEditMessage(m);
                            else if (name === "copy") handleCopyMessage(m);
                            else if (name === "share") handleShareMessage(m);
                          }}
                          style={{ width: "100%", border: 0, background: "transparent", color: "rgba(255,255,255,.88)", display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 850, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}
                        >
                          <ChatActionIcon name={name as any} size={15} /> <span>{label}</span>
                        </button>
                      ))}
                      {(() => {
                        const meta = metadataOfMessage(m);
                        const hasMedia = meta?.kind === "file" || meta?.kind === "photo" || meta?.kind === "voice";
                        if (!hasMedia) return null;
                        return <>
                          <button type="button" onClick={() => { setOpenMessageMenuId(""); openMediaDetails(meta); }} style={{ width: "100%", border: 0, background: "transparent", color: "rgba(255,255,255,.88)", display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 850, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}><span style={{ width: 15, textAlign: "center" }}>ℹ️</span><span>Détails</span></button>
                          <button type="button" onClick={() => { setOpenMessageMenuId(""); downloadMessageMedia(meta); }} style={{ width: "100%", border: 0, background: "transparent", color: BLUE, display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 8, fontWeight: 850, cursor: "pointer", textAlign: "left", fontSize: 10.5, lineHeight: 1.05 }}><span style={{ width: 15, textAlign: "center" }}>⬇</span><span>Télécharger</span></button>
                        </>;
                      })()}
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
          {replyToMessage || editingMessageId ? (
            <div style={{ marginBottom: 8, border: `1px solid ${editingMessageId ? GOLD : BLUE}55`, borderRadius: 14, padding: "7px 9px", background: "rgba(255,255,255,.045)", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: editingMessageId ? GOLD : BLUE, fontWeight: 950, fontSize: 11 }}>{editingMessageId ? "Édition du message" : "Réponse au message"}</div>
                <div style={{ color: "rgba(255,255,255,.64)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {editingMessageId ? "Modifie puis clique sur Envoyer." : String(replyToMessage?.text || "").slice(0, 120)}
                </div>
              </div>
              <button type="button" onClick={() => { setReplyToMessage(null); setEditingMessageId(""); setMessageText(""); }} style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 1000 }}>×</button>
            </div>
          ) : null}
          {emojiOpen ? (
            <div style={{ marginBottom: 8, border: `1px solid ${BLUE}44`, borderRadius: 16, padding: 8, background: "rgba(0,0,0,.42)", boxShadow: `0 0 18px ${BLUE}12`, maxHeight: 174, overflowY: "auto" }}>
              {EMOJI_BANK.map((group) => (
                <div key={group.label} style={{ marginBottom: 8 }}>
                  <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .5, margin: "0 0 5px 2px" }}>{group.label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 5 }}>
                    {group.items.map((emoji, index) => (
                      <button key={`${group.label}-${emoji}-${index}`} type="button" onClick={() => insertMessageText(emoji)} style={{ height: 31, borderRadius: 10, border: `1px solid ${STROKE}`, background: "rgba(255,255,255,.055)", cursor: "pointer", fontSize: 17, display: "grid", placeItems: "center" }}>{emoji}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <input ref={attachInputRef} type="file" style={{ display: "none" }} onChange={(e) => { const file = (e.target as HTMLInputElement).files?.[0] || null; handleSelectedFile(file, "file"); (e.target as HTMLInputElement).value = ""; }} />
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { const file = (e.target as HTMLInputElement).files?.[0] || null; handleSelectedFile(file, "photo"); (e.target as HTMLInputElement).value = ""; }} />
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
              <RoundMessengerButton title="Emoji" tone={BLUE} onClick={() => { setEmojiOpen((v) => !v); setConversationPanel(null); }}><MessengerToolIcon name="smile" /></RoundMessengerButton>
              <RoundMessengerButton title="Comparer les stats" tone={GOLD} onClick={openStatsComparator}><MessengerToolIcon name="stats" /></RoundMessengerButton>
              <RoundMessengerButton title="Pièce jointe" tone={BLUE} onClick={() => attachInputRef.current?.click()}><MessengerToolIcon name="clip" /></RoundMessengerButton>
              <RoundMessengerButton title="Photo" tone={BLUE} onClick={() => photoInputRef.current?.click()}><MessengerToolIcon name="camera" /></RoundMessengerButton>
              <RoundMessengerButton title={isRecording ? "Stopper et envoyer le vocal" : "Message vocal"} tone={isRecording ? RED : GREEN} onClick={toggleRecording}><MessengerToolIcon name="mic" /></RoundMessengerButton>
              <RoundMessengerButton title="Envoyer" tone={GREEN} onClick={handleSendPrivateMessage}><MessengerToolIcon name="send" /></RoundMessengerButton>
            </div>
            {isRecording ? (
              <div
                style={{
                  minHeight: 52,
                  borderRadius: 22,
                  padding: "10px 12px",
                  border: `1px solid ${GREEN}66`,
                  background: "linear-gradient(180deg, rgba(125,255,178,.13), rgba(0,0,0,.36))",
                  color: GREEN,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: `0 0 18px ${GREEN}18`,
                  minWidth: 0,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 999, background: RED, boxShadow: `0 0 12px ${RED}`, flex: "0 0 auto" }} />
                <span style={{ fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap" }}>{recordingSeconds || 1}s</span>
                <div style={{ flex: "1 1 auto", height: 24, display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 4,
                        height: 5 + ((i * 7 + recordingSeconds * 3) % 18),
                        borderRadius: 999,
                        background: GREEN,
                        opacity: 0.35 + (((i + recordingSeconds) % 5) * 0.12),
                        flex: "0 0 auto",
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: "rgba(255,255,255,.76)", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>retape micro pour envoyer</span>
              </div>
            ) : (
              <textarea
                value={messageText}
                onChange={(e) => setMessageText((e.target as HTMLTextAreaElement).value)}
                placeholder="Écrire un message…"
                rows={2}
                style={{
                  width: "100%",
                  minHeight: 62,
                  maxHeight: 132,
                  borderRadius: 20,
                  padding: "13px 14px",
                  border: `1px solid ${STROKE}`,
                  background: "rgba(0,0,0,.38)",
                  color: "#fff",
                  fontWeight: 750,
                  fontSize: 14,
                  lineHeight: 1.25,
                  outline: "none",
                  resize: "none",
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 104, color: "#f5f5f7" }}>
      {renderIncomingCallOverlay()}
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

      {loading && !hasVisibleMessageData ? <div style={cardStyle({ marginBottom: 10 })}>Chargement de la messagerie…</div> : null}
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
              {allMessengerContacts.length ? (
                <>
                  <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 0 12px", scrollbarWidth: "none" as any }}>
                    {allMessengerContacts.slice(0, 24).map((user: any) => {
                      const id = userIdOf(user);
                      const thread = messageThreads.find((t: any) => String(t.id) === id);
                      const selected = selectedThreadUserId === id;
                      return (
                        <button
                          key={`avatar-${id}`}
                          type="button"
                          onClick={() => openMessengerThread(id, thread?.unread || 0)}
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
                          {(thread?.unread || 0) > 0 ? (
                            <span style={{ position: "absolute", top: 4, right: 5, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: GREEN, color: "#07120b", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 1000, boxShadow: `0 0 14px ${GREEN}88` }}>
                              {thread.unread > 99 ? "99+" : thread.unread}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyCard icon="👥" title="Aucun ami disponible" text="Ajoute ou accepte des amis pour démarrer une discussion privée." />
              )}
            </>
          ) : chatMode === "group" ? (
            <div style={cardStyle({ borderColor: "rgba(199,139,255,.30)" })}>
              <SectionTitle title="Groupes Messenger" subtitle="Créer un groupe ou ouvrir un groupe existant." badge={groups.length} tone="#c78bff" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <LabeledChoiceButton active={groupPanel === "create"} label="Créer" tone="#c78bff" onClick={() => setGroupPanel("create")}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${groupPanel === "create" ? "#c78bff" : "rgba(255,255,255,.35)"}`, boxShadow: groupPanel === "create" ? "0 0 16px rgba(199,139,255,.35)" : "none", color: groupPanel === "create" ? "#e8c8ff" : "rgba(255,255,255,.82)", fontSize: 18, fontWeight: 1000, lineHeight: 1 }}>+</span>
                </LabeledChoiceButton>
                <LabeledChoiceButton active={groupPanel === "list"} label="Groupes" tone="#c78bff" onClick={() => setGroupPanel("list")}>
                  <svg width={23} height={23} viewBox="0 0 24 24" style={{ display: "block" }}>
                    <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </g>
                  </svg>
                </LabeledChoiceButton>
              </div>
              {groupPanel === "create" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ position: "relative", minHeight: 154, border: `1px solid rgba(199,139,255,.34)`, borderRadius: 24, padding: 12, overflow: "hidden", background: newGroupCoverUrl ? `linear-gradient(90deg, rgba(5,6,10,.25), rgba(5,6,10,.88)), center/cover url(${newGroupCoverUrl})` : "radial-gradient(160px 90px at 86% 0%, rgba(199,139,255,.22), transparent 70%), linear-gradient(180deg, rgba(255,255,255,.060), rgba(255,255,255,.020))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 18px 32px rgba(0,0,0,.30)" }}>
                    <button type="button" title="Importer la couverture" onClick={() => groupCoverInputRef.current?.click?.()} style={{ position: "absolute", top: 12, right: 14, width: 38, height: 38, borderRadius: 999, border: `1px solid ${GOLD}88`, background: "rgba(0,0,0,.45)", color: GOLD, display: "grid", placeItems: "center", boxShadow: `0 0 18px ${GOLD}22`, cursor: "pointer", zIndex: 3 }}><MessengerToolIcon name="camera" size={18} /></button>
                    <button type="button" title="Ajouter des amis" onClick={() => setGroupFriendPickerOpen((v) => !v)} style={{ position: "absolute", top: 62, right: 14, width: 42, height: 42, borderRadius: 16, border: `1px solid #c78bff88`, background: selectedGroupIds.length ? "rgba(199,139,255,.22)" : "rgba(199,139,255,.10)", color: "#fff", fontSize: 24, lineHeight: 1, fontWeight: 1000, display: "grid", placeItems: "center", boxShadow: "0 0 18px rgba(199,139,255,.24)", cursor: "pointer", zIndex: 3 }}>+</button>
                    <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 11, alignItems: "center", minHeight: 96, paddingRight: 58 }}>
                      <button type="button" title="Importer l’avatar du groupe" onClick={() => groupAvatarInputRef.current?.click?.()} style={{ width: 72, height: 72, borderRadius: 999, border: `1px solid ${BLUE}AA`, background: newGroupAvatarUrl ? `center/cover url(${newGroupAvatarUrl})` : "radial-gradient(circle at 50% 28%, rgba(121,200,255,.20), rgba(0,0,0,.34))", color: BLUE, display: "grid", placeItems: "center", boxShadow: `0 0 24px ${BLUE}28, inset 0 1px 0 rgba(255,255,255,.10)`, cursor: "pointer", overflow: "hidden" }}>{newGroupAvatarUrl ? null : <MessengerToolIcon name="camera" size={26} />}</button>
                      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                        <div style={{ color: GOLD, fontWeight: 1000, fontSize: 12, textTransform: "uppercase", letterSpacing: .5 }}>Nouveau groupe</div>
                        <input value={newGroupName} onChange={(e) => setNewGroupName((e.target as HTMLInputElement).value)} placeholder="Nom du groupe…" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.48)", color: "#fff", fontWeight: 900, outline: "none" }} />
                        <div style={{ color: "rgba(255,255,255,.62)", fontSize: 11, fontWeight: 800 }}>{selectedGroupIds.length} ami(s) sélectionné(s)</div>
                      </div>
                    </div>
                    {selectedGroupIds.length ? <div style={{ display: "flex", gap: 6, paddingLeft: 86, marginTop: -4, overflowX: "auto" }}>{selectedGroupIds.map((id) => <AvatarBubble key={`sel-grp-${id}`} user={allMessengerContacts.find((u:any) => userIdOf(u) === id)} size={28} selected />)}</div> : null}
                  </div>
                  <input ref={groupAvatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readGroupMediaFile("avatar", (e.target as HTMLInputElement).files?.[0])} />
                  <input ref={groupCoverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readGroupMediaFile("cover", (e.target as HTMLInputElement).files?.[0])} />
                  {groupFriendPickerOpen ? <div style={{ border: `1px solid rgba(199,139,255,.30)`, borderRadius: 18, padding: 9, background: "rgba(0,0,0,.28)", display: "flex", gap: 10, overflowX: "auto" }}>
                    {allMessengerContacts.map((user: any) => {
                      const id = userIdOf(user); const selected = selectedGroupIds.includes(id);
                      return <button key={`grp-user-${id}`} type="button" onClick={() => toggleGroupMember(id)} style={{ position: "relative", flex: "0 0 74px", border: `1px solid ${selected ? "#c78bff" : STROKE}`, borderRadius: 18, padding: 8, background: selected ? "rgba(199,139,255,.18)" : "rgba(255,255,255,.035)", color: "#fff", display: "grid", justifyItems: "center", gap: 6, cursor: "pointer" }}>
                        <AvatarBubble user={user} size={46} selected={selected} />
                        <span style={{ width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 1000 }}>{asUserName(user)}</span>
                      </button>;
                    })}
                  </div> : null}
                  <ActionButton label={`Créer le groupe (${selectedGroupIds.length})`} tone="#c78bff" onClick={() => { createGroup(); setGroupPanel("list"); }} disabled={selectedGroupIds.length < 2} />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {groups.length ? groups.map((g) => {
                    const isOwner = (g.ownerId || currentAccountId) === currentAccountId;
                    return <button key={g.id} type="button" onClick={() => openGroupChat(g.id)} style={{ ...cardStyle({ padding: 0, borderColor: "rgba(199,139,255,.28)" }), width: "100%", textAlign: "left", cursor: "pointer", overflow: "hidden" }}>
                      <div style={{ minHeight: 78, padding: 11, background: g.coverUrl ? `linear-gradient(90deg, rgba(0,0,0,.18), rgba(0,0,0,.72)), center/cover url(${g.coverUrl})` : "linear-gradient(180deg, rgba(199,139,255,.10), rgba(255,255,255,.02))" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 16, border: `1px solid #c78bff66`, background: g.avatarUrl ? `center/cover url(${g.avatarUrl})` : "rgba(255,255,255,.08)", display: "grid", placeItems: "center", fontSize: 22 }}> {g.avatarUrl ? "" : "👥"}</div>
                            <div style={{ minWidth: 0 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</b><span style={{ color: "rgba(255,255,255,.62)", fontSize: 11 }}>{g.memberIds.length} amis • clique pour ouvrir</span></div>
                          </div>
                          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                            <button type="button" title="Renommer le groupe" aria-label="Renommer le groupe" onClick={(e) => { e.stopPropagation(); startRenameGroup(g); }} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${GOLD}77`, background: `linear-gradient(180deg, ${GOLD}18, rgba(255,255,255,.035))`, color: GOLD, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: `0 0 16px ${GOLD}22` }}><ChatActionIcon name="edit" size={16} /></button>
                            <button type="button" title={isOwner ? "Supprimer le groupe" : "Quitter le groupe"} aria-label={isOwner ? "Supprimer le groupe" : "Quitter le groupe"} onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${RED}77`, background: `linear-gradient(180deg, ${RED}18, rgba(255,255,255,.035))`, color: RED, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: `0 0 16px ${RED}22` }}><ChatActionIcon name="delete" size={16} /></button>
                          </div>
                        </div>
                      </div>
                      {renamingGroupId === g.id ? <div onClick={(e) => e.stopPropagation()} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: 10 }}><input value={renameGroupValue} onChange={(e) => setRenameGroupValue((e.target as HTMLInputElement).value)} placeholder="Nom du groupe" style={{ border: `1px solid ${STROKE}`, borderRadius: 12, padding: "8px 10px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850 }} /><button type="button" onClick={saveRenameGroup} style={{ border: `1px solid ${GREEN}66`, background: "rgba(125,255,178,.12)", color: GREEN, borderRadius: 12, padding: "8px 10px", fontWeight: 1000 }}>OK</button></div> : null}
                      <div style={{ padding: "8px 11px 11px", display: "flex", gap: 6 }}>{g.memberIds.slice(0, 8).map((id) => <AvatarBubble key={id} user={allMessengerContacts.find((u:any)=>userIdOf(u)===id)} size={30} />)}</div>
                    </button>;
                  }) : <EmptyCard icon="👥" title="Aucun groupe" text="Crée un groupe dans l’onglet Créer pour le retrouver ici." />}
                </div>
              )}
            </div>
          ) : chatMode === "rooms" ? (
            <div style={cardStyle({ borderColor: "rgba(125,255,178,.30)" })}>
              <SectionTitle title="Salons communautaires" subtitle="Salons publics à thème, messages éphémères supprimés automatiquement après 10 minutes." badge={rooms.length} />
              <div style={{ display: "grid", gap: 8 }}>
                <input value={newRoomTitle} onChange={(e) => setNewRoomTitle((e.target as HTMLInputElement).value)} placeholder="Nom du salon…" style={{ border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none" }} />
                <input value={newRoomTopic} onChange={(e) => setNewRoomTopic((e.target as HTMLInputElement).value)} placeholder="Thème : darts, baby-foot, tournoi, recherche joueurs…" style={{ border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none" }} />
                <ActionButton label="Créer un salon éphémère" tone={GREEN} onClick={createRoom} />
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {rooms.length ? rooms.map((r) => <div key={r.id} style={cardStyle({ padding: 11, borderColor: "rgba(125,255,178,.28)" })}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{r.title}</b><Pill tone={GREEN}>{r.ttlMinutes} min</Pill></div>
                  <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12, marginTop: 4 }}>{r.topic}</div>
                  <div style={{ color: GREEN, fontSize: 11, fontWeight: 850, marginTop: 7 }}>🛡️ IA Admin + messages éphémères</div><div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><ActionButton label="Rejoindre" tone={GREEN} onClick={() => openRoomChat(r.id)} /><ActionButton label="Quitter" tone={RED} onClick={() => setInfo(`Salon ${r.title} quitté`)} /><ActionButton label="Supprimer" tone={RED} onClick={() => setRooms((prev) => prev.filter((x) => x.id !== r.id))} /></div>
                </div>) : <EmptyCard icon="💬" title="Aucun salon actif" text="Crée un salon public ; les messages y seront traités comme éphémères côté UI." />}
              </div>
            </div>
          ) : (
            <div style={cardStyle({ borderColor: "rgba(255,213,106,.30)" })}>
              <SectionTitle title="Petites annonces" subtitle="Publier une annonce liée à l’application — IA Admin bloque contenu sexuel, insultes, haine, arnaques et hors charte." badge={announcements.filter(a => a.status === "published").length} />
              <div style={{ display: "grid", gap: 8 }}>
                <input value={announcementTitle} onChange={(e) => setAnnouncementTitle((e.target as HTMLInputElement).value)} placeholder="Titre de l’annonce…" style={{ border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none" }} />
                <textarea value={announcementText} onChange={(e) => setAnnouncementText((e.target as HTMLTextAreaElement).value)} placeholder="Ex : cherche joueurs ce soir, vends cible, tournoi baby-foot…" rows={3} style={{ border: `1px solid ${STROKE}`, borderRadius: 14, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 800, outline: "none", resize: "vertical" }} />
                <ActionButton label="Publier l’annonce" tone={GOLD} onClick={publishAnnouncement} />
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {announcements.length ? announcements.map((a) => <div key={a.id} style={cardStyle({ padding: 11, borderColor: a.status === "blocked" ? `${RED}55` : `${GOLD}44` })}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b>{a.title}</b><div style={{ display: "flex", gap: 6, alignItems: "center" }}><Pill tone={a.status === "blocked" ? RED : GOLD}>{a.status === "blocked" ? "Bloquée IA" : "Publiée"}</Pill><button type="button" onClick={() => deleteAnnouncement(a.id)} style={{ border: `1px solid ${RED}66`, background: "rgba(255,123,123,.10)", color: RED, borderRadius: 10, padding: "5px 8px", fontWeight: 1000 }}>Supprimer</button></div></div>
                  <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginTop: 6 }}>{a.status === "blocked" ? a.reason : a.text}</div>
                </div>) : <EmptyCard icon="📣" title="Aucune annonce" text="Publie une petite annonce liée à l’application ou à tes parties." />}
              </div>
            </div>
          )}
        </>
      ) : null}

            {active === "links" ? (
        <>
          <SectionTitle title="Association profils locaux / compte ami" subtitle="Demandes reçues/envoyées et récapitulatif des profils liés." badge={counters.links} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 10, alignItems: "stretch" }}>
            <LabeledChoiceButton active={linkView === "received"} label="Reçues" badge={incomingProfileLinks.filter(l => String(l.status || "pending") === "pending").length} tone={GREEN} onClick={() => setLinkView("received")}><MessageCenterTabIcon name="links" size={22} /></LabeledChoiceButton>
            <LabeledChoiceButton active={linkView === "sent"} label="Envoyées" badge={outgoingProfileLinks.filter(l => String(l.status || "pending") === "pending").length} tone={GOLD} onClick={() => setLinkView("sent")}><ChatActionIcon name="share" size={21} /></LabeledChoiceButton>
            <button
              type="button"
              title="Actualiser / synchroniser"
              aria-label="Actualiser / synchroniser"
              onClick={() => runAction("Associations actualisées ✅", async () => { await loadAll(true); })}
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                border: `1px solid ${BLUE}88`,
                background: `radial-gradient(110% 120% at 50% 0%, ${BLUE}30, rgba(255,255,255,.055) 62%, rgba(0,0,0,.30))`,
                color: BLUE,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: `0 -5px 18px ${BLUE}38, 0 0 18px ${BLUE}20`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a9 9 0 0 1-15.3 6.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 12A9 9 0 0 1 18.3 5.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 2v4h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 22v-4H2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {(() => {
            const baseList = linkView === "received" ? incomingProfileLinks : outgoingProfileLinks;
            const baseIds = new Set(baseList.map((l) => l.id));
            const list = dedupedProfileLinks.filter((l) => baseIds.has(l.id));
            return list.length ? <div style={{ display: "grid", gap: 10 }}>{list.map((link) => {
              const incoming = link.direction !== "outgoing";
              const tone = statusColor(link.status);
              const requester = link.requesterUser;
              const receiver = link.targetUser;
              const localProfile = {
                id: link.localProfileId,
                userId: link.localProfileId,
                displayName: link.localProfileName || link.localProfileId || "Profil local",
                nickname: link.localProfileName || link.localProfileId || "Profil local",
                avatarUrl: link.localProfileAvatarUrl || link.statsMeta?.localProfileAvatarUrl || link.statsMeta?.avatarUrl || link.statsMeta?.avatar || "",
                status: "offline",
              };
              return <div key={link.id} style={cardStyle({ borderColor: `${tone}55`, padding: 10 })}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 9, alignItems: "center" }}>
                  <div style={{ display: "grid", justifyItems: "center", gap: 5, minWidth: 58 }}>
                    <AvatarBubble user={requester} size={48} />
                    <div
                      title={asUserName(requester)}
                      style={{
                        maxWidth: 76,
                        border: `1px solid ${BLUE}77`,
                        color: BLUE,
                        borderRadius: 999,
                        padding: "4px 7px",
                        background: `${BLUE}14`,
                        fontSize: 9.5,
                        fontWeight: 1000,
                        lineHeight: 1,
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {asUserName(requester)}
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${tone}44`, borderRadius: 17, padding: 8, background: "linear-gradient(180deg, rgba(255,255,255,.055), rgba(0,0,0,.20))", minWidth: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 20px auto", gap: 7, alignItems: "center", justifyContent: "start" }}>
                      <div style={{ display: "grid", justifyItems: "center", gap: 3 }}>
                        <AvatarBubble user={localProfile} size={40} showStatus={false} />
                        <span title={link.localProfileName || link.localProfileId} style={{ maxWidth: 86, color: BLUE, fontSize: 9.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Profil local</span>
                      </div>
                      <div style={{ color: tone, fontWeight: 1000, textAlign: "center", fontSize: 16 }}>→</div>
                      <div style={{ display: "grid", justifyItems: "center", gap: 3 }}>
                        <AvatarBubble user={receiver} size={40} />
                        <span title={asUserName(receiver)} style={{ maxWidth: 86, color: GREEN, fontSize: 9.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asUserName(receiver)}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "rgba(255,255,255,.78)",
                        fontSize: 10.5,
                        fontWeight: 900,
                        lineHeight: 1.22,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      <b style={{ color: BLUE }}>{link.localProfileName || link.localProfileId}</b> associé à <b style={{ color: GREEN }}>{asUserName(receiver)}</b>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6, alignContent: "center", justifyItems: "center" }}>
                    <button
                      type="button"
                      title={statusLabel(link.status)}
                      onClick={() => {
                        if (incoming && String(link.status || "pending") === "pending") {
                          runAction("Association acceptée ✅", () => respondProfileFriendLink(link.id, "accepted"));
                        }
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 13,
                        border: `1px solid ${tone}88`,
                        background: `${tone}18`,
                        color: tone,
                        display: "grid",
                        placeItems: "center",
                        cursor: incoming && String(link.status || "pending") === "pending" ? "pointer" : "default",
                        boxShadow: `0 0 14px ${tone}22`,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        {String(link.status || "pending").toLowerCase() === "accepted" ? (
                          <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></>
                        )}
                      </svg>
                    </button>

                    <button
                      type="button"
                      title={link.statsShared ? "Stats liées" : "Stats non liées"}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 13,
                        border: `1px solid ${(link.statsShared ? GREEN : RED)}88`,
                        background: `${(link.statsShared ? GREEN : RED)}18`,
                        color: link.statsShared ? GREEN : RED,
                        display: "grid",
                        placeItems: "center",
                        boxShadow: `0 0 14px ${(link.statsShared ? GREEN : RED)}22`,
                      }}
                    >
                      <MessengerToolIcon name="stats" size={18} />
                    </button>

                    <button
                      type="button"
                      title="Supprimer l’association"
                      onClick={() => runAction("Association supprimée ✅", () => deleteProfileFriendLink(link.id))}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 13,
                        border: `1px solid ${RED}88`,
                        background: `${RED}18`,
                        color: RED,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        boxShadow: `0 0 14px ${RED}22`,
                      }}
                    >
                      <ChatActionIcon name="delete" size={17} />
                    </button>
                  </div>
                </div>

                {incoming && String(link.status || "pending") === "pending" ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <ActionButton label="Refuser" tone={RED} onClick={() => runAction("Association refusée", () => respondProfileFriendLink(link.id, "refused"))} />
                  </div>
                ) : null}
              </div>;
            })}</div> : <EmptyCard icon="🔗" title={`Aucune demande ${linkView === "received" ? "reçue" : "envoyée"}`} text="Les associations profil local ↔ compte ami apparaîtront ici." />;
          })()}
        </>
      ) : null}

      {active === "shares" ? (
        <>
          <SectionTitle title="Parties partagées" subtitle="Parties reçues ou envoyées entre amis." badge={counters.shares} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            <LabeledChoiceButton
              active={shareView === "received"}
              label="Reçues"
              badge={incomingShares.filter((s) => String(s.status || "pending") === "pending").length}
              tone={GREEN}
              onClick={() => setShareView("received")}
            >
              <MessageCenterTabIcon name="shares" size={22} />
            </LabeledChoiceButton>
            <LabeledChoiceButton
              active={shareView === "sent"}
              label="Envoyées"
              badge={outgoingShares.filter((s) => String(s.status || "pending") === "pending").length}
              tone={GOLD}
              onClick={() => setShareView("sent")}
            >
              <ChatActionIcon name="share" size={21} />
            </LabeledChoiceButton>
          </div>
          {(() => {
            const list = shareView === "received" ? incomingShares : outgoingShares;
            return list.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((item) => {
                  const tone = statusColor(item.status);
                  const pending = String(item.status || "pending") === "pending";
                  const peer = shareView === "received" ? item.ownerUser : (item as any).targetUser || (item as any).toUser;
                  return (
                    <div key={item.id} style={cardStyle({ borderColor: `${tone}55` })}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 1000, fontSize: 15 }}>{titleOfSharedMatch(item)}</div>
                          <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12, marginTop: 4 }}>
                            {shareView === "received" ? "De" : "À"} : <b style={{ color: "#fff" }}>{asUserName(peer)}</b>
                          </div>
                          <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12, marginTop: 4 }}>{playersLine(item.payload)}</div>
                        </div>
                        <Pill tone={tone}>{statusLabel(item.status)}</Pill>
                      </div>
                      {item.message ? <div style={{ marginTop: 9, color: "rgba(255,255,255,.78)", fontSize: 13 }}>“{item.message}”</div> : null}
                      {shareView === "received" ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                          <ActionButton label="Accepter" tone={GREEN} disabled={!pending} onClick={() => runAction("Partie acceptée ✅", () => acceptSharedMatch(item.id))} />
                          <ActionButton label="Importer" tone={GOLD} disabled={String(item.status || "") === "imported"} onClick={() => runAction("Partie marquée importée ✅", () => importSharedMatch(item.id))} />
                          <ActionButton label="Refuser" tone={RED} disabled={!pending} onClick={() => runAction("Partie refusée", () => refuseSharedMatch(item.id))} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyCard icon="🏆" title={shareView === "received" ? "Aucune partie reçue" : "Aucune partie envoyée"} text={shareView === "received" ? "Les parties envoyées directement par tes amis apparaîtront ici." : "Les parties que tu partages avec tes amis apparaîtront ici."} />
            );
          })()}
        </>
      ) : null}

      {active === "requests" ? (
        <>
          <SectionTitle title="Demandes d’amis" subtitle="Demandes reçues et envoyées depuis le compte NAS." badge={counters.requests} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            <LabeledChoiceButton
              active={requestView === "received"}
              label="Reçues"
              badge={incomingFriendRequests.length}
              tone={GREEN}
              onClick={() => setRequestView("received")}
            >
              <MessageCenterTabIcon name="requests" size={22} />
            </LabeledChoiceButton>
            <LabeledChoiceButton
              active={requestView === "sent"}
              label="Envoyées"
              badge={outgoingFriendRequests.length}
              tone={GOLD}
              onClick={() => setRequestView("sent")}
            >
              <ChatActionIcon name="share" size={21} />
            </LabeledChoiceButton>
          </div>
          <input value={friendSearch} onChange={(e) => setFriendSearch((e.target as HTMLInputElement).value)} placeholder="Rechercher un ami par pseudo ou mail…" style={{ width: "100%", marginBottom: 12, border: `1px solid ${STROKE}`, borderRadius: 15, padding: "11px 12px", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 850, outline: "none" }} />

          {requestView === "received" ? (
            filteredIncomingFriendRequests.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredIncomingFriendRequests.map((req) => {
                  const user = req.fromUser;
                  return (
                    <div key={req.id} style={cardStyle({ borderColor: `${GREEN}55`, padding: 12 })}>
                      <FriendRequestUserCard
                        user={user}
                        tone={GREEN}
                        right={<Pill tone={GREEN}>Reçue</Pill>}
                      />
                      {req.message ? <div style={{ marginTop: 9, color: "rgba(255,255,255,.70)", fontSize: 12 }}>“{req.message}”</div> : null}
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <ActionButton label="Accepter" tone={GREEN} onClick={() => runAction("Demande d’ami acceptée ✅", () => respondFriendRequest(req.id, "accepted"))} />
                        <ActionButton label="Refuser" tone={RED} onClick={() => runAction("Demande d’ami refusée", () => respondFriendRequest(req.id, "rejected"))} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyCard icon="👥" title="Aucune demande reçue" text={`Tu as ${friends.length} ami${friends.length > 1 ? "s" : ""}. Les nouvelles demandes reçues apparaîtront ici.`} />
            )
          ) : filteredOutgoingFriendRequests.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredOutgoingFriendRequests.map((req) => {
                const user = req.toUser;
                return (
                  <div key={req.id} style={cardStyle({ borderColor: `${GOLD}55`, padding: 12 })}>
                    <FriendRequestUserCard
                      user={user}
                      tone={GOLD}
                      right={<Pill tone={GOLD}>En attente</Pill>}
                    />
                    {req.message ? <div style={{ marginTop: 9, color: "rgba(255,255,255,.70)", fontSize: 12 }}>“{req.message}”</div> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyCard icon="📤" title="Aucune demande envoyée" text="Les invitations envoyées à d’autres joueurs apparaîtront ici." />
          )}
        </>
      ) : null}

      {active === "invites" ? (
        <>
          <SectionTitle title="Invitations de salon online" subtitle="Les invitations envoyées depuis un salon Online apparaîtront ici : un hôte choisit ses amis dans Online, l’invitation arrive dans Messages." badge={inviteView === "received" ? salonInvites.length : sentSalonInvites.length} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <button type="button" onClick={() => setInviteView("received")} style={{ ...tabButtonStyle(inviteView === "received", GREEN), padding: "12px 14px" }}>🎮 Reçues {salonInvites.length ? <span style={{ marginLeft: 6, color: GREEN }}>({salonInvites.length})</span> : null}</button>
            <button type="button" onClick={() => setInviteView("sent")} style={{ ...tabButtonStyle(inviteView === "sent", GOLD), padding: "12px 14px" }}>📤 Envoyées {sentSalonInvites.length ? <span style={{ marginLeft: 6, color: GOLD }}>({sentSalonInvites.length})</span> : null}</button>
          </div>
          {inviteView === "received" ? (
            salonInvites.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {salonInvites.map((inv: any, idx: number) => (
                  <div key={inv?.id || idx} style={cardStyle()}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 1000 }}>{inv?.title || `Salon ${inv?.code || "online"}`}</div>
                      <Pill tone={BLUE}>{inv?.mode || "Online"}</Pill>
                    </div>
                    <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12, marginTop: 5 }}>Reçue de {inv?.fromName || inv?.hostName || "un ami"}. L’invitation permettra de rejoindre directement le salon.</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionButton label="Rejoindre" tone={GREEN} onClick={() => go?.("online", { lobbyCode: inv?.code })} />
                      <ActionButton label="Ignorer" tone={RED} onClick={() => setInfo("Invitation ignorée côté affichage.")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyCard icon="🎮" title="Aucune invitation reçue" text="Quand un hôte invitera tes amis depuis la création d’un salon Online, la demande apparaîtra ici avec Rejoindre." />
          ) : (
            sentSalonInvites.length ? (
              <div style={{ display: "grid", gap: 10 }}>{sentSalonInvites.map((inv: any, idx: number) => <div key={inv?.id || idx} style={cardStyle()}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{inv?.title || `Salon ${inv?.code || "online"}`}</b><Pill tone={GOLD}>{inv?.status || "Envoyée"}</Pill></div><div style={{ color: "rgba(255,255,255,.62)", fontSize: 12, marginTop: 5 }}>Envoyée à {inv?.toName || inv?.friendName || "un ami"}.</div></div>)}</div>
            ) : <EmptyCard icon="📤" title="Aucune invitation envoyée" text="Les invitations que tu enverras depuis un salon Online seront listées ici." />
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

    </div>
  );
}
