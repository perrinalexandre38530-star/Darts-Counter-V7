// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import DartsPokerCard from "../components/darts-poker/DartsPokerCard";
import DartsPokerBadge from "../components/darts-poker/DartsPokerBadge";
import type { DartsPokerBadgeId } from "../components/darts-poker/DartsPokerBadge";
import type { DartsPokerState } from "../lib/gameEngines/dartsPokerEngine";
import { deriveDartsPokerMatchMetrics, deriveDartsPokerMatchStory, deriveDartsPokerPlayerMetrics, deriveDartsPokerSectorHeatmap, pokerRound1 } from "../lib/dartsPokerAnalytics";

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#9aa1b2";
const PINK = "#ff63b8";

function playerName(profile: any) { return profile?.name || profile?.displayName || "Joueur"; }
function pct(value: number) { return `${pokerRound1(Number(value || 0))}%`; }
function button(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 14, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1050, cursor: "pointer" }; }
function fmt(value: any, digits = 1) { const n = Number(value || 0); return Number.isInteger(n) ? String(n) : n.toFixed(digits); }
function durationLabel(ms: number) { const total = Math.max(0, Math.round(Number(ms || 0) / 1000)); const min = Math.floor(total / 60); const sec = total % 60; return min ? `${min}m ${String(sec).padStart(2,"0")}s` : `${sec}s`; }
function Kpi({ label, value, color = GOLD, detail }: any) { return <div style={{ padding: 8, borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", minWidth: 0 }}><div style={{ color, fontSize: 15, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ color: SOFT, fontSize: 6.8, textTransform: "uppercase" }}>{label}</div>{detail ? <div style={{ color: "#747b8d", fontSize: 6.5, marginTop: 2 }}>{detail}</div> : null}</div>; }
function awardWinner(rows: any[], metric: (row: any) => number) { return [...rows].sort((a,b) => metric(b) - metric(a))[0] || null; }
const th: React.CSSProperties = { padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,.12)", whiteSpace: "nowrap", fontSize: 7.5, textTransform: "uppercase", letterSpacing: .25 };
const td: React.CSSProperties = { padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,.055)", whiteSpace: "nowrap", fontSize: 8.7, color: "#e6e9ef" };

export default function DartsPokerEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: DartsPokerState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const standings = state.standings || [];
  const analyticsRows = state.players.map((player: any) => {
    const standing = standings.find((row: any) => String(row.id) === String(player.id)) || {};
    const stats = state.statsByPlayer[player.id] || {};
    const metrics = deriveDartsPokerPlayerMetrics({ playerId: player.id, stats, rounds: state.rounds, visits: state.visits, contractsEnabled: state.config.contractsEnabled !== false });
    return { ...standing, ...stats, ...metrics, id: player.id, name: player.name, rank: standing.rank || 0 };
  }).sort((a,b) => Number(a.rank || 999) - Number(b.rank || 999));
  const durationMs = Math.max(0, Number(state.finishedAt || Date.now()) - Number(state.startedAt || Date.now()));
  const match = deriveDartsPokerMatchMetrics(analyticsRows, state.rounds, durationMs);
  const story = deriveDartsPokerMatchStory(state.rounds);
  const best = analyticsRows[0];
  const winnerProfile = best ? profilesById.get(String(best.id)) || best : null;
  const awards: Array<{ label: string; badgeId: DartsPokerBadgeId; color: string; row: any; value: (row: any) => string }> = [
    { label: "SHARK DE LA TABLE", badgeId: "shark", color: GOLD, row: awardWinner(analyticsRows, (r) => Number(r.points || 0)), value: (r: any) => `${fmt(r?.points)} pts` },
    { label: "TIREUR D'ÉLITE", badgeId: "sniper", color: GREEN, row: awardWinner(analyticsRows, (r) => Number(r.accuracy || 0)), value: (r: any) => pct(r?.accuracy) },
    { label: "CHASSEUR DE CONTRATS", badgeId: "contract_master", color: RED, row: awardWinner(analyticsRows, (r) => Number(r.contractHits || 0)), value: (r: any) => `${fmt(r?.contractHits)} / ${fmt(r?.contractsAttempted)}` },
    { label: "MAÎTRE DES POUVOIRS", badgeId: "power_player", color: PINK, row: awardWinner(analyticsRows, (r) => Number(r.powerUseRate || 0)), value: (r: any) => pct(r?.powerUseRate) },
    { label: "LUCKY JOKER", badgeId: "joker_master", color: BLUE, row: awardWinner(analyticsRows, (r) => Number(r.jokers || 0)), value: (r: any) => `${fmt(r?.jokers)} joker${Number(r?.jokers || 0) > 1 ? "s" : ""}` },
    { label: "SÉRIE DE FEU", badgeId: "power_player", color: "#ff9b52", row: awardWinner(analyticsRows, (r) => Number(r.bestHitStreak || 0)), value: (r: any) => `${fmt(r?.bestHitStreak)} hits` },
    { label: "MAÎTRE DE LA TABLE", badgeId: "table_leader", color: BLUE, row: awardWinner(analyticsRows, (r) => Number(r.leadRounds || 0)), value: (r: any) => `${fmt(r?.leadRounds)} manche${Number(r?.leadRounds || 0) > 1 ? "s" : ""}` },
    { label: "CLOSER", badgeId: "closer", color: GREEN, row: awardWinner(analyticsRows, (r) => Number(Boolean(r.closingRoundWin)) * 1000 + Number(r.lastThreePoints || 0)), value: (r: any) => `${fmt(r?.lastThreePoints)} pts · fin` },
  ];
  const signatureHands = analyticsRows.map((row: any) => {
    const roundRows = (state.rounds || []).flatMap((round: any) => (round?.rows || []).filter((item: any) => String(item?.playerId) === String(row.id)));
    const bestRound = roundRows.slice().sort((a: any, b: any) => Number(b?.evaluation?.score || 0) - Number(a?.evaluation?.score || 0))[0] || null;
    return { row, bestRound };
  }).filter((item: any) => item.bestRound);
  const targetMaps = analyticsRows.map((row: any) => {
    const sectors = deriveDartsPokerSectorHeatmap(row);
    const maxHits = Math.max(1, ...sectors.map((sector: any) => Number(sector.total || 0)));
    return { row, sectors, maxHits };
  });

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.92)", backdropFilter: "blur(10px)", overflow: "auto", padding: 8 }}>
    <div style={{ width: "min(1120px,100%)", margin: "8px auto", borderRadius: 24, padding: 14, background: "radial-gradient(circle at 50% 0%,rgba(232,58,67,.22),rgba(10,10,14,.985) 42%)", border: `1px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 1100, letterSpacing: 2 }}>SHOWDOWN FINAL</div>
        <div style={{ color: "#fff", fontSize: 25, fontWeight: 1200, marginTop: 2 }}>DARTS POKER</div>
        <div style={{ color: RED, fontSize: 12, fontWeight: 1000, marginTop: 3 }}>{state.winnerIds.length > 1 ? "ÉGALITÉ À LA TABLE" : `${best?.name || "Vainqueur"} remporte la partie`}</div>
      </div>

      {best ? <div style={{ marginTop: 11, padding: 10, borderRadius: 18, border: `1px solid ${GOLD}66`, background: `linear-gradient(135deg,${GOLD}14,${RED}10)`, display: "grid", gridTemplateColumns: "52px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}><ProfileAvatar profile={winnerProfile} size={48} /><div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 7.5, fontWeight: 1100, letterSpacing: .8 }}>TABLE CHAMPION</div><div style={{ color: "#fff", fontSize: 15, fontWeight: 1200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(winnerProfile)}</div><div style={{ color: SOFT, fontSize: 8.3, marginTop: 2 }}>{best.bestHandLabel || "—"} · {pct(best.accuracy)} précision · {fmt(best.handsWon)} manche{Number(best.handsWon) > 1 ? "s" : ""} gagnée{Number(best.handsWon) > 1 ? "s" : ""}</div></div><div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontSize: 25, fontWeight: 1200, lineHeight: 1 }}>{fmt(best.points)}</div><div style={{ color: SOFT, fontSize: 6.5 }}>POINTS</div></div></div> : null}

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 5 }}>
        <Kpi label="Manches" value={match.roundsPlayed} color={GOLD} />
        <Kpi label="Fléchettes" value={match.totalDarts} color={BLUE} />
        <Kpi label="Précision table" value={pct(match.accuracy)} color={GREEN} />
        <Kpi label="Cartes" value={match.cardsCollected} color={BLUE} />
        <Kpi label="Contrats" value={`${match.contractsCompleted}/${match.contractsAttempted}`} color={RED} />
        <Kpi label="Durée" value={durationLabel(match.durationMs)} color="#d4d8e5" />
        <Kpi label="S / D / T" value={`${match.singles}/${match.doubles}/${match.triples}`} color={BLUE} />
        <Kpi label="Bull / DB" value={`${match.bulls}/${match.dbulls}`} color={GOLD} />
        <Kpi label="MISS" value={match.totalMisses} color={RED} />
        <Kpi label="Pouvoirs" value={`${match.totalPowerUsed}/${match.totalPowerEarned}`} detail={pct(match.powerUseRate)} color={PINK} />
        <Kpi label="Jokers" value={match.jokers} color={RED} />
        <Kpi label="Best streak" value={match.bestHitStreak} color="#ff9b52" />
        <Kpi label="Pts / dart" value={fmt(match.pointsPerDart,3)} color={GOLD} />
        <Kpi label="Cartes / dart" value={fmt(match.cardsPerDart,2)} color={BLUE} />
        <Kpi label="Capture marché" value={pct(match.marketCaptureRate)} color={GREEN} />
        <Kpi label="Mains premium" value={pct(match.premiumHandRate)} color={RED} />
        <Kpi label="Bonus contrats" value={pct(match.contractPointShare)} detail="part des points" color={PINK} />
        <Kpi label="Meilleure main" value={match.bestHandLabel || "—"} color={GOLD} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: BLUE, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>LECTURE DU MATCH · RYTHME & PRESSION</div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 5 }}>
          <Kpi label="Changements leader" value={story.leadChanges} color={BLUE} />
          <Kpi label="Leaders différents" value={story.uniqueLeaders} color={GOLD} />
          <Kpi label="Plus grosse avance" value={`+${story.largestLead}`} color={GREEN} />
          <Kpi label="Marge finale" value={`+${story.finalMargin}`} color={GOLD} />
          <Kpi label="Comeback max" value={`${story.biggestComeback}`} detail="pts remontés" color={RED} />
          <Kpi label="Manche décisive" value={story.decidingRound ? `M${story.decidingRound}` : "—"} color={PINK} />
        </div>
        {story.race?.length ? <div style={{ marginTop: 7, padding: 8, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", overflowX: "auto" }}>
          <div style={{ minWidth: Math.max(420, story.race.length * 110), display: "grid", gridTemplateColumns: `repeat(${story.race.length},minmax(92px,1fr))`, gap: 5 }}>
            {story.race.map((step: any, index: number) => <div key={`race-${step.round}-${index}`} style={{ padding: 7, borderRadius: 11, border: `1px solid ${step.leaders.some((id: string) => state.winnerIds.includes(id)) ? GOLD : "rgba(255,255,255,.08)"}`, background: step.leaders.some((id: string) => state.winnerIds.includes(id)) ? `${GOLD}09` : "rgba(255,255,255,.018)" }}>
              <div style={{ color: SOFT, fontSize: 6.8, fontWeight: 1000 }}>M{step.round}</div>
              <div style={{ color: "#fff", fontSize: 8.2, fontWeight: 1100, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.leaders.map((id: string) => playerName(profilesById.get(String(id)) || state.players.find((p: any) => String(p.id) === String(id)))).join(" / ")}</div>
              <div style={{ color: GOLD, fontSize: 9.5, fontWeight: 1100, marginTop: 2 }}>{step.leaderPoints} pts</div>
              <div style={{ color: BLUE, fontSize: 6.8, marginTop: 1 }}>écart +{step.margin}</div>
            </div>)}
          </div>
        </div> : null}
      </div>

      {signatureHands.length ? <div style={{ marginTop: 12 }}>
        <div style={{ color: GOLD, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>MEILLEURES MAINS · DECK MSS SIGNATURE</div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 7 }}>
          {signatureHands.map(({ row, bestRound }: any) => {
            const profile = profilesById.get(String(row.id)) || row;
            return <div key={`hand-${row.id}`} style={{ padding: 9, borderRadius: 15, border: `1px solid ${Number(row.rank) === 1 ? GOLD : "rgba(255,255,255,.10)"}`, background: Number(row.rank) === 1 ? `${GOLD}0b` : "rgba(255,255,255,.025)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}><ProfileAvatar profile={profile} size={30} /><div style={{ minWidth: 0 }}><div style={{ color: "#fff", fontSize: 9.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: GOLD, fontSize: 7.5, marginTop: 1 }}>{bestRound?.evaluation?.label || row.bestHandLabel || "—"}</div></div></div><div style={{ color: SOFT, fontSize: 7 }}>M{bestRound?.round || "—"}</div></div>
              <div style={{ marginTop: 7, display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>{(bestRound?.bestFive || []).map((card: any, index: number) => <DartsPokerCard key={`${card?.id || index}-${index}`} card={card} size="small" />)}</div>
            </div>;
          })}
        </div>
      </div> : null}

      <div style={{ marginTop: 12 }}>
        <div style={{ color: BLUE, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>CARTOGRAPHIE CIBLE · 1 À 20</div>
        <div style={{ marginTop: 6, display: "grid", gap: 7 }}>{targetMaps.map(({ row, sectors, maxHits }: any) => {
          const profile = profilesById.get(String(row.id)) || row;
          return <div key={`target-${row.id}`} style={{ padding: 8, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><ProfileAvatar profile={profile} size={25} /><b style={{ color: "#fff", fontSize: 8.5 }}>{playerName(profile)}</b></div><div style={{ color: SOFT, fontSize: 7 }}>Bull {fmt(row.bulls)} · DB {fmt(row.dbulls)} · MISS {fmt(row.misses)}</div></div>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(10,minmax(0,1fr))", gap: 3 }}>{sectors.map((sector: any) => {
              const intensity = Number(sector.total || 0) / maxHits;
              return <div key={sector.sector} style={{ padding: "4px 2px", borderRadius: 7, textAlign: "center", border: `1px solid ${sector.total ? BLUE : "rgba(255,255,255,.08)"}44`, background: sector.total ? `rgba(85,199,255,${Math.min(.20,.035+intensity*.17)})` : "rgba(255,255,255,.015)" }}><div style={{ color: sector.total ? "#fff" : SOFT, fontSize: 7, fontWeight: 1000 }}>{sector.sector}</div><div style={{ color: BLUE, fontSize: 7.5, fontWeight: 1100 }}>{sector.total}</div></div>;
            })}</div>
          </div>;
        })}</div>
      </div>


      {(state.rounds || []).length ? <div style={{ marginTop: 12 }}>
        <div style={{ color: RED, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>FIL DU MATCH · MANCHE PAR MANCHE</div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 7 }}>
          {(state.rounds || []).map((round: any, roundIndex: number) => {
            const rows = [...(round?.rows || [])].sort((a: any, b: any) => Number(a?.rank || 999) - Number(b?.rank || 999));
            const winnerRows = rows.filter((row: any) => Number(row?.rank) === 1 || row?.win);
            const lead = winnerRows[0] || rows[0] || null;
            const profile = lead ? profilesById.get(String(lead.playerId)) || lead : null;
            return <div key={`round-${round?.round || roundIndex}`} style={{ padding: 9, borderRadius: 15, border: `1px solid ${winnerRows.length > 1 ? BLUE : GOLD}33`, background: "rgba(255,255,255,.022)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 7 }}>
                <div><div style={{ color: GOLD, fontSize: 8, fontWeight: 1100 }}>MANCHE {round?.round || roundIndex + 1}</div><div style={{ color: SOFT, fontSize: 6.8, marginTop: 1 }}>{round?.contract?.label ? `Contrat · ${round.contract.label}` : "Sans contrat"}</div></div>
                <div style={{ color: winnerRows.length > 1 ? BLUE : GREEN, fontSize: 7.5, fontWeight: 1100 }}>{winnerRows.length > 1 ? "ÉGALITÉ" : "GAGNANT"}</div>
              </div>
              {lead ? <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto", gap: 6, alignItems: "center" }}><ProfileAvatar profile={profile} size={28} /><div style={{ minWidth: 0 }}><div style={{ color: "#fff", fontSize: 8.8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{winnerRows.length > 1 ? winnerRows.map((row: any) => playerName(profilesById.get(String(row.playerId)) || row)).join(" / ") : playerName(profile)}</div><div style={{ color: GOLD, fontSize: 7.2, marginTop: 1 }}>{lead?.evaluation?.label || "—"}</div></div><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100 }}>+{fmt(lead?.pointsAwarded || 0)}</div></div> : null}
              {lead?.bestFive?.length ? <div style={{ marginTop: 7, display: "flex", gap: 3, overflowX: "auto" }}>{lead.bestFive.map((card: any, index: number) => <DartsPokerCard key={`${card?.id || index}-${index}`} card={card} size="mini" />)}</div> : null}
              <div style={{ marginTop: 7, display: "grid", gap: 3 }}>{rows.map((row: any) => {
                const rowProfile = profilesById.get(String(row.playerId)) || row;
                return <div key={`${round?.round}-${row?.playerId}`} style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr) auto auto", gap: 5, alignItems: "center", color: SOFT, fontSize: 6.9 }}><span style={{ color: Number(row?.rank) === 1 ? GOLD : SOFT, fontWeight: 1100 }}>#{row?.rank || "—"}</span><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(rowProfile)}</span><span>{row?.evaluation?.label || "—"}</span><span style={{ color: row?.contractCompleted ? GREEN : "#777" }}>{row?.contractCompleted ? "◆" : "·"}</span></div>;
              })}</div>
            </div>;
          })}
        </div>
      </div> : null}

      <div style={{ marginTop: 12, color: GOLD, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>TABLEAU COMPLET DES STATISTIQUES</div>
      <div style={{ marginTop: 6, overflowX: "auto", borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.02)" }}>
        <table style={{ width: "100%", minWidth: 3650, borderCollapse: "collapse" }}>
          <thead><tr style={{ color: GOLD, textAlign: "center" }}>
            {["#","Joueur","Pts","Base","Mains","V","Égal.","Win %","Podiums","Rang moy.","Lead","Lead %","Dealer V/T","Forme 3M","Rang σ","Best/Worst","Série V","Contrats","Contrat %","Bonus","Bonus %","Série contrat","Contrat→V","Darts","Hits","Préc.","S","D","T","Bull","DBull","Miss","Hit série","Miss série","Zones","Couv. cible","Seg. fav.","Cartes","Marché","Capture %","Auto","Pouvoir","Jokers","Cartes/dart","Choix E/U","Choix %","Éch. E/U","Éch. %","Pouvoir %","Best main","Force moy.","Médiane","Pire main","Constance","Fortes","Premium","Rang carte","Couleur","Pts/main","Pts/dart"].map((label) => <th key={label} style={th}>{label}</th>)}
          </tr></thead>
          <tbody>{analyticsRows.map((row: any) => {
            const profile = profilesById.get(String(row.id)) || row;
            const winner = Number(row.rank) === 1;
            return <tr key={row.id} style={{ background: winner ? `${GOLD}0d` : "transparent" }}>
              <td style={{ ...td, color: winner ? GOLD : "#fff", fontWeight: 1100, textAlign: "center" }}>#{row.rank || "—"}</td>
              <td style={{ ...td, position: "sticky", left: 0, zIndex: 1, background: winner ? "#211d12" : "#111116" }}><div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 135 }}><ProfileAvatar profile={profile} size={27} /><b style={{ color: winner ? GOLD : "#fff" }}>{playerName(profile)}</b></div></td>
              <td style={{ ...td, color: GOLD, fontWeight: 1100 }}>{fmt(row.points)}</td><td style={td}>{fmt(row.basePoints)}</td><td style={td}>{fmt(row.handsPlayed)}</td><td style={td}>{fmt(row.handsWon)}</td><td style={td}>{fmt(row.handsTied)}</td><td style={td}>{pct(row.handWinRate)}</td><td style={td}>{fmt(row.podiums)}</td><td style={td}>{row.averageRoundRank ? fmt(row.averageRoundRank) : "—"}</td><td style={td}>{fmt(row.leadRounds)}</td><td style={td}>{pct(row.leadRate)}</td><td style={td}>{fmt(row.dealerWins)}/{fmt(row.dealerRounds)}</td><td style={td}>{fmt(row.lastThreeWins)}V · {fmt(row.lastThreePoints)}pt</td><td style={td}>{fmt(row.roundRankStdDev,2)}</td><td style={td}>{row.bestRoundRank || "—"}/{row.worstRoundRank || "—"}</td><td style={td}>{fmt(row.bestRoundWinStreak)}</td>
              <td style={td}>{fmt(row.contractHits)}/{fmt(row.contractsAttempted)}</td><td style={td}>{pct(row.contractSuccessRate)}</td><td style={td}>+{fmt(row.contractBonusPoints)}</td><td style={td}>{pct(row.contractPointShare)}</td><td style={td}>{fmt(row.bestContractStreak)}</td><td style={td}>{fmt(row.contractWinRounds)} ({pct(row.contractWinRate)})</td>
              <td style={td}>{fmt(row.darts)}</td><td style={td}>{fmt(row.hits)}</td><td style={{ ...td, color: GREEN }}>{pct(row.accuracy)}</td><td style={td}>{fmt(row.singles)}</td><td style={td}>{fmt(row.doubles)}</td><td style={td}>{fmt(row.triples)}</td><td style={td}>{fmt(row.bulls)}</td><td style={td}>{fmt(row.dbulls)}</td><td style={{ ...td, color: row.misses ? RED : GREEN }}>{fmt(row.misses)}</td>
              <td style={td}>{fmt(row.bestHitStreak)}</td><td style={td}>{fmt(row.bestMissStreak)}</td><td style={td}>{fmt(row.physicalSectorsTouched)}/20</td><td style={td}>{pct(row.physicalSectorCoverageRate)}</td><td style={td}>{row.favoriteSegment} ×{fmt(row.favoriteSegmentHits)}</td>
              <td style={td}>{fmt(row.cardsCollected)}</td><td style={td}>{fmt(row.marketCards)}</td><td style={td}>{pct(row.marketCaptureRate)}</td><td style={td}>{fmt(row.autoDraws)}</td><td style={td}>{fmt(row.powerCards)}</td><td style={td}>{fmt(row.jokers)}</td><td style={td}>{fmt(row.cardsPerDart,2)}</td>
              <td style={td}>{fmt(row.choicesEarned)}/{fmt(row.choicesUsed)}</td><td style={td}>{pct(row.choiceUseRate)}</td><td style={td}>{fmt(row.exchangesEarned)}/{fmt(row.exchangesUsed)}</td><td style={td}>{pct(row.exchangeUseRate)}</td><td style={{ ...td, color: PINK }}>{pct(row.powerUseRate)}</td>
              <td style={{ ...td, color: GOLD }}>{row.bestHandLabel || "—"}</td><td style={td}>{row.averageCategoryRank ? `${fmt(row.averageCategoryRank)}/9` : "0/9"}</td><td style={td}>{fmt(row.medianHandScore)}</td><td style={td}>{fmt(row.worstHandScore)}</td><td style={td}>{pct(row.handConsistencyIndex)}</td><td style={td}>{fmt(row.strongHands)} ({pct(row.strongHandRate)})</td><td style={td}>{fmt(row.premiumHands)} ({pct(row.premiumHandRate)})</td>
              <td style={td}>{row.favoriteCardRank} ×{fmt(row.favoriteCardRankCount)}</td><td style={td}>{row.favoriteCardSuit} ×{fmt(row.favoriteCardSuitCount)}</td><td style={td}>{fmt(row.pointsPerHand,2)}</td><td style={td}>{fmt(row.pointsPerDart,3)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div style={{ marginTop: 5, color: "#6f7687", fontSize: 7.5, textAlign: "center" }}>← Fais glisser le tableau horizontalement pour consulter toutes les statistiques →</div>

      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        {awards.map((award) => { const row = award.row; const profile = row ? profilesById.get(String(row.id)) || row : null; return <div key={award.label} style={{ padding: 8, borderRadius: 13, background: `${award.color}0c`, border: `1px solid ${award.color}44`, display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 7, alignItems: "center" }}><div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.025)", border: `1px solid ${award.color}44`, boxShadow: `0 0 14px ${award.color}22` }}><DartsPokerBadge id={award.badgeId} size="100%" /></div><div style={{ minWidth: 0 }}><div style={{ color: award.color, fontSize: 6.8, fontWeight: 1100 }}>{award.label}</div><div style={{ color: "#fff", fontSize: 8.8, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile ? playerName(profile) : "—"}</div></div><div style={{ color: SOFT, fontSize: 7.8 }}>{award.value(row)}</div></div>; })}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <button onClick={onClose} style={button("#c9ced8")}>FERMER</button><button onClick={onReplay} style={button(RED)}>REJOUER</button><button onClick={onStats} style={button(GREEN)}>STATISTIQUES</button><button onClick={onHistory} style={button(GOLD)}>HISTORIQUE</button>
      </div>
    </div>
  </div>;
}
