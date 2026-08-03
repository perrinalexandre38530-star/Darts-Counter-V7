// @ts-nocheck
// =============================================================
// Centre de statistiques — DARTS FIREFIGHTER
// Historique unifié + KPIs opérationnels + contributions + missions.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { loadDartsFirefighterStatsCache, loadDartsFirefighterStatsUnified } from "../lib/dartsFirefighterStats";
import { difficultyLabel, finishReasonLabel } from "../lib/gameEngines/dartsFirefighterEngine";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const GREEN = "#5ce6a8";
const RED = "#ff5264";

function n(value: any) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const s = Math.max(0, Math.round(n(ms) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function fmtDate(ts: number) { try { return new Date(ts).toLocaleString(); } catch { return "—"; } }
function panel(): React.CSSProperties { return { borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.26))", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 14px 34px rgba(0,0,0,.25)", boxSizing: "border-box" }; }

const INFO = <div style={{ display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.45 }}>
  <div><strong style={{ color: FIRE }}>SOURCE</strong><br />Historique IndexedDB + cache local immédiat.</div>
  <div><strong style={{ color: WATER }}>MISSIONS</strong><br />Victoires, scores, rounds, durée, difficultés et cartes.</div>
  <div><strong style={{ color: GREEN }}>INTERVENTION</strong><br />Niveaux de feu supprimés, extinctions, protections, propagations bloquées et Canadairs.</div>
  <div><strong style={{ color: GOLD }}>PRÉCISION</strong><br />Toutes les fléchettes S/D/T/Bull/DBull/MISS restent disponibles par joueur.</div>
</div>;

