import * as React from "react";

type Props = {
  store?: any;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type ModeKind =
  | "battle_royale"
  | "warfare"
  | "five_lives"
  | "scram"
  | "capital"
  | "batard"
  | "territories"
  | "cricket_cut_throat"
  | "enculette_vache"
  | "unknown";

const MODE_META: Record<ModeKind, { title: string; accent: string; subtitle: string; primary: string; secondary: string; tertiary: string }> = {
  battle_royale: {
    title: "Battle Royale",
    accent: "#ff4d6d",
    subtitle: "Survie, éliminations et classement final.",
    primary: "Éliminations",
    secondary: "Vies restantes",
    tertiary: "Tours",
  },
  warfare: {
    title: "Warfare",
    accent: "#ffb000",
    subtitle: "Armées, soldats éliminés et friendly fire.",
    primary: "Kills",
    secondary: "Friendly fire",
    tertiary: "Flèches",
  },
  five_lives: {
    title: "Les 5 vies",
    accent: "#43d67f",
    subtitle: "Survie, vies perdues et dernier joueur debout.",
    primary: "Vies restantes",
    secondary: "Vies perdues",
    tertiary: "Tours",
  },
  scram: {
    title: "SCRAM",
    accent: "#65d4ff",
    subtitle: "Bloqueur, scoreur et points marqués.",
    primary: "Points",
    secondary: "Fermetures",
    tertiary: "Marks",
  },
  capital: {
    title: "Capital",
    accent: "#ffd166",
    subtitle: "Capital conservé, points gagnés et manches survivies.",
    primary: "Capital",
    secondary: "Points",
    tertiary: "Tours",
  },
  batard: {
    title: "Bâtard",
    accent: "#c77dff",
    subtitle: "Cibles imposées, réussites et pénalités.",
    primary: "Réussites",
    secondary: "Pénalités",
    tertiary: "Flèches",
  },
  territories: {
    title: "Territories",
    accent: "#7bd88f",
    subtitle: "Territoires capturés, domination et steals.",
    primary: "Captures",
    secondary: "Steals",
    tertiary: "Tours",
  },
  cricket_cut_throat: {
    title: "Cricket Cut-Throat",
    accent: "#7ee081",
    subtitle: "Variante Cricket : marks, points infligés et fermetures.",
    primary: "Marks",
    secondary: "Points infligés",
    tertiary: "MPR",
  },
  enculette_vache: {
    title: "Enculette / Vache",
    accent: "#7ee081",
    subtitle: "Variante Cricket : marks, pressions et fermetures.",
    primary: "Marks",
    secondary: "Points",
    tertiary: "MPR",
  },
  unknown: {
    title: "Résumé Darts",
    accent: "#ffbf3c",
    subtitle: "Résumé dédié au mode de jeu.",
    primary: "Score",
    secondary: "Actions",
    tertiary: "Flèches",
  },
};

const aliases: Array<[ModeKind, string[]]> = [
  ["battle_royale", ["battle_royale", "battleroyale", "battle", "royale"]],
  ["warfare", ["warfare"]],
  ["five_lives", ["five_lives", "fivelives", "5vies", "les5vies", "cinqvies"]],
  ["scram", ["scram"]],
  ["capital", ["capital"]],
  ["batard", ["batard", "bastard", "batard"]],
  ["territories", ["territories", "territoires", "departements", "departement"]],
  ["cricket_cut_throat", ["cricket_cut_throat", "cut_throat", "cutthroat", "cut-throat"]],
  ["enculette_vache", ["enculette", "vache", "enculette_vache"]],
];

function norm(v: any): string {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_\-]+/g, "")
    .trim();
}

