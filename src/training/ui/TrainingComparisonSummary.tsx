import React from "react";
import ProfileAvatar from "../../components/ProfileAvatar";
import TrainingShell from "../shell/TrainingShell";
import TrainingHeader from "./TrainingHeader";
import { trainingConfigSummary, trainingModeLabel } from "../lib/trainingConfigSummary";
import type { TrainingGroupSession } from "../stats/trainingStatsHub";

function fmt(value: number, digits = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "0";
}

function performanceLabel(modeId: string, row: any) {
  const metrics = row?.metrics || {};
  if (modeId === "training_x01") return `${fmt(Number(metrics.avg3 ?? metrics.avg3D ?? row?.performance ?? 0), 1)} moy./3`;
  if (modeId === "training_clock" || modeId === "tour_horloge") {
    const completion = Number(metrics.completionPct ?? 0);
    return `${Math.round(completion)}% • ${Math.round(row?.darts || 0)} darts`;
  }
  if (modeId === "training_time_attack") return `${Math.round(row?.points || 0)} pts`;
  if (modeId === "training_ghost") return `${fmt(Number(metrics.avg3 ?? row?.performance ?? 0), 1)} moy./3`;
  if (typeof metrics.objectiveRatePct === "number") return `${Math.round(metrics.objectiveRatePct)}% objectifs`;
  if (typeof metrics.completionPct === "number") return `${Math.round(metrics.completionPct)}% parcours`;
  if (typeof metrics.bestStreak === "number") return `série ${Math.round(metrics.bestStreak)}`;
  return `${Math.round(Number(row?.performance || row?.points || 0))}`;
}

function teamPerformanceLabel(modeId: string, team: any) {
  if (modeId === "training_x01") return `${fmt(Number(team?.performance || 0), 1)} moy./3`;
  if (modeId === "training_clock" || modeId === "tour_horloge") return `${fmt(Number(team?.performance || 0), 1)} indice`;
  return fmt(Number(team?.performance || 0), 1);
}

