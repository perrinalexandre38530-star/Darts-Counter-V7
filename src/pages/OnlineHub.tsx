import * as React from "react";
import { searchUsers, type OnlineFriendUser } from "../lib/friendsApi";
import { useOnlineFriends } from "../hooks/useOnlineFriends";
import { useFriendRequests } from "../hooks/useFriendRequests";
import { usePresence } from "../hooks/usePresence";
import { useSharedOnlineItems } from "../hooks/useSharedOnlineItems";
import { onlineApi } from "../lib/onlineApi";
import { useTheme } from "../contexts/ThemeContext";

type Props = { store?: any; update?: (patch: any) => void; go?: (tab: string, params?: any) => void };
type IconKind = "hub" | "play" | "friends" | "requests" | "stats" | "share" | "message" | "refresh" | "search";

function nameOf(u?: OnlineFriendUser | null) {
  return u?.displayName || u?.nickname || "Joueur";
}
function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
function userIdOf(u: OnlineFriendUser) {
  return String(u.userId || u.id || "");
}
function alpha(primary: string, hex = "33") {
  return `${primary}${hex}`;
}

function Icon({ kind, size = 23, color = "currentColor" }: { kind: IconKind; size?: number; color?: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.15, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      {kind === "hub" ? <><path {...common} d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" /></> : null}
      {kind === "play" ? <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M10 8.5v7l5.5-3.5L10 8.5Z" /></> : null}
      {kind === "friends" ? <><path {...common} d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path {...common} d="M3.5 19c.7-3 2.4-4.6 5-4.6s4.3 1.6 5 4.6" /><path {...common} d="M16.5 11.5a2.6 2.6 0 1 0 0-5.2" /><path {...common} d="M15.5 14.5c2.2.2 3.8 1.7 4.5 4.2" /></> : null}
      {kind === "requests" ? <><path {...common} d="M4 7.5h16v11H4z" /><path {...common} d="m4 8 8 5.7L20 8" /><path {...common} d="M17.2 4.8v4.6" /><path {...common} d="M14.9 7.1h4.6" /></> : null}
      {kind === "stats" ? <><path {...common} d="M5 19V9" /><path {...common} d="M12 19V5" /><path {...common} d="M19 19v-7" /><path {...common} d="M3.5 19.5h17" /></> : null}
      {kind === "share" ? <><circle {...common} cx="7" cy="12" r="2.5" /><circle {...common} cx="17" cy="6" r="2.5" /><circle {...common} cx="17" cy="18" r="2.5" /><path {...common} d="m9.2 10.8 5.6-3.4" /><path {...common} d="m9.2 13.2 5.6 3.4" /></> : null}
      {kind === "message" ? <><path {...common} d="M4 5.5h16v11H8l-4 3v-14Z" /><path {...common} d="M8 9.5h8" /><path {...common} d="M8 13h5" /></> : null}
      {kind === "refresh" ? <><path {...common} d="M20 7v5h-5" /><path {...common} d="M4 17v-5h5" /><path {...common} d="M18.2 11A6.5 6.5 0 0 0 6.6 7.2" /><path {...common} d="M5.8 13A6.5 6.5 0 0 0 17.4 16.8" /></> : null}
      {kind === "search" ? <><circle {...common} cx="10.5" cy="10.5" r="5.5" /><path {...common} d="m15 15 5 5" /></> : null}
    </svg>
  );
}

function Avatar({ user, size = 58, primary }: { user?: OnlineFriendUser | null; size?: number; primary: string }) {
  const name = nameOf(user);
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: `2px solid ${alpha(primary, "cc")}`, boxShadow: `0 0 18px ${alpha(primary, "55")}, 0 0 0 4px rgba(255,255,255,.06)` }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: 999, display: "grid", placeItems: "center", background: `radial-gradient(circle at 35% 30%, ${alpha(primary, "ee")}, ${alpha(primary, "99")} 42%, rgba(0,0,0,.9) 100%)`, color: "#071017", border: `2px solid ${alpha(primary, "dd")}`, fontWeight: 1000, boxShadow: `0 0 18px ${alpha(primary, "55")}, 0 0 0 4px rgba(255,255,255,.06)` }}>{initials(name)}</div>;
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
    background: `linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.032)), radial-gradient(circle at 0% 0%, ${alpha(primary, "16")}, transparent 46%)`,
    border: `1px solid ${alpha(primary, "38")}`,
    boxShadow: `0 18px 38px rgba(0,0,0,.58), inset 0 0 0 1px rgba(255,255,255,.045), 0 0 28px ${alpha(primary, "18")}`,
    backdropFilter: "blur(12px)",
  };
}
function outlineButton(primary: string): React.CSSProperties {
  return {
    borderRadius: 17,
    padding: "10px 12px",
    fontWeight: 950,
    background: "rgba(7,9,18,.56)",
    color: "#fff",
    border: `1px solid ${alpha(primary, "58")}`,
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,.04), 0 0 16px ${alpha(primary, "18")}`,
  };
}
function filledButton(primary: string): React.CSSProperties {
  return {
    border: 0,
    borderRadius: 18,
    padding: "12px 14px",
    fontWeight: 1000,
    background: `linear-gradient(135deg, ${primary}, #ffffff 190%)`,
    color: "#071017",
    boxShadow: `0 0 22px ${alpha(primary, "55")}, inset 0 1px 0 rgba(255,255,255,.38)`,
  };
}

