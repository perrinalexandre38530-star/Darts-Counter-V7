// @ts-nocheck
import React from "react";
import { footballVariantLabel } from "../../lib/gameEngines/footballEngine";
import { buildFootballCareerProgress, buildFootballHeadToHead, buildFootballSectorProfileFromRecords, footballPerformanceRating, footballTacticalProfile } from "../../lib/footballInsights";

const GREEN = "#65e5aa", BLUE = "#35d0ff", RED = "#ff5b77", GOLD = "#ffd36b", SOFT = "#aeb8c9", WHITE = "#f7fbff";
const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const txt = (v: any) => String(v ?? "").trim();
const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 1000) / 10 : 0;
const playedAt = (r: any) => n(r?.finishedAt || r?.endedAt || r?.updatedAt || r?.createdAt);

function isFootball(r: any) {
  const tag = [r?.kind, r?.mode, r?.summary?.kind, r?.summary?.mode, r?.payload?.kind, r?.payload?.mode, r?.payload?.stats?.mode].map(v => txt(v).toLowerCase()).join("|");
  return tag.includes("football") && !tag.includes("babyfoot");
}
function pools(r: any) {
  return [r?.summary?.perPlayer, r?.payload?.summary?.perPlayer, r?.payload?.stats?.players, r?.summary?.rankings, r?.payload?.players, r?.summary?.players, r?.players].filter(Array.isArray);
}
function findRow(r: any, pid: string, pname?: string) {
  const found: any[] = [];
  for (const pool of pools(r)) {
    const x = pool.find((q: any) => txt(q?.id || q?.playerId || q?.profileId) === txt(pid)) || (pname ? pool.find((q: any) => txt(q?.name || q?.playerName).toLowerCase() === txt(pname).toLowerCase()) : null);
    if (x) found.push(x);
  }
  return found.reduce((a, x) => ({ ...a, ...x }), null);
}
function winnerIds(r: any) {
  return [r?.winnerIds, r?.summary?.winnerIds, r?.payload?.winnerIds, r?.winnerId, r?.summary?.winnerId].flatMap((v: any) => Array.isArray(v) ? v : v ? [v] : []).map(String);
}
function variantOf(r: any) { return r?.summary?.variant || r?.payload?.config?.variant || r?.payload?.variant || "match"; }
function scoreLineOf(r: any) { return txt(r?.summary?.scoreLine || r?.payload?.summary?.scoreLine || r?.scoreLine); }
function wonMatch(record: any, row: any, playerId: string) { return row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)); }
function drawMatch(record: any) { return Boolean(record?.summary?.draw || record?.payload?.summary?.draw); }
function rowAccuracy(row: any) { return n(row?.accuracy) || pct(n(row?.successfulActions), n(row?.darts)); }

