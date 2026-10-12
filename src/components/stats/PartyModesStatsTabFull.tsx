// @ts-nocheck
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PremiumPartyStatsMode = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur";

const MODE_META: Record<PremiumPartyStatsMode, { title: string; accent: string; aliases: string[] }> = {
  castle: { title: "CASTLE", accent: "#f6b84d", aliases: ["castle"] },
  gotcha: { title: "GOTCHA", accent: "#ff5b57", aliases: ["gotcha"] },
  hare_hounds: { title: "HARE & HOUNDS", accent: "#61d9ff", aliases: ["hare_hounds", "hare hounds", "hare & hounds", "hare-hounds"] },
  pendu: { title: "PENDU", accent: "#ffb33f", aliases: ["pendu", "hangman"] },
  menteur: { title: "MENTEUR", accent: "#ffbf37", aliases: ["menteur", "liar", "bluff"] },
};

const CYAN = "#20d9ff";
const GOLD = "#ffd55d";
const GREEN = "#67e88c";
const RED = "#ff7168";
const MAGENTA = "#d46dff";
const WHITE = "#f7f8fa";
const MUTED = "#8d969f";

function n(v: any) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function obj(v: any) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function norm(v: any) {
  return String(v ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function playedAt(r: any) { return n(r?.finishedAt || r?.updatedAt || r?.createdAt || r?.summary?.finishedAt || r?.payload?.stateSnapshot?.finishedAt); }
function fmtDate(ts: number) {
  if (!ts) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(ts)); } catch { return "—"; }
}
function fmtDuration(ms: number) {
  if (!ms) return "—";
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
function modeBlob(r: any) {
  return [
    r?.kind, r?.mode, r?.variant, r?.game,
    r?.summary?.mode, r?.summary?.kind,
    r?.payload?.kind, r?.payload?.mode, r?.payload?.originalMode, r?.payload?.variantId,
    r?.payload?.summary?.mode, r?.payload?.stateSnapshot?.mode, r?.resume?.state?.mode,
  ].filter(Boolean).map(norm).join(" ");
}
function isFinished(r: any) {
  const status = String(r?.status || "").toLowerCase();
  if (status === "in_progress" || status === "playing" || status === "live") return false;
  if (status === "finished") return true;
  return Boolean(r?.winnerId || r?.summary?.winnerId || r?.payload?.stateSnapshot?.phase === "finished" || r?.resume?.state?.phase === "finished" || r?.finishedAt);
}
function winnerId(r: any) {
  return String(r?.winnerId || r?.summary?.winnerId || r?.payload?.winnerId || r?.payload?.summary?.winnerId || r?.payload?.stateSnapshot?.winnerId || r?.resume?.state?.winnerId || "");
}
function pools(r: any) {
  return [
    r?.players,
    r?.payload?.players,
    r?.payload?.stateSnapshot?.players,
    r?.resume?.state?.players,
    r?.summary?.players,
    r?.summary?.rankings,
    r?.payload?.summary?.players,
    r?.payload?.summary?.rankings,
  ];
}
function playerAliases(r: any, pid: string, playerName?: string) {
  const aliases = new Set<string>([String(pid || "")].filter(Boolean));
  const wanted = norm(playerName);
  for (const pool of pools(r)) {
    const rows = Array.isArray(pool) ? pool : pool && typeof pool === "object" ? Object.values(pool) : [];
    for (const row of rows as any[]) {
      const ids = [row?.id, row?.playerId, row?.profileId, row?.pid, row?.uid].filter((x) => x !== undefined && x !== null).map(String);
      const sameName = !!wanted && norm(row?.name ?? row?.playerName ?? row?.displayName ?? row?.nickname) === wanted;
      if (ids.includes(String(pid)) || sameName) ids.forEach((id) => aliases.add(id));
    }
  }
  return aliases;
}
function playerStat(r: any, pid: string, playerName?: string) {
  const aliases = playerAliases(r, pid, playerName);
  const statPools = [
    r?.payload?.stateSnapshot?.statsByPlayer,
    r?.resume?.state?.statsByPlayer,
    r?.summary?.statsByPlayer,
    r?.payload?.stats?.players,
    r?.summary?.perPlayer,
    r?.payload?.summary?.perPlayer,
  ];
  for (const pool of statPools) {
    if (pool && !Array.isArray(pool) && typeof pool === "object") {
      for (const alias of aliases) if ((pool as any)[alias]) return obj((pool as any)[alias]);
    }
    if (Array.isArray(pool)) {
      const hit = pool.find((x: any) => aliases.has(String(x?.id || x?.playerId || x?.profileId || x?.pid || "")) || (!!playerName && norm(x?.name ?? x?.playerName ?? x?.displayName) === norm(playerName)));
      if (hit) return obj(hit?.stats || hit?.special || hit);
    }
  }
  return {};
}
function recordHasPlayer(r: any, pid: string, playerName?: string) {
  if (Object.keys(playerStat(r, pid, playerName)).length) return true;
  const aliases = playerAliases(r, pid, playerName);
  return pools(r).some((pool: any) => Array.isArray(pool) && pool.some((p: any) => aliases.has(String(p?.id || p?.playerId || p?.profileId || p?.pid || "")) || (!!playerName && norm(p?.name ?? p?.playerName ?? p?.displayName) === norm(playerName))));
}
function matchesMode(r: any, mode: PremiumPartyStatsMode) {
  const blob = modeBlob(r);
  return MODE_META[mode].aliases.some((a) => blob.includes(norm(a)));
}
function modeHits(mode: PremiumPartyStatsMode, st: any) {
  if (mode === "pendu") return n(st.challengesPassed);
  if (mode === "menteur") return n(st.contractsProven);
  if (mode === "castle") return n(st.usefulHits);
  if (mode === "gotcha") return Math.max(0, n(st.darts) - n(st.misses));
  return n(st.validHits);
}
function commonRow(rec: any, st: any, mode: PremiumPartyStatsMode, pid: string, index: number) {
  const darts = n(st.darts || st.dartsThrown);
  const hits = modeHits(mode, st);
  return {
    id: String(rec?.id || rec?.matchId || `${mode}-${index}`),
    ts: playedAt(rec),
    label: fmtDate(playedAt(rec)),
    won: winnerId(rec) === String(pid),
    darts,
    visits: n(st.visits),
    hits,
    misses: n(st.misses),
    singles: n(st.singles),
    doubles: n(st.doubles),
    triples: n(st.triples),
    bulls: n(st.bulls),
    dbulls: n(st.dbulls),
    legsWon: n(st.legsWon),
    bestVisit: n(st.bestVisit),
    duration: n(rec?.summary?.durationMs || rec?.payload?.summary?.durationMs || (rec?.finishedAt && rec?.createdAt ? rec.finishedAt - rec.createdAt : 0)),
    st,
  };
}
function sum(rows: any[], field: string) { return rows.reduce((a, r) => a + n(r?.st?.[field]), 0); }
function max(rows: any[], field: string) { return rows.reduce((a, r) => Math.max(a, n(r?.st?.[field])), 0); }

function Card({ children, style }: any) {
  return <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(18,22,28,.82),rgba(7,9,13,.95))", boxShadow: "0 14px 34px rgba(0,0,0,.22)", padding: 13, minWidth: 0, ...style }}>{children}</div>;
}
function Kpi({ label, value, detail, color }: any) {
  return <Card style={{ padding: 12 }}><div style={{ color: MUTED, fontSize: 9.5, fontWeight: 950, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 24, fontWeight: 1100, lineHeight: 1 }}>{value}</div>{detail ? <div style={{ marginTop: 5, color: "#aab3bf", fontSize: 9 }}>{detail}</div> : null}</Card>;
}
function SectionTitle({ children, sub, accent }: any) {
  return <div style={{ marginBottom: 10 }}><div style={{ color: accent, fontSize: 12, fontWeight: 1100, letterSpacing: .75 }}>{children}</div>{sub ? <div style={{ marginTop: 2, color: MUTED, fontSize: 9 }}>{sub}</div> : null}</div>;
}
function tooltipStyle() { return { background: "#0b0e13", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10 }; }