export default function OnlineHub({ go }: Props) {
  const { theme } = useTheme();
  // Online: on utilise une vraie couleur de thème lumineuse.
  // Si le thème global est encore le thème doré par défaut, on bascule l'Online sur le cyan néon
  // pour supprimer tout rendu jaune/or sur cette page comme demandé.
  const rawPrimary = theme.primary || "#22E6FF";
  const primary = rawPrimary.toUpperCase() === "#F6C256" ? "#22E6FF" : rawPrimary;
  const text = theme.text || "#f7fbff";
  const bg = theme.bg || "#020611";
  const { friends, loading: friendsLoading, error: friendsError, refresh: refreshFriends, removeFriend } = useOnlineFriends();
  const { incoming, error: requestsError, refresh: refreshRequests, send } = useFriendRequests();
  const { items, error: sharedError, refresh: refreshShared } = useSharedOnlineItems();
  const { status, error: presenceError, setPresence } = usePresence();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<OnlineFriendUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const unread = items.filter((i) => i.direction === "incoming" && !i.readAt).length;
  const connected = status !== "offline";
  const currentUser = friends[0] || null;

  async function runSearch() {
    if (query.trim().length < 2) return setResults([]);
    setSearching(true);
    try { setResults(await searchUsers(query)); } finally { setSearching(false); }
  }
  React.useEffect(() => { const id = window.setTimeout(runSearch, 350); return () => window.clearTimeout(id); }, [query]);
  React.useEffect(() => {
    let off = false;
    (async () => { try { const rows = await (onlineApi as any)?.listMatches?.(250); if (!off) setMatchCount(Array.isArray(rows) ? rows.length : 0); } catch {} })();
    return () => { off = true; };
  }, []);
  async function refreshAll() {
    await Promise.allSettled([refreshFriends(), refreshRequests(), refreshShared(), setPresence("online")]);
    try { const rows = await (onlineApi as any)?.listMatches?.(250); setMatchCount(Array.isArray(rows) ? rows.length : 0); } catch {}
  }

  const errors = [presenceError, friendsError, requestsError, sharedError].filter(Boolean);
  const nav = [
    { kind: "hub" as const, title: "Hub", value: connected ? "OK" : "OFF", active: true, action: () => {} },
    { kind: "play" as const, title: "Jouer", value: "X01", action: () => go?.("x01_online_setup") },
    { kind: "friends" as const, title: "Amis", value: friends.length, action: () => go?.("messages") },
    { kind: "requests" as const, title: "Demandes", value: incoming.length, action: () => go?.("friend_requests") },
    { kind: "stats" as const, title: "Stats", value: matchCount, action: () => go?.("stats_online") },
  ];

  return <div style={{ minHeight: "100dvh", padding: "16px 12px 104px", color: text, background: `radial-gradient(720px 360px at 88% -8%, ${alpha(primary, "52")}, transparent 60%), radial-gradient(560px 320px at 0% 34%, ${alpha(primary, "26")}, transparent 64%), linear-gradient(180deg, ${bg}, #020611 55%, #000 100%)` }}>
    <style>{`
      .online-scroll::-webkit-scrollbar{display:none}
      .online-tile{transition:transform .14s ease, filter .14s ease;}
      .online-tile:active{transform:scale(.965)}
      .online-marquee{white-space:nowrap; animation:onlineMarquee 19s linear infinite;}
      @keyframes onlineMarquee{0%{transform:translateX(18%)}100%{transform:translateX(-82%)}}
    `}</style>
    <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 13 }}>
      <section style={{ ...neonCard(primary), padding: 16, background: `radial-gradient(circle at 88% 12%, ${alpha(primary, "62")}, transparent 25%), linear-gradient(145deg, ${alpha(primary, "22")}, rgba(255,255,255,.062) 42%, rgba(255,255,255,.025))` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 31, fontWeight: 1000, letterSpacing: 1.1, color: primary, textShadow: `0 0 22px ${alpha(primary, "88")}` }}>ONLINE</div>
              <span style={{ borderRadius: 999, padding: "5px 10px", background: connected ? "rgba(67,240,126,.18)" : "rgba(255,87,87,.15)", border: `1px solid ${connected ? "#43f07e66" : "#ff575766"}`, color: connected ? "#7dffae" : "#ff9b9b", fontSize: 11, fontWeight: 1000 }}>Serveur : OK</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: .78 }}>Salon, amis, demandes, partages et statistiques reliées à l’historique.</div>
          </div>
          <button className="online-tile" style={{ width: 52, height: 52, borderRadius: 20, display: "grid", placeItems: "center", color: primary, background: `linear-gradient(180deg, ${alpha(primary, "20")}, rgba(0,0,0,.35))`, border: `1px solid ${alpha(primary, "75")}`, boxShadow: `0 0 24px ${alpha(primary, "66")}` }} onClick={refreshAll} title="Actualiser"><Icon kind="refresh" /></button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center" }}>
          <Avatar user={currentUser as any} primary={primary} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ fontSize: 17, color: text, textShadow: `0 0 12px ${alpha(primary, "35")}` }}>{nameOf(currentUser as any)}</b>
              <Status s={status} primary={primary} />
              <span style={{ opacity: .62, fontSize: 12, fontWeight: 900 }}>{(currentUser as any)?.countryCode || "FR"}</span>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              <button style={outlineButton(primary)} onClick={() => setPresence("online")}>En ligne</button>
              <button style={outlineButton(primary)} onClick={() => setPresence("away")}>Absent</button>
              <button style={outlineButton(primary)} onClick={() => setPresence("offline")}>{connected ? "Déconnexion" : "Connexion"}</button>
            </div>
          </div>
        </div>
      </section>

      {errors.length ? <section style={{ ...neonCard(primary), color: "#ffb3b3", fontSize: 12 }}>{errors.map(String).join(" · ")}</section> : null}

      <section style={{ ...neonCard(primary), padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${alpha(primary, "24")}` }}>
          <b style={{ fontSize: 12, letterSpacing: .8, opacity: .92 }}>LIVE FEED</b>
          <span style={{ borderRadius: 999, padding: "4px 9px", color: primary, background: alpha(primary, "18"), border: `1px solid ${alpha(primary, "42")}`, fontSize: 11, fontWeight: 1000 }}>AUTO</span>
        </div>
        <div style={{ overflow: "hidden", padding: "10px 0" }}>
          <div className="online-marquee" style={{ display: "inline-flex", gap: 10, alignItems: "center", fontSize: 12, fontWeight: 900 }}>
            {connected ? "● Session connectée" : "● Session déconnectée"} <span style={{ color: primary }}>●</span> Crée un salon X01 ou rejoins avec un code <span style={{ color: primary }}>●</span> Stats Online reliées à l’historique <span style={{ color: primary }}>●</span> Amis et partages synchronisés
          </div>
        </div>
      </section>

      <div className="online-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "3px 1px 7px" }}>
        {nav.map((item) => <button key={item.title} className="online-tile" onClick={item.action} style={{ minWidth: 104, minHeight: 96, borderRadius: 24, padding: "12px 10px", textAlign: "center", color: text, background: item.active ? `linear-gradient(180deg, ${alpha(primary, "35")}, rgba(255,255,255,.055))` : `linear-gradient(180deg, ${alpha(primary, "12")}, rgba(255,255,255,.035))`, border: `1px solid ${item.active ? alpha(primary, "dd") : alpha(primary, "30")}`, boxShadow: item.active ? `0 0 26px ${alpha(primary, "58")}, inset 0 0 0 1px rgba(255,255,255,.075)` : `0 0 14px ${alpha(primary, "12")}, inset 0 0 0 1px rgba(255,255,255,.035)` }}>
          <span style={{ width: 46, height: 46, margin: "0 auto", borderRadius: 18, display: "grid", placeItems: "center", color: primary, background: `radial-gradient(circle, ${alpha(primary, "32")}, rgba(0,0,0,.36))`, boxShadow: `0 0 18px ${alpha(primary, "45")}` }}><Icon kind={item.kind} size={27} /></span>
          <div style={{ marginTop: 9, fontSize: 14, fontWeight: 1000, color: item.active ? primary : text, textShadow: item.active ? `0 0 14px ${alpha(primary, "66")}` : "none" }}>{item.title}</div>
          <span style={{ position: "absolute", transform: "translate(25px,-78px)", borderRadius: 999, padding: "3px 7px", background: item.active ? alpha(primary, "2f") : "rgba(255,255,255,.08)", color: item.active ? primary : text, fontSize: 10, fontWeight: 1000, border: `1px solid ${alpha(primary, "25")}` }}>{item.value}</span>
        </button>)}
      </div>

      <section style={neonCard(primary)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "stretch" }}>
          <div style={{ borderRadius: 20, padding: 13, background: `linear-gradient(135deg, ${alpha(primary, "18")}, rgba(255,255,255,.045))`, border: `1px solid ${alpha(primary, "30")}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: primary, fontWeight: 1000, fontSize: 16 }}><Icon kind="hub" size={19} /> Hub Online</div>
            <div style={{ marginTop: 5, fontSize: 12, opacity: .74 }}>Lance un salon, rejoins un ami, puis retrouve les matchs dans Stats Online.</div>
          </div>
          <button className="online-tile" style={{ ...filledButton(primary), minWidth: 132, display: "grid", alignContent: "center", gap: 4, textAlign: "left" }} onClick={() => go?.("x01_online_setup")}><span style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon kind="play" size={19} color="#071017" />Jouer</span><small style={{ fontWeight: 900 }}>Créer / rejoindre ›</small></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          {[
            ["AMIS", friends.length, "friends" as IconKind],
            ["DEMANDES", incoming.length, "requests" as IconKind],
            ["PARTAGES", unread, "share" as IconKind],
            ["MATCHS", matchCount, "stats" as IconKind],
          ].map(([k, v, ic]) => <div key={String(k)} style={{ minHeight: 70, borderRadius: 18, padding: 10, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)", display: "grid", alignContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 5, opacity: .8 }}><span style={{ fontSize: 9, fontWeight: 1000 }}>{k}</span><Icon kind={ic as IconKind} size={15} color={primary} /></div>
            <div style={{ fontSize: 24, fontWeight: 1000, color: primary, textShadow: `0 0 13px ${alpha(primary, "66")}` }}>{v}</div>
          </div>)}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("stats_online")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="stats" size={18} color={primary} />Stats</span></button>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("shared_online")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="share" size={18} color={primary} />Partages</span></button>
          <button className="online-tile" style={outlineButton(primary)} onClick={() => go?.("messages")}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Icon kind="message" size={18} color={primary} />Messages</span></button>
        </div>
      </section>

      <section style={neonCard(primary)}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: primary, fontWeight: 1000 }}><Icon kind="search" size={19} /> Ajouter un ami</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pseudo ou email…" style={{ width: "100%", boxSizing: "border-box", borderRadius: 18, marginTop: 10, padding: "13px 14px", color: text, background: "rgba(0,0,0,.32)", border: `1px solid ${alpha(primary, "45")}`, outline: "none", boxShadow: `inset 0 0 0 1px rgba(255,255,255,.035), 0 0 18px ${alpha(primary, "12")}` }} />
        {searching ? <div style={{ opacity: .72, fontSize: 12, marginTop: 8 }}>Recherche…</div> : null}
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{results.map((u) => <div key={u.id || u.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)" }}>
          <Avatar user={u} size={42} primary={primary} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(u)}</b><div><Status s={u.status} primary={primary} /></div></div>
          <button style={filledButton(primary)} onClick={() => send(userIdOf(u))}>Inviter</button>
        </div>)}</div>
      </section>

      <section style={neonCard(primary)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ color: primary }}>Mes amis</b><span style={{ opacity: .7, fontSize: 12 }}>{friendsLoading ? "Chargement…" : `${friends.length} ami(s)`}</span></div>
        {friends.length === 0 ? <div style={{ opacity: .7, fontSize: 13, marginTop: 10 }}>Aucun ami pour le moment.</div> : friends.map((f) => <div key={f.userId || f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, marginTop: 9, borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)" }}>
          <Avatar user={f} size={42} primary={primary} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{nameOf(f)}</b><div><Status s={f.status} primary={primary} /></div></div>
          <button style={outlineButton(primary)} onClick={() => go?.("shared_online", { targetUserId: userIdOf(f) })}>Partager</button>
          <button style={{ ...outlineButton(primary), color: "#ffb3b3" }} onClick={() => removeFriend(userIdOf(f))}>Retirer</button>
        </div>)}
      </section>
    </div>
  </div>;
}
