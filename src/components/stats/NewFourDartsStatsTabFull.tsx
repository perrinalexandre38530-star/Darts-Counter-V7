import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type NewFourMode = "fifty_one_by_five" | "looper" | "call_three" | "steeplechase";

type Props = {
  records: any[];
  playerId: string;
  playerName?: string;
  mode: NewFourMode;
};

type ModeSpec = {
  title: string;
  accent: string;
  accent2: string;
  subtitle: string;
  aliases: string[];
};

const SPECS: Record<NewFourMode, ModeSpec> = {
  fifty_one_by_five: {
    title: "51 BY 5",
    accent: "#ffd34d",
    accent2: "#42e6c2",
    subtitle: "Division par 5, régularité, busts et fin exacte.",
    aliases: ["fifty_one_by_five", "51 by 5", "51_by_5", "51by5"],
  },
  looper: {
    title: "LOOPER",
    accent: "#8ff7ff",
    accent2: "#5e8cff",
    subtitle: "Boucles, survie, boucliers et maîtrise des cibles exactes.",
    aliases: ["looper", "loopy", "loops"],
  },
  call_three: {
    title: "CALL THREE",
    accent: "#ffb13b",
    accent2: "#ff6b6b",
    subtitle: "Appels, Full Calls, multiplicateurs et séries de précision.",
    aliases: ["call_three", "call three", "callthree"],
  },
  steeplechase: {
    title: "STEEPLECHASE",
    accent: "#7dffbd",
    accent2: "#ffb13b",
    subtitle: "Progression sur le cadran, haies, Bull final et régularité.",
    aliases: ["steeplechase", "steeple chase"],
  },
};

const MUTED = "#8d95a8";
const WHITE = "#f8f9fc";
const RED = "#ff6677";
const GREEN = "#72efb1";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function arr(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.entries(v).map(([id, row]: any) => ({ id, ...(row || {}) }));
  return [];
}
function normName(v: any) {
  return String(v ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function modeBlob(r: any) {
  return [
    r?.kind, r?.mode, r?.game?.mode, r?.game?.id,
    r?.summary?.mode, r?.payload?.kind, r?.payload?.mode,
    r?.payload?.originalMode, r?.payload?.summary?.mode,
    r?.payload?.stateSnapshot?.mode, r?.resume?.state?.mode,
  ].filter(Boolean).map((x: any) => String(x).toLowerCase()).join(" ");
}
function isFinished(r: any) {
  const status = String(r?.status || "").toLowerCase();
  if (["in_progress", "playing", "live"].includes(status)) return false;
  if (status === "finished") return true;
  if (r?.summary?.finished === true) return true;
  if (r?.payload?.stateSnapshot?.phase === "finished" || r?.resume?.state?.phase === "finished") return true;
  return !!(r?.winnerId || r?.summary?.winnerId || r?.payload?.winnerId);
}
function playedAt(r: any) {
  return n(r?.finishedAt || r?.summary?.finishedAt || r?.updatedAt || r?.createdAt);
}
function playerAliases(r: any, pid: string, playerName?: string) {
  const ids = new Set<string>([String(pid || "")].filter(Boolean));
  const wanted = normName(playerName);
  const pools = [r?.players, r?.summary?.players, r?.payload?.players, r?.payload?.stateSnapshot?.players, r?.resume?.state?.players];
  for (const pool of pools) {
    for (const p of arr(pool)) {
      const names = normName(p?.name ?? p?.playerName ?? p?.displayName ?? p?.nickname);
      const rowIds = [p?.id, p?.playerId, p?.profileId, p?.pid, p?.uid].filter((x) => x !== undefined && x !== null).map(String);
      if (rowIds.includes(String(pid)) || (!!wanted && !!names && names === wanted)) rowIds.forEach((id) => ids.add(id));
    }
  }
  return ids;
}
function playerStat(r: any, pid: string, playerName?: string) {
  const aliases = playerAliases(r, pid, playerName);
  const pools = [
    r?.payload?.stats?.players,
    r?.summary?.perPlayer,
    r?.payload?.summary?.perPlayer,
    r?.payload?.stateSnapshot?.statsByPlayer,
    r?.resume?.state?.statsByPlayer,
  ];
  for (const pool of pools) {
    if (pool && !Array.isArray(pool) && typeof pool === "object") {
      for (const id of aliases) if ((pool as any)[id]) return { ...(pool as any)[id] };
    }
    if (Array.isArray(pool)) {
      const hit = pool.find((p: any) => aliases.has(String(p?.id || p?.playerId || p?.profileId || p?.pid || "")) || (!!playerName && normName(p?.name ?? p?.playerName ?? p?.displayName) === normName(playerName)));
      if (hit) return { ...hit };
    }
  }
  return null;
}
function recordHasPlayer(r: any, pid: string, playerName?: string) {
  if (playerStat(r, pid, playerName)) return true;
  const aliases = playerAliases(r, pid, playerName);
  return [r?.players, r?.summary?.players, r?.payload?.players, r?.payload?.stateSnapshot?.players, r?.resume?.state?.players]
    .some((pool: any) => arr(pool).some((p: any) => aliases.has(String(p?.id || p?.playerId || p?.profileId || p?.pid || ""))));
}
function winnerMatches(r: any, aliases: Set<string>) {
  const winner = String(r?.winnerId || r?.summary?.winnerId || r?.payload?.winnerId || r?.payload?.stateSnapshot?.winnerId || r?.resume?.state?.winnerId || "");
  return winner ? aliases.has(winner) : false;
}
function fmtDate(ts: number) {
  if (!ts) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(ts)); } catch { return "—"; }
}
function pct(v: number) { return `${Math.round(v * 10) / 10}%`; }
function avg(total: number, count: number, decimals = 1) {
  if (!count) return 0;
  const m = 10 ** decimals;
  return Math.round((total / count) * m) / m;
}