function Kpi({ label, value, detail, color = GREEN }: any) {
  return <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", padding: 9, minWidth: 0 }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 19, fontWeight: 1150 }}>{value}</div>{detail ? <div style={{ marginTop: 2, color: "#818b9c", fontSize: 7.2 }}>{detail}</div> : null}</div>;
}
function Section({ title, children, accent = GREEN, right }: any) {
  return <section style={{ marginTop: 9, borderRadius: 17, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", padding: 9 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 7 }}><div style={{ color: accent, fontSize: 8.5, fontWeight: 1050, textTransform: "uppercase", letterSpacing: .6 }}>{title}</div>{right}</div>{children}</section>;
}
function RecordCard({ icon, label, value, detail, color = GOLD }: any) {
  return <div style={{ minWidth: 0, borderRadius: 12, padding: 8, border: `1px solid ${color}40`, background: `${color}0b` }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><span>{icon}</span><span style={{ color: SOFT, fontSize: 6.3, fontWeight: 950 }}>{label}</span></div><div style={{ marginTop: 4, color, fontSize: 17, fontWeight: 1200 }}>{value}</div>{detail ? <div style={{ marginTop: 2, color: SOFT, fontSize: 6.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div> : null}</div>;
}
function Bar({ label, value, max, color = GREEN, detail }: any) {
  const width = max > 0 ? Math.min(100, n(value) / max * 100) : 0;
  return <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr) 48px", gap: 6, alignItems: "center" }}><div style={{ color: "#c7cfda", fontSize: 7.4, fontWeight: 900 }}>{label}</div><div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 999 }} /></div><div style={{ textAlign: "right", color, fontSize: 8.2, fontWeight: 1000 }}>{value}{detail || ""}</div></div>;
}

export default function FootballStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState("all");
  const now = Date.now();
  const ranges: any = { day: 86400000, week: 7 * 86400000, month: 31 * 86400000, year: 366 * 86400000 };
  const footballRecords = (records || []).filter(isFootball);
  const matches = footballRecords.map((record: any) => ({ record, row: findRow(record, playerId, playerName) })).filter((x: any) => x.row).filter((x: any) => range === "all" || playedAt(x.record) >= now - ranges[range]).sort((a: any, b: any) => playedAt(b.record) - playedAt(a.record));
  const rows = matches.map((x: any) => x.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }: any) => wonMatch(record, row, playerId)).length;
  const draws = matches.filter(({ record }: any) => drawMatch(record)).length;
  const losses = Math.max(0, games - wins - draws);
  const sum = (key: string) => rows.reduce((s: number, r: any) => s + n(r?.[key]), 0);
  const darts = sum("darts"), hits = sum("hits"), actions = sum("successfulActions"), goals = sum("goals"), shots = sum("shots"), onTarget = sum("shotsOnTarget"), saves = sum("saves"), tackles = sum("tackles"), interceptions = sum("interceptions"), advances = sum("advances"), passes = sum("passes"), posWins = sum("possessionWins"), clearances = sum("clearances"), counters = sum("counterAttacks"), penaltiesScored = sum("penaltiesScored"), penaltiesMissed = sum("penaltiesMissed");
  const attackVisits = sum("attackVisits"), defenseVisits = sum("defenseVisits"), goalkeeperVisits = sum("goalkeeperVisits"), penaltyVisits = sum("penaltyVisits");
  const accuracy = pct(actions, darts);
  const conversion = pct(goals, shots);
  const onTargetRate = pct(onTarget, shots);
  const saveRate = pct(saves, Math.max(1, goalkeeperVisits));
  const defenseEfficiency = pct(interceptions, Math.max(1, defenseVisits));
  const possessionEfficiency = pct(posWins, Math.max(1, defenseVisits));
  const avgGoals = games ? Math.round(goals / games * 100) / 100 : 0;
  const avgInterceptions = games ? Math.round(interceptions / games * 100) / 100 : 0;

  const best = (key: string, mapper = (v: any) => n(v)) => matches.reduce((acc: any, item: any) => mapper(item.row?.[key]) > mapper(acc?.row?.[key]) ? item : acc, null);
  const bestAccuracy = matches.reduce((acc: any, item: any) => rowAccuracy(item.row) > rowAccuracy(acc?.row) ? item : acc, null);
  const bestGoals = best("goals"), bestSaves = best("saves"), bestInterceptions = best("interceptions"), bestProgress = best("bestProgress"), bestShots = best("shotsOnTarget");
  const chronological = [...matches].sort((a, b) => playedAt(a.record) - playedAt(b.record));
  let currentStreak = 0, bestStreak = 0, currentUnbeaten = 0, bestUnbeaten = 0;
  chronological.forEach(({ record, row }: any) => {
    const won = wonMatch(record, row, playerId), draw = drawMatch(record);
    if (won) { currentStreak += 1; bestStreak = Math.max(bestStreak, currentStreak); } else if (!draw) currentStreak = 0;
    if (won || draw) { currentUnbeaten += 1; bestUnbeaten = Math.max(bestUnbeaten, currentUnbeaten); } else currentUnbeaten = 0;
  });

  const variants: any = {};
  matches.forEach(({ record, row }: any) => { const v = variantOf(record); const item = variants[v] || (variants[v] = { games: 0, wins: 0, goals: 0 }); item.games += 1; item.goals += n(row?.goals); if (wonMatch(record, row, playerId)) item.wins += 1; });
  const impacts: any = { Simple: sum("singles"), Double: sum("doubles"), Triple: sum("triples"), Bull: sum("bulls"), DBull: sum("dbulls"), Miss: sum("misses") };
  const maxImpact = Math.max(1, ...Object.values(impacts).map(n));

  const trend = matches.slice(0, 12).reverse();
  const recentFive = matches.slice(0, 5);
  const recentPoints = recentFive.reduce((total: number, { record, row }: any) => total + (wonMatch(record, row, playerId) ? 3 : drawMatch(record) ? 1 : 0), 0);
  const favoriteVariant = Object.entries(variants).sort((a: any, b: any) => b[1].games - a[1].games)[0];
  const headToHead = buildFootballHeadToHead(footballRecords, playerId, playerName).slice(0, 6);
  const career = buildFootballCareerProgress(footballRecords, playerId, playerName);
  const averageRating = rows.length ? Math.round((rows.reduce((total: number, row: any) => total + footballPerformanceRating(row), 0) / rows.length) * 10) / 10 : 0;
  const tactical = footballTacticalProfile({ darts, hits, successfulActions: actions, goals, shots, shotsOnTarget: onTarget, saves, tackles, interceptions, advances, passes, possessionWins: posWins, clearances, counterAttacks: counters, attackVisits, defenseVisits, goalkeeperVisits });
  const sectorProfile = buildFootballSectorProfileFromRecords(matches.map((item: any) => item.record), playerId);
  const sectorMax = Math.max(1, ...sectorProfile.sectors.map((sector: any) => n(sector.missionHits)));

  return <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", overflowX: "hidden" }}>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[["all", "Tout"], ["day", "24 h"], ["week", "7 j"], ["month", "30 j"], ["year", "1 an"]].map(([key, label]) => <button key={key} onClick={() => setRange(key)} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${range === key ? GREEN : "rgba(255,255,255,.10)"}`, background: range === key ? `${GREEN}18` : "rgba(255,255,255,.03)", color: range === key ? GREEN : SOFT, fontWeight: 1000, fontSize: 8 }}>{label}</button>)}</div>

    {!games ? <div style={{ marginTop: 14, borderRadius: 18, padding: 18, textAlign: "center", color: SOFT, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>Aucune partie DARTS FOOTBALL exploitable pour ce joueur.</div> : <>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        <Kpi label="Parties" value={games} detail={`${wins}V · ${draws}N · ${losses}D`} />
        <Kpi label="Victoires" value={`${pct(wins, games)}%`} detail={`${bestStreak} victoire${bestStreak > 1 ? "s" : ""} de suite`} color={GREEN} />
        <Kpi label="Buts" value={goals} detail={`${avgGoals}/match · ${conversion}% conversion`} color={GOLD} />
        <Kpi label="Précision" value={`${accuracy}%`} detail={`${actions}/${darts} actions`} color={BLUE} />
        <Kpi label="Note moyenne" value={averageRating.toFixed(1)} detail="performance / 10" color={GOLD} />
        <Kpi label="Tirs cadrés" value={onTarget} detail={`${onTargetRate}% des tirs`} color={GOLD} />
        <Kpi label="Interceptions" value={interceptions} detail={`${avgInterceptions}/match · ${tackles} tacles`} color={RED} />
        <Kpi label="Arrêts" value={saves} detail={`${saveRate}% estimé`} color={BLUE} />
        <Kpi label="Progression" value={advances} detail={`${posWins} possessions · ${counters} contres`} color={GREEN} />
      </div>

      <Section title="Efficacité par phase" accent={GREEN}>
        <div style={{ display: "grid", gap: 7 }}>
          <Bar label="Actions réussies" value={accuracy} max={100} color={GREEN} detail="%" />
          <Bar label="Conversion tirs" value={conversion} max={100} color={GOLD} detail="%" />
          <Bar label="Tirs cadrés" value={onTargetRate} max={100} color={BLUE} detail="%" />
          <Bar label="Défense / interceptions" value={defenseEfficiency} max={100} color={RED} detail="%" />
          <Bar label="Possessions gagnées" value={possessionEfficiency} max={100} color={GREEN} detail="%" />
          <Bar label="Gardien / arrêts" value={saveRate} max={100} color={BLUE} detail="%" />
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
          <Kpi label="Volées attaque" value={attackVisits} color={GREEN} />
          <Kpi label="Volées défense" value={defenseVisits} color={RED} />
          <Kpi label="Volées gardien" value={goalkeeperVisits} color={BLUE} />
          <Kpi label="Volées penalty" value={penaltyVisits} color={GOLD} />
        </div>
      </Section>

      <Section title="ADN tactique" accent="#a78bfa" right={<span style={{ color: tactical.color, fontSize: 7, fontWeight: 1050 }}>{tactical.icon} {tactical.label}</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>
          {[["ATTAQUE", tactical.attaque, GREEN], ["FINITION", tactical.finition, GOLD], ["DÉFENSE", tactical.defense, RED], ["GARDIEN", tactical.gardien, BLUE], ["CONTRÔLE", tactical.controle, "#a78bfa"]].map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, borderRadius: 12, padding: "8px 5px", textAlign: "center", border: `1px solid ${color}35`, background: `${color}08` }}><strong style={{ display: "block", color, fontSize: 16 }}>{value}</strong><span style={{ color: SOFT, fontSize: 5.6, fontWeight: 950 }}>{label}</span><div style={{ marginTop: 5, height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><span style={{ display: "block", width: `${value}%`, height: "100%", background: color }} /></div></div>)}
        </div>
      </Section>

      <Section title="Carte de cible Football" accent={GREEN} right={<span style={{ color: SOFT, fontSize: 7 }}>{sectorProfile.missionHits}/{sectorProfile.totalDarts} fléchettes utiles · {sectorProfile.missionRate}%</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>
          {sectorProfile.sectors.map((sector: any) => { const intensity = sector.missionHits / sectorMax; const active = sector.darts > 0; return <div key={sector.sector} title={`${sector.darts} fléchettes · ${sector.missionHits} actions utiles · ${sector.doubles} doubles · ${sector.triples} triples`} style={{ minWidth: 0, minHeight: 42, borderRadius: 11, padding: "5px 4px", textAlign: "center", border: `1px solid ${active ? GREEN : "rgba(255,255,255,.07)"}${active ? "55" : ""}`, background: active ? `rgba(101,229,170,${0.035 + intensity * 0.14})` : "rgba(255,255,255,.018)" }}><strong style={{ display: "block", color: active ? (intensity >= .75 ? GOLD : GREEN) : "#657080", fontSize: 12 }}>{sector.sector}</strong><span style={{ color: SOFT, fontSize: 5.2 }}>{sector.missionHits} utile{sector.missionHits > 1 ? "s" : ""}</span><div style={{ color: "#7e8999", fontSize: 4.9 }}>{sector.doubles}D · {sector.triples}T</div></div>; })}
        </div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
          <Kpi label="Zone forte" value={sectorProfile.strongestSector?.sector || "—"} detail={sectorProfile.strongestSector ? `${sectorProfile.strongestSector.missionHits} actions utiles` : "pas assez de données"} color={GOLD} />
          <Kpi label="Bull" value={sectorProfile.bull} detail="bull extérieur" color={BLUE} />
          <Kpi label="DBull" value={sectorProfile.dbull} detail="bull intérieur" color={GOLD} />
          <Kpi label="Miss" value={sectorProfile.misses} detail={`${pct(sectorProfile.misses, sectorProfile.totalDarts)}% des fléchettes`} color={RED} />
        </div>
      </Section>

      <Section title="Records personnels Darts Football" accent={GOLD}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
          <RecordCard icon="⚽" label="BUTS / MATCH" value={n(bestGoals?.row?.goals)} detail={bestGoals ? `${new Date(playedAt(bestGoals.record)).toLocaleDateString("fr-FR")} · ${scoreLineOf(bestGoals.record)}` : "—"} color={GOLD} />
          <RecordCard icon="🧤" label="ARRÊTS / MATCH" value={n(bestSaves?.row?.saves)} detail={bestSaves ? new Date(playedAt(bestSaves.record)).toLocaleDateString("fr-FR") : "—"} color={BLUE} />
          <RecordCard icon="🛡️" label="INTERCEPTIONS / MATCH" value={n(bestInterceptions?.row?.interceptions)} detail={bestInterceptions ? new Date(playedAt(bestInterceptions.record)).toLocaleDateString("fr-FR") : "—"} color={RED} />
          <RecordCard icon="🎯" label="MEILLEURE PRÉCISION" value={`${Math.round(rowAccuracy(bestAccuracy?.row) * 10) / 10}%`} detail={bestAccuracy ? new Date(playedAt(bestAccuracy.record)).toLocaleDateString("fr-FR") : "—"} color={GREEN} />
          <RecordCard icon="🚀" label="PROGRESSION MAX" value={`+${n(bestProgress?.row?.bestProgress)}`} detail="zones sur une volée" color={GREEN} />
          <RecordCard icon="🥅" label="CADRÉS / MATCH" value={n(bestShots?.row?.shotsOnTarget)} detail={bestShots ? new Date(playedAt(bestShots.record)).toLocaleDateString("fr-FR") : "—"} color={GOLD} />
          <RecordCard icon="🔥" label="SÉRIE DE VICTOIRES" value={bestStreak} detail="record consécutif" color={RED} />
          <RecordCard icon="🧱" label="SÉRIE SANS DÉFAITE" value={bestUnbeaten} detail="victoires + nuls" color={BLUE} />
          <RecordCard icon="🏟️" label="FORMAT FAVORI" value={favoriteVariant ? footballVariantLabel(favoriteVariant[0] as any) : "—"} detail={favoriteVariant ? `${favoriteVariant[1].games} partie${favoriteVariant[1].games > 1 ? "s" : ""}` : "—"} color={BLUE} />
        </div>
      </Section>

      <Section title="Progression carrière" accent={GOLD} right={<span style={{ color: SOFT, fontSize: 7 }}>{career.snapshot.games} matchs · {career.snapshot.wins} victoires</span>}>
        <div style={{ display: "grid", gap: 7 }}>{career.next.map((milestone: any) => <div key={`${milestone.key}-${milestone.target}`} style={{ display: "grid", gridTemplateColumns: "105px minmax(0,1fr) 62px", gap: 7, alignItems: "center" }}><div style={{ color: WHITE, fontSize: 7.2, fontWeight: 950, whiteSpace: "nowrap" }}>{milestone.icon} {milestone.label}</div><div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ width: `${milestone.progress}%`, height: "100%", borderRadius: 999, background: GOLD }} /></div><div style={{ textAlign: "right", color: GOLD, fontSize: 7.4, fontWeight: 1050 }}>{milestone.value}/{milestone.target}</div></div>)}</div>
        {career.achieved.length ? <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>{career.achieved.map((milestone: any) => <span key={`${milestone.key}-${milestone.target}`} style={{ borderRadius: 999, padding: "5px 7px", border: `1px solid ${GREEN}44`, background: `${GREEN}0b`, color: GREEN, fontSize: 6.2, fontWeight: 1000 }}>{milestone.icon} {milestone.target} {milestone.label}</span>)}</div> : null}
      </Section>

      <Section title="Forme récente" accent={GREEN} right={<span style={{ color: SOFT, fontSize: 7 }}>{recentFive.length ? `${recentPoints}/${recentFive.length * 3} pts sur les 5 derniers` : "12 derniers matchs"}</span>}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, trend.length)},minmax(22px,1fr))`, gap: 4, overflowX: "auto" }}>{trend.map(({ record, row }: any, index: number) => { const won = wonMatch(record, row, playerId), draw = drawMatch(record); const color = won ? GREEN : draw ? GOLD : RED; return <div key={record?.id || index} title={scoreLineOf(record)} style={{ minWidth: 22, height: 34, borderRadius: 9, display: "grid", placeItems: "center", border: `1px solid ${color}66`, background: `${color}12`, color, fontSize: 8, fontWeight: 1100 }}>{won ? "V" : draw ? "N" : "D"}</div>; })}</div>
      </Section>

      {headToHead.length ? <Section title="Confrontations directes" accent={RED} right={<span style={{ color: SOFT, fontSize: 7 }}>adversaires les plus rencontrés</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{headToHead.map((duel: any) => <div key={duel.opponent} style={{ minWidth: 0, borderRadius: 13, padding: 8, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(135deg,rgba(255,91,119,.055),rgba(53,208,255,.035))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 7, alignItems: "center" }}><strong style={{ minWidth: 0, color: WHITE, fontSize: 8.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚔️ {duel.opponent}</strong><span style={{ color: SOFT, fontSize: 6.2 }}>{duel.games} match{duel.games > 1 ? "s" : ""}</span></div>
          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, textAlign: "center" }}><div><strong style={{ color: GREEN, fontSize: 12 }}>{duel.wins}</strong><div style={{ color: SOFT, fontSize: 5.5 }}>V</div></div><div><strong style={{ color: GOLD, fontSize: 12 }}>{duel.draws}</strong><div style={{ color: SOFT, fontSize: 5.5 }}>N</div></div><div><strong style={{ color: RED, fontSize: 12 }}>{duel.losses}</strong><div style={{ color: SOFT, fontSize: 5.5 }}>D</div></div><div><strong style={{ color: BLUE, fontSize: 12 }}>{pct(duel.wins, duel.games)}%</strong><div style={{ color: SOFT, fontSize: 5.5 }}>WIN</div></div></div>
          <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", gap: 8, color: SOFT, fontSize: 6.1 }}><span>{duel.goals} buts marqués</span><span>{duel.lastPlayedAt ? new Date(duel.lastPlayedAt).toLocaleDateString("fr-FR") : ""}</span></div>
        </div>)}</div>
      </Section> : null}

      <Section title="Variantes" accent={BLUE}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>{Object.entries(variants).map(([key, value]: any) => <div key={key} style={{ borderRadius: 12, padding: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}><div style={{ color: WHITE, fontSize: 8.5, fontWeight: 1050 }}>{footballVariantLabel(key as any)}</div><div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3, textAlign: "center" }}><div><strong style={{ color: BLUE }}>{value.games}</strong><div style={{ color: SOFT, fontSize: 5.8 }}>MATCHS</div></div><div><strong style={{ color: GREEN }}>{pct(value.wins, value.games)}%</strong><div style={{ color: SOFT, fontSize: 5.8 }}>WIN</div></div><div><strong style={{ color: GOLD }}>{value.goals}</strong><div style={{ color: SOFT, fontSize: 5.8 }}>BUTS</div></div></div></div>)}</div>
      </Section>

      <Section title="Répartition des impacts" accent={BLUE}>
        <div style={{ display: "grid", gap: 6 }}>{Object.entries(impacts).map(([key, value]: any) => <Bar key={key} label={key} value={value} max={maxImpact} color={key === "DBull" ? GOLD : key === "Bull" ? BLUE : key === "Miss" ? RED : GREEN} />)}</div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
          <Kpi label="Dégagements" value={clearances} color={RED} />
          <Kpi label="Contres" value={counters} color={GREEN} />
          <Kpi label="Penalties marqués" value={penaltiesScored} color={GOLD} />
          <Kpi label="Penalties ratés" value={penaltiesMissed} color={RED} />
        </div>
      </Section>

      <Section title="Parties récentes" accent={GOLD}>
        <div style={{ display: "grid", gap: 6 }}>{matches.slice(0, 15).map(({ record, row }: any, index: number) => { const won = wonMatch(record, row, playerId), draw = drawMatch(record), variant = variantOf(record), resultColor = won ? GREEN : draw ? GOLD : RED; return <div key={record?.id || index} style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: 8, borderRadius: 13, border: `1px solid ${resultColor}45`, background: `${resultColor}08` }}><div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `${resultColor}22`, color: resultColor, fontSize: 8, fontWeight: 1150 }}>{won ? "V" : draw ? "N" : "D"}</div><div style={{ minWidth: 0 }}><div style={{ color: WHITE, fontWeight: 1000, fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scoreLineOf(record) || footballVariantLabel(variant)}</div><div style={{ color: SOFT, fontSize: 6.8 }}>{new Date(playedAt(record) || Date.now()).toLocaleDateString("fr-FR")} · {footballVariantLabel(variant)} · {n(row?.darts)} fléchettes</div></div><div style={{ textAlign: "right" }}><strong style={{ color: GOLD, fontSize: 14 }}>{footballPerformanceRating(row).toFixed(1)}</strong><div style={{ color: GREEN, fontSize: 6.5 }}>{n(row?.goals)}⚽ · {Math.round(rowAccuracy(row) * 10) / 10}%</div></div></div>; })}</div>
      </Section>
    </>}
  </div>;
}