function readMode(rec: any): ModeKind {
  const vals = [
    rec?.kind,
    rec?.mode,
    rec?.variant,
    rec?.game?.mode,
    rec?.summary?.mode,
    rec?.summary?.kind,
    rec?.summary?.game?.mode,
    rec?.payload?.kind,
    rec?.payload?.mode,
    rec?.payload?.variant,
    rec?.payload?.config?.mode,
    rec?.payload?.game?.mode,
    rec?.decoded?.kind,
    rec?.decoded?.mode,
    rec?.decoded?.config?.mode,
  ].map(norm).filter(Boolean);
  const joined = vals.join("|");
  for (const [key, list] of aliases) {
    if (list.some((a) => joined.includes(norm(a)))) return key;
  }
  return "unknown";
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pick(...vals: any[]) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.entries(v).map(([id, val]: any) => ({ id, ...(val || {}) }));
  return [];
}

function playerId(p: any): string {
  return String(p?.id ?? p?.playerId ?? p?.profileId ?? p?.uid ?? p?.name ?? "");
}

function playerName(p: any, playersById: Record<string, any>): string {
  const id = playerId(p);
  return String((p?.name ?? p?.displayName ?? p?.playerName ?? playersById[id]?.name ?? playersById[id]?.displayName ?? id) || "Joueur");
}

function collectPlayers(rec: any): any[] {
  const pools = [
    rec?.players,
    rec?.summary?.players,
    rec?.summary?.rankings,
    rec?.summary?.perPlayer,
    rec?.payload?.players,
    rec?.payload?.summary?.players,
    rec?.payload?.summary?.rankings,
    rec?.payload?.summary?.perPlayer,
    rec?.payload?.config?.players,
    rec?.payload?.finalPlayers,
  ];
  const byId = new Map<string, any>();
  for (const pool of pools) {
    for (const p of asArray(pool)) {
      const id = playerId(p);
      if (!id) continue;
      byId.set(id, { ...(byId.get(id) || {}), ...(p || {}), id });
    }
  }
  return [...byId.values()];
}

function collectPlayerStats(rec: any): Record<string, any> {
  const sources = [
    rec?.stats?.players,
    rec?.summary?.perPlayer,
    rec?.summary?.byPlayer,
    rec?.summary?.detailedByPlayer,
    rec?.payload?.stats?.players,
    rec?.payload?.summary?.perPlayer,
    rec?.payload?.summary?.byPlayer,
    rec?.payload?.summary?.detailedByPlayer,
    rec?.payload?.finalPlayers,
  ];
  const out: Record<string, any> = {};
  for (const src of sources) {
    for (const row of asArray(src)) {
      const id = playerId(row);
      if (!id) continue;
      out[id] = { ...(out[id] || {}), ...(row || {}), id };
    }
  }
  return out;
}

function valueFor(mode: ModeKind, key: "primary" | "secondary" | "tertiary", row: any, rank: number): number | string {
  if (mode === "battle_royale") {
    if (key === "primary") return num(pick(row.eliminations, row.kills, row.hits, row.score), 0);
    if (key === "secondary") return num(pick(row.lives, row.livesLeft, row.remainingLives), 0);
    return num(pick(row.rounds, row.roundsPlayed, row.turns), 0);
  }
  if (mode === "warfare") {
    if (key === "primary") return num(pick(row.kills, row.eliminations), 0);
    if (key === "secondary") return num(pick(row.friendlyKills, row.friendlyFire, row.teamKills), 0);
    return num(pick(row.darts, row.dartsThrown, row.totalThrows), 0);
  }
  if (mode === "five_lives") {
    if (key === "primary") return num(pick(row.lives, row.livesLeft, row.remainingLives), rank === 1 ? 1 : 0);
    if (key === "secondary") return num(pick(row.lostLives, row.damageTaken, row.deaths), 0);
    return num(pick(row.rounds, row.turns, row.visits), 0);
  }
  if (mode === "scram") {
    if (key === "primary") return num(pick(row.points, row.score), 0);
    if (key === "secondary") return num(pick(row.closed, row.closes, row.closedNumbers), 0);
    return num(pick(row.marks, row.totalMarks), 0);
  }
  if (mode === "capital") {
    if (key === "primary") return num(pick(row.capital, row.finalCapital, row.score), 0);
    if (key === "secondary") return num(pick(row.points, row.pointsWon, row.score), 0);
    return num(pick(row.rounds, row.turns), 0);
  }
  if (mode === "batard") {
    if (key === "primary") return num(pick(row.success, row.successes, row.hits), 0);
    if (key === "secondary") return num(pick(row.penalties, row.misses, row.fails), 0);
    return num(pick(row.darts, row.dartsThrown, row.totalThrows), 0);
  }
  if (mode === "territories") {
    if (key === "primary") return num(pick(row.captures, row.territories, row.owned), 0);
    if (key === "secondary") return num(pick(row.steals, row.stolen), 0);
    return num(pick(row.rounds, row.turns), 0);
  }
  if (mode === "cricket_cut_throat" || mode === "enculette_vache") {
    if (key === "primary") return num(pick(row.marks, row.totalMarks, row.hits), 0);
    if (key === "secondary") return num(pick(row.pointsGiven, row.points, row.score), 0);
    return Number(pick(row.mpr, row.MPR, 0)).toFixed(2);
  }
  if (key === "primary") return num(pick(row.score, row.points, row.kills, row.captures), 0);
  if (key === "secondary") return num(pick(row.actions, row.hits, row.marks), 0);
  return num(pick(row.darts, row.dartsThrown, row.turns), 0);
}

