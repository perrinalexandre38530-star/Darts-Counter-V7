import * as React from "react";
import { searchUsers, type OnlineFriendUser } from "../lib/friendsApi";
import { useOnlineFriends } from "../hooks/useOnlineFriends";
import { useFriendRequests } from "../hooks/useFriendRequests";
import { usePresence } from "../hooks/usePresence";
import { useSharedOnlineItems } from "../hooks/useSharedOnlineItems";
import { onlineApi } from "../lib/onlineApi";
import { useTheme } from "../contexts/ThemeContext";

type Props = { store?: any; update?: (patch: any) => void; go?: (tab: string, params?: any) => void };

function nameOf(u?: OnlineFriendUser | null) { return u?.displayName || u?.nickname || "Joueur"; }
function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() || "?"; }
function Avatar({ user, size = 54 }: { user?: OnlineFriendUser | null; size?: number }) {
  const name = nameOf(user);
  return user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: "2px solid rgba(183,255,0,.75)", boxShadow: "0 0 18px rgba(183,255,0,.35)" }} /> : <div style={{ width: size, height: size, borderRadius: 999, display: "grid", placeItems: "center", background: "radial-gradient(circle,#2a3320,#10130d)", border: "2px solid rgba(183,255,0,.65)", fontWeight: 950, boxShadow: "0 0 18px rgba(183,255,0,.25)" }}>{initials(name)}</div>;
}
function Status({ s }: { s?: string }) { const color = s === "online" ? "#43f07e" : s === "away" ? "#ffd35b" : "#85858f"; const label = s === "online" ? "En ligne" : s === "away" ? "Absent" : "Hors ligne"; return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color, textTransform: "uppercase" }}><i style={{ width: 7, height: 7, borderRadius: 99, background: color, boxShadow: `0 0 12px ${color}` }} />{label}</span>; }

