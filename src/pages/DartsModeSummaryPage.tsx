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
  | "bobs_27"
  | "shooter"
  | "prisoner"
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
  bobs_27: {
    title: "BOB’S 27",
    accent: "#e4c06b",
    subtitle: "Doubles D1 à D20 puis DBULL : précision, sanctions 0/3 et score final.",
    primary: "Score final",
    secondary: "Précision",
    tertiary: "Doubles",
  },
  shooter: {
    title: "SHOOTER",
    accent: "#42d6ff",
    subtitle: "Course de précision sur une séquence de cibles : progression, marks, score et pénalités.",
    primary: "Cibles",
    secondary: "Précision",
    tertiary: "Marks",
  },
  prisoner: {
    title: "PRISONER",
    accent: "#e4c06b",
    subtitle: "Course autour du cadran : progression, fléchettes prisonnières, captures et possession de fléchettes.",
    primary: "Progression",
    secondary: "Captures",
    tertiary: "Fléchettes",
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
  ["bobs_27", ["bobs_27", "bobs27", "bob27", "bob's27", "bobs27"]],
  ["shooter", ["shooter"]],
  ["prisoner", ["prisoner"]],
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
  if (mode === "bobs_27") {
    if (key === "primary") return num(pick(row.finalScore, row.score, row.points), 0);
    if (key === "secondary") {
      const darts = num(pick(row.dartsThrown, row.darts), 0);
      const hits = num(pick(row.targetHits, row.validDoubles, row.validHits), 0);
      const accuracy = num(pick(row.doubleAccuracy), darts > 0 ? (hits / darts) * 100 : 0);
      return `${Math.round(accuracy * 10) / 10}%`;
    }
    return num(pick(row.targetHits, row.validDoubles, row.validHits), 0);
  }
  if (mode === "shooter") {
    if (key === "primary") {
      const cleared = num(pick(row.targetsCleared, row.progressTargetIndex), 0);
      const total = num(pick(row.sequenceLength, row.totalTargets), 0);
      return total > 0 ? `${cleared}/${total}` : cleared;
    }
    if (key === "secondary") {
      const darts = num(pick(row.darts, row.dartsThrown), 0);
      const hits = num(pick(row.validDarts, row.validHits, row.targetHits), 0);
      const accuracy = num(row.accuracy, darts > 0 ? (hits / darts) * 100 : 0);
      return `${Math.round(accuracy * 10) / 10}%`;
    }
    return num(pick(row.marks, row.marksApplied), 0);
  }
  if (mode === "prisoner") {
    if (key === "primary") return `${num(pick(row.progress, row.targetsCompleted, row.progressHits), 0)}/20`;
    if (key === "secondary") return num(pick(row.captures, row.opponentCaptures), 0);
    return num(pick(row.finalDartsOwned, row.dartsOwned, row.availableDarts), 0);
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
  const bobsSummary = mode === "bobs_27" ? (pick(rec?.summary, rec?.payload?.summary, {}) || {}) : {};
  const bobsMatchStats = mode === "bobs_27" ? (pick(bobsSummary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {}) : {};
  const shooterSummary = mode === "shooter" ? (pick(rec?.summary, rec?.payload?.summary, {}) || {}) : {};
  const shooterMatchStats = mode === "shooter" ? (pick(shooterSummary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {}) : {};
  const prisonerSummary = mode === "prisoner" ? (pick(rec?.summary, rec?.payload?.summary, {}) || {}) : {};
  const prisonerMatchStats = mode === "prisoner" ? (pick(prisonerSummary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {}) : {};
  const capitalSummary = mode === "capital" ? (pick(rec?.summary, rec?.payload?.summary, {}) || {}) : {};
  const capitalMatchStats = mode === "capital" ? (pick(capitalSummary?.matchStats, capitalSummary?.stats, rec?.payload?.stats?.match, {}) || {}) : {};
  const winnerLabel = mode === "capital" && capitalSummary?.winnerTeamName ? String(capitalSummary.winnerTeamName) : (winner?.name || "—");
  const date = pick(rec?.createdAt, rec?.updatedAt, rec?.summary?.createdAt, rec?.payload?.createdAt);
  const createdLabel = date ? new Date(Number(date) || date).toLocaleString("fr-FR") : "—";

  const totalDarts = mode === "bobs_27"
    ? num(bobsMatchStats?.totalDarts, rows.reduce((sum, r) => sum + num(pick(r.raw?.darts, r.raw?.dartsThrown, r.raw?.totalThrows), 0), 0))
    : mode === "shooter"
      ? num(shooterMatchStats?.totalDarts, rows.reduce((sum, r) => sum + num(pick(r.raw?.darts, r.raw?.dartsThrown, r.raw?.totalThrows), 0), 0))
      : mode === "prisoner"
        ? num(prisonerMatchStats?.totalDarts, rows.reduce((sum, r) => sum + num(pick(r.raw?.darts, r.raw?.dartsThrown, r.raw?.totalThrows), 0), 0))
        : rows.reduce((sum, r) => sum + num(pick(r.raw?.darts, r.raw?.dartsThrown, r.raw?.totalThrows), 0), 0);
  const totalActions = mode === "capital"
    ? num(capitalMatchStats?.contractsPlayed, rows.reduce((sum, r) => sum + num(r.raw?.contractsPlayed, 0), 0))
    : mode === "bobs_27"
      ? num(bobsMatchStats?.totalHits, rows.reduce((sum, r) => sum + num(pick(r.raw?.targetHits, r.raw?.validDoubles, r.raw?.validHits), 0), 0))
      : mode === "shooter"
        ? num(shooterMatchStats?.totalMarks, rows.reduce((sum, r) => sum + num(pick(r.raw?.marks, r.raw?.marksApplied), 0), 0))
        : mode === "prisoner"
          ? num(prisonerMatchStats?.totalCaptures, rows.reduce((sum, r) => sum + num(r.raw?.captures, 0), 0))
          : rows.reduce((sum, r) => sum + num(pick(r.raw?.kills, r.raw?.captures, r.raw?.marks, r.raw?.hits, r.raw?.points, r.raw?.score), 0), 0);

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
          <Kpi label="Vainqueur" value={winnerLabel} accent={meta.accent} />
          <Kpi label="Joueurs" value={rows.length || "—"} accent={meta.accent} />
          <Kpi label="Total flèches" value={totalDarts || "—"} accent={meta.accent} />
          <Kpi label={mode === "capital" ? "Contrats tentés" : mode === "bobs_27" ? "Doubles réussis" : mode === "shooter" ? "Marks" : mode === "prisoner" ? "Captures" : "Total actions"} value={totalActions || "—"} accent={meta.accent} />
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
      ) : mode === "bobs_27" ? (
        <Bobs27SummaryTables rec={rec} accent={meta.accent} />
      ) : mode === "shooter" ? (
        <ShooterSummaryTables rec={rec} accent={meta.accent} />
      ) : mode === "prisoner" ? (
        <PrisonerSummaryTables rec={rec} accent={meta.accent} />
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

function ShooterSummaryTables({ rec, accent }: { rec: any; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const matchStats = pick(summary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {};
  const players = asArray(pick(rec?.payload?.stats?.players, summary?.players, summary?.perPlayer, rec?.payload?.players, rec?.players));
  const standings = asArray(pick(summary?.standings, summary?.rankings, rec?.payload?.state?.standings));
  const teams = asArray(pick(summary?.teams, rec?.payload?.teams, rec?.teams));
  const sequence = asArray(pick(summary?.targetSequence, rec?.payload?.state?.sequence)).map((v: any) => num(typeof v === "object" ? pick(v?.value, v?.target) : v, 0)).filter((v) => v > 0);
  const totalDarts = num(matchStats?.totalDarts, players.reduce((sum, p) => sum + num(p?.darts ?? p?.dartsThrown), 0));
  const totalHits = num(matchStats?.totalHits, players.reduce((sum, p) => sum + num(p?.validDarts ?? p?.validHits ?? p?.targetHits), 0));
  const accuracy = num(matchStats?.accuracy, totalDarts ? (totalHits / totalDarts) * 100 : 0);
  const duration = num(pick(matchStats?.durationMs, summary?.durationMs, summary?.duration), 0);
  const fmtDuration = (ms: number) => { const sec = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const targetLabel = (target: number) => target === 25 ? "BULL" : String(target);

  const targetAgg = new Map<number, { darts: number; hits: number; marks: number; points: number }>();
  for (const target of sequence) targetAgg.set(target, { darts: 0, hits: 0, marks: 0, points: 0 });
  for (const player of players) {
    const targetStats: any = pick(player?.targetStats, player?.rawStats?.targets, {});
    if (!targetStats || typeof targetStats !== "object") continue;
    for (const [key, raw] of Object.entries(targetStats)) {
      const target = num(key, 0); if (!target) continue;
      const stat: any = raw || {}; const cur = targetAgg.get(target) || { darts: 0, hits: 0, marks: 0, points: 0 };
      cur.darts += num(stat?.darts); cur.hits += num(pick(stat?.validDarts, stat?.hits), 0); cur.marks += num(stat?.marks); cur.points += num(stat?.points);
      targetAgg.set(target, cur);
    }
  }
  const targetRows = [...targetAgg.entries()].map(([target, stat]) => ({ target, ...stat, accuracy: stat.darts ? (stat.hits / stat.darts) * 100 : 0 }));

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Performance SHOOTER</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Kpi label="Parcours" value={`${sequence.length || num(matchStats?.sequenceLength, 0)} cibles`} accent={accent} />
        <Kpi label="Marks / cible" value={num(pick(summary?.marksToClear, rec?.payload?.rules?.marksToClear), 0) || "—"} accent={accent} />
        <Kpi label="Précision" value={`${Math.round(accuracy * 10) / 10}%`} accent={accent} />
        <Kpi label="Touches" value={`${totalHits}/${totalDarts}`} accent={accent} />
        <Kpi label="Marks" value={num(matchStats?.totalMarks, players.reduce((sum, p) => sum + num(p?.marks), 0))} accent={accent} />
        <Kpi label="Points" value={num(matchStats?.totalPoints, players.reduce((sum, p) => sum + num(p?.pointsWon ?? p?.points), 0))} accent={accent} />
        <Kpi label="3/3 parfaits" value={num(matchStats?.perfectVisits, players.reduce((sum, p) => sum + num(p?.perfectVisits), 0))} accent={accent} />
        <Kpi label="Pénalités" value={num(matchStats?.penaltyEvents, players.reduce((sum, p) => sum + num(p?.penaltyEvents), 0))} accent={accent} />
        <Kpi label="Rounds" value={num(pick(matchStats?.roundsPlayed, summary?.roundsPlayed), 0)} accent={accent} />
        <Kpi label="Durée" value={duration ? fmtDuration(duration) : "—"} accent={accent} />
      </div>
    </section>

    {String(summary?.participantMode || rec?.payload?.config?.participantMode) === "teams" && standings.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Classement équipes</div>
      <div style={{ display: "grid", gap: 7 }}>
        {standings.map((row: any, index: number) => { const team = teams.find((t: any) => String(t?.id) === String(row?.id)); return <div key={String(row?.id || index)} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: index === 0 ? `${accent}18` : "rgba(255,255,255,.04)", border: `1px solid ${index === 0 ? accent : "rgba(255,255,255,.09)"}` }}><div style={{ color: index === 0 ? accent : "#d7d9e3", fontWeight: 1000 }}>#{num(row?.rank, index + 1)}</div><div><div style={{ fontWeight: 1000 }}>{String(row?.name || team?.name || `Équipe ${index + 1}`)}</div><div style={{ color: "#9da2b4", fontSize: 10.5 }}>{num(row?.targetsCleared, 0)}/{sequence.length || "?"} cibles • {num(row?.marksOnTarget, 0)} marks en cours</div></div><div style={{ color: accent, fontWeight: 1000, fontSize: 18 }}>{num(row?.score, 0)} pts</div></div>; })}
      </div>
    </section> : null}

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Statistiques joueurs</div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead><tr style={{ color: accent, textAlign: "left" }}>{["Joueur","Rang","Cibles","Préc.","Marks","Points","0/3","1/3","2/3","3/3","Best marks","Best pts","Série","Flèches"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{players.slice().sort((a: any,b: any) => num(a?.rank,99)-num(b?.rank,99)).map((p: any, index: number) => { const darts=num(p?.darts ?? p?.dartsThrown); const hits=num(p?.validDarts ?? p?.validHits ?? p?.targetHits); const acc=num(p?.accuracy,darts?(hits/darts)*100:0); return <tr key={String(p?.id || index)}><td style={td}>{String(p?.name || p?.playerName || `Joueur ${index+1}`)}</td><td style={td}>{num(p?.rank,index+1)}</td><td style={td}>{num(p?.targetsCleared ?? p?.progressTargetIndex)}/{sequence.length || "?"}</td><td style={td}>{Math.round(acc*10)/10}%</td><td style={td}>{num(p?.marks)}</td><td style={td}>{num(p?.pointsWon ?? p?.points)}</td><td style={td}>{num(p?.failedVisits)}</td><td style={td}>{num(p?.oneHitVisits)}</td><td style={td}>{num(p?.twoHitVisits)}</td><td style={td}>{num(p?.threeHitVisits ?? p?.perfectVisits)}</td><td style={td}>{num(p?.bestVisitMarks)}</td><td style={td}>{num(p?.bestVisitPoints)}</td><td style={td}>{num(p?.bestHitStreak)}</td><td style={td}>{darts}</td></tr>; })}</tbody>
      </table></div>
    </section>

    {targetRows.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Détail par cible</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 7 }}>
        {targetRows.map((row) => <div key={row.target} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.09)", textAlign: "center" }}><div style={{ color: "#b7bbc8", fontSize: 10, fontWeight: 900 }}>{targetLabel(row.target)}</div><div style={{ color: accent, fontSize: 18, fontWeight: 1000, marginTop: 2 }}>{row.hits}/{row.darts}</div><div style={{ color: "#dfe2ea", fontSize: 10 }}>{Math.round(row.accuracy*10)/10}%</div><div style={{ color: "#858b9d", fontSize: 9, marginTop: 2 }}>{row.marks} marks • {row.points} pts</div></div>)}
      </div>
    </section> : null}
  </>;
}

function Bobs27SummaryTables({ rec, accent }: { rec: any; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const matchStats = pick(summary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {};
  const playerPools = [rec?.payload?.stats?.players, rec?.payload?.summary?.players, rec?.payload?.players, summary?.players, summary?.perPlayer, rec?.players];
  const byId = new Map<string, any>();
  for (const pool of playerPools) {
    for (const row of asArray(pool)) {
      const id = playerId(row);
      if (!id) continue;
      byId.set(id, { ...(byId.get(id) || {}), ...(row || {}), id });
    }
  }
  const players = [...byId.values()].sort((a, b) => num(a?.rank, 999) - num(b?.rank, 999) || num(b?.finalScore ?? b?.score, 0) - num(a?.finalScore ?? a?.score, 0));
  const standings = asArray(pick(summary?.standings, summary?.rankings, rec?.payload?.state?.standings));
  const participantMode = String(pick(summary?.participantMode, rec?.payload?.config?.participantMode, "players"));
  const teams = asArray(pick(summary?.teams, rec?.payload?.teams, rec?.teams));
  const targetSequence = asArray(pick(summary?.targetSequence, rec?.payload?.state?.targets)).map((v: any) => typeof v === "object" ? num(v?.value ?? v?.target, 0) : num(v, 0)).filter(Boolean);
  const targetAgg: Record<string, any> = {};
  for (const player of players) {
    const targetStats = pick(player?.targetStats, player?.rawStats?.targets, {});
    if (!targetStats || typeof targetStats !== "object") continue;
    for (const [key, raw] of Object.entries(targetStats)) {
      const stat: any = raw || {};
      const cur = targetAgg[key] || { darts: 0, hits: 0, attempts: 0, pointsWon: 0, penaltyLost: 0, bestHits: 0 };
      cur.darts += num(stat?.darts); cur.hits += num(stat?.hits); cur.attempts += num(stat?.attempts);
      cur.pointsWon += num(stat?.pointsWon); cur.penaltyLost += num(stat?.penaltyLost); cur.bestHits = Math.max(cur.bestHits, num(stat?.bestHits));
      targetAgg[key] = cur;
    }
  }
  const targetRows = Object.entries(targetAgg).map(([key, stat]: any) => ({ key, ...stat, accuracy: stat.darts > 0 ? (stat.hits / stat.darts) * 100 : 0 })).sort((a: any, b: any) => (a.key === "25" ? 25 : num(a.key)) - (b.key === "25" ? 25 : num(b.key)));
  const totalDarts = num(matchStats?.totalDarts, players.reduce((a, p) => a + num(p?.dartsThrown ?? p?.darts), 0));
  const totalHits = num(matchStats?.totalHits, players.reduce((a, p) => a + num(p?.targetHits ?? p?.validDoubles), 0));
  const accuracy = num(matchStats?.doubleAccuracy, totalDarts > 0 ? (totalHits / totalDarts) * 100 : 0);
  const perfect = num(matchStats?.perfectVisits, players.reduce((a, p) => a + num(p?.perfectVisits), 0));
  const won = num(matchStats?.totalPointsWon, players.reduce((a, p) => a + num(p?.pointsWon), 0));
  const lost = num(matchStats?.totalPointsLost, players.reduce((a, p) => a + num(p?.pointsLost), 0));
  const duration = num(pick(matchStats?.durationMs, summary?.durationMs, summary?.duration), 0);
  const fmtDuration = (ms: number) => { const sec = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const targetLabel = (key: string) => String(key) === "25" ? "DBULL" : `D${key}`;

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Performance du match</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Kpi label="Score de départ" value={num(summary?.startingScore ?? rec?.payload?.config?.startingScore, 27)} accent={accent} />
        <Kpi label="Parcours" value={`${targetSequence.length || num(matchStats?.targets, 21)} cibles`} accent={accent} />
        <Kpi label="Précision double" value={`${Math.round(accuracy * 10) / 10}%`} accent={accent} />
        <Kpi label="Doubles réussis" value={`${totalHits}/${totalDarts}`} accent={accent} />
        <Kpi label="Perfect 3/3" value={perfect} accent={accent} />
        <Kpi label="Points +/-" value={`+${won} / -${lost}`} accent={accent} />
        <Kpi label="Durée" value={duration ? fmtDuration(duration) : "—"} accent={accent} />
        <Kpi label="Règle sous 0" value={String(rec?.payload?.config?.negativeRule || rec?.payload?.rules?.negativeRule || "eliminate") === "continue" ? "Continuer" : "Élimination"} accent={accent} />
      </div>
    </section>

    {participantMode === "teams" && standings.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Classement équipes</div>
      <div style={{ display: "grid", gap: 7 }}>
        {standings.map((row: any, index: number) => {
          const meta = teams.find((team: any) => String(team?.id) === String(row?.id));
          return <div key={String(row?.id || index)} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: index === 0 ? `${accent}18` : "rgba(255,255,255,.04)", border: `1px solid ${index === 0 ? accent : "rgba(255,255,255,.09)"}` }}>
            <div style={{ color: index === 0 ? accent : "#d7d9e3", fontWeight: 1000 }}>#{num(row?.rank, index + 1)}</div>
            <div><div style={{ fontWeight: 1000 }}>{String(row?.name || meta?.name || `Équipe ${index + 1}`)}</div><div style={{ color: "#9da2b4", fontSize: 10.5 }}>{asArray(meta?.playerIds || meta?.players).length || num(row?.members, 0)} joueur(s) • {num(row?.hits, 0)} hits</div></div>
            <div style={{ color: accent, fontWeight: 1000, fontSize: 18 }}>{num(row?.score, 0)}</div>
          </div>;
        })}
      </div>
    </section> : null}

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Statistiques joueurs</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead><tr style={{ color: accent, textAlign: "left" }}><th style={th}>Joueur</th><th style={th}>Score</th><th style={th}>Hits</th><th style={th}>Préc.</th><th style={th}>0/3</th><th style={th}>3/3</th><th style={th}>+ / -</th><th style={th}>Best</th><th style={th}>Série</th><th style={th}>Dernière cible</th></tr></thead>
          <tbody>{players.map((p: any, index: number) => {
            const darts = num(p?.dartsThrown ?? p?.darts); const hits = num(p?.targetHits ?? p?.validDoubles ?? p?.validHits); const pAcc = num(p?.doubleAccuracy, darts ? (hits / darts) * 100 : 0);
            return <tr key={String(p?.id || index)}><td style={td}>{String(p?.name || p?.playerName || `Joueur ${index + 1}`)}{p?.eliminated ? " • ÉLIM." : ""}</td><td style={td}>{num(p?.finalScore ?? p?.score)}</td><td style={td}>{hits}/{darts}</td><td style={td}>{Math.round(pAcc * 10) / 10}%</td><td style={td}>{num(p?.failedVisits ?? p?.penaltyEvents)}</td><td style={td}>{num(p?.perfectVisits ?? p?.threeHitVisits)}</td><td style={td}>+{num(p?.pointsWon)} / -{num(p?.pointsLost)}</td><td style={td}>{num(p?.bestVisit)} ({num(p?.bestVisitHits)}/3)</td><td style={td}>{num(p?.bestSuccessStreak)}</td><td style={td}>{num(p?.lastTargetReached) === 25 ? "DBULL" : `D${num(p?.lastTargetReached)}`}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    {targetRows.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Détail D1 → DBULL</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 7 }}>
        {targetRows.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.09)", textAlign: "center" }}><div style={{ color: "#b7bbc8", fontSize: 10, fontWeight: 900 }}>{targetLabel(row.key)}</div><div style={{ color: accent, fontSize: 18, fontWeight: 1000, marginTop: 2 }}>{row.hits}/{row.darts}</div><div style={{ color: "#dfe2ea", fontSize: 10 }}>{Math.round(row.accuracy * 10) / 10}%</div><div style={{ color: "#858b9d", fontSize: 9, marginTop: 2 }}>+{row.pointsWon} / -{row.penaltyLost}</div></div>)}
      </div>
    </section> : null}
  </>;
}

function PrisonerSummaryTables({ rec, accent }: { rec: any; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const matchStats = pick(summary?.matchStats, rec?.payload?.stats?.match, rec?.payload?.stats?.global, {}) || {};
  const playerPools = [rec?.payload?.stats?.players, rec?.payload?.summary?.players, summary?.players, summary?.perPlayer, rec?.payload?.players, rec?.players];
  const byId = new Map<string, any>();
  for (const pool of playerPools) {
    for (const row of asArray(pool)) {
      const id = playerId(row);
      if (!id) continue;
      byId.set(id, { ...(byId.get(id) || {}), ...(row || {}), id });
    }
  }
  const players = [...byId.values()].sort((a, b) => num(a?.rank, 999) - num(b?.rank, 999) || num(b?.progress, 0) - num(a?.progress, 0));
  const standings = asArray(pick(summary?.standings, summary?.rankings, rec?.payload?.state?.standings));
  const sequence = asArray(pick(summary?.sequence, rec?.payload?.state?.sequence));
  const totalDarts = num(matchStats?.totalDarts, players.reduce((a, p) => a + num(p?.dartsThrown ?? p?.darts), 0));
  const totalCaptures = num(matchStats?.totalCaptures, players.reduce((a, p) => a + num(p?.captures), 0));
  const totalPrisoners = num(matchStats?.totalPrisonersCreated, players.reduce((a, p) => a + num(p?.prisonersCreated), 0));
  const totalProgress = num(matchStats?.totalProgress, players.reduce((a, p) => a + num(p?.progressHits), 0));
  const totalMisses = num(matchStats?.totalMisses, players.reduce((a, p) => a + num(p?.offboardMisses ?? p?.misses), 0));
  const accuracy = num(matchStats?.progressAccuracy, totalDarts ? (totalProgress / totalDarts) * 100 : 0);
  const duration = num(pick(matchStats?.durationMs, summary?.durationMs, summary?.duration), 0);
  const fmtDuration = (ms: number) => { const sec = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const targetAgg: Record<string, any> = {};
  for (const player of players) {
    const source = pick(player?.targetStats, player?.rawStats?.targets, {}) || {};
    for (const [key, raw] of Object.entries(source)) {
      const stat: any = raw || {};
      const cur = targetAgg[key] || { dartsAimed: 0, progressHits: 0, outerSingles: 0, doubles: 0, triples: 0, prisonerMistakes: 0 };
      cur.dartsAimed += num(stat?.dartsAimed); cur.progressHits += num(stat?.progressHits); cur.outerSingles += num(stat?.outerSingles);
      cur.doubles += num(stat?.doubles); cur.triples += num(stat?.triples); cur.prisonerMistakes += num(stat?.prisonerMistakes);
      targetAgg[key] = cur;
    }
  }
  const targetRows = Object.entries(targetAgg).map(([key, stat]: any) => ({ key, ...stat, accuracy: stat.dartsAimed ? (stat.progressHits / stat.dartsAimed) * 100 : 0 }));
  const seqIndex = new Map(sequence.map((v: any, i: number) => [String(v), i]));
  targetRows.sort((a: any, b: any) => num(seqIndex.get(String(a.key)), 999) - num(seqIndex.get(String(b.key)), 999));

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Performance du match</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Kpi label="Parcours" value={`${sequence.length || num(matchStats?.courseLength, 20)} cibles`} accent={accent} />
        <Kpi label="Fléchettes de départ" value={num(summary?.startingDarts ?? rec?.payload?.config?.startingDarts, 3)} accent={accent} />
        <Kpi label="Progressions" value={totalProgress} accent={accent} />
        <Kpi label="Précision progression" value={`${Math.round(accuracy * 10) / 10}%`} accent={accent} />
        <Kpi label="Captures" value={totalCaptures} accent={accent} />
        <Kpi label="Prisonniers créés" value={totalPrisoners} accent={accent} />
        <Kpi label="MISS hors cible" value={totalMisses} accent={accent} />
        <Kpi label="Durée" value={duration ? fmtDuration(duration) : "—"} accent={accent} />
      </div>
    </section>

    {standings.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Classement final</div>
      <div style={{ display: "grid", gap: 7 }}>
        {standings.map((row: any, index: number) => <div key={String(row?.id || index)} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: index === 0 ? `${accent}18` : "rgba(255,255,255,.04)", border: `1px solid ${index === 0 ? accent : "rgba(255,255,255,.09)"}` }}><div style={{ color: index === 0 ? accent : "#d7d9e3", fontWeight: 1000 }}>#{num(row?.rank, index + 1)}</div><div><div style={{ fontWeight: 1000 }}>{String(row?.name || `Joueur ${index + 1}`)}</div><div style={{ color: "#9da2b4", fontSize: 10.5 }}>{row?.completed ? "Parcours terminé" : row?.eliminated ? "Éliminé" : `${num(row?.progress, 0)}/20`} • {num(row?.captures, 0)} capture(s)</div></div><div style={{ color: accent, fontWeight: 1000 }}>{num(row?.dartsOwned, 0)} 🎯</div></div>)}
      </div>
    </section> : null}

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Statistiques joueurs</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead><tr style={{ color: accent, textAlign: "left" }}><th style={th}>Joueur</th><th style={th}>Progression</th><th style={th}>Flèches fin</th><th style={th}>Captures</th><th style={th}>Adv.</th><th style={th}>Sauvetages</th><th style={th}>Perdues</th><th style={th}>Prisonniers</th><th style={th}>SI</th><th style={th}>SE</th><th style={th}>D</th><th style={th}>T</th><th style={th}>MISS</th><th style={th}>Best volée</th></tr></thead>
          <tbody>{players.map((p: any, index: number) => <tr key={String(p?.id || index)}><td style={td}>{String(p?.name || p?.playerName || `Joueur ${index + 1}`)}{p?.eliminated ? " • OUT" : p?.completed ? " • FINI" : ""}</td><td style={td}>{num(p?.progress ?? p?.targetsCompleted)}/20</td><td style={td}>{num(p?.finalDartsOwned ?? p?.dartsOwned)}</td><td style={td}>{num(p?.captures)}</td><td style={td}>{num(p?.opponentCaptures)}</td><td style={td}>{num(p?.ownRescues)}</td><td style={td}>{num(p?.captureLosses)}</td><td style={td}>{num(p?.prisonersCreated)}</td><td style={td}>{num(p?.innerSingles)}</td><td style={td}>{num(p?.outerSingles)}</td><td style={td}>{num(p?.doubles)}</td><td style={td}>{num(p?.triples)}</td><td style={td}>{num(p?.offboardMisses ?? p?.misses)}</td><td style={td}>+{num(p?.bestProgressVisit)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    {targetRows.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Efficacité par cible</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(82px,1fr))", gap: 7 }}>
        {targetRows.map((row: any) => <div key={row.key} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.09)", textAlign: "center" }}><div style={{ color: accent, fontSize: 17, fontWeight: 1000 }}>{row.key}</div><div style={{ color: "#e8ebf2", fontSize: 12, fontWeight: 1000 }}>{row.progressHits}/{row.dartsAimed}</div><div style={{ color: "#a0a5b7", fontSize: 9.5 }}>{Math.round(row.accuracy * 10) / 10}%</div><div style={{ color: "#ff7abf", fontSize: 8.5, marginTop: 2 }}>{row.prisonerMistakes} piège(s)</div></div>)}
      </div>
    </section> : null}
  </>;
}

function CapitalSummaryTables({ rec, rows, accent }: { rec: any; rows: any[]; accent: string }) {
  const summary = pick(rec?.summary, rec?.payload?.summary, {}) || {};
  const visits = asArray(pick(summary?.visits, rec?.payload?.stats?.visits, rec?.payload?.visits, rec?.visits));
  const teams = asArray(pick(summary?.teams, rec?.payload?.stats?.teams, rec?.teams));
  const matchStats = pick(summary?.matchStats, summary?.stats, rec?.payload?.stats?.match, rec?.payload?.summary?.matchStats, {}) || {};
  const winnerTeamId = String(pick(summary?.winnerTeamId, rec?.winnerTeamId, rec?.payload?.winnerTeamId, ""));
  const contracts = asArray(pick(summary?.contracts, rec?.payload?.summary?.contracts, rec?.config?.contracts));
  const contractLabels = new Map<string, string>();
  contracts.forEach((item: any) => {
    if (typeof item === "string") contractLabels.set(item, item);
    else contractLabels.set(String(item?.id || ""), String(item?.label || item?.id || ""));
  });
  const labelContract = (id: any) => contractLabels.get(String(id)) || String(id || "CAPITAL").replaceAll("_", " ");
  const fmtDuration = (value: any) => {
    const ms = num(value, 0);
    if (!ms) return "—";
    const seconds = Math.max(0, Math.round(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${String(sec).padStart(2, "0")}s`;
  };
  const columns: Array<[string, (p: any) => any]> = [
    ["Joueur", (p) => pick(p.name, p.playerName, "Joueur")],
    ["Capital", (p) => num(pick(p.finalCapital, p.capital, p.score), 0)],
    ["Départ", (p) => num(p.startingCapital, 0)],
    ["Pic", (p) => num(p.peakCapital, 0)],
    ["Mini", (p) => num(p.lowestCapital, 0)],
    ["Net", (p) => `${num(p.netCapitalChange, 0) >= 0 ? "+" : ""}${num(p.netCapitalChange, 0)}`],
    ["Conservé", (p) => `${num(p.capitalRetentionRate, 0).toFixed(1)}%`],
    ["Réussis", (p) => num(pick(p.successfulContracts, p.successfulVisits), 0)],
    ["Échecs", (p) => num(pick(p.failedContracts, p.failedVisits, p.fails), 0)],
    ["Réussite", (p) => `${num(p.successRate, 0).toFixed(1)}%`],
    ["Série +", (p) => num(p.successStreakMax, 0)],
    ["Série −", (p) => num(p.failStreakMax, 0)],
    ["Gagnés", (p) => num(pick(p.pointsWon, p.points), 0)],
    ["Perdus", (p) => num(pick(p.capitalLost, p.penaltyLost), 0)],
    ["Pénalités", (p) => num(p.penaltyEvents, 0)],
    ["Moy. pén.", (p) => num(p.avgPenalty, 0).toFixed(1)],
    ["AVG volée", (p) => num(pick(p.averageVisit, p.avgVisit), 0).toFixed(1)],
    ["AVG/3", (p) => num(p.avg3, 0).toFixed(1)],
    ["Best", (p) => num(p.bestVisit, 0)],
    ["Gain max", (p) => `+${num(p.bestGain, 0)}`],
    ["Perte max", (p) => `-${num(p.biggestLoss, 0)}`],
  ];
  const precisionColumns: Array<[string, (p: any) => any]> = [
    ["Joueur", (p) => pick(p.name, p.playerName, "Joueur")],
    ["Volées", (p) => num(p.visits, 0)],
    ["Flèches", (p) => num(p.dartsThrown, 0)],
    ["Hit %", (p) => `${num(p.hitRate, 0).toFixed(1)}%`],
    ["S", (p) => num(p.singles, 0)], ["D", (p) => num(p.doubles, 0)], ["T", (p) => num(p.triples, 0)],
    ["Bull", (p) => num(p.bulls, 0)], ["DBull", (p) => num(p.dbulls, 0)], ["Miss", (p) => num(p.misses, 0)],
    ["60+", (p) => num(p.visits60Plus, 0)], ["100+", (p) => num(p.visits100Plus, 0)], ["140+", (p) => num(p.visits140Plus, 0)], ["180", (p) => num(p.visits180, 0)],
    ["57 exact", (p) => num(p.exact57, 0)],
    ["Top secteur", (p) => p.topSector ? `${p.topSector} (${num(p.topSectorHits, 0)})` : "—"],
    ["Top pts secteur", (p) => p.topScoringSector ? `${p.topScoringSector} (${num(p.topScoringSectorPoints, 0)} pts)` : "—"],
  ];
  const dartLabel = (dart: any) => {
    const value = num(dart?.v, 0);
    const mult = num(dart?.mult, 1);
    if (!value) return "MISS";
    if (value === 25) return mult === 2 ? "DBULL" : "BULL";
    return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${value}`;
  };
  const matchKpis = [
    ["Durée", fmtDuration(matchStats?.durationMs || summary?.durationMs)],
    ["Contrats tentés", num(matchStats?.contractsPlayed, 0)],
    ["Réussite globale", `${num(matchStats?.successRate, 0).toFixed(1)}%`],
    ["Total fléchettes", num(matchStats?.totalDarts, 0)],
    ["Précision", `${num(matchStats?.hitRate, 0).toFixed(1)}%`],
    ["Points gagnés", num(matchStats?.totalPointsWon, 0)],
    ["Capital perdu", num(matchStats?.totalCapitalLost, 0)],
    ["Capital final moy.", num(matchStats?.averageFinalCapital, 0).toFixed(1)],
    ["Meilleur capital", num(matchStats?.bestFinalCapital, 0)],
    ["Best volée", num(matchStats?.bestVisit, 0)],
    ["Moy. / volée", num(matchStats?.averageVisit, 0).toFixed(1)],
    ["AVG / 3", num(matchStats?.avg3, 0).toFixed(1)],
    ["Pénalités", num(matchStats?.penaltyEvents, 0)],
    ["Plus grosse perte", `-${num(matchStats?.biggestLoss, 0)}`],
    ["60+ / 100+", `${num(matchStats?.visits60Plus, 0)} / ${num(matchStats?.visits100Plus, 0)}`],
    ["140+ / 180", `${num(matchStats?.visits140Plus, 0)} / ${num(matchStats?.visits180, 0)}`],
  ];

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Synthèse CAPITAL</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
        {matchKpis.map(([label, value]) => <Kpi key={String(label)} label={String(label)} value={value} accent={accent} />)}
      </div>
    </section>

    {teams.length ? <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Classement des équipes</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        {[...teams].sort((a, b) => num(b?.score, 0) - num(a?.score, 0)).map((team: any) => {
          const color = String(team?.color || accent);
          const winner = String(team?.id) === winnerTeamId;
          return <div key={String(team?.id)} style={{ padding: 12, borderRadius: 15, background: `${color}12`, border: `1px solid ${winner ? color : `${color}55`}` }}>
            <div style={{ color, fontSize: 11, fontWeight: 1000 }}>{winner ? "🏆 " : ""}{pick(team?.name, "Équipe")}</div>
            <div style={{ marginTop: 5, fontSize: 28, fontWeight: 1000 }}>{num(pick(team?.score, team?.capital), 0)}</div>
            <div style={{ marginTop: 5, fontSize: 10.5, color: "#aeb0bd", lineHeight: 1.45 }}>
              Départ {num(team?.startingCapital, 0)} • Net {num(team?.netCapitalChange, 0) >= 0 ? "+" : ""}{num(team?.netCapitalChange, 0)}<br />
              Contrats {num(team?.successfulContracts, 0)}/{num(team?.contractsPlayed, 0)} • {num(team?.successRate, 0).toFixed(1)}%<br />
              Points +{num(team?.pointsWon, 0)} • Pertes -{num(team?.capitalLost, 0)} • Best {num(team?.bestVisit, 0)}<br />
              Hit {num(team?.hitRate, 0).toFixed(1)}% • AVG/3 {num(team?.avg3, 0).toFixed(1)}
            </div>
          </div>;
        })}
      </div>
    </section> : null}

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Capital & contrats — tableau complet</div>
      <div style={{ color: "#aeb0bd", fontSize: 11, marginBottom: 9 }}>{contracts.length || "—"} contrat(s) au programme</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1750, borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{columns.map(([label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={`capital-${row.id}`} style={{ background: row.isWinner ? `${accent}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ ...td, color: label === "Joueur" && row.isWinner ? accent : td.color }}>{read(row.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Précision, impacts & grosses volées</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1250, borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{precisionColumns.map(([label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={`capital-precision-${row.id}`}>{precisionColumns.map(([label, read]) => <td key={label} style={td}>{read(row.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Performance contrat par contrat</div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => {
          const contractStats = row?.raw?.contractStats && typeof row.raw.contractStats === "object" ? Object.entries(row.raw.contractStats) as Array<[string, any]> : [];
          return <div key={`contracts-${row.id}`} style={{ padding: 11, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ color: row.isWinner ? accent : "#fff", fontWeight: 1000, marginBottom: 8 }}>{row.name}{row.isWinner ? " 🏆" : ""}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 6 }}>
              {contractStats.length ? contractStats.map(([id, stat]) => <div key={id} style={{ padding: 8, borderRadius: 11, background: stat?.successes ? `${accent}10` : "rgba(255,70,100,.06)", border: `1px solid ${stat?.successes ? `${accent}42` : "rgba(255,100,130,.20)"}` }}>
                <div style={{ fontSize: 10, fontWeight: 1000 }}>{labelContract(id)}</div>
                <div style={{ marginTop: 3, fontSize: 10, color: "#b5b8c5", lineHeight: 1.35 }}>
                  {num(stat?.successes, 0)}/{num(stat?.attempts, 0)} • {num(stat?.successRate, 0).toFixed(1)}%<br />
                  +{num(stat?.pointsWon, 0)} pts • -{num(stat?.capitalLost, 0)} cap.<br />Best {num(stat?.bestVisit, 0)} • Moy. {num(stat?.averageVisit, 0).toFixed(1)}
                </div>
              </div>) : <div style={{ color: "#aeb0bd", fontSize: 11 }}>Pas de ventilation disponible.</div>}
            </div>
          </div>;
        })}
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Historique complet des contrats</div>
      <div style={{ display: "grid", gap: 7 }}>
        {visits.length ? visits.map((visit: any, index: number) => {
          const player = rows.find((row) => String(row.id) === String(visit?.playerId));
          const success = Boolean(visit?.success);
          return <div key={visit?.id || index} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: success ? "#72f0a8" : "#ff8aa6", fontWeight: 1000 }}>#{num(visit?.contractIndex, 0) + 1}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{player?.name || visit?.playerName || "Joueur"} • {labelContract(visit?.contractId)}</div><div style={{ color: "#aeb0bd", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asArray(visit?.darts).map(dartLabel).join(" · ") || "—"} • {visit?.scoreBefore} → {visit?.scoreAfter}</div></div>
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
  const participantMode = String(pick(summary?.participantMode, rec?.payload?.stats?.global?.participantMode, rec?.payload?.config?.participantMode, "players"));
  const isSolo = participantMode !== "teams" && rows.length === 2;
  const teamColor = (team: string) => team === "A" ? "#ff4ad1" : "#ffd76a";
  const teamMeta = (slot: string, index: number) => {
    const team = teams.find((item: any) => String(pick(item?.id, item?.slot, "")).toUpperCase() === slot) || teams[index] || {};
    const fallbackRow = rows.find((row) => String(row?.raw?.team || "").toUpperCase() === slot);
    return {
      name: String(pick(team?.name, isSolo ? fallbackRow?.name : `Équipe ${slot}`)),
      logo: pick(team?.logoDataUrl, team?.logoUrl, team?.avatarDataUrl, isSolo ? fallbackRow?.avatar : null),
      darts: num(team?.darts, 0), visits: num(team?.visits, 0), marks: num(team?.marks, 0), closes: num(team?.closes, 0),
    };
  };
  const columns: Array<[string, (p: any) => any]> = [
    ["Joueur", (p) => p.name], ...(!isSolo ? [["Équipe", (p: any) => pick(p.team, "—")] as [string, (p: any) => any]] : []),
    ["Points", (p) => num(pick(p.points, p.score), 0)], ["Marks", (p) => num(pick(p.totalMarks, p.marksTotal, p.marks), 0)],
    ["Ferm.", (p) => num(pick(p.closed, p.closes, p.closedNumbers), 0)], ["Darts", (p) => num(pick(p.dartsThrown, p.darts), 0)],
    ["Volées", (p) => num(p.visits, 0)], ["Hit %", (p) => `${num(p.hitRate, 0).toFixed(1)}%`], ["Cible %", (p) => `${num(p.targetRate, 0).toFixed(1)}%`],
    ["MPR", (p) => num(p.mpr, 0).toFixed(2)], ["Marks/vol.", (p) => num(p.marksPerStopperVisit, 0).toFixed(2)],
    ["Pts/vol.", (p) => num(p.pointsPerScorerVisit, 0).toFixed(1)], ["Pts/dart", (p) => num(p.pointsPerScorerDart, 0).toFixed(2)],
    ["Best pts", (p) => num(pick(p.bestScoringVisit, p.bestVisit), 0)], ["Best marks", (p) => num(p.bestMarksVisit, 0)],
    ["Score hits", (p) => num(p.scoringHits, 0)], ["Score %", (p) => `${num(p.scorerEfficiency, 0).toFixed(1)}%`],
    ["Bloquées", (p) => num(p.blockedDarts, 0)], ["Bloc %", (p) => `${num(p.blockedRate, 0).toFixed(1)}%`], ["Hors cible", (p) => num(p.wastedDarts, 0)],
    ["S", (p) => num(p.singles, 0)], ["D", (p) => num(p.doubles, 0)], ["T", (p) => num(p.triples, 0)],
    ["Bull", (p) => num(p.bulls, 0)], ["DBull", (p) => num(p.dbulls, 0)], ["Miss", (p) => num(p.misses, 0)],
  ];
  const total = (key: string) => rows.reduce((sum, row) => sum + num(row?.raw?.[key], 0), 0);
  const best = (key: string) => rows.reduce((value, row) => Math.max(value, num(row?.raw?.[key], 0)), 0);
  const durationMs = num(summary?.duration, 0);
  const duration = durationMs ? `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}` : "—";

  return <>
    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>{isSolo ? "Duel SCRAM" : "Duel des équipes"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        {(["A", "B"] as const).map((team, index) => {
          const meta = teamMeta(team, index);
          return <React.Fragment key={team}>
            {index ? <div style={{ color: "#8c91a1", fontWeight: 1000 }}>—</div> : null}
            <div style={{ padding: 13, borderRadius: 15, textAlign: "center", border: `1px solid ${winnerTeam === team ? teamColor(team) : "rgba(255,255,255,.11)"}`, background: winnerTeam === team ? `${teamColor(team)}16` : "rgba(255,255,255,.035)", boxShadow: winnerTeam === team ? `0 0 18px ${teamColor(team)}25` : "none" }}>
              {meta.logo ? <img src={String(meta.logo)} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${teamColor(team)}`, marginBottom: 5 }} /> : null}
              <div style={{ color: teamColor(team), fontWeight: 1000, fontSize: 11 }}>{winnerTeam === team ? "🏆 " : ""}{isSolo ? meta.name : `ÉQUIPE ${team}`}</div>
              {!isSolo ? <div style={{ fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.name}</div> : null}
              <div style={{ fontSize: 32, fontWeight: 1000, marginTop: 2 }}>{team === "A" ? scoreA : scoreB}</div>
              <div style={{ fontSize: 9.5, color: "#aeb0bd" }}>{meta.visits} volées • {meta.darts} darts • {meta.marks} marks</div>
            </div>
          </React.Fragment>;
        })}
      </div>
      <div style={{ marginTop: 10, color: "#b8bcc8", textAlign: "center", fontSize: 11.5 }}>
        {tied ? "Partie nulle" : `Vainqueur : ${winnerTeam ? teamMeta(winnerTeam, winnerTeam === "A" ? 0 : 1).name : "—"}`} • Phase 1 : {num(phaseRounds?.[1], 0)} rounds • Phase 2 : {num(phaseRounds?.[2], 0)} rounds • {duration}
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Résumé statistique de la partie</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        {[["Volées", total("visits")], ["Darts", total("dartsThrown") || total("darts")], ["Points", total("points")], ["Marks", total("marks")], ["Fermetures", total("closed")], ["Score hits", total("scoringHits")], ["Best score", best("bestScoringVisit") || best("bestVisit")], ["Best marks", best("bestMarksVisit")]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><div style={{ color: "#9da1b1", fontSize: 9.5 }}>{label}</div><div style={{ marginTop: 2, fontWeight: 1000, fontSize: 18, color: accent }}>{value}</div></div>)}
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Tableau complet de fin de partie</div>
      <div style={{ overflowX: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
        <table style={{ width: "100%", minWidth: 1700, borderCollapse: "collapse", fontSize: 10.5 }}>
          <thead><tr style={{ color: accent, textAlign: "left", background: `${accent}12` }}>{columns.map(([label]) => <th key={label} style={{ ...th, whiteSpace: "nowrap" }}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={`scram-stat-${r.id}`} style={{ background: r.isWinner ? `${accent}0e` : "transparent" }}>{columns.map(([label, read]) => <td key={label} style={{ ...td, whiteSpace: "nowrap", color: label === "Équipe" ? teamColor(String(r.raw?.team || "")) : label === "Joueur" && r.isWinner ? accent : td.color }}>{read(r.raw)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Bloqueur / Scoreur par joueur</div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => {
          const p = row.raw || {};
          return <div key={`roles-${row.id}`} style={{ padding: 10, borderRadius: 14, border: `1px solid ${teamColor(String(p.team || "A"))}44`, background: `${teamColor(String(p.team || "A"))}08` }}>
            <div style={{ fontWeight: 1000, marginBottom: 7, color: row.isWinner ? accent : "#fff" }}>{row.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
              {[["Vol. bloqueur", num(p.stopperVisits)], ["Darts bloqueur", num(p.stopperDarts)], ["MPR", num(p.mpr).toFixed(2)], ["Best marks", num(p.bestMarksVisit)], ["Vol. scoreur", num(p.scorerVisits)], ["Darts scoreur", num(p.scorerDarts)], ["Pts/volée", num(p.pointsPerScorerVisit).toFixed(1)], ["Best score", num(pick(p.bestScoringVisit,p.bestVisit))]].map(([label,value]) => <div key={String(label)} style={{ padding: 7, borderRadius: 11, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ fontSize: 8.8, color: "#9da1b1" }}>{label}</div><div style={{ marginTop: 2, fontWeight: 1000, color: accent }}>{value}</div></div>)}
            </div>
          </div>;
        })}
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Efficacité par segment</div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => {
          const segments = row.raw?.segmentStats || {};
          return <div key={`segments-${row.id}`}>
            <div style={{ fontWeight: 1000, marginBottom: 6 }}>{row.name}</div>
            <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)" }}>
              <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ color: accent }}><th style={th}>Segment</th><th style={th}>Darts</th><th style={th}>Marks</th><th style={th}>Ferm.</th><th style={th}>Score hits</th><th style={th}>Points</th><th style={th}>Bloquées</th></tr></thead><tbody>{["15","16","17","18","19","20","25"].map((key) => { const seg = segments?.[key] || {}; return <tr key={key}><td style={td}>{key === "25" ? "Bull" : key}</td><td style={td}>{num(seg.darts)}</td><td style={td}>{num(seg.marks)}</td><td style={td}>{num(seg.closes)}</td><td style={td}>{num(seg.scoringHits)}</td><td style={td}>{num(seg.points)}</td><td style={td}>{num(seg.blockedDarts)}</td></tr>; })}</tbody></table>
            </div>
          </div>;
        })}
      </div>
    </section>

    <section style={card(accent)}>
      <div style={sectionTitle(accent)}>Déroulé des volées</div>
      <div style={{ display: "grid", gap: 7 }}>
        {visits.length ? visits.map((visit, index) => {
          const team = String(visit?.team || "").toUpperCase();
          const player = rows.find((row) => String(row.id) === String(visit?.playerId));
          const closed = asArray(visit?.targetsClosed).map((target) => Number(target) === 25 ? "Bull" : target).join(", ");
          return <div key={visit?.id || index} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: teamColor(team), fontWeight: 1000 }}>P{pick(visit?.phase, "—")}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000 }}>{player?.name || "Joueur"} <span style={{ color: teamColor(team), fontSize: 10 }}>{isSolo ? (visit?.role === "stopper" ? "BLOQUEUR" : "SCOREUR") : `${teamMeta(team, team === "A" ? 0 : 1).name} • ${visit?.role === "stopper" ? "Bloqueur" : "Scoreur"}`}</span></div>
              <div style={{ color: "#aeb0bd", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Round {pick(visit?.round, "—")} • {asArray(visit?.labels).join(" · ") || "—"}{closed ? ` • fermé : ${closed}` : ""}</div>
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
