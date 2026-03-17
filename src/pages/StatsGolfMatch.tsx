import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";

const T = {
  gold: "#F6C256",
  goldSoft: "rgba(246,194,86,.16)",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  text55: "rgba(255,255,255,.55)",
  edge: "rgba(255,255,255,.10)",
  edgeSoft: "rgba(255,255,255,.06)",
  card: "linear-gradient(180deg,rgba(17,18,20,.96),rgba(13,14,17,.94))",
  bg: "radial-gradient(90% 120% at 50% -10%, #141517 0%, #0b0c0e 60%, #0b0c0e 100%)",
};

const PLAYER_COLORS = [
  "#F6C256",
  "#4FC3F7",
  "#FF6B6B",
  "#7CFF8A",
  "#C58BFF",
  "#FF9F40",
  "#2ED1B0",
  "#FF4FC3",
];

type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

type SavedMatch = {
  id: string;
  status?: "in_progress" | "finished" | string;
  kind?: string;
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;
  payload?: any;
};

type GolfRow = {
  playerId: string;
  name: string;
  avatarDataUrl?: string | null;
  color: string;
  rank: number;
  total: number;
  simple: number;
  double: number;
  triple: number;
  bull: number;
  dbull: number;
  miss: number;
  turns: number;
  strokes: number;
  avgPerTurn: number;
  hitRate: number;
  progressTotals: number[];
  progressRanks: number[];
};

const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toObj = <T,>(v: any): T => (v && typeof v === "object" ? (v as T) : ({} as T));
const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const fmtDate = (ts?: number) => new Date(N(ts, Date.now())).toLocaleString();
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

