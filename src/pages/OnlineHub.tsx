import * as React from "react";
import { searchUsers, type OnlineFriendUser } from "../lib/friendsApi";
import { useOnlineFriends } from "../hooks/useOnlineFriends";
import { useFriendRequests } from "../hooks/useFriendRequests";
import { usePresence } from "../hooks/usePresence";
import { useSharedOnlineItems } from "../hooks/useSharedOnlineItems";
import { listOnlineStatsCleanupSessions } from "../lib/onlineStatsExclusions";
import { useTheme } from "../contexts/ThemeContext";

type Props = { store?: any; update?: (patch: any) => void; go?: (tab: string, params?: any) => void };
type IconKind = "hub" | "play" | "friends" | "requests" | "stats" | "share" | "message" | "refresh" | "search" | "trophy" | "rank" | "wifi" | "clock" | "logout" | "star" | "info" | "target";

function nameOf(u?: OnlineFriendUser | null) {
  return u?.displayName || u?.nickname || "Joueur";
}
function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
function userIdOf(u: OnlineFriendUser) {
  return String(u.userId || u.id || "");
}
function normalizeHex(value?: string, fallback = "#22E6FF") {
  const raw = String(value || fallback).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  return fallback;
}
function alpha(primary: string, hex = "33") {
  return `${normalizeHex(primary)}${hex}`;
}
function isGold(value: string) {
  const v = normalizeHex(value).toUpperCase();
  return ["#F6C256", "#FFD54A", "#F8C246", "#F5B841", "#E6B94E", "#D6A93D"].includes(v);
}