function buildRows(rec: any, mode: ModeKind) {
  const players = collectPlayers(rec);
  const playersById = Object.fromEntries(players.map((p) => [playerId(p), p]));
  const stats = collectPlayerStats(rec);
  const ranking = asArray(pick(rec?.summary?.rankings, rec?.payload?.summary?.rankings, rec?.rankings));
  const seed = ranking.length ? ranking : players;
  const rows = seed.map((p, index) => {
    const id = playerId(p);
    const merged = { ...(playersById[id] || {}), ...(stats[id] || {}), ...(p || {}), id };
    return {
      id,
      name: playerName(merged, playersById),
      rank: num(pick(merged.rank, merged.position, index + 1), index + 1),
      isWinner: Boolean(pick(merged.isWinner, merged.winner, id && String(pick(rec?.winnerId, rec?.summary?.winnerId, rec?.payload?.winnerId, rec?.payload?.summary?.winnerId)) === id)),
      primary: valueFor(mode, "primary", merged, index + 1),
      secondary: valueFor(mode, "secondary", merged, index + 1),
      tertiary: valueFor(mode, "tertiary", merged, index + 1),
      raw: merged,
    };
  });
  return rows.sort((a, b) => (a.isWinner === b.isWinner ? a.rank - b.rank : a.isWinner ? -1 : 1));
}

function readRec(params: any) {
  return params?.rec || params?.record || params?.match || params?.payload || null;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  padding: "14px 12px 90px",
  color: "#f7f7fb",
  background: "radial-gradient(circle at 50% 0%, rgba(255,190,60,.14), transparent 34%), #05060b",
};

