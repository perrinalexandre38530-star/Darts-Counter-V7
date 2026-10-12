// @ts-nocheck
import React from "react";
import ProfileAvatar from "../../components/ProfileAvatar";
import { actionStyle, playerName, SOFT } from "./newModePlayShared";

export const PARTY_COLORS = [
  "#42c8ff", "#ffd34d", "#69e68d", "#ff6a66", "#c86cff", "#ff9a3d",
  "#ff61b5", "#f4f7fb", "#25e2e8", "#b78a5f", "#7ea8ff", "#f5ef79",
];

export function modePlayerColors(players: any[], accent: string) {
  const map = new Map<string, string>();
  (players || []).forEach((p: any, i: number) => map.set(String(p?.id || i), PARTY_COLORS[i % PARTY_COLORS.length] || accent));
  return map;
}

export function PremiumAwenaButton({ awena, route, mode, screenLabel, accent = "#4fe4ff" }: any) {
  return <button
    type="button"
    className="party-mode__awena"
    aria-label={`Demander de l'aide à Awena sur ${screenLabel || mode}`}
    title={`Awena · ${screenLabel || mode}`}
    style={{ ["--mode-accent" as any]: accent }}
    onClick={() => {
      awena?.setRuntime?.({
        route,
        sport: "darts",
        mode,
        phase: "play",
        inGame: true,
        screenLabel,
        extra: {
          ...(awena?.runtime?.extra || {}),
          awenaRememberedMode: mode,
          awenaKnowledgeTopic: `screen:${route}`,
        },
      });
      awena?.openPanel?.();
    }}
  >
    <span><img src="/awena/awena-avatar.webp" alt="Awena" /></span>
    <i aria-hidden>🎙</i>
  </button>;
}

export function SummaryStrip({ players, activeId, profileById, colorById, primaryById, secondaryById, badgeById, winsById }: any) {
  return <div className="party-mode__summary-strip" aria-label="Résumé des joueurs">
    {(players || []).map((p: any) => {
      const id = String(p.id);
      const active = id === String(activeId || "");
      const color = colorById?.get(id) || "#fff";
      const prof = profileById?.get(id) || p;
      return <div key={id} className={`party-mode__summary-item${active ? " is-active" : ""}`} style={{ borderColor: active ? color : `${color}55`, boxShadow: active ? `0 0 18px ${color}28` : "none" }}>
        <ProfileAvatar profile={prof} size={31} showStars={false} ringColor={color} noFrame />
        <div className="party-mode__summary-copy">
          <b style={{ color: active ? color : "#fff" }}>{String(playerName(prof)).toUpperCase()}</b>
          <span>{secondaryById?.(id, p) || ""}</span>
        </div>
        <div className="party-mode__summary-score"><strong style={{ color }}>{primaryById?.(id, p) ?? "—"}</strong><small>{badgeById?.(id, p) || `M ${Number(winsById?.[id] || 0)}`}</small></div>
      </div>;
    })}
  </div>;
}

export function ActiveHero({ profile, name, accent, eyebrow, primary, primarySuffix, secondary, tertiary, progress, progressMax, icon, aside, notice, noticeTone = "normal" }: any) {
  const pct = progressMax > 0 ? Math.max(0, Math.min(100, (Number(progress || 0) / Number(progressMax)) * 100)) : null;
  const avatarSrc = profile?.avatarDataUrl || profile?.avatarUrl || profile?.avatar || profile?.photoDataUrl || profile?.photoURL || "";
  return <section className="party-mode__active" style={{ ["--mode-accent" as any]: accent, borderColor: `${accent}66`, boxShadow: `0 16px 40px rgba(0,0,0,.34), inset 0 0 42px ${accent}0f` }}>
    <div className="party-mode__active-ghost" aria-hidden>{avatarSrc ? <img src={avatarSrc} alt="" /> : <ProfileAvatar profile={profile} size={122} showStars={false} ringColor={accent} noFrame />}</div>
    <div className="party-mode__active-main">
      {eyebrow ? <div className="party-mode__active-eyebrow" style={{ color: accent }}>{eyebrow}</div> : null}
      <div className="party-mode__active-name" style={{ color: accent }}>{String(name || "—").toUpperCase()}</div>
      <div className="party-mode__active-primary" style={{ color: accent }}>{primary}<small>{primarySuffix || ""}</small></div>
      {pct != null ? <div className="party-mode__meter"><i style={{ width: `${pct}%`, background: `linear-gradient(90deg,${accent},#fff3a8)` }} /></div> : null}
      {secondary ? <div className="party-mode__active-secondary">{secondary}</div> : null}
      {tertiary ? <div className="party-mode__active-tertiary">{tertiary}</div> : null}
      {notice ? <div className={`party-mode__notice is-${noticeTone}`}>{notice}</div> : null}
    </div>
    <div className="party-mode__active-aside">{aside || <span className="party-mode__active-icon" aria-hidden>{icon || "🎯"}</span>}</div>
  </section>;
}

