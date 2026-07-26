// @ts-nocheck
import React from "react";

const GOLD = "#f6c256";
const GOOD = "#42d6ff";
const BAD = "#ff667e";
const CYAN = "#42d6ff";
const PINK = "#ff63b8";

const n = (v: any, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const txt = (v: any) => String(v ?? "").trim();
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%";

function isBowling(r: any) {
  const blob = [r?.kind, r?.mode, r?.gameId, r?.summary?.kind, r?.summary?.mode, r?.payload?.kind, r?.payload?.mode, r?.payload?.stats?.mode].map((x) => txt(x).toLowerCase()).join("|");
  return blob.includes("bowling");
}
function pools(r: any) {
  return [r?.payload?.stats?.players, r?.payload?.summary?.players, r?.summary?.players, r?.summary?.perPlayer, r?.players].filter(Array.isArray);
}
function findRow(r: any, playerId: string, playerName?: string | null) {
  const pid = txt(playerId); const pname = txt(playerName).toLowerCase();
  for (const arr of pools(r)) {
    const byId = arr.find((x: any) => [x?.id, x?.playerId, x?.profileId].some((v) => txt(v) === pid));
    if (byId) return byId;
    if (pname) { const byName = arr.find((x: any) => txt(x?.name ?? x?.playerName ?? x?.displayName).toLowerCase() === pname); if (byName) return byName; }
  }
  return null;
}
function playedAt(r: any) { return n(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt); }
function winnerIds(r: any) {
  const raw = r?.winnerIds ?? r?.summary?.winnerIds ?? r?.payload?.winnerIds ?? r?.payload?.summary?.winnerIds;
  if (Array.isArray(raw)) return raw.map(String);
  const one = txt(r?.winnerId ?? r?.summary?.winnerId ?? r?.payload?.winnerId ?? r?.payload?.summary?.winnerId);
  return one ? [one] : [];
}
function sum(rows: any[], key: string) { return rows.reduce((s, r) => s + n(r?.[key]), 0); }
function best(rows: any[], key: string) { return rows.reduce((m, r) => Math.max(m, n(r?.[key])), 0); }

function Kpi({ label, value, detail, color = GOLD }: any) {
  return <div style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: 11 }}><div style={{ color: "#9aa0b2", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 21, fontWeight: 1000 }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "#aab0c1", fontSize: 9.5 }}>{detail}</div> : null}</div>;
}

