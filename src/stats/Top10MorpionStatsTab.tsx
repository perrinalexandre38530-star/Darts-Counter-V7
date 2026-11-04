import React from "react";

type Props = { records: any[]; playerId: string; mode: "top_10" | "tic_tac_toe" };
export default function Top10MorpionStatsTab({ records, playerId, mode }: Props) {
  const source = (records || []).filter((r) => String(r?.mode || r?.kind || r?.payload?.mode || "").toLowerCase() === mode);
  const finished = source.filter((r) => r?.status === "finished" || r?.summary?.finished);
  const relevant = finished.filter((r) => (r.players || []).some((p: any) => String(p.id || p.profileId) === String(playerId)));
  const wins = relevant.filter((r) => String(r.winnerId || r.summary?.winnerId) === String(playerId)).length;
  let darts = 0, visits = 0, best = 0, points = 0, marks = 0, cases = 0, victoriesInRounds = 0;
  const perGame: { date: number; score: number; best: number }[] = [];
  for (const r of relevant) {
    const player = (r.players || []).find((p: any) => String(p.id || p.profileId) === String(playerId));
    const events = r?.payload?.visits || r?.payload?.visitHistory || [];
    const own = events.filter((v: any) => String(v?.playerId) === String(playerId));
    for (const v of own) {
      visits++;
      const vdarts = v?.darts || [];
      darts += Array.isArray(vdarts) ? vdarts.length : 0;
      const total = Number(v?.score ?? (Array.isArray(vdarts) ? vdarts.reduce((a: number, d: any) => a + Number(d?.score || d?.points || 0), 0) : 0));
      if (mode === "top_10") { best = Math.max(best, total); points += total; }
    }
    const finalScore = Number(player?.score || 0);
    if (mode === "top_10") {
      points += !own.length ? finalScore : 0;
      best = Math.max(best, Number(r?.summary?.perPlayer?.[playerId]?.bestVisit || 0));
    } else {
      victoriesInRounds += finalScore;
      const grid = r?.payload?.grid;
      const playerIndex = (r.players || []).findIndex((p: any) => String(p.id) === String(playerId));
      if (Array.isArray(grid?.owners) && playerIndex >= 0) cases += grid.owners.filter((o: any) => o === playerIndex).length;
      if (Array.isArray(grid?.marks) && playerIndex >= 0) marks += grid.marks.reduce((a: number, row: number[]) => a + Number(row[playerIndex] || 0), 0);
    }
    perGame.push({ date: Number(r.finishedAt || r.updatedAt || 0), score: finalScore, best: Number(r?.summary?.perPlayer?.[playerId]?.bestVisit || 0) });
  }
  const cards: [string, string | number][] = [
    ["Parties terminées", relevant.length], ["Victoires", wins],
    ["Taux de victoire", relevant.length ? `${Math.round(wins / relevant.length * 100)}%` : "—"],
    ["Volées enregistrées", visits],
    ...(mode === "top_10" ? [["Total de points", points], ["Meilleure volée", best], ["Moyenne par volée", visits ? (points / visits).toFixed(1) : "—"], ["Fléchettes", darts]] as [string, string | number][] : [["Manches gagnées", victoriesInRounds], ["Cases gagnées (dernières grilles)", cases], ["Touches conservées", marks], ["Fléchettes", darts]] as [string, string | number][]),
  ];
  return <div style={{ display: "grid", gap: 12 }}>
    <h3 style={{ margin: 0, fontSize: 17 }}>{mode === "top_10" ? "TOP 10 · PERFORMANCES" : "MORPION · PERFORMANCES"}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
      {cards.map(([label, number]) => <div key={label} style={{ border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", padding: 12, borderRadius: 12 }}><div style={{ fontSize: 11, opacity: .8 }}>{label}</div><strong style={{ fontSize: 23 }}>{number}</strong></div>)}
    </div>
    <div style={{ fontSize: 12, opacity: .7 }}>{relevant.length ? "Statistiques calculées depuis les parties terminées de l'historique." : "Aucune partie terminée pour ce joueur dans ce mode."}</div>
  </div>;
}
