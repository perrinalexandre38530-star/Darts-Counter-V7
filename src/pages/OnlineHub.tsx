import * as React from "react";
import { searchUsers, type OnlineFriendUser } from "../lib/friendsApi";
import { useOnlineFriends } from "../hooks/useOnlineFriends";
import { useFriendRequests } from "../hooks/useFriendRequests";
import { usePresence } from "../hooks/usePresence";
import { useSharedOnlineItems } from "../hooks/useSharedOnlineItems";
import { onlineApi } from "../lib/onlineApi";
import { useTheme } from "../contexts/ThemeContext";

type Props = { store?: any; update?: (patch: any) => void; go?: (tab: string, params?: any) => void };
type OnlineTab = "hub" | "play" | "friends" | "requests" | "stats" | "shared";

function nameOf(u?: OnlineFriendUser | null) { return u?.displayName || u?.nickname || "Joueur"; }
function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() || "?"; }

function rgba(hex: string, alpha: number) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(34,230,255,${alpha})`;
  const n = Number.parseInt(clean, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function NavIcon({ name, size = 24 }: { name: OnlineTab | "refresh" | "status" | "message"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "hub") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" /></svg>;
  if (name === "play") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8" /><circle {...p} cx="12" cy="12" r="3.4" /><path {...p} d="M12 4v3M20 12h-3M12 20v-3M4 12h3" /></svg>;
  if (name === "friends") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 20a5.5 5.5 0 0 1 11 0" /><circle {...p} cx="9.5" cy="8" r="3.5" /><path {...p} d="M16 11a4.8 4.8 0 0 1 4 4.7V20" /><path {...p} d="M17 5.3a3.2 3.2 0 0 1 0 6.1" /></svg>;
  if (name === "requests") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 6h16v12H4z" /><path {...p} d="m4 7 8 6 8-6" /><path {...p} d="M18 3v6M15 6h6" /></svg>;
  if (name === "stats") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 20V9" /><path {...p} d="M10 20V4" /><path {...p} d="M16 20v-7" /><path {...p} d="M22 20V6" /></svg>;
  if (name === "shared") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 4 7l8 4 8-4-8-4Z" /><path {...p} d="M4 12l8 4 8-4" /><path {...p} d="M4 17l8 4 8-4" /></svg>;
  if (name === "refresh") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M20 11a8 8 0 0 0-14.5-4" /><path {...p} d="M5 3v4h4" /><path {...p} d="M4 13a8 8 0 0 0 14.5 4" /><path {...p} d="M19 21v-4h-4" /></svg>;
  if (name === "status") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9" /><path {...p} d="M12 8v4l3 2" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 5.5h16v10.5H8l-4 3.5V5.5Z" /><path {...p} d="M8 9h8M8 12.5h5" /></svg>;
}

function Avatar({ user, size = 54, accent = "#22E6FF" }: { user?: OnlineFriendUser | null; size?: number; accent?: string }) {
  const name = nameOf(user);
  const common: React.CSSProperties = { width: size, height: size, borderRadius: 999, border: `2px solid ${rgba(accent, .78)}`, boxShadow: `0 0 20px ${rgba(accent, .36)}` };
  return user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ ...common, objectFit: "cover" }} /> : <div style={{ ...common, display: "grid", placeItems: "center", background: `radial-gradient(circle at 35% 25%,${rgba(accent,.45)},#07101e 70%)`, fontWeight: 950 }}>{initials(name)}</div>;
}

function Status({ s, success }: { s?: string; success: string }) {
  const color = s === "online" ? success : s === "away" ? "#ffd35b" : "#85858f";
  const label = s === "online" ? "En ligne" : s === "away" ? "Absent" : "Hors ligne";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color, textTransform: "uppercase" }}><i style={{ width: 7, height: 7, borderRadius: 99, background: color, boxShadow: `0 0 12px ${color}` }} />{label}</span>;
}