function playerColor(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

function initialFrom(name?: string) {
  const n = (name || "").trim();
  if (!n) return "P";
  const parts = n.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "P").toUpperCase();
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) {
      const n = Number(obj[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function findByPid(obj: any, pid: string) {
  const normId = (v: any) => String(v ?? "");
  if (!obj) return null;
  if (Array.isArray(obj)) {
    return obj.find((x: any) => [x?.id, x?.playerId, x?.profileId].map(normId).includes(pid)) || null;
  }
  if (typeof obj === "object") {
    if (obj[pid] != null) return obj[pid];
    const key = Object.keys(obj).find((k) => normId(k) === pid);
    return key ? obj[key] : null;
  }
  return null;
}

function normalizeHitValue(h: any): number {
  const direct = Number(h?.value ?? h?.score ?? h?.points ?? h ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const mult = Number(h?.mult ?? h?.multiplier ?? h?.ringValue ?? 0);
  const segment = Number(h?.segment ?? h?.target ?? h?.number ?? h?.base ?? 0);

  if (segment === 25 && mult === 2) return 50;
  if (segment === 25 && mult >= 1) return 25;
  if (segment > 0 && mult > 0) return segment * mult;
  return 0;
}

function classifyHit(v: number) {
  if (v === 50) return "dbull";
  if (v === 25) return "bull";
  if (v === 3) return "triple";
  if (v === 2) return "double";
  if (v === 1) return "simple";
  return "miss";
}

function collectRoundHitsForPlayer(round: any, pid: string): any[] {
  const direct =
    round?.hits?.[pid] ||
    round?.shots?.[pid] ||
    round?.throws?.[pid] ||
    round?.darts?.[pid];
  if (Array.isArray(direct)) return direct;

  const fromArray =
    (Array.isArray(round?.hits) && round.hits.filter((h: any) => String(h?.playerId ?? h?.id ?? "") === pid)) ||
    (Array.isArray(round?.shots) && round.shots.filter((h: any) => String(h?.playerId ?? h?.id ?? "") === pid)) ||
    (Array.isArray(round?.throws) && round.throws.filter((h: any) => String(h?.playerId ?? h?.id ?? "") === pid)) ||
    (Array.isArray(round?.darts) && round.darts.filter((h: any) => String(h?.playerId ?? h?.id ?? "") === pid));

  return Array.isArray(fromArray) ? fromArray : [];
}

function buildGolfViewModel(rec: SavedMatch) {
  const players = toArr<PlayerLite>(rec.players);
  const S = toObj<any>(rec.summary);
  const P = toObj<any>(rec.payload);
  const payloadSummary = toObj<any>(P?.summary);
  const state = toObj<any>(P?.state);

  const rankingsRaw =
    toArr<any>(S?.rankings).length ? toArr<any>(S?.rankings) :
    toArr<any>(payloadSummary?.rankings).length ? toArr<any>(payloadSummary?.rankings) :
    toArr<any>(P?.rankings).length ? toArr<any>(P?.rankings) :
    toArr<any>(state?.rankings);

  const rounds =
    toArr<any>(state?.rounds).length ? toArr<any>(state?.rounds) :
    toArr<any>(P?.rounds).length ? toArr<any>(P?.rounds) :
    toArr<any>(payloadSummary?.rounds).length ? toArr<any>(payloadSummary?.rounds) :
    toArr<any>(S?.rounds);

  const rows: GolfRow[] = players.map((p, idx) => {
    const pid = String(p.id);

    const per =
      findByPid(state?.statsByPlayer, pid) ||
      findByPid(S?.playerStats, pid) ||
      findByPid(S?.perPlayer, pid) ||
      findByPid(P?.playerStats, pid) ||
      findByPid(P?.statsByPlayer, pid) ||
      findByPid(payloadSummary?.playerStats, pid) ||
      findByPid(S?.players, pid) ||
      findByPid(payloadSummary?.players, pid) ||
      {};

    const ranking = rankingsRaw.find((x: any) =>
      [x?.id, x?.playerId, x?.profileId].map((v: any) => String(v ?? "")).includes(pid)
    ) || {};

    let simple = 0;
    let double = 0;
    let triple = 0;
    let bull = 0;
    let dbull = 0;
    let miss = 0;
    let turns = 0;
    let total = 0;
    let progressTotals: number[] = [];

    if (rounds.length) {
      for (const round of rounds) {
        const hits = collectRoundHitsForPlayer(round, pid);
        if (hits.length) {
          turns += 1;
          for (const h of hits) {
            const val = normalizeHitValue(h);
            total += val;
            const kind = classifyHit(val);
            if (kind === "simple") simple += 1;
            else if (kind === "double") double += 1;
            else if (kind === "triple") triple += 1;
            else if (kind === "bull") bull += 1;
            else if (kind === "dbull") dbull += 1;
            else miss += 1;
          }
          progressTotals.push(total);
        }
      }
    }

    if (!rounds.length || (simple + double + triple + bull + dbull + miss === 0 && total === 0)) {
      const src = per && Object.keys(per).length ? per : ranking;

      simple = pick(src, ["s", "simple", "singles", "par", "simpleHits"]);
      double = pick(src, ["d", "double", "doubles", "bogey", "doubleHits"]);
      triple = pick(src, ["t", "triple", "triples", "doubleBogey", "tripleHits"]);
      miss = pick(src, ["miss", "m", "misses"]);
      bull = pick(src, ["bull", "b", "birdie"]);
      dbull = pick(src, ["dbull", "dBull", "doubleBull", "db", "eagle"]);
      turns = pick(src, ["turns", "tours", "holes", "rounds"]);

      const storedTotal = pick(src, ["total", "score", "strokes", "points"]);
      total = storedTotal || simple * 1 + double * 2 + triple * 3 + bull * 25 + dbull * 50;
      if (!progressTotals.length && turns > 0) {
        const avg = total / turns;
        progressTotals = Array.from({ length: turns }, (_, i) => Math.round((avg * (i + 1)) * 10) / 10);
      }
    }

    const rank =
      Number(ranking?.rank ?? ranking?.place ?? ranking?.position ?? idx + 1) || idx + 1;

    const strokes = simple + double + triple + bull + dbull + miss;
    const hits = simple + double + triple + bull + dbull;

    return {
      playerId: pid,
      name: p.name || "Joueur",
      avatarDataUrl: p.avatarDataUrl || null,
      color: playerColor(idx),
      rank,
      total,
      simple,
      double,
      triple,
      bull,
      dbull,
      miss,
      turns,
      strokes,
      avgPerTurn: turns > 0 ? total / turns : 0,
      hitRate: pct(hits, strokes),
      progressTotals,
      progressRanks: [],
    };
  });

  const maxTurns = rows.reduce((m, r) => Math.max(m, r.progressTotals.length), 0);

  for (let t = 0; t < maxTurns; t++) {
    const standings = rows
      .map((r) => ({
        playerId: r.playerId,
        total: r.progressTotals[Math.min(t, Math.max(0, r.progressTotals.length - 1))] ?? 0,
      }))
      .sort((a, b) => a.total - b.total);

    standings.forEach((s, idx) => {
      const row = rows.find((r) => r.playerId === s.playerId);
      if (row) row.progressRanks[t] = idx + 1;
    });
  }

  const sortedByRank =
    rankingsRaw.length > 0
      ? [...rows].sort((a, b) => a.rank - b.rank)
      : [...rows].sort((a, b) => a.total - b.total);

  const totals = rows.reduce(
    (acc, r) => {
      acc.simple += r.simple;
      acc.double += r.double;
      acc.triple += r.triple;
      acc.bull += r.bull;
      acc.dbull += r.dbull;
      acc.miss += r.miss;
      acc.turns += r.turns;
      acc.strokes += r.strokes;
      acc.total += r.total;
      return acc;
    },
    { simple: 0, double: 0, triple: 0, bull: 0, dbull: 0, miss: 0, turns: 0, strokes: 0, total: 0 }
  );

  const winner = sortedByRank[0] || null;
  const bestBull = [...rows].sort((a, b) => (b.bull + b.dbull) - (a.bull + a.dbull))[0] || null;
  const bestHitRate = [...rows].sort((a, b) => b.hitRate - a.hitRate)[0] || null;
  const bestAvgTurn = [...rows].sort((a, b) => b.avgPerTurn - a.avgPerTurn)[0] || null;

  return {
    players,
    rows: sortedByRank,
    winner,
    bestBull,
    bestHitRate,
    bestAvgTurn,
    totals,
    maxTurns,
  };
}

const page: React.CSSProperties = {
  minHeight: "100dvh",
  paddingBottom: 96,
  color: T.text,
  background: T.bg,
};

const header: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  background: "rgba(10,10,12,.72)",
  backdropFilter: "blur(10px)",
  borderBottom: `1px solid ${T.edge}`,
};

const row: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 18,
  padding: 12,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  overflow: "hidden",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  color: T.gold,
  letterSpacing: 0.2,
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${T.edge}`,
  background: "rgba(255,255,255,.04)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${T.edge}`,
  background: "rgba(255,255,255,.06)",
  fontSize: 12,
};

function AvatarBadge({
  player,
  size = 40,
}: {
  player: { name: string; avatarDataUrl?: string | null; color: string };
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: `2px solid ${player.color}`,
        boxShadow: `0 0 0 2px rgba(0,0,0,.35), 0 0 14px ${player.color}44`,
        background: "rgba(255,255,255,.06)",
        flexShrink: 0,
      }}
    >
      {player.avatarDataUrl ? (
        <img
          src={player.avatarDataUrl}
          alt={player.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            color: "#fff",
            background: "linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02))",
          }}
        >
          {initialFrom(player.name)}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${accent || T.edge}`,
        background: "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))",
        borderRadius: 14,
        padding: 12,
        minHeight: 88,
      }}
    >
      <div style={{ color: T.text55, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: accent || T.text,
          lineHeight: 1.05,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      {sub ? <div style={{ marginTop: 8, fontSize: 12, color: T.text70, wordBreak: "break-word" }}>{sub}</div> : null}
    </div>
  );
}

function SegBar({ label, value, total }: { label: string; value: number; total: number }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
      <div style={{ color: T.text70, fontSize: 12 }}>{label}</div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,.08)",
          overflow: "hidden",
          border: `1px solid ${T.edgeSoft}`,
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, p))}%`,
            height: "100%",
            background: "linear-gradient(90deg, rgba(246,194,86,.95), rgba(246,194,86,.45))",
          }}
        />
      </div>
      <div style={{ textAlign: "right", fontWeight: 800, fontSize: 12 }}>{value}</div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: `1px solid ${T.edgeSoft}`,
      }}
    >
      <div style={{ color: T.text70, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{value}</div>
    </div>
  );
}

