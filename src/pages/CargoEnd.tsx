// @ts-nocheck
// =============================================================
// CARGO — écran de fin V6
// Podium premium, synthèse logistique, tableaux joueurs/équipes, télémétrie massive et graphiques.
// =============================================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { cargoArtLibrary } from "../components/cargo/cargoArt";
import {
  buildCargoMatchStats,
  buildCargoPlayerAdvancedStats,
  buildCargoTeamStats,
  cargoEventPresentation,
  cargoVariantLabel,
  computeCargoMissionGrade,
  type CargoState,
} from "../lib/gameEngines/cargoEngine";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import "../styles/cargo-end.css";
import "../styles/cargo-ui.css";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const PURPLE = "#d98cff";
const SOFT = "#aab1bf";
const PLAYER_COLORS = [ORANGE, BLUE, GREEN, GOLD, RED, PURPLE, "#ff63b8", "#d4d8e5"];
const TOOLTIP_STYLE: any = { background: "rgba(5,7,11,.97)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#fff", fontSize: 10, boxShadow: "0 10px 28px rgba(0,0,0,.38)" };

type EndTab = "summary" | "performance" | "darts" | "ranking" | "timeline";

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function n(value: any) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const seconds = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function gradeColor(grade: string) { return grade === "S" ? GOLD : grade === "A" ? BLUE : grade === "B" ? GREEN : grade === "C" ? "#d4d8e5" : RED; }
function shortScore(value: number) { return Math.abs(value) >= 10000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : String(Math.round(value)); }

function Kpi({ icon, label, value, detail, color = ORANGE }: any) {
  return <div className="cargo-end-kpi" style={{ "--kpi": color } as React.CSSProperties}>
    <span>{icon}</span><strong>{value}</strong><small>{label}</small>{detail ? <em>{detail}</em> : null}
  </div>;
}
function SectionTitle({ title, subtitle, color = ORANGE }: any) {
  return <div className="cargo-end-section-title" style={{ "--section": color } as React.CSSProperties}><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>;
}
function Ratio({ label, value, color = GREEN }: any) {
  const width = Math.max(0, Math.min(100, n(value)));
  return <div className="cargo-end-ratio"><div><span>{label}</span><b style={{ color }}>{Math.round(width)}%</b></div><div><i style={{ width: `${width}%`, background: color, boxShadow: `0 0 10px ${color}55` }} /></div></div>;
}

function Podium({ playerRows, teams, teamMode, parcel }: any) {
  const source = teamMode
    ? (teams || []).slice().sort((a: any, b: any) => n(a.rank || 999) - n(b.rank || 999)).slice(0, 3).map((team: any, index: number) => ({
        id: team.id,
        label: team.name,
        rank: team.rank || index + 1,
        score: n(team.score),
        detail: `${n(team.completedContracts)} contrats · ${n(team.pallets)} palettes`,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        team,
      }))
    : (playerRows || []).slice(0, 3).map((row: any, index: number) => ({
        id: row.player.id,
        label: playerName(row.profile),
        rank: n(row.standing.rank) || index + 1,
        score: row.score,
        detail: `${n(row.advanced.accuracy)}% précision · ${n(row.advanced.bestVisitScore)} best`,
        color: row.color,
        profile: row.profile,
      }));
  if (!source.length) return null;
  const byRank = new Map(source.map((entry: any) => [entry.rank, entry]));
  const ordered = [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean);
  return <section className="cargo-end-card cargo-end-podium-card">
    <SectionTitle title={teamMode ? "PODIUM DES ÉQUIPES" : "PODIUM FINAL"} subtitle={teamMode ? "classement collectif de la mission" : "les meilleures performances de la mission"} color={GOLD}/>
    <div className={`cargo-end-podium ${ordered.length === 1 ? "is-solo" : ""}`}>
      {ordered.map((entry: any) => <div key={entry.id} className={`cargo-end-podium-slot rank-${entry.rank}`} style={{ "--podium": entry.color } as React.CSSProperties}>
        <div className="cargo-end-podium-medal">{entry.rank === 1 ? "★" : `#${entry.rank}`}</div>
        <div className="cargo-end-podium-avatar">
          {entry.profile ? <ProfileAvatar profile={entry.profile} size={entry.rank === 1 ? 62 : 50}/> : <div className="cargo-end-team-emblem">{entry.rank}</div>}
        </div>
        <strong>{entry.label}</strong>
        <span>{entry.detail}</span>
        <div className="cargo-end-podium-score"><b>{entry.score}</b><small>{parcel ? "COLIS" : "KG"}</small></div>
      </div>)}
    </div>
  </section>;
}