function Icon({ kind, size = 24, color = "currentColor" }: { kind: IconKind; size?: number; color?: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.15, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      {kind === "hub" ? <path {...common} d="M13 2 4 14h7l-1 8 10-13h-7V2Z" /> : null}
      {kind === "play" ? <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M10 8.5v7l5.5-3.5L10 8.5Z" /></> : null}
      {kind === "target" ? <><circle {...common} cx="12" cy="12" r="8" /><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="M12 2v4M12 18v4M2 12h4M18 12h4" /></> : null}
      {kind === "friends" ? <><path {...common} d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path {...common} d="M3.5 19c.7-3 2.4-4.6 5-4.6s4.3 1.6 5 4.6" /><path {...common} d="M16.5 11.5a2.6 2.6 0 1 0 0-5.2" /><path {...common} d="M15.5 14.5c2.2.2 3.8 1.7 4.5 4.2" /></> : null}
      {kind === "requests" ? <><path {...common} d="M4 7.5h16v11H4z" /><path {...common} d="m4 8 8 5.7L20 8" /></> : null}
      {kind === "stats" ? <><path {...common} d="M5 19V9" /><path {...common} d="M12 19V5" /><path {...common} d="M19 19v-7" /><path {...common} d="M3.5 19.5h17" /></> : null}
      {kind === "share" ? <><circle {...common} cx="7" cy="12" r="2.5" /><circle {...common} cx="17" cy="6" r="2.5" /><circle {...common} cx="17" cy="18" r="2.5" /><path {...common} d="m9.2 10.8 5.6-3.4" /><path {...common} d="m9.2 13.2 5.6 3.4" /></> : null}
      {kind === "message" ? <><path {...common} d="M4 5.5h16v11H8l-4 3v-14Z" /><path {...common} d="M8 9.5h8" /><path {...common} d="M8 13h5" /></> : null}
      {kind === "refresh" ? <><path {...common} d="M20 7v5h-5" /><path {...common} d="M4 17v-5h5" /><path {...common} d="M18.2 11A6.5 6.5 0 0 0 6.6 7.2" /><path {...common} d="M5.8 13A6.5 6.5 0 0 0 17.4 16.8" /></> : null}
      {kind === "search" ? <><circle {...common} cx="10.5" cy="10.5" r="5.5" /><path {...common} d="m15 15 5 5" /></> : null}
      {kind === "trophy" ? <><path {...common} d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path {...common} d="M8 6H5a3 3 0 0 0 3 3" /><path {...common} d="M16 6h3a3 3 0 0 1-3 3" /><path {...common} d="M12 12v4" /><path {...common} d="M8.5 20h7" /><path {...common} d="M10 16h4l1 4H9l1-4Z" /></> : null}
      {kind === "rank" ? <><path {...common} d="M5 20V9h4v11" /><path {...common} d="M10 20V4h4v16" /><path {...common} d="M15 20v-7h4v7" /></> : null}
      {kind === "wifi" ? <><path {...common} d="M5 10a10 10 0 0 1 14 0" /><path {...common} d="M8.5 13.5a5 5 0 0 1 7 0" /><path {...common} d="M12 18h.01" /></> : null}
      {kind === "clock" ? <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M12 7v5l3 2" /></> : null}
      {kind === "logout" ? <><path {...common} d="M10 7V5a2 2 0 0 1 2-2h6v18h-6a2 2 0 0 1-2-2v-2" /><path {...common} d="M3 12h11" /><path {...common} d="m11 8 4 4-4 4" /></> : null}
      {kind === "star" ? <path {...common} d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z" /> : null}
      {kind === "info" ? <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 10.5v6" /><path {...common} d="M12 7.5h.01" /></> : null}
    </svg>
  );
}

function Avatar({ user, size = 82, primary }: { user?: OnlineFriendUser | null; size?: number; primary: string }) {
  const name = nameOf(user);
  const ring = `0 0 0 3px rgba(255,255,255,.06), 0 0 24px ${alpha(primary, "66")}`;
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: `2px solid ${alpha(primary, "e5")}`, boxShadow: ring }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: 999, display: "grid", placeItems: "center", background: `radial-gradient(circle at 35% 28%, ${alpha(primary, "f2")}, ${alpha(primary, "88")} 44%, rgba(0,0,0,.9) 100%)`, color: "#061018", border: `2px solid ${alpha(primary, "e8")}`, fontWeight: 1000, fontSize: Math.max(16, Math.round(size * .27)), boxShadow: ring }}>{initials(name)}</div>;
}
function Stars({ primary, count = 4 }: { primary: string; count?: number }) {
  return <div style={{ display: "flex", gap: 1, justifyContent: "center", filter: `drop-shadow(0 0 8px ${alpha(primary, "aa")})` }}>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ color: i < count ? primary : alpha(primary, "38"), fontSize: 13, lineHeight: 1 }}>★</span>)}</div>;
}
function Status({ s, primary }: { s?: string; primary: string }) {
  const color = s === "online" ? "#43f07e" : s === "away" ? primary : "#85858f";
  const label = s === "online" ? "En ligne" : s === "away" ? "Absent" : "Hors ligne";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 950, color, background: `${color}1f`, border: `1px solid ${color}55` }}><i style={{ width: 7, height: 7, borderRadius: 99, background: color, boxShadow: `0 0 12px ${color}` }} />{label}</span>;
}
function neonCard(primary: string): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 14,
    background: `linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.026)), radial-gradient(circle at 0% 0%, ${alpha(primary, "18")}, transparent 48%)`,
    border: `1px solid ${alpha(primary, "38")}`,
    boxShadow: `0 18px 38px rgba(0,0,0,.58), inset 0 0 0 1px rgba(255,255,255,.04), 0 0 28px ${alpha(primary, "18")}`,
    backdropFilter: "blur(12px)",
  };
}
function outlineButton(primary: string): React.CSSProperties {
  return {
    borderRadius: 17,
    padding: "10px 12px",
    fontWeight: 950,
    background: "rgba(5,9,18,.58)",
    color: "#fff",
    border: `1px solid ${alpha(primary, "64")}`,
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,.04), 0 0 16px ${alpha(primary, "18")}`,
  };
}
function filledButton(primary: string): React.CSSProperties {
  return {
    border: 0,
    borderRadius: 18,
    padding: "12px 14px",
    fontWeight: 1000,
    background: `linear-gradient(135deg, ${alpha(primary, "e8")}, ${alpha(primary, "8e")})`,
    color: "#061018",
    boxShadow: `0 0 22px ${alpha(primary, "58")}, inset 0 1px 0 rgba(255,255,255,.36)`,
  };
}

export default function OnlineHub({ store, go }: Props) {
  const { theme } = useTheme();
  // Couleur unique de page : le doré est interdit ici. Si le thème global renvoie encore du gold,
  // l'Online bascule automatiquement en cyan néon pour rester cohérent avec la maquette validée.
  const themePrimary = normalizeHex(theme.primary || "#22E6FF");
  const primary = isGold(themePrimary) ? "#22E6FF" : themePrimary;
  const text = theme.text || "#f7fbff";
  const bg = normalizeHex(theme.bg || "#020611", "#020611");
  const { friends, loading: friendsLoading, error: friendsError, refresh: refreshFriends, removeFriend } = useOnlineFriends();
  const { incoming, error: requestsError, refresh: refreshRequests, send } = useFriendRequests();
  const { items, error: sharedError, refresh: refreshShared } = useSharedOnlineItems();
  const { status, error: presenceError, setPresence } = usePresence();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<OnlineFriendUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const [showStatusPanel, setShowStatusPanel] = React.useState(false);
  const unread = items.filter((i) => i.direction === "incoming" && !i.readAt).length;
  const connected = status !== "offline";
  const currentUser = friends[0] || null;

  const loadMatches = React.useCallback(async () => {
    try {
      const cleanupSessions = await listOnlineStatsCleanupSessions();
      const counted = cleanupSessions.filter((session) => !session.excludedFromStats).length;
      setMatchCount(counted);
    } catch (error) {
      console.warn("[OnlineHub] compteur MATCHS stats indisponible", error);
      setMatchCount(0);
    }
  }, [store]);

  async function runSearch() {
    if (query.trim().length < 2) return setResults([]);
    setSearching(true);
    try { setResults(await searchUsers(query)); } finally { setSearching(false); }
  }
  React.useEffect(() => { const id = window.setTimeout(runSearch, 350); return () => window.clearTimeout(id); }, [query]);
  React.useEffect(() => {
    let off = false;
    const refreshCount = async () => { if (!off) await loadMatches(); };
    refreshCount();
    const events = ["dc-online-stats-exclusions-changed", "dc-history-updated", "storage"];
    events.forEach((eventName) => window.addEventListener(eventName, refreshCount as EventListener));
    return () => {
      off = true;
      events.forEach((eventName) => window.removeEventListener(eventName, refreshCount as EventListener));
    };
  }, [loadMatches]);
  async function refreshAll() {
    await Promise.allSettled([refreshFriends(), refreshRequests(), refreshShared(), setPresence("online")]);
    await loadMatches();
  }

  const errors = [presenceError, friendsError, requestsError, sharedError].filter(Boolean);
  const nav = [
    { kind: "hub" as const, title: "Hub", value: connected ? "OK" : "OFF", active: true, action: () => {} },
    { kind: "target" as const, title: "Jouer", value: "X01", action: () => go?.("x01_online_setup") },
    { kind: "friends" as const, title: "Amis", value: friends.length, action: () => go?.("messages") },
    { kind: "requests" as const, title: "Demandes", value: incoming.length, action: () => go?.("friend_requests") },
    { kind: "trophy" as const, title: "Tournois", value: "", action: () => go?.("tournaments") },
    { kind: "rank" as const, title: "Classements", value: matchCount, action: () => go?.("stats_online") },
    { kind: "message" as const, title: "Salon", value: "", action: () => go?.("messages") },
  ];
  const quickStats = [
    ["AMIS", friends.length, "friends" as IconKind],
    ["DEMANDES", incoming.length, "requests" as IconKind],
    ["PARTAGES", unread, "share" as IconKind],
    ["MATCHS", matchCount, "stats" as IconKind],
  ];

  return <div style={{ minHeight: "100dvh", padding: "16px 12px 104px", color: text, background: `radial-gradient(760px 380px at 88% -6%, ${alpha(primary, "54")}, transparent 60%), radial-gradient(560px 340px at -8% 34%, ${alpha(primary, "26")}, transparent 66%), linear-gradient(180deg, ${bg}, #020611 58%, #000 100%)` }}>
    <style>{`
      .online-scroll::-webkit-scrollbar{display:none}
      .online-tile{position:relative; transition:transform .14s ease, filter .14s ease, border-color .14s ease;}
      .online-tile:active{transform:scale(.965)}
      .online-marquee{white-space:nowrap; animation:onlineMarquee 19s linear infinite;}
      @keyframes onlineMarquee{0%{transform:translateX(18%)}100%{transform:translateX(-82%)}}
    `}</style>
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 13 }}>
      <section style={{ ...neonCard(primary), padding: 16, background: `radial-gradient(circle at 78% 6%, ${alpha(primary, "4f")}, transparent 28%), linear-gradient(145deg, ${alpha(primary, "1d")}, rgba(255,255,255,.055) 42%, rgba(255,255,255,.024))` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 36, fontWeight: 1000, letterSpacing: 1.3, lineHeight: 1, color: primary, textShadow: `0 0 24px ${alpha(primary, "aa")}` }}>ONLINE</div>
            <span style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "5px 10px", background: connected ? "rgba(67,240,126,.18)" : "rgba(255,80,80,.16)", color: connected ? "#7dffad" : "#ff8b8b", border: `1px solid ${connected ? "rgba(67,240,126,.42)" : "rgba(255,80,80,.38)"}`, fontSize: 12, fontWeight: 1000 }}><i style={{ width: 8, height: 8, borderRadius: 999, background: connected ? "#43f07e" : "#ff5a6f" }} />Serveur : {connected ? "OK" : "OFF"}</span>
          </div>
          <button className="online-tile" style={{ width: 54, height: 54, borderRadius: 999, display: "grid", placeItems: "center", color: primary, background: `linear-gradient(180deg, ${alpha(primary, "22")}, rgba(0,0,0,.38))`, border: `1px solid ${alpha(primary, "88")}`, boxShadow: `0 0 26px ${alpha(primary, "70")}` }} onClick={refreshAll} title="Actualiser"><Icon kind="info" /></button>
        </div>

        <div style={{ marginTop: 12, borderRadius: 26, padding: 14, background: `linear-gradient(135deg, ${alpha(primary, "14")}, rgba(5,11,24,.82))`, border: `1px solid ${alpha(primary, "30")}`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.035), 0 0 24px ${alpha(primary, "16")}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
            <div style={{ minWidth: 0, display: "grid", gap: 8, alignContent: "center" }}>
              <b style={{ display: "block", fontSize: 25, color: text, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf(currentUser as any)}</b>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><Status s={status} primary={primary} /><span style={{ opacity: .72, fontSize: 12, fontWeight: 850 }}>À l’instant</span></div>
            </div>

            <div style={{ position: "relative", width: 148, height: 138, display: "grid", placeItems: "center" }}>
              <div style={{ position: "absolute", top: -5, left: 0, right: 0, display: "flex", justifyContent: "center", transform: "scale(1.25)", transformOrigin: "top center" }}><Stars primary={primary} /></div>
              <Avatar user={currentUser as any} primary={primary} size={94} />
              <span style={{ position: "absolute", left: 4, bottom: 7, width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(3,8,18,.94)", border: `1px solid ${alpha(primary, "82")}`, boxShadow: `0 0 16px ${alpha(primary, "48")}`, color: primary, fontSize: 10, fontWeight: 1000 }}>DARTSET</span>
              <span style={{ position: "absolute", right: 4, bottom: 7, width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(3,8,18,.94)", border: `1px solid ${alpha(primary, "82")}`, boxShadow: `0 0 16px ${alpha(primary, "48")}`, color: primary, fontSize: 12, fontWeight: 1000 }}>{(currentUser as any)?.countryCode || "FR"}</span>
            </div>

            <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
              <button className="online-tile" style={{ ...outlineButton(primary), minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={() => setShowStatusPanel((v) => !v)}><Icon kind="wifi" size={18} color={primary} />Statut</button>
              <button className="online-tile" style={{ ...outlineButton(primary), minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={() => go?.("stats_online")}><Icon kind="star" size={18} color={primary} />Rating</button>
              <button className="online-tile" style={{ ...outlineButton(primary), minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={() => go?.("tournaments")}><Icon kind="trophy" size={18} color={primary} />Ligue</button>
              <button className="online-tile" style={{ ...outlineButton(primary), minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={() => go?.("stats_online")}><Icon kind="rank" size={18} color={primary} />Classement</button>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
            {[
              ["STATUT", status === "offline" ? "OFF" : status === "away" ? "ABSENT" : "EN LIGNE"],
              ["RATING", "—"],
              ["LIGUE", "X01"],
              ["CLASSEMENT", matchCount || "—"],
            ].map(([label, value]) => <button key={String(label)} onClick={() => label === "STATUT" ? setShowStatusPanel((v) => !v) : undefined} style={{ borderRadius: 16, padding: "9px 7px", background: `linear-gradient(180deg, ${alpha(primary, "12")}, rgba(0,0,0,.30))`, border: `1px solid ${alpha(primary, "45")}`, color: text, fontWeight: 950, fontSize: 11, boxShadow: `0 0 12px ${alpha(primary, "12")}` }}><span style={{ display: "block", color: primary, fontSize: 9, letterSpacing: .5 }}>{label}</span>{value}</button>)}
          </div>

          {showStatusPanel ? <div style={{ marginTop: 10, ...neonCard(primary), display: "grid", gap: 8 }}>
            <b style={{ color: primary }}>Statut joueur</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              <button style={outlineButton(primary)} onClick={() => { setPresence("online"); setShowStatusPanel(false); }}>En ligne</button>
              <button style={outlineButton(primary)} onClick={() => { setPresence("away"); setShowStatusPanel(false); }}>Absent</button>
              <button style={outlineButton(primary)} onClick={() => { setPresence("offline"); setShowStatusPanel(false); }}>Connexion</button>
            </div>
          </div> : null}
        </div>
      </section>

      {errors.length ? <section style={{ ...neonCard(primary), color: "#ffb3b3", fontSize: 12 }}>{errors.map(String).join(" · ")}</section> : null}

      <section style={{ ...neonCard(primary), padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${alpha(primary, "24")}` }}>
          <b style={{ fontSize: 13, letterSpacing: .9, color: primary, textShadow: `0 0 14px ${alpha(primary, "70")}` }}>LIVE FEED</b>
          <span style={{ borderRadius: 999, padding: "4px 9px", color: primary, background: alpha(primary, "18"), border: `1px solid ${alpha(primary, "42")}`, fontSize: 11, fontWeight: 1000 }}>AUTO</span>
        </div>
        <div style={{ overflow: "hidden", padding: "10px 0" }}>
          <div className="online-marquee" style={{ display: "inline-flex", gap: 10, alignItems: "center", fontSize: 12, fontWeight: 900 }}>
            {connected ? "● Session connectée" : "● Session déconnectée"} <span style={{ color: primary }}>●</span> Crée un salon X01 ou rejoins avec un code <span style={{ color: primary }}>●</span> Stats Online reliées à l’historique <span style={{ color: primary }}>●</span> Classements et tournois
          </div>
        </div>
      </section>

      <nav className="online-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "3px 1px 8px" }}>
        {nav.map((item) => <button key={item.title} className="online-tile" onClick={item.action} style={{ minWidth: 96, minHeight: 96, borderRadius: 24, padding: "12px 9px", textAlign: "center", color: text, background: item.active ? `linear-gradient(180deg, ${alpha(primary, "3b")}, rgba(255,255,255,.052))` : `linear-gradient(180deg, ${alpha(primary, "10")}, rgba(255,255,255,.03))`, border: `1px solid ${item.active ? alpha(primary, "e6") : alpha(primary, "2e")}`, boxShadow: item.active ? `0 0 26px ${alpha(primary, "5c")}, inset 0 0 0 1px rgba(255,255,255,.075)` : `0 0 14px ${alpha(primary, "10")}, inset 0 0 0 1px rgba(255,255,255,.03)` }}>
          {item.value !== "" ? <span style={{ position: "absolute", right: 10, top: 9, borderRadius: 999, minWidth: 20, height: 20, padding: "0 6px", display: "grid", placeItems: "center", background: item.active ? alpha(primary, "35") : "rgba(255,255,255,.09)", color: item.active ? primary : text, fontSize: 10, fontWeight: 1000, border: `1px solid ${alpha(primary, "34")}` }}>{item.value}</span> : null}
          <span style={{ width: 47, height: 47, margin: "0 auto", borderRadius: 18, display: "grid", placeItems: "center", color: primary, background: `radial-gradient(circle, ${alpha(primary, "30")}, rgba(0,0,0,.33))`, boxShadow: `0 0 18px ${alpha(primary, "42")}` }}><Icon kind={item.kind} size={29} /></span>
          <div style={{ marginTop: 9, fontSize: 14, fontWeight: 1000, color: item.active ? primary : text, textShadow: item.active ? `0 0 14px ${alpha(primary, "66")}` : "none" }}>{item.title}</div>
        </button>)}
      </nav>

      <section style={neonCard(primary)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "stretch" }}>
          <div style={{ borderRadius: 20, padding: 13, background: `linear-gradient(135deg, ${alpha(primary, "18")}, rgba(255,255,255,.04))`, border: `1px solid ${alpha(primary, "30")}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: primary, fontWeight: 1000, fontSize: 18, textTransform: "uppercase" }}><Icon kind="hub" size={20} /> Hub</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Lance un salon, rejoins un ami, puis retrouve les matchs dans Stats Online.</div>
          </div>
          <button className="online-tile" style={{ ...filledButton(primary), minWidth: 132, display: "grid", alignContent: "center", gap: 4, textAlign: "left" }} onClick={() => go?.("x01_online_setup")}><span style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon kind="target" size={20} color="#061018" />Jouer</span><small style={{ fontWeight: 900 }}>Créer / rejoindre ›</small></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          {quickStats.map(([k, v, ic]) => <div key={String(k)} style={{ minHeight: 72, borderRadius: 18, padding: 10, background: `linear-gradient(180deg, ${alpha(primary, "10")}, rgba(0,0,0,.28))`, border: `1px solid ${alpha(primary, "22")}`, display: "grid", alignContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 5, opacity: .86 }}><span style={{ fontSize: 9, fontWeight: 1000 }}>{k}</span><Icon kind={ic as IconKind} size={15} color={primary} /></div>
            <div style={{ fontSize: 25, fontWeight: 1000, color: primary, textShadow: `0 0 13px ${alpha(primary, "66")}` }}>{v}</div>
          </div>)}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("stats_online")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="rank" size={18} color={primary} />Classement</span></button>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("shared_online")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="share" size={18} color={primary} />Partages</span></button>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("messages")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="message" size={18} color={primary} />Messages</span></button>
        </div>
      </section>

      <section style={neonCard(primary)}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: primary, fontWeight: 1000 }}><Icon kind="search" size={19} /> Ajouter un ami</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pseudo ou email…" style={{ width: "100%", boxSizing: "border-box", borderRadius: 18, marginTop: 10, padding: "13px 14px", color: text, background: "rgba(0,0,0,.32)", border: `1px solid ${alpha(primary, "45")}`, outline: "none", boxShadow: `inset 0 0 0 1px rgba(255,255,255,.035), 0 0 18px ${alpha(primary, "12")}` }} />
        {searching ? <div style={{ opacity: .72, fontSize: 12, marginTop: 8 }}>Recherche…</div> : null}
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{results.map((u) => <div key={u.id || u.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 18, background: "rgba(255,255,255,.045)", border: `1px solid ${alpha(primary, "24")}` }}>
          <Avatar user={u} size={42} primary={primary} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(u)}</b><div><Status s={u.status} primary={primary} /></div></div>
          <button style={filledButton(primary)} onClick={() => send(userIdOf(u))}>Inviter</button>
        </div>)}</div>
      </section>

      <section style={neonCard(primary)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ color: primary }}>Mes amis</b><span style={{ opacity: .7, fontSize: 12 }}>{friendsLoading ? "Chargement…" : `${friends.length} ami(s)`}</span></div>
        {friends.length === 0 ? <div style={{ opacity: .7, fontSize: 13, marginTop: 10 }}>Aucun ami pour le moment.</div> : friends.map((f) => <div key={f.userId || f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, marginTop: 9, borderRadius: 18, background: "rgba(255,255,255,.045)", border: `1px solid ${alpha(primary, "24")}` }}>
          <Avatar user={f} size={42} primary={primary} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(f)}</b><div><Status s={f.status} primary={primary} /></div></div>
          <button style={outlineButton(primary)} onClick={() => go?.("shared_online", { targetUserId: userIdOf(f) })}>Partager</button>
          <button style={{ ...outlineButton(primary), color: "#ffb3b3" }} onClick={() => removeFriend(userIdOf(f))}>Retirer</button>
        </div>)}
      </section>
    </div>
  </div>;
}