export default function StatsDartsFirefighter(props: any) {
  const { theme } = useTheme();
  const embedded = Boolean(props?.embedded);
  const [items, setItems] = React.useState<any[]>(() => loadDartsFirefighterStatsCache());
  const [syncing, setSyncing] = React.useState(false);
  const [range, setRange] = React.useState<"day" | "week" | "month" | "year" | "all">("all");
  const selectedPlayerId = String(props?.playerId || "").trim();
  const selectedPlayerName = String(props?.playerName || "").trim().toLowerCase();

  const refresh = React.useCallback(() => {
    setItems(loadDartsFirefighterStatsCache());
    setSyncing(true);
    void loadDartsFirefighterStatsUnified().then(setItems).finally(() => setSyncing(false));
  }, []);
  React.useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("dc-darts-firefighter-updated", onUpdate);
    window.addEventListener("dc-history-updated", onUpdate);
    return () => {
      window.removeEventListener("dc-darts-firefighter-updated", onUpdate);
      window.removeEventListener("dc-history-updated", onUpdate);
    };
  }, [refresh]);

  const scoped = React.useMemo(() => {
    const now = Date.now();
    let from = 0;
    if (range === "day") { const d = new Date(); d.setHours(0,0,0,0); from = d.getTime(); }
    else if (range === "week") from = now - 7 * 86400000;
    else if (range === "month") { const d = new Date(); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
    else if (range === "year") { const d = new Date(); from = new Date(d.getFullYear(), 0, 1).getTime(); }
    return items.filter((match: any) => {
      if (from && n(match.ts) < from) return false;
      if (!selectedPlayerId && !selectedPlayerName) return true;
      return (match.players || []).some((player: any) => String(player?.id || player?.playerId || player?.profileId || "") === selectedPlayerId || (selectedPlayerName && String(player?.name || "").trim().toLowerCase() === selectedPlayerName));
    });
  }, [items, range, selectedPlayerId, selectedPlayerName]);

  const agg = React.useMemo(() => {
    const total = scoped.length;
    const wins = scoped.filter((m) => m.won).length;
    const score = scoped.reduce((s, m) => s + n(m.score), 0);
    const darts = scoped.reduce((s, m) => s + n(m.totalDarts), 0);
    const hits = scoped.reduce((s, m) => s + n(m.totalHits), 0);
    const duration = scoped.reduce((s, m) => s + n(m.durationMs), 0);
    return {
      total, wins, losses: total - wins, winRate: pct(wins, total), score, avgScore: total ? Math.round(score / total) : 0,
      bestScore: Math.max(0, ...scoped.map((m) => n(m.score))),
      darts, hits, accuracy: pct(hits, darts),
      fireReduced: scoped.reduce((s, m) => s + n(m.totalFireReduced), 0),
      extinguished: scoped.reduce((s, m) => s + n(m.totalExtinguished), 0),
      destroyed: scoped.reduce((s, m) => s + n(m.totalDestroyed), 0),
      spread: scoped.reduce((s, m) => s + n(m.totalSpread), 0),
      blocked: scoped.reduce((s, m) => s + n(m.propagationBlocked), 0),
      protected: scoped.reduce((s, m) => s + n(m.protectionsPlaced), 0),
      water: scoped.reduce((s, m) => s + n(m.waterApplied), 0),
      canadairs: scoped.reduce((s, m) => s + n(m.canadairs), 0),
      bulls: scoped.reduce((s, m) => s + n(m.bulls), 0),
      dbulls: scoped.reduce((s, m) => s + n(m.dbulls), 0),
      misses: scoped.reduce((s, m) => s + n(m.misses), 0),
      avgRounds: total ? scoped.reduce((s, m) => s + n(m.roundsPlayed), 0) / total : 0,
      avgDuration: total ? duration / total : 0,
    };
  }, [scoped]);

  const byDifficulty = React.useMemo(() => {
    const out: Record<string, { games: number; wins: number; score: number }> = {};
    scoped.forEach((m) => {
      const key = String(m.difficulty || "firefighter");
      out[key] ||= { games: 0, wins: 0, score: 0 };
      out[key].games += 1; out[key].wins += m.won ? 1 : 0; out[key].score += n(m.score);
    });
    return Object.entries(out).sort((a, b) => b[1].games - a[1].games);
  }, [scoped]);
  const byMap = React.useMemo(() => {
    const out: Record<string, { games: number; wins: number; score: number }> = {};
    scoped.forEach((m) => {
      const key = String(m.mapId || "FR");
      out[key] ||= { games: 0, wins: 0, score: 0 };
      out[key].games += 1; out[key].wins += m.won ? 1 : 0; out[key].score += n(m.score);
    });
    return Object.entries(out).sort((a, b) => b[1].games - a[1].games);
  }, [scoped]);
  const contributors = React.useMemo(() => {
    const out = new Map<string, any>();
    scoped.forEach((match) => (match.players || []).forEach((player: any) => {
      const id = String(player?.id || player?.playerId || player?.profileId || player?.name || "unknown");
      const row = out.get(id) || { id, name: player?.name || id, avatarDataUrl: player?.avatarDataUrl || null, games: 0, darts: 0, fireReduced: 0, extinguished: 0, blocked: 0, score: 0, hits: 0 };
      row.games += 1; row.darts += n(player?.darts); row.hits += n(player?.hits); row.fireReduced += n(player?.fireReduced); row.extinguished += n(player?.firesExtinguished); row.blocked += n(player?.propagationBlocked); row.score += n(player?.score);
      if (!row.avatarDataUrl) row.avatarDataUrl = player?.avatarDataUrl || player?.avatar || null;
      out.set(id, row);
    }));
    return Array.from(out.values()).sort((a, b) => b.score - a.score || b.fireReduced - a.fireReduced);
  }, [scoped]);

  const content = <main style={{ width: "min(1020px,100%)", margin: "0 auto", padding: embedded ? "0" : "8px 9px 20px", boxSizing: "border-box" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div><div style={{ color: FIRE, fontSize: 11.5, fontWeight: 1100, letterSpacing: .8 }}>DARTS FIREFIGHTER</div><div style={{ color: theme?.textSoft || "#9ca3b3", fontSize: 9 }}>{syncing ? "Synchronisation de l’historique…" : `${scoped.length} mission${scoped.length > 1 ? "s" : ""} analysée${scoped.length > 1 ? "s" : ""}`}</div></div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>{[["day","Jour"],["week","7 j"],["month","Mois"],["year","Année"],["all","Tout"]].map(([id,label]) => <button key={id} onClick={() => setRange(id as any)} style={{ minHeight: 31, padding: "0 9px", borderRadius: 999, border: `1px solid ${range === id ? WATER : "rgba(255,255,255,.09)"}`, background: range === id ? `${WATER}17` : "rgba(255,255,255,.035)", color: range === id ? WATER : "#9da4b5", fontSize: 8.5, fontWeight: 1000 }}>{label}</button>)}</div>
    </div>

    {!scoped.length ? <section style={{ ...panel(), padding: 22, textAlign: "center", borderColor: `${FIRE}35` }}><div style={{ fontSize: 34 }}>🚒</div><div style={{ color: "#fff", fontWeight: 1100, marginTop: 5 }}>Aucune mission Darts Firefighter</div><div style={{ color: "#9299aa", fontSize: 10, marginTop: 4 }}>Les statistiques apparaîtront ici dès la première intervention terminée.</div></section> : <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 7 }}>
        <Kpi label="Missions" value={agg.total} color={WATER} icon="🚒" />
        <Kpi label="Victoires" value={`${agg.wins} · ${agg.winRate}%`} color={GREEN} icon="✅" />
        <Kpi label="Score moyen" value={agg.avgScore} color={GOLD} icon="⭐" />
        <Kpi label="Meilleur score" value={agg.bestScore} color={FIRE} icon="🏆" />
        <Kpi label="Feux éteints" value={agg.extinguished} color={GREEN} icon="🧯" />
        <Kpi label="Feu supprimé" value={agg.fireReduced} color={FIRE} icon="🔥" />
        <Kpi label="Propag. bloquées" value={agg.blocked} color={WATER} icon="🛡" />
        <Kpi label="Zones perdues" value={agg.destroyed} color={RED} icon="⬛" />
      </section>

      <section style={{ ...panel(), marginBottom: 7 }}>
        <SectionTitle title="EFFICACITÉ OPÉRATIONNELLE" color={WATER} subtitle="Précision, eau, protection et rythme d’intervention" />
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
          <Mini label="Précision" value={`${agg.accuracy}%`} color={GREEN} />
          <Mini label="Fléchettes" value={agg.darts} color="#d8dce6" />
          <Mini label="Eau délivrée" value={agg.water} color={WATER} />
          <Mini label="Protections" value={agg.protected} color={WATER} />
          <Mini label="Canadairs" value={agg.canadairs} color={GOLD} />
          <Mini label="Bull / DBull" value={`${agg.bulls} / ${agg.dbulls}`} color={GOLD} />
          <Mini label="Rounds moyens" value={agg.avgRounds.toFixed(1)} color={FIRE} />
          <Mini label="Durée moyenne" value={fmtDuration(agg.avgDuration)} color="#d8dce6" />
        </div>
        <div style={{ marginTop: 9 }}><RatioBar label="Taux de victoire" value={agg.winRate} color={GREEN} /><RatioBar label="Propagation bloquée" value={pct(agg.blocked, agg.blocked + agg.spread)} color={WATER} /><RatioBar label="Territoires préservés" value={pct(Math.max(0, scoped.reduce((s,m)=>s+n(m.activeTerritories),0)-agg.destroyed), scoped.reduce((s,m)=>s+n(m.activeTerritories),0))} color={GOLD} /></div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 7, marginBottom: 7 }}>
        <section style={panel()}><SectionTitle title="DIFFICULTÉS" color={FIRE} subtitle="Résultats selon l’intensité de l’incendie" /><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{byDifficulty.map(([key,row]) => <BreakRow key={key} label={difficultyLabel(key as any)} games={row.games} wins={row.wins} score={row.score} color={key === "inferno" ? RED : key === "commander" ? FIRE : key === "recruit" ? GREEN : GOLD} />)}</div></section>
        <section style={panel()}><SectionTitle title="CARTES" color={GOLD} subtitle="Territoires les plus joués" /><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{byMap.slice(0, 8).map(([key,row]) => <BreakRow key={key} label={key} games={row.games} wins={row.wins} score={row.score} color={WATER} />)}</div></section>
      </div>

      <section style={{ ...panel(), marginBottom: 7 }}><SectionTitle title="CONTRIBUTION DES POMPIERS" color={WATER} subtitle="Statistiques individuelles au sein de la brigade" /><div style={{ marginTop: 8, display: "grid", gap: 7 }}>{contributors.slice(0, 12).map((row, index) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "28px 39px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 13, background: "rgba(255,255,255,.035)", border: `1px solid ${index === 0 ? GOLD : "rgba(255,255,255,.07)"}` }}><div style={{ color: index === 0 ? GOLD : "#aab1bf", fontWeight: 1100, textAlign: "center" }}>#{index + 1}</div><ProfileAvatar profile={row} size={37} showStars={false} /><div style={{ minWidth: 0 }}><div style={{ color: index === 0 ? GOLD : "#fff", fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div><div style={{ color: "#9097a8", fontSize: 8.2 }}>{row.games} mission(s) · {row.fireReduced} niveaux · {row.extinguished} extinctions · {row.blocked} blocages · {pct(row.hits,row.darts)}%</div></div><div style={{ color: WATER, fontSize: 16, fontWeight: 1100 }}>{row.score}</div></div>)}</div></section>

      <section style={panel()}><SectionTitle title="DERNIÈRES MISSIONS" color={FIRE} subtitle="Historique détaillé des interventions" /><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{scoped.slice(0, 12).map((match) => <div key={match.id} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: match.won ? `${GREEN}09` : `${RED}09`, border: `1px solid ${match.won ? GREEN : RED}2f` }}><div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: match.won ? `${GREEN}18` : `${RED}18`, fontSize: 17 }}>{match.won ? "✅" : "🚨"}</div><div style={{ minWidth: 0 }}><div style={{ color: match.won ? GREEN : RED, fontSize: 9.8, fontWeight: 1050 }}>{match.won ? "INCENDIE MAÎTRISÉ" : finishReasonLabel(match.finishReason)}</div><div style={{ color: "#fff", fontSize: 9.2, fontWeight: 950 }}>{match.mapId} · {difficultyLabel(match.difficulty)} · {match.roundsPlayed} rounds · {fmtDuration(match.durationMs)}</div><div style={{ color: "#8e95a6", fontSize: 8 }}>{fmtDate(match.ts)} · {match.totalExtinguished} extinctions · {match.totalDestroyed} perdue(s) · {match.propagationBlocked} bloquée(s)</div></div><div style={{ color: GOLD, fontSize: 16, fontWeight: 1100 }}>{match.score}</div></div>)}</div></section>
    </>}
  </main>;

  if (embedded) return content;
  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -6%,${FIRE}20 0,${theme?.bg || "#080a11"} 46%,#020305 100%)` }}><PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={() => props?.setTab ? props.setTab("stats") : window.history.back()} color={FIRE} glow={`${FIRE}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Statistiques Darts Firefighter" color={WATER} glow={`${WATER}88`} content={INFO} /></div>} />{content}</div>;
}

