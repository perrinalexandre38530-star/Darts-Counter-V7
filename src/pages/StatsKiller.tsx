// @ts-nocheck
import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerStatsAggForProfile } from "../lib/statsKiller";
import { GoldPill } from "../components/StatsPlayerDashboard";

type Props = {
  profiles: Profile[];
  memHistory: any[];
  playerId?: string | null;
  title?: string;
};

const num = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const fmt1 = (n: any) => `${num(n, 0).toFixed(1)}`;
const fmt2 = (n: any) => `${num(n, 0).toFixed(2)}`;
const fmtPct = (n: any) => `${num(n, 0).toFixed(1)}%`;
const safeStr = (v: any) => (v === undefined || v === null ? "" : String(v));
const fmtDate = (ts: any) => {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Date(n).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
};
const fmtFavNum = (n: any) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v === 25 ? "BULL" : `${v}`;
};
const findProfile = (profiles: any[], pid: string | null) => (profiles || []).find((p) => p?.id === pid) || null;

function getPlayers(rec: any) {
  const s = rec?.summary || rec?.payload?.summary || null;
  return (Array.isArray(rec?.players) && rec.players) || (Array.isArray(rec?.payload?.players) && rec.payload.players) || (Array.isArray(s?.players) && s.players) || [];
}
function isKillerRecord(rec: any) {
  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind || rec?.payload?.summary?.kind;
  const mode = rec?.mode || rec?.summary?.mode || rec?.payload?.mode || rec?.payload?.summary?.mode;
  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;
  return kind === "killer" || mode === "killer" || game === "killer";
}
function recTs(rec: any) {
  return num(rec?.updatedAt ?? rec?.finishedAt ?? rec?.createdAt ?? rec?.ts ?? rec?.summary?.updatedAt ?? rec?.summary?.finishedAt ?? rec?.payload?.updatedAt ?? rec?.payload?.summary?.updatedAt, 0);
}
function rankOfRecord(rec: any, playerId: string) {
  const s = rec?.summary || rec?.payload?.summary || null;
  const direct = s?.detailedByPlayer?.[playerId] || (Array.isArray(s?.perPlayer) ? s.perPlayer.find((p: any) => String(p?.playerId || p?.profileId || p?.id) === String(playerId)) : null) || getPlayers(rec).find((p: any) => String(p?.id || p?.playerId || p?.profileId) === String(playerId)) || null;
  const rank = num(direct?.finalRank ?? direct?.rank ?? direct?.placement ?? direct?.place ?? direct?.position, 0);
  if (rank > 0) return rank;
  const winnerId = safeStr(rec?.winnerId || s?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId);
  if (winnerId && winnerId === String(playerId)) return 1;
  return 0;
}


const PERIOD_OPTIONS = [
  { key: "J", label: "J" },
  { key: "S", label: "S" },
  { key: "M", label: "M" },
  { key: "A", label: "A" },
  { key: "ARV", label: "ARV" },
] as const;