function modeMetrics(mode: PremiumPartyStatsMode, rows: any[]) {
  if (mode === "castle") return [
    { name: "Construction", value: sum(rows, "builds"), fill: GOLD },
    { name: "Build hits", value: sum(rows, "buildHits"), fill: GREEN },
    { name: "Attaques", value: sum(rows, "attackHits"), fill: RED },
    { name: "Dégâts", value: sum(rows, "damage"), fill: MAGENTA },
  ];
  if (mode === "gotcha") return [
    { name: "GOTCHA", value: sum(rows, "gotchas"), fill: RED },
    { name: "Victimes", value: sum(rows, "victims"), fill: MAGENTA },
    { name: "BUST", value: sum(rows, "busts"), fill: GOLD },
    { name: "Finishes", value: sum(rows, "exactFinishes"), fill: GREEN },
  ];
  if (mode === "hare_hounds") return [
    { name: "Étapes", value: sum(rows, "steps"), fill: CYAN },
    { name: "Captures", value: sum(rows, "catches"), fill: RED },
    { name: "Évasions", value: sum(rows, "escapes"), fill: GREEN },
    { name: "Manches", value: sum(rows, "legsWon"), fill: GOLD },
  ];
  if (mode === "pendu") return [
    { name: "Défis posés", value: sum(rows, "challengesSet"), fill: GOLD },
    { name: "Réussis", value: sum(rows, "challengesPassed"), fill: GREEN },
    { name: "Ratés", value: sum(rows, "challengesFailed"), fill: RED },
    { name: "Erreurs", value: sum(rows, "errorsTaken"), fill: MAGENTA },
  ];
  return [
    { name: "Enchères", value: sum(rows, "raises"), fill: GOLD },
    { name: "MENTEUR !", value: sum(rows, "liarCalls"), fill: RED },
    { name: "Preuves", value: sum(rows, "contractsProven"), fill: GREEN },
    { name: "Mensonges", value: sum(rows, "liesCaught"), fill: MAGENTA },
  ];
}
function modeKpis(mode: PremiumPartyStatsMode, rows: any[], common: any) {
  const total = (field: string) => sum(rows, field);
  const peak = (field: string) => max(rows, field);
  if (mode === "castle") return [
    ["Constructions", total("builds"), `${total("buildHits")} touches build`, GOLD],
    ["Dégâts", total("damage"), `${total("attackHits")} touches attaque`, RED],
    ["Impact max", peak("bestImpactVisit") || peak("bestVisit"), "meilleure volée utile", MAGENTA],
  ];
  if (mode === "gotcha") return [
    ["GOTCHA", total("gotchas"), `${total("victims")} victime(s)`, RED],
    ["BUST", total("busts"), `${total("exactFinishes")} finish(es)`, GOLD],
    ["Best GOTCHA", peak("bestGotchaVisit") || peak("bestVisit"), `score max ${peak("highestScore")}`, MAGENTA],
  ];
  if (mode === "hare_hounds") return [
    ["Étapes", total("steps"), `${total("catches")} capture(s)`, CYAN],
    ["Évasions", total("escapes"), `${total("legsWon")} manche(s) gagnée(s)`, GREEN],
    ["Best volée", peak("bestVisitSteps"), `série ${peak("bestHitStreak")}`, GOLD],
  ];
  if (mode === "pendu") return [
    ["Défis réussis", total("challengesPassed"), `${total("challengesSet")} posé(s)`, GREEN],
    ["Erreurs", total("errorsTaken"), `${total("eliminations")} élimination(s)`, RED],
    ["Meilleure série", peak("bestSuccessStreak"), `${total("copySuccesses")} copie(s) réussie(s)`, GOLD],
  ];
  return [
    ["Enchères", total("raises"), `max ${peak("maxBid")}`, GOLD],
    ["MENTEUR !", total("liarCalls"), `${total("successfulCalls")} gagné(s)`, RED],
    ["Preuves", total("contractsProven"), `série ${peak("bestProofStreak")}`, GREEN],
  ];
}
function modeHistory(mode: PremiumPartyStatsMode, row: any) {
  const st = row.st || {};
  if (mode === "castle") return [n(st.builds), n(st.damage), n(st.bestImpactVisit)];
  if (mode === "gotcha") return [n(st.gotchas), n(st.victims), n(st.busts)];
  if (mode === "hare_hounds") return [n(st.steps), n(st.catches), n(st.escapes)];
  if (mode === "pendu") return [n(st.challengesPassed), n(st.errorsTaken), n(st.bestSuccessStreak)];
  return [n(st.raises), n(st.successfulCalls), n(st.contractsProven)];
}
function historyHeaders(mode: PremiumPartyStatsMode) {
  if (mode === "castle") return ["Builds", "Dégâts", "Impact max"];
  if (mode === "gotcha") return ["GOTCHA", "Victimes", "BUST"];
  if (mode === "hare_hounds") return ["Étapes", "Captures", "Évasions"];
  if (mode === "pendu") return ["Réussis", "Erreurs", "Série"];
  return ["Enchères", "Calls gagnés", "Preuves"];
}
function detailRows(mode: PremiumPartyStatsMode, rows: any[], common: any) {
  const s = (f: string) => sum(rows, f);
  const m = (f: string) => max(rows, f);
  if (mode === "castle") return [
    ["Touches utiles", s("usefulHits"), "Constructions", s("builds")],
    ["Touches build", s("buildHits"), "Touches attaque", s("attackHits")],
    ["Dégâts infligés", s("damage"), "Best dégâts / volée", m("bestDamageVisit")],
    ["Best build / volée", m("bestBuildVisit"), "Best impact", m("bestImpactVisit")],
    ["Meilleure série utile", m("bestUsefulStreak"), "Manches gagnées", common.legsWon],
  ];
  if (mode === "gotcha") return [
    ["Points marqués", s("points"), "GOTCHA", s("gotchas")],
    ["Victimes", s("victims"), "BUST", s("busts")],
    ["Finishes exacts", s("exactFinishes"), "Score max atteint", m("highestScore")],
    ["Best GOTCHA", m("bestGotchaVisit"), "Best volée", m("bestVisit")],
    ["Manches gagnées", common.legsWon, "Précision", `${common.accuracy}%`],
  ];
  if (mode === "hare_hounds") return [
    ["Étapes parcourues", s("steps"), "Captures", s("catches")],
    ["Évasions", s("escapes"), "Touches valides", s("validHits")],
    ["Best étapes / volée", m("bestVisitSteps"), "Meilleure série", m("bestHitStreak")],
    ["Manches gagnées", common.legsWon, "MISS", common.misses],
    ["Précision", `${common.accuracy}%`, "Fléchettes", common.darts],
  ];
  if (mode === "pendu") return [
    ["Défis posés", s("challengesSet"), "Défis réussis", s("challengesPassed")],
    ["Défis ratés", s("challengesFailed"), "Erreurs prises", s("errorsTaken")],
    ["Tentatives meneur", s("callerAttempts"), "Réussites meneur", s("callerSuccesses")],
    ["Tentatives copie", s("copyAttempts"), "Copies réussies", s("copySuccesses")],
    ["Éliminations", s("eliminations"), "Meilleure série", m("bestSuccessStreak")],
  ];
  return [
    ["Enchères", s("raises"), "Ouvertures", s("openingBids")],
    ["Enchère max", m("maxBid"), "MENTEUR !", s("liarCalls")],
    ["Calls gagnés", s("successfulCalls"), "Calls perdus", s("failedCalls")],
    ["Contrats tentés", s("contractsAttempted"), "Contrats prouvés", s("contractsProven")],
    ["Mensonges démasqués", s("liesCaught"), "Meilleure série preuve", m("bestProofStreak")],
  ];
}