function Kpi({ label, value, color, icon }: any) { return <div style={{ minWidth: 0, minHeight: 73, borderRadius: 14, padding: 8, textAlign: "center", background: `${color}0d`, border: `1px solid ${color}37` }}><div style={{ fontSize: 15 }}>{icon}</div><div style={{ color, fontSize: 18, lineHeight: 1, fontWeight: 1100 }}>{value}</div><div style={{ marginTop: 4, color: "#8f96a7", fontSize: 7, fontWeight: 1000, letterSpacing: .25 }}>{String(label).toUpperCase()}</div></div>; }
function Mini({ label, value, color }: any) { return <div style={{ minWidth: 0, borderRadius: 12, padding: 8, textAlign: "center", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "#858c9e", fontSize: 7.5, fontWeight: 950 }}>{String(label).toUpperCase()}</div><div style={{ color, fontSize: 15, fontWeight: 1100 }}>{value}</div></div>; }
function SectionTitle({ title, subtitle, color }: any) { return <div><div style={{ color, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>{title}</div><div style={{ color: "#8d94a5", fontSize: 8.2 }}>{subtitle}</div></div>; }
function RatioBar({ label, value, color }: any) { const safe = Math.max(0, Math.min(100, n(value))); return <div style={{ marginTop: 7 }}><div style={{ display: "flex", justifyContent: "space-between", color: "#a7aebb", fontSize: 8.5, fontWeight: 900 }}><span>{label}</span><span style={{ color }}>{safe.toFixed(1)}%</span></div><div style={{ marginTop: 3, height: 7, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${safe}%`, height: "100%", background: color, boxShadow: `0 0 9px ${color}88` }} /></div></div>; }
function BreakRow({ label, games, wins, score, color }: any) { return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, padding: 8, borderRadius: 12, background: `${color}08`, border: `1px solid ${color}25` }}><div><div style={{ color, fontWeight: 1050, fontSize: 9.5 }}>{label}</div><div style={{ color: "#8e95a6", fontSize: 8 }}>{games} partie(s) · {wins} victoire(s) · {pct(wins,games)}%</div></div><div style={{ color: GOLD, fontWeight: 1100 }}>{games ? Math.round(score / games) : 0}</div></div>; }