function inPeriod(ts: number, period: string) {
  if (!Number.isFinite(Number(ts)) || Number(ts) <= 0) return period === "ARV";
  const now = Date.now();
  const t = Number(ts);
  const day = 24 * 60 * 60 * 1000;
  if (period === "J") return now - t <= day;
  if (period === "S") return now - t <= 7 * day;
  if (period === "M") return now - t <= 31 * day;
  if (period === "A") return now - t <= 366 * day;
  return true;
}
export default function StatsKiller({ profiles, memHistory, playerId = null, title = "KILLER" }: Props) {
  const { theme } = useTheme();
  const [period, setPeriod] = React.useState<string>("ARV");

  const data = React.useMemo(() => {
    const killer = (Array.isArray(memHistory) ? memHistory : []).filter(isKillerRecord);
    const scoped = killer.filter((r: any) => inPeriod(recTs(r), period));
    const filtered = playerId
      ? scoped.filter((r) => getPlayers(r).some((p: any) => String(p?.id || p?.playerId || p?.profileId) === String(playerId)) || !!(r?.summary?.detailedByPlayer?.[playerId] || r?.payload?.summary?.detailedByPlayer?.[playerId]))
      : scoped;

    const agg = playerId ? computeKillerStatsAggForProfile(filtered, String(playerId)) : null;
    const items = filtered
      .slice()
      .sort((a: any, b: any) => recTs(b) - recTs(a))
      .map((r: any) => {
        const when = recTs(r);
        const winnerId = safeStr(r?.winnerId || r?.summary?.winnerId || r?.payload?.winnerId || r?.payload?.summary?.winnerId);
        const players = getPlayers(r);
        const names = players.map((p: any) => p?.name).filter(Boolean).join(" · ");
        const winnerName = findProfile(profiles, winnerId)?.name || players.find((p: any) => String(p?.id || p?.playerId || p?.profileId) === winnerId)?.name || "—";
        return { id: r?.id || `${when}-${Math.random()}`, when, names, winnerName, rank: playerId ? rankOfRecord(r, String(playerId)) : 0 };
      });

    return {
      agg,
      items: items.slice(0, 20),
      played: agg?.played || items.length,
      wins: agg?.wins || 0,
      lastAt: agg?.lastAt || items[0]?.when || 0,
      placements: agg?.placements || {},
    };
  }, [memHistory, period, playerId, profiles]);

  const agg = data.agg || {};
  const placementRows = Object.keys(data.placements || {})
    .map((k) => ({ rank: Number(k), count: num(data.placements[k], 0) }))
    .filter((x) => x.rank > 0 && x.count > 0)
    .sort((a, b) => a.rank - b.rank);

  const totalPodium = num(agg.firsts, 0) + num(agg.seconds, 0) + num(agg.thirds, 0);
  const shieldCounters = num(agg.shieldBreaksTotal, 0) + num(agg.shieldHalfBreaksTotal, 0);
  const detailedRows = [
    { label: "Matchs", total: agg.played || 0, avg: null, pct: null },
    { label: "Victoires", total: agg.wins || 0, avg: null, pct: agg.winRate || 0 },
    { label: "Kills", total: agg.killsTotal || 0, avg: agg.killsAvg || 0, pct: null },
    { label: "Deaths", total: agg.deathsTotal || 0, avg: agg.deathsAvg || 0, pct: null },
    { label: "Darts", total: agg.dartsTotal || 0, avg: agg.dartsAvg || 0, pct: null },
    { label: "Vies prises", total: agg.livesTakenTotal || 0, avg: agg.played ? num(agg.livesTakenTotal) / Math.max(1, num(agg.played)) : 0, pct: null },
    { label: "Vies perdues", total: agg.livesLostTotal || 0, avg: agg.played ? num(agg.livesLostTotal) / Math.max(1, num(agg.played)) : 0, pct: null },
    { label: "Résurrections", total: agg.resurrectionsGivenTotal || 0, avg: agg.played ? num(agg.resurrectionsGivenTotal) / Math.max(1, num(agg.played)) : 0, pct: null },
    { label: "Désarmements", total: agg.disarmsTriggeredTotal || 0, avg: agg.played ? num(agg.disarmsTriggeredTotal) / Math.max(1, num(agg.played)) : 0, pct: null },
    { label: "Contres bouclier", total: shieldCounters, avg: agg.played ? shieldCounters / Math.max(1, num(agg.played)) : 0, pct: null },
    { label: "Précision offensive", total: fmtPct(agg.precisionOffensive || 0), avg: null, pct: agg.precisionOffensive || 0 },
    { label: "Précision killer", total: fmtPct(agg.precisionKiller || 0), avg: null, pct: agg.precisionKiller || 0 },
  ];

  const kpiTop = [
    { label: "Cumul", title: "Matchs joués", value: agg.played || 0, sub: `Victoires ${agg.wins || 0}`, color: "#47B5FF" },
    { label: "Moyennes", title: "Kills / match", value: fmt2(agg.killsAvg || 0), sub: `Deaths ${fmt2(agg.deathsAvg || 0)}`, color: "#FF6FB5" },
    { label: "Records", title: "Hits total", value: agg.totalHits || 0, sub: `Dernier ${fmtDate(data.lastAt)}`, color: "#77FF9B" },
    { label: "% / contrôle", title: "Win rate", value: fmtPct(agg.winRate || 0), sub: `Podiums ${totalPodium}`, color: "#F6C256" },
  ];

  const segmentEntries = Object.entries((agg?.hitsBySegmentAgg || {}) as Record<string, number>)
    .filter(([k, v]) => safeStr(k) && num(v) > 0)
    .sort((a, b) => num(b[1]) - num(a[1]))
    .slice(0, 8);
  const segmentMax = Math.max(1, ...segmentEntries.map(([, v]) => num(v)));

  const recentForTrend = (data.items || []).slice(0, 8).reverse();
  const trendMax = Math.max(1, ...recentForTrend.map((it: any) => (it.rank > 0 ? Math.max(1, 6 - it.rank) : 1)));

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionTitle theme={theme} title={title} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {PERIOD_OPTIONS.map((opt) => (
          <GoldPill key={opt.key} active={period === opt.key} onClick={() => setPeriod(opt.key)} style={{ minHeight: 36, minWidth: opt.key === "ARV" ? 68 : 44, justifyContent: "center" }}>
            {opt.label}
          </GoldPill>
        ))}
      </div>

      <NeonPanel theme={theme} title={`${title} MULTI`}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <GoldPill active>All</GoldPill>
          <GoldPill>Combat</GoldPill>
          <GoldPill>Classement</GoldPill>
          <GoldPill>Historique</GoldPill>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {kpiTop.slice(0, 2).map((item) => (
            <NeonKpi key={item.label} {...item} large />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          {kpiTop.slice(2).map((item) => (
            <NeonKpi key={item.label} {...item} />
          ))}
        </div>

        <SessionBar theme={theme} label="Sessions Killer" value={agg.played || 0} />
      </NeonPanel>

      <TablePanel theme={theme} title="Stats détaillées (période)">
        <StatsTable theme={theme} rows={detailedRows} />
      </TablePanel>

      <TablePanel theme={theme} title="Moyennes · records · favoris">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <MetricCluster
            theme={theme}
            title="Moyennes"
            color="#FF6FB5"
            items={[
              ["Moy. kills", fmt2(agg.killsAvg || 0)],
              ["Moy. deaths", fmt2(agg.deathsAvg || 0)],
              ["Réarmement", fmt2(agg.rearmAvgThrows || 0)],
            ]}
          />
          <MetricCluster
            theme={theme}
            title="Records"
            color="#77FF9B"
            items={[
              ["Hits total", agg.totalHits || 0],
              ["Contres bouclier", shieldCounters],
              ["Titres", agg.firsts || 0],
            ]}
          />
          <MetricCluster
            theme={theme}
            title="Favoris"
            color="#47B5FF"
            items={[
              ["Segment", agg.favSegment || "—"],
              ["Numéro", fmtFavNum(agg.favNumber)],
              ["Hits", agg.favSegmentHits || agg.favNumberHits || 0],
            ]}
          />
          <MetricCluster
            theme={theme}
            title="Fonctions"
            color="#F6C256"
            items={[
              ["Résurrections", `${agg.resurrectionsGivenTotal || 0} / ${agg.resurrectionsReceivedTotal || 0}`],
              ["Désarmements", `${agg.disarmsTriggeredTotal || 0} / ${agg.disarmsReceivedTotal || 0}`],
              ["Boucliers", `${agg.shieldBreaksTotal || 0} cassés`],
            ]}
          />
        </div>
      </TablePanel>

      <TablePanel theme={theme} title="Classements & podiums">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <SmallStat theme={theme} label="Podiums" value={totalPodium} sub={`Top 3 sur ${agg.played || 0} matchs`} />
          <SmallStat theme={theme} label="Titres" value={agg.firsts || 0} sub={`2e:${agg.seconds || 0} • 3e:${agg.thirds || 0}`} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
          <PlaceBox theme={theme} rank="1er" count={agg.firsts || 0} />
          <PlaceBox theme={theme} rank="2e" count={agg.seconds || 0} />
          <PlaceBox theme={theme} rank="3e" count={agg.thirds || 0} />
        </div>
        <div style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft}`, overflow: "hidden", background: "linear-gradient(180deg, rgba(8,12,32,.85), rgba(8,10,18,.96))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", padding: "12px 14px", borderBottom: `1px solid ${theme.borderSoft}`, fontWeight: 900, color: theme.text, fontSize: 12 }}>
            <div>Classement</div>
            <div style={{ textAlign: "right" }}>Total</div>
          </div>
          {placementRows.length ? placementRows.map((row) => (
            <div key={row.rank} style={{ display: "grid", gridTemplateColumns: "1fr 110px", padding: "10px 14px", borderBottom: `1px solid ${theme.borderSoft}55`, color: theme.textSoft, fontSize: 12.5 }}>
              <div>{row.rank}e</div>
              <div style={{ textAlign: "right", color: theme.text }}>{row.count}</div>
            </div>
          )) : (
            <div style={{ padding: 14, color: theme.textSoft, fontSize: 12.5 }}>Aucun classement final exploitable trouvé pour le moment.</div>
          )}
        </div>
      </TablePanel>

      <TablePanel theme={theme} title="Évolution des matchs">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <GoldPill active>Rank</GoldPill>
          <GoldPill>Win %</GoldPill>
          <GoldPill>Kills</GoldPill>
          <GoldPill>Podiums</GoldPill>
        </div>
        {recentForTrend.length > 1 ? (
          <div style={{ height: 120, borderRadius: 20, border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01))", padding: 14, display: "flex", alignItems: "flex-end", gap: 10 }}>
            {recentForTrend.map((it: any, idx: number) => {
              const bar = it.rank > 0 ? Math.max(16, ((Math.max(1, 6 - it.rank)) / trendMax) * 84) : 16;
              return (
                <div key={it.id || idx} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: "100%", maxWidth: 44, height: bar, borderRadius: 999, background: "linear-gradient(180deg, rgba(246,194,86,.95), rgba(71,181,255,.75))", boxShadow: "0 0 18px rgba(246,194,86,.28)" }} />
                  <div style={{ fontSize: 10.5, color: theme.textSoft }}>{it.rank > 0 ? `${it.rank}e` : "—"}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: theme.textSoft, fontSize: 12 }}>Pas assez de matchs pour afficher une courbe.</div>
        )}
      </TablePanel>

      <TablePanel theme={theme} title="Radar segments clés / hits par segment">
        {segmentEntries.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, alignItems: "center" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "radial-gradient(circle at center, rgba(246,194,86,.18), rgba(7,10,24,.96) 58%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: "12%", borderRadius: 999, border: `1px solid ${theme.borderSoft}55` }} />
              <div style={{ position: "absolute", inset: "24%", borderRadius: 999, border: `1px solid ${theme.borderSoft}44` }} />
              <div style={{ position: "absolute", inset: "36%", borderRadius: 999, border: `1px solid ${theme.borderSoft}33` }} />
              {segmentEntries.map(([seg, v], idx) => {
                const angle = (Math.PI * 2 * idx) / segmentEntries.length - Math.PI / 2;
                const ratio = num(v) / segmentMax;
                const x = 50 + Math.cos(angle) * (18 + ratio * 24);
                const y = 50 + Math.sin(angle) * (18 + ratio * 24);
                return <div key={seg} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", color: theme.primary, fontSize: 12, fontWeight: 1000, textShadow: `0 0 8px ${theme.primary}66` }}>{seg}</div>;
              })}
              <div style={{ width: 10, height: 10, borderRadius: 999, background: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }} />
            </div>
            <div>
              <div style={{ color: theme.primary, fontSize: 22, fontWeight: 1000, marginBottom: 12, textShadow: `0 0 14px ${theme.primary}44` }}>Segments clés</div>
              {segmentEntries.slice(0, 5).map(([seg, v]) => (
                <div key={seg} style={{ marginBottom: 10, fontSize: 13, color: theme.textSoft }}>
                  <span style={{ color: theme.text }}>{seg}</span> : <span style={{ color: "#77FF9B", fontWeight: 900 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: theme.textSoft, fontSize: 12 }}>Pas assez de hits enregistrés pour afficher les segments clés.</div>
        )}

        <div style={{ marginTop: 18, borderRadius: 18, border: `1px solid ${theme.borderSoft}`, padding: 14, background: "linear-gradient(180deg, rgba(8,12,32,.8), rgba(8,10,18,.96))" }}>
          <div style={{ fontSize: 12, fontWeight: 1000, color: theme.text, marginBottom: 12, textTransform: "uppercase" }}>Hits par segment</div>
          {segmentEntries.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {segmentEntries.map(([seg, v]) => (
                <BarMini key={seg} theme={theme} label={seg} value={num(v)} max={segmentMax} />
              ))}
            </div>
          ) : (
            <div style={{ color: theme.textSoft, fontSize: 12 }}>Aucun segment favori exploitable pour le moment.</div>
          )}
        </div>
      </TablePanel>

      <TablePanel theme={theme} title="Historique des matchs Killer">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(data.items || []).map((it: any) => (
            <div key={it.id} style={{ borderRadius: 20, border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(15,19,30,.96), rgba(9,12,20,.98))", padding: 14, boxShadow: "0 12px 24px rgba(0,0,0,.24)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: theme.text, fontWeight: 900 }}>{fmtDate(it.when)}</div>
                  <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.names || "—"}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.primary, fontWeight: 900 }}>Vainqueur : {it.winnerName || "—"}</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 92 }}>
                  <div style={{ fontSize: 20, color: it.rank === 1 ? "#77FF9B" : theme.primary, fontWeight: 1000 }}>{it.rank > 0 ? `${it.rank}e` : "—"}</div>
                  <div style={{ color: it.rank === 1 ? "#77FF9B" : theme.textSoft, fontWeight: 1000, fontSize: 12 }}>{it.rank === 1 ? "WIN" : it.rank > 0 ? "PLACE" : "—"}</div>
                </div>
              </div>
            </div>
          ))}
          {!data.items?.length ? <div style={{ color: theme.textSoft, fontSize: 12 }}>Aucun historique KILLER récent.</div> : null}
        </div>
      </TablePanel>
    </div>
  );
}

function SectionTitle({ theme, title }: any) {
  return <div style={{ fontSize: 28, fontWeight: 1000, color: theme.primary, textShadow: `0 0 16px ${theme.primary}66`, letterSpacing: 1 }}>{title}</div>;
}

function NeonPanel({ theme, title, children }: any) {
  return (
    <div style={{ borderRadius: 30, padding: 18, background: "linear-gradient(180deg, rgba(10,12,24,.98), rgba(7,9,18,.98))", border: `1px solid ${theme.borderSoft}`, boxShadow: `0 18px 40px rgba(0,0,0,.55), 0 0 28px ${theme.primary}14` }}>
      <div style={{ textAlign: "center", color: theme.primary, fontSize: 24, fontWeight: 1000, textShadow: `0 0 16px ${theme.primary}66`, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function TablePanel({ theme, title, children }: any) {
  return (
    <div style={{ borderRadius: 26, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(8,11,26,.96), rgba(7,9,18,.98))", boxShadow: `0 16px 34px rgba(0,0,0,.45), 0 0 22px ${theme.primary}10` }}>
      <div style={{ padding: "14px 18px", fontSize: 18, fontWeight: 1000, color: theme.text, borderBottom: `1px solid ${theme.borderSoft}`, background: "linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.02))" }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function NeonKpi({ label, title, value, sub, color, large = false }: any) {
  return (
    <div style={{ borderRadius: 22, padding: large ? 14 : 12, minHeight: large ? 110 : 95, background: "linear-gradient(180deg, rgba(18,20,28,.95), rgba(12,13,18,.98))", border: `1px solid ${color}`, boxShadow: `0 0 18px ${color}33, inset 0 0 14px ${color}10` }}>
      <div style={{ color, fontSize: 10, textTransform: "uppercase", letterSpacing: .6, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 6, color: "#d9d9d9", fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ marginTop: 6, color: color === "#47B5FF" ? "#6dc7ff" : color === "#FF6FB5" ? "#ffc2e4" : color === "#77FF9B" ? "#cffff0" : "#ffd768", fontSize: large ? 34 : 28, lineHeight: 1, fontWeight: 1000, textShadow: `0 0 10px ${color}55` }}>{String(value ?? "—")}</div>
      <div style={{ marginTop: 6, color: "rgba(255,255,255,.65)", fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function SessionBar({ theme, label, value }: any) {
  return (
    <div style={{ marginTop: 14, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, rgba(255,255,255,.02), rgba(255,255,255,.04))" }}>
      <div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000 }}>{label}</div>
      <div style={{ color: theme.primary, fontSize: 34, lineHeight: 1, fontWeight: 1000, textShadow: `0 0 12px ${theme.primary}44` }}>{value}</div>
    </div>
  );
}

function StatsTable({ theme, rows }: any) {
  return (
    <div style={{ borderRadius: 22, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(8,12,30,.82), rgba(8,10,18,.96))" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr .9fr .7fr", padding: "12px 14px", borderBottom: `1px solid ${theme.borderSoft}`, color: theme.primary, fontWeight: 1000, fontSize: 12, textTransform: "uppercase" }}>
        <div>Stat</div>
        <div>Session / moy</div>
        <div>Total</div>
        <div>%</div>
      </div>
      {rows.map((row: any, idx: number) => (
        <div key={`${row.label}-${idx}`} style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr .9fr .7fr", padding: "11px 14px", borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}66`, color: theme.textSoft, fontSize: 12.5 }}>
          <div style={{ color: theme.text }}>{row.label}</div>
          <div>{row.avg === null ? "—" : fmt2(row.avg)}</div>
          <div style={{ color: theme.primary, fontWeight: 900 }}>{row.total}</div>
          <div style={{ color: row.pct === null ? theme.textSoft : "#77FF9B", fontWeight: row.pct === null ? 500 : 900 }}>{row.pct === null ? "—" : fmtPct(row.pct)}</div>
        </div>
      ))}
    </div>
  );
}

