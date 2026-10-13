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

export type PremiumMoment = {
  key?: string | number;
  icon?: string;
  kicker?: string;
  title: string;
  detail?: string;
  tone?: "success" | "danger" | "info" | "gold";
  durationMs?: number;
};

export function PremiumMomentOverlay({ moment, accent = "#4fe4ff", profile, playerName: momentPlayerName }: { moment?: PremiumMoment | null; accent?: string; profile?: any; playerName?: string }) {
  const [visible, setVisible] = React.useState(false);
  const [rendered, setRendered] = React.useState<PremiumMoment | null>(null);
  React.useEffect(() => {
    if (!moment?.title) return;
    setRendered(moment);
    setVisible(true);
    const leave = window.setTimeout(() => setVisible(false), Math.max(900, Number(moment.durationMs || 2200)));
    const clear = window.setTimeout(() => setRendered(null), Math.max(1200, Number(moment.durationMs || 2200)) + 360);
    return () => { window.clearTimeout(leave); window.clearTimeout(clear); };
  }, [moment?.key, moment?.title, moment?.detail]);
  if (!rendered) return null;
  return <div className={`party-mode-moment is-${rendered.tone || "info"}${visible ? " is-visible" : " is-leaving"}`} style={{ ["--mode-accent" as any]: accent }} aria-live="polite" aria-atomic="true">
    <div className="party-mode-moment__flare" aria-hidden />
    <div className="party-mode-moment__card">
      {profile ? <div className="party-mode-moment__avatar"><ProfileAvatar profile={profile} size={54} showStars={false} ringColor={accent} /></div> : null}
      <div className="party-mode-moment__icon" aria-hidden>{rendered.icon || "⚡"}</div>
      <div className="party-mode-moment__copy">
        <small>{rendered.kicker || momentPlayerName || "MOMENT FORT"}</small>
        <b>{rendered.title}</b>
        {rendered.detail ? <span>{rendered.detail}</span> : null}
      </div>
    </div>
  </div>;
}

export function GameplayMission({ accent, icon = "🎯", kicker = "CE QUE TU DOIS FAIRE", title, text, chips = [], tone = "normal" }: any) {
  if (!title && !text) return null;
  const toneClass = tone === "danger" ? " is-danger" : tone === "success" ? " is-success" : "";
  return <section className={`party-mode__mission${toneClass}`} style={{ borderColor: `${accent}55`, ["--mission-accent" as any]: accent }}>
    <div className="party-mode__mission-icon" style={{ color: accent }}>{icon}</div>
    <div className="party-mode__mission-copy">
      <small style={{ color: accent }}>{kicker}</small>
      <b>{title}</b>
      {text ? <p>{text}</p> : null}
      {chips?.length ? <div>{chips.filter(Boolean).slice(0, 5).map((chip: any, index: number) => <span key={`${chip}-${index}`}>{chip}</span>)}</div> : null}
    </div>
  </section>;
}