function Card({ children, style }: any) {
  return <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(17,20,30,.88),rgba(7,9,15,.96))", boxShadow: "0 14px 34px rgba(0,0,0,.24)", padding: 13, minWidth: 0, ...style }}>{children}</div>;
}
function Kpi({ label, value, detail, color }: any) {
  return <Card style={{ padding: 12 }}><div style={{ color: MUTED, fontSize: 9.5, fontWeight: 950, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color: color || WHITE, fontSize: 24, fontWeight: 1100, lineHeight: 1 }}>{value}</div>{detail ? <div style={{ marginTop: 5, color: "#aab1c0", fontSize: 9 }}>{detail}</div> : null}</Card>;
}
function SectionTitle({ children, sub, color }: any) {
  return <div style={{ marginBottom: 10 }}><div style={{ color: color || WHITE, fontSize: 12, fontWeight: 1100, letterSpacing: .75 }}>{children}</div>{sub ? <div style={{ marginTop: 2, color: MUTED, fontSize: 9 }}>{sub}</div> : null}</div>;
}
function ProgressBar({ value, max, color }: any) {
  const width = max > 0 ? Math.max(0, Math.min(100, (n(value) / max) * 100)) : 0;
  return <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: color }} /></div>;
}

export default function NewFourDartsStatsTabFull({ records, playerId, playerName, mode }: Props) {
  const spec = SPECS[mode];
  const pid = String(playerId || "");
  const rows = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter((r: any) => spec.aliases.some((alias) => modeBlob(r).includes(alias)) && recordHasPlayer(r, pid, playerName) && isFinished(r))
    .sort((a: any, b: any) => playedAt(a) - playedAt(b)), [records, pid, playerName, mode]);

  const matches = React.useMemo(() => rows.map((rec: any, index: number) => {
    const st = playerStat(rec, pid, playerName) || {};
    const aliases = playerAliases(rec, pid, playerName);
    const won = winnerMatches(rec, aliases);
    const base = {
      id: String(rec?.id || rec?.matchId || index),
      ts: playedAt(rec),
      label: fmtDate(playedAt(rec)),
      won,
      darts: n(st.darts ?? st.dartsThrown),
      visits: n(st.visits),
      legsWon: n(st.legsWon),
      duration: n(rec?.summary?.durationMs || (rec?.finishedAt && rec?.createdAt ? rec.finishedAt - rec.createdAt : 0)),
    } as any;
    if (mode === "fifty_one_by_five") return { ...base,
      valid: n(st.validVisits), invalid: n(st.invalidVisits), busts: n(st.busts), raw: n(st.rawPoints), quotient: n(st.quotientPoints),
      highestRaw: n(st.highestRaw), bestQuotient: n(st.bestQuotient), bestStreak: n(st.bestValidStreak), finishes: n(st.finishes), misses: n(st.misses), bulls: n(st.bulls),
    };
    if (mode === "looper") return { ...base,
      hits: n(st.hits), misses: n(st.misses), lifeLosses: n(st.lifeLosses), shieldsUsed: n(st.shieldsUsed), shieldsEarned: n(st.shieldsEarned),
      targetsSet: n(st.targetsSet), loops: n(st.loopsSurvived), bulls: n(st.bullTargets), bestStreak: n(st.bestHitStreak),
    };
    if (mode === "call_three") return { ...base,
      points: n(st.points), hits: n(st.hits), misses: n(st.misses), fullCalls: n(st.perfectRounds), callsMade: n(st.callsMade), bestVisit: n(st.bestVisit),
      bestStreak: n(st.bestStreak), doubles: n(st.doubleHits), triples: n(st.tripleHits), bulls: n(st.bullHits),
    };
    return { ...base,
      hits: n(st.hits), misses: n(st.misses), fences: n(st.fencesCleared), fenceAttempts: n(st.fenceAttempts), bullFinishes: n(st.bullFinishes),
      steps: n(st.steps), bestVisitSteps: n(st.bestVisitSteps), bestStreak: n(st.bestStreak),
    };
  }), [rows, pid, playerName, mode]);

  const games = matches.length;
  const wins = matches.filter((m: any) => m.won).length;
  const winRate = games ? (wins / games) * 100 : 0;
  const sum = (key: string) => matches.reduce((a: number, r: any) => a + n(r[key]), 0);
  const max = (key: string) => matches.reduce((a: number, r: any) => Math.max(a, n(r[key])), 0);
  const darts = sum("darts"), visits = sum("visits"), legs = sum("legsWon");

  if (!matches.length) {
    return <Card><SectionTitle color={spec.accent}>{spec.title} — statistiques détaillées</SectionTitle><div style={{ color: MUTED, fontSize: 12 }}>Aucune partie {spec.title} terminée enregistrée pour {playerName || "ce joueur"}.</div></Card>;
  }

  const commonKpis: any[] = [
    ["Parties", games, `${wins} victoire${wins > 1 ? "s" : ""}`, spec.accent],
    ["Taux de victoire", pct(winRate), `${legs} manche${legs > 1 ? "s" : ""} gagnée${legs > 1 ? "s" : ""}`, GREEN],
    ["Fléchettes", darts, `${visits} volée${visits > 1 ? "s" : ""}`, WHITE],
  ];

  let modeKpis: any[] = [];
  let performanceBars: any[] = [];
  let pieData: any[] = [];
  let trendKey = "";
  let trendKey2 = "";
  let recordRows: any[] = [];

  if (mode === "fifty_one_by_five") {
    const valid = sum("valid"), invalid = sum("invalid"), busts = sum("busts"), quotient = sum("quotient"), raw = sum("raw");
    const rate = valid + invalid ? (valid / (valid + invalid)) * 100 : 0;
    modeKpis = [
      ["Volées valides", valid, `${pct(rate)} de validité`, spec.accent2],
      ["Points ÷5", quotient, `${raw} points bruts cumulés`, spec.accent],
      ["Best brut", max("highestRaw") || "—", `Best quotient ${max("bestQuotient") || 0}`, "#ffcf70"],
      ["Best série", max("bestStreak") || "—", `${busts} bust${busts > 1 ? "s" : ""}`, GREEN],
    ];
    performanceBars = [{ name: "Valides", value: valid }, { name: "Invalides", value: invalid }, { name: "Busts", value: busts }, { name: "Finishes", value: sum("finishes") }];
    pieData = [{ name: "Valides", value: valid, color: spec.accent2 }, { name: "Invalides", value: invalid, color: RED }];
    trendKey = "quotient"; trendKey2 = "valid";
    recordRows = [["Meilleure volée brute", max("highestRaw")], ["Meilleur quotient", max("bestQuotient")], ["Série valide", max("bestStreak")], ["Plus de points ÷5 / partie", max("quotient")]];
  } else if (mode === "looper") {
    const hits = sum("hits"), misses = sum("misses"), loops = sum("loops"), lifeLosses = sum("lifeLosses"), shields = sum("shieldsEarned");
    const accuracy = hits + misses ? (hits / (hits + misses)) * 100 : 0;
    modeKpis = [
      ["Précision cible", pct(accuracy), `${hits}/${hits + misses} impacts utiles`, spec.accent],
      ["Boucles sauvées", loops, `${sum("targetsSet")} cibles posées`, spec.accent2],
      ["Boucliers gagnés", shields, `${sum("shieldsUsed")} utilisés`, GREEN],
      ["Vies perdues", lifeLosses, `${sum("bulls")} cible${sum("bulls") > 1 ? "s" : ""} Bull`, RED],
    ];
    performanceBars = [{ name: "Hits", value: hits }, { name: "Boucles", value: loops }, { name: "Cibles", value: sum("targetsSet") }, { name: "Boucliers", value: shields }, { name: "Vies -", value: lifeLosses }];
    pieData = [{ name: "Hits", value: hits, color: spec.accent }, { name: "Miss", value: misses, color: RED }];
    trendKey = "loops"; trendKey2 = "hits";
    recordRows = [["Best série de hits", max("bestStreak")], ["Boucles / partie", max("loops")], ["Cibles posées / partie", max("targetsSet")], ["Boucliers gagnés / partie", max("shieldsEarned")]];
  } else if (mode === "call_three") {
    const hits = sum("hits"), misses = sum("misses"), fullCalls = sum("fullCalls"), points = sum("points");
    const accuracy = hits + misses ? (hits / (hits + misses)) * 100 : 0;
    const fullRate = visits ? (fullCalls / visits) * 100 : 0;
    modeKpis = [
      ["Points", points, `${avg(points, games, 1)} / partie`, spec.accent],
      ["Précision appel", pct(accuracy), `${hits} cible${hits > 1 ? "s" : ""} réussie${hits > 1 ? "s" : ""}`, GREEN],
      ["Full Calls", fullCalls, `${pct(fullRate)} des volées`, spec.accent2],
      ["Best volée", max("bestVisit") || "—", `Série ${max("bestStreak") || 0}`, "#ffe08b"],
    ];
    performanceBars = [{ name: "Hits", value: hits }, { name: "Full Calls", value: fullCalls }, { name: "Doubles", value: sum("doubles") }, { name: "Triples", value: sum("triples") }, { name: "Bull", value: sum("bulls") }];
    pieData = [{ name: "Hits", value: hits, color: spec.accent }, { name: "Miss", value: misses, color: RED }];
    trendKey = "points"; trendKey2 = "fullCalls";
    recordRows = [["Best volée", max("bestVisit")], ["Best série", max("bestStreak")], ["Points / partie", max("points")], ["Full Calls / partie", max("fullCalls")]];
  } else {
    const hits = sum("hits"), misses = sum("misses"), fences = sum("fences"), attempts = sum("fenceAttempts"), steps = sum("steps");
    const accuracy = hits + misses ? (hits / (hits + misses)) * 100 : 0;
    const fenceRate = attempts ? (fences / attempts) * 100 : 0;
    modeKpis = [
      ["Étapes", steps, `${avg(steps, games, 1)} / partie`, spec.accent],
      ["Précision", pct(accuracy), `${hits}/${hits + misses} touches`, GREEN],
      ["Haies", fences, `${pct(fenceRate)} de réussite`, spec.accent2],
      ["Bull finishes", sum("bullFinishes"), `Best volée ${max("bestVisitSteps") || 0} étapes`, "#ffe08b"],
    ];
    performanceBars = [{ name: "Étapes", value: steps }, { name: "Haies", value: fences }, { name: "Bull", value: sum("bullFinishes") }, { name: "Hits", value: hits }];
    pieData = [{ name: "Hits", value: hits, color: spec.accent }, { name: "Miss", value: misses, color: RED }];
    trendKey = "steps"; trendKey2 = "fences";
    recordRows = [["Étapes / partie", max("steps")], ["Haies / partie", max("fences")], ["Best volée", max("bestVisitSteps")], ["Best série", max("bestStreak")]];
  }

  const recent = matches.slice(-16).map((r: any, i: number) => ({ ...r, match: i + 1, trend1: n(r[trendKey]), trend2: n(r[trendKey2]) }));
  const bestMatchFor = (key: string) => matches.reduce((best: any, r: any) => !best || n(r[key]) > n(best[key]) ? r : best, null);

  return <div style={{ display: "grid", gap: 12 }}>
    <Card style={{ borderColor: `${spec.accent}44`, background: `linear-gradient(135deg,${spec.accent}0e,rgba(9,11,18,.96) 55%,${spec.accent2}0a)` }}>
      <div style={{ color: spec.accent, fontSize: 13, fontWeight: 1100, letterSpacing: 1 }}>{spec.title} — STATISTIQUES DÉTAILLÉES</div>
      <div style={{ marginTop: 4, color: MUTED, fontSize: 10 }}>{spec.subtitle}</div>
    </Card>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 }}>
      {[...commonKpis, ...modeKpis].map(([label, value, detail, color]) => <Kpi key={label} label={label} value={value} detail={detail} color={color} />)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.65fr) minmax(220px,.75fr)", gap: 10 }}>
      <Card>
        <SectionTitle color={spec.accent} sub="16 dernières parties terminées">Progression récente</SectionTitle>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={recent} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="match" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111522", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 10 }} />
              <Line type="monotone" dataKey="trend1" stroke={spec.accent} strokeWidth={2.3} dot={{ r: 2 }} name={mode === "call_three" ? "Points" : mode === "steeplechase" ? "Étapes" : mode === "looper" ? "Boucles" : "Points ÷5"} />
              <Line type="monotone" dataKey="trend2" stroke={spec.accent2} strokeWidth={1.8} dot={{ r: 2 }} name={mode === "call_three" ? "Full Calls" : mode === "steeplechase" ? "Haies" : mode === "looper" ? "Hits" : "Volées valides"} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle color={spec.accent2}>Réussite / échec</SectionTitle>
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3}>
                {pieData.map((x: any) => <Cell key={x.name} fill={x.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#111522", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "grid", gap: 5 }}>{pieData.map((x: any) => <div key={x.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 9 }}><span style={{ color: x.color }}>● {x.name}</span><b style={{ color: WHITE }}>{x.value}</b></div>)}</div>
      </Card>
    </div>

    <Card>
      <SectionTitle color={spec.accent} sub="Volume cumulé sur toutes les parties terminées">Indicateurs du mode</SectionTitle>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={performanceBars} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#111522", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 10 }} />
            <Bar dataKey="value" radius={[7, 7, 0, 0]} fill={spec.accent} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>

    <Card>
      <SectionTitle color={spec.accent2}>Records personnels</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 8 }}>
        {recordRows.map(([label, value], index) => {
          const keys = mode === "fifty_one_by_five" ? ["highestRaw","bestQuotient","bestStreak","quotient"] : mode === "looper" ? ["bestStreak","loops","targetsSet","shieldsEarned"] : mode === "call_three" ? ["bestVisit","bestStreak","points","fullCalls"] : ["steps","fences","bestVisitSteps","bestStreak"];
          const rec = bestMatchFor(keys[index]);
          return <div key={label} style={{ padding: 10, borderRadius: 13, background: `${index % 2 ? spec.accent2 : spec.accent}0b`, border: `1px solid ${index % 2 ? spec.accent2 : spec.accent}35` }}><div style={{ color: MUTED, fontSize: 8.5, fontWeight: 950, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color: index % 2 ? spec.accent2 : spec.accent, fontSize: 21, fontWeight: 1100 }}>{value || "—"}</div><div style={{ marginTop: 3, color: "#737b8e", fontSize: 8 }}>{rec ? fmtDate(rec.ts) : "—"}</div></div>;
        })}
      </div>
    </Card>

    <Card>
      <SectionTitle color={spec.accent}>Régularité récente</SectionTitle>
      <div style={{ display: "grid", gap: 6 }}>
        {matches.slice(-10).reverse().map((r: any, index: number) => {
          const metric = mode === "fifty_one_by_five" ? n(r.valid) : mode === "looper" ? n(r.loops) : mode === "call_three" ? n(r.points) : n(r.steps);
          const maxMetric = Math.max(1, ...matches.slice(-10).map((x: any) => mode === "fifty_one_by_five" ? n(x.valid) : mode === "looper" ? n(x.loops) : mode === "call_three" ? n(x.points) : n(x.steps)));
          return <div key={r.id || index} style={{ display: "grid", gridTemplateColumns: "66px 46px minmax(0,1fr) 70px", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ color: MUTED, fontSize: 8.5 }}>{r.label}</div>
            <div style={{ color: r.won ? GREEN : MUTED, fontSize: 8.5, fontWeight: 1000 }}>{r.won ? "WIN" : "—"}</div>
            <ProgressBar value={metric} max={maxMetric} color={`linear-gradient(90deg,${spec.accent},${spec.accent2})`} />
            <div style={{ textAlign: "right", color: spec.accent, fontSize: 10, fontWeight: 1000 }}>{metric}</div>
          </div>;
        })}
      </div>
    </Card>

    <Card>
      <SectionTitle color={spec.accent2}>Parties récentes</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 9 }}>
          <thead><tr style={{ color: spec.accent, textAlign: "left" }}>
            {(mode === "fifty_one_by_five" ? ["Date","Rés.","Flèches","Valides","Invalides","Busts","Pts ÷5","Best brut","Série"]
              : mode === "looper" ? ["Date","Rés.","Flèches","Hits","Boucles","Cibles","Vies -","Boucliers","Série"]
              : mode === "call_three" ? ["Date","Rés.","Flèches","Points","Hits","Full Calls","Doubles","Triples","Best"]
              : ["Date","Rés.","Flèches","Étapes","Hits","Haies","Tentatives","Bull","Best volée"])
            .map((h) => <th key={h} style={{ padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,.10)" }}>{h}</th>)}</tr></thead>
          <tbody>{matches.slice(-20).reverse().map((r: any, index: number) => <tr key={r.id || index}>
            <td style={{ padding: 7, borderBottom: "1px solid rgba(255,255,255,.05)" }}>{r.label}</td>
            <td style={{ padding: 7, color: r.won ? GREEN : MUTED, fontWeight: 1000 }}>{r.won ? "WIN" : "—"}</td>
            {mode === "fifty_one_by_five" ? <><td style={{padding:7}}>{r.darts}</td><td style={{padding:7,color:GREEN}}>{r.valid}</td><td style={{padding:7}}>{r.invalid}</td><td style={{padding:7,color:r.busts?RED:MUTED}}>{r.busts}</td><td style={{padding:7,color:spec.accent}}>{r.quotient}</td><td style={{padding:7}}>{r.highestRaw}</td><td style={{padding:7}}>{r.bestStreak}</td></>
              : mode === "looper" ? <><td style={{padding:7}}>{r.darts}</td><td style={{padding:7,color:GREEN}}>{r.hits}</td><td style={{padding:7,color:spec.accent}}>{r.loops}</td><td style={{padding:7}}>{r.targetsSet}</td><td style={{padding:7,color:r.lifeLosses?RED:MUTED}}>{r.lifeLosses}</td><td style={{padding:7}}>{r.shieldsEarned}/{r.shieldsUsed}</td><td style={{padding:7}}>{r.bestStreak}</td></>
              : mode === "call_three" ? <><td style={{padding:7}}>{r.darts}</td><td style={{padding:7,color:spec.accent}}>{r.points}</td><td style={{padding:7,color:GREEN}}>{r.hits}</td><td style={{padding:7,color:spec.accent2}}>{r.fullCalls}</td><td style={{padding:7}}>{r.doubles}</td><td style={{padding:7}}>{r.triples}</td><td style={{padding:7}}>{r.bestVisit}</td></>
              : <><td style={{padding:7}}>{r.darts}</td><td style={{padding:7,color:spec.accent}}>{r.steps}</td><td style={{padding:7,color:GREEN}}>{r.hits}</td><td style={{padding:7,color:spec.accent2}}>{r.fences}</td><td style={{padding:7}}>{r.fenceAttempts}</td><td style={{padding:7}}>{r.bullFinishes}</td><td style={{padding:7}}>{r.bestVisitSteps}</td></>}
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
  </div>;
}