export default function PartyModesStatsTabFull({
  records,
  playerId,
  playerName,
  mode,
}: {
  records: any[];
  playerId: string;
  playerName?: string;
  mode: PremiumPartyStatsMode;
}) {
  const meta = MODE_META[mode];
  const pid = String(playerId || "");
  const rows = React.useMemo(() => (Array.isArray(records) ? records : [])
    .filter((r: any) => matchesMode(r, mode) && recordHasPlayer(r, pid, playerName) && isFinished(r))
    .sort((a: any, b: any) => playedAt(a) - playedAt(b))
    .map((rec: any, index: number) => commonRow(rec, playerStat(rec, pid, playerName), mode, pid, index)),
  [records, pid, playerName, mode]);

  const common = React.useMemo(() => {
    const agg = rows.reduce((a: any, r: any) => {
      a.matches += 1; a.wins += r.won ? 1 : 0; a.darts += r.darts; a.visits += r.visits;
      a.hits += r.hits; a.misses += r.misses; a.singles += r.singles; a.doubles += r.doubles; a.triples += r.triples;
      a.bulls += r.bulls; a.dbulls += r.dbulls; a.legsWon += r.legsWon; a.duration += r.duration;
      return a;
    }, { matches:0,wins:0,darts:0,visits:0,hits:0,misses:0,singles:0,doubles:0,triples:0,bulls:0,dbulls:0,legsWon:0,duration:0 });
    agg.winRate = agg.matches ? Math.round((agg.wins / agg.matches) * 1000) / 10 : 0;
    agg.accuracy = agg.darts ? Math.round((Math.max(0, agg.hits) / agg.darts) * 1000) / 10 : 0;
    return agg;
  }, [rows]);

  const dartData = [
    { name: "Simple", value: common.singles, color: WHITE },
    { name: "Double", value: common.doubles, color: CYAN },
    { name: "Triple", value: common.triples, color: MAGENTA },
    { name: "Bull", value: common.bulls, color: GREEN },
    { name: "DBull", value: common.dbulls, color: "#2ef3a0" },
    { name: "Miss", value: common.misses, color: GOLD },
  ].filter((x) => x.value > 0);
  const impact = modeMetrics(mode, rows);
  const progression = rows.slice(-20).map((r: any, i: number) => ({
    match: i + 1,
    accuracy: r.darts ? Math.round((r.hits / r.darts) * 1000) / 10 : 0,
    primary: modeHistory(mode, r)[0],
    secondary: modeHistory(mode, r)[1],
    win: r.won ? 100 : 0,
  }));
  const specificKpis = modeKpis(mode, rows, common);
  const details = detailRows(mode, rows, common);
  const hh = historyHeaders(mode);

  if (!rows.length) return <Card><SectionTitle accent={meta.accent}>{meta.title} — statistiques détaillées</SectionTitle><div style={{ color: MUTED, fontSize: 12 }}>Aucune partie {meta.title} terminée enregistrée pour {playerName || "ce joueur"}.</div></Card>;

  return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 }}>
      <Kpi label="Parties" value={common.matches} detail={`${common.wins} victoire${common.wins > 1 ? "s" : ""}`} color={meta.accent} />
      <Kpi label="Taux de victoire" value={`${common.winRate}%`} color={GREEN} />
      <Kpi label="Précision" value={`${common.accuracy}%`} detail={`${common.hits}/${common.darts} touches utiles`} color={CYAN} />
      {specificKpis.map((k: any[]) => <Kpi key={k[0]} label={k[0]} value={k[1]} detail={k[2]} color={k[3] || meta.accent} />)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <Card>
        <SectionTitle accent={meta.accent} sub="Répartition des impacts enregistrés">TYPE DE TOUCHES</SectionTitle>
        <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><PieChart><Pie data={dartData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={50} outerRadius={90} paddingAngle={2}>{dartData.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip contentStyle={tooltipStyle()} /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer></div>
      </Card>
      <Card>
        <SectionTitle accent={meta.accent} sub={`Actions spécifiques ${meta.title}`}>IMPACT DU MODE</SectionTitle>
        <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><BarChart data={impact} margin={{ top: 8, right: 6, left: -20, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#9da6af", fontSize: 9 }} /><YAxis tick={{ fill: "#79828b", fontSize: 9 }} /><Tooltip contentStyle={tooltipStyle()} /><Bar dataKey="value" radius={[7,7,2,2]}>{impact.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer></div>
      </Card>
    </div>

    <Card>
      <SectionTitle accent={meta.accent} sub="20 dernières parties terminées">ÉVOLUTION</SectionTitle>
      <div style={{ width: "100%", height: 260 }}><ResponsiveContainer><LineChart data={progression} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.05)" /><XAxis dataKey="match" tick={{ fill: "#8f99a3", fontSize: 9 }} /><YAxis tick={{ fill: "#79828b", fontSize: 9 }} /><Tooltip contentStyle={tooltipStyle()} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="accuracy" name="Précision %" stroke={CYAN} strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="primary" name={hh[0]} stroke={meta.accent} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="secondary" name={hh[1]} stroke={MAGENTA} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
    </Card>

    <Card>
      <SectionTitle accent={meta.accent} sub="Cumul de l'historique sauvegardé">TABLEAU {meta.title}</SectionTitle>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, fontSize: 10 }}><thead><tr>{["Mesure","Valeur","Mesure","Valeur"].map((h,i)=><th key={`${h}-${i}`} style={{ textAlign:i%2?"right":"left",color:MUTED,padding:"7px 8px",borderBottom:"1px solid rgba(255,255,255,.08)" }}>{h}</th>)}</tr></thead><tbody>{[
        ...details,
        ["Simple / Double / Triple", `${common.singles} / ${common.doubles} / ${common.triples}`, "Bull / DBull / Miss", `${common.bulls} / ${common.dbulls} / ${common.misses}`],
        ["Manches gagnées", common.legsWon, "Temps cumulé", fmtDuration(common.duration)],
      ].map((r:any,idx)=><tr key={idx}>{r.map((v:any,j:number)=><td key={j} style={{padding:"8px",borderBottom:"1px solid rgba(255,255,255,.045)",textAlign:j%2?"right":"left",color:j%2?"#f3f7fb":"#aab3bd",fontWeight:j%2?1000:700}}>{v}</td>)}</tr>)}</tbody></table></div>
    </Card>

    <Card>
      <SectionTitle accent={meta.accent} sub="Parties les plus récentes">HISTORIQUE DE PERFORMANCE</SectionTitle>
      <div style={{ overflowX: "auto" }}><table style={{ width:"100%",borderCollapse:"collapse",minWidth:760,fontSize:9.5 }}><thead><tr>{["Date","Résultat","Darts",...hh,"Précision"].map((h)=><th key={h} style={{color:MUTED,textAlign:h==="Date"||h==="Résultat"?"left":"right",padding:"7px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>{h}</th>)}</tr></thead><tbody>{[...rows].reverse().slice(0,20).map((r:any)=>{const vals=modeHistory(mode,r);return <tr key={r.id}><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)"}}>{r.label}</td><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",color:r.won?GREEN:RED,fontWeight:1000}}>{r.won?"VICTOIRE":"DÉFAITE"}</td><td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",textAlign:"right",fontWeight:900}}>{r.darts}</td>{vals.map((v:any,i:number)=><td key={i} style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",textAlign:"right",fontWeight:900}}>{v}</td>)}<td style={{padding:7,borderBottom:"1px solid rgba(255,255,255,.045)",textAlign:"right",fontWeight:900}}>{r.darts?Math.round((r.hits/r.darts)*1000)/10:0}%</td></tr>})}</tbody></table></div>
    </Card>
  </div>;
}