export function BotTurn({ profile, name, accent, text, icon = "🤖", intent, confidence, phaseLabel, persona, personaIcon, objectiveDetail, reaction, adaptation, adaptationDetail, learningConfidence, learningTarget, scouting, scoutingDetail, scoutingMatches, scoutingConfidence, scoutingTarget, rivalry, rivalryDetail, rivalryRecord, rivalryMatches, rivalryConfidence, rivalryTension, rivalryTarget, rivalryQuote }: any) {
  const conf = Number.isFinite(Number(confidence)) ? Math.max(0, Math.min(100, Number(confidence))) : null;
  return <div className="party-mode__bot" style={{ borderColor: `${accent}55`, boxShadow: `inset 0 0 34px ${accent}0d` }}>
    <ProfileAvatar profile={profile} size={58} showStars={false} ringColor={accent} />
    <div className="party-mode__bot-copy">
      <div className="party-mode__bot-head"><b style={{ color: accent }}>{name || "BOT"}</b>{phaseLabel ? <em>{phaseLabel}</em> : null}</div>
      <div className="party-mode__bot-meta">
        {persona ? <strong style={{ borderColor: `${accent}55`, color: accent }}>{personaIcon || "🤖"} {persona}</strong> : null}
        {conf != null ? <span>{Math.round(conf)}% confiance</span> : null}
      </div>
      <span>{text || "prépare sa volée…"}</span>
      {intent ? <div className="party-mode__bot-intent"><small>OBJECTIF TACTIQUE</small><strong style={{ color: accent }}>{intent}</strong>{objectiveDetail ? <p>{objectiveDetail}</p> : null}</div> : null}
      {reaction ? <div className="party-mode__bot-reaction"><small>RÉACTION IA</small><b>{reaction}</b></div> : null}
      {rivalry ? <div className="party-mode__bot-rivalry">
        <div className="party-mode__bot-rivalry-head"><small>RIVALITÉ</small><strong style={{ color: accent }}>{rivalry}</strong></div>
        <div className="party-mode__bot-rivalry-score"><b>{rivalryRecord || "0-0"}</b><span>{rivalryTarget ? `vs ${rivalryTarget}` : "duel"}{Number.isFinite(Number(rivalryMatches)) ? ` · ${Math.round(Number(rivalryMatches))} match(s)` : ""}</span></div>
        {rivalryDetail ? <p>{rivalryDetail}</p> : null}
        {rivalryQuote ? <blockquote>“{rivalryQuote}”</blockquote> : null}
        <div className="party-mode__bot-rivalry-bars">
          {Number.isFinite(Number(rivalryTension)) ? <span><em>TENSION</em><i><u style={{ width: `${Math.max(0,Math.min(100,Number(rivalryTension)))}%`, background: accent }} /></i><b>{Math.round(Number(rivalryTension))}%</b></span> : null}
          {Number.isFinite(Number(rivalryConfidence)) ? <span><em>DOSSIER</em><i><u style={{ width: `${Math.max(0,Math.min(100,Number(rivalryConfidence)))}%`, background: accent }} /></i><b>{Math.round(Number(rivalryConfidence))}%</b></span> : null}
        </div>
      </div> : null}
      {scouting ? <div className="party-mode__bot-scouting">
        <div><small>DOSSIER LONG TERME</small><strong style={{ color: accent }}>{scouting}</strong></div>
        <em>{scoutingTarget ? `Cible : ${scoutingTarget}` : "Adversaire connu"}{Number.isFinite(Number(scoutingMatches)) ? ` · ${Math.round(Number(scoutingMatches))} match(s)` : ""}</em>
        {scoutingDetail ? <p>{scoutingDetail}</p> : null}
        {Number.isFinite(Number(scoutingConfidence)) ? <div className="party-mode__bot-learning"><i style={{ width: `${Math.max(0, Math.min(100, Number(scoutingConfidence)))}%`, background: accent }} /><small>{Math.round(Number(scoutingConfidence))}% dossier</small></div> : null}
      </div> : null}
      {adaptation ? <div className="party-mode__bot-memory">
        <div><small>MÉMOIRE ADVERSAIRE</small><strong style={{ color: accent }}>{adaptation}</strong></div>
        {learningTarget ? <em>Cible : {learningTarget}</em> : null}
        {adaptationDetail ? <p>{adaptationDetail}</p> : null}
        {Number.isFinite(Number(learningConfidence)) ? <div className="party-mode__bot-learning"><i style={{ width: `${Math.max(0, Math.min(100, Number(learningConfidence)))}%`, background: accent }} /><small>{Math.round(Number(learningConfidence))}% appris</small></div> : null}
      </div> : null}
      {conf != null ? <div className="party-mode__bot-confidence"><i style={{ width: `${conf}%`, background: accent }} /><small>{Math.round(conf)}% confiance</small></div> : null}
    </div><i className="party-mode__bot-icon">{icon}</i>
  </div>;
}

export function FloatingAdvice({ text, accent, kicker = "CONSEIL CIBLE" }: any) {
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => { setLeaving(false); const t = window.setTimeout(() => setLeaving(true), 4300); return () => window.clearTimeout(t); }, [text]);
  if (!text) return null;
  return <div className={`party-mode__advice${leaving ? " is-leaving" : ""}`} style={{ borderColor: `${accent}88`, boxShadow: `0 12px 34px rgba(0,0,0,.52),0 0 24px ${accent}22` }} aria-live="polite"><small style={{ color: accent }}>{kicker}</small><b>{text}</b></div>;
}

function medal(index: number) { return index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`; }

export function PremiumEndPanel({ title, accent, winnerId, rankingRows, durationMs, totalDarts, awards, progression, onReplay, onStats, onHistory, onConfig, onGames }: any) {
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
    {progression?.unlocks?.length ? <section className="party-mode-end__progress">
      <header><div><small>PROGRESSION CARRIÈRE</small><b>NOUVEAUX BADGES & RECORDS</b></div><strong style={{ color: accent }}>{progression.unlocks.length}</strong></header>
      <div className="party-mode-end__progress-grid">
        {progression.unlocks.slice(0, 8).map((u: any, index: number) => <div key={`${u.type}-${u.playerId}-${u.key}-${index}`} className={`is-${u.type || "record"}`}>
          <span aria-hidden>{u.icon || (u.type === "badge" ? "🏅" : "📈")}</span>
          <div><small>{u.type === "badge" ? "BADGE DÉBLOQUÉ" : "NOUVEAU RECORD"}</small><b>{u.label}</b><em>{String(u.playerName || "").toUpperCase()}</em><p>{u.detail || (u.value != null ? String(u.value) : "")}</p></div>
        </div>)}
      </div>
    </section> : null}
    {progression?.winnerCareer ? <section className="party-mode-end__career" style={{ borderColor: `${accent}44` }}>
      <div><small>CARRIÈRE · {title}</small><b style={{ color: accent }}>{progression.winnerCareer.matches || 0} PARTIES</b></div>
      <div><small>VICTOIRES</small><b>{progression.winnerCareer.wins || 0}</b></div>
      <div><small>BADGES</small><b>{progression.winnerCareer.badges?.length || 0}</b></div>
      <div><small>RECORDS</small><b>{progression.winnerCareer.records?.length || 0}</b></div>
    </section> : null}
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