export default function BowlingStatsTabFull({ records = [], playerId, playerName }: any) {
  const matches = React.useMemo(() => (Array.isArray(records) ? records : []).filter(isBowling).map((record) => ({ record, row: findRow(record, String(playerId || ""), playerName) })).filter((x) => x.row).sort((a, b) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName]);
  const rows = matches.map((x) => x.row);
  const series = rows.length;
  const wins = matches.filter(({ record, row }) => row?.win === true || row?.winner === true || winnerIds(record).includes(String(row?.teamId || playerId))).length;
  const gamesPlayed = sum(rows, "gamesPlayed");
  const gamesWon = sum(rows, "gamesWon");
  const darts = sum(rows, "darts");
  const rolls = sum(rows, "rolls") || sum(rows, "visits");
  const pins = sum(rows, "pins");
  const strikes = sum(rows, "strikes");
  const spares = sum(rows, "spares");
  const opens = sum(rows, "openFrames");
  const gutters = sum(rows, "gutters");
  const highGame = best(rows, "highGame");
  const bestStrikeStreak = best(rows, "bestStrikeStreak");
  const bestRoll = best(rows, "bestRoll");
  const bulls = sum(rows, "bulls") + sum(rows, "dbulls");
  const doubles = sum(rows, "doubles");
  const triples = sum(rows, "triples");
  const frameOpportunities = Math.max(1, gamesPlayed * 10);
  const spareOpportunities = Math.max(1, frameOpportunities - strikes);
  const avgGame = gamesPlayed ? matches.reduce((total, { row }) => {
    const scores = Array.isArray(row?.gameScores) ? row.gameScores.map((v: any) => n(v)) : [];
    return total + scores.reduce((a: number, b: number) => a + b, 0);
  }, 0) / gamesPlayed : 0;

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques BOWLING.</div>;

  return <div style={{ padding: 16 }}>
    <div style={{ color: GOLD, fontSize: 14, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>🎳 BOWLING — Statistiques détaillées</div>
    <div style={{ marginTop: 4, color: "#aab0c1", fontSize: 11 }}>Scores de parties, strikes, spares, gutters, séries de strikes et efficacité des volées.</div>
    {!series ? <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", color: "#aab0c1" }}>Aucune partie BOWLING terminée pour ce profil.</div> : <>
      <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label="Séries" value={series} detail={`${wins} victoire${wins > 1 ? "s" : ""} · ${pct(wins, series)}`} />
        <Kpi label="Parties jouées" value={gamesPlayed} detail={`${gamesWon} gagnée${gamesWon > 1 ? "s" : ""}`} color={GOOD} />
        <Kpi label="High game" value={highGame} detail={highGame === 300 ? "PERFECT GAME" : "record personnel enregistré"} color={GOLD} />
        <Kpi label="Score moyen" value={avgGame ? avgGame.toFixed(1) : "—"} detail="moyenne par partie de 10 frames" color={CYAN} />
        <Kpi label="Strikes" value={strikes} detail={`${pct(strikes, frameOpportunities)} des frames`} color={GOLD} />
        <Kpi label="Spares" value={spares} detail={`${pct(spares, spareOpportunities)} des opportunités`} color={PINK} />
        <Kpi label="Open frames" value={opens} detail={`${pct(opens, frameOpportunities)} des frames`} />
        <Kpi label="Gutters" value={gutters} detail={`${pct(gutters, rolls)} des lancers`} color={BAD} />
        <Kpi label="Meilleure série X" value={bestStrikeStreak} detail="strikes consécutifs" color={GOLD} />
        <Kpi label="Quilles / lancer" value={rolls ? (pins / rolls).toFixed(2) : "0"} detail={`${pins} quilles · ${rolls} lancers`} color={CYAN} />
        <Kpi label="Meilleur lancer" value={`${bestRoll}/10`} detail={`${darts} fléchettes enregistrées`} />
        <Kpi label="Impacts spéciaux" value={bulls + doubles + triples} detail={`${bulls} BULL · ${doubles} D · ${triples} T`} color={GOOD} />
      </div>

      <section style={{ marginTop: 12, borderRadius: 17, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 11 }}>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 1000, textTransform: "uppercase", marginBottom: 7 }}>Parties récentes</div>
        <div style={{ display: "grid", gap: 6 }}>{matches.slice(0, 10).map(({ record, row }, i) => {
          const entityId = String(row?.teamId || playerId);
          const won = row?.win === true || winnerIds(record).includes(entityId);
          const date = playedAt(record) ? new Date(playedAt(record)).toLocaleDateString("fr-FR") : "—";
          const gameScores = Array.isArray(row?.gameScores) ? row.gameScores.map((v: any) => n(v)) : [];
          const bestGame = gameScores.length ? Math.max(...gameScores) : n(row?.highGame ?? row?.score);
          return <div key={record?.id || i} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: won ? "rgba(246,194,86,.07)" : "rgba(0,0,0,.20)", border: `1px solid ${won ? `${GOLD}55` : "rgba(255,255,255,.06)"}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: won ? GOLD : "rgba(255,255,255,.06)", color: won ? "#171008" : "#c4c8d5", fontWeight: 1000 }}>{won ? "WIN" : bestGame}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 11 }}>{date} · {txt(record?.summary?.series || "BOWLING")}</div><div style={{ color: "#9fa5b7", fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n(row?.strikes)} X · {n(row?.spares)} / · {n(row?.gutters)} gutters · {n(row?.pins)} quilles</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontWeight: 1000, fontSize: 17 }}>{bestGame}</div><div style={{ color: "#9298aa", fontSize: 8 }}>best game</div></div>
          </div>;
        })}</div>
      </section>
    </>}
  </div>;
}