function CargoFlowBar({ label, value, total, color, suffix = "" }: any) {
  const safeTotal = Math.max(1, n(total));
  const width = Math.max(0, Math.min(100, (n(value) / safeTotal) * 100));
  return <div className="cargo-end-flow-row">
    <div><span>{label}</span><b style={{ color }}>{n(value)}{suffix}</b></div>
    <div><i style={{ width: `${width}%`, background: color, boxShadow: `0 0 10px ${color}55` }}/></div>
  </div>;
}

export default function CargoEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: CargoState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const [tab, setTab] = React.useState<EndTab>("summary");
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const parcel = state.config.variant === "parcel_delivery";
  const teamMode = state.config.participantMode === "teams";
  const match = React.useMemo(() => buildCargoMatchStats(state), [state]);
  const teams = React.useMemo(() => buildCargoTeamStats(state), [state]);
  const duration = Math.max(0, n(state.finishedAt || Date.now()) - n(state.startedAt || Date.now()));

  const playerRows = React.useMemo(() => state.players.map((player: any, index: number) => {
    const stats = state.statsByPlayer[player.id] || {};
    const standing = state.standings.find((row: any) => String(row.id) === String(player.id)) || {};
    const profile = profilesById.get(String(player.id)) || player;
    const advanced = buildCargoPlayerAdvancedStats(state, String(player.id));
    return { player, profile, stats, standing, advanced, color: PLAYER_COLORS[index % PLAYER_COLORS.length], score: parcel ? n(stats.parcelsDelivered) : n(stats.totalWeight) };
  }).sort((a: any, b: any) => n(a.standing.rank || 999) - n(b.standing.rank || 999) || b.score - a.score), [state, profilesById, parcel]);

  const bestPlayer = [...playerRows].sort((a, b) => b.score - a.score)[0] || null;
  const winnerTeam = teamMode ? teams.find((row: any) => row.rank === 1) : null;
  const winnerLabel = teamMode
    ? (winnerTeam?.name || "Équipe gagnante")
    : (state.standings.find((row: any) => row.rank === 1)?.name || (bestPlayer ? playerName(bestPlayer.profile) : "Vainqueur"));
  const winnerScore = teamMode ? n(winnerTeam?.score) : n(state.standings.find((row: any) => row.rank === 1)?.score || bestPlayer?.score);
  const gradeTarget = teamMode ? winnerTeam?.playerIds?.[0] : state.standings.find((row: any) => row.rank === 1)?.id;
  const grade = computeCargoMissionGrade(state, gradeTarget);
  const gradeAccent = gradeColor(grade.grade);

  const scoreKey = parcel ? "parcelsDelivered" : "totalWeight";
  let cumulative = 0;
  const scoreSeries = state.visits.map((visit: any, index: number) => {
    cumulative += Math.max(0, n(visit?.after?.[scoreKey]) - n(visit?.before?.[scoreKey]));
    return { visit: index + 1, score: cumulative };
  });
  const roundScores = new Map<number, number>();
  state.visits.forEach((visit: any) => roundScores.set(n(visit.round), n(roundScores.get(n(visit.round))) + Math.max(0, n(visit?.after?.[scoreKey]) - n(visit?.before?.[scoreKey]))));
  const roundData = [...roundScores.entries()].map(([round, score]) => ({ round: `T${round}`, score }));

  const dartMix = [
    { name: "Simples", value: n(match.singles), color: ORANGE },
    { name: "Doubles", value: n(match.doubles), color: BLUE },
    { name: "Triples", value: n(match.triples), color: PURPLE },
    { name: "Bull", value: n(match.bulls), color: GREEN },
    { name: "DBull", value: n(match.dbulls), color: GOLD },
    { name: "MISS", value: n(match.misses), color: RED },
  ].filter((row) => row.value > 0);
  const accuracyData = playerRows.map((row: any) => ({ name: playerName(row.profile), accuracy: n(row.advanced.accuracy), color: row.color }));

  const eventRows = state.visits.flatMap((visit: any) => (visit.events || []).map((event: any) => ({ visit, event, presentation: cargoEventPresentation(event) }))).filter((item: any) => item.presentation.priority >= 2).reverse();
  const eventCounts = eventRows.reduce((acc: Record<string, number>, item: any) => { acc[item.event.type] = n(acc[item.event.type]) + 1; return acc; }, {});
  const lossTotal = n(match.lostWeight) + n(match.rejectedWeight);
  const scoreUnit = parcel ? "COLIS" : "KG";
  const heroArt = parcel ? cargoArtLibrary.colisCargo : cargoArtLibrary.chargementComplet;
  const logisticsArt = parcel ? cargoArtLibrary.colisCargo : cargoArtLibrary.paletteLogistique;
  const endContracts = parcel ? n(match.totalParcelDeliveries) : n(match.totalContracts);
  const endLosses = parcel ? n(match.misses) : lossTotal;
  const handledTotal = parcel ? Math.max(1, n(match.totalDarts)) : Math.max(1, n(match.handledWeight));
  const completedMissionUnits = parcel ? n(match.totalParcels) : n(match.totalWeight);
  const riskMissionUnits = parcel ? n(match.misses) : n(match.lostWeight) + n(match.rejectedWeight);
  const recordRows = [
    { label: parcel ? "Meilleure volée" : "Meilleure palette", value: parcel ? `${n(match.bestVisitScore)} colis` : `${n(match.bestPalletWeight)} kg`, color: GOLD },
    { label: "Meilleur tour", value: `${n(match.bestRoundScore)} ${scoreUnit.toLowerCase()}`, color: ORANGE },
    { label: "Plus longue série", value: `${n(match.longestSeries)} hits`, color: PURPLE },
    { label: "Meilleur streak", value: `${n(match.longestHitStreak)} hits`, color: GREEN },
    { label: "Marge de victoire", value: `${n(match.winnerMargin)} ${scoreUnit.toLowerCase()}`, color: BLUE },
    { label: "Volées sûres", value: `${n(match.safeVisitRate)}%`, color: GREEN },
  ];

  const tabs: { id: EndTab; label: string; icon: string }[] = [
    { id: "summary", label: "BILAN", icon: "🚚" },
    { id: "performance", label: "PERF", icon: "📈" },
    { id: "darts", label: "DARTS", icon: "🎯" },
    { id: "ranking", label: teamMode ? "ÉQUIPES" : "CLASSEMENT", icon: teamMode ? "👥" : "🏆" },
    { id: "timeline", label: "JOURNAL", icon: "↺" },
  ];

  return <div className="cargo-end-overlay">
    <section className="cargo-end-shell" style={{ "--grade": gradeAccent, "--score": parcel ? BLUE : ORANGE } as React.CSSProperties}>
      <header className="cargo-end-hero">
        <button type="button" className="cargo-end-close" onClick={onClose} aria-label="Fermer">×</button>
        <div className="cargo-end-hero-art" aria-hidden><img src={heroArt} alt="" /></div>
        <div className="cargo-end-result-pill">✓ MISSION TERMINÉE · {teamMode ? "MULTI ÉQUIPES" : state.players.length > 1 ? "MULTI" : "SOLO"}</div>
        <div className="cargo-end-hero-grid">
          <div className="cargo-end-grade"><span>GRADE</span><strong>{grade.grade}</strong><small>{grade.rating}/100</small></div>
          <div className="cargo-end-hero-copy">
            <h2>{winnerLabel}</h2>
            <p>{cargoVariantLabel(state.config.variant)} · {state.config.rounds} tours · {state.players.length} joueur{state.players.length > 1 ? "s" : ""}</p>
            <div className="cargo-end-score"><strong>{shortScore(winnerScore)}</strong><span>{scoreUnit} · SCORE GAGNANT</span></div>
          </div>
        </div>
        <div className="cargo-end-logistics-strip">
          <div className="cargo-end-logistics-art"><img src={logisticsArt} alt="" /></div>
          <div><span>{parcel ? "LIVRAISONS" : "PALETTES"}</span><strong>{parcel ? n(match.totalParcelDeliveries) : n(match.totalPallets)}</strong></div>
          <div><span>{parcel ? "BONUS COLIS" : "CONTRATS"}</span><strong>{parcel ? n(match.totalParcelBonuses) : endContracts}</strong></div>
          <div><span>{parcel ? "BEST VOLÉE" : "BEST PALETTE"}</span><strong>{parcel ? n(match.bestVisitScore) : n(match.bestPalletWeight)}</strong></div>
          <div><span>{parcel ? "MISS" : "PERTES"}</span><strong>{endLosses}</strong></div>
        </div>
      </header>

      <nav className="cargo-end-tabs" aria-label="Statistiques de fin de partie">
        {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}
      </nav>

      <main className="cargo-end-content">
        {tab === "summary" ? <div className="cargo-end-page">
          <SectionTitle title="BILAN DE MISSION" subtitle="résultat, efficacité et sécurité" color={GOLD} />
          <div className="cargo-end-kpi-grid is-primary">
            <Kpi icon="▣" label={parcel ? "COLIS" : "POIDS"} value={parcel ? match.totalParcels : `${match.totalWeight}`} detail={parcel ? `${match.totalParcelDeliveries} livraisons` : "kg transportés"} color={parcel ? BLUE : ORANGE} />
            <Kpi icon="◎" label="PRÉCISION" value={`${match.accuracy}%`} detail={`${match.totalHits}/${match.totalDarts}`} color={GREEN} />
            <Kpi icon="✦" label="MEILLEURE SÉRIE" value={match.longestSeries} detail={`streak ${match.longestHitStreak}`} color={PURPLE} />
            <Kpi icon="⏱" label="DURÉE" value={fmtDuration(duration)} detail={`${match.totalVisits} volées`} color="#d4d8e5" />
          </div>
          <Podium playerRows={playerRows} teams={teams} teamMode={teamMode} parcel={parcel} />
          <div className="cargo-end-grid-2">
            <section className="cargo-end-card"><SectionTitle title="ÉVOLUTION DE LA MISSION" subtitle="score cumulé volée après volée" color={ORANGE} /><div className="cargo-end-chart is-medium"><ResponsiveContainer width="100%" height="100%"><AreaChart data={scoreSeries}><defs><linearGradient id="cargoEndScore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={parcel ? BLUE : ORANGE} stopOpacity={.55}/><stop offset="1" stopColor={parcel ? BLUE : ORANGE} stopOpacity={.03}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="visit" hide/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Area type="monotone" dataKey="score" stroke={parcel ? BLUE : ORANGE} strokeWidth={2.2} fill="url(#cargoEndScore)"/></AreaChart></ResponsiveContainer></div></section>
            <section className="cargo-end-card"><SectionTitle title="QUALITÉ LOGISTIQUE" subtitle={`${grade.label}`} color={GREEN} /><Ratio label="Précision" value={grade.precision} color={GREEN}/><Ratio label="Contrats" value={grade.completion} color={ORANGE}/><Ratio label="Sécurité" value={grade.safety} color={BLUE}/><Ratio label="Efficacité" value={grade.efficiency} color={GOLD}/></section>
          </div>
          <div className="cargo-end-grid-2">
            <section className="cargo-end-card cargo-end-logistics-card">
              <SectionTitle title={parcel ? "FLUX DE LIVRAISON" : "BILAN DE CHARGEMENT"} subtitle={parcel ? "production, précision et interruptions" : "poids utile, pertes et refus"} color={ORANGE}/>
              {parcel ? <>
                <CargoFlowBar label="Colis livrés" value={completedMissionUnits} total={handledTotal} color={BLUE}/>
                <CargoFlowBar label="Touches utiles" value={match.totalHits} total={handledTotal} color={GREEN}/>
                <CargoFlowBar label="MISS" value={match.misses} total={handledTotal} color={RED}/>
                <CargoFlowBar label="Bonus colis" value={match.totalParcelBonuses} total={Math.max(1, completedMissionUnits)} color={GOLD}/>
              </> : <>
                <CargoFlowBar label="Poids conservé" value={match.totalWeight} total={handledTotal} color={GREEN} suffix=" kg"/>
                <CargoFlowBar label="Poids perdu" value={match.lostWeight} total={handledTotal} color={RED} suffix=" kg"/>
                <CargoFlowBar label="Poids refusé" value={match.rejectedWeight} total={handledTotal} color={GOLD} suffix=" kg"/>
                <CargoFlowBar label="Rétention" value={match.retentionRate} total={100} color={BLUE} suffix="%"/>
              </>}
              <div className="cargo-end-logistics-mini-grid">
                <div><span>{parcel ? "LIVRAISONS" : "CONTRATS"}</span><b>{parcel ? n(match.totalParcelDeliveries) : `${n(match.totalContracts)}/${n(match.contractAttempts)}`}</b></div>
                <div><span>{parcel ? "BONUS" : "FRAGILE"}</span><b>{parcel ? n(match.totalParcelBonuses) : `${n(match.fragileCompleted)}/${n(match.fragileCompleted) + n(match.fragileBroken)}`}</b></div>
                <div><span>{parcel ? "SANS MISS" : "URGENTS"}</span><b>{parcel ? `${n(match.noMissVisitRate)}%` : n(match.urgentCompleted)}</b></div>
                <div><span>{parcel ? "RISQUE" : "SURCHARGES"}</span><b>{parcel ? n(match.riskEvents) : n(match.overloads)}</b></div>
              </div>
            </section>
            <section className="cargo-end-card cargo-end-records-card">
              <SectionTitle title="RECORDS DE LA MISSION" subtitle="les marqueurs forts de cette partie" color={GOLD}/>
              <div className="cargo-end-record-wall">{recordRows.map((row) => <div key={row.label} style={{ "--record": row.color } as React.CSSProperties}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div>
            </section>
          </div>
          <div className="cargo-end-kpi-grid">
            <Kpi icon="✓" label="CONTRATS" value={parcel ? match.totalParcelDeliveries : match.totalContracts} detail={parcel ? `+${match.totalParcelBonuses} bonus` : `${match.contractCompletionRate}% réussite`} color={GREEN}/>
            <Kpi icon="⚙" label={parcel ? "BEST VOLÉE" : "BEST PALETTE"} value={parcel ? match.bestVisitScore : `${match.bestPalletWeight}`} detail={parcel ? "colis" : "kg"} color={GOLD}/>
            <Kpi icon="↗" label="VOLÉES PRODUCTIVES" value={`${match.productiveVisitRate}%`} detail={`${match.productiveVisits}/${match.totalVisits}`} color={BLUE}/>
            <Kpi icon="⚠" label="PERTES" value={parcel ? match.misses : lossTotal} detail={parcel ? "miss" : `${match.overloads} surcharge(s)`} color={lossTotal || match.misses ? RED : GREEN}/>
          </div>
        </div> : null}

        {tab === "performance" ? <div className="cargo-end-page">
          <section className="cargo-end-card"><SectionTitle title="TABLEAU DE PERFORMANCE" subtitle="score, précision, régularité, rendement et maîtrise" color={GOLD}/><div className="cargo-end-table-wrap"><table className="cargo-end-table"><thead><tr><th>JOUEUR</th><th>SCORE</th><th>PRÉC.</th><th>RENDT/D</th><th>CONS.</th><th>BEST V.</th><th>P90 V.</th><th>STREAK</th><th>CONTRATS</th><th>SÛR</th></tr></thead><tbody>{playerRows.map((row: any) => <tr key={row.player.id}><td><span className="cargo-end-table-player"><i style={{ background: row.color }}/>{playerName(row.profile)}</span></td><td><b style={{ color: parcel ? BLUE : ORANGE }}>{row.score}</b></td><td>{row.advanced.accuracy}%</td><td>{row.advanced.scorePerDart}</td><td>{row.advanced.consistency}%</td><td>{row.advanced.bestVisitScore}</td><td>{row.advanced.p90VisitScore}</td><td>{row.advanced.longestHitStreak}</td><td>{n(row.stats.completedContracts)} <small>/ {row.advanced.contractAttempts}</small></td><td>{row.advanced.safeVisitRate}%</td></tr>)}</tbody></table></div></section>
          <div className="cargo-end-kpi-grid">
            <Kpi icon="⚡" label="BEST VOLÉE" value={`${match.bestVisitScore} ${scoreUnit}`} detail={`top3 ${match.bestTop3VisitAverage}`} color={GOLD}/>
            <Kpi icon="▤" label="BEST TOUR" value={`${match.bestRoundScore} ${scoreUnit}`} detail={`P90 ${match.bestP90VisitScore}`} color={ORANGE}/>
            <Kpi icon="●" label="VOLÉES PARFAITES" value={match.perfectAccuracyVisits} detail={`${match.perfectAccuracyVisitRate}%`} color={GREEN}/>
            <Kpi icon="⌁" label="MOY. TOUCHES/V" value={match.avgHitsPerVisit} detail={`${match.noMissVisitRate}% sans miss`} color={BLUE}/>
            <Kpi icon="≈" label="RÉGULARITÉ" value={`${match.avgConsistency}%`} detail={`best ${match.bestConsistency}%`} color={PURPLE}/>
            <Kpi icon="✓" label="VOLÉES SÛRES" value={`${match.safeVisitRate}%`} detail={`${match.riskEvents} risque(s)`} color={GREEN}/>
          </div>
          <div className="cargo-end-grid-2">
            <section className="cargo-end-card"><SectionTitle title="MAÎTRISE DE LA VOLÉE" subtitle="précision selon la position de la fléchette" color={BLUE}/><Ratio label="1re dart" value={match.firstDartAccuracy} color={ORANGE}/><Ratio label="2e dart" value={match.secondDartAccuracy} color={BLUE}/><Ratio label="3e dart" value={match.thirdDartAccuracy} color={PURPLE}/><Ratio label="Dernière dart" value={match.lastDartAccuracy} color={GOLD}/></section>
            <section className="cargo-end-card"><SectionTitle title="PROFIL DES VOLÉES" subtitle="nombre de touches par volée" color={GREEN}/><div className="cargo-end-kpi-grid"><Kpi icon="0" label="0 TOUCHE" value={match.zeroHitVisits} color={RED}/><Kpi icon="1" label="1 TOUCHE" value={match.oneHitVisits} color={ORANGE}/><Kpi icon="2" label="2 TOUCHES" value={match.twoHitVisits} color={BLUE}/><Kpi icon="3" label="3 TOUCHES" value={match.threeHitVisits} color={GREEN}/></div></section>
          </div>
          <section className="cargo-end-card"><SectionTitle title="RENDEMENT PAR TOUR" subtitle="production totale de chaque tour" color={BLUE}/><div className="cargo-end-chart is-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={roundData}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="round" tick={{ fill: SOFT, fontSize: 8 }}/><YAxis tick={{ fill: SOFT, fontSize: 8 }}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="score" fill={parcel ? BLUE : ORANGE} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
        </div> : null}

        {tab === "darts" ? <div className="cargo-end-page">
          <div className="cargo-end-grid-2">
            <section className="cargo-end-card"><SectionTitle title="RÉPARTITION DES IMPACTS" subtitle={`${match.totalDarts} fléchettes`} color={BLUE}/><div className="cargo-end-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dartMix} dataKey="value" nameKey="name" innerRadius="53%" outerRadius="78%" paddingAngle={2}>{dartMix.map((item) => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/></PieChart></ResponsiveContainer><div className="cargo-end-donut-center"><strong>{match.accuracy}%</strong><small>PRÉCISION</small></div></div><div className="cargo-end-donut-legend">{dartMix.map((item) => <span key={item.name}><i style={{ background: item.color }}/>{item.name} <b>{item.value}</b></span>)}</div></section>
            <section className="cargo-end-card"><SectionTitle title="PRÉCISION PAR JOUEUR" subtitle="comparatif multi" color={GREEN}/><div className="cargo-end-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={accuracyData} layout="vertical"><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false}/><XAxis type="number" domain={[0,100]} hide/><YAxis type="category" dataKey="name" width={72} tick={{ fill: SOFT, fontSize: 8 }}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="accuracy" fill={GREEN} radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div></section>
          </div>
          <div className="cargo-end-kpi-grid">
            <Kpi icon="S" label="SIMPLES" value={match.singles} color={ORANGE}/><Kpi icon="D" label="DOUBLES" value={match.doubles} color={BLUE}/><Kpi icon="T" label="TRIPLES" value={match.triples} color={PURPLE}/><Kpi icon="◎" label="BULL / DBULL" value={match.bulls + match.dbulls} color={GOLD}/><Kpi icon="×" label="MISS" value={match.misses} detail={`${match.missRate}%`} color={RED}/><Kpi icon="⚡" label="POWER DARTS" value={`${match.powerDartRate}%`} detail={`x${match.avgHitMultiplier} moyen`} color={PURPLE}/><Kpi icon="✦" label="STREAK" value={match.longestHitStreak} color={GREEN}/><Kpi icon="◉" label="HAUTE VALEUR" value={`${match.highValueHitRate}%`} detail="T + DBull / touches" color={BLUE}/>
          </div>
        </div> : null}

        {tab === "ranking" ? <div className="cargo-end-page">
          {teamMode ? <>
            <section className="cargo-end-card"><SectionTitle title="CLASSEMENT DES ÉQUIPES" subtitle="score collectif + contribution des coéquipiers" color={GOLD}/><div className="cargo-end-team-list">{teams.map((team: any, index: number) => { const color = PLAYER_COLORS[index % PLAYER_COLORS.length]; return <div key={team.id} className="cargo-end-team" style={{ "--team": color } as React.CSSProperties}><div className="cargo-end-team-rank">#{team.rank}</div><div className="cargo-end-team-copy"><strong>{team.name}</strong><span>{team.completedContracts} contrats · {team.pallets} palettes · {team.accuracy}% précision</span><div>{(team.contributions || []).map((member: any) => <b key={member.id}>{member.name} {member.share}%</b>)}</div></div><div className="cargo-end-team-score"><strong>{team.score}</strong><small>{scoreUnit}</small></div></div>; })}</div></section>
            <section className="cargo-end-card"><SectionTitle title="CONTRIBUTIONS INDIVIDUELLES" subtitle="performance personnelle dans le score d'équipe" color={BLUE}/><PlayerList rows={playerRows} parcel={parcel} teamMode /></section>
          </> : <section className="cargo-end-card"><SectionTitle title="CLASSEMENT FINAL" subtitle="score, précision et efficacité" color={GOLD}/><PlayerList rows={playerRows} parcel={parcel} /></section>}
        </div> : null}

        {tab === "timeline" ? <div className="cargo-end-page">
          <div className="cargo-end-kpi-grid">
            <Kpi icon="✓" label="CONTRATS CHARGÉS" value={n(eventCounts.contract_complete)} color={GREEN}/><Kpi icon="★" label="CHARGES PARFAITES" value={n(eventCounts.perfect_load)} color={GOLD}/><Kpi icon="⚠" label="SURCHARGES" value={n(eventCounts.overload)} color={RED}/><Kpi icon="×" label="SÉRIES PERDUES" value={n(eventCounts.series_lost)} color={RED}/>
          </div>
          <section className="cargo-end-card"><SectionTitle title="JOURNAL DE MISSION" subtitle={`${state.visits.length} volées · événements majeurs`} color={BLUE}/><div className="cargo-end-timeline">{!eventRows.length ? <div className="cargo-end-empty">Aucun événement majeur enregistré.</div> : eventRows.slice(0, 80).map(({ visit, event, presentation }: any, index: number) => <div key={`${visit.id}-${index}`} className="cargo-end-event" style={{ "--event": presentation.color } as React.CSSProperties}><div className="cargo-end-event-icon">{presentation.icon}</div><div><strong>{presentation.title}</strong><span>{event.label}</span></div><small>T{visit.round}<br/>V{visit.visit}</small></div>)}</div></section>
        </div> : null}
      </main>

      <footer className="cargo-end-actions"><button className="is-muted" onClick={onClose}>× <span>FERMER</span></button><button className="is-red" onClick={onReplay}>↻ <span>REJOUER</span></button><button className="is-green" onClick={onStats}>⌁ <span>STATS</span></button><button className="is-gold" onClick={onHistory}>↺ <span>HISTORIQUE</span></button></footer>
    </section>
  </div>;
}

function PlayerList({ rows, parcel, teamMode = false }: any) {
  return <div className="cargo-end-player-list">{rows.map((row: any) => <div key={row.player.id} className="cargo-end-player-row" style={{ "--player": row.color } as React.CSSProperties}>
    <div className="cargo-end-player-rank">#{row.standing.rank || "—"}</div><ProfileAvatar profile={row.profile} size={42}/><div className="cargo-end-player-copy"><strong>{playerName(row.profile)}</strong><span>{teamMode && row.standing.teamName ? `${row.standing.teamName} · ` : ""}{row.advanced.accuracy}% · {row.advanced.scorePerDart}/{parcel ? "dart" : "dart"}</span><div><b>best {row.advanced.bestVisitScore}</b><b>streak {row.advanced.longestHitStreak}</b><b>{row.stats.completedContracts || 0} contrats</b><b>{row.advanced.productiveVisitRate}% prod.</b></div></div><div className="cargo-end-player-score"><strong>{row.score}</strong><small>{parcel ? "COLIS" : "KG"}</small></div>
  </div>)}</div>;
}