export function KpiStrip({ items, accent, onClick, className = "party-mode__kpis" }: any) {
  const Tag: any = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} className={className} onClick={onClick} aria-label={onClick ? "Ouvrir toutes les statistiques" : undefined}>
    {(items || []).map((item: any) => {
      const [label, value] = Array.isArray(item) ? item : [item?.label, item?.value];
      return <span key={String(label)}><small>{label}</small><b style={{ color: accent }}>{value ?? "—"}</b></span>;
    })}
  </Tag>;
}

function ModalShell({ title, subtitle, onClose, children, className = "" }: any) {
  return <div className="party-mode__modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className={`party-mode__modal-card ${className}`} onClick={(e) => e.stopPropagation()}>
      <header><div><b>{title}</b>{subtitle ? <span>{subtitle}</span> : null}</div><button type="button" onClick={onClose} aria-label="Fermer">×</button></header>
      {children}
    </div>
  </div>;
}

export function PlayersModal({ rows, onClose }: any) {
  return <ModalShell title="ORDRE DE JEU" subtitle="Joueurs, statut et score live" onClose={onClose}>
    <div className="party-mode__players-list">
      {(rows || []).map((row: any, index: number) => <div key={row.id || index} className={`party-mode__player-row${row.active ? " is-active" : ""}`} style={{ borderColor: row.active ? `${row.color}aa` : "rgba(255,255,255,.08)", boxShadow: row.active ? `0 0 22px ${row.color}22` : "none" }}>
        <div className="party-mode__player-order" style={{ color: row.color }}>#{index + 1}</div>
        <ProfileAvatar profile={row.profile} size={44} showStars={false} ringColor={row.color} />
        <div className="party-mode__player-copy"><b>{row.name}</b><span>{row.status || (row.active ? "JOUE MAINTENANT" : "EN ATTENTE")}</span>{row.progressMax ? <div className="party-mode__mini-meter"><i style={{ width: `${Math.max(0, Math.min(100, (Number(row.progress || 0) / Math.max(1, Number(row.progressMax))) * 100))}%`, background: row.color }} /></div> : null}</div>
        <div className="party-mode__player-numbers">{(row.metrics || []).slice(0, 4).map((m: any) => <div key={m.label}><span>{m.label}</span><b style={{ color: m.color || row.color }}>{m.value}</b></div>)}</div>
      </div>)}
    </div>
  </ModalShell>;
}

export function StatsModal({ title = "STATISTIQUES LIVE", subtitle, items, accent, onClose }: any) {
  return <ModalShell title={title} subtitle={subtitle || "Statistiques de la partie en cours"} onClose={onClose}>
    <div className="party-mode__stats-grid">{(items || []).map((item: any) => <div key={item.label} className={item.empty ? "is-empty" : ""}><span>{item.label}</span><b style={{ color: item.empty ? undefined : (item.color || accent) }}>{item.value}</b>{item.sub ? <small>{item.sub}</small> : null}</div>)}</div>
  </ModalShell>;
}