function RankSparkline({
  rows,
  maxTurns,
}: {
  rows: GolfRow[];
  maxTurns: number;
}) {
  const width = 720;
  const height = 240;
  const padL = 18;
  const padR = 24;
  const padT = 16;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const maxRank = Math.max(1, rows.length);

  const xFor = (i: number) =>
    padL + (maxTurns <= 1 ? innerW / 2 : (i / Math.max(1, maxTurns - 1)) * innerW);
  const yFor = (rank: number) =>
    padT + ((rank - 1) / Math.max(1, maxRank - 1 || 1)) * innerH;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ color: T.text70, fontSize: 12 }}>
        Fresque de classement au fil des trous / tours. Rang 1 en haut.
      </div>

      <div
        style={{
          border: `1px solid ${T.edge}`,
          borderRadius: 14,
          padding: 10,
          background: "rgba(255,255,255,.02)",
          overflowX: "auto",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", minWidth: 520, display: "block" }}
        >
          {[...Array(maxRank)].map((_, i) => {
            const rank = i + 1;
            const y = yFor(rank);
            return (
              <g key={rank}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padL}
                  y={y - 4}
                  fill="rgba(255,255,255,.45)"
                  fontSize="10"
                >
                  #{rank}
                </text>
              </g>
            );
          })}

          {[...Array(maxTurns)].map((_, i) => {
            const x = xFor(i);
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={padT}
                  y2={height - padB}
                  stroke="rgba(255,255,255,.05)"
                />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,.45)"
                  fontSize="10"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {rows.map((r) => {
            const pts = r.progressRanks
              .map((rank, i) => `${xFor(i)},${yFor(rank || r.rank)}`)
              .join(" ");

            const endX = xFor(Math.max(0, r.progressRanks.length - 1));
            const endY = yFor(r.progressRanks[Math.max(0, r.progressRanks.length - 1)] || r.rank);

            return (
              <g key={r.playerId}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={r.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {r.progressRanks.map((rank, i) => (
                  <circle
                    key={`${r.playerId}-${i}`}
                    cx={xFor(i)}
                    cy={yFor(rank || r.rank)}
                    r="3"
                    fill={r.color}
                  />
                ))}
                <circle cx={endX} cy={endY} r="6" fill={r.color} />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.playerId}
            style={{
              display: "grid",
              gridTemplateColumns: "46px minmax(0,1fr) auto",
              gap: 10,
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,.03)",
              border: `1px solid ${T.edge}`,
            }}
          >
            <AvatarBadge player={{ name: r.name, avatarDataUrl: r.avatarDataUrl, color: r.color }} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{r.name}</div>
              <div style={{ color: T.text70, fontSize: 12 }}>
                Rang final #{r.rank} · score {r.total}
              </div>
            </div>
            <div style={{ width: 32, height: 4, borderRadius: 999, background: r.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsGolfMatch({
  record,
  go,
}: {
  record: SavedMatch;
  go: (to: string, params?: any) => void;
}) {
  const vm = buildGolfViewModel(record);
  const isInProgress = (record.status || "").toLowerCase().includes("progress");
  const totalHits = vm.totals.simple + vm.totals.double + vm.totals.triple + vm.totals.bull + vm.totals.dbull;

  return (
    <div style={page}>
      <div style={header}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => go("history")}
            style={{ ...pill, background: T.gold, color: "#141517", fontWeight: 800 }}
          >
            ← Retour
          </button>
          <div style={{ marginLeft: "auto", opacity: 0.86, fontSize: 12 }}>
            GOLF — {fmtDate(record.updatedAt ?? record.createdAt)}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 12,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(0, 1fr)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <section style={row}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
            <div style={sectionTitle}>Vue générale</div>
            <div style={{ color: T.text70, fontSize: 12 }}>
              {isInProgress ? "Partie en cours" : "Partie terminée"}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
            <KpiCard
              label="Vainqueur"
              value={vm.winner ? vm.winner.name : "—"}
              sub={vm.winner ? `Score total ${vm.winner.total}` : "Aucun classement"}
              accent={T.gold}
            />
            <KpiCard
              label="Meilleur impact"
              value={vm.bestBull ? `${vm.bestBull.bull + vm.bestBull.dbull}` : "0"}
              sub={vm.bestBull ? `${vm.bestBull.name} · Bull + DBull` : "—"}
            />
            <KpiCard
              label="Précision"
              value={vm.bestHitRate ? `${fmt1(vm.bestHitRate.hitRate)}%` : "0.0%"}
              sub={vm.bestHitRate ? vm.bestHitRate.name : "—"}
            />
            <KpiCard
              label="Moyenne / tour"
              value={vm.bestAvgTurn ? fmt1(vm.bestAvgTurn.avgPerTurn) : "0.0"}
              sub={vm.bestAvgTurn ? vm.bestAvgTurn.name : "—"}
            />
          </div>
        </section>

        <section style={row}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
            <div style={sectionTitle}>Classement Golf</div>
            <div style={{ color: T.text70, fontSize: 12 }}>{vm.rows.length} joueur(s)</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {vm.rows.map((r) => (
              <div
                key={r.playerId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 44px minmax(0,1fr)",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${T.edge}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 28,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: r.rank === 1 ? T.goldSoft : "rgba(255,255,255,.06)",
                    color: r.rank === 1 ? T.gold : T.text70,
                    fontWeight: 900,
                  }}
                >
                  {r.rank}
                </div>

                <AvatarBadge player={{ name: r.name, avatarDataUrl: r.avatarDataUrl, color: r.color }} size={44} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 900, minWidth: 0, wordBreak: "break-word" }}>{r.name}</div>
                    <div style={{ fontWeight: 900, color: T.gold, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{r.total}</div>
                  </div>
                  <div style={{ color: T.text70, fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>
                    {r.turns} tours · {fmt1(r.hitRate)}% de réussite
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={row}>
          <div style={{ marginBottom: 10 }}>
            <div style={sectionTitle}>Courbe de classement</div>
          </div>
          <RankSparkline rows={vm.rows} maxTurns={vm.maxTurns} />
        </section>

        <section style={row}>
          <div style={{ marginBottom: 10 }}>
            <div style={sectionTitle}>Stats détaillées</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {vm.rows.map((r) => (
              <div
                key={r.playerId}
                style={{
                  border: `1px solid ${T.edge}`,
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255,255,255,.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <AvatarBadge player={{ name: r.name, avatarDataUrl: r.avatarDataUrl, color: r.color }} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{r.name}</div>
                    <div style={{ color: T.text70, fontSize: 12 }}>Rang #{r.rank}</div>
                  </div>
                </div>

                <StatLine label="Total" value={r.total} />
                <StatLine label="Tours" value={r.turns} />
                <StatLine label="Simple" value={r.simple} />
                <StatLine label="Double" value={r.double} />
                <StatLine label="Triple" value={r.triple} />
                <StatLine label="Bull" value={r.bull} />
                <StatLine label="DBull" value={r.dbull} />
                <StatLine label="Miss" value={r.miss} />
                <StatLine label="% Hit" value={`${fmt1(r.hitRate)}%`} />
              </div>
            ))}
          </div>
        </section>

        <section style={row}>
          <div style={{ marginBottom: 10 }}>
            <div style={sectionTitle}>Répartition des impacts</div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <SegBar label="Simple (Par)" value={vm.totals.simple} total={totalHits} />
            <SegBar label="Double (Bogey)" value={vm.totals.double} total={totalHits} />
            <SegBar label="Triple (Double Bogey)" value={vm.totals.triple} total={totalHits} />
            <SegBar label="BULL (Birdie)" value={vm.totals.bull} total={totalHits} />
            <SegBar label="DBULL (Eagle)" value={vm.totals.dbull} total={totalHits} />
            <SegBar label="Miss" value={vm.totals.miss} total={vm.totals.strokes} />
          </div>
        </section>

        <section style={row}>
          <div style={{ marginBottom: 10 }}>
            <div style={sectionTitle}>Résumé match</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
            <KpiCard label="Coups totaux" value={vm.totals.total} />
            <KpiCard label="Tours joués" value={vm.totals.turns} />
            <KpiCard label="Impacts réussis" value={totalHits} />
            <KpiCard label="Miss totaux" value={vm.totals.miss} />
          </div>
        </section>
      </div>
    </div>
  );
}