function MetricCluster({ theme, title, color, items }: any) {
  return (
    <div style={{ borderRadius: 22, border: `1px solid ${theme.borderSoft}`, padding: 12, background: "linear-gradient(180deg, rgba(8,12,30,.86), rgba(8,10,18,.96))" }}>
      <div style={{ textAlign: "center", color, fontSize: 15, fontWeight: 1000, textShadow: `0 0 12px ${color}55`, marginBottom: 12, textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {items.map(([label, value]: any) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: theme.textSoft }}>{label}</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1000, color: color }}>{String(value ?? "—")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallStat({ theme, label, value, sub }: any) {
  return (
    <div style={{ borderRadius: 20, border: `1px solid ${theme.borderSoft}`, padding: 14, background: "linear-gradient(180deg, rgba(9,12,28,.92), rgba(8,10,18,.98))" }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", color: theme.textSoft, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 34, lineHeight: 1, fontWeight: 1000, color: theme.primary, textShadow: `0 0 14px ${theme.primary}44` }}>{value}</div>
      <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 12 }}>{sub}</div>
    </div>
  );
}

function PlaceBox({ theme, rank, count }: any) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft}`, padding: "12px 14px", background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015))", textAlign: "center" }}>
      <div style={{ color: theme.primary, fontSize: 18, fontWeight: 1000 }}>{rank}</div>
      <div style={{ marginTop: 4, color: theme.text, fontSize: 30, lineHeight: 1, fontWeight: 1000 }}>{count}</div>
    </div>
  );
}

function BarMini({ theme, label, value, max }: any) {
  const h = Math.max(14, (value / Math.max(1, max)) * 90);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: 106, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ width: 28, height: h, borderRadius: 999, background: "linear-gradient(180deg, rgba(246,194,86,.95), rgba(71,181,255,.82))", boxShadow: "0 0 16px rgba(71,181,255,.35)" }} />
      </div>
      <div style={{ marginTop: 6, color: theme.text, fontWeight: 900, fontSize: 12 }}>{label}</div>
      <div style={{ color: theme.textSoft, fontSize: 11 }}>{value}</div>
    </div>
  );
}