export default function DartsModeSummaryPage({ go, params }: Props) {
  const rec = readRec(params) || {};
  const mode = readMode(rec);
  const meta = MODE_META[mode] || MODE_META.unknown;
  const rows = React.useMemo(() => buildRows(rec, mode), [rec, mode]);
  const winner = rows.find((r) => r.isWinner) || rows[0] || null;
  const date = pick(rec?.createdAt, rec?.updatedAt, rec?.summary?.createdAt, rec?.payload?.createdAt);
  const createdLabel = date ? new Date(Number(date) || date).toLocaleString("fr-FR") : "—";

  const totalDarts = rows.reduce((sum, r) => sum + num(pick(r.raw?.darts, r.raw?.dartsThrown, r.raw?.totalThrows), 0), 0);
  const totalActions = rows.reduce((sum, r) => sum + num(pick(r.raw?.kills, r.raw?.captures, r.raw?.marks, r.raw?.hits, r.raw?.points, r.raw?.score), 0), 0);

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <button onClick={() => go("stats", { tab: "history" })} style={pill(meta.accent, true)}>← Historique</button>
        <button onClick={() => go("games")} style={pill(meta.accent, false)}>Quitter</button>
      </div>

      <section style={card(meta.accent)}>
        <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.75 }}>RÉSUMÉ</div>
        <h1 style={{ margin: "4px 0 2px", color: meta.accent, fontSize: 28, lineHeight: 1, textTransform: "uppercase", textShadow: `0 0 16px ${meta.accent}66` }}>
          {meta.title}
        </h1>
        <div style={{ color: "#d7d7e0", fontSize: 12 }}>{createdLabel}</div>
        <p style={{ margin: "10px 0 0", color: "#c9c9d4", fontSize: 13, lineHeight: 1.35 }}>{meta.subtitle}</p>
      </section>

      <section style={card(meta.accent)}>
        <div style={sectionTitle(meta.accent)}>Vue générale</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Kpi label="Vainqueur" value={winner?.name || "—"} accent={meta.accent} />
          <Kpi label="Joueurs" value={rows.length || "—"} accent={meta.accent} />
          <Kpi label="Total flèches" value={totalDarts || "—"} accent={meta.accent} />
          <Kpi label="Total actions" value={totalActions || "—"} accent={meta.accent} />
        </div>
      </section>

      <section style={card(meta.accent)}>
        <div style={sectionTitle(meta.accent)}>Classement</div>
        <div style={{ display: "grid", gap: 8 }}>
          {rows.length ? rows.map((r, i) => (
            <div key={`${r.id}-${i}`} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, background: r.isWinner ? `${meta.accent}20` : "rgba(255,255,255,.045)", border: `1px solid ${r.isWinner ? meta.accent : "rgba(255,255,255,.10)"}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: r.isWinner ? meta.accent : "rgba(255,255,255,.08)", color: r.isWinner ? "#05060b" : "#fff", fontWeight: 1000 }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 1000 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#b8b8c6" }}>{meta.primary}: {r.primary} • {meta.secondary}: {r.secondary}</div>
              </div>
              <div style={{ fontWeight: 1000, color: meta.accent }}>{r.isWinner ? "WIN" : r.tertiary}</div>
            </div>
          )) : <div style={{ color: "#c9c9d4" }}>Aucun joueur trouvé dans ce résumé.</div>}
        </div>
      </section>

      <section style={card(meta.accent)}>
        <div style={sectionTitle(meta.accent)}>Stats détaillées</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: meta.accent, textAlign: "left" }}>
                <th style={th}>Joueur</th>
                <th style={th}>{meta.primary}</th>
                <th style={th}>{meta.secondary}</th>
                <th style={th}>{meta.tertiary}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`stat-${r.id}`}>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.primary}</td>
                  <td style={td}>{r.secondary}</td>
                  <td style={td}>{r.tertiary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.045)" }}>
      <div style={{ color: "#aeb0bc", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: accent, fontSize: 18, fontWeight: 1000, marginTop: 4 }}>{String(value)}</div>
    </div>
  );
}

function card(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${accent}44`,
    background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025))",
    boxShadow: `0 16px 40px rgba(0,0,0,.42), 0 0 22px ${accent}14`,
    padding: 14,
    marginBottom: 12,
  };
}

function pill(accent: string, fill: boolean): React.CSSProperties {
  return {
    border: `1px solid ${accent}77`,
    background: fill ? accent : "rgba(255,255,255,.04)",
    color: fill ? "#05060b" : "#fff",
    borderRadius: 999,
    padding: "9px 12px",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function sectionTitle(accent: string): React.CSSProperties {
  return { display: "inline-block", color: accent, fontWeight: 1000, fontSize: 15, marginBottom: 10, padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)" };
}

const th: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,.12)" };
const td: React.CSSProperties = { padding: "9px 6px", borderBottom: "1px solid rgba(255,255,255,.07)", color: "#f4f4f8", fontWeight: 800 };
