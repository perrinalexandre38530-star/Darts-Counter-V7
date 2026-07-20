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
    accent: "#ff4fb8",
    subtitle: "Objectifs battus, vies perdues et dernier joueur debout.",
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
      avatar: pick(merged.avatarDataUrl, merged.avatarUrl, merged.avatar),
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {r.avatar ? <img src={String(r.avatar)} alt="" style={{ width: 30, height: 30, borderRadius: 999, objectFit: "cover", border: `1px solid ${meta.accent}88` }} /> : null}
                <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#b8b8c6" }}>{meta.primary}: {r.primary} • {meta.secondary}: {r.secondary}</div>
                </div>
              </div>
              <div style={{ fontWeight: 1000, color: meta.accent }}>{r.isWinner ? "WIN" : r.tertiary}</div>
            </div>
          )) : <div style={{ color: "#c9c9d4" }}>Aucun joueur trouvé dans ce résumé.</div>}
        </div>
      </section>

      {mode === "five_lives" ? <FiveLivesSummaryTables rec={rec} rows={rows} accent={meta.accent} /> : mode === "scram" ? (
        <ScramSummaryTables rec={rec} rows={rows} accent={meta.accent} />
      ) : mode === "capital" ? (
        <CapitalSummaryTables rec={rec} rows={rows} accent={meta.accent} />
      ) : (
        <section style={card(meta.accent)}>
          <div style={sectionTitle(meta.accent)}>Stats détaillées</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: meta.accent, textAlign: "left" }}><th style={th}>Joueur</th><th style={th}>{meta.primary}</th><th style={th}>{meta.secondary}</th><th style={th}>{meta.tertiary}</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={`stat-${r.id}`}><td style={td}>{r.name}</td><td style={td}>{r.primary}</td><td style={td}>{r.secondary}</td><td style={td}>{r.tertiary}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function CapitalSummaryTables({ rec, rows, accent }: { rec: any; rows: any[]; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const visits = asArray(pick(summary?.visits, rec?.payload?.stats?.visits, rec?.payload?.visits, rec?.visits));
  const teams = asArray(pick(summary?.teams, rec?.payload?.stats?.teams, rec?.teams));
  const winnerTeamId = String(pick(summary?.winnerTeamId, rec?.winnerTeamId, rec?.payload?.winnerTeamId, ""));
  const contracts = asArray(pick(summary?.contracts, rec?.payload?.summary?.contracts, rec?.config?.contracts));
  const columns: Array<[string, (p: any) => any]> = [
    ["Joueur", (p) => pick(p.name, p.playerName, "Joueur")],
    ["Capital", (p) => num(pick(p.finalCapital, p.capital, p.score), 0)],
    ["Départ", (p) => num(p.startingCapital, 0)],
    ["Réussis", (p) => num(pick(p.successfulContracts, p.successfulVisits), 0)],
    ["Échecs", (p) => num(pick(p.failedContracts, p.failedVisits, p.fails), 0)],
    ["Réussite", (p) => `${num(p.successRate, 0).toFixed(1)}%`],
    ["Gagnés", (p) => num(pick(p.pointsWon, p.points), 0)],
    ["Perdus", (p) => num(pick(p.capitalLost, p.penaltyLost), 0)],
    ["AVG volée", (p) => num(pick(p.averageVisit, p.avgVisit), 0).toFixed(1)],
    ["Best", (p) => num(p.bestVisit, 0)],
    ["D", (p) => num(p.doubles, 0)], ["T", (p) => num(p.triples, 0)],
    ["Bull", (p) => num(p.bulls, 0)], ["DBull", (p) => num(p.dbulls, 0)],
  ];
  const dartLabel = (dart: any) => {
    const value = num(dart?.v, 0);
    const mult = num(dart?.mult, 1);
    if (!value) return "MISS";
    if (value === 25) return mult === 2 ? "DBULL" : "BULL";
    return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${value}`;
  };

  return <>
    {teams.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Classement des équipes</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {[...teams].sort((a, b) => num(b?.score, 0) - num(a?.score, 0)).map((team: any) => {
          const color = String(team?.color || accent);
          const winner = String(team?.id) === winnerTeamId;
          return <div key={String(team?.id)} style={{ padding: 12, borderRadius: 15, background: `${color}12`, border: `1px solid ${winner ? color : `${color}55`}` }}>
            <div style={{ color, fontSize: 11, fontWeight: 1000 }}>{winner ? "🏆 " : ""}{pick(team?.name, "Équipe")}</div>
            <div style={{ marginTop: 5, fontSize: 28, fontWeight: 1000 }}>{num(pick(team?.score, team?.capital), 0)}</div>
            <div style={{ fontSize: 10.5, color: "#aeb0bd" }}>{asArray(team?.members).length || asArray(team?.players).length} membre(s)</div>
          </div>;
        })}
      </div>
    </section> : null}

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Tableau CAPITAL complet</div>
      <div style={{ color: "#aeb0bd", fontSize: 11, marginBottom: 9 }}>{contracts.length || "—"} contrat(s) joué(s)</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1040, borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{columns.map(([label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={`capital-${row.id}`} style={{ background: row.isWinner ? `${accent}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ ...td, color: label === "Joueur" && row.isWinner ? accent : td.color }}>{read(row.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Historique des contrats</div>
      <div style={{ display: "grid", gap: 7 }}>
        {visits.length ? visits.map((visit: any, index: number) => {
          const player = rows.find((row) => String(row.id) === String(visit?.playerId));
          const success = Boolean(visit?.success);
          return <div key={visit?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: success ? "#72f0a8" : "#ff8aa6", fontWeight: 1000 }}>#{num(visit?.contractIndex, 0) + 1}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{player?.name || visit?.playerName || "Joueur"} • {String(visit?.contractId || "CAPITAL")}</div><div style={{ color: "#aeb0bd", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asArray(visit?.darts).map(dartLabel).join(" · ") || "—"} • {visit?.scoreBefore} → {visit?.scoreAfter}</div></div>
            <div style={{ color: success ? "#72f0a8" : "#ff8aa6", fontWeight: 1000 }}>{success ? `+${num(visit?.visitScore, 0)}` : `-${num(visit?.penaltyLost, 0)}`}</div>
          </div>;
        }) : <div style={{ color: "#c9c9d4" }}>Aucun détail de volée enregistré.</div>}
      </div>
    </section>
  </>;
}

function ScramSummaryTables({ rec, rows, accent }: { rec: any; rows: any[]; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const scoreA = num(pick(summary?.scoreA, rec?.payload?.state?.scores?.A, 0), 0);
  const scoreB = num(pick(summary?.scoreB, rec?.payload?.state?.scores?.B, 0), 0);
  const winnerTeam = String(pick(summary?.winnerTeam, rec?.winnerTeam, rec?.payload?.winnerTeam, "")).toUpperCase();
  const tied = Boolean(pick(summary?.tied, rec?.payload?.tied, scoreA === scoreB));
  const phaseRounds = pick(summary?.phaseRounds, rec?.payload?.state?.phaseRounds, {}) || {};
  const visits = asArray(pick(rec?.payload?.visits, rec?.payload?.visitHistory, rec?.visits));
  const teams = asArray(pick(summary?.teams, rec?.payload?.teams, rec?.game?.teams));
  const teamColor = (team: string) => team === "A" ? "#ff4ad1" : "#ffd76a";
  const teamMeta = (slot: string, index: number) => {
    const team = teams.find((item: any) => String(pick(item?.id, item?.slot, "")).toUpperCase() === slot) || teams[index] || {};
    return {
      name: String(pick(team?.name, `Team ${slot}`)),
      logo: pick(team?.logoDataUrl, team?.logoUrl, team?.avatarDataUrl, null),
    };
  };
  const columns: Array<[string, (p: any) => any]> = [
    ["Joueur", (p) => p.name], ["Team", (p) => pick(p.team, "—")], ["Points", (p) => num(pick(p.points, p.score), 0)],
    ["Marks", (p) => num(pick(p.totalMarks, p.marksTotal, p.marks), 0)], ["Ferm.", (p) => num(pick(p.closed, p.closes, p.closedNumbers), 0)],
    ["Darts", (p) => num(pick(p.dartsThrown, p.darts), 0)], ["Hit %", (p) => `${num(p.hitRate, 0).toFixed(1)}%`],
    ["MPR", (p) => num(p.mpr, 0).toFixed(2)], ["Best", (p) => num(p.bestVisit, 0)],
    ["S", (p) => num(p.singles, 0)], ["D", (p) => num(p.doubles, 0)], ["T", (p) => num(p.triples, 0)],
    ["Bull", (p) => num(p.bulls, 0)], ["DBull", (p) => num(p.dbulls, 0)], ["Miss", (p) => num(p.misses, 0)],
  ];

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Duel des équipes</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        {(["A", "B"] as const).map((team, index) => {
          const meta = teamMeta(team, index);
          return <React.Fragment key={team}>
          {index ? <div style={{ color: "#8c91a1", fontWeight: 1000 }}>—</div> : null}
          <div style={{ padding: 13, borderRadius: 15, textAlign: "center", border: `1px solid ${winnerTeam === team ? teamColor(team) : "rgba(255,255,255,.11)"}`, background: winnerTeam === team ? `${teamColor(team)}16` : "rgba(255,255,255,.035)", boxShadow: winnerTeam === team ? `0 0 18px ${teamColor(team)}25` : "none" }}>
            {meta.logo ? <img src={String(meta.logo)} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${teamColor(team)}`, marginBottom: 5 }} /> : null}
            <div style={{ color: teamColor(team), fontWeight: 1000, fontSize: 11 }}>TEAM {team}{winnerTeam === team ? " • WIN" : ""}</div>
            <div style={{ fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.name}</div>
            <div style={{ fontSize: 32, fontWeight: 1000, marginTop: 2 }}>{team === "A" ? scoreA : scoreB}</div>
          </div>
        </React.Fragment>;
        })}
      </div>
      <div style={{ marginTop: 10, color: "#b8bcc8", textAlign: "center", fontSize: 11.5 }}>
        {tied ? "Partie nulle" : `Vainqueur : ${winnerTeam ? teamMeta(winnerTeam, winnerTeam === "A" ? 0 : 1).name : "—"}`} • Phase 1 : {num(phaseRounds?.[1], 0)} rounds • Phase 2 : {num(phaseRounds?.[2], 0)} rounds
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Tableau complet de fin de partie</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1030, borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{columns.map(([label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={`scram-stat-${r.id}`} style={{ background: r.isWinner ? `${accent}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ ...td, color: label === "Team" ? teamColor(String(r.raw?.team || "")) : label === "Joueur" && r.isWinner ? accent : td.color }}>{read(r.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Déroulé des volées</div>
      <div style={{ display: "grid", gap: 7 }}>
        {visits.length ? visits.map((visit, index) => {
          const team = String(visit?.team || "").toUpperCase();
          const player = rows.find((row) => String(row.id) === String(visit?.playerId));
          return <div key={visit?.id || index} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: teamColor(team), fontWeight: 1000 }}>P{pick(visit?.phase, "—")}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000 }}>{player?.name || "Joueur"} <span style={{ color: teamColor(team), fontSize: 10 }}>TEAM {team}</span></div>
              <div style={{ color: "#aeb0bd", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Round {pick(visit?.round, "—")} • {visit?.role === "stopper" ? "Bloqueur" : "Scoreur"} • {asArray(visit?.labels).join(" · ") || "—"}</div>
            </div>
            <div style={{ color: num(visit?.points, 0) > 0 ? "#72f0a8" : accent, fontWeight: 1000 }}>{num(visit?.points, 0) > 0 ? `+${num(visit?.points, 0)} pts` : `+${num(visit?.marks, 0)} marks`}</div>
          </div>;
        }) : <div style={{ color: "#c9c9d4" }}>Aucun détail de volée enregistré.</div>}
      </div>
    </section>
  </>;
}

function FiveLivesSummaryTables({ rec, rows, accent }: { rec: any; rows: any[]; accent: string }) {
  const visits = asArray(pick(rec?.payload?.visitHistory, rec?.payload?.events, rec?.visitHistory, rec?.events));
  const columns: Array<[string, (p: any) => any]> = [
    ["#", (p) => p.rank], ["Joueur", (p) => p.name], ["Vies", (p) => pick(p.livesLeft, p.remainingLives, p.lives, 0)],
    ["Perdues", (p) => pick(p.livesLost, p.lostLives, 0)], ["Volées", (p) => pick(p.visits, p.turns, 0)],
    ["Objectifs", (p) => pick(p.targetsFaced, 0)], ["Réussite", (p) => `${num(p.successRate, 0)}%`],
    ["Moy.", (p) => num(p.avgVisit, 0).toFixed(1)], ["Best", (p) => pick(p.bestVisit, 0)],
    ["Échecs", (p) => pick(p.failedVisits, p.fails, 0)], ["Best marge", (p) => `+${num(p.bestMargin, 0)}`],
    ["S", (p) => pick(p.singles, 0)], ["D", (p) => pick(p.doubles, 0)], ["T", (p) => pick(p.triples, 0)],
    ["Bull", (p) => pick(p.bulls, 0)], ["DBull", (p) => pick(p.dbulls, 0)], ["Miss", (p) => pick(p.misses, 0)],
  ];
  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Tableau complet de fin de partie</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1020, borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{columns.map(([label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={`five-stat-${r.id}`} style={{ background: r.isWinner ? `${accent}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ ...td, color: label === "Joueur" && r.isWinner ? accent : td.color }}>{read(r.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Déroulé des volées</div>
      <div style={{ display: "grid", gap: 7 }}>
        {visits.length ? visits.map((v, index) => {
          const margin = v?.margin == null ? null : num(v.margin, 0);
          return <div key={v?.id || index} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: "#9295a5", fontWeight: 900 }}>#{pick(v?.turn, index + 1)}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{pick(v?.playerName, "Joueur")}</div><div style={{ color: "#aeb0bd", fontSize: 10.5 }}>{v?.openingVisit ? "Référence initiale" : `Objectif ${pick(v?.required, "—")} • ${v?.success ? `réussi +${Math.max(0, margin || 0)}` : `échoué ${margin ?? "—"}`}`}{v?.lifeLost ? " • −1 vie" : ""}</div></div>
            <div style={{ color: v?.success ? "#72f0a8" : "#ff7187", fontWeight: 1000, fontSize: 17 }}>{num(v?.score, 0)}</div>
          </div>;
        }) : <div style={{ color: "#c9c9d4" }}>Aucun détail de volée enregistré.</div>}
      </div>
    </section>
  </>;
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