export default function OnlineHub({ go }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary || "#22E6FF";
  const secondary = theme.accent2 || theme.accent1 || primary;
  const success = theme.success || "#2EEB9A";
  const text = theme.text || "#F2FBFF";
  const soft = theme.textSoft || "rgba(205,232,245,.84)";
  const bg = theme.bg || "#06111F";
  const card = theme.card || "#0B1728";
  const border = theme.borderSoft || rgba(primary, .44);

  const { friends, loading: friendsLoading, error: friendsError, refresh: refreshFriends, removeFriend } = useOnlineFriends();
  const { incoming, error: requestsError, refresh: refreshRequests, send } = useFriendRequests();
  const { items, error: sharedError, refresh: refreshShared } = useSharedOnlineItems();
  const { status, error: presenceError, setPresence } = usePresence();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<OnlineFriendUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const unread = items.filter((i) => i.direction === "incoming" && !i.readAt).length;

  async function runSearch() { if (query.trim().length < 2) return setResults([]); setSearching(true); try { setResults(await searchUsers(query)); } finally { setSearching(false); } }
  React.useEffect(() => { const id = window.setTimeout(runSearch, 350); return () => window.clearTimeout(id); }, [query]);
  React.useEffect(() => { let off = false; (async () => { try { const rows = await (onlineApi as any)?.listMatches?.(250); if (!off) setMatchCount(Array.isArray(rows) ? rows.length : 0); } catch {} })(); return () => { off = true; }; }, []);
  async function refreshAll() { await Promise.allSettled([refreshFriends(), refreshRequests(), refreshShared(), setPresence("online")]); try { const rows = await (onlineApi as any)?.listMatches?.(250); setMatchCount(Array.isArray(rows) ? rows.length : 0); } catch {} }

  const errors = [presenceError, friendsError, requestsError, sharedError].filter(Boolean);
  const tabs: Array<{ key: OnlineTab; label: string; sub: string; value?: number; action: () => void }> = [
    { key: "hub", label: "Hub", sub: "Essentiel", action: () => {} },
    { key: "play", label: "Jouer", sub: "Salon X01", action: () => go?.("x01_online_setup") },
    { key: "friends", label: "Amis", sub: "Liste", value: friends.length, action: () => go?.("messages") },
    { key: "requests", label: "Demandes", sub: "Invitations", value: incoming.length, action: () => go?.("friend_requests") },
    { key: "stats", label: "Stats", sub: "Historique", value: matchCount, action: () => go?.("stats_online") },
    { key: "shared", label: "Partages", sub: "Reçus", value: unread, action: () => go?.("shared_online") },
  ];

  const pageBg = `radial-gradient(760px 420px at 95% -8%, ${rgba(primary, .28)}, transparent 62%), radial-gradient(640px 380px at 0% 18%, ${rgba(secondary, .16)}, transparent 66%), linear-gradient(180deg, ${bg} 0%, #02050b 100%)`;
  const panel = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 24,
    padding: 14,
    background: `linear-gradient(180deg, ${rgba(card, .94)}, ${rgba(bg, .76)})`,
    border: `1px solid ${border}`,
    boxShadow: `0 20px 46px rgba(0,0,0,.58), 0 0 26px ${rgba(primary, .16)}`,
    backdropFilter: "blur(14px)",
    ...extra,
  });
  const btn = (accent = primary): React.CSSProperties => ({ borderRadius: 16, padding: "10px 12px", fontWeight: 950, background: rgba(card, .7), color: text, border: `1px solid ${rgba(accent, .48)}`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.035), 0 0 16px ${rgba(accent, .18)}` });
  const cta: React.CSSProperties = { border: 0, borderRadius: 18, padding: "12px 14px", fontWeight: 1000, background: `linear-gradient(180deg, ${rgba(primary,.96)}, ${rgba(secondary,.86)})`, color: "#031018", boxShadow: `0 0 24px ${rgba(primary,.42)}` };

  return <div style={{ minHeight: "100dvh", padding: "16px 12px 104px", color: text, background: pageBg }}>
    <style>{`
      .online-theme-scroll::-webkit-scrollbar{display:none}
      .online-icon-tab{transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease}
      .online-icon-tab:active{transform:scale(.97)}
      .online-icon-tab svg{filter:drop-shadow(0 0 8px currentColor)}
      .online-page-button{cursor:pointer}
    `}</style>
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 13 }}>
      <section style={panel({ overflow: "hidden", position: "relative" })}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(circle at 88% 12%, ${rgba(primary,.42)}, transparent 25%), radial-gradient(circle at 8% 92%, ${rgba(secondary,.20)}, transparent 32%)` }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 1000, letterSpacing: 1.5, color: primary, textShadow: `0 0 22px ${rgba(primary,.64)}` }}>ONLINE</div>
            <span style={{ display: "inline-flex", marginTop: 4, borderRadius: 999, padding: "4px 9px", background: rgba(success,.17), color: success, fontSize: 11, fontWeight: 950 }}>Serveur : OK</span>
          </div>
          <button className="online-page-button" style={{ ...btn(primary), width: 52, height: 52, borderRadius: 999, padding: 0, color: primary, display: "grid", placeItems: "center" }} onClick={refreshAll} title="Actualiser"><NavIcon name="refresh" /></button>
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", marginTop: 16 }}>
          <Avatar user={friends[0] as any} accent={primary} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <button className="online-page-button" style={btn(success)} onClick={() => setPresence("online")}>En ligne</button>
            <button className="online-page-button" style={btn("#ffd35b")} onClick={() => setPresence("away")}>Absent</button>
            <button className="online-page-button" style={btn(primary)} onClick={() => setPresence("offline")}>Déconnexion</button>
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 950 }}><span>Ninja</span><Status s={status} success={success} /><span style={{ opacity: .55 }}>FR</span></div>
        </div>
      </section>

      {errors.length ? <section style={panel({ color: "#ffb3b3", fontSize: 12 })}>{errors.map(String).join(" · ")}</section> : null}

      <section style={panel()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}><b style={{ fontSize: 13, letterSpacing: .6 }}>LIVE FEED</b><button className="online-page-button" style={{ ...btn(primary), padding: "5px 9px", fontSize: 11, color: primary }}>AUTO</button></div>
        <div style={{ borderRadius: 17, padding: "9px 10px", background: rgba(card, .62), border: `1px solid ${rgba(primary,.2)}`, fontSize: 12, display: "flex", alignItems: "center", gap: 8, color: soft }}><span style={{ borderRadius: 999, padding: "3px 8px", background: rgba(primary,.16), color: primary, fontWeight: 950 }}>•</span> Crée un salon X01 ou rejoins avec un code</div>
      </section>

      <div className="online-theme-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map((tab, i) => {
          const active = i === 0;
          const accent = active ? primary : soft;
          return <button key={tab.key} className="online-icon-tab online-page-button" onClick={tab.action} style={{ minWidth: 108, borderRadius: 20, padding: "11px 12px", textAlign: "left", background: active ? `linear-gradient(180deg,${rgba(primary,.22)},${rgba(card,.74)})` : rgba(card,.58), border: `1px solid ${active ? primary : rgba(primary,.18)}`, color: accent, boxShadow: active ? `0 0 0 1px ${rgba(primary,.24)}, 0 0 22px ${rgba(primary,.38)}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000 }}><NavIcon name={tab.key} size={22} />{tab.label}{typeof tab.value === "number" ? <span style={{ marginLeft: "auto", borderRadius: 999, padding: "2px 7px", background: rgba(primary,.18), color: primary, fontSize: 11 }}>{tab.value}</span> : null}</div>
            <div style={{ marginTop: 5, fontSize: 10, opacity: .72, color: text }}>{tab.sub}</div>
          </button>;
        })}
      </div>

      <section style={panel()}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div><div style={{ color: primary, fontWeight: 1000, fontSize: 17, textShadow: `0 0 14px ${rgba(primary,.36)}` }}>Créer ou rejoindre un salon</div><div style={{ fontSize: 12, color: soft, marginTop: 4 }}>Le plus utile ici : lancer un salon ou rejoindre un ami.</div></div>
          <button className="online-page-button" style={cta} onClick={() => go?.("x01_online_setup")}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><NavIcon name="play" size={18} /> Jouer ›</span></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginTop: 13 }}>{[["AMIS", friends.length, success], ["DEMANDES", incoming.length, "#ffd35b"], ["PARTAGES", unread, secondary], ["MATCHS", matchCount, primary]].map(([k,v,c]) => <div key={String(k)} style={{ borderRadius: 17, padding: 12, background: rgba(card,.58), border: `1px solid ${rgba(String(c),.25)}` }}><div style={{ fontSize: 10, opacity: .68, fontWeight: 900 }}>{k}</div><div style={{ fontSize: 24, fontWeight: 1000, color: String(c), textShadow: `0 0 12px ${rgba(String(c),.52)}` }}>{v}</div></div>)}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><button className="online-page-button" style={btn(primary)} onClick={() => go?.("stats_online")}><NavIcon name="stats" size={16} /> Stats Online</button><button className="online-page-button" style={btn(secondary)} onClick={() => go?.("shared_online")}><NavIcon name="shared" size={16} /> Partages</button><button className="online-page-button" style={btn(primary)} onClick={() => go?.("messages")}><NavIcon name="message" size={16} /> Messages</button></div>
      </section>

      <section style={panel()}><b style={{ color: primary }}>Ajouter un ami</b><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pseudo ou email…" style={{ width: "100%", boxSizing: "border-box", borderRadius: 17, marginTop: 10, padding: 12, color: text, background: rgba(card,.62), border: `1px solid ${rgba(primary,.35)}`, outline: "none" }} />{searching ? <div style={{ color: soft, fontSize: 12, marginTop: 8 }}>Recherche…</div> : null}<div style={{ display: "grid", gap: 8, marginTop: 10 }}>{results.map((u) => <div key={u.id || u.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 17, background: rgba(card,.58), border: `1px solid ${rgba(primary,.16)}` }}><Avatar user={u} size={42} accent={primary} /><div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(u)}</b><div><Status s={u.status} success={success} /></div></div><button className="online-page-button" style={cta} onClick={() => send(String(u.userId || u.id))}>Inviter</button></div>)}</div></section>

      <section style={panel()}><div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ color: primary }}>Mes amis</b><span style={{ color: soft, fontSize: 12 }}>{friendsLoading ? "Chargement…" : `${friends.length} ami(s)`}</span></div>{friends.length === 0 ? <div style={{ color: soft, fontSize: 13, marginTop: 10 }}>Aucun ami pour le moment.</div> : friends.map((f) => <div key={f.userId || f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, marginTop: 9, borderRadius: 17, background: rgba(card,.58), border: `1px solid ${rgba(primary,.16)}` }}><Avatar user={f} size={42} accent={primary} /><div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(f)}</b><div><Status s={f.status} success={success} /></div></div><button className="online-page-button" style={btn(secondary)} onClick={() => go?.("shared_online", { targetUserId: f.userId || f.id })}>Partager</button><button className="online-page-button" style={{ ...btn(theme.danger || "#ff4a6a"), color: "#ffb3b3" }} onClick={() => removeFriend(String(f.userId || f.id))}>Retirer</button></div>)}</section>
    </div>
  </div>;
}