export function LogModal({ visits, profileById, colorById, labelDart, onClose, title = "JOURNAL" }: any) {
  const rows = [...(visits || [])].slice(-30).reverse();
  return <ModalShell title={title} subtitle="Dernières volées et événements" onClose={onClose}>
    <div className="party-mode__log-list">{rows.length ? rows.map((visit: any, index: number) => {
      const prof = profileById?.get(String(visit.playerId || ""));
      const color = colorById?.get(String(visit.playerId || "")) || "#9fdfff";
      return <div key={visit.id || index} className="party-mode__log-row" style={{ borderColor: `${color}45` }}>
        <div className="party-mode__log-head"><b style={{ color }}>{prof ? playerName(prof) : "Joueur"}</b><span>{visit.leg ? `MANCHE ${visit.leg}` : ""}{visit.round ? ` · ROUND ${visit.round}` : ""}{visit.turn ? ` · VOLÉE ${visit.turn}` : ""}</span></div>
        <div className="party-mode__log-darts">{(visit.darts || []).map((d: any, i: number) => <span key={i}>{labelDart?.(d) || "—"}</span>)}</div>
        {(visit.events || []).length ? <div className="party-mode__log-events">{visit.events.join(" · ")}</div> : null}
      </div>;
    }) : <div className="party-mode__empty">Aucune volée enregistrée.</div>}</div>
  </ModalShell>;
}

export function RankingModal({ rows, onClose, title = "CLASSEMENT" }: any) {
  return <ModalShell title={title} subtitle="Classement live de la manche" onClose={onClose}>
    <div className="party-mode__ranking-list">{(rows || []).map((row: any, index: number) => <div key={row.id || index} className="party-mode__ranking-row" style={{ borderColor: `${row.color}55` }}>
      <strong style={{ color: row.color }}>#{index + 1}</strong>
      <ProfileAvatar profile={row.profile} size={42} showStars={false} ringColor={row.color} noFrame />
      <div><b style={{ color: row.color }}>{String(row.name || "—").toUpperCase()}</b><span>{row.subtitle || ""}</span></div>
      <em style={{ color: row.color }}>{row.value}<small>{row.suffix || ""}</small></em>
    </div>)}</div>
  </ModalShell>;
}

export function QuickRow({ players, activeId, profileById, colorById, ticker, onPlayers, onStats, onLog, onRanking }: any) {
  return <div className="party-mode__quick-row">
    <button type="button" className="party-mode__quick-icon" onClick={onRanking} aria-label="Ouvrir le classement">🏆</button>
    <button type="button" className="party-mode__players-button" onClick={onPlayers} style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.26),rgba(0,0,0,.76)),url(${ticker})` }}>
      <div>{(players || []).slice(0, 10).map((p: any) => { const id = String(p.id); const color = colorById?.get(id) || "#fff"; return <span key={id} className={id === String(activeId || "") ? "is-active" : ""} style={{ borderColor: color }}><ProfileAvatar profile={profileById?.get(id) || p} size={38} showStars={false} ringColor={color} noFrame /></span>; })}</div>
      <b>{players?.length || 0}</b>
    </button>
    <button type="button" className="party-mode__quick-icon" onClick={onStats} aria-label="Ouvrir les statistiques">📊</button>
    <button type="button" className="party-mode__quick-icon" onClick={onLog} aria-label="Ouvrir le journal">☷</button>
  </div>;
}

export function BotTurn({ profile, name, accent, text, icon = "🤖" }: any) {
  return <div className="party-mode__bot" style={{ borderColor: `${accent}55`, boxShadow: `inset 0 0 34px ${accent}0d` }}>
    <ProfileAvatar profile={profile} size={58} showStars={false} ringColor={accent} />
    <div><b style={{ color: accent }}>{name || "BOT"}</b><span>{text || "prépare sa volée…"}</span></div><i>{icon}</i>
  </div>;
}

export function FloatingAdvice({ text, accent, kicker = "CONSEIL CIBLE" }: any) {
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => { setLeaving(false); const t = window.setTimeout(() => setLeaving(true), 4300); return () => window.clearTimeout(t); }, [text]);
  if (!text) return null;
  return <div className={`party-mode__advice${leaving ? " is-leaving" : ""}`} style={{ borderColor: `${accent}88`, boxShadow: `0 12px 34px rgba(0,0,0,.52),0 0 24px ${accent}22` }} aria-live="polite"><small style={{ color: accent }}>{kicker}</small><b>{text}</b></div>;
}

function medal(index: number) { return index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`; }