const glass = (primary: string): React.CSSProperties => ({ borderRadius: 22, padding: 14, background: "linear-gradient(180deg,rgba(255,255,255,.095),rgba(255,255,255,.035))", border: `1px solid ${primary}38`, boxShadow: `0 18px 38px rgba(0,0,0,.55), 0 0 24px ${primary}18`, backdropFilter: "blur(10px)" });
const ghostBtn = (primary: string): React.CSSProperties => ({ borderRadius: 15, padding: "10px 12px", fontWeight: 950, background: "rgba(0,0,0,.22)", color: "#fff", border: `1px solid ${primary}42`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.04), 0 0 14px ${primary}16` });
const goldBtn: React.CSSProperties = { border: 0, borderRadius: 15, padding: "11px 14px", fontWeight: 1000, background: "linear-gradient(180deg,#ffe26f,#ffbd3f)", color: "#1b1204", boxShadow: "0 0 18px rgba(255,211,91,.32)" };

export default function OnlineHub({ go }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary || "#b7ff00";
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
  const tabs = [
    ["⚡", "Hub", "Essentiel", () => {}],
    ["🎯", "Jouer", "X01 + salon", () => go?.("x01_online_setup")],
    ["👥", "Amis", `${friends.length}`, () => go?.("messages")],
    ["📨", "Demandes", `${incoming.length}`, () => go?.("friend_requests")],
    ["📊", "Stats", `${matchCount}`, () => go?.("stats_online")],
  ] as const;

  return <div style={{ minHeight: "100dvh", padding: "16px 12px 96px", color: theme.text || "#fff", background: theme.bg || "#050609" }}>
    <style>{`.online-theme-scroll::-webkit-scrollbar{display:none}.online-pill{transition:.15s transform}.online-pill:active{transform:scale(.97)}`}</style>
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 13 }}>
      <section style={{ ...glass(primary), background: `radial-gradient(circle at 88% 8%, ${primary}44, transparent 24%), linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.045))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 29, fontWeight: 1000, letterSpacing: 1.5, color: "#ffdc6b", textShadow: "0 0 18px rgba(255,220,107,.45)" }}>ONLINE</div><span style={{ display: "inline-flex", marginTop: 4, borderRadius: 999, padding: "4px 9px", background: "rgba(67,240,126,.17)", color: "#7dffae", fontSize: 11, fontWeight: 950 }}>Serveur : OK</span></div>
          <button style={{ ...ghostBtn(primary), width: 46, height: 46, borderRadius: 999, padding: 0, color: primary, fontSize: 20 }} onClick={refreshAll}>↻</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", marginTop: 14 }}><Avatar user={friends[0] as any} /><div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}><button style={ghostBtn(primary)} onClick={() => setPresence("online")}>En ligne</button><button style={ghostBtn(primary)} onClick={() => setPresence("away")}>Absent</button><button style={ghostBtn(primary)} onClick={() => setPresence("offline")}>Déconnexion</button></div><div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 950 }}><span>Ninja</span><Status s={status} /><span style={{ opacity: .55 }}>FR</span></div></div>
      </section>

      {errors.length ? <section style={{ ...glass(primary), color: "#ffb3b3", fontSize: 12 }}>{errors.map(String).join(" · ")}</section> : null}

      <section style={glass(primary)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}><b style={{ fontSize: 13, letterSpacing: .6 }}>LIVE FEED</b><button style={{ ...ghostBtn(primary), padding: "5px 9px", fontSize: 11, color: "#7ad7ff" }}>AUTO</button></div><div style={{ borderRadius: 16, padding: "9px 10px", background: "rgba(0,0,0,.30)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ borderRadius: 999, padding: "3px 8px", background: "rgba(255,211,91,.16)", color: "#ffd35b", fontWeight: 950 }}>•</span> Crée un salon X01 ou rejoins avec un code</div></section>

      <div className="online-theme-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 3 }}>{tabs.map(([ic, title, sub, action], i) => <button key={title} className="online-pill" onClick={action} style={{ minWidth: 104, borderRadius: 18, padding: "10px 12px", textAlign: "left", background: i === 0 ? `linear-gradient(180deg,${primary}22,rgba(255,255,255,.055))` : "rgba(255,255,255,.045)", border: `1px solid ${i === 0 ? primary : "rgba(255,255,255,.12)"}`, color: "#fff", boxShadow: i === 0 ? `0 0 18px ${primary}33` : "none" }}><div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 1000 }}><span>{ic}</span>{title}</div><div style={{ marginTop: 4, fontSize: 10, opacity: .7 }}>{sub}</div></button>)}</div>

      <section style={glass(primary)}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}><div><div style={{ color: primary, fontWeight: 1000, fontSize: 17 }}>Créer ou rejoindre un salon</div><div style={{ fontSize: 12, opacity: .72, marginTop: 4 }}>Le plus utile ici : lancer un salon ou rejoindre un ami.</div></div><button style={goldBtn} onClick={() => go?.("x01_online_setup")}>🎯 Jouer en ligne ›</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginTop: 13 }}>{[["AMIS", friends.length, "#64ff9b"], ["DEMANDES", incoming.length, "#ffd35b"], ["PARTAGES", unread, "#7ad7ff"], ["MATCHS", matchCount, "#ffcf6a"]].map(([k,v,c]) => <div key={String(k)} style={{ borderRadius: 16, padding: 12, background: "rgba(0,0,0,.24)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 10, opacity: .68, fontWeight: 900 }}>{k}</div><div style={{ fontSize: 24, fontWeight: 1000, color: String(c), textShadow: `0 0 12px ${c}66` }}>{v}</div></div>)}</div><div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><button style={ghostBtn(primary)} onClick={() => go?.("stats_online")}>📊 Stats Online</button><button style={ghostBtn(primary)} onClick={() => go?.("shared_online")}>📦 Partages</button><button style={ghostBtn(primary)} onClick={() => go?.("messages")}>💬 Messages</button></div></section>

      <section style={glass(primary)}><b style={{ color: primary }}>Ajouter un ami</b><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pseudo ou email…" style={{ width: "100%", boxSizing: "border-box", borderRadius: 16, marginTop: 10, padding: 12, color: "#fff", background: "rgba(0,0,0,.28)", border: `1px solid ${primary}35`, outline: "none" }} />{searching ? <div style={{ opacity: .72, fontSize: 12, marginTop: 8 }}>Recherche…</div> : null}<div style={{ display: "grid", gap: 8, marginTop: 10 }}>{results.map((u) => <div key={u.id || u.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 16, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)" }}><Avatar user={u} size={42} /><div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(u)}</b><div><Status s={u.status} /></div></div><button style={goldBtn} onClick={() => send(String(u.userId || u.id))}>Inviter</button></div>)}</div></section>

      <section style={glass(primary)}><div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ color: primary }}>Mes amis</b><span style={{ opacity: .7, fontSize: 12 }}>{friendsLoading ? "Chargement…" : `${friends.length} ami(s)`}</span></div>{friends.length === 0 ? <div style={{ opacity: .7, fontSize: 13, marginTop: 10 }}>Aucun ami pour le moment.</div> : friends.map((f) => <div key={f.userId || f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, marginTop: 9, borderRadius: 16, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)" }}><Avatar user={f} size={42} /><div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(f)}</b><div><Status s={f.status} /></div></div><button style={ghostBtn(primary)} onClick={() => go?.("shared_online", { targetUserId: f.userId || f.id })}>Partager</button><button style={{ ...ghostBtn(primary), color: "#ffb3b3" }} onClick={() => removeFriend(String(f.userId || f.id))}>Retirer</button></div>)}</section>
    </div>
  </div>;
}