export default function TrainingComparisonSummary({
  group,
  tickerId,
  onExit,
  onReplay,
}: {
  group: TrainingGroupSession;
  tickerId?: string;
  onExit: () => void;
  onReplay?: () => void;
}) {
  const accent = "#27dcff";
  const participants = Array.isArray(group?.participants) ? group.participants : [];
  const teamRows = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const row of participants) {
      if (!row?.teamId) continue;
      const key = String(row.teamId);
      const current = map.get(key) || {
        id: key,
        name: row.teamName || "Équipe",
        logo: row.teamLogo || null,
        players: 0,
        successes: 0,
        points: 0,
        darts: 0,
        accuracySum: 0,
        performanceSum: 0,
      };
      current.players += 1;
      current.successes += row.success ? 1 : 0;
      current.points += Number(row.points || 0);
      current.darts += Number(row.darts || 0);
      current.accuracySum += Number(row.accuracyPct || 0);
      current.performanceSum += Number(row.performance || 0);
      map.set(key, current);
    }
    return Array.from(map.values())
      .map((row: any) => ({
        ...row,
        accuracy: row.players ? row.accuracySum / row.players : 0,
        performance: row.players ? row.performanceSum / row.players : 0,
      }))
      .sort((a: any, b: any) => b.performance - a.performance || b.points - a.points);
  }, [participants]);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title={`${trainingModeLabel(group.modeId)} — Comparatif`}
          tickerId={tickerId || group.modeId}
          onBack={onExit}
          rules={
            <>
              <p>Tous les participants ont effectué la même configuration Training.</p>
              <p>Le classement individuel et, si nécessaire, le comparatif par équipes sont sauvegardés dans Statistiques Training.</p>
            </>
          }
        />
      }
      body={
        <div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
          <section style={{ borderRadius: 18, border: "1px solid rgba(39,220,255,.30)", background: "rgba(8,26,39,.88)", padding: 12 }}>
            <div style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Session Training terminée</div>
            <div style={{ marginTop: 5, fontSize: 15, fontWeight: 950 }}>{trainingModeLabel(group.modeId)}</div>
            <div style={{ marginTop: 4, fontSize: 11, color: "#aab1cc" }}>{trainingConfigSummary(group.modeId, group.config)}</div>
            <div style={{ marginTop: 4, fontSize: 10.5, color: "#7f87a5" }}>{participants.length} participant{participants.length > 1 ? "s" : ""} • {group.participantMode === "teams" ? "Training par équipes" : participants.length > 1 ? "Training multi-joueurs" : "Training solo"}</div>
          </section>

          <div style={{ margin: "14px 2px 8px", color: accent, fontSize: 11, fontWeight: 950, letterSpacing: 1 }}>CLASSEMENT INDIVIDUEL</div>
          <div style={{ display: "grid", gap: 7 }}>
            {participants.map((row: any, index: number) => (
              <div key={row.sessionId || `${row.participantId}-${index}`} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) auto", gap: 9, alignItems: "center", borderRadius: 15, border: index === 0 ? "1px solid rgba(39,220,255,.58)" : "1px solid rgba(255,255,255,.08)", background: index === 0 ? "rgba(39,220,255,.08)" : "rgba(8,12,20,.82)", padding: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", background: index === 0 ? accent : "rgba(255,255,255,.08)", color: index === 0 ? "#001018" : "#fff", fontWeight: 950 }}>{index + 1}</div>
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <ProfileAvatar name={row.participantName || "Joueur"} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.participantName || "Joueur"}</div>
                    <div style={{ marginTop: 2, fontSize: 9.5, color: "#8f97b3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.teamName ? `${row.teamName} • ` : ""}{Math.round(row.accuracyPct || 0)}% précision • {row.darts || 0} darts</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: row.success ? accent : "#ff769f", fontWeight: 950, fontSize: 12 }}>{performanceLabel(group.modeId, row)}</div>
                  <div style={{ marginTop: 2, fontSize: 9, opacity: .55 }}>{row.success ? "RÉUSSI" : "TERMINÉ"}</div>
                </div>
              </div>
            ))}
          </div>

          {teamRows.length ? (
            <>
              <div style={{ margin: "14px 2px 8px", color: accent, fontSize: 11, fontWeight: 950, letterSpacing: 1 }}>COMPARATIF ÉQUIPES</div>
              <div style={{ display: "grid", gap: 8 }}>
                {teamRows.map((team: any, index: number) => (
                  <div key={team.id} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", borderRadius: 16, border: index === 0 ? "1px solid rgba(39,220,255,.55)" : "1px solid rgba(255,255,255,.08)", background: "rgba(8,12,20,.86)", padding: 10 }}>
                    <ProfileAvatar name={team.name} dataUrl={team.logo || undefined} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 950 }}>{index + 1}. {team.name}</div>
                      <div style={{ marginTop: 2, fontSize: 9.5, color: "#8f97b3" }}>{team.players} joueurs • {Math.round(team.accuracy)}% précision moyenne • {team.successes}/{team.players} réussites</div>
                    </div>
                    <div style={{ textAlign: "right", color: accent, fontWeight: 950 }}>{teamPerformanceLabel(group.modeId, team)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: onReplay ? "1fr 1fr" : "1fr", gap: 9, marginTop: 16 }}>
            {onReplay ? <button type="button" onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: "1px solid rgba(39,220,255,.45)", background: "rgba(39,220,255,.08)", color: accent, fontWeight: 950, cursor: "pointer" }}>REJOUER MÊME CONFIG</button> : null}
            <button type="button" onClick={onExit} style={{ minHeight: 46, borderRadius: 999, border: "1px solid rgba(39,220,255,.70)", background: "linear-gradient(180deg,#39e4ff,#09afd9)", color: "#001018", fontWeight: 950, cursor: "pointer" }}>RETOUR AU TRAINING</button>
          </div>
        </div>
      }
    />
  );
}