export function PremiumEndPanel({ title, accent, winnerId, rankingRows, durationMs, totalDarts, awards, onReplay, onStats, onHistory, onConfig, onGames }: any) {
  const rows = rankingRows || [];
  const winner = rows.find((r: any) => String(r.id) === String(winnerId || "")) || rows[0];
  const mins = Math.floor(Math.max(0, Number(durationMs || 0)) / 60000);
  const secs = Math.floor((Math.max(0, Number(durationMs || 0)) % 60000) / 1000);
  return <div className="party-mode-end party-mode-end--showtime" style={{ ["--mode-accent" as any]: accent }}>
    <div className="party-mode-end__burst" aria-hidden>{Array.from({ length: 6 }, (_, i) => <i key={i} className={`is-${i + 1}`} />)}</div>
    <section className="party-mode-end__hero" style={{ borderColor: `${accent}55` }}>
      <div className="party-mode-end__winner"><span>CHAMPION · {title}</span><div><ProfileAvatar profile={winner?.profile} size={86} showStars={false} ringColor={winner?.color || accent} /></div><b style={{ color: winner?.color || accent }}>{String(winner?.name || "VICTOIRE").toUpperCase()}</b><small>{winner?.subtitle || "Match terminé"}</small></div>
      <div className="party-mode-end__match"><div><span>DURÉE</span><b>{mins}:{String(secs).padStart(2, "0")}</b></div><div><span>DARTS</span><b>{Number(totalDarts || 0)}</b></div><div><span>JOUEURS</span><b>{rows.length}</b></div></div>
    </section>
    <section className="party-mode-end__podium">{rows.slice(0, 3).map((row: any, index: number) => <div key={row.id} className={`is-rank-${index + 1}`} style={{ borderColor: `${row.color}66` }}><span>{medal(index)}</span><ProfileAvatar profile={row.profile} size={58} showStars={false} ringColor={row.color} noFrame /><b style={{ color: row.color }}>{String(row.name || "—").toUpperCase()}</b><small>{row.subtitle || ""}</small><strong style={{ color: row.color }}>{row.value}{row.suffix || ""}</strong></div>)}</section>
    {awards?.length ? <section className="party-mode-end__awards">{awards.slice(0, 4).map((a: any) => <div key={a.label}><span>{a.icon || "★"}</span><small>{a.label}</small><b style={{ color: a.color || accent }}>{a.name}</b><em>{a.value}</em></div>)}</section> : null}
    <section className="party-mode-end__ranking">{rows.map((row: any, index: number) => <div key={row.id} style={{ borderColor: `${row.color}4c` }}><strong style={{ color: row.color }}>#{index + 1}</strong><ProfileAvatar profile={row.profile} size={39} showStars={false} ringColor={row.color} noFrame /><div><b style={{ color: row.color }}>{String(row.name || "—").toUpperCase()}</b><span>{row.subtitle || ""}</span></div><em style={{ color: row.color }}>{row.value}<small>{row.suffix || ""}</small></em></div>)}</section>
    <section className="party-mode-end__actions">
      <button type="button" onClick={onStats} style={actionStyle(accent)}>📊 STATS</button>
      <button type="button" onClick={onHistory} style={actionStyle("#74c8ff")}>🕘 HISTORIQUE</button>
      <button type="button" onClick={onReplay} style={actionStyle(accent)}>↻ REJOUER</button>
      <button type="button" onClick={onConfig} style={actionStyle("#b8c0d0")}>⚙ CONFIG</button>
      <button type="button" onClick={onGames} style={actionStyle("#fff")}>JEUX</button>
    </section>
  </div>;
}

export function percent(n: any, d: any) { const den = Number(d || 0); return den > 0 ? Math.round((Number(n || 0) / den) * 1000) / 10 : 0; }
export function bestBy(rows: any[], score: (row: any) => number) { return [...(rows || [])].sort((a, b) => score(b) - score(a))[0] || null; }
export { SOFT };
